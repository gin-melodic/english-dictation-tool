/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

import { BookOpen } from 'lucide-react';
import Header from './components/Header';
import DictationCard from './components/DictationCard';
import ContinuousMode from './components/ContinuousMode';
import VoiceSelectorModal from './components/VoiceSelectorModal';
import ResultsAudit from './components/ResultsAudit';
import AISettingsModal from './components/AISettingsModal';
import AIOutputStream from './components/AIOutputStream';
import WordbookSidebar from './components/WordbookSidebar';
import WordbookEditor from './components/WordbookEditor';
import SessionLaunchPanel from './components/SessionLaunchPanel';
import TTSCacheModal from './components/TTSCacheModal';

import { useWordbooks } from './hooks/useWordbooks';

import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useKokoroTTS } from './hooks/useKokoroTTS';
import { parseInput, shuffleArray } from './utils/helpers';

import type {
  WordEntry,
  AppSettings,
  AIConfig,
  AIVerdict,
  Step,
  SessionSource,
  SessionManifestItem
} from './types';

export default function App() {
  // State
  const [step, setStep] = useState<Step>(1);
  const [rawInput, setRawInput] = useState('');
  const [words, setWords] = useState<WordEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          selectedVoice: parsed.selectedVoice || null,
          shuffleMode: parsed.shuffleMode ?? true,
          ttsProvider: parsed.ttsProvider || 'browser',
          kokoroVoice: parsed.kokoroVoice || 'af_heart',
          kokoroRate: parsed.kokoroRate ?? 1.0,
        };
      } catch {
        // fall through
      }
    }
    return { maxPlays: 2, voiceRate: 1.0, autoPlayFirst: true, selectedVoice: null, shuffleMode: true, ttsProvider: 'browser', kokoroVoice: 'af_heart', kokoroRate: 1.0 };
  });
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: '',
    modelId: 'openai/gpt-oss-120b:free',
  });
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, { english: string; translation: string }>>({});
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiVerdicts, setAiVerdicts] = useState<Record<number, AIVerdict>>({});
  const [isContinuousPlaying, setIsContinuousPlaying] = useState(false);
  const [continuousRepeat, setContinuousRepeat] = useState(0);
  const [sessionSource, setSessionSource] = useState<SessionSource>('interactive');
  const [sessionManifest, setSessionManifest] = useState<SessionManifestItem[]>([]);
  const [showAiOutput, setShowAiOutput] = useState(false);
  const [aiOutputLines, setAiOutputLines] = useState<string[]>([]);
  const [aiStreamingText, setAiStreamingText] = useState('');
  const [showTTSCache, setShowTTSCache] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Wordbooks
  const wordbooks = useWordbooks();

  // Hooks
  const { speak: browserSpeak, cancel: browserCancel } = useSpeechSynthesis(settings);
  const { speak: kokoroSpeak, cancel: kokoroCancel, isLoading: kokoroLoading, isReady: kokoroReady, isGenerating: kokoroGenerating, downloadProgress: kokoroDownloadProgress, downloadModel: downloadKokoroModel, generateBlob: kokoroGenerateBlob } = useKokoroTTS(settings.kokoroVoice, settings.kokoroRate);

  const speak = useCallback((text: string) => {
    if (settings.ttsProvider === 'kokoro') {
      kokoroSpeak(text);
    } else {
      browserSpeak(text);
    }
  }, [settings.ttsProvider, browserSpeak, kokoroSpeak]);

  const cancelSpeech = useCallback(() => {
    browserCancel();
    kokoroCancel();
  }, [browserCancel, kokoroCancel]);

  // Handlers
  const handleStart = useCallback(() => {
    const rawWords = wordbooks.current?.words ?? rawInput;
    const parsed = parseInput(rawWords);
    if (parsed.length === 0) return;

    const wordsList = settings.shuffleMode ? shuffleArray(parsed) : parsed;

    console.log('[System] Session Started. Word Count:', wordsList.length);
    setSessionSource('interactive');
    setWords(wordsList);
    setSessionManifest(wordsList.map((w, idx) => ({ index: idx, word: w.english })));
    setStep(2);
    setCurrentIndex(0);
    setPlayCounts({});
    setUserAnswers({});
    setSkippedIndices(new Set());
  }, [wordbooks.current, rawInput, settings.shuffleMode]);

  const handleStartContinuous = useCallback(() => {
    const rawWords = wordbooks.current?.words ?? rawInput;
    const parsed = parseInput(rawWords);
    if (parsed.length === 0) return;

    const wordsList = settings.shuffleMode ? shuffleArray(parsed) : parsed;

    setSessionSource('continuous');
    setWords(wordsList);
    setStep(4);
    setCurrentIndex(0);
    setContinuousRepeat(0);
    setIsContinuousPlaying(settings.autoPlayFirst);
  }, [wordbooks.current, rawInput, settings.shuffleMode, settings.autoPlayFirst]);

  const handleAbort = useCallback(() => {
    cancelSpeech();
    setStep(1);
    setCurrentIndex(0);
    setPlayCounts({});
    setUserAnswers({});
    setSkippedIndices(new Set());
  }, [cancelSpeech]);

  const handleReset = useCallback(() => {
    cancelSpeech();
    setStep(1);
    setRawInput('');
    setWords([]);
    setSessionManifest([]);
    setCurrentIndex(0);
    setPlayCounts({});
    setUserAnswers({});
    setSkippedIndices(new Set());
    setAiVerdicts({});
  }, [cancelSpeech]);

  const handlePlay = useCallback(() => {
    const word = words[currentIndex];
    speak(word.english);
    setPlayCounts(prev => {
      const currentCount = prev[currentIndex] || 0;
      if (currentCount >= settings.maxPlays) return prev;
      return { ...prev, [currentIndex]: currentCount + 1 };
    });
  }, [currentIndex, words, speak, settings.maxPlays]);

  const handleEnglishChange = useCallback((value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: { ...(prev[currentIndex] || { translation: '' }), english: value }
    }));
  }, [currentIndex]);

  const handleTranslationChange = useCallback((value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: { ...(prev[currentIndex] || { english: '' }), translation: value }
    }));
  }, [currentIndex]);

  // AI Evaluation
  const evaluateResultsWithAI = useCallback(async (finalAnswers: Record<number, { english: string; translation: string }>) => {
    if (!aiConfig.apiKey.trim()) {
      console.warn('No user API key provided. Skipping AI semantic scoring.');
      return;
    }

    const initialVerdicts: Record<number, AIVerdict> = {};
    const payload = words.map((w, idx) => {
      const userAns = finalAnswers[idx]?.translation || '';
      const standardAns = w.translation;

      // Exact match check (trimmed)
      if (userAns.trim() !== '' && userAns.trim() === standardAns.trim()) {
        initialVerdicts[idx] = { isCorrect: true, reason: '与答案完全一致' };
        return null;
      }

      return userAns.trim() !== '' ? {
        index: idx,
        english: w.english,
        standardTranslation: w.translation,
        userTranslation: userAns
      } : null;
    }).filter((item): item is any => item !== null);

    if (payload.length === 0) {
      setAiVerdicts(initialVerdicts);
      setIsEvaluating(false);
      setShowAiOutput(false);
      return;
    }

    setIsEvaluating(true);
    setShowAiOutput(true);
    setAiOutputLines(['Connecting to AI...', `> ${Object.keys(initialVerdicts).length} items matched exactly (skipped)`]);

    try {
      let results: any[] = [];
      const prompt = `You are evaluating English-to-Chinese translation answers for a vocabulary test.

Rules:
- Be FLEXIBLE with synonyms and alternative meanings: an English word may have multiple valid meanings (e.g., "abroad" can mean "在国外" OR "在流传中"). If the user's translation matches ANY legitimate meaning of the English word — even if it differs from the standard answer — mark it CORRECT.
- Use your own knowledge of the English word's full range of meanings to judge correctness, not just whether it matches the standard translation provided.
- Be STRICT with part-of-speech errors (e.g., if the standard is "世界" (noun) but the user wrote "世界的" (adjective/attributive form), mark WRONG).
- Minor character variations or alternate written forms of the same meaning should be marked CORRECT.

Return a JSON array of objects. Format: [{"index": number, "isCorrect": boolean, "reason": "Chinese explanation"}]

Data: ${JSON.stringify(payload)}`;

      if (aiConfig.provider === 'gemini') {
        flushSync(() => setAiOutputLines(prev => [...prev, '> Using Gemini model...', '  Sending request...']));
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });

        const stream = await ai.models.generateContentStream({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.NUMBER },
                  isCorrect: { type: Type.BOOLEAN },
                  reason: { type: Type.STRING }
                },
                required: ["index", "isCorrect", "reason"]
              }
            }
          }
        });

        let fullText = '';
        let chunkCount = 0;
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            fullText += text;
            chunkCount++;
            // Use flushSync to force React to render immediately
            flushSync(() => {
              setAiStreamingText(fullText);
              setAiOutputLines(prev => {
                const newLines = [...prev];
                const lastIdx = newLines.length - 1;
                newLines[lastIdx] = `  ▶ Received ${chunkCount} chunks (${fullText.length} chars)...`;
                return newLines;
              });
            });
          }
        }

        console.info('[AI] Full Stream Output (Gemini):', fullText);

        flushSync(() => {
          setAiStreamingText('');
          setAiOutputLines(prev => [...prev, '', '> Parsing complete']);
        });
        // Clean up content and handle partial JSON
        const cleanText = fullText.trim().replace(/^[^{[]*|[^}\]]*$/g, '');
        try {
          results = JSON.parse(cleanText || '[]');
        } catch (e) {
          // Fallback: try to extract first valid JSON array/object
          const arrMatch = cleanText.match(/\[[\s\S]*\]/);
          const objMatch = cleanText.match(/\{[\s\S]*\}/);
          if (arrMatch) {
            results = JSON.parse(arrMatch[0]);
          } else if (objMatch) {
            const parsed = JSON.parse(objMatch[0]);
            results = Array.isArray(parsed) ? parsed : (parsed.results || Object.values(parsed)[0]);
          } else {
            throw e;
          }
        }
      } else {
        const isNvidia = aiConfig.provider === 'nvidia';
        const baseUrl = isNvidia
          ? '/nvidia-api/v1/chat/completions'
          : 'https://openrouter.ai/api/v1/chat/completions';
        const defaultModel = isNvidia
          ? 'deepseek-ai/deepseek-v4-pro'
          : 'openai/gpt-oss-120b:free';
        const providerLabel = isNvidia ? 'NVIDIA' : 'OpenRouter';

        flushSync(() => setAiOutputLines(prev => [...prev, `> Using ${providerLabel}: ${aiConfig.modelId || defaultModel}`, '  Sending request...']));

        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${aiConfig.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": aiConfig.modelId || defaultModel,
            "messages": [{ "role": "user", "content": prompt }],
            "response_format": { "type": "json_object" },
            "stream": true,
            "temperature": 0.3,
            "top_p": 0.95,
          })
        });

        flushSync(() => setAiOutputLines(prev => [...prev, '  Waiting for response...']));
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          let chunkCount = 0;
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                    chunkCount++;
                    // Use flushSync to force React to render immediately
                    flushSync(() => {
                      setAiStreamingText(fullContent);
                      setAiOutputLines(prev => {
                        const newLines = [...prev];
                        const lastIdx = newLines.length - 1;
                        newLines[lastIdx] = `  ▶ Received ${chunkCount} chunks (${fullContent.length} chars)...`;
                        return newLines;
                      });
                    });
                  }
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        }

        console.info(`[AI] Full Stream Output (${providerLabel}):`, fullContent);

        flushSync(() => {
          setAiStreamingText('');
          setAiOutputLines(prev => [...prev, '', '> Parsing complete']);
        });
        // Extract valid JSON array from the response
        const extractJSONArray = (text: string): any[] | null => {
          // Find the first '[' and match it with the corresponding ']'
          const startMatch = text.match(/\[[\s\S]*/);
          if (!startMatch) return null;

          let start = startMatch.index || 0;
          let bracketCount = 0;
          let end = -1;

          for (let i = start; i < text.length; i++) {
            if (text[i] === '[') bracketCount++;
            else if (text[i] === ']') {
              bracketCount--;
              if (bracketCount === 0) {
                end = i;
                break;
              }
            }
          }

          if (end !== -1) {
            try {
              return JSON.parse(text.slice(start, end + 1));
            } catch {
              return null;
            }
          }
          return null;
        };

        let parsed = extractJSONArray(fullContent);
        if (!parsed) {
          // Try to extract as object with results array
          const objMatch = fullContent.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try {
              const obj = JSON.parse(objMatch[0]);
              parsed = Array.isArray(obj) ? obj : (obj.results || Object.values(obj)[0]);
            } catch {
              parsed = [];
            }
          } else {
            parsed = [];
          }
        }
        results = Array.isArray(parsed) ? parsed : [];
      }

      setAiOutputLines(prev => [...prev, '> Evaluating...']);
      results.forEach((res: any, idx: number) => {
        const word = words[res.index];
        const status = res.isCorrect ? '✓' : '✗';
        setAiOutputLines(prev => [...prev, `  ${status} [${idx + 1}] ${word?.english || '?'} → ${res.reason?.substring(0, 30) || ''}...`]);
      });

      const verdictMap: Record<number, AIVerdict> = { ...initialVerdicts };
      results.forEach((res: any) => {
        verdictMap[res.index] = { isCorrect: res.isCorrect, reason: res.reason };
      });

      setAiOutputLines(prev => [...prev, '', `> Evaluation complete - ${results.length} items processed (+${Object.keys(initialVerdicts).length} automatic)`]);
      setAiVerdicts(verdictMap);

      setTimeout(() => {
        setShowAiOutput(false);
        setAiOutputLines([]);
      }, 1500);
    } catch (error) {
      console.error('[AI] Evaluation failed:', error);
      setAiOutputLines(prev => [...prev, '', `> ERROR: ${error}`]);
      setTimeout(() => {
        setShowAiOutput(false);
        setAiOutputLines([]);
      }, 2000);
    } finally {
      setIsEvaluating(false);
    }
  }, [aiConfig, words]);

  const finalizeSession = useCallback(async () => {
    setStep(3);
    await evaluateResultsWithAI(userAnswers);
  }, [userAnswers, evaluateResultsWithAI]);

  const handleSkip = useCallback(() => {
    setSkippedIndices(prev => new Set(prev).add(currentIndex));
    cancelSpeech();
    if (currentIndex === words.length - 1) {
      finalizeSession();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, words.length, cancelSpeech, finalizeSession]);

  const handleNext = useCallback(() => {
    cancelSpeech();
    if (currentIndex === words.length - 1) {
      finalizeSession();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, words.length, cancelSpeech, finalizeSession]);

  const handleDebugAutofill = useCallback(() => {
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: {
        english: words[currentIndex].english,
        translation: words[currentIndex].translation
      }
    }));
  }, [currentIndex, words]);

  const handleVoiceSelect = useCallback((voiceName: string | null) => {
    setSettings(prev => ({ ...prev, selectedVoice: voiceName }));
  }, []);

  const handleProviderChange = useCallback((provider: 'browser' | 'kokoro') => {
    setSettings(prev => ({ ...prev, ttsProvider: provider }));
  }, []);

  const handleKokoroVoiceSelect = useCallback((voice: string) => {
    setSettings(prev => ({ ...prev, kokoroVoice: voice }));
  }, []);

  const handleKokoroRateChange = useCallback((rate: number) => {
    setSettings(prev => ({ ...prev, kokoroRate: rate }));
  }, []);

  // Continuous mode effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (step === 4 && isContinuousPlaying && currentIndex < words.length) {
      const currentWord = words[currentIndex];
      console.log(`[Continuous] Slot ${currentIndex} | Repeat ${continuousRepeat + 1}/${settings.maxPlays}: ${currentWord.english}`);
      speak(currentWord.english);

      const isLastRepeat = (continuousRepeat + 1) >= settings.maxPlays;
      let delay = 3000;

      if (isLastRepeat) {
        const baseDelay = 4000;
        const englishBonus = currentWord.english.length * 350;
        const translationBonus = currentWord.translation.length * 1200;
        delay = baseDelay + englishBonus + translationBonus;
      }

      timeout = setTimeout(() => {
        if (isLastRepeat) {
          if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setContinuousRepeat(0);
          } else {
            setIsContinuousPlaying(false);
          }
        } else {
          setContinuousRepeat(prev => prev + 1);
        }
      }, delay);
    }
    return () => clearTimeout(timeout);
  }, [step, isContinuousPlaying, currentIndex, words, continuousRepeat, settings.maxPlays, speak]);

  // Parse ai-config from localStorage on mount
  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem('ai-config');
      if (storedConfig) {
        console.info('Loaded AI config from localStorage', JSON.parse(storedConfig));
        setAiConfig(JSON.parse(storedConfig));
      }
    } catch {
      // Ignore parsing errors and use default config
    }
  }, []);

  // Persist app settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const handleContinuousToggle = useCallback(() => {
    setIsContinuousPlaying(prev => !prev);
  }, []);

  const handleContinuousFinish = useCallback(() => {
    setIsContinuousPlaying(false);
    setStep(3);
  }, []);

  // Render
  return (
    <div className="h-screen bg-[#F3F4F6] text-[#111827] font-sans flex flex-col overflow-hidden">
      <Header
        step={step}
        currentIndex={currentIndex}
        wordsCount={words.length}
        sessionSource={sessionSource}
        onReset={handleReset}
        onAbort={handleAbort}
        onOpenAISettings={() => setShowAiSettings(true)}
      />

      <main className="flex-1 overflow-y-auto md:overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:h-full grid grid-cols-1 md:grid-cols-12 gap-0"
            >
              {/* Mobile: Wordbooks toggle button */}
              <div className="col-span-1 md:hidden flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Wordbooks
                </button>
                {wordbooks.current && (
                  <span className="text-[10px] font-bold text-gray-500 truncate max-w-[160px]">{wordbooks.current.name}</span>
                )}
              </div>

              {/* Left: Wordbook Sidebar */}
              <div className="hidden md:flex md:col-span-2 h-full">
                <WordbookSidebar
                  index={wordbooks.index}
                  currentId={wordbooks.current?.id ?? null}
                  isLoading={wordbooks.isLoading}
                  onSelect={wordbooks.selectWordbook}
                  onCreate={wordbooks.createWordbook}
                  onDelete={wordbooks.deleteWordbook}
                />
              </div>

              {/* Center: Wordbook Editor */}
              <div className="col-span-12 md:col-span-7 h-[50vh] md:h-full border-r border-gray-200 overflow-hidden">
                {wordbooks.current ? (
                  <WordbookEditor
                    wordbook={wordbooks.current}
                    onUpdateWords={wordbooks.updateWords}
                    onRename={wordbooks.renameWordbook}
                    onAddNotePage={wordbooks.addNotePage}
                    onUpdateNotePage={wordbooks.updateNotePage}
                    onRenameNotePage={wordbooks.renameNotePage}
                    onDeleteNotePage={wordbooks.deleteNotePage}
                    onSpeak={speak}
                    onCancelSpeech={cancelSpeech}
                    onSave={wordbooks.saveNow}
                    saveStatus={wordbooks.saveStatus}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                    <div className="p-4 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                      <span className="text-4xl">📖</span>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">No Wordbook Selected</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs">
                      {wordbooks.isLoading ? 'Loading…' : 'Create a wordbook using the sidebar on the left.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Session Settings + Launch */}
              <div className="col-span-12 md:col-span-3 md:h-full">
                <SessionLaunchPanel
                  settings={settings}
                  hasWords={!!wordbooks.current?.words?.trim()}
                  onSettingsChange={setSettings}
                  onStartInteractive={handleStart}
                  onStartContinuous={handleStartContinuous}
                  onOpenVoiceSelector={() => setShowVoiceSelector(true)}
                  onOpenTTSCache={() => setShowTTSCache(true)}
                  selectedVoice={settings.selectedVoice}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full bg-[#F9FAFB] p-8 md:p-12 flex flex-col justify-center items-center overflow-y-auto"
            >
              <DictationCard
                currentIndex={currentIndex}
                words={words}
                settings={settings}
                userAnswers={userAnswers}
                playCounts={playCounts}
                onPlay={handlePlay}
                onEnglishChange={handleEnglishChange}
                onTranslationChange={handleTranslationChange}
                onSkip={handleSkip}
                onNext={handleNext}
                onDebugAutofill={handleDebugAutofill}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ContinuousMode
                currentIndex={currentIndex}
                continuousRepeat={continuousRepeat}
                words={words}
                settings={settings}
                isPlaying={isContinuousPlaying}
                onTogglePlay={handleContinuousToggle}
                onAbort={handleAbort}
                onFinish={handleContinuousFinish}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ResultsAudit
                words={words}
                userAnswers={userAnswers}
                skippedIndices={skippedIndices}
                aiVerdicts={aiVerdicts}
                isEvaluating={isEvaluating}
                sessionSource={sessionSource}
                onReset={handleReset}
                onBackToIntegrity={() => setStep(2)}
                settings={settings}
                onOpenVoiceSelector={() => setShowVoiceSelector(true)}
                selectedVoice={settings.selectedVoice}
                onSpeak={speak}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile: Wordbook Sidebar Drawer */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            key="mobile-sidebar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden"
          >
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowMobileSidebar(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-64 z-50"
            >
              <WordbookSidebar
                index={wordbooks.index}
                currentId={wordbooks.current?.id ?? null}
                isLoading={wordbooks.isLoading}
                onSelect={(id) => { wordbooks.selectWordbook(id); setShowMobileSidebar(false); }}
                onCreate={wordbooks.createWordbook}
                onDelete={wordbooks.deleteWordbook}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Settings Modal */}
      <AnimatePresence>
        {showAiSettings && (
          <AISettingsModal
            isOpen={showAiSettings}
            initialConfig={aiConfig}
            onSave={setAiConfig}
            onClose={() => setShowAiSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* AI Output Stream */}
      <AIOutputStream
        isOpen={showAiOutput}
        outputs={aiOutputLines}
        streamingText={aiStreamingText}
        onClose={() => setShowAiOutput(false)}
      />

      {/* Kokoro status indicator */}
      {settings.ttsProvider === 'kokoro' && (kokoroLoading || kokoroGenerating) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl flex flex-col gap-2 shadow-xl" style={{ minWidth: '220px' }}>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span>{kokoroLoading ? 'Loading Kokoro AI…' : 'Synthesizing speech…'}</span>
          </div>
          {kokoroLoading && kokoroDownloadProgress !== null && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${kokoroDownloadProgress}%` }}
                />
              </div>
              <span className="tabular-nums text-gray-400">{kokoroDownloadProgress}%</span>
            </div>
          )}
          {kokoroGenerating && (
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* TTS Cache Modal */}
      {showTTSCache && wordbooks.current && (
        <TTSCacheModal
          words={parseInput(wordbooks.current.words)}
          voice={settings.kokoroVoice}
          generateBlob={kokoroGenerateBlob}
          kokoroReady={kokoroReady}
          kokoroLoading={kokoroLoading}
          downloadProgress={kokoroDownloadProgress}
          onClose={() => setShowTTSCache(false)}
        />
      )}

      {/* Save status indicator */}
      {wordbooks.saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 z-40 px-3 py-2 text-[10px] font-black uppercase tracking-widest border-2 ${
          wordbooks.saveStatus === 'saving' ? 'bg-gray-900 text-white border-gray-700' :
          wordbooks.saveStatus === 'saved' ? 'bg-green-900 text-white border-green-700' :
          'bg-red-900 text-white border-red-700'
        }`}>
          {wordbooks.saveStatus === 'saving' ? '⏳ Saving…' :
           wordbooks.saveStatus === 'saved' ? '✓ Saved' : '✗ Save Error'}
        </div>
      )}

      {/* Voice Selector Modal */}
      <VoiceSelectorModal
        isOpen={showVoiceSelector}
        selectedVoice={settings.selectedVoice}
        onSelect={handleVoiceSelect}
        onClose={() => setShowVoiceSelector(false)}
        ttsProvider={settings.ttsProvider}
        kokoroVoice={settings.kokoroVoice}
        kokoroReady={kokoroReady}
        kokoroLoading={kokoroLoading}
        downloadProgress={kokoroDownloadProgress}
        onDownloadModel={downloadKokoroModel}
        onProviderChange={handleProviderChange}
        onKokoroVoiceSelect={handleKokoroVoiceSelect}
        kokoroRate={settings.kokoroRate}
        onKokoroRateChange={handleKokoroRateChange}
      />
    </div>
  );
}
