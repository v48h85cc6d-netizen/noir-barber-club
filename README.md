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
  sections/    Hero, Club, Booking, Barbers, Services, Gallery, GiftCards, Membership, Reviews, Visit, Footer (contact)
  booking/     Booking flow: steps, live summary, review & demo confirmation
  components/  Logo (traced from the brand mark), Img, Button, Modal, Nav, Preloader, Marquee, SectionLabel
  context/     Booking state, contact-form prefill, preloader "ready" flag
  hooks/       useReveal: declarative scroll animations (data-reveal="lines|fade|stagger|img", data-parallax)
  lib/         GSAP setup, demo scheduling/availability, scroll helper
  data/        site.ts (address, phone, hours, socials) and content.ts (services, barbers, plans, reviews, gallery)
```

## Placeholders to replace

- **Business details**: `src/data/site.ts` holds the address, phone, email, hours and socials. All are placeholders.
- **Photography**: temporary Unsplash photos, shown in greyscale, set by ID in `src/data/content.ts`. Any photo that fails to load falls back to a dark branded tile.
- **Reviews, stats and the 4.9 rating** are demo copy.

## Demo-only behaviour (milestone 1)

- **Booking** runs the full flow: service → barber → date → time → details → review. Availability is generated deterministically. Confirming shows a clearly labelled *demo* screen. Nothing is reserved or sent.
- **Gift cards and memberships** fill in the contact form with the request. No payment is taken.
- **The contact form** validates input, then says it is in preview mode and offers a `mailto:` link.
- **The map** is a placeholder graphic that loads Google Maps only when clicked.
