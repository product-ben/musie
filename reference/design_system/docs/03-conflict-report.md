# Conflict report

**Unresolved. For you to decide.** Nothing here was fixed silently.

Two kinds of entry: `[LOCKED]` values that break a §3 hard constraint, and every
place the §2.4 precedence order had to be applied.

---

## A. `[LOCKED]` values that break a §3 constraint

### A1 · Iconography — an animated icon set cannot honour `prefers-reduced-motion` at the token level

**§4.9 `[LOCKED]`** names `lucide-animated.com`. **§3** requires
`prefers-reduced-motion` honoured *at the token level*, and 2.3.1 no flashing.

These cannot both be true. `lucide-animated` icons animate from inside the icon
component — the motion is in the SVG/JS, not in a duration token — so no token
change can still them. The reduced-motion block in the token file collapses
every Musy duration to 1ms, and the animated icons will keep playing straight
through it.

I reproduced the size and stroke exactly and did not resolve this. Options:

1. **Ship static Lucide, animate opt-in.** Use plain Lucide as the default and
   allow `lucide-animated` only where a component explicitly gates it behind
   `prefers-reduced-motion` and a user setting. Keeps §3 intact.
2. **Keep `lucide-animated`.** Then §3's "at the token level" has to be relaxed
   to "at the token level plus a mandatory per-component gate", and every icon
   usage needs a review checkpoint. Higher ongoing cost, and easy to regress.
3. **Animation as a deliberate therapeutic feature.** If breathing-pacing or
   rhythm cues are meant to animate, that is a *product* motion decision, not an
   icon-set decision — it should be a named token (`--motion-pacing`) with its
   own reduced-motion fallback, and the icon set can go static.

My recommendation is (1), but it is a locked section, so it is your call.

### A2 · Iconography — 2px stroke at the 16px size

Lucide's 2px stroke is drawn for a 24px grid. Rendered at `--icon-size-sm`
(16px) the effective stroke is 3 grid units, which reads noticeably heavier than
the same icon at 24px and closes small counters — a legibility issue for the
low-vision users in the brief, and arguably a 1.4.11 risk for a meaningful icon
whose *shape* stops being identifiable.

Lucide's own guidance is to scale stroke with size (≈1.5px at 16px). **`[LOCKED]`
says reproduce exactly and do not optimise, so I did not.** `--icon-stroke` is
2px at every size.

To fix it you would either allow a second token (`--icon-stroke-sm: 1.5px`) or
drop `--icon-size-sm` and make 20px the smallest icon. Both are deviations from
a locked section.

---

## B. Places the §2.4 precedence order had to be applied

### B1 · Hard constraint over screen example — white label on terracotta

The screens show `surface` #FBF8F2 on `accent/terracotta` #C1613F: **3.92:1**.
1.4.3 requires 4.5:1. Hard constraints outrank screen examples, so
`terracotta-9` moved to #B55634. Logged as a delta. The *intent* — a white label
on a terracotta pill — is preserved; only the fill lightness changed.

### B2 · Variables over screen example — `accent/pop` vs `accent/purple`

The variable collection defines `accent/purple`; the swatch row in the
Richtung-A frame labels the third accent `accent/pop`. Variables outrank screen
examples. You confirmed `accent/purple`. **The Figma file still carries the
stale `accent/pop` label** — worth fixing there so the round-trip is clean.

### B3 · Written brief over Figma variables — §4.4 Spacing tagged `[OPEN]`

`[OPEN]` means "Figma has nothing usable", but the file *does* have a usable
Spacing collection: 8 float variables, 4→64, a clean 4px base. The brief's tag
and the file disagree.

The brief outranks variables, which would have had me design a fresh scale and
throw away a working one — and break the round-trip you asked for. **I treated
§4.4 as `[SEED]` instead and reproduced `sp-1`…`sp-8` exactly**, adding only
`sp-9`/`sp-10`. Flagging because it is a deliberate departure from the tag you
set. If you really do want spacing designed from scratch, say so and I will.

### B4 · Written brief over Figma — §4.3 "named steps matching Figma"

