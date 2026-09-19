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

---

# Phase C — the session spine

Five agents in two waves, plus the integrator. Everything below was either
decided in flight or is still waiting on Ben; the decisions Ben answered before
any code was written live in `DOMAIN-MODEL.md`'s Resolved section, not here.

## Diary entry — three of its facts have no label copy, so the `<dl>` holds one row

Where: `src/routes/DiaryEntry.tsx`, `src/i18n/en.ts` (`diary.*`)

What I checked: the catalogue's only label-shaped diary strings are
`diary.card` and `diary.yourAnswer`. The date, the duration and the
*Unfinished* marker exist only as VALUES — `diary.duration` is `'{minutes} min'`,
`session.status.abandoned` is `'Unfinished'`. Neither has a term to sit beside
in a description list.

What I did: rendered the card as the one `<dl>` row and let the date, duration
and status sit as heading, subtitle and quiet lines. When the exercise drew no
card the `<dl>` is not rendered at all, rather than showing an empty-list
message under an entry that has just stated three facts.

Why: inventing `diary.dateLabel` / `diary.durationLabel` would be writing
user-visible copy to fill a layout, which is the wrong order.

What I need from Ben: **is the entry page a facts table or a short read?** If
it is a table, it needs three label keys and I will write them. If it is a
read, it is right as it stands and this entry closes.

## Diary — deep-linking a RUNNING session's id lands on "not found"

Where: `src/lib/diary.ts`, both reads filter `status <> 'started'`

What I checked: the Diary is defined as every session that is no longer
running (DOMAIN-MODEL.md), and the drawer already offers the running one as
*Continue session*. So the id is reachable from one place and 404s in another.

What I did: left it as a 404.

Why: the diary is what is over, and a running session has no duration, no
outcome and no reflection to show.

What I need from Ben: **should `/diary/<running id>` redirect into the session
instead?** It is three lines either way. A 404 is defensible; a redirect is
friendlier and is what a user typing a remembered URL probably wants.

## Duration — a 20-second session renders as "1 min", never "0 min"

Where: `src/lib/diary.ts`, `durationMinutes`

What I did: floored at 1.

Why: "0 min" reads as *this did not happen*, and a diary's job is to say that
it did.

What I need from Ben: nothing, just flagging — it is a copy decision made in
code, which is exactly the kind that disappears if nobody writes it down.

## `.musie-placeholder` is now the page-title class on real screens

Where: `src/shell.css`, used by `routes/Exercises.tsx`, `routes/Diary.tsx`,
`routes/DiaryEntry.tsx` and `routes/Placeholder.tsx`

What I checked: the class was named for scaffolding and is now what every h1
in the app uses, including on screens that are finished.

What I did: kept the name rather than renaming it mid-phase across four files
and one stylesheet.

What I need from Ben: nothing — flagging for whoever deletes the last
placeholder route. The rename belongs in that commit, not before it.

## The seed nearly lost real copy, because MY brief was wrong

Where: `supabase/migrations/20260918150600_content_seed.sql`

What I checked: the C.0 brief said the four new step arrays were NULL for all
three exercises. But `guideline` → `scan_text` was a RENAME, and `guideline`
held the one characterful exercise-level string in the seed — *"Work with the
card you are drawn to, not the one you think you should pick."* — with
hand-written German beside it. Following the brief literally discarded both.

What I did: the agent flagged it rather than silently obeying; I carried both
strings into `scan_text`. The owed-string count is 28, not 30.

Why: a rename that drops content is a silent content loss wearing a schema
change's clothes.

What I need from Ben: nothing. Recorded because the agent catching a wrong
premise is the behaviour that saved it, and that is worth keeping.

## `Intl` with the bare tag `'en'` was rendering American dates

Where: `src/lib/diary.ts`, now `src/i18n/index.ts` (`INTL_LOCALES`)

What I checked: `new Intl.DateTimeFormat('en')` resolves to **en-US** —
"September 19, 2026 at 2:32 PM" — in a product whose English copy is otherwise
British and whose German column sits right beside it.

