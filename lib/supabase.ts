import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'voicereach-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Candidate = {
  id: string
  name: string
  email: string
  phone: string
  role_applied: string
  experience_summary: string
  years_experience: number
  skills: string[]
  status: string
  job_title: string
  job_salary: string
  voice_note_url: string | null
  interview_token: string | null
  interview_scheduled_at: string | null
  created_at: string
  updated_at: string
}
