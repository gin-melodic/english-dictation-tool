import { useRef, useCallback, useState } from 'react';

export interface KokoroTTSState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

export function useKokoroTTS(voice: string, rate: number = 1.0) {
  const ttsRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadPromiseRef = useRef<Promise<any> | null>(null);
  const [state, setState] = useState<KokoroTTSState>({
    isLoading: false,
    isReady: false,
    error: null,
  });

  const ensureLoaded = useCallback(async (): Promise<any | null> => {
    if (ttsRef.current) return ttsRef.current;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    setState({ isLoading: true, isReady: false, error: null });

    loadPromiseRef.current = (async () => {
      try {
        const { KokoroTTS } = await import('kokoro-js');
        const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', { dtype: 'q8' });
        ttsRef.current = tts;
        setState({ isLoading: false, isReady: true, error: null });
        return tts;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('[useKokoroTTS] Load error:', error);
        setState({ isLoading: false, isReady: false, error });
        loadPromiseRef.current = null;
        return null;
      }
    })();

    return loadPromiseRef.current;
  }, []);

  const speak = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      const oldSrc = audioRef.current.src;
      audioRef.current = null;
      URL.revokeObjectURL(oldSrc);
    }

    const tts = await ensureLoaded();
    if (!tts) return;

    try {
      const audio = await tts.generate(text, { voice });
      const blob = audio.toBlob();
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      el.playbackRate = Math.min(3.0, Math.max(0.5, rate));
      audioRef.current = el;
      el.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === el) audioRef.current = null;
      };
      await el.play();
    } catch (err) {
      console.error('[useKokoroTTS] speak error:', err);
    }
  }, [voice, rate, ensureLoaded]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      const oldSrc = audioRef.current.src;
      audioRef.current = null;
      URL.revokeObjectURL(oldSrc);
    }
  }, []);

  return { speak, cancel, ...state };
}
