import { motion } from 'motion/react';
import { Sparkles, CheckCircle2, XCircle, Volume2, Undo2 } from 'lucide-react';
import { WordEntry, SessionSource, AIVerdict } from '../types';

interface ResultsAuditProps {
  words: WordEntry[];
  userAnswers: Record<number, { english: string; translation: string }>;
  skippedIndices: Set<number>;
  aiVerdicts: Record<number, AIVerdict>;
  isEvaluating: boolean;
  sessionSource: SessionSource;
  onReset: () => void;
  onBackToIntegrity?: () => void;
}

export default function ResultsAudit({
  words,
  userAnswers,
  skippedIndices,
  aiVerdicts,
  isEvaluating,
  sessionSource,
  onReset,
  onBackToIntegrity
}: ResultsAuditProps) {
  const isContinuous = sessionSource === 'continuous';

  if (isEvaluating) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Sparkles className="w-16 h-16 text-black" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter">AI Semantic Scoring</h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Verifying translations for accuracy and synonyms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white p-8 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex items-end justify-between border-b-8 border-black pb-4">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.4em]">
              {isContinuous ? 'Audit Overview' : 'Review Phase'}
            </span>
            <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">
               {isContinuous ? 'Checklist' : 'Session Audit'}
            </h2>
          </div>
          <div className="flex gap-4">
            {!isContinuous && onBackToIntegrity && (
              <button
                onClick={onBackToIntegrity}
                className="border-4 border-black px-6 py-4 font-black uppercase tracking-widest hover:bg-black/5 flex items-center gap-2"
                title="Return to data integrity check"
              >
                <Undo2 className="w-4 h-4" /> Back to Audit
              </button>
            )}
            <button
              onClick={onReset}
              className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
            >
              Reset System
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {words.map((word, index) => {
            const answer = userAnswers[index];
            const isSkipped = skippedIndices.has(index);
            
            const isEnglishCorrect = answer?.english.trim().toLowerCase() === word.english.trim().toLowerCase();
            
            // Semantic scoring logic
            const aiVerdict = aiVerdicts[index];
            const isTranslationCorrect = aiVerdict 
              ? aiVerdict.isCorrect 
              : answer?.translation.trim().toLowerCase() === word.translation.trim().toLowerCase();

            const isCorrect = !isSkipped && isEnglishCorrect && isTranslationCorrect;
          
          return (
            <div 
              key={index} 
              className={`flex items-center justify-between p-8 border-4 border-black transition-all ${
                isContinuous 
                  ? 'bg-gray-50' 
                  : isCorrect ? 'bg-green-50' : isSkipped ? 'bg-gray-50' : 'bg-red-50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                   <span className="text-[10px] font-black uppercase opacity-20">Entry {index + 1}</span>
                   {!isContinuous && (
                     <>
                       {isCorrect ? (
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-green-600 bg-green-100 px-2 py-0.5 border border-green-600">Verified</span>
                            {aiVerdict && <Sparkles className="w-3 h-3 text-green-600" />}
                         </div>
                       ) : isSkipped ? (
                         <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 border border-gray-400">Skipped</span>
                       ) : (
                         <span className="text-[10px] font-black uppercase text-red-600 bg-red-100 px-2 py-0.5 border border-red-600">Failed</span>
                       )}
                     </>
                   )}
                </div>
                <div className={`grid ${isContinuous ? 'grid-cols-1' : 'grid-cols-2'} gap-8`}>
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Standard</span>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-black lowercase tracking-tight">{word.english.toLowerCase()}</div>
                      <button 
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                            const utterance = new SpeechSynthesisUtterance(word.english);
                            utterance.lang = 'en-US';
                            window.speechSynthesis.speak(utterance);
                          }
                        }} 
                        className="p-1 hover:bg-black/5 rounded transition-colors"
                        title="Play audio"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-gray-400 lowercase mt-1">{word.translation.toLowerCase()}</div>
                  </div>
                  {!isContinuous && (
                    <div>
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Observed</span>
                      <div className={`text-2xl font-black lowercase tracking-tight ${isEnglishCorrect ? 'text-black' : 'text-red-500 line-through'}`}>
                        {answer?.english.toLowerCase() || '—'}
                      </div>
                      <div className={`text-xs font-bold lowercase mt-1 ${isTranslationCorrect ? 'text-gray-400' : 'text-red-400 line-through'}`}>
                        {answer?.translation.toLowerCase() || '—'}
                      </div>
                      {aiVerdict?.reason && (
                        <div className="mt-2 text-[10px] italic font-bold text-gray-400 flex items-center gap-1">
                          <Sparkles className="w-2 h-2" />
                          {aiVerdict.reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-8">
                 {isContinuous ? (
                   <div className="w-12 h-12 flex items-center justify-center border-2 border-black/10 rounded-full">
                     <span className="text-xs font-black opacity-20"># {index + 1}</span>
                   </div>
                 ) : isCorrect ? (
                   <CheckCircle2 className="w-12 h-12 text-green-600" />
                 ) : (
                   <XCircle className="w-12 h-12 text-red-600" />
                 )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
