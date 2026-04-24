import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Play, Volume2 } from 'lucide-react';
import { getEnglishVoices, playVoicePreview, cancelSpeech, findVoiceByName } from '../utils/voiceUtils';

const STORAGE_KEY = 'voice-config';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  selectedVoice: string | null;
  onSelect: (voiceName: string | null) => void;
  onClose: () => void;
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

export default function VoiceSelectorModal({ isOpen, selectedVoice, onSelect, onClose }: VoiceSelectorModalProps) {
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