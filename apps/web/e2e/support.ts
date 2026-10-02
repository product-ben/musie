/**
 * Shared ground for the end-to-end walks.
 *
 * Extracted from `session.spec.ts` on 2026-09-21, when a second walk arrived
 * and the third copy of `stack()` would have been the one that drifted.
 *
 * ── THE IMPORTANT PART IS `label()` ───────────────────────────────────────
 * A walk has to find controls. There are three ways, and only one of them is
 * both locale-proof and design-proof:
 *
 *   by CSS class    `.musy-wizard__actions button` — reaches into the design
 *                   system's internals. A class rename is an ordinary
 *                   design-system decision and would break every walk.
 *   by POSITION     `.last()` — "the rightmost button". But WHICH action sits
 *                   outermost is a design decision (10-layout.md L6), so
 *                   reordering an action row silently re-points the walk. This
 *                   has happened: the last button in the exercise detail turned
 *                   out to be Lightbox's close X, and the walk spent its time
 *                   dismissing the popup it had just opened.
 *   by ACCESSIBLE   what a person sees and what a screen reader announces.
 *   NAME            Stable across both, and it fails loudly when a control
 *                   loses its name — which is a real defect, not a test one.
 *
 * The objection to the third, and it is a good one: matching on literal copy
 * is how you fail to notice literal copy. An English string hardcoded into a
 * German screen renders identically in the English run and is invisible there.
 *
 * `label()` is the answer. It does not take words — it takes a CATALOGUE KEY
 * and the locale the run is in, and asks `translate()` for the string exactly
 * as the app asks for it. So the German run looks for the German word, and a
 * control that hardcoded English **fails the German run**. That is strictly
 * stronger than avoiding copy altogether, which could not notice at all.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { translate } from '../src/i18n';
import type { Locale, MessageKey } from '../src/i18n';

export type { Locale };

/**
 * A control's accessible name, in the run's language, from the same catalogue
 * the app reads. Never a literal.
 */
export function label(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | undefined>,
): string {
  return translate(locale, key, params);
}

/**
 * The keys, and the ONE check that makes a walk mean anything.
 *
 * ── IT HAS TO BE THE SAME DATABASE THE BROWSER IS USING ───────────────────
 * A walk is driven through the real dev server, which reads
 * `apps/web/.env.local`. This used to read `supabase status` unconditionally —
 * the LOCAL stack, always. Point `.env.local` at a hosted project (BUILD-PLAN
 * A.6) and the two halves address different databases: the browser writes a
 * session to Frankfurt, and the assertions look for it in Docker.
 *
 * MEASURED, 2026-09-21: exactly that happened, and it failed at
 * `expect(session).toBeTruthy()` with `null` — a red test naming the wrong
 * cause, for a walk that had worked perfectly. The mirror image is worse: had
 * the local database happened to hold a row with that id, it would have gone
 * GREEN while proving nothing.
 *
 * So the URLs are compared and a mismatch is a loud failure. Same three
 * variables as `src/lib/db.support.ts`, all three or none.
 */
