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
  booking/     Slide-in booking panel opened from every "Book" control: steps, review, confirmation
  account/     Customer area at /account: sign-in, registration, password reset, my appointments, profile
  demo/        DEMO data layer (localStorage): db.ts, auth.ts (mock sign-in), bookings.ts (availability + rules)
  components/  Logo (traced from the brand mark), Img, Button (pill), Modal, Nav, Preloader, SectionLabel
  context/     Booking state, contact-form prefill, preloader "ready" flag
  hooks/       useReveal: declarative scroll animations (data-reveal="lines|fade|stagger|img", data-parallax)
  lib/         GSAP setup, opening hours, scroll helper
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

- **Booking** runs the full flow: barber → service → date → time → details → review. Confirming needs a customer account and saves the appointment in this browser only (see *Accounts & booking demo* below). The shop is not notified.
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

## Accounts & booking demo (three roles, no database)

**Demo only.** Accounts, sessions and bookings are stored in this browser's `localStorage` (key `noir.demo.db`). Passwords are kept as a salted SHA-256 digest, but this is **not secure authentication**: anyone with the browser can read or change the data, there is no server, no email and no rate limiting. Do not use real passwords. Nothing is shared between browsers or devices.

| Role | Where | Demo login |
| --- | --- | --- |
| Owner | `/admin/login/owner` | `Owner@gmail.com` / `Owner112233` |
| Barber | `/admin/login/barber` | `Barber@gmail.com` / `Barber@gmail.com` (Idris Haddad) |
| Customer | `/account/register`, then `/account/login` | created by the visitor |

- **Customers** register themselves (full name, email, phone, password, confirmation), then confirm their email with a 6-digit code (see below). Validation, duplicate-email check, automatic sign-in after verification and a session that survives refresh. The sign-up has no role field, so it can only ever create customers.
- **Booking** needs a signed-in customer. A visitor who confirms is sent to sign-in / sign-up and returns to the review step with barber, service, date and time kept. Every booking gets a reference (`NB-XXXXXX`) and appears in *My appointments*, the owner's Appointments and the assigned barber's dashboard.
- **Rules:** a barber can never be double-booked (re-checked at the moment of saving, also across tabs). Customers see and cancel only their own appointments, up to the cancellation window (24 h by default). Barbers see and change only their own appointments, along the workflow: confirm; arrived / start on the day; **Done is always possible once the client is in the chair (also when started early)**; complete without starting, or no-show, only after the booked time; cancel only before it starts. The same rules apply to every barber account: `authorizeStatusChange` resolves the acting barber from the signed-in account's linked profile on every change (no barber is special-cased), and the owner can give any existing barber profile its own login (*Barbers → barber → Create login*). One rule (`barberStatusCheck` in `src/admin/data/store.tsx`) drives the buttons and the store, and `supabase/migrations/20261124000000_barber_status_rules.sql` enforces the same in the database; each refusal has its own message. Only the owner creates, edits or deactivates barber accounts.
- **Route protection** is decided from the signed-in role on every route, not just by hiding links: customers can't open `/admin/*`, barbers can't open `/admin/owner/*`, signed-out visitors are sent to the right login.
- **Forgot password** shows the reset code on screen (no email service yet).
- **Reset demo data:** owner → Settings → *Reset demo data*, or the link on `/admin`. Restores the sample data and the two built-in logins; removes registered customers.
- **Swap points for the real backend:** `src/demo/auth.ts` (`AuthService`), `src/demo/bookings.ts` and `src/demo/db.ts`. Screens only use these services. `npm run test:demo` runs the rule checks.

### Customer email verification (OTP)

Sign-up only creates a **pending** registration (kept apart from accounts; password only as a digest). The server function emails a 6-digit code from **NOIR BARBER CLUB <projects@veltri-x-agency.com>**; the account is created and signed in only after the correct code is entered. Unverified customers cannot sign in or book.

