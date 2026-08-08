import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listCoursesAction } from '@/features/courses/actions';

export const metadata: Metadata = { title: 'Cursos — Trilho do Vencedor' };

export default async function CursosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const courses = await listCoursesAction();

  return (
    <div>
      <PageHeader title="Cursos" description="Maturidade e CTL — configuração de limite de faltas." />

      {courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum curso encontrado"
          description="Rode as migrations e o seed (supabase/seed/01_courses.sql) no projeto Supabase para criar Maturidade e CTL."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/cursos/${course.id}`}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{course.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Código: {course.code}</p>
                </div>
                <Badge variant={course.active ? 'secondary' : 'outline'}>
                  {course.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Limite de faltas</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {course.max_absences} faltas
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Falta justificada</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {course.justified_absence_counts_towards_limit
                      ? 'Conta para o limite'
                      : 'Não conta para o limite'}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
