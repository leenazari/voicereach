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

function buildDirectInterviewLink(jobId: string | null): string {
  return jobId ? `${APP_URL}/interview/apply/${jobId}` : ''
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
    summary: `Interview - ${candidate.job_title || candidate.role_applied}`,
    description: `Your interview link: ${interviewLink}\n\nClick the link to start your AI interview or schedule for later.`,
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
  const directInterviewLink = buildDirectInterviewLink(candidate.job_id)
  const firstName = candidate.name.split(' ')[0]
  const calendarIcs = buildCalendarInvite(candidate, interviewLink)
  const jobTitle = candidate.job_title || candidate.role_applied

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 0; color: #1a1a1a; background: #ffffff;">

  <!-- HERO HEADER -->
  <div style="background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); padding: 40px 32px; text-align: center; border-radius: 0 0 24px 24px;">
    <div style="font-size: 22px; font-weight: 800; color: white; margin-bottom: 20px; letter-spacing: -0.5px;">
      Voice<span style="color: #a78bfa;">Reach</span>
    </div>
    <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.5px;">Personal message for</p>
    <h1 style="font-size: 26px; font-weight: 900; color: white; margin: 0 0 6px; letter-spacing: -0.5px;">${firstName}</h1>
    <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin: 0 0 20px;">${jobTitle}${candidate.job_salary ? ` · ${candidate.job_salary}` : ''}</p>

    <!-- PLAY BUTTON -->
    <a href="${interviewLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 17px; letter-spacing: 0.3px; box-shadow: 0 8px 24px rgba(102,126,234,0.4);">
      &#9654;&nbsp;&nbsp;Play your personal message
    </a>
    <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 12px 0 0;">Tap to hear why we think you are the perfect fit</p>
  </div>

  <!-- BODY -->
  <div style="padding: 32px 32px 0;">
    <p style="font-size: 15px; line-height: 1.8; color: #444; margin: 0 0 24px;">
      Hi ${firstName}! We have got an exciting opportunity that we think is absolutely perfect for you. We have recorded a personal voice message explaining exactly why. Hit play above to hear it!
    </p>

    <!-- URGENCY BOX -->
    <div style="background: linear-gradient(135deg, #f093fb22, #667eea22); border: 1px solid #667eea44; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #534AB7; font-weight: 700; margin: 0 0 6px;">🚀 Interviews have already started</p>
      <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">They are actively interviewing right now and spaces are filling up fast. Your interview link is waiting. Do not let this one slip away.</p>
    </div>

    <!-- START INTERVIEW BUTTON -->
    <div style="background: linear-gradient(135deg, #1D9E75, #0d7a5a); border-radius: 16px; padding: 24px; margin-bottom: 16px; text-align: center;">
      <p style="font-size: 13px; color: rgba(255,255,255,0.8); margin: 0 0 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🎙 AI Interview</p>
      <p style="font-size: 15px; color: white; font-weight: 700; margin: 0 0 16px; line-height: 1.5;">
        Ready to interview for ${jobTitle}?<br/>
        <span style="font-size: 13px; font-weight: 400; opacity: 0.8;">Takes around 9 minutes. Start now or schedule for later.</span>
      </p>
      <a href="${directInterviewLink || interviewLink}" style="display: inline-block; background: white; color: #1D9E75; padding: 14px 36px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 16px; letter-spacing: -0.3px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); margin-bottom: 10px;">
        Start my interview →
      </a>
      ${interviewLink ? `<br/><a href="${interviewLink}" style="display: inline-block; background: transparent; color: rgba(255,255,255,0.8); padding: 8px 20px; border-radius: 50px; text-decoration: none; font-weight: 500; font-size: 13px; border: 1px solid rgba(255,255,255,0.4); margin-top: 8px;">
        🎧 Play voice note first
      </a>` : ''}
      <p style="font-size: 11px; color: rgba(255,255,255,0.6); margin: 10px 0 0;">AI powered · No download needed · Go straight in</p>
    </div>

    <!-- SCHEDULE OPTION -->
    <div style="background: #f9f9f9; border-radius: 10px; padding: 14px 18px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 13px; color: #555; margin: 0 0 10px;">📅 <strong>Prefer to schedule?</strong> Pick a time that suits you.</p>
      <a href="${interviewLink}" style="display: inline-block; background: white; color: #534AB7; padding: 10px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 13px; border: 1px solid #534AB7;">
        Schedule for later
      </a>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="padding: 20px 32px 32px; border-top: 1px solid #eee; text-align: center;">
    <p style="font-size: 12px; color: #bbb; margin: 0 0 8px;">Sent by VoiceReach · Personalised for ${candidate.name}</p>
    <p style="font-size: 11px; color: #ccc; margin: 0;">
      You are receiving this because a recruiter identified you as a potential fit for this role.<br/>
      <a href="mailto:outreach@voicereach.co.uk?subject=Unsubscribe&body=Please remove me from future outreach" style="color: #ccc;">Unsubscribe</a>
    </p>
  </div>

</body>
</html>`

  const text = `Hi ${firstName}, I recorded a personal message for you about a ${jobTitle} role. Listen and start your interview here: ${interviewLink}`

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
    subject: `${firstName}, I recorded a personal message for you`,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<mailto:outreach@voicereach.co.uk?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    attachments
  })

  return { token }
}
