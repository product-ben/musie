/**
 * `supabase/content/music.json` — read, checked, and turned into rows.
 *
 * The music library's counterpart to `deck.mjs`, and it owns two tables:
 *
 *   public.tracks          every licensed PIECE — its credit, and the music as
 *                          released
 *   public.exercise_cuts   every CUT of a listening exercise: the mix, and the
 *                          same recording with its music removed
 *
 * ── IT DOES NOT OWN `exercise_tracks` ─────────────────────────────────────
 * `deck.json` keeps that, and the partition is clean: *the deck says which
 * piece a card plays; this file says what the pieces are and how the exercises
 * are recorded.* Neither generator writes a row the other one owns, so neither
 * can delete the other's work.
 *
 * ── TWO FILES PER CUT, AND THEY ARE NOT STEMS ─────────────────────────────
 * Corrected 2026-10-12, when the real audio arrived. `mixed` is the exercise
 * as mixed and is what plays; `voice` is the same recording with the bed
 * removed, and is what the switch hands over to. They are ALTERNATIVES, never
 * summed — adding them would play the guidance twice. `voice` is optional, and
 * a cut without one simply has no switch.
 *
 * ── `posture` AND `ending` MAY BE OMITTED, AND USUALLY ARE ────────────────
 * Omitted means *this recording serves any answer*, which is what the delivery
 * looks like: Bodyscan is one recording for every combination, and Klangreise
 * is two that differ by ending and not by posture. Writing eight entries
 * pointing at four files would be the same fact four times over, and a lie
 * about how specific the audio is.
 *
 * ── WHAT THIS FILE CANNOT CHECK, AND WHO DOES ─────────────────────────────
 * That a cut's exercise exists and is `listening_only`. There is no
 * database here, and hardcoding the list of listening exercises would be a
 * third copy of something the schema already knows. The foreign key catches a
 * missing exercise on `supabase db reset`; `music.db.test.ts` catches the
 * wrong kind. Both fail before anything is pushed, which is the test this
 * module cannot be.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const MUSIC_PATH = join(HERE, '..', '..', '..', 'supabase', 'content', 'music.json');

/** What the path reads as in a message, so output does not depend on a laptop. */
export const MUSIC_IN_GIT = 'supabase/content/music.json';

/** The locales `exercise_cuts_locale_known` allows. */
export const LOCALES = ['de', 'en'];
/** `exercise_cuts_posture_known`, plus null for *any*. */
export const POSTURES = ['sitting', 'lying'];
/** `exercise_cuts_ending_known`, plus null for *any*. */
export const ENDINGS = ['day', 'sleep'];

/** `trk-01`, and two digits is not a limit — `trk-100` is fine the day it comes. */
const PIECE_ID = /^trk-\d{2,}$/;
const EXERCISE_ID = /^[a-z][a-z0-9-]*$/;
/** An object key: the id, the dimensions and a content hash. Never a title. */
const OBJECT_KEY = /^[a-z0-9][a-z0-9.-]*$/;

/**
 * `01:35` — minutes and seconds, and nothing else.
 *
 * A TIMECODE AND NOT A NUMBER OF SECONDS, which is the opposite of
 * `durationSeconds` next door and is deliberate. A duration is MEASURED off
 * the file by `music:upload` and no human types it; an intro mark is an
 * editorial judgement somebody makes while listening, with a player showing
 * them `01:35`. Asking for 95 instead is asking them to do the arithmetic that
 * this line does, in their head, at the one moment they are least likely to
 * check it.
 */
const TIMECODE = /^(\d{1,2}):([0-5]\d)$/;

