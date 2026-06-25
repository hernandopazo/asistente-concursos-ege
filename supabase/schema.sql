create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  administrative_details text not null default '',
  starts_on date,
  ends_on date,
  shared_state jsonb not null default '{}'::jsonb,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_members (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'evaluator', 'viewer')),
  evaluator_key text,
  display_name text not null default '',
  color text not null default '#2d6f8f',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (competition_id, user_id),
  unique (competition_id, evaluator_key)
);

create table if not exists public.competition_invitations (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  email text not null,
  role text not null default 'evaluator' check (role in ('admin', 'evaluator', 'viewer')),
  evaluator_key text,
  display_name text not null default '',
  color text not null default '#2d6f8f',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (competition_id, email)
);

create table if not exists public.evaluator_states (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (competition_id, user_id)
);

create table if not exists public.state_versions (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('shared', 'evaluator')),
  data jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists competitions_set_updated_at on public.competitions;
create trigger competitions_set_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

drop trigger if exists evaluator_states_set_updated_at on public.evaluator_states;
create trigger evaluator_states_set_updated_at
before update on public.evaluator_states
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_competition_member(target_competition uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.competition_members
    where competition_id = target_competition
      and user_id = auth.uid()
      and active
  );
$$;

create or replace function public.is_competition_admin(target_competition uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.competitions
    where id = target_competition
      and owner_id = auth.uid()
  ) or exists (
    select 1
    from public.competition_members
    where competition_id = target_competition
      and user_id = auth.uid()
      and role = 'admin'
      and active
  );
$$;

create or replace function public.claim_competition_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  insert into public.competition_members (
    competition_id,
    user_id,
    role,
    evaluator_key,
    display_name,
    color
  )
  select
    invitation.competition_id,
    auth.uid(),
    invitation.role,
    invitation.evaluator_key,
    invitation.display_name,
    invitation.color
  from public.competition_invitations invitation
  where lower(invitation.email) = lower(auth.jwt() ->> 'email')
    and invitation.accepted_at is null
    and not exists (
      select 1
      from public.competition_members occupied
      where occupied.competition_id = invitation.competition_id
        and occupied.evaluator_key = invitation.evaluator_key
        and occupied.user_id <> auth.uid()
    )
  on conflict (competition_id, user_id) do update
  set role = excluded.role,
      evaluator_key = excluded.evaluator_key,
      display_name = excluded.display_name,
      color = excluded.color,
      active = true;

  get diagnostics claimed = row_count;

  update public.competition_invitations
  set accepted_at = now()
  where lower(email) = lower(auth.jwt() ->> 'email')
    and accepted_at is null
    and exists (
      select 1
      from public.competition_members member
      where member.competition_id = competition_invitations.competition_id
        and member.user_id = auth.uid()
        and member.evaluator_key is not distinct from competition_invitations.evaluator_key
    );

  return claimed;
end;
$$;

