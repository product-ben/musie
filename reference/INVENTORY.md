# Design system inventory — pre-move audit

Source read: `reference/design_system/` (note: the folder is `design_system`
with an underscore, not `design-system`).

Read in full: `components/*.tsx`, `components/*.ts`, `components/index.ts`,
`components/musy-components.css` (3962 lines), `tokens/musy-foundations.css`,
`tokens/musy-foundations-amendments.css`, `docs/07-components.md`,
`docs/12-component-gaps.md`, `package.json`.

Nothing has been moved, renamed or edited. This file is the read-only pass.

> **Post-move note.** The audit above describes the state *before* Part 2.
> `tokens/` and `components/` have since moved to `packages/design-system/`
> (`tokens/` and `src/` respectively), so every path and line number in this
> file now refers to `packages/design-system/`. Line numbers are unchanged —
> no file was reformatted. Four source edits were applied, all listed in §8:
> 8.1 (comma), 8.2 (`data-state`), 8.3 (`stage`), plus the `Lightbox`
> `dismissible` -> `disablePointerDismissal` rename that base-ui 1.7 required.
> Everything else in §8 was recorded and left alone.

**There is no `CLAUDE.md` in this repository**, at the root, in any
subdirectory, or in `~/.claude/`. There was nothing to follow.

---

## 1 · Component inventory

25 component modules + 1 hook module, 26 files under `components/`.
CSS line ranges are section-start to the line before the next section.

| # | File | Exported values | Exported types | base-ui primitives | CSS section |
|---|---|---|---|---|---|
| 1 | `Icon.tsx` | `Icon` | `IconProps` `IconSize` `IconTone` | `use-render` → `useRender` | §1 · ICON (94–143) |
| 2 | `IconButton.tsx` | `IconButton` (forwardRef) · `MusyTooltipProvider` | `IconButtonProps` `IconButtonVariant` `IconButtonSize` | `button` → `Button`; `tooltip` → `Tooltip.Root/Trigger/Portal/Positioner/Popup/Provider` | §2 · ICON BUTTON (144–305) |
| 3 | `CtaButton.tsx` | `CtaButton` (forwardRef) | `CtaButtonProps` `CtaVariant` `CtaSize` | `button` → `Button` | §4 · CTA BUTTON (341–543) |
| 4 | `Switch.tsx` | `Switch` (forwardRef) | `SwitchProps` `SwitchAccent` | `switch` → `Switch.Root/Thumb` | §5 · SWITCH (544–675) |
| 5 | `RadioGroupText.tsx` | `RadioGroupText` | `RadioGroupTextProps` `RadioOption` `RadioAccent` | `radio-group` `radio` `fieldset` | §6 · RADIO GROUP — TEXT ONLY (676–868) |
| 6 | `RadioGroupImage.tsx` | `RadioGroupImage` | `RadioGroupImageProps` `RadioCardOption` | same three | §7 · RADIO GROUP — IMAGE + TEXT (869–1031) |
| 7 | `RadioCards.tsx` | `RadioCards` | `RadioCardsProps` `RadioCardOptionRich` | same three | §13 · RADIO CARDS (1562–1838) |
| 8 | `ProcessVisualisation.tsx` | `ProcessVisualisation` | `ProcessVisualisationProps` `ProcessStep` | `separator` → `Separator` | §8b · PROCESS VISUALISATION — **RETIRED** (1235–1318) |
| 9 | `Hint.tsx` | `Hint` | `HintProps` | *none* | sub-block `── HINT (.musy-tip)` inside §2 (306–340) |
| 10 | `ButtonGroup.tsx` | `ButtonGroup` | `ButtonGroupProps` | *none* | sub-block `── Button group` inside the BADGE section (3649–3675) |
| 11 | `ContentBox.tsx` | `ContentBox` | `ContentBoxProps` `TypeStep` `BoxOutline` `HeadingLevel` | `use-render` → `useRender` | §9 · CONTENT BOX (1319–1394); the `[data-type-step]` map lives at 1381–1392 |
| 12 | `Badge.tsx` | `Badge` · `BadgeRow` | `BadgeProps` `BadgeVariant` | *none* | `═══ BADGE` — unnumbered (3529–3648) |
| 13 | `Message.tsx` | `Message` | `MessageProps` `MessageVariant` `MessageLive` | `button` → `Button` (dismiss only) | §10 · MESSAGE (1395–1449) |
| 14 | `ContentList.tsx` | `ContentList` | `ContentListProps` `ContentListItem` | `separator` → `Separator` | §11 · CONTENT LIST (1450–1535) |
| 15 | `DraggableList.tsx` | `DraggableList` · `itemTypeStep` | `DraggableListProps` `DraggableItem` `DropMode` `CombineOrder` **`DropHints`** | *none directly* — composes ContentBox, CtaButton, IconButton | §24 · DRAGGABLE LIST (2183–2461) |
| 16 | `useCoarsePointer.ts` | `useCoarsePointer` · `useToolSize` | `ToolSize` | *none* | — no CSS |
| 17 | `Toast.tsx` | `Toast` | `ToastProps` `ToastAction` `ToastLive` | `button` → `Button` (dismiss only) | §23 · TOAST (2060–2182) |
| 18 | `SegmentedControl.tsx` | `SegmentedControl` | `SegmentedControlProps` `SegmentedOption` | `radio-group` `radio` `fieldset` | §15 · SEGMENTED CONTROL (1930–2059) |
| 19 | `Lightbox.tsx` | `Lightbox` | `LightboxProps` | `dialog` → `Dialog.Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close` | §14 · LIGHTBOX (1839–1929) |
| 20 | `Logo.tsx` | `Logo` | `LogoProps` `LogoSize` | `use-render` → `useRender` | §12 · LOGO (1536–1561) |
| 21 | `Field.tsx` | `Field` · `FieldItem` · `FieldGroup` | `FieldProps` `FieldItemProps` `FieldGroupProps` `FieldType` | `field` → `Field.Root/Label/Control/Validity/Description` | §15 · FIELD (2764–2923) — **number 15 is used twice** |
| 22 | `InteractiveWizard.tsx` | `InteractiveWizard` · `WizardPanel` | `InteractiveWizardProps` `WizardPanelProps` `WizardStep` `WizardStepState` `WizardStateWords` `WizardAccent` | *none* — plain `<nav><ol><button>` | §16 · INTERACTIVE WIZARD (2924–3286) |
| 23 | `PhotoUpload.tsx` | `PhotoUpload` | `PhotoUploadProps` `UploadedPhoto` | `button` → `Button` | §18 · PHOTO UPLOAD (3287–3410) |
| 24 | `VoiceNote.tsx` | `VoiceNote` | `VoiceNoteProps` `VoiceNoteState` | `button` → `Button`; `progress` → `Progress.Root/Track/Indicator` | §19 · VOICE NOTE (3411–3528) |
| 25 | `MusicPlayer.tsx` | `TrackButton` · `MusicPlayer` · `trackClock` | `TrackButtonProps` `MusicPlayerProps` `MusicTransport` | `button` → `Button`; `slider` → `Slider.Root/Control/Track/Indicator/Thumb` | `═══ MUSIC PLAYER` — unnumbered (3676–3852) |
| 26 | `RecordButton.tsx` | `RecordButton` · `recordClock` | `RecordButtonProps` `RecordButtonState` | `button` → `Button` | `═══ RECORD BUTTON` — unnumbered (3853–3962) |

