'use client';

import { useState } from 'react';
import { ExternalStatsCards } from './ExternalStatsCards';
import type { ExternalStats } from '@/lib/external-stats';

export function InfrastructureSection({ stats }: { stats: ExternalStats }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{open ? '▾' : '▸'}</span>
        Infrastruktura (widok deweloperski)
      </button>
      {open && <ExternalStatsCards stats={stats} />}
    </div>
  );
}
