# Digital cards · PRD

**BUILT on 2026-10-14**, on `digital-cards-build` off `main` (`d976bdc`), which
is 26 commits later than the base below — the deck's masters left the
repository and `artwork/cards/` with them. Section 17 is what was built and the
four places it differs from what this document specified; `apps/web/OPEN-QUESTIONS.md`
carries the handover.

Branch `digital-cards`, worktree `../musie.worktrees/digital-cards`, off `main`
(`8dd2f78`). Written 2026-10-13 and revised twice the same day with Ben's
answers: **nothing is persisted**, the two card exercises are **tuned to one
shape**, the rule generalises past the deck (§1.1), and every open question is
answered (§14). One of those answers corrected this document — **no card is
silent**, and §5.2 says what it said before and why it was wrong. **Product
document — no code.** The engineering plan, if this is signed off, is
`DIGITAL-CARDS-PLAN.md` beside it.

Scope of the ask (Ben, 2026-10-13): *some people have no cards — give them a
purely digital way to do the exercise*, and more generally, *any exercise that
requires a physical object can also always run in pure digital mode, to give
the user freedom and be forgiving when they cannot find the object or do not
have it with them*. Concretely: a switch on **Einsteigen**, a hand of cards
dealt into the full-screen sheet, a grid to choose from on the step that was
**Scannen**, and the chosen picture carried into **Hören**. Designed against
*Achtsame Pause* and **tuned** with *Freie Bahn*, which deals differently and
must not be forced into the same flow.

Two wireframes are the source for §5 and §8 and are described where they bind.

---

## 1 · Why this, now

