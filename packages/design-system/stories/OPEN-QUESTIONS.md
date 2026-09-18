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
