import { motion } from 'motion/react';
import { Undo2 } from 'lucide-react';
import { SessionManifestItem, WordEntry } from '../types';

interface DataIntegrityCheckProps {
  sessionManifest: SessionManifestItem[];
  words: WordEntry[];
  userAnswers: Record<number, { english: string; translation: string }>;
  onConfirm: () => void;
  onBack: () => void;
}

export default function DataIntegrityCheck({
  sessionManifest,
  words,
  userAnswers,
  onConfirm,
  onBack
}: DataIntegrityCheckProps) {
  return (
    <div className="h-full bg-white p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b-4 border-black pb-4">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Data Integrity Lock</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Verify sequence before final audit</p>
          </div>
          <button 
            onClick={onConfirm}
            className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
          >
            Confirm & Audit
          </button>
        </div>

        <div className="bg-gray-50 p-6 border-2 border-black/5">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-4">Internal Manifest vs Session Snapshot</p>
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-4 px-4 py-2 text-[9px] font-black uppercase text-gray-400 bg-gray-100">
              <span>Index</span>
              <span>Manifest Word</span>
              <span>Captured Word</span>
              <span>Your Answer</span>
            </div>
            {sessionManifest.map((item, idx) => {
              const snapWord = words[idx]?.english;
              const answer = userAnswers[idx]?.english || '-';
              const isMismatch = item.word !== snapWord;
              return (
                <div 
                  key={idx} 
                  className={`grid grid-cols-4 px-4 py-3 text-xs font-bold border ${isMismatch ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-black/5'}`}
                >
                  <span className="font-mono">#{idx}</span>
                  <span>{item.word}</span>
                  <span>{snapWord}</span>
                  <span className="text-gray-400 italic">{answer}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onBack}
            className="border-4 border-black px-6 py-4 font-black uppercase tracking-widest hover:bg-black/5 flex items-center gap-2"
            title="Return to data integrity check"
          >
            <Undo2 className="w-4 h-4" /> Back to Audit
          </button>
        </div>
      </div>
    </div>
  );
}
