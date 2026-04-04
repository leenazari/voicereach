{/* Job details modal */}
{showJobModal && jobModalCandidate && (
  <div onClick={() => { setShowJobModal(false); setScriptPreview(''); setShowScriptPreview(false) }} style={overlayStyle}>
    <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, width: 500, animation: 'modalIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎙</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Send voice note</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>to {jobModalCandidate.name}</div>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
        A personalised voice note will be generated and emailed to <strong>{jobModalCandidate.email}</strong> with a 24-hour interview link.
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>Job title *</label>
        <input
          type="text"
          value={jobForm.jobTitle}
          onChange={e => { setJobForm(p => ({ ...p, jobTitle: e.target.value })); setShowScriptPreview(false) }}
          placeholder="e.g. Senior Sales Executive"
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>Salary <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
        <input
          type="text"
          value={jobForm.jobSalary}
          onChange={e => { setJobForm(p => ({ ...p, jobSalary: e.target.value })); setShowScriptPreview(false) }}
          placeholder="e.g. £45,000"
          style={inputStyle}
        />
      </div>

      {/* Script preview */}
      {showScriptPreview && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>Voice note script <span style={{ color: '#aaa', fontWeight: 400 }}>(edit if needed)</span></label>
          <textarea
            value={scriptPreview}
            onChange={e => setScriptPreview(e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12 }}
          />
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            {scriptPreview.split(' ').length} words — approx {Math.round(scriptPreview.split(' ').length / 2.3)} seconds
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => { setShowJobModal(false); setScriptPreview(''); setShowScriptPreview(false) }} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>Cancel</button>
        {!showScriptPreview ? (
          <button onClick={previewScript} disabled={!jobForm.jobTitle || generatingPreview} style={{ padding: '9px 20px', background: generatingPreview ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: generatingPreview ? 'not-allowed' : 'pointer' }}>
            {generatingPreview ? '⟳ Generating preview...' : '👁 Preview script'}
          </button>
        ) : (
          <button onClick={confirmShortlist} style={{ padding: '9px 20px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            🎙 Generate and send
          </button>
        )}
      </div>
    </div>
  </div>
)}
