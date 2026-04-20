import { Trash2, Play } from 'lucide-react';
import { AppSettings } from '../types';

interface WordInputPanelProps {
  rawInput: string;
  settings: AppSettings;
  onInputChange: (value: string) => void;
  onClearInput: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onStartInteractive: () => void;
  onStartContinuous: () => void;
}

export default function WordInputPanel({
  rawInput,
  settings,
  onInputChange,
  onClearInput,
  onSettingsChange,
  onStartInteractive,
  onStartContinuous
}: WordInputPanelProps) {
  const lineCount = rawInput.split('\n').filter(l => l.trim()).length;

  return (
    <section className="col-span-12 md:col-span-4 bg-white border-r border-gray-200 p-8 flex flex-col h-full overflow-y-auto">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-4">
          <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">01</span>
          <h2 className="text-sm font-black uppercase tracking-widest">Input Word List</h2>
        </div>
        
        <div className="relative mb-4">
          <textarea
            value={rawInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={"Example:\nApple - 苹果\nBanana - 香蕉\nCat - 猫"}
            className="w-full h-[50vh] bg-gray-50 border-2 border-gray-200 rounded-none p-4 font-mono text-sm focus:border-black focus:ring-0 outline-none resize-none transition-colors"
          />
          {rawInput && (
            <button 
              onClick={onClearInput}
              className="absolute top-2 right-2 p-1 bg-black text-white rounded-none hover:bg-gray-800"
              title="Clear all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        
        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
          <span>Count: {lineCount}/100</span>
          <span>Format: Word - Translation</span>
        </div>
      </div>

      <div className="mt-8 space-y-6 pt-8 border-t border-gray-100">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-tight">Playback Limit</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => onSettingsChange({ ...settings, maxPlays: val })}
                  className={`w-10 h-10 border-2 border-black flex items-center justify-center font-black transition-colors ${
                    settings.maxPlays === val ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black/5'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-tight">Speech Speed</label>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-gray-400">{settings.voiceRate.toFixed(1)}x</span>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.1"
                value={settings.voiceRate}
                onChange={(e) => onSettingsChange({ ...settings, voiceRate: parseFloat(e.target.value) })}
                className="w-24 accent-black"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onStartInteractive}
            disabled={!rawInput.trim()}
            className="w-full bg-black text-white py-6 font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-sm"
          >
            Interactive Mode
          </button>
          <button
            onClick={onStartContinuous}
            disabled={!rawInput.trim()}
            className="w-full border-4 border-black py-4 font-black uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Offline Continuous
          </button>
        </div>
      </div>
    </section>
  );
}
