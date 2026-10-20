/**
 * `/impressum` and `/privacy` — the two pages the law asks for.
 *
 * ONE COMPONENT FOR BOTH, because they are the same page with different prose:
 * a heading, a document, a way back, and a language control. Two files would
 * be two copies of the stage layout and two places to forget the back link.
 *
 * ── IT LIVES IN components/, BESIDE BetaSignup AND SignInGate ──────────────
 * Everything in `routes/` is reached through `router.tsx`. These are not: they
 * are mounted directly by `main.tsx`, above `AuthProvider`, because a page
 * about data protection must not be the thing that starts collecting data —
 * with `VITE_REQUIRE_ACCOUNT` off, no session means `signInAnonymously()`, so
 * a legal page inside that tree would create an `auth.users` row for every
 * stranger who read it. `lib/publicRoute.ts` carries the argument in full.
 *
 * It follows from that placement that this file owns two things a route gets
 * for free: its own `document.title`, and its own language control, since the
 * nav drawer that holds the app's one is behind the gate.
 *
 * ── IT ADDS NO CSS, AND THE DOCUMENT IS MARKDOWN ──────────────────────────
 * `.musie-stage--full` + `.musie-stage__box` is the pattern /beta and the gate
 * already stand on, and `.musie-md` is the prose block the session steps use.
 * `components/Markdown.tsx` turns the catalogue string into those elements —
 * headings, paragraphs, numbered lists, `strong` — and its parser has NO
 * branch that produces an `<a>` or an `<img>`. That is a constraint rather
 * than an oversight (`lib/markdown.ts` says why), so the documents write
 * addresses and provider URLs as plain text. For an Impressum that is normal;
 * for the privacy policy it is a trade worth knowing about, and the
 * alternative — a link branch in the parser — is a design-system-shaped change
 * rather than a precondition for being lawful.
 *
 * ── WHY THE COPY IS IN THE CATALOGUE AND NOT IN .md FILES ─────────────────
 * It is long, and a catalogue is not where long prose wants to live. It goes
 * there anyway, because `de.ts` is TYPED against `en.ts`: a document added in
 * one language and forgotten in the other fails `pnpm check` instead of
 * shipping a half-German legal page (rules 6 and 7). Two files per page under
 * `src/legal/` would read better and check nothing.
 */
import * as React from 'react';
import { ContentBox, CtaButton, Logo, SegmentedControl } from '@musie/design-system';
import { Languages } from 'lucide-react';
import { BRAND_NAME } from '../brand';
import { LOCALES, LOCALE_LABELS, isLocale } from '../i18n';
import type { MessageKey } from '../i18n';
import { useLocale, useT } from '../i18n/localeContext';
import { PRIVACY_VERSION } from '../lib/legal';
import { Markdown } from './Markdown';

export interface LegalPageProps {
  page: 'imprint' | 'privacy';
}

/* The two keys per page, named once. A `satisfies` so a typo in a key is a
   typecheck error here rather than a missing string at runtime — `MessageKey`
   is `keyof typeof en`, which is what makes that possible. */
const COPY = {
  imprint: { title: 'legal.imprint.title', body: 'legal.imprint.body' },
  privacy: { title: 'legal.privacy.title', body: 'legal.privacy.body' },
} satisfies Record<LegalPageProps['page'], { title: MessageKey; body: MessageKey }>;

export function LegalPage({ page }: LegalPageProps) {
  const t = useT();
  const { locale, setLocale } = useLocale();

  const copy = COPY[page];

  React.useEffect(() => {
    /* The shell does this for every route through `handle.titleKey`; these
       pages are not routes, so they do it here. Same shape, same separator. */
    document.title = `${t(copy.title)} · ${BRAND_NAME}`;
  }, [copy.title, t]);

  return (
    <main className="musie-stage musie-stage--full">
      {/* `splash`, the wordmark under the mark: the top of the page, with no
          header for it to match. The same call /beta and the gate make. */}
      <Logo size="splash" showWordmark alt={BRAND_NAME} />

      <div className="musie-stage__box">
        <ContentBox
          headingLevel={1}
          headlineStep="display-lg"
          headline={t(copy.title)}
        >
          <Markdown md={t(copy.body)} />

          {/* WHICH VERSION OF THIS TEXT, on the privacy page only. The
              consent card records the version it was showing
              (`analytics_consent_version`), so the number has to be legible
              on the page itself — otherwise "they agreed to 2026-10-20" names
              a document nobody can identify. */}
          {page === 'privacy' && (
            <p className="musie-note">
              {t('legal.privacy.version', { version: PRIVACY_VERSION })}
            </p>
          )}
        </ContentBox>
      </div>

      {/* ── THE WAY BACK ───────────────────────────────────────────────────
          A plain anchor, because there is no router on this page: a full load
          of `/` is the correct behaviour here, not a compromise. Ghost,
          because leaving is not what the page is for. */}
      <div className="musie-stage__box">
        <CtaButton
          variant="ghost"
          block
          wrap
          render={<a href="/" />}
          /* base-ui's Button assumes a native <button> and WARNS when `render`
             makes it something else — an anchor loses button semantics, which
             is the whole point here: this is a link. Saying so explicitly is
             what the warning asks for. */
          nativeButton={false}
        >
          {t('legal.back')}
        </CtaButton>
      </div>

      {/* ── THE LANGUAGE, AT THE FOOT ──────────────────────────────────────
          Exactly /beta's control, for exactly its reasons: the drawer that
          holds the app's one is behind the gate, the endonyms do not go
          through `t()` because a language picker shows each language in its
          own name, and the box is what offers the segments a width — in a bare
          `.musie-stage` they take their min-content size and ellipse their own
          labels away.

          IT MATTERS MORE HERE THAN THERE. A German reader who lands on an
          English privacy policy cannot be expected to accept it, and
          `PublicLocaleProvider` can only guess from the browser. */}
      <div className="musie-stage__box">
        <SegmentedControl
          name="language"
          legend={t('menu.language')}
          legendHidden
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
