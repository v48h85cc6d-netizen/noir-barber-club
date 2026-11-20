/* Demo content for the first milestone. Photography is temporary (Unsplash). */

export type ServiceCategory = 'Haircuts' | 'Beard & Shave' | 'Rituals'

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  description: string
  duration: number // minutes
  price: number
  image: string
  signature?: boolean
}

export const services: Service[] = [
  {
    id: 'signature-cut',
    name: 'Signature Cut',
    category: 'Haircuts',
    description: 'Consultation, precision cut, wash and finish. Our house standard.',
    duration: 45,
    price: 45,
    image: 'photo-1503951914875-452162b0f3f1',
    signature: true,
  },
  {
    id: 'skin-fade',
    name: 'Skin Fade',
    category: 'Haircuts',
    description: 'Seamless fade from skin, detailed with foil and blade.',
    duration: 45,
    price: 48,
    image: 'photo-1621605815971-fbc98d665033',
  },
  {
    id: 'scissor-cut',
    name: 'Scissor Cut',
    category: 'Haircuts',
    description: 'Scissor-only work for longer lengths and natural movement.',
    duration: 60,
    price: 55,
    image: 'photo-1599351431202-1e0f0137899a',
  },
  {
    id: 'buzz-cut',
    name: 'Buzz & Line-up',
    category: 'Haircuts',
    description: 'One length all over with a crisp razor line-up.',
    duration: 25,
    price: 28,
    image: 'photo-1622286342621-4bd786c2447c',
  },
  {
    id: 'junior-cut',
    name: 'Junior Cut',
    category: 'Haircuts',
    description: 'For gentlemen under twelve. Same care, shorter attention span.',
    duration: 30,
    price: 30,
    image: 'photo-1512690459411-b9245aed614b',
  },
  {
    id: 'beard-sculpt',
    name: 'Beard Sculpt',
    category: 'Beard & Shave',
    description: 'Shape, line and condition. Finished with hot towel and oil.',
    duration: 30,
    price: 30,
    image: 'photo-1517832606299-7ae9b720a186',
  },
  {
    id: 'hot-towel-shave',
    name: 'Hot Towel Shave',
    category: 'Beard & Shave',
    description: 'Traditional straight-razor shave with pre-shave oil and three hot towels.',
    duration: 40,
    price: 42,
    image: 'photo-1593702275687-f8b402bf1fb5',
  },
  {
    id: 'cut-beard',
    name: 'Cut & Beard',
    category: 'Rituals',
    description: 'Signature cut and full beard sculpt in one sitting.',
    duration: 75,
    price: 70,
    image: 'photo-1622287162716-f311baa1a2b8',
  },
  {
    id: 'noir-ritual',
    name: 'The Noir Ritual',
    category: 'Rituals',
    description: 'Cut, straight-razor shave, face treatment and scalp massage. Ninety quiet minutes.',
    duration: 90,
    price: 95,
    image: 'photo-1585747860715-2ba37e788b70',
    signature: true,
  },
]

export const serviceCategories: ServiceCategory[] = ['Haircuts', 'Beard & Shave', 'Rituals']

export interface Barber {
  id: string
  name: string
  role: string
  years: number
  specialty: string
  bio: string
  image: string
  instagram: string
  /** Weekdays (0 = Sun) this barber does not work, on top of shop closures */
  daysOff: number[]
}

export const barbers: Barber[] = [
  {
    id: 'marco',
    name: 'Marco Velden',
    role: 'Founder · Master Barber',
    years: 14,
    specialty: 'Classic scissor work',
    bio: 'Opened NOIR in 2016 after a decade behind chairs in London and Milan.',
    image: 'photo-1507003211169-0a1dd7228f2d',
    instagram: '@marco.noir',
    daysOff: [0],
  },
  {
    id: 'idris',
    name: 'Idris Haddad',
    role: 'Senior Barber',
    years: 9,
    specialty: 'Skin fades & tapers',
    bio: 'Known for fades so clean they look airbrushed. Booked out most Fridays.',
    image: 'photo-1500648767791-00dcc994a43e',
    instagram: '@idris.cuts',
    daysOff: [3],
  },
  {
    id: 'lucas',
    name: 'Lucas Moreau',
    role: 'Barber · Razor Specialist',
    years: 7,
    specialty: 'Beards & straight razor',
    bio: 'Trained in Lyon. Treats every shave like a ceremony — because it is.',
    image: 'photo-1519085360753-af0119f7cbe7',
    instagram: '@lucas.razor',
    daysOff: [2],
  },
  {
    id: 'theo',
    name: 'Theo Brandt',
    role: 'Barber · Texture',
    years: 5,
    specialty: 'Textured crops & curls',
    bio: 'Works with natural texture, not against it. Curly hair in good hands.',
    image: 'photo-1506794778202-cad84cf45f1d',
    instagram: '@theo.texture',
    daysOff: [6],
  },
]

