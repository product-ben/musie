/**
 * The two permissions, as two switches and one paragraph.
 *
 * ── ONE COMPONENT, THREE PLACES ───────────────────────────────────────────
 * Sign-up asks for them, the first-run card asks anybody who signed up before
 * they existed, and /about-you is where they are changed afterwards. Three
 * copies of two switches is three places for the copy to drift and three
 * chances to pre-tick one by accident.
 *
 * CONTROLLED, because the three hosts write at different moments: sign-up
 * holds the answers until the form is submitted (there is no account to write
 * to yet), while the card and /about-you write immediately.
 *
 * ── NOTHING IS PRE-TICKED, AND THAT IS NOT A STYLE CHOICE ─────────────────
 * `NO_CONSENT_YET` is both switches off. A pre-ticked box is not consent —
 * it is the absence of a refusal, which the GDPR has been explicit about
 * since 2018 — and for the second toggle the thing being agreed to is
 * somebody's diary. The hosts pass the value; none of them may default it on.
 *
 * ── THE SECOND ONE SAYS "SPOKEN" OUT LOUD ─────────────────────────────────
 * Ben, 2026-10-20. A transcript is stored as a reflection like any other, so
 * "my reflections" already covers the ones somebody spoke — but agreeing to
 * *what I wrote* and agreeing to *what I said out loud* do not feel like the
 * same thing to the person ticking, and the label has to match what actually
 * happens rather than what is technically true.
 */
import { Switch } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import type { ConsentAnswers } from '../lib/consents';

export interface ConsentTogglesProps {
  value: ConsentAnswers;
  onChange: (next: ConsentAnswers) => void;
  /** In flight, or the form is busy. */
  disabled?: boolean;
  /**
   * Show the paragraph above the switches.
   *
   * On by default. /about-you turns it OFF, because the sentence it ends with
   * — *change these any time on the About you page* — is addressed to somebody
   * who is not already standing on it.
   */
  intro?: boolean;
}

export function ConsentToggles({ value, onChange, disabled, intro = true }: ConsentTogglesProps) {
  const t = useT();

  return (
    <div className="musie-consents">
      {intro && <p className="musie-note">{t('consent.intro')}</p>}

      {/* VISIBLE LABELS, unlike the drawer's theme and language switches. Those
          two carry a moon and two endonyms that say what they do; nothing says
          *may we read your diary* except those words, so the label stays and
          the switch wraps under it at 393px. */}
      <Switch
        label={t('consent.analytics.label')}
        checked={value.analytics}
        disabled={disabled}
        onCheckedChange={(analytics) => onChange({ ...value, analytics })}
      />

      <Switch
        label={t('consent.research.label')}
        checked={value.research}
        disabled={disabled}
        onCheckedChange={(research) => onChange({ ...value, research })}
      />
    </div>
  );
}