What I did: added `INTL_LOCALES`, mapping the locale ID to a BCP-47 tag
(`en` → `en-GB`, `de` → `de-DE`), and pointed both formatters at it.

Why: `Locale` is an ID — it is the URL, the `locale` column in every `_i18n`
table and the catalogue key. Widening it to `'en-GB'` to fix a date format
would mean re-seeding content rows.

What I need from Ben: **confirm en-GB is right.** If the product's English is
meant to be American, it is one line.

## An enumerated `revoke` fails open, and CLAUDE.md rule 2 now understates it

Where: `supabase/migrations/20260919120000_sessions.sql`,
`20260918142704_profiles.sql`, `CLAUDE.md` rule 2

What I checked: MEASURED on PostgreSQL 17.6. `revoke truncate, references,
trigger … from authenticated` left `authenticated=arwdm` — the trailing `m` is
**MAINTAIN**, which arrived in PG 17 and which no enumeration written before it
could name. `profiles` had the same hole at `arwm`. MAINTAIN only permits
VACUUM / ANALYZE / REINDEX / CLUSTER / REFRESH, so nothing leaked.

What I did: replaced both with `revoke all … from authenticated` followed by
the grant, and re-measured: `profiles` is now `arw`, `sessions` and
`reflections` are `arwd`, `anon` holds no entry on any of them. This also put
`profiles` into the revoke-then-grant order rule 2 states — it had been
grant-then-revoke, which only worked *because* the revoke was enumerated.

Why: the problem is not the privilege, it is the shape. Any enumerated revoke
silently stops being complete the next time Postgres invents one.

What I need from Ben: **one line in CLAUDE.md rule 2** — that the revoke is
`revoke all`, not an enumeration. The rule's reasoning is already right; its
example is now the weaker of the two forms in the repo.

## CLAUDE.md rule 7 needs amending, because the design system now has locales

Where: `CLAUDE.md` rule 7, `packages/design-system/src/locale.ts`

What I checked: rule 7 says never let a design-system default through, because
"those defaults are a mix of German and English". After C.10 that is no longer
why — the defaults now come from a locale catalogue the app drives, and
`Badge` and `Message` have `statusWord` props for the first time.

What I did: nothing. CLAUDE.md is a guardrail file and I do not edit those on
my own initiative.

Why: the rule's CONCLUSION still holds — anything content-bearing stays
explicit, and the Diary passes every string including `ContentList.emptyLabel`.
Only its stated reason has changed.

What I need from Ben: **approve the amendment.** Proposed: keep rule 7, replace
its justification with "the catalogue is the floor, not a substitute — a
component's default is correct for chrome and never correct for content", and
add that the app must mount `MusyLocaleProvider`.

## One db test failed once, immediately after a reset, and I could not reproduce it

Where: `pnpm test:db`, on the run straight after `supabase db reset`

What I checked: 1 failed / 60 passed on that run; 61/61 on the three runs
after it, including a fresh `db reset` followed immediately by the suite. I did
not capture which test failed, so I cannot name a cause. The most likely
candidate is PostgREST's schema cache reloading behind the first request after
a reset, but I did not observe that and am not claiming it.

What I did: logged it rather than calling the suite clean.

What I need from Ben: nothing yet. If it recurs, the first thing to capture is
WHICH test — that is the fact I lost.

## Nothing asserts the step copy is PRESENT once the spreadsheet lands

Where: `src/lib/db.content.db.test.ts`, `public.missing_translations`

What I checked: the view reports a hole only when a column is filled in one
locale and empty in the other, so 28 strings absent from BOTH locales are
invisible to it — deliberately, because absent-from-both is data rather than a
dropped translation. So the suite passes today with no step copy at all, and
will keep passing if the spreadsheet arrives half-filled in one language only.

What I did: nothing.

What I need from Ben: nothing now. Flagging for whoever imports the
spreadsheet: that import wants a test asserting the columns are non-empty, and
the moment to write it is then, not now.

---

# Phase C · after the decisions came back

Ben answered the open questions the phase raised. Three of the answers changed
code rather than only documents, which is what these entries record.

## `reflections.mode` gained a third value before the feature exists

