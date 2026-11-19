# Experiment „Reflexion 01“

Friends, Family & Fools do one Musie exercise and then answer three
questions in the reflect step. The answers are a dataset for a later
AI follow-up feature, which is not part of this experiment.

## Links

| Exercise | Link | Languages |
|---|---|---|
| Harfe | `https://musie.org/experiments/reflexion/harfe/` | DE, EN |
| Body Scan | `https://musie.org/experiments/reflexion/body-scan/` | DE only (EN is disabled; the guided audio exists in German only) |
| Freie Bahn | `https://musie.org/experiments/reflexion/freie-bahn/` | DE, EN; always the blue sun (`art-01`) and „Aura“ (`trk-10`) |

**Testing internally (Ben, Lucy):** open any link once with `?internal=1`.
That marks the device, not just the visit: from then on every visit in that
browser is a test, including through the plain link.
- A „Testmodus – zählt nicht mit“ badge under the header shows that the
  device is marked.
- Every PostHog event carries `is_internal = true`, and the dashboard filters
  those out.
- Every saved reflection has `is_internal = true` in `experiment_responses`.
- `?internal=0` removes the mark. Do this before you hand the device to a
  real participant.
- The page removes the parameter from the address bar, so a link copied from
  a test device is a normal link.
- A private window cannot store the mark, so it applies to that one visit
  only.

A local dev run (`localhost:5180`) is always internal, because the dev
server sends to the real PostHog project.

**Local:** run `pnpm --filter web experiment:reflexion:dev`, then open
`http://localhost:5180/experiments/reflexion/harfe/`. It talks to the local
Supabase stack named in `apps/web/.env.local`.

## How it is built

The page is a static build under `/experiments` (CLAUDE.md rule 10), from
`apps/web/experiments/reflexion/`. It mounts the app's own
`routes/Session.tsx`, unmodified, so the steps, texts, media and navigation
are the app's. Every module of it that would talk to Supabase is replaced by a
shim (`src/shims/`), and the content is baked into `src/data/content.json`.
Only the reflect step and the thank-you state are the experiment's own.
`pnpm --filter web build` builds it together with the app, so Cloudflare
ships it on every deploy.

**Refreshing the content:** the content is baked, not live. After a change to
exercise copy, re-run the export (`experiments/reflexion/scripts/`) and
deploy.

**Copy that differs from the app (Ben, 2026-11-19).** Three places change
words for this experiment only. The app's own content and catalogue stay
as they are.
- `src/data/copyFixes.ts` replaces exact texts in the baked exercise
  content: „herankommen“ in the intros and the harp's texts (volume, the two
  ways to play, the play heading, the pointer hint, the focus line). A fix
  that stops matching after a re-export is reported in the dev console.
- `src/shims/content__emotionWheel.ts` turns the feelings sheet's nouns
  into adjectives (Angst → Ängstlich, Trauer → Trauernd …), in DE and EN.
  Labels change, `id` and `i` do not.
- `src/shims/i18n__localeContext.ts` lower-cases the word in the sheet's
  „einfach nur {feeling}“, the one string where an adjective sits
  mid-sentence. A picked word is appended to the answer in lower case too
  (`ReflectionStep.tsx`).

## Changing things

Everything lives in `apps/web/experiments/reflexion/src/config.ts`:

- **The questions** are `QUESTIONS`, with text in DE and EN. When the wording
  changes, raise `QUESTION_SET_VERSION`, so that answers to old and new
  wording stay apart in `experiment_responses` and in PostHog.
  - Version 1 was the placeholder set (local test rows only).
  - Version 2 is Lucy's wording, from 2026-11-16.
  - Version 3 (2026-11-18) splits the mood question. `q2` is now Ja or Nein,
    stored in German whatever the screen showed. Only „Ja“ shows `q2_how`
    („Beschreibe, wie sich deine Stimmung verändert hat“). A follow-up is
    declared with `showIf` and saved empty while it is hidden.
  - Version 4 (2026-11-19) rewords `q2` to „Hat sich deine Stimmung
    währenddessen verändert?“.
- **The feelings help.** A question with `feelingsHelp: true` (today only
  `q2_how`) gets a small button inside its field, at the bottom end,
  labelled „Stimmung benennen“ (Figma node 190:15804, hardcoded for this
  experiment). It opens the app's own
  feelings sheet, which is not modified. A picked feeling is not stored as a
  feeling. Its word is appended to the answer as plain text, and the person
  can edit it like anything they typed. PostHog gets
  `exp_feelings_help_opened` and `exp_feeling_picked`, which carry only the
  depth and a count, never the word.
- **The copy** of the modal, the reflect step, the thank-you state and the
  survey is `COPY.de` and `COPY.en`.
