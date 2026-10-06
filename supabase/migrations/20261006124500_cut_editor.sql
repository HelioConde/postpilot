alter table public.postpilot_projects
  add column if not exists cut_overrides jsonb not null default '[]'::jsonb;

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_cut_overrides_size_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_cut_overrides_size_check
  check (
    jsonb_typeof(cut_overrides) = 'array'
    and octet_length(cut_overrides::text) <= 60000
  );
