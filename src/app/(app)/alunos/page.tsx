import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { getCurrentUser } from '@/lib/auth/current-user';
import type { Situacao } from '@/lib/domain/situacao';
import { listStudentsWithSummaryAction } from '@/features/students/queries';
import { StudentFilters } from '@/features/students/student-filters';
import { StudentTable } from '@/features/students/student-table';
import { ImportStudentsDialog } from '@/features/students/import-students-dialog';

export const metadata: Metadata = { title: 'Alunos — Trilho do Vencedor' };

const PAGE_SIZE = 20;
const VALID_SITUACOES: Situacao[] = [
  'REGULAR',
  'ATENCAO',
  'ALERTA',
  'LIMITE_ATINGIDO',
  'LIMITE_EXCEDIDO',
];

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{
    curso?: string;
    situacao?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const params = await searchParams;
  const situacao = VALID_SITUACOES.includes(params.situacao as Situacao)
    ? (params.situacao as Situacao)
    : undefined;

  const allStudents = await listStudentsWithSummaryAction({
    curso: params.curso,
    situacao,
    status: params.status === 'ativo' || params.status === 'inativo' ? params.status : undefined,
    nome: params.q,
  });

  const page = Math.max(1, Number(params.page) || 1);
  const totalPages = Math.max(1, Math.ceil(allStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStudents = allStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function buildHref(targetPage: number) {
    const search = new URLSearchParams();
    if (params.curso) search.set('curso', params.curso);
    if (params.situacao) search.set('situacao', params.situacao);
    if (params.status) search.set('status', params.status);
    if (params.q) search.set('q', params.q);
    search.set('page', String(targetPage));
    return `/alunos?${search.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Alunos"
        description={`${allStudents.length} aluno${allStudents.length === 1 ? '' : 's'} com matrícula ativa`}
        actions={<ImportStudentsDialog />}
      />

      <div className="mb-6">
        <StudentFilters />
      </div>

      {pageStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum aluno encontrado"
          description="Ajuste os filtros ou matricule um aluno pela tela do curso."
        />
      ) : (
        <>
          <StudentTable students={pageStudents} />
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            totalItems={allStudents.length}
            pageSize={PAGE_SIZE}
            buildHref={buildHref}
          />
        </>
      )}
    </div>
  );
}
