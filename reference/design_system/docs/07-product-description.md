# Musie — what the app does

*Plain-language product description, written to be handed to someone with no
access to the prototype. Reflects `Musy MVP 0.2.dc.html` (clickdummy) and
`data/mindfulness-cards.js` (placeholder content) as of 4 Sep 2026.*

---

## One line

Musie is a guided music app that pairs a **physical deck of feeling cards**
with **curated music and a structured reflection** — you scan the card that
matches how you feel, listen to the track behind it, answer one question, and
optionally send that answer to someone who matters to you.

## The problem it addresses

People know that music changes how they feel, but they use it passively — as
background, not as a practice. Mindfulness apps, meanwhile, ask for stillness
and attention that many people cannot produce on demand. Musie sits between the
two: the physical card does the "choosing how I feel" work that a blank app
screen makes hard, the music does the emotional work, and the app supplies only
the structure — sequence, instruction, and a place to put the answer.

## Who it is for

The prototype asks the user, up front, who they are here as. Four contexts are
defined; **only the first is built**:

| Context | Status |
| --- | --- |
| **By myself** — solo personal practice | Built |
| **With a group** — facilitated group session | Named, not built |
| **With my partner** — shared/couple use | Named, not built |
| **With a patient** — therapeutic/clinical use | Named, not built |

That list is the product's expansion path, and it matters commercially: the
same card deck and method engine serve a consumer, a facilitator and a
clinician market with different pricing logic.

## The hybrid product model

Musie is **not app-only**. The core method requires a physical artefact: the
*Mindfulness Cards* deck — nine cards, one feeling each (Joy, Sadness, Anger,
Fear, Calm, Longing, Gratitude, Loneliness, Hope), laid out in a 3 × 3 grid.
Each paper card carries a **QR code** that the app scans to load that feeling's
listening instruction, music track and reflection question.

So there are three revenue-relevant surfaces: the deck (physical goods), the
app (the guidance layer), and the method library (content that can grow without
new hardware).

## The session flow

1. **Onboarding** — a five-card carousel explaining the deal: Musie learns your
   situation, recommends music-based Methods for it, gives you curated music
   plus instructions, guides a reflection, and helps you share it if you want.
   The primary CTA stays locked until the user has seen the whole carousel.
2. **Who are you here as?** — the context question above. Picking an unbuilt
   context surfaces an honest "not implemented yet" dialog rather than a dead
   end. The answer is asked once and then lives in Settings.
3. **Methods for you** — a filtered list of Methods matched to the context and
   situation. Three Methods exist in the data (*Mindfulness Cards*, ~15 min,
   needs the deck; *Breathing Score*, ~8 min; *Body Scan Soundwalk*, ~20 min);
   only Mindfulness Cards is implemented. Each is shown with an image, a
   description, a duration and what it requires.
4. **The Method flow** — a five-step wizard, the heart of the product:
   - **Sort your cards** — find the triangle-marked cards, lay them out 3 × 3.
   - **Scan** — point the camera at the QR on the card you are drawn to. (The
     prototype simulates this; no camera is used.)
   - **Listen** — the app shows the card's specific listening instruction
     (e.g. for Anger: listen loudly, let the volume carry it) and plays the
     track **in the app**, from audio musie serves. The track name and artist
     are withheld until the listener deliberately reveals them, so the
     reflection is not primed by the title. It acknowledges the moment when the
     track ends. (MVP 0.3 — replaces the Spotify hand-off.)
   - **Reflect** — one question tied to the card ("What is the anger
     protecting?"). Answerable three ways: **voice message**, **typed text**,
     or a **photo of handwritten notes**.
   - **Share** — optionally email the reflection to one person. Only that
     answer is sent, nothing else from the session.
5. **Session complete** — a close, with the option to start again.

Throughout, a side panel shows the session's accumulated context — who you are
here as, which Method, which card — so the user can always see the state of
their own session.

## Product principles visible in the build

- **The user picks, the app never diagnoses.** Musie recommends from a
  situation the user named; it does not infer mood or score anyone.
- **Guideline over instruction.** "Work with the card you are drawn to, not the
  one you think you should pick."
- **Privacy as a stated promise.** Every reflection input carries the line
  *"Nothing leaves your device until you share it."* Sharing is explicit,
  single-recipient, and limited to the one answer.
- **Honest about what is not built.** Unimplemented paths say so rather than
  faking depth.
- **Accessibility is a first-class constraint,** not a retrofit. The design
  system behind it is WCAG-audited: contrast ratios verified in both themes,
  minimum 44px touch targets (56px+ on primary actions), reduced-motion honoured
  at the token level, and a body-text floor of 17px.

## What exists today

A clickable, end-to-end **prototype** of the solo Mindfulness Cards path,
running on a documented design system (tokens, components, contrast audit,
conflict and open-questions logs). Working: onboarding, context selection,
Method recommendation, the full five-step wizard, all three reflection input
modes, share, session end, settings, dark/light theming, and responsive layout
from 393px to desktop.

Not built: camera QR scanning (simulated), the audio files themselves (the
transport is real; a missing file falls back to a clock at the card's real
length), accounts and persistence, the other three user contexts,
the other two Methods, and any backend. All card content, tracks, questions and
artwork are **placeholder** — the authoritative source is an unconnected
Mindfulness Cards spreadsheet, and swapping it in is a single-file edit.

## Dependencies worth flagging for a business case

- **Audio is self-hosted** as of MVP 0.3. The Spotify hand-off was dropped for
  three independent reasons: its embed serves 30 seconds on mobile (where the
  product lives, since the cards are scanned with a phone), its policy forbids
  hiding cover art and metadata (the whole premise of the Listen step), and its
  Play Button is not licensed for commercial use. The consequence is a
  **music licensing decision**: the nine tracks must be cleared for commercial
  use, and the Mindfulness Cards sheet needs an audio column per card.
- **The physical deck must exist and ship** for the flagship Method to work.
- **Content production** — every card needs a curated track, a listening
  instruction and a reflection question. That is an editorial cost per card and
  per Method, not a one-off.
