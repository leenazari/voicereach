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
}

type Notification = { id: number; message: string; type: 'success' | 'error' }

export default function Interviews() {
  const router = useRouter()
  const [packs, setPacks] = useState<InterviewPack[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPack, setEditingPack] = useState<InterviewPack | null>(null)
  const [activeTab, setActiveTab] = useState('interviews')
  const notifId = useRef(0)
  const initialized = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
        fetchPacks()
        fetchJobs()
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
        fetchPacks()
        fetchJobs()
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

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    }
  }

  async function fetchPacks() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('interview_packs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setPacks(data || [])
    setLoading(false)
  }

  async function fetchJobs() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('jobs')
      .select('id, title, company')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setJobs(data || [])
  }

  async function deletePack(pack: InterviewPack) {
    if (!confirm(`Delete "${pack.name}"? This cannot be undone.`)) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('interview_packs').delete().eq('id', pack.id).eq('user_id', session.user.id)
    fetchPacks()
    notify('Interview pack deleted')
  }

  async function duplicatePack(pack: InterviewPack) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('interview_packs').insert({
      user_id: session.user.id,
      name: `${pack.name} (copy)`,
      agent_name: pack.agent_name,
      job_id: null,
      questions: pack.questions,
      knowledge_base: pack.knowledge_base,
      status: 'draft'
    })
    fetchPacks()
    notify('Interview pack duplicated')
  }

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId.current
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  function getJobName(jobId: string | null) {
    if (!jobId) return null
    const job = jobs.find(j => j.id === jobId)
    return job ? `${job.title}${job.company ? ` — ${job.company}` : ''}` : 'Unknown job'
  }

  const creditsPercent = profile && profile.credits_limit !== 999999 ? Math.min((profile.credits_used / profile.credits_limit) * 100, 100) : 0
  const creditsColor = creditsPercent >= 90 ? '#E24B4A' : creditsPercent >= 70 ? '#BA7517' : '#534AB7'

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f5f5f7' }}>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '◈', href: '/dashboard' },
            { id: 'interviews', label: 'Interviews', icon: '🎙', href: '/interviews' },
          ].map(item => (
            <div key={item.id} onClick={() => router.push(item.href)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: activeTab === item.id ? '#534AB7' : '#888', background: activeTab === item.id ? '#f0eeff' : 'transparent', borderLeft: activeTab === item.id ? '3px solid #534AB7' : '3px solid transparent', fontWeight: activeTab === item.id ? 700 : 400, margin: '1px 0' }}>
              <span style={{ opacity: activeTab === item.id ? 1 : 0.5 }}>{item.icon}</span>{item.label}
            </div>
          ))}

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
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.2px' }}>Interview Packs</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{packs.length} pack{packs.length !== 1 ? 's' : ''} — create and manage your AI interview packs</div>
          </div>
          <button onClick={() => { setEditingPack(null); setShowCreateModal(true) }} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Create interview pack
          </button>
        </div>

        <div style={{ padding: 28, flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>Loading...</div>
          ) : packs.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🎙</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>No interview packs yet</div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Create an AI-powered interview pack for any role. The AI generates 6 structured questions with scoring context, sub-questions and fallback logic.
              </div>
              <button onClick={() => { setEditingPack(null); setShowCreateModal(true) }} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Create your first interview pack
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {packs.map(pack => (
                <div key={pack.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{pack.name}</div>
                        <span style={{ fontSize: 10, background: pack.status === 'active' ? '#E1F5EE' : '#f0f0f0', color: pack.status === 'active' ? '#1D9E75' : '#888', padding: '2px 8px', borderRadius: 8, fontWeight: 600, textTransform: 'capitalize' }}>{pack.status}</span>
                        {pack.questions && (
                          <span style={{ fontSize: 10, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                            {pack.questions?.questions?.length || 0} questions
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#888' }}>🤖 Agent: {pack.agent_name || 'Alex'}</span>
                        {pack.job_id && <span style={{ fontSize: 12, color: '#534AB7', fontWeight: 500 }}>◉ {getJobName(pack.job_id)}</span>}
                        {!pack.job_id && <span style={{ fontSize: 12, color: '#aaa' }}>No job attached</span>}
                        <span style={{ fontSize: 12, color: '#bbb' }}>Created {new Date(pack.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {pack.questions && (
                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(pack.questions?.questions || []).slice(0, 6).map((q: any, i: number) => (
                            <span key={i} style={{ fontSize: 11, background: '#f5f5f5', color: '#888', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Q{q.number}: {q.competency}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => duplicatePack(pack)} style={{ padding: '7px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'white', color: '#555', fontWeight: 500 }}>Duplicate</button>
                      <button onClick={() => { setEditingPack(pack); setShowCreateModal(true) }} style={{ padding: '7px 12px', border: '1px solid #EEEDFE', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#EEEDFE', color: '#534AB7', fontWeight: 600 }}>Edit</button>
                      <button onClick={() => deletePack(pack)} style={{ padding: '7px 12px', border: '1px solid #fdd', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#fff8f8', color: '#E24B4A', fontWeight: 500 }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showCreateModal && (
        <InterviewSetupModal
          pack={editingPack}
          jobs={jobs}
          onClose={() => { setShowCreateModal(false); setEditingPack(null) }}
          onSave={() => { fetchPacks(); setShowCreateModal(false); setEditingPack(null) }}
          notify={notify}
        />
      )}
    </div>
  )
}

type ModalProps = {
  pack: InterviewPack | null
  jobs: Job[]
  onClose: () => void
  onSave: () => void
  notify: (message: string, type?: 'success' | 'error') => void
}

function InterviewSetupModal({ pack, jobs, onClose, onSave, notify }: ModalProps) {
  const [form, setForm] = useState({
    name: pack?.name || '',
    agent_name: pack?.agent_name || 'Alex',
    job_id: pack?.job_id || '',
    status: pack?.status || 'draft',
  })
  const [knowledgeBase, setKnowledgeBase] = useState({
    company_overview: pack?.knowledge_base?.company_overview || '',
    culture: pack?.knowledge_base?.culture || '',
    benefits: pack?.knowledge_base?.benefits || '',
    day_to_day: pack?.knowledge_base?.day_to_day || '',
    faqs: pack?.knowledge_base?.faqs || '',
  })
  const [questions, setQuestions] = useState<any>(pack?.questions || null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'details' | 'knowledge' | 'questions'>('details')
  const mouseDownOnOverlay = useRef(false)

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    }
  }

  async function generateQuestions() {
    if (!form.job_id) { notify('Please attach a job first so the AI can generate role-specific questions', 'error'); return }
    setGenerating(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId: form.job_id })
      })
      const data = await res.json()
      if (data.success) {
        setQuestions(data.questions)
        setActiveSection('questions')
        notify('6 questions generated and validated ✓')
      } else notify('Could not generate questions', 'error')
    } catch { notify('Generation failed', 'error') }
    finally { setGenerating(false) }
  }

  async function handleSave() {
    if (!form.name) { notify('Please enter a pack name', 'error'); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const payload = {
        user_id: session.user.id,
        name: form.name,
        agent_name: form.agent_name || 'Alex',
        job_id: form.job_id || null,
        status: form.status,
        questions: questions,
        knowledge_base: knowledgeBase,
        updated_at: new Date().toISOString()
      }

      if (pack?.id) {
        await supabase.from('interview_packs').update(payload).eq('id', pack.id)
      } else {
        await supabase.from('interview_packs').insert({ ...payload, created_at: new Date().toISOString() })
      }

      notify(pack?.id ? 'Interview pack updated ✓' : 'Interview pack created ✓')
      onSave()
    } catch { notify('Could not save', 'error') }
    finally { setSaving(false) }
  }

  function overlayMouseDown(e: React.MouseEvent) { mouseDownOnOverlay.current = e.target === e.currentTarget }
  function overlayMouseUp(e: React.MouseEvent) {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose()
    mouseDownOnOverlay.current = false
  }

  const sections = [
    { id: 'details', label: 'Details' },
    { id: 'knowledge', label: 'Knowledge base' },
    { id: 'questions', label: `Questions ${questions ? `(${questions?.questions?.length || 0})` : ''}` },
  ]

  return (
    <div onMouseDown={overlayMouseDown} onMouseUp={overlayMouseUp} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: 680, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* MODAL HEADER */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{pack ? `Edit — ${pack.name}` : 'Create interview pack'}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>AI-powered structured interview</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        {/* SECTION TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ebebeb', padding: '0 28px' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)} style={{ padding: '12px 16px', border: 'none', borderBottom: `2px solid ${activeSection === s.id ? '#534AB7' : 'transparent'}`, background: 'none', fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400, color: activeSection === s.id ? '#534AB7' : '#888', cursor: 'pointer', marginBottom: -1 }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>

          {/* DETAILS SECTION */}
          {activeSection === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Pack name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Senior Sales Executive Interview" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>AI agent name</label>
                <input type="text" value={form.agent_name} onChange={e => setForm(p => ({ ...p, agent_name: e.target.value }))} placeholder="Alex" style={inputStyle} />
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>The name the AI interviewer introduces itself as</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Attach to job</label>
                <select value={form.job_id} onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))} style={inputStyle}>
                  <option value="">No job attached</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}{j.company ? ` — ${j.company}` : ''}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>A job must be attached to generate role-specific questions</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <button onClick={() => setActiveSection('knowledge')} style={{ padding: '10px', background: '#f0eeff', color: '#534AB7', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Next: Knowledge base →
              </button>
            </div>
          )}

          {/* KNOWLEDGE BASE SECTION */}
          {activeSection === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f0eeff', border: '1px solid #EEEDFE', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#534AB7' }}>
                The AI agent uses this information to answer candidate questions after the interview. Keep it accurate and concise.
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setActiveSection('details')} style={{ flex: 1, padding: '10px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>← Back</button>
                <button onClick={() => setActiveSection('questions')} style={{ flex: 2, padding: '10px', background: '#f0eeff', color: '#534AB7', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Next: Questions →</button>
              </div>
            </div>
          )}

          {/* QUESTIONS SECTION */}
          {activeSection === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!questions ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Generate interview questions</div>
                  <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>
                    The AI will generate 6 structured questions with sub-questions, fallback logic and scoring context — all tailored to the attached job.
                  </div>
                  {!form.job_id && (
                    <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E24B4A', marginBottom: 16 }}>
                      Please attach a job in the Details tab before generating questions
                    </div>
                  )}
                  <button onClick={generateQuestions} disabled={generating || !form.job_id} style={{ padding: '12px 28px', background: generating || !form.job_id ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: generating || !form.job_id ? 'not-allowed' : 'pointer' }}>
                    {generating ? '⟳ Generating and validating...' : '✦ Generate 6 questions with AI'}
                  </button>
                  {generating && (
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 12 }}>Running generator then validator — this takes about 20 seconds</div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>6 questions generated</div>
                    <button onClick={generateQuestions} disabled={generating} style={{ padding: '6px 12px', background: '#f0eeff', color: '#534AB7', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer' }}>
                      {generating ? '⟳ Regenerating...' : '↺ Regenerate all'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(questions?.questions || []).map((q: any, i: number) => (
                      <div key={i} style={{ border: '1px solid #ebebeb', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', background: '#f9f9f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#534AB7', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.number}</span>
                          <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{q.competency}</span>
                        </div>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Main question</div>
                            <textarea
                              value={q.main_question}
                              onChange={e => {
                                const updated = { ...questions }
                                updated.questions[i].main_question = e.target.value
                                setQuestions(updated)
                              }}
                              rows={2}
                              style={{ ...inputStyle, fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontWeight: 500 }}
                            />
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Sub-questions</div>
                            {(q.sub_questions || []).map((sq: string, si: number) => (
                              <div key={si} style={{ fontSize: 12, color: '#555', padding: '4px 0', borderBottom: si < q.sub_questions.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', gap: 8 }}>
                                <span style={{ color: '#534AB7', fontWeight: 700, flexShrink: 0 }}>→</span>
                                <span>{sq}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Fallback questions</div>
                            {(q.fallback_questions || []).map((fq: string, fi: number) => (
                              <div key={fi} style={{ fontSize: 12, color: '#888', padding: '4px 0', borderBottom: fi < q.fallback_questions.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', gap: 8 }}>
                                <span style={{ color: '#BA7517', fontWeight: 700, flexShrink: 0 }}>↺</span>
                                <span>{fq}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ background: '#f0fff8', border: '1px solid #d4f0e8', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Scoring context</div>
                            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>{q.scoring_context}</div>
                          </div>
                          {(q.red_flags || []).length > 0 && (
                            <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 8, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'white' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name} style={{ padding: '9px 20px', background: saving || !form.name ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving || !form.name ? 'not-allowed' : 'pointer' }}>
            {saving ? '⟳ Saving...' : pack ? 'Save changes' : 'Create pack'}
          </button>
        </div>
      </div>
    </div>
  )
}
