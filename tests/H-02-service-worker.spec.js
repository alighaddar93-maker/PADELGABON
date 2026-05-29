// [H-02] Le Service Worker doit référencer des fichiers qui existent réellement
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('[H-02] sw.js ne référence que des fichiers qui existent dans le projet', async ({ page }) => {
  const swPath = path.join('C:/Users/Ali/Downloads/PadelGabon_PWA_1', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  // Extrait les fichiers listés dans FILES_TO_CACHE
  const match = swContent.match(/FILES_TO_CACHE\s*=\s*\[([^\]]+)\]/);
  expect(match, 'FILES_TO_CACHE non trouvé dans sw.js').toBeTruthy();

  const files = match[1].match(/'([^']+)'/g).map(f => f.replace(/'/g, ''));
  const root = 'C:/Users/Ali/Downloads/PadelGabon_PWA_1';

  for (const f of files) {
    if (f === './') continue; // ./ est le dossier racine, pas un fichier
    const filePath = path.join(root, f.replace('./', ''));
    const exists = fs.existsSync(filePath);
    expect(exists, `Fichier manquant dans sw.js : ${f}`).toBe(true);
  }
});
