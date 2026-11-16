/**
 * `/done` — not a fifth step but a state of its own (brief): no rail, the
 * header stays. The thanks first, then a two-question survey in our own UI
 * whose answers go to PostHog as the survey's events (track.ts), never to
 * Supabase.
 *
 * RadioGroupText rather than SegmentedControl for the recommendation: three
 * plain words with no glyph to invent and nothing to truncate at 320px — the
 * closed-beta form's precedent (BetaSignup.tsx).
 *
 * Choice VALUES are the survey's base-language answers (Ja/Vielleicht/Nein),
 * whatever the screen shows, so PostHog's results do not split by language.
 */
import * as React from 'react';
import { Button, ContentBox, Field, Message, RadioGroupText } from '@musie/design-system';
import { SURVEY, type RecommendChoice } from './config';
import { useCopy } from './context';
import { uuidV4 } from './NameModal';
import { completed, surveySent, surveyShown } from './track';

function isChoice(value: string): value is RecommendChoice {
  return (SURVEY.recommend.choices as readonly string[]).includes(value);
}

export function ThankYou() {
  const copy = useCopy();
  const [submissionId] = React.useState(uuidV4);
  const [recommend, setRecommend] = React.useState<RecommendChoice | undefined>(undefined);
  const [comment, setComment] = React.useState('');
  const [sent, setSent] = React.useState(false);

  /* Once per mount, StrictMode's double effect included: the ref survives it. */
  const announced = React.useRef(false);
  React.useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    completed();
    surveyShown();
  }, []);

  const trimmed = comment.trim();
  const answered = recommend !== undefined || trimmed !== '';

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    if (!answered || sent) return;
    surveySent(
      { recommend, comment: trimmed === '' ? undefined : trimmed },
      submissionId,
    );
    setSent(true);
  };

  return (
    <div className="musie-session musie-reflexion-done">
      <ContentBox headingLevel={1} headline={copy.thanksHeadline} text={copy.thanksSignature}>
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
            <RadioGroupText
              name="recommend"
              legend={copy.recommendQuestion}
              options={SURVEY.recommend.choices.map((choice) => ({
                value: choice,
                label: copy.recommendChoices[choice],
              }))}
              /* '' rather than undefined: the group is controlled from the
                 first render, with nothing chosen. */
              value={recommend ?? ''}
              onValueChange={(value) => {
                if (isChoice(value)) setRecommend(value);
              }}
              emptyLabel={copy.optionsEmpty}
            />
            <Field
              className="musie-reflexion-answer ph-no-capture"
              label={copy.commentLabel}
              name="comment"
              multiline
              rows={3}
              value={comment}
              onValueChange={setComment}
              errorWord={copy.statusError}
            />
            <Button type="submit" variant="primary" size="guided" block wrap disabled={!answered}>
              {copy.sendFeedback}
            </Button>
          </form>
        )}
      </ContentBox>
    </div>
  );
}
