# OPEN-QUESTIONS.md

Append-only. One entry per question, including ones resolved confidently.
An empty log would be a failure signal.

Format:

```
## ComponentName — the question in one line
Where: file and line
What I checked: which level, and what each said
What I did: the choice
Why: one sentence
What I need from Ben: the decision, or "nothing, just flagging"
```

---

# Step 1 — groundwork

## Storybook config — stories written to `stories/` are NOT indexed
Where: `.storybook/main.ts:22-25`
What I checked: Level 1, the config itself. The glob is
`['../stories/**/*.mdx', '../src/**/*.stories.tsx']`. Verified with picomatch,
the matcher Storybook uses: `stories/Icon.stories.tsx` matches **neither**
pattern. `src/Badge.stories.tsx` matches, which is why the existing smoke story
appears.
What I did: wrote the stories to `stories/` exactly as the brief instructs, and
did not touch the config, which the brief forbids absolutely.
Why: both instructions are explicit and they conflict; the conservative move is
to obey both and surface the consequence rather than silently edit config.
What I need from Ben: **one line in `.storybook/main.ts`** — add
`'../stories/**/*.stories.tsx'` to the `stories` array. Until then none of this
session's ~28 story files appear in Storybook. This is the first thing to fix.
Everything else in this log is secondary to it.

## Session — the prototype path in the brief does not exist
Where: brief, "read reference/musie_mvp_0.3.html"
What I checked: Level 1, the filesystem. No such file. The prototype is
`reference/design_system/Musy MVP 0.3.dc.html`, 175,635 bytes.
What I did: used the real file, read it once, reduced it to
`stories/PROTOTYPE-USAGE.md`.
Why: it is unambiguously the same artefact — same screens, same class names.
What I need from Ben: nothing, just flagging.

## VoiceNote, Message, Badge, BadgeRow — described as deleted, but all still present
Where: `src/VoiceNote.tsx`, `src/Message.tsx`, `src/Badge.tsx`, `src/index.ts`
What I checked: Level 1. All three files exist. `index.ts` exports `VoiceNote`,
`Message`, `Badge` **and** `BadgeRow`. `src/Badge.stories.tsx` also still exists
from an earlier session. `Message` is imported and rendered by
`RadioGroupText.tsx`, `RadioGroupImage.tsx` and `RadioCards.tsx` for their
`error` prop, so it is not merely present — it is a live dependency of three
components in Batch C.
What I did: wrote no stories for any of the four, per the hard rule. Left every
file untouched, including the pre-existing `src/Badge.stories.tsx`, since
deleting outside `stories/` is forbidden.
Why: the hard rule is absolute regardless of what the tree contains.
What I need from Ben: **a decision.** Either they were never deleted, or the
deletion is pending. As it stands three Batch C components cannot render their
own error state without `Message`, so "deleted" cannot be literally true yet.

## Logo — the wordmark says "Musie", the component default says "Musy"
Where: `src/Logo.tsx:38` (`alt = 'Musy'`) vs prototype NAVBAR and DRAWER
What I checked: Level 1 says the default `alt` is `'Musy'`. Level 2, the
prototype, renders the wordmark text **"Musie"** in both places, and the repo,
the app and the product copy all say "Musie". The design system package is named
`musy-design-system` and every CSS class is `musy-`.
What I did: nothing. Stories use the component's default.
Why: changing a default is a design decision, which is out of scope.
What I need from Ben: **a decision.** "Musy" looks like the system's name and
"Musie" the product's, but the Logo's `alt` is user-facing product copy, so the
default is probably wrong.

## ButtonGroup — the default `align` contradicts layout rule L6
Where: `src/ButtonGroup.tsx:26` (`align = 'start'`)
What I checked: Level 1, the component defaults to `start`. Level 2, the
prototype uses the component twice and passes `end` and `center` — **never**
the default. Level 3, `docs/10-layout.md` L6: "A primary CTA is right-aligned to
its parent. A Continue button always is."
What I did: nothing. `Default` story shows `align="start"` as declared.
Why: the default is the component's, and stories document what is, not what
should be.
What I need from Ben: **a decision.** The component you reach for to lay out a
Continue button left-aligns it unless you remember to override. Note
`DraggableList`, built per L6, avoids `ButtonGroup` entirely and hand-writes
`musy-dlist__actions--end`.

## Session — prototype copy is English, several components default to German
Where: `IconButton.loadingLabel = 'Wird geladen'`, `CtaButton` the same,
`RadioGroupText/Image/Cards.emptyLabel = 'Keine Optionen verfügbar'`,
`Lightbox.closeLabel = 'Schließen'`, `Toast`/`Message.dismissLabel =
'Meldung schließen'`, `ContentList.emptyLabel = 'Noch keine Einträge'`,
`ProcessVisualisation.ordinalPrefix = 'Schritt'`
What I checked: Level 1, those are the declared defaults. Level 2, the prototype
is English throughout and sets `lang="en"` on its root. Level 3,
`docs/07-components.md:46` makes `<html lang="de">` an integration requirement
and calls the app German-primary.
What I did: stories show the component's own default, German where it is German.
Prototype copy is used only where the prototype supplies it.
Why: the default is the component's; overriding it in a story would hide the
inconsistency rather than document it.
What I need from Ben: **a decision on the primary language.** The later
components (DraggableList, PhotoUpload, VoiceNote, MusicPlayer, RecordButton,
InteractiveWizard) default to English and say so in their comments; the earlier
ones default to German and say so. The two halves of the system disagree.

## Session — no CLAUDE.md exists
Where: repo root, every subdirectory, and `~/.claude/`
What I checked: Level 1. `find . -iname CLAUDE.md` returns nothing, in this and
four previous sessions.
What I did: proceeded without one.
Why: there is nothing to follow.
What I need from Ben: nothing, just flagging — the brief has opened with "read
CLAUDE.md first" five sessions running.

---

# Step 2 — batches A to D

<!-- agents append below this line -->

## Batch A

_Icon, ButtonGroup, Hint, Logo, ContentBox, ContentList — written 2026-09-17.
Every entry below is repeated verbatim in its component's Build notes block._

## Icon — `glyph` is required even when `render` replaces the rendered element
Where: src/Icon.tsx:25 and src/Icon.tsx:58 (`render: render ?? <Glyph />`)
What I checked: Level 1, the source. `glyph` is non-optional on IconProps, but
when `render` is passed the Glyph component is never used. Level 3, §7.1 lists
`glyph` as required and never mentions its interaction with `render`.
What I did: wrote no story for `render`, and kept `glyph` in the meta args so
every story has one.
Why: a story for `render` would have to pass a `glyph` it does not use, which
documents a contradiction rather than a component.
What I need from Ben: nothing, just flagging — `glyph` could be optional when
`render` is given, but that is an API change, not a story.

## Icon — `animate` has no visible effect in a static story
Where: src/Icon.tsx:39, src/musy-components.css:136
What I checked: Level 1. `animate` only sets `data-animate="on"`; the CSS rule
it enables adds a `transition`, and §7.1 says there is no animated default
anywhere in the system.
What I did: shipped an `Animated` story that shows the flag being set, and said
in its description that the difference is a transition between two states.
Why: the prop is public and has to appear somewhere, but a story cannot show
motion that only exists while something else changes.
What I need from Ben: nothing, just flagging.

## Icon — no `tone` is used anywhere in the prototype
Where: stories/PROTOTYPE-USAGE.md, the Icon table
What I checked: Level 2 says every icon inherits its colour from its container
and no tone is ever set. Level 3, §7.1 declares eight tones and says all of
them clear 3:1.
What I did: shipped a `Tones` story covering all eight, and kept `inherit` for
the `Default` story.
Why: the brief asks for every tone the component declares; the prototype's
silence is not evidence that a tone is wrong.
What I need from Ben: nothing, just flagging — seven of the eight tones are
currently used by no screen at all.

## Icon — the `sm` stroke is PROVISIONAL (token gap G1)
Where: src/Icon.tsx:11, src/musy-components.css:112-114,
tokens/musy-foundations-amendments.css:33
What I checked: Level 1. `--icon-stroke-sm: 1.5px` lives in the amendments
sheet, not in Layer 1, and both the component header and the CSS say so.
What I did: nothing beyond covering `sm` in the `Sizes` story.
Why: G1 is a Layer 1 decision and absorbing it is not a story's job.
What I need from Ben: nothing, just flagging — G1 is already tracked.

## ButtonGroup — the stacked state cannot be shown by any story
Where: src/musy-components.css:3666 (`@media (max-width: 767.98px)`)
What I checked: Level 1. The stacking rule is a VIEWPORT media query, not a
container query, so it answers to the Storybook preview iframe and not to the
pane the story renders in. `fixedWidth()` in stories/_decorators.tsx narrows
the container and therefore changes nothing here.
What I did: used `bothThemes` and documented the rule in prose; the `Stacked`
state has no story.
Why: the only honest way to show it is to resize the preview, and adding a
viewport addon would be a config change, which is out of scope.
What I need from Ben: nothing, just flagging — but note that the component's
one and only responsibility is the state its stories cannot show.

## ButtonGroup — the default `align` contradicts layout rule L6
Where: src/ButtonGroup.tsx:26 (`align = 'start'`)
What I checked: Level 1, the component defaults to `start`. Level 2, the
prototype uses the component twice and passes `end` and `center` — never the
default. Level 3, docs/10-layout.md L6: "A primary CTA is right-aligned to its
parent. A Continue button always is."
What I did: nothing. The `Default` story shows `align="start"` as declared.
Why: the default is the component's, and stories document what is, not what
should be. This repeats the Step 1 entry rather than replacing it.
What I need from Ben: **a decision.** Every real use overrides the default.

## ButtonGroup — "2–3 actions" is documented but not enforced anywhere
Where: src/ButtonGroup.tsx:19-24, docs/07-components.md §7.4a anatomy
What I checked: Level 1. `children` is a bare ReactNode: there is no count
prop, no runtime check and no development warning. Level 3 states 2–3 in both
the purpose line and the anatomy block. SegmentedControl, by contrast, warns
in development when it is given more than four options.
What I did: covered two and three actions, and added a `FourActions` story
showing what the component currently allows.
Why: the story documents the real surface; adding a warning would be a
component change.
What I need from Ben: **a decision.** Either 2–3 is a real constraint and the
component should say so the way SegmentedControl does, or the docs should stop
asserting it.

## ButtonGroup — no rest-prop passthrough
Where: src/ButtonGroup.tsx:19-24
What I checked: Level 1. The props are `children`, `align`, `className` and
nothing else — no `...rest`, no `render`. Most of the set (Icon, Logo,
ContentBox) takes base-ui's `render`; this one does not.
What I did: nothing. No story needs it.
Why: it is an API observation, not a blocker for this component.
What I need from Ben: nothing, just flagging — an `id` or a `data-*` hook on
the row is currently impossible without wrapping it in another element.

## Hint — the bubble cannot be shown in a story, only hovered
Where: src/musy-components.css:334-335, src/Hint.tsx:22-28
What I checked: Level 1. The bubble is revealed by
`@media (hover: hover) and (pointer: fine) { .musy-tip:hover > … }`, with a
second selector `.musy-tip[data-force~="hover"]` that exists precisely to
force it open. The component accepts `text`, `children` and `className` and
nothing else, so a story cannot set `data-force` — and `className` cannot,
because the hook is an attribute selector, not a class.
What I did: shipped the states as they are and said in each story description
that the reviewer has to hover. No story shows the open bubble.
Why: setting the attribute would mean wrapping or cloning the element, which
is a component change; the alternative is a story that silently documents
nothing.
What I need from Ben: **a decision.** `data-force` is already in the
stylesheet; a `className`-independent way to reach it (a passthrough, or
honouring `data-force` as a prop) would make this component reviewable.

## Hint — the text is announced twice if its children are already named
Where: src/Hint.tsx:33-35
What I checked: Level 1. Hint always renders the string twice: once as
`.musy-sr-only` for AT and once in the aria-hidden bubble. That is correct
when the children are decorative. Level 2, the prototype always wraps a bare
glyph. Level 3, §7.24 says the bubble is "never the only copy" but never says
the children must be decorative.
What I did: every story passes a decorative Icon (no `label`), matching the
prototype.
Why: an Icon with a `label` inside a Hint would announce the fact and then the
hint text, which is the double announcement §7.15 explicitly avoids elsewhere.
What I need from Ben: nothing, just flagging — worth one sentence in §7.24 so
the constraint is written down.

## Hint — `children` is required but is not typed as required content
Where: src/Hint.tsx:26
What I checked: Level 1. `children: React.ReactNode` accepts `undefined`, so
`<Hint text="…" />` typechecks and renders a bubble attached to nothing.
What I did: did not write a story for it; every story passes a glyph.
Why: an empty trigger is not a state the component is meant to have, and a
story for it would read as permission.
What I need from Ben: nothing, just flagging.

## Hint — docs section 7.24 is used twice
Where: docs/07-components.md:817 ("## 7.24 Draggable List") and
docs/07-components.md:1381 ("## 7.24 Hint"); src/Hint.tsx:2 claims "§7.24"
What I checked: Level 3. Two different components carry the same section
number, and src/index.ts:71 refers to "§7.24's float spacer", which is the
Draggable List reading, while Hint.tsx's own header says §7.24 as well.
What I did: cited §7.24 in Hint's docs text, since that is what the component
header claims.
Why: the component source is the authority on itself.
What I need from Ben: **a renumbering.** One of the two sections is wrong, and
any cross-reference to §7.24 is currently ambiguous.

## Logo — the wordmark says "Musie", the component default says "Musy"
Where: src/Logo.tsx:37 (`alt = 'Musy'`) vs the prototype NAVBAR and DRAWER
What I checked: Level 1 says the default `alt` is `'Musy'`. Level 2, the
prototype renders the wordmark text **"Musie"** in both places, and the repo,
the app and the product copy all say "Musie". The package is named
`musy-design-system` and every CSS class is `musy-`.
What I did: nothing. Stories use the component's default, so `WithWordmark`
reads "Musy" and not the prototype's "Musie".
Why: changing a default is a design decision, which is out of scope. This
repeats the Step 1 entry rather than replacing it.
What I need from Ben: **a decision.** "Musy" looks like the system's name and
"Musie" the product's, but the Logo's `alt` is user-facing product copy, so
the default is probably wrong.

## Logo — the documented default `src` is not the implemented one
Where: src/Logo.tsx:38 (`'/assets/web/musy-logo.png'`) vs
docs/07-components.md §7.15 props table (`'/assets/musy-logo.png'`)
What I checked: Level 1, the source, says `/assets/web/musy-logo.png`. Level 3,
the docs table, says `/assets/musy-logo.png`. Both files exist under
packages/design-system/assets/, and .storybook/main.ts maps `../assets` to
`/assets` specifically so the source's path resolves.
What I did: used the component default, so every story renders the web
rendition.
Why: the source is Level 1 and the Storybook static mapping was written for it.
What I need from Ben: **a decision** — one line of the docs table is stale, or
two renditions are both shipping and only one is meant to.

## Logo — `showWordmark` with `alt=""` leaves the logo with no name at all
Where: src/Logo.tsx:40 and src/Logo.tsx:53
What I checked: Level 1. `named = showWordmark ? '' : alt`, and the wordmark
span renders `{alt}`. With `showWordmark` and `alt=""` the mark is aria-hidden
AND the wordmark is an empty span: nothing visible, nothing announced. Level 3,
§7.15 says to set `alt` to `''` "only when adjacent text already names it",
which is exactly the combination that breaks.
What I did: wrote a `NamedByAdjacentText` story for `alt=""` WITHOUT
`showWordmark`, which is the legal reading, and no story for the broken pair.
Why: the docs sentence and the wordmark prop overlap, and only one of the two
readings produces a named logo.
What I need from Ben: **a decision.** Either `alt` should keep naming the mark
when a wordmark is shown, or the wordmark should take its own string.

## Logo — `alt` is doing two jobs: the accessible name and the wordmark text
Where: src/Logo.tsx:28-29, 53
What I checked: Level 1. There is one string prop and it is rendered as visible
copy when `showWordmark` is set, and as an alt attribute when it is not. Level
3, §7.15 documents it only as "Accessible name".
What I did: nothing.
Why: it is the same word in both jobs today, so nothing is visibly wrong.
What I need from Ben: nothing, just flagging — it is the reason the "Musy" /
"Musie" question above cannot be answered per-call without also changing the
visible wordmark.

## ContentBox — framed with no `children` renders an empty padded body
Where: src/ContentBox.tsx:73 and 87-89
What I checked: Level 1. `body` is `children && <div class="musy-box__slot">…`,
but in the framed branch it is placed inside an unconditional
`<div class="musy-box__body">`, which the CSS gives `--space-inset-card` of
padding. So `header` without `children` draws the hairline and then an empty
24px band. The unframed branch has no such problem: `body` is simply absent.
What I did: shipped `FramedWithoutChildren` so the behaviour is visible, and
gave every other framed story real children.
Why: the framed variant is described as "header, hairline, body", and a body
with nothing in it is the state the description does not cover.
What I need from Ben: **a decision.** Either the body region should collapse
when there are no children, or framed should require them.

## ContentBox — `outline="plain"` also removes the padding
Where: src/musy-components.css:1346
What I checked: Level 1. `.musy-box--plain` sets `padding: 0` along with the
transparent border and fill. Level 3, §7.9 describes the outline prop only as
an edge treatment and its Responsive section says `--space-inset-card` (24px)
is constant — which is not true for `plain`.
What I did: shipped `Outlines` covering all four, so the padding difference is
visible side by side.
Why: it is real behaviour and the story documents what is.
What I need from Ben: nothing, just flagging — §7.9's "constant" sentence
needs the `plain` exception, or `plain` needs its padding back.

## ContentBox — `outline="dashed"` is PROVISIONAL and used by nothing
Where: src/ContentBox.tsx:20, src/musy-components.css:1340-1344
What I checked: Level 1 flags G2 in the component header and again in the CSS.
Level 2 says `outline="dashed"` never appears in the prototype, and
PROTOTYPE-USAGE.md lists it among the things with no prototype usage at all.
Level 3 gives it a meaning ("provisional / awaiting content") and a rule (never
on an interactive boundary).
What I did: covered it in `Outlines` and gave it its own story with the docs'
own meaning in the description.
Why: the brief asks for every variant the component declares.
What I need from Ben: nothing, just flagging — G2 and G2b are already tracked.

## ContentBox — `headlineHidden` silently drops `headlineStep`
Where: src/ContentBox.tsx:68-69
What I checked: Level 1. When `headlineHidden` is set, `data-type-step` is
`undefined` and the class becomes `.musy-sr-only`. Level 3, §7.9 states this
deliberately ("moves it to .musy-sr-only and drops its type step").
What I did: nothing — resolved, and the two agree. `HeadlineHidden` passes no
`headlineStep` so the story does not imply one is honoured.
Why: source and docs say the same thing; logging it only so the next reader
does not re-derive it.
What I need from Ben: nothing, just flagging.

## ContentBox — `stage` is a type step the prototype uses for BODY text
Where: stories/PROTOTYPE-USAGE.md, ContentBox table; src/ContentBox.tsx:25-30
What I checked: Level 1 declares `stage` among the eleven steps with no note
on where it belongs. Level 2 says the opening ONBOARDING box uses `stage` as a
`textStep`, between a `display-lg` headline and `body-lg`.
What I did: shipped `TypeSteps` using the prototype's own pairing — headline
`display-lg`, text `stage`.
Why: Level 2 is the authority on intent, and it is unambiguous here.
What I need from Ben: nothing, just flagging — `stage` reads like a heading
step by name and is used as a body step in the one place it appears.

