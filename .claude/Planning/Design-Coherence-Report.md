## Design Coherence Report

An audit of the design system, the styling layer, the component layer, and the reference document that governs all three. Five read-only sweeps produced the findings; every claim below was re-checked against the code before being written here, and where verification contradicted a sweep the correction is recorded in §X rather than quietly applied.

**This document schedules nothing.** It is the evidence and the reasoning, gathered so the design work can be planned deliberately rather than absorbed into a queue built for a different problem. The codebase cleanup runs its structural bundles first; how this report's findings become work is its own planning session, taken against this document once the structural arm is clear.

**Scope of the sweeps**

| Sweep | Covered |
| ------------------ | ---------------------------------------------------------------------------------- |
| Design-system membership | Every component under `renderer/src/`, tested for data-model coupling and consumer count |
| Styling health | 44 plain `.css` + 43 `.css.ts`, 11,673 lines, against `DesignSystem/Tokens/` |
| Component health | The renderer's component tree, for repeated behavior and re-implemented primitives.  |
| Reference audit | `DesignSystemPM.md` (312 lines) against `DesignSystem/` (~140 files) |
| Drift archaeology | The whole system, for what was minted speculatively and what was superseded in place. |

Findings sitting in files owned by a concurrent work stream are marked **(concurrent)** — real, but not safe to act on until that work lands.

### I. Verdict

The system is healthy where it was designed carefully and drifted where it was designed early. Nothing here is an architectural error. Every finding is a module in the wrong folder, a value stated twice, an option nobody took, or a document that fell behind the thing it describes.

| Layer | State |
| --- | --- |
| Color | **Healthy.** Zero raw hex or rgba in shipping code; every derived tone routes through `tint`/`ramp`; the one legacy seam is documented |
| Motion | **Healthy.** One home (`Animation/`), one ladder, two named curves; the drag feel reads the ladder |
| Geometry | **Drifted.** One concept wearing three sizes; a de facto radius scale with no home |
| Props | **Drifted.** Options minted for callers who then all made the same choice |
| Component boundaries | **Held.** Only `Tokens/` and `Theming/` reach `@shared`; the one data-model dependency (`Symbols/`) is unnamed |
| Reference document | **Current.** The ledger mirrors the tree, one section per folder |

The through-line for the drift: this system was built partly before its consumers existed. What was minted speculatively either found no taker, or was superseded once a consumer solved the problem its own way and that local answer became the real convention.

### II. The Reference Document

Rewritten 08-24 as the one-look ledger: one section per folder, one row per thing, `name · export · what it is`, the table of contents being the folder tree. What still stands: the **Ramp** table lists `RAMP_STEP` / `DARKNESS_STEP` / `GREY_OUTLINES` (module-private) beside, not instead of, the exported resolvers; and no row yet says *reach for it when* — the column that prevents a hand-roll.

### III. The Boundary

#### The boundary holds

Only `Tokens/` and `Theming/` import from `@shared`; nothing in `DesignSystem/` reaches the store or IPC. The wording a shell needs arrives as a prop (`FooterLockButton.verb`, `PreviewPane.footerLabel`), and state arrives the same way (`IconPicker.favorites`, bound once in `Settings/`).

#### What belongs inside

| Component              | Consumers                           | Destination                 |
| ---------------------- | ----------------------------------- | --------------------------- |
| `EditableInput`        | 5, one inside the design system     | ✓ landed — `Components/Fields/`        |
| `ColorPicker`          | 6, one inside the design system     | ✓ landed — `Components/Pickers/ColorPicker/` |
| `RenamableLabel`       | 8                                   | ✓ landed — `Components/Fields/`        |
| `PaneSlider`           | 7                                   | ✓ landed — `Components/PaneSlider/` |
| `PhotoCropModal`       | 2                                   | ✓ landed — `Components/PhotoCropModal/` |
| `IconPicker`           | 13                                  | ✓ landed — `Components/Pickers/IconPicker/`, favorites as a prop |
| `solidColor.ts`        | 11, six outside its own view folder | `Tokens/`                   |
| `checkboxLook.tsx`     | 3                                   | contested — see §VIII       |

