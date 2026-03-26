'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';


const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/content', label: 'Treści', icon: '📝' },
  { href: '/admin/gallery', label: 'Galeria', icon: '🖼' },
  { href: '/admin/reservations', label: 'Rezerwacje', icon: '📅' },
  { href: '/admin/calendar', label: 'Kalendarz', icon: '🗓' },
  { href: '/admin/seo', label: 'SEO', icon: '🔍' },
  { href: '/admin/settings', label: 'Ustawienia', icon: '⚙' },
];

function NavLinks({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Panel administracyjny">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            pathname.startsWith(item.href)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-xl font-bold tracking-tight">
            HOMMM
          </Link>
          <p className="text-xs text-sidebar-foreground/50 mt-1">Panel admina</p>
        </div>

        <NavLinks pathname={pathname} />

        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70"
            onClick={handleLogout}
          >
            Wyloguj
          </Button>
        </div>
      </aside>

      {/* Mobile topbar + sheet */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3">
          <Link href="/admin/dashboard" className="text-lg font-bold">
            HOMMM
          </Link>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm hover:bg-accent" aria-label="Menu">
              ☰
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-4">
              <div className="mb-6">
                <p className="text-xl font-bold">HOMMM</p>
                <p className="text-xs text-sidebar-foreground/50 mt-1">Panel admina</p>
              </div>
              <NavLinks pathname={pathname} onClick={() => setSheetOpen(false)} />
              <div className="mt-8 pt-4 border-t border-sidebar-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  Wyloguj
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
