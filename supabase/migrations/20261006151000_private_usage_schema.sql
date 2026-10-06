create schema if not exists postpilot_private;

alter table if exists public.postpilot_usage_limits
  set schema postpilot_private;

revoke all on schema postpilot_private from public, anon, authenticated;
revoke all on all tables in schema postpilot_private from public, anon, authenticated;

create or replace function public.postpilot_consume_usage(
  p_user_id uuid,
  p_feature text,
  p_limit integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, postpilot_private
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if p_feature not in ('ai_generation','transcription') then
    raise exception 'invalid feature';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid limit';
  end if;

  insert into postpilot_private.postpilot_usage_limits(user_id, feature, window_start, request_count, updated_at)
  values (p_user_id, p_feature, v_window, 1, now())
  on conflict (user_id, feature, window_start)
  do update set
    request_count = postpilot_private.postpilot_usage_limits.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  return query
  select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_window + interval '1 hour';
end;
$$;

revoke all on function public.postpilot_consume_usage(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.postpilot_consume_usage(uuid,text,integer) to service_role;
