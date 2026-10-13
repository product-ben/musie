/**
 * NORTHWIND — the invented company the org map is drawn from. 100 people.
 *
 * "Northwind" is the software industry's canonical sample-data company, so
 * anyone technical reads it as fixture data before they read anything else.
 *
 * ── A POD IS CROSS-FUNCTIONAL, SO IT IS AUTHORED AS A COMPOSITION ─────────
 * The decision this whole file turns on: a pod is a squad with engineers, a
 * designer and a PM in it, so it draws people from several departments at
 * once. The org is a graph, not a tree.
 *
 * Therefore **only pods are authored**, and each one says how many people it
 * takes from each department. A department's headcount is the sum of its
 * people across every pod; the company is the sum of the pods. Nothing is
 * counted twice, every view agrees with every other, and the total is exactly
 * 100 — asserted in orgModel.test.ts rather than hoped for.
 *
 * The alternative — every connected department counting the whole pod — was
 * refused: the Departments tab would total 120 while the Company tab said 100,
 * and a map whose own two views disagree is worse than one view.
 *
 * ── NINE OF EIGHTEEN SPAN MORE THAN ONE DEPARTMENT ───────────────────────
 * Enough that the shared edges are the normal case rather than a curiosity,
 * and few enough that the canvas does not turn into a mesh. Growth is the one
 * to look at: Eng 4 · P&D 1 · Mktg 2, which is what a growth squad actually
 * looks like and why it settles nearest Engineering rather than halfway
 * between its three departments.
 */

export type DepartmentId = 'eng' | 'gtm' | 'pd' | 'cs' | 'mktg' | 'ops';

/**
 * The four things somebody looking at this map might care about.
 *
 * They are the scales the insight work has been circling since the start:
 * how good people's breaks are, how they feel, whether they can say what they
 * think, and whether they feel connected to anyone.
 */
export type DimensionId = 'breaks' | 'feeling' | 'safety' | 'connectedness';

export const DIMENSION_IDS: readonly DimensionId[] = [
  'breaks', 'feeling', 'safety', 'connectedness',
] as const;

/**
 * What a reader came for, which is the question before all the others.
 *
 * `outcomes` asks whether Musie is doing anything — is it used, and does using
 * it help. `insight` asks how the people are, which is a different question
 * with a different answer and, crucially, a different kind of silence.
 */
export type FilterId = 'outcomes' | 'insight';

export const FILTER_IDS: readonly FilterId[] = ['outcomes', 'insight'] as const;

/**
 * The two outcome measures.
 *
 * ── THESE ARE MEASURED, SO ABSENCE IS NOT POSSIBLE ───────────────────────
 * Unlike the four insight dimensions, an outcome always has an answer: if
 * nobody in a pod opened Musie this month, "nobody opened Musie" IS the
 * reading. That is why they are stored as an explicit value per pod rather
 * than as a key that may be missing — the grey on an outcome map means
 * something a reader can act on, where the grey on an insight map means
 * nobody can tell them anything.
 *
 * The legend says which grey it is, because the colour cannot.
 */
export type OutcomeId = 'breaksUsage' | 'moodLift';

/** Whether a pod actually takes its Musie Moments. */
export type UsageLevel = 'regular' | 'none';

/** Whether taking them moves anything. */
export type LiftLevel = 'positive' | 'flat';

/** Everything that can colour the map. */
export type MetricId = OutcomeId | DimensionId;

export const METRICS_BY_FILTER: Readonly<Record<FilterId, readonly MetricId[]>> = {
  outcomes: ['breaksUsage', 'moodLift'],
  insight: ['breaks', 'feeling', 'safety', 'connectedness'],
};

export interface Department {
  id: DepartmentId;
  name: string;
  /** What a circle can hold when the full name cannot. Not a truncation. */
  shortName?: string;
}

