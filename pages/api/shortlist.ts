import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { generateVoiceNoteFromMatch, getAudioSizeMb } from '../../lib/voice'
import { sendVoiceOutreachEmail } from '../../lib/email'

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

    const { candidateId, jobId, jobTitle, jobSalary, customScript } = req.body
    if (!candidateId) return res.status(400).json({ error: 'candidateId required' })

    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !candidate) return res.status(404).json({ error: 'Candidate not found' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_used, credits_limit')
      .eq('id', userId)
      .single()

    if (profile && profile.credits_limit !== 999999 && profile.credits_used >= profile.credits_limit) {
      return res.status(403).json({ error: 'Credit limit reached. Please upgrade your plan.' })
    }

    let matchData = null
    let job = null

    if (jobId) {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).eq('user_id', userId).single()
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

    const { buffer: voiceBuffer, script: generatedScript } = await generateVoiceNoteFromMatch(
      updatedCandidate,
      matchData,
      job,
      customScript
    )

    const sizeMb = getAudioSizeMb(voiceBuffer)
    const fileName = `${userId}/${candidateId}-${Date.now()}.mp3`

    const { error: uploadError } = await supabase.storage
      .from('voice-notes')
      .upload(fileName, voiceBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (uploadError) throw uploadError

    // Generate a signed URL that expires in 7 days
    const { data: signedData, error: signedError } = await supabase.storage
      .from('voice-notes')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7)

    if (signedError || !signedData?.signedUrl) throw new Error('Could not generate signed URL')

    const voiceNoteUrl = signedData.signedUrl

    const { token: interviewToken } = await sendVoiceOutreachEmail(updatedCandidate, voiceNoteUrl, voiceBuffer, sizeMb)

    await supabase
      .from('candidates')
      .update({
        status: 'voice_sent',
        interview_token: interviewToken,
        voice_note_url: voiceNoteUrl,
        voice_note_path: fileName,
        last_script: generatedScript,
        last_script_at: new Date().toISOString()
      })
      .eq('id', candidateId)

    if (profile) {
      await supabase
        .from('profiles')
        .update({ credits_used: profile.credits_used + 1 })
        .eq('id', userId)
    }

    return res.status(200).json({
      success: true,
      candidateId,
      audioSizeMb: sizeMb,
      underSizeLimit: sizeMb < 2,
      voiceNoteUrl,
      script: generatedScript
    })

  } catch (err: any) {
    console.error('Shortlist error:', err)
    return res.status(500).json({ error: err.message || 'Failed' })
  }
}
