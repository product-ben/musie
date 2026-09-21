/**
 * English copy — the source of truth for the message catalogue.
 *
 * `de.ts` is typed against this object, so adding a key here and forgetting
 * the German fails `pnpm check` rather than falling back silently at runtime.
 * `MessageKey` is `keyof typeof en`, so an unknown key is a TYPECHECK ERROR —
 * there is no runtime key fallback to hide a typo.
 *
 * NOTHING user-visible in apps/web is written inline. That includes the
 * placeholder route titles: they are scaffolding and will be deleted as each
 * real screen lands, but the rule has no exceptions so there is nothing to
 * remember when the real copy arrives.
 *
 * ── THIS IS CHROME, NOT CONTENT ────────────────────────────────────────────
 * The German in de.ts is REAL German, written by the implementer and read
 * back against docs/GERMAN-UI-WRITING.md. Chrome is OURS and permanent: no
 * one else is ever going to supply it.
 *
 * The content tables are the other case. Their German is also real German
 * now, written to the same standard, but it is PROVISIONAL — that copy
 * belongs to the Mindfulness Cards spreadsheet and will be overwritten by it.
 * The seed migration says so at the head of its German inserts. Chrome is
 * ours; content is not.
 *
 * The design system is deliberately NOT held to this rule. Its components
 * ship hardcoded defaults, and they are a mix of German (`Lightbox`
 * closeLabel 'Schließen') and English (`RecordButton` readyLabel 'Record
 * Now'). The consequence for the app is enforced at the boundary instead:
 *
 *   PASS EVERY USER-VISIBLE STRING EXPLICITLY. Never let a component default
 *   through, or the UI is half-German whatever the locale says.
 *
 * `{name}` in a value is an interpolation slot.
 */
