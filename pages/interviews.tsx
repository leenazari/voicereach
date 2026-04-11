import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

type InterviewPack = {
  id: string
  name: string
  agent_name: string
  job_id: string | null
  status: string
  questions: any
  knowledge_base: any
  created_at: string
  updated_at: string
}

type Job = {
  id: string
  title: string
  company: string
  location: string
  salary: string
  status: string
  logo_url: string | null
  required_skills: string[]
  sector: string
  description: string
}

type Notification = { id: number; message: string; type: 'success' | 'error' }

export default function Interviews() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [packs, setPacks] = useState<InterviewPack[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [editingPack, setEditingPack] = useState<InterviewPack | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null)
  const notifId = useRef(0)
  const initialized = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
        fetchAll()
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
        fetchAll()
      } else if (!session) {
        setTimeout(async () => {
          if (!initialized.current) {
            const { data: { session: r } } = await supabase.auth.getSession()
            if (!r) router.push('/login')
          }
        }, 3000)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchAll() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [{ data: jobData }, { data: packData }] = await Promise.all([
      supabase.from('jobs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('interview_packs').select('*').eq('user_id', session.user.id)
    ])

    setJobs(jobData || [])
    setPacks(packData || [])
    setLoading(false)
  }

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    }
  }

  async function generateInterview(job: Job) {
    setGeneratingJobId(job.id)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId: job.id })
      })
      const data = await res.json()
      if (data.success) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const existingPack = packs.find(p => p.job_id === job.id)
        if (existingPack) {
          await supabase.from('interview_packs').update({
            questions: data.questions,
            status: 'active',
            updated_at: new Date().toISOString()
          }).eq('id', existingPack.id)
        } else {
          await supabase.from('interview_packs').insert({
            user_id: session.user.id,
            job_id: job.id,
            name: `${job.title}${job.company ? ` — ${job.company}` : ''}`,
            agent_name: 'Alex',
            questions: data.questions,
            knowledge_base: { company_overview: '', culture: '', benefits: '', day_to_day: '', faqs: '' },
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }

        await fetchAll()
        notify(`Interview generated for ${job.title} ✓`)
      } else notify('Could not generate interview', 'error')
    } catch { notify('Generation failed', 'error') }
    finally { setGeneratingJobId(null) }
  }

  async function deletePack(pack: InterviewPack) {
    if (!confirm(`Delete interview pack for "${pack.name}"? This cannot be undone.`)) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('interview_packs').delete().eq('id', pack.id).eq('user_id', session.user.id)
    await fetchAll()
    notify('Interview pack deleted')
  }

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId.current
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  function getPackForJob(jobId: string): InterviewPack | null {
    return packs.find(p => p.job_id === jobId) || null
  }

  const JOB_STATUS_COLORS: Record<string, string> = { active: '#1D9E75', draft: '#888', closed: '#E24B4A' }
  const JOB_STATUS_BG: Record<string, string> = { active: '#E1F5EE', draft: '#f0f0f0', closed: '#fff0ee' }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f5f5f7' }}>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* NOTIFICATIONS */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => (
          <div key={n.id} style={{ background: n.type === 'success' ? '#1a1a1a' : '#E24B4A', color: 'white', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'slideIn 0.2s ease', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{n.type === 'success' ? '✓' : '✕'}</span>{n.message}
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <div style={{ width: 240, background: 'white', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' }}>VoiceReach</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>AI outreach platform</div>
        </div>
        <div style={{ padding: '12px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '6px 12px 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ccc', fontWeight: 600 }}>Main</div>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: '#888', borderLeft: '3px solid transparent', margin: '1px 0' }}>
            <span style={{ opacity: 0.5 }}>◈</span>Dashboard
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: '#534AB7', background: '#f0eeff', borderLeft: '3px solid #534AB7', fontWeight: 700, margin: '1px 0' }}>
            <span>🎙</span>Interviews
          </div>

          <div style={{ padding: '16px 12px 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ccc', fontWeight: 600 }}>Help & Support</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, color: '#ccc', borderLeft: '3px solid transparent', margin: '1px 0' }}>
            <span style={{ opacity: 0.3 }}>◷</span>
            <span>FAQ</span>
            <span style={{ fontSize: 10, background: '#f0f0f0', color: '#bbb', padding: '1px 8px', borderRadius: 8, fontWeight: 600 }}>Soon</span>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #ebebeb' }}>
          {profile && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#534AB7', flexShrink: 0 }}>
                  {(profile.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile.full_name || user?.email?.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa', textTransform: 'capitalize' }}>{profile.plan} plan</div>
                </div>
              </div>
            </div>
          )}
          <div onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ fontSize: 12, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>→</span> Sign out
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.2px' }}>Interviews</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>Generate AI interview packs for your active jobs</div>
          </div>
        </div>

        <div style={{ padding: 28, flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>Loading...</div>
          ) : jobs.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>◉</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>No jobs yet</div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>Create a job first, then come back here to generate an interview pack for it.</div>
              <button onClick={() => router.push('/dashboard?tab=jobs')} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Go to Jobs →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {jobs.map(job => {
                const pack = getPackForJob(job.id)
                const isGenerating = generatingJobId === job.id

                return (
                  <div key={job.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>

                      {/* JOB LOGO / INITIAL */}
                      {job.logo_url ? (
                        <img src={job.logo_url} alt={job.company} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', border: '1px solid #f0f0f0', background: 'white', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#534AB7', flexShrink: 0 }}>
                          {(job.company || job.title)[0].toUpperCase()}
                        </div>
                      )}

                      {/* JOB INFO */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{job.title}</div>
                          <span style={{ fontSize: 10, background: JOB_STATUS_BG[job.status] || '#f0f0f0', color: JOB_STATUS_COLORS[job.status] || '#888', padding: '2px 8px', borderRadius: 8, fontWeight: 600, textTransform: 'capitalize' }}>{job.status}</span>
                          {pack && (
                            <span style={{ fontSize: 10, background: '#E1F5EE', color: '#1D9E75', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                              ✓ Interview ready
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {job.company && <span style={{ fontSize: 12, color: '#888' }}>{job.company}</span>}
                          {job.salary && <span style={{ fontSize: 12, color: '#534AB7', fontWeight: 600 }}>💰 {job.salary}</span>}
                          {job.location && <span style={{ fontSize: 12, color: '#888' }}>📍 {job.location}</span>}
                        </div>
                        {pack && (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {(pack.questions?.questions || []).map((q: any, i: number) => (
                              <span key={i} style={{ fontSize: 10, background: '#f5f5f5', color: '#888', padding: '2px 8px', borderRadius: 6 }}>Q{q.number}: {q.competency}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {pack ? (
                          <>
                            <button
                              onClick={() => { setEditingPack(pack); setShowModal(true) }}
                              style={{ padding: '8px 14px', background: '#EEEDFE', color: '#534AB7', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              ✎ Edit pack
                            </button>
                            <button
                              onClick={() => generateInterview(job)}
                              disabled={isGenerating}
                              style={{ padding: '8px 14px', background: isGenerating ? '#aaa' : 'white', color: isGenerating ? 'white' : '#534AB7', border: '1px solid #534AB7', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer' }}
                            >
                              {isGenerating ? '⟳ Regenerating...' : '↺ Regenerate'}
                            </button>
                            <button
                              onClick={() => deletePack(pack)}
                              style={{ padding: '8px 14px', border: '1px solid #fdd', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#fff8f8', color: '#E24B4A', fontWeight: 500 }}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => generateInterview(job)}
                            disabled={isGenerating}
                            style={{ padding: '8px 18px', background: isGenerating ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            {isGenerating ? (
                              <>
                                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                                Generating...
                              </>
                            ) : '✦ Generate interview'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* GENERATING STATE */}
                    {isGenerating && (
                      <div style={{ padding: '12px 20px', background: '#f0eeff', borderTop: '1px solid #EEEDFE', fontSize: 12, color: '#534AB7', fontWeight: 500 }}>
                        ⟳ Running AI generator then validator — generating 6 questions with sub-questions, fallbacks and scoring context. This takes about 20 seconds...
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showModal && editingPack && (
        <InterviewEditModal
          pack={editingPack}
          onClose={() => { setShowModal(false); setEditingPack(null) }}
          onSave={() => { fetchAll(); setShowModal(false); setEditingPack(null) }}
          notify={notify}
        />
      )}
    </div>
  )
}

type EditModalProps = {
  pack: InterviewPack
  onClose: () => void
  onSave: () => void
  notify: (message: string, type?: 'success' | 'error') => void
}

function InterviewEditModal({ pack, onClose, onSave, notify }: EditModalProps) {
  const [agentName, setAgentName] = useState(pack.agent_name || 'Alex')
  const [status, setStatus] = useState(pack.status || 'active')
  const [knowledgeBase, setKnowledgeBase] = useState({
    company_overview: pack.knowledge_base?.company_overview || '',
    culture: pack.knowledge_base?.culture || '',
    benefits: pack.knowledge_base?.benefits || '',
    day_to_day: pack.knowledge_base?.day_to_day || '',
    faqs: pack.knowledge_base?.faqs || '',
  })
  const [questions, setQuestions] = useState<any>(pack.questions)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'knowledge' | 'questions'>('questions')
  const mouseDownOnOverlay = useRef(false)

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }

  async function handleSave() {
    setSaving(true)
    try {
      await supabase.from('interview_packs').update({
        agent_name: agentName,
        status,
        knowledge_base: knowledgeBase,
        questions,
        updated_at: new Date().toISOString()
      }).eq('id', pack.id)
      notify('Interview pack saved ✓')
      onSave()
    } catch { notify('Could not save', 'error') }
    finally { setSaving(false) }
  }

  function overlayMouseDown(e: React.MouseEvent) { mouseDownOnOverlay.current = e.target === e.currentTarget }
  function overlayMouseUp(e: React.MouseEvent) {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose()
    mouseDownOnOverlay.current = false
  }

  return (
    <div onMouseDown={overlayMouseDown} onMouseUp={overlayMouseUp} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: 700, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* HEADER */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{pack.name}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Edit interview pack</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>

        {/* SETTINGS ROW */}
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #ebebeb', display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Agent name</label>
            <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>

        {/* SECTION TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ebebeb', padding: '0 28px' }}>
          {[
            { id: 'questions', label: `Questions (${questions?.questions?.length || 0})` },
            { id: 'knowledge', label: 'Knowledge base' },
          ].map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)} style={{ padding: '12px 16px', border: 'none', borderBottom: `2px solid ${activeSection === s.id ? '#534AB7' : 'transparent'}`, background: 'none', fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400, color: activeSection === s.id ? '#534AB7' : '#888', cursor: 'pointer', marginBottom: -1 }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>

          {/* QUESTIONS */}
          {activeSection === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(questions?.questions || []).map((q: any, i: number) => (
                <div key={i} style={{ border: '1px solid #ebebeb', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#f9f9f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#534AB7', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.number}</span>
                    <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{q.competency}</span>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{q.why}</span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Main question</div>
                      <textarea
                        value={q.main_question}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(questions))
                          updated.questions[i].main_question = e.target.value
                          setQuestions(updated)
                        }}
                        rows={2}
                        style={{ ...inputStyle, fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontWeight: 500 }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Sub-questions</div>
                      {(q.sub_questions || []).map((sq: string, si: number) => (
                        <div key={si} style={{ fontSize: 12, color: '#555', padding: '5px 0', borderBottom: si < q.sub_questions.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', gap: 8 }}>
                          <span style={{ color: '#534AB7', fontWeight: 700, flexShrink: 0 }}>→</span>
                          <span>{sq}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Fallback questions</div>
                      {(q.fallback_questions || []).map((fq: string, fi: number) => (
                        <div key={fi} style={{ fontSize: 12, color: '#888', padding: '5px 0', borderBottom: fi < q.fallback_questions.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', gap: 8 }}>
                          <span style={{ color: '#BA7517', fontWeight: 700, flexShrink: 0 }}>↺</span>
                          <span>{fq}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#f0fff8', border: '1px solid #d4f0e8', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Scoring context</div>
                      <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>{q.scoring_context}</div>
                    </div>
                    {(q.red_flags || []).length > 0 && (
                      <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#E24B4A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Red flags</div>
                        {(q.red_flags || []).map((rf: string, ri: number) => (
                          <div key={ri} style={{ fontSize: 12, color: '#E24B4A', padding: '2px 0', display: 'flex', gap: 6 }}>
                            <span>⚠</span><span>{rf}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KNOWLEDGE BASE */}
          {activeSection === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f0eeff', border: '1px solid #EEEDFE', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#534AB7' }}>
                The AI agent uses this to answer candidate questions after the interview. If a question is not covered here the agent will flag it to the hiring team.
              </div>
              {[
                { key: 'company_overview', label: 'Company overview', placeholder: 'What does the company do, how big are they, what markets do they operate in...' },
                { key: 'culture', label: 'Culture and values', placeholder: 'What is the working environment like, what are the company values, what kind of people thrive here...' },
                { key: 'benefits', label: 'Benefits and perks', placeholder: 'Salary, bonus, pension, holiday allowance, healthcare, flexible working...' },
                { key: 'day_to_day', label: 'Day to day in the role', placeholder: 'What does a typical day look like, who do they report to, team size, tools used...' },
                { key: 'faqs', label: 'Common candidate FAQs', placeholder: 'When do interviews start? Is there a probation period? What are the progression opportunities...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>{f.label}</label>
                  <textarea
                    value={(knowledgeBase as any)[f.key]}
                    onChange={e => setKnowledgeBase(p => ({ ...p, [f.key]: e.target.value }))}
                    rows={3}
                    placeholder={f.placeholder}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 8, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'white' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: saving ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '⟳ Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
