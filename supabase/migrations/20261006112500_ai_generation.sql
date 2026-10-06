alter table public.postpilot_projects
  add column if not exists generation_mode text not null default 'local',
  add column if not exists generation_data jsonb not null default '{}'::jsonb;

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_generation_mode_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_generation_mode_check
  check (generation_mode in ('local', 'ai'));

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_generation_data_size_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_generation_data_size_check
  check (octet_length(generation_data::text) <= 60000);
