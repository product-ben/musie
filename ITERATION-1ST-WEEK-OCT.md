# Iteration · user testing, first week of October

Branch `1st-week-oct-usertesting-improvements`. Source of scope: Ben's to-do list
(2026-10-09). Source of *why*: the FigJam board **Usertesting End September**,
`oAmp67a6gX9gbItLVYzNvX` — 356 stickies, read in full before planning.

**Nothing outside the to-do list is acted on.** The board carries curated
*Do not act*, *Bad idead Claude!* and *Already resolved* columns; they are
honoured, and where the to-do list overrides one, the override is recorded below
under *Rulings*.

---

## How to test

One dev server, one Storybook. Check what is already on the port before
believing a result (CLAUDE.md rule 9):

```
pnpm --filter web dev        # http://localhost:5173
pnpm storybook               # http://localhost:6006
```

`apps/web/.env.local` currently points at the **hosted** Supabase project, not
the local stack — so the data you see is hosted. Swap the two blocks in that
file to go local.

| Screen | How to reach it |
|---|---|
| Exercises | http://localhost:5173/exercises |
| Listen · stage | start any exercise → scan a card (type `MC-01`) → listen |
| Listen · Störer | on the stage, press *Über die Musik* and scroll one view |
| Listen · focus sheet | on the stage, press the transport |
| Reflect | from the listen step, press the forward CTA |
| Diary | http://localhost:5173/diary |
| Diary entry | http://localhost:5173/diary → press any entry |
| Scan (typed) | in a session's scan step, choose *Code eingeben* |

Storybook links are filled in per item as they land.

---

## Status

Legend: ☐ not started · ◐ in progress · ☑ landed (`pnpm check` green) · ⊘ blocked

### Phase A · Design system — first, because the app consumes it

