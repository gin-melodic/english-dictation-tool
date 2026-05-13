import { useState, useEffect, useCallback, useRef } from 'react';
import type { Wordbook, WordbookIndexEntry } from '../types';
import { parseInput } from '../utils/helpers';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const INDEX_KEY = 'wordbook-index';
const wordbookKey = (id: string) => `wordbook:${id}`;
const draftKey = (id: string) => `wordbook-draft:${id}`;

function generateId(): string {
  return `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readIndex(): WordbookIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WordbookIndexEntry[];
  } catch {
    return [];
  }
}

function writeIndex(index: WordbookIndexEntry[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function readWordbook(id: string): Wordbook | null {
  // Prefer unsaved draft if present
  const draft = localStorage.getItem(draftKey(id));
  if (draft) {
    try { return JSON.parse(draft) as Wordbook; } catch { /* ignore */ }
  }
  const raw = localStorage.getItem(wordbookKey(id));
  if (!raw) return null;
  try { return JSON.parse(raw) as Wordbook; } catch { return null; }
}

function writeWordbook(wb: Wordbook): WordbookIndexEntry {
  localStorage.setItem(wordbookKey(wb.id), JSON.stringify(wb));
  const entry: WordbookIndexEntry = {
    id: wb.id,
    name: wb.name,
    wordCount: parseInput(wb.words ?? '').length,
    updatedAt: wb.updatedAt,
  };
  const index = readIndex();
  const idx = index.findIndex(e => e.id === wb.id);
  if (idx >= 0) index[idx] = entry; else index.push(entry);
  writeIndex(index);
  return entry;
}

export function useWordbooks() {
  const [index, setIndex] = useState<WordbookIndexEntry[]>([]);
  const [current, setCurrent] = useState<Wordbook | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load index on mount
  useEffect(() => {
    const data = readIndex();
    setIndex(data);
    if (data.length > 0) {
      const wb = readWordbook(data[0].id);
      if (wb) setCurrent(wb);
    }
    setIsLoading(false);
  }, []);

  const loadWordbook = useCallback((id: string) => {
    const wb = readWordbook(id);
    if (wb) setCurrent(wb);
  }, []);

  const persistSave = useCallback((wb: Wordbook) => {
    setSaveStatus('saving');
    try {
      const entry = writeWordbook(wb);
      setIndex(prev => {
        const next = [...prev];
        const idx = next.findIndex(e => e.id === wb.id);
        if (idx >= 0) next[idx] = entry; else next.push(entry);
        return next;
      });
      localStorage.removeItem(draftKey(wb.id));
      setSaveStatus('saved');
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1500);
    } catch {
      setSaveStatus('error');
    }
  }, []);

  // Auto-save on every edit. localStorage is fast & local, no rate-limiting concern.
  const scheduleAutoSave = useCallback((wb: Wordbook) => {
    try {
      // Persist directly so data is durable even without an explicit Save click.
      writeWordbook(wb);
      // Update index list to reflect new wordCount/name immediately.
      setIndex(readIndex);
      // Clean any stale draft.
      localStorage.removeItem(draftKey(wb.id));
    } catch {
      // Fallback to draft slot on quota error.
      try { localStorage.setItem(draftKey(wb.id), JSON.stringify(wb)); } catch { /* ignore */ }
    }
  }, []);

  const updateCurrent = useCallback((updater: (prev: Wordbook) => Wordbook) => {
    setCurrent(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const createWordbook = useCallback((name: string): Wordbook => {
    const wb: Wordbook = {
      id: generateId(),
      name,
      words: '',
      notes: [{ id: generateId(), name: 'Page 1', content: '' }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    persistSave(wb);
    setCurrent(wb);
    return wb;
  }, [persistSave]);

  const selectWordbook = useCallback((id: string) => {
    loadWordbook(id);
  }, [loadWordbook]);

  const deleteWordbook = useCallback((id: string) => {
    localStorage.removeItem(wordbookKey(id));
    localStorage.removeItem(draftKey(id));
    setIndex(prev => {
      const next = prev.filter(e => e.id !== id);
      writeIndex(next);
      return next;
    });
    setCurrent(prev => (prev?.id === id ? null : prev));
  }, []);

  const renameWordbook = useCallback((name: string) => {
    updateCurrent(prev => ({ ...prev, name, updatedAt: Date.now() }));
  }, [updateCurrent]);

  const updateWords = useCallback((words: string) => {
    updateCurrent(prev => ({ ...prev, words, updatedAt: Date.now() }));
  }, [updateCurrent]);

  const addNotePage = useCallback((name: string) => {
    updateCurrent(prev => ({
      ...prev,
      notes: [...prev.notes, { id: generateId(), name, content: '' }],
      updatedAt: Date.now(),
    }));
  }, [updateCurrent]);

  const updateNotePage = useCallback((pageId: string, content: string) => {
    updateCurrent(prev => ({
      ...prev,
      notes: prev.notes.map(p => p.id === pageId ? { ...p, content } : p),
      updatedAt: Date.now(),
    }));
  }, [updateCurrent]);

  const renameNotePage = useCallback((pageId: string, name: string) => {
    updateCurrent(prev => ({
      ...prev,
      notes: prev.notes.map(p => p.id === pageId ? { ...p, name } : p),
      updatedAt: Date.now(),
    }));
  }, [updateCurrent]);

  const deleteNotePage = useCallback((pageId: string) => {
    updateCurrent(prev => ({
      ...prev,
      notes: prev.notes.filter(p => p.id !== pageId),
      updatedAt: Date.now(),
    }));
  }, [updateCurrent]);

  const saveNow = useCallback(() => {
    if (!current) return;
    persistSave(current);
  }, [current, persistSave]);

  // Export all wordbooks as a single JSON blob (download).
  const exportAll = useCallback(() => {
    const idx = readIndex();
    const wordbooks = idx
      .map(e => readWordbook(e.id))
      .filter((w): w is Wordbook => !!w);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      wordbooks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordbooks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Import wordbooks from a JSON file. Merges by id; conflicts overwrite local.
  const importAll = useCallback(async (file: File): Promise<{ imported: number; total: number }> => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list: Wordbook[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.wordbooks)
        ? parsed.wordbooks
        : [];
    let imported = 0;
    for (const wb of list) {
      if (!wb || typeof wb.id !== 'string' || typeof wb.name !== 'string') continue;
      const sane: Wordbook = {
        id: wb.id,
        name: wb.name,
        words: typeof wb.words === 'string' ? wb.words : '',
        notes: Array.isArray(wb.notes) ? wb.notes : [],
        createdAt: typeof wb.createdAt === 'number' ? wb.createdAt : Date.now(),
        updatedAt: typeof wb.updatedAt === 'number' ? wb.updatedAt : Date.now(),
      };
      writeWordbook(sane);
      imported++;
    }
    setIndex(readIndex());
    if (imported > 0 && !current) {
      const first = readIndex()[0];
      if (first) {
        const wb = readWordbook(first.id);
        if (wb) setCurrent(wb);
      }
    }
    return { imported, total: list.length };
  }, [current]);

  return {
    index,
    current,
    saveStatus,
    isLoading,
    createWordbook,
    selectWordbook,
    deleteWordbook,
    renameWordbook,
    updateWords,
    addNotePage,
    updateNotePage,
    renameNotePage,
    deleteNotePage,
    saveNow,
    exportAll,
    importAll,
  };
}
