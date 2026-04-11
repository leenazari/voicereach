import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, phone, jobId } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' })
  if (!jobId) return res.status(400).json({ error: 'Job ID required' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, salary, user_id, status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) return res.status(404).json({ error: 'Job not found' })
    if (job.status === 'closed') return res.status(400).json({ error: 'Job is closed' })

    const { data: existing } = await supabase
      .from('candidates')
      .select('id, interview_token, interview_completed_at')
      .eq('user_id', job.user_id)
      .eq('email', email)
      .eq('job_id', jobId)
      .single()

    if (existing) {
      if (existing.interview_completed_at) {
        await supabase
          .from('candidates')
          .update({
            interview_completed_at: null,
            interview_transcript: null,
            interview_score: null,
            interview_answers: null,
            interview_recommendation: null
          })
          .eq('id', existing.id)
      }
      return res.status(200).json({ token: existing.interview_token, existing: true })
    }

    const token = generateToken()

    const { data: candidate, error: insertError } = await supabase
      .from('candidates')
      .insert({
        user_id: job.user_id,
        name: name,
        email: email,
        phone: phone || null,
        role_applied: job.title || 'Interview Applicant',
        job_title: job.title || '',
        job_salary: job.salary || null,
        job_id: jobId,
        status: 'voice_sent',
        interview_token: token,
        experience_summary: 'Applied via interview link',
        candidate_summary: '',
        years_experience: 0,
        skills: [],
        strength_keywords: [],
        all_employers: [],
        qualifications: [],
      })
      .select()
      .single()

    if (insertError || !candidate) {
      console.error('Insert error:', JSON.stringify(insertError))
      return res.status(500).json({ error: insertError?.message || 'Could not create candidate record' })
    }

    await supabase
      .from('job_candidates')
      .upsert({
        job_id: jobId,
        candidate_id: candidate.id,
        match_score: 0,
        keyword_matches: [],
        status: 'voice_sent',
        updated_at: new Date().toISOString()
      }, { onConflict: 'job_id,candidate_id' })

    return res.status(200).json({ token, existing: false })

  } catch (err: any) {
    console.error('Create interview candidate error:', err)
    return res.status(500).json({ error: err.message || 'Failed to create candidate' })
  }
}
