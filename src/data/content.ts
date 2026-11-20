/* Demo content for the first milestone. Photography is temporary (Unsplash). */

/* Text for every item lives in src/i18n/<lang>.ts, keyed by id. */
import type { Dict } from '../i18n/en'

export type ServiceId = keyof Dict['services']['items']

export type ServiceCategory = 'haircuts' | 'beard' | 'rituals'

export interface Service {
  id: ServiceId
  category: ServiceCategory
  duration: number // minutes
  price: number
  image: string
  signature?: boolean
}

export const services: Service[] = [
  {
    id: 'signature-cut',
    category: 'haircuts',
    duration: 45,
    price: 45,
    image: 'photo-1622286342621-4bd786c2447c',
    signature: true,
  },
  {
    id: 'skin-fade',
    category: 'haircuts',
    duration: 45,
    price: 48,
    image: 'photo-1593702275687-f8b402bf1fb5',
  },
  {
    id: 'scissor-cut',
    category: 'haircuts',
    duration: 60,
    price: 55,
    image: 'photo-1622287162716-f311baa1a2b8',
  },
  {
    id: 'buzz-cut',
    category: 'haircuts',
    duration: 25,
    price: 28,
    image: 'photo-1599351431202-1e0f0137899a',
  },
  {
    id: 'junior-cut',
    category: 'haircuts',
    duration: 30,
    price: 30,
    image: 'photo-1512690459411-b9245aed614b',
  },
  {
    id: 'beard-sculpt',
    category: 'beard',
    duration: 30,
    price: 30,
    image: 'photo-1517832606299-7ae9b720a186',
  },
  {
    id: 'hot-towel-shave',
    category: 'beard',
    duration: 40,
    price: 42,
    image: 'photo-1532710093739-9470acff878f',
  },
  {
    id: 'cut-beard',
    category: 'rituals',
    duration: 75,
    price: 70,
    image: 'photo-1503951914875-452162b0f3f1',
  },
  {
    id: 'noir-ritual',
    category: 'rituals',
    duration: 90,
    price: 95,
    image: 'photo-1585747860715-2ba37e788b70',
    signature: true,
  },
]

export const serviceCategories: ServiceCategory[] = ['haircuts', 'beard', 'rituals']

export interface Barber {
  id: 'marco' | 'idris' | 'lucas' | 'theo'
  name: string
  years: number
  image: string
  instagram: string
  /** Weekdays (0 = Sun) this barber does not work, on top of shop closures */
  daysOff: number[]
}

export const barbers: Barber[] = [
  {
    id: 'marco',
    name: 'Marco Velden',
    years: 14,
    image: 'photo-1507003211169-0a1dd7228f2d',
    instagram: '@marco.noir',
    daysOff: [0],
  },
  {
    id: 'idris',
    name: 'Idris Haddad',
    years: 9,
    image: 'photo-1500648767791-00dcc994a43e',
    instagram: '@idris.cuts',
    daysOff: [3],
  },
  {
    id: 'lucas',
    name: 'Lucas Moreau',
    years: 7,
    image: 'photo-1519085360753-af0119f7cbe7',
    instagram: '@lucas.razor',
    daysOff: [2],
  },
  {
    id: 'theo',
    name: 'Theo Brandt',
    years: 5,
    image: 'photo-1506794778202-cad84cf45f1d',
    instagram: '@theo.texture',
    daysOff: [6],
  },
]

/** Lookbook: each frame links to the service that produces the look. */
export const gallery: { id: string; service: ServiceId }[] = [
  { id: 'photo-1622286342621-4bd786c2447c', service: 'signature-cut' },
  { id: 'photo-1593702275687-f8b402bf1fb5', service: 'skin-fade' },
  { id: 'photo-1622287162716-f311baa1a2b8', service: 'scissor-cut' },
  { id: 'photo-1599351431202-1e0f0137899a', service: 'buzz-cut' },
  { id: 'photo-1503951914875-452162b0f3f1', service: 'beard-sculpt' },
  { id: 'photo-1532710093739-9470acff878f', service: 'hot-towel-shave' },
]

export interface Plan {
  id: 'essential' | 'club' | 'black'
  /** Plan names are brand names and stay the same in every language */
  name: string
  monthly: number
  /** Rough monthly saving vs. paying per visit, shown on the card (demo figure) */
  saving: number
  featured?: boolean
}

export const plans: Plan[] = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: 79,
    saving: 11,
  },
  {
    id: 'club',
    name: 'Club',
    monthly: 129,
    saving: 36,
    featured: true,
  },
  {
    id: 'black',
    name: 'Black',
    monthly: 199,
    saving: 106,
  },
]

/** Reviewer names; their words are translated in the dictionaries (same order). */
export const reviews = [
  { name: 'Daniel K.', rating: 5 },
  { name: 'Ruben de Vries', rating: 5 },
  { name: 'Samir A.', rating: 5 },
  { name: 'Jonas Meyer', rating: 5 },
  { name: 'Chris O.', rating: 5 },
  { name: 'Tom Hendriks', rating: 5 },
]

export const stats = [
  { value: 10, suffix: '' },
  { value: 4, suffix: '' },
  { value: 38, suffix: 'k' },
  { value: 4.9, suffix: '', decimals: 1 },
]
