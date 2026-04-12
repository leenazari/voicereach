import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const { title, brief } = req.body
    if (!title) return res.status(400).json({ error: 'Job title required' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a senior recruitment consultant with 15 years experience writing job specs. Generate a compelling job listing based on the following.

Job title: ${title}
Brief: ${brief || 'No brief provided'}

Respond ONLY with valid JSON, no markdown, no backticks.
Return exactly this format:
{
  "description": "3-4 paragraph job description covering the role, responsibilities, what a typical day looks like, and what success looks like. Professional and engaging tone. No bullet points.",
  "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7"],
  "sector": "single word or short phrase for the industry sector"
}

For required_skills generate EXACTLY 7 keywords in PRIORITY ORDER — most critical to the role first.

ORDERING RULES (strictly follow this):
- Skills 1-2: The absolute must-haves. The core competency that defines this role. Without these the candidate cannot do the job. (e.g. for a Sales Manager: "B2B Sales", "Team Leadership")
- Skills 3-5: Important skills that differentiate strong candidates. Specific experience or tools central to this role. (e.g. "New Business Development", "Salesforce CRM", "Pipeline Management")
- Skills 6-7: Useful but not essential. Nice-to-haves that add value. (e.g. "Presentation Skills", "CRM Reporting")

CRITICAL RULES:
- Use the SAME terminology a candidate would write on their CV
- Use full standard phrases not abbreviations
- Never use vague soft skills like "Good communicator" or "Team player"
- Always use Title Case for each keyword
- Think: what would a recruiter type into a CV database search to find this person?
- The order MATTERS — it determines matching weight in our scoring system`
        }]
      })
    })

    const apiData = await response.json()
    if (!response.ok) throw new Error(apiData.error?.message || 'Claude API error')
    const text = apiData.content?.[0]?.text || ''
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const generated = JSON.parse(clean)
    return res.status(200).json({ generated })

  } catch (err: any) {
    console.error('Generate job error:', err)
    return res.status(500).json({ error: err.message || 'Failed to generate' })
  }
}
