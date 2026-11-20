// Supabase Edge Function: invite-barber  (Deno)
// NOT YET DEPLOYED OR TESTED — needs a Supabase project. Deploy with:
//   supabase functions deploy invite-barber
//
// The only way a barber account can come into existence:
//   1. the caller must be signed in and be an ACTIVE OWNER (checked against public.staff),
//   2. the invite is sent by Supabase Auth; the barber sets their own password,
//   3. the staff row is created here with role 'barber' — the role is never taken from the request.
// The service-role key is only available inside this function (Supabase secret), never in the browser.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // 1. who is calling? (their own session, so row-level security applies)
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userError } = await asCaller.auth.getUser()
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)
  const { data: me } = await asCaller.from('staff').select('role, active').eq('user_id', userData.user.id).maybeSingle()
  if (!me || me.role !== 'owner' || !me.active) return json({ error: 'forbidden' }, 403)

  // 2. validate the request
  let body: { email?: string; name?: string; barberId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const name = (body.name ?? '').trim()
  const barberId = (body.barberId ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || name.length < 2 || !/^[a-z0-9-]{2,32}$/.test(barberId)) return json({ error: 'invalid_input' }, 422)

  const admin = createClient(url, service, { auth: { persistSession: false } })

  // the barber profile must exist and not already have an account
  const { data: barber } = await admin.from('barbers').select('id').eq('id', barberId).maybeSingle()
  if (!barber) {
    const { error } = await admin.from('barbers').insert({ id: barberId, name, email })
    if (error) return json({ error: 'barber_create_failed' }, 400)
  }
  const { data: existing } = await admin.from('staff').select('user_id').eq('barber_id', barberId).maybeSingle()
  if (existing) return json({ error: 'barber_has_account' }, 409)

  // 3. invite + staff row with a fixed role
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { name } })
  if (inviteError || !invited.user) return json({ error: 'invite_failed' }, 400)
  const { error: staffError } = await admin.from('staff').insert({ user_id: invited.user.id, role: 'barber', barber_id: barberId, active: true })
  if (staffError) {
    await admin.auth.admin.deleteUser(invited.user.id)
    return json({ error: 'staff_create_failed' }, 400)
  }
  await admin.from('audit_log').insert({ actor: userData.user.id, actor_role: 'owner', action: 'invite', table_name: 'staff', record_id: invited.user.id, after: { email, barber_id: barberId } })
  return json({ ok: true, userId: invited.user.id })
})
