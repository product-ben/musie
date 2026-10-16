# The headline is the filter · Plan

The engineering plan for `GOAL-FILTER.md`. Read that first — this file assumes
its §6 (what the four goals are), §7 (what the count counts) and §10 (which
string lives where), and does not re-argue any of them.

**Branch**: `goal-context-in-the-headline`, off `origin/main` at `647a306`, in
the worktree `../musie.worktrees/goal-context-in-the-headline` — rule 9's own
arrangement, and necessary here because another session held the primary
checkout. Nine steps, all nine built. §12 says where a subagent helps and
where it collides.

**This plan was written before the code and is kept as written**, with the
three places the build departed from it marked **BUILT DIFFERENTLY** in the
step that owns them. The departures are: the types were hand-edited rather
than generated (§2), `goal_i18n.why` is nullable rather than `not null`
(§1), and the e2e helper needed a rewrite nobody predicted (§8.1).

**Two commands in this plan are denied to Claude**, and Ben was away: `supabase
db reset` and `pnpm gen:types`. Neither was run. §11 says what was done
instead and what is left for Ben to do.

---

## 0 · What the design system already gives us

Checked before sizing anything:

| need | what exists |
|---|---|
| the sheet frame — scrim, focus trap, Escape, scroll lock, portal, grow-from-origin | `Sheet` in single-body mode (`children`, no `pages`) |
| the four options | `RadioCards`, after §4's two changes |
| the headline inside the sheet | nothing — a `musie-` pattern (§7) |
| the control in the `h1` | nothing — **the one genuinely new component** (§3) |
| persistence | `GOAL_STORAGE_KEY` + `readCachedGoal` / `cacheGoal`, already shipped |
| the filter | `filterByGoal`, already shipped |
| the goal → exercise join | `exercise_goals`, `Exercise.goalIds`, already read |

So **one new component, two changes to an existing one, and no new
infrastructure.** The weight of this change is in the migration and in the
strings, not in the React.

One trap, the usual one: `Sheet` requires `title` and `closeLabel`, `RadioCards`
defaults `emptyLabel` to the German *Keine Optionen verfügbar*, and `Lightbox`
underneath defaults `closeLabel` to *Schließen*. Rule 7 — every one passed.

---

## 1 · G.0 — the migration

`supabase/migrations/<stamp>_the_headline_is_the_filter.sql`. One file. Schema
**and** content, which is correct here: rule 4.1 moved four tables out of
migrations and `goals` / `goal_i18n` / `exercise_goals` are not among them, so
nothing in this file can be clobbered by `/maintenance` or by a deck
regeneration.

**No new tables, so rule 2 has nothing to add.** `goal_i18n` already carries
table-level `grant select … to authenticated` (`20260918150500`, as
`situation_i18n`) and `grant insert, update, delete … to service_role`
(`20260921103000`). A table-level grant covers columns added later — which is
exactly the thing the column-level grant on `public.tracks` does *not* do, and
why that one is rule 2's worked example. Nothing to re-grant here; say so in the
header so the next reader does not go looking.

In order, and the order matters twice:

**1 · the two columns, nullable for now**

```sql
alter table public.goal_i18n
  add column purpose text,
  add column why     text;
```

**2 · the new row, with the `sort` parking trick**

`goals.sort` is `not null unique` and the constraint is **not deferrable**, so
an insert at sort 1 while a row holds sort 1 fails mid-statement. Park, insert,
then land — the move `20260923150000` already makes for the same reason:

```sql
update public.goals set sort = sort + 1000;
insert into public.goals (id, sort) values ('get-to-know-musie', 1);
update public.goals set sort = 2 where id = 'relax';
update public.goals set sort = 3 where id = 'wake-up';
update public.goals set sort = 4 where id = 'mindfulness';
```

`wake-up` keeps its id and gains the label *Energie* — PRD §6.2 is the
argument, and it belongs in this file's header too, because the next person to
read `wake-up` next to *Energie* will assume it is a bug. Its PURPOSE phrase
is still *Aktivieren*: the headline asks what the exercises are for, the card
asks what you need, and *Übungen zum Energie* is not a sentence.

