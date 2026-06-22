// Test de base : vérifie que les 3 pages se chargent correctement
const { test, expect } = require('@playwright/test');

// Ne pas toucher la vraie base Supabase pendant les tests
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('pg_no_sb', '1'); } catch (e) {} });
});

test('@smoke la page joueur se charge et montre l\'écran d\'accueil', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/PadelGabon/i);
  await expect(page.locator('#p-splash')).toBeVisible();
});

test('@smoke la page admin se charge et demande le mot de passe', async ({ page }) => {
  await page.goto('/admin.html');
  await expect(page.locator('#admin-gate')).toBeVisible();
});

test('@smoke la page club se charge et demande la connexion', async ({ page }) => {
  await page.goto('/club.html');
  await expect(page.locator('#club-panel-login')).toBeVisible();
});
