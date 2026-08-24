## Design Coherence Report

An audit of the design system, the styling layer, the component layer, and the reference document that governs all three. Five read-only sweeps produced the findings; every claim below was re-checked against the code before being written here, and where verification contradicted a sweep the correction is recorded in §X rather than quietly applied.

**This document schedules nothing.** It is the evidence and the reasoning, gathered so the design work can be planned deliberately rather than absorbed into a queue built for a different problem. The codebase cleanup runs its structural bundles first; how this report's findings become work is its own planning session, taken against this document once the structural arm is clear.

**Scope of the sweeps**

| Sweep | Covered |
| ------------------ | ---------------------------------------------------------------------------------- |
| Design-system membership | Every component under `renderer/src/`, tested for data-model coupling and consumer count |
| Styling health | 44 plain `.css` + 43 `.css.ts`, 11,673 lines, against `design-system/tokens/` |
| Component health | The renderer's component tree, for repeated behavior and re-implemented primitives.  |
| Reference audit | `DesignSystemPM.md` (312 lines) against `design-system/` (~140 files) |
| Drift archaeology | The whole system, for what was minted speculatively and what was superseded in place. |

Findings sitting in files owned by a concurrent work stream are marked **(concurrent)** — real, but not safe to act on until that work lands.

### I. Verdict

The system is healthy where it was designed carefully and drifted where it was designed early. Nothing here is an architectural error. Every finding is a module in the wrong folder, a value stated twice, an option nobody took, or a document that fell behind the thing it describes.

The largest finding is not a defect in the code at all: **the reference document has become unusable as a reference.** It documents 4 of ~22 components and 0 of ~20 shared helpers, so an agent following it faithfully would hand-roll six things that already exist. In a codebase that has prioritized visuals since day one and now arrives at each session with limited context, that is the finding that compounds fastest.

| Layer | State |
| --- | --- |
| Color | **Healthy.** Zero raw hex or rgba in shipping code; every derived tone routes through `tint`/`ramp`; the one legacy seam is documented |
| Motion | **Healthy with one defect.** 116 of 122 transitions read tokens; one wrong fallback curve, one duration off the ladder |
| Geometry | **Drifted.** A ladder declared, bridged and bypassed; one concept wearing three sizes; a de facto radius scale with no home |
| Props | **Drifted.** Options minted for callers who then all made the same choice |
| Component boundaries | **Misfiled.** Seven files inside the design system import from app code |
| Reference document | **Behind.** 18 components and 20 helpers undocumented; six factual errors, three now corrected |

The through-line for the drift: this system was built partly before its consumers existed. What was minted speculatively either found no taker, or was superseded once a consumer solved the problem its own way and that local answer became the real convention.

### II. The Reference Document

#### Coverage

| Category | Documented | Exists | Gap |
| --- | --- | --- | --- |
| Components | 4 | ~22 | 18 |
| Shared helpers and hooks | 0 | ~20 | 20 |
| Ramp exports | 0 | 6 | 6 |
| Bridged `--*` vars | ~45 | ~110 | ~65 |
| Materials exports | 6 | 12 | 6 |
| Root-level CSS files | 0 by name | 7 | 7 |
| Stacking steps | 0 | 16 | 16 |

An agent following the document would hand-roll `clamp`, `moveItem`, `focusRing`, `useExitPresence`, `dropdownAnchor` and `cellColor` — each the single definition of its thing.

The Ramp section shows the failure mode exactly. It is the document's deepest section, and it tables `RAMP_STEP`, `DARKNESS_STEP` and `GREY_OUTLINES` — all three module-private — while omitting `cellColor`, `cellTint`, `checkboxTint`, `cellRing`, `ANCHOR_CELLS` and `chipColorFor`, which are the six a caller would reach for. It documents the machine's internals and hides its controls.

#### What is missing is a column, not only rows

Every roster row should answer four things in one order: **Name · Source · What it is · Reach for it when.** The fourth is the one the document has never had, and its absence explains the coverage gap better than the missing entries do. `Slider` reads today as "Sliding number selection" — true, and no reason to prefer it over an `<input type=range>`. The row that prevents a hand-roll reads: *reach for it when a number has a bounded range and the write should land on release rather than per tick.*

#### Errors

Three were verified against the code and replaced outright:

