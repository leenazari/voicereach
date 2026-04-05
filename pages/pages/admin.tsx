import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string
  full_name: string
  role: string
  plan: string
  credits_used: number
  credits_limit: number
  created_at: string
}

const PLAN_COLORS: Record<string, string> = {
  free: '#888',
  starter: '#185FA5',
  growth: '#534AB7',
  agency: '#1D9E75',
  enterprise: '#639922'
}

const PLAN_BG: Record<string, string> = {
  free: '#f0f0f0',
  starter: '#E6F1FB',
  growth: '#EEEDFE',
  agency: '#E1F5EE',
  enterprise: '#EAF3DE'
}

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, free: 0, paid: 0, totalVoiceNotes: 0 })
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [editCredits, setEditCredits] = useState('')
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: string }[]>([])
  const [notifCounter, setNotifCounter] = useState(0)

  useEffect(() => { checkAdminAndLoad() }, [])

  function getSupabase() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async function checkAdminAndLoad() {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (!profile || profile.role !== 'admin') { window.location.href = '/'; return }
    loadData()
  }

  async function loadData() {
    setLoading(true)
    const supabase = getSupabase()
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileData) {
      setProfiles(profileData)
      setStats({
        total: profileData.length,
        free: profileData.filter(p => p.plan === 'free').length,
        paid: profileData.filter(p => p.plan !== 'free').length,
        totalVoiceNotes: profileData.reduce((sum, p) => sum + (p.credits_used || 0), 0)
      })
    }
    setLoading(false)
  }

  function notify(message: string, type = 'success') {
    const id = notifCounter + 1
    setNotifCounter(id)
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  function openEdit(profile: Profile) {
    setEditingUser(profile)
    setEditPlan(profile.plan)
    setEditCredits(profile.credits_limit.toString())
    setEditRole(profile.role)
  }

  async function saveUser() {
    if (!editingUser) return
    setSaving(true)
    const supabase = getSupabase()
    const { error } = await supabase
      .from('profiles')
      .update({
        plan: editPlan,
        credits_limit: parseInt(editCredits) || 3,
        role: editRole
      })
      .eq('id', editingUser.id)

    if (error) notify('Error saving: ' + error.message, 'error')
    else { notify('User updated successfully'); setEditingUser(null); loadData() }
    setSaving(false)
  }

  async function signOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filtered = profiles.filter(p =>
    !search ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => (
          <div key={n.id} style={{ background: n.type === 'success' ? '#1a1a1a' : '#E24B4A', color: 'white', padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{n.type === 'success' ? '✓' : '✕'}</span>{n.message}
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ fontSize: 13, color: '#534AB7', fontWeight: 600, textDecoration: 'none' }}>← Back to dashboard</a>
          <div style={{ width: 1, height: 16, background: '#e5e5e5' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Admin Panel</div>
          <span style={{ fontSize: 11, background: '#fff0ee', color: '#E24B4A', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>Admin only</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 200 }} />
          <button onClick={signOut} style={{ fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total accounts', value: stats.total, color: '#534AB7' },
            { label: 'Free accounts', value: stats.free, color: '#888' },
            { label: 'Paid accounts', value: stats.paid, color: '#1D9E75' },
            { label: 'Voice notes sent', value: stats.totalVoiceNotes, color: '#185FA5' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: '1px solid #ebebeb' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ebebeb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>All users ({filtered.length})</div>
            <button onClick={loadData} style={{ fontSize: 12, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>↺ Refresh</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
                {['User', 'Plan', 'Credits', 'Usage', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#888', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#ccc', fontSize: 13 }}>Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#ccc', fontSize: 13 }}>No users found</td></tr>
              ) : filtered.map((p, i) => {
                const creditsPercent = Math.min((p.credits_used / p.credits_limit) * 100, 100)
                const creditsColor = creditsPercent >= 90 ? '#E24B4A' : creditsPercent >= 70 ? '#BA7517' : '#1D9E75'
                return (
                  <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{p.full_name || '—'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, background: PLAN_BG[p.plan] || '#f0f0f0', color: PLAN_COLORS[p.plan] || '#888', padding: '3px 10px', borderRadius: 10, fontWeight: 600, textTransform: 'capitalize' }}>
                        {p.plan}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>
                      {p.credits_limit === 999999 ? 'Unlimited' : p.credits_limit}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${creditsPercent}%`, background: creditsColor, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>{p.credits_used}/{p.credits_limit === 999999 ? '∞' : p.credits_limit}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, background: p.role === 'admin' ? '#fff0ee' : '#f0f0f0', color: p.role === 'admin' ? '#E24B4A' : '#888', padding: '3px 10px', borderRadius: 10, fontWeight: 600, textTransform: 'capitalize' }}>
                        {p.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => openEdit(p)} style={{ fontSize: 11, padding: '4px 12px', border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', background: 'white', color: '#534AB7', fontWeight: 600 }}>
                        Manage
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div onClick={() => setEditingUser(null)} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1a1a1a' }}>Manage user</h2>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>{editingUser.email}</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Plan</label>
              <select value={editPlan} onChange={e => setEditPlan(e.target.value)} style={inputStyle}>
                <option value="free">Free</option>
                <option value="starter">Starter — £29/mo</option>
                <option value="growth">Growth — £99/mo</option>
                <option value="agency">Agency — £179/mo</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Monthly credit limit</label>
              <input type="number" value={editCredits} onChange={e => setEditCredits(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Set to 999999 for unlimited</div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Role</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} style={inputStyle}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingUser(null)} style={{ padding: '9px 18px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white', fontWeight: 500 }}>Cancel</button>
              <button onClick={saveUser} disabled={saving} style={{ padding: '9px 18px', background: saving ? '#aaa' : '#534AB7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
