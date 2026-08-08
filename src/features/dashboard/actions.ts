'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/current-user';
import { getSituacao, type Situacao } from '@/lib/domain/situacao';
import {
  computeAdminDashboardMetrics,
  computePresenceByClass,
  type AdminDashboardMetrics,
  type PresenceByClassPoint,
} from '@/lib/domain/dashboard-metrics';
import { todayInAppTimezone } from '@/lib/format';
import type { AttendanceStatus, ClassSessionStatus } from '@/types/database';

export interface NextClassInfo {
  id: string;
  lessonCode: string;
  lessonTitle: string;
  classDate: string;
  startTime: string;
  status: ClassSessionStatus;
}

export interface StudentDashboardData {
  nome: string;
  courseCode: string;
  courseName: string;
  presences: number;
  classesRecorded: number;
  absences: number;
  countedAbsences: number;
  maxAbsences: number;
  absencesRemaining: number;
  situacao: Situacao;
  nextClass: NextClassInfo | null;
  recentHistory: {
    classSessionId: string;
    lessonCode: string;
    lessonTitle: string;
    classDate: string;
    status: AttendanceStatus;
  }[];
}

export async function getStudentDashboardDataAction(): Promise<StudentDashboardData | null> {
  const user = await requireUser();
  if (!user.memberId || !user.activeEnrollment) return null;

  const supabase = await createClient();
  const today = todayInAppTimezone();
  const cohortId = user.activeEnrollment.cohortId;

  const [{ data: summary }, { data: nextClass }, { data: historyRows }] = await Promise.all([
    supabase
      .from('trilho_student_summary')
      .select('*')
      .eq('enrollment_id', user.activeEnrollment.enrollmentId)
      .maybeSingle(),
    supabase
      .from('class_sessions')
      .select('id, class_date, start_time, status, lesson_templates(lesson_code, title)')
      .eq('cohort_id', cohortId)
      .neq('status', 'CANCELLED')
      .gte('class_date', today)
      .order('class_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('attendance')
      .select(
        'status, class_sessions(id, class_date, lesson_templates(lesson_code, title))',
      )
      .eq('student_id', user.memberId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recentHistory = (historyRows ?? [])
    .map((row) => {
      const session = Array.isArray(row.class_sessions) ? row.class_sessions[0] : row.class_sessions;
      const lesson = session
        ? Array.isArray(session.lesson_templates)
          ? session.lesson_templates[0]
          : session.lesson_templates
        : null;
      return {
        classSessionId: session?.id ?? '',
        lessonCode: lesson?.lesson_code ?? '—',
        lessonTitle: lesson?.title ?? '—',
        classDate: session?.class_date ?? '',
        status: row.status,
      };
    })
    .filter((row) => row.classSessionId);

  const nextLesson = nextClass
    ? Array.isArray(nextClass.lesson_templates)
      ? nextClass.lesson_templates[0]
      : nextClass.lesson_templates
    : null;

  return {
    nome: user.memberName ?? '',
    courseCode: user.activeEnrollment.courseCode,
    courseName: user.activeEnrollment.courseName,
    presences: summary?.presences ?? 0,
    classesRecorded: summary?.classes_recorded ?? 0,
    absences: summary?.absences ?? 0,
    countedAbsences: summary?.counted_absences ?? 0,
    maxAbsences: summary?.max_absences ?? 0,
    absencesRemaining: summary?.absences_remaining ?? 0,
    situacao: getSituacao(summary?.absences_remaining ?? 0),
    nextClass:
      nextClass && nextLesson
        ? {
            id: nextClass.id,
            lessonCode: nextLesson.lesson_code,
            lessonTitle: nextLesson.title,
            classDate: nextClass.class_date,
            startTime: nextClass.start_time,
            status: nextClass.status,
          }
        : null,
    recentHistory,
  };
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  presenceByClass: PresenceByClassPoint[];
}

export async function getAdminDashboardDataAction(): Promise<AdminDashboardData> {
  await requireUser();
  const supabase = await createClient();

  const [{ data: summaries }, { data: completedSessions }] = await Promise.all([
    supabase.from('trilho_student_summary').select('*').eq('enrollment_status', 'ACTIVE'),
    supabase
      .from('class_sessions')
      .select('id, class_date, lesson_templates(lesson_code), cohorts(courses(code))')
      .eq('status', 'COMPLETED')
      .order('class_date', { ascending: true }),
  ]);

  const metrics = computeAdminDashboardMetrics(
    (summaries ?? []).map((s) => ({
      courseCode: s.course_code,
      presences: s.presences,
      absences: s.absences,
      classesRecorded: s.classes_recorded,
      situacao: getSituacao(s.absences_remaining),
    })),
  );

  const recentSessions = (completedSessions ?? []).slice(-12);
  const sessionIds = recentSessions.map((s) => s.id);

  const { data: attendanceRows } = sessionIds.length
    ? await supabase.from('attendance').select('class_session_id, status').in('class_session_id', sessionIds)
    : { data: [] };

  const presenceByClass = computePresenceByClass(
    recentSessions.map((s) => {
      const cohort = Array.isArray(s.cohorts) ? s.cohorts[0] : s.cohorts;
      const course = cohort?.courses
        ? Array.isArray(cohort.courses)
          ? cohort.courses[0]
          : cohort.courses
        : null;
      const lesson = Array.isArray(s.lesson_templates) ? s.lesson_templates[0] : s.lesson_templates;
      return {
        classSessionId: s.id,
        label: `${course?.code ?? ''} · ${lesson?.lesson_code ?? ''}`,
        classDate: s.class_date,
      };
    }),
    (attendanceRows ?? []).map((row) => ({
      classSessionId: row.class_session_id,
      status: row.status,
    })),
  );

  return { metrics, presenceByClass };
}
