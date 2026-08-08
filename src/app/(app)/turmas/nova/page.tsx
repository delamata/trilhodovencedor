import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listActiveCoursesAction } from '@/features/cohorts/actions';
import { CreateCohortForm } from '@/features/cohorts/create-cohort-form';

export const metadata: Metadata = { title: 'Nova turma — Trilho do Vencedor' };

export default async function NovaTurmaPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const { curso } = await searchParams;
  const courses = await listActiveCoursesAction();

  return (
    <div>
      <PageHeader title="Nova turma" description="Crie uma turma vinculada a um curso." />
      <CreateCohortForm courses={courses} defaultCourseId={curso} />
    </div>
  );
}
