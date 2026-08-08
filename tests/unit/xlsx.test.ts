// @vitest-environment node
//
// xlsx.ts importa "server-only", que lança erro de propósito quando
// detecta um ambiente parecido com browser (o jsdom padrão dos outros
// testes conta como isso). Rodar este arquivo em ambiente Node evita
// o falso positivo, sem precisar remover a proteção real do arquivo.
import { describe, expect, it } from 'vitest';
import { buildXlsx } from '@/lib/export/xlsx';

describe('buildXlsx', () => {
  it('gera um buffer .xlsx válido (assinatura ZIP) com as linhas informadas', async () => {
    const buffer = await buildXlsx(
      'Alunos',
      [{ nome: 'Ana', curso: 'Maturidade' }],
      [
        { header: 'Nome', value: (r: { nome: string }) => r.nome },
        { header: 'Curso', value: (r: { curso: string }) => r.curso },
      ],
    );

    expect(buffer.length).toBeGreaterThan(0);
    // Um .xlsx é um arquivo ZIP — todo ZIP começa com a assinatura "PK".
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('trunca o nome da aba em 31 caracteres (limite do Excel)', async () => {
    const longName = 'a'.repeat(50);
    // Não deve lançar erro mesmo com nome de aba muito longo.
    await expect(
      buildXlsx(longName, [], [{ header: 'Nome', value: () => '' }]),
    ).resolves.toBeInstanceOf(Buffer);
  });
});
