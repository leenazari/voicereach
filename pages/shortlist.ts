import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { generateVoiceNote, getAudioSizeMb } from '../../../lib/voice'
import { sendVoiceOutreachEmail } from '../../../lib/email'

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobTitle, jobSalary } = await req.json()

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 })
    }

    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({
        status: 'shortlisted',
        job_title: jobTitle || candidate.job_title,
        job_salary: jobSalary || candidate.job_salary
      })
      .eq('id', candidateId)

    if (updateError) throw updateErro
