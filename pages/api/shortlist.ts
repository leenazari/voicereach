import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { generateVoiceNote, getAudioSizeMb } from '../../lib/voice'
import { sendVoiceOutreachEmail } from '../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { candidateId, jobTitle, jobSalary } = req.body

    if (!candidateId) {
      return res.status(400).json({ error: 'candidateId required' })
    }

    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (fetchError || !candidate) {
      return res.status(404).json({ error: 'Candidate not found' })
    }

    await supabase
      .from('candidates')
      .update({
        status: 'shortlisted',
        job_title: jobTitle || candidate.job_title,
        job_salary: jobSalary || candidate.job_salary
      })
      .eq('id', candidateId)

    const updatedCandidate = {
      ...candidate,
      job_title: jobTitle || candidate.job_title,
      job_salary: jobSalary || candidate.job_salary
    }

    const voiceBuffer = await generateVoiceNote(updatedCandidate)
    const sizeMb = getAudioSizeMb(voiceBuffer)

    const { token } = await sendVoiceOutreachEmail(updatedCandidate, voiceBuffer, sizeMb)

    await supabase
      .from('candidates')
      .update({
        status: 'voice_sent',
        interview_token: token
      })
      .eq('id', candidateId)

    return res.status(200).json({
      success: true,
      candidateId,
      audioSizeMb: sizeMb,
      underSizeLimit: sizeMb < 2
    })

  } catch (err: any) {
    console.error('Shortlist error:', err)
    return res.status(500).json({ error: err.message || 'Failed' })
  }
}
