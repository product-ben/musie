/**
 * The rotating listening questions.
 *
 * Five questions, each with three strings in two locales: what is asked while
 * the music plays, what is asked while reflecting, and the helper offered to
 * somebody who is stuck.
 *
 * `docs/LISTENING-QUESTION-ITERATION.md` is the PRD. §4 is this data and §5 is
 * why it is here rather than in Postgres.
 *
 * ── WHY A REPO FILE AND NOT A CONTENT TABLE (D1) ──────────────────────────
 * Because the obvious answer in this repo is the wrong one here, and will be
 * proposed again.
 *
 * Content lives in the content tables because of the ROWS THE TEXT HANGS OFF,
 * not because it is text. `cards.code` is printed on the paper beside the QR.
 * `exercise_tracks` says which recording plays for an (exercise, card) pair.
 * `sessions.card_id` has a foreign key into `cards` so a diary entry can never
 * claim a card that does not exist. The `_i18n` siblings are in Postgres
 * because their PARENTS have to be.
 *
 * This is the first content in the repo that is only text — five entries, an
 * order, three strings, two locales, no relations. Its single relational edge
 * is which question a session was given, and that is four columns on
 * `sessions` (`20261011120000_listening_question_rotation.sql`).
 *
 * What the move buys, concretely: THE TYPE CHECKER IS THE COMPLETENESS CHECK.
 * `Record<QuestionId, QuestionText>` makes a missing question a type error AND
 * a missing field a type error, so a question written in German and not
 * English fails `pnpm check` on the machine and in CI. The database's
 * equivalent, `missing_translations`, is a query somebody has to remember to
 * run, and `pnpm check` never touches the database (CLAUDE.md 8).
 *
 * ── AND NOT IN src/i18n/ EITHER ───────────────────────────────────────────
 * That catalogue is CHROME: ours, permanent, keyed by `MessageKey`. These are
 * CONTENT, keyed by question id and provisional in the way all content is
 * (CLAUDE.md 6). Mixing them would put `MessageKey` in the business of naming
 * content, and would mean an exercise's question could be reached with
 * `t()` from anywhere.
 *
 * The five chrome strings the feature needs — the two button labels, the
 * dead-end line, the reset label and the `?`'s name — ARE in `i18n/`, under
 * `session.listen.question*`. They are the app's own words about the
 * apparatus.
 *
 * ── MARKDOWN, AND WHERE IT STOPS (D5) ─────────────────────────────────────
 * All three strings are Markdown and go through `lib/markdown.ts`. Nothing in
 * the set uses any today — they are plain sentences — but the column they
 * replaced was Markdown and the next question written may want emphasis.
 *
 * ONE EXCEPTION, and it is not a preference: `helper` reaches the reflect
 * step's answer field as a `placeholder`, which is an ATTRIBUTE on a textarea.
 * There is nothing there to render, so it is flattened with `plainText` first
 * — otherwise `**` and `##` would reach the reader. See `SessionReflect`.
 */

/**
 * The ids, as a union rather than `string`.
 *
 * This is what makes `Record<QuestionId, QuestionText>` below a completeness
 * check instead of a dictionary: adding `'lq-06'` here fails to compile until
 * both locales carry it.
 *
 * `lq-NN`, and the number is the INITIAL order, which is also `QUESTION_ORDER`
 * below. Unlike `tracks.id` there is nothing to hide here — a question is not
 * an answer — so the ids are readable.
 */
export type QuestionId = 'lq-01' | 'lq-02' | 'lq-03' | 'lq-04' | 'lq-05';

export interface QuestionText {
  /**
   * The headline on `/listen?focus`, while the music plays.
   *
   * Not always a question, and that is deliberate: `lq-05` is an invitation
   * whose last clause gives permission to feel nothing. On a sheet where the
   * track is already playing, an invitation is the right shape.
   */
  listen: string;
  /**
   * The headline on `/reflect`, afterwards.
   *
   * A DIFFERENT STRING from `listen`, always — which is the whole reason the
   * single `exercise_i18n.question` column was dropped on 2026-09-23. One asks
   * what is happening; the other asks what happened. Same question, two
   * tenses.
   */
  reflect: string;
  /**
   * The help, for a listener who cannot get started.
   *
   * Three places, one string: behind the `?` on the listen sheet, as the
   * reflect field's placeholder, and above the transcribe button in voice
   * mode. It is a nudge with a smaller surface than the question — two short
   * concrete prompts rather than the question again in other words.
   */
  helper: string;
}

/**
 * The initial order — "initial order: 1…5" in the brief.
 *
 * `readonly`, and the rotation never mutates it: `lib/questions.ts` filters
 * and indexes, so this array is the one statement of what order means.
 */
export const QUESTION_ORDER: readonly QuestionId[] = [
  'lq-01', 'lq-02', 'lq-03', 'lq-04', 'lq-05',
];

/**
 * WHICH EXERCISES DRAW FROM THE SET (D2).
 *
 * Achtsame Pause and Freie Bahn — the two built exercises. Keyed by
 * `exercises.id`, which the DATABASE owns, so a typo here means "this exercise
 * has no questions" and nothing complains. That check is a db test, beside
 * `deck.db.test.ts`, which already proves file↔database parity for the deck:
 * every key here is a row in `public.exercises`.
 *
 * An exercise that is NOT a key keeps today's behaviour entirely — the
 * question out of `listen_md`, the heading out of `reflect_md`,
 * `reflect_placeholder` in the field, and no `?` or re-roll button. That is
 * `breathing-score`, `sound-journey` and `body-scan-soundwalk`, none of which
 * is built; they get questions when they get copy.
 */