- **Server side** (`netlify/functions/verification-send.mts`, `verification-verify.mts`, logic in `netlify/lib/`): the code is generated and checked on the server, stored only as an HMAC for 10 minutes (Netlify Blobs — Netlify's built-in key-value storage, not a database), never returned to the browser. A new code replaces the old one; 5 wrong attempts lock the code; 60 s between codes; at most 5 codes per email and 20 per IP per hour.
- **Configuration** (Netlify → Site configuration → Environment variables, see `.env.example`): `VERIFICATION_SECRET` plus either `RESEND_API_KEY` (recommended) or `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`. Without them the site shows "We couldn't send the verification email right now" — it never pretends an email was sent.
- **DNS for veltri-x-agency.com** (records come from the provider's domain settings): SPF (TXT, e.g. `include:` of the provider; for Resend on the `send` subdomain), DKIM (TXT, e.g. `resend._domainkey`), and DMARC (`_dmarc` TXT, start with `v=DMARC1; p=none; rua=mailto:…`). Resend refuses to send from the domain until its records are verified.
- **Local test server:** `npm run build && npm run serve:functions` serves the site and the functions at `http://localhost:8888` with the same environment variables. `npm run test:verification` checks the server rules.
- **Password reset** still shows its code on screen (demo); it should move to the same email function before going live.

### Testing the three roles

1. **Owner:** open `/admin`, *Owner login*, sign in. All modules are in the sidebar; *Barbers → Create barber account* adds a barber who can sign in at the barber login.
2. **Barber:** open `/admin`, *Barber login*, sign in. *Today* shows the day and the next two weeks. Tap an appointment for the customer's details and the status buttons.
3. **Customer:** on the website, use the person icon in the menu (*Sign in*), then *Create an account* and enter the code from the email (needs the email settings above). Use *Book appointment*, pick a barber, service, date and time, and confirm. *My appointments* lists it. Sign in as owner and barber to see the same booking.

## NOIR Command Center (`/admin`)

A private management dashboard inside this project, at `/admin`. It isn't a separate site.

- **Status: demo mode.**
  - Fictional sample data, and a permanent "Demo mode" banner.
  - Changes are saved in this browser only (localStorage) and are never sent anywhere.
  - Sign-in is the local demo sign-in above, not Supabase.
- **Roles:**
  - *Owner*: full console with Overview, Appointments (day board / week / list with search, reassign, record payment), Clients, Barbers (create accounts, edit details, hours, time off, deactivate), Services & prices, Revenue, Gift cards (confirm payment → activate, redeem, delivery queue), Memberships, Reports and Settings (booking policy, permissions, audit log).
  - *Barber*: phone-first app with Today (next client, Arrived → Start → Done), Calendar, Clients (own only, no email), Schedule (read-only) and Profile (bio, specialty, Instagram, phone).
- **Languages:** EN / DE / SQ. Each person's choice is stored separately (`noir.admin.locale.<user>`).
- **Isolation from the public site:**
  - The dashboard is lazy-loaded from `src/main.tsx`, so the public homepage downloads none of it.
  - `public/_redirects` serves `/admin/*` and `/account/*`.
  - `public/_headers` marks `/admin` and `/account` `noindex` and `no-store`.
- **Code:** `src/admin/`
  - `data/`: types, demo seed, demo store mirroring the database permission rules
  - `owner/`, `barber/`: the two apps
  - `ui.tsx`, `charts.tsx`: building blocks
  - `i18n/`: dashboard copy

### Supabase (prepared, not yet connected)

- **`supabase/migrations/20261120000000_command_center.sql`** contains:
  - the schema and row-level security on every table
  - helper functions reading the role from `staff`
  - guard triggers (barbers: status-only edits along allowed transitions; limited profile fields; last-owner protection)
  - owner-only gift card functions (activation only after payment; unpaid cards can't be redeemed)
  - the double-booking constraint and an insert-only audit log
- **`supabase/tests/run.sh`** runs 55 permission tests (anonymous, owner, two barbers, a deactivated barber) against a throwaway local PostgreSQL. All pass.
- **`supabase/functions/invite-barber`** is the owner-only invitation function (Deno). It is untested until a Supabase project exists.
- **Still needed to go live:**
  1. Create a Supabase project in the EU (Frankfurt) and apply the migration.
  2. Deploy `invite-barber`.
  3. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (public by design).
  4. Swap the demo services (`src/demo/`) for Supabase Auth and the Supabase data layer; add a `customer` role with row-level security on its own appointments.
  5. Turn on owner two-factor sign-in.
