# /exercises · "Ready to build" · implementation plan

The redesign of the exercise-selection screen in Figma, turned into work for
the repo. **This file is the current state**: update it after every task.

- Source: Layer 1 file `McSA3aXDQXEqGwulfMnliE`, page *Selection screen*,
  section **Ready to build** (`107:2578`), read 2026-11-11 three times (phones
  from the second read, desktop after Ben's update).
  - `88:6593` 393w **A** — goal inline in the sentence
  - `91:7024` 393w **B** — goal alone on the last line
  - `76:4072` 1728w **desktop**
  - `96:8303` a loose IconButton outside every frame — to be deleted (D12)
- Decisions: Ben, 2026-11-11, in chat (D1–D13 below). Nothing is open; the
  interfaces the streams share are frozen below, so wave 1 can start.
- Status words: **open** · **in progress** · **done** · **blocked**.

## Decisions

| # | Decision |
|---|---|
| D1 | The chevrons beside the deck step **cards**. On phones they are CardDeck's own previous/next, moved into the gutters. **Goal stepping leaves the screen.** |
| D2 | The goal control's underline is **`--border-strong`** (3.63:1 light, 4.73:1 dark) at **2px** (`--border-width-thick`), as frames B and desktop draw it |
| D3 | **One target**: text, glyph and underline are one `<button>` that opens the sheet |
| D4 | The new component is **`InlineButton`**. **`InlineLink` is deprecated**; its 6 other call sites move to `InlineButton` |
| D5 | Headline **Lass uns zusammen {goal}**. German purposes: **entspannen · Energie sammeln · Achtsamkeit üben**. The goal *Musie kennenlernen* (`get-to-know-musie`) goes. The default goal is **entspannen**. English to match, and the copy in the *Was brauchst du gerade?* sheet is updated to match |
| D6 | **Secondary** for both the Shuffle button and the deck's card pair (reverses 2026-10-07) |
| D7 | The size names stay (`min · primary · comfort · guided`). **One new size, `sm` (40px), with its own token.** Figma, Storybook and the app follow |
| D8 | *Ziel ändern* opens the **existing** sheet *Was brauchst du gerade?*. Nothing new is built for it |
| D9 | *Ziel ändern* layout: **≥ `--bp-md` in the toolbar row; on phones below the cards** (in flow, not sticky). Desktop keeps the card pair beside the card |
| D10 | The onboarding card says **Musie schlägt dir immer nur drei Übungen vor, damit du einfacher aussuchen kannst.** *Übungen*, and the number is a **parameter = 3**. The pile shows at most three; a **switch *Alle Übungen zeigen*** sits below the pagination dots when the goal has more than three |
| D11 | The onboarding card is the **existing** DeckGuide (the card help brings back). Nothing new: its behaviour changes so it **swipes away left or right like every card**. It stays the deck's `cover`, with no dot and no position |
| D12 | Housekeeping yes: delete `96:8303`; **rename CtaButton to `Button` everywhere** (code, Storybook, docs, Figma) |
| D13 | Q12 (both annotations say "right") is moot after D1 |

## Assumptions (proceeding unless corrected)

- **A1** — The three shown by default are the first three in the goal's existing order.
- **A2** — The switch is not remembered: it resets when the goal changes and on reload. The list view gets the same switch below the list.
- **A3** — *Such mir eine Übung aus* picks from what is shown.
- **A4** — `get-to-know-musie` is **retired, not deleted**. `sessions.goal_id` points at it (`on delete set null`, yet the column is NOT NULL since 2026-10-15), so a delete fails or rewrites history.
  - A `retired` flag hides it, and its `exercise_goals` rows go. Its three exercises (*breathing-score*, *body-scan-soundwalk*, *free-rein*) are all under other goals too, so none becomes unreachable.
  - `relax` takes `sort = 1`, which makes it the default through `defaultGoal()`. No code change for that.
- **A5** — English, British spelling as `en.ts` already uses:
  - purposes *relax · recharge · practise mindfulness*
  - headline *Let's {goal} together*
  - onboarding *Musie only ever suggests three exercises, so choosing is easier.*
  - switch *Show all exercises*

  Proposals; review in the PR.
- **A6** — The sheet's goal labels become the new phrases, capitalised as headings: *Entspannen*, *Energie sammeln*, *Achtsamkeit üben*. The two goals with no *Warum?* text (`why` is null for relax and wake-up) get one, written to `docs/GERMAN-UI-WRITING.md`. Proposals; review in the PR.
- **A7** — With InlineLink deprecated, its 6 call sites take InlineButton's look: `--on-surface` text with the strong underline, no longer terracotta. Legal links keep rendering an `<a>` through `render`.
- **A8** — `sm` goes on **IconButton only**: the help button is what needs 40px, and Button's `min` already draws about 40px tall through its padding. That breaks the rule that the two ladders read identically (`CtaButton.tsx`'s header), so the IconButton note says why.

