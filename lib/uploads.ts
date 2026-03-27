import path from 'path';
import fs from 'fs/promises';

// Katalog uploads — Railway Volume mount lub lokalnie
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
export const GALLERY_DIR = path.join(UPLOAD_ROOT, 'gallery');

/** Upewnij się, że katalogi istnieją */
export async function ensureUploadDirs() {
  await fs.mkdir(GALLERY_DIR, { recursive: true });
}

/** Ścieżka pliku na dysku */
export function filePath(filename: string) {
  return path.join(GALLERY_DIR, filename);
}

/** URL publiczny do pliku */
export function fileUrl(filename: string) {
  return `/api/uploads/gallery/${filename}`;
}
