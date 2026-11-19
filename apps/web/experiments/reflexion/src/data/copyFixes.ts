/**
 * Copy changes to the BAKED exercise content, for this experiment only.
 *
 * Ben, 2026-11-19, after testing the live links: a list of wording changes to
 * the harp's texts and the intros. They are exercise CONTENT, not the
 * experiment's own copy, so they live in the content tables and reach this
 * page through `content.json`. The app stays untouched (the brief), so they are
 * applied here, over the baked content, when it loads (`store.ts`), rather
 * than in a migration that would change the app's exercises too.
 *
 * Each fix replaces an exact text. A re-export (`scripts/export-content.mjs`)
 * leaves this file working, and if the content under a fix has changed so
 * that it no longer matches, the dev build says so in the console instead of
 * silently showing the old words.
 *
 * Punctuation, where it differs from Ben's list:
 * - a comma before a clause introduced by „wie“ („so lange, wie du magst“,
 *   „so, wie es sich gut anfühlt“);
 * - „Saiten“ for „Seiten“;
 * - no full stop on the play step's heading, as no heading in the app has one.
 */
import type { Locale } from '../../../../src/i18n';

export interface CopyFix {
  locale: Locale;
  /** Exact text as baked. Replaced wherever it occurs in that locale's exercises. */
  find: string;
  replace: string;
}

export const COPY_FIXES: readonly CopyFix[] = [
  /* „heran kommen“ → „herankommen“, in all three intros. */
  { locale: 'de', find: 'an dich heran kommen', replace: 'an dich herankommen' },

  /* Harfe · Einsteigen: the volume. */
  {
    locale: 'de',
    find: 'Hab dein Gerät bitte nicht auf voller Lautstärke, dann klingen Musies Instrumente beruhigender.',
    replace: 'Bei mittlerer Lautstärke klingen die Instrumente am besten.',
  },
  {
    locale: 'en',
    find: 'Please don\'t have your device at full volume — Musie\'s instruments sound more soothing that way.',
    replace: 'The instruments sound best at medium volume.',
  },

  /* Harfe · Einsteigen: the two ways to play. */
  {
    locale: 'de',
    find: 'Machst du eine Pause, antwortet die Harfe passend zu deiner Musik. Spielst du dazwischen, hört sie auf, und du bist wieder dran.',
    replace: 'Mach eine Pause und die Harfe spielt selber. Du kannst die Harfe jederzeit unterbrechen.',
  },
  {
    locale: 'en',
    find: 'When you pause, the harp answers to suit your music. Play in between and it stops, and it\'s your turn again.',
    replace: 'Take a pause and the harp plays by itself. You can interrupt the harp at any time.',
  },
  {
    locale: 'de',
    find: 'Die Harfe antwortet nicht. Spiel frei, so lange du magst.',
    replace: 'Spiel so kurz oder so lange, wie du magst.',
  },
  {
    locale: 'en',
    find: 'The harp does not answer. Play freely for as long as you like.',
    replace: 'Play for as short or as long as you like.',
  },

  /* Harfe · Musizieren: the heading, the pointer hint, the focus line. */
  {
    locale: 'de',
    find: '## Wenn du bereit bist, spiel auf der Harfe',
    replace: '## Spiel auf der Harfe, wenn du bereit bist',
  },
  {
    locale: 'en',
    find: '## When you\'re ready, play the harp',
    replace: '## Play the harp when you\'re ready',
  },
  {
    locale: 'de',
    find: 'Spiele mehrere Töne gleichzeitig, indem du deine Tastatur nutzt oder mit gedrückter Maustaste über mehrere Saiten fährst. Klickst du eine Saite an, ist der Ton leiser, als wenn du sie mit gedrückter Maustaste zupfst.',
    replace: 'Streiche über mehrere Saiten, um Töne gleichzeitig zu spielen. Klickst du eine Saite an, ist der Ton leiser. Zupfst du sie, ist er lauter.',
  },
  {
    locale: 'en',
    find: 'Play several notes at once with your keyboard, or drag across several strings with the mouse button held down. Clicking a string sounds softer than plucking it with the mouse button held down.',
    replace: 'Sweep across several strings to play notes at once. Clicking a string sounds softer. Plucking it sounds louder.',
  },
  {
    locale: 'de',
    find: 'Atme tief ein und aus. Spiele dabei Musies Harfe im Rhythmus deines Atems.',
    replace: 'Atme ruhig weiter. Spiele die Harfe so, wie es sich gut anfühlt.',
  },
  {
    locale: 'en',
    find: 'Breathe deeply in and out. Play Musie\'s harp in the rhythm of your breath.',
    replace: 'Keep breathing calmly. Play the harp in whatever way feels good.',
  },
];

/** Applies every fix to the baked exercises, in place, and reports any that
    no longer match anything. */
export function applyCopyFixes(exercises: Record<string, Record<string, unknown>>): void {
  const used = new Set<CopyFix>();
  const fixValue = (value: unknown, locale: string): unknown => {
    if (typeof value === 'string') {
      let next = value;
      for (const fix of COPY_FIXES) {
        if (fix.locale !== locale || !next.includes(fix.find)) continue;
        next = next.split(fix.find).join(fix.replace);
        used.add(fix);
      }
      return next;
    }
    if (Array.isArray(value)) return value.map((item) => fixValue(item, locale));
    if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const key of Object.keys(record)) record[key] = fixValue(record[key], locale);
      return record;
    }
    return value;
  };
  for (const locale of Object.keys(exercises)) {
    const byId = exercises[locale];
    for (const id of Object.keys(byId)) byId[id] = fixValue(byId[id], locale);
  }
  if (import.meta.env.DEV) {
    for (const fix of COPY_FIXES) {
      if (!used.has(fix)) {
        console.warn(`[reflexion] copy fix no longer matches the baked content (${fix.locale}): ${fix.find.slice(0, 60)}…`);
      }
    }
  }
}