`solidColor.ts` is the cleanest case: pure token math over `colorMap` and `ramp`, no table knowledge, filed under a view whose folder six of its eleven consumers sit outside of.

#### The leak in the other direction

`symbols/index.tsx` imports `EntityIconKind` and exports a glyph registry keyed by Pommora entity kinds. Icon *rendering* is generic; the kind-to-glyph *mapping* is not. This is the design system's one genuine data-model dependency, and it needs either a split or a named exception — an unstated exception is how rules stop being followed.

#### Membership needs a test, not a convention

Membership is currently decided per-move by whoever is moving something, which is how five inversions accumulated while everyone involved believed the rule was obvious. A stated test — *knows no entity type, touches no store, touches no IPC* — is nearly right, with `symbols/` as the known exception.

More durable than any stated rule: **make the boundary a lint error.** Biome's configuration supports restricting imports by path. One rule forbidding `@renderer/*` inside `DesignSystem/**` would refuse the next inversion at the gate. Everything else depends on remembering.

### IV. Drift

The system was built partly before its consumers existed. This is the archaeology of what that left behind. **The drift is not in color** — it is concentrated in geometry and in props.

#### Options that were never options

| Finding                                                         | Evidence                                                                                                                                                              | Do                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **`layout` is discarded by the engine and passed at 21 sites**  | `drag.tsx:40` declares it; `:39`'s comment says "Informational only — the engine is geometry-driven"; `:74` destructures it as `layout: _layout`                      | Retire                                               |
| **`CalendarPicker`'s range mode defaults on and is never used** | `:89` `range = true`; both production callers pass `range={false}`. Behind it: `end`/`endOn`/`endMin` state, an endpoint-drag with role swapping, seven style exports | Decide — the largest speculative build in the system |
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
| `--glass-inset` | `renderer/src/styles.css` (app root) | 30 sites across eight features, **including `DesignSystem/`** |
| `--glass-radius` | `renderer/src/styles.css` | design-system, Detail, Embeds, Sidebar |

`Materials/` is the glass home and owns neither glass knob. `Detail/Views/Table/table-tokens.css` is a second token file by the same test — Settings, Blocks and Detail all read from it, and `Settings/trashLeaf.css` borrowing a table view's `--cell-padding-x` is the tell.

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

#### Dead, and what only looks dead

Two confirmed orphans:

| Orphan                                        | Where                            | Evidence                                             |
| --------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `--safe-top` / `-right` / `-bottom` / `-left` | `styles.css`                     | Names a mobile shell that does not exist; zero reads |
| `--code-chevron-mask`                         | `theme-vars.css.ts`              | A full inline SVG asset, **verified zero reads**     |

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
| `CollectionNode \| SetNode`, an unnamed type                     | 30+   | `type ViewSource` in the contract           | Small  |
| Raw `<webview>` mounts with a cast documented by cross-reference | 3     | A `WebGuest` owning the incantation         | Medium |
| Four independent hosts for one picker triple                     | 4     | Generalize `CardPickerHost`                 | Medium |

#### Interaction behaviors still spread thin

Surfaced while consolidating the fade and the remove ×; none was in scope for that work.

| Finding                                                | Sites                          | What it wants                                                                                     |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Hover-reveal by `opacity: 0` → `1`, hand-rolled        | the sites not yet on Button    | `Button`'s `revealOnHover` (`[data-reveal-host]:hover`) is the primitive; the remaining rules are the reveal-bar toggles, the table add, and the tab + |
| Effective zoom re-derived through `getComputedStyle`   | 3, in Cards and Table          | One reader; each parses the same property to answer the same question                             |
| A control gating its own click on its computed opacity | 1, inside `HoverRemove`        | Works, but it is a hidden contract: a skin revealing by any other means silently breaks the click |

#### The structural twin

