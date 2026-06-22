// [H-04] Les créneaux déjà passés ne doivent PAS apparaître dans la grille
const { test, expect } = require('@playwright/test');
const { seedClub } = require('./_seed');

test("[H-04] aujourd'hui : aucun créneau passé ne doit être proposé", async ({ page }) => {
  await seedClub(page);
  await page.goto('/index.html');

  await page.evaluate(() => {
    window.curCI = 0;
    window.curCourtI = 0;
    window.curDur = 60;
    window.curDateKey = mkDK(new Date()); // aujourd'hui
    buildSlots();
  });

  const offered = await page.$$eval('#slot-grid .sl.free', els =>
    els.map(e => e.textContent.replace('✕','').trim())
  );

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();

  for (const label of offered) {
    const parts = label.split('h');
    const slotM = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
    expect(slotM, `Créneau passé proposé : ${label} alors qu'il est ${now.getHours()}h${String(now.getMinutes()).padStart(2,'0')}`).toBeGreaterThan(nowM);
  }
});
