# OPEN-QUESTIONS.md — apps/web

Append-only. One entry per question, including ones resolved confidently.
An empty log would be a failure signal.

Separate from `packages/design-system/stories/OPEN-QUESTIONS.md`, which logs
questions about the system itself. This file logs questions the APP has,
including questions the app has *about* the system.

Format:

```
## Topic — the question in one line
Where: file and line
What I checked: which level, and what each said
What I did: the choice
Why: one sentence
What I need from Ben: the decision, or "nothing, just flagging"
```

---

# Phase 2.4 — locale-aware content and the i18n layer

## Errors — the app needs a persistent inline error presentation, and Toast is not it — RESOLVED

Where: `src/routes/Methods.tsx` (the `role="alert"` branch), `src/shell.css`
(`.musie-error`)

What I checked:

**The brief's premise does not match the repository.** The instruction was to
render errors as plain text *because* "the design system has NO Message
component — deliberately deleted, nothing replaces it". It is not deleted:

- `packages/design-system/src/Message.tsx` exists and is 4,019 bytes.
- `src/index.ts:54-55` exports `Message` and its types.
- `MessageProps` carries `variant: 'info' | 'warning' | 'success' | 'error'`,
  `live: 'off' | 'polite' | 'assertive'`, `headline`, `text`, one optional
  `action`, and `onDismiss`.
- `.musy-msg` and `.musy-msg--error` are in `musy-components.css`.
- `RadioCards`, `RadioGroupText` and `RadioGroupImage` all `import { Message }`
  for their own `error` prop — so deleting it would break three shipped
  components.
- **`docs/10-layout.md` L11 prescribes it for precisely this case:** "A fatal
  problem, injected after load | `Message variant="error"`, inline where it
  happened | `live="assertive"`".

The likely source of the confusion is
`packages/design-system/stories/PROTOTYPE-USAGE.md`, which lists Message under
"Components the prototype uses that were deleted". That note is about the
PROTOTYPE's markup, and it is wrong about the component's existence.

**Toast is genuinely the wrong tool, and that part of the brief is right.**
`docs/10-layout.md` L11 scopes Toast to "a completed action that can be
undone", at `--z-toast`, bottom-centre, `role="status"`. A failed content load
is not completed, not undoable, and not transient — it must persist until the
user acts, and it must be announced assertively rather than politely. Using
Toast here would put a dismissible, self-hiding notice in place of a condition
that is still true after it disappears.

What I did: rendered the error as plain text — `body-md` type tokens plus
`--feedback-error-text` (`--error-12`, solved ≥ 7:1) — with `role="alert"` as
the closest honest equivalent of the `live="assertive"` that `Message` would
have carried. Deliberately did NOT draw a panel: `--feedback-error-surface`
and `--feedback-error-border` exist and go unused here, because drawing the
box is exactly the part that belongs to a component rather than to a screen.
Did not build an error component, per the brief.

Why: the instruction was explicit and plain text is defensible on its own
terms, but its stated justification is factually wrong, and a design decision
resting on a wrong fact should be recorded rather than quietly inherited.

**RESOLVED — Ben chose the system's own component.** `/methods` now renders

```tsx
<Message
  variant="error"
  live="assertive"
  headingLevel={2}
  headline={t('content.error')}
  text={t('content.errorDetail')}
/>
```

and `.musie-error` is deleted from `shell.css`. No error component was built,
which is L14's first rule: if the system has one, import it and pass props.

`live="assertive"` is the whole of the wiring — Message derives `role="alert"`
and `aria-live` from it. `onDismiss` is deliberately omitted: the error is
still true after any dismissal, and omitting it also keeps the German
`dismissLabel` default out of the English UI. `headingLevel={2}` because the
screen title is the h1 and the error replaces a list of h2s; Message's default
of 3 would skip a level.

Still outstanding, and not the app's to fix: **`PROTOTYPE-USAGE.md` still says
Message was deleted.** That sentence is what produced this whole detour and
will produce it again.

## Message — the status word is hardcoded German, with no way to override it

Where: `packages/design-system/src/Message.tsx:31-39`, consumed by
`apps/web/src/routes/Methods.tsx`

What I checked: Message renders a visually hidden status word so the variant
does not depend on an icon alone (1.4.1) — which is the right call. But the
word comes from a module constant with no prop and no locale awareness:

```ts
/** Icon-only status is a 1.4.1 failure, so each variant also carries a word.
 *  German, matching the app's primary language. */
const STATUS_WORD: Record<MessageVariant, string> = {
  info: 'Hinweis', warning: 'Warnung', success: 'Erfolg', error: 'Fehler',
};
```

