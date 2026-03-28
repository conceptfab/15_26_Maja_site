import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({}, { status: 401 });

  return NextResponse.json({
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env: process.env.VERCEL_ENV ?? 'local',
    deployedAt: process.env.VERCEL_GIT_COMMIT_AUTHORED_DATE ?? null,
  });
}
