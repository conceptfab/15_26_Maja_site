'use server';

import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs/promises';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { ensureUploadDirs, filePath, fileUrl } from '@/lib/uploads';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const THUMB_WIDTH = 400;
const WEBP_QUALITY = 82;

// ── Upload ──────────────────────────────────────────────

export async function uploadImage(formData: FormData) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const file = formData.get('file') as File | null;
  const sectionId = (formData.get('sectionId') as string) || null;

  if (!file) return { error: 'Brak pliku' };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Niedozwolony format pliku' };
  if (file.size > MAX_FILE_SIZE) return { error: 'Plik za duży (max 10 MB)' };

  await ensureUploadDirs();

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomBytes(8).toString('hex');

  // Original (zachowaj format)
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const originalName = `${id}_original.${ext}`;
  await fs.writeFile(filePath(originalName), buffer);

  // WebP (zoptymalizowany)
  const webpName = `${id}.webp`;
  await sharp(buffer)
    .webp({ quality: WEBP_QUALITY })
    .toFile(filePath(webpName));

  // Thumbnail (WebP, 400px szerokości)
  const thumbName = `${id}_thumb.webp`;
  await sharp(buffer)
    .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(filePath(thumbName));

  // Następny order
  const maxOrder = await prisma.galleryImage.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const image = await prisma.galleryImage.create({
    data: {
      originalUrl: fileUrl(originalName),
      webpUrl: fileUrl(webpName),
      thumbUrl: fileUrl(thumbName),
      sectionId,
      order: nextOrder,
    },
  });

  return { success: true, image };
}

// ── Delete ──────────────────────────────────────────────

export async function deleteImage(id: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) return { error: 'Obraz nie znaleziony' };

  // Usuń pliki z dysku
  const urls = [image.originalUrl, image.webpUrl, image.thumbUrl].filter(Boolean);
  for (const url of urls) {
    const filename = url!.split('/').pop();
    if (filename) {
      await fs.unlink(filePath(filename)).catch(() => {});
    }
  }

  await prisma.galleryImage.delete({ where: { id } });

  return { success: true };
}

// ── Reorder ─────────────────────────────────────────────

export async function updateImageOrder(ids: string[]) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.galleryImage.update({ where: { id }, data: { order: index } })
    )
  );

  return { success: true };
}

// ── Update alt text ─────────────────────────────────────

export async function updateImageAlt(
  id: string,
  altPl: string | null,
  altEn: string | null,
) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.galleryImage.update({
    where: { id },
    data: { altPl, altEn },
  });

  return { success: true };
}

// ── Update section ──────────────────────────────────────

export async function updateImageSection(id: string, sectionId: string | null) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.galleryImage.update({
    where: { id },
    data: { sectionId },
  });

  return { success: true };
}

// ── Get all images ──────────────────────────────────────

export async function getGalleryImages() {
  return prisma.galleryImage.findMany({
    orderBy: { order: 'asc' },
    include: { section: { select: { slug: true, titlePl: true } } },
  });
}
