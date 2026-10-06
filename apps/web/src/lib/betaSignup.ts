/**
 * Putting somebody on the closed-beta list — the whole of what `/beta` does.
 *
 * One INSERT into `public.beta_signups`, with the anon key, from a page that
 * has no session. The table is shaped for exactly that and for nothing else:
 * insert-only, three grantable columns, no select policy for the client. Read
 * the ACCESS block of `20261006120000_beta_signups.sql` before changing
 * anything here.
 *
 * ── NEVER CHAIN `.select()` ONTO THE INSERT ────────────────────────────────
 * The client holds `insert (first_name, email, reason_code)` and no `select` at
 * all. Bare, supabase-js sends `Prefer: return=minimal` and PostgREST returns
 * 201 with no body, which is what works. Add `.select()` — to log the new id,
 * say — and the same statement starts asking for a representation, the read
 * half fails on the missing grant, and a write that SUCCEEDED reports as an
 * error. It is a one-word change with no local symptom, because the local
 * stack's default privileges hide it. Hence this paragraph.
 *
 * ── THE ERROR IS MAPPED TO A KEY, NOT SHOWN ────────────────────────────────
 * The same rule `lib/signIn.ts` states: PostgREST's messages are English prose
 * we do not own, and one of them rendered inside the German form is the
 * half-German UI rule 7 exists to prevent. So every failure resolves to a
 * `MessageKey` here and the screen renders copy the catalogue holds in both
 * languages.
 *
 * ── A SECOND SUBMIT OF THE SAME ADDRESS IS SUCCESS ─────────────────────────
 * `beta_signups_email_unique` refuses it and PostgREST answers 23505. The
 * screen says thank you anyway, because:
 *
 *   it is TRUE — the person is on the list, which is the only thing the
 *   sentence claims, and the commonest way to get here is a reload or a second
 *   tap by somebody who was not sure the first one worked;
 *
 *   and the alternative LEAKS. "You are already on the list" is an answer to
 *   "is this address on the list?", asked by anyone holding the public anon
 *   key. The table refuses to be read for that reason; a message that reports
 *   what it would have said is the same leak through the front door.
 *
 * (The HTTP status still differs, so the distinction is visible to somebody
 * reading the network tab deliberately. That is a different and much smaller
 * thing than a sentence on screen, and closing it would need the write behind
 * an Edge Function — logged in apps/web/OPEN-QUESTIONS.md.)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MessageKey } from '../i18n';
import { isBetaReasonCode } from './betaReasons';
import { getSupabase } from './supabase';

export interface BetaSignupFields {
  firstName: string;
  email: string;
  /** '' until a radio is pressed. */
  reasonCode: string;
}

export type BetaSignupResult =
  | { ok: true }
  | { ok: false; messageKey: MessageKey };

/**
 * The caps and the shape, matching `beta_signups`' own check constraints.
 *
 * Both halves are needed and neither is redundant. The constraint is the one
 * that cannot be skipped — the anon key is public, so the browser is not a
 * trustworthy validator — and this is the one that produces a SENTENCE
 * somebody can act on instead of a 400 from PostgREST.
 *
 * The email pattern is deliberately as weak as the column's: something@
 * something.something, no spaces. The constraint's comment says why at length
 * — every regex claiming RFC 5322 rejects an address somebody owns, and the
 * only real test of an address is sending to it, which this form never does.
 */
export const FIRST_NAME_MAX = 80;
export const EMAIL_MAX = 254;
export const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * One key per field, or null where the field is fine.
 *
 * Per FIELD rather than one message for the form, because `Field` and
 * `RadioGroupText` both take an `error` prop that marks the control itself and
 * wires `aria-describedby` to the text — so the answer to "which of these is
 * wrong" is drawn next to the thing that is wrong, rather than in a summary
 * the person has to map back onto three controls.
 *
 * Pure, and exported for its test: this is the part of the file a unit test can
 * reach. The round trip is tested against the real stack in
 * `betaSignup.db.test.ts` (this repo mocks no Supabase client anywhere — see
 * the same note in lib/signIn.ts).
 */
export interface BetaSignupProblems {
  firstName: MessageKey | null;
  email: MessageKey | null;
  reasonCode: MessageKey | null;
}

