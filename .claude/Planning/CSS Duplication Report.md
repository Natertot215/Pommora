## CSS Duplication Report

Findings from the token reconnaissance (08-10-2026) that are **fixes, not documentation** — each verified against source before listing. The atlas documents what exists; this report holds what shouldn't.

The consolidation pass closed the entries struck below ([[HistoryPM]] §PM-094). What remains is what was ruled a keep, what a later arc owns, and the handful of repeated literals still waiting on a spacing scale to belong to.

### I. Live Defects

- [x] **`--card-min`'s NavView KNOB has never worked.** Ruled at 180px — what the gallery has always rendered. The navView declaration and its comment came out with the card-family consolidation; nothing moved visually.
- [ ] **`--menu-dropdown-max` is consumed with no fallback** (`Toolbar/outlineDropdown.css.ts:15`). It's JS-measured (`MenuDropdown.tsx:64`); a measurement failure yields an invalid `max-width` and an uncapped pane. The source comment already flags it. One fallback closes it.

### II. One Value, Two Names

- [ ] **The house hairline is declared twice:** `--tile-border: 1.25px` (`design-system/tile-chassis.css:8`) and `--table-border-width: 1.25px` (`table-tokens.css:25`). One `--hairline-width` token (or one of the two names) should own it.
- [ ] **`--scroll-fade` and `--edge-fade` are parallel knobs for one concept** — eight declaration sites set both to the same value. `--scroll-fade` feeds the hover-scroll text mask (`typography.css.ts`, `chip.css.ts`); `--edge-fade` feeds the eclipse mask. Merge candidate: one knob both mechanisms read.
- [x] **The two card families** merged into `design-system/card-tokens.css` — the floor (as `--card-min-base`), both gaps, the thumb share, and the cover zoom now have one owner. The gallery keeps only its deeper cover zoom; Cards keeps only its Scale multiplication and its own band heights.
- [ ] **`--subline-h: 24px` is stated three times** — `Detail/Detail.css:9` (`.detail-pane`), `PagePreview/previewWindow.css:8` (`.pgpreview`, with a comment naming the duplication), and the fallback inside `previewPane.css:26`. Any future window that isn't `.pgpreview` silently rides the hard-coded fallback.

### III. Repeated Literals Doing Token Work

- [ ] **`+ 14px` pane-park overshoot, three times** — `Detail/InspectorPanel/inspector-panel.css:14`, `design-system/components/PreviewPane/previewPane.css:164,172`. Wants one `--pane-park-overshoot`.
- [ ] **`44px` add-banner zone** — declared in `MarkdownPM/Styles.css:120` and `Detail/Banner/Banner.css:125`, restated as a fallback at `Banner.css:163`.
- [ ] **`28px` page-title size** — `MarkdownPM/Styles.css:113` and `Embeds/embeds.css:191` (`calc(28px * var(--mdpm-scale))`); with `.detail-title`'s `24px` default and Banner's `20px`, the `--detail-title-size` set has four hand-held values and no scale.
- [ ] **`90px` header-zone fallback stated three times** — `MarkdownPM/Styles.css:80,101,108`, plus the raw `90px` bottom pad at `:80`.
- [ ] **`-3px` resize-zone straddle spelled twelve times** in `SurfacePM/surfacepm.css:216–267` (with its `12px`/`8px`/`14px` edge boxes). Genuinely one knob.
- [x] **`999px` pill radius, nine sites** — `--radius-full` minted and adopted; the token is the only literal left. The first concrete member of the radius scale.
- [x] **`opacity: 0.85` dim across both card families** — `--state-drag` minted and adopted at all three sites, named for the case `--state-ghost` doesn't cover: a source whose lifted clone floats alongside it.
- [x] **`opacity: 0.5` disabled/ghost tone** — `--state-disabled` rebased from `0.4` to `0.5` and adopted at the three genuine sites. `viewEmbed.css.ts:116` stays a literal: it's a keyframe's start opacity, motion rather than state.
- [ ] **`opacity: 0.55` inert-row dim** (`Navigation/navList.css:99`) — the same "inactive" gap the empty-state text sits in; resolves together with the awaited inactive state token.
- [x] **`notchedPane.css.ts:13`** — adopted `--shadow-standard` through `drop-shadow()`; the prior "deliberately tighter" adjudication was overridden on the grounds that nothing recorded why. The beak's shadow is now larger and lighter — revert to a named small-scale shadow if the notch reads worse for it.
- [x] **Raw mix percentages outside the tint scale** — all three normalized to their nearest step: the code fill `10%` → tint-quaternary, the crop scrim `45%` → tint-secondary, its panel shadow `55%` → tint-primary.

