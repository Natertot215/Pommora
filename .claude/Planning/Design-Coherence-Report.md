## Design Coherence Report

A survey of the styling layer, the component layer, and the reference document that governs both. Four
read-only sweeps produced the findings; every claim reproduced below was re-checked against the code
before being written down, and the ones that survived verification are marked as such.

The motivating problem is stated plainly: this codebase has prioritized visuals since day one, and the
design system has grown faster than the document describing it. An agent arriving with limited context
cannot currently tell what already exists, so it hand-rolls. The largest finding in this report is not a
CSS defect — it is that the reference document answers "what is this system like" when the question being
asked is "does `X` already exist, and where."

#### Method

| Sweep | Scope |
| --- | --- |
| Design-system membership | Every component under `renderer/src/`, tested for data-model coupling and consumer count |
| Styling health | 44 plain `.css` + 43 `.css.ts`, 11,673 lines, against `design-system/tokens/` |
| Component health | The renderer's component tree, for repeated behavior and re-implemented primitives |
| Reference audit | `DesignSystemPM.md` (312 lines) against `design-system/` (~140 files) |

Findings that sit in files belonging to a concurrent work stream are marked **(concurrent)**. They are
real, but they are not safe to act on until that work lands.

### I. What This Session Changed

The styling edits that prompted the survey, as a tree.

```yaml
// Pommora/src/renderer/src
├── // MarkdownPM
│   ├── [Styles.css]                     | M  +92 / −4   the code tag's states, the reach arc, the z-lift
│   └── // Tables
│       └── [widget.css]                 | M  +32 / −8   the table's gap joins the shared box measure
├── // design-system/components
│   ├── // Switches
│   │   ├── [dualSwitch.css.ts]          | A  +87        renamed from switch.css.ts; zoom baked to px
│   │   └── [colorSwatch.css.ts]         | A  +25        moved out of settingsPane.css.ts
│   └── [switch.css.ts]                  | D  −87        → dualSwitch.css.ts
├── // Components/Detail
│   ├── [colorPicker.css.ts]             | M  +21 / −14  swatchFill hoisted; both swatches compose it
│   └── [settingsPane.css.ts]            | M  +0 / −31   three swatch styles moved out
└── // Detail/Views/Cards
    └── [CardsView.css]                  | M  +0 / −1    the --switch-zoom override retired

CSS files touched: 7 | +2 / −1
Style Difference: Net +137 | +257 / −120
```

Two of these are the report's own thesis in miniature. The swatch's styles had been living in a settings
pane's stylesheet while the component lived in `Components/Detail` — neither was where the thing was. And
`switch.css.ts` moved to `dualSwitch.css.ts` at 87 lines unchanged in substance: the file was already
coherent, it was named for a category rather than for the component it holds.

### II. The Reference Document

`DesignSystemPM.md` is the highest-leverage finding. As a narrative about the token system it reads well.
As the lookup table an agent consults before building, it fails on coverage and on shape.

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

An agent following the document faithfully would hand-roll `clamp`, `moveItem`, `focusRing`,
`useExitPresence`, `dropdownAnchor`, and `cellColor` — all of which exist and are the one definition of
their thing.

The Ramp section is the sharpest illustration. It is the document's deepest section, and it tables
`RAMP_STEP`, `DARKNESS_STEP` and `GREY_OUTLINES` — all three module-private — while omitting `cellColor`,
`cellTint`, `checkboxTint`, `cellRing`, `ANCHOR_CELLS`, and `chipColorFor`, which are the six an agent
would call. It documents the machine's internals and hides its controls.

#### Corrections applied

Three statements the code contradicted, each verified and then replaced rather than annotated.

