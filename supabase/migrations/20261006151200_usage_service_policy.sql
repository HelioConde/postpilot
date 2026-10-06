drop policy if exists "postpilot usage service only" on postpilot_private.postpilot_usage_limits;
create policy "postpilot usage service only"
on postpilot_private.postpilot_usage_limits
for all
to service_role
using (true)
with check (true);
