export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getContent } from '@/actions/content';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SECTION_ICONS } from '@/lib/section-icons';

function getPreviewText(content: unknown): string {
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>;
    for (const key of ['body', 'heading', 'subheading', 'intro', 'email']) {
      if (typeof obj[key] === 'string' && obj[key]) {
        const text = obj[key] as string;
        return text.length > 120 ? text.slice(0, 120) + '...' : text;
      }
    }
  }
  return '—';
}

export default async function ContentListPage() {
  const sections = await getContent();

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Treści strony</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edytuj teksty, nagłówki i treści sekcji w PL i ENG
            </p>
          </div>
          <Badge variant="outline">{sections.length} sekcji</Badge>
        </div>

        <div className="grid gap-4">
          {sections.map((section) => {
            const contentPl = section.contentPl as Record<string, unknown> | null;
            const previewPl = getPreviewText(contentPl);

            return (
              <Link
                key={section.id}
                href={`/admin/content/${section.slug}`}
                className="block group"
              >
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="text-2xl shrink-0 mt-0.5">
                      {SECTION_ICONS[section.slug] ?? '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {section.titlePl || section.slug}
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground">
                          /{section.slug}
                        </span>
                        <Badge
                          variant={section.isVisible ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {section.isVisible ? 'Widoczna' : 'Ukryta'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {previewPl}
                      </p>
                    </div>
                    <div className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0">
                      →
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {sections.length === 0 && (
            <Card>
              <CardContent className="text-center text-muted-foreground py-12">
                Brak sekcji. Uruchom <code className="font-mono text-xs">npm run db:seed</code>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