export const en = {
  /* ── Shell ─────────────────────────────────────────────────────────────── */
  'shell.menuLabel': 'Open menu',
  'shell.profileLabel': 'Open profile and settings',

  /* ── Shared across overlays ────────────────────────────────────────────── */
  'common.closeLabel': 'Close',

  /* ── Shared across the flow ──────────────────────────────────────────────
     Three words that appear on four screens each. Written once: "Continue"
     rendering as two different strings in two steps of one wizard is exactly
     the drift a catalogue exists to stop. */
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.cancel': 'Cancel',

  /* ── Nav drawer ────────────────────────────────────────────────────────── */
  'menu.title': 'Menu',
  /* The <nav> landmark's name, distinct from the dialog's. */
  'menu.pagesLabel': 'Pages',
  /* More specific than the shared "Close": there are two overlays and a
     screen reader user hears only the label. */
  'menu.closeLabel': 'Close menu',
  'menu.startSession': 'Start a session',
  'menu.continueSession': 'Continue session',
  'menu.yourDiary': 'Your diary',
  'menu.aboutYou': 'About you',
  'menu.howItWorks': 'How Musie works',

  /* ── Settings sheet ────────────────────────────────────────────────────── */
  'settings.darkMode': 'Dark mode',
  'settings.userType': 'Here as',
  'settings.language': 'Language',
  /* Provisional, not placeholder: the content IS translated, but the
     Mindfulness Cards spreadsheet still owns that copy and will replace it. */
  'settings.languageHint': 'Content translations are provisional.',

  /* ── Loading, failure, emptiness ───────────────────────────────────────── */
  'content.loading': 'Loading…',
  /* Message renders `headline` as a heading and `text` as a paragraph, so
     the one sentence splits: a heading should not end in a full stop. */
  'content.error': 'This content could not be loaded',
  'content.errorDetail': 'Check your connection and try again.',
  'content.empty': 'There is nothing here yet.',

  /* ── About Musie · D.1 ───────────────────────────────────────────────────
     THE FIVE SLIDES ARE OURS. The prototype wrote them, they are about the
     product rather than about any exercise, and no spreadsheet is coming for
     them — so rule 6 applies and the German below them is written, not owed.

     The prototype's slides also carried a second line each; none of them was
     ever rendered, because `.musy-carousel__card` has a badge and a title and
     no third part. They are not carried over. Logged in the Carousel's build
     notes as a copy decision for Ben. */
  'about.greeting': "Hi, I'm Musie.",
  'about.pitch': 'I help you feel and act more mindful, aware, connected and safe through the power of music',
  /* The typing indicator's accessible name. The dots are decorative; this is
     what a screen reader gets while the second message is on its way. */
  'about.typing': 'Musie is typing',
  'about.carouselHeadline': 'How we play with music',
  'about.carouselLabel': 'How a session works',
  'about.slide.situation': 'You help me understand your situation',
  'about.slide.recommend': 'I recommend you music based methods for your context',
  'about.slide.listen': 'Curated music and instructions will trigger some things in you',
  'about.slide.reflect': 'I guide you through a reflection',
  'about.slide.share': 'If you want to, I help you share your thoughts',
  'about.previousSlide': 'Previous step',
  'about.nextSlide': 'Next step',
  'about.slideLabel': 'Step {position} of {total}: {title}',
  'about.dotLabel': 'Step {position}',
  'about.goToSlide': 'Go to step {position} of {total}',
  /* Three hints under one CTA, and which one shows is the whole of the gate:
     locked until the last slide has been SEEN, then either "next I'll ask" or
     "ready", depending on whether a user type is already recorded. */
  'about.hint.unseen': 'Check out how a session will work before starting.',
  'about.hint.next': "Next I'll ask who you are here as.",
  'about.hint.ready': 'Ready when you are.',

  /* ── About you · D.2 ─────────────────────────────────────────────────────
     "Methods" became "exercises" everywhere in the product, so the prototype's
     sentence is carried over with that one word changed and nothing else. */
  'aboutYou.headline': 'And who are you here as?',
  'aboutYou.text': 'I use this to narrow down the exercises I offer you. You can change it here any time.',
  'aboutYou.legend': 'Who are you here as?',
  'aboutYou.hint.pick': 'Pick one to carry on.',
  'aboutYou.hint.ready': 'Ready when you are.',

  /* ── Not implemented · D.2 ───────────────────────────────────────────────
     Shown when someone picks one of the three unbuilt user types ON THE
     ONBOARDING SCREEN. /settings deliberately does NOT show it — see the
     comment on SettingsSheet's UserTypeChoice. The two screens differ on
     purpose: this one is a gate on the way into a session and has to say why
     it will not open, where settings is a preference you are entitled to
     record whether or not it does anything yet. */
  'notImplemented.title': 'Not implemented yet',
  'notImplemented.text': 'Musie only builds the “By myself” path so far, with the Quick Mindfulness Break exercise.',
  'notImplemented.back': 'Back to the choice',

  /* ── Exercises ───────────────────────────────────────────────────────────── */
  'exercises.timeframe': '{min}–{max} minutes',
  'exercises.notImplemented': 'Not available yet',
  'exercises.headline': 'What would you like to start with now?',
  'exercises.legend': 'Choose an exercise',
  /* THE GLYPH LEGEND — the shortest true word for each of the three fact
     glyphs, above the cards. A key is only useful before the thing it
     explains. */
  'exercises.legend.time': 'Time',
  'exercises.legend.cards': 'Card deck',
  'exercises.legend.sound': 'Sound',
  /* The facts themselves. Each is announced in full; only the duration has a
     short form worth drawing beside its glyph. */
  'exercises.fact.time': 'Takes {min} to {max} minutes',
  'exercises.fact.timeShort': '{min}–{max} min',
  'exercises.fact.cards': 'Needs your Mindfulness Cards deck',
  'exercises.fact.sound': 'Sound on — headphones recommended',
  /* The escape hatch for "I don't want to choose". It picks among the
     IMPLEMENTED exercises only — the prototype picked among all three and then
     opened the not-implemented lightbox two times in three. */
  'exercises.surpriseMe': 'Let Musie pick an exercise',
  'exercises.detail.needs': 'You need',
  'exercises.detail.duration': 'Duration',
  'exercises.start': 'Start exercise',
  /* The database refuses a second running session (a partial unique index), so
     this is a real outcome rather than a defensive branch. It is a Message
     with a way forward, not an error: the session it collides with is the
     user's own and is one tap away. */
  'exercises.alreadyRunning': 'A session is already running',
  'exercises.alreadyRunningDetail': 'Finish or close the one you are in before starting another.',
  'exercises.goToSession': 'Continue that session',

  /* ── The session ─────────────────────────────────────────────────────────
     The four step ids are `intro · scan · listen · reflect` (routeHandle.ts).
     These are their DISPLAY names, and the split is the point: the ids are
     English slugs in the URL and in `sessions.step`, the copy is per locale.
     The same split the schema uses everywhere else. */
  'session.step.intro': 'Intro',
  'session.step.scan': 'Scan',
  'session.step.listen': 'Listen',
  'session.step.reflect': 'Reflect',
  'session.status.finished': 'Finished',
  'session.status.abandoned': 'Unfinished',

  /* ── The session screen · D.4 ─────────────────────────────────────────── */
  'session.wizardLabel': 'Session steps',
  'session.notFound': 'This session does not exist',
  'session.notFoundText': 'It may have been deleted, or it belongs to another browser.',
  /* CLOSING FROM INSIDE. The nav drawer offers no way out while a session is
     running — that follows from the one-running-session index — so without
     this control the only exit is to finish. Confirmed, because the row it
     writes is permanent and appears in the diary as unfinished. */
  'session.close': 'Close this session',
  'session.close.title': 'Close this session?',
  /* IT SAYS THE RUN CANNOT BE PICKED UP AGAIN, and that is the product rather
     than a technical limit: the exercise works from the state you are in NOW,
     and an hour later that is a different state. Resuming would be finishing
     somebody else's session. Better to say so here than to let someone close
     it expecting to come back. */
  'session.close.text': 'You cannot pick this one up again — the exercise works from how you feel right now, and that will have moved on by the time you come back. It stays in your diary marked unfinished, and you can start a fresh session whenever you like.',
  'session.close.confirm': 'Close the session',

  /* ── Intro · D.5a ────────────────────────────────────────────────────────
     A FALLBACK, AND IT IS OURS RATHER THAN THE SPREADSHEET'S. Every exercise
     is meant to supply its own `intro_text`, and none of the three does yet
     (28 owed strings, DOMAIN-MODEL.md). This one sentence is what the intro
     step says when the exercise says nothing — chrome, permanent, and true of
     every exercise, so it is correct copy rather than a placeholder. It is
     simply never rendered once an exercise has its own words. */
  'session.intro.fallback': 'Take a moment to arrive. When you are ready, carry on.',

  /* ── Scan · D.5a, and the real reader · E.0/E.1 ──────────────────────────
     THE SIMULATE BUTTON IS GONE, and the three strings that described it went
     with it. Two real ways in replace it, and the frame names both: the QR
     code on the card carries a link, so the PHONE'S OWN camera app opens Musie
     at that card without Musie ever touching a camera — and the code printed
     beside it can be typed. The in-app reader (E.2, E.3) is still missing and
     the frame still says so, which is MOCKUPS.md's standard: a surface that
     does not do what it appears to do says so rather than pretending. */
  'session.scan.headline': 'Scan the card that describes best how you feel right now.',
  'session.scan.reader': 'Scan the QR code on your card with your phone’s camera app — it opens Musie at that card.',
  'session.scan.readerNote': 'Musie cannot open the camera itself yet.',
  'session.scan.codeLabel': 'Card code',
  /* An EXAMPLE, not a label (3.3.2): the label above names the field and this
     shows the shape. `MC-01` is a real code, so it is not translated. */
  'session.scan.codePlaceholder': 'MC-01',
  'session.scan.codeHint': 'The code is printed beside the QR code, like MC-01.',
  'session.scan.codeSubmit': 'Use this card',
  /* THREE ANSWERS, AND TWO OF THEM ARE NOT FAILURES. A typo and a card from
     another deck are things a person did, said in the field's own error slot.
     Only the third is the app failing, and it says so without blaming the code
     that was typed. */
  'session.scan.codeMalformed': 'A card code looks like MC-01. Check the one printed on your card.',
  'session.scan.codeUnknown': 'No card in this deck carries the code {code}.',
  'session.scan.codeFailed': 'That could not be checked. Try again in a moment.',
  /* Pre-filled from a code scanned before there was a session to put it in
     (lib/scan.ts). It says where the code came from, because a field that
     filled itself without explanation is the app having decided something. */
  'session.scan.heldHint': 'This is the card you scanned. Use it, or type a different code.',
  'session.scan.done': 'Card scanned',
  'session.scan.yourCard': 'Your card',
  'session.scan.again': 'Scan a different card',

  /* ── Listen · D.5b ───────────────────────────────────────────────────────
     THE TRACK HAS NO NAME HERE, and that is the exercise rather than a gap:
     `tracks.title` and `.artist` are not granted to the client at all. The
     reveal is E.5. */
  'session.listen.track': 'Your track',
  'session.listen.gateMet': 'Enough of the track is behind you. Listen on as long as you like, or start the reflection now.',
  'session.listen.gateLocked': 'Listen to as much of the track as you want — {gate} is the minimum for this exercise, {left} to go.',
  'session.listen.start': 'Start reflection',
  /* There are no audio files (E.4), so the transport runs on a clock at the
     track's real length. Said on screen, for the same reason as the scanner. */
  'session.listen.simulated': 'No recording is bundled yet, so the player runs on a clock at the track’s real length.',
  'session.listen.noTrack': 'This exercise has no recording yet.',

  /* ── Reflect · D.5c ────────────────────────────────────────────────────── */
  /* ONE QUESTION, SHOWN ON BOTH the listen and the reflect step — that is the
     schema's own shape, and this is what stands in until an exercise supplies
     its own. The prototype had the same fallback, word for word. */
  'reflect.questionFallback': 'What stayed with you?',
  'reflect.legend': 'How would you like to answer?',
  'reflect.mode.voice': 'Record audio',
  'reflect.mode.text': 'Write answer',
  'reflect.mode.photo': 'Take photo',
  'reflect.text.label': 'Your written answer',
  'reflect.text.placeholder': 'A sentence is enough.',
  'reflect.voice.label': 'Your spoken answer',
  'reflect.voice.record': 'Record answer',
  'reflect.voice.recording': 'Recording',
  'reflect.voice.status': 'Recording, {elapsed} in, {remaining} left',
  'reflect.photo.label': 'Photo of your handwritten notes',
  'reflect.photo.zone': 'Drag a photo here, or choose one from your device.',
  'reflect.photo.choose': 'Choose photo',
  'reflect.photo.replace': 'Replace',
  'reflect.photo.remove': 'Remove photo',
  'reflect.photo.previewAlt': 'The photo of your handwritten notes',
  /* VOICE AND PHOTO ARE UI ONLY, and both say so where the answer would go.
     Voice is Phase F; photo is waiting on which model reads handwriting. Both
     produce words and neither produces a file — see MOCKUPS.md 1 and 2. */
  'reflect.voice.notBuilt': 'Recording is not built yet',
  'reflect.voice.notBuiltText': 'This shows how it will work. Your words will be turned into text and only the text kept — the recording itself is never stored.',
  'reflect.photo.notBuilt': 'Reading a photo is not built yet',
  'reflect.photo.notBuiltText': 'This shows how it will work. The photo stays on your device and is read back as text; the image is never uploaded.',
  /* NOT a fourth segment — three ways to answer and one way not to are
     different kinds of choice, and a segment would make refusal look like a
     method. It sits in the action row beside Finish, as the alternative to it,
     and it ENDS the session: no `reflections` row, `status = 'finished'`. */
  'reflect.skip': 'Skip reflection',
  'reflect.finish': 'Finish session',

  /* ── Diary ───────────────────────────────────────────────────────────────
     `{step}` takes a `session.step.*` value, already translated — the diary
     never interpolates a raw step id. */
  /* The most recent session, lifted out of the list and given a box of its
     own. A heading rather than a label: it names a region, and the entry
     under it carries its own labelled rows. */
  'diary.latest': 'Your last session',
  'diary.openEntry': 'Open this entry',
  'diary.earlier': 'Earlier',
  'diary.timelineLabel': 'Your sessions, newest first',
  'diary.listLabel': 'Diary entries',
  'diary.empty': 'No sessions yet',
  'diary.emptyText': 'Finish a session and it appears here.',
  'diary.stoppedAt': 'Stopped at {step}',
  'diary.duration': '{minutes} min',
  'diary.when': 'When',
  'diary.howLong': 'How long',
  'diary.card': 'Card',
  /* No track NAME beside it, and that is the column grant rather than an
     omission: `tracks.title` and `.artist` are not granted to the client at
     all, so the diary can offer the recording back without being able to say
     what it was. Naming it needs E.5's reveal function. */
  'diary.listenAgain': 'Listen again',
  'diary.yourAnswer': 'Your answer',
  'diary.notFound': 'This diary entry does not exist',
  /* DELETION. The confirm is not a formality: the row and its answer go for
     good — `reflections` cascades — and there is no undo, because a diary the
     user asked to forget something from should forget it. */
  'diary.collapse': 'Close this entry',
  'diary.delete': 'Delete this session',
  'diary.delete.confirm': 'Delete this session?',
  'diary.delete.text': 'This removes the session and anything you wrote in it. It cannot be undone.',
  'diary.delete.yes': 'Delete',

  /* ── Privacy · C.2 ───────────────────────────────────────────────────────
     THE PROTOTYPE'S PROMISE WAS "Nothing leaves your device until you share
     it", and a stored diary makes that false. These six strings are what
     replaced it, and every one of them is true of the code as it stands:

       · only TEXT is ever stored (D1). No recording, no photo, no bucket;
       · RLS scopes every session and reflection to its own account, proved by
         `pnpm test:db` rather than asserted here;
       · there is no sharing feature to qualify — the Share step was cut.

     The voice and photo lines are true TODAY, when neither is implemented, and
     true LATER, when voice transcribes to text and photo still uploads
     nothing. Copy that survives the feature landing is copy nobody has to
     remember to revisit.

     AWAITING SIGN-OFF from Ben and his co-founder. It is a promise to users
     rather than a screen, which is why it is written before a screen shows
     it. */
  'privacy.title': 'What Musie keeps',
  'privacy.account': 'Musie never asks for your name or your email. This browser holds a private account of its own, and your diary belongs to it.',
  'privacy.written': 'What you write is saved to your diary so you can read it back later. Nobody else can see it.',
  'privacy.voice': 'If you answer out loud, Musie turns your words into text and keeps only the text. The recording itself is never stored.',
  'privacy.photo': 'A photo you take stays on your device. Musie never uploads it.',
  /* The uncomfortable one, and the reason it is here: an anonymous account
     living in browser storage is a real limitation, not a detail. Saying it
     plainly is the difference between a private product and a careless one. */
  'privacy.browserBound': 'Because the account lives in this browser, clearing its data also clears your diary. There is no way to get it back.',

  /* ── The deep link and the dev sheet · E.0 ───────────────────────────────
     `/s/:code` is where a QR code lands: the phone's camera app follows the
     link, the app finds the card and puts it in the running session, and the
     person is on the scan step holding what they drew. Four of these five
     screens are the ways that can fail to happen, and none of them is an
     error message — each says what is true and offers the one way on.

     THE ROUTE NEVER NAMES A HOST, so none of this copy can either. */
  'scan.route.title': 'Scanned card',
  'scan.working': 'Looking up that card…',
  'scan.malformed.title': 'That is not a card code',
  'scan.malformed.text': 'The code in that link is not one of Musie’s. A card code looks like MC-01.',
  'scan.unknown.title': 'No card with that code',
  'scan.unknown.text': 'The code {code} is not in this deck.',
  /* NOT AN ERROR, and the commonest one of the five: somebody with the deck in
     their hands scans a card before starting anything. The code is held and
     the scan step will have it typed in — see `lib/scan.ts`. */
  'scan.noSession.title': 'You scanned {code}',
  'scan.noSession.text': 'Nothing is running yet. Choose an exercise, and this card will be waiting at the scan step.',
  'scan.chooseExercise': 'Choose an exercise',
  /* A cardless exercise skips the scan step entirely, so a scanned card has
     nowhere to go. Said plainly rather than silently ignored. */
  'scan.cardless.title': 'This exercise draws no cards',
  'scan.cardless.text': 'The session you are in works without the deck, so this card has nowhere to go.',
  'scan.cardless.action': 'Back to the session',

  /* ── The dev QR sheet · E.0 ──────────────────────────────────────────────
     DEV-ONLY, AND LAZILY ROUTED so a visitor downloads none of it. It exists
     because E.2 and E.3 cannot be built or hand-tested without something to
     point a camera at, and the deck is not printed.

     It generates its codes from the origin it was LOADED from, which is what
     makes it work with no domain: open it on the laptop, scan it with the
     phone against the same dev server, and the link resolves. */
  'scan.dev.title': 'QR codes for the deck',
  'scan.dev.text': 'Generated from {origin}, so every code here points back at the server that served this page. Print day is the same codes from the generator script, with the real address.',
  'scan.dev.qrLabel': 'QR code for card {code}',

  /* ── Route titles · PLACEHOLDER SCAFFOLDING ────────────────────────────── */
  'route.aboutMusie.title': 'About Musie',
  'route.aboutYou.title': 'About you',
  'route.diary.title': 'Your diary',
  'route.diaryEntry.title': 'Diary entry',
  'route.exercises.title': 'Exercises',
  'route.session.title': 'Current session — {step}',
  'route.settings.title': 'Settings',
  'route.notFound.title': 'Not found',
} as const;

/** Every catalogue must answer to this shape. */
export type Messages = Record<keyof typeof en, string>;
export type MessageKey = keyof typeof en;