export interface Pod {
  id: string;
  name: string;
  shortName?: string;
  /**
   * How many people this pod draws from each department.
   *
   * A department absent from this map contributes nobody — never a key with 0.
   * `orgModel.test.ts` holds that, because "0 from Marketing" and "not a
   * marketing pod" would otherwise draw an edge of no people.
   */
  members: Partial<Record<DepartmentId, number>>;
  /**
   * How this pod is doing on each dimension, nought to ten.
   *
   * ── AN ABSENT KEY MEANS NO DATA, AND THAT IS THE POINT ──────────────────
   * Half the pods have nothing to say on any given dimension, and the map
   * draws them grey. That is not a gap in the fixture; it is the most honest
   * thing on the screen. A pod of three or four people cannot be reported on
   * without reporting on individuals, and a question that was not asked in
   * this pod's exercises this month has no answer however much somebody wants
   * one.
   *
   * A VALUE OF 0 WOULD BE A CLAIM — "we measured, and it is terrible" — so
   * nothing is ever stored as 0 to mean absence. `orgModel.test.ts` holds
   * that, and holds the half: exactly nine of the eighteen pods are silent on
   * every dimension, and which nine is different each time.
   */
  scores: Partial<Record<DimensionId, number>>;
  /**
   * The measured outcomes. Required, not optional — see `OutcomeId`.
   *
   * `none` and `flat` are ANSWERS: this pod does not use Musie, and using it
   * does not move anything here. Neither is a gap, and neither should be
   * confused with the grey on an insight map.
   */
  outcomes: { breaksUsage: UsageLevel; moodLift: LiftLevel };
  /** Which pair of word mixes this pod reads as. */
  moodMix: MoodMixId;
  /**
   * Musie Moments a day, median, and the change on last month.
   *
   * ZERO HERE IS A MEASURED ZERO, which is why it is a number and not an
   * absent key: a pod whose `breaksUsage` is `none` took no Musie Moments, and
   * "none a day" is the reading rather than a gap. The card says so in words.
   */
  breaksPerDay: number;
  breaksDelta: number;
}

/* ═══ WHAT A CARD SHOWS ═════════════════════════════════════════════════════
   Everything below exists only for the panel that opens beside the map.      */

/** A word's end of the scale. Three values; the map's two hues carry two. */
export type Valence = 'strain' | 'neutral' | 'ease';

export interface FeelingWord { id: string; word: string; valence: Valence }

/**
 * THE CONTROLLED VOCABULARY — ten words, fixed, in this order.
 *
 * Fixed is what makes "before" and "after" a comparison rather than two
 * unrelated pictures, and it is the same list under both questions a card can
 * ask. Ordered strain → neutral → ease, which is roughly the order a Musie
 * Moment moves through and puts the strain words together for the eye.
 */
export const FEELING_WORDS: readonly FeelingWord[] = [
  { id: 'swamped', word: 'swamped', valence: 'strain' },
  { id: 'tense', word: 'tense', valence: 'strain' },
  { id: 'rushed', word: 'rushed', valence: 'strain' },
  { id: 'tired', word: 'tired', valence: 'strain' },
  { id: 'heavy', word: 'heavy', valence: 'strain' },
  { id: 'restless', word: 'restless', valence: 'neutral' },
  { id: 'flat', word: 'flat', valence: 'neutral' },
  { id: 'steady', word: 'steady', valence: 'ease' },
  { id: 'clear', word: 'clear', valence: 'ease' },
  { id: 'light', word: 'light', valence: 'ease' },
] as const;

export type MoodMixId = 'strained' | 'mixed' | 'steady';

/**
 * Two readings per pod, as shares of a hundred, in FEELING_WORDS order.
 *
 * ── TWO MEASUREMENTS, FOUR QUESTIONS ─────────────────────────────────────
 * `during` is how people describe the working day; `after` is how they
 * describe themselves at the end of a Musie Moment. Those same two answer
 * every cloud the cards draw — "before Musie" IS "during the day", and "after
 * a Musie Moment" IS the other one. Inventing four sets would have been
 * inventing two extra measurements that nobody took.
 *
 * Each row sums to a hundred, asserted in orgCard.test.ts.
 */
export const MOOD_MIXES: Readonly<Record<MoodMixId, { during: readonly number[]; after: readonly number[] }>> = {
  strained: {
    during: [16, 17, 15, 18, 12, 8, 6, 4, 3, 1],
    after: [5, 7, 6, 11, 5, 6, 5, 22, 18, 15],
  },
  mixed: {
    during: [9, 12, 13, 14, 9, 8, 7, 11, 10, 7],
    after: [3, 5, 5, 8, 4, 5, 5, 25, 20, 20],
  },
  steady: {
    during: [4, 7, 9, 11, 6, 8, 9, 16, 16, 14],
    after: [1, 2, 3, 5, 2, 4, 4, 27, 26, 26],
  },
};