| Was                                                                                  | Now                                                                                           | Evidence                                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `--codeColor`                                                                        | `--code`                                                                                      | `--codeColor` appears nowhere in `src/`; `codeColor` is the settings key             |
| "These are what an accent may be set to; the ramp widens what a chip may be colored" | "These are the anchor names still on disk; an accent and a chip alike resolve to a ramp cell" | `accent.ts` — "There is no separate 'accent' color — it's always a cell of the ramp" |
| Cobalt                                                                               | Light Blue                                                                                    | "Cobalt" appears nowhere in `src/`; the seat is `SPECTRUM.lightBlue`                 |

#### Corrections outstanding

Three more errors, left because repairing them means adding rather than replacing.

- **`chipBase` is advertised as a token and is not one.** `tokens/chip.css.ts` declares it `const`, not
  `export`, and it is absent from the token barrel. No caller can import it. `PropertiesPM.md` repeats the
  same claim.
- **The Ramp table documents private constants.** Described above; the repair is a rewritten section.
- **The Components table is framed as the roster of `design-system/components/` and lists 4 of ~22.** The
  framing is the defect — it tells an agent the list is exhaustive.

#### Proposed structure

Two moves buy most of the improvement: pull Components out from under The Token Atlas, where a component
is currently filed as a token 200 lines deep, and put an alphabetical index at the top. "Does
`--park-clearance` exist?" is presently answerable only by reading all 312 lines.

```yaml
Design System
├── Tooling
├── Quick Index                    | • NEW — alphabetical var/export → section
├── The Token Atlas
│   ├── Primitives · Surfaces · Labels · Fills · States
│   ├── Separators · Shadows
│   ├── Tints                      | • + mixAt, the primitive tintAt is built on
│   ├── Spectrum & Accent          | • merged; accent resolution corrected
│   ├── Ramp                       | • rewritten around the exported API
│   ├── Geometry                   | • + tile, segment and divider fields
│   ├── Stacking                   | • promoted from prose to a table of 16 named steps
│   └── Bridged Vars               | • NEW — every --* not covered above
├── Materials
│   ├── Frost · Liquid · Which Tier a Surface Wears
├── Components                     | • promoted top-level; full roster, grouped by kind
├── Helpers                        | • NEW — the ~20 shared functions and hooks
├── Chrome Patterns                | • the old Component Chrome, tabled
├── Where the Rest Lives           | • prose → pointer table naming the files each doc governs
├── Showcase · Known Issues · Pending
```

Four additions a lookup-first document needs and this one has no form for:

- **A Quick Index.** Name, kind, section. The question is almost always "does `X` exist and where."
- **A "reach for this, not that" table.** The system has near-identical pairs whose choice the code
  documents and the document does not: `FileChip` vs `FileLabel`, `GlassSurface` vs `GlassPane`,
  `GlassSegment` vs `GlassControls`, `PickerMenu` vs `MenuSurface`, `Reveal` vs a height transition,
  `chipColorFor()` vs indexing `SPECTRUM` directly.
- **A token → consumer index for the shared knobs.** About a dozen vars are shared across module
  boundaries and their value *is* the agreement — `--disclosure-indent`, `--fold-gutter-base`,
  `--list-outline-*`, `--radius-full`, `--tile-border`, `--card-min-base`, `--chip-zoom`. The source
  comments carry this; the document drops it, which is exactly the information that prevents a duplicate.
- **A stated freshness contract.** Each roster's SOURCE line is the file of record and the document is a
  mirror, so an agent finding a discrepancy trusts the code and treats the row as stale rather than
  assuming the token was removed.

### III. Styling Health

The color and motion layers are in good shape: **zero** raw hex or rgba in any shipping stylesheet outside
the development showcase, and 116 of 122 transition declarations read `var(--duration-*) var(--ease-*)`.
The incoherence is concentrated in geometry and in one specificity root cause.

#### One selector drives seventeen escapes

`Toolbar/toolbar.css` sets `color` on a bare `.app-toolbar button` at specificity (0,1,1). A
vanilla-extract class is (0,1,0), so every component rendering a `<button>` anywhere inside the toolbar —
which contains the ViewPane, SettingsPane, GroupingPane, PickerControl, NumberEditor and the whole menu
system — loses its own color to it.

