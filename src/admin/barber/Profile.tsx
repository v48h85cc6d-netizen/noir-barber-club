import { useState } from 'react'
import { Lock, LogOut } from 'lucide-react'
import { LanguageSegmented } from '../../components/LanguageSwitcher'
import { useStore } from '../data/store'
import type { BarberRecord } from '../data/types'
import { useAdminT } from '../i18n'
import { BarberAvatar, Btn, Card, Field, inputCls, useAct } from '../ui'

/** Own profile: only bio, specialty, Instagram and phone are editable. */
export function Profile({ me, onSignOut }: { me: BarberRecord; onSignOut: () => void }) {
  const { t, person } = useAdminT()
  const { updateProfile } = useStore()
  const act = useAct()
  const [f, setF] = useState({
    bio: person(me).bio,
    specialty: person(me).specialty,
    instagram: me.instagram,
    phone: me.phone,
  })
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <BarberAvatar image={me.image} name={me.name} size={80} />
        <div>
          <h1 className="text-2xl font-semibold [font-stretch:115%]">{me.name}</h1>
          <div className="label mt-1 flex items-center gap-1.5 text-paper/45">
            <Lock className="size-3" /> {person(me).role} · {t.bApp.readonly}
          </div>
        </div>
      </div>
      <Card title={t.bApp.profile}>
        <p className="mb-5 text-sm text-paper/55">{t.bApp.profileNote}</p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            act(updateProfile(me.id, f))
          }}
        >
          <Field label={t.bApp.specialty}>
            <input value={f.specialty} maxLength={60} onChange={(e) => setF({ ...f, specialty: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t.bApp.bio}>
            <textarea rows={3} value={f.bio} maxLength={200} onChange={(e) => setF({ ...f, bio: e.target.value })} className={`${inputCls} resize-none`} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.bApp.instagram}>
              <input value={f.instagram} maxLength={40} onChange={(e) => setF({ ...f, instagram: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t.bApp.phone}>
              <input type="tel" value={f.phone} maxLength={24} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Btn type="submit" tone="gold" size="lg" className="w-full">
            {t.common.save}
          </Btn>
        </form>
      </Card>
      <Card title={t.common.language}>
        <LanguageSegmented size="lg" />
        <p className="mt-3 text-xs text-paper/50">{t.settings.languageNote}</p>
      </Card>
      <Btn onClick={onSignOut} size="lg" className="w-full">
        <LogOut className="size-4" /> {t.common.signOut}
      </Btn>
    </div>
  )
}