export async function readMusic(path = MUSIC_PATH) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(`No music library at ${path}.`);
  }
  try {
    return JSON.parse(raw);
  } catch (thrown) {
    throw new Error(
      `${path} is not valid JSON: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
    );
  }
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

/** An omitted dimension reads as `any` — in the id, and in the database as null. */
const dimension = (value) => (isText(value) ? value : null);

/**
 * A cut's `introUntil` as whole seconds, or null where it names none.
 *
 * Null for ABSENT and for MALFORMED alike — `checkMusic` is what tells the two
 * apart and refuses the second, so this stays total and the generator never
 * emits a half-parsed mark. `01:35` → 95.
 */
export function introSeconds(cut) {
  const value = cut?.introUntil;
  if (!isText(value)) return null;
  const match = TIMECODE.exec(value.trim());
  if (match === null) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * THE ID OF A CUT IS ITS ADDRESS, spelled once.
 *
 * `cut-body-scan-soundwalk-de-any-any`, `cut-sound-journey-de-any-sleep`.
 * Derived rather than written, so the id, the answers it serves and the object
 * keys can never disagree — and so a cut cannot be given the id of a
 * different combination by a typo nobody reads.
 *
 * `any` rather than an empty segment, because `cut-x-de--` is a string nobody
 * can read in a migration diff.
 */
export function cutId({ exercise, locale, posture, ending }) {
  return `cut-${exercise}-${locale}-${dimension(posture) ?? 'any'}-${dimension(ending) ?? 'any'}`;
}

/** The pieces, by id, whatever order the file lists them in. */
export function orderedPieces(music) {
  return [...(music?.pieces ?? [])].sort((a, b) => String(a?.id).localeCompare(String(b?.id)));
}

/** The cuts, by derived id, so two runs of the generator emit one order. */
export function orderedCuts(music) {
  return [...(music?.cuts ?? [])].sort((a, b) => {
    const left = isText(a?.exercise) ? cutId(a) : '';
    const right = isText(b?.exercise) ? cutId(b) : '';
    return left.localeCompare(right);
  });
}

/**
 * Everything wrong with a library, split in two — `checkDeck`'s shape, for the
 * same reason.
 *
 * `problems` stop a migration: each one would either fail against the schema or
 * write a row that means something other than what it says. `warnings` are
 * libraries that are legal and probably not finished, which is the state audio
 * production is in most of the time.
 */
export function checkMusic(music) {
  const problems = [];
  const warnings = [];

  const pieces = music?.pieces;
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return { problems: ['`pieces` must be a non-empty array.'], warnings };
  }

  const cuts = music?.cuts;
  if (!Array.isArray(cuts)) {
    problems.push('`cuts` must be an array — write `[]` when there are none yet.');
  }

  const byId = new Map();
  const keys = new Map();

  const claimKey = (key, where, what) => {
    if (key === null || key === undefined) return;
    if (!OBJECT_KEY.test(key)) {
      problems.push(`${where}: ${what} \`${key}\` is not an object key — lower case, no spaces.`);
      return;
    }
    const taken = keys.get(key);
    if (taken !== undefined) {
      problems.push(`${where}: ${what} \`${key}\` is already used by ${taken}.`);
      return;
    }
    keys.set(key, where);
  };

  for (const [index, piece] of pieces.entries()) {
    const where = isText(piece?.id) ? piece.id : `pieces[${index}]`;

    if (!PIECE_ID.test(piece?.id ?? '')) {
      problems.push(`${where}: id must look like \`trk-01\` — opaque, never a title slug.`);
    } else if (byId.has(piece.id)) {
      problems.push(`${where}: two pieces share this id.`);
    } else {
      byId.set(piece.id, piece);
    }

    /* `not null` in the schema, and they are the credit — the one thing a
       licence is tracked by. */
    if (!isText(piece?.title)) problems.push(`${where}: title is required.`);
    if (!isText(piece?.artist)) problems.push(`${where}: artist is required.`);

    /* Null is ordinary: five of the nine deck cards have no recording, and the
       schema says so with a null rather than a path to a file that is not
       there. */
    if (piece?.file !== null && !isText(piece?.file)) {
      problems.push(`${where}: file must be an object key, or null when there is no recording.`);
    }
    claimKey(piece?.file ?? null, where, 'file');

    /* `not null` and positive by constraint, and it is what the simulated clock
       counts down from — so an invented number here is the difference between a
       countdown and a broken one. */
    if (!isPositiveInt(piece?.durationSeconds)) {
      problems.push(`${where}: durationSeconds must be a positive whole number of seconds.`);
    }

    if (piece?.licenceRef !== null && piece?.licenceRef !== undefined
      && !isText(piece.licenceRef)) {
      problems.push(`${where}: licenceRef must be text, or null.`);
    }
  }

  /* ONE LINE, NOT ONE PER PIECE. Five of the nine deck pieces have no file and
     have not had one since September; a warning per piece on every run is nine
     lines of permanent state, which trains people to skim the output. */
  const silent = pieces.filter((piece) => piece?.file === null).map((piece) => piece?.id);
  if (silent.length > 0) {
    warnings.push(`${silent.length} piece(s) have no recording and play the simulated clock: `
      + `${silent.join(', ')}.`);
  }

  const seen = new Set();

  for (const [index, cut] of (Array.isArray(cuts) ? cuts : []).entries()) {
    const where = isText(cut?.exercise)
      ? `${cut.exercise} · ${cut?.locale} · `
        + `${dimension(cut?.posture) ?? 'any posture'} · `
        + `${dimension(cut?.ending) ?? 'any ending'}`
      : `cuts[${index}]`;

    if (!EXERCISE_ID.test(cut?.exercise ?? '')) {
      problems.push(`${where}: exercise must be an exercise id like \`sound-journey\`.`);
    }
    if (!LOCALES.includes(cut?.locale)) {
      problems.push(`${where}: locale must be one of ${LOCALES.join(', ')} — nothing ever `
        + 'crosses locales, so there is no "any".');
    }
    /* Omitted is legal and means ANY; a value that is neither is a typo. */
    const posture = dimension(cut?.posture);
    const ending = dimension(cut?.ending);
    if (posture !== null && !POSTURES.includes(posture)) {
      problems.push(`${where}: posture must be ${POSTURES.join(', ')}, or omitted for any.`);
    }
    if (ending !== null && !ENDINGS.includes(ending)) {
      problems.push(`${where}: ending must be ${ENDINGS.join(', ')}, or omitted for any — the `
        + 'question on screen is how it ENDS, not what it is for.');
    }

    /* `exercise_cuts_one_per_answer` is `unique nulls not distinct`, so
       two rows claiming the same answers collide in the database. Caught here
       so the migration does not fail halfway through a reset. */
    const id = EXERCISE_ID.test(cut?.exercise ?? '') ? cutId(cut) : null;
    if (id !== null) {
      if (seen.has(id)) problems.push(`${where}: two cuts claim these answers.`);
      seen.add(id);
    }

    /* THE MIX IS THE RECORDING. A cut without it is not one. */
    if (!isText(cut?.mixed)) {
      problems.push(`${where}: mixed is required — it is the recording that plays.`);
    }
    claimKey(cut?.mixed ?? null, where, 'mixed');
    claimKey(cut?.voice ?? null, where, 'voice');

    if (!isPositiveInt(cut?.durationSeconds)) {
      problems.push(`${where}: durationSeconds must be a positive whole number of seconds — `
        + 'both files, which are the same length.');
    }

    if (isText(cut?.piece) && !byId.has(cut.piece)) {
      problems.push(`${where}: piece \`${cut.piece}\` is not in this file.`);
    }

    /* ── THE INTRO MARK, IF THERE IS ONE ─────────────────────────────────
       `exercise_cuts_intro_until_inside` says the same three things in SQL,
       and this says them first — a problem here stops the generator, where a
       constraint violation would stop a `supabase db reset` halfway through
       and leave somebody reading Postgres about a typo in a JSON file. */
    if (cut?.introUntil !== null && cut?.introUntil !== undefined) {
      const intro = introSeconds(cut);
      if (intro === null) {
        problems.push(`${where}: introUntil must be a timecode like \`01:35\` — minutes and `
          + 'seconds — or omitted where there is nothing to skip.');
      } else if (intro === 0) {
        problems.push(`${where}: introUntil \`${cut.introUntil}\` is the start of the `
          + 'recording. Omit it rather than marking zero.');
      } else if (isPositiveInt(cut?.durationSeconds) && intro >= cut.durationSeconds) {
        problems.push(`${where}: introUntil \`${cut.introUntil}\` (${intro}s) is at or past `
          + `the end of a ${cut.durationSeconds}s recording — the button would end it.`);
      }
    }

  }

  /* ── NO WARNING FOR A CUT WITH NO GUIDANCE-ONLY CUT ──────────────
     It was one per cut until 2026-10-12, and it was wrong: Ben's answer
     is that Klangreise *"makes no sense with one of the stems muted, so there
     is no adaptation possible"*. The absence is a DESIGN DECISION about that
     exercise, not a file somebody forgot — and a warning that fires forever on
     a settled decision is what teaches people to skim this output.

     The switch simply does not render where there is no cut to hand over to.
     `music.test.ts` asserts which exercises have one, which is where a change
     to that decision would show up. */

  /* ── ONE LINE FOR THE CREDITS THAT ARE STILL COMING ────────────────────
     Both delivered exercises credit no piece: the unducked original is a
     separate export and is still to come (Ben, 2026-10-12). Until it lands
     nothing of them reaches /discovered-music, which is worth saying once per
     run rather than once per cut. */
  const uncredited = (Array.isArray(cuts) ? cuts : [])
    .filter((cut) => isText(cut?.exercise) && !isText(cut?.piece))
    .map((cut) => cutId(cut));
  if (uncredited.length > 0) {
    warnings.push(`${uncredited.length} cut(s) credit no piece, so nothing of them `
      + `reaches /discovered-music yet: ${uncredited.join(', ')}.`);
  }

  /* NO WARNING FOR A PIECE NOTHING PLAYS, and that is a deliberate omission
     rather than one nobody thought of: the deck plays nine of them through
     `exercise_tracks`, which this file does not own and cannot see. A warning
     here would be wrong nine times out of nine. */

  return { problems, warnings };
}

export function assertMusic(music) {
  const { problems } = checkMusic(music);
  if (problems.length > 0) {
    throw new Error(
      `${MUSIC_IN_GIT} is not usable:\n${problems.map((line) => `  · ${line}`).join('\n')}`,
    );
  }
  return music;
}

/**
 * The library as the two tables see it — the shape both the generator and the
 * database test compare against, so neither can invent a second reading.
 */
export function rows(music) {
  return {
    tracks: orderedPieces(music).map((piece) => ({
      id: piece.id,
      src: piece.file ?? null,
      duration_seconds: piece.durationSeconds,
      title: piece.title,
      artist: piece.artist,
      licence_ref: piece.licenceRef ?? null,
    })),
    exercise_cuts: orderedCuts(music).map((cut) => ({
      id: cutId(cut),
      exercise_id: cut.exercise,
      locale: cut.locale,
      posture: dimension(cut.posture),
      ending: dimension(cut.ending),
      mixed_src: cut.mixed,
      voice_src: cut.voice ?? null,
      duration_seconds: cut.durationSeconds,
      intro_until: introSeconds(cut),
      track_id: cut.piece ?? null,
    })),
  };
}
