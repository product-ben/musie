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

---

# Phase D — the flow, screen by screen

Written 2026-09-19/20. The four stale premises in BUILD-PLAN.md's Phase D text
are the first four entries, because CLAUDE.md's closing rule says a brief whose
premise is wrong about the repo belongs here rather than being quietly worked
around.

## BUILD-PLAN D.1 — "Needs B.1's Carousel answer" was answered, and unbuilt

Where: `BUILD-PLAN.md` D.1, `packages/design-system/stories/OPEN-QUESTIONS.md`
"Phase B.1 — the four decisions"

What I checked: B.1 answered it on 19 September and the answer was explicit —
*"Carousel is built in B.2, not deferred to D.1"*, because "having D.1 write a
screen and a component in one session is where hand-written markup appears".
B.2 had only partly run: the accent rename landed (commit `0497029`) and the
other three items did not. Verified by file — no `Carousel.tsx`, no export,
`ProcessVisualisation` still exported, two raw `--sand-8` references still in
component CSS, no `--interactive-ghost-border-hover` token anywhere.

What I did: ran B.2's remainder as **D.0**, first, before any screen. All four
items, with their own entries in the design system's log.

Why: D.1, D.3 and D.4 were each blocked on a different one of them, and doing
them inside a screen session is precisely what B.1 said not to do.

What I need from Ben: nothing. Flagging that BUILD-PLAN.md's Phase D still
opens by pointing at a decision rather than at the work, and that the step list
in it is now behind what the tree holds.

## BUILD-PLAN D.3 — the fact chips could not be built from the app at all

Where: `packages/design-system/src/RadioCards.tsx`,
`src/musy-components.css` §13

What I checked: D.3 asks for "`RadioCards`, the fact chips with tooltips, the
legend". `.musy-rcard__facts`, `.musy-rcard__fact` and `.musy-rcard-legend` are
all in the component stylesheet, complete and commented. `RadioCards.tsx` had
no `facts` prop, no legend and no children slot — the only place a fact could
go was the single-line `label`. Already logged on the system's side since Batch
C and unanswered.

What I did: added both to the component in D.0. CLAUDE.md rule 1 — "when a
component cannot do what a screen needs, the fix goes into the component".

What I need from Ben: nothing. Recorded because the brief read as screen work
and was component work, and a screen that tried to emit `.musy-rcard__fact`
from `apps/web` would have broken L14.2 to do it.

## BUILD-PLAN D.5 — "six strings" is stale by one whole re-cut

Where: `BUILD-PLAN.md` D.5, `supabase/migrations/20260918150600_content_seed.sql`

What I checked: D.5 says the listen step reads `exercise_i18n.listening` and
the reflect step reads `.question`, and that **six** strings are owed. C.0
replaced that with four `text[]` columns plus one `question`, and the count is
**28** (4 lists × 3 exercises × 2 locales = 24, less the two `scan_text` rows
that carry real copy, plus 1 question × 3 × 2 = 6).

The seed migration's own header says **thirty** in one place and
**twenty-eight** in another — it subtracts the two carried-over `scan_text`
rows in the second paragraph and not in the first.

What I did: built to 28 and did not touch either document. The screens render
what is there and fall back where nothing is.

What I need from Ben: **one number, fixed in two places.** BUILD-PLAN.md D.5
says six; the seed header says thirty at line 36 and twenty-eight at line 115.
28 is right.

## BUILD-PLAN D.5 — the end screen also carried the Share step, which is cut

Where: `BUILD-PLAN.md` D.5, `reference/design_system/Musy MVP 0.3.dc.html`

What I checked: D.5 says finishing carries "the acknowledgement the prototype's
end screen used to hold". That screen held an acknowledgement AND a
share-by-email step — a `Field type="email"`, a send button and a success
message. C.2's privacy position cut sharing entirely.

What I did: only the acknowledgement travels, and it travels by being the diary
entry rather than by being restated. `/done` is deleted, along with
`route.done.title` in both catalogues.

What I need from Ben: nothing.

---

## The session's three sources of truth, and the one direction between them

Where: `src/routes/Session.tsx`

What I checked: a step is held in three places and each has a different job —
the URL says which step is on screen (D.4's done-when is reloading on
`/session/:id/reflect`), the reducer says which steps are allowed, and the row
is what survives a closed tab.

What I did: reconciled them in ONE effect and in ONE direction, URL → rules →
row. Every control navigates rather than dispatching, so a rail tap and a
pasted URL take the same path.

Why: two effects pushing at each other is how a wizard flickers between steps.
The single direction is also what makes the unreachable-step case a redirect
rather than a fight — and that redirect is a `<Navigate>` in the render rather
than a `navigate()` in the effect, because a redirect issued during an effect
races the render it was trying to prevent.

What I need from Ben: nothing, just flagging that this is the most load-bearing
thirty lines in the phase.

## `sessions` has no `completed` column, so it is derived — and the derivation had a real bug

Where: `src/lib/session.ts` (`completedBefore`), `src/lib/session.test.ts`

What I checked: `PersistedSession.completed` is `readonly StepId[]` and
`sessions` stores only `step`. So `resumeSession` could not be fed from a row
as written — D.4 had to either add a column or derive the set.

What I did: derived it. Everything before `step` that is in the run, which is
exactly what the reachability rule already implies, so no row can disagree with
itself. A column would have been a second source of truth for something the
first one already says — the same argument `skipped` won.

