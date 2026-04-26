import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, AlertTriangle, Settings2 } from 'lucide-react';
import { AIConfig } from '../types';

const STORAGE_KEY = 'ai-config';

function loadFromStorage(): AIConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(config: AIConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

interface AISettingsModalProps {
  isOpen: boolean;
  initialConfig: AIConfig;
  onSave: (config: AIConfig) => void;
  onClose: () => void;
}

export default function AISettingsModal({
  isOpen,
  initialConfig,
  onSave,
  onClose
}: AISettingsModalProps) {
  const [config, setConfig] = useState<AIConfig>(() => {
    const stored = loadFromStorage();
    return stored ?? initialConfig;
  });

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setConfig(stored);
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveToStorage(config);
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white border-4 md:border-[6px] border-black w-full max-w-md md:max-w-lg p-4 md:p-6 lg:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 md:top-6 right-3 md:right-6 p-1.5 md:p-2 hover:bg-gray-100 transition-colors touch-manipulation"
        >
          <X className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        <div className="space-y-4 md:space-y-6 lg:space-y-8">
          <div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-1 md:mb-2">AI Scoring Engine</h3>
            <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Configure semantic verification provider</p>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="space-y-2 md:space-y-3">
              <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500">Service Provider</label>
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                {(['gemini', 'openrouter', 'nvidia'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setConfig(prev => ({ ...prev, provider: p }))}
                    className={`py-3 md:py-4 border-2 border-black font-black uppercase text-[9px] md:text-xs transition-all ${
                      config.provider === p ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500">API Authentication Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full bg-gray-50 border-2 border-black p-3 md:p-4 font-mono text-xs md:text-sm outline-none focus:bg-white transition-all"
                />
                <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 opacity-20">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-black" />
                </div>
              </div>
            </div>

            {(config.provider === 'openrouter' || config.provider === 'nvidia') && (
              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {config.provider === 'nvidia' ? 'NVIDIA Model ID' : 'OpenRouter Model ID'}
                </label>
                <input
                  type="text"
                  value={config.modelId}
                  onChange={(e) => setConfig(prev => ({ ...prev, modelId: e.target.value }))}
                  placeholder={config.provider === 'nvidia' ? 'e.g. nvidia/llama-3.1-nemotron-ultra-253b-v1' : 'e.g. openai/gpt-oss-120b:free'}
                  className="w-full bg-gray-50 border-2 border-black p-3 md:p-4 font-mono text-xs md:text-sm outline-none focus:bg-white transition-all"
                />
              </div>
            )}

            <div className="bg-gray-50 border-2 border-black/5 p-3 md:p-4 space-y-2 md:space-y-3">
              <div className="flex items-start gap-2 md:gap-4">
                <div className="mt-0.5 bg-black text-white p-0.5 md:p-1">
                  <AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                </div>
                <p className="text-[8px] md:text-[10px] font-bold uppercase leading-relaxed text-gray-600">
                  If no API key is provided, the system will fallback to <span className="text-black">Strict Mode</span> (exact character match) for scoring. Semantic synonym verification requires an active key.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-black text-white py-4 md:py-6 font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] text-xs md:text-sm min-h-[44px] touch-manipulation"
          >
            Save Configuration
          </button>
        </div>
      </motion.div>
    </div>
  );
}
