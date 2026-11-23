import { barbers as siteBarbers, services as siteServices } from '../data/content'
import { activeBarbers, activeServices } from '../demo/bookings'
import { useDb } from '../demo/db'
import { useI18n } from '../i18n'

/**
 * What can be booked right now: the active barbers and services from the
 * (demo) database, with prices and durations the owner may have changed,
 * dressed with the website's photos and copy for the founding team.
 */
export function useCatalog() {
  const db = useDb()
  const { t } = useI18n()
  const people = t.barbers.people as Record<string, { specialty: string } | undefined>
  const barbers = activeBarbers(db).map((b) => {
    const site = siteBarbers.find((x) => x.id === b.id)
    return { id: b.id, name: b.name, image: b.image || site?.image || '', years: b.years, specialty: b.specialty || people[b.id]?.specialty || '' }
  })
  const services = siteServices
    .filter((s) => activeServices(db).some((x) => x.id === s.id))
    .map((s) => {
      const r = db.services.find((x) => x.id === s.id)!
      return { ...s, price: r.price, duration: r.duration }
    })
  return { db, barbers, services }
}

export type CatalogBarber = ReturnType<typeof useCatalog>['barbers'][number]
