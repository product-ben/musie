# German UI writing

The rules this repo's German is written to. Written **before** the German, so
"best practice" is a rule someone can hold a string against rather than a mood
the last writer happened to be in.

**What it binds**

| Surface | File | Status of the copy |
|---|---|---|
| App chrome | `apps/web/src/i18n/de.ts` | **ours and permanent** — nobody else will ever supply it |
| Content | `supabase/migrations/20260918150600_content_seed.sql` | **provisional** — the Mindfulness Cards spreadsheet will overwrite it |

**What it does not bind:** `packages/design-system`. Its components ship
hardcoded defaults in a mix of German and English on purpose, and the app's
answer is not to fix them but to pass every user-visible string explicitly.
See the boundary rule in `apps/web/src/i18n/en.ts`.

Whoever writes the spreadsheet German is invited to follow this file, but the
seed's German is provisional either way: it is held to this standard so that
nothing placeholder-shaped ships, not because it is final.

---

## 1 · du, not Sie

**This is a confirmation, not a decision.** The choice was already made in code
before this document existed: `de.ts` shipped *"Prüfe deine Verbindung und
versuche es erneut."* and *"Dein Tagebuch"*. This file writes the existing
practice down and closes the question. Do not re-open it.

Consequences, all of which are the actual work:

- **Imperative singular** for instructions: *Prüfe*, *Scanne*, *Arbeite* —
  not *Prüfen Sie*, and not the infinitive-as-instruction (*Verbindung
  prüfen*) when you are addressing the reader rather than labelling a button.
- **`dein` / `deine` / `dich` / `dir`**, never `Ihr` / `Ihre` / `Sie` / `Ihnen`.
- **Lower-case `du` and its forms** in running copy. Capitalised *Du* is
  permitted by the 2006 rules but reads as correspondence, not as an interface.
- **Consistency outranks the choice.** The one thing worse than either register
  is mixing them. A single *Bitte wählen Sie* in a du-app is a bug report.

| ✗ | ✓ |
|---|---|
| Prüfen Sie Ihre Verbindung | Prüfe deine Verbindung |
| Ihr Tagebuch | Dein Tagebuch |
| Über Sie | Über dich |

**Where du does not apply:** copy written in the *user's own* voice. The user
type labels answer "Hier als …" as the user speaking, so they are first person
— *Mit meiner Partnerin oder meinem Partner*, not *mit deiner*. The alt text
describing that same option is the app speaking about the reader, so it is du:
*Musie mit deiner Partnerin oder deinem Partner nutzen*.

---

## 2 · Sentence case

Headings, labels, buttons and menu items take **sentence case**: capital on the
first word, and after that only what German capitalises anyway (nouns, proper
nouns, the polite forms we do not use).

German capitalises every noun, so this rule is *only* about the words German
would otherwise leave lower-case — and about not reaching for capitals as
emphasis.

| ✗ | ✓ |
|---|---|
| Session Starten | Session starten |
| Noch Nicht Verfügbar | Noch nicht verfügbar |
| Wie Musie Funktioniert | Wie Musie funktioniert |
| NICHT GEFUNDEN | Nicht gefunden |

Emphasis is a typographic job, not an orthographic one. If a word needs weight,
that is a token, not capital letters.

---

## 3 · Verb-first for actions

A control says **what it does**. In English that literally means the verb comes
first (*Start a session*). German puts the infinitive at the end of the phrase,
so "verb-first" here means: **the label is a verb phrase, not a noun.**

| ✗ | Why it is wrong | ✓ |
|---|---|---|
| Sessionstart | nominalised; a noun names a thing, a button performs an act | Session starten |
| Du kannst eine Session starten | describes a capability instead of offering it; costs 21 characters to say less | Session starten |
| Fortsetzung der Session | genitive pile-up for a one-word action | Session fortsetzen |

The same test applies to an aria-label: *Menü öffnen*, *Profil und
Einstellungen öffnen*, *Menü schließen*. A screen-reader user hears only the
label, so the label has to contain the action.

**Exception:** a heading or a route title is not an action and takes a noun
phrase — *Übungen*, *Einstellungen*, *Dein Tagebuch*.

---

## 4 · No *Bitte*

Never *Bitte*. Not in an error, not in an empty state, not in a form hint.

Three reasons, in order of how much they matter:

1. **It changes the speech act.** *Prüfe deine Verbindung* is an instruction —
   here is the thing to do. *Bitte prüfe deine Verbindung* is a request, which
   implies the reader may decline, which they may not: it is the only route out
   of the error.
2. **It reads as apologetic.** The app is asking someone to do the thing they
   opened it to do. Apologising for that is a strange note to sound in a
   mindfulness product, and it accumulates — one *Bitte* is politeness, four is
   a nervous app.
3. **It costs measure**, in the language that has the least of it to spend.
   Seven characters and a comma's worth of rhythm, per string, on the German
   side of a budget German is already the tight case in (§5).

| ✗ | ✓ |
|---|---|
| Bitte prüfe deine Verbindung und versuche es erneut. | Prüfe deine Verbindung und versuche es erneut. |
| Bitte wähle eine Karte. | Wähle eine Karte. |

