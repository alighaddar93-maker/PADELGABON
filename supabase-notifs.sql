-- ============================================================
-- PADELGABON — ÉTAPE 4 : Notifications (centre de notifs en ligne)
-- À lancer dans SQL Editor → Run. Additif, ne casse rien.
-- ============================================================

-- 1) Table des notifications (lues par tous les téléphones)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text,                       -- 'reservation','invite','cancel_player','cancel_club','tournament_new','tournament_join'
  audience text not null,          -- 'all_players' | 'admin' | 'user' | 'club'
  target_user_id uuid,             -- destinataire précis (audience='user')
  club_id uuid,                    -- club concerné (audience='club')
  title text,
  body text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_notifs_created on public.notifications (created_at desc);

-- 2) RLS : chacun ne voit que ce qui le concerne
alter table public.notifications enable row level security;

-- Tout utilisateur connecté peut créer une notification (l'app le fait pour lui)
drop policy if exists "notifs_insert" on public.notifications;
create policy "notifs_insert" on public.notifications
  for insert with check ( auth.role() = 'authenticated' );

-- Lecture selon l'audience
drop policy if exists "notifs_select" on public.notifications;
create policy "notifs_select" on public.notifications for select using (
  audience = 'all_players'
  or ( audience = 'user'  and target_user_id = auth.uid() )
  or ( audience = 'admin' and public.is_admin() )
  or ( audience = 'club'  and public.can_manage_club(club_id) )
);

-- L'admin peut tout gérer (ménage éventuel)
drop policy if exists "notifs_admin" on public.notifications;
create policy "notifs_admin" on public.notifications
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- 3) Temps réel (pour que la cloche se mette à jour toute seule)
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;

-- 4) Recharger le cache de schéma
notify pgrst, 'reload schema';

-- ✅ Centre de notifications prêt.
