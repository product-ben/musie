# Musy — Design System

Three layers, one system.

| Layer | What it answers | Entry point |
|---|---|---|
| **Layer 1 — Foundations** | What a token is | [`01-foundations.md`](01-foundations.md) |
| **Layer 2 — Components** | What a thing *is* | [`07-components.md`](07-components.md) |
| **Layer 3 — Layout** | Where things *go* | [`10-layout.md`](10-layout.md) |

Layer 1 is foundations only: every decision that would normally live inside a
component was pushed into a token. Layer 2 is the component set, built on Layer 1
and amending nothing. Layer 3 is the arrangement *between* components — the gap
ladder, which edge a primary action hugs, what happens at 393px — which neither
of the other two can state, and which is where two screens built from the same
components stop looking like one product.

## Layer 2 — components

| # | Deliverable | File |
|---|---|---|
| 1 | Component source — React + TypeScript on **base-ui** `^1.7`, one file per component | [`components/`](../components) |
| — | Dependencies | [`package.json`](../package.json) |
| 1 | Component styles — token-only, no literal values | [`components/musy-components.css`](../components/musy-components.css) |
| 2 | Component documentation | [`07-components.md`](07-components.md) |
| 3 | Deltas — Layer 2 section | [`02-deltas.md`](02-deltas.md#layer-2--component-deltas) |
| 4 | Conflict report — Layer 2 section, **unresolved** | [`03-conflict-report.md`](03-conflict-report.md#layer-2--conflict-report-continues-ab-numbering) |
| 5 | Token gaps — G1, G2, G3 | [`08-token-gaps.md`](08-token-gaps.md) |
| — | Staged gap tokens (**not** part of Layer 1) | [`tokens/musy-foundations-amendments.css`](../tokens/musy-foundations-amendments.css) |
| 6 | Proof page — every variant, every state, both themes, 3 viewports | `../Musy Components Proof.dc.html` |
| 7 | Open questions 14–22 | [`06-open-questions.md`](06-open-questions.md#layer-2--open-questions-continues-the-numbering) |
| 8 | Clickdummy handoff — component map + preview-only scaffolding | [`09-clickdummy-handoff.md`](09-clickdummy-handoff.md) |

Components: Icon · Icon Button · CTA Button · Switch ·
Radio Group (text) · Radio Group (image+text) · Process Visualisation ·
Content Box · Message · Content List · Radio Cards · Lightbox · Logo ·
**Field · Interactive Wizard · Photo Upload · Voice Note**.

The last four were released for the clickdummy pass (§7.16–7.19). Field and
Interactive Wizard consume stylesheet sections that already existed and were
proven on the proof page; Photo Upload and Voice Note add §18 and §19 to
`components/musy-components.css`, token-only, no Layer 1 amendment.

Three are **provisional** pending Layer 1 absorbing a token gap: Icon at
`size="sm"` (G1), Content Box's dashed outline and Photo Upload's drop zone
(both G2).

---

## Layer 3 — layout

Fifteen rules, L1–L15, forced by building a real screen — a voice-to-text
transcript workspace — against the released set. Every number is a Layer 1
token; nothing in it amends Layer 1 or Layer 2.

| # | Deliverable | File |
|---|---|---|
| 1 | **Layer 3 — Layout.** Fifteen rules, L1–L15 | [`10-layout.md`](10-layout.md) |
| 2 | Toast — the spec §7.23 was built from | [`11-toast.md`](11-toast.md) |
| 3 | Component gaps — six decided changes to Layers 1 and 2, all applied | [`12-component-gaps.md`](12-component-gaps.md) |
| 4 | Draggable List — the spec §7.24 was built from | [`13-draggable-list.md`](13-draggable-list.md) |
| 5 | Reflect step — how §7.22–24 compose into the prototype. **Integration note, not a rule** | [`14-reflect-step.md`](14-reflect-step.md) |
| 6 | Evidence — every measurement L1–L15 rests on, and how it was taken | [`15-layout-evidence.md`](15-layout-evidence.md) |
| 7 | Source notes — the screen §7.24 was extracted from, and its three silent traps | [`16-workspace-source.md`](16-workspace-source.md) |
| 8 | Open questions 26–34 | [`06-open-questions.md`](06-open-questions.md) |

**Two facts drive most of it.** Mobile first — design and measure at 393px, in
that order. And thumb-first, right-handed — which is why a primary CTA is
right-aligned to its parent, and a Continue button always is.

**Version 1, not settled law.** Every rule comes from *one* screen. They are
measured and they hold for a transcript workspace; a form, a media grid or a
multi-step flow will find gaps, particularly in L2's gap ladder and L6's
action-row rule. See open question 27.

**`14-reflect-step.md` is not applied.** It is the integration note for putting
§7.22–24 into the prototype's Reflect step, and its four open items are product
decisions — raised as questions 31–34, not decided. `Musy MVP 0.3.dc.html` is
untouched by this pass.

---

## Layer 1 — foundations

| # | Deliverable | File |
|---|---|---|
| 1 | Token file — CSS custom properties | [`tokens/musy-foundations.css`](../tokens/musy-foundations.css) |
| 1 | Token file — Style Dictionary / DTCG JSON | [`tokens/musy-foundations.tokens.json`](../tokens/musy-foundations.tokens.json) |
| — | Theme bootstrap (FOUC prevention) | [`tokens/theme-init.js`](../tokens/theme-init.js) |
| 2 | Foundations documentation | [`01-foundations.md`](01-foundations.md) |
| 3 | Deltas table | [`02-deltas.md`](02-deltas.md) |
| 4 | Conflict report — **unresolved, for you** | [`03-conflict-report.md`](03-conflict-report.md) |
| 5 | Contrast audit — 94 pairs, 0 failures | [`04-contrast-audit.md`](04-contrast-audit.md) |
| — | Palette reference | [`05-palette-reference.md`](05-palette-reference.md) |
| 6 | Proof page | `../Musy Foundations Proof.dc.html` |
| 7 | Open questions | [`06-open-questions.md`](06-open-questions.md) |

## Authority tags as applied

| § | Section | Tag used | Why |
|---|---|---|---|
| 4.1 | Colour — raw palette | `[SEED]` | as briefed |
| 4.2 | Colour — semantic | `[OPEN]` | as briefed |
| 4.3 | Typography | `[SEED]` | as briefed; the file defines **no text styles**, only ad-hoc sizes |
| 4.4 | Spacing | **`[SEED]`, not `[OPEN]`** | the file *does* have a usable Spacing collection — see conflict 5 |
| 4.5 | Breakpoints & grid | `[OPEN]` | nothing in the file |
| 4.6 | Radius / border / elevation | `[SEED]` | 2 radius variables; no border or elevation variables |
| 4.7 | Motion | `[OPEN]` | nothing in the file |
| 4.8 | Focus | `[OPEN]` | nothing in the file |
| 4.9 | Iconography | `[LOCKED]` | reproduced; **two conflicts reported, unresolved** |
| 4.10–4.12 | Z-index, naming, theming | `[OPEN]` | nothing in the file |

## Install

```html
<head>
  <script src="tokens/theme-init.js"></script>          <!-- sync, before CSS -->
  <link rel="stylesheet" href="tokens/musy-foundations.css">
  <link rel="stylesheet" href="tokens/musy-foundations-amendments.css">  <!-- gaps G1, G2 -->
  <link rel="stylesheet" href="components/musy-components.css">
</head>
```

Load order matters: foundations, then the staged gaps, then components.

base-ui also needs two lines in the app shell — `isolation: isolate` on the root
wrapper (so portaled popups clear local `z-index`) and `body { position: relative }`
(iOS 26+ Safari backdrops) — plus one `<MusyTooltipProvider>` near the root.
See open questions 24–25.

Consume **only** the semantic and dimension token tiers. Raw `--sand-*`,
`--terracotta-*` etc. are implementation detail.

> **Naming, resolved.** Pass 1 called the token *tiers* "Layer 1 / 2 / 3"
> (raw / semantic / dimension), which now collides with the system's three
> layers. The tiers are referred to as **tiers** throughout; "Layer" means
> foundations, components or layout. Logged as conflict B13.
