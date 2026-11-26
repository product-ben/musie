/**
 * PostHog for experiment „Duett 01“ — its own `posthog.init`, never the app's
 * (lib/posthog.ts stays un-started here), the same project key the Reflexion
 * experiment carries (CLAUDE.md rule 10: a project key is public by design).
 *
 * CONSENT: nothing is sent before the visitor presses „Einverstanden, los“ on
 * the start card. „Ohne Aufzeichnung spielen“ never initialises PostHog.
 *
 * What is sent — the question is which switches make a better duet, so:
 *   duett_started   the settings at the start
 *   duett_settings  the settings after a change (debounced)
 *   duett_answer    figure, ornaments, chords, lengths, the wait and why
 *   duett_turn      the person's first note after an answer began: how soon,
 *                   and whether it was a collision (Musie came in too early)
 * Each carries `settings_key`, the address fragment of the combination, so
 * answers can be grouped by combination. No names, no sound.
 *
 * `?internal=1` marks this device as a tester's (kept in localStorage,
 * `?internal=0` clears it); every dev-server run is internal too.
 */
import posthog from 'posthog-js';
import type { RunEvent } from './run';
import { onRunEvent } from './run';
import { BOOL_KEYS, CHORD_KINDS, CHORD_MOMENTS, encode, FIGURE_IDS, settings, subscribe } from './settings';
import type { Settings } from './settings';

const EXPERIMENT = 'duett-01';
const PROJECT_KEY = 'phc_rtUPNdTgxrSVvoCnVbaZNitHtsdsTTJ5FnNZxwi8XXXm';
const EU_CLOUD = 'https://eu.i.posthog.com';
const key = import.meta.env.VITE_POSTHOG_KEY || PROJECT_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || EU_CLOUD;
const SETTINGS_DEBOUNCE_MS = 1500;
const INTERNAL_KEY = 'duett-internal';

function internal(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('internal');
    if (param === '1') window.localStorage.setItem(INTERNAL_KEY, '1');
    if (param === '0') window.localStorage.removeItem(INTERNAL_KEY);
    return window.localStorage.getItem(INTERNAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function settingsProps(s: Settings): Record<string, unknown> {
  const props: Record<string, unknown> = {
    instrument: s.instrument,
    settings_key: encode({ ...s, instrument: 'harp' }) || 'heute',
    figures: FIGURE_IDS.filter((id) => s.figures[id]),
    min_ms: s.minMs, patience: s.patience, times_yours: s.timesYours, max_notes: s.maxNotes,
    grow_rounds: s.growRounds, wider_by: s.widerBy, figure_share: s.figureShare, ornament_chance: s.ornamentChance,
    chord_moments: CHORD_MOMENTS.filter((id) => s.chordWhen[id]),
    chord_kinds: CHORD_KINDS.filter((id) => s.chordKinds[id]),
    chord_chance: s.chordChance, chord_spread_ms: s.chordSpread, chord_volume: s.chordVolume,
  };
  for (const k of BOOL_KEYS) props[`on_${k}`] = s[k];
  return props;
}

let started = false;

export function startTracking(): void {
  if (started || typeof window === 'undefined' || !key) return;
  started = true;
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_surveys: true,
    disable_session_recording: false,
    /* The inputs are switches and sliders — what is set is the point. */
    session_recording: { maskAllInputs: false },
  });
  posthog.register({ experiment: EXPERIMENT, internal: internal() });
  posthog.capture('duett_started', settingsProps(settings()));

  let timer: number | null = null;
  subscribe((s) => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => posthog.capture('duett_settings', settingsProps(s)), SETTINGS_DEBOUNCE_MS);
  });

  onRunEvent((e: RunEvent) => {
    const s = settings();
    const common = { instrument: s.instrument, settings_key: settingsProps(s).settings_key, figure: e.entry.figure, round: e.entry.round };
    if (e.type === 'answer') {
      posthog.capture('duett_answer', {
        ...common,
        ornaments: e.entry.ornaments,
        heard: e.entry.heard,
        notes: e.entry.notes,
        cap: e.entry.cap,
        wait_ms: e.entry.waitMs,
        ending: e.entry.ending,
        learn: e.entry.learn,
        from_round: e.entry.fromRound ?? null,
        chords: e.entry.chords,
        under: e.entry.under,
      });
    } else {
      posthog.capture('duett_turn', {
        ...common,
        after_ms: e.turn.afterMs,
        collision: e.turn.collision,
        interrupted: e.turn.interrupted,
      });
    }
  });
}
