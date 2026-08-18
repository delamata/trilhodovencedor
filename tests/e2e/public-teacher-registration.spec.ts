import { expect, test } from '@playwright/test';

/**
 * Cadastro público de professor (sem login — mesmo espírito do
 * check-in público de aluno, BR-013). Cobre o que dá pra verificar
 * sem depender de dados semeados: a página nunca exige login e o
 * formulário de busca inicial carrega corretamente.
 */

test.describe('Cadastro de professor (sem login)', () => {
  test('/professores nunca exige login', async ({ page }) => {
    await page.goto('/professores');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('mostra o campo de busca por nome', async ({ page }) => {
    await page.goto('/professores');
    await expect(page.getByRole('heading', { name: 'Cadastro de professor' })).toBeVisible();
    await expect(page.getByLabel('Digite seu nome')).toBeVisible();
  });

  test('link "Cadastre-se aqui" na tela de login leva pra /professores', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Cadastre-se aqui' }).click();
    await expect(page).toHaveURL(/\/professores/);
  });
});
