// ============================================
// PADELGABON — Connexion Supabase
// Les credentials viennent de config.js (gitignored)
// ============================================
var _cfg = (typeof window !== 'undefined' && window.PADELGABON_CONFIG) || {};
// Valeurs de secours = clés PUBLIQUES Supabase (conçues pour être dans l'app ; la sécurité vient des règles RLS).
// Ça permet à l'app déployée (où config.js n'est pas présent) de se connecter quand même.
const SUPABASE_URL = _cfg.supabaseUrl || 'https://qsdlliiktzsduufpbrte.supabase.co';
const SUPABASE_KEY = _cfg.supabaseKey || 'sb_publishable_tt0Evfx1w4hz0Zuve-M0rQ_NVwTxH4x';

// Ne créer le client que si les credentials sont présents
var _sbLib = window.supabase || (window.Supabase && window.Supabase.createClient ? window.Supabase : null);
var sb = null;
// Garde : permet de désactiver Supabase (utilisé par les tests pour ne pas toucher la vraie base)
var _noSb = false;
try { _noSb = (typeof localStorage !== 'undefined' && localStorage.getItem('pg_no_sb')); } catch(e) {}
try {
  if (!_noSb && _sbLib && SUPABASE_URL && SUPABASE_KEY) {
    sb = _sbLib.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'pg_sb_auth' }
    });
  }
} catch(e) { console.log('Supabase init skipped:', e.message); }

// Test de connexion au démarrage
if (sb) {
  sb.from('clubs').select('count', { count: 'exact', head: true })
    .then(function(r) {
      if (r.error) {
        console.error('❌ Supabase connexion échouée:', r.error.message);
      } else {
        console.log('✅ Supabase connecté —', r.count, 'clubs dans la DB');
      }
    });
}

// ============================================
// CLUBS
// ============================================
async function sbLoadClubs() {
  // Vue publique SANS access_code (V4-06). Repli sur la table si la vue n'existe pas encore.
  let r = await sb.from('clubs_public').select('*').eq('is_active', true).order('name');
  if (r.error) r = await sb.from('clubs').select('*').eq('is_active', true).order('name');
  if (r.error) { console.error('sbLoadClubs:', r.error.message); return null; }
  const clubs = r.data;
  // Charger courts séparément
  const { data: courts, error: e2 } = await sb
    .from('courts').select('*').order('sort_order');
  if (e2) { console.error('sbLoadCourts:', e2.message); return clubs; }
  // Attacher les courts à chaque club
  clubs.forEach(function(c) {
    c.courts = (courts || []).filter(function(ct) { return ct.club_id === c.id; });
  });
  return clubs;
}