**The first version was wrong and a test caught it.** `run.indexOf(step)`
returns −1 for a step outside the run, and `slice(0, -1)` quietly returns
everything but the LAST element rather than nothing. That is reachable: a
content edit making an exercise cardless while somebody's session sits at
`scan` produces exactly that call, and resuming would have reported `listen` as
completed when it had not been. Guarded, with the reason written beside it.

What I need from Ben: **one consequence, stated rather than hidden.** Go back a
step, close the tab, and you resume at the step you went back to rather than
the furthest you reached. That is what `sessions.step` means — "where you
stopped" — and it is what the diary reports for an unfinished run, so the
alternative needed a second column meaning something else. It is defensible and
it is a behaviour, not an accident.

## A declined reflection finishes the session, and DOMAIN-MODEL.md's diagram is now the looser of the two

Where: `src/routes/Session.tsx` (`finish`), `DOMAIN-MODEL.md`

What I checked: `reflections.body` is `not null`, so "nothing to say" can only
be expressed as the ABSENCE of a row. DOMAIN-MODEL.md's state diagram reads
`started --> finished : completes the reflection`, and `sessionMachine.FINISH`
enforces only "you are on the last step".

What I did: Ben answered yes on 2026-09-19 — declining finishes. The run writes
no `reflections` row and sets `status = 'finished'`. The diary already renders
an entry with no answer.

Why the order of the two writes matters: the reflection first, then the status.
A failed answer then leaves the session running and retryable; reversed, it
would leave a finished session claiming a reflection that was never stored,
which is the one thing a diary must never do.

What I need from Ben: nothing — the decision is his. Flagging that
DOMAIN-MODEL.md's diagram sentence now describes the common case rather than
the rule, and should be re-worded when that file is next touched.

## The session context column shows a user-type ID — ANSWERED, ROW DROPPED

Where: `src/routes/Session.tsx`, the `context` list

What I checked: the prototype's "This session" box shows *Here as* with the
chosen type's label. `profiles.user_type_id` is an id (`by-myself`); the labels
live in `user_type_i18n`, which this screen does not read, so the row rendered
a slug.

**ANSWERED 2026-09-20 — dropped.** Ben's call, and the better of the two
reasons is not the round trip: the box's job is what THIS SESSION is, and
"here as" is a profile fact that has not changed since /about-you and is on
/settings whenever anyone wants it. The screen no longer reads the profile at
all.

What I need from Ben: nothing. The box now carries the exercise, and the card
once one is drawn.

## The listen step is the stage only, and the reveal is still E.5

Where: `src/components/SessionListen.tsx`

What I checked: the prototype's listen step is three stacked 100svh viewports
with two sticky rails, a measured stage height, a warning interstitial and a
details view holding the full `MusicPlayer` and the track's identity — and
reaching the third view IS the reveal.

What I did: built the stage — copy, question, `TrackButton`, the 90-second
gate, the CTA handover. The other two views are not here.

Why: they exist to gate `reveal-track`, which is E.5, and MOCKUPS.md 5 already
files the reveal there. Nothing built here has to be undone when they arrive —
they are scroll targets below this one.

What I need from Ben: nothing. Flagging so E.5 does not inherit it as a
surprise.

## The gate is 90 seconds and nothing in the schema says so — ANSWERED, IT IS A COLUMN

Where: `src/components/SessionListen.tsx`,
`supabase/migrations/20260918150500_content_schema.sql`

What I checked: the prototype hardcodes `Math.min(90, duration)` with a comment
— "the exercise works from ninety seconds in, and demanding the whole track
would make a five-minute piece a five-minute wait". There was no column for it.
`exercises` has `timeframe_min` and `timeframe_max`, which are the whole
exercise rather than the listening.

**ANSWERED 2026-09-20 — it varies, so it is a column.**
`exercises.listen_gate_seconds`, `not null default 90`, with a `>= 0` check.
In `exercises` rather than `exercise_i18n` because it is a number, not copy —
the same reasoning that puts `timeframe_min` there. Edited into the existing
migration in place and verified with `supabase db reset` (rule 4), types
regenerated, three new `pnpm test:db` assertions.

THE CAP STAYS IN THE APP, and the split is deliberate: the exercise cannot see
the recording, so a gate longer than the track would be unreachable. The column
says what the exercise wants; the step reconciles it with what the track is.

What I need from Ben: **two of the three numbers are estimates and are yours.**
90 for Quick Mindfulness Break is the prototype's measured figure and is
carried over unchanged. Breathing Score (60s) and Body Scan Soundwalk (180s)
are proportional guesses — neither exercise has a recording to tune against, so
there has never been anything to measure. The seed says so where they are set.
The moment either has a track: listen to it, and set the number.

## Two screens hold a state the reducer also holds, and they are not the same state

Where: `src/routes/Session.tsx` (`listened`), `src/components/SessionReflect.tsx`
(`recording`, `elapsed`, `photo`)

What I checked: `listened` is sticky within a session — leaving the listen step
and coming back must not re-lock it, because they HAVE listened — so it lives
on the session screen rather than in the step. The reflect step's recording
clock and chosen photo live in the step, because nothing they capture is ever
saved and lifting them would put something in the session's shape that the
session never writes.

What I did: split them exactly that way.

What I need from Ben: nothing. Flagging that `listened` is NOT persisted: a
reload mid-listen re-locks the gate. Persisting it would need a column for a
fact about a session's UI rather than about the session, and the cost of
getting it wrong is ninety seconds.

