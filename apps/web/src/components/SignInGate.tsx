/**
 * The sign-in gate — H.0b, and the whole of it.
 *
 * ── A GATE, NOT A SCREEN ───────────────────────────────────────────────────
 * With `VITE_REQUIRE_ACCOUNT` on there is no way past this and no anonymous
 * fall-through beside it. That is the point rather than a side effect: if
 * signing in first is preferred BECAUSE it keeps the beta closed, then one
 * person who never finds a sign-in control is the entire licensing argument
 * undone — a subscription-licensed master and a `[DE] `-prefixed placeholder
 * content set, on a real domain, in front of whoever has the URL.
 *
 * With the flag off this component never mounts and nothing here is reachable.
 *
 * ── WHAT IT DELIBERATELY DOES NOT HAVE ─────────────────────────────────────
 * No 'create an account', no 'forgot your password', no 'sign in with'. Each
 * needs a sending provider and a sending domain, and the domain is undecided.
 * A control that cannot work must not be drawn — a reset link that sends
 * nothing leaves a tester waiting for a mail instead of asking for help.
 *
 * ── IT ADDS NO CSS, AND THAT IS CHECKED RATHER THAN CLAIMED ────────────────
 * `.musie-stage` already centres a column and `.musie-stage__box` already takes
 * the body measure, both from the session's end screens. The one declaration
 * added for this screen is `.musie-stage--full`, because a gate has no header
 * above it and `--view-block` subtracts one. `ContentBox` renders AS the <form> through its own `render`
 * prop, so `.musy-box__slot`'s stack gap spaces the message, the fields and the
 * button — no `.musie-signin` block, no second copy of a stack, nothing for
 * L14 to permit. A pattern that recurs is a component request; a pattern that
 * already exists is just used.
 *
 * ── EVERY STRING IS PASSED (rule 7) ────────────────────────────────────────
 * `Field`'s `errorWord` and `Message`'s `statusWord` are the two screen-reader
 * status words left to the design system's own catalogue, which follows the
 * app's locale through `MusyLocaleProvider` — the same thing every other
 * screen relies on, and the boundary main.tsx describes. Every string the APP has a word
 * for is passed here explicitly.
 */
import * as React from 'react';
import { ContentBox, CtaButton, Field, FieldGroup, Logo, Message } from '@musie/design-system';
import { BRAND_NAME } from '../brand';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { signIn } from '../lib/signIn';

export function SignInGate() {
  const t = useT();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<MessageKey | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    /* Checked here rather than left to the browser's own required-field
       bubble: that bubble is the one string on this screen the app cannot
       translate, and it would arrive in the browser's language rather than the
       app's. The controls keep `required` anyway, for assistive tech. */
    if (email.trim() === '' || password === '') {
      setFailure('auth.error.missing');
      return;
    }

    setBusy(true);
    setFailure(null);

    const result = await signIn(email, password);

    if (result.ok) {
      /* `busy` STAYS TRUE, and nothing here navigates. The session is what
         moves the app on: AuthProvider is subscribed to onAuthStateChange, so
         SIGNED_IN flips it to 'ready' and this component unmounts. Leaving the
         button disabled until that happens is what stops a second submit in
         the gap. */
      return;
    }

    setBusy(false);
    setFailure(result.messageKey);
  }

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
          headline={t('auth.title')}
          text={t('auth.intro')}
          render={<form onSubmit={(event) => void submit(event)} noValidate />}
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

          {/* No `legend`: FieldGroup's own docs say to omit it when the group
              has a heading beside it, and the box's h1 is that heading. A
              screen-reader-only legend repeating 'Sign in' would announce the
              same word twice around two fields. */}
          <FieldGroup>
            <Field
              label={t('auth.email')}
              name="email"
              type="email"
              /* The reason `autoComplete` was added to Field: without it iOS
                 offers to fill nothing and a tester types a generated
                 twelve-character password by hand, from a message, every time. */
              autoComplete="email"
              value={email}
              onValueChange={setEmail}
              required
              disabled={busy}
            />
            <Field
              label={t('auth.password')}
              name="password"
              type="password"
              /* 'current-password', never 'new-password': this form never
                 creates an account, and the wrong token here is what makes a
                 password manager offer to generate one instead of filling the
                 one it has. */
              autoComplete="current-password"
              value={password}
              onValueChange={setPassword}
              required
              disabled={busy}
            />
          </FieldGroup>

          <CtaButton
            type="submit"
            block
            loading={busy}
            loadingLabel={t('content.loading')}
            /* German 'Anmelden' is short, but the button is full-width and a
               larger text size is the case that wraps. */
            wrap
          >
            {t('auth.submit')}
          </CtaButton>
        </ContentBox>
      </div>
    </main>
  );
}
