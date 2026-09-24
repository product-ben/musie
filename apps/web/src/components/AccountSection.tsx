/**
 * The account, and signing out of it — H.0b.
 *
 * ── IT RENDERS ONLY FOR A USER WITH AN EMAIL ADDRESS ───────────────────────
 * An anonymous user has none, and this whole section is hidden from them. That
 * is not tidiness: their account lives in this browser and nowhere else, so
 * 'Sign out' would be a button that strands an entire diary on an id nobody can
 * sign in as again — the exact data-loss shape H.0 is written to keep away from
 * testers, drawn as a control and placed one tap from the theme switch. There
 * is no confirmation dialog that makes that a reasonable thing to offer.
 *
 * So the test is `email !== null`, published by AuthProvider. For a signed-in
 * tester the diary is on the server and signing out costs them nothing but a
 * retype.
 *
 * ── THE ADDRESS IS SHOWN, DELIBERATELY ─────────────────────────────────────
 * These accounts are handed out, and a workshop phone gets passed between
 * people. "Which of us is this?" has to be answerable without signing out to
 * find out — which, for the person who was not supposed to sign out, is the
 * expensive way to ask.
 *
 * ── AND THERE IS NO CONFIRM STEP ───────────────────────────────────────────
 * Unlike the diary's delete-everything, this is REVERSIBLE: the credentials
 * still work and the diary is untouched. A confirmation for a reversible act is
 * noise that teaches people to tap through the ones that are not.
 *
 * ── h2, AND IT IS THE SAME LEVEL IT HAD IN THE SHEET ───────────────────────
 * The sheet's `Dialog.Title` was an h1 and this sat under it. The drawer has no
 * heading — it is named by `aria-label`, because a drawer whose visible top is a
 * logo has no title to make a heading OF — so this is the first heading inside
 * the dialog. h2 is still right: the page beneath the scrim is still in the
 * document with its own h1, and the level a screen reader reports is the
 * document's, not the dialog's.
 *
 * On /about-you it is an h2 for the ordinary reason: the screen's ContentBox
 * headline is the h1 and this follows it.
 *
 * ── ITS OWN FILE, BECAUSE IT HAS TWO CALLERS — Ben, 2026-09-24 ─────────────
 * It was a local function in MenuPreferences while the drawer was the only
 * place you could sign out. /about-you now ends with it too: the drawer is a
 * row of destinations you tap THROUGH, and the person looking for the way out
 * of an account goes to the screen that is about them. A second copy would be
 * two places to keep the `email === null` guard true, so there is one.
 *
 * `className` exists for that second caller alone — /about-you stacks this box
 * under the question's box and both owe `.musie-stage__box` its measure, or
 * the two boxes on one stage do not line up. The drawer passes nothing.
 */
import * as React from 'react';
import { LogOut } from 'lucide-react';
import { ButtonGroup, ContentBox, CtaButton } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { signOut } from '../lib/signIn';

export function AccountSection({ className }: { className?: string }) {
  const t = useT();
  const { email } = useAuth();
  const [busy, setBusy] = React.useState(false);

  /* Anonymous, or not resolved yet. Either way there is nothing to sign out
     of and nothing true to say about an address. */
  if (email === null) return null;

  return (
    <ContentBox
      className={className}
      headline={t('auth.account')}
      headingLevel={2}
      text={t('auth.signedInAs', { email })}
    >
      <ButtonGroup align="start">
        <CtaButton
          variant="ghost"
          leadingIcon={LogOut}
          loading={busy}
          loadingLabel={t('content.loading')}
          onClick={() => {
            /* No `finally` that clears this. `signOut()` ends by reloading the
               tab, so there is no later render to clear it in — and the button
               staying disabled across the reload is what stops a second tap
               landing while the page is on its way out. */
            setBusy(true);
            void signOut();
          }}
        >
          {t('auth.signOut')}
        </CtaButton>
      </ButtonGroup>
    </ContentBox>
  );
}
