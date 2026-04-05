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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a recruitment expert. Generate a compelling job listing based on the following.

Job title: ${title}
Brief: ${brief || 'No brief provided'}

Respond ONLY with valid JSON, no markdown, no backticks.

Return exactly this format:
{
  "description": "3-4 paragraph job description covering the role, responsibilities, what a typical day looks like, and what success looks like. Professional and engaging tone. No bullet points.",
  "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "sector": "single word or short phrase for the industry sector"
}`
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
