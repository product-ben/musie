/**
 * The gate — sign in, sign up, and the six digits they both end at.
 *
 * ── A GATE, NOT A SCREEN ───────────────────────────────────────────────────
 * There is no way past this and nothing beside it. That is the point rather
 * than a side effect: if signing in first is preferred BECAUSE it keeps the
 * beta closed, then one person who never finds a sign-in control is the entire
 * licensing argument undone — a subscription-licensed master and a `[DE] `-
 * prefixed placeholder content set, on a real domain, in front of whoever has
 * the URL.
 *
 * It used to be conditional: `VITE_REQUIRE_ACCOUNT` chose between this screen
 * and an anonymous session, and with the flag off this component never mounted
 * at all. Anonymous accounts went on 2026-10-20 and the flag went with them,
 * so this is now the only thing a visitor without a session can reach.
 *
 * ── FOUR VIEWS, ONE COMPONENT, AND WHY NOT FOUR ROUTES ────────────────────
 * `router.tsx` opens by saying every screen is a real route. This is the
 * exception it already made for itself: the gate renders ABOVE the router
 * (main.tsx's SessionGate), because deciding what to show when there is no
 * session cannot depend on a router that has not mounted. So the four views
 * are state, and the cost is that Back does not step between them — paid back
 * by `auth.code.back`, which is the one step anybody actually wants to retake.
 *
 *   signIn        an address, and a code is sent to it
 *   signUpCode    the access code, alone
 *   signUpDetails a name, an address, and the one tick
 *   code          six digits — BOTH paths end here
 *
 * ── SIGNING UP IS TWO STEPS, AND THE CODE COMES FIRST ─────────────────────
 * Ben, 2026-10-20. Somebody without an access code is turned away having
 * handed over nothing: no name, no address, no row anywhere. The alternative —
 * one form that collects everything and then refuses — asks a stranger for
 * personal data in order to tell them they cannot come in.
 *
 * ── ONE TICK, AND THE POLICY IS NOT IT ────────────────────────────────────
 * The terms are agreed to. The privacy policy is LINKED BESIDE THEM and is not
 * a toggle: it is information provided under Art. 13 DSGVO, and a required box
 * accepting it is bundled consent, which is worth less than nothing. Ben,
 * 2026-10-20, after the first draft toggled both. Which version was on screen
 * is still recorded — see `lib/legal.ts`.
 *
 * ONE OF THE TWO PAGES EXISTS NOW. `/privacy` is a real public page, served
 * above `AuthProvider` like `/beta` — so the privacy link below goes somewhere
 * and the Art. 13 promise this screen makes is one the product keeps. There is
 * still no terms page: `/terms` is not in `publicRoute.ts`'s allowlist, so
 * following it does not 404, it shows this gate. Accepted deliberately for now
 * (LEGAL-PAGES.md §8 puts terms out of scope) rather than drawn as dead text.
 *
 * ── EVERY STRING IS PASSED (rule 7) ────────────────────────────────────────
 * `Field`'s `errorWord`, `Message`'s `statusWord` and `Switch`'s own internals
 * are the screen-reader status words left to the design system's catalogue,
 * which follows the app's locale through `MusyLocaleProvider`. Every string
 * the APP has a word for is passed here explicitly — including `CodeField`'s
 * per-box position, which has no default at all.
 */
import * as React from 'react';
import {
  CodeField, ContentBox, CtaButton, Field, FieldGroup, InlineLink, Logo, Message, Switch,
} from '@musie/design-system';
import { BRAND_NAME } from '../brand';
import { ConsentToggles } from './ConsentToggles';
import { LegalLinks } from './LegalLinks';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { NO_CONSENT_YET } from '../lib/consents';
import type { ConsentAnswers } from '../lib/consents';
import { PRIVACY_PATH, TERMS_PATH } from '../lib/legal';
import {
  checkAccessCode, createAccount, requestSignInCode, verifySignInCode,
} from '../lib/signUp';

type View = 'signIn' | 'signUpCode' | 'signUpDetails' | 'code';

const ACCESS_CODE_LENGTH = 4;
const SIGN_IN_CODE_LENGTH = 6;

