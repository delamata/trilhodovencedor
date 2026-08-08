import { expect, test } from '@playwright/test';

/**
 * Fluxo de check-in público sem login (BR-013). Como o CI roda com
 * credenciais Supabase placeholder (sem projeto real), estes testes
 * cobrem o que dá pra verificar sem depender de dados semeados: a
 * página nunca exige login e sempre lida bem com um link inválido,
 * mostrando uma mensagem genérica — nunca um erro técnico ou uma
 * tela em branco.
 *
 * O caminho feliz completo (buscar nome → confirmar telefone →
 * presença registrada) é coberto pelos testes de integração
 * (`tests/integration/critical-rules.test.ts`, TESTE 15-18), que
 * chamam as funções `trilho_public_*` reais contra o Supabase de
 * verdade.
 */

test.describe('Check-in público (sem login)', () => {
  test('link com token inválido mostra mensagem genérica, sem quebrar a página', async ({ page }) => {
    await page.goto('/presenca/turma-que-nao-existe?t=token-errado');
    await expect(page.getByRole('heading', { name: 'Link inválido' })).toBeVisible();
    await expect(
      page.getByText('Este link de presença não é válido ou foi desativado.'),
    ).toBeVisible();
  });

  test('link sem token (?t= ausente) também é tratado como inválido, não como erro', async ({ page }) => {
    await page.goto('/presenca/turma-qualquer');
    await expect(page.getByRole('heading', { name: 'Link inválido' })).toBeVisible();
  });

  test('página carrega sem nenhuma navegação/menu do painel autenticado', async ({ page }) => {
    await page.goto('/presenca/turma-que-nao-existe?t=token-errado');
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });
});
