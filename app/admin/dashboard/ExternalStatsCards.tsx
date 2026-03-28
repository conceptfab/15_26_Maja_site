import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ExternalStats, UmamiStats } from '@/lib/external-stats';

function UmamiCard({ umami }: { umami: UmamiStats }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="text-[10px] font-bold bg-foreground text-background px-1 rounded">U</span>
          Umami — ruch (miesiąc)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Odsłony</span>
          <span className="text-sm font-semibold">{umami.pageviews.toLocaleString('pl-PL')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Odwiedzający</span>
          <span className="text-sm font-semibold">{umami.visitors.toLocaleString('pl-PL')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sesje</span>
          <span className="text-sm font-semibold">{umami.visits.toLocaleString('pl-PL')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Aktywni teraz</span>
          <Badge variant={umami.active > 0 ? 'default' : 'secondary'} className="text-[10px]">
            {umami.active}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function bytes(b: number): string {
  if (b === 0) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const STATE_LABELS: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  READY: { label: 'OK', variant: 'default' },
  ERROR: { label: 'Błąd', variant: 'destructive' },
  BUILDING: { label: 'Buduje', variant: 'secondary' },
  CANCELED: { label: 'Anulowany', variant: 'secondary' },
  QUEUED: { label: 'Kolejka', variant: 'secondary' },
};

export function ExternalStatsCards({ stats }: { stats: ExternalStats }) {
  if (!stats.ok) return null;

  const { vercel, neon, umami, missingTokens } = stats;
  const allMissing = !vercel && !neon && !umami;

  if (allMissing) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground">Vercel & Neon — statystyki</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Dodaj do <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">.env</code>:
          </p>
          <div className="font-mono text-xs space-y-1 text-muted-foreground">
            {missingTokens.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="text-destructive">✗</span>
                <span>{t}=...</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Umami */}
      {umami ? (
        <UmamiCard umami={umami} />
      ) : (
        <Card className="border-dashed opacity-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Umami</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Brak: UMAMI_API_KEY</p>
          </CardContent>
        </Card>
      )}

      {/* Vercel */}
      {vercel ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <svg viewBox="0 0 76 65" className="w-3.5 h-3.5 fill-current" aria-hidden>
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
              Vercel — {vercel.projectName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Deployments (miesiąc)</span>
              <span className="text-sm font-semibold">{vercel.deploymentsThisMonth}</span>
            </div>
            {vercel.lastDeployment && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ostatni deploy</span>
                  <Badge
                    variant={STATE_LABELS[vercel.lastDeployment.state]?.variant ?? 'secondary'}
                    className="text-[10px]"
                  >
                    {STATE_LABELS[vercel.lastDeployment.state]?.label ?? vercel.lastDeployment.state}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {vercel.lastDeployment.createdAt}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed opacity-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vercel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Brak: VERCEL_TOKEN, VERCEL_PROJECT_ID</p>
          </CardContent>
        </Card>
      )}

      {/* Neon */}
      {neon ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="text-green-500 font-bold text-xs">N</span>
              Neon — {neon.projectName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Storage</span>
              <span className="text-sm font-semibold">{bytes(neon.storageBytes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Compute (CPU)</span>
              <span className="text-sm font-semibold">
                {neon.cpuUsedSeconds < 3600
                  ? `${neon.cpuUsedSeconds}s`
                  : `${(neon.cpuUsedSeconds / 3600).toFixed(1)}h`}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">{neon.region}</div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed opacity-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Neon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Brak: NEON_API_KEY, NEON_PROJECT_ID</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
