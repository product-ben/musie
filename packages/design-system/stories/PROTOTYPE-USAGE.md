# PROTOTYPE-USAGE.md

**Read this instead of the prototype.** Every story agent uses this file and
never opens the prototype itself — it is 175 KB and reading it more than once
is the most expensive mistake available in this session.

Source: `reference/design_system/Musy MVP 0.3.dc.html` (175,635 bytes), plus its
data file `reference/design_system/data/mindfulness-cards.js`. Read once, on
2026-09-17, and reduced to this.

> **Path note.** The brief names `reference/musie_mvp_0.3.html`. No such file
> exists. The prototype is `reference/design_system/Musy MVP 0.3.dc.html`.
> Logged in OPEN-QUESTIONS.md.

> **Terminology note, 2026-09-18.** The product term for a Method is now
> **exercise**. This document deliberately keeps saying *Method* — it
> describes the PROTOTYPE, whose screens are named `METHOD FLOW` and
> `METHOD RECOMMENDATION` and whose data file exports `methods`, and renaming
> them here would make this file misdescribe the artifact it exists to
> summarise. In `apps/web` and the database the tables, routes and identifiers
> are `exercises` / `exercise_i18n` / `exercise_situations` / `/exercises`.
> Note the prototype's own COPY already said "exercise" — "Start Exercise",
> "Complete Exercise with this card" — so the rename brought the code in line
> with the copy rather than the other way round.

**The prototype is a MARKUP MIRROR.** It hand-writes HTML carrying the design
system's class names; it does not import the components. Follow its *intent* —
which variant, which size, which copy — never its markup. Where it writes
`<button class="musy-btn musy-btn--primary">`, the component call is
`<CtaButton variant="primary">`.

The prototype is **English**. Several components default to German copy. That
is a real conflict; see OPEN-QUESTIONS.md.

---

## The twelve screens

| Screen | What it is |
|---|---|
| NAVBAR | Sticky header. Custom pattern, not a component |
| ONBOARDING | "Hi, I'm Musie." + a 5-slide carousel + "Start a session" |
| ABOUT YOU | "And who are you here as?" — image radio, 4 options |
| METHOD RECOMMENDATION | "What would you like to start with now?" — rich cards |
| METHOD FLOW — wizard | 4 steps: Intro · Select Card · Listen · Reflect |
| END | "Session complete" + share by email |
| CONTEXT COLUMN | Wide-screen second column, "This session" |
| SCRIM | Shared by sheets and lightboxes |
| LEFT NAVIGATION DRAWER | Custom pattern |
| RIGHT PROFILE / SETTINGS | Custom pattern; holds the Switch |
| LIGHTBOX · NOT IMPLEMENTED | "Not implemented yet" |
| LIGHTBOX · METHOD DETAIL | "Quick Mindfulness Break" |

---

## Icon — 45 usages, the most used thing in the system

| Where | size | inline | Note |
|---|---|---|---|
| NAVBAR | `md` | no | Hamburger, profile — inside IconButton |
| ONBOARDING | `xl`, `md` | no | Carousel slide glyphs |
| ABOUT YOU | `sm` | no | Radio card check |
| METHOD RECOMMENDATION | `sm` ×7 | no | Card fact glyphs (clock, deck, sound) |
| METHOD RECOMMENDATION | `md` | **yes** | Leading icon in "Let Musie pick an exercise", "Back" |
| METHOD FLOW | `md` ×8, `lg` ×2, `xl`, `sm` | mixed | Transport, wizard marker, step glyphs |
| METHOD FLOW | `md` | **yes** | "Back" ×3, "Scroll up" |
| END | `md` ×2, `sm` | `md` inline for "Send reflection" |
| DRAWER / SETTINGS | `md`, `sm` ×4 | no | Nav and settings rows |
| LIGHTBOXES | `md` | no | Close buttons |

**`md` is the normal size.** `inline` is set whenever the icon leads a button
label. `sm` is for metadata and compact card facts. No `tone` is ever set in
the prototype — every icon inherits its colour from its container.

---

## CtaButton — 28 usages

