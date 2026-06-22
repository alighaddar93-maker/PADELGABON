// [C-05] La notification de réservation ne doit être envoyée qu'UNE seule fois
const { test, expect } = require('@playwright/test');
const { seedClub } = require('./_seed');

test('[C-05] confirmer une réservation envoie exactement 1 notification au club', async ({ page }) => {
  await seedClub(page);
  await page.goto('/index.html');

  // On compte combien de fois addClubNotif est appelée
  await page.evaluate(() => {
    window.__notifCount = 0;
    const orig = window.addClubNotif;
    window.addClubNotif = function() {
      window.__notifCount++;
      if (typeof orig === 'function') return orig.apply(this, arguments);
    };
  });

  // On simule une confirmation de réservation
  await page.evaluate(() => {
    // Initialise les variables globales nécessaires
    window.curCI = 0;
    window.curCourtI = 0;
    window.curDur = 60;
    var tomorrow = new Date(Date.now() + 24*3600*1000);
    window.curDateKey = mkDK(tomorrow);
    // Appelle directement confirmResa avec des créneaux fictifs
    window.confirmResa(10*60, 11*60);
  });

  const count = await page.evaluate(() => window.__notifCount);
  expect(count, `addClubNotif appelée ${count} fois, attendu 1`).toBe(1);
});
