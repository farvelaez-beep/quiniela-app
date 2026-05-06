-- =====================================================
-- QUINIELA MUNDIAL 2026 - SCHEMA SUPABASE
-- Pega este archivo completo en Supabase → SQL Editor → Run
-- =====================================================

-- 1) PERFILES (extiende auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  is_admin boolean not null default false,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) PREDICCIONES DE PARTIDOS DE GRUPOS
create table public.match_predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null,
  home_score smallint not null check (home_score >= 0 and home_score <= 30),
  away_score smallint not null check (away_score >= 0 and away_score <= 30),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

-- 3) PREDICCIONES BONUS (goleador y campeón)
create table public.bonus_predictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  top_scorer text,
  champion text,
  updated_at timestamptz not null default now()
);

-- 4) RESULTADOS OFICIALES (escritos solo por el admin)
create table public.match_results (
  match_id text primary key,
  home_score smallint not null,
  away_score smallint not null,
  updated_at timestamptz not null default now()
);

-- 5) CONFIGURACIÓN DEL TORNEO (singleton)
create table public.tournament_settings (
  id smallint primary key default 1 check (id = 1),
  is_locked boolean not null default false,
  official_top_scorer text,
  official_champion text,
  entry_fee integer not null default 20000,
  currency text not null default 'COP',
  updated_at timestamptz not null default now()
);

insert into public.tournament_settings (id) values (1);

-- =====================================================
-- TRIGGER: cuando se registra un nuevo auth.user, crea su profile
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    -- Si el email coincide con el admin configurado, lo marcamos como admin
    new.email = coalesce(current_setting('app.admin_email', true), '__none__')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table public.profiles enable row level security;
alter table public.match_predictions enable row level security;
alter table public.bonus_predictions enable row level security;
alter table public.match_results enable row level security;
alter table public.tournament_settings enable row level security;

-- Helper: verifica si el usuario actual es admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Helper: verifica si las predicciones están bloqueadas
create or replace function public.is_locked()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_locked from public.tournament_settings where id = 1), false);
$$;

-- POLÍTICAS: PROFILES
-- Cualquier autenticado puede ver todos los perfiles (para el leaderboard)
create policy "profiles_read_all" on public.profiles
  for select to authenticated using (true);

-- Solo el dueño puede actualizar su propio perfil (nombre)
-- Pero NO puede cambiarse a admin ni cambiar el campo paid
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select is_admin from public.profiles where id = auth.uid()) and paid = (select paid from public.profiles where id = auth.uid()));

-- El admin puede actualizar cualquier perfil (para marcar pagos)
create policy "profiles_admin_update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- El admin puede borrar perfiles
create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated using (public.is_admin());

-- POLÍTICAS: MATCH_PREDICTIONS
create policy "predictions_read_all" on public.match_predictions
  for select to authenticated using (true);

create policy "predictions_insert_own" on public.match_predictions
  for insert to authenticated
  with check (auth.uid() = user_id and not public.is_locked());

create policy "predictions_update_own" on public.match_predictions
  for update to authenticated
  using (auth.uid() = user_id and not public.is_locked())
  with check (auth.uid() = user_id);

create policy "predictions_delete_own" on public.match_predictions
  for delete to authenticated
  using (auth.uid() = user_id and not public.is_locked());

-- POLÍTICAS: BONUS_PREDICTIONS
create policy "bonus_read_all" on public.bonus_predictions
  for select to authenticated using (true);

create policy "bonus_insert_own" on public.bonus_predictions
  for insert to authenticated
  with check (auth.uid() = user_id and not public.is_locked());

create policy "bonus_update_own" on public.bonus_predictions
  for update to authenticated
  using (auth.uid() = user_id and not public.is_locked())
  with check (auth.uid() = user_id);

-- POLÍTICAS: MATCH_RESULTS (solo admin escribe, todos leen)
create policy "results_read_all" on public.match_results
  for select to authenticated using (true);

create policy "results_admin_write" on public.match_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- POLÍTICAS: TOURNAMENT_SETTINGS
create policy "settings_read_all" on public.tournament_settings
  for select to authenticated using (true);

create policy "settings_admin_update" on public.tournament_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
create index idx_predictions_user on public.match_predictions(user_id);
create index idx_predictions_match on public.match_predictions(match_id);

-- =====================================================
-- LISTO. Después de correr esto:
--  1) Ve a Authentication → Providers → habilita Email
--  2) Authentication → URL Configuration → agrega tu dominio
--  3) Crea tu cuenta de admin via la app
--  4) Si tu email NO coincide con el configurado, corre manualmente:
--     update public.profiles set is_admin = true where email = 'tucorreo@gmail.com';
-- =====================================================
