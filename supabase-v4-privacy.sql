-- ============================================================
-- PADELGABON — ROUND 4 : fermeture des 2 fuites confirmées en prod
--   V4-02 : noms + téléphones des joueurs lisibles publiquement (table reservations)
--   V4-06 : codes d'accès des clubs lisibles publiquement (clubs.access_code)
-- À lancer UNE FOIS dans Supabase → SQL Editor → Run.
-- Idempotent. Les vues appartiennent à postgres → elles contournent le RLS et
-- n'exposent QUE des colonnes sûres (aucune donnée perso).
-- ============================================================

-- ── V4-02 : réservations — plus aucune donnée perso en lecture publique ──
-- Lecture de la table restreinte au propriétaire OU au gestionnaire du club.
drop policy if exists "resa_read" on public.reservations;
drop policy if exists "resa_read_own_or_club" on public.reservations;
create policy "resa_read_own_or_club" on public.reservations for select
  using ( user_id = auth.uid() or public.can_manage_club(club_id) );

-- Vue publique pour la grille de créneaux : occupation SANS nom/téléphone.
create or replace view public.slot_availability as
  select id, club_id, court_id, date_key, start_minutes, end_minutes, status
  from public.reservations
  where status = 'confirmed';
grant select on public.slot_availability to anon, authenticated;

-- ── V4-06 : clubs — plus de access_code en lecture publique ──
-- On retire la lecture publique de la table (l'admin garde l'accès via clubs_admin).
drop policy if exists "clubs_read" on public.clubs;

-- Vue publique du catalogue SANS access_code.
create or replace view public.clubs_public as
  select id, name, location, open_from, open_to,
         price_60, price_90, price_120,
         has_machine, machine_price, machine_balls,
         extras, is_active, is_suspended, suspended_reason,
         subscription_status, payment_phone, payment_provider, abo, photo, created_at
  from public.clubs;
grant select on public.clubs_public to anon, authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- VÉRIFICATION (doit renvoyer AUCUNE ligne = fuite fermée) :
--   -- en tant qu'anon, ceci ne doit plus renvoyer de téléphone :
--   -- (à tester depuis l'API REST publique, pas ici)
--
-- PART A (confirmations demandées par l'auditeur — lecture seule, ne change rien) :
--   select policyname, cmd, with_check from pg_policies
--    where schemaname='public' and tablename='profiles' and cmd='UPDATE';
--   -- attendu : profiles_update_self_no_role_change, with_check mentionne role/club_id
--   select conname, contype from pg_constraint where conname='no_overlapping_bookings';
--   -- attendu : 1 ligne, contype = 'x'
-- ============================================================
