# 09 · Clickdummy handoff — for Claude Code

The prototype is `Musie Clickdummy.dc.html`. It exists so the flow can be
**previewed in this workspace**, which has no bundler and cannot run the
`.tsx` component package. It is therefore a **markup mirror**: it loads the
real stylesheets unmodified and reproduces each component's documented anatomy
verbatim — same elements, same class names, same `data-*` state hooks — and
adds **no CSS of its own**.

## The one rule

**Do not recreate any component.** Every block in the clickdummy already
corresponds to a released component in `components/`. Rebuilding the app means
deleting the markup and importing the component — never porting the markup into
a new file, never re-deriving the CSS, never adding a "prototype" variant.

```ts
import {
  Icon, IconButton, MusyTooltipProvider, CtaButton, Switch,
  RadioGroupText, RadioGroupImage, RadioCards, ProcessVisualisation,
  ContentBox, Message, ContentList, Lightbox, Logo,
  Field, FieldItem, FieldGroup, InteractiveWizard, WizardPanel,
  PhotoUpload, VoiceNote,
} from './components';
```

## Stylesheet load order — unchanged

```ts
import 'tokens/musy-foundations.css';
import 'tokens/musy-foundations-amendments.css';   // token gaps G1, G2
import 'components/musy-components.css';
```
`tokens/theme-init.js` must load **synchronously in `<head>`, before any
stylesheet** (FOUC). It owns `data-theme` on `<html>` and the `musy-theme`
localStorage key. Do not add a second theme mechanism.

## App shell requirements

| Requirement | Why |
|---|---|
| `isolation: isolate` on the root wrapper | portaled popups clear local `z-index` |
| `body { position: relative }` | iOS 26+ Safari backdrops |
| one `<MusyTooltipProvider>` near the root | stops the open delay re-running between neighbouring icon buttons |
| `lang` on the document | `--text-hyphens: auto` does nothing without it. **`lang="en"` for this iteration**; German is the next one |

## Screen → component map

| Screen / part | Clickdummy markup | Real component |
|---|---|---|
| Navbar | custom `<header>` | permitted custom pattern · uses `Logo` + 2 × `IconButton variant="ghost"` |
| Left drawer | custom fixed panel | permitted custom pattern · `ContentBox outline="dashed"` + `IconButton` inside |
| Right settings sheet | custom fixed panel | permitted custom pattern · `ContentBox`, `ContentList`, `Switch`, `RadioGroupText` inside |
| Onboarding | `article.musy-box` + `ol.musy-process` | `ContentBox` + `ProcessVisualisation steps={5} ordinalPrefix="Step"` + `CtaButton` ("Got it!") |
| User type | `fieldset.musy-radio-group` + `button[role=radio]` | `RadioGroupText` — see **open item 1** |
| Situation | same | `RadioGroupText` |
| Method recommendation | `div.musy-rcard-group` + `button.musy-rcard__body` | `RadioCards` |
| Method detail | `div.musy-lightbox__popup` | `Lightbox` framing `ContentBox` + `ContentList` + `CtaButton` |
| Step rail | `nav.musy-wizard` | `InteractiveWizard steps current completed onStepChange` |
| Step panels | `div.musy-wizard__panel` | `WizardPanel actions={…}` |
| Step 1 instructions | `dl.musy-clist` with `ol.musy-clist__numbers` | `ContentList` with `list: { ordered: true, items }` |
| QR reader | custom square viewport | permitted custom pattern · `Message variant="info"` carries the Simulate-scan `CtaButton` as its single `action` |
| Card scanned | `div.musy-lightbox__popup` | `Lightbox` + `ContentBox` + `ContentList` + `Message` + `CtaButton` |
| Listen | `dl.musy-clist` + `div.musy-msg` + radio group | `ContentList` + `Message` + `RadioGroupText` |
| Reflect — mode | radio group | `RadioGroupText` (voice is the default, per the flow) |
| Reflect — voice | `div.musy-voice` | `VoiceNote state elapsed duration position playing on*` |
| Reflect — written | `textarea.musy-field__control--textarea` | `Field multiline` |
| Reflect — photo | `div.musy-upload` | `PhotoUpload value onValueChange previewAlt` |
| Share | `input.musy-field__control[type=email]` | `Field type="email"` |
| Not implemented | `div.musy-lightbox__popup` | `Lightbox` + `ContentBox` + `CtaButton` |
| End | `div.musy-msg--success` | `ContentBox` + `Message variant="success"` + `CtaButton` |

