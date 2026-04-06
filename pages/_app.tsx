import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore SIGNED_OUT during OAuth callback — the hash contains the token
      if (event === 'SIGNED_OUT') {
        const hash = window.location.hash
        const params = new URLSearchParams(window.location.search)
        const isOAuthCallback = hash.includes('access_token') || params.has('code')
        if (!isOAuthCallback) {
          window.location.href = '/login'
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Component {...pageProps} />
}
