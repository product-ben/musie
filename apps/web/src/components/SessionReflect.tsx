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
import { Camera, Mic, PenLine } from 'lucide-react';
import {
  Field, Message, PhotoUpload, SegmentedControl,
} from '@musie/design-system';
import type { UploadedPhoto } from '@musie/design-system';
import { DataLightbox } from './DataLightbox';
import { Markdown } from './Markdown';
import { VoiceTranscript } from './VoiceTranscript';
import { useT } from '../i18n/localeContext';
import type { Exercise } from '../lib/content';
import type { ReflectMode } from '../lib/reflect';

export interface SessionReflectProps {
  /** Whose run this is. F.6 writes the statements against it as they arrive. */
  sessionId: string;
  /** Passed straight through from `VoiceTranscript` — F.6. */
  onSpokenWords?: (has: boolean) => void;
  exercise: Exercise;
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

  /* THE DATA PROMISE, and the ref that gets focus back. With no
     `Dialog.Trigger` there is nothing for base-ui to return focus to, and
     focus landing on <body> is how a keyboard user loses a reflection they
     were halfway through writing. `Lightbox` names this cost itself. */
  const [dataOpen, setDataOpen] = React.useState(false);
  const dataLink = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      {/* THE STEP'S OWN WORDS — `reflect_md`: the headline that asks what you
          were thinking about, and under it the questions to answer if you want
          to. It used to be a `StepText` plus the shared `question` <h2>; that
          column is gone (2026-09-23) and each step carries its own headline,
          because the listen step asks what picture FORMS and this one asks
          what it was called and what happened in it. */}
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
            placeholder={t('reflect.text.placeholder')}
            description={t('privacy.written')}
            value={text}
            onValueChange={onTextChange}
          />
        )}

        {mode === 'voice' && (
          <div className="musie-stack">
            <VoiceTranscript sessionId={sessionId} onSpokenWords={onSpokenWords} />

            {/* ── ONE SENTENCE, NOT A BOX — Ben, 2026-09-23 ──────────────
                This was a `Message variant="info"` carrying a headline and a
                four-clause paragraph: what happens to your words, what happens
                to the recording, and what was still unbuilt. Two of those
                three stopped being true when F.6 landed the write, and the
                third was never the thing somebody standing on this screen with
                a microphone open needed to read.

                What is left is the promise itself — Musie keeps the text and
                never the voice — with the rest a word away. The `Message` is
                gone rather than shortened: an info box is a thing that
                HAPPENED, and this is a standing fact about the product, which
                is a line of small print. */}
            <p className="musie-note">
              {t('privacy.voiceShort')}{' '}
              <button
                ref={dataLink}
                type="button"
                className="musie-inline-link"
                onClick={() => setDataOpen(true)}
              >
                {t('privacy.more')}
              </button>
            </p>
          </div>
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

      <DataLightbox
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        finalFocus={dataLink}
      />
    </>
  );
}
