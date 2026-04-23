/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

import Header from './components/Header';
import WordInputPanel from './components/WordInputPanel';
import WelcomePanel from './components/WelcomePanel';
import DictationCard from './components/DictationCard';
import ContinuousMode from './components/ContinuousMode';

import ResultsAudit from './components/ResultsAudit';
import AISettingsModal from './components/AISettingsModal';
import AIOutputStream from './components/AIOutputStream';

import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
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
  const [settings, setSettings] = useState<AppSettings>({ maxPlays: 2, voiceRate: 1.0, autoPlayFirst: true });
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

  // Hooks
  const { speak, cancel: cancelSpeech } = useSpeechSynthesis(settings);

  // Handlers
  const handleStart = useCallback(() => {
    const parsed = parseInput(rawInput);
    if (parsed.length === 0) return;
    
    const shuffled = shuffleArray(parsed);
    
    console.log('[System] Session Started. Word Count:', shuffled.length);
    setSessionSource('interactive');
    setWords(shuffled);
    setSessionManifest(shuffled.map((w, idx) => ({ index: idx, word: w.english })));
    setStep(2);
    setCurrentIndex(0);
    setPlayCounts({});
    setUserAnswers({});
    setSkippedIndices(new Set());
  }, [rawInput]);

  const handleStartContinuous = useCallback(() => {
    const parsed = parseInput(rawInput);
    if (parsed.length === 0) return;

    const shuffled = shuffleArray(parsed);

    setSessionSource('continuous');
    setWords(shuffled);
    setStep(4);
    setCurrentIndex(0);
    setContinuousRepeat(0);
    setIsContinuousPlaying(settings.autoPlayFirst);
  }, [rawInput, settings.autoPlayFirst]);

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

    setIsEvaluating(true);
    setShowAiOutput(true);
    setAiOutputLines(['Connecting to AI...']);

    try {
      const payload = words.map((w, idx) => ({
        index: idx,
        english: w.english,
        standardTranslation: w.translation,
        userTranslation: finalAnswers[idx]?.translation || ''
      })).filter(item => item.userTranslation.trim() !== '');

      if (payload.length === 0) {
        setIsEvaluating(false);
        setShowAiOutput(false);
        return;
      }

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
        setAiOutputLines(prev => [...prev, '> Using Gemini model...', '  Sending request...']);
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
                required: ["index", "isCorrect"]
              }
            }
          }
        });
        
        let fullText = '';
        let dots = 0;
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            fullText += text;
            dots = (dots + 1) % 4;
            const loading = '▌'.slice(0, dots + 1);
            setAiOutputLines(prev => {
              const newLines = [...prev];
              newLines[newLines.length - 1] = `  ${loading} Analyzing semantic...`;
              return newLines;
            });
          }
        }
        
        setAiOutputLines(prev => [...prev, '', '> Parsing complete']);
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
        setAiOutputLines(prev => [...prev, `> Using OpenRouter: ${aiConfig.modelId}`, '  Sending request...']);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${aiConfig.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": aiConfig.modelId || "openai/gpt-oss-120b:free",
            "messages": [{ "role": "user", "content": prompt }],
            "response_format": { "type": "json_object" },
            "stream": true
          })
        });
        
        setAiOutputLines(prev => [...prev, '  Waiting for response...']);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        
        if (reader) {
          let dots = 0;
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
                    dots = (dots + 1) % 4;
                    const loading = '▌'.slice(0, dots + 1);
                    setAiOutputLines(prev => {
                      const newLines = [...prev];
                      newLines[newLines.length - 1] = `  ${loading} Analyzing semantic...`;
                      return newLines;
                    });
                  }
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        }
        
        setAiOutputLines(prev => [...prev, '', '> Parsing complete']);
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

      const verdictMap: Record<number, AIVerdict> = {};
      results.forEach((res: any) => {
        verdictMap[res.index] = { isCorrect: res.isCorrect, reason: res.reason };
      });
      
      setAiOutputLines(prev => [...prev, '', `> Evaluation complete - ${results.length} items processed`]);
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

  const handleContinuousToggle = useCallback(() => {
    setIsContinuousPlaying(prev => !prev);
  }, []);

  const handleContinuousFinish = useCallback(() => {
    setIsContinuousPlaying(false);
    setStep(3);
  }, []);

  // Render
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] font-sans flex flex-col">
      <Header
        step={step}
        currentIndex={currentIndex}
        wordsCount={words.length}
        sessionSource={sessionSource}
        onReset={handleReset}
        onAbort={handleAbort}
        onOpenAISettings={() => setShowAiSettings(true)}
      />

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full grid grid-cols-1 md:grid-cols-12 gap-0"
            >
              <WordInputPanel
                rawInput={rawInput}
                settings={settings}
                onInputChange={setRawInput}
                onClearInput={() => setRawInput('')}
                onSettingsChange={setSettings}
                onStartInteractive={handleStart}
                onStartContinuous={handleStartContinuous}
              />
              <WelcomePanel />
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
        onClose={() => setShowAiOutput(false)}
      />
    </div>
  );
}
