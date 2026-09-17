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
