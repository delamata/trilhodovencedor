/**
 * Datas das aulas de MATURIDADE.
 *
 * ⚠️ Este arquivo começa VAZIO de propósito. As datas reais das aulas
 * NUNCA devem ser inventadas — só a administração da igreja sabe o
 * calendário real do curso.
 *
 * Este arquivo é só um rascunho de referência — desde a v2, aulas são
 * criadas pela tela /turmas/[id] (uma a uma, escolhendo a aula do
 * módulo) ou, no caso do CTL, geradas automaticamente a partir das
 * terças-feiras da turma de Maturidade vinculada (botão "Gerar
 * calendário" na turma de CTL). Não há mais um script de importação
 * em lote a partir deste arquivo.
 */

export interface MaturidadeClassSeed {
  /** Número sequencial da aula (1, 2, 3, ...). */
  classNumber: number;
  /** Título da aula (ex.: "Aula 1 — Novo Nascimento"). */
  title: string;
  /** Data no formato ISO "yyyy-MM-dd". */
  date: string;
  /** Horário inicial, formato "HH:mm" (24h). */
  startTime: string;
  /** Horário final, formato "HH:mm" (24h). */
  endTime: string;
  /**
   * Se true e a data cair numa terça-feira, gera automaticamente a
   * aula correspondente de CTL no mesmo dia/horário (ver seção 6 da
   * especificação). Ignorado se a data não for terça-feira.
   */
  alsoCreateCtl?: boolean;
  /** Observação opcional. */
  notes?: string;
}

// Exemplo (comentado) do formato esperado — remova o comentário e
// ajuste depois de receber o calendário real da administração:
//
// export const maturidadeCalendarSeed: MaturidadeClassSeed[] = [
//   {
//     classNumber: 1,
//     title: 'Aula 1',
//     date: '2026-08-11',
//     startTime: '20:00',
//     endTime: '21:30',
//     alsoCreateCtl: true,
//   },
// ];

export const maturidadeCalendarSeed: MaturidadeClassSeed[] = [];
