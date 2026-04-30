## Scrapper background jobs (local + Vercel)

### Why this exists

Vercel serverless functions can time out and do not reliably keep running after the user leaves a page.
This implementation solves that by:

- persisting job state in `public.scrapper_jobs`
- running work in small chunks via Upstash **QStash** (re-enqueue per page)
- uploading the final `.xlsx` to Supabase Storage and serving it via signed URL

### Required env vars

RapidAPI:
- `RAPIDAPI_KEY`
- `GOOGLE_SEARCH_HOST` (optional)
- `GOOGLE_SEARCH_URL` (optional)

Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

QStash:
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- `QSTASH_URL` (important for multi-region)
  - EU: `https://qstash-eu-central-1.upstash.io` (or `https://qstash.upstash.io`)
  - US: `https://qstash-us-east-1.upstash.io`
- `QSTASH_BASE_URL` (recommended): your public app URL

### Supabase setup

1. Apply migration: `supabase/migrations/20260430193000_create_scrapper_jobs.sql`
2. Create a Storage bucket: `scrapper-results` (private recommended)

### Local testing note

QStash is a cloud service and **cannot call `http://localhost:3000`**.
To test end-to-end locally, expose your dev server with a tunnel (ngrok/cloudflared)
and set `QSTASH_BASE_URL` to that public HTTPS URL.

