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


test('calendário semanal mostra pacote agendado e abre a prévia', async ({ page }) => {
  await localMode(page);
  const today = await page.evaluate(() => {
    const date = new Date();
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  });

  await page.locator('[name="f0"]').fill('Conteúdo do calendário');
  await page.locator('[name="f1"]').fill('Uma ideia longa o suficiente para virar um pacote editorial e aparecer no planejamento semanal.');
  await page.locator('[name="publishAt"]').fill(today);
  await page.getByRole('button', { name: /Montar pacote|Build content pack/i }).click();

  const calendar = page.locator('#calendar-grid');
  await expect(calendar).toContainText('Conteúdo do calendário');
  await calendar.getByRole('button', { name: /Conteúdo do calendário/i }).click();
  await expect(page.locator('#result')).toContainText('Conteúdo do calendário');
});

test('editar atualiza o pacote e usar como modelo cria outro rascunho', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Editável');

  let item = page.locator('#list .item').filter({ hasText: 'Marketing para pequenos negócios Editável' }).first();
  await item.locator('[data-edit-pack]').click();
  await expect(page.locator('#composer-mode')).toBeVisible();
  await expect(page.locator('#composer-submit')).toHaveText(/Salvar alterações|Save changes/);

  await page.locator('[name="f0"]').fill('Marketing editado');
  await page.locator('#composer-submit').click();
  await expect(page.locator('#list')).toContainText('Marketing editado');
  await expect(page.locator('#list .item')).toHaveCount(1);

  item = page.locator('#list .item').filter({ hasText: 'Marketing editado' }).first();
  await item.locator('[data-template-pack]').click();
  await expect(page.locator('[name="publishAt"]')).toHaveValue('');
  await expect(page.locator('#composer-submit')).toHaveText(/Montar pacote|Build content pack/);

  await page.locator('[name="f0"]').fill('Marketing derivado do modelo');
  await page.locator('#composer-submit').click();

  await expect(page.locator('#list')).toContainText('Marketing editado');
  await expect(page.locator('#list')).toContainText('Marketing derivado do modelo');
  await expect(page.locator('#list .item')).toHaveCount(2);
});


test('checklist de publicação persiste por plataforma', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Checklist');

  const card = page.locator('.platform-card').filter({ hasText: 'Instagram' }).first();
  await card.locator('[data-check-step="reviewed"]').check();
  await card.locator('[data-check-step="mediaReady"]').check();
  await expect(page.locator('.pack-checklist-progress')).toContainText('2/9');

  await page.reload();
  const item = page.locator('#list .item').filter({ hasText: 'Marketing para pequenos negócios Checklist' }).first();
  await item.getByRole('button', { name: /Abrir|Open/i }).click();

  const restored = page.locator('.platform-card').filter({ hasText: 'Instagram' }).first();
  await expect(restored.locator('[data-check-step="reviewed"]')).toBeChecked();
  await expect(restored.locator('[data-check-step="mediaReady"]')).toBeChecked();
  await expect(restored.locator('[data-check-step="published"]')).not.toBeChecked();
});


test('backup local exporta e restaura pacotes', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Backup');
  await expect(page.locator('#list')).toContainText('Marketing para pequenos negócios Backup');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-backup').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^postpilot-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString();
  const backup = JSON.parse(content);
  expect(backup.format).toBe('postpilot-backup');
  expect(backup.version).toBe(1);
  expect(backup.packs.some(pack => pack.topic === 'Marketing para pequenos negócios Backup')).toBe(true);

  await page.evaluate(() => localStorage.removeItem('postpilot-packs'));
  await page.reload();
  await expect(page.locator('#list')).not.toContainText('Marketing para pequenos negócios Backup');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#import-backup-file').setInputFiles({
    name: 'postpilot-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content)
  });

  await expect(page.locator('#list')).toContainText('Marketing para pequenos negócios Backup');
});

test('PWA mantém criação local disponível offline após primeira abertura', async ({ page, context }) => {
  await localMode(page);
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Seu próximo vídeo|Your next video/i })).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Seu próximo vídeo|Your next video/i })).toBeVisible();

  await page.locator('[name="f0"]').fill('Pacote offline');
  await page.locator('[name="f1"]').fill('Este conteúdo foi criado sem conexão depois que o shell do aplicativo ficou disponível no cache.');
  await page.getByRole('button', { name: /Montar pacote|Build content pack/i }).click();
  await expect(page.locator('#result')).toContainText('Pacote offline');

  await context.setOffline(false);
});


test('modelo rápido configura briefing sem alterar conteúdo', async ({ page }) => {
  await localMode(page);
  await page.locator('[name="f0"]').fill('Tema preservado');
  await page.locator('[name="f1"]').fill('Transcrição preservada com contexto suficiente para confirmar que o template não substitui o conteúdo.');
  await page.locator('#content-template').selectOption('local-business');
  await page.locator('#apply-content-template').click();

  await expect(page.locator('[name="f0"]')).toHaveValue('Tema preservado');
  await expect(page.locator('[name="f1"]')).toHaveValue(/Transcrição preservada/);
  await expect(page.locator('[name="audience"]')).toHaveValue('potenciais clientes da sua região');
  await expect(page.locator('[name="goal"]')).toHaveValue('oferta');
  await expect(page.locator('[name="f3"]')).toHaveValue('natural');
  await expect(page.locator('[name="platforms"][value="Instagram"]')).toBeChecked();
  await expect(page.locator('[name="platforms"][value="TikTok"]')).toBeChecked();
  await expect(page.locator('[name="platforms"][value="YouTube Shorts"]')).not.toBeChecked();
});

test('feedback beta entra na fila local quando backend não está disponível', async ({ page }) => {
  await localMode(page);
  await page.locator('#beta-feedback-open').click();
  await expect(page.locator('#beta-feedback-dialog')).toBeVisible();

  await page.locator('#beta-feedback-form label').filter({ hasText: /^5$/ }).click();
  await page.locator('#beta-feedback-form select[name="category"]').selectOption('quality');
  await page.locator('#beta-feedback-form textarea[name="comment"]').fill('O calendário editorial ficou claro e rápido de usar.');
  await page.getByRole('button', { name: /Enviar feedback|Send feedback/i }).click();

  await expect(page.locator('#beta-feedback-status')).toContainText(/Feedback salvo|Feedback saved/);
  const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('postpilot-beta-feedback-queue-v1') || '[]'));
  expect(queue).toHaveLength(1);
  expect(queue[0].rating).toBe(5);
  expect(queue[0].category).toBe('quality');
  expect(queue[0]).not.toHaveProperty('email');
  expect(queue[0]).not.toHaveProperty('transcript');
});
