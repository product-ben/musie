/**
 * `src/instruments/engine/answer.ts` as the app's session sees it here: all
 * of today's module, except that the conversation is the experiment's
 * (conversation.ts), which reads the panel's switches.
 *
 * vite.config.ts swaps this in for app code only — an import from inside
 * `src/` (host.ts). The experiment's own files still reach the real module,
 * which is how `base` in answer2.ts is checked against today's `compose`.
 */
export * from '../../../../src/instruments/engine/answer';
export { createConversation } from '../conversation';
