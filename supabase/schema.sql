-- ============================================
-- PADELGABON — Schéma de base de données
-- À coller dans Supabase > SQL Editor > Run
-- ============================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- =====================
-- CLUBS
-- =====================
create table if not exists public.clubs (
  id uuid primary key default uuid_generate_v4(),
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
  subscription_expires_at timestamptz,
  access_code text default '1234',
  created_at timestamptz default now()
);

-- =====================
-- COURTS
-- =====================
create table if not exists public.courts (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id) on delete cascade,
  name text not null,
  type text default 'Intérieur',
  is_open boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- =====================
-- PLAYERS (joueurs)
-- =====================
create table if not exists public.players (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  phone text,
  name text not null default 'Joueur',
  level text default 'Débutant',
  created_at timestamptz default now()
);

-- =====================
-- RESERVATIONS
-- =====================
create table if not exists public.reservations (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id),
  court_id uuid references public.courts(id),
  player_id uuid references public.players(id),
  player_name text not null default '',
  player_phone text default '',
  date_key text not null,
  start_minutes int not null,
  end_minutes int not null,
  duration int not null default 60,
  use_machine boolean default false,
  extras jsonb default '[]'::jsonb,
  total_amount int default 0,
  status text default 'confirmed',
  created_at timestamptz default now(),
  -- Empêche les doubles réservations sur le même créneau
  unique (court_id, date_key, start_minutes)
);

-- =====================
-- COACHES (indépendants, plusieurs clubs)
-- =====================
create table if not exists public.coaches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  level text default 'Pro',
  hourly_price text default '15 000 XAF/h',
  bio text default '',
  available_slots jsonb default '["8h00","10h00","14h00","16h00"]'::jsonb,
  created_at timestamptz default now()
);

-- Coach peut travailler dans plusieurs clubs
create table if not exists public.coach_clubs (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid references public.coaches(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  unique(coach_id, club_id)
);

-- =====================
-- TOURNAMENTS
-- =====================
create table if not exists public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id),
  name text not null,
  start_date date not null,
  end_date date,
  max_players int default 32,
  registered_count int default 0,
  entry_fee int default 0,
  type text default 'Mixte',
  status text default 'soon',
  payment_phone text default '',
  payment_provider text default 'Airtel Money',
  description text default '',
  created_at timestamptz default now()
);

-- Inscriptions aux tournois
create table if not exists public.tournament_registrations (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  player_name text not null,
  player_phone text not null,
  payment_confirmed boolean default false,
  created_at timestamptz default now()
);

-- =====================
-- NOTIFICATIONS CLUBS
-- =====================
create table if not exists public.club_notifications (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id) on delete cascade,
  type text default 'reservation',
  title text not null,
  message text not null,
  payload jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =====================
-- PRODUCTS (boutique)
-- =====================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id),
  name text not null,
  brand text default '',
  current_price int not null,
  original_price int not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =====================
-- PUBLICITÉS (pubs)
-- =====================
create table if not exists public.pubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  club text default '',
  club_id uuid references public.clubs(id),
  type text default 'Magasin',
  monthly_price int default 30000,
  views int default 0,
  clicks int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =====================
-- FONCTION: Incrémenter inscrits tournoi
-- =====================
create or replace function increment_tournament_count(t_id uuid)
returns void as $$
begin
  update public.tournaments
  set registered_count = registered_count + 1
  where id = t_id;
end;
$$ language plpgsql;

-- =====================
-- DÉSACTIVER RLS (Phase 1 — activer en Phase 2 avec auth)
-- =====================
alter table public.clubs disable row level security;
alter table public.courts disable row level security;
alter table public.players disable row level security;
alter table public.reservations disable row level security;
alter table public.coaches disable row level security;
alter table public.coach_clubs disable row level security;
alter table public.tournaments disable row level security;
alter table public.tournament_registrations disable row level security;
alter table public.club_notifications disable row level security;
alter table public.products disable row level security;
alter table public.pubs disable row level security;
