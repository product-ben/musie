/**
 * What you noticed while listening — the old reflect step, in a sheet.
 *
 * `/session/:id/reflect?focus-thoughts`. Everything the step used to carry
 * inline, minus the mood scale: the rotating question as the headline, the
 * card if there was one, the three ways to answer, and one way out.
 *
 * ── WHY IT MOVED ─────────────────────────────────────────────────────────
 * Not because any of it was wrong. Because all of it arrived at once, on the
 * screen somebody reaches with their eyes barely open, next to a question
 * about feelings and two actions. Behind a door it is the same apparatus,
 * opened by somebody who decided to write.
 *
 * ── THE QUESTION IS THE HEADLINE, AND IT IS WHERE IT BELONGS ─────────────
 * It used to be the step's `h2`, above a section that also held a mood scale
 * it had nothing to do with. Here it is the headline of exactly the thing it
 * asks about. Still the PAST TENSE of the one the listen step asked, still
 * no re-roll (D4), and still no helper — the help belongs to the listen step,
 * where somebody is stuck in front of a question with nothing to do but
 * think.
 *
 * ── THE PICTURE, IF THERE WAS ONE ────────────────────────────────────────
 * A digital run saw the card while the music played. It comes back between
 * the headline and the controls, so what is being reflected on is on screen
 * while the answer is written. A paper run shows nothing: the card is in your
 * hand, and a picture of it would be the infographic's mistake in reverse.
 *
 * ── IT HOLDS NO STATE, AND THAT IS DELIBERATE ────────────────────────────
 * `mode` and `text` stay on `Session.tsx` and pass through, exactly as
 * before. Closing the sheet writes nothing; *Session im Tagebuch speichern*
 * is still what calls `saveReflection`.
 *
 * This is NOT the feelings sheet's immediate-write model, and the difference
 * is justified rather than accidental: a feeling is a discrete fact with a
 * stable identity, and a half-written paragraph is not. Writing one on every
 * close would store drafts nobody asked to keep.
 *
 * VOICE IS THE EXCEPTION AND ALREADY WAS. `VoiceTranscript` persists
 * statements as they are spoken — F.6, and it predates this change. Nothing
 * here alters it.
 */
import * as React from 'react';
import { Camera, Mic, PenLine } from 'lucide-react';
import {
  CtaButton, Field, Image, Message, PhotoUpload, SegmentedControl, Sheet,
} from '@musie/design-system';
import type { UploadedPhoto } from '@musie/design-system';
import { Markdown } from './Markdown';
import { VoiceTranscript } from './VoiceTranscript';
import { useT } from '../i18n/localeContext';
import { contentImageUrl } from '../lib/assets';
import type { Exercise } from '../lib/content';
import { withoutHeading } from '../lib/markdown';
import type { ReflectMode } from '../lib/reflect';
import type { SessionQuestion } from '../lib/useQuestion';

/** Only what is needed to draw the card — the sheet does not read a session. */
export interface ThoughtsCard {
  code: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface ThoughtsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  exercise: Exercise;
  question: SessionQuestion;
  /** Null on a paper run, and null for a digital run with no card. */
  card: ThoughtsCard | null;
  mode: ReflectMode;
  onModeChange: (mode: ReflectMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  onSpokenWords?: (has: boolean) => void;
  /** The transcript as prose, so the step's filled state can show it. */
  onSpokenText?: (text: string) => void;
}

export function ThoughtsSheet({
  open, onOpenChange, sessionId, exercise, question, card,
  mode, onModeChange, text, onTextChange, onSpokenWords, onSpokenText,
}: ThoughtsSheetProps) {
  const t = useT();

  /* The PHOTO mockup holds its state HERE rather than in the session: nothing
     it captures is ever saved, so lifting it would put something in the
     session's shape that the session never writes. Carried over from
     SessionReflect unchanged. */
  const [photo, setPhoto] = React.useState<UploadedPhoto | null>(null);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      /* Rule 7 twice: `title` is announced and never drawn, `closeLabel`
         because Lightbox underneath defaults to the German *Schließen*. */
      title={t('reflect.thoughts.sheet.title')}
      closeLabel={t('common.closeLabel')}
      /* Same reasoning as the feelings sheet: three doors in, so no `origin`. */
      origin={null}
      className="musie-reflect-sheet"
      /* ── THE QUESTION, PINNED ──────────────────────────────────────────
         In the header slot rather than the body, which is what keeps it in
         place while the body scrolls. The whole fallback path comes across
         unchanged: no question set means `reflect_md` renders exactly as it
         always did, its own heading included. */
      header={
        question.text === null ? (
          <Markdown md={exercise.reflectMd} />
        ) : (
          <h2 className="musie-reflect-sheet__headline">{question.text.reflect}</h2>
        )
      }
      foot={
        <CtaButton variant="primary" onClick={() => onOpenChange(false)}>
          {t('reflect.thoughts.sheet.done')}
        </CtaButton>
      }
    >
      <div className="musie-stack">
        {/* THE CARD, between the headline and the controls. Same `alt` and
            same measure cap as the listen step draws it with — one picture,
            described the same way in both places. */}
        {card !== null && (
          <Image
            className="musie-reflect-sheet__card"
            src={contentImageUrl(card.imageUrl ?? '')}
            alt={card.imageAlt ?? t('session.cards.fallbackAlt', { code: card.code })}
            width={1200}
            height={849}
            maxWidth="var(--measure-body)"
            decoding="async"
          />
        )}

        {/* The exercise's own questions, under the headline. `withoutHeading`
            and not `bodyOnly`: the latter promotes the first paragraph to a
            heading, which here would put "Wenn du magst, beantworte diese
            Fragen" in display type. Only drawn when the rotating question
            took the headline — otherwise the header above already rendered
            the whole of `reflect_md`. */}
        {question.text !== null && (
          <Markdown md={exercise.reflectMd} arrange={withoutHeading} />
        )}

        <SegmentedControl
          name="reflect-mode"
          /* The group keeps its accessible name and the screen stops saying
             it twice — the three buttons already say what they are for. */
          legend={t('reflect.legend')}
          legendHidden
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
            /* The exercise's own questions IN the box being answered, else
               the catalogue's sentence. `reflect_placeholder` is null for an
               exercise with no questions of its own. */
            placeholder={exercise.reflectPlaceholder ?? t('reflect.text.placeholder')}
            description={t('privacy.written')}
            value={text}
            onValueChange={onTextChange}
          />
        )}

        {mode === 'voice' && (
          <VoiceTranscript
            sessionId={sessionId}
            onSpokenWords={onSpokenWords}
            onSpokenText={onSpokenText}
          />
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
    </Sheet>
  );
}
