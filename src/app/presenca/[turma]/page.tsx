import type { Metadata } from 'next';
import { CalendarClock, ShieldAlert } from 'lucide-react';
import { LogoMark } from '@/components/shared/logo-mark';
import { formatDate } from '@/lib/format';
import { getPublicStatusAction } from '@/features/public-checkin/actions';
import { PublicCheckinFlow } from '@/features/public-checkin/public-checkin-flow';

export const metadata: Metadata = { title: 'Presença — Trilho do Vencedor' };

// Página pública: nunca exige login. Só chama as 3 funções RPC
// liberadas para "anon" (trilho_public_get_status/search_students/
// checkin) — ver supabase/migrations/*_trilho_v2_rls.sql. Não fica em
// src/app/(app) de propósito, pra nunca herdar o layout autenticado.
export default async function PresencaPage({
  params,
  searchParams,
}: {
  params: Promise<{ turma: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { turma } = await params;
  const { t } = await searchParams;
  const token = t ?? '';

  const { status } = await getPublicStatusAction(turma, token);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-6 flex justify-center">
          <LogoMark size={48} />
        </div>

        {!status ? (
          <div className="space-y-3 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link de presença não é válido ou foi desativado. Confira o link mais recente com
              a liderança da sua turma.
            </p>
          </div>
        ) : status.has_open_session ? (
          <PublicCheckinFlow cohortCode={turma} token={token} status={status} />
        ) : (
          <div className="space-y-3 text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">{status.course_name}</h1>
            <p className="text-sm text-muted-foreground">{status.cohort_name}</p>
            <p className="text-sm text-muted-foreground">
              Nenhuma chamada aberta no momento. Volte a este link quando a aula começar.
            </p>
            {status.next_class_date ? (
              <p className="text-sm text-muted-foreground">
                Próxima aula: <span className="font-medium text-foreground">{formatDate(status.next_class_date)}</span>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
