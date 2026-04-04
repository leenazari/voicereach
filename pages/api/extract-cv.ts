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
              }] : []),
              {
                type: 'text',
                text: `Extract the following from this CV and respond ONLY with a valid JSON object. No markdown, no backticks, no explanation, just the raw JSON:\n{"name":"full name","email":"email or empty string","phone":"phone or empty string","role":"most recent job title","years_experience":total years as integer,"experience_summary":"2-3 sentence summary of experience and skills written naturally"}`
              }
            ]
          }
        ]
      })
    })

    const apiData = await response.json()
    
    if (!response.ok) {
      console.error('Anthropic API error:', apiData)
      return res.status(500).json({ error: 'Claude API error: ' + (apiData.error?.message || 'Unknown') })
    }

    const text = apiData.content?.[0]?.text || ''
    console.log('Claude response:', text)
    
    // Strip any accidental markdown
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    let extracted
    try {
      extracted = JSON.parse(clean)
    } catch (parseErr) {
      console.error('Parse error, raw text:', text)
      return res.status(500).json({ error: 'Could not parse CV data' })
    }

    return res.status(200).json({ extracted })
  } catch (err: any) {
    console.error('CV extraction error:', err)
    return res.status(500).json({ error: err.message || 'Failed to extract CV' })
  }
}
