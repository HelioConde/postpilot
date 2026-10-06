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

async function capture(browser, name, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'pt-BR'
  });
  const page = await context.newPage();
  await preparePage(page);
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

    fs.writeFileSync(
      path.join(outputDir, 'visual-state.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: BASE_URL,
        captures: {
          desktop: { width: 1440, height: 1000, fullPage: true },
          mobile: { width: 390, height: 844, fullPage: true }
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