### IV. Inert or Dead Declarations

- **`--chips-gap`** on `pageProperties.css.ts:48` — adjudicated a keep as it stands.
- [x] `--edge-fade`/`--scroll-fade` on `.nav-item-title` were live for `NavList.tsx:175` and inert for the plain span at `:259` — the inert search row now renders both its title and its kind through `OverflowScroll`, so the knobs it declares apply to the whole component.
- **Zero-consumer bridge vars** — ruled a keep: the bridge publishes a complete vocabulary, and a name absent because nothing has needed it yet is not the same as a name that is wrong. Covers `--system-grey`, `--tint-solid`, `--fill-primary`, `--weight-standard`, `--text-subline-size`, `--ease-out`, `--icon-xs/md/lg/xl`, `--solid-red/blue/lavender/grey`, `easing.out`, and the top type-ramp steps.
- [ ] `--chip-max` and `--chip-capsule-pad-x` exist only as their fallbacks — no surface overrides either.
- [ ] **Correction recorded:** `--switch-zoom` was reported dead by the sweep and is **not** — `CardsView.css:255` consumes it. It stays.

### V. Fragile Couplings (document, don't "fix")

- **`--io`/`--io-l` firewall:** `.ppane` re-declares both to `0` to block inheriting the shell's inspector progress. Load-bearing — deleting the reset couples every floating window to the main inspector.
- **`--gutter` is remapped mid-tree** — `.shell` sets it to the content gutter (24px); `.table-view` remaps it to the fold gutter. The one var whose meaning changes by depth; full-bleed table surfaces must read `--content-gutter`.
- **`textPicker.css.ts:52`'s `--edge-fade` rides `boxed={!hasTrailing}`** — flipping `boxed` or reusing `suffixInput` without a trailing node silently disarms the knob.
- [x] **The autoscroll knobs scored zero on any `var()` grep** — closed rather than documented. Each default had been spelled twice, in the stylesheet and again as the reader's fallback; both now come from one map beside the loop, which the `:root` declaration is generated from. The knobs are still `getComputedStyle`-read by design, but they now exist in exactly one place to find.

### VI. Comment-vs-Value Corrections (ride the doc commit)

- [x] `color.css.ts` header + `:60`: corrected — the states are grey washes *but for* the muted veil, which darkens from system-black.
- **`color.css.ts` header: "labels are system-white at an opacity"** — ruled accurate and kept; the label ramp is the primitive at its opacity steps.
- [x] `separator.line` deleted; its six TS consumers rewired to `separator.border`, which is also the bridged one. The remaining pair carries a comment distinguishing `border` from `segment`.
- [x] `size.css.ts`: the header now says what the bundles are — drawn values where heights and radii climb with the step while the divider and glyph don't, medium carrying the tallest divider and sharing its icon step with large.
- [x] `glass-pane.tsx:4`: restated as the material's own recipe made parametric, PANE_FROST being that recipe at a slightly deeper dim.
- [x] `theme-vars.css.ts:127`: now reads that the code tokens mix the solids toward system-white **at a tint-scale share** — the share is what the tint ladder supplies, which is what the old wording lost.
- [x] `--state-ghost` had been a `%` string aliased to the tint ladder while `--state-disabled` and `--state-drag` were unitless. Ruled: all three are bare numbers holding their own values. The mismatched arithmetic was the lesser half — the alias meant tuning how strongly a chip fill reads silently moved the drag fade across sixteen surfaces, a coupling with nothing behind it but a coincidence at one step. Ghost took the ruling as a fresh value, `0.65`.
- [x] **`tokens/README.md`** retired — the atlas in `DesignSystemPM.md` is where the token vocabulary actually lives.
