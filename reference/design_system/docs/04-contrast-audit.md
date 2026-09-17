# Contrast audit (generated)

Every foreground/background pair the semantic layer actually produces, measured
in **light and dark independently**. Ratios are computed from the resolved token
values, not asserted. **94 pairs · 0 failures.**

> **Scope, and the gap it left.** These 94 pairs are **foreground-on-fill** —
> ink against the surface or solid behind it. They do **not** cover
> **solid-on-surface**: a step-9 fill measured as a standalone graphic against
> the page or card it sits on. That family of pairs is absent, and its absence
> is what let the palette's step-9 comment promise "meaningful graphics" for a
> colour that cannot keep it — `purple-9` measures **1.85:1** against the page
> and **2.01:1** against a card, under 1.4.11's 3:1. The comment has been
> corrected rather than the colour
> ([12 · Component gaps](12-component-gaps.md) §5); the `-edge` step is the one
> solved for this case, at 3.90:1 / 4.25:1. **Adding the solid-on-surface family
> would have caught it**, and is the audit's next extension.

The proof page recomputes this table live from the rendered DOM, so it cannot
drift from the CSS.

Requirement key — `4.5` body text (1.4.3) · `3.0` non-text contrast (1.4.11) ·
`—` exempt (disabled state, decorative divider, or a fill whose boundary is
delegated to its `-border` token).

