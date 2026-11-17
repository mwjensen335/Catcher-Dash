-- Battery Lab catcher dashboard: database schema for Supabase (Postgres).
-- Run in Supabase → SQL Editor. Safe to read top to bottom; nothing here is wired into the app yet.
--
-- Who sees what (enforced by row-level security below):
--   admin / coach  → everything in their organization
--   catcher        → their own clips, notes, logs
--   parent         → their linked catcher's data, read-only

create extension if not exists "pgcrypto";

-- ───────────── People and organizations ─────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create type org_role as enum ('admin', 'coach', 'catcher', 'parent');

create table memberships (
  org_id uuid not null references organizations on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role org_role not null,
  primary key (org_id, user_id)
);

-- A parent can follow one or more catchers.
create table guardians (
  parent_id uuid not null references profiles on delete cascade,
  catcher_id uuid not null references profiles on delete cascade,
  primary key (parent_id, catcher_id)
);

-- ───────────── Video review ─────────────
create type skill_area as enum ('Receiving', 'Blocking', 'Throwing', 'Game Calling');

create table clips (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  catcher_id uuid not null references profiles,
  uploaded_by uuid not null references profiles,
  area skill_area not null,
  drill text not null default '',
  title text not null,
  stream_uid text,                -- Cloudflare Stream video id
  duration_s real,
  review_of uuid references clips on delete set null,  -- set for recorded coach reviews
  timing jsonb not null default '{}',  -- {catch, release, arrive} in seconds
  created_at timestamptz not null default now()
);
create index on clips (org_id, catcher_id, created_at desc);

create type note_kind as enum ('good', 'fix', 'note', 'voice');

create table clip_notes (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips on delete cascade,
  author_id uuid not null references profiles,
  t_s real not null,
  kind note_kind not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table clip_drawings (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips on delete cascade,
  author_id uuid not null references profiles,
  t_s real not null,
  shape jsonb not null,           -- {tool, color, pts:[[x,y],...]} with 0–1 coordinates
  created_at timestamptz not null default now()
);

create table clip_scores (
  clip_id uuid not null references clips on delete cascade,
  criterion smallint not null,
  score smallint not null check (score between 1 and 5),
  author_id uuid not null references profiles,
  primary key (clip_id, criterion)
);

-- ───────────── Games / logged reps ─────────────
create type pitch_source as enum ('coach', 'trackman', 'model');

create table pitches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  catcher_id uuid not null references profiles,
  logged_by uuid references profiles,
  session_date date not null default current_date,
  plate_x real not null,          -- feet, catcher's view (TrackMan PlateLocSide)
  plate_z real not null,          -- feet (TrackMan PlateLocHeight)
  called_strike boolean not null,
  source pitch_source not null,
  clip_id uuid references clips on delete set null,  -- links a pitch to its video (training data)
  trackman_pitch_uid text unique,
  created_at timestamptz not null default now()
);
create index on pitches (catcher_id, session_date);

create type block_outcome as enum ('smothered', 'rebound', 'passed');

create table block_reps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  catcher_id uuid not null references profiles,
  logged_by uuid references profiles,
  session_date date not null default current_date,
  col smallint not null check (col between 0 and 2),  -- glove side / middle / arm side
  hop smallint not null check (hop between 0 and 2),  -- long / mid / short
  outcome block_outcome not null,
  clip_id uuid references clips on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────── Access rules ─────────────
create or replace function my_role(o uuid) returns org_role
language sql stable security definer set search_path = public as $$
  select role from memberships where org_id = o and user_id = auth.uid()
$$;

-- Can the current user see this catcher's data in this org?
create or replace function can_view_catcher(o uuid, catcher uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role(o) in ('admin', 'coach'), false)
      or (catcher = auth.uid() and my_role(o) = 'catcher')
      or exists (select 1 from guardians g where g.parent_id = auth.uid() and g.catcher_id = catcher and my_role(o) = 'parent')
$$;

create or replace function is_staff(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role(o) in ('admin', 'coach'), false)
$$;

alter table organizations enable row level security;
alter table profiles      enable row level security;
alter table memberships   enable row level security;
alter table guardians     enable row level security;
alter table clips         enable row level security;
alter table clip_notes    enable row level security;
alter table clip_drawings enable row level security;
alter table clip_scores   enable row level security;
alter table pitches       enable row level security;
alter table block_reps    enable row level security;

create policy "members see their orgs" on organizations for select using (my_role(id) is not null);
create policy "see own profile" on profiles for select using (id = auth.uid()
  or exists (select 1 from memberships a join memberships b on a.org_id = b.org_id where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy "edit own profile" on profiles for update using (id = auth.uid());
create policy "see org memberships" on memberships for select using (my_role(org_id) is not null);
create policy "admins manage memberships" on memberships for all using (my_role(org_id) = 'admin');
create policy "see own guardian links" on guardians for select using (parent_id = auth.uid() or catcher_id = auth.uid());

-- Clips: catchers upload their own, staff upload for anyone in the org.
create policy "view clips" on clips for select using (can_view_catcher(org_id, catcher_id));
create policy "upload clips" on clips for insert with check (
  uploaded_by = auth.uid() and (is_staff(org_id) or (catcher_id = auth.uid() and my_role(org_id) = 'catcher')));
create policy "staff edit clips" on clips for update using (is_staff(org_id));
create policy "staff delete clips" on clips for delete using (is_staff(org_id));

-- Feedback: anyone who can see the clip can read it; only coaches write it.
create policy "view notes" on clip_notes for select using (exists (select 1 from clips c where c.id = clip_id and can_view_catcher(c.org_id, c.catcher_id)));
create policy "staff write notes" on clip_notes for all using (exists (select 1 from clips c where c.id = clip_id and is_staff(c.org_id)));
create policy "view drawings" on clip_drawings for select using (exists (select 1 from clips c where c.id = clip_id and can_view_catcher(c.org_id, c.catcher_id)));
create policy "staff write drawings" on clip_drawings for all using (exists (select 1 from clips c where c.id = clip_id and is_staff(c.org_id)));
create policy "view scores" on clip_scores for select using (exists (select 1 from clips c where c.id = clip_id and can_view_catcher(c.org_id, c.catcher_id)));
create policy "staff write scores" on clip_scores for all using (exists (select 1 from clips c where c.id = clip_id and is_staff(c.org_id)));

-- Logged reps: visible like clips; staff log them.
create policy "view pitches" on pitches for select using (can_view_catcher(org_id, catcher_id));
create policy "staff log pitches" on pitches for all using (is_staff(org_id));
create policy "view block reps" on block_reps for select using (can_view_catcher(org_id, catcher_id));
create policy "staff log block reps" on block_reps for all using (is_staff(org_id));

-- New sign-ups get a profile row automatically.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
