/** Gera uma célula CSV segura (RFC 4180): aspas quando o valor contém vírgula, aspas ou quebra de linha. */
function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// BOM UTF-8 — sem ele o Excel abre acentos (ção, ê, ã) como caracteres
// quebrados ao importar o CSV.
const UTF8_BOM = '﻿';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Monta um CSV a partir de colunas tipadas. */
export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(','));
  return UTF8_BOM + [header, ...lines].join('\r\n');
}
