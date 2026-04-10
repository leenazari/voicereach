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

function cleanCompanyName(name: string): string {
  if (!name) return name
  return name
    .replace(/\b(ltd|limited|plc|llp|llc|inc|incorporated|group limited|holdings limited|holdings ltd|& co ltd|& co limited|& co|co ltd)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/,\s*$/, '')
    .trim()
}

function trimToSixtySeconds(script: string): string {
  const words = script.split(' ')
  if (words.length <= 180) return script

  const trimmed = words.slice(0, 180).join(' ')
  const sentenceEnd = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('? ')
  )

  if (sentenceEnd > 120) {
    return trimmed.substring(0, sentenceEnd + 1).trim()
  }

  return trimmed + '.'
}

function sanitiseForVoice(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/#+/g, '')
    .replace(/`/g, '')
    .replace(/"/g, '')
    .replace(/\u201C/g, '')
    .replace(/\u201D/g, '')
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/—/g, ',')
    .replace(/–/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
}

function pick(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)]
}

const OPENER_VARIANTS = [
  `I have literally just seen your CV and I had to reach out straight away because I have got something really exciting for you.`,
  `I have just been looking through your profile and honestly I could not wait to get in touch because I think I have got something brilliant for you.`,
  `I came across your CV today and something immediately jumped out at me because I have got a role that I think is a genuinely great fit for you.`,
  `I have just been reviewing some profiles and yours stopped me in my tracks because I have got an opportunity I really think you need to hear about.`
]

const FIT_VARIANTS = [
  `and I think you would absolutely love it.`,
  `and I genuinely think this could be a brilliant move for you.`,
  `and from what I can see this really does look like a great fit.`,
  `and I think this one could be right up your street.`
]

const URGENCY_VARIANTS = [
  `Now listen, interviews have already started on this one and I really want to get you on that list as quickly as possible.`,
  `Now I do want to be upfront with you, they have already started interviewing and I want to make sure you do not miss out.`,
  `I will be straight with you, this one is moving fast and they have already started seeing people, so I want to get you in front of them quickly.`,
  `I want to be honest with you, interviews are already underway on this and I really do not want you to miss your chance.`
]

const INTERVIEW_LINK_VARIANTS = [
  `The link I have just sent you in this email is your actual interview for this job. Not a call with me, not a pre-screen, the real thing. You click it and you are straight in.`,
  `The link in this email takes you straight to your interview for this role. This is not a pre-screen or a chat with me, this is the actual interview. One click and you are in.`,
  `What I have sent you is a direct link to your interview. Not a registration form, not a call with a consultant, your real interview. Click it and you are straight into the process.`,
  `The link in this email is your interview. Not a pre-screen, not a form to fill in, the actual interview for this job. Click it and you are straight in.`
]

const INTEREST_VARIANTS = [
  `As you can imagine there has been a huge amount of interest in this role and the interview spaces are filling up fast.`,
  `There has been a really strong response to this one and they are moving through candidates quickly.`,
  `This role has had a lot of attention and they are making decisions fast so timing really does matter here.`,
  `A lot of strong candidates have already applied for this and they are not hanging around with their decisions.`
]

const CLOSER_VARIANTS = [
  `Get in there today, do your interview, and I am really confident that with your skills and background you are exactly what they are looking for. Go and get it!`,
  `Get in there today and show them what you can do. I genuinely think you are exactly what they need. Go and get it!`,
  `Do not wait on this one. Get your interview done today and I am confident you will impress them. Go and get it!`,
  `Jump in today, do your interview and back yourself. With your background I really think this could be yours. Go on, get in there!`
]

async function generateKeywordMatchLine(
  keywords: string[],
  jobTitle: string,
  firstName: string,
  lastEmployer: string | null,
  yearsExperience: number
): Promise<string> {
  if (!keywords || keywords.length === 0) return ''

  const top3 = keywords.slice(0, 3)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are writing one sentence for a recruiter voice note to a candidate. The sentence must naturally describe why the candidate's matched skills make them perfect for this job. Write it in second person (you/your). Make it sound warm, specific and conversational — like a recruiter who genuinely read their CV and is excited about the match. Do not list the keywords mechanically. Weave them into a natural description of what the candidate has done and why it fits.

Job title: ${jobTitle}
Candidate's matched keywords: ${top3.join(', ')}
Last employer: ${lastEmployer || 'not specified'}
Years experience: ${yearsExperience || 'not specified'}

Rules:
- One sentence only, no more than 35 words
- Second person (you/your) throughout
- No em dashes
- No markdown
- No lists
- Must end with a full stop
- Sound like spoken English not written English
- Reference what they have DONE not just what they know
- Connect it to why the job needs exactly that

Return only the sentence, nothing else.`
        }]
      })
    })

    const data = await response.json()
    if (!response.ok) return ''

    const text = data.content?.[0]?.text || ''
    return sanitiseForVoice(text.trim())

  } catch {
    return ''
  }
}

