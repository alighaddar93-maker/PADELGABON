-- Ajoute les colonnes manquantes à la table clubs (simple, sans risque)
alter table public.clubs add column if not exists access_code text default '1234';
alter table public.clubs add column if not exists payment_phone text default '';
alter table public.clubs add column if not exists payment_provider text default 'Airtel Money';
alter table public.clubs add column if not exists has_machine boolean default false;
alter table public.clubs add column if not exists machine_price int default 0;
alter table public.clubs add column if not exists machine_balls int default 0;
alter table public.clubs add column if not exists abo int default 25000;
alter table public.clubs add column if not exists photo text default '';
alter table public.clubs add column if not exists extras jsonb default '[]'::jsonb;
alter table public.clubs add column if not exists is_suspended boolean default false;
alter table public.clubs add column if not exists suspended_reason text default '';
alter table public.clubs add column if not exists subscription_status text default 'trial';

-- Recharger le cache (important)
notify pgrst, 'reload schema';
