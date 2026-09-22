/// <reference types="vite/client" />

/**
 * The environment variables this app reads.
 *
 * Only `VITE_`-prefixed names reach browser code — that prefix is Vite's
 * opt-in, and it is the reason a service role key cannot arrive here by
 * accident from an unprefixed variable. It can still arrive on purpose, which
 * is what the guard in lib/supabase.ts is for.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /**
   * The sign-in gate. `string | undefined`, never `boolean`.
   *
   * Vite hands every variable through as a STRING, so typing this `boolean`
   * would be a lie the compiler then enforces — and `if (env.FLAG)` on the
   * string 'false' is permanently true. `undefined` is in the type because an
   * unset variable really is absent. Parsed in lib/requireAccount.ts, which is
   * the only place that reads it.
   */
  readonly VITE_REQUIRE_ACCOUNT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
