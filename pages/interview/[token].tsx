import { GetServerSideProps } from 'next'
import { createClient } from '@supabase/supabase-js'
import { useState, useRef, useEffect } from 'react'
import React from 'react'

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
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  function togglePlay() {
    if (!candidate?.voice_note_url) return
    if (!audioRef.current) {
      const a = new Audio(candidate.voice_note_url)
      audioRef.current = a
      a.onended = () => { setPlaying(false); setProgress(0) }
      a.ontimeupdate = () => setProgress(a.currentTime / (a.duration || 1))
      a.onloadedmetadata = () => setDuration(a.duration)
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  function formatTime(s: number) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const firstName = candidate?.name.split(' ')[0] || ''
  const displayJob = job || {
    title: candidate?.job_title || 'Exciting Opportunity',
    company: '',
    location: '',
    salary: candidate?.job_salary || '',
    description: '',
    required_skills: [],
    logo_url: null,
    sector: ''
  }

  const SorryPage = ({ message }: { message: string }) => (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 24 } as React.CSSProperties}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' } as React.CSSProperties}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>😔</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.5px' }}>This role has been filled</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>{message}</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>We have plenty more opportunities though!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties}>
            <a href="tel:07545812308" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '12px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 } as React.CSSProperties}>📞 07545 812308</a>
            <a href="mailto:lee.nazari@gmail.com" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', color: 'white', padding: '12px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 } as React.CSSProperties}>✉ lee.nazari@gmail.com</a>
          </div>
        </div>
      </div>
    </main>
  )

  if (notFound || !candidate) return <SorryPage message="Sorry, we could not find this opportunity. It may have already been filled or the link may be incorrect." />
  if (expired) return <SorryPage message="This link has expired and the position has now been filled. But we have plenty of other exciting opportunities that might be perfect for you." />

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(102,126,234,0.4); } 50% { box-shadow: 0 0 40px rgba(102,126,234,0.8), 0 0 60px rgba(118,75,162,0.4); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
          <span style={{ color: 'white' }}>Voice</span>
          <span style={{ background: 'linear-gradient(135deg, #667eea, #f093fb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>Reach</span>
        </div>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: 24 } as React.CSSProperties}>
          {displayJob.logo_url ? (
            <div style={{ display: 'inline-block', background: 'white', borderRadius: 20, padding: 12, marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' } as React.CSSProperties}>
              <img src={displayJob.logo_url} alt={displayJob.company} style={{ width: 72, height: 72, objectFit: 'contain', display: 'block' } as React.CSSProperties} />
            </div>
          ) : (
            <div style={{ width: 88, height: 88, borderRadius: 20, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: 'white', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(102,126,234,0.4)' } as React.CSSProperties}>
              {(displayJob.company || displayJob.title || 'J')[0].toUpperCase()}
            </div>
          )}

          {displayJob.company && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, marginBottom: 10 } as React.CSSProperties}>{displayJob.company}</div>
          )}

          <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 16 }}>
            {displayJob.title}
          </h1>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 } as React.CSSProperties}>
            {displayJob.salary && (
              <span style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: 'white', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>
                💰 {displayJob.salary}
              </span>
            )}
            {displayJob.location && (
              <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500 }}>
                📍 {displayJob.location}
              </span>
            )}
            {displayJob.sector && (
              <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500 }}>
                ◎ {displayJob.sector}
              </span>
            )}
          </div>
        </div>

        {/* PERSONAL MESSAGE + PLAY */}
        <div style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))', border: '1px solid rgba(102,126,234,0.3)', borderRadius: 24, padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,126,234,0.15), transparent)', pointerEvents: 'none' } as React.CSSProperties} />

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>
              Hey {firstName}! 👋
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7 }}>
              We have got a personal message for you about this opportunity. Hit play below to hear exactly why we think you are the perfect fit!
            </p>
          </div>

          {/* PLAY BUTTON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: '16px 20px' } as React.CSSProperties}>
            <button
              onClick={togglePlay}
              style={{ width: 64, height: 64, borderRadius: '50%', background: playing ? 'linear-gradient(135deg, #f5576c, #f093fb)' : 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: playing ? 'glow 2s ease-in-out infinite' : 'pulse 3s ease-in-out infinite', transition: 'all 0.3s' } as React.CSSProperties}
            >
              {playing ? (
                <div style={{ display: 'flex', gap: 4 } as React.CSSProperties}>
                  <div style={{ width: 4, height: 18, background: 'white', borderRadius: 2 }} />
                  <div style={{ width: 4, height: 18, background: 'white', borderRadius: 2 }} />
                </div>
              ) : (
                <div style={{ width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: '20px solid white', marginLeft: 4 }} />
              )}
            </button>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                {playing ? 'Playing your personal message...' : 'Play your personal voice message'}
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 } as React.CSSProperties}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: 'linear-gradient(90deg, #667eea, #f093fb)', borderRadius: 4, transition: 'width 0.1s' }} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {playing ? formatTime((audioRef.current?.currentTime || 0)) : 'Tap to play'} {duration > 0 ? `/ ${formatTime(duration)}` : ''}
              </div>
            </div>

            {playing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 } as React.CSSProperties}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ width: 3, borderRadius: 2, background: `hsl(${220 + i * 20}, 80%, 70%)`, animation: `wave 0.8s ease-in-out infinite`, animationDelay: `${i * 0.12}s`, height: 24 }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JOB DESCRIPTION */}
        {displayJob.description && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14 } as React.CSSProperties}>About the role</div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-line' } as React.CSSProperties}>{displayJob.description}</p>
          </div>
        )}

        {/* REQUIRED SKILLS */}
        {(displayJob.required_skills || []).length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14 } as React.CSSProperties}>What they are looking for</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 } as React.CSSProperties}>
              {(displayJob.required_skills || []).map((skill, i) => (
                <span key={skill} style={{ fontSize: 13, background: `linear-gradient(135deg, hsla(${200 + i * 25}, 70%, 50%, 0.2), hsla(${220 + i * 25}, 70%, 50%, 0.2))`, border: `1px solid hsla(${200 + i * 25}, 70%, 60%, 0.3)`, color: `hsl(${200 + i * 25}, 80%, 75%)`, padding: '6px 14px', borderRadius: 100, fontWeight: 500 }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)', borderRadius: 24, padding: '32px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent)', pointerEvents: 'none' } as React.CSSProperties} />
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10 } as React.CSSProperties}>🚀 This role is moving fast</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'white', marginBottom: 10, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            Ready to go for it, {firstName}?
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 28, lineHeight: 1.6 }}>
            Book your interview now — it takes less than 10 minutes and you can do it around your schedule. Do not let this one slip away!
          </p>
          
            href={calUrl}
            style={{ display: 'inline-block', background: 'white', color: '#5a4fcf', padding: '18px 48px', borderRadius: 14, textDecoration: 'none', fontWeight: 900, fontSize: 17, letterSpacing: '-0.3px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', animation: 'float 3s ease-in-out infinite' } as React.CSSProperties}
          >
            Claim this opportunity →
          </a>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 14 }}>
            Pick a time that works for you — no pressure
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)' } as React.CSSProperties}>
          Powered by VoiceReach · voicereach.co.uk
        </div>
      </div>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const token = params?.token as string
  const calUrl = process.env.NEXT_PUBLIC_CALCOM_URL || 'https://cal.com/lee-nazari-ohfnvf/15min'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
