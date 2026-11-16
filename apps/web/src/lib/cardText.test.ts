import { describe, expect, it } from 'vitest';
import { CARD_TEXT_MAX, cardText } from './cardText';

// The two texts that set the limit on 2026-11-13, as stored (line breaks and all).
const KLANGREISE_DE =
  'Eine tiefe Stimme leitet dich durch Klänge und gibt dir Anregungen zum achtsamen Hören.\n' +
  'Du kannst die Übungen zwischendurch oder vor dem Einschlafen durchführen.\n' +
  'Die Übung kann dir helfen, dich zu entspannen und Achtsamkeit zu üben.';
const BODYSCAN_DE =
  'Lass mich dich mit der Stimme eines echten Menschen und passender Musik durch deinen Körper führen. ' +
  'Das hilft dir, dich zu spüren, zu entspannen und Achtsamkeit zu üben.';

describe('cardText', () => {
  it('is 170, the Bodyscan text Ben kept', () => {
    expect(CARD_TEXT_MAX).toBe(170);
    expect(BODYSCAN_DE).toHaveLength(169);
  });

  it('leaves a text at or under the limit as it is', () => {
    expect(cardText(BODYSCAN_DE)).toEqual({ shown: BODYSCAN_DE, cut: false });
    expect(cardText('a'.repeat(170))).toEqual({ shown: 'a'.repeat(170), cut: false });
  });

  it('cuts a longer one at a word, ellipsis included in the 170', () => {
    const { shown, cut } = cardText(KLANGREISE_DE);
    expect(cut).toBe(true);
    expect(shown.length).toBeLessThanOrEqual(170);
    expect(shown.endsWith('…')).toBe(true);
    expect(shown).toBe(
      'Eine tiefe Stimme leitet dich durch Klänge und gibt dir Anregungen zum achtsamen Hören. ' +
        'Du kannst die Übungen zwischendurch oder vor dem Einschlafen durchführen. Die…',
    );
  });

  it('counts a stored line break as the space the reader sees', () => {
    expect(cardText('one\ntwo')).toEqual({ shown: 'one two', cut: false });
  });

  it('drops a comma or dash left dangling before the ellipsis', () => {
    expect(cardText('alpha beta, gamma delta', 13).shown).toBe('alpha beta…');
    expect(cardText('alpha beta – gamma delta', 14).shown).toBe('alpha beta…');
  });

  it('cuts at the limit when there is no space to cut at', () => {
    expect(cardText('x'.repeat(200)).shown).toBe(`${'x'.repeat(169)}…`);
  });
});
