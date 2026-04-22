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
    <section className="col-span-12 md:col-span-4 bg-white border-r border-gray-200 p-4 md:p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex-1 min-h-0">
        <div className="flex items-center space-x-2 mb-3 md:mb-4">
          <span className="bg-black text-white px-2 py-0.5 text-[10px] md:text-xs font-bold">01</span>
          <h2 className="text-xs md:text-sm font-black uppercase tracking-widest">Input Word List</h2>
        </div>

        <div className="relative mb-3 md:mb-4">
          <textarea
            value={rawInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={"Example:\nApple - 苹果\nBanana - 香蕉\nCat - 猫"}
            className="w-full min-h-[250px] md:min-h-[40vh] bg-gray-50 border-2 border-gray-200 rounded-none p-3 md:p-4 font-mono text-xs md:text-sm focus:border-black focus:ring-0 outline-none resize-none transition-colors"
          />
          {rawInput && (
            <button
              onClick={onClearInput}
              className="absolute top-2 right-2 p-1.5 bg-black text-white rounded-none hover:bg-gray-800 active:scale-95 transition-transform"
              title="Clear all"
            >
              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          )}
        </div>

        <div className="flex justify-between text-[9px] md:text-[10px] font-bold text-gray-400 uppercase">
          <span>Count: {lineCount}/100</span>
          <span className="hidden sm:inline">Format: Word - Translation</span>
        </div>
      </div>

      <div className="mt-6 md:mt-8 space-y-4 md:space-y-6 pt-4 md:pt-8 border-t border-gray-100">
        <div className="space-y-3 md:space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] md:text-xs font-black uppercase tracking-tight">Playback Limit</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => onSettingsChange({ ...settings, maxPlays: val })}
                  className={`w-9 h-9 md:w-10 md:h-10 border-2 border-black flex items-center justify-center font-black text-xs md:text-sm transition-colors ${
                    settings.maxPlays === val ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black/5'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-[10px] md:text-xs font-black uppercase tracking-tight">Speech Speed</label>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400">{settings.voiceRate.toFixed(1)}x</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={settings.voiceRate}
                onChange={(e) => onSettingsChange({ ...settings, voiceRate: parseFloat(e.target.value) })}
                className="w-20 md:w-24 accent-black"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-[10px] md:text-xs font-black uppercase tracking-tight">Auto-play First</label>
            <button
              onClick={() => onSettingsChange({ ...settings, autoPlayFirst: !settings.autoPlayFirst })}
              className={`w-12 h-6 md:w-14 md:h-7 border-2 border-black flex items-center justify-center transition-colors relative ${
                settings.autoPlayFirst ? 'bg-black' : 'bg-transparent'
              }`}
            >
              <span
                className={`w-4 h-4 md:w-5 md:h-5 bg-white border-2 border-black block transition-transform ${
                  settings.autoPlayFirst ? 'translate-x-4 md:translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:gap-3">
          <button
            onClick={onStartInteractive}
            disabled={!rawInput.trim()}
            className="w-full bg-black text-white py-4 md:py-6 font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs md:text-sm"
          >
            Interactive Mode
          </button>
          <button
            onClick={onStartContinuous}
            disabled={!rawInput.trim()}
            className="w-full border-4 border-black py-3 md:py-4 font-black uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Offline Continuous
          </button>
        </div>
      </div>
    </section>
  );
}
