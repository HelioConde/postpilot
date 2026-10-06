# Fullstack architecture

## Backend
Uses the shared Supabase project `pizzaria-db`.

Tables:
- `postpilot_projects`
- `postpilot_outputs`
- `postpilot_project_versions`
- `product_subscriptions`

Private Storage:
- `postpilot-media` with per-user folder RLS.

Edge Functions:
- `postpilot-beta-feedback`
- `postpilot-generate`
- `postpilot-transcribe`

All user-owned data is protected by RLS using `auth.uid()`.

## Production path
Supabase Auth, cloud project history and output persistence are already connected. The current MVP can generate one project for multiple target platforms (Instagram, TikTok and YouTube Shorts), stores one output snapshot per platform and tracks the workflow as draft/ready/published. The current production workflow also stores target audience and planned publish date, exposes a production dashboard, supports PT-BR/English and is prepared for ad monetization. Server-side AI generation and transcription Edge Functions are deployed behind JWT validation. Their provider secrets are the remaining activation dependency. Media ingestion, timestamp editing, clip editing, version history, calendar integration and assisted platform handoff are connected in the product. Paid quota enforcement is not a launch priority because the portfolio monetization default is advertising.

## QA gates
Authentication isolation, generation retries, empty transcript handling, long input limits, mobile layout and accessibility are mandatory before public launch. Browser E2E is the next QA layer after Static QA.


## AI generation contract

Edge Function: `postpilot-generate`.

Private backend configuration:
- `POSTPILOT_AI_API_URL`: OpenAI-compatible chat-completions endpoint.
- `POSTPILOT_AI_MODEL`: model identifier.
- `POSTPILOT_AI_API_KEY`: private provider credential.

The browser never receives these values. AI output is stored in `postpilot_projects.generation_data` with `generation_mode = 'ai'`. The migration and Edge Function are already deployed; without provider secrets the client falls back to local generation.


## Media pipeline

Authenticated media is uploaded to the private `postpilot-media` bucket using resumable TUS uploads. The current product cap remains 6 MB until the transcription provider's real limits are validated. Stored project metadata includes media path/name/type/size, timestamp segments, cut overrides and field-level content overrides.

`postpilot-transcribe` downloads only media from the authenticated user's own folder and returns transcript + timestamp segments when provider secrets are configured.

## Version history

`postpilot_project_versions` stores up to the latest 10 editorial snapshots per cloud project. RLS restricts SELECT/INSERT/DELETE to the owning user. Local mode keeps an equivalent bounded history inside the local project payload.

## Product QA

Static QA validates core source contracts. Browser E2E covers local creation, filters, analytics, exports, calendar modes, version restore, transcript editing, clip editing, regeneration and assisted publishing. Visual Snapshot captures full-page desktop/mobile PNGs and commits the latest visual state to the repository.


## Provider health and quotas

`postpilot-generate` and `postpilot-transcribe` expose an authenticated health action that only returns readiness/limits, never provider credentials.

Provider calls are guarded by:
- JWT verification;
- origin validation;
- authenticated user lookup;
- fixed hourly user quota;
- atomic database consumption via `public.postpilot_consume_usage`;
- private counter storage in `postpilot_private.postpilot_usage_limits`;
- provider timeouts (AI 30 s, transcription 120 s).

Initial quotas are 20 AI generations/hour and 10 transcriptions/hour per user. The quota RPC is executable only by `service_role`.

Media upload is decoupled from provider success. Once uploaded, media metadata can be retained and reused when transcription is temporarily unavailable, avoiding duplicate uploads and accidental deletion.
