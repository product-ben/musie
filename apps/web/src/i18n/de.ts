/**
 * German copy.
 *
 * Typed as `Messages`, so a key missing from here is a type error, not a
 * runtime hole. There is no per-key fallback to English on purpose: a half
 * translated screen is harder to spot than a build that refuses to pass.
 *
 * WRITTEN BY THE IMPLEMENTER, NOT SUPPLIED — needs a native read before any
 * of it ships. This is the app's own chrome, which is ours to write; the
 * CONTENT tables are the opposite case and carry '[DE] ' placeholders because
 * that copy belongs to the Mindfulness Cards spreadsheet.
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
  'settings.languageHint': 'Die Übersetzungen der Inhalte sind noch Platzhalter.',

  /* ── Loading, failure, emptiness ───────────────────────────────────────── */
  'content.loading': 'Wird geladen…',
  'content.error': 'Dieser Inhalt konnte nicht geladen werden',
  'content.errorDetail': 'Prüfe deine Verbindung und versuche es erneut.',
  'content.empty': 'Hier ist noch nichts.',

  /* ── Exercises ───────────────────────────────────────────────────────────── */
  /* An en dash, as in English: German uses the same range notation. */
  'exercises.timeframe': '{min}–{max} Minuten',
  'exercises.notImplemented': 'Noch nicht verfügbar',

  /* ── Route titles · PLACEHOLDER SCAFFOLDING ────────────────────────────── */
  'route.landing.title': 'Über Musie',
  'route.about.title': 'Über dich',
  'route.diary.title': 'Dein Tagebuch',
  'route.exercises.title': 'Übungen',
  'route.session.title': 'Aktuelle Sitzung — {step}',
  'route.done.title': 'Fertig',
  'route.settings.title': 'Einstellungen',
  'route.notFound.title': 'Nicht gefunden',
};
