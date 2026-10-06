create table if not exists public.postpilot_usage_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('ai_generation','transcription')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, window_start)
);

create index if not exists postpilot_usage_limits_updated_idx
  on public.postpilot_usage_limits(updated_at);

alter table public.postpilot_usage_limits enable row level security;

revoke all on public.postpilot_usage_limits from anon, authenticated;
grant all on public.postpilot_usage_limits to service_role;
