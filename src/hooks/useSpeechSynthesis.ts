import { useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '../types';

// ---------------------------------------------------------------------------
// Voice selection helpers
// ---------------------------------------------------------------------------

/**
 * Score a voice candidate for single-word English dictation quality.
 * Higher score = more preferred.
 *
 * Factors (descending priority):
 *  1. Neural/enhanced voices produce the cleanest articulation per word.
 *  2. en-US locale is required; other English variants are acceptable fallback.
 *  3. Local (on-device) voices have lower latency and fewer network artefacts.
 *  4. Specific high-quality voice names known to produce clear output.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  let score = 0;
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  // Exclude all non-English voices
  if (!lang.startsWith('en')) return -1;

  // Prefer en-US; other English variants are acceptable fallback
  if (lang === 'en-us') score += 20;
  else if (lang.startsWith('en')) score += 10;

  // On-device voices are more stable and lower-latency than network voices
  if (voice.localService) score += 15;

  // Neural / premium / enhanced voices articulate individual words cleanly
  if (name.includes('neural'))   score += 30;
  if (name.includes('premium'))  score += 25;
  if (name.includes('enhanced')) score += 20;
  if (name.includes('natural'))  score += 15;

  // Known high-quality voices per platform
  // macOS / iOS
  if (name.includes('samantha')) score += 18;
  if (name.includes('ava'))      score += 18;
  if (name.includes('alex'))     score += 16;
  // Windows (Neural voices)
  if (name.includes('aria'))     score += 22;
  if (name.includes('jenny'))    score += 22;
  if (name.includes('guy'))      score += 20;
  // Android / Chrome
  if (name.includes('google') && lang === 'en-us') score += 18;

  // Penalise voices known to mangle short words
  if (name.includes('compact')) score -= 10;
  if (name.includes('espeak'))  score -= 20;
  if (name.includes('mbrola'))  score -= 20;

  return score;
}

/**
 * Module-level cache so voice selection is computed once per browser session
 * rather than on every speak() call.
 */
let cachedVoice: SpeechSynthesisVoice | null = null;

/** Return the highest-scoring available voice, or null if none qualify. */
function getBestVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;

  const voices = synth.getVoices();
  if (!voices.length) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;

  for (const v of voices) {
    const s = scoreVoice(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  if (best && bestScore >= 0) cachedVoice = best;
  return best;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpeechSynthesis(settings: AppSettings) {
  const synthRef = useRef<SpeechSynthesis | null>(null);

  /**
   * Pending debounce timer — collapses rapid successive speak() calls
   * (e.g. React StrictMode double-invoke, fast button taps) into a single
   * utterance, preventing syllable-chopping from queued overlapping speech.
   */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Chrome keep-alive interval.
   * Chrome silently stops audio for utterances longer than ~15 s while
   * keeping speechSynthesis.speaking === true. Calling pause()/resume()
   * every 10 s resets that internal counter. For single-word dictation this
   * rarely fires, but we keep it in case the caller ever passes a phrase.
   */
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Mount: initialise engine and pre-warm the voice cache
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // Flush stale utterances left over from HMR / previous render cycles
    synth.cancel();

    /**
     * Voices load asynchronously on Chrome desktop and some Android WebViews.
     * Pre-warm the cache as soon as they become available so the first
     * speak() call does not stall waiting for getVoices() to populate.
     */
    const prewarmVoices = () => getBestVoice(synth);
    prewarmVoices(); // synchronous attempt (works on Safari / Firefox)
    synth.addEventListener('voiceschanged', prewarmVoices);

    keepAliveRef.current = setInterval(() => {
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    }, 10_000);

    return () => {
      synth.removeEventListener('voiceschanged', prewarmVoices);
      synth.cancel();
      if (timerRef.current)    clearTimeout(timerRef.current);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      // Invalidate the module-level cache on unmount so a fresh voice list is
      // re-evaluated if the hook remounts (Strict Mode, route changes, etc.)
      cachedVoice = null;
    };
  }, []);

  // -------------------------------------------------------------------------
  // speak()
  // -------------------------------------------------------------------------
  const speak = useCallback(
    (text: string) => {
      const synth = synthRef.current;
      if (!synth) return;

      // Cancel any pending debounce timer before scheduling a new one
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Trigger cancel() before the setTimeout so it has a full event-loop
      // tick to flush the queue — cancel() is asynchronous under the hood.
      synth.cancel();

      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        // Second safety cancel in case the engine is still draining (rare,
        // but possible under heavy system load or on slower Android devices)
        if (synth.speaking || synth.pending) {
          synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // --- Locale & voice -------------------------------------------------
        utterance.lang = 'en-US';

        const voice = getBestVoice(synth);
        if (voice) utterance.voice = voice;

        // --- Prosody tuning for single words --------------------------------
        // Some TTS engines pitch-shift short words upward, making them sound
        // clipped. A slight downward pitch correction normalises this.
        utterance.pitch = 0.95;

        // Rate: clamp to [0.7, 1.2] — outside this range artefacts increase.
        utterance.rate = Math.min(1.2, Math.max(0.7, settings.voiceRate ?? 1.0));

        // Maximum volume prevents words sounding "swallowed" on mobile.
        utterance.volume = 1.0;

        // --- onstart: detect and handle voice-not-ready race on Android -----
        // Record when the engine actually begins playing audio. Used by onend.
        let startedAt = 0;
        utterance.onstart = () => { startedAt = Date.now(); };

        // --- onend: detect silent-hang (Android WebView bug) ----------------
        // On some Android WebViews the utterance fires onend immediately
        // without producing audio. We detect this via elapsed-time heuristic.
        utterance.onend = () => {
          const elapsed = Date.now() - startedAt;
          // A real single-word utterance takes at least ~200 ms. If it
          // "finishes" in under 80 ms it almost certainly played silently.
          if (startedAt > 0 && elapsed < 80) {
            console.warn('[useSpeechSynthesis] Silent utterance detected — retrying with fallback voice.');
            cachedVoice = null; // invalidate so a different voice is selected
            const retry = new SpeechSynthesisUtterance(text);
            retry.lang   = 'en-US';
            retry.rate   = utterance.rate;
            retry.volume = 1.0;
            const fallbackVoice = getBestVoice(synth);
            if (fallbackVoice) retry.voice = fallbackVoice;
            synth.speak(retry);
          }
        };

        // --- Error handler --------------------------------------------------
        utterance.onerror = (e) => {
          // 'canceled' and 'interrupted' are expected when cancel() is called
          // programmatically — they are not real errors, safe to ignore.
          if (e.error === 'canceled' || e.error === 'interrupted') return;

          console.error('[useSpeechSynthesis] TTS error:', e.error);
          synth.cancel(); // reset engine state
          cachedVoice = null; // invalidate in case the error is voice-specific
        };

        synth.speak(utterance);
      }, 150); // 150 ms: enough time for cancel() to flush, short enough to feel instant
    },
    [settings.voiceRate],
  );

  // -------------------------------------------------------------------------
  // cancel()
  // -------------------------------------------------------------------------
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    synthRef.current?.cancel();
  }, []);

  return { speak, cancel };
}
