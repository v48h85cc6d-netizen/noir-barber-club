/** Smoothly scroll to a section id (with or without leading #). */
export function scrollToId(id: string) {
  const el = document.getElementById(id.replace(/^#/, ''))
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
