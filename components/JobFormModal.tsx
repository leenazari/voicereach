import { useState, useRef } from 'react'
import React from 'react'
import { supabase } from '../lib/supabase'

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

type Props = {
  mode: 'add' | 'edit'
  job?: Job | null
  onSave: () => void
  onClose: () => void
  notify: (message: string, type?: 'success' | 'error') => void
}

const MATCH_PRIORITIES = [
  {
    key: 'skills',
    label: 'Skills',
    icon: '⚡',
    description: 'Best for roles where specific skills and keywords matter most',
    weights: { keywords: 60, experience: 20, sector: 15, location: 5 }
  },
  {
    key: 'experience',
    label: 'Experience',
    icon: '🏆',
    description: 'Best for senior roles where years and level of experience matters most',
    weights: { keywords: 30, experience: 50, sector: 15, location: 5 }
  },
  {
    key: 'location',
    label: 'Location',
    icon: '📍',
    description: 'Best for office based roles where being nearby matters most',
    weights: { keywords: 30, experience: 20, sector: 15, location: 35 }
  }
]

const WORK_TYPES = [
  { key: 'office', label: 'Office', icon: '🏢' },
  { key: 'hybrid', label: 'Hybrid', icon: '🔄' },
  { key: 'remote', label: 'Remote', icon: '🌍' }
]

function getThresholdLabel(value: number): { label: string, color: string } {
  if (value >= 85) return { label: 'Very strict — only the best matches', color: '#E24B4A' }
  if (value >= 70) return { label: 'Standard — good quality matches', color: '#534AB7' }
  if (value >= 55) return { label: 'Relaxed — broader pool of candidates', color: '#BA7517' }
  return { label: 'Open — include all possible matches', color: '#1D9E75' }
}

