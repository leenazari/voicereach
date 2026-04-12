import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { Candidate } from '../lib/supabase'
import JobFormModal from '../components/JobFormModal'
import { getCombinedScore, getScoreColor, getScoreBg, getScoreLabel, getScoreBreakdown } from '../lib/scoring'
import BulkUploadModal from '../components/BulkUploadModal'
import OnboardingModal from '../components/OnboardingModal'
import { useBulkUpload } from '../context/BulkUploadContext'

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  voice_sent: 'Voice Sent',
  interview_booked: 'Interview Booked',
  interviewed: 'Interviewed'
}

const STATUS_COLORS: Record<string, string> = {
  applied: '#185FA5',
  shortlisted: '#534AB7',
  voice_sent: '#1D9E75',
  interview_booked: '#639922',
  interviewed: '#302b63'
}

const STATUS_BG: Record<string, string> = {
  applied: '#E6F1FB',
  shortlisted: '#EEEDFE',
  voice_sent: '#E1F5EE',
  interview_booked: '#EAF3DE',
  interviewed: '#EEEDFE'
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
  closes_at?: string | null
  work_type?: string
  match_priority?: string
  match_threshold?: number
}

type MatchResult = {
  candidate_id: string
  name: string
  email: string
  role_applied: string
  years_experience: number
  last_employer: string
  location: string
  strength_keywords: string[]
  match_score: number
  keyword_matches: string[]
  status: string
  already_sent: boolean
}

type OnboardingSteps = { job: boolean; candidates: boolean; voice_note: boolean }
type ActivityDay = { date: string; label: string; candidates: number; voice_notes: number }

const JOB_STATUS_COLORS: Record<string, string> = { active: '#1D9E75', draft: '#888', closed: '#E24B4A' }
const JOB_STATUS_BG: Record<string, string> = { active: '#E1F5EE', draft: '#f0f0f0', closed: '#fff0ee' }
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number): ActivityDay[] {
  const days: ActivityDay[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = date.toISOString().split('T')[0]
    days.push({ date: key, label: String(d), candidates: 0, voice_notes: 0 })
  }
  return days
}

