import { GetServerSideProps } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

type Props = {
  candidate: { name: string; job_title: string; job_salary: string } | null
  expired: boolean
  token: string
}

export default function InterviewPage({ candidate, expired, token }: Props) {
  if (!candidate || expired) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏱</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>This link has expired</h1>
        <p style={{ color: '#666', fontSize: 15 }}>Interview links are valid for 24 hours. Please contact us to get a new link.</p>
      </main>
    )
  }

  const firstName = candidate.name.split(' ')[0]

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🎙</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Hi {firstName}, ready for your interview?</h1>
        <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6 }}>
          You've been invited to interview for <strong>{candidate.job_title}</strong>
          {candidate.job_salary && <> at <strong>{candidate.job_salary}</strong></>}.
        </p>
      </div>

      <div style={{ background: '#f5f4ff', borderRadius: 12, padding: 20, marginBottom: 24, borderLeft: '3px solid #534AB7' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', marginBottom: 8 }}>Before you start</p>
        <ul style={{ fontSize: 14, color: '#444', lineHeight: 2, paddingLeft: 16 }}>
          <li>Find a quiet place with good lighting</li>
          <li>Allow microphone and camera access</li>
          <li>The interview takes around 15–20 minutes</li>
          <li>You can pause and resume at any time</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <a
          href={`https://cal.com/${process.env.NEXT_PUBLIC_CALCOM_USERNAME}`}
          style={{ display: 'inline-block', background: '#534AB7', color: 'white', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 16 }}
        >
          Start interview now →
        </a>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa' }}>
        Or <a href={`https://cal.com/${process.env.NEXT_PUBLIC_CALCOM_USERNAME}`} style={{ color: '#534AB7' }}>schedule for a specific time</a>
      </p>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = params?.token as string

  const { data: candidate } = await supabaseAdmin
    .from('candidates')
    .select('name, job_title, job_salary, status, updated_at')
    .eq('interview_token', token)
    .single()

  if (!candidate) {
    return { props: { candidate: null, expired: false, token } }
  }

  // Check if link expired (24 hours)
  const updatedAt = new Date(candidate.updated_at)
  const expiryHours = parseInt(process.env.INTERVIEW_LINK_EXPIRY_HOURS || '24')
  const expired = Date.now() - updatedAt.getTime() > expiryHours * 60 * 60 * 1000

  // Update status to interview_booked if first visit
  if (!expired && candidate.status === 'voice_sent') {
    await supabaseAdmin
      .from('candidates')
      .update({ status: 'interview_booked' })
      .eq('interview_token', token)
  }

  return {
    props: {
      candidate: {
        name: candidate.name,
        job_title: candidate.job_title || '',
        job_salary: candidate.job_salary || ''
      },
      expired,
      token
    }
  }
}
