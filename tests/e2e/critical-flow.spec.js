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

test('layout responsivo não cria overflow e mantém a semana completa', async ({ page }) => {
  const widths = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 }
  ];

  for (const viewport of widths) {
    await page.setViewportSize(viewport);
    await localMode(page);

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    await expect(page.locator('#calendar-grid .calendar-day')).toHaveCount(7);
    await expect(page.locator('#account-open')).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const navBoxes = await page.evaluate(() => {
    const brand = document.querySelector('.brand')?.getBoundingClientRect();
    const account = document.querySelector('#account-open')?.getBoundingClientRect();
    const language = document.querySelector('.language-switcher')?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return brand && account && language
      ? {
          brandRight: brand.right,
          brandBottom: brand.bottom,
          accountLeft: account.left,
          accountRight: account.right,
          languageTop: language.top,
          languageRight: language.right,
          viewportWidth
        }
      : null;
  });
  expect(navBoxes).not.toBeNull();
  expect(navBoxes.accountLeft).toBeGreaterThanOrEqual(navBoxes.brandRight + 4);
  expect(navBoxes.languageTop).toBeGreaterThanOrEqual(navBoxes.brandBottom);
  expect(navBoxes.accountRight).toBeLessThanOrEqual(navBoxes.viewportWidth + 1);
  expect(navBoxes.languageRight).toBeLessThanOrEqual(navBoxes.viewportWidth + 1);
});

test('navegação por teclado oferece skip link e foco principal', async ({ page }) => {
  await localMode(page);

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#main-content');

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.locator('[data-language="en"]').click();
  await expect(skip).toHaveText(/Skip to content/i);
});

test('fluxo local cria pacote editorial e atualiza painel de produção', async ({ page }) => {
  await localMode(page);
  await expect(page.locator('#ai-generation')).toBeDisabled();
  await expect(page.locator('#media-file')).toBeDisabled();
  await expect(page.locator('.ai-generation-option')).toContainText(/Disponível ao entrar|Available after signing in/i);
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

test('pacotes oferecem publicação assistida por plataforma', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Publicação assistida');

  const actions = page.locator('[data-publish-platform]');
  await expect(actions).toHaveCount(3);
  await expect(actions.nth(0)).toHaveText(/Copiar e abrir|Copy & open/i);
});

test('exportação oferece TXT, Markdown, JSON e CSV', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Export');

  const formats = [
    ['txt', /TEMA: Marketing para pequenos negócios Export/],
    ['md', /# Marketing para pequenos negócios Export/],
    ['json', /"topic": "Marketing para pequenos negócios Export"/],
    ['csv', /"platform","field","value"/]
  ];

  for (const [format, expected] of formats) {
    await page.locator('#export-format').selectOption(format);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(new RegExp('^postpilot-.*\\.' + format + '$'));

    const stream = await download.createReadStream();
    let content = '';
    for await (const chunk of stream) content += chunk.toString();
    expect(content).toMatch(expected);
  }
});

test('exportações estruturadas incluem mídia, timestamps e cortes', async ({ page }) => {
  await localMode(page);
  await page.evaluate(() => {
    localStorage.setItem('postpilot-packs', JSON.stringify([{
      id: '44444444-4444-4444-8444-444444444444',
      topic: 'Pacote com mídia',
      transcript: 'Primeiro trecho completo para exportação. Segundo trecho completo para exportação.',
      platforms: ['Instagram'],
      channel: 'Instagram',
      tone: 'natural',
      goal: 'alcance',
      audience: 'criadores',
      publishAt: '2026-10-22',
      publishChecklist: {},
      generationMode: 'local',
      generationData: {},
      mediaPath: 'user/project/video.mp4',
      mediaName: 'video.mp4',
      mediaType: 'video/mp4',
      mediaSizeBytes: 1048576,
      transcriptionSegments: [
        { start: 5, end: 20, text: 'Primeiro trecho completo para exportação com contexto suficiente.' },
        { start: 20, end: 38, text: 'Segundo trecho completo para exportação com contexto suficiente.' }
      ],
      cutOverrides: [
        { key: '5.00-20.00', start: 6, end: 19, favorite: true, rejected: false }
      ],
      contentOverrides: {},
      versions: [],
      status: 'draft',
      createdAt: Date.now(),
      time: Date.now()
    }]));
  });
  await page.reload();
  await page.locator('[data-pack="44444444-4444-4444-8444-444444444444"]').click();

  await page.locator('#export-format').selectOption('json');
  let downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  let download = await downloadPromise;
  let stream = await download.createReadStream();
  let jsonContent = '';
  for await (const chunk of stream) jsonContent += chunk.toString();
  const parsed = JSON.parse(jsonContent);
  expect(parsed.version).toBe(2);
  expect(parsed.package.media.name).toBe('video.mp4');
  expect(parsed.package.transcriptionSegments).toHaveLength(2);
  expect(parsed.package.clips[0].favorite).toBe(true);
  expect(parsed.package.clips[0].start).toBe(6);

  await page.locator('#export-format').selectOption('csv');
  downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  download = await downloadPromise;
  stream = await download.createReadStream();
  let csvContent = '';
  for await (const chunk of stream) csvContent += chunk.toString();
  expect(csvContent).toContain('"META","media_name","video.mp4"');
  expect(csvContent).toContain('"TRANSCRIPT"');
  expect(csvContent).toContain('"CLIP"');
  expect(csvContent).toContain('favorite');
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

  await expect(page.locator('.export-format')).toContainText('Export');
  await page.locator('#export-format').selectOption('txt');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString();

  expect(content).toContain('TOPIC: Creator workflow');
  expect(content).toContain('AUDIENCE: independent creators');
  expect(content).toContain('PLANNED DATE: 2026-10-22');
  expect(content).toContain('PLATFORM: Instagram');
});

test('botão da conta usa rótulo curto no mobile e completo no desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await localMode(page);
  await expect(page.locator('.account-open-short')).toBeVisible();
  await expect(page.locator('.account-open-short')).toHaveText(/Entrar|Sign in/i);
  await expect(page.locator('.account-open-full')).toBeHidden();

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator('.account-open-full')).toBeVisible();
  await expect(page.locator('.account-open-full')).toHaveText(/Entrar \/ sincronizar|Sign in \/ sync/i);
  await expect(page.locator('.account-open-short')).toBeHidden();
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

test('exibe sugestões de cortes quando existem timestamps de transcrição', async ({ page }) => {
  await localMode(page);
  await page.evaluate(() => {
    localStorage.setItem('postpilot-packs', JSON.stringify([{
      id: '11111111-1111-4111-8111-111111111111',
      topic: 'Vídeo com timestamps',
      transcript: 'Primeiro trecho relevante. Segundo trecho com uma explicação prática.',
      platforms: ['Instagram'],
      channel: 'Instagram',
      tone: 'natural',
      goal: 'alcance',
      audience: '',
      publishAt: '',
      publishChecklist: {},
      generationMode: 'local',
      generationData: {},
      transcriptionSegments: [
        { start: 8.2, end: 23.8, text: 'Explique o problema com um exemplo simples e mostre a solução em seguida.' },
        { start: 31.0, end: 49.5, text: 'Mostre o resultado final e termine com uma chamada para ação objetiva.' }
      ],
      status: 'draft',
      createdAt: Date.now(),
      time: Date.now()
    }]));
  });
  await page.reload();

  await page.locator('[data-pack="11111111-1111-4111-8111-111111111111"]').click();
  await expect(page.locator('.cut-suggestions')).toBeVisible();
  await expect(page.locator('.cut-suggestions')).toContainText(/Sugestões de cortes|Clip suggestions/i);
  await expect(page.locator('.cut-suggestions')).toContainText('0:08–0:23');
  await expect(page.locator('.cut-suggestions')).toContainText('0:31–0:49');
});

test('analytics locais resumem padrões de produção', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Analytics');

  const insights = page.locator('#production-insights');
  await expect(insights).toBeVisible();
  await expect(insights).toContainText('Instagram');
  await expect(insights).toContainText(/Gerar conversa|Start conversation|Your editorial rhythm|Seu ritmo editorial/i);
});

