import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { base64, filename } = req.body

    const isPdf = filename?.toLowerCase().endsWith('.pdf')

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
        messages: [
          {
            role: 'user',
            content: [
              ...(isPdf ? [{
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              }] : [{
                type: 'text',
                text: `Here is the CV content as base64: ${base64}`
              }]),
              {
                type: 'text',
                text: `Extract the following from this CV and respond ONLY with a JSON object, no other text:
{
  "name": "full name",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "role": "most recent job title or primary role",
  "years_experience": number of years total experience as integer,
  "experience_summary": "2-3 sentence summary of their experience, skills and background, written naturally for use in a voice note"
}`
              }
            ]
          }
        ]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)

    return res.status(200).json({ extracted })
  } catch (err: any) {
    console.error('CV extraction error:', err)
    return res.status(500).json({ error: err.message || 'Failed to extract CV' })
  }
}