**Verified: 17 doubled selectors and 2 escalations.** Roughly eleven of the doubles cite this rule by name
in their own comments. The ladder has grown past doubling: `menu.css.ts` uses `&&&`, `settingsPane.css.ts`
uses `&&&&` ("quadrupled to outrank the BottomRow's own icon-tone bump"), and `groupingPane.css.ts` now
triples to outrank *another component's* escape hatch.

Every one is load-bearing as written — removing them breaks the tones. All are symptoms of one over-broad
selector. Retargeting it to an explicit class collapses about eleven of them and stops the ladder.

#### The size ladder is declared, bridged, and bypassed

`size.css.ts` defines control heights 24/28/32px; `theme-vars.css.ts` bridges all three.

**Verified: `--button-small-height` and `--button-medium-height` have zero reads.** Only
`--button-large-height` is consumed, at three sites. Meanwhile the raw values are restated at ten sites
across the settings pane, the menu system, the calendar picker, the date-time editor, the interaction
field, the nexus header, and the editor.

A related finding is framed carefully because it is not the same thing: radii 8/10/12px appear at 17
non-showcase sites, but their only named home is *inside* the button geometry bundles. That is not a token
being ignored — it is a de facto radius scale with no token home, and it wants a decision before it wants
an edit.

`size.control` has exactly one TypeScript consumer. The ladder is currently one component's private table
wearing a system name.

#### Motion has three homes and one wrong default

The app's real interaction duration is 230ms, and it is not in `motion.ts` — whose ladder is
180/180/225/280/350 and which states that every transition shares that vocabulary. `DEFAULT_FEEL` holds
230 in `feel.tsx`, and `interactions.css` restates it as a literal fallback on two lines.

**Verified: the fallback easing is wrong.** `DEFAULT_FEEL.easing` is `easing.out`
(`cubic-bezier(0.22, 1, 0.36, 1)`), but the CSS reads `var(--ix-ease, ease)`, which falls back to
`easing.standard`. Any `.ix-*` element rendered outside an `<Interactions>` provider animates on the wrong
curve. A fourth curve, `BLOOM`, lives in `animations.css.ts` — and `motion.ts` documents its `dropdown`
step as "the Bloom keyframes," referencing a curve it does not own.

Closing the loop: `--ease-out` is bridged and never read, while the showcase restates its exact
cubic-bezier literally twice.

#### Dead and orphaned

Six confirmed, distinguished carefully from three categories that look dead and are not.

| Genuine | Where |
| --- | --- |
| `--safe-top` / `-right` / `-bottom` / `-left` | `styles.css` — speculative; names a mobile shell that does not exist |
| `--code-chevron-mask` | `theme-vars.css.ts` — a full inline SVG asset, **verified zero reads** |
| `export const anchor` | `Toolbar/toolbarDropdown.css.ts` — all five importers use `anchorRight` |

Not defects, and listed so a future sweep does not "fix" them: about 24 bridge-completeness vars (the full
icon and type ramps, declared so plain CSS can name a step — the file states this intent); eight
fallback-only tuning hooks read with a default and never set, which is the codebase's tuning idiom; and
the specular whites in `materials/`, which are pure white on purpose and distinct from system-white.

One structural correction worth recording: `theme-vars.css.ts` describes its bridge as existing "so plain
CSS (the showcase chrome) can reference them." In fact all 44 plain stylesheets depend on it. It is the
primary token interface, not a showcase convenience, and anyone trimming "unused" bridge vars on the
strength of that comment would break the app.

### IV. Component Health

#### The design system already depends on app code

The strongest signal in the survey is a dependency inversion, and it is proof rather than prediction:
**seven files inside `design-system/` import from app layers.**

