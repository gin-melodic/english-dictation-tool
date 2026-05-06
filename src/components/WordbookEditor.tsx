import { useState, useMemo } from 'react';
import { Trash2, Edit3, Check, X, Save } from 'lucide-react';
import type { Wordbook, WordEntry } from '../types';
import { parseInput } from '../utils/helpers';
import WordPreviewList from './WordPreviewList';
import NotesEditor from './NotesEditor';

interface Props {
  wordbook: Wordbook;
  onUpdateWords: (words: string) => void;
  onRename: (name: string) => void;
  onAddNotePage: (name: string) => void;
  onUpdateNotePage: (pageId: string, content: string) => void;
  onRenameNotePage: (pageId: string, name: string) => void;
  onDeleteNotePage: (pageId: string) => void;
  onSpeak: (text: string) => void;
  onCancelSpeech: () => void;
  onSave: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export default function WordbookEditor({
  wordbook,
  onUpdateWords,
  onRename,
  onAddNotePage,
  onUpdateNotePage,
  onRenameNotePage,
  onDeleteNotePage,
  onSpeak,
  onCancelSpeech,
  onSave,
  saveStatus,
}: Props) {
  const [activeTab, setActiveTab] = useState<'words' | 'notes'>('words');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const parsedWords: WordEntry[] = useMemo(() => parseInput(wordbook.words), [wordbook.words]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
        {renaming ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(renameValue.trim() || wordbook.name); setRenaming(false); }
                if (e.key === 'Escape') setRenaming(false);
              }}
              className="flex-1 text-sm font-black border-b-2 border-black outline-none bg-transparent uppercase tracking-tight"
            />
            <button onClick={() => { onRename(renameValue.trim() || wordbook.name); setRenaming(false); }}><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setRenaming(false)}><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <>
            <h2 className="flex-1 text-sm font-black uppercase tracking-tight truncate">{wordbook.name}</h2>
            <button
              onClick={onSave}
              title="Save now"
              className={`flex items-center gap-1 px-2 py-1 border-2 text-[9px] font-black uppercase tracking-wider transition-colors ${
                saveStatus === 'saving' ? 'border-gray-400 text-gray-400 cursor-wait' :
                saveStatus === 'saved' ? 'border-green-600 text-green-600' :
                saveStatus === 'error' ? 'border-red-600 text-red-600' :
                'border-black text-black hover:bg-black hover:text-white'
              }`}
            >
              <Save className="w-3 h-3" />
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
            </button>
            <button
              onClick={() => { setRenaming(true); setRenameValue(wordbook.name); }}
              className="p-1 text-gray-400 hover:text-black transition-colors"
              title="Rename wordbook"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(['words', 'notes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-black text-black'
                : 'text-gray-400 hover:text-black'
            }`}
          >
            {tab === 'words' ? `Words (${parsedWords.length})` : 'Notes'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'words' ? (
          <div className="flex flex-col h-full">
            <div className="relative flex-1 min-h-0 flex flex-col">
              <textarea
                value={wordbook.words}
                onChange={e => onUpdateWords(e.target.value)}
                placeholder={"Example:\nApple - 苹果\nBanana - バナナ\nCat - 고양이"}
                className="flex-1 w-full resize-none font-mono text-xs p-4 outline-none border-0 bg-white focus:ring-0"
                style={{ minHeight: 0 }}
              />
              {wordbook.words && (
                <button
                  onClick={() => onUpdateWords('')}
                  className="absolute top-3 right-3 p-1.5 bg-black text-white hover:bg-gray-800 active:scale-95 transition-transform"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="px-4 pb-2 border-t border-gray-100 overflow-y-auto max-h-[42vh]">
              <WordPreviewList words={parsedWords} onSpeak={onSpeak} onCancel={onCancelSpeech} />
            </div>
          </div>
        ) : (
          <NotesEditor
            pages={wordbook.notes}
            onAddPage={onAddNotePage}
            onUpdatePage={onUpdateNotePage}
            onRenamePage={onRenameNotePage}
            onDeletePage={onDeleteNotePage}
          />
        )}
      </div>
    </div>
  );
}
