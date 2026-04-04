import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { buildScriptFromMatch } from '../../lib/voice'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { candidateId, jobTitle, jobSalary } = req.body
    if (!candidateId) return res.status(400).json({ error: 'candidateId required' })

    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })

    const fakeJob = jobTitle ? { title: jobTitle, salary: jobSalary || null, company: null, sector: null } : null
    const updatedCandidate = { ...candidate, job_title: jobTitle || candidate.job_title, job_salary: jobSalary || candidate.job_salary }
    const script = buildScriptFromMatch(updatedCandidate, null, fakeJob)

    return res.status(200).json({ script })
  } catch (err: any) {
    console.error('Preview script error:', err)
    return res.status(500).json({ error: err.message })
  }
}
