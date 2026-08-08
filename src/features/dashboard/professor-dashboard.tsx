import { BookOpen } from 'lucide-react';
import { ClassCard } from '@/components/shared/class-card';
import { EmptyState } from '@/components/shared/empty-state';
import { todayInAppTimezone } from '@/lib/format';
import type { ClassListItem } from '@/features/classes/actions';

export function ProfessorDashboard({
  nome,
  upcomingClasses,
}: {
  nome: string;
  upcomingClasses: ClassListItem[];
}) {
  const firstName = nome.split(' ')[0] ?? nome;
  const today = todayInAppTimezone();
  const next = upcomingClasses.filter((c) => c.class_date >= today).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground lg:text-2xl">Olá, {firstName}.</h1>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Próximas aulas</h2>
        {next.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhuma aula agendada nos seus cursos." />
        ) : (
          <div className="space-y-3">
            {next.map((c) => (
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
      </div>
    </div>
  );
}
