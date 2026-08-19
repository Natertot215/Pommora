## Color Ramp Picker — Implementation Plan

> **Status:** written, pending review · Spec: `PickerSandboxLeaf.tsx` (the settled design, live at `#picker-sandbox`) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

The ColorPicker becomes an 8×8 grid of family ramps — 64 pickable cells, dark on the left, light on the right — replacing today's 2×5 grid of ten flat swatches. Every surface that assigns a color (options, statuses, checkboxes, links, views, Spaces) gains 54 colors it does not have today, and a stored color grows a step suffix (`red-3`) while every bare family name already on disk keeps resolving to its anchor cell untouched.

The shape follows the sandbox because the sandbox *is* the design: it was settled visually, cell by cell, and its recipes are the specification rather than an illustration of one. What this plan adds around it is ownership. The sandbox holds four things the app already owns — the chip tint recipe, the opacity-mix helper, the label ramp, and the ten spectrum keys — so the work is less "build a ramp" than "route the settled ramp through the tokens that already exist, and delete the parallels." A new `tokens/ramp.ts` becomes the single owner of what a cell *is*; `chip.css.ts` generates its variants from it instead of hand-listing them.

**The seam that decides the file layout:** `shared/` owns what a key *is*, `ramp.ts` owns what a key *means*. Main's only stake in this work is one boolean guard — `setSpaceColor` refuses an unstorable key and writes whatever it accepts, verbatim, never normalizing. So `shared/` gets a predicate and the vocabulary it validates against; everything about seating, blending, and color stays renderer-side, where the values are `color-mix` strings over CSS vars that main could not resolve anyway.

Bounded by two things. **Accent and connection settings are out of scope** — they keep the `SOLID_COLORS` ten. And this plan does not migrate a single byte on disk, does not name the 64 cells individually (a second pass), and does not touch the chip shapes, the melt machinery, or any consumer's props.

**Requirements**

1. The picker presents an 8×8 grid inside `PickerMenu` — one row per family, dark → left, light → right, with all ten `SPECTRUM` solids holding exact anchor cells. Click picks; clicking the selected cell clears. No separate clear affordance.
2. Storage grammar: `red-0`…`red-7`. The ten bare anchor names keep resolving to their anchor cells, are never rewritten, and need no migration.
3. Chips render every cell through `tint()` — except the greyscale row, whose brightest two tint from a darkness-offset base and whose eight borders ride `label.tertiary` at the settled opacity ladder.
4. Pink is a real palette hex beside `SPECTRUM`, seated at `purple-5` — not an eleventh selectable solid.
5. The chromatic single-anchor rows and the paired blue row derive from one shading knob; the purple row and the greyscale row keep their settled literals.
6. Links and checkboxes — the two surfaces that paint the *raw* cell color — get the grid without the greyscale row.
7. `default` remains a distinct chip key whose value points at `grey-4`'s, so an uncolored value rings no cell.
8. The selection ring derives: the solid at `TINT_STEPS.primary` on chromatic rows, the greyscale border ladder on the grey row.
9. `shared/` holds the key vocabulary and one predicate; the renderer holds every meaning. No type or function lands in `shared/` without a main-side caller.
10. The four hand-maintained copies of the ten spectrum keys are removed, and the shading and opacity helpers consolidate onto one mix primitive.
11. Accent and connection settings keep `SOLID_COLORS`, unchanged in behavior and in type.
12. Docs and the token atlas agree with the code; `node scripts/check-atlas.mjs` passes.

**Acceptance — the whole thing working**

In the running app: recolor a Select option to a non-anchor cell, and `purple-6` lands in the collection sidecar; that exact chip renders in the table cell, the grouping band, the filter pane, and the option editor; it survives ⌘R. Every color stored before this change renders identically to how it rendered before it. A link's picker shows seven rows and a Space's shows eight. An uncolored option opens the picker with no cell ringed. `typecheck`, `test`, `lint`, and `check-atlas` are all green, and `grep -rF "lightBlue" Pommora/src` returns two lines rather than nine.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `setSpaceColor` **guards and writes verbatim** — it never normalizes → `shared/` needs `isColorKey`, a boolean, and nothing else. A normalizer there would have no caller.
- Cell values are `color-mix` strings over CSS vars → main cannot resolve one, so seating and color both stay in `ramp.ts`. The one file that holds the recipes is the one that must hold the anchor seats, or the two disagree and need a test to police them.
- `label.primary` is `system.white` `#E8E8E8`, and the greyscale row's brightest cell *is* `system.white` → any ring derived from a near-white base merges with that one swatch. The sandbox's dark seam is the separator, and it stays.
- `GREY_DEFAULT` `#48484A` is seated at greyscale index 4 → `default` and `grey-4` are the same *value*. They stay different *keys*, because `default` must not be a grid cell (→ R7).
- `greyChipStyle` sets `borderColor: GREY_OUTLINES[col]` **unconditionally**, at every grey step → the grey row's ring and its chip border are one thing, and the ring reads the recipe rather than the ladder directly.
- `solidColorCss` and two more call sites index `color.solid[key]` directly for a raw solid → a stepped key returns `undefined` there. Four files, not one, need the grammar.
- `chipColorFor` normalizes anchors to canonical cells → `colorLabel` never again receives `lightBlue`, so the "Cobalt" display name must move to `blue-5` or it is silently lost.
- The picker grows from ~36px to ~173px wide → seven trigger sites need their anchoring checked against `PickerMenu`'s viewport clamp.

**Inherited Reasoning** *(what the design and review phases settled or ruled out — do not reopen)*