**Nobody has the deck.** Not one tester, not one beta user, and not because of
anything in this repository: the deck cannot go to print until the domain is
chosen, because a printed QR code carries an absolute URL and five hundred
cards cannot be reprinted (BUILD-PLAN, *Still blocked* → *The two that are only
Ben's*). That decision has nothing to do with cards, music or exercises, and
everything downstream of it waits.

What waits is **both exercises that actually work**. Five are in the library;
three open a *not built yet* lightbox; the two that run end to end — Achtsame
Pause and Freie Bahn — are the two `kind = 'card_based'` rows, and both of them
open with *lay the cards out in front of you*. The library says so in its own
*Du brauchst* row: **Mindfulness-Karten-Set**. So the product's two finished
exercises are gated on a piece of cardboard that does not exist yet.

The listening exercises were the first answer to that (LISTENING-EXERCISES.md
§1.1 makes the same argument). This is the second, and it is a different one:
the listening exercises *route around* the deck by being a different kind of
exercise. **This makes the card exercises themselves reachable** — same cards,
same recordings, same question, same diary entry, no paper.

Three more reasons it is worth having after the deck prints:

1. **Somebody who owns the deck is not always near it.** A commute, a lunch
   break, an office — the exercise is two to twelve minutes and the deck is at
   home.
2. **It is the only way to run a card exercise with no camera** — a desktop
   browser, a denied camera permission, a locked-down work phone. Three of
   those four paths through `SessionScan` already exist for the typed code;
   this removes the need for a code at all.
3. **The card art is already shipped.** Nine `.webp` files are in
   `apps/web/public/assets/web/cards/`, `cards.image_url` names them, and the
   diary already draws them. Nothing has to be made to make this possible,
   which is why it is cheap enough to be worth asking for.

### 1.1 · The rule this is the first instance of

**Ben, 2026-10-13: any exercise that requires a physical object can also always
run in pure digital mode — to give the user freedom, and to be forgiving when
they cannot find the object or do not have it with them.**

This document builds the deck's version of that rule, and it is worth writing
the rule down first, because it decides how the switch is *shaped* rather than
only what it does today.

**What it binds.** Every exercise states what you need with you — it is the
*Du brauchst* row on the library card, `exercises.needs`, and for the two card
exercises it says *Mindfulness-Karten-Set*. Whenever that row names an object,
the exercise owes a way through without it. Not a reduced version, not a
different exercise: **the same exercise, with the app standing in for the
object.**

**Where it stops, and this boundary is part of the rule.** The app can stand in
for an object whose role on the table is something a screen can perform. A card
is a picture, a code and a thing to look at while you listen — all three are
reproducible. **Headphones are not**, and neither is a quiet room or somewhere
to lie down. A rule that promised a digital path around those would be
promising the impossible, so the test is: *can the screen do what the object
does?* Where it cannot, the honest answer stays *you need this*, and the
library row says so.

**What that means for the design.** Three things, all of which this document
then obeys:

1. The switch is **about the object the exercise asks for**, not about cards.
   Today there is one object and one sentence (*Die Karten liegen vor mir.*);
   the next object adds a key rather than rewriting that one, so a second
   object is one string and no new mechanism.
2. The digital path is **never hidden behind a setting or an account**. It is
   offered on the step where the object is first asked for, every time, to
   everybody (§3).
3. The digital path **writes what the physical path writes**. A digitally drawn
   card produces the same `card_id`, the same `track_id`, the same diary entry
   (§7.3). The two paths differ in how you name the card and in nothing else —
   otherwise the fallback is a second product with its own data.

Today exactly two exercises are bound by this and both are the deck's.
Atementspannung is `digital_interactive` and needs only the phone; Klangreise
and Bodyscan are `listening_only` and need headphones, which is the boundary
above.

---

## 2 · What ships

**One sentence.** On the two card exercises, a switch on Einsteigen says
whether the cards are on the table; turned off, Musie deals the hand itself —
full screen, one card at a time, where that exercise's own copy says the cards
are dealt — and the chosen picture stands in for the paper one from there on.

| Ships | Does not ship |
|---|---|
| A **switch on Einsteigen**, default *on* in every session: *Die Karten liegen vor mir.* | a setting, a profile column, a remembered answer, or **anything persisted at all** (§3.1) |
| Turning it off puts the session into **digital mode**, as `?digitalcards` in the address and nowhere else | a mode that can be entered any other way — no deep link, no menu item, no per-account default |
| The **hand is derived from the session id**, so it is the same hand on a reload, a Back and a re-toggle | a column, a migration or a cache for it |
| The stepper's second step is **Auswählen**, on both exercises | a fifth step, a renamed step **id**, or a second word for the same step |
| The exercise **deals where its own paper copy deals** — five cards on Einsteigen, one card on Auswählen — driven by one column | two code paths, or anything keyed on an exercise id |
| A **full-screen sheet** that walks the hand one card per screen, by swipe, scroll, button or dot | a new sheet. It is `Lightbox surface="immersive"` — the one `/listen?focus` already uses — and this is its **second** consumer (§10) |
| **Auswählen** keeps its headline, drops its body, **does not mount `QrScanner`**, and shows the hand as a two-column grid | a second write path. A chosen card goes through `saveCard` exactly as a scanned one does (§7.3) |
| **Hören** loses the infographic (it teaches paper) and gains **the chosen picture** on the focus sheet | any change to the gate, the question, the reveal, the diary or */discovered-music* |
| Both locales, every string (CLAUDE.md 6 and 7) | the real Mindfulness Cards spreadsheet. Content copy stays provisional, as it is everywhere else |

Verified against `supabase start` and `pnpm --filter web dev`. Nothing deploys
in this phase (CLAUDE.md rule 8).

---

## 3 · The switch

**Where.** `/session/:id/intro`, between the exercise's headline and its body
copy — Ben's placement, and it is the right one: the body copy is the
instruction the switch makes true or false (*Leg die Karten vor dich*), so the
answer is given above the sentence it governs rather than under it.

**Default on, every time, by design.** *Die Karten liegen vor mir.* is checked
when the step draws, in every session, and it is not a remembered answer —
**Ben, 2026-10-13: "by default it should be on as we always want to push people
to use the analogue deck."**

That sentence is the product position and it decides more than a default. The
deck is the thing Musie is; the digital flow is the way in for somebody who
cannot reach it, not a second way of doing the exercise that people choose
between. A switch that remembered *off* would quietly become a preference, and
a preference is how a fallback turns into the normal case. Asked fresh every
session, the paper deck is what the product offers and the digital hand is what
it falls back to — which is also why **nothing about this is persisted** (§3.1).

**On only two exercises.** `exercise.kind === 'card_based'`. A listening
exercise has no cards to have, and the switch would be a question about
nothing. Keyed on `kind` rather than `needs_cards` for the reason
`exerciseKind.ts` exists — one vocabulary, one answer.

**It is a `Switch`, and this time the noun is literal.** `SessionScan`'s
*enter the code manually* is a disclosure dressed as a switch and is
deliberately **not** one (OPEN-QUESTIONS, *The brief said "switch" for the card
code*): it reveals a form, it turns nothing on. This one **is** a setting —
`role="switch"`, `aria-checked`, a state that outlives the screen it is set on
and changes the two steps after it. The distinction that document draws is the
reason this is the other answer.

**What it shows when it goes off** depends on how many cards the exercise
deals, and that is the whole of the difference between the two exercises (§9):
five cards turns the forward action into *5 Karten ziehen*; one card puts a
line under the switch instead — *Es gibt nichts vorzubereiten, legen wir los.*
— and leaves *Weiter* where it is.

### 3.1 · Nothing is persisted

**Ben, 2026-10-13: "this doesn't need to be persisted. Keep it simple!"** So
there is no column, no migration, no profile field and no memory between runs.
Two things still have to be true across a step change and a reload, and both
are had for free.

**The mode is the URL.** `?digitalcards` — a valueless token, written on
arrival by `replace` and carried by every navigation inside the session. The
mechanism and the argument are `SessionListen`'s `?overview` / `?focus`
verbatim: it is a **mode, not a value**, `URLSearchParams` answers it with
`.has()`, the browser's own Back behaves, a tester can be sent straight to the
thing being tested, and a reload keeps it.

**The hand is derived, not stored.** A pure function — the session's `id` as
the seed, the nine cards in, `cards_dealt` of them out:

```
dealtCards(sessionId: string, cards: Card[], count: number): Card[]
```

Same session, same hand, forever. A reload, a Back from Hören, a second
opening of the sheet, even turning the switch on and off again all return the
**identical** five cards without a byte being written, because the id they are
derived from is the one thing about the session that cannot change. A new
session deals a new hand because it is a new id.

That function is what makes "nothing is persisted" survivable. Without it,
*simple* means a reload re-deals, and the thumbnails on Auswählen change under
somebody who has just spent a minute looking at them. With it, there is nothing
to persist in the first place — which is a better kind of simple than a column
nobody has to maintain. It is also pure and testable in `lib/`, beside
`entry.ts`, `headerReveal.ts` and `scanCode.ts`, which is where this repo keeps
decisions it wants to be able to assert about.

**The one consequence, named rather than hidden.** Leaving the session —
*Weiter* to the diary, the drawer, *Continue session* — comes back on paper,
because the query string did not come with you. It costs one tap on a switch
that is right there, and the hand that comes back is the same hand. That is the
price of not persisting, and it is small.

**What is written is what was always written**: `card_id` and `track_id`, in
one update, when a card becomes yours (§7.3). The digital flow adds no write to
`sessions` at all.

---

## 4 · The stepper

*Scannen* becomes **Auswählen** — on **both** card exercises, and that
sameness is deliberate (**Ben, 2026-10-13**: a consistency tuning between the
two). Nothing is scanned in either: there is no code, no camera and no QR, and
a rail that says otherwise is the product describing a step it is not running.

**Why not a second word for Freie Bahn.** An earlier draft of this document
gave it *Ziehen*, on the grounds that nothing is chosen there. That is true of
the gesture and false of the step: in both exercises the second step is **where
a card becomes yours**, and it is the same step, on the same rail, reached the
same way. Two words for it would make the two exercises look structurally
different when the only difference is how many cards are on the table.

**The step id does not move.** It stays `scan`: `sessions_step_known` is a
check constraint on four literals, `STEP_IDS` is frozen in `routeHandle.ts`,
the reducer's reachability rule walks that list, and `sessions.step` holds it
for every row ever written. **A label is not an id** — the same distinction
`20260923150000` made when *Body Scan als Soundwalk* became *Bodyscan* and kept
`body-scan-soundwalk`.

So it is one more catalogue key beside the four that exist, chosen by the mode:

| key | de | en |
|---|---|---|
| `session.step.scan` | Scannen | Scan |
| `session.step.select` | Auswählen | Choose |

---

## 5 · Einsteigen in digital mode — dealing the hand

**This section is the five-card shape** — an exercise whose `cards_dealt` is
greater than one, which today is Achtsame Pause. A one-card exercise has
nothing to lay out and deals on the next step instead; §9 is where the two are
put side by side, and §7.1 is where its own step is drawn. Everything from §5.3
down — the sheet, its geometry, its gestures — is shared by both, with the
pagination simply absent when there is one picture.

### 5.1 · The action row

| | paper | digital, before the sheet | digital, after the sheet |
|---|---|---|---|
| ghost | Zurück | Zurück | Zurück |
| secondary | — | — | **5 Karten ansehen** |
| primary | Weiter | **5 Karten ziehen** | Weiter |

*Weiter* is **replaced**, not joined, until the hand has been seen: while there
is a hand to deal, dealing it is the only thing to do and the filled treatment
says so. After the sheet closes, going on is the loud action again and
*5 Karten ansehen* is the quiet way back into the pictures. This is the listen
step's rule — *one filled primary, and it moves when the gate opens* — applied
to a softer gate, and the three-button row is the shape `SessionScan` already
uses (Zurück · Noch eine Karte scannen · Weiter).

**Dealing happens on the press, not on the step.** A hand dealt when the step
mounts would be re-dealt by every Back, and somebody walking back to read the
intro would find five different cards.

### 5.2 · What "dealing" means

Five of the nine cards, at random, in deck order on screen.

**Every card plays, and that was solved three weeks ago.** An earlier draft of
this document said four of the nine were silent and put the chosen card's
chance of silence at 44%. It was wrong: it read `20260924140001` and missed
`20261002153212_deck_test_deck_tracks.sql`, which remapped the four cards whose
recordings never landed onto the four that did —

| card | was | now | the recording |
|---|---|---|---|
| mc-06 Sehnsucht | `trk-06` | `trk-05` | High Sierra Call |
| mc-07 Dankbarkeit | `trk-07` | `trk-04` | Bats and Rats |
| mc-08 Einsamkeit | `trk-08` | `trk-02` | Wait for It |
| mc-09 Hoffnung | `trk-09` | `trk-01` | Little Yellow Petals |

— so **no hand can contain a card that plays nothing**, and digital mode
inherits that for free. `deck.json` is where it is written and
`pnpm deck:migration` is what lands it.

**It belongs in the content, and it should stay there.** A runtime mapping
picked per session would be the obvious alternative and is the wrong one for
three reasons: a pairing is written into `sessions.track_id` and read back
months later by the diary and */discovered-music*, so it has to be reproducible;
the same card would play different music to two people and to one person twice,
which is a jukebox rather than a deck; and a content mapping goes through a
migration that `deck.db.test.ts` compares row by row, where a runtime one is
invisible until somebody notices.

**What is left is repetition, not silence.** Four pieces serve nine cards —
mc-02, mc-05 and mc-08 all play *Wait for It*, mc-01 and mc-07 both play *Bats
and Rats* — so a hand of five usually holds two cards sitting on the same
recording. Nobody hears it: one card is chosen and one piece plays. It is
visible only across sessions, and it is exactly what the five missing
recordings in BUILD-PLAN are for. **It is not a digital-mode problem**; the
paper deck has it identically.

**The guard gets teeth — Ben, 2026-10-13.** `deck.db.test.ts` already has the
check (*has a real recording behind every pairing*) and today it `console.info`s
silent pairings and passes. That was right while a person drew the cards and a
silent card was the deck's state of the world. **Musie deals now**, so a
pairing with no file is our fault, and the info becomes an assertion. Two
things go with it: the stale comment *"five of nine are silent by design"*, and
a named cost — a tenth card added before its recording lands turns
`pnpm test:db` red, which is the point rather than a side effect.

**Two documents say the old thing and are corrected on this branch**, because
they are what produced the wrong number above: `artwork/cards/README.md` still
lists *— no file yet* for mc-06…mc-09, and BUILD-PLAN's blocker row still says
*five of the nine deck cards silent*. The recordings are still wanted; what
they buy is variety, not sound.

### 5.3 · The sheet

`Lightbox surface="immersive"` — the full-screen sheet `/listen?focus` already
uses, opened from the rect of the button that opened it (`origin`), so it grows
out of *5 Karten ziehen*. **This is its second consumer**, which is what §10 is
about and what Ben's note (*jetzt wird es wieder benutzt → leg es als Storybook
Komponente an*) asks for.

