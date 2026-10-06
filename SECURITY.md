# Security Policy

## Supported version

PostPilot is currently maintained from the `main` branch. Security fixes are applied to the current deployed version rather than backported to older snapshots.

## Reporting a vulnerability

Please do not publish credentials, tokens, user data, private media paths, Supabase service-role keys, provider API keys, or reproducible account-takeover details in a public issue.

Preferred reporting order:

1. Use GitHub private vulnerability reporting / Security Advisories for this repository when available.
2. If private reporting is unavailable, use the PostPilot contact page to request a private channel without including exploit details or secrets in the initial message.

Include:
- affected page or feature;
- reproduction steps;
- expected vs. actual behavior;
- impact;
- browser/device when relevant.

## Secrets

Only public/publishable browser credentials may exist in frontend source. Private provider credentials must remain in Supabase Edge Function secrets.

Never commit:
- `SUPABASE_SERVICE_ROLE_KEY`;
- OpenAI-compatible provider keys;
- transcription-provider keys;
- session tokens;
- user exports containing private transcripts or media.

## Automated security gates

The repository uses:
- CodeQL for JavaScript security analysis;
- Dependabot for npm and GitHub Actions updates;
- Static QA contracts;
- Browser E2E + axe-core;
- Lighthouse QA;
- RLS and private Storage policies in Supabase.
