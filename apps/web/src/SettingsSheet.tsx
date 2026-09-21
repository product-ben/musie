/**
 * /settings — a ROUTE that presents as a side sheet, not a piece of local
 * state. Back closes it and the URL is linkable, which is the whole point.
 *
 * ── WHY base-ui's Dialog AND NOT THE SYSTEM'S Lightbox ──────────────────────
 * Lightbox is the right instinct and the wrong fit, twice over:
 *
 *   1. `trigger` is a REQUIRED prop, passed straight to `Dialog.Trigger`. A
 *      route-driven overlay has no trigger element — the URL opened it.
 *   2. It frames a CENTRED popup. This is an edge-anchored sheet.
 *
 * So this uses `Dialog` directly — the same base-ui primitive Lightbox wraps,
 * so nothing that is easy to get wrong is re-implemented: focus moves in on
 * open and is restored on close, the background goes inert, page scroll locks,
 * Escape closes, and the popup is portaled clear of any ancestor's overflow.
 *
 * The frame is an L14 custom pattern, token-only, prefixed `musie-` so it can
 * never be mistaken for a system file. It is now shared with the drawer via a
 * `--start` / `--end` modifier rather than copied — and a recurring pattern is
 * a component request, logged in apps/web/OPEN-QUESTIONS.md.
 */
import * as React from 'react';
import { useNavigate } from 'react-router';
import { Dialog } from '@base-ui/react/dialog';
import { Moon, Sun, Trash2, X } from 'lucide-react';
import {
  ButtonGroup, ContentBox, CtaButton, IconButton, Message, RadioGroupText, Switch,
} from '@musie/design-system';
import { LOCALES, LOCALE_LABELS, isLocale } from './i18n';
import { useLocale, useT } from './i18n/localeContext';
import { useCloseOverlay } from './lib/useCloseOverlay';
import { useProfile } from './lib/profileContext';
import { deleteAllSessions } from './lib/session';
import { useUserTypes } from './lib/useContent';