**`PagePropertiesPane` and `PreviewInspector` are one component wearing two stylesheets.** Verified: 730 lines across the two, 260 differing whitespace-insensitively — roughly **470 identical lines**, including both `biome-ignore` comments verbatim. `usePropertyRows.ts` states the two "keep their own frame, their own row chrome, and their own rule for which rows show." Frame and visibility rule genuinely still differ; row chrome does not. Two extractions — the value span with its editor branch, and the three editing portals — leave the genuinely different parts alone. This is the largest single line-count payoff available.

#### Verified healthy

Recorded so a future sweep does not re-litigate them. `Toolbar/`'s dropdowns all compose the menu shells. `RenamableTitle → RenamableLabel → EditableInput` is a clean three-layer chain, each layer earning its keep. `useOptionReorder → useStatusReorder` is a correct, documented one-group adapter. `fieldRing` has eight importers with no hand-rolled ring outside it; `OverScroll` has twenty-five. No `backdrop-filter` outside `materials/` except one masked circle that is a genuinely different effect. The `.css` versus `.css.ts` split tracks module type: surfaces whose class names are emitted by CodeMirror decorations or imperative DOM use plain CSS, where hashed names would be unusable.

### VII. The Target Shape

Landed 08-24. `DesignSystem/` is one Capitalized tree, every area a folder, mirrored one-to-one by [[DesignSystemPM]]: `Tokens` · `Materials` · `Labels` · `Elements` · `Components/{Controls, Pickers, Menu, Fields}` · `Detail` · `Interactions` · `Animation` · `Symbols` · `Theming` · `Util` · `Showcase`. The root pile is gone — helpers under `Util/`, the settings-to-DOM pair under `Theming/`, the loose sheets and hooks under `Interactions/` and `Animation/`, the tokens sheets under `Tokens/`. The proposed `helpers/` · `chrome/` · `theme/` split was taken as `Util/` · (`Animation/` + `Interactions/`) · `Theming/`; the Quick Index and *reach for this, not that* table were not built — the ledger's brevity was the decision.

**Cut:** the four `--safe-*` vars and `--code-chevron-mask` (now `Symbols/masks.ts`) remain unread — still to delete.

### VIII. Decisions Wanted

The planning session's agenda. Each is cheap once decided and wrong to guess at.

