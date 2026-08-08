import type { Metadata } from 'next';
import { Settings } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Configurações — Trilho do Vencedor' };

export default function ConfiguracoesPage() {
  return (
    <div>
      <PageHeader title="Configurações" description="Professores por curso e parâmetros gerais." />
      <EmptyState icon={Settings} title="Configurações em construção" />
    </div>
  );
}
