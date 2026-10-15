# The headline is the filter · PRD

Written 2026-10-15 from Ben's brief, after user testing, and revised the same
day with his second round: **the German *Aktivierung* becomes *Energie*, and
three of the four goals carry no explanation at all.** The engineering plan is
`GOAL-FILTER-PLAN.md` beside it, and both were written before the code —
**built on the branch `goal-context-in-the-headline`.**

The brief, verbatim where it matters:

> *Menschen tun sich beim Einstieg in Achtsamkeitsübungen schwer: „warum sollte
> ich das machen?", „was soll das bringen", „wozu das Ganze" — und haben
> Schwierigkeiten, aus dem daily structured hustle in den musiktherapeutischen
> Space zu kommen. Der Filterbutton ist funktional das Richtige, aber User
> brauchen beim Auswählen des richtigen Ziels mehr Kontext. Deshalb holen wir
> sie besser ab und geben ihnen besseren Kontext.*

Four decisions were put to Ben before this was written, and all four are
settled in here: the sheet is a plain stack of four cards (§5), the count
counts what the pile holds (§7 — this one was reversed on sight), Radio Cards
goes white everywhere
(§4.2), and *Musie kennenlernen* becomes a real goal with no show-everything
escape hatch (§6.1).

---

## 1 · The problem, and why the filter is the place to fix it

The filter works. Nobody fails to find it, nobody mis-taps it, and the three
states it drives are correct. What it does not do is **answer the question the
person arrived with**, which is not *which exercise* but *why any of this*.

Two failures, and they are one failure:

- **The headline asks instead of telling.** *Welche Übung starten wir?* is a
  question put to somebody who does not yet know what the answers are for. It
  was the right call on 2026-10-08, when it replaced three count-managing
  headline states with one sentence true in all of them — but a true sentence
  that carries no information spends the largest type on the screen saying
  nothing.
- **The goal is named and never explained.** The pill reads *Ziel: Entspannen*
  and the box behind it offers four one-line radio labels. A label is enough to
  pick between options you already understand. It is not enough to make
  somebody who is mid-hustle believe that twelve minutes of Klangreise is worth
  the twelve minutes.

So the fix is not a new screen or an onboarding flow. **It is to put the
context where the decision already happens**, and to make the one line that is
currently decorative into the one line that does the work.

## 2 · What ships

| | |
|---|---|
| **A headline that counts and names** | *3 Übungen zum Entspannen*, where the goal is a link. §3 |
| **`InlineLink`** | a new Layer 2 component. Link-coloured text with a trailing glyph, usable inside a heading or a sentence. §4.1 |
| **A goal sheet** | *Was brauchst du gerade?* and four Radio Cards, one of them carrying two sentences of *Warum?*. §5 |
| **Radio Cards, two changes** | a text-only variant with no image, and a white background in every state. §4.2 |
| **Four goals, re-worded and re-mapped** | one new row, three re-labelled, twelve mapping pairs rewritten. §6 |
| **Three things removed** | the goal pill, the goal box, and the `NO_GOAL` sentinel. §8 |

Nothing about the deck, the list view, the card face, the running-session
notice or the start path changes. *Such mir eine Übung aus* already respects
the filter (§9).

## 3 · The headline

### 3.1 What it says

One sentence, four forms, the goal a link:

| goal | German | English |
|---|---|---|
| get-to-know-musie | **Drei Übungen** zum *Musie kennenlernen* | **Three exercises** to *get to know Musie* |
| relax | **Drei Übungen** zum *Entspannen* | **Three exercises** to *relax* |
| wake-up | **Drei Übungen** zum *Aktivieren* | **Three exercises** to *get going* |
| mindfulness | **Drei Übungen** zum *Achtsamer werden* | **Three exercises** to *grow more mindful* |

**The number is a word**, through twelve and digits above it — Ben,
2026-10-15. `i18n/numbers.ts` holds the table and says why it is not in the
message catalogue. `none` and `one` carry their own numerals, because both
inflect the noun as well: *Keine Übung*, *Eine Übung*.

