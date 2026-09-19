/**
 * `process.env.NODE_ENV`, typed — nothing more.
 *
 * WHY THIS FILE EXISTS. @musie/design-system is consumed as TypeScript SOURCE
 * (its `exports` map points at ./src/index.ts, not a build), so `tsc` in this
 * app typechecks the system's own .tsx files. One of them,
 * SegmentedControl.tsx:67, guards a development-only console.warn with
 * `process.env.NODE_ENV !== 'production'` — a bundler-replaced idiom Vite
 * supports, but a Node global that a browser app has no types for.
 *
 * WHY NOT @types/node. It would fix this and bring the whole Node global
 * surface with it: `setTimeout` starts returning NodeJS.Timeout instead of a
 * number, `Buffer` becomes a valid identifier in browser code, and mistakes
 * that should be type errors quietly are not. This declares the one member
 * that is actually needed.
 *
 * Delete this the day the design system ships a build instead of source, or
 * drops that guard.
 */
declare const process: {
  readonly env: {
    readonly NODE_ENV?: string;
  };
};
