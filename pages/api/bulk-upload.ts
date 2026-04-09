import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ success: false, reason: 'Unauthorised' })

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return res.status(401).json({ success: false, reason: 'Unauthorised' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: profile } = await supabase.from('profiles').select('credits_used, credits_limit').eq('id', user.id).single()
  if (!profile) return res.status(400).json({ success: false, reason: 'Profile not found' })
  if (profile.credits_used >= profile.credits_limit) return res.status(400).json({ success: false, reason: 'Insufficient credits' })

  const { base64, filename, jobId } = req.body
  if (!base64 || !filename) return res.status(400).json({ success: false, reason: 'Missing file data' })

  try {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    const allowedExts = ['.pdf', '.doc', '.docx']
    if (!allowedExts.includes(ext)) return res.json({ success: false, reason: 'Wrong format' })

    // Use same approach as extract-cv.ts — send as PDF source
    const message = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          },
          {
            type: 'text',
            text: `Extract the following from this CV and return ONLY valid JSON with no markdown:
{
  "name": "full name",
  "email": "email address or null",
  "phone": "phone or null",
  "location": "city/area or null",
  "role": "most recent job title or target role",
  "last_employer": "most recent employer or null",
  "years_experience": number,
  "experience_summary": "2-3 sentence summary of experience",
  "candidate_summary": "brief professional profile",
  "skills": ["skill1", "skill2"],
  "qualifications": ["qual1"],
  "all_employers": ["employer1", "employer2"],
  "strength_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`
          }
        ]
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)

    if (!extracted.email) return res.json({ success: false, reason: 'No email found in CV' })

    const { data: existing } = await supabase.from('candidates').select('id').eq('user_id', user.id).eq('email', extracted.email).single()
    if (existing) return res.json({ success: false, reason: 'Duplicate — already in system' })

    const candidateData: any = {
      user_id: user.id,
      name: extracted.name || filename,
      email: extracted.email,
      phone: extracted.phone || null,
      location: extracted.location || null,
      role_applied: extracted.role || 'Unknown',
      last_employer: extracted.last_employer || null,
      years_experience: extracted.years_experience || 0,
      experience_summary: extracted.experience_summary || '',
      candidate_summary: extracted.candidate_summary || '',
      skills: extracted.skills || [],
      qualifications: extracted.qualifications || [],
      all_employers: extracted.all_employers || [],
      strength_keywords: extracted.strength_keywords || [],
      status: 'applied'
    }

    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('title, salary').eq('id', jobId).eq('user_id', user.id).single()
      if (job) { candidateData.job_title = job.title; candidateData.job_salary = job.salary }
    }

    const { error } = await supabase.from('candidates').insert(candidateData)
    if (error) return res.json({ success: false, reason: 'Database error' })

    await supabase.from('profiles').update({ credits_used: profile.credits_used + 1 }).eq('id', user.id)

    return res.json({ success: true, name: extracted.name, email: extracted.email })

  } catch {
    return res.json({ success: false, reason: 'Extraction failed' })
  }
}
