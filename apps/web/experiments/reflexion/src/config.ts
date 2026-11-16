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
 */
export const SURVEY = {
  id: '01a1e3ac-14f6-0000-babb-e48bb67229f0',
  recommend: {
    id: 'a8eaa483-c6c2-4a44-9e41-eab5600b961e',
    question: 'Würdest du Musie einem Freund oder einer Freundin empfehlen?',
    choices: ['Ja', 'Vielleicht', 'Nein'] as const,
  },
  comment: {
    id: 'e8cfcb36-3dd4-49e2-b694-5595cb46abb8',
    question: 'Möchtest du uns noch etwas mitgeben?',
  },
} as const;

export type RecommendChoice = (typeof SURVEY.recommend.choices)[number];

const de = {
  languageLegend: 'Sprache',
  languageDe: 'DE',
  languageEn: 'EN',
  onlyGerman: 'This exercise is only available in German.',
  logoAlt: 'Musie',

  modalTitle: 'Willkommen bei Musie',
  modalIntro:
    'Du machst gleich eine kurze Musie-Übung und beantwortest danach drei Fragen zu deinem Erleben.',
  nameLabel: 'Dein Name',
  nameRequired: 'Bitte gib deinen Namen ein.',
  start: 'Los geht’s',
  privacy: 'Deine Antworten werden gespeichert und von Lucy und Ben gelesen.',
  consent:
    'Mit „Los geht’s“ bist du einverstanden, dass wir messen, wie die Übung genutzt wird – ohne deinen Namen und ohne deine Antworten.',
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
  thanksSignature: 'Liebe Grüße, Lucy und Ben',
  recommendQuestion: 'Würdest du Musie einem Freund oder einer Freundin empfehlen?',
  recommendChoices: { Ja: 'Ja', Vielleicht: 'Vielleicht', Nein: 'Nein' } as Record<RecommendChoice, string>,
  commentLabel: 'Möchtest du uns noch etwas mitgeben?',
  sendFeedback: 'Feedback senden',
  feedbackThanks: 'Danke für dein Feedback!',
  optionsEmpty: 'Keine Optionen',
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

  modalTitle: 'Welcome to Musie',
  modalIntro:
    'You’re about to do a short Musie exercise and then answer three questions about how it was for you.',
  nameLabel: 'Your name',
  nameRequired: 'Please enter your name.',
  start: 'Let’s start',
  privacy: 'Your answers are saved and read by Lucy and Ben.',
  consent:
    'By pressing “Let’s start” you agree that we measure how the exercise is used – without your name and without your answers.',
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
  thanksSignature: 'Warm regards, Lucy and Ben',
  recommendQuestion: 'Would you recommend Musie to a friend?',
  recommendChoices: { Ja: 'Yes', Vielleicht: 'Maybe', Nein: 'No' },
  commentLabel: 'Anything else you’d like to tell us?',
  sendFeedback: 'Send feedback',
  feedbackThanks: 'Thanks for your feedback!',
  optionsEmpty: 'No options',
  statusError: 'Error',
  statusSuccess: 'Success',

  ended: 'This experiment has ended. Thank you!',
  unknownLink: 'This link does not exist.',
};

export const COPY: Record<Locale, Copy> = { de, en };
