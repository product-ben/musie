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

  /* ── Das Konto, im Menü · H.0b ───────────────────────────────────────────
     'Konto', not 'Account': §8 keeps an English term only where German has no
     word people use, and 'Konto' is the word German interfaces use here. */
  'auth.account': 'Konto',
  'auth.signedInAs': 'Angemeldet als {email}',
  'auth.signOut': 'Abmelden',

  /* ── Die Landingpage zur geschlossenen Beta · /beta ───────────────────────
     Musies Stimme, erste Person Singular — dieselbe wie in `about.*`:
     'ich schreibe dir', nicht 'wir melden uns'. Die Seite beginnt mit 'Hallo,
     ich bin Musie.', und ein Satz später auf ein 'wir' zu wechseln wäre eine
     zweite Stimme, die niemand angekündigt hat.

     Die Optionen des Radios sind die AUSNAHME und stehen in der Stimme der
     lesenden Person — sie antwortet damit auf eine Frage, genau wie bei den
     Nutzungsarten (`aboutYou.*`). §1 des Standards nennt diesen Fall.

     'E-Mail-Adresse' durchgehend mit Bindestrichen (§8), wie bei `auth.email`.
     Kein 'Bitte' (§4), Fehlermeldungen im Imperativ Singular.

     'Geschlossene Beta', nicht 'Closed Beta': §8 behält einen englischen
     Begriff nur, wo das Deutsche kein benutztes Wort hat, und 'geschlossener
     Test' steht schon in `auth.intro`. 'Beta' selbst bleibt — das Wort benutzt
     auch das Deutsche so. */
  'beta.route.title': 'Geschlossene Beta',
  /* Je das Verb der Zeile aus `about.slide.*`, über der der Begriff steht:
     wählen, geführt werden, Überblick behalten. */
  'beta.how.choose': 'Wählen',
  'beta.how.guide': 'Geführt werden',
  'beta.how.diary': 'Überblick behalten',
  'beta.headline': 'Für die geschlossene Beta anmelden',
  'beta.intro': 'Musie wird erst mit einer kleinen Gruppe getestet. Lass mir deinen Vornamen und deine E-Mail-Adresse da, und ich schreibe dir, sobald ein Platz frei ist.',
  'beta.firstName': 'Vorname',
  'beta.email': 'E-Mail-Adresse',
  'beta.reason.legend': 'Wie hast du von Musie erfahren?',
  /* 'Über', nicht 'Via': das deutsche Wort für genau diese Angabe. */
  'beta.reason.ben': 'Über Ben',
  'beta.reason.lucy': 'Über Lucy',
  'beta.reason.uxdx': 'Über UXDX',
  /* Antwortet auf die gestellte Frage — woher, nicht was. 'Woanders' statt
     'Sonstiges', das eine Kategorie benennt statt einen Ort. */
  'beta.reason.other': 'Woanders',
  'beta.submit': 'Für die Beta anmelden',
  'beta.privacy': 'Dein Name und deine Adresse werden nur für die Einladung zur Beta benutzt, für nichts anderes.',
  'beta.error.firstName': 'Gib deinen Vornamen ein.',
  'beta.error.email': 'Gib eine E-Mail-Adresse ein, zum Beispiel du@beispiel.de.',
  'beta.error.reason': 'Wähle aus, wie du von Musie erfahren hast.',
  /* Überschrift, also kein Punkt — §7, wie bei `auth.failed`. */
  'beta.failed': 'Das hat nicht funktioniert',
  'beta.error.unknown': 'Bei mir ist etwas schiefgegangen. Versuche es gleich noch einmal.',
  'beta.done.headline': 'Du bist auf der Liste',
  'beta.done.text': 'Danke, {name}. Ich schreibe dir an diese Adresse, sobald ein Platz in der Beta frei ist.',

  /* ── Nav drawer ────────────────────────────────────────────────────────── */
  'menu.title': 'Menü',
  'menu.pagesLabel': 'Seiten',
  'menu.closeLabel': 'Menü schließen',
  'menu.startSession': 'Session starten',
  /* Bens Wortlaut, 2026-09-24. Kaufmanns-Und wie im Englischen. */
  'menu.endSession': 'Session beenden & neu beginnen',
  'menu.continueSession': 'Session fortsetzen',
  'menu.yourDiary': 'Dein Tagebuch',
  'menu.aboutYou': 'Über dich',
  'menu.howItWorks': 'Wie Musie funktioniert',

  /* ── Was das Menü EINSTELLT, unter dem, wohin es FÜHRT ────────────────────
     Beide Wörter sind unverändert; nur die Schlüssel heißen jetzt `menu.*`,
     weil es /settings nicht mehr gibt (2026-09-24). 'Hier als' und der Hinweis
     zu den Übersetzungen sind mit dem Panel weggefallen — warum, steht in
     en.ts. */
  'menu.darkMode': 'Dunkelmodus',
  'menu.language': 'Sprache',

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
  /* 'Was Musie kann' — a noun-ish heading naming the section, which §3's
     exception allows; the three lines under it are the answer. */
  'about.carouselHeadline': 'Was Musie kann',
  'about.carouselLabel': 'Wie eine Session abläuft',
  /* BEN'S OWN THREE LINES, kept word for word. One spelling correction and
     nothing else: 'Reflektion' → 'Reflexion' (the form the rest of de.ts
     already uses — see session.reflect.*).

     THE THIRD LINE IS THE DIARY NOW — Ben, 2026-10-02, after the second round
     of user testing. It said 'Fühle & verstehe dich selbst besser', which U3
     liked for the reason it was replaced: what the testers actually valued was
     knowing the diary keeps their sessions, and that was being carried by a
     P.S. under the CTA that U1 and U2 both failed to see at all. So the
     promise moves out of the postscript and into the gate everybody swipes
     through, in Ben's own words. `about.postscript` is gone with it. */
  'about.slide.choose': 'Wähle mit Musie die Übung, die dich anzieht',
  'about.slide.guide': 'Musie führt dich durch die Übung und eine Reflexion',
  'about.slide.diary': 'Überblicke deinen Fortschritt im Tagebuch',
  'about.previousSlide': 'Vorheriger Schritt',
  'about.nextSlide': 'Nächster Schritt',
  'about.slideLabel': 'Schritt {position} von {total}: {title}',
  'about.goToSlide': 'Zu Schritt {position} von {total}',
  'about.hint.unseen': 'Sieh dir an, wie eine Session abläuft, bevor du startest.',
  'about.hint.next': 'Als Nächstes frage ich dich, als wer du hier bist.',
  /* 'Es kann losgehen.' rather than a literal 'Bereit, wenn du es bist.' —
     the English is an idiom and the German has its own. */
  'about.hint.ready': 'Es kann losgehen.',
  /* ── Entdeckte Musik · 2026-10-02 ────────────────────────────────────────
     'Entdeckte Musik', not 'Entdeckte Stücke': the place is about music as a
     thing you keep, and the plural of 'Stück' would make it a count of items.
     'Dein Stück' stays the word for ONE recording, as on the listen step.

     DU-FORM throughout, like the rest of the product, and no imperative in the
     intro's first sentence — it is a statement about what this place does, and
     the invitation comes second. */
  'route.discoveredMusic.title': 'Entdeckte Musik',
  'menu.discoveredMusic': 'Entdeckte Musik',
  'discovered.headline': 'Entdeckte Musik',
  /* 'Hör es wieder' rather than 'Spiel es wieder ab': the sentence is about
     listening, and the German for the act is the shorter verb. The three
     reasons keep Ben's open third one — 'einfach so' is what German says
     where the English has 'for no reason at all'. */
  'discovered.intro': 'Alle Musik, die du in einer Übung gehört hast, bleibt hier. Hör sie wieder, wann du magst – zum Ankommen, zum Konzentrieren oder einfach so.',
  'discovered.empty': 'Hier ist noch keine Musik.',
  /* Not 'Du hast noch nichts gehört': the sentence says where music comes
     from, which is the thing somebody standing on an empty page needs. */
  'discovered.emptyDetail': 'Musik landet hier, sobald du sie in einer Übung gehört hast.',
  'discovered.unnamed': 'Deine Musik',
  /* Gedankenstrich with spaces, which is the German dash, and the same one
     about.pitch uses. */
  'discovered.trackLabel': '{title} – {artist}',
  'discovered.play': 'Abspielen',
  'discovered.pause': 'Pause',
  'discovered.restart': 'Noch einmal',
  'discovered.seek': 'Position in der Musik',

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
  'exercises.notImplemented': 'Noch nicht verfügbar',
  'exercises.legend': 'Übung wählen',
  /* 'Kartenset', one word: it is a compound with a dictionary break point, so
     --text-hyphens: auto handles it and there is nothing to rephrase. */
  'exercises.fact.time': 'Dauert {min} bis {max} Minuten',
  'exercises.fact.timeShort': '{min}–{max} Min.',
  /* ── Es läuft schon eine Session · neu geschrieben 2026-10-05 ────────────
     Steht jetzt zweimal auf einem Screen und beide Male gleich: als Hinweis
     oben auf /exercises, solange ein Lauf offen ist, und im Dialog, wenn
     trotzdem eine Karte gedrückt wird. Ein Satz für beides.

     'Es läuft schon eine Session' ist weg, zusammen mit der Zeile darunter.
     Das alte Paar beantwortete nur die Kollision: eine Feststellung, und
     darunter 'Beende oder schließe die laufende Session, bevor du eine neue
     startest' — eine Hausaufgabe, direkt über dem Knopf, der sie erledigt. Die
     Überschrift nennt stattdessen die Übung, denn das ist das Erste, was man
     wiedererkennen muss, bevor man darüber entscheiden kann. */
  'exercises.running.headline': '{name} läuft noch',
  /* Was in `{name}` steht, wenn der Katalog die Übung der laufenden Session
     nicht kennt — zurückgezogener Inhalt, oder eine Sprache, die ihn nie
     hatte. Ein Gattungswort statt einer id, die noch nie jemand gesehen hat:
     'Eine Session läuft noch' ist die alte Überschrift, aufgehoben für genau
     den Fall, für den sie geschrieben war. */
  'exercises.running.fallback': 'Eine Session',
  /* Nur im Hinweis. 'Aufgehört bei' ist die Formulierung des Tagebuchs für
     genau diese Angabe (`diary.stoppedAt`), das Wort kommt aus
     `session.step.*`. NICHT im Dialog: dort steht ein Knopf '{Übung} starten
     und diese beenden', und 'Du hast bei Einsteigen aufgehört' daneben liest
     sich wie ein Rätsel. */
  'exercises.running.stoppedAt': 'Du hast bei {step} aufgehört.',
  /* Der leise Ausgang im Hinweis, für jemanden, der etwas anderes anfangen
     will. 'Beenden', nicht 'schließen': die Zeile wird als `abandoned`
     geschrieben, und so nennt das Tagebuch einen Lauf, der vor seiner
     Reflexion aufgehört hat. */
  'exercises.running.end': 'Session beenden',
  /* Nur im Dialog, wo tatsächlich eine Wahl verlangt wird. Der letzte Satz ist
     neu und ist der ehrliche: `session.close.text` sagt seit jeher, dass eine
     beendete Session nicht wieder aufgenommen werden kann — der Dialog, dessen
     zweiter Knopf genau das tut, sagte es nie. Gedankenstrich als
     Halbgeviertstrich mit Leerzeichen (§7). */
  'exercises.running.choice': 'Du kannst dort weitermachen oder sie beenden und stattdessen {name} starten – eine beendete Session lässt sich nicht wieder aufnehmen.',
  /* DIESELBEN WORTE WIE IM MENÜ (`menu.continueSession`), mit Absicht: zwei
     Türen zu einer laufenden Session, die sie verschieden benennen, sind zwei
     Türen, die man getrennt lernen muss. Zwei Schlüssel statt einem, weil es
     fürs Auge zwei Dinge sind — eine Zeile in einer Navigationsliste und die
     primäre Antwort eines Dialogs. Beim dritten Ort wandert der Satz nach
     `common.`. */
  'exercises.goToSession': 'Session fortsetzen',
  /* Bens Wortlaut, 2026-09-24, gekürzt am 2026-10-05. Der Übungsname steht
     weiter vorn, weil er das ist, wonach man den Knopf sucht. Weg ist die
     Beschreibung der anderen Session — 'vorherige Session' —, seit die
     Überschrift darüber sie beim Namen nennt. */
  'exercises.endAndStart': '{name} starten und diese beenden',
  /* Passiv, weil hier niemand schuld ist: die Anfrage kam nicht durch. Kein
     „Fehler“ im Text — das Wort steht schon unsichtbar im Status-Präfix der
     Message, und zweimal gesagt klingt es nach mehr, als es ist. */
  'exercises.startFailed': 'Die Session konnte nicht gestartet werden',

  /* ── The session ─────────────────────────────────────────────────────────
     Noun forms, not imperatives: these name the steps in a rail, they do not
     ask for an action. §3's verb-first rule is about buttons.

     FOUR SUBSTANTIVIERTE INFINITIVE, and since 2026-09-24 that is true of all
     four. 'Einstieg' was a plain noun among three verbal nouns — it named the
     place you arrive at where the others name what you do there. Ben's word
     out of the 260925 round is 'Einsteigen', which makes the set one shape.
     Still a noun phrase, so §3's exception for non-actions is untouched, and
     it still reads in the two sentences that interpolate it: 'Aufgehört bei
     Einsteigen' and 'Aktuelle Session – Einsteigen'. */
  'session.step.intro': 'Einsteigen',
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
  'session.close.text': 'Du kannst später nicht hierher zurückkehren – in der Übung geht es darum, wie es dir gerade geht, das ist beim nächsten Mal anders. Die Session bleibt als nicht beendet in deinem Tagebuch. Du kannst jederzeit eine neue Session starten.',
  'session.close.confirm': 'Session schließen',

  /* ── Intro · D.5a ──────────────────────────────────────────────────────── */
  'session.intro.fallback': 'Nimm dir einen Moment Zeit zum Ankommen. Wenn du so weit bist, geht es weiter.',

  /* ── Scan · D.5a, und der echte Scanner · E.0/E.1 ──────────────────────── */
  'session.scan.headline': 'Scanne die Karte, die gerade am besten zu deiner Stimmung passt.',
  /* KEIN 'reader'/'readerNote' MEHR — Ben, 2026-09-24. Die beiden Sätze standen
     im leeren Rahmen; der Rahmen zeigt jetzt nur noch die zwei Schaltflächen.
     Der Hinweis auf die Kamera-App des Handys ist damit nicht verschwunden,
     sondern dahin gewandert, wo die Anleitung steht: in `scan_md` der Übung
     (Migration 20260924…_scan_md_phone_camera.sql). Das zweite Satzpaar sagt
     jetzt die Schaltfläche selbst. */
  'session.scan.codeLabel': 'Kartencode',
  /* KEIN 'session.scan.codePlaceholder' mehr. Es stand `MC-01` darin, ein
     Beispiel und kein Label (3.3.2) — und das Beispiel war das Problem: ein
     Platzhalter wird in `--on-surface-muted` bei Deckkraft 1 gezeichnet, eine
     Tonstufe neben einem echten Wert, und darunter lag ein Absenden, das bei
     leerem Feld gesperrt ist. Das leere Feld sah gefüllt aus und der Knopf
     kaputt. Der Hinweis darunter nennt das Beispiel an einer Stelle, an der es
     niemand für eine Eingabe hält. */
  /* Verbphrase, §3 — das Feld dahinter heißt schon 'Kartencode', die
     Schaltfläche sagt also, was sie tut, und nicht noch einmal, was kommt.

     'Code eingeben', nicht mehr 'Code von Hand eingeben' (Ben, 2026-09-24).
     Der Zusatz 'von Hand' trennte das Tippen vom Scannen, solange beides
     nebeneinander auf dem Schirm stand; im Rahmen selbst steht jeweils nur
     eins von beiden, und die kürzere Fassung ist zugleich der Name des
     Icon-Buttons über dem Kamerabild, wo drei Wörter als Tooltip zu viel
     wären. */
  'session.scan.codeManual': 'Code eingeben',
  /* Wo der Code wirklich steht (2026-10-09). Vorher: 'neben dem QR-Code' —
     das stimmt seit dem 2026-10-02 nicht mehr, seit der QR-Code die Vorderseite
     ganz verlassen hat. Beide stehen jetzt auf der Rückseite, der Code direkt
     unter dem Stempel. Gedankenstrich mit Leerzeichen, §7. */
  'session.scan.codeHint': 'Der Code steht auf der Rückseite, direkt unter dem QR-Code – zum Beispiel MC-01.',
  /* A verb phrase, not 'Diese Karte' (§3) — the button performs an act. */
  'session.scan.codeSubmit': 'Diese Karte nehmen',
  'session.scan.codeMalformed': 'Ein Kartencode sieht aus wie MC-01. Schau noch einmal auf deine Karte.',
  /* 'Set', not 'Deck': 'Mindfulness-Karten-Set' is how GERMAN-UI-WRITING.md
     writes it since Ben's copy pass of 2026-09-29 — §8.1, which now records
     that the deck's name IS Germanised — and 'Kartenspiel' would be a game of
     cards. */
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
  /* 'Karte scannen', nicht 'Kamera benutzen' (Ben, 2026-09-24). Der Knopf ist
     jetzt die primäre Handlung des Schritts und nennt das Ziel — die Karte —
     statt des Geräts, das dabei hilft. Kleinschreibung des Verbs nach §2, auch
     wenn die Vorlage 'Karte Scannen' schrieb. */
  'session.scan.scanCard': 'Karte scannen',
  /* 'noch mal', not 'noch einmal': the longer form put this at 1.40× the
     English and §5 asks for the rewrite before the wrap. */
  'session.scan.cameraRetry': 'Kamera noch mal versuchen',
  /* 'ausblenden', nicht 'ausschalten': der Knopf sitzt als Icon-Button im Bild
     und räumt die Vorschau weg; der Stream wird dabei wirklich beendet, aber
     was die Person tut, ist das Bild wegnehmen. 'Ausschalten' klänge nach der
     Kamera des Geräts insgesamt. */
  'session.scan.cameraHide': 'Kamera ausblenden',
  /* Der Weg aus dem Eingabefeld zurück in den Sucher — beides sind Modi
     desselben Rahmens, also sagt der Knopf, wohin er führt. */
  'session.scan.codeBack': 'Zurück zum Scannen',
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
  /* ── EIN WORT FÜR DIE MUSIK, UND ES IST 'die Musik' (Ben, 2026-10-09) ────
     Vorher standen hier VIER Wörter für eine Sache: 'Stück' fünfmal, 'Track'
     fünfmal, 'Musik' siebenmal, 'Aufnahme' zweimal. Die alte Regel an dieser
     Stelle — "'Stück', weil der Seed selbst so spricht; 'Track' wäre ein
     englisches Wort, das niemand gewählt hat" — galt nur noch für ihre eigene
     Hälfte, denn direkt daneben stand fünfmal genau dieses 'Track'.

     'die Musik' gewinnt, weil es das Wort ist, das ohnehin am häufigsten
     dastand, weil es keine Übersetzung ist (§8) und weil es nicht zählt: ein
     Stück kann man zählen, Musik nicht — und gezählt wird hier nie.

     WAS NICHT MITGEHT: 'Aufnahme' im Sinne der SPRACHAUFNAHME (reflect.voice.*,
     privacy.voice, voice.*). Das ist eine andere Sache und bleibt.

     Die Schlüsselnamen bleiben ebenfalls — `session.listen.track`,
     `discovered.trackLabel`, `noTrack`. Sie heißen nach der Tabelle `tracks`
     und der Spalte `track_id`, und das ist weiterhin wahr. */
  'session.listen.track': 'Deine Musik',
  /* Keine Zahl mehr (2026-10-09). Vorher: 'Fokussiere dich für {countdown}
     Minuten' — zwei Fehler in einer Zeile. Es war der ZWEITE Countdown auf der
     Bühne und widersprach dem des Transports, und es setzte MM:SS in einen
     Satz, der 'Minuten' sagt: aus neunzig Sekunden wurde '01:30 Minuten'.

     Die Uhr gehört jetzt dem Knopf darüber, der das Minimum in seiner eigenen
     Beschriftung nennt. Dieser hier sagt nur noch, worauf er wartet. */
  'session.listen.startLocked': 'Zuerst hören, dann reflektieren',
  'session.listen.start': 'Wenn du bereit bist, beginne zu reflektieren',
  /* Beschreibend, kein Satzzeichen-Deutsch: was zu sehen ist, in einem Satz.
     'Smartphone', weil 'Handy' in diesem Deck sonst nirgends steht. */
  'session.listen.infographicAlt': 'Eine Hand hält eine Karte über einen Tisch, daneben liegt ein Smartphone, aus dem Musik klingt.',

  /* ── Die Hör-Ansicht · Branch LISTEN-EXPERIMENTS ────────────────────────
     'Hören' als Substantivierung, weil die Ansicht ein Name braucht und kein
     Befehl ist (§3's Ausnahme für Überschriften). 'Hören beenden' ist dagegen
     eine Handlung und steht als Verbphrase da — und sie ist wahr: das Verlassen
     der Ansicht pausiert das Stück. */
  'session.listen.immersiveTitle': 'Hören',
  'session.listen.immersiveClose': 'Hören beenden',
  /* Die Bildunterschrift steht UNTER der Zahl und wiederholt sie nicht.
     'Noch mindestens so lange' — 24 Zeichen gegen 25 im Englischen, also
     unter dem Budget aus §5. */
  'session.listen.immersiveCountdown': 'mindestens hören für diese Übung',
  /* Bens Wortlaut, 2026-10-07. Ersetzt `immersiveReady`, das nur eine Schwelle
     meldete: dieser Satz sagt, was geschafft ist, und gibt den Rest des Stücks
     als ANGEBOT zurück, nicht als Auflage.

     Beide Zahlen als MM:SS, Bens Entscheidung — `{gate}` ist dieselbe Zahl,
     die der Zähler darüber gerade heruntergezählt hat, und eine andere Einheit
     an dieser Stelle läse sich als andere Zahl. Interpoliert, weil
     `listen_gate_seconds` je Übung 60, 90 oder 180 ist. */
  'session.listen.immersiveDone': 'Super, dass du dich {gate} Minuten fokussiert hast. Die Musik läuft noch {remaining}, wenn du magst.',
  /* Das Stück kann schon zu Ende sein, wenn die Zeit abläuft. Kein
     Gedankenstrich (Ben, 2026-10-07) — zwei Sätze statt einem. */
  'session.listen.immersiveDoneEnded': 'Super, dass du dich {total} Minuten fokussiert hast. Die Musik ist zu Ende. Wenn du magst, höre sie noch einmal.',
  /* Bens Wortlaut. 'Counter' statt 'Zähler' ist seine Wahl und bleibt stehen;
     §8 ist der Ort, an dem das zu diskutieren wäre. */
  'session.listen.immersiveLocked': 'Fokussiere dich, bis der Counter abgelaufen ist. Dann geht’s weiter',
  /* ── Die drei Scroll-Ansichten · E.5b ───────────────────────────────────*/
  'session.listen.detailsAction': 'Über die Musik',
  'session.listen.warnText': 'Für diese Übung ist es besser, dich nicht von den Metadaten der Musik beeinflussen zu lassen.',
  'session.listen.warnBack': 'Zurück zum Hören',
  'session.listen.warnOn': 'Details und Player zeigen',
  'session.listen.scrollUp': 'Nach oben',
  /* Bens Wortlaut, 2026-10-09. Der Knopf auf der Bühne trägt jetzt das
     Minimum, also sagt seine Beschriftung, wie weit es noch ist — und der
     Bildschirm zeigt nicht länger zwei Countdowns, die sich widersprechen.
     `{time}` setzt `TrackButton` aus `gateSeconds` ein: erst das Minimum
     selbst, dann was davon übrig ist, dann was von der Musik übrig ist.

     Ohne führende Null, weil das hier Sätze sind und keine Anzeige, die beim
     Minutenwechsel still stehen muss: 'mindestens 1:30' sagt man so.

     Ein viertes Wort gibt es nicht — das Ende sagt `session.listen.restart`,
     geteilt mit dem ungetakteten Knopf. */
  'session.listen.listenUnstarted': 'Jetzt anhören (mindestens {time})',
  'session.listen.listenBelow': 'Weiter hören (mindestens {time})',
  'session.listen.listenPast': 'Noch weiter hören ({time})',
  'session.listen.play': 'Abspielen',
  'session.listen.pause': 'Pause',
  'session.listen.restart': 'Noch einmal',
  'session.listen.seek': 'Position in der Musik',
  'session.listen.aboutHeading': 'Zu dieser Musik',
  'session.listen.aboutArtist': 'Interpretin oder Interpret',
  'session.listen.aboutInstructions': 'Hinweise zum Hören',
  'session.listen.simulatedHeadline': 'Testmodus: keine Musik',
  'session.listen.simulated': 'Es ist noch keine Musik hinterlegt, deshalb läuft der Player auf einer Uhr in ihrer echten Länge.',
  'session.listen.noTrack': 'Für diese Übung gibt es noch keine Musik.',

  /* ── Reflect · D.5c ────────────────────────────────────────────────────── */
  'reflect.legend': 'Wie möchtest du antworten?',
  /* ONE WORD EACH, where the English takes two. A segment ellipses at one line
     and German runs ~30% longer, so the English pattern ('Record audio') would
     clip before the glyph did. The field below each one carries the long
     version as its own label. */
  'reflect.mode.voice': 'Transkribieren',
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
  'reflect.photo.notBuiltText': 'So funktioniert es. Das Foto bleibt auf deinem Gerät und wird als Text ausgelesen; das Bild wird nie hochgeladen.',
  /* Drei geordnete Punkte, der niedrigste zuerst — die Reihenfolge IST die
     Frage. Jeder nennt den Vergleich ausdrücklich ('als vorher'), weil hier
     eine VERÄNDERUNG gemessen wird; ein Punkt namens 'gut' würde eine Stimmung
     messen. */
  'reflect.feeling.legend': 'Wie fühlst du dich jetzt?',
  'reflect.feeling.worse': 'Schlechter als vorher',
  'reflect.feeling.same': 'Genau wie vorher',
  'reflect.feeling.better': 'Besser als vorher',

  /* ── EIN WEG HINAUS, UND ER SAGT, WOHIN (Ben, 2026-10-09) ────────────────
     KEIN 'reflect.skip' UND KEIN 'reflect.finish' mehr. Der Schritt hatte drei
     Ausgänge gleichzeitig — überspringen, beenden und das stille *Diese
     Session schließen*. Jetzt ist es ein Knopf, immer aktiv, und er nennt das
     Ziel statt der Handlung.

     Nebenbei löst das eine Doppelung auf: 'Session beenden' stand hier UND in
     `exercises.running.end` — einmal für ein beendetes, einmal für ein
     abgebrochenes Ende. Dieselben zwei Wörter für zwei Gegenteile. */
  'reflect.save': 'Session im Tagebuch speichern',

  /* Der Dialog, wenn Antwort oder Skala noch offen sind. EIN Satz zum Warum,
     und er argumentiert mit dem, was die Person davon hat. */
  'reflect.incomplete.title': 'Reflexion abschließen',
  'reflect.incomplete.text': 'Eine Session, die du beantwortet hast, findest du später wieder — die Worte machen sie zu deiner und nicht zu einem Datum in einer Liste.',
  /* Primär ist der Weg zurück zur Arbeit, denn dafür gibt es den Dialog.
     Benennt die Handlung, nicht den Kasten: 'Abbrechen' beschriebe das
     Verlassen dieses Fensters, nicht die Rückkehr zur Reflexion. */
  'reflect.incomplete.continue': 'Reflexion fortsetzen',
  /* Der Ausgang bleibt offen, im zweiten Rang — und sagt 'unvollständig'
     laut, damit klar ist, was im Tagebuch landet. */
  'reflect.incomplete.save': 'Unvollständig im Tagebuch speichern',

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
  /* Jetzt Label einer <dl>-Zeile statt ganzer Satz: die Präposition steht im
     Label, der Schritt ist der Wert. Mit der alten Fassung als Inhalt stünde
     dort 'Aufgehört bei: Aufgehört bei Einsteigen'. */
  'diary.stoppedAt': 'Aufgehört bei',
  /* 'Min.' with the point: the abbreviation DIN 1301 uses, and it keeps the
     row inside the measure where 'Minuten' would not. */
  'diary.duration': '{minutes} Min.',
  /* Die Beschreibung der Übung steht jetzt als Zeile in der Liste statt als
     Fließtext unter der Überschrift. Das Label ist eine Frage, die der Wert
     beantwortet — wie die drei darunter. */
  'diary.about': 'Worum es geht',
  /* Der Name der Übung war bis zum 26.09.2026 die Überschrift der Karte und
     ist jetzt eine Zeile in der Liste. Die Überschrift sagt, WELCHE Session
     das ist; die Übung ist eine Angabe darüber — wie Karte und Dauer. */
  'diary.exercise': 'Übung',
  'diary.when': 'Wann',
  /* 'Dauer', not 'Wie lange': a label in a facts list is a noun in German
     where English gets away with a question. */
  'diary.howLong': 'Dauer',
  'diary.card': 'Karte',
  /* Substantiv wie jede andere Faktenzeile auf dieser Karte. Den Vergleich
     trägt der WERT ('Besser als vorher'), das Label nennt nur die Frage. */
  'diary.feeling': 'Danach',
  'diary.listenAgain': 'Nochmal hören',
  'diary.yourAnswer': 'Deine Antwort',
  'diary.notFound': 'Diesen Tagebucheintrag gibt es nicht',
  /* 'endgültig' carries the weight the English gets from 'cannot be undone'
     without a second clause; §5's length budget is tight in a dialog. */
  /* Die Überschrift der Karte. '{when}' ist ein kurz formatierter Zeitstempel
     aus `formatShortDateTime`. 'vom' steht hier und nicht im Formatierer:
     Deutsch braucht die Präposition, Englisch nicht zwingend dieselbe — und
     ein Formatierer, der den ganzen Satz zurückgäbe, würde Copy in der
     Sprache wählen, in der er geschrieben wurde.

     'Session' ist das Produktwort (§8), die Session, Plural Sessions. */
  'diary.sessionTitle': 'Session vom {when}',

  /* Der Umschalter, hinter dem alles liegt, was ÜBER die Session ist — die
     beschrifteten Zeilen und der Status. Frage, Antwort und Aufnahme bleiben
     immer sichtbar.

     'Session-Details' mit Bindestrich, nicht 'Session Details': §8 verlangt
     Durchkopplung, und 'Session' ist laut derselben Regel ein deutsches
     Substantiv. Bens Briefing schrieb es mit Leerzeichen; das ist im Deutschen
     ein Deppenleerzeichen und dieses Dokument ist genau dafür da.

     Zwei Strings statt einem, weil der Name einer Schaltfläche sagen soll, was
     das Drücken tut; `aria-expanded` trägt den Zustand für alle, die das
     Chevron nicht sehen. */
  'diary.details': 'Session-Details',
  'diary.detailsHide': 'Details ausblenden',

  /* Die Bestätigung nach einer Session, als Toast oben am Bildschirm.
     Bens Formulierung vom 29.09.2026; vorher stand hier "Im Tagebuch findest
     du einen Eintrag für jede beendete Übung".

     ENGLISCH IST HIER DAS ORIGINAL, ausnahmsweise: Ben hat diesen Satz auf
     Englisch geschrieben, also ist `en.ts` die Vorlage und dies die
     Übersetzung. Sonst läuft es in diesem Katalog andersherum.

     Verb an zweiter Stelle statt "Du findest deine Reflexion …", damit der
     Satz mit dem Ding anfängt, um das es geht — und weil er damit denselben
     Rhythmus behält wie der Satz, den er ersetzt.

     Der Satz benennt jetzt die REFLEXION, und damit ist er nur noch dort
     wahr, wo eine geschrieben wurde: bei einer beendeten Session ohne
     übersprungene Reflexion. Session.tsx entscheidet das.

     Nebenbei erledigt sich damit der Widerspruch des alten Wortlauts —
     "beendete Übung" über einem Eintrag mit dem Etikett "Nicht beendet". */
  'diary.saved': 'Deine Reflexion findest du im neuesten Tagebucheintrag',
  'diary.saved.dismiss': 'Meldung schließen',

  /* ── Der Graph ────────────────────────────────────────────────────────
     Eine Woche aus Tagen, jede Session als Bild ihrer Übung.

     `diary.graph.session` ist der ganze zugängliche Name EINES Bild-Links:
     Überschrift, Übung, Status. Das Bild darin hat alt="" — ein Link, dessen
     Text und Bild dasselbe sagen, sagt es zweimal.

     'Noch 3 an diesem Tag' statt '+3': die Chip ist ein Link auf diesen Tag in
     der Liste darunter, und ihr Name soll sagen, wohin er führt. */
  /* Ein Protokoll, keine Taktvorgabe (2026-10-09). 'Tag für Tag' las sich wie
     ein Rhythmus, den das Produkt verlangt — im Usertesting als Empfehlung
     verstanden, eine Session pro Tag sei vorgesehen. Der Bildschirm sagt, was
     WAR. 'bisher' sagt dasselbe Bild ohne die Aufforderung. */
  'diary.graph.label': 'Deine Sessions bisher',
  'diary.graph.weekLabel': 'Woche bis {when}',
  'diary.graph.session': '{title} — {exercise}, {status}',
  'diary.graph.more': 'Noch {count} an diesem Tag',
  'diary.graph.start': 'Heute eine Session starten',
  /* Benannt nach der Woche, zu der sie führen, nicht nach der Richtung, in
     die der Pfeil zeigt: 'Zurück' wäre wahr für das Symbol und nutzlos als
     Ansage. */
  'diary.graph.prevWeek': 'Woche davor',
  'diary.graph.nextWeek': 'Woche danach',
  'diary.graph.empty': 'Hier stapeln sich deine Sessions, ein Bild pro Tag.',

  'diary.collapse': 'Diesen Eintrag schließen',
  'diary.delete': 'Diese Session löschen',
  'diary.delete.confirm': 'Session löschen?',
  'diary.delete.text': 'Damit wird die Session und alles, was du darin geschrieben hast, endgültig gelöscht. Das lässt sich nicht rückgängig machen.',
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
  'diary.filter.noneFinishedText': 'In deinem Tagebuch ist bisher keine beendete Session gespeichert.',
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
  'diary.deleteAll.text': 'Damit werden alle Sessions und alles, was du darin geschrieben hast, endgültig gelöscht. Auch Sessions, die gerade laufen, werden gelöscht. Nichts bleibt übrig, und das lässt sich nicht rückgängig machen.',
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
  /* ── DIESE ZWEI LIEGEN AUF HALDE — Ben, 2026-09-24 ──────────────────────
     Nichts zeigt sie derzeit an. Sie waren die eine Zeile im
     Reflexionsschritt und der Link daneben; beides ist dort weg, weil das
     Transkript der Grund ist, warum jemand auf diesem Schritt steht, und das
     Kleingedruckte darunter dagegen angetreten ist.

     Sie bleiben im Katalog, weil `DataLightbox` gebaut bleibt und das lange
     Versprechen weiter enthält. Was fehlt, ist die Tür dorthin, und wo die
     hingehört, entscheidet Ben (apps/web/OPEN-QUESTIONS.md).

     Das Versprechen in einer Zeile: keine Kürzung von `privacy.voice`, sondern
     die Hälfte davon, die ein Versprechen ist — wie es funktioniert, steht in
     der Lightbox. */
  'privacy.voiceShort': 'Musie speichert nur den Text, nie die Sprachnachricht.',
  /* Das Wort im Satz, das alles Weitere öffnet. Nicht 'Mehr erfahren': ein
     Link im Fließtext muss benennen, was hinter ihm liegt. */
  'privacy.more': 'Mehr zu deinen Daten',
  'privacy.voice': 'Wenn du laut antwortest, macht Musie aus deinen Worten Text. Die Aufnahme selbst wird nie gespeichert.',
  'privacy.photo': 'Ein Foto bleibt auf deinem Gerät. Musie lädt es nie hoch.',
  /* 'ist auch dein Tagebuch weg' rather than a softer 'geht verloren': the
     English is blunt on purpose and the German should not apologise for it. */
  /* The loss first, the exemption second, as in the English. 'Zurückholen
     lässt es sich nicht' is kept verbatim from the original German — it is the
     sentence that does the uncomfortable work, and it was already right. */
  'privacy.browserBound': 'Wenn dein Konto nur in diesem Browser liegt, löschst du mit seinen Daten auch dein Tagebuch. Das kann nicht rückgängig gemacht werden. Wenn du angemeldet bist, bleibt dein Tagebuch in deinem Konto. Du erreichst es auch von einem anderen Gerät.',

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
  'voice.error.micNotFound': 'Dieses Gerät hat kein Mikrofon, das Musie nutzen kann. Schreibe stattdessen deine Antwort.',
  'voice.error.micUnavailable': 'Das Mikrofon ließ sich nicht öffnen. Schließe Anwendungen, die das Mikrofon benutzen, und starte neu.',
  'voice.error.recorderFailed': 'Die Aufnahme ließ sich auf diesem Gerät nicht starten. Schreibe deine Antwort stattdessen.',
  /* 'mitten in der Aufnahme', nicht 'unterbrochen': das Wort beschreibt, was
     die Person erlebt hat, und nicht, was technisch passiert ist. Und wie bei
     `connectionClosed` steht zuerst, dass die Worte noch da sind — das ist
     die Frage, die sich in dem Moment wirklich stellt. */
  'voice.error.micInterrupted': 'Das Mikrofon hat mitten in der Aufnahme aufgehört. Alles, was Musie schon gehört hat, bleibt erhalten – starte neu, wenn du bereit bist.',
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
  /* Nicht `voice.undo.dismiss`: das schließt ein ANGEBOT, das hier schließt
     eine Meldung über etwas, das schon passiert ist. Siehe en.ts. */
  'voice.error.dismiss': 'Meldung schließen',

  /* ── Voice · der Editor · F.4 ──────────────────────────────────
     Alle diese Strings hat §7.24 auch selbst, auf Deutsch, im Katalog des
     Pakets. Sie werden trotzdem übergeben: es sind die Worte DIESES
     Transkripts, nicht die der Komponente. Siehe en.ts. */
  'voice.item.noun': 'Aussage',
  'voice.empty.headline': 'Noch nichts aufgenommen',
  'voice.empty.text': 'Fertige Aussagen erscheinen hier, in je einer Box, in der Reihenfolge, in der du sie gesagt hast.',
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
  /* Beide Hinweise unter der Aufnahmeschaltfläche sind weg (2026-09-24, Ben,
     in zwei Schritten): erst `voice.hint.more`, dann `voice.hint.first`. Beide
     endeten auf denselben zwei Grenzen. Was von selbst stoppt, sagen
     `voice.stopped.timeout` und `voice.stopped.silence` — in dem Moment, in
     dem es passiert, und mit der Zahl im Satz. Vorher noch einmal davor zu
     warnen war Kleingedrucktes unter dem Transkript. */
  /* 'Ziehpunkt' für den Griff: kein Nomenstapel (§6), und es ist das Wort,
     das auch die Komponente im Deutschen benutzt. */
  /* Die Tipps werden jetzt aufgerufen, sie stehen nicht mehr da.
     `voice.hint.edit` ist unverändert der Text im Kasten; die drei davor sind
     die Schaltfläche, die Überschrift und das Schließen. Die Überschrift
     benennt das Thema, statt die Schaltfläche zu wiederholen. */
  'voice.hint.editToggle': 'Tipps zum Bearbeiten',
  'voice.hint.editHeadline': 'Aussagen verschieben und verbinden',
  'voice.hint.editHide': 'Tipps ausblenden',
  'voice.hint.edit': 'Zieh eine Aussage, um sie zu verschieben, oder lass sie auf einer anderen los, um beide zu verbinden. Auf dem Touchscreen wischst du eine Aussage nach links, um sie zu löschen. Mit der Tastatur: Ziehpunkt fokussieren, dann Leertaste zum Anheben, Pfeiltasten zum Verschieben, M verbindet sie mit der darüber, Escape legt sie zurück.',
  /* Überschriften ohne Punkt, Sätze mit. */
  'voice.stopped.headline': 'Aufnahme beendet',
  'voice.stopped.timeout': 'Das waren {seconds} Sekunden. Alles, was Musie gehört hat, steht in der Liste. Du kannst mehr aufnehmen.',
  'voice.stopped.silence': 'Es war {silence} Sekunden still, darum hat Musie aufgehört zuzuhören. Alles Gehörte steht in der Liste.',
  /* `voice.error.headline` und `voice.warning.headline` sind weg — siehe
     en.ts: Fehler sind jetzt ein Toast, und ein Toast hat keine Überschrift. */

  /* ── Das Deck · /exercises ──────────────────────────────────────────────
     Was auf einer Karte steht, steht NICHT hier: Name, Beschreibung und Bild
     gehören der Übung und kommen aus den Inhaltstabellen. */
  /* ── Musie fragt, und die Zahl ist weg (Ben, 2026-10-08) ────────────────
     Vorher '{count} Übungen für dich'. Der Ziel-Filter hat die Zahl beweglich
     gemacht, und dieser Katalog kennt keine Pluralformen (siehe i18n/index.ts)
     — bei einem Ziel mit genau einer Übung hätte da '1 Übungen für dich'
     gestanden. Die drei Überschrift-Zustände in Exercises.tsx gab es nur wegen
     dieser Zahl; sie gehen mit ihr.

     EINE FRAGE, wo dieser Bildschirm sonst Nominalphrasen setzt. §3's Ausnahme
     gilt für Überschriften, die etwas benennen — diese benennt nicht, sie
     fragt. `aboutYou.headline` ist der Präzedenzfall: auch dort fragt Musie
     und die Antwort steht darunter.

     'WIR', NICHT 'DU' — und das ist kein Verstoß gegen §1 (Ben, 2026-10-08).
     §1 regelt du gegen Sie; die erste Person Plural ist eine dritte Sache und
     hier die Absicht: die Karte wird zwar allein gedrückt, aber Musie begleitet
     die Session. 'Übung' und nicht 'Session', weil genau das auf den Karten
     steht und in `exercises` die Zeile heißt — die Karten sind die Antwort auf
     diese Frage, und sie sollen so heißen, wie die Frage sie nennt.

     EINE ZEILE, UND DAS IST GEMESSEN. Bens Wortlaut war 'Mit welcher Übung
     starten wir?' und misst 386px — bei 393px Breite stehen 361px zur
     Verfügung (zwei Mal --gutter ab), also 25px zu viel und damit zwei Zeilen.
     Gestrichen ist nur 'Mit': diese Fassung misst 332px und hat 29px Luft.

     DAS MASS IST NICHT DIE SCHRANKE, das Gerät ist es: --measure-heading löst
     zu 438px auf und greift auf dem Telefon nie. Eine Schriftgröße, die den
     langen Satz einzeilig gemacht hätte, wäre 17.8px gewesen — Fließtextgröße,
     und --type-heading-lg-size ist Layer 1, also [LOCKED]. Kürzen war die
     einzige Stelle, an der das zu lösen war. */
  'exercises.headline': 'Welche Übung starten wir?',
  /* KEIN 'exercises.intro' mehr. Das war die Zeile unter der Überschrift und
     sie ist ersatzlos weg (Ben, 2026-10-08). `DeckGuide` erklärt Tippen und
     Wischen auf der Karte selbst; die Liste erklärt er nicht, und genau diese
     Hälfte geht verloren — in OPEN-QUESTIONS notiert, nicht hier geflickt. */
  /* Der Name des Stapels für Screenreader, und die einzige Stelle, an der die
     Tasten genannt werden: das Overlay, das den Tipp erklärt, ist ein
     visueller Zustand und aria-hidden. Es nennt die Tasten und nicht das
     Wischen — wischen wird diese Leserin nicht. */
  'exercises.deckLabel': 'Das Deck. Enter startet die Übung auf der obersten Karte, die Pfeiltasten blättern vor und zurück.',
  /* 'exercises.start' ist weg (Ben, 2026-10-05), zusammen mit der großen
     Schaltfläche neben dem Deck: die Karte trägt diese Handlung jetzt, und für
     die Langform gab es keinen zweiten Ort mehr.

     Die Kurzform bleibt, und die Ecke ist der Grund: in die Ecke einer 297px
     breiten Karte passt 'Übung starten' neben der Zeitangabe nicht, und ein
     abgeschnittenes Label ist kein Label. */
  'exercises.startShort': 'Starten',
  /* Kein 'exercises.startHint' mehr. Das war die zweite Zeile im Overlay —
     'Antippen startet die Übung' — und auf der Karte sitzt jetzt eine
     Schaltfläche, die dasselbe in einem Wort sagt und sich drücken lässt (Ben,
     2026-10-05). Ein Schlüssel, den nichts rendert, ist genau die unsichtbare
     Fäulnis, vor der der Kopf dieser Datei warnt.

     Die zwei Richtungen. Bens Wort von 2026-10-02 für die eine, und die
     Gegenrichtung dazu — nicht 'andere Übung', weil zwei Labels mit 'andere'
     nicht sagen würden, welche.

     'Vorherige' und nicht 'Vorige': das Overlay zeigt jetzt in beide
     Richtungen die NÄCHSTE Übung, also steht dieses Wort nur noch als Name und
     Tooltip der Zurück-Schaltfläche. Dort hält es kein Maß — der Grund für die
     Kurzform war ein unteilbares Wort von 155px gegen 148px Platz im Overlay,
     und den Platz gibt es nicht mehr zu messen. */
  'exercises.next': 'Nächste Übung',
  'exercises.previous': 'Vorherige Übung',
  /* Gedankenstrich als Halbgeviertstrich mit Leerzeichen, wie bei
     `route.session.title`. */
  'exercises.deckPosition': '{name} – Karte {index} von {total}',
  /* Bens Wortlaut, 2026-10-07: 'Karte' wird zu 'Übung'. Der Stapel besteht aus
     Karten, angeboten wird eine Übung — und 'Übung' ist das Wort, das die
     Überschrift, die Legende und die Blätter-Schaltflächen daneben alle
     benutzen. Der Schlüssel heißt weiter `…Short`: die Langform gab es, sie
     ist weg, und ein Schlüssel wird nicht aus Ordnungsliebe umbenannt. */
  'exercises.surpriseMeShort': 'Such mir eine Übung aus',
  /* ONE OF THESE TWO IS NOW DRAWN: the switch labels the view you are NOT in,
     so the half you might press says what pressing it would get you.
     'Stapel', not 'Kartenstapel' — one word beside a glyph in a 36px track,
     and 'Stapel' already says it while 'Liste' stands next to it. */
  /* ── Die Legende beim ersten Mal · die Extra-Karte des Stapels ──────────
     Bens Wortlaut aus dem Wireframe, 2026-10-07, und er ersetzt seinen
     eigenen vom selben Tag: statt zu beschreiben, was eine Bedienung
     einbringt, benennt jede Zeile jetzt die Bewegung — ändern, wischen,
     drücken. Imperativ Singular und du, wie überall (§1).

     'Click auf eine Übung zum Starten' steht so auf der Skizze und bleibt so
     nicht stehen: ein englisches Verb in der Chrome ist ein vergessener String
     (§8.3). Das deutsche Verb ist 'antippen' und nicht 'drücken', weil
     `exercises.intro` zwei Zentimeter darüber 'Tipp eine Karte an' sagt — zwei
     Verben für dieselbe Geste auf einem Bildschirm sind genau der Fall, den §1
     meint, wenn Einheitlichkeit über der Wahl steht.

     ES MUSS 'antippen' SEIN, nicht 'tippen': 'tippe den Code ein' heißt in
     `session.scan.*` sechsmal TASTATUR. Die trennbare Vorsilbe ist der ganze
     Unterschied zwischen der Geste und dem Eintippen.

     'um sie zu starten' statt 'zum Starten', weil sich die Präpositionalgruppe
     sonst einen Moment lang an 'Übung' hängt — eine Übung zum Starten.

     'Ändere' und nicht 'Wähle': das Ziel ist beim ersten Blick auf diese Seite
     schon gewählt — ohne Ziel wird gar kein Stapel ausgeteilt (lib/goals.ts) —
     und die Pille darüber trägt es bereits. Die Legende sagt, dass es sich
     ändern lässt.

     `guide.dismiss` wird nie gesehen: die Zeile nur für Screenreader, weil die
     Legende ein einziger Button ist und ihr zugänglicher Name sonst aus drei
     Erklärungssätzen ohne Verb besteht. */
  'exercises.guide.goal': 'Ändere dein Ziel',
  'exercises.guide.next': 'Wische für die nächste Übung',
  'exercises.guide.start': 'Tippe eine Übung an, um sie zu starten',
  'exercises.guide.dismiss': 'Zum Fortfahren drücken',
  /* Verbphrase (§3). */
  'exercises.guide.show': 'Zeigen, wie diese Seite funktioniert',
  /* Die beiden Chevrons der Leiste. Verbphrase (§3), Infinitiv wie bei jeder
     anderen Schaltflächen-Beschriftung dieser Art ('Menü öffnen').

     'scrollen' bleibt englisch und ist trotzdem deutsch: das Verb steht im
     Duden und ist das Wort, das deutsche Oberflächen benutzen — §8.3 verlangt
     ein deutsches Wort, kein erfundenes ('blättern' heißt umblättern, und hier
     wird nichts umgeblättert). */
  'exercises.toolbar.left': 'Nach links scrollen',
  'exercises.toolbar.right': 'Nach rechts scrollen',
  'exercises.view.legend': 'Wie die Übungen gezeigt werden',
  'exercises.view.deck': 'Stapel',
  'exercises.view.list': 'Liste',
  /* KEIN 'exercises.goal.headline' mehr. Das war 'Dein Ziel' und nie die
     Überschrift der Ziel-Box, sondern einer der drei h1-Zustände von
     /exercises — der für ein Ziel, das keine Übung bedient. Die Überschrift
     ist jetzt eine einzige Frage, der Zustand ist weg, und ein Schlüssel, den
     nichts mehr zeichnet, ist genau die unsichtbare Fäulnis, vor der der Kopf
     dieser Datei warnt. Also gelöscht statt aufgehoben. */
  /* du, and NO 'gerade heute': the brief had both and they say the same
     thing twice — 'gerade' is right now, 'heute' is today. 'heute' is the one
     that matches a choice you make once a day. Flagged in OPEN-QUESTIONS. */
  'exercises.goal.question': 'Was möchtest du heute erreichen?',
  'exercises.goal.none': 'Musie entdecken',
  'exercises.goal.pill': 'Ziel: {goal}',
  'exercises.goal.empty': 'Für dieses Ziel gibt es noch keine Übung.',
  /* Verbphrase, Infinitiv — ein Button sagt, was er tut (§3). */
  'exercises.goal.emptyAction': 'Anderes Ziel wählen',
  /* /goal-mappings — ein Werkzeug, kein Screen. Trotzdem im Katalog, aus dem
     Grund, den en.ts nennt. */
  'goalMap.headline': 'Ziel-Zuordnungen',
  'goalMap.intro': 'Wähle aus, welche Ziele jede Übung bedient, erzeuge die Konfiguration und füge sie im Chat wieder ein. Hier wird nichts gespeichert – die Zuordnung ändert sich per Migration.',
  'goalMap.legend': 'Welche Ziele jede Übung bedient',
  'goalMap.submit': 'Konfiguration erzeugen',
  'goalMap.outputLabel': 'Konfiguration',
  'goalMap.copy': 'Kopieren',
  'goalMap.copied': 'Kopiert',
  'route.aboutMusie.title': 'Über Musie',
  'route.aboutYou.title': 'Über dich',
  'route.diary.title': 'Dein Tagebuch',
  'route.diaryEntry.title': 'Tagebucheintrag',
  'route.exercises.title': 'Übungen',
  'route.goalMappings.title': 'Ziel-Zuordnungen',
  /* A Gedankenstrich: German sets a parenthetical dash as an EN dash with
     spaces, where English sets an em dash. The English key keeps its '—'. */
  'route.session.title': 'Aktuelle Session – {step}',
  'route.notFound.title': 'Nicht gefunden',
};
