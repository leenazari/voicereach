import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { base64, filename } = req.body
    const ext = filename?.toLowerCase().split('.').pop() || ''
    const isPdf = ext === 'pdf'

    const content: any[] = []

    if (isPdf) {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 }
      })
    } else {
      const decoded = Buffer.from(base64, 'base64').toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim()
      content.push({
        type: 'text',
        text: `Here is the raw CV content extracted from a ${ext} file:\n\n${decoded.substring(0, 8000)}`
      })
    }

    content.push({
      type: 'text',
      text: `You are a recruitment assistant analysing a CV. Extract the following information and respond ONLY with a valid JSON object, no markdown, no backticks, no explanation, just raw JSON.

Rules:
- years_experience: only count roles relevant to the candidate primary career track, ignore unrelated jobs, add up only the relevant years
- role: their most recent relevant job title
- last_employer: the name of the most recent company they worked at, exactly as written on the CV
- all_employers: list of all company names mentioned on the CV in order from most recent to oldest
- skills: list of up to 10 key skills mentioned on the CV as short phrases
- qualifications: list of any degrees, certifications or qualifications mentioned
- location: their city or region if mentioned
- candidate_summary: 3-4 natural sentences summarising their career, key skills, achievements and what kind of role they are best suited for. Written in third person, professional tone, for use in matching them to jobs.
- experience_summary: 2-3 natural sentences summarising their relevant experience and skills, written in first person style for use in a voice note

Respond with exactly this format:
{
  "name": "full name",
  "email": "email or empty string",
  "phone": "phone number or empty string",
  "location": "city or region or empty string",
  "role": "most recent relevant job title",
  "years_experience": relevant years as integer,
  "last_employer": "most recent company name exactly as on CV",
  "all_employers": ["company1", "company2"],
  "skills": ["skill1", "skill2", "skill3"],
  "qualifications": ["qualification1", "qualification2"],
  "candidate_summary": "3-4 sentence professional profile summary in third person",
  "experience_summary": "2-3 sentence summary for voice note"
}`
    })

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
        messages: [{ role: 'user', content }]
      })
    })

    const apiData = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', apiData)
      return res.status(500).json({ error: 'Claude API error: ' + (apiData.error?.message || 'Unknown') })
    }

    const text = apiData.content?.[0]?.text || ''
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()

    let extracted
    try {
      extracted = JSON.parse(clean)
    } catch {
      console.error('Parse error, raw text:', text)
      return res.status(500).json({ error: 'Could not parse CV data' })
    }

    return res.status(200).json({ extracted })
  } catch (err: any) {
    console.error('CV extraction error:', err)
    return res.status(500).json({ error: err.message || 'Failed to extract CV' })
  }
}
