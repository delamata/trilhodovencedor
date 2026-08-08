import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const APP_TIMEZONE = 'America/Sao_Paulo';

/** Formata uma data "yyyy-MM-dd" (coluna DATE, sem hora) como dd/MM/yyyy. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

/** Formata um timestamptz (ISO com hora/offset) em America/Sao_Paulo, dd/MM/yyyy HH:mm. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(toZonedTime(date, APP_TIMEZONE), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

/** Formata só a hora de um timestamptz, em America/Sao_Paulo, HH:mm. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(toZonedTime(date, APP_TIMEZONE), 'HH:mm', { locale: ptBR });
}

/** Formata um horário "HH:mm:ss" (coluna TIME do Postgres) como "HH:mm". */
export function formatTimeColumn(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 5);
}

/** Data de hoje em America/Sao_Paulo, no formato "yyyy-MM-dd" (para comparar com colunas DATE). */
export function todayInAppTimezone(): string {
  return format(toZonedTime(new Date(), APP_TIMEZONE), 'yyyy-MM-dd');
}