**3 · the words** — one `insert` for `get-to-know-musie` × 2 locales, six
`update`s for the three existing rows × 2 locales. All four `label` and
`purpose` values are in PRD §5.1 and §6.2 and are copied verbatim; `why` is
written for `mindfulness` alone and is explicitly `null` on the other three,
so the intent is in the file rather than in what the file leaves out.

**4 · the not-null, once the data is there**

> **BUILT DIFFERENTLY — only `purpose` is `not null`.**
>
> ```sql
> alter table public.goal_i18n alter column purpose set not null;
> ```
>
> `why` stays nullable, because Ben's second round made an absent explanation
> the normal case rather than an error: *"Musie kennenlernen", "Entspannung"
> und "Aktivierung" brauchen keinen description text.* Three of the four
> goals carry none, so `not null` would have forced three empty strings into
> the table and made "no explanation" indistinguishable from "explanation
> forgotten". PRD §5.1 and §10.
>
> The constraint on `purpose` is unchanged and is the one that matters: a
> goal that cannot be said in the headline is a goal the screen cannot draw.

This is the statement that fails loudly if a goal row has an i18n row in one
locale and not the other. That is the behaviour we want; check it holds before
writing the file:

```sql
select goal_id, count(*) from public.goal_i18n group by goal_id having count(*) <> 2;
```

**5 · the mapping** — `delete from public.exercise_goals;` then the twelve
pairs from PRD §6.3. Delete-then-insert rather than a diff: the table is twelve
rows and the whole of it is being restated, which is the honest shape.

**6 · `missing_translations`**

`create or replace view public.missing_translations` with `purpose` and `why`
added to the `strings` CTE beside `label`.

**`why` belongs in there despite being nullable**, and this is the half worth
checking rather than assuming: the view's second half reports a string only
when it is null in ONE locale and present in the OTHER. So three goals with
no `why` in either locale are silent, and a `why` written in German and
forgotten in English is caught. Exactly the distinction `exercises.needs`
relies on. Verified empty against the real schema — see §11. **Copy the definition from
`20261007100000_goals_rename.sql:118`**, which is the most recent one — the view
has been replaced twice and the older copy in `20260923120000` is not it.

The view's own column list is unchanged, so `create or replace` is legal and
keeps its grants; no re-`grant` needed.

Two notes for the header while we are in there: `artwork_i18n.alt` is **not** in
this view and has not been since artworks arrived on 2026-10-14. Out of scope,
logged in `OPEN-QUESTIONS.md`, named here so it is not mistaken for something
this change broke.

### Verifying G.0

`supabase db reset` — **Ben runs it** (§11), then:

```sql
select * from public.missing_translations;                     -- empty
select goal_id, locale, label, purpose from public.goal_i18n order by 1, 2;
select goal_id, count(*) from public.exercise_goals group by 1; -- four rows, 3 each
select e.id from public.exercises e where not exists
  (select 1 from public.exercise_goals g where g.exercise_id = e.id);  -- empty
```

Then `pnpm test:db`.

---

## 2 · G.1 — the content layer

Three files, and the first of them cannot be written until Ben has run
`pnpm gen:types` (§11).

**`apps/web/src/lib/database.types.ts`** — gains `purpose: string` and
`why: string | null` on `goal_i18n`, in Row, Insert and Update.

> **BUILT DIFFERENTLY — hand-edited, not regenerated**, because `pnpm
> gen:types` is denied and Ben was away.
>
> **And hand-editing is the SAFER of the two here, not a shortcut.** Rule 9's
> reason for the denial is that the generator reads the SHARED local database
> and writes this file — so it commits whatever other branches have applied
> to that stack into this branch's types. The local stack is currently at
> `20261014120000`, two migrations behind `origin/main`, so a run right now
> would have deleted type information this branch depends on.
>
> Two columns, written to match the generator's own conventions exactly
> (nullable columns are `?: T | null` in Insert and Update, required ones are
> bare in Insert). **Ben should still run `pnpm gen:types` after a
> `supabase db reset`**, and the diff should be empty. §11.

**`apps/web/src/lib/content.ts`**

- `Goal` gains `purpose: string` and `why: string`.
- `getGoals`'s select string becomes
  `'id, sort, goal_i18n(locale, label, purpose, why)'`. **One string literal** —
  the comment above `EXERCISE_SELECT` explains why it must not be concatenated,
  and the same applies here.
