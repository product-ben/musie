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
  /* ONE HEADER BUTTON. `shell.profileLabel` went with /settings on 2026-09-24;
     the menu is the only overlay, so the only thing to label is opening it. */
  'shell.menuLabel': 'Open menu',

  /* ── Shared across overlays ────────────────────────────────────────────── */
  'common.closeLabel': 'Close',

  /* ── Shared across the flow ──────────────────────────────────────────────
     Three words that appear on four screens each. Written once: "Continue"
     rendering as two different strings in two steps of one wizard is exactly
     the drift a catalogue exists to stop. */
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.cancel': 'Cancel',

  /* ── The sign-in gate · H.0b ─────────────────────────────────────────────
     SIGN IN AND SIGN OUT, AND NOTHING ELSE. There is deliberately no 'forgot
     your password', no 'create an account' and no 'sign in with', because all
     three need a sending provider and a sending domain, and the domain is
     undecided (decision 1 at the foot of BUILD-PLAN.md). A control that cannot
     work must not be drawn: a reset link that sends nothing is worse than no
     link, because the tester waits for a mail instead of asking for help. For
     the beta a password is reset in the dashboard by whoever handed it out.

     THE FAILURE IS SPLIT FOUR WAYS, which is not over-engineering: retyping
     fixes a wrong password and cannot touch an unreachable server, and telling
     somebody on a train that their password is wrong is a support request that
     ends in "it was the wifi".

     NO SENTENCE NAMES AN ADDRESS OR A DOMAIN. Testers are handed credentials by
     hand, so the copy cannot promise a mail will arrive, cannot say where to
     write, and must not imply anyone can sign themselves up. */
  'auth.title': 'Sign in',
  'auth.intro': 'Musie is in closed testing. Sign in with the email address and password you were given.',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.submit': 'Sign in',
  /* A HEADING, so no full stop, and it names no cause — the cause is the `text`
     beneath it and there are four of those. */
  'auth.failed': 'That did not work',
  'auth.error.missing': 'Fill in both your email address and your password.',
  /* Names a person, deliberately and temporarily — see the German. There is no
     password reset in the beta, so asking Ben IS the recovery path, and it goes
     when H.1 gives it a real one. */
  'auth.error.credentials': 'That email address and password do not match an account. Check both and try again. If it still will not work, let Ben know.',
  /* Unreachable while H.0's script passes `email_confirm: true` — and written
     anyway, because on the day it IS reachable there is no mail to fix it with,
     so the sentence has to point at a person rather than at an inbox. */
  'auth.error.notConfirmed': 'That account has not been confirmed yet. Ask whoever gave you the password.',
  'auth.error.rateLimit': 'Too many attempts. Wait a minute and try again.',
  'auth.error.unknown': 'Something went wrong signing you in. Try again in a moment.',
  /* The TRANSPORT failure reuses `content.errorDetail` rather than adding a
     fifth sentence: 'Check your connection and try again.' is already the app's
     one way of saying that, and two spellings of it is the drift this catalogue
     exists to stop. See lib/signIn.ts. */

  /* ── The account, in the menu · H.0b ─────────────────────────────────────
     Shown ONLY to a user who has an email address. An anonymous user has none,
     and offering them 'Sign out' would draw them a button that strands their
     whole diary on an id nobody can reach — the data-loss shape H.0 exists to
     keep away from testers, rendered as a control. See MenuPreferences (it was
     SettingsSheet until 2026-09-24).

     The address is SHOWN because these accounts are handed out and a workshop
     phone may be passed between people. "Which of us is this?" has to be
     answerable without signing out to find out. */
  'auth.account': 'Account',
  'auth.signedInAs': 'Signed in as {email}',
  'auth.signOut': 'Sign out',

  /* ── The closed-beta landing page · /beta ─────────────────────────────────
     THE ONE PAGE IN THIS APP NOBODY SIGNS IN TO. It sits beside the gate above
     rather than with the screens below it, because that is what it is: the
     other thing a person who has no account can see. The gate is for somebody
     who was given one; this is for somebody asking.

     ── IT REUSES THE PITCH RATHER THAN RESTATING IT ────────────────────────
     `about.greeting` and `about.pitch` ARE what Musie is, in Musie's own
     words, and the three beats under them are `about.slide.*` — so there is
     one spelling of the pitch in this catalogue and a rewrite of it changes
     both pages. What is written here is only what this page ADDS: the three
     terms over those beats, and everything the form says.

     ── THE VOICE IS MUSIE'S, FIRST PERSON SINGULAR ─────────────────────────
     'I will write to you', not 'we will be in touch'. The page opens with
     "Hi, I'm Musie." and a sentence later switching to a company's 'we' would
     be a second speaker arriving unannounced. The mail itself will be sent by
     a person, which is why `beta.done.text` promises a message rather than a
     sender.

     THE RADIO OPTIONS ARE THE EXCEPTION, and they are in the READER'S voice:
     they are the reader's answer to a question, like the user type labels
     (`aboutYou.*`). docs/GERMAN-UI-WRITING.md §1 names exactly this case.

     ── THE OPTIONS ARE A LIST THAT GROWS ───────────────────────────────────
     One `beta.reason.<code>` per entry in `lib/betaReasons.ts`, and adding the
     fourth, fifth and sixth is a line there plus a key here and in de.ts. No
     migration: `beta_signups.reason_code` holds a slug and checks its SHAPE,
     not its membership. That file's header has the reasoning. */
  'beta.route.title': 'Closed beta',
  /* The three terms over `about.slide.*`, each one the slide's own verb: the
     arc is choose, be guided, keep track. */
  'beta.how.choose': 'Choose',
  'beta.how.guide': 'Be guided',
  'beta.how.diary': 'Keep track',
  'beta.headline': 'Register for the closed beta',
  'beta.intro': 'Musie is being tested with a small group first. Leave your first name and your email address and I will write to you as soon as there is a place.',
  'beta.firstName': 'First name',
  /* The same two words as `auth.email`, and deliberately its own key: this
     page's copy is edited by whoever is sharing the link, and the sign-in form
     of a closed beta must not change because a landing page was reworded. */
  'beta.email': 'Email address',
  'beta.reason.legend': 'How did you hear about Musie?',
  'beta.reason.ben': 'Via Ben',
  'beta.reason.lucy': 'Via Lucy',
  'beta.reason.uxdx': 'Via UXDX',
  /* The catch-all, and it is last on purpose — see the comment on BETA_REASONS
     in lib/betaReasons.ts. 'Somewhere else' rather than 'Other': it answers
     the question that was asked, which is where, not what. */
  'beta.reason.other': 'Somewhere else',
  'beta.submit': 'Register for the beta',
  /* WHAT HAPPENS TO THE ADDRESS, SAID ON THE PAGE THAT TAKES IT. A form that
     collects an email address and says nothing about it is asking for trust it
     has not earned, and this one is aimed at a German audience. It is one
     sentence because that is all that is true: the list is three columns, it
     is not readable with the key the browser holds (the table refuses it), and
     nothing is sent anywhere else. */
  'beta.privacy': 'Your name and address are used for the beta invitation and nothing else.',
  /* Field-level, each one next to the control it is about. Imperative, naming
     the next action rather than the rule that was broken. */
  'beta.error.firstName': 'Enter your first name.',
  'beta.error.email': 'Enter an email address, like you@example.com.',
  'beta.error.reason': 'Pick how you heard about Musie.',
  /* A HEADING, so no full stop, and it names no cause — the cause is the text
     beneath it. The same shape as `auth.failed`, and its own key for the same
     reason `beta.email` is. */
  'beta.failed': 'That did not work',
  /* ONE SENTENCE FOR EVERY REFUSAL THE SERVER CAN GIVE, which is not laziness:
     each of them — a check constraint, a missing grant, a table that was never
     pushed — is ours and not the reader's, and none is something they can act
     on. lib/betaSignup.ts says so where somebody would otherwise add four.
     A connection failure is NOT one of them; it gets
     `content.errorDetail`, the app's one sentence about a connection. */
  'beta.error.unknown': 'Something went wrong at my end. Try again in a moment.',
  /* Shown INSTEAD OF the form, and it is also what a second submit of the same
     address gets: that person is on the list, which is the whole of what this
     says. lib/betaSignup.ts has the argument. */
  'beta.done.headline': "You're on the list",
  'beta.done.text': 'Thanks, {name}. I will write to you at that address as soon as there is a place in the beta.',

  /* ── Nav drawer ────────────────────────────────────────────────────────── */
  'menu.title': 'Menu',
  /* The <nav> landmark's name, distinct from the dialog's. */
  'menu.pagesLabel': 'Pages',
  /* More specific than the shared "Close": there are two overlays and a
     screen reader user hears only the label. */
  'menu.closeLabel': 'Close menu',
  'menu.startSession': 'Start a session',
  /* THE SECOND THING YOU CAN DO ABOUT A RUNNING SESSION, under the first.
     The ampersand is Ben's, and it is kept in both languages — the same call
     `about.headline` made. 'End', not 'Close': the row ends the run AND opens
     the library, and 'close' says only the first half. */
  'menu.endSession': 'End session & start a new one',
  'menu.continueSession': 'Continue session',
  'menu.yourDiary': 'Your diary',
  'menu.aboutYou': 'About you',
  'menu.howItWorks': 'How Musie works',

  /* ── What the drawer SETS, under where it GOES ─────────────────────────────
     Both keys were `settings.*` and both moved, labels unchanged, when
     /settings was deleted on 2026-09-24. Renamed with the move: a key naming a
     route that no longer exists is the kind of thing that gets grepped for and
     not found.

     THREE KEYS DID NOT SURVIVE THE MOVE, and they are deletions rather than
     losses in the catalogue:

       `settings.userType` — *Here as*. /about-you asks the same question with
       `aboutYou.*` and writes the same column; the second spelling is gone with
       the second control (the behaviour that differed is logged in
       apps/web/OPEN-QUESTIONS.md, because that part IS a loss).
       `settings.languageHint` — *Content translations are provisional*. True,
       and a note about the project rather than about the control: it told a
       reader something no reader can act on, in a drawer where the space costs
       the account below it. The fact lives in the seed migration's header and
       in CLAUDE.md rule 6.
       `route.settings.title` — there is no route to title. */
  'menu.darkMode': 'Dark mode',
  'menu.language': 'Language',

  /* ── Loading, failure, emptiness ───────────────────────────────────────── */
  'content.loading': 'Loading…',
  /* Message renders `headline` as a heading and `text` as a paragraph, so
     the one sentence splits: a heading should not end in a full stop. */
  'content.error': 'This content could not be loaded',
  'content.errorDetail': 'Check your connection and try again.',
  'content.empty': 'There is nothing here yet.',

  /* ── About Musie · D.1 ───────────────────────────────────────────────────
     THE THREE SLIDES ARE OURS. They are about the product rather than about
     any exercise, and no spreadsheet is coming for them — so rule 6 applies
     and the German below them is written, not owed.

     THE GERMAN IS THE ORIGINAL HERE, and the English is the translation. Ben
     wrote these three lines after the 2026-09-25 user testing, in German; the
     five prototype slides they replace said the same thing in five beats, and
     a five-step gate is a five-swipe gate before anybody may start. The names
     that survive in the ids — choose, guide, understand — are the three beats.

     AND THE DIARY CAME BACK INTO THE CAROUSEL — 2026-10-02. It had been a
     slide, then a postscript under the CTA on the argument that it is not a
     step of a session. User testing settled it the other way: U1 and U2 both
     failed to perceive the postscript at all and were surprised by the diary
     later, while U3 named "the diary captures my sessions" as the thing he
     liked about the page. An aside nobody reads is not a lighter touch, it is
     an absence — so the third slide says it instead and the postscript is
     gone. `about.slide.understand` is `about.slide.diary` for the same
     reason: the key named a promise the line no longer makes. */
  'about.greeting': "Hi, I'm Musie.",
  'about.pitch': 'I help you feel and act more mindful, aware, connected and safe through the power of music',
  /* The typing indicator's accessible name. The dots are decorative; this is
     what a screen reader gets while the second message is on its way. */
  'about.typing': 'Musie is typing',
  'about.carouselHeadline': 'What Musie can do',
  'about.carouselLabel': 'How a session works',
  'about.slide.choose': 'Choose the exercise that draws you in, with Musie',
  'about.slide.guide': 'Musie guides you through the exercise and a reflection',
  'about.slide.diary': 'Keep track of your progress in your diary',
  'about.previousSlide': 'Previous step',
  'about.nextSlide': 'Next step',
  'about.slideLabel': 'Step {position} of {total}: {title}',
  'about.goToSlide': 'Go to step {position} of {total}',
  /* Three hints under one CTA, and which one shows is the whole of the gate:
     locked until the last slide has been SEEN, then either "next I'll ask" or
     "ready", depending on whether a user type is already recorded. */
  'about.hint.unseen': 'Check out how a session will work before starting.',
  'about.hint.next': "Next I'll ask who you are here as.",
  'about.hint.ready': 'Ready when you are.',
  /* ── Discovered music · 2026-10-02 ───────────────────────────────────────
     A PLACE, not a feature of the session. User testing found U5 arriving with
     a meditation app's model — "pick a track and listen to it" — and meeting a
     product that hands you music inside an exercise and never gives it back.
     This is where it is given back: the recordings you have actually played,
     so you can go and use them for your own purposes.

     WHAT IS ON SCREEN IS A PLAYER AND NOTHING ELSE, which is Ben's own brief.
     The title is the only text per row, and it is here at all because the
     reveal already named it — see lib/reveal.ts for why a browser cannot
     otherwise learn what a recording is called. */
  'route.discoveredMusic.title': 'Discovered music',
  'menu.discoveredMusic': 'Discovered music',
  'discovered.headline': 'Discovered music',
  /* WHAT THIS MUSIC IS AND WHAT IT IS FOR, in that order, because somebody
     landing here from the menu has had neither explained. The second sentence
     is the permission: this is yours to use away from Musie. */
  'discovered.intro': 'All the music you have listened to in an exercise is kept here. Play it again whenever you like — to settle, to focus, or for no reason at all.',
  /* THE EMPTY STATE IS THE OPENING SCREEN for everybody on the day this ships,
     so it says what is missing AND how to get some, rather than reporting a
     count of zero. */
  'discovered.empty': 'There is no music here yet.',
  'discovered.emptyDetail': 'Music arrives here once you have listened to it in an exercise.',
  /* The reveal failed — the recording is still playable and we simply cannot
     name it. The same words the listen step uses when it is in that position:
     what the control IS, rather than a title standing in for one. */
  'discovered.unnamed': 'Your music',
  /* Title and artist on the player's one line. An artist is why this is
     re-usable at all: a title alone is not enough to find a piece again
     anywhere else. */
  'discovered.trackLabel': '{title} — {artist}',
  'discovered.play': 'Play',
  'discovered.pause': 'Pause',
  'discovered.restart': 'Play again',
  'discovered.seek': 'Position in the music',

  /* ── About you · D.2 ─────────────────────────────────────────────────────
     "Methods" became "exercises" everywhere in the product, so the prototype's
     sentence is carried over with that one word changed and nothing else. */
  'aboutYou.headline': 'And who are you here as?',
  'aboutYou.text': 'I use this to narrow down the exercises I offer you. You can change it here any time.',
  'aboutYou.legend': 'Who are you here as?',
  'aboutYou.hint.pick': 'Pick one to carry on.',
  'aboutYou.hint.ready': 'Ready when you are.',

  /* ── Not implemented · D.2 ───────────────────────────────────────────────
     Shown when someone picks one of the three unbuilt user types. THIS IS THE
     ONLY SCREEN THAT ASKS NOW: /settings had the same four options and accepted
     all of them, on the argument that a preference is yours to record whether
     or not the product has caught up. That screen is gone (2026-09-24) and the
     asymmetry with it — so this lightbox is the app's single answer about the
     three unbuilt paths, and an unimplemented type cannot be recorded at all.
     Logged in apps/web/OPEN-QUESTIONS.md. */
  'notImplemented.title': 'Not implemented yet',
  'notImplemented.text': 'Musie only builds the “By myself” path so far, with the Mindful Break and Free Rein exercises.',
  'notImplemented.back': 'Back to the choice',

  /* ── Exercises ───────────────────────────────────────────────────────────── */
  /* NO 'exercises.timeframe', 'exercises.detail.*' OR 'exercises.start'. They
     were the detail lightbox's, and a tap on a card now starts the run
     (2026-09-24). The duration survives as the fact chip below — same fact,
     on the card, where it can be read without opening anything. */
  'exercises.notImplemented': 'Not available yet',
  'exercises.legend': 'Choose an exercise',
  /* THE GLYPH LEGEND — the shortest true word for each of the three fact
     glyphs, above the cards. A key is only useful before the thing it
     explains. */
  /* The facts themselves. Each is announced in full; only the duration has a
     short form worth drawing beside its glyph. */
  'exercises.fact.time': 'Takes {min} to {max} minutes',
  'exercises.fact.timeShort': '{min}–{max} min',
  /* The escape hatch for "I don't want to choose". It picks among the
     IMPLEMENTED exercises only — the prototype picked among all three and then
     opened the not-implemented lightbox two times in three. */
  /* ── A SESSION THAT IS ALREADY RUNNING · rewritten 2026-10-05 ────────────
     The database refuses a second running one (a partial unique index), so
     this is a real outcome rather than a defensive branch.

     IT IS SAID TWICE ON ONE SCREEN NOW, and the same way both times: as a
     notice at the top of /exercises while a run is open, and in the dialog if
     somebody presses a card anyway. One sentence for both — two voices for one
     fact is how a product stops sounding like one product.

     'A SESSION IS ALREADY RUNNING' IS GONE, with the sentence under it. The
     old pair answered a collision and nothing else: a flat statement, then
     'Finish or close the one you are in before starting another' — homework,
     set directly above the button that does it for you. The headline names the
     exercise instead, because that is the thing somebody has to recognise
     before they can decide anything about it. */
  'exercises.running.headline': '{name} is still running',
  /* WHAT GOES IN `{name}` WHEN THE CATALOGUE HAS NO ROW for the running
     session's exercise — content that was retired, or a locale that never had
     it. A generic noun rather than an id nobody has ever seen: "A session is
     still running" is the old headline, kept for exactly the case it was
     written for. */
  'exercises.running.fallback': 'A session',
  /* Only in the notice. 'Stopped at' is the diary's own phrase for this exact
     fact (`diary.stoppedAt`), and `session.step.*` supplies the word — which is
     why `session.step.intro` is 'Start' rather than 'Begin'. It is NOT in the
     dialog: that one carries a button reading 'Start {name} and end this one',
     and 'You stopped at Start' beside it reads as a riddle. */
  'exercises.running.stoppedAt': 'You stopped at {step}.',
  /* The notice's quiet way out, for somebody who came here to start something
     else. 'End', not 'close': the row is written `abandoned`, which is what the
     diary already calls a run that stopped before its reflection. */
  'exercises.running.end': 'End that session',
  /* Only in the dialog, where a choice is actually being asked for. The last
     sentence is the honest one and it is new: `session.close.text` has always
     said a closed run cannot be picked up again, and the dialog whose second
     button does exactly that never mentioned it. */
  'exercises.running.choice': 'You can pick it up where you left it, or end it and start {name} instead. A session you end cannot be picked up again.',
  /* THE SAME WORDS THE DRAWER USES (`menu.continueSession`), deliberately: two
     doors to one running session that name it differently are two doors people
     have to learn separately. Two keys rather than one because they are
     different things to the eye — a row in a nav list, and the primary answer
     of a dialog. If a third place ever needs this sentence, it moves to
     `common.`. */
  'exercises.goToSession': 'Continue session',
  /* THE OTHER WAY OUT, and the exercise's name stays at the FRONT (Ben,
     2026-09-24: it is what you look for when you reach for this button). What
     went is the description of the other session — 'and end the previous
     session' — now that the headline above names it. The session it ends is
     recorded as abandoned, so 'end' is the honest verb and 'finish' would be a
     lie about the row. */
  'exercises.endAndStart': 'Start {name} and end this one',
  /* NOT `content.error`. That one says "This content could not be loaded",
     which is true of a list that did not arrive and false of a tap that did
     not start anything — and this is the only thing on the screen that says
     why a tapped card did nothing. `content.errorDetail` carries the second
     line, because "check your connection and try again" is the same advice. */
  'exercises.startFailed': 'The session could not be started',

  /* ── The session ─────────────────────────────────────────────────────────
     The four step ids are `intro · scan · listen · reflect` (routeHandle.ts).
     These are their DISPLAY names, and the split is the point: the ids are
     English slugs in the URL and in `sessions.step`, the copy is per locale.
     The same split the schema uses everywhere else.

     'Start', NOT 'Intro', since 2026-09-24 — the English half of the German
     move from 'Einstieg' to 'Einsteigen'. Both were the odd one out in their
     own set: German had a plain noun among three verbal nouns, English had a
     clipped noun among three bare verbs, and both named the SECTION where the
     other three name what you do in it.

     'Start' and not 'Begin', 'Step in' or 'Get started', which all say the
     sense better in the rail and fail the moment the word is interpolated:
     `diary.stoppedAt` and `route.session.title` put it in a sentence, and
     'Stopped at Begin' is not English. 'Start' is the one form that is both a
     bare verb like its three neighbours and a noun that survives 'Stopped at
     {step}'.

     It is deliberately the same word `menu.startSession` uses as its verb.
     That is a button that STARTS a session from outside it; this names the
     first step of one already running, and nothing puts the two on a screen
     together. */
  'session.step.intro': 'Start',
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
  'session.close.text': 'You cannot pick this one up again — the exercise works from how you feel right now, and that will have changed by the time you come back. The session stays in your diary marked unfinished. You can start a fresh session whenever you like.',
  'session.close.confirm': 'Close the session',

  /* ── Intro · D.5a ────────────────────────────────────────────────────────
     A FALLBACK, AND IT IS OURS RATHER THAN THE SPREADSHEET'S. Every exercise
     is meant to supply its own `intro_md`, and two of the five do. This one
     sentence is what the intro step says when the exercise says nothing —
     chrome, permanent, and true of every exercise, so it is correct copy
     rather than a placeholder. It renders as a paragraph and never as a
     headline: naming a step is the exercise's job. Neither of the two
     implemented exercises reaches it. */
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
  'session.scan.headline': 'Scan the card that describes best how you are doing right now.',
  /* NO 'reader' OR 'readerNote' — Ben, 2026-09-24. Both sentences stood in the
     empty frame, which now holds nothing but its two buttons.

     The first of them was the one that mattered — it named the COMMON way in,
     a printed card read by the phone's own camera app — so it was moved rather
     than dropped: it is part of the exercise's own `scan_md` now, beside the
     rest of the instructions for picking a card (migration
     20260924…_scan_md_phone_camera.sql). The second is what the primary button
     says. */
  'session.scan.codeLabel': 'Card code',
  /* An EXAMPLE, not a label (3.3.2): the label above names the field and this
     shows the shape. `MC-01` is a real code, so it is not translated. */
  'session.scan.codePlaceholder': 'MC-01',
  /* A VERB PHRASE, because it is an action and not the name of a section — the
     field it opens is already labelled 'Card code'.

     'Enter the code', no longer 'Enter the code by hand' (2026-09-24). 'By
     hand' earned its place while the form sat open beside the reader and the
     two had to be told apart; the frame now shows one or the other, and this
     string is also the icon control's tooltip over the live picture, where
     five words is a paragraph. */
  'session.scan.codeManual': 'Enter the code',
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
  /* 'Scan the card', not 'Use the camera' (2026-09-24). It is the step's
     primary action now, and it names the thing being done rather than the
     device doing it. Translated from Ben's German, which is where this one was
     written first. */
  'session.scan.scanCard': 'Scan the card',
  'session.scan.cameraRetry': 'Try the camera again',
  /* 'Hide', not 'Turn off': the control is an icon button sitting in the
     picture and what it does, from where the person is standing, is take the
     preview away. The stream really is stopped — 'turn off' would suggest the
     device's camera as a whole. */
  'session.scan.cameraHide': 'Hide the camera',
  /* Out of the form and back to the viewfinder. Both are modes of one frame,
     so the button names where it goes. */
  'session.scan.codeBack': 'Back to scanning',
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
     reveal is E.5.

     ── ONE WORD FOR THE MUSIC, AND IT IS "music" (Ben, 2026-10-09) ──────────
     The German carried FOUR words for one thing — Stück ×5, Track ×5, Musik
     ×7, Aufnahme ×2 — and the English was no better: track, piece and
     recording all named the same object. Both sides are now "music" / "die
     Musik", which is the word that was already commonest on each, is not a
     translation of the other, and does not count: you can count a piece, you
     cannot count music, and nothing here ever counts it.

     NOT SWEPT UP: "recording" in the sense of a VOICE recording — reflect
     .voice.*, privacy.voice, voice.*. Different object, unchanged.

     The KEY NAMES stay — `session.listen.track`, `discovered.trackLabel`,
     `noTrack`. They are named for the `tracks` table and the `track_id`
     column, and that is still what they read from. */
  'session.listen.track': 'Your music',
  /* THE GATE IS SAID BY THE BUTTON NOW, AND ONLY THERE — 2026-09-24.
     There used to be a `#listen-gate` paragraph above the transport carrying
     one sentence while the gate was shut and another once it opened, and the
     CTA below it read *Start reflection* in both states. Two places said one
     thing, and the button — the control the sentence was about — was the one
     that said nothing. Now the button carries its own condition and the
     paragraph is gone.

     AND IT NO LONGER CARRIES A NUMBER — 2026-10-09. It read "Focus for
     {countdown} minutes more", which was two faults in one line: it was the
     SECOND countdown on the stage, disagreeing with the transport's, and it
     interpolated MM:SS into a sentence that says "minutes", so a ninety-second
     gate rendered as "Focus for 01:30 minutes more".

     The transport above it owns the clock now — it says the minimum inside its
     own label — so this one says only what it is waiting for. The gate is
     still said by a button, which is the rule above; it is just said by the
     button that is counting rather than by the one that is disabled. */
  'session.listen.startLocked': 'Listen first, then reflect',
  'session.listen.start': 'Start reflecting whenever you are ready',
  /* THE PICTURE BETWEEN THE WORDS AND THE CONTROLS — 2026-10-07.
     DESCRIBED, NOT SILENT. The diary's marks take `alt=""` because the link
     around them already says which session; nothing says this one. The step's
     own copy is about the sounds, and the drawing is about the room they are
     heard in, so a reader who cannot see it would otherwise be told only that
     something is there.

     WHAT IS IN IT, AND NOTHING MORE. Not what it means — an alt text that
     said *the calm of an unnamed track* would be writing the step's copy a
     second time, in a place nobody can check it against the picture. */
  'session.listen.infographicAlt': 'A hand holding a card over a table, beside a phone lying flat with music drifting from it.',

  /* ── The listening view · the LISTEN-EXPERIMENTS branch ──────────────────
     The press on the stage's transport opens a full-screen sheet and the track
     plays in there: the exercise's own words, the minimum time counting down,
     and the way on once it has run out. The stage keeps the same three strings
     it had — this is a second place to read them, not a replacement — and what
     is new is the frame and the clock.

     `immersiveTitle` is the SHEET'S ACCESSIBLE NAME and is never seen: the
     exercise's own headline is what the sheet shows (4.1.2 still wants a name,
     and a noun phrase is what a view is called). The two are deliberately
     different strings — a chrome name that repeated the content's heading would
     put two headings with one name in the tree, which is the stutter
     `SessionRunningLightbox` is written up for. */
  'session.listen.immersiveTitle': 'Listening',
  /* THE X ENDS THE LISTENING, it does not only close a window — leaving the
     sheet pauses the track, so the label says the thing that happens rather
     than the thing that is clicked. */
  'session.listen.immersiveClose': 'End listening',
  /* The caption UNDER the big figure, so it does not have to repeat it. "This
     much" is the number above; what the caption adds is that the number is a
     floor and not a length. */
  'session.listen.immersiveCountdown': 'minimum listening for this exercise',
  /* ── ONCE THE MINIMUM IS DONE — Ben, 2026-10-07 ────────────────────────
     It replaces `immersiveReady` ("You have listened long enough"), which
     reported a threshold and stopped there. This says what was achieved and
     then hands the rest of the track back as an OFFER rather than as a
     requirement, which is the same soft-gate posture as the scrubber.

     BOTH FIGURES ARE MM:SS, Ben's call over rounded words: the gate is the
     same number the counter above just finished counting, so saying it in a
     different unit here would read as a different number.

     `{gate}` is interpolated and never written out, because it is
     `exercises.listen_gate_seconds` and varies — 60, 90 and 180 across the
     five exercises. */
  'session.listen.immersiveDone': 'Well done, you stayed with it for {gate} minutes. The music plays on for {remaining} if you like.',
  /* THE TRACK CAN ALREADY BE OVER when the gate opens — a short recording, or
     somebody who scrubbed to the end. "Carry on for another 00:00" is the
     sentence that gets written when nobody checks. No dash, at Ben's request;
     two sentences carry it. */
  'session.listen.immersiveDoneEnded': 'Well done, you stayed with it for {total} minutes. The music has finished. Play it again if you like.',
  /* THE LOCKED WAY ON. It does NOT repeat the countdown the way
     `startLocked` does on the stage — the figure is already the largest thing
     on the sheet, and saying it twice on one screen is how a number stops
     being read. So the disabled button says what to do instead of what to
     wait for. */
  'session.listen.immersiveLocked': 'Focus until the counter runs out. Then you can carry on',
  /* There are no audio files (E.4), so the transport runs on a clock at the
     track's real length. Said on screen, for the same reason as the scanner. */
  /* ── The three scroll views · E.5b ──────────────────────────────────────
     The prototype's listen step is three stacked viewports and this is their
     copy. The Störer's sentence is the prototype's own, lightly tightened:
     it interrupts rather than warns, and its measure is narrow so it lands as
     one thought. */
  'session.listen.detailsAction': 'About the music',
  'session.listen.warnText': 'For this exercise it is better not to be influenced by the music’s metadata.',
  'session.listen.warnBack': 'Back to listening',
  'session.listen.warnOn': 'Show details and player',
  'session.listen.scrollUp': 'Scroll up',
  /* ── THE STAGE TRANSPORT'S THREE GATED WORDS (Ben, 2026-10-09) ──────────
     The button on the stage carries the minimum now, so its label says how far
     there is to go and the screen stopped showing two countdowns that
     disagreed — 02:48 beside 01:30. `{time}` is filled by `TrackButton` from
     `gateSeconds`: the minimum itself before anything plays, what is left of
     it below the threshold, what is left of the MUSIC above it.

     UNPADDED, which is the component's `spokenClock` rather than its
     `trackClock`: padding holds a readout still as it crosses a minute, and
     these are sentences with nothing to hold still. "mindestens 1:30" is how
     a minimum is said.

     There is no fourth here — the ended word is `session.listen.restart`,
     shared with the ungated button, because "play it again" is the same offer
     either way. */
  'session.listen.listenUnstarted': 'Listen now (at least {time})',
  'session.listen.listenBelow': 'Keep listening (at least {time})',
  'session.listen.listenPast': 'Listen on ({time})',
  /* The player's own words. Passed explicitly because the design system's
     defaults are a mix of languages — CLAUDE.md 7. */
  'session.listen.play': 'Play',
  'session.listen.pause': 'Pause',
  'session.listen.restart': 'Play again',
  'session.listen.seek': 'Position in the music',
  'session.listen.aboutHeading': 'About this music',
  'session.listen.aboutArtist': 'Artist',
  'session.listen.aboutInstructions': 'Listening instructions',
  /* THE SIMULATED-PLAYBACK NOTICE, at the foot of the last view since
     2026-09-24. It is a headline plus a line, because it is a `Message`
     now rather than a paragraph of small print — and a warning, because
     what it reports is that the thing on screen is not the real one. */
  'session.listen.simulatedHeadline': 'Test mode: no music',
  'session.listen.simulated': 'No music is bundled yet, so the player runs on a clock at its real length.',
  'session.listen.noTrack': 'This exercise has no music yet.',

  /* ── Reflect · D.5c ────────────────────────────────────────────────────── */
  /* `reflect.questionFallback` — "What stayed with you?" — is GONE, 2026-09-23.
     It stood in for `exercise_i18n.question`, one column rendered as the <h2>
     on both the listen and the reflect step, and that column went when each
     step got a headline of its own in `*_md`. A step's headline is the
     exercise's to write; chrome has no business naming it, so there is nothing
     for this key to fall back to any more. */
  'reflect.legend': 'How would you like to answer?',
  'reflect.mode.voice': 'Transcribe',
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
     out of somebody. It became `privacy.voiceShort` — the promise, one line,
     with the rest behind `privacy.more` — and on 2026-09-24 that line went too:
     the step now says nothing about data at all. See the privacy block. */
  'reflect.photo.notBuilt': 'Reading a photo is not built yet',
  'reflect.photo.notBuiltText': 'This shows how it will work. The photo stays on your device and is read back as text; the image is never uploaded.',
  /* ── HOW THE SESSION LEFT YOU ────────────────────────────────────────────
     Three ordered points, lowest first, and the order is the question: this is
     a scale, not a set of alternatives. Each names the comparison outright —
     "than before" — because the thing being measured is a CHANGE, and a point
     labelled only "good" would be measuring a mood instead. */
  'reflect.feeling.legend': 'How do you feel now?',
  'reflect.feeling.worse': 'Worse than before',
  'reflect.feeling.same': 'Exactly as before',
  'reflect.feeling.better': 'Better than before',

  /* ── ONE WAY OUT, AND IT SAYS WHERE THE SESSION GOES (Ben, 2026-10-09) ────
     NO 'reflect.skip' AND NO 'reflect.finish'. The step carried three exits at
     once — skip, finish, and the ghost *Close this session* — which user
     testing found and which two doors added elsewhere had not fixed. There is
     one button now, it is always enabled, and it names the destination rather
     than the act: "Finish session" said what happened to the run, not what
     happened to the answer.

     ALWAYS ENABLED, which is the half that needed the dialog below. A disabled
     primary explains nothing — it just stops. This one accepts the press and
     then says what is still open, which is the same information delivered
     where somebody is looking. */
  'reflect.save': 'Save the session to your diary',

  /* The dialog, when the answer or the scale is still open. ONE SENTENCE on
     why, and it argues from what the person gets rather than from what the
     product wants — the exercise is the listening, and the reflection is what
     makes it findable again. */
  'reflect.incomplete.title': 'Complete the reflection',
  'reflect.incomplete.text': 'A session you have answered is one you can find your way back into later — the words are what make it yours rather than a date in a list.',
  /* PRIMARY is the way back to the work, because that is what the dialog is
     for. Naming the act, not the dialog: "Cancel" would describe leaving this
     box rather than returning to the reflection. */
  'reflect.incomplete.continue': 'Continue reflecting',
  /* And the way out stays open, in the second rank. It says INCOMPLETE out
     loud: somebody choosing it should know what the diary will hold. */
  'reflect.incomplete.save': 'Save to the diary, incomplete',

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
  /* WHERE IT STOPPED, AS A LABEL AND A VALUE -- 2026-09-26.
     It was one string, 'Stopped at {step}', rendered as a quiet line under the
     answer. It is a `<dl>` row now, with the rest of what is known about the
     session, and a row is a LABEL and its content -- so the preposition goes
     in the label and the step stands alone as the value. Keeping the old
     string as the content would have produced a row reading
     'Stopped at: Stopped at Listen'. */
  'diary.stoppedAt': 'Stopped at',
  'diary.duration': '{minutes} min',
  /* The exercise's own description, which is a row in the list now rather
     than prose under the headline. The label is a question the value answers,
     like the three below it. */
  'diary.about': 'What this exercise is',
  /* The exercise's NAME, which was the card's headline until 2026-09-26 and is
     a labelled row now. The headline says which session this is; the exercise
     is a fact about it, like the card and the duration. */
  'diary.exercise': 'Exercise',
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
  /* THE CARD'S HEADLINE. `{when}` is a formatted timestamp, short form, from
     `formatShortDateTime` -- the preposition lives here and not in the
     formatter, because German owns 'vom' and English is free not to translate
     it. 'Session' is the word this product already uses for a run, in both
     languages, so it is not translated either.

     One string, four places: the inline card, the lightbox card, the
     lightbox's own accessible title, and the row in the timeline. */
  'diary.sessionTitle': 'Session from {when}',

  /* THE COLLAPSE, behind which everything that is ABOUT the session sits --
     the labelled rows and the status -- while the question, the answer and the
     recording stay on the card. Two strings rather than one, because the
     control's name should say what pressing it does, and `aria-expanded`
     carries the state for anyone who cannot see the chevron. */
  'diary.details': 'Session details',
  'diary.detailsHide': 'Hide details',

  /* THE CONFIRMATION AFTER A SESSION, as a toast at the top of the screen.
     Ben's words, 2026-09-29, replacing "Im Tagebuch findest du einen Eintrag
     fuer jede beendete Uebung".

     IT NAMES THE REFLECTION, WHICH NARROWS WHERE IT MAY APPEAR. The old
     sentence was about the diary in general and was true after any session,
     which is why it was shown on both ways out of one. This one promises that
     a specific thing is there, so it is shown only where that thing was
     written: a finished session whose reflection was not skipped. Session.tsx
     decides, and says so.

     It also retires the clash the old wording carried -- *beendete Uebung*
     over an entry badged *Nicht beendet* -- without needing the ruling that
     was logged for it. No adjective, no contradiction. */
  'diary.saved': 'You can find your reflection in the latest diary entry',
  'diary.saved.dismiss': 'Dismiss this message',

  /* -- THE GRAPH ---------------------------------------------------------
     A week of days, each session drawn as its exercise's artwork.

     `diary.graph.label` names the whole region and `diary.graph.weekLabel`
     each scroll page, because a horizontal scroller with no name announces as
     a run of links from nowhere.

     `diary.graph.session` is the accessible name of ONE image-link, and it is
     the whole name: the headline, the exercise and the status, in that order.
     The image inside it is `alt=""` — a link whose text and image say the same
     thing announces it twice.

     `diary.graph.more` is the counted chip over a capped stack. `{count}` is a
     number the screen formats; the chip is a link to that day in the list
     below, so its name says where it goes rather than just how many there are.

     `diary.graph.empty` is the day-one state, drawn INSIDE the week rather
     than instead of it: the columns and the plus are the invitation, and a
     sentence over an empty box would say less. */
  'diary.graph.label': 'Your sessions, day by day',
  'diary.graph.weekLabel': 'Week ending {when}',
  'diary.graph.session': '{title} — {exercise}, {status}',
  'diary.graph.more': '{count} more on this day',
  'diary.graph.start': 'Start a session today',
  /* The pagination chevrons. Named for the WEEK they move to, not for the
     direction they point — 'Back' and 'Forward' would be true of the glyph
     and useless as an announcement. */
  'diary.graph.prevWeek': 'The week before',
  'diary.graph.nextWeek': 'The week after',
  'diary.graph.empty': 'Your sessions will stack up here, one picture a day.',

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
     IT LIVES ON /diary SINCE 2026-09-24, which reverses where G.2 put it — see
     `DeleteEverything` in routes/Diary.tsx for the argument and for what is
     kept of the old one. There is no section heading any more: it sat under
     `route.diary.title` in the sheet because a button among preferences has to
     name what it acts on, and on the diary that headline is the h1 above it.

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
     it.

     ── TWO OF THESE WERE REWRITTEN BY H.0b, AND THE SIGN-OFF DOES NOT CARRY ──
     `privacy.account` and `privacy.browserBound` were written when every
     account was anonymous and lived in browser storage. A tester signed into an
     account handed out by `scripts/create-tester.mjs` makes BOTH FALSE: they
     were asked for an email address (they were given one), their diary is on
     the server, and the second device reading the same diary is the whole of
     H.0's done-when. A privacy promise that is false for the people currently
     testing is exactly the failure phase G's checkpoint exists to catch, so
     this could not wait for H.4.

     Both now say which case applies rather than describing one of them. That is
     longer, and the privacy page is the one screen where precision outranks
     brevity. THE REWRITE IS NEW TEXT AND IS NOT COVERED BY THE SIGN-OFF ABOVE
     — it needs reading again. Logged in apps/web/OPEN-QUESTIONS.md. */
  'privacy.title': 'What Musie keeps',
  /* 'never asks for your name' survives unqualified — nothing in either path
     asks for one. The email half did not: it is now a condition rather than a
     promise, because for a tester it was handed over, and a promise that holds
     only for some readers has to say which. */
  'privacy.account': 'Musie never asks for your name. If you were given an email address and a password for the closed test, your diary belongs to that account. Otherwise this browser holds a private account of its own, and your diary belongs to it.',
  'privacy.written': 'What you write is saved to your diary so you can read it back later. Nobody else can see it.',
  /* ── ONE OF THESE IS HUNG AGAIN, AND THE OTHER IS STILL PARKED ──────────
     Parked by Ben on 2026-09-24: both were the reflect step's one-line promise
     and the link beside it, taken off because the transcript is what somebody
     is there for and the small print under it was competing with it.

     `privacy.voiceShort` CAME BACK ON 2026-10-09, in a different place and for
     a reason the first placement did not have. User testing found that voice
     mode shows nothing about transcription until the tap — so the one sentence
     that would have predicted it only arrived after the person had already
     committed. It now sits BESIDE the record button rather than under the
     transcript: next to the control it is about, where it is read before the
     finger moves rather than after. VoiceTranscript.tsx renders it.

     `privacy.more` IS STILL PARKED, and the argument for it is unchanged:
     `DataLightbox` stays built and still holds the long promise, and what is
     missing is a door to it, which is Ben's to place
     (apps/web/OPEN-QUESTIONS.md). `voice.hint.more` went the other way,
     deleted outright, because that sentence was judged redundant rather than
     homeless.

     THE PROMISE IN ONE LINE: not an abbreviation of `privacy.voice` so much as
     the half of it that is a promise — the mechanism is in the lightbox. It
     says SPRACHNACHRICHT rather than Stimme since 2026-10-09: what is not kept
     is a recording, and "deine Stimme" promised something larger and vaguer
     than the system actually does. */
  'privacy.voiceShort': 'Musie saves only the text, never the voice message.',
  /* The word in that sentence that opens the whole promise. Not 'Learn more':
     it names what is behind it, which is what a link in running text has to
     do when the sentence around it is doing the explaining. */
  'privacy.more': 'More about your data',
  'privacy.voice': 'If you answer out loud, Musie turns your words into text and keeps only the text. The recording itself is never stored.',
  'privacy.photo': 'A photo you take stays on your device. Musie never uploads it.',
  /* The uncomfortable one, and the reason it is here: an anonymous account
     living in browser storage is a real limitation, not a detail. Saying it
     plainly is the difference between a private product and a careless one.

     STILL SAID PLAINLY, and now conditional, because it stopped being true for
     everybody. The loss is stated FIRST and the reassurance second: a reader
     who skims one sentence should come away with the limitation rather than
     with the exemption. */
  'privacy.browserBound': 'If your account lives only in this browser, clearing its data also clears your diary, and there is no way to get it back. If you signed in, your diary stays with your account and you can reach it again from another device.',

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
  /* THE ONE THAT DID START, AND THEN STOPPED — 2026-09-30. `recorderFailed`
     above says *could not start*, which is the wrong sentence for a call
     arriving, a Bluetooth headset taking the microphone, or iOS freezing the
     page mid-answer. What the reader needs first is that their words survived,
     which is why that clause leads — the same order `connectionClosed` uses
     for the same reason. */
  'voice.error.micInterrupted': 'The microphone stopped part-way through. Everything Musie had already heard was kept — start again when you are ready.',
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
  /* THE FAILURE TOAST'S X — 2026-09-30, when errors moved off the page and
     into §7.23. Not `voice.undo.dismiss`: that one dismisses an OFFER and
     leaves the change standing, this one puts away a report of something that
     has already happened. Two different promises, so two different strings,
     even though today they are one word apart. */
  'voice.error.dismiss': 'Dismiss this message',

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
  /* ── BOTH STANDING HINTS ARE GONE (2026-09-24, Ben, in two passes) ───────
     `voice.hint.more` first, then `voice.hint.first`. They sat under the
     record button and ended in the same two cut-offs: sixty seconds, six of
     quiet. A recorder that stops on its own without having said it would is
     indistinguishable from a broken one — but `voice.stopped.timeout` and
     `voice.stopped.silence` say exactly that, at the moment it happens, with
     the number in the sentence. Saying it in advance as well was a third block
     of small print under a transcript, on a screen whose subject is the
     person's own words. `hintKey` went with them (lib/voiceScreen.ts). */
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
  'voice.hint.edit': 'Drag a statement to move it, or drop it onto another to join the two. On a touchscreen, swipe a statement to the left to delete it. From the keyboard: focus a drag handle, then space to lift, arrow keys to move, M to join it to the one above, escape to put it back.',
  /* The recorder acting on its own. A manual stop explains itself, and an
     error already has a Message of its own — see lib/voiceScreen.ts. */
  'voice.stopped.headline': 'Recording stopped',
  'voice.stopped.timeout': 'That was the {seconds} seconds. Everything Musie heard is in the list, and you can record more.',
  'voice.stopped.silence': 'It went quiet for {silence} seconds, so Musie stopped listening. Everything it heard is in the list.',
  /* ── THE TWO ERROR HEADLINES ARE GONE — 2026-09-30 ────────────────────
     F.4 chose Message for a failure and these were its headlines. A failure
     is a Toast now (VoiceTranscript.tsx says why), and §7.23 has no headline:
     a toast is one sentence, and the sentence is the `voice.error.*` copy
     above. Two strings nothing could render would be exactly the invisible
     rot the note at the top of this file warns about — so they are deleted
     rather than kept against a component that may never come back.

     `voice.stopped.headline` above STAYS: the stop notice is still a Message,
     because a recorder that reached its own limit is part of the flow rather
     than something that went wrong. */

  /* ── The deck · /exercises ──────────────────────────────────────────────
     It was a proof of concept at /dev/deck and it is the screen now (Ben,
     2026-10-02). NOTHING ON THE FACE OF A CARD is here — the name, the
     description and the picture are the exercise's, read from the content
     tables. This catalogue is for the words the screen says in its OWN voice.
     The one apparent exception is the time, which the card borrows from
     `exercises.fact.time*` rather than saying a second way. */
  /* The ROUTE's name, for the document title. The screen's own headline is
     below and says something else — a route title is a noun phrase that has to
     work in a tab, and a question Musie asks is not that. */
  /* ── MUSIE ASKS, AND THE COUNT IS GONE (Ben, 2026-10-08) ────────────────
     It was '{count} exercises for you', and the count was interpolated so the
     line could not go stale as the deck grew. The goal filter is what ended
     it: the number now moves with the filter, and this catalogue has no
     plural machinery by design (see i18n/index.ts) — so a goal serving one
     exercise would have read *1 exercises for you*. The three-state headline
     in Exercises.tsx existed to work around the same number and goes with it.

     A QUESTION, WHERE THE REST OF THIS SCREEN IS NOUN PHRASES. It names
     nothing, it asks — `aboutYou.headline` is the precedent, the other screen
     where the person answers the heading rather than reading it.

     *WE*, NOT *YOU* (Ben, 2026-10-08). The card is pressed alone, but Musie
     comes along for the session — so the question is asked in the first person
     plural. The German does the same with *wir*, which is not a breach of §1:
     that rule is du against Sie, and this is a different axis.

     *EXERCISE* AND NOT *SESSION*, because that is the word on the cards and
     the name of the table they come from. The cards are the answer to this
     question and should be called what the question calls them.

     ONE LINE, AND IT IS MEASURED. At 393px — the width this product is
     designed against, which GERMAN-UI-WRITING §5 names — the heading has 361px
     after the two gutters. This is 345px, with 16px to spare; the German is
     332px with 29. *Which exercise shall we start?* was the first phrasing and
     is 370px, nine over, so it would have wrapped.

     THE MEASURE IS NOT WHAT BINDS, the device is: `--measure-heading` resolves
     to 438px and never comes into play on a phone. The font size that would
     have fitted the longer draft on one line is 17.8px — body size — and
     `--type-heading-lg-size` lives in Layer 1, which is `[LOCKED]`. So the
     copy was the only place this could be solved. */
  'exercises.headline': 'Which exercise do we start?',
  /* NO 'exercises.intro'. It was the subline — "Press a card to start that
     exercise, or swipe sideways to see another. Or see all of them in a list."
     — and it went with the header rewrite (Ben, 2026-10-08), unreplaced.

     `DeckGuide` teaches the press and the swipe over the card itself, which
     is where a gesture hint belongs and is why the subline was the second
     place to say them. IT DOES NOT TEACH THE LIST, which is the half this
     deletion loses: logged in OPEN-QUESTIONS rather than patched here,
     because the legend's content is not that change's to rewrite. */
  /* The pile's accessible name, and the ONLY place the keys are named: the
     overlay that teaches the press is a visual state and is aria-hidden, so a
     screen-reader user hears this and nothing else. It names the keys rather
     than the swipe, because a swipe is not what this reader is going to
     make. */
  'exercises.deckLabel': 'The deck. Enter starts the exercise on the top card; the arrow keys show the next one and the one before.',
  /* THE ACCEPT, ONCE. `exercises.start` — "Start the exercise" — went with the
     big button beside the deck on 2026-10-05: the card carries this action now,
     and the long form had no second place to be said. The comment further up
     this file saying there is no `exercises.start` is true again.

     As short as a card's own corner has room for, and the corner is why: at
     label size on a 297px card, "Übung starten" and the time do not share a
     row. */
  'exercises.startShort': 'Start',
  /* NO 'exercises.startHint'. It was the overlay's second line — "Press a card
     to start it" — and the card now carries a button that says the same thing
     in one word and can be pressed (Ben, 2026-10-05). A key nothing renders is
     the invisible rot the note at the top of this file warns about, so it is
     deleted rather than kept against a line that may not come back.

     The two directions. The overlay says the FORWARD one whichever way the
     finger goes — both ways deal another card — so `exercises.previous` is now
     only ever heard, as the back button's name and tooltip. NOT 'another one'
     for either: two labels that both said "another" would not say which. */
  'exercises.next': 'Next exercise',
  'exercises.previous': 'Previous exercise',
  /* Announced when the top card changes — "3 / 5" alone would say the pile
     moved but not what it moved to. */
  'exercises.deckPosition': '{name} — card {index} of {total}',
  /* THE ONLY FORM NOW. It was the short one of a pair — the long
     `exercises.surpriseMe` was a full-width CTA on this screen — and that
     one went when the control moved into the toolbar. The key keeps its name
     rather than being renamed across two locales for tidiness.

     "AN EXERCISE", NOT "A CARD" — Ben, 2026-10-07, in German first ("Such mir
     eine Übung aus"), and the English follows it: the two locales cannot
     name the same thing differently. The pile is cards and what it offers is
     exercises, which is what this button hands you — and it is the word the
     headline, the legend and the deck's own next/previous labels all use. */
  'exercises.surpriseMeShort': 'Pick an exercise for me',
  /* The view switch. ONE OF THESE TWO IS NOW DRAWN, not neither: the segmented
     control gives its word to the view you are NOT in (`labels="unchecked"`),
     so whichever half you might press says what pressing it would get you —
     and the other is read off the glyph you are already on. Both are still the
     accessible name of their segment, which is why both had to be written even
     while neither was drawn.

     ONE WORD EACH. The drawn one sits in a 36px track beside a glyph, so this
     is the shortest true name for each view rather than its description —
     'Stack', not 'Card stack'. */
  /* ── THE FIRST-USE LEGEND · the deck's extra card ───────────────────────
     Three rows, one per control the screen offers and none of which says what
     it is on its own: the goal above the pile, the two directions a card
     goes, and the card you press. Shown once per browser and brought back by
     the `?` beside the chevrons.

     EVERY LINE IS NOW AN INSTRUCTION (Ben's wireframe, 2026-10-07). They were
     three descriptions of what each control gets you — "The next exercise",
     "Choose your goal to find exercises that suit you better" — read in the
     order the controls happened to sit in. Each one names the MOVE instead:
     change, swipe, press. Three verbs in three rows, in the order the eye goes
     down the card, and each one beside the picture of the control it is about,
     which is what carries the half the sentence no longer has to say.

     SHORTER FOR THE SAME REASON. A line that describes a benefit has to earn
     its length; a line that names a gesture is done in four words, and three
     of them share a card with a photograph behind it.

     `guide.dismiss` IS NEVER SEEN. It is the sr-only line that tells a screen
     reader what pressing this does, because the legend is one big button and
     its accessible name is otherwise three sentences of explanation with no
     verb among them. */
  'exercises.guide.goal': 'Change your goal',
  'exercises.guide.next': 'Swipe for the next exercise',
  'exercises.guide.start': 'Press an exercise to start it',
  'exercises.guide.dismiss': 'Press to continue',
  /* The `?` beside the chevrons. A verb phrase, because it is an action and
     not a label for a thing. */
  'exercises.guide.show': 'Show how this page works',
  /* ── THE TOOLBAR'S TWO CHEVRONS ────────────────────────────────────────
     Icon-only, so these ARE the controls — the accessible name and the
     tooltip are one string in `IconButton`, and without them a screen reader
     meets two buttons called nothing.

     NAMED BY DIRECTION, not by what is over there. "More controls" would be
     the same name twice, and the one thing a person needs to know about two
     chevrons is which way each goes. The row they scroll is the subject and
     is left unsaid: both locales are LTR, the button sits against the row,
     and "Scroll the controls to the left" spends six words on a 24px
     target's tooltip to say what the glyph already said. */
  'exercises.toolbar.left': 'Scroll left',
  'exercises.toolbar.right': 'Scroll right',
  'exercises.view.legend': 'How to show the exercises',
  'exercises.view.deck': 'Stack',
  'exercises.view.list': 'List',
  /* ── THE GOAL, AND THE FOUR THINGS IT NEEDS TO SAY ──────────────────────
     The three goal LABELS are content and live in `goal_i18n` — they are the
     product's own words and change by migration. Everything here is chrome:
     the question, the pill, the fourth option, and the sentence for a goal
     nothing serves.

     `exercises.goal.none` IS CHROME and the other three labels are not, which
     looks inconsistent and is not: "Musie entdecken" has no row to be the
     label of. It means the absence of a goal (see lib/goals.ts), so there is
     nowhere else for it to live. */
  /* NO 'exercises.goal.headline'. It was *Your goal*, and it was never the
     goal box's own headline — it was one of /exercises' three h1 states, the
     one worn when a goal served nothing so a count would have read zero. The
     headline is a single question now and that state is gone, which leaves
     this string with nothing drawing it. A key nothing renders is the
     invisible rot the note at the top of this file warns about, so it is
     deleted rather than kept against a state that is not coming back. */
  /* THE FIELDSET'S LEGEND, not the box's headline — RadioGroupText has no
     `legendHidden`, so a visible headline above it would ask the question
     twice. The ContentBox keeps the same string as a hidden headline for the
     document outline. */
  'exercises.goal.question': 'What would you like to achieve today?',
  'exercises.goal.none': 'Discover Musie',
  'exercises.goal.pill': 'Goal: {goal}',
  /* NOT `content.empty`, which says the catalogue did not load. This says it
     loaded and has nothing for this goal — a true sentence about a mapping,
     not a failure. */
  'exercises.goal.empty': 'No exercise serves this goal yet.',
  'exercises.goal.emptyAction': 'Choose a different goal',
  /* ── /goal-mappings — A TOOL, NOT A SCREEN ──────────────────────────────
     Linked from nowhere and reachable only by typing the path. It still goes
     through the catalogue, exactly as /dev/qr does: rule 7 is about where
     strings live, not about who is expected to read them, and a tool with
     inline strings is the one place the next inline string gets added. */
  'goalMap.headline': 'Goal mappings',
  'goalMap.intro': 'Tick which goals each exercise serves, then generate the config and paste it back into the chat. Nothing here is saved — the mapping changes by migration.',
  'goalMap.legend': 'Which goals each exercise serves',
  'goalMap.submit': 'Generate config',
  'goalMap.outputLabel': 'Config',
  'goalMap.copy': 'Copy',
  'goalMap.copied': 'Copied',
  'route.aboutMusie.title': 'About Musie',
  'route.aboutYou.title': 'About you',
  'route.diary.title': 'Your diary',
  'route.diaryEntry.title': 'Diary entry',
  'route.exercises.title': 'Exercises',
  'route.goalMappings.title': 'Goal mappings',
  'route.session.title': 'Current session — {step}',
  'route.notFound.title': 'Not found',
} as const;

/** Every catalogue must answer to this shape. */
export type Messages = Record<keyof typeof en, string>;
export type MessageKey = keyof typeof en;
