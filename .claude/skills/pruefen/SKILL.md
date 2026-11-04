---
name: pruefen
description: Run the repo's gate (pnpm check) on Lucia's current idea and explain the result in plain German. Only when she types /pruefen.
disable-model-invocation: true
---

# /pruefen — does it hold up?

Run `pnpm check` from the repository root. It is typecheck, lint and unit
tests; it takes a minute or two. Tell her in one German sentence that it is
running.

**Green:** tell her it passed, and that `/vorschlagen` sends it to Ben.

**Red:** fix what you can. The usual causes in her kind of change:

- a string added in `apps/web/src/i18n/en.ts` without its German twin in
  `de.ts`, or the other way round — write the missing one (repo `CLAUDE.md`
  rule 6);
- a test that asserted the old wording or the old number — update it if the
  change is what she asked for;
- a lint complaint — follow it.

Run `pnpm check` again after each fix. If something still fails and you cannot
fix it without touching what the guard forbids, tell her in one plain sentence
that Ben will have to look at it, and keep the failure text for the pull
request. Never show her the raw output.