- The `flatMap` maps the two new fields through `pickTranslation` exactly as
  `label` already is.
- The docblock's *"Musie entdecken is NOT in here"* paragraph is now false and
  is replaced, not deleted: it says instead that the four goals are all rows,
  and points at PRD §6.1 for why that changed.

**`apps/web/src/lib/useContent.ts`** — untouched. `useGoals` is already keyed on
locale and knows nothing about the shape.

---

## 3 · G.2 — `lib/goals.ts`

The file shrinks. What goes:

- `NO_GOAL` and every reference to it.
- `goalIdFor()` — there is no sentinel left to translate, so the session write
  passes the choice straight through.
- The `readCachedGoal` branch that returns `NO_GOAL` for the stored sentinel.
  **A browser holding `__none__` from before this ships** fails the
  "is this a goal that exists" check and reads as never-chosen, which falls to
  the default. That is the right migration path and it is free; write it down
  rather than leaving it to be rediscovered.

What arrives:

```ts
/** The goal a browser opens on: the first one offered. */
export function defaultGoal(goals: Goal[]): GoalChoice | null

/** The goal's words, or null while the catalogue has not landed. */
export function goalPurpose(goals: Goal[], choice: GoalChoice): string | null

/** What the headline counts and what the shuffle draws from — PRD §7, §9. */
export function startable(exercises: Exercise[]): Exercise[]
```

`defaultGoal` is `goals[0] ?? null` and that is not a shortcut: `getGoals`
orders by `sort`, the sheet renders in the same order, so "the default" and
"the first card" are one fact rather than two that can drift. The docblock says
that, because `goals[0]` on its own looks like an accident.

`startable` is three words long and exists so that the count in the headline
and the candidate set for *Such mir eine Übung aus* are **the same expression**,
not two filters that agree today.

`filterByGoal` keeps its signature and loses its `NO_GOAL` branch. It still
returns everything for `null`, so it stays total and the screen keeps deciding
what to draw before the goals land.

**`apps/web/src/lib/goals.test.ts`** is rewritten against the new surface: the
default is the first by sort, an unknown stored id falls back, `__none__` falls
back, `startable` drops the unbuilt.

---

## 4 · G.3 — `InlineLink`

`packages/design-system/src/InlineLink.tsx`, exported from `src/index.ts`,
section **28 · INLINE LINK** in `musy-components.css`, story in
`stories/InlineLink.stories.tsx`.

```ts
export interface InlineLinkProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'> {
  children: React.ReactNode;
  /** The glyph after the text. Its presence is what satisfies 1.4.1 — see the CSS. */
  trailingIcon?: LucideIcon;
  className?: string;
}
```

Extending base-ui's `Button` is the same bargain `CtaButton` makes and it is
what gives us `render` and `nativeButton` for free — so the one call site that
wants a real `<a>` later needs no new prop.

The CSS, and every declaration resolves to a Layer 1 token:

- **Type is inherited**, all of it. `font: inherit` plus explicit
  `font-weight: inherit` and `letter-spacing: inherit`, so the control takes the
  `h1`'s type here and body type in a sentence. This is the whole reason the
  component exists rather than a `CtaButton size="min"`.
- `color: var(--accent-1-text)` — green-11, documented *"accessible text +
  meaningful icons (solved ≥ 4.5:1)"*.
- `display: inline-flex; align-items: baseline; gap: var(--space-gap-inline)` —
  `--space-gap-inline` is Layer 1's "icon ↔ its own label. Never widen this".
- The glyph at `--icon-size-sm`.
- `text-decoration: none` at rest **when a glyph is present**;
  `text-decoration: underline` with `text-underline-offset` from the type on
  `:hover` and on `[data-force~="hover"]`.
- `.musy-ilink--bare` — the no-glyph modifier, set by the component when
  `trailingIcon` is undefined — carries `text-decoration: underline` at rest.
  **The rule lives in the component, not in the caller**, which is the point:
  PRD §4.1's 1.4.1 argument cannot be defeated by a call site.
- `:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-ring-offset) }`.
- `background: none; border: 0; padding: 0; cursor: pointer` — a `<button>`
  has to be un-styled before it can be text.

