export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getContent } from '@/actions/content';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SECTION_ICONS } from '@/lib/section-icons';
import { Map, File } from 'lucide-react';

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
          {/* Statyczny wpis dla widoku MIEJSCA */}
          <Link href="/admin/content/miejsca" className="block group">
            <Card className="transition-colors hover:border-primary/50 border-dashed">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  <Map className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">MIEJSCA</h3>
                    <span className="text-xs font-mono text-muted-foreground">/admin/content/miejsca</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Widok menu</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    Tytuł, opisy i galeria widoku po kliknięciu "MIEJSCA" w nawigacji
                  </p>
                </div>
                <div className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0">→</div>
              </CardContent>
            </Card>
          </Link>

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
                    <div className="shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      {(() => { const Icon = SECTION_ICONS[section.slug]; return Icon ? <Icon className="w-4 h-4" /> : <File className="w-4 h-4" />; })()}
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