| Was | Now | Evidence |
| --- | --- | --- |
| `--codeColor` | `--code` | `--codeColor` appears nowhere in `src/`; `codeColor` is the settings key |
| "These are what an accent may be set to; the ramp widens what a chip may be colored" | "These are the anchor names still on disk; an accent and a chip alike resolve to a ramp cell" | `accent.ts` — "There is no separate 'accent' color — it's always a cell of the ramp" |
| Cobalt | Light Blue | "Cobalt" appears nowhere in `src/`; the seat is `SPECTRUM.lightBlue` |

Three remain, because repairing them means adding rather than replacing:

- **`chipBase` is advertised as a token and is not one.** `tokens/chip.css.ts` declares it `const`, not `export`, and it is absent from the barrel. No caller can import it. `PropertiesPM.md` repeats the claim.
- **The Ramp table documents private constants** while omitting the exported API.
- **The Components table is framed as the roster of `design-system/components/` and lists 4 of ~22.** The framing is the defect: it tells a reader the list is exhaustive.

### III. The Boundary

#### The design system already depends on app code

Proof rather than prediction — **five files inside `design-system/` import from app layers:**

```
ColorSwatch.tsx        → @renderer/Components/Detail/ColorPicker
colorSwatch.css.ts     → @renderer/Components/Detail/colorPicker.css
menu/Menu.tsx          → @shared/toggleLabels
PreviewPane.tsx        → @shared/toggleLabels
```

The system cannot build without `ColorPicker` — a design-system component today in everything but location. The last two entries are the milder case — a component that belongs where it is, pulling one string from app code; the repair there is a prop, not a move.

#### What belongs inside

| Component              | Consumers                           | Destination                 |
| ---------------------- | ----------------------------------- | --------------------------- |
| `EditableInput`        | 5, one inside the design system     | ✓ landed — `fields/`        |
| `ColorPicker`          | 6, one inside the design system     | `components/ColorPicker/`   |
| `RenamableLabel`       | 8                                   | ✓ landed — `fields/`        |
| `PaneSlider`           | 7                                   | `components/PaneSlider/`    |
| `solidColor.ts`        | 11, six outside its own view folder | `tokens/`                   |
| `checkboxLook.tsx`     | 3                                   | contested — see §VIII       |
| `PhotoCropModal`       | 2                                   | `components/PhotoCrop/`     |

`solidColor.ts` is the cleanest case: pure token math over `colorMap` and `ramp`, no table knowledge, filed under a view whose folder six of its eleven consumers sit outside of.

#### The leak in the other direction

`symbols/index.tsx` imports `EntityIconKind` and exports a glyph registry keyed by Pommora entity kinds. Icon *rendering* is generic; the kind-to-glyph *mapping* is not. This is the design system's one genuine data-model dependency, and it needs either a split or a named exception — an unstated exception is how rules stop being followed.

#### Membership needs a test, not a convention

Membership is currently decided per-move by whoever is moving something, which is how five inversions accumulated while everyone involved believed the rule was obvious. A stated test — *knows no entity type, touches no store, touches no IPC* — is nearly right, with `symbols/` as the known exception.

More durable than any stated rule: **make the boundary a lint error.** Biome's configuration supports restricting imports by path. One rule forbidding `@renderer/*` inside `design-system/**` would refuse the next inversion at the gate. Everything else depends on remembering.

### IV. Drift

The system was built partly before its consumers existed. This is the archaeology of what that left behind. **The drift is not in color** — it is concentrated in geometry and in props.

#### Options that were never options

| Finding                                                         | Evidence                                                                                                                                                              | Do                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **`layout` is discarded by the engine and passed at 21 sites**  | `drag.tsx:40` declares it; `:39`'s comment says "Informational only — the engine is geometry-driven"; `:74` destructures it as `layout: _layout`                      | Retire                                               |
| **`CalendarPicker`'s range mode defaults on and is never used** | `:89` `range = true`; both production callers pass `range={false}`. Behind it: `end`/`endOn`/`endMin` state, an endpoint-drag with role swapping, seven style exports | Decide — the largest speculative build in the system |
| **`Segmented`'s `size` prop is never passed**                   | Zero of four call sites; the `'button-large'` default is the only bundle ever resolved, so 14 of `size.control`'s 21 fields are unreachable                           | Retire two bundles, or adopt them                    |
| **`PreviewPane.scanLabel`**                                     | Defaulted, never passed at four sites                                                                                                                                 | Inline the string                                    |
| **`'table'` in the `Layout` union**                             | One use: the demo harness                                                                                                                                             | Retires with `layout`                                |

#### The ladders each lost three names

`size.css.ts` admits the shape — "Eleven names over eight values, matching the ramp's own repeats." Three steps carry two spellings, and the same spelling won on the glyph ladder and the type ladder independently:

