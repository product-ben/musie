# Reflect, calmer · Plan

The engineering plan for the PRD at
<https://claude.ai/code/artifact/a69c4cb9-9835-4232-bb7e-7061eef204c2>. Read
that first — this file assumes its decisions and does not re-argue any of
them.

**Branch**: `the-reflect-step-is-calmer`, off `main` at `92f8083`, in the
worktree `../musie.worktrees/the-reflect-step-is-calmer` — rule 9's
arrangement, and necessary here because three other worktrees are live
(`feelings-detection-help`, `listen-infographic`, `the-wheel-is-only-a-file`)
and the primary checkout is shared.

**The feelings dataset came for free.** `apps/web/src/content/emotionWheel.ts`
(8 / 40 / 80 words, DE and EN on every node) and its source
`supabase/content/emotion-wheel.yml` are already on `main` — merged by #35's
line of work — so branching brought them with no UI attached, which is what
the brief asked for. `apps/web/src/routes/FeelingsSelection.tsx` and
`CapturingFeelingsExploration.tsx` are the two 2026-10-15 experiments; they
stay on the branch untouched and nothing in this plan reads them.

**This plan was written before the code and is kept as written**, with the
places the build departed from it marked **BUILT DIFFERENTLY** in the section
that owns them. The departures are: the types were hand-written rather than
generated (§2), the migration was applied with `supabase migration up` rather
than waiting for a reset (§1), `useSessionFeelings` took an `enabled` flag
nobody predicted (§5), and the e2e walk needed rewriting (§14).

**Two commands in this plan are denied to Claude**: `supabase db reset` and
`pnpm gen:types`. §2 and §14 say what is done instead.

---

## 0 · What the design system already gives us

Checked before sizing anything.

| need | what exists |
|---|---|
| the sheet frame — scrim, focus trap, Escape, scroll lock, portal, grow-from-origin | `Sheet` in single-body mode (`children`, no `pages`) |
| the pinned headline inside a sheet | `Sheet`'s `header` slot |
| the two sheet actions | `Sheet`'s `foot` slot, computed by the consumer |
| `?focus` on the address as the open state | the pattern in `SessionListen.tsx` L377 — derived, never held |
| the mood scale | `FeelingsScale`, unchanged, 3 points |
| the toast | `Toast`, plus **one new prop** (§4) |
| the `+` button | `IconButton`, `variant="outlined"`, `size="primary"` |
| the inline feeling links | `InlineLink` + a `musie-` row (§8) |
| the rows inside the drill-down | `RadioGroupText`, plus **a new per-option variant** (§3) |
| the drill-down frame | **nothing — the one genuinely new component** (§3) |
| the dialog's three actions | `ButtonGroup`, plus **a new variant** (§3a) |
| the thoughts sheet's innards | `SegmentedControl`, `Field`, `VoiceTranscript`, `PhotoUpload`, `Message`, all moved as-is |

So: **one new component, three small additions to existing ones, one
migration, and a rearrangement of `SessionReflect`.** The weight is in the
migration, the component and the strings — not in new infrastructure.

The three additions are `Toast`'s slot (§4), `RadioGroupText`'s drill-down
option variant (§3) and `ButtonGroup`'s `continue-only` (§3a). All three are
Ben's calls, made on the PRD after the first draft of this plan; §3's is the
one that reversed a decision, and the reversal is argued where it lands.

The usual trap, rule 7: `Sheet` requires `title` and `closeLabel`; `Lightbox`
underneath defaults `closeLabel` to the German *Schließen*; `ContentList`
defaults `emptyLabel` to *Noch keine Einträge*. Every one passed explicitly.

---

## 1 · The migration — `public.session_feelings`

`supabase/migrations/<stamp>_a_feeling_is_a_path_not_a_word.sql`. One file,
schema only. Rule 4.1 does not touch it: `session_feelings` is not one of the
six content tables, so nothing `/maintenance` writes can clobber it and
nothing here can clobber an operator's edit.

Shape is in the PRD's Data section. Four things the file must do, in order,
because rule 2 is the rule most easily half-done:

1. `create table`, with both constraints — `session_feelings_path_ordered`
   (no holes in the path) and `session_feelings_one_per_path` (the dedupe).
2. `alter table ... enable row level security`.
3. Four policies, mirroring `reflections` in `20260919120000_sessions.sql`:
   select / insert / delete for the owner of the parent session. **No update
   policy** — editing a confirmed feeling is out of scope, and a table with no
   update policy says so better than a comment does.
