import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
