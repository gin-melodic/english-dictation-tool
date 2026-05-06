import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Play, Volume2, Cpu, Globe } from 'lucide-react';
import { getEnglishVoices, playVoicePreview, cancelSpeech, findVoiceByName } from '../utils/voiceUtils';

const STORAGE_KEY = 'voice-config';

interface KokoroVoiceInfo {
  id: string;
  name: string;
  accent: 'US' | 'UK';
  gender: 'female' | 'male';
}

const KOKORO_VOICES: KokoroVoiceInfo[] = [
  { id: 'af_heart',   name: 'Heart',    accent: 'US', gender: 'female' },
  { id: 'af_bella',   name: 'Bella',    accent: 'US', gender: 'female' },
  { id: 'af_sky',     name: 'Sky',      accent: 'US', gender: 'female' },
  { id: 'af_sarah',   name: 'Sarah',    accent: 'US', gender: 'female' },
  { id: 'af_nicole',  name: 'Nicole',   accent: 'US', gender: 'female' },
  { id: 'af_nova',    name: 'Nova',     accent: 'US', gender: 'female' },
  { id: 'af_river',   name: 'River',    accent: 'US', gender: 'female' },
  { id: 'am_adam',    name: 'Adam',     accent: 'US', gender: 'male' },
  { id: 'am_michael', name: 'Michael',  accent: 'US', gender: 'male' },
  { id: 'am_liam',    name: 'Liam',     accent: 'US', gender: 'male' },
  { id: 'am_eric',    name: 'Eric',     accent: 'US', gender: 'male' },
  { id: 'am_onyx',    name: 'Onyx',     accent: 'US', gender: 'male' },
  { id: 'bf_emma',    name: 'Emma',     accent: 'UK', gender: 'female' },
  { id: 'bf_isabella',name: 'Isabella', accent: 'UK', gender: 'female' },
  { id: 'bf_alice',   name: 'Alice',    accent: 'UK', gender: 'female' },
  { id: 'bf_lily',    name: 'Lily',     accent: 'UK', gender: 'female' },
  { id: 'bm_george',  name: 'George',   accent: 'UK', gender: 'male' },
  { id: 'bm_lewis',   name: 'Lewis',    accent: 'UK', gender: 'male' },
  { id: 'bm_daniel',  name: 'Daniel',   accent: 'UK', gender: 'male' },
  { id: 'bm_fable',   name: 'Fable',    accent: 'UK', gender: 'male' },
];

interface VoiceSelectorModalProps {
  isOpen: boolean;
  selectedVoice: string | null;
  onSelect: (voiceName: string | null) => void;
  onClose: () => void;
  ttsProvider: 'browser' | 'kokoro';
  kokoroVoice: string;
  kokoroReady: boolean;
  kokoroLoading: boolean;
  downloadProgress: number | null;
  onDownloadModel: () => void;
  onProviderChange: (provider: 'browser' | 'kokoro') => void;
  onKokoroVoiceSelect: (voice: string) => void;
  kokoroRate: number;
  onKokoroRateChange: (rate: number) => void;
}

