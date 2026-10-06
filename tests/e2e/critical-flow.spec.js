const { test, expect } = require('@playwright/test');

async function localMode(page) {
  await page.route('**/cdn.jsdelivr.net/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Um vídeo longo|One long video/i })).toBeVisible();
}

async function createPack(page, suffix = '') {
  await page.locator('[name="f0"]').fill('Marketing para pequenos negócios' + suffix);
  await page.locator('[name="f1"]').fill(
    'Comece definindo uma mensagem clara para o cliente. Depois transforme a ideia principal em exemplos simples. Finalize com uma chamada para ação objetiva.'
  );
  await page.locator('[name="audience"]').fill('donos de pequenos negócios');
  await page.locator('[name="publishAt"]').fill('2026-10-20');
  await page.locator('[name="f3"]').selectOption('didatico');
  await page.getByRole('button', { name: /Montar pacote|Build content pack/i }).click();
}

test('fluxo local cria pacote editorial e atualiza painel de produção', async ({ page }) => {
  await localMode(page);
  await createPack(page);

  await expect(page.locator('#result')).toHaveClass(/show/);
  await expect(page.locator('#result')).toContainText('Marketing para pequenos negócios');
  await expect(page.locator('#result')).toContainText('donos de pequenos negócios');

  const cards = page.locator('#production-summary article');
  await expect(cards.nth(0)).toContainText('1');
  await expect(cards.nth(2)).toContainText('1');

  const item = page.locator('#list .item').filter({ hasText: 'Marketing para pequenos negócios' }).first();
  await expect(item).toContainText('Planejado para');
  await expect(item).toContainText('20/10/2026');

  await page.locator('#project-search').fill('pequenos');
  await expect(page.locator('#list')).toContainText('Marketing para pequenos negócios');

  await item.locator('[data-status-id]').selectOption('ready');
  await expect(page.locator('#production-summary')).toContainText('1');

  const publishedItem = page.locator('#list .item').filter({ hasText: 'Marketing para pequenos negócios' }).first();
  await publishedItem.locator('[data-status-id]').selectOption('published');
  await expect(page.locator('#production-summary')).toContainText('100%');
});

test('exportação inclui briefing editorial e pacote por plataforma', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Export');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar \.txt|Export \.txt/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^postpilot-.*\.txt$/);
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString();

  expect(content).toContain('TEMA: Marketing para pequenos negócios Export');
  expect(content).toContain('PÚBLICO: donos de pequenos negócios');
  expect(content).toContain('DATA PLANEJADA: 2026-10-20');
  expect(content).toContain('PLATAFORMA: Instagram');
  expect(content).toContain('PLATAFORMA: TikTok');
  expect(content).toContain('PLATAFORMA: YouTube Shorts');
});

test('inglês traduz interface e geração sem alterar valores estruturais', async ({ page }) => {
  await localMode(page);
  await page.locator('[data-language="en"]').click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Your next video' })).toBeVisible();
  await expect(page.locator('[name="f3"]')).toHaveValue('natural');

  await page.locator('[name="f0"]').fill('Creator workflow');
  await page.locator('[name="f1"]').fill('Start with one clear idea. Turn it into a short example. Finish with one useful call to action.');
  await page.locator('[name="audience"]').fill('independent creators');
  await page.locator('[name="publishAt"]').fill('2026-10-22');
  await page.getByRole('button', { name: 'Build content pack' }).click();

  await expect(page.locator('#result')).toContainText('independent creators');
  await expect(page.locator('#result')).toContainText('Natural and direct');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export .txt' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString();

  expect(content).toContain('TOPIC: Creator workflow');
  expect(content).toContain('AUDIENCE: independent creators');
  expect(content).toContain('PLANNED DATE: 2026-10-22');
  expect(content).toContain('PLATFORM: Instagram');
});

for (const width of [360, 768, 1440]) {
  test(`layout principal não cria overflow horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await localMode(page);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}