**Six states: one instruction, then five pictures** — or **two** when the
exercise deals one card, in which case the dots and the previous/next pair are
not drawn at all and *Weiter* sits on the single picture.

**State 1 — the instruction.** Per the left half of the first wireframe: copy
at the top, the sheet's own close control top right, the pagination dots at the
**inline start, vertically centred**, and one wide action anchored at the
bottom edge.

> **de** — *Wenn du auf dem Handy unterwegs bist, drehe ins Breitformat. Dann
> sieh dir die fünf Karten an und atme zu jeder einmal ein und aus.*
> **en** — *If you are on your phone, turn it to landscape. Then look at the
> five cards and breathe in and out once with each of them.*
>
> Action: **Erstes Bild ansehen** / *Look at the first image*

**States 2–6 — the pictures.** The card fills the sheet. The dots stay where
they are; the action at the foot is replaced by a **previous / next pair of
secondary icon buttons at the bottom trailing corner** (right half of the first
wireframe). *Previous* is disabled on state 2. On state 6 — the last card — a
**secondary *Weiter*** appears beside them, closes the sheet and advances the
stepper.

**Moving between states**: swipe up/down, scroll, the two icon buttons, or a
dot. One gesture moves exactly one state — `scroll-snap-stop: always`, the
decision Ben made on 2026-09-22 for both carousels after a flick sailed through
the Störer, and the same reason applies to a card you are meant to breathe with.

### 5.4 · Three details the wireframe gets right and a stylesheet has to honour

**The bottom action clears the browser bar.** Ben's note. It is already solved
and must not be re-solved: `--viewport-block` is `100svh` — the *small*
viewport, the one with the bars showing — and the immersive popup sizes against
a `position: fixed; inset: 0` positioner, which "follows the SMALL viewport on
iOS the way a fixed box does, rather than reaching under the browser's own
chrome the way `100vh` would". The sheet's foot is safe by construction.

**The landscape line is a request, not an orientation lock.** The card art is
landscape (768 × 562) and a portrait phone gives it about a third of the
screen. We ask; we do not rotate. A locked orientation breaks the one audience
that cannot rotate — somebody using a phone mounted or propped — and ignores
the system setting, which is a preference, not a default.

**The dots are 24px targets around 12px marks**, and they get an
`aria-label` per dot (`Bild {n} von {total}`), because `Dots` without
`onSelect` renders spans and marks the row `aria-hidden` — fine for the Card
Deck, which announces position itself, wrong here where the dots are a way to
move.

### 5.5 · The one thing in the brief that cannot be true at once

*Previous is disabled on state 2* **and** *the user navigates by scrolling up
and down*. A thumb can scroll back to state 1; the button says it cannot. One
of the two has to give:

- **Clamp the scroller at state 2** once state 1 is left — the instruction is
  read once, and the gesture agrees with the button.
- **Enable *previous* on state 2** to return to the instruction — the button
  agrees with the gesture, and the instruction is re-readable, which somebody
  who did not catch the landscape line will want.

**Enabled — Ben, 2026-10-13.** The instruction is the one screen in the sheet
somebody might need twice, and a disabled control on the first picture is a
dead end the gesture already walks around. The brief said disabled; this is the
one place it was read against, and it was asked rather than assumed.

### 5.6 · Closing, and coming back

