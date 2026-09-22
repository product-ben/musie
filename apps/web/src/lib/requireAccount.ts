/**
 * `VITE_REQUIRE_ACCOUNT` — the flag that turns the beta's sign-in gate on.
 *
 * ── WHY A FLAG AND NOT A DELETION ──────────────────────────────────────────
 * Off (the default), the app behaves exactly as it did before H.0b: no
 * session means `signInAnonymously()`, and the first exercise costs nobody an
 * email address. That path is not dead code and must not be deleted — it is
 * the behaviour H.2 proves convertible and H.3 builds sign-up on top of, and
 * it is what going public again looks like. Deleting it would make that a
 * rewrite; keeping it makes it a variable.
 *
 * On, there is no anonymous fall-through at all. Testers sign in before their
 * first session, which is what keeps the beta CLOSED — and a closed beta is
 * what keeps a subscription-licensed master and a `[DE] `-prefixed placeholder
 * content set off the open internet while the app sits on a real domain.
 *
 * ── THE PARSE IS STRICT, AND LOUD WHEN IT IS NOT SURE ──────────────────────
 * The two failure directions are not symmetrical. A flag meant to be ON that
 * parses as off opens the beta to anyone with the URL, silently, which is the
 * whole licensing argument undone. A flag meant to be OFF that parses as on
 * shows a sign-in form to somebody who cannot get past it — annoying, visible
 * within seconds, and nobody's licence problem.
 *
 * So the dangerous direction is the quiet one, and the answer is not to guess
 * more cleverly: `VITE_REQUIRE_ACCOUNT=True` is accepted (case is a typo, not
 * an intent), and anything else non-empty is refused AND WARNED ABOUT rather
 * than folded into `false`. A misspelling has to be visible in the console of
 * the build that shipped it.
 *
 * Vite hands every environment variable through as a STRING — there is no
 * boolean coercion in `import.meta.env` — so `'false'` is truthy to
 * JavaScript and a bare `Boolean(...)` here would be permanently on.
 */

/** The spellings that mean yes. Compared lower-cased, so `True` is accepted. */
const TRUTHY = ['true', '1', 'on', 'yes'];

/** The spellings that mean no, listed so an unrecognised value is distinct
 *  from a deliberate `false` and only the former warns. */
const FALSY = ['false', '0', 'off', 'no'];

/**
 * Pure, and exported for the unit test: the flag's whole behaviour is in the
 * parse, and the parse is the part that can be wrong without anything failing.
 */
export function parseRequireAccount(raw: string | undefined): boolean {
  /* Unset and empty are the default, and neither is a mistake worth a warning:
     `.env.example` ships the key commented out. */
  if (raw === undefined) return false;
  const value = raw.trim().toLowerCase();
  if (value === '') return false;

  if (TRUTHY.includes(value)) return true;
  if (FALSY.includes(value)) return false;

  /* Loud, because this is the quiet-failure direction described above. */
  console.warn(
    `[musie] VITE_REQUIRE_ACCOUNT is set to ${JSON.stringify(raw)}, which is ` +
    `neither ${TRUTHY.join('/')} nor ${FALSY.join('/')}. Treating it as OFF — ` +
    'the sign-in gate is NOT active and anonymous sign-in is reachable.',
  );
  return false;
}

/**
 * Read at CALL TIME rather than folded into a module constant.
 *
 * A `const` evaluated on import would be baked in before any test could vary
 * it, and would also make the flag's value depend on module import order. The
 * read is one property access; there is nothing to memoise.
 */
export function requireAccount(): boolean {
  return parseRequireAccount(import.meta.env.VITE_REQUIRE_ACCOUNT);
}
