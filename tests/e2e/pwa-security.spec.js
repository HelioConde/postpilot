const { test, expect } = require('@playwright/test');

test('PostPilot PWA protects drafts and caches from other applications', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const other = await caches.open('chibi-gg-cache-sentinel');
    await other.put('/outside', new Response('keep'));
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await page.goto('/?draft=private-regression-value');
  await page.evaluate(() => fetch('./version.json?draft=private-regression-value', { cache: 'no-store' }));
  const result = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const name of names) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map(request => request.url));
    }
    const other = await caches.open('chibi-gg-cache-sentinel');
    return {
      names, urls,
      otherValue: await (await other.match('/outside'))?.text()
    };
  });
  expect(result.names).toContain('postpilot-shell-v2');
  expect(result.otherValue).toBe('keep');
  expect(result.urls.some(url => url.includes('private-regression-value'))).toBe(false);
});

test('PostPilot service worker upgrade only cleans its own legacy caches', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const old = await navigator.serviceWorker.getRegistration();
    if (old) await old.unregister();
    await caches.open('postpilot-shell-v1');
    await caches.open('montapc-foreign-cache');
    await navigator.serviceWorker.register('./sw.js?qa=upgrade', { scope: './' });
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(async () => caches.keys())).not.toContain('postpilot-shell-v1');
  const keys = await page.evaluate(() => caches.keys());
  expect(keys).toContain('postpilot-shell-v2');
  expect(keys).toContain('montapc-foreign-cache');
});

test('PostPilot app shell and privacy page remain accessible offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  try {
    const response = await page.evaluate(async () => {
      const [shell, privacy] = await Promise.all([fetch('./index.html'), fetch('./privacidade.html')]);
      return { shellOk: shell.ok, shell: await shell.text(), privacyOk: privacy.ok };
    });
    expect(response.shellOk).toBe(true);
    expect(response.shell).toContain('id="account-dialog"');
    expect(response.privacyOk).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});
