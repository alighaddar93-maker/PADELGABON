// Quand le club annule, la carte "Mes réservations" du joueur doit passer en "Annulé"
const { test, expect } = require('@playwright/test');
const { seedClub } = require('./_seed');

const today = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
})();

test('@hist club annule → carte joueur affiche "Annulé"', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));
  await seedClub(page);
  await page.goto('/index.html');
  await page.waitForTimeout(300);

  // Le joueur a une réservation confirmée (créneau 480) dans son historique
  await page.evaluate((dk) => {
    DB.reservations = {}; DB.reservations['0-0-' + dk + '-480'] = true;
    saveResasToStorage();
    addToHistory('Club Test', 'Court 1 · Intérieur', 'auj', '08h00', '08h30', 0, 0, dk, 480, 510);
  }, today);

  // Vérifier statut "Confirmé" au départ
  let txt = await page.locator('#history-list .hist').first().textContent();
  expect(txt).toContain('Confirmé');

  // Le CLUB annule : supprime le créneau de pg_resas (simulé)
  await page.evaluate((dk) => {
    var r = JSON.parse(localStorage.getItem('pg_resas') || '{}');
    delete r['0-0-' + dk + '-480'];
    localStorage.setItem('pg_resas', JSON.stringify(r));
    // Déclenche la synchro comme le ferait l'événement storage
    syncHistoryWithResas();
  }, today);

  // La carte doit maintenant afficher "Annulé" et plus "Confirmé"
  txt = await page.locator('#history-list .hist').first().textContent();
  expect(txt).toContain('Annulé');
  expect(txt).not.toContain('Confirmé');

  expect(errors).toEqual([]);
});
