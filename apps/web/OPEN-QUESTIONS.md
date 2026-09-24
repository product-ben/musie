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
---

# Phase E · E.2 and E.3 — the camera, and the decoder behind it

## MOCKUPS.md 4 is wrong again, in the opposite direction this time

Where: `MOCKUPS.md` entry 4, `src/components/CardScanner.tsx`

What I checked: entry 4 was rewritten on 2026-09-21 — the commit is
`6bd1603` — and the rewrite is careful and correct about the state it was
written for. Its whole subject is the gap E.2 fills: *"Musie cannot open your
camera"*, *"the dashed frame is the slot that camera goes into"*, *"a square
dashed viewport is a viewfinder by convention, and this one cannot see
anything"*. The camera is now in the slot. So is the fallback for Safari.

What I did: nothing to that file — it is one of the four a step does not
rewrite on its own — and I changed the copy it quotes instead.
`session.scan.readerNote` no longer says *Musie cannot open the camera itself
yet*; it says *Or use the camera on this device — it reads the same code*.
That was not optional: MOCKUPS.md's own closing rule cuts both ways, and a
frame still claiming it cannot see is the same defect as one pretending it can.

What the entry should now say, as precisely as I can put it:

- **The title is now false.** Musie can open your camera. The entry's subject
  has to change or the entry has to go.
- **What you see.** The same dashed square, with *Use the camera* under it.
  Press it and the border goes solid, the preview fills the square, and a line
  underneath says *Hold the QR code on your card inside the frame*. The code is
  read, put into the **Card code** field, and submitted — so the code that was
  read stays visible, which is where an unknown-card error would appear under
  it. Nothing was clicked between the press and the card.
- **What is real.** `getUserMedia` plus `BarcodeDetector` where the platform
  has one (Android Chrome), and zxing-cpp compiled to WebAssembly where it does
  not (Safari everywhere, Chrome on macOS). Permission-denied, no-camera,
  camera-busy, no-HTTPS, no-mediaDevices and decoder-failed each have their own
  sentence, and each names the typed field. A refusal gets no *try again*
  button — `canRetry` in `lib/camera.ts` says why.
- **What is still a mockup, and it is narrow.** Nothing about this has run on
  a phone. See the two entries below: the iPhone Safari test is E.3's actual
  done-when, and nobody in this session could close it. The entry should say
  *unverified on a device* rather than *missing*, because those are different
  claims and the file's rule is about telling them apart.
- **The consequence entry 4 records as "a deliberate trade" is gone.** It says
  somebody who opens the app first, card in hand, "is told to go and use a
  different app". They are not, any more. Ben's 2026-09-21 ruling that the
  state was shippable can be recorded as spent rather than reversed.

What I need from Ben: the rewrite, and a decision on whether the entry survives
at all. My reading is that it should, retitled, until a phone has been held up
— but an entry whose only remaining content is "untested on hardware" may
belong in BUILD-PLAN's checkpoint instead.

## E.3's done-when cannot be closed by any agent, and here is exactly what is left

Where: `src/lib/qrWasm.ts`, `src/lib/qrDetector.ts`, `src/lib/useCardScanner.ts`

What I checked: E.3 says *done when it scans on iPhone Safari*. What can be
proved without one has been, and it is more than I expected: the wasm decoder
has four unit tests that run the real binary against codes `scanLink` minted
(`qrWasm.test.ts`), and the Playwright walk drives the whole camera path
through a fake capture device (`camera.spec.ts`, written and unrun — see
below). What none of that touches is the four things iOS does differently.

What I did: built it, tested the decode, and wrote down the four rather than
implying they were covered.

1. **Autoplay.** Safari will not play a `<video>` that is not `muted` and
   `playsInline`. Both are set as attributes, and `useCardScanner` sets
   `video.muted = true` as a property too, because React does not reliably
   reflect that one. If this is wrong the preview appears frozen — a black or
   still square — while the loop happily decodes nothing.
2. **`facingMode: { ideal: 'environment' }`.** `ideal` rather than `exact`, so
   a laptop with one camera is not told it has none. On an iPhone this should
   select the back camera; if it selects the front one, the feature works and
   is useless, because you cannot point a selfie camera at a card you are
   holding.
3. **The wasm fetch.** 954 kB uncompressed, 411 kB over the wire, fetched the
   first time the camera is used, from this app's own origin. On a phone on
   mobile data that is a pause with no progress indication — the frame says
   *Opening the camera…* and then shows the preview once the decoder has
   landed. Untimed on anything real.
4. **Decode speed.** Four decodes a second, at 640px on the long side, in
   WebAssembly, on a phone CPU. Comfortable on this laptop; a guess anywhere
   else.

What I need from Ben: an iPhone, `pnpm --filter web dev` on the LAN, and five
minutes. **Note that `http://192.168.x.x:5173` is NOT a secure context**, so
the in-app camera will correctly refuse there and show
`session.scan.cameraInsecure` — the LAN test needs a tunnel with a TLS
certificate (or `localhost` on the device itself). That is E.2 working, not
failing, and it will look like failing.

## The Safari fallback costs 954 kB of WebAssembly, and I chose where it comes from

Where: `src/lib/qrWasm.ts`, `apps/web/package.json`

What I checked: `zxing-wasm` defaults to fetching its binary from jsDelivr at
run time. Three things are wrong with that for this app: it makes the Safari
scanner depend on a host Musie has no relationship with, it would fail outright
on a dev server with no route out, and it is a third-party origin in a product
whose whole content model is one Supabase project.

What I did: a `?url` import, so Vite emits the binary as one of this app's own
assets — same origin, same cache, same deploy. It is lazy: 954 kB as a separate
asset plus 34.5 kB of glue in its own chunk, fetched the first time anybody
presses *Use the camera*, and never by anybody who does not. The main bundle
went from 813.27 kB / 244.75 kB gzipped to 821.45 kB / 246.99 kB, and none of
that is zxing — it is the component, the hook and fourteen strings.

What I need from Ben: nothing to decide today, but two things worth knowing.
**First**, Netlify will serve a 954 kB asset on the first Safari scan of each
visit until it is cached; if that is judged too much, the alternative is a
pure-JS decoder (`jsQR` is ~40 kB) at a real cost in read reliability on
angled, low-light and damaged codes, which is precisely the case a paper deck
produces. I would not make that trade without measuring on a phone first.
**Second**, `useWasmBinary` in `qrWasm.ts` exists so the decoder can be tested
in Node, where zxing's web-only fetch fails both ways. It is five lines and it
is exported from a lazily-imported chunk, so it costs the main bundle nothing —
but it is a test seam in product code and somebody should know it is there.

## `pnpm test:e2e` has still never run, and there are now four specs

Where: `e2e/camera.spec.ts`, `e2e/fakeCamera.ts`, `playwright.config.ts`

What I checked: the entry above this phase (*The end-to-end suite has never
been executed against any of this*) is still true, and now more so. This track
added a third and fourth walk and changed the Playwright config, and the local
Supabase stack was held by another session throughout — so nothing here has
been executed either.

What I did: wrote the walks, left them unrun, and proved as much of the fixture
as could be proved without a browser. `src/lib/fakeCamera.test.ts` generates
the y4m clip, asserts the header Chromium parses and the byte-exact plane
layout, pulls the first frame's luma plane out and reads the code back through
the real wasm decoder. That passes. So if the walk fails, the walk has found
something real rather than an arithmetic slip in a fixture.

Two specific risks, both stated rather than hidden, because the next session
will meet them:

- **The denied walk assumes headless Chromium refuses a camera permission
  nobody granted.** That is Playwright's documented behaviour and it is what
  `context.clearPermissions()` is for, but it is the one assertion in the file
  whose premise I could not exercise. If Chromium instead auto-grants, the test
  fails at `session.scan.cameraDenied` never appearing, and the fix is
  `--use-fake-ui-for-media-stream` on one project rather than a change to the
  app.
- **The walk's decoder is the wasm one**, because `BarcodeDetector` does not
  exist on macOS Chrome. That is convenient — it means E.2 and E.3 are
  exercised by one walk — but it also means `qrDetector.ts`'s NATIVE branch is
  covered by nothing anywhere. Android Chrome is the only place it runs, and
  this repository has never seen one.

What I need from Ben: `supabase start && pnpm --filter web test:e2e` in a
session that owns the stack, before any of E.2 or E.3 is called done.

## The scan step's column has never been measured, and L15 says it should be

Where: `src/shell.css` (`.musie-scanner--live`, `.musie-scanner__status`),
`src/components/CardScanner.tsx`

What I checked: the step now stacks a square frame, a status line, a camera
button and the code form in one column. L15 asks for layout claims to be
checked against a rendered page at 393px and 1280px, in that order, and I could
not render one: the scan step needs a running session, which needs the Supabase
stack, which another session held for the whole of this work.

What I did: kept every declaration on a Layer 1 token or a geometric identity
(L14.1) and changed as little as possible — the live frame is the same square
in the same place, and only its border style and padding differ. The status
line is deliberately BELOW the frame rather than over the picture, because text
on live video has no contrast anybody can check: the background is whatever the
camera is pointed at, and L15 asks for contrast against every surface an
indicator can land on.

What I need from Ben: an eye on it at 393px, specifically for two things I
would expect to be the problems if there are any. **The column is now four
things tall** where it was two, so the code field may be below the fold on a
phone — which would matter, because the field is the thing that must never
become hard to reach. And the German status line (*Halte den QR-Code deiner
Karte in den Rahmen.*) is 45 characters against the English 47, so the two runs
should wrap identically; if the German takes a line the English does not, the
frame is narrower than I think it is. The longest German string on the step is
`cameraDecoder` at 130 characters, which is where a third line would show up
first.

## The first line of the scan step still sends you to a different app

Where: `src/i18n/en.ts`, `src/i18n/de.ts` (`session.scan.reader`)

What I checked: the frame's first line is still *Scan the QR code on your card
with your phone's camera app — it opens Musie at that card*, with the in-app
camera offered second. That ordering was right when the in-app camera did not
exist. It is arguable now.

What I did: left the order alone. The deep link genuinely is the better path
when it applies — it needs no permission, no decoder and no megabyte of
WebAssembly, and it is what somebody holding a printed card does by reflex —
so demoting it to second place to advertise the thing we just built would be
building for the builder.

What I need from Ben: a ruling, when there is a printed deck to try it with.
The case for swapping them is that somebody who has already opened Musie is
told to leave it before being told they need not; the case against is that
leaving it is genuinely quicker. This is a copy decision, not a code one —
both strings exist and swapping two lines in `CardScanner.tsx` is the whole
change.

## The db suite can fail on an expired JWT, and it looks like a real failure

Where: `src/lib/db.support.ts`, every `*.db.test.ts`

What I checked: on the merged tree, `pnpm test:db` failed once with
`PGRST303` — PostgREST's code for an expired JWT — at
`diary.db.test.ts`'s first assertion. An immediate re-run passed 70/70, and
the same file had passed 70/70 on its branch twenty minutes earlier.

What I did: nothing, beyond writing it down. The suite mints anonymous users
and holds their tokens for the length of a run, so a slow run can outlive one.
Nothing in the failure says "your token expired" — it says a query returned an
error object where the test wanted null, at whichever assertion happened to be
first past the expiry.

Why it matters more than an ordinary flake: this suite's whole job is to be
believed about security. A failure mode that is environmental, intermittent
and unlabelled is exactly the kind that gets re-run until green out of habit —
and the day one of these tests fails for a REAL reason, that habit is what
will get it dismissed.

What I need from Ben: nothing yet. If it recurs, the fix is for
`db.support.ts` to refresh the session between files, or to assert on the
error code and say plainly that the token expired.

## E.2's walks needed the full Chromium, and the headless shell failed as though the app were broken

Where: `apps/web/playwright.config.ts`

What I checked: all four camera walks failed with "the camera could not be
started" and a *Try the camera again* button — the `failed` state, which is
`cameraProblem`'s default branch. A probe in the page found
`isSecureContext: true`, `videoInputs: 1` — the fake camera WAS there — and
every shape of `getUserMedia`, `{video:true}` included, throwing
`NotSupportedError: Not supported`.

What I did: added `channel: 'chromium'` to both projects. Since Playwright
1.49, a headless `chromium` run uses `chromium_headless_shell`, a stripped
build with media capture removed; the full browser throws `NotAllowedError`
without permission and returns a stream with it, which is what the walks are
written against. All twelve walks now pass, both locales.

Why it is worth an entry rather than a silent fix: the failure pointed at the
application. The screen said the camera could not be started, which was TRUE
of that browser, and an agent or a person reading only the failure would have
gone looking in `camera.ts` for a bug that was not there. The Track E agent
flagged this exact assumption as unverified — "that headless Chromium refuses
an ungranted camera permission" — and was right to. It refuses in the full
browser and does something else entirely in the shell.

What I need from Ben: nothing. Flagging because `channel: 'chromium'` means CI
must install that browser, which `.github/workflows/ci.yml` does not currently
do — but CI does not run `test:e2e` at all today, so nothing is broken yet.

---

# Phase F · F.4 and F.5 — the editor, and the keyboard

## F.5's fix landed in `packages/design-system`, not in the app

Where: `packages/design-system/src/DraggableList.tsx` (`refocus`,
`neighbourOf`, `removeItem`), `packages/design-system/stories/DraggableList.stories.tsx`

What I checked: F.5 asks for "lift-and-move, merge-with-previous, the
`aria-live` announcements", restored against what the POC's Musie card lost.
All three were **already in §7.24** before I touched anything: Space or Enter
lifts, ArrowUp/ArrowDown move, M merges into the item above, Escape cancels,
and every one of the five sets a string in a `role="status"` `aria-live="polite"`
region. So the step's own done-when — reorder and merge without a mouse —
read as already satisfied.

It is not, and the reason is not in the key handling. M is pressed on the
source row's drag handle; Delete is pressed in the source row's own action
menu. Both END that row, React unmounts the focused button, and the document
falls back to `<body>`. The first merge works; the second one starts from the
top of the page.

What I did: the component parks the surviving neighbour's id in a ref and
focuses its handle in the effect after the commit that removed the row. Set at
the two call sites, never inside `combine` — a pointer drop also ends a row and
nothing was focused during it, so focusing there would scroll the page under
somebody's finger. The story's Build notes are updated where they quote source
text that no longer exists.

Why it is not in `apps/web`: a screen cannot reach a row's controls to move
focus between them without reaching into a component's geometry, which is the
one thing rule 1 and L7 forbid outright. `CtaButton`'s `align` prop is the
precedent the guardrails already cite.

What I need from Ben: **an acknowledgement that Track F changed a released
component.** It is 20 lines, it is additive, and every existing behaviour is
unchanged — but it is a design-system change made from an app phase, and the
reference tree under `reference/design_system/` does not have it. If that tree
is ever re-synced over the package, this goes.

## Nothing in this repository can render a component under test, and now something needs to

Where: `apps/web/vitest.config.ts`, `packages/design-system/stories/CONVENTIONS.md`
§5, `apps/web/playwright.config.ts`

What I checked: three routes to evidence for F.4 and F.5, and all three are
closed.

- **Unit.** Both vitest projects are `environment: 'node'`, and the config
  argues for it in writing: "nothing under test touches the DOM, and a jsdom
  dependency bought for nothing is a dependency to keep updated." That was
  true when it was written. It stopped being true with `VoiceTranscript`.
- **Storybook.** CONVENTIONS §5 is explicit — "Never add local state to a
  story. No `useState`, no `useReducer`, no mutable module variable." §7.24's
  own Build notes already name the consequence: "the drag, merge and edit
  states cannot be reached from props… **This is the largest documentation gap
  in the batch.**" A stateful story would make the keyboard path reviewable by
  hand in one screen, and it is the one thing the conventions rule out.
- **End to end.** A Playwright walk can reach the reflect step, but the list is
  filled by SPEECH. There is no statement to reorder without a microphone and a
  live OpenAI session, so a keyboard walk would assert against an empty list.

What I did: pulled every decision that can be wrong out of the component and
into `src/lib/voiceScreen.ts` — which label the record button carries, which
sentence sits under it, whether an ended session owes the reader an
explanation, whether anything has been captured — and drove all of them from
fixture values in `voiceScreen.test.ts` (19 tests). What is left in
`VoiceTranscript.tsx` is JSX and one `await`, which is deliberate: the wiring
should be the only unexercised part, and it is.

Why not simply add jsdom: it is two dev dependencies, a third vitest project
and a rewrite of a config whose reasoning is written down and was correct.
That is a repository decision, not a Track F one, and the brief said to prefer
no new dependency and to say so.

What I need from Ben: **a ruling.** Either (a) `apps/web` gains jsdom and
`@testing-library/react` as a third vitest project, and the voice editor is the
first thing rendered in it; or (b) CONVENTIONS §5 gains an exception for a
component whose entire purpose is a state machine, and §7.24 gets the
interactive story its own Build notes have been asking for since 2026-09-17.
(a) is the stronger one. Until one of them, F.5's behaviour is READ, not seen.

## The transcript dies when you touch the mode switch

Where: `src/components/SessionReflect.tsx` (`{mode === 'voice' && …}`),
`src/components/VoiceTranscript.tsx`

What I checked: the three modes are conditionally rendered, so switching to
*Write answer* unmounts `VoiceTranscript`, and with it `useTranscription` and
every statement in the list. Switching back gives you an empty transcript. The
unmount itself is correct and load-bearing — the hook's cleanup calls
`stop('manual', { immediate: true })`, which closes the microphone and the
socket, and leaving those open behind a hidden panel would be worse in every
way.

