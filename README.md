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
  data/        site.ts (address, phone, hours, socials) and content.ts (services, barbers, plans, reviews, gallery)
```

## Placeholders to replace

- **Business details**: `src/data/site.ts` holds the address, transit stop, phone, email, hours, socials, rating and FAQ answers. All are placeholders.
- **Demo flag**: `site.demoContent` in `src/data/site.ts`. While `true`, the rating and reviews are labelled as samples and the footer says the content is a placeholder. Set it to `false` once every value is real.
- **Team, prices, plans and reviews** live in `src/data/content.ts`. All are demo copy.
- **Photography**: 14 temporary Unsplash photos, set by ID in `src/data/content.ts` and `src/sections/*`, served greyscale through Unsplash's CDN with responsive `srcset`. Each was checked to load and to match its subject. The barber cards use generic male portraits, not real barbers. Replace them with the shop's own photography.
- **Logo**: traced from the official mark into `src/assets/logo-*.svg`. The favicon (`public/favicon.svg`, `public/apple-touch-icon.png`) uses the logo's Ø unaltered.

## Demo-only behaviour (milestone 1)

- **Booking** runs the full flow: service → barber → date → time → details → review. Availability is generated deterministically. Confirming shows a clearly labelled *demo* screen. Nothing is reserved or sent.
- **Gift cards and memberships** fill in the contact form with the request. No payment is taken.
- **The contact form** validates input, then says it is in preview mode and offers a `mailto:` link.
- **The map** is a placeholder graphic that loads Google Maps only when clicked.

## Design notes

The visual language (light-grey and near-black sections, sentence-case extra-wide headings mixing light and bold weights, monospace labels, pill buttons, slide-in booking panel) follows a reference reel supplied by the client. That reel shows another studio's concept site for a different brand. Only the design language was adopted. All copy, the brand, the logo and the photography here are NOIR's own or temporary stock.
