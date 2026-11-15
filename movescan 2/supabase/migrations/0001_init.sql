-- MoveScan schema. Every row belongs to a gym, and row level security only lets a signed-in user
-- see rows for gyms they are a member of. Selling to a second gym = insert a gym + membership.

create extension if not exists pgcrypto;

create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reply_to_email text,
  created_at timestamptz not null default now()
);

create table memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  role text not null default 'trainer' check (role in ('owner', 'trainer')),
  primary key (user_id, gym_id)
);

-- The gym of the signed-in user (single-gym users for now). Used as the default for gym_id.
create or replace function my_gym_id() returns uuid
language sql stable security definer set search_path = public as $$
  select gym_id from memberships where user_id = auth.uid() limit 1
$$;

create or replace function is_gym_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = auth.uid() and gym_id = g)
$$;

create table clients (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default my_gym_id() references gyms(id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  email text,
  phone text,
  dob date,
  height_in numeric,
  weight_lb numeric,
  sport text,
  injuries text,
  goals text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);
create index on clients (gym_id);

create table scans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default my_gym_id() references gyms(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  performed_at timestamptz not null default now(),
  fails text[] not null default '{}',       -- e.g. 'squat.valgus.R'
  skipped text[] not null default '{}',     -- movement keys not tested
  notes jsonb not null default '{}',
  total_pct numeric not null,
  retest_due date not null,
  report_sent_at timestamptz,
  reminder_sent_at timestamptz
);
create index on scans (gym_id);
create index on scans (client_id, performed_at desc);
create index on scans (retest_due) where reminder_sent_at is null;

alter table gyms enable row level security;
alter table memberships enable row level security;
alter table clients enable row level security;
alter table scans enable row level security;

create policy "members read their gym" on gyms for select using (is_gym_member(id));
create policy "read own memberships" on memberships for select using (user_id = auth.uid());

create policy "gym members manage clients" on clients for all
  using (is_gym_member(gym_id)) with check (is_gym_member(gym_id));

create policy "gym members manage scans" on scans for all
  using (is_gym_member(gym_id)) with check (is_gym_member(gym_id));

-- Onboarding a gym (run once per gym in the SQL editor after the trainer signs up):
--   with g as (insert into gyms (name, reply_to_email) values ('Ambrose''s Gym', 'ambrose@example.com') returning id)
--   insert into memberships (user_id, gym_id, role)
--   select u.id, g.id, 'owner' from auth.users u, g where u.email = 'ambrose@example.com';