## The end-to-end walk found two defects that nothing else did

Where: `apps/web/e2e/session.spec.ts`, `src/components/SessionListen.tsx`,
`src/routes/Session.tsx`

What I checked: `pnpm check` was green — typecheck, lint and 89 unit tests —
and both bundles built, through both of the bugs below. Neither was visible to
any of it, because every piece in isolation was correct.

**1 · The listen step was a dead end, in exactly the state the product is in.**
There are no audio files (E.4 is blocked on licensing), so `play()` rejects and
the step falls back to a simulated clock. But the `<audio>` element also fires
`pause` on its way down, and that event arrives AFTER the step has decided to
simulate — the handler was closed over the state variable, still read `false`,
and called `setPlaying(false)`. The transport flipped to playing and instantly
back, the interval never started, the position never moved, and the 90-second
gate could never open. **There was no way past the listen step.**

Fixed by mirroring the flag on a ref, so events already in flight see the
decision, and by unmounting the element once it has refused — it has nothing
left to offer, and leaving it mounted leaves a second thing driving `playing`
against the clock that has taken over.

**2 · The reconciliation refused every forward move.** Written up under "the
session's three sources of truth" above; `stepTransition` is the fix and it has
seven tests.

What I need from Ben: nothing. Recorded because it is the answer to "was the
end-to-end test worth writing" — it paid for itself on the first run, and both
defects were in the two places D.4 and D.5b are most load-bearing.

## Everything is verified against a running stack now

Where: the whole phase

What I checked: Docker WAS running; `docker ps` and `supabase status` were
simply slow to answer, and an earlier version of this entry concluded from that
silence that the stack was down. It was not. All twelve containers were up.

What I did: ran everything. `pnpm check` green (89 unit tests), `pnpm test:db`
green (64 tests, schema untouched this phase), `pnpm test:e2e` green in both
locales, both bundles build, and the rows were read back out of Postgres by
hand as well — a `finished` session with `card_id` mc-08 and `track_id` trk-08,
`ended_at` set, and the German reflection body stored verbatim.

What I need from Ben: **the hand walk.** A machine can prove the rows land; it
cannot tell you whether the cadence on About Musie feels like someone talking
to you, or whether the German fits at 393px. That is the checkpoint, and it is
the only part of Phase D still open.

## Playwright's `webServer` url must be `localhost`, not `127.0.0.1`

Where: `apps/web/playwright.config.ts`

What I checked: Vite binds to `localhost`, which Node 22 on macOS resolves to
`::1`. A dev server that is up and serving is therefore INVISIBLE on
`127.0.0.1` — Playwright decides it has to start its own, Vite finds 5173 taken
and moves to 5174, and the walk then tests a server the config is not pointed
at. Measured, not guessed.

What I did: `http://localhost:5173`.

What I need from Ben: nothing. Flagging because it will look like an arbitrary
preference to whoever tidies it.

---

# Phase D — twelve changes after the first walk

Ben walked the flow on 2026-09-20 and asked for twelve changes. Most were
straightforward; these are the ones that turned out to decide something.

## "Allein" is preselected, and it must NOT be a database default

Where: `src/routes/AboutYou.tsx`, `DEFAULT_USER_TYPE`

What I checked: the obvious implementation is a default on
`profiles.user_type_id`, set by the trigger that creates the row. It would
have broken the onboarding outright: `/` decides whether you are a RETURNING
visitor by asking whether that column is set, so every brand-new user would
have skipped the About Musie explainer on their first ever visit — the one
screen that exists to be seen once.

What I did: the default is a SUGGESTION on screen and nothing else. The radio
shows it, Continue is live because of it, and the write happens when Continue
is pressed. Nothing is recorded until the reader acts.

That made Continue write, which it did not before. A pick still writes
immediately; Continue now also writes, for the one reader a pick cannot cover
— the one who accepts the default without touching it. Without that, accepting
the default would land on /exercises with nothing recorded and the drawer would
bounce them straight back.

What I need from Ben: nothing. Flagging that the id is a constant rather than
"the first implemented one": `implemented` says what is BUILT and this says
what is COMMON, and those stop agreeing the day a second path ships.

## The glyph key became its own component, because a prop could not be moved

Where: `packages/design-system/src/RadioCards.tsx`, `RadioCardLegend`

What I checked: the key was `RadioCards.glyphLegend`, which rendered it inside
the fieldset directly above the cards. Ben wants it on one row with "let Musie
pick an exercise". A prop that renders inside the group cannot express that,
and a screen cannot build the row itself without emitting `.musy-rcard-legend`
from `apps/web` — which is the one thing a screen must not do.

What I did: extracted `RadioCardLegend` as its own export. Both arrangements
are now the consumer's to compose.

It also moved a spacing decision. `.musy-rcard-legend` carried
`padding-block-end`, which was right when it had exactly one home and is
geometry the consumer cannot control now that it has two. The padding is gone
from the component and the GAP belongs to whatever places it — which is what
stopped the app needing an override.

What I need from Ben: nothing.

## The skip control finishes the session rather than toggling a mode

Where: `src/routes/Session.tsx` (`finish`), `src/components/SessionReflect.tsx`

What I checked: "Not right now" used to put the panel into a declined state
with an "Answer after all" escape, and Finish then ended the run — two taps and
a mode. Ben asked for it renamed to *Skip reflection* and placed next to
*Finish session*.