## Frozen interfaces (wave 0)

The streams build against these, and the screen is drafted against them while the streams run. A change here is a change to every brief.

- **`InlineButton`** (`@musie/design-system`), plus everything base-ui Button takes (`onClick`, `disabled`, `render`, `nativeButton`, `aria-*`):

  ```ts
  interface InlineButtonProps {
    children: React.ReactNode;
    glyph?: LucideIcon;          // trailing, 16px in a 24px box
    inset?: 'inline' | 'none';   // default 'inline': 4px padding, −4px offset (a2–a4)
    className?: string;
  }
  ```

  Underline: `--border-strong` at `--border-width-thick`, under text and glyph.
- **`CardDeck`**: `navActions` is **removed**. There is a new optional `onCoverDismiss?: (direction: 'previous' | 'next') => void`, called when the cover leaves. The card pair turns secondary, and the phone gutter strips are internal, with no prop.
- **`IconButton`**: `size` gains `'sm'`. The token is `--target-sm: 40px`, staged in `musy-foundations-amendments.css` as gap **G6** (G4 and G5 were taken), and mirrored into the Figma Dimension collection as `target/sm`.
- **i18n keys** (S4 owns them, DE and EN):
  - `exercises.headline.together` — *Lass uns zusammen {goal}* / *Let's {goal} together*
  - `exercises.headline.none` — rewritten to work with a verb phrase
  - `exercises.guide.count` — with `{count}`
  - `exercises.showAll` — *Alle Übungen zeigen* / *Show all exercises*
  - **deleted:** `exercises.headline.one`, `exercises.headline.other`, `exercises.goal.previous`, `exercises.goal.next`
- **Database**: `goals.retired boolean not null default false`, and `getGoals` returns only unretired goals. Rule 2: check whether `goals` has column-level grants. If it does, the new column needs its own grant to `authenticated` and `service_role`.
- **App constant**: `SUGGESTED = 3` in `routes/Exercises.tsx`; the main session owns it.

## The annotations, verbatim

All 13 are uncategorised; duplicates across frames collapsed.

| # | On | Text | Meaning for the code |
|---|---|---|---|
| a1 | goal text, all 3 frames | *create a new component* | `InlineButton` (D4) |
| a2 | goal text, B + desktop | *If no text left or right: padding = 0* | Inline padding is conditional |
| a3 | goal text, A | *4px padding left and right if text left or right* | The other half of a2 |
| a4 | goal content, A | *x-4 positioning to balance out the extra space from the underline* | The control shifts −4px so its text lines up with the sentence; the underline overhangs by 4px |
| a5 | underline, B + desktop | *iterate the inline link component to match this!* | Superseded by D4: InlineLink is deprecated, not iterated |
| a6 | the toolbar's icon-only button, all 3 | *hier einen Fragezeichen-Icon* | That button is help (HelpCircle), moved from the deck into the toolbar |
| a7 | deck-side chevrons, B | *the action is triggered over tapping on the right side next to the card step over the whole width of the stack* | The card pair's hit area on phones is the whole gutter strip at the stack's height |

