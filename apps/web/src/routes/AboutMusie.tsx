/**
 * `/about` — About Musie. The explainer, and the way into a first session.
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
 * ── IT NO LONGER SKIPS ITSELF — 2026-10-02 ────────────────────────────────
 * This screen used to redirect a returning visitor to /exercises on a cold
 * arrival, because it WAS `/` and had nowhere else to put that decision. It is
 * `/about` now, and the decision lives at the index: routes/Entry.tsx and
 * lib/entry.ts, where the condition it depends on is true by construction.
 *
 * What that buys, beyond tidiness: this route is unconditional. Ask for
 * /about and you get the explainer — reloading it, deep-linking it, sending it
 * to somebody, or tapping *How Musie works* in the drawer. A page that
 * sometimes silently goes somewhere else was the bug the old skip was patched
 * twice to avoid, and it cannot recur here now because there is no branch left.
 *
 * ── THE CTA IS LOCKED UNTIL THE WHOLE FLOW HAS BEEN SEEN ───────────────────
 * `seenMax` only ever moves forward, so it is "the furthest slide you have
 * looked at" rather than "where you are now" — going back to slide 1 does not
 * re-lock the button. That is the fact the carousel cannot hold for you, and
 * the reason `Carousel` is controlled from out here.
 */
import * as React from 'react';
import { BookOpen, Music, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Carousel, ContentBox, CtaButton } from '@musie/design-system';
import type { CarouselSlide } from '@musie/design-system';
import { BRAND_MARK_SRC } from '../brand';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { useProfile } from '../lib/profileContext';

/**
 * The three slides, as ids plus glyphs. THE COPY IS NOT HERE — every title is a
 * catalogue key, so nothing user-visible is written inline (rule 7) and the
 * German is written rather than owed (rule 6): these three lines are ours, not
 * the Mindfulness Cards spreadsheet's.
 *
 * THREE, NOT THE PROTOTYPE'S FIVE. The CTA below is gated on having SEEN the
 * last slide, so the number of slides is the number of swipes anybody owes
 * before they may start — five beats of explanation cost four of them. The
 * three that remain are the arc: choose, be guided, understand yourself.
 *
 * THE THIRD BEAT IS THE DIARY — 2026-10-02, and it is a reversal. The diary
 * was a slide, then a postscript under the CTA on the argument that it is what
 * is there AFTER a session rather than a step inside one. That argument is
 * still true and it lost anyway: user testing showed the postscript was not
 * read (U1, U2 — both surprised by the diary later), while the diary itself
 * was the thing a tester named as what he liked here (U3). A promise nobody
 * sees is not a quieter promise. So the arc is now: choose, be guided, keep
 * the thread.
 *
 * The glyphs stay Lucide's, one per beat: the pick, the exercise, the book it
 * is written in.
 */
const SLIDES: { id: string; titleKey: MessageKey; glyph: CarouselSlide['glyph'] }[] = [
  { id: 'choose', titleKey: 'about.slide.choose', glyph: Sparkles },
  { id: 'guide', titleKey: 'about.slide.guide', glyph: Music },
  { id: 'diary', titleKey: 'about.slide.diary', glyph: BookOpen },
];

/** The greeting, then the carousel. Milliseconds, and the prototype's own. */
const GREETING_AT = 1000;
const CAROUSEL_AT = 4000;

export function AboutMusie() {
  const t = useT();
  const navigate = useNavigate();
  const { profile } = useProfile();

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
              /* THE FILLED TREATMENT MOVES, AND THIS LINE IS THE WHOLE OF IT
                 ON EVERY POINTER. Until the run has been seen, going on is the
                 only thing to do and Next holds the emphasis and says so; the
                 moment the CTA below unlocks, the chevrons get out of its way.

                 `ghost`, NOT `secondary`, at the far end — and the difference
                 was measured on a phone on 2026-09-25. `secondary` leaves an
                 outlined circle on each side of the dots, and a box bracketing
                 a dot row still reads as the chrome of a stepper. Ghost keeps
                 the chevron and takes the container.

                 THE HAND-OVER IS EXACTLY THE CTA'S OWN GATE, `seenAll`, so the
                 two happen in the same render: the chevrons go quiet in the
                 frame where `Session starten` lights up. One thing takes the
                 emphasis from the other rather than both being loud or both
                 being quiet, which is what a phone showed was missing when the
                 carousel demoted its controls on its own. */
              nextVariant={seenAll ? 'ghost' : 'primary'}
              previousLabel={t('about.previousSlide')}
              nextLabel={t('about.nextSlide')}
              slideLabel={(position, count, title) =>
                t('about.slideLabel', {
                  position: String(position),
                  total: String(count),
                  title,
                })
              }
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
