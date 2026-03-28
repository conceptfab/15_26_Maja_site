import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { jsonToRecord } from '@/lib/json-utils';
import Image from 'next/image';
import { cache } from 'react';
import type { Metadata } from 'next';

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string[] }>;
};

const getPageBySlug = cache(async (slugSegments: string[]) => {
  const slug = slugSegments.join('/');

  const page = await prisma.page.findUnique({
    where: { slug },
    include: {
      sections: {
        where: { isVisible: true },
        orderBy: { order: 'asc' },
        include: {
          galleryImages: {
            orderBy: { order: 'asc' },
            select: { webpUrl: true, mobileUrl: true, altPl: true, altEn: true },
          },
        },
      },
      seo: true,
    },
  });

  return page;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || !page.isVisible) {
    return { title: 'Nie znaleziono' };
  }

  return {
    title: page.seo?.titlePl || page.title,
    description: page.seo?.descriptionPl || undefined,
    openGraph: page.seo?.ogImageUrl ? { images: [page.seo.ogImageUrl] } : undefined,
  };
}

export default async function SubPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || !page.isVisible) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{page.title}</h1>

          {page.sections.map((section) => {
            const content = jsonToRecord(section.contentPl);
            return (
              <article
                key={section.id}
                className="mb-12"
                style={{
                  backgroundColor: section.bgColor || undefined,
                  backgroundImage: section.bgImage ? `url(${section.bgImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {section.titlePl && (
                  <h2 className="text-2xl font-semibold mb-4">{section.titlePl}</h2>
                )}

                {content.heading && (
                  <h3 className="text-xl font-medium mb-2">{content.heading}</h3>
                )}

                {content.body && (
                  <div className="prose max-w-none">
                    {content.body.split('\n\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                )}

                {section.galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {section.galleryImages.map((img, i) => (
                      <Image
                        key={i}
                        src={img.mobileUrl || img.webpUrl}
                        alt={img.altPl || ''}
                        width={400}
                        height={300}
                        sizes="(max-width:768px) 50vw, 33vw"
                        className="rounded-lg w-full h-48 object-cover"
                      />
                    ))}
                  </div>
                )}
              </article>
            );
          })}

          {page.sections.length === 0 && (
            <p className="text-muted-foreground">Ta strona nie ma jeszcze treści.</p>
          )}
        </div>
      </section>
    </main>
  );
}