| Value | Minority spelling | Winning spelling | `<Icon size=>` |
| --- | --- | --- | --- |
| 13px | `headline` | `body` | **0** vs **64** |
| 12px | `callout` | `control` | **0** vs **35** |
| 10px | `subline` | `footnote` | **0** vs 1 |

The ladder's premise is that a glyph and the text beside it name the same step. At these three the app names two things and only ever types one.

The type ramp's three largest steps — `text.largeTitle`, `text.title1`, `text.title2` — have zero consumers, and so do their bridged twins. That is not bridge-completeness: the composed classes are the primary interface and they are empty too. Where the headings went is the next finding.

#### One concept, three sizes

`--container-title-size: 20px` was minted with a stated rationale — the heading sits deliberately between the ramp's title steps — and reads at exactly one surface, the Banner. The same heading elsewhere:

```
Detail/DetailTitleHeader.css   --detail-title-size: 24px
MarkdownPM/Styles.css          calc(28px * var(--editor-scale, 1))
Embeds/embeds.css              calc(28px * var(--mdpm-scale))
```

The token covers one of three surfaces wearing the concept it names, which is also why the ramp's title steps are empty.

#### The system reads tokens it does not own

| Token | Declared in | Read by |
| --- | --- | --- |
| `--glass-inset` | `renderer/src/styles.css` (app root) | 30 sites across eight features, **including `design-system/`** |
| `--glass-radius` | `renderer/src/styles.css` | design-system, Detail, Embeds, Sidebar |
| `--twisty-beat` | `Components/Detail/settingsPane.css.ts` | **design-system** and Detail |

`materials/` is the glass home and owns neither glass knob; a settings *pane* owns a motion token the design system reads. `Detail/Views/Table/table-tokens.css` is a second token file by the same test — Settings, Blocks and Detail all read from it, and `Settings/trashLeaf.css` borrowing a table view's `--cell-padding-x` is the tell.

#### Converged on their own

Values several surfaces arrived at independently and now agree on, which is what a token is for: `--subline-h` is 24px in both homes; `--labels-gap` is 4px in all three. Both want absorbing.

#### Leftovers

- **`TINT_STEPS.solid`** has one production reference — the bridge — and `--tint-solid` has zero reads.
- **The `swap` drag mode** (`Zone.swap`, `arraySwap`, and the engine branch behind them) is exercised only by the Interaction Lab.
- **`shared/properties.ts` still mints the legacy color vocabulary** — the default Status property seeds `'grey'`, `'blue'`, `'green'`: six bare-name writes against three stepped-key writes elsewhere. `ANCHOR_CELLS` is documented as a seam that absorbs history, not one that produces it.
- **Barrel exports with no importers**: `MenuTopRow` (used only inside its own module), `MenuHeading`, `accentValue`, `readCssAccentColor` (all showcase-only), and `FrostParams` — which the showcase redeclares rather than imports.

### V. Styling Health

#### One selector drives an arms race

`Toolbar/toolbar.css` sets `color` on a bare `.app-toolbar button` at specificity (0,1,1). A vanilla-extract class is (0,1,0), so every component rendering a `<button>` inside the toolbar — which contains the ViewPane, SettingsPane, GroupingPane, PickerControl, NumberEditor and the menu system — loses its own color to it.

**Verified: 17 doubled selectors and 2 escalations.** About eleven of the doubles name this rule in their own comments. The ladder has grown past doubling: `menu.css.ts` uses `&&&`, `settingsPane.css.ts` uses `&&&&`, and `groupingPane.css.ts` triples to outrank *another component's* escape hatch. Every one is load-bearing as written; all are symptoms of one over-broad selector.

#### The button bundles are bridged and unread

`size.css.ts` defines control heights 24/28/32px and `theme-vars.css.ts` bridges all three. **Verified: `--button-small-height` and `--button-medium-height` have zero reads**; only `--button-large-height` is consumed, at three sites, while the raw values are restated at ten.

This is *not* the glyph ladder. `size.css.ts` carries two families, and the glyph half — `ICON_PX` / `size.icon`, which `<Icon size="control" />` resolves through — is routed and settled. Only the button bundles are open, and the question is narrow: were they ever meant to be a system ladder, or are they one component's private table that got bridged by symmetry with the glyph ladder beside it.

#### Motion has three homes and one wrong default

230ms is the app's real interaction duration and it is not on `motion.ts`'s ladder (180/180/225/280/350), whose own comment claims that vocabulary is total. `DEFAULT_FEEL` holds 230 in `feel.tsx`, and three app surfaces read it from there.

