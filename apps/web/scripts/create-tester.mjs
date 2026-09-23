/**
 * Beta accounts, created by hand — H.0's whole implementation.
 *
 * ── WHY A SCRIPT AND NOT A SIGN-UP SCREEN ─────────────────────────────────
 * Self-service signup means a confirmation mail, a password-reset mail, a
 * sending provider and a sending domain — and the domain is still undecided
 * (decision 1 at the foot of BUILD-PLAN.md). Supabase's built-in SMTP is not
 * an escape: it only delivers to members of the project's own organisation, so
 * an external tester would never receive the mail whatever the rate limit
 * said.
 *
 * `email_confirm: true` on an admin insert is what routes around all of it.
 * The account arrives already confirmed, so it can sign in immediately and NO
 * MAIL IS SENT ON ANY PATH — no provider, no sending domain, no DNS record.
 * That is the entire trick, and it is a service-role operation, which is why
 * it lives in a script run by hand and can never be reachable from the app.
 *
 * ── WHAT IT GIVES UP, SO NOBODY DISCOVERS IT AT A TESTER'S EXPENSE ────────
 * An account created here is a NEW `auth.users` row with a NEW id, and none of
 * an anonymous diary comes with it. `updateUser({ email })` is refused with
 * `email_exists` once the address is taken, so an account created here can
 * NEVER be converted into — proved in `src/lib/auth.convert.db.test.ts`.
 *
 * So a tester who does three sessions anonymously and then signs in lands in
 * an empty diary, with the old one stranded on an anonymous id nobody can
 * reach. TESTERS SIGN IN BEFORE THEIR FIRST SESSION. `src/lib/auth.ts` already
 * makes the right order work — `getSession()` runs before
 * `signInAnonymously()`, so a signed-in browser never becomes an anonymous
 * one — and `VITE_REQUIRE_ACCOUNT` (H.0b) is what stops the wrong order being
 * reachable at all. The credential block this script prints says so, because
 * the instruction has to travel with the password.
 *
 * That trade is defensible for twenty testers and indefensible for twenty
 * thousand. It is not a draft of self-service signup; that is H.3.
 *
 * ── THE KEY IS READ FROM THE RUNNING STACK, NOT COMMITTED ─────────────────
 * Same rule and same mechanism as `src/lib/db.support.ts`: `supabase status
 * -o json` by default, so no service-role key is ever written into a file.
 * For a hosted project, pass the two variables for ONE run:
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SECRET_KEY=sb_secret_… \
 *     node scripts/create-tester.mjs ben@example.com
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is still accepted; see `target()` for why the
 * secret key is the one to prefer.
 *
 * Both or neither — a partial set means somebody meant to point this at a
 * hosted project and got it half right, and quietly creating the account on
 * the LOCAL stack instead is the worst possible outcome: it looks like it
 * worked and the tester cannot sign in.
 *
 * The target is PRINTED before anything is created. This writes real users to
 * whichever project it is aimed at.
 *
 * USAGE
 *   node scripts/create-tester.mjs ben@example.com
 *   node scripts/create-tester.mjs a@x.com b@x.com c@x.com
 *   node scripts/create-tester.mjs a@x.com --password chosen-by-hand
 *
 * One `createUser` call per address, in order, each reported on its own line.
 * A failure on one address does not stop the others: with ten testers in one
 * command, the one that already exists must not cost the other nine.
 */
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * The generated password's alphabet: no 0/O, no 1/l/I, no 5/S.
 *
 * These are READ ALOUD OR TYPED ON A PHONE by somebody who did not choose
 * them, so a character whose identity depends on the font is a support
 * request. Lowercase only for the same reason — `minimum_password_length = 6`
 * and no strength requirement in `config.toml`, so nothing here is buying
 * complexity it does not need.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const GROUPS = 3;
const GROUP_LENGTH = 4;

/**
 * `randomInt` and not `Math.random`, and not `randomBytes % length` either.
 * The modulo of a byte over 31 is biased toward the first characters, and a
 * biased password generator is the kind of thing that is never noticed. Node's
 * `randomInt` rejects and retries internally, so the distribution is uniform.
 */
function generatePassword() {
  const groups = [];
  for (let group = 0; group < GROUPS; group += 1) {
    let chunk = '';
    for (let index = 0; index < GROUP_LENGTH; index += 1) {
      chunk += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(chunk);
  }
  /* Hyphens are not part of the alphabet, so they add no entropy — they make
     a 12-character string readable over the phone, which is the job. */
  return groups.join('-');
}

/** `--flag value` pairs, and bare arguments. Same shape as qr-codes.mjs. */
function parseArgs(argv) {
  const flags = {};
  const bare = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = argv[i + 1] ?? '';
      i += 1;
    } else {
      bare.push(arg);
    }
  }
  return { flags, bare };
}

/**
 * The project to write to: the environment override, or the local stack.
 *
 * Throws on a partial override rather than falling through to localhost.
 */
