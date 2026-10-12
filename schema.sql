-- =========================================================
-- AGENCY — Supabase schema
-- Supabase Dashboard → SQL Editor → New query → paste → Run
-- =========================================================

-- 1) PROFILES (every logged-in user) ----------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz default now()
);

-- 2) TASKS (todo list) ------------------------------------
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  due_date date,
  created_at timestamptz default now()
);

-- 3) auto-create profile when a user signs up -------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    case when not exists (select 1 from public.profiles) then 'admin' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) helper: is current user an admin? --------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 5) Row Level Security -----------------------------------
alter table public.profiles enable row level security;
alter table public.tasks    enable row level security;

drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_read"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "profiles_delete"
  on public.profiles for delete
  using (public.is_admin());

create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "tasks_read"      on public.tasks;
drop policy if exists "tasks_insert"    on public.tasks;
drop policy if exists "tasks_update"    on public.tasks;
drop policy if exists "tasks_delete"    on public.tasks;

create policy "tasks_read"
  on public.tasks for select
  using (public.is_admin() or assigned_to = auth.uid());

create policy "tasks_insert"
  on public.tasks for insert
  with check (public.is_admin());

create policy "tasks_update"
  on public.tasks for update
  using (public.is_admin() or assigned_to = auth.uid());

create policy "tasks_delete"
  on public.tasks for delete
  using (public.is_admin());
