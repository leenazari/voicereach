import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import JobFormModal from '../../components/JobFormModal'

const PIPELINE_STATUSES = ['matched', 'shortlisted', 'voice_sent', 'interview_booked']

const STATUS_LABELS: Record<string, string> = {
  matched: 'Matched',
  shortlisted: 'Shortlisted',
  voice_sent: 'Voice Sent',
  interview_booked: 'Interview Booked'
}

const STATUS_COLORS: Record<string, string> = {
  matched: '#888',
  shortlisted: '#534AB7',
  voice_sent: '#1D9E75',
  interview_booked: '#639922'
}

const STATUS_BG: Record<string, string> = {
  matched: '#f0f0f0',
  shortlisted: '#EEEDFE',
  voice_sent: '#E1F5EE',
  interview_booked: '#EAF3DE'
}

type Job = {
  id: string
  title: string
  company: string
  location: string
  salary: string
  description: string
  required_skills: string[]
  sector: string
  status: string
  logo_url: string | null
  created_at: string
  closes_at?: string | null
  match_priority?: string
  match_threshold?: number
  work_type?: string
}

type PipelineCandidate = {
  id: string
  name: string
  email: string
  phone: string
  role_applied: string
  years_experience: number
  last_employer: string
  location: string
  strength_keywords: string[]
  skills: string[]
  experience_summary: string
  candidate_summary: string
  qualifications: string[]
  all_employers: string[]
  voice_note_url: string | null
  last_script: string | null
  match_score: number
  keyword_matches: string[]
  pipeline_status: string
}

type Notification = { id: number; message: string; type: 'success' | 'error' }

