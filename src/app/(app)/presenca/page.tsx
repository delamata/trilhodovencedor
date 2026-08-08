import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Registrar presença — Trilho do Vencedor' };

export default function PresencaPage() {
  return (
    <div>
      <PageHeader
        title="Registrar presença"
        description="Digite o código da chamada ou escaneie o QR Code."
      />
      <EmptyState
        icon={ClipboardCheck}
        title="Registro de presença em construção"
        description="O fluxo de check-in com todas as validações de segurança chega na Fase 3."
      />
    </div>
  );
}
