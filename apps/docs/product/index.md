# What Musie is

A mindfulness app whose active ingredient is **music**, and whose front door is
**paper**.

> "Hi, I'm Musie. I help you feel and act more mindfully, more consciously, more
> connected and more secure — through the power of music."
>
> — the first line the app says, on first open

Two things separate it from a meditation app:

**There is a physical product.** The *Mindfulness Cards* set — nine printed
picture cards, one per feeling. You draw a card, scan its QR code, and hear the
piece behind it. The card is the entry point, not the app: the first contact is
an object on a table.

**Musie does not tell you what to feel.** No voice counting through a breathing
exercise (in only one of the five exercises), no target, no streaks, no points.
The exercise is: choose a card → listen → write down what came up. The
reflection is the product, not the by-product.

**And the title of a piece is deliberately hidden** while you listen. Only after
the gate — after your own reflection — does Musie release the title and the
artist. That is the central mechanic: you listen without knowing what you are
*supposed* to be hearing.

::: designers
## The five exercises

Two build on the deck; three are sound-only. All end in a reflection, all land
in the diary.

| | Exercise | Takes | Needs | The core of it |
|---|---|---|---|---|
| 1 | **Achtsame Pause** · Mindful Pause | 2–12 min | the deck | Draw five cards, choose the one that speaks to you, scan, hear the piece — and follow the question of what scene arises from the music and the image |
| 2 | **Freie Bahn** · Free Rein | 2–5 min | the deck | The quick way: a *random* card off the face-down pile. No choosing, no comparing — the exercise for a moment in between |
| 3 | **Achtsam Atmen** · Mindful Breathing | 5–8 min | sound only | The metre of the music carries the breath. Hands on the belly or the lower back |
| 4 | **Klangreise** · Sound Journey | 12–15 min | sound only | A voice leads through the sounds and back into the body — or you let the thoughts go without following them |
| 5 | **Bodyscan** · Body Scan | 10–12 min | sound only | A guided walk through the body, sound by sound |

**Two are implemented** — the two that draw the deck. Of the other three, the
two listening exercises have their audio model built, and Mindful Breathing has
no screens designed at all.

Each exercise brings **its own step copy** — intro, card choice, listening,
reflecting — in both languages. The questions differ per exercise and per step
on purpose: *Mindful Pause* asks for a name for the scene; *Free Rein* asks how
the moment feels. The same question everywhere would collapse the difference
between them.

## The deck

Nine cards, one feeling each, one recording each:

**Joy · Sadness · Anger · Fear · Calm · Longing · Gratitude · Loneliness ·
Hope**

Each card carries a code (`MC-01`…`MC-09`) and a QR code — on the back *and*
bottom-left on the front. The second one is a product decision with a reason:
turning a card over is the one movement that gives away which card it is,
before the music is allowed to. So it can be scanned lying face up.

Format **88 × 63 mm landscape**, 3 mm bleed, 300 dpi.

A detail with system character: **one recording can belong to the same card in
two exercises — and the same card can play different pieces in different
exercises.** The recording is stored exactly once and only paired. In licensing
terms, a piece shared by two exercises is **one** licence, not two. That scales
both ways: a second deck can recombine the same recordings, and a themed
edition costs no new rights.

## The tone, and it is a rule

**du**, lower-case, throughout. No "please", no exclamation marks, no
encouragement. **Musie demands nothing.**

## The privacy position is a positioning asset, not a compliance text

- Musie never asks for a name.
- Without an account the diary belongs to the browser — and goes with its data.
  The app says so beforehand, not in small print.
- What you write, nobody else can read. Backed by row level security and proven
  by a test that checks a delete-everything does not touch another user's rows.
- No tracking, no advertising, no streaks, no notifications.

## What does not exist yet, and is where the work is

None of this is answered in the product:

- **Business model.** No price, no subscription, no basket, no payment
  provider, and no decision about what is sold: the deck, the access, both, or
  the deck *as* the access.
- **Distribution of the physical product.** No printer commissioned, no run
  size, no unit cost, no shipping, no retail.
