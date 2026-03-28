'use server';

import sharp from 'sharp';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { uploadToBlob, deleteFromBlob } from '@/lib/uploads';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const THUMB_WIDTH = 400;
const MOBILE_WIDTH = 800;
const WEBP_QUALITY = 82;
const MOBILE_QUALITY = 80;

// ── Upload ──────────────────────────────────────────────

export async function uploadImage(formData: FormData) {
  try {
    const session = await verifySession();
    if (!session) return { error: 'Brak autoryzacji' };

    const file = formData.get('file') as File | null;
    const sectionId = (formData.get('sectionId') as string) || null;

    if (!file) return { error: 'Brak pliku' };
    if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Niedozwolony format pliku' };
    if (file.size > MAX_FILE_SIZE) return { error: 'Plik za duży (max 10 MB)' };

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomBytes(8).toString('hex');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const originalName = `${id}_original.${ext}`;
    const originalUrl = await uploadToBlob(originalName, buffer, file.type);

    const webpBuffer = await sharp(buffer).webp({ quality: WEBP_QUALITY }).toBuffer();
    const webpUrl = await uploadToBlob(`${id}.webp`, webpBuffer, 'image/webp');

    const mobileBuffer = await sharp(buffer)
      .resize(MOBILE_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: MOBILE_QUALITY })
      .toBuffer();
    const mobileUrl = await uploadToBlob(`${id}_mobile.webp`, mobileBuffer, 'image/webp');

    const thumbBuffer = await sharp(buffer)
      .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const thumbUrl = await uploadToBlob(`${id}_thumb.webp`, thumbBuffer, 'image/webp');

    const maxOrder = await prisma.galleryImage.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const image = await prisma.galleryImage.create({
      data: { originalUrl, webpUrl, mobileUrl, thumbUrl, sectionId, order: nextOrder },
    });

    return { success: true, image };
  } catch (err) {
    console.error('[uploadImage]', err);
    return { error: err instanceof Error ? err.message : 'Nieznany błąd' };
  }
}

// ── Delete ──────────────────────────────────────────────

export async function deleteImage(id: string) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) return { error: 'Obraz nie znaleziony' };

  const urls = [image.originalUrl, image.webpUrl, image.mobileUrl, image.thumbUrl].filter(Boolean) as string[];
  await Promise.all(urls.map((url) => deleteFromBlob(url).catch(() => {})));

  await prisma.galleryImage.delete({ where: { id } });

  return { success: true };
}

// ── Reorder ─────────────────────────────────────────────

export async function updateImageOrder(ids: string[]) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.galleryImage.update({ where: { id }, data: { order: index } }),
    ),
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

  await prisma.galleryImage.update({ where: { id }, data: { altPl, altEn } });

  return { success: true };
}

// ── Update caption ──────────────────────────────────────

export async function updateImageCaption(
  id: string,
  captionPl: string | null,
  captionEn: string | null,
) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.galleryImage.update({ where: { id }, data: { captionPl, captionEn } });

  return { success: true };
}

// ── Update section ──────────────────────────────────────

export async function updateImageSection(id: string, sectionId: string | null) {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.galleryImage.update({ where: { id }, data: { sectionId } });

  return { success: true };
}

// ── Get all images ──────────────────────────────────────

export async function getGalleryImages() {
  return prisma.galleryImage.findMany({
    orderBy: { order: 'asc' },
    include: { section: { select: { slug: true, titlePl: true } } },
  });
}

// ── Get images for section ──────────────────────────────

export async function getImagesForSection(sectionId: string) {
  return prisma.galleryImage.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      webpUrl: true,
      thumbUrl: true,
      altPl: true,
      altEn: true,
      captionPl: true,
      captionEn: true,
      order: true,
    },
  });
}

/** Zwraca listę miniaturek do pickera obrazków */
export async function getGalleryThumbs() {
  return prisma.galleryImage.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, webpUrl: true, thumbUrl: true, altPl: true },
  });
}
