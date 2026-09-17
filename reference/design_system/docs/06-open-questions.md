# Open questions

Everything I had to assume, plus what the next pass needs from you. Nothing here
was silently decided — each item names the assumption I shipped.

## Assumptions I shipped

1. **Reference viewports.** iPhone 16 is 393px (given). I assumed **834px**
   (iPad Air portrait) for tablet and **1440px** for desktop. All fluid type is
   interpolated between 393 and 1440; the 834 column in the docs is a readout,
   not an anchor. Say the word if your tablet reference is 768 or 1024.

2. **Persistence with a manual-only toggle.** You chose "manual toggle only", so
   the system preference is never read. I assumed you still want the choice
   *remembered* — `theme-init.js` persists to `localStorage` under
   `musy-theme` and defaults to **light** on first visit.

3. **Feedback colours are additions, not brand.** I generated four new scales
   rather than reusing ocher for warning. Reusing a brand accent for a status
   would have made "warning" and "accent 2" indistinguishable.

4. **Disabled tokens sit near 3:1**, above the 1.4.3 exemption. I assumed
   clearer is better for this audience. If disabled controls need to read as
   more obviously unavailable, they should get *dimmer* — which is a deliberate
   accessibility trade, not a default.

5. **Fonts loaded from the Google CDN** in the proof page, since you set no
   payload budget. For the MVP I'd still self-host woff2 subsets: it removes a
   third-party request on a slow indoor connection and kills the layout shift.
   Your call.

6. **`--measure-body: 62ch`** is set from German. If your copy runs shorter than
   I'm assuming, 66–70ch would also be defensible.

## Decisions I need from you

7. **`placeholder1` / `placeholder2`.** Both resolve today (ocher and purple),
   but the names are literal placeholders you asked for. What are these two
   families actually *for*? If one is "reflection" and one is "group session",
   the names should say that — and `accent-2`/`accent-3` should probably
   collapse into them rather than duplicate them.

8. **The group setting is not yet designed for.** 7–8 children around one tablet
   is a genuinely different mode from one-handed solo use: viewing distance
   doubles, the reader is often an adult beside the device, and touch targets get
   shared. `--target-guided` (64px) and the 768px breakpoint anticipate it, but a
   real shared-screen mode probably needs its own type set — closer to the "TV
   out of scope" case than to tablet. Is that a mode, or just "tablet, bigger"?

9. **Is `surface-inverse` earning its place?** It exists for tooltips and
   high-emphasis chips. If tooltips will use `surface-overlay` instead, two
   tokens (`surface-inverse`, `on-surface-inverse`) should be deleted per §5.

10. **Logical properties as the documented default?** RTL is "later", but if I
    write the component pass with `padding-inline` / `margin-block` from the
    start, RTL costs nearly nothing later. It slightly raises the floor of CSS
    knowledge needed to read the code. Worth it?

11. **`press` and `edge` need Figma variables.** They don't exist on the Figma
    side, so the round-trip is incomplete until they're added — 2 extra
    variables × 8 scales × 2 modes. Do you want me to generate the Tokens Studio
    import that creates them, or will you add them by hand?

12. **A third theme?** The mechanism supports N themes at no extra cost. Given
    the product — users who are sometimes overwhelmed, sometimes in a group — a
    low-stimulus session theme (reduced chroma, single accent, no elevation)
    might be worth more than dark mode. Not building it; asking whether it
    belongs on the roadmap before components get written.

13. **Which `[LOCKED]` icon resolution?** [Conflict A1 and A2](03-conflict-report.md)
    both need your decision before the component pass, because every component
    with an icon depends on the answer.


---

# Layer 2 — open questions (continues the numbering)

