import { z } from 'zod';

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:mm).');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

export const createClassSchema = z
  .object({
    courseId: z.string().uuid('Selecione um curso.'),
    classNumber: z.coerce.number().int().min(1, 'Número da aula deve ser maior que zero.'),
    title: z.string().trim().min(1, 'Informe o título da aula.'),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    notes: z.string().trim().optional(),
    alsoCreateCtl: z.boolean(),
    ctlClassNumber: z.coerce.number().int().min(1).optional(),
    ctlTitle: z.string().trim().optional(),
    ctlStartTime: timeSchema.optional().or(z.literal('')),
    ctlEndTime: timeSchema.optional().or(z.literal('')),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'O horário final deve ser depois do horário inicial.',
    path: ['endTime'],
  });

export type CreateClassInput = z.infer<typeof createClassSchema>;

export const cancelClassSchema = z.object({
  classId: z.string().uuid(),
  reason: z.string().trim().optional(),
});

export type CancelClassInput = z.infer<typeof cancelClassSchema>;

export const generateCtlSchema = z.object({
  maturidadeClassId: z.string().uuid(),
  ctlStartTime: timeSchema.optional().or(z.literal('')),
  ctlEndTime: timeSchema.optional().or(z.literal('')),
});

export type GenerateCtlInput = z.infer<typeof generateCtlSchema>;
