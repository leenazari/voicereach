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
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ candidates: data })
    }

    if (req.method === 'POST') {
      const { name, email, phone, role_applied, experience_summary, years_experience, skills, last_employer, location, candidate_summary, qualifications, all_employers } = req.body
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
          all_employers: all_employers || []
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
              all_employers: all_employers || []
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
      const { candidateId, status, name, email, phone, role_applied, experience_summary, years_experience, job_title, job_salary, last_employer, location, candidate_summary, qualifications, all_employers, skills } = req.body
      if (!candidateId) return res.status(400).json({ error: 'candidateId required' })
      const updates: any = {}
      if (status !== undefined) updates.status = status
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
      const { error } = await supabase.from('candidates').update(updates).eq('id', candidateId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { candidateId } = req.body
      if (!candidateId) return res.status(400).json({ error: 'candidateId required' })
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
