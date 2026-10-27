# The exercise model

**What an exercise is, as one file a person can read and a program can check.**

Written 2026-10-21. The argument is below; the contract is
`apps/web/src/lib/exerciseConfig.ts` and
`supabase/content/exercises/exercise.schema.json`; the tool is
`/exercise-builder`.

---

## What was wrong

An exercise is not a monolith *per exercise*. It is worse: **"what an exercise
is" was spread across four locations that cannot be read together**, so nothing
could validate that the four agreed — and they did not.

1. **Database columns** — `public.exercises`: `timeframe_min`, `timeframe_max`,
   `needs_cards`, `needs_sound`, `image_url`, `implemented`, `sort`,
   `listen_gate_seconds`, `kind`, `asks_posture`, `cards_dealt`.
2. **Code constants** — `lib/exerciseKind.ts` holds the step list per kind, the
   postures, the endings and their defaults; `content/questions.ts` holds
   `QUESTION_SETS`, **keyed by exercise id**.
3. **Component conditionals** — `SessionListen.tsx` draws the card visual on
   `kind === 'card_based'` and hard-codes one `INFOGRAPHIC_SRC` for all five;
   `Session.tsx:418` derives `asksHowToListen` from the kind; `ScanLink.tsx:128`
   refuses a deep link unless the kind is `card_based`.
4. **Content tables** — `exercise_i18n`, `exercise_cuts`, `exercise_tracks`,
   `exercise_goals`.

### Three holes, all of them live when this was written

- **`free-rein` has no `reflect_placeholder`** and its sibling does. Nothing
  caught it, because no artefact said what `free-rein` needed.
- **The listening exercises have English text and German-only recordings.**
  `exercise_cuts` held three rows, all `de`. The text is bilingual; the audio
  is not, and nothing related those two facts.
- **Achtsame Pause's intro tells a digital run to lay cards on a table.**
  `intro_md` reads *"Zieh fünf zufällige Karten und leg sie vor dich"*, and
  `SessionIntro.tsx:151` renders it with no mode branch. The button beside it
  already knows better.

Each of those has a test in `lib/exerciseConfig.test.ts`, named after the thing
it catches.

## The constraint, and the line this draws

`exerciseKind.ts` states the objection: **the step set is code, not data** —
"a step is a React screen, so a step list in a content table could promise a
screen that does not exist, and a content edit could empty a run."

That is correct, and the repository had already answered the general version of
it in the direction of config: `NO_POSTURE_QUESTION` was a hard-coded exercise
id for about three hours on 13 October before becoming `exercises.asks_posture`.
Its replacement comment draws the line this model follows:

> *a step is a screen; a feature is a control the screen already has.*

So:

| Stays code | Becomes config |
|---|---|
| `STEP_IDS` — the step library | which of them this exercise runs |
| `POSTURES`, `ENDINGS` and their glyphs | whether each is asked, and what is preselected |
| what each screen can do (`STEP_FEATURES`) | which of those things this exercise does |
| a recording's own facts | which answers the exercise expects to be servable |

A config may name **only** features the app enumerates. An unknown feature is a
validation error, never a screen that renders nothing.

## The shape

```jsonc
{
  "id": "mindfulness-cards",
  "kind": "card_based",
  "implemented": true,
  "modes": { "offers": "both", "default": "analogue" },
  "catalogue": { "sort": 1, "timeframeMinutes": { "min": 2, "max": 12 },
                 "cardsDealt": 5, "artwork": "…", "goals": ["mindfulness"] },
  "library": { "de": { "name": "Achtsame Pause", … }, "en": { … } },
  "run": [
    { "step": "intro",  "features": ["mode_switch", "needs_note"], "copy": { … } },
    { "step": "scan",   "mode": "analogue", "features": ["card_scan_camera", …] },
    { "step": "select", "mode": "digital",  "copySource": "chrome", … },
    { "step": "listen", "gateSeconds": 90, "features": [ … ], "questions": { … } },
    { "step": "reflect","features": ["mode_text", …] }
  ],
  "content": { "locales": ["de", "en"], "textLocales": ["de", "en"] }
}
```

### Two runs, written once

A card exercise that offers both modes carries `scan` tagged **analogue** and
`select` tagged **digital**, in one `run` array. That is not a run with two
second steps — it is two runs written once, the way `stepsForRun` substitutes
rather than branching.

So the "same slot" rule is checked on each **resolved** run and never on the
array. Checking the array refuses exactly the file every card exercise has to
have, which is how that rule read for its first half hour.

### The cut matrix references, it does not restate

`exercise_cuts` is written by `pnpm music:migration` from `music.json`. A config
that also carried `mixed_src`, `duration_seconds` or `intro_until` would be a
second writer of one table — precisely the overlap CLAUDE.md 4.1 removed from
`music:migration` when it took the `tracks` half out.

