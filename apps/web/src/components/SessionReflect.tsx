/**
 * Step 4 · Reflect — the questions, and the answer.
 *
 * ── THREE DOORS, AND TWO OF THEM OPEN ─────────────────────────────────────
 * Text, voice and photo.
 *
 * VOICE IS REAL SINCE F.4. `VoiceTranscript` opens a microphone, a socket and
 * a transcription session, and the statements it produces can be edited,
 * reordered, joined and deleted. What it still cannot do is SAVE: nothing
 * writes `reflections.body` but the text mode, so `Finish` stays disabled
 * here and the step says why. F.6 is the write.
 *
 * PHOTO IS STILL A MOCKUP, waiting on which model reads handwriting, and says
 * so where the answer would go — MOCKUPS.md 2, and the standard that file
 * sets. `Finish` stays disabled for it too.
 *
 * That each mode announces its own limit is honest rather than obstructive —
 * the alternative was hiding what the product has already decided on, which
 * would make the screen look finished and be less true.
 *
 * PHOTO AND VOICE ARE ONE FEATURE WITH TWO FRONT DOORS. Both produce words;
 * neither produces a file. That is why `reflections` has no `media_path` and no
 * Storage bucket, and why `mode` already allows all three values although two
 * of them are unbuilt. The absence is the design (D1, D13).
 *
 * ── DECLINING IS AN ANSWER, AND IT SITS IN THE ACTION ROW ──────────────────
 * Three ways to answer and one way not to answer are different kinds of
 * choice, so it is not a fourth segment — that would make refusal look like a
 * method of answering.
 *
 * It is not under the group either, which is where it started. *Skip
 * reflection* is a way OUT of the step, and the step's ways out are the action
 * row: it sits beside *Finish session* as the alternative to it, which is what
 * it actually is. Rendered by `Session.tsx` with the rest of that row.
 *
 * A DECLINED REFLECTION STILL FINISHES THE SESSION — Ben, 2026-09-19. The row
 * is `finished` with no `reflections` row beside it, which the schema already
 * allows: `reflections.body` is not null, so "no answer" can only be expressed
 * as no row. DOMAIN-MODEL.md's state diagram reads `started --> finished :
 * completes the reflection`, and that sentence is now the looser of the two —
 * reaching the end of the run is what finishes it, and whether you left words
 * behind is a separate fact the diary reports on its own.
 */
import * as React from 'react';
import { ArrowDown, ArrowUp, Camera, Mic, Minus, PenLine } from 'lucide-react';
import {
  Field, FeelingsScale, Message, PhotoUpload, SegmentedControl,
} from '@musie/design-system';
import type { UploadedPhoto } from '@musie/design-system';
import { Markdown } from './Markdown';
import { VoiceTranscript } from './VoiceTranscript';
import { useT } from '../i18n/localeContext';
import type { Exercise } from '../lib/content';
import type { ReflectMode } from '../lib/reflect';
import type { FeelingChange } from '../lib/session';

export interface SessionReflectProps {
  /** Whose run this is. F.6 writes the statements against it as they arrive. */
  sessionId: string;
  /** Passed straight through from `VoiceTranscript` — F.6. */
  onSpokenWords?: (has: boolean) => void;
  exercise: Exercise;
  /**
   * How the session left you, on the three-point scale — `null` until it is
   * answered. Held by `Session.tsx` beside the written answer, because both
   * are written by the same `finish()` and because the rail unmounts this
   * step when you walk back to listen.
   */
  feeling: FeelingChange | null;
  onFeelingChange: (value: FeelingChange) => void;
  mode: ReflectMode;
  onModeChange: (mode: ReflectMode) => void;
  /** The typed answer. The only one that can be saved today. */
  text: string;
  onTextChange: (text: string) => void;
}

/**
 * THE BODY ONLY — the action row is `WizardPanel`'s, filled by `Session.tsx`.
 * Everything *Finish session* needs to decide whether it is enabled — the
 * mode, the text and whether the answer was declined — is already lifted,
 * because the session is what writes them.
 */
