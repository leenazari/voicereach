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

  // Get candidate
  const { data: candidate, error: candError } = await supabase
    .from('candidates')
    .select('*')
    .eq('interview_token', token)
    .single()

  if (candError || !candidate) return res.status(404).json({ error: 'Candidate not found' })

  // Get job
  let job: any = null
  let pack: any = null

  if (candidate.job_id) {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', candidate.job_id)
      .single()
    if (jobData) job = jobData

    const { data: packData } = await supabase
      .from('interview_packs')
      .select('*')
      .eq('job_id', candidate.job_id)
      .single()
    if (packData) pack = packData
  }

  const questions = pack?.questions?.questions || []

  // Build scoring prompt
  const scoringPrompt = `You are an expert recruitment assessor. You have just received the transcript of a structured job interview.

Your job is to score each of the 6 interview questions based on the candidate's answers, using the scoring context and red flags provided for each question.

ROLE: ${job?.title || 'Not specified'}
COMPANY: ${job?.company || 'Not specified'}

CANDIDATE CV CONTEXT:
Name: ${candidate.name}
Role: ${candidate.role_applied || 'Not specified'}
Experience: ${candidate.years_experience || 'Not specified'} years
Last employer: ${candidate.last_employer || 'Not specified'}
Skills: ${(candidate.skills || []).join(', ') || 'Not specified'}
Experience summary: ${candidate.experience_summary || 'Not specified'}

INTERVIEW QUESTIONS AND SCORING CONTEXT:
${questions.map((q: any) => `
Question ${q.number} — ${q.competency}
Question asked: ${q.main_question}
Scoring context: ${q.scoring_context}
Red flags: ${(q.red_flags || []).join(', ')}
`).join('\n')}

FULL INTERVIEW TRANSCRIPT:
${transcript}

SCORING INSTRUCTIONS:
- Score each question 1 to 10 based on the quality of the candidate's answer
- Use the scoring context to determine what a strong answer looks like
- Note any red flags you observed
- Be fair but rigorous — a score of 7 or above means genuinely strong evidence
- A score of 5 or 6 means adequate but not compelling
- A score of 4 or below means weak, vague or missing evidence

Calculate an overall percentage score as a weighted average of all question scores.

Write a 3 to 4 sentence hiring recommendation that summarises the candidate's performance, their strongest areas, any concerns, and whether you would recommend progressing them.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "overall_score": number between 0 and 100,
  "recommendation": "3-4 sentence hiring recommendation",
  "question_scores": [
    {
      "number": 1,
      "competency": "string",
      "score": number between 1 and 10,
      "reasoning": "1-2 sentence explanation of the score",
      "red_flags_observed": ["string"] 
    }
  ],
  "strengths": ["string", "string", "string"],
  "concerns": ["string", "string"]
}`

  try {
    // Score the interview
    const scoreResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: scoringPrompt }]
      })
    })

    const scoreData = await scoreResponse.json()
    if (!scoreResponse.ok) throw new Error(scoreData.error?.message || 'Scoring failed')

    const scoreText = scoreData.content?.[0]?.text || ''
    const scoreClean = scoreText.replace(/```json|```/g, '').trim()
    const scored = JSON.parse(scoreClean)

    // Save to candidate record
    await supabase
      .from('candidates')
      .update({
        interview_transcript: transcript,
        interview_score: scored.overall_score,
        interview_answers: scored,
        interview_recommendation: scored.recommendation,
        interview_completed_at: new Date().toISOString()
      })
      .eq('id', candidate.id)

    // Send recruiter notification email
    if (job) {
      await sendRecruiterNotification(candidate, job, scored)
    }

    return res.status(200).json({ success: true, score: scored.overall_score })

  } catch (err: any) {
    console.error('Score interview error:', err)

    // Still mark as completed even if scoring fails
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

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    
    <div style="background: linear-gradient(135deg, #0f0c29, #302b63); borderRadius: 16px; padding: 28px; margin-bottom: 16px; text-align: center; border-radius: 16px;">
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
    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Strengths</div>
      ${scored.strengths.map((s: string) => `<div style="font-size: 13px; color: #1D9E75; padding: 4px 0; display: flex; gap: 8px;"><span>✓</span><span>${s}</span></div>`).join('')}
    </div>` : ''}

    ${scored.concerns?.length > 0 ? `
    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #ebebeb;">
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Concerns</div>
      ${scored.concerns.map((c: string) => `<div style="font-size: 13px; color: #E24B4A; padding: 4px 0; display: flex; gap: 8px;"><span>⚠</span><span>${c}</span></div>`).join('')}
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
      <div style="font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Candidate contact</div>
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
