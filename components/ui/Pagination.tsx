'use client';

import { Button } from '@/components/ui/button';

type PaginationProps = {
  page: number;
  pages: number;
  total: number;
  label: string;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pages, total, label, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Strona {page} z {pages} ({total} {label})
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Poprzednia
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Następna
        </Button>
      </div>
    </div>
  );
}
