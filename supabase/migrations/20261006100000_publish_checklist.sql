alter table public.postpilot_projects
  add column if not exists publish_checklist jsonb not null default '{}'::jsonb;

alter table public.postpilot_projects
  drop constraint if exists postpilot_projects_publish_checklist_check;

alter table public.postpilot_projects
  add constraint postpilot_projects_publish_checklist_check
  check (
    jsonb_typeof(publish_checklist) = 'object'
    and (publish_checklist - 'Instagram' - 'TikTok' - 'YouTube Shorts') = '{}'::jsonb
  );