`--ix-dur` / `--ix-ease` reach no further than the Interaction Lab: the only sheet reading them ships with the lab page, which always sets them. Their fallbacks disagree with `DEFAULT_FEEL` — `var(--ix-ease, ease)` against `easing.out` — and that disagreement is confined to a page whose own provider always wins. A fourth curve, `BLOOM`, lives in `animations.css.ts`, and `motion.ts` documents its `dropdown` step as "the Bloom keyframes" — referencing a curve it does not own.

#### Dead, and what only looks dead

Three confirmed orphans:

| Orphan                                        | Where                            | Evidence                                             |
| --------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `--safe-top` / `-right` / `-bottom` / `-left` | `styles.css`                     | Names a mobile shell that does not exist; zero reads |
| `--code-chevron-mask`                         | `theme-vars.css.ts`              | A full inline SVG asset, **verified zero reads**     |
| `export const anchor`                         | `Toolbar/toolbarDropdown.css.ts` | All five importers use `anchorRight`                 |

Three categories that look identical and are not, listed so a future sweep does not "fix" them: ~24 bridge-completeness vars (the full icon and type ramps, declared so plain CSS can name a step — the file states this intent); eight fallback-only tuning hooks read with a default and never set, which is this codebase's tuning idiom; and the specular whites in `materials/`, pure white on purpose and distinct from system-white.

One correction worth recording: `theme-vars.css.ts` describes its bridge as existing "so plain CSS (the showcase chrome) can reference them." In fact **all 44 plain stylesheets depend on it.** It is the primary token interface, and anyone trimming "unused" bridge vars on the strength of that comment would break the app.

### VI. Repeated Behavior

#### A latent bug travels with the largest duplication

**Verified:** the `{...view, ...patch}` save closure appears at five sites, and four discard the `Result` envelope:

```
LayoutToggles    void saveView({ ...view, ...patch })     ← discarded
CardsOptions     void saveView({ ...view, ...patch })     ← discarded
ViewSettings     void saveView({ ...view, ...patch })     ← discarded
GroupingPane     void saveView({ ...view, ...patch })     ← discarded
HiddenPane       const res = await saveView(...)
                 if (!res.ok) await window.nexus.showError(res.error.message)
```

IPC returns the envelope so a refusal is visible. Four surfaces void it away, so a refused view save is silent and the control flips anyway. One shared writer returning HiddenPane's behavior fixes five copies and the silence together.

#### The rest

| Finding                                                          | Sites | Owner it wants                              | Effort |
| ---------------------------------------------------------------- | ----- | ------------------------------------------- | ------ |
| The settings toggle row, verbatim **(concurrent)**               | 7     | `ToggleRow`, beside the existing `ValueRow` | Small  |
| The property-editor config row **(concurrent)**                  | 7     | Promote `NumberEditor`'s private `Row`      | Small  |
| The url-vs-type commit derivation                                | 4     | `editorValue.ts`                            | Small  |
| The link-accent derivation                                       | 5     | One helper beside `solidColorCss`           | Small  |
| The twisty glyph, hand-rolled beside its own helper              | 3     | Export `Twisty` from `DisclosureRow`        | Small  |
| `CollectionNode \| SetNode`, an unnamed type                     | 30+   | `type ViewSource` in the contract           | Small  |
| The `.ppane-action` icon button                                  | 6     | `PaneAction`, exported from `PreviewPane`   | Small  |
| Raw `<webview>` mounts with a cast documented by cross-reference | 3     | A `WebGuest` owning the incantation         | Medium |
| Four independent hosts for one picker triple                     | 4     | Generalize `CardPickerHost`                 | Medium |

#### Interaction behaviors still spread thin

Surfaced while consolidating the fade and the remove ×; none was in scope for that work.

| Finding                                                | Sites                          | What it wants                                                                                     |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Hover-reveal by `opacity: 0` → `1`, hand-rolled        | 45 rules across 18 stylesheets | A shared primitive, the way Bloom is the one pane-open source                                     |
| Effective zoom re-derived through `getComputedStyle`   | 3, in Cards and Table          | One reader; each parses the same property to answer the same question                             |
| A control gating its own click on its computed opacity | 1, inside `HoverRemove`        | Works, but it is a hidden contract: a skin revealing by any other means silently breaks the click |

#### The structural twin

