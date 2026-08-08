import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { getCurrentUser } from '@/lib/auth/current-user';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-svh w-full">
      <Sidebar role={user.role} />
      <div className="flex min-h-svh flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          {user.role === 'SEM_ACESSO' ? <NoAccessNotice /> : children}
        </main>
      </div>
      <BottomNav role={user.role} />
    </div>
  );
}

function NoAccessNotice() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Acesso ainda não liberado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu login está ativo, mas ainda não há matrícula, turma ou permissão de administrador
        vinculada a este usuário. Fale com a administração do Trilho do Vencedor.
      </p>
    </div>
  );
}
