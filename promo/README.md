# NOIR BARBER CLUB — promo film tooling

Isolated from the app: nothing here is imported by the website, its build, or its deployment config.
It has its own `package.json` (three, gsap, esbuild).

## What the film shows (storyboard)

| Time | Chapter | Real screens used (captured from the local production build) |
|---|---|---|
| 0:00–0:03 | Intro | 3D extruded NOIR wordmark (from `src/assets/logo-mark.svg`), gold light sweep |
| 0:03–0:25 | 01 Website | Hero, barbers, services & prices, gallery, membership, gift cards, visit/map, EN→DE→SQ hero, mobile hero |
| 0:25–0:58 | 02 Owner | `/staff-login`, Overview KPIs, Appointments day board, Clients, Barbers + "Create barber account", Services, Revenue, Gift cards, Memberships, "one workspace" constellation |
| 0:58–1:19 | 03 Barber | Staff sign-in as Idris Haddad, Today, next client card, Arrived → Start → Done, Calendar, Schedule |
| 1:19–2:01 | 04 Customer (phone) | Register, Verify Your Email (6-digit code), signed in, Sign in, barber → service → date → time → review → confirm, booking reference, My appointments, details sheet with Cancel |
| 2:01–2:13 | End | NOIR logo, Owner · Barber · Customer, "THE FUTURE OF THE BARBERSHOP EXPERIENCE." |

On-screen honesty notes: the dashboards are labelled as demo data; during the email step the film notes that the
code was read from a local test mail capture (no real inbox is shown); the booking is labelled as a demo booking
with no payment taken.

## Pipeline

1. `capture/capture.cjs <baseUrl> <outDir>` — drives the real app (desktop 1600×900 @2×, iPhone 14 @3×) and saves
   JPEG stills + tap positions (`manifest.json`). The customer email code comes from the local Resend test double.
2. `tools/tighten.py` — caps long pauses in each narration file and exports speech segments.
3. `tools/align.py cues.json <voDir> build` — aligns subtitle cues to the speech segments, writes `build/timeline.json`
   and `build/subtitles.en.srt`.
4. `npm run build` — bundles `compositor/main.js` (Three.js scene + GSAP easing). Every frame is a pure function of time.
5. `tools/render.cjs --w 1920 --h 1080 --cap <capDir> --out video.mp4` (and `--w 1080 --h 1920` for Reels) —
   deterministic frame-by-frame render through headless Chromium.
6. `tools/mix.py` — narration + re-edited, levelled and ducked music + synthesised UI clicks/whooshes, loudness −15 LUFS.
7. ffmpeg mux + light colour grade → final MP4s.

Audio sources: narration = Higgsfield `seed_audio`, preset voice "Sloane"; music = Higgsfield `elevenlabs_music_v2`
(instrumental). Optional AI atmosphere inserts are described in `HIGGSFIELD_PROMPTS.md` (not generated).
