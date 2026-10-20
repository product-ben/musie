/**
 * `Impressum · Datenschutz` — the small print, in one line.
 *
 * ── WHY THIS IS THE PLACEMENT, AND NOT A FOOTER ────────────────────────────
 * `§ 5 DDG` wants an Impressum that is *leicht erkennbar, unmittelbar
 * erreichbar und ständig verfügbar* — in practice no more than two clicks from
 * anywhere, and reachable without signing in. Every screen in this app is a
 * STAGE rather than a document: `.musie-stage` is sized against the measured
 * viewport, /session is a full-height focus surface, and a persistent footer
 * would take vertical space from all of them on a 393px phone — and put
 * *Impressum* under the exercise somebody is in the middle of.
 *
 * So this line goes in the three places that cost nothing: the foot of the nav
 * drawer, which is one tap from every screen in the app, and the foot of the
 * two screens a stranger can reach without an account. LEGAL-PAGES.md §5.
 *
 * ── `InlineLink` AND NOT `CtaButton` ───────────────────────────────────────
 * The drawer's rows are 44px buttons that read as destinations you choose
 * between. These two are not that; they are the small print, and they should
 * look like it. `InlineLink` is the design system's component for a link that
 * lives inside a line of text, which is exactly what this is.
 *
 * ── A PLAIN `<a>`, AND THAT IS NOT LAZINESS ────────────────────────────────
 * The legal pages are NOT routes. They are mounted above `AuthProvider` by
 * `main.tsx`, because reading the Impressum must not create an account
 * (lib/publicRoute.ts has the argument). So there is no router to navigate
 * with from here, and a full page load is the correct behaviour rather than a
 * compromise: it is also what makes this component work identically inside the
 * app, on /beta and on the sign-in gate, which is why there is one of it.
 *
 * The href uses the CANONICAL spelling from `publicRoute.ts`, so the URL
 * anybody copies out of the address bar is the one that gets printed.
 */
import { InlineLink } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { IMPRINT_PATH, PRIVACY_PATH } from '../lib/publicRoute';

export function LegalLinks() {
  const t = useT();

  return (
    /* A `nav` with a name, because it is a pair of destinations rather than a
       sentence with links in it — L3's rule about a run of repeated items, at
       the smallest size that rule still applies. The middot is `aria-hidden`:
       it separates two words for the eye and would be read out as punctuation
       between two link names otherwise. */
    <nav className="musie-legal" aria-label={t('legal.navLabel')}>
      {/* `nativeButton={false}` because `render` makes these anchors, and
          base-ui's Button otherwise assumes — and warns about — a native
          <button> whose semantics an <a> does not have. These ARE links. */}
      <InlineLink render={<a href={IMPRINT_PATH} />} nativeButton={false}>
        {t('legal.imprint.link')}
      </InlineLink>
      <span aria-hidden="true">·</span>
      <InlineLink render={<a href={PRIVACY_PATH} />} nativeButton={false}>
        {t('legal.privacy.link')}
      </InlineLink>
    </nav>
  );
}
