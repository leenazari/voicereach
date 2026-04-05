import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const MATCH_WEIGHTS = {
  skills: { keywords: 60, experience: 20, sector: 15, location: 5 },
  experience: { keywords: 30, experience: 50, sector: 15, location: 5 },
  location: { keywords: 30, experience: 20, sector: 15, location: 35 }
}

// Semantic synonyms — words that mean the same thing for matching purposes
const SYNONYMS: Record<string, string[]> = {
  'sales': ['business development', 'revenue generation', 'account management', 'new business', 'commercial'],
  'business development': ['sales', 'new business', 'revenue generation', 'commercial development', 'bd'],
  'team leadership': ['people management', 'staff management', 'team management', 'managing teams', 'line management'],
  'people management': ['team leadership', 'staff management', 'team management', 'managing people', 'line management'],
  'staff management': ['team leadership', 'people management', 'team management', 'managing staff'],
  'inventory control': ['inventory management', 'stock management', 'stock control', 'inventory'],
  'inventory management': ['inventory control', 'stock management', 'stock control', 'inventory'],
  'stock management': ['inventory control', 'inventory management', 'stock control'],
  'warehouse management': ['warehousing', 'warehouse operations', 'wms', 'warehouse manager'],
  'logistics': ['supply chain', 'logistics coordination', 'logistics management', 'distribution'],
  'supply chain': ['logistics', 'supply chain management', 'scm', 'distribution'],
  'supply chain management': ['logistics', 'supply chain', 'scm', 'distribution management'],
  'operations management': ['operations', 'operational management', 'ops management', 'operations manager'],
  'project management': ['project delivery', 'programme management', 'project manager', 'pmo'],
  'customer service': ['customer support', 'client services', 'customer success', 'customer relations'],
  'customer success': ['customer service', 'client success', 'customer support', 'account management'],
  'account management': ['key account management', 'client management', 'account manager', 'kam'],
  'business analysis': ['business analyst', 'data analysis', 'requirements gathering', 'ba'],
  'data analysis': ['data analytics', 'business intelligence', 'bi', 'reporting', 'data analyst'],
  'financial management': ['finance', 'financial planning', 'fp&a', 'financial analysis', 'p&l'],
  'p&l management': ['p&l responsibility', 'profit and loss', 'financial management', 'budget management'],
  'budget management': ['budgeting', 'financial management', 'cost management', 'p&l'],
  'recruitment': ['talent acquisition', 'hiring', 'resourcing', 'talent management'],
  'talent acquisition': ['recruitment', 'hiring', 'resourcing', 'headhunting'],
  'marketing': ['digital marketing', 'marketing management', 'brand management', 'marketing strategy'],
  'digital marketing': ['marketing', 'online marketing', 'performance marketing', 'growth marketing'],
  'software development': ['software engineering', 'programming', 'coding', 'development'],
  'software engineering': ['software development', 'programming', 'engineering', 'development'],
  'b2b': ['business to business', 'b2b sales', 'corporate sales', 'enterprise sales'],
  'b2c': ['business to consumer', 'retail sales', 'consumer sales', 'direct sales'],
  'saas': ['software as a service', 'cloud software', 'subscription software', 'tech sales'],
  'e-commerce': ['ecommerce', 'online retail', 'digital retail', 'online sales'],
  'ecommerce': ['e-commerce', 'online retail', 'digital retail', 'online sales'],
  'retail': ['retail management', 'retail operations', 'store management', 'fmcg'],
  'fmcg': ['retail', 'consumer goods', 'fast moving consumer goods', 'cpg'],
  'hospitality': ['hotels', 'food and beverage', 'f&b', 'restaurant management'],
  'healthcare': ['medical', 'nhs', 'health sector', 'clinical'],
  'wms': ['warehouse management system', 'warehouse management', 'warehouse software'],
  'crm': ['customer relationship management', 'salesforce', 'hubspot', 'dynamics'],
  'erp': ['enterprise resource planning', 'sap', 'oracle', 'netsuite'],
  'safety compliance': ['health and safety', 'hse', 'safety management', 'compliance', 'iso'],
  'health and safety': ['safety compliance', 'hse', 'safety management', 'risk assessment'],
}

function normalise(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s&]/g, '').replace(/\s+/g, ' ')
}

function getWordSet(str: string): Set<string> {
  return new Set(normalise(str).split(' ').filter(w => w.length > 2))
}

function semanticMatch(candidateKeyword: string, jobSkill: string): boolean {
  const ck = normalise(candidateKeyword)
  const js = normalise(jobSkill)

  // Exact match
  if (ck === js) return true

  // One contains the other
  if (ck.includes(js) || js.includes(ck)) return true

  // Word level overlap — if 50%+ of words match
  const ckWords = getWordSet(ck)
  const jsWords = getWordSet(js)
  const overlap = [...ckWords].filter(w => jsWords.has(w)).length
  const minLen = Math.min(ckWords.size, jsWords.size)
  if (minLen > 0 && overlap / minLen >= 0.5) return true

  // Synonym check
  const synonymList = SYNONYMS[ck] || []
  if (synonymList.some(s => normalise(s) === js || js.includes(normalise(s)) || normalise(s).includes(js))) return true

  // Reverse synonym check
  const reverseSynonyms = SYNONYMS[js] || []
  if (reverseSynonyms.some(s => normalise(s) === ck || ck.includes(normalise(s)) || normalise(s).includes(ck))) return true

  return false
}