- **Does a middle layer exist? — answered: no.** The renderer filing ([[Codebase-Cleanup-Checklist]] 6a) moves `Components/Detail` into `Detail/` as feature code and lifts the one generic piece, `EyeToggle`, into Controls. For the record, the shape that was weighed: `Components/Detail` held 49 modules; 13 touch the store or IPC, and of the remaining 36 only 7 import a data-model type. So ~29 are neither feature code nor generic primitives — presentation that knows what a property is without knowing where one comes from. This is the layer the codebase keeps inventing and never naming. **Recommendation: leave it unbuilt for now.** The proven pain is seven inversions, all fixed by the design system's own boundary. A third layer asks for 29 filing decisions on speculation when exactly one module has a contested address, and it is a one-way door that will attract modules for years.
- **Where does `checkboxLook` go?** The one contested address, and the sharp end of the question above. It is the visual twin of `components/Checkbox.tsx`, and it is also property-display code. Whichever answer is taken defines whether the middle layer is real.
- **The container title.** `--container-title-size` (20px) covers one of three surfaces wearing that concept; the others are 24px and 28px. Either the token is the banner's variant and renames, or it is the container title and the other two are drift.
- **CalendarPicker's range mode.** Built, styled, and unreachable. Claim it or retire it.
- **The two tab strips.** 90/180/240/12/6 against 70/150/200/10/5, with no comment saying the smaller window scales deliberately and no single ratio generating one from the other.
- **`--gutter` is one name for two lanes** (`--content-gutter` and `--fold-gutter`). One renames.
- **Two press-to-edit mechanisms.** `useDraftEdit` (InputField's `edit`) and `RenamableLabel` over `EditableInput` both swap resting content for a caret; `InlineEditHeader` composes the second where the first now suffices. One absorbs the other.

#### Constraints the planning session inherits

- **The extraction precedes the rehome — and every inverting piece has landed.** `ColorPicker`, `EditableInput`, `RenamableLabel`, `PaneSlider`, `PhotoCropModal`, `IconPicker` and `Surface` are inside the system; what remains in `Components/` is the property-editor and settings-pane domain plus `EntityIcon`, `useNexusIcon` and `RenamableTitle`, all store-bound. The rehome is now a rename.
- **No visible payoff.** Nearly all of it is `net ≈ 0` and changes nothing a user sees. The return is in what the next feature costs.
- **Not a rewrite.** Nothing here found a wrong architecture. The instrument is `git mv` and a lint rule.
- **The document depends on none of it** and pays back on the very next session, including the sessions that do the moves.

### IX. Standing Calls

Answered questions, recorded so a later sweep reads the ruling instead of re-raising the finding.

- **Radius literals stay literal.** 8/10/12px appear at seventeen non-showcase sites with no token home, and that is acceptable so long as it stays disciplined: a surface picks from those three, and a *fourth* value is what needs justifying rather than the three that exist. No `--radius-*` scale is minted. A future sweep counting the seventeen has found the convention working — the reportable defect would be a stray radius outside the set.
- **Both ladders are settled.** `ICON_PX` / `size.icon` absorbs every icon size the app uses; `size.control` is the system's button ladder — four bundles (`button-inline` added for the row-affordance tier), read by `Button` alone and by every button through it.
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

### XI. Implementation Tracking

Where the report's work stands, kept current so a session can read its position without replaying the audit.

#### Landed

- **The labels family** — four shapes, the treatment axes, the tint recipe, the recipes (`DesignSystem/Labels/`).
- **OverScroll** — one overflow-fade mechanism under `interactions/OverScroll`, composed at source by its consumers.
- **HoverRemove** — the hover-revealed remove × under `interactions/HoverRemove`.
- **The Interaction Lab** moved to `showcase/lab/`.
- **The checkbox recipe** — the capped labels wear the one cap, and the checkbox reads its recipe.
- **The fields family** (`DesignSystem/Components/Fields/`) — the Fields plan executed 08-24: one axes stylesheet (boxed · bordered · base · search), `InputField` (the renamed `InteractionField`), the ring channel with rest/focus/error presets and one spelling (`FIELD_RING_VAR`), `--input-field` gone with zero trace, seven hand-rolled bare-input resets retired onto one `base`, the transparent search look and the placeholder tone family-owned, and the editing chain (`EditableInput` · `RenamableLabel` · `useDraftEdit` extracted from PathField) living beside its chrome. The `EditableInput`-before-rehome constraint is satisfied. Net code delta negative.
- **ColorPicker**, **PaneSlider**, **PhotoCropModal**, **IconPicker**, **Surface** — inside the system; the `@shared` leaks closed as props.
- **The reorganization** — `DesignSystem/` as the mirrored tree, the root pile homed, motion consolidated in `Animation/`, `theme-vars` a pure bridge.
- **The reference document** — rewritten as the ledger; `TypographyPM` retired into it.
- **Button** — `Components/Controls/Button/`, the toolbar and every former ghost on it; the button bundles adopted as the system ladder; `pressed` for a toggle that is on or a trigger whose menu is open.
- **NavTrail** — `Elements/NavTrail/`, the one location trail over `treeIndex`'s one `ancestryOf`; the nav rows, gallery cards, card footings, embed hover, preview title, trash rows, scoped footer and subfield all draw it.
- **The field slots** — `InputField` carries `chrome`, `edit`, `leading` and `trailing`; `PathField` retired into them; `SegmentRun` lives in Fields.

#### Remaining Slices

- **The twin extraction** — `PagePropertiesPane`/`PreviewInspector` (~470 lines of parallel structure).
- **The §VIII decisions** — `checkboxLook`, the container title, CalendarPicker's range mode, the two tab strips, `--gutter`, the two press-to-edit mechanisms.
- **The toolbar selector**, the repeated-behavior sweep, `solidColor.ts` → `Tokens/`, and the two unread orphans.
