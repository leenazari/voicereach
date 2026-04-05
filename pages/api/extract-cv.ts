import { NextApiRequest, NextApiResponse } from 'next'

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, filename } = req.body
    if (!base64) return res.status(400).json({ error: 'base64 required' })

    const ext = (filename?.split('.').pop() || '').toLowerCase().trim()
    const isPdf = ext === 'pdf'
    const mediaType = isPdf ? 'application/pdf' : 'application/octet-stream'

    console.log(`Extracting CV: ${filename}, ext: ${ext}, mediaType: ${mediaType}, base64 length: ${base64.length}`)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: isPdf ? 'document' : 'text',
              ...(isPdf ? {
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64
                }
              } : {
                text: `Please extract CV information from this document (base64 encoded): ${base64.substring(0, 100)}...`
              })
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

IMPORTANT: Use standard industry terminology that will match job descriptions. For example:
- Use "Business Development" not just "Sales"
- Use "People Management" AND "Team Leadership" as both are used
- Use the actual system names (WMS, CRM, ERP) not just "computer skills"
- Use sector names as recruiters search them (e.g. "Logistics", "E-commerce", "Retail")

If any field cannot be found return null for that field. Return empty array for array fields if not found.`
            }
          ]
        }]
      })
    })

    const apiData = await response.json()

    if (!response.ok) {
      console.error('Claude API error:', JSON.stringify(apiData))
      throw new Error(apiData.error?.message || `Claude API error: ${response.status}`)
    }

    const text = apiData.content?.[0]?.text || ''
    console.log('Claude response:', text.substring(0, 200))

    if (!text) {
      throw new Error('Claude returned empty response')
    }

    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()

    let extracted
    try {
      extracted = JSON.parse(clean)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw text:', text)
      throw new Error('Could not parse Claude response as JSON')
    }

    return res.status(200).json({ extracted })

  } catch (err: any) {
    console.error('CV extraction error:', err)
    return res.status(500).json({ error: err.message || 'Failed to extract CV' })
  }
}
