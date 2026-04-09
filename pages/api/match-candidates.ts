import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const MATCH_WEIGHTS = {
  skills: { keywords: 60, experience: 20, sector: 15, location: 5 },
  experience: { keywords: 30, experience: 50, sector: 15, location: 5 },
  location: { keywords: 30, experience: 20, sector: 15, location: 35 }
}

const SYNONYMS: Record<string, string[]> = {
  // Sales & Business Development
  'sales': ['business development', 'revenue generation', 'account management', 'new business', 'commercial'],
  'business development': ['sales', 'new business', 'revenue generation', 'commercial development', 'bd'],
  'account management': ['key account management', 'client management', 'account manager', 'kam', 'client services'],
  'new business': ['business development', 'sales', 'new business hunter', 'outbound sales', 'lead generation'],

  // Leadership & Management
  'team leadership': ['people management', 'staff management', 'team management', 'managing teams', 'line management', 'leadership'],
  'people management': ['team leadership', 'staff management', 'team management', 'managing people', 'line management'],
  'staff management': ['team leadership', 'people management', 'team management', 'managing staff'],
  'line management': ['team leadership', 'people management', 'staff management', 'direct reports'],

  // Operations & Logistics
  'inventory control': ['inventory management', 'stock management', 'stock control', 'inventory'],
  'inventory management': ['inventory control', 'stock management', 'stock control', 'inventory'],
  'stock management': ['inventory control', 'inventory management', 'stock control'],
  'warehouse management': ['warehousing', 'warehouse operations', 'wms', 'warehouse manager', 'distribution centre'],
  'logistics': ['supply chain', 'logistics coordination', 'logistics management', 'distribution', 'transport'],
  'supply chain': ['logistics', 'supply chain management', 'scm', 'distribution'],
  'supply chain management': ['logistics', 'supply chain', 'scm', 'distribution management'],
  'operations management': ['operations', 'operational management', 'ops management', 'operations manager', 'multi-site operations'],

  // Marketing & Digital
  'marketing': ['digital marketing', 'marketing management', 'brand management', 'marketing strategy', 'campaign management'],
  'digital marketing': ['marketing', 'online marketing', 'performance marketing', 'growth marketing', 'digital marketing analytics', 'marketing analytics'],
  'digital marketing analytics': ['google analytics', 'marketing analytics', 'digital marketing', 'data analytics', 'performance marketing', 'analytics'],
  'google analytics': ['digital marketing analytics', 'marketing analytics', 'analytics', 'web analytics', 'data analytics'],
  'seo': ['seo optimisation', 'search engine optimisation', 'organic search', 'seo management'],
  'seo optimisation': ['seo', 'search engine optimisation', 'organic search', 'seo management'],
  'ppc': ['ppc management', 'paid search', 'google ads', 'paid advertising', 'performance marketing'],
  'ppc management': ['ppc', 'paid search', 'google ads', 'paid advertising', 'performance marketing'],
  'social media': ['social media management', 'social media marketing', 'community management', 'social media strategy'],
  'social media management': ['social media', 'social media marketing', 'community management', 'community engagement', 'content creation'],
  'community engagement': ['social media management', 'social media', 'community management', 'stakeholder engagement'],
  'content creation': ['copywriting', 'content marketing', 'content strategy', 'social media content', 'creative writing'],
  'copywriting': ['content creation', 'content marketing', 'copy', 'creative writing', 'brand copywriting'],
  'campaign management': ['marketing campaigns', 'campaign delivery', 'campaign planning', 'marketing management'],
  'brand management': ['brand strategy', 'branding', 'brand marketing', 'brand development'],
  'lead generation': ['demand generation', 'pipeline generation', 'inbound marketing', 'outbound marketing'],
  'marketing budget management': ['budget management', 'budgeting', 'marketing spend', 'campaign budget'],
  'hubspot': ['crm', 'marketing automation', 'hubspot crm', 'inbound marketing'],
  'salesforce': ['crm', 'customer relationship management', 'salesforce crm', 'sfdc'],
  'fundraising': ['fundraising campaign support', 'charity fundraising', 'campaign management', 'donor engagement'],
  'fundraising campaign support': ['fundraising', 'campaign management', 'charity marketing', 'donor engagement'],
  'b2b marketing': ['b2b', 'business to business', 'b2b sales', 'corporate marketing'],
  'b2c marketing': ['b2c', 'business to consumer', 'consumer marketing', 'retail marketing'],

  // Finance & Commercial
  'financial management': ['finance', 'financial planning', 'fp&a', 'financial analysis', 'p&l'],
  'p&l management': ['p&l responsibility', 'profit and loss', 'financial management', 'budget management', 'p&l'],
  'budget management': ['budgeting', 'financial management', 'cost management', 'p&l', 'marketing budget management'],

  // HR & People
  'recruitment': ['talent acquisition', 'hiring', 'resourcing', 'talent management'],
  'talent acquisition': ['recruitment', 'hiring', 'resourcing', 'headhunting'],

  // Project & Analysis
  'project management': ['project delivery', 'programme management', 'project manager', 'pmo'],
  'business analysis': ['business analyst', 'data analysis', 'requirements gathering', 'ba'],
  'data analysis': ['data analytics', 'business intelligence', 'bi', 'reporting', 'data analyst', 'google analytics'],

  // Tech & Systems
  'software development': ['software engineering', 'programming', 'coding', 'development'],
  'software engineering': ['software development', 'programming', 'engineering', 'development'],
  'wms': ['warehouse management system', 'warehouse management', 'warehouse software'],
  'crm': ['customer relationship management', 'salesforce', 'hubspot', 'dynamics'],
  'erp': ['enterprise resource planning', 'sap', 'oracle', 'netsuite'],

  // Sectors
  'b2b': ['business to business', 'b2b sales', 'corporate sales', 'enterprise sales', 'b2b marketing'],
  'b2c': ['business to consumer', 'retail sales', 'consumer sales', 'direct sales', 'b2c marketing'],
  'saas': ['software as a service', 'cloud software', 'subscription software', 'tech sales'],
  'e-commerce': ['ecommerce', 'online retail', 'digital retail', 'online sales'],
  'ecommerce': ['e-commerce', 'online retail', 'digital retail', 'online sales'],
  'retail': ['retail management', 'retail operations', 'store management', 'fmcg'],
  'fmcg': ['retail', 'consumer goods', 'fast moving consumer goods', 'cpg'],
  'hospitality': ['hotels', 'food and beverage', 'f&b', 'restaurant management'],
  'healthcare': ['medical', 'nhs', 'health sector', 'clinical'],

  // Compliance & Safety
  'safety compliance': ['health and safety', 'hse', 'safety management', 'compliance', 'iso'],
  'health and safety': ['safety compliance', 'hse', 'safety management', 'risk assessment'],

  // Customer
  'customer service': ['customer support', 'client services', 'customer success', 'customer relations'],
  'customer success': ['customer service', 'client success', 'customer support', 'account management'],
}

