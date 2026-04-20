import { RotateCcw, Settings2, Wrench } from 'lucide-react';
import { Step, SessionSource } from '../types';

interface HeaderProps {
  step: Step;
  currentIndex: number;
  wordsCount: number;
  sessionSource: SessionSource;
  onReset: () => void;
  onAbort: () => void;
  onOpenAISettings: () => void;
}

export default function Header({
  step,
  currentIndex,
  wordsCount,
  sessionSource,
  onReset,
  onAbort,
  onOpenAISettings
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-8 flex justify-between items-end">
      <div className="flex flex-col">
        <h1 className="text-5xl font-black tracking-tighter leading-none uppercase">Dictate.io</h1>
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mt-2">Vocabulary Mastery System v2.4</p>
      </div>
      
      <div className="flex space-x-12">
        {step !== 1 && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-gray-400">Word Index</span>
            <span className="text-2xl font-black leading-none">{currentIndex + 1} <span className="text-sm text-gray-400 uppercase">/ {wordsCount}</span></span>
          </div>
        )}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-gray-400">Session Limit</span>
          <span className="text-2xl font-black leading-none">100 <span className="text-sm text-gray-400 uppercase">Words</span></span>
        </div>
        {step !== 1 && (
          <div className="flex gap-2">
            {step === 2 && (
              <button 
                onClick={onAbort}
                className="px-4 py-2 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-black/5 transition-colors"
                title="Abort session and return to list"
              >
                Abort
              </button>
            )}
            <button 
              onClick={onReset}
              className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              {step === 3 ? 'New Session' : 'Reset All'}
            </button>
          </div>
        )}
        {step === 1 && (
           <button 
              onClick={onOpenAISettings}
              className="px-4 py-2 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-black/5 transition-colors flex items-center gap-2"
            >
              <Settings2 className="w-3 h-3" /> AI Scoring Setup
           </button>
        )}
      </div>
    </header>
  );
}
