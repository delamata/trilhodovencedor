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
import type { AttendanceStatus, ClassStatus } from '@/types/database';

export interface NextClassInfo {
  id: string;
  title: string;
  classNumber: number;
  classDate: string;
  startTime: string;
  status: ClassStatus;
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
  canCheckInNow: boolean;
  recentHistory: {
    classId: string;
    title: string;
    classNumber: number;
    classDate: string;
    status: AttendanceStatus;
  }[];
}

export async function getStudentDashboardDataAction(): Promise<StudentDashboardData | null> {
  const user = await requireUser();
  if (!user.memberId || !user.activeEnrollment) return null;

  const supabase = await createClient();
  const today = todayInAppTimezone();

  const [{ data: summary }, { data: nextClass }, { data: historyRows }] = await Promise.all([
    supabase
      .from('trilho_student_summary')
      .select('*')
      .eq('enrollment_id', user.activeEnrollment.enrollmentId)
      .maybeSingle(),
    supabase
      .from('classes')
      .select('id, title, class_number, class_date, start_time, status')
      .eq('course_id', user.activeEnrollment.courseId)
      .neq('status', 'CANCELLED')
      .gte('class_date', today)
      .order('class_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('attendance')
      .select('status, classes(id, title, class_number, class_date)')
      .eq('student_id', user.memberId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const { data: openToday } = await supabase
    .from('classes')
    .select('id')
    .eq('course_id', user.activeEnrollment.courseId)
    .eq('status', 'ATTENDANCE_OPEN')
    .limit(1)
    .maybeSingle();

  const recentHistory = (historyRows ?? [])
    .map((row) => {
      const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      return {
        classId: classRow?.id ?? '',
        title: classRow?.title ?? '—',
        classNumber: classRow?.class_number ?? 0,
        classDate: classRow?.class_date ?? '',
        status: row.status,
      };
    })
    .filter((row) => row.classId);

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
    nextClass: nextClass
      ? {
          id: nextClass.id,
          title: nextClass.title,
          classNumber: nextClass.class_number,
          classDate: nextClass.class_date,
          startTime: nextClass.start_time,
          status: nextClass.status,
        }
      : null,
    canCheckInNow: Boolean(openToday),
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

  const [{ data: summaries }, { data: completedClasses }] = await Promise.all([
    supabase.from('trilho_student_summary').select('*').eq('enrollment_status', 'ACTIVE'),
    supabase
      .from('classes')
      .select('id, class_number, class_date, courses(code)')
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

  const recentClasses = (completedClasses ?? []).slice(-12);
  const classIds = recentClasses.map((c) => c.id);

  const { data: attendanceRows } = classIds.length
    ? await supabase.from('attendance').select('class_id, status').in('class_id', classIds)
    : { data: [] };

  const presenceByClass = computePresenceByClass(
    recentClasses.map((c) => {
      const course = Array.isArray(c.courses) ? c.courses[0] : c.courses;
      return {
        classId: c.id,
        label: `${course?.code ?? ''} · Aula ${c.class_number}`,
        classDate: c.class_date,
      };
    }),
    (attendanceRows ?? []).map((row) => ({ classId: row.class_id, status: row.status })),
  );

  return { metrics, presenceByClass };
}
