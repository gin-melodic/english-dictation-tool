import { useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '../types';

export function useSpeechSynthesis(settings: AppSettings) {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // Clear any leftover queue from previous HMR sessions on mount
    synth.cancel();

    // Keep-alive: Prevent Chrome's long text auto-mute bug
    keepAliveRef.current = setInterval(() => {
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    }, 10000);

    return () => {
      synth.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, []);

  const speak = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth) return;

    // Cancel the previous pending speak if it exists
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    synth.cancel();

    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      // Checking both speaking and pending to cover all bases
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = settings.voiceRate;

      // When the user cancels or interrupts, the onerror event is triggered with 'canceled' or 'interrupted' error.
      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.error('TTS error:', e.error);

        // Restarting the speech synthesis engine can sometimes resolve issues that cause it to get stuck.
        synth.cancel();
      };

      synth.speak(utterance);
    }, 150); // Give 150ms for any previous speech to be canceled before starting new one
  }, [settings.voiceRate]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    synthRef.current?.cancel();
  }, []);

  return { speak, cancel };
}