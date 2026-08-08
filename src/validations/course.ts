import { z } from 'zod';

export const courseConfigSchema = z.object({
  maxAbsences: z.coerce
    .number()
    .int('Deve ser um número inteiro.')
    .min(0, 'Deve ser 0 ou mais.')
    .max(999, 'Valor muito alto.'),
  justifiedAbsenceCountsTowardsLimit: z.boolean(),
  active: z.boolean(),
});

export type CourseConfigInput = z.infer<typeof courseConfigSchema>;