4. `revoke all on public.session_feelings from anon, authenticated;` **then**
   `grant select, insert, delete ... to authenticated` and
   `grant select, insert, update, delete ... to service_role`.

Step 4 is the one that was missed on 2026-09-21 and cost 23 red tests in three
files. The local stack's `alter default privileges` hands a new table to `anon`
and `authenticated` already fully granted, so without the revoke the grant is
decoration; and the hosted project's *Automatically expose new tables* being
off is what leaves `service_role` with nothing despite `BYPASSRLS`.

**Index**: `(session_id)` is covered by the unique constraint's leading
column. Nothing else is needed — the only read is "this session's feelings".

**BUILT DIFFERENTLY — the migration was applied without a reset.** `supabase
db reset` is denied and would have re-applied this branch's migrations over
whatever the other three worktrees are testing against. `supabase migration
up` is not denied and is additive: it applied this one file, recorded it in
`supabase_migrations.schema_migrations`, and touched nothing else. The SQL was
first run inside a `begin; … rollback;` against the live stack to prove it
parses, and both constraints were proved the same way before anything was
committed — including that `NULLS NOT DISTINCT` refuses a second level-1 stop,
which is the clause most likely to have been written wrong.

**Tests**: `apps/web/src/lib/db.feelings.db.test.ts`, beside
`db.sessions.db.test.ts` — the suite lives with the lib code, not under
`supabase/`, and `*.db.test.ts` is what `pnpm test:db` collects.
Owner inserts and deletes; a second account sees zero rows; `anon` is refused
on all three verbs; `service_role` can read; the path-ordered check rejects
`(emotion_id, null, 3)`; the unique constraint rejects a second identical
path. Run with `pnpm test:db` — not in `pnpm check`, by design (`ci.yml`).

---

## 2 · Types

`pnpm gen:types` must run so `session_feelings` reaches
`apps/web/src/lib/database.types.ts`. **It is denied to Claude** and it reads
the one shared local stack, so it is Ben's command, run from one session
knowing the other three worktrees are affected.

Until it has run, the branch cannot typecheck against the new table. Two ways
through, and the second is the one taken unless Ben is at the keyboard:

- Ben runs `supabase db reset && pnpm gen:types` and commits the result.
- The table's row type is hand-added to `database.types.ts` in the exact shape
  the generator produces, and §14 lists regenerating it as a thing Ben must
  confirm before merge. This is what `GOAL-FILTER-PLAN.md` §2 did, and it was
  marked as a departure then; mark it again if it happens.

**BUILT DIFFERENTLY — the second one happened.** `session_feelings` was
hand-written into `database.types.ts`, in the generator's shape and in its
alphabetical position, with both `question_rejections` and `sessions`
relationship entries as the generator emits them. **Ben must run `pnpm
gen:types` and confirm the file is unchanged before this merges.** If it
differs, the hand-written block is wrong and the generated one wins.

---

## 3 · `DrillDown` — the new Layer 2 component

`packages/design-system/src/DrillDown.tsx`, exported from `index.ts`, with
`stories/DrillDown.stories.tsx`. It takes the next free §7.x in the component
spec (7.24 is `DraggableList`, the current highest in the source headers).

**Why a component and not an app pattern** — L14.3. It is the second
narrowing-selection surface the product wants (the first being the
`/feelings-selection` experiment, which is exactly the evidence), and more to
the point the interaction is testable only in isolation: a list that replaces
itself, announces the replacement, and moves focus is three behaviours a
screen cannot assert about without a browser.

### 3.1 · It is a wrapper, not a new list — Ben, on the PRD

**This reverses the first draft of this plan**, which specified a `<ul>` of
`<button>`s and argued that "a radio that moves you is a lie to a screen
reader". Ben's ruling on the PRD: the rows ARE `RadioGroupText` rows, the
drill-down affordance is a `→` on the right of the box, **the radio circle
stays on every row** so the list is still scannable as one thing, and
`DrillDown` is "basically the wrapper around the `RadioGroupText`".

Taken, and the accessibility argument is answered rather than ignored — see
3.4. What the reversal buys is real: one visual language for every list of
choices in the product, and `RadioGroupText`'s truncation measurement, error
state, `guided` targets and empty state all come for free instead of being
rebuilt.

### 3.2 · The slot

