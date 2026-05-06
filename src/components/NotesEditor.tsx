import { useState, useCallback, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { Plus, Eye, Edit3, Check, X } from 'lucide-react';
import type { NotebookPage } from '../types';

interface Props {
  pages: NotebookPage[];
  onAddPage: (name: string) => void;
  onUpdatePage: (pageId: string, content: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onDeletePage: (pageId: string) => void;
}

export default function NotesEditor({
  pages,
  onAddPage,
  onUpdatePage,
  onRenamePage,
  onDeletePage,
}: Props) {
  const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id ?? null);
  const [previewMode, setPreviewMode] = useState(false);
  const [addingPage, setAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const prevLenRef = useRef(pages.length);

  useEffect(() => {
    if (pages.length > prevLenRef.current) {
      // A page was added — select the newest (last) one
      setActivePageId(pages[pages.length - 1].id);
    } else if (!pages.find(p => p.id === activePageId)) {
      // Current page was deleted — fall back to first
      setActivePageId(pages[0]?.id ?? null);
    }
    prevLenRef.current = pages.length;
  }, [pages, activePageId]);

  const activePage = pages.find(p => p.id === activePageId) ?? pages[0] ?? null;

  const submitAddPage = useCallback(() => {
    const name = newPageName.trim() || `Page ${pages.length + 1}`;
    onAddPage(name);
    setNewPageName('');
    setAddingPage(false);
  }, [newPageName, pages.length, onAddPage]);

  return (
    <div className="flex flex-col h-full">
      {/* Page tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 overflow-x-auto flex-shrink-0 bg-gray-50">
        {pages.map(page => (
          <div key={page.id} className="flex-shrink-0 group relative">
            {renamingId === page.id ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onRenamePage(page.id, renameValue.trim() || page.name); setRenamingId(null); }
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="text-[10px] font-bold border-b-2 border-black outline-none bg-transparent w-20"
                />
                <button onClick={() => { onRenamePage(page.id, renameValue.trim() || page.name); setRenamingId(null); }}><Check className="w-2.5 h-2.5" /></button>
                <button onClick={() => setRenamingId(null)}><X className="w-2.5 h-2.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => setActivePageId(page.id)}
                onDoubleClick={() => { setRenamingId(page.id); setRenameValue(page.name); }}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activePageId === page.id
                    ? 'bg-white border-b-2 border-black text-black'
                    : 'text-gray-500 hover:text-black hover:bg-white'
                }`}
              >
                {page.name}
              </button>
            )}
            {confirmDeleteId === page.id ? (
              <div className="absolute top-1 right-0 flex gap-0.5 z-10 bg-white border border-gray-300 rounded shadow p-0.5">
                <button onClick={() => { onDeletePage(page.id); setConfirmDeleteId(null); if (activePageId === page.id) setActivePageId(pages[0]?.id ?? null); }} className="p-0.5 text-red-600"><Check className="w-2.5 h-2.5" /></button>
                <button onClick={() => setConfirmDeleteId(null)} className="p-0.5"><X className="w-2.5 h-2.5" /></button>
              </div>
            ) : pages.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); setConfirmDeleteId(page.id); }}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-3.5 h-3.5 bg-gray-300 rounded-full flex items-center justify-center transition-opacity hover:bg-red-500 hover:text-white"
              >
                <X className="w-2 h-2" />
              </button>
            )}
          </div>
        ))}

        {addingPage ? (
          <div className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
            <input
              autoFocus
              value={newPageName}
              onChange={e => setNewPageName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAddPage(); if (e.key === 'Escape') setAddingPage(false); }}
              placeholder={`Page ${pages.length + 1}`}
              className="text-[10px] font-bold border-b-2 border-black outline-none bg-transparent w-20"
            />
            <button onClick={submitAddPage}><Check className="w-2.5 h-2.5" /></button>
            <button onClick={() => setAddingPage(false)}><X className="w-2.5 h-2.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => setAddingPage(true)}
            className="flex-shrink-0 px-2 py-2 text-gray-400 hover:text-black transition-colors"
            title="Add page"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="ml-auto flex-shrink-0 px-2 flex items-center gap-1">
          <button
            onClick={() => setPreviewMode(false)}
            className={`p-1 transition-colors ${!previewMode ? 'text-black' : 'text-gray-400 hover:text-black'}`}
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className={`p-1 transition-colors ${previewMode ? 'text-black' : 'text-gray-400 hover:text-black'}`}
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      {activePage ? (
        previewMode ? (
          <div
            className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: marked(activePage.content || '*Empty page*') as string }}
          />
        ) : (
          <textarea
            value={activePage.content}
            onChange={e => onUpdatePage(activePage.id, e.target.value)}
            placeholder="Write your notes here... Markdown supported."
            className="flex-1 w-full resize-none font-mono text-xs p-4 outline-none border-0 bg-white focus:ring-0"
            style={{ minHeight: 0 }}
          />
        )
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
          No pages — click + to add one
        </div>
      )}
    </div>
  );
}