The same applies to *Leider* and *Entschuldigung* in error copy. Say what
happened and what to do.

---

## 5 · The length budget

**German runs about 30% longer than English.** That is not a rule of thumb
imported from a blog post — it is the number Layer 1's measures were derived
from, and the derivation ran in the German direction:

```css
/* packages/design-system/tokens/musy-foundations.css:617 */
--measure-body: 62ch;
--measure-heading: 26ch;
--text-hyphens: auto;          /* required for German compounds at 393px */
```

with the comment, in that file, that *"German runs ~30% longer than English, so
measures are set from the German string"*.

**So: German is the case that fits by design, and English is the one with room
to spare.** The consequence for writing is that German is where the budget
actually binds. `--measure-body: 62ch` is consumed by 10 rules in
`packages/design-system/src/musy-components.css`; it is the width your sentence
has, and it does not move.

### When a German string will not fit

In this order, and only this order:

1. **Rewrite it shorter.** Drop the *Bitte* (§4), un-nominalise the verb (§3),
   cut a subordinate clause, prefer the short word. *Etwa 15 Minuten*, not
   *Ungefähr 15 Minuten Dauer*.
2. **Split the concept** — two sentences, or a heading plus a detail line. The
   error state already does this: `content.error` is the heading and
   `content.errorDetail` is the sentence, which is why the heading carries no
   full stop.
3. **Accept the wrap** — if English takes two lines and German takes two lines,
   there is nothing to fix.

What you must **not** do:

- **Do not shrink the type.** The body-copy floor is a token
  (`--type-body-min-size`, 17px at the 393px reference) and it is an
  accessibility decision, not a layout knob. A string that only fits at 15px
  does not fit.
- **Do not let German wrap into a third line where the English takes two.**
  That is the signal that the rewrite in (1) has not been done. A 1.3× ratio
  fits the measure; a 2× ratio is a translation that has not been edited.

**A rough check while writing:** German at ≤1.3× the English character count is
inside the budget the measures were set from. Past that, you are spending room
the layout did not reserve. `exercise_i18n.guideline` is 74 characters in
English and 86 in German — 1.16×, comfortable. That is what a finished string
looks like.

---

## 6 · Compounds with no legal break point

### The mechanism, first

Layer 1 sets `--text-hyphens: auto` (`musy-foundations.css:621`), and 12 rules
in `musy-components.css` consume it as `hyphens: var(--text-hyphens)`. CSS
`hyphens: auto` hyphenates **according to the element's declared language** —
the browser needs to know it is looking at German before it can know where
*Achtsamkeitspause* may break.

That is why `<html lang>` tracking the locale is load-bearing rather than
cosmetic. It is set in `apps/web/src/LocaleProvider.tsx:69`. German copy
rendering under `lang="en"` does not fail loudly: it breaks German compounds at
English hyphenation points, which is worse than no hyphenation and invisible
until somebody reads it.

> Housekeeping: the number drifts as components are added. Re-derive it, do
> not trust a comment:
> `grep -c 'var(--text-hyphens)' packages/design-system/src/musy-components.css`
> — 12 on 2026-09-19. The count drifts; the mechanism does not.

### The rule

**A compound that HAS a break point is already handled and needs nothing from
you.** *Achtsamkeitspause*, *Hauptinhalt*, *Dunkelmodus*, *Einstellungen* — the
hyphenator breaks them and the measure absorbs them. Do not avoid a compound
because it is long. German nouns are long; that is what the token is for.

**The rule is for the compound that has none** — typically a stack of three or
more nouns, or one joined to a proper name, where no dictionary break exists
and the word goes over the edge as one unbreakable box.

**Then: rephrase or split the concept.** Prefer a **genitive** or a
**prepositional phrase** over another noun in the pile.

| ✗ | ✓ |
|---|---|
| Inhaltsübersetzungsplatzhalter | Übersetzungen der Inhalte |
| Achtsamkeitskartensetzusammenstellung | Dein gedrucktes Mindfulness-Cards-Set |
| Platzhalterbildbeschreibungstext | Platzhalterbild: Musie allein nutzen |

Two nouns is usually fine. Five is a word nobody has ever typed into a search
box, and it is a sign the sentence was translated rather than written.

### Soft hyphens (`&shy;` / `­`) — last resort, not a tool

The position: **do not use them.** Specifically, not in catalogue strings and
not in seed data. Three reasons:

1. **They defeat search and copy-paste.** A `U+00AD` inside a word means the
   word no longer matches itself — in the database, in a `grep`, in the user's
   ⌘F, in whatever the support person pastes into a ticket.
2. **They are invisible in review.** Nothing in a diff, a PR, a `psql` output
   or a proofread shows a soft hyphen. You cannot review what you cannot see,
   so it survives forever.
3. **They encode a line-break decision into data that has no idea how wide the
   box is.** The string is rendered at 393px and at 1280px, in a Content Box
   and in a Message, in two themes and at whatever the user's text-size setting
   is. A break point baked into the row was right in exactly one of those.

If one is ever genuinely unavoidable — a proper name the hyphenator cannot
know, in a box that cannot grow — it must carry a comment on the same line
saying that the invisible character is there and why. An uncommented soft
hyphen is a defect.