| Screen | variant | size | Copy |
|---|---|---|---|
| ONBOARDING | `primary` | default | **"Start a session"** — `disabled` until the carousel has been seen |
| ABOUT YOU | `primary` | default | **"Continue"** — `disabled` until a type is picked |
| METHOD RECOMMENDATION | `ghost` | default | **"Let Musie pick an exercise"** (leading icon) |
| METHOD RECOMMENDATION | `ghost` | default | **"Back"** (leading icon) |
| METHOD FLOW | `ghost` | default | **"Back"** ×3 (leading icon) |
| METHOD FLOW | `primary` | default | **"Continue"** |
| METHOD FLOW | `secondary` | default | **"Simulate scan"** |
| METHOD FLOW | `secondary` | default | **"Scan a different card"** |
| METHOD FLOW | `primary` | default | **"Complete Exercise with this card"** |
| METHOD FLOW | `secondary` | **`guided`** | **"Track details & Player"** |
| METHOD FLOW | `primary` | **`guided`** | **"Start Reflection"** |
| METHOD FLOW | `primary` | default | **"Continue exercise"** |
| METHOD FLOW | `secondary` | default | **"Show details & player"** |
| METHOD FLOW | `ghost` | default | **"Scroll up"** (leading icon) |
| METHOD FLOW | `secondary` | default | **"Choose photo"** |
| METHOD FLOW | `secondary` | default | **"Answer after all"** |
| METHOD FLOW | `ghost` | default | **"Not right now"** |
| METHOD FLOW | `primary` | default | **"Finish session"** |
| END | `secondary` | default | **"Send reflection"** (leading icon) |
| END | **`accent`** | default | **"Start again"** |
| LIGHTBOX · NYI | **`accent`** | default | **"Back to the choice"** |
| LIGHTBOX · DETAIL | `primary` | default | **"Start Exercise"** |

**Intent:** `primary` = the one way forward. `secondary` = a real but lesser
action. `ghost` = Back, and anything that does not advance the flow.
`accent` appears exactly twice, both times for *start over / go
back to choosing* — a restart, not a primary. `guided` (64px) is used only in
the Listen step, where the user may be across the room.

`loading` is never used in the prototype. Neither is `size="min"`,
`size="comfort"`, `block`, `wrap`, or `accent-alt`.

---

## IconButton — 10 usages

| Screen | variant | size | `label` |
|---|---|---|---|
| NAVBAR | `ghost` | `primary` | **"Open menu"** |
| NAVBAR | `ghost` | `primary` | **"Open profile and settings"** |
| ONBOARDING | `secondary` | `primary` | Carousel prev |
| ONBOARDING | (default ghost) | `primary` | Carousel next |
| METHOD FLOW | `primary` | **`guided`** | Play / pause in the Listen step |
| METHOD FLOW | `primary` | `primary` | Transport |
| METHOD FLOW | `ghost` | `primary` | ×2 |
| DRAWER | `ghost` | `primary` | Close |
| SETTINGS | `ghost` | `primary` | Close |

**`ghost` at `primary` (44px) is the default posture.** `guided` appears once,
on the Listen play control. `min` and `comfort` never appear. The prototype
writes the class `musy-icon-btn--primary-size`, which is `size="primary"`.

---

## ContentBox — 12 usages

| Screen | outline | header | Headline copy |
|---|---|---|---|
| ONBOARDING | default `solid` | no | **"Hi, I'm Musie."** at `display-lg`, body at `stage`, then `body-lg` |
| ONBOARDING | `solid` | no | **"How we play with music"** at `heading-md`, carousel in the slot |
| ABOUT YOU | `solid` | no | **"And who are you here as?"** |
| METHOD RECOMMENDATION | `solid` | no | **"What would you like to start with now?"** |
| METHOD FLOW | **`framed`** (header slot) | **yes** | The framed variant appears once |
| METHOD FLOW | `solid` | no | |
| END | `solid` | no | **"Session complete"** |
| CONTEXT COLUMN | **`sunken`** | no | **"This session"** |
| SETTINGS | `solid` | no | **"Settings"**, **"Your account"** |
| LIGHTBOX · NYI | `solid` | no | |
| LIGHTBOX · DETAIL | `solid` | no | |

`headlineStep` is set explicitly and varies: `display-lg`, `heading-md`,
`heading-sm`. **`stage` is used** as a `textStep` on the opening box.
`outline="dashed"` never appears in the prototype.

---

## ContentList — 6 usages, always `<dl>` term/definition pairs

| Where | `label` | Rows |
|---|---|---|
| METHOD FLOW · scan | "Your card" | **"Your card"** → card title · **"Listening instructions"** → text |
| METHOD FLOW · intro | "Setting up" | |
| METHOD FLOW · listen | "Track details" (`aria-live="polite"`) | **"Track"**, **"Artist"**, **"Your card"**, **"Listening instructions"** |
| CONTEXT COLUMN | "Your choices so far" | Repeated term/value |
| SETTINGS | "Your account" | **"Email"** → "ldamn@nitz.com" |
| LIGHTBOX · DETAIL | "Method details" | **"You need"** → "Your physical Mindfulness Cards deck" · **"Guideline"** → "Work with the card you are drawn to, not the one you think you should pick." · **"Duration"** → "About 15 minutes" |

`contentStep` is `body-md` everywhere. No media and no nested list is used.

---

## RadioGroupText — 4 usages, always `accent`

