-- Schéma initial : profils, événements, membres, tâches, matériel, annonces, démarches.
-- Toutes les tables d'événement sont protégées par RLS : un utilisateur ne voit
-- que les événements dont il est membre.

-- Profils (lié à auth.users, créé automatiquement à l'inscription)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Événements (manifestations, rassemblements)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  theme text not null default 'autre',
  status text not null default 'brouillon'
    check (status in ('brouillon', 'a_declarer', 'declare', 'confirme', 'termine')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  place_name text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  expected_count integer check (expected_count is null or expected_count >= 0),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

-- Membres d'un événement et leur rôle
create table if not exists public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'organizer', 'member')),
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Tâches
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  done boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Matériel (banderoles, sono, gilets, eau…)
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity integer not null default 1 check (quantity >= 0),
  holder_id uuid references public.profiles (id) on delete set null,
  location text not null default '',
  created_at timestamptz not null default now()
);

-- Annonces internes à l'équipe
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Démarches administratives (une par événement)
create table if not exists public.declarations (
  event_id uuid primary key references public.events (id) on delete cascade,
  authority text not null default '',
  submitted_at timestamptz,
  reference text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

-- Fonctions d'aide pour les règles d'accès
create or replace function public.is_event_member(ev uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = ev and user_id = auth.uid()
  );
$$;

create or replace function public.is_event_editor(ev uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = ev and user_id = auth.uid() and role in ('owner', 'organizer')
  );
$$;

-- Le créateur devient automatiquement propriétaire de l'événement
create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_members (event_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_event_created on public.events;
create trigger on_event_created
  after insert on public.events
  for each row execute function public.add_creator_as_owner();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.touch_updated_at();

-- Ajouter un membre par e-mail (uniquement par un organisateur ou propriétaire)
create or replace function public.add_member_by_email(ev uuid, member_email text, member_role text default 'member')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if not public.is_event_editor(ev) then
    raise exception 'Seuls les organisateurs peuvent ajouter des membres';
  end if;
  if member_role not in ('organizer', 'member') then
    raise exception 'Rôle invalide';
  end if;
  select id into target from public.profiles where lower(email) = lower(member_email);
  if target is null then
    raise exception 'Aucun compte trouvé pour cet e-mail. La personne doit d''abord créer un compte.';
  end if;
  insert into public.event_members (event_id, user_id, role)
  values (ev, target, member_role)
  on conflict (event_id, user_id) do update set role = excluded.role;
end;
$$;

-- Droits d'accès (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.tasks enable row level security;
alter table public.materials enable row level security;
alter table public.announcements enable row level security;
alter table public.declarations enable row level security;

-- Profils : on voit son propre profil et ceux des personnes qui partagent un événement
-- (les e-mails ne sont donc pas visibles par tous les comptes), modification de son propre profil
create policy "profiles_read_self_and_teammates" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or exists (
      select 1
      from public.event_members me
      join public.event_members other on other.event_id = me.event_id
      where me.user_id = auth.uid() and other.user_id = public.profiles.id
    )
  );
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Événements
create policy "events_read_members" on public.events
  for select to authenticated using (public.is_event_member(id));
create policy "events_insert_self" on public.events
  for insert to authenticated with check (created_by = auth.uid());
create policy "events_update_editors" on public.events
  for update to authenticated using (public.is_event_editor(id)) with check (public.is_event_editor(id));
create policy "events_delete_owner" on public.events
  for delete to authenticated using (
    exists (select 1 from public.event_members
            where event_id = id and user_id = auth.uid() and role = 'owner')
  );

-- Membres
create policy "members_read" on public.event_members
  for select to authenticated using (public.is_event_member(event_id));
create policy "members_editors_manage" on public.event_members
  for update to authenticated using (public.is_event_editor(event_id)) with check (public.is_event_editor(event_id));
create policy "members_editors_remove_or_self_leave" on public.event_members
  for delete to authenticated using (public.is_event_editor(event_id) or user_id = auth.uid());

-- Tâches, matériel, annonces : tous les membres lisent et écrivent,
-- la suppression est réservée aux organisateurs.
create policy "tasks_read" on public.tasks
  for select to authenticated using (public.is_event_member(event_id));
create policy "tasks_write" on public.tasks
  for insert to authenticated with check (public.is_event_member(event_id) and created_by = auth.uid());
create policy "tasks_update" on public.tasks
  for update to authenticated using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));
create policy "tasks_delete" on public.tasks
  for delete to authenticated using (public.is_event_editor(event_id));

create policy "materials_read" on public.materials
  for select to authenticated using (public.is_event_member(event_id));
create policy "materials_insert" on public.materials
  for insert to authenticated with check (public.is_event_member(event_id));
create policy "materials_update" on public.materials
  for update to authenticated using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));
create policy "materials_delete" on public.materials
  for delete to authenticated using (public.is_event_editor(event_id));

create policy "announcements_read" on public.announcements
  for select to authenticated using (public.is_event_member(event_id));
create policy "announcements_insert" on public.announcements
  for insert to authenticated with check (public.is_event_member(event_id) and author_id = auth.uid());
create policy "announcements_delete" on public.announcements
  for delete to authenticated using (public.is_event_editor(event_id) or author_id = auth.uid());

-- Démarches : lecture pour les membres, écriture pour les organisateurs
create policy "declarations_read" on public.declarations
  for select to authenticated using (public.is_event_member(event_id));
create policy "declarations_write" on public.declarations
  for all to authenticated using (public.is_event_editor(event_id)) with check (public.is_event_editor(event_id));
