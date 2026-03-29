const BRAND_COLOR = '#be1622';

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || '').replace(/\/$/, '');
  return base ? `${base.startsWith('http') ? '' : 'https://'}${base}${path}` : path;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function emailLayout(content: string, logoUrl: string | null) {
  const logoHtml = logoUrl
    ? `<img src="${escapeAttr(toAbsoluteUrl(logoUrl))}" alt="HOMMM" width="120" style="display:block;margin:0 auto 16px" />`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:24px auto;padding:24px;background:#fff;border-radius:8px">
      <div style="text-align:center;margin-bottom:32px">
        ${logoHtml}
        <h1 style="color:${BRAND_COLOR};font-size:28px;letter-spacing:4px;margin:0">HOMMM</h1>
      </div>
      ${content}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">
        HOMMM &mdash; Your Special Time
      </div>
    </div>
  </body></html>`;
}
