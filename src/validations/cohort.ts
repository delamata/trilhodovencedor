import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

export const createCohortSchema = z
  .object({
    courseId: z.string().uuid('Selecione um curso.'),
    code: z
      .string()
      .trim()
      .min(2, 'Informe um código para a turma.')
      .max(30, 'Código muito longo.'),
    name: z.string().trim().min(2, 'Informe um nome para a turma.'),
    startDate: dateSchema,
    endDate: dateSchema,
    previousCohortId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data final deve ser igual ou depois da data inicial.',
    path: ['endDate'],
  });

export type CreateCohortInput = z.infer<typeof createCohortSchema>;

export const updateCohortSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(2, 'Informe um nome para a turma.'),
    startDate: dateSchema,
    endDate: dateSchema,
    nextCtlCohortId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data final deve ser igual ou depois da data inicial.',
    path: ['endDate'],
  });

export type UpdateCohortInput = z.infer<typeof updateCohortSchema>;
