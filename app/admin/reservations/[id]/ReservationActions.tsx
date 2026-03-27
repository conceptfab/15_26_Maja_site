'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateReservationStatus, addAdminNote } from '@/actions/reservations';
import type { ReservationStatus } from '@/lib/validations';

const STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: 'PENDING', label: 'Oczekująca' },
  { value: 'DEPOSIT_PAID', label: 'Zaliczka opłacona' },
  { value: 'PAID', label: 'Opłacona' },
  { value: 'COMPLETED', label: 'Zakończona' },
  { value: 'CANCELLED', label: 'Anulowana' },
];

type Props = {
  id: string;
  currentStatus: string;
  adminNote: string | null;
};

export function ReservationActions({ id, currentStatus, adminNote }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(adminNote || '');
  const [message, setMessage] = useState('');

  const handleStatusChange = (newStatus: ReservationStatus) => {
    startTransition(async () => {
      const result = await updateReservationStatus(id, newStatus);
      if ('error' in result) {
        setMessage(`Błąd: ${result.error}`);
      } else {
        setMessage('Status zaktualizowany');
        router.refresh();
      }
    });
  };

  const handleNoteSave = () => {
    startTransition(async () => {
      const result = await addAdminNote(id, note);
      if ('error' in result) {
        setMessage(`Błąd: ${result.error}`);
      } else {
        setMessage('Notatka zapisana');
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Zmień status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={currentStatus === opt.value ? 'default' : 'outline'}
                size="sm"
                disabled={isPending || currentStatus === opt.value}
                onClick={() => handleStatusChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {message && (
            <p className="text-xs mt-2 text-muted-foreground">{message}</p>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
