/**
 * `/beta` — the closed-beta sign-up page. The only page here that is public.
 *
 * Three things, in this order: the logo, what Musie is, and the form. That is
 * the whole brief and the whole page — no header, no nav, no way into the app
 * and nothing that needs an account to render.
 *
 * ── IT LIVES IN components/, BESIDE SignInGate, AND NOT IN routes/ ─────────
 * Everything in `routes/` is reached through `router.tsx`. This is not: it is
 * mounted directly by `main.tsx`, above `AuthProvider`, because the page must
 * not cause a session to be created just by being read (`lib/publicRoute.ts`
 * has the argument in full). `SignInGate` is the existing screen in exactly
 * that position, and it is here, so this is here.
 *
 * It follows from that placement that this file owns two things a route gets
 * for free: its own `document.title`, and its own language control, since the
 * nav drawer that holds the app's one is behind the gate.
 *
 * ── IT ADDS NO CSS ─────────────────────────────────────────────────────────
 * Checked rather than claimed, and it is the same three patterns the sign-in
 * gate stands on. `.musie-stage` is a centred column with the stack gap
 * between its children, `--full` gives it the viewport and the gutter it
 * cannot inherit from `.musie-main` (there is no shell above either screen),
 * and `.musie-stage__box` takes `--measure-body` — so TWO boxes stacked in it
 * land on the same measure as the messages on /about, and the page is
 * responsive by construction rather than by a breakpoint written here. L14.3
 * says a pattern that recurs is a component request; a pattern that already
 * exists is just used.
 *
 * What makes it work on a phone is `min-block-size` on the stage rather than
 * `block-size`: this page has more in it than the gate does, so at 393px with
 * German copy it is taller than the viewport and has to push past it and
 * scroll, not shrink to fit.
 *
 * ── EVERY STRING IS PASSED (rule 7) ────────────────────────────────────────
 * Including `ContentList`'s and `RadioGroupText`'s `emptyLabel`, neither of
 * which can be reached here — the list is three literal items and the options
 * come from a constant. They are passed anyway, because the rule has no
 * exceptions and because the German defaults those two would fall back to
 * ('Noch keine Einträge', 'Keine Optionen verfügbar') are exactly the leak
 * that makes an English page half German.
 *
 * `Field`'s `errorWord` and `Message`'s `statusWord` are the two screen-reader
 * status words left to the design system's own catalogue, which follows the
 * locale through `MusyLocaleProvider`. Same boundary the gate describes.
 */
import * as React from 'react';
import {
  ContentBox, ContentList, CtaButton, Field, FieldGroup, Logo, Message,
  RadioGroupText, SegmentedControl,
} from '@musie/design-system';
import { Languages } from 'lucide-react';
import { BRAND_NAME } from '../brand';
import { LOCALES, LOCALE_LABELS, isLocale } from '../i18n';
import type { MessageKey } from '../i18n';
import { useLocale, useT } from '../i18n/localeContext';
import { BETA_REASONS } from '../lib/betaReasons';
import { betaSignupProblems, hasProblem, submitBetaSignup } from '../lib/betaSignup';
import type { BetaSignupFields } from '../lib/betaSignup';

const EMPTY: BetaSignupFields = { firstName: '', email: '', reasonCode: '' };

