import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token, transcript } = req.body
  if (!token || !transcript) return res.status(400).json({ error: 'Token and transcript required' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: candidate, error: candError } = await supabase
    .from('candidates')
    .select('*')
    .eq('interview_token', token)
    .single()

  if (candError || !candidate) return res.status(404).json({ error: 'Candidate not found' })

  let job: any = null
  let pack: any = null

  if (candidate.job_id) {
    const { data: jobData } = await supabase.from('jobs').select('*').eq('id', candidate.job_id).single()
    if (jobData) job = jobData
    const { data: packData } = await supabase.from('interview_packs').select('*').eq('job_id', candidate.job_id).single()
    if (packData) pack = packData
  }

  const questions = pack?.questions?.questions || []

  const scoringPrompt = `You are an expert recruitment assessor reviewing a structured job interview transcript.

Your job is to:
1. Score each interview question based on the candidate's answers
2. Extract new keywords and skills revealed during the interview
3. Identify any CV claims that could not be verified or appeared contradicted in the interview
4. Produce an overall hiring recommendation

ROLE: ${job?.title || 'Not specified'}
COMPANY: ${job?.company || 'Not specified'}

CANDIDATE CV:
Name: ${candidate.name}
Role applied for: ${candidate.role_applied || 'Not specified'}
Years experience: ${candidate.years_experience || 'Not specified'}
Last employer: ${candidate.last_employer || 'Not specified'}
All employers: ${(candidate.all_employers || []).join(', ') || 'Not specified'}
Skills listed on CV: ${(candidate.skills || []).join(', ') || 'Not specified'}
Strength keywords on CV: ${(candidate.strength_keywords || []).join(', ') || 'Not specified'}
Experience summary: ${candidate.experience_summary || 'Not specified'}

INTERVIEW QUESTIONS AND SCORING CONTEXT:
${questions.map((q: any) => `
Question ${q.number} — ${q.competency}
Question: ${q.main_question}
Scoring context: ${q.scoring_context}
Red flags: ${(q.red_flags || []).join(', ')}
`).join('\n')}

FULL INTERVIEW TRANSCRIPT:
${transcript}

SCORING RULES:
- Score each question 1 to 10
- 8-10: Excellent — strong evidence, specific examples, measurable outcomes
- 6-7: Good — solid answer with some evidence
- 4-5: Average — adequate but vague or lacking proof
- 1-3: Weak — no evidence, deflecting, or clearly fabricated

CV VERIFICATION RULES:
- Review every skill, employer and claim on the CV
- If the candidate was asked about something from their CV and gave a strong, specific answer — mark as VERIFIED
- If the candidate was asked about something and gave a vague, shallow or deflecting answer — mark as UNVERIFIED with a note
- If the candidate's answer directly contradicts something on their CV — mark as CONTRADICTED with details
- Always use neutral, professional language — never accusatory
- Focus on what was and was not demonstrated, not character judgements

INTERVIEW KEYWORD EXTRACTION:
- Extract specific skills, tools, systems, sectors and competencies the candidate demonstrated knowledge of during the interview
- Include things they mentioned that were NOT on their CV
- Only include things they spoke about with genuine knowledge and depth
- These will be used for job matching so use standard industry terminology

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "overall_score": number 0-100,
  "recommendation": "3-4 sentence hiring recommendation",
  "question_scores": [
    {
      "number": 1,
      "competency": "string",
      "score": number 1-10,
      "reasoning": "1-2 sentences",
      "red_flags_observed": ["string"]
    }
  ],
  "strengths": ["string"],
  "concerns": ["string"],
  "interview_keywords": ["keyword1", "keyword2"],
  "cv_contradictions": [
    {
      "claim": "what was on the CV",
      "status": "VERIFIED | UNVERIFIED | CONTRADICTED",
      "note": "what was observed in the interview — neutral professional language",
      "severity": "LOW | MEDIUM | HIGH"
    }
  ],
  "next_round_questions": [
    {
      "question": "string",
      "rationale": "why this question — what gap or area it explores"
    }
  ]
}`

  try {
    const scoreResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: scoringPrompt }]
      })
    })

    const scoreData = await scoreResponse.json()
    if (!scoreResponse.ok) throw new Error(scoreData.error?.message || 'Scoring failed')

    const scoreText = scoreData.content?.[0]?.text || ''
    const scoreClean = scoreText.replace(/```json|```/g, '').trim()
    const scored = JSON.parse(scoreClean)

    // Save everything to candidate
    await supabase
      .from('candidates')
      .update({
       interview_transcript: transcript,
      interview_score: scored.overall_score,
      interview_answers: scored,
      interview_recommendation: scored.recommendation,
      interview_completed_at: new Date().toISOString(),
      interview_keywords: scored.interview_keywords || [],
      cv_contradictions: scored.cv_contradictions || [],
      status: 'interviewed'
      })
      .eq('id', candidate.id)

    // Send recruiter notification
    if (job) await sendRecruiterNotification(candidate, job, scored)

    return res.status(200).json({ success: true, score: scored.overall_score })

  } catch (err: any) {
    console.error('Score interview error:', err)
    await supabase
      .from('candidates')
      .update({
        interview_transcript: transcript,
        interview_completed_at: new Date().toISOString()
      })
      .eq('id', candidate.id)
    return res.status(200).json({ success: true, score: null, warning: 'Scoring failed but interview saved' })
  }
}

