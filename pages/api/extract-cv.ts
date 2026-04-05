import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
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
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Based on this candidate profile, generate up to 20 keyword strengths for job matching. These keywords will be compared against job required skills so use standard industry terminology that recruiters actually use in job postings.

CANDIDATE PROFILE:
Name: ${candidate.name}
Role: ${candidate.role_applied}
Years experience: ${candidate.years_experience}
Last employer: ${candidate.last_employer || 'unknown'}
All employers: ${(candidate.all_employers || []).join(', ')}
Skills: ${(candidate.skills || []).join(', ')}
Experience summary: ${candidate.experience_summary}
${candidate.candidate_summary ? 'Profile: ' + candidate.candidate_summary : ''}

Generate up to 20 keywords. Include a mix of:
- Core professional skills (e.g. "Team Leadership", "P&L Management", "Budget Control")
- Industry sectors (e.g. "FMCG", "SaaS", "Logistics", "Warehousing", "Retail")
- Role types (e.g. "Sales Manager", "Business Development", "Warehouse Manager")
- Technical skills and systems (e.g. "WMS", "SAP", "Salesforce", "CRM", "ERP")
- Key specialisms (e.g. "New Business Hunter", "Inventory Control", "Cost Reduction")
- Seniority indicators if relevant (e.g. "Senior Management", "Director Level")
- Location if relevant (e.g. "Manchester Based")

CRITICAL: Think about what words a recruiter would put in a job description. Use BOTH variations of common terms:
- Include "Business Development" AND "Sales" if relevant
- Include "Team Leadership" AND "People Management" AND "Staff Management"
- Include "Inventory Control" AND "Inventory Management" AND "Stock Management"
- Include "Logistics" AND "Supply Chain" if relevant
- Include actual system acronyms (WMS, CRM, ERP) AND full names

Respond ONLY with valid JSON, no markdown, no backticks:
{"strength_keywords": ["keyword1", "keyword2", ... up to 20 keywords]}`
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
