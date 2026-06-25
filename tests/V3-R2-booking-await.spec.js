// V3-R2 / V3-R1 / V3-R7 : la réservation doit ATTENDRE le serveur.
// On simule le mode "en ligne" en remplaçant sbCreateReservation par un mock
// contrôlable (pas besoin d'un vrai Supabase).
const { test, expect } = require('@playwright/test');

const CLUB = {
  name: 'Club Test', loc: 'Libreville', openFrom: '8', openTo: '22',
  prices: { 60: 20000 }, extras: [], accessCode: '1234', open: true, suspended: false,
  courts: [{ name: 'Court 1', type: 'Intérieur', open: true }],
  coaches: [], products: [], pubs: []
};

async function boot(page) {
  await page.addInitScript((club) => {
    localStorage.setItem('pg_no_sb', '1');
    localStorage.setItem('pg_reset', 'v6');
    localStorage.setItem('pg_clubs', JSON.stringify([club]));
    localStorage.setItem('pg_clubs_ver', '999');
  }, CLUB);
  await page.goto('/index.html');
  await page.waitForTimeout(300);
}

// prépare l'état "en ligne" + un mock de sbCreateReservation au comportement choisi
async function prime(page, mode) {
  await page.evaluate((mode) => {
    if (typeof loadClubsFromStorage === 'function') loadClubsFromStorage();
    DB.clubs[0]._id = 'club1';
    DB.clubs[0].courts[0]._id = 'court1';
    sbLoaded = true;
    window.__calls = 0;
    window.sbAddNotif = async () => {};
    window.sbCreateReservation = (data) => {
      window.__calls++;
      if (mode === 'reject') return Promise.reject(new Error('Ce créneau est déjà réservé par quelqu\'un d\'autre !'));
      if (mode === 'slow') return new Promise((res) => setTimeout(() => res({ id: 'r1' }), 400));
      return Promise.resolve({ id: 'r1' });
    };
    // état de réservation courant
    curCI = 0; curCourtI = 0; curDur = 60; curMachine = false; curExtras = [];
    curDateKey = '2026-12-25';
    var cb = document.getElementById('conf-box');
    cb.style.display = 'block'; cb.dataset.sm = '600'; cb.dataset.em = '660';
    DB.reservations = {};
  }, mode);
}

test('[V3-R2] échec serveur => pas d\'écran succès ni de résa locale', async ({ page }) => {
  await boot(page);
  await prime(page, 'reject');
  await page.evaluate(() => confirmResa());
  await page.waitForTimeout(200);

  // p-resa-ok ne doit PAS être l'écran actif
  const okActive = await page.locator('#p-resa-ok').evaluate(el => el.classList.contains('act')).catch(() => false);
  expect(okActive).toBe(false);
  // aucune réservation locale écrite
  const resaCount = await page.evaluate(() => Object.keys(DB.reservations).length);
  expect(resaCount).toBe(0);
});

test('[V3-R2] succès serveur => écran succès + résa locale', async ({ page }) => {
  await boot(page);
  await prime(page, 'resolve');
  await page.evaluate(() => confirmResa());
  await page.waitForTimeout(200);

  const okActive = await page.locator('#p-resa-ok').evaluate(el => el.classList.contains('act'));
  expect(okActive).toBe(true);
  // 1h = 2 créneaux de 30 min
  const resaCount = await page.evaluate(() => Object.keys(DB.reservations).length);
  expect(resaCount).toBe(2);
});

test('[V3-R7] double-clic pendant l\'attente => un seul appel serveur', async ({ page }) => {
  await boot(page);
  await prime(page, 'slow');
  // deux clics rapides avant que le 1er ne se termine
  await page.evaluate(() => { confirmResa(); confirmResa(); });
  await page.waitForTimeout(600);
  const calls = await page.evaluate(() => window.__calls);
  expect(calls).toBe(1);
});
