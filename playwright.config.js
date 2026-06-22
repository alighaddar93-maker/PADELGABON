const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 10_000,
    cwd: 'C:/Users/Ali/Downloads/PadelGabon_PWA_1',
  },
  projects: [
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
  ],
});
