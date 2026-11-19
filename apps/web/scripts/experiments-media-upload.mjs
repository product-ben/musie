/**
 * The experiments' audio and video, into the public `experiments` bucket.
 *
 *   pnpm experiments:media            → the hosted project (the linked one)
 *   pnpm experiments:media --local    → the local stack
 *
 * WHY THIS EXISTS: musie.org serves `apps/web/public/` as Cloudflare Workers
 * static assets, which ignore `Range`, and Safari on iOS will not play <audio>
 * without it. Supabase Storage answers ranges. So a page under /experiments
 * streams its media from the bucket, and this script puts it there.
 * `20261119170000_experiments_media_bucket.sql` has the whole story.
 *
 * WHAT IT DOES: every audio and video file in a `media/` folder under
 * `apps/web/public/experiments/` goes to the object at the same path below
 * `experiments/`: `public/experiments/reflexion/media/aura.mp3` →
 * `reflexion/media/aura.mp3`. Only `media/`, because that is where a page
 * keeps what it PLAYS. The instruments' `samples/` are fetched whole and
 * decoded, which needs no range, so they stay on Cloudflare.
 *
 * The content type comes from the extension. The CLI's own guess called some
 * of the instrument MP3s `application/octet-stream`, which the bucket refuses.
 *
 * Each file is removed first, because `supabase storage cp` refuses to replace
 * an object that exists. So a run always makes the bucket match the folder.
 * Then every public URL is asked for two bytes, and the script fails unless
 * each answers `206`. That is the property all of this is for, so it is
 * measured rather than assumed.
 *
 * NO KEY IN ANY FILE. The Supabase CLI authenticates with its own login (the
 * same as `pnpm db:status`). Run it from a checkout where `supabase link` has
 * been done, which is the main one.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const FOLDER = path.join(REPO, 'apps/web/public/experiments');
const BUCKET = 'experiments';
const TYPES = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

function typeOf(file) {
  return TYPES[path.extname(file).slice(1).toLowerCase()];
}

const local = process.argv.includes('--local');
const target = local ? '--local' : '--linked';

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    const inMedia = path.basename(dir) === 'media';
    return inMedia && typeOf(full) !== undefined ? [full] : [];
  });
}

function supabase(args) {
  return spawnSync('supabase', [...args, '--experimental', target], {
    cwd: REPO,
    encoding: 'utf8',
  });
}

function apiUrl() {
  if (local) return 'http://127.0.0.1:54321';
  const refFile = path.join(REPO, 'supabase/.temp/project-ref');
  if (!fs.existsSync(refFile)) {
    console.error('No linked project here (supabase/.temp/project-ref is missing). Run this from the main checkout.');
    process.exit(1);
  }
  return `https://${fs.readFileSync(refFile, 'utf8').trim()}.supabase.co`;
}

const base = apiUrl();
const found = files(FOLDER);
if (found.length === 0) {
  console.log('No audio or video in a media/ folder under apps/web/public/experiments/. Nothing to do.');
  process.exit(0);
}

console.log(`Uploading ${found.length} file(s) to the "${BUCKET}" bucket on ${local ? 'the local stack' : base}.\n`);

const urls = [];
for (const file of found) {
  const key = path.relative(FOLDER, file).split(path.sep).join('/');
  const object = `ss:///${BUCKET}/${key}`;
  supabase(['storage', 'rm', '--yes', object]);
  const copied = supabase(['storage', 'cp', '--content-type', typeOf(file), file, object]);
  if (copied.status !== 0 || /"_tag":"Error"/.test(copied.stdout + copied.stderr)) {
    console.error(`✗ ${key}\n${copied.stdout}${copied.stderr}`);
    process.exit(1);
  }
  const url = `${base}/storage/v1/object/public/${BUCKET}/${key}`;
  urls.push(url);
  console.log(`✓ ${key}  (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
}

console.log('\nAsking each file for two bytes. Streaming needs 206:');
let bad = 0;
for (const url of urls) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-1' } });
  await response.body?.cancel();
  const ok = response.status === 206;
  if (!ok) bad += 1;
  console.log(`${ok ? '✓' : '✗'} ${response.status}  ${url}`);
}
process.exit(bad === 0 ? 0 : 1);
