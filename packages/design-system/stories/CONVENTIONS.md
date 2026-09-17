# CONVENTIONS.md

Everything in `stories/` matches this file and the exemplar,
`stories/SegmentedControl.stories.tsx`. Where the two disagree, the exemplar wins.

---

## 1 · File naming

One file per component, named after the component, at the top level of
`stories/`:

```
stories/Icon.stories.tsx
stories/CtaButton.stories.tsx
```

Components exported from the same source file get **one story file each**,
named after the component, not after the file: `Field.tsx` exports `Field`,
`FieldItem` and `FieldGroup`, so it yields `Field.stories.tsx`,
`FieldItem.stories.tsx` and `FieldGroup.stories.tsx`.

No subdirectories. No index files. No helper modules — if you need a constant,
put it at the top of the story file. `stories/_decorators.tsx` already exists
and is the only shared module; do not add a second.

## 2 · Story naming

`title: 'Components/<ComponentName>'`. Exactly one level under `Components/`,
so the sidebar stays flat and sorts alphabetically.

Export names are PascalCase and describe the **state**, not the story:
`Default`, `Variants`, `Sizes`, `Disabled`, `Loading`, `WithError`.
Never `Story1`, never `Playground`, never `Example`.

## 3 · Story order

Always in this order. Skip any that do not apply; never reorder.

1. `Default` — component defaults, no args beyond what is required
2. Variants — every `variant` the component declares
3. Sizes — every `size`
4. Tones / accents — every `tone` or `accent`
5. Content states — with/without optional slots, empty state
6. Interaction states — `disabled`, `loading`, `error`, `invalid`, selected
7. Edge cases — the longest string, the fewest options, the most options

## 4 · argTypes

Hand-write them. Do not rely on react-docgen inference.

- One entry per public prop, in the order the component's interface declares them.
- `description` is the prop's **own doc comment**, trimmed to one or two lines.
  Do not paraphrase and do not invent.
- Union props get `control: 'inline-radio'` (≤4 options) or `'select'` (more),
  with the full `options` array.
- Booleans get `control: 'boolean'`.
- Callbacks get `action: '<propName>'` and no control.
- Props that take a node, a component, an array of objects or a `render` prop
  get `control: false`. A JSON control for an array of Lucide components is
  noise.
- `className` is always `control: false`.

`args` on the meta carries the component's required props, using the
prototype's own copy where the prototype uses the component.

Use `satisfies Meta<typeof X>` and `StoryObj<typeof meta>` — not a bare
`Meta`/`StoryObj`, which loses arg types and silently accepts a misspelt prop.

### Batch B note — base-ui prop inheritance

`IconButton`, `CtaButton`, `Switch` and `Field` extend an `Omit<>` of
`ComponentPropsWithoutRef<typeof SomeBaseUIPart>`. react-docgen cannot follow
that and emits either nothing or several hundred DOM props. Hand-write
`argTypes` for the component's **own** props only and ignore the inherited DOM
surface. Do not add a `propFilter` — that lives in `.storybook/main.ts`, and
config is off limits this session. Log it instead.

## 5 · State comes from props

**Never add local state to a story.** No `useState`, no `useReducer`, no
mutable module variable. A controlled component gets `value` and
`onValueChange` as args; clicking it will not move it, and that is correct —
the story documents a state, it does not simulate a session.

If a state can only be reached by interaction, make it an `args` story that
starts in that state.

## 6 · Decorators

`stories/_decorators.tsx` exports four things. Pick by this rule:

| Use | When |
|---|---|
| `bothThemes` | **The default.** Every story, unless one of the rows below applies |
| `fixedWidth(px)` | The component's layout answers to its CONTAINER, not the viewport. `RadioCards` (`musy-rcard-group` container query) and anything with an `@container` rule. Use `fixedWidth(393)` for the phone reference, `fixedWidth(834)` for tablet |
| `singlePane` | The component portals its output to the document root, so two panes would fight over one popup — `Lightbox`. Also for a story that is *about* the theme mechanism |
| `Row` / `Stack` | Not decorators. Layout helpers for putting several variants inside one story |

Set decorators on the **meta**, not per story, unless one story genuinely needs
a different one.

## 7 · Docs format

`parameters.docs.description.component` on the meta carries the component's
purpose. Source it, in this order:

1. the component's own header comment in its `.tsx`
2. that component's section of `docs/07-components.md`

Write it as an array of strings joined with `'\n'`, so the lines stay readable
in source. Markdown is supported: `**bold**` for the rule, backticks for props.

**Do not invent rationale.** If neither source explains something, leave it out
and log the gap.

Per-story docs go in a JSDoc comment directly above the export — addon-docs
picks it up as that story's description. One or two sentences.

## 8 · Build notes — required on every component

Every component's docs page ends with a `Build notes` section, carried in the
meta description as the last block:

```
'---',
'### Build notes',
'',
'_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
'This is not documentation._',
'',
'No open questions.',
```

If the component produced entries in `OPEN-QUESTIONS.md`, repeat that
component's entries **verbatim** instead of "No open questions", so the two
cannot drift.

## 9 · What you may never do

- Edit any `.tsx`, `.css` or token file outside `stories/`
- Edit `.storybook/`, `package.json`, `tsconfig.json`, or any config
- Install a dependency
- Edit another batch's story file
- Write a story for `VoiceNote`, `Message`, `Badge` or `BadgeRow`
- Make a design decision: no new variant, size, colour, token, default or copy

If something looks wrong, it goes in `OPEN-QUESTIONS.md` unchanged.

## 10 · Verifying your own work

You cannot see your story in Storybook this session — see the first entry in
`OPEN-QUESTIONS.md`. What you can do, and must:

```
cd packages/design-system && npx tsc --noEmit
```

`tsconfig.json` includes `stories`, so every story file is typechecked. A
misspelt prop, a wrong union member or a missing required prop fails here.
Run it before you finish.