```
FileLabel.tsx          → @renderer/Components/Chip
FileChip.tsx           → @renderer/Components/Chip
TextPicker.tsx         → @renderer/Components/EditableInput
ColorSwatch.tsx        → @renderer/Components/Detail/ColorPicker
colorSwatch.css.ts     → @renderer/Components/Detail/colorPicker.css
menu/Menu.tsx          → @shared/toggleLabels
PreviewPane.tsx        → @shared/toggleLabels
```

The design system cannot build without `Chip`, `EditableInput`, and `ColorPicker`. Those three are design
system components today in everything but location. The last two entries are a milder case — a component
that belongs where it is, pulling one string from app code; the repair is a prop, not a move.

Ranked by confidence, the components that should move:

| Component              | Consumers                                | Destination                      |
| ---------------------- | ---------------------------------------- | -------------------------------- |
| `Chip` + `ContextChip` | 12, two of them inside the design system | `components/Chip/`               |
| `EditableInput`        | 5, one inside the design system          | `components/EditableInput/`      |
| `ColorPicker`          | 6, one inside the design system          | `components/ColorPicker/`        |
| `RenamableLabel`       | 8                                        | `components/EditableInput/`      |
| `PaneSlider`           | 7                                        | `components/PaneSlider/`         |
| `solidColor.ts`        | 11, six outside its own view folder      | `tokens/`                        |
| `checkboxLook.tsx`     | 3                                        | beside `components/Checkbox.tsx` |
| `PhotoCropModal`       | 2                                        | `components/PhotoCrop/`          |

`solidColor.ts` deserves its own note: it is pure token math over `colorMap` and `ramp`, it has no table
knowledge, and it lives in `Detail/Views/Table/`. Six of its eleven consumers are elsewhere. It is the
missing half of the color token API filed under a view.

The one genuine data-model leak *inside* the design system is `symbols/index.tsx`, which imports
`EntityIconKind` and exports a glyph registry keyed by Pommora entity kinds. Icon rendering is generic; the
kind → glyph mapping is not.

#### Repeated behavior

A latent bug travels with the largest duplication. **Verified:** the `{...view, ...patch}` save closure
appears at five sites, and four of them discard the `Result` envelope:

```
LayoutToggles    void saveView({ ...view, ...patch })     ← discarded
CardsOptions     void saveView({ ...view, ...patch })     ← discarded
ViewSettings     void saveView({ ...view, ...patch })     ← discarded
GroupingPane     void saveView({ ...view, ...patch })     ← discarded
HiddenPane       const res = await saveView(...)
                 if (!res.ok) await window.nexus.showError(res.error.message)
```

IPC returns the envelope so a refusal is visible. Four surfaces void it away, so a refused view save is
silent and the control flips anyway. One shared writer that returns HiddenPane's error-surfacing behavior
fixes five copies and the silence together.

The rest, ranked:

| Finding                                                          | Sites | Owner it wants                              | Effort |
| ---------------------------------------------------------------- | ----- | ------------------------------------------- | ------ |
| The settings toggle row, restated verbatim **(concurrent)**      | 7     | `ToggleRow`, beside the existing `ValueRow` | Small  |
| The property-editor config row **(concurrent)**                  | 7     | Promote `NumberEditor`'s private `Row`      | Small  |
| The url-vs-type commit derivation                                | 4     | `editorValue.ts`                            | Small  |
| The link-accent derivation                                       | 5     | One helper beside `solidColorCss`           | Small  |
| The twisty glyph, hand-rolled beside its own helper              | 3     | Export `Twisty` from `DisclosureRow`        | Small  |
| `CollectionNode \| SetNode`, an unnamed type                     | 30+   | `type ViewSource` in the contract           | Small  |
| The `.ppane-action` icon button                                  | 6     | `PaneAction`, exported from `PreviewPane`   | Small  |
| Raw `<webview>` mounts with a documented-by-cross-reference cast | 3     | A `WebGuest` owning the incantation         | Medium |
| Four independent hosts for the same picker triple                | 4     | Generalize `CardPickerHost`                 | Medium |

