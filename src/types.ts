/**
 * Type definitions for the English Dictation Tool
 */

export interface WordEntry {
  english: string;
  translation: string;
}

export interface NotebookPage {
  id: string;
  name: string;
  content: string;
}

export interface Wordbook {
  id: string;
  name: string;
  words: string;
  notes: NotebookPage[];
  createdAt: number;
  updatedAt: number;
}

export interface WordbookIndexEntry {
  id: string;
  name: string;
  wordCount: number;
  updatedAt: number;
}

export interface DictationResult {
  word: WordEntry;
  userEnglish: string;
  userTranslation: string;
  skipped: boolean;
}

export interface AppSettings {
  maxPlays: number;
  voiceRate: number;
  autoPlayFirst: boolean;
  selectedVoice: string | null; // voice name or null for auto
  shuffleMode: boolean;
  ttsProvider: 'browser' | 'kokoro';
  kokoroVoice: string;
  kokoroRate: number;
}

export interface AIConfig {
  provider: 'gemini' | 'openrouter' | 'nvidia';
  apiKey: string;
  modelId: string;
}

export interface AIVerdict {
  isCorrect: boolean;
  reason?: string;
}

export type Step = 1 | 2 | 3 | 4;
export type SessionSource = 'interactive' | 'continuous';

export interface SessionManifestItem {
  index: number;
  word: string;
}
