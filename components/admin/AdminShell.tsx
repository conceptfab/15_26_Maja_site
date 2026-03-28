'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  CalendarDays,
  CalendarRange,
  Users,
  BarChart3,
  Network,
  Search,
  Settings,
  Map,
  BadgeDollarSign,
  File,
  Mail,
  Menu,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';

import { SECTION_ICONS } from '@/lib/section-icons';

type SectionLink = { slug: string; titlePl: string | null };

const OTHER_NAV_ITEMS = [
  { href: '/admin/reservations', label: 'Rezerwacje', Icon: CalendarDays },
  { href: '/admin/calendar', label: 'Kalendarz', Icon: CalendarRange },
  { href: '/admin/clients', label: 'Klienci', Icon: Users },
  { href: '/admin/pricing', label: 'Cennik', Icon: BadgeDollarSign },
  { href: '/admin/reports', label: 'Raporty', Icon: BarChart3 },
  { href: '/admin/gallery', label: 'Galeria', Icon: ImageIcon },
  { href: '/admin/mailing', label: 'Mailing', Icon: Mail },
  { href: '/admin/site-structure', label: 'Struktura', Icon: Network },
  { href: '/admin/seo', label: 'SEO', Icon: Search },
  { href: '/admin/settings', label: 'Ustawienia', Icon: Settings },
];

function SectionIcon({ slug }: { slug: string }) {
  const Icon = SECTION_ICONS[slug];
  return Icon ? <Icon className="w-4 h-4 shrink-0" /> : <File className="w-4 h-4 shrink-0" />;
}

type Badges = { pendingReservations: number; upcomingCheckIns48h: number } | null;

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
      {count}
    </span>
  );
}

