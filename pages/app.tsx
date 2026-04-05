import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Component {...pageProps} />
}