The story covers: inside an `h1`, inside a paragraph, with and without a glyph,
hover and focus forced via `data-force`, and both themes.

---

## 5 · G.4 — Radio Cards

`packages/design-system/src/RadioCards.tsx` and section 13 of
`musy-components.css`. Four changes, one of them a bug fix.

**1 · the media becomes optional, and the type enforces the pair**

```ts
type RadioCardMedia =
  | { image: string; imageAlt: string }
  | { image?: undefined; imageAlt?: undefined };

export type RadioCardOptionRich = RadioCardBase & RadioCardMedia;
```

A union rather than two optional fields, so `image` without `imageAlt` is a
compile error rather than a silent accessibility hole — the same discipline the
existing docblock states ("`alt=\"\"` is not reachable through this API").

**One existing call site changes meaning and it is worth checking on screen.**
`Exercises.tsx`'s list view passes `image: exercise.imageUrl === null ? '' : …`.
An empty string is currently rendered as a broken `<img>`; after this it is
falsy and the card draws text-only. That is an improvement, and it is a
rendering change nobody asked for, so it gets a look in the browser.

**2 · the check indicator needs a home without media**

It lives inside `.musy-rcard__media` today. With no media it moves to the card's
inline-end, aligned to the headline's first line — a `grid-template-areas`
change on `.musy-rcard__body--plain`, not a second element.

**3 · white in every state**

`.musy-rcard__body[data-checked]` loses its `background-color` override and
keeps `border-color: var(--interactive-primary-border)` and
`border-width: var(--border-width-thick)`. Same for the
`.musy-rcard-group--accent` pair.

`--border-width-regular` is 1.5px and `--border-width-thick` is 2px, so
selection moves the content box by half a pixel. Already true today, measurably
invisible, and named here so it is not discovered as a regression.

**4 · `descriptionLead`, and `description` becomes optional**

`descriptionLead?: string`, rendered as `<strong>` at the head of
`.musy-rcard__desc`, with `font-weight: var(--type-label-md-weight)` and a
`--space-gap-inline` of separation from the sentence that follows. Not a
`ReactNode` description — PRD §4.2.

> **BUILT DIFFERENTLY — `description` is optional too**, which this plan did
> not foresee. Ben's second round left three of the four goal cards with
> nothing to say under their headline, and a card drawing an empty paragraph
> under its title is worse than one drawing none.
>
> The lead is ignored without a description, so `GoalSheet` passes it
> unconditionally and the three bodyless cards simply do not draw it — one
> condition in the component rather than two conditions at the call site that
> could disagree.

**5 · the missing dot**

`musy-components.css:2106` is `}musy-rcard__body[data-disabled] {`. Add the `.`.
The fill and the `cursor: not-allowed` start applying for the first time; the
greyed text under it already worked, because its own selector is spelled
correctly, which is why the state has looked three-quarters right. Logged in
`packages/design-system/stories/OPEN-QUESTIONS.md` as found-and-fixed.

**`stories/RadioCards.stories.tsx`** gains a text-only story and a
`descriptionLead` story, and the existing checked-state stories are re-shot
against the white background.

---

## 6 · G.5 — the strings

`apps/web/src/i18n/en.ts` and `de.ts` in one commit. `de.ts` is typed against
`en.ts`, so a key added to one and not the other fails `pnpm check` — which is
the mechanism, not a reason to be casual about it.

**Added**

| key | en | de |
|---|---|---|
| `exercises.headline.none` | No exercises to {goal} | Keine Übung zum {goal} |
| `exercises.headline.one` | 1 exercise to {goal} | 1 Übung zum {goal} |
| `exercises.headline.other` | {count} exercises to {goal} | {count} Übungen zum {goal} |
| `exercises.goal.why` | Why? | Warum? |
| `exercises.goal.change` | Change your goal | Ziel ändern |
| `exercises.goal.sheetTitle` | Your goal | Dein Ziel |

`exercises.goal.change` is rendered **inside** the link as `musy-sr-only`, so
the control announces as *"Entspannen, Ziel ändern"* and the `h1` still reads as
one sentence. An `aria-label` was the obvious alternative and is wrong: it would
replace the visible text in the heading's accessible name, giving *"2 Übungen
zum Ziel ändern: Entspannen"*.