`MessageProps` exposes `headline`, `text`, `dismissLabel` and more — but not
this. So with the app in English, a screen reader announces **"Fehler: This
content could not be loaded"**: a German word in front of an English
sentence, audible only to the users who depend on it most.

The comment's premise — "German, matching the app's primary language" — no
longer holds now that the app ships both locales and resolves between them at
runtime.

What I did: nothing. Wired Message up as instructed and left the package
untouched, because the app must not reach into the design system.

Why: this cannot be fixed from the app. There is no prop to pass, and
overriding it from outside would mean reaching past the component's API.

What I need from Ben: a one-line addition to `MessageProps` —
`statusWord?: string` defaulting to the current constant — after which the app
passes `t('status.error')` and the sr-only word follows the locale like
everything else. The same gap will apply to `Toast`'s `dismissLabel` and to
every other German default the moment a screen uses it in English; this is the
first one that actually reaches a user.

## profiles.language — `not null default 'en'` made the specified locale order unreachable

Where: `supabase/migrations/20260918153000_profiles_language_nullable.sql`

What I checked: the resolution order was specified as "profiles.language if
set, else navigator.language if it starts with de, else en". The column was
`text not null default 'en'`, so every profile row is born holding `'en'` and
the first branch always matches — `navigator.language` was unreachable and a
German browser would have received English forever, silently, because nothing
is broken and the branch is simply never taken.

What I did: a migration dropping the default and NOT NULL, nulling the
existing `'en'` values, and adding `check (language is null or language in
('de','en'))` to mirror the content i18n tables.

Why: `null` has to mean "no choice recorded" for the specified order to be
expressible at all.

What I need from Ben: nothing on `language` — fixed. Flagging that **`theme`
has the same shape and the same latent problem** (`not null default 'light'`),
and is additionally still owned by `localStorage` under the `musy-theme` key
that `theme-init.js` writes. Which of the two wins on a fresh device is an
unmade decision, and it will surface the first time someone signs in on a
second browser.

## RadioGroupText.emptyLabel — a German default the app cannot reach

Where: `src/SettingsSheet.tsx`, the language `RadioGroupText`

What I checked: `RadioGroupText` defaults `emptyLabel` to
`'Keine Optionen verfügbar'`. The app's rule is that every user-visible string
is passed explicitly, because the system's defaults are a mix of German and
English.

What I did: did not pass it. The language control's options come from
`LOCALES`, a non-empty constant, so the empty state is unreachable.

Why: passing a string for a branch that cannot execute adds a key to both
catalogues that no screen will ever render.

What I need from Ben: nothing, just flagging. If a group's options ever become
dynamic, `emptyLabel` has to be passed at that call site.


---

# Phase 2.5 — the two overlays

## Sheet — the pattern now recurs, which L14.3 calls a component request

Where: `src/shell.css` (`.musie-sheet`, `--start` / `--end`),
`src/SettingsSheet.tsx`, `src/routes/MenuDrawer.tsx`

What I checked: L14.3 — "A pattern that recurs is a component request, not a
second copy." With /menu added, the edge-anchored sheet exists twice: settings
at the inline end, the drawer at the inline start. Both need the same fixed
block inset, width cap at `--measure-body`, `--z-sheet`, `--surface-overlay`,
`--elevation-3`, `--space-inset-sheet`, scroll containment, and the same
base-ui Dialog wiring for focus, inertness, scroll lock and Escape.

What I did: parameterised one pattern rather than copying it — the base class
carries everything shared and the two modifiers carry only the two
declarations that differ (which edge, and which border faces the page). The
Dialog wiring is shared through `lib/useCloseOverlay.ts` so the drawer and the
sheet cannot drift on what "close" means.

Why: a second copy would have been two places to fix the next time a sheet
needs to change, and L14.3 forbids it outright.

What I need from Ben: a **Sheet** component in the design system, which is
what L14.3 actually asks for here. It would own: the edge anchor as a prop
(`side="start" | "end"`), the width cap, the elevation and scrim pairing, the
header row with its close control, and the base-ui Dialog composition. The app
would then delete `.musie-sheet`, `.musie-sheet__header` and `useCloseOverlay`
and pass props. Until it exists the app-level pattern is the honest
alternative, and it is written to be deletable in one commit.

## CtaButton — no way to left-align a nav row's label — RESOLVED

Where: `src/routes/MenuDrawer.tsx`, the three nav rows

