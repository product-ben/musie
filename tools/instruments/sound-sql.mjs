#!/usr/bin/env node
/**
 * Prints the SQL that puts the instruments' sound into the database, from the
 * files `sources.test.ts` holds against the experiments.
 *
 * Used once to write section 5 of `20261109100000_instruments.sql`; kept so
 * the block can be regenerated and diffed rather than retyped. A migration is
 * never edited after it is applied (rule 4), so a later change to a sound is
 * a NEW migration generated the same way.
 *
 *   node tools/instruments/sound-sql.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase/content/instruments');
const read = (file) => JSON.parse(readFileSync(join(DIR, file), 'utf8'));
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const jsonb = (value) => `$json$${JSON.stringify(value)}$json$::jsonb`;

const shared = read('answer.json');
delete shared.$comment;
const { samples } = read('samples.json');

const out = [];
out.push('insert into public.instruments (id, family, source_experiment, source_commit, source_branch) values');
const ids = ['harp', 'kalimba', 'marimba'];
out.push(ids.map((id) => {
  const c = read(`${id}.json`);
  return `  (${q(id)}, ${q(c.family)}, ${q(c.source.experiment)}, ${q(c.source.commit)}, ${q(c.source.branch)})`;
}).join(',\n') + ';\n');

out.push('insert into public.instrument_sounds (instrument_id, sound, answer, demo) values');
out.push(ids.map((id) => {
  const c = read(`${id}.json`);
  return `  (${q(id)},\n   ${jsonb(c.sound)},\n   ${jsonb({ ...shared, ...c.answer })},\n   ${jsonb(c.demo)})`;
}).join(',\n') + ';\n');

out.push('insert into public.instrument_samples (instrument_id, file, path, midi, layer, bytes, sha256) values');
out.push(samples.map((s) =>
  `  (${q(s.instrument)}, ${q(s.file)}, ${q(s.path)}, ${s.midi}, ${q(s.layer)}, ${s.bytes}, ${q(s.sha256)})`,
).join(',\n') + ';');

console.log(out.join('\n'));
