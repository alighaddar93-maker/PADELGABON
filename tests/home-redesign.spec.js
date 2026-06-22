// Vérifie le nouveau design Accueil + le clic club → page réservation (wiring intact)
const { test, expect } = require('@playwright/test');
const { seedClub } = require('./_seed');

test('@home nouveau design club + clic → page réservation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));
  await seedClub(page);
  await page.goto('/index.html');
  await page.waitForTimeout(400);

  // Aller à l'accueil (au cas où on est sur le splash)
  await page.evaluate(() => { try { gP('p-home'); } catch (e) {} try { renderHomeClubs(); } catch (e) {} });
  await page.waitForTimeout(200);

  // Le 1er club s'affiche en carte vedette
  const card = page.locator('#home-featured .hcard').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Club Test');
  await expect(card).toContainText('Réserver');

  // Clic sur la carte → la page réservation (p-club) devient active
  await card.click();
  await page.waitForTimeout(300);
  const clubActive = await page.evaluate(() => {
    var el = document.getElementById('p-club');
    return el && el.classList.contains('act');
  });
  expect(clubActive).toBe(true);

  expect(errors).toEqual([]);
});
