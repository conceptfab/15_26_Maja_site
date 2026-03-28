// Czysta definicja typów i domyślnych szablonów — bez importów serwerowych
// Bezpieczna do importowania w komponentach klienckich

export type TemplateKey =
  | 'guestConfirmation'
  | 'adminNotification'
  | 'statusDepositPaid'
  | 'statusPaid'
  | 'statusCancelled'
  | 'statusCompleted';

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type EmailTemplatesMap = Record<TemplateKey, EmailTemplate>;

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  guestConfirmation: 'Potwierdzenie (gość)',
  adminNotification: 'Powiadomienie (admin)',
  statusDepositPaid: 'Zaliczka opłacona',
  statusPaid: 'Rezerwacja opłacona',
  statusCancelled: 'Anulowanie',
  statusCompleted: 'Po pobycie',
};

export const TEMPLATE_VARS = [
  '{{guestName}}', '{{checkIn}}', '{{checkOut}}',
  '{{nights}}', '{{guests}}', '{{totalPrice}}',
  '{{guestEmail}}', '{{guestPhone}}', '{{comment}}',
];

export const DEFAULT_TEMPLATES: EmailTemplatesMap = {
  guestConfirmation: {
    subject: 'HOMMM — Otrzymaliśmy Twoją rezerwację',
    body: `<h2 style="color: #333;">Dziękujemy, {{guestName}}!</h2>
<p>Otrzymaliśmy Twoje zgłoszenie rezerwacji. Wkrótce się z Tobą skontaktujemy.</p>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 8px 0; color: #666;">Zameldowanie</td><td style="padding: 8px 0; font-weight: bold;">{{checkIn}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Wymeldowanie</td><td style="padding: 8px 0; font-weight: bold;">{{checkOut}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Noce</td><td style="padding: 8px 0; font-weight: bold;">{{nights}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Goście</td><td style="padding: 8px 0; font-weight: bold;">{{guests}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Cena</td><td style="padding: 8px 0; font-weight: bold;">{{totalPrice}} zł</td></tr>
</table>
<div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 13px; color: #666;">
  <strong>Twoje dane kontaktowe:</strong><br/>
  {{guestEmail}} &bull; {{guestPhone}}
</div>`,
  },
  adminNotification: {
    subject: 'Nowa rezerwacja od {{guestName}}',
    body: `<h2 style="color: #333;">Nowa rezerwacja</h2>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 8px 0; color: #666;">Gość</td><td style="padding: 8px 0; font-weight: bold;">{{guestName}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">{{guestEmail}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Telefon</td><td style="padding: 8px 0;">{{guestPhone}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Zameldowanie</td><td style="padding: 8px 0; font-weight: bold;">{{checkIn}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Wymeldowanie</td><td style="padding: 8px 0; font-weight: bold;">{{checkOut}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Noce</td><td style="padding: 8px 0; font-weight: bold;">{{nights}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Goście</td><td style="padding: 8px 0; font-weight: bold;">{{guests}}</td></tr>
  <tr><td style="padding: 8px 0; color: #666;">Cena</td><td style="padding: 8px 0; font-weight: bold;">{{totalPrice}} zł</td></tr>
</table>`,
  },
  statusDepositPaid: {
    subject: 'HOMMM — Zaliczka otrzymana',
    body: `<h2 style="color: #333;">Zaliczka potwierdzona</h2>
<p>{{guestName}}, otrzymaliśmy Twoją zaliczkę. Rezerwacja jest wstępnie potwierdzona.</p>`,
  },
  statusPaid: {
    subject: 'HOMMM — Rezerwacja potwierdzona',
    body: `<h2 style="color: #333;">Rezerwacja potwierdzona!</h2>
<p>{{guestName}}, Twoja rezerwacja została w pełni potwierdzona. Do zobaczenia!</p>`,
  },
  statusCancelled: {
    subject: 'HOMMM — Rezerwacja anulowana',
    body: `<h2 style="color: #333;">Rezerwacja anulowana</h2>
<p>{{guestName}}, Twoja rezerwacja została anulowana. Jeśli masz pytania, skontaktuj się z nami.</p>`,
  },
  statusCompleted: {
    subject: 'HOMMM — Dziękujemy za pobyt!',
    body: `<h2 style="color: #333;">Dziękujemy!</h2>
<p>{{guestName}}, dziękujemy za pobyt w HOMMM. Mamy nadzieję, że wrócisz!</p>`,
  },
};

export function getDefaultTemplate(key: TemplateKey): EmailTemplate {
  return { ...DEFAULT_TEMPLATES[key] };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(String(vars[key] ?? '')));
}
