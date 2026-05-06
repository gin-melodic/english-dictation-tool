let tts: any = null;

(self as any).onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'load') {
    try {
      const { KokoroTTS } = await import('kokoro-js');
      const fileProgress: Record<string, number> = {};
      const progress_callback = (info: any) => {
        if (info.status === 'progress' && typeof info.progress === 'number') {
          fileProgress[info.file ?? 'default'] = info.progress;
          const vals = Object.values(fileProgress);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          (self as any).postMessage({ type: 'loadProgress', progress: Math.round(avg) });
        }
      };
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        progress_callback,
      });
      (self as any).postMessage({ type: 'loadDone' });
    } catch (err) {
      (self as any).postMessage({
        type: 'loadError',
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (type === 'generate') {
    const { text, voice, id } = payload;
    if (!tts) {
      (self as any).postMessage({ type: 'generateError', id, error: 'TTS model not loaded' });
      return;
    }
    try {
      const audio = await tts.generate(text, { voice });
      const blob = audio.toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      (self as any).postMessage(
        { type: 'generateDone', id, arrayBuffer, mimeType: blob.type },
        [arrayBuffer],
      );
    } catch (err) {
      (self as any).postMessage({
        type: 'generateError',
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
