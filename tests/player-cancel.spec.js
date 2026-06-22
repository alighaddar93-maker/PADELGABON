// Tests : annulation joueur libère le créneau (Bug 1) + pas de résurrection (Bug 2)
const { test, expect } = require('@playwright/test');

const today = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
})();

const CLUB = {
  name: 'Club Test',
  courts: [{ name: 'Court 1', type: 'Intérieur', open: true }],
  prices: { 60: 20000 }, open: true, suspended: false, accessCode: '1234',
  coaches: [], products: [], pubs: []
};

function seed(page) {
  return page.addInitScript(({ club, dk }) => {
    localStorage.setItem('pg_no_sb','1'); localStorage.setItem('pg_reset', 'v6');
    localStorage.setItem('pg_clubs', JSON.stringify([club]));
    localStorage.setItem('pg_clubs_ver', '999');
  }, { club: CLUB, dk: today });
}

test('@p-cancel Bug1: le joueur annule sa résa → créneau libéré + notif club retirée', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));
  await seed(page);
  await page.goto('/index.html');
  await page.waitForTimeout(300);

  const res = await page.evaluate((dk) => {
    loadClubsFromStorage && loadClubsFromStorage();
    // Résa joueur existante : Court 0, 8h00->8h30 (créneau 480)
    DB.reservations = {}; DB.reservations['0-0-' + dk + '-480'] = true;
    saveResasToStorage();
    clubNotifs = { 0: [{ player: 'Ali', court: 'Court 1', date: 'x', dateKey: dk, start: '08h00', end: '08h30', read: false }] };
    saveNotifsToStorage();
    // Construire un faux élément historique avec dataset
    var el = document.createElement('div'); el.id = 'htest';
    el.dataset.ci = '0'; el.dataset.coi = '0'; el.dataset.dk = dk; el.dataset.sm = '480'; el.dataset.em = '510';
    var sp = document.createElement('span'); el.appendChild(sp);
    document.body.appendChild(el);
    DB.currentPlayer = { name: 'Ali', phone: '' };
    cancelResa('htest');
    var r = JSON.parse(localStorage.getItem('pg_resas') || '{}');
    var n = JSON.parse(localStorage.getItem('pg_notifs') || '{}');
    return { slotFree: !r['0-0-' + dk + '-480'], notifCount: (n['0'] || []).length };
  }, today);

  expect(res.slotFree).toBe(true);   // créneau libéré dans pg_resas
  expect(res.notifCount).toBe(0);    // notif club retirée
  expect(errors).toEqual([]);
});

test('@p-cancel Bug2: résa annulée par le club ne ressuscite pas après une nouvelle notif/résa', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));
  await seed(page);
  await page.goto('/index.html');
  await page.waitForTimeout(300);

  const res = await page.evaluate((dk) => {
    loadClubsFromStorage && loadClubsFromStorage();
    // État de départ : résa A (480) + notif A en storage ET en mémoire
    var r0 = {}; r0['0-0-' + dk + '-480'] = true;
    localStorage.setItem('pg_resas', JSON.stringify(r0));
    localStorage.setItem('pg_notifs', JSON.stringify({ 0: [{ player: 'Ali', court: 'Court 1', date: 'x', dateKey: dk, start: '8h00', end: '8h30', read: false }] }));
    loadResasFromStorage(); loadNotifsFromStorage(); // mémoire = A présent (état périmé à venir)

    // Le CLUB (autre page) annule A : supprime de pg_resas et pg_notifs
    localStorage.setItem('pg_resas', JSON.stringify({}));
    localStorage.setItem('pg_notifs', JSON.stringify({ 0: [] }));

    // Le JOUEUR refait une réservation B (créneau 600) — addClubNotif doit recharger l'état frais
    DB.currentPlayer = { name: 'Ali', phone: '' };
    loadResasFromStorage(); // fix booking : recharge avant d'ajouter
    DB.reservations['0-0-' + dk + '-600'] = true;
    saveResasToStorage();
    addClubNotif(0, 'Court 1', 'x', '10h00', '10h30', 'Ali', '', dk);

    var r = JSON.parse(localStorage.getItem('pg_resas') || '{}');
    var n = JSON.parse(localStorage.getItem('pg_notifs') || '{}');
    return {
      hasA: !!r['0-0-' + dk + '-480'],
      hasB: !!r['0-0-' + dk + '-600'],
      starts: (n['0'] || []).map(function (x) { return x.start; })
    };
  }, today);

  expect(res.hasA).toBe(false);              // A NE ressuscite PAS dans pg_resas
  expect(res.hasB).toBe(true);               // B bien enregistré
  expect(res.starts).not.toContain('8h00');  // notif A absente de la liste club
  expect(res.starts).toContain('10h00');     // notif B présente
  expect(errors).toEqual([]);
});