## What changes, block by block

Against `apps/web/src/routes/Exercises.tsx` and `exercises.css` on `main` at `1fe3612`.

| Block | Today | Target |
|---|---|---|
| Greeting | Same colour as the heading | *Guten Morgen.* in `--on-surface-muted`; still one `h1` |
| Headline | *Hier sind {count} Übungen zum {goal}* in an `InlineLink` with a sliders glyph and two goal chevrons | *Lass uns zusammen {goal}* with `InlineButton`: `--on-surface`, ListFilter 16px in a 24px box, strong underline, 4px inset, −4px offset. No count, no chevrons |
| Goals | Four, *Musie kennenlernen* first and default | Three: *entspannen* (default) · *Energie sammeln* · *Achtsamkeit üben* |
| Toolbar | Shuffle (outline, min) · Stapel/Liste | Shuffle (**secondary**) · *Ziel ändern* (secondary, ListFilter; ≥ `--bp-md` only) · help (secondary icon-only, new 40px size) · Stapel/Liste |
| Deck chevrons | Card pair (outline) + help (ghost); beside the card on desktop, under the card on phones | Card pair (**secondary**), no help. Desktop: beside the card, bottom-aligned. Phones: ghost chevrons in the two gutters at mid-height, hit area the whole strip |
| Pile size | Every exercise of the goal (3, 6 or 8) | **At most three**; switch *Alle Übungen zeigen* below the dots when the goal has more |
| *Ziel ändern* on phones | — | Below the cards, in flow; opens the existing sheet |
| Onboarding card | Two gesture rows + *Zum Fortfahren drücken*; dismissed by any press; never moves | Adds the count sentence first. **Swipes away left/right like a card**. Help brings it back as before |
| Sheet *Was brauchst du gerade?* | Labels *Entspannung / Energie / Achtsamkeit*; one *Warum?* text | Labels and *Warum?* texts rewritten to match the new goals (A6) |

## Tasks

