# NOIR Command Center — audit & architecture proposal

Status: **proposal, awaiting approval**. Nothing in this document has been implemented yet.

## 1. Audit of the current project (commit `d265342`)

| Area | Today |
| --- | --- |
| Stack | Vite + React 19 + TypeScript, Tailwind CSS 4, GSAP/ScrollTrigger, Motion, Lucide. One page with section anchors; no router. |
| Languages | EN / DE / SQ via typed dictionaries (`src/i18n`). |
| Data | Barbers, services, prices, hours and reviews are hard-coded in `src/data/*`. All placeholders. |
| Booking | Full six-step UI, but availability is generated and nothing is stored. Clearly labelled as a demo. |
| Gift cards | Order form → pre-filled email to the shop, marked *pending payment*. The site never creates or activates a card. |
| Memberships / contact | Pre-filled contact form or `mailto:`. No storage. |
| Backend, database, auth | **None.** No server code, no user accounts, no stored records. |
| Hosting | Netlify site `noir-barber-club-preview`, deployed by uploading the built files (no Git-connected builds, no functions, no environment variables). |
| Tests | Playwright scripts (outside the repo): 92 interaction, 96 multilingual and 126 gift card checks, all passing. |

**What this means for the dashboard:** the Command Center needs a real database and real accounts before anything else. Every module the owner manages (barbers, hours, services, prices, appointments, gift cards, memberships) is currently either hard-coded in the website or not stored at all. So the plan has two parts: build the Command Center, and later switch the public site from demo data to the same database, one module at a time.

## 2. Recommended architecture

### 2.1 Backend: Supabase (Postgres + Auth + Row-Level Security + Edge Functions)

Hosted in the **EU (Frankfurt)** region, because the database will hold client personal data.

Why Supabase:
- **Permissions enforced by the database.** Every table has Row-Level Security policies keyed on the logged-in user. A barber who edits a URL or calls the API directly still gets only their own rows, because Postgres filters them.
- **Secure logins included:** hashed passwords, invites, password reset, sessions, and **two-factor authentication** for the owner.
- **Public sign-up switched off.** Accounts exist only because the owner invited them.
- **Free tier** is enough for one shop; it can be upgraded later.

Alternative considered: Netlify Functions + a separate Postgres + hand-written auth. Not recommended: more security-critical code for us to write and maintain, and permissions would live only in application code.

### 2.2 Roles and how they are enforced

- **`staff` table:** one row per account (`user_id`, `role` = `owner` | `barber`, `barber_id`, `active`).
  - The role is **never** taken from a sign-up form or from user-editable metadata.
  - Only the owner can insert into or update `staff`. The database blocks everyone else.
- **Helper functions:** `is_owner()` and `my_barber_id()` (`SECURITY DEFINER`, reading `staff` for `auth.uid()`) are used by every policy.
- **Inviting a barber:** only through a server function (`invite-barber`). It verifies the caller is an active owner, creates the auth user with an invite email, and creates the `staff` row with role `barber`. There is no other way to create an account.
- **Deactivating a barber:** sets `staff.active = false` and revokes their sessions. Their history is kept.
- **Owner safety:** the last active owner cannot be deactivated or demoted. Barbers cannot touch `staff`, so they cannot create administrator accounts.

| Data | Owner | Barber |
| --- | --- | --- |
| Appointments | all, full edit | **only their own**; may change **status** (and their own notes) only |
| Clients | all | **only clients with an appointment with them**; limited fields (name, phone, visit history with them, service notes). No email, marketing consent or other barbers' notes |
| Working hours, time off | all barbers | **read own** (time-off *requests* possible in a later phase) |
| Barber profile | all | **own row; only bio, photo, specialty, Instagram** (column-level grants) |
| Services & prices, plans, settings | full | read-only (what they need to see on appointments) |
| Gift cards, payments, redemptions | full | none |
| Revenue, reports | full | none: reports are owner-only views |
| Audit log | read | none |

**Defences against URL and API tampering:**
- The browser only ever uses the public *anon* key plus the user's session, so every query goes through these policies.
- The powerful *service role* key exists only inside server functions, never in the website.

### 2.3 Data model (first version)

- `barbers` (public profile, active, order)
- `staff` (accounts and roles)
- `working_hours` (barber, weekday, start, end)
- `time_off` (barber, from, to, reason)
- `services`, with name and description in EN/DE/SQ, duration, price, category, active
- `clients` (name, phone, email, notes, consent, created by)
- `appointments` (client, barber, service, start, end, status, price snapshot, source: online / phone / walk-in). A database **exclusion constraint** makes double-booking a barber impossible, even with two simultaneous bookings.
- `appointment_events` (status history)
- `gift_cards` (code **unique** in the database, amount, balance, status: inactive / active / void, expiry)
- `gift_card_orders` (purchaser, recipient, delivery method and channel, payment method, payment status: pending / paid / cancelled, delivery status)
- `gift_card_redemptions`
- `membership_plans`, `memberships` (client, plan, status, period)
- `payments` (ledger: cash, card in shop, cash on delivery, …)
- `business_settings` (single row: booking policy, cancellation window, cash on delivery on/off and area, opening hours)
- `audit_log` (actor, role, action, table, record id, before/after, time, IP)

