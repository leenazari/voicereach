import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { base64, filename, mimeType } = req.body
    if (!base64 || !filename) return res.status(400).json({ error: 'base64 and filename required' })

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (mimeType && !allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type — PNG, JPG, SVG or WebP only' })
    }

    const buffer = Buffer.from(base64, 'base64')

    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large — maximum 2MB' })
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'png'
    const uniqueName = `logo-${user.id}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(uniqueName, buffer, {
        contentType: mimeType || 'image/png',
        upsert: true
      })

    if (error) throw error

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(uniqueName)
    return res.status(200).json({ url: urlData.publicUrl })

  } catch (err: any) {
    console.error('Logo upload error:', err)
    return res.status(500).json({ error: err.message || 'Upload failed' })
  }
}
