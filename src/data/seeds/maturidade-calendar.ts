/**
 * Datas das aulas de MATURIDADE.
 *
 * ⚠️ Este arquivo começa VAZIO de propósito. As datas reais das aulas
 * NUNCA devem ser inventadas — só a administração da igreja sabe o
 * calendário real do curso.
 *
 * Como preencher:
 *   1. Peça à administração a lista de aulas (data, horário, título).
 *   2. Adicione uma entrada por aula no array `maturidadeCalendarSeed`
 *      abaixo, seguindo o formato do exemplo comentado.
 *   3. Rode `npm run seed` (veja README.md, seção "Seed") para
 *      importar essas aulas para o banco via
 *      `trilho_create_class()` — o que já cria automaticamente a aula
 *      correspondente de CTL quando a data cai numa terça-feira
 *      (`alsoCreateCtl: true`).
 *
 * Alternativa: depois que o sistema estiver no ar, o ADMIN também pode
 * cadastrar/editar essas datas direto pela tela /calendario, sem
 * precisar editar este arquivo nem rodar o seed de novo. Este arquivo
 * serve só para a carga inicial.
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