export function BetaSignup() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  const [fields, setFields] = React.useState<BetaSignupFields>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<MessageKey | null>(null);
  /**
   * The first name as it was when the row was written, or null while the form
   * is still up. It carries the thank-you's `{name}`, and it is kept SEPARATE
   * from `fields` so that the sentence cannot change under the person after
   * the fact — a controlled input the form no longer renders is still state
   * something could write to.
   */
  const [signedUp, setSignedUp] = React.useState<string | null>(null);
  /**
   * Whether the form has been submitted yet. Nothing is marked invalid before
   * it has: a field somebody has not finished typing in is not a mistake, and
   * red boxes on an untouched form are what `Field`'s own "validity is never
   * painted before it is earned" rule is about.
   */
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    /* The shell does this for every route through `handle.titleKey`; this page
       is not a route, so it does it here. Same shape, same separator. */
    document.title = `${t('beta.route.title')} · ${BRAND_NAME}`;
  }, [t]);

  /**
   * RE-DERIVED ON EVERY RENDER, not held in state, which is what makes an
   * error clear itself the moment the field it is about is fixed. Held in
   * state it would be a snapshot of the last submit, and somebody who corrects
   * their address would keep the message until they pressed the button again
   * to find out whether they had got it right.
   */
  const problems = submitted ? betaSignupProblems(fields) : null;

  function set(part: Partial<BetaSignupFields>) {
    setFields((prev) => ({ ...prev, ...part }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setSubmitted(true);

    /* The browser's own required-field bubble is suppressed with `noValidate`
       and replaced by this, for the reason the gate gives: that bubble is the
       one string on the page the app cannot translate, so it would arrive in
       the browser's language rather than the page's. The controls keep
       `required` for assistive tech. */
    if (hasProblem(betaSignupProblems(fields))) {
      /* Any previous server failure is stale now — the person has been given
         three field-level messages to act on instead. */
      setFailure(null);
      return;
    }

    setBusy(true);
    setFailure(null);

    const result = await submitBetaSignup(fields);

    setBusy(false);

    if (result.ok) {
      /* Trimmed, because that is the form the row was written with. */
      setSignedUp(fields.firstName.trim());
      return;
    }

    setFailure(result.messageKey);
  }

  return (
    <main className="musie-stage musie-stage--full">
      {/* `splash`, the wordmark under the mark: this is the top of the page and
          there is no header for it to match. The same call the gate makes. */}
      <Logo size="splash" showWordmark alt={BRAND_NAME} />

      {/* ── WHAT MUSIE IS ──────────────────────────────────────────────────
          The pitch is `about.*`, not copy of its own: the greeting is the h1 of
          /about too, at this same display step, and the three beats under it are
          that page's three slides. One spelling of what Musie is, in Musie's
          own voice, so a rewrite of the pitch cannot leave the public page
          saying last month's version.

          A LIST RATHER THAN /about's CAROUSEL, deliberately. There the three
          beats are a gate — you swipe through them before you may start, and
          `seenMax` is what unlocks the CTA. Here they are the answer to "what
          is this?", read by somebody deciding whether to leave an address, and
          content behind a swipe is content a reader may never see. Same three
          lines, all three visible. */}
      <div className="musie-stage__box">
        <ContentBox
          headingLevel={1}
          headlineStep="display-lg"
          headline={t('about.greeting')}
          /* `stage` is the prototype's type step for body text that carries a
             page — the one sentence saying what Musie is for. */
          textStep="stage"
          text={t('about.pitch')}
        >
          <ContentList
            label={t('about.carouselLabel')}
            items={[
              { label: t('beta.how.choose'), content: t('about.slide.choose') },
              { label: t('beta.how.guide'), content: t('about.slide.guide') },
              { label: t('beta.how.diary'), content: t('about.slide.diary') },
            ]}
            emptyLabel={t('content.empty')}
          />
        </ContentBox>
      </div>

      {/* ── THE FORM, OR THE THANK-YOU IN ITS PLACE ────────────────────────── */}
      <div className="musie-stage__box">
        {signedUp !== null ? (
          <Message
            variant="success"
            /* 'assertive': it answers an action the person just took, and the
               form it replaced is gone from the page — so a polite region
               could leave a screen-reader user with no idea whether the press
               did anything. L11. */
            live="assertive"
            /* h2, where the form's own headline was: the outline must not gain
               or lose a level because a form was submitted. */
            headingLevel={2}
            headline={t('beta.done.headline')}
            text={t('beta.done.text', { name: signedUp })}
          />
        ) : (
          <ContentBox
            headingLevel={2}
            headline={t('beta.headline')}
            text={t('beta.intro')}
            /* The box IS the form — base-ui composition, so `.musy-box__slot`'s
               stack gap spaces the message, the fields, the options and the
               button with nothing added here. The gate does the same. */
            render={<form onSubmit={(event) => void submit(event)} noValidate />}
          >
            {failure !== null && (
              <Message
                variant="error"
                live="assertive"
                /* h3, under the box's h2. */
                headingLevel={3}
                headline={t('beta.failed')}
                text={t(failure)}
              />
            )}

            {/* No `legend`: FieldGroup's own docs say to omit it when the group
                has a heading beside it, and the box's h2 is that heading. */}
            <FieldGroup>
              <Field
                label={t('beta.firstName')}
                name="first_name"
                /* 'given-name', not 'name' — this field is the first name
                   alone, and `name` would have a browser fill it with the whole
                   one. The token was added to the design system's union for
                   this form; see Field.tsx. */
                autoComplete="given-name"
                value={fields.firstName}
                onValueChange={(firstName) => set({ firstName })}
                required
                disabled={busy}
                error={problems?.firstName ? t(problems.firstName) : undefined}
              />
              <Field
                label={t('beta.email')}
                name="email"
                type="email"
                autoComplete="email"
                value={fields.email}
                onValueChange={(email) => set({ email })}
                required
                disabled={busy}
                error={problems?.email ? t(problems.email) : undefined}
              />
            </FieldGroup>

            {/* RADIO, NOT A SELECT, and that is what Ben asked for: four short
                answers that are all worth reading at once. The options come
                from `lib/betaReasons.ts`, which is the file to edit to add the
                fifth — this screen maps whatever is in it. */}
            <RadioGroupText
              name="reason"
              legend={t('beta.reason.legend')}
              options={BETA_REASONS.map((reason) => ({
                value: reason.code,
                label: t(reason.labelKey),
              }))}
              value={fields.reasonCode}
              onValueChange={(reasonCode) => set({ reasonCode })}
              disabled={busy}
              error={problems?.reasonCode ? t(problems.reasonCode) : undefined}
              emptyLabel={t('content.empty')}
            />

            <CtaButton
              type="submit"
              block
              loading={busy}
              loadingLabel={t('content.loading')}
              /* The German label is 'Für die Beta anmelden' — four words on a
                 full-width button at a large text size is the case that wraps
                 rather than overflows. */
              wrap
            >
              {t('beta.submit')}
            </CtaButton>

            {/* What happens to the address, under the button that sends it.
                `.musie-note` is the shell's muted paragraph and already takes
                `--measure-body`; it is the pattern /diary and /discovered-music
                use for a line somebody reads rather than acts on. */}
            <p className="musie-note">{t('beta.privacy')}</p>
          </ContentBox>
        )}
      </div>

      {/* ── THE LANGUAGE, AT THE FOOT ──────────────────────────────────────
          A German-first product on a page that will be opened by people who
          get here from an English talk and by people who get here from Ben, so
          the browser's guess is right often and not always. `PublicLocaleProvider`
          resolves it the way the app does; this is the way to disagree with it.

          LAST, so the page still opens with the logo. Otherwise it is the
          drawer's language control exactly: the same `name`, the same
          endonyms, which do NOT go through t() because a language picker shows
          each language in its own name.

          IN A BOX LIKE THE OTHER TWO, and that is not decoration — MEASURED on
          a phone. `.musie-stage` centres its children, so a bare fieldset here
          takes its MIN-CONTENT width; the component's own container query then
          stacks each segment and ellipses 'English' and 'Deutsch' to nothing,
          leaving two glyphs and no words. `labels: 'all'` is documented to
          stretch to the width on offer, and this is what offers it.

          AND IT KEEPS THE PRIMARY RUNG. `size="min"` is the 24px one, for a
          control in a row of page furniture; L5 picks from the POINTER, and
          this page is read on a phone, so the small rung here would be a
          deliberate exception made against a thumb. */}
      <div className="musie-stage__box">
        <SegmentedControl
          name="language"
          legend={t('menu.language')}
          legendHidden
          accent="accent"
          value={locale}
          options={LOCALES.map((value) => ({
            value,
            label: LOCALE_LABELS[value],
            /* The same glyph on both, for the reason MenuPreferences gives:
               there is no per-language mark, a flag is a country rather than a
               language, and the endonym is the only honest cue. */
            glyph: Languages,
          }))}
          onValueChange={(next) => {
            /* The component's callback is a plain string; narrow it before it
               reaches anything that expects a Locale. */
            if (isLocale(next)) setLocale(next);
          }}
        />
      </div>
    </main>
  );
}