| Screen | Legend | Options |
|---|---|---|
| ABOUT YOU | (situations) | **"Feel my feelings"**, **"Get the day started"**, **"Relax during a busy day"** |
| METHOD RECOMMENDATION | | same three |
| SETTINGS | **"Here as"** | hint: **"Musie uses this to narrow down the Methods it offers you."** |
| SETTINGS | **"Language"** | **"English"**, **"Deutsch"** — hint: **"German arrives in the next iteration."** |

**Every single use is `accent="accent"`.** The `primary` default
never appears. `guided` is never used.

---

## RadioGroupImage — 1 usage

ABOUT YOU, `accent`, legend **"And who are you here as?"**.
Four options, all pointing at the same placeholder image:

| value | label | imageAlt |
|---|---|---|
| `by-myself` | **"By myself"** | "Placeholder artwork for using Musie by yourself" |
| `with-a-group` | **"With a group"** | "Placeholder artwork for using Musie with a group" |
| `with-my-partner` | **"With my partner"** | "Placeholder artwork for using Musie with your partner" |
| `with-a-patient` | **"With a patient"** | "Placeholder artwork for using Musie with a patient" |

Only `by-myself` is implemented; the other three open the "Not implemented yet"
lightbox. The prototype does **not** use the `disabled` prop for this — it
routes to a lightbox instead.

---

## RadioCards — 2 usages

METHOD RECOMMENDATION, legend **"What would you like to start with now?"**,
`accent`. Headline `heading-sm`, description `body-md`.

| name | description | image |
|---|---|---|
| **"Quick Mindfulness Break"** | "Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it." | `assets/web/method-card.png`, alt "The Mindfulness Cards deck laid out on a table" |
| **"Breathing Score"** | "A slow score that follows your breath, for settling before anything else." | same image, alt "Placeholder artwork for the Breathing Score Method" |

The prototype puts three **Hint**-wrapped facts in each card, and a legend
above the group explaining the three glyphs. The component's `label` prop is
the nearest equivalent; the facts row is prototype-only markup.

---

## Hint — 3 usages, all inside a RadioCards card

| Bubble text |
|---|
| duration, e.g. **"2–12 minutes"** (built from `timeframeMin`/`timeframeMax`) |
| **"Needs your Mindfulness Cards deck"** |
| **"Sound on — headphones recommended"** |

Always wraps a small glyph. Always inside a card that is itself a control —
which is exactly the case Hint's header says it exists for.

---

## InteractiveWizard — 1 usage, `accent`

`label="Method steps"`. Four steps, in order:

| id | label |
|---|---|
| `intro` | **"Intro"** |
| `scan` | **"Select Card"** |
| `listen` | **"Listen"** |
| `reflect` | **"Reflect"** |

States used: `disabled`, `active`, `selected`, `completed`, with
`aria-current="step"` on the current one. `WizardPanel` is used for each step's
body, with `musy-wizard__actions` holding the step's buttons. The prototype
does **not** render state words under the labels.

---

## Logo — 2 usages

| Where | size | wordmark |
|---|---|---|
| NAVBAR | `nav` | **yes** — "Musie" |
| DRAWER | `nav` | **yes** — "Musie" |

`size="splash"` never appears. Note the wordmark reads **"Musie"**; the
component's `alt` default is `'Musy'`. Flagged in OPEN-QUESTIONS.md.

---

## Switch — 1 usage

SETTINGS, `reverse` + `accent`. Label **"Dark mode"**.
Knob glyphs are a **Moon / Sun** pair, not the component's Check / X default —
exactly the domain-pair case `onGlyph`/`offGlyph` documents.
`guided` and `labelHidden` never appear.

---

## SegmentedControl — 1 usage, `accent`

METHOD FLOW · Reflect. Legend **"How would you like to answer?"**.
Three options, each with a glyph:

| value | label | glyph |
|---|---|---|
| `voice` | **"Record audio"** | microphone |
| `write` | **"Write answer"** | pencil |
| `photo` | **"Take photo"** | camera |

Default selection is `voice`.

---

## Field — 4 usages

| Where | multiline | Label | Description / error |
|---|---|---|---|
| METHOD FLOW · reflect | **yes** (textarea) | **"Your written answer"** | desc: **"Nothing leaves your device until you share it."** |
| METHOD FLOW · voice | no (label only) | **"Your spoken answer"** | desc: same sentence |
| METHOD FLOW · photo | no (label only) | **"Photo of your handwritten notes"** | desc: same sentence |
| END | no, `type="email"` | **"Email address"** | desc: **"Only the answer you just gave is sent. Nothing else from your session."** — plus a `role="alert"` error and `aria-invalid` |

The email field is the only one that shows an **error** state.

---

## MusicPlayer — 1 usage

METHOD FLOW · Listen. Title is the track name. Scrubber thumb carries
`aria-label="Playback position"` — the component's own `seekLabel` default.
States driven by `data-state`: `paused` / `playing` / `ended`.
Accent is the default `primary`.