function ActivityChart({ data }: { data: ActivityDay[] }) {
  const [tooltip, setTooltip] = useState<{ day: ActivityDay; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const maxActivity = Math.max(...data.map(d => Math.max(d.candidates, d.voice_notes)), 1)

  return (
    <div ref={containerRef} style={{ overflowX: 'auto', position: 'relative' }} onMouseLeave={() => setTooltip(null)}>
      <div style={{ minWidth: Math.max(data.length * 22, 400) }}>
        {/* BARS */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, position: 'relative' }}>
          {data.map((day, i) => (
            <div
              key={day.date}
              style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%', cursor: 'default' }}
              onMouseEnter={e => {
                const barRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const containerRect = containerRef.current?.getBoundingClientRect()
                const left = barRect.left - (containerRect?.left || 0) + barRect.width / 2
                setTooltip({ day, left })
              }}
            >
              <div style={{ flex: 1, background: day.candidates > 0 ? '#534AB7' : '#f0f0f0', borderRadius: '3px 3px 0 0', height: `${Math.max((day.candidates / maxActivity) * 100, day.candidates > 0 ? 3 : 0)}%`, minHeight: day.candidates > 0 ? 3 : 0, transition: 'height 0.3s' }} />
              <div style={{ flex: 1, background: day.voice_notes > 0 ? '#1D9E75' : '#f0f0f0', borderRadius: '3px 3px 0 0', height: `${Math.max((day.voice_notes / maxActivity) * 100, day.voice_notes > 0 ? 3 : 0)}%`, minHeight: day.voice_notes > 0 ? 3 : 0, transition: 'height 0.3s' }} />
            </div>
          ))}

          {/* TOOLTIP */}
          {tooltip && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: tooltip.left,
              transform: 'translateX(-50%)',
              marginBottom: 8,
              background: '#1a1a1a',
              color: 'white',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              zIndex: 50,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              pointerEvents: 'none'
            }}>
              <div style={{ color: '#a78bfa', marginBottom: 5 }}>◼ {tooltip.day.candidates} candidate{tooltip.day.candidates !== 1 ? 's' : ''}</div>
              <div style={{ color: '#6ee7b7' }}>◼ {tooltip.day.voice_notes} voice note{tooltip.day.voice_notes !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 5, fontWeight: 400, borderTop: '1px solid #333', paddingTop: 5 }}>{tooltip.day.date}</div>
              <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1a1a1a' }} />
            </div>
          )}
        </div>

        {/* DATE LABELS */}
        <div style={{ display: 'flex', gap: 3, borderTop: '1px solid #f0f0f0', paddingTop: 5 }}>
          {data.map((day, i) => {
            const showLabel = i === 0 || (Number(day.label)) % 5 === 0
            return (
              <div key={day.date} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: showLabel ? '#bbb' : 'transparent', userSelect: 'none', overflow: 'hidden' }}>
                {day.label}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [showAddJob, setShowAddJob] = useState(false)
  const [showEditJob, setShowEditJob] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [matchingJob, setMatchingJob] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult[]>>({})
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())
  const [shortlisting, setShortlisting] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showVoices, setShowVoices] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [interviewCandidate, setInterviewCandidate] = useState<Candidate | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState<'auto' | 'manual'>('auto')
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingSteps>({ job: false, candidates: false, voice_note: false })
  const [bulkJobId, setBulkJobId] = useState<string | undefined>()
  const [bulkJobTitle, setBulkJobTitle] = useState<string | undefined>()
  const [profileCandidate, setProfileCandidate] = useState<Candidate | null>(null)
  const [jobModalCandidate, setJobModalCandidate] = useState<Candidate | null>(null)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobSendForm, setJobSendForm] = useState({ jobTitle: '', jobSalary: '' })
  const [scriptPreview, setScriptPreview] = useState('')
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [playerCandidate, setPlayerCandidate] = useState<Candidate | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [regeneratingKeywords, setRegeneratingKeywords] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '', last_employer: '', location: '', candidate_summary: '', skills: '', qualifications: '', all_employers: '', strength_keywords: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '', last_employer: '', location: '' })
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('P4DhdyNCB4Nl6MA0sL45')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activityData, setActivityData] = useState<ActivityDay[]>([])
  const [activityMonth, setActivityMonth] = useState(new Date().getMonth())
  const [activityYear, setActivityYear] = useState(new Date().getFullYear())
  const [monthStats, setMonthStats] = useState({ candidates: 0, voiceNotes: 0 })
  const [shortlistedThisWeek, setShortlistedThisWeek] = useState(0)
  const [interviewPacks, setInterviewPacks] = useState<Record<string, string>>({})
  const notifId = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scriptDebounce = useRef<any>(null)
  const mouseDownOnOverlay = useRef(false)
  const initialized = useRef(false)
  const { state: bulkState } = useBulkUpload()

  const isCurrentMonth = activityMonth === new Date().getMonth() && activityYear === new Date().getFullYear()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        setSessionToken(session.access_token)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          setProfile(data)
          if (data) {
            const onboarding = data.onboarding || { seen: false, steps: { job: false, candidates: false, voice_note: false } }
            setOnboardingSteps(onboarding.steps || { job: false, candidates: false, voice_note: false })
            const alreadyShown = sessionStorage.getItem('onboarding_shown')
            if (!onboarding.seen && !alreadyShown) {
              sessionStorage.setItem('onboarding_shown', 'true')
              setOnboardingMode('auto')
              setShowOnboarding(true)
              supabase.from('profiles').update({ onboarding: { ...onboarding, seen: true } }).eq('id', session.user.id)
            }
          }
        })
        fetchCandidates()
        fetchJobs()
        fetchInterviewPacks()
        fetchShortlistedThisWeek()
      } else if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !initialized.current) {
        initialized.current = true
        setUser(session.user)
        setSessionToken(session.access_token)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          setProfile(data)
          if (data) {
            const onboarding = data.onboarding || { seen: false, steps: { job: false, candidates: false, voice_note: false } }
            setOnboardingSteps(onboarding.steps || { job: false, candidates: false, voice_note: false })
            const alreadyShown = sessionStorage.getItem('onboarding_shown')
            if (!onboarding.seen && !alreadyShown) {
              sessionStorage.setItem('onboarding_shown', 'true')
              setOnboardingMode('auto')
              setShowOnboarding(true)
              supabase.from('profiles').update({ onboarding: { ...onboarding, seen: true } }).eq('id', session.user.id)
            }
          }
        })
         fetchCandidates()
        fetchJobs()
        fetchInterviewPacks()
        fetchShortlistedThisWeek()
      } else if (!session) {
        setTimeout(async () => {
          if (!initialized.current) {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (!retrySession) window.location.href = '/login'
          }
        }, 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab) setActiveTab(tab)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab) setActiveTab(tab)
    }
  }, [])

  useEffect(() => {
    fetchActivityData(activityYear, activityMonth)
  }, [activityMonth, activityYear])

  useEffect(() => {
    if (bulkState.done) {
      fetchCandidates()
      fetchActivityData(activityYear, activityMonth)
      markOnboardingStep('candidates')
    }
  }, [bulkState.done])

  async function fetchActivityData(year: number, month: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const startOfMonth = new Date(year, month, 1).toISOString()
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const { data: candidateData } = await supabase
      .from('candidates')
      .select('created_at')
      .eq('user_id', session.user.id)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    const { data: voiceData } = await supabase
      .from('candidates')
      .select('last_script_at')
      .eq('user_id', session.user.id)
      .gte('last_script_at', startOfMonth)
      .lte('last_script_at', endOfMonth)
      .not('last_script_at', 'is', null)

    const days = getDaysInMonth(year, month)
    const dayMap: Record<string, ActivityDay> = {}
    for (const d of days) dayMap[d.date] = { ...d }

    for (const c of candidateData || []) {
      const key = c.created_at?.split('T')[0]
      if (key && dayMap[key]) dayMap[key].candidates++
    }

    for (const v of voiceData || []) {
      const key = v.last_script_at?.split('T')[0]
      if (key && dayMap[key]) dayMap[key].voice_notes++
    }

    const result = Object.values(dayMap)
    setActivityData(result)
    setMonthStats({
      candidates: result.reduce((sum, d) => sum + d.candidates, 0),
      voiceNotes: result.reduce((sum, d) => sum + d.voice_notes, 0)
    })
  }

  function prevMonth() {
    if (activityMonth === 0) { setActivityMonth(11); setActivityYear(y => y - 1) }
    else setActivityMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    if (activityMonth === 11) { setActivityMonth(0); setActivityYear(y => y + 1) }
    else setActivityMonth(m => m + 1)
  }

  async function fetchShortlistedThisWeek() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { data: jobIds } = await supabase.from('jobs').select('id').eq('user_id', session.user.id)
    if (!jobIds || jobIds.length === 0) return
    const { count } = await supabase
      .from('job_candidates')
      .select('*', { count: 'exact', head: true })
      .in('job_id', jobIds.map((j: any) => j.id))
      .eq('status', 'shortlist')
      .gte('updated_at', sevenDaysAgo.toISOString())
    setShortlistedThisWeek(count || 0)
  }

  async function markOnboardingStep(step: 'job' | 'candidates' | 'voice_note') {
    const newSteps = { ...onboardingSteps, [step]: true }
    setOnboardingSteps(newSteps)
    if (user) {
      const { data } = await supabase.from('profiles').select('onboarding').eq('id', user.id).single()
      const current = data?.onboarding || { seen: true, steps: {} }
      await supabase.from('profiles').update({ onboarding: { ...current, steps: newSteps } }).eq('id', user.id)
    }
  }

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) }
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = '/login' }

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId.current
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  async function fetchCandidates() {
    const headers = await authHeaders()
    const res = await fetch('/api/candidates', { headers })
    const data = await res.json()
    setCandidates(data.candidates || [])
    setLoading(false)
  }

  async function fetchJobs() {
    const headers = await authHeaders()
    const res = await fetch('/api/jobs', { headers })
    const data = await res.json()
    setJobs(data.jobs || [])
  }

  async function fetchInterviewPacks() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('interview_packs')
      .select('job_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
   if (data) {
      const map: Record<string, string> = {}
      data.forEach((p: any) => { if (p.job_id) map[p.job_id] = p.job_id })
      console.log('Interview packs loaded:', map)
      setInterviewPacks(map)
    }
  }

  async function regenerateKeywords(candidate: Candidate) {
    setRegeneratingKeywords(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/regenerate-keywords', { method: 'POST', headers, body: JSON.stringify({ candidateId: candidate.id }) })
      const data = await res.json()
      if (data.success) {
        notify('Keywords regenerated successfully')
        setProfileCandidate((prev: any) => prev ? { ...prev, strength_keywords: data.strength_keywords } : prev)
        fetchCandidates()
      } else notify('Could not regenerate keywords', 'error')
    } catch { notify('Regeneration failed', 'error') }
    finally { setRegeneratingKeywords(false) }
  }

  async function findMatches(job: Job) {
    setMatchingJob(job.id)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/match-candidates', { method: 'POST', headers, body: JSON.stringify({ jobId: job.id }) })
      const data = await res.json()
      if (data.success) {
        setMatchResults(prev => ({ ...prev, [job.id]: data.results }))
        setExpandedJobs(prev => new Set(prev).add(job.id))
        notify(`Found ${data.shortlist} strong matches out of ${data.total} candidates`)
      } else notify('Could not match candidates', 'error')
    } catch { notify('Matching failed', 'error') }
    finally { setMatchingJob(null) }
  }

  async function deleteJob(job: Job) {
    if (!confirm(`Delete ${job.title}? This cannot be undone.`)) return
    const headers = await authHeaders()
    const res = await fetch('/api/jobs', { method: 'DELETE', headers, body: JSON.stringify({ jobId: job.id }) })
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
    const headers = await authHeaders()
    await fetch('/api/voices', { method: 'POST', headers, body: JSON.stringify({ voiceId }) })
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

  async function openProfile(candidate: Candidate) {
    setProfileCandidate(candidate)
    setShowProfile(true)
    if ((candidate as any).voice_note_path) {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/refresh-voice-url', { method: 'POST', headers, body: JSON.stringify({ candidateId: candidate.id }) })
        const data = await res.json()
        if (data.url) {
          setProfileCandidate(prev => prev ? { ...prev, voice_note_url: data.url } : prev)
          setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, voice_note_url: data.url } : c))
        } else if (data.expired) {
          setProfileCandidate(prev => prev ? { ...prev, voice_note_url: null } : prev)
        }
      } catch { }
    }
  }

  function overlayMouseDown(e: React.MouseEvent) { mouseDownOnOverlay.current = e.target === e.currentTarget }
  function overlayMouseUp(e: React.MouseEvent, closeFn: () => void) {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) closeFn()
    mouseDownOnOverlay.current = false
  }

  async function generatePreview(candidateId: string, jobTitle: string, jobSalary: string) {
    if (!jobTitle) return
    setGeneratingPreview(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/preview-script', { method: 'POST', headers, body: JSON.stringify({ candidateId, jobTitle, jobSalary }) })
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
      if (jobModalCandidate && newForm.jobTitle) generatePreview(jobModalCandidate.id, newForm.jobTitle, newForm.jobSalary)
    }, 800)
  }

  async function confirmShortlist() {
    if (!jobModalCandidate) return
    if (!jobSendForm.jobTitle) { notify('Please enter a job title', 'error'); return }
    if (profile && profile.credits_used >= profile.credits_limit) { notify('You have used all your credits. Please upgrade your plan.', 'error'); return }
    setShowJobModal(false)
    setShortlisting(jobModalCandidate.id)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/shortlist', { method: 'POST', headers, body: JSON.stringify({ candidateId: jobModalCandidate.id, jobId: selectedJobId || undefined, jobTitle: jobSendForm.jobTitle, jobSalary: jobSendForm.jobSalary, customScript: scriptPreview || undefined }) })
      const data = await res.json()
      if (data.success) {
        notify(`Voice note sent to ${jobModalCandidate.name} ✓`)
        fetchCandidates()
        fetchActivityData(activityYear, activityMonth)
        if (profile) setProfile({ ...profile, credits_used: profile.credits_used + 1 })
        markOnboardingStep('voice_note')
      } else notify('Error: ' + data.error, 'error')
    } finally { setShortlisting(null); setJobModalCandidate(null); setScriptPreview('') }
  }

  async function handleCvUpload(file: File) {
    if (profile && profile.credits_used >= profile.credits_limit) { notify('You have used all your credits. Please upgrade your plan.', 'error'); return }
    setCvFile(file); setExtracting(true)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = () => rej(new Error('Read failed'))
        r.readAsDataURL(file)
      })
      const headers = await authHeaders()
      const response = await fetch('/api/extract-cv', { method: 'POST', headers, body: JSON.stringify({ base64, filename: file.name }) })
      const data = await response.json()
      if (data.extracted) {
        const e = data.extracted
        setForm(prev => ({
          ...prev,
          name: e.name || prev.name, email: e.email || prev.email, phone: e.phone || prev.phone,
          role_applied: e.role || prev.role_applied, experience_summary: e.experience_summary || prev.experience_summary,
          years_experience: e.years_experience?.toString() || prev.years_experience, last_employer: e.last_employer || prev.last_employer,
          location: e.location || prev.location, candidate_summary: e.candidate_summary || prev.candidate_summary,
          skills: (e.skills || []).join(', '), qualifications: (e.qualifications || []).join(', '),
          all_employers: (e.all_employers || []).join(', '), strength_keywords: (e.strength_keywords || []).join(', '),
        }))
        notify('CV read successfully — fields auto-filled')
      }
    } catch { notify('Could not extract CV — please fill in manually', 'error') }
    finally { setExtracting(false) }
  }

  function openEdit(candidate: Candidate) {
    setEditingCandidate(candidate)
    setEditForm({ name: candidate.name || '', email: candidate.email || '', phone: candidate.phone || '', role_applied: candidate.role_applied || '', experience_summary: candidate.experience_summary || '', years_experience: candidate.years_experience?.toString() || '', job_title: candidate.job_title || '', job_salary: candidate.job_salary || '', last_employer: (candidate as any).last_employer || '', location: (candidate as any).location || '' })
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!editingCandidate) return
    if (!editForm.name || !editForm.email || !editForm.role_applied || !editForm.experience_summary) { notify('Please fill in all required fields', 'error'); return }
    const headers = await authHeaders()
    const res = await fetch('/api/candidates', { method: 'PATCH', headers, body: JSON.stringify({ candidateId: editingCandidate.id, ...editForm, years_experience: parseInt(editForm.years_experience) || 0 }) })
    const data = await res.json()
    if (data.success) { setShowEdit(false); setEditingCandidate(null); fetchCandidates(); notify('Candidate updated') }
    else notify('Error: ' + (data.error || 'Something went wrong'), 'error')
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!confirm(`Delete ${candidate.name}? This cannot be undone.`)) return
    const headers = await authHeaders()
    const res = await fetch('/api/candidates', { method: 'DELETE', headers, body: JSON.stringify({ candidateId: candidate.id }) })
    const data = await res.json()
    if (data.success) { fetchCandidates(); notify(`${candidate.name} deleted`) }
    else notify('Could not delete candidate', 'error')
  }

  async function addCandidate() {
    if (!form.name || !form.email || !form.role_applied || !form.experience_summary) { notify('Please fill in all required fields', 'error'); return }
    const headers = await authHeaders()
    const res = await fetch('/api/candidates', {
      method: 'POST', headers, body: JSON.stringify({
        ...form, years_experience: parseInt(form.years_experience) || 0,
        skills: form.skills ? form.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        qualifications: form.qualifications ? form.qualifications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        all_employers: form.all_employers ? form.all_employers.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        strength_keywords: form.strength_keywords ? form.strength_keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      })
    })
    const data = await res.json()
    if (data.candidate) {
      setShowAdd(false); setCvFile(null)
      setForm({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '', last_employer: '', location: '', candidate_summary: '', skills: '', qualifications: '', all_employers: '', strength_keywords: '' })
      fetchCandidates()
      fetchActivityData(activityYear, activityMonth)
      notify('Candidate added successfully')
      markOnboardingStep('candidates')
    } else notify('Error: ' + (data.error || 'Something went wrong'), 'error')
  }

  const filterCandidates = (list: Candidate[]) => {
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter(c => c.name?.toLowerCase().includes(s) || c.role_applied?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s))
  }

  const filteredAll = filterCandidates(candidates)

  const stats = {
    total: candidates.length,
    voiceSent: candidates.filter(c => ['voice_sent', 'interview_booked', 'hired'].includes(c.status)).length,
    interviews: candidates.filter(c => ['interview_booked', 'hired'].includes(c.status)).length,
    activeJobs: jobs.filter(j => j.status === 'active').length,
    matched: candidates.filter(c => c.status !== 'applied').length,
    conversionRate: candidates.filter(c => ['voice_sent', 'interview_booked'].includes(c.status)).length > 0
      ? Math.round((candidates.filter(c => c.status === 'interview_booked').length / candidates.filter(c => ['voice_sent', 'interview_booked'].includes(c.status)).length) * 100)
      : 0
  }

  const recentJobs = jobs.filter(j => j.status === 'active').slice(0, 5)
  const creditsPercent = profile && profile.credits_limit !== 999999 ? Math.min((profile.credits_used / profile.credits_limit) * 100, 100) : 0
  const creditsColor = creditsPercent >= 90 ? '#E24B4A' : creditsPercent >= 70 ? '#BA7517' : '#534AB7'
  const onboardingDoneCount = Object.values(onboardingSteps).filter(Boolean).length

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

  function getMatchColor(score: number): string { return getScoreColor(score) }
  function getMatchBg(score: number): string { return getScoreBg(score) }

  function renderJobCard(job: Job) {
    const gradients: Record<string, string> = {
      sales:      'linear-gradient(135deg, #064e25 0%, #15803D 55%, #16a34a 100%)',
      tech:       'linear-gradient(135deg, #0a2d5e 0%, #1d4ed8 55%, #0891b2 100%)',
      marketing:  'linear-gradient(135deg, #7c1a1a 0%, #dc2626 55%, #f97316 100%)',
      finance:    'linear-gradient(135deg, #3b1f6b 0%, #7c3aed 55%, #a855f7 100%)',
      hr:         'linear-gradient(135deg, #064e25 0%, #15803D 55%, #16a34a 100%)',
      operations:'linear-gradient(135deg, #0a2d5e 0%, #1d4ed8 55%, #0891b2 100%)',
      legal:      'linear-gradient(135deg, #3b1f6b 0%, #7c3aed 55%, #a855f7 100%)',
      healthcare: 'linear-gradient(135deg, #064e25 0%, #15803D 55%, #16a34a 100%)',
      default:    'linear-gradient(135deg, #1e1b6b 0%, #4F46E5 55%, #7C3AED 100%)',
    }
    const fallbacks = [
      'linear-gradient(135deg, #064e25 0%, #15803D 55%, #16a34a 100%)',
      'linear-gradient(135deg, #0a2d5e 0%, #1d4ed8 55%, #0891b2 100%)',
      'linear-gradient(135deg, #7c1a1a 0%, #dc2626 55%, #f97316 100%)',
      'linear-gradient(135deg, #3b1f6b 0%, #7c3aed 55%, #a855f7 100%)',
      'linear-gradient(135deg, #1e1b6b 0%, #4F46E5 55%, #7C3AED 100%)',
    ]
    const sector = (job.sector || '').toLowerCase()
    const sectorKey = Object.keys(gradients).find(k => k !== 'default' && sector.includes(k))
    const gradient = sectorKey
      ? gradients[sectorKey]
      : fallbacks[(job.company || job.title).charCodeAt(0) % fallbacks.length]
    const workTypeLabel = job.work_type === 'office' ? 'Office' : job.work_type === 'hybrid' ? 'Hybrid' : job.work_type === 'remote' ? 'Remote' : null

    const btnStyle = (bg: string, extraPad?: string): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', gap: 5,
      padding: extraPad || '8px 13px',
      background: bg, border: 'none', borderRadius: 8,
      fontSize: 12, fontWeight: 500, color: 'white',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    })

    return (
      <div key={job.id} style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid #e5e7eb', marginBottom: 2 }}>

        {/* SPLIT CARD: colour left 30%, white right 70% */}
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 68 }}>

          {/* LEFT COLOUR STRIP — clickable, opens pipeline */}
          <div
            onClick={() => setExpandedJobs(prev => { const n = new Set(prev); n.has(job.id) ? n.delete(job.id) : n.add(job.id); return n })}
            style={{ width: '30%', flexShrink: 0, background: gradient, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', minWidth: 0 }}
            title="Click to view pipeline"
          >
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
                {[job.company, job.salary, job.location, workTypeLabel].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {/* RIGHT WHITE AREA — buttons */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 14px', gap: 6, borderLeft: '0.5px solid #e5e7eb', background: 'white' }}>
            {interviewPacks[job.id] ? (
              <button onClick={() => { const url = `${window.location.origin}/interview/apply/${job.id}`; navigator.clipboard.writeText(url); notify('Interview link copied ✓') }} style={btnStyle('#0ea5e9')}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="4" y="1" width="9" height="9" rx="1.5"/><path d="M1 5v7a1 1 0 001 1h7"/></svg>
                Copy link
              </button>
            ) : (
              <button onClick={() => router.push('/interviews')} style={btnStyle('#16a34a')}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
                Create interview
              </button>
            )}
            <button onClick={() => { setBulkJobId(job.id); setBulkJobTitle(job.title); setShowBulkUpload(true) }} style={btnStyle('#8b5cf6')}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v8M4 6l3 3 3-3"/><path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2"/></svg>
              Bulk CVs
            </button>
            <button onClick={() => findMatches(job)} disabled={matchingJob === job.id} style={btnStyle('#f59e0b')}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4"/><path d="M10 10l3 3"/></svg>
              {matchingJob === job.id ? 'Matching...' : matchResults[job.id] ? 'Refresh' : 'Find matches'}
            </button>
            <button onClick={() => { setEditingJob(job); setShowEditJob(true) }} style={{ ...btnStyle('rgba(255,255,255,0)'), border: '1px solid #e5e7eb', color: '#374151' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
              Edit
            </button>
            <button onClick={() => deleteJob(job)} style={btnStyle('#ef4444', '8px 11px')}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h10M5 4V2h4v2M5.5 7v4M8.5 7v4M3 4l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9L11 4"/></svg>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ background: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, flex: 1 }}>
            {(job.required_skills || []).slice(0, 6).map(skill => (
              <span key={skill} style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 5 }}>{skill}</span>
            ))}
            {interviewPacks[job.id] && <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 5, fontWeight: 500 }}>Interview ready</span>}
            <span style={{ fontSize: 11, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 5 }}>{job.match_threshold || 70}% threshold</span>
          </div>
          {matchResults[job.id] && (
            <button onClick={() => setExpandedJobs(prev => { const n = new Set(prev); n.has(job.id) ? n.delete(job.id) : n.add(job.id); return n })}
              style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: '0.5px solid #e5e7eb', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
              {expandedJobs.has(job.id) ? 'Hide matches' : `${matchResults[job.id].filter(r => r.status === 'shortlist').length} matches`}
            </button>
          )}
        </div>

        {/* MATCH RESULTS */}
        {expandedJobs.has(job.id) && matchResults[job.id] && (
          <div style={{ borderTop: '0.5px solid #e5e7eb' }}>
            <div style={{ padding: '10px 16px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                {matchResults[job.id].filter(r => r.status === 'shortlist').length} strong matches from {matchResults[job.id].length} candidates
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{matchResults[job.id].filter(r => r.status === 'shortlist').length} strong</span>
                <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{matchResults[job.id].filter(r => r.status === 'longlist').length} low</span>
                {matchResults[job.id].filter(r => r.already_sent).length > 0 && (
                  <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{matchResults[job.id].filter(r => r.already_sent).length} sent</span>
                )}
              </div>
            </div>
            {matchResults[job.id].filter(r => r.status === 'shortlist' || r.already_sent).length > 0 && (
              <div style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#15803d', textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: 8 }}>Strong matches</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {matchResults[job.id].filter(r => r.status === 'shortlist' || r.already_sent).map(match => (
                    <div key={match.candidate_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: match.already_sent ? '#fffbeb' : '#f0fdf4', border: `0.5px solid ${match.already_sent ? '#fde68a' : '#bbf7d0'}`, borderRadius: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: getMatchBg(match.match_score), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: getMatchColor(match.match_score) }}>{match.match_score}%</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <div onClick={() => { const full = candidates.find(c => c.id === match.candidate_id); if (full) openProfile(full) }} style={{ fontSize: 13, fontWeight: 500, color: '#4F46E5', cursor: 'pointer' }}>{match.name}</div>
                          {match.already_sent && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 5, fontWeight: 500 }}>Sent</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{match.role_applied}{match.last_employer ? ` · ${match.last_employer}` : ''}{match.years_experience > 0 ? ` · ${match.years_experience}yr` : ''}</div>
                        {match.keyword_matches.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                            {match.keyword_matches.slice(0, 4).map(kw => (
                              <span key={kw} style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={async () => {
                        setShortlisting(match.candidate_id)
                        try {
                          const headers = await authHeaders()
                          const res = await fetch('/api/shortlist', { method: 'POST', headers, body: JSON.stringify({ candidateId: match.candidate_id, jobId: job.id, jobTitle: job.title, jobSalary: job.salary }) })
                          const data = await res.json()
                          if (data.success) {
                            notify(`Voice note sent to ${match.name} ✓`)
                            setMatchResults(prev => ({ ...prev, [job.id]: (prev[job.id] || []).map(m => m.candidate_id === match.candidate_id ? { ...m, already_sent: true, status: 'voice_sent' } : m) }))
                            fetchCandidates()
                            if (profile) setProfile({ ...profile, credits_used: profile.credits_used + 1 })
                            markOnboardingStep('voice_note')
                          } else notify('Error: ' + data.error, 'error')
                        } finally { setShortlisting(null) }
                      }} disabled={shortlisting === match.candidate_id} style={{ padding: '6px 14px', background: shortlisting === match.candidate_id ? '#9ca3af' : match.already_sent ? '#fef3c7' : '#4F46E5', color: shortlisting === match.candidate_id ? 'white' : match.already_sent ? '#92400e' : 'white', border: match.already_sent ? '0.5px solid #fde68a' : 'none', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: shortlisting === match.candidate_id ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                        {shortlisting === match.candidate_id ? '...' : match.already_sent ? 'Resend' : 'Send'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {matchResults[job.id].filter(r => r.status === 'longlist' && !r.already_sent).length > 0 && (
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: 8 }}>Low match — below threshold</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {matchResults[job.id].filter(r => r.status === 'longlist' && !r.already_sent).map(match => (
                    <div key={match.candidate_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 7, background: getMatchBg(match.match_score), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: getMatchColor(match.match_score) }}>{match.match_score}%</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div onClick={() => { const full = candidates.find(c => c.id === match.candidate_id); if (full) openProfile(full) }} style={{ fontSize: 12, fontWeight: 500, color: '#4F46E5', cursor: 'pointer', marginBottom: 1 }}>{match.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{match.role_applied}{match.last_employer ? ` · ${match.last_employer}` : ''}</div>
                      </div>
                      <button onClick={async () => {
                        setShortlisting(match.candidate_id)
                        try {
                          const headers = await authHeaders()
                          const res = await fetch('/api/shortlist', { method: 'POST', headers, body: JSON.stringify({ candidateId: match.candidate_id, jobId: job.id, jobTitle: job.title, jobSalary: job.salary }) })
                          const data = await res.json()
                          if (data.success) {
                            notify(`Voice note sent to ${match.name} ✓`)
                            setMatchResults(prev => ({ ...prev, [job.id]: (prev[job.id] || []).map(m => m.candidate_id === match.candidate_id ? { ...m, already_sent: true } : m) }))
                            fetchCandidates()
                            if (profile) setProfile({ ...profile, credits_used: profile.credits_used + 1 })
                          } else notify('Error: ' + data.error, 'error')
                        } finally { setShortlisting(null) }
                      }} disabled={shortlisting === match.candidate_id} style={{ padding: '5px 10px', background: 'white', color: '#4F46E5', border: '0.5px solid #c7d2fe', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: shortlisting === match.candidate_id ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                        {shortlisting === match.candidate_id ? '...' : 'Send anyway'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }



  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f9fafb' }}>

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
            <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: activeTab === tab.id ? '#4F46E5' : '#6b7280', background: activeTab === tab.id ? '#EEF2FF' : 'transparent', borderRadius: 8, marginBottom: 1, fontWeight: activeTab === tab.id ? 500 : 400 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: activeTab === tab.id ? '#DDD6FE' : '#f3f4f6', color: activeTab === tab.id ? '#4F46E5' : '#6b7280' }}>
                {tab.icon}
              </div>
              {tab.label}
              {tab.id === 'jobs' && jobs.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, background: activeTab === tab.id ? '#DDD6FE' : '#f3f4f6', color: activeTab === tab.id ? '#4F46E5' : '#6b7280', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>{jobs.filter(j => j.status === 'active').length}</span>}
              {tab.id === 'candidates' && candidates.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, background: activeTab === tab.id ? '#DDD6FE' : '#f3f4f6', color: activeTab === tab.id ? '#4F46E5' : '#6b7280', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>{candidates.length}</span>}
            </div>
          ))}

          <div onClick={() => router.push('/interviews')} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: '#6b7280', borderRadius: 8, marginBottom: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f3f4f6', color: '#6b7280' }}>
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

          <div onClick={openVoices} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: '#6b7280', borderRadius: 8, marginBottom: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f3f4f6', color: '#6b7280' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M3.5 12.5l1.3-1.3M11.2 4.8l1.3-1.3"/></svg>
            </div>
            Voice selector
          </div>

          <div onClick={() => { setOnboardingMode('manual'); setShowOnboarding(true) }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: '#6b7280', borderRadius: 8, marginBottom: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f3f4f6', color: '#6b7280' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/></svg>
            </div>
            <span style={{ flex: 1 }}>Getting started</span>
            {onboardingDoneCount < 3 && <span style={{ fontSize: 10, background: '#DDD6FE', color: '#4F46E5', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>{onboardingDoneCount}/3</span>}
            {onboardingDoneCount === 3 && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>✓</span>}
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
              {profile.credits_limit !== 999999 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>Credits</span>
                    <span style={{ fontSize: 10, color: creditsColor, fontWeight: 500 }}>{profile.credits_used}/{profile.credits_limit}</span>
                  </div>
                  <div style={{ height: 3, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${creditsPercent}%`, background: creditsColor, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  {creditsPercent >= 90 && <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444' }}>Credits almost used up</div>}
                </div>
              )}
              {profile.credits_limit === 999999 && <div style={{ fontSize: 10, color: '#15803d', marginTop: 4 }}>Unlimited credits</div>}
            </div>
          )}
          <div onClick={signOut} style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 7H3M5.5 4.5L3 7l2.5 2.5M8 2h3a1 1 0 011 1v8a1 1 0 01-1 1H8"/></svg>
            Sign out
          </div>
        </div>
      </div>



      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', borderBottom: '0.5px solid #e5e7eb', padding: '13px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', letterSpacing: '-0.2px' }}>
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'candidates' ? 'All Candidates' : 'Jobs'}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>
              {activeTab === 'dashboard' ? `Welcome back${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}` : activeTab === 'candidates' ? `${filteredAll.length} candidates total` : `${jobs.length} jobs — ${jobs.filter(j => j.status === 'active').length} active`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeTab === 'candidates' && <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', width: 180, background: '#f9f9f9' }} />}
            {activeTab === 'jobs' ? (
              <button onClick={() => setShowAddJob(true)} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add Job</button>
            ) : activeTab === 'candidates' ? (
              <>
                <button onClick={() => { setBulkJobId(undefined); setBulkJobTitle(undefined); setShowBulkUpload(true) }} style={{ background: 'white', color: '#4F46E5', border: '0.5px solid #c7d2fe', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Bulk upload</button>
                <button onClick={() => setShowAdd(true)} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add Candidate</button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setBulkJobId(undefined); setBulkJobTitle(undefined); setShowBulkUpload(true) }} style={{ background: 'white', color: '#4F46E5', border: '0.5px solid #c7d2fe', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Bulk upload</button>
                <button onClick={() => setShowAddJob(true)} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add Job</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 24, flex: 1 }}>

          {/* DASHBOARD HOME */}
          {activeTab === 'dashboard' && (
            <>
              {/* STATS ROW 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'Total candidates', value: stats.total },
                  { label: 'Voice notes sent', value: stats.voiceSent },
                  { label: 'Interviews booked', value: stats.interviews },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '16px 18px', border: '0.5px solid #e5e7eb' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 500, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* STATS ROW 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
                {[
                  { label: 'Active jobs', value: stats.activeJobs, suffix: '' },
                  { label: 'In pipeline', value: stats.matched, suffix: '' },
                  { label: 'Shortlisted this week', value: shortlistedThisWeek, suffix: '' },
                  { label: 'Conversion rate', value: stats.conversionRate, suffix: '%' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '0.5px solid #e5e7eb' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 5 }}>{s.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 500, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}{s.suffix}</div>
                  </div>
                ))}
              </div>

              {/* ACTIVITY GRAPH */}
              <div style={{ background: 'white', borderRadius: 10, border: '0.5px solid #e5e7eb', padding: '18px 22px', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Activity</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: '#555', lineHeight: 1 }}>←</button>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', minWidth: 130, textAlign: 'center' }}>{MONTH_NAMES[activityMonth]} {activityYear}</span>
                      <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: 6, padding: '3px 10px', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', fontSize: 12, color: isCurrentMonth ? '#ccc' : '#555', lineHeight: 1 }}>→</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{monthStats.candidates} candidates</span>
                      <span style={{ fontSize: 11, background: '#E1F5EE', color: '#1D9E75', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{monthStats.voiceNotes} voice notes</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: '#534AB7' }} />
                      <span style={{ fontSize: 11, color: '#888' }}>Candidates</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1D9E75' }} />
                      <span style={{ fontSize: 11, color: '#888' }}>Voice notes</span>
                    </div>
                  </div>
                </div>
                <ActivityChart data={activityData} />
              </div>

              {/* RECENT JOBS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Active jobs</div>
                <div onClick={() => setActiveTab('jobs')} style={{ fontSize: 12, color: '#4F46E5', cursor: 'pointer' }}>View all →</div>
              </div>

              {recentJobs.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 10, border: '0.5px solid #e5e7eb', padding: 40, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 6 }}>No active jobs yet</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Add your first job to start matching candidates</div>
                  <button onClick={() => setShowAddJob(true)} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add your first job</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {recentJobs.map(job => renderJobCard(job))}
                </div>
              )}
            </>
          )}

          {/* ALL CANDIDATES */}
          {activeTab === 'candidates' && (
            <div style={{ background: 'white', borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid #e5e7eb' }}>
                    {['Name', 'Role', 'Last Employer', 'Location', 'Exp', 'Status', 'Interview', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{h}</th>
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
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div onClick={() => openProfile(c)} style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', cursor: 'pointer' }}>{c.name}</div>
    {(c as any).interview_completed_at && (
      <span
        onClick={() => { setInterviewCandidate(c); setShowInterviewModal(true) }}
        style={{ fontSize: 10, background: getScoreBg(getCombinedScore((c as any).cv_match_score, (c as any).interview_score)), color: getScoreColor(getCombinedScore((c as any).cv_match_score, (c as any).interview_score)), padding: '2px 7px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
        title={getScoreBreakdown((c as any).cv_match_score, (c as any).interview_score)}
      >
        🎙 {getCombinedScore((c as any).cv_match_score, (c as any).interview_score)}%
      </span>
    )}
  </div>
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
                        {(c as any).interview_completed_at ? (
                          <button
                            onClick={() => { setInterviewCandidate(c); setShowInterviewModal(true) }}
                            style={{ fontSize: 11, padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, background: getScoreBg(getCombinedScore((c as any).cv_match_score, (c as any).interview_score)), color: getScoreColor(getCombinedScore((c as any).cv_match_score, (c as any).interview_score)) }}
                          >
                            🎙 {getCombinedScore((c as any).cv_match_score, (c as any).interview_score)}%
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#ddd' }}>—</span>
                        )}
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

          {/* JOBS TAB */}
          {activeTab === 'jobs' && (
            <div>
              {jobs.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 10, border: '0.5px solid #e5e7eb', padding: 60, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', marginBottom: 8 }}>No jobs yet</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Add your first job to start matching candidates</div>
                  <button onClick={() => setShowAddJob(true)} style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add your first job</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {jobs.map(job => renderJobCard(job))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* JOB MODALS */}
      {showAddJob && <JobFormModal mode="add" onSave={() => { fetchJobs(); markOnboardingStep('job') }} onClose={() => setShowAddJob(false)} notify={notify} />}
      {showEditJob && editingJob && <JobFormModal mode="edit" job={editingJob} onSave={fetchJobs} onClose={() => { setShowEditJob(false); setEditingJob(null) }} notify={notify} />}

      {/* BULK UPLOAD */}
      {showBulkUpload && <BulkUploadModal token={sessionToken} jobId={bulkJobId} jobTitle={bulkJobTitle} onClose={() => setShowBulkUpload(false)} />}

      {/* ONBOARDING */}
      {showOnboarding && <OnboardingModal mode={onboardingMode} completedSteps={onboardingSteps} onClose={() => setShowOnboarding(false)} />}

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
              {scriptPreview && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{scriptPreview.split(' ').length} words, approx {Math.round(scriptPreview.split(' ').length / 2.3)} seconds</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowJobModal(false); setScriptPreview('') }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>Cancel</button>
              <button onClick={confirmShortlist} disabled={!jobSendForm.jobTitle || generatingPreview} style={{ padding: '9px 20px', background: !jobSendForm.jobTitle || generatingPreview ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !jobSendForm.jobTitle || generatingPreview ? 'not-allowed' : 'pointer' }}>
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

            {(profileCandidate as any).no_cv && (
              <div style={{ background: '#FFF3E0', border: '1px solid #f0d080', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#BA7517' }}>No CV uploaded</div>
                  <div style={{ fontSize: 11, color: '#BA7517', opacity: 0.8 }}>This candidate applied directly via interview link. Score is based on interview performance only.</div>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Experience', value: profileCandidate.years_experience > 0 ? `${profileCandidate.years_experience} years` : (profileCandidate as any).no_cv ? '—' : 'Not specified' },
                { label: 'Location', value: (profileCandidate as any).location || ((profileCandidate as any).no_cv ? '—' : 'Not specified') },
                { label: 'Last employer', value: (profileCandidate as any).last_employer || ((profileCandidate as any).no_cv ? '—' : 'Not specified') },
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
            {(profileCandidate as any).candidate_summary ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Profile summary</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' }}>{(profileCandidate as any).candidate_summary}</div>
              </div>
            ) : (profileCandidate as any).no_cv ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Profile summary</div>
                <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' }}>No CV uploaded — summary not available</div>
              </div>
            ) : null}
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
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Strength keywords</div>
                <button onClick={() => regenerateKeywords(profileCandidate)} disabled={regeneratingKeywords} style={{ fontSize: 11, padding: '4px 10px', background: regeneratingKeywords ? '#f5f5f5' : '#f0eeff', color: regeneratingKeywords ? '#aaa' : '#534AB7', border: '1px solid #EEEDFE', borderRadius: 6, cursor: regeneratingKeywords ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  {regeneratingKeywords ? '⟳ Regenerating...' : '⚡ Regenerate keywords'}
                </button>
              </div>
              {((profileCandidate as any).strength_keywords || []).length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {((profileCandidate as any).strength_keywords || []).map((kw: string) => (
                      <span key={kw} style={{ fontSize: 11, background: '#16a34a', color: 'white', padding: '4px 10px', borderRadius: 8, fontWeight: 600, letterSpacing: '0.01em' }}>⚡ {kw}</span>
                    ))}
                  </div>
                  {(() => {
                    const SYNONYMS: Record<string, string[]> = {
                      'sales': ['business development', 'revenue generation', 'account management', 'new business', 'commercial'],
                      'business development': ['sales', 'new business', 'revenue generation', 'commercial development'],
                      'account management': ['key account management', 'client management', 'account manager', 'client services'],
                      'lead generation': ['demand generation', 'pipeline generation', 'prospecting', 'new business'],
                      'marketing': ['digital marketing', 'marketing management', 'brand management', 'campaign management'],
                      'digital marketing': ['online marketing', 'performance marketing', 'growth marketing', 'marketing analytics'],
                      'seo': ['seo optimisation', 'search engine optimisation', 'organic search'],
                      'ppc': ['ppc management', 'paid search', 'google ads', 'paid advertising'],
                      'social media': ['social media management', 'social media marketing', 'community management'],
                      'content creation': ['copywriting', 'content marketing', 'content strategy', 'blog writing'],
                      'copywriting': ['content creation', 'content marketing', 'creative writing'],
                      'social care': ['care work', 'social work', 'care management', 'health and social care'],
                      'care work': ['care assistant', 'support worker', 'care worker', 'personal care'],
                      'safeguarding': ['child protection', 'adult safeguarding', 'dbs', 'child welfare'],
                      'mental health': ['mental health support', 'psychiatric care', 'psychological support'],
                      'software development': ['software engineering', 'programming', 'coding', 'development'],
                      'javascript': ['nodejs', 'react', 'vue', 'angular', 'typescript'],
                      'react': ['reactjs', 'frontend development', 'javascript'],
                      'python': ['django', 'flask', 'data science', 'machine learning'],
                      'aws': ['amazon web services', 'cloud computing', 'cloud infrastructure'],
                      'devops': ['ci/cd', 'docker', 'kubernetes'],
                      'agile': ['scrum', 'kanban', 'agile methodology'],
                      'team leadership': ['people management', 'staff management', 'line management'],
                      'operations management': ['operations', 'operational management', 'multi-site operations'],
                      'logistics': ['supply chain', 'logistics management', 'distribution', 'transport'],
                      'project management': ['project delivery', 'programme management', 'pmo'],
                      'recruitment': ['talent acquisition', 'hiring', 'resourcing'],
                      'customer service': ['customer support', 'client services', 'customer success'],
                      'crm': ['customer relationship management', 'salesforce', 'hubspot', 'dynamics'],
                      'excel': ['microsoft excel', 'spreadsheets', 'data analysis'],
                    }
                    const existingKeywords = new Set(((profileCandidate as any).strength_keywords || []).map((k: string) => k.toLowerCase().trim()))
                    const expanded = new Set<string>()
                    for (const kw of ((profileCandidate as any).strength_keywords || [])) {
                      const synonyms = SYNONYMS[kw.toLowerCase().trim()] || []
                      for (const s of synonyms) {
                        if (!existingKeywords.has(s.toLowerCase().trim())) expanded.add(s)
                      }
                    }
                    const expandedList = Array.from(expanded).slice(0, 24)
                    if (expandedList.length === 0) return null
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 6 }}>Also matches roles looking for</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {expandedList.map((kw: string) => (
                            <span key={kw} style={{ fontSize: 11, background: '#f5f5f5', color: '#aaa', padding: '3px 8px', borderRadius: 8, fontWeight: 400, border: '1px solid #ebebeb' }}>{kw}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>No keywords yet — click Regenerate to generate them</div>
              )}
            </div>
            {((profileCandidate as any).qualifications || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Qualifications</div>
                {((profileCandidate as any).qualifications || []).map((q: string) => (
                  <div key={q} style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>• {q}</div>
                ))}
              </div>
            )}
            {/* INTERVIEW RESULTS */}
{(profileCandidate as any).interview_completed_at && (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>
      AI Interview Results
      <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
        — {new Date((profileCandidate as any).interview_completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </div>

    {/* SCORE */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f9f9f9', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
        background: (profileCandidate as any).interview_score >= 75 ? '#E1F5EE' : (profileCandidate as any).interview_score >= 55 ? '#FFF3E0' : '#fff0ee',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{
          fontSize: 16, fontWeight: 800,
          color: (profileCandidate as any).interview_score >= 75 ? '#1D9E75' : (profileCandidate as any).interview_score >= 55 ? '#BA7517' : '#E24B4A'
        }}>
          {(profileCandidate as any).interview_score}%
        </span>
      </div>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, marginBottom: 2,
          color: (profileCandidate as any).interview_score >= 75 ? '#1D9E75' : (profileCandidate as any).interview_score >= 55 ? '#BA7517' : '#E24B4A'
        }}>
          {(profileCandidate as any).interview_score >= 75 ? 'Strong candidate' : (profileCandidate as any).interview_score >= 55 ? 'Average candidate' : 'Weak candidate'}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>Overall interview score</div>
      </div>
    </div>

    {/* RECOMMENDATION */}
    {(profileCandidate as any).interview_recommendation && (
      <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: '#444', lineHeight: 1.7 }}>
        {(profileCandidate as any).interview_recommendation}
      </div>
    )}

    {/* PER QUESTION SCORES */}
    {(profileCandidate as any).interview_answers?.question_scores && (
      <div>
        <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Question breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(profileCandidate as any).interview_answers.question_scores.map((q: any) => (
            <div key={q.number} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: q.score >= 7 ? '#E1F5EE' : q.score >= 5 ? '#FFF3E0' : '#fff0ee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: q.score >= 7 ? '#1D9E75' : q.score >= 5 ? '#BA7517' : '#E24B4A'
              }}>
                {q.score}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>Q{q.number}: {q.competency}</div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{q.reasoning}</div>
                {(q.red_flags_observed || []).length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {q.red_flags_observed.map((rf: string, i: number) => (
                      <span key={i} style={{ fontSize: 10, background: '#fff0ee', color: '#E24B4A', padding: '1px 6px', borderRadius: 4 }}>⚠ {rf}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* STRENGTHS AND CONCERNS */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
      {(profileCandidate as any).interview_answers?.strengths?.length > 0 && (
        <div style={{ background: '#f0fff8', border: '1px solid #d4f0e8', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Strengths</div>
          {(profileCandidate as any).interview_answers.strengths.map((s: string, i: number) => (
            <div key={i} style={{ fontSize: 11, color: '#1D9E75', padding: '2px 0', display: 'flex', gap: 6 }}>
              <span>✓</span><span>{s}</span>
            </div>
          ))}
        </div>
      )}
      {(profileCandidate as any).interview_answers?.concerns?.length > 0 && (
        <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#E24B4A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Concerns</div>
          {(profileCandidate as any).interview_answers.concerns.map((c: string, i: number) => (
            <div key={i} style={{ fontSize: 11, color: '#E24B4A', padding: '2px 0', display: 'flex', gap: 6 }}>
              <span>⚠</span><span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
            {(profileCandidate as any).last_script && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>
                  Last voice note script
                  {(profileCandidate as any).last_script_at && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>— {new Date((profileCandidate as any).last_script_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '12px 14px', fontStyle: 'italic' }}>{(profileCandidate as any).last_script}</div>
              </div>
            )}
            {(profileCandidate as any).voice_note_path && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Last voice note</div>
                {profileCandidate.voice_note_url ? (
                  <audio controls src={profileCandidate.voice_note_url} style={{ width: '100%', borderRadius: 8 }} />
                ) : (
                  <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' }}>Voice note expired after 30 days</div>
                )}
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
            {form.strength_keywords && (
              <div style={{ marginBottom: 14, background: '#f0fff8', border: '1px solid #d4f0e8', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600, marginBottom: 6 }}>⚡ Strength keywords extracted</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {form.strength_keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                    <span key={k} style={{ fontSize: 11, background: '#16a34a', color: 'white', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
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

      {/* INTERVIEW RESULTS MODAL */}
      {showInterviewModal && interviewCandidate && (
        <div onMouseDown={overlayMouseDown} onMouseUp={e => overlayMouseUp(e, () => { setShowInterviewModal(false); setInterviewCandidate(null) })} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 620, maxHeight: '88vh', overflowY: 'auto', animation: 'modalIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#534AB7' }}>
                  {interviewCandidate.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{interviewCandidate.name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{interviewCandidate.role_applied}</div>
                </div>
              </div>
              <button onClick={() => { setShowInterviewModal(false); setInterviewCandidate(null) }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa' }}>×</button>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: getScoreColor(getCombinedScore((interviewCandidate as any).cv_match_score, (interviewCandidate as any).interview_score)), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{getCombinedScore((interviewCandidate as any).cv_match_score, (interviewCandidate as any).interview_score)}%</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                  {getScoreLabel(getCombinedScore((interviewCandidate as any).cv_match_score, (interviewCandidate as any).interview_score))}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Interviewed {new Date((interviewCandidate as any).interview_completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
            {(interviewCandidate as any).interview_recommendation && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>AI Recommendation</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, background: '#f9f9f9', borderRadius: 8, padding: '14px 16px' }}>{(interviewCandidate as any).interview_recommendation}</div>
              </div>
            )}
            {((interviewCandidate as any).interview_answers?.strengths?.length > 0 || (interviewCandidate as any).interview_answers?.concerns?.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {(interviewCandidate as any).interview_answers?.strengths?.length > 0 && (
                  <div style={{ background: '#f0fff8', border: '1px solid #d4f0e8', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Strengths</div>
                    {(interviewCandidate as any).interview_answers.strengths.map((s: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#1D9E75', padding: '3px 0', display: 'flex', gap: 6 }}><span>✓</span><span>{s}</span></div>
                    ))}
                  </div>
                )}
                {(interviewCandidate as any).interview_answers?.concerns?.length > 0 && (
                  <div style={{ background: '#fff8f8', border: '1px solid #fdd', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: '#E24B4A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Concerns</div>
                    {(interviewCandidate as any).interview_answers.concerns.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#E24B4A', padding: '3px 0', display: 'flex', gap: 6 }}><span>⚠</span><span>{c}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(interviewCandidate as any).interview_answers?.question_scores?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, fontWeight: 600 }}>Question breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(interviewCandidate as any).interview_answers.question_scores.map((q: any) => (
                    <div key={q.number} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: q.score >= 7 ? '#E1F5EE' : q.score >= 5 ? '#FFF3E0' : '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: q.score >= 7 ? '#1D9E75' : q.score >= 5 ? '#BA7517' : '#E24B4A' }}>{q.score}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>Q{q.number}: {q.competency}</div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{q.reasoning}</div>
                        {(q.red_flags_observed || []).length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {q.red_flags_observed.map((rf: string, i: number) => (
                              <span key={i} style={{ fontSize: 10, background: '#fff0ee', color: '#E24B4A', padding: '1px 6px', borderRadius: 4 }}>⚠ {rf}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {((interviewCandidate as any).interview_answers?.cv_contradictions || []).filter((c: any) => c.status !== 'VERIFIED').length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, fontWeight: 600 }}>CV Verification flags</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(interviewCandidate as any).interview_answers.cv_contradictions.filter((c: any) => c.status !== 'VERIFIED').map((c: any, i: number) => (
                    <div key={i} style={{ padding: '12px 14px', background: c.status === 'CONTRADICTED' ? '#fff8f8' : '#fffbf0', border: `1px solid ${c.status === 'CONTRADICTED' ? '#fdd' : '#f0d080'}`, borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, background: c.status === 'CONTRADICTED' ? '#fff0ee' : '#FFF3E0', color: c.status === 'CONTRADICTED' ? '#E24B4A' : '#BA7517', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{c.status}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{c.claim}</span>
                        <span style={{ fontSize: 10, background: '#f0f0f0', color: '#888', padding: '1px 6px', borderRadius: 4, marginLeft: 'auto' }}>{c.severity}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{c.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
{((interviewCandidate as any).interview_answers?.next_round_questions || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 10, fontWeight: 600 }}>Suggested next round questions</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {((interviewCandidate as any).interview_answers?.next_round_questions || []).map((q: any, i: number) => (
                    <div key={i} style={{ padding: '12px 14px', background: '#f9f9f9', borderRadius: 8, borderLeft: '3px solid #534AB7' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{i + 1}. {q.question}</div>
                      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{q.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
                {((interviewCandidate as any).interview_keywords || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 8, fontWeight: 600 }}>Keywords from interview</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {((interviewCandidate as any).interview_keywords || []).map((kw: string) => (
                    <span key={kw} style={{ fontSize: 11, background: '#16a34a', color: 'white', padding: '4px 10px', borderRadius: 8, fontWeight: 600, letterSpacing: '0.01em' }}>⚡ {kw}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={() => { setShowInterviewModal(false); setInterviewCandidate(null) }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>Close</button>
              <button onClick={() => { setShowInterviewModal(false); setInterviewCandidate(null); openProfile(interviewCandidate) }} style={{ padding: '9px 18px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View full profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