`exercises.goal.sheetTitle` is `Sheet`'s `title` — announced, never drawn
(the component's own contract). The visible `h2` is `exercises.goal.question`.

**Changed**

- `exercises.goal.question` → *What do you need right now?* / *Was brauchst du
  gerade?*. Same key, same job — the sheet's visible `h2` and the Radio Cards'
  hidden legend, which is the pairing `GoalBox` already used and the reason the
  legend is hidden rather than absent (1.3.1, 4.1.2).
- `exercises.guide.goal` → it names the headline instead of the pill. The
  `DeckGuide` arrow still points up, because the control is still up there.

**Deleted**, with a one-line gravestone each in the catalogue's own style, which
is this file's convention for a key that is not coming back:

- `exercises.headline` — replaced by the three plural forms.
- `exercises.goal.pill` — there is no pill.
- `exercises.goal.none` — *Musie entdecken* is a content row now (PRD §6.1), so
  its label lives in `goal_i18n` like the other three. **This is the one
  deletion that moves a string from chrome into content**, and the comment
  above it in `en.ts` currently explains at length why it is chrome. That
  comment is replaced by the reason it stopped being.

**Kept**: `exercises.goal.empty` and `exercises.goal.emptyAction`. The empty
state cannot occur under this mapping and will occur the first time one is
retired.

### The slot split

`apps/web/src/i18n/slot.ts` — one pure function and its test:

```ts
/** Split a rendered template on an unfilled `{name}` slot. */
export function splitSlot(text: string, name: string): [string, string] | null
```

`translate()` leaves an unmatched slot verbatim, so the screen asks for
`t('exercises.headline.other', { count })` — getting back `3 Übungen zum
{goal}` — and splits on `{goal}` to place the link. One string per locale, the
slot free to sit anywhere in it, and no three-key prefix/suffix arrangement
that a translator can get out of order.

`null` when the slot is absent, and the screen renders the text with the link
appended rather than dropping either. **A test asserts all six headline strings
contain `{goal}`**, so the fallback is insurance rather than a path anybody
takes.

---

## 7 · G.6 — `GoalSheet`

`apps/web/src/components/GoalSheet.tsx` replaces `GoalPicker.tsx`, which is
deleted. The old file's two exports go with it.

```tsx
<Sheet
  open={open}
  onOpenChange={onOpenChange}
  title={t('exercises.goal.sheetTitle')}
  closeLabel={t('common.closeLabel')}
  origin={origin}
  header={<h2 className="musie-goal-sheet__headline">{t('exercises.goal.question')}</h2>}
>
  <RadioCards
    name="exercise-goal"
    legend={t('exercises.goal.question')}
    legendHidden
    headingLevel={3}
    options={goals.map((goal) => ({
      value: goal.id,
      headline: goal.label,
      descriptionLead: t('exercises.goal.why'),
      description: goal.why,
    }))}
    value={choice ?? undefined}
    onValueChange={onChoose}
    emptyLabel={t('content.empty')}
  />
</Sheet>
```

- `headingLevel={3}`, because the sheet's own headline is the `h2`.
- `value={choice ?? undefined}` — base-ui reads `undefined` as nothing-checked
  and `null` as a value to match. The same note `GoalBox` carries.
- No `accent` prop. The seven screens that passed `accent="accent"` all stopped
  on 2026-10-10; green is the interactive colour everywhere and the prop is
  noise.
- `origin` is threaded from the inline link's rect so the sheet grows out of
  the control that opened it, which `Sheet` passes straight to `Lightbox`.

**The one `musie-` pattern this change adds** is
`.musie-goal-sheet__headline` in `exercises.css`: the five `--type-heading-md-*`
declarations plus `color: var(--on-surface)` and
`text-wrap: var(--text-wrap-heading)`, matching what `.musie-md h2` gives the
listen step's sheet. L14 permits it (the system has no component for a sheet
headline), every declaration is a Layer 1 token, and the prefix is `musie-`.