That line is commented out in the brief, and the file defines **zero text
styles** (confirmed: 0 TEXT styles, 0 EFFECT styles). There is nothing to match.
Type sizes exist only as ad-hoc values on layers: 12, 13, 14, 16, 18, 26, 40px.

I designed the step set from first principles and mapped each Figma size onto
it. If you intended a specific named set, it is not in the file and I could not
guess it.

### B5 · Variables over screen examples — radius

The file has two radius variables (`Corner/Small` 8, `Corner/Medium` 12) but the
screens use 8, 12, 16 and 999. Screens rank below variables, so I did **not**
read 16 and 999 as authoritative extractions — they are logged as additions in
the deltas table. If they were meant to be canonical, they need variables in
Figma.

### B6 · Hard constraint over its own wording — `prefers-contrast: less`

§3 says `prefers-contrast` honoured at the token level. `more` is honoured.
**`less` is deliberately not**, because every reduction I could make would take
a pair below 1.4.3's 4.5:1 — the same §3 list forbids that. Reporting rather
than resolving: if you want a genuine low-contrast mode it needs to be a named
theme with an explicit accessibility exception, not a media query.

### B7 · Judgement — feedback hues sit close to brand hues

Not a source conflict, but it is the one place my judgement had to fill a gap
that could bite you.

`error` (OKLCH hue 25) sits 15° from `terracotta` (hue 40), and `warning` (hue
62) sits between `terracotta` and `ocher` (77). They separate clearly by chroma
and lightness, and 1.4.1 is satisfied because every feedback treatment carries
an icon, a text string **and** a `-border` — but they are *not* separable by hue
alone, which matters for a red-green colour-blind user glancing at a
terracotta-heavy screen.

The alternative is pushing error toward magenta and warning toward yellow, both
of which fight the warm palette. I chose to keep the palette coherent and make
the non-colour cues mandatory. Flagging so you can overrule.


---

# Layer 2 — conflict report (continues A/B numbering)

Layer 1's A1 and A2 are now **resolved by your decisions**, not by me:

- **A1 → resolved.** Static Lucide is the default; `lucide-animated` is an
  explicit per-component opt-in gated by a user setting **and**
  `prefers-reduced-motion`. `Icon`'s `animate` prop implements exactly that and
  is off in every component. §3's "reduced motion at the token level" survives
  intact, because no component animates an icon by default.
- **A2 → resolved as a gap.** `--icon-stroke-sm: 1.5px` is flagged, not
  invented locally (gap G1, staged in `musy-foundations-amendments.css`). Icon
  at `size="sm"` is PROVISIONAL until Layer 1 absorbs it.

## A. `[LOCKED]` components whose screen breaks a §4 constraint

### A3 · Logo `[LOCKED]` — the screen has no size system

`[LOCKED]` makes the screen binding for structure and behaviour. The mascot
bitmap appears at 38×40 and 157×167 — both arbitrary layout placements, neither
matching the brief's own `nav 24 / splash 96`. There is no third source to
adjudicate this: the brief's §5.12 sizes are the only stated system, so I built
those and treated the screen sizes as placements rather than tokens.

**Not silently fixed:** if 38×40 is meant to be the nav size, it is off the icon
grid in both axes and needs a variable, because a non-square logo at 38×40 in a
24px nav row will set the row height.

### A4 · Icon `[LOCKED]` — 24px grid vs. the four icon sizes

Layer 1 reproduced Lucide's 24px grid and 2px stroke exactly, and defines four
sizes (16/20/24/32). Only `--icon-size-lg` is the native grid. At 20px and 32px
the stroke scales with the SVG, so the *effective* stroke is 2.4px and 1.5px
respectively — the 16px case is the one that breaks legibility (A2/G1), but the
32px case quietly goes **thinner** than the design intent.

Not resolved: fixing it properly means stroke-per-size (four tokens), which is a
larger change to a locked section than Decision 2 authorised. Flagging so the
decision is made once rather than twice.

## B. Places the §3 precedence order had to be applied

### B8 · Brief vs. brief — CTA Button's default target

