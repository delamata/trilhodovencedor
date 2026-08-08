import { describe, expect, it } from 'vitest';
import { formatWeekday, getWeekdayIndex, isTuesday } from '@/lib/domain/weekday';

describe('formatWeekday', () => {
  it('TESTE 4 — 11/08/2026 -> Terça-feira', () => {
    expect(formatWeekday('2026-08-11')).toBe('Terça-feira');
  });

  it('cobre os 7 dias corretamente', () => {
    // 09/08/2026 a 15/08/2026 é uma semana completa (domingo a sábado).
    expect(formatWeekday('2026-08-09')).toBe('Domingo');
    expect(formatWeekday('2026-08-10')).toBe('Segunda-feira');
    expect(formatWeekday('2026-08-11')).toBe('Terça-feira');
    expect(formatWeekday('2026-08-12')).toBe('Quarta-feira');
    expect(formatWeekday('2026-08-13')).toBe('Quinta-feira');
    expect(formatWeekday('2026-08-14')).toBe('Sexta-feira');
    expect(formatWeekday('2026-08-15')).toBe('Sábado');
  });

  it('retorna string vazia para data inválida, sem lançar erro', () => {
    expect(formatWeekday('não-é-data')).toBe('');
    expect(formatWeekday('')).toBe('');
  });

  it('não é afetado por fuso horário (não passa por Date(string) em UTC)', () => {
    // Regressão: `new Date('2026-08-11')` sem componentes separados é
    // interpretado como meia-noite UTC, que em America/Sao_Paulo
    // (UTC-3) já é 10/08 às 21h — uma terça viraria segunda. Rodar
    // este teste sob qualquer TZ do processo deve dar o mesmo resultado.
    expect(formatWeekday('2026-08-11')).toBe('Terça-feira');
  });
});

describe('isTuesday / getWeekdayIndex', () => {
  it('confirma dow do Postgres (0=domingo ... 2=terça)', () => {
    expect(getWeekdayIndex('2026-08-09')).toBe(0);
    expect(getWeekdayIndex('2026-08-11')).toBe(2);
  });

  it('isTuesday só é true na terça-feira', () => {
    expect(isTuesday('2026-08-11')).toBe(true);
    expect(isTuesday('2026-08-10')).toBe(false);
    expect(isTuesday('2026-08-12')).toBe(false);
  });
});
