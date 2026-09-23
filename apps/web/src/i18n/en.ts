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
  /* 'Completed', not 'Finished' (Ben, 2026-09-23). Both are true and only one
     of them is worth reading: finishing a session is an achievement, and the
     badge carries the success treatment to say so. 'Finished' is what a
     progress bar says. The word is shared with the diary's filter segment,
     which is the point — one state, one name. */
  'session.status.finished': 'Completed',
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

  /* ── Scan · D.5a, and the three ways in · E.0/E.1/E.2/E.3 ───────────────
     THE SIMULATE BUTTON IS GONE, and the three strings that described it went
     with it. THREE real ways in replace it, and the frame names all of them:
     the QR code on the card carries a link, so the PHONE'S OWN camera app
     opens Musie at that card without Musie ever touching a camera; the code
     printed beside it can be typed; and E.2 opened the camera on this device
     for the person who had the app open already.

     `readerNote` used to say the in-app camera did not exist. It does, so the
     sentence changed rather than being deleted — MOCKUPS.md's standard cuts
     both ways, and a frame still claiming it cannot see is the same defect as
     one pretending it can. */
  'session.scan.headline': 'Scan the card that describes best how you feel right now.',
  'session.scan.reader': 'Scan the QR code on your card with your phone’s camera app — it opens Musie at that card.',
  'session.scan.readerNote': 'Or use the camera on this device — it reads the same code.',
  'session.scan.codeLabel': 'Card code',
  /* An EXAMPLE, not a label (3.3.2): the label above names the field and this
     shows the shape. `MC-01` is a real code, so it is not translated. */
  'session.scan.codePlaceholder': 'MC-01',
  /* The disclosure that opens the field. A VERB PHRASE, because it is an
     action and not the name of a section — the field it reveals is already
     labelled 'Card code'. */
  'session.scan.codeManual': 'Enter the code by hand',
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

  /* ── The camera on THIS device · E.2, and E.3's fallback ─────────────────
     A FALLBACK TO A FALLBACK, and the copy is written from that: the common
     way in is the phone's own camera app following the printed link, and the
     typed field below the frame never stops working. So every sentence here
     that says the camera is unavailable ends by naming the field, and none of
     them apologises.

     `cameraDenied` is the one that was written twice. A permission prompt
     answered with no is a person deciding, not a failure — so it states what
     is now true and moves on, with no 'unfortunately', no instructions for
     reversing it in browser settings, and no button offering to ask again
     (`canRetry` in lib/camera.ts). */
  'session.scan.cameraStart': 'Use the camera',
  'session.scan.cameraRetry': 'Try the camera again',
  'session.scan.cameraStop': 'Turn the camera off',
  'session.scan.cameraStarting': 'Opening the camera…',
  /* Shown BELOW the frame rather than over the picture: text on top of live
     video has no contrast that can be checked, because the background is
     whatever the camera is pointed at. */
  'session.scan.cameraLive': 'Hold the QR code on your card inside the frame.',
  'session.scan.cameraLabel': 'Camera, looking for a QR code',
  /* The difference between a scanner that is wrong and one that is broken: a
     frame that never reacts looks identical to a frame that cannot see. */
  'session.scan.cameraOther': 'That QR code is not one of Musie’s. A card’s code looks like MC-01.',
  'session.scan.cameraDenied': 'The camera stays off. Type the code printed on your card instead.',
  'session.scan.cameraMissing': 'This device has no camera Musie can use. Type the code printed on your card instead.',
  'session.scan.cameraBusy': 'Another app is using the camera. Close it and try again, or type the code printed on your card.',
  'session.scan.cameraInsecure': 'A browser opens the camera only over a secure connection. Type the code printed on your card instead.',
  'session.scan.cameraUnsupported': 'This browser will not open a camera here. Type the code printed on your card instead.',
  /* E.3's decoder is fetched the first time the camera is used, so this is a
     connection problem rather than a camera problem, and it says so. */
  'session.scan.cameraDecoder': 'The code reader could not be loaded. Check your connection and try again, or type the code printed on your card.',
  'session.scan.cameraFailed': 'The camera could not be started. Type the code printed on your card instead.',

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
  /* ── The three scroll views · E.5b ──────────────────────────────────────
     The prototype's listen step is three stacked viewports and this is their
     copy. The Störer's sentence is the prototype's own, lightly tightened:
     it interrupts rather than warns, and its measure is narrow so it lands as
     one thought. */
  'session.listen.detailsAction': 'Track details and player',
  'session.listen.warnText': 'For this exercise it is better not to be influenced by the track’s name or its cover.',
  'session.listen.warnBack': 'Continue the exercise',
  'session.listen.warnOn': 'Show details and player',
  'session.listen.scrollUp': 'Scroll up',
  /* The player's own words. Passed explicitly because the design system's
     defaults are a mix of languages — CLAUDE.md 7. */
  'session.listen.play': 'Play',
  'session.listen.pause': 'Pause',
  'session.listen.restart': 'Play again',
  'session.listen.seek': 'Position in the track',
  'session.listen.aboutHeading': 'About this track',
  'session.listen.aboutArtist': 'Artist',
  'session.listen.aboutInstructions': 'Listening instructions',
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
  /* PHOTO IS UI ONLY and says so where the answer would go — it is waiting on
     which model reads handwriting (MOCKUPS.md 2).

     `reflect.voice.notSaved` AND ITS PARAGRAPH ARE GONE (2026-09-23). They
     said a spoken answer could not be saved, which F.6 made false, and they
     said it in a five-line info box on a screen whose job is to get an answer
     out of somebody. What the step says now is `privacy.voiceShort` — the
     promise, one line — with the rest behind `privacy.more`. */
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
  /* The exercise's own description, which is a row in the list now rather
     than prose under the headline. The label is a question the value answers,
     like the three below it. */
  'diary.about': 'What this exercise is',
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

  /* ── The timeline at a month's scale · G.1 ───────────────────────────────
     Two words the catalogue holds because `Intl` cannot: a date formatter can
     render 'Friday 18 September' in either language, and neither language's
     word for the day you are standing in is derivable from a date. Every
     other heading in the run is formatted, not written — see lib/diary.ts. */
  'diary.today': 'Today',
  'diary.yesterday': 'Yesterday',
  /* The filter. 'Finished' and 'Unfinished' are NOT repeated here: the two
     segments reuse `session.status.*`, which is the same word the badge on
     the entry card already shows. Two spellings of one status is how a filter
     and the thing it filters stop agreeing. */
  'diary.filter.legend': 'Show',
  'diary.filter.all': 'All',
  /* THE EMPTY STATE THAT READS WELL AFTER THIRTY SESSIONS, which is a
     different sentence from the one that reads well on day one. 'No sessions
     yet' is about a diary that has never held anything; these two are about a
     diary that holds plenty and none of it matches. Each says which, because
     "nothing matches this filter" makes the reader do the work. */
  'diary.filter.noneFinished': 'No finished sessions',
  'diary.filter.noneFinishedText': 'Nothing in your diary has been finished yet.',
  'diary.filter.noneAbandoned': 'No unfinished sessions',
  'diary.filter.noneAbandonedText': 'Everything you started, you finished.',
  'diary.filter.showAll': 'Show every session',

  /* ── Deleting the whole diary · G.2 ──────────────────────────────────────
     It lives in /settings rather than on /diary — see SettingsSheet.tsx for
     why — and its heading is `route.diary.title`, reused rather than written
     again, so the section can never end up calling the diary something the
     rest of the app does not.

     THE TEXT NAMES THE RUNNING SESSION ON PURPOSE. `deleteAllSessions` has no
     status filter, so a session in progress goes with the rest; a sentence
     that said "every session" while quietly meaning "except that one" would
     be the one sentence in the product that has to be exactly true. */
  'diary.deleteAll': 'Delete your whole diary',
  'diary.deleteAll.confirm': 'Delete your whole diary?',
  'diary.deleteAll.text': 'This removes every session and everything you wrote in them, including one you are in the middle of. Nothing is kept, and it cannot be undone.',
  'diary.deleteAll.yes': 'Delete everything',
  'diary.deleteAll.failed': 'Your diary could not be deleted',

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
  /* THE PROMISE IN ONE LINE, for the reflect step, where the long version was
     a box nobody read. It is not an abbreviation of `privacy.voice` so much as
     the half of it that is a promise — the mechanism is in the lightbox. */
  'privacy.voiceShort': 'Musie keeps the text, never your voice.',
  /* The word in that sentence that opens the whole promise. Not 'Learn more':
     it names what is behind it, which is what a link in running text has to
     do when the sentence around it is doing the explaining. */
  'privacy.more': 'More about your data',
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
  /* ── Voice · what @musie/voice could not say for itself ─────────────────
     F.0 brought the voice proof-of-concept in as a package below the app, and
     a package below the app cannot hold a user-visible string: it has no
     German, and it is not reachable from this catalogue. So the feature
     reports a CODE for everything that goes wrong, and these are the
     sentences those codes resolve to. The map is src/lib/voiceMessages.ts,
     and it is a Record over the code union — a code with no entry here is a
     typecheck error, in both languages.

     WHAT THE POC SAID INSTEAD, and why none of it survived: "Rate limit
     reached — this sentence was skipped. Each sentence is one request, so
     free-tier accounts (3 per minute) run out quickly", and "Add credits at
     platform.openai.com/settings/organization/billing". That is operator
     copy. The person holding the phone has no OpenAI account, cannot add
     credits to one, and does not need to learn that a transcription service
     exists to be told that Musie cannot listen and that writing still works.

     There is no headline key yet, deliberately. Whether these land in a
     Message, a Toast or inline text is F.4's decision, and a headline written
     for a component nobody has chosen is the placeholder this repo does not
     ship. */
  'voice.error.micDenied': 'Musie needs your microphone to hear you. Allow it in your browser settings, then start again.',
  'voice.error.micNotFound': 'This device has no microphone Musie can use. Write your answer instead.',
  'voice.error.micUnavailable': 'The microphone could not be opened. Close whatever else is using it, then start again.',
  'voice.error.recorderFailed': 'Recording could not start on this device. Write your answer instead.',
  'voice.error.connectionFailed': 'Musie cannot reach the service that turns your words into text. Check your connection and start again.',
  /* Not an apology and not a warning: the words already heard are still
     there, and saying so is the only thing the reader needs. */
  'voice.error.connectionClosed': 'The connection dropped. Everything Musie had already heard was kept.',
  /* An expired key, a rejected setting and an empty account are three
     different faults and one situation for the reader: it is ours, and there
     is a way to finish the session anyway. */
  'voice.error.connectionRejected': 'Musie cannot listen right now. That is on our side, not yours — write your answer, or try again later.',
  'voice.error.segmentationRejected': 'Musie could not set the recording up. That is on our side, not yours — write your answer, or try again later.',
  'voice.error.noCredits': 'Musie cannot turn words into text at the moment. That is on our side, not yours — write your answer instead.',
  'voice.error.providerError': 'Something went wrong while Musie was listening. Write your answer, or try again.',
  /* The one that is NOT fatal. Recording is still running, so the sentence is
     to carry on rather than to start over. */
  'voice.warning.rateLimited': 'One sentence could not be turned into text. Say it again, and keep going.',
  /* What an undo offer is undoing. Combining and deleting destroy text;
     editing has its own Discard and needs no offer. */
  'voice.undo.combined': 'Statements combined',
  'voice.undo.deleted': 'Statement deleted',
  /* The one word the offer needs. Toast takes exactly one action (§7.23) and
     this is it — the toast's own text already says what happened. */
  'voice.undo.action': 'Undo',
  'voice.undo.dismiss': 'Dismiss',

  /* ── Voice · the editor · F.4 ────────────────────────────────────
     The screen is §7.24's Draggable List, and §7.24 ships a default for every
     one of these in the package's own locale catalogue (src/locale.ts). They
     are passed anyway, all of them, because they are the transcript's words
     rather than the component's: the noun a statement is called here is what
     the drag handle, the chevron, the hidden headline and five keyboard
     announcements are all built from, and the list's own accessible name is
     `reflect.voice.label` — the answer, not a generic transcript.

     WHAT IS DELIBERATELY LEFT TO THE CATALOGUE: the four row controls (Edit,
     Delete, Save, Discard) and the five keyboard announcements, which have no
     props at all. See the note in DiaryCard.tsx for the same call — the
     catalogue is the floor under the strings a screen cannot pass, and
     `MusyLocaleProvider` in main.tsx keeps it in the reader's language. */
  'voice.item.noun': 'statement',
  'voice.empty.headline': 'Nothing captured yet',
  'voice.empty.text': 'Finished statements appear here, one box each, in the order you said them.',
  /* The same box in two more states, so the page does not change shape when
     words start arriving (L10). One is heard-something-nothing-back, the
     other is carrying the words as they land. */
  'voice.listening': 'Listening',
  'voice.hearing': 'Hearing you',
  /* Under the finger mid-drag, phrased as what letting go WOULD do. Naming
     the target's position is the only thing that separates a merge from a
     reorder before the reader commits. */
  'voice.drop.combine': 'Join into {position}',
  'voice.drop.before': 'Move above {position}',
  'voice.drop.after': 'Move below {position}',
  'voice.drop.cancel': 'Let go to leave it where it was',
  /* Not 'Record answer' a second time: recording again APPENDS, and a button
     still offering to record the answer over five statements reads as start
     over — which is the one thing it does not do. */
  'voice.record.more': 'Record more',
  'voice.record.connecting': 'Connecting…',
  /* Both cut-offs, every time. A recorder that stops on its own without
     having said that it would is indistinguishable from a broken one. */
  'voice.hint.first': 'Each pause finishes a statement. Recording stops on its own after {seconds} seconds, or after {silence} seconds of quiet.',
  'voice.hint.more': 'New statements are added to the end of the list. Recording stops on its own after {seconds} seconds, or after {silence} seconds of quiet.',
  /* Shown only when the list can actually be edited, and it names the
     keyboard route as well as the drag — F.5's behaviour is invisible
     otherwise, and a control nobody can find is not a control. */
  /* THE TIPS ARE ASKED FOR NOW, not standing. `voice.hint.edit` is unchanged
     and is the panel's body; the three around it are the disclosure. The
     headline names what the panel is about rather than repeating the button,
     so the two are not the same string read twice. */
  'voice.hint.editToggle': 'Editing tips',
  'voice.hint.editHeadline': 'Moving and joining statements',
  'voice.hint.editHide': 'Hide these tips',
  'voice.hint.edit': 'Drag a statement to move it, or drop it onto another to join the two. From the keyboard: focus a drag handle, then space to lift, arrow keys to move, M to join it to the one above, escape to put it back.',
  /* The recorder acting on its own. A manual stop explains itself, and an
     error already has a Message of its own — see lib/voiceScreen.ts. */
  'voice.stopped.headline': 'Recording stopped',
  'voice.stopped.timeout': 'That was the {seconds} seconds. Everything Musie heard is in the list, and you can record more.',
  'voice.stopped.silence': 'It went quiet for {silence} seconds, so Musie stopped listening. Everything it heard is in the list.',
  /* The headlines the catalogue deliberately did not have before F.4 — the
     old note here said the component was still unchosen. It is Message, one
     for the fatal codes and one for the single non-fatal one, and they are
     worded apart so a warning is not read as a failure. */
  'voice.error.headline': 'Recording stopped',
  'voice.warning.headline': 'One statement was skipped',

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
