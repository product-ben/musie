/**
 * The system's own chrome words — Layer 2 · C.10
 *
 * WHY THIS FILE EXISTS. Every component in this package ships a user-visible
 * default, and until now those defaults were a mix of German and English with
 * no single place to read them. Worse, three of them had NO PROP AT ALL:
 * Badge's and Message's screen-reader status word ('Hinweis' / 'Warnung' /
 * 'Erfolg' / 'Fehler'), and DraggableList's four row controls plus its whole
 * set of composed drag labels. A consuming app that passes every string it can
 * still shipped those — so an English screen announced "Fehler: This content
 * could not be loaded", German, audible only to the users who depend on it
 * most. Discipline in the app could not reach them, because there was nothing
 * to pass.
 *
 * So the defaults move HERE, once, per locale, and the components read them
 * through context.
 *
 * ── THE CATALOGUE IS THE FLOOR, NOT A REPLACEMENT ──────────────────────────
 * Every prop that took a string still takes it and still wins. The catalogue
 * only changes what a prop FALLS BACK TO. A screen that needs a different
 * word passes it; a screen that needs the system's own word gets it in the
 * right language without asking.
 *
 * ── A PROVIDER, NOT A SETTER ───────────────────────────────────────────────
 * There is deliberately no `setMusyLocale()`. The consuming app switches
 * language at runtime with no reload (apps/web/src/LocaleProvider.tsx), and a
 * module-level setter would mutate a value React never re-read — every mounted
 * component would keep rendering the old language until something else
 * happened to re-render it. That is a slow-burning bug, not a shortcut.
 *
 * ── AND IT DEFAULTS TO GERMAN ──────────────────────────────────────────────
 * With no provider mounted the German catalogue is what renders, because the
 * app is German-primary and every component comment in the set that named a
 * language named German as the reason. Note the honest consequence: the
 * components whose hardcoded defaults happened to be ENGLISH (RecordButton,
 * VoiceNote, PhotoUpload, DraggableList, TrackButton, MusicPlayer, the wizard's
 * state words) now render German when nothing is passed and no provider is
 * mounted. That is a change, and it is the point — "unwrapped behaves exactly
 * as before" was only ever true of half the set.
 *
 * ── WHY IT IS NOT THE APP'S CATALOGUE ──────────────────────────────────────
 * apps/web/src/i18n is the APP's chrome and is typed `de.ts` against `en.ts`.
 * This is the PACKAGE's chrome: the words a component says about itself when
 * the screen says nothing. The app must not have to restate them to get them
 * right, and the package must not import the app. Two catalogues, one rule
 * each.
 *
 * German is written to docs/GERMAN-UI-WRITING.md: du, sentence case, a verb
 * phrase for an action, no 'Bitte', and the German dash and ellipsis.
 */
import * as React from 'react';

export type MusyLocale = 'de' | 'en';

/**
 * Every user-visible default the package ships, flat.
 *
 * Flat on purpose: a component reads one or two entries, never a branch, so
 * nesting would only add a path to mistype. Entries that interpolate are
 * FUNCTIONS rather than templates with slots — a position or a noun goes in
 * as a value and the whole phrase is written per locale, which is the only way
 * German can put the verb where German puts the verb.
 */
export interface MusyTextCatalogue {
  /* ── Status words · Badge, Message, Field, VoiceNote, PhotoUpload ────────
     Screen-reader-only, read BEFORE the label, so the severity is heard and
     not only seen (1.4.1). These are the four that had no prop. */
  statusInfo: string;
  statusWarning: string;
  statusSuccess: string;
  statusError: string;

  /* ── Overlays and dismissal ──────────────────────────────────────────── */
  /** Message and Toast — both dismiss the same kind of thing, so one word. */
  dismissMessage: string;
  /** Lightbox's close control. */
  close: string;

  /* ── Busy and empty ──────────────────────────────────────────────────── */
  /** CtaButton and IconButton, announced while `loading`. */
  loading: string;
  /** ContentList with no items. */
  listEmpty: string;
  /** RadioGroupText, RadioGroupImage and RadioCards with no options. */
  optionsEmpty: string;

  /* ── Steps ───────────────────────────────────────────────────────────── */
  /* `stepPrefix` — the bare ordinal word, "Schritt" — is GONE (2026-09-25).
     It outlived ProcessVisualisation only because Carousel's dot pill printed
     it, and that pill no longer prints anything; the note in
     stories/OPEN-QUESTIONS.md recording why it was kept is now the record of
     why it went. `carouselSlide` and `carouselGoTo` spell the word out in
     their own sentences, which is where an ordinal belongs. */
  /** InteractiveWizard's five state words, under each label. */
  wizardDisabled: string;
  wizardActive: string;
  wizardSelected: string;
  wizardCompleted: string;
  /**
   * NOT PART OF THIS RUN — D14, answered 2026-09-19.
   *
   * Distinct from `wizardDisabled` on purpose: locked means *not yet*, and this
   * means *never, in this run*. Two of the three exercises draw no card, so
   * their `scan` step is skipped and no sequence of completions will open it.
   */
  wizardSkipped: string;