export function stack(): { API_URL: string; SERVICE_ROLE_KEY: string } {
  const envUrl = process.env.SUPABASE_TEST_URL;
  const envKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  let resolved: { API_URL: string; SERVICE_ROLE_KEY: string };
  if (envUrl && envKey) {
    resolved = { API_URL: envUrl, SERVICE_ROLE_KEY: envKey };
  } else {
    let raw: string;
    try {
      raw = execFileSync('supabase', ['status', '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      throw new Error(
        'The local Supabase stack is not reachable. Run `supabase start`, then ' +
          '`pnpm test:e2e` again — or set SUPABASE_TEST_URL and ' +
          'SUPABASE_TEST_SERVICE_ROLE_KEY to match a hosted `.env.local`. ' +
          'These walks are deliberately NOT in `pnpm check` and are never skipped.',
      );
    }
    const parsed = JSON.parse(raw) as Partial<{ API_URL: string; SERVICE_ROLE_KEY: string }>;
    if (!parsed.API_URL || !parsed.SERVICE_ROLE_KEY) {
      throw new Error('`supabase status -o json` returned no keys.');
    }
    resolved = { API_URL: parsed.API_URL, SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY };
  }

  /* The app's own target, read from the file the dev server reads. A missing
     file is not an error here — Vite would already have failed to boot. */
  const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
  const appUrl = existsSync(envFile)
    ? (/^VITE_SUPABASE_URL=(.*)$/m.exec(readFileSync(envFile, 'utf8')) ?? [])[1]?.trim()
    : undefined;

  if (appUrl !== undefined && appUrl !== resolved.API_URL) {
    throw new Error(
      'This walk would address two different databases and prove nothing.\n' +
        `  the browser writes to : ${appUrl}      (apps/web/.env.local)\n` +
        `  the assertions read   : ${resolved.API_URL}\n` +
        'Point .env.local back at the local stack, or set SUPABASE_TEST_URL and ' +
        'SUPABASE_TEST_SERVICE_ROLE_KEY to the same project .env.local names.',
    );
  }

  return resolved;
}

/**
 * The service role, used ONLY to read back what the client wrote — never to
 * set up state the client should be creating itself. Same posture as
 * `src/lib/db.support.ts`, and for the same reason.
 */
export const service = () => {
  const { API_URL, SERVICE_ROLE_KEY } = stack();
  return createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * ── WHICH TRACK A CARD PLAYS, READ FROM THE DECK RATHER THAN RETYPED ──────
 *
 * Every walk that scans or types a card needs the track it maps to, and until
 * 2026-09-30 each one carried that pairing as a literal — `{ code: 'MC-01',
 * id: 'mc-01', track: 'trk-01' }`. On 2026-09-24 the deck was REPAIRED and
 * the pairings moved: MC-01 plays `trk-04` now, and `trk-01` belongs to
 * MC-04. Nothing told the walks, because nothing could, and six of them went
 * red at once for a reason none of them named.
 *
 * `supabase/content/deck.json` is the single source the generated migration
 * is built from — its own header says so, and `deck.db.test.ts` goes red when
 * the database drifts from it. So the walks read it too, and the next repair
 * moves them with it instead of past them.
 *
 * NOT read from the database, deliberately: a walk that asked the DB what to
 * expect would agree with whatever is in there, including a mapping that is
 * wrong. The JSON is what the deck is SUPPOSED to be, which is the thing a
 * test should hold the app against.
 */
interface DeckCard {
  id: string;
  code: string;
  plays: Record<string, string>;
}

const deck = (): DeckCard[] => {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..',
    'supabase', 'content', 'deck.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { cards: DeckCard[] }).cards;
};

/**
 * The card, with the track it plays — by CODE, as a person holding one reads
 * it. `exercise` because the pairing is per exercise: the same card can play
 * different things in two exercises, which is what `exercise_tracks` is for.
 */
export function card(code: string, exercise = 'mindfulness-cards'): {
  code: string;
  id: string;
  track: string;
} {
  const found = deck().find((each) => each.code === code);
  if (found === undefined) {
    throw new Error(
      `deck.json has no card ${code}. The walks read the deck rather than ` +
      'retyping it, so a code that is not in it is a test bug, not a data one.',
    );
  }
  const track = found.plays[exercise];
  if (track === undefined) {
    throw new Error(`deck.json's ${code} does not play anything in ${exercise}.`);
  }
  return { code: found.code, id: found.id, track };
}

/**
 * What a track is actually called, read back with the service role.
 *
 * ONLY the reveal walk needs this, and it is the one place reading the answer
 * from the database is right: the assertion is that the title does not reach
 * the browser before the reveal, so the test has to know the true title
 * without the page having told it. Retyping it as a literal is what made that
 * walk go red when the deck was repaired — it was still looking for MC-04's
 * title on MC-01's card.
 */
export async function trackIdentity(trackId: string): Promise<{ title: string; artist: string }> {
  const { data, error } = await service()
    .from('tracks')
    .select('title, artist')
    .eq('id', trackId)
    .single();
  if (error !== null || data === null) {
    throw new Error(`could not read ${trackId} back: ${error?.message ?? 'no row'}`);
  }
  return { title: data.title as string, artist: data.artist as string };
}

/**
 * Put the locale in before the first paint, exactly where index.html looks for
 * it. This is what makes the German run a German SESSION rather than a German
 * browser looking at an English app.
 */
export async function withLocale(page: Page, locale: Locale) {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('musie-locale', value);
    } catch {
      /* Private mode. The detection path then decides, which is fine. */
    }
  }, locale);
}