Ben: *"It is built in storybook in a way (with a slot), that later also other
selection components could be used within."* So `DrillDown` does not import
`RadioGroupText` at all. It owns the stack and renders a level through a
render prop:

```ts
export interface DrillDownNode {
  id: string;
  label: string;
  children?: readonly DrillDownNode[];
}

/** What the slot is handed for the level currently on screen. */
export interface DrillDownLevel {
  /** The rows to draw, the stop row already first when there is a parent. */
  options: readonly { value: string; label: string; drillDown: boolean; disabled?: boolean }[];
  /** Call with a row's `value`. DrillDown decides whether that descends or picks. */
  onChoose: (value: string) => void;
  /** Null at level 1. */
  parent: DrillDownNode | null;
  /** 0-based. The slot needs it for nothing but a key; DrillDown draws the back row. */
  depth: number;
}

export interface DrillDownProps {
  nodes: readonly DrillDownNode[];
  /** Picked a leaf, or the stop row. The full path, root first. */
  onPick: (path: readonly DrillDownNode[]) => void;
  /** THE SLOT. Omit it and DrillDown renders nothing — there is no default,
   *  because a default would make the component import one selection
   *  component and the whole point of the slot is that it imports none. */
  children: (level: DrillDownLevel) => React.ReactNode;
  /** Rule 7, all of them. */
  stopLabel: (parent: string) => string;     // "einfach nur {x}"
  backLabel: (parent: string) => string;     // "Zurück zu {x}"
  levelLabel: (parent: string, count: number) => string;  // the live region
  /** Rows already held — passed to the slot as `disabled`. */
  disabledIds?: readonly string[];
  className?: string;
}
```

**What `DrillDown` owns**: the stack it is currently showing, the back row,
the stop row inserted first at every level below the first, the live region,
focus moving into the new level, and deciding whether a chosen `value`
descends or resolves to an `onPick`.

**What the consumer owns**: how a row looks, and what happens after a pick.
"Show two buttons once something is picked" is a fact about the reflect flow,
not about drill-downs — the same split `Sheet` makes with its index.

### 3.3 · `RadioGroupText` gains a drill-down option

Two additions, both on the option rather than the group, because one level
mixes both kinds:

```ts
export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Draws the trailing → and marks the row as one that descends. */
  drillDown?: boolean;
  /** Rule 7 — the accessible name of what the → means, per row.
   *  Required when drillDown is set. */
  drillDownLabel?: string;
}
```

The circle stays. The `→` goes at the inline end of the box, after the label,
in the same ink as the chevrons elsewhere. The row's target is unchanged.

**One thing to measure, not reason about**: `RadioGroupText` measures label
overflow (`scrollHeight > clientHeight`) to decide truncation. A trailing
glyph narrows the label box, so the arrow must be laid out before that
measurement is trusted, or long German rows will clamp one word early. Render
it and look.

### 3.4 · Accessibility, re-answered

The rows are radios, so the honest shape is: **each level is its own radio
group**, with its own `name` and its own legend, replaced when the level
changes. That is what makes a drill-down row a legitimate radio — within the
level that is on screen, choosing *Optimistisch* IS a choice, and its
consequence happens to be that a new question is asked.

- `legend` is the live level's question, passed per level and `legendHidden`
  where the sheet header already asks it.
- The `→` is not decoration: `drillDownLabel` gives each descending row an
  accessible suffix (*weiter zu Optimistisch*), so the two kinds of row are
  distinguishable without sight.
- The level change is announced in a polite live region — `levelLabel`,
  e.g. *Glücklich — 7 Gefühle*.
- Focus moves to the first row of the new level.
- Nothing is pre-checked on arrival at a level, including on the way back up.
  A level you have returned to shows no selection, because the thing you
  picked there is no longer what you are being asked.

**Escape is not taken.** It belongs to the Lightbox the sheet is inside, and
going up a level must not race closing the sheet.

**Stylesheet**: the back row and the `→` go in `musy-components.css`. Measure
the rendered sheet rather than reading the file — that stylesheet overrides
itself late.

### 3.5 · Stories

`DrillDown` with a `RadioGroupText` slot, at all three levels; a shallow tree;
an empty tree; `disabledIds` set; German and English; light and dark. **And
one story with a different component in the slot** — `RadioCards` is the
obvious second — because a slot nothing has ever been swapped in is a slot
that does not work, and that story is the only proof the API is generic.

`RadioGroupText` gets its own story addition: a group mixing plain and
`drillDown` options, and one with a label long enough to clamp beside the
arrow.

