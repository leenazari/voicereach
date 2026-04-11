import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'
import { useState, useRef } from 'react'
import React from 'react'
import InterviewPanel from '../../../components/InterviewPanel'

type Props = {
  job: {
    id: string
    title: string
    company: string
    location: string
    salary: string
    description: string
    required_skills: string[]
    logo_url: string | null
    sector: string
  } | null
  pack: {
    agent_name: string
    question_count: number
  } | null
  notFound: boolean
  jobClosed: boolean
}

export default function ApplyPage({ job, pack, notFound, jobClosed }: Props) {
  const [screen, setScreen] = useState<'form' | 'interview' | 'complete'>('form')
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interviewToken, setInterviewToken] = useState<string | null>(null)
  const [interviewError, setInterviewError] = useState<string | null>(null)
  const [candidateName, setCandidateName] = useState('')

  async function handleStart() {
    if (!form.name.trim()) { setError('Please enter your name'); return }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please enter a valid email'); return }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/create-interview-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          jobId: job?.id
        })
      })
      const data = await res.json()
      if (!res.ok || !data.token) {
        setError(data.error || 'Could not start interview — please try again')
        return
      }
      setCandidateName(form.name.trim())
      setInterviewToken(data.token)
      setScreen('interview')
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete(transcript: string) {
    setScreen('complete')
    if (interviewToken) {
      await fetch('/api/score-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: interviewToken, transcript })
      })
    }
  }

  const firstName = (candidateName || form.name).split(' ')[0]

  const SorryPage = ({ message }: { message: string }) => (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>😔</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 16 }}>This role is no longer available</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.7 }}>{message}</p>
      </div>
    </main>
  )

  if (notFound || !job) return <SorryPage message="Sorry, we could not find this opportunity. It may have already been filled or the link may be incorrect." />
  if (jobClosed) return <SorryPage message="Unfortunately this role has been filled. We hope to have more opportunities available soon." />

  const ogTitle = job ? `${job.title} at ${job.company}` : 'Voice Interview'
  const ogDescription = job
    ? `${job.salary ? job.salary + ' · ' : ''}${job.location ? job.location + ' · ' : ''}Apply via a quick 10-minute voice interview. No CV needed.`
    : 'You have been invited to a voice interview.'

  const ogImageParams = new URLSearchParams({
    title: job?.title || '',
    company: job?.company || '',
    salary: job?.salary || '',
    location: job?.location || '',
    logo: job?.logo_url || '',
  })
  const ogImage = `https://voicereach.co.uk/api/og-image?${ogImageParams.toString()}`

  return (
    <>
    <Head>
      <title>{ogTitle}</title>
      <meta name="description" content={ogDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Voice Reach" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
          <span style={{ color: 'white' }}>Voice</span>
          <span style={{ background: 'linear-gradient(135deg, #667eea, #f093fb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>Reach</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* JOB HERO */}
        <div style={{ textAlign: 'center', marginBottom: 28 } as React.CSSProperties}>
          {job.logo_url ? (
            <div style={{ display: 'inline-block', background: 'white', borderRadius: 20, padding: 16, marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' } as React.CSSProperties}>
              <img src={job.logo_url} alt={job.company} style={{ width: 72, height: 72, objectFit: 'contain', display: 'block' } as React.CSSProperties} />
            </div>
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(102,126,234,0.4)' } as React.CSSProperties}>
              {(job.company || job.title)[0].toUpperCase()}
            </div>
          )}
          {job.company && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, marginBottom: 8 } as React.CSSProperties}>{job.company}</div>
          )}
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 12 }}>{job.title}</h1>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } as React.CSSProperties}>
            {job.salary && <span style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: 'white', padding: '5px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>💰 {job.salary}</span>}
            {job.location && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '5px 14px', borderRadius: 100, fontSize: 13 }}>📍 {job.location}</span>}
          </div>
        </div>

        {/* FORM SCREEN */}
        {screen === 'form' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 } as React.CSSProperties}>AI Interview</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8 }}>Apply for this role</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 20 }}>
                Enter your details below to start your AI interview with {pack?.agent_name || 'Alex'}. The interview takes around 9 minutes and covers {pack?.question_count || 6} questions.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 } as React.CSSProperties}>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Full name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Sarah Mitchell"
                    autoFocus
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. sarah@email.com"
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Phone number <span style={{ opacity: 0.5 }}>(optional)</span></label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 07700 900000"
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                  />
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(226,75,74,0.15)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginTop: 12 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={submitting}
                style={{ width: '100%', marginTop: 20, padding: '16px', background: submitting ? 'rgba(255,255,255,0.2)' : 'white', color: submitting ? 'rgba(255,255,255,0.5)' : '#302b63', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 } as React.CSSProperties}
              >
                {submitting ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                    Setting up your interview...
                  </>
                ) : 'Start my interview →'}
              </button>

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 12 }}>
                🎤 Microphone required · Takes around 9 minutes · AI powered
              </div>
            </div>

            {/* WHAT TO EXPECT */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 } as React.CSSProperties}>What to expect</div>
              {[
                { icon: '🎙', text: `${pack?.agent_name || 'Alex'} will guide you through ${pack?.question_count || 6} structured questions` },
                { icon: '⏱', text: 'The whole interview takes around 9 minutes' },
                { icon: '🔇', text: 'Find a quiet place before you start' },
                { icon: '🤖', text: 'Your answers are scored automatically by AI' },
                { icon: '📧', text: 'The hiring team will review and be in touch soon' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 4 ? 10 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INTERVIEW SCREEN */}
        {screen === 'interview' && interviewToken && (
          <div style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1))', border: '1px solid rgba(102,126,234,0.2)', borderRadius: 24, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 4 }}>{job.title} — AI Interview</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {pack?.agent_name || 'Alex'} · {pack?.question_count || 6} questions · ~9 minutes
              </div>
            </div>
            {interviewError ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 14, color: '#E24B4A', marginBottom: 16 }}>{interviewError}</div>
                <button onClick={() => { setInterviewError(null); setScreen('form') }} style={{ padding: '10px 24px', background: 'white', color: '#302b63', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Go back
                </button>
              </div>
            ) : (
              <InterviewPanel
                token={interviewToken}
                candidateName={candidateName}
                jobTitle={job.title}
                agentName={pack?.agent_name || 'Alex'}
                questionCount={pack?.question_count || 6}
                onComplete={handleComplete}
                onError={err => setInterviewError(err)}
              />
            )}
          </div>
        )}

        {/* COMPLETE SCREEN */}
        {screen === 'complete' && (
          <div style={{ background: 'linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 24, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 10, letterSpacing: '-0.3px' }}>Interview complete, {firstName}!</div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 24 }}>
              Thank you for completing your interview for <strong style={{ color: 'white' }}>{job.title}</strong>
              {job.company ? ` at ${job.company}` : ''}. The hiring team will review and be in touch soon.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 20px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
              We aim to get back to all candidates within 2 working days.
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.2)' } as React.CSSProperties}>
          Powered by VoiceReach · voicereach.co.uk
        </div>
      </div>
    </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const jobId = params?.jobId as string

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('id, title, company, location, salary, description, required_skills, logo_url, sector, status')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return { props: { job: null, pack: null, notFound: true, jobClosed: false } }
    }

    if (job.status === 'closed') {
      return { props: { job: null, pack: null, notFound: false, jobClosed: true } }
    }

    const { data: pack } = await supabase
      .from('interview_packs')
      .select('agent_name, questions')
      .eq('job_id', jobId)
      .eq('status', 'active')
      .single()

    return {
      props: {
        job,
        pack: pack ? {
          agent_name: pack.agent_name || 'Alex',
          question_count: pack.questions?.questions?.length || 6
        } : null,
        notFound: false,
        jobClosed: false
      }
    }
  } catch {
    return { props: { job: null, pack: null, notFound: true, jobClosed: false } }
  }
}
