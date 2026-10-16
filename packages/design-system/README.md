# @musie/design-system

Layer 1 foundations (tokens) + Layer 2 components for Musy.

```
tokens/         Layer 1 — the token system. CSS custom properties, the DTCG
                mirror for Figma, and the pre-paint theme script.
tokens/fonts/   Self-hosted woff2 files + their OFL licence texts.
src/            Layer 2 — one file per component, plus musy-components.css.
```

## Stylesheet load order

**The four stylesheets must be loaded in this exact order:**

```
1. tokens/musy-fonts.css
2. tokens/musy-foundations.css
3. tokens/musy-foundations-amendments.css
4. musy-components.css
```

Import them once, at the app root:

```ts
import '@musie/design-system/tokens/musy-fonts.css';
import '@musie/design-system/tokens/musy-foundations.css';
import '@musie/design-system/tokens/musy-foundations-amendments.css';
import '@musie/design-system/musy-components.css';
```

### Why the order is load-bearing

They are four separate files on purpose and are not merged.

**`musy-fonts.css`** holds the `@font-face` declarations for the two families
`--font-display` and `--font-text` resolve to. Without it the tokens still
resolve but every step renders in a system fallback. `@font-face` carries no
cascade weight, so its position is about discovery rather than resolution —
the declarations should be parsed before the first element that needs a face.

**`musy-foundations.css`** declares the whole token system: 8 raw colour scales
× 14 steps, 83 semantic aliases, and the dimension layer (spacing, targets,
radius, borders, elevation, focus, motion, z-index, iconography, typography,
breakpoints). It also carries the `prefers-reduced-motion`,
`prefers-contrast: more` and `forced-colors: active` overrides, which are
honoured at the *token* level so components need no branch of their own.
Layer 1 was `[LOCKED]` — byte-identical to the signed-off version — until
2026-09-19, when the two accent families were renamed at source: the
`--interactive-accent-placeholder1/2` tokens became `--interactive-accent-*`
and `--interactive-accent-alt-*`. Nothing else changed: no value, no alias, no
override. The lock is re-established from that version.

**Broken a second time on 2026-10-09, on Ben's call, and this one changed a
VALUE.** `--measure-heading` went from `26ch` to `50ch`: the tight measure was
bought to stop German compounds stranding a word on the last line, a job
`--text-wrap-heading: balance` was already doing, and what it actually did was
break headings that had no reason to break — a 52-character question wanting
656px was given 425px inside a 1076px column. It had been worked around twice
rather than fixed (a raw `50ch` in `shell.css`, and `ContentBox`'s
`headlineWide`), and 50ch is that workaround's own number promoted.

One token was ADDED in the same act: `--measure-compact: 26ch`, for the two
places that were using the old value as a width budget rather than as a
measure — a toast row whose cap is arithmetic, and a drag preview. Neither is
a heading, both were tuned by measurement, and both now say so. The lock is
re-established from this version.

The rename was taken in Layer 1 rather than aliased in the amendments file
because "placeholder" was in the public API of nine components, and an alias
would have left both names live and both greppable. See
`stories/OPEN-QUESTIONS.md`, "Phase B.1 — the four decisions, answered".

**`musy-foundations-amendments.css`** declares the two token gaps Layer 2
needs and Layer 1 does not yet have — `--icon-stroke-sm` (gap G1) and
`--border-style-solid` / `--border-style-dashed` (gap G2). They live in a
separate file precisely so `musy-foundations.css` stays untouched; absorbing
them later is a copy-paste into Layer 1, not a rewrite. It declares no property
that `musy-foundations.css` declares, so it must come *after* it but overrides
nothing.

**`musy-components.css`** consumes both. It references `--icon-stroke-sm` and
`--border-style-dashed`, which only the amendments file defines — so loading it
before the amendments leaves those declarations unresolved. Every other
declaration in it resolves to a Layer 1 token or to arithmetic over one.

Merging them would lose that separation and, with it, the guarantee that
Layer 1 is unmodified.

## Fonts

Self-hosted, no third-party request. Nothing in this package ever calls
`fonts.googleapis.com` or `fonts.gstatic.com` — no `<link>`, no `@import`, no
`preconnect`. The woff2 files were fetched once from Google's CSS API and
committed to `tokens/fonts/`.

Both families are **SIL Open Font License 1.1**. The licence texts ship beside
the fonts as `tokens/fonts/Onest-OFL.txt` and `tokens/fonts/Literata-OFL.txt`,
which the licence requires.

### Preload snippet — copy this into the app shell

Put it in `<head>`, **before** the stylesheets, and fix up the two paths to
wherever your bundler emits the fonts:

