# VoiceReach — Setup & Deployment Guide

## What this does
When a recruiter moves a candidate to "shortlisted", the platform automatically:
1. Generates a personalized voice note using ElevenLabs (referencing their CV/experience)
2. Attaches the audio file to an email (keeping it under 2mb)
3. Generates a 24-hour interview link
4. Attaches a .ics calendar invite
5. Sends everything via Resend
6. Tracks when the candidate clicks the interview link

---

## Step 1 — Supabase setup

1. Go to https://supabase.com and create a new project
2. Go to **SQL Editor** and run the SQL in `lib/supabase.ts` (the SCHEMA_SQL string)
3. Copy your **Project URL** and **anon key** from Settings → API

---

## Step 2 — ElevenLabs setup

1. Log in to https://elevenlabs.io
2. Go to Profile → API Keys and copy your key
3. Go to **Voices** and pick a voice — copy its Voice ID

---

## Step 3 — Resend setup

1. Sign up at https://resend.com (free tier is fine for MVP)
2. Add and verify your sending domain
3. Create an API key

---

## Step 4 — Cal.com setup

1. Sign up at https://cal.com
2. Create an event type for your interviews (e.g. "30 min interview")
3. Copy your username and event type ID from the URL

---

## Step 5 — Deploy to Vercel

1. Push this code to a GitHub repo
2. Go to https://vercel.com → New Project → import your repo
3. Add these environment variables in Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CALCOM_API_KEY=
CALCOM_EVENT_TYPE_ID=
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
INTERVIEW_LINK_EXPIRY_HOURS=24
```

4. Deploy — Vercel builds and hosts automatically

---

## Testing checklist

- [ ] Add a test candidate
- [ ] Move them to shortlisted
- [ ] Check voice note generates and email arrives
- [ ] **Verify audio attachment is under 2mb** ← important for spam filters
- [ ] Click interview link — confirm it works and status updates
- [ ] Open .ics file — confirm calendar invite looks correct
- [ ] Test with a real email client (Gmail, Outlook)

---

## Customising the voice script

Edit `lib/voice.ts` → `buildScript()` to change what the voice note says.
Use `{candidate.name}`, `{candidate.job_title}`, `{candidate.job_salary}` etc.

## Changing the voice

In ElevenLabs, copy any Voice ID and update `ELEVENLABS_VOICE_ID` in Vercel env vars.

---

## Future features (phase 2)
- Social media plugins (LinkedIn, Facebook)
- Multi-campaign support
- SMS delivery option
- Analytics dashboard
- Bulk shortlisting
