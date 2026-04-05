import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const pricing = {
    annual: [
      { label: 'Free', price: '0', desc: 'Try VoiceReach with no commitment.', features: ['3 voice note credits', 'AI script generation', 'Candidate landing page', 'Email delivery'], btn: 'Start for free', featured: false },
      { label: 'Starter', price: '29', desc: 'For recruiters getting started with voice outreach.', features: ['100 credits/month', 'Everything in Free', 'Custom voice selection', 'Analytics dashboard'], btn: 'Get started', featured: false },
      { label: 'Growth', price: '99', desc: 'For busy recruiters filling roles at volume.', features: ['500 credits/month', 'Everything in Starter', 'Priority support', 'Team collaboration'], btn: 'Get started', featured: true },
      { label: 'Agency', price: '179', desc: 'For agencies managing multiple clients.', features: ['1,000 credits/month', 'Everything in Growth', 'White-label options', 'Dedicated account manager'], btn: 'Get started', featured: false },
      { label: 'Enterprise', price: null, desc: 'Unlimited credits, custom integrations, SLA.', features: ['Unlimited credits', 'Custom integrations', 'SLA guarantee', 'Dedicated support'], btn: 'Contact us', featured: false },
    ],
    monthly: [
      { label: 'Free', price: '0', desc: 'Try VoiceReach with no commitment.', features: ['3 voice note credits', 'AI script generation', 'Candidate landing page', 'Email delivery'], btn: 'Start for free', featured: false },
      { label: 'Starter', price: '35', desc: 'For recruiters getting started with voice outreach.', features: ['100 credits/month', 'Everything in Free', 'Custom voice selection', 'Analytics dashboard'], btn: 'Get started', featured: false },
      { label: 'Growth', price: '119', desc: 'For busy recruiters filling roles at volume.', features: ['500 credits/month', 'Everything in Starter', 'Priority support', 'Team collaboration'], btn: 'Get started', featured: true },
      { label: 'Agency', price: '215', desc: 'For agencies managing multiple clients.', features: ['1,000 credits/month', 'Everything in Growth', 'White-label options', 'Dedicated account manager'], btn: 'Get started', featured: false },
      { label: 'Enterprise', price: null, desc: 'Unlimited credits, custom integrations, SLA.', features: ['Unlimited credits', 'Custom integrations', 'SLA guarantee', 'Dedicated support'], btn: 'Contact us', featured: false },
    ],
  }

  const plans = pricing[billing]

  return (
    <>
      <Head>
        <title>VoiceReach — Get More Candidates to Interview</title>
        <meta name="description" content="VoiceReach automatically generates personalised AI voice notes for every candidate. More responses. More interviews booked." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        :root {
          --black: #0a0a0a;
          --white: #ffffff;
          --purple: #534AB7;
          --purple-light: #7B73D4;
          --green: #1D9E75;
          --cream: #F5F3EE;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--black);
          color: var(--white);
          overflow-x: hidden;
        }
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.8)} }
        @keyframes wave { 0%,100%{transform:scaleY(0.35)} 50%{transform:scaleY(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 900px) {
          nav { padding: 16px 20px !important; }
          .nav-links { display: none !important; }
          .hero { padding: 100px 20px 60px !important; }
          .stats-bar { flex-direction: column !important; }
          .stats-bar > div { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
          .problem-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .example-inner { grid-template-columns: 1fr !important; gap: 32px !important; }
          .results-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-inner { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
          .section { padding: 60px 20px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        background: 'rgba(10,10,10,0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
          Voice<span style={{ color: 'var(--purple-light)' }}>Reach</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[['#problem', 'The problem'], ['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >{label}</a>
          ))}
        </div>
        <Link href="/signup" style={{
          background: 'var(--purple)', color: 'white', border: 'none',
          padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textDecoration: 'none', transition: 'background 0.2s',
        }}>Get started free</Link>
      </nav>

      {/* HERO */}
      <section className="hero" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(83,74,183,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(83,74,183,0.15)', border: '1px solid rgba(83,74,183,0.4)',
          padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500,
          color: 'var(--purple-light)', marginBottom: 32,
          animation: 'fadeUp 0.6s ease both',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
          Built for recruiters who want more interviews booked
        </div>

        <h1 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 'clamp(42px, 7vw, 78px)',
          fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1px',
          maxWidth: 920, animation: 'fadeUp 0.6s 0.1s ease both',
        }}>
          Book more interviews<br />with <span style={{ color: 'var(--purple-light)' }}>personalised</span><br />voice notes.
        </h1>

        <p style={{
          fontSize: 'clamp(17px, 2.5vw, 20px)', color: 'rgba(255,255,255,0.55)',
          maxWidth: 580, lineHeight: 1.65, marginTop: 24,
          animation: 'fadeUp 0.6s 0.2s ease both',
        }}>
          VoiceReach automatically generates a personalised AI voice note for every candidate, referencing their CV, their experience and the specific role. Choose your voice, set the personality, and let it do the work. More responses. More interviews booked.
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 40,
          animation: 'fadeUp 0.6s 0.3s ease both', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <Link href="/signup" style={{
            background: 'var(--purple)', color: 'white', border: 'none',
            padding: '15px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>Start free — 3 voice notes on us →</Link>
          <a href="#how" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>See how it works ↓</a>
        </div>

        {/* Stats bar */}
        <div className="stats-bar" style={{
          display: 'flex', width: '100%', marginTop: 72,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          animation: 'fadeUp 0.6s 0.4s ease both',
        }}>
          {[
            { n: '3x', label: 'More replies vs cold email' },
            { n: '60s', label: 'To generate a voice note' },
            { n: '89%', label: 'Open rate on voice messages' },
            { n: '5min', label: 'To set up your first campaign' },
          ].map(({ n, label }, i) => (
            <div key={label} style={{
              padding: '28px 0', textAlign: 'center', flex: 1,
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 36, fontWeight: 800, letterSpacing: '-1px', color: 'var(--purple-light)' }}>{n}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Audio demo */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '24px 28px', maxWidth: 520, margin: '52px auto 0',
          display: 'flex', alignItems: 'center', gap: 18,
          animation: 'fadeUp 0.6s 0.5s ease both',
        }}>
          <button onClick={toggleAudio} style={{
            width: 50, height: 50, flexShrink: 0, background: 'var(--purple)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: 'none', transition: 'all 0.2s',
          }}>
            {playing
              ? <span style={{ fontSize: 16, color: 'white' }}>⏸</span>
              : <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '14px solid white', marginLeft: 3 }} />
            }
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Sample voice note — Sarah, Software Engineer</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Personalised from CV in 60 seconds</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
            {[35, 65, 90, 50, 80, 40, 70, 55].map((h, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: playing ? 'var(--purple-light)' : 'rgba(83,74,183,0.7)',
                height: `${h}%`,
                animation: playing ? `wave 1.4s ease-in-out infinite` : 'none',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, background: 'rgba(29,158,117,0.2)',
            color: 'var(--green)', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap',
          }}>LIVE</span>
        </div>
        <audio ref={audioRef} src="/sample-voice-note.mp3" onEnded={() => setPlaying(false)} />
      </section>

      {/* PROBLEM */}
      <section id="problem" className="section" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>The problem</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>
            Candidates are ignoring your outreach
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 520, marginTop: 14 }}>
            Cold emails get deleted. InMails go unread. Generic templates feel exactly like what they are. The best candidates have options and they know when they are being copy-pasted.
          </p>
        </div>
        <div className="reveal problem-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 52 }}>
          {[
            { emoji: '📭', title: 'Low response rates', desc: 'The average recruiter cold email gets less than 5% response. Your best candidates are completely tuned out.' },
            { emoji: '🤖', title: 'Generic outreach', desc: 'Copy-paste messages with [FIRST NAME] placeholders do nothing to stand out in a crowded inbox.' },
            { emoji: '⏱️', title: 'Time-consuming personalisation', desc: 'Writing genuinely personalised messages for every candidate takes hours you simply do not have.' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 28 }}>
              <span style={{ fontSize: 28, marginBottom: 14, display: 'block' }}>{emoji}</span>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.3px' }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>How it works</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>
            From CV to voice note in minutes
          </h2>
        </div>
        <div className="reveal steps-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginTop: 52,
          background: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden',
        }}>
          {[
            { num: '01', icon: '📋', title: 'Upload the job', desc: 'Add a job description or let VoiceReach generate one from a quick brief.' },
            { num: '02', icon: '📄', title: 'Add candidates', desc: 'Upload CVs individually or in bulk. VoiceReach extracts the key details automatically.' },
            { num: '03', icon: '🎙️', title: 'Generate voice notes', desc: 'AI writes a personalised script for each candidate and converts it to a natural voice note.' },
            { num: '04', icon: '📩', title: 'Send and track', desc: 'Candidates receive a branded landing page with their voice note. You see who listens and who responds.' },
          ].map(({ num, icon, title, desc }) => (
            <div key={num} style={{ background: 'rgba(255,255,255,0.02)', padding: '36px 26px', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(83,74,183,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            >
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 44, fontWeight: 800, color: 'rgba(255,255,255,0.05)', lineHeight: 1, marginBottom: 18 }}>{num}</div>
              <span style={{ fontSize: 26, marginBottom: 14, display: 'block' }}>{icon}</span>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.3px' }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLE SCRIPT */}
      <section style={{ background: 'rgba(83,74,183,0.07)', borderTop: '1px solid rgba(83,74,183,0.15)', borderBottom: '1px solid rgba(83,74,183,0.15)', padding: '80px 48px' }}>
        <div className="example-inner" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div className="reveal" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--purple-light)', marginBottom: 16 }}>Generated script</div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
              "Hi <strong style={{ color: 'var(--purple-light)' }}>Sarah</strong> — I came across your profile and your background in <strong style={{ color: 'var(--purple-light)' }}>React and Node.js</strong> really stood out. We are hiring a Senior Engineer at <strong style={{ color: 'var(--purple-light)' }}>Acme</strong> and I think you would be a genuinely great fit. Interviews are already underway — if this sounds interesting, your personal link is below. Go get it."
            </p>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: 'var(--purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '10px solid white', marginLeft: 2 }} />
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>0:28 — personalised from CV</span>
            </div>
          </div>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '🎯', title: 'References their actual experience', desc: 'Every script pulls real details from the CV. No generic filler, no hallucinated claims.' },
              { icon: '⚡', title: 'Generated in under 60 seconds', desc: 'Upload a CV and a job, click generate. Done. No prompt engineering required.' },
              { icon: '🎙️', title: 'Sounds like a real person', desc: 'Choose a voice, set a tone. The AI delivers it naturally — warm, confident, and urgent.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 44, height: 44, flexShrink: 0, background: 'rgba(83,74,183,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
                <div>
                  <h4 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.2px' }}>{title}</h4>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="section" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>Results</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>Numbers that matter</h2>
        </div>
        <div className="reveal results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 52 }}>
          {[
            { n: '3x', label: 'More interview bookings', desc: 'Recruiters using VoiceReach report three times as many candidates accepting interview slots.' },
            { n: '89%', label: 'Voice note open rate', desc: 'Candidates are far more likely to listen to a personal voice message than open a cold email.' },
            { n: '60s', label: 'Per personalised note', desc: 'What used to take 15 minutes of research and writing now takes less than a minute.' },
            { n: '5min', label: 'Setup time', desc: 'From sign up to your first voice note sent. No complex configuration, no training required.' },
          ].map(({ n, label, desc }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 32, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--purple)' }} />
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 52, fontWeight: 800, color: 'var(--purple-light)', letterSpacing: '-1px', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 8, marginBottom: 10 }}>{label}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>Features</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>
            Everything you need to fill roles faster
          </h2>
        </div>
        <div className="reveal features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 52 }}>
          {[
            { icon: '🎙️', title: 'AI Voice Generation', desc: 'Natural-sounding voices that feel human. Choose from a range of styles and tones.' },
            { icon: '📄', title: 'CV Parsing', desc: 'Upload any PDF CV and let VoiceReach extract skills, experience and achievements automatically.' },
            { icon: '🎯', title: 'Semantic Matching', desc: 'Smart keyword matching ensures every script references what actually matters for the role.' },
            { icon: '📱', title: 'Candidate Landing Page', desc: 'Each candidate gets a branded page with their personal voice note and a one-click response.' },
            { icon: '📊', title: 'Analytics', desc: 'See who listened, who clicked, and who responded. Know exactly where to follow up.' },
            { icon: '✉️', title: 'Email Delivery', desc: 'VoiceReach sends everything for you from a branded domain. Just review and click send.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 26, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,74,183,0.1)'; e.currentTarget.style.borderColor = 'rgba(83,74,183,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: 42, height: 42, background: 'rgba(83,74,183,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 7, letterSpacing: '-0.2px' }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '80px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div className="reveal">
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>What recruiters say</div>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.5px' }}>Results speak for themselves</h2>
          </div>
          <div className="reveal testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
            {[
              { quote: 'I sent 20 voice notes on Monday. By Wednesday I had 11 replies and 7 interviews booked. Nothing I have ever done has worked this well.', name: 'James T.', role: 'Senior Recruiter, Tech' },
              { quote: 'Candidates actually respond saying they appreciated how personal it felt. They had no idea it was AI. That is the magic of VoiceReach.', name: 'Priya M.', role: 'Talent Partner, FinTech' },
              { quote: 'I was sceptical about AI outreach but this is different. It references the actual CV. Candidates feel seen. Response rates have doubled.', name: 'Dan F.', role: 'Agency Director' },
            ].map(({ quote, name, role }) => (
              <div key={name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 26, textAlign: 'left' }}>
                <div style={{ color: '#FFB800', fontSize: 13, letterSpacing: 2, marginBottom: 14 }}>★★★★★</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.75)', marginBottom: 20, fontStyle: 'italic' }}>"{quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700 }}>
                    {name.split(' ')[0][0]}{name.split(' ')[1][0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="section" style={{ padding: '100px 48px', maxWidth: 1300, margin: '0 auto' }}>
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>Pricing</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Simple, credit-based pricing</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 480, margin: '14px auto 0' }}>One credit = one voice note. No hidden fees, no per-seat charges.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 24 }}>
            <span style={{ fontSize: 14, fontWeight: billing === 'annual' ? 600 : 500, color: billing === 'annual' ? 'white' : 'rgba(255,255,255,0.5)' }}>Annual</span>
            <button onClick={() => setBilling(b => b === 'annual' ? 'monthly' : 'annual')} style={{ width: 48, height: 26, background: 'var(--purple)', borderRadius: 100, cursor: 'pointer', border: 'none', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'transform 0.2s', transform: billing === 'monthly' ? 'translateX(22px)' : 'translateX(0)' }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: billing === 'monthly' ? 600 : 500, color: billing === 'monthly' ? 'white' : 'rgba(255,255,255,0.5)' }}>Monthly</span>
            {billing === 'annual' && <span style={{ background: 'rgba(29,158,117,0.2)', color: 'var(--green)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(29,158,117,0.3)' }}>Save up to 20%</span>}
          </div>
        </div>

        <div className="reveal pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 52, alignItems: 'stretch' }}>
          {plans.map((plan) => (
            <div key={plan.label} style={{
              background: plan.featured ? 'var(--purple)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${plan.featured ? 'var(--purple)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16, padding: '34px 30px',
              transform: plan.featured ? 'scale(1.04)' : 'none',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: plan.featured ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', marginBottom: 14 }}>{plan.label}</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 46, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>
                {plan.price === null
                  ? <span style={{ fontSize: 24 }}>Custom</span>
                  : <><sup style={{ fontSize: 22, verticalAlign: 'super' }}>£</sup>{plan.price}<sub style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>/mo</sub></>
                }
              </div>
              <p style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)', margin: '12px 0 26px', lineHeight: 1.6 }}>{plan.desc}</p>
              <ul style={{ listStyle: 'none', marginBottom: 28, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)', padding: '7px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${plan.featured ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.btn === 'Contact us' ? 'mailto:hello@voicereach.co.uk' : '/signup'} style={{
                width: '100%', padding: 13, borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block', transition: 'all 0.2s',
                background: plan.featured ? 'white' : 'transparent',
                border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.2)',
                color: plan.featured ? 'var(--purple)' : 'white',
              }}>{plan.btn}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(83,74,183,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="reveal">
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 800, letterSpacing: '-1px', maxWidth: 700, margin: '0 auto 18px', lineHeight: 1.1 }}>
            Start booking more interviews today
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.65 }}>
            3 free voice notes. No credit card. No setup call. Just results.
          </p>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--purple)', color: 'white', border: 'none',
            padding: '18px 40px', borderRadius: 12, fontSize: 18, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s',
          }}>Get started free →</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '36px 48px' }}>
        <div className="footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
            Voice<span style={{ color: 'var(--purple-light)' }}>Reach</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)' }}>© {new Date().getFullYear()} VoiceReach. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['mailto:hello@voicereach.co.uk', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([href, label]) => (
              <a key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}
              >{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}
