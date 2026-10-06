alter table public.postpilot_projects
  add column if not exists audience text not null default '',
  add column if not exists publish_at date;

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_audience_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_audience_check
  check (char_length(audience) <= 120);

create index if not exists postpilot_projects_user_publish_at_idx
  on public.postpilot_projects(user_id, publish_at)
  where publish_at is not null;
