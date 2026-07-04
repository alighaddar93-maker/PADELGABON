-- ============================================================
-- PADELGABON — SCHÉMA CANONIQUE (source de vérité unique) — V3-D2
-- ------------------------------------------------------------
-- C'EST LE SEUL fichier schéma faisant autorité. Il crée toute la base
-- (tables + rôles + RLS sécurisée + contraintes) à partir de zéro.
--   • Pour une NOUVELLE base (ex. projet Supabase de TEST) : lancer ce fichier.
--   • Pour la base de PROD déjà en service : voir supabase-security-patch.sql
--     (migration qui applique les correctifs sécurité sans tout recréer).
-- Lancer dans : Supabase → SQL Editor → New query → Run.
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

-- ------------------------------------------------------------ CLUBS
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

-- ------------------------------------------------------------ COURTS
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  name text not null,
  type text default 'Extérieur',
  is_open boolean default true,
  sort_order int default 0
);

-- ------------------------------------------------------------ PROFILES (comptes/rôles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  level text default 'Débutant',
  role text not null default 'player',      -- 'player' | 'club' | 'admin'
  club_id uuid references public.clubs(id) on delete set null,
  photo text,
  hide_phone boolean default false,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone, level, role, hide_phone)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'level', 'Débutant'),
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    coalesce((new.raw_user_meta_data->>'hidePhone')::boolean, false)
  ) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_manage_club(cid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ( role = 'admin' or (role = 'club' and club_id = cid) )
  );
$$;

-- ------------------------------------------------------------ RESERVATIONS
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  date_key text not null,
  start_minutes int not null,
  end_minutes int not null,
  duration int default 60,
  player_name text default '',
  player_phone text default '',
  use_machine boolean default false,
  extras jsonb default '[]'::jsonb,
  total_amount int default 0,
  status text default 'confirmed',          -- 'confirmed' | 'cancelled'
  time_range int4range generated always as (int4range(start_minutes, end_minutes)) stored,
  created_at timestamptz default now()
);

-- Anti double-réservation : empêche TOUT chevauchement (durées différentes incluses) — V3-D1
alter table public.reservations drop constraint if exists no_overlapping_bookings;
alter table public.reservations
  add constraint no_overlapping_bookings
  exclude using gist ( court_id with =, date_key with =, time_range with && )
  where (status in ('pending_payment','confirmed'));

-- ------------------------------------------------------------ COACHES
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text default 'Pro',
  hourly_price text default '15 000 XAF/h',
  available_slots jsonb default '[]'::jsonb,
  clubs jsonb default '[]'::jsonb,
  photo text default '',
  description text default '',
  phone text default '',
  created_at timestamptz default now()
);

