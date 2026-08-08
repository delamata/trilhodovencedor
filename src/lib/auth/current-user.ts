import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'ADMIN' | 'PROFESSOR' | 'ALUNO' | 'SEM_ACESSO';

export interface ActiveEnrollmentSummary {
  enrollmentId: string;
  cohortId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
}

export interface CurrentUser {
  userId: string;
  email: string | null;
  memberId: string | null;
  memberName: string | null;
  isAdmin: boolean;
  teacherCohortIds: string[];
  activeEnrollment: ActiveEnrollmentSummary | null;
  /**
   * Papel efetivo no Trilho do Vencedor. Derivado, nunca armazenado:
   * ADMIN vem de profiles.is_admin; PROFESSOR de estar em
   * teacher_cohorts; ALUNO de ter matrícula ACTIVE em enrollments.
   * Um mesmo usuário pode ser ADMIN e também professor/aluno — o
   * "role" aqui reflete o de MAIOR privilégio, mas os arrays
   * (teacherCohortIds) e activeEnrollment continuam disponíveis para
   * quem precisar do detalhe.
   */
  role: AppRole;
}

/**
 * Resolve o usuário autenticado da requisição atual (via cookies de
 * sessão) e seu papel no Trilho do Vencedor. Nunca aceita um ID vindo
 * do cliente — tudo é derivado de auth.uid() no servidor.
 *
 * Retorna null se não houver sessão autenticada.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('member_id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  const memberId = profile?.member_id ?? null;
  const isAdmin = profile?.is_admin ?? false;

  let memberName: string | null = null;
  let teacherCohortIds: string[] = [];
  let activeEnrollment: ActiveEnrollmentSummary | null = null;

  if (memberId) {
    const [memberResult, teacherResult, enrollmentResult] = await Promise.all([
      supabase.from('members').select('nome').eq('id', memberId).maybeSingle(),
      supabase.from('teacher_cohorts').select('cohort_id').eq('teacher_id', memberId),
      supabase
        .from('enrollments')
        .select('id, cohort_id, cohorts(course_id, courses(code, name))')
        .eq('student_id', memberId)
        .eq('status', 'ACTIVE')
        .maybeSingle(),
    ]);

    memberName = memberResult.data?.nome ?? null;
    teacherCohortIds = (teacherResult.data ?? []).map((row) => row.cohort_id);

    const enrollment = enrollmentResult.data;
    if (enrollment && enrollment.cohorts) {
      const cohort = Array.isArray(enrollment.cohorts) ? enrollment.cohorts[0] : enrollment.cohorts;
      const course = cohort?.courses
        ? Array.isArray(cohort.courses)
          ? cohort.courses[0]
          : cohort.courses
        : null;
      if (cohort && course) {
        activeEnrollment = {
          enrollmentId: enrollment.id,
          cohortId: enrollment.cohort_id,
          courseId: cohort.course_id,
          courseCode: course.code,
          courseName: course.name,
        };
      }
    }
  }

  let role: AppRole = 'SEM_ACESSO';
  if (isAdmin) {
    role = 'ADMIN';
  } else if (teacherCohortIds.length > 0) {
    role = 'PROFESSOR';
  } else if (activeEnrollment) {
    role = 'ALUNO';
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    memberId,
    memberName,
    isAdmin,
    teacherCohortIds,
    activeEnrollment,
    role,
  };
}

/** Lança se não houver usuário autenticado. Use em páginas/rotas protegidas. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('NAO_AUTENTICADO');
  }
  return user;
}

/** Lança se o usuário autenticado não for ADMIN. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new Error('SEM_PERMISSAO');
  }
  return user;
}
