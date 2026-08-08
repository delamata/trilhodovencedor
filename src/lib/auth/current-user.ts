import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'ADMIN' | 'PROFESSOR' | 'ALUNO' | 'SEM_ACESSO';

export interface ActiveEnrollmentSummary {
  enrollmentId: string;
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
  teacherCourseIds: string[];
  activeEnrollment: ActiveEnrollmentSummary | null;
  /**
   * Papel efetivo no Trilho do Vencedor. Derivado, nunca armazenado:
   * ADMIN vem de profiles.is_admin; PROFESSOR de estar em
   * teacher_courses; ALUNO de ter matrícula ACTIVE em enrollments.
   * Um mesmo usuário pode ser ADMIN e também professor/aluno — o
   * "role" aqui reflete o de MAIOR privilégio, mas os arrays
   * (teacherCourseIds) e activeEnrollment continuam disponíveis para
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
  let teacherCourseIds: string[] = [];
  let activeEnrollment: ActiveEnrollmentSummary | null = null;

  if (memberId) {
    const [memberResult, teacherResult, enrollmentResult] = await Promise.all([
      supabase.from('members').select('nome').eq('id', memberId).maybeSingle(),
      supabase.from('teacher_courses').select('course_id').eq('teacher_id', memberId),
      supabase
        .from('enrollments')
        .select('id, course_id, courses(code, name)')
        .eq('student_id', memberId)
        .eq('status', 'ACTIVE')
        .maybeSingle(),
    ]);

    memberName = memberResult.data?.nome ?? null;
    teacherCourseIds = (teacherResult.data ?? []).map((row) => row.course_id);

    const enrollment = enrollmentResult.data;
    if (enrollment && enrollment.courses) {
      const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
      if (course) {
        activeEnrollment = {
          enrollmentId: enrollment.id,
          courseId: enrollment.course_id,
          courseCode: course.code,
          courseName: course.name,
        };
      }
    }
  }

  let role: AppRole = 'SEM_ACESSO';
  if (isAdmin) {
    role = 'ADMIN';
  } else if (teacherCourseIds.length > 0) {
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
    teacherCourseIds,
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
