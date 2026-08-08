import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { ManualCheckinForm, TokenCheckinPrompt } from '@/features/attendance/checkin-form';

export const metadata: Metadata = { title: 'Registrar presença — Trilho do Vencedor' };

export default async function PresencaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader
        title="Registrar presença"
        description={
          token
            ? undefined
            : 'Digite o código de 6 dígitos que o professor projetou, ou escaneie o QR Code da aula.'
        }
      />

      {token ? <TokenCheckinPrompt token={token} /> : <ManualCheckinForm />}
    </div>
  );
}
