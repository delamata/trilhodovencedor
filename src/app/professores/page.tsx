import type { Metadata } from 'next';
import { LogoMark } from '@/components/shared/logo-mark';
import { listTeachableCohortsAction } from '@/features/public-teacher-registration/actions';
import { PublicTeacherRegistrationFlow } from '@/features/public-teacher-registration/public-teacher-registration-flow';

export const metadata: Metadata = { title: 'Cadastro de Professor — Trilho do Vencedor' };

// Página pública: nunca exige login (BR-013 se aplica também aqui, não
// só ao check-in de aluno). Fica fora de src/app/(app) de propósito,
// pra nunca herdar o layout autenticado — ver PUBLIC_PATHS em
// src/lib/supabase/middleware.ts.
export default async function ProfessoresPage() {
  const cohorts = await listTeachableCohortsAction();

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-6 flex justify-center">
          <LogoMark size={48} />
        </div>
        <PublicTeacherRegistrationFlow cohorts={cohorts} />
      </div>
    </div>
  );
}
