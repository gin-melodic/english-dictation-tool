import { Play, Volume2, Zap } from 'lucide-react';
import type { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  hasWords: boolean;
  onSettingsChange: (s: AppSettings) => void;
  onStartInteractive: () => void;
  onStartContinuous: () => void;
  onOpenVoiceSelector: () => void;
  onOpenTTSCache?: () => void;
  selectedVoice: string | null;
}

export default function SessionLaunchPanel({
  settings,
  hasWords,
  onSettingsChange,
  onStartInteractive,
  onStartContinuous,
  onOpenVoiceSelector,
  onOpenTTSCache,
  selectedVoice,
}: Props) {
  return (
    <section className="h-full bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="bg-black text-white px-1.5 py-0.5 text-[9px] font-bold">02</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Playback Limit */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-tight mb-2">Playback Limit</label>
          <div className="flex gap-1">
            {[1, 2, 3, 5].map(val => (
              <button
                key={val}
                onClick={() => onSettingsChange({ ...settings, maxPlays: val })}
                className={`w-9 h-9 border-2 border-black flex items-center justify-center font-black text-sm transition-colors ${
                  settings.maxPlays === val ? 'bg-black text-white' : 'hover:bg-black/5'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Speech Speed */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black uppercase tracking-tight">Speech Speed</label>
            <span className="text-[10px] font-black text-gray-400">{settings.voiceRate.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={settings.voiceRate}
            onChange={e => onSettingsChange({ ...settings, voiceRate: parseFloat(e.target.value) })}
            className="w-full accent-black"
          />
        </div>

        {/* Toggles */}
        {[
          { key: 'autoPlayFirst', label: 'Auto-play First' },
          { key: 'shuffleMode', label: 'Shuffle Words' },
        ].map(({ key, label }) => (
          <div key={key} className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase tracking-tight">{label}</label>
            <button
              onClick={() => onSettingsChange({ ...settings, [key]: !settings[key as keyof AppSettings] })}
              className={`w-12 h-6 border-2 border-black relative transition-colors ${
                settings[key as keyof AppSettings] ? 'bg-black' : 'bg-transparent'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white border-2 border-black transition-transform ${
                  settings[key as keyof AppSettings] ? 'translate-x-1' : '-translate-x-5'
                }`}
              />
            </button>
          </div>
        ))}

        {/* Voice */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase tracking-tight">TTS Voice</label>
            <button
              onClick={onOpenVoiceSelector}
              className="flex items-center gap-1.5 px-2 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors text-[9px] font-black uppercase tracking-wider"
            >
              <Volume2 className="w-3 h-3" />
              <span className="truncate max-w-[70px]">
                {selectedVoice ? selectedVoice.split(' ')[0] : 'Auto'}
              </span>
              <span className="text-[8px] opacity-60">▼</span>
            </button>
          </div>
          <div className="mt-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">
            {settings.ttsProvider === 'kokoro' ? 'Kokoro AI' : 'Browser'}
          </div>
        </div>

        {/* Kokoro TTS Cache */}
        {settings.ttsProvider === 'kokoro' && onOpenTTSCache && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onOpenTTSCache}
              disabled={!hasWords}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-black text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Zap className="w-3 h-3" />
              Pre-generate TTS Cache
            </button>
          </div>
        )}
      </div>

      {/* Launch buttons */}
      <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-100">
        <button
          onClick={onStartInteractive}
          disabled={!hasWords}
          className="w-full bg-black text-white py-4 font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs"
        >
          Interactive Mode
        </button>
        <button
          onClick={onStartContinuous}
          disabled={!hasWords}
          className="w-full border-4 border-black py-3 font-black uppercase tracking-widest hover:bg-black/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" /> Offline Continuous
        </button>
      </div>
    </section>
  );
}
