/**
 * What changed, from what, to what — and whether Ben can just upload it.
 *
 * ── WHY A DIFF AND NOT A LOG OF EDITS ─────────────────────────────────────
 * Recording every edit as it happens gives three entries for a field somebody
 * typed in, backspaced, and typed again. What a reader wants is the NET
 * change: the value as it came out of the database, and the value now. So the
 * before/after side is computed by walking two configs, and only the
 * PROVENANCE — was this hand-typed, prompted, or auto-translated — is carried
 * alongside, because that is the one thing a diff cannot recover.
 *
 * ── ONE MECHANISM, TWO ANSWERS ────────────────────────────────────────────
 * The same walk produces the change log and the `safeToApply` flag, which is
 * deliberate: a flag computed separately from the list it summarises is a flag
 * that can disagree with it. Every path the walk finds is classified as TEXT
 * or STRUCTURAL by its shape, and any structural change is a blocker.
 *
 * ── IT CLASSIFIES THE EFFECT, NOT THE FIELD ───────────────────────────────
 * Ben, 2026-10-27: *"If anything structural changes, this must be flagged."*
 * The tempting reading is "did she touch a structural field", and it is wrong,
 * because the line is not clean. `library.de.needs` is a TEXT field — but
 * empty means `needs: null`, and `needs_note` is derived from it being
 * non-null. Clearing a sentence switches off a feature.
 *
 * That case lands here as a change to `run[0].features`, which this walk sees
 * and classifies as structural, because the builder recomputes the feature
 * from the value. The rule is therefore: classify what the config SAYS after
 * the edit, never what the therapist aimed at.
 *
 * Pure: no React, no supabase, no i18n.
 */
import type {
  ChangeKind, ChangeOrigin, ConfigChange, ExerciseConfig, Handover, HandoverRequest,
} from './exerciseConfig';

/* ── WHICH PATHS ARE TEXT ──────────────────────────────────────────────────
 * Everything else is structural. An allowlist and not a denylist, on purpose:
 * a field added to the schema later is structural until somebody decides it is
 * not, which is the safe direction for a flag Ben relies on. */
const TEXT_PATHS: readonly RegExp[] = [
  /^library\.(de|en)\.(name|description|needs|imageAlt)$/,
  /^run\[\d+]\.copy\.(de|en)\.(headline|bodyMd|placeholder|continueLabel)$/,
  /^run\[\d+]\.copy\.(de|en)\.(digital|analogue)\.(headline|bodyMd|placeholder|continueLabel)$/,
  /^run\[\d+]\.questions\.(de|en)\[\d+]\.(listen|reflect|helper)$/,
];

export function classifyPath(path: string): ChangeKind {
  return TEXT_PATHS.some((shape) => shape.test(path)) ? 'text' : 'structural';
}

/* ── THE WALK ──────────────────────────────────────────────────────────────
 * Depth-first over both configs at once, emitting a leaf path wherever the two
 * disagree. Arrays are walked by index rather than matched by identity: a
 * question inserted in the middle therefore reports every later question as
 * changed, which is noisier than a smart diff and is the honest answer —
 * the rotation indexes by position, so a shifted question IS a different
 * question at that position. */
function leafString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function isLeaf(value: unknown): boolean {
  return value === null || value === undefined || typeof value !== 'object';
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: { path: string; before: string | null; after: string | null }[],
): void {
  if (isLeaf(before) && isLeaf(after)) {
    if (leafString(before) !== leafString(after)) {
      out.push({ path, before: leafString(before), after: leafString(after) });
    }
    return;
  }

  /* A leaf on one side and a branch on the other: report the whole subtree as
     one change rather than inventing paths under a thing that is not there. */
  if (isLeaf(before) !== isLeaf(after)) {
    out.push({ path, before: leafString(before), after: leafString(after) });
    return;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    const left = Array.isArray(before) ? before : [];
    const right = Array.isArray(after) ? after : [];

    /* ── A LIST OF WORDS IS ONE FACT, NOT N FACTS ──────────────────────
       `features`, `goals` and `locales` are SETS: nothing reads their order.
       Walking them by index turns "two features switched off" into three
       entries that each look like a rename — `features[4]: rotating_question
       → immersive_view` — which is true of the array and false about the
       exercise. So an array whose members are all primitives is compared
       whole, and reports one before and one after.

       Arrays of OBJECTS stay index-wise: `questions` is read by position, so
       a question at index 1 really is a different question from the one that
       was there. */
    const primitives = [...left, ...right].every(isLeaf);
    if (primitives) {
      const was = JSON.stringify(left);
      const now = JSON.stringify(right);
      if (was !== now) out.push({ path, before: was, after: now });
      return;
    }

    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      walk(left[index], right[index], `${path}[${index}]`, out);
    }
    return;
  }

  const left = (before ?? {}) as Record<string, unknown>;
  const right = (after ?? {}) as Record<string, unknown>;
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    /* The handover block describes the changes; it is not one of them. */
    if (path === '' && key === 'handover') continue;
    if (path === '' && key === '$schema') continue;
    walk(left[key], right[key], path === '' ? key : `${path}.${key}`, out);
  }
}

/**
 * The change log: every field that differs, with where its value came from.
 *
 * `origins` is keyed by the same dotted path. A path with no entry is `hand` —
 * the common case, and the one that needs no bookkeeping to be right.
 */
