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

  /* ── Die Anmeldung · H.0b ────────────────────────────────────────────────
     'Anmelden' for both the heading and the button, and that repetition is
     correct rather than lazy: §3 wants a verb phrase on an action, German
     interfaces say 'Anmelden' for this act, and inventing a second word for
     the heading would make one screen use two names for one thing.

     'E-Mail-Adresse', hyphenated throughout — §8's rule for an English term
     joined to a German noun. Not 'Email', not 'E-Mail Adresse'.

     No 'Bitte' anywhere (§4), and the instructions are imperative singular:
     'Melde dich an', 'Prüfe beides', 'Trag … ein'. */
  'auth.title': 'Anmelden',
  'auth.intro': 'Musie ist noch im geschlossenen Test. Melde dich mit der E-Mail-Adresse und dem Passwort an, die du bekommen hast.',
  'auth.email': 'E-Mail-Adresse',
  'auth.password': 'Passwort',
  'auth.submit': 'Anmelden',
  /* Überschrift, also kein Punkt — §7. */
  'auth.failed': 'Das hat nicht funktioniert',
  'auth.error.missing': 'Trag deine E-Mail-Adresse und dein Passwort ein.',
  /* The third sentence names a person, deliberately and temporarily. In the
     closed beta there IS no password reset — no mail, so no reset link — and
     the credentials were handed over by Ben in the first place. So the only
     true next step after retyping is to ask him, and an error that stops at
     'try again' sends somebody round the same loop instead.

     IT COMES OUT AT H.1. The moment reset mail exists, the honest instruction
     is the reset link and not a name. */
  'auth.error.credentials': 'E-Mail-Adresse und Passwort passen nicht zu einem Konto. Prüfe beides und versuche es erneut. Wenn was nicht klappt, gib Ben Bescheid.',
  /* 'Wende dich an die Person …' rather than a passive: there is no inbox to
     point at, so the sentence points at somebody. */
  'auth.error.notConfirmed': 'Dieses Konto ist noch nicht bestätigt. Wende dich an die Person, die dir das Passwort gegeben hat.',
  'auth.error.rateLimit': 'Zu viele Versuche. Warte eine Minute und versuche es erneut.',
  'auth.error.unknown': 'Beim Anmelden ist etwas schiefgegangen. Versuche es gleich noch einmal.',

  /* ── Das Konto, in den Einstellungen · H.0b ──────────────────────────────
     'Konto', not 'Account': §8 keeps an English term only where German has no
     word people use, and 'Konto' is the word German interfaces use here. */
  'auth.account': 'Konto',
  'auth.signedInAs': 'Angemeldet als {email}',
  'auth.signOut': 'Abmelden',

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
     „Allein“, „Achtsame Pause“ and „Freie Bahn“ are quoted from the content
     tables rather than translated here, so the lightbox names the same things
     the screen behind it does. German quotation marks, per §7. */
  'notImplemented.title': 'Noch nicht umgesetzt',
  'notImplemented.text': 'Musie baut bisher nur den Weg „Allein“ aus, mit den Übungen Achtsame Pause und Freie Bahn.',
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
  /* 'Abgeschlossen', nicht 'Beendet' (Ben, 2026-09-23). 'Beendet' sagt nur,
     dass etwas aufgehört hat — das steht auch über einer abgebrochenen Runde.
     'Abgeschlossen' sagt, dass sie zu Ende gegangen ist, und genau das trägt
     das Badge jetzt in den Erfolgsfarben. Dasselbe Wort steht im Filter des
     Tagebuchs: ein Zustand, ein Name. */
  'session.status.finished': 'Abgeschlossen',
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
  'session.scan.readerNote': 'Oder nimm die Kamera dieses Geräts – sie liest denselben Code.',
  'session.scan.codeLabel': 'Kartencode',
  'session.scan.codePlaceholder': 'MC-01',
  /* Verbphrase, §3 — das Feld dahinter heißt schon 'Kartencode', die
     Schaltfläche sagt also, was sie tut, und nicht noch einmal, was kommt. */
  'session.scan.codeManual': 'Code von Hand eingeben',
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

  /* ── Die Kamera dieses Geräts · E.2/E.3 ──────────────────────────────────
     'Kamera-App', 'QR-Code', 'Code-Leser' — Durchkopplung throughout (§8), and
     it is also what gives the hyphenator the break points a compound this long
     would otherwise not have (§6).

     No 'leider' anywhere below, and no 'Bitte' (§4). The English says what
     happened and what to do instead; so does this. 'Tippe … ein' is the
     imperative singular the rest of the app uses (§1). */
  'session.scan.cameraStart': 'Kamera benutzen',
  /* 'noch mal', not 'noch einmal': the longer form put this at 1.40× the
     English and §5 asks for the rewrite before the wrap. */
  'session.scan.cameraRetry': 'Kamera noch mal versuchen',
  'session.scan.cameraStop': 'Kamera ausschalten',
  'session.scan.cameraStarting': 'Kamera wird geöffnet…',
  'session.scan.cameraLive': 'Halte den QR-Code deiner Karte in den Rahmen.',
  'session.scan.cameraLabel': 'Kamera, sucht nach einem QR-Code',
  'session.scan.cameraOther': 'Dieser QR-Code gehört nicht zu Musie. Der Code einer Karte sieht aus wie MC-01.',
  'session.scan.cameraDenied': 'Die Kamera bleibt aus. Tippe stattdessen den Code ein, der auf deiner Karte steht.',
  'session.scan.cameraMissing': 'Dieses Gerät hat keine Kamera, die Musie nutzen kann. Tippe stattdessen den Code von deiner Karte ein.',
  'session.scan.cameraBusy': 'Eine andere App benutzt die Kamera. Schließe sie und versuch es noch einmal, oder tippe den Code von deiner Karte ein.',
  'session.scan.cameraInsecure': 'Der Browser öffnet die Kamera nur über eine sichere Verbindung. Tippe stattdessen den Code von deiner Karte ein.',
  'session.scan.cameraUnsupported': 'Dieser Browser öffnet hier keine Kamera. Tippe stattdessen den Code von deiner Karte ein.',
  'session.scan.cameraDecoder': 'Der Code-Leser ließ sich nicht laden. Prüfe deine Verbindung und versuch es noch einmal, oder tippe den Code von deiner Karte ein.',
  'session.scan.cameraFailed': 'Die Kamera ließ sich nicht starten. Tippe stattdessen den Code von deiner Karte ein.',

  /* ── Listen · D.5b ─────────────────────────────────────────────────────── */
  /* 'Stück', which is what the seed's own German calls a recording — 'höre das
     Stück dahinter'. 'Track' would be an English word nobody chose. */
  'session.listen.track': 'Dein Stück',
  'session.listen.gateMet': 'Genug vom Stück liegt hinter dir. Hör so lange weiter, wie du magst, oder starte jetzt die Reflexion.',
  'session.listen.gateLocked': 'Hör so viel vom Stück, wie du möchtest – {gate} sind das Minimum für diese Übung, {left} fehlen noch.',
  'session.listen.start': 'Reflexion starten',
  /* ── Die drei Scroll-Ansichten · E.5b ───────────────────────────────────*/
  'session.listen.detailsAction': 'Trackdetails und Player',
  'session.listen.warnText': 'Für diese Übung ist es besser, dich nicht vom Namen des Tracks oder vom Cover beeinflussen zu lassen.',
  'session.listen.warnBack': 'Übung fortsetzen',
  'session.listen.warnOn': 'Details und Player zeigen',
  'session.listen.scrollUp': 'Nach oben',
  'session.listen.play': 'Abspielen',
  'session.listen.pause': 'Pause',
  'session.listen.restart': 'Noch einmal',
  'session.listen.seek': 'Position im Track',
  'session.listen.aboutHeading': 'Zu diesem Track',
  'session.listen.aboutArtist': 'Interpretin oder Interpret',
  'session.listen.aboutInstructions': 'Hinweise zum Hören',
  'session.listen.simulated': 'Es ist noch keine Aufnahme hinterlegt, deshalb läuft der Player auf einer Uhr in der echten Länge des Stücks.',
  'session.listen.noTrack': 'Für diese Übung gibt es noch keine Aufnahme.',

  /* ── Reflect · D.5c ────────────────────────────────────────────────────── */
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
  /* `reflect.voice.notSaved` und der Absatz darunter sind weg (2026-09-23):
     Seit F.6 wird Gesprochenes gespeichert, der Text war also falsch — und er
     stand als fünfzeiliger Kasten auf einem Schritt, der eine Antwort will.
     Geblieben ist `privacy.voiceShort`, eine Zeile, plus `privacy.more`. */
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
  /* Die Beschreibung der Übung steht jetzt als Zeile in der Liste statt als
     Fließtext unter der Überschrift. Das Label ist eine Frage, die der Wert
     beantwortet — wie die drei darunter. */
  'diary.about': 'Worum es geht',
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

  /* ── Die Timeline im Monatsmaßstab · G.1 ─────────────────────────────── */
  'diary.today': 'Heute',
  'diary.yesterday': 'Gestern',
  /* 'Anzeigen' labels the group of options rather than performing an act, so
     §3's verb-first rule does not bite here — the segments are the answers to
     it. 'Beendet' / 'Nicht beendet' come from session.status.*, unchanged. */
  'diary.filter.legend': 'Anzeigen',
  'diary.filter.all': 'Alle',
  /* Both headings are stated positively rather than as a count of nothing:
     'Keine unbeendeten Sessions' is the literal translation and is the kind of
     double negative German makes heavier than English does. 'Alles ist
     beendet' says the same fact and reads as the good news it is. */
  'diary.filter.noneFinished': 'Noch nichts beendet',
  'diary.filter.noneFinishedText': 'In deinem Tagebuch ist bisher keine Session beendet.',
  'diary.filter.noneAbandoned': 'Alles ist beendet',
  'diary.filter.noneAbandonedText': 'Was du angefangen hast, hast du auch beendet.',
  'diary.filter.showAll': 'Alle Sessions anzeigen',

  /* ── Das ganze Tagebuch löschen · G.2 ────────────────────────────────────
     'endgültig weg' carries the finality, the same word diary.delete.text
     uses, so the two confirmations sound like one product. The Gedankenstrich
     ' – ' rather than an em dash (§7), and 'Nichts bleibt übrig' rather than a
     second 'alles', which German would hear as a repetition. */
  'diary.deleteAll': 'Dein ganzes Tagebuch löschen',
  'diary.deleteAll.confirm': 'Dein ganzes Tagebuch löschen?',
  'diary.deleteAll.text': 'Damit sind alle Sessions und alles, was du darin geschrieben hast, endgültig weg – auch eine Session, die gerade läuft. Nichts bleibt übrig, und das lässt sich nicht rückgängig machen.',
  'diary.deleteAll.yes': 'Alles löschen',
  'diary.deleteAll.failed': 'Dein Tagebuch konnte nicht gelöscht werden',

  /* ── Privacy · C.2 ───────────────────────────────────────────────────────
     Written to docs/GERMAN-UI-WRITING.md: du, sentence case, no 'Bitte'.
     'E-Mail-Adresse' keeps its hyphens (Durchkopplung). See en.ts for what
     each sentence is claiming and why it is true. */
  'privacy.title': 'Was Musie speichert',
  /* Rewritten by H.0b — see the English block for why the old promise went
     false for a signed-in tester. 'Wenn … sonst …' rather than a relative
     clause: two short conditions read faster than one long qualification, and
     §5's length budget has no room for the long one. */
  'privacy.account': 'Musie fragt nie nach deinem Namen. Wenn du für den geschlossenen Test eine E-Mail-Adresse und ein Passwort bekommen hast, gehört dein Tagebuch zu diesem Konto. Sonst hat dieser Browser ein eigenes, privates Konto, und dein Tagebuch gehört dazu.',
  'privacy.written': 'Was du schreibst, kommt in dein Tagebuch, damit du es später nachlesen kannst. Niemand sonst sieht es.',
  /* Das Versprechen in einer Zeile, für den Reflexionsschritt. Keine Kürzung
     von `privacy.voice`, sondern die Hälfte davon, die ein Versprechen ist —
     wie es funktioniert, steht in der Lightbox. */
  'privacy.voiceShort': 'Musie behält den Text, nie deine Stimme.',
  /* Das Wort im Satz, das alles Weitere öffnet. Nicht 'Mehr erfahren': ein
     Link im Fließtext muss benennen, was hinter ihm liegt. */
  'privacy.more': 'Mehr zu deinen Daten',
  'privacy.voice': 'Wenn du laut antwortest, macht Musie aus deinen Worten Text und behält nur den Text. Die Aufnahme selbst wird nie gespeichert.',
  'privacy.photo': 'Ein Foto bleibt auf deinem Gerät. Musie lädt es nie hoch.',
  /* 'ist auch dein Tagebuch weg' rather than a softer 'geht verloren': the
     English is blunt on purpose and the German should not apologise for it. */
  /* The loss first, the exemption second, as in the English. 'Zurückholen
     lässt es sich nicht' is kept verbatim from the original German — it is the
     sentence that does the uncomfortable work, and it was already right. */
  'privacy.browserBound': 'Wenn dein Konto nur in diesem Browser liegt, löschst du mit seinen Daten auch dein Tagebuch, und zurückholen lässt es sich nicht. Wenn du angemeldet bist, bleibt dein Tagebuch bei deinem Konto, und du erreichst es auch von einem anderen Gerät.',

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
  'voice.undo.action': 'Rückgängig',
  'voice.undo.dismiss': 'Schließen',

  /* ── Voice · der Editor · F.4 ──────────────────────────────────
     Alle diese Strings hat §7.24 auch selbst, auf Deutsch, im Katalog des
     Pakets. Sie werden trotzdem übergeben: es sind die Worte DIESES
     Transkripts, nicht die der Komponente. Siehe en.ts. */
  'voice.item.noun': 'Aussage',
  'voice.empty.headline': 'Noch nichts aufgenommen',
  'voice.empty.text': 'Fertige Aussagen erscheinen hier, je eine Box, in der Reihenfolge, in der du sie gesagt hast.',
  'voice.listening': 'Hört zu',
  'voice.hearing': 'Schreibt mit',
  /* Verbphrasen, §3: was das Loslassen TÄTE, nicht was gerade passiert. */
  'voice.drop.combine': 'Mit {position} verbinden',
  'voice.drop.before': 'Über {position} schieben',
  'voice.drop.after': 'Unter {position} schieben',
  'voice.drop.cancel': 'Loslassen, dann bleibt alles, wie es war',
  'voice.record.more': 'Mehr aufnehmen',
  /* Auslassungspunkte als ein Zeichen, §7. */
  'voice.record.connecting': 'Verbindet…',
  'voice.hint.first': 'Jede Pause beendet eine Aussage. Die Aufnahme stoppt von selbst nach {seconds} Sekunden oder nach {silence} Sekunden Stille.',
  'voice.hint.more': 'Neue Aussagen kommen ans Ende der Liste. Die Aufnahme stoppt von selbst nach {seconds} Sekunden oder nach {silence} Sekunden Stille.',
  /* 'Ziehpunkt' für den Griff: kein Nomenstapel (§6), und es ist das Wort,
     das auch die Komponente im Deutschen benutzt. */
  /* Die Tipps werden jetzt aufgerufen, sie stehen nicht mehr da.
     `voice.hint.edit` ist unverändert der Text im Kasten; die drei davor sind
     die Schaltfläche, die Überschrift und das Schließen. Die Überschrift
     benennt das Thema, statt die Schaltfläche zu wiederholen. */
  'voice.hint.editToggle': 'Tipps zum Bearbeiten',
  'voice.hint.editHeadline': 'Aussagen verschieben und verbinden',
  'voice.hint.editHide': 'Tipps ausblenden',
  'voice.hint.edit': 'Zieh eine Aussage, um sie zu verschieben, oder lass sie auf einer anderen los, um beide zu verbinden. Mit der Tastatur: Ziehpunkt fokussieren, dann Leertaste zum Anheben, Pfeiltasten zum Verschieben, M verbindet sie mit der darüber, Escape legt sie zurück.',
  /* Überschriften ohne Punkt, Sätze mit. */
  'voice.stopped.headline': 'Aufnahme beendet',
  'voice.stopped.timeout': 'Das waren die {seconds} Sekunden. Alles, was Musie gehört hat, steht in der Liste, und du kannst mehr aufnehmen.',
  'voice.stopped.silence': 'Es war {silence} Sekunden still, darum hat Musie aufgehört zuzuhören. Alles Gehörte steht in der Liste.',
  'voice.error.headline': 'Aufnahme beendet',
  'voice.warning.headline': 'Eine Aussage wurde übersprungen',

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
