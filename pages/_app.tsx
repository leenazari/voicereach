import type { AppProps } from 'next/app'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only redirect to dashboard on sign in if we're on the login or signup page
        const path = window.location.pathname
        if (path === '/login' || path === '/signup') {
          window.location.href = '/dashboard'
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Component {...pageProps} />
}