It stays the page's `h1`, at `--type-heading-lg-*`, in the same position. The
italics above are this table's; on screen the goal is distinguished by colour
and a glyph, not by slant.

**The German is Ben's, kept verbatim.** *zum Musie kennenlernen* is loose —
Duden would want *zum Musie-Kennenlernen* or *um Musie kennenzulernen* — and it
is the phrasing he wrote, in the copy register the product already speaks.
Flagged in `apps/web/OPEN-QUESTIONS.md`, not silently corrected.

### 3.2 It is one string per locale, with the link in the middle

The word order differs between the two languages and will differ again in a
third, so the headline must not be assembled from fragments in the component.
It is **one template per locale carrying two slots** — `{count}` and `{goal}` —
and the screen splits the rendered string on the `{goal}` slot to place the
link. `translate()` already leaves an unfilled slot verbatim, which is what
makes the split safe rather than clever.

Three plural forms, because a count can be 0, 1 or many, and German and English
share the one/other rule (`apps/web/src/i18n/index.ts` says so and says why
there is no ICU library):

```
exercises.headline.none    Keine Übung zum {goal}         No exercises to {goal}
exercises.headline.one     1 Übung zum {goal}             1 exercise to {goal}
exercises.headline.other   {count} Übungen zum {goal}     {count} exercises to {goal}
```

`none` is not hypothetical insurance. It is what the headline says if an
exercise is retired or unmapped, and it is the honest companion to the
empty-goal notice the screen already draws.

## 4 · The two component changes

### 4.1 `InlineLink` — new, Layer 2

A link rendered inside running text or a heading, so it must **inherit the type
it sits in**: font family, size, weight and line height all come from the
parent. It sets only colour, the glyph and the states.

| | |
|---|---|
| colour | `--accent-1-text` (green-11, *"accessible text + meaningful icons, solved ≥4.5:1"*) |
| trailing glyph | optional, `--icon-size-sm`, aligned to the text baseline |
| hover | underline, and `--accent-1-text` holds |
| focus | the system focus ring, `--focus-ring` |
| element | `<button type="button">` by default; a `render` prop takes an `<a>` for real navigation |

**It is a button here, not a link.** The control opens a sheet; it does not
navigate. The component is named for how it *looks*, which is the honest name
for a design-system entry, and the semantics follow the call site. When it
opens the sheet it carries `aria-haspopup="dialog"` and `aria-expanded`.

**One rule the component enforces, and it is an accessibility rule.** WCAG 1.4.1
forbids distinguishing a link inside a block of text by colour alone. The
trailing glyph is the non-colour cue, so: **a link with a glyph underlines on
hover; a link with no glyph underlines at rest.** That is a modifier class, not
a prop the caller can get wrong.

Target size: the heading renders at `--type-heading-lg-size`, so the link is
comfortably past 24px tall. 2.5.8's inline exception would cover it anyway — it
is a target in a block of text — and this is noted so nobody re-derives it.

### 4.2 Radio Cards — two changes, both in the component

**A text-only variant.** `image` and `imageAlt` become optional. With no image
the media column is dropped and the card is a headline, a description and the
check indicator. The indicator currently lives inside `.musy-rcard__media`, so
it needs a home: it moves to the card's inline-end, aligned to the headline's
first line.

**White in every state — everywhere, not behind a prop.** Today a selected card
fills with `--interactive-primary-subtle` (green-3). After this it keeps
`--surface-raised` whatever its state, and selection is carried by the thick
green border and the filled check mark that are already there.

That changes three screens nobody asked to change: the `/exercises` list view,
the digital card pick in `SessionSelect`, and the track and artwork pickers in
`/maintenance`. **Ben took it on those terms** — one component, one look, no
variant to keep in step. The selected state stays identifiable without colour
(border weight plus the check glyph), so 1.4.1 holds.

**A bold lead-in for the description.** The *Warum?* is one word in bold before
the two sentences. It is a new prop, `descriptionLead?: string`, rendered as a
`<strong>` at the head of the description paragraph — not a widening of
`description` to `ReactNode`, which would let arbitrary markup into the
accessible name of a radio control. It is ignored where there is no
description, so the screen passes it unconditionally and the three bodyless
cards simply do not draw it.

