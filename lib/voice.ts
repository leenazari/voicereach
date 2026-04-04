import { Candidate } from './supabase'

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

export function buildScript(candidate: Candidate): string {
  const firstName = candidate.name.split(' ')[0]

  const expLine = candidate.years_experience > 0
    ? `We can see you have got ${candidate.years_experience} years of experience in ${candidate.role_applied}`
    : `We have had a look at your background in ${candidate.role_applied}`

  const formatSalary = (salary: string) => {
    return salary
      .replace('£', '')
      .replace('$', '')
      .replace('€', '')
      .trim()
      .replace(/(\d{1,3})(,000)$/, '$1 thousand')
      .replace(/(\d{1,3})(,000,000)$/, '$1 million')
  }

  const salaryLine = candidate.job_salary
    ? `The salary for this role is ${formatSalary(candidate.job_salary)} pounds and we think it could be a brilliant fit for you.`
    : `We think this could be a brilliant fit for you.`

  return `Hi ${firstName}, hope you are doing well. We have just received your CV and we are really impressed. ${expLine}, which is exactly what we are looking for. We have got a ${candidate.job_title || candidate.role_applied} position available. ${salaryLine} I have included a 24 hour interview link in this email. Click it whenever suits you and you can schedule it straight into your calendar. Looking forward to hearing from you soon.`
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
      model_id: 'eleven_turbo_v2',
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
