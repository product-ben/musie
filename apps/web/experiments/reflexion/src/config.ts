/**
 * Experiment „Reflexion 01“ — the whole configuration, hard-coded on purpose
 * (brief: "Hardcoden ist im Experiment ausdrücklich erlaubt").
 *
 * Every user-visible string of the experiment's own UI lives in COPY below, in
 * both languages. The stepper's strings still come from the app's catalogue
 * and the baked content.
 */
import type { Locale } from '../../../src/i18n';

export const EXPERIMENT_ID = 'reflexion-01';

/** Kill switch. `false` → every link shows COPY.ended. */
export const ENABLED = true;

/** 1 was the placeholder set (local test rows only); 2 is Lucy's wording, 2026-11-16. */
export const QUESTION_SET_VERSION = 2;

export type Slug = 'harfe' | 'body-scan' | 'freie-bahn';

export interface ExperimentExercise {
  slug: Slug;
  /** What PostHog and `experiment_responses.exercise_key` carry. */
  exercise_key: Slug;
  /** `exercises.id` in the app's database. */
  exerciseId: 'harp' | 'body-scan-soundwalk' | 'free-rein';
  languages: readonly Locale[];
}

export const EXERCISES: Record<Slug, ExperimentExercise> = {
  harfe: { slug: 'harfe', exercise_key: 'harfe', exerciseId: 'harp', languages: ['de', 'en'] },
  'body-scan': {
    slug: 'body-scan',
    exercise_key: 'body-scan',
    exerciseId: 'body-scan-soundwalk',
    /* The texts exist in EN too, but the guided audio is German only. */
    languages: ['de'],
  },
  'freie-bahn': {
    slug: 'freie-bahn',
    exercise_key: 'freie-bahn',
    exerciseId: 'free-rein',
    languages: ['de', 'en'],
  },
};

export interface ReflectionQuestion {
  question_key: string;
  text: Record<Locale, string>;
  /** Offers the app's feelings sheet under the question; a pick is written
      into the answer as plain text (Ben, 2026-11-16). */
  feelingsHelp?: true;
}

/** Lucy's three, the same for every exercise. A change of wording raises
    QUESTION_SET_VERSION. */
export const QUESTIONS: readonly ReflectionQuestion[] = [
  {
    question_key: 'q1',
    text: { de: 'Was hast du gehört?', en: 'What did you hear?' },
  },
  {
    question_key: 'q2',
    text: {
      de: 'Hat sich deine Stimmung während des Zuhörens bzw. des Spielens verändert? Wenn ja, inwiefern?',
      en: 'Did your mood change while you were listening or playing? If so, how?',
    },
    feelingsHelp: true,
  },
  {
    question_key: 'q3',
    text: {
      de: 'Wenn du der Musik einen Namen geben würdest, welcher wäre das?',
      en: 'If you gave the music a name, what would it be?',
    },
  },
];

/**
 * Freie Bahn, fixed: the „blue sun“ (art-01 / MC-01) and „Aura“ (trk-10,
 * Martin Landh — spelled so in the data). Not paired by any card in the deck;
 * wired independently here, the regular app is untouched.
 */
export const FREIE_BAHN = {
  artworkId: 'art-01',
  imageSrc: '/assets/web/cards/mc-01.webp',
  trackId: 'trk-10',
  trackTitle: 'Aura',
  trackArtist: 'Martin Landh',
  trackSrc: '/experiments/reflexion/media/aura.mp3',
} as const;

export const BODY_SCAN_AUDIO_SRC = '/experiments/reflexion/media/body-scan-de.mp3';

/**
 * PostHog survey of type `api`, created 2026-11-16 via MCP (draft).
 * https://eu.posthog.com/project/313428/surveys/01a1e3ac-14f6-0000-babb-e48bb67229f0
 * Answers are sent in the survey's base language (de) whatever the UI shows.
 *
 * QUESTIONS v2 — Ben, 2026-11-18. Two NPS ratings (0–10) and two open
 * questions, all optional. They replaced v1 (Ja/Vielleicht/Nein plus one
 * comment), which only ever had test answers. The `id`s are PostHog's, made
 * by that update. A response arrives as `$survey_response_<id>`, and the
 * dashboard reads it by that name. Change a question's TEXT here and in
 * PostHog together; never change an `id`.
 *
 * Ben's wording with two fixes: „am besten“ is lower case (Duden: the
 * superlative with „am“), and the wish question gets its question mark.
 */
export const SURVEY = {
  id: '01a1e3ac-14f6-0000-babb-e48bb67229f0',
  questions: [
    {
      key: 'npsFriends',
      kind: 'rating',
      id: '5c858623-7760-47f1-962e-68bbfe1e3405',
      question:
        'Wie wahrscheinlich ist es, dass du diese Übung zum Entspannen deinen FreundInnen oder deiner Familie empfehlen würdest?',
    },
    {
      key: 'npsColleagues',
      kind: 'rating',
      id: 'aee57a83-e5d9-4fc1-9344-ecbb1e663533',
      question:
        'Wie wahrscheinlich ist es, dass du diese Übung zum Entspannen deinen KollegInnen empfehlen würdest?',
    },
    {
      key: 'wish',
      kind: 'open',
      id: '47ed41d7-69cb-416f-8005-95b0b39aff6c',
      question: 'Was würdest du dir anders wünschen?',
    },
    {
      key: 'best',
      kind: 'open',
      id: '8862ec2e-6a79-4b9b-ac80-06dc2b3e7c00',
      question: 'Was fandest du am besten?',
    },
  ],
} as const;

