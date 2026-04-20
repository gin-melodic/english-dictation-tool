import { Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { WordEntry, AppSettings } from '../types';

interface ContinuousModeProps {
  currentIndex: number;
  continuousRepeat: number;
  words: WordEntry[];
  settings: AppSettings;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onAbort: () => void;
  onFinish: () => void;
}

export default function ContinuousMode({
  currentIndex,
  continuousRepeat,
  words,
  settings,
  isPlaying,
  onTogglePlay,
  onAbort,
  onFinish
}: ContinuousModeProps) {
  const currentWord = words[currentIndex];
  const isLastWord = currentIndex === words.length - 1;

  return (
    <div className="h-full bg-black text-white p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-12 text-center">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500">Continuous Mode Active</span>
          <h2 className="text-8xl font-black uppercase tracking-tighter mt-4">
            {currentIndex + 1} <span className="text-3xl text-gray-700">/ {words.length}</span>
          </h2>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">
            Repeat {continuousRepeat + 1} of {settings.maxPlays}
          </div>
        </div>

        <div className="flex justify-center">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-48 h-48 rounded-full border-8 border-white/10 flex items-center justify-center"
          >
            <Volume2 className="w-24 h-24" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <p className="text-xl font-black uppercase tracking-widest text-white">Writing in Progress...</p>
          <p className="text-sm font-bold text-gray-500 uppercase">Listen carefully and dictate on paper.</p>
        </div>

        <div className="flex gap-4 justify-center">
           <button 
            onClick={onTogglePlay}
            className="px-8 py-3 bg-white text-black font-black uppercase text-xs"
           >
            {isPlaying ? 'Pause System' : 'Resume System'}
           </button>
           <button 
            onClick={onAbort}
            className="px-8 py-3 border-2 border-white/20 font-black uppercase text-xs hover:bg-white/10"
           >
            Abort Mode
           </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 w-full h-2 bg-gray-900 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          className="h-full bg-white"
        />
      </div>

      {!isPlaying && isLastWord && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-12"
        >
          <button 
            onClick={onFinish}
            className="px-12 py-6 bg-white text-black font-black uppercase tracking-[0.3em] shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)]"
          >
            Finish & Check List
          </button>
        </motion.div>
      )}
    </div>
  );
}
