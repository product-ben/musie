/**
 * Access codes — generate them, see them, retire them.
 *
 * The codes Ben and Lucy read out to trial users. Four digits, claimed once
 * (or a budgeted number of times) at sign-up, and gone from the product
 * entirely when the beta opens.
 *
 * ── WHY A SCRIPT AND NOT A MIGRATION ──────────────────────────────────────
 * Rule 4 says new rows arrive in a new migration. These cannot:
 * `product-ben/musie` is a PUBLIC repository, so a migration stating codes
 * would publish every one of them to GitHub the moment it was pushed. The
 * table travels by migration; the rows travel by this, which prints them once
 * and writes nothing — not to a file, not to the repo, not to a log.
 *
 * ── WHAT A CODE IS AND IS NOT ─────────────────────────────────────────────
 * It is a door policy. Project-level sign-ups stay enabled (Ben, 2026-10-20 —
 * see the migration header), so a determined person who reads the shipped
 * bundle can create an account without ever meeting one of these. What a code
 * buys is that nobody joins by ACCIDENT, and that every real signup is
 * attributable to one somebody handed out.
 *
 * So the four digits are not protecting much, and the thing that would be
 * embarrassing is a code somebody guesses on the second try. Hence `OBVIOUS`
 * below.
 *
 * ── THE KEY IS READ FROM THE RUNNING STACK, NOT COMMITTED ─────────────────
 * Same rule and same mechanism as `create-tester.mjs` and `db.support.ts`:
 * `supabase status -o json` by default, so no service-role key is ever written
 * into a file. For the hosted project, pass both for ONE run:
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SECRET_KEY=sb_secret_… \
 *     node apps/web/scripts/access-codes.mjs new --count 30
 *
 * Both or neither. A partial set would quietly write to the LOCAL stack, which
 * looks like it worked and hands out codes that do not exist where the testers
 * are. The target is PRINTED before anything is written.
 *
 * USAGE
 *   node apps/web/scripts/access-codes.mjs new --count 30
 *   node apps/web/scripts/access-codes.mjs new --count 1 --uses 10 --note "UXDX workshop"
 *   node apps/web/scripts/access-codes.mjs list
 *   node apps/web/scripts/access-codes.mjs revoke 4821
 */
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Codes nobody should be handed, because they are what a bored person types
 * first. Four repeated digits, the two obvious runs, and the year.
 */
const OBVIOUS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '0123', '2026', '1337', '0001',
]);

/** Where this run will write, and how it was decided. */
function target() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url || key) {
    if (!url || !key) {
      throw new Error(
        'Pointing this somewhere needs BOTH SUPABASE_URL and a key — '
        + 'SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY. Set '
        + 'both or neither: a partial set would silently write the codes to the '
        + 'local stack, and the testers you read them to are not there.',
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
      'The local Supabase stack is not reachable. Run `supabase start`, or set '
      + 'SUPABASE_URL and SUPABASE_SECRET_KEY to write to a hosted project.',
    );
  }

  const status = JSON.parse(raw);
  const key2 = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!status.API_URL || !key2) {
    throw new Error('`supabase status` did not report an API URL and a secret key.');
  }
  return { url: status.API_URL, key: key2, where: 'the local stack' };
}

function flag(argv, name, fallback) {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? fallback : argv[at + 1];
}

/**
 * A batch of distinct, non-obvious codes that are not already in the table.
 *
 * Checked against what EXISTS rather than only against this batch: a code
 * reissued while the first holder has not used theirs yet would have two
 * people racing for one budget, and only one of them would get in.
 */
async function mint(db, count) {
  const { data, error } = await db.from('access_codes').select('code');
  if (error) throw new Error(`Could not read the existing codes: ${error.message}`);

  const taken = new Set((data ?? []).map((row) => row.code));
  const batch = [];

  /* 10,000 possible codes. The loop is bounded so that a nearly-full table
     fails loudly rather than spinning — at which point the beta has outgrown
     four digits anyway. */
  for (let tries = 0; batch.length < count && tries < 100_000; tries += 1) {
    const code = String(randomInt(0, 10_000)).padStart(4, '0');
    if (taken.has(code) || OBVIOUS.has(code)) continue;
    taken.add(code);
    batch.push(code);
  }

  if (batch.length < count) {
    throw new Error(
      `Only ${batch.length} of ${count} codes could be minted — the table is nearly full. `
      + 'Revoke what is spent, or the beta has outgrown four digits.',
    );
  }
  return batch;
}

