import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.avif': 'image/avif',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;

  // Zabezpieczenie przed path traversal
  if (segments.some((s) => s.includes('..') || s.includes('\0'))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = path.join(UPLOAD_ROOT, ...segments);

  // Sprawdź, czy plik jest w UPLOAD_ROOT
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const buffer = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