async function sendRecruiterNotification(candidate: any, job: any, scored: any) {
  try {
    const scoreColor = scored.overall_score >= 75 ? '#1D9E75' : scored.overall_score >= 55 ? '#BA7517' : '#E24B4A'
    const scoreLabel = scored.overall_score >= 75 ? 'Strong candidate' : scored.overall_score >= 55 ? 'Average candidate' : 'Weak candidate'

    const questionRows = (scored.question_scores || []).map((q: any) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #555;">Q${q.number}: ${q.competency}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; text-align: center;">
          <span style="background: ${q.score >= 7 ? '#E1F5EE' : q.score >= 5 ? '#FFF3E0' : '#fff0ee'}; color: ${q.score >= 7 ? '#1D9E75' : q.score >= 5 ? '#BA7517' : '#E24B4A'}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">${q.score}/10</span>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #888;">${q.reasoning}</td>
      </tr>
    `).join('')

    const contradictionRows = (scored.cv_contradictions || [])
      .filter((c: any) => c.status !== 'VERIFIED')
      .map((c: any) => `
        <div style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px;">
          <span style="background: ${c.status === 'CONTRADICTED' ? '#fff0ee' : '#FFF3E0'}; color: ${c.status === 'CONTRADICTED' ? '#E24B4A' : '#BA7517'}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-right: 8px;">${c.status}</span>
          <strong>${c.claim}</strong>
          <div style="color: #888; font-size: 12px; margin-top: 4px;">${c.note}</div>
        </div>
      `).join('')

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">

    <div style="background: linear-gradient(135deg, #0f0c29, #302b63); border-radius: 16px; padding: 28px; margin-bottom: 16px; text-align: center;">
      <div style="font-size: 13px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Interview completed</div>
      <div style="font-size: 24px; font-weight: 800; color: white; margin-bottom: 4px;">${candidate.name}</div>
      <div style="font-size: 14px; color: rgba(255,255,255,0.6);">${job.title}${job.company ? ` at ${job.company}` : ''}</div>
    </div>

    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; text-align: center; border: 1px solid #ebebeb;">
      <div style="font-size: 48px; font-weight: 900; color: ${scoreColor}; margin-bottom: 8px;">${scored.overall_score}%</div>
      <div style="font-size: 14px; font-weight: 600; color: ${scoreColor}; margin-bottom: 16px;">${scoreLabel}</div>
      <div style="font-size: 14px; color: #555; line-height: 1.7; text-align: left; background: #f9f9f9; border-radius: 10px; padding: 16px;">
        ${scored.recommendation}
      </div>
    </div>

    ${scored.strengths?.length > 0 ? `
    <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Strengths</div>
      ${scored.strengths.map((s: string) => `<div style="font-size: 13px; color: #1D9E75; padding: 3px 0;">✓ ${s}</div>`).join('')}
    </div>` : ''}

    ${scored.concerns?.length > 0 ? `
    <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Concerns</div>
      ${scored.concerns.map((c: string) => `<div style="font-size: 13px; color: #E24B4A; padding: 3px 0;">⚠ ${c}</div>`).join('')}
    </div>` : ''}

    ${contradictionRows ? `
    <div style="background: white; border-radius: 16px; overflow: hidden; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">CV verification flags</div>
      </div>
      ${contradictionRows}
    </div>` : ''}

    ${scored.interview_keywords?.length > 0 ? `
    <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">New keywords from interview</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${scored.interview_keywords.map((k: string) => `<span style="font-size: 12px; background: #E1F5EE; color: #1D9E75; padding: 3px 10px; border-radius: 20px; font-weight: 500;">⚡ ${k}</span>`).join('')}
      </div>
    </div>` : ''}

    <div style="background: white; border-radius: 16px; overflow: hidden; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Question scores</div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #fafafa;">
            <th style="padding: 10px 14px; font-size: 11px; color: #888; text-align: left; font-weight: 600;">Question</th>
            <th style="padding: 10px 14px; font-size: 11px; color: #888; text-align: center; font-weight: 600;">Score</th>
            <th style="padding: 10px 14px; font-size: 11px; color: #888; text-align: left; font-weight: 600;">Notes</th>
          </tr>
        </thead>
        <tbody>${questionRows}</tbody>
      </table>
    </div>

    <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Candidate contact</div>
      <div style="font-size: 13px; color: #555; margin-bottom: 4px;">📧 ${candidate.email}</div>
      ${candidate.phone ? `<div style="font-size: 13px; color: #555;">📞 ${candidate.phone}</div>` : ''}
    </div>

    <div style="text-align: center; font-size: 12px; color: #bbb; margin-top: 24px;">
      Powered by VoiceReach · voicereach.co.uk
    </div>
  </div>
</body>
</html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'outreach@voicereach.co.uk',
        to: [process.env.ADMIN_EMAIL || 'lee.nazari@gmail.com'],
        subject: `Interview completed — ${candidate.name} scored ${scored.overall_score}% for ${job.title}`,
        html: emailHtml
      })
    })
  } catch (err) {
    console.error('Notification email error:', err)
  }
}