/**
 * ── TWO NAMES FOR THE KEY, BECAUSE SUPABASE NOW RECOMMENDS THE OTHER ONE ───
 * `SUPABASE_SECRET_KEY` is the name to reach for. The dashboard has started
 * saying so beside the legacy one: "This key has the ability to bypass Row
 * Level Security … Prefer using Secret API keys instead." A leaked `sb_secret_`
 * key is revoked on its own; a leaked `service_role` JWT is signed by the
 * project's JWT secret, so containing it means rotating that secret and
 * invalidating every token the project has issued.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` still works, and is still what `db.support.ts`
 * and `supabase status` call it. Both accepted rather than one renamed: a
 * script that stopped taking the old name would break the runs somebody already
 * has in their shell history, and this is the file you run while handing out
 * credentials — not the moment to be told your variable is spelled wrong.
 *
 * MEASURED, not assumed: an `sb_secret_` key was run through this script
 * against the local stack on 2026-09-23 and `auth.admin.createUser` accepted it
 * exactly like the JWT.
 */
function target() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url || key) {
    if (!url || !key) {
      throw new Error(
        'Pointing this somewhere needs BOTH SUPABASE_URL and a key — ' +
          'SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY. Set ' +
          'both or neither: a partial set would silently create the account on ' +
          'the local stack, which looks like it worked and leaves the tester ' +
          'unable to sign in.',
      );
    }
    return { url, key, where: 'from the environment' };
  }

  let raw;
  try {
    raw = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(
      'The local Supabase stack is not reachable. Run `supabase start`, or set ' +
        'SUPABASE_URL and SUPABASE_SECRET_KEY to create the account on a ' +
        'hosted project.',
    );
  }

  const parsed = JSON.parse(raw);
  if (!parsed.API_URL || !parsed.SERVICE_ROLE_KEY) {
    throw new Error('`supabase status -o json` returned no keys.');
  }
  return { url: parsed.API_URL, key: parsed.SERVICE_ROLE_KEY, where: 'local stack' };
}

/**
 * Create one tester, and check the two things that make the account usable.
 *
 * `email_confirmed_at`, because an unconfirmed account cannot sign in without
 * mail and that is the whole mechanism. And the `profiles` row, because
 * `on_auth_user_created` is what puts it there and the app reads it on boot —
 * a tester who can sign in but has no profile would see the locale gate never
 * resolve, and the cause would be three layers away from the symptom.
 */
async function createTester(service, email, password) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error !== null) {
    /* Named rather than passed through: `email_exists` is the one failure with
       a consequence somebody has to understand, because it cannot be resolved
       by converting the anonymous session that is probably sitting in that
       tester's browser. */
    if (error.code === 'email_exists') {
      throw new Error(
        `${email} already has an account. Reset its password in the Supabase ` +
          'dashboard — it cannot be re-created, and an existing address can ' +
          'never be converted onto from an anonymous session.',
      );
    }
    throw new Error(`${email}: ${error.message}`);
  }

  const user = data.user;

  if (!user.email_confirmed_at) {
    throw new Error(
      `${email} was created but is NOT confirmed, so it cannot sign in and no ` +
        'mail will arrive to confirm it. Check `[auth.email] enable_confirmations` ' +
        'and that this ran with the service role.',
    );
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError !== null) {
    throw new Error(`${email}: could not verify the profiles row — ${profileError.message}`);
  }
  if (profile === null) {
    throw new Error(
      `${email} was created but has no profiles row, so on_auth_user_created ` +
        'did not fire. The app reads that row on boot; do not hand this account out.',
    );
  }

  return user;
}

async function main() {
  const { flags, bare } = parseArgs(process.argv.slice(2));

  if (bare.length === 0) {
    throw new Error(
      'Give one or more email addresses: node scripts/create-tester.mjs ben@example.com',
    );
  }

  const { url, key, where } = target();
  /* Loud, and before anything is written. */
  console.log(`[musie] creating accounts on ${url} (${where})\n`);

  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const handedOut = [];
  let failed = 0;

  for (const email of bare) {
    /* A shared `--password` when one is given — handing the same credential to
       a room of testers at a workshop is a real thing to want — and otherwise
       a fresh one per tester, which is the default because a shared password
       makes "which tester said what" unanswerable, and that is one of the two
       reasons H.0 exists. */
    const password = flags.password || generatePassword();
    try {
      const user = await createTester(service, email, password);
      handedOut.push({ email, password, id: user.id });
      console.log(`  created  ${email}  ${user.id}`);
    } catch (thrown) {
      failed += 1;
      console.error(`  FAILED   ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    }
  }

  if (handedOut.length > 0) {
    /* The credentials and the instruction, together. The instruction is not
       optional context: signing in AFTER a first session silently strands
       that session's diary on an anonymous id, and it looks exactly like data
       loss. Printed in English only — this is an operator's terminal, not
       part of the product, so rules 6 and 7 do not reach it. */
    console.log('\n── Hand out, one block per tester ' + '─'.repeat(44));
    for (const { email, password } of handedOut) {
      console.log(
        `\n  Email:    ${email}` +
          `\n  Password: ${password}` +
          '\n  Sign in BEFORE your first session. An exercise you do before' +
          '\n  signing in is saved to this browser only and cannot be moved.',
      );
    }
    console.log(
      `\n${'─'.repeat(78)}\n` +
        'Nothing above is stored anywhere but this terminal. A forgotten password\n' +
        'is reset in the Supabase dashboard — there is no reset mail until H.1.',
    );
  }

  if (failed > 0) process.exitCode = 1;
}

main().catch((thrown) => {
  console.error(`[musie] ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  process.exitCode = 1;
});
