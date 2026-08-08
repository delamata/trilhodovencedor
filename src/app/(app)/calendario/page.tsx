import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { ClassCard } from '@/components/shared/class-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isTuesday } from '@/lib/domain/calendar';
import { listCoursesAction } from '@/features/courses/actions';
import { listClassesAction } from '@/features/classes/actions';
import { NewClassDialog } from '@/features/classes/new-class-dialog';
import { BatchImportDialog } from '@/features/classes/batch-import-dialog';
import { ClassRowActions } from '@/features/classes/class-row-actions';
import { CalendarFilters } from '@/features/classes/calendar-filters';

export const metadata: Metadata = { title: 'Calendário — Trilho do Vencedor' };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'PROFESSOR') redirect('/dashboard');

  const { curso, status } = await searchParams;

  const [courses, allClasses] = await Promise.all([listCoursesAction(), listClassesAction()]);

  const generatedFromIds = new Set(
    allClasses.map((c) => c.generated_from_class_id).filter((id): id is string => Boolean(id)),
  );

  const visibleClasses = allClasses.filter((c) => {
    if (curso && c.courseCode !== curso) return false;
    if (status && c.status !== status) return false;
    if (user.role === 'PROFESSOR' && !user.teacherCourseIds.includes(c.course_id)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Calendário"
        description="Aulas de Maturidade e CTL."
        actions={
          user.isAdmin ? (
            <>
              <BatchImportDialog courses={courses} />
              <NewClassDialog courses={courses} />
            </>
          ) : undefined
        }
      />

      <div className="mb-6">
        <CalendarFilters />
      </div>

      {visibleClasses.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma aula encontrada"
          description={
            user.isAdmin
              ? 'Cadastre a primeira aula com o botão "Nova aula" ou importe o calendário em lote.'
              : 'Ainda não há aulas cadastradas para os seus filtros.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleClasses.map((classItem) => (
            <ClassCard
              key={classItem.id}
              data={{
                id: classItem.id,
                courseCode: classItem.courseCode,
                courseName: classItem.courseName,
                classNumber: classItem.class_number,
                title: classItem.title,
                classDate: classItem.class_date,
                startTime: classItem.start_time,
                endTime: classItem.end_time,
                status: classItem.status,
              }}
              actions={
                user.isAdmin ? (
                  <ClassRowActions
                    classId={classItem.id}
                    classTitle={classItem.title}
                    status={classItem.status}
                    courseCode={classItem.courseCode}
                    isTuesday={isTuesday(classItem.class_date)}
                    hasGeneratedCtl={generatedFromIds.has(classItem.id)}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
