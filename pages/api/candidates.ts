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
        .from('candidates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ candidates: data })
    }

    if (req.method === 'POST') {
      const { name, email, phone, role_applied, experience_summary, years_experience, skills, last_employer, location, candidate_summary, qualifications, all_employers, strength_keywords } = req.body
      if (!name || !email || !role_applied || !experience_summary) {
        return res.status(400).json({ error: 'Missing required fields' })
      }
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          name, email, phone, role_applied, experience_summary,
          years_experience: years_experience || 0,
          skills: skills || [],
          status: 'applied',
          last_employer: last_employer || null,
          location: location || null,
          candidate_summary: candidate_summary || null,
          qualifications: qualifications || [],
          all_employers: all_employers || [],
          strength_keywords: strength_keywords || [],
          user_id: userId
        })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          const { data: data2, error: error2 } = await supabase
            .from('candidates')
            .insert({
              name, email: `${email.split('@')[0]}+${Date.now()}@${email.split('@')[1]}`,
              phone, role_applied, experience_summary,
              years_experience: years_experience || 0,
              skills: skills || [],
              status: 'applied',
              last_employer: last_employer || null,
              location: location || null,
              candidate_summary: candidate_summary || null,
              qualifications: qualifications || [],
              all_employers: all_employers || [],
              strength_keywords: strength_keywords || [],
              user_id: userId
            })
            .select()
            .single()
          if (error2) throw error2
          return res.status(200).json({ candidate: data2 })
        }
        throw error
      }
      return res.status(200).json({ candidate: data })
    }

    if (req.method === 'PATCH') {
      const { candidateId, status, name, email, phone, role_applied, experience_summary, years_experience, job_title, job_salary, last_employer, location, candidate_summary, qualifications, all_employers, skills, strength_keywords, job_id, pipeline_stage } = req.body
      if (!candidateId) return res.status(400).json({ error: 'candidateId required' })
      // Ensure user owns this candidate
      const { data: candidate } = await supabase.from('candidates').select('user_id').eq('id', candidateId).single()
      if (!candidate || candidate.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })
      const updates: any = {}
      if (status !== undefined) updates.status = status
      if (pipeline_stage !== undefined) updates.pipeline_stage = pipeline_stage
      if (name !== undefined) updates.name = name
      if (email !== undefined) updates.email = email
      if (phone !== undefined) updates.phone = phone
      if (role_applied !== undefined) updates.role_applied = role_applied
      if (experience_summary !== undefined) updates.experience_summary = experience_summary
      if (years_experience !== undefined) updates.years_experience = years_experience
      if (job_title !== undefined) updates.job_title = job_title
      if (job_salary !== undefined) updates.job_salary = job_salary
      if (last_employer !== undefined) updates.last_employer = last_employer
      if (location !== undefined) updates.location = location
      if (candidate_summary !== undefined) updates.candidate_summary = candidate_summary
      if (qualifications !== undefined) updates.qualifications = qualifications
      if (all_employers !== undefined) updates.all_employers = all_employers
      if (skills !== undefined) updates.skills = skills
      if (strength_keywords !== undefined) updates.strength_keywords = strength_keywords
      if (job_id !== undefined) updates.job_id = job_id
      const { error } = await supabase.from('candidates').update(updates).eq('id', candidateId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { candidateId } = req.body
      if (!candidateId) return res.status(400).json({ error: 'candidateId required' })
      const { data: candidate } = await supabase.from('candidates').select('user_id').eq('id', candidateId).single()
      if (!candidate || candidate.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })
      const { error } = await supabase.from('candidates').delete().eq('id', candidateId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
