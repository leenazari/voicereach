import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          prompt: 'select_account'
        }
      }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password. Try again or sign up.' : error.message)
      setLoading(false)
    } else if (data.session) {
      router.push('/dashboard')
    } else {
      setError('Could not sign in. Please try again.')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1px solid #e5e5e5', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 8 }}>
            Voice<span style={{ background: 'linear-gradient(135deg, #667eea, #f093fb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reach</span>
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>Sign in to your account</div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
            <span style={{ fontSize: 12, color: '#ccc' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>

          <form onSubmit={handleEmail}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <a href="/reset-password" style={{ fontSize: 12, color: '#534AB7', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>Forgot password?</a>
            </div>
            {error && <div style={{ fontSize: 13, color: '#E24B4A', marginBottom: 14, background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 12px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
            No account yet?{' '}
            <a href="/signup" style={{ color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>Sign up free</a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Powered by VoiceReach · voicereach.co.uk
        </div>
      </div>
    </div>
  )
}