export function betaSignupProblems(fields: BetaSignupFields): BetaSignupProblems {
  const firstName = fields.firstName.trim();
  const email = fields.email.trim();

  return {
    firstName:
      firstName === '' || firstName.length > FIRST_NAME_MAX
        ? 'beta.error.firstName'
        : null,
    email:
      email.length > EMAIL_MAX || !EMAIL_SHAPE.test(email)
        ? 'beta.error.email'
        : null,
    /* `isBetaReasonCode` rather than a non-empty check: the radio group can
       only produce a code it was given, so this fires for '' (nothing pressed)
       and for a code that was retired between the page loading and the submit
       — which is the one case a stale tab can produce. */
    reasonCode: isBetaReasonCode(fields.reasonCode) ? null : 'beta.error.reason',
  };
}

export function hasProblem(problems: BetaSignupProblems): boolean {
  return (
    problems.firstName !== null ||
    problems.email !== null ||
    problems.reasonCode !== null
  );
}

/**
 * THERE IS NO TABLE OF POSTGRES CODES HERE, unlike `signInMessageKey`, and the
 * absence is deliberate rather than unfinished.
 *
 * Every refusal this statement can meet is OURS, not the person's: 23514 means
 * this file's validation and the column's check constraint disagree, 42501
 * means the grant is missing, 42P01 means the migration has not been pushed.
 * None of them is something the reader of the page did, and none of them is
 * something they can act on, so splitting one sentence into four would only
 * vary the wording of "this is broken, and not by you".
 *
 * The code still has to go somewhere, and it goes to the console line below,
 * which is where somebody who can fix it is looking.
 *
 * The two refusals that ARE distinguishable to a reader are handled where the
 * difference is real: a duplicate address answers with success (see the top of
 * this file), and a transport failure gets the app's one sentence about a
 * connection.
 */

/**
 * `client` IS FOR THE DB SUITE, AND IT IS NOT A MOCK.
 *
 * The app's own client is built from `VITE_SUPABASE_URL` in `.env.local`,
 * which is whatever this checkout last pointed at — and `pnpm test:db` aims at
 * whatever `db.support.ts` resolved. A db test calling `getSupabase()` would
 * write its row to one project and look for it in another, and pass. Same
 * argument, same shape, as `signIn`.
 */
export async function submitBetaSignup(
  fields: BetaSignupFields,
  client?: SupabaseClient,
): Promise<BetaSignupResult> {
  /* Checked again here rather than trusted from the screen. This function is
     the only writer, so it is the only place that can promise the row is
     shaped before it goes — and the first problem in field order is the one
     reported, which matches the order they are read in. */
  const problems = betaSignupProblems(fields);
  const firstProblem = problems.firstName ?? problems.email ?? problems.reasonCode;
  if (firstProblem !== null) return { ok: false, messageKey: firstProblem };

  const supabase = client ?? getSupabase();

  try {
    /* NO `.select()`. See the top of this file — it is not an omission. */
    const { error } = await supabase.from('beta_signups').insert({
      /* Trimmed. A pasted address carries a trailing space more often than
         not, and a name typed on a phone keyboard collects one at the end. */
      first_name: fields.firstName.trim(),
      /* Trimmed but NOT lower-cased: the unique index is on `lower(email)`, so
         case cannot produce a duplicate, and whoever writes to this list later
         gets the address as its owner types it. */
      email: fields.email.trim(),
      reason_code: fields.reasonCode,
    });

    if (error !== null) {
      /* The address is deliberately absent from this line: a console entry
         pairing an email with a failure is a personal detail in a screenshot. */
      if (error.code === '23505') {
        console.info('[musie] beta signup: that address is already on the list.');
        return { ok: true };
      }

      console.warn(`[musie] beta signup refused: ${error.code ?? error.message}`);
      return { ok: false, messageKey: 'beta.error.unknown' };
    }

    return { ok: true };
  } catch (thrown: unknown) {
    /* THROWN, not returned: supabase-js could not reach the server at all.
       `content.errorDetail` — 'Check your connection and try again.' — rather
       than a `beta.`-prefixed twin of it, because the app already owns exactly
       one way of saying this and a second spelling is the drift the catalogue
       exists to stop. The same call `signIn` makes. */
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[musie] beta signup could not reach the server:', message);
    return { ok: false, messageKey: 'content.errorDetail' };
  }
}
