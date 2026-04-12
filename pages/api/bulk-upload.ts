import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }

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
    if (ext !== '.pdf') return res.json({ success: false, reason: 'PDF files only' })

    const message = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
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
            text: `Extract information from this CV and respond ONLY with valid JSON, no markdown, no backticks.

Return exactly this format:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "location": "city or region they are based in",
  "role": "their most recent job title or the role they are applying for",
  "years_experience": number of years total experience as integer,
  "last_employer": "most recent company name",
  "all_employers": ["company1", "company2", "company3"],
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "qualifications": ["qualification1", "qualification2"],
  "experience_summary": "2-3 sentence summary of their experience for use in a voice note. Write in third person. Keep it punchy and specific.",
  "candidate_summary": "3-4 sentence professional summary of who they are and what they bring",
  "strength_keywords": ["keyword1", "keyword2", ... up to 20 keywords]
}

For strength_keywords generate up to 20 keywords that represent this candidate's strongest and most marketable attributes. These will be used for job matching so make them specific, searchable and industry standard. Think about what a recruiter would search for.

Include a mix of:
- Core professional skills and competencies (e.g. "Team Leadership", "P&L Management")
- Industry sectors and environments (e.g. "FMCG", "SaaS", "Warehousing")
- Role types they are suited for (e.g. "Sales Manager", "Business Development")
- Technical skills and systems (e.g. "WMS", "Salesforce", "SAP")
- Key achievements or specialisms (e.g. "New Business Hunter", "Cost Reduction")
- Location if relevant (e.g. "London Based", "Manchester Based")

IMPORTANT: Use standard industry terminology that will match job descriptions. Use the actual system names, sector names and role titles that appear on both CVs and job specs.

If any field cannot be found return null for that field. Return empty array for array fields if not found.`
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
