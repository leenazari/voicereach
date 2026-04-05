import { createClient } from '@supabase/supabase-js'
import { GetServerSidePropsContext } from 'next'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requireAuth(context: GetServerSidePropsContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const token = context.req.cookies['sb-access-token'] ||
    context.req.cookies[`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0]}-auth-token`]

  if (!token) return { user: null, profile: null }

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export async function requireAdmin(context: GetServerSidePropsContext) {
  const { user, profile } = await requireAuth(context)
  if (!user || profile?.role !== 'admin') return { user: null, profile: null, isAdmin: false }
  return { user, profile, isAdmin: true }
}
