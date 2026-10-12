/**
 * The rotation, which is the whole reason the rules are pure functions.
 *
 * The brief's two sentences are in tension and the tension is arithmetic, not
 * taste: *"the same question should not be there every time"* and *"show the
 * questions the user hasn't answered"*. Which one wins depends entirely on
 * what spends a question, and getting it wrong is SILENT — the app works, and
 * somebody just meets Q1 forever. So the first two blocks below walk a whole
 * sequence of sessions rather than testing one call.
 *
 * `docs/LISTENING-QUESTION-ITERATION.md` §6 and §6.1 are the specification.
 */
import { describe, expect, it } from 'vitest';
import {
  canReroll, hasQuestionSet, isKnownQuestion, nextQuestion, questionText, questionsFor,
} from './questions';
import { QUESTION_ORDER, questionsDe, questionsEn } from '../content/questions';
import type { QuestionHistory } from './questions';

const PAUSE = 'mindfulness-cards';
const REIN = 'free-rein';
const SCORE = 'breathing-score';

/** Always the first candidate, so a random branch is still deterministic. */
const first = () => 0;

/**
 * Walk `count` sessions, returning the question each one was given.
 *
 * `spend` decides whether finishing happened, which is the one variable §6.1
 * turns on: a writer spends every question, a skipper under the ORIGINAL D3
 * spent none.
 */
function walk(
  count: number,
  spend: boolean,
  exerciseId = PAUSE,
): (string | null)[] {
  const history: { spent: string[]; previous: string | null } =
    { spent: [], previous: null };
  const shown: (string | null)[] = [];

  for (let i = 0; i < count; i += 1) {
    const picked = nextQuestion(exerciseId, history, [], first);
    shown.push(picked);
    if (picked !== null) {
      if (spend) history.spent.push(picked);
      history.previous = picked;
    }
  }
  return shown;
}

describe('nextQuestion · the ordered walk', () => {
  it('gives a writer the five in their initial order', () => {
    expect(walk(5, true)).toEqual(['lq-01', 'lq-02', 'lq-03', 'lq-04', 'lq-05']);
  });

  it('gives a skipper the same five, which is why D3 changed', () => {
    /* THE POINT OF THE WHOLE REVISION. Spending is finishing, not writing, so
       this sequence is identical to the writer's above. Under the original D3
       — spend only on a saved reflection — `spent` stayed empty and this
       returned lq-01, lq-02, lq-01, lq-02, … forever (§6.1). The test for
       that behaviour is `the skipper under the original rule` below, kept as
       the record of what was rejected. */
    expect(walk(5, true)).toEqual(walk(5, true));
    expect(walk(5, true)).toEqual([...QUESTION_ORDER]);
  });

  it('the skipper under the original rule: two questions, forever', () => {
    /* Not the shipped behaviour — `spend: false` is what "only a saved
       reflection" looked like. Kept because it is the argument for D3's
       revision, and a regression to it would be invisible in the UI. */
    expect(walk(6, false)).toEqual(
      ['lq-01', 'lq-02', 'lq-01', 'lq-02', 'lq-01', 'lq-02'],
    );
  });

  it('goes random once every question is spent, and never repeats the last', () => {
    const spent = [...QUESTION_ORDER];

    /* `random` at its floor picks the first CANDIDATE, and lq-05 is excluded
       as `previous`, so the first candidate is lq-01. */
    expect(nextQuestion(PAUSE, { spent, previous: 'lq-05' }, [], first))
      .toBe('lq-01');

    /* At the top of the range it picks the last candidate — lq-05 with lq-01
       excluded. The clamp is what keeps `random() === 1` in range. */
    expect(nextQuestion(PAUSE, { spent, previous: 'lq-01' }, [], () => 1))
      .toBe('lq-05');
  });

  it('never returns the previous question while another is available', () => {
    for (const previous of QUESTION_ORDER) {
      for (const spent of [[] as string[], [...QUESTION_ORDER]]) {
        expect(nextQuestion(PAUSE, { spent, previous }, [], first))
          .not.toBe(previous);
      }
    }
  });

  it('returns the previous question rather than nothing when it is all there is', () => {
    /* One candidate left and it is the one just seen. A repeat is worse than
       nothing on the first four; on the fifth, nothing would mean no question
       at all, so the tie-breaker yields. */
    const history: QuestionHistory = { spent: [], previous: 'lq-05' };
    const exclude = ['lq-01', 'lq-02', 'lq-03', 'lq-04'];
    expect(nextQuestion(PAUSE, history, exclude, first)).toBe('lq-05');
  });
});

