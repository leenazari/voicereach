import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
        model: 'claude-sonnet-4-20250514',
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
  "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
  "sector": "single word or short phrase for the industry sector"
}

For required_skills generate exactly 10 keywords that represent what this role requires. These will be used to match against candidate CVs so they MUST use standard industry terminology that appears on CVs.

Include a mix of:
- Core professional skills and competencies (e.g. "Team Leadership", "P&L Management", "Business Development")
- Industry sectors and environments (e.g. "FMCG", "SaaS", "Warehousing", "Logistics")
- Technical skills and systems relevant to the role (e.g. "WMS", "Salesforce", "SAP", "Excel")
- Role-specific specialisms (e.g. "New Business Hunter", "Cost Reduction", "Tender Management")
- Experience types (e.g. "Multi-site Operations", "People Management", "Budget Accountability")

CRITICAL RULES for required_skills:
- Use the SAME terminology a candidate would write on their CV
- Use full standard phrases not abbreviations (e.g. "Warehouse Management System" AND "WMS")
- Include both broad AND specific terms (e.g. "Sales" AND "B2B Sales" AND "Account Management")
- Never use vague soft skills like "Good communicator" or "Team player" — these never appear on CVs
- Always use Title Case for each keyword
- Think: what would a recruiter type into a CV database search to find this person?`
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
