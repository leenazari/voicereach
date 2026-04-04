import { Resend } from 'resend'
import ical from 'ical-generator'
import { Candidate } from './supabase'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL || 'outreach@voicereach.co.uk'
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
  voiceNoteUrl: string,
  voiceNoteBuffer: Buffer,
  audioSizeMb: number
): Promise<{ token: string }> {
  const token = generateInterviewToken()
  const interviewLink = buildInterviewLink(token)
  const firstName = candidate.name.split(' ')[0]
  const calendarIcs = buildCalendarInvite(candidate, interviewLink)

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">

  <div style="margin-bottom: 28px;">
    <p style="font-size: 13px; color: #888; margin: 0 0 6px;">Personal message for ${candidate.name}</p>
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 4px;">${candidate.job_title || candidate.role_applied}</h1>
    ${candidate.job_salary ? `<p style="font-size: 15px; color: #534AB7; margin: 0; font-weight: 500;">${candidate.job_salary}</p>` : ''}
  </div>

  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px;">Hi ${firstName}, we have left you a personal voice message about an opportunity we think is perfect for you. Hit play below to listen.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${voiceNoteUrl}" style="display: inline-block; background: #534AB7; color: white; padding: 16px 36px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
      ▶&nbsp;&nbsp;Play your personal voice note
    </a>
    <p style="font-size: 12px; color: #aaa; margin: 10px 0 0;">Tap to listen — less than 30 seconds</p>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">

  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 20px;">Ready to go for it? Click below to start your interview right now. It takes less than 10 minutes and you can do it straight away or schedule it for a time that suits you.</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${interviewLink}" style="display: inline-block; background: #1D9E75; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 15px;">
      Book your interview →
    </a>
    <p style="font-size: 12px; color: #aaa; margin: 10px 0 0;">Link valid for 24 hours</p>
  </div>

  <div style="background: #f9f9f9; border-radius: 10px; padding: 14px 18px; margin: 24px 0;">
    <p style="font-size: 13px; color: #555; margin: 0;">📅 <strong>Prefer to schedule?</strong> Open the calendar invite attached to this email to book your interview at a time that works for you.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
  <p style="font-size: 12px; color: #bbb; margin: 0; text-align: center;">Sent by VoiceReach · Personalised for ${candidate.name}</p>
</body>
</html>`

  const attachments: any[] = [
    {
      filename: 'interview-invite.ics',
      content: Buffer.from(calendarIcs).toString('base64'),
      type: 'text/calendar',
      disposition: 'attachment'
    }
  ]

  await resend.emails.send({
    from: FROM,
    to: candidate.email,
    subject: `${firstName}, we have a personal message for you`,
    html,
    attachments
  })

  return { token }
}
