// V3-S1 : le repli mot de passe maître "padel2026" (admin) et code "1234" (club)
// doivent être SUPPRIMÉS du code de production. Même en mode hors-ligne forcé
// (localStorage.pg_no_sb=1, l'astuce qu'un attaquant utiliserait), "padel2026"
// ne doit PLUS ouvrir l'admin. L'accès passe UNIQUEMENT par Supabase Auth.
const { test, expect } = require('@playwright/test');

test('[V3-S1] padel2026 n\'ouvre plus l\'admin, meme avec pg_no_sb=1', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('pg_no_sb', '1'); });
  await page.goto('/admin.html');
  await page.waitForTimeout(300);

  // 1) La constante ADMIN_PASSWORD ne doit plus exister dans le code
  const constExists = await page.evaluate(() => typeof ADMIN_PASSWORD !== 'undefined');
  expect(constExists).toBe(false);

  // 2) Tenter l'ancien mot de passe maître
  await page.fill('#admin-pwd', 'padel2026');
  await page.click('#admin-gate button.asub');
  await page.waitForTimeout(500);

  // 3) L'admin NE doit PAS s'ouvrir : la porte (overlay plein écran) reste affichée.
  //    (openAdminApp masque la porte ; tant qu'elle est visible, l'accès est refusé.)
  expect(await page.locator('#admin-gate').isVisible()).toBe(true);
  // Message d'erreur de connexion affiché
  expect(await page.locator('#admin-pwd-error').isVisible()).toBe(true);
});

test('[V3-S1] le code club 1234 n\'ouvre plus le panneau club, meme offline', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pg_no_sb', '1');
    localStorage.setItem('pg_reset', 'v6');
    localStorage.setItem('pg_clubs', JSON.stringify([{
      name: 'Club Test', loc: 'Libreville', openFrom: '8', openTo: '22',
      prices: { 60: 20000 }, accessCode: '1234', open: true, suspended: false,
      courts: [{ name: 'Court 1', type: 'Intérieur', open: true }],
      coaches: [], products: [], pubs: []
    }]));
    localStorage.setItem('pg_clubs_ver', '999');
  });
  await page.goto('/club.html');
  await page.waitForTimeout(300);

  // L'ancien champ code ne doit plus être un moyen de connexion : le formulaire
  // email/mot de passe est affiché, et cpLogin refuse hors-ligne.
  await page.evaluate(() => { if (typeof cpLogin === 'function') cpLogin(); });
  await page.waitForTimeout(300);

  // Le panneau de connexion reste visible, le dashboard reste caché
  expect(await page.locator('#club-panel-login').isVisible()).toBe(true);
  expect(await page.locator('#club-panel-dash').isVisible()).toBe(false);
});