Questions 7, 8, 9, 11, 12 and 13 from Layer 1 are addressed by your Decisions
1–5: 9 is closed (`surface-inverse` stays — Icon Button's tooltip uses it), 13
is closed (both icon conflicts decided), 8 is closed for this pass (no separate
shared-screen mode). **7, 11 and 12 are still open**, and 7 got sharper — see
conflict B12.

## Decisions I need before Pass 3

14. **Tech stack, confirmed?** §1 and §8.1 both left the stack as
    `<confirm>`. I shipped **React + TypeScript, one file per component**,
    styled from a plain CSS file, on the assumption that base-ui (named in §1)
    means React. If the app is Vue or Svelte, the CSS file and the token usage
    survive unchanged and only the `.tsx` wrappers are rewritten — but say so
    now rather than after Pass 3.

15. **Radio Group truncation — is 2 lines the right cap at all?** §5.6 asks for
    max 2 lines with an ellipsis fallback "only after confirming truncated
    content remains available on focus/long-press". I could not confirm that, so
    I built the safe version: the component measures whether the clamp actually
    cut anything and drops the clamp for that option if it did. Nothing is ever
    hidden.

    The trade is that one long German option makes its row taller than its
    neighbours. If ragged row heights are unacceptable, the resolution is
    **shorter option strings**, not a truncation mechanism — that is the
    "needs a resolution, not just a token" case from Layer 1 §4. Which do you
    want: ragged rows, or a copy constraint?

16. **Does any error Message ever render statically in the initial markup?**
    This decides Message's `live` default (conflict B9). If every error is
    injected after an interaction, the default can flip to `'assertive'` for the
    error variant and one prop disappears from every call site. If even one
    renders server-side or on mount, the current explicit default has to stay.

17. **G2 cannot round-trip to Figma.** Figma Variables have no border-style
    type, so `--border-style-dashed` can exist in CSS and in the JSON but not as
    a variable. Options: keep it as a documented convention plus a component
    property on the Card component; or accept that one token is
    CSS-only and note it in the sync doc. Which?

18. **G3's name.** `--border-strong-hover`, or
    `--interactive-ghost-border-hover` inside the existing family? I lean to the
    family version — it leaves room for the accents to differ later — but it is
    the only gap with a genuine naming decision in it, so I have not staged
    either. See [08-token-gaps.md](08-token-gaps.md).

19. **Radio Group image ratio — 1:1 confirmed?** §5.7 left the ratio as
    `<confirm>`. I read **1:1** off the Figma card (152px wide, 150px media)
    rather than snapping to 4:3 or 16:9. If the real artwork is landscape, the
    2-column mobile grid is where it will hurt first.

20. **Icon stroke at 32px** (conflict A4). Fixing 16px alone leaves `icon-xl`
    rendering an effective 1.5px stroke — thinner than the design intent, in the
    opposite direction from the 16px problem. Do you want stroke-per-size (four
    tokens), or is 32px acceptable as-is? Deciding both at once costs nothing;
    deciding them separately means touching a locked section twice.

21. **Should `size="min"` exist on Icon Button?** (conflict B13.) It is the
    24px floor, exposed as an API value with mandatory spacing baked in. Keep it
    for inline-in-prose controls, or remove the variant and treat that case as a
    one-off?

22. ~~**base-ui migration, now or later?**~~ **Answered: migrate all, now.**
    Done — all twelve are on `@base-ui/react` ^1.7. See conflict B14 for what
    changed and [02-deltas.md](02-deltas.md#base-ui-migration) for the row-by-row.

23. **Type-check `Toggle`, `Tooltip` and `Button` on first install.** I
    confirmed `Switch`, `Radio`/`RadioGroup` and `Fieldset` against the official
    docs. I could not read `Toggle`, `Tooltip` and `Button`'s pages before
    running out of fetches, so those three are written from base-ui's consistent
    part-naming conventions rather than a verified reference. Specifically worth
    checking: whether `Toggle` takes `pressed`/`onPressedChange` (vs.
    `defaultPressed`), whether `Tooltip.Provider` uses `delay`/`closeDelay`, and
    whether `Button` accepts `disabled` directly or wants `nativeButton`. All
    three are small corrections if wrong; none affects the CSS or the tokens.

24. **base-ui needs two lines of app-level setup.** `isolation: isolate` on the
    app root wrapper, so portaled popups clear any local `z-index`; and
    `body { position: relative }` for iOS 26+ Safari backdrops — which matters
    here, because Layer 1's browser baseline is explicitly iOS Safari 18+. Both
    belong in the app shell, not in the design system's CSS, so I have not added
    them to `musy-components.css`. Confirm someone owns that.

25. **Does the app already have a `z-index` strategy that fights base-ui?**
    Layer 1's `--z-*` scale was written for portal-based layering, and base-ui
    portals to the end of `<body>`. With `isolation: isolate` on the root the two
    agree. Without it, a sticky nav at `--z-sticky` can cover a tooltip. Nothing
    to fix in the tokens; it is a setup dependency worth stating once.

## Layer 3 — open questions (continues the numbering)

26. **`Lightbox` passes `dismissible` to `Dialog.Root`.**
    [12 · Component gaps](12-component-gaps.md) §6 flags it as the same class of
    drift as the `Field` defect — a prop the primitive may not accept — but
    unlike `Field` it was **not decided**, and no screen exercises it yet. I
    have left the code alone rather than guess: if the prop is real, changing it
    breaks `mandatory`; if it is not, `mandatory` has been silently inert since
    §7.14 shipped, and Escape still closes a lightbox that asked not to be
    dismissable — which is a 2.1.2 *feature*, not a bug, but not what the prop
    promises. **Needs one check against `@base-ui/react` 1.7.0's `Dialog.Root`
    signature**, then either a fix or a doc correction. This is the one item
    from §6 still open.

27. **Layer 3 is derived from one screen.** Every rule comes from a transcript
    workspace, measured at 393px and 1280px. A form, a media grid or a
    multi-step flow will find gaps — L2's gap ladder and L6's action-row rule
    are named in the handoff as the two most likely. Shipped as **version 1**.
    The question is what the second screen should be, because that is what turns
    fifteen measured rules into a layer: a form is the obvious candidate, since
    it stresses L2 hardest and the package already has Field, FieldGroup and
    Interactive Wizard to build it from.

28. **L8's dense-list exception is a character count, and `body-sm` is 15px.**
    Layer 1 §4 sets a hard floor of 17px and bars `body-sm` from essential
    prose; L8 permits `body-sm` for a list item of 80 characters or fewer. Those
    two statements are compatible only if a short list item is not "essential
    prose", which is a judgement the package now depends on in code
    (`text.length <= 80 ? 'body-sm' : 'body-md'`). I have filed it as written —
    it is decided — but it is the rule most likely to be challenged in an
    accessibility review, and 80 characters is the one number in Layer 3 that is
    not a token.

    **Now with a second reason.** In an editable list the exception makes a
    merge re-size text the user just combined — reported as a bug, and it is
    one. §7.24 therefore applies the exception's *size* to every item and drops
    its length test (conflict B23), which means Layer 3's own component ships
    with L8's rule off. Two things to decide: whether L8 states that it applies
    to read-only lists, and whether 15px is right for a transcript the user is
    **editing** rather than scanning — §4's floor exists for prose someone has
    to read closely, and correcting your own words is closer to that than to
    scanning.

29. **Should `--space-section` be fluid?** L2 needs `--space-section-lg` inside
    a media query, which CSS cannot take a custom property for, so every screen
    with page-level sections writes a literal and names the token in a comment
    (conflict B20). A single `clamp()`-based `--space-section` would remove the
    exception and the second token. It would also change the 48 → 96 step into a
    ramp, which may not be what was wanted. Layer 1 decision.

### Layer 3 — round 2 (Draggable List and the Reflect integration)

30. **§7.24's keyboard drag is implemented and has never been verified.**
    Space lifts, arrows move, `M` merges into the item above, Escape cancels,
    and a live region announces each. The reference implementation says the
    same thing, and
    [`15-layout-evidence.md`](15-layout-evidence.md) lists it under "what is
    *not* evidenced". It is the only keyboard path to a reorder — a
    pointer-only drag would be a 2.1.1 failure — so this needs one pass with a
    real screen reader before §7.24 loses its `[SEED]` tag. I have not marked
    it verified on the strength of the code compiling.

The four below come from
[`14-reflect-step.md`](14-reflect-step.md) and are **product decisions, raised
rather than decided**, as that file asks. None of them blocks the component;
all four block building the step.

31. **A reflection is one answer; the list produces several statements.** Step 5
    emails *the* reflection. Three ways to reconcile it: join the statements at
    the step boundary and send that; make the list's **merge** affordance the
    intended path, so the user combines them before continuing; or send them as
    a list and let step 5's preview show them as such. The handoff calls the
    second the most honest to what the component offers and the slowest for the
    user, which I agree with. Nothing in the layout depends on this — **the
    Continue copy does**, and so does whether "Weiter" is even singular.

32. **The question stays on screen while the user speaks.** A person answering
    aloud looks back at the prompt, so the card's question should stay visible
    during capture. That makes the panel taller, which is what the
    sticky-versus-scrolling decision turns on — and on a 393px screen with a
    question, a record control, a growing list and a Continue button, something
    has to give.

33. **The prototype has no backend, and transcription needs a key.** On the
    demo the user pastes one, which is fine there and impossible in the
    product. Either this step keeps *simulating* transcription — §7.24 is fully
    controlled and a simulated transcriber drives it identically — or the real
    flow needs somewhere for a key to live. The component does not care; the
    prototype's fidelity does.

34. **German, and the 80-character threshold.** The prototype ships English
    first and every state word in Layer 3 is English. L8's threshold for the
    type step was set on **German** sample text, which runs ~30% longer. It
    does not need changing, but it should be re-read once the German copy
    exists — and it is already flagged in question 28 as the one number in
    Layer 3 that is not a token.

35. **Three cues have now been spent for a lighter look, in three components.**
    B23 (§7.24's type step), B24 (§7.17's marker rings) and B25 (§06/07/13/15's
    selection boundaries) are the same trade made three times: a non-colour cue
    removed because it read as heavy. Each is individually defensible and each
    kept a `prefers-contrast: more` escape, but the direction is consistent
    enough that it should be a **stated principle** rather than three local
    decisions — something like "one shape cue per state is the floor; edges are
    decoration above that". §15 Segmented Control is the one that currently
    falls below it, having no glyph. Layer 1 or Layer 3 decision, not a
    component one.
