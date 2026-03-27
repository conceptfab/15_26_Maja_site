# Backupy i przywracanie danych

## Baza danych — Neon Postgres

Neon Postgres (przez Vercel Marketplace) zapewnia automatyczne backupy:

- **Point-in-Time Recovery (PITR)** — przywracanie do dowolnego momentu w czasie
- **Retencja** — zależna od planu Neon (domyślnie 7 dni, Pro: 30 dni)
- **Branching** — możliwość tworzenia kopii bazy jako branch (do testów, migracji)

### Przywracanie

1. Otwórz dashboard Neon: https://console.neon.tech
2. Wybierz projekt → Branches → Restore
3. Wskaż punkt w czasie (timestamp) → Restore

## Pliki (galeria) — Vercel Blob

Vercel Blob przechowuje pliki z redundancją:

- Dane replikowane automatycznie
- Brak potrzeby ręcznych backupów
- Pliki dostępne dopóki istnieją w storage

## Opcjonalny eksport danych (Vercel Cron)

Endpoint `/api/cron/export` eksportuje dane (rezerwacje, strony, sekcje, ustawienia) jako JSON.

### Konfiguracja

1. Dodaj `CRON_SECRET` do zmiennych środowiskowych Vercel
2. Dodaj cron w `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/export",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

Powyższy schedule: co niedzielę o 3:00 UTC.

3. Opcjonalnie: skonfiguruj `ADMIN_EMAIL` + SMTP — eksport będzie wysyłany mailem

### Ręczne wywołanie

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://hommm.eu/api/cron/export
```

### Odpowiedź

```json
{
  "ok": true,
  "exportedAt": "2026-03-27T03:00:00.000Z",
  "counts": {
    "reservations": 42,
    "pages": 5,
    "sections": 12,
    "settings": 10
  }
}
```
