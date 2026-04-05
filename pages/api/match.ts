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