What I did: nothing. Left it as it is, and did not lift the sentences into
`Session.tsx`.

Why: lifting them is the same move F.6 has to make anyway, and it has to decide
the harder half at the same time — whether a statement is a row of its own and
what happens to the list when the step is left and re-entered. Doing half of it
now, in a shape F.6 would then re-cut, is how two designs end up in one file.

What I need from Ben: **is losing the transcript on a mode switch acceptable
until F.6?** My reading is yes — choosing another door is a deliberate act, and
the three modes are alternatives rather than tabs — but somebody who taps
*Write answer* to see what it looks like loses a minute of speech with no
warning, and that is a real way to lose somebody's words.

## The PCM worklet DOES survive the bundler — as a `data:` URI, which is a new unknown

Where: `features/voice/src/audio/recorder.ts` (`DEFAULT_WORKLET_URL`),
`apps/web/dist/assets/index-*.js`

What I checked: F.0 logged that `new URL('./pcm-worklet.js', import.meta.url)`
had never been through a bundler, because nothing in `apps/web` imported
`startRecorder`. Something does now, so the question is answerable and I
answered it. `pnpm --filter web build` emits **no** `pcm-worklet.js` asset and
the string `pcm-worklet` does not appear anywhere in `dist` — which looks like
the failure F.0 predicted, and is not. Vite inlined the file as
`new URL("data:text/javascript…")`, because it is under the 4 kB
`assetsInlineLimit`. `class PcmRecorder` and the `pcm-recorder` processor name
are both in the bundle.

What I did: nothing. The `workletUrl` override F.0 added is still the lever and
is still unused.

Why: it is the bundler doing something reasonable, and forcing a separate file
(`?url`, or raising `assetsInlineLimit`) would be a build-config change made to
satisfy a worry rather than a measurement.

What I need from Ben: **flagging one thing for the iPhone checkpoint.**
`AudioWorklet.addModule()` is being handed a `data:` URL rather than a path.
Chromium and Firefox accept module scripts from `data:` URLs; WebKit's
behaviour here is exactly the kind of thing the checkpoint exists to find, and
if it refuses, the symptom will be a microphone that opens and produces no
audio. The fix is one line — pass `workletUrl` from the app, or set
`assetsInlineLimit: 0` for that asset — and knowing to look there is the whole
value of this entry.

## `hasAnswered` still says a spoken answer is not an answer, although it now is words

Where: `src/lib/reflect.ts`, `src/routes/Session.tsx` (the `disabled` on
*Finish session*), `src/i18n/en.ts` `reflect.voice.notSaved`

What I checked: `hasAnswered` returns `mode === 'text' && text.trim() !== ''`,
and its own comment anticipates this session: "The day voice lands,
`mode === 'voice'` gets the same treatment as text: a transcript is words, and
words are what this asks for." Voice has now landed. The transcript is words.
Opening that gate is three characters.

What I did: did not open it. `hasAnswered` is untouched, *Finish session* stays
disabled in voice mode, and the step says why in a Message that replaces the
old *Recording is not built yet* — the two keys are renamed rather than
reworded, because the sentence now names the missing STEP rather than the
missing feature.

Why: opening it would make `saveReflection(id, 'voice', answer)` write the
joined transcript into `reflections.body`, and that is a persistence design
made in passing. F.6 is "persist the statements… editing a statement updates
its ROW rather than inserting a second", which is a table this phase does not
have and a shape a single `body` column cannot express. Deciding the storage of
a spoken answer by whichever gate happened to be easiest to open is how the two
designs disagree later.

What I need from Ben: **nothing to decide, but F.6 inherits a question.** Does a
spoken reflection produce rows AND a `reflections.body`, or rows only with the
body assembled on read? The Message that stands in until then is honest but it
is also the second modal in this step that says "not yet", and the step can
only carry that for so long.

Flagging separately, since F.0 asked and the answer is now visible: the
thirteen `voice.*` strings written at F.0 all render for the first time, and
`voice.error.connectionRejected` and `voice.error.noCredits` still carry "That
is on our side, not yours". F.0 asked for a read on that posture. It is now
readable on a real screen rather than in a diff.

## Pressing play while the signed URL is in flight does nothing, and says nothing

Where: `src/components/SessionListen.tsx`, `src/lib/audio.ts`

What I checked: E.4 made the track's URL a request rather than a string, so
three states now reach the listen step where two did before — a file, no file,
and *not yet known*. `play()` returns early on the third, deliberately:
starting the simulated clock while a URL is in flight would play a countdown
over a recording that exists, intermittently and on slow connections, which is
the worse failure by a distance.

But the early return is silent. The transport is enabled, the press is
swallowed, nothing moves and nothing says why. No second press is coming,
because from the outside the control simply did not work.

MEASURED, and it is not theoretical: E.5's walk failed exactly this way inside
the full suite while passing alone — it pressed play a few milliseconds before
the element mounted, and then waited sixty seconds for a `duration` that could
never arrive, because `preload="none"` means an unplayed element fetches
nothing. The walk now waits for the element first. The person cannot.

Worth knowing what it is NOT: slow storage. The whole 6.9 MB object fetches in
47 ms against the local stack, and the signing round-trip is one request. The
window is small — which is what makes it the kind of bug that is reported as
"it didn't do anything the first time" and never reproduced.

What I did: nothing in the product, deliberately. There are three defensible
answers and they are not mine to pick: disable the transport while `resolving`
(honest, but a control that flickers disabled on every arrival reads as broken
hardware); show the loading state `TrackButton` already has; or queue the press
and honour it when the URL lands (best behaviour, most state).

What I need from Ben: a ruling, and it is small. My own lean is the third —
the press is the person's intent and the URL is milliseconds away, so honouring
it is both the simplest thing to explain and the only one with no visible
state at all.

## Beta accounts that Ben creates by hand — three things H.0 cannot decide for itself

Where: `BUILD-PLAN.md` Phase H (H.0, H.0b), `src/lib/auth.ts`,
`src/i18n/{en,de}.ts` (`privacy.account`, `privacy.browserBound`)

What I checked: whether a beta could run on accounts created in Supabase with
the credentials handed out, so that H stops waiting on a sending domain. It
can, and the mechanism needs nothing new — four facts, all read rather than
assumed:

- Every policy on `sessions` and `reflections` is `to authenticated` with
  `(select auth.uid())` (`20260919120000_sessions.sql` L232–288). An anonymous
  user and a signed-in one are both role `authenticated`.
- `is_anonymous` appears nowhere in `supabase/`, `apps/web/src` or
  `packages/design-system/src`. Nothing anywhere distinguishes the two kinds of
  user — not a policy, not a grant, not either Edge Function.
- `on_auth_user_created` fires on an admin insert like any other
  (`20260918142704_profiles.sql` L121), so the `profiles` row arrives normally.
- `config.toml` already has `enable_signup = true` and `[auth.email]
  enable_confirmations = false`, so no migration and no config edit.

Supabase's built-in SMTP would not have been an alternative: it only delivers
to members of the project's own organisation, so an external tester would never
have received the mail whatever the rate limit said.

What I did: wrote it into the plan as H.0 and H.0b, and moved the rest of H
(H.1–H.5) behind the domain where it already was. I did not build it.

Why: the mechanism is settled and the product question is not, and it is three
questions rather than one.

What I need from Ben:

**1 · Is the second device part of what the beta tests?** H.0's whole value is
that a tester can sign in somewhere else and find their diary. If what you
actually want is only *which tester said what*, the cheaper answer is to show
the anonymous uuid in the settings sheet and have each tester read it to you
once — no accounts, no copy change, no stranded diaries. H.0 is worth its cost
only if the second device is on the list.

**2 · Is "sign in before your first session" an acceptable instruction?** A
pre-created account cannot be converted into — `updateUser({ email, password })`
fails when the email already exists — so a tester who does three sessions first
and then signs in lands in an empty diary, with the old one on an anonymous id
nobody can reach. `auth.ts` makes the right order work with no change, because
`getSession()` runs before `signInAnonymously()`. But the wrong order is
silent, and it looks exactly like data loss. This is the one thing H.0 gives
up, and it is given up per tester rather than once.

**3 · Which lands first, H.0b or I.1?** They rewrite adjacent lines of the same
privacy block in both locales, and it is more than a merge: `privacy.
browserBound` goes half-false the moment a tester signs in on a second device,
and `docs/VOICE-MEMO.md` §289 argues I.3's scheduled backstop FROM that same
promise being true. Whichever lands second rewrites the other's reasoning, not
just its text. My lean is I.1 first, because it is inside a phase that is
already sequenced and H.0b is not.

## The three H.0 questions, answered — and the one new decision the answers forced

Where: `BUILD-PLAN.md` Phase H (H.0, H.0b), `src/AuthProvider.tsx`,
`apps/web/.env.example`

What I checked: appended rather than edited into the entry above, because this
file is append-only and that entry asked three questions Ben has now answered
(2026-09-22).

1. **Second device: yes, it is on the list.** So H.0 stands and the cheap
   alternative — showing each tester their anonymous uuid — is rejected. It
   bought the identity and not the device.
2. **"Sign in before your first session": yes, and preferred rather than
   tolerated.** Not as a workaround for the conversion H.0 gives up, but
   because it keeps the beta CLOSED, which is what keeps a
   subscription-licensed Epidemic Sound master and a `[DE] `-prefixed
   placeholder content set off the open internet while the app sits on a real
   domain.
3. **H before I.** The voice memo is an add-on; accounts are what the beta
   needs to run. This closes the plan's only open scope question and removes
   the H/I copy collision by ordering rather than by argument.

What I did: wrote all three into the plan, and took answer 2 one step further
than it was asked — **H.0b is now a gate rather than a screen.**

Why: if signing in first is preferred *because* it keeps the beta closed, then
anonymous sign-in cannot stay as the silent default beside it. One tester who
never finds the sign-in control is the entire licensing argument undone. So
`AuthProvider` renders the gate instead of falling through when there is no
session — and behind `VITE_REQUIRE_ACCOUNT`, because deleting
`signInAnonymously()` would delete the first-session-before-we-ask-anything
behaviour that H.2 proves and H.3 builds on, and going public again would be a
rewrite rather than a variable. It is one file: `ensureSession()` has exactly
one caller, `AuthProvider.tsx:20`.

What I need from Ben: **confirmation that "gated" is what you meant**, because
it is my inference from "preferred — it solves licensing issues before going
public" rather than something you said. The weaker reading is that testers are
merely *told* to sign in first and the anonymous path stays reachable. That
reading is cheaper to build and does not actually close the beta, so I took the
stronger one. If it is wrong, H.0b loses the flag and the `AuthProvider`
change and becomes a plain screen — nothing else in the phase moves.

## The host moved to Cloudflare, and A.6 Half 2 kept its criteria

Where: `wrangler.jsonc` (new), `BUILD-PLAN.md` A.6 Half 2, `netlify.toml`
(unchanged), root `package.json`

What I checked: A.6 Half 2 has said "Netlify and a domain" since Phase A, and
`netlify.toml` has been in the repo since the first commit. Ben asked for
Cloudflare on 2026-09-22 — the same week the Netlify build allowance returns,
which is the thing Half 2 was waiting on. So this is a reversal of a written
decision at the exact moment the original decision stopped being blocked, and
it is logged here rather than performed quietly.

What I did: added `wrangler.jsonc` as an assets-only Worker over
`apps/web/dist`, pinned `wrangler` in root `devDependencies`, and rewrote A.6
Half 2 to name Cloudflare as primary and Netlify as the spare. `netlify.toml`
is untouched, on Ben's instruction: **both hosts build `main`.**

Why the app needed no code change: musie is a client-rendered SPA and every
dynamic thing it does is a Supabase Edge Function called from the browser.
`reveal-track` and `realtime-token` stay on Supabase, are Deno rather than
Workers, and send `Access-Control-Allow-Origin: *`, so a new front-end origin
is not a CORS change either. The host serves files; nothing about the host is
in the bundle. That is also why Half 2's four criteria did not move.

The one real difference from Netlify, and it is the deep-link redirect.
Netlify infers nothing — `netlify.toml` states the `/*` → `/index.html` 200
rewrite outright — but Cloudflare Pages *did* infer SPA mode from the presence
of `index.html`, and Workers deliberately does not. `not_found_handling:
"single-page-application"` is that rewrite, written out. Omitting it fails in
exactly one way: `/` works, every in-app navigation works, and only a refresh
or a pasted deep link 404s from the CDN before React loads. A smoke test that
opens the home page and clicks around reports success.

**What is NOT resolved, and it is the older problem.** A.6 Half 2 says the
live app "signs a visitor in", and Divergence 1 in Half 1 is still open:
anonymous sign-ins are a *dashboard* setting on the hosted project, and
`config.toml`'s `enable_anonymous_sign_ins = true` governs only the local
stack. `POST /auth/v1/signup` returns `anonymous_provider_disabled`. Deploying
does not touch this. Whichever host serves the bundle, the first thing a
visitor does still fails until that toggle is flipped — and H.0b, proposed in
the entry above, may change what the right answer is, because a *gated* beta
may not want anonymous sign-in enabled at all.

What I need from Ben: **two questions, and they are separable.**

1. **Does the domain go to Cloudflare?** Two hosts building `main` is two
   build allowances and two candidate URLs, which is fine, but the domain
   resolves to one. The plan's own footer warns that a printed QR code locks
   the domain in permanently, so this stays open until print day is near.
2. **Anonymous sign-in on hosted: on, or does H.0b overtake it?** Enabling it
   satisfies A.6's third criterion today. If the beta is gated instead, the
   criterion should be rewritten rather than satisfied — and that is a plan
   change, not a dashboard toggle.

## Public on the open internet, for one day, on purpose

Where: `wrangler.jsonc` (`workers_dev`, `preview_urls`), and the entry above,
whose first question this answers

What I checked: the entry above left the domain open and said nothing about
`workers.dev`, because I had not yet read what the defaults do. They are both
`true`: the first green Workers Builds run puts musie at
`musie.<subdomain>.workers.dev`, publicly, and since Wrangler v4.44.0
`preview_urls` follows `workers_dev` — so every non-production branch build
gets its own public URL too. Netlify never forced this question, because Half 2
never ran.

This collides with the H.0 answer two entries up, which keeps the beta closed
*because* a subscription-licensed Epidemic Sound master and a `[DE] `-prefixed
placeholder content set should not sit on the open internet.

What Ben decided (2026-09-22): public is acceptable **for now**, because H.0b —
the account gate — lands "latest tomorrow". So the exposure is bounded by the
thing that closes it, and the two settings are written out explicitly rather
than inherited, so that closing it is an edit to one file rather than a
discovery.

Why it is written rather than left to default: a dashboard toggle does not
hold. The next `wrangler deploy` restores whatever `wrangler.jsonc` says, and
with Workers Builds that is every push to `main`. Turning this off in the
dashboard tomorrow would look done and revert on the next commit.

What I need from Ben: **when H.0b ships, close this.** Either `workers_dev:
false` and `preview_urls: false` behind a custom domain, or Cloudflare Access
in front of both production and preview URLs — Access is the better fit while
the domain is still parked until print day, because it does not need the
domain to exist. If H.0b slips, this entry is the record that the window was
meant to be one day and was not.

## "Gated" was the right reading — and the gate could not live where the plan put it

Where: `src/main.tsx` (`SessionGate`), `src/AuthProvider.tsx`,
`src/components/SignInGate.tsx`, `src/lib/requireAccount.ts`

What I checked: the entry above asked Ben to confirm that *gated* was what he
meant, since it was an inference from "preferred — it solves licensing issues
before going public". H.0b is built on the stronger reading: `VITE_REQUIRE_ACCOUNT`
on means no anonymous fall-through at all. **That question is still open in the
sense that nobody has answered it** — it is now open about shipped code rather
than about a plan, and unwinding it is deleting one component and one branch.

The part I could not follow was WHERE. BUILD-PLAN and the entry above both say
`AuthProvider` renders the gate, and `ensureSession()` has exactly one caller,
which is what made that sound like a one-file change. It is not:

- `AuthProvider` is mounted above `ProfileProvider`, `LocaleProvider` and
  `DesignSystemLocale` (`main.tsx`), deliberately, because signing in needs no
  routing and a route change must not remount it.
- `useT()` reads `LocaleContext`. A gate rendered from `AuthProvider` is outside
  it, so the app's own copy is unreachable from there.
- Every design-system default is read through `MusyLocaleProvider`, which is
  lower still, and `DEFAULT_MUSY_LOCALE` is **German**. So an English tester's
  sign-in form would have announced 'Fehler:' on its error message — rule 7's
  half-German UI, on the first screen anyone sees, reached by obeying the plan.

What I did: `AuthProvider` publishes the state and gained a `signedOut` status;
a `SessionGate` inside `DesignSystemLocale` decides what renders. Checked rather
than assumed, because it is the obvious objection: with no user,
`ProfileProvider`'s effect returns before fetching and stays `'pending'`, and
`LocaleProvider` still resolves a locale — it starts from the cached one or
`navigator.language` and only lets `profiles.language` override it once a profile
arrives. Confirmed on screen: the German run renders German including 'Fehler:',
the English run English including 'Error:'.

