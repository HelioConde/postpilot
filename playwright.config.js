const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true
  },
  webServer: {
    command: 'python3 -m http.server 4175 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: true,
    timeout: 10000
  }
});
