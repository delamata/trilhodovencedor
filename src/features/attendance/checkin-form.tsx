'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkinSchema, type CheckinInput } from '@/validations/attendance';
import { checkinAction } from './actions';

type Result =
  | { kind: 'success'; classTitle: string; courseName: string }
  | { kind: 'error'; message: string };

/** Fluxo de link/QR Code: chega com ?token= na URL, mostra a aula e um botão de confirmação (um toque). */
export function TokenCheckinPrompt({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const response = await checkinAction(token);
      if (response.success) {
        setResult({
          kind: 'success',
          classTitle: response.classTitle ?? '',
          courseName: response.courseName ?? '',
        });
      } else {
        setResult({ kind: 'error', message: response.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.kind === 'success') {
    return <SuccessPanel classTitle={result.classTitle} courseName={result.courseName} />;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">
        Você está prestes a confirmar sua presença nesta aula.
      </p>
      <Button onClick={handleConfirm} disabled={submitting} size="lg" className="mt-5 h-14 w-full text-base">
        {submitting ? 'Confirmando…' : 'Confirmar presença'}
      </Button>
      {result?.kind === 'error' ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

/** Fluxo manual: aluno digita o código de 6 dígitos que o professor projetou. */
export function ManualCheckinForm() {
  const [result, setResult] = useState<Result | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CheckinInput>({
    resolver: zodResolver(checkinSchema),
    defaultValues: { value: '' },
  });

  async function onSubmit(values: CheckinInput) {
    const response = await checkinAction(values.value);
    if (response.success) {
      setResult({
        kind: 'success',
        classTitle: response.classTitle ?? '',
        courseName: response.courseName ?? '',
      });
      reset();
    } else {
      setResult({ kind: 'error', message: response.message });
    }
  }

  if (result?.kind === 'success') {
    return <SuccessPanel classTitle={result.classTitle} courseName={result.courseName} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="value">Código da chamada</Label>
        <Input
          id="value"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000000"
          className="h-14 text-center font-mono text-2xl tracking-[0.4em]"
          aria-invalid={Boolean(errors.value)}
          {...register('value')}
        />
        {errors.value ? <p className="text-sm text-destructive">{errors.value.message}</p> : null}
      </div>

      <Button type="submit" disabled={isSubmitting} size="lg" className="h-14 w-full text-base">
        {isSubmitting ? 'Confirmando…' : 'Registrar presença'}
      </Button>

      {result?.kind === 'error' ? (
        <p className="flex items-center justify-center gap-2 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

function SuccessPanel({ classTitle, courseName }: { classTitle: string; courseName: string }) {
  return (
    <div className="rounded-xl border border-[#149c88]/30 bg-[#149c88]/5 p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-[#149c88]" aria-hidden="true" />
      <p className="mt-3 text-lg font-semibold text-foreground">Presença registrada com sucesso!</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {courseName} — {classTitle}
      </p>
      <Button render={<Link href="/dashboard" />} variant="outline" className="mt-5">
        Voltar ao início
      </Button>
    </div>
  );
}
