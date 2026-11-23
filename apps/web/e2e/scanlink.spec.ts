/**
 * `/s/:code` — the link a printed card's QR code carries. Since 2026-11-23 it
 * STARTS a run (PRD „Übungskarten mit QR-Code"), and these walks are the
 * PRD's acceptance: the three ways in, the dialog, and a scan while signed
 * out.
 *
 *   · an EXERCISE card (`EX-02`) opens its exercise on the intro, which asks
 *     „Was brauchst du gerade?" — and the answer decides the music;
 *   · a DECK card (`MC-04`) starts Freie Bahn with that card's picture, and
 *     „Weiter" goes straight to the music;
 *   · something running: the dialog, even for the same exercise, with
 *     starting the new one as the primary answer — after a scan and in the
 *     library alike.
 *
 * ── A FULL NAVIGATION, NOT A CLICK ────────────────────────────────────────
 * The camera app hands the URL to the browser cold, so every scan here is a
 * `page.goto`. `page.goto('/s/EX-02')` is RELATIVE and resolves against the
 * dev server: a card printed for musie.org decodes anywhere, because the
 * decoder never compares a host.
 *
 * ── THE MUSIC IS READ FROM THE DATABASE, NOT FROM deck.json ───────────────
 * A card's two pieces live on `cards` and are edited at /maintenance
 * (CLAUDE.md 4.1); the walk asks the row which piece the goal should have
 * played and holds the session to it.
 *
 * Run twice, once per locale: every string is a catalogue key or content read
 * in the run's locale, so an English string in the German run fails.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { enterCode, label, service, signIn, stack, startExercise, withLocale } from './support';
import type { Locale } from './support';

const FREE_REIN = 'free-rein';

/** The session id in the address. */
function sessionIdOf(page: Page): string {
  const id = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  if (id === undefined) throw new Error(`no session id in ${page.url()}`);
  return id;
}

/** An exercise's name in the run's locale — content, not a catalogue key. */
async function exerciseName(id: string, locale: Locale): Promise<string> {
  const { data, error } = await service()
    .from('exercise_i18n').select('name').eq('exercise_id', id).eq('locale', locale).single();
  if (error !== null || data === null) throw new Error(`no ${locale} name for ${id}`);
  return data.name as string;
}

/** A goal's label in the run's locale, by its music mode. */
async function goalLabel(mode: 'relax' | 'activate' | 'random', locale: Locale): Promise<{ id: string; label: string }> {
  const { data, error } = await service()
    .from('goals').select('id, goal_i18n(locale, label)').eq('music_mode', mode).eq('retired', false).single();
  if (error !== null || data === null) throw new Error(`no goal for ${mode}`);
  const text = (data.goal_i18n as { locale: string; label: string }[]).find((row) => row.locale === locale);
  if (text === undefined) throw new Error(`no ${locale} label for ${data.id as string}`);
  return { id: data.id as string, label: text.label };
}

/** A card's id, picture and activation piece. */
async function cardRow(code: string): Promise<{ id: string; image: string | null; activation: string | null }> {
  const { data, error } = await service()
    .from('cards').select('id, image_url, activation_track_id').eq('code', code).single();
  if (error !== null || data === null) throw new Error(`no card ${code}`);
  return { id: data.id as string, image: data.image_url as string | null, activation: data.activation_track_id as string | null };
}

async function sessionRow(id: string) {
  const { data, error } = await service()
    .from('sessions').select('exercise_id, status, step, goal_id, card_id, track_id, music_mode, ended_at').eq('id', id).single();
  if (error !== null || data === null) throw new Error(`no session ${id}`);
  return data as {
    exercise_id: string; status: string; step: string; goal_id: string | null; card_id: string | null;
    track_id: string | null; music_mode: string | null; ended_at: string | null;
  };
}

const continueButton = (page: Page, locale: Locale) =>
  page.getByRole('button', { name: label(locale, 'common.continue'), exact: true });

const goalQuestion = (page: Page, locale: Locale) =>
  page.getByRole('radiogroup', { name: label(locale, 'exercises.goal.question') });

