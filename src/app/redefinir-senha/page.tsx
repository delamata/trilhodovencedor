import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Redefinir senha — Trilho do Vencedor',
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha para entrar.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
