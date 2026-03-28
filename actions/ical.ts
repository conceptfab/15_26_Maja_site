'use server';

import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/auth';

function unauthorized() {
  return { error: 'Brak autoryzacji' };
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

export async function syncICalFeed(id: string) {
  const session = await verifySession();
  if (!session) return unauthorized();

  const feed = await prisma.iCalFeed.findUnique({ where: { id } });
  if (!feed) return { error: 'Feed nie znaleziony' };

  try {
    const response = await fetch(feed.url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const icalText = await response.text();
    const events = parseICalEvents(icalText);

    let created = 0;
    for (const event of events) {
      // Blokuj daty z zewnętrznego kalendarza (unikaj duplikatów)
      const days: Date[] = [];
      const current = new Date(event.start);
      while (current < event.end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      for (const day of days) {
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const existing = await prisma.blockedDate.findFirst({
          where: { date: { gte: dayStart, lt: dayEnd } },
        });

        if (!existing) {
          await prisma.blockedDate.create({
            data: { date: dayStart, reason: `[iCal] ${feed.name}: ${event.summary}` },
          });
          created++;
        }
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

export async function syncAllFeeds() {
  const session = await verifySession();
  if (!session) return unauthorized();

  const feeds = await prisma.iCalFeed.findMany();
  const results: { name: string; success: boolean; message: string }[] = [];

  for (const feed of feeds) {
    const result = await syncICalFeed(feed.id);
    if ('error' in result) {
      results.push({ name: feed.name, success: false, message: result.error });
    } else {
      results.push({ name: feed.name, success: true, message: `${result.eventsFound} wydarzeń, ${result.datesBlocked} nowych blokad` });
    }
  }

  return { results };
}
