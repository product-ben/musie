/**
 * The left navigation drawer — a permitted custom pattern.
 *
 * The design system has no Drawer, so this composes existing components (Logo,
 * IconButton, CtaButton) inside a hand-built shell. L14 permits that, and its
 * three conditions hold: every declaration in shell.css resolves to a Layer 1
 * token, the naming is `musie-` rather than `musy-`, and the sheet geometry is
 * shared with the settings sheet through one class rather than copied.
 *
 * ── PRESENTATIONAL, WITH A SMALL API ───────────────────────────────────────
 * `open`, `onClose`, `currentPage`, `onNavigate`, and `pages` as DATA. It owns
 * no state and knows nothing about the router beyond the `href` it is handed,
 * so it can be driven by a route (as it is here), by a Storybook story, or by
 * anything else.
 *
 * ── base-ui's Dialog DOES THE DANGEROUS PARTS ──────────────────────────────
 * Focus moves in on open and is RESTORED to the trigger on close, the
 * background goes inert, page scroll locks, Escape closes, and the popup is
 * portaled clear of any ancestor's overflow. None of that is hand-rolled, and
 * none of it is assumed — it is verified in the overlay suite (12 Tabs forward
 * and 6 Shift+Tabs back never escape, and focus returns to the exact trigger).
 *
 * ── NO ENTRANCE TRANSITION, DELIBERATELY ───────────────────────────────────
 * Layer 1 has --motion-duration-* and --motion-ease-*, but NO sheet-entry
 * duration, and none of the existing durations is obviously right for a 62ch
 * panel travelling in from an edge. Rather than pick one, there is no
 * animation. Whenever a duration is chosen, `prefers-reduced-motion` needs no
 * branch here: Layer 1 already collapses every duration to 1ms and
 * --motion-travel-* to 0.
 */
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { CtaButton, IconButton, Logo } from '@musie/design-system';
import { Link } from 'react-router';
import { BRAND_NAME } from '../brand';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';

export interface NavRow {
  /** Stable identity, matched against `currentPage`. */
  id: string;
  labelKey: MessageKey;
  href: string;
  /**
   * The drawer's ACTION rather than one of its pages — filled primary in every
   * state, and hugging its label. It never takes a current-page treatment,
   * because it is the thing the user opened the menu to do.
   */
  action?: boolean;
  /**
   * Draw a rule above this row.
   *
   * A rule, not a bigger gap. The rows sit at --sp-1, and L2's doubling check
   * says a gap only reads as a boundary at double the gap inside the group —
   * which for groups of one or two rows would need gaps large enough to make
   * the menu scroll on a phone. L2's own answer when the doubling check cannot
   * be met is a divider or a shared surface, never just more space.
   */
  separatorBefore?: boolean;
}

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The `id` of the row for the page currently showing, or null. */
  currentPage: string | null;
  /**
   * A row was activated.
   *
   * In this app the row is an anchor, so the router's own navigation is what
   * closes the drawer — the host needs to do nothing. It is here for a host
   * that is NOT route-driven (a story, a test) and has to close the drawer
   * itself.
   */
  onNavigate: (row: NavRow) => void;
  pages: NavRow[];
}

export function NavDrawer({ open, onClose, currentPage, onNavigate, pages }: NavDrawerProps) {
  const t = useT();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Its own element, not a pseudo-element on the drawer, and sharing one
            class with every other overlay's scrim. It sits at --z-overlay, one
            rank below --z-sheet. */}
        <Dialog.Backdrop className="musie-scrim" />

        <Dialog.Popup
          className="musie-sheet musie-sheet--start musie-drawer"
          aria-label={t('menu.title')}
          /* base-ui sets role="dialog" but NOT aria-modal — it makes the
             background genuinely inert instead, which is the stronger
             mechanism. Declared anyway: some screen readers still key their
             "you are in a dialog" boundary off this attribute, and asserting
             it costs nothing when the inertness is real. */
          aria-modal="true"
        >
          {/* Logo, then the close control pushed to the inline end. The header
              uses space-between rather than a spacer element — same result,
              one fewer node, and direction-agnostic either way. */}
          <div className="musie-sheet__header">
            <Logo size="nav" showWordmark alt={BRAND_NAME} />
            <Dialog.Close
              render={
                <IconButton
                  glyph={X}
                  label={t('menu.closeLabel')}
                  variant="ghost"
                  size="primary"
                  /* A close X in a sheet header is the case IconButton's own
                     docs name for suppressing the tooltip. */
                  tooltip={false}
                />
              }
            />
          </div>

          {/* L3: a run of repeated destinations is a list, so the count and
              position reach assistive tech instead of being drawn. */}
          <nav aria-label={t('menu.pagesLabel')}>
            <ul className="musie-nav">
              {pages.map((row) => {
                const current = !row.action && row.id === currentPage;

                return (
                  <li key={row.id} className="musie-nav__item">
                    {/* Inside the <li> that follows it: a bare <hr> as a child
                        of <ul> is not valid markup. */}
                    {row.separatorBefore === true ? (
                      <hr role="separator" className="musie-nav__rule" />
                    ) : null}

                    <CtaButton
                      /* Left-aligned through the component's own prop, so five
                         labels form a readable column. `start`, not `left`, so
                         the stack mirrors in RTL without a second rule. */
                      align="start"
                      /* Outlined for the page you are on, ghost for the others.
                         An existing variant — no invented selected treatment,
                         no accent bar, no tinted row. */
                      variant={row.action === true ? 'primary' : current ? 'secondary' : 'ghost'}
                      /* The action hugs its label; the pages fill the row. A
                         full-width filled button among full-width buttons is
                         just another row — hugging is what makes it read as a
                         different KIND of thing. */
                      block={row.action !== true}
                      /* German compounds at 393px need this more often than
                         English does, which is what CtaButton's own docs say. */
                      wrap
                      render={<Link to={row.href} replace />}
                      aria-current={current ? 'page' : 'false'}
                      onClick={() => onNavigate(row)}
                    >
                      {t(row.labelKey)}
                    </CtaButton>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
