/**
 * `/done` — not a fifth step but a state of its own (brief): no rail, the
 * header stays. The thanks first, then the feedback survey in our own UI,
 * whose answers go to PostHog as the survey's events (track.ts), never to
 * Supabase.
 *
 * QUESTIONS v2 — Ben, 2026-11-18: two NPS ratings on a stepped slider
 * (NpsSlider.tsx), then two open questions. All four are optional, and
 * „Feedback senden“ is ready as soon as any one of them has an answer:
 * forcing a rating would push a guess into the score.
 *
 * Questions and their order come from `SURVEY` (config.ts), so the screen,
 * the event and PostHog's survey cannot list them differently.
 */
import * as React from 'react';
import { Button, ContentBox, Field, Message } from '@musie/design-system';
import { SURVEY, type OpenKey, type RatingKey, type SurveyAnswers } from './config';
import { useCopy } from './context';
import { uuidV4 } from './NameModal';
import { NpsSlider } from './NpsSlider';
import { completed, surveySent, surveyShown } from './track';

export function ThankYou() {
  const copy = useCopy();
  const [submissionId] = React.useState(uuidV4);
  const [ratings, setRatings] = React.useState<Partial<Record<RatingKey, number>>>({});
  const [texts, setTexts] = React.useState<Partial<Record<OpenKey, string>>>({});
  const [sent, setSent] = React.useState(false);

  /* Once per mount, StrictMode's double effect included: the ref survives it. */
  const announced = React.useRef(false);
  React.useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    completed();
    surveyShown();
  }, []);

  const answers: SurveyAnswers = { ...ratings };
  for (const [key, text] of Object.entries(texts) as [OpenKey, string][]) {
    if (text.trim() !== '') answers[key] = text.trim();
  }
  const answered = Object.keys(answers).length > 0;

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    if (!answered || sent) return;
    surveySent(answers, submissionId);
    setSent(true);
  };

  return (
    <div className="musie-session musie-reflexion-done">
      <ContentBox headingLevel={1} headline={copy.thanksHeadline}>
        {sent ? (
          <Message
            variant="success"
            live="assertive"
            headingLevel={2}
            headline={copy.feedbackThanks}
            statusWord={copy.statusSuccess}
          />
        ) : (
          <form className="musie-reflexion-survey" onSubmit={send} noValidate>
            {SURVEY.questions.map((q) =>
              q.kind === 'rating' ? (
                <NpsSlider
                  key={q.key}
                  id={`reflexion-survey-${q.key}`}
                  label={copy.surveyQuestions[q.key]}
                  value={ratings[q.key] ?? null}
                  onChange={(value) => setRatings((prev) => ({ ...prev, [q.key]: value }))}
                  lowLabel={copy.npsLow}
                  highLabel={copy.npsHigh}
                  unsetText={copy.npsUnset}
                />
              ) : (
                <Field
                  key={q.key}
                  className="musie-reflexion-answer ph-no-capture"
                  label={copy.surveyQuestions[q.key]}
                  name={q.key}
                  multiline
                  rows={3}
                  value={texts[q.key] ?? ''}
                  onValueChange={(value) => setTexts((prev) => ({ ...prev, [q.key]: value }))}
                  errorWord={copy.statusError}
                />
              ),
            )}
            <Button type="submit" variant="primary" size="guided" block wrap disabled={!answered}>
              {copy.sendFeedback}
            </Button>
          </form>
        )}
      </ContentBox>
    </div>
  );
}
