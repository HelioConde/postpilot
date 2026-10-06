import { test, expect } from '@playwright/test';

test.describe('composer assistance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => localStorage.removeItem('postpilot-composer-draft-v1'));
    await page.reload();
  });

  test('updates briefing progress and saves an unfinished draft', async ({ page }) => {
    await page.locator('[name="f0"]').fill('Como transformar um vídeo em conteúdo');
    await page.locator('[name="f1"]').fill('Uma transcrição suficientemente detalhada para testar o contador e o progresso do briefing. '.repeat(4));
    await page.locator('[name="audience"]').fill('criadores iniciantes');

    await expect(page.locator('#briefing-progress-value')).not.toHaveText('0%');
    await expect(page.locator('#transcript-counter')).toContainText('/ 12.000');

    await page.waitForTimeout(350);
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('postpilot-composer-draft-v1') || 'null'));
    expect(draft?.topic).toBe('Como transformar um vídeo em conteúdo');
    expect(draft?.audience).toBe('criadores iniciantes');
  });

  test('offers draft recovery after reload', async ({ page }) => {
    await page.locator('[name="f0"]').fill('Briefing recuperável');
    await page.locator('[name="f1"]').fill('Conteúdo que não deve ser perdido ao fechar a página.');
    await page.waitForTimeout(350);
    await page.reload();

    await expect(page.locator('#composer-recovery')).toBeVisible();
    await page.locator('#composer-draft-restore').click();
    await expect(page.locator('[name="f0"]')).toHaveValue('Briefing recuperável');
    await expect(page.locator('#composer-recovery')).toBeHidden();
  });

  test('supports Ctrl+Enter from the composer', async ({ page }) => {
    await page.locator('[name="f0"]').fill('Atalho de produtividade');
    await page.locator('[name="f1"]').fill('Resumo válido para gerar o pacote pelo atalho de teclado.');
    await page.locator('[name="f0"]').press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
    await expect(page.locator('#result')).toHaveClass(/show/);
  });
});