Closing the sheet — the X, Escape, the scrim, or browser Back — returns to
Einsteigen with *Weiter* restored and *5 Karten ziehen* relabelled
**5 Karten ansehen**. Reopening shows **the same hand**, from state 1.

**No gate.** Somebody who closes the sheet on the second card can still press
*Weiter* and will meet five thumbnails, two of which they have seen. That is
deliberate and it is this product's posture everywhere — the listen step's
ninety seconds is the only hard gate in the flow, and it exists because the
exercise is the listening. Looking at pictures is not something to be enforced.

---

## 6 · What happens to the intro copy

`intro_md` for Achtsame Pause says, today:

> **Leg die vier Karten mit dem Symbol [X] vor dich.**
> Lass die Bilder einen Moment auf dich wirken.

and Freie Bahn's says *Lege den Stapel Karten verdeckt vor dich.* Both are
instructions about objects that are not there in digital mode. The first is
**also wrong on paper**, in two ways, and both are fixed in this iteration
(Ben, 2026-10-13):

- **It says *vier*; the library card says *5 zufällige Karten* and the switch
  deals five.** Five wins — it matches the library, the brief and
  `cards_dealt`.
- **`[X]` is a placeholder for a symbol nobody has chosen**, and it prints
  literally on screen today. It is struck rather than waited for: with nine
  cards in the set, "draw five" needs no symbol, and keeping the sentence would
  hang a line of copy on the deck's print data.

So the paper copy becomes, in both locales:

> **de** — *1. Zieh fünf zufällige Karten und leg sie vor dich. 2. Lass die
> Bilder einen Moment auf dich wirken.*
> **en** — *1. Draw five random cards and lay them out in front of you. 2. Let
> the images settle for a moment.*

*zufällig* rather than *beliebig* on purpose: the choosing happens on the next
step, and a person who picks their favourite five has already done step 2
without noticing. It is also now **the same sentence the digital deal
performs**, which is the cheapest kind of consistency — one instruction, two
ways of carrying it out.

**In digital mode the body is hidden** — `headingOnly`, the mechanism
`markdown.ts` already has and the one §7 uses on Auswählen for the same reason.
The headline stays, because it is the step's own name for itself and is true
whichever way the cards arrive.

**And a one-card exercise gets a line in its place.** Ben's words, and they
carry the whole posture of the feature:

> **de** — *Es gibt nichts vorzubereiten, legen wir los.*
> **en** — *There is nothing to lay out, let's start.*

Drawn under the switch, only when the switch is off, only when the exercise
deals one card. A five-card exercise needs no replacement line: its forward
action has just become *5 Karten ziehen*, and the sheet one tap away carries
the instruction.

**Why that line is chrome and not content.** It is true of every one-card card
exercise and it says something about **the mode**, not about the exercise — the
same sentence would be right for the next object this rule reaches (§1.1). The
exercise's own copy is about paper it no longer has, which is exactly why it is
the thing being replaced. So it is a key in `i18n/*`, ours and permanent, and
it costs no migration.

**Per-exercise digital intro copy is still a follow-up.** Two columns on
`exercise_i18n` would let each exercise say its own thing in digital mode. It
waits for the Mindfulness Cards spreadsheet; the repair above does not, because
a sentence that prints `[X]` is wrong now.

---

## 7 · Auswählen in digital mode

### 7.1 · What the step shows

**In both exercises:**

- **The headline stays**: *Wähle eine Karte aus* — `scan_md`'s own `##`,
  rendered with `headingOnly`, which is the mirror of the `bodyOnly` the listen
  sheet already uses to split one markdown string between two screens.
- **The body goes.** It is numbered steps about QR codes and about putting the
  other cards out of sight.
- **`QrScanner` is not rendered at all.** Ben restated this and it is worth
  being explicit, because that component *is* the step today: the dashed frame,
  the viewfinder, the five camera states, the typed-code form folded inside it,
  and *Andere Karte scannen* in the action row. In digital mode every one of
  those is about a camera nobody is opening and a code nobody has. None of it
  is hidden with CSS; it is not mounted.

**Where the two exercises differ — and it is the same difference the paper copy
already has** (§9):

| | Achtsame Pause (`cards_dealt = 5`) | Freie Bahn (`cards_dealt = 1`) |
|---|---|---|
| The hand arrived | on Einsteigen, in the sheet | not yet — it is drawn here |
| The step's body | a **two-column grid** of the five dealt pictures, in deck order, with a hover and a selected state | nothing, until the card is drawn |
| The action row | Zurück · *(the grid is the action)* | Zurück · **Karte ziehen** (primary) |
| Choosing | pressing a picture writes the card and **advances** | *Karte ziehen* writes the card and opens the sheet with it; its *Weiter* closes and advances |
| After | — | Zurück · **Karte ansehen** (secondary) · **Weiter** (primary) |

The second row of that table is the same action row §5.1 gives Einsteigen for a
five-card exercise. One rule, stated once: **the step that deals shows a filled
primary that deals, and once it has dealt, going on takes the filled treatment
back.**

### 7.2 · Which component draws the grid

`RadioGroupImage` is the near miss and is worth stating precisely, because it
is nearly right:

| | what it does | what this needs |
|---|---|---|
| columns | 2 / 3 / 4, auto-fit, floored at 196px | 2 at phone width — **agrees**; 4 on a desktop is a contact sheet, not a hand |
| ratio | `1 / 1`, from the Figma card | 768 × 562 — a square crop loses a third of the picture, and the picture is the whole content |
| label | required per item, never clamped | **there is no label.** The choice is *the image that speaks to you*; a word under it is a different exercise |
| alt | required per item, `alt=""` unreachable | see §11 — the alt text does not exist yet |
| commit | selection, then a separate Continue | selection **is** the commit |

So the grid is **not** `RadioGroupImage`, and saying so is the point: the fix is
not to override it from `apps/web` (rule 1, L7).

| | A · an app pattern, `.musie-cardgrid` | B · a design-system component |
|---|---|---|
| L14 | permitted — the system has no component for this | the honest end state |
| Precedent | `.musie-sheet` lived this way for weeks and is still logged as a request | `useScrollSnap` was promoted *before* a second copy existed, on Ben's call |
| Cost | a grid of buttons and ~20 declarations, every one resolving to a Layer 1 token | a component, a story, props, and a second consumer that does not exist yet |
| Risk | one more thing in `shell.css` | designing an image picker from one use |

**A, with the component request logged in `apps/web/OPEN-QUESTIONS.md` on the
day it is written** — which is what L14.3 asks for and what the `.musie-sheet`
entry is the template for. There is one consumer; a component built from one
consumer is a guess.

### 7.3 · The write does not change