  /* ── Carousel ─────────────────────────────────────────────────────────
     Positional, so these are functions rather than templates with slots — it
     is the only way German can put the ordinal where German puts it. */
  carouselPrevious: string;
  carouselNext: string;
  /** (position, total, title) → the slide's accessible name. */
  carouselSlide: (position: number, total: number, title: string) => string;
  /** (position, total) → a dot button's accessible name. */
  carouselGoTo: (position: number, total: number) => string;

  /* ── Playback · MusicPlayer ──────────────────────────────────────────── */
  playerPlay: string;
  playerPause: string;
  playerRestart: string;
  playerSeek: string;

  /* ── Playback · TrackButton ───────────────────────────────────────────
     Separate from MusicPlayer's: the track button's visible label is the
     ACTION and it invites, where the player's is a transport control. */
  trackPlay: string;
  trackPause: string;
  trackRestart: string;

  /* ── Capture · RecordButton ──────────────────────────────────────────── */
  recordReady: string;
  recordRecording: string;
  /** Spoken status: (elapsed, remaining) → one sentence. */
  recordStatus: (elapsed: string, remaining: string) => string;

  /* ── Capture · VoiceNote ─────────────────────────────────────────────── */
  voiceIdleText: string;
  voiceRecord: string;
  voiceStop: string;
  voicePlay: string;
  voicePause: string;
  voiceDelete: string;
  voiceRecording: string;

  /* ── Capture · PhotoUpload ───────────────────────────────────────────── */
  uploadZoneText: string;
  uploadChoose: string;
  uploadReplace: string;
  uploadRemove: string;

  /* ── DraggableList · the list and its states ─────────────────────────── */
  dragListLabel: string;
  dragItemNoun: string;
  dragEmptyHeadline: string;
  dragEmptyText: string;
  dragListening: string;
  dragHearing: string;

  /* ── DraggableList · the row, which had no props at all ──────────────── */
  dragEdit: string;
  dragDelete: string;
  dragSave: string;
  dragDiscard: string;
  /** The row's hidden headline and its editor's label — "Aussage 2". */
  dragItemLabel: (noun: string, position: number) => string;
  dragHandleLabel: (noun: string, position: number) => string;
  dragShowActions: (noun: string, position: number) => string;
  dragHideActions: (noun: string, position: number) => string;

  /* ── DraggableList · swipe to delete, on a thumb ─────────────────────── */
  /** The revealed panel's accessible name — "Aussage 2 löschen". The word
   *  PAINTED on it is `dragDelete`, the same one the row's menu uses: one
   *  gesture and one menu entry that do the same thing must not be two
   *  different words. */
  dragDeleteItem: (noun: string, position: number) => string;
  /**
   * What the panel says once the swipe has gone far enough that letting go
   * deletes rather than parks — what a release WOULD do, while the finger is
   * still down and the decision is still open.
   *
   * ONE SHORT VERB, AND THE LENGTH IS A CONSTRAINT RATHER THAN A STYLE. It
   * shares a strip half a row wide with the trash glyph, so `dropCancel`'s
   * fuller phrasing ("Zum Abbrechen loslassen") does not fit: measured at a
   * 393px viewport the strip is ~168px, of which the glyph and the inset take
   * 60. The glyph is already saying *delete*; this only has to say *now*.
   */
  dragSwipeArmed: string;

  /* ── DraggableList · the drag hint under the finger ──────────────────── */
  dropCombine: (position: number) => string;
  dropBefore: (position: number) => string;
  dropAfter: (position: number) => string;
  dropCancel: string;

  /* ── DraggableList · the keyboard live region ────────────────────────── */
  dragLifted: (noun: string, position: number) => string;
  dragDropped: (noun: string, position: number) => string;
  dragCancelled: string;
  dragMoved: (noun: string, position: number) => string;
  dragMerged: (noun: string, position: number) => string;
  /** Announced for BOTH routes out of a row — the menu's Delete and the
   *  swipe — because a row leaving the list is the same event whichever hand
   *  ended it, and the swipe has no button left behind to speak for it. */
  dragDeleted: (noun: string, position: number) => string;
}

/**
 * German — the default, and the source of every word in the set that was
 * already German. Written to docs/GERMAN-UI-WRITING.md.
 */
