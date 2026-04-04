import { Candidate } from './supabase'

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'P4DhdyNCB4Nl6MA0sL45'

export function buildScript(candidate: Candidate): string {
  const firstName = candidate.name.split(' ')[0]

  const expLine = candidate.years_experience > 0
    ? `${candidate.years_experience} years in ${candidate.role_applied}`
    : `your background in ${candidate.role_applied}`

  const salaryLine = candidate.job_salary
    ? ` paying ${formatSalary(candidate.job_salary)}`
    : ''

  return `Hi ${firstName}, this is a personal message just for you. We have been looking at your CV and your ${expLine} is exactly what our client needs. We have got a brilliant ${candidate.job_title || candidate.role_applied} opportunity${salaryLine} and honestly, you would be perfect for it. All I need you to do is click the interview link in this email. It only takes a few minutes and it could be the best career move you make this year. We would love to hear from you.`
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
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true
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
