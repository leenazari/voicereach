import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { candidateId, jobId } = req.body
    if (!candidateId || !jobId) return res.status(400).json({ error: 'candidateId and jobId required' })

    const [{ data: candidate }, { data: job }] = await Promise.all([
      supabase.from('candidates').select('*').eq('id', candidateId).single(),
      supabase.from('jobs').select('*').eq('id', jobId).single()
    ])

    if (!candidate || !job) return res.status(404).json({ error: 'Candidate or job not found' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a recruitment expert writing a personal voice message DIRECTLY TO the candidate. Everything must be written in second person — use "you", "your", "you have", "you are". Never use the candidate's name or third person (no "he", "she", "they", or the candidate's name).

Match this candidate against this job and identify why they are a strong fit.

Respond ONLY with valid JSON, no markdown, no backticks.

CANDIDATE:
Role: ${candidate.role_applied}
Years experience: ${candidate.years_experience}
Last employer: ${candidate.last_employer || 'unknown'}
Skills: ${(candidate.skills || []).join(', ')}
Summary: ${candidate.experience_summary}
${candidate.candidate_summary ? 'Profile: ' + candidate.candidate_summary : ''}

JOB:
Title: ${job.title}
Company: ${job.company || 'confidential client'}
Sector: ${job.sector || 'unspecified'}
Location: ${job.location || 'unspecified'}
Salary: ${job.salary || 'competitive'}
Required skills: ${(job.required_skills || []).join(', ')}
Description: ${job.description}

Return this exact JSON format:
{
  "match_score": number from 0 to 100,
  "top_matches": ["specific skill or experience that matches", "another specific match", "third match"],
  "pitch_hook": "one punchy sentence in second person explaining why YOU are perfect for this role — e.g. 'with your background in X and your experience at Y, you are exactly what they need'",
  "urgency_line": "one sentence in second person creating genuine urgency — e.g. 'this role is moving fast and they want someone like you in place within the month'"
}`
        }]
      })
    })

    const apiData = await response.json()
    if (!response.ok) throw new Error(apiData.error?.message || 'Claude API error')

    const text = apiData.content?.[0]?.text || ''
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const matchData = JSON.parse(clean)

    return res.status(200).json({ match: matchData, candidate, job })

  } catch (err: any) {
    console.error('Match error:', err)
    return res.status(500).json({ error: err.message || 'Failed to match' })
  }
}