A chosen thumbnail — or a pressed *Karte ziehen* — calls
**`saveCard(sessionId, cardId, trackId)`**, with the track looked up by the
same `getTrackFor(exerciseId, cardId)`. `card_id` and `track_id` are written in
one update because they are decided by one act, which is `lib/scan.ts`'s
argument and is unchanged by how the card was named.

**This is §1.1's third clause in code**: the digital path writes what the
physical path writes. The diary entry, the reveal, */discovered-music* and
every db test downstream cannot tell the two apart, and that is the property
worth protecting.

What is **not** reused is `scanCardInto`: it decodes a code, and there is no
code. The pure half (`decodeScan`) has nothing to do; the useful half is the
two lines after it. A digital choice calls the same `getTrackFor` + `saveCard`
pair directly, so there are two callers of one write rather than two writes.

**The press is not instant and must not pretend to be.** The lookup and the
update are a round trip. The pressed picture — or the button — shows a busy
state and the step advances on success; a failure stays where it is and says
so, in the one slot the step already has for it.

### 7.4 · Going back, and changing your mind

Walking back shows **the same hand**, because the hand is derived from the
session id and cannot have changed (§3.1). For Achtsame Pause the chosen card
is selected and choosing another overwrites `card_id` and `track_id` through
the same call. For Freie Bahn the drawn card is still the drawn card, and the
row offers *Karte ansehen* rather than a second draw: the exercise deals once,
and a re-draw would be a choice by another name.

This matches the paper flow exactly: the cards are still on the table, one of
them is in your hand, and you may put it back — but the one you drew blind
stays the one you drew.

---

## 8 · Hören

### 8.1 · `?overview` — the infographic goes

`infographic-listen-and-see.webp` is *a hand holding a card over a table,
beside a phone lying flat*. It is the paper flow in one picture. It is already
hidden for listening exercises for exactly this reason — Ben, 2026-10-12: shown
there "it would be teaching a deck to somebody who was told they need only
headphones" — and digital mode is the same mistake with the same picture.

The condition becomes *card-based **and** not digital*. Everything else on the
overview is unchanged: the copy, the transport, the gate, the question, the way
on.

### 8.2 · `?focus` — the card beside the music

Per the second wireframe, and it is two layouts of three things:

**Desktop** — the question at the top with the close control top right; the
**picture** on the leading side; the **countdown and the play/pause control**
beside it on the trailing side with the progress line under them; the step's
CTA across the foot.

**Mobile** — the same things in a column: question, the mute/help row, the
**picture**, then `00:26` with *Pause* beside it, then the CTA at the foot.

**What this is, structurally**: `.musie-immersive` is a three-child column
today — lead, clock, actions — with `margin-block: auto` on the middle one so
the middle takes the slack. The picture is a **fourth** child, and on desktop
the middle becomes a two-column row. That is an arrangement change inside the
single element the sheet hands over, which is the app's to make under L14 — and
the second reason §10 exists.

**Nothing else on the sheet moves.** The question, the ninety-second gate, the
countdown, *Hilf mir bitte*, the music switch and the reveal are untouched.

### 8.3 · The picture is not big enough and that is a fact, not a worry

`apps/web/public/assets/web/cards/README.md`:

> **768 × 562 WebP, quality 80.** … `.musie-diary__card-art` caps the display
> at `calc(var(--measure-body) * 0.6)` — about 420px — so the file is roughly
> 1.8× the largest slot it is drawn in, which is the retina margin. **If the
> card is ever shown larger than that cap, re-encode wider first**: at the full
> `--measure-body` this file is barely 1× and will soften.

This feature shows the card **full screen**, twice — the sheet in §5 and the
focus sheet here. At 1280px it is at best 0.6× and visibly soft; on a 2× phone
in landscape it is worse.

**The masters exist**: 1420 × 1040 print exports, in `apps/web/deck-print/`
(gitignored build output). The re-encode is one line of the `sharp` call the
README already records, at 1536 instead of 768, and the set roughly triples to
about 2.6MB. Those nine files are the only new weight this feature adds, and
they are the one thing in it that **must** be done before it is shown to
anybody.

---

## 9 · The two exercises, tuned to one shape

**Ben, 2026-10-13: make a consistency tuning between the two card-based
exercises part of the PRD.** Here it is, and the useful discovery is that
consistency does **not** mean one flow: it means **both exercises deal where
their own paper copy already deals**, and everything around that is identical.

Look at where the object is handled today, on paper:

| | Achtsame Pause | Freie Bahn |
|---|---|---|
| `intro_md` | *Leg die vier Karten … vor dich. Lass die Bilder einen Moment auf dich wirken.* | *Lege den Stapel Karten verdeckt vor dich.* |
| `scan_md` | *Wähle das Bild aus, das dich gerade am meisten anspricht …* | **Ziehe eine zufällige Karte vom Stapel.** Nimm dir einen Augenblick Zeit … |

**The cards are already on the table at the end of step 1 in one exercise and
still in the deck in the other.** Achtsame Pause lays five out and looks at
them before anything is chosen; Freie Bahn lays the deck face down and the draw
is the first line of step 2. That is not an inconsistency to be tuned away — it
is the difference between the two exercises, and the digital flow mirrors it
exactly rather than inventing a third arrangement.

### 9.1 · What is the same, and what follows from one number

| | Achtsame Pause | Freie Bahn |
|---|---|---|
| `exercises.cards_dealt` | **5** | **1** |
| The switch, on Einsteigen | same, same label, same default | same |
| Intro body in digital mode | hidden | hidden, replaced by *Es gibt nichts vorzubereiten, legen wir los.* |
| Einsteigen's forward action | **5 Karten ziehen** → the sheet | **Weiter** — there is nothing to prepare |
| Stepper, step 2 | **Auswählen** | **Auswählen** |
| Auswählen | the five as a two-column grid; pressing one advances | **Karte ziehen** → the sheet with the one card; *Weiter* advances |
| The sheet | state 1 + five pictures; dots; previous/next | state 1 + one picture; **no dots, no previous/next**; *Weiter* on the card |
| The act | choosing | being dealt |
| Hören | the chosen picture on the focus sheet | the drawn picture, identically |

**One column drives all of it.**

```sql
alter table public.exercises add column cards_dealt smallint;
-- 5 for mindfulness-cards, 1 for free-rein, null for the three that draw none
```

`> 1` means: deal on step 1, paginate the sheet, show a grid on step 2.
`= 1` means: nothing to prepare on step 1, deal on step 2, one picture in the
sheet, no grid. There is no second code path keyed on an exercise id, and no
`if (exercise.id === 'free-rein')` anywhere — which is the thing to check at
review, because that is how this becomes two implementations without anyone
deciding to.

