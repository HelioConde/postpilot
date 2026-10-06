insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'postpilot-media',
  'postpilot-media',
  false,
  6291456,
  array['audio/mpeg','audio/mp4','audio/wav','audio/webm','video/mp4','video/webm','video/quicktime']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "postpilot media insert own folder" on storage.objects;
create policy "postpilot media insert own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'postpilot-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "postpilot media select own folder" on storage.objects;
create policy "postpilot media select own folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'postpilot-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "postpilot media delete own folder" on storage.objects;
create policy "postpilot media delete own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'postpilot-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

alter table public.postpilot_projects
  add column if not exists media_path text,
  add column if not exists media_name text,
  add column if not exists media_type text,
  add column if not exists media_size_bytes bigint,
  add column if not exists transcription_segments jsonb not null default '[]'::jsonb;

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_media_size_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_media_size_check
  check (media_size_bytes is null or (media_size_bytes >= 0 and media_size_bytes <= 6291456));

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_media_type_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_media_type_check
  check (
    media_type is null
    or media_type in ('audio/mpeg','audio/mp4','audio/wav','audio/webm','video/mp4','video/webm','video/quicktime')
  );

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_transcription_segments_size_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_transcription_segments_size_check
  check (octet_length(transcription_segments::text) <= 120000);
