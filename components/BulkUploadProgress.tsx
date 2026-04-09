import { useState } from 'react'
import { useRouter } from 'next/router'
import { useBulkUpload } from '../context/BulkUploadContext'

export default function BulkUploadProgress() {
  const { state, dismiss } = useBulkUpload()
  const router = useRouter()
  const [showSummary, setShowSummary] = useState(false)

  if (!state.active && !state.done) return null

  const successCount = state.results.filter(r => r.success).length
  const failCount = state.results.filter(r => !r.success).length
  const percent = state.total > 0 ? Math.round((state.current / state.total) * 100) : 0

  return (
    <>
      {/* FLOATING PILL */}
      <div
        onClick={() => {
          if (state.done) setShowSummary(true)
          else router.push('/dashboard?tab=candidates')
        }}
        style={{
          position: 'fixed', bottom: 28, left: 28, zIndex: 998,
          background: state.done ? (failCount === 0 ? '#1D9E75' : '#534AB7') : '#1a1a1a',
          color: 'white', borderRadius: 50, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: 13, fontWeight: 600, transition: 'all 0.3s',
          maxWidth: 320
        }}
      >
        {state.done ? (
          <>
            <span style={{ fontSize: 16 }}>{failCount === 0 ? '✓' : '⚠'}</span>
            <div>
              <div>{failCount === 0 ? 'All CVs uploaded' : `${successCount} uploaded, ${failCount} failed`}</div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Click to see summary</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Uploading {state.current}/{state.total} — {state.currentFile}
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percent}%`, background: 'white', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* SUMMARY MODAL */}
      {showSummary && state.done && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 520, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Bulk upload complete</div>
                {state.jobTitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Job: {state.jobTitle}</div>}
              </div>
              <button onClick={() => { setShowSummary(false); dismiss() }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1D9E75' }}>{successCount}</div>
                <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>Uploaded successfully</div>
              </div>
              <div style={{ background: failCount > 0 ? '#fff0ee' : '#f5f5f5', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: failCount > 0 ? '#E24B4A' : '#aaa' }}>{failCount}</div>
                <div style={{ fontSize: 12, color: failCount > 0 ? '#E24B4A' : '#aaa', fontWeight: 600 }}>Failed</div>
              </div>
            </div>

            {successCount > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Successfully uploaded</div>
                {state.results.filter(r => r.success).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fffe', border: '1px solid #d4f0e8', borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{r.name || r.filename}</div>
                      {r.email && <div style={{ fontSize: 11, color: '#888' }}>{r.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {failCount > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E24B4A', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Failed</div>
                {state.results.filter(r => !r.success).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ color: '#E24B4A', fontWeight: 700, flexShrink: 0 }}>✕</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{r.filename}</div>
                      <div style={{ fontSize: 11, color: '#E24B4A' }}>{r.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { router.push('/dashboard?tab=candidates'); setShowSummary(false); dismiss() }} style={{ padding: '9px 18px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                View candidates
              </button>
              <button onClick={() => { setShowSummary(false); dismiss() }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
