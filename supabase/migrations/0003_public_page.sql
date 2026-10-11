-- Page publique d'un événement (à partager), activable par les organisateurs.
-- Le public (non connecté) ne lit jamais les tables directement : seulement deux fonctions
-- qui renvoient les informations d'un événement rendu public et ses slogans validés.

alter table manifestation.events
  add column if not exists is_public boolean not null default false;

create or replace function manifestation.get_public_event(ev uuid)
returns table (
  id uuid,
  title text,
  description text,
  theme text,
  starts_at timestamptz,
  ends_at timestamptz,
  place_name text,
  address text,
  lat double precision,
  lng double precision,
  organizer_name text,
  expected_count integer
)
language sql
stable
security definer
set search_path = manifestation
as $$
  select e.id, e.title, e.description, e.theme, e.starts_at, e.ends_at, e.place_name, e.address,
         e.lat, e.lng, e.organizer_name, e.expected_count
  from manifestation.events e
  where e.id = ev and e.is_public;
$$;

create or replace function manifestation.get_public_slogans(ev uuid)
returns table (text text)
language sql
stable
security definer
set search_path = manifestation
as $$
  select s.text
  from manifestation.slogans s
  join manifestation.events e on e.id = s.event_id
  where s.event_id = ev and e.is_public and s.status = 'valide'
  order by s.created_at;
$$;

-- Par défaut, PostgreSQL autorise tout le monde à exécuter les fonctions : on restreint.
revoke execute on all functions in schema manifestation from public;
grant execute on all functions in schema manifestation to authenticated;

-- Le public (rôle anon) peut seulement appeler les deux fonctions de la page publique.
grant usage on schema manifestation to anon;
grant execute on function manifestation.get_public_event(uuid), manifestation.get_public_slogans(uuid) to anon;
