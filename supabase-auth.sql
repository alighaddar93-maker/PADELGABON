-- ============================================================
-- PADELGABON — ÉTAPE 2 : Comptes réels + rôles (profiles)
-- À lancer UNE FOIS dans SQL Editor → Run.
-- Additif : ne casse rien d'existant.
-- ============================================================

-- 1) Table des profils (1 ligne par utilisateur Supabase Auth)
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

-- 2) Création automatique du profil à chaque inscription
--    (copie les métadonnées envoyées par l'app : name, phone, level...)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, level, role, hide_phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'level', 'Débutant'),
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    coalesce((new.raw_user_meta_data->>'hidePhone')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Helper : l'utilisateur courant est-il admin ?  (SECURITY DEFINER = pas de récursion RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 4) RLS sur profiles
alter table public.profiles enable row level security;

-- Chacun voit son propre profil ; l'admin voit tout
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ( id = auth.uid() or public.is_admin() );

-- Chacun met à jour son propre profil (mais pas son rôle via l'app — voir note)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ( id = auth.uid() or public.is_admin() );

-- L'admin peut tout faire (assigner rôles club, etc.)
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- 5) Recharger le cache de schéma
notify pgrst, 'reload schema';

-- ============================================================
-- APRÈS avoir lancé ce script :
--
-- A) Dans Supabase → Authentication → Providers → Email :
--    DÉSACTIVE "Confirm email"  (sinon les joueurs doivent confirmer par email
--    avant de pouvoir se connecter — trop de friction pour un MVP au Gabon).
--
-- B) Crée TON compte depuis l'app JOUEUR (index.html → "Créer un compte")
--    avec l'email que tu veux utiliser comme admin. Puis exécute ici
--    (en remplaçant par ton email) pour le promouvoir administrateur :
--        update public.profiles set role='admin' where email='ton-email@exemple.com';
--    Ensuite connecte-toi sur la page Admin avec ce même email + mot de passe.
--
-- C) Pour transformer un compte en opérateur de club :
--        update public.profiles
--           set role='club', club_id='<UUID-du-club>'
--         where email='club@exemple.com';
-- ============================================================
