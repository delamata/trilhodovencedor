/**
 * Dia da semana em pt-BR a partir de uma data "yyyy-MM-dd" (coluna
 * DATE, sem hora/timezone). Opera em componentes ano/mês/dia puros —
 * nunca `new Date(isoString)` direto, que o JS interpretaria como UTC
 * meia-noite e poderia "vazar" pro dia anterior em fusos negativos
 * como America/Sao_Paulo (seção 50/53 da spec de evolução: cuidado
 * com bug de UTC virando uma terça em segunda).
 */
const WEEKDAY_LABEL_PT: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

function parseDateParts(isoDate: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

/** Índice do dia da semana (0=domingo ... 6=sábado), igual ao `extract(dow from data)` do Postgres. */
export function getWeekdayIndex(isoDate: string): number | null {
  const parts = parseDateParts(isoDate);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day).getDay();
}

/** "Terça-feira", "Domingo", etc. Retorna string vazia para data inválida. */
export function formatWeekday(isoDate: string): string {
  const index = getWeekdayIndex(isoDate);
  if (index === null) return '';
  return WEEKDAY_LABEL_PT[index] ?? '';
}

/** true quando a data cai numa terça-feira (BR-007: CTL só nesses dias). */
export function isTuesday(isoDate: string): boolean {
  return getWeekdayIndex(isoDate) === 2;
}