test('an exercise card opens its exercise on the intro, and the answer there decides the music', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);
  await withLocale(page, locale);
  await signIn(page, locale);

  await page.goto('/s/EX-02');
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro\?via=exercise-card$/, { timeout: 15_000 });
  const id = sessionIdOf(page);

  /* THE QUESTION, with an answer already chosen — the first goal in the
     sheet's order, since this account never chose one in the library (D10). */
  const question = goalQuestion(page, locale);
  await expect(question).toBeVisible({ timeout: 15_000 });
  await expect(question.getByRole('radio')).toHaveCount(3);
  const relax = await goalLabel('relax', locale);
  await expect(question.getByRole('radio', { name: relax.label })).toBeChecked();
  expect((await sessionRow(id)).goal_id).toBe(relax.id);

  /* AN EXERCISE CARD KEEPS THE INTRO AS IT IS: the cards switch is there. */
  await expect(page.getByRole('switch', { name: label(locale, 'session.intro.cardsPresent') })).toBeVisible();

  /* CHANGE IT, and the change is what plays. */
  const recharge = await goalLabel('activate', locale);
  await question.getByRole('radio', { name: recharge.label }).click();
  await continueButton(page, locale).click();
  await expect(page).toHaveURL(new RegExp(`/session/${id}/scan$`), { timeout: 15_000 });
  await expect.poll(async () => (await sessionRow(id)).goal_id, { timeout: 10_000 }).toBe(recharge.id);

  /* The scan step names the in-app scanner only (A9). */
  await expect(page.getByText(/Kamera-App|camera app/)).toHaveCount(0);

  const card = await cardRow('MC-01');
  await enterCode(page, locale, 'MC-01');
  await expect(page).toHaveURL(new RegExp(`/session/${id}/listen`), { timeout: 15_000 });
  const row = await sessionRow(id);
  expect(row.card_id).toBe(card.id);
  expect(row.music_mode).toBe('activate');
  expect(row.track_id).toBe(card.activation);
});

