## CSS Duplication Report

Findings from the token reconnaissance (08-10-2026) that are **fixes, not documentation** — each verified against source before listing. The atlas documents what exists; this report holds what shouldn't. Work through it after the DesignSystemPM change lands; strike entries as they close.

### I. Live Defects

- [ ] **`--card-min`'s NavView KNOB has never worked.** `Tabs/navView.css:13` sets `--card-min: 220px` on `.nav-view` (KNOB-marked), but `NavWindow/navGallery.css:5` declares `180px` on `.nav-gallery` — a *nearer ancestor* of the grid — so proximity wins and the full-window gallery has always rendered at 180px. Both sides are KNOB-marked, so the fix is Nathan's call: if 220px is the intent, the navView declaration must target `.nav-view .nav-gallery`; if 180px looks right (it's what has always rendered), the navView knob and its comment come out.
- [ ] **`--menu-dropdown-max` is consumed with no fallback** (`Toolbar/outlineDropdown.css.ts:15`). It's JS-measured (`MenuDropdown.tsx:64`); a measurement failure yields an invalid `max-width` and an uncapped pane. The source comment already flags it. One fallback closes it.

### II. One Value, Two Names

- [ ] **The house hairline is declared twice:** `--tile-border: 1.25px` (`design-system/tile-chassis.css:8`) and `--table-border-width: 1.25px` (`table-tokens.css:25`). One `--hairline-width` token (or one of the two names) should own it.
- [ ] **`--scroll-fade` and `--edge-fade` are parallel knobs for one concept** — eight declaration sites set both to the same value. `--scroll-fade` feeds the hover-scroll text mask (`typography.css.ts`, `chip.css.ts`); `--edge-fade` feeds the eclipse mask. Merge candidate: one knob both mechanisms read.
- [ ] **The two card families** (`NavWindow/navGallery.css` scope `.nav-gallery` vs `Detail/Views/Cards/CardsView.css` scope `.cards-view`) redeclare the same four tokens (`--card-min`, `--card-gap-h/-v`, `--cover-zoom`, `--thumb-share`) at near-identical values. The strongest merge candidate found: one shared card-token family, per-view overrides only where values genuinely differ.
- [ ] **`--subline-h: 24px` is stated three times** — `Detail/Detail.css:9` (`.detail-pane`), `PagePreview/previewWindow.css:8` (`.pgpreview`, with a comment naming the duplication), and the fallback inside `previewPane.css:26`. Any future window that isn't `.pgpreview` silently rides the hard-coded fallback.

### III. Repeated Literals Doing Token Work

- [ ] **`+ 14px` pane-park overshoot, three times** — `Detail/InspectorPanel/inspector-panel.css:14`, `design-system/components/PreviewPane/previewPane.css:164,172`. Wants one `--pane-park-overshoot`.
- [ ] **`44px` add-banner zone** — declared in `MarkdownPM/Styles.css:120` and `Detail/Banner/Banner.css:125`, restated as a fallback at `Banner.css:163`.
- [ ] **`28px` page-title size** — `MarkdownPM/Styles.css:113` and `Embeds/embeds.css:191` (`calc(28px * var(--mdpm-scale))`); with `.detail-title`'s `24px` default and Banner's `20px`, the `--detail-title-size` set has four hand-held values and no scale.
- [ ] **`90px` header-zone fallback stated three times** — `MarkdownPM/Styles.css:80,101,108`, plus the raw `90px` bottom pad at `:80`.
- [ ] **`-3px` resize-zone straddle spelled twelve times** in `SurfacePM/surfacepm.css:216–267` (with its `12px`/`8px`/`14px` edge boxes). Genuinely one knob.
- [ ] **`999px` pill radius, nine sites** — approximates a `--radius-pill` that doesn't exist. (Spacing/radius scale is a named Pending in the design doc; this is its first concrete member.)
- [ ] **`opacity: 0.85` dim across both card families** (`CardsView.css:66,102`, `navGallery.css:43`) — one drag-dim tone, three sites. Deliberately gentler than `--state-ghost` (a lifted clone floats alongside), so it wants its own name, not a remap.
- [ ] **`opacity: 0.5` disabled/ghost tone, four sites** (`Subfield/subfield.css:62`, `settingsPane.css.ts:124`, `photoCropModal.css.ts:86`, `viewEmbed.css.ts:116`) — three are semantically `--state-disabled` (0.4) candidates; adopting them is a small visible dim change, so per-site confirmation.
- [ ] **`opacity: 0.55` inert-row dim** (`Navigation/navList.css:99`) — the same "inactive" gap the empty-state text sits in; resolves together with the awaited inactive state token.
- [ ] **`notchedPane.css.ts:13`** — `drop-shadow(0 4px 14px #00000059)`, the only raw hex left outside token files. Deliberately tighter than `--shadow-standard` for the beak's scale (prior adjudication); either adopt as a named small-scale shadow or record the keep in the atlas.
- [ ] **Raw mix percentages outside the tint scale** — `MarkdownPM/Styles.css:301` (`var(--code) 10%`), `photoCropModal.css.ts:15,27` (`45%`, `55%`).

### IV. Inert or Dead Declarations

- [ ] `--chips-gap` on `pageProperties.css.ts:48` is inert — its only consumer is scoped inside `.table-view`; the chip renderer never reads it.
- [ ] `--edge-fade`/`--scroll-fade` on `.nav-item-title` are live for `NavList.tsx:175` but inert for the plain span at `NavList.tsx:259`.
- [ ] **Zero-consumer bridge vars** (complete-vocabulary keeps unless ruled otherwise): `--system-grey`, `--tint-solid`, `--fill-primary`, `--weight-standard`, `--text-subline-size`, `--ease-out`, `--icon-xs/md/lg/xl`, `--solid-red/blue/lavender/grey`. `easing.out` is dead end-to-end (its only reference is its own bridge). The top type-ramp steps (`largeTitle`, `title1`, `title2`) have no product consumers.
- [ ] `--chip-max` and `--chip-capsule-pad-x` exist only as their fallbacks — no surface overrides either.
- [ ] **Correction recorded:** `--switch-zoom` was reported dead by the sweep and is **not** — `CardsView.css:255` consumes it. It stays.

### V. Fragile Couplings (document, don't "fix")

- **`--io`/`--io-l` firewall:** `.ppane` re-declares both to `0` to block inheriting the shell's inspector progress. Load-bearing — deleting the reset couples every floating window to the main inspector.
- **`--gutter` is remapped mid-tree** — `.shell` sets it to the content gutter (24px); `.table-view` remaps it to the fold gutter. The one var whose meaning changes by depth; full-bleed table surfaces must read `--content-gutter`.
- **`textPicker.css.ts:52`'s `--edge-fade` rides `boxed={!hasTrailing}`** — flipping `boxed` or reusing `suffixInput` without a trailing node silently disarms the knob.
- **The autoscroll knobs score zero on any `var()` grep** — JS reads them via `getComputedStyle`. A naive dead-token audit would kill six live knobs.

### VI. Comment-vs-Value Corrections (ride the doc commit)

- [ ] `color.css.ts` header + `:60`: "states are system-grey" — `state.muted` is system-**black**.
- [ ] `color.css.ts` header: "labels are system-white at an opacity" — `label.primary` is the raw primitive, no opacity.
- [ ] `separator.line` and `separator.border` are byte-identical with no distinguishing comment; only `border` is bridged, only `line` is used from TS.
- [ ] `size.css.ts`: the control ladder isn't monotonic (`dividerHeight` 14→18→14) and medium/large share one icon size — both contradict the "proportional/follows automatically" comments.
- [ ] `glass-pane.tsx:4`: "pane-tuned params" overstates a single 5-point brightness delta vs `frostMaterial`.
- [ ] `theme-vars.css.ts:127`: "code tokens mix toward system-white" — `--code` mixes toward transparent.
- [ ] `--state-ghost` is a `%` string (shared with the tint ladder) while `--state-disabled` is unitless `0.4` — same semantic kind, two value types; a `calc()` consumer gets different arithmetic.
- [ ] **`tokens/README.md` describes a file layout that doesn't exist** (six named files, none real; two weights claimed where four ship). Rewrite or retire with the doc change.