Non-component CSS sections: §0 SHARED PRIMITIVES (50–93), LIGHTER SELECTION
BOUNDARIES (2462–2541), FORCED COLOURS (2542–2576), PROOF HARNESS (2577–2590),
OPT-IN · TINTED REST modifier (2591–2763).

---

## 2 · Props, types and defaults

Required props have no default. `—` means required.

### Icon
| Prop | Type | Default |
|---|---|---|
| `glyph` | `LucideIcon` | — |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` |
| `tone` | `'inherit' \| 'muted' \| 'strong' \| 'primary' \| 'info' \| 'warning' \| 'success' \| 'error'` | `'inherit'` |
| `label` | `string` | `undefined` |
| `inline` | `boolean` | `false` |
| `animate` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |
| `render` | `useRender.RenderProp` | `undefined` |

`IconProps` is a closed interface — no index signature, no `extends` of any
DOM prop type.

### IconButton
Extends `Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children' | 'className' | 'render'>`.

| Prop | Type | Default |
|---|---|---|
| `glyph` | `LucideIcon` | — |
| `label` | `string` | — |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'ghost'` |
| `size` | `'min' \| 'primary' \| 'comfort' \| 'guided'` | `'primary'` |
| `tooltip` | `boolean` | `true` |
| `loading` | `boolean` | `false` |
| `loadingLabel` | `string` | `'Wird geladen'` |
| `disabled` | `boolean` | (from `Button`) |
| `className` | `string` | `undefined` |

Module constant: `ICON_FOR_TARGET: Record<IconButtonSize, IconSize>` =
`{ min:'sm', primary:'md', comfort:'lg', guided:'lg' }`.
`MusyTooltipProvider` takes `{ children }` and hardcodes `delay={400} closeDelay={0}`.

### CtaButton
Extends `Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'>`.

| Prop | Type | Default |
|---|---|---|
| `children` | `React.ReactNode` | — |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `size` | `'min' \| 'primary' \| 'comfort' \| 'guided'` | `'primary'` |
| `leadingIcon` | `LucideIcon` | `undefined` |
| `loading` | `boolean` | `false` |
| `loadingLabel` | `string` | `'Wird geladen'` |
| `block` | `boolean` | `false` |
| `wrap` | `boolean` | `false` |
| `className` | `string` | `undefined` |

### Switch
Extends `Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, 'className' | 'render' | 'nativeButton'>`.

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `labelHidden` | `boolean` | `false` |
| `reverse` | `boolean` | `false` |
| `accent` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `guided` | `boolean` | `false` |
| `showStateIcons` | `boolean` | `true` |
| `onGlyph` | `LucideIcon` | `Check` (lucide) |
| `offGlyph` | `LucideIcon` | `X` (lucide) |
| `id` | `string` | `` `musy-switch-${React.useId()}` `` |
| `className` | `string` | `undefined` |

### RadioGroupText
| Prop | Type | Default |
|---|---|---|
| `name` | `string` | — |
| `legend` | `string` | — |
| `hint` | `string` | `undefined` |
| `options` | `RadioOption[]` | — |
| `value` | `string` | `undefined` |
| `onValueChange` | `(value: string) => void` | `undefined` |
| `accent` | `RadioAccent` | `'primary'` |
| `guided` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `error` | `string` | `undefined` |
| `emptyLabel` | `string` | `'Keine Optionen verfügbar'` |
| `className` | `string` | `undefined` |

`RadioOption` = `{ value: string; label: string; disabled?: boolean }`.
`RadioAccent` = `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` —
declared here and re-imported by RadioGroupImage, RadioCards and SegmentedControl.

### RadioGroupImage
Same as RadioGroupText minus `guided`. `options: RadioCardOption[]`,
`emptyLabel` default `'Keine Optionen verfügbar'`.
`RadioCardOption` = `{ value; label; image: string; imageAlt: string; disabled? }`.

### RadioCards
| Prop | Type | Default |
|---|---|---|
| `name` `legend` | `string` | — |
| `hint` | `string` | `undefined` |
| `options` | `RadioCardOptionRich[]` | — |
| `value` / `onValueChange` | `string` / `(v:string)=>void` | `undefined` |
| `accent` | `RadioAccent` | `'primary'` |
| `headingLevel` | `2\|3\|4\|5\|6` | `3` |
| `headlineStep` | `TypeStep` | `'heading-sm'` |
| `descriptionStep` | `TypeStep` | `'body-md'` |
| `disabled` | `boolean` | `false` |
| `error` | `string` | `undefined` |
| `emptyLabel` | `string` | `'Keine Optionen verfügbar'` |
| `className` | `string` | `undefined` |

