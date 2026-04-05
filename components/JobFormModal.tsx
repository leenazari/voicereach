import { useState, useRef } from 'react'

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

type Props = {
  mode: 'add' | 'edit'
  job?: Job | null
  onSave: () => void
  onClose: () => void
  notify: (message: string, type?: 'success' | 'error') => void
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
    logo_url: job?.logo_url || ''
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
      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        ...(mode === 'edit' && job ? { jobId: job.id } : {})
      }
      const res = await fetch('/api/jobs', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div onMouseDown={overlayMouseDown} onMouseUp={overlayMouseUp} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: 560, maxHeight: '90vh', overflowY: 'auto' }}>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a1a1a' }}>
          {mode === 'edit' ? `Edit Job — ${job?.title}` : 'Add Job'}
        </h2>

        {/* LOGO UPLOAD */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 500 }}>Company logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid #e5e5e5', background: '#fafafa' }} />
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
          style={{ width: '100%', padding: '11px', background: !form.title || generatingJob ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !form.title || generatingJob ? 'not-allowed' : 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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

        {/* REQUIRED SKILLS */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>
            Required skills <span style={{ color: '#bbb', fontWeight: 400 }}>(comma separated)</span>
          </label>
          <input type="text" value={form.required_skills} onChange={e => setForm(p => ({ ...p, required_skills: e.target.value }))} placeholder="e.g. B2B Sales, CRM, Negotiation" style={inputStyle} />
        </div>

        {/* STATUS */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* DESCRIPTION */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 5, fontWeight: 500 }}>Job description *</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={6}
            placeholder="Describe the role... or press Generate with AI above"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
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
            style={{ padding: '9px 18px', background: uploadingLogo || generatingJob || saving ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploadingLogo || generatingJob || saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? '⟳ Saving...' : mode === 'edit' ? 'Save changes' : 'Save job'}
          </button>
        </div>
      </div>
    </div>
  )
}