/**
 * The exercises, invented.
 *
 * Musie's real deck is five exercises and these are not them — they are
 * plausible names in the same register, because a card saying "most used
 * exercises" with nothing under it says less than one with something. `serves`
 * is what lets a safety card and a connectedness card recommend different
 * things rather than the same three twice.
 */
export interface Exercise {
  id: string;
  name: string;
  serves: 'safety' | 'connectedness' | 'both';
}

export const EXERCISES: readonly Exercise[] = [
  { id: 'name-it', name: 'Name It to Tame It', serves: 'safety' },
  { id: 'quiet-room', name: 'Quiet Room', serves: 'safety' },
  { id: 'long-exhale', name: 'The Long Exhale', serves: 'safety' },
  { id: 'shoulder-drop', name: 'Shoulder Drop', serves: 'safety' },
  { id: 'two-minutes', name: 'Two Minutes Out', serves: 'connectedness' },
  { id: 'walk-listen', name: 'Walk and Listen', serves: 'connectedness' },
  { id: 'three-good', name: 'Three Good Things', serves: 'connectedness' },
  { id: 'close-day', name: 'Close the Day', serves: 'connectedness' },
  { id: 'breathing-score', name: 'Breathing Score', serves: 'both' },
  { id: 'mindfulness-cards', name: 'Mindfulness Cards', serves: 'both' },
  { id: 'free-rein', name: 'Free Rein', serves: 'both' },
  { id: 'ground-yourself', name: 'Ground Yourself', serves: 'both' },
] as const;

export const COMPANY = { id: 'northwind', name: 'Northwind' } as const;

export const DEPARTMENTS: readonly Department[] = [
  { id: 'eng', name: 'Engineering', shortName: 'Eng' },
  { id: 'gtm', name: 'Go-to-Market', shortName: 'GTM' },
  { id: 'pd', name: 'Product & Design', shortName: 'Product' },
  { id: 'cs', name: 'Customer Success', shortName: 'Success' },
  { id: 'mktg', name: 'Marketing', shortName: 'Marketing' },
  { id: 'ops', name: 'Operations', shortName: 'Ops' },
] as const;

/**
 * The eighteen pods.
 *
 * Ordered largest first, which is only for reading this file — the layout
 * sorts for itself and nothing downstream depends on this order.
 */