§2, Decision 4 says "`--target-comfort` default, `--target-guided` available as
a variant". §5.4 says "Default target `--target-primary` (44px);
`--target-guided` (64px) available as a size variant".

Both are "this brief", so the precedence table does not separate them. I applied
**the more specific statement about the component** and shipped
`--target-primary` as CTA Button's default, with `comfort` and `guided` as
variants. Radio Group *rows* do default to `--target-comfort`, which is where
Decision 4's intent lands more naturally — they are the most-tapped control in
onboarding.

If Decision 4 meant every primary action to be 56px by default, this is a
one-line change and every CTA in the app gets taller. Your call.

### B9 · Hard constraint over the brief — Message's `role="alert"` default

§5.10 says the error variant "should default to `role="alert"` or
`aria-live="assertive"`", and then names the exact reason not to: a message that
renders statically in markup announces on load.

I did not ship the default. `live` is an explicit prop defaulting to `'off'`;
both Radio Groups pass `live="assertive"` themselves, because there the message
is provably injected after validation. A false alert on every page load is a
4.1.3 problem and it teaches users to ignore alerts, which is worse than a
missed announcement.

This becomes moot the moment you confirm no error ever renders statically — see
open question 16.

### B10 · Layer 1's API rule vs. a missing token — `--sand-8`

Layer 1 states raw primitives are implementation detail and Layer 2 is the API.
The secondary button's hover state needs the neutral border's *hover* step, and
no semantic alias exposes it. I referenced `--sand-8` directly rather than
writing a local hex.

It is the only raw-primitive reference in the pass. Gap G3 proposes two possible
names and does **not** stage either, because the naming choice is yours.

### B11 · APG over the Figma screen — Radio Group as `fieldset`, not a card grid

The screens draw the option cards with no group container, no legend, and the
heading text as a sibling `<span>`. The APG radiogroup pattern needs a group
with an accessible name. §4 requires the named pattern, and hard constraints
outrank screens, so the heading became a real `<legend>` inside a `<fieldset>`.

Visually identical; structurally required. Noted because it changes the DOM the
screens imply.

### B12 · Judgement — the accent placeholders are still meaningless

Decision 3 keeps `placeholder1` / `placeholder2` verbatim, which I have done.
The consequence, now that components exist: **three components take an accent
prop and nothing in the system says when to use which.** Switch, Radio Group
(text) and Radio Group (image) all accept all three, so an implementer picks by
taste — which is exactly the drift a design system exists to prevent.

Not a conflict with a source; a conflict with the system's own purpose. It stops
being a problem the moment open question 7 is answered.

### B13 · Judgement — `--target-min` (24px) is a trap in an API

Layer 1 documents 24px as "absolute floor; inline controls inside prose only".
Exposing it as `size="min"` on Icon Button makes it one dropdown value away from
being used in a toolbar, where 2.5.8's spacing exception would not hold.

I shipped it with a mandatory `--sp-2` margin baked into the class, so the
spacing exception applies wherever it lands. That is a mitigation, not a fix.
The alternative is removing the variant and handling inline-in-prose as a
one-off. Flagging rather than deciding.


## Layer 2 — round 2

### B14 · §8.1 satisfied — the native-element draft is withdrawn

The first draft of this pass built the twelve components on native elements with
base-ui's data attributes pre-wired in the CSS, and flagged the gap as open
question 22 rather than claiming compliance. You resolved it: **migrate all**.
Done — every component now imports a base-ui primitive, and `package.json`
declares the dependency.

The migration paid for itself in one place regardless of the brief: Icon
Button's tooltip was hand-rolled CSS, absolutely positioned inside the button.
It clipped inside any scroll container and could not flip near a viewport edge.
That was a genuine defect in the native draft, and base-ui's `Tooltip` fixes it
outright.

**One honesty note on verification.** I read the official docs for
`Switch`, `Radio`/`RadioGroup`, `Fieldset` and the package/setup conventions
directly, so those APIs are confirmed against `@base-ui/react` 1.7. I ran out of
documentation fetches before reading `Toggle`, `Tooltip` and `Button` in full, so
those three are written from base-ui's consistent part-naming pattern
(Root/Trigger/Portal/Positioner/Popup, `pressed`/`onPressedChange`) rather than
from a verified page. They are the three simplest APIs in the set and I expect
them correct, but **treat them as unverified until the first `pnpm install`
type-checks** — see open question 23.


