/**
 * The database → a config → the `Exercise` the preview renders, for the
 * instruments kind (2026-11-09).
 *
 * The round trip is the property worth pinning: the builder reads a row, the
 * therapist edits the config, and `configToExercise` hands the edited copy to
 * the very screens the app runs. A field that falls out anywhere on that path
 * is a field she can type into and never see — so the test compares the WHOLE
 * `Exercise`, not a list of fields somebody remembered to check.
 *
 * The fixtures are the `Exercise` that `content.ts` assembles from the rows
 * `20261109100000_instruments.sql` inserts, copied from that file: the harp,
 * which uses no motion sensor, and the kalimba, which does.
 */
import { describe, expect, it } from 'vitest';

import { buildExerciseConfig, exerciseOrder } from './buildExerciseConfig';
import { configToExercise } from './configToExercise';
import { validateConfig } from './exerciseConfig';
import type { ExerciseConfig } from './exerciseConfig';
import type { Exercise } from './content';
import type { Locale } from '../i18n';

const REFLECT = {
  de: '## Wie fühlst du dich jetzt?\n\nSchreib auf, was du magst. Ein Wort reicht.',
  en: '## How do you feel now?\n\nWrite down whatever you like. One word is enough.',
};
const PLACEHOLDER = {
  de: 'Welcher Ton ist dir geblieben? Was hat sich verändert, seit du angefangen hast?',
  en: 'Which note stayed with you? What has changed since you started?',
};

function instrumentExercise(
  id: string,
  sort: number,
  locale: Locale,
  text: Pick<Exercise, 'name' | 'description' | 'needs' | 'imageAlt' | 'introMd'>,
  instrument: Omit<NonNullable<Exercise['instrument']>, 'id' | 'defaultMode' | 'vibrationDefault'>,
): Exercise {
  return {
    id,
    kind: 'instruments',
    timeframeMin: 3,
    timeframeMax: 10,
    needsCards: false,
    cardsDealt: null,
    needsSound: true,
    asksPosture: false,
    imageUrl: `assets/web/exercises/${id}.webp`,
    implemented: true,
    sort,
    listenGateSeconds: 90,
    ...text,
    scanMd: '',
    listenMd: '',
    reflectMd: REFLECT[locale],
    reflectPlaceholder: PLACEHOLDER[locale],
    goalIds: ['relax'],
    instrument: { id, defaultMode: 'with_musie', vibrationDefault: true, ...instrument },
  };
}

function harp(): Record<Locale, Exercise> {
  return {
    de: instrumentExercise('harp', 8, 'de', {
      name: 'Harfe',
      description: 'Atme tief ein und aus und spiel dabei Musies Harfe im Rhythmus deines Atems.',
      needs: 'Dein Handy',
      imageAlt: 'Eine Harfe mit sieben Saiten',
      introMd: '## Loslegen\n\nSuch dir einen ruhigen Ort, an dem du die nächsten Minuten ungestört bist. Zieh eine Saite und lass sie los: je weiter, desto lauter. Wischen streicht über die Saiten.',
    }, {
      volumeMd: 'Stell dein Handy etwas leiser als sonst. Leise klingt die Harfe schöner.',
      browserMd: 'Am besten klingt es auf dem iPhone in Safari und auf Android in Chrome.',
      motionMd: null,
      playMd: '## Atme tief ein und aus\n\nSpiele dabei Musies Harfe im Rhythmus deines Atems.',
      playCta: 'Zur Harfe',
      modeSoloLabel: 'Ich spiele allein',
      modeSoloMd: 'Die Harfe antwortet nicht. Spiel frei, so lange du magst.',
      modeMusieLabel: 'Ich spiele mit Musie',
      modeMusieMd: 'Machst du eine Pause, antwortet die Harfe. Sie greift etwas aus deinem Spiel auf, ohne es nachzuspielen. Ihre Saiten leuchten grün. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
    }),
    en: instrumentExercise('harp', 8, 'en', {
      name: 'Harp',
      description: 'Breathe deeply in and out and play Musie\'s harp in the rhythm of your breath.',
      needs: 'Your phone',
      imageAlt: 'A harp with seven strings',
      introMd: '## Getting started\n\nFind a quiet place where nobody will disturb you for the next few minutes. Pull a string and let go: the further, the louder. Swiping strums the strings.',
    }, {
      volumeMd: 'Turn your phone down a little. The harp sounds better quiet.',
      browserMd: 'It sounds best in Safari on an iPhone and in Chrome on Android.',
      motionMd: null,
      playMd: '## Breathe deeply in and out\n\nPlay Musie\'s harp in the rhythm of your breath.',
      playCta: 'To the harp',
      modeSoloLabel: 'I play alone',
      modeSoloMd: 'The harp does not answer. Play freely for as long as you like.',
      modeMusieLabel: 'I play with Musie',
      modeMusieMd: 'When you pause, the harp answers. It picks something up from your playing without copying it. Its strings light up green. Tap in between and it stops, and it is your turn again.',
    }),
  };
}