export const musyTextDe: MusyTextCatalogue = {
  statusInfo: 'Hinweis',
  statusWarning: 'Warnung',
  statusSuccess: 'Erfolg',
  statusError: 'Fehler',

  dismissMessage: 'Meldung schließen',
  close: 'Schließen',

  loading: 'Wird geladen',
  listEmpty: 'Noch keine Einträge',
  optionsEmpty: 'Keine Optionen verfügbar',

  /* Adjectives, so lower case even in German, and they sit under a label
     rather than standing as headings. */
  wizardDisabled: 'gesperrt',
  wizardActive: 'verfügbar',
  wizardSelected: 'aktuell',
  wizardCompleted: 'erledigt',
  /* Participle, like the other four, and lower case for the same reason: it
     sits under a label rather than standing as a heading. */
  wizardSkipped: 'übersprungen',

  carouselPrevious: 'Vorheriger Schritt',
  carouselNext: 'Nächster Schritt',
  carouselSlide: (position, total, title) => `Schritt ${position} von ${total}: ${title}`,
  carouselGoTo: (position, total) => `Zu Schritt ${position} von ${total}`,

  playerPlay: 'Abspielen',
  playerPause: 'Pause',
  playerRestart: 'Erneut abspielen',
  playerSeek: 'Wiedergabeposition',

  trackPlay: 'Jetzt anhören',
  trackPause: 'Pause',
  trackRestart: 'Noch einmal',

  recordReady: 'Jetzt aufnehmen',
  recordRecording: 'Aufnahme läuft',
  recordStatus: (elapsed, remaining) =>
    `Aufnahme, ${elapsed} aufgenommen, ${remaining} verbleibend`,

  /* Halbgeviertstrich with spaces, not the em dash — §7. */
  voiceIdleText: 'Antworte laut – du kannst die Aufnahme löschen und neu beginnen.',
  voiceRecord: 'Antwort aufnehmen',
  voiceStop: 'Aufnahme beenden',
  voicePlay: 'Antwort abspielen',
  voicePause: 'Antwort pausieren',
  voiceDelete: 'Antwort löschen',
  voiceRecording: 'Aufnahme läuft',

  uploadZoneText: 'Zieh ein Foto hierher oder wähle eines von deinem Gerät.',
  uploadChoose: 'Foto wählen',
  uploadReplace: 'Ersetzen',
  uploadRemove: 'Foto entfernen',

  dragListLabel: 'Transkript',
  dragItemNoun: 'Aussage',
  dragEmptyHeadline: 'Noch nichts aufgenommen',
  dragEmptyText:
    'Fertige Aussagen erscheinen hier, je eine Box, in der Reihenfolge, in der du sie gesagt hast.',
  dragListening: 'Hört zu',
  dragHearing: 'Schreibt mit',

  dragEdit: 'Bearbeiten',
  dragDelete: 'Löschen',
  dragSave: 'Speichern',
  dragDiscard: 'Verwerfen',
  dragItemLabel: (noun, position) => `${noun} ${position}`,
  dragHandleLabel: (noun, position) => `${noun} ${position} ziehen`,
  dragShowActions: (noun, position) => `Aktionen für ${noun} ${position} anzeigen`,
  dragHideActions: (noun, position) => `Aktionen für ${noun} ${position} ausblenden`,

  dragDeleteItem: (noun, position) => `${noun} ${position} löschen`,
  dragSwipeArmed: 'Loslassen',

  dropCombine: (position) => `Mit ${position} zusammenführen`,
  dropBefore: (position) => `Vor ${position} einfügen`,
  dropAfter: (position) => `Nach ${position} einfügen`,
  dropCancel: 'Zum Abbrechen loslassen',

  dragLifted: (noun, position) =>
    `${noun} ${position} angehoben. Pfeiltasten verschieben, M führt zusammen, Escape bricht ab.`,
  dragDropped: (noun, position) => `${noun} ${position} abgelegt.`,
  dragCancelled: 'Verschieben abgebrochen.',
  dragMoved: (noun, position) => `${noun} auf Position ${position} verschoben.`,
  dragMerged: (noun, position) => `Mit ${noun} ${position} zusammengeführt.`,
  dragDeleted: (noun, position) => `${noun} ${position} gelöscht.`,
};

