import { useRef, useState } from 'react'
import { useBulkUpload } from '../context/BulkUploadContext'
import JSZip from 'jszip'

type Props = {
  token: string
  jobId?: string
  jobTitle?: string
  onClose: () => void
}

export default function BulkUploadModal({ token, jobId, jobTitle, onClose }: Props) {
  const { startUpload } = useBulkUpload()
  const fileRef = useRef<HTMLInputElement>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ name: string; valid: boolean; reason?: string }[]>([])
  const [parsing, setParsing] = useState(false)

  async function handleZip(file: File) {
    setZipFile(file)
    setParsing(true)
    try {
      const zip = await JSZip.loadAsync(file)
      const entries: { name: string; valid: boolean; reason?: string }[] = []
      zip.forEach((path, entry) => {
        if (entry.dir) return
        const filename = path.split('/').pop() || path
        if (filename.startsWith('__MACOSX') || filename.startsWith('.')) return
        const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
        if (ext !== '.pdf') {
          entries.push({ name: filename, valid: false, reason: ext === '.doc' || ext === '.docx' ? 'Word docs not supported — convert to PDF' : 'Wrong format — PDF only' })
        } else {
          entries.push({ name: filename, valid: true })
        }
      })
      setPreview(entries)
    } catch {
      setPreview([])
    }
    setParsing(false)
  }

  async function handleStart() {
    if (!zipFile) return
    const zip = await JSZip.loadAsync(zipFile)
    const files: File[] = []
    const promises: Promise<void>[] = []

    zip.forEach((path, entry) => {
      if (entry.dir) return
      const filename = path.split('/').pop() || path
      if (filename.startsWith('__MACOSX') || filename.startsWith('.')) return
      const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
      if (ext !== '.pdf') return

      const p = entry.async('blob').then(blob => {
        files.push(new File([blob], filename, { type: 'application/pdf' }))
      })
      promises.push(p)
    })

    await Promise.all(promises)
    onClose()
    startUpload(files, token, jobId, jobTitle)
  }

  const validCount = preview.filter(p => p.valid).length
  const invalidCount = preview.filter(p => !p.valid).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 500, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Bulk CV upload</div>
            {jobTitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Uploading to: {jobTitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ background: '#f0eeff', border: '1px solid #EEEDFE', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#534AB7' }}>
          📄 ZIP file must contain PDF files only. Word documents (.doc/.docx) are not supported — please convert them to PDF first.
        </div>

        {!zipFile ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleZip(f) }}
            style={{ border: '2px dashed #e0e0e0', borderRadius: 10, padding: 40, textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}
          >
            <input ref={fileRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleZip(f) }} />
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Drop your ZIP file here</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>ZIP must contain PDF files only</div>
          </div>
        ) : parsing ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>⟳ Reading ZIP file...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1D9E75' }}>{validCount}</div>
                <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>Ready to upload</div>
              </div>
              <div style={{ background: invalidCount > 0 ? '#fff0ee' : '#f5f5f5', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: invalidCount > 0 ? '#E24B4A' : '#aaa' }}>{invalidCount}</div>
                <div style={{ fontSize: 11, color: invalidCount > 0 ? '#E24B4A' : '#aaa', fontWeight: 600 }}>Skipped</div>
              </div>
            </div>

            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 20, border: '1px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
              {preview.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < preview.length - 1 ? '1px solid #f5f5f5' : 'none', background: p.valid ? 'white' : '#fff8f8' }}>
                  <span style={{ color: p.valid ? '#1D9E75' : '#E24B4A', fontWeight: 700, flexShrink: 0 }}>{p.valid ? '✓' : '✕'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    {p.reason && <div style={{ fontSize: 11, color: '#E24B4A' }}>{p.reason}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#888' }}>
              Processing happens in the background — you can navigate freely while CVs upload. Progress shows bottom left.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button onClick={() => { setZipFile(null); setPreview([]) }} style={{ padding: '9px 16px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>
                Change file
              </button>
              <button onClick={handleStart} disabled={validCount === 0} style={{ padding: '9px 20px', background: validCount === 0 ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: validCount === 0 ? 'not-allowed' : 'pointer' }}>
                Upload {validCount} CV{validCount !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
