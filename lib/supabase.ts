import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Candidate = {
  id: string
  name: string
  email: string
  phone?: string
  role_applied: string
  experience_summary: string
  years_experience: number
  skills: string[]
  status: 'applied' | 'shortlisted' | 'voice_sent' | 'interview_booked' | 'hired' | 'rejected'
  job_title?: string
  job_salary?: string
  voice_note_url?: string
  interview_token?: string
  interview_scheduled_at?: string
  created_at: string
  updated_at: string
}

// Supabase SQL to run in your dashboard:
export const SCHEMA_SQL = `
create table candidates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  phone text,
  role_applied text not null,
  experience_summary text not null,
  years_experience integer default 0,
  skills text[] default '{}',
  status text default 'applied' check (status in ('applied','shortlisted','voice_sent','interview_booked','hired','rejected')),
  job_title text,
  job_salary text,
  voice_note_url text,
  interview_token text unique,
  interview_scheduled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger candidates_updated_at
before update on candidates
for each row execute function update_updated_at();
`