**`PagePropertiesPane` and `PreviewInspector` are one component wearing two stylesheets.** Verified: 730 lines across the two, 260 differing whitespace-insensitively — roughly **470 identical lines**, including both `biome-ignore` comments verbatim. `usePropertyRows.ts` states the two "keep their own frame, their own row chrome, and their own rule for which rows show." Frame and visibility rule genuinely still differ; row chrome does not. Two extractions — the value span with its editor branch, and the three editing portals — leave the genuinely different parts alone. This is the largest single line-count payoff available.

#### Verified healthy

Recorded so a future sweep does not re-litigate them. `Toolbar/`'s dropdowns all compose the menu shells. `RenamableTitle → RenamableLabel → EditableInput` is a clean three-layer chain, each layer earning its keep. `useOptionReorder → useStatusReorder` is a correct, documented one-group adapter. `fieldRing` has eight importers with no hand-rolled ring outside it; `OverScroll` has twenty-five. No `backdrop-filter` outside `materials/` except one masked circle that is a genuinely different effect. The `.css` versus `.css.ts` split tracks module type: surfaces whose class names are emitted by CodeMirror decorations or imperative DOM use plain CSS, where hashed names would be unusable.

### VII. The Target Shape

#### The root is the disorder

`design-system/` has five named folders and **fifteen loose files at its root**, plus three helpers filed inside `components/` that are not components.

```yaml
design-system/
├── tokens/ · materials/ · symbols/ · interactions/ · components/
├── clamp.ts · cx.ts · moveItem.ts · pad.ts              | • pure helpers, uncategorized
├── useExitPresence.ts · useHeld.ts · revealBar.ts       | • hooks, uncategorized
├── accent.ts · personalization.ts                       | • settings → the DOM
├── animations.css.ts · card-tokens.css              | • stylesheets with no owner
│   · resize-strip.css · reveal-bar.css · tile-chassis.css
└── components/dropdownAnchor.ts · fieldRing.ts · useDismiss.ts   | • helpers filed as components
```

This is the same gap the reference document has. **The document has no Helpers section because the disk has no helpers folder** — twenty shared functions exist as a pile, so there was never a category to write a section about. The document's shape mirrors the disk's, and both are missing the same thing.

#### The proposed tree

`←` marks something arriving from app code, `▸` a regroup, `✂` a deletion.

