'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { updateReservationStatus, addAdminNote, updateReservation, getStatusHistory, sendGuestEmail, type EmailTemplateType } from '@/actions/reservations';
import type { ReservationStatus } from '@/lib/validations';
import { STATUS_OPTIONS, getStatusInfo } from '@/lib/reservation-status';

type HistoryEntry = {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string | null;
  createdAt: string;
};

type Props = {
  id: string;
  currentStatus: string;
  adminNote: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
};

export function ReservationActions({ id, currentStatus, adminNote, checkIn, checkOut, guests, totalPrice }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(adminNote || '');
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Edycja danych
  const [editCheckIn, setEditCheckIn] = useState(checkIn.slice(0, 10));
  const [editCheckOut, setEditCheckOut] = useState(checkOut.slice(0, 10));
  const [editGuests, setEditGuests] = useState(guests);
  const [editPrice, setEditPrice] = useState(totalPrice);

  useEffect(() => {
    getStatusHistory(id).then((result) => {
      if ('history' in result) setHistory(result.history);
    });
  }, [id, currentStatus]);

  const handleStatusChange = (newStatus: ReservationStatus) => {
    startTransition(async () => {
      const result = await updateReservationStatus(id, newStatus);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Status zaktualizowany');
        router.refresh();
      }
    });
  };

  const handleNoteSave = () => {
    startTransition(async () => {
      const result = await addAdminNote(id, note);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Notatka zapisana');
      }
    });
  };

  const handleEditSave = () => {
    startTransition(async () => {
      const result = await updateReservation(id, {
        checkIn: editCheckIn,
        checkOut: editCheckOut,
        guests: editGuests,
        totalPrice: editPrice,
      });
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Rezerwacja zaktualizowana');
        setEditing(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Zmiana statusu */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Zmień status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                size="sm"
                className={currentStatus === opt.value ? opt.activeClass : ''}
                style={currentStatus !== opt.value ? { borderColor: opt.color, color: opt.color } : undefined}
                disabled={isPending || currentStatus === opt.value}
                onClick={() => handleStatusChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edycja rezerwacji */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Edycja rezerwacji</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Anuluj' : 'Edytuj'}
          </Button>
        </CardHeader>
        {editing && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Zameldowanie</label>
                <Input type="date" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Wymeldowanie</label>
                <Input type="date" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Goście</label>
                <Input type="number" min={1} value={editGuests} onChange={(e) => setEditGuests(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cena (zł)</label>
                <Input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
              </div>
            </div>
            <Button size="sm" onClick={handleEditSave} disabled={isPending}>
              Zapisz zmiany
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Wyślij email do gościa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Wyślij email do gościa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {([
              { type: 'confirmation' as EmailTemplateType, label: 'Potwierdzenie' },
              { type: 'deposit' as EmailTemplateType, label: 'Zaliczka' },
              { type: 'cancellation' as EmailTemplateType, label: 'Anulowanie' },
              { type: 'postStay' as EmailTemplateType, label: 'Po pobycie' },
            ]).map((tmpl) => (
              <Button
                key={tmpl.type}
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await sendGuestEmail(id, tmpl.type);
                    if ('error' in result) {
                      toast.error(result.error);
                    } else {
                      toast.success(`Email "${tmpl.label}" wysłany`);
                    }
                  });
                }}
              >
                {tmpl.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notatka admina */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Notatka admina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notatki wewnętrzne..."
          />
          <Button size="sm" onClick={handleNoteSave} disabled={isPending}>
            Zapisz notatkę
          </Button>
        </CardContent>
      </Card>

      {/* Historia statusów */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Historia zmian statusu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${getStatusInfo(entry.oldStatus).badgeClass}`}>{getStatusInfo(entry.oldStatus).label}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className={`text-xs ${getStatusInfo(entry.newStatus).badgeClass}`}>{getStatusInfo(entry.newStatus).label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.createdAt).toLocaleString('pl-PL')}
                      {entry.changedBy && ` · ${entry.changedBy}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
