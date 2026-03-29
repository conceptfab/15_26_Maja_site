'use server';

import { prisma } from '@/lib/db';
import { verifySession, unauthorized } from '@/lib/auth';
import { toDateString } from '@/lib/date-utils';

function validateICalUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Nieprawidłowy URL';
  }

  if (parsed.protocol !== 'https:') {
    return 'Tylko HTTPS jest dozwolone dla feedów iCal';
  }

  if (isBlockedHost(parsed.hostname)) {
    return 'Niedozwolony host w URL feeda';
  }

  return null;
}

function isBlockedHost(hostname: string): boolean {
  const blockedExact = new Set([
    'localhost', '127.0.0.1', '::1', '0.0.0.0',
    '169.254.169.254', // AWS metadata
    'metadata.google.internal', // GCP metadata
  ]);

  if (blockedExact.has(hostname)) return true;

  // Octal IP (0177.0.0.1 = 127.0.0.1)
  if (/^0\d/.test(hostname)) return true;

  // Decimal IP (2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname) && !hostname.includes('.')) return true;

  // IPv6 loopback/link-local
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower.startsWith('fe80:') || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd')) return true;

  // RFC-1918 private ranges
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10 (CGNAT/AWS)
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 link-local
  }

  return false;
}

export async function getICalFeeds() {
  const session = await verifySession();
  if (!session) return unauthorized();

  const feeds = await prisma.iCalFeed.findMany({ orderBy: { createdAt: 'asc' } });
  return { feeds };
}

export async function addICalFeed(name: string, url: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  if (!name.trim() || !url.trim()) return { error: 'Nazwa i URL są wymagane' };

  const urlError = validateICalUrl(url.trim());
  if (urlError) return { error: urlError };

  const feed = await prisma.iCalFeed.create({ data: { name: name.trim(), url: url.trim() } });
  return { feed };
}

export async function removeICalFeed(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  await prisma.iCalFeed.delete({ where: { id } });
  return { success: true };
}

function parseICalEvents(icalText: string): { start: Date; end: Date; summary: string }[] {
  const events: { start: Date; end: Date; summary: string }[] = [];
  const blocks = icalText.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    let start: Date | null = null;
    let end: Date | null = null;
    let summary = 'Zewnętrzna rezerwacja';

    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DTSTART')) {
        const val = trimmed.split(':').pop() || '';
        start = parseICalDate(val);
      } else if (trimmed.startsWith('DTEND')) {
        const val = trimmed.split(':').pop() || '';
        end = parseICalDate(val);
      } else if (trimmed.startsWith('SUMMARY')) {
        summary = trimmed.split(':').slice(1).join(':').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() || summary;
      }
    }

    if (start && end && end > start) {
      events.push({ start, end, summary });
    }
  }

  return events;
}

function parseICalDate(val: string): Date | null {
  // Format: 20250315 or 20250315T120000Z
  const clean = val.replace(/[^0-9TZ]/g, '');
  if (clean.length >= 8) {
    const y = parseInt(clean.slice(0, 4));
    const m = parseInt(clean.slice(4, 6)) - 1;
    const d = parseInt(clean.slice(6, 8));
    if (clean.includes('T') && clean.length >= 15) {
      const h = parseInt(clean.slice(9, 11));
      const min = parseInt(clean.slice(11, 13));
      return new Date(Date.UTC(y, m, d, h, min));
    }
    return new Date(y, m, d);
  }
  return null;
}

/** Wewnętrzna synchronizacja (bez auth) — używana przez syncAllFeeds */
async function _syncICalFeedInternal(id: string) {
  const feed = await prisma.iCalFeed.findUnique({ where: { id } });
  if (!feed) return { error: 'Feed nie znaleziony' };

  try {
    const urlError = validateICalUrl(feed.url);
    if (urlError) return { error: urlError };

    const response = await fetch(feed.url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const icalText = await response.text();
    const events = parseICalEvents(icalText);

    const allDays: { date: Date; reason: string }[] = [];
    for (const event of events) {
      const current = new Date(event.start);
      while (current < event.end) {
        const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        allDays.push({ date: dayStart, reason: `[iCal] ${feed.name}: ${event.summary}` });
        current.setDate(current.getDate() + 1);
      }
    }

    let created = 0;
    if (allDays.length > 0) {
      const minDate = allDays.reduce((min, d) => d.date < min ? d.date : min, allDays[0].date);
      const maxDate = new Date(allDays.reduce((max, d) => d.date > max ? d.date : max, allDays[0].date));
      maxDate.setDate(maxDate.getDate() + 1);

      const existing = await prisma.blockedDate.findMany({
        where: { date: { gte: minDate, lt: maxDate } },
        select: { date: true },
      });

      const existingSet = new Set(existing.map((e) => toDateString(e.date)));
      const toCreate = allDays.filter(
        (d) => !existingSet.has(toDateString(d.date))
      );

      if (toCreate.length > 0) {
        await prisma.blockedDate.createMany({
          data: toCreate.map((d) => ({ date: d.date, reason: d.reason })),
          skipDuplicates: true,
        });
        created = toCreate.length;
      }
    }

    await prisma.iCalFeed.update({
      where: { id },
      data: { lastSync: new Date(), lastError: null },
    });

    return { success: true, eventsFound: events.length, datesBlocked: created };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Nieznany błąd';
    await prisma.iCalFeed.update({
      where: { id },
      data: { lastError: msg },
    });
    return { error: `Błąd synchronizacji: ${msg}` };
  }
}

export async function syncICalFeed(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();
  return _syncICalFeedInternal(id);
}

export async function syncAllFeeds() {
  const session = await verifySession();
  if (!session) return unauthorized();

  const feeds = await prisma.iCalFeed.findMany();

  const settled = await Promise.allSettled(
    feeds.map((feed) => _syncICalFeedInternal(feed.id))
  );

  const results = feeds.map((feed, i) => {
    const outcome = settled[i];
    if (outcome.status === 'rejected') {
      return { name: feed.name, success: false, message: String(outcome.reason) };
    }
    const result = outcome.value;
    if ('error' in result) {
      return { name: feed.name, success: false, message: result.error };
    }
    return { name: feed.name, success: true, message: `${result.eventsFound} wydarzeń, ${result.datesBlocked} nowych blokad` };
  });

  return { results };
}
