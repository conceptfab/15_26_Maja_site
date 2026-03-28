// Statystyki zewnętrzne: Vercel + Neon + Umami
// Wymagane zmienne env: VERCEL_TOKEN, VERCEL_PROJECT_ID, NEON_API_KEY, NEON_PROJECT_ID
// Opcjonalne: UMAMI_API_KEY, UMAMI_WEBSITE_ID

export type VercelStats = {
  projectName: string;
  lastDeployment: {
    state: string;
    createdAt: string;
    url: string;
  } | null;
  deploymentsThisMonth: number;
};

export type NeonStats = {
  projectName: string;
  storageBytes: number;
  cpuUsedSeconds: number;
  region: string;
};

export type UmamiStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  active: number;
};

export type ExternalStats =
  | { ok: true; vercel: VercelStats | null; neon: NeonStats | null; umami: UmamiStats | null; missingTokens: string[] }
  | { ok: false; error: string };

export async function getExternalStats(): Promise<ExternalStats> {
  const missing: string[] = [];
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const NEON_API_KEY = process.env.NEON_API_KEY;
  const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
  const UMAMI_API_KEY = process.env.UMAMI_API_KEY;
  const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

  if (!VERCEL_TOKEN) missing.push('VERCEL_TOKEN');
  if (!VERCEL_PROJECT_ID) missing.push('VERCEL_PROJECT_ID');
  if (!NEON_API_KEY) missing.push('NEON_API_KEY');
  if (!NEON_PROJECT_ID) missing.push('NEON_PROJECT_ID');
  if (!UMAMI_API_KEY) missing.push('UMAMI_API_KEY');

  const [vercel, neon, umami] = await Promise.all([
    VERCEL_TOKEN && VERCEL_PROJECT_ID
      ? fetchVercelStats(VERCEL_TOKEN, VERCEL_PROJECT_ID)
      : Promise.resolve(null),
    NEON_API_KEY && NEON_PROJECT_ID
      ? fetchNeonStats(NEON_API_KEY, NEON_PROJECT_ID)
      : Promise.resolve(null),
    UMAMI_API_KEY && UMAMI_WEBSITE_ID
      ? fetchUmamiStats(UMAMI_API_KEY, UMAMI_WEBSITE_ID)
      : Promise.resolve(null),
  ]);

  return { ok: true, vercel, neon, umami, missingTokens: missing };
}

async function fetchVercelStats(token: string, projectId: string): Promise<VercelStats | null> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const [projectRes, deploymentsRes] = await Promise.all([
      fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }),
      fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=100&since=${startOfMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }),
    ]);

    if (!projectRes.ok || !deploymentsRes.ok) return null;

    const project = await projectRes.json();
    const deployments = await deploymentsRes.json();

    const latest = deployments.deployments?.[0] ?? null;

    return {
      projectName: project.name ?? projectId,
      lastDeployment: latest
        ? {
            state: latest.state ?? latest.readyState ?? 'UNKNOWN',
            createdAt: new Date(latest.createdAt).toLocaleString('pl-PL'),
            url: latest.url ? `https://${latest.url}` : '',
          }
        : null,
      deploymentsThisMonth: deployments.deployments?.length ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchNeonStats(apiKey: string, projectId: string): Promise<NeonStats | null> {
  try {
    const res = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const project = data.project ?? data;

    return {
      projectName: project.name ?? projectId,
      storageBytes: project.store_bytes_used ?? project.usage?.storage_bytes_hour ?? 0,
      cpuUsedSeconds: project.cpu_used_sec ?? project.usage?.compute_seconds ?? 0,
      region: project.region_id ?? '',
    };
  } catch {
    return null;
  }
}

async function fetchUmamiStats(apiKey: string, websiteId: string): Promise<UmamiStats | null> {
  try {
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
    const base = 'https://api.umami.is/v1';

    const [statsRes, activeRes] = await Promise.all([
      fetch(
        `${base}/websites/${websiteId}/stats?startAt=${startOfMonth.getTime()}&endAt=${now}`,
        { headers, next: { revalidate: 300 } }
      ),
      fetch(
        `${base}/websites/${websiteId}/active`,
        { headers, next: { revalidate: 60 } }
      ),
    ]);

    if (!statsRes.ok) return null;

    const stats = await statsRes.json();
    const activeData = activeRes.ok ? await activeRes.json() : null;

    return {
      pageviews: stats.pageviews?.value ?? 0,
      visitors: stats.visitors?.value ?? 0,
      visits: stats.visits?.value ?? 0,
      active: activeData?.x ?? activeData?.visitors ?? 0,
    };
  } catch {
    return null;
  }
}
