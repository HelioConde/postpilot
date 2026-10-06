# Fullstack architecture

## Backend
Uses the shared Supabase project `pizzaria-db`.

Tables:
- `postpilot_projects`
- `postpilot_outputs`
- `product_subscriptions`

All user-owned data is protected by RLS using `auth.uid()`.

## Production path
1. Add Supabase Auth to the current prototype.
2. Replace localStorage project history with `postpilot_projects`.
3. Persist generated deliverables in `postpilot_outputs`.
4. Add server-side/Edge Function generation for AI tasks so provider secrets never reach the browser.
5. Add quota enforcement through `product_subscriptions`.

## QA gates
Authentication isolation, generation retries, empty transcript handling, long input limits, mobile layout and accessibility are mandatory before public launch.
