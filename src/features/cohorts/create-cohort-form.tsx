'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createCohortSchema, type CreateCohortInput } from '@/validations/cohort';
import type { CoursesRow } from '@/types/database';
import {
  createCohortAction,
  listCohortOptionsForCourseAction,
} from './actions';

export function CreateCohortForm({
  courses,
  defaultCourseId,
}: {
  courses: CoursesRow[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [previousOptions, setPreviousOptions] = useState<{ id: string; label: string }[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCohortInput>({
    resolver: zodResolver(createCohortSchema),
    defaultValues: {
      courseId: defaultCourseId ?? courses[0]?.id ?? '',
      code: '',
      name: '',
      startDate: '',
      endDate: '',
      previousCohortId: null,
    },
  });

  const courseId = watch('courseId');

  useEffect(() => {
    if (!courseId) {
      setPreviousOptions([]);
      return;
    }
    listCohortOptionsForCourseAction(courseId).then(setPreviousOptions);
  }, [courseId]);

  async function onSubmit(values: CreateCohortInput) {
    setSubmitting(true);
    try {
      const result = await createCohortAction(values);
      if (result.success && result.id) {
        toast.success(result.message);
        router.push(`/turmas/${result.id}`);
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="courseId">Curso</Label>
        <Select value={courseId} onValueChange={(value) => setValue('courseId', value ?? '')}>
          <SelectTrigger id="courseId">
            <SelectValue placeholder="Selecione o curso" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.courseId ? <p className="text-sm text-destructive">{errors.courseId.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código da turma</Label>
          <Input id="code" placeholder="MAT-2026-1" {...register('code')} />
          {errors.code ? <p className="text-sm text-destructive">{errors.code.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome da turma</Label>
          <Input id="name" placeholder="Maturidade — 1º semestre 2026" {...register('name')} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Data de início</Label>
          <Input id="startDate" type="date" {...register('startDate')} />
          {errors.startDate ? <p className="text-sm text-destructive">{errors.startDate.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">Data de término (prevista)</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
          {errors.endDate ? <p className="text-sm text-destructive">{errors.endDate.message}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="previousCohortId">Turma anterior (opcional)</Label>
        <Select
          value={watch('previousCohortId') ?? 'none'}
          onValueChange={(value) => setValue('previousCohortId', value === 'none' ? null : value)}
        >
          <SelectTrigger id="previousCohortId">
            <SelectValue placeholder="Nenhuma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {previousOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          A estrutura de aulas (módulos) é do curso, não da turma — todas as turmas do mesmo curso
          já compartilham os mesmos módulos automaticamente.
        </p>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Criando…' : 'Criar turma'}
      </Button>
    </form>
  );
}
