import { GetServerSideProps } from 'next'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Props = {
  candidate: {
    name: string
    job_title: string
    job_salary: string
    voice_note_url: string
  } | null
  job: {
    title: string
    company: string
    location: string
    salary: string
    description: string
    required_skills: string[]
    logo_url: string | null
    sector: string
  } | null
  expired: boolean
  notFound: boolean
  calUrl: string
}

export default function InterviewPage({ candidate, job, expired, notFound, calUrl }: Props) {

  const [playing, setPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  function togglePlay() {
    if (playing && audio) {
      audio.pause()
      setPlaying(false)
      return
    }
    if (candidate?.voice_note_url) {
      const a = new Audio(candidate.voice_note_url)
      setAudio(a)
      a.play()
      setPlaying(true)
      a.onended = () => setPlaying(false)
    }
  }

  const ContactBox = () => (
    <div style={{ background: '#f5f4ff', borderRadius: 12, padding: '20px 24px', marginTop: 28, textAlign: 'left', borderLeft: '3px solid #534AB7' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#534AB7', marginBottom: 8 }}>Looking for something new?</p>
      <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>
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
      <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 520, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>😔</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Unfortunately this job has been filled</h1>
        <p style={{ color: '#888', fontSize: 15, lineHeight: 1.7 }}>
          We are sorry you missed out on this one. The position has already been filled but we have plenty more opportunities that might be perfect for you.
        </p>
        <ContactBox />
      </main>
    )
  }

  if (expired) {
    return (
      <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 520, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff8ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>⏱</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Unfortunately this job has been filled</h1>
        <p style={{ color: '#888', fontSize: 15, lineHeight: 1.7 }}>
          This link has expired and the position has now been filled. But we may have other great opportunities that suit your experience.
        </p>
        <ContactBox />
      </main>
    )
  }

  const firstName = candidate.name.split(' ')[0]
  const displayJob = job || { title: candidate.job_title, company: '', location: '', salary: candidate.job_salary, description: '', required_skills: [], logo_url: null, sector: '' }

  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', minHeight: '100vh', background: '#f5f5f7' }}>

      {/* HEADER */}
      <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' }}>
          Voice<span style={{ color: '#534AB7' }}>Reach</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>

        {/* COMPANY HEADER */}
        <div style={{ background: 'white', borderRadius: 16, padding: '28px', marginBottom: 20, border: '1px solid #ebebeb', textAlign: 'center' }}>
          {displayJob.logo_url ? (
            <img src={displayJob.logo_url} alt={displayJob.company} style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'contain', border: '1px solid #f0f0f0', background: 'white', marginBottom: 16 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 14, background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#534AB7', margin: '0 auto 16px' }}>
              {(displayJob.company || displayJob.title || 'J')[0].toUpperCase()}
            </div>
          )}
          {displayJob.company && <div style={{ fontSize: 14, color: '#888', marginBottom: 6 }}>{displayJob.company}</div>}
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 10, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{displayJob.title}</h1>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {displayJob.salary && <span style={{ fontSize: 14, color: '#534AB7', fontWeight: 600 }}>💰 {displayJob.salary}</span>}
            {displayJob.location && <span style={{ fontSize: 14, color: '#888' }}>📍 {displayJob.location}</span>}
            {displayJob.sector && <span style={{ fontSize: 14, color: '#888' }}>◎ {displayJob.sector}</span>}
          </div>
        </div>

        {/* PERSONAL MESSAGE */}
        <div style={{ background: 'white', borderRadius: 16, padding: '28px', marginBottom: 20, border: '1px solid #ebebeb' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Hi {firstName} 👋</div>
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, marginBottom: 20 }}>
            We have a personal voice message for you about this opportunity. Hit play to hear why we think you are a great fit for this role.
          </p>

          {/* PLAY BUTTON */}
          <div style={{ background: '#f5f4ff', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={togglePlay} style={{ width: 56, height: 56, borderRadius: '50%', background: playing ? '#E24B4A' : '#534AB7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(83,74,183,0.3)' }}>
              {playing ? (
                <div style={{ width: 14, height: 14, background: 'white', borderRadius: 2, boxShadow: '6px 0 0 white' }} />
              ) : (
                <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '18px solid white', marginLeft: 4 }} />
              )}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>
                {playing ? 'Playing your personal message...' : 'Play your personal voice message'}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {playing ? 'Tap to pause' : 'Tap to hear why you are perfect for this role'}
              </div>
            </div>
            {playing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ width: 3, borderRadius: 2, background: '#534AB7', animation: `wave 1s ease-in-out infinite`, animationDelay: `${i * 0.1}s`, height: `${20 + Math.sin(i) * 10}px` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JOB DESCRIPTION */}
        {displayJob.description && (
          <div style={{ background: 'white', borderRadius: 16, padding: '28px', marginBottom: 20, border: '1px solid #ebebeb' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>About the role</div>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{displayJob.description}</p>
          </div>
        )}

        {/* REQUIRED SKILLS */}
        {(displayJob.required_skills || []).length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: '28px', marginBottom: 20, border: '1px solid #ebebeb' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>What they are looking for</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(displayJob.required_skills || []).map(skill => (
                <span key={skill} style={{ fontSize: 13, background: '#EEEDFE', color: '#534AB7', padding: '6px 14px', borderRadius: 100, fontWeight: 500 }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* BOOK INTERVIEW */}
        <div style={{ background: '#534AB7', borderRadius: 16, padding: '28px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Ready to go for it, {firstName}?</div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 24, lineHeight: 1.6 }}>
            Book your interview now. It takes less than 10 minutes and you can do it around your schedule. But do not wait too long — this role is moving fast.
          </p>
          <a href={calUrl} style={{ display: 'inline-block', background: 'white', color: '#534AB7', padding: '15px 40px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            Book my interview now →
          </a>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>Pick a time that works for you</div>
        </div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', fontSize: 12, color: '#ccc', paddingBottom: 40 }}>
          Powered by VoiceReach · voicereach.co.uk
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = params?.token as string
  const calUrl = process.env.NEXT_PUBLIC_CALCOM_URL || 'https://cal.com/lee-nazari-ohfnvf/15min'

  try {
    const { data: candidate, error } = await supabaseAdmin
      .from('candidates')
      .select('name, job_title, job_salary, status, updated_at, voice_note_url, job_id')
      .eq('interview_token', token)
      .single()

    if (error || !candidate) {
      return { props: { candidate: null, job: null, expired: false, notFound: true, calUrl } }
    }

    const updatedAt = new Date(candidate.updated_at)
    const expiryHours = parseInt(process.env.INTERVIEW_LINK_EXPIRY_HOURS || '24')
    const expired = Date.now() - updatedAt.getTime() > expiryHours * 60 * 60 * 1000

    let job = null
    if (candidate.job_id) {
      const { data: jobData } = await supabaseAdmin
        .from('jobs')
        .select('title, company, location, salary, description, required_skills, logo_url, sector')
        .eq('id', candidate.job_id)
        .single()
      job = jobData
    }

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
          job_salary: candidate.job_salary || '',
          voice_note_url: candidate.voice_note_url || ''
        },
        job,
        expired,
        notFound: false,
        calUrl
      }
    }
  } catch {
    return { props: { candidate: null, job: null, expired: false, notFound: true, calUrl } }
  }
}