---

## 7 · Typography

| Thing | Use | Not |
|---|---|---|
| Quotation marks | „so“ (`U+201E` … `U+201C`) | "so", "so", «so» |
| Ranges | `2–12 Minuten` — en dash, no spaces | `2-12`, `2 – 12` |
| Parenthetical dash | ` – ` — en dash **with** spaces (Gedankenstrich) | ` — ` (the em dash is English typesetting) |
| Ellipsis | `…` (`U+2026`) | `...` |
| Decimal / thousands | `1,5` · `1.000` | `1.5` · `1,000` |
| Multiplication / times | `2 × 5` | `2 x 5` |

Two of these have already caught something in this repo:

- **The en dash in ranges is not a German rule, it is the same rule** —
  `exercises.timeframe` is `'{min}–{max} Minuten'` in German and
  `'{min}–{max} minutes'` in English, and `de.ts` carries a comment saying so.
  Nothing to translate.
- **The em dash is not.** English `route.session.title` is
  `'Current session — {step}'`, with an em dash, which is correct English
  typesetting. The German took the same character. German uses the
  Halbgeviertstrich — `'Aktuelle Session – {step}'`. This is the kind of thing
  that only a read against a written standard catches.

**A heading does not end in a full stop.** A sentence does. `content.error`
renders as a heading and `content.errorDetail` as a paragraph, and they are
punctuated accordingly.

---

## 8 · English product and technical terms

Three cases, decided separately:

1. **Product names do not translate.** *Musie* is *Musie*. *Mindfulness Cards*
   is the name of a physical deck and stays *Mindfulness Cards*. Track titles
   and artist names are not translated either — which is why `public.tracks`
   has no `_i18n` sibling at all. *Morgenlicht* stays *Morgenlicht*.
2. **Terms of art keep the form the German-speaking field actually uses.**
   *Body Scan* and *Soundwalk* are the words German mindfulness and acoustic-
   ecology practice use; inventing *Körperabtastung* would be a translation
   nobody asked for and nobody would recognise. Translate the connective
   tissue, keep the term: **Body Scan als Soundwalk**.
3. **Everything else gets German.** *Dunkelmodus*, not *Dark Mode*. *Sprache*,
   not *Language*. *Wird geladen…*, not *Loading…*. An English word in the
   chrome is a string somebody forgot, not a style.

**One decided exception, and it is a product word: a session is a *Session*.**
Not *Sitzung*. It shipped as *Sitzung* and was changed throughout on
2026-09-21 (Ben). *Sitzung* is what a therapist has with a patient or a
committee has on a Tuesday — it is clinical and institutional, and Musie's
whole posture is that you are not a patient. *Session* is the word German
already uses for a stretch of time you give to something on purpose, in music
above all, which is exactly what this is.

It declines like any German feminine noun — **die Session**, *eine Session*,
*der Session* — so adjective endings are unchanged from *Sitzung* and nothing
else in a string has to move. The plural takes the English `-s`: **Sessions**,
never *Sessionen*.

**Joining an English name to a German noun takes hyphens throughout**
(Durchkopplung): **Mindfulness-Cards-Set**, not *Mindfulness Cards Set* and not
*Mindfulnesscardsset*. This is also a §6 fix — the hyphens give the hyphenator
break points it would otherwise not have.

**Endonyms in a language picker are not copy.** `LOCALE_LABELS` is
`{ en: 'English', de: 'Deutsch' }` and deliberately does not go through `t()`:
somebody looking for German is looking for the word *Deutsch*. Translating
those two strings is the bug.

---

## 9 · Gendering — an open question, flagged not settled

Where a role has a gendered form, this repo currently uses the **paired form**
(Doppelnennung): *Mit meiner Partnerin oder meinem Partner*, *Mit einer
Patientin oder einem Patienten*.

It is the safest default — it is unambiguous, it reads aloud correctly in a
screen reader, and it needs no glyph whose accessibility is contested. It is
also the **longest** option, which fights §5.

The alternatives (*Partner:in*, *Partner\*in*, *Partner/-in*, or neutral
rephrasing such as *zu zweit*) are a **brand voice decision, not a writing-rule
decision**, and are the product owner's to make. If one is chosen, it applies
everywhere at once and this section gets rewritten to say so.

---

## 10 · Checklist before a German string is done

- [ ] du, lower case, and no `Sie` / `Ihr` anywhere near it
- [ ] Sentence case; no capitals used as emphasis
- [ ] An action reads as a verb phrase, not a noun
- [ ] No *Bitte*, no *Leider*, no *Entschuldigung*
- [ ] ≤ ~1.3× the English character count, and no third line where English takes two
- [ ] No unbreakable noun pile-up; no soft hyphen (or one, commented)
- [ ] „ “ quotes, `–` for ranges and parentheticals, `…` not `...`
- [ ] Heading has no full stop; sentence does
- [ ] Interpolation slots spelled exactly as in `en.ts` (`{min}`, `{max}`, `{step}`)
- [ ] Read it out loud. If it sounds like a translation, it is one.
