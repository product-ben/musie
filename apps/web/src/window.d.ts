/**
 * The API `@musie/design-system/tokens/theme-init.js` installs on `window`.
 *
 * That script is inlined in index.html's <head> and runs before first paint,
 * so `window.musyTheme` exists before React mounts. It is still typed optional:
 * a consumer that forgets the snippet should get a type error at the call site
 * rather than a crash in the browser.
 */
export type ThemeName = 'light' | 'dark';

declare global {
  interface Window {
    musyTheme?: {
      /** Reads the live `data-theme` attribute, not the stored value. */
      get(): ThemeName | null;
      /** Sets the attribute and persists it under the `musy-theme` key. */
      set(theme: ThemeName): void;
      toggle(): void;
    };
  }
}