**Rule 2, checked rather than assumed.** `public.exercises` is granted at table
level — `grant select … to authenticated` (`20260918150500`), `grant select …
to service_role` (`20260921100000`), `grant insert, update, delete … to
service_role` (`20260921103000`) — so a new column is readable the moment it
exists. The asymmetry `20261011110100` wrote down still holds and does not
apply here: `public.tracks` carries a **column** grant, so a column added
*there* is unreadable until a new grant names it. The precedent for this exact
check is `20261013100000`'s ACCESS note on `exercise_cuts`.

**And it is a number the paper flow should already have had.** The library card
says *5 zufällige Karten* and `intro_md` says *vier*, because the count lives
in prose in two places and nothing can compare them. After this it is a column
the prose can be checked against — and `(kind = 'card_based') = (cards_dealt is
not null)` is the check that keeps it honest, beside the one `20261011100000`
already wrote for `needs_cards`.

### 9.2 · Why Freie Bahn does not simply get five

Because the grid *is* the other exercise. Freie Bahn's own words are *ziehe
eine zufällige Karte … vielleicht kannst du deine Stimmung in ihr
wiederfinden, vielleicht wirst du die Darstellung aber auch eher distanziert
betrachten. Alles ist in Ordnung.* That sentence is about a card you did not
pick. Dealing five and asking which speaks to you would quietly turn a two-
minute exercise in acceptance into a two-minute exercise in choosing.

---

## 10 · What this asks of the design system

Two requests, and the first is Ben's own note.

### 10.1 · The full-screen sheet becomes a component, with a story

**L14.3: a pattern that recurs is a component request, not a second copy.**
`/listen?focus` is the first consumer; §5's card walk is the second, and §8.2
adds a fourth child to the first one's column.

What is **already** the system's and must stay there: the frame — scrim,
edge-to-edge surface, the clip that grows out of the opening control, focus,
inertness, scroll lock, Escape, the portal. `Lightbox surface="immersive"` owns
all of it and has two stories.

What is **not**, and is the request:

| the sheet would own | why the app cannot |
|---|---|
| the **column arrangement** — lead, a middle that takes the slack, a foot anchored at the viewport edge | it is `.musie-immersive` in `shell.css` today, written as a permitted L14 pattern with a note saying a second screen wanting it is a component request. A second screen wants it |
| **paged vertical snapping between full-height children** | the scroll container is `.musy-lightbox__body` — a design-system element. A screen setting `scroll-snap-type` on it is reaching into a component's geometry (rule 1, L7). And `useScrollSnap` cannot help: it owns the mode on `<html>`, and the document is not the scroller here |
| the **dots rail** and the **prev/next rail** as slots | both are placed against the *sheet's* edges, not against the content — the app would be positioning children inside a box it does not own |
| the **foot**, against the small viewport | the popup's sizing is the component's; a foot anchored from outside would be a screen re-deriving a measurement the component already has |

`Carousel` is **not** the mechanism and the reason is not the axis alone: it is
a peeking, horizontal, index-controlled card track whose whole design — the 27px
peek, the nudge, the grab cursor, the 0.9 scale — exists to say *there are more
of these, sideways*. This sheet is full-bleed pictures moving vertically. What
it genuinely shares is `Dots`, which was already extracted out of `Carousel`
for exactly this kind of reuse, and `scroll-snap-stop: always`, which is a
declaration.

**Storybook**: the sheet with a lead and a foot; the sheet paginated; the sheet
opened from a control (the `origin` clip). The second is the new one.

### 10.2 · The picture grid — a request, logged, not built

§7.2. One consumer, so it is an app pattern with the request written down the
day it is written, in `OPEN-QUESTIONS.md`'s own format. If Freie Bahn's
single-card view and this grid turn out to want the same frame, that is the
second consumer and the argument changes.

---

## 11 · Alt text — the column that was kept for this day

`card_i18n.image_alt` is null for all nine cards, deliberately, and the deck's
README says why:

> There is none, deliberately. … the card is drawn with `alt=""` next to its
> own code in text — the same rule the diary graph states: a picture whose
> neighbour already names it announces it twice. **The column stays for the day
> a card is shown without its code beside it.**

**This is that day, three times over**: the sheet shows a picture and nothing
else, the grid shows five pictures as the only way to choose, and the focus
sheet shows one beside a clock. A screen-reader user meeting five unnamed
images has five identical options.

| | A · write the nine alt texts | B · name each card by its `feeling` | C · name by code (*Karte MC-01*) |
|---|---|---|---|
| Describes the picture | yes | no — it names the **feeling**, which is a different fact | no |
| Parity with a sighted user | closest: both get the picture | **asymmetric**: a sighted user chooses by image, a screen-reader user by a word nobody else sees | poor but neutral |
| Cost | 18 strings (9 × 2 locales), through `deck.json` → `pnpm deck:migration` | none — the data exists | none |
| Status of the copy | content, provisional until the spreadsheet lands | — | — |

**A — Ben, 2026-10-13.** `feeling` is the wrong name, and it is worth
being precise about why:
*Freude* is the card's **answer**, and the instruction is *wähle das Bild, das
dich anspricht* — handing one group of users the nine answers as labels changes
the exercise for them. It is also the only option that makes the grid usable
without sight, which is the test.

It goes through `supabase/content/deck.json` and `pnpm deck:migration` like
every other deck change (rule 4), and it is **content**, so it is provisional
and the spreadsheet may overwrite it — which is fine — as long as whoever
writes the spreadsheet is told the column is now load-bearing.

---

## 12 · Copy

**Chrome** — `apps/web/src/i18n/*`, ours and permanent. `de.ts` is typed
against `en.ts`, so an English key with no German fails `pnpm check`.

| key | de | en |
|---|---|---|
| `session.intro.cardsPresent` | Die Karten liegen vor mir. | I have the cards in front of me. |
| `session.intro.nothingToLayOut` | Es gibt nichts vorzubereiten, legen wir los. | There is nothing to lay out, let's start. |
| `session.step.select` | Auswählen | Choose |
| `session.intro.deal` | {count} Karten ziehen | Draw {count} cards |
| `session.intro.dealAgain` | {count} Karten ansehen | Look at the {count} cards |
| `session.scan.draw` | Karte ziehen | Draw your card |
| `session.scan.drawAgain` | Karte ansehen | Look at the card |
| `session.cards.title` | Deine Karten | Your cards |
| `session.cards.close` | Karten schließen | Close the cards |
| `session.cards.lead` | Wenn du auf dem Handy unterwegs bist, drehe ins Breitformat. Dann sieh dir die fünf Karten an und atme zu jeder einmal ein und aus. | If you are on your phone, turn it to landscape. Then look at the five cards and breathe in and out once with each of them. |
| `session.cards.leadOne` | Wenn du auf dem Handy unterwegs bist, drehe ins Breitformat. Sieh dir die Karte an und atme einmal ein und aus. | If you are on your phone, turn it to landscape. Look at the card and breathe in and out once. |
| `session.cards.first` | Erstes Bild ansehen | Look at the first image |
| `session.cards.next` | Nächstes Bild | Next image |
| `session.cards.previous` | Vorheriges Bild | Previous image |
| `session.cards.dot` | Bild {position} von {total} | Image {position} of {total} |
| `session.scan.gridLabel` | Deine Karten — wähle eine aus | Your cards — choose one |
| `session.scan.pickFailed` | Die Karte konnte nicht übernommen werden. Versuch es gleich noch einmal. | That card could not be saved. Try again in a moment. |