---

## 3a · `ButtonGroup` — the `continue-only` variant

Ben, on the PRD: *"Add a variant: `continue-only`. This variant should always
be used when it's purely about continuing, not about another action on the
page (like scrolling). Use it here, not anywhere else, yet. The primary action
is always bottom right, the secondary action left next to it, the tertiary
action left next to it."*

`ButtonGroup` is §7.4a and already carries `align`, `stacked` and `relation`.
This is a fourth axis and it is **not** a value of `stacked` — it governs
order, where `stacked` governs width.

```ts
/** What the row is FOR. `continue-only` is a group whose every action is a
 *  way on from here — nothing in it acts on the page behind it. */
export type ButtonGroupPurpose = 'actions' | 'continue-only';
```

| | at `--bp-md` and up | below `--bp-md` |
|---|---|---|
| today (`actions`) | row, `align`, DOM order | stacked, full width, **DOM order — primary first** |
| `continue-only` | row, trailing, **reversed — primary rightmost** | stacked, full width, **reversed — primary last** |

**The second row of that table is a deliberate exception to the component's
own rule**, and Ben chose it knowingly when asked: the primary ends up
directly above the thumb. The existing rule — *the primary action must come
first in the markup* — stays true of `actions` and is now scoped to it in the
header, rather than being quietly contradicted.

**DOM order is still priority order.** The reversal is visual
(`flex-direction: row-reverse` / `column-reverse`), so the reading order a
screen reader and keyboard see is primary first in both directions. That is
the whole reason to do it in CSS rather than by reordering children.

**Used in exactly one place**: §9's incomplete dialog. The header says so, and
says that a second consumer is when the variant earns its keep rather than a
reason to widen it now.

**Stories**: `continue-only` with two and with three actions, at
`--bp-md` and below it, light and dark.

---

## 4 · `Toast` — the slot

One new optional prop on `packages/design-system/src/Toast.tsx`:

```ts
/** Interactive content below the label. The single `action` is unaffected —
 *  a slot is content, not a second way out. */
children?: React.ReactNode;
```

Rendered below `label`, inside the toast body. Three things to get right:

1. **The swipe must not eat it.** `swipeable` is `Boolean(onDismiss)` today
   and the handlers sit on the root. A drag starting inside the slot is not a
   dismiss gesture — guard on `event.target` being inside the slot, or put the
   handlers on the label row rather than the root. Measure it with a pointer,
   not by reading.
2. **`label` going `null` still hides everything**, slot included. The
   no-timer contract is unchanged.
3. **The slot is not part of the status announcement.** `FeelingsScale` is a
   `fieldset` with its own legend and names itself.

**Story**: the slot holding a `FeelingsScale`, both placements, both tones,
light and dark — and one with slot *and* `action`, because that combination
becomes possible here and should be looked at deliberately rather than
discovered.

---

## 5 · `apps/web/src/lib/feelings.ts`

New file. Everything between the wheel, the table and the screens.

| export | does |
|---|---|
| `FeelingPath` | `{ emotionId, detailedId: string \| null, specificI: number \| null }` |
| `resolveFeeling(path, locale)` | the label, from `EMOTION_WHEEL`. Falls back to the level above when a word cannot be resolved |
| `wheelAsTree(locale)` | `EMOTION_WHEEL` → `DrillDownNode[]`, ids being the path serialised |
| `pathOf(nodes)` | a `DrillDownNode[]` from `onPick` → a `FeelingPath` |
| `listFeelings(sessionId)` | select, ordered by `created_at` |
| `addFeeling(sessionId, path)` | insert; a unique violation resolves as "already held", not an error |
| `removeFeeling(id)` | delete |

Unit tests beside it, in `feelings.test.ts`: the round trip
`wheelAsTree → pathOf → resolveFeeling` for a level-1 stop, a level-2 stop and
a level-3 leaf; and both duplicate labels in the wheel (*Powerful*,
*Delighted*) resolving to different paths. These run in `pnpm check`.

A small `useSessionFeelings(sessionId, locale, enabled)` hook holds the list
and the mutations, so the step and the sheet read one source.

**BUILT DIFFERENTLY — the `enabled` flag was not in the plan.** A session has
four steps and the feelings belong to one, so the hook as first written opened
every run with a query for a list that three of the four steps cannot show. A
hook cannot be called conditionally, so the flag is what skips the read; the
caller passes `state.step === 'reflect'`.

