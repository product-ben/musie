# Instruments · implementation plan

Three exercises of a new kind `instruments` — Kalimba, Marimba, Harfe — under
*Entspannen*, from the three experiments. **This file is the current state**:
updated after every task and every subagent result.

- PRD (the argument, the data model, every decision): `docs/plans/instruments-prd.md`,
  readable copy at https://claude.ai/artifact/3Eeyp413QwRHfmi3piW85h
- Branch: `feature/instruments-exercises`, cut from `origin/main` at `5c70a57`
- Decisions (Ben, 2026-11-09): only each experiment's DEFAULT sound; samples
  stay static (Cloudflare), the database indexes them by path, size and
  SHA-256; motion sensor 1:1, permission asked on the intro step with its
  state shown; play time = first own note → *Weiter zum Reflektieren*; Kalimba
  gets the marimba's timer and answer. PRD §Widersprüche 1, 6–12: proposal stands.

Status words: **offen** · **in Arbeit** · **erledigt** · **blockiert**.

## Sources, pinned

| Instrument | Version | Commit | Where it is on this branch |
| --- | --- | --- | --- |
| Harfe | `harp/261109-0920` (sound = `261104-1443`) | `d0e88ac` (PR #72) | merged in, task F1 |
| Kalimba | `kalimba/261106-1121` | `cd962d3` (on `main`) | already in the tree |
| Marimba | `marimba/261108-1740` | `5590e20` (PR #71) | merged in, task F1 |

CI checks out shallow (`ci.yml`, `actions/checkout@v4` with no depth), so a
test cannot `git show` a commit. The comparison "database = experiment" reads
the experiment files **in the tree**, which is why F1 brings #71 and #72 in.

## Tasks

### Foundation — serial, one session (rule 9: one writer for schema and shared files)

| # | Task | Status | Depends on | Files |
| --- | --- | --- | --- | --- |
| F0 | PRD into the repo, this plan | in Arbeit | – | `docs/plans/*` |
| F1 | Merge PR #71 (marimba) and PR #72 (answering harp) into the branch, so every source is in the tree | offen | – | `apps/web/public/experiments/{marimba,harp/261109-0920}/**` |
| F2 | Copy the DEFAULT samples byte-identically to `apps/web/public/instruments/<id>/`; harp decoded from its base64. Manifest with path, bytes, SHA-256 | offen | F1 | `apps/web/public/instruments/**`, `supabase/content/instruments/samples.json` |
| F3 | Sound + answer config per instrument as JSON, transcribed from the experiment; extraction test that reads the experiment HTML and compares | offen | F1 | `supabase/content/instruments/{harp,kalimba,marimba}.json`, `apps/web/src/instruments/sources.test.ts` |
| F4 | Migration: `instruments` kind, `play` step, `sessions.play_mode`/`play_seconds`, `instruments` / `instrument_sounds` / `instrument_samples` / `exercise_instruments` (RLS, revoke, grant to authenticated AND service_role), new `exercise_i18n` columns, `missing_translations` extended | offen | F2, F3 | `supabase/migrations/20261109*_instruments.sql` |
| F5 | Types and pure contracts: `database.types.ts` (generated against an isolated stack), `STEP_IDS` + `play`, `STEPS.instruments`, `STEP_ICON`, step label keys, `Exercise` fields, the `InstrumentAdapter` interface every instrument implements | offen | F4 | `routeHandle.ts`, `lib/exerciseKind.ts`, `lib/stepIcons.ts`, `i18n/{en,de}.ts` (step keys only), `lib/content.ts`, `lib/database.types.ts`, `instruments/types.ts` |

### Lanes — parallel after F5, one worktree each, no file shared between lanes

| # | Lane | Status | Files (exclusive) | Definition of done |
| --- | --- | --- | --- | --- |
| L1 | DS components: `SettingsDialog` (non-modal), `Countdown`, `SegmentedControl` + `description`, `Switch` + `size="sm"` | offen | `packages/design-system/src/{SettingsDialog,Countdown,SegmentedControl,Switch}.tsx`, `musy-components.css`, `stories/{SettingsDialog,Countdown,SegmentedControl,Switch}.stories.tsx`, `reference/design_system/docs/07-components.md` | stories per CONVENTIONS.md (zu/offen/mit/ohne Vibration for the dialog); keyboard + screen reader; `pnpm --filter @musie/design-system typecheck` green |
| L2 | DS tokens + instrument shadows | offen | `tokens/musy-foundations.css`, `tokens/musy-foundations.tokens.json`, `TOKEN-DRIFT.md`, `stories/foundations/_lib/tokens.ts`, `stories/foundations/InstrumentShadows.mdx`, `src/instrumentShadow.ts` | `verify-tokens` green; foundations page shows Aus/Niedrig/Mittel/Hoch, light + dark |
| L3 | Engine: audio unlock + master chain from config, answer (generalised from the marimba), play clock reducer, onboarding, haptics + feature detection, motion permission | offen | `apps/web/src/instruments/engine/**` | pure parts unit-tested: answer for 3 instruments on/off, clock (play, first note, demo does not start, pause, expire, play on, continue button), onboarding cancels on own touch, vibration detection |
| L4 | The three instruments as adapters (draw, hit, play), ported from the experiments onto the tokens | offen | `apps/web/src/instruments/{harp,kalimba,marimba}/**` | each sounds from F2/F3 only; renders with `--instrument-*` tokens; keyboard-playable |
| L5 | Copy DE/EN: titles, descriptions, needs, intro, volume, browser, motion, play headline, CTA, mode labels + explanations, reflect; German from the experiments, English translated | offen | `supabase/migrations/20261109*_instruments_copy.sql` | `missing_translations` empty for the three; GERMAN-UI-WRITING.md; no „Bitte“, no „!“ |
| L6 | Therapist UI: the three exercises at the end of `/exercise-builder`, every new text field editable | offen | `lib/exerciseConfig.ts`, `lib/exerciseChanges.ts`, `lib/buildExerciseConfig.ts`, `lib/configToExercise.ts`, `routes/ExerciseBuilder.tsx`, `supabase/content/exercises/exercise.schema.json` | a text edit is classified `text`, not `structural`; builder previews the play step |

### Integration — serial, after the lanes

| # | Task | Status | Depends on | Files |
| --- | --- | --- | --- | --- |
| I1 | `SessionPlay` step: settings on the step, CTA opens the focus sheet with `InstrumentStage`, demo note, timer, settings dialog in sync, *Weiter zum Reflektieren*; intro additions (volume, browser, motion permission) | offen | L1, L3, L4 | `components/SessionPlay.tsx`, `components/InstrumentStage.tsx`, `components/SessionIntro.tsx`, `routes/Session.tsx`, `lib/session.ts`, `i18n/{en,de}.ts` |
| I2 | DS exports + CLAUDE.md rule 10 sentence | offen | L1, L2 | `packages/design-system/src/index.ts`, `CLAUDE.md` |
| I3 | Tests: db (three exercises, kind, relax, samples, texts complete, sessions store mode + seconds, diary security unchanged), adjust `db.content` count; e2e walk intro → diary | offen | I1, F4 | `apps/web/src/lib/*.db.test.ts`, `apps/web/e2e/instruments.spec.ts` |
| I4 | `pnpm check`, both builds, isolated-stack `test:db`, walk on the dev server | offen | I1–I3 | – |
| I5 | PR, every deviation from the brief listed | offen | I4 | – |

## Parallelisation

```mermaid
flowchart LR
  F0[F0 PRD + plan] --> F1[F1 sources in tree]
  F1 --> F2[F2 samples + manifest]
  F1 --> F3[F3 sound config + extraction test]
  F2 --> F4[F4 migration]
  F3 --> F4
  F4 --> F5[F5 types + contracts]
  F5 --> L1[L1 DS components]
  F5 --> L2[L2 tokens + shadows]
  F5 --> L3[L3 engine]
  F5 --> L4[L4 instruments]
  F5 --> L5[L5 copy DE/EN]
  F5 --> L6[L6 therapist UI]
  L1 --> I1[I1 SessionPlay]
  L3 --> I1
  L4 --> I1
  L2 --> I2[I2 exports + CLAUDE.md]
  L1 --> I2
  I1 --> I3[I3 tests]
  L5 --> I3
  L6 --> I4
  I2 --> I4[I4 check + walk]
  I3 --> I4
  I4 --> I5[I5 PR]
```

**Why the foundation is serial.** The migration, the generated types and the
step list are read by every lane; two writers there is rule 9's failure
(interleaved timestamps, another branch's tables in `database.types.ts`).

**Merge order back onto the feature branch:** L2 → L1 → L3 → L4 → L5 → L6,
then I1–I5 on the branch itself. Each lane's worktree is cut from the feature
branch after F5 and touches only its own files; `index.ts` exports and
`CLAUDE.md` are deliberately nobody's lane (I2).

**Every subagent brief carries** the goal, its exclusive files, what it must
not touch (the migration, `database.types.ts`, another lane's files,
`index.ts`), the decisions above, and its definition of done — a subagent
inherits the directory, not this conversation (rule 9).

## Log

- 2026-11-09 — PRD written and decided; plan written; worktree cut.
