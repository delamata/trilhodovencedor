import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata: Metadata = { title: 'Meu perfil — Trilho do Vencedor' };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
  SEM_ACESSO: 'Sem acesso',
};

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <PageHeader title="Meu perfil" />
      <div className="max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
        <dl className="divide-y divide-border">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted-foreground">Nome</dt>
            <dd className="text-sm font-medium text-foreground">{user.memberName ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted-foreground">E-mail</dt>
            <dd className="text-sm font-medium text-foreground">{user.email ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted-foreground">Papel</dt>
            <dd>
              <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
            </dd>
          </div>
          {user.activeEnrollment ? (
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-muted-foreground">Curso</dt>
              <dd className="text-sm font-medium text-foreground">
                {user.activeEnrollment.courseName}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