```html
<!-- Musy webfonts. Self-hosted: no preconnect, no third-party origin.
     LATIN ONLY on purpose — <link rel="preload"> ignores unicode-range, so
     preloading the latin-ext files would fetch 59.3 KB that most sessions
     never render a glyph from. They load on demand via unicode-range. -->
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/onest-latin.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/literata-latin.woff2">
```

`crossorigin` is required even for same-origin font preloads — fonts are always
fetched in anonymous CORS mode, and without it the browser fetches the file
twice.

Preload only these two. The italic and both `latin-ext` files are genuinely
conditional and should stay that way.

### Which weights are shipped, and why

Both families ship as **variable fonts clamped to `wght 400–700`**, which is
exactly the range the system consumes.

This is not a stylistic preference. Google's API returns the *same file* for
`wght@400;500;600;700` as for `wght@400..700` — asking for statics yields four
`@font-face` blocks all pointing at one variable file, which would mean
committing identical bytes four times. Literata ships an `opsz` axis as well;
it is deliberately not requested, since nothing in the type scale varies it.

**Onest** — `var(--font-display)`

| Weight | Consumed by |
|---|---|
| 400 | `label-md` |
| 500 | `display-lg`, `heading-lg`, `heading-md`, `body-xl`, `stage` |
| 600 | `heading-sm`, `label-lg` |
| 700 | `display-xl` |

600 is a **real rung here**, and only here. It was barred while the display
face was Space Grotesk, which ships 400/500/700 — a 600 would have been
synthesised by the browser. Onest's `wght` axis is continuous 100–900, so the
instance exists in the file. See `--font-weight-semibold`.

Onest ships no italic, and nothing in the system asks for one.

**Literata** — `var(--font-text)` — **the family that READS**

| Weight | Consumed by |
|---|---|
| 400 | `body-lg`, `body-md`, `body-sm` |
| 700 | **Not in the type scale.** `musy-components.css` only — the wizard's selected / `aria-current="step"` label |
| 400 *italic* | **Not in the type scale.** `musy-components.css` only — one rule, the DraggableList empty-state text |

Those last two are single rules and easy to lose in a future cleanup. Drop
Literata 700 and the current wizard step degrades to a synthesised fake-bold;
drop the italic and the browser shears the upright into a fake oblique.

Nothing consumes 100–300 or 800–900, which is why the axis is clamped.

### Files

| File | Subset | Axis | Size |
|---|---|---|---|
| `onest-latin.woff2` | latin | `wght 400–700` | 33.0 KB |
| `onest-latin-ext.woff2` | latin-ext | `wght 400–700` | 27.7 KB |
| `literata-latin.woff2` | latin | `wght 400–700` | 38.3 KB |
| `literata-latin-ext.woff2` | latin-ext | `wght 400–700` | 31.5 KB |
| `literata-italic-latin.woff2` | latin | `wght 400–700` italic | 39.1 KB |

**169.7 KB total, of which 71.3 KB is the German critical path.**

Each `@font-face` carries Google's own `unicode-range`. German umlauts
(`ä ö ü Ä Ö Ü ß`, U+00C4–U+00FC) live entirely in **latin**, so ordinary German
costs only the two latin files. The `latin-ext` files are fetched only when a
Central or Eastern European character actually appears on screen.

Literata's italic ships **latin only**: it serves exactly one CSS rule.

### Layout shift

Every face is `font-display: swap`. With the preload above and a warm HTTP
cache there is no shift on reload: the font is already in memory when first
paint happens.

A first-ever cold load still shows a brief fallback flash before the swap. If
that ever needs solving, the fix is metric-matched fallback `@font-face` blocks
using `size-adjust` / `ascent-override` / `descent-override`, not a change to
`font-display`. That is deliberately not shipped — it adds a block of tuned
numbers that has to be re-measured whenever either font updates.

## Setup the app owes base-ui

These are the consuming app's responsibility, not the package's:

- **`<html lang="de">`** — Layer 1 sets `--text-hyphens: auto` and every
  wrapping text part consumes it. `hyphens: auto` does nothing without a
  language tag, and German compounds overflow narrow columns without it.
- **`isolation: isolate`** on the app root wrapper, so portaled popups
  (Tooltip, Lightbox) always land above page content.
- **`body { position: relative }`** for iOS 26+ Safari backdrops.
- **One `<MusyTooltipProvider>`** near the root, so moving between neighbouring
  icon buttons does not re-run the tooltip open delay.
- **One `<MusyLocaleProvider locale={…}>`** near the root — see below. Without
  it every component speaks German.

## The system's own words

Every user-visible default this package ships lives in **`src/locale.ts`**: one
flat catalogue per locale, `musyTextDe` and `musyTextEn`, both answering to
`MusyTextCatalogue`. Components read it through `useMusyText()`.

