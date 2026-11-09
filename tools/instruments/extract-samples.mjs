#!/usr/bin/env node
/**
 * The instruments' samples, copied out of the experiments byte for byte.
 *
 * Ben, 2026-11-09: each exercise sounds exactly like the newest experiment of
 * its instrument, from that experiment's DEFAULT sound only — and the samples
 * stay static files (Cloudflare serves `apps/web/public/`), indexed by the
 * database. So this copies, never re-encodes, and writes the index the
 * migration and the tests read: `supabase/content/instruments/samples.json`.
 *
 * The harp is the odd one: its six recordings live as base64 inside the
 * experiment's HTML. Decoding base64 gives back the original bytes, which is
 * why the harp's files are as identical as the other two's.
 *
 *   node tools/instruments/extract-samples.mjs
 *
 * Idempotent: running it twice writes the same files and the same index.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPERIMENTS = join(ROOT, 'apps/web/public/experiments');
const OUT = join(ROOT, 'apps/web/public/instruments');

/** Where each instrument's sound comes from — the PRD's pinned sources. */
export const SOURCES = {
  harp: { experiment: 'harp/261109-0920', commit: 'd0e88ac', branch: 'the-harp-answers' },
  kalimba: { experiment: 'kalimba/261106-1121', commit: 'cd962d3', branch: 'main' },
  marimba: { experiment: 'marimba/261108-1740', commit: '5590e20', branch: 'the-marimbaphon' },
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const NOTE = { 48: 'C3', 50: 'D3', 52: 'E3', 55: 'G3', 57: 'A3', 59: 'B3', 60: 'C4', 62: 'D4', 64: 'E4', 65: 'F4', 69: 'A4', 71: 'B4', 72: 'C5', 76: 'E5' };
const MIDI = Object.fromEntries(Object.entries(NOTE).map(([m, n]) => [n, Number(m)]));

const rows = [];
function put(instrument, file, bytes, { midi, layer, from }) {
  const dir = join(OUT, instrument);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), bytes);
  rows.push({
    instrument, file, path: `/instruments/${instrument}/${file}`, midi, layer,
    bytes: bytes.length, sha256: sha256(bytes), from,
  });
}

/* ── Harp: `const SAMPLES = {"59": "<base64>", …}` in the experiment ───────── */
{
  const html = readFileSync(join(EXPERIMENTS, SOURCES.harp.experiment, 'index.html'), 'utf8');
  const line = html.split('\n').find((l) => l.startsWith('const SAMPLES = {'));
  if (!line) throw new Error('harp: no SAMPLES line');
  const samples = JSON.parse(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1));
  for (const [midi, b64] of Object.entries(samples)) {
    put('harp', `${NOTE[midi]}.m4a`, Buffer.from(b64, 'base64'), {
      midi: Number(midi), layer: 'aufnahme', from: `${SOURCES.harp.experiment}/index.html#SAMPLES[${midi}]`,
    });
  }
}

/* ── Kalimba: sound "Ruhig" crossfades `closed` and `open` (DEFAULTS.sound = 'still') ── */
for (const art of ['closed', 'open']) {
  for (const note of ['A3', 'C4', 'E4', 'F4', 'A4', 'B4', 'C5', 'E5']) {
    const file = `${art}-${note}.mp3`;
    put('kalimba', file, readFileSync(join(EXPERIMENTS, 'kalimba/samples', file)), {
      midi: MIDI[note], layer: art, from: `kalimba/samples/${file}`,
    });
  }
}

/* ── Marimba: sound "Marimba, weich" = layers `mar-med-<n>.wav`, `<n>.wav` ── */
for (const [layer, name] of [['mittel', (n) => `mar-med-${n}.wav`], ['laut', (n) => `${n}.wav`]]) {
  for (const note of ['C3', 'G3', 'B3', 'F4', 'C5']) {
    const file = name(note);
    put('marimba', file, readFileSync(join(EXPERIMENTS, 'marimba/samples', file)), {
      midi: MIDI[note], layer, from: `marimba/samples/${file}`,
    });
  }
}

rows.sort((a, b) => a.path.localeCompare(b.path));
const index = join(ROOT, 'supabase/content/instruments/samples.json');
mkdirSync(dirname(index), { recursive: true });
writeFileSync(index, JSON.stringify({ sources: SOURCES, samples: rows }, null, 2) + '\n');
console.log(`${rows.length} samples → apps/web/public/instruments/, index → supabase/content/instruments/samples.json`);
