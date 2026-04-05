import { Candidate } from './supabase'
  export function buildScriptFromMatch(candidate: Candidate, matchData: any, job: any): string {
  const firstName = candidate.name.split(' ')[0]
  const jobTitle = job?.title || candidate.job_title || candidate.role_applied
  const company = job?.company ? `at ${job.company}` : ''
  const sector = job?.sector ? `in the ${job.sector} space` : ''

  const salaryLine = (job?.salary || candidate.job_salary)
    ? `, paying ${formatSalary(job?.salary || candidate.job_salary)},`
    : ','

  const yearsLine = candidate.years_experience > 0
    ? `your ${candidate.years_experience} years of experience`
    : `your background`

  const employerLine = (candidate as any).last_employer
    ? `your experience at ${(candidate as any).last_employer}`
    : yearsLine

  // Build match line but strip any mention of last_employer to avoid repetition
  let matchLine = ''
  if (matchData?.top_matches && matchData.top_matches.length > 0) {
    const lastEmployer = ((candidate as any).last_employer || '').toLowerCase()
    const filteredMatches = matchData.top_matches
      .filter((m: string) => !lastEmployer || !m.toLowerCase().includes(lastEmployer))
      .slice(0, 2)
    if (filteredMatches.length > 0) {
      matchLine = ` Your ${filteredMatches.join(' and ')} really stand out for this one.`
    }
  }

  // Force second person in hook — replace any third person references to candidate name
  let hookLine = matchData?.pitch_hook || `with your background, you are exactly what this client is looking for`
  hookLine = hookLine
    .replace(new RegExp(`${firstName}\\s+has`, 'gi'), 'you have')
    .replace(new RegExp(`${firstName}\\s+is`, 'gi'), 'you are')
    .replace(new RegExp(`${firstName}\\'s`, 'gi'), 'your')
    .replace(new RegExp(`\\bhe has\\b`, 'gi'), 'you have')
    .replace(new RegExp(`\\bshe has\\b`, 'gi'), 'you have')
    .replace(new RegExp(`\\bhe is\\b`, 'gi'), 'you are')
    .replace(new RegExp(`\\bshe is\\b`, 'gi'), 'you are')
    .replace(new RegExp(`\\bhis `, 'gi'), 'your ')
    .replace(new RegExp(`\\bher `, 'gi'), 'your ')
    .replace(new RegExp(`\\bthey have\\b`, 'gi'), 'you have')

  const urgencyLine = matchData?.urgency_line || `this one is moving fast and they are ready to hire`

  const script = `Hi ${firstName}... I hope you are well today. I have just had your CV come across my desk and the timing is perfect. We have a brand new ${jobTitle} role ${company}${salaryLine} and honestly, ${hookLine}.${matchLine} ${employerLine} makes you a brilliant fit for what they need ${sector}. I have created a personal interview link just for you — you can do the interview right now, it takes less than ten minutes and fits around your day. But do not leave it too long ${firstName}, ${urgencyLine}. Click the link below, do the interview, and let us get you this job.`

  return trimToSixtySeconds(script)
}
