# NOIR Barber Club

Premium barber shop website — React, TypeScript, Vite, Tailwind CSS v4, GSAP + ScrollTrigger, Motion for React, Lucide icons.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the build
```

## Structure

```
src/
  sections/    Hero, Club, Booking, Barbers, Services, Gallery (lookbook), GiftCards, Membership, Reviews, Visit (+ FAQ), Footer (CTA + contact)
  booking/     Slide-in booking panel opened from every "Book" control: steps, review & demo confirmation
  components/  Logo (traced from the brand mark), Img, Button (pill), Modal, Nav, Preloader, SectionLabel
  context/     Booking state, contact-form prefill, preloader "ready" flag
  hooks/       useReveal: declarative scroll animations (data-reveal="lines|fade|stagger|img", data-parallax)
  lib/         GSAP setup, demo scheduling/availability, scroll helper
  data/        site.ts (address, phone, hours, socials) and content.ts (prices, durations, images, schedules)
  i18n/        en.ts (source + Dict type), de.ts, sq.ts, and the I18nProvider / useI18n hook
```

## Placeholders to replace

- **Business details**: `src/data/site.ts` holds the address, transit stop, phone, email, hours, socials, rating and FAQ answers. All are placeholders.
- **Demo flag**: `site.demoContent` in `src/data/site.ts`. While `true`, the rating and reviews are labelled as samples and the footer says the content is a placeholder. Set it to `false` once every value is real.
- **Team, prices, plans and reviews** live in `src/data/content.ts`. All are demo copy.
- **Photography**: 14 temporary Unsplash photos, set by ID in `src/data/content.ts` and `src/sections/*`, served greyscale through Unsplash's CDN with responsive `srcset`. Each was checked to load and to match its subject. The barber cards use generic male portraits, not real barbers. Replace them with the shop's own photography.
- **Logo**: traced from the official mark into `src/assets/logo-*.svg`. The favicon (`public/favicon.svg`, `public/apple-touch-icon.png`) uses the logo's Ø unaltered.

## Demo-only behaviour (milestone 1)

- **Booking** runs the full flow: service → barber → date → time → details → review. Availability is generated deterministically. Confirming shows a clearly labelled *demo* screen. Nothing is reserved or sent.
- **Memberships** fill in the contact form with the request. No payment is taken.
- **The contact form** validates input, then says it is in preview mode and offers a `mailto:` link.
- **The map** is a placeholder graphic that loads Google Maps only when clicked.

## Design notes

The visual language (light-grey and near-black sections, sentence-case extra-wide headings mixing light and bold weights, monospace labels, pill buttons, slide-in booking panel) follows a reference reel supplied by the client. That reel shows another studio's concept site for a different brand. Only the design language was adopted. All copy, the brand, the logo and the photography here are NOIR's own or temporary stock.

## Languages (EN / DE / SQ)

- **Every visible string** lives in `src/i18n/en.ts`, `de.ts` and `sq.ts`. English defines the shape (`Dict`); TypeScript refuses to build if German or Albanian is missing a key or has an extra one.
- **Components** read text with `const { t, locale, fmt } = useI18n()`. `fmt` formats dates and numbers for the active language.
  - Albanian has a built-in calendar fallback, because Chromium ships without Albanian locale data.
- **Data files hold no copy.** Services, barbers, plans, gallery and reviews are matched to their text by id. A new service needs an entry in all three dictionaries.
- **Default and memory:** English for first-time visitors. The choice is saved in `localStorage` (`noir.locale`) and applied instantly, with no reload. A `?lang=de` / `?lang=sq` link opens in that language.
- **Switcher:** a segmented SQ · DE · EN control in the desktop nav (1280px and up), a compact dropdown in the header below that, and a large switcher in the mobile menu.
- **Animated headlines:** headings with `data-reveal="lines"` must carry `key={locale}`. The split-text animation rewrites their DOM, so they have to remount on a language switch.
- **German** uses the informal "du"; **Albanian** uses the polite "ju".

## Gift card orders

- **What the customer chooses:**
  - amount
  - recipient name
  - delivery by **email** (recipient's email) or **phone** (recipient's mobile with country code, by **WhatsApp** or **SMS**)
  - sender name and message
  - their own mobile (email optional)
  - payment by **Cash on delivery** (delivery address and phone) or **Pay in the shop**
- **Placing the order:** after a review step, the order opens in the customer's email app, addressed to the shop's email (`site.email`). It includes a reference such as `GC-K7Q2M9` and is marked *pending payment*. The confirmation says the card stays **inactive until payment**.
- **The website never issues or activates a card.** The shop creates the gift card code, activates the card and sends it by email, SMS or WhatsApp only after the payment has been received.
- **Online payment** isn't offered, since no payment provider is integrated (`GIFT_SETTINGS.onlinePayment = false`).
- **Cash on delivery** is controlled by `GIFT_SETTINGS.cashOnDelivery` in `src/lib/giftcard.ts`. It's on, with area *Amsterdam* (placeholder). Set `enabled: false` if printed cards can't be delivered in person.
- **No automatic messages:** no SMS, WhatsApp or email provider is connected, so nothing is sent automatically.