export function SessionReflect({
  exercise, mode, onModeChange, text, onTextChange,
  feeling, onFeelingChange,
  sessionId,
  onSpokenWords,
}: SessionReflectProps) {
  const t = useT();

  /* The PHOTO mockup holds its state HERE rather than in the session: nothing
     it captures is ever saved, so lifting it would put something in the
     session's shape that the session never writes.

     Voice used to keep a fake elapsed-seconds timer beside it. It is gone:
     `VoiceTranscript` runs a real session, and `useTranscription` owns the
     real clock. */
  const [photo, setPhoto] = React.useState<UploadedPhoto | null>(null);

  /* THE SCALE'S THREE, IN ORDER, AND THE ONLY LIST OF THEM ON THIS SCREEN.
     `FeelingsScale` is generic over its points — a scale does not know what it
     is measuring — so the narrowing from its `string` back to `FeelingChange`
     happens here, against this array rather than against three literals
     written a second time. A value that is not one of them cannot reach the
     column, which is the same set `sessions_feeling_change_known` enforces at
     the other end. */
  const FEELINGS: readonly FeelingChange[] = ['worse', 'same', 'better'];

  return (
    <>
      {/* THE STEP'S OWN WORDS — `reflect_md`: the headline that asks what you
          were thinking about, and under it the questions to answer if you want
          to. It used to be a `StepText` plus the shared `question` <h2>; that
          column is gone (2026-09-23) and each step carries its own headline,
          because the listen step asks what picture FORMS and this one asks
          what it was called and what happened in it. */}
      {/* ── SECTION 1 · THE QUESTION, AND HOW YOU ANSWER IT ────────────────
          The step's own words and the three ways to reply are ONE section:
          the modes are not a separate subject, they are the apparatus for the
          question directly above them. Splitting them would section the
          sentence away from the box you write in. */}
      <section className="musie-reflect__section">
        <Markdown md={exercise.reflectMd} />

        <div className="musie-stack">
        <SegmentedControl
          name="reflect-mode"
          /* THE NAME STAYS; THE HEADING GOES — Ben, 2026-09-23. "How would you
             like to answer?" sat above three buttons that say *Record audio*,
             *Write answer* and *Take photo*, which is the question answered in
             the controls that answer it. `legendHidden` is the component's own
             prop for exactly this: the group keeps its accessible name, so a
             screen reader still hears what the three radios are FOR, and the
             screen stops saying it twice. It is never dropped — an unnamed
             radio group announces as a bare list of buttons. */
          legend={t('reflect.legend')}
          legendHidden
          accent="accent"
          options={[
            { value: 'voice', label: t('reflect.mode.voice'), glyph: Mic },
            { value: 'text', label: t('reflect.mode.text'), glyph: PenLine },
            { value: 'photo', label: t('reflect.mode.photo'), glyph: Camera },
          ]}
          value={mode}
          onValueChange={(next) => onModeChange(next as ReflectMode)}
        />

        {mode === 'text' && (
          <Field
            multiline
            rows={5}
            label={t('reflect.text.label')}
            /* ── THE EXERCISE'S OWN QUESTIONS, IN THE BOX — Ben, 2026-10-07 ─
               They were body copy above this field, which left the reader
               holding them in their head while typing into something that said
               nothing about them. A prompt belongs in the box being answered:
               it is there while the answer is being written and gone the
               moment it has been.

               THE FALLBACK IS CHROME AND THE QUESTIONS ARE NOT. These are
               Achtsame Pause's — a named scene, and what happened in it — and
               Freie Bahn asks something else entirely, so a catalogue key here
               would print one exercise's questions under every exercise's
               field. `reflect_placeholder` is null for an exercise with no
               questions of its own, and then the catalogue's sentence is the
               honest thing to show. */
            placeholder={exercise.reflectPlaceholder ?? t('reflect.text.placeholder')}
            description={t('privacy.written')}
            value={text}
            onValueChange={onTextChange}
          />
        )}

        {/* ── AND NOW NOT EVEN A SENTENCE — Ben, 2026-09-24 ────────────────
            The step carried the data promise twice over. It was a `Message`
            with a four-clause paragraph until 2026-09-23, then one line of
            small print — *Musie keeps the text, never your voice* — with
            *More about your data* beside it opening `DataLightbox`.

            Both are gone. The transcript is what the reader came to this step
            for, and everything under it was competing with it: the promise,
            the second hint, the link. The promise is not withdrawn — it is
            still true, and `DataLightbox` still holds all six sentences of it
            — but this is no longer the place that says so.

            WHICH LEAVES THE LIGHTBOX WITH NO DOOR. Nothing in the app opens it
            any more, and that is the one thing about this change that is not
            finished: logged in apps/web/OPEN-QUESTIONS.md, because where the
            data promise lives is Ben's to place and not something to invent a
            nav item for. The component stays built. */}
        {mode === 'voice' && (
          <VoiceTranscript sessionId={sessionId} onSpokenWords={onSpokenWords} />
        )}

        {mode === 'photo' && (
          <div className="musie-stack">
            <PhotoUpload
              label={t('reflect.photo.label')}
              value={photo}
              onValueChange={setPhoto}
              previewAlt={t('reflect.photo.previewAlt')}
              description={t('privacy.photo')}
              zoneText={t('reflect.photo.zone')}
              chooseLabel={t('reflect.photo.choose')}
              replaceLabel={t('reflect.photo.replace')}
              removeLabel={t('reflect.photo.remove')}
            />
            <Message
              variant="info"
              live="off"
              headingLevel={3}
              headline={t('reflect.photo.notBuilt')}
              text={t('reflect.photo.notBuiltText')}
            />
          </div>
        )}
        </div>
      </section>

      {/* ── SECTION 2 · HOW THE SESSION LEFT YOU ─────────────────────────────
          AFTER the answer, not before it: the question is about the session
          that has just happened, and asking it above the reflection would put
          a summary before the thing being summarised.

          A SCALE, NOT A SEGMENTED CONTROL, and the component's own header is
          where that is argued — the three points are ordered and the order is
          the information, where a segmented control's options are alternatives
          with no order at all.

          It is OPTIONAL in the sense that the session saves without it, and
          the completion dialog in `Session.tsx` is what says so out loud
          rather than a disabled button that explains nothing. */}
      <section className="musie-reflect__section">
        <FeelingsScale
          name="session-feeling"
          legend={t('reflect.feeling.legend')}
          points={[
            { value: 'worse', label: t('reflect.feeling.worse'), glyph: ArrowDown },
            { value: 'same', label: t('reflect.feeling.same'), glyph: Minus },
            { value: 'better', label: t('reflect.feeling.better'), glyph: ArrowUp },
          ]}
          value={feeling ?? undefined}
          onValueChange={(picked) => {
            const known = FEELINGS.find((f) => f === picked);
            if (known !== undefined) onFeelingChange(known);
          }}
          accent="accent"
        />
      </section>
    </>
  );
}
