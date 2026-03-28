'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getReservations } from '@/actions/reservations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'Wszystkie statusy' },
  { value: 'PENDING', label: 'Oczekująca' },
  { value: 'DEPOSIT_PAID', label: 'Zaliczka' },
  { value: 'PAID', label: 'Opłacona' },
  { value: 'COMPLETED', label: 'Zakończona' },
  { value: 'CANCELLED', label: 'Anulowana' },
] as const;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Oczekująca', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  DEPOSIT_PAID: { label: 'Zaliczka', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  PAID: { label: 'Opłacona', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Anulowana', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  COMPLETED: { label: 'Zakończona', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

type SortableColumn = 'checkIn' | 'checkOut' | 'totalPrice' | 'createdAt' | 'guests' | 'nights';

type Reservation = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  status: string;
  adminNote: string | null;
  comment: string | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  total: number;
  pending: number;
  upcoming: number;
};

export function ReservationsClient({ initialStats }: { initialStats: Stats }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtry
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortableColumn>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getReservations({
      status: status || undefined,
      search: search || undefined,
      page,
      perPage,
      sortBy,
      sortDir,
    } as Parameters<typeof getReservations>[0]);

    if ('reservations' in result) {
      setReservations(result.reservations);
      setTotal(result.total);
      setPages(result.pages);
    } else if ('error' in result) {
      setError(result.error);
    }
    setLoading(false);
  }, [status, search, page, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce szukania
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleSort(column: SortableColumn) {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleStatusFilter(newStatus: string) {
    setStatus(newStatus);
    setPage(1);
  }

  function sortIcon(column: SortableColumn) {
    if (sortBy !== column) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rezerwacje</h1>

      {/* Karty statystyk — klikalne */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer hover:ring-2 hover:ring-ring transition-all" onClick={() => { setStatus(''); setPage(1); }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Łącznie</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{initialStats.total}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-ring transition-all" onClick={() => handleStatusFilter('PENDING')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Oczekujące</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">{initialStats.pending}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-ring transition-all" onClick={() => { setStatus(''); setPage(1); }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nadchodzące</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{initialStats.upcoming}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtry */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={status}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <Input
          placeholder="Szukaj (imię, email, telefon)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
        />
        {(status || search) && (
          <Button variant="outline" size="sm" onClick={() => { setStatus(''); setSearchInput(''); setSearch(''); setPage(1); }}>
            Wyczyść filtry
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (search) params.set('search', search);
            window.open(`/api/admin/reservations/export?${params.toString()}`, '_blank');
          }}
        >
          Eksportuj CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error} — spróbuj <a href="/admin/login" className="underline">zalogować się ponownie</a>.
        </div>
      )}

      {/* Tabela (desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Ładowanie...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gość</TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('checkIn')}>
                    Zameldowanie{sortIcon('checkIn')}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('checkOut')}>
                    Wymeldowanie{sortIcon('checkOut')}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('nights')}>
                    Noce{sortIcon('nights')}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('guests')}>
                    Goście{sortIcon('guests')}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('totalPrice')}>
                    Cena{sortIcon('totalPrice')}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('createdAt')}>
                    Data zgł.{sortIcon('createdAt')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Brak rezerwacji
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((r) => {
                    const statusInfo = STATUS_CONFIG[r.status] || { label: r.status, className: '' };
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/admin/reservations/${r.id}`} className="font-medium hover:underline">
                              {r.guestName}
                            </Link>
                            {r.comment && <span title={r.comment} className="text-muted-foreground cursor-help">💬</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.guestEmail}</p>
                        </TableCell>
                        <TableCell>{format(new Date(r.checkIn), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{format(new Date(r.checkOut), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{r.nights}</TableCell>
                        <TableCell>{r.guests}</TableCell>
                        <TableCell className="font-medium">{r.totalPrice} zł</TableCell>
                        <TableCell>
                          <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Karty (mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Ładowanie...</p>
        ) : reservations.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Brak rezerwacji</p>
        ) : (
          reservations.map((r) => {
            const statusInfo = STATUS_CONFIG[r.status] || { label: r.status, className: '' };
            return (
              <Link key={r.id} href={`/admin/reservations/${r.id}`} className="block">
                <Card className="hover:ring-1 hover:ring-ring transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{r.guestName}</p>
                          {r.comment && <span className="text-muted-foreground">💬</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{r.guestEmail}</p>
                      </div>
                      <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{r.comment}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Zameldowanie</span>
                      <span>{format(new Date(r.checkIn), 'dd.MM.yyyy')}</span>
                      <span className="text-muted-foreground">Wymeldowanie</span>
                      <span>{format(new Date(r.checkOut), 'dd.MM.yyyy')}</span>
                      <span className="text-muted-foreground">Noce / Goście</span>
                      <span>{r.nights} nocy · {r.guests} os.</span>
                      <span className="text-muted-foreground">Cena</span>
                      <span className="font-medium">{r.totalPrice} zł</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Paginacja */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Strona {page} z {pages} ({total} rezerwacji)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
