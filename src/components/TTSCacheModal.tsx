import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, RotateCcw } from 'lucide-react';
import type { WordEntry } from '../types';
import { textToKey } from '../hooks/useKokoroTTS';
import { ttsCacheHas, ttsCachePut } from '../utils/idb';

interface Props {
  words: WordEntry[];
  voice: string;
  generateBlob: (text: string) => Promise<Blob | null>;
  kokoroReady: boolean;
  kokoroLoading: boolean;
  downloadProgress: number | null;
  onClose: () => void;
}

type ItemStatus = 'pending' | 'checking' | 'skipped' | 'generating' | 'done' | 'error';
type ItemError = string | null;

export default function TTSCacheModal({ words, voice, generateBlob, kokoroReady, kokoroLoading, downloadProgress, onClose }: Props) {
  const [statuses, setStatuses] = useState<ItemStatus[]>(() => words.map(() => 'pending'));
  const [errors, setErrors] = useState<ItemError[]>(() => words.map(() => null));
  const [current, setCurrent] = useState(-1);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState({ generated: 0, skipped: 0, errors: 0 });
  const abortRef = useRef(false);

  const updateStatus = useCallback((idx: number, status: ItemStatus, errMsg?: string) => {
    setStatuses(prev => { const n = [...prev]; n[idx] = status; return n; });
    if (errMsg !== undefined) setErrors(prev => { const n = [...prev]; n[idx] = errMsg; return n; });
  }, []);

  useEffect(() => {
    abortRef.current = false;
    let generated = 0, skipped = 0, errors = 0;

    (async () => {
      for (let i = 0; i < words.length; i++) {
        if (abortRef.current) break;
        setCurrent(i);

        const text = words[i].english;
        const key = await textToKey(text, voice);

        // Check local IndexedDB cache
        updateStatus(i, 'checking');
        try {
          if (await ttsCacheHas(key)) {
            updateStatus(i, 'skipped');
            skipped++;
            continue;
          }
        } catch { /* ignore, fall through to generate */ }

        if (abortRef.current) break;

        // Generate
        updateStatus(i, 'generating');
        try {
          const blob = await generateBlob(text);
          if (!blob) { updateStatus(i, 'error', 'TTS generation failed (model not ready?)'); errors++; continue; }

          try {
            await ttsCachePut(key, blob);
            updateStatus(i, 'done');
            generated++;
          } catch (e) {
            updateStatus(i, 'error', `Cache write error: ${e}`);
            errors++;
          }
        } catch (e) {
          updateStatus(i, 'error', String(e));
          errors++;
        }
      }

      setCurrent(-1);
      setDone(true);
      setSummary({ generated, skipped, errors });
    })();

    return () => { abortRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    abortRef.current = true;
  };

  const progress = statuses.filter(s => s !== 'pending').length;
  const pct = words.length ? Math.round((progress / words.length) * 100) : 0;

  const statusColor: Record<ItemStatus, string> = {
    pending: 'text-gray-300',
    checking: 'text-yellow-500',
    skipped: 'text-blue-400',
    generating: 'text-orange-500 animate-pulse',
    done: 'text-green-500',
    error: 'text-red-500',
  };

  const statusLabel: Record<ItemStatus, string> = {
    pending: '—',
    checking: '…',
    skipped: 'cached',
    generating: '⚡',
    done: '✓',
    error: '✗',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Pre-generate TTS Cache</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kokoro model loading banner */}
        {kokoroLoading && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-[10px] font-bold text-yellow-700">
              Loading Kokoro model… {downloadProgress !== null ? `${downloadProgress}%` : ''}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1.5">
            <span>{done ? 'Complete' : `Processing ${current >= 0 ? current + 1 : 0} / ${words.length}`}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 h-2">
            <div
              className="bg-black h-2 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {done && (
            <div className="mt-2 flex gap-3 text-[10px] font-bold">
              <span className="text-green-600">✓ {summary.generated} generated</span>
              <span className="text-blue-500">↩ {summary.skipped} cached</span>
              {summary.errors > 0 && <span className="text-red-500">✗ {summary.errors} errors</span>}
            </div>
          )}
        </div>

        {/* Word list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {words.map((w, i) => (
            <li key={i} className={`flex items-center gap-2 px-4 py-1.5 ${current === i ? 'bg-gray-50' : ''}`}>
              <span className="text-[9px] font-black text-gray-400 w-5 text-right">{i + 1}</span>
              <span className="flex-1 text-xs font-bold truncate">{w.english}</span>
              <span
                className={`text-[10px] font-bold flex-shrink-0 ${statusColor[statuses[i]]}`}
                title={errors[i] ?? undefined}
              >
                {statusLabel[statuses[i]]}
              </span>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="px-4 py-3 border-t-2 border-black flex gap-2">
          {!done ? (
            <button
              onClick={handleCancel}
              className="flex-1 border-2 border-black py-2 text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 bg-black text-white py-2 text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
