/**
 * Tipos do schema Supabase usados pelo Trilho do Vencedor.
 *
 * Escrito à mão (não gerado por `supabase gen types`) porque este
 * ambiente de desenvolvimento não tem acesso ao projeto Supabase real.
 * Mantenha em sincronia com supabase/migrations/*.sql.
 *
 * Assim que tiver acesso ao projeto Supabase, prefira gerar/atualizar
 * este arquivo com:
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.ts
 * (adaptando o cabeçalho de comentário acima, se preferir manter as notas).
 */

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TRANSFERRED';
export type ClassStatus = 'SCHEDULED' | 'ATTENDANCE_OPEN' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENTE' | 'FALTA' | 'FALTA_JUSTIFICADA' | 'ATRASO';
export type AttendanceSource = 'STUDENT_CHECKIN' | 'TEACHER' | 'ADMIN' | 'SYSTEM';
export type EnrollmentEndStatus = Exclude<EnrollmentStatus, 'ACTIVE'>;

// Tabelas do app Oikos que reaproveitamos (somente leitura pelo Trilho;
// nunca alteradas por este projeto).
export type MembersRow = {
  id: string;
  nome: string;
  tipo: string;
  celula: string;
  posicao: string;
  batizado: string;
  encontro: string;
  civil: string;
  nasc: string | null;
  tel: string | null;
  maturidade: string;
  ctl: string;
  seminario: string;
  ceifeiros: string;
  active: boolean;
  situacao_saida: string;
  saida_detalhe: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfilesRow = {
  user_id: string;
  member_id: string | null;
  is_admin: boolean;
  created_at: string;
};

export type CelulaHierarquiaRow = {
  celula: string;
  discipulador_id: string | null;
  obreiro_id: string | null;
};

export type CoursesRow = {
  id: string;
  code: string;
  name: string;
  max_absences: number;
  justified_absence_counts_towards_limit: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type EnrollmentsRow = {
  id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  ended_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherCoursesRow = {
  teacher_id: string;
  course_id: string;
  created_at: string;
};

export type ClassesRow = {
  id: string;
  course_id: string;
  class_number: number;
  title: string;
  class_date: string;
  start_time: string;
  end_time: string;
  status: ClassStatus;
  notes: string | null;
  attendance_open_at: string | null;
  attendance_close_at: string | null;
  generated_from_class_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceSessionsRow = {
  id: string;
  class_id: string;
  token_hash: string;
  short_code_hash: string;
  opened_by: string | null;
  opened_at: string;
  expires_at: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
};

export type AttendanceRow = {
  id: string;
  class_id: string;
  student_id: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  checked_in_at: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceHistoryRow = {
  id: string;
  attendance_id: string;
  old_status: AttendanceStatus | null;
  new_status: AttendanceStatus;
  changed_by: string | null;
  reason: string | null;
  changed_at: string;
};

export type AuditLogsRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TrilhoStudentSummaryRow = {
  enrollment_id: string;
  student_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  max_absences: number;
  justified_absence_counts_towards_limit: boolean;
  enrollment_status: EnrollmentStatus;
  enrolled_at: string;
  ended_at: string | null;
  classes_recorded: number;
  presences: number;
  absences: number;
  justified_absences: number;
  late_count: number;
  counted_absences: number;
  absences_remaining: number;
};

export type CheckinAttendanceResult = {
  class_id: string;
  course_code: string;
  course_name: string;
  class_title: string;
  class_number: number;
};

export type OpenAttendanceSessionResult = {
  session_id: string;
  short_code: string;
  token: string;
  expires_at: string;
};

export type CloseAttendanceSessionResult = {
  marked_present: number;
  marked_absent: number;
};

// Minimal Database type: cobre só o que a aplicação usa via
// supabase-js (Table/Row generics). Não é gerado automaticamente, veja
// nota no topo do arquivo.
export interface Database {
  public: {
    Tables: {
      members: {
        Row: MembersRow;
        Insert: Partial<MembersRow>;
        Update: Partial<MembersRow>;
        Relationships: [];
      };
      celula_hierarquia: {
        Row: CelulaHierarquiaRow;
        Insert: Partial<CelulaHierarquiaRow>;
        Update: Partial<CelulaHierarquiaRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfilesRow;
        Insert: Partial<ProfilesRow>;
        Update: Partial<ProfilesRow>;
        Relationships: [
          {
            foreignKeyName: 'profiles_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      courses: {
        Row: CoursesRow;
        Insert: Partial<CoursesRow>;
        Update: Partial<CoursesRow>;
        Relationships: [];
      };
      enrollments: {
        Row: EnrollmentsRow;
        Insert: Partial<EnrollmentsRow>;
        Update: Partial<EnrollmentsRow>;
        Relationships: [
          {
            foreignKeyName: 'enrollments_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_courses: {
        Row: TeacherCoursesRow;
        Insert: Partial<TeacherCoursesRow>;
        Update: Partial<TeacherCoursesRow>;
        Relationships: [
          {
            foreignKeyName: 'teacher_courses_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_courses_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      classes: {
        Row: ClassesRow;
        Insert: Partial<ClassesRow>;
        Update: Partial<ClassesRow>;
        Relationships: [
          {
            foreignKeyName: 'classes_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classes_generated_from_class_id_fkey';
            columns: ['generated_from_class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_sessions: {
        Row: AttendanceSessionsRow;
        Insert: Partial<AttendanceSessionsRow>;
        Update: Partial<AttendanceSessionsRow>;
        Relationships: [
          {
            foreignKeyName: 'attendance_sessions_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance: {
        Row: AttendanceRow;
        Insert: Partial<AttendanceRow>;
        Update: Partial<AttendanceRow>;
        Relationships: [
          {
            foreignKeyName: 'attendance_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_history: {
        Row: AttendanceHistoryRow;
        Insert: Partial<AttendanceHistoryRow>;
        Update: Partial<AttendanceHistoryRow>;
        Relationships: [
          {
            foreignKeyName: 'attendance_history_attendance_id_fkey';
            columns: ['attendance_id'];
            isOneToOne: false;
            referencedRelation: 'attendance';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: AuditLogsRow;
        Insert: Partial<AuditLogsRow>;
        Update: Partial<AuditLogsRow>;
        Relationships: [];
      };
    };
    Views: {
      trilho_student_summary: { Row: TrilhoStudentSummaryRow; Relationships: [] };
    };
    Functions: {
      trilho_member_id: { Args: Record<string, never>; Returns: string | null };
      trilho_is_admin: { Args: Record<string, never>; Returns: boolean };
      trilho_enroll_student: {
        Args: { p_student_id: string; p_course_id: string };
        Returns: string;
      };
      trilho_change_enrollment: {
        Args: { p_student_id: string; p_new_course_id: string; p_end_status?: EnrollmentEndStatus };
        Returns: string;
      };
      trilho_end_enrollment: {
        Args: { p_enrollment_id: string; p_status: EnrollmentEndStatus };
        Returns: undefined;
      };
      trilho_create_class: {
        Args: {
          p_course_id: string;
          p_class_number: number;
          p_title: string;
          p_class_date: string;
          p_start_time: string;
          p_end_time: string;
          p_notes?: string | null;
          p_also_create_ctl?: boolean;
          p_ctl_class_number?: number | null;
          p_ctl_title?: string | null;
          p_ctl_start_time?: string | null;
          p_ctl_end_time?: string | null;
        };
        Returns: string;
      };
      trilho_generate_ctl_from_class: {
        Args: {
          p_maturidade_class_id: string;
          p_ctl_class_number?: number | null;
          p_ctl_title?: string | null;
          p_ctl_start_time?: string | null;
          p_ctl_end_time?: string | null;
        };
        Returns: string;
      };
      trilho_cancel_class: {
        Args: { p_class_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      trilho_open_attendance_session: {
        Args: { p_class_id: string; p_duration_minutes?: number };
        Returns: OpenAttendanceSessionResult[];
      };
      trilho_close_attendance_session: {
        Args: { p_class_id: string };
        Returns: CloseAttendanceSessionResult[];
      };
      trilho_checkin_attendance: {
        Args: { p_value: string };
        Returns: CheckinAttendanceResult[];
      };
      trilho_mark_attendance: {
        Args: {
          p_class_id: string;
          p_student_id: string;
          p_status: AttendanceStatus;
          p_reason?: string | null;
        };
        Returns: string;
      };
    };
  };
}
