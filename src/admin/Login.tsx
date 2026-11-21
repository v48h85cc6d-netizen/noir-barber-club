import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Crown, Lock, Scissors } from 'lucide-react'
import { Wordmark } from '../components/Logo'
import { Img } from '../components/Img'
import { LanguageSegmented } from '../components/LanguageSwitcher'
import { barbers } from '../data/content'
import type { Session } from './data/store'
import { useAdminT } from './i18n'
import { BarberAvatar, ease, inputCls } from './ui'

export function Login({ onEnter }: { onEnter: (s: Session) => void }) {
  const { t } = useAdminT()
  const team = barbers.filter((b) => b.id !== 'marco')
  const [pick, setPick] = useState<string>(team[0].id)

  return (
    <div className="relative grid min-h-svh text-paper lg:grid-cols-[1.1fr_1fr]">
      <div aria-hidden className="cc-backdrop" />
      {/* brand panel */}
      <div className="relative m-3 hidden overflow-hidden rounded-[28px] shadow-[0_30px_60px_-30px_rgba(31,30,28,0.55)] lg:sticky lg:top-3 lg:block lg:h-[calc(100svh-24px)] lg:self-start">
        <div className="absolute inset-0">
          <Img id="photo-1585747860715-2ba37e788b70" alt="" priority className="h-full w-full" imgClassName="brightness-[0.45]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgba(210,176,122,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <a href="/" className="label flex items-center gap-2 text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="size-3.5" /> {t.login.backToSite}
          </a>
          <div>
            <div className="label text-[#e4cc9f]">{t.login.eyebrow}</div>
            <Wordmark className="mt-6 w-full max-w-[560px] text-white" />
            <p className="mt-6 max-w-sm text-white/70">{t.login.intro}</p>
          </div>
        </div>
      </div>

      {/* entry panel */}
      <div className="relative flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-3">
          <Wordmark className="w-24 shrink-0 lg:invisible" />
          <LanguageSegmented />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="glass mx-auto my-8 flex w-full min-w-0 max-w-md flex-1 flex-col justify-center rounded-[28px] p-6 sm:p-8"
        >
          <div className="label text-paper/45">NOIR</div>
          <h1 className="display mt-3 text-[clamp(2.4rem,5vw,3.4rem)]">
            <b>{t.login.title}</b>
          </h1>

          <div className="mt-8 rounded-2xl border border-[#b8935a]/30 bg-[#d2b07a]/[0.12] p-4 text-sm leading-relaxed text-paper/75">
            <span className="label mr-2 rounded-full bg-[#d2b07a] px-2 py-1 text-[#1f1e1c]">{t.demo.badge}</span>
            {t.demo.long}
          </div>

          <h2 className="mt-8 text-lg font-semibold [font-stretch:115%]">{t.login.demoTitle}</h2>
          <p className="mt-1 text-sm text-paper/55">{t.login.demoIntro}</p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => onEnter({ mode: 'demo', userId: 'u-owner', name: 'Marco Velden', role: 'owner', barberId: 'marco' })}
              className="group flex w-full items-center gap-4 rounded-2xl border border-paper/10 bg-white/70 p-4 text-left shadow-[0_6px_18px_-14px_rgba(31,30,28,0.4)] transition-colors hover:border-[#b8935a]/60 hover:bg-white"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#d2b07a] text-[#1f1e1c]">
                <Crown className="size-5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold [font-stretch:115%]">{t.login.enterOwner}</span>
                <span className="text-sm text-paper/50">Marco Velden · {t.login.ownerNote}</span>
              </span>
              <ArrowRight className="size-5 text-paper/40 transition-transform group-hover:translate-x-1 group-hover:text-paper" strokeWidth={1.5} />
            </button>

            <div className="rounded-2xl border border-paper/10 bg-white/70 p-4 shadow-[0_6px_18px_-14px_rgba(31,30,28,0.4)]">
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-paper/15">
                  <Scissors className="size-5" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold [font-stretch:115%]">{t.login.enterBarber}</span>
                  <span className="text-sm text-paper/50">{t.login.barberNote}</span>
                </span>
              </div>
              <div role="radiogroup" aria-label={t.login.chooseBarber} className="mt-4 grid grid-cols-3 gap-2">
                {team.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === b.id}
                    onClick={() => setPick(b.id)}
                    className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border p-2 text-sm transition-colors sm:p-3 ${pick === b.id ? 'border-[#b8935a]/70 bg-[#d2b07a]/15' : 'border-paper/10 bg-white/50 hover:border-paper/25'}`}
                  >
                    <BarberAvatar image={b.image} name={b.name} size={44} />
                    <span className="max-w-full truncate">{b.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const b = team.find((x) => x.id === pick)!
                  onEnter({ mode: 'demo', userId: `u-${b.id}`, name: b.name, role: 'barber', barberId: b.id })
                }}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/90"
              >
                {t.login.enterBarber} <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* real sign-in: visible, but honestly disabled until the database exists */}
          <form className="mt-10 border-t border-paper/[0.08] pt-8" onSubmit={(e) => e.preventDefault()} aria-describedby="signin-note">
            <h2 className="flex items-center gap-2 text-lg font-semibold [font-stretch:115%]">
              <Lock className="size-4 text-paper/50" strokeWidth={1.5} /> {t.login.signInTitle}
            </h2>
            <fieldset disabled className="mt-4 space-y-4 opacity-50">
              <label className="block">
                <span className="label text-paper/50">{t.login.email}</span>
                <input type="email" className={inputCls} autoComplete="username" />
              </label>
              <label className="block">
                <span className="label text-paper/50">{t.login.password}</span>
                <input type="password" className={inputCls} autoComplete="current-password" />
              </label>
              <button type="submit" className="h-12 w-full rounded-full border border-paper/15 bg-white/60 text-sm">
                {t.login.signIn}
              </button>
            </fieldset>
            <p id="signin-note" className="mt-4 text-xs leading-relaxed text-paper/50">
              {t.login.notConnected}
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
