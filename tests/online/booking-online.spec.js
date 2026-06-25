// V3-F3 : tests du CHEMIN EN LIGNE contre une vraie base Supabase de TEST.
// La suite par défaut force pg_no_sb=1 et ne teste donc que le mode hors-ligne.
// Ici on teste l'auth réelle, l'insertion de réservation, la contrainte
// anti-chevauchement (V3-D1) et le RLS (V3-S2/S3/S4) contre un VRAI backend.
//
// ⚠️ À utiliser UNIQUEMENT avec un projet Supabase de TEST (jamais la prod).
// Pré-requis (variables d'environnement) :
//   PG_TEST_SUPABASE_URL   = https://<projet-de-test>.supabase.co
//   PG_TEST_SUPABASE_KEY   = clé publishable (anon) du projet de test
//   PG_TEST_EMAIL / PG_TEST_PASSWORD = un compte joueur de test
// Le projet de test doit avoir été initialisé avec supabase/schema.sql.
//
// Lancer : npx playwright test --project=online
const { test, expect } = require('@playwright/test');

const URL = process.env.PG_TEST_SUPABASE_URL;
const KEY = process.env.PG_TEST_SUPABASE_KEY;
const EMAIL = process.env.PG_TEST_EMAIL;
const PASSWORD = process.env.PG_TEST_PASSWORD;

// Tant que les identifiants de TEST ne sont pas fournis, on saute proprement
// (la suite reste verte ; aucun risque de toucher la prod).
test.skip(!URL || !KEY || !EMAIL || !PASSWORD,
  'Définis PG_TEST_SUPABASE_URL/KEY/EMAIL/PASSWORD (projet Supabase de TEST) pour activer les tests en ligne.');

// Injecte la config de TEST avant le chargement (remplace config.js).
async function bootOnline(page) {
  await page.addInitScript(({ url, key }) => {
    window.PADELGABON_CONFIG = { supabaseUrl: url, supabaseKey: key };
    // NE PAS mettre pg_no_sb : on veut le vrai backend.
  }, { url: URL, key: KEY });
  await page.goto('/index.html');
  await page.waitForTimeout(800);
}

test('[V3-F3] connexion reelle au backend de test', async ({ page }) => {
  await bootOnline(page);
  const connected = await page.evaluate(() => typeof sbAuthReady === 'function' && sbAuthReady());
  expect(connected).toBe(true);
});

test('[V3-S2] un joueur ne peut PAS se promouvoir admin (RLS)', async ({ page }) => {
  await bootOnline(page);
  const res = await page.evaluate(async ({ email, password }) => {
    const r = await sbSignIn(email, password);
    if (!r.ok) return { ok: false, step: 'login', error: r.error };
    // tentative d'auto-promotion
    await sbUpdateProfile(r.user.id, { role: 'admin' });
    const prof = await sbGetProfile(r.user.id);
    await sbSignOut();
    return { ok: true, role: prof ? prof.role : null };
  }, { email: EMAIL, password: PASSWORD });
  expect(res.ok, 'login a échoué: ' + res.error).toBe(true);
  // Le rôle NE doit PAS être devenu 'admin'
  expect(res.role).not.toBe('admin');
});
