import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { candidateId } = req.body
  if (!candidateId) return res.status(400).json({ error: 'candidateId required' })

  try {
    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('id, voice_note_path, voice_note_expires_at')
      .eq('id', candidateId)
      .eq('user_id', user.id)
      .single()

    if (error || !candidate) return res.status(404).json({ error: 'Candidate not found' })
    if (!candidate.voice_note_path) return res.status(200).json({ url: null })

    // Check if voice note has been deleted (past 30 day expiry)
    if (candidate.voice_note_expires_at && new Date(candidate.voice_note_expires_at) < new Date()) {
      return res.status(200).json({ url: null, expired: true })
    }

    // Generate fresh 30-day signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from('voice-notes')
      .createSignedUrl(candidate.voice_note_path, 60 * 60 * 24 * 30)

    if (signedError || !signedData?.signedUrl) {
      return res.status(500).json({ error: 'Could not generate signed URL' })
    }

    // Save the refreshed URL back to the candidate
    await supabase
      .from('candidates')
      .update({ voice_note_url: signedData.signedUrl })
      .eq('id', candidate.id)

    return res.status(200).json({ url: signedData.signedUrl })

  } catch (err: any) {
    console.error('Refresh voice URL error:', err)
    return res.status(500).json({ error: err.message || 'Failed' })
  }
}