function calculateMatch(candidate: any, job: any, priority: string): { score: number, matches: string[] } {
  const weights = MATCH_WEIGHTS[priority as keyof typeof MATCH_WEIGHTS] || MATCH_WEIGHTS.skills

  const candidateKeywords = (candidate.strength_keywords || [])
  const candidateSkills = (candidate.skills || [])
  const allCandidateKeywords = Array.from(new Set([...candidateKeywords, ...candidateSkills]))

  const jobSkills = (job.required_skills || [])
  const jobSector = (job.sector || '').toLowerCase()
  const jobLocation = (job.location || '').toLowerCase()
  const jobTitle = (job.title || '').toLowerCase()

  // KEYWORD MATCH — semantic
  const keywordMatches: string[] = []
  let keywordScore = 0

  if (jobSkills.length > 0) {
    for (const jobSkill of jobSkills) {
      let matched = false
      for (const candidateKeyword of allCandidateKeywords) {
        if (semanticMatch(candidateKeyword, jobSkill)) {
          if (!keywordMatches.includes(candidateKeyword)) {
            keywordMatches.push(candidateKeyword)
          }
          matched = true
          break
        }
      }
    }
    keywordScore = Math.min(100, Math.round((keywordMatches.length / jobSkills.length) * 100))
  } else {
    keywordScore = 50
  }

  // EXPERIENCE MATCH
  let experienceScore = 50
  const years = candidate.years_experience || 0
  if (jobTitle.includes('senior') || jobTitle.includes('lead') || jobTitle.includes('head') || jobTitle.includes('director')) {
    experienceScore = years >= 7 ? 100 : years >= 5 ? 75 : years >= 3 ? 50 : 25
  } else if (jobTitle.includes('junior') || jobTitle.includes('graduate') || jobTitle.includes('entry')) {
    experienceScore = years <= 3 ? 100 : years <= 5 ? 75 : 50
  } else if (jobTitle.includes('manager') || jobTitle.includes('executive')) {
    experienceScore = years >= 4 ? 100 : years >= 2 ? 75 : years >= 1 ? 50 : 25
  } else {
    experienceScore = years >= 2 ? 100 : years >= 1 ? 75 : 50
  }

  // SECTOR MATCH — semantic
  let sectorScore = 50
  if (jobSector) {
    const allKeywordsText = allCandidateKeywords.map(k => normalise(k)).join(' ')
    const jobSectorNorm = normalise(jobSector)
    const jobSectorWords = getWordSet(jobSectorNorm)

    // Check if any candidate keyword semantically matches the sector
    const sectorMatch = allCandidateKeywords.some(ck => {
      const ckNorm = normalise(ck)
      if (ckNorm.includes(jobSectorNorm) || jobSectorNorm.includes(ckNorm)) return true
      const ckWords = getWordSet(ckNorm)
      const overlap = [...ckWords].filter(w => jobSectorWords.has(w)).length
      return overlap > 0
    })

    if (sectorMatch || allKeywordsText.includes(jobSectorWords.values().next().value)) {
      sectorScore = 100
    } else {
      sectorScore = 30
    }
  }

  // LOCATION MATCH
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

  return { score: Math.min(100, total), matches: keywordMatches }
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

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('*')

    if (candError) throw candError

    const { data: existingMatches } = await supabase
      .from('job_candidates')
      .select('candidate_id, status')
      .eq('job_id', jobId)

    const existingStatusMap: Record<string, string> = {}
    for (const m of existingMatches || []) {
      existingStatusMap[m.candidate_id] = m.status
    }

    const SENT_STATUSES = ['voice_sent', 'interview_booked', 'hired']

    const priority = job.match_priority || 'skills'
    const threshold = job.match_threshold || 70
    const results = []

    for (const candidate of candidates || []) {
      const { score, matches } = calculateMatch(candidate, job, priority)

      const existingStatus = existingStatusMap[candidate.id]
      const alreadySent = existingStatus && SENT_STATUSES.includes(existingStatus)

      const newStatus = alreadySent
        ? existingStatus
        : score >= threshold ? 'shortlist' : 'longlist'

      await supabase
        .from('job_candidates')
        .upsert({
          job_id: jobId,
          candidate_id: candidate.id,
          match_score: score,
          keyword_matches: matches,
          status: newStatus,
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
        status: newStatus,
        already_sent: alreadySent
      })
    }

    results.sort((a, b) => b.match_score - a.match_score)

    return res.status(200).json({
      success: true,
      jobId,
      priority,
      threshold,
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
