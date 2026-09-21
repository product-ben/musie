/**
 * `/` — About Musie. The explainer, and the way into a first session.
 *
 * ── THE CADENCE IS THE SCREEN ──────────────────────────────────────────────
 * Musie's two messages arrive in turn, like someone typing: the greeting at
 * 1s, typing dots standing in until the carousel arrives at 4s. It is the
 * product's voice rather than decoration — the whole screen is one character
 * introducing itself — so the timers live here, in the screen, and the
 * animation is a `musie-` pattern in shell.css.
 *
 * RESTARTED ON EVERY ARRIVAL, not only on first load. This is a page the nav
 * drawer offers as *How Musie works*, so it is navigated BACK to; a sequence
 * that only ever played once would leave a returning reader looking at a
 * screen that had already finished happening.
 *
 * ── A RETURNING VISITOR SKIPS IT — BUT ONLY ON THE WAY IN ──────────────────
 * "Returning" is `profiles.user_type_id is not null`, and that choice is Ben's
 * (D.1, answered): the nav drawer already forks on exactly that column to
 * decide where *Start a session* goes, so using it here means one source of
 * truth rather than a second one in localStorage that can disagree with it.
 *
 * THE SKIP FIRES ONLY ON A COLD ARRIVAL, and that distinction is the whole of
 * the fix for a real bug: the drawer's *How Musie works* row pointed here and
 * bounced straight to /exercises, so the explainer was unreachable the moment
 * anyone had answered "who are you here as". A row that silently goes
 * somewhere else is worse than a row that is not there.
 *
 * `location.key === 'default'` is what tells the two apart. React Router
 * labels the FIRST entry in a history stack 'default', so it means "this page
 * is where the app was opened" — a typed URL, a bookmark, a reload — rather
 * than "somebody navigated here". Opening Musie takes you to the library;
 * asking to see how it works shows you how it works.
 *
 * It is the same idiom `useCloseOverlay` already uses to spot a cold
 * deep-link, which is why it is this rather than a flag threaded through the
 * drawer's Link.
 *
 * ONE MEASURED CONSEQUENCE, and it is the right one: RELOADING this page keeps
 * you on it. A reload restores React Router's own history state, so the key is
 * the one the in-app navigation gave it rather than 'default' — which means
 * "you asked for this page" survives a refresh. Being bounced off a page you
 * deliberately opened because you pressed F5 would be the worse behaviour.
 *
 * ── THE CTA IS LOCKED UNTIL THE WHOLE FLOW HAS BEEN SEEN ───────────────────
 * `seenMax` only ever moves forward, so it is "the furthest slide you have
 * looked at" rather than "where you are now" — going back to slide 1 does not
 * re-lock the button. That is the fact the carousel cannot hold for you, and
 * the reason `Carousel` is controlled from out here.
 */
import * as React from 'react';
import { MessageSquare, Music, Send, Sparkles, User } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Carousel, ContentBox, CtaButton } from '@musie/design-system';
import type { CarouselSlide } from '@musie/design-system';
import { BRAND_MARK_SRC } from '../brand';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { useProfile } from '../lib/profileContext';

/**
 * The five slides, as ids plus glyphs. THE COPY IS NOT HERE — every title is a
 * catalogue key, so nothing user-visible is written inline (rule 7) and the
 * German is written rather than owed (rule 6): these five lines are ours, not
 * the Mindfulness Cards spreadsheet's.
 *
 * The glyphs are the prototype's own inline `path` data, resolved back to the
 * Lucide components they were traced from.
 */
const SLIDES: { id: string; titleKey: MessageKey; glyph: CarouselSlide['glyph'] }[] = [
  { id: 'situation', titleKey: 'about.slide.situation', glyph: User },
  { id: 'recommend', titleKey: 'about.slide.recommend', glyph: Sparkles },
  { id: 'listen', titleKey: 'about.slide.listen', glyph: Music },
  { id: 'reflect', titleKey: 'about.slide.reflect', glyph: MessageSquare },
  { id: 'share', titleKey: 'about.slide.share', glyph: Send },
];

/** The greeting, then the carousel. Milliseconds, and the prototype's own. */
const GREETING_AT = 1000;
const CAROUSEL_AT = 4000;