- **The feedback survey** is `SURVEY`. It is PostHog survey
  `01a1e3ac-14f6-0000-babb-e48bb67229f0` of type `api`: our UI renders it, and
  PostHog only evaluates it. Since 2026-11-18 it has four questions, all
  optional:
  - two NPS ratings (0–10, „würdest du diese Übung zum Entspannen …
    empfehlen“), one for friends or family and one for colleagues;
  - two open questions („Was würdest du dir anders wünschen?“, „Was fandest
    du am besten?“).

  A rating is a slider with eleven labelled steps (`src/NpsSlider.tsx`). It
  is the experiment's own, because the design system has no slider. Nothing
  is preselected, and „Feedback senden“ works as soon as one question is
  answered. Change a question's text in PostHog and in `SURVEY` together,
  and never its ID: the dashboard reads the answers by ID.
- **After „Feedback senden“** there is no success message. The page shows
  the thanks, „Lust auf eine weitere Übung?“ and main's card deck with the
  three exercises (`src/NextExercises.tsx`). The one just done is at the
  bottom of the pile. A press opens that exercise's link with the name
  pre-filled. Whoever goes on shows up in PostHog as
  `exp_participant_started` with `returning_participant: true`.

## Ending the experiment

Set `ENABLED = false` in `config.ts` and deploy. All three links then show
„Dieses Experiment ist beendet. Danke!“ / „This experiment has ended. Thank
you!“.

## Reading the answers

- **Table:** `public.experiment_responses`. An anonymous visitor can only
  insert into it. You read it through the Supabase dashboard (service role).
- **CSV:** the view `public.experiment_responses_wide` has one row per
  response, with the answers as columns `q1`, `q2`, `q2_how` and `q3`. Rows
  from version 2 have their whole mood answer in `q2` and no `q2_how`. In the
  Table Editor, open the
  view and export it as CSV. In the SQL editor, use
  `select * from experiment_responses_wide where not is_internal order by created_at`.
- **Test runs:** the column `is_internal` is `true` for a reflection from a
  test device or a local dev run. Filter on `false` for the participants'
  answers. The visitor's browser sets the flag, so it is a convenience for
  filtering and not a guard.
- **Survey:** in PostHog under Surveys, „Reflexion 01 – Feedback“. The
  questions are stored in German whatever the UI language was; the UI
  language is the event property `language`. A rating arrives as a number
  from 0 to 10. That page shows test answers too. The dashboard does not.
- **Dashboard:** [„Reflexion 01“](https://eu.posthog.com/project/313428/dashboard/1127915)
  in PostHog. One section for the overview and one per exercise.
  - The overview shows participants, started and finished per exercise, and
    the NPS across all exercises.
  - Each exercise shows how far people got, an NPS table, and who it was:
    by name, with both ratings and both open answers.

  NPS is the share of 9–10 minus the share of 0–6, in points from −100 to
  +100. Each person's last answer counts. „Finished“ means reaching
  the reflect step. Audio finished means the track played to its last note;
  for the harp, which has no track, it means pressing „Weiter“ after playing.
  The dashboard filters are `is_internal = false` and a start date of
  2026-11-18. Remove the first filter to see test runs.

## What reaches PostHog

Nothing is sent before the person presses „Los geht’s“. That press is their
consent, and the modal says so. After it:
- The person is identified by the participant UUID, and their **name is a
  person property** (Ben, 2026-11-18, so the dashboard can say who took
  part). The name is never an event property. Since 2026-11-19 the modal's
  consent line names cookies only („… dass wir Cookies verwenden, um Musie
  zu verbessern“, Ben's wording). It no longer says that the measuring
  happens under the person's name, though it still does.
- Events: `exp_landing_viewed`, `exp_participant_started`,
  `exp_language_changed`, `exp_step_viewed` (`step_key`, `step_index`,
  `step_count`), `exp_audio_started`, `exp_audio_completed`,
  `exp_play_finished` (harp, `play_seconds`), `exp_feelings_help_opened`,
  `exp_feeling_picked`, `exp_completed`, `exp_error`, `survey shown`,
  `survey sent`. A person who never presses „Los geht’s“ sends nothing, so a
  bounce in the name window cannot be counted.
- The reflection is sent only as lengths, counts and times, never as text.
- The feedback survey's answers are the single exception: they are sent as
  written.
- The name field and the reflection area are marked `ph-no-capture` for
  session replay.

## Going live (Ben)

1. Merge the PR. Cloudflare builds the app and the experiment together.
2. Run `pnpm db:sync` from `main` to create `experiment_responses` on hosted.
   This applies three migrations: the table, its `is_internal` column, and
   the view's `q2_how` column.
3. Run `pnpm db:status`, which should report that hosted and the migration
   files agree.
4. Open each link once with `?internal=1` and check three things: one row
   arrives in `experiment_responses_wide` with `is_internal = true`, the
   „Testmodus“ badge shows, and the events show in PostHog's live events.
5. Launch the survey in PostHog. It is still a draft.