## TrackButton — 2 usages

Both in METHOD FLOW · Listen, both carrying `musy-mbtn__time` with the
remaining time.

| variant | size | Note |
|---|---|---|
| (primary, base `musy-btn`) | **`guided`** | The main listen control |
| `secondary` | default | The compact one |

---

## RecordButton — 1 usage

METHOD FLOW · Reflect, inside the VoiceNote control, `musy-btn--primary` +
`musy-rec`, driven by `data-state`. Renders `musy-rec__meter` (aria-hidden bars)
and `musy-rec__time`. Confirms: primary variant, default size, meter only while
recording.

---

## PhotoUpload — 1 usage

METHOD FLOW · Reflect. Label **"Photo of your handwritten notes"**.
Empty zone text: **"Drag a photo here, or choose one from your device."**
Choose button: **"Choose photo"** (`secondary`).
Preview: thumb `assets/web/method-card.png`, alt = the label, plus name and
size, and preview actions.
Description: **"Nothing leaves your device until you share it."**

---

## Lightbox — 2 usages, both controlled

| Title | Content |
|---|---|
| **"Not implemented yet"** | The thing's name, then a `accent` CTA **"Back to the choice"** |
| **"Quick Mindfulness Break"** | Subtitle "For getting aware of feelings", a ContentList of method details, and a `primary` CTA **"Start Exercise"** |

Both use `data-type-step="heading-md"` on the headline — the component's own
hardcoded value. Both render a close button with `aria-label="Close"`.
`mandatory` is never used.

---

## ButtonGroup — 2 usages

| align |
|---|
| `end` — the wizard's action row |
| `center` |

`align="start"`, the component's **default**, is never used in the prototype.
See OPEN-QUESTIONS.md — this is the L6 contradiction.

---

## ProcessVisualisation — 0 usages

Does not appear. The prototype uses a **carousel** for the onboarding sequence
instead, which has no component. `ProcessVisualisation`'s CSS section is marked
RETIRED. Write its stories from the component source and docs only.

---

## Components used by the prototype that are NOT in the system

- **Carousel** (`musy-carousel--accent`, ONBOARDING) — ~200 lines
  of CSS, no component, no export.

## Components the prototype uses that ARE in the system

> **CORRECTED 2026-09-18.** This section previously read "Components the
> prototype uses that were **deleted**" and listed Message and Badge. Both
> claims were wrong, and the Message one cost real work: Phase 2.4 was briefed
> to render errors as plain text *because* "the design system has NO Message
> component — deliberately deleted, nothing replaces it", and a custom
> `.musie-error` pattern was written in `apps/web` before the claim was
> checked. It was then deleted again in favour of `Message`. Everything below
> is verified by file, export and stylesheet rather than recalled.

- **Message** — 3 usages, and the component is **present and exported**:
  - `src/Message.tsx` (4,019 bytes)
  - `src/index.ts:54-55` exports `Message` plus `MessageProps` /
    `MessageVariant` / `MessageLive`
  - `.musy-msg` and `.musy-msg--{info,warning,success,error}` in
    `musy-components.css`
  - imported by `RadioCards`, `RadioGroupText` and `RadioGroupImage` for their
    `error` prop — so it **could not be removed** without breaking three
    shipped components

  Prototype markup: one `musy-msg--info` ("Info: Prototype control") and two
  `musy-msg--success` ("Success: …", `role="status"`).

  `docs/10-layout.md` L11 names it for the case a screen most often needs:
  *a fatal problem, injected after load, inline where it happened, with
  `live="assertive"`*. `apps/web` uses it for exactly that on `/methods`.

  **One gap when consuming it from a bilingual app:** the visually hidden
  status word (`Fehler` / `Hinweis` / `Warnung` / `Erfolg`) comes from a module
  constant with no prop, so an English screen announces "Fehler: This content
  could not be loaded" to a screen reader. Logged in
  `apps/web/OPEN-QUESTIONS.md`; the fix is a `statusWord?: string` prop.

Nothing in this section needs re-adding. Badge was also never deleted, but the
prototype's markup does not use it at all — `musy-badge` appears **0 times** —
so it has moved to the next section, where it belongs.

---

## Components with no prototype usage at all

`Badge`, `Toast`, `DraggableList`, `ProcessVisualisation`,
`ContentBox outline="dashed"`, `FieldItem`, `FieldGroup`, `useCoarsePointer`.
Write these from the component source and
`reference/design_system/docs/07-components.md` only.

`Badge` is present and exported (`src/Badge.tsx`, `src/index.ts:51-52`, 23
`musy-badge` rules in the stylesheet) — it is simply unused by this prototype.
It was previously listed as deleted; see the correction above.
