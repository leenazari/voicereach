import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ candidates: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, role_applied, experience_summary, years_experience, skills } = body

    if (!name || !email || !role_applied || !experience_summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .insert({
        name,
        email,
        phone,
        role_applied,
        experience_summary,
        years_experience: years_experience || 0,
        skills: skills || [],
        status: 'applied'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ candidate: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