`RadioCardOptionRich` = `{ value; headline; description; label?; image; imageAlt; disabled? }`.

### ProcessVisualisation
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `steps` | `ProcessStep[]` | — |
| `showOrdinals` | `boolean` | `true` |
| `ordinalPrefix` | `string` | `'Schritt'` |
| `titleStep` | `TypeStep` | `'heading-sm'` |
| `bodyStep` | `TypeStep` | `'body-md'` |
| `className` | `string` | `undefined` |

`ProcessStep` = `{ glyph: LucideIcon; title: string; body?: string }`.

### Hint
`text: string` (—), `children: React.ReactNode` (—), `className?: string`.

### ButtonGroup
`children: React.ReactNode` (—), `align: 'start' \| 'center' \| 'end'` (`'start'`),
`className?: string`.

### ContentBox
| Prop | Type | Default |
|---|---|---|
| `headline` | `string` | — |
| `headlineHidden` | `boolean` | `false` |
| `headingLevel` | `HeadingLevel` = `2\|3\|4\|5\|6` | `3` |
| `headlineStep` | `TypeStep` | `'heading-sm'` |
| `text` | `string` | `undefined` |
| `textStep` | `TypeStep` | `'body-md'` |
| `outline` | `'solid' \| 'dashed' \| 'sunken' \| 'plain'` | `'solid'` |
| `header` | `React.ReactNode` | `undefined` |
| `children` | `React.ReactNode` | `undefined` |
| `className` | `string` | `undefined` |
| `render` | `useRender.RenderProp` | `undefined` |

`TypeStep` = `'display-xl' \| 'display-lg' \| 'heading-lg' \| 'heading-md' \|
'heading-sm' \| 'body-lg' \| 'body-md' \| 'body-sm' \| 'label-lg' \| 'label-md'`.

### Badge / BadgeRow
`Badge`: `children` (—), `variant: BadgeVariant` (`'neutral'`), `glyph?: LucideIcon`,
`hideIcon: boolean` (`false`), `className?`, `id?`.
`BadgeVariant` = `'neutral' \| 'outline' \| 'primary' \| 'primary-subtle' \|
'accent-placeholder1' \| 'accent-placeholder2' \| 'info' \| 'warning' \| 'success' \| 'error'`.
`BadgeRow`: `{ children: React.ReactNode; className?: string }` — an **inline**
type literal, not a named exported interface.

Module constants: `STATUS_GLYPH` (info/warning/success/error → Lucide),
`STATUS_WORD` (see §7).

### Message
| Prop | Type | Default |
|---|---|---|
| `variant` | `'info' \| 'warning' \| 'success' \| 'error'` | — |
| `headline` | `string` | — |
| `headlineStep` | `TypeStep` | `'heading-sm'` |
| `headingLevel` | `HeadingLevel` | `3` |
| `text` | `string` | `undefined` |
| `textStep` | `TypeStep` | `'body-md'` |
| `action` | `React.ReactNode` | `undefined` |
| `onDismiss` | `() => void` | `undefined` |
| `dismissLabel` | `string` | `'Meldung schließen'` |
| `live` | `'off' \| 'polite' \| 'assertive'` | `'off'` |
| `entering` | `boolean` | `false` |
| `id` / `className` | `string` | `undefined` |

Module constants: `GLYPH`, `STATUS_WORD` (see §7).

### ContentList
`label?: string`, `items: ContentListItem[]` (—),
`contentStep: TypeStep` (`'body-md'`), `emptyLabel: string` (`'Noch keine Einträge'`),
`className?`.
`ContentListItem` = `{ label: string; content: React.ReactNode;
media?: {src;alt} | {node}; list?: { ordered?: boolean; items: React.ReactNode[] } }`.

### DraggableList
| Prop | Type | Default |
|---|---|---|
| `items` | `DraggableItem[]` | — |
| `editable` | `boolean` | `true` |
| `onEdit` | `(id: string, text: string) => void` | `undefined` |
| `onCombine` | `(sourceId, targetId, order: CombineOrder) => void` | `undefined` |
| `onMove` | `(sourceId, targetId, position: 'before'\|'after') => void` | `undefined` |
| `onDelete` | `(id: string) => void` | `undefined` |
| `pending` | `boolean` | `false` |
| `partial` | `string` | `undefined` |
| `headingLevel` | `2\|3\|4\|5\|6` | `3` |
| `emptyHeadline` | `string` | `'Nothing captured yet'` |
| `emptyText` | `string` | `'Finished statements will appear here, one box each, in the order you said them.'` |
| `listeningLabel` | `string` | `'Listening'` |
| `hearingLabel` | `string` | `'Hearing you'` |
| `itemNoun` | `string` | `'statement'` |
| `label` | `string` | `'Transcript'` |
| `dropHints` | `DropHints` | `DEFAULT_DROP_HINTS` |
| `dense` | `boolean` | `false` |
| `className` | `string` | `undefined` |

`DraggableItem` = `{ id: string; text: string }`. `DropMode` =
`'before'\|'after'\|'combine'`. `CombineOrder` = `'sourceFirst'\|'targetFirst'`.
`DropHints` = `{ combine(n); before(n); after(n); cancel }`.
Exported helper `itemTypeStep(text: string, dense = false)`.
Module constants: `DEFAULT_DROP_HINTS` (see §7), `SCANNABLE_CHARS = 80`,
`zoneFor()` ratios `0.25` / `0.75`.
Internal `RowProps` interface is **not** exported.

### useCoarsePointer.ts
`useCoarsePointer(): boolean` — module constant `QUERY = '(pointer: coarse)'`.
`useToolSize(): ToolSize` — returns `'primary'` on coarse, `'min'` otherwise.
`ToolSize` = `'min' \| 'primary'`.

### Toast
`label: string | null` (—), `action?: ToastAction`, `onDismiss?: () => void`,
`live: 'polite' \| 'off'` (`'polite'`), `dismissLabel: string`
(`'Meldung schließen'`), `id?`, `className?`.
`ToastAction` = `{ label: string; onAction: () => void }`.
Hardcoded in the JSX: `data-type-step="body-sm"` on `.musy-toast__text`.