```tsx
import { MusyLocaleProvider } from '@musie/design-system';

<MusyLocaleProvider locale={locale}>{children}</MusyLocaleProvider>
```

**Mount it once, at the root, and drive it from the locale the app already
resolved.** `locale` is `'de' | 'en'`. With no provider mounted the catalogue
falls back to **German**, because the app is German-primary — so a missing
provider is not a crash, it is an English screen speaking German, which is
exactly the bug the file exists to end.

**Props still win.** The catalogue is the floor, not a replacement: every prop
that took a string still takes it, still means what it meant, and still
overrides. The catalogue only changes what a prop *falls back to*.

**Some of these strings had no prop at all**, which is why this is a provider
and not a convention. `Badge` and `Message` render a screen-reader-only status
word before the label — *Hinweis · Warnung · Erfolg · Fehler* — and there was no
way to change it, so an English screen announced "Fehler: …" to precisely the
users who cannot see the colour. `DraggableList` hardcoded *Discard*, *Save*,
*Delete*, *Edit*, both tool-button names and every keyboard announcement. Those
are catalogue entries now. `Badge` and `Message` also gained a `statusWord`
prop for the per-call case.

**It is a provider, not a setter.** There is deliberately no
`setMusyLocale()`: the app switches language at runtime with no reload, and a
module-level setter would leave every mounted component rendering the previous
language until something unrelated re-rendered it.

Entries that interpolate are **functions**, not templates with slots —
`dragHandleLabel(noun, position)`, `dropCombine(position)`,
`recordStatus(elapsed, remaining)` — so each locale writes the whole phrase and
German can put the verb where German puts the verb. The German is written to
`docs/GERMAN-UI-WRITING.md` at the repo root.

## The wizard's reachability rule

`src/wizardSteps.ts` exports it as one pure function, with no React and no
imports:

```ts
wizardStepState(steps, step, current, completed?)  // 'disabled' | 'active' | 'selected' | 'completed'
isWizardStepReachable(steps, step, current, completed?)  // everything but 'disabled'
```

A step is reachable when it is the current one, when it is completed, or when
every step before it is completed. `InteractiveWizard` consumes it rather than
owning it, so an app that has to refuse the same transitions in a reducer can
import the rule instead of writing it a second time.

## Opening a lightbox from a route

`Lightbox.trigger` is OPTIONAL. Pass it and base-ui renders a `Dialog.Trigger`,
owns the open state and returns focus to that control on close. Omit it when
the URL is what opened the lightbox — a route that presents as a modal — and
drive `open` yourself:

```tsx
<Lightbox open title={name} titleHidden closeLabel={t('common.closeLabel')}
          onOpenChange={(next) => { if (!next) close(); }}>
```

A hidden dummy trigger is not the alternative: it is a stray node in the DOM
claiming to have opened a dialog it did not.

What the trigger-less caller owes in exchange is the RETURN. With nothing to
go back to, base-ui falls back to whatever was focused as the popup mounted —
the link that navigated, if the page it sits on is still mounted behind the
scrim, and `<body>` on a cold deep-link. `finalFocus` is base-ui's own prop,
passed straight through, for naming the element instead.

## Theming

Manual toggle only — the system preference is deliberately not consulted.
`tokens/theme-init.js` sets `data-theme` on `<html>` before first paint and
exposes `window.musyTheme.get() / .set() / .toggle()`. Load it synchronously in
`<head>`, before any stylesheet:

```html
<script src="/path/to/theme-init.js"></script>
```

Every token is declared on `:root, [data-theme]`, so putting `data-theme="dark"`
on any element re-declares the whole set for that subtree and `light-dark()`
re-resolves against it.

## Peer dependencies

`react` (>=19), `@base-ui/react` (^1.7.0) and `lucide-react` (^0.470.0) are
peers — the consuming app supplies them.

## Consuming components

```ts
import { CtaButton, ContentBox, Icon } from '@musie/design-system';
```

The package ships TypeScript source, not a build. The consumer's bundler
compiles it.

## What arrived on 2026-10-16, with the reflect rework

Four changes, and three of them are additions to components that already
existed. Each file's own header carries the argument; this is the index.

| | |
|---|---|
| **`DrillDown`** | new. A tree narrowed one level at a time |
| **`RadioGroupText`** · `drillDown` | an option that descends, with a trailing → |
| **`ButtonGroup`** · `purpose` | `continue-only`, which reverses the order |
| **`Toast`** · `children` | content on its own row beneath the label |

### `DrillDown` draws no rows