#### The two structural twins

**`PagePropertiesPane` and `PreviewInspector` are one component wearing two stylesheets.** Verified: 730
lines across the two, 260 differing whitespace-insensitively — roughly **470 identical lines**, including
both `biome-ignore` comments verbatim. `usePropertyRows.ts` states the two "keep their own frame, their own
row chrome, and their own rule for which rows show." Frame and visibility rule genuinely still differ; row
chrome does not. Two extractions — the value span with its editor branch, and the three editing portals —
leave the genuinely different parts alone.

**`OptionEditor` is the one-group case of `StatusEditor`.** The hook layer already took this step:
`useOptionReorder` is a 37-line adapter over `useStatusReorder` whose own comment says "the flat list is
the one-group case of the grouped one." The component layer never followed. Same state, same commit
handlers, same ghost logic, same row render; the difference is flat-list versus group-keyed identity and
one heading row.

#### Verified healthy

Recorded so a future sweep does not re-litigate them. `Toolbar/`'s dropdowns all compose the menu shells.
`RenamableTitle → RenamableLabel → EditableInput` is a clean three-layer chain, each layer earning its
keep. `useOptionReorder → useStatusReorder` is a correct, documented adapter. `fieldRing` has eight
importers with no hand-rolled ring outside it; `OverflowScroll` has thirteen. No `backdrop-filter` outside
`materials/` except one masked circle that is a genuinely different effect. The `.css` versus `.css.ts`
split tracks module type rather than accident: surfaces whose class names are emitted by CodeMirror
decorations or imperative DOM use plain CSS, where hashed names would be unusable.

### V. Ranked Work

Ordered by payoff against effort. Nothing here has been done.

**Tier 1 — small, and each fixes a class rather than an instance**

1. **Retarget `.app-toolbar button` to an explicit class.** Collapses ~11 doubled selectors, stops the
   `&&&&` ladder, and removes the reason the next component will reach for one.
2. **One `useViewPatch` writer that surfaces its error.** Five copies to one, and four silent failure
   paths closed.
3. **Move `Chip`, `EditableInput`, and `ColorPicker` into the design system.** Retires five of the seven
   inversions. The other two are a prop each.
4. **Move `solidColor.ts` to `tokens/`.** It is token math filed under a view.
5. **Consume the two unread control-height vars at their ten restated sites, or delete them.** Either
   answer is coherent; the current state is neither.
6. **Move `230` into `motion.ts` and correct the `--ix-ease` fallback to `easing.out`.**
7. **Delete the three genuine orphans** — the four `--safe-*` vars, `--code-chevron-mask`, and the unused
   `anchor` export.

**Tier 2 — the reference document**

8. **Promote Components out of the token atlas and complete the roster** — 4 of ~22 today.
9. **Add the Helpers section** — ~20 shared functions and hooks with no home in the document at all.
10. **Add the Quick Index and the "reach for this, not that" table.**
11. **Rewrite the Ramp section around its exported API**, and correct the `chipBase` row.

**Tier 3 — structural, worth scheduling rather than squeezing in**

12. **Extract the shared halves of `PagePropertiesPane` / `PreviewInspector`** — the largest single
    line-count payoff available.
13. **Generalize `CardPickerHost` into a `ValuePickerHost`.** Pays twice: three copies retired, and
    CardPickerHost's correct anchor-survival and exit-presence behavior propagates to the surfaces that
    currently re-derive it by hand.
14. **Make `OptionEditor` the one-group adapter over `StatusEditor`**, mirroring what the hook layer
    already did.

**Decisions wanted before any edit**

- **The radius scale.** 8/10/12px appear 17 times with no token home. Promote a named scale, or accept
  them as per-component and say so. Either settles it; the ambiguity is what keeps producing them.
