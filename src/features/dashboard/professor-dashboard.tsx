import { BookOpen } from 'lucide-react';
import { ClassCard } from '@/components/shared/class-card';
import { EmptyState } from '@/components/shared/empty-state';
import { todayInAppTimezone } from '@/lib/format';
import type { ClassSessionListItem } from '@/features/class-sessions/actions';

export function ProfessorDashboard({
  nome,
  upcomingClasses,
}: {
  nome: string;
  upcomingClasses: ClassSessionListItem[];
}) {
  const firstName = nome.split(' ')[0] ?? nome;
  const today = todayInAppTimezone();
  const next = upcomingClasses.filter((c) => c.classDate >= today).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground lg:text-2xl">Olá, {firstName}.</h1>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Próximas aulas</h2>
        {next.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhuma aula agendada nas suas turmas." />
        ) : (
          <div className="space-y-3">
            {next.map((c) => (
              <ClassCard
                key={c.id}
                data={{
                  id: c.id,
                  courseCode: c.courseCode,
                  courseName: c.courseName,
                  cohortName: c.cohortName,
                  lessonCode: c.lessonCode,
                  lessonTitle: c.lessonTitle,
                  classDate: c.classDate,
                  startTime: c.startTime,
                  endTime: c.endTime,
                  status: c.status,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