Why: the substance of the decision is unchanged — there is a gate and nothing
falls through behind it — and the location was load-bearing for copy in a way
the plan could not have known without reading three providers.

What I need from Ben: **nothing about the location.** Still the confirmation the
entry above asked for: that a closed gate is what you want, rather than testers
merely being *told* to sign in first while the anonymous path stays reachable.

## H.0b's done-when names a privacy page that does not exist

Where: `src/i18n/en.ts` and `de.ts` (`privacy.account`, `privacy.browserBound`),
`src/components/SessionReflect.tsx:119,153`

What I checked: H.0b is *done when* "a tester signs in on two devices and sees
one diary, **and the privacy page reads true for both kinds of user on the same
build**". There is no privacy page. Of the six `privacy.*` strings, exactly two
are rendered anywhere — `privacy.written` and `privacy.photo`, as `description`
props on two fields in the reflect step. `privacy.title`, `privacy.account`,
`privacy.voice` and `privacy.browserBound` are rendered by nothing.

So the copy debt H.0b was told it owed is real, and the check it was given to
prove the debt was paid cannot be run.

What I did: paid the debt anyway, in both locales. `privacy.account` no longer
promises Musie never asks for your email — for a tester it was handed over — and
`privacy.browserBound` no longer promises the diary dies with the browser, which
the second device disproves. Both now state which case applies, loss first and
exemption second, so a reader who skims one sentence leaves with the limitation
rather than the let-off. The comment block above them says the rewrite is new
text and is **not** covered by the sign-off the old text was awaiting.

Why: rule 6 — a false string is written, not reported — and a privacy promise
that is false for the people currently testing is what phase G's checkpoint
exists to catch. Waiting for the screen would have meant shipping the false
version to the testers the screen does not exist for yet.

What I need from Ben: **a read of the two rewritten strings**, since they are a
promise to users and the previous sign-off does not carry to new text. And a
note for whoever builds the privacy screen: the strings are already there and
already cover both kinds of account.

## A db test that uses the app's own Supabase client tests whichever project `.env.local` names

Where: `src/lib/signIn.db.test.ts`, `src/lib/signIn.ts` (the `client` parameter),
`src/lib/db.support.ts`

What I checked: `db.support.ts` goes to real trouble to make the db suite's
target explicit — `supabase status` by default, three environment variables to
override, all three or none, and the target printed on first use, all because
"a security net that can only be run against the permissive environment is the
wrong way round". None of that reaches a test that calls `getSupabase()`. That
client is built from `VITE_SUPABASE_URL` in `.env.local`, which at this checkout
was pointed at the **hosted** project while `pnpm test:db` was aimed at the local
stack.

The first version of my test did exactly that, and how it failed is the part
worth recording: it created fixtures locally and signed in on hosted, so **both
wrong-password assertions passed** — an absent account and a wrong password are
the same refusal, by design, so that the form cannot be used to enumerate
addresses. Only the right-password test went red. A file shaped slightly
differently would have been green and testing nothing.

What I did: `signIn()` and `signOut()` take an optional client, and the test
passes `anonClient()` — the suite's own, aimed wherever the suite is aimed. Not
a mock: this repo mocks the Supabase client nowhere (`vi.mock` appears in no
test) and should not start.

Why: the false green `db.support.ts` was written to prevent, arriving through a
door it does not watch.

What I need from Ben: nothing, just flagging — but it is a trap for the next db
test somebody writes against app code rather than against the schema. The rule
is: a db test never calls `getSupabase()`.

## The sign-in gate has no automated test that renders it

Where: `src/components/SignInGate.tsx`, `apps/web/vitest.config.ts`,
`apps/web/e2e/`

What I checked: both Vitest projects are `environment: 'node'` — "nothing under
test touches the DOM, and a jsdom dependency bought for nothing is a dependency
to keep updated". That is still true of everything else, and it means the gate's
rendering cannot be unit-tested as the config stands. What IS tested is the logic
under it: the flag's parse (`requireAccount.test.ts`, including `'false'`, which
`Boolean()` gets backwards), the GoTrue-code→copy table (`signIn.test.ts`), the
empty-string address (`auth.test.ts`), and the real round trip against the stack
(`signIn.db.test.ts`).

The form itself I verified by hand, with a throwaway Playwright script, in both
locales and both flag states — and that walk is what found the empty-string bug
(`d660fc6`), which nothing else could see. The script was not committed.

What I did: left it uncommitted, and am saying so rather than implying the gate
is covered. There is an existing Playwright suite with two locale projects and a
`withLocale` helper, so a permanent walk is a small spec rather than new
infrastructure — but it needs `VITE_REQUIRE_ACCOUNT` wired into the config for
one project only, and that is a change to a shared config in service of one
screen, which I was not asked to make.

Why: a suite that silently does not run is worse than no suite, and so is a
report that implies coverage it does not have.

What I need from Ben: **a call on one e2e spec for the gate.** My lean is yes —
it is the only screen in the app whose failure mode is "nobody can get in", and
it is currently the only screen verified solely by me having looked at it.

## The public window is closed, and closing it left the Worker with no hostname

Where: `wrangler.jsonc` (`workers_dev`, `preview_urls`), answering
`Public on the open internet, for one day, on purpose` two entries up

What I checked: that entry set one condition — "when H.0b ships, close this" —
and H.0b has shipped. Ben confirmed on 2026-09-22. So both flags are now false
in the file rather than in the dashboard, because that entry is right that a
dashboard toggle does not hold: the next `wrangler deploy` restores whatever
this file says.

**What the earlier entry got right and I nearly missed.** It offered two ways to
close the window — `false` *behind a custom domain*, or Cloudflare Access in
front — and the qualifier is load-bearing. There is no `routes` block in
`wrangler.jsonc` and no custom domain attached, so with both flags false the
Worker has **no hostname at all**. `wrangler deploy` succeeds and nothing is
reachable. Ben asked to deploy in the same breath as closing this, and those two
cannot both be true yet.

What I did: closed it as asked, and wrote the consequence into `wrangler.jsonc`
beside the two lines, so that the next person to deploy meets it before the
silence rather than after it.

Why: of the two failure modes, a deploy nobody can reach is recoverable in one
line, and a licensed master left open on `workers.dev` is not.

What I need from Ben: **a hostname, and it blocks the deploy rather than the
merge.** Either attach the domain — which the plan's footer warns is
effectively permanent once a QR code is printed, so this may not be the moment —
or flip both flags back to true and put Cloudflare Access in front, which needs
no domain and is what the earlier entry recommends for exactly this gap.

**A third reading, now that the gate exists.** The exposure was accepted
*because* there was no gate; there is one now, and with
`VITE_REQUIRE_ACCOUNT=true` a visitor to a public `workers.dev` URL gets a
sign-in form and no further. That is a materially weaker exposure than the one
the earlier entry was written against, and it would leave a URL the
second-device test can actually use. It is not what was asked for, so it is
logged rather than done.

## Access is on previews only, and production is closed by the app instead

Where: Cloudflare Access app `6993b74e-c4a1-4554-8345-bff40d825d4a`, the build
variables on both Workers Builds triggers, `docs/MUSIE-SETUP.md`

What I checked: the earlier entry recommended Cloudflare Access "in front of both
production and preview URLs" while the domain was parked. That was written when
there was no account gate, so an open URL meant an open app. There is one now,
and the two are not the same instrument:

- **Access controls who can REACH the app.** It authenticates against Cloudflare,
  with an allowlist kept in Cloudflare.
- **The gate controls who has an ACCOUNT.** It authenticates against
  `auth.users`, with credentials handed out by `create-tester.mjs`.

Access over production would make every tester do both — a Cloudflare one-time
PIN and then the app's own sign-in — and their addresses would have to be kept
in two places that can drift. For twenty external testers that is friction with
no security the gate does not already provide, since the thing being protected
is a licensed master and placeholder content, not the perimeter.

