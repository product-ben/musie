/**
 * The end-to-end walk — D.6.
 *
 * ── DELIBERATELY NOT IN `pnpm check`, FOR THE REASON `test:db` IS NOT ──────
 * CI runs `pnpm check` on a runner with no Supabase and no browser, and a
 * suite that silently skips is worse than no suite (.github/workflows/ci.yml,
 * and the same argument vitest.config.ts makes for its `db` project). So this
 * is a third script, `pnpm test:e2e`, run against a stack that is up.
 *
 * ── IT DRIVES THE REAL DEV SERVER AND THE REAL DATABASE ────────────────────
 * No mocks. The whole point of one end-to-end test is that it exercises the
 * seam every unit test steps around: the reducer, the route table, RLS, the
 * column grants and the four migrations, in one process. `webServer` starts
 * Vite and waits for it; the stack has to be running already, and the suite
 * says so rather than starting one behind your back.
 *
 * ── AND IT HAS A CAMERA, WHICH IS NOT A CAMERA ─────────────────────────────
 * E.2 opens `getUserMedia`. Chromium takes `--use-fake-device-for-media-stream`
 * with `--use-file-for-fake-video-capture`, and then a stream really is
 * created, really is attached to a `<video>` and really is decoded — out of a
 * file holding a QR code this app generated. `e2e/fakeCamera.ts` writes it in
 * `globalSetup`, which has to be where it happens: the path is a LAUNCH FLAG,
 * so it must exist before the first browser starts.
 *
 * The flags go on both projects and cost the other walks nothing — a fake
 * camera nobody asks for is a camera nobody opens. Permission is still granted
 * per test, so a walk can also exercise a refusal.
 *
 * ── TWICE, ONCE PER LOCALE ─────────────────────────────────────────────────
 * Two projects, and the German one is the point: it is what catches a string
 * somebody hardcoded in a hurry, because a hardcoded English string renders
 * identically in the English run and is invisible there. The locale is set
 * through `localStorage` before the first paint, which is exactly how
 * index.html resolves it, so the run takes the same path a returning German
 * user takes rather than a special one.
 */
import { defineConfig, devices } from '@playwright/test';

import { fakeCameraArgs } from './e2e/fakeCamera';

const PORT = 5173;
/**
 * `localhost`, NOT `127.0.0.1`, and it is not interchangeable here.
 *
 * Vite binds to `localhost`, which Node 22 on macOS resolves to `::1` — so a
 * dev server that is up and serving is INVISIBLE on `127.0.0.1` and Playwright
 * decides it has to start its own. It then finds the port taken, Vite moves to
 * 5174, and the walk tests a server the config is not pointed at. Measured,
 * not guessed.
 */
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  /* One walk, run twice. There is no suite to parallelise, and the two runs
     share one anonymous browser profile per project. */
  fullyParallel: false,
  workers: 1,
  /* No retries. A flaky end-to-end test that passes on the second go teaches
     you to press the button again; this one is meant to be believed. */
  retries: 0,
  reporter: [['list']],

  /* Writes the clip the fake camera plays. Before any browser, because the
     file's path is one of the launch flags below. */
  globalSetup: './e2e/fakeCamera.ts',

  use: {
    baseURL: BASE_URL,
    /* Kept only for a failure — a passing walk leaves nothing behind. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'en',
      use: {
        ...devices['Desktop Chrome'],
        /* THE FULL BROWSER, NOT THE HEADLESS SHELL — E.2 DOES NOT RUN WITHOUT
           IT. Since Playwright 1.49 a headless `chromium` run uses
           `chromium_headless_shell`, a stripped build, and media capture is
           one of the things stripped out of it. MEASURED: `enumerateDevices`
           there reports the fake camera (videoInputs: 1), and every shape of
           `getUserMedia` — `{video:true}` included — then throws
           `NotSupportedError: Not supported`. That lands in `cameraProblem`'s
           default branch as `failed`, so the walks reported "the camera could
           not be started" and looked like an app defect.

           `channel: 'chromium'` selects the full browser, where the same call
           throws `NotAllowedError` without permission and returns a stream
           with it — which is what the two walks below are written against. */
        channel: 'chromium',
        locale: 'en-GB',
        launchOptions: { args: fakeCameraArgs() },
      },
    },
    {
      name: 'de',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        locale: 'de-DE',
        launchOptions: { args: fakeCameraArgs() },
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    /* Reuse whatever is already on :5173 when developing; start a fresh one in
       CI. `pnpm dev` is the same command a person runs, so there is no second
       way to boot the app that could drift from the first. */
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