interface VoiceItemProps {
  info: ReturnType<typeof getEnglishVoices>[0];
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function VoiceItem({ info, isSelected, onSelect, onPreview }: VoiceItemProps) {
  const localeColor = info.localeRegion === 'US' ? 'bg-blue-600' : 
                     info.localeRegion === 'UK' ? 'bg-red-600' : 'bg-gray-600';
  
  const genderIcon = info.gender === 'female' ? '♀' : info.gender === 'male' ? '♂' : '?';
  const serviceLabel = info.serviceType === 'local' ? 'LOCAL' : 'CLOUD';

  return (
    <div
      onClick={onSelect}
      className={`relative border-2 transition-all cursor-pointer group touch-manipulation ${
        isSelected ? 'border-black bg-black text-white' : 'border-gray-200 bg-white hover:border-black'
      }`}
    >
      <div className="p-3 md:p-4">
        {/* Voice name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-black text-xs md:text-sm uppercase tracking-tight truncate" title={info.voice.name}>
              {info.voice.name}
            </div>
            <div className="text-[9px] md:text-[10px] text-gray-400 font-mono mt-0.5 truncate">
              {info.voice.lang}
            </div>
          </div>
          {isSelected && (
            <div className="w-5 h-5 md:w-6 md:h-6 bg-white border-2 border-black flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 md:gap-2 mt-2 md:mt-3">
          <span className={`px-1 md:px-1.5 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-wider ${localeColor} text-white`}>
            {info.localeRegion}
          </span>
          <span className={`px-1 md:px-1.5 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-wider ${
            info.serviceType === 'local' ? 'bg-green-600' : 'bg-purple-600'
          } text-white`}>
            {serviceLabel}
          </span>
          <span className="px-1 md:px-1.5 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-wider border border-current opacity-60">
            {genderIcon}
          </span>
        </div>

        {/* Preview button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className={`absolute top-2 right-2 w-7 h-7 md:w-8 md:h-8 border-2 flex items-center justify-center transition-all touch-manipulation ${
            isSelected 
              ? 'bg-white text-black border-white hover:bg-gray-100' 
              : 'bg-transparent text-black border-black hover:bg-black hover:text-white'
          }`}
          title="Preview voice"
        >
          {isSelected ? (
            <Volume2 className="w-3 h-3 md:w-4 md:h-4" />
          ) : (
            <Play className="w-3 h-3 md:w-4 md:h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function VoiceSelectorModal({ isOpen, selectedVoice, onSelect, onClose, ttsProvider, kokoroVoice, kokoroReady, kokoroLoading, downloadProgress, onDownloadModel, onProviderChange, onKokoroVoiceSelect, kokoroRate, onKokoroRateChange }: VoiceSelectorModalProps) {
  const [voices, setVoices] = useState<ReturnType<typeof getEnglishVoices>>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch voices; they may not be immediately available on first load
    const updateVoices = () => {
      const englishVoices = getEnglishVoices();
      setVoices(englishVoices);
    };
    
    updateVoices();
    
    // Listen for voice changes (Chrome loads async)
    const synth = window.speechSynthesis;
    if (synth) {
      synth.addEventListener('voiceschanged', updateVoices);
      return () => synth.removeEventListener('voiceschanged', updateVoices);
    }
  }, [isOpen]);

  const handlePreview = useCallback((voiceName: string) => {
    cancelSpeech();
    const voice = findVoiceByName(voiceName);
    if (voice) {
      setIsPlaying(voiceName);
      playVoicePreview(voice);
      // Clear playing state after roughly the preview duration
      setTimeout(() => setIsPlaying(null), 2000);
    }
  }, []);

  if (!isOpen) return null;

  // Group voices by region for better organization
  const groupedVoices = voices.reduce((acc, info) => {
    if (!acc[info.localeRegion]) acc[info.localeRegion] = [];
    acc[info.localeRegion].push(info);
    return acc;
  }, {} as Record<string, ReturnType<typeof getEnglishVoices>>);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white border-4 md:border-[6px] border-black w-full max-w-2xl md:max-w-3xl lg:max-w-4xl p-4 md:p-6 lg:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 md:top-6 right-3 md:right-6 p-1.5 md:p-2 hover:bg-gray-100 transition-colors touch-manipulation z-10"
        >
          <X className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        <div className="space-y-4 md:space-y-6 lg:space-y-8">
          {/* Header */}
          <div>
            <h3 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tighter leading-none mb-1 md:mb-2">
              Voice Selection
            </h3>
            <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              Choose TTS voice for dictation playback
            </p>
          </div>

          {/* Provider toggle */}
          <div className="flex border-2 border-black">
            <button
              onClick={() => onProviderChange('browser')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 font-black uppercase text-[10px] md:text-xs tracking-widest transition-all ${
                ttsProvider === 'browser'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Browser TTS
            </button>
            <button
              onClick={() => onProviderChange('kokoro')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 font-black uppercase text-[10px] md:text-xs tracking-widest transition-all border-l-2 border-black ${
                ttsProvider === 'kokoro'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Kokoro AI
              {kokoroReady && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </button>
          </div>

          {/* Browser TTS content */}
          {ttsProvider === 'browser' && (
            <>
              {/* Auto option */}
              <div
                onClick={() => onSelect(null)}
                className={`relative border-2 transition-all cursor-pointer touch-manipulation ${
                  selectedVoice === null 
                    ? 'border-black bg-black text-white' 
                    : 'border-gray-200 bg-white hover:border-black'
                }`}
              >
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Play className="w-5 h-5 md:w-6 md:h-6" />
                      <div>
                        <div className="font-black text-sm md:text-base uppercase tracking-tight">Auto</div>
                        <div className="text-[9px] md:text-[10px] opacity-70">
                          Automatically select best English voice
                        </div>
                      </div>
                    </div>
                    {selectedVoice === null && (
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-white border-2 border-black flex items-center justify-center">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice list by region */}
              {(['US', 'UK', 'Other'] as const).map(region => {
                const regionVoices = groupedVoices[region];
                if (!regionVoices || regionVoices.length === 0) return null;

                return (
                  <div key={region}>
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 mb-2 md:mb-3">
                      {region === 'US' ? '🇺🇸 US English' : 
                       region === 'UK' ? '🇬🇧 UK English' : '🌍 Other English'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                      {regionVoices.map(info => (
                        <VoiceItem
                          key={info.voice.name}
                          info={info}
                          isSelected={selectedVoice === info.voice.name}
                          onSelect={() => onSelect(info.voice.name)}
                          onPreview={() => handlePreview(info.voice.name)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {voices.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No English voices detected. Voices may still be loading...
                </div>
              )}
            </>
          )}

          {/* Kokoro AI content */}
          {ttsProvider === 'kokoro' && (
            <>
              <div className="border-2 border-blue-200 bg-blue-50 p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-wider">
                      Kokoro AI · 82M ONNX Model
                    </p>
                    <p className="text-[9px] md:text-[10px] text-blue-600 mt-1">
                      Model downloaded from HuggingFace on first use (~60 MB). Runs entirely in-browser.
                    </p>
                    {kokoroLoading && (
                      <div className="mt-2">
                        <div className="w-full bg-blue-200 h-1.5 overflow-hidden">
                          {downloadProgress !== null && downloadProgress > 0 ? (
                            <div
                              className="bg-blue-600 h-1.5 transition-all duration-500"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          ) : (
                            <div className="bg-blue-500 h-1.5 animate-pulse" style={{ width: '30%' }} />
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-blue-600 mt-0.5">
                          {downloadProgress !== null && downloadProgress > 0
                            ? `Downloading... ${downloadProgress}%`
                            : 'Connecting...'}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onDownloadModel}
                    disabled={kokoroLoading}
                    className={`flex-shrink-0 border-2 px-2.5 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                      kokoroLoading
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50'
                        : 'border-black text-black hover:bg-black hover:text-white bg-white'
                    }`}
                  >
                    {kokoroLoading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                        下载中
                      </span>
                    ) : kokoroReady ? '重新下载' : '下载模型'}
                  </button>
                </div>
              </div>

              {/* Speed control */}
              <div className="border-2 border-gray-200 p-3 md:p-4">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-700">Playback Speed</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      value={kokoroRate}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onKokoroRateChange(Math.min(3.0, Math.max(0.5, parseFloat(v.toFixed(1)))));
                      }}
                      className="w-16 border-2 border-black text-center font-black text-xs md:text-sm py-1 px-1 focus:outline-none"
                    />
                    <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">x</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={kokoroRate}
                  onChange={e => onKokoroRateChange(parseFloat(parseFloat(e.target.value).toFixed(1)))}
                  className="w-full accent-black h-2 cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] md:text-[9px] font-mono text-gray-400">0.5x</span>
                  <span className="text-[8px] md:text-[9px] font-mono text-gray-400">1.0x</span>
                  <span className="text-[8px] md:text-[9px] font-mono text-gray-400">2.0x</span>
                  <span className="text-[8px] md:text-[9px] font-mono text-gray-400">3.0x</span>
                </div>
              </div>

              {(['US', 'UK'] as const).map(accent => {
                const accentVoices = KOKORO_VOICES.filter(v => v.accent === accent);
                return (
                  <div key={accent}>
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 mb-2 md:mb-3">
                      {accent === 'US' ? '🇺🇸 US English' : '🇬🇧 UK English'}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                      {accentVoices.map(v => {
                        const isSelected = kokoroVoice === v.id;
                        const genderIcon = v.gender === 'female' ? '♀' : '♂';
                        const accentColor = accent === 'US' ? 'bg-blue-600' : 'bg-red-600';
                        return (
                          <div
                            key={v.id}
                            onClick={() => onKokoroVoiceSelect(v.id)}
                            className={`relative border-2 transition-all cursor-pointer touch-manipulation p-3 ${
                              isSelected ? 'border-black bg-black text-white' : 'border-gray-200 bg-white hover:border-black'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="font-black text-xs md:text-sm uppercase tracking-tight">{v.name}</div>
                              {isSelected && (
                                <div className="w-4 h-4 md:w-5 md:h-5 bg-white border-2 border-black flex items-center justify-center flex-shrink-0">
                                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="text-[8px] md:text-[9px] font-mono opacity-60 mt-0.5">{v.id}</div>
                            <div className="flex gap-1 mt-2">
                              <span className={`px-1 py-0.5 text-[7px] md:text-[8px] font-black uppercase ${accentColor} text-white`}>
                                {accent}
                              </span>
                              <span className="px-1 py-0.5 text-[7px] md:text-[8px] font-black uppercase border border-current opacity-60">
                                {genderIcon}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-black text-white py-3 md:py-4 font-black uppercase tracking-widest hover:bg-gray-800 transition-all text-xs md:text-sm min-h-[44px] touch-manipulation"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}