/** English. */
export const musyTextEn: MusyTextCatalogue = {
  statusInfo: 'Note',
  statusWarning: 'Warning',
  statusSuccess: 'Success',
  statusError: 'Error',

  dismissMessage: 'Dismiss message',
  close: 'Close',

  loading: 'Loading',
  listEmpty: 'No entries yet',
  optionsEmpty: 'No options available',

  wizardDisabled: 'locked',
  wizardActive: 'available',
  wizardSelected: 'current',
  wizardCompleted: 'done',
  wizardSkipped: 'skipped',

  carouselPrevious: 'Previous step',
  carouselNext: 'Next step',
  carouselSlide: (position, total, title) => `Step ${position} of ${total}: ${title}`,
  carouselGoTo: (position, total) => `Go to step ${position} of ${total}`,

  playerPlay: 'Play',
  playerPause: 'Pause',
  playerRestart: 'Play again',
  playerSeek: 'Playback position',

  trackPlay: 'Start Listening',
  trackPause: 'Pause',
  trackRestart: 'Replay',

  recordReady: 'Record Now',
  recordRecording: 'Recording',
  recordStatus: (elapsed, remaining) => `Recording, ${elapsed} in, ${remaining} left`,

  voiceIdleText: 'Answer out loud — you can delete it and start again.',
  voiceRecord: 'Record answer',
  voiceStop: 'Stop recording',
  voicePlay: 'Play answer',
  voicePause: 'Pause answer',
  voiceDelete: 'Delete answer',
  voiceRecording: 'Recording',

  uploadZoneText: 'Drag a photo here, or choose one from your device.',
  uploadChoose: 'Choose photo',
  uploadReplace: 'Replace',
  uploadRemove: 'Remove photo',

  dragListLabel: 'Transcript',
  dragItemNoun: 'statement',
  dragEmptyHeadline: 'Nothing captured yet',
  dragEmptyText:
    'Finished statements will appear here, one box each, in the order you said them.',
  dragListening: 'Listening',
  dragHearing: 'Hearing you',

  dragEdit: 'Edit',
  dragDelete: 'Delete',
  dragSave: 'Save',
  dragDiscard: 'Discard',
  dragItemLabel: (noun, position) => `${noun} ${position}`,
  dragHandleLabel: (noun, position) => `Drag ${noun} ${position}`,
  dragShowActions: (noun, position) => `Show actions for ${noun} ${position}`,
  dragHideActions: (noun, position) => `Hide actions for ${noun} ${position}`,

  dragDeleteItem: (noun, position) => `Delete ${noun} ${position}`,
  dragSwipeArmed: 'Let go',

  dropCombine: (position) => `Merge into ${position}`,
  dropBefore: (position) => `Insert before ${position}`,
  dropAfter: (position) => `Insert after ${position}`,
  dropCancel: 'Release to cancel',

  dragLifted: (noun, position) =>
    `${noun} ${position} lifted. Arrows to move, M to merge, Escape to cancel.`,
  dragDropped: (noun, position) => `${noun} ${position} dropped.`,
  dragCancelled: 'Move cancelled.',
  dragMoved: (noun, position) => `${noun} moved to position ${position}.`,
  dragMerged: (noun, position) => `Merged into ${noun} ${position}.`,
  dragDeleted: (noun, position) => `${noun} ${position} deleted.`,
};

/** The four status-word keys, so a component can map a variant onto one and
 *  still get a `string` back rather than the whole catalogue's union. */
export type MusyStatusKey = 'statusInfo' | 'statusWarning' | 'statusSuccess' | 'statusError';

export const MUSY_TEXT: Record<MusyLocale, MusyTextCatalogue> = {
  de: musyTextDe,
  en: musyTextEn,
};

/** German. See "AND IT DEFAULTS TO GERMAN" in this file's header. */
export const DEFAULT_MUSY_LOCALE: MusyLocale = 'de';

const MusyLocaleContext = React.createContext<MusyLocale>(DEFAULT_MUSY_LOCALE);

export interface MusyLocaleProviderProps {
  /** The active locale. Drive it from whatever the app already resolved. */
  locale: MusyLocale;
  children: React.ReactNode;
}

/**
 * Mount ONCE near the app root, beside <MusyTooltipProvider>, and feed it the
 * app's own locale. Switching it re-renders every component that reads a
 * default — which is the whole reason this is a provider and not a setter.
 */
export function MusyLocaleProvider({ locale, children }: MusyLocaleProviderProps) {
  /* createElement, not JSX, so this stays a .ts file: it is a catalogue with
     one provider on the end, not a component module. */
  return React.createElement(MusyLocaleContext.Provider, { value: locale }, children);
}

/** The active locale. Rarely needed directly — prefer `useMusyText()`. */
export function useMusyLocale(): MusyLocale {
  return React.useContext(MusyLocaleContext);
}

/**
 * The catalogue for the active locale. What components read their defaults
 * through, ALWAYS behind the corresponding prop:
 *
 *   const t = useMusyText();
 *   const word = closeLabel ?? t.close;
 */
export function useMusyText(): MusyTextCatalogue {
  return MUSY_TEXT[React.useContext(MusyLocaleContext)];
}
