# Fullstack architecture

## Backend
Uses the shared Supabase project `pizzaria-db`.

Tables:
- `postpilot_projects`
- `postpilot_outputs`
- `product_subscriptions`

All user-owned data is protected by RLS using `auth.uid()`.

## Production path
Supabase Auth, cloud project history and output persistence are already connected. The current MVP can generate one project for multiple target platforms (Instagram, TikTok and YouTube Shorts), stores one output snapshot per platform and tracks the workflow as draft/ready/published. The next production steps are server-side AI generation, transcription/video ingestion, quota enforcement through `product_subscriptions` and richer export formats.

## QA gates
Authentication isolation, generation retries, empty transcript handling, long input limits, mobile layout and accessibility are mandatory before public launch.
