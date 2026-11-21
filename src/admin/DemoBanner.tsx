import { useAdminT } from './i18n'

/** Always-visible notice that the dashboard runs on sample data. */
export function DemoBanner() {
  const { t } = useAdminT()
  return (
    <div role="note" className="relative z-10 border-b border-[#b8935a]/20 bg-[linear-gradient(90deg,rgba(210,176,122,0.22),rgba(255,255,255,0.35))] px-4 py-2 backdrop-blur-md md:px-8">
      <p className="mx-auto flex max-w-[1400px] items-center gap-2.5 text-xs text-paper/70">
        <span className="label shrink-0 rounded-full bg-[#d2b07a] px-2 py-0.5 text-[0.62rem] text-[#1f1e1c]">{t.demo.badge}</span>
        <span className="min-w-0 sm:truncate">{t.demo.note}</span>
      </p>
    </div>
  )
}
