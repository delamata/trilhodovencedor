/**
 * Tipos do schema Supabase usados pelo Trilho do Vencedor (v2 — Curso
 * != Turma).
 *
 * Escrito à mão (não gerado por `supabase gen types`) porque este
 * ambiente de desenvolvimento não tem acesso a rodar a CLI contra o
 * projeto real. Mantenha em sincronia com supabase/migrations/*.sql.
 *
 * IMPORTANTE: todo Row/Insert/Update precisa ser `type X = {...}`,
 * nunca `interface X {...}` — ver
 * memory "Supabase Database type must use type, not interface":
 * interfaces não recebem assinatura de índice implícita e o
 * postgrest-js resolve o schema inteiro para `never` silenciosamente.
 */

export type CohortStatus = 'PLANNED' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
export type AttendanceIdentificationMode = 'NAME_PHONE_SUFFIX' | 'STUDENT_PIN';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED_OUT' | 'CANCELLED';
export type AcademicResult = 'PENDING' | 'APPROVED' | 'NOT_APPROVED';
export type ClassSessionStatus = 'SCHEDULED' | 'ATTENDANCE_OPEN' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENTE' | 'FALTA' | 'FALTA_JUSTIFICADA' | 'ATRASO';
export type AttendanceSource = 'STUDENT_CHECKIN' | 'PUBLIC_CHECKIN' | 'TEACHER' | 'ADMIN' | 'SYSTEM';

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