export function SettingsSheet() {
  const t = useT();
  const close = useCloseOverlay();

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="musie-scrim" />
        <Dialog.Popup className="musie-sheet musie-sheet--end">
          <div className="musie-sheet__header">
            {/*
              The dialog's accessible name and the page's h1 are the same
              string, so they are the same element: `render` makes Dialog.Title
              an <h1>. Two names for one thing is how a screen reader ends up
              announcing "Settings, Settings".
            */}
            <Dialog.Title className="musie-placeholder" render={<h1 />}>
              {t('route.settings.title')}
            </Dialog.Title>
            {/* `tooltip={false}`: a close X in a sheet header is the case the
                IconButton docs name for suppressing it. */}
            <Dialog.Close
              render={
                <IconButton
                  glyph={X}
                  label={t('common.closeLabel')}
                  variant="ghost"
                  size="primary"
                  tooltip={false}
                />
              }
            />
          </div>

          <ThemeSwitch />
          <UserTypeChoice />
          <LanguageChoice />
          {/* LAST, and that is the whole of its position: everything above is
              a preference you set and unset, and this is the one control in
              the sheet that takes something away for good. It goes where a
              thumb arrives at it deliberately rather than on the way to
              something else. */}
          <DeleteEverything />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Dark mode.
 *
 * ── TWO STORES, ONE DIRECTION ──────────────────────────────────────────────
 * localStorage (`musy-theme`, owned by theme-init.js) is the SOURCE OF TRUTH
 * for rendering. It has to be: the attribute must be set before the first
 * stylesheet loads, and that is measurable — 2.2 verified `data-theme` is
 * written while `document.styleSheets.length` is still 0. Nothing that waits
 * on a network round trip can do that job.
 *
 * profiles.theme is a MIRROR, written alongside so the preference can follow a
 * real account later.
 *
 * NOTHING READS profiles.theme, and that is deliberate, not an oversight:
 * reading it on boot would reintroduce exactly the flash the localStorage
 * store exists to prevent. It becomes readable the day an account spans
 * devices, and until then it is a write-only column. Do not "fix" it.
 *
 * This control calls window.musyTheme.set() and NEVER touches `data-theme`
 * itself — theme-init.js owns the attribute and the storage key together, and
 * setting the attribute here would put a second writer on it.
 *
 * (Language is the mirror image: profiles.language is authoritative, because
 * there is no flash-of-wrong-language to solve. See LocaleProvider.)
 */
function ThemeSwitch() {
  const t = useT();
  const { update } = useProfile();

  const [dark, setDark] = React.useState(
    () => (window.musyTheme?.get() ?? 'light') === 'dark',
  );

  return (
    <Switch
      label={t('settings.darkMode')}
      checked={dark}
      onCheckedChange={(checked) => {
        const theme = checked ? 'dark' : 'light';
        window.musyTheme?.set(theme); // source of truth for rendering
        setDark(checked);
        update({ theme }); // mirror, for a future real account
      }}
      reverse
      accent="accent"
      /* A domain pair, not the Check / X default: the glyph says WHAT is
         switching. Moon is the checked state because checked means dark. */
      onGlyph={Moon}
      offGlyph={Sun}
    />
  );
}

/**
 * "Here as" — the four user types, from the database.
 *
 * The labels are CONTENT (user_type_i18n), not chrome, so their German is
 * PROVISIONAL: real German, written to docs/GERMAN-UI-WRITING.md, but owned by
 * the Mindfulness Cards spreadsheet and due to be overwritten by it. Nothing
 * marks it on screen any more — the seed migration carries the distinction.
 *
 * All four are selectable. Three carry `implemented: false` in the database
 * and that flag is deliberately unused here: the brief asks for the four rows
 * and the choice persisted, and disabling three without explaining why is
 * worse than letting someone choose and find out.
 *
 * ── /about-you DOES THE OPPOSITE, AND THAT IS A DECISION ───────────────────
 * The onboarding screen opens a not-implemented lightbox for those same three
 * and records nothing. The two screens are not inconsistent by accident —
 * Ben settled it on 2026-09-19:
 *
 *   /about-you is a GATE on the way into a session. It has to say why the
 *   door will not open, and accepting an answer it cannot act on would send
 *   someone to an exercise list that then has nothing for them.
 *
 *   /settings is a PREFERENCE. You are entitled to record who you are here as
 *   whether or not the product has caught up with it, and a sheet that
 *   refused the answer would be arguing with the user about their own
 *   profile.
 *
 * Written in both files rather than one, so neither reads as the screen that
 * forgot. The day the other three paths are built, both behaviours collapse
 * into the same thing and both comments go.
 */
function UserTypeChoice() {
  const t = useT();
  const { profile, update } = useProfile();
  const { data, loading, error } = useUserTypes();

  if (loading) return <p className="musie-note">{t('content.loading')}</p>;

  if (error !== null) {
    return (
      <Message
        variant="error"
        live="assertive"
        headingLevel={2}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  }

  if (data === null || data.length === 0) {
    return <p className="musie-note">{t('content.empty')}</p>;
  }

  return (
    <RadioGroupText
      name="user-type"
      legend={t('settings.userType')}
      accent="accent"
      /* undefined, not null: an uncontrolled group has no selection, which is
         exactly the state of a profile that has not answered yet. */
      value={profile?.user_type_id ?? undefined}
      options={data.map((userType) => ({ value: userType.id, label: userType.label }))}
      onValueChange={(next) => {
        update({ user_type_id: next });
      }}
    />
  );
}

/**
 * Language. This WORKS — picking one switches the locale immediately, updates
 * <html lang>, re-fetches content and writes profiles.language. No reload, and
 * no not-implemented dialog.
 *
 * The option labels come from LOCALE_LABELS and NOT from t(), on purpose: a
 * language picker shows each language in its own name, so a German speaker
 * looking for German finds "Deutsch" whatever the current locale is.
 * Translating an endonym is the bug, not the fix.
 */
function LanguageChoice() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <RadioGroupText
      name="language"
      legend={t('settings.language')}
      hint={t('settings.languageHint')}
      accent="accent"
      value={locale}
      options={LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] }))}
      onValueChange={(next) => {
        /* The component's callback is a plain string; narrow it before it
           reaches anything that expects a Locale. */
        if (isLocale(next)) setLocale(next);
      }}
    />
  );
}