| # | Task | Stream |
|---|---|---|
| T1 | `InlineButton` in Layer 2: inherits type; `--on-surface`; optional trailing glyph (16px in a 24px box, 4px gap); persistent underline in `--border-strong` at `--border-width-thick`; `inset` prop (a2/a3/a4); one `<button>` on base-ui Button, forwarding `aria-*` and `render`. States from InlineLink. Tokens only, `musy-` classes, `data-force` hooks, stories, `reference/design_system/docs/07-components.md` | S1 |
| T2 | **Deprecate InlineLink**: `@deprecated` JSDoc pointing at InlineButton, its stories under *Deprecated/*. Migrate LegalLinks ×2, SessionReflect, SignInGate ×3 (A7). Remove it once nothing imports it — which is after S1 plus Exercises | S1 |
| T3 | CardDeck: on phones the card pair becomes two gutter strips (ghost chevron at mid-height, hit area the strip; a press there never starts a drag); ≥ `--bp-md` unchanged in place. The pair turns **secondary** (D6) | S2 |
| T3b | CardDeck: delete `navActions` (its only caller, help, moves to the toolbar). Precedent: accent-alt | S2 |
| T3c | CardDeck: the `cover` takes the cards' drag, thresholds and fling, leaves left or right, and calls a new `onCoverDismiss`. The card pair, the arrow keys and the gutters move it too. Reduced motion as for cards. Story: a deck with a cover, swiped both ways | S2 |
| T4 | New size `sm` (D7, A8): `--target-sm: 40px` as gap G6 in `musy-foundations-amendments.css`; `musy-icon-btn--sm` (20px glyph, like `primary`); the `IconButtonSize` type; `verify-tokens`; the Sizes story gets the fifth rung; `reference/design_system/docs/07-components.md` | S3 |
| T5 | Migration `2026111…_three_goals.sql` (never edit `20261015140000`, rule 4): DE/EN `purpose` and `label` per D5/A5/A6, `why` for relax and wake-up, `goals.retired` + retire `get-to-know-musie` + drop its `exercise_goals` rows (A4), `relax` sort 1, column comment for `purpose` (now *after "Lass uns zusammen"*). `getGoals` filters retired. Update `goals.test.ts`, `db.content.db.test.ts` | S4 |
| T5b | Chrome keys in `de.ts`/`en.ts` (rule 6, one owner): headline *Lass uns zusammen {goal}* (and its empty case), `exercises.guide.count`, `exercises.showAll`; delete `exercises.goal.previous`/`next` and the count forms | S4 |
| T6 | Screen: greeting span; headline with `InlineButton`; remove goal stepping (`step`, `goalSteps`), keep the polite live region (the new *Ziel ändern* path needs it) | main |
| T7 | Screen: toolbar order and variants (D6), help (new size) → `setGuide(true)`, *Ziel ändern* in the toolbar at ≥ `--bp-md` and below the cards on phones (D9), opening the existing sheet with its own rect as `origin` | main |
| T8 | Screen: cap at `SUGGESTED = 3` (A1), switch *Alle Übungen zeigen* (DS `Switch`) below the dots when more than three (A2), Shuffle picks from what is shown (A3) | main |
| T9 | Screen: DeckGuide gets `exercises.guide.count` with `numberWord(SUGGESTED)` first; wire `onCoverDismiss` to `closeGuide`; *Zum Fortfahren drücken* stays, since a press still dismisses it | main |
| T10 | Rename CtaButton → **`Button`** everywhere: component, file, export, Storybook title, docs, app imports, CLAUDE.md wording. Inside the design system, base-ui's own `Button` import gets an alias. CSS classes (`musy-btn`) are already neutral and stay | S6 |
| T11 | Figma: delete `96:8303`; rename the set `button` → `Button`; the `Size=sm` variants on IconButton (20 more, all states) with a `target/sm` variable; `InlineButton` component measured from the rendered CSS | S5 / main |
| T12 | Verify (below), append D1, D2, D5, D6, D10, D11 to `apps/web/OPEN-QUESTIONS.md`, open the PR | main |

## Getting there faster with subagents

### What stays in the main session, and why

- **The database.** There is one local Supabase stack (rule 9): `supabase db reset` and `pnpm test:db` from two agents would apply each other's migrations.
- **The running app.** There is one port 5173, so screenshots and the Playwright walk happen in one place.
- **`Exercises.tsx`, `DeckGuide.tsx`, `exercises.css`.** Everything converges on this one screen. Two writers there is a merge, not a speed-up.
- **Figma writes.** Sequential by the Figma skill's own rule.
- **Merging and checking each stream's diff.** An agent's summary can be confidently wrong, so its Storybook and diff get looked at before the merge.

### What fans out

Writing subagents run with `isolation: "worktree"`, each in its own checkout cut from the same commit. Each owns a disjoint set of files, runs **no** database command and **no** dev server, and is done when `pnpm check` is green in its worktree and its stories exist.

A subagent knows only its brief (rule 9: it inherits the directory, not the conversation). So each brief restates the decisions it needs, the files it owns, the files it must not touch, and the shared interfaces frozen in wave 0.

| Stream | Tasks | Owns | Must not touch | Blocked by |
|---|---|---|---|---|
| **S1** InlineButton | T1, T2 | `InlineButton.tsx`, `InlineLink.tsx`, their stories, the InlineLink/InlineButton sections of `musy-components.css`, `index.ts` (one export line), `LegalLinks`, `SessionReflect`, `SignInGate`, `reference/design_system/docs/07-components.md` (InlineButton entry) | `Exercises.tsx`, i18n, CardDeck | — |
| **S2** CardDeck | T3, T3b, T3c | `CardDeck.tsx`, its stories, the deck section of `musy-components.css` | IconButton, app files | — |
| **S3** New size | T4 | `musy-foundations-amendments.css`, `IconButton.tsx`, the icon-button section of `musy-components.css`, `verify-tokens`, IconButton stories, `reference/design_system/docs/07-components.md` (IconButton entry) | `CtaButton.tsx`, app files, i18n | — |
| **S4** Goals and copy | T5, T5b | `supabase/migrations/2026111…`, `lib/goals.ts` (+ tests), `db.content.db.test.ts`, `i18n/de.ts`, `i18n/en.ts` | DS, `Exercises.tsx` | — |
| **S5** Figma (if subagents reach the Figma connector here; otherwise main) | T11 | the Layer 1 file; a CSS harness on a port other than 5173/6006/54321 | the repo | S1, S3 merged |
| **S6** Rename | T10 | everything named `CtaButton` | — | wave 2 merged |

`musy-components.css` is touched by S1, S2 and S3, in different sections. The hunks do not overlap, so git merges them; the main session resolves anything that does.

### The waves

1. **Wave 0 — main, short.**
   - ~~Answer the open questions~~ (done) and ~~freeze the interfaces~~ (done, above).
   - Cut `feature/exercises-ready-to-build` from `origin/main`.
   - Commit this plan as the branch's first commit, so every worktree starts from it.
2. **Wave 1 — four subagents at once: S1, S2, S3, S4.**
   - The main session meanwhile does the Figma housekeeping that needs no code (delete `96:8303`, rename the set).
   - It also drafts T6–T9 against the frozen interfaces.
3. **Wave 2 — main.**
   - Merge S4 → S3 → S1 → S2, checking each diff and its Storybook first.
   - `supabase db reset` + `pnpm test:db`.
   - Finish T6–T9 in `Exercises.tsx`, then `pnpm check`.
   - Dev server, Playwright walk at 393 and 1440, side-by-side screenshots against the three frames.
   - S5 runs in parallel once S1 and S3 are in.
4. **Wave 3 — S6, one subagent, mechanical.**
   - CtaButton → Button across the merged branch, then `pnpm check`.
   - It runs last because it touches every file the others touch: done first, it would force all four streams to rebase.
5. **Close-out — main.** T12.

### What it buys, and what it costs

- **Buys:** four independent pieces that would otherwise run one after another — the component, the deck gesture work, the token, and the data and copy — run side by side. The Figma housekeeping and the screen draft overlap them. The critical path becomes wave 0 → the slowest of S1–S4 (likely S2, the gesture work) → integration → the rename → verification.
- **Costs:** four to six agents' tokens, and a merge step the main session must take carefully. Nothing here runs two database or dev-server commands at once, so the rule-9 traps stay closed. Nothing waits on a question any more: S1–S4 can start together.

## Verification

- `pnpm check` (rule 8); `pnpm test:db` for the migration.
- Storybook:
  - `InlineButton` in every state and both themes
  - the six migrated call sites
  - CardDeck at phone and ≥ `--bp-md`, with a cover swiped both ways
  - IconButton's new `sm` rung (40px) in every variant and state
- The app at 393 and 1440 (check what holds :5173 first), compared side by side with `88:6593`, `91:7024` and `76:4072`.
- By hand:
  - the default goal is *entspannen*
  - the sheet lists three goals and no *Musie kennenlernen*
  - *Entspannen* (6) and *Achtsamkeit üben* (8) show three plus the switch; *Energie sammeln* (3) shows no switch
  - the switch reveals all, and resets on goal change
  - *Ziel ändern* sits in the toolbar at ≥ `--bp-md` and below the cards on a phone, and opens the existing sheet
  - the live region speaks after a goal change
  - a gutter tap steps the card, and a swipe still browses
  - the onboarding card shows *drei*, swipes away both ways and returns via help
  - German hyphenation under `lang="de"` (rule 5); dark theme; reduced motion
- After S6: no `CtaButton` left in `apps/`, `packages/` or `docs/` outside history notes.

## Out of scope

The goal-chip row (drawn, then removed). Any change to card faces or the list view beyond the switch.
