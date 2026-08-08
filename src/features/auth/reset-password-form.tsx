'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema, type ResetPasswordInput } from '@/validations/auth';

/**
 * O link de convite/redefinição do Supabase chega com a sessão
 * embutida na própria URL (hash `#access_token=...` ou `?code=...`,
 * dependendo do fluxo). O client do navegador detecta isso sozinho ao
 * ser criado (`detectSessionInUrl`, padrão), então a troca de senha é
 * feita aqui, direto pelo client do navegador — não por uma Server
 * Action, que dependeria de cookies que ainda podem não ter sido
 * gravados a tempo.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionReady(true);
      if (event === 'SIGNED_OUT') setLinkInvalid(true);
    });

    // Se depois de alguns segundos nenhuma sessão apareceu, o link
    // provavelmente é inválido ou expirou.
    const timeout = setTimeout(() => {
      setSessionReady((ready) => {
        if (!ready) setLinkInvalid(true);
        return ready;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });

      if (error) {
        toast.error('Não foi possível redefinir a senha. Solicite um novo link.');
        return;
      }

      toast.success('Senha redefinida com sucesso.');
      router.replace('/dashboard');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (linkInvalid) {
    return (
      <p className="text-sm text-destructive">
        Este link é inválido ou já expirou. Solicite um novo em &quot;Esqueci minha senha&quot;.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full h-11 text-base" disabled={submitting || !sessionReady}>
        {submitting ? 'Salvando…' : sessionReady ? 'Redefinir senha' : 'Verificando link…'}
      </Button>
    </form>
  );
}
