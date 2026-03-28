'use server';

import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function getSeoSettings() {
  const session = await verifySession();
  if (!session) return { error: 'Brak autoryzacji' };

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
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.siteSettings.upsert({
    where: { key: 'globalSeo' },
    update: { value: data as object },
    create: { key: 'globalSeo', value: data as object },
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
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.seoSettings.upsert({
    where: { pageId },
    update: data,
    create: { pageId, ...data },
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
  if (!session) return { error: 'Brak autoryzacji' };

  await prisma.siteSettings.upsert({
    where: { key: 'llmsTxt' },
    update: { value: { content } as object },
    create: { key: 'llmsTxt', value: { content } as object },
  });

  return { success: true };
}
