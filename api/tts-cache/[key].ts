import { blobHead, blobGetBinaryUrl, blobPutBinary } from '../../server/blob.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ttsCachePath = (key: string) => `tts-cache/${key}.wav`;

export async function handleHead(req: any, res: any) {
  try {
    const key = (req.params?.key ?? req.query?.key) as string;
    const exists = await blobHead(ttsCachePath(key));
    res.status(exists ? 200 : 404).end();
  } catch (e) {
    res.status(500).end();
  }
}

export async function handleGet(req: any, res: any) {
  try {
    const key = (req.params?.key ?? req.query?.key) as string;
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

export async function handlePut(req: any, res: any) {
  try {
    const key = (req.params?.key ?? req.query?.key) as string;
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

export default async function handler(req: any, res: any) {
  if (req.method === 'HEAD') return handleHead(req, res);
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'PUT') return handlePut(req, res);
  res.status(405).end();
}
