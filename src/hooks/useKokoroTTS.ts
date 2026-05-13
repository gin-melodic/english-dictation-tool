import { useRef, useCallback, useState, useEffect } from 'react';
import { ttsCacheGet, ttsCachePut } from '../utils/idb';

const MAX_CACHE_SIZE = 200;

export async function textToKey(text: string, voice: string): Promise<string> {
  const raw = `${text}::${voice}`;
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const audioCache = new Map<string, Blob>();

async function fetchFromRemote(text: string, voice: string): Promise<Blob | null> {
  try {
    const key = await textToKey(text, voice);
    return await ttsCacheGet(key);
  } catch { /* ignore */ }
  return null;
}

function uploadToRemote(text: string, voice: string, blob: Blob): void {
  textToKey(text, voice).then(key => {
    ttsCachePut(key, blob).catch(() => { /* ignore */ });
  }).catch(() => { /* ignore */ });
}

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

  const generateBlob = useCallback(async (text: string): Promise<Blob | null> => {
    const cacheKey = getCacheKey(text, voice);
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const remoteBlob = await fetchFromRemote(text, voice);
    if (remoteBlob) {
      setCached(cacheKey, remoteBlob);
      return remoteBlob;
    }

    const ok = await ensureLoaded();
    if (!ok) return null;

    const genId = String(++genIdRef.current);
    setState(prev => ({ ...prev, isGenerating: true }));
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        pendingRef.current.set(genId, { resolve, reject });
        getOrCreateWorker().postMessage({ type: 'generate', payload: { text, voice, id: genId } });
      });
      setCached(cacheKey, blob);
      uploadToRemote(text, voice, blob);
      return blob;
    } catch (err) {
      console.error('[useKokoroTTS] generateBlob error:', err);
      return null;
    } finally {
      if (pendingRef.current.size === 0) {
        setState(prev => ({ ...prev, isGenerating: false }));
      }
    }
  }, [voice, ensureLoaded]);

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
      const remoteBlob = await fetchFromRemote(text, voice);
      if (currentSpeakIdRef.current !== speakId) return;
      if (remoteBlob) {
        setCached(cacheKey, remoteBlob);
        blob = remoteBlob;
      }
    }

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
        uploadToRemote(text, voice, blob);
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

  return { speak, cancel, downloadModel, generateBlob, ...state };
}
