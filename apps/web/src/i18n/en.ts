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
  'shell.skipLink': 'Skip to main content',
  'shell.menuLabel': 'Open menu',
  'shell.profileLabel': 'Open profile and settings',

  /* ── Shared across overlays ────────────────────────────────────────────── */
  'common.closeLabel': 'Close',

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

  /* ── Exercises ───────────────────────────────────────────────────────────── */
  'exercises.timeframe': '{min}–{max} minutes',
  'exercises.notImplemented': 'Not available yet',

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

  /* ── Diary ───────────────────────────────────────────────────────────────
     `{step}` takes a `session.step.*` value, already translated — the diary
     never interpolates a raw step id. */
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

  /* ── Route titles · PLACEHOLDER SCAFFOLDING ────────────────────────────── */
  'route.aboutMusie.title': 'About Musie',
  'route.aboutYou.title': 'About you',
  'route.diary.title': 'Your diary',
  'route.diaryEntry.title': 'Diary entry',
  'route.exercises.title': 'Exercises',
  'route.session.title': 'Current session — {step}',
  'route.done.title': 'Done',
  'route.settings.title': 'Settings',
  'route.notFound.title': 'Not found',
} as const;

/** Every catalogue must answer to this shape. */
export type Messages = Record<keyof typeof en, string>;
export type MessageKey = keyof typeof en;
