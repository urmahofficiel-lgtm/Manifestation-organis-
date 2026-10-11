-- Fonctions ajoutées : type de compte, slogans, discussion d'équipe, invitations par lien.
-- Tout reste dans le schéma « manifestation » (projet partagé avec d'autres applications).

-- Type de compte et organisation (association, syndicat, collectif, citoyen)
alter table manifestation.profiles
  add column if not exists account_type text not null default 'individu'
    check (account_type in ('individu', 'association', 'syndicat', 'collectif')),
  add column if not exists organization_name text not null default '';

-- Nom de l'organisateur affiché sur l'événement
alter table manifestation.events
  add column if not exists organizer_name text not null default '';

-- Slogans proposés et validés par l'équipe
create table if not exists manifestation.slogans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references manifestation.events (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 140),
  author_id uuid not null references manifestation.profiles (id) on delete cascade,
  status text not null default 'propose' check (status in ('propose', 'valide')),
  created_at timestamptz not null default now()
);

-- Discussion de l'équipe (un fil par événement)
create table if not exists manifestation.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references manifestation.events (id) on delete cascade,
  author_id uuid not null references manifestation.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_event_created_idx on manifestation.messages (event_id, created_at);

-- Invitations par lien
create table if not exists manifestation.invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references manifestation.events (id) on delete cascade,
  code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  role text not null default 'member' check (role in ('organizer', 'member')),
  created_by uuid not null references manifestation.profiles (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 days'),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Aperçu d'une invitation (titre et date de l'événement) avant de la rejoindre
create or replace function manifestation.preview_invite(invite_code text)
returns table (event_title text, starts_at timestamptz, organizer_name text)
language sql
stable
security definer
set search_path = manifestation
as $$
  select e.title, e.starts_at, e.organizer_name
  from manifestation.invites i
  join manifestation.events e on e.id = i.event_id
  where i.code = invite_code
    and not i.revoked
    and i.expires_at > now()
    and (i.max_uses is null or i.uses < i.max_uses);
$$;

-- Rejoindre un événement avec un code d'invitation (retourne l'identifiant de l'événement)
create or replace function manifestation.join_event_by_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = manifestation
as $$
declare
  inv manifestation.invites;
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Connexion requise';
  end if;
  if not exists (select 1 from manifestation.profiles where id = me) then
    raise exception 'Profil introuvable : reconnectez-vous puis réessayez';
  end if;

  select * into inv from manifestation.invites
  where code = invite_code
    and not revoked
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation invalide ou expirée';
  end if;

  -- Déjà membre : on renvoie simplement vers l'événement, sans rien modifier (jamais de rétrogradation)
  if exists (select 1 from manifestation.event_members where event_id = inv.event_id and user_id = me) then
    return inv.event_id;
  end if;

  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    raise exception 'Cette invitation a déjà été utilisée';
  end if;

  insert into manifestation.event_members (event_id, user_id, role) values (inv.event_id, me, inv.role);
  update manifestation.invites set uses = uses + 1 where id = inv.id;

  return inv.event_id;
end;
$$;

-- Droits d'accès (RLS)
alter table manifestation.slogans enable row level security;
alter table manifestation.messages enable row level security;
alter table manifestation.invites enable row level security;

create policy "slogans_read" on manifestation.slogans
  for select to authenticated using (manifestation.is_event_member(event_id));
create policy "slogans_insert" on manifestation.slogans
  for insert to authenticated with check (
    manifestation.is_event_member(event_id) and author_id = auth.uid()
    and (status = 'propose' or manifestation.is_event_editor(event_id))
  );
create policy "slogans_update_editors" on manifestation.slogans
  for update to authenticated using (manifestation.is_event_editor(event_id)) with check (manifestation.is_event_editor(event_id));
create policy "slogans_delete" on manifestation.slogans
  for delete to authenticated using (manifestation.is_event_editor(event_id) or author_id = auth.uid());

create policy "messages_read" on manifestation.messages
  for select to authenticated using (manifestation.is_event_member(event_id));
create policy "messages_insert" on manifestation.messages
  for insert to authenticated with check (manifestation.is_event_member(event_id) and author_id = auth.uid());
create policy "messages_delete" on manifestation.messages
  for delete to authenticated using (manifestation.is_event_editor(event_id) or author_id = auth.uid());

create policy "invites_read_editors" on manifestation.invites
  for select to authenticated using (manifestation.is_event_editor(event_id));
create policy "invites_insert_editors" on manifestation.invites
  for insert to authenticated with check (manifestation.is_event_editor(event_id) and created_by = auth.uid());
create policy "invites_update_editors" on manifestation.invites
  for update to authenticated using (manifestation.is_event_editor(event_id)) with check (manifestation.is_event_editor(event_id));
create policy "invites_delete_editors" on manifestation.invites
  for delete to authenticated using (manifestation.is_event_editor(event_id));

-- Droits du rôle connecté
grant select, insert, update, delete on manifestation.slogans, manifestation.messages, manifestation.invites to authenticated;
grant execute on function manifestation.preview_invite(text), manifestation.join_event_by_code(text) to authenticated;
