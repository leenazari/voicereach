import { Candidate } from './supabase'
import { createClient } from '@supabase/supabase-js'

export function buildScript(candidate: Candidate): string {
  const firstName = candidate.name.split(' ')[0]
  const jobTitle = candidate.job_title || candidate.role_applied

  const expLine = candidate.years_experience > 0
    ? `with your ${candidate.years_experience} years in ${candidate.role_applied}`
    : `with your background in ${candidate.role_applied}`

  const salaryLine = candidate.job_salary
    ? ` It is paying ${formatSalary(candidate.job_salary)} and`
    : ' And'

  return `Hi ${firstName}, I hope you are well. We have just had a ${jobTitle} position come in and honestly, we think it is perfect for you. ${expLine}, you are exactly what this client is looking for.${salaryLine} we think you would absolutely nail it. I have created a personal interview link just for you. If you click it, you can actually interview for this ${jobTitle} role right now. The interview takes less than ten minutes and you can do it straight away. Time is limited on this one though, so do not leave it too long. If now is not the right time, no problem at all. You can schedule the interview yourself for later today or tomorrow. But honestly ${firstName}, they are actively looking and you look perfect for this role. Click the link, do the interview, and let us get you this job.`
}

export function formatSalary(salary: string): string {
  return salary
    .replace('£', '')
    .replace('$', '')
    .replace('€', '')
    .trim()
    .replace(/(\d{1,3}),000,000/, '$1 million pounds')
    .replace(/(\d{1,3}),000/, '$1 thousand pounds')
}

async function getVoiceId(): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'voice_id')
      .single()
    return data?.value || process.env.ELEVENLABS_VOICE_ID || 'P4DhdyNCB4Nl6MA0sL45'
  } catch {
    return process.env.ELEVENLABS_VOICE_ID || 'P4DhdyNCB4Nl6MA0sL45'
  }
}

export async function generateVoiceNote(candidate: Candidate): Promise<Buffer> {
  const script = buildScript(candidate)
  const voiceId = await getVoiceId()

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.65,
        style: 0.25,
        use_speaker_boost: false
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs error: ${error}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const sizeMb = buffer.length / (1024 * 1024)
  if (sizeMb > 2) {
    console.warn(`Voice note for ${candidate.name} is ${sizeMb.toFixed(2)}mb — over 2mb limit`)
  }

  return buffer
}

export function getAudioSizeMb(buffer: Buffer): number {
  return Math.round((buffer.length / (1024 * 1024)) * 100) / 100
}
