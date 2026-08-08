import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listUpcomingClassSessionsForTeacherAction } from '@/features/class-sessions/actions';
import { getAdminDashboardDataAction, getStudentDashboardDataAction } from '@/features/dashboard/actions';
import { AdminDashboard } from '@/features/dashboard/admin-dashboard';
import { ProfessorDashboard } from '@/features/dashboard/professor-dashboard';
import { StudentDashboard } from '@/features/dashboard/student-dashboard';

export const metadata: Metadata = { title: 'Início — Trilho do Vencedor' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.isAdmin) {
    const data = await getAdminDashboardDataAction();
    return <AdminDashboard data={data} />;
  }

  if (user.role === 'PROFESSOR') {
    const upcomingClasses = await listUpcomingClassSessionsForTeacherAction(user.teacherCohortIds);
    return <ProfessorDashboard nome={user.memberName ?? ''} upcomingClasses={upcomingClasses} />;
  }

  if (user.role === 'ALUNO') {
    const data = await getStudentDashboardDataAction();
    if (data) return <StudentDashboard data={data} />;
  }

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
