// Test end-to-end : annulation d'une réservation par le club libère le créneau
const { test, expect } = require('@playwright/test');

const today = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
})();

const CLUB = {
  name: 'Club Test',
  loc: 'Libreville',
  openFrom: '8h00', openTo: '22h00',
  prices: { 60: 20000, 90: 28000, 120: 36000 },
  accessCode: '1234',
  open: true, suspended: false,
  courts: [{ name: 'Court 1', type: 'Intérieur', open: true }],
  coaches: [], products: [], pubs: []
};

// Une réservation app : Court 1, 8h00 -> 9h00 (480 -> 540), créneau 480 et 510
const NOTIF = {
  msg: 'Ali — Court 1 · ' + today + ' · 8h00-9h00',
  player: 'Ali', phone: '074000000',
  court: 'Court 1', date: today, dateKey: today,
  start: '8h00', end: '9h00', time: "A l'instant", read: false
};

test('@cancel club annule une réservation app et libère le créneau', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));

  // 1. Seed localStorage AVANT le chargement du script
  await page.addInitScript(({ club, notif, dk }) => {
    localStorage.setItem('pg_no_sb','1'); localStorage.setItem('pg_reset', 'v6'); // évite le wipe au 1er chargement
    localStorage.setItem('pg_clubs', JSON.stringify([club]));
    localStorage.setItem('pg_clubs_ver', '999');
    localStorage.setItem('pg_notifs', JSON.stringify({ 0: [notif] }));
    // Réservation : court index 0, deux créneaux de 30 min (480, 510)
    var resas = {};
    resas['0-0-' + dk + '-480'] = { player: 'Ali' };
    resas['0-0-' + dk + '-510'] = { player: 'Ali' };
    localStorage.setItem('pg_resas', JSON.stringify(resas));
  }, { club: CLUB, notif: NOTIF, dk: today });

  await page.goto('/club.html');
  await page.waitForTimeout(400);

  // 2. Ouvrir le tableau de bord club (bypass de la connexion : en prod l'accès
  //    passe UNIQUEMENT par Supabase Auth, qui est désactivé en mode test offline).
  await page.evaluate(() => {
    if (typeof loadClubsFromStorage === 'function') loadClubsFromStorage();
    cpCI = 0;
    document.getElementById('club-panel-login').style.display = 'none';
    document.getElementById('club-panel-dash').style.display = 'block';
    cpLoadDash();
  });
  await page.waitForTimeout(400);

  // 3. La réservation doit être visible
  const listText = await page.locator('#cp-unified-list').textContent();
  expect(listText).toContain('Ali');
  expect(listText).toContain('Court 1');

  // 4. Vérifier que le créneau est bien occupé AVANT annulation
  const before = await page.evaluate((dk) => {
    var r = JSON.parse(localStorage.getItem('pg_resas') || '{}');
    return { k480: !!r['0-0-' + dk + '-480'], k510: !!r['0-0-' + dk + '-510'] };
  }, today);
  expect(before.k480).toBe(true);
  expect(before.k510).toBe(true);

  // 5. Cliquer "✕ Annuler" puis confirmer "Oui"
  await page.click('#cp-unified-list button:has-text("Annuler")');
  await page.waitForTimeout(200);
  await page.click('text=Oui');
  await page.waitForTimeout(400);

  // 6. Le créneau doit être LIBÉRÉ dans pg_resas
  const after = await page.evaluate((dk) => {
    var r = JSON.parse(localStorage.getItem('pg_resas') || '{}');
    var n = JSON.parse(localStorage.getItem('pg_notifs') || '{}');
    return {
      k480: !!r['0-0-' + dk + '-480'],
      k510: !!r['0-0-' + dk + '-510'],
      notifCount: (n['0'] || []).length
    };
  }, today);
  expect(after.k480).toBe(false);
  expect(after.k510).toBe(false);
  expect(after.notifCount).toBe(0);

  // 7. Pas d'erreur JS
  expect(errors).toEqual([]);
});
