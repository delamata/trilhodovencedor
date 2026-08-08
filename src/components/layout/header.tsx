'use client';

import { LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogoMark } from '@/components/shared/logo-mark';
import { signOutAction } from '@/features/auth/actions';
import type { CurrentUser } from '@/lib/auth/current-user';

const ROLE_LABEL: Record<CurrentUser['role'], string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
  SEM_ACESSO: 'Sem acesso',
};

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Header({ user }: { user: CurrentUser }) {
  const displayName = user.memberName ?? user.email ?? 'Usuário';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <LogoMark size={28} />
        <span className="text-sm font-semibold">Trilho do Vencedor</span>
      </div>

      <div className="hidden lg:block" />

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm hover:bg-accent"
          aria-label={`Menu do usuário ${displayName}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className="text-xs text-white"
              style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
              {initials(user.memberName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block max-w-[10rem] truncate font-medium leading-tight">
              {displayName}
            </span>
            <Badge variant="secondary" className="mt-0.5 h-4 px-1.5 text-[10px] leading-none">
              {ROLE_LABEL[user.role]}
            </Badge>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem render={<a href="/perfil" />}>Meu perfil</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => signOutAction()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
