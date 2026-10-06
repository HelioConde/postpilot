const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function openLocal(page) {
  await page.route('**/cdn.jsdelivr.net/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Um vídeo longo|One long video/i })).toBeVisible();
}

async function expectNoSeriousA11yViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(violation =>
    ['serious', 'critical'].includes(violation.impact)
  );

  expect(
    blocking,
    blocking.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map(node => node.target)
    }))
  ).toEqual([]);
}

test('home não possui violações sérias ou críticas de acessibilidade', async ({ page }) => {
  await openLocal(page);
  await expectNoSeriousA11yViolations(page);
});

test('pacote gerado continua sem violações sérias ou críticas', async ({ page }) => {
  await openLocal(page);

  await page.locator('[name="f0"]').fill('Acessibilidade para criadores');
  await page.locator('[name="f1"]').fill(
    'Explique o problema de forma simples. Mostre um exemplo objetivo. Finalize com um próximo passo claro para o público.'
  );
  await page.locator('[name="audience"]').fill('criadores de conteúdo');
  await page.getByRole('button', { name: /Montar pacote|Build content pack/i }).click();

  await expect(page.locator('#result')).toHaveClass(/show/);
  await expectNoSeriousA11yViolations(page);
});
