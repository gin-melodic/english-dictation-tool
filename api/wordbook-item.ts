import type { Request, Response } from 'express';
import { blobGetJson, blobPutJson, blobDelete } from '../server/blob';
import type { Wordbook, WordbookIndexEntry } from '../src/types';

const INDEX_PATH = 'wordbooks/index.json';
const wordbookPath = (id: string) => `wordbooks/${id}.json`;

async function getIndex(): Promise<WordbookIndexEntry[]> {
  return (await blobGetJson<WordbookIndexEntry[]>(INDEX_PATH)) ?? [];
}

async function saveIndex(index: WordbookIndexEntry[]): Promise<void> {
  await blobPutJson(INDEX_PATH, index);
}

export async function handleGetOne(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const wb = await blobGetJson<Wordbook>(wordbookPath(id));
    if (!wb) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(wb);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

export async function handleDelete(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await blobDelete(wordbookPath(id));

    const index = await getIndex();
    const updated = index.filter(e => e.id !== id);
    await saveIndex(updated);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
