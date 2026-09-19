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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