| Foreground | Background | Req | Light | ✓ | Dark | ✓ | Purpose |
|---|---|---|---|---|---|---|---|
| `on-surface` | `surface` | 4.5 | 15.05 | **pass** | 14.78 | **pass** | Body + headings · 1.4.3 |
| `on-surface-muted` | `surface` | 4.5 | 5.91 | **pass** | 6.14 | **pass** | Secondary text · 1.4.3 |
| `on-surface-disabled` | `surface` | — | 3.16 | exempt | 3.71 | exempt | Disabled text — exempt from 1.4.3 |
| `border-strong` | `surface` | 3.0 | 3.95 | **pass** | 4.10 | **pass** | Control boundary · 1.4.11 |
| `border-focus` | `surface` | 3.0 | 5.88 | **pass** | 7.11 | **pass** | Focus indicator · 1.4.11 + 2.4.7 |
| `border-subtle` | `surface` | — | 1.28 | exempt | 1.47 | exempt | Decorative divider — exempt |
| `on-surface` | `surface-raised` | 4.5 | 16.38 | **pass** | 12.46 | **pass** | Body + headings · 1.4.3 |
| `on-surface-muted` | `surface-raised` | 4.5 | 6.44 | **pass** | 5.18 | **pass** | Secondary text · 1.4.3 |
| `on-surface-disabled` | `surface-raised` | — | 3.44 | exempt | 3.13 | exempt | Disabled text — exempt from 1.4.3 |
| `border-strong` | `surface-raised` | 3.0 | 4.30 | **pass** | 3.46 | **pass** | Control boundary · 1.4.11 |
| `border-focus` | `surface-raised` | 3.0 | 6.40 | **pass** | 5.99 | **pass** | Focus indicator · 1.4.11 + 2.4.7 |
| `border-subtle` | `surface-raised` | — | 1.40 | exempt | 1.24 | exempt | Decorative divider — exempt |
| `on-surface` | `surface-sunken` | 4.5 | 13.40 | **pass** | 16.16 | **pass** | Body + headings · 1.4.3 |
| `on-surface-muted` | `surface-sunken` | 4.5 | 5.27 | **pass** | 6.71 | **pass** | Secondary text · 1.4.3 |
| `on-surface-disabled` | `surface-sunken` | — | 2.81 | exempt | 4.06 | exempt | Disabled text — exempt from 1.4.3 |
| `border-strong` | `surface-sunken` | 3.0 | 3.52 | **pass** | 4.48 | **pass** | Control boundary · 1.4.11 |
| `border-focus` | `surface-sunken` | 3.0 | 5.24 | **pass** | 7.77 | **pass** | Focus indicator · 1.4.11 + 2.4.7 |
| `border-subtle` | `surface-sunken` | — | 1.14 | exempt | 1.61 | exempt | Decorative divider — exempt |
| `on-surface-inverse` | `surface-inverse` | 4.5 | 16.38 | **pass** | 16.16 | **pass** | Tooltip text |
| `interactive-primary-on` | `interactive-primary` | 4.5 | 4.56 | **pass** | 6.52 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-primary-on` | `interactive-primary-hover` | 4.5 | 5.50 | **pass** | 7.77 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-primary-on` | `interactive-primary-active` | 4.5 | 6.43 | **pass** | 5.61 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-primary` | `surface` | — | 4.19 | exempt | 5.97 | exempt | Fill vs page — if <3:1 the -border token is MANDATORY |
| `interactive-primary-border` | `surface` | 3.0 | 3.91 | **pass** | 4.11 | **pass** | Fill boundary · 1.4.11 |
| `interactive-primary-on-subtle` | `interactive-primary-subtle` | 4.5 | 5.20 | **pass** | 5.70 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-primary-on-subtle` | `interactive-primary-subtle-hover` | 4.5 | 4.88 | **pass** | 5.17 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-primary-on-subtle` | `interactive-primary-subtle-active` | 4.5 | 4.57 | **pass** | 4.73 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-primary-on-subtle` | `surface` | 4.5 | 5.88 | **pass** | 6.16 | **pass** | Tinted-fill text used bare on the page |
| `on-surface` | `interactive-primary-subtle` | 4.5 | 13.31 | **pass** | 13.67 | **pass** | Body text inside a tinted card |
| `on-surface-muted` | `interactive-primary-subtle` | 4.5 | 5.23 | **pass** | 5.68 | **pass** | Muted text inside a tinted card |
| `interactive-primary-on-disabled` | `interactive-primary-disabled` | — | 3.04 | exempt | 3.48 | exempt | Disabled label — exempt |
| `interactive-accent-placeholder1-on` | `interactive-accent-placeholder1` | 4.5 | 9.54 | **pass** | 10.42 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-accent-placeholder1-on` | `interactive-accent-placeholder1-hover` | 4.5 | 8.11 | **pass** | 12.18 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-accent-placeholder1-on` | `interactive-accent-placeholder1-active` | 4.5 | 7.14 | **pass** | 9.06 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-accent-placeholder1` | `surface` | — | 1.58 | exempt | 9.53 | exempt | Fill vs page — if <3:1 the -border token is MANDATORY |
| `interactive-accent-placeholder1-border` | `surface` | 3.0 | 3.91 | **pass** | 4.07 | **pass** | Fill boundary · 1.4.11 |
| `interactive-accent-placeholder1-on-subtle` | `interactive-accent-placeholder1-subtle` | 4.5 | 5.19 | **pass** | 5.61 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-accent-placeholder1-on-subtle` | `interactive-accent-placeholder1-subtle-hover` | 4.5 | 4.88 | **pass** | 5.09 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-accent-placeholder1-on-subtle` | `interactive-accent-placeholder1-subtle-active` | 4.5 | 4.62 | **pass** | 4.64 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-accent-placeholder1-on-subtle` | `surface` | 4.5 | 5.86 | **pass** | 6.13 | **pass** | Tinted-fill text used bare on the page |
| `on-surface` | `interactive-accent-placeholder1-subtle` | 4.5 | 13.34 | **pass** | 13.54 | **pass** | Body text inside a tinted card |
| `on-surface-muted` | `interactive-accent-placeholder1-subtle` | 4.5 | 5.24 | **pass** | 5.62 | **pass** | Muted text inside a tinted card |
| `interactive-accent-placeholder1-on-disabled` | `interactive-accent-placeholder1-disabled` | — | 3.04 | exempt | 3.48 | exempt | Disabled label — exempt |
| `interactive-accent-placeholder2-on` | `interactive-accent-placeholder2` | 4.5 | 8.14 | **pass** | 7.88 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-accent-placeholder2-on` | `interactive-accent-placeholder2-hover` | 4.5 | 6.96 | **pass** | 9.37 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-accent-placeholder2-on` | `interactive-accent-placeholder2-active` | 4.5 | 6.10 | **pass** | 6.83 | **pass** | Label on solid fill · 1.4.3 |
| `interactive-accent-placeholder2` | `surface` | — | 1.85 | exempt | 7.21 | exempt | Fill vs page — if <3:1 the -border token is MANDATORY |
| `interactive-accent-placeholder2-border` | `surface` | 3.0 | 3.90 | **pass** | 4.07 | **pass** | Fill boundary · 1.4.11 |
| `interactive-accent-placeholder2-on-subtle` | `interactive-accent-placeholder2-subtle` | 4.5 | 5.27 | **pass** | 5.65 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-accent-placeholder2-on-subtle` | `interactive-accent-placeholder2-subtle-hover` | 4.5 | 4.95 | **pass** | 5.13 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-accent-placeholder2-on-subtle` | `interactive-accent-placeholder2-subtle-active` | 4.5 | 4.66 | **pass** | 4.68 | **pass** | Text on tinted fill · 1.4.3 |
| `interactive-accent-placeholder2-on-subtle` | `surface` | 4.5 | 5.94 | **pass** | 6.15 | **pass** | Tinted-fill text used bare on the page |
| `on-surface` | `interactive-accent-placeholder2-subtle` | 4.5 | 13.34 | **pass** | 13.58 | **pass** | Body text inside a tinted card |
| `on-surface-muted` | `interactive-accent-placeholder2-subtle` | 4.5 | 5.24 | **pass** | 5.64 | **pass** | Muted text inside a tinted card |
| `interactive-accent-placeholder2-on-disabled` | `interactive-accent-placeholder2-disabled` | — | 3.04 | exempt | 3.48 | exempt | Disabled label — exempt |
| `interactive-ghost-on` | `interactive-ghost-hover` | 4.5 | 13.40 | **pass** | 12.46 | **pass** | Ghost label on hover fill |
| `interactive-ghost-on` | `interactive-ghost-active` | 4.5 | 12.56 | **pass** | 11.29 | **pass** | Ghost label on pressed fill |
| `interactive-ghost-border` | `surface` | 3.0 | 3.95 | **pass** | 4.10 | **pass** | Ghost outline boundary · 1.4.11 |
| `accent-1-on` | `accent-1` | 4.5 | 4.56 | **pass** | 6.52 | **pass** | Foreground on accent solid |
| `accent-1-text` | `surface` | 4.5 | 5.88 | **pass** | 6.16 | **pass** | Accent as text |
| `accent-1-border` | `surface` | 3.0 | 3.91 | **pass** | 4.11 | **pass** | Accent boundary · 1.4.11 |
| `accent-1-text` | `accent-1-subtle` | 4.5 | 5.20 | **pass** | 5.70 | **pass** | Accent text on its own tint |
| `accent-2-on` | `accent-2` | 4.5 | 9.54 | **pass** | 10.42 | **pass** | Foreground on accent solid |
| `accent-2-text` | `surface` | 4.5 | 5.86 | **pass** | 6.13 | **pass** | Accent as text |
| `accent-2-border` | `surface` | 3.0 | 3.91 | **pass** | 4.07 | **pass** | Accent boundary · 1.4.11 |
| `accent-2-text` | `accent-2-subtle` | 4.5 | 5.19 | **pass** | 5.61 | **pass** | Accent text on its own tint |
| `accent-3-on` | `accent-3` | 4.5 | 8.14 | **pass** | 7.88 | **pass** | Foreground on accent solid |
| `accent-3-text` | `surface` | 4.5 | 5.94 | **pass** | 6.15 | **pass** | Accent as text |
| `accent-3-border` | `surface` | 3.0 | 3.90 | **pass** | 4.07 | **pass** | Accent boundary · 1.4.11 |
| `accent-3-text` | `accent-3-subtle` | 4.5 | 5.27 | **pass** | 5.65 | **pass** | Accent text on its own tint |
| `feedback-info-text` | `feedback-info-surface` | 4.5 | 10.91 | **pass** | 13.05 | **pass** | Message text in banner · 1.4.3 |
| `feedback-info-text` | `surface` | 4.5 | 10.92 | **pass** | 12.92 | **pass** | Message text inline on the page |
| `feedback-info-icon` | `feedback-info-surface` | 3.0 | 5.93 | **pass** | 6.21 | **pass** | Status icon · 1.4.11 |
| `feedback-info-icon` | `surface` | 3.0 | 5.93 | **pass** | 6.15 | **pass** | Status icon inline · 1.4.11 |
| `feedback-info-border` | `surface` | 3.0 | 3.90 | **pass** | 4.07 | **pass** | Banner boundary · 1.4.11 |
| `on-surface` | `feedback-info-surface` | 4.5 | 15.04 | **pass** | 14.93 | **pass** | Body text inside a banner |
| `feedback-warning-text` | `feedback-warning-surface` | 4.5 | 11.16 | **pass** | 12.90 | **pass** | Message text in banner · 1.4.3 |
| `feedback-warning-text` | `surface` | 4.5 | 11.19 | **pass** | 12.76 | **pass** | Message text inline on the page |
| `feedback-warning-icon` | `feedback-warning-surface` | 3.0 | 5.86 | **pass** | 6.19 | **pass** | Status icon · 1.4.11 |
| `feedback-warning-icon` | `surface` | 3.0 | 5.88 | **pass** | 6.12 | **pass** | Status icon inline · 1.4.11 |
| `feedback-warning-border` | `surface` | 3.0 | 3.90 | **pass** | 4.09 | **pass** | Banner boundary · 1.4.11 |
| `on-surface` | `feedback-warning-surface` | 4.5 | 15.00 | **pass** | 14.95 | **pass** | Body text inside a banner |
| `feedback-success-text` | `feedback-success-surface` | 4.5 | 10.81 | **pass** | 13.08 | **pass** | Message text in banner · 1.4.3 |
| `feedback-success-text` | `surface` | 4.5 | 10.77 | **pass** | 13.02 | **pass** | Message text inline on the page |
| `feedback-success-icon` | `feedback-success-surface` | 3.0 | 5.88 | **pass** | 6.17 | **pass** | Status icon · 1.4.11 |
| `feedback-success-icon` | `surface` | 3.0 | 5.86 | **pass** | 6.14 | **pass** | Status icon inline · 1.4.11 |
| `feedback-success-border` | `surface` | 3.0 | 3.90 | **pass** | 4.08 | **pass** | Banner boundary · 1.4.11 |
| `on-surface` | `feedback-success-surface` | 4.5 | 15.11 | **pass** | 14.85 | **pass** | Body text inside a banner |
| `feedback-error-text` | `feedback-error-surface` | 4.5 | 11.28 | **pass** | 12.89 | **pass** | Message text in banner · 1.4.3 |
| `feedback-error-text` | `surface` | 4.5 | 11.37 | **pass** | 12.69 | **pass** | Message text inline on the page |
| `feedback-error-icon` | `feedback-error-surface` | 3.0 | 5.82 | **pass** | 6.26 | **pass** | Status icon · 1.4.11 |
| `feedback-error-icon` | `surface` | 3.0 | 5.87 | **pass** | 6.17 | **pass** | Status icon inline · 1.4.11 |
| `feedback-error-border` | `surface` | 3.0 | 3.90 | **pass** | 4.08 | **pass** | Banner boundary · 1.4.11 |
| `on-surface` | `feedback-error-surface` | 4.5 | 14.92 | **pass** | 15.01 | **pass** | Body text inside a banner |

## Pairs deliberately reported as exempt

- **`interactive-*` fill vs `surface`** — `ocher` (1.58 light) and `purple`
  (1.85 light) cannot hold 3:1 against a warm page at their brand lightness.
  Rather than darkening a brand colour into mud, the boundary is delegated:
  **any fill measuring under 3:1 must render its `-border` token**, which is
  solved to 3:1. `terracotta` (4.19) and all four feedback solids clear 3:1 on
  their own and may render borderless.
- **`on-surface-disabled` / `*-on-disabled`** — 1.4.3 exempts disabled
  controls. Both still land near 3:1, and 1.4.1 requires a non-colour cue
  (`aria-disabled`, an icon, or a label change) regardless.
- **`border-subtle`** — dividers are decorative and outside 1.4.11. It is
  barred by name from interactive boundaries; `border-strong` exists for those.