What I checked: `.musy-btn` sets `justify-content: center`, and `block` only
adds `display: flex; width: 100%` — so a full-width button centres its label.
The prototype's drawer rows are LEFT-aligned, achieved with an inline
`justify-content: flex-start` on hand-written markup. `CtaButtonProps` exposes
`block`, `wrap`, `size`, `variant` and `leadingIcon`, but nothing for
alignment.

What I did: accepted centred rows. L7 says "A screen should never reach into a
component's own geometry to get it", and overriding `justify-content` from the
app would be exactly that — so the drawer looks slightly different from the
prototype and the difference is recorded rather than hidden.

Why: centred rows in a 62ch drawer are perfectly usable, and a one-off
override in app CSS would be the first crack in the rule that keeps component
geometry inside components.

**RESOLVED 2026-09-19.** `CtaButton` now takes `align?: 'center' | 'start'`,
defaulting to `center`, and the app's `.musie-nav__row` override is deleted.
The app no longer overrides design system geometry anywhere — verified: no
`.musy-*` selector appears in any app stylesheet.

In the system: `CtaAlign` exported, `.musy-btn--align-start` beside
`--block` (the other layout modifier), and an `AlignStart` story showing the
drawer's own stack. `start` rather than `left` so the stack mirrors in RTL
without a second rule, which is the same logical-axis discipline as the rest
of the stylesheet. The class is only emitted for the non-default value, so
every existing CtaButton is byte-identical to before.

## profiles.theme — written, never read, and that is deliberate

Where: `src/SettingsSheet.tsx` (`ThemeSwitch`)

What I checked: theme has two stores. `localStorage` (`musy-theme`, owned by
`theme-init.js`) is the source of truth for rendering, and it has to be —
2.2 measured that `data-theme` is written while `document.styleSheets.length`
is still 0, which is the only way to avoid a flash of the wrong theme.
`profiles.theme` cannot do that job: it is behind a network round trip.

What I did: the Switch calls `window.musyTheme.set()` and writes
`profiles.theme` alongside as a mirror. Nothing reads `profiles.theme`.

Why: reading it on boot would reintroduce the flash the localStorage store
exists to prevent.

What I need from Ben: nothing now — but this is a **write-only column**, which
looks like dead code to anyone who finds it. It is commented in place. It
becomes readable the day an account spans devices, and at that point the
reconciliation question ("which wins on a fresh device?") has to be answered
rather than assumed. Note `profiles.theme` is still `not null default 'light'`,
so unlike `language` it cannot express "no choice recorded" — the same problem
`language` had, unfixed because nothing depends on it yet.


## Message from the drawer — `secondary` gives a current row no fill contrast

Where: `src/components/NavDrawer.tsx` (the row variants),
`src/shell.css` (`.musie-sheet`)

What I checked: the spec says the current page takes `secondary` — "Outlined
for the page you are on, ghost for the others" — and explicitly forbids
inventing a selected treatment, an accent bar or a tinted row. Implemented as
instructed. But the two tokens involved resolve to the same value:

```
--surface-overlay  = light-dark(var(--sand-1), var(--sand-4))   ← the drawer's own background
--surface-raised   = light-dark(var(--sand-1), var(--sand-4))   ← what .musy-btn--secondary fills with
```

So on the drawer, a `secondary` row is `sand-1` on `sand-1` in light and
`sand-4` on `sand-4` in dark: **zero fill contrast**. And
`--interactive-ghost: transparent`, so the other rows show that same surface
through. Current versus not-current therefore differs by `--border-strong`
ALONE — a 1.5px boundary and nothing else.

The attached design shows the current row as a filled tint, roughly
`#EBE1D0`, which is `--sand-3` — the value of `--interactive-ghost-hover`.
Using it for a SELECTED state would be the invented tinted row the spec rules
out, and it would collide with hover on every other row.

What I did: implemented `secondary` exactly as specified, and did not reach for
the tint. The drawer's current row is bordered, not filled.

Why: the instruction was explicit, and the alternative is a treatment the spec
forbids.

What I need from Ben: the drawer as built will not match the screenshot, and
the cause is a real hole in Layer 1 — **there is no selected/current treatment
for a control sitting on an overlay surface.** `secondary` was solved against
`--surface`, where `--surface-raised` does contrast; on `--surface-overlay` it
has nothing to contrast with. Either:

1. a semantic token for a selected row (`--interactive-selected` /
   `-selected-on`, solved against every surface it can land on, 1.4.11), or
2. `--surface-overlay` stops aliasing the same step as `--surface-raised`, so
   raised things read as raised on top of it too.

Both are Layer 1 decisions, not drawer decisions. Flagging rather than filling
the gap, as the brief asks.
