import { ElevenLabsClient } from 'elevenlabs'
import { Candidate } from './supabase'

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!
})

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

export function buildScript(candidate: Candidate): string {
  const firstName = candidate.name.split(' ')[0]
  const expLine = candidate.years_experience > 0
    ? `We can see you've got ${candidate.years_experience} years of experience in ${candidate.role_applied}`
    : `We've had a look at your background in ${candidate.role_applied}`

  return `Hi ${firstName}, hope you're doing well. We've just received your CV and we're really impressed. ${expLine}, which is exactly what we're looking for. We've got a ${candidate.job_title || candidate.role_applied} position available${candidate.job_salary ? ` with a salary of ${candidate.job_salary}` : ''}. I think this could be a brilliant opportunity for you. I've included a 24-hour interview link in this email — click it whenever suits you and you can schedule it straight into your calendar. Looking forward to hearing from you soon.`
}

export async function generateVoiceNote(candidate: Candidate): Promise<Buffer> {
  const script = buildScript(candidate)

  const audio = await client.generate({
    voice: VOICE_ID,
    text: script,
    model_id: 'eleven_turbo_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  })

  const chunks: Buffer[] = []
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk))
  }

  const buffer = Buffer.concat(chunks)

  // Warn if over 2mb
  const sizeMb = buffer.length / (1024 * 1024)
  if (sizeMb > 2) {
    console.warn(`Voice note for ${candidate.name} is ${sizeMb.toFixed(2)}mb — over 2mb limit`)
  }

  return buffer
}

export function getAudioSizeMb(buffer: Buffer): number {
  return Math.round((buffer.length / (1024 * 1024)) * 100) / 100
}