## ContentList — the prototype's `aria-live="polite"` cannot be expressed
Where: src/ContentList.tsx:34-41 vs stories/PROTOTYPE-USAGE.md, ContentList
table (METHOD FLOW · listen, "Track details", `aria-live="polite"`)
What I checked: Level 1. The props are `label`, `items`, `contentStep`,
`emptyLabel` and `className` — no `...rest`, no `render`, and the `<dl>` is not
given any live-region attribute. Level 2 shows the Listen step's list
announcing itself as the track changes, which is the only place in the
prototype where a ContentList updates in place.
What I did: shipped `TrackDetails` as a plain list and said in its description
that the prototype marks it polite. No story can add the attribute.
Why: adding a prop is a component change, and wrapping the list in a live
region from a story would document something the component does not do.
What I need from Ben: **a decision.** Either a `live` prop (Message and Toast
already have one) or an explicit note that the consuming app wraps it.

## ContentList — the empty state loses the list's accessible name
Where: src/ContentList.tsx:47-49
What I checked: Level 1. `items: []` returns
`<p class="musy-clist__empty">{emptyLabel}</p>` — `label` is not rendered at
all in that branch, so the name that told the user WHICH list is empty is
gone exactly when the content is. Level 3, §7.11 documents the empty branch
but not the dropped label.
What I did: shipped `Empty` and `EmptyWithLabel` (the same `label`, still not
rendered) so the behaviour is visible.
Why: it is real behaviour, and the story documents what is.
What I need from Ben: **a decision.** "Noch keine Einträge" on its own does
not say what has no entries.

## ContentList — `emptyLabel` defaults to German in an English prototype
Where: src/ContentList.tsx:45 (`emptyLabel = 'Noch keine Einträge'`)
What I checked: Level 1, that is the declared default. Level 2, the prototype
is English throughout and sets `lang="en"` on its root. Level 3,
docs/07-components.md:46 makes `<html lang="de">` an integration requirement.
What I did: the `Empty` story shows the component's own German default,
unchanged.
Why: overriding it in a story would hide the inconsistency rather than
document it. This repeats the Step 1 session entry rather than replacing it.
What I need from Ben: **a decision on the primary language.**

## ContentList — `aria-label` on a bare `<dl>` may not be exposed
Where: src/ContentList.tsx:51
What I checked: Level 1. The label is applied as `aria-label` to the `<dl>`.
Level 3, §7.11 calls it "Accessible name for the list" and the a11y note
covers the `dt`/`dd` wrapper divs but not the labelling. `<dl>` has no
implicit ARIA role in HTML-AAM, and `aria-label` on a role-less element is not
reliably exposed.
What I did: nothing — every story passes `label`, as the prototype does.
Why: I cannot test AT from here, and changing the element or adding
`role="list"` would be a component change.
What I need from Ben: **a check with a real screen reader**, and if it does
not announce, either a `role` or a visible heading above the list.

## ContentList — rows are keyed by array index
Where: src/ContentList.tsx:52 (`key={i}`), and the same for the nested lists
What I checked: Level 1 only. Nothing in §7.11 promises a stable identity, and
the component is not interactive, so nothing here holds state across a
reorder.
What I did: nothing.
Why: harmless for a static list; worth a line only because a consumer that
animates or reorders rows would be surprised.
What I need from Ben: nothing, just flagging.

## Batch C

_Composites: RadioGroupText, RadioGroupImage, RadioCards, InteractiveWizard,
Lightbox. Each entry is mirrored verbatim into that component's Build notes
block._

## RadioGroupText — the prototype records no legend for its situations group
Where: PROTOTYPE-USAGE.md, "RadioGroupText — 4 usages", rows ABOUT YOU and
METHOD RECOMMENDATION
What I checked: Level 2. The reduction lists the three option labels verbatim
but writes the legend as "(situations)". Rows 3 and 4 (SETTINGS) DO carry
verbatim legends — "Here as" with the hint "Musie uses this to narrow down the
Methods it offers you." — and row 3 lists no options, which reads as the same
three.
What I did: used the SETTINGS pair verbatim — legend "Here as", that hint, and
the three situation options — as the meta args. `legend` is required, so a
story cannot omit it.
Why: every string is then the prototype’s own; nothing is authored here.
What I need from Ben: nothing, just flagging — confirm the ABOUT YOU legend if
this group is ever documented as a screen rather than as a component.

## RadioGroupText — the docs anatomy shows an input + label, the component renders a button
Where: `src/RadioGroupText.tsx:97-104` vs docs/07-components.md §7.6 Anatomy
What I checked: Level 1, the source: `Radio.Root` with `nativeButton` and
`render={<button type="button" />}`, className `musy-radio__body`. Level 3, the
docs anatomy block: `div.musy-radio` wrapping `input.musy-radio__input` +
`label.musy-radio__body`. The state matrix then says focus-visible comes "from
`:focus-visible` on the input". There is no input.
What I did: wrote the stories against the source and described the behaviour,
not the anatomy.
Why: Level 1 is the authority on the API.
What I need from Ben: nothing to decide, but §7.6’s anatomy and state matrix
are stale and will mislead the next reader.

## RadioGroupText — the empty state is not associated with the group
Where: `src/RadioGroupText.tsx:93-95`
What I checked: Level 1. When `options` is empty the component renders
`<p className="musy-radio-group__hint">{emptyLabel}</p>` with no `id`, and
`aria-describedby` on the RadioGroup only ever lists the `hint` and `error`
ids. So the empty message is visible text inside the fieldset but is not part
of the group’s description, and it borrows the hint’s styling.
What I did: wrote the `Empty` story and left the behaviour alone.
Why: this is a component change, not a story change.
What I need from Ben: **a decision** — whether the empty message should be in
`aria-describedby`, and whether it should have its own class rather than
reusing `musy-radio-group__hint`. RadioGroupImage and RadioCards do give theirs
a dedicated class (`__empty`) alongside the hint class; this one does not.

## RadioGroupText — the Empty story shows the German default `emptyLabel`
Where: `src/RadioGroupText.tsx:60` (`emptyLabel = 'Keine Optionen verfügbar'`)
What I checked: Level 1 declares German. Level 2, the prototype, is English
throughout and never reaches an empty group.
What I did: the `Empty` story passes no `emptyLabel`, so the German default is
what shows.
Why: overriding it in a story would hide the inconsistency. This is the
per-component face of the session-level language entry in OPEN-QUESTIONS.md.
What I need from Ben: nothing new — see "Session — prototype copy is English".

## RadioGroupImage — the docs give a viewport breakpoint table, the CSS is container-driven
Where: `src/musy-components.css:889-896` vs docs/07-components.md §7.7
"Responsive behaviour"
What I checked: Level 3, the docs, give a table keyed to Layer 1’s breakpoints:
2 columns at base, 3 at `--bp-md` 768, 4 at `--bp-lg` 1024. Level 1, the CSS,
has no media query at all: `.musy-radio-card-group` is one auto-fit rule,
`repeat(auto-fit, minmax(min(100%, max(--musy-card-min, (100% - 3 gaps) / 4)),
1fr))`, and the comment above it says a viewport-keyed media query "cannot see"
the containers this sits in. The component header agrees with the CSS.
What I did: used `fixedWidth(393)` on the meta and a `Tablet` story at 834, so
the column count in each story is the count that container really produces.
Why: CONVENTIONS §6 says fixedWidth is for a layout that answers to its
container, and this one does, even though it names only RadioCards.
What I need from Ben: nothing to decide — §7.7’s breakpoint table describes an
implementation that no longer exists and should be replaced by the auto-fit
rule. The column counts it promises are not what renders.

## RadioGroupImage — `className` lands on the inner grid, not on the root
Where: `src/RadioGroupImage.tsx:73-79`
What I checked: Level 1. `Fieldset.Root` gets a hardcoded `"musy-radio-group"`
and the consumer’s `className` is appended to the inner
`div.musy-radio-card-group` instead. RadioGroupText, built on the same
primitives, puts `className` on the root. RadioCards behaves like this one.
What I did: no story passes `className`, so nothing is documented that would
later be wrong.
What I need from Ben: **a decision.** Two of the three radio components send
`className` somewhere different from the first, and a consumer cannot tell
which from the prop name. Whichever is right, all three should agree.

## RadioGroupImage — the prototype never uses `disabled`; it routes to a lightbox
Where: PROTOTYPE-USAGE.md, "RadioGroupImage — 1 usage"
What I checked: Level 2. Only `by-myself` is implemented; the other three open
the "Not implemented yet" lightbox rather than being disabled.
What I did: wrote `Disabled` and `OptionDisabled` anyway, as API coverage, and
left the prototype’s own four options unmodified in every other story.
Why: the props exist and the brief asks for those states; the stories document
the component, not the screen.
What I need from Ben: nothing, just flagging — do not read `OptionDisabled` as
a recommendation for the ABOUT YOU screen.

## RadioGroupImage — no `guided`, unlike RadioGroupText
Where: `src/RadioGroupImage.tsx:41-53` (props) vs `src/RadioGroupText.tsx:48`
What I checked: Level 1 confirms the prop is absent. Level 3, §7.7 Props, says
so on purpose: "No `guided` prop: a card’s target is its whole footprint,
already far past 64px."
What I did: no `Guided` story. Documented the reason in the description.
Why: the omission is explained by the docs, so it is a decision, not a gap.
What I need from Ben: nothing, just flagging that the three radio components
have three different prop sets.

## RadioCards — the component header and the CSS disagree about the grid
Where: `src/RadioCards.tsx:16-30` (header comment) vs
`src/musy-components.css:1574-1595` and docs/07-components.md §7.13
What I checked: Level 1, the header comment, says "CARD FLOOR — 196px
(--musy-card-min …), capped at three columns", that the card is "a LIST while
narrow … two-up then three-up as it widens", and that the card’s
list-to-stacked switch is an `@container` query at `--bp-md`. Level 1, the CSS
that actually renders it, says `--musy-rcard-row-min: 480px` and
`repeat(auto-fit, minmax(min(100%, 480px), 1fr))`, with the container query at
480px, not `--bp-md`. Level 3, §7.13, matches the CSS and states the card is a
list row "at every width" and that the group "never" goes three-up; it records
the 196px stacked-card floor as the OLD behaviour that was removed in review.
What I did: wrote the description from the CSS and the docs, kept the parts of
the header comment the CSS still supports (container not viewport, whole card
is the control), and dropped the column numbers entirely rather than repeat
either figure.
Why: the stylesheet is what renders; the header comment was not updated with
the review that changed the rule.
What I need from Ben: **a decision** — the header comment of
`src/RadioCards.tsx` is out of date in three particulars (196px floor, three
columns, `--bp-md` switch) and is the first thing a developer reads.

