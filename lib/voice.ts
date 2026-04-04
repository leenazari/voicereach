import { Candidate } from './supabase'
import { createClient } from '@supabase/supabase-js'

export function buildScript(candidate: Candidate): string {
  const firstName = candidate.name.split(' ')[0]
  const jobTitle = candidate.job_title || candidate.role_applied

  const expLine = candidate.years_experience > 0
    ? `${candidate.years_experience} years in ${candidate.role_applied}`
    : `your background in ${candidate.role_applied}`

  const salaryLine = candidate.job_salary
    ? `, paying ${formatSalary(candidate.job_salary)},`
    : ','

  return `Hi ${firstName}... I hope you are well today. I have just had your CV come across my desk and the timing is perfect. We have a brand new ${jobTitle} role${salaryLine} and honestly, with your ${expLine}, you are exactly what this client is looking for. I think this could be a brilliant move for you. Now here is the exciting part... I have created a personal interview link just for you. You can actually do the interview right now, it takes less than ten minutes, and you can fit it around your day. But do not leave it too long ${firstName}, this one is moving fast and they are ready to hire. Click the link in this email, do the interview, and let us get you this job. I genuinely think you are perfect for it.`
}

export function formatSalary(salary: string): string {
  const cleaned = salary
    .replace(/[£$€]/g, '')
    .replace(/,/g, '')
    .trim()

  const num = parseInt(cleaned)
  if (isNaN(num)) return salary

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000)
    const remainder = num % 1000000
    if (remainder === 0) return `${millions} million pounds`
    const thousands = Math.floor(remainder / 1000)
    const hundreds = remainder % 1000
    if (hundreds === 0) return `${millions} million ${thousands} thousand pounds`
    return `${millions} million ${thousands} thousand ${numberToWords(hundreds)} pounds`
  }

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000)
    const remainder = num % 1000
    if (remainder === 0) return `${thousands} thousand pounds`
    return `${thousands} thousand ${numberToWords(remainder)} pounds`
  }

  return `${numberToWords(num)} pounds`
}

function numberToWords(n: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  if (n < 20) return ones[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return o === 0 ? tens[t] : `${tens[t]} ${ones[o]}`
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const remainder = n % 100
    if (remainder === 0) return `${ones[h]} hundred`
    return `${ones[h]} hundred and ${numberToWords(remainder)}`
  }
  return n.toString()
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
        stability: 0.3,
        similarity_boost: 0.6,
        style: 0.4,
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
