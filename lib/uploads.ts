import { put, del } from '@vercel/blob';

/** Wgrywa bufor do Vercel Blob i zwraca publiczny URL */
export async function uploadToBlob(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { url } = await put(`gallery/${filename}`, buffer, {
    access: 'public',
    contentType,
  });
  return url;
}

/** Usuwa plik z Vercel Blob na podstawie URL */
export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}
