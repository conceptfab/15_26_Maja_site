import nodemailer from 'nodemailer';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const transport = getTransport();

  if (!transport) {
    console.warn('[mail] SMTP not configured — email skipped:', { to, subject });
    return { success: false, reason: 'smtp_not_configured' } as const;
  }

  const from = process.env.SMTP_USER || 'noreply@hommm.eu';

  try {
    await transport.sendMail({ from, to, subject, html });
    return { success: true } as const;
  } catch (error) {
    console.error('[mail] Failed to send email:', error);
    return { success: false, reason: 'send_failed' } as const;
  }
}

// --- Szablony email ---

const BRAND_COLOR = '#be1622';

function emailLayout(content: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: ${BRAND_COLOR}; font-size: 28px; letter-spacing: 4px; margin: 0;">HOMMM</h1>
      </div>
      ${content}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
        HOMMM &mdash; Your Special Time
      </div>
    </div>
  `;
}

type ReservationEmailData = {
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  comment?: string;
};

export function buildGuestConfirmationEmail(data: ReservationEmailData) {
  return {
    subject: 'HOMMM — Otrzymaliśmy Twoją rezerwację',
    html: emailLayout(`
      <h2 style="color: #333;">Dziękujemy, ${data.guestName}!</h2>
      <p>Otrzymaliśmy Twoje zgłoszenie rezerwacji. Wkrótce się z Tobą skontaktujemy.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Zameldowanie</td><td style="padding: 8px 0; font-weight: bold;">${data.checkIn}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Wymeldowanie</td><td style="padding: 8px 0; font-weight: bold;">${data.checkOut}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Noce</td><td style="padding: 8px 0; font-weight: bold;">${data.nights}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Goście</td><td style="padding: 8px 0; font-weight: bold;">${data.guests}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Cena</td><td style="padding: 8px 0; font-weight: bold;">${data.totalPrice} zł</td></tr>
      </table>
      ${data.comment ? `<p style="color: #666;"><strong>Komentarz:</strong> ${data.comment}</p>` : ''}
    `),
  };
}

export function buildAdminNotificationEmail(data: ReservationEmailData & { guestEmail: string; guestPhone: string }) {
  return {
    subject: `Nowa rezerwacja od ${data.guestName}`,
    html: emailLayout(`
      <h2 style="color: #333;">Nowa rezerwacja</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Gość</td><td style="padding: 8px 0; font-weight: bold;">${data.guestName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${data.guestEmail}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Telefon</td><td style="padding: 8px 0;">${data.guestPhone}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Zameldowanie</td><td style="padding: 8px 0; font-weight: bold;">${data.checkIn}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Wymeldowanie</td><td style="padding: 8px 0; font-weight: bold;">${data.checkOut}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Noce</td><td style="padding: 8px 0; font-weight: bold;">${data.nights}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Goście</td><td style="padding: 8px 0; font-weight: bold;">${data.guests}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Cena</td><td style="padding: 8px 0; font-weight: bold;">${data.totalPrice} zł</td></tr>
      </table>
      ${data.comment ? `<p style="color: #666;"><strong>Komentarz:</strong> ${data.comment}</p>` : ''}
    `),
  };
}

export function buildStatusChangeEmail(guestName: string, status: string) {
  const messages: Record<string, { subject: string; heading: string; text: string }> = {
    DEPOSIT_PAID: {
      subject: 'HOMMM — Zaliczka otrzymana',
      heading: 'Zaliczka potwierdzona',
      text: 'Otrzymaliśmy Twoją zaliczkę. Rezerwacja jest wstępnie potwierdzona.',
    },
    PAID: {
      subject: 'HOMMM — Rezerwacja potwierdzona',
      heading: 'Rezerwacja potwierdzona!',
      text: 'Twoja rezerwacja została w pełni potwierdzona. Do zobaczenia!',
    },
    CANCELLED: {
      subject: 'HOMMM — Rezerwacja anulowana',
      heading: 'Rezerwacja anulowana',
      text: 'Twoja rezerwacja została anulowana. Jeśli masz pytania, skontaktuj się z nami.',
    },
    COMPLETED: {
      subject: 'HOMMM — Dziękujemy za pobyt!',
      heading: 'Dziękujemy!',
      text: 'Dziękujemy za pobyt w HOMMM. Mamy nadzieję, że wrócisz!',
    },
  };

  const msg = messages[status];
  if (!msg) return null;

  return {
    subject: msg.subject,
    html: emailLayout(`
      <h2 style="color: #333;">${msg.heading}</h2>
      <p>${guestName}, ${msg.text}</p>
    `),
  };
}
