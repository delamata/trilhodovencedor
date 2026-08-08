import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata: Metadata = { title: 'Relatórios — Trilho do Vencedor' };

const REPORTS = [
  { type: 'alunos', title: 'Alunos', description: 'Nome, curso, presenças, faltas, limite e situação de cada aluno ativo.' },
  { type: 'presenca-por-aluno', title: 'Presença por aluno', description: 'Aulas realizadas, presenças, faltas e percentual de presença por aluno.' },
  { type: 'presenca-por-aula', title: 'Presença por aula', description: 'Quantos alunos presentes em cada aula finalizada.' },
  { type: 'faltas', title: 'Faltas', description: 'Todos os registros de falta e falta justificada, aula a aula.' },
  { type: 'alunos-em-risco', title: 'Alunos em risco', description: 'Alunos em alerta, no limite ou com o limite de faltas excedido.' },
  { type: 'historico-completo', title: 'Histórico completo', description: 'Todos os registros de presença de todos os alunos, com origem.' },
  { type: 'desistencias', title: 'Desistências', description: 'Alunos que desistiram, com motivo, observações e presença até a desistência.' },
] as const;

export default async function RelatoriosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  return (
    <div>
      <PageHeader title="Relatórios" description="Exportações em CSV ou XLSX." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <div key={report.type} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-foreground">{report.title}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{report.description}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" render={<a href={`/api/relatorios/${report.type}?format=csv`} />}>
                <Download className="h-4 w-4" aria-hidden="true" />
                CSV
              </Button>
              <Button variant="outline" size="sm" render={<a href={`/api/relatorios/${report.type}?format=xlsx`} />}>
                <Download className="h-4 w-4" aria-hidden="true" />
                XLSX
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
