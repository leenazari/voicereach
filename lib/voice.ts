import { Candidate } from './supabase'

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

export function buildScript(candidate: Candidate): string {
  const firstName = candidate.name.split(' ')[0]

  const expLine = candidate.years_experience > 0
    ? `your ${candidate.years_experience} years in ${candidate.role_applied}`
    : `your background in ${candidate.role_applied}`

  const salaryLine = candidate.job_salary
    ? ` at ${formatSalary(candidate.job_salary)}`
    : ''

  return `Hi ${firstName}, we have just seen your CV and ${expLine} is exactly what we need for this ${candidate.job_title || candidate.role_applied} role${salaryLine}. Click the interview link in this email whenever suits you and we will get something booked in. Looking forward to hearing from you soon.`
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

export async function generateVoiceNote(candidate: Candidate): Promise<Buffer> {
  const script = buildScript(candidate)

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
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
        stability: 0.5,
        similarity_boost: 0.75
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