Where: `supabase/migrations/20260919120000_sessions.sql`

What I checked: D13's answer is that a photo answer is **read back as text**
and only the text is stored — the same shape as a voice answer's transcript. So
`mode` is not "what kind of file is attached" (no file is ever attached); it is
**how the text was produced**: typed, transcribed, or read off a photograph.

What I did: widened the check constraint from `('text','voice')` to
`('text','voice','photo')`, rewrote the comment block that said "mode has two
values, not three, because a photo produces no row", and replaced the db test
asserting `'photo'` is REFUSED with one asserting all three are accepted.

Why: it costs nothing while nothing is deployed (rule 4) and is an `alter
table` against live rows the day after A.6. The constraint should say what the
product is, not what this week's build reaches.

What I need from Ben: nothing. Flagging that two of the three modes are now
decided-but-unbuilt, and the positive-control tests are the only thing stopping
someone narrowing the constraint back to what the build reaches.

## A cardless exercise could not finish, and nothing would have caught it

Where: `src/lib/sessionMachine.ts`, `src/lib/sessionMachine.test.ts`

What I checked: `exercises.needs_cards` is false for Breathing Score and Body
Scan Soundwalk, so neither has anything to scan. The reachability rule wants
every earlier step completed; `scan` never completes; `listen` was therefore
**permanently unreachable** and the run could not be finished. It could not
fire because the one implemented exercise draws cards — so no test, no screen
and no type would have found it.

What I did: `SessionState` carries a `skipped` list, and `activeSteps()` filters
it out of the list handed to the design system's `isWizardStepReachable`. It is
**derived from the exercise, never stored** — so `sessions` gains no column, and
a content edit that made an exercise cardless between two visits is reflected on
resume rather than leaving a stale answer in the row. Six regression tests.

Why: filtering the step list rather than teaching the shared rule about
skipping. "Every earlier step is completed" is exactly right once the steps
that are not in the run are not in the list, and the wizard rail keeps using
the same predicate.

What I need from Ben: nothing on the machine. **The design system has no
*skipped* wizard state**, though — `completed` would draw a check for a step
nobody did and `disabled` reads as "not yet". Logged in
`packages/design-system/stories/OPEN-QUESTIONS.md`; D.4 will otherwise pick one
silently.

## The Diary can replay a track but cannot name it — D15

Where: `src/lib/diary.ts`, `supabase/migrations/20260918150500_content_schema.sql`

What I checked: the entry page's design is one content box with everything
known, including the option to hear the track again while reading what you
wrote. `sessions.track_id` records what played, and `tracks.src` and
`duration_seconds` ARE granted — so playback is possible. But `tracks.title`
and `tracks.artist` are **not granted to the client at all**, and selecting
either fails the request outright rather than returning null.

What I did: rendered the re-listen control with `diary.listenAgain` and no
title. It does not render today at all, because `track_id` is null on every row
until E.4 has audio files.

Why: the column grant is load-bearing — the premise of the exercise is a
listener who has not been primed by the track name (CLAUDE.md rule 2).

What I need from Ben: **D15, written up in DOMAIN-MODEL.md.** The reveal has
already happened by the time a session is in the Diary, so withholding the
title from your own past entry may be the grant outliving its reason. Naming it
means routing the diary through E.5's `reveal-track` function; not naming it
means a *Listen again* control with no label but its own. Not urgent — there is
no audio yet.

## Diary — the entry page shows a duration for an unfinished session; the list does not

Where: `src/routes/DiaryEntry.tsx`, `src/routes/Diary.tsx`

What I checked: `/diary` deliberately withholds a duration for an abandoned
session — a one-line row reading "11 min" next to "Unfinished" invites the
reading that eleven minutes were spent doing the exercise, when they may have
been spent with the tab open. The entry page shows it for both.

What I did: kept the difference, because the entry page supplies the context
the list row cannot: the duration sits under an *Unfinished* badge and beside
*Stopped at Listen*, so what it measures is unambiguous.

Why: the same number is honest in one place and misleading in the other.

