-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUMENTS · A FOURTH KIND OF EXERCISE, AND THREE OF IT
--
-- Kalimba, Marimba and Harfe become exercises: intro → play → reflect, under
-- the goal `relax`, appended after every exercise that exists (sort 6, 7, 8).
-- The PRD is docs/plans/instruments-prd.md; every decision below is Ben's of
-- 2026-11-09 and is named there.
--
-- ── WHAT IS SCHEMA AND WHAT IS CONTENT ────────────────────────────────────
-- Schema: the kind, the `play` step, two session columns, four tables, nine
-- copy columns. Content: the three exercises, their copy, and the instruments'
-- sound. `exercise_i18n` is still migration-governed (rule 4.1 moved four
-- other tables), so the copy belongs here like Klangreise's did.
--
-- ── THE SOUND IS LOCKED, AND THE DATABASE SAYS SO ─────────────────────────
-- `instrument_sounds` and `instrument_samples` are written from
-- supabase/content/instruments/*.json by tools/instruments/sound-sql.mjs, and
-- apps/web/src/instruments/sources.test.ts holds those files against the
-- experiments in the tree. Nothing in the app writes them and no policy
-- allows it; a sound changes by a new migration generated the same way.
--
-- ── THE SAMPLES STAY FILES ────────────────────────────────────────────────
-- Ben, 2026-11-09: static under apps/web/public/instruments/, served by
-- Cloudflare without egress, indexed here by path, size and SHA-256 — the
-- private `tracks` bucket would put 3.4 MB per marimba session against the
-- 5 GB a month the free plan allows (OPEN-QUESTIONS, "Egress is the ceiling").
--
-- After applying:
--   pnpm gen:types   the four tables and the new columns into database.types.ts
--   pnpm test:db     db.instruments.db.test.ts
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE KIND ══════════════════════════════════════════════════════════
-- A fourth value, not a lookup table: `20261011100000_exercise_kinds.sql` chose
-- a check constraint on purpose, and `exerciseKind.ts` holds the step list as
-- a `Record`, so this value fails the typecheck until its run is written.
alter table public.exercises drop constraint exercises_kind_known;

alter table public.exercises add constraint exercises_kind_known
  check (kind in ('card_based', 'digital_interactive', 'listening_only', 'instruments'));

comment on column public.exercises.kind is
  'What kind of exercise this is, and therefore which steps a run has: '
  'card_based (intro/scan|view|select/listen/reflect), listening_only '
  '(intro/listen/reflect), instruments (intro/play/reflect), '
  'digital_interactive (not yet designed). The step list itself lives in '
  'apps/web/src/lib/exerciseKind.ts.';

comment on column public.exercises.listen_gate_seconds is
  'The minimum, in seconds: how long a listening step plays before it may be '
  'left, and how long the play step''s timer runs for an instruments exercise. '
  'Neither is a hard stop.';


-- ═══ 2 · THE PLAY STEP, AND WHAT A SESSION OF IT REMEMBERS ═════════════════
alter table public.sessions drop constraint sessions_step_known;

alter table public.sessions add constraint sessions_step_known
  check (step in ('intro', 'scan', 'view', 'select', 'listen', 'play', 'reflect'));

alter table public.sessions
  add column play_mode text
    constraint sessions_play_mode_known check (play_mode in ('solo', 'with_musie')),
  add column play_seconds integer
    constraint sessions_play_seconds_sane check (play_seconds >= 0);

comment on column public.sessions.play_mode is
  'How the instrument was played: solo (it does not answer) or with_musie (it '
  'answers when you pause). The setting as it stood when the play step was '
  'left. Null for every other kind.';

comment on column public.sessions.play_seconds is
  'From the first note the person played themselves to pressing Weiter zum '
  'Reflektieren, pauses included (Ben, 2026-11-09). The demo note does not '
  'start it. Null until the play step has been left once.';


-- ═══ 3 · THE INSTRUMENTS AND THEIR SOUND ═══════════════════════════════════
create table public.instruments (
  id                text primary key
                    constraint instruments_id_known check (id in ('harp', 'kalimba', 'marimba')),
  -- The token family: strings draw lighter than keys (Ben, 2026-11-09).
  family            text not null
                    constraint instruments_family_known check (family in ('string', 'key')),
  -- Where the sound came from — the PRD's pinned source.
  source_experiment text not null,
  source_commit     text not null,
  source_branch     text not null
);

comment on table public.instruments is
  'One row per instrument an exercise can be played on. Its sound is '
  'instrument_sounds, its recordings instrument_samples, both locked to the '
  'experiment named here.';

create table public.instrument_sounds (
  instrument_id text primary key references public.instruments (id) on delete restrict,
  -- Tuning, recordings, envelope, effects, levels, velocity, haptics: every
  -- number the experiment's default sound is made of. jsonb because the three
  -- are different shapes — a string pulled, a tine pressed, a bar struck.
  sound         jsonb not null constraint instrument_sounds_sound_object check (jsonb_typeof(sound) = 'object'),
  -- The answer's parameters: shared (the marimba's) plus this instrument's
  -- home notes and roll.
  answer        jsonb not null constraint instrument_sounds_answer_object check (jsonb_typeof(answer) = 'object'),
  -- The one note the focus sheet opens with.
  demo          jsonb not null constraint instrument_sounds_demo_object check (jsonb_typeof(demo) = 'object')
);

create table public.instrument_samples (
  instrument_id text not null references public.instruments (id) on delete restrict,
  file          text not null,
  -- Served by the app's static host, not by storage.
  path          text not null unique
                constraint instrument_samples_path_static check (path like '/instruments/%'),
  midi          smallint not null constraint instrument_samples_midi_sane check (midi between 0 and 127),
  layer         text not null,
  bytes         integer not null constraint instrument_samples_bytes_sane check (bytes > 0),
  sha256        text not null constraint instrument_samples_sha256_hex check (sha256 ~ '^[0-9a-f]{64}$'),
  primary key (instrument_id, file)
);

comment on table public.instrument_samples is
  'The recordings an instrument plays, as static files under '
  'apps/web/public/instruments/. bytes and sha256 are the files'' own; '
  'sources.test.ts requires them to match the experiment they came from.';

create table public.exercise_instruments (
  exercise_id       text primary key references public.exercises (id) on delete cascade,
  instrument_id     text not null references public.instruments (id) on delete restrict,
  default_mode      text not null default 'with_musie'
                    constraint exercise_instruments_mode_known check (default_mode in ('solo', 'with_musie')),
  vibration_default boolean not null default true
);

comment on table public.exercise_instruments is
  'Which instrument an instruments exercise is played on, and what its two '
  'settings start at. One row per exercise of kind instruments.';


-- ═══ 4 · ACCESS ═══════════════════════════════════════════════════════════
-- Content: authenticated may read, nobody may write but service_role. Revoke
-- first — the local stack grants all on new tables to anon and authenticated
-- by default (CLAUDE.md rule 2) — and grant service_role explicitly, because
-- the hosted project gives it nothing on a new table either.
alter table public.instruments          enable row level security;
alter table public.instrument_sounds    enable row level security;
alter table public.instrument_samples   enable row level security;
alter table public.exercise_instruments enable row level security;

create policy instruments_select          on public.instruments          for select to authenticated using (true);
create policy instrument_sounds_select    on public.instrument_sounds    for select to authenticated using (true);
create policy instrument_samples_select   on public.instrument_samples   for select to authenticated using (true);
create policy exercise_instruments_select on public.exercise_instruments for select to authenticated using (true);

revoke all on table public.instruments          from anon, authenticated;
revoke all on table public.instrument_sounds    from anon, authenticated;
revoke all on table public.instrument_samples   from anon, authenticated;
revoke all on table public.exercise_instruments from anon, authenticated;

grant select on table public.instruments          to authenticated;
grant select on table public.instrument_sounds    to authenticated;
grant select on table public.instrument_samples   to authenticated;
grant select on table public.exercise_instruments to authenticated;

grant select, insert, update, delete on table public.instruments          to service_role;
grant select, insert, update, delete on table public.instrument_sounds    to service_role;
grant select, insert, update, delete on table public.instrument_samples   to service_role;
grant select, insert, update, delete on table public.exercise_instruments to service_role;


-- ═══ 5 · THE SOUND — generated by tools/instruments/sound-sql.mjs ═══════════
insert into public.instruments (id, family, source_experiment, source_commit, source_branch) values
  ('harp', 'string', 'harp/261109-0920', 'd0e88ac', 'the-harp-answers'),
  ('kalimba', 'key', 'kalimba/261106-1121', 'cd962d3', 'main'),
  ('marimba', 'key', 'marimba/261108-1740', '5590e20', 'the-marimbaphon');

insert into public.instrument_sounds (instrument_id, sound, answer, demo) values
  ('harp',
   $json${"tuning":{"ROOT":50,"SCALE":[0,2,5,7,9],"COUNT":7,"midis":[50,52,55,57,59,62,64],"names":["d","e","g","a","h","d′","e′"]},"engine":"aufnahme","samples":{"pick":"nearest","notes":{"C3":48,"E3":52,"G3":55,"B3":59,"D4":62,"F4":65}},"preset":{"decay":2.5,"duck":0.15,"voices":7,"wet":0.32,"room":3,"damp":true,"sound":"weich","dynR":17,"dynK":1.2},"timbre":{"attack":0.006,"cut":[1500,3400],"shelf":0,"gain":1,"shelfHz":260,"lowpassQ":0.5},"envelope":{"releaseStartFactor":0.08,"releaseTauDivisor":5,"stopFactor":1.2,"stopPad":0.2},"voiceRules":{"dampTau":0.04,"duckTau":0.06,"limitTau":0.05},"pan":{"from":-0.35,"span":0.7},"reverb":{"noiseLowpass":0.3,"decayPower":3,"fadeInSec":0.015,"level":0.6,"channels":2,"rebuildDelayMs":120},"master":{"compressor":{"threshold":-16,"knee":10,"ratio":2,"attack":0.003,"release":0.25},"makeup":1.7,"limiter":{"threshold":-2,"knee":0,"ratio":20,"attack":0.001,"release":0.1}},"velocity":{"dynamics":{"floor":0.22,"span":0.78},"pluck":{"min":0.08,"max":1},"pull":{"base":0.22,"span":0.78,"power":1.2,"maxPx":60,"maxOfGap":0.85,"zoneOfGap":0.32},"strum":{"base":0.12,"speedDivisor":2.2,"retriggerMs":40}},"haptics":{"pluck":{"baseMs":20,"velMs":80,"ticks":[[0.75,3],[0.4,2],[0,1]]},"pullStep":{"ms":12,"steps":3}},"visual":{"MOTION":0.9,"width":[6,4.5],"fadeInMs":180,"fadeOutMs":650,"steps":40}}$json$::jsonb,
   $json${"phraseMemory":12,"maxNotes":8,"pause":{"medianFactor":2.5,"longestFactor":1.4,"lastGaps":6,"fallbackMedianMs":600,"minMs":1800,"maxMs":6000,"afterRollMs":400,"heldRetryMs":400},"length":{"shortUpTo":3,"short":[2,3],"medium":[0.45,0.65],"long":[0.8,1],"avoidRepeatTries":6},"motif":{"sizes":[2,3],"transforms":["inv","retro","both"],"tries":24},"gaps":{"fallbackMs":520,"baseMinMs":260,"baseMaxMs":1000,"jitter":[0.92,1.15],"minMs":220,"maxMs":1400,"lastFactor":1.35},"velocity":{"meanFactor":0.85,"min":0.45,"max":0.85,"archBase":0.88,"archSpan":0.16,"jitter":0.04,"clampMin":0.35,"clampMax":0.9,"lastFactor":0.9},"endMs":300,"interruptFadeTau":0.15,"home":[0,2,5],"homeNames":["d","g","d′"],"roll":null}$json$::jsonb,
   $json${"string":1,"velocity":0.6}$json$::jsonb),
  ('kalimba',
   $json${"DEFAULTS":{"hard":0.35,"len":4,"swing":0.8,"touch":0.7,"tuning":"penta","sound":"still"},"tines":[{"n":"e″","hz":659.26,"src":"E5","semi":0},{"n":"h′","hz":493.88,"src":"B4","semi":0},{"n":"g′","hz":392,"src":"A4","semi":-2},{"n":"d′","hz":293.66,"src":"E4","semi":-2},{"n":"A","hz":220,"src":"A3","semi":0},{"n":"H","hz":246.94,"src":"C4","semi":-1},{"n":"e′","hz":329.63,"src":"E4","semi":0},{"n":"a′","hz":440,"src":"A4","semi":0},{"n":"d″","hz":587.33,"src":"E5","semi":-2}],"NOTES":["A3","C4","E4","F4","A4","B4","C5","E5"],"CENTS":{"closed":{"A3":9,"A4":11,"B4":5,"C4":8,"C5":10,"E4":8,"E5":-4,"F4":16},"open":{"A3":9,"A4":8,"B4":0,"C4":8,"C5":10,"E4":15,"E5":-4,"F4":10}},"layers":["closed","open"],"onset":{"threshold":0.01,"backSamples":32},"tone":{"cutoff":{"from":1400,"to":16000},"attack":{"base":0.001,"span":0.024},"shelf":{"hz":300,"below":0.2,"gain":2},"lowpassQ":0.5,"lowpassFloor":500,"dullFactor":0.75,"dullAttack":0.012,"level":{"base":0.85,"jitter":0.08},"release":{"fullAbove":10,"startFactor":0.15,"tauDivisor":4,"stopFactor":1.6,"stopPad":0.1},"damp":{"tau":0.018,"stop":0.15}},"velocity":{"touchFactor":0.8,"posPower":0.8},"membrane":{"peak":{"hz":800,"q":1.1},"lfo":{"hz":5.5,"baseHz":4.5,"swingHz":3,"rateTau":0.1},"depth":{"tremolo":0.55,"peakHz":700,"pitchCents":22,"peakGainDb":10,"tau":0.04,"peakGainTau":0.05},"openMixFactor":1.2,"crossfadeTau":0.05},"swing":{"tickMs":30,"rotDecay":0.8,"rise":0.45,"fall":0.08,"floor":0.003,"rotationDivisor":110,"accelerationDivisor":6},"master":{"compressor":{"threshold":-16,"knee":10,"ratio":2,"attack":0.003,"release":0.25},"makeup":1.4,"limiter":{"threshold":-2,"knee":0,"ratio":20,"attack":0.001,"release":0.1}},"haptics":{"pluck":{"baseMs":30,"velMs":60,"ticks":[[0.6,3],[0,2]]},"swing":{"threshold":0.12,"baseMs":30,"spanMs":70,"idleFactor":0.6,"everyMs":140}},"pendingMs":700,"visual":{"dotMs":700}}$json$::jsonb,
   $json${"phraseMemory":12,"maxNotes":8,"pause":{"medianFactor":2.5,"longestFactor":1.4,"lastGaps":6,"fallbackMedianMs":600,"minMs":1800,"maxMs":6000,"afterRollMs":400,"heldRetryMs":400},"length":{"shortUpTo":3,"short":[2,3],"medium":[0.45,0.65],"long":[0.8,1],"avoidRepeatTries":6},"motif":{"sizes":[2,3],"transforms":["inv","retro","both"],"tries":24},"gaps":{"fallbackMs":520,"baseMinMs":260,"baseMaxMs":1000,"jitter":[0.92,1.15],"minMs":220,"maxMs":1400,"lastFactor":1.35},"velocity":{"meanFactor":0.85,"min":0.45,"max":0.85,"archBase":0.88,"archSpan":0.16,"jitter":0.04,"clampMin":0.35,"clampMax":0.9,"lastFactor":0.9},"endMs":300,"interruptFadeTau":0.15,"pitchOrder":[4,5,3,6,2,7,1,8,0],"home":[2,4,7],"homeNames":["d′","g′","d″"],"roll":null}$json$::jsonb,
   $json${"tine":4,"position":1}$json$::jsonb),
  ('marimba',
   $json${"DEFAULTS":{"bars":10,"dialog":true,"sound":"weich"},"SCALE":[{"n":"d","midi":50},{"n":"e","midi":52},{"n":"g","midi":55},{"n":"a","midi":57},{"n":"h","midi":59},{"n":"d′","midi":62},{"n":"e′","midi":64},{"n":"g′","midi":67},{"n":"a′","midi":69},{"n":"h′","midi":71}],"samples":{"notes":{"C3":48,"G3":55,"B3":59,"F4":65,"C5":72},"oct":0,"pick":"nearest, ties downward","layers":["mittel","laut"],"layerAt":0.6},"normalise":{"peak":0.89,"onsetFraction":0.02,"backSamples":32},"level":{"base":0.5,"lowBoost":0.35},"filter":{"lowpassQ":0.5,"rollHz":2600,"baseHz":2500,"velHz":9500},"envelope":{"attack":0.0015,"rollAttack":0.008},"voices":{"max":32,"fadeTau":0.04},"master":{"compressor":{"threshold":-16,"knee":10,"ratio":2,"attack":0.003,"release":0.25},"makeup":1.3,"limiter":{"threshold":-2,"knee":0,"ratio":20,"attack":0.001,"release":0.1},"warm":{"hz":14000,"q":0.5,"calmCut":0.6,"tau":0.3}},"calm":{"gapFloorMs":350,"gapSpanMs":1250,"smooth":0.18,"deviationStart":0.6,"deviationMax":0.8,"slowShare":0.45,"evenShare":0.55,"maxGapMs":6000,"riseSeconds":15,"fallSeconds":35,"step":0.1,"tickMs":100,"epsilon":0.0005,"background":0.85},"strike":{"STRIKE_MS":30,"noMotionWaitMs":8,"weights":{"motion":0.5,"area":0.35,"force":0.15},"RS":{"lo":0.05,"hi":1.2},"RA":{"lo":10,"hi":26},"RF":{"lo":0.4,"hi":1},"adapt":0.02,"window":{"beforeMs":40,"afterMs":10,"touchMs":80,"historyMs":1000},"measured":{"base":0.18,"span":0.82,"edgeDrop":0.15,"jitter":0.03,"min":0.15,"max":1},"unmeasured":{"rollBase":0.5,"rollJitter":0.08,"edgeDrop":0.3,"min":0.6,"max":1,"jitter":0.04}},"roll":{"sameBarMs":260,"anyBarMs":170,"keep":0.6,"add":0.4,"scale":0.85,"min":0.15,"max":0.85},"glissando":{"decay":0.92,"min":0.2,"max":0.9},"haptics":{"strike":{"baseMs":30,"velMs":50},"roll":{"ms":20,"everyMs":200}},"pendingMs":700,"visual":{"dotMs":600,"glowTau":0.85}}$json$::jsonb,
   $json${"phraseMemory":12,"maxNotes":8,"pause":{"medianFactor":2.5,"longestFactor":1.4,"lastGaps":6,"fallbackMedianMs":600,"minMs":1800,"maxMs":6000,"afterRollMs":400,"heldRetryMs":400},"length":{"shortUpTo":3,"short":[2,3],"medium":[0.45,0.65],"long":[0.8,1],"avoidRepeatTries":6},"motif":{"sizes":[2,3],"transforms":["inv","retro","both"],"tries":24},"gaps":{"fallbackMs":520,"baseMinMs":260,"baseMaxMs":1000,"jitter":[0.92,1.15],"minMs":220,"maxMs":1400,"lastFactor":1.35},"velocity":{"meanFactor":0.85,"min":0.45,"max":0.85,"archBase":0.88,"archSpan":0.16,"jitter":0.04,"clampMin":0.35,"clampMax":0.9,"lastFactor":0.9},"endMs":300,"interruptFadeTau":0.15,"home":[0,2,5,7],"homeNames":["d","g","d′","g′"],"roll":{"strokes":7,"everyMs":115,"velocity":0.45,"step":0.03,"tailMs":1000}}$json$::jsonb,
   $json${"bar":2,"velocity":0.6}$json$::jsonb);

insert into public.instrument_samples (instrument_id, file, path, midi, layer, bytes, sha256) values
  ('harp', 'B3.m4a', '/instruments/harp/B3.m4a', 59, 'aufnahme', 53453, '223332d811aa26199117eb3bf91e12ac4304c50357e88815e2e3a6fdee18ba95'),
  ('harp', 'C3.m4a', '/instruments/harp/C3.m4a', 48, 'aufnahme', 54087, '9d5d39de110fb213a553b954db75f04046ea48ad1c2653e0371cbb9de2f5d720'),
  ('harp', 'D4.m4a', '/instruments/harp/D4.m4a', 62, 'aufnahme', 53701, '7ea4d749846cf83c5bf6181fddc71550d174ef758f6859ed8a9ecddaadc76529'),
  ('harp', 'E3.m4a', '/instruments/harp/E3.m4a', 52, 'aufnahme', 53885, '0f368088cb3eac3c5805659ecb45dfbfa1731eca74d9151fd5b5e2415d61744c'),
  ('harp', 'F4.m4a', '/instruments/harp/F4.m4a', 65, 'aufnahme', 52362, 'c0ebddb5ac92291fca430dedced0e41fdffe7f9c862232bbd9d4cbf2dc0bcc41'),
  ('harp', 'G3.m4a', '/instruments/harp/G3.m4a', 55, 'aufnahme', 52906, 'c4390aa429ca3aa7debc8e889b98cd8eff3b2202f0f4c373d357b1ba7ba8c250'),
  ('kalimba', 'closed-A3.mp3', '/instruments/kalimba/closed-A3.mp3', 57, 'closed', 96549, '0e7a8e4a5e6fcdbdcdb18273485f65c52882e9ea2eb3e8a0ac7b8c0333d5bb13'),
  ('kalimba', 'closed-A4.mp3', '/instruments/kalimba/closed-A4.mp3', 69, 'closed', 102505, '5e6f585f3e5ef35d727ac3b3e1c340579b458b0fe3f63a42b6ec1803d1112e5a'),
  ('kalimba', 'closed-B4.mp3', '/instruments/kalimba/closed-B4.mp3', 71, 'closed', 113162, '8495b30cb982066dce6b13ca1a89394b908f4d397ba0f578a5cb840e5dff4e4e'),
  ('kalimba', 'closed-C4.mp3', '/instruments/kalimba/closed-C4.mp3', 60, 'closed', 74919, 'cc962e58a9f6fc46f8632ebc07cade2c82faa4a26fdbba081dd28a7fdcc633c1'),
  ('kalimba', 'closed-C5.mp3', '/instruments/kalimba/closed-C5.mp3', 72, 'closed', 110968, '207816d51cfaea0092d030820351d7bc91a31dee045905d17a9e27c2018f2191'),
  ('kalimba', 'closed-E4.mp3', '/instruments/kalimba/closed-E4.mp3', 64, 'closed', 105953, 'e03cfebf67a8644b43806422e153050b1e08a737c0c5f84cf742145366d9807b'),
  ('kalimba', 'closed-E5.mp3', '/instruments/kalimba/closed-E5.mp3', 76, 'closed', 73665, 'a1067520a12f3b1647c741b23277d165cdba80ea48d078c566571215eaf004a3'),
  ('kalimba', 'closed-F4.mp3', '/instruments/kalimba/closed-F4.mp3', 65, 'closed', 97176, '3ae4d52b177e4217f80742da60f13ab26a8624536676ae72404ceac824399d97'),
  ('kalimba', 'open-A3.mp3', '/instruments/kalimba/open-A3.mp3', 57, 'open', 120372, 'd73166aaebe8951be733d249957ab48903e369179ace8fb8fadb5998488ed115'),
  ('kalimba', 'open-A4.mp3', '/instruments/kalimba/open-A4.mp3', 69, 'open', 97176, '6377f949bba93feeb8666fa2216a4faa36a299f6fd912b7a899d86bd232c6f75'),
  ('kalimba', 'open-B4.mp3', '/instruments/kalimba/open-B4.mp3', 71, 'open', 100624, '0b511d2a04c3757d4463d13c3b87eda36b0946c3cde9f985198c2b852026d7a2'),
  ('kalimba', 'open-C4.mp3', '/instruments/kalimba/open-C4.mp3', 60, 'open', 120372, '79ac4ceedcba6a27d8a9978ebe61295ad45aaf20db1d3941e6ce599ee0b39b3b'),
  ('kalimba', 'open-C5.mp3', '/instruments/kalimba/open-C5.mp3', 72, 'open', 99997, 'a65a35e663eed04c4f5366bac44865b4e0f9cedbd0c3b64aecf32796f84294dd'),
  ('kalimba', 'open-E4.mp3', '/instruments/kalimba/open-E4.mp3', 64, 'open', 120372, 'bb455cadbf37a51fde296f91898ceb3a570cd0291cdb5ad097e7004cbe5690c6'),
  ('kalimba', 'open-E5.mp3', '/instruments/kalimba/open-E5.mp3', 76, 'open', 67082, 'b35f00c7d3d4227998cfddcaba7db26cc226e151ca9dc0590bb11d77ce7fdc85'),
  ('kalimba', 'open-F4.mp3', '/instruments/kalimba/open-F4.mp3', 65, 'open', 120372, '512cb4cc80ee41eaf3e049561284b83c36d1e71515bcc7ed66213f5d3290e06a'),
  ('marimba', 'B3.wav', '/instruments/marimba/B3.wav', 59, 'laut', 360412, 'd8da59e150fcb91760981d733c8846cc29e6c8dee2e0a8a2ff03b80da12d195d'),
  ('marimba', 'C3.wav', '/instruments/marimba/C3.wav', 48, 'laut', 534504, '2d10a8c02093e99590fde7474118b9a54279dd19908625e2be63e5f16506e540'),
  ('marimba', 'C5.wav', '/instruments/marimba/C5.wav', 72, 'laut', 169472, '630d23dde6fa3fc566fa59e44988b42e0767886b612ae5ad3447b94d0e3b2eb5'),
  ('marimba', 'F4.wav', '/instruments/marimba/F4.wav', 65, 'laut', 271416, '80cfbd628d5e0fd0c050a17350b16098097aa7bda67d9f2e4e3d673f1543e351'),
  ('marimba', 'G3.wav', '/instruments/marimba/G3.wav', 55, 'laut', 389706, '2f0a3fb8c94eed4ad7ee1fcd463e71833f1a7e57c0e0882ef3769d402c71439c'),
  ('marimba', 'mar-med-B3.wav', '/instruments/marimba/mar-med-B3.wav', 59, 'mittel', 260504, '43ab30c74a281a372b23673d7fc0cf0fe69e1416f2b3c68522efe3a70e620004'),
  ('marimba', 'mar-med-C3.wav', '/instruments/marimba/mar-med-C3.wav', 48, 'mittel', 466104, '2bc54338931f6b37544fe06ed2bcca32299030a94b88e177bcc6c8d30be7b052'),
  ('marimba', 'mar-med-C5.wav', '/instruments/marimba/mar-med-C5.wav', 72, 'mittel', 144452, '212ab81e2ca9bc779f94411faa1d3b162a2d6fcb997e8a3079fec7a654d630ef'),
  ('marimba', 'mar-med-F4.wav', '/instruments/marimba/mar-med-F4.wav', 65, 'mittel', 215160, '63ce0a1a6acc154ed34037379e6fda7aca75733cf814d900896aae35fc0cbb66'),
  ('marimba', 'mar-med-G3.wav', '/instruments/marimba/mar-med-G3.wav', 55, 'mittel', 315148, '03daea5598e8594d0d4d187120a4868a4ce10d31382a56df50d7be2f04a7f659');


-- ═══ 6 · THE COPY COLUMNS ═════════════════════════════════════════════════
-- One column per thing the therapist edits, which is how every other step's
-- copy is held (`intro_md`, `listen_md`, …). Nullable: they are copy of the
-- instruments kind and null for the other five exercises, in both locales,
-- which missing_translations reads as data rather than as a hole.
alter table public.exercise_i18n
  add column volume_md        text,
  add column browser_md       text,
  add column motion_md        text,
  add column play_md          text,
  add column play_cta         text,
  add column mode_solo_label  text,
  add column mode_solo_md     text,
  add column mode_musie_label text,
  add column mode_musie_md    text;

comment on column public.exercise_i18n.volume_md is 'Intro, always shown: a quieter phone sounds better. There is no volume check — a browser cannot read the system volume.';
comment on column public.exercise_i18n.browser_md is 'Intro: where the exercise works best.';
comment on column public.exercise_i18n.motion_md is 'Intro, only where the instrument uses the motion sensor: what it is for, above the button that asks for it. Null for the harp.';
comment on column public.exercise_i18n.play_md is 'The play step: its heading and what to do.';
comment on column public.exercise_i18n.play_cta is 'The button that opens the focus sheet — „Zur Harfe“.';
comment on column public.exercise_i18n.mode_solo_label is 'Segment label: playing alone (the instrument does not answer).';
comment on column public.exercise_i18n.mode_solo_md is 'What happens when playing alone, under the segmented control.';
comment on column public.exercise_i18n.mode_musie_label is 'Segment label: playing with Musie (the instrument answers).';
comment on column public.exercise_i18n.mode_musie_md is 'What happens when playing with Musie, under the segmented control.';


-- ═══ 7 · THE THREE EXERCISES ═══════════════════════════════════════════════
-- Appended: sort 6, 7, 8 after Bodyscan's 5, in the brief's order. The gate is
-- the timer, 90 s; 3–10 minutes is the whole run, intro and reflection
-- included, so the gate stays below the shortest run (db.content.db.test.ts).
insert into public.exercises
  (id, kind, sort, timeframe_min, timeframe_max, needs_cards, needs_sound, implemented, listen_gate_seconds, image_url)
values
  ('kalimba', 'instruments', 6, 3, 10, false, true, true, 90, 'assets/web/exercises/kalimba.webp'),
  ('marimba', 'instruments', 7, 3, 10, false, true, true, 90, 'assets/web/exercises/marimba.webp'),
  ('harp',    'instruments', 8, 3, 10, false, true, true, 90, 'assets/web/exercises/harp.webp');

insert into public.exercise_instruments (exercise_id, instrument_id, default_mode, vibration_default) values
  ('kalimba', 'kalimba', 'with_musie', true),
  ('marimba', 'marimba', 'with_musie', true),
  ('harp',    'harp',    'with_musie', true);

insert into public.exercise_goals (exercise_id, goal_id) values
  ('kalimba', 'relax'),
  ('marimba', 'relax'),
  ('harp',    'relax');


-- ═══ 8 · THE COPY ═════════════════════════════════════════════════════════
-- German from each instrument's newest experiment where it says something —
-- the headlines, the marimba's „Gespräch“ and „Laut und leise“, its
-- „Spiel frei, so lange du magst“ — and written to docs/GERMAN-UI-WRITING.md
-- where the experiments had nothing to say (title, description, intro).
-- English translated from it. No „Bitte“, no exclamation mark, nothing that
-- cheers anyone on: Musie asks nothing of anyone.
insert into public.exercise_i18n
  (exercise_id, locale, name, description, needs, image_alt,
   intro_md, volume_md, browser_md, motion_md,
   play_md, play_cta, mode_solo_label, mode_solo_md, mode_musie_label, mode_musie_md,
   reflect_md, reflect_placeholder)
values
  ('kalimba', 'de', 'Kalimba',
   'Tippe die Zungen der Kalimba an und hör ihnen beim Nachklingen zu. Schwenkst du das Handy, schwingt der Klang mit.',
   'Dein Handy',
   'Eine Kalimba mit neun Zungen auf einem Holzkörper',
   $md$## Loslegen

Such dir einen ruhigen Ort, an dem du die nächsten Minuten ungestört bist. Halte das Handy in beiden Händen, so dass deine Daumen die Zungen erreichen.$md$,
   'Stell dein Handy etwas leiser als sonst. Leise klingt die Kalimba schöner.',
   'Am besten klingt es auf dem iPhone in Safari und auf Android in Chrome.',
   'Schwenkst du das Handy, schwingt der Klang mit. Dafür nutzt die Kalimba die Bewegung deines Handys. Dein Handy fragt dich einmal, ob du das erlaubst.',
   $md$## Tippe die Zungen der Kalimba an

Schwenkst du das Handy, schwingt der Klang mit.$md$,
   'Zur Kalimba',
   'Ich spiele allein',
   'Die Kalimba antwortet nicht. Spiel frei, so lange du magst.',
   'Ich spiele mit Musie',
   'Machst du eine Pause, antwortet die Kalimba. Sie greift etwas aus deinem Spiel auf, ohne es nachzuspielen. Ihre Zungen leuchten grün. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
   $md$## Wie fühlst du dich jetzt?

Schreib auf, was du magst. Ein Wort reicht.$md$,
   'Welcher Ton ist dir geblieben? Was hat sich verändert, seit du angefangen hast?'),

  ('kalimba', 'en', 'Kalimba',
   'Tap the kalimba''s tines and listen to them ring. Swing your phone and the sound swings with it.',
   'Your phone',
   'A kalimba with nine tines on a wooden body',
   $md$## Getting started

Find a quiet place where nobody will disturb you for the next few minutes. Hold the phone in both hands so your thumbs reach the tines.$md$,
   'Turn your phone down a little. The kalimba sounds better quiet.',
   'It sounds best in Safari on an iPhone and in Chrome on Android.',
   'Swing your phone and the sound swings with it. For that the kalimba uses your phone''s movement. Your phone asks you once whether that is all right.',
   $md$## Tap the kalimba's tines

Swing your phone and the sound swings with it.$md$,
   'To the kalimba',
   'I play alone',
   'The kalimba does not answer. Play freely for as long as you like.',
   'I play with Musie',
   'When you pause, the kalimba answers. It picks something up from your playing without copying it. Its tines light up green. Tap in between and it stops, and it is your turn again.',
   $md$## How do you feel now?

Write down whatever you like. One word is enough.$md$,
   'Which note stayed with you? What has changed since you started?'),

  ('marimba', 'de', 'Marimba',
   'Leg dein Handy quer vor dich und spiel auf den Stäben, bis du ruhig bist.',
   'Dein Handy und einen Tisch',
   'Eine Marimba mit zehn Holzstäben, tief links und hoch rechts',
   $md$## Loslegen

Such dir einen ruhigen Ort, an dem du die nächsten Minuten ungestört bist. Am besten liegt das Handy quer vor dir auf dem Tisch.$md$,
   'Stell dein Handy etwas leiser als sonst. Leise klingt die Marimba schöner.',
   'Am besten klingt es auf dem iPhone in Safari und auf Android in Chrome.',
   'Tippst du fester, klingt es lauter, sanft getippt leiser. Das misst dein Handy an seiner Erschütterung. Dafür fragt es dich einmal, ob du die Bewegung erlaubst.',
   $md$## Spiel, bis du ruhig bist

Leg dein Handy quer vor dich.$md$,
   'Zur Marimba',
   'Ich spiele allein',
   'Die Marimba antwortet nicht. Spiel frei, so lange du magst.',
   'Ich spiele mit Musie',
   'Machst du eine Pause, antwortet die Marimba. Sie greift etwas aus deinem Spiel auf, ohne es nachzuspielen. Ihre Stäbe leuchten grün. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
   $md$## Wie fühlst du dich jetzt?

Schreib auf, was du magst. Ein Wort reicht.$md$,
   'Welcher Ton ist dir geblieben? Was hat sich verändert, seit du angefangen hast?'),

  ('marimba', 'en', 'Marimba',
   'Lay your phone sideways in front of you and play the bars until you feel calm.',
   'Your phone and a table',
   'A marimba with ten wooden bars, low on the left and high on the right',
   $md$## Getting started

Find a quiet place where nobody will disturb you for the next few minutes. The phone is best lying sideways on a table in front of you.$md$,
   'Turn your phone down a little. The marimba sounds better quiet.',
   'It sounds best in Safari on an iPhone and in Chrome on Android.',
   'Tap harder and it sounds louder, tap gently and it sounds softer. Your phone measures that by how it is jolted. For that it asks you once whether it may use the movement.',
   $md$## Play until you feel calm

Lay your phone sideways in front of you.$md$,
   'To the marimba',
   'I play alone',
   'The marimba does not answer. Play freely for as long as you like.',
   'I play with Musie',
   'When you pause, the marimba answers. It picks something up from your playing without copying it. Its bars light up green. Tap in between and it stops, and it is your turn again.',
   $md$## How do you feel now?

Write down whatever you like. One word is enough.$md$,
   'Which note stayed with you? What has changed since you started?'),

  ('harp', 'de', 'Harfe',
   'Atme tief ein und aus und spiel dabei Musies Harfe im Rhythmus deines Atems.',
   'Dein Handy',
   'Eine Harfe mit sieben Saiten',
   $md$## Loslegen

Such dir einen ruhigen Ort, an dem du die nächsten Minuten ungestört bist. Zieh eine Saite und lass sie los: je weiter, desto lauter. Wischen streicht über die Saiten.$md$,
   'Stell dein Handy etwas leiser als sonst. Leise klingt die Harfe schöner.',
   'Am besten klingt es auf dem iPhone in Safari und auf Android in Chrome.',
   null,
   $md$## Atme tief ein und aus

Spiele dabei Musies Harfe im Rhythmus deines Atems.$md$,
   'Zur Harfe',
   'Ich spiele allein',
   'Die Harfe antwortet nicht. Spiel frei, so lange du magst.',
   'Ich spiele mit Musie',
   'Machst du eine Pause, antwortet die Harfe. Sie greift etwas aus deinem Spiel auf, ohne es nachzuspielen. Ihre Saiten leuchten grün. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
   $md$## Wie fühlst du dich jetzt?

Schreib auf, was du magst. Ein Wort reicht.$md$,
   'Welcher Ton ist dir geblieben? Was hat sich verändert, seit du angefangen hast?'),

  ('harp', 'en', 'Harp',
   'Breathe deeply in and out and play Musie''s harp in the rhythm of your breath.',
   'Your phone',
   'A harp with seven strings',
   $md$## Getting started

Find a quiet place where nobody will disturb you for the next few minutes. Pull a string and let go: the further, the louder. Swiping strums the strings.$md$,
   'Turn your phone down a little. The harp sounds better quiet.',
   'It sounds best in Safari on an iPhone and in Chrome on Android.',
   null,
   $md$## Breathe deeply in and out

Play Musie's harp in the rhythm of your breath.$md$,
   'To the harp',
   'I play alone',
   'The harp does not answer. Play freely for as long as you like.',
   'I play with Musie',
   'When you pause, the harp answers. It picks something up from your playing without copying it. Its strings light up green. Tap in between and it stops, and it is your turn again.',
   $md$## How do you feel now?

Write down whatever you like. One word is enough.$md$,
   'Which note stayed with you? What has changed since you started?');


-- ═══ 9 · MISSING TRANSLATIONS SEES THE NEW COLUMNS ═════════════════════════
-- `create or replace`, never drop (20261007100000). The same view as
-- 20261015140000 with the nine copy columns added; reflect_placeholder stays
-- out, as it was.
create or replace view public.missing_translations with (security_invoker = true) as
with locales (locale) as (
  values ('de'), ('en')
),
parents (entity, record_id) as (
            select 'user_types', id from public.user_types
  union all select 'goals',      id from public.goals
  union all select 'exercises',  id from public.exercises
  union all select 'cards',      id from public.cards
),
present (entity, record_id, locale) as (
            select 'user_types', user_type_id, locale from public.user_type_i18n
  union all select 'goals',      goal_id,      locale from public.goal_i18n
  union all select 'exercises',  exercise_id,  locale from public.exercise_i18n
  union all select 'cards',      card_id,      locale from public.card_i18n
),
strings (entity, record_id, locale, column_name, value) as (
            select 'user_types', user_type_id, locale, 'label',      label      from public.user_type_i18n
  union all select 'user_types', user_type_id, locale, 'image_alt',  image_alt  from public.user_type_i18n
  union all select 'goals',      goal_id,      locale, 'label',      label      from public.goal_i18n
  union all select 'goals',      goal_id,      locale, 'purpose',    purpose    from public.goal_i18n
  union all select 'goals',      goal_id,      locale, 'why',        why        from public.goal_i18n
  union all select 'exercises',  exercise_id,  locale, 'name',        name        from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'description', description from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'needs',       needs       from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'intro_md',    nullif(intro_md,   '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'scan_md',     nullif(scan_md,    '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'listen_md',   nullif(listen_md,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'reflect_md',  nullif(reflect_md, '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'image_alt',   image_alt   from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'volume_md',        nullif(volume_md,        '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'browser_md',       nullif(browser_md,       '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'motion_md',        nullif(motion_md,        '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'play_md',          nullif(play_md,          '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'play_cta',         nullif(play_cta,         '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_solo_label',  nullif(mode_solo_label,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_solo_md',     nullif(mode_solo_md,     '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_musie_label', nullif(mode_musie_label, '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'mode_musie_md',    nullif(mode_musie_md,    '') from public.exercise_i18n
  union all select 'cards',      card_id,      locale, 'feeling',    feeling    from public.card_i18n
  union all select 'cards',      card_id,      locale, 'image_alt',  image_alt  from public.card_i18n
)
select
  p.entity,
  p.record_id,
  l.locale,
  'missing row'::text as issue,
  null::text          as column_name
from parents p
cross join locales l
where not exists (
  select 1 from present x
  where x.entity = p.entity and x.record_id = p.record_id and x.locale = l.locale
)

union all

select
  s.entity,
  s.record_id,
  s.locale,
  'missing string'::text as issue,
  s.column_name
from strings s
where s.value is null
  and exists (
    select 1 from strings o
    where o.entity      = s.entity
      and o.record_id   = s.record_id
      and o.column_name = s.column_name
      and o.locale     <> s.locale
      and o.value is not null
  );
