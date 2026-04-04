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
  last_employer?: string
  status: 'applied' | 'shortlisted' | 'voice_sent' | 'interview_booked' | 'hired' | 'rejected'
  job_title?: string
  job_salary?: string
  voice_note_url?: string
  interview_token?: string
  interview_scheduled_at?: string
  created_at: string
  updated_at: string
}
