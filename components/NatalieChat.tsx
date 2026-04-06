import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'How does it work?',
  'What does it cost?',
  'Can I try it free?',
  'Will candidates know it\'s AI?',
  'How personal does it sound?',
]

const NATALIE_IMG = 'https://xmdttsekkjbcuiwudtvh.supabase.co/storage/v1/object/public/audio/Screenshot%202026-04-06%20at%2011.43.55.png'

export default function NatalieChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggested, setShowSuggested] = useState(true)
  const [unread, setUnread] = useState(1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setShowSuggested(false)
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: `You are Natalie, a friendly and enthusiastic sales assistant for VoiceReach — an AI-powered voice outreach platform built for recruiters.

Your job is to answer questions about VoiceReach and encourage people to sign up for a free account. Be warm, concise and conversational. Never use bullet points or long lists — keep responses to 2-3 short paragraphs max.

KEY FACTS ABOUT VOICEREACH:
- VoiceReach generates personalised AI voice notes for every candidate, referencing their actual CV, experience and the specific role
- Recruiters upload a CV, review a script, and send a personalised voice note via branded email in under 60 seconds
- Candidates receive a branded landing page with a 24-hour interview link — creating real urgency
- Average email open rate is 84%. Interview conversion rate is 55%. Each voice note costs around 9p to generate.
- It integrates with ElevenLabs for voice, Cal.com for calendar booking, and sends from a custom email domain
- PRICING: Free plan (3 voice notes, no card needed), Starter £29/mo (100/month, billed annually), Growth £99/mo (500/month, billed annually), Agency £179/mo (1000/month, billed annually), Enterprise is contact us
- Monthly pricing: Starter £35, Growth £119, Agency £215
- You can try it completely free with 3 voice notes — no credit card required

ON THE "WILL CANDIDATES KNOW IT'S AI?" QUESTION:
Push back warmly but honestly. The voice sounds completely natural. Candidates respond saying they felt genuinely seen. The personalisation is so specific — referencing their actual CV, last employer, years of experience — that it feels like the recruiter actually read their profile. Most candidates have no idea. And even if they did suspect AI was involved, the message is still relevant and personal to them, which is what matters.

ON PRICING OBJECTIONS:
Remind them the free plan requires no credit card. Point out that 9p per voice note, and the average recruiter places a candidate worth thousands in fees — the ROI is extraordinary. One placed candidate pays for months of the platform.

ON "IS IT REALLY AI?":
Yes — it uses ElevenLabs voice technology and Claude AI to write personalised scripts from the candidate's actual CV. It is not a template. Every single word is generated fresh for that specific candidate and role.

ALWAYS end responses by gently nudging towards signing up. Use phrases like "Want to try it with your first 3 voice notes free?" or "You can see for yourself — no card needed." Link them to sign up at /signup.

Keep responses SHORT. Max 3 sentences per paragraph. Never use markdown formatting like ** or ##. Speak naturally as Natalie.`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Sorry, something went wrong. Try again!'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I hit a snag. Try again in a moment!' }])
    }
    setLoading(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      <style>{`
        @keyframes chatPop { from { opacity: 0; transform: scale(0.92) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes chatBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .chat-window { animation: chatPop 0.25s ease; }
        .chat-bounce { animation: chatBounce 2s ease-in-out infinite; }
        .chat-msg { line-height: 1.6; font-size: 14px; }
        .chat-input:focus { outline: none; border-color: #7B73D4 !important; }
        .chat-send:hover { background: #7B73D4 !important; }
        .chat-suggest:hover { background: rgba(83,74,183,0.3) !important; border-color: rgba(83,74,183,0.6) !important; }
      `}</style>

      {/* CHAT BUBBLE */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000 }}>
        {!open && (
          <div style={{ position: 'relative' }}>
            {/* Unread badge */}
            {unread > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4, zIndex: 10,
                width: 18, height: 18, borderRadius: '50%',
                background: '#1D9E75', color: 'white',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unread}</div>
            )}
            {/* Bubble tooltip */}
            <div style={{
              position: 'absolute', bottom: 68, right: 0,
              background: 'white', color: '#1a1a1a',
              fontSize: 13, fontWeight: 600,
              padding: '8px 14px', borderRadius: 10,
              whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
            }}>
              Got questions? Ask Natalie 👋
              <div style={{ position: 'absolute', bottom: -6, right: 20, width: 12, height: 12, background: 'white', transform: 'rotate(45deg)', boxShadow: '2px 2px 4px rgba(0,0,0,0.08)' }} />
            </div>
            <button
              className="chat-bounce"
              onClick={() => setOpen(true)}
              style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'linear-gradient(135deg, #534AB7, #7B73D4)',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(83,74,183,0.5)',
                padding: 0, overflow: 'hidden',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget.style.transform = 'scale(1.08)'); (e.currentTarget as any).style.animationPlayState = 'paused' }}
              onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)') }}
            >
              <img src={NATALIE_IMG} alt="Natalie" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </button>
          </div>
        )}

        {/* CHAT WINDOW */}
        {open && (
          <div className="chat-window" style={{
            width: 360, height: 520,
            background: '#0f0c29',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 18px',
              background: 'linear-gradient(135deg, #534AB7, #302b63)',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ position: 'relative' }}>
                <img src={NATALIE_IMG} alt="Natalie" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', border: '2px solid rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#1D9E75', border: '2px solid #302b63' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Natalie</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>VoiceReach · Online now</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Welcome message */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <img src={NATALIE_IMG} alt="Natalie" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0, marginTop: 2 }} />
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '0 12px 12px 12px', padding: '10px 14px', maxWidth: '80%' }}>
                  <p className="chat-msg" style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                    Hi! I'm Natalie from VoiceReach 👋 I can answer any questions about the platform and help you get started. What would you like to know?
                  </p>
                </div>
              </div>

              {/* Suggested questions */}
              {showSuggested && messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 36 }}>
                  {SUGGESTED.map(q => (
                    <button key={q} className="chat-suggest" onClick={() => send(q)} style={{
                      background: 'rgba(83,74,183,0.15)',
                      border: '1px solid rgba(83,74,183,0.35)',
                      borderRadius: 10, padding: '7px 12px',
                      fontSize: 12, color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>{q}</button>
                  ))}
                </div>
              )}

              {/* Conversation */}
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                }}>
                  {m.role === 'assistant' && (
                    <img src={NATALIE_IMG} alt="Natalie" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0, marginTop: 2 }} />
                  )}
                  <div style={{
                    background: m.role === 'user' ? 'var(--purple, #534AB7)' : 'rgba(255,255,255,0.08)',
                    borderRadius: m.role === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
                    padding: '10px 14px', maxWidth: '80%',
                  }}>
                    <p className="chat-msg" style={{ color: 'rgba(255,255,255,0.9)', margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                  </div>
                </div>
              ))}

              {/* Loading dots */}
              {loading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <img src={NATALIE_IMG} alt="Natalie" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0 }} />
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '0 12px 12px 12px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.4)',
                          animation: 'chatBounce 1s ease-in-out infinite',
                          animationDelay: `${delay}s`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Sign up nudge */}
            <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center',
                background: 'rgba(29,158,117,0.15)',
                border: '1px solid rgba(29,158,117,0.3)',
                borderRadius: 10, padding: '8px 14px',
                fontSize: 12, fontWeight: 600, color: '#1D9E75',
                textDecoration: 'none', transition: 'all 0.2s',
              }}>
                Start free — 3 voice notes, no card needed →
              </Link>
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, color: 'white',
                  fontFamily: 'inherit',
                }}
              />
              <button
                className="chat-send"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, flexShrink: 0,
                  background: input.trim() ? '#534AB7' : 'rgba(255,255,255,0.08)',
                  border: 'none', borderRadius: 10,
                  cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="white" opacity={input.trim() ? 1 : 0.3} />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
