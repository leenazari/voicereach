import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

const SYSTEM_PROMPT = `You are an expert interview designer. Generate a structured 6-question interview pack for the given role.

Questions must follow this order:
1. Motivation and role fit
2. Process and approach  
3. Real past example and evidence
4. Judgement under pressure
5. Planning and execution
6. Operational discipline and improvement

For each question generate:
- main_question: specific, conversational, spoken naturally
- why: brief reason for asking
- competency: the trait being tested
- sub_questions: 3 that deepen the answer
- fallback_questions: 2 for weak/vague answers
- cv_probe: warm curious question to verify a CV claim (never accusatory)
- scoring_context: what strong answers include, tied to must-have skills
- red_flags: 2-3 realistic warning signs

Rules:
- Questions must be role-specific, not generic
- At least 3 must directly probe the MUST-HAVE skills
- All wording must sound natural when spoken aloud
- Focus on evidence, ownership, judgement, outcomes

Respond ONLY with valid JSON, no markdown, no backticks:
{"questions":[{"number":1,"main_question":"","why":"","competency":"","sub_questions":[],"fallback_questions":[],"cv_probe":"","scoring_context":"","red_flags":[]}]}`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { jobId, requiredSkills } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  const { data: job, error: jobError } = await supabase
    .from('jobs').select('*').eq('id', jobId).eq('user_id', user.id).single()

  if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

  try {
    const title = (job.title || '').toLowerCase()
    let seniority = 'mid level'
    if (title.includes('junior') || title.includes('graduate') || title.includes('entry')) seniority = 'junior'
    if (title.includes('senior') || title.includes('lead') || title.includes('head') || title.includes('director') || title.includes('manager') || title.includes('principal')) seniority = 'senior'

    const skills = (requiredSkills && requiredSkills.length > 0) ? requiredSkills : (job.required_skills || [])
    const coreSkills = skills.slice(0, 3)
    const otherSkills = skills.slice(3, 7)

    const roleInput = `ROLE: ${job.title} (${seniority})
SECTOR: ${job.sector || 'Not specified'}
DESCRIPTION: ${job.description ? job.description.substring(0, 400) : 'Not specified'}

MUST-HAVE SKILLS (probe hard, deal-breakers):
${coreSkills.map((s: string) => `- ${s}`).join('\n') || '- Not specified'}

OTHER SKILLS:
${otherSkills.map((s: string) => `- ${s}`).join('\n') || '- None'}

Generate the 6-question interview pack now.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: roleInput }]
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Generation failed')

    const text = data.content?.[0]?.text || ''
    if (!text) throw new Error('Empty response')

    let pack: any
    try {
      pack = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse response')
      pack = JSON.parse(match[0])
    }

    await supabase.from('jobs').update({
      interview_questions: pack,
      interview_enabled: true,
      updated_at: new Date().toISOString()
    }).eq('id', jobId)

    return res.status(200).json({ success: true, questions: pack })

  } catch (err: any) {
    console.error('Generate questions error:', err)
    return res.status(500).json({ error: err.message || 'Failed to generate questions' })
  }
}
