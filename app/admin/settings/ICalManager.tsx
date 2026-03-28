'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getICalFeeds, addICalFeed, removeICalFeed, syncICalFeed, syncAllFeeds } from '@/actions/ical';

type Feed = {
  id: string;
  name: string;
  url: string;
  lastSync: string | null;
  lastError: string | null;
};

export function ICalManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isPending, startTransition] = useTransition();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchFeeds = () => {
    getICalFeeds().then((r) => {
      if ('feeds' in r) setFeeds(r.feeds as unknown as Feed[]);
    });
  };

  useEffect(() => { fetchFeeds(); }, []);

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) { toast.error('Podaj nazwę i URL'); return; }
    startTransition(async () => {
      const result = await addICalFeed(name, url);
      if ('error' in result) toast.error(result.error);
      else { toast.success('Feed dodany'); setName(''); setUrl(''); fetchFeeds(); }
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      await removeICalFeed(id);
      toast.success('Feed usunięty');
      fetchFeeds();
    });
  };

  const handleSync = (id: string) => {
    setSyncingId(id);
    startTransition(async () => {
      const result = await syncICalFeed(id);
      if ('error' in result) toast.error(result.error);
      else toast.success(`Zsynchronizowano: ${result.eventsFound} wydarzeń, ${result.datesBlocked} nowych blokad`);
      setSyncingId(null);
      fetchFeeds();
    });
  };

  const handleSyncAll = () => {
    setSyncingId('all');
    startTransition(async () => {
      const result = await syncAllFeeds();
      if ('error' in result) toast.error(result.error);
      else if ('results' in result) {
        const ok = result.results.filter((r) => r.success).length;
        const fail = result.results.filter((r) => !r.success).length;
        toast.success(`Synchronizacja: ${ok} OK${fail > 0 ? `, ${fail} błędów` : ''}`);
      }
      setSyncingId(null);
      fetchFeeds();
    });
  };

  const exportUrl = '/api/ical/export';

  const getExportUrl = () => {
    if (typeof window === 'undefined') return exportUrl;
    return `${window.location.origin}${exportUrl}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Synchronizacja iCal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Eksport */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Link do eksportu kalendarza (do wklejenia w Booking/Airbnb).
            Opcjonalnie ustaw zmienną <code className="text-xs">ICAL_EXPORT_TOKEN</code> i dodaj <code className="text-xs">?token=xxx</code> do URL.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={getExportUrl()} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(getExportUrl());
                toast.success('Skopiowano URL');
              }}
            >
              Kopiuj
            </Button>
          </div>
        </div>

        {/* Import — lista feedów */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Zewnętrzne kalendarze (import)</p>
            {feeds.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isPending}>
                {syncingId === 'all' ? 'Synchronizuję...' : 'Synchronizuj wszystkie'}
              </Button>
            )}
          </div>

          {feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zewnętrznych kalendarzy. Dodaj URL z Booking.com lub Airbnb poniżej.</p>
          ) : (
            <div className="space-y-2">
              {feeds.map((feed) => (
                <div key={feed.id} className="border border-border rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{feed.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                      {feed.lastSync && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ostatnia sync: {new Date(feed.lastSync).toLocaleString('pl-PL')}
                        </p>
                      )}
                      {feed.lastError && (
                        <p className="text-xs text-red-400 mt-1">Błąd: {feed.lastError}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleSync(feed.id)} disabled={isPending}>
                        {syncingId === feed.id ? '...' : 'Sync'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemove(feed.id)} disabled={isPending}>
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dodaj nowy feed */}
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium mb-2">Dodaj kalendarz</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Nazwa (np. Booking.com)" value={name} onChange={(e) => setName(e.target.value)} className="sm:w-48" />
            <Input placeholder="URL kalendarza iCal" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={handleAdd} disabled={isPending}>Dodaj</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
