const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.POSTPILOT_VISUAL_URL || 'http://127.0.0.1:4175';
const outputDir = path.join(process.cwd(), 'screenshots');

fs.mkdirSync(outputDir, { recursive: true });

async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('postpilot-packs');
    localStorage.setItem('postpilot-language', 'pt-BR');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('body');
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function createContext(browser, viewport) {
  return browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'pt-BR'
  });
}

async function captureLocale(browser, name, viewport, locale) {
  const context = await createContext(browser, viewport);
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(selectedLocale => {
    localStorage.removeItem('postpilot-packs');
    localStorage.setItem('postpilot-language', selectedLocale);
  }, locale);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('body');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: true,
    animations: 'disabled'
  });
  await context.close();
}

async function capture(browser, name, viewport) {
  const context = await createContext(browser, viewport);
  const page = await context.newPage();
  await preparePage(page);
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: true,
    animations: 'disabled'
  });
  await context.close();
}

async function capturePopulated(browser, name, viewport) {
  const context = await createContext(browser, viewport);
  const page = await context.newPage();
  await preparePage(page);

  await page.locator('[name="f0"]').fill('Como transformar uma ideia em conteúdo');
  await page.locator('[name="f1"]').fill(
    'Comece mostrando o problema que o público reconhece. Em seguida apresente um exemplo simples e uma solução prática. Finalize com uma chamada para ação clara e específica.'
  );
  await page.locator('[name="audience"]').fill('criadores e pequenos negócios');
  await page.locator('[name="publishAt"]').fill('2026-10-20');
  await page.locator('[name="f3"]').selectOption('didatico');
  await page.locator('#composer-submit').click();
  await page.waitForSelector('#result.show');

  await page.locator('#result').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('#toast')?.classList.contains('on'));
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: true,
    animations: 'disabled'
  });
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await capture(browser, 'postpilot-desktop.png', { width: 1440, height: 1000 });
    await capture(browser, 'postpilot-mobile.png', { width: 390, height: 844 });
    await capture(browser, 'postpilot-tablet.png', { width: 768, height: 1024 });
    await captureLocale(browser, 'postpilot-mobile-en.png', { width: 390, height: 844 }, 'en');
    await capturePopulated(browser, 'postpilot-desktop-populated.png', { width: 1440, height: 1000 });
    await capturePopulated(browser, 'postpilot-tablet-populated.png', { width: 768, height: 1024 });
    await capturePopulated(browser, 'postpilot-mobile-populated.png', { width: 390, height: 844 });

    fs.writeFileSync(
      path.join(outputDir, 'visual-state.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: BASE_URL,
        captures: {
          desktop: { width: 1440, height: 1000, fullPage: true },
          mobile: { width: 390, height: 844, fullPage: true },
          tablet: { width: 768, height: 1024, fullPage: true },
          mobileEnglish: { width: 390, height: 844, fullPage: true },
          desktopPopulated: { width: 1440, height: 1000, fullPage: true },
          tabletPopulated: { width: 768, height: 1024, fullPage: true },
          mobilePopulated: { width: 390, height: 844, fullPage: true }
        }
      }, null, 2) + '\n'
    );

    console.log('PostPilot visual snapshots generated in screenshots/.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