## Layer 3 — conflict report (continues the B numbering)

### B18 · Naming collision — "Layer 3" already meant a token tier

Pass 1 called the token *tiers* Layer 1 / 2 / 3 — raw, semantic, dimension —
and `docs/README.md` closed with "consume only Layer 2 (semantic) and Layer 3
(dimension)". Layer 3 now also names the layout layer, and the two readings
point at different things: under the old one, "Layer 3" is a set of `--sp-*` and
`--radius-*` tokens; under the new one it is fifteen layout rules.

**Resolved, not deferred.** The tiers are called **tiers** throughout, and
"Layer" means foundations, components or layout. `README.md` is updated; the
token files never used the word, so nothing in `tokens/` changed. Raised here
rather than reconciled silently because [`10-layout.md`](10-layout.md) arrived
assuming "Layer 3" was free, and it was not.

### B19 · `10-layout.md` L1 vs. the package's app-shell split

L1 puts `isolation: isolate` and `data-theme` on the **screen root** and says
`body { position: relative }` and `<MusyTooltipProvider>` "belong to the app,
not to the screen". Open questions 24–25 say the same two lines belong to the
app shell and asked someone to own them — still unanswered. So the rule and the
open question agree on the division of labour and neither confirms who has done
it. Filed as-is; the answer to 24–25 settles both at once.

### B20 · `--space-section-lg` cannot be a token in a media query

L2 is explicit about this and prescribes the workaround the package already
uses: write the literal, name the token in a comment. Recorded as a conflict
because it is a **standing** exception to Layer 1's token-only rule, not a
one-off — every screen with page-level sections hits it. The clean fix is a
Layer 1 amendment (`--space-section` becoming fluid via `clamp()`), which
would remove the exception entirely and is open question 29.

### B21 · §7.24's number was assigned twice, and upstream wins

Segmented Control was added in the previous pass at §7.16 — already Field's —
and moved to §7.24. This pass the handoff assigns §7.24 to Draggable List, a
decision made before Segmented Control existed here. Draggable List keeps it and
Segmented Control moved again, to §7.25.

**The rule this settles, since it has now bitten twice:** a number the handoff
assigns is decided, and a component added locally renumbers around it. Recorded
so the next local addition takes the next free number rather than the next
obvious one.

### B22 · §7.24 needs a hook, which the system had no place for

L5 prescribes `useCoarsePointer()` and the released package shipped no hooks at
all — every previous component is a `.tsx` and a stylesheet section. The choice
was a hook in `components/`, or the rule staying a deviation on every screen
with a card.

I shipped `components/useCoarsePointer.ts`, because the alternative is worse
than a new file type: the pointer decision has to reach **React**, not just CSS,
since it also sizes §7.24's float spacer — and a spacer that disagrees with the
cluster it reserves room for is the one L4 failure that is invisible at the
container level. Raised rather than assumed: if the package would rather not
carry hooks, the fallback is a `data-pointer` attribute on the app root and a
CSS-only spacer, which costs the React-side value and the guarantee with it.

### B23 · L8's dense-list exception vs. a list the user edits

L8 permits an item of 80 characters or fewer to drop to `body-sm`, and §7.24's
spec inherits it. Both were measured on the transcript workspace, where the list
is produced by speech and then **read**.

In a list the user **merges**, the exception has a cost neither document
anticipated: combining two short items crosses the threshold, so the merged text
renders one step **larger** than either input. The content did not change — only
its container did — and the size change reads as a defect. Reported as exactly
that.

**Resolved by applying the exception's SIZE unconditionally, rather than its
rule per item.** `dense` defaults to `false` and every item takes `body-sm`,
so the density L8 was reaching for survives and a merge changes the text and
nothing else. The per-item rule remains available for a read-only list, where it
was measured and where it holds.

