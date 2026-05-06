import { put, del, list } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;

export async function blobPutJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    token: TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function blobGetJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await list({ prefix: pathname, token: TOKEN });
    const blob = result.blobs.find(b => b.pathname === pathname);
    if (!blob) return null;
    const url = blob.downloadUrl || blob.url;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function blobPutBinary(
  pathname: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const blob = await put(pathname, data, {
    access: 'public',
    contentType,
    token: TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function blobHead(pathname: string): Promise<boolean> {
  try {
    const result = await list({ prefix: pathname, limit: 10, token: TOKEN });
    return result.blobs.some(b => b.pathname === pathname);
  } catch {
    return false;
  }
}

export async function blobGetBinaryUrl(pathname: string): Promise<string | null> {
  try {
    const result = await list({ prefix: pathname, limit: 10, token: TOKEN });
    const blob = result.blobs.find(b => b.pathname === pathname);
    return blob ? (blob.downloadUrl || blob.url) : null;
  } catch {
    return null;
  }
}

export async function blobDelete(pathname: string): Promise<void> {
  try {
    const result = await list({ prefix: pathname, token: TOKEN });
    await Promise.all(result.blobs.map(b => del(b.url, { token: TOKEN })));
  } catch {
    // ignore
  }
}
