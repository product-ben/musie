/**
 * `/feelings-selection` — naming a feeling by narrowing, three rings deep.
 *
 * ── A TEST, NOT A SCREEN ──────────────────────────────────────────────────
 * Built 2026-10-15 for a user test starting ten minutes later, and it is the
 * same kind of object `/goal-mappings` and `/dev/qr` are: linked from nowhere,
 * reachable only by typing the path, writing nothing. It answers one question
 * — can somebody find the word for what they feel by narrowing, rather than by
 * reading 128 of them — and it is `lazy` because nobody who never types this
 * path should download the wheel.
 *
 * ── WHY A SHEET WITH A HELD INDEX ─────────────────────────────────────────
 * `Sheet`'s paged mode already keeps the promise this flow needs: the header
 * stays put and the paging controls stay put, page to page. So the drill-down
 * is three pages — 8 emotions, then the 4-or-6 under the one chosen, then the
 * 2 under that — and the index is CONTROLLED here, because in a drill-down
 * choosing IS advancing. Picking an option sets the branch and moves on; the
 * sheet's own chevrons and the dots stay live, so going back a ring is the
 * gesture it already was.
 *
 * Choosing at a ring clears every ring below it. Without that, picking Happy ›
 * Optimistic › Inspired and then changing the first ring to Sad would leave a
 * selection from Happy's subtree sitting under Sad, and the sheet would read
 * as though the person had chosen something they had not.
 *
 * ── THE WORDS ARE CONTENT, SO THEY DO NOT COME FROM i18n ──────────────────
 * Rule 7 is about OUR strings: the title, the prompts, the labels on the
 * furniture — all passed explicitly from the catalogue, none inherited from a
 * design-system default. The 128 feelings are the wheel's own words, bilingual
 * in `supabase/content/emotion-wheel.yml` and typed into
 * `content/emotionWheel.ts`, so they are chosen by locale the way deck content
 * is, not keyed.
 *
 * `i` IS THE VALUE, NEVER THE WORD. Powerful appears twice in the outer ring
 * and Delighted appears twice; the yml says so in as many words. Radio values
 * are the index within the ring, which is why two identical labels can sit in
 * one group without colliding.
 */
import * as React from 'react';
import { CtaButton, RadioGroupText, Sheet } from '@musie/design-system';
import type { RadioOption } from '@musie/design-system';
import { EMOTION_WHEEL } from '../content/emotionWheel';
import type { WheelWord } from '../content/emotionWheel';
import { useLocale, useT } from '../i18n/localeContext';

/** The active locale's side of a wheel word. */
function word(entry: WheelWord, locale: 'en' | 'de'): string {
  return locale === 'de' ? entry.de : entry.en;
}

const options = (entries: readonly WheelWord[], locale: 'en' | 'de'): RadioOption[] =>
  entries.map((entry) => ({ value: String(entry.i), label: word(entry, locale) }));

/**
 * The value of the "just the word above" row, and it cannot collide with a
 * ring index because every other value is a number as a string.
 *
 * ── WHY THE ROW EXISTS (Ben, 2026-10-15) ──────────────────────────────────
 * Narrowing assumes the narrower word is the better one, and for a person who
 * means exactly *Happy* every row on the next ring is a worse answer than the
 * one they already gave. Without this they must either accept a word they do
 * not mean or close the sheet, and a test cannot tell those two apart. So each
 * deeper ring ends with the word from the ring above, and choosing it STOPS:
 * it is an answer, not a step.
 */
const STOP = 'stop';