Gift card rules are enforced inside the database, not in the browser:
- **Activation:** a card becomes `active` only through `confirm_gift_payment()`, which is owner-only and sets payment *paid* plus card *active* in one transaction.
- **Redemption:** `redeem_gift_card()` rejects inactive, unpaid, expired or over-balance cards.

### 2.4 Audit log

- **What's logged:** Postgres triggers on `staff`, `working_hours`, `time_off`, `services`, `appointments` (status and reassignment), `gift_cards`, `gift_card_orders`, `payments`, `memberships` and `business_settings` write a row automatically.
- **Who appears:** the acting user, read from the session; the browser can't set it.
- **Protection:** the log is insert-only. Nobody, the owner included, can edit or delete entries; the owner can read and filter them.

### 2.5 Frontend: same repository, separate app

- **Route:** the Command Center lives at **`/command`** in this repository and shares the NOIR design tokens (colours, type, pill buttons, mono labels).
- **Separate bundle:** it's a lazy-loaded chunk, so the public website's download size is unchanged. It's marked `noindex`.
- **New libraries (dashboard only):** `@supabase/supabase-js` for data and auth, `react-router` for dashboard routes, and TanStack Query for loading, caching and live refresh.
- **One login:** the screen is the same for everyone. After sign-in the role decides which app loads, and the database enforces it again on every request.
- **Owner Command Center** (desktop-first, works on tablet):
  - Today (agenda across all chairs, takings, alerts)
  - Calendar (day/week by barber)
  - Appointments
  - Clients
  - Barbers & access (invite, deactivate, roles)
  - Schedules (hours, time off)
  - Services & prices
  - Gift cards (orders, mark paid → activate, redeem, mark delivered, manual-delivery queue)
  - Memberships
  - Reports (revenue, bookings, chair utilisation, no-shows)
  - Settings (business details, booking policy)
  - Audit log
- **Barber app** (mobile-first, one-handed use):
  - **Today** timeline with the next client up top
  - big status buttons: *Arrived → In chair → Done*, plus *No-show*
  - client card (name, phone, notes, last visits with them)
  - week view
  - my hours and time off
  - my profile
  - installable on the home screen (PWA)

### 2.6 Hosting and secrets

- **Netlify (unchanged), switched to Git-connected builds** so every deploy is reproducible.
- **Public values** (Supabase URL and anon key) go in Netlify environment variables. They're public by design and safe because of row-level security.
- **The service role key** lives only in Supabase function secrets, never in the website or the repository.

### 2.7 Testing

- **Permission test suite:** SQL tests run as owner, as barber A, as barber B and as an anonymous visitor. They assert, for example, that barber A cannot read barber B's appointments or clients, cannot change prices, cannot read reports, cannot insert into `staff`, and cannot activate a gift card.
- **Browser tests** for both dashboards on desktop and phone, alongside the existing public-site suites.

## 3. Phased delivery

| Phase | Scope | Public site affected? |
| --- | --- | --- |
| 0 | Supabase project, schema, row-level security, audit triggers, permission test suite, seed data from current placeholders | No |
| 1 | Command Center shell, login, roles, owner: barbers & access, schedules, services & prices, settings, audit log | No |
| 2 | Appointments: owner calendar and the barber app. Then switch the public booking from demo to real (separate go-ahead) | Booking only, after approval |
| 3 | Clients | No |
| 4 | Gift cards & payments (replaces the email order flow), memberships | Gift card form, after approval |
| 5 | Reports & analytics | No |

The public website stays exactly as it is until a phase explicitly switches one of its modules to live data, and each switch needs your approval.

## 4. Decisions needed before Phase 0

1. **Backend:** approve Supabase (EU) and create the project (free). The owner account must be created by you, so you hold the keys. I'll ask for the project URL and keys through a secure form, never in chat.
2. **Dashboard language(s):** EN / DE / SQ like the website, or one language.
3. **Real business data:** real barbers, services, prices and hours to seed, or keep the placeholders until launch.
4. **Payments:** memberships and gift cards keep recording cash / in-shop payments manually, since no online payment provider exists. Online payment would be a later, separate project.

## 5. Out of scope for now

- Online card payments and automatic subscription billing
- Automatic SMS / WhatsApp / email sending: it needs provider accounts; until then the dashboard shows a *manual delivery* queue
- A client-facing account area
- Payroll and commission calculations
