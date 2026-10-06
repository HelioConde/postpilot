create or replace function public.postpilot_usage_status(
  p_user_id uuid,
  p_feature text,
  p_limit integer
)
returns table (
  remaining integer,
  reset_at timestamptz
)
language sql
security definer
set search_path = public, postpilot_private
as $$
  with current_window as (
    select request_count
    from postpilot_private.postpilot_usage_limits
    where user_id = p_user_id
      and feature = p_feature
      and window_start = date_trunc('hour', now())
    limit 1
  )
  select
    greatest(p_limit - coalesce((select request_count from current_window), 0), 0),
    date_trunc('hour', now()) + interval '1 hour';
$$;

revoke all on function public.postpilot_usage_status(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.postpilot_usage_status(uuid,text,integer) to service_role;
