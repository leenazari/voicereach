import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const MATCH_WEIGHTS = {
  skills: { keywords: 60, experience: 20, sector: 15, location: 5 },
  experience: { keywords: 30, experience: 50, sector: 15, location: 5 },
  location: { keywords: 30, experience: 20, sector: 15, location: 35 }
}

function calculateMatch(candidate: any, job: any, priority: string): { score: number, matches: string[] } {
  const weights = MATCH_WEIGHTS[priority as keyof typeof MATCH_WEIGHTS] || MATCH_WEIGHTS.skills

  const candidateKeywords = (candidate.strength_keywords || []).map((k: string) => k.toLowerCase())
  const candidateSkills = (candidate.skills || []).map((k: string) => k.toLowerCase())
  const allCandidateKeywords = [...new Set([...candidateKeywords, ...candidateSkills])]

  const jobSkills = (job.required_skills || []).map((s: string) => s.toLowerCase())
  const jobSector = (job.sector || '').toLowerCase()
  const jobLocation = (job.location || '').toLowerCase()
  const jobTitle = (job.title || '').toLowerCase()

  // KEYWORD MATCH — how many candidate keywords match job required skills
  const keywordMatches: string[] = []
  let keywordScore = 0
  if (jobSkills.length > 0) {
    for (const keyword of allCandidateKeywords) {
      for (const skill of jobSkills) {
        if (keyword.includes(skill) || skill.includes(keyword)) {
          keywordMatches.push(candidate.strength_keywords?.find((k: string) =>
            k.toLowerCase() === keyword) || keyword)
          break
        }
      }
    }
    keywordScore = Math.min(100, Math.round((keywordMatches.length / jobSkills.length) * 100))
  } else {
    keywordScore = 50
  }

  // EXPERIENCE MATCH — years experience vs seniority of role
  let experienceScore = 50
  const years = candidate.years_experience || 0
  const titleLower = jobTitle
  if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('head') || titleLower.includes('director')) {
    experienceScore = years >= 7 ? 100 : years >= 5 ? 75 : years >= 3 ? 50 : 25
  } else if (titleLower.includes('junior') || titleLower.includes('graduate') || titleLower.includes('entry')) {
    experienceScore = years <= 3 ? 100 : years <= 5 ? 75 : 50
  } else if (titleLower.includes('manager') || titleLower.includes('executive')) {
    experienceScore = years >= 4 ? 100 : years >= 2 ? 75 : years >= 1 ? 50 : 25
  } else {
    experienceScore = years >= 2 ? 100 : years >= 1 ? 75 : 50
  }

  // SECTOR MATCH — does candidate sector overlap with job sector
  let sectorScore = 50
  if (jobSector) {
    const candidateSectors = allCandidateKeywords.join(' ')
    if (candidateSectors.includes(jobSector) || jobSector.split(' ').some(s => candidateSectors.includes(s))) {
      sectorScore = 100
    } else {
      sectorScore = 30
    }
  }

  // LOCATION MATCH — based on work type
  let locationScore = 50
  if (job.work_type === 'remote') {
    locationScore = 100
  } else if (job.work_type === 'hybrid') {
    locationScore = 70
  } else {
    const candidateLocation = (candidate.location || '').toLowerCase()
    if (candidateLocation && jobLocation) {
      if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
        locationScore = 100
      } else {
        const jobCity = jobLocation.split(',')[0].trim()
        const candidateCity = candidateLocation.split(',')[0].trim()
        if (jobCity && candidateCity && (jobCity.includes(candidateCity) || candidateCity.includes(jobCity))) {
          locationScore = 100
        } else {
          locationScore = 20
        }
      }
    }
  }

  // WEIGHTED TOTAL
  const total = Math.round(
    (keywordScore * weights.keywords / 100) +
    (experienceScore * weights.experience / 100) +
    (sectorScore * weights.sector / 100) +
    (locationScore * weights.location / 100)
  )

  return { score: Math.min(100, total), matches: [...new Set(keywordMatches)] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { jobId } = req.body
    if (!jobId) return res.status(400).json({ error: 'jobId required' })

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

    // Get all candidates
    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('*')

    if (candError) throw candError

    const priority = job.match_priority || 'skills'
    const results = []

    for (const candidate of candidates || []) {
      const { score, matches } = calculateMatch(candidate, job, priority)

      // Upsert into job_candidates
      await supabase
        .from('job_candidates')
        .upsert({
          job_id: jobId,
          candidate_id: candidate.id,
          match_score: score,
          keyword_matches: matches,
          status: score >= 70 ? 'shortlist' : 'longlist',
          updated_at: new Date().toISOString()
        }, { onConflict: 'job_id,candidate_id' })

      results.push({
        candidate_id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role_applied: candidate.role_applied,
        years_experience: candidate.years_experience,
        last_employer: candidate.last_employer,
        location: candidate.location,
        strength_keywords: candidate.strength_keywords,
        match_score: score,
        keyword_matches: matches,
        status: score >= 70 ? 'shortlist' : 'longlist'
      })
    }

    // Sort by match score
    results.sort((a, b) => b.match_score - a.match_score)

    return res.status(200).json({
      success: true,
      jobId,
      priority,
      total: results.length,
      shortlist: results.filter(r => r.status === 'shortlist').length,
      longlist: results.filter(r => r.status === 'longlist').length,
      results
    })

  } catch (err: any) {
    console.error('Match candidates error:', err)
    return res.status(500).json({ error: err.message || 'Failed to match candidates' })
  }
}
