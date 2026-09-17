repo: product-ben/musie-voice-to-text-demo
branch: main
path: handoff

## Last sync

date: 2026-09-17T11:36:06Z

### Updated in this project

- **Draggable List released as §7.24** — `components/DraggableList.tsx`, §24 of `components/musy-components.css`, exports, §7.24 of `07-components.md`, and a proof section with the twelve-state matrix. Ships with `components/useCoarsePointer.ts`, the hook L5 needs.
- **Two more Layer 3 docs filed** — `docs/13-draggable-list.md` and `docs/14-reflect-step.md`, plus `docs/16-workspace-source.md` for the source notes. Evidence moved to `docs/15-layout-evidence.md` so 13 and 14 keep the handoff's numbers.
- **Segmented Control renumbered to §7.25** — upstream's §7.24 is Draggable List, decided before the local component existed. Recorded as conflict B21 with the rule it settles.
- **Five questions raised, not decided** — Q30 (§7.24's keyboard drag is implemented and unverified) and Q31–34, the four product decisions from `14-reflect-step.md`.

## Screen map

| Project file | Built from |
|---|---|
| `docs/10-layout.md` | `handoff/10-layout.md` (filed verbatim; L15 extended with the elastic-part check) |
| `docs/11-toast.md` | `handoff/11-toast.md` |
| `docs/12-component-gaps.md` | `handoff/12-component-gaps.md` |
| `docs/13-draggable-list.md` | `handoff/13-draggable-list.md` |
| `docs/14-reflect-step.md` | `handoff/14-reflect-step.md` — **not applied**, integration note only |
| `docs/15-layout-evidence.md` | `handoff/evidence.md` |
| `docs/16-workspace-source.md` | `handoff/workspace/README.md` |
| `components/Toast.tsx` | `handoff/toast/Toast.tsx` |
| `components/musy-components.css` §23 | `handoff/toast/toast.css` |
| `components/DraggableList.tsx` | `handoff/13-draggable-list.md` + `handoff/workspace/src/MusieStatementCard.tsx`, `MusieTranscriptWorkspace.tsx` |
| `components/musy-components.css` §24 | `handoff/workspace/src/musie.css` (the authority where it and the prose differed) |
| `components/useCoarsePointer.ts` | `handoff/workspace/src/useCoarsePointer.ts` |
| `docs/07-components.md` §7.23, §7.24 | `handoff/11-toast.md`, `handoff/13-draggable-list.md` |
| `docs/07-components.md` §7.9, §7.16, §7.22 | `handoff/12-component-gaps.md` §2, §6, §3–4 |
| `components/ContentBox.tsx`, `RecordButton.tsx`, `Field.tsx` | `handoff/12-component-gaps.md` §2, §3–4, §6 |
| `tokens/musy-foundations.css`, `.tokens.json`, `docs/01-foundations.md` | `handoff/12-component-gaps.md` §1, §5 |
| `docs/02-deltas.md`, `03-conflict-report.md`, `04-contrast-audit.md`, `06-open-questions.md` | `handoff/PROMPT.md` steps 7–8 |

Not imported: `handoff/workspace/src/*.tsx` and `musie.css` (read, not copied —
they are bundler-bound source for the reference screen), the transcription
hooks, and the three GitHub Pages routes. `Musy MVP 0.3.dc.html` is untouched by
this pass — see `docs/14-reflect-step.md` and questions 31–34.

## Sync history

### 2026-09-17T11:02:46Z

- Layer 3 filed (`10-layout.md`, L1–L15) and added to `docs/README.md` as a peer of foundations and components.
- Toast released as §7.23, first consumer of Layer 1's `--z-toast`.
- All six component gaps applied; conflicts B18–B20 and questions 26–29 logged.
