import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { generateVoiceNoteFromMatch, getAudioSizeMb } from '../../lib/voice'
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

    const { candidateId, jobId, jobTitle, jobSalary, customScript } = req.body
    if (!candidateId) return res.status(400).json({ error: 'candidateId required' })

    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (fetchError || !candidate) return res.status(404).json({ error: 'Candidate not found' })

    let matchData = null
    let job = null

    if (jobId) {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single()
      job = jobData
      if (job) {
        const matchRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId, jobId })
        })
        const matchResult = await matchRes.json()
        matchData = matchResult.match
      }
    }

    const updatedCandidate = {
      ...candidate,
      job_title: job?.title || jobTitle || candidate.job_title,
      job_salary: job?.salary || jobSalary || candidate.job_salary
    }

    await supabase
      .from('candidates')
      .update({
        status: 'shortlisted',
        job_title: updatedCandidate.job_title,
        job_salary: updatedCandidate.job_salary,
        job_id: jobId || candidate.job_id
      })
      .eq('id', candidateId)

    // Generate voice note — now returns { buffer, script }
    const { buffer: voiceBuffer, script: generatedScript } = await generateVoiceNoteFromMatch(
      updatedCandidate,
      matchData,
      job,
      customScript
    )

    const sizeMb = getAudioSizeMb(voiceBuffer)
    const fileName = `${candidateId}-${Date.now()}.mp3`

    await supabase.storage
      .from('voice-notes')
      .upload(fileName, voiceBuffer, { contentType: 'audio/mpeg', upsert: true })

    const { data: urlData } = supabase.storage.from('voice-notes').getPublicUrl(fileName)