// ---------------------------------------------------------------------
// Trilho do Vencedor v2
// ---------------------------------------------------------------------
export type CoursesRow = {
  id: string;
  code: string;
  name: string;
  lesson_code_prefix: string;
  max_absences: number;
  justified_absence_counts_towards_limit: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CohortsRow = {
  id: string;
  course_id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: CohortStatus;
  previous_cohort_id: string | null;
  next_ctl_cohort_id: string | null;
  public_attendance_enabled: boolean;
  public_attendance_token_hash: string | null;
  public_attendance_token_created_at: string | null;
  attendance_identification_mode: AttendanceIdentificationMode;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonTemplatesRow = {
  id: string;
  course_id: string;
  module_number: number;
  lesson_number: number;
  lesson_code: string;
  title: string;
  description: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClassSessionsRow = {
  id: string;
  cohort_id: string;
  lesson_template_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  status: ClassSessionStatus;
  attendance_opened_at: string | null;
  attendance_closed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherCohortsRow = {
  teacher_id: string;
  cohort_id: string;
  created_at: string;
};

export type EnrollmentsRow = {
  id: string;
  student_id: string;
  cohort_id: string;
  status: EnrollmentStatus;
  academic_result: AcademicResult;
  enrolled_at: string;
  completed_at: string | null;
  dropped_out_at: string | null;
  dropout_reason: string | null;
  dropout_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceRow = {
  id: string;
  class_session_id: string;
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

export type PublicCheckinAttemptsRow = {
  id: string;
  cohort_id: string | null;
  ip_hash: string;
  kind: 'SEARCH' | 'CHECKIN';
  created_at: string;
};

export type TrilhoStudentSummaryRow = {
  enrollment_id: string;
  student_id: string;
  cohort_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  cohort_code: string;
  cohort_name: string;
  max_absences: number;
  justified_absence_counts_towards_limit: boolean;
  enrollment_status: EnrollmentStatus;
  academic_result: AcademicResult;
  enrolled_at: string;
  completed_at: string | null;
  dropped_out_at: string | null;
  classes_recorded: number;
  presences: number;
  absences: number;
  justified_absences: number;
  late_count: number;
  counted_absences: number;
  absences_remaining: number;
};

export type TrilhoDropoutReportRow = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  course_code: string;
  course_name: string;
  cohort_id: string;
  cohort_code: string;
  cohort_name: string;
  enrolled_at: string;
  dropped_out_at: string;
  dropout_reason: string | null;
  dropout_notes: string | null;
  classes_recorded_until_dropout: number;
  presences: number;
  absences: number;
};

// ---------------------------------------------------------------------
// Resultados de funções RPC
// ---------------------------------------------------------------------
export type AddModuleResult = {
  lesson1_id: string;
  lesson2_id: string;
  lesson1_code: string;
  lesson2_code: string;
};

export type RegeneratePublicTokenResult = { token: string };

export type CloseClassSessionResult = { marked_present: number; marked_absent: number };

export type FinalizeCohortResult = {
  approved_count: number;
  not_approved_count: number;
  dropped_out_count: number;
  promoted_count: number;
};

export type PublicGetStatusResult = {
  cohort_id: string;
  course_name: string;
  cohort_name: string;
  has_open_session: boolean;
  class_session_id: string | null;
  lesson_code: string | null;
  lesson_title: string | null;
  class_date: string | null;
  start_time: string | null;
  next_class_date: string | null;
};

export type PublicSearchStudentsResult = { student_id: string; display_name: string };

export type PublicCheckinResult = {
  class_session_id: string;
  course_name: string;
  cohort_name: string;
  lesson_code: string;
  lesson_title: string;
  class_date: string;
  presences: number;
  absences: number;
  justified_absences: number;
  max_absences: number;
  absences_remaining: number;
  attendance_pct: number;
};

// ---------------------------------------------------------------------
// Database — cobre só o que a aplicação usa via supabase-js.
// ---------------------------------------------------------------------
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
      cohorts: {
        Row: CohortsRow;
        Insert: Partial<CohortsRow>;
        Update: Partial<CohortsRow>;
        Relationships: [
          {
            foreignKeyName: 'cohorts_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cohorts_previous_cohort_id_fkey';
            columns: ['previous_cohort_id'];
            isOneToOne: false;
            referencedRelation: 'cohorts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cohorts_next_ctl_cohort_id_fkey';
            columns: ['next_ctl_cohort_id'];
            isOneToOne: false;
            referencedRelation: 'cohorts';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_templates: {
        Row: LessonTemplatesRow;
        Insert: Partial<LessonTemplatesRow>;
        Update: Partial<LessonTemplatesRow>;
        Relationships: [
          {
            foreignKeyName: 'lesson_templates_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      class_sessions: {
        Row: ClassSessionsRow;
        Insert: Partial<ClassSessionsRow>;
        Update: Partial<ClassSessionsRow>;
        Relationships: [
          {
            foreignKeyName: 'class_sessions_cohort_id_fkey';
            columns: ['cohort_id'];
            isOneToOne: false;
            referencedRelation: 'cohorts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_sessions_lesson_template_id_fkey';
            columns: ['lesson_template_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_cohorts: {
        Row: TeacherCohortsRow;
        Insert: Partial<TeacherCohortsRow>;
        Update: Partial<TeacherCohortsRow>;
        Relationships: [
          {
            foreignKeyName: 'teacher_cohorts_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_cohorts_cohort_id_fkey';
            columns: ['cohort_id'];
            isOneToOne: false;
            referencedRelation: 'cohorts';
            referencedColumns: ['id'];
          },
        ];
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
            foreignKeyName: 'enrollments_cohort_id_fkey';
            columns: ['cohort_id'];
            isOneToOne: false;
            referencedRelation: 'cohorts';
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
            foreignKeyName: 'attendance_class_session_id_fkey';
            columns: ['class_session_id'];
            isOneToOne: false;
            referencedRelation: 'class_sessions';
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
      public_checkin_attempts: {
        Row: PublicCheckinAttemptsRow;
        Insert: Partial<PublicCheckinAttemptsRow>;
        Update: Partial<PublicCheckinAttemptsRow>;
        Relationships: [];
      };
    };
    Views: {
      trilho_student_summary: { Row: TrilhoStudentSummaryRow; Relationships: [] };
      trilho_dropout_report: { Row: TrilhoDropoutReportRow; Relationships: [] };
    };
    Functions: {
      trilho_member_id: { Args: Record<string, never>; Returns: string | null };
      trilho_is_admin: { Args: Record<string, never>; Returns: boolean };
      trilho_is_teacher_of_cohort: { Args: { p_cohort_id: string }; Returns: boolean };
      trilho_can_manage_cohort: { Args: { p_cohort_id: string }; Returns: boolean };
      trilho_active_enrollment: {
        Args: Record<string, never>;
        Returns: { enrollment_id: string; cohort_id: string; course_id: string }[];
      };
      trilho_add_module: {
        Args: {
          p_course_id: string;
          p_lesson1_title: string;
          p_lesson2_title: string;
          p_description?: string | null;
        };
        Returns: AddModuleResult[];
      };
      trilho_update_lesson_template: {
        Args: { p_id: string; p_title: string; p_description?: string | null };
        Returns: undefined;
      };
      trilho_create_cohort: {
        Args: {
          p_course_id: string;
          p_code: string;
          p_name: string;
          p_start_date: string;
          p_end_date: string;
          p_previous_cohort_id?: string | null;
        };
        Returns: string;
      };
      trilho_update_cohort: {
        Args: {
          p_id: string;
          p_name: string;
          p_start_date: string;
          p_end_date: string;
          p_next_ctl_cohort_id?: string | null;
        };
        Returns: undefined;
      };
      trilho_activate_cohort: { Args: { p_id: string }; Returns: undefined };
      trilho_cancel_cohort: { Args: { p_id: string }; Returns: undefined };
      trilho_regenerate_public_token: {
        Args: { p_cohort_id: string };
        Returns: RegeneratePublicTokenResult[];
      };
      trilho_set_public_attendance_enabled: {
        Args: { p_cohort_id: string; p_enabled: boolean };
        Returns: undefined;
      };
      trilho_create_class_session: {
        Args: {
          p_cohort_id: string;
          p_lesson_template_id: string;
          p_class_date: string;
          p_start_time: string;
          p_end_time: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      trilho_cancel_class_session: {
        Args: { p_class_session_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      trilho_open_class_session: { Args: { p_class_session_id: string }; Returns: undefined };
      trilho_close_class_session: {
        Args: { p_class_session_id: string };
        Returns: CloseClassSessionResult[];
      };
      trilho_mark_attendance: {
        Args: {
          p_class_session_id: string;
          p_student_id: string;
          p_status: AttendanceStatus;
          p_reason?: string | null;
        };
        Returns: string;
      };
      trilho_enroll_student: { Args: { p_student_id: string; p_cohort_id: string }; Returns: string };
      trilho_end_enrollment: { Args: { p_enrollment_id: string; p_status: 'CANCELLED' }; Returns: undefined };
      trilho_mark_dropout: {
        Args: {
          p_enrollment_id: string;
          p_dropped_out_at: string;
          p_reason?: string | null;
          p_notes?: string | null;
        };
        Returns: undefined;
      };
      trilho_enroll_eligible_students: {
        Args: { p_ctl_cohort_id: string; p_student_ids: string[] };
        Returns: number;
      };
      trilho_finalize_cohort: { Args: { p_cohort_id: string }; Returns: FinalizeCohortResult[] };
      trilho_delete_cohort: { Args: { p_cohort_id: string }; Returns: undefined };
      trilho_public_get_status: {
        Args: { p_cohort_code: string; p_token: string };
        Returns: PublicGetStatusResult[];
      };
      trilho_public_search_students: {
        Args: { p_cohort_code: string; p_token: string; p_name_query: string; p_ip?: string | null };
        Returns: PublicSearchStudentsResult[];
      };
      trilho_public_checkin: {
        Args: {
          p_cohort_code: string;
          p_token: string;
          p_student_id: string;
          p_phone_suffix: string;
          p_ip?: string | null;
        };
        Returns: PublicCheckinResult[];
      };
    };
  };
}