function kalimba(): Record<Locale, Exercise> {
  return {
    de: instrumentExercise('kalimba', 6, 'de', {
      name: 'Kalimba',
      description: 'Tippe die Zungen der Kalimba an und hör ihnen beim Nachklingen zu. Schwenkst du das Handy, schwingt der Klang mit.',
      needs: 'Dein Handy',
      imageAlt: 'Eine Kalimba mit neun Zungen auf einem Holzkörper',
      introMd: '## Loslegen\n\nSuch dir einen ruhigen Ort, an dem du die nächsten Minuten ungestört bist. Halte das Handy in beiden Händen, so dass deine Daumen die Zungen erreichen.',
    }, {
      volumeMd: 'Stell dein Handy etwas leiser als sonst. Leise klingt die Kalimba schöner.',
      browserMd: 'Am besten klingt es auf dem iPhone in Safari und auf Android in Chrome.',
      motionMd: 'Schwenkst du das Handy, schwingt der Klang mit. Dafür nutzt die Kalimba die Bewegung deines Handys. Dein Handy fragt dich einmal, ob du das erlaubst.',
      playMd: '## Tippe die Zungen der Kalimba an\n\nSchwenkst du das Handy, schwingt der Klang mit.',
      playCta: 'Zur Kalimba',
      modeSoloLabel: 'Ich spiele allein',
      modeSoloMd: 'Die Kalimba antwortet nicht. Spiel frei, so lange du magst.',
      modeMusieLabel: 'Ich spiele mit Musie',
      modeMusieMd: 'Machst du eine Pause, antwortet die Kalimba. Sie greift etwas aus deinem Spiel auf, ohne es nachzuspielen. Ihre Zungen leuchten grün. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
    }),
    en: instrumentExercise('kalimba', 6, 'en', {
      name: 'Kalimba',
      description: 'Tap the kalimba\'s tines and listen to them ring. Swing your phone and the sound swings with it.',
      needs: 'Your phone',
      imageAlt: 'A kalimba with nine tines on a wooden body',
      introMd: '## Getting started\n\nFind a quiet place where nobody will disturb you for the next few minutes. Hold the phone in both hands so your thumbs reach the tines.',
    }, {
      volumeMd: 'Turn your phone down a little. The kalimba sounds better quiet.',
      browserMd: 'It sounds best in Safari on an iPhone and in Chrome on Android.',
      motionMd: 'Swing your phone and the sound swings with it. For that the kalimba uses your phone\'s movement. Your phone asks you once whether that is all right.',
      playMd: '## Tap the kalimba\'s tines\n\nSwing your phone and the sound swings with it.',
      playCta: 'To the kalimba',
      modeSoloLabel: 'I play alone',
      modeSoloMd: 'The kalimba does not answer. Play freely for as long as you like.',
      modeMusieLabel: 'I play with Musie',
      modeMusieMd: 'When you pause, the kalimba answers. It picks something up from your playing without copying it. Its tines light up green. Tap in between and it stops, and it is your turn again.',
    }),
  };
}

const build = (byLocale: Record<Locale, Exercise>) =>
  buildExerciseConfig({ byLocale, cuts: [] });

describe('an instruments exercise as a config', () => {
  it('runs intro · play · reflect, with no listen step', () => {
    expect(build(harp()).run.map((entry) => entry.step)).toEqual(['intro', 'play', 'reflect']);
  });

  it('states the instrument on the play step, and the timer with it', () => {
    const play = build(harp()).run[1];
    expect(play?.instrument).toEqual({ id: 'harp', defaultMode: 'with_musie', vibrationDefault: true });
    expect(play?.gateSeconds).toBe(90);
  });

  /* The sensor is the one feature that differs between the three, and its
     words are what decide it: `motion_md` is null for the harp. */
  it('asks for the motion sensor where the instrument uses it, and only there', () => {
    expect(build(kalimba()).run[1]?.features).toContain('motion_permission');
    expect(build(harp()).run[1]?.features).not.toContain('motion_permission');
  });

  /* ABSENT, NOT EMPTY: the builder draws no motion field for the harp, and
     an empty string would be a field it then had to explain. */
  it('leaves the harp without a motion sentence at all', () => {
    expect(build(harp()).run[0]?.copy.de).not.toHaveProperty('motionMd');
    expect(build(kalimba()).run[0]?.copy.de?.motionMd).toContain('Schwenkst du das Handy');
  });

  it('splits play_md into a headline and a body, like every other step', () => {
    expect(build(harp()).run[1]?.copy.de).toMatchObject({
      headline: 'Atme tief ein und aus',
      bodyMd: 'Spiele dabei Musies Harfe im Rhythmus deines Atems.',
      playCta: 'Zur Harfe',
    });
  });

  it('is a valid config as it comes out of the database', () => {
    expect(validateConfig(build(harp()))).toEqual([]);
    expect(validateConfig(build(kalimba()))).toEqual([]);
  });
});

