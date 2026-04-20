import { useRef, useEffect } from 'react';
import { Volume2, Wrench } from 'lucide-react';
import { WordEntry, AppSettings } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface DictationCardProps {
  currentIndex: number;
  words: WordEntry[];
  settings: AppSettings;
  userAnswers: Record<number, { english: string; translation: string }>;
  playCounts: Record<number, number>;
  onPlay: () => void;
  onEnglishChange: (value: string) => void;
  onTranslationChange: (value: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onDebugAutofill?: () => void;
}

export default function DictationCard({
  currentIndex,
  words,
  settings,
  userAnswers,
  playCounts,
  onPlay,
  onEnglishChange,
  onTranslationChange,
  onSkip,
  onNext,
  onDebugAutofill
}: DictationCardProps) {
  const englishInputRef = useRef<HTMLInputElement>(null);
  const { speak } = useSpeechSynthesis(settings);

  const currentWord = words[currentIndex];
  const currentPlayCount = playCounts[currentIndex] || 0;
  const isPlayDisabled = currentPlayCount >= settings.maxPlays;

  // Auto-focus input
  useEffect(() => {
    if (englishInputRef.current) {
      englishInputRef.current.focus();
    }
  }, [currentIndex]);

  const handlePlayClick = () => {
    speak(currentWord.english);
    onPlay();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white border-[6px] border-black p-8 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">
      {/* Debug Session Monitor (commented out by default) */}
      {/* 
      <div className="absolute -top-10 left-0 bg-black text-white px-3 py-1 text-[9px] font-mono uppercase tracking-widest flex gap-4 items-center">
        <span>Slot: {currentIndex}</span>
        <span>Word_ID: {currentWord.english.slice(0,3)}...</span>
        <span className="text-gray-500">Live Sync Active</span>
        {onDebugAutofill && (
          <button 
            onClick={onDebugAutofill}
            className="ml-4 bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
            title="DEBUG: Fill current word inputs"
          >
            <Wrench className="w-2 h-2" /> Fill Current
          </button>
        )}
      </div>
      */}

      <div className="flex justify-between items-start mb-12">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Session Progress</span>
          <div className="text-6xl font-black tabular-nums tracking-tighter">
            {currentIndex + 1}<span className="text-2xl text-gray-300">/{words.length}</span>
          </div>
        </div>
        <div className="px-4 py-2 border-2 border-black font-black text-xs uppercase bg-white">
          Listen & Transcribe
        </div>
      </div>

      <div className="flex flex-col items-center mb-16 space-y-8">
        <button
          onClick={handlePlayClick}
          disabled={isPlayDisabled}
          className={`w-32 h-32 rounded-full border-4 border-black flex items-center justify-center transition-all group ${
            isPlayDisabled 
              ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed' 
              : 'bg-white hover:bg-black text-black hover:text-white cursor-pointer active:scale-95'
          }`}
        >
          <Volume2 className="w-12 h-12" />
        </button>
        <div className="text-center space-y-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isPlayDisabled ? 'text-red-400' : 'text-gray-400'}`}>
            {isPlayDisabled ? "Quota Finished" : "Click to Play Audio"}
          </p>
          <p className="text-sm italic font-black text-gray-600 uppercase">
            (Loop {currentPlayCount} <span className="opacity-30">of</span> {settings.maxPlays})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">English String</label>
          <input
            type="text"
            autoComplete="off"
            ref={englishInputRef}
            onKeyDown={handleKeyDown}
            value={userAnswers[currentIndex]?.english || ''}
            onChange={(e) => onEnglishChange(e.target.value)}
            placeholder="Input..."
            className="w-full bg-gray-50 border-2 border-black rounded-none p-6 text-2xl font-black focus:bg-white outline-none transition-all placeholder:text-gray-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Translation Data</label>
          <input
            type="text"
            autoComplete="off"
            onKeyDown={handleKeyDown}
            value={userAnswers[currentIndex]?.translation || ''}
            onChange={(e) => onTranslationChange(e.target.value)}
            placeholder="Input..."
            className="w-full bg-gray-50 border-2 border-black rounded-none p-6 text-2xl font-black focus:bg-white outline-none transition-all placeholder:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 h-16 w-full">
        <button 
          onClick={onSkip}
          className="border-4 border-black flex items-center justify-center font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
        >
          Skip Entry
        </button>
        <button 
          onClick={onNext}
          className="bg-black text-white flex items-center justify-center font-black uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"
        >
          {currentIndex === words.length - 1 ? 'End Session' : 'Next Entry'}
        </button>
      </div>

      <div className="mt-16 flex space-x-12 opacity-30">
        <div className="flex flex-col items-center">
          <span className="text-xs font-black">ESC</span>
          <span className="text-[9px] uppercase font-bold tracking-widest">Exit</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-black">ENTER</span>
          <span className="text-[9px] uppercase font-bold tracking-widest">Confirm</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-black">SPACE</span>
          <span className="text-[9px] uppercase font-bold tracking-widest">Repeat</span>
        </div>
      </div>
    </div>
  );
}
