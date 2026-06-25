// ============================================================
// PADELGABON — Analytics (V3-P7) — PostHog, gratuit
// ------------------------------------------------------------
// Ne fait RIEN tant que tu n'as pas mis ta clé PostHog dans config.js :
//   window.PADELGABON_CONFIG = { ..., posthogKey:'phc_xxx', posthogHost:'https://eu.i.posthog.com' }
// (crée un compte gratuit sur posthog.com → Project Settings → Project API Key)
//
// 5 KPIs visés (rapport V3-P7) — calculés par PostHog à partir de ces événements :
//   1. réservations complétées / semaine (et par club)  → event 'booking_completed'
//   2. inscription → 1re réservation (conversion)         → 'signup' + 'booking_completed'
//   3. taux d'absence (no-show)                            → 'no_show'
//   4. rétention WAU / W1-W4                               → identify + tout event
//   5. clubs actifs payants                                → 'club_active' (admin)
// ============================================================
(function () {
  var cfg = (typeof window !== 'undefined' && window.PADELGABON_CONFIG) || {};
  var key = cfg.posthogKey;
  // Pas de clé → track() devient un no-op silencieux (zéro impact, zéro réseau).
  if (!key) {
    window.pgTrack = function () {};
    window.pgIdentify = function () {};
    return;
  }
  var host = cfg.posthogHost || 'https://eu.i.posthog.com';
  // Chargement officiel PostHog (snippet minimal)
  !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split('.'); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement('script')).type = 'text/javascript', p.async = !0, p.src = s.api_host + '/static/array.js', (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = 'posthog', u.people = u.people || [], u.toString = function (t) { var e = 'posthog'; return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e }, u.people.toString = function () { return u.toString(1) + '.people (stub)' }, o = 'capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys'.split(' '), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
  try {
    window.posthog.init(key, { api_host: host, capture_pageview: true, persistence: 'localStorage' });
  } catch (e) {}
  // Wrappers simples utilisés par l'app
  window.pgTrack = function (event, props) {
    try { if (window.posthog && window.posthog.capture) window.posthog.capture(event, props || {}); } catch (e) {}
  };
  window.pgIdentify = function (id, props) {
    try { if (window.posthog && window.posthog.identify) window.posthog.identify(id, props || {}); } catch (e) {}
  };
})();
