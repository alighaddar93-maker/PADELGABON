// ============================================================
// PADELGABON — Edge Function : confirmation de réservation WhatsApp (V3-P4)
// ------------------------------------------------------------
// Envoie un message WhatsApp au joueur après une réservation, via l'API
// WhatsApp Business (Meta Cloud API). Le TOKEN reste ICI (côté serveur),
// jamais dans l'app.
//
// Déploiement :
//   1) Crée un compte WhatsApp Business API (Meta) → récupère un token + phone number id.
//   2) supabase secrets set WHATSAPP_TOKEN=xxx WHATSAPP_PHONE_ID=xxx
//   3) supabase functions deploy whatsapp-booking
//   4) Mets l'URL obtenue dans config.js → whatsappEndpoint
//   (voir SETUP-WHATSAPP.md)
// ============================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const TOKEN = Deno.env.get('WHATSAPP_TOKEN');
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');

// Normalise un numéro gabonais en format international (ex: 07XXXXXXX -> 2417XXXXXXX)
function normalizePhone(p: string): string {
  let d = (p || '').replace(/[^0-9]/g, '');
  if (d.startsWith('241')) return d;
  if (d.startsWith('0')) d = d.slice(1);
  return '241' + d;
}

serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const b = await req.json();
    if (!b.phone) return new Response(JSON.stringify({ skipped: 'no phone' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    if (!TOKEN || !PHONE_ID) return new Response(JSON.stringify({ error: 'WHATSAPP secrets not set' }), { status: 500, headers: cors });

    const text =
      `✅ Réservation confirmée — PadelGabon\n` +
      `🏟️ ${b.club} · ${b.court}\n` +
      `📅 ${b.date}  ⏰ ${b.start} → ${b.end}\n` +
      `🔖 Code : ${b.code || '—'}\n` +
      `À bientôt, ${b.player || ''} !`;

    const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(b.phone),
        type: 'text',
        text: { body: text },
      }),
    });
    const out = await r.json();
    return new Response(JSON.stringify(out), { status: r.ok ? 200 : 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: cors });
  }
});
