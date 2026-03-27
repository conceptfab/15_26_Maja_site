import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hommm.pl';

  // Pobierz dodatkowe reguły AI z SiteSettings
  let aiRules: { userAgent: string; allow: string[] }[] = [];
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: 'globalSeo' },
    });
    const data = setting?.value as { aiRobotsRules?: string } | null;
    if (data?.aiRobotsRules) {
      // Parsuj reguły z formatu tekstowego
      const lines = data.aiRobotsRules.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
      let currentAgent = '';
      for (const line of lines) {
        const agentMatch = line.match(/^User-agent:\s*(.+)/i);
        const allowMatch = line.match(/^Allow:\s*(.+)/i);
        if (agentMatch) {
          currentAgent = agentMatch[1].trim();
        } else if (allowMatch && currentAgent) {
          aiRules.push({ userAgent: currentAgent, allow: [allowMatch[1].trim()] });
          currentAgent = '';
        }
      }
    }
  } catch {
    // Domyślne reguły jeśli DB niedostępna
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      ...aiRules,
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
