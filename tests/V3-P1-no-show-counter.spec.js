// V3-P1 : le club peut marquer une absence (no-show) ; on compte sans bloquer.
const { test, expect } = require('@playwright/test');

test('[V3-P1] le compteur d\'absences s\'incremente par joueur', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('pg_no_sb', '1'); });
  await page.goto('/club.html');
  await page.waitForTimeout(300);

  const res = await page.evaluate(() => {
    var a1 = cpAddNoShow('Ali');
    var a2 = cpAddNoShow('Ali');
    var b1 = cpAddNoShow('Bob');
    return { ali: cpNoShowCount('Ali'), bob: cpNoShowCount('Bob'), a1: a1, a2: a2, b1: b1, unknown: cpNoShowCount('Zoe') };
  });

  expect(res.a1).toBe(1);
  expect(res.a2).toBe(2);
  expect(res.ali).toBe(2);
  expect(res.bob).toBe(1);
  expect(res.unknown).toBe(0);
});