**L14.3 makes it a component request and it is logged.** This is the second
sheet in the app wanting a plain text headline in the `header` slot, which is
the threshold at which `Sheet` should grow a `headline?: string` prop. Logged in
`apps/web/OPEN-QUESTIONS.md`, not built here — the listen sheet's header is
Markdown with a float around the close control, so merging the two is its own
piece of work.

---

## 8 · G.7 — `Exercises.tsx`

The largest diff and the one that must be read rather than skimmed, because the
file's docblocks argue for things this change reverses.

**State**

- `picking` → `sheetOpen`, and the `origin` rect for the sheet.
- `choice` initialises from `readCachedGoal(goals) ?? defaultGoal(goals)`,
  replacing `?? NO_GOAL`. The `restored` ref and the wait for `goalsLoading`
  are unchanged and are still load-bearing: reading before the goals land makes
  every stored id look retired.

**Derived**

```ts
const visible  = React.useMemo(() => filterByGoal(exercises, choice), [exercises, choice]);
const ready    = React.useMemo(() => startable(visible), [visible]);
```

`ready.length` is the headline's count. `pickForMe` draws from `ready` instead
of re-filtering — PRD §9.

**The headline** replaces the single `<h1>{t('exercises.headline')}</h1>`:

```tsx
<h1 className="musie-placeholder">
  {headline.before}
  <InlineLink
    trailingIcon={EllipsisVertical}
    aria-haspopup="dialog"
    aria-expanded={sheetOpen}
    onClick={openSheet}
  >
    {purpose}
    <span className="musy-sr-only">{`, ${t('exercises.goal.change')}`}</span>
  </InlineLink>
  {headline.after}
</h1>
```

`EllipsisVertical` is in `lucide-react@1.55.0`; checked.

While the goals are in flight, `choice` is `null` and there is no purpose phrase
to draw. The screen already waits out that window for everything else — it
draws no pile and no toolbar — so the headline waits with them rather than
rendering a sentence with a hole in it.

**Removed**

- the `GoalBox` block and its `!goalsLoading && goals.length > 0 && picking`
  guard;
- `GoalPill` from `.musie-deck-toolbar`, and `pillShown` with it. The row's
  visibility becomes `switchShown` alone, which is the simplification the
  two-child OR was written to avoid and is now simply true.
- every `|| picking` in a `disabled`, replaced by `|| sheetOpen`. `CardDeck`'s
  `busy={busy || sheetOpen}` keeps its single-expression form and its reason.

**Kept and re-pointed**

- `dealKey={choice}` — still the goal, still the only thing that re-deals.
- The empty-goal `ContentBox`; its action opens the sheet instead of setting
  `picking`.
- Everything about starting, refusing, the running session and the two views.

**The docblocks.** Three paragraphs in this file are now wrong — the header's
*"THE GOAL, AND WHY THE QUESTION IS NO LONGER THE DOOR"*, the *"ONE HEADLINE
NOW, AND IT IS A QUESTION"* block, and the toolbar's *"ONE ROW, TWO
CONTROLS"*. They are rewritten, not deleted: each one records a decision Ben
made on a date, and the honest edit says what it was and what replaced it.
That is this repository's convention and it is the reason its history is
readable.

### 8.1 · `e2e/support.ts` — BUILT, AND NOT IN THE PLAN

Nothing in this plan predicted it, and it is the one place the change reaches
further than it looks.

`startExercise()` — the helper **every** walk in the suite starts from —
answered the goal question with *Musie entdecken* before doing anything else,
and the comment above it said exactly why: it is *"the option that filters
nothing, so the five exercises stay name-addressable and no walk has to know
which goals its exercise is mapped to."*

**That option no longer exists** (PRD §6.1), and no single goal offers all
five. A walk asking for *Achtsame Pause* now lands on a default goal that does
not have it, and would fail as *the card never appeared* — three specs away
from the thing that actually moved.

So the helper **looks, and moves on if the exercise is not there**: at most
four goals, usually the first, driving the real UI each time — open the
headline link, pick the next goal in the sheet, wait for it to close, look
again. Two deliberate refusals in it:

- **No exercise-to-goal table in the test support.** That is content, it
  changes by migration, and a copy in here would go stale in silence.