### SegmentedControl
`name` (—), `legend` (—), `legendHidden: boolean` (`false`),
`options: SegmentedOption[]` (—), `value?`, `onValueChange?`,
`accent: RadioAccent` (`'primary'`), `guided: boolean` (`false`),
`disabled: boolean` (`false`), `className?`.
`SegmentedOption` = `{ value; label; glyph: LucideIcon; disabled? }`.
Dev-only `console.warn` when `options.length` is outside 2–4.

### Lightbox
`trigger: React.ReactElement` (—), `title: string` (—),
`titleHidden: boolean` (`false`), `description?: string`,
`children: React.ReactNode` (—), `open?: boolean`,
`onOpenChange?: (open:boolean)=>void`, `closeLabel: string` (`'Schließen'`),
`mandatory: boolean` (`false`), `className?`.
Hardcoded in the JSX: `data-type-step="heading-md"` on the title.

### Logo
`size: 'nav' \| 'splash'` (`'nav'`), `showWordmark: boolean` (`false`),
`alt: string` (`'Musy'`), `src: string` (`'/assets/web/musy-logo.png'`),
`className?`, `render?: useRender.RenderProp`.

### Field / FieldItem / FieldGroup
`Field`:

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `name` | `string` | `undefined` |
| `multiline` | `boolean` | `false` |
| `type` | `'text'\|'email'\|'tel'\|'url'\|'search'\|'password'` | `'text'` |
| `value` / `defaultValue` | `string` | `undefined` |
| `onValueChange` | `(value: string) => void` | `undefined` |
| `placeholder` `description` `error` `validMessage` | `string` | `undefined` |
| `required` `disabled` `readOnly` | `boolean` | `false` |
| `rows` | `number` | `undefined` |
| `errorWord` | `string` | `'Error'` |
| `className` / `id` | `string` | `undefined` |

`FieldItem`: `control: React.ReactNode` (—), `label: string` (—),
`htmlFor: string` (—), `description?: string`, `disabled: boolean` (`false`),
`className?`.
`FieldGroup`: `legend?: string`, `children` (—), `className?`.

### InteractiveWizard / WizardPanel
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `steps` | `WizardStep[]` | — |
| `current` | `string` | — |
| `completed` | `string[]` | `[]` |
| `onStepChange` | `(id: string) => void` | `undefined` |
| `vertical` | `boolean` | `false` |
| `compact` | `boolean` | `false` |
| `showStateWords` | `boolean` | `true` |
| `stateWords` | `Partial<WizardStateWords>` | `undefined` |
| `accent` | `WizardAccent` | `'primary'` |
| `className` | `string` | `undefined` |

`WizardStep` = `{ id: string; label: string }`.
`WizardStepState` = `'disabled'\|'active'\|'selected'\|'completed'`.
`WizardAccent` = `'primary'\|'accent-placeholder1'\|'accent-placeholder2'`.
Module constant `DEFAULT_STATE_WORDS` (see §7).
`WizardPanel`: `children` (—), `actions?: React.ReactNode`, `className?`.

### PhotoUpload
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `name` | `string` | `undefined` |
| `value` | `UploadedPhoto \| null` | `null` |
| `onValueChange` | `(value: UploadedPhoto \| null) => void` | `undefined` |
| `previewAlt` | `string` | — |
| `accept` | `string` | `'image/*'` |
| `description` / `error` | `string` | `undefined` |
| `disabled` `required` | `boolean` | `false` |
| `zoneText` | `string` | `'Drag a photo here, or choose one from your device.'` |
| `chooseLabel` | `string` | `'Choose photo'` |
| `replaceLabel` | `string` | `'Replace'` |
| `removeLabel` | `string` | `'Remove photo'` |
| `errorWord` | `string` | `'Error'` |
| `id` / `className` | `string` | `undefined` |

`UploadedPhoto` = `{ src: string; name: string; size?: number }`.
Module constant `UNITS = ['B','kB','MB']`; `formatSize()` uses the literal `1024`.
Generated id: `` `upload-${React.useId()}` ``; description id `` `${controlId}-desc` ``.

### VoiceNote
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `state` | `'idle'\|'recording'\|'recorded'` | — |
| `elapsed` `duration` `position` | `number` | `0` |
| `playing` | `boolean` | `false` |
| `onRecordStart` `onRecordStop` `onTogglePlay` `onDelete` | `() => void` | `undefined` |
| `description` / `error` | `string` | `undefined` |
| `disabled` | `boolean` | `false` |
| `idleText` | `string` | `'Answer out loud — you can delete it and start again.'` |
| `recordLabel` | `string` | `'Record answer'` |
| `stopLabel` | `string` | `'Stop recording'` |
| `playLabel` | `string` | `'Play answer'` |
| `pauseLabel` | `string` | `'Pause answer'` |
| `deleteLabel` | `string` | `'Delete answer'` |
| `recordingWord` | `string` | `'Recording'` |
| `errorWord` | `string` | `'Error'` |
| `id` / `className` | `string` | `undefined` |

Private `clock()` helper. Generated id `` `voice-${React.useId()}` ``.

### MusicPlayer.tsx — TrackButton
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `duration` | `number` | — |
| `position` | `number` | `0` |
| `playing` | `boolean` | `false` |
| `onTogglePlay` `onRestart` | `() => void` | `undefined` |
| `variant` | `'primary'\|'secondary'\|'accent-placeholder1'\|'accent-placeholder2'` | `'secondary'` |
| `size` | `'primary'\|'guided'\|'comfort'` | `'primary'` |
| `disabled` | `boolean` | `false` |
| `playLabel` | `string` | `'Start Listening'` |
| `pauseLabel` | `string` | `'Pause'` |
| `restartLabel` | `string` | `'Replay'` |
| `className` | `string` | `undefined` |

