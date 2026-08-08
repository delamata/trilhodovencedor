import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:mm).');

export const courseScheduleRowSchema = z.object({
  numero: z.coerce.number().int().min(1, 'Número da aula deve ser maior que zero.'),
  titulo: z.string().trim().min(1, 'Informe o título da aula.'),
  data: dateSchema,
  horarioInicio: timeSchema,
  horarioFim: timeSchema,
});

export type CourseScheduleRow = z.infer<typeof courseScheduleRowSchema>;

export const importCourseScheduleSchema = z.object({
  cohortId: z.string().uuid(),
  rows: z.array(courseScheduleRowSchema).min(1, 'Nenhuma linha válida para importar.'),
});

export type ImportCourseScheduleInput = z.infer<typeof importCourseScheduleSchema>;
