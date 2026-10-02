import { describe, expect, it } from 'vitest';
import { entryDestination } from './entry';

describe('entryDestination', () => {
  it('sends a returning visitor who opened the app to the library', () => {
    expect(entryDestination(true, true)).toBe('/exercises');
  });

  it('sends a first-time visitor who opened the app to the explainer', () => {
    expect(entryDestination(true, false)).toBe('/about');
  });

  /* The case the redirect-only design would have got wrong in the other
     direction, and the reason the decision lives at `/`: asking for the front
     page from inside the app shows you the front page, whoever you are. */
  it('sends a returning visitor who navigated to / to the explainer', () => {
    expect(entryDestination(false, true)).toBe('/about');
  });

  it('sends a first-time visitor who navigated to / to the explainer', () => {
    expect(entryDestination(false, false)).toBe('/about');
  });
});