```yaml
// design-system                        | • The system — values, materials, components, and the helpers under them
├── // tokens                           | • The values and the math over them — unchanged
│   ├── [color.css.ts]                  | • Primitives, surfaces, labels, fills, states, separators, shadows
│   ├── [theme-vars.css.ts]             | • The :root bridge — the primary interface for all 44 plain stylesheets
│   ├── [typography.css.ts]             | • The type ramp and the capped-label classes
│   ├── [size.css.ts]                   | • The glyph ladder (settled) and the button bundles (open)
│   ├── [motion.ts]                     | • Durations and easings; gains 230ms, the interaction engine's own
│   ├── [tint.ts]                       | • mixAt and tintAt — the opacity ladder every color is mixed at
│   ├── [ramp.ts]                       | • The 8×8 grid and its four resolvers
│   ├── [colorMap.ts]                   | • Stored string → render key; absorbs the legacy vocabulary
│   ├── [stack.ts]                      | • The three z-index ladders, named rather than numbered
│   ├── [solidColor.ts]                 | ← from Detail/Views/Table — token math filed under a view
│   └── [index.ts]                      | • The barrel; no longer re-exports label chrome
├── // materials                        | • Glass — unchanged
│   ├── [glass-material.ts]             | • The shared optics and the outline contract
│   ├── [glass-pane.tsx]                | • frostStyle and the three frost tiers
│   ├── [glass-surface.tsx]             | • Fixed app chrome — brighter, clear
│   ├── [glass-window.tsx]              | • A pane carrying a body
│   ├── [glass-controls.tsx]            | • The 21-field control optics
│   ├── [glass-segment.tsx]             | • The small-control tune
│   └── [index.ts]
├── // symbols                          | • The icon registry — unchanged
│   ├── [index.tsx]                     | • Icon, the resolvers, the entity mapping
│   ├── [AllSymbols.ts]                 | • The curated set
│   ├── [customGlyphs.tsx]              | • The house-drawn marks
│   └── [fileTypes.ts]                  | • Extension → glyph
├── // interactions                     | • PommoraDND, the floating-window driver, and the two shared behaviors
│   ├── // OverScroll                   | ✓ LANDED — the one edge-fade engine and its capped label
│   ├── // HoverRemove                  | ✓ LANDED — the hover-revealed ×, with the melt as an option
│   ├── [engine.tsx] · [drag.tsx]       | • The engine and its React surface
│   ├── [group.tsx]                     | • The grouped-drag family over the same engine
│   ├── [gesture.ts] · [snapshot.ts]    | • One pointer lifecycle; measure-once geometry
│   ├── [shared.ts]                     | • The types and constants both families read
│   ├── [DragGhost.tsx] · [DropLine.tsx]| • The drag chrome
│   ├── [dragDisclose.ts]               | • Hover-to-open registration for tree targets
│   ├── [FloatingWindow.tsx]            | • Move and resize for every floating window
│   ├── [feel.tsx]                      | • DEFAULT_FEEL and GLIDE_FEEL
│   ├── [autoscroll.ts] · [keyboard.ts] | • Edge scroll; keyboard reordering
│   ├── [a11y.ts] · [activate.ts]       | • The live region; Enter/Space → click
│   ├── [ghost.css] · [dropChrome.css]  | • The drag chrome's sheets
│   └── [floatingWindow.css]            | • The floating-window sheet
│   ✂ [Board.tsx] · [Interactions.tsx] · [Surfaces.tsx] · [main.tsx] · [interactions.css]
│                                       | • The Interaction Lab — moved to showcase/lab/
├── // labels                           | ✓ LANDED — four shapes, the treatment axes, the tint recipe, the recipes
├── // fields                            | ✓ LANDED — the field family: axes sheet, ring helper, InputField, the editing chain
├── // components                       | ▸ Every component a folder; no loose helpers, no loose sheets
│   ├── // CalendarPicker               | • Date, time and range — the largest undocumented component
│   ├── // Checkbox                     | ▸ was Checkbox.tsx + checkbox.css at the folder root
│   ├── // ColorPicker                  | ← from Components/Detail — the system already imports it
│   ├── // Menu                         | ▸ was menu/ — the system's only lowercase folder
│   │   ├── [Menu.tsx]                  | • The eleven row and frame pieces
│   │   ├── [MenuSurface.tsx]           | • The beaked toolbar pane
│   │   ├── [MenuDropdown.tsx]          | • Trigger + pane with state
│   │   ├── [DisclosureRow.tsx]         | • The disclosure row and its open-set hook
│   │   └── [paneGrowth.ts]             | • growToContent — serves this folder alone
│   ├── // NotchedPane                  | ▸ was NotchedPane.tsx + notchedPane.css.ts
│   ├── // PaneSlider                   | ← from Components/Detail
│   ├── // PickerMenu                   | • The rectangle every menu and picker mounts
│   ├── // PreviewPane                  | • The floating-window shell; gains PaneAction
│   ├── // ProgressBar                  | • Trackless fill bar
│   ├── // SegmentRun                   | • The divided run — hairlines or breadcrumbs
│   ├── // Segmented                    | ▸ was Segmented-Controls/ — the only hyphenated folder
│   ├── // SidePane                     | • The resizable edge rail
│   ├── // Slider                       | • A bounded number, committed on release
│   ├── // Switches                     | • DualSwitch and ColorSwatch
│   ├── // TextPicker                   | • The inline text-entry pane
│   └── [Reveal.tsx]                    | • One file, no stylesheet — stays flat
├── // helpers                          | ▸ NEW — the fifteen-file root pile, given a name
│   ├── [cx.ts]                         | • The class joiner
│   ├── [clamp.ts]                      | • The one definition every surface reads
│   ├── [moveItem.ts]                   | • The immutable reorder — 6 consumers
│   ├── [pad.ts]                        | • Zero-pad; the date surfaces' one definition
│   ├── [dropdownAnchor.ts]             | ▸ out of components/ — 4 consumers, no component of its own
│   ├── [fieldRing.ts]                  | ▸ out of components/ — 8 consumers
│   ├── [useDismiss.ts]                 | ▸ out of components/ — 6 consumers
│   ├── [useExitPresence.ts]            | • Keeps a surface mounted through its retract — 11 consumers
│   └── [useHeld.ts]                    | • Keeps what a closing surface draws
├── // chrome                           | ▸ NEW — the shared stylesheets belonging to no component
│   ├── [animations.css.ts]             | • Bloom and the title reveal (InteractionPM owns the words)
│   ├── [card-tokens.css]               | • --card-min, the gaps, the shared page-card chassis
│   ├── [tile-chassis.css]              | • The tile border, radius and body
│   ├── [resize-strip.css]              | • The invisible edge-drag band
│   ├── [reveal-bar.css] + [revealBar.ts]| • The sliding bar and its hit-zone math, kept together
└── // theme                            | ▸ NEW — the one place the system reads app types, named so
    ├── [accent.ts]                     | • Accent resolution and runtime application
    └── [personalization.ts]            | • The three tables turning settings into root vars and classes
```

