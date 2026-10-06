alter table public.postpilot_projects
  add column if not exists content_overrides jsonb not null default '{}'::jsonb;

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_content_overrides_size_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_content_overrides_size_check
  check (
    jsonb_typeof(content_overrides) = 'object'
    and octet_length(content_overrides::text) <= 80000
  );