- **The sandbox is the design.** Cell values were settled by eye in a live pane. Where this plan regularizes a recipe, it must produce byte-identical output or be shown to Nathan before it locks (Gate 1).
- **Pink earns a hex rather than staying derived.** `color-mix(purple 55%, red)` made a stored `purple-5` depend on two unrelated palette entries. It sits *beside* `SPECTRUM` like `GREY_DEFAULT`, not inside it — inside would silently make pink an accent option and a Space color.
- **Ruled out: dissolving `default` into `grey-4`.** It saves one branch and costs a reachable bug — `grey-4` is a clickable square, so an uncolored option would open with that cell ringed, and clear-on-click becomes indistinguishable from pick-on-click there. Two keys, one value.
- **Ruled out: clamping the raw-color path.** Flooring a dark link up to a legible tone makes the swatch lie about what you get. The greyscale row is withheld from those two surfaces instead (R6).
- **Ruled out: `ColorKey`, `parseColorKey`, `canonicalColorKey`, and `ANCHOR_CELLS` in `shared/`.** Simplification round: `ColorKey` had no call site (every crossing is `string | undefined`), the normalizer duplicated `chipColorFor`, and a seating table in `shared/` could not see the ramp table it had to agree with. All four collapse into `isColorKey` plus a seating map inside `ramp.ts`.
- **Ruled out: `cellRing` reading `cellTint().background` on chromatic rows.** Numerically identical today, but it couples the picker's ring to the chip's *fill* — retune the fill and the ring moves silently. The ring was specified directly as the solid at tint-primary and stays stated that way. The grey branch *does* read the recipe, because there the ring and the border are the same thing by construction.
- **Ruled out: merging `SPECTRUM` into one `{hex, cell}` table.** Breaks the `{...SPECTRUM}` spread in `color.css.ts` and ripples through 21 references for no gain an exhaustive `Record` doesn't already give.
- **Deferred: naming the 64 cells.** This plan preserves the eleven names that exist today and reads every other cell as its family. A per-cell naming pass is a successor (→ Sequenced After).

**Grounding** *(re-open these; don't cite them)*

- `Pommora/src/renderer/src/design-system/showcase/leaves/PickerSandboxLeaf.tsx` — the settled design. Every recipe, exception, and constant this plan routes into the app.
- `Pommora/src/renderer/src/design-system/tokens/tint.ts` — `tintAt` / `tint` / `TINT_STEPS`. The recipe the sandbox reimplements; the primitive `mixAt` generalizes.
- `Pommora/src/renderer/src/design-system/tokens/chip.css.ts` — `chipColor`, `chipTint`, `ChipColorName`. The hand-listed ten, and the `--chip-fill` / `--chip-accent` contract every consumer inherits.
- `Pommora/src/renderer/src/design-system/tokens/colorMap.ts` + `.test.ts` — `chipColorFor`, `colorLabel`, `COLOR_LABELS`. The one crossing from stored string to render key.
- `Pommora/src/renderer/src/design-system/tokens/color.css.ts` — the token objects the greyscale ladder reads, and the `{...SPECTRUM}` spread.
- `Pommora/src/shared/theme.ts` + `Pommora/src/shared/types.ts` — `SPECTRUM`, `GREY_DEFAULT`, `SOLID_COLORS`, `SolidColor`.
- `Pommora/src/renderer/src/Components/Detail/ColorPicker.tsx` + `colorPicker.css.ts` — the surface being replaced and its seven consumers.
- `Pommora/src/renderer/src/Detail/Views/Table/solidColor.ts` — the raw-solid path shared by the link and checkbox cells *and* editors; carries the cast this work removes.
- `Pommora/src/main/crud/contextWrite.ts` (`setSpaceColor`) and `Pommora/src/main/readNexus.ts` (`resolveAccent`) — the two main-side validators; one moves to the grammar, one does not.
- `.claude/Features/DesignSystemPM.md` §The Token Atlas and `.claude/Features/PropertiesPM.md` §Chip Tokens — the `SOURCE:`-tagged tables this work falsifies.
- `.claude/Guidelines/Adversarial-Review-Log.md` — the failure classes; **fix-induced regression** is the one this plan is most exposed to.

**Environment**

| Slot | Resolved |
| --- | --- |
| Plan directory | `.claude/Planning` |
| Spec input | `PickerSandboxLeaf.tsx` + the ratified decisions recorded here. No decision-log document exists for this work; the sandbox is the source of truth. |
| Gate commands | From `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint` · `node scripts/check-atlas.mjs`. All four read directly, never through a pipe. |
| Rules directory | `.claude/Guidelines` |
| Simplification pass | `code-simplifier` — **run against the plan, findings folded** (see Rulings). |
| Attack reviewer | `build-breaking-agent`. Pending Nathan's go — this session's harness requires him to ask for a dispatch. |
| Code reviewer | Per gate, same ruling. No gate proceeds without its review. |

**Shapes:** additive (the ramp, the grammar, 54 new colors) · refactor (the mix primitive, the four-copy consolidation — carries a baseline invariant) · user-visible (the grid, the ring, the narrowed picker, the labels). **Not a migration** — nothing on disk is read, rewritten, or re-keyed.

**Baseline invariant (the refactor half):** at the plan's base commit, `typecheck` exits 0, `test` is green, `lint` is clean, and `check-atlas` reports `21 atlas tables checked — all agree with source`. Every phase re-proves all four. The refactor tasks additionally may not change the rendered color of any of the ten anchors — Task 2 pins that with equality assertions rather than assertion-free claims.

**Global Constraints (every task inherits these)**

- **Gates**, from `Pommora/`: `npm run typecheck`, `npm run test`, `npm run lint`, `node scripts/check-atlas.mjs`. Read exit codes directly. Never `cmd | tail` — the pipe's status masks a red suite.
- **Formatting is Biome's.** A PostToolUse hook formats every TS/CSS/JSON write. Never hand-align; an `Edit` failing on whitespace means Biome reformatted — re-read and retry.
- **Tokens come from `/design-system`.** No hand-rolled color, opacity, or motion value. Every literal introduced by this plan is either a settled sandbox constant or a `KNOB`, and both are named.
- **Comments carry *why* only.** No comment restates a value its own declaration holds, or names a feature's state. `KNOB` and `(Nathan's call)` markers are functional — never strip them.
- **Staging is explicit-path.** A parallel session is active on this tree. Never `git add -A`, never a directory-level add. Name every file, and commit path-limited (`git commit -- <path>`) so nothing else's staged work rides along. Unattributed edits to files this plan touches are Nathan's — bundle them, never revert them.
- **One writer at a time.** No concurrent tree-touching work.
- **Nothing lands in `src/shared` without a main-side caller.** The simplification round removed four such exports; don't re-add one on the argument that it belongs conceptually.
- **Out of scope everywhere:** the accent setting, the connection-color setting, `readNexus.resolveAccent`, `design-system/accent.ts`, `design-system/personalization.ts`, chip shapes, the remove-× melt machinery, and any on-disk value.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| PropertiesPM §Chip Tokens | "the ten spectrum solids + `default` (`GREY_DEFAULT`) + `accent` (`--system-accent`)" | 64 cells + `default` + `accent` | 6 |
| PropertiesPM §Chip Tokens | "`chipColorFor(color)` — the key when it's a spectrum solid, else `default`" | now parses the grammar and normalizes anchors to canonical cells | 6 |
| PropertiesPM §Chip Tokens | "One tint recipe drives every color … no custom colors, no lightening." | the ramp *is* lightening; the greyscale row has a documented exception | 6 |
| PropertiesPM §Pending | "**Larger Color Picker** — … the ColorPicker's grid can grow into a much larger selector" | delivered | 6 |
| PropertiesPM §II. Checkbox | the color control's options | greyscale row withheld | 6 |
| DesignSystemPM §Spectrum | table has no pink row | `PINK` exists beside `SPECTRUM` | 6 |
| DesignSystemPM §Tints | "`tintAt(base, step)` is `color-mix` of the base toward transparent" | `tintAt` now derives from `mixAt`, which mixes toward anything | 6 |
| ViewsPM | "an open chip-palette key validated through the chip map" | still true in substance; the vocabulary named around it grows | 6 |
| ContextsPM | "chips everywhere wear the Space's icon and chip-solid color" | "chip-solid" is no longer the whole vocabulary | 6 |
| ColorPicker.tsx | `// A larger picker over the same tokens is a Prospect` | delivered — the comment goes | 4 |

