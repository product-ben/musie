/**
 * `/about-you` — who the reader is here as, and the first thing Musie stores
 * about them.
 *
 * ── PICKING WRITES; CONTINUE COMMITS AND NAVIGATES ─────────────────────────
 * A pick writes immediately, so the choice survives a closed tab whether or not
 * anyone presses Continue — and because it is the same `profiles.user_type_id`
 * the drawer and /settings already read, there is one write path and no local
 * copy to reconcile.
 *
 * Continue also writes, for the one case a pick cannot cover: the reader who
 * accepts the PRESELECTED answer without touching it. "By myself" is offered
 * selected because it is what almost everyone picks, and a Continue that only
 * navigated would send that reader to /exercises with nothing recorded — where
 * the drawer, which forks on this column, would send them straight back here.
 *
 * ── THE UNBUILT THREE OPEN A LIGHTBOX HERE, AND NOT IN SETTINGS ────────────
 * `user_types.implemented` is true for exactly one row. Picking one of the
 * other three opens a not-implemented lightbox and RECORDS NOTHING: this
 * screen is a gate on the way into a session, so it has to say why it will not
 * open rather than accept an answer it cannot act on.
 *
 * /settings does the opposite on purpose — every type is selectable there and
 * the flag is ignored, because a preference is something you are entitled to
 * record whether or not the product has caught up with it. Ben settled the
 * asymmetry on 2026-09-19 and it is written down in both places rather than
 * left looking like one of the two screens forgot.
 *
 * The refused pick does not stick, and that needs no code: `value` is bound to
 * the profile, so a selection the profile never took is simply not there on
 * the next render.
 *
 * ── RadioGroupText, NOT RadioGroupImage, AND THAT IS STILL TRUE ────────────
 * The flow's image radios need one meaning-bearing image PER OPTION —
 * `imageAlt` is required per item precisely because the picture is how the
 * option is recognised. All four rows point at the same placeholder
 * (`user_types.image_url`), and four identical pictures destroy the thing that
 * component is for. Switch the day the artwork lands; the column is already
 * there. This is the clickdummy handoff's own open item 1.
 */
import * as React from 'react';
import { useNavigate } from 'react-router';
import { ContentBox, CtaButton, Message, RadioGroupText } from '@musie/design-system';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { useT } from '../i18n/localeContext';
import { useProfile } from '../lib/profileContext';
import { useUserTypes } from '../lib/useContent';
import type { UserType } from '../lib/content';

/**
 * PRESELECTED, BECAUSE IT IS WHAT ALMOST EVERYONE PICKS (Ben, 2026-09-20).
 *
 * A constant rather than "the first implemented one": the flag says what is
 * BUILT and this says what is COMMON, and the day a second path ships those
 * two stop agreeing. If the id is ever not in the data the preselection simply
 * does not happen — see `preselected` below — so this cannot wedge the screen.
 */
const DEFAULT_USER_TYPE = 'by-myself';

export function AboutYou() {
  const t = useT();
  const navigate = useNavigate();
  const { profile, update } = useProfile();
  const { data, loading, error } = useUserTypes();

  /** The type whose lightbox is open, or null. Holds the LABEL, because that
   *  is the only thing the lightbox needs and it is already translated. */
  const [refused, setRefused] = React.useState<UserType | null>(null);

  const recorded = profile?.user_type_id ?? null;

  /**
   * WHAT THE RADIO SHOWS versus WHAT THE PROFILE HOLDS, and they are not the
   * same thing until Continue is pressed.
   *
   * The default is only ever a SUGGESTION on screen. Writing it on arrival
   * would be answering the question on the reader's behalf — and worse, it
   * would make every new visitor instantly "returning" to `/`, which forks on
   * exactly this column, so the About Musie explainer would never be seen.
   */
  const preselected = data?.some((row) => row.id === DEFAULT_USER_TYPE) === true
    ? DEFAULT_USER_TYPE
    : null;
  const shown = recorded ?? preselected;

  function pick(id: string) {
    const userType = data?.find((row) => row.id === id);
    if (userType === undefined) return;
    if (!userType.implemented) {
      setRefused(userType);
      return;
    }
    update({ user_type_id: id });
  }

  let body;
  if (loading) {
    body = <p className="musie-note">{t('content.loading')}</p>;
  } else if (error !== null) {
    body = (
      <Message
        variant="error"
        live="assertive"
        /* h2: the ContentBox headline above is the page's h1 and this replaces
           the group inside it. */
        headingLevel={2}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  } else if (data === null || data.length === 0) {
    body = <p className="musie-note">{t('content.empty')}</p>;
  } else {
    body = (
      <>
        <RadioGroupText
          name="user-type"
          legend={t('aboutYou.legend')}
          accent="accent"
          /* undefined, not null: an uncontrolled group has no selection, which
             is exactly the state of a profile that has not answered yet. */
          value={shown ?? undefined}
          options={data.map((userType) => ({ value: userType.id, label: userType.label }))}
          onValueChange={pick}
          /* Unreachable — the empty case is handled above — but passed anyway,
             because the rule is the habit. */
          emptyLabel={t('content.empty')}
        />

        <div className="musie-cta-stack">
          <CtaButton
            size={shown === null ? 'primary' : 'guided'}
            disabled={shown === null}
            aria-describedby="about-you-hint"
            onClick={() => {
              /* COMMIT THE SUGGESTION. Continue is enabled by the
                 preselection, so it has to WRITE it — otherwise someone who
                 accepts the default arrives at /exercises with no user type
                 and the drawer sends them straight back here. */
              if (shown !== null && shown !== recorded) update({ user_type_id: shown });
              navigate('/exercises');
            }}
          >
            {t('common.continue')}
          </CtaButton>
          <p id="about-you-hint" className="musie-cta-stack__hint">
            {t(shown === null ? 'aboutYou.hint.pick' : 'aboutYou.hint.ready')}
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="musie-stage">
      <ContentBox
        className="musie-stage__box"
        headingLevel={1}
        headlineStep="heading-lg"
        headline={t('aboutYou.headline')}
        text={t('aboutYou.text')}
      >
        {body}
      </ContentBox>

      {/* Rendered only while refused !== null, so the dialog mounts with the
          refusal rather than sitting in the DOM waiting for one. */}
      {refused !== null && (
        <NotImplementedLightbox what={refused.label} onClose={() => setRefused(null)} />
      )}
    </div>
  );
}