describe('the round trip, database → config → Exercise', () => {
  /* EVERY FIELD, in both locales and for both shapes: the copy the preview
     renders is the copy the row holds, and nothing is lost on the way. */
  for (const [name, make] of [['harp', harp], ['kalimba', kalimba]] as const) {
    for (const locale of ['de', 'en'] as const) {
      it(`gives back the ${name} exactly, in ${locale}`, () => {
        const source = make();
        expect(configToExercise(build(source), locale, 'analogue')).toEqual(source[locale]);
      });
    }
  }

  it('carries an edit of each new field through to the Exercise', () => {
    const config = build(kalimba());
    const intro = config.run[0]!.copy.de!;
    const play = config.run[1]!.copy.de!;
    intro.volumeMd = 'Leiser.';
    intro.browserMd = 'Safari.';
    intro.motionMd = 'Bewegung.';
    play.headline = 'Spiel';
    play.bodyMd = 'Los.';
    play.playCta = 'Zur Kalimba, jetzt';
    play.modeSoloLabel = 'Allein';
    play.modeSoloMd = 'Still.';
    play.modeMusieLabel = 'Zu zweit';
    play.modeMusieMd = 'Antwortet.';

    expect(configToExercise(config, 'de', 'analogue').instrument).toEqual({
      id: 'kalimba',
      defaultMode: 'with_musie',
      vibrationDefault: true,
      volumeMd: 'Leiser.',
      browserMd: 'Safari.',
      motionMd: 'Bewegung.',
      playMd: '## Spiel\n\nLos.',
      playCta: 'Zur Kalimba, jetzt',
      modeSoloLabel: 'Allein',
      modeSoloMd: 'Still.',
      modeMusieLabel: 'Zu zweit',
      modeMusieMd: 'Antwortet.',
    });
  });

  /* An emptied motion sentence is no permission asked for — `content.ts`
     reads '' as null — and the validator reports the hole on the field. */
  it('reads an emptied motion sentence as no permission', () => {
    const config = build(kalimba());
    config.run[0]!.copy.de!.motionMd = '  ';
    expect(configToExercise(config, 'de', 'analogue').instrument?.motionMd).toBeNull();
  });

  it('gives every other kind no instrument', () => {
    const config = build(harp());
    config.kind = 'listening_only';
    config.run = config.run.filter((entry) => entry.step !== 'play');
    expect(configToExercise(config, 'de', 'analogue').instrument).toBeNull();
  });
});

describe('the builder lists the instruments last', () => {
  /* Ben's brief: „hänge diese am Schluss an“. They are appended at sort 6, 7
     and 8, so the catalogue's own order is what puts them there — handed over
     here in a scrambled order, so the test is about the sort and not about
     insertion. */
  it('orders by sort, whatever order the rows arrived in', () => {
    const at = (sort: number, id: string): ExerciseConfig => {
      const config = build(harp());
      return { ...config, id, catalogue: { ...config.catalogue, sort } };
    };
    const configs: Record<string, ExerciseConfig> = {
      harp: at(8, 'harp'),
      'sound-journey': at(4, 'sound-journey'),
      kalimba: at(6, 'kalimba'),
      'mindfulness-cards': at(1, 'mindfulness-cards'),
      marimba: at(7, 'marimba'),
      'body-scan': at(5, 'body-scan'),
      'free-rein': at(2, 'free-rein'),
      'breathing-score': at(3, 'breathing-score'),
    };

    const order = exerciseOrder(configs);
    expect(order).toHaveLength(8);
    expect(order.slice(-3)).toEqual(['kalimba', 'marimba', 'harp']);
    expect(order.at(0)).toBe('mindfulness-cards');
  });

  it('breaks a tie by id, so two loads agree', () => {
    const config = build(harp());
    expect(exerciseOrder({ b: config, a: config })).toEqual(['a', 'b']);
  });
});