- **Whether `size.control` is a system ladder or one component's table.** It has one consumer. If it is
  meant to be the system's, the ten restated sites should read it; if not, it should stop being bridged.
- **Where `chip.css.ts` belongs.** 331 lines of component styling inside `tokens/`, and the token barrel
  is also the chip barrel.

### VI. Relation To The Architecture Audit

The audit reached the same finding from the opposite direction, and did so first. It asked *who imports
out of a folder*; this survey asked *what a folder imports in*. Both describe the same edges.

| The audit saw | This survey saw | Same edge |
| --- | --- | --- |
| `Components/Detail` is a feature subsystem wearing a shared-components address — 13 external importers | `ColorPicker`, `PaneSlider`, `PickerControl` are design-system components filed under a feature | yes |
| `Table/` exports to eight external files at twelve sites — "four homes, not one" | `solidColor.ts` is token math with eleven consumers, six outside its own view folder | yes |
| `PaneSlider` is stranded inside `Components/Detail` and imports exclusively from the design system | `PaneSlider`, seven consumers, belongs in `design-system/` | yes |

The audit's framing is the more useful one and should be adopted: **this is a filing error, not an
architecture error.** Nothing underneath is rotten — the dependency graph is acyclic, the layers are real,
and the modules are individually well-built. What is wrong is the addresses. That is why the audit's
estimate for both bundles is `net ≈ 0`: it is `git mv` plus import churn, and the typecheck catches every
miss.

#### A collision this session created

Bundle 6a moves the view-settings/property-editing subsystem out of `Components/` into its own domain
folder, and explicitly carves `PaneSlider` out into `design-system/` on the way. When that was written,
`PaneSlider` was the only design-system-bound module in the folder.

It no longer is. `ColorPicker` now has two importers inside `design-system/components/Switches/`, created
in this session when `ColorSwatch` moved there. **Run 6a as written and `ColorPicker` rides into a feature
domain while the design system imports it** — the inversion gets deeper, not shallower, and the new import
path is longer than the one it replaces.

The repair is small and belongs *before* 6a rather than after: extract the design-system-bound modules
first, then move what remains. The audit's own ordering rule — 6a precedes 6b and 6c because both would
otherwise add imports at the address being vacated — applies one level up. There is now a 6-zero.

#### A disagreement worth settling

The two analyses name different destinations for one module. The audit sends `checkboxLook` to "a
property-display home" alongside `Cell`, `columnStyles` and `columnLabel`. This survey sends it to
`design-system/components/` beside `Checkbox.tsx`, on the grounds that the two draw the same box and
keeping them apart is the drift both their docblocks warn about.

Both readings are defensible and they cannot both be right. The disagreement is not really about
`checkboxLook` — it is about whether a layer exists between the design system and the features. That
question is the subject of the next section.

### VII. What A Refactor Would Actually Require

Everything below is a decision, not a task. None of it should be started before the questions are
answered, because each answer changes what the work is.

#### The missing layer

`Components/Detail` holds **49 modules. Thirteen touch the store or IPC. Of the remaining thirty-six, seven
import a data-model type.** So roughly twenty-nine modules are neither feature code nor generic
primitives — they are presentation that knows what a property is without knowing where one comes from.

This is the layer the codebase keeps inventing and never naming. The audit invented it as "a
property-display home" for `Cell` and `checkboxLook`. This survey invented it independently by proposing
`OptionChip`. The chip system already lives it: `chip.css.ts` sits in `tokens/` because a chip is a token
by construction, while `PropertiesPM` owns the words because a chip is what a *value* looks like.

Two layers force every module into a bad fit. Three would file them honestly:

```yaml
design-system/     | • Knows nothing. No store, no IPC, no entity type. Chip, EditableInput,
                   |   ColorPicker, PaneSlider, PickerControl, solidColor, the tokens.
<the middle>/      | • Knows the model, not the app. checkboxLook, columnStyles, OptionChip,
                   |   PropertyTypes, filterModel, the value editors, the chip-for-a-value rules.
features/          | • Knows everything. The panes, the views, the surfaces that read the store.
```