`children` is a function handed the level to draw, so the component imports no
selection component at all. It owns the stack, the back row, the stop row, the
live region and the focus move; the feelings sheet passes a `RadioGroupText`.

There is **no default slot**, deliberately: a default would mean importing one
selection component, which is the single thing the slot exists to avoid. The
`CardsInTheSlot` story is the only proof the API is generic, and a slot nothing
has ever been swapped in is a slot that does not work.

### The rows are radios, and the arrow is additive

A drill-down row is still a radio: within the question on screen, choosing
*Optimistisch* **is** a choice, and its consequence is that the next question
is asked. Each level is its own group with its own legend.

**The marker stays on every row** — Ben's call: the arrow goes on the right of
the box so the list is still one thing to scan. `drillDownLabel` is appended to
the row's accessible name so the two kinds of row are told apart without sight,
and it is warned about in development when a `drillDown` option omits it.

One thing that is measured rather than reasoned about: the arrow narrows the
label box, so a long German label clamps a word earlier beside one. The
existing overflow measurement already covers it, and `DrillDownLongLabel` is
the story that keeps it true.

### `continue-only` reverses the column too

`stacked` governs width and `relation` governs space; `purpose` governs order.
For a group whose every control is a way on from here.

| | at `--bp-md` and up | below `--bp-md` |
|---|---|---|
| `actions` (default) | row, `align`, DOM order | stacked, full width, **primary first** |
| `continue-only` | row, trailing, **primary rightmost** | stacked, full width, **primary last** |

**The second row is a deliberate exception** to this component's own rule that
the stacked order is DOM order top to bottom. "Always bottom right" has no
right once there is no row, so the primary becomes the bottom button, above the
thumb. Put to Ben as a conflict with the existing rule and chosen with it
named — the old rule is not wrong, it belongs to `actions`.

DOM order stays priority order in both. The reversal is `row-reverse` /
`column-reverse`, so a keyboard and a screen reader meet the primary first
either way; only the paint changes. `align` is dropped under this variant
rather than allowed to fight it.

One consumer today, by instruction: the reflect step's incomplete dialog.

### The `Toast` slot is content, not a second action

`action` is still exactly one — two ways out makes it a dialog. The slot does
not dismiss, is not folded into the toast's announcement (whatever goes in it
names itself), and the swipe goes inert inside it, the same way it already
does over the action and the dismiss.

It is **last in the DOM**, so a screen reader meets the dismiss before it.
That is the price of the row it needs: the toast is a wrapping flex row, and a
100%-wide child before the dismiss pushes the dismiss onto a third line.


## And on the same day, after the first screens were looked at

| | |
|---|---|
| **`Chip`** / **`ChipRow`** | new. A word the person put there, with a way to take it back out |
| **`Sheet`** · `contentAlign` | `top`, for a body that is a list rather than one screen |
| **`DrillDown`** · `onDepthChange` | the level, and what its stop row would commit |

### `Chip` is not a control, and only its × is

That is the whole semantic difference between it and everything near it. A
`FilterChips` chip is a checkbox — pressing it changes a query. A
`SegmentedControl` option is a radio. This is a **noun**: a word somebody
already chose, sitting there being true.

So nothing about it may suggest a press would do something — no hover, no
active state, no cursor, no focus ring on the chip itself. And **background
only, no border**: an edge is what a control wears to say where you may press.
It is the one visual difference from every other chip in the system, and it is
carrying meaning rather than taste.

Without `onRemove` it renders as a `<span>`, because a chip nobody can remove
is a label. `ChipRow` owns the gap between chips — `--space-gap-related`,
shipped with the component for the reason `ButtonGroup` gives about a row of
actions: a distance decided in two places is two decisions.

### `contentAlign="top"` is one declaration

`distributed` (the default) centres a single body between the header and the
foot, which is right for a sheet of one screen — a picture, a countdown, four
cards to compare. It is wrong for a body that is a **list** somebody works
down: the reflect step's drill-down sat three rows deep in the middle of a tall
sheet with the question stranded at the top.

`top` changes two things: the alignment, and the distance. `--space-section`
sits between the headline and the content, two rungs up from what a
`distributed` sheet spends — because the relationship is different. Centred,
the header and the body are one composition and the gap between them is inside
a molecule. Top-aligned, the headline is a **question** and the body is the
apparatus for answering it: two sections, which is the rung L2 names for that.

Scoped to the variant. The header's own padding is shared with the paged
sheets, where it floats over a full-bleed picture and this distance would push
the pages down for a reason belonging to a different variant.

`Chip`'s remove control is an **eraser**, not an ×. An × means *close* almost
everywhere else here — the Lightbox corner, the Toast dismiss — and both of
those put something away without changing it. This one deletes a row.
