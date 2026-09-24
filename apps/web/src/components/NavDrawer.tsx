/**
 * The left navigation drawer — a permitted custom pattern.
 *
 * The design system has no Drawer, so this composes existing components (Logo,
 * IconButton, CtaButton, and since 2026-09-24 whatever `preferences` holds)
 * inside a hand-built shell. L14 permits that, and its conditions hold: every
 * declaration in shell.css resolves to a Layer 1 token, and the naming is
 * `musie-` rather than `musy-`.
 *
 * IT IS THE ONLY SHEET NOW. `.musie-sheet` was parameterised by edge because
 * /settings anchored to the other one; that route is gone and its `--end`
 * modifier with it, so the recurrence L14.3 flagged has stopped recurring. The
 * component request in apps/web/OPEN-QUESTIONS.md stands as history rather than
 * as a live ask.
 *
 * ── PRESENTATIONAL, WITH A SMALL API ───────────────────────────────────────
 * `open`, `onClose`, `currentPage`, `onNavigate`, `pages` as DATA, and one
 * `preferences` slot. It owns no state and knows nothing about the router
 * beyond the `href` it is handed, so it can be driven by a route (as it is
 * here), by a Storybook story, or by anything else.
 *
 * THE PREFERENCES ARE A SLOT RATHER THAN MORE DATA — 2026-09-24, when
 * /settings was deleted and dark mode, language and the account moved in here.
 * A row is a label and a destination, which is why `pages` can be data; a
 * switch, a radio group and a sign-out button are three different controls
 * wired to three different stores, and expressing them as data would be
 * inventing a settings-form language for one caller. So the drawer says WHERE
 * they go and nothing about what they are, and `MenuPreferences` owns them.
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
import type * as React from 'react';
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
  /**
   * Where the row GOES — and it is optional, because one row does not go
   * anywhere by itself.
   *
   * A row with an `href` is an anchor: the router navigates, the drawer closes
   * because its route unmounts, and Back behaves. A row WITHOUT one renders as
   * an ordinary button and does whatever `onSelect` does — which is how *End
   * session & start a new one* can write to the database first and choose
   * where to go afterwards. An anchor could not: it would have navigated
   * before the write, and a `preventDefault` on a link is a button wearing a
   * costume.
   */
  href?: string;
  /**
   * What the row DOES, for a row that is not a destination.
   *
   * Called before `onNavigate`, so a host that closes the drawer in
   * `onNavigate` cannot unmount the row out from under its own handler.
   */
  onSelect?: () => void;
  /**
   * The drawer's ACTION rather than one of its pages — filled primary in every
   * state, and hugging its label. It never takes a current-page treatment,
   * because it is the thing the user opened the menu to do.
   */
  action?: boolean;
  /**
   * The row is busy: either its answer is still being fetched, or the thing it
   * does is in flight.
   *
   * IT WAS THE ACTION ROW'S ALONE, and for a reason worth keeping: *Start a
   * session* and *Continue session* are alternatives chosen by a query, and
   * until that lands neither label is true. Rendering one and swapping it a
   * beat later would flash the wrong label — and there that is not cosmetic,
   * because tapping *Start a session* while one is already running is exactly
   * the mistake the database refuses.
   *
   * An `onSelect` row uses it for the other sense: the write is running. Same
   * mechanism, same guarantee — `CtaButton`'s `loading` disables the control —
   * which is what stops a second press ending a session that is already being
   * ended.
   *
   * `CtaButton`'s own `loading` sets `disabled` as well as `aria-busy`, so the
   * row cannot be activated in this state.
   */
  loading?: boolean;
  /**
   * Draw a rule above this row.
   *
   * A rule, not a bigger gap. The rows sit at --space-gap-stack (L3's rung for
   * list items), and L2's doubling check says a gap only reads as a boundary at
   * double the gap inside the group — which for groups of one or two rows would
   * need gaps large enough to make the menu scroll on a phone. L2's own answer
   * when the doubling check cannot be met is a divider or a shared surface,
   * never just more space. The rule pays --space-gap-related either side, so a
   * boundary is 40px against 16px inside: double, and then some.
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
  /**
   * The preferences, below the pages and behind a rule: what you SET here, as
   * opposed to where you GO.
   *
   * Optional, because the drawer is still a drawer without them — a story or a
   * test that only cares about navigation passes nothing and gets no empty
   * bordered block, which is what the `undefined` check below is for.
   */
  preferences?: React.ReactNode;
}

export function NavDrawer(
  { open, onClose, currentPage, onNavigate, pages, preferences }: NavDrawerProps,
) {
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
                      /* THREE TREATMENTS, AND EACH ONE IS AN EXISTING VARIANT
                         — no invented selected state, no accent bar, no tinted
                         row:

                           primary   the drawer's action, filled;
                           secondary the page you are ON, and any row that DOES
                                     something rather than going somewhere;
                           ghost     the other destinations.

                         The second is two cases on purpose (Ben, 2026-09-24).
                         Outlined is this system's "this is a control, not a
                         label", and a row that writes to the database is
                         exactly that — it should not sit in the same flat
                         treatment as the four rows that merely navigate. It
                         cannot be confused with the current page either: an
                         `onSelect` row has no `href`, so `current` is false for
                         it by construction. */
                      variant={row.action === true
                        ? 'primary'
                        : current || row.onSelect !== undefined ? 'secondary' : 'ghost'}
                      /* The action hugs its label; the pages fill the row. A
                         full-width filled button among full-width buttons is
                         just another row — hugging is what makes it read as a
                         different KIND of thing. */
                      block={row.action !== true}
                      /* German compounds at 393px need this more often than
                         English does, which is what CtaButton's own docs say. */
                      wrap
                      loading={row.loading === true}
                      loadingLabel={t('content.loading')}
                      /* AN ANCHOR ONLY IF IT GOES SOMEWHERE. `undefined` leaves
                         base-ui's Button as the <button> it already is, which
                         is exactly right for a row that acts — see `href`. */
                      render={row.href === undefined
                        ? undefined
                        : <Link to={row.href} replace />}
                      aria-current={current ? 'page' : 'false'}
                      onClick={() => {
                        row.onSelect?.();
                        onNavigate(row);
                      }}
                    >
                      {t(row.labelKey)}
                    </CtaButton>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* A SECTION, not a bare div, and unlabelled on purpose: every
              control inside it already names itself (the switch's label, the
              radio group's legend, the account box's heading), and a wrapper
              heading would add a fourth name over three things that are not a
              group of anything except "not navigation". The hairline is what
              says that much, which is the same argument `.musie-nav__rule`
              makes between the row groups above. */}
          {preferences === undefined ? null : (
            <section className="musie-drawer__prefs">{preferences}</section>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