export default function JobPipeline() {
  const router = useRouter()
  const { jobId } = router.query
  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [selectedMatched, setSelectedMatched] = useState<Set<string>>(new Set())
  const [selectedShortlisted, setSelectedShortlisted] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState<string | null>(null)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [showProfile, setShowProfile] = useState(false)
  const [profileCandidate, setProfileCandidate] = useState<PipelineCandidate | null>(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendTarget, setSendTarget] = useState<PipelineCandidate | null>(null)
  const [scriptPreview, setScriptPreview] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkMode, setBulkMode] = useState<'all' | 'individual' | null>(null)
  const [bulkQueue, setBulkQueue] = useState<PipelineCandidate[]>([])
  const [bulkCurrent, setBulkCurrent] = useState<PipelineCandidate | null>(null)
  const [bulkCurrentScript, setBulkCurrentScript] = useState('')
  const [regeneratingKeywords, setRegeneratingKeywords] = useState(false)
  const [profileScrollPos, setProfileScrollPos] = useState(0)
  const [shortlistingAll, setShortlistingAll] = useState(false)
  const [showEditJob, setShowEditJob] = useState(false)
  const notifId = useRef(0)
  const initialized = useRef(false)
  const mouseDownOnOverlay = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        setSessionToken(session.access_token)
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        setSessionToken(session.access_token)
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

  useEffect(() => {
    if (jobId && sessionToken) {
      loadJob()
      loadPipeline()
    }
  }, [jobId, sessionToken])

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    }
  }

  async function loadJob() {
    const headers = await authHeaders()
    const res = await fetch('/api/jobs', { headers })
    const data = await res.json()
    const found = (data.jobs || []).find((j: Job) => j.id === jobId)
    if (found) setJob(found)
  }

  async function loadPipeline() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: jobCandidates } = await supabase
        .from('job_candidates')
        .select('candidate_id, match_score, keyword_matches, status')
        .eq('job_id', jobId as string)

      if (!jobCandidates || jobCandidates.length === 0) {
        setCandidates([])
        setLoading(false)
        return
      }

      const candidateIds = jobCandidates.map((jc: any) => jc.candidate_id)
      const { data: candidateData } = await supabase
        .from('candidates')
        .select('*')
        .in('id', candidateIds)
        .eq('user_id', session.user.id)

      const merged: PipelineCandidate[] = (candidateData || []).map((c: any) => {
        const jc = jobCandidates.find((j: any) => j.candidate_id === c.id)
        return {
          ...c,
          match_score: jc?.match_score || 0,
          keyword_matches: jc?.keyword_matches || [],
          pipeline_status: jc?.status === 'shortlist' ? 'shortlisted' :
            jc?.status === 'voice_sent' ? 'voice_sent' :
            jc?.status === 'interview_booked' ? 'interview_booked' : 'matched'
        }
      })

      merged.sort((a, b) => b.match_score - a.match_score)
      setCandidates(merged)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function runMatch() {
    setMatching(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/match-candidates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId })
      })
      const data = await res.json()
      if (data.success) {
        notify(`Found ${data.shortlist} strong matches out of ${data.total} candidates`)
        await loadPipeline()
      } else notify('Could not run match', 'error')
    } catch { notify('Match failed', 'error') }
    finally { setMatching(false) }
  }

  async function updatePipelineStatus(candidateId: string, newStatus: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const dbStatus = newStatus === 'shortlisted' ? 'shortlist' :
      newStatus === 'voice_sent' ? 'voice_sent' :
      newStatus === 'interview_booked' ? 'interview_booked' : 'longlist'

    await supabase
      .from('job_candidates')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('job_id', jobId as string)
      .eq('candidate_id', candidateId)

    setCandidates(prev => prev.map(c =>
      c.id === candidateId ? { ...c, pipeline_status: newStatus } : c
    ))
  }

  async function shortlistAllAboveThreshold() {
    const threshold = job?.match_threshold || 70
    const toShortlist = candidates.filter(c =>
      c.pipeline_status === 'matched' && c.match_score >= threshold
    )
    if (toShortlist.length === 0) {
      notify('No candidates above threshold to shortlist', 'error')
      return
    }
    setShortlistingAll(true)
    for (const c of toShortlist) {
      await updatePipelineStatus(c.id, 'shortlisted')
    }
    setSelectedMatched(new Set())
    setShortlistingAll(false)
    notify(`${toShortlist.length} candidates moved to shortlist ✓`)
  }

  async function shortlistSelected() {
    if (selectedMatched.size === 0) return
    setShortlistingAll(true)
    for (const id of Array.from(selectedMatched)) {
      await updatePipelineStatus(id, 'shortlisted')
    }
    setSelectedMatched(new Set())
    setShortlistingAll(false)
    notify(`${selectedMatched.size} candidates shortlisted ✓`)
  }

  async function generateScript(candidate: PipelineCandidate) {
    setGeneratingScript(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/preview-script', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId: candidate.id,
          jobTitle: job?.title || '',
          jobSalary: job?.salary || ''
        })
      })
      const data = await res.json()
      if (data.script) setScriptPreview(data.script)
    } catch { }
    finally { setGeneratingScript(false) }
  }

  function openSendModal(candidate: PipelineCandidate) {
    setSendTarget(candidate)
    setScriptPreview('')
    setShowSendModal(true)
    generateScript(candidate)
  }

  async function sendVoiceNote(candidate: PipelineCandidate, customScript?: string) {
    setSending(candidate.id)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/shortlist', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId: candidate.id,
          jobId,
          jobTitle: job?.title || '',
          jobSalary: job?.salary || '',
          customScript: customScript || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        notify(`Voice note sent to ${candidate.name} ✓`)
        await updatePipelineStatus(candidate.id, 'voice_sent')
        setSelectedShortlisted(prev => { const n = new Set(prev); n.delete(candidate.id); return n })
      } else notify('Error: ' + data.error, 'error')
    } finally { setSending(null) }
  }

  async function confirmSingleSend() {
    if (!sendTarget) return
    setShowSendModal(false)
    await sendVoiceNote(sendTarget, scriptPreview)
    setSendTarget(null)
    setScriptPreview('')
  }

  function openBulkConfirm() {
    const shortlisted = candidates.filter(c =>
      c.pipeline_status === 'shortlisted' &&
      (selectedShortlisted.size === 0 || selectedShortlisted.has(c.id))
    )
    if (shortlisted.length === 0) { notify('No shortlisted candidates to send to', 'error'); return }
    setBulkQueue(shortlisted)
    setShowBulkConfirm(true)
  }

  async function startBulkSendAll() {
    setShowBulkConfirm(false)
    setBulkSending(true)
    setBulkProgress({ current: 0, total: bulkQueue.length })
    for (let i = 0; i < bulkQueue.length; i++) {
      setBulkProgress({ current: i + 1, total: bulkQueue.length })
      await sendVoiceNote(bulkQueue[i])
    }
    setBulkSending(false)
    setBulkQueue([])
    notify('All voice notes sent successfully ✓')
  }

  async function startBulkReviewIndividual() {
    setShowBulkConfirm(false)
    setBulkMode('individual')
    const first = bulkQueue[0]
    setBulkCurrent(first)
    setBulkCurrentScript('')
    setGeneratingScript(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/preview-script', {
        method: 'POST',
        headers,
        body: JSON.stringify({ candidateId: first.id, jobTitle: job?.title || '', jobSalary: job?.salary || '' })
      })
      const data = await res.json()
      if (data.script) setBulkCurrentScript(data.script)
    } catch { }
    finally { setGeneratingScript(false) }
  }

  async function confirmBulkIndividual() {
    if (!bulkCurrent) return
    await sendVoiceNote(bulkCurrent, bulkCurrentScript)
    const remaining = bulkQueue.filter(c => c.id !== bulkCurrent.id)
    setBulkQueue(remaining)
    if (remaining.length === 0) {
      setBulkMode(null)
      setBulkCurrent(null)
      setBulkCurrentScript('')
      notify('All voice notes sent ✓')
      return
    }
    const next = remaining[0]
    setBulkCurrent(next)
    setBulkCurrentScript('')
    setGeneratingScript(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/preview-script', {
        method: 'POST',
        headers,
        body: JSON.stringify({ candidateId: next.id, jobTitle: job?.title || '', jobSalary: job?.salary || '' })
      })
      const data = await res.json()
      if (data.script) setBulkCurrentScript(data.script)
    } catch { }
    finally { setGeneratingScript(false) }
  }

  function skipBulkIndividual() {
    const remaining = bulkQueue.filter(c => c.id !== bulkCurrent?.id)
    setBulkQueue(remaining)
    if (remaining.length === 0) {
      setBulkMode(null)
      setBulkCurrent(null)
      setBulkCurrentScript('')
      return
    }
    setBulkCurrent(remaining[0])
    setBulkCurrentScript('')
  }

  function cancelBulkIndividual() {
    setBulkMode(null)
    setBulkCurrent(null)
    setBulkCurrentScript('')
    setBulkQueue([])
  }

  function toggleSelectMatched(id: string) {
    setSelectedMatched(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleSelectShortlisted(id: string) {
    setSelectedShortlisted(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function selectAllShortlisted() {
    const ids = candidates.filter(c => c.pipeline_status === 'shortlisted').map(c => c.id)
    setSelectedShortlisted(new Set(ids))
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(status)
  }

  async function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault()
    if (dragId) {
      const candidate = candidates.find(c => c.id === dragId)
      if (candidate && candidate.pipeline_status !== status) {
        if (status === 'voice_sent' && candidate.pipeline_status === 'shortlisted') {
          openSendModal(candidate)
        } else if (status === 'voice_sent') {
          notify('Move to Shortlisted first before sending', 'error')
        } else {
          await updatePipelineStatus(dragId, status)
        }
      }
    }
    setDragId(null)
    setDragOver(null)
  }

  function handleDragEnd() { setDragId(null); setDragOver(null) }

  function openProfile(candidate: PipelineCandidate) {
    setProfileScrollPos(window.scrollY)
    setProfileCandidate(candidate)
    setShowProfile(true)
  }

  function closeProfile() {
    setShowProfile(false)
    setTimeout(() => window.scrollTo(0, profileScrollPos), 50)
  }

  async function regenerateKeywords(candidate: PipelineCandidate) {
    setRegeneratingKeywords(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/regenerate-keywords', {
        method: 'POST',
        headers,
        body: JSON.stringify({ candidateId: candidate.id })
      })
      const data = await res.json()
      if (data.success) {
        notify('Keywords regenerated')
        setProfileCandidate((prev: any) => prev ? { ...prev, strength_keywords: data.strength_keywords } : prev)
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, strength_keywords: data.strength_keywords } : c))
      } else notify('Could not regenerate', 'error')
    } catch { notify('Failed', 'error') }
    finally { setRegeneratingKeywords(false) }
  }

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId.current
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  function overlayMouseDown(e: React.MouseEvent) { mouseDownOnOverlay.current = e.target === e.currentTarget }
  function overlayMouseUp(e: React.MouseEvent, closeFn: () => void) {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) closeFn()
    mouseDownOnOverlay.current = false
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#1D9E75'
    if (score >= 70) return '#534AB7'
    if (score >= 55) return '#BA7517'
    return '#E24B4A'
  }

  function getScoreBg(score: number): string {
    if (score >= 80) return '#E1F5EE'
    if (score >= 70) return '#EEEDFE'
    if (score >= 55) return '#FFF3E0'
    return '#fff0ee'
  }

  function getScoreBorder(score: number): string {
    if (score >= 80) return '#1D9E75'
    if (score >= 70) return '#534AB7'
    if (score >= 55) return '#BA7517'
    return '#E24B4A'
  }

  const byStatus = (status: string) => candidates.filter(c => c.pipeline_status === status)
  const threshold = job?.match_threshold || 70
  const aboveThresholdCount = candidates.filter(c => c.pipeline_status === 'matched' && c.match_score >= threshold).length
  const shortlistedCount = candidates.filter(c => c.pipeline_status === 'shortlisted').length

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
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

      {/* HEADER */}
      <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '14px 28px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard?tab=jobs')} style={{ background: 'none', border: 'none', color: '#534AB7', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, flexShrink: 0 }}>
            ← Back to Jobs
          </button>
          <div style={{ width: 1, height: 16, background: '#e5e5e5', flexShrink: 0 }} />
          {job ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              {job.logo_url ? (
                <img src={job.logo_url} alt={job.company} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#534AB7', flexShrink: 0 }}>
                  {(job.company || job.title)[0].toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.2px' }}>{job.title}</div>
                <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, marginTop: 2 }}>
                  {job.company && <span>{job.company}</span>}
                  {job.salary && <span style={{ color: '#534AB7', fontWeight: 600 }}>💰 {job.salary}</span>}
                  {job.location && <span>📍 {job.location}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, fontSize: 14, color: '#aaa' }}>Loading...</div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => setShowEditJob(true)}
              style={{ padding: '8px 14px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'white', color: '#555', fontWeight: 500 }}
            >
              ✎ Edit job
            </button>
            {shortlistedCount > 0 && (
              <button onClick={openBulkConfirm} style={{ padding: '8px 16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🎙 Send to {selectedShortlisted.size > 0 ? `${selectedShortlisted.size} selected` : `all shortlisted (${shortlistedCount})`}
              </button>
            )}
            <button onClick={runMatch} disabled={matching} style={{ padding: '8px 16px', background: matching ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: matching ? 'not-allowed' : 'pointer' }}>
              {matching ? '⟳ Matching...' : candidates.length > 0 ? '↺ Refresh matches' : '◎ Find matches'}
            </button>
          </div>
        </div>
      </div>

      {/* BULK SENDING PROGRESS */}
      {bulkSending && (
        <div style={{ background: '#534AB7', color: 'white', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Sending voice notes... {bulkProgress.current}/{bulkProgress.total}</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, background: 'white', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* JOB SKILLS */}
      {job && (job.required_skills || []).length > 0 && (
        <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '10px 28px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 4 }}>Required skills:</span>
            {(job.required_skills || []).map(skill => (
              <span key={skill} style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{skill}</span>
            ))}
            <span style={{ fontSize: 11, background: '#f0f0f0', color: '#888', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{threshold}% threshold</span>
          </div>
        </div>
      )}

      {/* PIPELINE */}
      <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#aaa', fontSize: 14 }}>Loading pipeline...</div>
        ) : candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>No candidates matched yet</div>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>Click Find Matches to match your candidates against this job</div>
            <button onClick={runMatch} disabled={matching} style={{ padding: '10px 24px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {matching ? '⟳ Finding matches...' : '◎ Find matches'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {PIPELINE_STATUSES.map(status => (
              <div key={status}
                onDragOver={e => handleDragOver(e, status)}
                onDrop={e => handleDrop(e, status)}
                onDragLeave={() => setDragOver(null)}
                style={{ background: dragOver === status ? '#f0eeff' : 'white', border: dragOver === status ? '2px dashed #534AB7' : '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s', minHeight: 400 }}
              >
                {/* COLUMN HEADER */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: status === 'matched' && aboveThresholdCount > 0 ? 8 : 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                    <span style={{ fontSize: 11, background: STATUS_BG[status], color: STATUS_COLORS[status], padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{byStatus(status).length}</span>
                  </div>

                  {status === 'matched' && byStatus('matched').length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aboveThresholdCount > 0 && (
                        <button onClick={shortlistAllAboveThreshold} disabled={shortlistingAll} style={{ width: '100%', padding: '7px 10px', background: shortlistingAll ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: shortlistingAll ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          {shortlistingAll ? '⟳ Moving...' : `⚡ Shortlist all above ${threshold}% (${aboveThresholdCount})`}
                        </button>
                      )}
                      {selectedMatched.size > 0 && (
                        <button onClick={shortlistSelected} disabled={shortlistingAll} style={{ width: '100%', padding: '7px 10px', background: shortlistingAll ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: shortlistingAll ? 'not-allowed' : 'pointer' }}>
                          ✓ Shortlist {selectedMatched.size} selected
                        </button>
                      )}
                    </div>
                  )}

                  {status === 'shortlisted' && byStatus('shortlisted').length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={selectAllShortlisted} style={{ fontSize: 11, padding: '3px 10px', background: '#f0eeff', color: '#534AB7', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Select all</button>
                      {selectedShortlisted.size > 0 && <button onClick={() => setSelectedShortlisted(new Set())} style={{ fontSize: 11, padding: '3px 10px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Clear</button>}
                    </div>
                  )}
                </div>

                {/* CARDS */}
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byStatus(status).map(c => (
                    <div key={c.id}
                      draggable
                      onDragStart={e => handleDragStart(e, c.id)}
                      onDragEnd={handleDragEnd}
                      style={{ background: 'white', border: '1px solid #f0f0f0', borderLeft: `4px solid ${getScoreBorder(c.match_score)}`, borderRadius: 8, padding: '10px 12px', cursor: 'grab', opacity: dragId === c.id ? 0.4 : 1, transition: 'all 0.15s', userSelect: 'none', boxShadow: (status === 'matched' && selectedMatched.has(c.id)) || (status === 'shortlisted' && selectedShortlisted.has(c.id)) ? '0 0 0 2px rgba(83,74,183,0.3)' : '0 1px 3px rgba(0,0,0,0.04)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {status === 'matched' && (
                          <input type="checkbox" checked={selectedMatched.has(c.id)} onChange={() => toggleSelectMatched(c.id)} onClick={e => e.stopPropagation()} style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer', accentColor: '#534AB7', width: 14, height: 14 }} />
                        )}
                        {status === 'shortlisted' && (
                          <input type="checkbox" checked={selectedShortlisted.has(c.id)} onChange={() => toggleSelectShortlisted(c.id)} onClick={e => e.stopPropagation()} style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer', accentColor: '#534AB7', width: 14, height: 14 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                            <div onClick={() => openProfile(c)} style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', cursor: 'pointer', lineHeight: 1.3 }}>{c.name}</div>
                            <div style={{ flexShrink: 0, marginLeft: 8, background: getScoreBg(c.match_score), borderRadius: 6, padding: '2px 8px' }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: getScoreColor(c.match_score) }}>{c.match_score}%</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{c.role_applied}</div>
                          {c.last_employer && <div style={{ fontSize: 11, color: '#bbb', marginBottom: 3 }}>@ {c.last_employer}</div>}
                          {c.location && <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>📍 {c.location}</div>}
                          {c.years_experience > 0 && (
                            <span style={{ fontSize: 10, background: '#EEEDFE', color: '#534AB7', padding: '2px 7px', borderRadius: 10, fontWeight: 600, display: 'inline-block', marginBottom: 6 }}>{c.years_experience}yr exp</span>
                          )}
                          {c.keyword_matches.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                              {c.keyword_matches.slice(0, 3).map(kw => (
                                <span key={kw} style={{ fontSize: 10, background: '#E1F5EE', color: '#1D9E75', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>✓ {kw}</span>
                              ))}
                              {c.keyword_matches.length > 3 && <span style={{ fontSize: 10, color: '#aaa' }}>+{c.keyword_matches.length - 3}</span>}
                            </div>
                          )}
                          {status === 'matched' && (
                            <button onClick={() => updatePipelineStatus(c.id, 'shortlisted')} style={{ width: '100%', padding: '5px 0', background: '#f0eeff', color: '#534AB7', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>
                              + Shortlist
                            </button>
                          )}
                          {status === 'shortlisted' && (
                            <button onClick={() => openSendModal(c)} disabled={sending === c.id} style={{ width: '100%', padding: '5px 0', background: '#534AB7', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>
                              {sending === c.id ? '⟳ Sending...' : '🎙 Send voice note'}
                            </button>
                          )}
                          {status === 'voice_sent' && (
                            <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 500, marginTop: 2 }}>✓ Voice note sent</div>
                          )}
                          {status === 'interview_booked' && (
                            <div style={{ fontSize: 11, color: '#639922', fontWeight: 500, marginTop: 2 }}>✓ Interview booked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {byStatus(status).length === 0 && (
                    <div style={{ fontSize: 12, color: '#ddd', padding: '24px 8px', textAlign: 'center' }}>
                      {dragOver === status ? 'Drop here' : status === 'matched' ? 'Run match to populate' : 'Empty'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SINGLE SEND MODAL */}
      {showSendModal && sendTarget && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => { setShowSendModal(false); setSendTarget(null); setScriptPreview('') })} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, width: 540, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎙</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Send voice note</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>to {sendTarget.name} — {job?.title}</div>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Voice note script <span style={{ color: '#aaa', fontWeight: 400 }}>(edit if needed)</span></label>
                {generatingScript && <span style={{ fontSize: 11, color: '#aaa' }}>⟳ Generating...</span>}
              </div>
              <textarea value={scriptPreview} onChange={e => setScriptPreview(e.target.value)} rows={8} placeholder={generatingScript ? 'Generating script...' : 'Script will appear here'} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12, background: generatingScript ? '#fafafa' : 'white' }} />
              {scriptPreview && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  {scriptPreview.split(' ').length} words · approx {Math.round(scriptPreview.split(' ').length / 2.3)} seconds
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSendModal(false); setSendTarget(null); setScriptPreview('') }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>Cancel</button>
              <button onClick={confirmSingleSend} disabled={generatingScript} style={{ padding: '9px 20px', background: generatingScript ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: generatingScript ? 'not-allowed' : 'pointer' }}>
                🎙 Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CONFIRM MODAL */}
      {showBulkConfirm && (
        <div style={overlayStyle}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.2s ease' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Send voice notes</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
              You are about to send voice notes to <strong style={{ color: '#1a1a1a' }}>{bulkQueue.length} candidate{bulkQueue.length !== 1 ? 's' : ''}</strong> for <strong style={{ color: '#1a1a1a' }}>{job?.title}</strong>. How would you like to proceed?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <button onClick={startBulkSendAll} style={{ padding: '14px 20px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 3 }}>
                <span>🚀 Send all automatically</span>
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>AI generates each script and sends without review</span>
              </button>
              <button onClick={startBulkReviewIndividual} style={{ padding: '14px 20px', background: 'white', color: '#534AB7', border: '1px solid #534AB7', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 3 }}>
                <span>✏️ Review each script individually</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>Preview and edit each script before sending</span>
              </button>
            </div>
            <button onClick={() => setShowBulkConfirm(false)} style={{ width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', color: '#888', fontWeight: 500 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* BULK INDIVIDUAL REVIEW MODAL */}
      {bulkMode === 'individual' && bulkCurrent && (
        <div style={overlayStyle}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 540, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Review script</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{bulkQueue.length} remaining</div>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Sending to {bulkCurrent.name} — {job?.title}</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Voice note script</label>
                {generatingScript && <span style={{ fontSize: 11, color: '#aaa' }}>⟳ Generating...</span>}
              </div>
              <textarea value={bulkCurrentScript} onChange={e => setBulkCurrentScript(e.target.value)} rows={8} placeholder={generatingScript ? 'Generating script...' : 'Script will appear here'} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12, background: generatingScript ? '#fafafa' : 'white' }} />
              {bulkCurrentScript && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  {bulkCurrentScript.split(' ').length} words · approx {Math.round(bulkCurrentScript.split(' ').length / 2.3)} seconds
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={cancelBulkIndividual} style={{ padding: '9px 16px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', color: '#888', fontWeight: 500 }}>Cancel all</button>
                <button onClick={skipBulkIndividual} style={{ padding: '9px 16px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', color: '#555', fontWeight: 500 }}>Skip →</button>
              </div>
              <button onClick={confirmBulkIndividual} disabled={generatingScript || sending === bulkCurrent.id} style={{ padding: '9px 20px', background: generatingScript || sending === bulkCurrent.id ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: generatingScript || sending === bulkCurrent.id ? 'not-allowed' : 'pointer' }}>
                {sending === bulkCurrent.id ? '⟳ Sending...' : '🎙 Send and next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE PROFILE MODAL */}
      {showProfile && profileCandidate && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, closeProfile)} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, width: 580, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#534AB7' }}>
                  {profileCandidate.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' }}>{profileCandidate.name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{profileCandidate.role_applied}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: getScoreBg(profileCandidate.match_score), borderRadius: 8, padding: '4px 12px' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: getScoreColor(profileCandidate.match_score) }}>{profileCandidate.match_score}%</span>
                </div>
                <span style={{ fontSize: 11, background: STATUS_BG[profileCandidate.pipeline_status] || '#f0f0f0', color: STATUS_COLORS[profileCandidate.pipeline_status] || '#888', padding: '4px 12px', borderRadius: 10, fontWeight: 600 }}>
                  {STATUS_LABELS[profileCandidate.pipeline_status] || profileCandidate.pipeline_status}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Experience', value: profileCandidate.years_experience > 0 ? `${profileCandidate.years_experience} years` : 'Not specified' },
                { label: 'Location', value: profileCandidate.location || 'Not specified' },
                { label: 'Last employer', value: profileCandidate.last_employer || 'Not specified' },
              ].map(item => (
                <div key={item.label} style={{ background: '#f9f9f9', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, fontWeight: 600 }}>Contact</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 3 }}>{profileCandidate.email}</div>
              {profileCandidate.phone && <div style={{ fontSize: 13, color: '#555' }}>{profileCandidate.phone}</div>}
            </div>

            {profileCandidate.candidate_summary && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Profile summary</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' }}>
                  {profileCandidate.candidate_summary}
                </div>
              </div>
            )}

            {(profileCandidate.skills || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(profileCandidate.skills || []).map((skill: string) => (
                    <span key={skill} style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {profileCandidate.keyword_matches.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Matching keywords for {job?.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profileCandidate.keyword_matches.map((kw: string) => (
                    <span key={kw} style={{ fontSize: 11, background: '#E1F5EE', color: '#1D9E75', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>✓ {kw}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Strength keywords</div>
                <button onClick={() => regenerateKeywords(profileCandidate)} disabled={regeneratingKeywords} style={{ fontSize: 11, padding: '4px 10px', background: regeneratingKeywords ? '#f5f5f5' : '#f0eeff', color: regeneratingKeywords ? '#aaa' : '#534AB7', border: '1px solid #EEEDFE', borderRadius: 6, cursor: regeneratingKeywords ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  {regeneratingKeywords ? '⟳ Regenerating...' : '⚡ Regenerate'}
                </button>
              </div>
              {(profileCandidate.strength_keywords || []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(profileCandidate.strength_keywords || []).map((kw: string) => (
                    <span key={kw} style={{ fontSize: 11, background: '#E1F5EE', color: '#1D9E75', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>⚡ {kw}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>No keywords yet</div>
              )}
            </div>

            {(profileCandidate.qualifications || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Qualifications</div>
                {(profileCandidate.qualifications || []).map((q: string) => (
                  <div key={q} style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>• {q}</div>
                ))}
              </div>
            )}

            {profileCandidate.last_script && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Last voice note script</div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '12px 14px', fontStyle: 'italic' }}>
                  {profileCandidate.last_script}
                </div>
              </div>
            )}

            {profileCandidate.voice_note_url && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Last voice note</div>
                <audio controls src={profileCandidate.voice_note_url} style={{ width: '100%', borderRadius: 8 }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={closeProfile} style={{ padding: '9px 16px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>Close</button>
              {profileCandidate.pipeline_status === 'matched' && (
                <button onClick={() => { updatePipelineStatus(profileCandidate.id, 'shortlisted'); closeProfile() }} style={{ padding: '9px 16px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Shortlist</button>
              )}
              {profileCandidate.pipeline_status === 'shortlisted' && (
                <button onClick={() => { closeProfile(); openSendModal(profileCandidate) }} style={{ padding: '9px 16px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🎙 Send voice note</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT JOB MODAL */}
      {showEditJob && job && (
        <JobFormModal
          mode="edit"
          job={job}
          onSave={() => { loadJob(); notify('Job updated successfully') }}
          onClose={() => setShowEditJob(false)}
          notify={notify}
        />
      )}
    </div>
  )
}
