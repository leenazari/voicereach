import { useState } from 'react'

type Props = {
  onClose: () => void
  onStepComplete?: (step: 'job' | 'candidates' | 'voice_note') => void
  completedSteps: { job: boolean; candidates: boolean; voice_note: boolean }
  mode: 'auto' | 'manual'
}

const STEPS = [
  {
    id: 'job' as const,
    number: '01',
    title: 'Create your first job',
    description: 'Add a job you are currently hiring for. Give it a title, salary and location. The AI will generate a full job description and the right keywords to match candidates against.',
    action: 'Add a job',
    tab: 'jobs',
    icon: '◉',
    color: '#534AB7',
    bg: '#EEEDFE',
    tips: [
      'Use the AI generator — just enter the job title and a brief',
      'The more detail you add the better the candidate matches',
      'Set a match threshold — 70% is a good starting point',
    ]
  },
  {
    id: 'candidates' as const,
    number: '02',
    title: 'Upload your candidate CVs',
    description: 'Upload CVs one at a time or bulk upload a ZIP file of PDFs. The AI reads each CV and extracts the candidate\'s name, experience, skills and keywords automatically.',
    action: 'Upload candidates',
    tab: 'candidates',
    icon: '◎',
    color: '#185FA5',
    bg: '#E6F1FB',
    tips: [
      'Bulk upload — zip up to 250 PDFs and upload in one go',
      'PDFs only for bulk upload — convert Word docs first',
      'Keywords are auto-generated and used for job matching',
    ]
  },
  {
    id: 'voice_note' as const,
    number: '03',
    title: 'Send your first voice note',
    description: 'Go to the Pipeline tab, find a candidate in Applied status and click "Shortlist and send voice note". A personalised script is generated from their CV. Review it, edit if needed, then hit send.',
    action: 'Go to pipeline',
    tab: 'pipeline',
    icon: '◈',
    color: '#1D9E75',
    bg: '#E1F5EE',
    tips: [
      'Always preview the script before sending',
      'You can edit the script — add the salary or tweak the tone',
      'The candidate gets a branded email with a play button',
    ]
  }
]

export default function OnboardingModal({ onClose, onStepComplete, completedSteps, mode }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const step = STEPS[activeStep]
  const allDone = completedSteps.job && completedSteps.candidates && completedSteps.voice_note
  const completedCount = Object.values(completedSteps).filter(Boolean).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>

        {/* HEADER */}
        <div style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)', borderRadius: '20px 20px 0 0', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 4 }}>
                {allDone ? '🎉 You\'re all set!' : 'Get started with VoiceReach'}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                {allDone ? 'You\'ve completed all three steps. You\'re ready to go.' : 'Three steps to your first booked interview'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '6px 10px', borderRadius: 8 }}>×</button>
          </div>

          {/* PROGRESS */}
          <div style={{ display: 'flex', gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} onClick={() => setActiveStep(i)} style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: activeStep === i ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${activeStep === i ? 'rgba(255,255,255,0.3)' : 'transparent'}`, transition: 'all 0.2s' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: completedSteps[s.id] ? '#1D9E75' : activeStep === i ? 'white' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: completedSteps[s.id] ? 'white' : activeStep === i ? '#302b63' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                    {completedSteps[s.id] ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activeStep === i ? 'white' : 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>{s.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STEP CONTENT */}
        <div style={{ padding: '28px 32px' }}>
          {allDone ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>You\'ve completed the getting started guide</div>
              <div style={{ fontSize: 14, color: '#888', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
                You now know how to create jobs, upload candidates and send voice notes. Go book some interviews.
              </div>
              <button onClick={onClose} style={{ padding: '12px 32px', background: '#534AB7', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Let\'s go →
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: step.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{step.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: step.color }}>Step {step.number}</div>
                    {completedSteps[step.id] && <span style={{ fontSize: 11, background: '#E1F5EE', color: '#1D9E75', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>✓ Done</span>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px', marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>{step.description}</div>
                </div>
              </div>

              {/* TIPS */}
              <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#aaa', marginBottom: 12 }}>Tips</div>
                {step.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < step.tips.length - 1 ? 10 : 0 }}>
                    <span style={{ color: step.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                    <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>

              {/* NAVIGATION */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeStep > 0 && (
                    <button onClick={() => setActiveStep(activeStep - 1)} style={{ padding: '10px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#555' }}>
                      ← Back
                    </button>
                  )}
                  {mode === 'auto' && (
                    <button onClick={onClose} style={{ padding: '10px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500, color: '#aaa' }}>
                      Skip for now
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeStep < STEPS.length - 1 ? (
                    <button onClick={() => setActiveStep(activeStep + 1)} style={{ padding: '10px 20px', background: step.color, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Next step →
                    </button>
                  ) : (
                    <button onClick={onClose} style={{ padding: '10px 20px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Got it — let's go →
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER DOTS */}
        {!allDone && (
          <div style={{ padding: '0 32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setActiveStep(i)} style={{ width: activeStep === i ? 20 : 6, height: 6, borderRadius: 3, background: activeStep === i ? '#534AB7' : '#e5e5e5', cursor: 'pointer', transition: 'all 0.2s' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
