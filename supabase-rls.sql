-- ============================================================
-- PADELGABON — ÉTAPE 2 : Verrouillage de la base (RLS)
-- À lancer APRÈS supabase-auth.sql, et APRÈS avoir vérifié
-- que la connexion (joueur/admin/club) fonctionne.
--
-- Effet : remplace les règles "ouvertes à tous" par des règles par rôle.
--   • Tout le monde peut CONSULTER le catalogue (clubs, courts, tournois, coachs).
--   • Seul l'ADMIN peut créer/modifier/supprimer clubs, courts, tournois, coachs, pubs, magasins.
--   • Un JOUEUR connecté peut réserver et annuler SA réservation.
--   • Un CLUB peut gérer (annuler/voir) les réservations + notifications de SON club.
-- ============================================================

-- 1) Colonne "qui a réservé" (pour l'annulation par le joueur)
alter table public.reservations
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2) Helper : l'utilisateur courant peut-il gérer ce club ?
create or replace function public.can_manage_club(cid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and ( role = 'admin' or (role = 'club' and club_id = cid) )
  );
$$;

-- 3) Supprimer toutes les anciennes policies "ouvertes" sur ces tables
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in (
        'clubs','courts','reservations','coaches','coach_clubs',
        'tournaments','tournament_registrations','club_notifications','app_lists'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- S'assurer que RLS est activé partout
alter table public.clubs                    enable row level security;
alter table public.courts                   enable row level security;
alter table public.reservations             enable row level security;
alter table public.coaches                  enable row level security;
alter table public.coach_clubs              enable row level security;
alter table public.tournaments              enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.club_notifications       enable row level security;
alter table public.app_lists                enable row level security;

-- 4) CLUBS — lecture publique, écriture admin
create policy "clubs_read"  on public.clubs for select using (true);
create policy "clubs_admin" on public.clubs for all using (public.is_admin()) with check (public.is_admin());

-- 5) COURTS — lecture publique, écriture admin
create policy "courts_read"  on public.courts for select using (true);
create policy "courts_admin" on public.courts for all using (public.is_admin()) with check (public.is_admin());

-- 6) COACHS — lecture publique, écriture admin
create policy "coaches_read"  on public.coaches for select using (true);
create policy "coaches_admin" on public.coaches for all using (public.is_admin()) with check (public.is_admin());

create policy "coach_clubs_read"  on public.coach_clubs for select using (true);
create policy "coach_clubs_admin" on public.coach_clubs for all using (public.is_admin()) with check (public.is_admin());

-- 7) TOURNOIS — lecture publique, écriture admin
create policy "tournaments_read"  on public.tournaments for select using (true);
create policy "tournaments_admin" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());

-- 8) INSCRIPTIONS TOURNOI — lecture publique (compteur), inscription par connecté, gestion admin
create policy "treg_read"   on public.tournament_registrations for select using (true);
create policy "treg_insert" on public.tournament_registrations for insert with check (auth.role() = 'authenticated');
create policy "treg_admin"  on public.tournament_registrations for all using (public.is_admin()) with check (public.is_admin());

-- 9) RÉSERVATIONS
--    lecture publique (afficher les créneaux pris) ;
--    création par tout utilisateur connecté ;
--    modification (annulation) par le propriétaire OU le club/admin ;
--    suppression par le club/admin.
create policy "resa_read"   on public.reservations for select using (true);
create policy "resa_insert" on public.reservations for insert with check (auth.role() = 'authenticated');
create policy "resa_update" on public.reservations for update
  using ( user_id = auth.uid() or public.can_manage_club(club_id) )
  with check ( user_id = auth.uid() or public.can_manage_club(club_id) );
create policy "resa_delete" on public.reservations for delete
  using ( public.can_manage_club(club_id) );

-- 10) NOTIFICATIONS CLUB — créées par les joueurs connectés, gérées par le club/admin
create policy "notif_insert" on public.club_notifications for insert with check (auth.role() = 'authenticated');
create policy "notif_manage" on public.club_notifications for select using ( public.can_manage_club(club_id) );
create policy "notif_update" on public.club_notifications for update using ( public.can_manage_club(club_id) ) with check ( public.can_manage_club(club_id) );
create policy "notif_delete" on public.club_notifications for delete using ( public.can_manage_club(club_id) );

-- 11) LISTES (pubs, magasins, joueurs)
--     lecture publique ; écriture admin ; la liste 'players' modifiable par un joueur connecté.
create policy "lists_read"         on public.app_lists for select using (true);
create policy "lists_admin"        on public.app_lists for all using (public.is_admin()) with check (public.is_admin());
create policy "lists_players_auth" on public.app_lists for all
  using ( key = 'players' and auth.role() = 'authenticated' )
  with check ( key = 'players' and auth.role() = 'authenticated' );

-- 12) Le compteur d'inscriptions tournoi doit pouvoir s'incrémenter même pour un
--     joueur (qui n'a pas le droit d'écrire dans tournaments) → SECURITY DEFINER.
create or replace function public.increment_tournament_count(t_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.tournaments set registered_count = registered_count + 1 where id = t_id;
$$;

-- 13) Recharger le cache de schéma
notify pgrst, 'reload schema';

-- ✅ Base verrouillée. Si une action légitime est bloquée, vérifie le rôle/club_id
--    du compte dans la table profiles.