export const gallery = [
  { id: 'photo-1585747860715-2ba37e788b70', caption: 'The floor, Kerkstraat', tall: false },
  { id: 'photo-1503951914875-452162b0f3f1', caption: 'Signature Cut', tall: true },
  { id: 'photo-1605497788044-5a32c7078486', caption: 'Chair No. 2', tall: false },
  { id: 'photo-1621605815971-fbc98d665033', caption: 'Skin fade, detail', tall: true },
  { id: 'photo-1503951458645-643d53bfd90f', caption: 'Tools of the trade', tall: false },
  { id: 'photo-1599351431202-1e0f0137899a', caption: 'Scissor work', tall: true },
  { id: 'photo-1532710093739-9470acff878f', caption: 'After hours', tall: false },
  { id: 'photo-1622286342621-4bd786c2447c', caption: 'Line-up', tall: true },
]

export interface Plan {
  id: string
  name: string
  monthly: number
  tagline: string
  features: string[]
  featured?: boolean
}

export const plans: Plan[] = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: 79,
    tagline: 'For the two-cuts-a-month man.',
    features: ['2 Signature Cuts per month', 'Priority online booking', 'Complimentary drink', '10% off products'],
  },
  {
    id: 'club',
    name: 'Club',
    monthly: 129,
    tagline: 'Always sharp. Never think about it.',
    features: [
      'Unlimited cuts',
      '1 Beard Sculpt per month',
      'Book 4 weeks ahead',
      'Guest pass every quarter',
      '15% off products',
    ],
    featured: true,
  },
  {
    id: 'black',
    name: 'Black',
    monthly: 199,
    tagline: 'The full house, the best chair.',
    features: [
      'Unlimited cuts & beard work',
      '1 Noir Ritual per month',
      'After-hours appointments',
      'Dedicated barber',
      '20% off products',
    ],
  },
]

export const reviews = [
  {
    name: 'Daniel K.',
    meta: 'Club member · 3 years',
    text: 'Best fade I have had in this city, and I have tried them all. The room is calm, nobody rushes you, and Idris remembers exactly how I like it.',
    rating: 5,
  },
  {
    name: 'Ruben de Vries',
    meta: 'Google review',
    text: 'The Noir Ritual is ninety minutes of pure reset. Hot towels, straight razor, a proper scalp massage. Walked out a different man.',
    rating: 5,
  },
  {
    name: 'Samir A.',
    meta: 'Booked online',
    text: 'Booking took thirty seconds, they were on time to the minute, and the cut held its shape for weeks. That is the whole review.',
    rating: 5,
  },
  {
    name: 'Jonas Meyer',
    meta: 'Black member',
    text: 'It feels like a private club without any of the pretension. Marco is a craftsman — you can tell he cares about every line.',
    rating: 5,
  },
  {
    name: 'Chris O.',
    meta: 'Google review',
    text: 'Finally a barber who knows what to do with curly hair. Theo took his time and explained how to style it at home.',
    rating: 5,
  },
  {
    name: 'Tom Hendriks',
    meta: 'Gift card recipient',
    text: 'Got a gift card from my wife and now I am a member. Lucas does the cleanest beard work I have ever seen.',
    rating: 5,
  },
]

export const stats = [
  { value: 10, suffix: '', label: 'Years on Kerkstraat' },
  { value: 4, suffix: '', label: 'Master barbers' },
  { value: 38, suffix: 'k', label: 'Cuts delivered' },
  { value: 4.9, suffix: '', label: 'Average rating', decimals: 1 },
]
