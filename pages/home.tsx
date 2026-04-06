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
      { label: 'Free', price: '0', desc: 'Try it for free. No card needed. See exactly how it works before you commit.', features: ['3 voice notes to try it out', 'AI CV extraction', 'Personalised voice notes', 'Script preview and edit', 'Candidate pipeline', 'Your own integrations'], btn: 'Start free — no card', featured: false },
      { label: 'Starter', price: '29', desc: 'Billed annually. Perfect for solo recruiters just getting started.', features: ['100 CV matches and voice notes', 'Everything in Free', '100 voice notes per month', 'Your own email integration', 'Your own calendar integration', 'Email support'], btn: 'Get started', featured: false },
      { label: 'Growth', price: '99', desc: 'Billed annually. For agencies placing candidates consistently.', features: ['500 CV matches and voice notes', 'Everything in Starter', 'AI job matching engine', 'Full candidate profiles', 'Voice selector', 'Priority support'], btn: 'Get started', featured: true },
      { label: 'Agency', price: '179', desc: 'Billed annually. For busy agencies running multiple consultants.', features: ['1,000 CV matches and voice notes', 'Everything in Growth', 'Bulk shortlisting', 'Analytics dashboard', 'Priority support'], btn: 'Get started', featured: false },
      { label: 'Enterprise', price: null, desc: 'For large agencies and enterprise teams with 1,000+ candidates a month.', features: ['1,000+ CV matches and voice notes', 'Everything in Agency', 'Unlimited voice notes', 'White label option', 'SMS delivery', 'Dedicated account manager'], btn: 'Contact us', featured: false },
    ],
    monthly: [
      { label: 'Free', price: '0', desc: 'Try it for free. No card needed. See exactly how it works before you commit.', features: ['3 voice notes to try it out', 'AI CV extraction', 'Personalised voice notes', 'Script preview and edit', 'Candidate pipeline', 'Your own integrations'], btn: 'Start free — no card', featured: false },
      { label: 'Starter', price: '35', desc: 'Perfect for solo recruiters just getting started.', features: ['100 CV matches and voice notes', 'Everything in Free', '100 voice notes per month', 'Your own email integration', 'Your own calendar integration', 'Email support'], btn: 'Get started', featured: false },
      { label: 'Growth', price: '119', desc: 'For agencies placing candidates consistently.', features: ['500 CV matches and voice notes', 'Everything in Starter', 'AI job matching engine', 'Full candidate profiles', 'Voice selector', 'Priority support'], btn: 'Get started', featured: true },
      { label: 'Agency', price: '215', desc: 'For busy agencies running multiple consultants.', features: ['1,000 CV matches and voice notes', 'Everything in Growth', 'Bulk shortlisting', 'Analytics dashboard', 'Priority support'], btn: 'Get started', featured: false },
      { label: 'Enterprise', price: null, desc: 'For large agencies and enterprise teams with 1,000+ candidates a month.', features: ['1,000+ CV matches and voice notes', 'Everything in Agency', 'Unlimited voice notes', 'White label option', 'SMS delivery', 'Dedicated account manager'], btn: 'Contact us', featured: false },
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

        {/* Audio demo */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '24px 28px', maxWidth: 520, margin: '52px auto 0',
          display: 'flex', alignItems: 'center', gap: 18,
          animation: 'fadeUp 0.6s 0.4s ease both',
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
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Lee N. — Sales Manager, EPOS and Payments</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Real AI voice note · Generated from CV · Fully personalised</div>
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

        {/* Stats bar */}
        <div className="stats-bar" style={{
          display: 'flex', width: '100%', marginTop: 72,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          animation: 'fadeUp 0.6s 0.5s ease both',
        }}>
          {[
            { n: '84%', label: 'Average email open rate' },
            { n: '55%', label: 'Interview conversion rate' },
            { n: '3sec', label: 'To generate a voice note' },
            { n: '24hr', label: 'Interview link urgency window' },
          ].map(({ n, label }, i) => (
            <div key={label} style={{
              padding: '28px 0', textAlign: 'center', flex: 1,
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 36, fontWeight: 800, letterSpacing: '-1px', color: 'white' }}>{n}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="section" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="reveal">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>Sound familiar?</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>
            Why good candidates ghost you
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 520, marginTop: 14 }}>
            You are sending emails. They are ignoring them. Here is why your current outreach is not working.
          </p>
        </div>
        <div className="reveal problem-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 52 }}>
          {[
            { emoji: '📧', title: 'Generic emails get ignored', desc: 'Candidates receive dozens of templated emails a week. Yours looks exactly like everyone else\'s. They do not even open it.' },
            { emoji: '⏳', title: 'No urgency, no action', desc: 'Without a reason to act now, candidates put it off. By the time they get round to it the opportunity has gone or they have taken another role.' },
            { emoji: '📞', title: 'Phone calls go unanswered', desc: 'Cold calling candidates works less and less. People screen unknown numbers and never call back. You need a better way to reach them.' },
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
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>How VoiceReach works</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>
            From CV to booked interview in minutes
          </h2>
        </div>
        <div className="reveal steps-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginTop: 52,
          background: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden',
        }}>
          {[
            { num: '01', icon: '📄', title: 'Upload the CV', desc: 'Drop in a PDF or Word doc. AI reads it instantly and pulls their name, experience, skills and last employer automatically.' },
            { num: '02', icon: '✏️', title: 'Review the script', desc: 'Add the job title and salary. A personalised script is generated instantly. Read it, tweak it if needed, then approve it.' },
            { num: '03', icon: '🎙', title: 'Voice note generated', desc: 'An AI voice reads the script naturally. Sent via branded email with a big play button. No clunky attachments.' },
            { num: '04', icon: '📅', title: 'Interview booked', desc: 'Candidates click the 24-hour interview link, hear something personal and book straight into your calendar. Done.' },
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
          <div className="reveal">
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>What they actually hear</div>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 32 }}>
              A message that feels genuinely personal
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--purple-light)', marginBottom: 16 }}>Sample voice note script</div>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
                "Hi <strong style={{ color: 'var(--purple-light)', fontStyle: 'normal' }}>David</strong>... I hope you are well today. I have just had your CV come across my desk and the timing is perfect. We have a brand new <strong style={{ color: 'var(--purple-light)', fontStyle: 'normal' }}>Fleet Operations Manager</strong> role, paying <strong style={{ color: 'var(--purple-light)', fontStyle: 'normal' }}>45 thousand pounds</strong>, and honestly, with your <strong style={{ color: 'var(--purple-light)', fontStyle: 'normal' }}>12 years in fleet management</strong>, you are exactly what this client is looking for. Your time at <strong style={{ color: 'var(--purple-light)', fontStyle: 'normal' }}>DHL Logistics</strong> is a brilliant fit for what they need. I have created a personal interview link just for you. You can do the interview right now, it takes less than ten minutes. But do not leave it too long David, this one is moving fast. Click the link, do the interview, and let us get you this job."
              </p>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'var(--purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '10px solid white', marginLeft: 2 }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>28 seconds · Generated in 3 seconds · 0.47mb</span>
              </div>
            </div>
          </div>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '🎯', title: 'References their actual experience', desc: 'Mentions their years in the field, their last employer and why that makes them right for this specific role.' },
              { icon: '⚡', title: 'Creates real urgency', desc: 'The 24-hour interview link makes them feel like this is a real opportunity that will not wait around.' },
              { icon: '✅', title: 'You approve it before it goes', desc: 'Read the script in the dashboard. Edit anything you want. Then hit send. You are always in control.' },
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
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>The results</div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1, maxWidth: 620 }}>Numbers that matter to recruiters</h2>
        </div>
        <div className="reveal results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 52 }}>
          {[
            { n: '3x', label: 'More interviews booked', desc: 'Recruiters using VoiceReach are booking three times more interviews compared to email-only outreach. Candidates respond when they hear something personal.' },
            { n: '84%', label: 'Email open rate', desc: 'A subject line that says "we left you a personal voice message" gets opened. Average industry email open rate is under 20%. Ours is over 80%.' },
            { n: '55%', label: 'Interview conversion', desc: 'Of candidates who click play on their voice note, over half go on to book an interview. The personalisation creates a connection before you even speak.' },
            { n: '~9p', label: 'Cost per voice note', desc: 'Each personalised voice note costs around 9p to generate and send, dropping on higher volume plans. The ROI on a single placed candidate makes this one of the most cost-effective tools in recruitment.' },
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
            Everything a recruiter needs, nothing they do not
          </h2>
        </div>
        <div className="reveal features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 52 }}>
          {[
            { icon: '🤖', title: 'AI CV extraction', desc: 'Upload any CV. Name, experience, skills, companies and location are pulled out automatically. No manual data entry.' },
            { icon: '🎙️', title: 'Personalised voice notes', desc: 'Every note references the candidate by name, their specific experience, last employer and the exact role. Nothing generic.' },
            { icon: '✏️', title: 'Script preview and edit', desc: 'Read and edit the script before it goes out. You always approve what gets said before hitting send.' },
            { icon: '📧', title: 'Branded email delivery', desc: 'A clean branded email goes out with a big play button for the voice note and a 24-hour interview link attached.' },
            { icon: '📅', title: 'Calendar integration', desc: 'Candidates book straight into your calendar via Cal.com. A calendar invite is attached to every email automatically.' },
            { icon: '⚡', title: 'Drag and drop pipeline', desc: 'Applied, Shortlisted, Voice Sent, Interview Booked. Move candidates through your pipeline in one click or drag.' },
            { icon: '👤', title: 'Candidate profiles', desc: 'Full profile with skills, qualifications, employment history and voice note playback all in one place.' },
            { icon: '🔊', title: 'Custom voice and personality', desc: 'Choose your voice from ElevenLabs, adjust the tone, energy and pacing to match your brand. Sounds like your team, not a robot.' },
            { icon: '🔒', title: '24-hour interview links', desc: 'Every link expires after 24 hours creating genuine urgency. Candidates who click late see a branded page with your contact details.' },
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
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--purple-light)', marginBottom: 14 }}>What recruiters are saying</div>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.5px' }}>Recruiters who switched to voice outreach</h2>
          </div>
          <div className="reveal testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
            {[
              { quote: 'We went from a 20% interview show rate to over 60% in two weeks. Candidates call us back because they feel like we actually read their CV.', name: 'James Richardson', role: 'Director, Apex Recruitment', initials: 'JR' },
              { quote: 'I used to spend an hour a day chasing candidates by phone. Now I upload the CV, approve the script and one click does everything. The time saving alone is worth it.', name: 'Sarah Khalid', role: 'Senior Recruiter, TechTalent UK', initials: 'SK' },
              { quote: 'The 24-hour link creates real urgency. Candidates who would normally sit on it for a week are booking interviews the same day. It has changed our pipeline speed.', name: 'Marcus Patel', role: 'Managing Director, Peak Talent', initials: 'MP' },
            ].map(({ quote, name, role, initials }) => (
              <div key={name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 26, textAlign: 'left' }}>
                <div style={{ color: '#FFB800', fontSize: 13, letterSpacing: 2, marginBottom: 14 }}>★★★★★</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.75)', marginBottom: 20, fontStyle: 'italic' }}>"{quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700 }}>{initials}</div>
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
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Start free. Scale when you are ready.</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 480, margin: '14px auto 0' }}>No setup fees. Cancel any time.</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 24 }}>
            <span style={{ fontSize: 14, fontWeight: billing === 'annual' ? 600 : 500, color: billing === 'annual' ? 'white' : 'rgba(255,255,255,0.5)' }}>Annual</span>
            <button onClick={() => setBilling(b => b === 'annual' ? 'monthly' : 'annual')} style={{ width: 48, height: 26, background: 'var(--purple)', borderRadius: 100, cursor: 'pointer', border: 'none', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'transform 0.2s', transform: billing === 'monthly' ? 'translateX(22px)' : 'translateX(0)' }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: billing === 'monthly' ? 600 : 500, color: billing === 'monthly' ? 'white' : 'rgba(255,255,255,0.5)' }}>Monthly</span>
            {billing === 'annual' && <span style={{ background: 'rgba(29,158,117,0.2)', color: 'var(--green)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(29,158,117,0.3)' }}>Save 20%</span>}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', maxWidth: 700, margin: '20px auto 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            💡 Bring your own integrations. All plans include your own email, calendar and ElevenLabs account so you stay in full control of your data and branding. No lock-in.
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
                  ? <span style={{ fontSize: 24 }}>Let's talk</span>
                  : <><sup style={{ fontSize: 22, verticalAlign: 'super' }}>£</sup>{plan.price}<sub style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>/mo</sub></>
                }
              </div>
              <p style={{ fontSize: 13, color: plan.featured ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)', margin: '12px 0 26px', lineHeight: 1.6 }}>{plan.desc}</p>
              <ul style={{ listStyle: 'none', marginBottom: 28, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: plan.featured ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)', padding: '7px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${plan.featured ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.btn === 'Contact us' ? 'mailto:hello@voicereach.co.uk' : '/signup'} style={{
                width: '100%', padding: 13, borderRadius: 8, fontSize: 14, fontWeight: 600,
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
            Stop chasing candidates.<br />Let them come to you.
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.65 }}>
            Try VoiceReach free today. No card needed. We will give you 3 voice notes to try it out — and you will see the difference immediately.
          </p>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--purple)', color: 'white', border: 'none',
            padding: '18px 40px', borderRadius: 12, fontSize: 18, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s',
          }}>Start free — 3 voice notes on us →</Link>
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