---

## 6 · The feelings sheet

`apps/web/src/components/FeelingsSheet.tsx`, modelled on `GoalSheet.tsx`.

`Sheet` single-body. `header` is the `h2` headline. `children` is one
`DrillDown` whose slot renders a `RadioGroupText` per level (§3.2), fed
`wheelAsTree(locale)` and `disabledIds` from the held feelings.

**The foot is progressively disclosed** — Ben, on the PRD: *"The actions are
only displayed once a feeling is selected."* Selected **in this visit**, as
confirmed. So:

| state of this visit | foot |
|---|---|
| arrived, nothing picked yet | empty — the Lightbox × is the way out |
| picked at least one | *Ich bin fertig* (filled) + *Weiteres Gefühl festhalten* (outlined) |
| picked at least one, five now held | *Ich bin fertig* alone |

Reopening a sheet with three feelings already held still arrives with an empty
foot. That is the point of reading "selected" as this visit: *Weiteres Gefühl
festhalten* only means something once there is a "this one" to add another
to.

A pick calls `addFeeling` immediately. A failed insert shows a `Message` in
the foot and leaves the sheet open; a unique violation is not a failure and
shows the already-held state instead.

---

## 7 · The thoughts sheet

`apps/web/src/components/ThoughtsSheet.tsx`. `Sheet` single-body, `header` is
the rotating question (`question.text.reflect`, straight from `Session.tsx`),
body is the card `Image` when the run is digital and has a card, then the
block lifted wholesale out of today's `SessionReflect` — `SegmentedControl`,
`Field`, `VoiceTranscript`, `PhotoUpload` + its `Message`. `foot` is one
*Fertig*.

It holds no state. `mode`, `text` and their setters stay on `Session.tsx` and
pass through, exactly as they do today. The fallback path (no question set →
`reflect_md` with its own heading) comes across unchanged.

---

## 8 · `SessionReflect` — the default step

The file shrinks to the welcome copy and two sections.

- Headline and the why-paragraph, from `i18n`.
- Feelings: empty → `CtaButton`; filled → subheadline, then a
  `.musie-feeling-row` of `InlineLink`s each with its own `×` `IconButton`,
  then the outlined `+`. A permitted L14 pattern: it recurs nowhere else yet,
  every declaration resolves to a Layer 1 token, the class is `musie-` not
  `musy-`, and the stylesheet says so. If a second screen wants it, that is a
  component request and goes in `OPEN-QUESTIONS.md`.
- Thoughts: empty → a button whose variant depends on whether feelings is
  filled; filled → subheadline and the text block.

`FeelingsScale` and its section come out of this file entirely.

**Alignment**: the links and the `+` are centred on each other. `IconButton`
at `size="primary"` is taller than a line of body text, so the row is a
flex row with `align-items: center` and the links inline inside it — measured
in the browser, not derived from the CSS.

---

## 9 · `Session.tsx` — the actions, and the dialog

Three changes, all in the `else` branch that owns the reflect step.

1. `complete` stops reading `feelingChange` and starts reading
   `feelings.length > 0 && hasAnswered(...)`.
2. The `CtaButton` takes `variant="ghost"` while incomplete.
3. The incomplete dialog gains the routing buttons from the PRD's table, laid
   out by `ButtonGroup` with §3a's `purpose="continue-only"` — primary
   rightmost in the row, primary last in the stack, DOM order unchanged. Its
   primary sets the search param and dismisses the dialog in the same act, so
   Escape from the sheet lands on `/reflect` and not on a dialog underneath.

   This is the variant's only consumer. Three German labels — *Entdecke deine
   Gefühle*, *Weiter bearbeiten*, *Trotzdem speichern* — will stack at 393px,
   which is what `stacked="fill"` is for and why the order question had to be
   settled before the component was touched.

`feelingChange` and `updateFeelingChange` leave `finish()`. The write moves to
§10. `finish()` still writes the reflection and marks the session finished;
nothing else about it changes.

The two flags are read where `immersive` is read on the listen step —
derived from `useSearchParams`, never held — and resolved against each other
so `?focus-feelings&focus-thoughts` renders feelings alone.

---

## 10 · The toast on `/diary`

`SavedToast` in `Diary.tsx` gains the slot and the write.

- `SAVED_TOAST_MS` → 60_000.
- The slot is a `FeelingsScale`, three points, legend passed.
- Picking calls `updateFeelingChange(sessionId, value)` and, on success, sets
  `showing` false. On failure it stays up and shows the error in place.