function NavLinks({
  pathname,
  sections,
  onClick,
  large,
  badges,
}: {
  pathname: string;
  sections: SectionLink[];
  onClick?: () => void;
  large?: boolean;
  badges?: Badges;
}) {
  const isContentActive = pathname.startsWith('/admin/content');
  const [contentOpen, setContentOpen] = useState(isContentActive);

  useEffect(() => {
    if (isContentActive) setContentOpen(true);
  }, [isContentActive]);

  const iconCls = large ? 'w-7 h-7 shrink-0' : 'w-4 h-4 shrink-0';
  const itemCls = large ? 'gap-4 px-3 py-3 text-xl' : 'gap-3 px-3 py-2 text-sm';
  const subIconCls = large ? 'w-6 h-6 shrink-0' : 'w-4 h-4 shrink-0';
  const subItemCls = large ? 'gap-3 px-3 py-2.5 text-lg' : 'gap-2 px-2 py-1.5 text-xs';
  const chevronCls = large ? 'w-5 h-5 text-sidebar-foreground/40' : 'w-3 h-3 text-sidebar-foreground/40';

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Panel administracyjny">
      {/* Dashboard */}
      <Link
        href="/admin/dashboard"
        onClick={onClick}
        className={`flex items-center rounded-md transition-colors ${itemCls} ${
          pathname.startsWith('/admin/dashboard')
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        }`}
      >
        <LayoutDashboard className={iconCls} />
        Dashboard
      </Link>

      {/* Treści — rozwijane */}
      <div>
        <button
          type="button"
          onClick={() => setContentOpen((prev) => !prev)}
          className={`flex items-center rounded-md transition-colors w-full text-left ${itemCls} ${
            isContentActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <FileText className={iconCls} />
          <span className="flex-1">Treści</span>
          {contentOpen
            ? <ChevronDown className={chevronCls} />
            : <ChevronRight className={chevronCls} />}
        </button>

        {contentOpen && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
            {sections.map((section) => {
              const href = `/admin/content/${section.slug}`;
              const isActive = pathname === href;
              return (
                <React.Fragment key={section.slug}>
                  <Link
                    href={href}
                    onClick={onClick}
                    className={`flex items-center rounded-md transition-colors ${subItemCls} ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <SectionIcon slug={section.slug} />
                    {section.titlePl || section.slug}
                  </Link>
                  {section.slug === 'miejsce' && (
                    <Link
                      href="/admin/content/miejsca"
                      onClick={onClick}
                      className={`flex items-center rounded-md transition-colors ${subItemCls} ${
                        pathname === '/admin/content/miejsca'
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <Map className={subIconCls} />
                      MIEJSCA
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Pozostałe pozycje */}
      {OTHER_NAV_ITEMS.map((item) => {
        let badgeCount = 0;
        if (badges) {
          if (item.href === '/admin/reservations') badgeCount = badges.pendingReservations;
          if (item.href === '/admin/calendar') badgeCount = badges.upcomingCheckIns48h;
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center rounded-md transition-colors ${itemCls} ${
              pathname.startsWith(item.href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
          >
            <item.Icon className={iconCls} />
            {item.label}
            <NavBadge count={badgeCount} />
          </Link>
        );
      })}
    </nav>
  );
}

type BuildInfo = { branch: string | null; sha: string | null; env: string | null; deployedAt: string | null };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sections, setSections] = useState<SectionLink[]>([]);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [badges, setBadges] = useState<{ pendingReservations: number; upcomingCheckIns48h: number } | null>(null);

  useEffect(() => {
    fetch('/api/content/sections')
      .then((res) => res.ok ? res.json() : [])
      .then((data: SectionLink[]) => setSections(data))
      .catch(() => {});
    fetch('/api/admin/build-info')
      .then((res) => res.ok ? res.json() : null)
      .then((data: BuildInfo | null) => { if (data) setBuildInfo(data); })
      .catch(() => {});
    fetch('/api/admin/notifications')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setBadges(data); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-8 flex flex-col items-center text-center">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Image src="/assets/logo.webp" alt="HOMMM" width={90} height={90} className="object-contain mb-2 [filter:none] hover:[filter:brightness(0.5)_sepia(1)_saturate(700%)_hue-rotate(330deg)] transition-[filter]" draggable={false} />
          </a>
          <p className="text-xl font-bold tracking-tight">HOMMM</p>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Panel admina</p>
        </div>

        <NavLinks pathname={pathname} sections={sections} badges={badges} />

        <div className="mt-auto">
          <div className="flex flex-col items-center pb-3 gap-1.5">
            <a href="https://conceptfab.com" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity [filter:none] hover:[filter:brightness(0.6)_sepia(1)_saturate(600%)_hue-rotate(245deg)]">
              <img src="/assets/cfab_logo_2026.svg" alt="CFAB" className="w-[120px] h-auto" draggable={false} />
            </a>
            <div className="flex flex-col items-center gap-0.5 min-h-[28px]">
              {buildInfo ? (
                <>
                  <span className="text-[11px] font-mono text-sidebar-foreground/60 truncate max-w-[150px]">
                    {buildInfo.branch ?? '—'}{buildInfo.sha ? ` · ${buildInfo.sha}` : ''}
                  </span>
                  {buildInfo.deployedAt && (
                    <span className="text-[10px] font-mono text-sidebar-foreground/40">
                      {new Date(buildInfo.deployedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          </div>
          <div className="pt-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sidebar-foreground/70 gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Wyloguj
            </Button>
          </div>
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
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="dark w-64 bg-sidebar p-4">
              <div className="mb-6 flex flex-col items-center text-center">
                <img src="/assets/hommm.svg" alt="HOMMM" className="w-[110px] h-auto mb-3" />
                <p className="text-xs text-sidebar-foreground/50">Panel admina</p>
              </div>
              <NavLinks pathname={pathname} sections={sections} onClick={() => setSheetOpen(false)} large badges={badges} />
              <div className="mt-8">
                <div className="flex flex-col items-center pb-3 gap-1.5">
                  <a href="https://conceptfab.com" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity [filter:none] hover:[filter:brightness(0.6)_sepia(1)_saturate(600%)_hue-rotate(245deg)]">
                    <img src="/assets/cfab_logo_2026.svg" alt="CFAB" className="w-[110px] h-auto" draggable={false} />
                  </a>
                  <div className="flex flex-col items-center gap-0.5 min-h-[28px]">
                    {buildInfo ? (
                      <>
                        <span className="text-[11px] font-mono text-sidebar-foreground/60 truncate max-w-[150px]">
                          {buildInfo.branch ?? '—'}{buildInfo.sha ? ` · ${buildInfo.sha}` : ''}
                        </span>
                        {buildInfo.deployedAt && (
                          <span className="text-[10px] font-mono text-sidebar-foreground/40">
                            {new Date(buildInfo.deployedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="pt-4 border-t border-sidebar-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-center gap-4 text-xl py-3 h-auto"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-7 h-7 shrink-0" />
                    Wyloguj
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