What I did: read the placement as the intent. Beside Finish it is an
ALTERNATIVE ACTION, not a mode toggle, so it ends the session directly and
writes no `reflections` row. The declined state, its box and its two strings
are gone.

`finish(skip)` takes an argument rather than reading state, because the two
have to be decided in the same tick — `setDeclined(true)` followed by
`finish()` would read the render that has not happened and write an empty
answer. `hasAnswered` lost its `declined` parameter with it: it now answers one
question, "is there something to write", and skipping never consults it.

What I need from Ben: **confirm the reading.** One tap ends the run with no
answer. If you meant two — mark it skipped, then press Finish — it is a small
change back.

## The skip link is gone, and that is a Level A criterion

Where: `src/AppShell.tsx`, `src/shell.css`, both catalogues

What I checked: WCAG 2.4.1 Bypass Blocks is **Level A**, and the skip link was
how this app met it — one tab stop, first in the DOM, jumping past the header.

What I did: removed it, as asked. `<main>` is still a real landmark with an id,
so screen-reader users reach it by landmark navigation, which is how most of
them actually move.

Why the cost is small here and still real: what is lost is the KEYBOARD-ONLY
SIGHTED user, who has no landmark list. On this app that is two tab stops of
header to walk past on every page. `tabIndex={-1}` and the focus ring on
`<main>` went with it — they existed only so the skip target could take
programmatic focus.

What I need from Ben: nothing — it is your call and it is made. Recorded
because "we do not meet a Level A criterion" is the kind of thing that should
be a decision in writing rather than a thing someone discovers in an audit.
It is one component to put back.

## Finishing lands on /diary, and the list had to earn it

Where: `src/routes/Session.tsx`, `src/routes/Diary.tsx`

What I checked: finishing used to land on `/diary/:id` — the entry you just
made. Ben asked for `/diary`.

What I did: both halves, because one without the other is worse. The list now
leads with the most recent session in a framed box carrying its facts and a way
into the full entry; everything older keeps the grouped list under an *Earlier*
heading. So landing on the list still puts the thing you just did first.

With exactly one session there is no *Earlier* heading and no timeline at all —
a heading over an empty run says less than its absence. Verified at both
shapes in a browser.

What I need from Ben: nothing.

## Four things were measured rather than assumed

Where: the browser, against the running stack

- The session headline resolves to exactly `rgb(97, 90, 77)`, which is
  `--on-surface-muted` computed — so `headlineTone="muted"` is doing what it
  claims rather than merely looking darker.
- The track button is 285px inside a 930px column, so it hugs rather than
  fills. It needed no CSS: a plain `<div>` around it is enough, because
  `.musie-stack` is a flex column whose children stretch and `.musy-btn` is
  `inline-flex` inside a block.
- The glyph key and the escape hatch share one row, and the legend is no longer
  rendered visibly while remaining in the accessible tree.
- "Allein" is preselected with the ready hint, in German, and Continue is live
  on arrival.

---

# Phase D — five more, from the second walk

2026-09-20. Two were bugs Ben found by using the thing; three were gaps.

## The explainer was unreachable, and the redirect was the cause

Where: `src/routes/AboutMusie.tsx`

What I checked: the drawer's *How Musie works* row points at `/`, and `/` IS
the explainer — but it redirects to /exercises whenever a user type is
recorded, which is everyone past their first visit. So the row went straight
past the page it names. D.1's own comment claimed a `useRef` latch prevented
this; it did not. The latch only stops the page redirecting out from under
somebody who picks a type WHILE reading it. A fresh mount always re-decided.

What I did: the skip now also requires `location.key === 'default'`. React
Router labels the first entry in a history stack 'default', so it means "the
app was opened here" rather than "somebody navigated here". Opening Musie takes
you to the library; asking how it works shows you how it works.

One measured consequence, and it is the right one: RELOADING the explainer
keeps you on it, because a reload restores React Router's own history state and
the key is no longer 'default'. Being bounced off a page you deliberately
opened because you pressed refresh would be worse.

What I need from Ben: nothing.

## A dismissed lightbox left the card selected, because the group was uncontrolled

Where: `src/routes/Exercises.tsx`

What I checked: `RadioCards` had `onValueChange` and no `value`, which makes
base-ui's RadioGroup UNCONTROLLED — it keeps its own selection. So dismissing
the detail left the card filled, claiming a choice the session never made. The
comment beside it said "no selection is ever held", which was the intent and
not what the code did.

What I did: `value` is DERIVED from the open lightbox. The card you are reading
about is checked while you read about it, and nothing is checked once the popup
closes. `''` rather than `undefined` for the empty case — a defined value is
what makes the group controlled, and no card has that value.

What I need from Ben: nothing.

## Closing a session says why it cannot be resumed

Where: `src/i18n/*.ts`, `session.close.text`

What I did: the dialog now says the run cannot be picked up again, and why —
the exercise works from how you feel now, and that will have moved on. Ben's
wording, and it is a PRODUCT statement rather than a technical one: nothing in
the schema prevents resuming an abandoned session, and the reason not to is
that it would be finishing somebody else's.

What I need from Ben: nothing. Flagging that the code and the copy now agree
by convention rather than by constraint — `sessions_status_check` would accept
a row moving from 'abandoned' back to 'started', and no screen offers it.

## Both ways out of a session now end in the same place

Where: `src/routes/Session.tsx`

Finishing and closing both `navigate('/diary')`. They used to differ —
finishing went to the list and closing to the entry — which meant the two
endings of one screen felt like different products.