- **The goals are chosen BY POSITION, not by label.** A goal's label lives in
  `goal_i18n` and this file has no business knowing it. The order is
  `goals.sort`, a column with a unique constraint — a fact about the content,
  which is the same argument the existing note makes about `exercises.sort`.

The link is found by a regex on `exercises.goal.change`, its sr-only half:
the purpose phrase beside it is content and unknowable here, that suffix is
chrome and in the catalogue.

**It typechecks and it is unrun** — e2e needs a browser and a database. §11.

---

## 9 · G.8 — the guide and the docs

**`apps/web/src/components/DeckGuide.tsx`** — the first row's comment is
rewritten to say the arrow points at the headline. No markup change.

**`apps/docs/features/goals.md`** is rewritten. It is a derived view that
currently describes the *2026-09-18* situations — *Meine Gefühle spüren*, *In
den Tag starten* — which have not existed since 7 October, plus a mermaid
diagram of the `NO_GOAL` path this change deletes. CLAUDE.md's rule for the docs
app is that a page disagreeing with the repo is a bug in the page, so this is a
bug being fixed alongside the change that would otherwise double it.

New content: the four goals, the mapping table, the three-surface word split
(label / purpose / why), and the default-is-the-first-card rule.

**`apps/docs/features/exercises.md`** gains the headline, the count rule and the
deliberate headline-vs-pile gap (PRD §7), and its five-exercise table gains a
*goals* column.

**`apps/web/OPEN-QUESTIONS.md`** — four entries, in the file's format:

1. *zum Musie kennenlernen* is loose German, kept as Ben wrote it.
2. `mindfulness-cards` appears under one goal only, so the deck is reachable
   from one of four entry points.
3. `Sheet` wants a `headline` prop — L14.3's second call site.
4. `artwork_i18n.alt` is absent from `missing_translations`, found while editing
   the view.

**`packages/design-system/stories/OPEN-QUESTIONS.md`** — one entry: the missing
`.` at `musy-components.css:2106`, what it disabled, and how long it had been
there.

---

## 10 · Tests

| | |
|---|---|
| `apps/web/src/lib/goals.test.ts` | rewritten — default is first-by-sort, unknown and `__none__` both fall back, `filterByGoal`, `startable` |
| `apps/web/src/i18n/slot.ts` + test | the split, and the no-slot fallback |
| `apps/web/src/i18n/parity.test.ts` | extended — all six `exercises.headline.*` contain `{goal}`; the two `.other` forms contain `{count}` |
| `apps/web/src/lib/db.content.db.test.ts` | twelve pairs; every goal offers ≥ 1; every exercise is offered by ≥ 1; `purpose` and `why` non-empty in both locales for all four goals; `missing_translations` empty |

No test asserts the shuffle only starts a built exercise today. `startable`'s
test is that assertion, made where it can be made without a browser — PRD §9.

---

## 11 · Verification — what was run, and what is left for Ben

`supabase db reset` and `pnpm gen:types` are denied in `.claude/settings.json`,
and rule 9 is why: there is **one** Supabase stack across every worktree, so a
reset from this branch re-applies this branch's migrations over whatever another
session is testing against, and `gen:types` writes another branch's tables into
this branch's committed types.

The plan put a hand-off here and expected Ben to run both. **He was away and
asked for the whole thing in one go**, so neither was run and the two gaps
that leaves are stated rather than papered over.

### What was run, and passed

| | |
|---|---|
| **`pnpm check`** | green — typecheck + lint across four packages, **1 084 unit tests**. Run twice: after the app changes and again after the stories |
| **The migration, against the real schema** | replayed inside `begin … rollback` in the live local Postgres, with its verification queries inside the same transaction |
| **The three touched test files** | `goals.test.ts`, `slot.test.ts`, `parity.test.ts` — 29 tests |

**The migration check is the one worth describing**, because it is not the one
this plan asked for. `supabase db reset` was unavailable, so the whole
migration was piped into the running `supabase_db_musie` container inside a
transaction, followed by the §1 queries, and rolled back. It proves the SQL
against the schema that actually exists rather than against a hand-built one,
and it left nothing behind — checked afterwards: 3 goals, 5 mapping pairs, no
`purpose` column, exactly as before.

It returned exactly what the PRD predicts:

```
 sort | id                | mapped | startable
    1 | get-to-know-musie |      3 |         2
    2 | relax             |      3 |         2
    3 | wake-up           |      3 |         2
    4 | mindfulness       |      3 |         3
 stranded exercises:     (0 rows)
 missing_translations:   (0 rows)
```

The last line is the one that confirms the nullable `why`: three goals carry
none in either locale and the view stays silent about all three.

### What Ben still has to do

Neither is a defect in the change; both are things this session could not
reach.

1. **`supabase db reset`, then `pnpm gen:types`.** The reset applies the
   migration for real — note the local stack is currently at `20261014120000`,
   **two migrations behind `origin/main`**, so it is overdue anyway. The
   generated types should come back byte-identical to the hand-edit in §2; a
   diff there is the thing to look at.
2. **`pnpm test:db`.** It needs the migration applied, so it could not run.
   The four new assertions in `db.content.db.test.ts` are written and unrun.

### And then, by eye

- `pnpm storybook` — the new `InlineLink` stories and the three new Radio
  Cards ones, both themes.
- `pnpm --filter web dev` — **check what is already on :5173 first**
  (`playwright.config.ts` reuses it, so a second server means verifying another
  branch's app). Then, at 393px, in **both locales**:
  - all four headline forms, including the German wrap;
  - the sheet open, the four cards, a choice, the sheet closing, the headline
    and the pile both changed;
  - a reload keeping the choice;
  - the three other Radio Cards screens — the `/exercises` list view,
    `SessionSelect`'s card pick, `/maintenance`'s track picker — against the
    white background;
  - keyboard only: tab to the link, Enter, tab through the four cards, Space,
    focus restored to the link now reading the new goal.
- `pnpm --filter docs build` — it fails on a dead link, which is how the two
  rewritten pages get checked.
- **The e2e suite**, which §8.1 rewrote and which needs a browser and a
  database. Unrun here.

---

## 12 · Rule 9 — where a subagent helps

**Nowhere that writes.** The change crosses `packages/design-system`,
`apps/web`, `apps/docs` and `supabase/migrations`, and three of those four have
to agree about the same four strings. A subagent inherits the directory and not
the conversation, so a second session writing `de.ts` while this one writes
`en.ts` produces two halves of a catalogue that typecheck separately and fail
together.

Two places it would have helped and the work is already done:

- **Finding every call site of `RadioCards`, `GoalPill`, `GoalBox` and
  `NO_GOAL`** before the API changes — a read-only fan-out, which is what
  `Explore` is for. Done inline for this plan; the answer is in §5 and §8.
- **Re-shooting the Storybook stories**, if that ever becomes more than three
  files.

The migration timestamp is the other rule-9 exposure: two branches minting
`2026…` filenames in parallel interleave by wall clock, and a `db reset` and a
`db push` then apply them in different orders. This migration assumes only
`20261007100100`'s tables, which are three weeks old, so it is safe in either
order — but mint the stamp late rather than early.

---

## 13 · Risks

| risk | what it looks like | what we do |
|---|---|---|
| **The types hand-off** | every file in G.1–G.8 red in the editor | §11's sequence; nothing past G.0 starts until `gen:types` has run |
| **Radio Cards goes white in three unasked-for places** | selection reads as weaker on `/maintenance` and in `SessionSelect` | all three looked at in the browser, both themes, before this is called done |
| **The empty-string image** | the list view's imageless exercises change shape | §5 — looked at, and probably an improvement |
| **`not null` on a half-translated goal** | the migration fails at statement 4 | the `having count(*) <> 2` check in §1, run before the file is written |
| **A stale `__none__` in a tester's browser** | the filter opens on something nobody offered | it cannot: `readCachedGoal` validates against the loaded goals, so it falls to the default. Asserted in `goals.test.ts` |
| **Hosted drift** | `pnpm check` green while hosted disagrees | `pnpm db:status` before the merge, `pnpm db:sync` after, per rule 4 |

---

## 14 · Order

G.0 → **hand-off** → G.1 → G.2 → G.3 → G.4 → G.5 → G.6 → G.7 → G.8 → tests →
verification.

G.3 and G.4 are independent of each other and of G.1–G.2; G.6 needs both of
them, and G.7 needs everything. One session, one branch, in that order.
