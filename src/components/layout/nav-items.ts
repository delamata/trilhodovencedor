import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  LayoutDashboard,
  Layers,
  Settings,
  User,
  Users,
  FileBarChart,
} from 'lucide-react';
import type { AppRole } from '@/lib/auth/current-user';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
  /** Aparece na navegação inferior mobile (só para ALUNO). */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Início',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    mobile: true,
  },
  {
    href: '/turmas',
    label: 'Turmas',
    icon: Layers,
    roles: ['ADMIN', 'PROFESSOR'],
    mobile: true,
  },
  {
    href: '/alunos',
    label: 'Alunos',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    href: '/cursos',
    label: 'Cursos',
    icon: GraduationCap,
    roles: ['ADMIN'],
  },
  {
    href: '/relatorios',
    label: 'Relatórios',
    icon: FileBarChart,
    roles: ['ADMIN'],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ['ADMIN'],
  },
  {
    href: '/perfil',
    label: 'Perfil',
    icon: User,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
    mobile: true,
  },
];

export function navItemsForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function mobileNavItemsForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.mobile && item.roles.includes(role));
}
