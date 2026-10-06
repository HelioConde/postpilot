# Fullstack architecture

## Backend
Uses the shared Supabase project `pizzaria-db`.

Tables:
- `postpilot_projects`
- `postpilot_outputs`
- `product_subscriptions`

All user-owned data is protected by RLS using `auth.uid()`.

## Production path
Supabase Auth, cloud project history and output persistence are already connected. The current MVP can generate one project for multiple target platforms (Instagram, TikTok and YouTube Shorts), stores one output snapshot per platform and tracks the workflow as draft/ready/published. The current production workflow also stores target audience and planned publish date, exposes a production dashboard, supports PT-BR/English and is prepared for ad monetization. Server-side AI generation is implemented in the repository behind an authenticated Edge Function with local fallback; deployment and provider secrets still need production activation. The next production steps are transcription/video ingestion and calendar/platform integrations. Paid quota enforcement is not a launch priority because the portfolio monetization default is advertising.

## QA gates
Authentication isolation, generation retries, empty transcript handling, long input limits, mobile layout and accessibility are mandatory before public launch. Browser E2E is the next QA layer after Static QA.


## AI generation contract

Edge Function: `postpilot-generate`.

Private backend configuration:
- `POSTPILOT_AI_API_URL`: OpenAI-compatible chat-completions endpoint.
- `POSTPILOT_AI_MODEL`: model identifier.
- `POSTPILOT_AI_API_KEY`: private provider credential.

The browser never receives these values. AI output is stored in `postpilot_projects.generation_data` with `generation_mode = 'ai'`. Until the migration is applied, cloud saves retry without the new columns so existing production flows remain compatible.
