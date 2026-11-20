/**
 * Gift card ordering rules.
 *
 * There is no online payment or server yet, so an order is sent to the shop by
 * email. The shop issues the gift card code and activates the card only after
 * the payment has been received (cash on delivery or in the shop). The website
 * never creates an active card.
 */

export const GIFT_MIN = 25
export const GIFT_MAX = 1000
export const GIFT_AMOUNTS = [50, 75, 100, 150, 250] as const

/**
 * Business settings — keep them accurate.
 * Set `cashOnDelivery.enabled` to false if printed cards can't be delivered in person.
 * `onlinePayment` stays false until a payment provider is actually integrated.
 */
export const GIFT_SETTINGS = {
  onlinePayment: false,
  cashOnDelivery: { enabled: true, area: 'Amsterdam' },
} as const

export type DeliveryMethod = 'email' | 'phone'
export type PhoneChannel = 'sms' | 'whatsapp'
export type PaymentMethod = 'cod' | 'in_person'

export interface GiftForm {
  amount: number
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  senderName: string
  message: string
  delivery: DeliveryMethod
  channel: PhoneChannel
  purchaserPhone: string
  purchaserEmail: string
  payment: PaymentMethod
  codAddress: string
  codPhone: string
}

export type GiftField =
  | 'amount'
  | 'recipientName'
  | 'recipientEmail'
  | 'recipientPhone'
  | 'senderName'
  | 'purchaserPhone'
  | 'purchaserEmail'
  | 'codAddress'
  | 'codPhone'

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.trim().length <= 254

/** Strip spaces, dashes, dots and brackets; keep a leading +. */
export const normalizePhone = (v: string) => v.trim().replace(/[\s\-().]/g, '')

/** International format: + then country code and number (E.164, 8–15 digits). */
export const isIntlPhone = (v: string) => /^\+[1-9]\d{7,14}$/.test(normalizePhone(v))

/** Delivery phone for cash on delivery; empty means "use the purchaser's mobile". */
export const codPhoneOf = (f: GiftForm) => f.codPhone.trim() || f.purchaserPhone

/** Returns the invalid fields for the chosen delivery and payment options. */
export function validateGift(f: GiftForm): GiftField[] {
  const e: GiftField[] = []
  if (!Number.isInteger(f.amount) || f.amount < GIFT_MIN || f.amount > GIFT_MAX) e.push('amount')
  if (f.recipientName.trim().length < 2) e.push('recipientName')
  if (f.delivery === 'email' && !isEmail(f.recipientEmail)) e.push('recipientEmail')
  if (f.delivery === 'phone' && !isIntlPhone(f.recipientPhone)) e.push('recipientPhone')
  if (f.senderName.trim().length < 2) e.push('senderName')
  if (!isIntlPhone(f.purchaserPhone)) e.push('purchaserPhone')
  if (f.purchaserEmail.trim() && !isEmail(f.purchaserEmail)) e.push('purchaserEmail')
  if (f.payment === 'cod') {
    if (f.codAddress.trim().length < 8) e.push('codAddress')
    if (!isIntlPhone(codPhoneOf(f))) e.push('codPhone')
  }
  return e
}

// No 0/O, 1/I/L — easy to read out on the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Order reference for matching the email to the payment, e.g. GC-K7Q2M9. Not a gift card code. */
export function newOrderReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `GC-${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`
}
