-- ============================================================
-- Zenplate — Explicit Grants & RLS Policies
-- Required by Supabase Data API policy change (effective Oct 30 2026)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. meals ────────────────────────────────────────────────────────────────

grant select, insert, update, delete
  on public.meals
  to authenticated;

alter table public.meals
  enable row level security;

-- Drop existing policies before recreating (idempotent)
drop policy if exists "users can manage their own meals" on public.meals;

create policy "users can manage their own meals"
  on public.meals
  for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── 2. profiles ─────────────────────────────────────────────────────────────

grant select, insert, update
  on public.profiles
  to authenticated;

alter table public.profiles
  enable row level security;

drop policy if exists "users can manage their own profile" on public.profiles;

create policy "users can manage their own profile"
  on public.profiles
  for all
  to authenticated
  using  (auth.uid() = id)
  with check (auth.uid() = id);


-- ── 3. portion_corrections ──────────────────────────────────────────────────

grant select, insert
  on public.portion_corrections
  to authenticated;

alter table public.portion_corrections
  enable row level security;

drop policy if exists "users can manage their own corrections" on public.portion_corrections;

create policy "users can manage their own corrections"
  on public.portion_corrections
  for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