describe('nextQuestion · rejections inside one session', () => {
  const fresh: QuestionHistory = { spent: [], previous: null };

  it('skips what has been turned down', () => {
    expect(nextQuestion(PAUSE, fresh, ['lq-01'], first)).toBe('lq-02');
    expect(nextQuestion(PAUSE, fresh, ['lq-01', 'lq-02'], first)).toBe('lq-03');
  });

  it('returns null at the dead end, which is a state and not a failure', () => {
    /* Everything rejected. §7.4's third button state, and the row that makes
       `question_rejections.rejected_count = 5`. */
    expect(nextQuestion(PAUSE, fresh, [...QUESTION_ORDER], first)).toBeNull();
  });

  it('is unaffected by a question being spent AND rejected', () => {
    /* Both lists exclude it; neither double-counts. */
    expect(nextQuestion(PAUSE, { spent: ['lq-01'], previous: null }, ['lq-01'], first))
      .toBe('lq-02');
  });
});

describe('nextQuestion · an exercise with no set', () => {
  it('returns null, so every screen draws its fallback', () => {
    expect(nextQuestion(SCORE, { spent: [], previous: null }, [], first)).toBeNull();
  });
});

describe('canReroll', () => {
  it('is true while something else exists', () => {
    expect(canReroll(PAUSE, 'lq-01', [])).toBe(true);
  });

  it('counts the question on screen as already offered', () => {
    /* Four rejected plus the fifth in front of them is not an offer. */
    expect(canReroll(PAUSE, 'lq-05', ['lq-01', 'lq-02', 'lq-03', 'lq-04']))
      .toBe(false);
  });

  it('is false with everything rejected and nothing held', () => {
    expect(canReroll(PAUSE, null, [...QUESTION_ORDER])).toBe(false);
  });

  it('is false for an exercise with no set', () => {
    expect(canReroll(SCORE, null, [])).toBe(false);
  });
});

describe('the catalogue', () => {
  it('rotates on both built exercises and on neither of the others', () => {
    /* D2. The three unbuilt exercises are deliberately absent, so nothing
       about their screens changes. */
    expect(hasQuestionSet(PAUSE)).toBe(true);
    expect(hasQuestionSet(REIN)).toBe(true);
    expect(hasQuestionSet(SCORE)).toBe(false);
    expect(hasQuestionSet('sound-journey')).toBe(false);
    expect(hasQuestionSet('body-scan-soundwalk')).toBe(false);
  });

  it('hands both exercises the same five in the same order', () => {
    expect(questionsFor(PAUSE)).toEqual([...QUESTION_ORDER]);
    expect(questionsFor(REIN)).toEqual([...QUESTION_ORDER]);
  });

  it('guards an id that outlived its question', () => {
    /* No foreign key on `sessions.listening_question_id` (D1), so a stored id
       can name a question that has been retired. Treated as "not in the set". */
    expect(isKnownQuestion('lq-01')).toBe(true);
    expect(isKnownQuestion('lq-99')).toBe(false);
    expect(isKnownQuestion(null)).toBe(false);
  });

  it('asks a different thing on listen than on reflect, in both locales', () => {
    /* The whole reason `exercise_i18n.question` was dropped: one asks what is
       happening, the other what happened. A question whose two phrasings were
       identical would be a copy mistake nothing else would catch. */
    for (const id of QUESTION_ORDER) {
      for (const locale of ['de', 'en'] as const) {
        const text = questionText(id, locale);
        expect(text.listen).not.toBe(text.reflect);
      }
    }
  });

  it('carries all three strings in both locales, with nothing placeholder-shaped', () => {
    /* `Record<QuestionId, QuestionText>` already makes a missing field a
       compile error. What it cannot catch is an EMPTY one, or the
       `{{please generate}}` the brief arrived with (CLAUDE.md 6: written, not
       reported). */
    for (const id of QUESTION_ORDER) {
      for (const set of [questionsDe, questionsEn]) {
        for (const value of Object.values(set[id])) {
          expect(value.trim()).not.toBe('');
          expect(value).not.toMatch(/\{\{|TODO|TBD|\[DE\]|placeholder/i);
        }
      }
    }
  });

  it('keeps the German inside the length budget', () => {
    /* docs/GERMAN-UI-WRITING.md §5: German at ≤1.3× the English is inside the
       room `--measure-body: 62ch` reserved. Past that, the layout was not
       designed for it. */
    for (const id of QUESTION_ORDER) {
      for (const field of ['listen', 'reflect', 'helper'] as const) {
        const ratio = questionsDe[id][field].length / questionsEn[id][field].length;
        expect(ratio, `${id}.${field} is ${ratio.toFixed(2)}× the English`)
          .toBeLessThanOrEqual(1.3);
      }
    }
  });

  it('spells the music die Musik, and resonates rather than holds forth', () => {
    /* The two corrections from §4.1 that a later copy edit could undo without
       anybody noticing. `Stück` was removed from the content on purpose by
       `20261009100000_one_word_for_the_music.sql`; `räsonieren` means to hold
       forth or grumble, and the verb for sound is `resonieren`. */
    for (const id of QUESTION_ORDER) {
      for (const value of Object.values(questionsDe[id])) {
        expect(value).not.toMatch(/Stück/);
        expect(value).not.toMatch(/räsonier/);
      }
    }
  });
});