export async function buildScriptFromMatchAsync(candidate: Candidate, matchData: any, job: any): Promise<string> {
  const firstName = candidate.name.split(' ')[0]
  const jobTitle = job?.title || candidate.job_title || candidate.role_applied
  const rawCompany = job?.company || null
  const cleanedCompany = rawCompany ? cleanCompanyName(rawCompany) : null
  const company = cleanedCompany ? `at ${cleanedCompany}` : ''
  const sector = job?.sector ? `in the ${job.sector} space` : ''

  const salaryLine = (job?.salary || candidate.job_salary)
    ? `, paying ${formatSalary(job?.salary || candidate.job_salary)},`
    : ','

  const rawLastEmployer = (candidate as any).last_employer || null
  const cleanedLastEmployer = rawLastEmployer ? cleanCompanyName(rawLastEmployer) : null

  const employerLine = cleanedLastEmployer
    ? `your experience at ${cleanedLastEmployer}`
    : candidate.years_experience > 0
      ? `your ${candidate.years_experience} years of experience`
      : `your background`

  const candidateLocation = (candidate as any).location || ''
  const jobLocation = job?.location || ''
  let locationLine = ''
  if (candidateLocation && jobLocation) {
    const candCity = candidateLocation.split(',')[0].toLowerCase().trim()
    const jobCity = jobLocation.split(',')[0].toLowerCase().trim()
    if (candCity && jobCity && (candCity.includes(jobCity) || jobCity.includes(candCity))) {
      locationLine = `You are already based in ${candidateLocation.split(',')[0].trim()} which makes this even more straightforward.`
    }
  }

  const matchedKeywords: string[] = matchData?.keyword_matches || (candidate as any).strength_keywords || []

  const keywordMatchLine = await generateKeywordMatchLine(
    matchedKeywords,
    jobTitle,
    firstName,
    cleanedLastEmployer,
    candidate.years_experience || 0
  )

  let hookLine = matchData?.pitch_hook || `with your background you are exactly what this client is looking for`

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

  hookLine = sanitiseForVoice(hookLine)

  const opener = pick(OPENER_VARIANTS)
  const fitLine = pick(FIT_VARIANTS)
  const urgency = pick(URGENCY_VARIANTS)
  const interviewLink = pick(INTERVIEW_LINK_VARIANTS)
  const interest = pick(INTEREST_VARIANTS)
  const closer = pick(CLOSER_VARIANTS)

  const script = `Hi ${firstName}... I hope you are having a brilliant day! ${opener} We have got an amazing ${jobTitle} role ${company}${salaryLine} and honestly ${firstName}, ${hookLine}. ${keywordMatchLine ? keywordMatchLine + ' ' : ''}${employerLine} makes you such a strong fit for what they need ${sector} ${fitLine} ${locationLine ? locationLine + ' ' : ''}${urgency} ${interviewLink} ${interest} They are going to make a decision very quickly so please do not sit on this one ${firstName}. ${closer}`

  return trimToSixtySeconds(script)
}

export function buildScriptFromMatch(candidate: Candidate, matchData: any, job: any): string {
  const firstName = candidate.name.split(' ')[0]
  const jobTitle = job?.title || candidate.job_title || candidate.role_applied
  const rawCompany = job?.company || null
  const cleanedCompany = rawCompany ? cleanCompanyName(rawCompany) : null
  const company = cleanedCompany ? `at ${cleanedCompany}` : ''
  const sector = job?.sector ? `in the ${job.sector} space` : ''

  const salaryLine = (job?.salary || candidate.job_salary)
    ? `, paying ${formatSalary(job?.salary || candidate.job_salary)},`
    : ','

  const rawLastEmployer = (candidate as any).last_employer || null
  const cleanedLastEmployer = rawLastEmployer ? cleanCompanyName(rawLastEmployer) : null

  const employerLine = cleanedLastEmployer
    ? `your experience at ${cleanedLastEmployer}`
    : candidate.years_experience > 0
      ? `your ${candidate.years_experience} years of experience`
      : `your background`

  let hookLine = matchData?.pitch_hook || `with your background you are exactly what this client is looking for`

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

  hookLine = sanitiseForVoice(hookLine)

  const opener = pick(OPENER_VARIANTS)
  const fitLine = pick(FIT_VARIANTS)
  const urgency = pick(URGENCY_VARIANTS)
  const interviewLink = pick(INTERVIEW_LINK_VARIANTS)
  const interest = pick(INTEREST_VARIANTS)
  const closer = pick(CLOSER_VARIANTS)

  const script = `Hi ${firstName}... I hope you are having a brilliant day! ${opener} We have got an amazing ${jobTitle} role ${company}${salaryLine} and honestly ${firstName}, ${hookLine}. ${employerLine} makes you such a strong fit for what they need ${sector} ${fitLine} ${urgency} ${interviewLink} ${interest} They are going to make a decision very quickly so please do not sit on this one ${firstName}. ${closer}`

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

export async function generateVoiceNoteFromMatch(candidate: Candidate, matchData: any, job: any, customScript?: string): Promise<{ buffer: Buffer, script: string }> {
  const script = customScript || await buildScriptFromMatchAsync(candidate, matchData, job)
  const buffer = await generateAudio(script)

  const sizeMb = buffer.length / (1024 * 1024)
  if (sizeMb > 2) {
    console.warn(`Voice note for ${candidate.name} is ${sizeMb.toFixed(2)}mb — over 2mb limit`)
  }

  return { buffer, script }
}

export async function generateVoiceNote(candidate: Candidate): Promise<{ buffer: Buffer, script: string }> {
  const script = buildScript(candidate)
  const buffer = await generateAudio(script)

  const sizeMb = buffer.length / (1024 * 1024)
  if (sizeMb > 2) {
    console.warn(`Voice note for ${candidate.name} is ${sizeMb.toFixed(2)}mb — over 2mb limit`)
  }

  return { buffer, script }
}

export function getAudioSizeMb(buffer: Buffer): number {
  return Math.round((buffer.length / (1024 * 1024)) * 100) / 100
}
