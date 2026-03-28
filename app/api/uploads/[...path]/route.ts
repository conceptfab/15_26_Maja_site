import { NextResponse } from 'next/server';

// Ten endpoint jest nieaktywny — pliki są serwowane przez Vercel Blob CDN
export function GET() {
  return new NextResponse('Not Found', { status: 404 });
}