async function sbAddClub(club) {
  const { data, error } = await sb.from('clubs').insert([club]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sbUpdateClub(id, updates) {
  const { error } = await sb.from('clubs').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbDeleteClub(id) {
  const { error } = await sb.from('clubs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbSuspendClub(id, reason) {
  const { error } = await sb.from('clubs').update({ is_suspended: true, suspended_reason: reason }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbUnsuspendClub(id) {
  const { error } = await sb.from('clubs').update({ is_suspended: false, suspended_reason: '' }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================
// COURTS
// ============================================
async function sbAddCourt(court) {
  const { data, error } = await sb.from('courts').insert([court]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sbUpdateCourt(id, updates) {
  const { error } = await sb.from('courts').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbDeleteCourt(id) {
  const { error } = await sb.from('courts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================
// RÉSERVATIONS
// ============================================
async function sbLoadReservations(clubId, dateKey) {
  let q = sb.from('reservations').select('*').eq('status', 'confirmed');
  if (clubId) q = q.eq('club_id', clubId);
  if (dateKey) q = q.eq('date_key', dateKey);
  const { data, error } = await q.order('start_minutes');
  if (error) { console.error('sbLoadReservations:', error.message); return []; }
  return data;
}

// Disponibilité publique SANS données perso (V4-02) — pour la grille de créneaux du joueur.
// Lit la vue slot_availability (court_id, date_key, minutes, status) ; jamais player_name/phone.
async function sbLoadAvailability(clubId) {
  let q = sb.from('slot_availability').select('*').eq('status', 'confirmed');
  if (clubId) q = q.eq('club_id', clubId);
  const { data, error } = await q.order('start_minutes');
  if (error) { console.error('sbLoadAvailability:', error.message); return []; }
  return data;
}

async function sbLoadAllClubReservations(clubId) {
  const { data, error } = await sb
    .from('reservations')
    .select('*, courts(name)')
    .eq('club_id', clubId)
    .eq('status', 'confirmed')
    .order('date_key', { ascending: false })
    .order('start_minutes');
  if (error) return [];
  return data;
}

async function sbCreateReservation(resa) {
  // Marquer qui réserve → permet au joueur d'annuler SA propre résa sous RLS
  let payload = resa;
  try {
    const { data: u } = await sb.auth.getUser();
    if (u && u.user) payload = Object.assign({}, resa, { user_id: u.user.id });
  } catch (e) {}
  let res = await sb.from('reservations').insert([payload]).select().single();
  // Si la colonne user_id n'existe pas encore (RLS pas appliqué) → réessayer sans
  if (res.error && /user_id/.test(res.error.message || '')) {
    res = await sb.from('reservations').insert([resa]).select().single();
  }
  if (res.error) {
    // 23505 = unique violation ; 23P01 = exclusion (chevauchement de créneaux) — V3-D1
    if (res.error.code === '23505' || res.error.code === '23P01') {
      throw new Error('Ce créneau est déjà réservé par quelqu\'un d\'autre !');
    }
    throw new Error(res.error.message);
  }
  return res.data;
}

async function sbCancelReservation(id) {
  const { error } = await sb.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbIsBooked(courtId, dateKey, startMin, endMin) {
  const { data, error } = await sb
    .from('reservations')
    .select('id')
    .eq('court_id', courtId)
    .eq('date_key', dateKey)
    .eq('status', 'confirmed')
    .lt('start_minutes', endMin)
    .gt('end_minutes', startMin);
  if (error) return false;
  return data.length > 0;
}

async function sbLoadPlayerHistory(playerName) {
  const { data, error } = await sb
    .from('reservations')
    .select('*, courts(name, type), clubs(name)')
    .eq('player_name', playerName)
    .eq('status', 'confirmed')
    .order('date_key', { ascending: false });
  if (error) return [];
  return data;
}

// ============================================
// COACHES
// ============================================
async function sbLoadCoachesWithClubs() {
  // Charge les coaches + leurs clubs associés
  const { data: links, error } = await sb
    .from('coach_clubs').select('coach_id, club_id');
  if (error) return [];
  const { data: coaches, error: e2 } = await sb
    .from('coaches').select('*');
  if (e2) return [];
  // Attacher la liste des club_ids à chaque coach
  return (coaches || []).map(function(c) {
    c.club_ids = (links || [])
      .filter(function(l) { return l.coach_id === c.id; })
      .map(function(l) { return l.club_id; });
    return c;
  });
}

async function sbLoadCoaches() {
  const { data, error } = await sb
    .from('coaches')
    .select('*, coach_clubs(club_id)')
    .order('name');
  if (error) return [];
  return data;
}

// Coachs indépendants (modèle de l'app : clubs stockés en jsonb)
async function sbLoadCoachesInd() {
  const { data, error } = await sb.from('coaches').select('*').order('name');
  if (error) { console.error('sbLoadCoachesInd:', error.message); return []; }
  return data;
}
async function sbUpdateCoach(id, updates) {
  const { error } = await sb.from('coaches').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}
async function sbDeleteCoach(id) {
  const { error } = await sb.from('coaches').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbLoadCoachesByClub(clubId) {
  const { data, error } = await sb
    .from('coach_clubs')
    .select('coaches(*)')
    .eq('club_id', clubId);
  if (error) return [];
  return data.map(r => r.coaches);
}

async function sbAddCoach(coach) {
  const { data, error } = await sb.from('coaches').insert([coach]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sbLinkCoachToClub(coachId, clubId) {
  const { error } = await sb.from('coach_clubs').insert([{ coach_id: coachId, club_id: clubId }]);
  if (error && error.code !== '23505') throw new Error(error.message);
}

// ============================================
// TOURNOIS
// ============================================
async function sbLoadTournaments() {
  const { data, error } = await sb
    .from('tournaments')
    .select('*')
    .order('start_date');
  if (error) return [];
  return data;
}

async function sbAddTournament(tournament) {
  const { data, error } = await sb.from('tournaments').insert([tournament]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sbUpdateTournament(id, updates) {
  const { error } = await sb.from('tournaments').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbDeleteTournament(id) {
  const { error } = await sb.from('tournaments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function sbRegisterTournament(reg) {
  const { data, error } = await sb.from('tournament_registrations').insert([reg]).select().single();
  if (error) throw new Error(error.message);
  // Incrémente le compteur
  await sb.rpc('increment_tournament_count', { t_id: reg.tournament_id });
  return data;
}

async function sbLoadTournamentRegistrations(tournamentId) {
  const { data, error } = await sb
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at');
  if (error) return [];
  return data;
}

// ============================================
// NOTIFICATIONS
// ============================================
async function sbLoadNotifs(clubId) {
  const { data, error } = await sb
    .from('club_notifications')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

async function sbAddNotif(clubId, type, title, message, payload) {
  await sb.from('club_notifications').insert([{
    club_id: clubId, type, title, message, payload: payload || {}
  }]);
}

async function sbMarkNotifRead(id) {
  await sb.from('club_notifications').update({ is_read: true }).eq('id', id);
}

async function sbMarkAllNotifsRead(clubId) {
  await sb.from('club_notifications').update({ is_read: true }).eq('club_id', clubId);
}

// ============================================
// TEMPS RÉEL (realtime)
// ============================================
function sbWatchReservations(clubId, callback) {
  return sb.channel('resa-' + clubId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'reservations',
      filter: 'club_id=eq.' + clubId
    }, callback)
    .subscribe();
}

function sbWatchNotifs(clubId, callback) {
  return sb.channel('notif-' + clubId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'club_notifications',
      filter: 'club_id=eq.' + clubId
    }, callback)
    .subscribe();
}

// ============================================
// UTILITAIRE: convertit les données Supabase
// vers le format local DB (compatibilité)
// ============================================
function sbClubsToLocalDB(sbClubs, sbCoaches) {
  var coaches = sbCoaches || [];
  var clubs = [];
  sbClubs.forEach(function(c) {
    // Coachs liés à ce club
    var clubCoaches = coaches.filter(function(co) {
      return co.club_ids && co.club_ids.indexOf(c.id) >= 0;
    }).map(function(co) {
      return {
        _id: co.id,
        n: co.name,
        init: co.name.split(' ').map(function(w){return w[0];}).join('').substring(0,2),
        bg: '#E1F5EE', tc: '#085041',
        court: 'Court 1',
        level: co.level || 'Pro',
        price: co.hourly_price || '15 000 XAF/h',
        slots: co.available_slots || ['8h00','10h00']
      };
    });
    clubs.push({
      _id: c.id,
      name: c.name,
      loc: c.location || '',
      openFrom: c.open_from,
      openTo: c.open_to,
      prices: { 60: c.price_60, 90: c.price_90, 120: c.price_120 },
      hasMachine: c.has_machine || false,
      machinePrice: c.machine_price || 0,
      machineBalls: c.machine_balls ? String(c.machine_balls)+' balles' : '',
      extras: Array.isArray(c.extras) ? c.extras : [],
      open: !c.is_suspended,
      suspended: c.is_suspended || false,
      suspendedReason: c.suspended_reason || '',
      subscriptionStatus: c.subscription_status || 'trial',
      accessCode: c.access_code || '1234',
      abo: c.abo || 25000,
      photo: c.photo || '',
      paymentPhone: c.payment_phone || '',
      paymentProvider: c.payment_provider || 'Airtel Money',
      coaches: clubCoaches,
      courts: (c.courts || []).map(function(ct) {
        return {
          _id: ct.id,
          name: ct.name,
          type: ct.type || 'Intérieur',
          open: ct.is_open !== false
        };
      }),
      products: [],
      pubs: []
    });
  });
  return clubs;
}

function sbResasToLocal(sbResas) {
  var local = {};
  sbResas.forEach(function(r) {
    var key = r.court_id + '||' + r.date_key + '||' + r.start_minutes;
    local[key] = {
      _id: r.id,
      courtId: r.court_id,
      clubId: r.club_id,
      dateKey: r.date_key,
      startMin: r.start_minutes,
      endMin: r.end_minutes,
      duration: r.duration,
      playerName: r.player_name,
      playerPhone: r.player_phone,
      useMachine: r.use_machine,
      extras: r.extras || [],
      total: r.total_amount,
      status: r.status
    };
  });
  return local;
}

// ============================================
// LISTES GÉNÉRIQUES (pubs, magasins, joueurs) — stockées en JSON
// ============================================
async function sbSaveList(key, arr) {
  if (!sb) return;
  try {
    const { error } = await sb.from('app_lists')
      .upsert({ key: key, data: arr || [], updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) console.error('sbSaveList', key, error.message);
  } catch (e) { console.log('sbSaveList', key, e.message); }
}
async function sbLoadList(key) {
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('app_lists').select('data').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return data.data;
  } catch (e) { return null; }
}

// ============================================
// AUTHENTIFICATION (comptes réels Supabase Auth)
// ============================================
// Auth disponible uniquement si le client existe (donc pas en mode test pg_no_sb)
function sbAuthReady() { return !!sb; }

// Inscription : crée un compte email + mot de passe.
// meta = { name, phone, level, role } stocké dans les métadonnées (récupéré par le trigger -> profiles)
async function sbSignUp(email, password, meta) {
  if (!sb) return { ok:false, error:'offline' };
  try {
    const { data, error } = await sb.auth.signUp({
      email: email, password: password,
      options: { data: meta || {} }
    });
    if (error) return { ok:false, error: error.message };
    // Si la confirmation email est désactivée (recommandé), une session est créée tout de suite.
    if (data.session) return { ok:true, user: data.user, session: data.session };
    // Sinon : compte créé mais email à confirmer.
    return { ok:true, user: data.user, session: null, needConfirm: true };
  } catch (e) { return { ok:false, error: e.message }; }
}

// Connexion
async function sbSignIn(email, password) {
  if (!sb) return { ok:false, error:'offline' };
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: email, password: password });
    if (error) return { ok:false, error: error.message };
    return { ok:true, user: data.user, session: data.session };
  } catch (e) { return { ok:false, error: e.message }; }
}

// Déconnexion
async function sbSignOut() {
  if (!sb) return;
  try { await sb.auth.signOut(); } catch (e) {}
}

// Récupère l'utilisateur connecté (ou null)
async function sbGetUser() {
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser();
    if (error || !data || !data.user) return null;
    return data.user;
  } catch (e) { return null; }
}

// Récupère le profil (role, name, club_id...) depuis la table profiles
async function sbGetProfile(userId) {
  if (!sb || !userId) return null;
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (e) { return null; }
}

// Met à jour le profil de l'utilisateur connecté
async function sbUpdateProfile(userId, updates) {
  if (!sb || !userId) return false;
  try {
    const { error } = await sb.from('profiles').update(updates).eq('id', userId);
    return !error;
  } catch (e) { return false; }
}

// Crée (depuis l'admin) un compte de connexion pour un CLUB et le rattache à ce club.
// Utilise un client secondaire pour NE PAS déconnecter l'admin courant.
async function sbCreateClubAccount(email, password, clubId, clubName) {
  if (!sb || !_sbLib) return { ok:false, error:'offline' };
  if (!clubId) return { ok:false, error:'Ce club n\'est pas encore synchronisé en ligne' };
  try {
    // 1) Créer le compte via un client temporaire (session non persistée)
    const sb2 = _sbLib.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await sb2.auth.signUp({
      email: email, password: password,
      options: { data: { name: clubName || 'Club', role: 'club' } }
    });
    if (error) {
      let m = error.message || 'Erreur';
      if (/already|registered|exists/i.test(m)) m = 'Cet email a déjà un compte';
      return { ok:false, error: m };
    }
    // 2) Rattacher le profil à ce club (fait par l'admin connecté → autorisé par RLS)
    const uid = data && data.user ? data.user.id : null;
    let upd;
    if (uid) upd = await sb.from('profiles').update({ role:'club', club_id: clubId }).eq('id', uid);
    else     upd = await sb.from('profiles').update({ role:'club', club_id: clubId }).eq('email', email);
    if (upd.error) return { ok:false, error: 'Compte créé mais liaison club échouée : ' + upd.error.message };
    return { ok:true };
  } catch (e) { return { ok:false, error: e.message }; }
}

// Email de réinitialisation de mot de passe
async function sbResetPassword(email) {
  if (!sb) return { ok:false, error:'offline' };
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) return { ok:false, error: error.message };
    return { ok:true };
  } catch (e) { return { ok:false, error: e.message }; }
}

// ============================================
// CENTRE DE NOTIFICATIONS (en ligne, multi-appareils)
// ============================================
// Crée une notification. n = {type, audience, target_user_id?, club_id?, title, body, data?}
async function sbPushNotif(n) {
  if (!sb || !n || !n.audience) return;
  try {
    const row = {
      type: n.type || null,
      audience: n.audience,
      target_user_id: n.target_user_id || null,
      club_id: n.club_id || null,
      title: n.title || '',
      body: n.body || '',
      data: n.data || {}
    };
    const { error } = await sb.from('notifications').insert([row]);
    if (error) console.log('sbPushNotif', error.message);
  } catch (e) { console.log('sbPushNotif', e.message); }
}

// Charge les notifications visibles par l'utilisateur courant (RLS filtre déjà).
async function sbLoadMyNotifs(limit) {
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('notifications')
      .select('*').order('created_at', { ascending: false }).limit(limit || 50);
    if (error || !data) return [];
    return data;
  } catch (e) { return []; }
}

// Écoute en temps réel toutes les nouvelles notifications (le callback filtre/refait le rendu).
function sbWatchMyNotifs(cb) {
  if (!sb) return null;
  try {
    return sb.channel('notifs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        function (payload) { try { cb(payload.new); } catch (e) {} })
      .subscribe();
  } catch (e) { return null; }
}

// ============================================
// V3-P4 — Confirmation WhatsApp (canal app fermée)
// ============================================
// Envoie une confirmation de réservation par WhatsApp via une Edge Function
// Supabase (qui détient le token WhatsApp Business API côté serveur).
// NO-OP tant que config.whatsappEndpoint n'est pas défini → zéro risque.
//   config.js : { ..., whatsappEndpoint:'https://<projet>.functions.supabase.co/whatsapp-booking' }
async function sbNotifyBookingWhatsapp(reservationId) {
  var ep = _cfg.whatsappEndpoint;
  if (!ep || !reservationId || !sb) return;
  try {
    // Envoie le JETON du joueur connecté (pas la clé anon) — la fonction serveur
    // vérifie que la réservation lui appartient avant d'envoyer (V4-01).
    const { data: s } = await sb.auth.getSession();
    const token = s && s.session ? s.session.access_token : null;
    if (!token) return;
    await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ reservation_id: reservationId })
    });
  } catch (e) { /* silencieux : la confirmation in-app reste la source sûre */ }
}

console.log('✅ PadelGabon — Supabase client chargé');
