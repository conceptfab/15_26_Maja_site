'use server';

import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import { z } from 'zod';

// Dozwolone tagi w customHeadTags (meta, link, script z src)
function sanitizeHeadTags(raw: string): string {
  if (!raw) return '';
  // Usuń tagi inne niż meta, link, script[src]
  return raw.replace(/<(?!\/?(?:meta|link)\b)[^>]*>/gi, '');
}

const globalSeoSchema = z.object({
  defaultTitlePl: z.string().max(200),
  defaultTitleEn: z.string().max(200),
  defaultDescriptionPl: z.string().max(500),
  defaultDescriptionEn: z.string().max(500),
  ogImageUrl: z.string().max(500).refine((v) => !v || v.startsWith('https://') || v.startsWith('/'), 'URL musi zaczynać się od https:// lub /'),
  customHeadTags: z.string().max(5000).transform(sanitizeHeadTags),
  aiRobotsRules: z.string().max(5000),
});

const pageSeoSchema = z.object({
  titlePl: z.string().max(200).optional(),
  titleEn: z.string().max(200).optional(),
  descriptionPl: z.string().max(500).optional(),
  descriptionEn: z.string().max(500).optional(),
  ogImageUrl: z.string().max(500).refine((v) => !v || v.startsWith('https://') || v.startsWith('/'), 'URL musi zaczynać się od https:// lub /').optional(),
  customHeadTags: z.string().max(5000).transform(sanitizeHeadTags).optional(),
});

export async function getSeoSettings() {
  const session = await verifySession();
  if (!session) return unauthorized();

  const pages = await prisma.page.findMany({
    orderBy: { order: 'asc' },
    include: { seo: true },
  });

  return pages.map((page) => ({
    pageId: page.id,
    pageTitle: page.title,
    pageSlug: page.slug,
    seo: page.seo,
  }));
}

export async function getGlobalSeo() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: 'globalSeo' },
  });

  return (setting?.value as GlobalSeoData | null) ?? {
    defaultTitlePl: 'HOMMM — Domek w naturze',
    defaultTitleEn: 'HOMMM — Cabin in nature',
    defaultDescriptionPl: 'Domek na wyłączność w sercu natury. Cisza, prywatność, wypoczynek.',
    defaultDescriptionEn: 'Private cabin in the heart of nature. Silence, privacy, relaxation.',
    ogImageUrl: '',
    customHeadTags: '',
    aiRobotsRules: `User-agent: GPTBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: anthropic-ai\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Applebot-Extended\nAllow: /`,
  };
}

export type GlobalSeoData = {
  defaultTitlePl: string;
  defaultTitleEn: string;
  defaultDescriptionPl: string;
  defaultDescriptionEn: string;
  ogImageUrl: string;
  customHeadTags: string;
  aiRobotsRules: string;
};

export async function updateGlobalSeo(data: GlobalSeoData) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const parsed = globalSeoSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  await prisma.siteSettings.upsert({
    where: { key: 'globalSeo' },
    update: { value: parsed.data as object },
    create: { key: 'globalSeo', value: parsed.data as object },
  });

  return { success: true };
}

export type PageSeoData = {
  titlePl?: string;
  titleEn?: string;
  descriptionPl?: string;
  descriptionEn?: string;
  ogImageUrl?: string;
  customHeadTags?: string;
};

export async function updatePageSeo(pageId: string, data: PageSeoData) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const parsed = pageSeoSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  await prisma.seoSettings.upsert({
    where: { pageId },
    update: parsed.data,
    create: { pageId, ...parsed.data },
  });

  return { success: true };
}

export async function getLlmsTxtContent() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: 'llmsTxt' },
  });

  return (setting?.value as { content: string } | null)?.content ?? '';
}

export async function updateLlmsTxt(content: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  if (typeof content !== 'string' || content.length > 50000) {
    return { error: 'Treść nie może przekraczać 50 000 znaków' };
  }

  await prisma.siteSettings.upsert({
    where: { key: 'llmsTxt' },
    update: { value: { content } as object },
    create: { key: 'llmsTxt', value: { content } as object },
  });

  return { success: true };
}