/**
 * DELETE MY WHOLE DIARY — G.2's remaining half.
 *
 * ── WHY IT IS HERE AND NOT ON /diary ───────────────────────────────────────
 * The one real decision in this piece of work, so it is written down rather
 * than implied by where the code sits.
 *
 * Deleting ONE session belongs on the entry, and that is where it is: the
 * thing being deleted is on screen, the trash control sits inside its card,
 * and the confirmation replaces that card's own controls. The act and its
 * object are in the same place.
 *
 * Deleting EVERY session has no such object. It is not an operation on a row;
 * it is an operation on the account, in the same family as the language, the
 * theme and who you are here as — all of which live in this sheet. Three
 * arguments, in the order they mattered:
 *
 *   1. /diary IS THE THING BEING DESTROYED. A control that empties the diary,
 *      sitting under the diary, is a control adjacent to thirty rows the user
 *      is reading and scrolling past. A destructive act must never be the
 *      easy thing to hit by accident, and "at the bottom of the screen you
 *      scroll through most" is the definition of easy to hit.
 *
 *   2. GETTING HERE IS ALREADY DELIBERATE. /settings is two intentional acts
 *      away — open the menu, open settings — and nobody arrives in this sheet
 *      by scrolling. The confirmation below is then the third act, not the
 *      first line of defence.
 *
 *   3. IT IS WHERE SOMEBODY WOULD LOOK FOR IT. "Delete my data" is a settings
 *      question in every product a person has used, and it belongs beside the
 *      privacy promise C.2 wrote — the account lives in this browser, and this
 *      is the button that empties it.
 *
 * The cost is honest and small: somebody who wants it while looking at the
 * diary has to go to settings. That is the right friction for this button.
 *
 * ── THE CONFIRMATION IS INLINE, FOR THE REASON DiaryCard'S IS ──────────────
 * A `Message variant="warning"` replacing this box's own control, not a second
 * dialog. This sheet IS a dialog, and a dialog over a dialog is where focus
 * management stops being base-ui's problem and starts being ours. The decision
 * happens where the thing being decided about is on screen.
 *
 * The affirmative is `secondary`, not `primary`, matching the entry card: the
 * loudest button on a screen should not be the irreversible one.
 *
 * ── WHERE IT LEAVES YOU ────────────────────────────────────────────────────
 * /diary, replacing this entry in the history. Three things at once, and all
 * three are needed:
 *
 *   The sheet closes, because the route changed.
 *   The diary re-reads, because `useDiary` keys on `location.key` and this is
 *   a new entry — the same mechanism that stops a deleted row lingering after
 *   a single delete. See lib/useDiary.ts.
 *   AND THE APP IS NOT LEFT ON A ROUTE WHOSE ROW IS GONE. `deleteAllSessions`
 *   takes a running session with the rest, and this sheet opens over anything,
 *   /session/:id/:step included. Sending the person to their now-empty diary
 *   is both the honest confirmation — here is the result — and the only exit
 *   that is guaranteed to still exist.
 *
 * `replace`, so Back does not return to a settings sheet over a page that no
 * longer describes anything.
 *
 * ── A FAILURE IS SAID OUT LOUD ─────────────────────────────────────────────
 * Unlike the latest entry's quiet failure on /diary, which has a working list
 * beside it. Here there is nothing else on screen to infer the outcome from,
 * and a destructive action that silently did nothing is the worst of the three
 * possible endings: the person believes their diary is gone and it is not.
 *
 * The text does NOT claim nothing was deleted. A single `delete` is atomic in
 * Postgres, but a connection lost after it commits looks exactly like one lost
 * before, and this is not the screen to guess on. It says what to do instead.
 */
function DeleteEverything() {
  const t = useT();
  const navigate = useNavigate();

  /* One state rather than three booleans: 'confirming and failed' and
     'deleting and idle' are not states this control has, and a union cannot
     represent them. */
  const [status, setStatus] = React.useState<'idle' | 'confirming' | 'deleting' | 'failed'>(
    'idle',
  );

  async function removeEverything() {
    if (status === 'deleting') return;
    setStatus('deleting');
    try {
      await deleteAllSessions();
      navigate('/diary', { replace: true });
    } catch (thrown: unknown) {
      console.error('[musie] could not delete the diary:', thrown);
      setStatus('failed');
    }
  }

  const deciding = status === 'confirming' || status === 'deleting';

  return (
    /* `route.diary.title` REUSED rather than a new string: the section names
       the thing it acts on, and the app already has exactly one word for that
       thing. Two spellings of 'your diary' is how a settings section and the
       screen it empties stop sounding like one product.

       h2, under the sheet's Dialog.Title h1. */
    <ContentBox headline={t('route.diary.title')} headingLevel={2}>
      {status === 'failed' && (
        <Message
          variant="error"
          /* 'assertive': it answers an action the person took and is the only
             thing on screen that says how it went. L11. */
          live="assertive"
          headingLevel={3}
          headline={t('diary.deleteAll.failed')}
          text={t('content.errorDetail')}
        />
      )}

      {deciding ? (
        <Message
          variant="warning"
          live="assertive"
          headingLevel={3}
          headline={t('diary.deleteAll.confirm')}
          text={t('diary.deleteAll.text')}
          action={
            <ButtonGroup align="end">
              <CtaButton variant="ghost" onClick={() => setStatus('idle')}>
                {t('common.cancel')}
              </CtaButton>
              <CtaButton
                variant="secondary"
                loading={status === 'deleting'}
                loadingLabel={t('content.loading')}
                onClick={() => void removeEverything()}
              >
                {t('diary.deleteAll.yes')}
              </CtaButton>
            </ButtonGroup>
          }
        />
      ) : (
        /* A LABELLED BUTTON, not the entry card's bare trash icon. That icon
           is unambiguous because it sits inside the card it deletes; here
           there is no object beside it, and a glyph alone would be a control
           whose scope you have to guess at. The glyph stays as the leading
           icon, so the two controls still read as the same kind of act.

           `ghost`, and at the start edge: it is not what this sheet is for. */
        <ButtonGroup align="start">
          <CtaButton variant="ghost" leadingIcon={Trash2} onClick={() => setStatus('confirming')}>
            {t('diary.deleteAll')}
          </CtaButton>
        </ButtonGroup>
      )}
    </ContentBox>
  );
}
