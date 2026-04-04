import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        }
      })
      const data = await response.json()
      
      // Filter to only show voices in the SalesVoice category/collection
      const filtered = (data.voices || []).filter((v: any) => {
        const category = v.category?.toLowerCase() || ''
        const labels = JSON.stringify(v.labels || {}).toLowerCase()
        const name = v.name?.toLowerCase() || ''
        return category.includes('salesvoice') || labels.includes('salesvoice') || name.includes('salesvoice')
      })

      // If no matches found, try filtering by collection name
      const voices = filtered.length > 0 ? filtered : (data.voices || []).filter((v: any) => 
        v.name?.toLowerCase().includes('sales')
      )

      return res.status(200).json({ voices })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { voiceId } = req.body
      if (!voiceId) return res.status(400).json({ error: 'voiceId required' })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      await supabase.from('settings').upsert({ key: 'voice_id', value: voiceId })
      return res.status(200).json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
