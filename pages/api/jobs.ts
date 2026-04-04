import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ jobs: data })
    }

    if (req.method === 'POST') {
      const { title, company, location, salary, description, required_skills, sector } = req.body
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description required' })
      }
      const { data, error } = await supabase
        .from('jobs')
        .insert({ title, company, location, salary, description, required_skills: required_skills || [], sector, status: 'active' })
        .select()
        .single()
      if (error) throw error
      return res.status(200).json({ job: data })
    }

    if (req.method === 'PATCH') {
      const { jobId, ...updates } = req.body
      if (!jobId) return res.status(400).json({ error: 'jobId required' })
      const { error } = await supabase.from('jobs').update(updates).eq('id', jobId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { jobId } = req.body
      if (!jobId) return res.status(400).json({ error: 'jobId required' })
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
