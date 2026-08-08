import { z } from 'zod';

export const checkinSchema = z.object({
  value: z.string().trim().min(4, 'Informe o código da chamada.'),
});

export type CheckinInput = z.infer<typeof checkinSchema>;

export const openAttendanceSessionSchema = z.object({
  classId: z.string().uuid(),
  durationMinutes: z.coerce.number().int().min(5).max(480).default(90),
});

export type OpenAttendanceSessionInput = z.infer<typeof openAttendanceSessionSchema>;

export const markAttendanceSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.enum(['PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 'ATRASO']),
  reason: z.string().trim().optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
