/**
 * `pnpm deck:migration` — RETIRED 2026-10-14.
 *
 * ── WHAT THIS USED TO DO ──────────────────────────────────────────────────
 * It read `supabase/content/deck.json` and wrote a migration stating the
 * WHOLE deck: upserting every card, every feeling, every pairing, and
 * deleting whatever the file no longer carried. That was right while the file
 * was the only place the deck was written by hand, and `20260924140001`,
 * `20261002153212` and `20261009110001` are its output.
 *
 * ── WHY IT CANNOT STAY ────────────────────────────────────────────────────
 * The deck is edited at `/maintenance` and lives in the database now. A
 * migration that states the whole deck would put the FILE's version back over
 * whatever an operator changed — on the next `supabase db reset`, or on the
 * next merge to `main` through `db-push.yml`. Silently, with typecheck, lint,
 * the unit tests and CI all green, and the damage surfacing later as a card
 * that plays the wrong thing. That is CLAUDE.md rule 4's own trap arriving
 * through the door the maintenance UI opened, and rule 4.1 is the amendment
 * that says so.
 *
 * ── WHY THE GENERATOR IS GONE AND NOT JUST UNREACHABLE ────────────────────
 * The first version of this refusal sat at the top of `main()` with the four
 * hundred lines of generator still underneath it. `eslint` called that what it
 * was — unreachable code — and it was right about more than style: a retired
 * generator that still contains a working generator is one `return` away from
 * running, and the next person to read it would have to work out which half
 * was live. `git log` has every line of it.
 *
 * ── WHAT REPLACED EACH OF ITS JOBS ────────────────────────────────────────
 *   the deck, changed       → /maintenance
 *   the snapshot, refreshed → pnpm content:export
 *   the schema, changed     → a migration written by hand, as for any table
 *   the reason, recorded    → public.content_edits, which names the operator
 *
 * `deck.mjs` — the VALIDATOR — is untouched and still used: the rules about
 * what a card is have not changed, and `deck.test.ts` imports all of them.
 * `deck-pdf.mjs` is untouched too; `deck.json` is still exactly what it reads.
 */

console.error([
  '',
  'pnpm deck:migration is retired.',
  '',
  'The deck is edited at /maintenance and lives in the database. Generating a',
  'migration from supabase/content/deck.json would state the whole deck and',
  'overwrite whatever has been changed there — CLAUDE.md rule 4.1, and',
  'MAINTENANCE-UI.md for the whole argument.',
  '',
  '  to change the deck       open /maintenance',
  '  to refresh the snapshot  pnpm content:export',
  '  to change the SCHEMA     write a migration by hand, as for any other table',
  '',
  'What a card IS has not changed, and deck.mjs still checks all of it.',
  '',
].join('\n'));

process.exitCode = 1;
