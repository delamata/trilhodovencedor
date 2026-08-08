'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/shared/logo-mark';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/auth/current-user';
import { navItemsForRole } from './nav-items';

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-sidebar lg:px-4 lg:py-6"
    >
      <div className="mb-8 flex items-center gap-2 px-2">
        <LogoMark size={36} />
        <div>
          <p className="text-sm font-semibold leading-tight text-sidebar-foreground">
            Trilho do Vencedor
          </p>
          <p className="text-xs text-muted-foreground">Controle de presença</p>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
