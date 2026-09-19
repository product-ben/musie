/**
 * The smallest thing that covers loading / error / empty.
 *
 * Not TanStack Query. There is no cache to invalidate, no mutation, no
 * refetch-on-focus and no pagination yet — and a query library's value is
 * almost entirely in those. When there is a real cache to manage, that is the
 * moment to add one, deliberately.
 *
 * `key` drives re-running: it changes when the inputs change (the locale, an
 * id) and the effect depends on it alone. The work itself is held in a ref so
 * a new closure on every render does not re-fire the request — the classic
 * mistake here is depending on the function and refetching forever.
 *
 * Cancellation matters more than it looks: switch locale mid-flight and the
 * German response can land after the English one. `cancelled` makes the stale
 * response a no-op instead of a flicker.
 */
import * as React from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(run: () => Promise<T>, key: string): AsyncState<T> {
  const [state, setState] = React.useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  /* Latest-ref: read inside the effect, never a dependency of it. */
  const runRef = React.useRef(run);
  React.useEffect(() => {
    runRef.current = run;
  }, [run]);

  React.useEffect(() => {
    let cancelled = false;

    setState({ data: null, loading: true, error: null });

    runRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (thrown: unknown) => {
        if (cancelled) return;
        const error = thrown instanceof Error ? thrown : new Error(String(thrown));
        /* Logged as well as rendered: the rendered message is deliberately
           plain and generic, and the console is where the cause lives. */
        console.error(`[musie] ${key} failed:`, error.message);
        setState({ data: null, loading: false, error });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
