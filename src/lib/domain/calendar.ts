/**
 * Helpers de calendário. `isTuesday` opera em componentes ano/mês/dia
 * puros (sem passar por `Date`+timezone), pelo mesmo motivo do check
 * `extract(dow from date) = 2` no banco (ver
 * trilho_generate_ctl_from_class): uma coluna DATE não tem hora nem
 * timezone, então convertê-la via `new Date(isoString)` arriscaria
 * interpretar como UTC e "vazar" para o dia anterior/seguinte
 * dependendo do fuso do navegador.
 */
export function isTuesday(isoDate: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getDay() === 2;
}

export const WEEKDAY_LABEL_PT: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado',
};

export function weekdayLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return '';
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return WEEKDAY_LABEL_PT[date.getDay()] ?? '';
}
