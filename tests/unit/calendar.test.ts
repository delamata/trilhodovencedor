import { describe, expect, it } from 'vitest';
import { isTuesday, weekdayLabel } from '@/lib/domain/calendar';

describe('isTuesday', () => {
  it('retorna true para uma terça-feira conhecida', () => {
    // 11/08/2026 é uma terça-feira.
    expect(isTuesday('2026-08-11')).toBe(true);
  });

  it('retorna false para dias que não são terça', () => {
    expect(isTuesday('2026-08-10')).toBe(false); // segunda
    expect(isTuesday('2026-08-12')).toBe(false); // quarta
  });

  it('retorna false para string inválida', () => {
    expect(isTuesday('')).toBe(false);
    expect(isTuesday('not-a-date')).toBe(false);
  });

  it('não é afetado por fuso horário (não passa por Date(string) em UTC)', () => {
    // Regressão: usar `new Date(isoString)` interpretaria como UTC
    // meia-noite e poderia "vazar" para o dia anterior em fusos
    // negativos (como America/Sao_Paulo). isTuesday deve ser estável.
    expect(isTuesday('2026-08-11')).toBe(true);
    expect(isTuesday('2026-08-18')).toBe(true);
  });
});

describe('weekdayLabel', () => {
  it('retorna o nome do dia da semana em português', () => {
    expect(weekdayLabel('2026-08-11')).toBe('terça-feira');
    expect(weekdayLabel('2026-08-10')).toBe('segunda-feira');
  });
});
