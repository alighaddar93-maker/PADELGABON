// V3-S5 : la raison de suspension d'un club (suspendedReason) doit être échappée
// avant d'être injectée en innerHTML dans le panneau admin (sinon XSS stocké).
const { test, expect } = require('@playwright/test');

test('[V3-S5] suspendedReason est echappe (pas de XSS dans l\'admin)', async ({ page }) => {
  const xss = '<img src=x onerror="window.__xss=1">';
  await page.addInitScript((reason) => {
    localStorage.setItem('pg_no_sb', '1');
    localStorage.setItem('pg_reset', 'v6');
    localStorage.setItem('pg_clubs', JSON.stringify([{
      name: 'Club Test', loc: 'Libreville', openFrom: '8', openTo: '22',
      prices: { 60: 20000 }, accessCode: '1234', open: true,
      suspended: true, suspendedReason: reason,
      courts: [{ name: 'Court 1', type: 'Intérieur', open: true }],
      coaches: [], products: [], pubs: []
    }]));
    localStorage.setItem('pg_clubs_ver', '999');
  }, xss);

  await page.goto('/admin.html');
  await page.waitForTimeout(300);

  // Ouvrir le panneau admin (bypass login) et forcer le rendu
  await page.evaluate(() => {
    if (typeof loadClubsFromStorage === 'function') loadClubsFromStorage();
    openAdminApp();
  });
  await page.waitForTimeout(300);

  // 1) Aucune balise <img> injectée dans la liste des suspendus
  expect(await page.locator('#clubs-susp-list img').count()).toBe(0);
  // 2) Le payload apparaît en TEXTE échappé
  const html = await page.locator('#clubs-susp-list').innerHTML();
  expect(html).toContain('&lt;img');
  // 3) Le handler onerror ne s'est jamais exécuté
  expect(await page.evaluate(() => window.__xss === 1)).toBe(false);
});
