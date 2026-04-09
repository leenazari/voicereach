import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorised' })

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await authClient.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Unauthorised' })
    const userId = user.id

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { candidateId } = req.body
    if (!candidateId) return res.status(400).json({ error: 'candidateId required' })

    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .eq('user_id', userId)
      .single()

    if (error || !candidate) return res.status(404).json({ error: 'Candidate not found' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Based on this candidate profile, generate up to 20 strength keywords for job matching. These keywords will be used to match this candidate against job postings so make them specific, searchable and industry standard. Think about what a recruiter would type into a CV database search.

CANDIDATE PROFILE:
Name: ${candidate.name}
Role: ${candidate.role_applied}
Years experience: ${candidate.years_experience}
Last employer: ${candidate.last_employer || 'unknown'}
All employers: ${(candidate.all_employers || []).join(', ')}
Skills: ${(candidate.skills || []).join(', ')}
Qualifications: ${(candidate.qualifications || []).join(', ')}
Experience summary: ${candidate.experience_summary}
${candidate.candidate_summary ? 'Profile: ' + candidate.candidate_summary : ''}

Generate up to 20 keywords. Include a mix of:
- Core professional skills and competencies (e.g. "Team Leadership", "P&L Management")
- Industry sectors and environments (e.g. "FMCG", "SaaS", "Warehousing", "Logistics")
- Role types they are suited for (e.g. "Sales Manager", "Business Development")
- Technical skills and systems (e.g. "WMS", "Salesforce", "SAP", "Google Analytics")
- Key achievements or specialisms (e.g. "New Business Hunter", "Cost Reduction", "Multi-site Operations")
- Location if relevant (e.g. "Birmingham Based", "West Midlands Based")

CRITICAL RULES:
- Use standard industry terminology that appears on CVs and job specs
- Use the actual system names (WMS, CRM, ERP, Salesforce) not generic terms
- Include both broad AND specific terms (e.g. "Sales" AND "B2B Sales" AND "Account Management")
- Use sector names recruiters search for (e.g. "Logistics", "E-commerce", "Retail", "SaaS")
- Always use Title Case
- Never use vague soft skills like "Good communicator" or "Hard working"

Respond ONLY with valid JSON, no markdown, no backticks:
{"strength_keywords": ["keyword1", "keyword2", "keyword3", ...]}`
        }]
      })
    })

    const apiData = await response.json()
    if (!response.ok) throw new Error(apiData.error?.message || 'Claude API error')

    const text = apiData.content?.[0]?.text || ''
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(clean)
    const keywords = parsed.strength_keywords || []

    await supabase
      .from('candidates')
      .update({ strength_keywords: keywords })
      .eq('id', candidateId)

    return res.status(200).json({ success: true, strength_keywords: keywords })

  } catch (err: any) {
    console.error('Regenerate keywords error:', err)
    return res.status(500).json({ error: err.message || 'Failed to regenerate keywords' })
  }
}
