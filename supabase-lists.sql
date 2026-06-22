-- ============================================================
-- PADELGABON — Table "listes" pour pubs / magasins / joueurs
-- Approche simple : une ligne par type, données en JSON (zéro souci de colonnes)
-- À lancer dans SQL Editor → Run
-- ============================================================

create table if not exists public.app_lists (
  key text primary key,
  data jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_lists enable row level security;
drop policy if exists "public_all_app_lists" on public.app_lists;
create policy "public_all_app_lists" on public.app_lists for all using (true) with check (true);

-- ✅ Table prête. Les magasins (+ produits), pubs et joueurs s'y synchroniseront.