test('a deck card starts Freie Bahn with its picture, and „Weiter“ goes straight to the music', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);
  await withLocale(page, locale);
  await signIn(page, locale);

  const card = await cardRow('MC-04');
  await page.goto('/s/mc-04');
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro\?via=deck-card&card=MC-04$/, { timeout: 15_000 });
  const id = sessionIdOf(page);

  /* FREIE BAHN, with the card's picture where the exercise's stands — and the
     card not written yet: that happens on „Weiter", once the goal is final
     (D11). */
  const row0 = await sessionRow(id);
  expect(row0.exercise_id).toBe(FREE_REIN);
  expect(row0.card_id).toBeNull();
  if (card.image !== null) {
    await expect(page.locator('img.musie-intro__image'))
      .toHaveAttribute('src', new RegExp(`${card.image.replace(/^\//, '')}$`), { timeout: 15_000 });
  }

  /* NO SWITCH AND NO STACK (D23): the card is already chosen. */
  await expect(goalQuestion(page, locale)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('switch')).toHaveCount(0);

  /* „Energie sammeln" plays the card's activation piece. */
  const recharge = await goalLabel('activate', locale);
  await goalQuestion(page, locale).getByRole('radio', { name: recharge.label }).click();
  await continueButton(page, locale).click();

  await expect(page).toHaveURL(new RegExp(`/session/${id}/listen(\\?|$)`), { timeout: 15_000 });
  const row = await sessionRow(id);
  expect(row.step).toBe('listen');
  expect(row.goal_id).toBe(recharge.id);
  expect(row.card_id).toBe(card.id);
  expect(row.music_mode).toBe('activate');
  expect(row.track_id).toBe(card.activation);

  /* A RELOAD PLAYS THE SAME: the piece is stored, not re-decided. */
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/session/${id}/listen(\\?|$)`), { timeout: 15_000 });
  expect((await sessionRow(id)).track_id).toBe(card.activation);
});

test('a scan while something runs asks first — even for the same exercise', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);
  await withLocale(page, locale);
  await signIn(page, locale);
  const freeRein = await exerciseName(FREE_REIN, locale);
  const mindfulBreak = await exerciseName('mindfulness-cards', locale);

  await page.goto('/s/EX-02');
  await expect(page).toHaveURL(/\/intro\?via=exercise-card$/, { timeout: 15_000 });
  const first = sessionIdOf(page);

  /* THE SAME CARD AGAIN: the dialog, with its own title. */
  await page.goto('/s/EX-02');
  const dialog = page.getByRole('dialog', { name: label(locale, 'exercises.running.dialogTitle') });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(label(locale, 'exercises.running.replace', { name: freeRein, running: freeRein })))
    .toBeVisible();

  /* SECONDARY: back into the running one, at its step. */
  await dialog.getByRole('button', { name: label(locale, 'exercises.running.continue', { name: freeRein }), exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/session/${first}/intro$`), { timeout: 15_000 });
  expect((await sessionRow(first)).status).toBe('started');

  /* A DECK CARD while it runs, and PRIMARY: the old one ends, the new one
     starts with the card. */
  await page.goto('/s/MC-04');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: label(locale, 'exercises.running.start', { name: freeRein }), exact: true })
    .click();
  await expect(page).toHaveURL(/\/intro\?via=deck-card&card=MC-04$/, { timeout: 15_000 });
  const second = sessionIdOf(page);
  expect(second).not.toBe(first);
  const ended = await sessionRow(first);
  expect(ended.status).toBe('abandoned');
  expect(ended.ended_at).not.toBeNull();

  /* THE X CONTINUES (D15): there is no screen behind the link. */
  await page.goto('/s/EX-01');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole('button', { name: label(locale, 'exercises.running.start', { name: mindfulBreak }), exact: true }))
    .toBeVisible();
  await dialog.getByRole('button', { name: label(locale, 'common.closeLabel'), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${second}/intro`), { timeout: 15_000 });
  expect((await sessionRow(second)).status).toBe('started');
});

test('the library asks with the same dialog, and its card exercises ask nothing on the intro', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(150_000);
  await withLocale(page, locale);
  await signIn(page, locale);
  const mindfulBreak = await exerciseName('mindfulness-cards', locale);
  const freeRein = await exerciseName(FREE_REIN, locale);

  /* FROM THE LIBRARY, NO QUESTION: the goal was chosen there (D6). */
  await page.goto('/exercises');
  await startExercise(page, locale);
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/, { timeout: 15_000 });
  const first = sessionIdOf(page);
  await expect(page.getByRole('switch', { name: label(locale, 'session.intro.cardsPresent') }))
    .toBeVisible({ timeout: 15_000 });
  await expect(goalQuestion(page, locale)).toHaveCount(0);

  /* ANOTHER exercise from the library: the dialog, and its primary answer
     starts the new one. No *Cancel* any more — the X closes. */
  await page.goto('/exercises');
  await startExercise(page, locale, freeRein);
  const dialog = page.getByRole('dialog', { name: label(locale, 'exercises.running.dialogTitle') });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(label(locale, 'exercises.running.replace', { name: freeRein, running: mindfulBreak })))
    .toBeVisible();
  await expect(dialog.getByRole('button', { name: label(locale, 'common.cancel'), exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: label(locale, 'exercises.running.start', { name: freeRein }), exact: true })
    .click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/, { timeout: 15_000 });
  expect(sessionIdOf(page)).not.toBe(first);
  expect((await sessionRow(first)).status).toBe('abandoned');
});

test('signed out, a scan waits behind the sign-in and then starts the exercise', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);
  await withLocale(page, locale);
  const { email } = await signIn(page, locale, { inject: false });

  await page.goto('/s/EX-01');
  /* The gate opens on the access code; an existing account takes the other
     door. The address stays /s/EX-01 throughout. */
  await page.getByRole('button', { name: label(locale, 'auth.signUp.switch'), exact: true }).click();
  await expect(page).toHaveURL(/\/s\/EX-01$/);
  const address = page.getByRole('textbox', { name: label(locale, 'auth.email'), exact: true });
  await expect(address).toBeVisible({ timeout: 15_000 });
  await address.fill(email);
  await page.getByRole('button', { name: label(locale, 'auth.submit'), exact: true }).click();

  /* The six digits, from the local stack's mail catcher. Its port is the
     API's plus three, as `supabase/config.toml` lays them out. */
  const api = new URL(stack().API_URL);
  const mail = `http://${api.hostname}:${String(Number(api.port) + 3)}`;
  let code: string | null = null;
  await expect.poll(async () => {
    const found = await fetch(`${mail}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
      .then((response) => response.json()) as { messages?: { ID: string }[] };
    const latest = found.messages?.[0];
    if (latest === undefined) return null;
    const message = await fetch(`${mail}/api/v1/message/${latest.ID}`)
      .then((response) => response.json()) as { Text?: string; HTML?: string };
    code = (/\b(\d{6})\b/.exec(`${message.Text ?? ''} ${message.HTML ?? ''}`) ?? [])[1] ?? null;
    return code;
  }, { timeout: 20_000 }).not.toBeNull();

  await page.keyboard.type(code ?? '');
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro\?via=exercise-card$/, { timeout: 20_000 });
  expect((await sessionRow(sessionIdOf(page))).exercise_id).toBe('mindfulness-cards');
});

test('a code that names nothing says so, and starts nothing', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(60_000);
  await withLocale(page, locale);
  const { userId } = await signIn(page, locale);

  /* EX-03 is reserved for an exercise that is not built; EX-99 and MC-99 are
     nobody's. */
  for (const code of ['EX-03', 'EX-99', 'MC-99']) {
    await page.goto(`/s/${code}`);
    await expect(page.getByRole('heading', { name: label(locale, 'scan.unknown.title'), exact: true }))
      .toBeVisible({ timeout: 15_000 });
  }
  await page.goto('/s/not-a-code');
  await expect(page.getByRole('heading', { name: label(locale, 'scan.malformed.title'), exact: true }))
    .toBeVisible({ timeout: 15_000 });

  const { count } = await service().from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  expect(count).toBe(0);
});