Three choices worth stating. **One `helpers/`, not `helpers/` and `hooks/`** — splitting by whether something calls a React hook sorts by implementation detail; a caller asking "is there already a clamp" does not first ask whether clamping is stateful. **`theme/` earns a folder despite holding two files** because it is the one place the system legitimately reads app types, and naming it is what lets the boundary rule elsewhere be absolute. **`components/` becomes uniformly foldered** on the rule *more than one file gets a folder*, which also collects the two tests not living beside their component.

The chip family has since landed as `design-system/labels/`, and the fade and the remove × as `interactions/OverScroll/` and `interactions/HoverRemove/` — so `components/` no longer expects a `Chip` folder, the root pile is two stylesheets lighter, and the token barrel has stopped being the chip barrel.

#### The ledger

**Cut — three confirmed orphans:** the four `--safe-*` vars, `--code-chevron-mask`, and `toolbarDropdown.css.ts`'s `anchor`. A fourth pends a ruling: `--button-small-height` and `--button-medium-height` are unread, but whether they are cut or *adopted* depends on §VIII.

**What does not change:** nothing in `tokens/`, `materials/`, `symbols/` or `interactions/` moves. Each holds one kind of thing, each is named for what it holds, and no finding sits inside them. The proposal touches the root pile, the components folder, and five arrivals.

#### The document should mirror the tree

One principle does most of the work: **the table of contents is the folder tree.** Where something lives and where it is documented become the same answer, a new folder forces a new section, and a section with no folder is proof the document has drifted — which is how the missing Helpers section would have been caught two months ago.

```yaml
DesignSystemPM
├── Tooling
├── Quick Index                | • NEW — every --var, export, class → its section
├── Reach For This, Not That   | • NEW — the near-identical pairs, and which to pick
├── Tokens                     | • ← tokens/          (reordered; Ramp rewritten around its exports)
├── Materials                  | • ← materials/       (+ frostStyle, the optics rosters)
├── Symbols                    | • ← symbols/         (roster + pointer to SymbolsPM)
├── Interactions               | • ← interactions/    (roster + pointer to PommoraDND)
├── Components                 | • ← components/      (full roster, grouped by kind)
├── Helpers                    | • ← helpers/         (NEW)
├── Chrome                     | • ← chrome/          (NEW)
├── Theme                      | • ← theme/           (NEW)
├── Where the Rest Lives       | • prose → a table naming which files each sibling doc governs
└── Showcase · Known Issues · Pending
```

Four things a lookup-first document needs and this one has no form for: the **Quick Index**; a **reach for this, not that** table for the near-identical pairs the code documents and the document does not (`FileChip` vs `FileLabel`, `GlassSurface` vs `GlassPane`, `GlassSegment` vs `GlassControls`, `PickerMenu` vs `MenuSurface`, `Reveal` vs a height transition, `chipColorFor()` vs indexing `SPECTRUM`); a **token → consumer index** for the dozen knobs whose value *is* an agreement across module boundaries; and a stated **freshness contract** — each roster's SOURCE line is the file of record and the document is a mirror, so a reader finding a discrepancy trusts the code rather than concluding the token was removed.

### VIII. Decisions Wanted

The planning session's agenda. Each is cheap once decided and wrong to guess at.

- **Does a middle layer exist?** `Components/Detail` holds 49 modules; 13 touch the store or IPC, and of the remaining 36 only 7 import a data-model type. So ~29 are neither feature code nor generic primitives — presentation that knows what a property is without knowing where one comes from. This is the layer the codebase keeps inventing and never naming. **Recommendation: leave it unbuilt for now.** The proven pain is seven inversions, all fixed by the design system's own boundary. A third layer asks for 29 filing decisions on speculation when exactly one module has a contested address, and it is a one-way door that will attract modules for years.
- **Where does `checkboxLook` go?** The one contested address, and the sharp end of the question above. It is the visual twin of `components/Checkbox.tsx`, and it is also property-display code. Whichever answer is taken defines whether the middle layer is real.
- **The container title.** `--container-title-size` (20px) covers one of three surfaces wearing that concept; the others are 24px and 28px. Either the token is the banner's variant and renames, or it is the container title and the other two are drift.
- **CalendarPicker's range mode.** Built, styled, and unreachable. Claim it or retire it.
- **Are the button bundles a system ladder or one component's table?** One consumer, two unread bridged heights. If they are the system's, the ten restated sites should read them; if not, they stop being bridged.
- **The two tab strips.** 90/180/240/12/6 against 70/150/200/10/5, with no comment saying the smaller window scales deliberately and no single ratio generating one from the other.
- **`--gutter` is one name for two lanes** (`--content-gutter` and `--fold-gutter`). One renames.

