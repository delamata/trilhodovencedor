'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { courseConfigSchema, type CourseConfigInput } from '@/validations/course';
import type { CoursesRow } from '@/types/database';
import { updateCourseConfigAction } from './actions';

export function CourseConfigForm({ course }: { course: CoursesRow }) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CourseConfigInput>({
    resolver: zodResolver(courseConfigSchema),
    defaultValues: {
      maxAbsences: course.max_absences,
      justifiedAbsenceCountsTowardsLimit: course.justified_absence_counts_towards_limit,
      active: course.active,
    },
  });

  const justified = watch('justifiedAbsenceCountsTowardsLimit');
  const active = watch('active');

  async function onSubmit(values: CourseConfigInput) {
    setSubmitting(true);
    try {
      const result = await updateCourseConfigAction(course.id, values);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="maxAbsences">Limite de faltas</Label>
        <Input
          id="maxAbsences"
          type="number"
          min={0}
          aria-invalid={Boolean(errors.maxAbsences)}
          {...register('maxAbsences')}
        />
        {errors.maxAbsences ? (
          <p className="text-sm text-destructive">{errors.maxAbsences.message}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Faltas de 0 até este número ficam dentro do limite. A partir de {course.max_absences + 1}
          {' '}
          faltas, o limite é considerado excedido.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="justified">Falta justificada conta para o limite</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Por padrão, uma falta marcada como justificada não reduz o limite de faltas do aluno.
          </p>
        </div>
        <Switch
          id="justified"
          checked={justified}
          onCheckedChange={(checked) => setValue('justifiedAbsenceCountsTowardsLimit', checked, { shouldDirty: true })}
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="active">Curso ativo</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Cursos inativos não aparecem para novas matrículas.
          </p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={(checked) => setValue('active', checked, { shouldDirty: true })}
        />
      </div>

      <Button type="submit" disabled={submitting || !isDirty}>
        {submitting ? 'Salvando…' : 'Salvar configuração'}
      </Button>
    </form>
  );
}
