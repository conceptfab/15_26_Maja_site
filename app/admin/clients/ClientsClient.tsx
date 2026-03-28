'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getClients } from '@/actions/clients';

type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  rating: number | null;
  tags: string;
  isBlacklisted: boolean;
  reservationCount: number;
  totalSpent: number;
  lastStay: string | null;
  createdAt: string;
};

function formatPLN(amount: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(amount);
}

export function ClientsClient() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getClients({
      search: search || undefined,
      page,
      perPage: 20,
    });
    if ('clients' in result) {
      setClients(result.clients);
      setTotal(result.total);
      setPages(result.pages);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Klienci</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Łącznie klientów</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{total}</p></CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Szukaj (imię, email, telefon)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {/* Tabela (desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-4 py-3 font-medium">Imię</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rezerwacje</th>
                  <th className="px-4 py-3 font-medium">Łączna kwota</th>
                  <th className="px-4 py-3 font-medium">Ostatni pobyt</th>
                  <th className="px-4 py-3 font-medium">Ocena</th>
                  <th className="px-4 py-3 font-medium">Tagi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Ładowanie...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Brak klientów</td></tr>
                ) : (
                  clients.map((c) => {
                    const tags: string[] = (() => {
                      try { return JSON.parse(c.tags); } catch { return []; }
                    })();
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/admin/clients/${c.id}`} className="font-medium hover:underline">
                            {c.name}
                          </Link>
                          {c.isBlacklisted && <Badge variant="destructive" className="ml-2 text-[10px]">BL</Badge>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                        <td className="px-4 py-3">{c.reservationCount}</td>
                        <td className="px-4 py-3">{formatPLN(c.totalSpent)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {c.lastStay ? new Date(c.lastStay).toLocaleDateString('pl-PL') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {c.rating ? '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Karty (mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Ładowanie...</p>
        ) : clients.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Brak klientów</p>
        ) : (
          clients.map((c) => {
            const tags: string[] = (() => {
              try { return JSON.parse(c.tags); } catch { return []; }
            })();
            return (
              <Link key={c.id} href={`/admin/clients/${c.id}`} className="block">
                <Card className="hover:ring-1 hover:ring-ring transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                      {c.isBlacklisted && <Badge variant="destructive" className="text-[10px]">BL</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Rezerwacje</span>
                      <span>{c.reservationCount}</span>
                      <span className="text-muted-foreground">Kwota</span>
                      <span className="font-medium">{formatPLN(c.totalSpent)}</span>
                      <span className="text-muted-foreground">Ostatni pobyt</span>
                      <span>{c.lastStay ? new Date(c.lastStay).toLocaleDateString('pl-PL') : '—'}</span>
                      {c.rating && (
                        <>
                          <span className="text-muted-foreground">Ocena</span>
                          <span className="text-yellow-400">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</span>
                        </>
                      )}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Paginacja */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Strona {page} z {pages} ({total} klientów)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Poprzednia</Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Następna</Button>
          </div>
        </div>
      )}
    </div>
  );
}
