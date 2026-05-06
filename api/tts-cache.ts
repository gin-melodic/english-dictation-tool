import type { Request, Response } from 'express';
import { blobHead, blobGetBinaryUrl, blobPutBinary } from '../server/blob';

const ttsCachePath = (key: string) => `tts-cache/${key}.wav`;

export async function handleHead(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const exists = await blobHead(ttsCachePath(key));
    res.status(exists ? 200 : 404).end();
  } catch (e) {
    res.status(500).end();
  }
}

export async function handleGet(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const url = await blobGetBinaryUrl(ttsCachePath(key));
    if (!url) {
      res.status(404).end();
      return;
    }
    res.redirect(url);
  } catch (e) {
    res.status(500).end();
  }
}

export async function handlePut(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buf = Buffer.concat(chunks);
        const url = await blobPutBinary(ttsCachePath(key), buf, 'audio/wav');
        res.json({ ok: true, url });
      } catch (e) {
        res.status(500).json({ error: String(e) });
      }
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
