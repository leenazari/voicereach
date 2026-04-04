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
      const { name, email, phone, role_applied, experience_summary, years_experience, skills } = req.body

      if (!name || !email || !role_applied || !experience_summary) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const { data, error } = await supabase
        .from('candidates')
        .insert({ 
          name, 
          email, 
          phone, 
          role_applied, 
          experience_summary, 
          years_experience: years_experience || 0, 
          skills: skills || [], 
          status: 'applied' 
        })
        .select()
        .single()

      if (error) {
        // If duplicate email error, insert anyway with a timestamp suffix
        if (error.code === '23505') {
          const { data: data2, error: error2 } = await supabase
            .from('candidates')
            .insert({ 
              name, 
              email: `${email.split('@')[0]}+${Date.now()}@${email.split('@')[1]}`, 
              phone, 
              role_applied, 
              experience_summary, 
              years_experience: years_experience || 0, 
              skills: skills || [], 
              status: 'applied' 
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

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
