import { describe, expect, it } from 'vitest';
import { mergeRosterWithAttendance } from '@/lib/domain/roster';

describe('mergeRosterWithAttendance', () => {
  it('marca como PENDENTE quem está matriculado mas ainda não tem registro de presença', () => {
    const result = mergeRosterWithAttendance(
      [{ studentId: 's1', nome: 'Ana' }, { studentId: 's2', nome: 'Bruno' }],
      [],
    );

    expect(result).toHaveLength(2);
    expect(result.every((row) => row.status === 'PENDENTE')).toBe(true);
  });

  it('usa o status/origem real de quem já tem registro de presença', () => {
    const result = mergeRosterWithAttendance(
      [{ studentId: 's1', nome: 'Ana' }],
      [
        {
          id: 'att1',
          studentId: 's1',
          status: 'PRESENTE',
          source: 'STUDENT_CHECKIN',
          checkedInAt: '2026-08-11T23:00:00Z',
        },
      ],
    );

    expect(result[0]).toMatchObject({
      studentId: 's1',
      status: 'PRESENTE',
      source: 'STUDENT_CHECKIN',
      attendanceId: 'att1',
    });
  });

  it('ordena por nome (pt-BR), ignorando acentuação', () => {
    const result = mergeRosterWithAttendance(
      [
        { studentId: 's1', nome: 'Zeca' },
        { studentId: 's2', nome: 'Ábner' },
        { studentId: 's3', nome: 'Bruno' },
      ],
      [],
    );

    expect(result.map((r) => r.nome)).toEqual(['Ábner', 'Bruno', 'Zeca']);
  });

  it('ignora registro de presença de aluno que não está mais na lista de matriculados ativos', () => {
    // Ex.: aluno teve a matrícula encerrada depois de já ter registrado
    // presença numa aula anterior — o histórico de presença continua
    // existindo no banco, mas ele não deve mais aparecer no roster
    // "ativo" da aula.
    const result = mergeRosterWithAttendance(
      [{ studentId: 's1', nome: 'Ana' }],
      [
        {
          id: 'att-old',
          studentId: 's2',
          status: 'PRESENTE',
          source: 'STUDENT_CHECKIN',
          checkedInAt: '2026-08-11T23:00:00Z',
        },
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.studentId).toBe('s1');
  });
});
