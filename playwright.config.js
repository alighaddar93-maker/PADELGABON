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
    cwd: __dirname, // portable : fonctionne sur n'importe quelle machine (V3-F3)
  },
  projects: [
    // Suite par défaut : mode hors-ligne (pg_no_sb=1), ne touche aucune base.
    { name: 'Pixel 7', testIgnore: '**/online/**', use: { ...devices['Pixel 7'] } },
    // Suite EN LIGNE : tourne contre une VRAIE base Supabase de TEST (jamais la prod).
    // Activée seulement si PG_TEST_SUPABASE_URL / PG_TEST_SUPABASE_KEY sont définis.
    // Lancer : npx playwright test --project=online
    { name: 'online', testMatch: '**/online/**/*.spec.js', use: { ...devices['Pixel 7'] } },
  ],
});
