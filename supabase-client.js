// ============================================
// PADELGABON — Connexion Supabase
// Les credentials viennent de config.js (gitignored)
// ============================================
var _cfg = (typeof window !== 'undefined' && window.PADELGABON_CONFIG) || {};
const SUPABASE_URL = _cfg.supabaseUrl || '';
const SUPABASE_KEY = _cfg.supabaseKey || '';

// Compatibilité avec différentes versions du SDK Supabase
var _sbLib = window.supabase || (window.Supabase && window.Supabase.createClient ? window.Supabase : null);
if (!_sbLib) { console.error('❌ Supabase SDK non chargé'); }
var sb = _sbLib ? _sbLib.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;

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
  // Charger clubs
  const { data: clubs, error: e1 } = await sb
    .from('clubs').select('*').eq('is_active', true).order('name');
  if (e1) { console.error('sbLoadClubs:', e1.message); return null; }
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
  const { data, error } = await sb.from('reservations').insert([resa]).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('Ce créneau est déjà réservé par quelqu\'un d\'autre !');
    throw new Error(error.message);
  }
  return data;
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
    .select('*, clubs(name)')
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

console.log('✅ PadelGabon — Supabase client chargé');
