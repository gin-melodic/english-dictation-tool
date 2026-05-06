import type { Request, Response } from 'express';
import {
  blobGetJson,
  blobPutJson,
} from '../server/blob';
import type { Wordbook, WordbookIndexEntry } from '../src/types';
import { parseInput } from '../src/utils/helpers';

const INDEX_PATH = 'wordbooks/index.json';
const wordbookPath = (id: string) => `wordbooks/${id}.json`;

async function getIndex(): Promise<WordbookIndexEntry[]> {
  return (await blobGetJson<WordbookIndexEntry[]>(INDEX_PATH)) ?? [];
}

async function saveIndex(index: WordbookIndexEntry[]): Promise<void> {
  await blobPutJson(INDEX_PATH, index);
}

export async function handleGet(_req: Request, res: Response) {
  try {
    const index = await getIndex();
    res.json(index);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

export async function handlePost(req: Request, res: Response) {
  try {
    const body = req.body as Wordbook;
    if (!body.id || !body.name) {
      res.status(400).json({ error: 'id and name are required' });
      return;
    }

    body.updatedAt = Date.now();
    if (!body.createdAt) body.createdAt = body.updatedAt;
    if (!body.notes) body.notes = [];

    await blobPutJson(wordbookPath(body.id), body);

    const index = await getIndex();
    const wordCount = parseInput(body.words ?? '').length;
    const existing = index.findIndex(e => e.id === body.id);
    const entry: WordbookIndexEntry = {
      id: body.id,
      name: body.name,
      wordCount,
      updatedAt: body.updatedAt,
    };
    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index.push(entry);
    }
    await saveIndex(index);

    res.json({ ok: true, entry });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
