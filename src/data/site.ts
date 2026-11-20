/**
 * All business details live here. They are placeholders for the first
 * milestone — swap in the real address, phone, hours and socials.
 */
export const site = {
  name: 'NOIR Barber Club',
  short: 'NOIR',
  established: 2016,
  currency: '€',
  /**
   * While true, the site shows small "sample" labels on ratings and reviews
   * and a demo-content note in the footer. Set to false once every value in
   * this file and in content.ts is real.
   */
  demoContent: true,
  rating: { score: 4.9, count: 1240, source: 'Google' },
  phone: '+31 20 123 4567',
  phoneHref: 'tel:+31201234567',
  email: 'hello@noirbarberclub.com',
  address: {
    street: 'Kerkstraat 118',
    city: '1017 GP Amsterdam',
    country: 'Netherlands',
    mapQuery: 'Kerkstraat 118, Amsterdam',
  },
  socials: [
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'TikTok', href: 'https://tiktok.com/' },
    { label: 'Google', href: 'https://maps.google.com/?q=Kerkstraat+118+Amsterdam' },
  ],
} as const

/** 0 = Sunday … 6 = Saturday. `null` = closed. Times are 24h "HH:MM". */
export const hours: Record<number, { open: string; close: string } | null> = {
  0: { open: '11:00', close: '17:00' },
  1: null,
  2: { open: '10:00', close: '20:00' },
  3: { open: '10:00', close: '20:00' },
  4: { open: '10:00', close: '21:00' },
  5: { open: '10:00', close: '20:00' },
  6: { open: '09:00', close: '18:00' },
}

export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const navLinks = [
  { label: 'Club', href: '#club' },
  { label: 'Barbers', href: '#barbers' },
  { label: 'Services', href: '#services' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Membership', href: '#membership' },
  { label: 'Gift cards', href: '#gift-cards' },
  { label: 'Visit', href: '#visit' },
]

export const formatPrice = (n: number) => `${site.currency}${n}`