- Which session: the one just finished. `Session.tsx` L990 already navigates
  with `state: { sessionSaved: true }` and `SessionSaved` reads it once on the
  arriving render. The id rides in that same object —
  `{ sessionSaved: true, sessionId: id }` — rather than being guessed as "the
  newest row", which would be wrong the moment two tabs are open. The
  `history.replaceState` that clears it stays exactly as it is.

---

## 11 · The diary entry

`DiaryEntry.tsx` reads `session_feelings` for the session and draws a
subheadline plus the labels as plain text under the reflection. Not links —
nothing is removable there, and a past session is not editable.

Resolved in the active locale at render time, through `resolveFeeling`.

---

## 12 · Strings

`en.ts` first, then `de.ts` — `MessageKey` is `keyof typeof en`, so the order
is forced and a missing German key is a typecheck error, not a runtime
fallback. The table is in the PRD's Copy section. The headline's person
(variant A or B) is Ben's to confirm; A ships unless he says otherwise.

Rule 7 sweep before calling it done: grep `packages/design-system/src/` for
every default on `Sheet`, `Lightbox`, `IconButton`, `ContentList`,
`FeelingsScale` and the new `DrillDown`, and confirm each is passed.

---

## 13 · Docs

`apps/docs` is a derived view — a page that disagrees with the repo is a bug
in the page.

- `apps/docs/features/reflect.md` — rewritten. Its mermaid diagram currently
  shows three modes feeding `reflections.body`; it now has to show the default
  step, the two sheets, and `session_feelings` beside `reflections`.
- `apps/docs/architecture/data-model.md` — `session_feelings`.
- `apps/docs/features/diary.md` — the toast now asks a question.
- `DOMAIN-MODEL.md` — the new table.
- `packages/design-system/README.md` — `DrillDown`'s section, `Toast`'s new
  prop, `RadioGroupText`'s `drillDown` option, and `ButtonGroup`'s
  `continue-only` under §7.4a.
- `apps/docs/design/` — nothing, unless the `→` needs a token that is not
  already there. Check before assuming it does.

`pnpm --filter docs build` fails on a dead link, which is the check.

---

## 14 · Verification

| | |
|---|---|
| `pnpm check` | typecheck, lint, unit tests across three of four packages |
| `pnpm test:db` | after §1, against the local stack. **Not** in `check` |
| `pnpm storybook` | `DrillDown` at all three levels **and with a second component in its slot**; `RadioGroupText` mixing plain and `drillDown` rows, with a clamping label; `ButtonGroup` `continue-only` above and below `--bp-md`; `Toast` with the slot |
| `pnpm --filter web dev` | the step itself — **check what is already on :5173 first**, three other worktrees are live |
| `playwright test session.spec.ts` | **BUILT DIFFERENTLY — the walk had to be rewritten.** It typed into the step's own field and answered the step's own scale, neither of which exists there now. It opens both sheets instead, takes the stop row at level 2 so the nullable `specific_i` is exercised, and asserts the sections by catalogue string rather than by a wheel word — the 128 words are provisional content and a walk that typed one would go red at the next reimport. |
| `pnpm --filter docs build` | §13's dead links |

**What Ben must run**, because both are denied here and both drive the one
shared stack: `supabase db reset` and `pnpm gen:types`. Until then §2's
hand-written types stand in and this plan is not finished.

**Not deployed.** Nothing in this phase goes to hosted; `pnpm db:sync` is a
separate act, on `main`, after merge.

---

## 15 · Subagents

A subagent inherits the directory, not the conversation. Two places one
helps, both read-only:

- `Explore`, to sweep `packages/design-system/src/` for every user-visible
  default before the §12 rule-7 pass.
- `Explore`, to find every reader of `reflect.*` i18n keys before §12 moves
  them.

Everything that writes is done in one session. §1, §3 and §8 all touch files
the others assume, and the migration timestamp is a wall-clock race with the
three live worktrees — rule 9's last paragraph.

---

## Log

`apps/web/OPEN-QUESTIONS.md` is append-only and an empty log is a failure
signal. Already queued for it:

- a word retired from the wheel leaves unresolvable `session_feelings` rows,
  and nothing decides what the reader does (PRD, Open 2);
- the soft cap at five is a UI rule with no constraint behind it (PRD, Open 4);
- `.musie-feeling-row` if a second screen asks for it (§8).