### MusicPlayer.tsx — MusicPlayer
| Prop | Type | Default |
|---|---|---|
| `title` | `string` | — |
| `duration` | `number` | — |
| `position` | `number` | `0` |
| `playing` | `boolean` | `false` |
| `onTogglePlay` `onRestart` | `() => void` | `undefined` |
| `onSeek` | `(seconds: number) => void` | `undefined` |
| `accent` | `'primary'\|'accent-placeholder1'\|'accent-placeholder2'` | `'primary'` |
| `disabled` | `boolean` | `false` |
| `playLabel` | `string` | `'Play'` |
| `pauseLabel` | `string` | `'Pause'` |
| `restartLabel` | `string` | `'Play again'` |
| `seekLabel` | `string` | `'Playback position'` |
| `className` | `string` | `undefined` |

Exported `trackClock(seconds)`; private `transportOf()`.
`MusicTransport` = `'paused'\|'playing'\|'ended'`.

### RecordButton
| Prop | Type | Default |
|---|---|---|
| `state` | `'ready'\|'recording'` | — |
| `elapsed` | `number` | `0` |
| `maxSeconds` | `number` | `60` |
| `levels` | `number[]` | `[]` |
| `bars` | `number` | `12` |
| `onToggle` | `() => void` | `undefined` |
| `variant` | `'primary'\|'accent-placeholder1'\|'accent-placeholder2'` | `'primary'` |
| `size` | `'primary'\|'comfort'\|'guided'` | `'primary'` |
| `disabled` `block` | `boolean` | `false` |
| `readyLabel` | `string` | `'Record Now'` |
| `recordingLabel` | `string` | `'Recording'` |
| `status` | `(inSeconds, leftSeconds) => string` | `` (i,left) => `Recording, ${i} in, ${left} left` `` |
| `className` | `string` | `undefined` |

Exported `recordClock(seconds)`.

---

## 3 · Exported but undocumented, documented but not exported

`docs/07-components.md` is the component spec. Its own opening line says
**"Twelve components"** — there are 26 files and 25 spec sections. The count is stale.

**Exported from `components/index.ts` with no spec section in `07-components.md`:**

| Export | Note |
|---|---|
| `Badge`, `BadgeRow` (+ `BadgeProps`, `BadgeVariant`) | No `## 7.x Badge` heading anywhere in `docs/`. Mentioned only in prose in `10-layout.md`. Has a full CSS section. |
| `useCoarsePointer`, `useToolSize`, `ToolSize` | No spec section. `useCoarsePointer` is discussed in `13-draggable-list.md`, `10-layout.md`, `02-deltas.md`, `03-conflict-report.md`, `16-workspace-source.md`; `useToolSize` appears in no doc at all. |
| `itemTypeStep` | Exported helper, not listed in any spec section's prop table. |
| `trackClock`, `recordClock` | Exported helpers, not in any prop table. |

**Declared and exported by a module but NOT re-exported by `index.ts`:**

| Type | Module |
|---|---|
| `DropHints` | `DraggableList.tsx` — exported from the file, missing from `index.ts`. It is the type of the public `dropHints` prop, so a consumer cannot name it through the package entry point. |

**Documented but not exported:**

| Spec section | Note |
|---|---|
| `## 7.3 Icon Toggle Button — **REMOVED IN REVIEW**` | Consistent: no file, no export, no CSS. |
| `## 7.8 Process Visualisation `[OPEN]`` | The component IS exported, but the CSS section is headed **RETIRED** — see §5. |

**Numbering collisions and gaps in `07-components.md`:**
- `7.24` is used **twice** — `## 7.24 Draggable List` (line 817) and
  `## 7.24 Hint` (line 1381).
- Content List is headed `## 7.11` but is cross-referenced as **§7.12** in both
  `07-components.md:823` and `13-draggable-list.md:13`.
- No `7.12` or `7.20` section exists.
- Sections are not in numeric order (7.25 → 7.15 → 7.16 …).
- The "Which primitive each component uses" table at the top lists 16 rows and
  omits Badge, Button Group, Hint, Field, Interactive Wizard, Photo Upload,
  Voice Note, Music Player and Record Button.

---

## 4 · CSS sections with no component behind them

| Section | Lines | Status |
|---|---|---|
| **§8 · CAROUSEL** | 1032–1234 | **No component file, no export, no spec section.** ~200 lines of live CSS (`.musy-carousel`, `__viewport`, `__slide`, `__dots`, `__dot`, `__nav`, …). Its own header says it *"Replaces Process Visualisation (v0.1)"*. A Carousel is described in `07-product-description.md` as the onboarding pattern, but nothing in `components/` renders it. |
| **§8b · PROCESS VISUALISATION — RETIRED** | 1235–1318 | Header: *"Superseded by 8 · Carousel. Kept only so the v0.1 clickdummy still renders; no new screen should reach for it."* The component **is** still exported from `index.ts` and its spec section `## 7.8` is marked `[OPEN]`, not retired. CSS and docs disagree. |
| **PROOF HARNESS** | 2577–2590 | Not a component. `[data-force~="hover\|active\|focus"]` state pinning for screenshot proofs. Its own text says *"Never ship data-force in product code."* The forced selectors are appended to the real rule lists throughout the file (≈ 40 call sites), so this cannot be stripped without touching every section. |
| **OPT-IN · TINTED REST modifier** | 2591–2763 | A cross-component modifier block, not a component. |
| **LIGHTER SELECTION BOUNDARIES** | 2462–2541 | Cross-component overrides. |
| **FORCED COLOURS** | 2542–2576 | Cross-component `@media (forced-colors: active)` block. |

**Section-number problems inside the CSS itself:**
- `§15` is used twice: `§15 · SEGMENTED CONTROL` (1930) and `§15 · FIELD` (2764).
- `§16 · INTERACTIVE WIZARD` (2924) — the docs call it **§7.17**.
- `§3` is absent (the removed Icon Toggle Button).
- Badge, Button Group, Music Player and Record Button have **unnumbered** headers.
- Photo Upload and Voice Note use a `§18` / `§19` prefix in a different header
  style (`§18 · PHOTO UPLOAD`) from the numbered `═══ n ·` style above them.
