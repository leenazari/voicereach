import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { messages } = req.body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'chatbot_knowledge')
      .single()

    const knowledge = setting?.value || 'You are Natalie, a helpful assistant for VoiceReach.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `You are Natalie, a friendly and enthusiastic sales assistant for VoiceReach — an AI-powered voice outreach platform built for recruiters.

Your job is to answer questions about VoiceReach and encourage people to sign up for a free account. Be warm, concise and conversational. Never use bullet points or long lists — keep responses to 2-3 short sentences max. No markdown formatting.

Always end responses by gently nudging towards signing up with phrases like "Want to try it with your first 3 credits free?" or "You can see for yourself — no card needed."

Here is your knowledge base — use this to answer all questions accurately:

${knowledge}`,
        messages
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'API error')

    return res.status(200).json({ reply: data.content?.[0]?.text || 'Sorry, something went wrong.' })

  } catch (err: any) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: err.message || 'Failed' })
  }
}
