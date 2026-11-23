import { useState } from 'react'
import { auth, type AuthSession, type RegisterFields } from '../demo/auth'
import { useDb } from '../demo/db'
import { Btn, Card, useToast } from '../admin/ui'
import { FormAlert, PasswordField, TextField } from '../admin/auth-ui'
import { useAccountT } from './i18n'

export function ProfilePage({ session }: { session: AuthSession }) {
  const { a, fmt } = useAccountT()
  const toast = useToast()
  const db = useDb()
  const since = db.accounts.find((x) => x.id === session.accountId)?.createdAt
  const [p, setP] = useState({ name: session.name, phone: session.phone })
  const [pErr, setPErr] = useState<RegisterFields>({})
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErr, setPwErr] = useState<RegisterFields>({})
  const [pwAlert, setPwAlert] = useState<string | null>(null)

  return (
    <>
      <h1 className="display text-[clamp(2.2rem,6vw,3.4rem)]">
        <b>{a.profile.title}</b>
      </h1>
      <p className="mt-2 max-w-xl text-paper/60">{a.profile.intro}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
        <Card title={a.profile.title}>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              const r = auth.updateProfile(p)
              if (r.ok) {
                setPErr({})
                toast(a.profile.saved)
              } else setPErr(r.fields ?? {})
            }}
          >
            <TextField label={a.profile.name} autoComplete="name" value={p.name} maxLength={80} onChange={(e) => setP({ ...p, name: e.target.value })} error={pErr.name && a.auth.errors.name} />
            <TextField label={a.profile.phone} type="tel" autoComplete="tel" value={p.phone} maxLength={24} onChange={(e) => setP({ ...p, phone: e.target.value })} error={pErr.phone && a.auth.errors.phone} />
            <TextField label={a.profile.email} value={session.email} readOnly disabled hint={a.profile.emailNote} />
            {since && (
              <p className="text-sm text-paper/55">
                {a.profile.memberSince}: {fmt.date(new Date(since), { day: 'numeric', month: 'long' })} {new Date(since).getFullYear()}
              </p>
            )}
            <Btn type="submit" tone="primary" className="w-full">
              {a.profile.save}
            </Btn>
          </form>
        </Card>
        <Card title={a.profile.passwordTitle}>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              const r = auth.changePassword(pw.current, pw.next, pw.confirm)
              if (r.ok) {
                setPw({ current: '', next: '', confirm: '' })
                setPwErr({})
                setPwAlert(null)
                toast(a.profile.changed)
                return
              }
              setPwErr(r.fields ?? {})
              setPwAlert(r.error === 'invalid_credentials' ? a.profile.wrongCurrent : a.auth.errors.fix)
            }}
          >
            {pwAlert && <FormAlert>{pwAlert}</FormAlert>}
            <PasswordField label={a.profile.current} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} showLabel={a.auth.show} hideLabel={a.auth.hide} />
            <PasswordField label={a.profile.next} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwErr.password && a.auth.errors[pwErr.password]} hint={a.auth.passwordHint} showLabel={a.auth.show} hideLabel={a.auth.hide} />
            <PasswordField label={a.profile.confirm} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErr.confirm && a.auth.errors[pwErr.confirm]} showLabel={a.auth.show} hideLabel={a.auth.hide} />
            <Btn type="submit" className="w-full">
              {a.profile.change}
            </Btn>
          </form>
        </Card>
      </div>
    </>
  )
}
