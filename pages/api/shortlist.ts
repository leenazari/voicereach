import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase'
import { generateVoiceNote, getAudioSizeMb } from '../../lib/voice'
import { sendVoiceOutreachEmail } from '../../lib/email'

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobTitle, jobSalary } = await req.json()

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 })
    }

    // Fetch candidate
    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Update with job details and move to shortlisted
    const { error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({
        status: 'shortlisted',
        job_title: jobTitle || candidate.job_title,
        job_salary: jobSalary || candidate.job_salary
      })
      .eq('id', candidateId)

    if (updateError) throw updateError

    const updatedCandidate = {
      ...candidate,
      job_title: jobTitle || candidate.job_title,
      job_salary: jobSalary || candidate.job_salary
    }

    // Generate voice note
    const voiceBuffer = await generateVoiceNote(updatedCandidate)
    const sizeMb = getAudioSizeMb(voiceBuffer)

    // Send email with voice note + calendar invite
    const { token } = await sendVoiceOutreachEmail(updatedCandidate, voiceBuffer, sizeMb)

    // Save interview token and update status
    await supabaseAdmin
      .from('candidates')
      .update({
        status: 'voice_sent',
        interview_token: token
      })
      .eq('id', candidateId)

    return NextResponse.json({
      success: true,
      candidateId,
      audioSizeMb: sizeMb,
      underSizeLimit: sizeMb < 2
    })

  } catch (err: any) {
    console.error('Shortlist error:', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
