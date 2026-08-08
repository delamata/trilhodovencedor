import { describe, expect, it } from 'vitest';
import { friendlyRpcError } from '@/lib/errors';

describe('friendlyRpcError', () => {
  it('traduz um código conhecido para mensagem amigável em PT-BR', () => {
    expect(friendlyRpcError('ALUNO_JA_POSSUI_MATRICULA_ATIVA')).toMatch(/matrícula ativa/);
    expect(friendlyRpcError('TURMA_MATURIDADE_RELACIONADA_NAO_ENCONTRADA')).toMatch(/turma de origem/);
  });

  it('lida com mensagens do Postgres que têm contexto extra em outras linhas', () => {
    expect(friendlyRpcError('SEM_PERMISSAO\nCONTEXT: PL/pgSQL function...')).toMatch(/permissão/);
  });

  it('retorna mensagem genérica para código desconhecido', () => {
    expect(friendlyRpcError('ALGO_NUNCA_VISTO')).toBe(
      'Não foi possível concluir a operação. Tente novamente.',
    );
  });

  it('lida com entrada vazia/nula sem lançar erro', () => {
    expect(friendlyRpcError('')).toBe('Não foi possível concluir a operação. Tente novamente.');
    expect(friendlyRpcError(undefined)).toBe('Não foi possível concluir a operação. Tente novamente.');
    expect(friendlyRpcError(null)).toBe('Não foi possível concluir a operação. Tente novamente.');
  });
});