So `cuts.expects` names the **answer matrix** in the table's own vocabulary,
with `any` for its nulls, and `validateConfig` resolves each entry through
`pickCut`'s rules. The recording's facts stay with the recording.

### `copySource: "chrome"` is a hole, stated

`select` and `view` have **no content columns**. There is no `select_md`, no
`view_md`; every word they show is a `MessageKey` in `i18n/*`, and
`session.select.headline` is *Wähle eine Karte aus* — which is also the `##`
heading of `scan_md`. The same headline, twice, in two systems, one editable
and one not.

Their copy is therefore expected to be empty and the content rules skip them.
Without that the builder opened on four red errors no therapist could resolve,
and a panel that is red on arrival is a panel nobody reads. Moving that copy out
of chrome is what makes these steps editable, and it is what deletes this field.

## `/exercise-builder`

A tool route: `lazy`, `wide`, linked from nowhere, reachable only by typing the
path — the same shape as `/goal-mappings` and `/maintenance`. It is behind the
sign-in gate like every other tool, so a therapist needs an account
(`node apps/web/scripts/create-tester.mjs …`).

**It writes nothing.** Ben, 2026-10-21: *"The therapist can never push this to
the db, but only download a config file per exercise and hand this over to
me."* It reads the live tables, lets the copy be edited in the browser, and
emits a file. No insert, no update, no `admin_write`, no Edge Function.

That is not a limitation waiting to be lifted by accident. `exercise_i18n` has
no update policy for `authenticated`, so a client write would be refused by the
privilege check before RLS was consulted; this screen does not try. When saving
arrives it arrives as a decision — through `admin_write` and `content_edits`,
with an operator's name on it — not as a button somebody added here.

### What a therapist can change

- the library card: name, description, what to have ready, picture description
- every step's **headline** and **text**, in both locales
- the reflect step's placeholder
- **whether the listen step rotates questions at all, and their texts** — for
  every exercise, listening ones included (Ben, 2026-10-21: that is a clinical
  judgement about a particular exercise, not a rule in the code)

### What it will not let them change

Which steps a run has, which features are on, the cut matrix, the timeframes.
Those are read out of the database and **shown**, because a config states them
and the therapist should see what they are handing over — but changing them is
changing what the app does.

### The preview is the real screen

The left column is a phone-width frame holding the step itself: the real
`ContentBox` + `InteractiveWizard` + `WizardPanel` shell from `Session.tsx`,
with `SessionIntro`, `SessionScan`, `SessionSelect`, `SessionView`,
`SessionListen` or `SessionReflect` inside it. Not a drawing of the step — the
step. Safe because five of the six are pure, `SessionListen` writes only from
its play handler, and `CardScanner` has no mount effect so no camera is ever
requested.

The rail doubles as the step picker: `InteractiveWizard` already takes
`onStepChange`, so the control that chooses a step is the one people will be
watched using, and there is no second row of buttons beside it.

**Three things had to be put back inside the frame**, and all three are the
same bug: Layer 1 drives them off `@media`, which is the window, and a
container query cannot reach a custom property a media query already resolved.

| Pinned on the frame | Why |
|---|---|
| `--gutter`, `--columns`, `--grid-gap` | on a 1440px desktop the preview inherited the 1280px gutter and drew phone copy at desktop spacing |
| `--viewport-block` | the listen step is a scroll-snap pager measured in `--view-block`; without a height it stopped snapping and stacked to 3,328px |
| `LocaleContext` | the app's locale is the therapist's account, the copy's is the picker — left alone, German copy rendered under an English rail |
| `compact` on the wizard | the rail collapses below `--bp-md`, and that is a media query too: in a 393px frame inside a 1440px window every label rendered and the markers sat on top of the words |

The wizard's own prop documents this case exactly — *"force the collapsed run
inside a narrow container, which no media query can see"* — so that one needed
no CSS, only passing.

**The frame is 393 × 852**, the iPhone 16's CSS viewport and the preset Chrome
DevTools opens under that name. Those two numbers are deliberately not tokens
and not arithmetic over one: they describe a device the design system has no
opinion about, and deriving 393 from `--bp-sm` would be a sum that looked
principled and meant nothing.

Its border sits where the screen edge sits and it carries no padding of its
own, because everything inside sizes against its container: with
`--space-inset-card` on the frame the rail lost 22px and clipped a step the
real screen does not clip.

### She describes the change; only the words move

`/exercise-builder` carries a prompt box. She writes what should be different,
and `supabase/functions/exercise-prompt` rewrites the copy — **Claude Opus 5**,
chosen on quality rather than price: at this volume the gap between the
cheapest and dearest model is about a coffee a week, and the text reaches
patients.

