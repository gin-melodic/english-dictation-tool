import { useState, useEffect, useCallback, useRef } from 'react';
import type { Wordbook, WordbookIndexEntry } from '../types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function generateId(): string {
  return `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function draftKey(id: string) {
  return `wordbook-draft:${id}`;
}


export function useWordbooks() {
  const [index, setIndex] = useState<WordbookIndexEntry[]>([]);
  const [current, setCurrent] = useState<Wordbook | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load index on mount
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/wordbooks');
        if (res.ok) {
          const data: WordbookIndexEntry[] = await res.json();
          setIndex(data);
          if (data.length > 0) {
            await loadWordbook(data[0].id);
          }
        }
      } catch {
        // offline: try localStorage
        const draft = localStorage.getItem('wordbook-index');
        if (draft) {
          try {
            const data = JSON.parse(draft) as WordbookIndexEntry[];
            setIndex(data);
            if (data.length > 0) {
              const localDraft = localStorage.getItem(draftKey(data[0].id));
              if (localDraft) setCurrent(JSON.parse(localDraft));
            }
          } catch { /* ignore */ }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWordbook = useCallback(async (id: string) => {
    // Check localStorage draft first (unsaved changes)
    const localDraft = localStorage.getItem(draftKey(id));
    if (localDraft) {
      try {
        setCurrent(JSON.parse(localDraft));
        return;
      } catch { /* ignore */ }
    }
    try {
      const res = await fetch(`/api/wordbooks/${id}`);
      if (res.ok) {
        const wb: Wordbook = await res.json();
        setCurrent(wb);
      }
    } catch { /* ignore */ }
  }, []);

  const persistSave = useCallback(async (wb: Wordbook) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/wordbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wb),
      });
      if (!res.ok) throw new Error('Save failed');
      const { entry } = await res.json();
      setIndex(prev => {
        const next = [...prev];
        const idx = next.findIndex(e => e.id === wb.id);
        if (idx >= 0) next[idx] = entry;
        else next.push(entry);
        localStorage.setItem('wordbook-index', JSON.stringify(next));
        return next;
      });
      localStorage.removeItem(draftKey(wb.id));
      setSaveStatus('saved');
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const scheduleAutoSave = useCallback((wb: Wordbook) => {
    localStorage.setItem(draftKey(wb.id), JSON.stringify(wb));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persistSave(wb), 1500);
  }, [persistSave]);

  const updateCurrent = useCallback((updater: (prev: Wordbook) => Wordbook) => {
    setCurrent(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const createWordbook = useCallback(async (name: string): Promise<Wordbook> => {
    const wb: Wordbook = {
      id: generateId(),
      name,
      words: '',
      notes: [{ id: generateId(), name: 'Page 1', content: '' }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persistSave(wb);
    setCurrent(wb);
    return wb;
  }, [persistSave]);

  const selectWordbook = useCallback((id: string) => {
    loadWordbook(id);
  }, [loadWordbook]);

  const deleteWordbook = useCallback(async (id: string) => {
    try {
      await fetch(`/api/wordbooks/${id}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    localStorage.removeItem(draftKey(id));
    setIndex(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem('wordbook-index', JSON.stringify(next));
      return next;
    });
    setCurrent(prev => {
      if (prev?.id === id) return null;
      return prev;
    });
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    persistSave(current);
  }, [current, persistSave]);

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
  };
}
