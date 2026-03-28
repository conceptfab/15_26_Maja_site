'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateClient } from '@/actions/clients';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  DEPOSIT_PAID: 'Zaliczka',
  PAID: 'Opłacona',
  COMPLETED: 'Zakończona',
  CANCELLED: 'Anulowana',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  DEPOSIT_PAID: 'bg-blue-500/20 text-blue-400',
  PAID: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-gray-500/20 text-gray-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

type Reservation = {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  totalPrice: number;
  status: string;
  createdAt: Date;
};

type Client = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  locale: string;
  rating: number | null;
  tags: string;
  adminNote: string | null;
  discount: number;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  createdAt: Date;
  reservations: Reservation[];
};

function formatPLN(amount: number) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(amount);
}

export function ClientDetail({ client }: { client: Client }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(client.rating ?? 0);
  const [note, setNote] = useState(client.adminNote ?? '');
  const [discount, setDiscount] = useState(client.discount);
  const [tagsInput, setTagsInput] = useState(() => {
    try { return (JSON.parse(client.tags) as string[]).join(', '); } catch { return ''; }
  });
  const [blacklisted, setBlacklisted] = useState(client.isBlacklisted);
  const [blacklistReason, setBlacklistReason] = useState(client.blacklistReason ?? '');

  const confirmedRes = client.reservations.filter((r) =>
    ['DEPOSIT_PAID', 'PAID', 'COMPLETED'].includes(r.status)
  );
  const totalSpent = confirmedRes.reduce((s, r) => s + r.totalPrice, 0);

  const handleSave = () => {
    startTransition(async () => {
      const tags = JSON.stringify(tagsInput.split(',').map((t) => t.trim()).filter(Boolean));
      const result = await updateClient(client.id, {
        rating: rating || null,
        adminNote: note || undefined,
        discount,
        tags,
        isBlacklisted: blacklisted,
        blacklistReason: blacklisted ? blacklistReason : undefined,
      });
      if ('error' in result) toast.error(result.error);
      else { toast.success('Klient zaktualizowany'); router.refresh(); }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="text-muted-foreground hover:text-foreground text-sm">← Klienci</Link>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        {client.isBlacklisted && <Badge variant="destructive">Czarna lista</Badge>}
      </div>

      {/* Info */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Email</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium">{client.email}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Telefon</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium">{client.phone || '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Rezerwacje</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{client.reservations.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Łączna kwota</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatPLN(totalSpent)}</p></CardContent>
        </Card>
      </div>

      {/* Edycja */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Zarządzanie klientem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Ocena (1-5)</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" className={`text-xl ${v <= rating ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
                    onClick={() => setRating(v === rating ? 0 : v)}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rabat (%)</label>
              <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Tagi (rozdzielone przecinkiem)</label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="mt-1" placeholder="VIP, Powracający" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Notatka admina</label>
            <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notatki wewnętrzne..." />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={blacklisted} onChange={(e) => setBlacklisted(e.target.checked)} />
              Czarna lista
            </label>
            {blacklisted && (
              <Input value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Powód..." className="flex-1" />
            )}
          </div>

          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </CardContent>
      </Card>

      {/* Historia rezerwacji */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Historia rezerwacji</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {client.reservations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">Brak rezerwacji</p>
          ) : (
            <>
              {/* Desktop */}
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="px-4 py-2 font-medium">Zameldowanie</th>
                    <th className="px-4 py-2 font-medium">Wymeldowanie</th>
                    <th className="px-4 py-2 font-medium">Noce</th>
                    <th className="px-4 py-2 font-medium">Cena</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {client.reservations.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Link href={`/admin/reservations/${r.id}`} className="hover:underline">
                          {new Date(r.checkIn).toLocaleDateString('pl-PL')}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{new Date(r.checkOut).toLocaleDateString('pl-PL')}</td>
                      <td className="px-4 py-2">{r.nights}</td>
                      <td className="px-4 py-2">{formatPLN(r.totalPrice)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || ''}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border/50">
                {client.reservations.map((r) => (
                  <Link key={r.id} href={`/admin/reservations/${r.id}`} className="block px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {new Date(r.checkIn).toLocaleDateString('pl-PL')} – {new Date(r.checkOut).toLocaleDateString('pl-PL')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || ''}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.nights} nocy · {formatPLN(r.totalPrice)}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
