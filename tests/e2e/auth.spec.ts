import { expect, test } from '@playwright/test';

/**
 * Fluxo crítico de autenticação/segurança. De propósito, estes testes
 * não dependem de um login bem-sucedido (não exigem um Supabase real
 * configurado) — cobrem o que dá pra verificar com qualquer projeto
 * Supabase (mesmo com credenciais placeholder, como no CI):
 *   - a tela de login carrega e valida os campos;
 *   - rotas protegidas (o painel admin/professor/aluno) nunca renderizam
 *     para quem não está logado, mesmo direto pela URL — sempre caem no
 *     /login (BR-014);
 *   - `/presenca/[turma]` é a única exceção de propósito — nunca deve
 *     cair no /login, mesmo sem sessão (BR-013), porque o check-in do
 *     aluno não depende mais de autenticação.
 */

test.describe('Login', () => {
  test('mostra o formulário com os campos esperados', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Trilho do Vencedor' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('valida campos obrigatórios antes de enviar', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Informe o e-mail.')).toBeVisible();
    await expect(page.getByText('Informe a senha.')).toBeVisible();
  });

  test('link "Esqueci minha senha" leva à tela correta', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
    await expect(page).toHaveURL(/\/esqueci-senha/);
    await expect(page.getByRole('heading', { name: 'Esqueci minha senha' })).toBeVisible();
  });
});

test.describe('Proteção de rotas', () => {
  const protectedPaths = [
    '/dashboard',
    '/alunos',
    '/cursos',
    '/turmas',
    '/turmas/nova',
    '/turmas/fila',
    '/aulas/00000000-0000-0000-0000-000000000000',
    '/relatorios',
    '/configuracoes',
    '/perfil',
  ];

  for (const path of protectedPaths) {
    test(`${path} redireciona para /login quando não autenticado`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('preserva o destino original no redirect (para voltar depois do login)', async ({ page }) => {
    await page.goto('/turmas?foo=bar');
    await expect(page).toHaveURL(/\/login\?redirect=/);
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/turmas?foo=bar');
  });

  test('/presenca/[turma] NUNCA exige login — check-in público não usa sessão', async ({ page }) => {
    await page.goto('/presenca/qualquer-codigo-de-turma?t=qualquer-token');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Trilho do Vencedor' })).toHaveCount(0);
  });
});
