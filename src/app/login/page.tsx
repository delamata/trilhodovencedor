import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LogoMark } from '@/components/shared/logo-mark';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = {
  title: 'Entrar — Trilho do Vencedor',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <LogoMark size={64} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Trilho do Vencedor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle de presença — entre com seu e-mail e senha.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Não tem uma conta? Alunos e professores são cadastrados pela administração.
        </p>
      </div>
    </main>
  );
}
