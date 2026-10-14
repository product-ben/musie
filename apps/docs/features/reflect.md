# Reflecting

Step 4. Three ways to answer, two of which work, and one way **not** to answer
that is a real answer. The reflection is always text, however it was entered.

```mermaid
flowchart TD
  M{"mode"} -->|"text"| T["a box · hasAnswered when non-blank"]
  M -->|"voice"| V["live transcription → statements<br/>hasAnswered when there are words"]
  M -->|"photo"| P["an interactive MOCKUP<br/>produces nothing to store"]
  T --> B[("reflections.body · not null")]
  V --> ST[("reflection_statements<br/>one row per statement, in order")]
  ST -->|"joinStatements() on every write"| B
  P -.->|"Finish stays disabled, and says why"| X["nothing"]
  S["Skip reflection"] --> F["session finished,<br/><b>no reflections row</b>"]
```

::: designers
## Three doors, and two of them open

| Mode | State |
|---|---|
| **Write** | works |
| **Speak** | works — live transcription, editable afterwards |
| **Photograph** | an interactive mockup. It says so where the answer would go |

**Each mode announces its own limit**, which is honest rather than
obstructive. The alternative was hiding what the product has already decided
on, which would make the screen look finished and be less true.

## Photo and voice are one feature with two front doors

**Both produce words; neither produces a file.** That is why there is no column
for media anywhere, no storage bucket for it, and why the database already
allows all three mode values although one is unbuilt.

**The absence is the design.** "We never keep your recording" is a fact about
the schema, not a promise about behaviour.

## Declining is an answer, and it sits in the action row

*Skip reflection* is **not a fourth segment** next to the three modes. Three
ways to answer and one way not to answer are different kinds of choice, and a
fourth segment would make refusal look like a method of answering.

It is not under the group either, which is where it started. *Skip reflection*
is a way **out** of the step, and the step's ways out are the action row: it
sits beside *Finish session* as the alternative to it, which is what it
actually is.

## A declined reflection still finishes the session

Decided 2026-09-19. The row is `finished` with **no reflection beside it**,
which the schema already allows: the body cannot be empty, so "no answer" can
only be expressed as *no row*.

You did the exercise. Whether you wrote anything down is a separate fact, and
the diary already reports it on its own.

## The privacy copy sits at the control it is about

Not collected on one page. Three promises, three placements:

- beside the record button — *Musie keeps the text, never your voice*;
- on the written mode;
- on the photo mode.

That placement is what user testing argued for. A single page stating all of it
at once existed and was deleted on 2026-10-13, copy included — if it comes back
it is a screen, not a string.

## What user testing said about the spoken mode

**All five participants** said the automatic splitting of speech into separate
statements was unwanted and jarring, and that plain text would be fine. **Two**
loved the drag-to-combine gesture — which only exists *because* of the
splitting, since combining is the repair for a split nobody asked for.

That is scoped work, not done: see [Backlog](/work/backlog) B1.
:::

::: devs
## Files

| | |
|---|---|
| `components/SessionReflect.tsx` | the step, the three modes |
| `components/VoiceTranscript.tsx` | the transcript editor, and the write |
| `lib/reflect.ts` | `hasAnswered` — what counts as an answer. Pure |
| `lib/statements.ts` | `saveStatements`, `joinStatements` |
| `lib/voiceScreen.ts`, `lib/voiceMessages.ts` | the screen's own state and copy |
| `@musie/voice` | the capture and transcription core |

## `hasAnswered` is its own module, and that is not fussiness

```ts
export function hasAnswered(mode: ReflectMode, text: string, spokenWords = false): boolean {
  if (mode === 'voice') return spokenWords;
  return mode === 'text' && text.trim().length > 0;
}
```

The rule is needed in **two** places: the reflect step decides what to draw,
and `Session.tsx` decides whether *Finish session* is enabled — because the
action row belongs to `WizardPanel` and is filled by the session rather than by
the step.

Exporting it from the component's own file made that file export a component
**and** a function, which is the react-refresh warning and, more usefully, a
real smell: this is a rule about the session's data, not about a rendered thing.

**Voice is asked about separately**, through `spokenWords`, because the typed
box is empty in voice mode — the statements live in the transcript editor.

The mode values are the column's values verbatim: `text` | `voice` | `photo`.
The column is the vocabulary, and a second set of names here would be a mapping
nobody asked for.

## Why rows are written before the person finishes

Not for the editing. **A statement is finalised the moment somebody stops
speaking, and a reflection can run for minutes** — so a tab closed, a socket
dropped or a phone that rang loses everything if the answer is only assembled
at the end. Rows written as they arrive lose the last sentence at worst.

## One call makes the whole list true

`@musie/voice` hands over the **entire list** after any change rather than the
one statement that moved. So `saveStatements` upserts every row and deletes
what is no longer in it.

That is **idempotent by construction rather than by care** — it fires on four
paths — and it is also the only shape that can express a *merge*, which ends
one statement, and a *move*, which changes no text at all and would otherwise
never be written.

## `reflections.body` stays the answer

`body` is `not null` and is what the diary, the end-to-end walks and the
privacy check all read. It is **assembled from the statements on every write**,
so it is never stale and nothing downstream has to learn about a second table.

> The rows are the editing surface; the body is the answer.

This is text, exactly as a typed reflection is text. No audio is stored at any
point.

## A stale comment, found while writing this page

`components/SessionReflect.tsx`'s header still says voice *"cannot SAVE …
`Finish` stays disabled here and the step says why"*. That was true before F.6.
`VoiceTranscript` now calls `saveStatements`, and `lib/reflect.ts` says plainly
**"VOICE COUNTS SINCE F.6"**.

So the two files disagree, and the one that is wrong is the one a reader meets
first. Logged in `apps/web/OPEN-QUESTIONS.md` rather than edited from here —
this site is a derived view and does not fix the code it describes.
:::

---

**Source of truth:**
[`components/SessionReflect.tsx`](https://github.com/product-ben/musie/blob/main/apps/web/src/components/SessionReflect.tsx),
[`lib/reflect.ts`](https://github.com/product-ben/musie/blob/main/apps/web/src/lib/reflect.ts),
[`lib/statements.ts`](https://github.com/product-ben/musie/blob/main/apps/web/src/lib/statements.ts),
[BACKLOG.md](https://github.com/product-ben/musie/blob/main/BACKLOG.md) B1.