The second-order consequence, stated because it is the part that needs a
decision and not just a note: **every item is now 15px**, below Layer 1 §4's
17px floor. §4 permits `body-sm` outside essential prose, and L8 already
judged a scannable list item to be outside it — so the justification is L8's
own, unchanged. What this drops is the *length-tracking* half of the rule, which
is the half that broke. If §4's floor is meant to cover a transcript the user
is editing, then `body-sm` is wrong here and the answer is `body-md` for every
item, which is a one-line change to `itemTypeStep`.

Raised rather than reconciled because it makes **§7.24 depart from L8 in its
default state**, which is the one thing this pass was told not to do quietly.
Two things follow from it:

- **L8 should say which kind of list it means.** As written it reads as
  unconditional; the evidence behind it is a list that is only read.
- It strengthens **open question 28**, which already flagged the 80-character
  threshold as the rule most likely to be challenged in an accessibility review
  and the one number in Layer 3 that is not a token. A rule whose visible
  behaviour is "editing your content changes its size" is a second reason to
  revisit it.

### B24 · §7.17's ring-free markers vs. its own 1.4.1 argument

§17's stylesheet used to carry a comment explaining why every wizard marker
needed a border: `--interactive-*-subtle` measures ~1.2:1 against the panel, so
without one a **reachable** step and a **locked** step would differ by numeral
colour alone.

The stepper was lightened in review — rings off `selected` (a solid fill is the
cue), off `completed` (the check glyph is), and then off `active` as well. The
first two cost nothing. The third spends the argument above.

**What is left as the distinction:** the active marker has the accent's subtle
fill and the locked one has none, and the numeral steps from accent ink to
`--on-surface-disabled`. That is fill-presence **plus** ink rather than hue
alone, so it is not a bare 1.4.1 failure — but the fill half is a 1.2:1 cue,
which in bright light is close to no cue, and a sighted user is effectively
reading the numeral colour.

**Not a blocker, and here is why.** The step's name and its state word reach
assistive tech unchanged; locked steps are not focusable, so nothing is
unreachable or mis-announced; and `prefers-contrast: more` restores a visible
edge on every marker, using Layer 1's own promotion of `--border-subtle` to
`--sand-edge` rather than a second decision.

**Raised because the trade is real.** If a locked-vs-reachable distinction has
to survive daylight on a phone, the honest fix is not the ring coming back — it
is giving **disabled** a shape cue of its own, so the light run is kept and the
weak state is the one that changes. A dashed edge on locked markers only, or
dropping the numeral for a dot, would both do it. Designer's call.

### B25 · Lighter selection boundaries vs. the three-cue rule

§06, §07, §13 and §15 each documented selection as **three cues** — a tinted
fill, a step from `--border-width-regular` to `--border-width-thick`, and a
check glyph (or, in §15, an ink step) — with the stated reason that stripping
the hue must leave the state readable (1.4.1).

Reviewed and lightened: the boundary now takes the element's own background, so
it is present in the box model and invisible in the picture. That spends the
**border-weight** cue in all four, and the constant width that replaced it
removes the half-pixel geometry change too.

**What still carries selection.** §06, §07 and §13 keep the tinted fill *and*
the check glyph — the glyph is a shape cue, so those three still satisfy 1.4.1
on their own terms. **§15 Segmented Control is the weak one**: it is left with a
lifted fill and an ink step, both of which are luminance, and it has no glyph to
fall back on. A selected segment and an unselected one now differ by fill
lightness alone in greyscale.

**Mitigations already in place.** `prefers-contrast: more` restores both the
resting and the selected edge on all four, using Layer 1's promotion of
`--border-subtle`; forced-colours mode is unaffected, since it repaints borders
to `CanvasText` regardless; and invalid and disabled states keep their edges,
because an error boundary is the non-colour half of "this is wrong" and a
disabled control has no fill change to fall back on.

**The open item.** If §15 needs to survive greyscale, the honest fix is a shape
cue of its own rather than the edge coming back — the selected segment could
carry a check, or the icon could switch from outline to filled. Both keep the
lighter run. Raised rather than decided: it is the third cue this pass has
spent for lightness (see also B23 and B24), and the pattern is worth a decision
in one place rather than three.