- **The audience, genuinely open.** The app asks *Here as…* and names four
  answers — by myself, with a group, with a partner, with a patient. **Only "by
  myself" is built.** The other three are each a different business. This is
  the most important open decision and it is deliberately not taken.
- **Positioning against an unmeasured market.** Musie sits between at least
  four shelves: meditation apps, music therapy, reflection card sets, journaling
  apps. That it fits none of them fully is described as a product quality; as a
  market position it is not yet one.
- **Brand and name.** Domain open. No mark research, no name clearance.
- **Regulation.** Musie makes no healing claim and no diagnosis — but "with a
  patient" is one of the four answers in the app. Addressing a therapeutic
  audience changes the requirements. Not examined.

## One nail in the floor

A printed QR code carries an **absolute URL**. The domain is not chosen, and
the first print run fixes it irrevocably for that edition. Five hundred cards
cannot be renamed. **The domain decision is the only one with a real clock on
it.**
:::

::: devs
## What is actually built, as of 2026-10-13

| | State |
|---|---|
| App | live on Cloudflare Workers, behind the sign-in gate |
| Database | Supabase, Frankfurt. 14 tables, RLS on all of them |
| Languages | DE + EN, complete, switchable with no reload |
| Design system | 32 components, 358 stories, published Storybook |
| Tests | 582 unit, 10 db files, 7 Playwright specs |
| Exercises implemented | 2 of 5 (`mindfulness-cards`, `free-rein`) |
| Music licensed | 4 of the 9 card pieces (Epidemic Sound, **subscription**) |
| Accounts | handed out by hand. No self-service sign-up — needs a domain |

## The content is provisional, and the seed says so

The content in the tables is the **Mindfulness Cards spreadsheet's**, and it
will be overwritten. Two kinds of copy, and they are not the same thing:

- **Chrome** — `apps/web/src/i18n/*`. Ours and permanent. `de.ts` is typed
  against `en.ts`, so a key added in English without German fails
  `pnpm check`. 394 keys.
- **Content** — the content tables. Provisional, and the seed says so.

`select * from public.missing_translations` finds every hole.

## The ids are not the names

`body-scan-soundwalk` reads *Bodyscan* on screen. An id is a stable handle that
`sessions.exercise_id` and every diary row point at, so it does not move when
the copy does.

`method` survives as an identifier **nowhere** in the product: the Method →
Exercise rename went through schema, seed, routes, catalogues and types.

## The reflection step, and the privacy claim in the schema

Three modes: **write, speak, photograph.**

Speaking is built and works: you talk, Musie transcribes live (sentence by
sentence, over a realtime transcription), and you can edit the text afterwards.
**The recording itself is never stored** — and that is not only in the privacy
copy, it is anchored in the data model. There is no column for it, and that is
documented as a decision rather than as a gap.

Photographing — for people who write on paper — exists as a surface, but the
image recognition is undecided. The photo does not leave the device.

## Where to read further

| | |
|---|---|
| The product, for market and strategy work | [docs/MUSIE-BRIEFING.md](https://github.com/product-ben/musie/blob/main/docs/MUSIE-BRIEFING.md) — in German |
| The phases and what "done" means | [BUILD-PLAN.md](https://github.com/product-ben/musie/blob/main/BUILD-PLAN.md) |
| The schema and its open questions | [DOMAIN-MODEL.md](https://github.com/product-ben/musie/blob/main/DOMAIN-MODEL.md) |
| Scoped and deliberately not started | [Backlog](/work/backlog) |
:::

---

**Source of truth:**
[docs/MUSIE-BRIEFING.md](https://github.com/product-ben/musie/blob/main/docs/MUSIE-BRIEFING.md)
(2026-09-28),
[BUILD-PLAN.md](https://github.com/product-ben/musie/blob/main/BUILD-PLAN.md),
[`apps/web/src/i18n/en.ts`](https://github.com/product-ben/musie/blob/main/apps/web/src/i18n/en.ts).
