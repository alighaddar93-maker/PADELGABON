-- ============================================================
-- PADELGABON — Schéma de base de données Supabase
-- À exécuter UNE FOIS dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- Extension pour générer des UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- CLUBS
-- ------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text default '',
  open_from int default 7,
  open_to int default 23,
  price_60 int default 5000,
  price_90 int default 7000,
  price_120 int default 9000,
  has_machine boolean default false,
  machine_price int default 0,
  machine_balls int default 0,
  extras jsonb default '[]'::jsonb,
  is_active boolean default true,
  is_suspended boolean default false,
  suspended_reason text default '',
  subscription_status text default 'trial',
  access_code text default '1234',
  payment_phone text default '',
  payment_provider text default 'Airtel Money',
  abo int default 25000,
  photo text default '',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- COURTS (terrains)
-- ------------------------------------------------------------
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  name text not null,
  type text default 'Extérieur',
  is_open boolean default true,
  sort_order int default 0
);

-- ------------------------------------------------------------
-- RESERVATIONS
-- ------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  date_key text not null,                 -- 'YYYY-MM-DD'
  start_minutes int not null,             -- minutes depuis minuit
  end_minutes int not null,
  duration int default 60,
  player_name text default '',
  player_phone text default '',
  use_machine boolean default false,
  extras jsonb default '[]'::jsonb,
  total_amount int default 0,
  status text default 'confirmed',        -- 'confirmed' | 'cancelled'
  created_at timestamptz default now()
);

-- Empêche 2 réservations confirmées sur le même court / même date / même créneau
create unique index if not exists uniq_resa_slot
  on public.reservations (court_id, date_key, start_minutes)
  where status = 'confirmed';

-- ------------------------------------------------------------
-- COACHES (indépendants)
-- ------------------------------------------------------------
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text default 'Pro',
  hourly_price text default '15 000 XAF/h',
  available_slots jsonb default '[]'::jsonb,
  photo text default '',
  description text default '',
  phone text default '',
  created_at timestamptz default now()
);

-- Liaison coach <-> clubs (un coach peut travailler dans plusieurs clubs)
create table if not exists public.coach_clubs (
  coach_id uuid references public.coaches(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  primary key (coach_id, club_id)
);

-- ------------------------------------------------------------
-- TOURNOIS
-- ------------------------------------------------------------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_id uuid references public.clubs(id) on delete set null,
  start_date date,
  end_date date,
  max_players int default 32,
  registered_count int default 0,
  entry_fee int default 5000,
  type text default 'Mixte',
  regtype text default 'team',            -- 'team' | 'solo'
  status text default 'open',             -- 'open' | 'full' | 'closed' | 'soon'
  photo text default '',
  payment_phone text default '',
  payment_provider text default 'Airtel Money',
  created_at timestamptz default now()
);

create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  player_name text default '',
  partner_name text default '',
  phone text default '',
  partner_phone text default '',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- NOTIFICATIONS CLUB
-- ------------------------------------------------------------
create table if not exists public.club_notifications (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  type text default 'reservation',
  title text default '',
  message text default '',
  payload jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- FONCTION : incrémente le compteur d'inscrits d'un tournoi
-- ------------------------------------------------------------
create or replace function public.increment_tournament_count(t_id uuid)
returns void language sql as $$
  update public.tournaments set registered_count = registered_count + 1 where id = t_id;
$$;

-- ============================================================
-- SÉCURITÉ (RLS) — version MVP : lecture/écriture publiques
-- (À durcir plus tard avec l'authentification réelle — étape 2)
-- ============================================================
alter table public.clubs enable row level security;
alter table public.courts enable row level security;
alter table public.reservations enable row level security;
alter table public.coaches enable row level security;
alter table public.coach_clubs enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.club_notifications enable row level security;

-- Politique permissive (anon peut tout faire) — suffisant pour démarrer
do $$
declare t text;
begin
  foreach t in array array[
    'clubs','courts','reservations','coaches','coach_clubs',
    'tournaments','tournament_registrations','club_notifications'
  ] loop
    execute format('drop policy if exists "public_all_%1$s" on public.%1$s;', t);
    execute format('create policy "public_all_%1$s" on public.%1$s for all using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- Activer le temps réel (realtime) sur les tables clés
-- ============================================================
alter publication supabase_realtime add table public.reservations;
alter publication supabase_realtime add table public.club_notifications;

-- ✅ Terminé. Ta base PadelGabon est prête.