- Hint and Button Group are sub-blocks nested inside other components' sections
  rather than sections of their own.

---

## 5 · Component CSS referencing raw palette tokens

The file header states: *"Every declaration below resolves to a Layer 1 token…
There is no literal colour… in this file."* Raw Layer-1 primitives
(`--sand-*`, `--terracotta-*`, `--ocher-*`, `--purple-*`) are documented as
*"never consumed directly — Layer 2 is the API."*

**Two live declarations break that rule.** Both are the same rule, duplicated:

| Line | Selector | Declaration |
|---|---|---|
| 203 | `.musy-icon-btn--secondary:hover:not(:disabled):not([data-loading])`, `.musy-icon-btn--secondary[data-force~="hover"]` | `border-color: var(--sand-8);` |
| 444 | `.musy-btn--secondary:hover:not(:disabled):not([data-loading])`, `.musy-btn--secondary[data-force~="hover"]` | `border-color: var(--sand-8);` |

`--sand-8` is defined at `tokens/musy-foundations.css:44` and commented
*"Component border — hover"*, so the intent is clear; there is simply no Layer-2
alias for a secondary control's hover border.

**No other raw palette reference exists in a declaration.** The remaining three
matches are inside comments and reference `--sand-edge`:
- line 2526 — comment in LIGHTER SELECTION BOUNDARIES
- line 3152 — comment in §16 Interactive Wizard
- line 3161 — comment in §16 Interactive Wizard

`--terracotta-*`, `--ocher-*` and `--purple-*` appear **nowhere** in
`musy-components.css`, in comments or in declarations.

---

## 6 · Hardcoded values

### 6a · Image paths

| Location | Value |
|---|---|
| `Logo.tsx:38` | `src = '/assets/web/musy-logo.png'` — a **root-absolute runtime URL**. The asset ships at `reference/design_system/assets/web/musy-logo.png`. Nothing in the move puts it at `/assets/web/`, so a consuming app must serve it there or pass `src`. |
| `Logo.tsx:15` (comment) | `/assets/source/` — a handoff path that does not exist in the export. The 1217px original is not in this tree; `assets/musy-logo.png` and `assets/method-card.png` are the only masters. |

No other component references an image path. `assets/method-card.png` and
`assets/web/method-card.png` are referenced by **nothing** in `components/` or
`tokens/`. There is **no `url()` in either stylesheet**.

### 6b · Unit literals in `musy-components.css` (outside comments)

13 lines. Only two are design values; the rest are breakpoints and measures.

| Line | Value | Kind |
|---|---|---|
| 27 | `:root { --musy-card-min: 196px; }` | **Design value.** Documented in the file header as token gap **G4** — the card floor, shared by §7 and §13. |
| 1582 | `--musy-rcard-row-min: 480px;` | **Design value.** The Radio Cards row floor. *Not* documented in the header's list of permitted literals and **not** flagged as a token gap. |
| 1481 | `minmax(0, 12rem)` | Content List term column width. |
| 3724 | `min-inline-size: 18ch;` | `.musy-btn.musy-mbtn` minimum width. |
| 1067 | `@container (max-width: 420px)` | Carousel. Hardcoded, not `--bp-*`. |
| 1480 | `@media (min-width: 1024px)` | Content List. Comment names it `--bp-lg`, value is literal. |
| 1638, 1661 | `@container musy-rcard-group (min-width: 480px)` | Radio Cards. |
| 2011 | `@container (max-width: 30rem)` | Segmented Control. |
| 2996, 3216 | `@media (min-width: 768px)` | Wizard, Photo Upload. `--bp-md` as a literal. |
| 3032, 3665 | `@media (max-width: 767.98px)` | Wizard, Button Group. |

Media/container queries cannot take a `var()`, so the literals at 1067–3665 are
forced by CSS itself. Worth noting only because there is no single place that
records which numbers the `--bp-*` tokens are supposed to equal.

There is **no `px` colour, shadow, radius, spacing or duration literal** anywhere
in the file. That part of the header's claim holds.

### 6c · Numeric constants baked into component modules

| Module | Constant | Value |
|---|---|---|
| `IconButton.tsx` | `ICON_FOR_TARGET` | `{ min:'sm', primary:'md', comfort:'lg', guided:'lg' }` |
| `IconButton.tsx` | `MusyTooltipProvider` | `delay={400} closeDelay={0}` — inline, not a prop |
| `IconButton.tsx` | `Tooltip.Positioner` | `side="top" sideOffset={8} collisionPadding={8}` — inline |
| `DraggableList.tsx` | `SCANNABLE_CHARS` | `80` |
| `DraggableList.tsx` | `zoneFor()` | `0.25` / `0.75` drop-zone ratios |
| `DraggableList.tsx` | editor textarea | `rows={3}` |
| `PhotoUpload.tsx` | `UNITS` | `['B','kB','MB']` and the divisor `1024` |
| `RecordButton.tsx` | defaults | `maxSeconds = 60`, `bars = 12`; bar floor `0.1` |
| `useCoarsePointer.ts` | `QUERY` | `'(pointer: coarse)'` |

### 6d · `data-type-step` values hardcoded in JSX (not props)

| Module | Value |
|---|---|
| `Toast.tsx` | `data-type-step="body-sm"` on `.musy-toast__text` |
| `Lightbox.tsx` | `data-type-step="heading-md"` on the title |
| `ContentList.tsx` | `data-type-step="body-md"` on the empty-state `<p>` |
| `DraggableList.tsx` | `textStep="body-sm"` on both empty/waiting Content Boxes |

Everywhere else the step is a prop.

### 6e · CSS class names hardcoded into components that do not own them

These components hand-write another component's classes instead of composing it:

| Module | Classes written by hand |
|---|---|
| `PhotoUpload.tsx` | `musy-btn musy-btn--ghost`, `musy-btn musy-btn--secondary`, `musy-icon-btn musy-icon-btn--ghost musy-icon-btn--primary-size`, `musy-field__label/__description/__error/__required` |
| `VoiceNote.tsx` | `musy-icon-btn musy-icon-btn--primary musy-icon-btn--primary-size`, `musy-icon-btn--ghost`, `musy-field__*` |
| `MusicPlayer.tsx` | `musy-btn musy-btn--${variant}`, `musy-icon-btn musy-icon-btn--primary musy-icon-btn--guided` |
| `RecordButton.tsx` | `musy-btn musy-btn--${variant}` |
| `DraggableList.tsx` | `musy-field`, `musy-field__label`, `musy-field__control musy-field__control--textarea` |

This is stated as deliberate in each file's header ("composed on §15 Field's
parts"). Recorded here because it means the CSS and the TSX are coupled by
string, so a class rename is a cross-file change.

---

## 7 · Default copy strings — German vs English

The system is described throughout as **German-primary** ("the app is
German-primary", `IconButton.tsx:38`), and `07-components.md` makes
`<html lang="de">` an integration requirement. The defaults do not follow one
rule: the earlier components ship German, the later ones ship English, and one
component ships an English word with a German sibling.

> **SUPERSEDED on 19 September by Phase C.10 — read the tables below as a
> RECORD OF WHAT WAS FOUND, not as current fact.** Every string in both tables,
> plus `DraggableList`'s hardcoded row controls in §7, now falls back to the
> locale catalogue in `packages/design-system/src/locale.ts`, driven by
> `MusyLocaleProvider`. `Badge` and `Message` gained `statusWord` props; their
> status words had no prop when this was written. `DropHints` is exported from
> the barrel now (§3 says it is not), and `dropHints` takes a `Partial`.
> `InteractiveWizard.DEFAULT_STATE_WORDS` no longer exists — the rule moved to
> `src/wizardSteps.ts`.
>
> The tables are left standing because this file is the inventory of what the
> package looked like when it arrived, and rewriting it would destroy the
> before to make the after look tidy. `packages/design-system/stories/OPEN-QUESTIONS.md`
> carries the resolution under *Phase C.10*.

### German defaults

| String | Where |
|---|---|
| `'Wird geladen'` | `IconButton.loadingLabel`, `CtaButton.loadingLabel` |
| `'Keine Optionen verfügbar'` | `RadioGroupText.emptyLabel`, `RadioGroupImage.emptyLabel`, `RadioCards.emptyLabel` |
| `'Schritt'` | `ProcessVisualisation.ordinalPrefix` |
| `'Hinweis'` `'Warnung'` `'Erfolg'` `'Fehler'` | `Badge.STATUS_WORD` (module const), `Message.STATUS_WORD` (module const) |
| `'Meldung schließen'` | `Message.dismissLabel`, `Toast.dismissLabel` |
| `'Noch keine Einträge'` | `ContentList.emptyLabel` |
| `'Schließen'` | `Lightbox.closeLabel` |

### English defaults

| String | Where |
|---|---|
| `'Error'` | `Field.errorWord`, `PhotoUpload.errorWord`, `VoiceNote.errorWord` |
| `'Nothing captured yet'` / `'Finished statements will appear here, one box each, in the order you said them.'` / `'Listening'` / `'Hearing you'` / `'statement'` / `'Transcript'` | `DraggableList` |
| `'Merge into {n}'` / `'Insert before {n}'` / `'Insert after {n}'` / `'Release to cancel'` | `DraggableList.DEFAULT_DROP_HINTS` (module const) |
| `'locked'` `'available'` `'current'` `'done'` | `InteractiveWizard.DEFAULT_STATE_WORDS` (module const) |
| `'Drag a photo here, or choose one from your device.'` / `'Choose photo'` / `'Replace'` / `'Remove photo'` | `PhotoUpload` |
| `'Answer out loud — you can delete it and start again.'` / `'Record answer'` / `'Stop recording'` / `'Play answer'` / `'Pause answer'` / `'Delete answer'` / `'Recording'` | `VoiceNote` |
| `'Start Listening'` / `'Pause'` / `'Replay'` | `TrackButton` |
| `'Play'` / `'Pause'` / `'Play again'` / `'Playback position'` | `MusicPlayer` |
| `'Record Now'` / `'Recording'` / `` `Recording, ${i} in, ${left} left` `` | `RecordButton` |
| `'Musy'` | `Logo.alt` (a product name — language-neutral) |

Four files say so in a comment: DraggableList — *"Defaults are English, like the
rest of the set's copy"*; InteractiveWizard — *"the defaults are English because
the prototype ships English first"*; PhotoUpload and VoiceNote — *"English
defaults; the consumer localises"*. `IconButton` says the opposite:
*"German default: the app is German-primary."*

### English copy with no prop to override it

These are not defaults — a consumer cannot localise them at all:

| String | Where |
|---|---|
| `'Discard'`, `'Save'` | `DraggableList` editor action row |
| `'Delete'`, `'Edit'` | `DraggableList` item action row |
| `` `Drag ${itemNoun} ${position}` `` | `DraggableList` handle `aria-label` |
| `` `Show actions for …` `` / `` `Hide actions for …` `` | `DraggableList` chevron `aria-label` |
| `` `${itemNoun} ${i+1} lifted. Arrows to move, M to merge, Escape to cancel.` ``, `` `… dropped.` ``, `'Move cancelled.'`, `` `${itemNoun} moved to position ${n}.` ``, `` `Merged into ${itemNoun} ${n}.` `` | `DraggableList` keyboard live-region announcements |
| `Badge` / `Message` status words | `STATUS_WORD` is a module constant with no prop — the German words cannot be overridden either |

`PhotoUpload.formatSize()` emits `'B' / 'kB' / 'MB'` with no override.

---

## 8 · Things that look wrong — recorded, not touched

Ordered by how much they matter for the move.

### 8.1 `index.ts` has a syntax error that blocks the whole package

`components/index.ts`, in the `InteractiveWizard` type export:

```ts
export type {
  InteractiveWizardProps, WizardPanelProps, WizardStep, WizardStepState, WizardStateWords,, WizardAccent } from './InteractiveWizard';
```

A **double comma**. Confirmed against `tsc`: `error TS1003: Identifier expected.`
This is a parse error, so it fails before any other check runs. **`pnpm check`
cannot pass while it is there.** It is a transcription typo, not an API decision.

### 8.2 The `data-state` prop on `<Icon>` IS used by a CSS rule

The brief for fix #1 says *"no CSS rule uses it"*. There is one, at
`musy-components.css:630–631`:

```css
.musy-switch__glyph { grid-area: 1 / 1; transition: opacity var(--motion-toggle); }
.musy-switch__glyph[data-state="hidden"] { opacity: 0; }
```

`Switch.tsx:79–82` passes `data-state={checked ? 'shown' : 'hidden'}` /
`data-state={checked ? 'hidden' : 'shown'}` to two `<Icon>` elements carrying
`className="musy-switch__glyph"`. Both glyphs stay mounted, stacked in the same
grid cell (`grid-area: 1 / 1`), and the `[data-state="hidden"]` rule is the only
thing hiding one of them.

`IconProps` has no index signature, so the prop never reaches the DOM anyway —
which means **the rule has never matched and the knob has always rendered both
glyphs on top of each other.** The prop is dead in the compiled output; it is
the *CSS* that is orphaned, not the rule that is absent. Deleting the prop is
correct and changes nothing at runtime, but it leaves lines 630–631 as dead CSS
and leaves the Switch with no working on/off glyph cue — which the file header
calls *"the non-colour cue for the on/off state (1.4.1)"*.

Deleting the prop as instructed is what I will do. Flagging it because the
stated reason for the deletion is not quite the situation on the ground.

### 8.3 `TypeStep` omits `body-xl` as well as `stage`

`musy-components.css:1381–1392` defines twelve `[data-type-step]` rules.
`TypeStep` in `ContentBox.tsx` lists ten. **Two** are missing:

| Value | CSS rule | Tokens |
|---|---|---|
| `stage` | line 1383 | `--type-stage-size/-line/-tracking/-weight/-family` — `musy-foundations.css:508–512` |
| `body-xl` | line 1385 | `--type-body-xl-size/-line/-tracking/-weight/-family` — `musy-foundations.css:547–551` |

The brief names only `stage`. `body-xl` has exactly the same shape of evidence.
I will add only `stage`, per instruction.

### 8.4 `process.env.NODE_ENV` in `SegmentedControl.tsx`

Line 66: `if (process.env.NODE_ENV !== 'production' && …)`. Under the app's
current `tsconfig.json` (`lib: ["ES2022","DOM","DOM.Iterable"]`, no
`@types/node`), `process` is not declared. This is a likely **third** typecheck
error that neither of the two named fixes covers. Vite substitutes the value at
build time, so it works at runtime.

### 8.5 Process Visualisation: CSS says retired, docs and exports say live

`§8b` header: *"Superseded by 8 · Carousel … no new screen should reach for it."*
But `ProcessVisualisation` is exported from `index.ts`, and
`docs/07-components.md` `## 7.8` is marked `[OPEN]` with a full spec and no
retirement note. Three sources, two answers.

### 8.6 Carousel is CSS-only

§8 (1032–1234, ~200 lines) styles a component that does not exist in this export.
`07-product-description.md` describes a five-card onboarding carousel as a
product requirement. Either the component was never written or it was not
included in the export.

### 8.7 `Field.tsx` header comment is truncated mid-sentence

Lines 26–30:

> *"VALIDITY IS NEVER PAINTED BEFORE IT IS EARNED. The success border and the
> success line are gated on `data-touched`, so an untouched empty field is
> neutral rather than green, and the validity properties carry no transition —
> VALUE GOES THROUGH Field.Control, NOT Field.Root."*

Two separate notes have been spliced together; the first sentence never finishes.
`docs/12-component-gaps.md` §6 records the `Field.Root` defect this refers to.

### 8.8 `DropHints` is not re-exported

See §3. The type of a public prop cannot be named from the package entry point.

### 8.9 `--musy-rcard-row-min: 480px` is an undocumented literal

The file header names `--musy-card-min: 196px` as *"the third documented
literal"* and the only measurement in the file. `--musy-rcard-row-min` (line
1582) is a fourth, and a second measurement, with no token-gap reference.