create or replace function public.revoke_competition_member(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_competition_id uuid;
  competition_owner_id uuid;
begin
  select member.competition_id, competition.owner_id
  into target_competition_id, competition_owner_id
  from public.competition_members member
  join public.competitions competition on competition.id = member.competition_id
  where member.user_id = target_user_id
    and member.active
  limit 1;

  if target_competition_id is null then
    raise exception 'Evaluator not found';
  end if;

  if auth.uid() <> competition_owner_id then
    raise exception 'Only the primary administrator can revoke access';
  end if;

  if target_user_id = competition_owner_id then
    raise exception 'The primary administrator cannot be removed';
  end if;

  update public.competition_members
  set active = false,
      role = 'evaluator'
  where competition_id = target_competition_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.set_member_admin(
  target_user_id uuid,
  make_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_competition_id uuid;
  competition_owner_id uuid;
begin
  select member.competition_id, competition.owner_id
  into target_competition_id, competition_owner_id
  from public.competition_members member
  join public.competitions competition on competition.id = member.competition_id
  where member.user_id = target_user_id
    and member.active
  limit 1;

  if target_competition_id is null then
    raise exception 'Evaluator not found';
  end if;

  if auth.uid() <> competition_owner_id then
    raise exception 'Only the primary administrator can change administrator permissions';
  end if;

  if target_user_id = competition_owner_id then
    raise exception 'The primary administrator cannot be demoted';
  end if;

  if make_admin and exists (
    select 1
    from public.competition_members
    where competition_id = target_competition_id
      and role = 'admin'
      and user_id <> competition_owner_id
      and user_id <> target_user_id
      and active
  ) then
    raise exception 'Only one additional administrator is allowed';
  end if;

  update public.competition_members
  set role = case when make_admin then 'admin' else 'evaluator' end
  where competition_id = target_competition_id
    and user_id = target_user_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_members enable row level security;
alter table public.competition_invitations enable row level security;
alter table public.evaluator_states enable row level security;
alter table public.state_versions enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles for select
using (user_id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists competitions_select_members on public.competitions;
create policy competitions_select_members
on public.competitions for select
using (owner_id = auth.uid() or public.is_competition_member(id));

drop policy if exists competitions_insert_owner on public.competitions;
create policy competitions_insert_owner
on public.competitions for insert
with check (owner_id = auth.uid());

drop policy if exists competitions_update_admin on public.competitions;
create policy competitions_update_admin
on public.competitions for update
using (public.is_competition_admin(id))
with check (public.is_competition_admin(id));

drop policy if exists members_select_members on public.competition_members;
create policy members_select_members
on public.competition_members for select
using (public.is_competition_member(competition_id));

drop policy if exists members_insert_admin on public.competition_members;
create policy members_insert_admin
on public.competition_members for insert
with check (public.is_competition_admin(competition_id));

drop policy if exists members_update_admin on public.competition_members;
create policy members_update_admin
on public.competition_members for update
using (public.is_competition_admin(competition_id))
with check (public.is_competition_admin(competition_id));

drop policy if exists members_delete_admin on public.competition_members;
create policy members_delete_admin
on public.competition_members for delete
using (public.is_competition_admin(competition_id));

drop policy if exists invitations_select_admin on public.competition_invitations;
create policy invitations_select_admin
on public.competition_invitations for select
using (public.is_competition_admin(competition_id));

drop policy if exists invitations_insert_admin on public.competition_invitations;
create policy invitations_insert_admin
on public.competition_invitations for insert
with check (public.is_competition_admin(competition_id));

drop policy if exists invitations_update_admin on public.competition_invitations;
create policy invitations_update_admin
on public.competition_invitations for update
using (public.is_competition_admin(competition_id))
with check (public.is_competition_admin(competition_id));

drop policy if exists invitations_delete_admin on public.competition_invitations;
create policy invitations_delete_admin
on public.competition_invitations for delete
using (public.is_competition_admin(competition_id));

drop policy if exists evaluator_states_select_members on public.evaluator_states;
create policy evaluator_states_select_members
on public.evaluator_states for select
using (public.is_competition_member(competition_id));

drop policy if exists evaluator_states_insert_self on public.evaluator_states;
create policy evaluator_states_insert_self
on public.evaluator_states for insert
with check (
  public.is_competition_member(competition_id)
  and (
    user_id = auth.uid()
    or public.is_competition_admin(competition_id)
  )
);

drop policy if exists evaluator_states_update_self on public.evaluator_states;
create policy evaluator_states_update_self
on public.evaluator_states for update
using (
  public.is_competition_member(competition_id)
  and (
    user_id = auth.uid()
    or public.is_competition_admin(competition_id)
  )
)
with check (
  public.is_competition_member(competition_id)
  and (
    user_id = auth.uid()
    or public.is_competition_admin(competition_id)
  )
);

drop policy if exists versions_select_members on public.state_versions;
create policy versions_select_members
on public.state_versions for select
using (public.is_competition_member(competition_id));

drop policy if exists versions_insert_authorized on public.state_versions;
create policy versions_insert_authorized
on public.state_versions for insert
with check (
  user_id = auth.uid()
  and public.is_competition_member(competition_id)
  and (
    scope = 'evaluator'
    or (scope = 'shared' and public.is_competition_admin(competition_id))
  )
);

grant execute on function public.claim_competition_invitations() to authenticated;
grant execute on function public.revoke_competition_member(uuid) to authenticated;
grant execute on function public.set_member_admin(uuid, boolean) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'competitions'
  ) then
    alter publication supabase_realtime add table public.competitions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'evaluator_states'
  ) then
    alter publication supabase_realtime add table public.evaluator_states;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'competition_members'
  ) then
    alter publication supabase_realtime add table public.competition_members;
  end if;
end;
$$;
