import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClientProviders } from '@/components/ClientProviders';
import { JsonLd } from '@/components/JsonLd';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { Analytics } from '@vercel/analytics/react';

const getGlobalSeo = cache(async () => {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: 'globalSeo' } });
    return (setting?.value ?? {}) as { defaultTitlePl?: string; defaultDescriptionPl?: string; ogImageUrl?: string };
  } catch {
    return {};
  }
});
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hommm.pl';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getGlobalSeo();

  const title = seo.defaultTitlePl || 'HOMMM — Domek w naturze';
  const description = seo.defaultDescriptionPl || 'Domek na wyłączność w sercu natury. Cisza, prywatność, wypoczynek.';

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: 'HOMMM',
      type: 'website',
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl, width: 1200, height: 630 }] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { other: { 'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={cn("font-sans", geist.variable)}>
      <head>
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://p.typekit.net"
          crossOrigin="anonymous"
        />
        {/* Preload hero image — LCP optimization (eliminates render delay) */}
        <link
          rel="preload"
          as="image"
          type="image/webp"
          href="/assets/hero.webp"
          fetchPriority="high"
        />
        {/* TypeKit — async load to avoid render-blocking (~670ms saving) */}
        <link
          rel="preload"
          href="https://use.typekit.net/zpt0osi.css"
          as="style"
        />
        <link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
      </head>
      <body>
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Przejdź do treści
        </a>
        <main id="main-content">
          <ClientProviders>
            {children}
          </ClientProviders>
        </main>
        <JsonLd />
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </body>
    </html>
  );
}
