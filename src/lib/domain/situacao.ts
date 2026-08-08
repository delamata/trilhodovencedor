/**
 * Situação do aluno em relação ao limite de faltas do curso.
 *
 * Calculada SEMPRE a partir de `absencesRemaining` (faltas restantes =
 * maxAbsences - faltas contadas), nunca a partir de números fixos por
 * curso — os limites (7 para Maturidade, 6 para CTL) vivem só em
 * `courses.max_absences` no banco. Ver seção 11 da especificação.
 */
export type Situacao = 'REGULAR' | 'ATENCAO' | 'ALERTA' | 'LIMITE_ATINGIDO' | 'LIMITE_EXCEDIDO';

export const SITUACAO_LABEL: Record<Situacao, string> = {
  REGULAR: 'Regular',
  ATENCAO: 'Atenção',
  ALERTA: 'Alerta',
  LIMITE_ATINGIDO: 'Limite atingido',
  LIMITE_EXCEDIDO: 'Limite excedido',
};

export function getSituacao(absencesRemaining: number): Situacao {
  if (absencesRemaining < 0) return 'LIMITE_EXCEDIDO';
  if (absencesRemaining === 0) return 'LIMITE_ATINGIDO';
  if (absencesRemaining === 1) return 'ALERTA';
  if (absencesRemaining === 2) return 'ATENCAO';
  return 'REGULAR';
}
