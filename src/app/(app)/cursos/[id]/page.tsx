import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Curso — Trilho do Vencedor' };

export default async function CursoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Detalhe do curso" description={`ID: ${id}`} />
      <EmptyState icon={GraduationCap} title="Detalhe do curso em construção" />
    </div>
  );
}