create table if not exists public.coach_clubs (
  coach_id uuid references public.coaches(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  primary key (coach_id, club_id)
);

-- ------------------------------------------------------------ TOURNOIS
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_id uuid references public.clubs(id) on delete set null,
  club_name text default '',
  start_date date,
  end_date date,
  max_players int default 32,
  registered_count int default 0,
  entry_fee int default 5000,
  type text default 'Mixte',
  regtype text default 'team',
  status text default 'open',
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

create or replace function public.increment_tournament_count(t_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.tournaments set registered_count = registered_count + 1 where id = t_id;
$$;

-- ------------------------------------------------------------ NOTIFICATIONS CLUB
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

-- ------------------------------------------------------------ LISTES (pubs/magasins/joueurs)
create table if not exists public.app_lists (
  key text primary key,
  data jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------ NOTIFICATIONS (centre multi-appareils)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text,
  audience text not null,                   -- 'all_players' | 'admin' | 'user' | 'club'
  target_user_id uuid,
  club_id uuid,
  title text,
  body text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_notifs_created on public.notifications (created_at desc);

-- ============================================================
-- RLS — règles par rôle (sécurisées)
-- ============================================================
alter table public.clubs                    enable row level security;
alter table public.courts                   enable row level security;
alter table public.reservations             enable row level security;
alter table public.coaches                  enable row level security;
alter table public.coach_clubs              enable row level security;
alter table public.tournaments              enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.club_notifications       enable row level security;
alter table public.app_lists                enable row level security;
alter table public.profiles                 enable row level security;
alter table public.notifications            enable row level security;

-- PROFILES : chacun voit/édite le sien ; pas d'auto-promotion (role/club_id figés) — V3-S2
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ( id = auth.uid() or public.is_admin() );
drop policy if exists "profiles_update_self_no_role_change" on public.profiles;
create policy "profiles_update_self_no_role_change" on public.profiles
  for update using ( id = auth.uid() or public.is_admin() )
  with check (
    public.is_admin() or (
      id = auth.uid()
      and role    is not distinct from (select p.role    from public.profiles p where p.id = auth.uid())
      and club_id is not distinct from (select p.club_id from public.profiles p where p.id = auth.uid())
    )
  );
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- CATALOGUE : lecture publique, écriture admin
-- clubs : PAS de lecture publique de la table (access_code secret) — public via la vue clubs_public (V4-06)
create policy "clubs_admin"       on public.clubs       for all using (public.is_admin()) with check (public.is_admin());
create policy "courts_read"       on public.courts      for select using (true);
create policy "courts_admin"      on public.courts      for all using (public.is_admin()) with check (public.is_admin());
create policy "coaches_read"      on public.coaches     for select using (true);
create policy "coaches_admin"     on public.coaches     for all using (public.is_admin()) with check (public.is_admin());
create policy "coach_clubs_read"  on public.coach_clubs for select using (true);
create policy "coach_clubs_admin" on public.coach_clubs for all using (public.is_admin()) with check (public.is_admin());
create policy "tournaments_read"  on public.tournaments for select using (true);
create policy "tournaments_admin" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());

-- INSCRIPTIONS TOURNOI
create policy "treg_read"   on public.tournament_registrations for select using (true);
create policy "treg_insert" on public.tournament_registrations for insert with check (auth.role() = 'authenticated');
create policy "treg_admin"  on public.tournament_registrations for all using (public.is_admin()) with check (public.is_admin());

-- RESERVATIONS : insert lie a auth.uid() (V3-S3) ; update/delete proprietaire ou club
create policy "resa_read_own_or_club" on public.reservations for select
  using ( user_id = auth.uid() or public.can_manage_club(club_id) );
create policy "resa_insert" on public.reservations for insert with check ( user_id = auth.uid() );
create policy "resa_update" on public.reservations for update
  using ( user_id = auth.uid() or public.can_manage_club(club_id) )
  with check ( user_id = auth.uid() or public.can_manage_club(club_id) );
create policy "resa_delete" on public.reservations for delete
  using ( user_id = auth.uid() or public.can_manage_club(club_id) );

-- NOTIFICATIONS CLUB
create policy "cnotif_insert" on public.club_notifications for insert with check (auth.role() = 'authenticated');
create policy "cnotif_manage" on public.club_notifications for select using ( public.can_manage_club(club_id) );
create policy "cnotif_update" on public.club_notifications for update using ( public.can_manage_club(club_id) ) with check ( public.can_manage_club(club_id) );
create policy "cnotif_delete" on public.club_notifications for delete using ( public.can_manage_club(club_id) );

-- LISTES
create policy "lists_read"         on public.app_lists for select using (true);
create policy "lists_admin"        on public.app_lists for all using (public.is_admin()) with check (public.is_admin());
create policy "lists_players_auth" on public.app_lists for all
  using ( key = 'players' and auth.role() = 'authenticated' )
  with check ( key = 'players' and auth.role() = 'authenticated' );

-- NOTIFICATIONS (centre) : diffusion restreinte (V3-S4)
create policy "notifs_insert" on public.notifications for insert with check (
  public.is_admin() or public.can_manage_club(club_id) or audience = 'user'
);
create policy "notifs_select" on public.notifications for select using (
  audience = 'all_players'
  or ( audience = 'user'  and target_user_id = auth.uid() )
  or ( audience = 'admin' and public.is_admin() )
  or ( audience = 'club'  and public.can_manage_club(club_id) )
);
create policy "notifs_admin" on public.notifications for all using ( public.is_admin() ) with check ( public.is_admin() );

-- ============================================================ REALTIME
do $$ begin
  begin alter publication supabase_realtime add table public.reservations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.club_notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
end $$;

-- ============================================================ VUES PUBLIQUES (sans données sensibles) — V4-02 / V4-06
-- Appartiennent à postgres → contournent le RLS et n'exposent que des colonnes sûres.
create or replace view public.slot_availability as
  select id, club_id, court_id, date_key, start_minutes, end_minutes, status
  from public.reservations where status = 'confirmed';
grant select on public.slot_availability to anon, authenticated;

create or replace view public.clubs_public as
  select id, name, location, open_from, open_to, price_60, price_90, price_120,
         has_machine, machine_price, machine_balls, extras, is_active, is_suspended,
         suspended_reason, subscription_status, payment_phone, payment_provider, abo, photo, created_at
  from public.clubs;
grant select on public.clubs_public to anon, authenticated;

notify pgrst, 'reload schema';
-- ✅ Base PadelGabon prête (schéma canonique, RLS sécurisée).
