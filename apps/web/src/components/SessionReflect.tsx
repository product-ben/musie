/**
 * Step 4 · Reflect — the question again, and the answer.
 *
 * ── THREE DOORS, AND ONLY ONE OF THEM OPENS YET ────────────────────────────
 * Text, voice and photo. Voice is Phase F; photo is waiting on which model
 * reads handwriting. Both are built as interactive mockups so the flow can be
 * walked and reviewed, and both SAY SO where the answer would go — MOCKUPS.md
 * 1 and 2, and the standard that file sets.
 *
 * Neither writes a row, so neither can complete the step: `Finish` stays
 * disabled until there is text. That is honest rather than obstructive — the
 * alternative was hiding two modes the product has already decided on, which
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
  Field, Message, PhotoUpload, RecordButton, SegmentedControl,
} from '@musie/design-system';
import type { UploadedPhoto } from '@musie/design-system';
import { StepText } from './StepText';
import { useT } from '../i18n/localeContext';
import type { Exercise } from '../lib/content';
import type { ReflectMode } from '../lib/reflect';

export interface SessionReflectProps {
  exercise: Exercise;
  question: string;
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
  exercise, question, mode, onModeChange, text, onTextChange,
}: SessionReflectProps) {
  const t = useT();

  /* The mockup modes hold their state HERE rather than in the session: nothing
     they capture is ever saved, so lifting it would put something in the
     session's shape that the session never writes. */
  const [recording, setRecording] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [photo, setPhoto] = React.useState<UploadedPhoto | null>(null);

  React.useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setElapsed((at) => at + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  return (
    <>
      <StepText lines={exercise.reflectText} />

      {/* THE SAME QUESTION the listen step held. One column, read twice. */}
      <h2 className="musie-question">{question}</h2>

      <div className="musie-stack">
        <SegmentedControl
          name="reflect-mode"
          legend={t('reflect.legend')}
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
            <RecordButton
              state={recording ? 'recording' : 'ready'}
              elapsed={elapsed}
              onToggle={() => {
                setRecording((live) => !live);
                setElapsed(0);
              }}
              readyLabel={t('reflect.voice.record')}
              recordingLabel={t('reflect.voice.recording')}
              status={(inSeconds, left) =>
                t('reflect.voice.status', { elapsed: inSeconds, remaining: left })
              }
            />
            <Message
              variant="info"
              live="off"
              headingLevel={3}
              headline={t('reflect.voice.notBuilt')}
              text={t('reflect.voice.notBuiltText')}
            />
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
    </>
  );
}