export function FeelingsSelection() {
  const t = useT();
  const { locale } = useLocale();

  const [index, setIndex] = React.useState(0);
  const [emotionI, setEmotionI] = React.useState<number | null>(null);
  const [detailedI, setDetailedI] = React.useState<number | null>(null);
  const [specificI, setSpecificI] = React.useState<number | null>(null);

  /**
   * Which ring the person stopped on, having taken the word from the ring
   * above rather than one of the words in front of them.
   *
   * It is NOT the same as "nothing chosen on this ring", which is why it is
   * its own state: `chosen` already falls back up the chain, so stopping
   * needs no arithmetic — but the row has to draw as selected, and the sheet
   * must not advance. Both of those need to know the difference.
   */
  const [stoppedAt, setStoppedAt] = React.useState<'emotion' | 'detailed' | null>(null);

  /* The sheet is the screen here — it opens on arrival and reopens from the
     one control underneath it, so a tester who closes it is not stranded. */
  const [open, setOpen] = React.useState(true);

  const emotion = emotionI === null ? null : (EMOTION_WHEEL.find((e) => e.i === emotionI) ?? null);
  const detailed =
    detailedI === null || !emotion
      ? null
      : (emotion.detailed.find((d) => d.i === detailedI) ?? null);
  const specific =
    specificI === null || !detailed
      ? null
      : (detailed.specific.find((s) => s.i === specificI) ?? null);

  /** Choosing clears what sat below, then advances a ring. */
  function chooseEmotion(value: string) {
    setEmotionI(Number(value));
    setDetailedI(null);
    setSpecificI(null);
    setStoppedAt(null);
    setIndex(1);
  }

  function chooseDetailed(value: string) {
    if (value === STOP) {
      /* The emotion was already the answer. Clear the ring below and stay —
         advancing would offer a narrower word for a choice that just said
         narrower is wrong. */
      setDetailedI(null);
      setSpecificI(null);
      setStoppedAt('emotion');
      return;
    }
    setDetailedI(Number(value));
    setSpecificI(null);
    setStoppedAt(null);
    setIndex(2);
  }

  function chooseSpecific(value: string) {
    if (value === STOP) {
      setSpecificI(null);
      setStoppedAt('detailed');
      return;
    }
    setSpecificI(Number(value));
    setStoppedAt(null);
  }

  /* The chosen word, as deep as the person has gone — this is what the sheet
     reports back, and what the test is listening for. */
  const chosen = specific ?? detailed ?? emotion;

  const pages = [
    {
      id: 'emotions',
      content: (
        <RadioGroupText
          name="wheel-emotion"
          legend={t('feelings.ring.emotions.legend')}
          hint={t('feelings.ring.emotions.hint')}
          options={options(EMOTION_WHEEL, locale)}
          value={emotionI === null ? '' : String(emotionI)}
          onValueChange={chooseEmotion}
          guided
          emptyLabel={t('feelings.empty')}
        />
      ),
    },
    {
      id: 'detailed',
      content: emotion ? (
        <RadioGroupText
          name="wheel-detailed"
          legend={t('feelings.ring.detailed.legend', { feeling: word(emotion, locale) })}
          hint={t('feelings.ring.detailed.hint')}
          options={[
            ...options(emotion.detailed, locale),
            { value: STOP, label: t('feelings.stop', { feeling: word(emotion, locale) }) },
          ]}
          value={stoppedAt === 'emotion' ? STOP : detailedI === null ? '' : String(detailedI)}
          onValueChange={chooseDetailed}
          guided
          emptyLabel={t('feelings.empty')}
        />
      ) : (
        /* Reachable by swiping ahead without choosing, which the sheet allows
           on purpose — the dots are controls. */
        <RadioGroupText
          name="wheel-detailed"
          legend={t('feelings.ring.detailed.waiting')}
          options={[]}
          /* Controlled from the first render, like its filled twin. React
             reconciles these two into one instance — same type, same slot —
             and a `value` that appears only once a feeling is chosen is the
             uncontrolled-to-controlled switch Base UI warns about. */
          value=""
          guided
          emptyLabel={t('feelings.waiting.emotion')}
        />
      ),
    },
    {
      id: 'specific',
      content: detailed ? (
        <RadioGroupText
          name="wheel-specific"
          legend={t('feelings.ring.specific.legend', { feeling: word(detailed, locale) })}
          hint={t('feelings.ring.specific.hint')}
          options={[
            ...options(detailed.specific, locale),
            { value: STOP, label: t('feelings.stop', { feeling: word(detailed, locale) }) },
          ]}
          value={stoppedAt === 'detailed' ? STOP : specificI === null ? '' : String(specificI)}
          onValueChange={chooseSpecific}
          guided
          emptyLabel={t('feelings.empty')}
        />
      ) : (
        <RadioGroupText
          name="wheel-specific"
          legend={t('feelings.ring.specific.waiting')}
          options={[]}
          value=""
          guided
          emptyLabel={t('feelings.waiting.detailed')}
        />
      ),
    },
  ];

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('feelings.sheet.title')}
        closeLabel={t('feelings.sheet.close')}
        index={index}
        onIndexChange={setIndex}
        pages={pages}
        /* NO `dotLabel`, and that is what removes the dots — `Sheet` draws the
           row only when it is given one, because an unlabelled dot row fails
           4.1.2 and the component refuses to draw one rather than draw it
           nameless. Ben, 2026-10-15: the dots overlapped the hint on a ring
           that scrolls, and a drill-down does not need a position indicator —
           three rings is not a walk whose length you have to know. The
           chevrons stay; they are guarded separately. */
        nextLabel={t('feelings.sheet.next')}
        previousLabel={t('feelings.sheet.previous')}
        header={
          <p>
            {chosen
              ? t('feelings.prompt.chosen', { feeling: word(chosen, locale) })
              : t('feelings.prompt.empty')}
          </p>
        }
        foot={
          chosen ? (
            <CtaButton onClick={() => setOpen(false)}>{t('feelings.sheet.done')}</CtaButton>
          ) : undefined
        }
      />
      {/* Underneath the sheet: what was chosen, and the way back in. The test
          needs to see the answer after the sheet closes. */}
      <p>
        {chosen
          ? t('feelings.result.chosen', { feeling: word(chosen, locale) })
          : t('feelings.result.empty')}
      </p>
      <CtaButton onClick={() => setOpen(true)} disabled={open}>
        {open ? t('feelings.reopen.open') : t('feelings.reopen.closed')}
      </CtaButton>
    </>
  );
}
