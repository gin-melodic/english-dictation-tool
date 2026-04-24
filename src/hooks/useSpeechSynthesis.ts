import { useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '../types';

// ---------------------------------------------------------------------------
// Voice selection helpers
// ---------------------------------------------------------------------------

// Cached best auto voice (shared across hook instances)
let cachedBestVoice: SpeechSynthesisVoice | null = null;

/** Clear the auto-voice cache (e.g. when system voices change). */
function clearVoiceCache() {
  cachedBestVoice = null;
}

/**
 * Score a voice candidate; higher = more preferred.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase().replace('_', '-');
  const name = voice.name.toLowerCase();

  if (!lang.startsWith('en')) return -1;
  let score = 0;

  const isNeural = name.includes('neural') || name.includes('premium') || name.includes('enhanced') || name.includes('online (natural)');

  if (name.includes('neural'))           score += 50;
  if (name.includes('premium'))          score += 40;
  if (name.includes('enhanced'))         score += 35;
  if (name.includes('online (natural)')) score += 30;
  else if (name.includes('natural'))     score += 15;

  if (lang === 'en-us')                  score += 20;
  else if (lang.startsWith('en'))        score += 10;

  if (!voice.localService) {
    score += isNeural ? 10 : 18;
  } else {
    score += 5;
  }

  if (name.includes('samantha'))         score += 18;
  if (name.includes('ava'))              score += 18;
  if (name.includes('alex'))             score += 12;
  if (name.includes('daniel'))           score += 16;
  if (name.includes('karen'))            score += 14;
  if (name.includes('microsoft aria'))   score += 22;
  if (name.includes('microsoft jenny'))  score += 22;
  if (name.includes('microsoft guy'))    score += 20;
  if (name.includes('google') && lang === 'en-us') score += 18;

  if (name.includes('compact'))          score -= 15;
  if (name.includes('espeak'))           score -= 30;
  if (name.includes('mbrola'))           score -= 30;

  return score;
}

/** Return highest-scoring English voice, or null if none qualify. */
function getBestVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (cachedBestVoice) return cachedBestVoice;

  const voices = synth.getVoices();
  if (!voices.length) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;

  // Original behavior: only consider en-US voices for auto selection
  for (const v of voices) {
    if (!v.lang.toLowerCase().startsWith('en-us')) {
      continue;
    }
    const s = scoreVoice(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  if (best && bestScore >= 0) {
    cachedBestVoice = best;
    return best;
  }
  return best;
}

/** Find a voice by exact name. */
function getVoiceByName(synth: SpeechSynthesis, name: string): SpeechSynthesisVoice | null {
  return synth.getVoices().find(v => v.name === name) || null;
}

/** Resolve the effective voice to use: selected overrides auto, with fallback. */
function getEffectiveVoice(synth: SpeechSynthesis, selectedVoice: string | null): SpeechSynthesisVoice | null {
  if (selectedVoice) {
    const found = getVoiceByName(synth, selectedVoice);
    if (found) return found;
    // Selected voice not available: fall back to auto best
    return getBestVoice(synth);
  }
  return getBestVoice(synth);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpeechSynthesis(settings: AppSettings) {
  const synthRef = useRef<SpeechSynthesis | null>(null);

  /**
   * Pending debounce timer
   */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Chrome keep-alive interval
   */
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Mount: initialise engine
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;
    synth.cancel();

    const prewarmVoices = () => {
      clearVoiceCache();
      getBestVoice(synth);
    };
    prewarmVoices();
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
      clearVoiceCache();
    };
  }, []);

  // -------------------------------------------------------------------------
  // speak()
  // -------------------------------------------------------------------------
  const speak = useCallback(
    (text: string) => {
      const synth = synthRef.current;
      if (!synth) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      synth.cancel();

      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        if (synth.speaking || synth.pending) {
          synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        const voice = getEffectiveVoice(synth, settings.selectedVoice);
        if (voice) utterance.voice = voice;

        utterance.pitch = 0.95;
        utterance.rate = Math.min(1.2, Math.max(0.7, settings.voiceRate ?? 1.0));
        utterance.volume = 1.0;

        let startedAt = 0;
        utterance.onstart = () => { startedAt = Date.now(); };

        utterance.onend = () => {
          const elapsed = Date.now() - startedAt;
          if (startedAt > 0 && elapsed < 80) {
            console.warn('[useSpeechSynthesis] Silent utterance detected — retrying with fallback voice.');
            clearVoiceCache(); // force new auto-selection
            const retry = new SpeechSynthesisUtterance(text);
            retry.lang   = 'en-US';
            retry.rate   = utterance.rate;
            retry.volume = 1.0;
            const fallbackVoice = getBestVoice(synth);
            if (fallbackVoice) retry.voice = fallbackVoice;
            synth.speak(retry);
          }
        };

        utterance.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          console.error('[useSpeechSynthesis] TTS error:', e.error);
          synth.cancel();
          clearVoiceCache();
        };

        synth.speak(utterance);
      }, 150);
    },
    [settings.voiceRate, settings.selectedVoice],
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