**Pre-existing atlas drift** *(found while grounding; both slip past `check-atlas` because bare numbers under 8 are skipped and `lavender` is not a checkable literal — fixed in Task 6, which edits both tables anyway)*

- `DesignSystemPM.md` §Spectrum: `DEFAULT_ACCENT` reads `lavender`; `types.ts` says `cyan`.
- `PropertiesPM.md` §II. Shapes: `chipBase` reads `zoom var(--chip-zoom, 0.9)`; `chip.css.ts` says `1.0`.

**Dead Vocabulary** *(what the closing sweep searches for)*

*(`grep -rF … | wc -l` throughout — the recorded counts were taken with grep, and `rg` honors `.gitignore`, so the two do not necessarily agree.)*

- `SWATCHES` → expect 0. Legitimate hits: none.
- `swatchColor` → expect 0. Legitimate hits: none.
- `outlineAt` → expect 0. Legitimate hits: none — folded into `tintAt`.
- `tintStyle` → expect 0. Legitimate hits: none — folded into `tint`.
- `lightBlue` → expect **2** (`theme.ts`, `theme-vars.css.ts`), down from 9.
- Control: `chipColorFor` → **56** at planning time. Zero here means the sweep never ran.

---

### Phase 1 — The ramp, and its one visual risk shown before anything depends on it

Everything downstream reads `ramp.ts`. This phase builds it, proves the regularization is byte-identical where it promised to be, and puts the one row it *does* move in front of Nathan while nothing has consumed it yet.

#### Task 1: One mix primitive, one ramp, and the sandbox re-pointed at it

**Requirement:** 1, 3, 4, 5, 8, 9, 10

**Why:** The sandbox holds the settled recipes as module-private constants, so nothing else can read them. Lifting them into a design-system token module is what lets `chip.css.ts`, `colorPicker.css.ts`, and `solidColor.ts` all resolve a cell the same way — the alternative, each computing its own, is precisely the "two writers for one thing" the house rules forbid, and is how the greyscale exceptions would end up existing in the picker alone.

`mixAt` rides in the same task rather than its own: it is three lines in a 26-line file with exactly one new consumer, and that consumer is this task's other half. The sandbox needs to mix toward black and toward white; `tintAt` mixes only toward transparent and `tint().color` already mixes toward `label.primary` with its own inline `color-mix`. One primitive collapses all three, and without it every recipe below would hand-roll a fourth.

The module exports **three** views of a cell, because three different things are asked of one: the raw color (a swatch, and every raw-solid consumer), the chip recipe (with the greyscale exceptions folded in), and the selection ring.

**Files:**
- Modify: `Pommora/src/renderer/src/design-system/tokens/tint.ts` — add `mixAt`; derive `tintAt` and `tint().color` from it.
- Modify: `Pommora/src/shared/theme.ts` — add `PINK`, `RAMP_FAMILIES`, `RAMP_STEPS`, `RampStep`, `CellKey`, `isColorKey`.
- Create: `Pommora/src/renderer/src/design-system/tokens/ramp.ts`
- Modify: `Pommora/src/renderer/src/design-system/showcase/leaves/PickerSandboxLeaf.tsx` — delete its private recipes; import from `ramp.ts`.
- Test: `Pommora/src/renderer/src/design-system/tokens/ramp.test.ts` (create — the one new test file this plan adds).

**Interfaces**

`shared/theme.ts` — the vocabulary and one predicate. Nothing else, because nothing else has a main-side caller:

```ts
export const RAMP_FAMILIES = ['red','orange','yellow','green','cyan','blue','purple','grey'] as const
export const RAMP_STEPS = [0,1,2,3,4,5,6,7] as const
export type RampFamily = (typeof RAMP_FAMILIES)[number]
export type RampStep = (typeof RAMP_STEPS)[number]
export type CellKey = `${RampFamily}-${RampStep}`
export function isColorKey(s: string): boolean   // a cell key, or one of the ten legacy anchors
export const PINK: string
```

`tokens/ramp.ts` — every meaning:

```ts
export const ANCHOR_CELLS: Record<keyof typeof SPECTRUM, CellKey>
export function cellColor(key: CellKey): string
export function cellTint(key: CellKey): { background: string; borderColor: string; color: string }
export function cellRing(key: CellKey): string
```

