-- PostPilot: an output must belong to a project owned by the same authenticated user.
-- Applies to SELECT/DELETE via USING and INSERT/UPDATE via WITH CHECK.
-- Prevents attaching an owned output to another user's project.
alter policy postpilot_outputs_owner_all
on public.postpilot_outputs
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.postpilot_projects as project
    where project.id = postpilot_outputs.project_id
      and project.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.postpilot_projects as project
    where project.id = postpilot_outputs.project_id
      and project.user_id = (select auth.uid())
  )
);
