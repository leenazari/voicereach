/**
 * VoiceReach unified scoring
 * 
 * CV match score is weighted at 30% — CVs can be embellished
 * Interview score is weighted at 70% — a stronger, live signal
 * 
 * If only one score exists, it counts as 100%
 * If no_cv is true, CV score is ignored entirely — only interview counts
 */

export function getCombinedScore(
  cvMatchScore?: number | null,
  interviewScore?: number | null,
  noCv?: boolean
): number {
  const hasCV = !noCv && cvMatchScore != null && cvMatchScore > 0
  const hasInterview = interviewScore != null && interviewScore > 0

  if (hasCV && hasInterview) {
    return Math.round(cvMatchScore! * 0.3 + interviewScore! * 0.7)
  }
  if (hasInterview) return Math.round(interviewScore!)
  if (hasCV) return Math.round(cvMatchScore!)
  return 0
}

export function getScoreColor(score: number): string {
  if (score >= 75) return '#1D9E75'
  if (score >= 55) return '#BA7517'
  return '#E24B4A'
}

export function getScoreBg(score: number): string {
  if (score >= 75) return '#E1F5EE'
  if (score >= 55) return '#FFF3E0'
  return '#fff0ee'
}

export function getScoreLabel(score: number): string {
  if (score >= 75) return 'Strong candidate'
  if (score >= 55) return 'Average candidate'
  return 'Weak candidate'
}

export function getScoreBreakdown(
  cvMatchScore?: number | null,
  interviewScore?: number | null,
  noCv?: boolean
): string {
  const hasCV = !noCv && cvMatchScore != null && cvMatchScore > 0
  const hasInterview = interviewScore != null && interviewScore > 0

  if (hasCV && hasInterview) {
    return `CV ${cvMatchScore}% (×30%) + Interview ${interviewScore}% (×70%)`
  }
  if (hasInterview && noCv) return `Interview score only (no CV uploaded)`
  if (hasInterview) return `Interview score only`
  if (hasCV) return `CV match only`
  return ''
}
