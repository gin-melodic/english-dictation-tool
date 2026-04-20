import { useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '../types';

/**
 * Custom hook for managing Web Speech API
 */
export function useSpeechSynthesis(settings: AppSettings) {
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = settings.voiceRate;

    synthRef.current.speak(utterance);
  }, [settings.voiceRate]);

  const cancel = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  return { speak, cancel };
}