What I need from Ben: **yes or no.** It is defensible and it is also an
inconsistency, and inconsistencies that nobody chose tend to get "fixed" in the
wrong direction later.

## The track playback path has never executed

Where: `src/routes/DiaryEntry.tsx` (`trackUrl`, the `<audio>` wiring)

What I checked: `track_id` is null on every session row because there are no
audio files (E.4), so the re-listen block does not render. The code is covered
by types, lint and unit tests and by nothing else. `trackUrl`'s premise — that
`tracks.src` is repo-relative and `public/assets/**` is served at `/assets/**`,
which is how `Logo`'s default src behaves — is sound and unproven.

What I did: left it unexercised rather than seeding a fake track to make it
run.

Why: a fake row would have proved the wiring against a fixture nobody will ship
and left a fabricated track in a content table that is edited in place.

What I need from Ben: nothing. E.4 is where this first runs, and whoever does
it should expect `trackUrl` to be the line that is wrong.

## `/session/:id/:step` shows the raw step slug, and the redirect made it visible

Where: `src/routes/Placeholder.tsx`, `src/i18n/en.ts` (`route.session.title`)

What I checked: the title is `'Current session — {step}'` and `Placeholder`
interpolates `useParams()` directly, so it renders "Current session — scan"
rather than the translated step name. `session.step.*` exists and is unused by
that route.

What I did: nothing. The whole session screen is placeholder scaffolding that
D.4 replaces, and translating one word of a screen that is otherwise a bare h1
would be polishing something that is about to be deleted.

Why: it is newly VISIBLE, though — `/diary/<running id>` now redirects here, so
a user can reach it from the Diary rather than only by typing a URL.

What I need from Ben: nothing. Flagging so D.4 does not inherit it silently.

## The diary entry became an overlay route, and cold deep-linking needed new machinery

Where: `src/routeHandle.ts` (`beneath`), `src/AppShell.tsx`, `src/router.tsx`,
`src/routes/DiaryEntry.tsx`, `src/lib/useCloseOverlay.ts`

What I checked: the designer asked for the entry to open in a lightbox rather
than on its own page — "better for the flow". Done as an OVERLAY ROUTE, not as
modal-only state, because router.tsx's rule is that every screen is a real
route: Back still closes it and the URL is still linkable.

`AppShell` already re-renders the last non-overlay page beneath an overlay, but
it learns that page by REMEMBERING A NAVIGATION. On a cold deep-link straight
to `/diary/<id>` nothing has navigated, so `<main>` rendered EMPTY — a lightbox
floating over nothing. Observed in the browser before it was fixed, not
reasoned about afterwards.

What I did: `RouteHandle` gained `beneath: { element, path, wide? }` — the same
three values the ref holds, declared by the route instead of remembered from a
navigation. `/diary/:id` declares `beneath: { element: <Diary />, path:
'/diary' }`. `/menu` and `/settings` deliberately omit it, because they belong
to no one page, so their cold behaviour is unchanged.

`useCloseOverlay()` also gained an optional fallback path (default `'/'`), so
closing a cold-linked diary entry lands on `/diary` rather than the root.

Why: an overlay whose backdrop is a blank page is worse than a full page — it
looks broken rather than deliberate.

What I need from Ben: nothing. Flagging that `beneath` is a new concept in
`routeHandle.ts` and the second overlay pattern in the app; if a third overlay
belongs to a page, it declares `beneath` too.

## `diary.back` and `diary.exercise` were written and then not needed

Where: `src/i18n/en.ts`, `src/i18n/de.ts`

What I did: deleted both. `diary.exercise` labelled a `<dl>` row that would
have defined the term the heading already states; `diary.back` was a back link
the scrim, the close button and Escape all made redundant when the entry became
a lightbox.

Why: nothing enforces that a catalogue key is used, so a dead key survives
indefinitely and reads as a string somebody forgot to render.

What I need from Ben: nothing. Noting the gap itself — **there is no check that
every `MessageKey` is referenced.** `en.ts`'s own header argues that an unknown
key is a typecheck error; the reverse, an unused one, is invisible. A lint rule
or a test could close it.