### 8.10 `Logo` default `src` will 404 after the move

`'/assets/web/musy-logo.png'` is root-absolute. The move puts the file under
`packages/design-system/`, not at a served `/assets/web/` path. Not in scope to
change; a consuming app must either serve it there or pass `src`.

### 8.11 `assets/method-card.png` is referenced by nothing

Both copies (`assets/` and `assets/web/`) are unreferenced by any component,
stylesheet or token file.

---

## 9 · What the move will need beyond a file copy

Recorded here so the plan is checkable against the facts.

1. **`pnpm-workspace.yaml` covers only `apps/*`.** `packages/*` has to be added
   or the new package is invisible to pnpm.
2. **There is no root `tsconfig.json`.** The instruction is "tsconfig extending
   the root" — the root file does not exist yet.
3. **`pnpm check` only runs `--filter web`.** Both `typecheck` and `lint` scripts
   at the root filter to the `web` package, so the design system would not be
   checked at all unless the filters change. "Done when `pnpm check` passes with
   the whole system in the repo" requires touching those two scripts.
4. **`@base-ui/react` and `lucide-react` are not installed anywhere in the repo.**
   Peer dependencies are not installed by pnpm for typechecking; the package
   needs them as devDependencies too, or `tsc` cannot resolve a single import.
   Both resolve on npm: `@base-ui/react` has `1.7.0` and `1.8.0` published, and
   every subpath the components import (`use-render`, `button`, `tooltip`,
   `switch`, `radio-group`, `radio`, `fieldset`, `separator`, `dialog`, `field`,
   `progress`, `slider`) exists in `1.7.0`. `lucide-react@0.470.0` exists.
5. **`@types/react` is only in `apps/web`.** The design system package needs its
   own, or `React.ReactNode` does not resolve.
6. **The source folder is `reference/design_system`, not `reference/design-system`.**
