-- Training and billing. Programs, assignments, workout logs, membership plans, subscriptions,
-- invoices and custom exercises are stored as typed JSON records, walled off per gym like everything else.

alter table clients add column if not exists portal_token uuid not null default gen_random_uuid();
alter table clients add column if not exists archived boolean not null default false;
create unique index if not exists clients_portal_token on clients (portal_token);

create table if not exists records (
  id text primary key,
  gym_id uuid not null default my_gym_id() references gyms(id) on delete cascade,
  kind text not null check (kind in ('exercise', 'program', 'assignment', 'log', 'plan', 'subscription', 'invoice')),
  client_id uuid references clients(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists records_gym_kind on records (gym_id, kind);
create index if not exists records_client on records (client_id, kind);

alter table records enable row level security;
create policy "gym members manage records" on records for all
  using (is_gym_member(gym_id)) with check (is_gym_member(gym_id));

-- Athletes reach their own rows through /api/portal, which uses the service role and their private
-- portal_token. They never query these tables directly.
