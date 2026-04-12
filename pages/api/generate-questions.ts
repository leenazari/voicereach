import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

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
- cv_probe: a natural friendly question to verify a specific CV claim relevant to this question area

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
- Focus on extracting proof, judgement, ownership and measurable outcomes

CV VERIFICATION INTEGRATION:
- Each question should include a cv_probe — a natural, warm, curious question that could be used to verify a CV claim relevant to that competency area
- cv_probe questions must never sound accusatory — always curious and friendly
- Examples of good cv_probe questions:
  "You mentioned working at [employer] — what did a typical week look like in that role?"
  "Your background shows experience with [skill] — can you walk me through a specific time you used that?"
  "With [X] years in [sector], what was the most complex challenge you navigated?"
- The cv_probe is a template — the interviewer fills in specific employer/skill names from the candidate's actual CV at runtime

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

SELF-REVIEW BEFORE RESPONDING:
Before outputting JSON, mentally check:
- Do at least 3 questions directly probe the must-have skills?
- Is each question specific to THIS role, not generic filler?
- Does each question sound natural when spoken aloud?
- Are sub-questions deepening rather than repeating?
- Are cv_probe questions warm and curious, never accusatory?
- Are scoring contexts tied to the must-have skills?
If anything fails this check, fix it before outputting.

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
      "cv_probe": "string",
      "scoring_context": "string",
      "red_flags": ["string"]
    }
  ]
}`

const VALIDATOR_PROMPT = '' // kept for reference, no longer used separately

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
    const title = (job.title || '').toLowerCase()
    let seniority = 'mid level'
    if (title.includes('junior') || title.includes('graduate') || title.includes('entry') || title.includes('apprentice')) seniority = 'junior'
    if (title.includes('senior') || title.includes('lead') || title.includes('head') || title.includes('director') || title.includes('manager') || title.includes('principal')) seniority = 'senior'

    const skills = job.required_skills || []
    const coreSkills = skills.slice(0, 3)
    const importantSkills = skills.slice(3, 6)
    const additionalSkills = skills.slice(6)

    const roleInput = `ROLE TITLE: ${job.title}
SENIORITY: ${seniority}
INDUSTRY: ${job.sector || 'Not specified'}
INTERVIEW PURPOSE: Assess candidate suitability for the role and verify CV claims

CORE RESPONSIBILITIES:
${job.description ? job.description.substring(0, 600) : 'Not specified'}

MUST-HAVE SKILLS (critical — weight questions heavily around these, probe hard for evidence):
${coreSkills.map((s: string) => `- ${s}`).join('\n') || '- Not specified'}

IMPORTANT SKILLS (expected — questions should touch on these):
${importantSkills.map((s: string) => `- ${s}`).join('\n') || '- None specified'}

NICE-TO-HAVE SKILLS (bonus if present, do not penalise absence):
${additionalSkills.map((s: string) => `- ${s}`).join('\n') || '- None specified'}

QUESTION WEIGHTING INSTRUCTION:
- At least 3 of the 6 questions must directly probe the MUST-HAVE skills above
- The scoring_context for each question must explicitly state what a strong answer demonstrates in relation to the must-have skills
- Red flags should specifically call out inability to evidence the must-have skills
- cv_probe questions should prioritise verifying claims related to the must-have skills

QUESTION STYLE: mixed
INTERVIEW LENGTH: standard

ADDITIONAL CONTEXT:
Generate cv_probe questions that could verify whether a candidate genuinely has experience in the key skill areas for this role. The probes should feel like natural conversation, not interrogation. They should give genuine candidates the opportunity to shine while revealing if someone is overstating their experience.`

    // Single generation call with self-review built into system prompt
    const generateResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: roleInput }]
      })
    })

    const generateData = await generateResponse.json()
    if (!generateResponse.ok) throw new Error(generateData.error?.message || 'Generation failed')

    const rawText = generateData.content?.[0]?.text || ''
    if (!rawText) throw new Error('Empty response from generation')

    // Extract JSON — try clean parse first, then find JSON block
    let validatedPack: any
    try {
      const rawClean = rawText.replace(/```json|```/g, '').trim()
      validatedPack = JSON.parse(rawClean)
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not extract JSON from generation response')
      validatedPack = JSON.parse(match[0])
    }

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
