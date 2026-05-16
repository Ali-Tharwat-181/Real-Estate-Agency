-- ─────────────────────────────────────────
-- PropPilot Database Setup
-- ─────────────────────────────────────────
-- Run this in your Supabase SQL Editor
-- (This is provided for reference - you already ran these)

-- ─────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────

create table agencies (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz default now()
);

create table contacts (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references agencies(id) on delete cascade,
  name       text not null,
  email      text not null,
  message    text not null,
  status     text not null default 'new'
             check (status in ('new', 'contacted', 'discarded')),
  created_at timestamptz default now()
);

-- Fast queries for the inbox, sorted by date
create index contacts_agency_created_idx
  on contacts(agency_id, created_at desc);

-- ─────────────────────────────────────────
-- 2. RLS — enable on both tables
-- ─────────────────────────────────────────

alter table agencies  enable row level security;
alter table contacts  enable row level security;

-- ─────────────────────────────────────────
-- 3. PROFILES — links auth.users → agencies
-- ─────────────────────────────────────────

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  agency_id  uuid not null references agencies(id)
);

alter table profiles enable row level security;

-- Agents can only read their own profile
create policy "agent reads own profile"
  on profiles for select
  using (auth.uid() = id);

-- ─────────────────────────────────────────
-- 4. RLS POLICIES
-- ─────────────────────────────────────────

-- agencies: Allow everyone to read (needed for public form lookup)
create policy "public can read agencies"
  on agencies for select
  to anon, authenticated
  using (true);

-- contacts: Allow everyone to INSERT
create policy "anyone can submit contact"
  on contacts for insert
  to anon, authenticated
  with check (true);

-- contacts: authenticated agents can only
-- SELECT rows belonging to their agency
create policy "agent reads own agency contacts"
  on contacts for select
  to authenticated
  using (
    agency_id = (select agency_id from profiles where id = auth.uid())
  );

-- contacts: agents can UPDATE status only
create policy "agent updates own agency contacts"
  on contacts for update
  to authenticated
  using (
    agency_id = (select agency_id from profiles where id = auth.uid())
  )
  with check (
    agency_id = (select agency_id from profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────
-- 5. REALTIME — enable for contacts table
-- ─────────────────────────────────────────
alter publication supabase_realtime add table contacts;

-- ─────────────────────────────────────────
-- 6. DEMO DATA (for testing)
-- ─────────────────────────────────────────

-- Create two demo agencies
INSERT INTO agencies (slug, name) VALUES
  ('sunrise-realty', 'Sunrise Realty'),
  ('metro-properties', 'Metro Properties');

-- After creating user accounts in Supabase Auth Dashboard, link them here:
-- 
-- Get the agency IDs:
-- SELECT id, slug FROM agencies;
-- 
-- Get the user IDs from Auth Dashboard, then:
-- INSERT INTO profiles (id, agency_id) VALUES
--   ('<user-id-from-auth>', '<agency-one-id>'),
--   ('<user-id-from-auth-2>', '<agency-two-id>');