export function SignInGate() {
  const t = useT();

  /* ── SIGN-UP IS THE FIRST THING A VISITOR SEES ──────────────────────────
     Ben, 2026-10-20. The gate used to open on the sign-in form, which is the
     right screen for the people who already have an account and the wrong one
     for everybody the beta is being handed to. A tester arriving with a code
     in a message had to find a link before the screen matched what they were
     holding.

     Returning testers pay one press for it, and they are the half of the
     audience that already knows where they are. */
  const [view, setView] = React.useState<View>('signUpCode');
  const [email, setEmail] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [accessCode, setAccessCode] = React.useState('');
  const [signInCode, setSignInCode] = React.useState('');
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  /* The two permissions, both off, and nothing in this file may default them
     on — see components/ConsentToggles.tsx. They are held here until the form
     is submitted because there is no account to write them to yet. */
  const [consents, setConsents] = React.useState<ConsentAnswers>(NO_CONSENT_YET);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<MessageKey | null>(null);
  const [notice, setNotice] = React.useState<MessageKey | null>(null);

  /** Move to a view with nothing left over from the last one on screen. */
  function go(next: View) {
    setFailure(null);
    setNotice(null);
    setView(next);
  }

  function fail(key: MessageKey) {
    setBusy(false);
    setNotice(null);
    setFailure(key);
  }

  /* ── Sign in: an address, and a code goes to it ────────────────────────── */
  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    /* Checked here rather than left to the browser's own required-field
       bubble: that bubble is the one string on this screen the app cannot
       translate, and it would arrive in the browser's language rather than the
       app's. The controls keep `required` anyway, for assistive tech. */
    if (email.trim() === '') return fail('auth.error.email');

    setBusy(true);
    setFailure(null);

    const sent = await requestSignInCode(email);
    setBusy(false);

    /**
     * SENT OR NOT, THE NEXT SCREEN IS THE SAME ONE.
     *
     * `requestSignInCode` passes `shouldCreateUser: false`, so an address with
     * no account creates nothing — and GoTrue answers 200 either way, by
     * design, so that this endpoint cannot be used to discover who has an
     * account. Showing "no such account" here would hand that back, one
     * address at a time, to anyone with the public key.
     *
     * So a stranger gets the code screen and no code, which is the same thing
     * they would see having mistyped their own address — and `auth.code.back`
     * is the way out of both.
     */
    if (!sent.ok) return fail(sent.messageKey);
    go('code');
  }

  /* ── Sign up, step one: the access code, alone ─────────────────────────── */
  async function submitAccessCode(code: string) {
    if (busy) return;
    setBusy(true);
    setFailure(null);

    const checked = await checkAccessCode(code);
    setBusy(false);

    if (!checked.ok) return fail(checked.messageKey);
    go('signUpDetails');
  }

  /* ── Sign up, step two: who you are, and the one tick ──────────────────── */
  async function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (firstName.trim() === '' || email.trim() === '') return fail('auth.error.details');
    /* Checked here as well as on the server. Not belt and braces: the server
       check is what makes the record true, and this one is what stops the
       person losing a round trip to learn something the screen already knew. */
    if (!acceptedTerms) return fail('auth.error.termsRequired');

    setBusy(true);
    setFailure(null);

    const made = await createAccount({
      accessCode, firstName, email, acceptedTerms, consents,
    });
    if (!made.ok) return fail(made.messageKey);

    /* ALREADY REGISTERED IS NOT A FAILURE. The account is theirs; they came to
       the wrong form. Sending the code and going to the code screen is what
       they wanted — telling them to start again at the sign-in form would be
       asking them to retype an address they have already typed. */
    const sent = await requestSignInCode(email);
    setBusy(false);
    if (!sent.ok) return fail(sent.messageKey);

    setNotice(made.outcome === 'already_registered' ? 'auth.signUp.exists' : null);
    setFailure(null);
    setView('code');
  }

  /* ── Both paths end here: six digits ───────────────────────────────────── */
  async function submitSignInCode(code: string) {
    if (busy) return;
    setBusy(true);
    setFailure(null);

    const verified = await verifySignInCode(email, code);

    if (verified.ok) {
      /* `busy` STAYS TRUE, and nothing here navigates. The session is what
         moves the app on: AuthProvider is subscribed to onAuthStateChange, so
         SIGNED_IN flips it to 'ready' and this component unmounts. Leaving the
         field disabled until that happens is what stops a second submit in
         the gap. */
      return;
    }

    /* Cleared, because the field has no submit button: leaving six wrong
       digits in place would mean the person has to delete them before the next
       attempt can even begin. */
    setSignInCode('');
    fail(verified.messageKey);
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setFailure(null);

    const sent = await requestSignInCode(email);
    setBusy(false);
    if (!sent.ok) return fail(sent.messageKey);

    setSignInCode('');
    setNotice('auth.code.resent');
  }

  const headline = {
    signIn: t('auth.title'),
    signUpCode: t('auth.signUp.codeTitle'),
    signUpDetails: t('auth.signUp.detailsTitle'),
    code: t('auth.code.title'),
  }[view];

  const intro = {
    signIn: t('auth.intro'),
    signUpCode: t('auth.signUp.codeIntro'),
    signUpDetails: t('auth.signUp.detailsIntro'),
    code: t('auth.code.intro', { email }),
  }[view];

  const onSubmit = view === 'signIn' ? submitEmail : submitDetails;

  return (
    <main className="musie-stage musie-stage--full">
      {/* `splash`, with the wordmark under the mark: this is the first and only
          thing on the page, and there is no header to match. */}
      <Logo size="splash" showWordmark alt={BRAND_NAME} />

      <div className="musie-stage__box">
        <ContentBox
          /* The page's only h1 — there is no shell around this and no other
             heading to sit under. */
          headingLevel={1}
          headline={headline}
          text={intro}
          render={<form onSubmit={(event) => void onSubmit(event)} noValidate />}
        >
          {failure !== null && (
            <Message
              variant="error"
              /* 'assertive': it answers an action the person just took and is
                 the only thing on screen that says how it went. L11. */
              live="assertive"
              headingLevel={2}
              headline={t('auth.failed')}
              text={t(failure)}
            />
          )}

          {notice !== null && (
            <Message
              variant="info"
              /* 'polite': nothing failed and nothing is waiting on the person
                 reading it this instant. */
              live="polite"
              headingLevel={2}
              headline={t(notice)}
            />
          )}

          {view === 'signIn' && (
            <>
              {/* No `legend`: FieldGroup's own docs say to omit it when the
                  group has a heading beside it, and the box's h1 is that
                  heading. */}
              <FieldGroup>
                <Field
                  label={t('auth.email')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onValueChange={setEmail}
                  required
                  disabled={busy}
                />
              </FieldGroup>

              {/* ── THE ACTION, THEN A RULE, THEN THE OTHER ROUTE ───────────
                  Ben's shape for every gate screen, 2026-10-20. The primary
                  FILLS the measure, because it is what this screen is for. The
                  rule says the control under it is not an alternative to it.
                  The secondary HUGS its label, because it is a way off this
                  screen rather than a way through it.

                  NO ButtonGroup — "move it out of the button group, this is an
                  exception". That component is for controls that belong
                  together, and a full-measure button beside a hugging one is
                  the opposite of a pair. It also retires the ordering problem
                  logged earlier today: with no group there is no primary-first
                  convention to contradict.

                  `.musie-gate-rule` in shell.css carries the L14 permission —
                  the system has no separator component, grepped not assumed. */}
              <CtaButton type="submit" block loading={busy} loadingLabel={t('content.loading')} wrap>
                {t('auth.submit')}
              </CtaButton>

              <hr className="musie-gate-rule" />

              <CtaButton
                type="button"
                variant="outline"
                className="musie-gate-secondary"
                wrap
                disabled={busy}
                onClick={() => { go('signUpCode'); } }
              >
                {t('auth.signIn.switch')}
              </CtaButton>
            </>
          )}

          {view === 'signUpCode' && (
            <>
              <CodeField
                length={ACCESS_CODE_LENGTH}
                value={accessCode}
                onValueChange={setAccessCode}
                /* Four digits in, and it checks itself. The button below stays
                   for anybody who lands here with the code already filled —
                   from a password manager, or coming back after a refusal. */
                onComplete={(code) => { void submitAccessCode(code); }}
                label={t('auth.signUp.codeLabel')}
                boxLabel={(position, total) => t('auth.code.digit', {
                  position: String(position),
                  total: String(total),
                })}
                disabled={busy}
                autoFocus
              />

              {/* ── THE ACTION, THEN A RULE, THEN THE OTHER ROUTE ───────────
                  Ben's shape for every gate screen, 2026-10-20. The primary
                  FILLS the measure, because it is what this screen is for. The
                  rule says the control under it is not an alternative to it.
                  The secondary HUGS its label, because it is a way off this
                  screen rather than a way through it.

                  NO ButtonGroup — "move it out of the button group, this is an
                  exception". That component is for controls that belong
                  together, and a full-measure button beside a hugging one is
                  the opposite of a pair. It also retires the ordering problem
                  logged earlier today: with no group there is no primary-first
                  convention to contradict.

                  `.musie-gate-rule` in shell.css carries the L14 permission —
                  the system has no separator component, grepped not assumed. */}
              <CtaButton
                type="button"
                block
                loading={busy}
                loadingLabel={t('content.loading')}
                wrap
                onClick={() => { void submitAccessCode(accessCode); }}
              >
                {t('auth.signUp.codeSubmit')}
              </CtaButton>

              <hr className="musie-gate-rule" />

              <CtaButton
                type="button"
                variant="outline"
                className="musie-gate-secondary"
                wrap
                disabled={busy}
                onClick={() => { go('signIn'); } }
              >
                {t('auth.signUp.switch')}
              </CtaButton>
            </>
          )}

          {view === 'signUpDetails' && (
            <>
              <FieldGroup>
                <Field
                  label={t('auth.firstName')}
                  name="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onValueChange={setFirstName}
                  required
                  disabled={busy}
                />
                <Field
                  label={t('auth.email')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onValueChange={setEmail}
                  required
                  disabled={busy}
                />
              </FieldGroup>

              <Switch
                label={t('auth.terms.label')}
                checked={acceptedTerms}
                onCheckedChange={setAcceptedTerms}
                disabled={busy}
                reverse
              />
              {/* `nativeButton={false}` on every anchor. InlineLink documents
                  `render={<a href=… />}` as the way to make it navigate, but
                  does not lower base-ui's `nativeButton` with it — so the
                  documented case logs "expected a native <button>" and the
                  element keeps button semantics it should not have. Caught by
                  the browser walk, not by the typecheck. Logged in
                  apps/web/OPEN-QUESTIONS.md as a design-system fix; this is
                  the caller-side workaround until it lands. */}
              <InlineLink
                nativeButton={false}
                render={<a href={TERMS_PATH} target="_blank" rel="noreferrer" />}
              >
                {t('auth.terms.link')}
              </InlineLink>

              {/* ── TWO PERMISSIONS, AND NEITHER IS A CONDITION ──────────────
                  Ben, 2026-10-20. The terms toggle above is REQUIRED — the
                  submit refuses without it. These two are not: somebody who
                  leaves both off signs up exactly as fast and gets exactly the
                  same product, which is what keeps them consent rather than a
                  toll. The intro paragraph says so in the person's own terms.

                  They sit BELOW the terms and its link rather than beside
                  them, because they are a different kind of thing: one is the
                  agreement that makes an account possible, these are two
                  favours. A person reading downwards meets the compulsory
                  thing, then the optional ones. */}
              <ConsentToggles value={consents} onChange={setConsents} disabled={busy} />

              {/* Linked, never ticked — see the header. The sentence names what
                  the link is FOR, because "Privacy policy" alone beside a
                  consent toggle reads as a second thing to agree to.

                  NO CLASS, and that is deliberate. A quieter type step would
                  need a declaration, and a declaration here would need a
                  `musie-` block (10-layout.md L14.2) for one paragraph on one
                  screen. The box's own stack spaces it and the body measure
                  carries it, so it costs the stylesheet nothing. If it wants
                  to be smaller later, that is a ContentBox slot, not an app
                  class. */}
              <p>
                {t('auth.privacy.note')}{' '}
                <InlineLink
                  nativeButton={false}
                  render={<a href={PRIVACY_PATH} target="_blank" rel="noreferrer" />}
                >
                  {t('auth.privacy.link')}
                </InlineLink>
              </p>

              {/* The action half of the same shape. No rule and no second
                  control: there is no other route off this step — the way back
                  is the one the person came in by. */}
              <CtaButton type="submit" block loading={busy} loadingLabel={t('content.loading')} wrap>
                {t('auth.signUp.submit')}
              </CtaButton>
            </>
          )}

          {view === 'code' && (
            <>
              <CodeField
                length={SIGN_IN_CODE_LENGTH}
                value={signInCode}
                onValueChange={setSignInCode}
                /* The whole reason this screen has no CTA: the last digit is
                   the submit. */
                onComplete={(code) => { void submitSignInCode(code); }}
                label={t('auth.code.label')}
                boxLabel={(position, total) => t('auth.code.digit', {
                  position: String(position),
                  total: String(total),
                })}
                description={busy ? t('auth.code.checking') : undefined}
                disabled={busy}
                autoFocus
              />

              <InlineLink type="button" onClick={() => { void resend(); }} disabled={busy}>
                {t('auth.code.resend')}
              </InlineLink>

              {/* The way out of a mistyped address, which is the commonest
                  failure here — and the only one the person cannot fix by
                  looking more carefully at their inbox. */}
              <InlineLink
                type="button"
                onClick={() => { setSignInCode(''); go('signIn'); }}
                disabled={busy}
              >
                {t('auth.code.back')}
              </InlineLink>
            </>
          )}
        </ContentBox>
      </div>

      {/* ── THE SMALL PRINT ────────────────────────────────────────────────
          THE PRIVACY LINK APPEARS TWICE ON THIS SCREEN, AND THAT IS NOT AN
          OVERSIGHT. The one inside the sign-up step is Art. 13 information
          handed over at the moment data is asked for, which is where that
          obligation lives; this line is `§ 5 DDG`'s standing requirement, and
          it is the only place the IMPRESSUM appears at all. Removing either
          loses something the other does not carry.

          For a stranger with no account this screen IS the website —
          `musie.org` is the app's own address since 2026-10-20, so the gate is
          what the root serves. That makes it the one place an Impressum
          absolutely has to be reachable from: `§ 5 DDG` asks for *leicht
          erkennbar, unmittelbar erreichbar und ständig verfügbar*, and behind
          a password is none of the three. LEGAL-PAGES.md §5.3. */}
      <LegalLinks />
    </main>
  );
}
