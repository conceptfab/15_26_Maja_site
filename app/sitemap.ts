import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hommm.pl';

  const pages = await prisma.page.findMany({
    where: { isVisible: true },
    select: { slug: true, updatedAt: true, isHome: true },
    orderBy: { order: 'asc' },
  });

  const entries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: page.isHome ? baseUrl : `${baseUrl}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: page.isHome ? 'weekly' : 'monthly',
    priority: page.isHome ? 1.0 : 0.7,
  }));

  return entries;
}
