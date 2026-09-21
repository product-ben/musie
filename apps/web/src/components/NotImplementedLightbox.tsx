/**
 * "Not implemented yet" — the one lightbox two screens both need.
 *
 * `/about-you` shows it for the three unbuilt user types; `/exercises` shows it
 * for the two unbuilt exercises. Same shape, same copy, one thing that differs:
 * WHAT was picked, which is the box's headline.
 *
 * A COMPONENT RATHER THAN A SECOND COPY, which is L14.3's rule applied one
 * layer up: it is not a CSS pattern (every class here belongs to the design
 * system) but it is a composition, and two copies of a composition drift in
 * exactly the same way two copies of a stylesheet block do.
 *
 * It lives in `components/` rather than `routes/` because it is not a route.
 * `NavDrawer` is its only neighbour there, and for the same reason.
 *
 * ── IT RECORDS NOTHING, AND THAT IS THE POINT ──────────────────────────────
 * Both callers open this INSTEAD of accepting the choice. The refusal does not
 * need undoing either: both screens bind their control's `value` to the stored
 * answer, so a selection the store never took is simply not there on the next
 * render.
 */
import { ContentBox, CtaButton, Lightbox } from '@musie/design-system';
import { useT } from '../i18n/localeContext';

export interface NotImplementedLightboxProps {
  /** What was picked — a user type's label, or an exercise's name. */
  what: string;
  /** Close it. Both callers clear the state that made it open. */
  onClose: () => void;
}

export function NotImplementedLightbox({ what, onClose }: NotImplementedLightboxProps) {
  const t = useT();

  return (
    <Lightbox
      open
      title={t('notImplemented.title')}
      closeLabel={t('common.closeLabel')}
      /* No `trigger`: the URL did not open this and neither did a button that
         survives it — the control that did is a radio still mounted behind the
         scrim, and base-ui returns focus there on close, which is where the
         person was. Naming it would need a ref into someone else's list. */
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <ContentBox
        /* h3, under the lightbox's own h2. The headline is what was actually
           picked, so the box names the refusal rather than repeating the
           dialog's title. */
        headingLevel={3}
        headline={what}
        text={t('notImplemented.text')}
      >
        {/* The way back is the only action, so it is the box's single control.
            Escape, the close X and the scrim all do the same thing — this is
            the affordance for someone who reads before they reach for one. */}
        <CtaButton variant="accent" onClick={onClose}>
          {t('notImplemented.back')}
        </CtaButton>
      </ContentBox>
    </Lightbox>
  );
}
