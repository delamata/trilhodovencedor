'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyRpcError } from '@/lib/errors';
import { mergeRosterWithAttendance, type RosterEntry } from '@/lib/domain/roster';
import {
  checkinSchema,
  markAttendanceSchema,
  type MarkAttendanceInput,
} from '@/validations/attendance';
import type { ClassStatus } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface ClassDetail {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  classNumber: number;
  title: string;
  classDate: string;
  startTime: string;
  endTime: string;
  status: ClassStatus;
  notes: string | null;
}

export async function getClassDetailAction(classId: string): Promise<ClassDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('classes')
    .select('*, courses(code, name)')
    .eq('id', classId)
    .maybeSingle();

  if (!data) return null;

  const course = Array.isArray(data.courses) ? data.courses[0] : data.courses;

  return {
    id: data.id,
    courseId: data.course_id,
    courseCode: course?.code ?? '—',
    courseName: course?.name ?? '—',
    classNumber: data.class_number,
    title: data.title,
    classDate: data.class_date,
    startTime: data.start_time,
    endTime: data.end_time,
    status: data.status,
    notes: data.notes,
  };
}

export type RosterRow = RosterEntry;

/** Lista completa dos alunos ativos do curso desta aula, com o status de presença (ou "PENDENTE"). */
export async function getClassRosterAction(classId: string): Promise<RosterRow[]> {
  const supabase = await createClient();

  const { data: classRow } = await supabase
    .from('classes')
    .select('course_id')
    .eq('id', classId)
    .maybeSingle();

  if (!classRow) return [];

  const [{ data: enrollments }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('student_id, members(nome)')
      .eq('course_id', classRow.course_id)
      .eq('status', 'ACTIVE'),
    supabase
      .from('attendance')
      .select('id, student_id, status, source, checked_in_at')
      .eq('class_id', classId),
  ]);

  return mergeRosterWithAttendance(
    (enrollments ?? []).map((enrollment) => {
      const member = Array.isArray(enrollment.members) ? enrollment.members[0] : enrollment.members;
      return { studentId: enrollment.student_id, nome: member?.nome ?? '—' };
    }),
    (attendanceRows ?? []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      status: row.status,
      source: row.source,
      checkedInAt: row.checked_in_at,
    })),
  );
}

export interface OpenSessionResult {
  sessionId: string;
  shortCode: string;
  token: string;
  expiresAt: string;
  checkinUrl: string;
}

/**
 * Abre a chamada. O código/token em texto puro só existe aqui, no
 * retorno desta chamada — o banco só guarda o hash (seção 22 da
 * spec), então esta é a ÚNICA vez que o app consegue exibi-los.
 */
export async function openAttendanceSessionAction(
  classId: string,
  durationMinutes = 90,
): Promise<ActionResult & { session?: OpenSessionResult }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('trilho_open_attendance_session', {
    p_class_id: classId,
    p_duration_minutes: durationMinutes,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  const row = data?.[0];
  if (!row) {
    return { success: false, message: 'Não foi possível abrir a chamada.' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  revalidatePath(`/aulas/${classId}`);
  revalidatePath('/calendario');

  return {
    success: true,
    message: 'Chamada aberta com sucesso.',
    session: {
      sessionId: row.session_id,
      shortCode: row.short_code,
      token: row.token,
      expiresAt: row.expires_at,
      checkinUrl: `${siteUrl}/presenca?token=${row.token}`,
    },
  };
}

export async function closeAttendanceSessionAction(classId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('trilho_close_attendance_session', {
    p_class_id: classId,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  const row = data?.[0];

  revalidatePath(`/aulas/${classId}`);
  revalidatePath('/calendario');
  revalidatePath('/aulas');

  return {
    success: true,
    message: `Chamada encerrada. ${row?.marked_present ?? 0} presente(s), ${row?.marked_absent ?? 0} marcado(s) como falta.`,
  };
}

export async function checkinAction(
  value: string,
): Promise<ActionResult & { classTitle?: string; courseName?: string }> {
  const parsed = checkinSchema.safeParse({ value });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Código inválido.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trilho_checkin_attendance', {
    p_value: parsed.data.value,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  const row = data?.[0];
  if (!row) {
    return { success: false, message: 'Não foi possível confirmar sua presença.' };
  }

  revalidatePath('/aulas');
  revalidatePath('/dashboard');

  return {
    success: true,
    message: 'Presença registrada com sucesso.',
    classTitle: row.class_title,
    courseName: row.course_name,
  };
}

export async function markAttendanceAction(input: MarkAttendanceInput): Promise<ActionResult> {
  const parsed = markAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_mark_attendance', {
    p_class_id: parsed.data.classId,
    p_student_id: parsed.data.studentId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath(`/aulas/${parsed.data.classId}`);

  return { success: true, message: 'Presença atualizada com sucesso.' };
}
