// Unified pipeline — two sections that hand over at "Interview Done"

export const JOB_STAGES = [
  { id: 'matched',        label: 'Matched',        color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  { id: 'shortlisted',    label: 'Shortlisted',    color: '#0891b2', bg: '#e0f2fe', border: '#bae6fd' },
  { id: 'invited',        label: 'Invited',        color: '#7c3aed', bg: '#f3e8ff', border: '#ddd6fe' },
  { id: 'interview_done', label: 'Interview Done', color: '#4F46E5', bg: '#EEF2FF', border: '#c7d2fe' },
]

export const INTERVIEW_STAGES = [
  { id: 'interview_done', label: 'Interview Done', color: '#4F46E5', bg: '#EEF2FF', border: '#c7d2fe' },
  { id: 'second_round',   label: '2nd Round',      color: '#7c3aed', bg: '#f3e8ff', border: '#ddd6fe' },
  { id: 'job_offer',      label: 'Job Offer',      color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
]

// Rejected is separate — collapsed by default, shared across both sections
export const REJECTED_STAGE = { id: 'rejected', label: 'Rejected', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' }

export function normaliseStatus(raw: string): string {
  if (!raw) return 'matched'
  if (raw === 'shortlist' || raw === 'longlist') return 'matched'
  if (raw === 'shortlisted') return 'shortlisted'
  if (raw === 'voice_sent' || raw === 'invited') return 'invited'
  if (raw === 'interview_booked' || raw === 'interview_done' || raw === 'interviewed') return 'interview_done'
  if (raw === 'second_round') return 'second_round'
  if (raw === 'job_offer') return 'job_offer'
  if (raw === 'rejected') return 'rejected'
  return 'matched'
}

export function toDbStatus(stageId: string): string {
  if (stageId === 'matched') return 'shortlist'
  if (stageId === 'shortlisted') return 'shortlisted'
  if (stageId === 'invited') return 'invited'
  if (stageId === 'interview_done') return 'interview_done'
  return stageId
}