## Deleting a session, and the two things it needed that nobody asked for

Where: `src/routes/DiaryEntry.tsx`, `src/lib/session.ts`, `src/lib/useDiary.ts`

Ben asked for a delete icon button in the entry lightbox. Two things came with
it:

**A CONFIRMATION, which was not requested.** The row and its reflection go for
good — `reflections.session_id` is `on delete cascade` — and BUILD-PLAN G.2
already specifies that deletion is confirmed. A one-tap irreversible delete on
somebody's diary is the wrong default. It is INLINE (a `Message variant=
"warning"` replacing the box's controls) rather than a second Lightbox: this
box is already inside one, and a dialog over a dialog is where focus management
stops being base-ui's problem and becomes ours.

**A CACHE KEY, because the list showed the deleted row.** `AppShell` keeps the
diary mounted beneath the entry overlay, so returning to it re-rendered a
component with no reason to re-read. `useDiary` now keys on `location.key` as
well as the locale, which gives one rule: **the diary re-reads whenever you
ARRIVE at it, and not when an overlay over it merely closes.** Closing an entry
goes BACK, restoring the previous key, so the list you had is the list you get
— correct, nothing changed. Finishing, closing or deleting all NAVIGATE, so the
list re-reads — correct, something did.

What I need from Ben: **this is half of G.2.** "One session" is done, with
confirmation. "And everything" — a delete-my-whole-diary control — is not, and
neither is anything about orphaned files, which there are none of because
nothing is ever uploaded. G.2 should be re-scoped rather than re-planned.

# Phase E · E.0 and E.1

## MOCKUPS.md 4 is now wrong in both directions, and I could not fix it here

Where: `MOCKUPS.md` entry 4, `src/components/SessionScan.tsx`

What I checked: entry 4 describes the scan step as a dashed viewport plus an
info `Message` carrying **Simulate a scan**, and says in its own words that
"the simulate button disappears when E.1 lands". E.1 has landed. The button is
gone, the random draw with it.

What I did: nothing to that file. It is one of the documents a step is not
supposed to rewrite on its own, and the entry now needs a rewrite rather than a
line edit — it overstates what is missing (the simulated draw is gone, and a
real code really does open a real card) and understates it at the same time,
because the honest gap it should now describe is a different one: **between
E.1 and E.2 the only in-app way to name a card is to type it.** The QR route
works, but it works by leaving Musie, scanning with the phone's own camera app
and coming back through `/s/:code`.

What I need from Ben: **a ruling on whether that is a shippable state or a
reason to keep the simulate button until E.2.** It is genuinely arguable. The
deep link makes the paper deck work end to end today, which the simulate button
never did — but somebody who opens the app first, with a card in their hand and
no idea the QR code is live, is told to go and use a different app. The copy
says so plainly (`session.scan.readerNote` — "Musie cannot open the camera
itself yet"), which is the standard MOCKUPS.md sets, but plain is not the same
as good.

## The end-to-end suite has never been executed against any of this

Where: `e2e/session.spec.ts`, `e2e/scanlink.spec.ts`, `e2e/support.ts`

What I checked: `pnpm check` passes — 98 unit tests, 10 of them new against
`decodeScan` — and both bundles build. None of that touches Playwright, and
`pnpm test:e2e` needs the local Supabase stack, which was a contended resource
while this was built.

What I did: wrote the walks and left them unrun. `session.spec.ts` now types
`MC-08` where it used to press Simulate, and its two closing assertions changed
from shape (`/^mc-\d\d$/`) to identity (`toBe('mc-08')`) — which is the point
of the change and not a tidy-up, because a typed code is chosen by the test and
a random draw never was. `scanlink.spec.ts` is new: one walk of `/s/MC-01` into
a running session, and one of the same link with nothing running, asserting the
card is held and **no session was invented to hold it**.

Why it matters more than usual here: D.6's checkpoint records that the last
end-to-end walk found two real defects that `tsc`, lint and 89 unit tests all
missed, and both were in exactly this area — the seam between what the URL
says, what the reducer allows and what the row holds. `/s/:code` adds a fourth
voice to that conversation, arriving from outside the app with no in-memory
state.

What I need from Ben: nothing, but **the next session must run
`pnpm test:e2e` before any of this is called done**, and should expect the
deep-link walks to be where the surprises are.
---

# Phase F · F.0 — the voice proof-of-concept comes in

## F.0 stopped short of the two Musie UI files, because F.4 is where they belong

Where: `features/voice/src/index.ts` (the "what was left behind" list),
`packages/design-system/src/DraggableList.tsx`

What I checked: F.0 says "the demo scaffolding left behind" and F.4 says
"`MusieTranscriptWorkspace` and `MusieStatementCard`, on the real `Toast` and
`DraggableList`". So the plan already has the two files landing twice, and the
question is which step they land in.

`MusieStatementCard` is 194 lines and `useDragList` is 281, and between them
they are §7.24 rewritten: the same hidden headline, the same float-a-spacer
layout with the text leading in the DOM, the same `data-no-drag`, the same
Field-parts editor, the same before/after/combine drop modes, the same
direction-aware merge. `DraggableList.tsx` says so in its own header, at
length, including the two traps the POC also fell into and documented — the
float that only works from the front of the flow, and the flex container that
silently steps around the spacer. The POC took its copies from
`reference/musie260917/`, a snapshot of the system from before the app existed.

What I did: imported the feature — microphone, socket, segmentation, filler
cleaning, statement state — and left both UI files in the POC repository. The
package now renders nothing at all.

Why: importing them would have been a second copy of a released component, in
a monorepo whose first rule is that the app consumes the design system rather
than reimplementing it, and F.4 would have deleted them in the next session —
so the choice was between importing 475 lines to delete them and not importing
them. What the import DOES carry is the shape that makes F.4 mechanical:
`Sentence` extends the system's `DraggableItem`, and `combine` and `move` take
exactly the arguments `onCombine` and `onMove` hand them, so
`<DraggableList items={sentences} …>` type-checks with no adapter.

What I need from Ben: **a ruling on whether F.0 is done.** "Nothing imports a
relative path into `packages/`" is satisfied and `pnpm check` passes, but if
F.0 was meant to leave a rendering component behind, it did not. My reading is
that F.4 is that step and it is unblocked.

## The POC's user-visible strings could not come across, so the feature stopped speaking

Where: `features/voice/src/messages.ts`, `apps/web/src/lib/voiceMessages.ts`,
`src/i18n/{en,de}.ts` (`voice.*`)

What I checked: the POC wrote its copy where the failure happened —
"Microphone access was denied. Allow it in your browser's site settings and try
again.", "Rate limit reached — this sentence was skipped… free-tier accounts (3
per minute) run out quickly", "Statements combined". English prose, in the
core, handed to a banner. CLAUDE.md 6 and 7 do not allow that: every
user-visible string comes from `apps/web/src/i18n` in both languages, and
`MessageKey` is `keyof typeof en` so the catalogue is the only source. A
package below the app can satisfy neither half.

What I did: the feature reports a `VoiceMessageCode` and the app decides what
to say. `VOICE_MESSAGE_KEYS` is a `Record<VoiceMessageCode, MessageKey>`, so a
code with no catalogue entry is a typecheck error in English and German at
once. Thirteen strings written to `docs/GERMAN-UI-WRITING.md`: eleven failures,
one warning, two undo labels.

Why: it is the same guarantee the i18n layer already has, extended across a
package boundary, and it also fixes a second problem — the POC's copy was
written for an operator. "Add credits at
platform.openai.com/settings/organization/billing" is unactionable by the
person holding the phone, who has no OpenAI account and only needs to know
that Musie cannot listen and that writing still works.

What I need from Ben: **thirteen strings are now in the catalogue with nothing
rendering them**, so they have been read but not seen. Two in particular are
product statements rather than error text and are worth a look before F.4:
`voice.error.connectionRejected` and `voice.error.noCredits` both say "That is
on our side, not yours", which is a posture, not a translation. There is
deliberately no headline key — Message, Toast or inline is F.4's decision, and
a headline written for a component nobody has chosen is a placeholder.

## The PCM worklet's delivery has never been through a bundler

Where: `features/voice/src/audio/recorder.ts`, `DEFAULT_WORKLET_URL`

What I checked: the POC read `${import.meta.env.BASE_URL}pcm-worklet.js` and
kept the file in its own `public/`, which cannot survive the move — the package
does not know what the app's public directory holds, and the worklet belongs to
the recorder rather than to the app. The file came across to
`src/audio/pcm-worklet.js` and is loaded with `new URL('./pcm-worklet.js',
import.meta.url)`.

What I did: took the bundler pattern, and added a `workletUrl` override on
`startRecorder` so the app can supply its own if the pattern disappoints.

Why: it keeps the worklet beside the module that loads it, which is the only
arrangement that is true for both the dev server and a production build.

What I need from Ben: nothing, but **the main session should know this is
unverified.** Nothing in `apps/web` imports `startRecorder` yet, so no bundle
has been asked to emit that file — `pnpm --filter web build` passing proves the
app builds, not that the worklet would load. F.2 or F.4 is where it first
runs, and if `AudioWorklet.addModule` 404s, the override is the lever.

## `onSentenceFinal` lost its toast, and gained a handler

Where: `features/voice/src/onSentenceFinal.ts`

What I checked: the POC's extension point carried a `console.log`, a `Set` of
toast listeners, a `subscribeToToasts`, and a hardcoded "Sentence finished"
raised on every finalised statement. The undo toast the product actually wants
is a different thing and is owned by `useSentences`, which knows what was
undone.

What I did: dropped all three. The module now holds one settable handler
(`setSentenceFinalHandler`), defaulting to a no-op.

Why: the toast was instrumentation — something had to prove on screen that the
hook had fired — and it would have fired on every pause, in English, over the
top of the undo offer. The settable handler is what F.6 needs: the Supabase
write is installed once, and no hook has to learn about it.

What I need from Ben: nothing. Flagging for F.6 that the four paths that call
this are all in `useSentences` and `useTranscription` — a turn completing,
Stop's grace period expiring, an edit being saved, two statements being
combined — which is where "it must be idempotent" will bite.

## `features/*` is a third workspace root, and the design system is a real dependency of it

Where: `pnpm-workspace.yaml`, `features/voice/package.json`

What I did: added `features/*` beside `apps/*` and `packages/*`, and made
`@musie/voice` its own workspace package with its own `typecheck`, `lint` and
`test` scripts, so `pnpm check` reaches it whether or not a screen consumes it.
`apps/web` now depends on it, for the code-to-key map above.

Why a package rather than a folder in `apps/web`: the feature has to hold up on
its own before a screen is built on it, and F.1, F.2 and F.6 all change it from
the outside. Netlify's build command is `pnpm check && pnpm --filter web
build`, run from the root, so the new package is installed and checked there
with no change to `netlify.toml`; CI's `pnpm install --frozen-lockfile` covers
the lockfile.

What I need from Ben: nothing, but it is worth knowing WHY `@musie/voice`
depends on the design system when it renders nothing. It imports two TYPES —
`DraggableItem` and `CombineOrder` — rather than declaring its own copies of
shapes §7.24 already owns. Type-only, so nothing reaches the bundle, but it
does mean `@base-ui/react` and `lucide-react` are dev dependencies of a package
with no components in it: `tsc` has to resolve the barrel to read two types.

# Phase G · the diary at a month's scale, and deleting all of it

## Delete-everything went to /settings, and /diary was the other candidate

Where: `src/SettingsSheet.tsx`, `src/lib/session.ts`

What I checked: BUILD-PLAN G.2 says only "a delete-everything control leaves
no `sessions` and no `reflections` rows" — it does not say where the control
lives. The existing entry above, *Deleting a session, and the two things it
needed that nobody asked for*, settles the single delete: the control sits
inside the card of the thing it deletes, and the confirmation replaces that
card's own controls. That is the pattern this had to either extend or break.

What I did: put it in /settings, last in the sheet, as a labelled `CtaButton`
with a leading `Trash2` inside a `ContentBox` headed `route.diary.title`. The
full argument is in a header comment above `DeleteEverything`, because it is
the one real decision in this piece of work.

Why: the single delete's pattern does not extend, because it depends on the
object being on screen. Delete-everything has no object — it is an act on the
account, in the same family as the language and the theme, which are already
here. And /diary is the thing being destroyed: a control that empties the
diary, sitting under thirty rows somebody is scrolling past, is the definition
of the easy thing to hit by accident.

What I need from Ben: nothing, but it is worth knowing the cost. Somebody who
wants this while looking at their diary has to go to settings to find it.
I think that is the right friction for this button; if you disagree, the
component moves in one piece and the only thing that changes is which file
renders it.

## Deleting everything takes a RUNNING session, and only one line stops that stranding you

Where: `src/lib/session.ts` `deleteAllSessions`, `src/SettingsSheet.tsx`

What I checked: `deleteAllSessions` carries no `status` filter, so a session
with `status = 'started'` goes with the rest. That is what the done-when asks
for — no `sessions` rows — and it is the only reading the copy can honestly
carry: "your whole diary" cannot quietly mean "except the one you are in the
middle of". The German and English both name it.

/settings is an overlay that opens over ANY page, `/session/:id/:step`
included (`AppShell`, `router.tsx`). So this is reachable: start a session,
open the menu, open settings, delete everything, and the page underneath the
sheet is a route whose row no longer exists.

What I did: the sheet navigates to `/diary` with `replace` after a successful
delete. That closes the sheet, re-reads the diary through `useDiary`'s
`location.key`, and — the part that matters here — takes the person off the
dead route. Nothing else in the app is notified, and nothing else needs to be:
`useActiveSession` is read by the drawer, which is a route and re-reads on
every open, and `ScanLink` reads it fresh too.

Why: the navigation is doing three jobs at once, and only one of them is
obvious. If somebody later "tidies" it into `close()` — the sheet's own
`useCloseOverlay` — two of the three quietly stop happening.

What I need from Ben: a decision I made by default. Deleting your diary
mid-session ENDS that session by deleting it, rather than refusing, warning
twice, or finishing it first. I think that is right — it is what "everything"
means — but it is the one case where the button does something the person may
not have pictured.

## The delete-everything confirmation names no count, and a count was the first instinct

Where: `src/i18n/en.ts` `diary.deleteAll.text`

What I checked: the strongest version of this confirmation says the number —
*this removes all 34 sessions*. It needs one cheap read
(`select('id', { count: 'exact', head: true })`) and it would also give the
control a reason to be hidden when the diary is empty.

What I did: no count. The sentence says what is lost in words.

Why: two reasons and the second is the deciding one. German and English
pluralise differently and the catalogue has no plural machinery — *all 1
sessions* / *alle 1 Sessions* — so a count needs two more strings per language
before it is correct. And a count read that FAILS would have to either hide a
control the privacy copy promises the user, or show a confirmation with a hole
in it. A sentence that is always true beats a number that is usually there.

What I need from Ben: nothing. If you want the number, the honest shape is
`diary.deleteAll.textOne` / `…textMany`, and it is four strings, not one.

## The filter appears at five entries, and five is a judgement rather than a measurement

Where: `src/lib/diary.ts` `FILTER_FROM_ENTRIES`

What I checked: BUILD-PLAN G.1 asks for filtering and for a screen that reads
well "after thirty sessions rather than on day one". A filter drawn on day one
is three segments over one row — chrome explaining itself — so it needs a
floor, and nothing in the plan or the mockups names one.

What I did: `FILTER_FROM_ENTRIES = 5`, one exported constant, read once.

Why: five is roughly where the run stops fitting under the latest entry's card
on a 393px screen. I did not measure it against a device — see the note below
about what has and has not run — so it is a designer's number waiting for a
designer.

What I need from Ben: a number, if five is wrong. It is a one-line change and
nothing else depends on it.

## The filter axis is status, and the exercise was the other candidate

Where: `src/lib/diary.ts` `DiaryFilter`, `src/routes/Diary.tsx` `FILTER_LABEL`

What I checked: the two things a diary row can be filtered by today are its
status and its exercise. `SegmentedControl` is specified for **2–4 options**
and warns in development past that (`SegmentedControl.tsx`), and it requires a
glyph per option because a label can be clipped.

What I did: status. Three segments — all, finished, unfinished — and the last
two reuse `session.status.*` rather than new strings, so the filter and the
badge on the entry card cannot end up calling one status two things.

Why: status is the question a long diary actually raises, and it is answerable
from a column every row already carries. An exercise filter is three segments
today and eleven once the Mindfulness Cards spreadsheet lands, which is past
the point where this is the right component at all.

What I need from Ben: nothing, but if filtering by exercise is wanted later it
is a different control (a Select, or RadioGroupText) and not a fourth segment.

## G.1's VISUAL half is not built, and it does not belong in the app

Where: `packages/design-system/src/Timeline.tsx`, `LinkList.tsx` — untouched

What I checked: both components say they are "deliberately basic" and that
"Phase G.1 draws the real timeline". Timeline's header is specific about what
that means: "a rail, a marker per group, sticky headings".

What I did: **nothing in `packages/`.** G.1's grouping, filtering and empty
states are entirely consumer-side — which resolution a heading gets, what it
says, and in which language — and none of it needed a prop or a rule that
Timeline and LinkList do not already have. The bones really were correct.

Why: the rail, the markers and the sticky heading are the design system's,
not the screen's. Building them in `apps/web` would mean a `musie-` pattern
reaching into `.musy-timeline__group`'s geometry, which is exactly what L14's
opening rule and L7 forbid, and the second copy L14.3 calls a component
request.

What I need from Ben: **a decision, and this is the loudest thing in this
log.** Half of what G.1's name promises is still unbuilt, and it is a design
system change: `Timeline` needs a variant that draws the rail and the markers,
and `position: sticky` on `.musy-timeline__heading` is a one-declaration
change with a scroll-container question behind it. Until then the diary at a
month's scale is correctly GROUPED and looks the same as it did.

## Three database tests were written for G.2 and none of them has run

Where: `src/lib/diary.db.test.ts`, the `deleting the whole diary · G.2` block

What I checked: the local Supabase stack is one shared resource and another
session was using it, so `supabase start`, `db reset` and `pnpm test:db` were
all off limits in this worktree.

What I did: wrote the three assertions anyway — every session goes including
the running one, the reflections cascade rather than orphan, and another
person's rows survive — and said in the file's own comment that they have
never gone green or red.

Why: the third one is the one that matters. `deleteAllSessions` names no row,
so `sessions_delete_own` is the ONLY thing between that statement and every
session in the table, and a test is the only artefact that will notice the day
that policy is weakened.

What I need from Ben: run `pnpm test:db` against the local stack before this
branch is believed. Nothing under `supabase/` changed — no migration was
needed, the cascade has been in `20260919120000_sessions.sql` since Phase D —
so this is the only unrun thing in the change.

## MOCKUPS.md entry 10 is now wrong in the other direction, and I could not fix it here

Where: `MOCKUPS.md` § 10 — read-only for this branch

What I checked: entry 10 currently says the diary "groups by calendar day,
which reads well at ten entries and badly at three hundred", that "a month's
scale, filtering, and an empty state tuned for day thirty rather than day one
are G.1", and that what is left of G.2 is deleting everything. All three
sentences were true this morning and none of them is now.

What I did: nothing to the file. Logged here, as the brief asked.

Why: it is the third entry in that file to drift by being right when it was
written, which is the failure mode the file's own header names.

What I need from Ben: entry 10 should now say, in the same voice —

> `/diary` lists your non-running sessions and `/diary/:id` shows one. The run
> is grouped at two resolutions: a heading per day for the last week, one per
> month before that, so the number of headings is bounded by the calendar
> rather than by how long you have been using the product. A filter — all,
> finished, unfinished — appears once the diary holds five entries and has its
> own empty state when it matches nothing.
>
> **Deletion is done.** One session goes from its own card
> ([DiaryCard](apps/web/src/components/DiaryCard.tsx)); the whole diary goes
> from /settings ([SettingsSheet](apps/web/src/SettingsSheet.tsx)), including
> a session still running. Both confirm first. There is nothing to orphan —
> nothing is ever uploaded.
>
> **What is missing:** the timeline's VISUALS. `Timeline` and `LinkList` are
> still the deliberately basic versions — no rail, no marker per group, no
> sticky heading — and that half of G.1 is a design system change, logged in
> `apps/web/OPEN-QUESTIONS.md`. The delete-everything path has never been run
> against a database.

## `diary.latest` and `diary.openEntry` are dead keys, and I left them there

Where: `src/i18n/en.ts` 290–291, `src/i18n/de.ts`

What I checked: neither key is referenced anywhere in `apps/web` or
`packages`. They pre-date this change — the newest entry stopped being a
lookalike box with an *Open entry* link on 2026-09-21, and the two strings it
used were not removed with it.

What I did: nothing. Flagged only.

Why: the precedent in this file is to delete them (*`diary.back` and
`diary.exercise` were written and then not needed*), but both catalogue files
are being edited by another agent this round for `scan.*`, and a tidy-up that
touches lines nobody asked about is the wrong thing to hand a merge.

What I need from Ben: nothing. Two lines in each file, deletable in one
commit whenever the catalogues are quiet.