What I did (Ben's call, 2026-09-23): Access on **previews only**, via a
`preview_worker` destination on the Worker itself rather than a hostname list —
so it keeps covering every preview URL as branches come and go. The policy
includes *login method = Cloudflare*, whose IdP carries
`restrict_to_account_members: true`, so it means "whoever can sign in to this
Cloudflare account" and there is no email list to maintain at all.

`VITE_REQUIRE_ACCOUNT=true` is set on BOTH build triggers, so a branch build is
gated exactly like production rather than being the soft way in.

Why previews are the half worth protecting: production is one URL that somebody
chose to publish and that the gate closes. Previews are a URL per branch,
appearing automatically, which nobody is watching — the exposure that happens by
default rather than by decision.

What I need from Ben: nothing now. **Revisit when the domain lands**: a custom
domain is the moment to ask again whether production also wants Access, because
by then the audience may not be twenty people whose accounts you made by hand.

## The listen step's three views snap now, and this repo argued they should not

Where: `apps/web/src/components/SessionListen.tsx` (the three-viewports note
and the `useScrollSnap` call), `apps/web/src/shell.css` (the listen block's
header, and `html[data-musy-scroll-snap]`), and the new
`packages/design-system/src/useScrollSnap.ts` with its CSS in the SCROLL SNAP
section of `musy-components.css`

What I checked: two places said in as many words that this should not be done.
`shell.css` carried "NO SCROLL-SNAP. Snap takes the scroll away from the
person — a thumb that wanted the middle of the details view gets thrown to its
edge", and `SessionListen.tsx` said the same under "THE THREE VIEWPORTS, AND
WHY SCROLLING IS DONE BY BUTTON", tying it to the step's posture: the gate is
soft, nothing is enforced, the person stays in charge.

That argument was half right, and the half it missed is the one a phone shows.
Free scrolling did not leave anyone in charge either: a flick sailed straight
through the Störer — the one view whose entire job is to interrupt something
you have left behind — and landed in the details. Being carried past a decision
is not being in charge of it.

What Ben decided (2026-09-22): both this and the About Musie carousel get
scroll stops. One swipe moves exactly one state, and going on takes another
deliberate gesture.

What I did: `scroll-snap-stop: always`, in two places. On
`.musy-carousel__slide` it is one line — the carousel already had
`scroll-snap-type: x mandatory`, which promises only that a scroll LANDS on a
snap point and never which one, so a flick ran through three or four slides.
That also repairs a quieter defect: About Musie unlocks its CTA on the furthest
slide *seen*, and a five-step explainer that can be flung past made "seen" a
lie.

For the listen step the mechanism went into the **design system** rather than
staying an L14 pattern here, which is the part worth recording. `useScrollSnap`
owns the mode on `<html>` for as long as the step is mounted, reference-counted
so two overlapping screens cannot switch it off under each other, and
`.musy-snap-view` carries the alignment and the stop. `apps/web` keeps its own
geometry and one variable — `--musy-snap-inset: var(--sticky-block)` — because
how much fixed chrome sits over the viewport is the host's fact, not the
system's.

Why it went there rather than here: `scroll-snap-type` belongs to the SCROLL
CONTAINER, and for sections in normal document flow that container is the
document. No screen should be reaching for `<html>` on its own, and L14.2's
whole point is that a `musie-` class is a screen's own business — a mode on the
root element is not. It also completes `useViewportFill`, which was promoted out
of this same step for the same reason: that hook answers how tall a view is,
this one what stops a thumb running past it, and one declaration joins them
(`.musy-snap-view { scroll-margin-block-start: var(--musy-fill-offset, 0px) }`).
The first view in a run therefore snaps to the top of what is *above* it, which
is what keeps the wizard's header on screen — the same defect `scrollToTop` was
written to avoid.

**This is L14.3 applied before a second copy existed rather than after**, on
Ben's call when the plan was signed off. Worth naming, because the other live
example — `.musie-sheet` — recurred first and is still not a component.

What I need from Ben: **nothing blocking, one thing to watch.** `mandatory`
rather than `proximity` is what makes the stop hold, and a snap area taller than
the window relaxes its own snapping under the spec — so the details view stays
readable as it grows. That relaxation is the safety valve for the original
argument, and it is worth re-checking in German at 393px whenever that view
gains anything.

## The lightbox scrolled its own close button off the screen, and the fix is in the package

Where: `packages/design-system/src/Lightbox.tsx` (the new
`.musy-lightbox__body` wrapper) and the LIGHTBOX section of
`musy-components.css`

What I checked: the brief said "on the diary entry, always display the close X
top right", which reads as a request for a control that is not drawn. It is
drawn. It scrolls away.

`.musy-lightbox__popup` was the scroll container **and** the positioning
context for `.musy-lightbox__close`, which is `position: absolute`. An
absolutely positioned child is placed against its container's PADDING BOX, not
against the part of that box you can see — so the X sits at the top of the
scrollable content rather than at the top of the window onto it, and a diary
entry long enough to scroll takes its own close button up and out of view.
Escape and the scrim still worked, which is why this reads as cosmetic and is
not: on a touch device with no Escape key, the scrim is the only way out left,
and the popup fills most of the screen.

The stylesheet said the opposite in a comment — "the popup scrolls internally
rather than pushing its close button off-screen" — and that sentence was true
of the popup's HEIGHT, which is capped at the viewport, and false of the
control. A correct claim about the wrong noun.

What I did: the popup is a flex column that does not scroll, the children go in
a `.musy-lightbox__body` that does, and the title and the close control both
sit outside it. `min-block-size: 0` on the body is load-bearing — a flex item
will not shrink below its content without it, and the overflow never engages.

Why it is not in `apps/web`: rule 1 and L7. A screen cannot reposition another
component's close button, and `DiaryEntry` does not render one — `Lightbox`
does. `CtaButton`'s `align` prop and F.5's `DraggableList` focus fix are the
two precedents the guardrails already cite for this shape of change.

What I need from Ben: **the same acknowledgement F.5 asked for, for the same
reason.** This changes a released component's DOM by one wrapper element, and
every other consumer — `SettingsSheet`, `NotImplementedLightbox`,
`Session.tsx`'s close confirmation, `AboutYou`, `Exercises` — inherits it. It
is additive and no prop changed, but the reference tree under
`reference/design_system/` does not have it, and a re-sync would drop it.

## The brief said "switch" for the card code, and what is built is a disclosure

Where: `apps/web/src/components/SessionScan.tsx`

What I checked: "put the Kartencode input field, and the respective button
behind an 'enter code manually' switch". The package HAS a `Switch`, used for
dark mode in settings, so the literal reading was available.

It is the wrong control, and the difference is not stylistic. `role="switch"`
says *this setting is now on* and carries `aria-checked`; a button with
`aria-expanded` says *this reveals something below*. Typing a code turns
nothing on — the field works whether or not it is on screen — so a switch
would announce a state the app does not have. The two look near enough
identical that nothing about the screen argues for one over the other, which
is exactly when the semantics should decide.

What I did: a ghost `CtaButton` with `aria-expanded` and `aria-controls`. The
form is conditionally rendered rather than hidden with the `hidden` attribute,
because `.musie-code` sets `display: flex` and would have overridden it — a
"closed" form sitting in full view. It opens itself when a code arrived from a
deep link, and an effect opens it when `codeError` lands, so an answer about a
code is never reported into a shut box.

What I need from Ben: **nothing, unless you meant the noun literally.** Say so
and it becomes a `Switch`; the markup is four lines either way.

## The listen step is a dead end for an exercise with no recording, and that is older than this change

Where: `apps/web/src/components/SessionListen.tsx` (`gate`, `met`)

What I checked: found while moving the action row, not looked for. `gate` falls
back to `exercises.listen_gate_seconds` when there is no track, and `met`
latches on `position` — which nothing advances when there is no `<audio>` and
no simulated clock to start. So `met` is never true, *Start reflection* never
enables, and the step cannot be left forwards. `session.listen.noTrack` — "this
exercise has no recording yet" — is the screen that says so, and it is a
sentence in a cul-de-sac.

It is not new. What WAS new for about an hour is that it also had no way
BACKWARDS: the action row was rendered inside `track !== null`, and `back` is
rendered in that row, so the no-track screen drew no controls at all. That half
is fixed — the row renders whether or not there is a track.

What I did NOT do: open the gate for a trackless exercise. The honest
candidates are "no recording ⇒ the gate is already met" and "no recording ⇒ the
step is skipped when the session is built", and the second is a question about
`sessionMachine`, not about this component. Either is a product decision.

What I need from Ben: **which of the two**, or a third. Today's three seeded
exercises all have recordings on at least some cards, so nothing on screen is
broken right now — this is reachable only by a card whose `tracks.src` and
`duration_seconds` are both absent.

## The reveal stopped waiting for the gate, and E.5's done-when still holds

Where: `apps/web/src/components/SessionListen.tsx` (the `IntersectionObserver`
that calls `revealTrack`)

What I checked: the brief asks that scrolling to the player view shows the
track's name and details "directly". It did not: the request was locked behind
BOTH the scroll and `met`, so somebody who scrolled past the Störer eleven
seconds short of the gate reached a player still captioned *Your track* and a
facts list with no artist row — and nothing on the screen explained why.

What I did: dropped `met` from the observer's guard. The scroll is the only
lock now.

Why this does not weaken E.5: its done-when is a claim about BYTES — the title
must not be in the Network tab while the stage is still playing — and the
observer is what delivers that. A fetch still cannot happen until the details
view is in the viewport, which is two deliberate scrolls past a full-viewport
interstitial whose entire text is *it is better not to be influenced by the
track's name*. The boundary moved from a clock to a question, which is the
same direction the scrubber decision (2026-09-22) already went.

What I need from Ben: **nothing, unless the gate was ever meant to protect the
name rather than the listening.** Nothing in the repo says it was.

## `Badge` cannot take a status fill without a status word, except by passing an empty string

Where: `apps/web/src/components/DiaryCard.tsx` (the footer badge),
`packages/design-system/src/Badge.tsx`

What I checked: the brief asks for *Abgeschlossen* in the success tokens. The
card carried `primary-subtle` precisely to avoid `success`, and the old comment
gave the reason: a status variant injects a screen-reader word from the locale
catalogue before the label, so the badge would announce "Erfolg: Abgeschlossen"
— a severity word in front of a label that is already the status.

That comment claimed the screen "has no key to override it with", and that is
no longer true: `statusWord` is a prop. So the fill is `success` now and
`statusWord=""` drops the word. 1.4.1 holds three times over — the variant
draws a check glyph, the label is text, and finished and unfinished differ in
their words rather than in their fill.

What is unresolved: **an empty string is a sentinel, not an API.** "Give me the
status treatment and no status word" is a real thing to want — a badge whose
label IS the status is not an unusual case — and saying it with `""` reads as a
mistake to the next person and would be silently undone by anyone tidying
props. `statusWord?: string | false` would say it, or `hideStatusWord`, beside
the `hideIcon` that already exists for the glyph.

What I need from Ben: **whether that prop is worth a design-system change.**
The empty string works and is documented at the call site; this is about
whether the next caller finds it.

## The diary entry's card is unframed inside the lightbox now, and the hairline is not missed

Where: `apps/web/src/components/DiaryCard.tsx`

What I checked: `ContentBox` renders framed — header, hairline, body — only
when `header` is passed, and the only thing the card put in that header was the
status badge plus, inline, the collapse X. The badge has moved to the foot of
the card, beside the delete control, which leaves the lightbox with an empty
header.

An empty `header` still frames the box, so the choice was a hairline under
nothing or no hairline. I took the second: `header` is passed only when the
card draws its own collapse control, which is the inline case on /diary.

The hairline "divided what this entry IS from what is known about it", and that
division no longer matches the content — the metadata is at the BOTTOM of the
card now, under the answer and the track, so a rule under the headline would be
dividing the entry from the person's own words.

What I need from Ben: **a look at it.** This is the one item in this batch that
is purely a matter of taste, and it is a consequence of moving the badge rather
than something asked for.

And one more consequence, on the OTHER card — the inline latest entry on
/diary, which still passes a `header` because it draws its own collapse X.
That header used to be a row with a badge at one end and the X at the other;
it is now a row with the X alone, so there is a `--target-primary`-tall band
under the exercise's name with a single control at its trailing edge and
nothing beside it. It reads as a gap.

The fix that would close it is putting the control on the HEADLINE's row, and
a screen cannot: `ContentBox` renders the headline itself, before whatever the
caller passes as `header`, and `.musy-box__header` is a flex column. Reaching
in to change that is L7 and rule 1. A `ContentBox` prop for "a control that
sits on the headline's line" is the shape of the answer, and it is the third
thing in this batch that wants a design-system change, so I am not making it
on my own initiative — this entry is the record that it was seen.

---

# Phase · a headline and a description per step (2026-09-23)

## Markdown is parsed in this repo rather than by a dependency — and the subset is the deliverable

Where: `apps/web/src/lib/markdown.ts`, `apps/web/src/components/Markdown.tsx`

What I checked: the brief is "allow markdown per exercise and render it
according to the typography tokens from story". Two ways to do that. The
obvious one is `react-markdown` + `remark-gfm`; the other is to parse the
subset here.

What I did: parsed it here. About a hundred lines, no new dependency, in an app
that pins ten.

Why: the deciding reason is not the dependency count, it is that **the output
has to be typeset, not just rendered**. Every element on a Musie screen
resolves to a Layer 1 token (L14.1), and a step's headline is a specific
pairing — the body-xl in muted ink that `.musie-question` carried. Producing a
block list rather than HTML is what lets the component choose the element AND
the class, and what lets the heading level be clamped so a content string can
never emit a second `<h1>` under the one `ContentBox` already renders. A
general renderer also accepts raw HTML, images and links, which turns "what can
a content string do to this screen" into a question about a dependency's
configuration rather than about a file in this repo.

The cost, stated: this is **not CommonMark**. Nested lists, block quotes, code
fences, tables and links are not implemented. They do not fail — the line
renders as its own literal text, which is the right failure for content we
author in a migration, and there is a test that holds it to exactly that.

What I need from Ben: **nothing, unless the content is going to need links or
images.** Say so and this becomes a dependency rather than a parser — the
`Block` type is the seam, and nothing above it would change.

## `exercise_i18n.question` is gone, and the rule it carried with it

Where: `supabase/migrations/20260923120000_exercise_step_markdown.sql`,
`apps/web/src/routes/Session.tsx`

What I checked: `question` was ONE column rendered as the `<h2>` on both the
listen and the reflect step, and the schema comment gives the reason — *"the
question you hold while the track plays and the question you answer afterwards
must not be able to drift apart"*. That is a real rule, and the new copy breaks
it on purpose: listen asks *what picture forms when the music and the card come
together*, reflect asks *what name would you give the scene* and *what happened
in it*.

What I did: dropped the column, and `reflect.questionFallback` with it. Each
step's headline is now its own, inside its own `_md`.

Why: a brief that gives four steps four headlines has already decided that the
steps ask different things. Keeping the column would have meant a step with two
headings — the exercise's and the shared question's — on two of the four steps.

What I need from Ben: **nothing, just flagging that the invariant is gone.** It
was never exercised: `question` was null in all six rows and the app rendered
the chrome fallback every time.

## Three edits to the brief's German, and one placeholder shipped verbatim

Where: `supabase/migrations/20260923120000_exercise_step_markdown.sql`

What I checked: `docs/GERMAN-UI-WRITING.md`, which binds content copy as well
as chrome — held to the standard, though the seed's German stays provisional
until the spreadsheet lands.

What I did:

1. *"Wähle eine Kart aus"* → *"Karte"*. A typo.
2. The listen headline lost its full stop — §7: *"A heading does not end in a
   full stop. A sentence does."*
3. *"die durch die Verbindung von der Musik mit dem Bild … entstanden ist"* →
   *"die aus der Verbindung von Musik und Bild … entstanden ist"*. Two
   prepositions on a relative clause that already runs 25 words.

What I did **not** do: `[X]` in *"Leg die vier Karten mit dem Symbol [X] vor
dich"* is on screen exactly as written, in both locales. It reads as a
placeholder for a symbol printed on the deck, and inventing one would be
authoring content about a physical product I cannot see.

What I need from Ben: **what the symbol is** — a character, a word, or a
picture the step should show. (3) is the only one of the edits that is a
judgement rather than a rule; revert it if the phrasing was deliberate.

## The e2e walk had been failing since the morning's switch commit, on two stale assertions

Where: `apps/web/e2e/support.ts`, `apps/web/e2e/session.spec.ts`

What I checked: `session.spec.ts` failed on this branch, so I checked whether I
had broken it. `git show --stat 87e9c21` — *Typing the code by hand is a switch,
not a button* — touched neither file. Two things in the walk still described
the old screen:

- `enterCode` asked for `getByRole('button', …)`; the control announces as
  `role="switch"` now, so every walk that types a code timed out looking for a
  role the page no longer has.
- After *Scan a different card*, the spec asserted the code FIELD was visible,
  on the premise that it is the reader's resting state. It is folded away
  behind the switch now, so the reset leaves the switch, not a textbox.

What I did: fixed both, in the walk rather than in the app — the app is right
and the test was describing a screen that had moved. Both locales pass.

Why it is in this file: it is a fix outside the brief, made because it was
blocking verification of work inside it.

What I need from Ben: **nothing.** Worth knowing that `pnpm test:e2e` is not in
`pnpm check` (deliberately — CI has no browser and no Supabase), which is why
this sat unnoticed between the morning's commit and this afternoon's.

## `supabase db reset` empties the local `tracks` bucket, and the repo cannot refill it — RESOLVED

Where: `apps/web/src/lib/db.content.db.test.ts` (the signed-URL test),
`apps/web/e2e/reveal.spec.ts`

What I checked: after `supabase db reset` — which this change needed, to apply
the migration — `storage.objects` is empty, so nothing can sign `trk-NN.mp3`.
Three tests failed for that one cause, and BUILD-PLAN.md E.4 is explicit that
uploading the files *"is an operator act with files that deliberately never
entered this repository"*, so for a while this read as something only Ben could
undo.

What I did: **copied them back from the hosted bucket, which still had all
four.** `supabase storage cp ss:///tracks/trk-01.mp3 <tmp> --linked
--experimental` to download, the same command with `--local` and the arguments
reversed to upload. `pnpm test:db` is 85/85 and `pnpm test:e2e` is 16/16 again.

Why it is worth writing down: the files never entered the repository, and the
conclusion everyone reaches from that is that a reset costs an upload from
somebody's laptop. It does not, as long as the hosted bucket is ahead — which
it is, and which makes `--linked` the backup nobody declared. The four keys are
`trk-01`, `trk-02`, `trk-04`, `trk-05`; the other five tracks are silent by
design and have `src is null`.

What I need from Ben: **nothing.** Worth knowing that this only works while the
hosted bucket holds them. If a recording ever exists locally and nowhere else,
a reset really does lose it.

# Phase H.x — the library in Ben's own words, and Freie Bahn

## The brief names five exercises and the database had three — RESOLVED

Where: `supabase/migrations/20260923150000_exercise_library_freie_bahn.sql`

What I checked: the brief's five headings against `public.exercises`. Achtsame
Pause and Achtsam Atmen are plainly `mindfulness-cards` and `breathing-score`.
The brief lists both **Klangreise** and **Bodyscan** where the database has one
row, `body-scan-soundwalk` — "Body Scan als Soundwalk" — and the covering note
in the brief calls the existing placeholders "Achtsam Atmen, Soundwalk and
Bodyscan", which is three names for two rows.

What I did: **asked, and Ben chose.** `body-scan-soundwalk` becomes **Bodyscan**
— its seeded description already read "a guided walk through the body, one
sound at a time", which is the exercise Ben's new copy describes — and
**Klangreise** is a new row, `sound-journey`.

Why the ids did not move with the names: `sessions.exercise_id` and every diary
entry point at `body-scan-soundwalk`, so renaming the key would orphan them.
An id here is a stable handle; the name is `exercise_i18n`'s.

What I need from Ben: **nothing.** Worth knowing that `body-scan-soundwalk` now
reads "Bodyscan" everywhere on screen and only in the database does it still
say soundwalk.

## Four cards or five, and what the `[X]` symbol was — RESOLVED

Where: the same migration; supersedes *"Three edits to the brief's German, and
one placeholder shipped verbatim"* above.

What I checked: the replacement line Ben sent — *"Ziehe vier zufällige Karten
aus dem Deck"* — says four, and the library copy for the same exercise in the
same brief says *"Wähle 5 zufällige Karten"*. Both would have shipped, one
screen apart.

What I did: asked. **Five everywhere.** The step now reads *"Ziehe fünf
zufällige Karten aus dem Deck."* The digit on the library card and the word in
the step are both Ben's own forms, kept as written — `docs/GERMAN-UI-WRITING.md`
has no rule on numerals, so there is nothing to make them agree with.

This also closes the `[X]` question logged on 2026-09-23: there is no symbol
printed on the deck to name. The cards are drawn at random, which is what the
placeholder was standing in for.

What I need from Ben: **nothing.**

## Freie Bahn's card says "clock only", but `needs_cards` is not a display flag

Where: `apps/web/src/routes/Session.tsx:212`,
`apps/web/src/routes/ScanLink.tsx:95`

What I checked: the brief lists only the clock beside Freie Bahn — no card-deck
icon and no "Du brauchst" line — where Achtsame Pause lists both. Taken
literally that is `needs_cards = false`, and that column is **not** cosmetic:
`Session.tsx` derives *this run skips the scan step* from it, and `ScanLink.tsx`
decides with it what a QR deep link does. False would have deleted the scan
step from an exercise whose whole instruction is "scan a random card".

What I did: asked. Ben's answer: **clock + deck + sound, everywhere as today** —
the chip logic is untouched for all five, and Freie Bahn carries the same
`needs` string as Achtsame Pause. The brief's icon lists were shorthand for the
copy, not a specification for the chips.

What I need from Ben: **nothing**, but it is worth writing down that the fact
chips and `needs_cards` are the same column. If the deck chip should ever come
off one card without the scan step going with it, that is a schema change —
a `shows_deck_chip` beside it, or the chips driven by `needs` being non-null.

## Four mechanical corrections to the German, and one pronoun left alone

Where: the same migration, `free-rein` and the library copy

What I checked: `docs/GERMAN-UI-WRITING.md`, which binds content copy as well
as chrome.

What I did, and nothing else:

1. *"Wähle eine Kart aus"* → *"Karte"*. A typo, and the same one corrected in
   this exercise's model on 2026-09-23.
2. *"deine Stimmung in ihr wiederfinde"* → *"wiederfinden"*. A dropped n.
3. *"Wie fühlt sich der Moment an"* → *"…an?"*. §7: a sentence that asks gets
   the mark.
4. *"schweifen ohne ihnen zu folgen"* → *"schweifen, ohne ihnen zu folgen"*.
   An `ohne … zu` clause takes the comma.

What I did **not** do: *"deine Stimmung in **ihr** wiederfinden"* refers back to
*die Karte* across a sentence whose nearest noun is *das Bild* (neuter). It
reads, and changing a pronoun is a judgement about what Ben meant rather than a
rule. Left as written.

What I need from Ben: **nothing**, unless *ihr* should be *ihm* — the image
rather than the card.

## Freie Bahn is one draw, and five of the nine cards are silent

Where: `supabase/migrations/20260918150600_content_seed.sql` (the tracks),
`apps/web/src/components/SessionListen.tsx`

What I checked: `tracks.src` is null for `trk-03`, `trk-06`, `trk-07`, `trk-08`
and `trk-09` — silent by design, the four recordings that exist are 01, 02, 04
and 05, and the listen step renders its no-recording line rather than an error.

What I did: seeded all nine pairings for `free-rein` anyway, because the
alternative — pairing only the four that play — would encode "which recordings
exist today" in the content model and quietly break the day a fifth arrives.

Why it is flagged: Achtsame Pause draws five cards and lets the person pick one
of them, so a silent card is one of five and they can choose another. Freie
Bahn is a single random draw and promises *"springe direkt in die Übung"* — so
better than half the time, today, it jumps straight into silence.

What I need from Ben: **a decision, eventually** — either the remaining five
recordings (already tracked in BUILD-PLAN.md as one of the two things only Ben
can do), or Freie Bahn stays behind them. It is live either way; this is about
what it feels like until the files land.

## `listen_gate_seconds` for the two exercises whose timing moved

Where: the same migration

What I checked: `db.content.db.test.ts` holds the column to two invariants —
shorter than `timeframe_min × 60`, and shorter than every track it gates.

What I did: `free-rein` takes **90**, copied rather than estimated — it plays
the same nine recordings the 90 was measured against, and 90 < 2 × 60 still
holds at the new exercise's shorter timeframe. `sound-journey` takes **180**, an
estimate in the same proportion the seed used for the placeholder it sits
beside. Bodyscan keeps its 180 under the shorter 10–12 timeframe.

What I need from Ben: **nothing until a recording exists** for Achtsam Atmen,
Klangreise or Bodyscan. The moment one does, listen to it and set the number.

## Nothing tests Freie Bahn, and I did not add a walk

Where: `apps/web/e2e/session.spec.ts`

What I checked: the walk clicks `getByRole('radio').first()`, which is
`exercises.sort = 1` — still Achtsame Pause, so the suite is unaffected by a
second implemented exercise. Nothing exercises the second one.

What I did: drove Freie Bahn through intro → scan → listen by hand in both
locales, in a throwaway spec, and deleted it. It resolves MC-01's recording
through its own pairing row, gates at 01:30, and both bulleted lines render as
paragraphs.

Why I did not keep it: it would be `session.spec.ts` again with `.nth(1)`, and
the two exercises are the same four steps over the same tables — the walk that
exists already covers the spine. It is worth adding the day Freie Bahn stops
being a copy.

What I need from Ben: **nothing, just flagging** that the second implemented
exercise has no automated walk.

---

# Usertesting 260925 · UX improvements

## The step's headline goes to full contrast, which reverses a decision this file records

Where: `apps/web/src/shell.css`, the `.musie-md` block

What I checked: the pairing shipped on 2026-09-23 as body-xl in **muted** ink
over body-lg in muted ink, and the muted half was not an accident — the comment
in that block records that the full-contrast version shipped once and "read as a
different kind of thing", caught by eye on the hosted walk-through of
2026-09-21. So this change undoes something that was tried, seen and rejected.

What I did: what Ben asked for. Headline `--type-heading-md` + `--on-surface`,
description `--type-body-md` + `--on-surface-muted`. Two things came with it
that he did not name, and I am flagging both rather than burying them:

1. **h3–h6 took `--on-surface` too.** They are the fallback for a heading
   deeper than the parser's clamp, and leaving them muted would have made a
   deeper heading the only heading in the block that reads as prose.
2. **The `<strong>` comment's claim is no longer true.** It said full contrast
   was "the one place a step's copy leaves the muted ink". The headline is now
   the other place, and the comment says so instead.

Why it is defensible on its own terms and not only as an instruction: the
earlier argument was that the headline should stay the same VOICE as the prose,
because inside a wizard panel the step's question IS the heading. In front of
actual people the consequence was that headline and description read as one
undifferentiated block. The new pairing also uses the **more honest token** —
Layer 1 states in as many words that body-xl "is not a heading", and this
element is an `<h2>` — and it does the separating with contrast while the size
comes DOWN a step (26–34px → 22–26px) rather than up.

What I need from Ben: **nothing, unless the 2026-09-21 observation recurs.** It
was a real observation about a real screen; what changed is the rest of the
block around it, not the eye that made it. If the headline now reads as a
different kind of thing again, the lever is the ink, not the size.

## `.musie-md` and `.musie-prose` now differ only in ink, and that makes the component request overdue

Where: `apps/web/src/shell.css`, both blocks

What I checked: `.musie-prose` declares no type of its own — body-md reaches it
from `body` in `styles.css` — so it did not move when `.musie-md` came down to
meet it. Its own comment already invoked L14.3 ("two patterns that differ only
by type step are a component request") as a thing that would apply at a third
caller.

What I did: nothing to either pattern's structure, and I updated the comment to
state the new relationship rather than the old one. The two callers are
`components/Markdown.tsx` (four session steps) and `DataLightbox.tsx`.

Why I did not merge them: they still differ in ink and in whether they parse
their input, and merging them is a design-system change — the prose component
L14 says the system does not have. That is rule 1's "a fix belonging in the
design system rather than the app", and I am not making it on my own
initiative.

What I need from Ben: **a decision the next time either one is touched.** The
shape of the answer is one Layer 2 prose component taking the document and a
tone, which would delete both custom patterns. Until then this entry is the
record that they converged.

## The step headline's gap now equals the block's own bottom margin

Where: `apps/web/src/shell.css`, the `.musie-md` block

What I checked: Ben, on the 260925 round — in a text list the items must sit
closer together than the headline sits to them. They did not, and the reason
was not the declared gap. Both were `--space-gap-related`; what differs is
LEADING. heading-md is line-height 1.25, body-md is 1.6, so the same 12px buys
20.3px of white under the headline and 22.6px between two items. The headline
was measurably the tighter join — ratio 0.90.

What I did: the headline's gap goes to `--space-gap-group`, as the difference
added on top of the container's gap, since a flex `gap` is one value for the
whole column. Items and sibling blocks stay at `--space-gap-related`, one rung
in both places so a bulleted run (paragraphs) and a numbered run (`<li>`s)
still read identically. Ratio 0.90 → 1.78, measured in both locales.

`--space-gap-stack` is the semantically neater fit — a headline and its body
are one molecule — and I tried it first. It is **invisible**: it moves the
headline 4px, and on a step whose first item wraps, the 4px the headline gains
is given straight back by the tighter items below, so the two renderings are
the same picture. Ratio 1.08. The semantic ladder has no gap alias between 16
and 32, so the choice was a rung that does not read or one that does.

The cost, stated: **the headline's gap now equals the block's own bottom
margin** (32 = 32). L2's doubling check still holds where it is about atoms in
a group — 32 ≥ 2 × 12 for the items — but the split inside the block is no
longer smaller than the split that ends it. What keeps the block reading as one
thing is the TYPE, heading-md at full contrast over body-md muted, rather than
the space. It reads correctly on all four steps at 393px and 1024px, in both
locales; I looked before believing the numbers.

What I need from Ben: **nothing unless the block stops cohering.** If it does,
the lever is the bottom margin — `--space-section` below the block would
restore the ordering — not this gap, because shrinking this gap is what the
round asked to undo. The other way out is a `--space-gap-prose` rung at 24px in
Layer 1, which is a design-system change and so not mine to make.

## Where Ben's "P.S." goes, since the brief did not say

Where: `apps/web/src/routes/AboutMusie.tsx`, `apps/web/src/i18n/{en,de}.ts`,
`apps/web/src/shell.css`

What I checked: the 260925 brief cut the explainer carousel from five slides to
three, gave the three lines and the new headline ("Was Musie kann"), and then
said *Replace "P.S: Du bekommt einen Überblick über alle vergangenen Session
und Einblicke in deine Reflektonen in deinem Tagebuch in Musie"*. There is no
"P.S." anywhere in the app to replace — `grep -rn "P\.S" apps/web/src` is
empty — so the sentence is new copy, and the word "replace" is about the two
slides the cut removed rather than about a string.

What I did: made it `about.postscript`, one line under the CTA on `/`, in a
`.musie-postscript` L14 pattern. The reasoning, so it can be overruled cheaply:
the CTA is gated on having SEEN the last slide, so anything that is a slide is
a swipe somebody owes before they may start — and the diary is not a step of a
session, it is what is there afterwards. A P.S. sits after the sign-off.

Two spellings are corrected against `docs/GERMAN-UI-WRITING.md` and the rest of
`de.ts`: *bekommt* → *bekommst*, *Reflektonen* → *Reflexionen* (`de.ts` already
writes *Reflexion* everywhere else). The word order is turned so the sentence
opens on the diary instead of ending on three stacked prepositional phrases.
The ampersand in *Fühle & verstehe dich selbst besser* is Ben's and is kept,
in the English too.

What I need from Ben: **confirmation of the placement**, when the screen is
looked at. If it should be a fourth card after all, it is one line in `SLIDES`
plus a glyph — but then the gate costs a fourth swipe, which is the thing the
cut was for.

## The intro step is called `Einsteigen` / `Start`, and one surface still says `intro`

Where: `apps/web/src/i18n/de.ts`, `apps/web/src/i18n/en.ts`, and the defect in
`apps/web/src/AppShell.tsx:106`

What I checked: the four step names as a set. German ran `Einstieg · Scannen ·
Hören · Nachdenken` — one plain noun among three substantivierte Infinitive.
English ran `Intro · Scan · Listen · Reflect` — one clipped noun among three
bare verbs. In both languages the odd word named the SECTION where the other
three name what you do in it.

What I did: Ben's `Einsteigen` for German, and `Start` for English. Two keys,
both catalogues, nothing else — `session.step.*` is referenced by key only
(`lib/diary.ts`, `routes/Session.tsx`), so no literal moved with it. Walked the
rail in both locales: "Einsteigen, aktuell" and "Start, current".

Why `Start` and not `Begin`, `Step in` or `Get started`, all of which say the
sense better in the rail: the word is INTERPOLATED in two places —
`diary.stoppedAt` ("Stopped at {step}") and `route.session.title`. *Stopped at
Begin* is not English. `Start` is the only candidate that is both a bare verb
like its three neighbours and a noun that survives the sentence. It is the same
word `menu.startSession` and `exercises.start` use as their verb; those are
buttons that start a session from outside it, this names the first step of one
already running, and nothing puts the two on a screen together.

What I need from Ben: **nothing about the words** — but the rename turned up a
defect beside them, and it is not mine to fold into a copy change:

**The document title renders the raw step slug, in both locales.** The tab
reads *Aktuelle Session – intro · Musie* and *Current session — intro · Musie*,
never *Einsteigen* or *Start*. `AppShell.tsx:106` is
`t(handle.titleKey, leaf?.params)` — it feeds the ROUTE PARAMS into the
interpolation, and `:step` in the URL is the English slug by design
(`router.tsx:125`). So `{step}` has always been `intro` / `scan` / `listen` /
`reflect`, lower case, untranslated. `routes/Placeholder.tsx` does the same
thing and its own comment describes it as the feature. It predates this change
and nothing else on the screen is affected: only the tab, the window list and
what a screen reader announces on navigation.

Not fixed here, because the fix is a decision rather than a substitution —
`AppShell` would have to map a `:step` param onto `session.step.*` before
translating, which means the shell learning about steps, or the handle carrying
a per-route params translator. Both are shapes worth choosing on purpose. One
line of scope, one line of blast radius, and it is Ben's call which.

## The exercise detail is gone, and `exercise_i18n.needs` went with it

Where: `apps/web/src/routes/Exercises.tsx`, `apps/web/src/i18n/{en,de}.ts`

What I checked: what the detail lightbox carried that the card underneath does
not. Four things were in it — the name, the description, a *You need* row and a
*Duration* row. The name and the description are the card's own headline and
text, and the duration is already a fact chip on the card (`exercises.fact.time`,
which is the same two timeframe columns the row read since `20260921120000`
deleted `duration_label`). That leaves ONE fact that only the popup had:
`exercise_i18n.needs`. Read rather than assumed, and it is thinner than I
expected: it is `'Your physical Mindfulness Cards deck'` for Achtsame Pause
(`20260918150600`) and `'Mindfulness Cards deck'` for both exercises after
`20260923150000`. That is the `cards` fact chip — *Needs your Mindfulness Cards
deck* — written out longhand.

What I did: removed the lightbox; a tap on a card starts the session. Deleted
`exercises.start`, `exercises.detail.needs`, `exercises.detail.duration` and
`exercises.timeframe` from both catalogues, since nothing reads them any more —
`src/i18n/index.test.ts` used `exercises.timeframe` as its two-slot fixture and
now uses `exercises.fact.time`, which carries the same two slots.

Why: the brief is about clicks, and this was a whole screen charging a tap for
one sentence. Nothing about starting needs confirming — the session is closable
from every step of it.

What I need from Ben: **whether `needs` is now simply dead.** On today's
content the answer looks like yes — both exercises say *Mindfulness Cards deck*
in it and the `cards` chip says the same thing on the card — and then the column
should be dropped in a later migration rather than left looking used. It is
Ben's to say, because the column is the spreadsheet's and the spreadsheet may
intend to put something in it that the chips cannot say (somewhere quiet, thirty
minutes undisturbed, a pen). If it does, the place for it is the INTRO step,
which is inside the session and a tap away from the exercise rather than a
commitment to it — not the card, where it would be a fourth line and roughly
double the card's height.

One consequence that cannot be tidied: `20260923150000_exercise_library_freie_bahn.sql:97`
describes `needs` as "the *Du brauchst* row in the detail lightbox", and that
lightbox no longer exists. The migration is applied, so under rule 4 it is not
edited — the comment is a true record of why the column was filled on the day it
was filled, and this entry is where it is corrected.

One more, smaller, and mine rather than Ben's: **there is no longer anything on
screen between the tap and the session.** The busy state used to be the
lightbox's CTA spinner; the card is checked while `createSession` is in flight
and that is all. Locally the insert is under 100 ms and the refusal path already
renders a Message, so I have left it alone rather than inventing a loader for a
gap nobody has seen yet. If it reads as a dead tap on a real phone on mobile
data, the honest fix is a `loading` state on the card, which is a `RadioCards`
change and so not mine to make.

## A card that lands goes straight to `listen`, and the deep link writes the step

Where: `apps/web/src/routes/Session.tsx` (`submitCode`), `apps/web/src/routes/ScanLink.tsx`

What I checked: the three ways a card gets named — the typed code, the camera,
and `/s/:code` from a phone's own camera app — and what each one did afterwards.
All three stopped on the scan step, which then redrew itself as *Your card ·
MC-08 · Anger* with Continue under it: a screen whose only content is the answer
to a question the person had already answered by holding the card up.

What I did: the first two `advance()` the moment `scanCardInto` comes back
`applied`, after the re-read that fetches the card and the track. The deep link
`saveStep(row.id, 'listen')` before redirecting, which is not bookkeeping: the
session it lands on is usually standing on `intro` (the deck is in somebody's
hand before they have pressed Continue), `listen` is unreachable from `intro` by
the reachability rule, and the session screen's guard would redirect them
straight back. `e2e/scanlink.spec.ts` asserts the column for that reason.

Why: naming the card IS finishing the scan step, so finishing it is what naming
the card now does.

What I need from Ben: **nothing about the flow** — going back one step is where
changing the card lives, exactly as the brief says, and the scan step keeps both
of its states plus *Scan a different card* for that. Two consequences worth
having in writing, neither of them a question:

- **The scan step's second state is now reachable only by going back.** It was
  the step's resting state after a scan and is now the thing you return to. It
  is unchanged and walked by `e2e/session.spec.ts`, which presses Back from
  `listen` to reach it.
- **A deep link scanned from `reflect` rewinds the row to `listen`.** It already
  rewound it to `scan`, because every step change writes `sessions.step` and the
  resolver sent the person back to the scan step; the new behaviour rewinds one
  step less. Nobody has done this on purpose, but somebody who scans a second
  card while writing their reflection will.

## The filled `Next` chevron is the loudest thing on the explainer, and it is a prop

Where: `apps/web/src/routes/AboutMusie.tsx`, the `nextVariant` prop

What I checked: the carousel now has three swipe affordances (peek, nudge,
grab — logged in `packages/design-system/stories/OPEN-QUESTIONS.md`), so the
gesture is discoverable. What remains pointing the other way is the screen's
own composition: until the gate opens this page passes
`nextVariant={seenAll ? 'secondary' : 'primary'}`, so while somebody is
deciding how to move through the carousel, the forward chevron is a **filled
terracotta circle** — measurably the highest-contrast element on the screen,
beside a dot row. That reads as a stepper, which is exactly what the 260925
testers acted on.

What I did: **nothing.** The filled Next is a deliberate prototype decision,
documented in `Carousel`'s own prop: "until the run has been seen, going on is
the only thing to do and Next holds it". It was right when pressing the button
was the only way through. It is the one thing I would not change on my own
initiative, because it is a composition decision on Ben's screen rather than a
defect in a component.

What I need from Ben: **a yes or no to `nextVariant="secondary"` throughout.**
Nothing about clicking gets worse — same hit areas, same dots, same labels,
same keyboard, same `--target-min` — it only stops the button being the one
obviously-pressable thing on a screen that now wants a drag. It is one word in
this file, and reversible in one word. The measured arguments on the other
side: the CTA below is disabled until the run has been seen, so the chevron is
currently the only filled control on the screen, and handing it to `secondary`
leaves the screen with no filled control at all until the gate opens.

## The rail's markers carry glyphs instead of numbers, and two of the four were not chosen

Where: `apps/web/src/routes/Session.tsx` (`STEP_ICON`), and the prop it needs in
`packages/design-system/src/InteractiveWizard.tsx`

What I checked: whether this belonged in the app or the component. The number
is `i + 1` inside `InteractiveWizard` — positional, computed, and nothing a
screen can reach. CLAUDE.md §1 is explicit that a screen never reaches into a
component's geometry and that the fix goes into the component, the way
`CtaButton` got `align`. So `WizardStep` gained an optional `icon`, and the app
passes four.

What I did: `icon?: LucideIcon` on `WizardStep`, drawn in place of the number.
**Optional**, so a run that passes none renders exactly as before — the stories
still do. And it replaces the NUMBER only: `completed` still swaps to a check
and `skipped` to a dash. That is not tidiness, it is 1.4.1 — an icon that
stayed put through completion would leave `active` and `completed` differing by
fill alone. Verified by eye in the app: at the scan step, Einsteigen shows the
check, not its door.

Two of the four glyphs were not a choice — they are what this product already
uses for that idea, and one idea with two glyphs is worse than either:

| step | glyph | where it already lives |
|---|---|---|
| scan | `ScanLine` | the card scanner's own glyph, `CardScanner.tsx:90` |
| listen | `Headphones` | the `sound` fact chip on every exercise card, `Exercises.tsx:53` |

The other two had nothing to inherit, so they are mine and they are the part
worth a second opinion:

- **intro → `DoorOpen`.** The step is the way in, and it is the word the rail
  now uses for it — *Einsteigen*. `BookOpen` was the alternative, reading the
  step as the explainer you read rather than the act of entering. The door won
  because the label names the act.
- **reflect → `MessageCircleQuestion`.** The step asks, and the question is its
  constant part. Deliberately **not** `PenLine`, `Mic` or `Camera`: those three
  are the answer MODES inside this very step (`SessionReflect.tsx:124-126`), so
  any of them in the rail would promise one of the three before the person has
  picked.

What I need from Ben: **a look at those two**, and nothing else. Both are one
line in `STEP_ICON`.

One consequence, flagged rather than solved: **the rail no longer states a
step's position.** The number was the only place it was written down — the
marker is `aria-hidden`, so screen-reader users never had it, and order in the
rail is what everyone else reads it from. Nothing in the product refers to "step
3", so nothing breaks. It is worth knowing before anyone writes copy that does.

## ANSWERED — the filled `Next` chevron, and where the answer went

Where: `apps/web/src/routes/AboutMusie.tsx`, the `nextVariant` prop

The entry above asked for a yes or no to `nextVariant="secondary"` throughout.
Ben, 2026-09-25: **yes on touch, no on a cursor — and do it in the component.**

So this screen's line is unchanged, and that is the point. The carousel now
renders its forward control `secondary` on any coarse pointer whatever it is
passed, so `nextVariant={seenAll ? 'secondary' : 'primary'}` still says the
true thing where a cursor is the only way through, and says nothing at all on
a phone. The pointer is the component's business to read, not this screen's —
which is why the answer is not in this file.

The reasoning, the measurements and the two things it leaves open are logged
in `packages/design-system/stories/OPEN-QUESTIONS.md` under "Carousel — the
forward chevron demotes on touch, and does not disappear". The short version:
hiding the chevrons would have left a thumb with nothing but 24px dots on a
screen that gates its CTA on reaching the last slide.

## The listen step's buttons sit under Safari's toolbar, and the scroll that would reach them is forbidden

Where: `apps/web/src/components/SessionListen.tsx`, `apps/web/src/shell.css`,
`packages/design-system/src/musy-components.css`, and the viewport tokens in
`packages/design-system/tokens/musy-foundations.css`

**UNRESOLVED.** A fix was written on 2026-09-24 and reverted the same day — Ben
did not like the shape of it. The measurements below cost a day's tooling and
are true whatever gets built next, so they are kept and the solution is not.

Reported from a phone (Ben, 2026-09-24): on `/listen`, *Track details and
player* and *Start reflection* sat underneath the browser's own bar, and the
snapping made them impossible to reach. Two independent faults.

**One — the view is sized to a window that no longer exists.**
`--viewport-block` is `visualViewport.height`, written by `theme-init.js`. That
number is true at the instant it is read and false a moment later: on iOS it
GROWS as the toolbar collapses, so a full-height view measured mid-scroll is
taller than the window becomes when the toolbar slides back. The stage pins its
action row to its own foot (`.musie-listen__actions`, `margin-block-start:
auto`), which is precisely the line that then goes under the chrome.

**Two — `mandatory` snap forbids the only scroll offset that would help.**
This is the part worth reading, because the code asserts the opposite in two
places. Both `musy-components.css` and `SessionListen.tsx` say a view taller
than the window relaxes its own snapping under the spec, so a long view can
still be read through. That is what css-scroll-snap-1 says. **It is not what
WebKit does.** Those two comments are still in the tree and are still wrong.

Measured, Playwright WebKit and Chromium, a three-view run at 393×620, ×660 and
×844, overflowing by 0, 150 and 300px, and again against the app's own
stylesheets:

| | asked to rest 152px down, to clear the bar | |
|---|---|---|
| WebKit | thrown back to **0** | the reported bug |
| Chromium | honours the range | why it never showed on desktop |

Three further facts, each measured, that constrain anything built next:

1. **`scroll-snap-align: none` on the stage does not work.** It is the obvious
   fix. In **both** engines the document then snaps to the SECOND view on load:
   the top of the page stops being a snap position, `mandatory` insists on one,
   and the nearest is a screen down — so the reader lands on the Störer having
   never seen the step.
2. **WebKit's threshold for relaxing an oversized view is a flat 150px** of
   `scroll-margin-block-end`. Swept in 25px steps, it is identical at every
   viewport height, every overflow and every distance asked for, so it is an
   engine constant and nothing explains it.
3. **Nothing in CI can catch this class of defect.** `playwright.config.ts` has
   two projects and both are Chromium, where the bug is invisible. A WebKit
   project would have caught it; adding one doubles the walk's runtime, and the
   suite is already deliberately outside `pnpm check`.

What I need from Ben: **what was wrong with the shape of the reverted fix**, so
the next one does not repeat it. The two halves were independent and could be
judged separately — capping the measured viewport at `100svh` in Layer 1, and a
`.musy-snap-view--free` modifier that extended a view's snap area past its own
foot. Either could be kept without the other.

# Phase E — the scan step becomes one frame (2026-09-24)

## The scanner is a design-system component now, and `.musie-scanner` is gone

Where: `packages/design-system/src/QrScanner.tsx`, `src/components/CardScanner.tsx`,
`src/shell.css` (the deleted `THE QR READER` block)

What I checked: rule 1 — a custom `musie-` pattern is permitted only where the
system has no component, and a pattern that recurs is a component request. The
frame had grown from a dashed placeholder to five states with a camera, a mask,
two icon controls and a form in it; "a square you hold a code up to" is not
this screen's idea, it is the same object anywhere a code is ever read.

What I did: moved the whole of it into Layer 2 as `QrScanner`, with the split
`RecordButton` already makes — the component draws the frame and never calls
`getUserMedia`. `CardScanner` is now the adapter: four camera phases to five
modes, a `CameraProblem` to a sentence, `canRetry` to whether a retry is
offered. Every label is a required prop with no default (rule 7).

Why: the app was carrying 100 lines of CSS for something the system should own,
and no state of it could be looked at without a session and a camera. All five
are in Storybook now.

What I need from Ben: nothing, just flagging — but the component is new and has
had one reviewer.

## The brackets over a live picture were invisible in light theme, and the fix is measured but not phone-tested

Where: `packages/design-system/src/musy-components.css` (`.musy-scanner__mask`,
`__corner`), `tokens/musy-foundations-amendments.css` (G3)

What I checked: L15 asks for contrast against every surface an indicator can
land on, and a camera preview is not a surface with a colour. The first version
dimmed the picture outside the card window and drew the corner brackets ON the
window edge — so half of each bracket sat in the UNDIMMED part, where a pale
stroke over a white table is nothing. Storybook's `LiveOverAPicture` (half
near-white, half near-black) showed it immediately in the light theme.

What I did: two things. The brackets now sit one stroke-width OUTSIDE the
window, so every arm lands on the scrim; and `--on-scrim` was added as token
gap G3, because Layer 1 names an ink for every surface except `--alpha-scrim` —
`--on-surface-inverse` cannot do it, since it flips with the theme while the
scrim is dark in both. Computed worst case, ink on scrim over a white picture:
**3.88:1 in light, 7.6:1 in dark**, against 1.4.11's 3:1 for a non-text
indicator.

Why: a number beats an opinion, and the failing case was the one the story was
built to show.

What I need from Ben: **an eye on it at 393px with a real camera**, which is
the part no runner reaches. Specifically: the brackets against a white table in
a bright room — the 3.88:1 is arithmetic on the token values, not a photograph
— and whether the two icon controls bottom-right are comfortable for a thumb
while the other hand holds a card.

## Dropping `session.scan.reader` moved a sentence into content that will be overwritten

Where: `src/i18n/en.ts`, `src/i18n/de.ts`,
`supabase/migrations/20260924120000_scan_md_phone_camera.sql`

What I checked: the empty frame carried two sentences and the redesign empties
it. `readerNote` is now what the primary button says, so it simply goes. But
`reader` was the ONLY place the product ever mentioned the common way in — a
printed card read by the phone's own camera app, which is what E.0 bought — and
deleting it would quietly stop teaching the fastest route.

What I did: Ben's call, asked and answered before this was written — the
sentence moves into the exercise's own `scan_md`, as a clause on the step that
already says to scan the code, for `mindfulness-cards` and `free-rein` in both
locales.

Why: instructions for a step belong with the other instructions for that step.

What I need from Ben: **it is now content, and content here is provisional.**
`scan_md` is the Mindfulness Cards spreadsheet's column and the seed says it
will be overwritten. If the real copy lands without that clause, Musie stops
mentioning the phone's camera app anywhere at all. The sentence has to go into
the spreadsheet, not just into this migration.

## The typed form inside the frame breaks the square, and that was the choice

Where: `packages/design-system/src/musy-components.css`
(`.musy-scanner__frame--manual`), `src/components/SessionScan.tsx`

What I checked: the frame is capped at five guided targets (320px) with
`aspect-ratio: 1`. The form is a label, a field, a hint, a submit and a way
back — five things, which do not fit in a 320px square on a phone.

What I did: `manual` drops `aspect-ratio` and the box grows to its form; the
border goes solid there, as it does when the camera is live, because something
is in the box. Rendered at 393px: the form fits with the German hint wrapping
to three lines and nothing clipped.

Why: the square is what makes it read as a viewfinder, and a form is not one.

What I need from Ben: nothing, just flagging — the step's height now changes
when the form opens, which it did before too (the form used to appear below the
frame). It is one box changing rather than a column growing.

## The four audio masters are gone from the LOCAL bucket, and `supabase db reset` did it

Where: `src/lib/db.content.db.test.ts` ("lets a signed-in listener sign a real
object"), `e2e/reveal.spec.ts`

What I checked: the migration above needed `supabase db reset` to apply, and a
reset wipes storage as well as the database. The `trk-NN.mp3` objects are an
operator act with files that "deliberately never entered this repository"
(BUILD-PLAN, E.4), so nothing in the repo can put them back.

What I did: nothing — there is nothing here to do it with. `pnpm test:db` is
**84 passed, 1 failed** and `pnpm test:e2e` is **14 passed, 2 failed**, and all
three failures are that one missing object (`NoSuchKey`, then no `<audio>` to
wait for). Every other walk passes, including both camera walks in both
locales.

Why: a reset was the only way to apply a content migration locally.

What I need from Ben: **re-upload the four recordings to the local `tracks`
bucket**, after which those three should pass again. Worth knowing for next
time: any content change means a reset means re-uploading them.

## The already-running message has two ways out, and it needed two things from the system

Where: `apps/web/src/routes/Exercises.tsx`, `apps/web/src/i18n/{en,de}.ts`,
`packages/design-system/src/musy-components.css` (`.musy-msg__action`)

What I checked: what the refusal could offer. `sessions_one_running_per_user`
is a partial unique index, so a second start comes back 23505 and the screen
reads the running session back. Until now that bought one link — *Continue that
session* — and the person who wanted the OTHER exercise had to go there, close
it, come back and find the card again: four screens to undo one tap.

What I did, to Ben's brief: the link is the PRIMARY action; a second,
`secondary` action reads *{name} starten und vorherige Session beenden* and
ends the running session (`abandoned`, with `ended_at`) before creating the new
one; and the list behind the message is `disabled` while the question is open
and keeps its selection, so the card the message is about stays on screen,
checked. `e2e/cancel.spec.ts` walks both halves — the frozen, still-checked card
in the existing walk, and the end-and-start in a second one that asserts both
rows.

Why `abandoned` and not `finished`: DOMAIN-MODEL's diagram reads
`started --> finished : completes the reflection`, and `sessionMachine`'s FINISH
guard enforces it. A session ended from the library to make room for another one
has not been reflected, and the diary already draws an abandoned run as
unfinished, at the step it stopped on.

What I need from Ben: **three things, none of them blocking.**

1. **`Message` says "exactly one action. Two actions means this is a dialog,
   not a message"** (`Message.tsx`, `MessageProps.action`). This screen now
   passes a `ButtonGroup` with two. I did not widen the prop — composing two
   Layer 2 components is not the app reaching into the component's geometry —
   but the comment is now describing a rule the app has a live exception to,
   and it is the system's comment to change or to defend. The exception is
   real: this is not a dialog, it is a message the person can ignore, and both
   ways out of it belong where the sentence is.

2. **`.musy-msg__action` was `align-self: flex-start`, and I changed it to
   `stretch`.** A lone button looks identical either way — `.musy-btn` is
   inline-flex and hugs its label — but `ButtonGroup` stacks below `--bp-md`
   with `inline-size: 100%` on each action, and 100% of a shrink-wrapped box is
   100% of the longest label. That is a Layer 2 fix in the Layer 2 file, which
   rule 1 puts there.

   **What is left, measured at 393px:** the message's grid is
   `auto minmax(0,1fr) auto`, so the icon column and the 44px dismiss target
   leave the main column **189px of the message's 311px**. The long action is
   then four lines tall (128px in German, 108px in English). It is legible and
   it is the same geometry every Message has always had — but an action row
   that spanned all three columns would give it 311px and two lines. That is a
   structural change to `Message` (the action would move out of `__main` and
   become a second grid row), so it is the system's call, not mine.

3. **`exercises.alreadyRunningDetail` still reads "Finish or close the one you
   are in before starting another."** It is not false — the new button closes
   it and starts another — but it was written when going elsewhere was the only
   option, and it now reads as an instruction sitting directly above the button
   that carries it out. One sentence, both catalogues, and it is Ben's copy.

One measurement worth keeping, found while walking this: **`saveStep` is
fire-and-forget** (`void saveStep(...)` in `Session.tsx`), so a navigation
issued in the same breath as a step change aborts the PATCH and the row keeps
the old step. The new walk hit it by going to `/exercises` immediately after
Continue, and now polls the row before leaving — as `e2e/resume.spec.ts`
already did, for the same reason. Nobody moves that fast by hand, and the
deliberate not-awaiting is what keeps the wizard from stalling on a slow write,
so this is a note rather than a bug report.

## A card that keeps its selection cannot be tapped again — RESOLVED, and the rule is written down

Where: `apps/web/src/routes/Exercises.tsx` (`releaseChoice`), `apps/web/e2e/cancel.spec.ts`

What I checked: Ben, 2026-09-24 — *"I can't start a session anymore"*, on
localhost, on /exercises. Reproduced in one walk: with a session already
running, tap a card → the refusal appears → dismiss it → tap the SAME card →
**nothing at all**. No message, no navigation, no request. The only way out was
a reload.

The cause is one sentence: **`RadioCards` reports CHANGES.** `value` is the
tapped card and it was deliberately kept through a refusal — Ben's own brief,
so the message can name the exercise it is asking about and the card stays on
screen beneath it. But once the message is dismissed the card is STILL the
group's value, so tapping it is not a change, `onValueChange` never fires, and
`choose()` is never called. The card is dead while looking entirely normal.

It was introduced in this session, in two halves: removing the detail lightbox
made `value` a held state instead of one derived from the open popup (it had
been derived precisely so nothing could stay checked with no question open),
and the refusal then kept that state alive on screen. `NotImplementedLightbox`
already cleared it on close; the refusal did not. One of the two paths had the
rule and the other did not, which is the drift.

What I did: `releaseChoice()` — one function, called by every way of closing a
question about a card (the refusal's dismiss, the not-implemented lightbox's
close, and a start that threw). The argument lives in its docstring rather than
in three comments. `e2e/cancel.spec.ts` now dismisses the refusal and presses
the same card a second time, expecting the same answer back: a refusal that
returns is a start that was attempted, and it is the only on-screen proof that
the tap was heard at all.

Two things came out of the same report, and both are fixed here rather than
logged:

- **A failed start said nothing.** `start()` returned silently when `userId`
  was null and only wrote the console when the insert threw. That was survivable
  while the detail lightbox had a spinner in front of the person; with the card
  as the control, a failure is a tap that evaporates. There is now an `error`
  Message with `exercises.startFailed` ("Die Session konnte nicht gestartet
  werden"), including for the no-user case that `AuthProvider` documents as
  having no UI.
- **The lesson generalises.** Any controlled selection in this app that
  survives the thing it was selected FOR has to be released when that thing
  closes, or the control is one tap from dead. It is written on `releaseChoice`
  because that is where the next person will be standing.

What I need from Ben: **nothing** — but worth knowing while testing: the
`tracks` bucket is empty on the local stack (a `db reset` this morning
recreated it at 06:49 and the nine audio files are an operator upload that
never entered the repo, BUILD-PLAN:720). So the listen step has nothing to
play, and `e2e/reveal.spec.ts` fails on its `<audio>` element for that reason
and no other. Everything else in the suite is green, both locales.

## Ending the session from the menu, and a nav row that acts instead of navigating

Where: `apps/web/src/components/NavDrawer.tsx` (`NavRow.href`, `NavRow.onSelect`),
`apps/web/src/routes/MenuDrawer.tsx`, `apps/web/src/i18n/{en,de}.ts`,
`apps/web/e2e/cancel.spec.ts`

What I checked: what the drawer offered somebody mid-session. One thing — go
back into it. Starting something else meant going back in, closing it there,
and coming out again, which is the same four-screen detour the library's
refusal had before this morning. Ben's brief: a ghost row under *Session
fortsetzen* that ends the run, puts it in the diary, and hands back a fresh
`/exercises`.

What I did: `menu.endSession` — *Session beenden & neu beginnen* — directly
under the action, with no rule between them, so the two things you can do about
the run you are in read as a pair and the existing rule above *Dein Tagebuch*
separates that pair from the pages. It went in as a ghost row and Ben moved it
to `secondary` the same hour: outlined is this system's "this is a control, not
a label", and a row that writes to the database should not share the flat
treatment of four rows that merely navigate. That is now the drawer's rule
rather than a one-off — `current || onSelect !== undefined` — and the two
cases cannot collide, because a row with an `onSelect` has no `href` and is
therefore never the current page. It only exists
when a session is confirmed running; while the read is in flight there is
nothing to end, so there is no row.

The write is `endSession(id, 'abandoned', now)` — the same write *Close
session* makes from inside the run and the same one the library's refusal
makes. **Three doors, one act**, which is why the diary does not have to know
which one was used, and why `e2e/cancel.spec.ts` now holds all three.

**The one thing that needed a decision: every nav row was an anchor.** The
drawer renders each row as a `CtaButton` with `render={<Link to={href} />}`,
and this row cannot be a link — it writes first and decides where to go
afterwards. A link with `preventDefault` is a button wearing a costume, and it
would keep an href that Cmd-click and "open in new tab" would honour, skipping
the write entirely. So `NavRow.href` is now optional and `NavRow.onSelect`
exists beside it: with an href the row is a destination, without one it is a
button that does something. That is the app's own component (L14 pattern, no
Drawer in the system), so no design-system decision is involved.

What I need from Ben: **nothing.** Two notes from walking it:

- **A failure keeps the row rather than navigating.** If the end write throws,
  the drawer stays open with the row live and the reason on the console — going
  to the library with the session still running would just be the refusal
  message one tap later, blaming the person for something that already went
  wrong here. There is no Message surface in the drawer, which is why this is a
  console log and a restored button rather than a sentence.
- **`e2e/scanlink.spec.ts`'s "nothing running" walk counts ALL sessions** in the
  table and asserts the delta is zero. It therefore fails whenever anything
  else touches the local stack during that window — my own concurrent run
  earlier, and once while Ben was clicking through localhost. It passes alone,
  every time. Scoping the count to the browser's own user would fix it
  properly; that is a change to an assertion I did not write, so it is flagged
  rather than made.

# Phase · /settings is deleted, and the menu is the only overlay (2026-09-24)

## Three preferences moved into the drawer, and one did not move at all

Where: `src/components/MenuPreferences.tsx` (new), `src/components/NavDrawer.tsx`
(the `preferences` slot), `src/routes/MenuDrawer.tsx`, `src/SettingsSheet.tsx`
(deleted), `src/AppShell.tsx` (the profile icon), `src/router.tsx`

What I checked: the brief named four moves — language to /menu with the legend
and the radios but no hint, dark mode to /menu, *Your diary* to /diary, and
/settings and its nav icon gone. The sheet held FIVE things, so two of them had
no instruction attached:

- **the account section** (*Signed in as …* and *Sign out*, H.0b). Deleting it
  with the route would leave a signed-in tester no way to sign out at all —
  and the address is shown for a reason: a workshop phone gets passed around
  and "which of us is this?" has to be answerable. It moved into the drawer
  with the other two.
- **`UserTypeChoice`** — *Here as* / *Hier als*, the four user types. It did
  not move, and that is the one judgement call in this piece of work.

What I did: the four rows first, a hairline, then dark mode, language, and the
account. `NavDrawer` takes them as one `preferences` node rather than as more
row data — a row is a label and a destination, which is why `pages` can be
data; a switch, a fieldset and a card are not that shape, and inventing a
settings-form language for one caller would be the wrong kind of generality.

Why *Here as* went instead of moving: /about-you asks the same question, writes
the same `profiles.user_type_id`, and is a row in the very drawer the copy
would have landed in. Two controls for one column, one tap apart, is the thing
a simplification is for.

**What that costs, exactly, because it is not nothing.** Ben settled on
2026-09-19 that the two screens should DISAGREE: /about-you refuses the three
unimplemented types with a lightbox, because it is a gate into a session and
must say why the door will not open; /settings accepted all four, because a
preference is yours to record whether or not the product has caught up. The
second half of that decision is now unimplementable — there is no screen where
an unbuilt type can be recorded, so `user_types.implemented` is effectively a
filter again rather than a distinction. The comment that explained the
asymmetry in `AboutYou.tsx` says so rather than being deleted.

What I need from Ben: **one decision, not blocking.** If being able to record
*With a therapist* as a preference mattered, it needs a home — the honest one
is /about-you accepting the pick and keeping the lightbox as an explanation
rather than a refusal, which is a change to that screen and not to this drawer.
Say the word and it is four lines there.

## Delete-everything moved to /diary, which reverses G.2's one decision

Where: `src/routes/Diary.tsx` (`DeleteEverything`), `src/shell.css`
(`.musie-diary__danger`)

What I checked: G.2 put this control in /settings and wrote the argument down
in three numbered points — /diary IS the thing being destroyed, reaching
settings is already two deliberate acts, and "delete my data" is a settings
question in every product a person has used. The brief moves it to /diary, so
the first and third points are now being spent rather than kept.

What I did: moved it, and kept what answered the old argument:

- it is **below everything**, behind a hairline, at `--space-section` — the
  same distance `.musie-main` ends the page with;
- it is **not rendered at all when the diary is empty**, so the one state where
  it could be reached without scrolling is the state it is absent from (that
  also stops *Delete your whole diary* appearing under *No sessions yet*, which
  is an offer to destroy nothing);
- the **inline confirmation is unchanged**. It was the third line of defence
  and is now the second, which is the honest cost of the move.

It reads `data`, not the filtered list, because the act has never been about
the visible subset: it takes every session including a running one. And the
navigate to /diary afterwards does three jobs in one call — `useDiary` keys on
`location.key`, so the list re-reads; the screen becoming empty IS the
confirmation, with no toast to write; and nothing is left pointing at a step
whose row is gone.

The section has **no heading**. In the sheet it was a `ContentBox` headlined
`route.diary.title`, because a button among preferences has to name what it
acts on; on this screen that headline is the h1 at the top of the page, and
repeating it would put *Your diary* on the screen twice and add an outline
entry that says nothing.

What I need from Ben: **nothing, one thing to watch.** At 393px `ButtonGroup`
stacks and gives the ghost button the full width — the system's rule, the same
one it applied in the sheet. A full-width control at the end of the diary is
more present than the same control was in a sheet you had to open. If it reads
as too loud there, the fix is in the design system (a `hug` on the group, or a
variant that does not stretch), not a width in `shell.css` — L7.

## The header has one button, and the empty grid column stays

Where: `src/AppShell.tsx`, `src/shell.css` (`.musie-header`)

What I checked: `1fr auto 1fr` was chosen so the logo centres against the
VIEWPORT rather than against the space left beside the hamburger. With the
profile button gone the third column is empty, and the obvious tidy-up —
`1fr auto` — would move the logo visibly off-axis.

What I did: left the three columns, said so in the stylesheet, and changed
`.musie-header > :last-child` to `:nth-child(3)`. The logo is `:last-child`
now, and `justify-self: end` on an `auto` track does nothing — a rule that is
silently inert is a rule that misleads the next reader. Named by column, so it
still applies if the header ever takes a third child again.

`shell.profileLabel` is deleted from both catalogues with the button, and
`route.settings.title` with the route.

What I need from Ben: **nothing, just flagging.** Nothing redirects /settings;
a stale URL lands on the not-found route. It was linked from one icon in our
own header, never printed and never sent anywhere, so there is nothing out
there holding it.

## The data promise has no door left

Where: `src/components/SessionReflect.tsx`, `src/components/DataLightbox.tsx`,
`src/i18n/{en,de}.ts` (`privacy.voiceShort`, `privacy.more`)

What I checked: the reflect step was the only place in the app that opened
`DataLightbox`. It carried one line of small print — *Musie keeps the text,
never your voice* — with *More about your data* beside it as the link. Nothing
else reaches the lightbox: /about-musie does not, the menu drawer does not, and
nothing links `privacy.*` anywhere outside that paragraph.

What I did: removed the line and the link, as asked, and left both the
component and its two strings in place rather than deleting a promise the
product still makes. `DataLightbox` is now built, tested by nothing, and
unreachable. The five sentences inside it — the account, the voice, the written
answer, the photo, and what clearing this browser costs — are still the truest
thing the app says about itself, and they are currently unsayable.

What I need from Ben: **one decision, not blocking.** Where does the data
promise live now? Three candidates, and all three are small:

- **/about-musie**, as a section rather than a lightbox. It is the screen whose
  job is already explaining what this is, and a promise about data reads as
  part of that rather than as an interruption.
- **the menu drawer**, as a row that opens the existing lightbox. One line of
  JSX plus one label, and it is reachable from every screen.
- **the closed-test welcome**, once, where consent belongs if it is ever
  consent rather than reassurance.

Say which and it is done in one pass. Until then the lightbox stays where it
is: deleting it would mean rewriting five sentences of Ben's own copy when the
answer arrives.

## The diary's answer is a third caller of the prose pattern

Where: `src/components/DiaryCard.tsx`, `src/shell.css` (`.musie-prose`)

What I checked: the entry card handed `reflection.body` to `ContentBox`'s
`text` prop, which is one `<p>`. A spoken answer reaches it as
`joinStatements`' output — every statement glued with a space — so four
sentences somebody paused between came back as a wall, and a typed answer lost
every line break the person pressed. The statements themselves were never lost:
`reflection_statements` has held one row each, in `position` order, since
`20260922100000`. The diary was the screen that threw them away again.

What I did: the detail read now embeds them
(`reflections(mode, body, reflection_statements(id, text, position))`), a
`statements` array rides on `DiaryReflection`, and `answerParagraphs` decides
what a paragraph is — the statements when there are any, otherwise the body
split on its own line breaks. The card draws a `<p>` each inside
`.musie-prose`, which is the app's existing column-of-paragraphs pattern.

Why that made the entry above ("`.musie-md` and `.musie-prose` now differ only
in ink") sharper rather than answering it: `.musie-prose` has a second caller
now, and the family has a third. L14.3's "a pattern that recurs is a component
request" is no longer a thing that WOULD apply at a third caller — it applies.
I did not merge them, for the reason that entry gives: it is a design-system
change, and rule 1 says a fix that belongs in the system does not get made in
the app.

What I need from Ben: **nothing new, but the prose component is now overdue by
its own rule.** Two Layer 3 patterns and three callers, all drawing the same
column of paragraphs at the same type step.

## *Start a session* on /diary disappears while a session is running

Where: `src/routes/Diary.tsx` (`StartAnother`)

What I checked: the request was a start button behind the newest entry. Three
places in the product already start one — the explainer's CTA, the drawer's
action row, and the library itself — and the drawer's rule is that while a
session runs *Start a session* is REPLACED by *Continue session*, because a
second `started` row is refused by a partial unique index.

What I did: the diary's control follows that rule by being ABSENT while a
session runs, rather than by growing its own *Continue session*. It reads
`useActiveSession`, renders busy and disabled until that read lands, and only
then offers the link. It also goes with the card: collapsing the newest entry,
or setting a filter, removes it, because that is the moment the diary stops
being a landing and becomes a query.

Why I did not add the second branch: *Continue session* would be a second copy
of the drawer's row, and the drawer is one tap away on every screen. Two
renderings of one offer is how they drift — the same argument that put
`DiaryCard` in one file.

What I need from Ben: **a look at it in use.** Two things are guesses I would
rather have watched than argued: whether the control should survive collapsing
the card, and whether somebody mid-session who lands on /diary expects to see
*Continue session* here rather than reaching for the menu.

## The header hides on the way down — and one screen had to be allowed to say no

Where: `src/lib/headerReveal.ts`, `src/lib/useHeaderReveal.ts`,
`src/AppShell.tsx`, `src/shell.css` (`.musie-header[data-hidden]`),
`src/components/SessionListen.tsx`

What I checked: three levels, and each had something to say.

- **Layer 1** has the motion. `--motion-enter` and `--motion-exit` are the
  named semantic pair for something arriving and something leaving, and
  `prefers-reduced-motion` collapses both to 1ms at the token level — so the
  slide becomes a cut without a media query in `shell.css`.
- **Layer 2** has no Header and no App Shell, which is what makes this a
  permitted L14 pattern rather than a component request. `.musie-header` was
  already one.
- **The app's own geometry** had the objection. `--chrome-block`,
  `--sticky-block`, `--view-block` and `--view-block-scrolled` are all the
  header's height, and half the app is sized from them. Hiding it with
  `display: none` or a zero height would shorten the document by 69px under a
  reader halfway down it and make every one of those numbers wrong for a
  frame.

What I did: the header travels and never leaves the flow —
`transform: translateY(-100%)`, which is one of the geometric identities L14
allows and the only honest way to say "its own height, whatever it is today".
Every token keeps its meaning while the header is off screen.

The decision is a reducer in `headerReveal.ts` with 17 tests, because the
`unit` project has no DOM and what can be wrong here is judgement, not wiring:
travel from a turning point rather than direction, a threshold each way (56px
down, 14px back), a top band, a floor on how short a page may be, and clamped
readings so iOS's overscroll bounce is not mistaken for a gesture. Two of
those tests failed on the first run and were right to: one scroll event can
cover more ground than one frame of gesture, so the header went at 70px on a
page the reader had barely entered.

Why: on a 393px phone the header is 69px of every screen, held for as long as
you are on it, and the diary, the library and the reflect step are all longer
than a window.

What I need from Ben: **nothing on the pattern. Two things flagged.**

**One — the listen step pins the header, and that is a new app concept.** Its
three views are sized `--view-block-scrolled` and snap `--sticky-block` from
the top of the window; a header that comes and goes leaves a header's worth of
the previous view showing above the one you just snapped to, in a band the
snap will not let you scroll away. So `usePinnedHeader()` lets a screen say
"not on me" for as long as it is mounted, counted the way `useScrollSnap`
counts its consumers. It could not be detected instead of declared:
`data-musy-scroll-snap` is absent for the length of a programmatic jump, which
is exactly when a button scrolls you down a whole view.

It is the right shape for one caller. If a second screen ever pins, that is
the moment to ask whether the answer is really "this screen scrolls itself"
and belongs in the route handle beside `wide` and `overlay`.

**Two — `HIDE_AFTER` and `REVEAL_AFTER` are 56 and 14, and neither is a
token.** They are in pixels, and Layer 1 has pixel tokens that look adjacent —
`--motion-travel-lg` is 32px. It is not the same measurement: travel tokens
say how far a THING MOVES, and these say how much GESTURE counts as intent,
which is a behaviour constant like a long-press duration. So they are named
constants in the app with the argument written above them rather than a token
gap reported against Layer 1. Reported here in case the system would rather
own a scale for it.

**And one thing I could not do:** verify it in a walk. `pnpm test:e2e` refuses
to run — `.env.local` points at the hosted project and the walks guard against
addressing two databases (`e2e/support.ts`), so 18 of 20 fail in `stack()`
before a browser opens. That is the state of the checkout, not this change.
The pattern itself is verified in a real Chromium at 393px against the running
dev server: shown at rest, `top: -69` after a read down the page, still hidden
after an 8px twitch up, back at `top: 0` on a real scroll up. The pin on the
listen step is the one part argued rather than walked.

# Phase H.x — the deck authoring loop

## The deck is one JSON file now, and four decisions inside that are worth contesting

Where: `supabase/content/deck.json`, `supabase/content/README.md`,
`apps/web/scripts/deck.mjs`, `deck-migration.mjs`, `deck-pdf.mjs`,
`src/lib/deck.test.ts`, `src/lib/deck.db.test.ts`

What I checked: how a deck change costs today. Nine cards across `cards`,
`card_i18n` and `exercise_tracks`, two locales and two exercises, is 45 rows of
hand-written SQL to rename one feeling — and `20260923150000` had to park a
non-deferrable unique column to do it without a mid-statement collision. Rule 4
is right and it is not the thing making that expensive; the retyping is.

What I did: made the deck a single file and generated the migration from it.
`pnpm deck:migration` writes an ordinary new stacking migration with an
ordinary new timestamp; nothing edits an applied file and nothing pushes.

Four choices in there that a reviewer should argue with rather than inherit:

**One — every generated migration states the WHOLE deck**, upserting all 45
rows and deleting what the deck no longer has, rather than carrying the
difference. A minimal migration would depend on the database already being
where the generator imagined it, which is the assumption rule 4 exists because
nobody can make safely. The cost is that a one-word change produces a
150-line file. I think that is the right way round; it is the decision most
likely to annoy somebody in review.

**Two — the "what changed" header comes from git**, `git show
HEAD:supabase/content/deck.json` against the working copy. It is prose for a
reviewer, not correctness. Commit the deck before generating and the summary is
empty while the migration is still complete. The thing that actually proves the
database matches the file is `deck.db.test.ts`, which is in `pnpm test:db` and
so can be aimed at the hosted project — which is the only way to catch a deck
applied locally and never pushed.

**Three — `cards.id` is now REQUIRED to be `cards.code` in lower case**, and
the validator refuses a deck where it is not. That was already true of all
nine, and it is not enforced by the schema. I enforced it because
`sessions.card_id` is what a diary row keeps, and a diary row read in a year
should name the paper card without a join. It does close a door: a card can no
longer be renamed on the paper without being a different row in the database.
Given a printed code cannot be changed anyway, I think that door should be
shut. **Flagging it as a rule I added rather than found.**

**Four — the generator refuses to delete a card without `--allow-removal`.**
`sessions.card_id` is `on delete set null`, so dropping a card empties the card
out of every diary entry that ever drew it, silently, while the entry survives.
That is a product decision wearing the clothes of a content edit.

Why: so that the next deck change is an edit to nine lines of JSON and one
command, and so that the four ways the file and the database can drift apart
are all red rather than all invisible.

What I need from Ben: **nothing to unblock it. Three flagged**, the id/code
rule above, and the two under the PDF entry below.

## The printed card is typographic, because the deck has no artwork

Where: `apps/web/scripts/deck-pdf.mjs`

What I checked: `cards.image_url` is `assets/web/method-card.png` for all nine
— one shared placeholder, which is a picture OF a card rather than a picture
FOR one, and `apps/web/public/assets/web/` holds only the logo. So there is
nothing to put on a card front.

What I did: made the front the feeling, set as large as fits on one line, with
the other locale beneath it; the back is the QR, the printed code and a
caption. It is built out of `packages/design-system/tokens/` — the real
webfonts, the real semantic aliases, `musie-` prefixed classes — and printed
through the Chromium `@playwright/test` already installs, so no dependency was
added and the card cannot drift from the system.

Two things a printer would have caught and the first render got wrong, both
fixed and both worth knowing: the bleed was WHITE, so a cut that drifted would
have shown paper instead of card; and the single-line fit measured before the
webfonts loaded, so it sized every word against a fallback face and then let
the real one wrap. The fit now waits on `document.fonts.ready` and the script
waits on the page.

Why: a proof you can cut out and scan is worth more than a specification of a
card nobody has held.

What I need from Ben: **two decisions, neither blocking.**

**One — the caption on the back reads *"Scanne und hör zu · Scan and listen"*,
and I wrote it.** It is print copy, so it is not in `src/i18n` — nothing renders
it on a screen — but it is held to `docs/GERMAN-UI-WRITING.md` and it is the
one string on the deck that is neither a feeling nor a code. It is a constant
at the top of `deck-pdf.mjs`. Change it there, or tell me and I will.

**Two — the deck is bilingual by default**, German large and English beneath.
`--locale de` prints German only. Which one goes to a printer is a product
call and I have not made it.

## The local `tracks` bucket is empty again, and it is not this change

Where: `src/lib/db.content.db.test.ts` — *"lets a signed-in listener sign a
real object"*

What I checked: `select name from storage.objects where bucket_id = 'tracks'`
returns nothing, while four rows in `public.tracks` carry a `src`. The signed
URL then fails with `NoSuchKey`, and `pnpm test:db` is 89/90 for that one
cause. Nothing in this change touches storage, and no `supabase db reset` was
run — the deck migration was verified by applying its SQL to the running
database directly, in one transaction, precisely to avoid emptying the bucket.

What I did: nothing, deliberately. This is the situation the RESOLVED entry
above — *"`supabase db reset` empties the local `tracks` bucket"* — already
describes, and its recovery still holds: `supabase storage cp` from the linked
project, which still has all four. I did not run it because pulling from the
hosted project is not part of a content change.

Why: recording it as recurring matters more than quietly fixing it. The entry
above reads as a one-off; this is the second time, which makes it a step in
whatever runbook follows a reset rather than an accident.

What I need from Ben: **say the word and I will copy the four files back.**
Until then `pnpm test:db` is 89/90 on this checkout and the failure is that,
not the deck.

## `image_url` has no leading slash, and that only works one route deep

Where: `public.exercises.image_url`, `public.cards.image_url`,
`public.user_types.image_url` — and `src/routes/Exercises.tsx` L298, which
passes the column straight to `RadioCards` as `image`.

What I checked: every value in these three columns is relative —
`assets/web/exercises/free-rein.webp`, and `assets/web/method-card.png` before
it. `<img src>` resolves against the **document** URL, so on `/exercises` it
lands on `/assets/web/exercises/free-rein.webp` and is correct. It is correct
by accident: `/exercises` is one segment deep, so the segment the browser
strips is the only one there is. `src/brand.ts` writes the same kind of path
the other way — `BRAND_MARK_SRC = '/assets/web/musy-logo.png'`, with the
slash.

What I did: matched the existing convention rather than breaking it, because
changing it is a data migration over three tables and this change is about
five pictures. The new rows are relative like every row around them.

Why: the day anything draws an exercise, card or user type from a route with
two segments — `/session/:id/:step` is already two, and `SessionIntro` is one
design decision away from wanting the exercise's picture — the image 404s and
the card silently falls back to an empty `--surface-sunken` box. That is the
exact failure mode `method-card.png` had for six days without anyone noticing,
which is the argument for fixing it before it can happen twice.

What I need from Ben: **one call — leading slash, or a resolver in
`content.ts`.** The slash is one migration over three tables and nothing else
changes. A resolver keeps the column a bare key and puts the prefix in one
place, which is the better shape if these ever move to a CDN or to Supabase
storage the way `tracks.src` did. I lean resolver, and either is ~20 minutes.

## `cards` and `user_types` still point at a file that has never existed

Where: `public.cards.image_url` (nine rows) and `public.user_types.image_url`
(four rows), both `assets/web/method-card.png`.

What I checked: `apps/web/public/assets/web/` has held exactly one file since
2026-09-18, `musy-logo.png`. `method-card.png` was seeded as a placeholder and
never created, so all thirteen rows draw an empty box. The five exercises had
the same bug and it is fixed in `20260924140000_exercise_artwork.sql`.

What I did: left them. There is no artwork for a card or a user type yet, and
pointing them at something equally absent would spread the problem rather than
fix it. `card_i18n.image_alt` is also null in both locales for all nine, which
the seed argues for deliberately — the source has none and writing it would be
authoring copy.

Why: the nine card images are the ones that matter. `SessionScan` and the
reveal are built around a card you are holding, and a card that draws an empty
box on screen while the paper one in your hand has a picture on it is the
place this will be noticed first.

What I need from Ben: **nine card images, or a decision that cards show no
picture.** The second is a real answer — the paper card is the artwork, and the
screen may not need to repeat it. If they are coming, the same folder and the
same recipe as `assets/web/exercises/` works; the README there has both.

## The `tracks` bucket emptied again — third time, and expected on this one

Where: `src/lib/db.content.db.test.ts` — *"lets a signed-in listener sign a
real object"*. `pnpm test:db` is 89/90 on this checkout, that one cause.

What I checked: `storage.objects` has 0 rows. Same `NoSuchKey` as the two
entries above.

What I did: nothing, again — but this time it was not avoidable. The entry
above dodged it by applying SQL to the running database directly; a migration
cannot be verified that way, because CLAUDE.md rule 4 asks for `supabase db
reset` precisely so that every file is re-applied in order. So the rule that
verifies a migration is the rule that empties the bucket.

Why: two entries called it recurring. Three makes it structural — any change
under `supabase/migrations/` costs the four audio files, and the recovery
(`supabase storage cp` from the linked project) is a manual step nobody is
reminded of.

What I need from Ben: **say the word and I will write the restore as a
script** — `pnpm db:tracks` or similar, run after a reset — so it stops being a
thing you have to remember and starts being a line in the table in CLAUDE.md.

## The card-to-track pairing was re-cut by hand, and it reverses E.4's mood match

Where: `supabase/content/deck.json`, `artwork/cards/README.md`,
`supabase/migrations/20260924140001_deck_track_repairing.sql`

What I checked: Ben rewrote the mapping table in `artwork/cards/README.md` —
the table that exists so a human can match a recording to a card, because
`tracks.id` is opaque and `title`/`artist` are withheld by column grant. Three
things in it needed answering before anything was generated:

1. **`mc-04` carried two track ids**, `trk-04` and `trk-01`, in a row with six
   cells where every other row has five. Ben: `trk-01`.
2. **`trk-02` is assigned to two cards**, `mc-02` and `mc-05`. Legal —
   `exercise_tracks` is unique on (exercise, card), not on track, which is the
   entire reason a recording is stored once and pointed at rather than copied.
   Confirmed as intended.
3. **It reverses the mood matching BUILD-PLAN records for E.4**, which took the
   pairing from the files' own ID3 mood tags and says Ben chose that over a
   random draw. Every pair moves except Sadness. Confirmed as deliberate.

What I did: applied it as written.

| card | was | now | the recording |
|---|---|---|---|
| MC-01 Freude | `trk-01` | `trk-04` | Bats and Rats |
| MC-02 Trauer | `trk-02` | `trk-02` | Wait for It |
| MC-03 Wut | `trk-03` | `trk-05` | High Sierra Call |
| MC-04 Angst | `trk-04` | `trk-01` | Little Yellow Petals |
| MC-05 Ruhe | `trk-05` | `trk-02` | Wait for It |

Applied to BOTH exercises. The table is per CARD and says nothing about
exercises; `mindfulness-cards` and `free-rein` draw the same deck and have
always played the same recordings, so splitting them here would have invented a
distinction nobody asked for.

Why it is safe for the diary: `sessions.track_id` records what ACTUALLY
PLAYED, separately from `card_id`, and DOMAIN-MODEL says in as many words that
the three are different facts so a re-pairing cannot rewrite history. Verified
rather than assumed — the migration touches `exercise_tracks` only.

What I need from Ben: **nothing to proceed. Three consequences flagged.**

**One — `trk-03` is now paired with nothing.** No card plays it. It has no file
either, so nothing is lost today, but it is a row waiting for both a recording
and a card that wants it.

**Two — it is now FIVE cards that play and four that run the clock**, not four
and five. Anger moved onto High Sierra Call. Two planning documents still say
the old count and now contradict the database: BUILD-PLAN.md's E.4 table with
its mood column, and MOCKUPS.md §3, whose heading is literally *"Four cards
play, five run a clock"*. I did not edit either — they are records of what was
decided when, and rewriting them silently is how a record stops being one. They
want a superseding line, and that is Ben's call on his own documents.

**Three — Wait for It is 102 seconds and now serves two cards.** BUILD-PLAN
already flagged it against a 90-second `listen_gate_seconds`: twelve seconds of
headroom, so one pause puts the reflection out of reach without a replay. That
now applies to Trauer and Ruhe rather than Trauer alone.

**And the migration's header says its baseline is unknown**, which is correct
and worth explaining. `deck.json` is not committed yet, so `git show
HEAD:supabase/content/deck.json` finds nothing and the generator refuses to
claim what changed — it states the whole deck instead, which is complete either
way. Commit `deck.json` once and every later migration gets the summary
automatically.

## The front carries the QR too, which is the one thing allowed over the picture

Where: `scripts/deck-pdf.mjs` — `front()`, `.musie-front-qr`, and the
`--musie-front-qr-inset` override in `singlePages()`

What I checked:

**The back already had the code, and the brief asked for a second one.** The
back's `.musie-scan` group is the QR, the printed `MC-0n` and the caption that
says what the square is for, and none of that moves. What was missing was a way
to scan a card **without turning it over** — and turning it over is the one move
that shows the reader which card it is before the reveal, which is the whole
reason `tracks.id` is opaque and `title`/`artist` are withheld by column grant.

**It contests the same day's call, so it is worth writing down.** 2026-09-24:
the artwork prints *instead of* the feeling word, because "the picture is the
card, and a word set over it is the designer arguing with the illustrator". A
QR over the picture is the same shape of argument. The distinction I drew is
that the square is a machine's target rather than a graphic element — it says
nothing to a reader, so it is not a second voice on the card. That is a
judgement, and it is the one to contest if it is wrong.

**Three geometries, not one.** The inset is measured from the card's own edge,
which is the trim line on every face except one: in `--layout single` the art
front is `position: absolute; inset: 0` and so covers trim **plus bleed**, which
would have put the square `bleed` mm nearer the blade than on a word front. That
face gets `bleed + 4mm`; everything else gets `4mm`. `--layout sheet` has no
bleed at all and needs no override.

**A transparent quiet zone would have failed, and only on some cards.** The
back's QR has `color: { light: '#0000' }` so the sand runs through it, which is
right on flat sand and wrong on a photograph — it would have produced a deck
that scanned on four cards and not on the fifth, discovered by a tester holding
one. The front's sits on an opaque `--surface-raised` panel.

What I did: a ~16 mm square on both fronts, drawn and undrawn, bottom-left,
4 mm inside the trim. Added a `MIN_MODULE_MM` warning in `main()`, because the
printed size is fixed in millimetres while the module count grows with
`--base-url` — and print day runs this with a domain nobody has typed yet, so
the deck could come back from the press unscannable on the front with nothing
having changed in this file.

Why: a card on a table should scan face up, and the reveal should survive it.

What I need from Ben: **a look at the corner, and a ruling on two things.**
(1) Bottom-left was asked for; it is now a reserved 22 × 22 mm of every
illustration, and `artwork/cards/README.md` says so — confirm that is where it
should stay before more artwork is drawn against it. (2) It is on the word
fronts as well as the drawn ones, on the reasoning that a deck where five cards
scan face up and four do not is a deck nobody can give an instruction about.
Both are one line to reverse.

Verified: all nine fronts rendered through Chromium at 4× and decoded with the
app's own `zxing-wasm` reader, in both `88x63` and `63x88` — nine of nine read
back the right `/s/MC-0n`. At the default base url the square prints 33 modules
across 16.4 mm, or 0.50 mm per module.

## The language picker is segments now, and it asks the design system for an icon it cannot have

Where: `src/components/MenuPreferences.tsx` — `LanguageChoice`, `ThemeSwitch`,
and `.musie-prefs-row` / `.musie-drawer__prefs` in `src/shell.css`

What I checked:

**`SegmentedControl` requires a glyph per option, and a language pair has none
to give.** The requirement is well argued in the component's own header: labels
ellipse at one line, CSS truncation does not touch the accessibility tree, so
the icon is the cue that survives a clipped label for a sighted user. That
reasoning assumes the options can be told apart by picture. *English* and
*Deutsch* cannot — lucide has no per-language mark, and a flag is a country
rather than a language (Deutsch is not only Germany's, and English is nobody's
flag in particular). So both segments get `Languages`, which says what the
group is and nothing about which option you are looking at.

**It is safe here and I could not prove it safe in general.** Two segments in a
~270px drawer give each about 130px, and a seven-character endonym at
label-md never reaches the ellipsis — at that width the container query has
already stacked the glyph over the label and handed the label the segment's
full width. So nothing clips, and the cue that was supposed to survive
clipping is never called on. That is an argument about one drawer at one width,
not about the component.

What I did: passed `Languages` to both options and said so at the call site.

Why: the alternative was inventing a distinction in pictures where none exists,
which is the failure the icon requirement is written to prevent, pointed the
other way.

What I need from Ben: **a ruling on whether `SegmentedControl` should allow a
text-only option.** Either the glyph stays required and a language picker is
simply not a segmented control (in which case this reverts to
`RadioGroupText`), or the component grows a documented case — "all options
share one glyph, or none has one" — for a set whose labels are short, fixed and
self-distinguishing. It belongs in the design system either way; this file is
the wrong place for it to live permanently.

## Dark mode lost its printed label, which is a 2.5.3 judgement rather than a layout one

Where: `src/components/MenuPreferences.tsx` — `ThemeSwitch`, `labelHidden`

What I checked:

**`Switch`'s own header calls a visible label "strongly preferred".** It is
hidden now, on Ben's instruction, so the switch and the language segments fit
one row at the foot of the drawer. The name is still passed and still
announced; what is gone is the word *Dark mode* / *Dunkelmodus* next to the
track.

**What carries it instead is the knob's moon/sun pair**, and that is the part
worth recording: the glyphs were already a domain pair rather than the
Check / X default, so they say *what* is switching and not only that something
is. With the text gone they are the only thing that does. If those ever revert
to the default the control becomes an unlabelled toggle, and nothing in the
type system will notice.

**2.5.3 (Label in Name) is not violated** — there is no visible text to
disagree with the accessible name — but the spirit of it is thinner: a sighted
user who does not read the moon as "dark mode" has nothing else to read.

**And the tap target got smaller, which I did not intend and am not fixing
here.** `Switch`'s focusable element is the track — 52 × 32 — and the label is
a `<label for>`, so it was part of the hit area. Hiding it leaves the track
alone: measured 52 × 32, which clears 2.5.8 (24 × 24, AA) comfortably and does
not reach the 44 the rest of this app aims at. The `.musy-switch` row still
declares `min-height: var(--target-primary)`, so the 44px is drawn and only the
middle 32 of it is live. That is the component's geometry, not the screen's,
which is why it is written down rather than patched from `shell.css`.

What I did: `labelHidden`, dropped `reverse` (it exists to push a *visible*
label to the far edge), and left the pair in place with a comment saying it is
now load-bearing.

Why: Ben asked for one row, and one row of 393px does not hold two controls and
two names.

What I need from Ben: **a look at it on a phone with nothing else on screen.**
The moon-as-dark-mode reading is familiar to me and I cannot un-know it; a
tester who has never met this switch is the only real test of whether the word
was doing work.

## The shell's scroll-to-top is not authoritative on a screen that snaps

Where: `src/components/SessionListen.tsx` — the layout effect beside
`useScrollSnap`; `src/AppShell.tsx` — the arrival reset it is working around;
`packages/design-system/src/useScrollSnap.ts` — where the general answer
probably belongs.

What I checked:

**The reported defect is real and it is the snap engine, not a missing
reset.** Reaching `listen` from a scrolled `scan` step opened the page
part-way down. `AppShell` does scroll to the top on every arrival and it does
fire here; `<html>` is a mandatory snap container for as long as the step is
mounted, and the engine pulls the shell's `window.scrollTo` back to a snap
position. Measured in a 390 × 375 window — a phone in landscape — carrying
554px in: **the shell scrolled to 0 and the page settled at 195**, and with the
shell's scroll taken out as well, at 607. `e2e/listen.spec.ts` is that walk,
and it fails on the old code with exactly those numbers.

**Two arrivals hide it, which is why nothing caught it.** A small offset snaps
to the first view anyway and looks like a reset that worked — a tall phone in
portrait cannot scroll the scan step far enough to tell the two apart. And
naming a card re-reads the row (`onRescan`), so the page shrinks to the loading
note on the way past and the offset is clamped off the bottom before the step
draws. Neither is a guarantee; both hold in the windows the existing walks use.

**This is a general defect with one victim today.** Any screen that calls
`useScrollSnap` inherits it: the shell's contract — *arriving at a route means
arriving at its top* — is silently void wherever mandatory snapping is on, and
nothing in the type system or the stylesheet says so. `listen` is the only
caller, so the fix is at the call site.

What I did: reset the scroll from inside the step, on mount, through
`withoutSnapping` — the hook's own remedy for a scroll the engine would undo —
in a layout effect so it lands before the frame is painted, and only when the
page is not already at the top. Plus the walk above, which fails without it.

Why: one caller is not a pattern (L14.3), and the app is where a defect with
one victim gets fixed first.

What I need from Ben: **a ruling on whether `useScrollSnap` should start its
consumer at the top itself.** The hook already owns `<html>` for the length of
a screen and already knows how to hold snapping off; "a screen that snaps opens
on its first view" is arguably part of what it promises, and the second caller
will otherwise rediscover this the same way — from a phone, months later. The
alternative is that the hook stays mechanism-only and every snapping screen
resets its own scroll, in which case this belongs in `10-layout.md` as a rule
rather than in a comment on one component.
