import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { buildCsv, type CsvColumn } from '@/lib/export/csv';
import { buildXlsx } from '@/lib/export/xlsx';
import {
  alunoReportColumns,
  attendanceRecordColumns,
  desistenciaReportColumns,
  getAlunosEmRiscoReportRows,
  getAlunosReportRows,
  getDesistenciasReportRows,
  getFaltasReportRows,
  getHistoricoCompletoReportRows,
  getPresencaPorAlunoReportRows,
  getPresencaPorAulaReportRows,
  presencaPorAlunoColumns,
  presencaPorAulaColumns,
} from '@/features/reports/queries';

interface ReportDefinition {
  label: string;
  columns: CsvColumn<unknown>[];
  load: () => Promise<unknown[]>;
}

/**
 * Cada relatório tem seu próprio tipo de linha (T), mas o registro
 * precisa guardá-los juntos num único mapa heterogêneo. Apagar o tipo
 * para `unknown` aqui, num único lugar, é seguro porque columns/load
 * sempre vêm do MESMO T de origem — nunca são misturados entre
 * relatórios diferentes.
 */
function defineReport<T>(
  label: string,
  columns: CsvColumn<T>[],
  load: () => Promise<T[]>,
): ReportDefinition {
  return { label, columns: columns as CsvColumn<unknown>[], load: load as () => Promise<unknown[]> };
}

const REPORTS = {
  alunos: defineReport('alunos', alunoReportColumns, getAlunosReportRows),
  'alunos-em-risco': defineReport('alunos-em-risco', alunoReportColumns, getAlunosEmRiscoReportRows),
  'presenca-por-aluno': defineReport(
    'presenca-por-aluno',
    presencaPorAlunoColumns,
    getPresencaPorAlunoReportRows,
  ),
  'presenca-por-aula': defineReport(
    'presenca-por-aula',
    presencaPorAulaColumns,
    getPresencaPorAulaReportRows,
  ),
  faltas: defineReport('faltas', attendanceRecordColumns, getFaltasReportRows),
  'historico-completo': defineReport(
    'historico-completo',
    attendanceRecordColumns,
    getHistoricoCompletoReportRows,
  ),
  desistencias: defineReport('desistencias', desistenciaReportColumns, getDesistenciasReportRows),
} satisfies Record<string, ReportDefinition>;

type ReportKey = keyof typeof REPORTS;

function isReportKey(value: string): value is ReportKey {
  return value in REPORTS;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { type } = await params;
  if (!isReportKey(type)) {
    return NextResponse.json({ error: 'Relatório desconhecido.' }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const report = REPORTS[type];
  const rows = await report.load();
  const filename = `${report.label}-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    const buffer = await buildXlsx(report.label, rows, report.columns);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const csv = buildCsv(rows, report.columns);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}
