create table if not exists public.postpilot_beta_feedback (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  category text not null check (category in ('usability','quality','bug','idea','other')),
  comment text not null check (char_length(comment) between 2 and 500),
  locale text not null check (locale in ('pt-BR','en')),
  viewport text not null check (viewport in ('mobile','tablet','desktop')),
  display_mode text not null check (display_mode in ('browser','standalone')),
  was_online boolean not null default true,
  app_version text not null default '',
  client_created_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.postpilot_beta_feedback enable row level security;

revoke all on table public.postpilot_beta_feedback from anon, authenticated;
