import { describe, expect, it } from 'vitest';
import { buildCsv } from '@/lib/export/csv';

interface Row {
  nome: string;
  curso: string;
}

describe('buildCsv', () => {
  it('gera cabeçalho e linhas separados por vírgula', () => {
    const csv = buildCsv<Row>(
      [{ nome: 'Ana', curso: 'Maturidade' }],
      [
        { header: 'Nome', value: (r) => r.nome },
        { header: 'Curso', value: (r) => r.curso },
      ],
    );

    expect(csv).toContain('Nome,Curso');
    expect(csv).toContain('Ana,Maturidade');
  });

  it('coloca entre aspas e escapa valores com vírgula', () => {
    const csv = buildCsv<Row>(
      [{ nome: 'Silva, João', curso: 'CTL' }],
      [{ header: 'Nome', value: (r) => r.nome }],
    );

    expect(csv).toContain('"Silva, João"');
  });

  it('escapa aspas duplas duplicando-as', () => {
    const csv = buildCsv<Row>(
      [{ nome: 'Apelido "Zé"', curso: 'CTL' }],
      [{ header: 'Nome', value: (r) => r.nome }],
    );

    expect(csv).toContain('"Apelido ""Zé"""');
  });

  it('trata valores nulos/indefinidos como célula vazia, sem lançar erro', () => {
    const csv = buildCsv<{ nome: string | null }>(
      [{ nome: null }],
      [{ header: 'Nome', value: (r) => r.nome }],
    );

    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('');
  });

  it('começa com o BOM UTF-8', () => {
    const csv = buildCsv<Row>([], [{ header: 'Nome', value: (r) => r.nome }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
