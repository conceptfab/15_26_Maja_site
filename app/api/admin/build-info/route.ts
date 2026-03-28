import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifySession } from '@/lib/auth';

function gitFallback(cmd: string): string | null {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 1000 }).trim() || null; }
  catch { return null; }
}

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({}, { status: 401 });

  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? gitFallback('git rev-parse --abbrev-ref HEAD');
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? gitFallback('git rev-parse --short HEAD');
  const deployedAt = process.env.VERCEL_GIT_COMMIT_AUTHORED_DATE
    ?? gitFallback('git log -1 --format=%cI');

  return NextResponse.json({
    branch,
    sha,
    env: process.env.VERCEL_ENV ?? 'local',
    deployedAt,
  });
}
