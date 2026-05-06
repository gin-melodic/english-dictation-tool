import { useRef, useCallback, useState, useEffect } from 'react';

const MAX_CACHE_SIZE = 200;
const audioCache = new Map<string, Blob>();

function getCacheKey(text: string, voice: string): string {
  return `${text}::${voice}`;
}

function getCached(key: string): Blob | undefined {
  if (!audioCache.has(key)) return undefined;
  const blob = audioCache.get(key)!;
  audioCache.delete(key);
  audioCache.set(key, blob);
  return blob;
}

function setCached(key: string, blob: Blob): void {
  if (audioCache.has(key)) audioCache.delete(key);
  audioCache.set(key, blob);
  if (audioCache.size > MAX_CACHE_SIZE) {
    const oldest = audioCache.keys().next().value!;
    audioCache.delete(oldest);
  }
}

export interface KokoroTTSState {
  isLoading: boolean;
  isReady: boolean;
  isGenerating: boolean;
  error: string | null;
  downloadProgress: number | null;
}

// Module-level worker singleton – survives component remounts
let _worker: Worker | null = null;
let _workerReady = false;
let _workerLoading = false;
let _loadResolvers: Array<(ok: boolean) => void> = [];

function getOrCreateWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('../workers/kokoroWorker.ts', import.meta.url), { type: 'module' });
  }
  return _worker;
}

export function useKokoroTTS(voice: string, rate: number = 1.0) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (blob: Blob) => void; reject: (err: Error) => void }>>(new Map());
  const genIdRef = useRef(0);
  const currentSpeakIdRef = useRef<string | null>(null);

  const [state, setState] = useState<KokoroTTSState>({
    isLoading: _workerLoading,
    isReady: _workerReady,
    isGenerating: false,
    error: null,
    downloadProgress: null,
  });

  useEffect(() => {
    const worker = getOrCreateWorker();

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data;
      switch (msg.type) {
        case 'loadProgress':
          setState(prev => ({ ...prev, downloadProgress: msg.progress }));
          break;

        case 'loadDone':
          _workerReady = true;
          _workerLoading = false;
          setState(prev => ({ ...prev, isLoading: false, isReady: true, downloadProgress: null }));
          _loadResolvers.splice(0).forEach(r => r(true));
          break;

        case 'loadError':
          _workerLoading = false;
          setState(prev => ({ ...prev, isLoading: false, error: msg.error }));
          _loadResolvers.splice(0).forEach(r => r(false));
          break;

        case 'generateDone': {
          const pending = pendingRef.current.get(msg.id);
          if (pending) {
            pendingRef.current.delete(msg.id);
            pending.resolve(new Blob([msg.arrayBuffer], { type: msg.mimeType }));
          }
          if (pendingRef.current.size === 0) {
            setState(prev => ({ ...prev, isGenerating: false }));
          }
          break;
        }

        case 'generateError': {
          const pending = pendingRef.current.get(msg.id);
          if (pending) {
            pendingRef.current.delete(msg.id);
            pending.reject(new Error(msg.error));
          }
          if (pendingRef.current.size === 0) {
            setState(prev => ({ ...prev, isGenerating: false }));
          }
          break;
        }
      }
    };

    worker.addEventListener('message', handleMessage);
    return () => worker.removeEventListener('message', handleMessage);
  }, []);

  const ensureLoaded = useCallback((): Promise<boolean> => {
    if (_workerReady) return Promise.resolve(true);
    if (!_workerLoading) {
      _workerLoading = true;
      setState(prev => ({ ...prev, isLoading: true, error: null, downloadProgress: 0 }));
      getOrCreateWorker().postMessage({ type: 'load' });
    }
    return new Promise<boolean>(resolve => _loadResolvers.push(resolve));
  }, []);

  const speak = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      const oldSrc = audioRef.current.src;
      audioRef.current = null;
      URL.revokeObjectURL(oldSrc);
    }

    const speakId = String(++genIdRef.current);
    currentSpeakIdRef.current = speakId;

    const cacheKey = getCacheKey(text, voice);
    let blob = getCached(cacheKey);

    if (!blob) {
      const ok = await ensureLoaded();
      if (!ok) return;
      if (currentSpeakIdRef.current !== speakId) return;

      setState(prev => ({ ...prev, isGenerating: true }));

      try {
        blob = await new Promise<Blob>((resolve, reject) => {
          pendingRef.current.set(speakId, { resolve, reject });
          getOrCreateWorker().postMessage({ type: 'generate', payload: { text, voice, id: speakId } });
        });
        setCached(cacheKey, blob);
      } catch (err) {
        console.error('[useKokoroTTS] generate error:', err);
        setState(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      if (currentSpeakIdRef.current !== speakId) return;
    }

    try {
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
      console.error('[useKokoroTTS] play error:', err);
    }
  }, [voice, rate, ensureLoaded]);

  const downloadModel = useCallback(async () => {
    _workerReady = false;
    _workerLoading = false;
    _loadResolvers = [];
    if (_worker) {
      _worker.terminate();
      _worker = null;
    }
    audioCache.clear();
    pendingRef.current.clear();
    setState({ isLoading: false, isReady: false, isGenerating: false, error: null, downloadProgress: null });
    await ensureLoaded();
  }, [ensureLoaded]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      const oldSrc = audioRef.current.src;
      audioRef.current = null;
      URL.revokeObjectURL(oldSrc);
    }
    currentSpeakIdRef.current = String(++genIdRef.current);
  }, []);

  return { speak, cancel, downloadModel, ...state };
}