## Delete on port — preview-only scaffolding

All of it lives in the logic class of `Musie Clickdummy.dc.html`, between the
`SCAFFOLDING` and `END SCAFFOLDING` banners, plus two helpers. Every line
stands in for something base-ui already does.

| Scaffolding | Owned in the real app by |
|---|---|
| `componentDidMount` Escape handler | base-ui `Dialog` |
| Tab-cycle focus trap | base-ui `Dialog` |
| `componentDidUpdate` focus-into / focus-restore | base-ui `Dialog` |
| `document.body.style.overflow` scroll lock | base-ui `Dialog` |
| shared scrim `<div>` + `onClick` close | `Dialog.Backdrop` |
| `onRadioKeys` roving arrow keys | base-ui `RadioGroup` |
| `_radios()` roving-tabindex helper | base-ui `RadioGroup` |
| `_pickers` closure memoisation | not needed — React components take props |
| inline `<svg>` glyph paths | `<Icon glyph={LucideGlyph} />` |

## Data

`data/mindfulness-cards.js` assigns `window.MUSIE_DATA` and is **placeholder
content** — the Mindfulness Cards Google Sheet was not connected. Shape:

```
user        { name, email }
userTypes   [{ id, label, implemented }]
situations  [{ id, label }]
methods     [{ id, name, description, meta, image, imageAlt, implemented,
              needs, guideline, duration }]
matches     { situationId: [methodId] }
cards       [{ id, code, feeling, listening, question,
              audio: { src, title, artist, duration } }]   // 9, the 3x3 grid
```

Replace the file with the real sheet mapping and nothing else changes. As of
MVP 0.3 the audio is **self-hosted**: the embed serves 30
seconds on mobile, the policy forbids hiding the track, and the Play Button is
not licensed commercially. `audio.title` and `audio.artist` are **answers** —
they must never render before the listener asks for the reveal — and `duration`
(seconds) lets the countdown render before the file has loaded. No audio files
are bundled yet, so the transport falls back to a clock at the card's real
length; that fallback is the only thing a real file deletes. The `spotify` field
survives **only** for the superseded snapshots (MVP 0.2 and the original
clickdummy gate their Listen step on that link); MVP 0.3 has no reference to it,
and it goes when those files do.

Images: `assets/web/method-card.png` stands in for every Method and card
visual, and for the user-type graphic in the settings sheet.

## Open items to resolve with the designer

1. **User type uses `RadioGroupText`, not `RadioGroupImage`.** The flow's
   image radios need one meaning-bearing image *per option* — `imageAlt` is
   required per item precisely because the image is how the option is
   recognised. Only one placeholder image exists, and four identical pictures
   destroy the thing the component is for. Switch to `RadioGroupImage` the day
   the four artworks land; the option data already has the slot.
2. **Token gap G3** (`--border-strong-hover`) is still open; the library
   references raw `--sand-8` in two hover rules. Unchanged by this pass.
3. **Stepper numbering** was cleaned: the FigJam board labels both Listen and
   Reflect "step 3" and then Share "step 4". This ships as
   1 Intro · 2 Select Card · 3 Listen · 4 Reflect · 5 Share.
4. **Terminology**: the board says "material" and "Musie"/"Musy" inconsistently.
   Shipped as **Method** and **Musie** throughout the UI; the package keeps its
   `musy-*` internal naming.
