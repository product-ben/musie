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
  'shell.menuLabel': 'Menü öffnen',
  'shell.profileLabel': 'Profil und Einstellungen öffnen',

  /* ── Shared across overlays ────────────────────────────────────────────── */
  'common.closeLabel': 'Schließen',

  /* ── Shared across the flow ──────────────────────────────────────────────
     'Weiter', not 'Fortfahren': §3 wants a verb phrase, and 'Weiter' is the
     word German interfaces actually use on a forward button. */
  'common.back': 'Zurück',
  'common.continue': 'Weiter',
  'common.cancel': 'Abbrechen',

  /* ── Nav drawer ────────────────────────────────────────────────────────── */
  'menu.title': 'Menü',
  'menu.pagesLabel': 'Seiten',
  'menu.closeLabel': 'Menü schließen',
  'menu.startSession': 'Session starten',
  'menu.continueSession': 'Session fortsetzen',
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

  /* ── About Musie · D.1 ───────────────────────────────────────────────────
     'Hallo', not 'Hi': the English is a greeting in a chat bubble and German
     writes that as 'Hallo'. 'Hi' exists in German but reads as imported.
     The pitch line carries a Gedankenstrich where the English runs on — the
     German sentence needs the break to stay readable at 62ch. */
  'about.greeting': 'Hallo, ich bin Musie.',
  'about.pitch': 'Ich helfe dir, achtsamer, bewusster, verbundener und sicherer zu fühlen und zu handeln – mit der Kraft der Musik',
  /* The German chat convention is the bare verb: 'Musie schreibt …'. */
  'about.typing': 'Musie schreibt',
  'about.carouselHeadline': 'Wie wir mit Musik spielen',
  'about.carouselLabel': 'Wie eine Session abläuft',
  'about.slide.situation': 'Du hilfst mir, deine Situation zu verstehen',
  'about.slide.recommend': 'Ich empfehle dir musikbasierte Methoden für deinen Kontext',
  'about.slide.listen': 'Kuratierte Musik und Anleitungen lösen etwas in dir aus',
  'about.slide.reflect': 'Ich führe dich durch eine Reflexion',
  'about.slide.share': 'Wenn du magst, helfe ich dir, deine Gedanken zu teilen',
  'about.previousSlide': 'Vorheriger Schritt',
  'about.nextSlide': 'Nächster Schritt',
  'about.slideLabel': 'Schritt {position} von {total}: {title}',
  'about.dotLabel': 'Schritt {position}',
  'about.goToSlide': 'Zu Schritt {position} von {total}',
  'about.hint.unseen': 'Sieh dir an, wie eine Session abläuft, bevor du startest.',
  'about.hint.next': 'Als Nächstes frage ich dich, als wer du hier bist.',
  /* 'Es kann losgehen.' rather than a literal 'Bereit, wenn du es bist.' —
     the English is an idiom and the German has its own. */
  'about.hint.ready': 'Es kann losgehen.',

  /* ── About you · D.2 ───────────────────────────────────────────────────── */
  'aboutYou.headline': 'Und als wer bist du hier?',
  'aboutYou.text': 'Damit grenze ich ein, welche Übungen ich dir anbiete. Du kannst das hier jederzeit ändern.',
  'aboutYou.legend': 'Als wer bist du hier?',
  'aboutYou.hint.pick': 'Wähl eine Option, um weiterzugehen.',
  'aboutYou.hint.ready': 'Es kann losgehen.',

  /* ── Not implemented · D.2 ───────────────────────────────────────────────
     „Allein“ and 'Kurze Achtsamkeitspause' are quoted from the content tables
     rather than translated here, so the lightbox names the same two things the
     screen behind it does. German quotation marks, per §7. */
  'notImplemented.title': 'Noch nicht umgesetzt',
  'notImplemented.text': 'Musie baut bisher nur den Weg „Allein“ aus, mit der Übung Kurze Achtsamkeitspause.',
  'notImplemented.back': 'Zurück zur Auswahl',

  /* ── Exercises ───────────────────────────────────────────────────────────── */
  /* An en dash, as in English: German uses the same range notation. */
  'exercises.timeframe': '{min}–{max} Minuten',
  'exercises.notImplemented': 'Noch nicht verfügbar',
  'exercises.headline': 'Womit möchtest du jetzt anfangen?',
  'exercises.legend': 'Übung wählen',
  'exercises.legend.time': 'Dauer',
  /* 'Kartenset', one word: it is a compound with a dictionary break point, so
     --text-hyphens: auto handles it and there is nothing to rephrase. */
  'exercises.legend.cards': 'Kartenset',
  'exercises.legend.sound': 'Ton',
  'exercises.fact.time': 'Dauert {min} bis {max} Minuten',
  'exercises.fact.timeShort': '{min}–{max} Min.',
  /* Durchkopplung, as everywhere else this product name meets a German noun. */
  'exercises.fact.cards': 'Braucht dein Mindfulness-Cards-Set',
  'exercises.fact.sound': 'Ton an – Kopfhörer empfohlen',
  'exercises.surpriseMe': 'Musie eine Übung aussuchen lassen',
  'exercises.detail.needs': 'Du brauchst',
  'exercises.detail.duration': 'Dauer',
  'exercises.start': 'Übung starten',
  'exercises.alreadyRunning': 'Es läuft schon eine Session',
  'exercises.alreadyRunningDetail': 'Beende oder schließe die laufende Session, bevor du eine neue startest.',
  'exercises.goToSession': 'Zu dieser Session',

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

  /* ── The session screen · D.4 ─────────────────────────────────────────── */
  'session.wizardLabel': 'Schritte der Session',
  'session.notFound': 'Diese Session gibt es nicht',
  'session.notFoundText': 'Vielleicht wurde sie gelöscht, oder sie gehört zu einem anderen Browser.',
  /* Two spellings on purpose: the panel's control names its object ('Diese
     Session'), the dialog's confirm does not need to repeat it. */
  'session.close': 'Diese Session schließen',
  'session.close.title': 'Session schließen?',
  /* Gedankenstrich, not an em dash (§7). 'wie es dir gerade geht' rather than
     a literal 'dem Zustand, in dem du bist' — the English is plain and the
     German should not reach for a register the app does not use anywhere
     else. */
  'session.close.text': 'Du kannst sie später nicht wieder aufnehmen – die Übung arbeitet damit, wie es dir gerade geht, und das ist beim nächsten Mal anders. Sie bleibt als nicht beendet in deinem Tagebuch, und du kannst jederzeit eine neue Session starten.',
  'session.close.confirm': 'Session schließen',

  /* ── Intro · D.5a ──────────────────────────────────────────────────────── */
  'session.intro.fallback': 'Nimm dir einen Moment zum Ankommen. Wenn du so weit bist, geht es weiter.',

  /* ── Scan · D.5a, und der echte Scanner · E.0/E.1 ──────────────────────── */
  'session.scan.headline': 'Scanne die Karte, die am besten beschreibt, wie du dich gerade fühlst.',
  /* 'QR-Code' with the hyphen — Durchkopplung again, and it is the spelling
     Duden gives. 'Kamera-App' the same way. A Gedankenstrich, not an em dash
     (§7); the English key keeps its '—'. */
  'session.scan.reader': 'Scanne den QR-Code auf deiner Karte mit der Kamera-App deines Handys – sie öffnet Musie direkt bei dieser Karte.',
  'session.scan.readerNote': 'Musie kann die Kamera noch nicht selbst öffnen.',
  'session.scan.codeLabel': 'Kartencode',
  'session.scan.codePlaceholder': 'MC-01',
  'session.scan.codeHint': 'Der Code steht neben dem QR-Code auf der Karte, zum Beispiel MC-01.',
  /* A verb phrase, not 'Diese Karte' (§3) — the button performs an act. */
  'session.scan.codeSubmit': 'Diese Karte nehmen',
  'session.scan.codeMalformed': 'Ein Kartencode sieht aus wie MC-01. Schau noch einmal auf deine Karte.',
  /* 'Set', not 'Deck': §8 keeps the deck's own name — 'Mindfulness-Cards-Set'
     is how GERMAN-UI-WRITING.md writes it — and 'Kartenspiel' would be a game
     of cards. */
  'session.scan.codeUnknown': 'Keine Karte in diesem Set hat den Code {code}.',
  'session.scan.codeFailed': 'Das ließ sich gerade nicht prüfen. Versuch es gleich noch einmal.',
  'session.scan.heldHint': 'Das ist die Karte, die du gescannt hast. Nimm sie, oder tippe einen anderen Code ein.',
  'session.scan.done': 'Karte gescannt',
  'session.scan.yourCard': 'Deine Karte',
  'session.scan.again': 'Andere Karte scannen',

  /* ── Listen · D.5b ─────────────────────────────────────────────────────── */
  /* 'Stück', which is what the seed's own German calls a recording — 'höre das
     Stück dahinter'. 'Track' would be an English word nobody chose. */
  'session.listen.track': 'Dein Stück',
  'session.listen.gateMet': 'Genug vom Stück liegt hinter dir. Hör so lange weiter, wie du magst, oder starte jetzt die Reflexion.',
  'session.listen.gateLocked': 'Hör so viel vom Stück, wie du möchtest – {gate} sind das Minimum für diese Übung, {left} fehlen noch.',
  'session.listen.start': 'Reflexion starten',
  'session.listen.simulated': 'Es ist noch keine Aufnahme hinterlegt, deshalb läuft der Player auf einer Uhr in der echten Länge des Stücks.',
  'session.listen.noTrack': 'Für diese Übung gibt es noch keine Aufnahme.',

  /* ── Reflect · D.5c ────────────────────────────────────────────────────── */
  'reflect.questionFallback': 'Was ist bei dir geblieben?',
  'reflect.legend': 'Wie möchtest du antworten?',
  /* ONE WORD EACH, where the English takes two. A segment ellipses at one line
     and German runs ~30% longer, so the English pattern ('Record audio') would
     clip before the glyph did. The field below each one carries the long
     version as its own label. */
  'reflect.mode.voice': 'Aufnehmen',
  'reflect.mode.text': 'Schreiben',
  'reflect.mode.photo': 'Fotografieren',
  'reflect.text.label': 'Deine geschriebene Antwort',
  'reflect.text.placeholder': 'Ein Satz reicht.',
  'reflect.voice.label': 'Deine gesprochene Antwort',
  'reflect.voice.record': 'Antwort aufnehmen',
  /* 'Aufnahme läuft' is the package catalogue's own German for this state, and
     it is kept rather than shortened so the app and the component say the same
     thing. Component gap §3 records that this is the string most likely to
     reach the readout's overflow cliff in a 310px column — measured in D's
     verification pass, and it clears. */
  'reflect.voice.recording': 'Aufnahme läuft',
  'reflect.voice.status': 'Aufnahme, {elapsed} aufgenommen, {remaining} verbleibend',
  'reflect.photo.label': 'Foto deiner handschriftlichen Notizen',
  'reflect.photo.zone': 'Zieh ein Foto hierher oder wähle eines von deinem Gerät.',
  'reflect.photo.choose': 'Foto wählen',
  'reflect.photo.replace': 'Ersetzen',
  'reflect.photo.remove': 'Foto entfernen',
  'reflect.photo.previewAlt': 'Das Foto deiner handschriftlichen Notizen',
  'reflect.voice.notBuilt': 'Aufnehmen ist noch nicht gebaut',
  'reflect.voice.notBuiltText': 'Das zeigt, wie es funktionieren wird. Aus deinen Worten wird Text, und nur der Text bleibt – die Aufnahme selbst wird nie gespeichert.',
  'reflect.photo.notBuilt': 'Fotos auslesen ist noch nicht gebaut',
  'reflect.photo.notBuiltText': 'Das zeigt, wie es funktionieren wird. Das Foto bleibt auf deinem Gerät und wird als Text ausgelesen; das Bild wird nie hochgeladen.',
  /* Verb phrase, §3 — 'Überspringen' alone would name a thing rather than an
     action, and the object is what makes it unambiguous beside 'Beenden'. */
  'reflect.skip': 'Reflexion überspringen',
  'reflect.finish': 'Session beenden',

  /* ── Diary ─────────────────────────────────────────────────────────────── */
  /* 'Deine letzte Session' — 'letzte' is the one German would use here and
     carries no finality in this frame; 'jüngste' would read as a register
     nobody speaks. */
  'diary.latest': 'Deine letzte Session',
  'diary.openEntry': 'Eintrag öffnen',
  'diary.earlier': 'Früher',
  'diary.timelineLabel': 'Deine Sessions, neueste zuerst',
  'diary.listLabel': 'Tagebucheinträge',
  'diary.empty': 'Noch keine Sessions',
  'diary.emptyText': 'Beende eine Session, dann erscheint sie hier.',
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
  /* 'endgültig' carries the weight the English gets from 'cannot be undone'
     without a second clause; §5's length budget is tight in a dialog. */
  'diary.collapse': 'Diesen Eintrag schließen',
  'diary.delete': 'Diese Session löschen',
  'diary.delete.confirm': 'Session löschen?',
  'diary.delete.text': 'Damit sind die Session und alles, was du darin geschrieben hast, endgültig weg. Das lässt sich nicht rückgängig machen.',
  'diary.delete.yes': 'Löschen',

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

  /* ── Der Deep Link und das Dev-Blatt · E.0 ───────────────────────────────
     'Kartenset' rather than 'Deck' throughout, as on the scan step above. The
     headline carries no full stop, the sentence under it does (§7). */
  'scan.route.title': 'Gescannte Karte',
  'scan.working': 'Die Karte wird gesucht…',
  'scan.malformed.title': 'Das ist kein Kartencode',
  'scan.malformed.text': 'Der Code in diesem Link gehört nicht zu Musie. Ein Kartencode sieht aus wie MC-01.',
  'scan.unknown.title': 'Keine Karte mit diesem Code',
  'scan.unknown.text': 'Den Code {code} gibt es in diesem Set nicht.',
  'scan.noSession.title': 'Du hast {code} gescannt',
  'scan.noSession.text': 'Es läuft noch nichts. Wähle eine Übung, dann wartet diese Karte beim Scannen auf dich.',
  'scan.chooseExercise': 'Übung wählen',
  'scan.cardless.title': 'Diese Übung zieht keine Karten',
  'scan.cardless.text': 'Die Session, in der du bist, arbeitet ohne das Kartenset – diese Karte hat dort keinen Platz.',
  'scan.cardless.action': 'Zurück zur Session',

  /* ── Das Dev-Blatt mit den QR-Codes · E.0 ────────────────────────────────
     'Generator-Skript' with the hyphen (Durchkopplung, §8). */
  'scan.dev.title': 'QR-Codes für das Kartenset',
  'scan.dev.text': 'Erzeugt aus {origin}: Jeder Code zeigt auf den Server zurück, der diese Seite ausgeliefert hat. Für den Druck nimmst du dieselben Codes aus dem Generator-Skript, mit der echten Adresse.',
  'scan.dev.qrLabel': 'QR-Code für Karte {code}',
  /* ── Voice ───────────────────────────────────────────────────────────────
     Siehe en.ts für den Grund, warum diese Sätze hier stehen und nicht im
     Feature-Paket. */
  'voice.error.micDenied': 'Musie braucht dein Mikrofon, um dich zu hören. Erlaube es in den Browser-Einstellungen und starte neu.',
  'voice.error.micNotFound': 'Dieses Gerät hat kein Mikrofon, das Musie nutzen kann. Schreibe deine Antwort stattdessen.',
  'voice.error.micUnavailable': 'Das Mikrofon ließ sich nicht öffnen. Schließe, was es sonst noch benutzt, und starte neu.',
  'voice.error.recorderFailed': 'Die Aufnahme ließ sich auf diesem Gerät nicht starten. Schreibe deine Antwort stattdessen.',
  'voice.error.connectionFailed': 'Musie erreicht den Dienst nicht, der deine Worte in Text verwandelt. Prüfe deine Verbindung und starte neu.',
  /* 'bleibt erhalten', nicht 'ist gespeichert': gespeichert wird erst am Ende
     der Session, und ein Versprechen, das die App hier nicht halten kann,
     wäre schlimmer als die abgebrochene Verbindung. */
  'voice.error.connectionClosed': 'Die Verbindung ist abgebrochen. Alles, was Musie schon gehört hat, bleibt erhalten.',
  /* Gedankenstrich: im Deutschen der Halbgeviertstrich mit Leerzeichen, wo
     das Englische den Geviertstrich setzt. */
  'voice.error.connectionRejected': 'Musie kann gerade nicht zuhören. Das liegt an uns, nicht an dir – schreibe deine Antwort oder versuche es später.',
  'voice.error.segmentationRejected': 'Musie konnte die Aufnahme nicht einrichten. Das liegt an uns, nicht an dir – schreibe deine Antwort oder versuche es später.',
  'voice.error.noCredits': 'Musie kann Worte gerade nicht in Text verwandeln. Das liegt an uns, nicht an dir – schreibe deine Antwort stattdessen.',
  'voice.error.providerError': 'Beim Zuhören ist etwas schiefgegangen. Schreibe deine Antwort oder versuche es noch einmal.',
  'voice.warning.rateLimited': 'Ein Satz ließ sich nicht in Text verwandeln. Sag ihn noch einmal und mach weiter.',
  'voice.undo.combined': 'Aussagen zusammengeführt',
  'voice.undo.deleted': 'Aussage gelöscht',

  /* ── Route titles · PLACEHOLDER SCAFFOLDING ────────────────────────────── */
  'route.aboutMusie.title': 'Über Musie',
  'route.aboutYou.title': 'Über dich',
  'route.diary.title': 'Dein Tagebuch',
  'route.diaryEntry.title': 'Tagebucheintrag',
  'route.exercises.title': 'Übungen',
  /* A Gedankenstrich: German sets a parenthetical dash as an EN dash with
     spaces, where English sets an em dash. The English key keeps its '—'. */
  'route.session.title': 'Aktuelle Session – {step}',
  'route.settings.title': 'Einstellungen',
  'route.notFound.title': 'Nicht gefunden',
};
