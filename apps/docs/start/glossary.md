# Glossary

The product's vocabulary is strictly kept. Using a different word for one of
these means the screen and the database disagree about what a thing is.

::: designers
## The product's words

| Word | Means | Never |
|---|---|---|
| **Exercise** (*Übung*) | one of the five guides | **"method"** — retired everywhere |
| **Session** | one run through one exercise, intro to reflection | "exercise" |
| **Card** (*Karte*) | one of the nine printed picture cards, each a feeling | |
| **Deck** | the whole Mindfulness Cards set | |
| **Reflection** (*Reflexion*) | what you write or say at the end. **Always text**, however entered | "entry" |
| **Diary** (*Tagebuch*) | all of a person's sessions that are no longer running | "history", "feed" |
| **Goal** (*Anlass*) | the reason somebody starts an exercise — modelled, not yet asked | "situation" (the old name) |
| **Reveal** | the release of title and artist after listening | |
| **Cut** | a produced recording of a listening exercise — guidance over music | "track" |
| **Piece** | music as released: a title, an artist, a licence | |

## And the form of address

**du**, lower-case, throughout. No *Sie*, no capitalised *Du* — that reads as
correspondence rather than as an interface. No "please", no exclamation marks,
no encouragement.

**Musie demands nothing.**

The one exception: copy in the **user's own voice**. The "Here as …" answers are
the user speaking, so they are first person.

## Words that are not the product's

| | |
|---|---|
| **user** | fine in documentation and in code. Musie never says it |
| **method** | retired. It survives as an identifier nowhere |
| **situation** | the old name for a goal. Renamed in the schema on 2026-10-07 |
| **track name** | the product says **title** and **artist** |
:::

::: devs
## The technical terms

| Term | Means |
|---|---|
| **Layer 1 / 2 / 3** | tokens / components / layout rules, in the design system |
| **semantic alias** | `--surface`, `--interactive-primary-hover`. The API |
| **raw scale** | `--sand-9`. **Never consumed directly** |
| **the gate** (listen) | `listen_gate_seconds` — how much of the track unlocks the reflection |
| **the gate** (auth) | `SignInGate` — the sign-in wall. Unconditional since 2026-10-20 |
| **column grant** | `grant select (…)` — how `tracks.title` is withheld |
| **the drift** | the local and hosted databases disagreeing silently |
| **the walk** | `pnpm test:e2e` — one Playwright pass through a whole session |
| **the stack** | the local Supabase containers. There is **one** |
| **a cut** | `exercise_cuts` — a produced listening recording |
| **mixed / voice** | the two files of a cut: as mixed, and with the music removed |
| **provisional** | content from the spreadsheet; it will be overwritten |
| **chrome** | `i18n/en.ts` + `de.ts`. Ours and permanent |

## The identifier conventions

| Shape | Is |
|---|---|
| `mc-01` | a card id — the lower case of its printed code |
| `MC-01` | the **printed** code, and what the QR encodes |
| `trk-01` | a track id. **Opaque on purpose** — never a title slug |
| `cut-sound-journey-de-lying-sleep` | a cut id, **derived** from its four answers |
| `mindfulness-cards`, `free-rein`, `body-scan-soundwalk` | exercise ids. Stable handles; the names move, these do not |
| `card_based`, `listening_only`, `digital_interactive` | `exercises.kind`. snake_case, **because that is what the column holds** |
| `started`, `finished`, `abandoned` | `sessions.status`, verbatim |
| `intro`, `scan`, `listen`, `reflect` | `sessions.step`, verbatim |

**The database's vocabulary is not translated at the boundary.** Translating
`listening_only` to camelCase would move the **value** too, so a grep would find
the schema or the app but never both. Compare `needs_cards` → `needsCards`,
where only the key moves and the mapping is safe.

## The citation prefixes

| | |
|---|---|
| `M1`–`M17` | maintenance-day decisions |
| `DOC1`–`DOC4` | this site's decisions |
| `D1`–`D14`… | schema decisions, in `DOMAIN-MODEL.md` |
| `B1`–`B5` | backlog items |
| `L0`–`L15` | layout rules |
| `G1`, `G2` | the two token gaps |
| `A.1`, `C.7`, `E.5`, `F.6`, `H.0b`… | BUILD-PLAN steps, by phase |

Phase letters, since they appear in code comments constantly:

```
A  close the gaps          E  the card and the track
B  the design system       F  voice
C  session state           H  accounts and the beta
D  the reflection
```

## Two words that mean different things in two places

**"The gate"** — the listening gate and the sign-in gate are unrelated. Context
decides; if it is ambiguous, say which.

**"Content"** — either the content *tables* (provisional, from the spreadsheet)
or content as opposed to chrome. [Content and copy](/product/content) keeps them
apart.
:::

---

**Source of truth:**
[docs/MUSIE-BRIEFING.md](https://github.com/product-ben/musie/blob/main/docs/MUSIE-BRIEFING.md) §8,
[docs/GERMAN-UI-WRITING.md](https://github.com/product-ben/musie/blob/main/docs/GERMAN-UI-WRITING.md),
[DOMAIN-MODEL.md](https://github.com/product-ben/musie/blob/main/DOMAIN-MODEL.md),
[BUILD-PLAN.md](https://github.com/product-ben/musie/blob/main/BUILD-PLAN.md).
