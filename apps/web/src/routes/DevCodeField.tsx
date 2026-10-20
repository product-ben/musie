/**
 * `/dev/code-field` — the bench for `CodeField`, and it is written to be deleted.
 *
 * ── WHY IT EXISTS AT ALL ──────────────────────────────────────────────────
 * `CodeField`'s whole value is its interaction, and the one place it is
 * documented — Storybook — cannot show any of it. `stories/CONVENTIONS.md` §5
 * forbids local state in a story ("the story documents a state, it does not
 * simulate a session"), so on that page the boxes never move: paste, advance,
 * backspace and complete are all invisible there by design.
 *
 * That leaves the three behaviours that matter unverifiable until a screen
 * uses the component. This is the same gap `/dev/qr` and `/dev/experiment-
 * mixer` were built for, and the same answer: a stateful bench nobody but the
 * team opens.
 *
 * ── THE FOUR QUESTIONS ────────────────────────────────────────────────────
 *   1. Does pasting the whole code into ANY box fill every box?
 *   2. Does typing advance, and backspace retreat?
 *   3. Does it proceed on the last digit with no button pressed?
 *   4. **On a real iPhone**: does iOS offer the mailed code above the keyboard?
 *
 * The fourth is the one that cannot be answered here or by reasoning. It needs
 * an iPhone with a real code email in it, which is why this bench exists
 * rather than a test.
 *
 * ── DELETE IT WHEN THE SIGN-IN SCREENS LAND ───────────────────────────────
 * Once `/sign-in` and the code step exist, they walk these behaviours in the
 * real app and this route is dead weight. Unlike the mixer bench, no second
 * question is expected to arrive — if one does, that is the moment to decide
 * to keep it, deliberately, the way the mixer was kept.
 *
 * ── EXEMPT FROM RULES 6 AND 7 ─────────────────────────────────────────────
 * Inline English, no catalogue keys, on exactly the grounds `/dev/qr`,
 * `/dev/experiment-mixer` and `/goal-mappings` claim: a tool nobody but the
 * team opens, linked from nowhere, and lazy so no visitor downloads a byte of
 * it. The strings it passes to `CodeField` are deliberately English so that a
 * leaked German default would be obvious rather than camouflaged.
 */
import * as React from 'react';
import { CodeField } from '@musie/design-system';

/** What the last `onComplete` fired with, and when. */
interface Fired {
  code: string;
  at: string;
}

function Bench({
  title,
  length,
  question,
}: {
  title: string;
  length: number;
  question: string;
}) {
  const [value, setValue] = React.useState('');
  const [fired, setFired] = React.useState<Fired | null>(null);
  const [completions, setCompletions] = React.useState(0);
  const [invalid, setInvalid] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);

  return (
    <section style={{ display: 'grid', gap: '1rem', padding: '1rem 0' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.125rem' }}>{title}</h2>
        <p style={{ margin: '0.25rem 0 0', opacity: 0.7, fontSize: '0.875rem' }}>{question}</p>
      </div>

      <CodeField
        length={length}
        value={value}
        onValueChange={setValue}
        onComplete={(code) => {
          /* COUNTED, not just recorded. The bug this bench is most likely to
             find is `onComplete` firing more than once for one entry — which
             looks identical to firing once unless you count. */
          setCompletions((previous) => previous + 1);
          setFired({ code, at: new Date().toLocaleTimeString() });
        }}
        label={`${title} — ${length} digits`}
        boxLabel={(position, total) => `Digit ${position} of ${total}`}
        description="Paste the whole code into any box. It should fill them all."
        errorMessage={invalid ? 'That code is not right. Check it and try again.' : undefined}
        disabled={disabled}
      />

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.25rem 1rem',
          margin: 0,
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.8125rem',
        }}
      >
        <dt>value</dt>
        <dd style={{ margin: 0 }}>{value === '' ? '(empty)' : JSON.stringify(value)}</dd>
        <dt>length</dt>
        <dd style={{ margin: 0 }}>{value.length} of {length}</dd>
        <dt>onComplete</dt>
        <dd style={{ margin: 0 }}>
          {fired === null ? 'not fired' : `${JSON.stringify(fired.code)} at ${fired.at}`}
        </dd>
        <dt>fired×</dt>
        <dd style={{ margin: 0, fontWeight: completions > 1 ? 700 : 400 }}>
          {completions}{completions > 1 ? '  ← should be 1 per entry' : ''}
        </dd>
      </dl>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
        <label style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <input type="checkbox" checked={invalid} onChange={(e) => { setInvalid(e.target.checked); }} />
          error state
        </label>
        <label style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <input type="checkbox" checked={disabled} onChange={(e) => { setDisabled(e.target.checked); }} />
          disabled
        </label>
        <button
          type="button"
          onClick={() => { setValue(''); setFired(null); setCompletions(0); }}
          style={{ font: 'inherit' }}
        >
          reset
        </button>
      </div>
    </section>
  );
}

export function DevCodeField() {
  React.useEffect(() => {
    document.title = 'CodeField bench';
  }, []);

  return (
    <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      <h1 style={{ fontSize: '1.375rem', marginTop: 0 }}>CodeField bench</h1>
      <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
        Not a screen. Delete this route once the sign-in screens exist — see the
        file header.
      </p>

      <Bench
        title="Sign-in code"
        length={6}
        question="The code mailed to a tester. Try: type it, paste it into box 4, backspace from the end."
      />

      <hr style={{ border: 0, borderTop: '1px solid currentColor', opacity: 0.15 }} />

      <Bench
        title="Access code"
        length={4}
        question="The code Ben or Lucy hands out. Same component, one prop different."
      />

      <hr style={{ border: 0, borderTop: '1px solid currentColor', opacity: 0.15 }} />

      <p style={{ fontSize: '0.8125rem', opacity: 0.7 }}>
        <strong>On an iPhone:</strong> open a real code email, come back, and tap
        the first box. iOS should offer the code above the keyboard. That is the
        one question this bench cannot answer on a laptop.
      </p>
    </div>
  );
}
