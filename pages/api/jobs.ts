import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

async function getUserId(req: NextApiRequest): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return null
    const { data: { user } } = await supabase.auth.getUser(token)
    return user?.id || null
  } catch { return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorised' })

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ jobs: data })
    }

    if (req.method === 'POST') {
      const { title, company, location, salary, description, required_skills, sector, status, logo_url, closes_at, work_type, match_priority, match_threshold } = req.body
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' })
      }
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          title,
          company: company || null,
          location: location || null,
          salary: salary || null,
          description,
          required_skills: required_skills || [],
          sector: sector || null,
          status: status || 'active',
          logo_url: logo_url || null,
          closes_at: closes_at || null,
          work_type: work_type || 'office',
          match_priority: match_priority || 'skills',
          match_threshold: match_threshold || 70,
          user_id: userId
        })
        .select()
        .single()
      if (error) throw error
      return res.status(200).json({ job: data })
    }

    if (req.method === 'PATCH') {
      const { jobId, ...updates } = req.body
      if (!jobId) return res.status(400).json({ error: 'jobId required' })
      // Ensure user owns this job
      const { data: job } = await supabase.from('jobs').select('user_id').eq('id', jobId).single()
      if (!job || job.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })
      const { error } = await supabase.from('jobs').update(updates).eq('id', jobId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { jobId } = req.body
      if (!jobId) return res.status(400).json({ error: 'jobId required' })
      const { data: job } = await supabase.from('jobs').select('user_id').eq('id', jobId).single()
      if (!job || job.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })
      const { error } = await supabase.from('jobs').delete().eq('id', jobId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('Jobs API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