The middle layer's name is a real decision and it is not cosmetic: it is what an agent pattern-matches
against six months from now. `presentation/`, `property-ui/`, `model-ui/`, `display/` all read differently
and each will attract different things.

**The alternative is to decide the middle layer should not exist** — that model-aware presentation lives
with its feature and the duplication is the price. That is a legitimate answer for a solo project, and it
is cheaper today. It should be chosen deliberately rather than by default, because the current state is
the default.

#### The boundary needs a test, not a convention

Design-system membership is currently decided per-move by whoever is moving something. That is precisely
how five inversions accumulated while everyone involved believed the rule was obvious.

A stated test — *knows no entity type, touches no store, touches no IPC* — is nearly right and has one
known exception already in the tree: `symbols/index.tsx` imports `EntityIconKind` and exports a glyph
registry keyed by Pommora entity kinds. Icon *rendering* is generic; the kind-to-glyph *mapping* is not.
Either the mapping moves out, or the rule carries a named exception. An unstated exception is how rules
stop being followed.

More durable than any stated rule: **make the boundary a lint error.** Biome's configuration is already in
place and its rule set supports restricting imports by path. One rule forbidding `@renderer/*` inside
`design-system/**` would have refused this session's `ColorSwatch` import at the gate, which is the only
mechanism that stops the inversion being re-earned every session. Everything else depends on remembering.

#### Sequence

The order is forced by the audit's own compounding argument, not by preference.

1. **6-zero — extract before rehoming.** `Chip`, `EditableInput`, `ColorPicker` into `design-system/`;
   `PaneSlider` as 6a already plans. Small, mechanical, and it makes 6a correct rather than harmful.
2. **The boundary lint rule**, landed with 6-zero. It costs one config entry and permanently retires the
   class of defect. Without it, step 1 is a snapshot rather than a fix.
3. **6a and 6b as already scheduled.** `solidColor` reaches `tokens/` here, which retires this survey's
   Tier 1 item 4 — the same move, already sequenced.
4. **The middle-layer decision**, made before 6b rather than after, because 6b has to send `checkboxLook`
   and `columnStyles` somewhere and that somewhere is the answer.
5. **The reference document**, any time — it blocks nothing and unblocks everything. It is the only item
   here that pays back on the very next session regardless of what else happens.

The styling findings — the toolbar selector, the unread height vars, the motion homes — are independent of
all of this and can be taken whenever. They touch different files and answer to no decision.

#### Costs, stated plainly

- **A quiet tree.** 6a and 6b are import churn across roughly seventy files. They cannot be run against a
  working tree that a second session is editing. Today's tree is not quiet.
- **Blame.** A rehome of this size rewrites `git blame` for the moved files. `git log --follow` still
  reaches through, but casual archaeology gets harder for a while.
- **No visible payoff.** Every item in steps 1 through 4 is `net ≈ 0` and changes nothing a user sees. The
  return is entirely in what the *next* feature costs, which is real but deferred and unmeasurable at the
  moment it is paid for.
- **The middle layer is a one-way door in practice.** Naming it will attract modules for years. Renaming
  it later costs another churn of the same size.

#### What should not be done

- **Not a separate "design-system cleanup."** Its Tier 1 items 3 and 4 *are* bundles 6a and 6b. Running
  them as their own effort would either duplicate the scheduled work or move the same files in a different
  direction than the audit intends.
- **Not a rewrite.** Nothing here found a wrong architecture. Every finding is a module in the wrong folder
  or a value stated twice. The correct instrument is `git mv` and a lint rule, not a redesign.
- **Not all at once.** The single most valuable item — the reference document — has no dependency on any of
  the moves and pays back immediately. Taking it first buys correct instincts for every session that
  follows, including the sessions that do the moves.
