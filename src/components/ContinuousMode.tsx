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
    <div className="h-full bg-black text-white p-6 md:p-8 lg:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl md:max-w-3xl space-y-6 md:space-y-8 lg:space-y-12 text-center">
        <div>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-gray-500">Continuous Mode Active</span>
          <h2 className="text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter mt-2 md:mt-4">
            {currentIndex + 1} <span className="text-lg md:text-3xl text-gray-700">/ {words.length}</span>
          </h2>
          <div className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 md:mt-2">
            Repeat {continuousRepeat + 1} of {settings.maxPlays}
          </div>
        </div>

        <div className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full border-4 md:border-8 border-white/10 flex items-center justify-center"
          >
            <Volume2 className="w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24" />
          </motion.div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <p className="text-base md:text-xl font-black uppercase tracking-widest text-white">Writing in Progress...</p>
          <p className="text-xs md:text-sm font-bold text-gray-500 uppercase">Listen carefully and dictate on paper.</p>
        </div>

        <div className="flex gap-3 md:gap-4 justify-center flex-col sm:flex-row">
           <button
             onClick={onTogglePlay}
             className="px-6 md:px-8 py-3 md:py-3 bg-white text-black font-black uppercase text-xs md:text-sm min-h-[44px] touch-manipulation"
            >
             {isPlaying ? 'Pause System' : 'Resume System'}
            </button>
            <button
             onClick={onAbort}
             className="px-6 md:px-8 py-3 md:py-3 border-2 border-white/20 font-black uppercase text-xs md:text-sm hover:bg-white/10 min-h-[44px] touch-manipulation"
            >
             Abort Mode
            </button>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 w-full h-1 md:h-2 bg-gray-900 overflow-hidden">
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
          className="fixed bottom-8 md:bottom-12"
        >
          <button
            onClick={onFinish}
            className="px-6 md:px-12 py-4 md:py-6 bg-white text-black font-black uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] md:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] text-sm md:text-base min-h-[44px] touch-manipulation"
          >
            Finish & Check List
          </button>
        </motion.div>
      )}
    </div>
  );
}