function normalise(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s&]/g, '').replace(/\s+/g, ' ')
}

function getWordArray(str: string): string[] {
  return normalise(str).split(' ').filter(w => w.length > 2)
}

function semanticMatch(candidateKeyword: string, jobSkill: string): boolean {
  const ck = normalise(candidateKeyword)
  const js = normalise(jobSkill)
  if (ck === js) return true
  if (ck.includes(js) || js.includes(ck)) return true
  const ckWords = getWordArray(ck)
  const jsWords = getWordArray(js)
  const jsWordSet = new Set(jsWords)
  const overlap = ckWords.filter(w => jsWordSet.has(w)).length
  const minLen = Math.min(ckWords.length, jsWords.length)
  if (minLen > 0 && overlap / minLen >= 0.5) return true
  const synonymList = SYNONYMS[ck] || []
  if (synonymList.some(s => normalise(s) === js || js.includes(normalise(s)) || normalise(s).includes(js))) return true
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

  const keywordMatches: string[] = []
  let keywordScore = 0
  if (jobSkills.length > 0) {
    for (const jobSkill of jobSkills) {
      for (const candidateKeyword of allCandidateKeywords) {
        if (semanticMatch(candidateKeyword, jobSkill)) {
          if (!keywordMatches.includes(candidateKeyword)) keywordMatches.push(candidateKeyword)
          break
        }
      }
    }
    keywordScore = Math.min(100, Math.round((keywordMatches.length / jobSkills.length) * 100))
  } else {
    keywordScore = 50
  }

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

  let sectorScore = 50
  if (jobSector) {
    const jobSectorNorm = normalise(jobSector)
    const jobSectorWords = getWordArray(jobSectorNorm)
    const sectorMatch = allCandidateKeywords.some((ck: string) => {
      const ckNorm = normalise(ck)
      if (ckNorm.includes(jobSectorNorm) || jobSectorNorm.includes(ckNorm)) return true
      const ckWords = getWordArray(ckNorm)
      const jobSectorWordSet = new Set(jobSectorWords)
      return ckWords.some(w => jobSectorWordSet.has(w))
    })
    sectorScore = sectorMatch ? 100 : 30
  }

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
        locationScore = (jobCity && candidateCity && (jobCity.includes(candidateCity) || candidateCity.includes(jobCity))) ? 100 : 20
      }
    }
  }

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
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorised' })

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await authClient.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Unauthorised' })
    const userId = user.id

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
      .eq('user_id', userId)
      .single()

    if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', userId)

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
      const newStatus = alreadySent ? existingStatus : score >= threshold ? 'shortlist' : 'longlist'

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
