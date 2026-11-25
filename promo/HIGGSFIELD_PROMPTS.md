# NOIR BARBER CLUB — Higgsfield scene prompts (manual generation)

The delivered commercial uses **no AI-generated video**. Every interface on screen is a real capture of the
NOIR BARBER CLUB website and dashboards, staged in 3D with Three.js. Higgsfield was used only for the
narration (preset voice *Sloane*, `seed_audio`) and the instrumental music (`elevenlabs_music_v2`).

The prompts below are optional atmosphere inserts that can be generated in Higgsfield later and cut in
**between** chapters (never in place of the real UI). Rules for every prompt:

- No readable text, logos, screens or UI. The real interface must stay the only UI in the film.
- No people presented as real staff or customers of NOIR.
- Palette: deep charcoal / black, warm champagne gold (#d6b67f), soft cinematic key light, shallow depth of field.
- 16:9 master; generate a separate 9:16 take for Reels instead of cropping.

| # | Place in edit | Length | Prompt |
|---|---|---|---|
| A | Before the logo intro (0:00) | 3 s | Slow macro dolly across a polished straight razor resting on black marble, a thin line of champagne-gold light travels along the blade edge, fine dust in the air, dark charcoal background, shallow depth of field, luxury commercial, 24 fps film grain, no text. |
| B | Between Website → Owner (≈0:25) | 2 s | Top-down slow push over an empty premium barbershop counter at night, black stone, brushed brass details, soft warm practical lights blooming, reflections on the surface, cinematic, no people, no text, no screens. |
| C | Between Owner → Barber (≈0:58) | 2 s | Close-up of a barber chair's leather headrest and chrome lever in a dark room, a single warm spotlight slowly brightens, gentle haze, champagne-gold rim light, cinematic, no text. |
| D | Between Barber → Customer (≈1:19) | 2 s | Abstract glass panels floating in darkness, slowly rotating, catching warm gold reflections and soft caustics, glassmorphism, minimal, luxury tech, no text, no interface. |
| E | Under the end card (≈2:02) | 4 s | Slow orbit around a brass-and-black barber pole detail on a dark backdrop, light sweeps across the metal, subtle smoke, champagne highlights, elegant and calm, no text. |

Suggested Higgsfield settings: a cinematic text-to-video model at 1080p, 16:9 and 9:16 versions per insert, no
audio (the mix already contains music and narration). Check the price in Higgsfield before generating;
earlier quotes in this project were about 7.5 credits per 5 s clip for a fast model.
