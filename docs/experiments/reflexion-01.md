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

**Testing internally:** add `?internal=1` to a link. Every PostHog event of
that visit then carries `is_internal = true`, and the dashboard filters it
out.

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

## Changing things

Everything lives in `apps/web/experiments/reflexion/src/config.ts`:

- **The questions** are `QUESTIONS`, with text in DE and EN. When the wording
  changes, raise `QUESTION_SET_VERSION`, so that answers to old and new
  wording stay apart in `experiment_responses` and in PostHog.
- **The copy** of the modal, the reflect step, the thank-you state and the
  survey is `COPY.de` and `COPY.en`.
- **The feedback survey** is `SURVEY`. It is PostHog survey
  `01a1e3ac-14f6-0000-babb-e48bb67229f0` of type `api`: our UI renders it, and
  PostHog only evaluates it. Change the question text in PostHog and in
  `SURVEY` together, and never the question IDs.

## Ending the experiment

Set `ENABLED = false` in `config.ts` and deploy. All three links then show
„Dieses Experiment ist beendet. Danke!“ / „This experiment has ended. Thank
you!“.

## Reading the answers

- **Table:** `public.experiment_responses`. An anonymous visitor can only
  insert into it. You read it through the Supabase dashboard (service role).
- **CSV:** the view `public.experiment_responses_wide` has one row per
  response, with the three questions as columns. In the Table Editor, open the
  view and export it as CSV. In the SQL editor, use
  `select * from experiment_responses_wide order by created_at`.
- **Survey:** in PostHog under Surveys, „Reflexion 01 – Feedback“. Answers are
  stored in German (Ja / Vielleicht / Nein) whatever the UI language was; the
  UI language is the event property `language`.
- **Dashboard:** „Reflexion 01“ in PostHog (Phase 3; the link follows).

## What reaches PostHog

Nothing is sent before the person presses „Los geht’s“. That press is their
consent, and the modal says so. After it:
- Events carry the participant UUID, never the name.
- The reflection is sent only as lengths, counts and times, never as text.
- The feedback survey's answers are the single exception: they are sent as
  written.
- The name field and the reflection area are marked `ph-no-capture` for
  session replay.

## Going live (Ben)

1. Merge the PR. Cloudflare builds the app and the experiment together.
2. Run `pnpm db:sync` from `main` to create `experiment_responses` on hosted.
3. Run `pnpm db:status`, which should report that hosted and the migration
   files agree.
4. Open each link once with `?internal=1` and check that one row arrives in
   `experiment_responses_wide` and that the events show in PostHog's live
   events.
5. Launch the survey in PostHog. It is still a draft.