export function changeLog(
  baseline: ExerciseConfig,
  current: ExerciseConfig,
  origins: Record<string, ChangeOrigin> = {},
  prompts: Record<string, string> = {},
): ConfigChange[] {
  const found: { path: string; before: string | null; after: string | null }[] = [];
  walk(baseline, current, '', found);

  return found
    .map((entry) => {
      const by = origins[entry.path] ?? 'hand';
      const change: ConfigChange = {
        path: entry.path,
        kind: classifyPath(entry.path),
        before: entry.before,
        after: entry.after,
        by,
      };
      const prompt = prompts[entry.path];
      if (by === 'prompt' && prompt !== undefined) change.prompt = prompt;
      return change;
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}


/* ── ONE LINE PER BLOCKER ──────────────────────────────────────────────────
 * The whole value lives in `changes`, where a reader has gone looking for it.
 * This list is the one Ben reads at a glance to decide whether to open the
 * file at all, so it has to say what MOVED rather than quote what is there.
 *
 * For a set — `features`, `goals`, `locales` — that means the members that
 * came and went. Truncating the two lists instead produced the line
 * `features: ["track_from_card","card_visual","infographic","track_rev… →
 * ["track_from_card","card_visual","infographic","track_rev…`, which is
 * bounded, honest and completely useless: both sides clip to the same prefix
 * and the actual change falls off the end.
 */
function asWordList(value: string | null): string[] | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')
      ? (parsed as string[])
      : null;
  } catch {
    return null;
  }
}

function clip(value: string): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length <= 60 ? flat : `${flat.slice(0, 57)}…`;
}

export function summarise(change: ConfigChange): string {
  const was = asWordList(change.before);
  const now = asWordList(change.after);

  if (was !== null && now !== null) {
    const moves = [
      ...was.filter((entry) => !now.includes(entry)).map((entry) => `-${entry}`),
      ...now.filter((entry) => !was.includes(entry)).map((entry) => `+${entry}`),
    ];
    if (moves.length > 0) return `${change.path}: ${moves.join(' ')}`;
  }

  /* A whole block that appeared or vanished. Quoting it would be the same
     wall of JSON in a different shape. */
  if (change.before === null) return `${change.path}: added`;
  if (change.after === null) return `${change.path}: removed`;

  return `${change.path}: ${clip(change.before)} → ${clip(change.after)}`;
}

/**
 * The handover block, which is the first thing in the file and the reason the
 * file can be refused.
 *
 * `takenAt` is passed in rather than read off a clock, so two builds of the
 * same edits produce the same bytes — the property `content-export.mjs` calls
 * byte-stability, and the reason a diff of two configs is worth reading.
 */
export function buildHandover(
  changes: ConfigChange[],
  requests: HandoverRequest[],
  machineTranslated: string[],
  takenAt: string,
): Handover {
  const structural = changes.filter((change) => change.kind === 'structural');

  const blockers = [
    ...structural.map(summarise),
    ...requests
      .filter((request) => !request.applied)
      .map((request) => `not applied: ${request.prompt}`),
  ];

  return {
    safeToApply: blockers.length === 0,
    blockers,
    baseline: { takenAt },
    changes,
    requests,
    machineTranslated: [...machineTranslated].sort(),
  };
}

/* ── WRITING BACK AT A PATH ────────────────────────────────────────────────
 * The model and the translator both answer with the paths they were given, so
 * applying an answer means writing at a dotted path. Deliberately NARROW: it
 * walks only keys and indexes that already exist, and refuses to create a
 * branch. A path that does not resolve is dropped rather than conjured —
 * which is the third gate on a model's output, after the function's allowlist
 * and `classifyPath`. */
const SEGMENT = /([^.[\]]+)|\[(\d+)]/g;

export function pathSegments(path: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const match of path.matchAll(SEGMENT)) {
    const key = match[1];
    const index = match[2];
    if (key !== undefined) out.push(key);
    else if (index !== undefined) out.push(Number(index));
  }
  return out;
}

/**
 * Write `value` at `path`, in place. Returns whether it landed.
 *
 * False means the path did not resolve against this config — a path the model
 * invented, or one whose step moved. The caller drops it; nothing is created.
 */
export function setAtPath(target: unknown, path: string, value: string): boolean {
  const segments = pathSegments(path);
  if (segments.length === 0) return false;

  type Walkable = Record<string | number, unknown>;

  let node: unknown = target;
  for (const segment of segments.slice(0, -1)) {
    if (node === null || typeof node !== 'object') return false;
    const branch = node as Walkable;
    /* `hasOwnProperty`, so a path naming `constructor` or `__proto__` cannot
       walk out of the object it was handed. */
    if (!Object.prototype.hasOwnProperty.call(branch, segment)) return false;
    node = branch[segment];
  }

  const last = segments.at(-1);
  if (last === undefined || node === null || typeof node !== 'object') return false;
  const leaf = node as Walkable;
  /* The leaf may legitimately be absent — `continueLabel` is optional — but
     its PARENT must exist, which the walk above already proved. */
  if (typeof leaf[last] !== 'string' && leaf[last] !== undefined) return false;

  leaf[last] = value;
  return true;
}
