import { useState, useEffect, useRef } from 'react'
import { Candidate } from '../lib/supabase'

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

type Voice = {
  voice_id: string
  name: string
  preview_url: string
}

export default function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [shortlisting, setShortlisting] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showVoices, setShowVoices] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)
  const [playerCandidate, setPlayerCandidate] = useState<Candidate | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '' })
  const [activeTab, setActiveTab] = useState('pipeline')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('P4DhdyNCB4Nl6MA0sL45')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { fetchCandidates() }, [])

  async function fetchCandidates() {
    const res = await fetch('/api/candidates')
    const data = await res.json()
    setCandidates(data.candidates || [])
    setLoading(false)
  }

  async function fetchVoices() {
    const res = await fetch('/api/voices')
    const data = await res.json()
    setVoices(data.voices || [])
  }

  function openVoices() {
    setShowVoices(true)
    fetchVoices()
  }

  async function selectVoice(voiceId: string) {
    await fetch('/api/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId })
    })
    setSelectedVoiceId(voiceId)
    setShowVoices(false)
  }

  function previewVoice(voice: Voice) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playingVoice === voice.voice_id) {
      setPlayingVoice(null)
      return
    }
    const audio = new Audio(voice.preview_url)
    audioRef.current = audio
    audio.play()
    setPlayingVoice(voice.voice_id)
    audio.onended = () => setPlayingVoice(null)
  }

  function openPlayer(candidate: Candidate) {
    setPlayerCandidate(candidate)
    setShowPlayer(true)
  }

  async function handleCvUpload(file: File) {
    setCvFile(file)
    setExtracting(true)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = () => rej(new Error('Read failed'))
        r.readAsDataURL(file)
      })
      const response = await fetch('/api/extract-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, filename: file.name })
      })
      const data = await response.json()
      if (data.extracted) {
        setForm(prev => ({
          ...prev,
          name: data.extracted.name || prev.name,
          email: data.extracted.email || prev.email,
          phone: data.extracted.phone || prev.phone,
          role_applied: data.extracted.role || prev.role_applied,
          experience_summary: data.extracted.experience_summary || prev.experience_summary,
          years_experience: data.extracted.years_experience?.toString() || prev.years_experience,
        }))
      }
    } catch (err) {
      alert('Could not extract CV details — please fill in manually')
    } finally {
      setExtracting(false)
    }
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
    })
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!editingCandidate) return
    if (!editForm.name || !editForm.email || !editForm.role_applied || !editForm.experience_summary) {
      alert('Please fill in all required fields')
      return
    }
    const res = await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: editingCandidate.id, ...editForm, years_experience: parseInt(editForm.years_experience) || 0 })
    })
    const data = await res.json()
    if (data.success) {
      setShowEdit(false)
      setEditingCandidate(null)
      fetchCandidates()
    } else {
      alert('Error: ' + (data.error || 'Something went wrong'))
    }
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!confirm(`Delete ${candidate.name}? This cannot be undone.`)) return
    const res = await fetch('/api/candidates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: candidate.id })
    })
    const data = await res.json()
    if (data.success) {
      fetchCandidates()
    } else {
      alert('Error: ' + (data.error || 'Could not delete'))
    }
  }

  async function shortlistCandidate(candidate: Candidate) {
    const jobTitle = prompt(`Job title for ${candidate.name}:`, candidate.role_applied)
    if (!jobTitle) return
    const jobSalary = prompt('Salary (e.g. £45,000):', '') || ''
    setShortlisting(candidate.id)
    try {
      const res = await fetch('/api/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, jobTitle, jobSalary })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Voice note sent to ${candidate.name}! Audio: ${data.audioSizeMb}mb ${data.underSizeLimit ? '✓' : '⚠ over 2mb'}`)
        fetchCandidates()
      } else {
        alert('Error: ' + data.error)
      }
    } finally {
      setShortlisting(null)
    }
  }

  async function moveCandidate(candidateId: string, newStatus: string) {
    await fetch('/api/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, status: newStatus })
    })
    fetchCandidates()
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

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault()
    if (dragId) {
      const candidate = candidates.find(c => c.id === dragId)
      if (candidate && candidate.status !== status) {
        if (status === 'shortlisted' && candidate.status === 'applied') {
          shortlistCandidate(candidate)
        } else {
          moveCandidate(dragId, status)
        }
      }
    }
    setDragId(null)
    setDragOver(null)
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOver(null)
  }

  async function addCandidate() {
    if (!form.name || !form.email || !form.role_applied || !form.experience_summary) {
      alert('Please fill in all required fields')
      return
    }
    const res = await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, years_experience: parseInt(form.years_experience) || 0 })
    })
    const data = await res.json()
    if (data.candidate) {
      setShowAdd(false)
      setCvFile(null)
      setForm({ name: '', email: '', phone: '', role_applied: '', experience_summary: '', years_experience: '', job_title: '', job_salary: '' })
      fetchCandidates()
    } else {
      alert('Error: ' + (data.error || 'Something went wrong'))
    }
  }

  const filterCandidates = (list: Candidate[]) => {
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter(c =>
      c.name?.toLowerCase().includes(s) ||
      c.role_applied?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s)
    )
  }

  const byStatus = (status: string) => filterCandidates(candidates.filter(c => c.status === status))

  const stats = {
    total: candidates.length,
    voiceSent: candidates.filter(c => ['voice_sent', 'interview_booked', 'hired'].includes(c.status)).length,
    interviews: candidates.filter(c => ['interview_booked', 'hired'].includes(c.status)).length,
  }

  const modalFields = [
    { key: 'name', label: 'Full name *', type: 'text' },
    { key: 'email', label: 'Email *', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'role_applied', label: 'Role applied for *', type: 'text' },
    { key: 'years_experience', label: 'Years of experience', type: 'number' },
    { key: 'job_title', label: 'Job title', type: 'text' },
    { key: 'job_salary', label: 'Salary (e.g. £45,000)', type: 'text' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f8f8f8' }}>
      <div style={{ width: 220, background: 'white', borderRight: '1px solid #eee', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #eee', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>VoiceReach</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>AI outreach platform</div>
        </div>
        {['pipeline', 'candidates', 'analytics'].map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: activeTab === tab ? '#534AB7' : '#555', background: activeTab === tab ? '#f5f4ff' : 'transparent', borderLeft: activeTab === tab ? '2px solid #534AB7' : '2px solid transparent', fontWeight: activeTab === tab ? 500 : 400, textTransform: 'capitalize' }}>
            {tab === 'pipeline' ? '◈ Pipeline' : tab === 'candidates' ? '◎ Candidates' : '◷ Analytics'}
          </div>
        ))}
        <div style={{ padding: '16px 20px 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#bbb' }}>Settings</div>
        <div onClick={openVoices} style={{ padding: '9px 20px', fontSize: 13, color: '#555', cursor: 'pointer' }}>⊙ Voice selector</div>
        <div style={{ padding: '9px 20px', fontSize: 13, color: '#555', cursor: 'pointer' }}>⊞ Templates</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Candidate Pipeline</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Drag candidates between columns or click to shortlist</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search candidates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', width: 200 }}
            />
            <button onClick={() => setShowAdd(true)} style={{ background: '#534AB7', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ Add Candidate</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total candidates', value: stats.total },
              { label: 'Voice notes sent', value: stats.voiceSent },
              { label: 'Interviews booked', value: stats.interviews }
            ].map(s => (
              <div key={s.label} style={{ background: '#f5f5f5', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 500, color: '#1a1a1a' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {STATUSES.map(status => (
              <div
                key={status}
                onDragOver={e => handleDragOver(e, status)}
                onDrop={e => handleDrop(e, status)}
                onDragLeave={() => setDragOver(null)}
                style={{ background: dragOver === status ? '#f0eeff' : 'white', border: dragOver === status ? '2px dashed #534AB7' : '1px solid #eee', borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s' }}
              >
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: 11, background: '#f0f0f0', padding: '2px 8px', borderRadius: 10, color: '#555' }}>{byStatus(status).length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                  {loading ? <div style={{ fontSize: 12, color: '#ccc', padding: 8 }}>Loading...</div> : null}
                  {byStatus(status).map(c => (
                    <div key={c.id} draggable onDragStart={e => handleDragStart(e, c.id)} onDragEnd={handleDragEnd}
                      style={{ background: 'white', border: '1px solid #eee', borderLeft: `2px solid ${STATUS_COLORS[status]}`, borderRadius: 8, padding: '10px 12px', cursor: 'grab', opacity: dragId === c.id ? 0.4 : 1, transition: 'opacity 0.15s', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{c.name}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div onClick={e => { e.stopPropagation(); openEdit(c) }} style={{ fontSize: 10, color: '#aaa', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, border: '1px solid #eee' }}>edit</div>
                          <div onClick={e => { e.stopPropagation(); deleteCandidate(c) }} style={{ fontSize: 10, color: '#E24B4A', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, border: '1px solid #fdd', background: '#fff5f5' }}>del</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{c.role_applied}</div>
                      {c.years_experience > 0 && <div style={{ fontSize: 10, background: '#EEEDFE', color: '#3C3489', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 6 }}>{c.years_experience}yr exp</div>}
                      {status === 'applied' && (
                        <div onClick={() => shortlistCandidate(c)} style={{ fontSize: 11, color: '#534AB7', fontWeight: 500, marginTop: 8, cursor: 'pointer' }}>
                          {shortlisting === c.id ? '⟳ Sending...' : '→ Shortlist & send voice note'}
                        </div>
                      )}
                      {status === 'shortlisted' && (
                        <div onClick={() => shortlistCandidate(c)} style={{ fontSize: 11, color: '#BA7517', fontWeight: 500, marginTop: 8, cursor: 'pointer' }}>
                          {shortlisting === c.id ? '⟳ Sending...' : '↺ Resend voice note'}
                        </div>
                      )}
                      {status === 'voice_sent' && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: '#1D9E75' }}>✓ Voice note delivered</div>
                          {c.voice_note_url && (
                            <div onClick={() => openPlayer(c)} style={{ fontSize: 11, color: '#534AB7', fontWeight: 500, marginTop: 4, cursor: 'pointer' }}>▶ Play voice note</div>
                          )}
                        </div>
                      )}
                      {status === 'interview_booked' && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: '#639922' }}>✓ Interview link clicked</div>
                          {c.voice_note_url && (
                            <div onClick={() => openPlayer(c)} style={{ fontSize: 11, color: '#534AB7', fontWeight: 500, marginTop: 4, cursor: 'pointer' }}>▶ Play voice note</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!loading && byStatus(status).length === 0 && (
                    <div style={{ fontSize: 12, color: '#ddd', padding: 8, textAlign: 'center' }}>{dragOver === status ? 'Drop here' : 'Empty'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice note player modal */}
      {showPlayer && playerCandidate && (
        <div onClick={() => setShowPlayer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Voice note</h2>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>{playerCandidate.name} — {playerCandidate.job_title || playerCandidate.role_applied}</p>
            <audio controls src={playerCandidate.voice_note_url!} style={{ width: '100%', borderRadius: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowPlayer(false)} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: 'white' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Voice selector modal */}
      {showVoices && (
        <div onClick={() => setShowVoices(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: 520, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Voice selector</h2>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>Preview and select the voice for your outreach notes</p>
            {voices.length === 0 ? (
              <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: 24 }}>Loading voices...</div>
            ) : (
              voices.map(v => (
                <div key={v.voice_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${selectedVoiceId === v.voice_id ? '#534AB7' : '#eee'}`, borderRadius: 8, marginBottom: 8, background: selectedVoiceId === v.voice_id ? '#f5f4ff' : 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{v.name}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => previewVoice(v)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'white' }}>
                      {playingVoice === v.voice_id ? '⏹ Stop' : '▶ Preview'}
                    </button>
                    <button onClick={() => selectVoice(v.voice_id)} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: selectedVoiceId === v.voice_id ? '#1D9E75' : '#534AB7', color: 'white' }}>
                      {selectedVoiceId === v.voice_id ? '✓ Active' : 'Select'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add candidate modal */}
      {showAdd && (
        <div onClick={() => { setShowAdd(false); setCvFile(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Add Candidate</h2>
            <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCvUpload(f) }}
              style={{ border: '2px dashed #ddd', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: cvFile ? '#f0eeff' : '#fafafa', borderColor: cvFile ? '#534AB7' : '#ddd' }}>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }} />
              {extracting ? <div style={{ fontSize: 13, color: '#534AB7' }}>⟳ Reading CV with AI...</div>
                : cvFile ? <div style={{ fontSize: 13, color: '#534AB7' }}>✓ {cvFile.name} — fields auto-filled below</div>
                : <div><div style={{ fontSize: 13, color: '#888' }}>Drop CV here or click to upload</div><div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>PDF, DOC, DOCX — fields will auto-fill</div></div>}
            </div>
            {[
              { key: 'name', label: 'Full name *', type: 'text' },
              { key: 'email', label: 'Email *', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'tel' },
              { key: 'role_applied', label: 'Role applied for *', type: 'text' },
              { key: 'years_experience', label: 'Years of experience', type: 'number' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', background: extracting ? '#f5f5f5' : 'white' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Experience summary * (used in voice note)</label>
              <textarea value={form.experience_summary} onChange={e => setForm(p => ({ ...p, experience_summary: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', background: extracting ? '#f5f5f5' : 'white' }} placeholder="e.g. 8 years in logistics management..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setShowAdd(false); setCvFile(null) }} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={addCandidate} disabled={extracting} style={{ padding: '8px 16px', background: extracting ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: extracting ? 'not-allowed' : 'pointer' }}>{extracting ? 'Reading CV...' : 'Add candidate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit candidate modal */}
      {showEdit && editingCandidate && (
        <div onClick={() => { setShowEdit(false); setEditingCandidate(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Edit — {editingCandidate.name}</h2>
            {modalFields.map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Experience summary * (used in voice note)</label>
              <textarea value={editForm.experience_summary} onChange={e => setEditForm(p => ({ ...p, experience_summary: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setShowEdit(false); setEditingCandidate(null) }} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={saveEdit} style={{ padding: '8px 16px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
