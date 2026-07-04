// ============================================================
// PADELGABON — Edge Function : confirmation de réservation WhatsApp (V3-P4 / V4-01)
// ------------------------------------------------------------
// SÉCURISÉE (V4-01) : ce n'est PAS un relais ouvert.
//   1) Exige un utilisateur AUTHENTIFIÉ (JWT valide, pas la clé anon).
//   2) Vérifie côté serveur que la réservation appartient à l'appelant.
//   3) Le message est construit à partir des champs SERVEUR (aucun texte libre du client).
//   4) CORS restreint à l'origine de l'app.
// Le client n'envoie QUE { reservation_id } + son jeton.
//
// Secrets à définir : WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, APP_ORIGIN
//   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase)
// Déploiement : voir SETUP-WHATSAPP.md
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TOKEN = Deno.env.get('WHATSAPP_TOKEN');
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || '*';

function normalizePhone(p: string): string {
  let d = (p || '').replace(/[^0-9]/g, '');
  if (d.startsWith('241')) return d;
  if (d.startsWith('0')) d = d.slice(1);
  return '241' + d;
}
function hhmm(m: number): string {
  return String(Math.floor(m / 60)).padStart(2, '0') + 'h' + String(m % 60).padStart(2, '0');
}

serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // 1) Exiger un vrai utilisateur authentifié (JWT), pas la clé anon
  const authz = req.headers.get('Authorization') || '';
  const jwt = authz.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: u } = await anon.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  // 2) Lire la réservation côté serveur et vérifier l'appartenance
  const body = await req.json().catch(() => ({}));
  const resaId = body?.reservation_id;
  if (!resaId) return json({ error: 'reservation_id required' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: resa } = await admin
    .from('reservations')
    .select('id,user_id,player_phone,date_key,start_minutes,end_minutes,club_id,court_id')
    .eq('id', resaId)
    .maybeSingle();
  if (!resa) return json({ error: 'not found' }, 404);
  if (resa.user_id !== user.id) return json({ error: 'forbidden' }, 403);
  if (!resa.player_phone) return json({ skipped: 'no phone' });

  if (!TOKEN || !PHONE_ID) return json({ error: 'whatsapp not configured' }, 500);

  // 3) Message construit à partir des champs SERVEUR uniquement
  const { data: club } = await admin.from('clubs').select('name').eq('id', resa.club_id).maybeSingle();
  const { data: court } = await admin.from('courts').select('name').eq('id', resa.court_id).maybeSingle();
  const text =
    `Reservation confirmee - PadelGabon\n` +
    `${club?.name || 'Club'} - ${court?.name || 'Court'}\n` +
    `${resa.date_key}  ${hhmm(resa.start_minutes)} -> ${hhmm(resa.end_minutes)}`;

  const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizePhone(resa.player_phone),
      type: 'text',
      text: { body: text },
    }),
  });
  const out = await r.json();
  return json(out, r.ok ? 200 : 502);
});
