# Accessibility

Handled at the token level where it can be, in the component where it must be,
and honestly incomplete in one named place: there has been no dedicated audit
pass yet.

| | State |
|---|---|
| Contrast | **solved**, not eyeballed — steps 11, 12, `edge`, `press` are computed against every legal background |
| `prefers-reduced-motion` | honoured in Layer 1, so no component needs a branch |
| `prefers-contrast: more` | honoured in Layer 1 |
| `forced-colors: active` | honoured in Layer 1 |
| Keyboard | every screen; overlays are routes, so Back works |
| Alt text | per card and per exercise, per locale, in the content tables |
| `<html lang>` | follows the active locale, pre-paint |
| A dedicated a11y pass | **not started** — BUILD-PLAN step 1.12 |

::: designers
## What you can rely on without asking

**Contrast is not a judgement call here.** The colour scales are
*contrast-solved*: steps 11 and 12 are the lightest values that still clear
4.5:1 and 7:1 on every surface a foreground can legally land on — including
other scales' tinted fills. `edge` clears 3:1 for non-text boundaries (WCAG
1.4.11).

So picking `--sand-11` for body text on any legal surface is already compliant.
Picking a raw step by eye is how that guarantee gets lost, which is one more
reason the raw scales are not an API.

**Three media preferences are handled in the tokens**, not per component:
reduced motion, increased contrast, and forced colours. A component that looks
right in the default theme is already right in all three.

## Touch targets

44px for every primary action. 24px is permitted only for inline controls in
prose and for card controls **on a fine pointer** — never on touch.

Two larger rungs exist and are deliberately unused today: 56px (`comfort`) and
64px (`guided`). `comfort` is reserved for the day Musie is optimised for
elderly and for children — the size a shakier or smaller hand wants without the
whole interface going large.

## The product's own accessibility problem

The core of the product is **listening** and **printed paper**. What that means
for deaf or hard-of-hearing people, and for blind or low-vision people, is
treated carefully *in the software* — alt texts, keyboard operation, contrast —
but has **never been asked as a product question.** It is named as an open
question in the briefing, not solved.

Two concrete consequences visible today:

- A card is identified by an image and a feeling word; the QR code is the route
  in, and scanning needs a camera. There is a manual code path, which is the
  accessible alternative — see [Scanning a card](/features/scan).
- The one guided exercise has a voice; the rest are music only. No transcripts
  exist for the spoken recordings.

## Where the honesty is

**There has been no dedicated accessibility pass.** BUILD-PLAN step 1.12 is
*not started*. What exists is accessibility built in as each piece was made,
which is better than a retrofit and is not the same as an audit.

The known gap with a name: `Message`'s visually hidden status word was a
hardcoded German constant with no prop, so an English screen reader heard
*"Fehler: This content could not be loaded"*. The floor under it now is
`MusyLocaleProvider`, which makes the package's own catalogue follow the app's
locale.

## The diary graph, as a worked example

It looks like a chart. It is **a list of links**, drawn like one. Keyboard
navigation, focus and the browser's own find-in-page all work on it, and the
day stacks carry the alt text of the exercises they are made of.

That is Layer 3 rule L3 doing real work: *a list of things is a list.*
:::

::: devs
## Token-level handling

`musy-foundations.css` carries the three overrides itself:

```css
@media (prefers-reduced-motion: reduce) { /* durations collapse */ }
@media (prefers-contrast: more)        { --border-subtle: var(--sand-edge); … }
@media (forced-colors: active)         { --border-subtle: CanvasText; … }
```

Because they are at the *token* level, a component needs no branch of its own —
and cannot forget one.

## `<html lang>` is an accessibility mechanism, not cosmetics

Layer 1 sets `--text-hyphens: auto`, which the wrapping-text rules in
`musy-components.css` consume. `hyphens: auto` hyphenates by the element's
**declared** language, so German under `lang="en"` breaks German compounds at
English hyphenation points, silently.

`apps/web/index.html` sets it pre-paint from the cached locale, and
`LocaleProvider` keeps it in step. Both must stay true (CLAUDE.md rule 5).

## Focus

```css
--focus-ring-width: var(--border-width-focus);   /* 3px */
--focus-ring-offset: 2px;
--focus-ring-color: var(--border-focus);
--focus-ring-clearance: 5px;                      /* width + offset */
```

`--focus-ring-clearance` exists so a layout can reserve the room rather than
clipping the ring — a focus ring cut off by an overflow is a focus ring that is
not visible.

## Overlays are routes, which is an accessibility decision

`/menu` and `/diary/:id` are real routes with `handle.overlay`. So:

- Back closes them — the browser's own affordance, which is what a screen
  reader user and a keyboard user both reach for first;
- they are linkable;
- the page beneath stays mounted, and `aria-current` sits on the row that led
  there.

There is no modal-only navigation anywhere in the app.

## Design-system defaults are an accessibility hazard, not just a copy one

`Message`'s visually hidden status word, `Badge`'s, `Lightbox`'s `closeLabel` —
these reach **only** assistive technology. A leaked German default is therefore
invisible to a sighted reviewer and audible to exactly the user who cannot see
the colour that was supposed to carry the meaning.

That is why `MusyLocaleProvider` is mounted inside `LocaleProvider` in
`main.tsx`, and why rule 7 is absolute.

## What is not done

| | |
|---|---|
| BUILD-PLAN 1.12 · a11y pass | **not started** |
| BUILD-PLAN 1.13 · cleanup pass | **not started** |
| Automated a11y checks in CI | none — no axe, no pa11y |
| Visual regression | none |
| Screen-reader walkthrough | not recorded anywhere |

`reference/design_system/docs/04-contrast-audit.md` holds the contrast solve's
own audit, which is the one piece of this that *is* evidenced end to end.
:::

---

**Source of truth:**
[`tokens/musy-foundations.css`](https://github.com/product-ben/musie/blob/main/packages/design-system/tokens/musy-foundations.css),
[docs/10-layout.md](https://github.com/product-ben/musie/blob/main/packages/design-system/docs/10-layout.md),
[CLAUDE.md](https://github.com/product-ben/musie/blob/main/CLAUDE.md) rules 5 and 7,
[BUILD-PLAN.md](https://github.com/product-ben/musie/blob/main/BUILD-PLAN.md) steps 1.12–1.13.
