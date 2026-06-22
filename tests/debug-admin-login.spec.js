const { test, expect } = require('@playwright/test');

test('admin login test', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  
  await page.goto('/admin.html');
  await page.waitForLoadState('networkidle');
  
  // Voir ce que valent les variables clés
  const adminPwd = await page.evaluate(() => {
    return typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'UNDEFINED';
  });
  console.log('ADMIN_PASSWORD =', adminPwd);
  console.log('JS errors:', errors);
  
  // Tenter la connexion
  await page.fill('#admin-pwd', 'padel2026');
  await page.click('button.asub');
  await page.waitForTimeout(1000);
  
  const gateVisible = await page.locator('#admin-gate').isVisible();
  const appVisible = await page.locator('#admin-app').isVisible();
  console.log('Gate visible:', gateVisible, '| App visible:', appVisible);
  
  expect(appVisible).toBe(true);
});