| | Item | Status | Test |
|---|---|---|---|
| A1 | `TrackButton` — four states, the number inside the label | ☑ | [Storybook · Gated states](http://localhost:6006/?path=/story/components-trackbutton--gated-states) |
| A2 | `FeelingsScale` — new ordinal component + stories | ☑ | [Storybook · Feelings Scale](http://localhost:6006/?path=/docs/components-feelings-scale--docs) |
| A3 | Actionless toast capped at `--measure-body` (§23) | ☑ | [Storybook · Toast](http://localhost:6006/?path=/story/components-toast--default) · compare with `--with-undo` |

### Phase B · One German word for the music

| | Item | Status | Test |
|---|---|---|---|
| B1 | Chrome catalogue → **die Musik** (~12 keys, both locales) | ☐ | |
| B2 | Content strings in a new stacking migration | ☐ | |

### Phase C · Session flow

| | Item | Status | Test |
|---|---|---|---|
| C1 | `warnBack` → *Zurück zum Hören* | ☐ | |
| C2 | Gate passed → swap to the reflect CTA | ☐ | |
| C3 | One clock on the stage — **absorbed into A1**; the app passes `gateSeconds` + labels | ☐ | |
| C4 | Focus-sheet copy: minutes and seconds said correctly | ☐ | |
| C5 | `session.close` hidden on reflect only | ☐ | |
| C6 | One way out: *Session im Tagebuch speichern* + completion modal | ☐ | |
| C7 | *Transkribieren*, and `privacy.voiceShort` finally rendered | ☐ | |
| C8 | Glyphs: rail scan → `ScanQrCode`, reflect → `Quote` | ☐ | |

### Phase D · Scan

| | Item | Status | Test |
|---|---|---|---|
| D1 | `codeHint` names the back of the card | ☐ | |
| D2 | Drop the `MC-01` placeholder and its key | ☐ | |

### Phase E · Card names — display only

| | Item | Status | Test |
|---|---|---|---|
| E1 | Strip the feeling from the two composed labels | ☐ | |
| E2 | Drop the card fact from the diary | ☐ | |

### Phase F · Diary

| | Item | Status | Test |
|---|---|---|---|
| F1 | `SAVED_TOAST_MS` 6000 → 10000 | ☐ | |
| F2 | Graph named as a record; the week shown visibly | ☐ | |
| F3 | Week paging animated; timespan beside the chevrons | ☐ | |
| F4 | Empty day cells fade out to the top | ☐ | |

### Phase G · The feeling, recorded

| | Item | Status | Test |
|---|---|---|---|
| G1 | New stacking migration on `sessions` | ☐ | |
| G2 | Write path in `lib/session.ts` | ☐ | |
| G3 | Exposed in the diary | ☐ | |
| G4 | Database tests | ☐ | |

**Phase G needs Ben's own commands.** `supabase db reset`, `supabase db push`
and `pnpm gen:types` are denied to the agent (rule 9 — one shared stack, every
worktree drives the same containers). The order is
`db reset` → `pnpm test:db` → `pnpm gen:types` → `db push`.

---

## Rulings taken while building

**A1 absorbed C3.** The minimum is the consumer's concept, so `TrackButton`
takes `gateSeconds` and does the choosing between three label templates. The
number then lives IN the word, which suppresses the trailing `.musy-mbtn__time`
readout **by construction** — the two-clocks item needed no separate flag, and
`hideTimer` is untouched for the ungated button. The board's standing rule is
satisfied at the same time: "any fix for 1:376 goes on the button."

**The minimum is said unpadded.** `trackClock` pads to `01:30` so a trailing
readout never changes width crossing a minute — an argument about a fixed
COLUMN. A gated label has no column; its whole text changes between states. So
gated labels use `spokenClock` (`1:30`), which is both Ben's written spec and
how a minimum is said out loud. Seconds stay padded: `1:5` is not a time.

## Rulings taken before building

**The Störer's forward button.** The board carries a *Do not act*: "Do not put
'Start reflection' on the Störer or in the details view… A second forward
control re-creates the exact split that was removed." Action A6 — and the
to-do list — ask for exactly that. Read as compatible: the do-not-act forbids a
second control standing *beside* the back button; this **swaps** one for the
other, so there is never more than one. Ben confirmed 2026-10-09.

**The feelings scale is not a `SegmentedControl`.** Rule 1 says use the system's
component where one exists, and `SegmentedControl` is specified for "two to four
options, each with an icon AND text". Ben's ruling: a segmented control switches
*views*; a scale measures an *ordinal position*. Different semantics, so a
component of its own, and the distinction goes in its header.

The board also carries "do not build a feelings picker" — ruling on how to
scaffold the reflection *questions*, not on recording state for the diary. The
to-do list puts the scale in scope; it is in.

**No new placeholder token.** A placeholder ink lighter than
`--on-surface-muted` lands below 4.5:1 — there is no sand step between 9 and 11
solved as text, and `--on-surface-muted`'s own comment already claims
placeholder duty. Layer 1 is `[LOCKED]`, so it would have gone to the
amendments file and forced a `TOKEN-DRIFT.md` edit. Dropped, with the scan
placeholder going away regardless.

**Card names: display only.** `card_i18n.feeling` is `not null`, `deck.mjs`
refuses an empty feeling, and `deck:pdf` prints the feeling word on the physical
front of MC-06…MC-09, which have no artwork master. Emptying the data would
print four blank cards. Four render sites change; no migration.

---

## Blocked

**Show the scanned card in the diary entry.** There is no card image to show.
`cards.image_url` is `assets/web/method-card.png` for all nine cards and that
file **has never existed**; `public/assets/web/` holds only `exercises/`,
`infographics/` and the logo. The print masters in `artwork/cards/` cover
**MC-01…MC-05 only** and are outside `public/`.

Needs either four more artworks plus a web rendition pass, or a decision to show
it for the five that exist. Left out of this iteration.

---

## Log

| When | What |
|---|---|
| 2026-10-09 | Plan agreed; board read; rulings above taken. |
| 2026-10-09 | **A2 landed.** `FeelingsScale` — ordered points on a drawn axis, base-ui radio group, 3–5 points, no default copy. Verified in both themes; selection carried by fill + edge weight + ink. |
| 2026-10-09 | **A3 landed.** `data-has-action` on the toast root; actionless caps at `--measure-body` (496px measured), action-bearing stays `--measure-heading` (208px). |
| 2026-10-09 | **A1 landed.** `gateSeconds` + three gated label templates on `TrackButton`; `TrackGateState` exported. Verified in Storybook: all four words render and **zero** trailing readouts remain. |
