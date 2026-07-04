// V4-02 / V4-06 : prouve qu'un visiteur anonyme ne peut PLUS lire les données
// perso des joueurs ni les codes d'accès des clubs via l'API REST publique.
// Se lance contre un projet Supabase de TEST (jamais la prod).
//   npx playwright test --project=online
// Requiert : PG_TEST_SUPABASE_URL, PG_TEST_SUPABASE_KEY (clé anon publique).
const { test, expect, request } = require('@playwright/test');

const URL = process.env.PG_TEST_SUPABASE_URL;
const KEY = process.env.PG_TEST_SUPABASE_KEY;

test.skip(!URL || !KEY, 'Définis PG_TEST_SUPABASE_URL/KEY (projet Supabase de TEST) pour activer.');

async function anonGet(path) {
  const ctx = await request.newContext({
    baseURL: URL.replace(/\/$/, ''),
    extraHTTPHeaders: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  });
  const res = await ctx.get('/rest/v1/' + path);
  const body = await res.text();
  await ctx.dispose();
  return { status: res.status(), body };
}

test('[V4-02] anon ne peut pas lire les telephones des joueurs', async () => {
  const r = await anonGet('reservations?select=player_name,player_phone&limit=5');
  // Soit refusé, soit 0 ligne — jamais un vrai numéro.
  let rows = [];
  try { rows = JSON.parse(r.body); } catch (e) {}
  const asText = JSON.stringify(rows);
  expect(Array.isArray(rows) ? rows.length : 0).toBe(0);
  expect(asText).not.toMatch(/\+?241|07\d|06\d/);
});

test('[V4-02] la vue slot_availability reste lisible (sans donnees perso)', async () => {
  const r = await anonGet('slot_availability?select=court_id,date_key,start_minutes,status&limit=5');
  expect(r.status).toBeLessThan(400);
  // Ne doit contenir AUCUN champ perso.
  expect(r.body).not.toMatch(/player_name|player_phone/);
});

test('[V4-06] anon ne peut pas lire les codes d\'acces des clubs', async () => {
  const r = await anonGet('clubs?select=name,access_code&limit=5');
  let rows = [];
  try { rows = JSON.parse(r.body); } catch (e) {}
  // Table clubs non lisible publiquement -> 0 ligne (ou erreur). Jamais un access_code.
  expect(Array.isArray(rows) ? rows.length : 0).toBe(0);
});

test('[V4-06] la vue clubs_public liste les clubs SANS access_code', async () => {
  const r = await anonGet('clubs_public?select=*&limit=5');
  expect(r.status).toBeLessThan(400);
  expect(r.body).not.toMatch(/access_code/);
});
