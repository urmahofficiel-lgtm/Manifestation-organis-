-- Dossier de déclaration : PDF archivés, récépissés, destinataire officiel et suivi de l'envoi.
-- Les fichiers sont dans un espace de stockage privé ; seuls les organisateurs de la manif y accèdent
-- (la lettre contient l'identité et l'adresse des déclarants).

alter table manifestation.declarations
  add column if not exists authority_email text not null default '' check (char_length(authority_email) <= 200),
  add column if not exists authority_details jsonb not null default '{}'::jsonb,
  add column if not exists sent_at timestamptz,
  add column if not exists sent_via text check (sent_via in ('email', 'formulaire', 'main', 'courrier'));

create table if not exists manifestation.declaration_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references manifestation.events (id) on delete cascade,
  kind text not null check (kind in ('lettre', 'recepisse', 'autre')),
  path text not null unique check (char_length(path) <= 300),
  file_name text not null default '' check (char_length(file_name) <= 200),
  created_by uuid not null references manifestation.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table manifestation.declaration_documents enable row level security;

create policy "documents_editors_read" on manifestation.declaration_documents
  for select to authenticated using (manifestation.is_event_editor(event_id));
create policy "documents_editors_insert" on manifestation.declaration_documents
  for insert to authenticated with check (manifestation.is_event_editor(event_id) and created_by = auth.uid());
create policy "documents_editors_delete" on manifestation.declaration_documents
  for delete to authenticated using (manifestation.is_event_editor(event_id));

grant select, insert, delete on manifestation.declaration_documents to authenticated;

-- Conversion sans erreur d'un nom de dossier en identifiant d'événement
create or replace function manifestation.safe_uuid(t text)
returns uuid
language plpgsql
immutable
as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

-- Espace de stockage privé (10 Mo par fichier, PDF et photos uniquement)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manifestation-declarations', 'manifestation-declarations', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Chemin des fichiers : <identifiant de la manif>/<nom du fichier>
create policy "manif_declarations_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'manifestation-declarations'
         and manifestation.is_event_editor(manifestation.safe_uuid((storage.foldername(name))[1])));
create policy "manif_declarations_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'manifestation-declarations'
              and manifestation.is_event_editor(manifestation.safe_uuid((storage.foldername(name))[1])));
create policy "manif_declarations_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'manifestation-declarations'
         and manifestation.is_event_editor(manifestation.safe_uuid((storage.foldername(name))[1])));

revoke execute on all functions in schema manifestation from public;
grant execute on all functions in schema manifestation to authenticated;
grant execute on function manifestation.get_public_event(uuid), manifestation.get_public_slogans(uuid) to anon;