`GREY_OUTLINES`, `RAMP_STEP`, `DARKNESS_STEP`, the recipes, and the ramp table are **private** — their only consumers are inside this file.

- Assumed by: Task 2 (`chipColor` generation, `chipColorFor`), Task 3 (`solidColorCss`), Task 4 (the grid), Task 5 (`isColorKey`).
- `ANCHOR_CELLS` is keyed by `keyof typeof SPECTRUM` rather than `SolidColor` because `types.ts` imports `theme.ts`; the two names denote the same set.

**One source for "8".** `RAMP_STEPS` is the array, `RampStep` derives from it, `CellKey` derives from `RampStep`, `isColorKey` validates by membership rather than a digit range, and each ramp row is typed as a fixed-length tuple so a seven-cell recipe is a compile error. The grid and the chip generation both iterate the array, so that form is what the consumers wanted anyway.

**The recipes, and exactly how far regularization goes**

`RAMP_STEP = 15` is the single shading knob; `shade(i) = 100 - RAMP_STEP * i` yields 85 · 70 · 55 · 40.

| Row | Recipe | Regularized? |
| --- | --- | --- |
| red · orange · yellow · green · cyan | 3 steps toward black (`shade(3..1)`), anchor, 4 toward white (`shade(1..4)`) | **Yes — output byte-identical to the sandbox.** Its literals *are* 55/70/85 · 85/70/55/40. |
| blue ↔ cobalt | 1 step toward black, dark anchor, 3 oklch blends (25/50/75), light anchor, 2 toward white | **Yes — and cells 0, 6, 7 move.** See below. |
| purple | settled literals: `70` toward black, anchor, `50` blend, lavender, `50` blend, pink, `80` and `60` toward white | **No — Nathan's exclusion.** |
| grey | the eight fixed tokens, window-bg → system-white | **No — a token ladder, never computed.** |

**The blue row moves — this is the phase's whole visual risk.**

| Cell | Sandbox | Regularized | Direction |
| --- | --- | --- | --- |
| `blue-0` | `blue @ 70%` toward black | `blue @ 85%` (`shade(1)`) | lighter |
| `blue-6` | `cobalt @ 80%` toward white | `cobalt @ 85%` (`shade(1)`) | slightly more saturated |
| `blue-7` | `cobalt @ 55%` toward white | `cobalt @ 70%` (`shade(2)`) | notably more saturated |

The three oklch crossing blends (25/50/75) are even quarters across the two anchors — already regular, unchanged, and on the blend axis rather than the shading one.

**The greyscale exceptions** move verbatim. `DARKNESS_STEP = 15` stays a *separate* private constant from `RAMP_STEP` despite sharing a value, because they retune on different axes and collapsing them would make a chromatic retune silently move the grey chips. `GREY_OUTLINES` stays its settled literal array `[35, 45, 55, 65, 75, 85, 95, 100]`, each entry built with `tintAt(label.tertiary, pct)` — the sandbox's private `outlineAt` was that function under another name.

**`cellRing`:** `family === 'grey' ? cellTint(key).borderColor : tintAt(cellColor(key), TINT_STEPS.primary)`. The grey branch reads the recipe because `greyChipStyle` sets that border unconditionally at every step — ring and border are one thing there by construction. The chromatic branch states tint-primary directly rather than reading `cellTint().background`, which is numerically identical today but would couple the ring to the chip's fill.

**Failure half:** `isColorKey` on `''`, `'red-'`, `'red-8'`, `'red-01'`, `'-3'`, `'Red-3'`, `'chartreuse'`, `'grey-4-2'` → all false. On `'red'` and `'lightBlue'` → true. Membership, not a regex, so `'red-01'` is refused rather than coerced. `cellColor` is total by construction — the ramp table is built for every family × 8 at module load, so there is no absent-cell branch to get wrong.

**Steps:**
- [ ] Compute `PINK` from the sandbox's live readout: open `#picker-sandbox` (`npm run showcase` from `Pommora/`), select the pink anchor, read the `HexReadout`. **Predicted `#DC519F`** — a straight sRGB lerp of `#BF5AF2` 55% toward `#FF453A`. If the readout disagrees beyond rounding, the readout wins and the divergence is logged.
- [ ] Write the failing test: the five single-anchor rows are character-identical to the sandbox's current output; all ten anchors round-trip through `ANCHOR_CELLS` and `cellColor` back to their `SPECTRUM` hex, and `purple-5` yields `PINK`; `isColorKey`'s full malformed set; `cellTint('grey-7')` differs from `tint(cellColor('grey-7'))` (the exception is live) while `cellTint('red-3')` equals `tint(SPECTRUM.red)` (it is not); `cellRing('grey-3')` equals `cellTint('grey-3').borderColor`; `mixAt` honors a non-transparent `into` and the `oklch` space, and returns the bare base at 100.
- [ ] Run it — expect failures, modules not found.
- [ ] Add `mixAt`; re-point `tintAt` and `tint().color`. Add the `shared/theme.ts` vocabulary. Implement `ramp.ts`.
- [ ] Re-run — expect all pass, the byte-identical assertions included.
- [ ] Re-point the sandbox at `ramp.ts`: delete `mix`, `blend`, `single`, `pair`, `purpleRow`, `greys`, `ROWS`, `PINK`, `tintStyle`, `outlineAt`, `GREY_OUTLINES`, `DARKNESS_STEP`, `brightGreyStyle`, `greyChipStyle`; render from `RAMP_FAMILIES` × `cellColor` / `cellTint`.
- [ ] Full gate. Expect green, `check-atlas` still `21 … all agree`.
- [ ] Commit (explicit paths, path-limited): `feat(tokens): the color ramp gets one owner`

#### Gate 1 — the ramp is right, and the row that moved has been seen

