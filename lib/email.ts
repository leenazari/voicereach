import { Resend } from 'resend'
import ical from 'ical-generator'
import { Candidate } from './supabase'
import { buildScript } from './voice'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL || 'outreach@yourdomain.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function generateInterviewToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function buildInterviewLink(token: string): string {
  return `${APP_URL}/interview/${token}`
}

function buildCalendarInvite(candidate: Candidate, interviewLink: string): string {
  const cal = ical({ name: 'Interview' })
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(10, 0, 0, 0)
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + 45)

  cal.createEvent({
    start,
    end,
    summary: `Interview — ${candidate.job_title || candidate.role_applied}`,
    description: `Your interview link: ${interviewLink}\n\nThis link is valid for 24 hours.`,
    url: interviewLink,
    organizer: { name: 'VoiceReach', email: FROM }
  })

  return cal.toString()
}

export async function sendVoiceOutreachEmail(
  candidate: Candidate,
  voiceNoteBuffer: Buffer,
  audioSizeMb: number
): Promise<{ token: string }> {
  const token = generateInterviewToken()
  const interviewLink = buildInterviewLink(token)
  const firstName = candidate.name.split(' ')[0]
  const script = buildScript(candidate)
  const calendarIcs = buildCalendarInvite(candidate, interviewLink)

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
  <div style="margin-bottom: 32px;">
    <p style="font-size: 13px; color: #888; margin: 0;">Personalized opportunity</p>
    <h1 style="font-size: 22px; font-weight: 600; margin: 8px 0 0;">${candidate.job_title || candidate.role_applied}</h1>
    ${candidate.job_salary ? `<p style="font-size: 16px; color: #534AB7; margin: 4px 0 0; font-weight: 500;">${candidate.job_salary}</p>` : ''}
  </div>

  <p style="font-size: 15px; line-height: 1.7; color: #333;">Hi ${firstName},</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333;">We've recorded a short personal voice note for you — listen to it below. We think you'd be a great fit for this role and would love to have a conversation.</p>

  <div style="background: #f5f4ff; border-radius: 12px; padding: 16px; margin: 24px 0; border-left: 3px solid #534AB7;">
    <p style="font-size: 13px; color: #534AB7; font-weight: 600; margin: 0 0 8px;">Voice note attached</p>
    <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">"${script}"</p>
  </div>

  <div style="margin: 28px 0;">
    <a href="${interviewLink}" style="display: inline-block; background: #534AB7; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Start your interview →</a>
    <p style="font-size: 12px; color: #999; margin: 10px 0 0;">Link valid for 24 hours</p>
  </div>

  <div style="background: #f9f9f9; border-radius: 8px; padding: 14px; margin: 24px 0;">
    <p style="font-size: 13px; color: #555; margin: 0;">📅 <strong>Add to your calendar</strong> — A .ics calendar invite is attached to this email. Open it to schedule your interview reminder at a time that suits you.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
  <p style="font-size: 12px; color: #aaa; margin: 0;">Sent by VoiceReach · This message was personalized for ${candidate.name}</p>
</body>
</html>`

  const attachments: any[] = [
    {
      filename: `voice-note-${firstName.toLowerCase()}.mp3`,
      content: voiceNoteBuffer.toString('base64'),
      type: 'audio/mpeg',
      disposition: 'attachment'
    },
    {
      filename: 'interview-invite.ics',
      content: Buffer.from(calendarIcs).toString('base64'),
      type: 'text/calendar',
      disposition: 'attachment'
    }
  ]

  if (audioSizeMb > 2) {
    console.warn(`Audio file is ${audioSizeMb}mb — may trigger spam filters`)
  }

  await resend.emails.send({
    from: FROM,
    to: candidate.email,
    subject: `${firstName}, we think you're perfect for this role`,
    html,
    attachments
  })

  return { token }
}