test('dashboard de foco e filtros avançados organizam a produção', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Filtros');
  await expect(page.locator('#focus-dashboard')).toBeVisible();
  await expect(page.locator('#focus-dashboard')).toContainText(/Rascunhos|Drafts/i);

  await page.locator('.advanced-filters summary').click();
  await expect(page.locator('#project-platform-filter')).toBeVisible();
  await page.locator('#project-platform-filter').selectOption('Instagram');
  await expect(page.locator('#list')).toContainText('Marketing para pequenos negócios Filtros');

  await page.locator('#project-platform-filter').selectOption('YouTube Shorts');
  await expect(page.locator('#list')).toContainText('Marketing para pequenos negócios Filtros');

  await page.locator('#project-generation-filter').selectOption('ai');
  await expect(page.locator('#list')).not.toContainText('Marketing para pequenos negócios Filtros');

  await page.locator('#project-filter-reset').click();
  await expect(page.locator('#list')).toContainText('Marketing para pequenos negócios Filtros');
});

test('editor de transcrição permite editar e dividir segmentos', async ({ page }) => {
  await localMode(page);
  await page.evaluate(() => {
    localStorage.setItem('postpilot-packs', JSON.stringify([{
      id: '33333333-3333-4333-8333-333333333333',
      topic: 'Editor de transcrição',
      transcript: 'Primeiro trecho completo. Segundo trecho completo.',
      platforms: ['Instagram'],
      channel: 'Instagram',
      tone: 'natural',
      goal: 'alcance',
      audience: '',
      publishAt: '',
      publishChecklist: {},
      generationMode: 'local',
      generationData: {},
      transcriptionSegments: [
        { start: 0, end: 20, text: 'Primeiro trecho completo com contexto suficiente para dividir em duas partes úteis.' },
        { start: 20, end: 35, text: 'Segundo trecho completo para continuar o teste.' }
      ],
      cutOverrides: [],
      contentOverrides: {},
      versions: [],
      status: 'draft',
      createdAt: Date.now(),
      time: Date.now()
    }]));
  });
  await page.reload();
  await page.locator('[data-pack="33333333-3333-4333-8333-333333333333"]').click();
  await page.locator('.transcript-editor summary').click();

  await expect(page.locator('[data-segment-index]')).toHaveCount(2);
  await page.locator('[data-segment-index="0"] [data-segment-split]').click();
  await expect(page.locator('[data-segment-index]')).toHaveCount(3);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('postpilot-packs') || '[]')[0]);
  expect(saved.transcriptionSegments).toHaveLength(3);
  expect(saved.transcript.length).toBeGreaterThan(20);
});

