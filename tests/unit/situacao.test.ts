import { describe, expect, it } from 'vitest';
import { getSituacao } from '@/lib/domain/situacao';

describe('getSituacao', () => {
  it('retorna REGULAR quando restam 3 ou mais faltas', () => {
    expect(getSituacao(3)).toBe('REGULAR');
    expect(getSituacao(7)).toBe('REGULAR');
  });

  it('retorna ATENCAO quando restam exatamente 2 faltas', () => {
    expect(getSituacao(2)).toBe('ATENCAO');
  });

  it('retorna ALERTA quando resta exatamente 1 falta', () => {
    expect(getSituacao(1)).toBe('ALERTA');
  });

  it('retorna LIMITE_ATINGIDO quando restam 0 faltas', () => {
    expect(getSituacao(0)).toBe('LIMITE_ATINGIDO');
  });

  it('retorna LIMITE_EXCEDIDO quando faltas restantes é negativo', () => {
    expect(getSituacao(-1)).toBe('LIMITE_EXCEDIDO');
    expect(getSituacao(-5)).toBe('LIMITE_EXCEDIDO');
  });

  it('não depende de números fixos por curso — funciona igual para Maturidade (7) e CTL (6)', () => {
    // Maturidade: max 7. 8 faltas => remaining = 7 - 8 = -1.
    expect(getSituacao(7 - 8)).toBe('LIMITE_EXCEDIDO');
    // CTL: max 6. 7 faltas => remaining = 6 - 7 = -1.
    expect(getSituacao(6 - 7)).toBe('LIMITE_EXCEDIDO');
    // Maturidade com 7 faltas (limite): remaining = 7 - 7 = 0.
    expect(getSituacao(7 - 7)).toBe('LIMITE_ATINGIDO');
    // CTL com 6 faltas (limite): remaining = 6 - 6 = 0.
    expect(getSituacao(6 - 6)).toBe('LIMITE_ATINGIDO');
  });
});
