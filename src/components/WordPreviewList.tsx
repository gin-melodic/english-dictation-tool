import { useState, useCallback } from 'react';
import { Volume2, Square } from 'lucide-react';
import type { WordEntry } from '../types';

interface Props {
  words: WordEntry[];
  onSpeak: (text: string) => void;
  onCancel: () => void;
}

export default function WordPreviewList({ words, onSpeak, onCancel }: Props) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const handlePlay = useCallback((idx: number, text: string) => {
    if (playingIndex === idx) {
      onCancel();
      setPlayingIndex(null);
      return;
    }
    onCancel();
    setPlayingIndex(idx);
    onSpeak(text);
    // Reset after a generous timeout (actual end-of-speech isn't exposed here)
    setTimeout(() => setPlayingIndex(null), text.length * 120 + 1500);
  }, [playingIndex, onSpeak, onCancel]);

  if (words.length === 0) return null;

  return (
    <div className="mt-3 border-2 border-gray-200 bg-gray-50 max-h-[35vh] overflow-y-auto">
      <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-100 flex items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Preview</span>
        <span className="text-[9px] font-bold text-gray-400">{words.length} words</span>
      </div>
      <ul>
        {words.map((w, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 last:border-0 transition-colors ${
              playingIndex === i ? 'bg-black text-white' : 'hover:bg-white'
            }`}
          >
            <span className={`text-[9px] font-black w-6 text-right flex-shrink-0 ${playingIndex === i ? 'text-gray-300' : 'text-gray-400'}`}>
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-xs font-bold">{w.english}</span>
              {w.translation && (
                <span className={`ml-2 text-[10px] font-medium ${playingIndex === i ? 'text-gray-300' : 'text-gray-500'}`}>
                  — {w.translation}
                </span>
              )}
            </span>
            <button
              onClick={() => handlePlay(i, w.english)}
              className={`flex-shrink-0 p-1 transition-colors ${
                playingIndex === i
                  ? 'text-white'
                  : 'text-gray-400 hover:text-black'
              }`}
              title={playingIndex === i ? 'Stop' : 'Play'}
            >
              {playingIndex === i
                ? <Square className="w-3 h-3 fill-current" />
                : <Volume2 className="w-3 h-3" />
              }
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
