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

  /* THE FIELD IS FOLDED AWAY UNTIL IT IS ASKED FOR (2026-09-23). Typing the
     code is the fallback behind *Enter the code by hand*, so the walk opens
     the disclosure the way a person does.

     CONDITIONALLY, because the step remembers: somebody who typed once has the
     form open when *Scan a different card* brings the reader back, and
     pressing the toggle again would SHUT it. Asking whether the field is there
     is the same question the screen answers. */
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