`session.intro.cardsPresent` is **named after the deck on purpose** (§1.1,
clause 1): the next exercise that asks for an object adds its own key beside
it rather than making this one generic. One object, one sentence, and no string
that has to be true of a thing nobody has designed yet.

Notes against `docs/GERMAN-UI-WRITING.md`: §1 `du` throughout and imperative
singular (*sieh dir an*, *drehe*, *wähle*, *zieh*); §2 sentence case; §3
verb-first on every action — *Karte ziehen* matches `session.scan.scanCard`
(*Karte scannen*), which is the register this step already speaks in; §4 no
*Bitte*; §7 Gedankenstrich in `session.scan.gridLabel`. *Weiter* and *Zurück*
are `common.continue` / `common.back` and are not duplicated.

**Rule 7** binds the components this introduces: `Lightbox.closeLabel`
(defaults to `'Schließen'`), every `IconButton` label, the `Dots` label
function, and any empty state. Every one is passed.

**Content** — the content tables, provisional: §11's nine alt texts in both
locales, through `deck.json` and `pnpm deck:migration`. Per-exercise digital
intro copy (§6) is the follow-up and is not in this scope.

---

## 13 · What does not change

- **The QR path.** A camera scan, a typed code and `/s/MC-01` all still work
  with the switch on, unchanged.
- **A deep link into a digital session** (`/s/MC-01` while a digital session is
  running) — the held code is consumed by a scan step that is no longer
  showing a field. **The scan wins and the mode goes off** (Ben, 2026-10-13):
  a scanned code is evidence that the cards are in front of you after all. The
  dealt hand goes, the switch reads on again, and the scanned card is the card.
- **The diary.** `card_id` is written the same way, so the entry shows the same
  card art it shows today, and nothing in the diary needs to know how the card
  was named.
- **The reveal, */discovered-music*, the ninety-second gate, the question
  rotation, the reflection** — untouched.
- **The three listening exercises** — no switch, no mode, no column read.

---

## 14 · Decisions

Everything this document asked is answered. Kept as a record of what was
decided and why, because the reasons are the part that will be needed again.

**The shape of the feature** — Ben, 2026-10-13:

- **Nothing is persisted.** The switch is on in every session, because the deck
  is what Musie pushes people to and a remembered *off* turns a fallback into a
  preference. The mode is the query token; the hand is a pure function of the
  session id (§3).
- **Every exercise that asks for a physical object owes a digital path**, as
  far as the screen can do what the object does. Headphones are the boundary
  (§1.1).
- **Both card exercises say *Auswählen***, and each deals where its own paper
  copy already deals — five laid out on step 1, one drawn on step 2. One
  column, `cards_dealt`, is the difference (§4, §9).
- **A one-card exercise says *Es gibt nichts vorzubereiten, legen wir los.***
  under the switch (§6, §7.1).
- **`QrScanner` is not mounted in digital mode** — not hidden, not mounted
  (§7.1).
- **The intro body is hidden in digital mode**; per-exercise digital copy waits
  for the spreadsheet (§6).
- **Back shows the same hand**, because the hand is derived rather than dealt
  twice (§3.1, §7.4).

**The four asked and answered on the day:**

| | Question | Answer |
|---|---|---|
| 1 | Cards with no recording | **The question dissolved.** The deck was remapped on 2026-10-02 and every card plays; the guard in `deck.db.test.ts` gets teeth so it cannot come back quietly (§5.2) |
| 2 | *Previous* on sheet state 2 | **Enabled.** The gesture can already go back to the instruction, so a disabled button is the half that was wrong (§5.5) |
| 3 | Alt text for the nine cards | **Write it** — 9 × 2 strings through `deck.json`. `feeling` is the card's answer and handing it to one group of users as a label changes the exercise for them (§11) |
| 4 | A QR scan during a digital session | **The scan wins** and turns the mode off. A scanned code is evidence that the cards are there after all (§13) |

**And the content defect found on the way** (logged in
`apps/web/OPEN-QUESTIONS.md`, now answered): Achtsame Pause lays out **five**
cards, not four, and the `[X]` placeholder is struck rather than waited for
(§6).

**What is deliberately left open**, because it is not this feature's to settle:

- **Per-exercise digital intro copy** — two columns on `exercise_i18n`, waiting
  for the Mindfulness Cards spreadsheet (§6).
- **A `Sheet` component's full API** — this document asks for one and names what
  it must own; what its props are called is the design system's to decide when
  it is built (§10.1).
- **The picture grid as a component** — one consumer today, so it ships as an
  app pattern with the request written down (§7.2, §10.2).

---

## 15 · Done when

1. On Achtsame Pause and Freie Bahn, Einsteigen shows the switch, on, in both
   locales, in **every** session — including one started straight after a
   session that turned it off. No other exercise shows it.
2. Turning it off puts `?digitalcards` in the address and survives a reload and
   every step change within the session. Leaving and resuming from the drawer
   comes back on paper, deliberately, and one tap restores **the same hand**.
3. Achtsame Pause: *5 Karten ziehen* deals five of the nine, opens the sheet
   from the button's own rect, and walks all six states by swipe, scroll, both
   icon buttons and the dots — one state per gesture, and *previous* on the
   first picture returns to the instruction.
4. Freie Bahn: Einsteigen shows *Es gibt nichts vorzubereiten, legen wir los.*
   under the switch and keeps *Weiter*; Auswählen carries *Karte ziehen*, which
   writes the card and opens the sheet with one picture, no dots and no
   previous/next.
5. The same session deals the same hand after a reload, a Back from Hören and a
   switch toggled off, on and off again. A different session deals a different
   hand.
6. The sheet's foot is above the browser bar on an iPhone in Safari, portrait
   and landscape, and the sheet is usable in both.
7. The stepper reads *Auswählen* on both exercises, in both locales, and
   `sessions.step` still says `scan`.
8. Auswählen mounts no `QrScanner` — not hidden, not mounted — shows the
   headline, no body, and the right thing for the exercise's `cards_dealt`.
