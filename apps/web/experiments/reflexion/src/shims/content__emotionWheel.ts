/**
 * The app's emotion wheel with ADJECTIVES ONLY, for this experiment.
 *
 * Ben, 2026-11-19: „Feelings Data Set in nur Adjektive umformulieren“. A word
 * picked in the feelings sheet is written into the answer
 * (ReflectionStep.tsx), where „Erst unruhig, Trauer“ reads as a list of
 * nouns and „Erst unruhig, trauernd“ reads as a sentence. The app's own wheel
 * (`src/content/emotionWheel.ts`, generated from
 * `supabase/content/emotion-wheel.yml`) is untouched. Its diary and feelings
 * selection keep their words; this shim replaces the module for the
 * experiment's build only (vite.config.ts, the shim rule).
 *
 * Only the label changes. `i` and `id`, which are the identity (the yml says
 * a label is not a key), stay, so a pick resolves exactly as before. Keyed
 * here by the German label, which is unique for every word below.
 *
 * Both languages, because English had the same nouns (Trust, Fear, Grief …).
 * A word that already was an adjective in one language keeps it there.
 *
 * „Ängstlich“ becomes the top level (was „Angst“), so the detailed
 * „Ängstlich“ under it becomes „Beunruhigt“ rather than repeating its parent.
 * „Elend“ is an adjective too, but capitalised as a label it reads as the
 * noun, so it becomes „Miserabel“. The two phrases („Unter Druck“, „Außer
 * sich“) become single adjectives.
 */
import { EMOTION_WHEEL as WHEEL } from '../../../../src/content/emotionWheel';
import type { WheelEmotion, WheelWord } from '../../../../src/content/emotionWheel';

export * from '../../../../src/content/emotionWheel';

const ADJECTIVES: Record<string, { de: string; en: string }> = {
  /* The top level. */
  Vertrauen: { de: 'Vertrauensvoll', en: 'Trusting' },
  Angst: { de: 'Ängstlich', en: 'Afraid' },
  Überraschung: { de: 'Überrascht', en: 'Surprised' },
  Ekel: { de: 'Angeekelt', en: 'Disgusted' },
  Erwartung: { de: 'Gespannt', en: 'Expectant' },

  /* Detailed and specific. */
  Bewunderung: { de: 'Bewundernd', en: 'Admiring' },
  Sehnsucht: { de: 'Sehnsüchtig', en: 'Longing' },
  Ängstlich: { de: 'Beunruhigt', en: 'Anxious' },
  Grauen: { de: 'Angsterfüllt', en: 'Fearful' },
  Ehrfurcht: { de: 'Ehrfürchtig', en: 'Awestruck' },
  Trauer: { de: 'Trauernd', en: 'Grieving' },
  Verzweiflung: { de: 'Verzweifelt', en: 'Despairing' },
  Kummer: { de: 'Bekümmert', en: 'Sorrowful' },
  Elend: { de: 'Miserabel', en: 'Miserable' },
  Missbilligung: { de: 'Missbilligend', en: 'Disapproving' },
  Spott: { de: 'Spöttisch', en: 'Mocking' },
  Abneigung: { de: 'Abgeneigt', en: 'Averse' },
  Verachtung: { de: 'Verächtlich', en: 'Contemptuous' },
  'Unter Druck': { de: 'Bedrängt', en: 'Pressured' },
  'Außer sich': { de: 'Wutentbrannt', en: 'Enraged' },
};

function adjective<T extends WheelWord>(word: T): T {
  const replacement = ADJECTIVES[word.de];
  return replacement === undefined ? word : { ...word, de: replacement.de, en: replacement.en };
}

export const EMOTION_WHEEL: readonly WheelEmotion[] = WHEEL.map((emotion) => ({
  ...adjective(emotion),
  detailed: emotion.detailed.map((detailed) => ({
    ...adjective(detailed),
    specific: detailed.specific.map(adjective),
  })),
}));
