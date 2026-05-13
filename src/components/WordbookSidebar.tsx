import { useState, useRef } from 'react';
import { Plus, Trash2, BookOpen, Check, X, Download, Upload } from 'lucide-react';
import type { WordbookIndexEntry } from '../types';

interface Props {
  index: WordbookIndexEntry[];
  currentId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onExport?: () => void;
  onImport?: (file: File) => Promise<{ imported: number; total: number }>;
}

export default function WordbookSidebar({
  index,
  currentId,
  isLoading,
  onSelect,
  onCreate,
  onDelete,
  onExport,
  onImport,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    e.target.value = '';
    try {
      const { imported, total } = await onImport(file);
      setImportMsg(`Imported ${imported}/${total}`);
      setTimeout(() => setImportMsg(null), 3000);
    } catch (err) {
      setImportMsg(`Error: ${err}`);
      setTimeout(() => setImportMsg(null), 4000);
    }
  }

  function submitCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setCreating(false);
  }

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="bg-black text-white px-1.5 py-0.5 text-[9px] font-bold">WB</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Wordbooks</span>
        </div>
        <button
          onClick={() => { setCreating(true); setNewName(''); }}
          className="p-1 hover:bg-black hover:text-white transition-colors border border-black"
          title="New wordbook"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {creating && (
        <div className="p-2 border-b border-gray-100 flex gap-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitCreate(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="Name..."
            className="flex-1 text-xs border-2 border-black px-2 py-1 outline-none font-mono"
          />
          <button onClick={submitCreate} className="p-1 bg-black text-white hover:bg-gray-800"><Check className="w-3 h-3" /></button>
          <button onClick={() => setCreating(false)} className="p-1 border-2 border-black hover:bg-gray-100"><X className="w-3 h-3" /></button>
        </div>
      )}

      {importMsg && (
        <div className="px-3 py-1.5 text-[10px] font-bold bg-green-50 text-green-700 border-b border-green-200">{importMsg}</div>
      )}

      <ul className="flex-1 overflow-y-auto">
        {isLoading && (
          <li className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading…</li>
        )}
        {!isLoading && index.length === 0 && (
          <li className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">No wordbooks yet</li>
        )}
        {index.map(entry => (
          <li key={entry.id} className="group">
            <div
              className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                currentId === entry.id ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(entry.id)}
            >
              <BookOpen className="w-3 h-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate">{entry.name}</div>
                <div className={`text-[9px] font-medium ${currentId === entry.id ? 'text-gray-300' : 'text-gray-400'}`}>
                  {entry.wordCount} words
                </div>
              </div>
              {confirmDelete === entry.id ? (
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { onDelete(entry.id); setConfirmDelete(null); }}
                    className="p-0.5 bg-red-600 text-white rounded"
                  ><Check className="w-2.5 h-2.5" /></button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="p-0.5 border border-current rounded"
                  ><X className="w-2.5 h-2.5" /></button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(entry.id); }}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                    currentId === entry.id ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {(onExport || onImport) && (
        <div className="flex border-t border-gray-100">
          {onExport && (
            <button
              onClick={onExport}
              title="Export all wordbooks as JSON"
              className="flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors text-gray-500 hover:text-black"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          )}
          {onImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import wordbooks from JSON"
                className="flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors text-gray-500 hover:text-black border-l border-gray-100"
              >
                <Upload className="w-3 h-3" />
                Import
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
