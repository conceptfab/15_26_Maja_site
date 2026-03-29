import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Weryfikacja CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [reservations, pages, sections, settings] = await Promise.all([
      prisma.reservation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true, guestName: true, guestEmail: true, checkIn: true, checkOut: true,
          nights: true, guests: true, totalPrice: true, status: true, createdAt: true,
        },
      }),
      prisma.page.findMany({ orderBy: { order: 'asc' } }),
      prisma.section.findMany({ orderBy: { order: 'asc' }, select: { id: true, slug: true, pageId: true, titlePl: true, order: true } }),
      prisma.siteSettings.findMany(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      reservations,
      pages,
      sections,
      settings,
    };

    // Opcjonalnie: wysyłka mailem (jeśli skonfigurowany ADMIN_EMAIL)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        const { sendEmail } = await import('@/lib/mail');
        const json = JSON.stringify(exportData, null, 2);
        const safeJson = json.slice(0, 50000)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        await sendEmail({
          to: adminEmail,
          subject: `HOMMM — Eksport danych ${new Date().toLocaleDateString('pl-PL')}`,
          html: `<h2>Eksport danych HOMMM</h2>
           <p>Eksport z ${new Date().toLocaleString('pl-PL')}.</p>
           <p>Rezerwacji: ${reservations.length}, Stron: ${pages.length}, Sekcji: ${sections.length}</p>
           <details><summary>Dane JSON</summary><pre style="font-size:11px;max-height:600px;overflow:auto">${safeJson}</pre></details>`,
        });
      } catch (err) {
        console.error('[cron/export] Błąd wysyłki emaila eksportu:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      exportedAt: exportData.exportedAt,
      counts: {
        reservations: reservations.length,
        pages: pages.length,
        sections: sections.length,
        settings: settings.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
