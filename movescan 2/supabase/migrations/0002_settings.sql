-- Per-gym settings: branding, assessment price, chosen plan, exercise mapping and team list.
alter table gyms add column if not exists settings jsonb not null default '{}';

create or replace function is_gym_owner(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = auth.uid() and gym_id = g and role = 'owner')
$$;

create policy "owners update their gym" on gyms for update
  using (is_gym_owner(id)) with check (is_gym_owner(id));
