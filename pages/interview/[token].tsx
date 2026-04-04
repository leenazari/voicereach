import { GetServerSideProps } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

type Props = {
  candidate: { name: string; job_title: string; job_salary: string } | null
  expired: boolean
  notFound: boolean
  token: string
}

export default function InterviewPage({ candidate, expired, notFound }: Props) {
  const calUrl = process.env.NEXT_PUBLIC_CALCOM_URL || 'https://cal.com/lee-nazari-ohfnvf/15min'

  const ContactBox = () => (
    <div style={{ background: '#f0eeff', borderRadius: 12, padding: '20px 24px', marginTop: 28, textAlign: 'left' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 8 }}>Looking for something new?</p>
      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>
        We always have new opportunities coming in. Get in touch and we will match you with the right role.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="tel:07545812308" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>
          📞 07545 812308
        </a>
        <a href="mailto:lee.nazari@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>
          ✉ lee.nazari@gmail.com
        </a>
        <a href="https://voicereach.co.uk" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>
          🌐 voicereach.co.uk
        </a>
      </div>
    </div>
  )

  if (notFound || !candidate) {
    return (
      <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>😔</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, letterSpacing: '-0.3px' }}>Unfortunately this job has been filled</h1>
        <p style={{ color: '#888', fontSize: 15, lineHeight: 1.7 }}>
          We are sorry you missed out on this one. The position has already been filled but do not worry, we have plenty more opportunities that might be perfect for you.
        </p>
        <ContactBox />
      </main>
    )
  }

  if (expired) {
    return (
      <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 480, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff8ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>⏱</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, letterSpacing: '-0.3px' }}>Unfortunately this job has been filled</h1>
        <p style={{ color: '#888', fontSize: 15, lineHeight: 1.7 }}>
          This link has expired and the position has now been filled. But we may have other great opportunities that suit your experience.
        </p>
        <ContactBox />
      </main>
    )
  }

  const firstName = candidate.name.split(' ')[0]

  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 520, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>🎙</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 10, letterSpacing: '-0.3px' }}>Hi {firstName}, ready for your interview?</h1>
        <p style={{ color: '#666', fontSize: 15, lineHeight: 1.7 }}>
          You have been invited to interview for <strong>{candidate.job_title}</strong>
          {candidate.job_salary && <> at <strong style={{ color: '#534AB7' }}>{candidate.job_salary}</strong></>}.
        </p>
      </div>

      <div style={{ background: '#f5f4ff', borderRadius: 12, padding: '18px 20px', marginBottom: 28, borderLeft: '3px solid #534AB7' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 10 }}>Before you start</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Find a quiet place with good lighting',
            'Allow microphone and camera access when prompted',
            'The interview takes around 15 to 20 minutes',
            'You can pause and resume at any time'
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#444' }}>
              <span style={{ color: '#534AB7', fontWeight: 600, flexShrink: 0 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <a href={calUrl} style={{ display: 'inline-block', background: '#534AB7', color: 'white', padding: '15px 36px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px' }}>
          Book your interview now
        </a>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb' }}>Pick a time that works for you</p>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = params?.token as string

  try {
    const { data: candidate, error } = await supabaseAdmin
      .from('candidates')
      .select('name, job_title, job_salary, status, updated_at')
      .eq('interview_token', token)
      .single()

    if (error || !candidate) {
      return { props: { candidate: null, expired: false, notFound: true, token } }
    }

    const updatedAt = new Date(candidate.updated_at)
    const expiryHours = parseInt(process.env.INTERVIEW_LINK_EXPIRY_HOURS || '24')
    const expired = Date.now() - updatedAt.getTime() > expiryHours * 60 * 60 * 1000

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
        notFound: false,
        token
      }
    }
  } catch {
    return { props: { candidate: null, expired: false, notFound: true, token } }
  }
}