export const QUESTION_SETS: Record<string, readonly QuestionId[]> = {
  'mindfulness-cards': QUESTION_ORDER,
  'free-rein': QUESTION_ORDER,
};

/* ── The copy ───────────────────────────────────────────────────────────────
   Ben's, 2026-10-11, with four corrections he approved (PRD §4.1):

     räsoniert           → resoniert            räsonieren is to hold forth
     im Laufe des Stückes → im Laufe der Musik   20261009100000 removed Stück
     Wahrnehmung auf das Bild → …des Bildes      Wahrnehmung takes the genitive
     30 S.               → 30 Sek.               (that one is in i18n/, not here)

   and three plain typos fixed without ceremony: `ppassiert`, `Entstanden`
   mid-sentence, `wo die Tiefen` for the elliptical `die tiefen [Töne]`.

   The four `{{please generate}}` helpers are written here, to
   docs/GERMAN-UI-WRITING.md (CLAUDE.md 6: a missing German string is written,
   not reported). Provisional like all content — the Mindfulness Cards
   spreadsheet may overwrite it — and held to the standard so nothing
   placeholder-shaped ships.

   German runs 1.15–1.28× the English throughout, inside the ≤1.3× that
   `--measure-body: 62ch` was derived from (§5 of that file). */

export const questionsDe: Record<QuestionId, QuestionText> = {
  'lq-01': {
    listen: 'Welches Bild entsteht vor deinem inneren Auge?',
    reflect: 'Was für ein Bild ist vor deinem inneren Auge entstanden?',
    helper: 'Was für einen Namen würdest du der Szene geben? Was passiert darin?',
  },
  'lq-02': {
    listen: 'Lass die Klänge auf dich wirken. Sieh dir das Bild genauer an – verändert sich etwas in deiner Wahrnehmung des Bildes durch die Musik?',
    reflect: 'Was hat sich in deiner Wahrnehmung des Bildes durch die Musik geändert?',
    helper: 'Wirkt das Bild jetzt wärmer oder kälter? Näher oder weiter weg?',
  },
  'lq-03': {
    listen: 'Lass die Klänge auf dich wirken. Wo spürst du die hohen Töne? Wo spürst du die tiefen Töne?',
    reflect: 'Wie haben die Klänge auf dich gewirkt? Wo hast du die hohen Töne gespürt, wo die tiefen?',
    helper: 'Wo im Körper sitzen die hohen Töne – im Kopf, im Brustkorb, in den Füßen? Und die tiefen?',
  },
  'lq-04': {
    listen: 'Von welcher Seite kommt welcher Ton? Verändert sich die Richtung im Laufe der Musik?',
    reflect: 'Von welcher Seite ist welcher Ton gekommen? Hat sich die Richtung im Laufe der Musik verändert?',
    helper: 'Schließe die Augen und lass den Klang wandern. Kommt er von links, von rechts, von überall?',
  },
  'lq-05': {
    listen: 'Spüre einmal nach, wo der Klang in deinem Körper resoniert. Vielleicht kribbelt es irgendwo. Vielleicht kommt eine Gänsehaut. Oder auch nicht – wir sind alle unterschiedlich.',
    reflect: 'Hat der Klang in deinem Körper resoniert? Was hast du wo gespürt?',
    helper: 'Geh in Gedanken von den Füßen bis zum Kopf. Wo ist es warm, wo eng, wo kribbelt es?',
  },
};

export const questionsEn: Record<QuestionId, QuestionText> = {
  'lq-01': {
    listen: 'What picture forms in your mind’s eye?',
    reflect: 'What kind of picture formed in your mind’s eye?',
    helper: 'What name would you give the scene? What happens in it?',
  },
  'lq-02': {
    listen: 'Let the sounds work on you. Look at the picture more closely — does the music change anything in how you see it?',
    reflect: 'What changed in how you saw the picture, because of the music?',
    helper: 'Does the picture feel warmer now, or colder? Closer, or further away?',
  },
  'lq-03': {
    listen: 'Let the sounds work on you. Where do you feel the high notes? Where do you feel the low ones?',
    reflect: 'How did the sounds work on you? Where did you feel the high notes, and where the low ones?',
    helper: 'Where in your body do the high notes sit — head, chest, feet? And the low ones?',
  },
  'lq-04': {
    listen: 'Which sound comes from which side? Does the direction change as the music goes on?',
    reflect: 'Which sound came from which side? Did the direction change as the music went on?',
    helper: 'Close your eyes and let the sound travel. Does it come from the left, the right, from everywhere?',
  },
  'lq-05': {
    listen: 'Feel for where the sound resonates in your body. Maybe something tingles. Maybe you get goosebumps. Or maybe not — we are all different.',
    reflect: 'Did the sound resonate in your body? What did you feel, and where?',
    helper: 'Go from your feet to your head in your mind. Where is it warm, where tight, where does it tingle?',
  },
};
