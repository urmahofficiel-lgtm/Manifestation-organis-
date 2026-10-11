-- Déclaration complète, jour J (sécurité) et bilan.
-- Principe : l'identité des déclarants n'est visible que par eux-mêmes ; les organisateurs d'une manif
-- n'y accèdent que pour générer la lettre, et seulement pour les personnes qui se sont engagées comme déclarants.
-- Aucune donnée de participant n'est exposée au public.

-- 1. Identité du déclarant (une par compte, visible par soi uniquement)
create table if not exists manifestation.declarants (
  user_id uuid primary key references manifestation.profiles (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  address_line text not null default '' check (char_length(address_line) <= 200),
  postal_code text not null default '' check (postal_code ~ '^([0-9]{5})?$'),
  city text not null default '' check (char_length(city) <= 100),
  phone text not null default '' check (char_length(phone) <= 30),
  address_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 2. Organisateurs qui s'engagent comme déclarants pour une manif (consentement explicite)
create table if not exists manifestation.event_signatories (
  event_id uuid not null references manifestation.events (id) on delete cascade,
  user_id uuid not null references manifestation.profiles (id) on delete cascade,
  committed_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- 3. Itinéraire, horaires et consignes de la manif
alter table manifestation.events
  add column if not exists purpose text not null default '' check (char_length(purpose) <= 500),
  add column if not exists route jsonb not null default '[]'::jsonb check (jsonb_typeof(route) = 'array'),
  add column if not exists pois jsonb not null default '[]'::jsonb check (jsonb_typeof(pois) = 'array'),
  add column if not exists route_description text not null default '' check (char_length(route_description) <= 1000),
  add column if not exists departure_at timestamptz,
  add column if not exists dispersal_at timestamptz,
  add column if not exists dispersal_place text not null default '' check (char_length(dispersal_place) <= 200),
  add column if not exists municipalities text not null default '' check (char_length(municipalities) <= 300),
  add column if not exists safety_notes text not null default '' check (char_length(safety_notes) <= 2000);

-- 4. Suivi de la déclaration
alter table manifestation.declarations
  add column if not exists letter_generated_at timestamptz,
  add column if not exists banned boolean not null default false,
  add column if not exists ban_notes text not null default '';

-- 5. Rôles sur le terrain et présence le jour J
alter table manifestation.event_members
  add column if not exists field_role text
    check (field_role in ('responsable', 'service_ordre', 'secours', 'liaison', 'presse', 'juridique', 'logistique')),
  add column if not exists checked_in_at timestamptz;

-- 6. Contacts utiles (urgences, autorités, avocat…)
create table if not exists manifestation.event_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references manifestation.events (id) on delete cascade,
  kind text not null default 'autre' check (kind in ('autorites', 'juridique', 'secours', 'autre')),
  label text not null check (char_length(label) between 1 and 100),
  phone text not null default '' check (char_length(phone) <= 30),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);

-- 7. Alertes du jour J (tout membre peut signaler, les organisateurs traitent)
create table if not exists manifestation.alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references manifestation.events (id) on delete cascade,
  author_id uuid not null references manifestation.profiles (id) on delete cascade,
  level text not null default 'info' check (level in ('info', 'attention', 'urgence')),
  body text not null check (char_length(body) between 1 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists alerts_event_created_idx on manifestation.alerts (event_id, created_at);

-- 8. Chat réservé aux organisateurs : un canal par message
alter table manifestation.messages
  add column if not exists channel text not null default 'equipe' check (channel in ('equipe', 'orga'));

-- 9. Bilan après la manif
create table if not exists manifestation.debriefs (
  event_id uuid primary key references manifestation.events (id) on delete cascade,
  participants_estimate integer check (participants_estimate is null or participants_estimate >= 0),
  incidents text not null default '' check (char_length(incidents) <= 3000),
  press text not null default '' check (char_length(press) <= 2000),
  lessons text not null default '' check (char_length(lessons) <= 3000),
  updated_at timestamptz not null default now()
);

-- Fonctions
create or replace function manifestation.get_declaration_identities(ev uuid)
returns table (
  user_id uuid, first_name text, last_name text, address_line text, postal_code text, city text,
  phone text, address_verified boolean
)
language plpgsql
stable
security definer
set search_path = manifestation
as $$
begin
  if not manifestation.is_event_editor(ev) then
    raise exception 'Réservé aux organisateurs de la manif';
  end if;
  return query
    select d.user_id, d.first_name, d.last_name, d.address_line, d.postal_code, d.city, d.phone, d.address_verified
    from manifestation.event_signatories s
    join manifestation.declarants d on d.user_id = s.user_id
    where s.event_id = ev
    order by s.committed_at;
end;
$$;

create or replace function manifestation.check_in(ev uuid, present boolean)
returns void
language sql
security definer
set search_path = manifestation
as $$
  update manifestation.event_members
  set checked_in_at = case when present then now() else null end
  where event_id = ev and user_id = auth.uid();
$$;

-- Page publique : ajoute horaires, parcours, repères et consignes de sécurité
drop function if exists manifestation.get_public_event(uuid);
create function manifestation.get_public_event(ev uuid)
returns table (
  id uuid, title text, description text, theme text, starts_at timestamptz, ends_at timestamptz,
  place_name text, address text, lat double precision, lng double precision,
  organizer_name text, expected_count integer,
  purpose text, route jsonb, pois jsonb, route_description text,
  departure_at timestamptz, dispersal_at timestamptz, dispersal_place text, safety_notes text
)
language sql stable security definer set search_path = manifestation as $$
  select e.id, e.title, e.description, e.theme, e.starts_at, e.ends_at, e.place_name, e.address,
         e.lat, e.lng, e.organizer_name, e.expected_count,
         e.purpose, e.route, e.pois, e.route_description,
         e.departure_at, e.dispersal_at, e.dispersal_place, e.safety_notes
  from manifestation.events e
  where e.id = ev and e.is_public;
$$;

-- Droits d'accès (RLS)
alter table manifestation.declarants enable row level security;
alter table manifestation.event_signatories enable row level security;
alter table manifestation.event_contacts enable row level security;
alter table manifestation.alerts enable row level security;
alter table manifestation.debriefs enable row level security;

create policy "declarants_self" on manifestation.declarants
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "signatories_read" on manifestation.event_signatories
  for select to authenticated using (manifestation.is_event_member(event_id));
create policy "signatories_commit_self" on manifestation.event_signatories
  for insert to authenticated with check (user_id = auth.uid() and manifestation.is_event_editor(event_id));
create policy "signatories_withdraw" on manifestation.event_signatories
  for delete to authenticated using (user_id = auth.uid() or manifestation.is_event_editor(event_id));

create policy "contacts_read" on manifestation.event_contacts
  for select to authenticated using (manifestation.is_event_member(event_id));
create policy "contacts_write" on manifestation.event_contacts
  for all to authenticated using (manifestation.is_event_editor(event_id)) with check (manifestation.is_event_editor(event_id));

create policy "alerts_read" on manifestation.alerts
  for select to authenticated using (manifestation.is_event_member(event_id));
create policy "alerts_insert" on manifestation.alerts
  for insert to authenticated with check (manifestation.is_event_member(event_id) and author_id = auth.uid());
create policy "alerts_update" on manifestation.alerts
  for update to authenticated
  using (manifestation.is_event_editor(event_id) or author_id = auth.uid())
  with check (manifestation.is_event_editor(event_id) or author_id = auth.uid());
create policy "alerts_delete" on manifestation.alerts
  for delete to authenticated using (manifestation.is_event_editor(event_id));

create policy "debriefs_read" on manifestation.debriefs
  for select to authenticated using (manifestation.is_event_member(event_id));
create policy "debriefs_write" on manifestation.debriefs
  for all to authenticated using (manifestation.is_event_editor(event_id)) with check (manifestation.is_event_editor(event_id));

-- Canal organisateurs : invisible pour les simples membres
drop policy if exists "messages_read" on manifestation.messages;
drop policy if exists "messages_insert" on manifestation.messages;
create policy "messages_read" on manifestation.messages
  for select to authenticated using (
    manifestation.is_event_member(event_id) and (channel = 'equipe' or manifestation.is_event_editor(event_id))
  );
create policy "messages_insert" on manifestation.messages
  for insert to authenticated with check (
    manifestation.is_event_member(event_id) and author_id = auth.uid()
    and (channel = 'equipe' or manifestation.is_event_editor(event_id))
  );

-- Droits des rôles
grant select, insert, update, delete on manifestation.declarants, manifestation.event_signatories,
  manifestation.event_contacts, manifestation.alerts, manifestation.debriefs to authenticated;
revoke execute on all functions in schema manifestation from public;
grant execute on all functions in schema manifestation to authenticated;
grant execute on function manifestation.get_public_event(uuid), manifestation.get_public_slogans(uuid) to anon;