export default function JobFormModal({ mode, job, onSave, onClose, notify }: Props) {
  const [form, setForm] = useState({
    title: job?.title || '',
    brief: '',
    company: job?.company || '',
    location: job?.location || '',
    salary: job?.salary || '',
    description: job?.description || '',
    required_skills: (job?.required_skills || []).join(', '),
    sector: job?.sector || '',
    status: job?.status || 'active',
    logo_url: job?.logo_url || '',
    closes_at: job?.closes_at ? job.closes_at.split('T')[0] : '',
    work_type: job?.work_type || 'office',
    match_priority: job?.match_priority || 'skills',
    match_threshold: job?.match_threshold || 70
  })
  const [logoPreview, setLogoPreview] = useState<string>(job?.logo_url || '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [generatingJob, setGeneratingJob] = useState(false)
  const [saving, setSaving] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const mouseDownOnOverlay = useRef(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5',
    borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box'
  }
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  }

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    }
  }

  function overlayMouseDown(e: React.MouseEvent) {
    mouseDownOnOverlay.current = e.target === e.currentTarget
  }
  function overlayMouseUp(e: React.MouseEvent) {
    if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose()
    mouseDownOnOverlay.current = false
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true)
    setLogoPreview(URL.createObjectURL(file))
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = () => rej(new Error('Read failed'))
        r.readAsDataURL(file)
      })
      const headers = await authHeaders()
      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ base64, filename: file.name, mimeType: file.type })
      })
      const data = await response.json()
      if (data.url) {
        setForm(p => ({ ...p, logo_url: data.url }))
        notify('Logo uploaded successfully')
      } else notify('Logo upload failed', 'error')
    } catch { notify('Could not upload logo', 'error') }
    finally { setUploadingLogo(false) }
  }

  async function generateJobDetails() {
    if (!form.title) { notify('Please enter a job title first', 'error'); return }
    setGeneratingJob(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/generate-job', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: form.title, brief: form.brief })
      })
      const data = await res.json()
      if (data.generated) {
        setForm(p => ({
          ...p,
          description: data.generated.description || p.description,
          required_skills: (data.generated.required_skills || []).join(', '),
          sector: data.generated.sector || p.sector
        }))
        notify('Job details generated successfully')
      } else notify('Could not generate job details', 'error')
    } catch { notify('Generation failed', 'error') }
    finally { setGeneratingJob(false) }
  }

  async function handleSave() {
    if (!form.title || !form.description) { notify('Title and description are required', 'error'); return }
    setSaving(true)
    try {
      const { brief, ...formWithoutBrief } = form
      const payload = {
        ...formWithoutBrief,
        required_skills: form.required_skills
          ? form.required_skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
        ...(mode === 'edit' && job ? { jobId: job.id } : {})
      }
      const headers = await authHeaders()
      const res = await fetch('/api/jobs', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.job || data.success) {
        notify(mode === 'edit' ? 'Job updated successfully' : 'Job added successfully')
        onSave()
        onClose()
      } else notify('Error: ' + (data.error || 'Something went wrong'), 'error')
    } catch { notify('Could not save job', 'error') }
    finally { setSaving(false) }
  }

  const selectedPriority = MATCH_PRIORITIES.find(p => p.key === form.match_priority) || MATCH_PRIORITIES[0]
  const thresholdInfo = getThresholdLabel(form.match_threshold)

  return (
    <div onMouseDown={overlayMouseDown} onMouseUp={overlayMouseUp} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: 580, maxHeight: '92vh', overflowY: 'auto' }}>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a1a1a' }}>
          {mode === 'edit' ? `Edit Job — ${job?.title}` : 'Add Job'}
        </h2>

        {/* LOGO UPLOAD */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 500 }}>Company logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain' as const, border: '1px solid #e5e5e5', background: '#fafafa' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f5f5f5', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>
            )}
            <div style={{ flex: 1 }}>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo} style={{ padding: '7px 16px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12, cursor: uploadingLogo ? 'not-allowed' : 'pointer', background: uploadingLogo ? '#f5f5f5' : 'white', fontWeight: 500, color: '#555' }}>
                {uploadingLogo ? '⟳ Uploading...' : logoPreview ? '↺ Change logo' : '↑ Upload logo'}
              </button>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>PNG, JPG or SVG — shown on the candidate landing page</div>
            </div>
          </div>
        </div>

        {/* JOB TITLE */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Job title *</label>
          <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Sales Executive" style={inputStyle} autoFocus />
        </div>

        {/* BRIEF */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>
            Brief <span style={{ color: '#bbb', fontWeight: 400 }}>(optional — helps AI write better content)</span>
          </label>
          <input type="text" value={form.brief} onChange={e => setForm(p => ({ ...p, brief: e.target.value }))} placeholder="e.g. B2B sales role selling EPOS to SMEs across the UK" style={inputStyle} />
        </div>

        {/* AI GENERATE BUTTON */}
        <button
          type="button"
          onClick={generateJobDetails}
          disabled={!form.title || generatingJob}
          style={{ width: '100%', padding: '11px', background: !form.title || generatingJob ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !form.title || generatingJob ? 'not-allowed' : 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } as React.CSSProperties}
        >
          {generatingJob ? '⟳ Generating with AI...' : '✦ Generate job details with AI'}
        </button>

        {/* OTHER FIELDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {[
            { key: 'company', label: 'Company name', placeholder: 'e.g. Acme Corp' },
            { key: 'location', label: 'Location', placeholder: 'e.g. London, UK' },
            { key: 'salary', label: 'Salary', placeholder: 'e.g. £45,000' },
            { key: 'sector', label: 'Sector', placeholder: 'e.g. Technology, Sales' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>{f.label}</label>
              <input type="text" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
        </div>

        {/* CLOSES AT + STATUS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Interview close date <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
            <input type="date" value={form.closes_at} onChange={e => setForm(p => ({ ...p, closes_at: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* WORK TYPE */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, fontWeight: 500 }}>Work type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {WORK_TYPES.map(w => (
              <button
                key={w.key}
                type="button"
                onClick={() => setForm(p => ({ ...p, work_type: w.key }))}
                style={{ flex: 1, padding: '10px 8px', border: `2px solid ${form.work_type === w.key ? '#534AB7' : '#e5e5e5'}`, borderRadius: 10, fontSize: 13, cursor: 'pointer', background: form.work_type === w.key ? '#f0eeff' : 'white', color: form.work_type === w.key ? '#534AB7' : '#555', fontWeight: form.work_type === w.key ? 700 : 400, transition: 'all 0.15s' } as React.CSSProperties}
              >
                {w.icon} {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* REQUIRED SKILLS */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>
            Required skills <span style={{ color: '#bbb', fontWeight: 400 }}>(comma separated)</span>
          </label>
          <input type="text" value={form.required_skills} onChange={e => setForm(p => ({ ...p, required_skills: e.target.value }))} placeholder="e.g. B2B Sales, CRM, Negotiation" style={inputStyle} />
        </div>

        {/* MATCH PRIORITY */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, fontWeight: 500 }}>What matters most for this role?</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {MATCH_PRIORITIES.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, match_priority: p.key }))}
                style={{ flex: 1, padding: '12px 8px', border: `2px solid ${form.match_priority === p.key ? '#534AB7' : '#e5e5e5'}`, borderRadius: 10, fontSize: 13, cursor: 'pointer', background: form.match_priority === p.key ? '#f0eeff' : 'white', color: form.match_priority === p.key ? '#534AB7' : '#555', fontWeight: form.match_priority === p.key ? 700 : 400, transition: 'all 0.15s', textAlign: 'center' } as React.CSSProperties}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                <div>{p.label}</div>
              </button>
            ))}
          </div>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#666' }}>
            {selectedPriority.description}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 11, background: '#EEEDFE', color: '#534AB7', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Skills {selectedPriority.weights.keywords}%</span>
              <span style={{ fontSize: 11, background: '#E1F5EE', color: '#1D9E75', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Experience {selectedPriority.weights.experience}%</span>
              <span style={{ fontSize: 11, background: '#E6F1FB', color: '#185FA5', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Sector {selectedPriority.weights.sector}%</span>
              <span style={{ fontSize: 11, background: '#FFF3E0', color: '#E65100', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Location {selectedPriority.weights.location}%</span>
            </div>
          </div>
        </div>

        {/* MATCH THRESHOLD SLIDER */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Match threshold
            <span style={{ float: 'right', fontWeight: 700, color: thresholdInfo.color, fontSize: 13 }}>{form.match_threshold}%</span>
          </label>
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={form.match_threshold}
            onChange={e => setForm(p => ({ ...p, match_threshold: parseInt(e.target.value) }))}
            style={{ width: '100%', accentColor: thresholdInfo.color, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginBottom: 6 }}>
            <span>50% — Open</span>
            <span>70% — Standard</span>
            <span>95% — Strict</span>
          </div>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: thresholdInfo.color, fontWeight: 500 }}>
            {thresholdInfo.label}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Job description *</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={6}
            placeholder="Describe the role... or press Generate with AI above"
            style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }}
          />
        </div>

        {/* BUTTONS */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploadingLogo || generatingJob || saving}
            style={{ padding: '9px 18px', background: uploadingLogo || generatingJob || saving ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploadingLogo || generatingJob || saving ? 'not-allowed' : 'pointer' } as React.CSSProperties}
          >
            {saving ? '⟳ Saving...' : mode === 'edit' ? 'Save changes' : 'Save job'}
          </button>
        </div>
      </div>
    </div>
  )
}
