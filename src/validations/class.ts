import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:mm).');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

export const createClassSessionSchema = z
  .object({
    cohortId: z.string().uuid('Selecione uma turma.'),
    lessonTemplateId: z.string().uuid('Selecione a aula.'),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    notes: z.string().trim().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'O horário final deve ser depois do horário inicial.',
    path: ['endTime'],
  });

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>;

export const cancelClassSessionSchema = z.object({
  classSessionId: z.string().uuid(),
  reason: z.string().trim().optional(),
});

export type CancelClassSessionInput = z.infer<typeof cancelClassSessionSchema>;

export const updateClassSessionSchema = z
  .object({
    classSessionId: z.string().uuid(),
    lessonTemplateId: z.string().uuid('Selecione a aula.'),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    notes: z.string().trim().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'O horário final deve ser depois do horário inicial.',
    path: ['endTime'],
  });

export type UpdateClassSessionInput = z.infer<typeof updateClassSessionSchema>;