test('editor de cortes persiste ajustes no modo local', async ({ page }) => {
  await localMode(page);
  await page.evaluate(() => {
    localStorage.setItem('postpilot-packs', JSON.stringify([{
      id: '22222222-2222-4222-8222-222222222222',
      topic: 'Editor de cortes',
      transcript: 'Conteúdo com timestamps para edição.',
      platforms: ['Instagram'],
      channel: 'Instagram',
      tone: 'natural',
      goal: 'alcance',
      audience: '',
      publishAt: '',
      publishChecklist: {},
      generationMode: 'local',
      generationData: {},
      transcriptionSegments: [
        { start: 10, end: 30, text: 'Trecho suficientemente longo para ser usado como sugestão de corte editável.' }
      ],
      cutOverrides: [],
      status: 'draft',
      createdAt: Date.now(),
      time: Date.now()
    }]));
  });
  await page.reload();
  await page.locator('[data-pack="22222222-2222-4222-8222-222222222222"]').click();

  const cut = page.locator('[data-cut-key]').first();
  await cut.locator('[data-cut-favorite]').click();
  await expect(page.locator('[data-cut-key]').first()).toHaveClass(/is-favorite/);

  await page.locator('[data-cut-key]').first().locator('[data-cut-start]').fill('12.5');
  await page.locator('[data-cut-key]').first().locator('[data-cut-start]').dispatchEvent('change');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('postpilot-packs') || '[]')[0]);
  expect(saved.cutOverrides[0].favorite).toBe(true);
  expect(saved.cutOverrides[0].start).toBe(12.5);
});

test('histórico local permite restaurar uma versão anterior', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Versão');
  let item = page.locator('#list .item').filter({ hasText: 'Marketing para pequenos negócios Versão' }).first();
  await item.locator('[data-edit-pack]').click();
  await page.locator('[name="f0"]').fill('Versão editada');
  await page.locator('#composer-submit').click();

  await page.locator('#list .item').filter({ hasText: 'Versão editada' }).first().locator('[data-pack]').click();
  const history = page.locator('.version-history');
  await history.locator('summary').click();
  await expect(history.locator('.version-item')).toHaveCount(2);

  await history.locator('[data-restore-version]').last().click();
  await expect(page.locator('#result')).toContainText('Marketing para pequenos negócios Versão');
});

test('calendário alterna entre semana e mês e filtra plataforma', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Calendário avançado');

  await expect(page.locator('#calendar-grid .calendar-day')).toHaveCount(7);
  await page.locator('#calendar-view').selectOption('month');
  await expect(page.locator('#calendar-grid .calendar-day')).toHaveCount(42);

  await page.locator('#calendar-platform').selectOption('Instagram');
  await expect(page.locator('#calendar-grid')).toContainText('Marketing para pequenos negócios Calendário avançado');

  await page.locator('#calendar-platform').selectOption('TikTok');
  await expect(page.locator('#calendar-grid')).toContainText('Marketing para pequenos negócios Calendário avançado');
});

test('regeneração parcial altera somente um campo do pacote', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Regeneração');

  const card = page.locator('.platform-card').filter({ hasText: 'Instagram' }).first();
  const firstField = card.locator('[data-deliverable-platform]').first();
  const before = await firstField.locator('p').innerText();
  await firstField.locator('[data-regenerate-field]').click();
  const after = await page.locator('.platform-card').filter({ hasText: 'Instagram' }).first().locator('[data-deliverable-platform]').first().locator('p').innerText();

  expect(after).not.toBe(before);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('postpilot-packs') || '[]')[0]);
  expect(Object.keys(saved.contentOverrides || {}).length).toBeGreaterThan(0);
});

test('exporta planejamento editorial em iCalendar', async ({ page }) => {
  await localMode(page);
  await createPack(page, ' Calendário');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#calendar-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('postpilot-calendario-editorial.ics');
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString();

  expect(content).toContain('BEGIN:VCALENDAR');
  expect(content).toContain('VERSION:2.0');
  expect(content).toContain('DTSTART;VALUE=DATE:20261020');
  expect(content).toContain('SUMMARY:PostPilot · Marketing para pequenos negócios Calendário');
  expect(content).toContain('Instagram');
  expect(content).toContain('TikTok');
  expect(content).toContain('YouTube Shorts');
  expect(content).toContain('END:VCALENDAR');
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
