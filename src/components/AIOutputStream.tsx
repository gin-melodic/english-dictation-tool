import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Brain } from 'lucide-react';

interface AIOutputStreamProps {
  isOpen: boolean;
  outputs: string[];
  streamingText?: string;
  onClose: () => void;
}

export default function AIOutputStream({ isOpen, outputs, streamingText, onClose }: AIOutputStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs, streamingText]);

  const isProcessing = outputs.length > 0 && !outputs[outputs.length - 1]?.includes('Done');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white border-4 md:border-[6px] border-black w-full max-w-md md:max-w-lg p-4 md:p-6 lg:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 md:top-6 right-3 md:right-6 p-1.5 md:p-2 hover:bg-gray-100 transition-colors touch-manipulation z-10"
            >
              <X className="w-4 h-4 md:w-6 md:h-6" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-black text-white p-1.5 md:p-2">
                  <Brain className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tighter leading-none">
                  {isProcessing ? 'AI Processing' : 'Evaluation Complete'}
                </h3>
              </div>
              <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {isProcessing ? 'Semantic analysis in progress' : 'Results have been saved'}
              </p>
            </div>

            {isProcessing && (
              <div className="flex gap-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-black animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-black animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-black animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-gray-50 border-2 border-black/10 p-3 md:p-4 font-mono text-xs md:text-sm leading-relaxed"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {outputs.length === 0 ? (
                <div className="text-gray-400 text-center py-8 uppercase tracking-wider font-bold">
                  Initializing...
                </div>
              ) : (
                outputs.map((line, idx) => (
                  <div key={idx} className="mb-1.5">
                    {line}
                  </div>
                ))
              )}
              {/* Show streaming text content in real-time */}
              {streamingText && (
                <div className="mt-2 pt-2 border-t border-black/5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Raw Stream
                  </div>
                  <pre className="text-[10px] md:text-xs text-gray-600 whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto">
                    {streamingText}
                    <span className="inline-block w-[2px] h-[1em] bg-black animate-pulse ml-[1px] align-middle" />
                  </pre>
                </div>
              )}
              {isProcessing && !streamingText && (
                <div className="text-black/50 mt-2">
                  ▌
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
