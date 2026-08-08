'use client';

import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberCombobox } from '@/components/shared/member-combobox';
import { searchMembersAction, type MemberSearchResult } from '@/features/students/actions';
import {
  enrollNewStudentSchema,
  enrollExistingStudentSchema,
  type EnrollStudentInput,
} from '@/validations/enrollment';
import { enrollStudentAction } from './actions';

interface NewStudentFormValues {
  nome: string;
  email: string;
  tel: string;
  celula: string;
}

export function EnrollDialog({
  courseId,
  courseName,
  celulaOptions,
  onEnrolled,
}: {
  courseId: string;
  courseName: string;
  celulaOptions: string[];
  onEnrolled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<NewStudentFormValues>({
    defaultValues: { nome: '', email: '', tel: '', celula: celulaOptions[0] ?? '' },
  });

  function closeAndReset() {
    setOpen(false);
    setSelectedMember(null);
    setMode('existing');
    reset();
  }

  async function submitEnrollment(input: EnrollStudentInput) {
    setSubmitting(true);
    try {
      const result = await enrollStudentAction(input);
      if (result.success) {
        toast.success(result.message);
        closeAndReset();
        onEnrolled?.();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExistingSubmit() {
    const parsed = enrollExistingStudentSchema.safeParse({
      mode: 'existing',
      studentId: selectedMember?.id,
      courseId,
    });
    if (!parsed.success) {
      toast.error('Selecione um aluno na busca.');
      return;
    }
    await submitEnrollment(parsed.data);
  }

  async function handleNewSubmit(values: NewStudentFormValues) {
    const parsed = enrollNewStudentSchema.safeParse({ ...values, mode: 'new', courseId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
      return;
    }
    await submitEnrollment(parsed.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) closeAndReset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Matricular aluno
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Matricular aluno em {courseName}</DialogTitle>
          <DialogDescription>
            Um aluno só pode ter uma matrícula ativa por vez. Se ele já estiver em outro curso,
            matricule-o pela tela de Alunos (troca de matrícula).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Aluno já cadastrado</TabsTrigger>
            <TabsTrigger value="new">Novo aluno</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'existing' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar aluno</Label>
              <MemberCombobox
                value={selectedMember}
                onChange={setSelectedMember}
                onSearch={searchMembersAction}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleExistingSubmit} disabled={!selectedMember || submitting}>
                {submitting ? 'Matriculando…' : 'Matricular'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleNewSubmit)} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" aria-invalid={Boolean(errors.nome)} {...register('nome')} />
              {errors.nome ? <p className="text-sm text-destructive">{errors.nome.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail (para o login do aluno)</Label>
              <Input
                id="email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">Telefone</Label>
              <Input id="tel" {...register('tel')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celula">Célula</Label>
              <Controller
                control={control}
                name="celula"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="celula">
                      <SelectValue placeholder="Selecione a célula" />
                    </SelectTrigger>
                    <SelectContent>
                      {celulaOptions.map((celula) => (
                        <SelectItem key={celula} value={celula}>
                          {celula}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Matriculando…' : 'Cadastrar e matricular'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
