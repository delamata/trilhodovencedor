import 'server-only';
import ExcelJS from 'exceljs';
import type { CsvColumn } from './csv';

/** Monta um workbook XLSX de uma aba a partir das mesmas colunas usadas no CSV. Só roda no servidor. */
export async function buildXlsx<T>(
  sheetName: string,
  rows: T[],
  columns: CsvColumn<T>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.header, width: 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c) => [c.header, c.value(row) ?? ''])));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
