import { z } from 'zod';

export const enrollExistingStudentSchema = z.object({
  mode: z.literal('existing'),
  studentId: z.string().uuid('Selecione um aluno.'),
  cohortId: z.string().uuid(),
});

export const enrollNewStudentSchema = z.object({
  mode: z.literal('new'),
  nome: z.string().trim().min(3, 'Informe o nome completo.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  tel: z.string().trim().optional(),
  celula: z.string().trim().min(1, 'Selecione uma célula.'),
  cohortId: z.string().uuid(),
});

export const enrollStudentSchema = z.discriminatedUnion('mode', [
  enrollExistingStudentSchema,
  enrollNewStudentSchema,
]);

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;

export const endEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
});

export type EndEnrollmentInput = z.infer<typeof endEnrollmentSchema>;

export const dropoutReasonOptions = [
  'MUDANCA',
  'SAUDE',
  'TRABALHO',
  'DESINTERESSE',
  'OUTRO',
] as const;

export const markDropoutSchema = z.object({
  enrollmentId: z.string().uuid(),
  droppedOutAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  reason: z.enum(dropoutReasonOptions).optional(),
  notes: z.string().trim().optional(),
});

export type MarkDropoutInput = z.infer<typeof markDropoutSchema>;
