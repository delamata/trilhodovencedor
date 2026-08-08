'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { isTuesday } from '@/lib/domain/calendar';
import { createClassSchema, type CreateClassInput } from '@/validations/class';
import type { CoursesRow } from '@/types/database';
import { createClassAction } from './actions';

export function NewClassDialog({ courses }: { courses: CoursesRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateClassInput>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      courseId: courses[0]?.id ?? '',
      classNumber: 1,
      title: '',
      date: '',
      startTime: '20:00',
      endTime: '21:30',
      notes: '',
      alsoCreateCtl: false,
    },
  });

  const courseId = watch('courseId');
  const date = watch('date');
  const alsoCreateCtl = watch('alsoCreateCtl');

  const selectedCourse = courses.find((c) => c.id === courseId);
  const isMaturidade = selectedCourse?.code === 'MATURIDADE';
  const dateIsTuesday = date ? isTuesday(date) : false;
  const showCtlOption = isMaturidade && dateIsTuesday;

  async function onSubmit(values: CreateClassInput) {
    setSubmitting(true);
    try {
      const result = await createClassAction(values);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nova aula
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova aula</DialogTitle>
          <DialogDescription>
            Cadastre uma aula do calendário. A aula de CTL só pode ser gerada automaticamente
            quando a data cai numa terça-feira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseId">Curso</Label>
            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classNumber">Número da aula</Label>
              <Input
                id="classNumber"
                type="number"
                min={1}
                aria-invalid={Boolean(errors.classNumber)}
                {...register('classNumber')}
              />
              {errors.classNumber ? (
                <p className="text-sm text-destructive">{errors.classNumber.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                {...register('date')}
              />
              {errors.date ? <p className="text-sm text-destructive">{errors.date.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex.: Aula 1 — Novo Nascimento"
              aria-invalid={Boolean(errors.title)}
              {...register('title')}
            />
            {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Horário inicial</Label>
              <Input
                id="startTime"
                type="time"
                aria-invalid={Boolean(errors.startTime)}
                {...register('startTime')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Horário final</Label>
              <Input
                id="endTime"
                type="time"
                aria-invalid={Boolean(errors.endTime)}
                {...register('endTime')}
              />
              {errors.endTime ? (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          {showCtlOption ? (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <Controller
                control={control}
                name="alsoCreateCtl"
                render={({ field }) => (
                  <Checkbox
                    id="alsoCreateCtl"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Label htmlFor="alsoCreateCtl" className="font-normal">
                Criar também a aula correspondente do CTL nesta terça-feira (mesmo horário, a
                menos que você informe outro abaixo).
              </Label>
            </div>
          ) : null}

          {showCtlOption && alsoCreateCtl ? (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label htmlFor="ctlStartTime">Horário inicial do CTL</Label>
                <Input id="ctlStartTime" type="time" {...register('ctlStartTime')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctlEndTime">Horário final do CTL</Label>
                <Input id="ctlEndTime" type="time" {...register('ctlEndTime')} />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Criando…' : 'Criar aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
