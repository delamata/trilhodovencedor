import { z } from 'zod';

export const enrollExistingStudentSchema = z.object({
  mode: z.literal('existing'),
  studentId: z.string().uuid('Selecione um aluno.'),
  courseId: z.string().uuid(),
});

export const enrollNewStudentSchema = z.object({
  mode: z.literal('new'),
  nome: z.string().trim().min(3, 'Informe o nome completo.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  tel: z.string().trim().optional(),
  celula: z.string().trim().min(1, 'Selecione uma célula.'),
  courseId: z.string().uuid(),
});

export const enrollStudentSchema = z.discriminatedUnion('mode', [
  enrollExistingStudentSchema,
  enrollNewStudentSchema,
]);

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;

export const endEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.enum(['COMPLETED', 'CANCELLED', 'TRANSFERRED']),
});

export type EndEnrollmentInput = z.infer<typeof endEnrollmentSchema>;

export const changeEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  newCourseId: z.string().uuid(),
  endStatus: z.enum(['COMPLETED', 'CANCELLED', 'TRANSFERRED']).default('TRANSFERRED'),
});

export type ChangeEnrollmentInput = z.infer<typeof changeEnrollmentSchema>;
