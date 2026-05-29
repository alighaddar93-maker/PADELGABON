-- ============================================
-- PADELGABON — Données initiales (seed)
-- À coller dans Supabase > SQL Editor > Run
-- APRÈS avoir exécuté schema.sql
-- ============================================

-- Clubs initiaux
insert into public.clubs (id, name, location, open_from, open_to, price_60, price_90, price_120, has_machine, machine_price, machine_balls, extras, subscription_status, access_code) values
  ('11111111-1111-1111-1111-111111111111', 'Padel Arena', 'Libreville Nord', 7, 23, 5000, 7000, 9000, true, 2000, 150, '[{"n":"Raquette","p":1000},{"n":"Balles (3)","p":500}]', 'active', '1234'),
  ('22222222-2222-2222-2222-222222222222', 'Club Omnisports', 'Libreville Centre', 8, 22, 6000, 8500, 11000, false, 0, 0, '[{"n":"Raquette","p":1000}]', 'active', '5678'),
  ('33333333-3333-3333-3333-333333333333', 'SportPark Akanda', 'Akanda', 7, 21, 4500, 6500, 8500, true, 1500, 120, '[{"n":"Raquette","p":1000},{"n":"Eau","p":300}]', 'active', '9012')
on conflict (id) do nothing;

-- Courts
insert into public.courts (club_id, name, type, is_open, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Court 1', 'Intérieur', true, 1),
  ('11111111-1111-1111-1111-111111111111', 'Court 2', 'Extérieur', true, 2),
  ('22222222-2222-2222-2222-222222222222', 'Court A', 'Intérieur', true, 1),
  ('22222222-2222-2222-2222-222222222222', 'Court B', 'Intérieur', true, 2),
  ('33333333-3333-3333-3333-333333333333', 'Court Principal', 'Extérieur', true, 1)
on conflict do nothing;

-- Coachs indépendants
insert into public.coaches (id, name, level, hourly_price, available_slots) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jean-Marc Obiang', 'Pro', '15 000 XAF/h', '["8h00","10h00","14h00","16h00"]'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sophie Ndong', 'Expert', '12 000 XAF/h', '["9h00","11h00","15h00"]')
on conflict (id) do nothing;

-- Liens coach ↔ clubs (plusieurs clubs par coach)
insert into public.coach_clubs (coach_id, club_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;

-- Tournois (avec numéro de paiement Airtel/Moov)
insert into public.tournaments (name, club_id, start_date, end_date, max_players, registered_count, entry_fee, type, status, payment_phone, payment_provider) values
  ('Open de Libreville 2026', '11111111-1111-1111-1111-111111111111', '2026-06-14', '2026-06-15', 32, 20, 5000, 'Mixte', 'open', '+241 074 000 001', 'Airtel Money'),
  ('Championnat Gabon Padel', '22222222-2222-2222-2222-222222222222', '2026-07-05', '2026-07-06', 32, 8, 15000, 'Doubles', 'soon', '+241 060 000 002', 'Moov Money'),
  ('Akanda Summer Cup', '33333333-3333-3333-3333-333333333333', '2026-07-20', '2026-07-20', 24, 24, 3000, 'Simple', 'full', '+241 074 000 003', 'Airtel Money')
on conflict do nothing;
