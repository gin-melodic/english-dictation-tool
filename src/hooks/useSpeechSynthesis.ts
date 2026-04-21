import { useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '../types';

export function useSpeechSynthesis(settings: AppSettings) {
  // Reference to the global SpeechSynthesis instance
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Tracks the pending setTimeout so we can cancel it if speak() is called
  // again before the previous one fires — prevents utterance queuing
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the keep-alive interval that works around Chrome's auto-mute bug
  // for long utterances (Chrome silently stops speaking after ~15 seconds)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // Clear any utterances left over from a previous HMR session.
    // Without this, stale utterances pile up in the queue on every hot reload.
    synth.cancel();

    // Chrome bug workaround: utterances longer than ~15 seconds stop producing
    // audio while speechSynthesis.speaking remains true. Calling pause/resume
    // every 10 seconds resets the internal timer and keeps audio flowing.
    keepAliveRef.current = setInterval(() => {
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    }, 10000);

    return () => {
      // On unmount, stop all audio and clean up both timers
      synth.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, []);

  const speak = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth) return;

    // If a speak() call is already waiting in the setTimeout queue,
    // cancel it first. This handles rapid consecutive calls (e.g. React
    // StrictMode double-invoke, re-renders) by debouncing to the latest call.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Always cancel any currently playing or pending utterances.
    // This must happen BEFORE the setTimeout — cancel() is async under the
    // hood and needs a full event loop tick to flush the queue.
    synth.cancel();

    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      // Safety check: if the engine is still not clear after 150ms (rare but
      // possible under heavy load), fire cancel once more and proceed anyway.
      // Do NOT return early here — skipping speak() would silently drop audio.
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = settings.voiceRate;

      utterance.onerror = (e) => {
        // 'canceled' and 'interrupted' are fired when cancel() is called
        // programmatically. They are expected and not real errors — ignore them.
        if (e.error === 'canceled' || e.error === 'interrupted') return;

        // For all other errors (e.g. 'audio-busy', 'synthesis-failed'),
        // log and reset the engine so the next speak() call starts clean.
        console.error('TTS error:', e.error);
        synth.cancel();
      };

      synth.speak(utterance);
    }, 150); // 150ms gives cancel() enough time to fully flush the queue
  }, [settings.voiceRate]);

  const cancel = useCallback(() => {
    // Clear the pending timer so a queued speak() does not fire after cancel
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    synthRef.current?.cancel();
  }, []);

  return { speak, cancel };
}
