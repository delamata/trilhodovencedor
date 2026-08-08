import { describe, expect, it } from 'vitest';
import { generateLessonCode } from '@/lib/domain/lesson-code';

describe('generateLessonCode', () => {
  it('TESTE 1 — MA módulo 1 aula 1 -> MA01-01', () => {
    expect(generateLessonCode('MA', 1, 1)).toBe('MA01-01');
  });

  it('TESTE 2 — MA módulo 12 aula 2 -> MA12-02', () => {
    expect(generateLessonCode('MA', 12, 2)).toBe('MA12-02');
  });

  it('TESTE 3 — CTL módulo 3 aula 1 -> CT03-01', () => {
    expect(generateLessonCode('CT', 3, 1)).toBe('CT03-01');
  });

  it('sempre usa dois dígitos, mesmo com módulo de um dígito', () => {
    expect(generateLessonCode('MA', 1, 1)).toBe('MA01-01');
    expect(generateLessonCode('MA', 9, 2)).toBe('MA09-02');
  });

  it('não trava em três dígitos quando o módulo passa de 99', () => {
    expect(generateLessonCode('MA', 100, 1)).toBe('MA100-01');
  });

  it('rejeita número de aula fora de 1/2 (todo módulo tem exatamente duas aulas)', () => {
    expect(() => generateLessonCode('MA', 1, 3)).toThrow();
    expect(() => generateLessonCode('MA', 1, 0)).toThrow();
  });

  it('rejeita módulo não positivo', () => {
    expect(() => generateLessonCode('MA', 0, 1)).toThrow();
    expect(() => generateLessonCode('MA', -1, 1)).toThrow();
  });

  it('MA01-01 e CT01-01 têm o mesmo formato mas são aulas diferentes (BR-008)', () => {
    const ma = generateLessonCode('MA', 1, 1);
    const ct = generateLessonCode('CT', 1, 1);
    expect(ma).not.toBe(ct);
    expect(ma).toBe('MA01-01');
    expect(ct).toBe('CT01-01');
  });
});
