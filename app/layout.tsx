import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClientProviders } from '@/components/ClientProviders';
import { JsonLd } from '@/components/JsonLd';
import { prisma } from '@/lib/db';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hommm.pl';

export async function generateMetadata(): Promise<Metadata> {
  let seo: { defaultTitlePl?: string; defaultDescriptionPl?: string; ogImageUrl?: string } = {};
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: 'globalSeo' } });
    if (setting?.value) seo = setting.value as typeof seo;
  } catch {
    // fallback na domyślne
  }

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
    other: {
      'google-site-verification': '',
    },
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
        <link rel="stylesheet" href="https://use.typekit.net/zpt0osi.css" />
      </head>
      <body>
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Przejdź do treści
        </a>
        <div id="main-content">
          <ClientProviders>
            {children}
          </ClientProviders>
        </div>
        <JsonLd />
      </body>
    </html>
  );
}
