/**
 * `/capturing-feelings-exploration` — getting to a feeling through the picture
 * that came first.
 *
 * ── A TEST, NOT A SCREEN ──────────────────────────────────────────────────
 * Built 2026-10-15 for a user test starting ten minutes later, and the same
 * kind of object `/feelings-selection`, `/goal-mappings` and `/dev/qr` are:
 * linked from nowhere, reachable only by typing the path, writing nothing.
 *
 * It is the SIBLING of `/feelings-selection` and asks the opposite question.
 * That route hands over a vocabulary and narrows it; this one never shows a
 * feeling word at all. It asks what the person saw, asks one question back
 * about it, and only then offers to talk about the feeling. The thing under
 * test is whether describing the image first makes naming the feeling easier
 * — so the two routes are run against each other, not merged.
 *
 * ── THE SHAPE IS PROGRESSIVE, AND THAT IS THE EXPERIMENT ──────────────────
 * Three boxes, each appearing only once the one above it has an answer:
 *
 *   1. what kind of picture it was        three options, no "other"
 *   2. one question ABOUT that kind       a different question per kind
 *   3. "Wie fühlt sich das an?"           a button, then a free-text field
 *
 * Nothing below step 1 exists until step 1 is answered. A test that shows all
 * three at once measures a form; showing them in turn measures whether each
 * question lands — which is the only reason to run this at all.
 *
 * THE QUESTION IN STEP 2 IS PER-KIND, not one question with the kind
 * interpolated into it. "Wer ist zu sehen, und was tun sie?" has no sensible
 * landscape reading and "Wo bist du?" has no sensible reading for a memory of
 * a conversation. One frame for three kinds is how this flow would quietly
 * become a generic "tell us more" box, so the three are written out.
 *
 * CHANGING THE KIND CLEARS THE ELABORATION. The text answered a question that
 * is no longer on screen; carrying it over would show a landscape description
 * under "Wer ist zu sehen?" and the button would report progress nobody made.
 * Same rule `/feelings-selection` applies when a ring above changes.
 *
 * ── WHAT THE FEELING BUTTON DOES, AND WHY IT DOES ANYTHING ────────────────
 * Ben's call: pressing it reveals a free-text field. An inert button is a
 * cheaper build and a worse test — a participant presses it, nothing happens,
 * and the next two minutes are about whether the prototype is broken instead
 * of about the question. Free text rather than a scale or a picker because
 * this route's whole premise is that the words should be the person's own;
 * offering five labelled points would answer `/feelings-selection`'s question
 * with this route's flow and tell us nothing.
 *
 * ── RULES 6 AND 7 ARE KEPT, EXEMPTION NOT TAKEN ───────────────────────────
 * `/dev/experiment-mixer` has an exemption for inline English on the grounds
 * that a spike read once by one person does not earn two catalogues. This
 * route does not use it, for the same reason `/feelings-selection` did not:
 * the test is IN GERMAN with German participants, so the German is the
 * deliverable rather than an afterthought, and `de.ts` is typed against
 * `en.ts` — a German-only catalogue is not a thing this repo can hold.
 *
 * NO NEW CSS. `.musie-stack` already exists in `shell.css` for exactly this —
 * a run of things at the stack gap — and the three boxes are the design
 * system's.
 */
import * as React from 'react';
import { ContentBox, CtaButton, Field, RadioGroupText } from '@musie/design-system';
import type { RadioOption } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';

/**
 * The three kinds, and the three message keys each one owns.
 *
 * A table rather than three branches in the JSX: the reason step 2 is written
 * out per kind (see the header) is that the three questions are genuinely
 * different, and a table is where that is legible. Adding a fourth kind after
 * the first test is then one row.
 *
 * `'' ` is not a kind. The unanswered state is the absence of one, which is
 * what gates step 2 — see `kind` below.
 */
const PICTURE_KINDS = [
  {
    id: 'figures',
    optionKey: 'capturing.kind.figures.option',
    headlineKey: 'capturing.kind.figures.headline',
    questionKey: 'capturing.kind.figures.question',
  },
  {
    id: 'memory',
    optionKey: 'capturing.kind.memory.option',
    headlineKey: 'capturing.kind.memory.headline',
    questionKey: 'capturing.kind.memory.question',
  },
  {
    id: 'landscape',
    optionKey: 'capturing.kind.landscape.option',
    headlineKey: 'capturing.kind.landscape.headline',
    questionKey: 'capturing.kind.landscape.question',
  },
] as const satisfies readonly {
  id: string;
  optionKey: MessageKey;
  headlineKey: MessageKey;
  questionKey: MessageKey;
}[];

type PictureKindId = (typeof PICTURE_KINDS)[number]['id'];

export function CapturingFeelingsExploration() {
  const t = useT();

  const [kindId, setKindId] = React.useState<PictureKindId | ''>('');
  const [elaboration, setElaboration] = React.useState('');
  const [feelingAsked, setFeelingAsked] = React.useState(false);
  const [feeling, setFeeling] = React.useState('');

  const kind = kindId === '' ? null : (PICTURE_KINDS.find((k) => k.id === kindId) ?? null);

  /* "After the user entered something" — trimmed and non-empty, with no
     minimum length invented on top. A threshold would be a decision about how
     much counts as an answer, and that is one of the things the test is for. */
  const elaborated = elaboration.trim() !== '';

  /** Choosing a kind clears what answered the previous kind's question. */
  function chooseKind(value: string) {
    setKindId(value as PictureKindId);
    setElaboration('');
    setFeelingAsked(false);
    setFeeling('');
  }

  const options: RadioOption[] = PICTURE_KINDS.map((k) => ({
    value: k.id,
    label: t(k.optionKey),
  }));

  return (
    <div className="musie-stack">
      <ContentBox
        headline={t('capturing.picture.headline')}
        headingLevel={1}
        headlineStep="heading-lg"
        /* The headline IS the question and the options sit directly under it,
           so there is nothing to track back from — the documented case for
           releasing the 26ch measure. */
        headlineWide
      >
        <RadioGroupText
          name="picture-kind"
          /* The same words as the headline above, so the group is named for a
             screen reader without the question being asked twice on screen —
             /exercises' precedent for this prop. */
          legend={t('capturing.picture.headline')}
          legendHidden
          options={options}
          value={kindId}
          onValueChange={chooseKind}
          guided
          emptyLabel={t('capturing.picture.empty')}
        />
      </ContentBox>

      {kind ? (
        <ContentBox headline={t(kind.headlineKey)} headingLevel={2} headlineWide>
          <Field
            label={t(kind.questionKey)}
            name="elaboration"
            multiline
            rows={4}
            value={elaboration}
            onValueChange={setElaboration}
          />
        </ContentBox>
      ) : null}

      {/* The button, and then what it opens. Both are gated on the text, so
          deleting the elaboration takes the feeling question away again
          rather than leaving it stranded above an empty answer. */}
      {kind && elaborated ? (
        feelingAsked ? (
          <ContentBox headline={t('capturing.feeling.headline')} headingLevel={2} headlineWide>
            <Field
              label={t('capturing.feeling.label')}
              name="feeling"
              multiline
              rows={3}
              value={feeling}
              onValueChange={setFeeling}
            />
          </ContentBox>
        ) : (
          <CtaButton onClick={() => setFeelingAsked(true)} wrap>
            {t('capturing.feeling.headline')}
          </CtaButton>
        )
      ) : null}
    </div>
  );
}
