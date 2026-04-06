import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only redirect on explicit sign out — ignore SIGNED_OUT during OAuth redirects
      if (event === 'SIGNED_OUT' && !window.location.href.includes('code=')) {
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Component {...pageProps} />
}