export type SurveyQuestion = (typeof SURVEY.questions)[number];
export type SurveyKey = SurveyQuestion['key'];
export type RatingKey = Extract<SurveyQuestion, { kind: 'rating' }>['key'];
export type OpenKey = Extract<SurveyQuestion, { kind: 'open' }>['key'];
/** One submission: a rating is a whole number 0–10, an open answer is text. */
export type SurveyAnswers = Partial<Record<RatingKey, number> & Record<OpenKey, string>>;

const de = {
  languageLegend: 'Sprache',
  languageDe: 'DE',
  languageEn: 'EN',
  onlyGerman: 'This exercise is only available in German.',
  logoAlt: 'Musie',
  testMode: 'Testmodus – zählt nicht mit',

  modalTitle: 'Willkommen bei Musie',
  modalIntro:
    'Danke, dass du eine Musie-Übung ausprobierst. Dein Feedback ist super wertvoll, bitte beantworte daher auch die Fragen am Schluss.',
  nameLabel: 'Dein Name',
  nameRequired: 'Bitte gib deinen Namen ein.',
  start: 'Los geht’s',
  /* Ben's wording, Figma node 280:2973, 2026-11-18. It replaced two lines:
     the one on who reads the answers, and the one promising that the text
     fields are not measured. The comma after „nutzt“ closes the inserted
     clause, and the full stop ends the sentence. Figma has neither. */
  consent:
    'Mit „Los geht’s“ bist du einverstanden, dass wir unter deinem Namen messen, wie du die Übung nutzt, und dich eventuell mit Rückfragen kontaktieren.',
  modalClose: 'Schließen',

  reflectionHeading: 'Nachdenken',
  feelingsHelp: 'Hilf mir, meine Stimmung in Worte zu fassen',
  done: 'Fertig',
  saving: 'Wird gespeichert …',
  saveErrorHeadline: 'Das hat nicht geklappt.',
  saveErrorText:
    'Deine Antworten sind noch da. Prüfe kurz deine Verbindung und versuch es noch einmal.',
  retry: 'Noch einmal versuchen',
  back: 'Zurück',

  thanksHeadline: 'Danke, dass du an unserem Experiment teilgenommen hast.',
  /* German IS the survey's base language, so the screen shows exactly what
     PostHog stores: one source, SURVEY above. */
  surveyQuestions: Object.fromEntries(
    SURVEY.questions.map((q) => [q.key, q.question]),
  ) as Record<SurveyKey, string>,
  npsLow: 'Unwahrscheinlich',
  npsHigh: 'Sehr wahrscheinlich',
  /* What a screen reader hears on a slider nobody has touched yet. */
  npsUnset: 'Noch keine Auswahl',
  sendFeedback: 'Feedback senden',
  feedbackThanks: 'Danke für dein Feedback!',
  statusError: 'Fehler',
  statusSuccess: 'Erfolg',

  ended: 'Dieses Experiment ist beendet. Danke!',
  unknownLink: 'Diesen Link gibt es nicht.',
};

export type Copy = typeof de;

const en: Copy = {
  languageLegend: 'Language',
  languageDe: 'DE',
  languageEn: 'EN',
  onlyGerman: 'This exercise is only available in German.',
  logoAlt: 'Musie',
  testMode: 'Test mode – not counted',

  modalTitle: 'Welcome to Musie',
  modalIntro:
    'Thanks for trying a Musie exercise. Your feedback is really valuable, so please answer the questions at the end too.',
  nameLabel: 'Your name',
  nameRequired: 'Please enter your name.',
  start: 'Let’s start',
  consent:
    'By pressing “Let’s start” you agree that we measure, under your name, how you use the exercise, and that we may contact you with follow-up questions.',
  modalClose: 'Close',

  reflectionHeading: 'Reflect',
  feelingsHelp: 'Help me put my mood into words',
  done: 'Done',
  saving: 'Saving …',
  saveErrorHeadline: 'That didn’t work.',
  saveErrorText: 'Your answers are still here. Check your connection and try again.',
  retry: 'Try again',
  back: 'Back',

  thanksHeadline: 'Thank you for taking part in our experiment.',
  surveyQuestions: {
    npsFriends: 'How likely are you to recommend this exercise for relaxing to your friends or family?',
    npsColleagues: 'How likely are you to recommend this exercise for relaxing to your colleagues?',
    wish: 'What would you like to be different?',
    best: 'What did you like best?',
  },
  npsLow: 'Unlikely',
  npsHigh: 'Very likely',
  npsUnset: 'Nothing chosen yet',
  sendFeedback: 'Send feedback',
  feedbackThanks: 'Thanks for your feedback!',
  statusError: 'Error',
  statusSuccess: 'Success',

  ended: 'This experiment has ended. Thank you!',
  unknownLink: 'This link does not exist.',
};

export const COPY: Record<Locale, Copy> = { de, en };
