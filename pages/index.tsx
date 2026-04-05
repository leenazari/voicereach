import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Candidate } from '../lib/supabase'
import JobFormModal from '../components/JobFormModal'

const STATUSES = ['applied', 'shortlisted', 'voice_sent', 'interview_booked']

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  voice_sent: 'Voice Sent',
  interview_booked: 'Interview Booked'
}

const STATUS_COLORS: Record<string, string> = {
  applied: '#185FA5',
  shortlisted: '#534AB7',
  voice_sent: '#1D9E75',
  interview_booked: '#639922'
}

const STATUS_BG: Record<string, string> = {
  applied: '#E6F1FB',
  shortlisted: '#EEEDFE',
  voice_sent: '#E1F5EE',
  interview_booked: '#EAF3DE'
}

type Voice = { voice_id: string; name: string; preview_url: string }
type Notification = { id: number; message: string; type: 'success' | 'error' }
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
}

const JOB_STATUS_COLORS: Record<string, string> = { active: '#1D9E75', draft: '#888', closed: '#E24B4A' }
const JOB_STATUS_BG: Record<string, string> = { active: '#E1F5EE', draft: '#f0f0f0', closed: '#fff0ee' }

export default function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [showAddJob, setShowAddJob] = useState(false)
  const [showEditJob, setShowEditJob] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [shortlisting, setShortlisting] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showVoices, setShowVoices] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profileCandidate, setProfileCandidate] = useState<Candidate | null>(null)
  const [jobModalCandidate, setJobModalCandidate] = useState<Candidate | null>(null)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobSendForm, setJobSendForm] = useState({ jobTitle: '', jobSalary: '' })
  const [scriptPreview, setScriptPreview] = useState('')
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [playerCandidate, setPlayerCandidate] = useState<Candidate | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '', last_employer: '', location: '', candidate_summary: '', skills: '', qualifications: '', all_employers: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '', last_employer: '', location: '' })
  const [activeTab, setActiveTab] = useState('pipeline')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('P4DhdyNCB4Nl6MA0sL45')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notifId = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scriptDebounce = useRef<any>(null)
  const mouseDownOnOverlay = useRef(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    setUser(session.user)
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
    fetchCandidates()
    fetchJobs()
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId.current
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  async function fetchCandidates() {
    const res = await fetch('/api/candidates')
    const data = await res.json()
    setCandidates(data.candidates || [])
    setLoading(false)
  }

  async function fetchJobs() {
    const res = await fetch('/api/jobs')
    const data = await res.json()
    setJobs(data.jobs || [])
  }

  async function deleteJob(job: Job) {
    if (!confirm(`Delete ${job.title}? This cannot be undone.`)) return
    const res = await fetch('/api/jobs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id }) })
    const data = await res.json()
    if (data.success) { fetchJobs(); notify(`${job.title} deleted`) }
    else notify('Could not delete job', 'error')
  }

  async function fetchVoices() {
    const res = await fetch('/api/voices')
    const data = await res.json()
    setVoices(data.voices || [])
  }

  function openVoices() { setShowVoices(true); fetchVoices() }

  async function selectVoice(voiceId: string) {
    await fetch('/api/voices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceId }) })
    setSelectedVoiceId(voiceId)
    setShowVoices(false)
    notify('Voice updated successfully')
  }

  function previewVoice(voice: Voice) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (playingVoice === voice.voice_id) { setPlayingVoice(null); return }
    const audio = new Audio(voice.preview_url)
    audioRef.current = audio
    audio.play()
    setPlayingVoice(voice.voice_id)
    audio.onended = () => setPlayingVoice(null)
  }

  function openPlayer(candidate: Candidate) { setPlayerCandidate(candidate); setShowPlayer(true) }
  function openProfile(candidate: Candidate) { setProfileCandidate(candidate); setShowProfile(true) }

  function overlayMouseDown(e: React.MouseEvent) { mouseDownOnOverlay.current = e.target === e.currentTarget }
  function overlayMouseUp(e: React.MouseEvent, closeFn: () => void) {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) closeFn()
    mouseDownOnOverlay.current = false
  }

  async function generatePreview(candidateId: string, jobTitle: string, jobSalary: string) {
    if (!jobTitle) return
    setGeneratingPreview(true)
    try {
      const res = await fetch('/api/preview-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, jobTitle, jobSalary })
      })
      const data = await res.json()
      if (data.script) setScriptPreview(data.script)
    } catch { }
    finally { setGeneratingPreview(false) }
  }

  function openJobModal(candidate: Candidate) {
    setJobModalCandidate(candidate)
    setSelectedJobId('')
    setJobSendForm({ jobTitle: candidate.job_title || candidate.role_applied, jobSalary: candidate.job_salary || '' })
    setScriptPreview('')
    setShowJobModal(true)
    generatePreview(candidate.id, candidate.job_title || candidate.role_applied, candidate.job_salary || '')
  }

  function handleJobSelect(jobId: string) {
    setSelectedJobId(jobId)
    if (jobId) {
      const job = jobs.find(j => j.id === jobId)
      if (job && jobModalCandidate) {
        setJobSendForm({ jobTitle: job.title, jobSalary: job.salary || '' })
        generatePreview(jobModalCandidate.id, job.title, job.salary || '')
      }
    }
  }

  function handleJobSendFormChange(field: string, value: string) {
    const newForm = { ...jobSendForm, [field]: value }
    setJobSendForm(newForm)
    if (scriptDebounce.current) clearTimeout(scriptDebounce.current)
    scriptDebounce.current = setTimeout(() => {
      if (jobModalCandidate && newForm.jobTitle) {
        generatePreview(jobModalCandidate.id, newForm.jobTitle, newForm.jobSalary)
      }
    }, 800)
  }

  async function confirmShortlist() {
    if (!jobModalCandidate) return
    if (!jobSendForm.jobTitle) { notify('Please enter a job title', 'error'); return }
    if (profile && profile.credits_used >= profile.credits_limit) {
      notify('You have used all your credits. Please upgrade your plan.', 'error')
      return
    }
    setShowJobModal(false)
    setShortlisting(jobModalCandidate.id)
    try {
      const res = await fetch('/api/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: jobModalCandidate.id,
          jobId: selectedJobId || undefined,
          jobTitle: jobSendForm.jobTitle,
          jobSalary: jobSendForm.jobSalary,
          customScript: scriptPreview || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        notify(`Voice note sent to ${jobModalCandidate.name} ✓`)
        fetchCandidates()
        if (profile) setProfile({ ...profile, credits_used: profile.credits_used + 1 })
      } else notify('Error: ' + data.error, 'error')
    } finally { setShortlisting(null); setJobModalCandidate(null); setScriptPreview('') }
  }

  async function handleCvUpload(file: File) {
    if (profile && profile.credits_used >= profile.credits_limit) {
      notify('You have used all your credits. Please upgrade your plan.', 'error')
      return
    }
    setCvFile(file); setExtracting(true)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = () => rej(new Error('Read failed'))
        r.readAsDataURL(file)
      })
      const response = await fetch('/api/extract-cv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, filename: file.name }) })
      const data = await response.json()
      if (data.extracted) {
        const e = data.extracted
        setForm(prev => ({
          ...prev,
          name: e.name || prev.name,
          email: e.email || prev.email,
          phone: e.phone || prev.phone,
          role_applied: e.role || prev.role_applied,
          experience_summary: e.experience_summary || prev.experience_summary,
          years_experience: e.years_experience?.toString() || prev.years_experience,
          last_employer: e.last_employer || prev.last_employer,
          location: e.location || prev.location,
          candidate_summary: e.candidate_summary || prev.candidate_summary,
          skills: (e.skills || []).join(', '),
          qualifications: (e.qualifications || []).join(', '),
          all_employers: (e.all_employers || []).join(', '),
        }))
        notify('CV read successfully — fields auto-filled')
      }
    } catch { notify('Could not extract CV — please fill in manually', 'error') }
    finally { setExtracting(false) }
  }

  function openEdit(candidate: Candidate) {
    setEditingCandidate(candidate)
    setEditForm({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      role_applied: candidate.role_applied || '',
      experience_summary: candidate.experience_summary || '',
      years_experience: candidate.years_experience?.toString() || '',
      job_title: candidate.job_title || '',
      job_salary: candidate.job_salary || '',
      last_employer: (candidate as any).last_employer || '',
      location: (candidate as any).location || '',
    })
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!editingCandidate) return
    if (!editForm.name || !editForm.email || !editForm.role_applied || !editForm.experience_summary) { notify('Please fill in all required fields', 'error'); return }
    const res = await fetch('/api/candidates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId: editingCandidate.id, ...editForm, years_experience: parseInt(editForm.years_experience) || 0 }) })
    const data = await res.json()
    if (data.success) { setShowEdit(false); setEditingCandidate(null); fetchCandidates(); notify('Candidate updated') }
    else notify('Error: ' + (data.error || 'Something went wrong'), 'error')
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!confirm(`Delete ${candidate.name}? This cannot be undone.`)) return
    const res = await fetch('/api/candidates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId: candidate.id }) })
    const data = await res.json()
    if (data.success) { fetchCandidates(); notify(`${candidate.name} deleted`) }
    else notify('Could not delete candidate', 'error')
  }

  async function moveCandidate(candidateId: string, newStatus: string) {
    await fetch('/api/candidates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId, status: newStatus }) })
    fetchCandidates()
  }

  function handleDragStart(e: React.DragEvent, id: string) { setDragId(id); e.dataTransfer.effectAllowed = 'move' }
  function handleDragOver(e: React.DragEvent, status: string) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(status) }
  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault()
    if (dragId) {
      const candidate = candidates.find(c => c.id === dragId)
      if (candidate && candidate.status !== status) {
        if (status === 'shortlisted' && candidate.status === 'applied') openJobModal(candidate)
        else moveCandidate(dragId, status)
      }
    }
    setDragId(null); setDragOver(null)
  }
  function handleDragEnd() { setDragId(null); setDragOver(null) }

  async function addCandidate() {
    if (!form.name || !form.email || !form.role_applied || !form.experience_summary) { notify('Please fill in all required fields', 'error'); return }
    const res = await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        years_experience: parseInt(form.years_experience) || 0,
        skills: form.skills ? form.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        qualifications: form.qualifications ? form.qualifications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        all_employers: form.all_employers ? form.all_employers.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      })
    })
    const data = await res.json()
    if (data.candidate) {
      setShowAdd(false); setCvFile(null)
      setForm({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '', last_employer: '', location: '', candidate_summary: '', skills: '', qualifications: '', all_employers: '' })
      fetchCandidates(); notify('Candidate added successfully')
    } else notify('Error: ' + (data.error || 'Something went wrong'), 'error')
  }

  const filterCandidates = (list: Candidate[]) => {
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter(c => c.name?.toLowerCase().includes(s) || c.role_applied?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s))
  }

  const byStatus = (status: string) => filterCandidates(candidates.filter(c => c.status === status))
  const filteredAll = filterCandidates(candidates)

  const stats = {
    total: candidates.length,
    voiceSent: candidates.filter(c => ['voice_sent', 'interview_booked', 'hired'].includes(c.status)).length,
    interviews: candidates.filter(c => ['interview_booked', 'hired'].includes(c.status)).length,
  }

  const creditsPercent = profile && profile.credits_limit !== 999999 ? Math.min((profile.credits_used / profile.credits_limit) * 100, 100) : 0
  const creditsColor = creditsPercent >= 90 ? '#E24B4A' : creditsPercent >= 70 ? '#BA7517' : '#534AB7'

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
  const modalStyle: React.CSSProperties = { background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }

  const addFields = [
    { key: 'name', label: 'Full name *', type: 'text' },
    { key: 'email', label: 'Email *', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'role_applied', label: 'Role applied for *', type: 'text' },
    { key: 'last_employer', label: 'Last employer', type: 'text' },
    { key: 'years_experience', label: 'Years of experience', type: 'number' },
  ]

  const editFields = [
    { key: 'name', label: 'Full name *', type: 'text' },
    { key: 'email', label: 'Email *', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'role_applied', label: 'Role applied for *', type: 'text' },
    { key: 'last_employer', label: 'Last employer', type: 'text' },
    { key: 'years_experience', label: 'Years of experience', type: 'number' },
    { key: 'job_title', label: 'Job title', type: 'text' },
    { key: 'job_salary', label: 'Salary (e.g. £45,000)', type: 'text' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f5f5f7' }}>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => (
          <div key={n.id} style={{ background: n.type === 'success' ? '#1a1a1a' : '#E24B4A', color: 'white', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'slideIn 0.2s ease', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{n.type === 'success' ? '✓' : '✕'}</span>{n.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: 240, background: 'white', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' }}>VoiceReach</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>AI outreach platform</div>
        </div>
        <div style={{ padding: '12px 0', flex: 1 }}>
          <div style={{ padding: '6px 12px 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ccc', fontWeight: 600 }}>Main</div>
          {[
            { id: 'pipeline', label: 'Pipeline', icon: '◈' },
            { id: 'candidates', label: 'All Candidates', icon: '◎' },
            { id: 'jobs', label: 'Jobs', icon: '◉' },
            { id: 'analytics', label: 'Analytics', icon: '◷' }
          ].map(tab => (
            <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: activeTab === tab.id ? '#534AB7' : '#555', background: activeTab === tab.id ? '#f0eeff' : 'transparent', borderLeft: activeTab === tab.id ? '2px solid #534AB7' : '2px solid transparent', fontWeight: activeTab === tab.id ? 600 : 400, margin: '1px 0' }}>
              <span>{tab.icon}</span>{tab.label}
              {tab.id === 'jobs' && jobs.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, background: '#EEEDFE', color: '#534AB7', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{jobs.filter(j => j.status === 'active').length}</span>}
            </div>
          ))}
          {profile?.role === 'admin' && (
            <div onClick={() => window.location.href = '/admin'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: '#E24B4A', borderLeft: '2px solid transparent', margin: '1px 0' }}>
              <span>⊛</span>Admin panel
            </div>
          )}
          <div style={{ padding: '16px 12px 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ccc', fontWeight: 600 }}>Settings</div>
          <div onClick={openVoices} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 13, color: '#555', cursor: 'pointer', borderLeft: '2px solid transparent' }}>
            <span>⊙</span>Voice selector
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
              {profile.credits_limit !== 999999 ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: '#aaa' }}>Credits</span>
                    <span style={{ fontSize: 10, color: creditsColor, fontWeight: 600 }}>{profile.credits_used}/{profile.credits_limit}</span>
                  </div>
                  <div style={{ height: 4, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${creditsPercent}%`, background: creditsColor, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  {creditsPercent >= 90 && <div style={{ marginTop: 8, fontSize: 11, color: '#E24B4A', fontWeight: 500 }}>Credits almost used up</div>}
                </>
              ) : (
                <div style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600, marginTop: 4 }}>✓ Unlimited credits</div>
              )}
            </div>
          )}
          <div onClick={signOut} style={{ fontSize: 12, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span>→</span> Sign out
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.2px' }}>
              {activeTab === 'pipeline' ? 'Candidate Pipeline' : activeTab === 'candidates' ? 'All Candidates' : activeTab === 'jobs' ? 'Jobs' : 'Analytics'}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>
              {activeTab === 'pipeline' ? 'Drag candidates between columns or click to shortlist' : activeTab === 'candidates' ? `${filteredAll.length} candidates total` : activeTab === 'jobs' ? `${jobs.length} jobs — ${jobs.filter(j => j.status === 'active').length} active` : 'Performance overview'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeTab !== 'jobs' && <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', width: 180, background: '#f9f9f9' }} />}
            {activeTab === 'jobs' ? (
              <button onClick={() => setShowAddJob(true)} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Job</button>
            ) : (
              <button onClick={() => setShowAdd(true)} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Candidate</button>
            )}
          </div>
        </div>

        <div style={{ padding: 28, flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Total candidates', value: stats.total, color: '#534AB7' },
              { label: 'Voice notes sent', value: stats.voiceSent, color: '#1D9E75' },
              { label: 'Interviews booked', value: stats.interviews, color: '#185FA5' }
            ].map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: '1px solid #ebebeb' }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {activeTab === 'pipeline' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
              {STATUSES.map(status => (
                <div key={status} onDragOver={e => handleDragOver(e, status)} onDrop={e => handleDrop(e, status)} onDragLeave={() => setDragOver(null)}
                  style={{ background: dragOver === status ? '#f0eeff' : 'white', border: dragOver === status ? '2px dashed #534AB7' : '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                    <span style={{ fontSize: 11, background: STATUS_BG[status], color: STATUS_COLORS[status], padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{byStatus(status).length}</span>
                  </div>
                  <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                    {loading && <div style={{ fontSize: 12, color: '#ccc', padding: 8 }}>Loading...</div>}
                    {byStatus(status).map(c => (
                      <div key={c.id} draggable onDragStart={e => handleDragStart(e, c.id)} onDragEnd={handleDragEnd}
                        style={{ background: 'white', border: '1px solid #f0f0f0', borderLeft: `3px solid ${STATUS_COLORS[status]}`, borderRadius: 8, padding: '10px 12px', cursor: 'grab', opacity: dragId === c.id ? 0.4 : 1, transition: 'all 0.15s', userSelect: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div onClick={e => { e.stopPropagation(); openProfile(c) }} style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', lineHeight: 1.3, cursor: 'pointer' }}>{c.name}</div>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 6 }}>
                            <div onClick={e => { e.stopPropagation(); openEdit(c) }} style={{ fontSize: 10, color: '#888', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, border: '1px solid #e8e8e8', background: 'white' }}>edit</div>
                            <div onClick={e => { e.stopPropagation(); deleteCandidate(c) }} style={{ fontSize: 10, color: '#E24B4A', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, border: '1px solid #fdd', background: '#fff8f8' }}>del</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{c.role_applied}</div>
                        {(c as any).last_employer && <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>@ {(c as any).last_employer}</div>}
                        {(c as any).location && <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>📍 {(c as any).location}</div>}
                        {c.years_experience > 0 && <span style={{ fontSize: 10, background: '#EEEDFE', color: '#534AB7', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>{c.years_experience}yr exp</span>}
                        {status === 'applied' && (
                          <div onClick={() => openJobModal(c)} style={{ fontSize: 11, color: '#534AB7', fontWeight: 600, marginTop: 8, cursor: 'pointer' }}>
                            {shortlisting === c.id ? '⟳ Sending...' : '→ Shortlist and send voice note'}
                          </div>
                        )}
                        {status === 'shortlisted' && (
                          <div onClick={() => openJobModal(c)} style={{ fontSize: 11, color: '#BA7517', fontWeight: 600, marginTop: 8, cursor: 'pointer' }}>
                            {shortlisting === c.id ? '⟳ Sending...' : '↺ Resend voice note'}
                          </div>
                        )}
                        {status === 'voice_sent' && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 500 }}>✓ Voice note delivered</div>
                            {c.voice_note_url && <div onClick={() => openPlayer(c)} style={{ fontSize: 11, color: '#534AB7', fontWeight: 600, marginTop: 3, cursor: 'pointer' }}>▶ Play voice note</div>}
                          </div>
                        )}
                        {status === 'interview_booked' && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 11, color: '#639922', fontWeight: 500 }}>✓ Interview booked</div>
                            {c.voice_note_url && <div onClick={() => openPlayer(c)} style={{ fontSize: 11, color: '#534AB7', fontWeight: 600, marginTop: 3, cursor: 'pointer' }}>▶ Play voice note</div>}
                          </div>
                        )}
                      </div>
                    ))}
                    {!loading && byStatus(status).length === 0 && (
                      <div style={{ fontSize: 12, color: '#ddd', padding: '16px 8px', textAlign: 'center' }}>{dragOver === status ? 'Drop here' : 'Empty'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'candidates' && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
                    {['Name', 'Role', 'Last Employer', 'Location', 'Exp', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#ccc', fontSize: 13 }}>Loading...</td></tr>
                  ) : filteredAll.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#ccc', fontSize: 13 }}>No candidates found</td></tr>
                  ) : filteredAll.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < filteredAll.length - 1 ? '1px solid #f5f5f5' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div onClick={() => openProfile(c)} style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', cursor: 'pointer' }}>{c.name}</div>
                        {c.phone && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{c.phone}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{c.role_applied}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{(c as any).last_employer || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{(c as any).location || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {c.years_experience > 0 && <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{c.years_experience}yr</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, background: STATUS_BG[c.status] || '#f0f0f0', color: STATUS_COLORS[c.status] || '#888', padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openProfile(c)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #EEEDFE', borderRadius: 6, cursor: 'pointer', background: '#EEEDFE', color: '#534AB7', fontWeight: 500 }}>Profile</button>
                          <button onClick={() => openEdit(c)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', background: 'white', color: '#555', fontWeight: 500 }}>Edit</button>
                          {c.voice_note_url && <button onClick={() => openPlayer(c)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #E1F5EE', borderRadius: 6, cursor: 'pointer', background: '#E1F5EE', color: '#1D9E75', fontWeight: 500 }}>▶ Play</button>}
                          <button onClick={() => openJobModal(c)} style={{ fontSize: 11, padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#534AB7', color: 'white', fontWeight: 500 }}>
                            {shortlisting === c.id ? '⟳' : '→ Send'}
                          </button>
                          <button onClick={() => deleteCandidate(c)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #fdd', borderRadius: 6, cursor: 'pointer', background: '#fff8f8', color: '#E24B4A', fontWeight: 500 }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div>
              {jobs.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', padding: 60, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>No jobs yet</div>
                  <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>Add your first job to start matching candidates</div>
                  <button onClick={() => setShowAddJob(true)} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add your first job</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {jobs.map(job => (
                    <div key={job.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', overflow: 'hidden' }}>
                      <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {job.logo_url ? (
                          <img src={job.logo_url} alt={job.company} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', border: '1px solid #f0f0f0', background: 'white' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#534AB7', flexShrink: 0 }}>
                            {(job.company || job.title)[0].toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{job.company || 'No company'}</div>
                        </div>
                        <span style={{ fontSize: 10, background: JOB_STATUS_BG[job.status] || '#f0f0f0', color: JOB_STATUS_COLORS[job.status] || '#888', padding: '2px 8px', borderRadius: 8, fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>
                          {job.status}
                        </span>
                      </div>
                      <div style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                          {job.salary && <span style={{ fontSize: 12, color: '#534AB7', fontWeight: 600 }}>💰 {job.salary}</span>}
                          {job.location && <span style={{ fontSize: 12, color: '#888' }}>📍 {job.location}</span>}
                          {job.sector && <span style={{ fontSize: 12, color: '#888' }}>◎ {job.sector}</span>}
                        </div>
                        {job.description && (
                          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {job.description}
                          </div>
                        )}
                        {(job.required_skills || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                            {(job.required_skills || []).slice(0, 4).map(skill => (
                              <span key={skill} style={{ fontSize: 10, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{skill}</span>
                            ))}
                            {(job.required_skills || []).length > 4 && <span style={{ fontSize: 10, color: '#aaa', padding: '2px 4px' }}>+{(job.required_skills || []).length - 4} more</span>}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditingJob(job); setShowEditJob(true) }} style={{ flex: 1, padding: '7px', border: '1px solid #e5e5e5', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'white', color: '#555', fontWeight: 500 }}>Edit</button>
                          <button onClick={() => deleteJob(job)} style={{ padding: '7px 12px', border: '1px solid #fdd', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff8f8', color: '#E24B4A', fontWeight: 500 }}>Del</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>◷</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Analytics coming soon</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>Open rates, click rates and conversion stats will appear here</div>
            </div>
          )}
        </div>
      </div>

      {/* JOB MODALS — now handled by JobFormModal component */}
      {showAddJob && (
        <JobFormModal
          mode="add"
          onSave={fetchJobs}
          onClose={() => setShowAddJob(false)}
          notify={notify}
        />
      )}

      {showEditJob && editingJob && (
        <JobFormModal
          mode="edit"
          job={editingJob}
          onSave={fetchJobs}
          onClose={() => { setShowEditJob(false); setEditingJob(null) }}
          notify={notify}
        />
      )}

      {/* SEND VOICE NOTE MODAL */}
      {showJobModal && jobModalCandidate && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => { setShowJobModal(false); setScriptPreview('') })} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 540, animation: 'modalIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎙</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Send voice note</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>to {jobModalCandidate.name}</div>
              </div>
            </div>
            {jobs.filter(j => j.status === 'active').length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>Match to a job <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                <select value={selectedJobId} onChange={e => handleJobSelect(e.target.value)} style={inputStyle}>
                  <option value="">No job selected — enter manually below</option>
                  {jobs.filter(j => j.status === 'active').map(j => (
                    <option key={j.id} value={j.id}>{j.title}{j.company ? ` — ${j.company}` : ''}{j.salary ? ` (${j.salary})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>Job title *</label>
                <input type="text" value={jobSendForm.jobTitle} onChange={e => handleJobSendFormChange('jobTitle', e.target.value)} placeholder="e.g. Senior Sales Executive" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>Salary <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" value={jobSendForm.jobSalary} onChange={e => handleJobSendFormChange('jobSalary', e.target.value)} placeholder="e.g. £45,000" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Voice note script <span style={{ color: '#aaa', fontWeight: 400 }}>(edit if needed)</span></label>
                {generatingPreview && <span style={{ fontSize: 11, color: '#aaa' }}>⟳ Generating...</span>}
              </div>
              <textarea value={scriptPreview} onChange={e => setScriptPreview(e.target.value)} rows={7} placeholder={generatingPreview ? 'Generating script...' : 'Script will appear here'} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12, background: generatingPreview ? '#fafafa' : 'white' }} />
              {scriptPreview && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  {scriptPreview.split(' ').length} words, approx {Math.round(scriptPreview.split(' ').length / 2.3)} seconds
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowJobModal(false); setScriptPreview('') }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>Cancel</button>
              <button onClick={confirmShortlist} disabled={!jobSendForm.jobTitle || generatingPreview} style={{ padding: '9px 20px', background: !jobSendForm.jobTitle || generatingPreview ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !jobSendForm.jobTitle || generatingPreview ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                🎙 Generate and send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE PROFILE MODAL */}
      {showProfile && profileCandidate && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => setShowProfile(false))} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 580, maxHeight: '85vh', overflowY: 'auto', animation: 'modalIn 0.2s ease' }}>
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
              <span style={{ fontSize: 11, background: STATUS_BG[profileCandidate.status] || '#f0f0f0', color: STATUS_COLORS[profileCandidate.status] || '#888', padding: '4px 12px', borderRadius: 10, fontWeight: 600 }}>
                {STATUS_LABELS[profileCandidate.status] || profileCandidate.status}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Experience', value: profileCandidate.years_experience > 0 ? `${profileCandidate.years_experience} years` : 'Not specified' },
                { label: 'Location', value: (profileCandidate as any).location || 'Not specified' },
                { label: 'Last employer', value: (profileCandidate as any).last_employer || 'Not specified' },
              ].map(item => (
                <div key={item.label} style={{ background: '#f9f9f9', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, fontWeight: 600 }}>Contact</div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 3 }}>{profileCandidate.email}</div>
                {profileCandidate.phone && <div style={{ fontSize: 13, color: '#555' }}>{profileCandidate.phone}</div>}
              </div>
              {((profileCandidate as any).all_employers || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, fontWeight: 600 }}>Companies</div>
                  {((profileCandidate as any).all_employers || []).map((emp: string) => (
                    <div key={emp} style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>• {emp}</div>
                  ))}
                </div>
              )}
            </div>
            {(profileCandidate as any).candidate_summary && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Profile summary</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' }}>
                  {(profileCandidate as any).candidate_summary}
                </div>
              </div>
            )}
            {((profileCandidate as any).skills || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {((profileCandidate as any).skills || []).map((skill: string) => (
                    <span key={skill} style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}
            {((profileCandidate as any).qualifications || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Qualifications</div>
                {((profileCandidate as any).qualifications || []).map((q: string) => (
                  <div key={q} style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>• {q}</div>
                ))}
              </div>
            )}
            {profileCandidate.voice_note_url && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Last voice note</div>
                <audio controls src={profileCandidate.voice_note_url} style={{ width: '100%', borderRadius: 8 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={() => { setShowProfile(false); openEdit(profileCandidate) }} style={{ padding: '9px 16px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>Edit</button>
              <button onClick={() => { setShowProfile(false); openJobModal(profileCandidate) }} style={{ padding: '9px 16px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🎙 Send voice note</button>
            </div>
          </div>
        </div>
      )}

      {/* VOICE NOTE PLAYER */}
      {showPlayer && playerCandidate && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => setShowPlayer(false))} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1a1a1a' }}>Voice note</h2>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>{playerCandidate.name} — {playerCandidate.job_title || playerCandidate.role_applied}</p>
            <audio controls src={playerCandidate.voice_note_url!} style={{ width: '100%', borderRadius: 8 }} />
          </div>
        </div>
      )}

      {/* VOICE SELECTOR */}
      {showVoices && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => setShowVoices(false))} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 520, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1a1a1a' }}>Voice selector</h2>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>Preview and select the voice for your outreach notes</p>
            {voices.length === 0 ? <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: 24 }}>Loading voices...</div> : voices.map(v => (
              <div key={v.voice_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', border: `1px solid ${selectedVoiceId === v.voice_id ? '#534AB7' : '#ebebeb'}`, borderRadius: 10, marginBottom: 8, background: selectedVoiceId === v.voice_id ? '#f0eeff' : 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{v.name}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => previewVoice(v)} style={{ padding: '5px 12px', border: '1px solid #e5e5e5', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'white', fontWeight: 500 }}>
                    {playingVoice === v.voice_id ? '⏹ Stop' : '▶ Preview'}
                  </button>
                  <button onClick={() => selectVoice(v.voice_id)} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: selectedVoiceId === v.voice_id ? '#1D9E75' : '#534AB7', color: 'white', fontWeight: 500 }}>
                    {selectedVoiceId === v.voice_id ? '✓ Active' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD CANDIDATE */}
      {showAdd && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => { setShowAdd(false); setCvFile(null) })} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a1a1a' }}>Add Candidate</h2>
            {profile && profile.credits_used >= profile.credits_limit && (
              <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#E24B4A', fontWeight: 500 }}>
                You have used all your credits. Please upgrade your plan to add more candidates.
              </div>
            )}
            <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCvUpload(f) }}
              style={{ border: `2px dashed ${cvFile ? '#534AB7' : '#e0e0e0'}`, borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: cvFile ? '#f0eeff' : '#fafafa' }}>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }} />
              {extracting ? <div style={{ fontSize: 13, color: '#534AB7', fontWeight: 500 }}>⟳ Reading CV with AI...</div>
                : cvFile ? <div style={{ fontSize: 13, color: '#534AB7', fontWeight: 500 }}>✓ {cvFile.name} — fields auto-filled below</div>
                : <div><div style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Drop CV here or click to upload</div><div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>PDF, DOC, DOCX — fields will auto-fill</div></div>}
            </div>
            {addFields.map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inputStyle, background: extracting ? '#f5f5f5' : 'white' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Experience summary * (used in voice note)</label>
              <textarea value={form.experience_summary} onChange={e => setForm(p => ({ ...p, experience_summary: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', background: extracting ? '#f5f5f5' : 'white' }} placeholder="e.g. 8 years in logistics management..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => { setShowAdd(false); setCvFile(null) }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>Cancel</button>
              <button onClick={addCandidate} disabled={extracting || (profile && profile.credits_used >= profile.credits_limit)} style={{ padding: '9px 18px', background: extracting ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: extracting ? 'not-allowed' : 'pointer' }}>{extracting ? 'Reading CV...' : 'Add candidate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CANDIDATE */}
      {showEdit && editingCandidate && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => { setShowEdit(false); setEditingCandidate(null) })} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a1a1a' }}>Edit — {editingCandidate.name}</h2>
            {editFields.map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>{f.label}</label>
                <input type={f.type} value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Experience summary *</label>
              <textarea value={editForm.experience_summary} onChange={e => setEditForm(p => ({ ...p, experience_summary: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => { setShowEdit(false); setEditingCandidate(null) }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>Cancel</button>
              <button onClick={saveEdit} style={{ padding: '9px 18px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
