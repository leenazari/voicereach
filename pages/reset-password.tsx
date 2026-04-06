import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function ResetPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState<'request' | 'update'>('request')

  useEffect(() => {
    // If user lands here with a recovery token in the URL, switch to update mode
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
    const type = hashParams.get('type')
    if (type === 'recovery') {
      setMode('update')
    }
  }, [])

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Check your email — we have sent you a password reset link.')
    }
    setLoading(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password updated successfully. Redirecting you to the dashboard...')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
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
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
            {mode === 'request' ? 'Reset your password' : 'Choose a new password'}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

          {mode === 'request' ? (
            <form onSubmit={handleRequest}>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
                Enter your email address and we will send you a link to reset your password.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  style={inputStyle}
                />
              </div>
              {error && (
                <div style={{ fontSize: 13, color: '#E24B4A', marginBottom: 14, background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 12px' }}>{error}</div>
              )}
              {success && (
                <div style={{ fontSize: 13, color: '#1D9E75', marginBottom: 14, background: '#f0fdf8', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 12px' }}>{success}</div>
              )}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdate}>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
                Choose a new password for your account.
              </p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={inputStyle}
                />
              </div>
              {error && (
                <div style={{ fontSize: 13, color: '#E24B4A', marginBottom: 14, background: '#fff8f8', border: '1px solid #fdd', borderRadius: 8, padding: '10px 12px' }}>{error}</div>
              )}
              {success && (
                <div style={{ fontSize: 13, color: '#1D9E75', marginBottom: 14, background: '#f0fdf8', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 12px' }}>{success}</div>
              )}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
            <a href="/login" style={{ color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Powered by VoiceReach · voicereach.co.uk
        </div>
      </div>
    </div>
  )
}