**And `description` itself becomes optional**, which is the other half of
§5.1's cut: three of the four goals have nothing to say under their headline,
and a card with an empty paragraph under its title is worse than a card
without one.

**And one bug fixed on the way past.** `musy-components.css:2106` reads
`}musy-rcard__body[data-disabled] {` — the leading `.` is missing, so the
disabled card's fill and its `cursor: not-allowed` have never applied. The
greyed text below it is a separate, correctly-spelled rule, which is why the
state looks half-right rather than broken. Fixed here because this change is
rewriting the block it sits in.

## 5 · The sheet

Pressing the goal in the headline pulls up the design system's `Sheet`, in
single-body mode — no pages, no dots, no chevrons.

```
┌──────────────────────────────────┐
│  Was brauchst du gerade?      ✕  │   h2, --type-heading-md-*
│                                  │
│  ┌────────────────────────────┐  │
│  │ Einen Weg Musie           ✓│  │   white, thick green border
│  │ kennenzulernen             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Entspannung                │  │   white, thin border
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Energie                    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Achtsamkeit                │  │
│  │ Warum? Achtsamkeit wächst  │  │
│  │ mit jeder Übung und…       │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

- **The headline** is `--type-heading-md-*`, which is what the listen step's
  sheet already uses for its question (`.musie-md h2`). It is a real `<h2>`.
- **Four cards, stacked**, in `sort` order. No carousel and no paging: the
  whole point is that the four can be compared, and a gesture that shows one at
  a time undoes that.
- **Choosing closes the sheet.** One tap, like every other choice on this
  screen. The filter applies behind the closing sheet and the headline is
  already re-written when it is gone.
- **The spacing is the tokens'.** `--space-inset-sheet` inside the sheet,
  `--space-gap-group` between the headline and the group, and the Radio Cards
  group's own gap between cards. The screen declares no number of its own.

### 5.1 The four cards

The card headline answers the sheet's question, so it is a noun phrase that
fits after *Ich brauche …* — which is why it is worded differently from the
headline's purpose phrase. Both are content; both live on the goal row (§10).

**Three of the four carry no explanation at all** — Ben, 2026-10-15:
*"Musie kennenlernen", "Entspannung" und "Aktivierung" brauchen keinen
description text.* That is the right cut and it is worth saying why, because
the first draft of this document argued for four:

*Entspannung* and *Energie* name a state the reader already knows they want.
Explaining them is explaining the obvious, and a card that does it reads as
a product that thinks you need convincing about relaxation. **Achtsamkeit is
the one that is actually abstract**, and it is the one the testing heard *was
soll das bringen?* about. So the explanation goes where the question was
asked, and nowhere else — which also makes it land, because it is the only
body text in the sheet.

The consequence in the schema is that `goal_i18n.why` is **nullable**, and
null is data rather than a missing translation (§10).

| | card headline | body |
|---|---|---|
| `get-to-know-musie` | Einen Weg Musie kennenzulernen · *A way into Musie* | — |
| `relax` | Entspannung · *Relaxation* | — |
| `wake-up` | **Energie** · *Energy* | — |
| `mindfulness` | Achtsamkeit · *Mindfulness* | below |

**Achtsamkeit** · *Mindfulness*

> **Warum?** Achtsamkeit wächst mit jeder Übung und braucht Wiederholung mehr
> als Vorsätze. Musik gibt deiner Aufmerksamkeit etwas, woran sie sich halten
> kann, wenn die Gedanken abdriften.

> **Why?** Mindfulness grows with every practice, and repetition does more for
> it than resolutions. Music gives your attention something to hold on to when
> your thoughts drift.

Written to `docs/GERMAN-UI-WRITING.md`: du, sentence case. No em-dashes and no
*nicht X, sondern Y* — the patterns Ben asked to keep out.

***Energie*, not *Aktivierung*** — Ben, 2026-10-15. The card answers *Was
brauchst du gerade?*, and *Aktivierung* is what a clinician needs rather than
what a person needs. **The purpose phrase stays *Aktivieren***, because the
headline asks a different question — what the exercises are FOR, not what you
need — and *Übungen zum Energie* is not a sentence. One goal, two words, and
the split between them is the reason `label` and `purpose` are separate
columns.

**One English word is still a judgement call and is flagged rather than
hidden:** *get going* for `wake-up`'s purpose phrase, because *wake up* is
narrower than the German. One line to change if Ben disagrees.

### 5.2 Default and persistence

**Einen Weg Musie kennenzulernen** is selected by default, and whatever is
chosen survives the browser being closed.

The persistence already exists: `musie-goal` in `localStorage`, read back
through `readCachedGoal()`, validated against the goals that actually loaded so
a retired goal cannot leave a browser filtering by something nobody offers.
Nothing about that changes.

What changes is the default. **It is the first goal in `sort` order, not a
hardcoded id.** The sheet shows the four in `sort` order and the first card is
the default, so the two cannot drift; adding or reordering a goal is then a
migration rather than a migration plus a constant in `lib/goals.ts`.

## 6 · The four goals

### 6.1 *Musie kennenlernen* becomes a real goal

Today it is the **absence** of a goal: four options on screen, three rows in the
table, and `NO_GOAL` writing `null` to `sessions.goal_id`. The argument for that
is written into `20261007100100_goals_seed.sql` and it is a good one — a row
mapped to *every* exercise falls out of step the first time somebody adds an
exercise and forgets to map it.

**The new mapping ends it.** *Musie kennenlernen* now offers three named
exercises, not everything, so it is a goal like the other three and must be a
row like the other three.

Three consequences, and the second is the one worth keeping:

- **There is no longer a show-everything option.** All five exercises stay
  reachable, because the four goals between them cover all five (§6.3).
- **`sessions.goal_id` is never null again.** Every run from `/exercises`
  records which of the four it came from, which is strictly better diary data
  than today, where the commonest answer records nothing.
- **`NO_GOAL`, `goalIdFor()` and the three-state `null`/`NO_GOAL`/id model go.**
  `null` keeps its one remaining job: *the goals have not landed yet*.

### 6.2 The words and the ids

| id | label (card headline) | purpose (after *zum* / *to*) | changed |
|---|---|---|---|
| `get-to-know-musie` | Einen Weg Musie kennenzulernen · A way into Musie | Musie kennenlernen · get to know Musie | **new row** |
| `relax` | Entspannung · Relaxation | Entspannen · relax | re-labelled |
| `wake-up` | **Energie** · Energy | Aktivieren · get going | re-labelled |
| `mindfulness` | Achtsamkeit · Mindfulness | Achtsamer werden · grow more mindful | re-labelled |

**The ids do not move, and `wake-up` is the awkward one.** Its label is now
*Energie*, which is broader than waking up, so the slug reads stale. It
stays anyway: the id is referenced by `exercise_goals` and by
`sessions.goal_id`, and renaming it means either a cascade through two tables or
nulling the goal on diary rows that already carry it. A slug nobody sees is a
cheaper thing to live with than a rewritten history. The same reasoning
`20260923150000` applied to `body-scan-soundwalk`, which has read *Bodyscan* on
screen since September.

`sort` is `1, 2, 3, 4` in the order above — which is the order of the cards in
the sheet, and therefore also which goal is the default (§5.2).

### 6.3 The mapping

Ben's, verbatim, in his order:

| goal | exercises |
|---|---|
| **Musie kennenlernen** | Achtsam Atmen · Bodyscan · Freie Bahn |
| **Entspannen** | Klangreise · Bodyscan · Achtsam Atmen |
| **Aktivieren** | Klangreise · Achtsam Atmen · Freie Bahn |
| **Achtsamer werden** | Achtsame Pause · Freie Bahn · Klangreise |

Twelve pairs, replacing the five that map everything to `mindfulness`. As ids:

```
get-to-know-musie  breathing-score, body-scan-soundwalk, free-rein
relax              sound-journey,   body-scan-soundwalk, breathing-score
wake-up            sound-journey,   breathing-score,     free-rein
mindfulness        mindfulness-cards, free-rein,         sound-journey
```

**Every exercise is reachable and every goal offers three.** Worth stating
plainly, because it is what replaces the show-everything option, and because
one row is load-bearing: **`mindfulness-cards` — Achtsame Pause, the flagship
card exercise — appears under one goal only.** That is Ben's mapping and it is
kept, but it means somebody who never picks *Achtsamer werden* never meets the
deck. Flagged in `OPEN-QUESTIONS.md`.

The mapping is content and travels by migration. Rule 4.1's four tables do not
include `goals`, `goal_i18n` or `exercise_goals`, so nothing here collides with
`/maintenance` and nothing here can be clobbered by a deck regeneration.

## 7 · What the count counts

**The pile.** Every exercise the goal maps to, built or not — so the number in
the headline is always the number of cards under it. Three for each of the
four goals today.

### 7.1 It counted the startable ones for half a day, and that was wrong

This section argued the opposite when it was written, and the reversal is
worth keeping rather than overwriting, because the argument was sound and the
result was still a bug.

`breathing-score` is `implemented = false` and sits in three of the four
goals, so counting only what could be STARTED gave:

| goal | mapped | startable |
|---|---|---|
| Musie kennenlernen | 3 | 2 |
| Entspannen | 3 | 2 |
| Aktivieren | 3 | 2 |
| Achtsamer werden | 3 | 3 |

The reasoning was that the headline should promise what pressing something
would actually get you, while the pile shows what exists. Defensible on paper.
Ben saw it on screen — *2 Übungen zum Aktivieren* over three cards — and
reported it as a bug in one line.

**A number sitting directly above the thing it counts has to be the count of
that thing.** No reasoning survives the adjacency; the reader does the
arithmetic before they read the argument. That is the whole lesson, and it is
the kind that only arrives from a rendered page.

**What did not change:** the pile still deals the unbuilt ones and still
refuses them through `NotImplementedLightbox` — filtering them out *"would
quietly show two exercises where the product has five"*, which is the note the
screen has carried since the deck shipped. And `startable()` still exists:
*Such mir eine Übung aus* draws from it, so the shuffle can never start
something that refuses, and the control disables itself when a goal offers
nothing built.

Two knock-on facts, both now resolved rather than accepted:

- `CardDeck`'s position announcement and the headline agree again — *card 1 of
  3* under *Drei Übungen*.
- A goal whose exercises are all unbuilt still reads honestly: the headline
  counts three, the cards all refuse, and the shuffle is disabled.
  `db.content.db.test.ts` asserts no goal is in that state.

### 7.2 The number is a word

*Drei Übungen*, not *3 Übungen* — Ben, 2026-10-15. Spelled out through twelve
and set in figures above, which is the ordinary rule for prose and a headline
is prose. `i18n/numbers.ts` holds the table and argues why it is not in the
message catalogue.

`none` and `one` carry their own numerals rather than interpolating one, since
both inflect the noun as well: *Keine Übung*, *Eine Übung*.

## 8 · What comes out

| | why |
|---|---|
| `GoalPill` — the `Funnel` button in the toolbar | the headline is the control now |
| `GoalBox` — the `ContentBox` + `RadioGroupText` | the sheet is the question now |
| `NO_GOAL`, `goalIdFor()` | §6.1 — there is no absence of a goal |
| `exercises.goal.pill`, `exercises.goal.none`, `exercises.goal.question` | nothing renders them |

`RadioGroupText` itself stays — six other screens use it.

**The toolbar keeps its two remaining controls**, *Such mir eine Übung aus* and
the view switch, in the same row in the same order. Its sideways scrolling and
the two chevrons stay too: they are driven by a measurement, so a row that now
fits simply stops drawing them.

**`DeckGuide`'s first row needs new words, not a new design.** It points an
arrow *up* out of the card at the goal control, which is still above the pile —
only now it is the headline rather than a pill. The glyph and the placement
hold; `exercises.guide.goal` is rewritten to name the headline.

## 9 · *Such mir eine Übung aus* already obeys the filter

The brief asks for it. It is already true: `pickForMe` draws from
`visible.filter(e => e.implemented)`, and `visible` is the goal's own list. This
ships as a **test**, not a change — the behaviour exists and nothing asserts it.

One consequence of §7 worth naming: the shuffle's candidate set and the
headline's count are now the same set, by construction. That is an argument for
deriving both from one memo rather than two filters that could drift.

## 10 · Where the words live

Rule 6's split, applied line by line:

| string | home | why |
|---|---|---|
| the headline template, all three plural forms | `i18n/en.ts` + `de.ts` | chrome — ours, permanent, structural |
| *Was brauchst du gerade?* | chrome | the sheet's own question |
| **Warum?** / **Why?** | chrome | the same word on every card; it labels the sentences rather than being them |
| the card headline (*Entspannung*) | `goal_i18n.label` | content — it is the goal's name |
| the purpose phrase (*Entspannen*) | `goal_i18n.purpose` **new** | content — the same goal, said for a different slot |
| the two sentences | `goal_i18n.why` **new**, NULLABLE | content, and the part most likely to be rewritten by someone who is not an engineer |

Two new columns on `goal_i18n`, and the asymmetry between them is the
product's:

- **`purpose` is `not null`.** Every goal must be sayable in the headline, so
  a goal without one is a goal the screen cannot draw at all. The constraint
  makes that a failed migration rather than a hole on a page.
- **`why` is nullable, and null is DATA.** Three of the four goals carry no
  explanation (§5.1), so an absent `why` means *this goal explains itself* and
  not *somebody forgot the German*.

`public.missing_translations` gains **both**, and the nullable one still
belongs there: the view reports a string only when one locale has it and the
other does not. So `why` null in both locales is silent, and a `why` written
in German and forgotten in English is caught. That is exactly the distinction
`exercises.needs` already relies on.

## 11 · Accessibility

- **The `h1` contains a button.** Legal, and the heading announces with the
  control's label inside it. The control carries `aria-haspopup="dialog"` and
  `aria-expanded`.
- **The change is announced for free.** Choosing closes the sheet, `Lightbox`
  restores focus to the control that opened it, and that control's label is now
  the new goal — so the reader hears the new state as the focus lands. No live
  region, nothing announced twice.
- **1.4.1 for the link** — the trailing glyph at rest, the underline on hover.
  §4.1.
- **1.4.1 for the white card** — border weight plus the check glyph. §4.2.
- **The sheet is `Lightbox`'s frame**, so scrim, focus trap, inertness, scroll
  lock, Escape and the portal are all already right.
- **Rule 7 everywhere.** `Sheet` needs `title` and `closeLabel`, `RadioCards`
  needs `legend` and `emptyLabel`, and every one of those defaults is German in
  the design system. All passed explicitly.

## 12 · What this does not do

- **No entry-screen goal question.** The goal is still asked on `/exercises`
  and nowhere else.
- **No change to how a session records its goal**, beyond the column never
  being null again.
- **No `/maintenance` screen for goals.** They stay migration-governed, like
  exercises. If the *Warum?* copy turns out to be iterated weekly, that is the
  argument for adding them — logged, not built.
- **No re-mapping tool change.** `/goal-mappings` reads the table and emits
  config; it keeps working and is now four columns short of the full picture.
  Logged.

## 13 · Done when

1. `/exercises` opens on *N Übungen zum Musie kennenlernen*, the goal
   underlined on hover with a trailing ellipsis glyph.
2. Pressing it opens a sheet headed *Was brauchst du gerade?* with four white
   text-only Radio Cards; *Achtsamkeit* carries a bold **Warum?** and two
   sentences and the other three carry nothing under their headline.
3. Choosing one closes the sheet, re-deals the pile, re-writes the headline and
   survives a reload.
4. The deck, the list and *Such mir eine Übung aus* all offer exactly the goal's
   three mapped exercises; the shuffle only ever starts a built one.
5. No pill, no goal box, no `NO_GOAL` anywhere in `apps/web`.
6. `select * from public.missing_translations` is empty.
7. `pnpm check` green, `pnpm test:db` green against the local stack, both
   locales walked at 393px in `pnpm --filter web dev`.