export function AboutMusie() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, status } = useProfile();

  /**
   * THE SKIP DECISION, LATCHED ON THE FIRST RENDER THAT KNOWS THE ANSWER.
   *
   * Two conditions, and both matter:
   *
   *   `location.key === 'default'` — this page is where the app was OPENED,
   *   not somewhere the reader asked to go. Read once, at mount, for the same
   *   reason the profile is: it is a fact about how we got here.
   *
   *   a recorded user type — they have been here before.
   *
   * `undefined` means the profile has not arrived yet; once it has, the answer
   * is frozen. Without the latch, picking a user type mid-session would make
   * this page redirect out from under someone reading it — the column changes,
   * the render re-runs, and the page disappears.
   */
  const arrivedCold = React.useRef(location.key === 'default');
  const skip = React.useRef<boolean | undefined>(undefined);
  if (skip.current === undefined && status !== 'pending') {
    skip.current = arrivedCold.current && Boolean(profile?.user_type_id);
  }

  const [phase, setPhase] = React.useState(0);
  const [index, setIndex] = React.useState(0);
  const [seenMax, setSeenMax] = React.useState(0);

  /* One effect, two timers, cleared together. Mounting is the arrival — this
     screen is a route, so navigating back to it remounts and replays. */
  React.useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), GREETING_AT),
      setTimeout(() => setPhase(2), CAROUSEL_AT),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const onIndexChange = React.useCallback((next: number) => {
    setIndex(next);
    /* Monotonic: the promise the CTA makes is that you have LOOKED at the
       whole flow, and looking cannot be undone by scrolling back. */
    setSeenMax((furthest) => Math.max(furthest, next));
  }, []);

  if (skip.current === true) return <Navigate to="/exercises" replace />;

  const total = SLIDES.length;
  const seenAll = seenMax >= total - 1;
  const hasUserType = Boolean(profile?.user_type_id);

  /* Three hints, one at a time, and which one shows IS the gate: locked until
     the run has been seen, then either "next I'll ask" or "ready". */
  const hintKey: MessageKey = !seenAll
    ? 'about.hint.unseen'
    : hasUserType
      ? 'about.hint.ready'
      : 'about.hint.next';

  return (
    <div className="musie-stage">
      {phase >= 1 && (
        <div className="musie-message">
          <span className="musie-message__avatar">
            {/* Decorative: the greeting beside it names the speaker, so an alt
                text here would announce "Musie" twice. */}
            <img src={BRAND_MARK_SRC} alt="" aria-hidden="true" />
          </span>
          <ContentBox
            className="musie-message__box"
            /* h1. The box IS the page's heading — see ContentBox's own note on
               why 1 is in the union at all. */
            headingLevel={1}
            headlineStep="display-lg"
            headline={t('about.greeting')}
            /* `stage` is a type step the prototype uses for BODY text, which is
               what this is: the one sentence that says what Musie is for. */
            textStep="stage"
            text={t('about.pitch')}
          />
        </div>
      )}

      {/* Only while waiting. It is replaced by the thing it was waiting for,
          rather than sitting above it. */}
      {phase === 1 && (
        <div className="musie-message">
          <div className="musie-typing" role="status" aria-label={t('about.typing')}>
            <span className="musie-typing__dot" aria-hidden="true" />
            <span className="musie-typing__dot" aria-hidden="true" />
            <span className="musie-typing__dot" aria-hidden="true" />
          </div>
        </div>
      )}

      {phase >= 2 && (
        <div className="musie-message">
          <ContentBox
            headingLevel={2}
            headlineStep="heading-md"
            headline={t('about.carouselHeadline')}
          >
            <Carousel
              label={t('about.carouselLabel')}
              accent="accent"
              /* h3, under the box's h2, under the greeting's h1. */
              headingLevel={3}
              slides={SLIDES.map((slide) => ({
                id: slide.id,
                title: t(slide.titleKey),
                glyph: slide.glyph,
              }))}
              index={index}
              onIndexChange={onIndexChange}
              /* THE FILLED TREATMENT MOVES. Until the run has been seen, going
                 on is the only thing to do and Next holds it; the moment the
                 CTA unlocks, two filled primaries on one screen would compete,
                 so Next steps back. */
              nextVariant={seenAll ? 'secondary' : 'primary'}
              previousLabel={t('about.previousSlide')}
              nextLabel={t('about.nextSlide')}
              slideLabel={(position, count, title) =>
                t('about.slideLabel', {
                  position: String(position),
                  total: String(count),
                  title,
                })
              }
              dotLabel={(position) => t('about.dotLabel', { position: String(position) })}
              dotAriaLabel={(position, count) =>
                t('about.goToSlide', { position: String(position), total: String(count) })
              }
            />

            <div className="musie-cta-stack">
              <CtaButton
                /* --target-guided once the run has been seen: it is then the
                   only thing left to do on the screen. */
                size={seenAll ? 'guided' : 'primary'}
                disabled={!seenAll}
                aria-describedby="about-hint"
                onClick={() => navigate(hasUserType ? '/exercises' : '/about-you')}
              >
                {t('menu.startSession')}
              </CtaButton>
              <p id="about-hint" className="musie-cta-stack__hint">{t(hintKey)}</p>
            </div>
          </ContentBox>
        </div>
      )}
    </div>
  );
}