async function commandNew(db, argv) {
  const count = Number(flag(argv, 'count', '30'));
  const uses = Number(flag(argv, 'uses', '1'));
  const note = flag(argv, 'note', null);

  if (!Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error('--count must be a whole number between 1 and 500.');
  }
  if (!Number.isInteger(uses) || uses < 1 || uses > 500) {
    throw new Error('--uses must be a whole number between 1 and 500.');
  }

  const codes = await mint(db, count);
  const { error } = await db
    .from('access_codes')
    .insert(codes.map((code) => ({ code, max_uses: uses, note })));
  if (error) throw new Error(`Could not write the codes: ${error.message}`);

  console.log(`\n${count} code${count === 1 ? '' : 's'}, ${uses} use${uses === 1 ? '' : 's'} each${note ? ` · ${note}` : ''}:\n`);
  /* Four per line, so a batch of thirty is read off a screen rather than
     scrolled through. */
  for (let i = 0; i < codes.length; i += 4) {
    console.log(`   ${codes.slice(i, i + 4).join('   ')}`);
  }
  console.log(
    '\nThese are shown ONCE. Nothing wrote them to a file, and the table cannot\n'
    + 'be read by the app — copy them somewhere before closing this window.\n',
  );
}

async function commandList(db) {
  const { data, error } = await db
    .from('access_codes')
    .select('code, uses, max_uses, note, revoked_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not read the codes: ${error.message}`);

  const rows = data ?? [];
  if (rows.length === 0) {
    console.log('\nNo codes yet. `new --count 30` makes a batch.\n');
    return;
  }

  const claims = await db.from('access_code_claims').select('code, email, user_id, claimed_at');
  const byCode = new Map();
  for (const claim of claims.data ?? []) {
    byCode.set(claim.code, [...(byCode.get(claim.code) ?? []), claim]);
  }

  console.log('');
  for (const row of rows) {
    const state = row.revoked_at !== null
      ? 'revoked'
      : row.uses >= row.max_uses ? 'spent' : `${row.uses}/${row.max_uses}`;
    console.log(`   ${row.code}  ${state.padEnd(8)} ${row.note ?? ''}`);
    for (const claim of byCode.get(row.code) ?? []) {
      /* `user_id` null means claimed but never created — a signup that died
         between the claim and the account. `release_access_code` is what
         undoes it; this is where you would notice one stuck. */
      const bound = claim.user_id === null ? ' (claimed, no account)' : '';
      console.log(`         ${claim.email}${bound}`);
    }
  }
  console.log('');
}

async function commandRevoke(db, code) {
  if (!/^[0-9]{4}$/.test(code ?? '')) {
    throw new Error('revoke needs a four-digit code: `revoke 4821`.');
  }

  const { data, error } = await db
    .from('access_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('code', code)
    .is('revoked_at', null)
    .select('code');
  if (error) throw new Error(`Could not revoke ${code}: ${error.message}`);

  if ((data ?? []).length === 0) {
    console.log(`\n   ${code} is not there, or was already revoked.\n`);
    return;
  }
  /* Retired, never deleted: the claims that already used it keep pointing at
     a row that still exists. Anyone already signed in with it stays signed in
     — this stops it being used AGAIN, it does not undo a signup. */
  console.log(`\n   ${code} revoked. Nobody new can use it; anyone already in stays in.\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? 'help';

  if (command === 'help' || command === '--help') {
    console.log(
      '\n  new --count 30 [--uses 1] [--note "..."]   mint a batch and print it once'
      + '\n  list                                      every code, its budget and who claimed it'
      + '\n  revoke 4821                               stop a code being used again\n',
    );
    return;
  }

  const { url, key, where } = target();
  /* Printed BEFORE anything is written, like create-tester.mjs: this writes
     real rows to whichever project it is aimed at, and aiming it wrongly is
     the mistake that looks like success. */
  console.log(`\n[access-codes] ${command} → ${url} (${where})`);

  const db = createClient(url, key, { auth: { persistSession: false } });

  if (command === 'new') return commandNew(db, argv);
  if (command === 'list') return commandList(db);
  if (command === 'revoke') return commandRevoke(db, argv[1]);

  throw new Error(`Unknown command \`${command}\`. Try \`help\`.`);
}

main().catch((error) => {
  console.error(`\n[access-codes] ${error.message}\n`);
  process.exitCode = 1;
});