#### Constraints the planning session inherits

- **The extraction precedes the rehome.** The cleanup's `Components/Detail` rehome moves that folder to a feature domain and already carves out `PaneSlider`. `ColorPicker` now has two importers inside `design-system/` — so the rehome as written would carry it into a feature domain while the system imports it, deepening the inversion. Whatever the design plan turns out to be, the three arrivals have to land before that rehome runs.
- **No visible payoff.** Nearly all of it is `net ≈ 0` and changes nothing a user sees. The return is in what the next feature costs.
- **Not a rewrite.** Nothing here found a wrong architecture. The instrument is `git mv` and a lint rule.
- **The document depends on none of it** and pays back on the very next session, including the sessions that do the moves.

### IX. Standing Calls

Answered questions, recorded so a later sweep reads the ruling instead of re-raising the finding.

- **Radius literals stay literal.** 8/10/12px appear at seventeen non-showcase sites with no token home, and that is acceptable so long as it stays disciplined: a surface picks from those three, and a *fourth* value is what needs justifying rather than the three that exist. No `--radius-*` scale is minted. A future sweep counting the seventeen has found the convention working — the reportable defect would be a stray radius outside the set.
- **The glyph ladder is settled.** `ICON_PX` / `size.icon` absorbs every icon size the app uses, 13px included, and its consumers are routed. Only the button bundles beside it remain open.
- **The option editors' shells stay two components.** `84f44fbe` and `c1fe6afa` consolidated their reorder implementation and their chip row; each keeping its own container — flat and grouped — is a stated keep. Merging them would invert the hook adapter, which earns its keep by hiding grouping from the flat case rather than imposing it. The row *wrapper* above `OptionRow` was a separate seam and has been closed as `OptionSlot`.
- **`PickerMenu.closing` stays.** Twenty-eight of thirty consumers drive `open` and let the menu self-manage its exit, but two callers inside `CalendarPicker` feed it a `useExitPresence` value. A minority spelling, not an abandoned door.
- **Bridge completeness is deliberate.** `theme-vars.css.ts` bridges whole ramps on purpose so plain CSS can name a step, and says so. Unread members of a fully-bridged ramp are not orphans.

### X. Corrections Log

What this audit got wrong and fixed. A finding that was withdrawn is as useful to know as one that stood.

| Claim                                                                | Correction                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OptionEditor` should become an adapter over `StatusEditor`          | Wrong at that level. The hook adapter works by *hiding* grouping from the flat case; a merged component would impose it instead, and the heading is a renameable control rather than a suppressible label. Withdrawn — but the withdrawal was also wrong: a 26-line row wrapper above the seam `c1fe6afa` drew was genuinely undone, and has since been extracted as `OptionSlot` |
| "The size ladder is declared, bridged, and bypassed"                 | Blurred two token families in one file. The glyph ladder is routed and settled; only the button bundles are open                                                                                                                                                                                                                                                                  |
| `PickerMenu.closing` is passed at zero of thirty sites               | Passed at two, both inside `CalendarPicker`. Live API with two internal callers                                                                                                                                                                                                                                                                                                   |
| All twelve bridged `--z-*` vars are unread                           | All twelve are read. Withdrawn before reporting                                                                                                                                                                                                                                                                                                                                   |
| `--subline-h` and `--chips-gap` have diverged                        | Both convergent — the same value in every home. Recategorized as tokens, the system should absorb                                                                                                                                                                                                                                                                                 |
| `--ix-ease`'s wrong fallback strands app surfaces on the wrong curve | Reaches nothing. The only sheet reading the var ships with the Interaction Lab, which always sets it. `Interactions.tsx` is that lab's page, not a provider — both moved to `showcase/lab/`                                                                                                                                                                                       |

Two process notes the log makes visible. A survey that measures two files against each other without accounting for what was already extracted beneath them will overstate the duplication — which is what happened with the option editors. And deferring to a prior ruling without checking what the ruling actually covered is the opposite error: a decision bounds what it decided, not everything near it.