9. Choosing a picture (or drawing the one card) writes `card_id` **and**
   `track_id` in one update, then advances. A failure keeps you on the step and
   says so.
10. Going back shows the same hand with the chosen card selected; choosing
    another replaces both columns.
11. A QR code scanned during a digital session takes over: the mode goes off,
    the hand goes, and the scanned card is the session's card.
12. Hören draws no infographic in digital mode, and the focus sheet shows the
    chosen card at both layouts in the wireframe.
13. The nine card images are re-encoded at 1536 and the focus sheet is sharp on
    a 2× phone.
14. Achtsame Pause's `intro_md` says *fünf zufällige Karten* in both locales
    and no longer prints `[X]`.
15. All nine cards carry alt text in both locales; `select * from
    public.missing_translations` returns nothing new, and every new chrome key
    is in both catalogues.
16. `deck.db.test.ts` **fails** rather than logs when a pairing points at a
    track with no file, and its comment no longer claims five cards are silent
    by design.
17. Keyboard: the sheet pages with the arrow keys, the dots and the icon
    buttons are reachable and named, Escape closes, focus returns to the button
    that opened it. Reduced motion collapses the paging animation.
18. A diary entry from a digital session is indistinguishable from one from a
    scanned session — same card, same track, same artwork (§1.1, clause 3).
19. `pnpm check` passes. `pnpm test:db` passes against the local stack after
    the migrations (rule 4 — each one its own file, nothing edited).
20. Verified against `supabase start` and `pnpm --filter web dev`. Nothing
    deploys (rule 8).

---

## 16 · Size

Roughly, and only to say what kind of change this is:

| | |
|---|---|
| Migrations | **three**, all additive and all content-or-column: `exercises.cards_dealt` with its check; the deck regeneration carrying the nine alt texts; the `intro_md` repair for Achtsame Pause in both locales. **Nothing on `sessions`** — the mode is a query token and the hand is a pure function |
| Design system | one component (the sheet), one story set; `Dots` and `Lightbox` reused as they are |
| App | the switch, one new sheet consumer, the grid, the draw button, three conditionals on Hören, one pure `dealtCards` with its test, one new `saveCard` caller |
| Tests | `deck.db.test.ts`'s pairing check becomes an assertion; `dealtCards` gets a unit test; the i18n parity test covers the new keys for free |
| Content | nine alt texts × 2 locales, and two repaired intro strings |
| Assets | nine re-encodes, +1.7MB |
| Docs corrected on the way | `artwork/cards/README.md` and BUILD-PLAN's blocker row, both of which still describe four silent cards |
| Not touched | `sessions`, `tracks`, `exercise_tracks`, the deck generator, the reveal, the diary, */discovered-music*, the three listening exercises |

---

## 17 · As built — 2026-10-14

Everything in sections 2 to 13 is built and walked, in both locales, except
where this section says otherwise. `pnpm check` passes; a Playwright walk
(`apps/web/e2e/digitalcards.spec.ts`) runs the whole path and reads the row
back out of Postgres.

### 17.1 · What is new

| | |
|---|---|
| `packages/design-system/src/Sheet.tsx` | the full-screen paged surface (section 10.1), with `Sheet.stories.tsx` and a `SHEET` section in `musy-components.css` |
| `apps/web/src/lib/digitalCards.ts` | the mode token, the deal, and `cardsDealt` — pure, with 15 unit tests |
| `apps/web/e2e/digitalcards.spec.ts` | the walk: switch, sheet, grid, reload, choice, and the two columns |
| two migrations | the deck's nine alt texts; Achtsame Pause's intro copy repaired to five cards with no `[X]` |
| nine re-encoded cards | 1200px from the masters, 2.0 MB for the set |

### 17.2 · The four places it differs from this document

1. **`cards_dealt` is a map in the app, not a column** (section 9). The
   commands that would land a column are denied to this session and are Ben's
   — rule 9. The migration is not written, because a column nobody may apply
   is a column `database.types.ts` does not have and therefore a typecheck
   failure in every screen that reads it. Logged, with the three lines that
   delete the map once the column exists.

2. **The one-card draw reveals in place; the sheet is a second press**
   (section 7.1 said *Karte ziehen* opens the sheet). It cannot: `onRescan()`
   bumps the read key, `useAsync` clears its data on a key change by design,
   and `SessionRun` unmounts for the length of one round trip — taking the
   sheet's open state with it. Opening before the write was worse: a failed
   write would leave somebody looking at a card their session does not have.
   So drawing turns the card face up on the step, and *Karte ansehen* opens it
   full screen. Found by looking at a screenshot, not by a test.

3. **The focus sheet is a stack at every width** (section 8.2 described the
   wireframe's desktop row). The reason is in the stylesheet and in
   OPEN-QUESTIONS: the row needs a wrapper that would fork the DOM of a sheet
   every exercise shares, or a selector for a design-system component's own
   class.

4. **The cards are 1200px, not 1536** (section 8.3). The masters are 1491
   wide, so 1536 was always an upscale; 1200 at quality 75 is 2.0 MB for the
   set where 1491 at 80 is 4.1 MB, on illustrations where the difference does
   not show. MC-01 is encoded from `mc-01_alt.png`, which is the colourway the
   app already shipped — the print decision is untouched.

### 17.3 · Two things found on the way

**`deck.test.ts` was asserting nothing.** Its *alt text in one locale only*
case wrote German alone and relied on the real deck carrying no alt text at
all, so it stopped proving anything the moment the nine descriptions landed.
It now names both sides, and is independent of what the fixture happens to
hold.

**`playwright.config.ts` hardcoded port 5173 with `reuseExistingServer`.**
There is one port 5173 and ten worktrees, so a walk started from one branch
reused another's dev server and reported that the wrong code worked — rule 9's
own warning, built into the config. It now takes `MUSIE_PORT`, and the dev
server is started with `--port --strictPort` so it cannot silently move.

### 17.4 · What was verified, and what was not

**Verified.** `pnpm check` (typecheck, lint, 590 unit tests). The digital walk
in both locales, against the local stack. Every state screenshotted at 1280px
and the grid at 393px. `pnpm test:db`: 141 of 142, the one failure being the
alt text this branch adds to `deck.json` and cannot apply to Postgres.

**Not verified.** Nothing on a real phone — the browser-bar question
(section 5.4) is answered by `100svh` and by Lightbox's own fixed positioner,
both of which are arguments rather than measurements. The hosted database:
nothing is pushed, and `pnpm db:sync` refuses from a feature branch, correctly.

**The e2e suite is red on `main` and was before this branch.** Six specs fail
here; the same six fail on `d976bdc` with no changes applied, and two more
besides. Measured in a throwaway worktree rather than assumed. They are not
gated by CI, which runs `pnpm check` and the two bundle builds.
