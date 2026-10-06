alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_status_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_status_check
  check (status in ('draft', 'ready', 'published'));

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_platforms_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_platforms_check
  check (
    cardinality(platforms) between 1 and 3
    and platforms <@ array['Instagram','TikTok','YouTube Shorts']::text[]
  );