- [ ] Gates green, exit codes read directly.
- [ ] `PINK` matches the live readout; the baked hex is recorded in the Log.
- [ ] The five single-anchor rows are proven byte-identical by test, not by claim.
- [ ] **Nathan has seen the sandbox with the regularized blue row** and signed off, or ruled that `pair()` keeps its literals like purple. **Blocking** — Phase 2 bakes 64 CSS classes from these values.
- [ ] The sandbox stays registered and intact until this gate signs off — it is the only surface that can show the blue row. (It is untracked until this phase's commit; after that, git can restore it.)
- [ ] Review over `<base>..HEAD` scoped to `tokens/` + `shared/theme.ts`.
- [ ] Every concern fixed, or carrying an explicit ruling in the Log.
- [ ] Progress hash filled in.

---

### Phase 2 — One vocabulary, and the parallels deleted

The grammar reaches the palette. This is where the four hand-maintained copies of the ten spectrum keys die, and where every consumer that indexes a raw solid learns the grammar. No user-visible surface changes shape yet — the picker is still 2×5 — so this phase is provable entirely by the type gate and tests.

#### Task 2: The chip palette derives from the ramp and speaks its grammar

**Requirement:** 2, 3, 7, 9, 10

**Why:** `chipColor` hand-lists ten keys, which is a second writer for `SPECTRUM` and cannot survive 64. Generating it from the ramp makes the palette derive rather than mirror, and typing it as an exhaustive `Record` turns a missing variant into a compile error. `ChipColorName` stays `keyof typeof chipColor` and therefore stays the same *name* every consumer already imports — the union behind it widens, and no chip consumer changes a line.

`chipColorFor` rides here rather than in its own task because the two are one deliverable: the accessor's narrowed return type is defined by the palette this task generates, and both are proven by the same gate. Normalizing anchors to canonical cells is what makes back-compat free downstream — one function absorbs the legacy vocabulary and nothing after it needs to know two grammars existed. That normalization carries a consequence handled in the same commit: `colorLabel` will never again receive `lightBlue`, so today's `'Cobalt'` is silently lost unless it moves to `blue-5`.

`default` keeps its key and takes its value from `cellColor('grey-4')` rather than `solid.greyDefault`, so the two names share one source. It must not become a cell (→ Inherited Reasoning).

**Files:**
- Modify: `Pommora/src/renderer/src/design-system/tokens/chip.css.ts` — generated variants; keep `default`, `accent`, `chipTint`, every shape, and the entire melt section.
- Modify: `Pommora/src/renderer/src/design-system/tokens/colorMap.ts` — `chipColorFor` normalizes; `COLOR_LABELS` re-keys onto cells; `colorLabel` falls back to the family name.
- Modify: `Pommora/src/renderer/src/design-system/tokens/colorMap.test.ts` — derive its key list from `SOLID_COLORS` rather than restating the ten.
- Modify: `Pommora/src/renderer/src/design-system/showcase/leaves/ChipsLeaf.tsx` — import `ChipColorName` instead of re-declaring it locally.

**Derivation** *(`lightBlue` is the probe — the one key whose spelling is unique to a hand-written list)*
- `grep -rF "lightBlue" Pommora/src | wc -l` → **9** at planning time, in 7 files. Vanishing here: `chip.css.ts`, `colorMap.ts` ×2, `colorMap.test.ts`. Vanishing in Task 4: `colorPicker.css.ts`, `ColorPicker.tsx`. Already gone: `PickerSandboxLeaf.tsx` (Task 1). **Expected survivors: 2.**
- Control: `grep -rF "chipColor" Pommora/src | wc -l` → **87**. Zero means the search never ran.

**Survivors — the fifth copy, ruled KEEP.** `theme-vars.css.ts` also hand-lists all ten as `--solid-*` bridge vars. Not converted: MarkdownPM's syntax tokens consume six of them from plain CSS (`Styles.css`, `--tok-solid`), and `check-atlas.mjs` verifies the DesignSystemPM Spectrum table by grepping this file's **literal text** for `--solid-red` and friends. Generating the block would make those names disappear from the source and fail the atlas for no consumer benefit. Never re-flag it.

Also untouched: `chipTint`, `--chip-fill`, `--chip-accent`, every shape primitive, and the entire remove-× melt section. The melt machinery is load-bearing and computed styles lie about it — the diff is checked for that at the gate.

**Interfaces**
- `chipColor: Record<CellKey | 'default' | 'accent', string>` · `type ChipColorName = keyof typeof chipColor` — 66 members.
- `chipColorFor(color: string | undefined): CellKey | 'default'` — **narrower than `ChipColorName`**, deliberately: it never returns `'accent'`, which is produced only by the two consumers that own the accent fallback. This removes the `(SOLIDS as Record<string, string>)` cast `solidColor.ts` carries today.
- Assumed by: Task 3 (`solidColorCss`), Task 4 (`ColorPicker.selected`), and every existing `Chip` / `ContextChip` / `chipColor[…]` consumer, which must compile unchanged.

**Baseline invariant:** the ten anchors must render the same three declarations after generation as before. Asserted, not claimed — the test compares `cellTint(ANCHOR_CELLS[k])` against `tint(SPECTRUM[k])` for all ten.

**The label grammar (interim).** Anchors keep the exact string they produce today; every other cell reads its family name:

```
red-3 → Red        blue-1 → Blue       purple-1 → Purple
blue-5 → Cobalt    purple-3 → Lavender purple-5 → Pink
grey-6 → Grey      red-6 → Red         grey-2 → Grey
```

Eleven entries — the ten `SOLID_COLORS` display names re-keyed onto their anchor cells, plus pink, a seated anchor with a real hex. Nothing that reads a label today changes what it reads.

**Failure half:** `undefined` → `'default'` (unchanged). A non-grammar string → `'default'` (unchanged). `'accent'` → `'default'`, preserving today's pinned behavior that the sentinel cannot round-trip in from disk. `'grey-4'` → `'grey-4'`, *not* `'default'` — a user who picked that cell picked a cell. The greyscale variants must carry the *exception* recipe, not plain `tint()`, or a `grey-7` chip in a table and the same chip in the picker are two colors.

**Steps:**
- [ ] Re-derive the `lightBlue` count against its control.
- [ ] Write the failing test: all ten anchors' recipes unchanged; `chipColor.default` and `chipColor['grey-4']` derive from the same value; the greyscale exception is live at 6–7 and absent at 0–5; every existing `colorMap.test.ts` case still passes with anchors now yielding canonical cells; all 64 cells pass through; `'accent'` → `'default'`; `'grey-4'` → `'grey-4'`; `colorLabel` returns today's exact string for all eleven named cells.
- [ ] Run it — expect failures on the canonical-cell and `default`-source expectations.
- [ ] Generate the variants from `RAMP_FAMILIES` × `RAMP_STEPS`; type as an exhaustive `Record`; re-point `default`. Implement `chipColorFor`; re-key `COLOR_LABELS`; derive the test's key list; fix `ChipsLeaf`'s shadowed type.
- [ ] Full gate — expect green with **no consumer edits**, which is the point. A type error in any chip consumer means the union widened wrongly; stop and report rather than casting at the call site.
- [ ] Commit (explicit paths, path-limited): `refactor(tokens): the chip palette derives from the ramp`

#### Task 3: Route the three raw-solid indexers through the ramp

**Requirement:** 2, 6, 11

**Why:** Three call sites index `color.solid[key]` for a raw solid rather than a tint, and `color.solid` has no `red-3`. Left alone they return `undefined` and paint nothing the moment a stepped key is storable — a link with no color, a checkbox with no fill, a Space with no header outline. This is the plan's clearest fix-induced-regression exposure: the picker change is what makes these reachable, and none of them is in the picker.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Views/Table/solidColor.ts` — resolve through `cellColor`; the `key === 'default'` branch collapses, since `default` now has a cell value to resolve; the cast goes.
- Modify: `Pommora/src/renderer/src/Blocks/ViewEmbedBlock.tsx` — the view chip's `stroke`.
- Modify: `Pommora/src/renderer/src/Detail/Settings/SpaceSettings.tsx` — the `SOLID_COLORS.includes(resolved)` guard and the `color.solid[resolved as SolidColor]` lookup behind the header outline.
- Test: `Pommora/src/renderer/src/Detail/Views/Table/solidColor.test.ts` (create)

**Derivation**
- `grep -rF "color.solid[" Pommora/src | wc -l` → **10** at planning time. Three convert. Seven are legitimate survivors, all accent-path and out of scope: `personalization.ts` (connection color), `accent.ts` ×3, `theme-vars.css.ts` ×2, `ColorsLeaf.tsx`. Re-derive before editing — a count above 10 means a new indexer landed and needs classifying.
- Control: `grep -rF "colorVars" Pommora/src | wc -l` → **31**.

**Survivors:** the seven accent-path lookups stay on `color.solid`. Accent and connection settings keep `SOLID_COLORS` (R11), so their indexers are correct as written and must not be "consistently" converted.

**Failure half:** `undefined` → the system accent (unchanged, and the behavior two editors depend on for their "Default" label). An unrecognized string → `default`'s value rather than `undefined`. A stepped key → its cell. `SpaceSettings`' guard must keep yielding `null` for genuinely unknown colors while accepting every valid cell.

**Steps:**
- [ ] Re-derive the count against its control; classify anything new.
- [ ] Write the failing test for `solidColorCss`: `undefined`, an anchor, a cell, `'grey-4'`, and garbage.
- [ ] Run it — expect the cell case to fail (`undefined`).
- [ ] Convert the three sites. Re-run; full gate — expect green.
- [ ] Commit (explicit paths, path-limited): `fix(views): the raw-solid path resolves cell keys`

#### Gate 2 — one vocabulary, behavior unmoved

- [ ] Gates green, exit codes read directly.
- [ ] Derivations re-run against their controls; counts matched or the divergence rewrote the plan.
- [ ] The ten anchors render byte-identically — proven by the Task 2 assertions, not asserted.
- [ ] `chip.css.ts`'s melt section is untouched in the diff.
- [ ] No consumer acquired a cast to absorb the widened union; `solidColor.ts`'s existing cast is gone.
- [ ] Review over `<base>..HEAD` scoped to `tokens/`, `Table/solidColor.ts`, `ViewEmbedBlock.tsx`, `SpaceSettings.tsx`.
- [ ] Every concern fixed, or carrying an explicit ruling in the Log.
- [ ] No user-visible surface shipped this phase; the running-thing pass is correctly deferred to Gate 3.

---

### Phase 3 — The grid, the boundary, and the record

#### Task 4: The 8×8 grid replaces the 2×5

**Requirement:** 1, 6, 8

**Why:** This is the deliverable. Props stay as they are — `selected: ChipColorName` still works because `default` is not a cell and therefore rings nothing, which is the whole reason Phase 2 kept it as a distinct key. The one addition is a `greyscale` flag, because two of the seven consumers paint the raw cell color and the greyscale row's dark end is the window substrate itself — `grey-0` *is* `#1A1A1C`, so a link in it is invisible against the page it sits on. The two consumers that pass it ride this task: the prop and its only callers are one deliverable, and a flag with no caller is untested by construction.

**Files:**
- Modify: `Pommora/src/renderer/src/Components/Detail/ColorPicker.tsx` — the grid; delete `SWATCHES` and the Prospect comment.
- Modify: `Pommora/src/renderer/src/Components/Detail/colorPicker.css.ts` — the 8-column grid, the cell, the ring, the seam; delete `swatchColor`.
- Modify: `Pommora/src/renderer/src/Components/Detail/URLEditor.tsx` and `CheckboxEditor.tsx` — pass `greyscale={false}`.

**Interfaces**
- `ColorPicker` props: `open`, `selected: ChipColorName`, `onPick: (color: string | undefined) => void`, `onDismiss`, `triggerRef` — **all unchanged** — plus `greyscale?: boolean` defaulting to `true`.
- `onPick` emits a `CellKey` or `undefined`. **It never emits a legacy anchor name.** Legacy keys are read-forever, written-never; picking red on an option storing `red` writes `red-3` on the next pick. Both render identically, and nothing on disk is rewritten unprompted.

**Geometry:** 8 cells × 18px + 7 gaps × 3px + 4px padding each side = **173px** square; 7 rows gives 173 × 152. Today's picker is ~36px wide, so every trigger's anchoring is re-checked against `PickerMenu`'s `VIEWPORT_MARGIN` clamp at Gate 3.

**The cell and its ring:**
- Resting: `inset 0 0 0 1px separator.border` — the hairline that keeps a dark cell legible on the pane.
- Selected: `outline: 2px solid cellRing(key)` at `outlineOffset: 1`, over `boxShadow: 0 0 0 1px system.black @ 60%`.
- The seam is not decoration. `GREY_OUTLINES[7]` is `label.tertiary` at 100%, which is `#E8E8E8`, and `grey-7`'s swatch *is* `#E8E8E8` — without a dark separator the ring and that one swatch merge into a single blob. It is inert on the other 63.

**Negative control** (the `greyscale` flag): both halves. The guard provably *ran* — a link's picker renders 56 cells and an option's renders 64, asserted rather than eyeballed. And it goes red with the guard disabled: remove the prop from `URLEditor` and the row count returns to 8, failing the assertion. A test that passes either way proves nothing here, because the prop defaults to `true`.

**User-visible sweep:**
- Every action has its inverse — click picks, clicking the ringed cell clears, and clearing is reachable for all 64 including `grey-4`.
- The component is sized by its container: `PickerMenu` portals to a fixed top layer and clamps to the viewport; the grid states its intrinsic size and never reads layout.
- Z-order is `PickerMenu`'s existing top layer, unchanged.
- No hover-revealed control is introduced, and no local gesture is added that could swallow a global one — the cells are plain buttons inside a pane that already stops pointer and contextmenu bubbling for every consumer.

**Failure half:** `selected` of `'default'` or `'accent'` → no cell ringed, the correct reading of "nothing chosen" and "following the accent." `greyscale={false}` with a *stored* greyscale value → the chip still renders that color everywhere; the picker simply does not offer the row. The value is not cleared, not rewritten, not coerced.

**Disclosed consequence — Nathan's ruling, recorded:** today's picker *does* offer plain `grey` (`#8E8E93`) to links and checkboxes, and hiding the row removes a currently-valid choice along with the invisible ones. Ruled acceptable in favor of one simple rule over a per-cell exception list. Reversible in one line.

**Steps:**
- [ ] Write the failing test: the link picker renders 56 cells and no grey row; the option picker renders 64.
- [ ] Run it — expect failure (no such prop).
- [ ] Rewrite `colorPicker.css.ts`: grid, cell, ring, seam. Cell backgrounds ride an inline `--sw` fed from `cellColor` rather than a third 64-class emission.
- [ ] Rewrite `ColorPicker.tsx`: render `RAMP_FAMILIES` (less `grey` when `greyscale` is false) × `RAMP_STEPS`; `aria-label` per cell from `colorLabel` plus its step; `onPick(selected === key ? undefined : key)`.
- [ ] Pass `greyscale={false}` at both consumers. Re-run — expect pass.
- [ ] Disable the prop at one site; confirm the test goes red; restore it.
- [ ] Full gate — expect green with no other consumer edits.
- [ ] Commit (explicit paths, path-limited): `feat(picker): the color picker becomes an 8×8 ramp grid`

#### Task 5: Main validates the grammar

**Requirement:** 2, 9, 11

**Why:** `setSpaceColor` refuses anything outside `SOLID_COLORS`, so a Space colored `blue-6` would be rejected at the write. `isColorKey` is in `shared/` for exactly this one caller. `readNexus.resolveAccent` deliberately does **not** move — the accent vocabulary is out of scope, and widening it here is the mistake this task exists to not make.

**Files:**
- Modify: `Pommora/src/main/crud/contextWrite.ts` — `setSpaceColor`'s guard uses `isColorKey`.
- Test: `Pommora/src/main/crud/contextWrite.test.ts` (extend if present; create if not).

**Derivation**
- `grep -rF "SOLID_COLORS" Pommora/src | wc -l` → **13** at planning time. One converts. Twelve survive: `types.ts` (the definition), `theme.ts` / `views.ts` (comments), `readNexus.ts` ×2 (accent — must not move), `SpaceSettings.tsx` ×2 (converted in Task 3), `ColorsLeaf.tsx` ×2, `colorMap.ts` ×2 (the display-name source).
- Control: `grep -rF "SpaceNode" Pommora/src | wc -l` → **35**.

**Trust boundary:** this validates data crossing from disk and from IPC, so it validates on principle rather than on a named mechanism. A hand-edited `_space.json` is inside the contract — the product invites a person to edit their Nexus — so a malformed key there is ordinary input, not an unreachable state.

**Negative control:** both halves. `blue-6` provably writes and appears in the sidecar; `'blue-8'`, `'chartreuse'`, and `''` are refused with `invalid-name`. Removing the guard makes the refusal test go red.

**Failure half:** `undefined` clears the key and deletes it rather than writing an empty value — today's behavior, and the nexus-wide no-empties rule. A legacy `'grey'` still validates.

**Steps:**
- [ ] Re-derive the `SOLID_COLORS` count; confirm the twelve survivors are the twelve named.
- [ ] Write the failing test: `blue-6` accepted, `blue-8` / `chartreuse` / `''` refused, `grey` still accepted, `undefined` deletes the key.
- [ ] Run it — expect `blue-6` refused.
- [ ] Convert the guard. Re-run; confirm the refusal test goes red with the guard removed, then restore.
- [ ] Full gate.
- [ ] Commit (explicit paths, path-limited): `feat(main): Space colors validate against the cell grammar`

#### Task 6: The documentation and the atlas

**Requirement:** 12

**Why:** Nine documented claims go false the moment the palette grows, and two atlas tables state literal values the checker verifies. The falsifying commit is the only moment anyone knows what went false.

**Files:**
- Modify: `.claude/Features/DesignSystemPM.md` — §Spectrum gains `PINK`; §Tints gains `mixAt`; a new §Ramp table (`SOURCE:` `tokens/ramp.ts`) states `RAMP_STEP`, `DARKNESS_STEP`, and the greyscale outline ladder. **No ring row** — the ring carries no literal of its own; it reads `TINT_STEPS.primary`, already an atlas entry in §Tints. Fix the pre-existing `DEFAULT_ACCENT` drift.
- Modify: `.claude/Features/PropertiesPM.md` — §Chip Tokens' Recipe & Variants rows; the greyscale exception; §II. Checkbox's color control; retire the "Larger Color Picker" Pending entry. Fix the pre-existing `chip-zoom` drift.
- Modify: `.claude/Features/ViewsPM.md`, `.claude/Features/ContextsPM.md` — the vocabulary sentences named in **Made False**.

**Steps:**
- [ ] Rewrite each claim in the Made False table. Replace rather than amend — no "formerly," no supersedes notes.
- [ ] Run `node scripts/check-atlas.mjs` — expect **22** tables (the new §Ramp), all agreeing.
- [ ] Full gate.
- [ ] Commit (explicit paths, path-limited): `docs(features): the color ramp enters the atlas`

#### Gate 3 — the grid ships, and the record closes

- [ ] Gates green; `check-atlas` reporting **22** tables.
- [ ] Every derivation re-run against its control.
- [ ] The `greyscale` negative control was proven in both directions.
- [ ] No consumer's props changed beyond the two `greyscale={false}` additions.
- [ ] **The running-app pass** (one walkthrough, all of it here rather than spread mid-plan): launch `env -u ELECTRON_RUN_AS_NODE npm run dev`; open all seven triggers — option editor, status editor, checkbox editor, link editor, view pane, view embed block, Space settings — and confirm each pane lands fully on-screen with its trigger visible. Confirm an uncolored option rings nothing · a stepped pick rings its cell · clicking the ringed cell clears · `grey-7`'s ring reads against its swatch · link and checkbox pickers show seven rows. Recolor an option to a non-anchor cell, confirm `purple-6` in the sidecar, ⌘R, confirm it renders the same. Screenshot the grid and one stepped chip in a table row; present both.
- [ ] Ask Nathan: does the sandbox retire, or become the ramp's permanent showcase page? Apply the ruling; if retiring, remove the leaf and its registry entry together.
- [ ] Dead Vocabulary sweep against its control: `SWATCHES` / `swatchColor` / `outlineAt` / `tintStyle` → 0; `lightBlue` → 2; `chipColorFor` → non-zero.
- [ ] Simplification and review over the full range.
- [ ] Every concern fixed, or carrying an explicit ruling in the Log.
- [ ] Delivery Claim written; neutral verifier run against the sandbox design and the requirement list; **then** the attack pass.

---

## Implementation Log

### Progress *(seeded unchecked — this tree is what a fresh agent reads first)*

- [ ] **Phase 1** — The ramp · base `<commit>`
  - [ ] Task 1 — mix primitive, `ramp.ts`, sandbox re-pointed · `<commit>`
  - [ ] Gate 1 — **blocking:** Nathan sees the regularized blue row
- [ ] **Phase 2** — One vocabulary
  - [ ] Task 2 — palette derives, accessor speaks the grammar · `<commit>`
  - [ ] Task 3 — the three raw-solid indexers · `<commit>`
  - [ ] Gate 2
- [ ] **Phase 3** — The grid, the boundary, the record
  - [ ] Task 4 — the 8×8 grid + its two narrowed consumers · `<commit>`
  - [ ] Task 5 — main validates · `<commit>`
  - [ ] Task 6 — docs and atlas · `<commit>`
  - [ ] Gate 3 — running-app pass, sandbox fate, closing sweep

### Rulings

- **Pink gets a real hex beside `SPECTRUM`** (Nathan) — not inside it, which would make pink an accent option and a Space color.
- **Regularize the single-anchor rows and the paired blue row; purple and greyscale keep their literals** (Nathan). The blue row's cells 0, 6, 7 move; Gate 1 blocks on him seeing it.
- **Per-cell names are a second pass** (Nathan). The interim preserves the eleven names that exist today.
- **The greyscale row is withheld from links and checkboxes** (Nathan) — rather than clamping the raw path. Accepted consequence: plain `grey` stops being offerable at those two surfaces; stored values still render.
- **`default` stays a distinct key pointing at `grey-4`'s value** (Nathan) — so an uncolored value rings no cell.
- **The selection ring derives** (Nathan): the solid at tint-primary on chromatic rows, the greyscale border ladder on the grey row. The dark seam stays — `grey-7`'s swatch is `label.primary` byte-for-byte.
- **Simplification round folded** (`code-simplifier`, pre-ratification). Accepted: the `shared/` seam narrowed to `isColorKey` + vocabulary, dropping `ColorKey` / `parseColorKey` / `canonicalColorKey` / `ANCHOR_CELLS` (the first had no call site; the rest had no main-side caller and forced a duplication the plan then had to test). 11 tasks → 6, 4 phases → 3. `GREY_OUTLINES` made private. `RAMP_STEPS` became an array so "8" is stated once. Two tests cut that the type gate already refuses. The hazard window demoted to one Gate 1 line. The §Ramp atlas ring row dropped.
- **Simplification finding partly rejected:** `cellRing`'s chromatic branch keeps `tintAt(cellColor(key), TINT_STEPS.primary)` rather than reading `cellTint().background`. Numerically identical today, but the ring was specified directly as the solid at tint-primary, and reading the chip's fill would make a fill retune move the picker silently. The grey branch *was* converted to read `cellTint().borderColor`, since `greyChipStyle` sets that border unconditionally — there they are one thing by construction.
- **Simplification reasoning corrected:** the sandbox was called "a file git can restore." It is **untracked** until Phase 1's commit. The conclusion (the hazard window was too heavy) stands; the justification was wrong, so Gate 1 states the real condition.
- **Attack round pending** — the project designates `build-breaking-agent`; this session's harness requires Nathan to ask for the dispatch. No gate proceeds without its review.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After

- **Name the 64 cells.** The interim reads a non-anchor cell as its family. A per-cell naming pass replaces `colorLabel` wholesale and is the only thing standing between "Red" and a real name for `red-6`.
- **The eleventh row.** `RAMP_FAMILIES` is a list, and the grid renders what it holds — a new family is one entry plus its anchors, with no schema churn. Deliberately not built.
- **Per-view link styling** (already a documented Prospect) inherits the grammar for free once it exists.

### Closeout
