import { WordEntry } from '../types';

/**
 * Parse raw multiline input into WordEntry array
 * Supports multiple delimiters: |, :, -, whitespace
 */
export function parseInput(rawInput: string): WordEntry[] {
  const lines = rawInput.split('\n').filter(line => line.trim() !== '');
  
  const parsedWords: WordEntry[] = lines.map(line => {
    let parts: string[] = [];
    
    if (line.includes('|')) parts = line.split('|');
    else if (line.includes(':')) parts = line.split(':');
    else if (line.includes('-')) parts = line.split('-');
    else {
      const match = line.match(/^([a-zA-Z\s]+)\s+(.+)$/);
      if (match) parts = [match[1], match[2]];
      else parts = [line];
    }

    return {
      english: parts[0]?.trim() || '',
      translation: parts[1]?.trim() || ''
    };
  }).filter(w => w.english !== '');

  return parsedWords.slice(0, 100);
}

/**
 * Shuffle array in-place using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