export const PODS: readonly Pod[] = [
  { id: 'payments', name: 'Payments', members: { eng: 6, pd: 3 }, scores: { breaks: 6.2, feeling: 6.8, safety: 6.1 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 1.6, breaksDelta: 0.2 },
  { id: 'platform', name: 'Platform', members: { eng: 7, pd: 1 }, scores: { breaks: 7.4, safety: 7.2, connectedness: 7.5 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'steady', breaksPerDay: 1.9, breaksDelta: 0.1 },
  { id: 'mobile', name: 'Mobile', members: { eng: 5, pd: 3 }, scores: { feeling: 7.1, connectedness: 7.8 }, outcomes: { breaksUsage: 'none', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 0, breaksDelta: 0 },
  { id: 'infra', name: 'Infrastructure', shortName: 'Infra', members: { eng: 7 }, scores: { breaks: 7.8, safety: 7.6 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'steady', breaksPerDay: 2.1, breaksDelta: 0.3 },
  { id: 'growth', name: 'Growth', members: { eng: 4, pd: 1, mktg: 2 }, scores: { breaks: 5.9, feeling: 6.3, connectedness: 8.1 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 1.4, breaksDelta: -0.1 },
  { id: 'enterprise', name: 'Enterprise', members: { gtm: 7 }, scores: { breaks: 4.6 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'strained', breaksPerDay: 1.1, breaksDelta: -0.3 },
  { id: 'midmarket', name: 'Mid-Market', members: { gtm: 7 }, scores: {}, outcomes: { breaksUsage: 'none', moodLift: 'flat' }, moodMix: 'strained', breaksPerDay: 0, breaksDelta: 0 },
  { id: 'data', name: 'Data', members: { eng: 5, pd: 1 }, scores: { feeling: 7.3, safety: 6.9, connectedness: 7.2 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 1.7, breaksDelta: 0.2 },
  { id: 'devex', name: 'Developer Experience', shortName: 'DevEx', members: { eng: 5 }, scores: { safety: 7.4 }, outcomes: { breaksUsage: 'none', moodLift: 'positive' }, moodMix: 'steady', breaksPerDay: 0, breaksDelta: 0 },
  { id: 'salesops', name: 'Sales Engineering', shortName: 'Sales Eng', members: { gtm: 3, eng: 2 }, scores: { breaks: 6.4, safety: 5.8, connectedness: 7.6 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 1.5, breaksDelta: 0 },
  { id: 'support', name: 'Support', members: { cs: 5 }, scores: { breaks: 3.9, feeling: 4.4 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'strained', breaksPerDay: 2.4, breaksDelta: 0.6 },
  { id: 'onboarding', name: 'Onboarding', shortName: 'Onboard', members: { cs: 4, pd: 1 }, scores: { breaks: 5.4, feeling: 6.0, safety: 5.1, connectedness: 7.4 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'strained', breaksPerDay: 1.8, breaksDelta: 0.2 },
  { id: 'quality', name: 'Quality', members: { eng: 4 }, scores: {}, outcomes: { breaksUsage: 'none', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 0, breaksDelta: 0 },
  { id: 'partnerships', name: 'Partnerships', shortName: 'Partners', members: { gtm: 3, mktg: 1 }, scores: { feeling: 6.6, connectedness: 7.9 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 1.2, breaksDelta: -0.2 },
  { id: 'content', name: 'Content', members: { mktg: 2, pd: 2 }, scores: { feeling: 7.0, safety: 4.3, connectedness: 6.8 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'strained', breaksPerDay: 1.3, breaksDelta: 0.1 },
  { id: 'demand', name: 'Demand', members: { mktg: 3 }, scores: {}, outcomes: { breaksUsage: 'none', moodLift: 'positive' }, moodMix: 'mixed', breaksPerDay: 0, breaksDelta: 0 },
  { id: 'people', name: 'People', members: { ops: 3 }, scores: { breaks: 7.1, safety: 6.7 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'steady', breaksPerDay: 1.9, breaksDelta: 0.4 },
  { id: 'finance', name: 'Finance', members: { ops: 3 }, scores: { feeling: 5.2, connectedness: 5.4 }, outcomes: { breaksUsage: 'regular', moodLift: 'positive' }, moodMix: 'steady', breaksPerDay: 1.6, breaksDelta: 0.1 },
] as const;

/* ═══ WHY A METRIC MATTERS ══════════════════════════════════════════════════
   The one body of real material on this screen, and the only thing on it that
   is not invented: four short pieces on why each measure is worth measuring,
   each sentence carrying its source.

   ── IT IS CONTENT, SO IT IS HERE AND NOT IN `i18n/` ──────────────────────
   Rule 6 splits chrome from content: chrome is ours and permanent and lives in
   the catalogues; content is provisional and lives where the content lives.
   Six hundred words of research prose is content by any reading, and putting
   it through `MessageKey` would put four research essays in the same file as
   "Close" and "Back".

   PER LOCALE, THOUGH — the same shape a content table takes, a column per
   language, because this screen is bilingual and a German reader and an
   English one should both get prose rather than one of them getting the
   other's. The German is Ben's, as written. The English is a translation of
   it: the prose is translated and the SOURCES are not, because an
   organisation's name is not a thing to translate and the reader following a
   citation needs the name the document actually carries.

   TWO METRICS HAVE NOTHING HERE YET — perceived mood lift, and the insight
   half's Quality Breaks. The panel simply does not render for them rather
   than showing a gap where a paragraph should be.                           */
export const METRIC_RATIONALE: Partial<Record<MetricId, { de: string; en: string }>> = {
  breaksUsage: {
    de: `## Warum Mental Health Momente wichtig sind

Fast jedem Dritten in Deutschland fällt die Pause regelmäßig aus ([BAuA 2024](https://www.baua.de/DE/Angebote/Publikationen/Bericht-kompakt/Ruhepausen)). Dabei geben schon Pausen von bis zu zehn Minuten neue Energie und senken Erschöpfung ([Albulescu et al. 2022](https://pubmed.ncbi.nlm.nih.gov/36044424/)). Zwischen Meetings verhindern sie, dass sich Stress aufbaut ([Microsoft 2021](https://www.microsoft.com/en-us/worklab/work-trend-index/brain-research)). Entscheidend ist, wie die Pause aussieht: Wer dabei aufs Handy schaut, ist danach nicht erholter als ohne Pause ([Kang & Kurtzberg 2019](https://timeshighereducation.com/news/switch-your-mobile-phone-if-you-want-switch-your-brain)). Eine kurze bewusste Entspannung senkt dagegen Stress und Erschöpfung und verbessert die Konzentration am Nachmittag ([Sianoja et al. 2018](https://greatergood.berkeley.edu/article/item/why_you_should_take_a_relaxing_lunch_break)). Musik macht das besonders einfach, denn Musik-Interventionen senken nachweislich Stress ([de Witte et al. 2020](https://pure.uva.nl/ws/files/58927620/Effects_of_music_interventions_on_stress_related_outcomes_a_systematic_review_and_two_meta_analyses.pdf)).`,
    en: `## Why Mental Health Moments matter

Almost one in three people in Germany regularly loses their break ([BAuA 2024](https://www.baua.de/DE/Angebote/Publikationen/Bericht-kompakt/Ruhepausen)). Yet breaks of even ten minutes restore energy and reduce exhaustion ([Albulescu et al. 2022](https://pubmed.ncbi.nlm.nih.gov/36044424/)). Taken between meetings, they stop stress from building up ([Microsoft 2021](https://www.microsoft.com/en-us/worklab/work-trend-index/brain-research)). What the break looks like decides everything: spend it on your phone and you are no more recovered than if you had skipped it ([Kang & Kurtzberg 2019](https://timeshighereducation.com/news/switch-your-mobile-phone-if-you-want-switch-your-brain)). A short, deliberate pause does the opposite — it lowers stress and exhaustion and sharpens concentration through the afternoon ([Sianoja et al. 2018](https://greatergood.berkeley.edu/article/item/why_you_should_take_a_relaxing_lunch_break)). Music makes that easy, and music interventions are shown to reduce stress ([de Witte et al. 2020](https://pure.uva.nl/ws/files/58927620/Effects_of_music_interventions_on_stress_related_outcomes_a_systematic_review_and_two_meta_analyses.pdf)).`,
  },
  feeling: {
    de: `## Warum emotionale Gesundheit wichtig ist

Psychische Erkrankungen sind der am stärksten wachsende Grund für Fehlzeiten. Bei AOK-Versicherten stiegen die Fehltage in zehn Jahren um 42 %, und ein Fall dauert im Schnitt 28,5 Tage ([AOK/WIdO Fehlzeiten-Report 2026](https://www.aerzteblatt.de/news/psychische-erkrankungen-an-der-spitze-der-fehlzeiten-a9b1b704-c89f-4533-9741-a49f74d32600)). In der EU sagen 29 % der Beschäftigten, dass die Arbeit bei ihnen Stress, Angst oder Depression auslöst oder verstärkt ([EU-OSHA 2025](https://osha.europa.eu/en/highlights/world-mental-health-day-29-eu-workers-suffer-stress-depression-or-anxiety)). Wer spürt, dass dem Arbeitgeber das eigene Wohlbefinden wichtig ist, ist deutlich seltener ausgebrannt ([Gallup 2024](https://www.gallup.com/workplace/652769/despite-employer-prioritization-employee-well-being-falters.aspx)). Die WHO empfiehlt deshalb Angebote am Arbeitsplatz, die emotionale Belastung senken ([WHO-Leitlinien 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10168149/)). Musik ist dafür für viele schon heute das Mittel der Wahl: 73 % der Deutschen nutzen sie, um mit Stress umzugehen ([TK-Stressreport 2025](https://www.tk.de/resource/blob/2208780/ba51a41989daff8fee95544c46761f1b/tk-stressreport-2025-data.pdf)).`,
    en: `## Why emotional health matters

Mental illness is the fastest-growing reason for absence. Among AOK members, days lost rose 42 % in ten years, and a single case now runs 28.5 days on average ([AOK/WIdO Fehlzeiten-Report 2026](https://www.aerzteblatt.de/news/psychische-erkrankungen-an-der-spitze-der-fehlzeiten-a9b1b704-c89f-4533-9741-a49f74d32600)). Across the EU, 29 % of workers say their job causes or worsens stress, anxiety or depression ([EU-OSHA 2025](https://osha.europa.eu/en/highlights/world-mental-health-day-29-eu-workers-suffer-stress-depression-or-anxiety)). People who feel their employer cares about their wellbeing burn out far less often ([Gallup 2024](https://www.gallup.com/workplace/652769/despite-employer-prioritization-employee-well-being-falters.aspx)). The WHO therefore recommends workplace offers that lower emotional strain ([WHO guidelines 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10168149/)). For many people music is already the tool of choice: 73 % of Germans use it to cope with stress ([TK-Stressreport 2025](https://www.tk.de/resource/blob/2208780/ba51a41989daff8fee95544c46761f1b/tk-stressreport-2025-data.pdf)).`,
  },
  safety: {
    de: `## Warum psychologische Sicherheit wichtig ist

Psychologische Sicherheit heißt, dass sich Menschen im Team trauen, Fragen zu stellen, Fehler zuzugeben und zu widersprechen. Googles Studie mit 180 Teams zeigt: Teams mit hoher psychologischer Sicherheit verlieren seltener Mitarbeitende, erzielen mehr Umsatz und werden von Führungskräften doppelt so oft als effektiv bewertet ([Google re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness)). Fehlt sie, bleiben Probleme unausgesprochen. In Großbritannien trauen sich 45 % der Beschäftigten nicht, Fehler zu melden, und 15 % haben deshalb vermeidbare Fehler gemacht ([MHFA England 2026](https://mhfaengland.org/mhfa-centre/news/the-cost-of-workplace-silence-my-whole-self-2026)). 89 % der Beschäftigten halten psychologische Sicherheit für essenziell, aber nur 26 % der Führungskräfte zeigen das Verhalten, das sie schafft ([McKinsey 2021](https://www.mckinsey.com/featured-insights/week-in-charts/just-26-percent-of-leaders-create-psychological-safety-for-their-teams)).`,
    en: `## Why psychological safety matters

Psychological safety means people on a team dare to ask questions, admit mistakes and disagree. Google's study of 180 teams found that teams with high psychological safety lose fewer people, bring in more revenue, and are rated effective by leadership twice as often ([Google re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness)). Without it, problems go unsaid. In the UK, 45 % of workers do not dare report a mistake, and 15 % have made an avoidable one because of it ([MHFA England 2026](https://mhfaengland.org/mhfa-centre/news/the-cost-of-workplace-silence-my-whole-self-2026)). 89 % of employees call psychological safety essential, but only 26 % of leaders show the behaviour that creates it ([McKinsey 2021](https://www.mckinsey.com/featured-insights/week-in-charts/just-26-percent-of-leaders-create-psychological-safety-for-their-teams)).`,
  },
  connectedness: {
    de: `## Warum Verbundenheit im Team wichtig ist

Nur etwa zwei von zehn Beschäftigten in den USA haben eine:n gute:n Freund:in bei der Arbeit. Genau diese Menschen arbeiten produktiver und sicherer und bringen mehr Ideen ein ([Gallup 2022](https://www.ibj.com/articles/gallup-just-2-in-10-u-s-employees-have-work-best-friend)). Einsamkeit ist dagegen teuer: Einsame Beschäftigte fehlen im Schnitt rund fünf Tage mehr im Jahr und denken fast doppelt so oft über eine Kündigung nach ([Cigna 2020](https://www.beckerspayer.com/payer/cigna-study-preventable-loneliness-costs-employers-154b-annually/)). Weltweit fühlten sich 22 % der Beschäftigten am Vortag sehr einsam, in Europa 13 % ([Gallup 2026](https://www.gallup.com/workplace/697904/state-of-the-global-workplace-global-data.aspx)). Und in Googles Teamstudie kam es weniger darauf an, wer im Team ist, als darauf, wie die Menschen miteinander umgehen ([Google re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness)).`,
    en: `## Why connectedness in a team matters

Only about two in ten US workers have a good friend at work — and those are the people who work more productively and more safely and bring more ideas ([Gallup 2022](https://www.ibj.com/articles/gallup-just-2-in-10-u-s-employees-have-work-best-friend)). Loneliness, by contrast, is expensive: lonely employees miss around five more days a year and think about quitting almost twice as often ([Cigna 2020](https://www.beckerspayer.com/payer/cigna-study-preventable-loneliness-costs-employers-154b-annually/)). Worldwide, 22 % of workers felt very lonely the previous day; in Europe, 13 % ([Gallup 2026](https://www.gallup.com/workplace/697904/state-of-the-global-workplace-global-data.aspx)). And in Google's team study it mattered less who was on a team than how the people on it treated each other ([Google re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness)).`,
  },
};
