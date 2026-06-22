// Helper partagé : seed un club dans localStorage AVANT le chargement de la page.
// Nécessaire car l'app ne contient plus de données de démo (DB.clubs démarre vide).
const SEED_CLUB = {
  name: 'Club Test',
  loc: 'Libreville',
  openFrom: '8h00', openTo: '22h00',
  prices: { 60: 20000, 90: 28000, 120: 36000 },
  extras: [],
  accessCode: '1234',
  open: true, suspended: false,
  courts: [
    { name: 'Court 1', type: 'Intérieur', open: true },
    { name: 'Court 2', type: 'Extérieur', open: true }
  ],
  coaches: [], products: [], pubs: []
};

async function seedClub(page, club) {
  await page.addInitScript((c) => {
    localStorage.setItem('pg_no_sb', '1'); // ne pas toucher la vraie base Supabase pendant les tests
    localStorage.setItem('pg_reset', 'v6'); // évite le wipe au 1er chargement
    localStorage.setItem('pg_clubs', JSON.stringify([c]));
    localStorage.setItem('pg_clubs_ver', '999');
  }, club || SEED_CLUB);
}

module.exports = { SEED_CLUB, seedClub };