## RadioCards — the prototype’s three Hint facts have no prop
Where: PROTOTYPE-USAGE.md, "RadioCards — 2 usages" and "Hint — 3 usages"
What I checked: Level 2. Each prototype card carries three Hint-wrapped facts
(duration, "Needs your Mindfulness Cards deck", "Sound on — headphones
recommended") and the group carries a `dl` legend naming the three glyphs.
Level 3, §7.13’s anatomy block, shows `span.musy-rcard__facts` and
`dl.musy-rcard-legend` as part of the component. Level 1: neither exists in
`RadioCards.tsx`. There is no `facts` prop, no `children`, and no slot; the
optional `label` is the only place a fact could go.
What I did: used `label` for the one fact that fits a single meta line — the
duration — and left the other two out.
Why: inventing a prop is out of scope, and putting three sentences in `label`
would misrepresent what the meta line is for.
What I need from Ben: **a decision.** Either the facts row and the glyph legend
are prototype-only markup and §7.13’s anatomy is wrong, or the component is
missing them. As it stands the documented anatomy cannot be produced by the
component’s API.

## RadioCards — only one of the prototype’s two cards has a meta label
Where: PROTOTYPE-USAGE.md, "RadioCards" table
What I checked: Level 2 gives a duration ("2–12 minutes") only for Quick
Mindfulness Break. Nothing is recorded for Breathing Score.
What I did: card one carries `label`, card two does not, in every story.
Why: `label` is optional precisely so "a card with nothing to qualify should
not carry an empty line", and this also shows both shapes in one story.
What I need from Ben: nothing, just flagging that the asymmetry is deliberate.

## RadioCards — `className` lands on the inner grid, not on the root
Where: `src/RadioCards.tsx:118-122`
What I checked: Level 1. `Fieldset.Root` gets a hardcoded `"musy-radio-group"`
and `className` is appended to `div.musy-rcard-group`. RadioGroupImage does the
same; RadioGroupText puts it on the root.
What I did: no story passes `className`.
What I need from Ben: **a decision** — same question as RadioGroupImage. Two of
the three radio components send `className` to a different element than the
first, and nothing in the prop name says so.

## RadioCards — the docs props table omits `disabled`
Where: docs/07-components.md §7.13 Props vs `src/RadioCards.tsx:80`
What I checked: Level 3’s table lists `name`/`legend`, `hint`, `options`,
`value`/`onValueChange`, `accent`, `headingLevel`, the two type steps, `error`
and `emptyLabel` — no `disabled`. Level 1 declares `disabled = false` and
passes it to the RadioGroup, and the state matrix in the same docs section DOES
describe a disabled state.
What I did: wrote the `Disabled` story from the source.
Why: Level 1 is the authority on the API.
What I need from Ben: nothing to decide, but the props table is incomplete.

## InteractiveWizard — `showStateWords`’s doc comment describes the opposite prop
Where: `src/InteractiveWizard.tsx:70-71`
What I checked: Level 1. The comment reads "Hide the state word under each
label." The prop is `showStateWords`, it defaults to `true`, and `true` SHOWS
the word: `{showStateWords && <span className="musy-wizard__hint">…}`. So the
comment describes a `hideStateWords` prop that does not exist. Level 3’s props
table gives the type and default correctly and offers no prose.
What I did: wrote the argTypes description from the behaviour, not from the
comment, and said so here.
Why: CONVENTIONS §4 says the description is the prop’s own doc comment — but
copying this one would document the inverse of what the prop does.
What I need from Ben: **a fix in the source comment** (one line). This is the
only place in Batch C where I could not use a doc comment verbatim.

## InteractiveWizard — state words default ON, and the prototype renders none
Where: `src/InteractiveWizard.tsx:88` vs PROTOTYPE-USAGE.md, "InteractiveWizard"
What I checked: Level 1 defaults `showStateWords = true`. Level 2 says
explicitly: "The prototype does **not** render state words under the labels."
Level 3 lists the default as `true` without comment.
What I did: `Default` shows the component default (words on) and
`StateWordsHidden` shows the prototype’s actual appearance.
Why: stories document what the component does; the default is the component’s.
What I need from Ben: **a decision.** The system’s only consumer turns this off,
which usually means the default is wrong. Note also that the state word is
visible text INSIDE the trigger, so it joins the button’s accessible name —
"Intro done", "Listen current" — and the selected step announces its position
twice, once from the word and once from `aria-current="step"`. Flagging only;
not fixed.

## InteractiveWizard — no whole-component `disabled`, `error` or `emptyLabel`
Where: `src/InteractiveWizard.tsx:60-84` (props)
What I checked: Level 1. The only route to a disabled step is the derived
`disabled` state — a step whose predecessors are unfinished — so a story cannot
disable the run, or one arbitrary step, or the current one. There is also no
validation surface and no empty state: `steps: []` renders `<nav><ol></ol>`,
an empty labelled navigation region with nothing in it and no message. Level 3
documents neither case.
What I did: `StepsLocked` reaches the disabled state the only way the API
allows, and `NoSteps` documents what an empty `steps` array actually renders.
Why: the brief asks for disabled, error and empty states; three of them are not
reachable through this component.
What I need from Ben: **a decision** on the empty case. An empty `<nav>` with an
accessible name is announced as a landmark containing nothing. Every other
list-shaped component in the set takes an `emptyLabel`; this one does not.

## InteractiveWizard — `WizardPanel` is exported from the same file and has no story
Where: `src/InteractiveWizard.tsx:153-174`
What I checked: Level 1 exports `WizardPanel` (`{ children, actions, className }`)
alongside `InteractiveWizard`. Level 2 says the prototype uses it for every step
body, with `musy-wizard__actions` holding the step’s buttons. CONVENTIONS §1
says components exported from one source file get one story file EACH.
What I did: nothing — this session’s brief fixes Batch C at exactly five files,
named after the five components, and creating a sixth is forbidden.
Why: the two instructions conflict and the file-count rule is the explicit one.
What I need from Ben: **`WizardPanel` needs a story file** in the next pass. It
is currently the only exported component in Batch C with no documentation at
all.

## InteractiveWizard — which accent a screen should use is undefined
Where: `src/InteractiveWizard.tsx:76-82` (the prop’s own doc comment)
What I checked: Level 1 says so itself: "Which of the three a screen should use
is still undefined — conflict B12, open question 7." Level 2 records one usage,
`accent-placeholder1`. Level 3 repeats the same sentence.
What I did: `Default` uses the component default `primary`; `Accents` shows all
three; nothing recommends one.
Why: picking one would be a design decision.
What I need from Ben: nothing new — this is conflict B12, already open.

## Lightbox — the prototype records no trigger for either usage
Where: PROTOTYPE-USAGE.md, "Lightbox — 2 usages, both controlled"
What I checked: Level 2 gives both lightboxes’ titles, contents and CTAs, but
nothing about what opens them. Elsewhere it says the ABOUT YOU image radio
routes to the "Not implemented yet" lightbox, which is a radio, not a button —
and `trigger` is a required `ReactElement` rendered through `Dialog.Trigger`,
so a story cannot omit it. Level 1 says only "pass a CtaButton or an
IconButton, not a div".
What I did: used a `secondary` CtaButton reading "Show details & player" — the
prototype’s own copy for the control that opens a method’s detail, borrowed
from METHOD FLOW.
Why: every other option would have meant authoring copy. This borrows a string
the prototype already has for the same job.
What I need from Ben: nothing, just flagging — the trigger in these stories is
illustrative, not a documented pairing.

## Lightbox — `closeLabel` defaults to German, the prototype renders "Close"
Where: `src/Lightbox.tsx:80` vs PROTOTYPE-USAGE.md, "Lightbox"
What I checked: Level 1 defaults `closeLabel = 'Schließen'` and its own comment
says "Defaults to German, like the rest of the set’s user-facing strings".
Level 2 says both prototype lightboxes "render a close button with
`aria-label="Close"`".
What I did: every story but one uses the German default; `CloseLabelOverridden`
shows the prototype’s "Close", labelled as the override it is.
Why: the default is the component’s and hiding it would hide the conflict.
What I need from Ben: nothing new — this is the per-component face of the
session-level language entry in OPEN-QUESTIONS.md.

## Lightbox — `mandatory` does not actually remove every exit
Where: `src/Lightbox.tsx:85` and `:64-68` (the prop’s doc comment)
What I checked: Level 1. `mandatory` does two things: it passes
`disablePointerDismissal` to `Dialog.Root` and it drops the `Dialog.Close`
button. It does NOT pass base-ui’s escape-dismissal option, so **Escape still
closes a mandatory lightbox**. The doc comment warns "otherwise you have built
a trap (2.1.2)" and §7.14 repeats it. With Escape live, it is not a keyboard
trap — but it is a lightbox a mouse-only or touch user cannot dismiss at all,
which is the more serious half and is the half neither text mentions.
What I did: wrote the `Mandatory` story and left the behaviour alone.
Why: changing either the prop or the warning is out of scope.
What I need from Ben: **a decision** on which behaviour is intended. Either the
warning overstates the keyboard risk and understates the pointer one, or
`mandatory` is meant to disable Escape too and does not.

## Lightbox — `description` can only ever be invisible
Where: `src/Lightbox.tsx:98-100`
What I checked: Level 1. `Dialog.Description` is rendered with a hardcoded
`className="musy-sr-only"`, with no prop to show it. The prop’s own comment
calls it an "Optional short description, announced with the title" and §7.14’s
anatomy shows `.musy-sr-only` too, so this is consistent — but it means the
subtitle the prototype shows on the method-detail lightbox ("For getting aware
of feelings") has to come from the framed content, not from this prop.
What I did: `WithDescription` documents the sr-only prop; the visible subtitle
in `TitleHidden` comes from the ContentBox’s own `text`.
Why: both are correct uses; they are just easy to confuse.
What I need from Ben: nothing, just flagging — `description` reads like a
subtitle prop and is not one.

## Lightbox — these stories document only the light theme
Where: `stories/_decorators.tsx` (`singlePane`), and this meta
What I checked: Level 1, the decorator: `singlePane` renders one `light` pane.
The popup is portaled to the document root, so it escapes the `[data-theme]`
wrapper entirely and a `bothThemes` story would render one popup, themed by
whatever the document root carries, while both panes claimed it.
What I did: used `singlePane`, as CONVENTIONS §6 names Lightbox for exactly
this.
Why: one honest pane beats two panes disagreeing about one popup.
What I need from Ben: **a decision, eventually.** Lightbox is the one component
in this set whose dark theme nothing reviews. It needs either a themed portal
container or a global theme toolbar — both are config changes, which are off
limits this session.

---

## Batch D

_MusicPlayer, TrackButton, RecordButton, PhotoUpload, ProcessVisualisation —
written 2026-09-17. Every component entry below is repeated verbatim in that
component's Build notes block._

## Batch D — `docs/07-components.md` is inside `reference/`, which the brief forbids opening
Where: brief ("Do NOT open ... any file in reference/") vs brief ("Read ONLY your
components' sections of docs/07-components.md")
What I checked: Level 1, the filesystem. `packages/design-system/docs/` does not
exist; the only copy is `reference/design_system/docs/07-components.md`.
What I did: read only §7.8, §7.18, §7.21 and §7.22 by line range with `sed`, and
opened nothing else under `reference/` — in particular not the 175 KB prototype.
Why: the narrower instruction names the file explicitly and tells me which
sections to read, so the blanket ban is about the prototype.
What I need from Ben: nothing, just flagging — but the docs probably want to
move into the package, where the brief already assumes they live.

## MusicPlayer — `accent` never reaches the transport button
Where: `src/MusicPlayer.tsx:152-158`
What I checked: Level 1. The wrapper takes `musy-mplayer--${accent}`, but the
play control’s class list is the literal string `'musy-icon-btn
musy-icon-btn--primary musy-icon-btn--guided'`. Level 3, §7.21’s token list
names `--interactive-accent-placeholder1/2`, and the CSS only sets
`--musy-mplayer-accent` on the wrapper.
What I did: wrote an `Accents` story showing all three anyway.
Why: the accent does change the fill, the thumb and the border, so the story
is honest; it simply does not change the button.
What I need from Ben: **a decision.** Either the transport is deliberately
always primary, or `accent` should be threaded into it.

## MusicPlayer — the transport state is derived, and `ended` is unreachable at `duration={0}`
Where: `src/MusicPlayer.tsx:44-47`
What I checked: Level 1. `transportOf` returns `'ended'` only when
`position >= duration && duration > 0`; there is no `state` prop, so
`MusicTransport` is exported as a type nobody can pass in.
What I did: reached `ended` by passing `position === duration`.
Why: it is the only route the API offers.
What I need from Ben: nothing, just flagging — `MusicTransport` being exported
but not accepted is the odd part.

## MusicPlayer / TrackButton — the prototype never records the track’s name
Where: PROTOTYPE-USAGE.md, "MusicPlayer — 1 usage"
What I checked: Level 2 says "Title is the track name" but does not carry the
string; the Listen step’s ContentList has a "Track" row with no value
recorded. Level 3, §7.21’s a11y note spells an example accessible name,
"Pause, Your track".
What I did: used **"Your track"** as `title` and `label` in every story.
Why: it is the only track string either source actually contains; inventing a
song title would be inventing copy.
What I need from Ben: nothing, just flagging.

## TrackButton — renders a spinner it can never show
Where: `src/MusicPlayer.tsx:105` (`<span className="musy-spinner" aria-hidden="true" />`)
What I checked: Level 1. `TrackButtonProps` declares no `loading` prop and the
component never sets `data-loading`. Level 1 again, `src/musy-components.css:266`:
`.musy-btn:not([data-loading]) .musy-spinner { display: none; }`. Level 3, §7.21
says TrackButton "inherits the whole button state model — hover, active, focus,
disabled, **loading**".
What I did: wrote no Loading story, because there is no prop for one.
Why: a story cannot reach a state the API does not expose.
What I need from Ben: **a decision.** Either add `loading` to `TrackButtonProps`
as §7.21 promises, or drop the dead span.

## TrackButton — `variant` defaults to `secondary`, but the prototype’s main control is primary + guided
Where: `src/MusicPlayer.tsx:78` vs PROTOTYPE-USAGE.md, "TrackButton — 2 usages"
What I checked: Level 1, the default is `'secondary'`. Level 2, the prototype
writes the base `musy-btn` (primary) at `guided` for the main listen control and
`secondary` at the default size for the compact one.
What I did: `Default` shows the declared default; `PrototypeListenStep` shows
primary + guided.
Why: stories document what is, and the prototype’s intent is documented beside it.
What I need from Ben: nothing, just flagging.

## TrackButton / MusicPlayer — one calls the colour prop `variant`, the other `accent`
Where: `src/MusicPlayer.tsx:71` vs `:121`
What I checked: Level 1. `TrackButtonProps.variant` is `'primary' |
'secondary' | 'accent-placeholder1' | 'accent-placeholder2'`;
`MusicPlayerProps.accent` is `'primary' | 'accent-placeholder1' |
'accent-placeholder2'`. Two components in one file, overlapping value sets,
different prop names.
What I did: used each name as declared.
Why: renaming either is a design decision.
What I need from Ben: nothing, just flagging — but it is a trap for anyone
swapping one for the other.

## RecordButton — `onLimit` is documented but is not a prop
Where: `src/RecordButton.tsx:29-31` header comment, and §7.22 "Fully controlled,
and no media"
What I checked: Level 1. `RecordButtonProps` declares `state elapsed maxSeconds
levels bars onToggle variant size disabled block readyLabel recordingLabel
status className` — no `onLimit`. Level 3, §7.22’s props table also omits it,
while its prose names it twice.
What I did: nothing; no story references it.
Why: the prop does not exist.
What I need from Ben: **a decision.** Either the sentence means "the app calls
its own handler", in which case both the header and §7.22 should stop naming a
prop, or `onLimit` is missing.

## RecordButton — the live clock is inside the button’s accessible name
Where: `src/RecordButton.tsx:105-115`
What I checked: Level 1. `.musy-rec__time` is not `aria-hidden`, and the
`role="status"` span is a child of the `<Button>`. Name-from-contents therefore
folds "0:12 −0:48" *and* "Recording, 0:12 in, 0:48 left" into the button’s own
name, which changes once a second. Level 3, §7.22 says "one button, one
accessible name" and that the meter is hidden so "a screen reader never walks
twelve empty spans" — the readout gets no such treatment.
What I did: nothing. Noted, not fixed.
Why: fixing it means editing the component.
What I need from Ben: **a decision** — an a11y finding, not a story problem.

## RecordButton — an empty `levels` array draws 12 bars at 10%, not a flat row
Where: `src/RecordButton.tsx:52-53` (prop doc) vs `:96-98`
What I checked: Level 1. The prop doc says "`bars` flat bars when the array is
empty". The render floors each bar at `Math.max(0.1, v)`, so a missing level is
10% of the meter box.
What I did: passed a fixed literal `LEVELS` array in every recording story, so
the meter renders identically on every render.
Why: the brief forbids a random array, and a literal is the only deterministic
option.
What I need from Ben: nothing, just flagging — "flat" reads as 0%, the floor is 10%.

## PhotoUpload — the error is never referenced by `aria-describedby`
Where: `src/PhotoUpload.tsx:130`, `:191-196`
What I checked: Level 1. `aria-describedby` is set only when `description` is
present, and the error `<div role="alert">` carries no `id`, so it can never be
referenced. Level 3, §7.18’s state matrix lists the invalid state but its a11y
notes do not mention the association.
What I did: wrote `WithError` and `WithErrorAndDescription` stories that show the
state as built.
Why: the association is a component change.
What I need from Ben: **a decision** — an a11y finding. `role="alert"` announces
once on appearance; a user who tabs back to the input hears nothing.

## PhotoUpload — `data-invalid` is only on the empty zone, so an error on a selected photo has no styling
Where: `src/PhotoUpload.tsx:172` vs `:135-168`
What I checked: Level 1. `data-invalid` is written on `.musy-upload__zone`;
`.musy-upload__preview` gets `data-disabled` but never `data-invalid`. Level 3,
§7.18’s anatomy shows `[data-invalid]` on the zone only, so the CSS and the docs
agree — but "wrong file attached" is exactly the error a preview needs to carry.
What I did: wrote `SelectedWithError` anyway, so the gap is visible.
Why: the story documents the gap rather than hiding it.
What I need from Ben: **a decision.**

## PhotoUpload — §7.18 says the error renders a `Message`; the component renders `.musy-field__error`
Where: §7.18 state matrix, "invalid → `[data-invalid]` … error Message below" vs
`src/PhotoUpload.tsx:191-196`
What I checked: Level 1, the component renders a bare div with an Icon and a
`musy-sr-only` error word. Level 3, the docs say Message. `RadioGroupText`,
`RadioGroupImage` and `RadioCards` do import `Message` for their `error` prop, so
PhotoUpload is the odd one out.
What I did: nothing.
Why: the source is the authority on the API.
What I need from Ben: nothing, just flagging — it interacts with the "Message is
deleted" question already in this file.

## PhotoUpload — stories pass a static `src`, never a `blob:` URL
Where: `stories/PhotoUpload.stories.tsx`, the `PHOTO` constant
What I checked: Level 1. `URL.createObjectURL` is called only in the change
handler, and the revoke effect only touches a URL that `startsWith('blob:')`.
What I did: every story with a value uses `src: '/assets/web/method-card.png'`.
Why: a story must not create or revoke an object URL; with a static path the
effect’s `created.current` stays `null` and nothing is revoked.
What I need from Ben: nothing, just flagging — the asset is the prototype’s own
`assets/web/method-card.png` and will 404 until Storybook serves a static dir.

## ProcessVisualisation — the CSS section is RETIRED, the component is exported, and the docs are `[OPEN]`
Where: `src/musy-components.css:1235-1237` vs `src/index.ts:39-40` vs §7.8
What I checked: Level 1, the CSS header reads "PROCESS VISUALISATION — RETIRED ·
Superseded by 8 · Carousel. Kept only so the v0.1 clickdummy still renders; no
new screen should reach for it." Level 1 again, `index.ts` still exports the
component and both its types. Level 2, PROTOTYPE-USAGE.md: zero usages, and the
onboarding sequence uses a Carousel instead. Level 3, §7.8 is headed `[OPEN]`
and reads as a live component with a full anatomy, prop table and a11y notes.
What I did: wrote the stories from the source and §7.8 only, and flagged the
contradiction here rather than in the component description.
Why: three sources give three different statuses and none of them is mine to
change.
What I need from Ben: **a decision.** Either retire the export too, or un-retire
the CSS — and note that the thing that superseded it, Carousel, has ~200 lines
of CSS and no component at all, so retiring this leaves the onboarding sequence
with nothing.

## ProcessVisualisation — no source records which glyph each step takes
Where: `stories/ProcessVisualisation.stories.tsx`, the `STEPS` constant
What I checked: Level 1, `glyph` is required per step and typed `LucideIcon`.
Level 2, zero prototype usage, so there is no glyph to copy; PROTOTYPE-USAGE.md
records "METHOD FLOW … step glyphs" only as sizes. Level 3, §7.8’s anatomy shows
an Icon at `lg` and names none.
What I did: used the four METHOD FLOW step names the prototype does record —
Intro, Select Card, Listen, Reflect — with the plainest Lucide glyph for each
(`Info`, `Layers`, `Headphones`, `PenLine`).
Why: the step *names* are sourced; the glyphs are not, and a required prop has to
be filled with something.
What I need from Ben: **confirmation of the glyph set**, if this component
survives its retirement.

## ProcessVisualisation — `body` has no copy in any source
Where: `stories/ProcessVisualisation.stories.tsx`, the `STEPS_WITH_BODY` constant
What I checked: Level 2, zero prototype usage. Level 3, §7.8 shows
`p.musy-process__body` in the anatomy and gives no copy for it.
What I did: wrote one short sentence per step, marked in the story’s JSDoc as
story-only filler, and kept `Default` to titles alone so the sourced copy stands
by itself.
Why: `body` is an optional slot and CONVENTIONS §3 requires a with/without pair;
there was nothing to copy.
What I need from Ben: **real copy**, if this component survives its retirement.

## ProcessVisualisation — `ordinalPrefix` defaults to German while the rest of Batch D defaults to English
Where: `src/ProcessVisualisation.tsx:42` (`ordinalPrefix = 'Schritt'`)
What I checked: Level 1. `MusicPlayer`, `TrackButton`, `RecordButton` and
`PhotoUpload` all default to English and say so in their comments; this one says
"Schritt". Level 2, the prototype is English and does not use the component at
all.
What I did: `Default` shows "Schritt 1"; `EnglishOrdinals` passes
`ordinalPrefix="Step"`.
Why: the default is the component’s, and the override is the only way to show the
prop.
What I need from Ben: nothing new — this is the session-level language question,
named for this component.

## ProcessVisualisation — the title heading level is hardcoded `<h3>`
Where: `src/ProcessVisualisation.tsx:65`
What I checked: Level 1, `<h3>` is a literal; `titleStep` changes the type step,
not the level. Level 3, §7.8: "Each step’s title is a real heading (`<h3>` by
default) so the steps appear in the document outline" — "by default" implies a
prop that does not exist.
What I did: nothing.
Why: adding a prop is a design decision.
What I need from Ben: **a decision.** Dropped inside a ContentBox whose headline
is already an h3, the outline breaks.

## ProcessVisualisation — §7.8 says the dividers carry `role="presentation"`; the source sets only `aria-hidden`
Where: `src/ProcessVisualisation.tsx:70-76` vs §7.8 a11y notes
What I checked: Level 1, the divider `<li>` has `aria-hidden="true"` and no
`role`. Level 3, the docs say "`aria-hidden` with `role="presentation"`".
What I did: nothing.
Why: `aria-hidden` alone already removes it, so the outcome matches; only the
docs overstate.
What I need from Ben: nothing, just flagging.

## Batch B

_IconButton, CtaButton, Switch, Field, FieldItem, FieldGroup — written 2026-09-17.
Every entry below is repeated verbatim in its component's Build notes block._

## IconButton — inherited base-ui Button props cannot be filtered out of the docs table
Where: `src/IconButton.tsx:24` (`extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children' | 'className' | 'render'>`), `.storybook/main.ts`
What I checked: Level 1, the component source. react-docgen cannot follow an
`Omit<ComponentPropsWithoutRef<>>`, so the docs table gets either nothing or the
whole DOM surface. The fix is a `propFilter` in `.storybook/main.ts`, which this
session may not touch.
What I did: hand-wrote `argTypes` for the component’s own props plus the two
inherited ones a story genuinely needs (`disabled`, `onClick`). Did not add a
`propFilter`.
Why: config is off limits and the brief says to log it rather than fight the
inference.
What I need from Ben: **a `propFilter` in `.storybook/main.ts`** so the inherited
DOM props stop appearing. Applies equally to CtaButton and Switch.

## IconButton — stories do not mount `MusyTooltipProvider`
Where: `src/IconButton.tsx:94`
What I checked: Level 1. The header says to mount it ONCE near the app root;
base-ui’s `Tooltip.Root` works without a provider, so the stories render and the
tooltip opens — only the shared 400ms open delay and the grouping behaviour are
missing.
What I did: rendered the bare component, as every other story file does. Did not
add a provider to the decorators, which are groundwork and shared.
Why: adding a provider to `_decorators.tsx` would change a shared module for one
component.
What I need from Ben: nothing, just flagging — the nav-bar grouping case is not
exercised by any story.

## IconButton — `variant="primary"` and `size="primary"` mean two different things on one element
Where: `src/IconButton.tsx:50-52`
What I checked: Level 1. `size === 'primary'` is rewritten to the class
`primary-size`, so the element carries `musy-icon-btn--primary
musy-icon-btn--primary-size`. Level 2, PROTOTYPE-USAGE confirms the prototype
writes `musy-icon-btn--primary-size`.
What I did: wrote the stories against the props as declared.
Why: the rename is deliberate and the ladder (`min`/`primary`/`comfort`/`guided`)
is shared with CtaButton on purpose.
What I need from Ben: nothing, just flagging — reading a rendered IconButton’s
class list, "primary" appears twice and means variant once and target once.

## IconButton — `loadingLabel` defaults to German while every caption around it is English
Where: `src/IconButton.tsx:48` (`loadingLabel = 'Wird geladen'`)
What I checked: Level 1, the default. Level 2, PROTOTYPE-USAGE: the prototype is
English throughout and never uses `loading` at all.
What I did: the `Loading` story uses the component’s own German default and does
not override it.
Why: overriding it in a story would hide the inconsistency.
What I need from Ben: nothing new — this is the session-level language question
already logged in Step 1; recording that it bites here.

## CtaButton — inherited base-ui Button props cannot be filtered out of the docs table
Where: `src/CtaButton.tsx:48` (`extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'>`), `.storybook/main.ts`
What I checked: Level 1, the component source. react-docgen cannot follow an
`Omit<ComponentPropsWithoutRef<>>`, so the docs table gets either nothing or the
whole DOM surface. The fix is a `propFilter` in `.storybook/main.ts`, which this
session may not touch.
What I did: hand-wrote `argTypes` for the component’s own props plus `disabled`
and `onClick`. Did not add a `propFilter`.
Why: config is off limits and the brief says to log it rather than fight the
inference.
What I need from Ben: **a `propFilter` in `.storybook/main.ts`**. Same entry as
IconButton and Switch — one fix covers all three.

## CtaButton — `render` is NOT omitted from the inherited props, where IconButton omits it
Where: `src/CtaButton.tsx:48` (`Omit<…, 'className'>`) vs `src/IconButton.tsx:24`
(`Omit<…, 'children' | 'className' | 'render'>`)
What I checked: Level 1 only; neither Level 2 nor Level 3 mentions `render`.
CtaButton therefore accepts base-ui’s `render` prop, which replaces the rendered
element — a consumer can swap the `<button>` for an `<a>` and keep `musy-btn`,
which §7.4 "What it is NOT" explicitly describes ("a navigation affordance is an
`<a>` styled with the same classes"). `children` is also both inherited and
redeclared.
What I did: wrote no story using `render`. Left the API alone.
Why: it may be intentional — §7.4 sanctions the styled-`<a>` case — but the two
sibling buttons disagree and only one says why.
What I need from Ben: **a decision.** Either omit `render` on CtaButton too, or
document it as the sanctioned link escape hatch.

## CtaButton — `size="min"` carries a baked-in margin, so it cannot be laid out flush
Where: `src/musy-components.css:391` (`.musy-btn--min`), `docs/07-components.md` §7.4
What I checked: Level 1 and Level 3 agree and explain it: the `--sp-2` margin
earns 2.5.8’s spacing exception so the 24px target cannot be made illegal by
placement.
What I did: the `Sizes` story puts `min` in the same row as the other three
rungs, where its margin makes it sit visibly further apart.
Why: that offset is the component’s real behaviour, not a story bug.
What I need from Ben: nothing, just flagging — the gap in the `Sizes` story is
correct and should not be "fixed".

## CtaButton — nothing says when to reach for an accent variant instead of `primary`
Where: `src/CtaButton.tsx:29-31` header, `docs/07-components.md` §7.4 "Accent variants"
What I checked: Level 1 says outright "There is still no rule in the system for
WHEN to pick an accent over primary — see conflict B12 and open question 7".
Level 2, the prototype, uses `accent-placeholder1` exactly twice, both for
*start over / go back to choosing*, and never uses `accent-placeholder2` at all.
Level 3 repeats the same open question.
What I did: the `Variants` story shows all five; the per-story note records only
the prototype’s observed usage, with no rationale attached.
Why: CONVENTIONS §7 forbids inventing rationale.
What I need from Ben: **the missing rule** (open question 7 / conflict B12).
`accent-placeholder2` currently has no use anywhere in the system.

## CtaButton — `loadingLabel` defaults to German and `loading` is never used in the prototype
Where: `src/CtaButton.tsx:70` (`loadingLabel = 'Wird geladen'`)
What I checked: Level 1, the default. Level 2: "`loading` is never used in the
prototype. Neither is `size="min"`, `size="comfort"`, `block`, `wrap`, or
`accent-placeholder2`."
What I did: wrote stories for all of them from the source and §7.4, using the
component’s own German loading default unchanged.
Why: the props exist and the brief asks for every variant and size; the prototype
simply has not reached for them yet.
What I need from Ben: nothing new — the language half is the session-level
question already logged in Step 1.

## Switch — inherited base-ui Switch.Root props cannot be filtered out of the docs table
Where: `src/Switch.tsx:31` (`extends Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, 'className' | 'render' | 'nativeButton'>`), `.storybook/main.ts`
What I checked: Level 1, the component source. react-docgen cannot follow an
`Omit<ComponentPropsWithoutRef<>>`, so the docs table gets either nothing or the
whole DOM surface. The fix is a `propFilter` in `.storybook/main.ts`, which this
session may not touch.
What I did: hand-wrote `argTypes` for the component’s own props only, plus the
three inherited ones the stories genuinely need. Did not add a `propFilter`.
Why: config is off limits and the brief says to log it rather than fight the
inference.
What I need from Ben: **a `propFilter` in `.storybook/main.ts`**. Same entry as
IconButton and CtaButton — one fix covers all three.

## Switch — `checked` and `onCheckedChange` are inherited, not own props, but every state story needs them
Where: `src/Switch.tsx:31`
What I checked: Level 1. The component’s own interface declares only `label`,
`labelHidden`, `reverse`, `accent`, `guided`, `showStateIcons`, `onGlyph`,
`offGlyph` and `className`. `checked`, `disabled` and `onCheckedChange` all
arrive from base-ui through the `Omit<>`.
What I did: hand-wrote `argTypes` for the own props plus `checked`, `disabled`
and `onCheckedChange`, because CONVENTIONS §5 requires every state to come from
props and a Switch with no `checked` arg can only ever document one of its two
states.
Why: the batch note’s "own props only" is about suppressing the DOM surface, not
about hiding the control’s value.
What I need from Ben: nothing, just flagging the judgement call.

## Switch — the dark-mode knob pair is written "Moon / Sun" in one place and "Sun / Moon" in the other
Where: `stories/PROTOTYPE-USAGE.md`, "Switch" ("Knob glyphs are a **Moon / Sun**
pair") vs `docs/07-components.md` §7.5 ("Sun / Moon for dark mode")
What I checked: Level 1 says only that `onGlyph` shows when on and `offGlyph`
when off; it does not name a dark-mode pair. Level 2 writes Moon first, Level 3
writes Sun first, and neither says which slot it means.
What I did: used `onGlyph={Moon}` / `offGlyph={Sun}` in the `DarkModePair` story —
dark mode ON shows the moon.
Why: it is the only reading in which the glyph describes the state it is shown
in, which is what the prop’s own doc comment asks of a domain pair.
What I need from Ben: **confirm the orientation**, and say which of the two
documents is the one to correct.

## Switch — has no invalid, loading, required or readOnly state, so those stories do not exist
Where: `docs/07-components.md` §7.5 state matrix, `src/Switch.tsx:31-56`
What I checked: Level 3 is explicit — loading is "N/A at component level" and
error is "N/A. A switch cannot be invalid — either value is legal". Level 1
declares no `required` and no `readOnly` of its own.
What I did: wrote no `Loading`, `WithError`, `Required` or `ReadOnly` story for
Switch.
Why: the brief asks for those states "where they exist"; here they are documented
as deliberately absent.
What I need from Ben: nothing, just flagging so the omission does not read as a
miss.

## Switch — pairing it with FieldItem produces two labels for one control
Where: `src/Switch.tsx:88-90` and `src/Field.tsx` `FieldItem`
What I checked: Level 1. `Switch` always renders its own `<label htmlFor>`;
`FieldItem` renders a second `<label htmlFor>` for the control it is given. Level
3, §7.16, names Switch as FieldItem’s example control. Nothing reconciles the two.
What I did: `FieldItem`’s Switch stories pass `labelHidden` to the Switch so only
one label is visible. Both labels still point at the same control and both are
still in the accessible name.
Why: `labelHidden` is the only prop that reduces the duplication without editing
a component.
What I need from Ben: **a decision.** Either Switch needs a way to render no
label at all, or FieldItem should not be documented as taking a Switch.

## Field — the documented controlled-value defect (gaps §6) is FIXED; the two docs disagree about it
Where: `src/Field.tsx:88-96`, `docs/12-component-gaps.md` §6,
`docs/07-components.md` §7.16
What I checked: Level 1, the source: `value`, `defaultValue` and `onChange` sit on
`BaseField.Control`, exactly the fix §6 prescribes. Level 3 is split — §7.16
already describes it as a **fixed defect**, but `12-component-gaps.md` §6 still
states it in the present tense and is still headed `[DEFECT]`.
What I did: wrote `Filled`, `Multiline` and every error story as controlled —
`value` plus `onValueChange` — since the value now reaches the control.
Why: the source is Level 1 and the source is fixed.
What I need from Ben: **close `12-component-gaps.md` §6** or mark it resolved; as
written it tells the next reader the component is broken when it is not.

## Field — `value` and `defaultValue` are both forwarded to the same control
Where: `src/Field.tsx:91-92`
What I checked: Level 1 only. Both props are passed through to the rendered
`<input>`/`<textarea>` unconditionally. A consumer who sets both gets React’s
controlled/uncontrolled warning; a consumer who sets neither is fine, because both
are `undefined`.
What I did: every story passes one or the other, never both.
Why: it is only a defect at the call site, and guarding it inside the component
would be a change I may not make.
What I need from Ben: nothing, just flagging — worth one line in the props table.

## Field — the header comment is garbled where the defect fix was written into it
Where: `src/Field.tsx:19-22`
What I checked: Level 1. The sentence "the validity properties carry no transition
—" runs straight into "VALUE GOES THROUGH Field.Control, NOT Field.Root" with no
break, so the first sentence never finishes. §7.16 carries both thoughts intact and
separate.
What I did: took the docs text for that clause from the intact §7.16 wording. Did
not touch the source comment.
Why: CONVENTIONS §7 sources docs text from the header first, but the header is
unreadable at exactly that point.
What I need from Ben: **one edit to the comment** — the fix note was pasted into
the middle of the previous sentence.

## Field — no `readOnly` styling exists, so the ReadOnly story looks identical to Default
Where: `src/Field.tsx:97` (prop forwarded to the control); `src/musy-components.css`
has no `:read-only` and no `[readonly]` rule anywhere
What I checked: Level 1, the prop is real and reaches the control. Level 3, §7.16’s
state matrix has rows for default, hover, focus, filled, invalid, valid, disabled
and loading — and **no row for read-only**.
What I did: kept the `ReadOnly` story, because the prop exists and the behaviour
(uneditable, still focusable, still announced) is real even though the picture does
not change.
Why: a prop with no visual treatment is worth seeing as a prop with no visual
treatment.
What I need from Ben: **a decision.** Either the state matrix gains a read-only row
and the stylesheet a rule, or `readOnly` comes off the API.

## Field — `validMessage` cannot be shown from props alone in a reliable way
Where: `src/Field.tsx:108-118`
What I checked: Level 1. The success line renders only inside `BaseField.Validity`
when `validity.value !== ''` **and** `validity.validity.valid`, and §7.16 adds that
the success *border* is additionally gated on `data-touched` — which no prop can
set.
What I did: wrote a `WithValidMessage` story that passes a non-empty `value`
together with `validMessage`. Whether the line paints on first render depends on
base-ui’s internal validity bookkeeping, not on the args.
Why: CONVENTIONS §5 forbids the alternative, which is to click the field inside the
story.
What I need from Ben: nothing, just flagging — this is the one documented state of
Field that a props-only story may not be able to prove.

## Field — no way to pass `autoComplete`, `inputMode`, `maxLength` or an `aria-*` attribute
Where: `src/Field.tsx:38-60` — `FieldProps` is a closed interface and the component
spreads no rest props onto `Field.Control`
What I checked: Level 1. Unlike IconButton, CtaButton and Switch, `FieldProps`
extends nothing — the batch brief’s "these components extend an Omit of
ComponentPropsWithoutRef" is true of the other three and **not** of Field. Level 2:
the prototype’s END screen field is `type="email"`, which is exactly the field that
wants `autoComplete="email"`.
What I did: the `Email` story sets `type="email"` and nothing else.
Why: there is no prop for it.
What I need from Ben: **a decision** — whether `FieldProps` should pass the
remaining input attributes through.

## FieldItem — `disabled` styles the label but does not disable the control
Where: `src/Field.tsx:140-160`
What I checked: Level 1. `disabled` only sets `data-disabled` on the `<label>` and
the description `<p>`; the `control` node is rendered untouched, so the switch
inside a "disabled" FieldItem is still fully operable. Level 3, §7.16, describes
FieldItem in one sentence and does not mention `disabled` at all.
What I did: the `Disabled` story sets `disabled` on the FieldItem **and** on the
Switch it contains, so the row is honest.
Why: showing `disabled` alone would document a row that looks disabled and is not.
What I need from Ben: **a decision.** Either the prop is renamed to say it is
presentational, or it is documented as "set this on both".

## FieldItem — the stylesheet styles a `.musy-field__error` child the component can never render
Where: `src/musy-components.css:2908-2909`, `src/Field.tsx` `FieldItemProps`
What I checked: Level 1. `.musy-field__item > .musy-field__error` is given a grid
column, but `FieldItemProps` has no `error` prop and `FieldItem` renders no error
element. Level 3 says nothing about a FieldItem error.
What I did: nothing; there is no story that can reach it.
Why: adding an `error` prop would be a design decision.
What I need from Ben: nothing, just flagging — either dead CSS or a prop that was
planned and dropped.

## FieldItem — pairing it with Switch produces two labels for one control
Where: `src/Switch.tsx:88-90` and `src/Field.tsx` `FieldItem`
What I checked: Level 1. `Switch` always renders its own `<label htmlFor>`;
`FieldItem` renders a second `<label htmlFor>` for the control it is given. Level
3, §7.16, names Switch as FieldItem’s example control. Nothing reconciles the two.
What I did: the Switch stories pass `labelHidden` to the Switch so only one label
is visible. Both labels still point at the same control and both are still in the
accessible name.
Why: `labelHidden` is the only prop that reduces the duplication without editing a
component.
What I need from Ben: **a decision.** Either Switch needs a way to render no label
at all, or FieldItem should not be documented as taking a Switch.

## FieldItem — no prototype usage, so the copy in its stories is borrowed
Where: `stories/PROTOTYPE-USAGE.md`, "Components with no prototype usage at all"
What I checked: Level 2 lists `FieldItem` and `FieldGroup` as unused by the
prototype. Level 3, §7.16, gives only the one-line description.
What I did: used the SETTINGS "Dark mode" switch from the prototype’s Switch usage
as the control, since that is the one real settings row in the system, and kept the
copy to strings that already exist.
Why: it is the nearest existing copy; inventing a new label would be a design
decision.
What I need from Ben: nothing, just flagging that the labels are borrowed.

## FieldGroup — `legend` is documented as visible and is hardcoded visually hidden
Where: `src/Field.tsx:176` (`<legend className="musy-sr-only">`) vs the prop’s own
doc comment at `src/Field.tsx:167` ("Renders a `<legend>`. Omit only when the group
has a heading beside it.")
What I checked: Level 1 contradicts itself inside one file — the comment implies a
visible legend, and the JSX always applies `musy-sr-only`. Level 3, §7.16,
describes FieldGroup in one sentence and does not mention the legend at all. Level
2 has no usage.
What I did: the `WithLegend` story sets `legend` and its note says the legend is
screen-reader-only.
Why: the JSX is what runs.
What I need from Ben: **a decision.** Either the comment is wrong, or FieldGroup
needs a `legendHidden` prop like SegmentedControl’s, which is the pattern the rest
of the system uses.

## FieldGroup — no group-level `disabled` and no group-level `error`
Where: `src/Field.tsx:164-180`
What I checked: Level 1. `FieldGroupProps` is `legend`, `children` and `className`
and nothing else — a `<fieldset>` with no `disabled`, although the native element
supports it and disabling a run of fields together is the usual reason to reach for
one. Level 3 adds nothing.
What I did: wrote `Default`, `WithLegend`, a mixed story and a disabled story that
disables each child field individually. No group-level disabled or error story,
because the props do not exist.
Why: adding one would mean inventing a prop.
What I need from Ben: nothing, just flagging.

## FieldGroup — no prototype usage, so the contents of its stories are borrowed
Where: `stories/PROTOTYPE-USAGE.md`, "Components with no prototype usage at all"
What I checked: Level 2 lists `FieldGroup` and `FieldItem` as unused by the
prototype. Level 3, §7.16, gives one sentence.
What I did: filled the group with the prototype’s own Field usages — the reflect
step’s "Your written answer" and the END screen’s "Email address" — unchanged.
Why: it is the nearest existing copy; inventing new fields would be a design
decision.
What I need from Ben: nothing, just flagging that the contents are borrowed.


---

# Step 3 — Batch E

## DraggableList — every state the component exists to manage is unreachable from props
Where: `src/DraggableList.tsx:139-146` and `:370-374`
What I checked: Level 1. `draggingId`, `dropTarget`, `pointer`, `openMenuId`,
`liveMessage` and the per-row `editing`/`draft` are all internal `useState`.
There is no prop that opens a row's action menu, starts a drag, marks a merge
target or opens the editor. Level 3, §7.24 documents twelve states.
What I did: wrote the nine states that ARE props — resting, not-editable,
empty, pending, partial, dense, single, long, custom copy. Did not fake the
rest; CONVENTIONS §5 forbids local state in a story.
Why: the alternative is a story that lies about how the state was reached.
What I need from Ben: **a decision.** Nine of the twelve documented states have
no documentation. Either the component needs props to drive its machine, or
these stories need a play function — which means an addon, which means config.
This is the largest documentation gap in the session.

## DraggableList — the row action copy has no prop at all
Where: `src/DraggableList.tsx:437-441`, `:480-482`, `:196-230`
What I checked: Level 1. "Discard", "Save", "Delete", "Edit", the handle and
chevron `aria-label`s, and all five keyboard live-region announcements are
hardcoded English in the JSX. Level 3: §7.24 does not mention localisation.
What I did: nothing; the stories show them as they are.
Why: adding a prop is an API change.
What I need from Ben: **a decision.** A consumer who localises every string the
props expose still ships four English buttons and five English announcements.

## DraggableList — `DropHints` is exported from the module, missing from the barrel
Where: `src/DraggableList.tsx:69` vs `src/index.ts:64-67`
What I checked: Level 1. The type of the public `dropHints` prop cannot be
named through the package entry point. Already recorded in
`reference/INVENTORY.md` §3.
What I did: nothing.
Why: `index.ts` is not a story file.
What I need from Ben: nothing, just flagging — one line in the barrel.

## Toast — the component does not position itself
Where: `src/Toast.tsx:47-55`
What I checked: Level 1. It renders a plain `<div className="musy-toast">` with
no portal and no positioning. Level 3, §7.23 and Layer 1 both say the toast sits
at `--z-toast`, above an open sheet, and that this is the layer's first consumer.
The placement lives in the stylesheet's §23.
What I did: the stories render it inline, which is where the component puts it.
Why: the component's own output is the authority.
What I need from Ben: nothing, just flagging — but note a story can never show
this component where it actually appears.

## Toast — `id` is accepted and unused
Where: `src/Toast.tsx:52`
What I checked: Level 1. `id` is spread onto the root and nothing references it;
there is no `aria-describedby` or `aria-labelledby` relationship for it to serve.
Message takes `id` for the same shape of reason and there it IS used — the radio
groups pass it and point `aria-describedby` at it.
What I did: `control: false`, no story.
Why: a prop with no observable effect has nothing to document.
What I need from Ben: nothing, just flagging.

## WizardPanel — nothing ties it to InteractiveWizard
Where: `src/InteractiveWizard.tsx:175-186`
What I checked: Level 1. It takes no `step`, no `current`, no `id`, and
`InteractiveWizard` does not render it. They are coupled only by the
`musy-wizard__` class prefix. Level 3, §7.17 mentions the panel in passing and
gives it no section. Level 2, the prototype uses `musy-wizard__panel` five times.
What I did: documented it as a standalone box and said so.
Why: that is what the component is.
What I need from Ben: **a decision.** There is no `aria-labelledby` from the
panel back to the step trigger, so a screen-reader user gets a named `<nav>` of
steps and an anonymous panel with no announced relationship between them.

## WizardPanel — the actions row has no alignment control
Where: `src/InteractiveWizard.tsx:184`
What I checked: Level 1. `actions` renders into a fixed
`.musy-wizard__actions`; no prop. Level 2, the prototype uses that class three
times. Level 3, L6 requires the primary action right-aligned.
What I did: nothing.
Why: alignment is the CSS's here.
What I need from Ben: **a decision** on which of `WizardPanel` and `ButtonGroup`
a wizard step's actions should use. Both exist, only one takes `align`, and
nothing records the answer.

## WizardPanel — no section of its own in docs/07-components.md
Where: `reference/design_system/docs/07-components.md` §7.17
What I checked: Level 3. §7.17 is InteractiveWizard; the panel gets a passing
mention. The component's two-line source comment is the entire specification.
What I did: wrote the page from the source comment and the prototype's usage.
Why: nothing else exists.
What I need from Ben: nothing, just flagging.

## MusyTooltipProvider — no story; it has no visual surface
Where: `src/IconButton.tsx:99-101`
What I checked: Level 1. It renders base-ui's `Tooltip.Provider` with
`delay={400} closeDelay={0}` and nothing else — no DOM of its own.
What I did: no story file. Documented in IconButton's page by Batch B instead.
Why: a story for a context provider would render an empty canvas.
What I need from Ben: nothing, just flagging — it is an exported component with
no page, which a completeness check would flag.

## Session — five non-component exports have no stories
Where: `src/index.ts` — `itemTypeStep`, `trackClock`, `recordClock`,
`useCoarsePointer`, `useToolSize`
What I checked: Level 1. Three are pure functions and two are hooks. None
renders anything.
What I did: no story files.
Why: Storybook documents rendered output; a hook has none.
What I need from Ben: nothing, just flagging. Note `useToolSize` appears in no
document at all — not in 07-components.md and not in any other doc — while
`useCoarsePointer` is discussed in five.

## Session — the batch brief contradicted itself on docs/07-components.md
Where: my own batch briefs, and `reference/design_system/docs/07-components.md`
What I checked: Level 1. The file exists only under `reference/`, which the same
brief told the agents not to open. Only `10-layout.md` and
`15-layout-evidence.md` were ever copied into the package.
What I did: nothing — Batches B and D both hit it, read only their own sections
by line range, opened nothing else, and logged it. That is the right handling.
Why: the conflict is in my instruction, not in the system.
What I need from Ben: nothing. **This one is mine, not the system's.** If
07-components.md is meant to be the component spec it probably belongs in
`packages/design-system/docs/` next to the two layout files.


---

# Summary — end of session, 2026-09-17

## What got written

**26 components have stories. 258 stories in 26 files.**

| Step | Components | Files | Stories |
|---|---|---|---|
| 1 · groundwork | SegmentedControl (exemplar) | 1 | 9 |
| 2 · Batch A, static | Icon, ButtonGroup, Hint, Logo, ContentBox, ContentList | 6 | 58 |
| 2 · Batch B, controls | IconButton, CtaButton, Switch, Field, FieldItem, FieldGroup | 6 | 65 |
| 2 · Batch C, composites | RadioGroupText, RadioGroupImage, RadioCards, InteractiveWizard, Lightbox | 5 | 49 |
| 2 · Batch D, media | MusicPlayer, TrackButton, RecordButton, PhotoUpload, ProcessVisualisation | 5 | 52 |
| 3 · Batch E | Toast, WizardPanel, DraggableList | 3 | 25 |

Not written, and why:
- **VoiceNote, Message, Badge, BadgeRow** — the brief forbids it. All four are
  still present and exported; see the Step 1 entry.
- **MusyTooltipProvider** — a context provider with no DOM of its own.
- **itemTypeStep, trackClock, recordClock, useCoarsePointer, useToolSize** —
  three pure functions and two hooks. Nothing renders.

`pnpm check` passes. `storybook build` exits 0.

## Questions logged: 118

Step 1 · 7 · Batch A · 26 · Batch B · 38 · Batch C · 23 · Batch D · 20 ·
Batch E · 11 (counted under Step 3).

Every entry is mirrored verbatim into its component's **Build notes** block, so
the log and the pages cannot drift.

## The three things to look at first

### 1 · None of this is in Storybook, and one line fixes it

`.storybook/main.ts` globs `stories/**/*.mdx` and `src/**/*.stories.tsx`.
Twenty-six story files were written to `stories/*.stories.tsx`, which matches
neither. Verified with picomatch, and then confirmed against a real production
build: **26 story files on disk, 0 in the built index.** The build succeeds and
contains the 13 foundations/layout pages and the old Badge smoke story, and
nothing else from this session.

The brief said to write them there, and separately said never to touch config.
Both were obeyed. Add `'../stories/**/*.stories.tsx'` to that array and all 258
stories appear at once. Until then nothing here has been seen rendering — `tsc`
is the only verification that ran against it.

### 2 · Four "deleted" components are still here, and one is load-bearing

`VoiceNote`, `Message`, `Badge` and `BadgeRow` are all present in `src/` and
exported from `index.ts`. `src/Badge.stories.tsx` also still exists from an
earlier session.

`Message` is not merely present: `RadioGroupText`, `RadioGroupImage` and
`RadioCards` each import it and render it for their `error` prop. Three Batch C
components cannot show an error state without it, so "deleted" cannot be
literally true yet. No stories were written for any of the four and nothing was
touched, but the discrepancy needs settling before the next pass.

### 3 · Two components document states they have no way to reach

**DraggableList** keeps `draggingId`, `dropTarget`, `openMenuId` and the
per-row `editing`/`draft` in internal `useState`. §7.24 documents twelve states;
nine of them — dragging, the drop indicator, the merge target, the open action
menu, the editor with its dirty/clean Save — cannot be produced from props.
Faking one with local state is forbidden by the conventions, so those nine are
undocumented. This is the largest gap in the session.

**Hint** has the same shape of problem and a smaller blast radius: the CSS has a
`.musy-tip[data-force~="hover"]` escape hatch, but the component takes only
`text`, `children` and `className`, and the hook is an attribute selector, so
the bubble — the entire component — cannot be shown in any story.

Honourable mentions, all logged in full above: **TrackButton** renders a spinner
but declares no `loading` prop; **RecordButton**'s `onLimit` is documented
twice and is not a prop; **Lightbox.mandatory** does not disable Escape, so the
keyboard-trap warning is backwards; **RadioCards**' header comment contradicts
its own CSS in three particulars; the **Field** defect in
`docs/12-component-gaps.md` §6 is fixed but that section still says otherwise in
the present tense.

## One thing that is mine, not the system's

The batch brief told each agent to read its components' sections of
`docs/07-components.md` and, in the same breath, never to open `reference/` —
where that file is the only copy. Batches B and D both hit it, read only their
own sections by line range, opened nothing else, and logged it. That is the
right handling of a contradictory instruction, and the contradiction was mine.

## Not started, as instructed

The accessibility pass and the cleanup pass. Both need Ben. Every a11y
observation in this log was recorded in passing and deliberately not chased:
RecordButton folding a once-a-second clock into a button's accessible name,
PhotoUpload's orphaned `role="alert"`, Switch + FieldItem giving one control two
labels, WizardPanel having no association back to its step, DraggableList's
keyboard equivalents being specified and never verified.


---

# Follow-up — 2026-09-18

## ContentBox — the headline has no overflow-wrap safety net
Where: `src/musy-components.css:1374`
What I checked: Level 1. `.musy-box__headline` sets `text-wrap`, `max-width`
and colour, and nothing else — it computes `overflow-wrap: normal` and carries
no `hyphens`. The line directly below it, `.musy-box__text`, does carry
`hyphens: var(--text-hyphens)`. Level 3, `docs/07-components.md:46` promises the
opposite: "Every affected part also carries `overflow-wrap: break-word` as the
safety net for a word with no legal hyphenation point in range." The headline is
not one of them.
What I did: nothing to the CSS. Fixed the HeadlineSteps story's own labels so
they contain a space and can wrap, and measured the rest: at `display-xl` an
unbreakable 25-character string renders 691px wide inside a 568px box and is
simply clipped.
Why: editing the stylesheet is a design-system change, not a story fix.
What I need from Ben: **a decision.** German compounds are exactly the case §46
raises — "Partnerschaftsberatung" at `display-xl` in a phone-width card has no
legal break point and will overflow the same way. Either the headline gets
`overflow-wrap: break-word` like the text beside it, or §46 should stop claiming
every wrapping part has it.

## Session — component docs pages did not exist until today
Where: `.storybook/preview.ts`
What I checked: Level 1. Storybook 9 builds a Docs page only for a component
tagged `autodocs`. No meta carried the tag, so the index held 258 story entries
and zero component docs entries — every `parameters.docs.description.component`
written across the five batches, including all 118 Build notes blocks, rendered
nowhere.
What I did: set `tags: ['autodocs']` globally in preview.ts. Verified 26/26
component docs pages now carry their description and Build notes.
Why: the alternative was repeating the tag in 26 metas.
What I need from Ben: nothing, just flagging — but note this means none of the
Build notes had ever been seen at the time the session reported them as
"mirrored onto the pages". They were in the source; they were not on a page.

## Switch — both knob glyphs rendered stacked; fixed by wrapping them
Where: `src/Switch.tsx:78-90`, `src/musy-components.css:630-631`
What I checked: Level 1. `.musy-switch__glyph[data-state="hidden"] { opacity: 0 }`
was the only thing hiding one of the two knob glyphs, and `data-state` was being
passed to `<Icon>`, whose `IconProps` is a closed interface with no index
signature — so the attribute never reached the DOM and the rule never matched.
Measured: both glyphs at `opacity: 1`, same grid cell, in both states.
What I did: wrapped each glyph in a `<span className="musy-switch__glyph"
data-state=…>` and left `<Icon>` and the stylesheet untouched. Verified: off →
`[hidden 0, shown 1]`, on → `[shown 1, hidden 0]`, and `showStateIcons={false}`
still renders none.
Why: it restores the cue the stylesheet was already written for without widening
Icon's API.
What I need from Ben: nothing — fixed. Noting the history: the earlier move task
instructed deleting this prop on the stated grounds that "no CSS rule uses it".
A rule did. The deletion was not what broke it — the prop never reached the DOM —
but it removed the last trace of an already-dead 1.4.1 non-colour cue.

---

# Phase B.1 — the four decisions, answered 2026-09-19

Ben's answers to the four questions B.1 reserved for him. Recorded here rather
than in the entries above because this file is append-only; each entry names
the questions it closes. **No code has been written for any of these** — that
is B.2.

## Accents — `accent-placeholder1/2` get real names, in Layer 1 — ANSWERED
Closes: the B12 conflict, and every "accent-placeholder" entry above.

What they turned out to be, in Ben's words:

- **`accent-placeholder1` is the standard accent** for interactive elements —
  the stepper, the cards, and in practice almost every form control. It becomes
  **`--interactive-accent`**.
- **`accent-placeholder2` is a backup** for components where warnings are
  common, "as the ocher is too close to a warning orange". The example given is
  the draggable list, where statements can be combined.

The collision is real and measurable: `--ocher-9` is `#E9B86C` and
`--warning-9` is `#FEA247` — two warm ambers, one of them load-bearing for
feedback. So the second accent is not decoration, it is what a component reaches
for when the first accent would read as a warning state.

**Where the rename lands: Layer 1, re-signed.** Ben chose this over aliasing in
`musy-foundations-amendments.css`. The consequence is explicit — the "Layer 1 is
byte-identical to the signed-off version" guarantee in README.md is broken and
then re-established, and `scripts/verify-tokens.mjs` is re-baselined as part of
the same change. 22 tokens, plus the DTCG mirror (44 entries) and
`tokens/_audit.json` (38), plus 20 CSS class variants and 9 component prop
unions.

**Two things B.2 still has to settle, both consequences rather than decisions:**

1. **`DraggableList` has no `accent` prop.** It renders inner `CtaButton`s at
   `variant="ghost" | "secondary" | "primary"` and exposes no accent at all, so
   the use case that justifies the second accent cannot currently be expressed.
   The seven components that DO expose it are Badge, CtaButton,
   InteractiveWizard, MusicPlayer, RecordButton, RadioGroupText and Switch.
   Either DraggableList gains the prop, or the stated reason for keeping a
   second accent has no call site.
2. **The second accent is `--interactive-accent-alt`** — confirmed by Ben on
   2026-09-19. It says "the other one" without claiming a hue, which matters
   because the reason it exists is a contrast relationship with `--warning-*`
   rather than a pigment.
   Note that where the prop is itself called `accent` (Switch, RadioGroupText,
   InteractiveWizard), the value now reads `accent="accent"`. On `variant`
   props (CtaButton, RecordButton, MusicPlayer) it reads fine. Left as is: the
   alternative was naming the value differently from the token it selects.

**DONE 2026-09-19 — the rename landed.** 610 occurrences across 36 files:
Layer 1 (22 tokens), the DTCG mirror, `_audit.json`, `proof-manifest.json`,
`musy-components.css` (163), seven component prop unions, seventeen story
files, PROTOTYPE-USAGE.md, both Layer 3 docs and their reference mirrors, and
three call sites in `apps/web/src/SettingsSheet.tsx` — which `tsc` caught
rather than a grep, because the prop types are unions.

Three places deliberately keep the OLD names, and a grep will find them:

- **This file, above.** It is append-only and records what was true when each
  entry was written. Rewriting the history to match the present would destroy
  the thing the log is for.
- **`reference/`** — the vendored snapshot of the original design system. It is
  a record of what was specified, not a live document. The two exceptions are
  `reference/design_system/docs/10-layout.md` and `15-layout-evidence.md`,
  which `verify-layout.mjs` asserts are byte-identical to the package copies;
  those two were renamed in both places so the check still passes.
- **`BUILD-PLAN.md`**, inside the collapsed "original four questions" block.

**`README.md` no longer claims Layer 1 is byte-identical to the signed-off
version**, because it is not. It now records the rename, that nothing else
changed — no value, no alias, no override — and that the lock is re-established
from the new version.

One correction to what was said while deciding this: `verify-tokens.mjs` does
NOT store a hash or signature of Layer 1. It asserts that every declared token
is claimed by exactly one Storybook page group. So "re-signing" meant updating
those predicates and the README sentence, not re-baselining a checksum — a
smaller and less alarming operation than it sounded.

**The Storybook page groups needed care.** `--interactive-accent-alt-*` also
starts with `--interactive-accent`, so the plain predicate excludes the alt
prefix explicitly. Without that, the first group claims all 22 tokens, the
second renders empty, and `verify-tokens.mjs` fails on "claimed twice". Written
as an exclusion rather than relying on array order, so reordering the list
cannot silently break it.

## ProcessVisualisation — retired, and Carousel gets built in B.2 — ANSWERED
Closes: "ProcessVisualisation — the CSS section is RETIRED, the component is
exported, and the docs are `[OPEN]`", and its three follow-on entries.

The export goes, `§7.8` is marked retired rather than `[OPEN]`, and the `8b ·
PROCESS VISUALISATION — RETIRED` CSS section is deleted. The three defects
logged against it — the German `ordinalPrefix = 'Schritt'`, the hardcoded
`<h3>`, and the dividers carrying only `aria-hidden` where §7.8 specifies
`role="presentation"` — die with it and need no fix.

**Carousel is built in B.2, not deferred to D.1.** The ~200 lines of
`.musy-carousel` CSS have no component and no export, and D.1's five-slide
onboarding needs one. Building it in B.2 keeps the component work inside the
phase where component work is reviewed, rather than having D.1 write a screen
and a component in one session — which is where hand-written markup appears.

## Component defaults — English — ANSWERED
Closes: "ProcessVisualisation — `ordinalPrefix` defaults to German while the
rest of Batch D defaults to English", and the several `emptyLabel` entries.

13 German strings across 11 components become English: the `Badge` and
`Message` status words (Hinweis / Warnung / Erfolg / Fehler), `Lightbox`
`closeLabel`, `Toast` and `Message` `dismissLabel`, the four `emptyLabel`s on
ContentList / RadioCards / RadioGroupImage / RadioGroupText, and the
`loadingLabel = 'Wird geladen'` on CtaButton and IconButton.
`ProcessVisualisation.ordinalPrefix` is retired rather than translated.

`en.ts` is the source of truth that `de.ts` is typed against, so English
defaults match the direction the app already resolves in — and it is 13 edits
rather than the 25 that going German would cost.

This does NOT relax the app's own rule. `apps/web` still passes every
user-visible string explicitly, because a default in either language is wrong
in the other; see CLAUDE.md rule 7. What changes is only what shows when
someone forgets.

## G3 — `--interactive-ghost-border-hover` — ANSWERED
Closes: the two raw `--sand-8` references in `musy-components.css`.

Ben chose the name inside the existing `--interactive-ghost-*` family over
`--border-strong-hover`. Both raw references are the same role — the border of
a `--secondary` control on hover, at `.musy-btn--secondary:hover` and
`.musy-icon-btn--secondary:hover`, both of which already take
`--interactive-ghost-hover` for their background. So the ghost family is where
their background already comes from, and the border now follows it.

**Two things B.2 must carry, or the token is worse than the raw value:**

- `--border-strong` has `forced-colors: active` and `prefers-contrast: more`
  overrides; `--interactive-ghost-border` has neither. A hover border needs
  them, so they have to be written for the new token rather than inherited.
- Since Layer 1 is being re-signed for the accent rename anyway, this token
  goes into Layer 1 beside `--interactive-ghost-border` rather than into the
  amendments file. G1 and G2 stay where they are.

**G3 is not tracked anywhere.** G1 and G2 appear in `TOKEN-DRIFT.md`,
`README.md`, `.storybook/preview.ts` and the Icon stories; "G3" appears only in
`BUILD-PLAN.md`. B.2 adds the missing row so the three read alike.

## Noted while answering these — `docs/12-component-gaps.md` does not exist here
Where: `docs/10-layout.md:19` and `:337`

`10-layout.md` links to `12-component-gaps.md` twice. That file exists only in
`reference/design_system/docs/`, not in this package, so both links are dead
from here. It cannot simply be fixed: `verify-layout.mjs` asserts
`docs/10-layout.md` is byte-identical to the reference copy, so the reference
copy has to change first or the check fails.

Also: that gaps document has six numbered entries and none of them is G3, so
the G1/G2/G3 numbering is a separate sequence from it.
What I need from Ben: nothing yet — flagging, because it will look like a
broken link to the next person who follows it.

---

# Phase C.9 — LinkList and Timeline

_Two new components, written 2026-09-19: `LinkList` (a list of destinations)
and `Timeline` (groups a list under headings). Both are deliberately basic —
the visual detail is Phase G.1's._

**Why these arrive late.** This log was locked while those components were
built, so their questions were written into each story's `Build notes` block
instead. `CONVENTIONS.md` §8 requires the Build notes to repeat a component's
OPEN-QUESTIONS entries verbatim, so with the log behind, the story was the only
copy and the two would have drifted. The six entries below are copied back from
`stories/LinkList.stories.tsx` and `stories/Timeline.stories.tsx` verbatim; the
seventh had no story to live in and is written here for the first time.

## LinkList — a navigable row is visually identical to a static one
Where: src/musy-components.css, the LINK LIST block (`.musy-llist__row`), src/LinkList.tsx
What I checked: the brief asks for "no hover choreography, no elevation, no
motion", and the row drops the anchor underline because the affordance is the
whole row rather than a coloured word inside it. The result is that a row with
`render={<a …>}` and a row without it look the same until focus or a pointer
lands on them.
What I did: shipped it that way, and said so here. The row is still a real
link — cursor, status bar, context menu, focus ring and AT all report it.
Why: the affordance is a visual decision, and adding a chevron or a hover fill
now would be taking Phase G.1's decision in Phase C.
What I need from Ben: **Phase G.1 owes this row its affordance** — a trailing
chevron is the obvious candidate, and it would make `media` and a trailing
slot the row's two ends.

## LinkList — the empty state drops the list's accessible name
Where: src/LinkList.tsx, the `items.length === 0` branch
What I checked: this is ContentList's open question ("the empty state loses the
list's accessible name") arriving a second time. The alternatives each mislead:
an empty labelled `<ul>` announces "list, 0 items" and says less than the
sentence does; a `<ul>` holding the message as its one `<li>` announces a count
that is a lie; a labelled `<section>` makes every empty list a landmark.
What I did: rendered a paragraph, matching ContentList, and did not re-decide
it here.
Why: one component should not answer a question the component beside it has
open — whatever is decided should be decided for both at once.
What I need from Ben: **one decision covering ContentList and LinkList.**

## LinkList — no trailing slot, so a row cannot carry a control
Where: src/LinkList.tsx, LinkListItem
What I checked: an item carries `media`, `headline` and `meta`. A diary row
that needs a per-row action (delete, favourite) cannot have one: a button
inside the row would be a control inside a link, which is exactly the nesting
that rules RadioCards out for this job in the first place.
What I did: nothing. The brief specifies the item's fields and I kept to them.
Why: the fix is not a slot — it is L4's card anatomy, where the controls are
positioned into a float spacer as SIBLINGS of the link rather than inside it.
What I need from Ben: **a note that per-row actions are out of scope** until a
screen needs them, and then that they arrive as L4 geometry, not as a child of
the row.

## Timeline — `headingLevel` is not in the brief's API, and it had to be
Where: src/Timeline.tsx, TimelineProps
What I checked: the brief specifies `label`, `groups` and `className?` and says
"renders a heading per group". A heading needs a level, and ContentBox's own
comment says the level is "never guessed" because it depends on where the
component sits. Hardcoding one would guess.
What I did: added `headingLevel?: HeadingLevel`, defaulting to 3 — the same
default and the same type ContentBox already uses.
Why: consistency with the one component in the set that already had this
problem, and it is optional, so a consumer written against the brief's API
still compiles.
What I need from Ben: **confirmation**, since it is an addition to a specified
API rather than a question about the repo.

## Timeline — nothing enforces that group order matches the labels
Where: src/Timeline.tsx
What I checked: the element is an `<ol>` because the sequence of groups is the
meaning. The component cannot verify that: it never parses a label, so a
consumer that sorts its groups wrongly gets an `<ol>` asserting an order the
dates contradict.
What I did: nothing. Checking would mean parsing a date, which is the one thing
this component must not do.
Why: the sort belongs to whatever produced the groups — a query's `order by`,
not a presentation component.
What I need from Ben: nothing, just flagging — the diary screen owes its own
ordering.

## Timeline — a group is not visually bounded, only headed
Where: src/musy-components.css, the TIMELINE block
What I checked: a group is a heading plus its body at 16px, and the next group
is 32px below. The grouping reads off the gap ladder alone: no rail, no rule,
no surface. That satisfies L2's doubling check, and L2 also says that when a
grouping is ambiguous "the fix is a divider or a shared surface, never a bigger
gap" — which is a decision this basic version does not take.
What I did: shipped the gaps only, and did not invent a rail or a marker.
Why: the rail is the whole visual idea of a timeline, and it is Phase G.1's.
What I need from Ben: **Phase G.1 should decide the group boundary** — rail,
divider or shared surface — rather than letting each screen pick one.

## musy-components.css — the section numbering is already inconsistent, so the two new blocks are unnumbered
Where: `src/musy-components.css`, the `/* ═══ n · NAME ═══ */` headers
What I checked: Level 1, the stylesheet's own headers. **§15 appears twice** —
`15 · SEGMENTED CONTROL` and `15 · FIELD`. **§17–22 are missing entirely**:
the sequence runs `16 · INTERACTIVE WIZARD` and then jumps to `23 · TOAST`.
(§3 is absent too — HINT lives inside the ICON BUTTON block.) And the three
most recently added blocks — `BADGE`, `MUSIC PLAYER`, `RECORD BUTTON` — carry
**no number at all**.
What I did: wrote `LINK LIST` and `TIMELINE` unnumbered, following the recent
precedent rather than inventing a number.
Why: every free number is free for a reason nobody recorded, and guessing one
would either collide again or claim a gap that meant something.
What I need from Ben: **a decision** — either renumber the whole sheet once, or
declare the numbers retired and drop them from the older headers too. As it
stands a cross-reference of the form "§15" is ambiguous, the same way §7.24 is
ambiguous in `docs/07-components.md` (logged in Batch A).

---

# Phase C.10 — the system's own words, and what it closes

_Written 2026-09-19. `src/locale.ts` gives the package its own chrome
catalogue: a `MusyLocale` type (`'de' | 'en'`), `musyTextDe` / `musyTextEn`,
a `MusyLocaleProvider` and a `useMusyText()` hook. 19 components across 18
files (`MusicPlayer.tsx` holds two) now read their default user-visible strings
from it. **Per-call props still win** — the catalogue only changes what a prop
falls back to. `Badge.statusWord` and `Message.statusWord` are new props for
two strings that previously had none._

_Recorded here rather than edited into the entries above, because this file is
append-only. Each entry names the questions it closes, in their own heading
text, so they can be found._

## The language split is closed at the source — every German/English default entry above
Closes, by making the language a property of the tree rather than of each
component:

- "**Session — prototype copy is English, several components default to
  German**" (Step 1) — the session-level entry the rest of these point at.
- "**ContentList — `emptyLabel` defaults to German in an English prototype**"
  (Batch A).
- "**RadioGroupText — the Empty story shows the German default `emptyLabel`**"
  (Batch C).
- "**Lightbox — `closeLabel` defaults to German, the prototype renders
  "Close"**" (Batch C).
- "**CtaButton — `loadingLabel` defaults to German and `loading` is never used
  in the prototype**" and "**IconButton — `loadingLabel` defaults to German
  while every caption around it is English**" (Batch B).
- In the story Build notes only, with no log entry of their own: Toast's
  "`dismissLabel` defaults to German while the component's own copy is
  otherwise caller-supplied", and DraggableList's "every default string is
  English while the earlier components default to German".

Where: `src/locale.ts`, and the `useMusyText()` call in `src/Badge.tsx`,
`ContentList.tsx`, `CtaButton.tsx`, `DraggableList.tsx`, `Field.tsx`,
`IconButton.tsx`, `InteractiveWizard.tsx`, `Lightbox.tsx`, `Message.tsx`,
`MusicPlayer.tsx` (MusicPlayer and TrackButton), `PhotoUpload.tsx`,
`ProcessVisualisation.tsx`, `RadioCards.tsx`, `RadioGroupImage.tsx`,
`RadioGroupText.tsx`, `RecordButton.tsx`, `Toast.tsx` and `VoiceNote.tsx`.

What it does NOT close: the app's own rule. `apps/web` still passes every
user-visible string explicitly (CLAUDE.md rule 7) — a default in either
language is wrong in the other. What changed is only what shows when a screen
forgets.

## Badge and Message — the status words now have a prop, and a locale
Closes the part of the problem no log entry could name, because there was
nothing to pass: `STATUS_WORD` was a module constant in both files, so
*Hinweis / Warnung / Erfolg / Fehler* reached the screen reader in German no
matter how disciplined the consuming screen was. Recorded in
`reference/INVENTORY.md` §7 under "English copy with no prop to override it"
("`Badge` / `Message` status words — `STATUS_WORD` is a module constant with no
prop — the German words cannot be overridden either").
Where: `src/Badge.tsx:58` and `src/Message.tsx:59` — the new optional
`statusWord`, falling back to `t.statusInfo` / `statusWarning` /
`statusSuccess` / `statusError`. `Field.errorWord` falls back to
`t.statusError` from the same four.

## DraggableList — "the row action copy has no prop at all" is now FACTUALLY FALSE
Not superseded — **false**. The entry is "**DraggableList — the row action copy
has no prop at all**" (Step 3 · Batch E, above), and it claimed that "Discard",
"Save", "Delete", "Edit", the handle and chevron `aria-label`s and all five
keyboard live-region announcements are hardcoded English in the JSX with no
prop.

Every string it names now comes from the catalogue: `dragDiscard`, `dragSave`,
`dragDelete`, `dragEdit`; `dragHandleLabel(noun, position)` and
`dragShowActions` / `dragHideActions` for the two tool buttons;
`dragItemLabel(noun, position)` for the row headline; `dragItemNoun`,
`dragListLabel`, `dragEmptyHeadline`, `dragEmptyText`, `dragListening`,
`dragHearing`; all four drop hints (`dropCombine`, `dropBefore`, `dropAfter`,
`dropCancel`); and all five announcements (`dragLifted`, `dragDropped`,
`dragCancelled`, `dragMoved`, `dragMerged`).
Where: `src/locale.ts:131-160`, consumed in `src/DraggableList.tsx`.

The claim is **still asserted in three places outside this log**, and all three
are now wrong. They are named here rather than changed, because this bookkeeping
pass owns only this file:

1. `packages/design-system/stories/DraggableList.stories.tsx:82-86` — the Build
   notes block, "**DraggableList — the row action copy has no prop at all.**"
   Its `itemNoun` argType in the same file has already been updated to say
   "Defaults to the locale catalogue", so the file now contradicts itself.
2. `packages/design-system/stories/DraggableList.stories.tsx:75-80` — the
   neighbouring block, "**every default string is English while the earlier
   components default to German**", which the section above closes.
3. `reference/INVENTORY.md:679-683` — the "English copy with no prop to
   override it" table, five rows: `'Discard'`/`'Save'`, `'Delete'`/`'Edit'`,
   the handle `aria-label`, the chevron `aria-label`s and the five keyboard
   announcements. Its §7 "English defaults" table (`:657-658`) is stale in the
   same way, as is the German table at `:645-650`.

What I need from Ben: nothing to decide — but the Build notes are the artefact
CONVENTIONS §8 says must match this log, so the two DraggableList blocks want
rewriting before the next reader trusts them. `reference/` is a vendored
snapshot and may be meant to stay stale; Phase B.1 already ruled that it keeps
the old accent names for that reason.

## DraggableList — `DropHints` is in the barrel now, and the prop is `Partial`
Closes: "**DraggableList — `DropHints` is exported from the module, missing
from the barrel**" (Step 3 · Batch E).
Where: `src/index.ts:81` now exports `DropHints` alongside
`DraggableListProps`, `DraggableItem`, `DropMode` and `CombineOrder`, and
`src/DraggableList.tsx:105` widens the prop to `dropHints?: Partial<DropHints>`
so a consumer can override one hint without restating four.
Note `reference/INVENTORY.md:478` still lists `DropHints` as missing from
`index.ts`.

## InteractiveWizard — the reachability rule is one implementation now
Where: `src/wizardSteps.ts` (`wizardStepState`, `isWizardStepReachable`),
exported from `src/index.ts:35`, imported by `src/InteractiveWizard.tsx:37` and
by `apps/web/src/lib/sessionMachine.ts:30`.
What I checked: the app had its own copy of "a step is reachable when its
predecessors are done"; the component derived the same thing inline. Two
implementations of one rule is the state where a screen and the stepper it
draws can disagree about which step is locked.
What I did: nothing — recording it. It is the same shape of fix as the locale
catalogue: the system owns the rule, the app consumes it.
What I need from Ben: nothing, just flagging.

## OPEN QUESTION — the catalogue defaults to GERMAN, and Phase B.1 answered "English"
Where: `src/locale.ts:332` (`DEFAULT_MUSY_LOCALE: MusyLocale = 'de'`) vs
"**Component defaults — English — ANSWERED**" (Phase B.1, above).

The tension, with both readings stated and neither taken:

**What B.1 decided.** "13 German strings across 11 components become English",
on the grounds that `en.ts` is the source of truth `de.ts` is typed against, so
English defaults match the direction the app already resolves in, and it was
13 edits rather than 25.

**What C.10 shipped.** With no `MusyLocaleProvider` mounted, `useMusyText()`
returns `musyTextDe`. `src/locale.ts`'s own header gives the reason: the app is
German-primary, and every component comment in the set that named a language
named German as the reason.

**Who is affected.** For **Lightbox**, **ContentList**, the three radio groups,
**Message**, **Toast**, **CtaButton** and **IconButton** the unwrapped output is
byte-identical to what it always was — those defaults were already German. It
**changes** the unwrapped output from English to German for **RecordButton**,
**VoiceNote**, **PhotoUpload**, **DraggableList**, **TrackButton**,
**MusicPlayer**, `Field.errorWord`, and the wizard's four state words.

**Where that shows.** Not in the app: `apps/web/src/main.tsx:64` mounts
`MusyLocaleProvider` with the active locale, and every screen passes its strings
explicitly regardless. It shows in **Storybook**, which mounts no provider — so
those eight now render German on their docs pages, where they rendered English
before, and the stories that documented an English default now document a
German one.

**The two readings.**
- *German is right.* The product is German-primary; an unprovidered component is
  a bug in the consumer, and the fallback should fail in the language the
  product actually ships. B.1's "13 edits vs 25" argument was about editing
  hardcoded literals, and the catalogue makes the count irrelevant — both
  languages are written out in full either way.
- *English is right.* B.1 is an answered decision in this log and this silently
  reverses half of it. `en.ts` is the typed source of truth; Storybook is where
  the system is reviewed and it now shows a language the reviewer did not
  choose; and "unwrapped behaves as before" would have held for the whole set.

A third option nobody has taken: mount `MusyLocaleProvider` in
`.storybook/preview.tsx` with a locale toolbar, which makes the question
visible in the place it shows rather than answering it once for everyone.

What I need from Ben: **a decision on `DEFAULT_MUSY_LOCALE`** — and, whichever
way it goes, one line appended to the B.1 "Component defaults — English"
entry's successors here saying so, because the two currently disagree in
writing.

---

# Phase C · after the fact — one gap the app hit

## InteractiveWizard — there is no *skipped* state, and a cardless exercise needs one
Where: `src/InteractiveWizard.tsx`, `src/wizardSteps.ts` (`WizardStepState`),
consumed by `apps/web/src/lib/sessionMachine.ts`

What I checked: `WizardStepState` is `'disabled' | 'active' | 'selected' |
'completed'`, and the state words are `gesperrt / verfügbar / aktuell /
erledigt`. Two of the three exercises draw no cards — `exercises.needs_cards`
is false for Breathing Score and Body Scan Soundwalk — so their run has nothing
to scan, and the designer's decision (D14) is that the rail **still shows four
markers with scan visibly skipped** rather than showing three.

None of the four existing states says that:

- `completed` draws a check mark, which claims the user did a step they never
  did. In a rail above a diary that later reports what happened, that is a
  small lie with a long life.
- `disabled` reads as *not yet* — locked pending something — when the truth is
  *not part of this run at all*, and no sequence of completions will ever open
  it.
- `active` and `selected` are plainly wrong.

What I did: nothing in the component. The app side is handled — `sessionMachine`
carries a `skipped` list and filters it out of the step list it passes to
`isWizardStepReachable`, so the RULE is right and only the PRESENTATION is
missing. Six regression tests cover the machine.

Why: adding a fifth visual state is a Layer 2 design decision with a token, a
state word in two languages and an a11y story attached, and D.4 is the step
that actually renders the rail.

What I need from Ben: **a fifth `WizardStepState`, or a deliberate reuse of
`disabled`.** If it is a new state it needs a name, a treatment and a word in
both catalogues (`src/locale.ts` now owns those). If it is `disabled`, that
should be written down as a choice rather than left looking like the component
could not express the difference. D.4 is blocked on it in the sense that it
will otherwise pick one silently.

## ContentBox — a lone Badge in the `header` slot stretches edge to edge
Where: `src/musy-components.css` (`.musy-box__header`), `src/Badge.tsx`,
hit by `apps/web/src/routes/DiaryEntry.tsx`

What I checked: `.musy-box__header` is a flex COLUMN, so its default
`align-items: stretch` pulls an `inline-flex` `.musy-badge` to the full width
of the box. A single status badge renders as a bar across the entry, which
reads as a banner rather than a chip.

What I did: used `BadgeRow`, which ContentBox's own header comment names for
this and which lays badges out at their natural width. It costs a `<ul>` of one
item, announced as "list, 1 item" — a small a11y wart to avoid a visual one.

Why: the real fix is an `align-self` INSIDE the package, and a screen must not
reach into a component's own geometry (10-layout.md L14's opening rule, and
L7). Working around it in the app would have been the exact thing rule 1
forbids.

What I need from Ben: **one line of CSS in the package** so a bare `Badge` can
sit in a `header` slot without `BadgeRow` around it — or a note in ContentBox's
docs that `BadgeRow` is mandatory there, which is also a fine answer as long as
it is written down.

## TrackButton — `label` and the action verb are both announced, so a named button says itself twice
Where: `src/MusicPlayer.tsx` (`TrackButton`), used by
`apps/web/src/routes/DiaryEntry.tsx`

What I checked: `TrackButton` shows the action verb and announces
`` `${label}` `` alongside it, on the assumption that `label` is the TRACK
(announced, never shown). The diary has no track name to give it — `tracks.title`
is withheld from the client by column grant — so it passes the control's own
purpose, *Listen again*. The result announces "Start Listening, Listen again".

What I did: passed it anyway, and left play/pause/replay to the locale
catalogue. Mildly redundant is better than fabricating a title.

Why: the redundancy is one string; inventing a track name in a product whose
whole premise is an unprimed listener is not a trade worth making.

What I need from Ben: nothing urgent — no track plays until E.4. Worth knowing
that a `TrackButton` whose `label` were OPTIONAL (falling back to the action
verb alone) would fit the nameless case exactly, and that case now exists.

## Lightbox — a route-driven one names its content TWICE in the accessibility tree
Where: `src/Lightbox.tsx` (`Dialog.Title`), hit by
`apps/web/src/routes/DiaryEntry.tsx`

What I checked: `Lightbox.title` is required, and rightly — a modal with no
name announces as "dialog" and leaves a screen-reader user with no idea what
came forward (4.1.2). When the framed content already shows that title, the
documented answer is `titleHidden`. But `titleHidden` does not remove the
element: the string then exists as an sr-only `<h2>` (Dialog.Title) AND as the
visible `<h3>` ContentBox headline, so the name is announced twice.

`SettingsSheet` solves the same problem by making `Dialog.Title` *be* the
visible heading through base-ui's `render`. `Lightbox` renders `Dialog.Title`
itself and exposes no `render`, so a consumer cannot collapse the two.

What I did: used `titleHidden` and commented it. Did not work around it.

Why: the fix is a component change — a `titleRender` prop, or labelling the
popup with `aria-labelledby` pointing at the framed content's own heading — and
a screen must not reach into a component's internals (L14, L7).

What I need from Ben: nothing urgent; it is a duplicated announcement, not a
missing one. Worth fixing when Lightbox is next opened, because every
route-driven lightbox will have it.

## Lightbox — the rule reserving space for the close button is silently dead under `titleHidden`
Where: `src/musy-components.css`, the
`.musy-lightbox__popup > .musy-box:first-child .musy-box__headline` rule

What I checked: MEASURED — `padding-inline-end` computes to `0px` on the box
headline inside a `titleHidden` lightbox. The selector wants the ContentBox to
be the popup's FIRST CHILD, and with `titleHidden` the sr-only `Dialog.Title`
is first, so `:first-child` never matches and the close button's column is
never reserved.

Harmless today, and measured as such: `.musy-box__headline` has a narrow
measure, so a 60-character German title wrapped at ~250px — `headRight 492`
against `closeLeft 731`, well clear. It fails only for a long unwrapped title.

What I did: nothing. Did not touch the stylesheet.

Why: it predates this change — the existing `TitleHidden` story has the same
hole — and changing a shared selector to fix a case that does not currently
collide is the kind of edit that breaks the case that does.

What I need from Ben: nothing, just flagging. The rule reads as protection and
is not providing any; whoever next touches Lightbox's CSS should either make
the selector match (`:has()`, or a class) or delete it.

---

# Phase D.0 — the component work Phase D was blocked on

_Written 2026-09-19. B.1 answered four questions and assigned the consequences
to B.2; only the accent rename had landed. D.0 is the rest of B.2, done inside
Phase D because three screens could not start without it._

## Carousel — built, and not one line of CSS was written for it
Where: `src/Carousel.tsx` (new), `src/musy-components.css` section 8,
`src/index.ts`

What I checked: `.musy-carousel` has ~200 lines of complete, commented CSS —
container-relative slide widths (`66cqi`, `82cqi` under 420px), scroll-snap,
the 12px-mark/24px-target dots, the active dot's pill with its ordinal, and an
explicit decision against `scroll-behavior: smooth`. There was no component, no
export, and nothing in the package rendered any of it.

What I did: wrote the component to the markup the stylesheet already describes,
and changed no CSS at all. The API follows the split the CSS header states —
"the consuming app only owns the selected index and calls scrollTo()" — with
one correction: the component owns the scroller (a debounced settle listener
and a `scrollTo` effect) and the app owns the INDEX. Handing a ref out so the
app could call `scrollTo` itself would have made every consumer reimplement the
same two effects.

Why the app owns the index rather than the component: D.1's CTA unlocks on the
furthest slide ever SEEN, which is a fact about the session, not about the
carousel. A component holding its own index could not express it.

What I need from Ben: nothing on the component. **One copy decision**, below.

## Carousel — the prototype's slides have a `body` and nowhere to put it
Where: `reference/design_system/Musy MVP 0.3.dc.html`, `_onboarding`

What I checked: each of the five onboarding slides carries `title`, `body` and
a glyph path. The card markup renders the badge and the title only, and section
8 declares `.musy-carousel__badge` and `.musy-carousel__title` and no third
part. So the five second lines were written and never displayed — in the
prototype as much as here.

What I did: `CarouselSlide` is `{ id, title, glyph }`. No `body`.

Why: adding a part the stylesheet has no rule for would be inventing a
component rather than building the one that was specified.

What I need from Ben: **a decision, and it is copy rather than code.** Either
the five second lines are cut for good, or section 8 needs a body part and the
cards get taller. D.1 ships titles only until then, and the strings are still
in the prototype.
**ANSWERED 2026-09-20 — CUT, and deleted at the source.** Ben's decision: the
five second lines go, and the carousel card keeps a badge and a title. So
`CarouselSlide` stays `{ id, title, glyph }` permanently rather than pending a
decision, section 8 needs no body part, and the cards do not grow.

The five strings are deleted from `_onboarding` in
`reference/design_system/Musy MVP 0.3.dc.html` as well, which is the only place
they existed — they were never in the app's catalogues, because they were never
rendered. `reference/` is normally left alone as a record of what was
specified; this is an exception Ben asked for, and the reason is that the
strings were not a record of anything shipped. They were written and never
displayed, in the prototype as much as here.

## ContentBox — `headingLevel` gained 1, because a screen's main content is a box
Where: `src/ContentBox.tsx`, `HeadingLevel`

What I checked: the union was `2 | 3 | 4 | 5 | 6`. About Musie's greeting and
About you's question are each ONE box that is the whole screen, so the box's
headline is the page's `h1` — and the prototype's own markup agrees: its
greeting is `<h1 class="musy-box__headline" data-type-step="display-lg">`.

The two alternatives were both worse. A visually hidden `h1` above the box puts
the same string in the accessible tree twice, which is exactly what
`SettingsSheet` avoided by making `Dialog.Title` the `h1` itself. A page with
no `h1` at all is a real defect rather than a stylistic one.

What I did: widened the union to `1 | 2 | 3 | 4 | 5 | 6`. The default is still
3 and the level is still never guessed — a box has to be ASKED to be an `h1`.

What I need from Ben: nothing, just flagging that `HeadingLevel` is shared with
`Message`, `RadioCards`, `Timeline` and `LinkList`, so the type is now wide
enough to let somebody make a `Message` an `h1`. The prop's own doc comment is
what argues against that, as it already did for levels 2 to 6.

## RadioCards — `facts` and `glyphLegend` landed; the anatomy was right and the API was missing
Where: `src/RadioCards.tsx`, `src/index.ts`

What I checked: `.musy-rcard__facts`, `.musy-rcard__fact` and
`.musy-rcard-legend` are all in the stylesheet, fully written, with comments
explaining the auto-margin that pins the facts to the foot of the text column
and why the legend sits above the group. §7.13's anatomy shows both. The
component had neither, which is the entry logged in Batch C.

What I did: `RadioCardOptionRich.facts` and a group-level `glyphLegend`, each
fact wrapped in `Hint` so its full sentence is announced AND available as a
hover bubble, with `shortText` the only part drawn beside the glyph. No CSS.

Why `shortText` is optional: "2–12 min" has a short form worth drawing; "needs
your Mindfulness Cards deck" does not, and a card that spelled all three out
would be a paragraph pretending to be a row of chips.

What I need from Ben: nothing. This closes the Batch C entry above.

## RadioCards — the card is a `<button>` containing an `<h3>` and a `<p>`
Where: `src/RadioCards.tsx`, `Radio.Root render={<button type="button" />}`

What I checked: `<button>` takes PHRASING content only. The component renders
`<H className="musy-rcard__headline">` (a real heading, by `headingLevel`) and
`<p className="musy-rcard__desc">` inside it, which is invalid HTML. The
prototype's own markup used `<span>` for both. This PREDATES D.0 — adding
`facts` put more phrasing content inside the same button but did not create the
problem.

What I did: nothing. Left both elements as they are.

Why: changing the heading to a span would remove the cards from the document
outline, which is the thing `headingLevel` exists for and which §7.13
specifies. Changing it is a design decision about whether a chooser's options
belong in the outline at all, and it is not D.0's to make.

**MEASURED 2026-09-20, because Ben asked why.** Three findings, and the first
two contradict what this entry assumed:

**1 · It is the SPEC's shape, not an implementation slip.** §7.13's anatomy
block draws it literally — `h2–h6.musy-rcard__headline` and `p.musy-rcard__desc`
nested inside `Radio.Root.musy-rcard__body`. The component implemented what was
specified. The PROTOTYPE used `<span>` for both, so the headings were
introduced by the spec rather than carried over from the markup.

Why the spec did it: two of its own rules collide. *"The whole card is the
control"* — one focusable element, no nested interactive children (4.1.2) —
and *"`headingLevel` is never guessed"* (1.3.1), because a card is a titled
thing and a chooser of titled things should be navigable by heading. Satisfy
both and the heading has nowhere to go but inside the button.

**2 · Nothing is hoisted, and the headings DO reach assistive tech.** Measured
in Chrome against the running app: `.musy-rcard__body` is a `BUTTON`, the
headline is an `H2`, `card.contains(headline)` is `true`, and Chrome's own
accessibility tree exposes three `heading` nodes at level 2 with the right
names. The content-model rule is enforced by the HTML PARSER, and React builds
the DOM node by node rather than parsing markup, so it never runs. So
`headingLevel` is doing exactly what it claims — this entry previously implied
it might not be.

The risk is narrower than "invalid": it is a round trip through markup. Server
rendering, `innerHTML`, a sanitiser or a copy-paste of the rendered HTML would
each hoist the heading out of the button and change the tree. Musie has no SSR
today, so nothing exercises it.

**3 · The heading is not the interesting defect. The radio's NAME is.** Because
the whole card is the control and a button takes its name from its contents,
each radio announces as ~290 characters:

> "The Mindfulness Cards deck laid out on a table Quick Mindfulness Break Nine
> paper cards, one feeling each. Scan the card you relate to and listen to the
> track behind it. Takes 2 to 12 minutes Needs your Mindfulness Cards deck
> Sound on — headphones recommended About 15 minutes"

That is the image alt, the headline, the description, all three facts AND the
meta label, run together, read before the word "radio". It is inherent to
card-as-control and has nothing to do with the heading element — swapping both
back to `<span>` would not shorten it by a character.

What I need from Ben: **nothing on the heading.** It is specified, it works,
and it is only fragile against a round trip this app never makes. **The name is
worth a decision**, though: an `aria-label` on the radio carrying just the
headline would make the group readable, at the cost of the facts no longer
being announced with the option — which is exactly what the visually-hidden
fact sentences were added FOR. Not Phase D's to settle, and a real trade.

## The wizard's fifth state — built as a state, not as a reused `disabled`
Where: `src/wizardSteps.ts`, `src/InteractiveWizard.tsx`, `src/locale.ts`,
`src/musy-components.css`

Answered under "InteractiveWizard — there is no *skipped* state" above. Two
things the implementation added that the question did not anticipate:

**The connector had to be folded, not read per step.** `data-complete` was
`done.has(step.id)`, which leaves a GAP either side of a skipped step — the run
visibly passes through it, so the line has to as well. It is now a running
value carried along the map: a skipped step inherits the connector before it
and passes it on. A run with nothing skipped renders exactly as before.

**`skipped` is checked FIRST in `wizardStepState`,** before `current` and
before `completed`. A skipped step cannot legitimately be either, and if a
caller puts one in both lists the honest answer is still that it is not in the
run — reporting 'selected' would hand the screen a step it has nothing to draw.

What I need from Ben: nothing.

## G3 landed, and it changed one rendered value
Where: `tokens/musy-foundations.css`, `tokens/musy-foundations.tokens.json`,
`src/musy-components.css`

What I checked: the two raw `--sand-8` references were
`.musy-btn--secondary:hover` and `.musy-icon-btn--secondary:hover`, both of
which already take `--interactive-ghost-hover` for their background — which is
why Ben's name, inside the ghost family, is the right one.

What I did: `--interactive-ghost-border-hover: var(--sand-8)` in Layer 1 beside
`--interactive-ghost-border`, with the `prefers-contrast: more` and
`forced-colors: active` overrides B.1 said it would need, plus the DTCG mirror
so it does NOT become a new row in TOKEN-DRIFT.md.

**One rendered value changed, and it is an improvement rather than a rename.**
Under `prefers-contrast: more` the raw `--sand-8` stayed `--sand-8`; the token
now steps up to `--sand-11`, so an outlined control's hover edge is no longer
the one boundary on screen that does not respond to the setting.

What I need from Ben: **nothing blocking, one gap flagged.** `tokens/_audit.json`
has a row for `interactive-ghost-border` and none for the hover token. The
value is unchanged from what shipped, so nothing regressed — but the contrast
pair has never been measured under its own name, and the audit is where that
belongs.

## ProcessVisualisation is gone
`src/ProcessVisualisation.tsx`, `stories/ProcessVisualisation.stories.tsx`, the
two exports and the `8b · PROCESS VISUALISATION — RETIRED` CSS section (84
lines) are all deleted. The three defects logged against it above — the German
`ordinalPrefix`, the hardcoded `<h3>`, the dividers carrying only `aria-hidden`
— died with it and needed no fix.

`locale.ts` keeps `stepPrefix`, which was its ordinal word: Carousel's dot pill
needs exactly that string and would otherwise have invented a second one.
`stories/PROTOTYPE-USAGE.md` still describes the component in two places; it is
a record of what the prototype used, so it is left alone.

## ScrollSnap — a story for a hook, which CONVENTIONS.md does not describe
Where: `stories/ScrollSnap.stories.tsx`, against `stories/CONVENTIONS.md` §1,
§4 and §6

What I checked: every rule in CONVENTIONS.md assumes a component with props.
§1 names the file after the component, §4 wants one `argTypes` entry per public
prop and `satisfies Meta<typeof X>` so a misspelt prop is caught, and §7 sources
the docs text from the component's header. `useScrollSnap` is a hook: it renders
nothing, takes one optional boolean, and has no component to point `component:`
at. `useViewportFill` and `useCoarsePointer` have no stories at all, so there is
no precedent in the folder either.

What I did: `satisfies Meta` with no type argument, no `component`, no
`argTypes`, and the panels in the file are a harness rather than the subject.
Docs text still comes from the source — the hook's header and the SCROLL SNAP
section of `musy-components.css` — so §7 is honoured as written.

Why: the alternative is no story, and this is the one behaviour in the package
that cannot be exercised anywhere else. In the app it sits on the listen step
behind a seeded exercise, an audio track and a ninety-second gate.

What I need from Ben: **nothing blocking.** If more hooks get stories,
CONVENTIONS.md wants a short section saying what a hook story owes — probably
"no argTypes, and the harness is named in the file header".

## ScrollSnap — singlePane, not the default bothThemes
Where: `stories/ScrollSnap.stories.tsx` meta, against CONVENTIONS.md §6

What I checked: §6 makes `bothThemes` the default and lists two escapes —
container-query components take `fixedWidth`, and a component that portals to
the document root takes `singlePane` because two panes would fight over one
popup. This is neither, but it is the same shape as the second: the hook sets
`scroll-snap-type` on `<html>`, and there is one `<html>` per preview. Two
panes would put two runs of full-viewport views inside one scroller, which
would snap between panels of both.

What I did: `singlePane`.

Why: the story is about a document-level mode, and §6's own wording for
`singlePane` — "a story that is *about* the theme mechanism" — is the same
category, a story about something the document owns rather than the component.

What I need from Ben: **nothing, just flagging.** The colour story is not lost:
nothing here is themed. Every panel's fill comes from the decorator's pane.

---

# User testing 2026-09-24 — the rail's second line

## InteractiveWizard — the state word is spoken, not drawn
Where: `src/InteractiveWizard.tsx`, `src/musy-components.css` §17
What I checked: two entries in this log, both from Batch C and both about this
one prop. The first said `showStateWords`'s doc comment described the inverse
prop; the second said the default was `true` while the prototype rendered none,
and asked for a decision. Both were waiting on the same answer.
What I did: Ben's answer from user testing is that the word is not drawn at
all. Removed the visible `.musy-wizard__hint` line and the `showStateWords`
prop; the word is now the tail of the trigger's `aria-label` — "Hören,
aktuell" — and nothing else. Deleted both entries from the stories file's
Build-notes block, which says to delete an entry once it is answered; they are
preserved above.
Why: the marker already says the state in ink to anyone who can see it — the
check IS "erledigt" — so the line was a second telling. It is the only telling
for anyone who cannot see it, which is why it moved rather than went.

Two measurements, both in the app on the local stack, both locales, because
neither was what I assumed:

1. **It cost no height.** The trigger is 60px with the second line and 60px
   without it — the 44px marker sets the height and two short lines fit inside
   it. Anything arguing this change from vertical space is arguing from
   something that was not true. It is a redundancy fix.
2. **`.musy-sr-only` was the obvious implementation and it was wrong.** A
   hidden span is absolutely positioned, and Chromium then computes the name
   with a space in front of the comma: "Intro , current". No markup takes that
   space out. The word went to `aria-label` instead, which the trigger can
   afford because its only other content is the `aria-hidden` marker — nothing
   visible is overridden, and the name still opens with the visible label, so
   2.5.3 Label in Name holds. Worth knowing the next time a component in this
   package needs a word spoken and not drawn: the span is right when it sits
   BEFORE the visible text (Badge, Message, Field all do), and wrong when it
   trails it.

Also worth recording: before this change the name was "Intro current", with no
punctuation at all, because two adjacent inline boxes concatenate. The comma is
new.
What I need from Ben: **nothing.** One thing is deliberate and worth knowing:
the selected step still announces its position twice, once from the state word
and once from `aria-current="step"` — "Select Card, aktuell" plus the
platform's own "current step". The Batch C entry flagged it; removing the word
for the selected state alone would make the five words four and leave one state
with no spoken form of its own, so it stays. Say the word if a screen reader
makes it grating in practice.

## InteractiveWizard — no vertical-centring rule was needed
Where: `src/musy-components.css`, `.musy-wizard__trigger`
What I checked: the brief asked for the remaining text to be vertically
centred. `.musy-wizard__trigger` is already `display: flex; align-items:
center`, and `.musy-wizard__list` / `.musy-wizard__step` are `align-items:
stretch` so every trigger takes the height of the tallest.
What I did: nothing beyond deleting the hint rule. What was centred before was
the label AND the state word as a pair, which put the name above the marker's
centre; with the pair down to one line the existing rule centres the name
itself. Checked the `vertical` variant too — it restacks the list, not the
trigger, so the trigger keeps `align-items: center` there as well.
Why: a rule that restates what the cascade already does is a rule that can
later disagree with it.
What I need from Ben: **nothing, just flagging** that the fix was a deletion.

## Carousel — the swipe had no affordance at all, and the cause was arithmetic
Where: `src/musy-components.css` section 8, `src/Carousel.tsx`
What I checked: the 260925 user testing — nobody swiped the onboarding
carousel. Measured in the running app at 393px before changing anything: the
carousel is 311px, the `@container (max-width: 420px)` rule made a slide 82cqi
= 255px, and with an `--sp-5` gap the geometric sliver of the next card was
4px — which `transform: scale(0.9)` on the off-centre card then pulled 12.75px
further out. **The neighbour's painted edge began 8.8px past the frame.** At
430px, −6.9px. At 1024px, +59.6px, which is why nobody caught it: the defect
only exists on a phone, and it is invisible in a desktop review and in
Storybook's own canvas unless the decorator is the 393px one.
What I did: three affordances, no copy. `68cqi` + `--sp-3` gap + 16px of card
inset gives a **measured 27.2px** of painted peek, in both locales, both
themes, at 393 and 430. A one-shot nudge animates the `<li>`s on mount, coarse
pointer only. A mouse drag on the scroller, with `grab` / `grabbing`.
Why: the peek is the affordance and it was zero. The other two cover what it
cannot: the nudge is the one that actually moves, and the cursor is the only
one of the three a mouse user can act on.
What I need from Ben: **nothing on the three. Two things to know.**

**1 · The nudge does not run under reduced motion.** It is built from
`--motion-travel-lg`, which Layer 1 zeroes, so it flattens with no branch in
the component — deliberate, and only acceptable because the peek carries the
affordance alone. If that turns out to be too little for someone who has
reduced motion on AND a touch device, the lever is the peek, not the nudge.

**2 · The English card grew a line.** A 68cqi slide at 393px puts the longest
English title on 4 lines where German stays at 3 (229px vs 204px). Paid on
purpose: the alternative was to buy the peek out of the type, and the body
floor is an accessibility token. If the extra line ever matters, `72cqi` with
an `--sp-4` gap is free — it holds 3 lines in both languages — but it only
peeks 16.4px, which is the weaker of the two affordances.

## Carousel — capturing the pointer on pointerdown silently killed tap-to-jump
Where: `src/Carousel.tsx`, `onPointerMove`
What I checked: the first cut of the mouse drag called `setPointerCapture` in
`onPointerDown`, which is the obvious place for it. While a pointer is
captured the browser dispatches the following `click` to the CAPTURING
element — so every click landed on the `<ol>` and `.musy-carousel__card`'s own
handler never ran. Measured: clicking the peeking sliver did nothing, on a
component whose stylesheet has given that card a `pointer` cursor since the
first pass.
What I did: capture at the drag slop (6px) instead. Past the slop there is no
click left to protect, and capture still does its real job — keeping a drag
that leaves the carousel from being dropped mid-gesture. Re-measured: click
the sliver 0 → 1 → 2, drag one slide, a 900px sweep still moves exactly one,
and a drag out-and-back does not register as a click.
Why: the peeking card being clickable is older than the drag and is the
gesture people try first. A new affordance may not cost an existing one.
What I need from Ben: **nothing, just flagging** that this is the kind of
defect a unit test would not have caught — `click` retargeting is a browser
behaviour, and it took driving a real one to see it.

## Carousel — the ordinal inside the active dot is cut, and nothing moved to aria
Where: `src/Carousel.tsx`, `src/musy-components.css` section 8, `src/locale.ts`
What I checked: Ben, 2026-09-25 — get rid of the "Schritt 1" label in the
dots, and move it to the aria layer if necessary. **It was not necessary, and
that is worth writing down rather than assuming.** The span was
`aria-hidden="true"` and the dot `<button>` already carried
`aria-label={carouselGoTo(i + 1, total)}` — "Zu Schritt 1 von 3". No screen
reader has ever heard the pill. The position is also still on the slide
itself (`carouselSlide`, "Schritt 1 von 3: …") and the current one is still
`aria-current="true"`. Three announcements of the ordinal, none of them the
one that was deleted.
What I did: deleted the span, `.musy-carousel__dot-label`, the `dotLabel`
prop, `carouselDot` and `stepPrefix`; the app stopped passing `dotLabel` and
`about.dotLabel` went with it. The active mark is now the same 12px dot at
2:1 — `--target-min` wide, 24px — filled with `--musy-sel-fill`.
Why the pill keeps a SHAPE and not just a fill: the label was, incidentally,
the thing making current-vs-not visible without colour. Deleting it and
leaving fill alone would have walked into 1.4.1 on the way out of a copy
change. Width carries it now, deliberately rather than by accident.
Measured after: the dots row renders no text at all (`innerText` is empty),
marks are 24×12 current / 12×12 not, the row is one 24px line, and clicking
the third dot still moves to the third slide.
What I need from Ben: **nothing.** One correction to the record: the
ProcessVisualisation entry above says `locale.ts` keeps `stepPrefix` because
"Carousel's dot pill needs exactly that string". That was true and is no
longer — the pill prints nothing, so the word had no reader left and is
deleted. This log is append-only, so that entry stays as written and this is
the amendment.

## Carousel — the forward chevron demotes on touch, and does not disappear
Where: `src/Carousel.tsx` (`forwardVariant`), `src/musy-components.css`
section 8 header, `stories/Carousel.stories.tsx`
What I checked: Ben asked whether to HIDE the chevrons on touch, so the swipe
would lead. Against L5: the dots are `--target-min` (24px) and a chevron is
`--target-primary` (44px), and L5 says in as many words that 24px is
"comfortable under a cursor and tight under a thumb" — so hiding the 44px
control on exactly the pointer that needs 44px inverts the rule it is meant to
serve. Worse on this screen than in general: `/` gates its CTA on reaching the
last slide, so a reader who cannot advance cannot start a session at all.
WCAG 2.5.7 would still pass — the dots are a single-pointer alternative that
reaches every slide — but passing 2.5.7 on 24px targets that many people read
as a position indicator is a thin result.
What I did: demoted instead. On a coarse pointer the trailing control renders
`secondary` whatever `nextVariant` says; the prop is now documented as the
FINE-pointer variant. Measured on the running app at 393px: touch renders
`musy-icon-btn--secondary`, pale fill, **44×44, still a `<button>`, still
named "Nächster Schritt", not disabled**; a mouse renders
`musy-icon-btn--primary`, terracotta. Only the ink moves.
Why it is in the component and not in the screen: it is a pointer decision,
which is where L5 puts `useToolSize` too, and the same reason the nudge reads
the pointer in here rather than through a prop the app must remember.
What I need from Ben: **nothing. Two notes.**

**1 · No escape hatch, deliberately.** A consumer cannot ask for a filled
forward control under a thumb. A prop to turn that back on is a prop to
reintroduce the defect the 260925 testing found. Say so if a second consumer
ever genuinely needs one; it should be an argued exception, not a default.

**2 · The dots still do not follow the pointer.** They are hardcoded to
`--target-min` on both, which is the one place in this component that does not
do what L5 says. It was masked by the chevrons standing beside them and it is
still masked, because the chevrons are still there — but if the question of
hiding them ever comes back, growing the dots to `--target-primary` on a
coarse pointer is the prerequisite, not an afterthought.

# QR Scanner — a new Layer 2 component (2026-09-24)

## QrScanner — a component the brief never specified, built from the app's own pattern
Where: `src/QrScanner.tsx`, `src/musy-components.css` (QR SCANNER),
`stories/QrScanner.stories.tsx`
What I checked: Layer 3 L14 — a custom pattern is permitted only where the
system has no component, and one that recurs is a component request. The app
had grown `.musie-scanner` from a dashed placeholder into five states with a
camera, a mask, two icon controls and a form in it. Nothing in §7 covers a
viewfinder.
What I did: built it here, composed on §7.4 CTA Button and §7.2 Icon Button,
holding no media — `mode` is a prop, `videoRef` is attached to the `<video>`
this renders, every press goes back out. Same split §7.22 Record Button makes
with the recorder, and for the same reason: all five states are then reachable
in Storybook with no camera and no permission.
Why: it is the app's pattern, promoted, not a new idea.
What I need from Ben: **a decision on the number.** It has no §7.x — the docs
this repo carries are `10-layout.md` and `15-layout-evidence.md`, and
`07-components.md` is referenced by several components but is not here, so I
could not add a section to it or find out what the next free number is.

## QrScanner — every label is required, against the set's own convention
Where: `src/QrScanner.tsx` (`QrScannerProps`)
What I checked: Lightbox defaults `closeLabel` to `'Schließen'`, Photo Upload,
Radio Group and Content List all default their copy to the locale catalogue
(`src/locale.ts`). This component defaults none of it.
What I did: made all five labels required props with no fallback.
Why: the app's rule 7 exists because those defaults are a mix of German and
English, and this is a screen somebody reaches while holding a physical card —
a control saying the wrong thing there is worse than one saying nothing.
What I need from Ben: **a decision** — either this is the convention the set
should have been following (in which case the other components are the ones out
of step), or it is an exception that should be argued in the component's header
rather than just done. I did the latter.

## QrScanner — G3, a fourth amendment token, for ink on a scrim
Where: `tokens/musy-foundations-amendments.css`, `TOKEN-DRIFT.md`
What I checked: Layer 1 names an ink for every surface it declares except
`--alpha-scrim`, which until now nothing was ever drawn on — the Lightbox puts
a panel over its backdrop and writes on the panel. `--on-surface-inverse`
cannot serve: it is `--sand-1`, which FLIPS with the theme, while `--alpha-scrim`
is dark in both.
What I did: added `--on-scrim: light-dark(var(--sand-1), var(--sand-12))` — the
existing scale read the other way, so no new hex — and listed it in
`TOKEN-DRIFT.md` beside G1 and G2.
Why: a component-level literal would be a defect under §4, and this is exactly
what the amendments file is for.
What I need from Ben: **nothing on the value, a decision on the process.** G1
and G2 each cite a line of the brief; this one was found by a component and
cites nothing, so the amendments file's own header now says so. If Layer 1 is
still `[LOCKED]`, G3 waits there with the other two.

## QrScanner — the mask's contrast is computed, not photographed
Where: `src/musy-components.css` (`.musy-scanner__mask`, `__corner`),
`stories/QrScanner.stories.tsx` (`LiveOverAPicture`)
What I checked: the first version drew the corner brackets on the window edge,
which put half of each arm in the UNDIMMED window — invisible in the light
theme over a pale picture, which the story showed at once. Moving them one
stroke-width outside puts every arm on the scrim. Computed worst case, ink on
scrim over a near-white picture: 3.88:1 light, 7.6:1 dark, against 1.4.11's 3:1.
What I did: shipped the offset, and built the story that catches it — a
two-tone stand-in with no mid-tone, because a photograph with a comfortable
mid-grey would hide the only failure worth looking at.
What I need from Ben: nothing here; the phone check is logged in the app's own
file, where the camera is.

## Carousel — the touch demotion went one rung further, to `ghost`
Where: `src/Carousel.tsx` (`backVariant` / `forwardVariant`)
What I checked: the entry above landed the coarse-pointer demotion on
`secondary`. Ben, 2026-09-25, looking at it on a phone: go to `ghost`, and
both chevrons rather than only the trailing one. He is right about what
`secondary` was still doing — an outlined 44px circle is quieter than a filled
one but it is still a BOX, and two boxes bracketing the dots still draw the
chrome of a stepper. Ghost leaves the chevron and takes the container.
What I did: on a coarse pointer both controls render `ghost`. Measured on the
running app at 393px: fill `rgba(0,0,0,0)`, border `rgba(0,0,0,0)`, **44×44,
named, glyph present, and the leading one still `disabled` on slide 1**. A
mouse is unchanged — `secondary` back, `primary` forward.
Why it is still not hiding: everything the entry above says. The target is the
accessibility-relevant part and it did not move; what went is the fill and the
border.
What I need from Ben: **nothing. One check I did rather than assume.**
1.4.11 asks for 3:1 on what identifies a control, and ghost has no box left to
carry it — so it rests entirely on the glyph. `--interactive-ghost-on` is
`--sand-12`, measured `rgb(28,26,23)` on the card surface, which is the body
ink and far past 3:1. The disabled leading chevron sits at
`--interactive-ghost-on-disabled` (`--sand-9`) and is exempt. Nothing here
relied on the border that was removed.

## DraggableList — a thumb can now delete by swiping, and the affordance is motion
Where: `src/DraggableList.tsx` (THE SWIPE blocks), `src/musy-components.css`
(§24, "SWIPE TO DELETE, ON A THUMB"), `src/locale.ts` (`dragDeleteItem`,
`dragSwipeArmed`, `dragDeleted`)
What I checked: the list's only way out of a row was the chevron menu — two
taps behind a 24px-at-rest disclosure, on a screen whose whole content is
rows. The iOS gesture was asked for. Measured in Chromium at 393px with touch
emulation, against the real component: the row parks at the panel's own width
(122px with "Löschen" beside the glyph, floored at `--target-primary * 2`),
arms past half the row plus the 12px slop, and a release there deletes. A
vertical drag never sets `data-swiping` and never moves the card; a fine
pointer gets no panel, no `data-peek` and `touch-action: auto`. Drag, merge and
the drop indicator are unchanged with a mouse.
What I did: the gesture decides its axis rather than claiming one — past a
12px slop the larger of dx and dy wins, a tie goes to the page, and the row
takes `touch-action: pan-y` so the browser keeps the vertical scroll. The
panel is the error family at its `-surface` step, the same family §19's
recording state borrows. The affordance is a one-shot peek: the first row
drifts `--motion-travel-lg` left, shows the panel and settles, once per list,
on a coarse pointer, once the list is editable. Measured peak: −31.9997px, and
0px under `prefers-reduced-motion`, where the latch is still spent.
Why: the menu's Delete stays on every pointer, so nothing is gated behind a
gesture a cursor, a keyboard or a screen reader cannot perform — which is what
makes a motion-only affordance affordable, and is the same bargain §7.11's
nudge makes.
What I need from Ben: **two things to look at on a real phone, and one
decision.**
1. `dragSwipeArmed` is "Loslassen" / "Let go", not `dropCancel`'s fuller "Zum
   Abbrechen loslassen". It shares a ~168px strip with the trash glyph and the
   longer phrasing pushed the glyph under the card — measured, not guessed.
   The glyph says *delete*; the word only has to say *now*. If the short verb
   reads as abrupt in German, the alternative is dropping the glyph when
   armed, which costs the icon mid-gesture.
2. The parked panel is full-bleed, so its hit box extends under the card while
   only the strip is painted. No pointer can reach the covered part (the card
   is opaque and above, and a touch there closes the panel), but it means an
   "activate this element" from assistive tech would delete from anywhere in
   the row. The menu's Delete remains the canonical path and this one is
   `aria-hidden` until it is parked open.
3. Still not verified with a screen reader — same gap the keyboard path has
   carried since F.5. `dragDeleted` now announces a removal by either route,
   which is new and is a construction rather than a measurement.

## L2 — the gap ladder is audited by eye, and that is why the corrections are manual

Where: `docs/10-layout.md` L2/L3, `scripts/verify-layout.mjs`,
`tokens/musy-foundations-amendments.css`, and every `gap` in
`src/musy-components.css` and `apps/web/src/shell.css`

What I checked: Ben asked why spacing keeps needing manual correction, after
finding the nav drawer's rows sitting at 4px. I measured rather than guessed —
every `gap`, `row-gap` and `column-gap` declaration in both stylesheets,
classified against L2's ladder:

| | gaps | on the ladder | raw `--sp-N` | literal |
| --- | --- | --- | --- | --- |
| `musy-components.css` | 81 | 50 | 25 | 3 (`0`) |
| `apps/web/shell.css` | 30 | 28 | **2** | 0 |

**The app is nearly clean, and both of its exceptions are interesting.**
`.musie-nav` was `--sp-1` — 4px between controls 44px tall, where L3 says list
items sit at `--space-gap-stack`. That is the defect Ben found by eye, and it
is the only true violation in 30 declarations. The other, `.musie-typing`, is
`--sp-2` between three animated dots: the same VALUE as `--space-gap-inline`,
but not the same relationship — the ladder's bottom rung is "an icon and its
own label", and these are parts of one atom.

**The design system's 25 raw gaps are almost all that second kind.**
`.musy-field__label`, `.musy-badge`, `.musy-rcard__fact`, `.musy-clist__row`,
`.musy-mplayer__times`, `.musy-rec__meter`, `.musy-llist__meta` — twenty of the
twenty-five are 4px or 8px *inside* an atom. They are not sloppiness. **The
ladder starts at 8px and names nothing below it**, so every sub-atomic
relationship in the system is written as a number.

What I checked, second: where this branch's spacing corrections actually landed.
Three of them, and two point at the same hole:

1. **The nav rows** — a raw rung where a named one existed. A rule violation.
2. **The step headline's gap** (`apps/web/OPEN-QUESTIONS.md`): the correction
   wanted something between `--space-gap-stack` (16) and `--space-gap-group`
   (32), settled for 32, and logged the cost — *"the headline's gap now equals
   the block's own bottom margin"* — with the note that the real fix is "a
   `--space-gap-prose` rung at 24px in Layer 1, which is a design-system change
   and so not mine to make."
3. **The Carousel's peek** — moved between `--sp-5` (24) and `--sp-3` (12)
   looking for the gap that leaves a visible sliver of the next card, and
   landed on raw rungs both times, because there is nothing named in between.

**So the ladder has two holes, and every correction on this branch fell into
one of them:** nothing below 8px, and nothing between 16 and 32. Its steps run
8 → 12 → 16 → 32 → 48 → 96: three ratios of about 1.4, then one of 2.0.

What I did: fixed the nav (`--space-gap-stack`, and the rule above *Dein
Tagebuch* still clears L2's doubling check at 40 against 16). Left
`.musie-typing` alone — swapping in `--space-gap-inline` would match the pixels
and misname the relationship, which is the habit the ladder exists to break.

What I need from Ben: **a decision on which of these three to do, in this
order. The first is cheap and I can do it today; the third is not mine.**

**A · `scripts/verify-spacing.mjs`, wired into `pnpm check`.** L2 says *"After
laying a screen out, read the gaps off the computed styles and verify it"* — an
audit, done by a person, in a browser, after the fact. That is exactly the loop
that produced this round of corrections. The repo already has the machinery for
the other half: `verify-tokens.mjs` and `verify-layout.mjs` run on every
`pnpm check` and print PASS/FAIL lines. A third script would parse both
stylesheets and assert that every `gap` resolves to a ladder token or `calc()`
over one. Today it would report **2 findings in the app and 25 in the system** —
so it ships with an allowlist of the 25, each line carrying the reason it is
sub-atomic, and the allowlist shrinks to nothing the day proposal B lands. Cost:
one file, about 60 lines, no new dependency. It would have caught `.musie-nav`
before it was ever rendered.

**B · G4 · the ladder's two missing rungs**, in
`tokens/musy-foundations-amendments.css`, which is precisely the mechanism this
repo already uses for a Layer 1 gap found by Layer 2 (G1 stroke, G2 dashed, G3
ink on a scrim — all three declared there rather than invented locally):

```css
/* G4 · the rungs the ladder has no name for.
   --space-gap-tight  4px   parts of ONE atom: a dot and its neighbour, a
                            glyph and the number beside it, a label and its
                            required mark. Below --space-gap-inline, which is
                            an icon and its own LABEL.
   --space-gap-prose  24px  the rung between "inside one molecule" (16) and
                            "molecules that do not belong together" (32).
                            Ben's own name for it, from the headline round. */
--space-gap-tight: var(--sp-1);
--space-gap-prose: var(--sp-5);
```

No new values — both are existing `--sp-` rungs, which is what makes this a
naming change rather than a spacing change. Nothing moves on screen. What
changes is that 27 declarations stop being numbers and start being
relationships, and the next person reaching for 24px finds a name instead of a
decision.

**C · L2's own text.** Two lines would carry B into the rule — a row in the
ladder table for each new rung — and one more would replace *"read the gaps off
the computed styles and verify it"* with *"`pnpm check` reads them for you;
this table is what it checks against."* **I did not touch it, and cannot
quietly:** `verify-layout.mjs` asserts `docs/10-layout.md` is byte-identical to
`reference/design_system/docs/10-layout.md`, so editing the page means editing
the signed-off Layer 3 reference. That is Ben's to authorise, and it should
follow B rather than lead it.

## Carousel — the emphasis is a GATE decision, not a pointer decision
Where: `src/Carousel.tsx` (`forwardVariant` / `backVariant`),
`apps/web/src/routes/AboutMusie.tsx`
What I checked: Ben, 2026-09-25, having tested the `ghost`-on-touch build on a
phone — "we loose the nice flow this way". He is right and the two entries
above are both wrong about the axis. Quiet controls from the FIRST slide take
away the thing that makes three slides feel like progress; the defect the
260925 testing found was a filled chevron competing with a swipe people had no
reason to try, and the peek and the nudge have since given them one.
What I did: removed the coarse-pointer override entirely. `nextVariant` is
honoured on every pointer and gained `ghost` as the rung below `secondary`;
the screen passes `seenAll ? 'ghost' : 'primary'`, so the chevrons go quiet in
the same render its own CTA lights up. `previousVariant` is DERIVED, one rung
below forward, so back can never be louder than forward — and there is no
second prop for a screen to get that wrong with.
Measured on the running app at 393px, identical on touch and mouse:
gate closed → prev `secondary` (disabled), next `primary`, CTA disabled;
gate open → both `ghost`, CTA `primary` + `guided`; and walking BACK to slide
1 does not re-lock any of it, because `seenMax` is monotonic.
Why it is better than either pointer rule: it is one hand-over rather than two
independent states. Neither moment has both things loud or both things quiet.
What I need from Ben: **nothing. One thing to watch, stated once.**
The forward chevron is filled during exactly the window where the swipe is
being discovered, which is the window the testing failed in. What is different
now is the peek and the nudge, which did not exist then. If a later round of
testing finds people still pressing rather than swiping on the first two
slides, the lever is this line in `AboutMusie.tsx` and not the component —
and the third rung, `secondary`, is in the union for that.

**The pointer still decides two things, and should:** the nudge and the `grab`
cursor. A gesture genuinely differs by pointer. Emphasis does not, and that is
the mistake these three entries record making twice.

## InteractiveWizard — the connector is a rule expanded and a dot collapsed
Where: `src/musy-components.css`, `.musy-wizard__connector`;
`src/InteractiveWizard.tsx` (the glyph)
What I checked: Ben's phone screenshot of the collapsed run — four markers
almost touching with three hairline rules in the gaps between them. The rule
had already been quietened once (`--border-subtle` at
`--border-width-hairline`, the softest the system has), so quiet was not the
problem: over a 9px gap a line still reads as a path, and the eye follows it to
find where it goes.
What I did: both drawings ship, and which one shows follows the SAME condition
the collapse does — under `--bp-md`, and wherever `compact` forces it in a
container no media query can see. `vertical` keeps its rule at every width: it
is the variant for a rail with height to spend and every label visible, which
is the opposite of the case the dot exists for.
Why: expanded, the gaps are long and a line earns them — it says these four are
one sequence. Collapsed, there is nothing for a line to say that the markers do
not already say by sitting in a row.
What I need from Ben: **nothing.** Two measurements are worth keeping, because
the first fix was wrong and the second is not obvious:

1. **A dot cannot be a layout box here.** `Dot` is ~3px of ink in a 20px
   square. The rule filled whatever box it was given, so the connector's floors
   (`--sp-2`, `--sp-4`) only ever decided how SHORT the line got. A 20px glyph
   in a 9px box is start-aligned rather than centred, so it slid out from under
   its own box and under the next marker's filled circle: measured at 390px,
   three boxes of 9px and two of the three dots invisible.
2. **Raising the floor to `--icon-size-md` fixed that and broke something
   better hidden.** The collapsed run is width-bound on a phone — four 44px
   markers and three gaps inside ~316px — so 12px × 3 came straight out of the
   one label still on screen, and `Einsteigen` (which `word-break: normal` will
   not break, correctly) then overflowed its box by ~29px and painted over the
   very dot the floor was raised to reveal. Measured: label box [105,156], text
   to ~185, dot at 174.

   So the floors stayed and the glyph left the layout — absolutely centred on
   the connector, its empty square overflowing into the triggers' own padding,
   which costs nothing. **The general form, for the next component that puts a
   Lucide glyph in a tight gap: an icon's box is mostly air, so sizing a layout
   off it buys padding nobody asked for and takes the width from whatever was
   already tightest.**

## InteractiveWizard — the dots are centred on the space they have, not on their own box
Where: `src/musy-components.css`, the collapsed-run block
What I checked: Ben's two phone screenshots — the first step and the last step,
where the dot beside the label looked stuck to the word while the dots between
two bare markers looked right. Measured every box in the rail at 393px, marker
edge to marker edge, before changing anything. The dot was off the centre of
its gap by **+2.0px** beside the label at both the first and the last step,
**−1.4px** on the other side of the current marker, and **+1.7px** between two
collapsed markers. Small, and beside a word 2px reads as attached to it.
What I did: fixed the two causes rather than nudging the dot.

1. **The gap was not symmetric around the connector.** A collapsed trigger pads
   `--sp-1` inline; the current one pads `--sp-2` from the base rule. So every
   gap touching the step on screen was 8px one side of the connector and 4px
   the other, and a dot centred on the connector cannot be centred in that.
   Every trigger now pads the same `--sp-1` while collapsed.
2. **The connector overflowed its own allocation.** `min-width: --sp-2` is what
   a RULE needs to stay drawable. Measured: flex had 4.5px to give between two
   collapsed markers, the box still reported 8px, and it spilled the difference
   rightward carrying the dot 1.7px with it. A dot is absolutely placed and
   needs no width, so while collapsed there is no floor.

Measured again after, at 393px, first / middle / last step selected: **0.00px**
off for every gap, including the one that contains the label. Expanded, nothing
moved — at 1280px the connector is still a 1px rule with `min-width: 16px` and
the triggers still pad `--sp-2`.
Why both, rather than an offset on the dot: the arithmetic is now exact instead
of tuned. The gap is `--sp-1 + connector + --sp-1`, so the connector's centre IS
the gap's centre at any width and whatever flex leaves. An offset would have
been right at one viewport.
What I need from Ben: **nothing.** Worth knowing: equalising the padding also
handed ~15px back to the one label still on screen, which is what the collapsed
run is always shortest of.
