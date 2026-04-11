import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `You are an expert interview designer working to the Interviewa Interview Generation Standard.

Your job is to generate a structured 6-question interview for any given role using a fixed logic framework that improves signal quality, reduces vague candidate answers, and creates a natural interview flow.

You must always generate questions in this exact order:
1. Motivation and role fit
2. Process and approach
3. Real past example and evidence
4. Judgement under pressure
5. Planning and execution
6. Operational discipline and continuous improvement

For each main question you must generate:
- 3 to 5 sub-questions that deepen the answer
- 2 fallback questions for vague, weak, generic or incomplete responses
- a scoring context explaining what strong answers should include
- red flags to watch for
- the exact competency or trait being tested

Rules:
- Questions must be specific to the role, not generic interview filler
- Questions must be concise, conversational and easy to understand when spoken aloud
- Questions must test real behaviour, not just theory or opinion
- At least half of the main questions must invite evidence from real past experience
- Sub-questions must move from broad to specific
- Fallback questions must recover detail when the candidate avoids specifics
- Avoid repetitive phrasing across questions
- Avoid double barrelled or overly long questions
- Avoid cliche wording
- Focus on extracting proof, judgement, ownership and measurable outcomes where relevant

Question design logic:
- The main question opens the topic naturally
- Sub-question 1 should clarify the candidate's thinking
- Sub-question 2 should push for specifics
- Sub-question 3 should test judgement or decision making
- Sub-question 4 should test measurable outcome or result
- Sub-question 5 where useful should test reflection or improvement

Fallback logic:
- If a candidate answer is vague ask for a specific example
- If a candidate stays theoretical ask what they actually did in practice
- If a candidate gives no outcome ask what happened in the end
- If a candidate avoids ownership ask what their personal role was
- If a candidate gives a polished but shallow answer ask what was difficult about it

Role adaptation:
- Sales roles: lean into motivation, qualification, objection handling, targets, CRM hygiene
- Customer service: lean into empathy, difficult interactions, process adherence, calmness
- Operations: lean into process control, prioritisation, accuracy, continuous improvement
- Technical: lean into problem solving, technical judgement, debugging, trade offs, quality
- Leadership: lean into team judgement, conflict, delegation, decision quality, accountability
- Social care: lean into safeguarding, person centred care, risk assessment, compliance

Seniority adaptation:
- Junior: simpler questions, allow examples from education or placements, test potential and attitude
- Mid level: expect stronger ownership, better examples, measurable outcomes
- Senior: test judgement at scale, cross-functional thinking, trade offs, leadership impact

Respond ONLY with valid JSON, no markdown, no backticks, in exactly this format:
{
  "questions": [
    {
      "number": 1,
      "main_question": "string",
      "why": "string",
      "competency": "string",
      "sub_questions": ["string"],
      "fallback_questions": ["string"],
      "scoring_context": "string",
      "red_flags": ["string"]
    }
  ]
}`

const VALIDATOR_PROMPT = `You are a strict interview quality reviewer working to the Interviewa Interview Generation Standard.

Review this interview pack and check for:
- Correct 1 to 6 question order with clear flow from motivation to discipline
- Role relevance — questions must not be generic filler
- Concise wording that sounds natural when spoken aloud
- No repeated question intent across the 6 questions
- Sub-questions that deepen rather than repeat the main question
- Fallback questions that recover missing detail effectively
- Scoring contexts that match the question and distinguish weak from strong answers
- Red flags that are realistic, practical and tied to the role
- Enough emphasis on evidence, ownership, judgement and outcomes

If any question is weak, vague, repetitive or badly placed — rewrite it.
Return the improved and validated interview pack ONLY as valid JSON with no markdown, no backticks, in exactly the same format as the input.`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

  try {
    // Determine seniority from title
    const title = (job.title || '').toLowerCase()
    let seniority = 'mid level'
    if (title.includes('junior') || title.includes('graduate') || title.includes('entry') || title.includes('apprentice')) seniority = 'junior'
    if (title.includes('senior') || title.includes('lead') || title.includes('head') || title.includes('director') || title.includes('manager') || title.includes('principal')) seniority = 'senior'

    const roleInput = `ROLE TITLE: ${job.title}
SENIORITY: ${seniority}
INDUSTRY: ${job.sector || 'Not specified'}
INTERVIEW PURPOSE: Assess candidate suitability for the role

CORE RESPONSIBILITIES:
${job.description ? job.description.substring(0, 500) : 'Not specified'}

MUST HAVE SKILLS:
${(job.required_skills || []).map((s: string) => `- ${s}`).join('\n') || '- Not specified'}

QUESTION STYLE: mixed
INTERVIEW LENGTH: standard`

    // Step 1 — Generate
    const generateResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: roleInput }]
      })
    })

    const generateData = await generateResponse.json()
    if (!generateResponse.ok) throw new Error(generateData.error?.message || 'Generation failed')

    const rawText = generateData.content?.[0]?.text || ''
    const rawClean = rawText.replace(/```json|```/g, '').trim()
    const rawPack = JSON.parse(rawClean)

    // Step 2 — Validate and improve
    const validateResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: VALIDATOR_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(rawPack) }]
      })
    })

    const validateData = await validateResponse.json()
    if (!validateResponse.ok) throw new Error(validateData.error?.message || 'Validation failed')

    const validatedText = validateData.content?.[0]?.text || ''
    const validatedClean = validatedText.replace(/```json|```/g, '').trim()
    const validatedPack = JSON.parse(validatedClean)

    // Save to job record
    await supabase
      .from('jobs')
      .update({
        interview_questions: validatedPack,
        interview_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    return res.status(200).json({ success: true, questions: validatedPack })

  } catch (err: any) {
    console.error('Generate questions error:', err)
    return res.status(500).json({ error: err.message || 'Failed to generate questions' })
  }
}
