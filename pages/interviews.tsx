import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { getCombinedScore, getScoreColor, getScoreBg, getScoreLabel, getScoreBreakdown } from '../lib/scoring'

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

type InterviewCandidate = {
  id: string
  name: string
  email: string
  phone?: string
  role_applied: string
  years_experience: number
  last_employer?: string
  location?: string
  interview_score: number
  cv_match_score?: number | null
  interview_completed_at: string
  interview_recommendation?: string
  interview_answers?: any
  interview_keywords?: string[]
  cv_contradictions?: any[]
  pipeline_stage?: string
  job_id?: string
}

const PIPELINE_STAGES = [
  { id: 'interview_done', label: 'Interview Done', color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'second_round',   label: '2nd Round',      color: '#7c3aed', bg: '#f3e8ff' },
  { id: 'job_offer',      label: 'Job Offer',      color: '#15803d', bg: '#dcfce7' },
  { id: 'rejected',       label: 'Rejected',       color: '#dc2626', bg: '#fee2e2' },
]

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
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null)
  const [jobCandidates, setJobCandidates] = useState<Record<string, InterviewCandidate[]>>({})
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({})
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'candidates' | 'needs_setup'>('all')
  const [loadingCandidates, setLoadingCandidates] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<InterviewCandidate | null>(null)
  const [movingCandidate, setMovingCandidate] = useState<string | null>(null)
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

    // Fetch candidate counts for all jobs
    if (jobData && jobData.length > 0) {
      const { data: candidateData } = await supabase
        .from('candidates')
        .select('job_id')
        .eq('user_id', session.user.id)
        .in('job_id', jobData.map((j: any) => j.id))
        .not('interview_completed_at', 'is', null)
      if (candidateData) {
        const counts: Record<string, number> = {}
        for (const c of candidateData) {
          if (c.job_id) counts[c.job_id] = (counts[c.job_id] || 0) + 1
        }
        setCandidateCounts(counts)
      }
    }
  }

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    }
  }

  async function fetchJobCandidates(jobId: string) {
    setLoadingCandidates(jobId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('candidates')
        .select('id, name, email, phone, role_applied, years_experience, last_employer, location, interview_score, cv_match_score, interview_completed_at, interview_recommendation, interview_answers, interview_keywords, cv_contradictions, pipeline_stage, job_id')
        .eq('user_id', session.user.id)
        .eq('job_id', jobId)
        .not('interview_completed_at', 'is', null)
        .order('interview_score', { ascending: false })
      setJobCandidates(prev => ({ ...prev, [jobId]: data || [] }))
    } finally {
      setLoadingCandidates(null)
    }
  }

  async function togglePipeline(jobId: string) {
    if (expandedPipeline === jobId) {
      setExpandedPipeline(null)
    } else {
      setExpandedPipeline(jobId)
      if (!jobCandidates[jobId]) await fetchJobCandidates(jobId)
    }
  }

  async function moveCandidateStage(candidate: InterviewCandidate, stage: string) {
    setMovingCandidate(candidate.id)
    try {
      const headers = await authHeaders()
      await fetch('/api/candidates', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ candidateId: candidate.id, pipeline_stage: stage })
      })
      setJobCandidates(prev => {
        const jobId = candidate.job_id!
        return {
          ...prev,
          [jobId]: (prev[jobId] || []).map(c =>
            c.id === candidate.id ? { ...c, pipeline_stage: stage } : c
          )
        }
      })
      if (selectedCandidate?.id === candidate.id) {
        setSelectedCandidate(prev => prev ? { ...prev, pipeline_stage: stage } : prev)
      }
      notify(`Moved to ${PIPELINE_STAGES.find(s => s.id === stage)?.label}`)
    } catch {
      notify('Could not update stage', 'error')
    } finally {
      setMovingCandidate(null)
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

  function renderJobCard(job: Job, pack: InterviewPack | null, isGenerating: boolean, candidateCount: number) {
    const gradients: Record<string, string> = {
      sales:     'linear-gradient(135deg, #064e25 0%, #15803D 55%, #16a34a 100%)',
      tech:      'linear-gradient(135deg, #0a2d5e 0%, #1d4ed8 55%, #0891b2 100%)',
      marketing: 'linear-gradient(135deg, #7c1a1a 0%, #dc2626 55%, #f97316 100%)',
      finance:   'linear-gradient(135deg, #3b1f6b 0%, #7c3aed 55%, #a855f7 100%)',
    }
    const fallbacks = [
      'linear-gradient(135deg, #064e25 0%, #15803D 55%, #16a34a 100%)',
      'linear-gradient(135deg, #0a2d5e 0%, #1d4ed8 55%, #0891b2 100%)',
      'linear-gradient(135deg, #7c1a1a 0%, #dc2626 55%, #f97316 100%)',
      'linear-gradient(135deg, #3b1f6b 0%, #7c3aed 55%, #a855f7 100%)',
      'linear-gradient(135deg, #1e1b6b 0%, #4F46E5 55%, #7C3AED 100%)',
    ]
    const sector = (job.sector || '').toLowerCase()
    const sectorKey = Object.keys(gradients).find(k => sector.includes(k))
    const gradient = sectorKey ? gradients[sectorKey] : fallbacks[(job.company || job.title).charCodeAt(0) % fallbacks.length]

    return (
      <div key={job.id} style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)' }}>

         {/* SPLIT CARD: colour left 30%, white right 70% */}
         <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 68 }}>

           {/* LEFT COLOUR STRIP — clickable, toggles pipeline */}
           <div onClick={() => setExpandedPipeline(expandedPipeline === job.id ? null : job.id)}
             style={{ width: '30%', flexShrink: 0, background: gradient, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minWidth: 0, cursor: 'pointer' }}
             title="Click to toggle pipeline">
             {job.logo_url ? (
               <img src={job.logo_url} alt={job.company} style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'contain', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
             ) : (
               <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: 'white', flexShrink: 0 }}>
                 {(job.company || job.title)[0].toUpperCase()}
               </div>
             )}
             <div style={{ minWidth: 0 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                 <div style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{job.title}</div>
                 <span style={{ fontSize: 9, background: job.status === 'active' ? '#16a34a' : '#ef4444', color: 'white', padding: '1px 6px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize' as const, flexShrink: 0 }}>{job.status}</span>
               </div>
               <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                 {[job.company, job.salary, job.location, candidateCount > 0 ? `🎙 ${candidateCount} interviewed` : null].filter(Boolean).join(' · ')}
               </div>
             </div>
           </div>

           {/* RIGHT WHITE AREA — buttons */}
           <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 14px', gap: 6, borderLeft: '0.5px solid #e5e7eb', background: 'white' }}>
             {pack ? (
               <>
                 <button onClick={() => { const url = `${window.location.origin}/interview/apply/${job.id}`; navigator.clipboard.writeText(url); notify('Interview link copied ✓') }}
                   style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: '#0ea5e9', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="4" y="1" width="9" height="9" rx="1.5"/><path d="M1 5v7a1 1 0 001 1h7"/></svg>
                   Copy link
                 </button>
                 <button onClick={() => { setEditingPack(pack); setShowModal(true) }}
                   style={{ padding: '8px 13px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                   Edit pack
                 </button>
                 <button onClick={() => generateInterview(job)} disabled={isGenerating}
                   style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: '#f59e0b', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'white', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.6 : 1 }}>
                   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7c0-2.8 2.2-5 5-5a5 5 0 014.9 4M12 7c0 2.8-2.2 5-5 5a5 5 0 01-4.9-4"/><path d="M10 2l2 2-2 2M4 12l-2-2 2-2"/></svg>
                   {isGenerating ? 'Regenerating...' : 'Regenerate'}
                 </button>
                 <button onClick={() => deletePack(pack)}
                   style={{ padding: '8px 11px', background: '#ef4444', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h10M5 4V2h4v2M5.5 7v4M8.5 7v4M3 4l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9L11 4"/></svg>
                 </button>
               </>
             ) : (
               <button onClick={() => generateInterview(job)} disabled={isGenerating}
                 style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: isGenerating ? '#9ca3af' : '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
                 <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
                 {isGenerating ? 'Generating...' : 'Generate interview'}
               </button>
             )}
           </div>
         </div>


        {/* QUESTION TAGS FOOTER */}
        {pack && (pack.questions?.questions || []).length > 0 && (
          <div style={{ background: 'white', padding: '8px 16px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
            {(pack.questions?.questions || []).map((q: any, i: number) => (
              <span key={i} style={{ fontSize: 10, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 5 }}>Q{q.number}: {q.competency}</span>
            ))}
            {candidateCount === 0 && pack && (
              <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4, alignSelf: 'center' }}>No candidates yet — share the link to get started</span>
            )}
          </div>
        )}

        {/* GENERATING STATE */}
        {isGenerating && (
          <div style={{ padding: '10px 18px', background: '#EEF2FF', borderTop: '0.5px solid #e5e7eb', fontSize: 12, color: '#4F46E5', fontWeight: 500 }}>
            ⟳ Running AI generator — generating 6 questions with sub-questions, fallbacks and scoring context. This takes about 20 seconds...
          </div>
        )}

        {/* PIPELINE TOGGLE */}
        {pack && (
          <div onClick={() => togglePipeline(job.id)}
            style={{ padding: '8px 16px', borderTop: '0.5px solid #e5e7eb', background: expandedPipeline === job.id ? '#f9fafb' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4F46E5', fontWeight: 500 }}>
            <span>{expandedPipeline === job.id ? '▲' : '▼'}</span>
            {expandedPipeline === job.id ? 'Hide candidate pipeline' : `View candidate pipeline${candidateCount > 0 ? ` (${candidateCount} interviewed)` : ''}`}
            {loadingCandidates === job.id && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>Loading...</span>}
          </div>
        )}

        {/* KANBAN PIPELINE */}
        {expandedPipeline === job.id && (
          <div style={{ borderTop: '0.5px solid #e5e7eb', padding: '20px', background: '#f9fafb' }}>
            {!jobCandidates[job.id] || jobCandidates[job.id].length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
                No candidates have completed an interview for this job yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {PIPELINE_STAGES.map((stage, stageIndex) => {
                  const stageCandidates = jobCandidates[job.id].filter(c => (c.pipeline_stage || 'interview_done') === stage.id)
                  return (
                    <div key={stage.id}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = stage.bg }}
                      onDragLeave={e => { e.currentTarget.style.background = 'white' }}
                      onDrop={async e => {
                        e.preventDefault()
                        e.currentTarget.style.background = 'white'
                        if (stage.id === 'interview_done') {
                          notify('Interview Done is set automatically when a candidate completes their interview', 'error')
                          return
                        }
                        const candidateId = e.dataTransfer.getData('candidateId')
                        const candidate = jobCandidates[job.id].find(c => c.id === candidateId)
                        if (!candidate) return
                        const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === (candidate.pipeline_stage || 'interview_done'))
                        if (stageIndex < currentIdx) {
                          notify('Candidates can only move forward in the interview pipeline', 'error')
                          return
                        }
                        await moveCandidateStage({ ...candidate, job_id: job.id }, stage.id)
                      }}
                      style={{ background: 'white', borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden', transition: 'background 0.15s' }}>
                      <div style={{ padding: '10px 14px', background: stage.bg, borderBottom: `1px solid ${stage.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: stage.color, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{stage.label}</span>
                        <span style={{ fontSize: 10, background: 'white', color: stage.color, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{stageCandidates.length}</span>
                      </div>
                      <div style={{ padding: 8, display: 'flex', flexDirection: 'column' as const, gap: 8, minHeight: 80 }}>
                        {stageCandidates.length === 0 ? (
                          <div style={{ fontSize: 11, color: '#d1d5db', textAlign: 'center' as const, padding: '24px 0', fontStyle: 'italic' }}>Drop here</div>
                        ) : stageCandidates.map(c => {
                          const score = getCombinedScore(c.cv_match_score, c.interview_score)
                          const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                          return (
                            <div key={c.id}
                              draggable
                              onDragStart={e => { e.dataTransfer.setData('candidateId', c.id) }}
                              onClick={() => setSelectedCandidate(c)}
                              style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', cursor: 'grab', transition: 'border-color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                              {/* Score bar */}
                              <div style={{ height: 2, background: getScoreColor(score) }} />
                              <div style={{ padding: '10px 11px 9px' }}>
                                {/* Name + score pill */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 1 }}>{c.name}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{c.role_applied}</div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                                      {[c.last_employer, c.location, c.years_experience > 0 ? `${c.years_experience}yr` : null].filter(Boolean).join(' · ')}
                                    </div>
                                  </div>
                                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 3 }}>
                                    <div style={{ background: getScoreBg(score), borderRadius: 8, padding: '3px 8px', textAlign: 'center' as const, minWidth: 46 }}>
                                      <div style={{ fontSize: 20, fontWeight: 800, color: getScoreColor(score), lineHeight: 1 }}>{score}%</div>
                                      <div style={{ fontSize: 8, color: getScoreColor(score), opacity: 0.7, marginTop: 1 }}>combined</div>
                                    </div>
                                    {c.interview_score && (
                                      <div style={{ background: '#EEF2FF', borderRadius: 8, padding: '2px 8px', textAlign: 'center' as const, minWidth: 46 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#4F46E5', lineHeight: 1 }}>{c.interview_score}%</div>
                                        <div style={{ fontSize: 8, color: '#4F46E5', opacity: 0.7, marginTop: 1 }}>interview</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Keywords */}
                                {c.interview_keywords && c.interview_keywords.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginBottom: 8 }}>
                                    {c.interview_keywords.slice(0, 3).map((kw: string) => (
                                      <span key={kw} style={{ fontSize: 9, background: '#16a34a', color: 'white', padding: '1px 5px', borderRadius: 3, fontWeight: 500 }}>⚡ {kw}</span>
                                    ))}
                                    {c.interview_keywords.length > 3 && <span style={{ fontSize: 9, color: '#9ca3af' }}>+{c.interview_keywords.length - 3}</span>}
                                  </div>
                                )}
                                <div style={{ height: '0.5px', background: '#e5e7eb', margin: '0 -11px 8px' }} />
                                {/* Actions */}
                                {stage.id === 'interview_done' && (
                                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                    <button onClick={e => { e.stopPropagation(); moveCandidateStage({ ...c, job_id: job.id }, 'second_round') }}
                                      style={{ flex: 1, height: 28, background: '#4F46E5', color: 'white', border: 'none', borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                                      → 2nd Round
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); moveCandidateStage({ ...c, job_id: job.id }, 'rejected') }}
                                      style={{ width: 28, height: 28, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                                  </div>
                                )}
                                {stage.id === 'second_round' && (
                                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                    <button onClick={e => { e.stopPropagation(); moveCandidateStage({ ...c, job_id: job.id }, 'job_offer') }}
                                      style={{ flex: 1, height: 28, background: '#15803d', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                                      Job Offer →
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); moveCandidateStage({ ...c, job_id: job.id }, 'rejected') }}
                                      style={{ width: 28, height: 28, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                                  </div>
                                )}
                                {stage.id === 'job_offer' && (
                                  <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600, padding: '6px 0', textAlign: 'center' as const, background: '#dcfce7', borderRadius: 6, marginBottom: 4 }}>🎉 Job offer extended</div>
                                )}
                                {stage.id !== 'rejected' && stage.id !== 'job_offer' && (
                                  <button onClick={e => { e.stopPropagation(); moveCandidateStage({ ...c, job_id: job.id }, 'rejected') }}
                                    style={{ width: '100%', height: 28, background: 'transparent', color: '#9ca3af', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fecaca' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb' }}>
                                    Reject
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
    <Head>
      <title>Interviews · VoiceReach</title>
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    </Head>
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f9fafb' }}>

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
      <div style={{ width: 224, background: 'white', borderRight: '0.5px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><path d="M5 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2"/><path d="M7 9v1.5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', letterSpacing: '-0.3px' }}>VoiceReach</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>AI recruitment</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.6px', padding: '10px 8px 4px' }}>Main</div>

          {[
            { id: 'dashboard', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
            { id: 'candidates', label: 'All Candidates', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="5.5" r="2.5"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg> },
            { id: 'jobs', label: 'Jobs', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M5 7.5h6M5 10h4"/></svg> },
          ].map(tab => (
            <div key={tab.id} onClick={() => router.push(`/dashboard?tab=${tab.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: '#6b7280', background: 'transparent', borderRadius: 8, marginBottom: 1 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f3f4f6', color: '#6b7280' }}>
                {tab.icon}
              </div>
              {tab.label}
            </div>
          ))}

          {/* Interviews — active */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, color: '#4F46E5', background: '#EEF2FF', borderRadius: 8, marginBottom: 1, fontWeight: 500 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#DDD6FE', color: '#4F46E5' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2a4 4 0 014 4v1.5a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M6 13.5c0 1.1.9 2 2 2s2-.9 2-2"/></svg>
            </div>
            Interviews
          </div>

          {profile?.role === 'admin' && (
            <div onClick={() => window.location.href = '/admin'} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: '#ef4444', borderRadius: 8, marginBottom: 1 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#fef2f2', color: '#ef4444' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
              </div>
              Admin panel
            </div>
          )}

          <div style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.6px', padding: '12px 8px 4px' }}>Settings</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, color: '#6b7280', borderRadius: 8, marginBottom: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f3f4f6', color: '#6b7280' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M3.5 12.5l1.3-1.3M11.2 4.8l1.3-1.3"/></svg>
            </div>
            Voice selector
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px' }}>
          {profile && (
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'white', flexShrink: 0 }}>
                  {(profile.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name || user?.email?.split('@')[0]}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' as const }}>{profile.plan} plan</div>
                </div>
              </div>
            </div>
          )}
          <div onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 7H3M5.5 4.5L3 7l2.5 2.5M8 2h3a1 1 0 011 1v8a1 1 0 01-1 1H8"/></svg>
            Sign out
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '0.5px solid #e5e7eb', padding: '13px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', letterSpacing: '-0.2px' }}>Interviews</div>
              <span style={{ fontSize: 11, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Interview pipeline</span>
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>Generate AI interview packs for your active jobs</div>
          </div>
        </div>

        <div style={{ padding: 24, flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>Loading...</div>
          ) : jobs.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 10, border: '0.5px solid #e5e7eb', padding: 60, textAlign: 'center' as const }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 6 }}>No jobs yet</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Create a job first, then generate an interview pack for it.</div>
              <button onClick={() => router.push('/dashboard?tab=jobs')} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Go to Jobs →
              </button>
            </div>
          ) : (() => {
            const readyJobs = jobs.filter(j => getPackForJob(j.id))
            const needsSetupJobs = jobs.filter(j => !getPackForJob(j.id))
            const totalInterviewed = Object.values(candidateCounts).reduce((a, b) => a + b, 0)

            const filteredReady = activeFilter === 'candidates'
              ? readyJobs.filter(j => (candidateCounts[j.id] || 0) > 0)
              : activeFilter === 'needs_setup'
              ? []
              : readyJobs
            const filteredNeeds = activeFilter === 'all' || activeFilter === 'needs_setup' ? needsSetupJobs : []

            const statBoxStyle = (color: string, ring: string, isActive: boolean): React.CSSProperties => ({
              background: 'white',
              border: isActive ? `1.5px solid ${color}` : '1.5px solid #e5e7eb',
              borderRadius: 12,
              padding: '16px 18px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: isActive ? `0 0 0 3px ${ring}` : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            })

            return (
              <>
                {/* STATS BAR */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { key: 'ready', label: 'Interview ready', value: readyJobs.length, color: '#16a34a', ring: 'rgba(22,163,74,0.1)', iconBg: '#dcfce7', iconColor: '#16a34a',
                      icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2a4 4 0 014 4v1.5a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M7 13.5c0 1.1.9 2 2 2s2-.9 2-2"/></svg> },
                    { key: 'candidates', label: 'Candidates interviewed', value: totalInterviewed, color: '#4F46E5', ring: 'rgba(79,70,229,0.1)', iconBg: '#EEF2FF', iconColor: '#4F46E5',
                      icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg> },
                    { key: 'needs_setup', label: 'Needs setup', value: needsSetupJobs.length, color: '#f59e0b', ring: 'rgba(245,158,11,0.1)', iconBg: '#fef3c7', iconColor: '#d97706',
                      icon: <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 4V2M12 4V2M2 8h14"/></svg> },
                  ].map(s => {
                    const isActive = activeFilter === s.key
                    return (
                      <div key={s.key} onClick={() => setActiveFilter(isActive ? 'all' : s.key as any)} style={statBoxStyle(s.color, s.ring, isActive)}>
                        {/* top accent bar */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '12px 12px 0 0', background: s.color, opacity: isActive ? 1 : 0, transition: 'opacity 0.15s' }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s.icon}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: isActive ? s.iconBg : '#f3f4f6', color: isActive ? s.iconColor : '#9ca3af', transition: 'all 0.15s' }}>
                            {isActive ? '✓ Active filter' : 'Filter'}
                          </span>
                        </div>
                        <div style={{ fontSize: 30, fontWeight: 500, color: s.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{s.label}</div>
                      </div>
                    )
                  })}
                </div>

                {/* SECTION 1: READY TO SHARE */}
                {(activeFilter === 'all' || activeFilter === 'ready' || activeFilter === 'candidates') && filteredReady.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.6px', whiteSpace: 'nowrap' as const }}>Ready to share</div>
                      <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                      <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{filteredReady.length} jobs</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filteredReady.map(job => renderJobCard(job, getPackForJob(job.id), generatingJobId === job.id, candidateCounts[job.id] || 0))}
                    </div>
                  </div>
                )}

                {/* SECTION 2: NEEDS SETUP */}
                {(activeFilter === 'all' || activeFilter === 'needs_setup') && filteredNeeds.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.6px', whiteSpace: 'nowrap' as const }}>Needs interview setup</div>
                      <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                      <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{filteredNeeds.length} jobs</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filteredNeeds.map(job => renderJobCard(job, null, generatingJobId === job.id, 0))}
                    </div>
                  </div>
                )}

                {/* EMPTY FILTER STATE */}
                {filteredReady.length === 0 && filteredNeeds.length === 0 && (
                  <div style={{ textAlign: 'center' as const, padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
                    No jobs match this filter.
                  </div>
                )}
              </>
            )
          })()}

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

      {/* CANDIDATE SUMMARY MODAL */}
      {selectedCandidate && (
        <div
          onClick={() => setSelectedCandidate(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* HEADER */}
            <div style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63)', borderRadius: '16px 16px 0 0', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: getScoreColor(getCombinedScore(selectedCandidate.cv_match_score, selectedCandidate.interview_score)), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{getCombinedScore(selectedCandidate.cv_match_score, selectedCandidate.interview_score)}%</span>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>{selectedCandidate.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{selectedCandidate.role_applied}{selectedCandidate.last_employer ? ` · ${selectedCandidate.last_employer}` : ''}</div>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* PIPELINE STAGE */}
              <div>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 10 }}>Move to stage</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PIPELINE_STAGES.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => moveCandidateStage(selectedCandidate, stage.id)}
                      disabled={movingCandidate === selectedCandidate.id}
                      style={{
                        padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                        background: (selectedCandidate.pipeline_stage || 'interview_done') === stage.id ? stage.color : stage.bg,
                        color: (selectedCandidate.pipeline_stage || 'interview_done') === stage.id ? 'white' : stage.color,
                        outline: (selectedCandidate.pipeline_stage || 'interview_done') === stage.id ? `2px solid ${stage.color}` : 'none',
                        outlineOffset: 2
                      }}
                    >
                      {(selectedCandidate.pipeline_stage || 'interview_done') === stage.id ? '✓ ' : ''}{stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* RECOMMENDATION */}
              {selectedCandidate.interview_recommendation && (
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 8 }}>AI Recommendation</div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '14px 16px' }}>{selectedCandidate.interview_recommendation}</div>
                </div>
              )}

              {/* STRENGTHS & CONCERNS */}
              {(selectedCandidate.interview_answers?.strengths?.length > 0 || selectedCandidate.interview_answers?.concerns?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {selectedCandidate.interview_answers?.strengths?.length > 0 && (
                    <div style={{ background: '#f0fff8', border: '1px solid #d4f0e8', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Strengths</div>
                      {selectedCandidate.interview_answers.strengths.map((s: string, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: '#1D9E75', padding: '2px 0', display: 'flex', gap: 6 }}><span>✓</span><span>{s}</span></div>
                      ))}
                    </div>
                  )}
                  {selectedCandidate.interview_answers?.concerns?.length > 0 && (
                    <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#E24B4A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Concerns</div>
                      {selectedCandidate.interview_answers.concerns.map((c: string, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: '#E24B4A', padding: '2px 0', display: 'flex', gap: 6 }}><span>⚠</span><span>{c}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QUESTION SCORES */}
              {selectedCandidate.interview_answers?.question_scores?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 10 }}>Question breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCandidate.interview_answers.question_scores.map((q: any) => (
                      <div key={q.number} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: q.score >= 7 ? '#E1F5EE' : q.score >= 5 ? '#FFF3E0' : '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: q.score >= 7 ? '#1D9E75' : q.score >= 5 ? '#BA7517' : '#E24B4A' }}>{q.score}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>Q{q.number}: {q.competency}</div>
                          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{q.reasoning}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NEXT ROUND QUESTIONS */}
              {selectedCandidate.interview_answers?.next_round_questions?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 10 }}>Suggested 2nd round questions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCandidate.interview_answers.next_round_questions.map((q: any, i: number) => (
                      <div key={i} style={{ padding: '12px 14px', background: '#f9f9f9', borderRadius: 8, borderLeft: '3px solid #534AB7' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{i + 1}. {q.question}</div>
                        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{q.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KEYWORDS */}
              {selectedCandidate.interview_keywords?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 8 }}>Keywords from interview</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedCandidate.interview_keywords.map((kw: string) => (
                      <span key={kw} style={{ fontSize: 11, background: '#E1F5EE', color: '#1D9E75', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>⚡ {kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTACT */}
              <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 8 }}>Contact</div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 3 }}>📧 {selectedCandidate.email}</div>
                {selectedCandidate.phone && <div style={{ fontSize: 13, color: '#555' }}>📞 {selectedCandidate.phone}</div>}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
    </>
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
