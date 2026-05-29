// [H-01] Les noms de clubs avec du HTML malveillant ne doivent PAS être exécutés
const { test, expect } = require('@playwright/test');

test('[H-01] un nom de club avec du HTML malveillant est affiché en texte, pas exécuté', async ({ page }) => {
  // Surveille si alert() est appelé (signe d'une faille XSS)
  let xssTriggered = false;
  page.on('dialog', async dialog => {
    xssTriggered = true;
    await dialog.dismiss();
  });

  await page.goto('/index.html');

  // Injecte un nom malveillant dans le premier club
  await page.evaluate(() => {
    DB.clubs[0].name = '<img src=x onerror="alert(\'XSS\')">';
    renderHomeClubs();
  });

  // Attend que la page se stabilise
  await page.waitForTimeout(500);

  // Le XSS ne doit PAS se déclencher
  expect(xssTriggered, 'FAILLE XSS : le script malveillant a été exécuté !').toBe(false);

  // Le texte brut doit apparaître (échappé)
  const cardText = await page.locator('.cn').first().textContent();
  expect(cardText).toContain('<img');
});
