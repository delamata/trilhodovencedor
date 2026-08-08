import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import {
  getCourseAction,
  listActiveStudentsForCourseAction,
  listTeachersForCourseAction,
} from '@/features/courses/actions';
import { getCelulaOptionsAction } from '@/features/students/actions';
import { CourseConfigForm } from '@/features/courses/course-config-form';
import { TeachersPanel } from '@/features/courses/teachers-panel';
import { CourseStudentsSection } from '@/features/courses/course-students-section';

export const metadata: Metadata = { title: 'Curso — Trilho do Vencedor' };

export default async function CursoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const course = await getCourseAction(id);
  if (!course) notFound();

  const [teachers, students, celulaOptions] = await Promise.all([
    listTeachersForCourseAction(id),
    listActiveStudentsForCourseAction(id),
    getCelulaOptionsAction(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={course.name}
        description={`${students.length} aluno${students.length === 1 ? '' : 's'} matriculado${students.length === 1 ? '' : 's'} atualmente`}
      />

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          Configuração do curso
        </h2>
        <CourseConfigForm course={course} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Professores</h2>
        <TeachersPanel courseId={id} teachers={teachers} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Alunos matriculados</h2>
        <CourseStudentsSection
          courseId={id}
          courseName={course.name}
          celulaOptions={celulaOptions}
          students={students}
        />
      </section>
    </div>
  );
}