/**
 * Name a card by its printed code, on the scan step — E.1.
 *
 * THE SIMULATED SCAN IS GONE, and with it the one control every walk used to
 * get past the scan step. This replaces it, and it makes the walk stronger
 * rather than merely different: a random draw could only ever be asserted as
 * "some card", where a typed code means the row that comes back is known
 * before the test runs.
 *
 * Found by accessible name through `label()`, like everything else here — the
 * field's label and the button's are catalogue strings, so the German run
 * types into the German field and a hardcoded English one fails it.
 */
export async function enterCode(page: Page, locale: Locale, code: string) {
  const field = page.getByRole('textbox', {
    name: label(locale, 'session.scan.codeLabel'),
    exact: true,
  });

  /* THE FIELD IS A MODE OF THE FRAME, AND IT IS NOT THE ONE ON SHOW (2026-09-24).
     Typing the code is the fallback behind *Enter the code*, so the walk opens
     it the way a person does.

     A BUTTON AGAIN. It was a ghost `CtaButton`, then a `Switch` beside the
     frame, and is now a button INSIDE it — the frame shows the viewfinder or
     the form, one at a time, so the control fires a change rather than
     reporting a setting that stays true. Each of those three moves broke this
     helper, which is why it asks for the field first and the role second.

     CONDITIONALLY, because the step remembers: somebody who typed once still
     has the form up when *Scan a different card* brings them back, and
     pressing the control again would take them to the viewfinder. Asking
     whether the field is there is the same question the screen answers. */
  if (!(await field.isVisible())) {
    await page
      .getByRole('button', { name: label(locale, 'session.scan.codeManual'), exact: true })
      .click();
    await expect(field).toBeVisible({ timeout: 15_000 });
  }

  await field.fill(code);
  await page
    .getByRole('button', { name: label(locale, 'session.scan.codeSubmit'), exact: true })
    .click();
}

/**
 * Start an exercise from the library — ONE CLICK, since 2026-09-24.
 *
 * Every walk used to do this in three steps: click the card, wait for the
 * detail `dialog`, then click *Start exercise* inside it by name. The detail
 * lightbox is gone — a tap on the card starts the run — so the dialog and the
 * `exercises.start` key both went with it, and a walk still looking for either
 * hangs until its timeout.
 *
 * SHARED, because six walks start an exercise and the next flow change should
 * find them in one place rather than in six.
 *
 * WITH NO NAME it takes the FIRST card, which is a POSITION and deliberate:
 * the order is `exercises.sort`, a column with a `unique` constraint on it, so
 * it is a fact about the content rather than an accident of layout. The name
 * cannot be asked for from the catalogue either — it lives in `exercise_i18n`
 * — so a walk that needs a particular exercise reads the name from the
 * database and passes it here. NOT `exact`: a card's accessible name is its
 * headline followed by its description and its fact chips.
 */
export async function startExercise(page: Page, name?: string) {
  const card = name === undefined
    ? page.getByRole('radio').first()
    : page.getByRole('radio', { name });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
}

/**
 * Walk a fresh visitor from the explainer to the exercise library.
 *
 * Every walk starts here — a new browser profile has no user type, so `/` is
 * the carousel and the CTA is locked until the last slide has been seen.
 * Shared so a second walk cannot get the preamble subtly different from the
 * first and then disagree about where the product begins.
 */
export async function reachTheLibrary(page: Page, locale: Locale) {
  await page.goto('/');

  const carousel = page.getByRole('group', { name: /.+/ }).first();
  await expect(carousel).toBeVisible({ timeout: 15_000 });

  /* Next until it locks. Found by its accessible name, which the carousel
     takes from the catalogue, so the German run presses the German button. */
  const next = page.getByRole('button', { name: label(locale, 'about.nextSlide'), exact: true });
  for (let i = 0; i < 10; i += 1) {
    if (await next.isDisabled()) break;
    await next.click();
    await page.waitForTimeout(150);
  }
  await expect(next).toBeDisabled();

  const start = page.getByRole('button', { name: label(locale, 'menu.startSession'), exact: true });
  await expect(start).toBeEnabled();
  await start.click();

  /* About you — "By myself" is preselected, so Continue does the writing and
     nothing has to be picked. That is the path almost everyone takes. */
  await expect(page).toHaveURL(/\/about-you$/);
  await expect(page.getByRole('radio').first()).toBeChecked();

  const carryOn = page.getByRole('button', { name: label(locale, 'common.continue'), exact: true });
  await expect(carryOn).toBeEnabled();
  await carryOn.click();

  await expect(page).toHaveURL(/\/exercises$/);
}
