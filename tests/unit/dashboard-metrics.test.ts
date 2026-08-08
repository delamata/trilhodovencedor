import { describe, expect, it } from 'vitest';
import {
  computeAdminDashboardMetrics,
  computePresenceByClass,
} from '@/lib/domain/dashboard-metrics';

describe('computeAdminDashboardMetrics', () => {
  it('conta alunos por curso e soma presenças/faltas corretamente', () => {
    const metrics = computeAdminDashboardMetrics([
      { courseCode: 'MATURIDADE', presences: 8, absences: 2, classesRecorded: 10, situacao: 'REGULAR' },
      { courseCode: 'MATURIDADE', presences: 5, absences: 5, classesRecorded: 10, situacao: 'ALERTA' },
      { courseCode: 'CTL', presences: 6, absences: 0, classesRecorded: 6, situacao: 'REGULAR' },
    ]);

    expect(metrics.totalActiveStudents).toBe(3);
    expect(metrics.maturidadeStudents).toBe(2);
    expect(metrics.ctlStudents).toBe(1);
    expect(metrics.totalPresences).toBe(19);
    expect(metrics.totalAbsences).toBe(7);
    expect(metrics.totalClassesRecorded).toBe(26);
    expect(metrics.averageAttendancePct).toBe(Math.round((19 / 26) * 100));
  });

  it('conta a distribuição de situação incluindo categorias com zero alunos', () => {
    const metrics = computeAdminDashboardMetrics([
      { courseCode: 'MATURIDADE', presences: 1, absences: 0, classesRecorded: 1, situacao: 'LIMITE_EXCEDIDO' },
    ]);

    expect(metrics.limiteExcedidoCount).toBe(1);
    expect(metrics.atencaoCount).toBe(0);
    expect(metrics.situacaoDistribution).toHaveLength(5);
    expect(metrics.situacaoDistribution.map((s) => s.situacao)).toEqual([
      'REGULAR',
      'ATENCAO',
      'ALERTA',
      'LIMITE_ATINGIDO',
      'LIMITE_EXCEDIDO',
    ]);
  });

  it('retorna média de presença 0 quando não há aulas registradas (evita divisão por zero)', () => {
    const metrics = computeAdminDashboardMetrics([]);
    expect(metrics.averageAttendancePct).toBe(0);
    expect(metrics.totalActiveStudents).toBe(0);
  });
});

describe('computePresenceByClass', () => {
  it('calcula presentes/total e percentual por aula', () => {
    const result = computePresenceByClass(
      [{ classId: 'c1', label: 'Aula 1', classDate: '2026-08-11' }],
      [
        { classId: 'c1', status: 'PRESENTE' },
        { classId: 'c1', status: 'PRESENTE' },
        { classId: 'c1', status: 'FALTA' },
        { classId: 'c1', status: 'FALTA_JUSTIFICADA' },
      ],
    );

    expect(result[0]).toMatchObject({ present: 2, total: 4, pct: 50 });
  });

  it('retorna 0/0/0% para aula sem nenhum registro de presença lançado', () => {
    const result = computePresenceByClass([{ classId: 'c2', label: 'Aula 2', classDate: '2026-08-18' }], []);
    expect(result[0]).toMatchObject({ present: 0, total: 0, pct: 0 });
  });

  it('ignora registros de presença de aulas fora da lista informada', () => {
    const result = computePresenceByClass(
      [{ classId: 'c1', label: 'Aula 1', classDate: '2026-08-11' }],
      [{ classId: 'other-class', status: 'PRESENTE' }],
    );
    expect(result[0]).toMatchObject({ present: 0, total: 0 });
  });
});
