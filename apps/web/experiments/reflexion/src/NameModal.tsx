/**
 * The name modal, over the exercise on every page load until it is answered.
 *
 * One sentence on what this is, then the consent line, a required „Dein
 * Name“ and „Los geht's“. That order is Ben's Figma (node 280:2973,
 * 2026-11-18): the consent is read before the name is typed, because pressing
 * start is the consent, for PostHog too (`copy.consent`, and track.ts's one
 * rule). The brief's line on who reads the answers went with that change.
 *
 * `mandatory`: no X, no outside dismiss, and with no `onOpenChange` Escape
 * cannot close it either — the run needs a name.
 *
 * A second link on the same device pre-fills the stored name and keeps the
 * stored id, so one person is one participant across exercises.
 */
import * as React from 'react';
import { Button, Field, Lightbox } from '@musie/design-system';
import { readStoredParticipant, useCopy, useExperiment } from './context';
import { GERMAN_ONLY, LanguageSwitch } from './Header';

const FIELD_ID = 'reflexion-name';

/**
 * A v4 UUID everywhere. `crypto.randomUUID` exists only in a secure context,
 * so a phone opening the dev server by LAN IP over plain http has none — and
 * `experiment_responses.participant_id` is a uuid column, so anything else
 * would make every save from that phone fail. `getRandomValues` is available
 * in insecure contexts too.
 */
export function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function focusName() {
  document.getElementById(FIELD_ID)?.querySelector('input')?.focus();
}

export function NameModal() {
  const copy = useCopy();
  const { start } = useExperiment();
  const stored = React.useMemo(readStoredParticipant, []);
  const [name, setName] = React.useState(stored?.name ?? '');
  const [missing, setMissing] = React.useState(false);

  /* Focus into the field once the dialog has mounted and run its own initial
     focus — a beat later, so ours is the one that sticks. */
  React.useEffect(() => {
    const timer = window.setTimeout(focusName, 60);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      setMissing(true);
      focusName();
      return;
    }
    start({ id: stored?.id ?? uuidV4(), name: trimmed });
  };

  return (
    <Lightbox
      open
      mandatory
      surface="panel"
      className="musie-reflexion-welcome"
      title={copy.modalTitle}
      closeLabel={copy.modalClose}
    >
      <form className="musie-reflexion-modal" onSubmit={submit} noValidate>
        <p className="musie-reflexion-modal__intro">{copy.modalIntro}</p>
        <p className="musie-note musie-reflexion-modal__small">{copy.consent}</p>
        <Field
          id={FIELD_ID}
          className="ph-no-capture"
          label={copy.nameLabel}
          name="name"
          autoComplete="name"
          required
          value={name}
          onValueChange={(next) => {
            setName(next);
            if (missing && next.trim() !== '') setMissing(false);
          }}
          error={missing ? copy.nameRequired : undefined}
          errorWord={copy.statusError}
        />
        <Button type="submit" variant="primary" block wrap>
          {copy.start}
        </Button>
        {!GERMAN_ONLY && <LanguageSwitch name="reflexion-language-modal" />}
      </form>
    </Lightbox>
  );
}
