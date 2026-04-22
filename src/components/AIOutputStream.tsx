import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AIOutputStreamProps {
  isOpen: boolean;
  outputs: string[];
  onClose: () => void;
}

export default function AIOutputStream({ isOpen, outputs, onClose }: AIOutputStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse delay-75" />
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse delay-150" />
                </div>
                <h3 className="text-white font-semibold">AI 评估中...</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 bg-slate-50 font-mono text-sm leading-relaxed"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {outputs.map((line, idx) => (
                <div key={idx} className="mb-2">
                  {line}
                </div>
              ))}
              {outputs.length === 0 && (
                <div className="text-slate-400 text-center py-8">
                  等待 AI 响应...
                </div>
              )}
              <div className="animate-pulse text-indigo-400 mt-4">
                ▌
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
