/**
 * German copy.
 *
 * Typed as `Messages`, so a key missing from here is a type error, not a
 * runtime hole. There is no per-key fallback to English on purpose: a half
 * translated screen is harder to spot than a build that refuses to pass.
 *
 * WRITTEN BY THE IMPLEMENTER, NOT SUPPLIED, and read back on 19 September
 * against docs/GERMAN-UI-WRITING.md — du, sentence case, verb-first actions,
 * no 'Bitte', the length budget, and German dashes. That standard is the
 * thing to argue with; a string that breaks it is a bug. A native read before
 * launch is still wanted: the standard catches what a rule can catch.
 *
 * This is the app's own chrome, which is OURS and permanent. The CONTENT
 * tables are the other case: their German is now real German, written to the
 * same standard, but PROVISIONAL — the Mindfulness Cards spreadsheet owns
 * that copy and will overwrite it. See the seed migration's header.
 *
 * Note for later: German runs ~30% longer than English, which is what
 * `--measure-body` (62ch) and `--text-hyphens: auto` are set from. Layer 1's
 * measures were derived from the German string, so German is the case that
 * fits by design and English is the one with room to spare. The hyphenation
 * only works while <html lang> tracks the locale, which LocaleProvider does.
 */
import type { Messages } from './en';

export const de: Messages = {
  /* ── Shell ─────────────────────────────────────────────────────────────── */
  'shell.skipLink': 'Zum Hauptinhalt springen',
  'shell.menuLabel': 'Menü öffnen',
  'shell.profileLabel': 'Profil und Einstellungen öffnen',

  /* ── Shared across overlays ────────────────────────────────────────────── */
  'common.closeLabel': 'Schließen',

  /* ── Nav drawer ────────────────────────────────────────────────────────── */
  'menu.title': 'Menü',
  'menu.pagesLabel': 'Seiten',
  'menu.closeLabel': 'Menü schließen',
  'menu.startSession': 'Sitzung starten',
  'menu.continueSession': 'Sitzung fortsetzen',
  'menu.yourDiary': 'Dein Tagebuch',
  'menu.aboutYou': 'Über dich',
  'menu.howItWorks': 'Wie Musie funktioniert',

  /* ── Settings sheet ────────────────────────────────────────────────────── */
  'settings.darkMode': 'Dunkelmodus',
  'settings.userType': 'Hier als',
  'settings.language': 'Sprache',
  /* Provisional, not placeholder: the content IS German now, but the
     Mindfulness Cards spreadsheet still owns it and will replace it. */
  'settings.languageHint': 'Die Übersetzungen der Inhalte sind vorläufig.',

  /* ── Loading, failure, emptiness ───────────────────────────────────────── */
  'content.loading': 'Wird geladen…',
  'content.error': 'Dieser Inhalt konnte nicht geladen werden',
  'content.errorDetail': 'Prüfe deine Verbindung und versuche es erneut.',
  'content.empty': 'Hier ist noch nichts.',

  /* ── Exercises ───────────────────────────────────────────────────────────── */
  /* An en dash, as in English: German uses the same range notation. */
  'exercises.timeframe': '{min}–{max} Minuten',
  'exercises.notImplemented': 'Noch nicht verfügbar',

  /* ── The session ─────────────────────────────────────────────────────────
     Noun forms, not imperatives: these name the steps in a rail, they do not
     ask for an action. §3's verb-first rule is about buttons. */
  'session.step.intro': 'Einstieg',
  'session.step.scan': 'Scannen',
  'session.step.listen': 'Hören',
  'session.step.reflect': 'Nachdenken',
  'session.status.finished': 'Beendet',
  /* 'Nicht beendet', not 'Abgebrochen': the session was left, and the diary
     records that without judging it. */
  'session.status.abandoned': 'Nicht beendet',

  /* ── Diary ─────────────────────────────────────────────────────────────── */
  'diary.timelineLabel': 'Deine Sitzungen, neueste zuerst',
  'diary.listLabel': 'Tagebucheinträge',
  'diary.empty': 'Noch keine Sitzungen',
  'diary.emptyText': 'Beende eine Sitzung, dann erscheint sie hier.',
  'diary.stoppedAt': 'Aufgehört bei {step}',
  /* 'Min.' with the point: the abbreviation DIN 1301 uses, and it keeps the
     row inside the measure where 'Minuten' would not. */
  'diary.duration': '{minutes} Min.',
  'diary.when': 'Wann',
  /* 'Dauer', not 'Wie lange': a label in a facts list is a noun in German
     where English gets away with a question. */
  'diary.howLong': 'Dauer',
  'diary.card': 'Karte',
  'diary.listenAgain': 'Nochmal hören',
  'diary.yourAnswer': 'Deine Antwort',
  'diary.notFound': 'Diesen Tagebucheintrag gibt es nicht',

  /* ── Privacy · C.2 ───────────────────────────────────────────────────────
     Written to docs/GERMAN-UI-WRITING.md: du, sentence case, no 'Bitte'.
     'E-Mail-Adresse' keeps its hyphens (Durchkopplung). See en.ts for what
     each sentence is claiming and why it is true. */
  'privacy.title': 'Was Musie speichert',
  'privacy.account': 'Musie fragt nie nach deinem Namen oder deiner E-Mail-Adresse. Dieser Browser hat ein eigenes, privates Konto, und dein Tagebuch gehört dazu.',
  'privacy.written': 'Was du schreibst, kommt in dein Tagebuch, damit du es später nachlesen kannst. Niemand sonst sieht es.',
  'privacy.voice': 'Wenn du laut antwortest, macht Musie aus deinen Worten Text und behält nur den Text. Die Aufnahme selbst wird nie gespeichert.',
  'privacy.photo': 'Ein Foto bleibt auf deinem Gerät. Musie lädt es nie hoch.',
  /* 'ist auch dein Tagebuch weg' rather than a softer 'geht verloren': the
     English is blunt on purpose and the German should not apologise for it. */
  'privacy.browserBound': 'Weil das Konto in diesem Browser liegt, löschst du mit seinen Daten auch dein Tagebuch. Zurückholen lässt es sich nicht.',

  /* ── Route titles · PLACEHOLDER SCAFFOLDING ────────────────────────────── */
  'route.aboutMusie.title': 'Über Musie',
  'route.aboutYou.title': 'Über dich',
  'route.diary.title': 'Dein Tagebuch',
  'route.diaryEntry.title': 'Tagebucheintrag',
  'route.exercises.title': 'Übungen',
  /* A Gedankenstrich: German sets a parenthetical dash as an EN dash with
     spaces, where English sets an em dash. The English key keeps its '—'. */
  'route.session.title': 'Aktuelle Sitzung – {step}',
  'route.done.title': 'Fertig',
  'route.settings.title': 'Einstellungen',
  'route.notFound.title': 'Nicht gefunden',
};
