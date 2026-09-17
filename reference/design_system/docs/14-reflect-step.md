# 14 · Building the workspace into step 4 · Reflect

> **Integration note, not a rule.** Filed with Layer 3 because it arrived with
> it, but it belongs to the **prototype**, not to the system: it says how
> §7.22, §7.23 and §7.24 compose into one wizard step. Its four open items are
> product decisions and are **raised, not decided** — open questions 31–34.
> Nothing in it has been applied to `Musy MVP 0.3.dc.html` yet.

How the interactive screen at `#/musie` goes into the prototype's **Reflect**
step, replacing the voice branch.

Today Reflect asks one question tied to the card and takes an answer three ways —
voice, typed text, or a photo of handwritten notes (`09-clickdummy-handoff.md`).
The voice branch is §7.19 Voice Note: record, play back, delete. It captures
**audio**.

After this, the voice branch captures **words**: the answer is spoken, transcribed
as it is said, and then rearranged and corrected by the person who said it. That
is §7.24 Draggable List, and it is a different thing from a voice memo — the
reflection becomes text the user can see and fix, which is what makes it
shareable in step 5 at all.

---

## What moves in, and what does not

**In** — the three components and the rules that arrange them:

| Part | Component |
| --- | --- |
| Capture | §7.22 Record Button |
| The transcript, and every edit to it | §7.24 Draggable List |
| Undo after a merge or a delete | §7.23 Toast |
| Spacing, alignment, type, drag affordances | [10 · Layout](10-layout.md) |

**Out** — everything on `#/musie` that is demo chrome rather than product:

| Not this | Because |
| --- | --- |
| The page `<h1>` | The step's **question** is the heading here. The demo's title is a title for the demo |
| The dark-mode `Switch` | The app shell owns `data-theme` (L1). One theme mechanism, at the root |
| The intro paragraph | The wizard's own copy introduces the step |
| The API key `Field` | Demo scaffolding. A key belongs nowhere in a user-facing flow — see **open item 3** |
| The data-layer `Switch` and its JSON | A developer affordance, not product UI |
| The "Back to the plain demo" link | Demo navigation |

What is left is the part that does the work: a record control, a list, and a
toast.

---

## Where it sits

```
InteractiveWizard  current="reflect"           the step rail, unchanged
└── WizardPanel
    ├── h2            the card's question        "What is the anger protecting?"
    ├── RadioGroupText  answer mode              voice · typed · photo  (default voice)
    │
    ├── VOICE BRANCH  ← this is what changes
    │   ├── RecordButton         §7.22   ready ⇄ recording
    │   ├── p.note                       the stop rules, body-sm
    │   ├── DraggableList        §7.24   empty → waiting → hearing → editable
    │   └── Toast                §7.23   undo, over everything
    │
    ├── TYPED BRANCH   Field multiline          unchanged
    └── PHOTO BRANCH   PhotoUpload              unchanged
        actions={<CtaButton>Continue</CtaButton>}
```

**Heading levels shift down by one.** On `#/musie` the page title is `<h1>` and a
card's hidden heading is `<h3>`. Inside a WizardPanel the question is the
heading, so the card's `headingLevel` follows whatever the panel's question is
plus one. Content Box takes it as a prop precisely because the box cannot know
where it sits (1.3.1) — pass it, do not let it default.

**Order inside the branch is fixed.** Record control first, list below it. That
is L6 read through the flow: the control that produces the content sits above
the content, and new statements append to the end, so the list grows away from
the button rather than pushing it down the screen.

---

## The rules that apply, and the ones that bite here

- **L6 — the Continue button is right-aligned to its parent.** `WizardPanel`'s
  `actions` row is `flex` with `--space-gap-related`; add `justify-content:
  flex-end`. This is the case L6 names explicitly.
- **L6 — the record control is also a primary CTA**, so when it hugs its label
  it hugs the *right* edge, not the left.
- **L2 — the branch is one molecule inside the panel.** Record control, note and
  list sit at `--space-gap-stack`; the branch is separated from the question and
  the mode picker by `--space-gap-group`. Verify the doubling check.
- **L8 — the question is prose the user must read to act**, so it is `body-md`
  or a heading step, never `body-sm`. The statements themselves follow the
  dense-list rule: ≤ 80 characters `body-sm`, longer `body-md`.
- **L10 — the empty and waiting states are the same dashed box.** In the flow
  this matters more than on the demo: the panel must not change height the
  moment the user starts speaking, or the Continue button moves under their
  thumb mid-sentence.

---

## State, across the step boundary

The list's states (§7.24) all apply. Three interactions with the wizard are new:

| Situation | Behaviour |
| --- | --- |
| Nothing captured yet | **Continue is disabled.** An empty reflection is not an answer |
| Capture is running | Items are read-only (§7.24's *populated, read-only*), and **Continue is disabled** — finishing the step mid-sentence would discard the sentence |
| The user navigates to an earlier step mid-recording | Stop capture first, keeping the in-flight sentence. Never drop it silently |
| The user switches answer mode with statements captured | Ask before discarding. Switching to *typed* could carry the transcript into the Field as a starting point — see **open item 1** |
| Returning to Reflect from a later step | The transcript is still there and still editable. Completed steps stay reachable, which is Interactive Wizard's own rule |

---

## Open items to resolve with the designer

**1 · A reflection is one answer; the list produces several statements.** Step 5
emails *the* reflection. Three ways to reconcile that, and it is a product
decision rather than a layout one:

- join the statements with a space or a line break at the step boundary and send
  that;
- make the list's merge affordance the intended path, so the user combines them
  into one before continuing;
- send them as a list, and let step 5's preview show them as such.

The second is the most honest to what the component offers, and the slowest for
the user. Nothing in the layout depends on this — but the Continue copy does.

**2 · The question is on screen while the user speaks.** Today the demo has no
question above the list. Inside Reflect there is one, and it should stay visible
while recording — a person answering aloud looks back at the prompt. That makes
the panel taller, which is what the sticky-versus-scrolling decision turns on.

**3 · The prototype has no backend, and transcription needs a key.** On `#/musie`
the user pastes one, which is fine for a demo and impossible in the product.
Either the prototype keeps simulating transcription in this step, or the real
flow needs somewhere for the key to live. The component does not care — it is
fully controlled, and a simulated transcriber drives it identically — but the
prototype's fidelity does.

**4 · German.** The prototype ships English first, and every state word here is
English. §7.24's 80-character threshold for the type step was set on German
sample text, which runs ~30% longer; it does not need changing, but it should be
re-read once the German copy exists.

---

## Reference

- The working screen: `#/musie` — everything above it, minus the chrome.
- Every state: `#/states`.
- Source: `src/musie/` in the source repo, with
  [`16-workspace-source.md`](16-workspace-source.md) naming the seam between
  the layout and the speech behind it. The transcriber is replaceable:
  the component takes items and callbacks, and does not know where the words
  came from.
