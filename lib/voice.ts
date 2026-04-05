import { Candidate } from './supabase'
import { createClient } from '@supabase/supabase-js'

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

function trimToSixtySeconds(script: string): string {
  const words = script.split(' ')
  if (words.length <= 140) return script

  const trimmed = words.slice(0, 140).join(' ')
  const sentenceEnd = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('? ')
  )

  if (sentenceEnd > 80) {
    return trimmed.substring(0, sentenceEnd + 1).trim()
  }

  return trimmed + '.'
}

export function buildScriptFromMatch(candidate: Candidate, matchData: any, job: any): string {
  const firstName = candidate.name.split(' ')[0]
  const jobTitle = job?.title || candidate.job_title || candidate.role_applied
  const company = job?.company ? `at ${job.company}` : ''
  const sector = job?.sector ? `in the ${job.sector} space` : ''

  const salaryLine = (job?.salary || candidate.job_salary)
    ? `, paying ${formatSalary(job?.salary || candidate.job_salary)},`
    : ','

  const employerLine = (candidate as any).last_employer
    ? `your experience at ${(candidate as any).last_employer}`
    : candidate.years_experience > 0
      ? `your ${candidate.years_experience} years of experience`
      : `your background`

  // Use pitch hook only — no matchLine to avoid repetition
  let hookLine = matchData?.pitch_hook || `with your background, you are exactly what this client is looking for`
  hookLine = hookLine
    .replace(new RegExp(`${firstName}\\s+has`, 'gi'), 'you have')
    .replace(new RegExp(`${firstName}\\s+is`, 'gi'), 'you are')
    .replace(new RegExp(`${firstName}\\'s`, 'gi'), 'your')
    .replace(new RegExp(`\\bhe has\\b`, 'gi'), 'you have')
    .replace(new RegExp(`\\bshe has\\b`, 'gi'), 'you have')
    .replace(new RegExp(`\\bhe is\\b`, 'gi'), 'you are')
    .replace(new RegExp(`\\bshe is\\b`, 'gi'), 'you are')
    .replace(new RegExp(`\\bhis `, 'gi'), 'your ')
    .replace(new RegExp(`\\bher `, 'gi'), 'your ')
    .replace(new RegExp(`\\bthey have\\b`, 'gi'), 'you have')
    .replace(/with your \d+ years (of experience|experience)/gi, 'with your background')
    .replace(/your \d+ years (of experience|experience) in [^,\.]+,?\s*/gi, '')

  const urgencyLine = matchData?.urgency_line || `this one is moving fast and they are ready to hire`

  const script = `Hi ${firstName}... I hope you are well today. I have just had your CV come across my desk and the timing is perfect. We have a brand new ${jobTitle} role ${company}${salaryLine} and honestly, ${hookLine}. ${employerLine} makes you a brilliant fit for what they need ${sector}. I have created a personal interview link just for you — you can do the interview right now, it takes less than ten minutes and fits around your day. But do not leave it too long ${firstName}, ${urgencyLine}. Click the link below, do the interview, and let us get you this job.`

  return trimToSixtySeconds(script)
}

export function buildScript(candidate: Candidate): string {
  return buildScriptFromMatch(candidate, null, null)
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

async function generateAudio(script: string): Promise<Buffer> {
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
  return Buffer.from(arrayBuffer)
}

export async function generateVoiceNoteFromMatch(candidate: Candidate, matchData: any, job: any, customScript?: string): Promise<Buffer> {
  const script = customScript || buildScriptFromMatch(candidate, matchData, job)
  const buffer = await generateAudio(script)

  const sizeMb = buffer.length / (1024 * 1024)
  if (sizeMb > 2) {
    console.warn(`Voice note for ${candidate.name} is ${sizeMb.toFixed(2)}mb — over 2mb limit`)
  }

  return buffer
}

export async function generateVoiceNote(candidate: Candidate): Promise<Buffer> {
  const script = buildScript(candidate)
  const buffer = await generateAudio(script)

  const sizeMb = buffer.length / (1024 * 1024)
  if (sizeMb > 2) {
    console.warn(`Voice note for ${candidate.name} is ${sizeMb.toFixed(2)}mb — over 2mb limit`)
  }

  return buffer
}

export function getAudioSizeMb(buffer: Buffer): number {
  return Math.round((buffer.length / (1024 * 1024)) * 100) / 100
}
