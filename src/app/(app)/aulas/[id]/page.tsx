import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Aula — Trilho do Vencedor' };

export default async function AulaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Aula" description={`ID: ${id}`} />
      <EmptyState
        icon={BookOpen}
        title="Tela da aula em construção"
        description="Abrir/encerrar chamada, QR Code, código e lista de presentes chegam na Fase 3."
      />
    </div>
  );
}
