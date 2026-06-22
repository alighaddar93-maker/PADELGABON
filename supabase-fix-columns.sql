-- ============================================================
-- PADELGABON — Correctif : ajoute les colonnes manquantes
-- (À lancer dans Supabase → SQL Editor → Run)
-- Sans danger : n'ajoute que ce qui manque, ne supprime rien.
-- ============================================================

-- ---- CLUBS ----
alter table public.clubs add column if not exists location text default '';
alter table public.clubs add column if not exists open_from int default 7;
alter table public.clubs add column if not exists open_to int default 23;
alter table public.clubs add column if not exists price_60 int default 5000;
alter table public.clubs add column if not exists price_90 int default 7000;
alter table public.clubs add column if not exists price_120 int default 9000;
alter table public.clubs add column if not exists has_machine boolean default false;
alter table public.clubs add column if not exists machine_price int default 0;
alter table public.clubs add column if not exists machine_balls int default 0;
alter table public.clubs add column if not exists extras jsonb default '[]'::jsonb;
alter table public.clubs add column if not exists is_active boolean default true;
alter table public.clubs add column if not exists is_suspended boolean default false;
alter table public.clubs add column if not exists suspended_reason text default '';
alter table public.clubs add column if not exists subscription_status text default 'trial';
alter table public.clubs add column if not exists access_code text default '1234';
alter table public.clubs add column if not exists payment_phone text default '';
alter table public.clubs add column if not exists payment_provider text default 'Airtel Money';
alter table public.clubs add column if not exists abo int default 25000;
alter table public.clubs add column if not exists photo text default '';
alter table public.clubs add column if not exists created_at timestamptz default now();

-- ---- COURTS ----
alter table public.courts add column if not exists club_id uuid references public.clubs(id) on delete cascade;
alter table public.courts add column if not exists name text;
alter table public.courts add column if not exists type text default 'Extérieur';
alter table public.courts add column if not exists is_open boolean default true;
alter table public.courts add column if not exists sort_order int default 0;

-- ---- RESERVATIONS ----
alter table public.reservations add column if not exists club_id uuid;
alter table public.reservations add column if not exists court_id uuid;
alter table public.reservations add column if not exists date_key text;
alter table public.reservations add column if not exists start_minutes int;
alter table public.reservations add column if not exists end_minutes int;
alter table public.reservations add column if not exists duration int default 60;
alter table public.reservations add column if not exists player_name text default '';
alter table public.reservations add column if not exists player_phone text default '';
alter table public.reservations add column if not exists use_machine boolean default false;
alter table public.reservations add column if not exists extras jsonb default '[]'::jsonb;
alter table public.reservations add column if not exists total_amount int default 0;
alter table public.reservations add column if not exists status text default 'confirmed';
alter table public.reservations add column if not exists created_at timestamptz default now();

-- ---- COACHES ----
alter table public.coaches add column if not exists name text;
alter table public.coaches add column if not exists level text default 'Pro';
alter table public.coaches add column if not exists hourly_price text default '15 000 XAF/h';
alter table public.coaches add column if not exists available_slots jsonb default '[]'::jsonb;
alter table public.coaches add column if not exists photo text default '';
alter table public.coaches add column if not exists description text default '';
alter table public.coaches add column if not exists phone text default '';
alter table public.coaches add column if not exists created_at timestamptz default now();

-- ---- TOURNAMENTS ----
alter table public.tournaments add column if not exists name text;
alter table public.tournaments add column if not exists club_id uuid;
alter table public.tournaments add column if not exists start_date date;
alter table public.tournaments add column if not exists end_date date;
alter table public.tournaments add column if not exists max_players int default 32;
alter table public.tournaments add column if not exists registered_count int default 0;
alter table public.tournaments add column if not exists entry_fee int default 5000;
alter table public.tournaments add column if not exists type text default 'Mixte';
alter table public.tournaments add column if not exists regtype text default 'team';
alter table public.tournaments add column if not exists status text default 'open';
alter table public.tournaments add column if not exists photo text default '';
alter table public.tournaments add column if not exists payment_phone text default '';
alter table public.tournaments add column if not exists payment_provider text default 'Airtel Money';
alter table public.tournaments add column if not exists created_at timestamptz default now();

-- ---- TOURNAMENT REGISTRATIONS ----
alter table public.tournament_registrations add column if not exists tournament_id uuid;
alter table public.tournament_registrations add column if not exists player_name text default '';
alter table public.tournament_registrations add column if not exists partner_name text default '';
alter table public.tournament_registrations add column if not exists phone text default '';
alter table public.tournament_registrations add column if not exists partner_phone text default '';
alter table public.tournament_registrations add column if not exists created_at timestamptz default now();

-- ---- CLUB NOTIFICATIONS ----
alter table public.club_notifications add column if not exists club_id uuid;
alter table public.club_notifications add column if not exists type text default 'reservation';
alter table public.club_notifications add column if not exists title text default '';
alter table public.club_notifications add column if not exists message text default '';
alter table public.club_notifications add column if not exists payload jsonb default '{}'::jsonb;
alter table public.club_notifications add column if not exists is_read boolean default false;
alter table public.club_notifications add column if not exists created_at timestamptz default now();

-- ✅ Colonnes manquantes ajoutées. Réessaie de créer un club.