**The boundary is the function, not the model.** The request carries the TEXT
fields only, flattened to path → string. The model never sees `features`,
`run`, `modes`, `cuts` or `gateSeconds`, so it cannot return an edit to them.
Anything structural she asks for comes back in `declined` and is written into
`handover.requests` instead — so the ask survives even when nothing was done
about it.

Three gates, in order: the function hands out only text paths; it drops any
path it did not hand out; and the browser re-checks every returned path with
`classifyPath` before applying it. The last one wins, which is what makes the
two copies of the allowlist safe to drift.

### Auto-translate follows the edit, in one direction

Finish a German field and its English twin is rewritten; finish an English one
and the German is. **The generated side does not itself trigger a translation
back.** Two fields that regenerate each other mean the last edit always wins
and silently destroys the other side, which is not what "and vice versa" asks
for.

It fires on blur, not on change — a model call per keystroke would be a call
per letter, and would translate half-written sentences. Every machine-written
path is listed in `handover.machineTranslated`, because CLAUDE.md rule 6
already calls content translations provisional and this says *which ones*.

### The handover block, and why it is the second key

```jsonc
{
  "$schema": "./exercise.schema.json",
  "handover": {
    "safeToApply": false,
    "blockers": ["run[3].features: -rotating_question -question_helper_ladder"],
    "baseline": { "takenAt": "2026-10-27T10:01:14.972Z" },
    "changes": [ { "path": "…", "kind": "text", "before": "…", "after": "…", "by": "hand" } ],
    "requests": [ { "at": "…", "prompt": "Mach daraus zwei Schritte", "applied": false } ],
    "machineTranslated": ["run[1].copy.en.bodyMd"]
  },
  "id": "mindfulness-cards"
}
```

Second, and the object is rebuilt rather than spread to keep it there:
`safeToApply: false` at the bottom of six hundred lines is a flag nobody meets
until after they have decided. The filename says it too — a config with a
blocker downloads as `<id>.NEEDS-REVIEW.json`.

**`changes` is a diff, not a log of keystrokes.** A field typed, cleared and
retyped is one net change. Only the PROVENANCE — hand, prompt, or translation
— is carried alongside, because that is the one thing a diff cannot recover.

**A list of words is one fact.** `features`, `goals` and `locales` are sets, so
they are compared whole and summarised by what moved. Walking them by index
turned "two features switched off" into three entries that each looked like a
rename, which was true of the array and false about the exercise.

### The line is drawn on the effect, not the field

`library.de.needs` is a TEXT field — and empty means `needs: null`, from which
`needs_note` is derived. Clearing a sentence switches off a feature.

That lands in the change log as a structural change to `run[0].features`,
because the classification asks what the config SAYS after the edit rather
than what she aimed at. `validateConfig` reports the same thing on the field
she can actually fix.

### The headline split

`exercise_i18n.<step>_md` is one Markdown string whose first line is a `## `
heading. To the person writing it those are two different things, and a heading
typed as `###` by accident is a bug nobody sees until it ships. `splitHeadline`
lifts it out, the builder edits two fields, and `joinHeadline` puts it back for
the preview — which renders through the **same `Markdown` component the step
uses**, so what is on screen is what the step draws.

The round trip is exact for every row in the database today, which
`exerciseConfig.test.ts` asserts against real copy. It is *not* identity for
arbitrary Markdown and does not pretend to be.

## What is not built

- **Nothing reads a config at runtime.** The app still runs off the tables.
  These types describe an artefact.
- **There are no committed configs and no `pnpm exercises:export`.** A `.mjs`
  script cannot import `content/questions.ts`, and making it importable means
  moving the copy into JSON and giving up the `Record<QuestionId, QuestionText>`
  completeness check. The builder assembles configs in the browser instead,
  where both the database and `questions.ts` are ordinary imports. Logged in
  `apps/web/OPEN-QUESTIONS.md`.
- **`exercise_i18n` is still columns, not rows.** Per-step, per-mode,
  per-locale copy needs one row per `(exercise, step, locale, mode)`. That is
  schema, so CLAUDE.md 4 applies untouched: new migration, new timestamp,
  `pnpm db:sync`.
- **`QuestionId` is still a closed union.** `'lq-01' | … | 'lq-05'`, with
  `Record<QuestionId, QuestionText>` leaning on it. A therapist cannot write a
  sixth question until that goes. The config's ids are already plain strings
  scoped to their set, so the contract is ready and the app is not.
- **`skip_intro` and `mute_background` share one slot.** `SessionListen.tsx`
  states in a comment that the two controls can never appear together — true of
  today's two recordings and enforced by nothing. `validateConfig` warns rather
  than erring, and names the comment it is protecting.
