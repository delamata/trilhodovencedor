import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { ClassCard } from '@/components/shared/class-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { todayInAppTimezone } from '@/lib/format';
import { listClassesAction } from '@/features/classes/actions';

export const metadata: Metadata = { title: 'Aulas — Trilho do Vencedor' };

export default async function AulasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allClasses = await listClassesAction();
  const today = todayInAppTimezone();

  const scoped = allClasses.filter((classItem) => {
    if (user.isAdmin) return true;
    if (user.role === 'PROFESSOR') return user.teacherCourseIds.includes(classItem.course_id);
    if (user.role === 'ALUNO') return classItem.course_id === user.activeEnrollment?.courseId;
    return false;
  });

  const upcoming = scoped.filter((c) => c.class_date >= today && c.status !== 'CANCELLED');
  const past = scoped
    .filter((c) => c.class_date < today || c.status === 'CANCELLED')
    .sort((a, b) => (a.class_date < b.class_date ? 1 : -1));

  return (
    <div className="space-y-8">
      <PageHeader title="Aulas" description="Próximas aulas e histórico." />

      {scoped.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma aula encontrada"
          description={
            user.role === 'ALUNO' && !user.activeEnrollment
              ? 'Você ainda não possui matrícula ativa em nenhum curso.'
              : undefined
          }
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Próximas aulas</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="Nenhuma aula agendada." />
            ) : (
              <div className="space-y-3">
                {upcoming.map((c) => (
                  <ClassCard
                    key={c.id}
                    data={{
                      id: c.id,
                      courseCode: c.courseCode,
                      courseName: c.courseName,
                      classNumber: c.class_number,
                      title: c.title,
                      classDate: c.class_date,
                      startTime: c.start_time,
                      endTime: c.end_time,
                      status: c.status,
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Histórico</h2>
              <div className="space-y-3">
                {past.map((c) => (
                  <ClassCard
                    key={c.id}
                    data={{
                      id: c.id,
                      courseCode: c.courseCode,
                      courseName: c.courseName,
                      classNumber: c.class_number,
                      title: c.title,
                      classDate: c.class_date,
                      startTime: c.start_time,
                      endTime: c.end_time,
                      status: c.status,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
