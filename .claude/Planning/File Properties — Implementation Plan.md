## File Properties — Implementation Plan

> **Status:** ratified — in execution · Spec: [[File Properties — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Complete the `file` property type — the last of the ten — so a page can hold named files that are legible on disk, resolvable without a database, and reachable in the operating system's own browser from the value that names them. At the end, a file property can be filled, replaced, removed and read from the table, the cards and both inspector surfaces; its on-disk value is a wikilink an outside tool can follow; and no part of it depends on a stored absolute path.

It takes this shape because nine property types already ship with their cell renderer, column style, editor pane, filter operators, sort branch and value menu. The correct outcome is the type that **invents the least**: the value shape is multi-select's, adoption is the image path with its extension gate widened, the click is one arm on the router three surfaces already share, and the chip is a shape in the chip system rather than a parallel component. Two review passes — one adversarial, one reductive — established that most of this feature is deletion and hoisting. A plan reading as all-additions has mis-scoped it.

The alternatives are recorded and settled in the spec's Considered & Rejected: stored paths over wikilinks, a second asset root, page-title resolution, Lucide family glyphs, deferring the Directory field, a hairline-field chip, a `+` affordance, per-value aliases. None is re-opened here.

Bounded by: no thumbnails or previews, no byte deletion on remove or replace, no content-identity dedup beyond what adoption already does, and no repair of the pre-existing asset-migration gap (spec F-9). This does not solve attachment handling in the editor body, drag-and-drop from the OS, or a filename `Contains` filter — all Prospects.

**Requirements**

1. File values decode and encode as a bare array of `[[Name.ext]]` wikilink strings; the legacy `[{ path }]` object shape reads as null. *(spec A-1, A-3, A-4)*
2. `strict` for `file` refuses emptiness and non-strings only — never option membership. *(A-4a)*
3. File values resolve in the asset map's basename domain, and a value that is not a parseable wikilink renders unresolved rather than as a path. *(A-2, B-6, B-6a)*
4. Adoption becomes a **shared seam** — one adopt mechanism, reachable as its own channel, carrying `adoptImageAsset`'s five guards with the extension gate widened per caller and a subfolder threaded. Replace never deletes bytes. *(B-2, B-2a, B-4, B-4a)*
4a. Adoption is **one shared mechanism**, exported so a second caller reaches its guards rather than re-deriving them. The three banner arms already share it; the nexus icon is not an adopter (it lands a data URL under a fixed name). *(Nathan's call)*
4b. **Byte-deletion on replace stays with the callers that do it.** `adoptFile` never deletes; the banner and profile arms call `dropReplacedAsset` themselves. A file property is multi-value and multi-page and must never delete — proven by test, not by a parameter.
5. Each file property carries a def-level **Directory** — the destination an externally-uploaded file takes — set through `defEditOp`'s sync narrower, validated for containment **and** indexability, wearing the Default Asset Directory row's styling and `folder-open` browse glyph, its picker creating folders as well as selecting them. *(B-1a, B-1aa, B-1b, B-1c, C-6a, C-6b, F-1, F-1a, F-1b, F-1c)*
6. FileChip is a chip **shape** inheriting the removable chrome structurally; `SegmentRun` hoists to consume it and FilterPane's Location field moves onto it. *(C-1, C-1a, C-2, C-2a, C-2aa, C-2b, C-2c, C-2d)*
7. The extension→glyph map covers the 23 Tabler `file-type-*` glyphs with aliases, falling back to `file-chart-column`. *(C-3, C-4, C-5)*
8. The value's area adds; a chip replaces via the dialog at that file's folder; the hover-× removes. One arm on `sharedValueClickAction` serves the table, the cards and both panes. *(D-1, D-1a, D-2, D-3, D-5, D-7, D-8)*
9. The value menu is Add · Replace · — · Remove, with the clicked chip riding the context. *(D-4, D-4a, D-4b, D-4c)*
10. File leaves the column-style system entirely; sort extracts the parsed filename; presence filters and non-groupability stand. *(E-1, E-2, E-3, E-4, E-5)*
11. Nothing opens the attached file in-app; the orphaned `file:open` channel is retired in the same pass. *(D-3a)*
12. `PropertiesPM.md` and every other document this falsifies is reconciled in the commit that falsifies it. *(A-5)*
13. TableView's raw-path text editor is **removed, not adapted** — the dialog is the only authoring surface. *(D-6)*
14. The rename-cascade immunity of file values is recorded as an invariant in `ConnectionsPM.md`, so a later sweep doesn't "fix" it into a bug. *(A-6, A-7)*

**Acceptance — the whole thing working**

On a Collection with a file property whose Directory names a subfolder: clicking an empty cell picks a file from outside the nexus, which lands in that subfolder and renders as a chip wearing its extension's glyph; the frontmatter reads `<Attachments>:` over `- "[[Name.ext]]"`; clicking that chip opens the dialog at the file's own folder and picking a different file replaces it, leaving the first file on disk; the hover-× clears the reference and, when it was the last, removes the key entirely; the same value renders and edits identically in the Cards view and both inspector panes; sorting the column orders by filename; and `Has File` / `No File` partition the rows. No single task satisfies this.

**Forced By**

- The value becomes a `string[]` and `multi_select` is already one → the two `decodeValue` cases are shape-identical, and merging them is silently destructive (`optionValues` returns `[]` for a file def, so `strict` drops every value through the restore path). **The cases stay separate, and the plan says why at the site.**
- `adoptImageAsset` holds five guards its inner writer doesn't → adoption cannot be built on `writeAssetFile`, and only the `ASSET_MIME` line moves.
- `dropReplacedAsset` deletes with no reference census, and adoption dedups to one file per source → a byte-deleting Replace would destroy a file another page names. **Replace clears and rewrites the reference only.**
- `columnStyle.look` is `z.enum(COLUMN_LOOKS).optional().catch(undefined)` → removing `'filename'` and `'path'` from the enum *is* the compatibility story. No formatter branch survives to provide it.
- Both menu builders gate the Style submenu on `rows.length > 0` → deleting file's `case` hides the submenu with no further work.
- `sharedValueClickAction` has three consumers and one serves both panes → one arm covers four surfaces, and the two `revealAndEdit` early-returns become deletions.
- Every Directory predicate is pure string work, and `validateAssetDir`'s one async check cannot apply to a subfolder of an already-pruned root → `defEditOp`'s sync narrower holds it. No new channel.
- `indexable` drops dot-prefixed segments → a Directory can pass containment and still be unreachable forever, so containment alone is not the validation.
- `CellMenuAction` is a payload-less string union → "which chip" rides the context, not the action.
- The renderer holds nexus-relative paths only → every `defaultPath` is joined in main.

**Inherited Reasoning**

- `writeAssetFile` was the plan's original adoption target. It is the inner byte-lander; naming it skipped `underAssetRoot`, `bytes.equals`, `embeddableTitle`, `neverWatched` and the `AMBIGUOUS` refusal. `Q3|draft.pdf` and `Summary]].pdf` are legal macOS filenames that corrupt a reference, and `embeddableTitle` is the guard that catches them.
- A dedicated async IPC channel for the Directory was planned and is unearned.
- "Retire the Full Path look, keep Filename" was planned. A sole look is dead config; file leaves the style system entirely.
- FileChip was briefly planned as a `SegmentEntry` builder rather than a component. Nathan's ruling: it is a component and a chip type, so it shares the hover-× chrome structurally and is usable off a run.
- Re-expressing the Asset Directory row through FileChip was planned and is churn — it already consumes `SegmentRun`, and its lead-icon and `nested` choices are documented as deliberate.

**Grounding** *(re-open these; don't cite them)*

- `.claude/Planning/File Properties — Decision Log.md` — the spec, and its Sources list.
- `src/shared/propertyValue.ts` — `FileRef`, `isFileRef`, the decoder's `file` and `multi_select` cases, `encodeValue`, `isBlankValue`.
- `src/main/mutate.ts` — `adoptImageAsset` (`:120`) and its guards; `dropReplacedAsset` (`:108`).
- `src/main/assetMap.ts` — `indexable` (`:25`), `resolveAssetName`, the held map and its push.
- `src/main/exclusion.ts` — `neverWatched` (`:9`), `rootSegs` (`:27`).
- `src/renderer/src/assetUrl.ts` — `resolveAssetValue`'s three branches.
- `src/renderer/src/Detail/Views/PropertyEditing/valueClick.ts` — the shared click router.
- `src/renderer/src/Detail/Views/PropertyEditing/usePropertyRows.ts` — `editRow` (`:142`), the panes' shared editor.
- `src/renderer/src/design-system/tokens/chip.css.ts` — the shape tokens, `chipRemovable`, `chipRemove`, the melt machinery.
- `src/renderer/src/design-system/components/SegmentRun/` — the run and its entry type.
- `src/renderer/src/Components/Detail/FilterPane.tsx` (`:325`) — the inline segment composition C-2d hoists.
- `src/shared/columnStyles.ts`, `columnMenu.ts`, `cellMenu.ts` — the style system file leaves.
- `.claude/Guidelines/` — read before planning in any of these domains.

**Environment**

- **Plan directory:** `.claude/Planning/` · **Spec input:** the Decision Log.
- **Explorer:** `Explore`. **Attack reviewer:** `build-breaking-agent` (project-designated). **Simplification:** `code-simplifier` (project-designated). **Code reviewer:** `feature-dev:code-reviewer`. **Neutral verifier:** `general-purpose`, handed the adjudication question alone.
- **Gate commands:** `npm run typecheck` · `npm run test` · `npm run lint`. Read from `Pommora/package.json`, not guessed.
- **Rules directory:** `.claude/Guidelines/`.
- **Agent dispatch requires Nathan's go** — his standing rule. Each gate names its dispatches; ask before sending them.

**Shapes:** removal (dominant) · refactor · additive · user-visible · fix

**Expected size:** ≈ **−64 · +45 · +20 · +30 · +25 · 0** across the six phases → **net ≈ +56 code lines**, comments and tests excluded. The feature deletes about as much as it adds; the additions are dominated by 23 glyph registrations and the Directory field. **A phase overrunning its estimate is the signal that something existing was re-authored** — stop and find it rather than absorbing it.

**Global Constraints (every task inherits these)**

- Gates: `npm run typecheck`, `npm run test`, `npm run lint` — exit codes read **directly**, never through a pipe. `set -o pipefail` if a pipe is unavoidable.
- Main owns the filesystem. The renderer never touches Node. Every channel is declared once in `src/shared/bridge.ts`; both sides derive from it.
- IPC never throws across the boundary — data channels return the `Result` envelope with a structured error code.
- The renderer holds **nexus-relative** paths only. Absolute paths are joined in main.
- Biome is the formatter (a PostToolUse hook formats every TS/CSS/JSON write; single-quote, no semicolons). Never hand-align. An `Edit` failing on whitespace means Biome reformatted — re-read and retry.
- Tokens come from `design-system/`. Never hand-roll a token.
- Comments only for a why that can't be inferred. Comments a change makes false go with the code they describe, **in the same commit**.
- `KNOB` markers and `(Nathan's call)` / `(spec)` annotations are functional. Never strip them.
- Stage explicit paths, never directory-level `git add`. Unattributed edits to recently-touched files are Nathan's — bundle them, never revert them.
- Out of scope everywhere: thumbnails, byte deletion, editor-body embeds, OS drag-and-drop, the `Contains` filter, and `migrateAssets`.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `PropertiesPM.md` | File row: `[{ "path", "original_name", "added_at", "mime_type" }, ...]` | The value becomes an array of wikilink strings | 21 |
| `PropertiesPM.md` | Pending: "**Per-Type Editor Panes** — File is the one creatable type whose editor body is blank" | The File pane ships with the Directory field | 21 |
| `ViewsPM.md` / `TableViewPM.md` | Any enumeration of column looks naming Filename / Full Path | File leaves the column-style system | 21 |
| `DesignSystemPM.md` | The chip shape table (Pill · Label · Context · Capsule · Box) | FileChip joins it as a shape | 21 |
| `SymbolsPM.md` | The curated registry as the glyph roster | 23 Tabler `file-type-*` glyphs land in it | 21 |
| `ArchitecturePM.md` | Any channel inventory naming `file:open` | The channel is retired | 21 |
| `Cell.tsx:186` (comment) | "Each chip opens its own file — the click stays on the chip" | The chip click becomes Replace | 5 |
| `cellMenu.ts:18-20` (comment) | "a file cell adds Edit to Style"; "`remove-only` … an empty picker, a file" | Already stale, and the kind is deleted | 4 |

**Dead Vocabulary** *(what the closing sweep searches for)*

- `FileRef` → expect 0. Legitimate hits: none.
- `fileLabel` **as `formatValue.ts`'s export** → expect 0. Legitimate hits elsewhere: the shipped `FileLabel` component and its stylesheet carry the same token — scope the sweep to `formatValue.ts` and its test.
- `style-edit` → expect 0. Legitimate hits: none.
- `file:open` → expect 0. Legitimate hits: none.
- `'filename'` / `'path'` **as `COLUMN_LOOKS` members** → expect 0 in `columnStyles.ts`, `columnMenu.ts`, `Cell.tsx`, `formatValue.ts`. Legitimate hits elsewhere: `'path'` is a common field name across the tree — scope the sweep to those four files.
- **Control:** `rg -F "@shared/" src` → **862** at planning time. Zero here means the sweep never ran.

---

## Scope Map

The mandated first deliverable. Every consumer opened, not recalled. Counts re-derived at execution.

**Derivation** *(non-test, at planning time)*
- `rg -F "FileRef" src -g '!*.test.*'` → **4** · `rg -F "fileLabel" src -g '!*.test.*'` → **3**
- `rg -F "style-edit" src -g '!*.test.*'` → **3** · `rg -F "file:open" src -g '!*.test.*'` → **3**
- `rg -F "'filename'" src -g '!*.test.*'` → **5** (all four style-system sites plus `Cell.tsx`)
- Control: `rg -F "@shared/" src` → **862**

### DELETED

| Site | What goes |
| --- | --- |
| `shared/propertyValue.ts:18-22, 44-46` | `FileRef` interface, `isFileRef` guard |
| `shared/columnStyles.ts:17-18` | `'filename'`, `'path'` from `COLUMN_LOOKS` — both file-only, no other consumer |
| `shared/columnStyles.ts:72-73` | `defaultStyleFor`'s file case (`default` returns `{}`) |
| `shared/columnMenu.ts:83-84` | the whole `case 'file'` |
| `shared/cellMenu.ts:33, 87, 147-154` | the `style-edit` kind, its dispatch, its model case |
| `renderer/…/PropertyEditing/formatValue.ts:184-186` | `fileLabel` and its test |
| `renderer/…/Table/TableView.tsx:742, 780-793` | `editorInitial`'s file line, `commitEditorText`'s file branch — the raw-path editor |
| `shared/bridge.ts:289`, `preload/index.ts:185`, `main/index.ts:1887-1897` | the `file:open` channel, whole |
| `renderer/…/Table/cellGestures.test.tsx:524` + spies | the coverage for the retired open |
| `Components/Detail/PagePropertiesPane.tsx:148` | `if (def.type === 'file' …) return` |
| `PagePreview/PreviewInspector.tsx:117` | `if (def && (def.type === 'file' …)) return` |

### HOISTED

| Site | Where it goes |
| --- | --- |
| `FilterPane.tsx:325-345` — inline icon + label + `ChipRemoveButton` | onto `SegmentRun`'s chip entry, consuming FileChip |
| `filterPane.css.ts:211, 225` — `segmentRemoveSlot`, `segmentRemove` | to `segmentRun.css.ts`, beside the styles they extend |
| The four surfaces' file-click handling | one arm on `sharedValueClickAction` |

### CHANGED

| Site | What changes |
| --- | --- |
| `shared/propertyValue.ts` — `decodeValue` file case, `encodeValue`, `isBlankValue` | `FileRef[]` → `string[]`; the file case stays separate from `multi_select` |
| `renderer/src/assetUrl.ts` | gains `resolveFileValue` — the wikilink branch alone |
| `main/mutate.ts` — `adoptImageAsset` | extension gate becomes per-kind; subfolder threaded |
| `main/index.ts` — `pickImagePath` | takes an options argument (`defaultPath`, extension filter) |
| `shared/properties.ts` — `propertyDefinition` | gains the Directory field |
| `main/index.ts` — the def-edit channels | one more `defEditOp` narrower |
| `shared/cellMenu.ts` | `style-edit` → `{ kind: 'file'; onChip: boolean }` |
| `pipeline/sort.ts:141` | file moves off raw `sortText` onto parsed-filename extraction |
| `Table/Cell.tsx:187-205` | the chip run becomes a `SegmentRun` of FileChips |
| `Cards/CardValue.tsx:65-72` | `canFillBlank` gains file |
| `design-system/tokens/chip.css.ts` | gains the FileChip shape |
| `design-system/symbols/customGlyphs.tsx` + `index.tsx` | gain the 23 Tabler glyphs |

### Survivors *(deliberate stays)*

- `pipeline/filter.ts:210` — `evaluatePresence` already correct; `FILE_OPS` already correct. **No change.**
- `pipeline/group.ts` — file is already non-groupable by omission. **No change.**
- `PropertyTypes.tsx:30` — `file: { label: 'File', icon: 'file-chart-column', creatable: true }`. **Unchanged**; that glyph becomes the extension fallback.
- `main/assetMigrate.ts` — spec F-9. **Untouched.**
- `window.nexus.openFile`'s handler pattern — the `resolveUnderRoot` → `shell` shape survives in other channels; only `file:open` goes.

---

### Phase 1 — The value shape, and the deletions it forces

*Net ≈ **−64**. Every task here either deletes or narrows; the type gate enumerates the callers. The components: `FileRef`+`isFileRef` ≈8 · `fileLabel` 3 · column-style entries ≈6 · `style-edit` ≈12 · TableView's raw-path editor ≈22 · the `file:open` channel ≈13.*

#### Task 1: Turn the file value into a list of wikilink strings

**Requirement:** 1, 2, 13

**Why:** Every surface downstream reads the decoded kind, so the shape has to land before anything renders or edits it. A stored path is a fact about where a file sits now and breaks when the asset directory moves; a basename survives. Traces to the Goal's "legible on disk, resolvable without a database."

**Files:**
- Modify: `src/shared/propertyValue.ts` — delete `FileRef` (`:18-22`) and `isFileRef` (`:44-46`); rewrite the `file` case in `decodeValue` (`:87-90`). **`encodeValue` and `isBlankValue` need no work** — both already handle `file` as a shared fall-through with `multiSelect` (`:100-107`, `:124-128`) and stay correct under `string[]`.
- Delete: `src/renderer/…/Table/TableView.tsx:742` and `:780-793` — the raw-path text editor, whole. Not adapted.
- Test: `src/shared/propertyValue.test.ts`

**Interfaces**
- Produces: `{ kind: 'file'; value: string[] }`.
- Assumed by: Tasks 3, 5, 6, 14, 16, 17, 18.

**Failure half:** an object-shaped legacy value → `{ kind: 'null' }`, never a partial list · a mixed array (`['[[a.pdf]]', {path:'b'}]`) → null, since the array is validated whole · an empty array under `strict` → null · `[]` at rest → blank, so the key clears · **an array→array→string element → coerced back to its wikilink**, not treated as a mixed array.

**Must agree:** `isBlankValue` and `decodeValue`'s strict gate must reach the same answer on `[]`. One test crosses both.

**Steps:**
- [x] Write the failing tests: legacy object → null; mixed array → null; `['[[a.pdf]]']` → the list; `[]` strict → null; `[]` → blank; **and the unquoted hand-edit** — an element of `[["Report.pdf"]]` → `'[[Report.pdf]]'`.
- [x] Coerce that form. **The element is nested twice** — `- [[Report.pdf]]` parses to a value of `[[["Report.pdf"]]]`, whose single element is `[["Report.pdf"]]`: array → array → string. A predicate written for one level never fires on the real hand-edit and the value still nulls silently. Unquoted brackets are the natural hand-edit and NexusOS is a live Obsidian vault, so this arrives through the front door — and without the coercion the whole value nulls silently and the next in-app add overwrites the references on disk.
- [x] Run — expect failures.
- [x] Change the `file` case to require every element be a string. **Leave it as its own `case`, physically separate from `multi_select`, and comment why** — the two are now shape-identical, and merging them routes file through the option gate, where `optionValues` returns `[]` and `strict` discards every value through the restore path.
- [x] Delete `FileRef` and `isFileRef`. Run `npm run typecheck` — expect it to enumerate the remaining callers.
- [x] Fix what the gate names — **except `TableView.tsx:742` and `:780-793`, which are DELETED, not adapted.** The gate will name both (`editorInitial` reads `v.value[0]?.path`; `commitEditorText` rebuilds `[{...refs[0], path: trimmed}]`), and the mechanical fix compiles into a second authoring path that lets a user type any string into a file value — the unresolvable bare name Task 2 exists to refuse. Delete the branches; the dialog is the only authoring surface.
- [x] Full gate green.
- [x] Commit: `refactor(properties): a file value names files the way everything else does`

#### Task 2: Resolve a file value in the basename domain alone

**Requirement:** 3

**Why:** `resolveAssetValue` has a third branch that reads an unparsed bare string as a nexus-relative path. Pommora is agentic-legible and NexusOS is a live Obsidian vault, so a hand-edit writing `- Report.pdf` is an ordinary producer — and inheriting that branch would render it as *resolved* while naming a file that isn't there.

**Files:**
- Modify: `src/renderer/src/assetUrl.ts` — add `resolveFileValue` beside `resolveAssetValue`.
- Test: `src/renderer/src/assetUrl.test.ts`

**Interfaces**
- Produces: `resolveFileValue(value: string, map: AssetMap): { kind: 'asset'; rel: string } | { kind: 'unresolved' }`.
- Assumed by: Tasks 5, 16, 17.

**Failure half:** a bare filename → unresolved, **not** a path · an empty string → unresolved · a name no file answers to → unresolved · an ambiguous name → the first path by sort, matching the display precedent.

**Must agree:** `resolveFileValue` and `resolveAssetValue` must agree on a well-formed wikilink naming one file. One test crosses both.

**Steps:**
- [x] Write the failing tests, including the bare-name case explicitly.
- [x] Implement as a variant running the wikilink branch alone — **not** an option parameter threaded through the image callers.
- [x] Full gate green. Commit: `feat(assets): a file value resolves as a name, never as a path`

#### Task 3: Take file out of the column-style system

**Requirement:** 10

**Why:** A sole look is dead config. Both menu builders already gate the Style submenu on `rows.length > 0`, so deleting the case hides it with no further work — and `columnStyle.look`'s `.catch(undefined)` means dropping the enum members *is* the compatibility story for views already holding `look: 'path'`.

**Files:**
- Modify: `src/shared/columnStyles.ts` (`:17-18`, `:72-73`), `src/shared/columnMenu.ts` (`:83-84`)
- Delete: `src/renderer/src/Detail/Views/PropertyEditing/formatValue.ts:184-186` (`fileLabel`) and its test block.
*(The `Cell.tsx:202` label edit belongs to Task 5, not here — one writer per edit.)*

**Derivation**
- `rg -F "'filename'" src -g '!*.test.*'` → 5 at planning time; all five convert or delete.
- Control: `rg -F "@shared/" src` → 862.

**Survivors:** `'path'` appears widely as an ordinary field name. The sweep is scoped to the four style-system files.

**Failure half:** a SavedView holding `look: 'path'` → catches to `undefined`, falls to `defaultStyleFor`, renders the filename. Assert this with a fixture rather than reasoning about it.

**Steps:**
- [x] Write the failing test: a stored `look: 'path'` on a file column renders the filename.
- [x] Delete the two enum members, the `defaultStyleFor` case, the `columnMenu` case, and `fileLabel` with its test.
- [x] Run `npm run typecheck` — expect it to name every remaining reader.
- [x] Full gate green. Commit: `refactor(views): a file column has no look to choose`

#### Task 4: Retire the file cell's Style menu kind

**Requirement:** 9, 10

**Why:** `style-edit` exists to show Style radios plus Edit on a file cell. Task 3 removed the radios and D-4 replaces Edit. The kind has nothing left to carry. Its two comments (`cellMenu.ts:18-20`) are already stale — `baseCellMenu` returns `style-edit` for file unconditionally, so a file cell is never `remove-only` — and they go with the code they describe.

**Files:** Modify `src/shared/cellMenu.ts` (`:33`, `:87`, `:147-154`) · Test: `src/shared/cellMenu.test.ts`

**Steps:**
- [x] Invert the existing `style-edit` tests to the new expectation.
- [x] Delete the kind, its dispatch and its model case; delete the two stale comments.
- [x] Full gate green. Commit: `refactor(menus): the file cell stops offering a look`

#### Task 5: Render the file cell from the new shape

**Requirement:** 1, 3

**Why:** The cell must keep rendering between Task 1's shape change and Phase 2's FileChip, or the phase can't close green. This is the interim: existing `Chip`, label from the parsed wikilink, resolution through `resolveFileValue`.

**Files:** Modify `src/renderer/src/Detail/Views/Table/Cell.tsx:187-205`

**Failure half:** an unresolved value → the chip still renders, visibly unresolved — the value is in frontmatter and the user must be able to see and remove it · duplicate identical entries → keyed on index, not on the value string, or the hover-× addresses the wrong one.

**Steps:**
- [x] Swap the label source to the parsed title; key on index; route through `resolveFileValue`.
- [x] **Delete the comment at `:186`** ("Each chip opens its own file") — Phase 5 makes it false and it describes this block.
- [x] Leave the `openFile` call in place; Task 6 removes it with the channel.
- [x] Full gate green. Commit: `refactor(table): the file cell reads the new value shape`

#### Task 6: Retire the `file:open` channel

**Requirement:** 11

**Why:** `openFile` has exactly one production caller — the file chip. D-3a drops in-app opening deliberately, which orphans the channel, its preload binding and its main handler. Three dead files is a defect the house rules require reporting, so the retirement rides the change that causes it.

**Files:** Modify `src/shared/bridge.ts:289`, `src/preload/index.ts:185`, `src/main/index.ts:1887-1897`, `src/renderer/…/Table/Cell.tsx`, `src/renderer/…/Table/cellGestures.test.tsx:524`

**Derivation**
- `rg -F "file:open" src -g '!*.test.*'` → 3 · `rg -F "openFile" src` → 7 (4 are the test's spies).
- Control: `rg -F "@shared/" src` → 862.

**Steps:**
- [x] Delete the chip's `openFile` call, then the channel, the binding and the handler.
- [x] Delete the test's `openFileSpy` and its assertion.
- [x] `rg -F "file:open" src` → expect 0, control non-zero.
- [x] Full gate green. Commit: `refactor(ipc): the file-open channel goes with its last caller`

#### Gate 1 — the shape lands, and the tree is smaller
- [x] Gate commands green, exit codes read directly.
- [x] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [x] Net line delta reported, code only. Expect ≈ −64; a positive number here means something was re-authored.
- [x] `rg -F "FileRef" src` and `rg -F "fileLabel" src` → 0, control non-zero.
- [x] Simplification and code review dispatched against `<base>..HEAD` — **ask Nathan before dispatching.**
- [x] Every concern fixed, or carrying an explicit ruling in the Log.
- [x] No user-visible surface shipped this phase beyond the interim cell; defer its pass to Gate 2.

---

### Phase 2 — FileChip, and the run that hosts it

*Net ≈ +45 — the 23 glyphs are ≈35 of it, which is why Task 8 uses a factory rather than 23 hand-written wrappers. No behavior change — a carried baseline: the file cell renders the same labels before and after.*

#### Task 7: Add the FileChip shape to the chip system

**Requirement:** 6

**Why:** Nathan's ruling — FileChip is a chip *type*, so it inherits `chipRemovable`, `chipRemove` and the melt/blur reveal **structurally** rather than importing `ChipRemoveButton` and re-deriving the reveal in a second place. That machinery carries deliberate guards against a Chromium repaint defect and is never authored in parallel.

**Files:** Modify `src/renderer/src/design-system/tokens/chip.css.ts` (beside `chipPill`/`chipLabel`), `src/renderer/src/Components/Chip.tsx` (the `SHAPE` map)

**Why this shape:** chrome-less — it wears `chipBase` for gap, `--chip-zoom` and control type, but paints no fill and no border, so it reads as C-1's bare icon + title while still being a chip everywhere the remove chrome is concerned.

**Steps:**
- [x] Add the shape token; add it to `SHAPE`.
- [x] **Set `--chip-fill`.** `chipLabelMelt` paints `color: var(--chip-fill)` (`chip.css.ts:227`), and that var is only ever set by the `chipColor` recipes (`:254`) and `chipContext` (`:70`). A chrome-less shape sets neither, so the var is undefined, the declaration drops, and the melt twin inherits the label color — rendering a crisp duplicate stacked on the text instead of a smear. It must resolve to the surface *behind* the label, which differs per host (table cell, card, pane), so it is a var the host sets rather than a constant.
- [x] Verify the hover-× reveals and removes, **and that the melt actually smears** — this passes typecheck either way and only fails on screen.
- [x] If FileLabel ends up standalone rather than wrapping `Chip`, it follows `chipBox`'s precedent (`chip.css.ts:101` — a shape style deliberately *not* in `SHAPE`) and stays out of the map, since neither `chipShapeClass` nor `chipShapeForType` will ever return it.
- [x] Full gate green. Commit: `feat(design-system): a chip shape for a named file`

#### Task 8: Map extensions to their glyphs

**Requirement:** 7

**Why:** The chip's job is to say *what kind of file* at a glance, which is why per-extension beats per-family — `.ts` and `.tsx` reading as one glyph loses the distinction the chip exists to make (Nathan's call; the Lucide-family alternative is recorded as rejected).

**Files:** Modify `src/renderer/src/design-system/symbols/customGlyphs.tsx` (a factory over the Tabler imports at `TABLER_SCALE`), `src/renderer/src/design-system/symbols/index.tsx` (23 registry entries)

**The 23:** bmp, css, csv, doc, docx, html, jpg, js, jsx, pdf, php, png, ppt, rs, sql, svg, ts, tsx, txt, vue, xls, xml, zip. **Aliases:** jpeg→jpg, htm→html, xlsx→xls, pptx→ppt, mjs/cjs→js. **Fallback:** `file-chart-column`.

**Failure half:** no extension at all (`README`) → fallback · an unknown extension → fallback · uppercase (`.PDF`) → matched case-insensitively · a dotfile (`.gitignore`) → fallback, not treated as extension `gitignore`.

**Steps:**
- [x] Write the failing tests including all four failure cases.
- [x] Add the glyphs through **one factory**, not 23 hand-written wrappers.
- [x] Verify the registry stays `satisfies Record<string, LucideIcon>` — Tabler glyphs must conform.
- [x] Full gate green. Commit: `feat(symbols): a glyph per file type`

#### Task 9: Build the FileChip component

**Requirement:** 6

**Why:** Nathan's ruling — a component so any surface can render a named file or folder without going through a run.

**Files:** Create `src/renderer/src/design-system/components/FileChip.tsx` · Test alongside

**Interfaces**
- Produces: `FileChip({ name, icon?, onRemove?, unresolved?, onClick? })`. **`icon` is an explicit override; absent falls to the extension map.** Without it FileChip cannot serve its other two assigned consumers: the Directory field wears `folder-closed` (a folder name has no extension, so the map returns the chart fallback), and the Asset Directory row's path segments carry one lead icon rather than a glyph each.
- Assumed by: Tasks 10, 11, 16, 17.

**Steps:**
- [x] **Wrap `Chip`, don't compose beside it.** `Chip` (`Components/Chip.tsx:33-57`) already renders `ChipRemoveButton` + `icon` + `ChipLabel` with the melt twins — the exact composition C-2a forbids re-authoring. Make `Chip`'s `color` optional (`color?: ChipColorName`, `cx(SHAPE[shape], color && chipColor[color], …)`) and FileLabel is ~6 lines over it.
- [x] Full gate green. Commit: `feat(design-system): FileChip`

#### Task 10: Hoist the segment composition into SegmentRun

**Requirement:** 6

**Why:** Every caller hand-assembles icon + label + trailing today; `FilterPane.tsx:325` inlines exactly the composition FileChip now owns. Two callers of one fact means the run consumes the component, rather than a component sitting beside a consumer that still inlines it.

**Files:** Modify `src/renderer/src/design-system/components/SegmentRun/SegmentRun.tsx` (a chip entry option) · **Delete** `filterPane.css.ts:211, 225` (`segmentRemoveSlot`, `segmentRemove`)

**Not hoisted — deleted.** Those two styles have exactly one consumer, `FilterPane.tsx:340-345`, which is the inline composition this task replaces. FileChip inherits `chipRemove` structurally per C-2a, so hoisting them to `segmentRun.css.ts` would land dead code.

**The reveal geometry changes, and that is accepted.** The slot mechanism elongates a segment to make room beside the label; `chipRemove` is an absolute overlay on the chip's right third revealed by its own hover, with the label tail melting beneath it. The × stays reachable by a different means — an always-hittable 33% zone, so moving toward it enters the zone — which is why Task 10's verification checks *that*, not "reveals on segment hover."

**This migration is twice-adjudicated and stays** (C-2f). A reduction pass called it the plan's only Core over-scope; the ruling is that leaving FilterPane on the slot mechanism keeps two reveal recipes alive at once, which costs more than the scope it saves.

**Raise the cap.** `chipLabelWrap` caps at `--chip-max, 80px`; Location segments are uncapped today. Set `--chip-max` on the Location run high enough that no current Set title truncates, or titles start ellipsizing where they don't now (Nathan's call).

**Survivors:** `AssetDirectoryRow.tsx:62` keeps its structure — one lead icon, `nested` — both documented as deliberate. Its segments become FileChips; the row itself is untouched.

**Refactor baseline:** the FilterPane's Location field renders the same set of labels, **untruncated**, before and after. The remove *chrome* deliberately changes; the labels and the set of them do not.

**Steps:**
- [x] Add the chip entry option; move FilterPane's Location field onto it; delete the two orphaned styles.
- [x] Set `--chip-max` on the Location run; verify no current Set title truncates.
- [x] Verify the × reveals on its own hover zone, and that moving the pointer toward it never dismisses it.
- [x] Full gate green. Commit: `refactor(design-system): the run composes chips instead of parts`

#### Task 11: Render the file cell as a run of FileChips

**Requirement:** 6

**Files:** Modify `src/renderer/src/Detail/Views/Table/Cell.tsx`

**Interfaces:** consumes `SegmentEntry`, whose `key` is caller-supplied.

**Failure half:** two identical entries — a hand-edit, a sync merge, a paste — must not collide as React keys, or the hover-× addresses the wrong one. The entry `key` is the **index**, per F-8a. Task 5 installs this rule and this task replaces that block, so it has to carry it across.

**Steps:**
- [x] Replace the interim `Chip` run with a flat `SegmentRun` of FileChips, keyed on index.
- [x] Full gate green. Commit: `feat(table): a file cell reads as its files`

#### Gate 2 — the chip exists and nothing moved
- [x] Gate commands green.
- [ ] Refactor baseline held: the FilterPane Location field's rendered labels and remove behavior unchanged.
- [x] Net delta reported. Expect ≈ +45, glyph-dominated.
- [ ] **Fixture first** — a file property is inert until Task 16, so nothing in-app can fill one. Hand-write `<Attachments>:` over a **quoted** `- "[[Name.ext]]"` into a scratch page and drop that file in the asset root. Without it these checks are unfalsifiable.
- [ ] **Seen running:** the file cell, the FilterPane Location field, the Asset Directory row — the hover-× on each, and a click that ends the hover still removing.
- [ ] Simplification and review dispatched against `<base>..HEAD` — ask before dispatching.

---

### Phase 3 — Adoption reaches past the banner arm

*Net ≈ **+10**. The hoist is already structurally done — this exports it and gives it two parameters.*

#### Task 12: Export the adoption mechanism

**Requirement:** 4, 4a

**Why:** `adoptImageAsset` holds five guards nothing outside `mutate.ts` can reach — `underAssetRoot` (reference in place), `bytes.equals` (dedup), `embeddableTitle` (a `|` or `]` in a filename corrupts the reference), `neverWatched`, and the `AMBIGUOUS` refusal. Exporting it is what lets a second caller reach them instead of re-deriving them badly.

**It is already one shared mechanism.** `adoptImageAsset` has exactly one call site — the `adopt` closure at `mutate.ts:444` — and all three banner arms already consume that closure (page `:462`, navview `:482`, homepage/sidecar `:507`). There is no per-arm adoption path to convert. `setProfileImage` is **not** an adopter: it calls `writeNexusIcon` (`:422`) with a `dataUrl`, landing bytes under a fixed `NEXUS_ICON` name, so none of the five guards can apply to it in principle and folding it in would need a data-URL branch — a third policy on a two-policy seam.

**Files:** Modify `src/main/mutate.ts` — `async function adoptImageAsset` becomes `export async function adoptFile`, gaining `allow: 'image' | 'any'` and `subfolder?: string`. The `ASSET_MIME` gate at `:124-125` reads `allow`. That is the whole change.

**Interfaces**
- Produces: `adoptFile(root, absSource, opts: { allow: 'image' | 'any'; subfolder?: string })` → `Result<string>`.
- Assumed by: Tasks 13, 15, 16.

**Refactor baseline:** one test — a banner set and replaced behaves exactly as before. Per-arm baselines would pin code that isn't moving.

**Negative control:** both halves. A `.pdf` adopts under `allow: 'any'` and is refused under `allow: 'image'`; with the gate disabled, a `Q3|draft.pdf` test goes red — `embeddableTitle` must still refuse it, or the reference silently retargets at basename `Q3` with alias `draft.pdf`.

**Steps:**
- [x] Write the banner baseline test first.
- [x] Export, rename, add the two parameters; the banner closure passes `allow: 'image'`.
- [x] Full gate green, baseline unmoved. Commit: `refactor(assets): adoption is reachable by more than banners`

#### Task 13: The adopt channel, and the picker's options

**Requirement:** 4, 8

**Why:** A renderer-picked path has to reach `adoptFile` without riding a field write. This isn't only about not foreclosing the successors — a `source` on `setProperty` makes one IPC perform two writes with partial-failure semantics, and the separate channel is what makes "the reference is written only after the bytes land" structural rather than an ordering convention.

**Files:** Modify `src/shared/bridge.ts`, `src/preload/index.ts`, `src/main/index.ts:724` (`pickImagePath` gains options) and the handler.

**Interfaces:** `assets:adopt` → `Result<string>`.

**Failure half:** the handler **must drain `pushAssetWrites()` itself.** Adoption riding the `mutate` channel got that for free (`main/index.ts:1572`); a standalone channel doesn't, and without it the just-landed file is absent from the renderer's asset map and the chip renders *unresolved* until the next unrelated mutation.

**Steps:**
- [x] Add the channel; drain the push in its handler.
- [x] Add the picker's options: `defaultPath` (joined **in main**), extension filter.
- [x] Keep `pickedImagePaths.add` (`:730`) image-gated, or `nexus:imageData` opens to arbitrary picked files.
- [x] Full gate green. Commit: `feat(assets): adopting a file is its own step`

#### Task 14: Prove a replaced file survives

**Requirement:** 4b

**Why:** No policy parameter is threaded anywhere. `dropReplacedAsset` is called by the banner and profile arms directly; `adoptFile` never calls it, and `setProperty` gets keep-behavior by simply not calling it — as it doesn't today. What Requirement 4b needs is the **proof**, not a mechanism: the seam's dedup means two pages picking the same source share one file, so a Replace that ever learned to delete would destroy what another page names.

**Negative control:** after a file-property Replace, assert the previously-referenced file **still exists on disk**. Not "assert `dropReplacedAsset` wasn't called" — it is module-private (nothing to spy) and unreachable from `setProperty`, so that test passes with zero implementation and protects nothing. The fs assertion goes red the moment anyone wires a delete.

**Steps:**
- [x] Write the fs assertion. No mechanism ships with it.
- [x] Full gate green. Commit: `test(assets): a replaced file reference leaves its file alone`

#### Gate 3 — adoption is reachable, nothing is destroyed
- [x] Gate commands green. Negative controls verified in both directions.
- [x] Banner baseline held.
- [x] Net delta reported — expect ≈ +10. A larger number means a caller was converted that didn't need converting.
- [ ] **Seen running:** a banner set and replaced, proving the export moved nothing.
- [ ] Simplification and review dispatched — ask first.

### Phase 4 — The Directory field

*Net ≈ +30.*

#### Task 15: The Directory, its validation, and its pane

**Requirement:** 5

**Why:** It is the destination an externally-uploaded file takes — adoption has nothing to answer with until it exists. It rides `defEditOp`'s sync narrower like `link_color` does, because every predicate it needs is pure string work and `validateAssetDir`'s one async check (`holdsContent`) cannot apply to a subfolder of an already-pruned root.

**Files:** Modify `src/shared/properties.ts` (`propertyDefinition`), `src/main/index.ts` (one more `defEditOp` narrower beside `:640`/`:653`, **plus one browse channel** modelled on `assets:chooseDir` at `:966`), `src/shared/bridge.ts` (that channel), `src/main/mutate.ts` (the adoption-time backstop) · Create the File editor pane branch in `src/renderer/src/Components/Detail/PropertiesPane.tsx` and its editor component, reusing `src/renderer/src/Settings/pathRow.css.ts`.

**Reuse check:** `AssetDirectoryRow.tsx` is the same control one scope up — typed text that commits on blur and on unmount, a browse button, a refusal that reverts silently. Read it before writing this; what differs is the validator and the `defaultPath`, not the chrome.

**One validation site, not two.** `defEditOp`'s `fn` is already async and already holds `root` (`main/index.ts:622-633`) — the narrower is sync by convention, not by structure. So `readWatchScope(root)` is available at the handler and **the whole of `indexable`, both clauses, runs at set time** with the real `assetDir`. Splitting the clauses across two sites would be a second definition of one rule, which the house rules forbid. The adoption-time backstop keeps only the symlink `resolveUnderRoot` — a genuinely different check, not a second copy.

**Failure half:** `..` climb → refused lexically · absolute path → refused · a dot-prefixed name → refused as **non-indexable**, which containment alone would admit · empty → the asset root itself · a folder that doesn't exist → accepted, created at first write.

**Negative control:** with the `indexable` half disabled, a `.private` Directory test goes red — it would otherwise write successfully and vanish from the map with no error anywhere.

**Steps:**
- [x] Write the failing tests, including the `indexable` negative control in both directions.
- [x] Add the def field and the narrower — **no new channel.**
- [x] Add the adoption-time backstop in `mutate.ts` for the symlinked segment a lexical check can't catch — **resolving the asset ROOT (which always exists) and joining the segment-checked subfolder onto the canonical result.** `resolveUnderRoot` calls `realpath`, which throws `ENOENT` on a missing path: pointed at the subfolder itself it would refuse the first write into a newly-named folder, and since `mkdir` lives past the refusal inside `writeAssetFile`, the folder would never be created and every later attempt would refuse identically. Do **not** `mkdir` first and validate after — that creates a directory before the symlink check.
- [x] Build the pane branch **on `pathRow.css.ts`'s existing recipe** — `pathField`, `leadIcon`, `input`, `browse`, the `folder-closed` lead and the `folder-open` browse glyph. Import them; do not restate them. If the recipe needs a knob to serve both rows, add the knob rather than a second copy.
- [x] **Give `assets:chooseDir` a scope discriminant** rather than growing it a twin — the three differences are `defaultPath`, `message` and validator, ~6 lines against a sibling's bridge entry, preload binding and duplicated dialog shape. B-3 already chose an argument over a twin for the picker; the same reasoning applies here. `createDirectory` is already passed at `:968`, so C-6b needs nothing new.
- [x] Anything visual the spec doesn't specify: stop and ask.
- [x] Full gate green. Commit: `feat(properties): a file property names where its files land`

#### Gate 4 — the destination exists
- [x] Gate commands green. Negative control verified both ways.
- [x] **Fixture first**, as Gate 2 — still nothing in-app fills a file value at this phase.
- [ ] **Seen running:** the File editor pane, the Directory field, a refused folder.
- [x] Simplification and review dispatched — ask first.

---

### Phase 5 — Interaction

*Net ≈ +25, including the two pane deletions (≈−2).*

#### Task 16: One arm on the shared click router

**Requirement:** 8

**Why:** `sharedValueClickAction` has three consumers — `TableView.tsx:705`, `CardValue.tsx:86`, and `usePropertyRows.ts:147`, the last serving **both** inspector panes. One arm covers four surfaces; four implementations would be four places to drift.

**Files:** Modify `src/renderer/…/PropertyEditing/valueClick.ts` (the arm), `usePropertyRows.ts:142` (`editRow`), `Table/TableView.tsx`, `Cards/CardValue.tsx:65-72` (`canFillBlank` gains file)
**Consolidate, don't just delete.** Each pane has **two** click paths, and the early-returns are on the wrong one. `editRow` → `editRowShared` → `sharedValueClickAction` inherits the new arm correctly. But `revealAndEdit` (`PagePropertiesPane.tsx:140-165`, `PreviewInspector.tsx:110-125`) is a *different* function that hand-rolls the same routing inline and never calls the shared router — so deleting its file early-return drops the click into a rAF block with no file branch: a silent no-op on two of the four surfaces this requirement names. Replace each `revealAndEdit` body with `reveal(id); requestAnimationFrame(() => editRow(def, el))`. The duplicated router dies in both panes, file routes for free, and this task becomes a net deletion. Its catch-all already diverges from `editRow`'s explicit type list, which is the drift this removes.

**Interfaces:** `ValueClickAction` gains an arm carrying the target folder and whether a chip was clicked. **Plus a shared async effect** — `runFilePick(def, current, chipIndex | null)`, living beside `valueClick.ts` — that opens the dialog, adopts, and commits. `sharedValueClickAction` is pure and synchronous; it can only *name* an action, and a file click is a three-step async effect. Without the shared effect the "one arm covers four surfaces" claim is half true: the arm is shared and the effect drifts three ways, since each consumer has its own tail (`TableView.tsx:705`, `CardValue.tsx:86`, `usePropertyRows.ts:147`). `editRow` is currently synchronous and becomes fire-and-forget.

**Unresolved chips have no folder to open at** — B-6/B-6a guarantee they exist. Replace on one falls back to the property's Directory, rather than letting Electron pick its own last-used folder.

**Interaction sweep:** Add ↔ Remove; Replace ↔ cancelling the dialog. Three nested click targets in one cell — the value area, each chip, each chip's × — each inner one stopping propagation, so one click means exactly one thing. `ChipRemoveButton` gates on computed opacity, so an un-revealed × falls through to the chip's Replace rather than silently deleting.

**Steps:**
- [x] Write the failing tests per surface.
- [x] Add the arm; delete the two early-returns.
- [x] Verify the three click targets in the running app, not by reasoning.
- [x] Full gate green. Commit: `feat(properties): a file value fills, replaces and clears everywhere`

#### Task 17: The value menu

**Requirement:** 9

**Why:** `CellMenuAction` is a payload-less string union, so "which chip was right-clicked" rides the **context**, threaded from the hit test through both Table and Cards.

**Files:** Modify `src/shared/cellMenu.ts` (the `{ kind: 'file'; onChip: boolean }` kind and its model), `src/main/cellMenu.ts`, `Table/Cell.tsx`, `Cards/CardValue.tsx`

**Failure half:** a right-click on the value's area rather than a chip → **Add alone**, since there is no file for Replace or Remove to act on.

**The two Removes must not read the same.** `cellMenuModel` appends `{ label: 'Remove', action: 'cell:hide' }` to every `hideable` context, and cards always pass `hideable: true`. With this task's own Remove the card menu reads **Add · Replace · — · Remove · — · Remove**, distinguishable only by position, one of them destructive to the view's configuration. The actions differ so no wrong code runs — the wrong *item* gets clicked. Relabel: **Remove File** for the reference, **Remove from View** for the hide. File is the only type where the two co-occur; `link` and `clear-only` say "Clear".

**Steps:**
- [x] Write the failing tests, including the empty-area case and the two Removes.
- [x] Implement; thread `onChip` from the hit test.
- [x] Full gate green. Commit: `feat(menus): Add · Replace · Remove on a file value`

#### Task 18: Sort by filename

**Requirement:** 10

**Why:** file has **never sorted at all** — `sort.ts:141` routes it to `sortText`, whose switch handles `url` and `multiSelect` and returns `''` in `default` (`sort.ts:80-92`), so every row ties today and would still tie after the shape change. This adds the sort rather than repairing it.

**Files:** Modify `src/renderer/…/pipeline/sort.ts` — **`sortText`'s switch (`:80-92`), not `:141`.** That line already routes file to `sortText` correctly; the `''` comes from the switch's `default`. The edit is a `case 'file'`, mirroring `multiSelect`'s. (`context` returning `''` on the same path is documented-deliberate at `:78-79` — leave it.)

**Steps:**
- [x] Write the failing test: `[[Zebra.pdf]]` sorts after `[[apple.pdf]]`, case-insensitively.
- [x] Extract the parsed filename — **into `pipeline/value.ts`, not inline in `sort.ts`.** The deferred `Contains` filter needs the same extraction, and inline here it gets re-derived there, which is what keeps that Prospect a one-line flip.
- [x] Commit: `fix(views): a file column sorts by its filename`

#### Gate 5 — the feature works end to end
- [ ] Gate commands green.
- [ ] **The end-to-end acceptance criterion, observed in the running app**, exactly as written in the header.
- [ ] **Seen running:** all four surfaces — table, cards, both panes — including the three nested click targets and both Removes on a card.
- [ ] Simplification and review dispatched — ask first.

---

### Phase 6 — Reconciliation

#### Task 19: Sweep the dead vocabulary

**Steps:**
- [x] Run each Dead Vocabulary search with its control. A bare zero from a search that never ran looks identical to a clean one.
- [x] Record counts in the Log.

#### Task 20: Simplification pass over the whole range

**Steps:**
- [x] Dispatch `code-simplifier` against the full feature range — **ask Nathan first.**
- [x] Verify each finding against the code before folding.

#### Task 21: Reconcile the documentation

**Requirement:** 12

**Why:** Every row in Made False. `PropertiesPM.md`'s File row describes fields the code has never held — it is replaced outright, not amended.

**Files:** `.claude/Features/PropertiesPM.md`, `ViewsPM.md`, `TableViewPM.md`, `DesignSystemPM.md`, `SymbolsPM.md`, `ArchitecturePM.md`

**Steps:**
- [x] Rewrite each claim in the Made False table. Replace, never amend — no "formerly", no supersedes note.
- [x] Move File out of `PropertiesPM.md`'s Pending list.
- [x] Commit: `docs(properties): the file property is what it is`

#### Gate 6 — closeout
- [x] Every Dead Vocabulary sweep returns 0 against a non-zero control.
- [x] Delivery Claim written.
- [x] Neutral verifier dispatched against the **spec**, not the plan — "is this true?" — ask first.
- [ ] Attack pass dispatched only after a clean yes.
- [x] Lessons routed to `.claude/Guidelines/`.

---

## Implementation Log

### Progress
- [x] **Phase 1** — The value shape, and the deletions it forces · base `ea05d139`
  - [x] Task 1 — Turn the file value into a list of wikilink strings · `377b2322`
  - [x] Task 2 — Resolve a file value in the basename domain alone · `eb146cac`
  - [x] Task 3 — Take file out of the column-style system · `4c6003fe`
  - [x] Task 4 — Retire the file cell's Style menu kind · `0423296e`
  - [x] Task 5 — Render the file cell from the new shape · `0934967f`
  - [x] Task 6 — Retire the `file:open` channel · `23106180`
- [ ] **Phase 2** — FileLabel, and the run that hosts it · base `65b580d4`
  - [x] Task 7 — Add the FileLabel shape to the chip system · `04bd754e`
  - [x] Task 8 — Map extensions to their glyphs · `4fb35f8e`
  - [x] Task 9 — Build the FileLabel component · `04bd754e`
  - [x] Task 10 — Hoist the segment composition into SegmentRun · `1fdee072`
  - [x] Task 11 — Render the file cell as a run of FileLabels · `1c7d8d5b`
- [ ] **Phase 3** — Adoption · base `907a7dab`
  - [x] Task 12 — Export the adoption mechanism · `55497111`
  - [x] Task 13 — The adopt channel, and the picker's options · `44b57737`
  - [x] Task 14 — Prove a replaced file survives · `1c6a176b`
- [x] **Phase 4** — The Directory field · base `1c6a176b`
  - [x] Task 15 — The Directory, its validation, and its pane · `0e8a9aee`
- [x] **Phase 5** — Interaction · base `0e8a9aee`
  - [x] Task 16 — One arm on the shared click router · `013033d0`
  - [x] Task 17 — The value menu · `a9fd3ada`
  - [x] Task 18 — Sort by filename · `5642599c` · `300e2ed1`
- [x] **Phase 6** — Reconciliation · base `0e994de0`
  - [x] Task 19 — Sweep the dead vocabulary · `5642599c`
  - [x] Task 20 — Simplification pass over the whole range · `aa1aa2ea`
  - [x] Task 21 — Reconcile the documentation · `8be13cc8`

### Rulings

- **A parallel session is live in this tree.** It committed `b1cbf8ff` mid-Phase-1 and holds its own uncommitted files (`PickerControl.tsx`, `pickerControl.css.ts`, an untracked `pickerControl.typeable.test.tsx`, `FrameworkPM.md`, `NexusSettings.tsx`). Every commit here stages explicit paths and none of those files are among them. Two consequences for the gates: `ea05d139..HEAD` is **not** this feature's range — it carries their commit, which is why the naive delta read `+50` against a real `−32` — and a red `npm run test` has to be attributed before it is believed, since their in-flight file was transiently red twice through Phase 1.

### Phase 1 — the gate

- **Gates:** typecheck, test (3492) and lint all green, exit codes read directly.
- **Dead vocabulary:** `FileRef` 0 · `fileLabel` 0 · `style-edit` 0 · `file:open` 0, against a control of **863**.
- **Derivations:** control `@shared/` 863 against 862 at planning time — the one added hit is Task 1's own `parseConnectionText` import. `'filename'` re-derived at 4 non-test rather than 5; the missing hit is `Cell.tsx`'s, which Task 1 removed ahead of Task 3.
- **Delta:** code-only, comments and tests excluded, summed over this feature's six commits alone: **+46 −84, net −38** against an expected −64. Not an overrun — the shortfall is addition the phase's breakdown never costed: `resolveFileValue` with its shared `namedAsset` (≈+10) and Task 5's asset-map seam (≈+15), which the plan had priced as a render swap. Every deletion the breakdown named landed.
#### Gate 1 — the review, and what it turned up

Both reviewers independently found the same defect, and I confirmed it by opening the file before folding it.

- **Fixed · `usePropertyRows.ts:79` read `assetMap` inside its memo and omitted it from the dependency array.** Its two siblings carried it; this one didn't, and `useExhaustiveDependencies` is off by design, so no gate could see it. Inert only until Task 11 consumes `ctx.assets` — after which a file row in either inspector pane would resolve against a frozen basename index and read unresolved for a file that exists. Cause: a scripted edit rewrote the call first, which left the dependency-array replacement matching nothing and passing a too-weak assertion. **The lesson is the assertion, not the array** — a text substitution whose guard checks a fragment rather than the whole match can no-op silently.
- **Fixed · three stale comments.** `TableView.tsx` and `CardsView.tsx` both still claimed `buildResolveContext` "reads only contexts + labels" with `assetMap` sitting in the dep array one line below; `cellMenu.ts:52` still described a file cell as the column's Style radios plus Edit.
- **Fixed · `FileValue` restated two of `AssetValue`'s three arms twelve lines from the original.** It is now `Exclude<AssetValue, { kind: 'external' }>`, so a future arm flows into both.
- **Ruled, not fixed · a single-bracket `- [Report.pdf]` coerces to a wikilink.** YAML reads it as a one-element flow sequence, which is byte-identical after parsing to the inline spelling of a real wikilink — there is no post-parse fact that separates them. The choice is between coercing it and nulling the page's whole attachment list, and coercion is the better failure: `[Report.pdf]` under a file key has no other meaning to preserve. Accepted deliberately; not a defect to re-open.
- **Ruled, not fixed · `TableView` and `CardsView` build their `ResolveContext` identically.** The only sane home for a shared hook is `resolveContext.ts`, which is a pure module two test files import; putting a Zustand read there trades five duplicated lines for a purity break in tested code. `usePropertyRows` couldn't join it regardless — it keys on the whole tree on purpose. The duplication predates this feature and Phase 1 widened it by one argument.
- **Confirmed, already planned · `sort.ts` has no `file` arm**, so a file column sorts by a constant. That is Task 18, not a Phase 1 miss.

#### Phase 2 — the delta, and where it went

**+148 −68, net +80** against an expected +45, code only. Read per commit: glyphs **+56** · shape and component **+53** · the hoist **−33** · the cell **+4**. Nothing existing was re-authored — the hoist's −33 is the parallel composition and its reveal recipe actually leaving — so the overrun is two things the estimate under-priced:

- **The glyph roster is a line per extension.** The plan costed 23 registrations at ≈35 lines; under Biome's formatting a 23-item array is 23 lines before the alias map, the factory and `fileTypeIcon` are counted at all. ≈+27 over.
- **FileLabel is 47 lines, not "~6 over `Chip`".** The estimate imagined a bare wrapper. What shipped carries the four things the spec asks of it — the icon override, the hover-×, the unresolved state and the click — plus the two-rule stylesheet for the last two. Nothing in it duplicates `Chip`: the chip renders itself, and FileLabel names which shape and which glyph.

`onClick` has no consumer until Task 16. It stays because the spec's C-2c interface names it and its consumer is the next phase's first task; cutting and re-adding it across one phase boundary is churn, not restraint.

#### Gate 2 — the simplification pass

Each finding opened and reproduced before folding.

- **Fixed · the chip painted a border.** `chipBase` sets border-*style* and every other shape names a width; the chrome-less one didn't, so the UA's `medium` drew a 3px rule in the text color. Caught by Nathan on sight. `border: 'none'` states the intent the shape is named for.
- **Fixed · `fileTypeIcon` carried a guard arm that did nothing.** `dot === name.length - 1` was load-bearing only while the function could answer `undefined`; once it always falls back, `trailing.` reaches the same answer by falling through. Reproduced both ways before cutting. The `dot <= 0` half stays and is now said out loud: without it a bare `ts` slices to its own name and glyphs as TypeScript.
- **Fixed · the roster check asserted what it was about to test.** `(ALIASES[raw] ?? raw) as FileTypeExt` claimed membership on the line before `includes` checked for it. `.find` — the house whitelist idiom — narrows honestly and drops the cast.
- **Fixed · `SegmentEntry.onClick` was a passthrough with no caller.** `FileLabel` owns the prop and its interface is specified (C-2c); the entry-level forwarding was a second layer nobody asked for. Task 16 adds it in the same commit as the caller that needs it — one line then.
- **Fixed · `chipFile`'s `padding: 0` zeroed nothing.** Neither `chipBase` nor `text.control.semibold` contributes one. The sibling shapes state their padding because they have one.
- **Ruled, not fixed · `segmentIcon` may now be inert.** Its `flexShrink: 0` probably never fires, since `sr.segment` holds natural width. "Probably" is the reason it stays: it is one defensive declaration, the cost of being wrong is a squeezed glyph in a narrow field, and CSS alone can't settle it.
- **Ruled, not fixed · the conditional prop spreads.** `exactOptionalPropertyTypes` isn't set, so `onRemove={e.onRemove}` would be identical and shorter — but the pattern is at ~34 sites across the renderer. Changing it here alone trades repo consistency for four lines. A repo-wide call, not a Phase 2 cleanup.
- **Ruled, not fixed · `Cell.tsx` parses each wikilink twice** — once for the label, once inside `resolveFileValue`. A regex and a map hit per visible row; collapsing it means changing `resolveFileValue`'s return shape, which serves the image callers too.

#### Gate 2 — the correctness review

- **Fixed · `chipFile` guessed at a ground it doesn't have.** It set `--chip-fill` to `surface.primary`, and neither host is that color: the Filter pane's field is a translucent `--input-field` wash, and a table cell has no background at all — it sits on the view surface and changes to its hover tone on the very hover that reveals the ×. The codebase's rule is that the fill var FOLLOWS the background (`settingsPane.css.ts:352` sets both to `transparent` together), and a chrome-less shape's background is transparent. So the melt twin paints nothing and the tail dissolves through `chipLabelMelt`'s ramp alone. **The var still has to be SET** — unset drops the declaration and the twin inherits the label color, which is the crisp-duplicate defect Task 7 named.
- **Already fixed · a dotted folder segment would have grown a glyph.** `assets.v2` reads `v2` as an extension and takes the fallback, which C-1a forbids mid-path. The `nested → icon={false}` rule shipped in `cd40fe1f` closes it before `fileTypeIcon` is ever reached; the reviewer read a mid-state. No flat run has a non-file entry without an explicit icon, so there is no remaining case.
- **Verified clean:** every `SegmentRun` caller migrated off `trailing` (zero hits renderer-wide for it, `segmentLabel`, `segmentRemoveSlot`, `segmentRemove`, `SEGMENT_ICON_GAP`) · optional `Chip.color` emits no bogus class and `FileLabel` is its only omitting caller · all 23 registry ids are new and collide with nothing · `asTablerGlyph` runs at module scope only · `--chip-max: none` has no nested chip to leak onto · `resolveFileValue` is a regex plus one map hit per entry.
- **Noted for later, outside this feature:** `AllSymbols.test.ts`'s displayName rule skips on the negation of its own assertion, so it is structurally unable to fail. Pre-existing and untouched here.

#### Phase 3 — the delta

**+55 −18, net +37** against an expected +10, code only. The export itself was the ≈+10 the plan priced — `adoptFile` gained two parameters and one line moved. The rest is Task 13, which the phase estimate never separated out: a bridge entry, a preload binding, an options-taking picker that joins its `defaultPath` in main, a second pick set, and the `assets:adopt` handler with its own asset-push drain. That is the channel B-2d called for; it was costed as if it were free.

Task 14 shipped no mechanism at all, as specified — three assertions against the filesystem. A spy on `dropReplacedAsset` would have passed with zero implementation and protected nothing; these go red the moment anyone wires a delete.

#### Gate 3 — the review, and a live hole it found

- **Fixed · `assets:adopt` was an arbitrary-file-write primitive.** The channel took a renderer-supplied `subfolder` straight to the write. `rootSegs` drops empty segments but **not `..`**, and `join` collapses them past the root: reproduced at `'../..'` → the nexus root, `'../../..'` → outside the nexus, with `mkdir -p` making whatever it needed. One ordinary pick anywhere in the session was the entire precondition. The refusal went **at the seam** (`adoptFile`) rather than at the channel, so every caller inherits it; the guard removed sends both new tests red, and restored, green. The comment in `paths.ts` that credited `rootSegs` for the empty-segment case is what made the `..` gap invisible, and it is rewritten to say where the refusal actually lives.
- **Fixed · `adoptFile` said "image" in a failure it can now reach with any file.**
- **Fixed · a nested ternary produced one optional key** in the picker's `defaultPath`.
- **Fixed · the adopt rationale was stated in two homes.** `bridge.ts` is the contract's; `index.ts` keeps only the `pushAssetWrites` note, which is index-only.
- **Ruled · `assetSubRoot` has one caller.** Rule of Two isn't met; held because `paths.ts` is the path-vocabulary home and the validator reads it too.
- **Verified clean:** the pick bound holds (`pickedPaths` is main's own record), `nexus:imageData` did not widen, `pushAssetWrites` fires on success only and re-reads the root at call time, the three banner arms and `dropReplacedAsset` are unchanged, and `envelope` cannot double-wrap a `Result`.

#### Two commits crossed with a parallel session

Both directions of the same mistake, on a tree with another session live in it.

- **Their work rode into mine.** `types.ts` was already dirty with `HighlightColorSetting` and `Personalization.highlightColor` when it was staged by path for Task 13, so those two declarations sit under `44b57737`. Left in place — that session's commit brings the consumers, and reverting would break it.
- **Mine rode into theirs.** `git mv`ing `pathRow.css.ts` stages immediately, and it sat in the shared index long enough for `8f4b9b00` to sweep it. The rename is in history under their message.

**Staging by path is not enough on a shared tree** — a path can be dirty with someone else's work, and anything staged is exposed to the next `git add -A` from any session. Read `git diff --cached` before every commit, and never leave a staged change sitting.

#### Phase 4 — the delta, and the overrun

Code-only, comments and tests excluded: **+204 −86, net +118** against an expected +30. Four times the estimate, and the plan says a phase overrunning means something existing was re-authored — so, per file:

- **`PathField` +83, `AssetDirectoryRow` +11 −71.** A **+23 hoist**, not a wash and not a re-authoring: the control moved out of the settings row into the design system, and the row became a wrapper. The +23 is the placeholder branch an unset property Directory needs, plus the props that make the control take its scope from a caller instead of reaching into the store. This is the reuse the plan asked for — Task 15 said to build the pane *on* the existing recipe — but the plan priced it as an import, and importing a component that reads `useSession` directly was never possible.
- **`main/index.ts` +58 −11.** The `chooseDir` scope rewrite (~20), the `setFileDirectory` channel with its async check (~11), `narrowFileConfig` (~8), `defEditOp`'s check parameter (~8), imports. All named by Task 15's own steps.
- **`assetRoots.ts` +30** — `validPropertyDir` and `assetSubfolder`, both of which the task specifies.
- **`FileEditor` +33, `PropertiesPane` +17, `properties.ts` +8, `bridge.ts` +6** — the pane, its branch, the def field, the channel.

Nothing here is a second copy of something that exists; the estimate simply priced a pane branch and missed that the field it reuses had to become reusable first. Recorded rather than absorbed.

#### Phase 5 — the delta, and the overrun

Code-only, comments and tests excluded: **+147 −35, net +112** against an expected +25, read per commit as **Task 16 +57** and **Task 17 +55**. Under-priced seams both times, not re-authoring — the same pattern every phase has shown, and here the plan under-prices interfaces it names in its own body:

- **Task 16's `filePick.ts` is a new file, and the estimate priced only "one arm plus two deletions."** The task's own Interfaces section mandates the shared async effect — `sharedValueClickAction` is pure and synchronous, so it can only *name* a file action — but the ≈+25 was written against the arm alone. The two pane deletions did land negative (`PagePropertiesPane` −4, `PreviewInspector` −3), exactly as the task claimed.
- **Task 17's threading is per surface, and there are two of them.** `TableView` +22 and `CardValue` +16 are the two hit tests carrying `onChip` into the menu context; `cellMenu.ts` +22 is the kind and its model. All three are what the task's Failure-half section describes; none was costed.

#### Gate 4 / 5 — the correctness review

Phase 4 shipped without its gate; this pass covers `0e8a9aee`, `013033d0` and `a9fd3ada` together. Every claim re-opened against the code before it was accepted.

- **Verified · the Directory cannot reach a write outside the asset root, by any entry.** A hand-typed path is the one that matters: `PathField` commits raw text, `narrowFileConfig` normalizes it with `rootSegs` — which drops empty segments and **keeps `..`** — and `defEditOp`'s async `check` then runs `validPropertyDir`, whose `underAssetRoot` refuses any `..`, `.` or empty segment outright. A refused check returns before `editProperty`, so nothing is written. `adoptFile` re-validates at the write for the same reason. `assetRoots.test.ts` pins both directions.
- **Verified · the collapsed `revealAndEdit` dropped nothing.** The checkbox arm lives in `editRow`'s `commit` case, where the `onReveal` fires on a clear to null. `PreviewInspector` keeps its def-less branch for a Context row; `PagePropertiesPane` never routed Context through this gesture at all — its Add menu un-hides the row without opening an editor.
- **Verified · `runFilePick`'s ordering is structural.** A cancelled dialog and a refused adoption both return `undefined` before any write, and all three tails commit only on a defined answer. `folderOf`'s `''` cannot fire for a *resolved* chip: `assetDirValidate.ts:19` refuses the nexus root as an asset root, so a resolved `rel` always carries a separator. The `def.file_directory` fallback is therefore the unresolved-chip case alone, as specified.
- **Verified · the chip hit test is positional at both layers.** `SegmentRun` stamps `data-segment-index` from the entry's position and `Cell.tsx` keys on the same index, so two identical wikilinks address their own labels. A click on the value's own area finds no stamped ancestor and reads `null`, not `0`.

#### Task 19 — the sweep

Against a control of **868** (`@shared/`, 862 at planning time): `FileRef` **0** · `style-edit` **0** · `file:open` **0** · `'filename'` / `'path'` as `COLUMN_LOOKS` members across the four style-system files **0**.

`fileLabel` reads **12**, and the entry is the thing that is wrong, not the tree. The symbol it was written to retire is `formatValue.ts`'s `fileLabel(ref, look)` — the filename-versus-path formatter the column-style system called — and that is at **0**, confirmed against `ea05d139` where it lived. The 12 hits are the shipped component's own vocabulary: `FileLabel.tsx`, `fileLabel.css.ts`, and the `fileLabelText` parse. The entry was written while the component was still named FileChip, so its token and the new name collide.

#### Gate 4 / 5 — the simplification pass

Every finding re-opened against the code before folding. Commit `d1788cf4`.

- **Fixed · a file label in either inspector pane ADDED instead of replacing.** `fileChipIndex` walks *up* from the node it is given, and both panes handed it `e.currentTarget` — the value row, an ancestor of every label — so it could only ever answer null. The table and the cards pass `e.target` and always replaced correctly. The two facts are genuinely different: one anchors what opens, the other says what was hit, so `editRow` now takes them separately and a caller that conflates them reads as the value's own area. `revealAndEdit` passes only the anchor, which is right — a revealed row has no label under the cursor. Pinned by the case that makes it necessary: hit-testing a row that *wraps* labels answers null, hit-testing a label answers its index.
- **Fixed · the pick's tail was written five times.** `void runFilePick(…).then((next) => { if (next !== undefined) commit(next) })` appeared at both Table sites, both Cards sites and in `usePropertyRows`. `pickFileInto` states it once, so the rule that `undefined` means *write nothing* — which a bare `!= null` would read as a clear — lives in one place.
- **Fixed · `folderOf` re-spelled `parentOf`.** `shared/treePatch.ts` already exports the containing-directory of a nexus-relative path, with the off-by-one its own comment names. It is now called rather than restated.
- **Fixed · the Directory refusal was spelled twice** in `main/index.ts`, once per entry, from the same verdict. One `NOT_A_PROPERTY_DIR` beside the file's existing `NEEDS_*` constants.
- **Fixed · `cellMenuContextFor` ended in four bare booleans.** `(prop(), 'file', {}, true, false, false, true)` is unreadable without counting. The three surface-supplied flags became a named object; `filled` stays positional, which leaves thirteen of the sixteen call sites untouched.
- **Fixed · `SegmentEntry.onClick` was plumbing with no caller.** Task 16 routed the click through `data-segment-index` instead, so the passthrough shipped dead. The Phase 2 fold had removed it once and Task 16 restored it in anticipation of a consumer that took a different route.
- **Fixed · both panes' `revealAndEdit` comment narrated the rewrite** rather than the rule. It now says why the frame exists and why one router; what it used to be is not the reader's business.
- **Fixed · `TableView` resolved a column's definition on every cell click** to serve one branch. It moved inside that branch.
- **Open · `FileLabel.onClick` has no consumer.** Spec C-2c names the click as part of the component's interface, and Phase 2's ruling kept it for a Task 16 consumer that ended up hit-testing the DOM instead. The prop, its clickable-span branch and its stylesheet rule are therefore unreachable. Removing it is three lines and re-adding it is three lines; it is a design-system interface the spec names, so it is Nathan's call rather than a fold.
- **Ruled, not fixed · `startsUnder` and `assetSubfolder` are two root-prefix comparisons in one file.** They differ by strictness and by what they return, and the stricter one is the security predicate that runs ahead of `resolveUnderRoot`. A prior ruling already kept it apart from `exclusion.ts`'s matcher for that reason; sharing a helper here would put the boundary check behind an abstraction serving a display concern.
- **Ruled, not fixed · `canFillBlank` restates the router's type table.** One site, so the Rule of Two is unmet. Recorded because a new type has to teach two lists, which is the shape that becomes a defect at three.

#### Phase 6 — the delta, and the closing pass

Code-only: **+137 −116, net +21**, over five commits — Task 18 `+2`, the Gate 4/5 fold `+1`, the field-width and dead-click removal `−9`, the sort target `+2`, Task 20 `+25`. The phase had no estimate; it was reconciliation.

Every finding opened against the code before folding. Commit `aa1aa2ea`.

- **Priority 1 came back empty, which is the result that matters.** The pass was aimed at hand-rolled parallels — the feature's own thesis is that it invents the least — and found none. Every seam it could have re-spelled it consumes instead: `parentOf`, `parseConnectionText` / `normalizeTitle` / `connectionText`, `rootSegs` / `normalizeSeg` / `indexable`, and `Chip` / `hairlineField` / `focusRing` / `OverflowScroll`. `SegmentRun` has three real consumers, so it is a shared component rather than a wrapper around one caller.
- **Fixed · the menu's three file actions were written twice**, once per surface that pops a menu. Remove needs no dialog and Add differs from Replace only in whether it carries the chip, so `runFileMenuAction` states the triad once and each surface names its own commit.
- **Fixed · the refusal sentence had two homes.** It now lives beside `validPropertyDir`, the predicate both the set side and the write side answer to.
- **Fixed · `cellMenu.ts` stated its per-kind matrix twice**, and the second copy had drifted onto the wrong declaration and omitted `file` entirely. The kind union's own header covers it; the duplicate is gone, and the header now says what a `file` cell carries.
- **Fixed · `baseCellMenu` widened its type parameter with `| 'context'`** where `PropertyType` already holds it, which made the `context` branch read as if it were handling an outsider.
- **Fixed · `SegmentRun` kept the doc line for a prop it no longer has**, and `value.ts`'s `fileName` claimed a text filter reads it. Neither was true: the click routes through `data-segment-index`, and the file filter is presence-only.
- **Fixed · `pathField.css.ts`'s `LEAD_GAP` carried no `KNOB`** where every sibling spacing constant in `segmentRun.css.ts` does.
- **Ruled, not fixed · `startsUnder` and `assetSubfolder`.** Raised twice now, and the answer is the same both times: `startsUnder` is the security predicate that runs ahead of `resolveUnderRoot`, and putting it behind a helper shared with a display concern is what the earlier ruling declined.
- **Noted, outside this feature · three flush-on-unmount implementations** (`PathField`, `FilterPane`, `PropertyEditor`). The rule of three is met, but each carries a different guard — draft-is-null, value-changed, and a StrictMode `done` ref — which are reasons to stay apart rather than an accident.

#### Requirement 14 was unmet until the closing pass

`ConnectionsPM.md` recorded that the rename cascade rewrites every frontmatter URL value naming a renamed page, and said nothing about file values — the exact silence the requirement exists to close, since the next reader to notice the omission would close it as a bug.

The immunity is real and it is **structural rather than type-aware**, which is the part worth writing down: both the content index's `frontmatterMentions` and the rewriter's `rewriteFrontmatterConnections` read only string-valued frontmatter, and a file value is an array. Neither knows what a file property is, and neither needs to.

### Open Against Later Tasks
### Deviations

- **Task 1 · the coercion covers both YAML spellings, not one.** The plan named the block-sequence form alone (`- [[Report.pdf]]` → an element of `[["Report.pdf"]]`). Verified against `eemeli/yaml`: the inline form (`Attachments: [[Report.pdf]]`) nests one level shallower, giving an element of `["Report.pdf"]`. One helper unwraps single-element arrays to their string and re-spells the wikilink, so both hand-edits survive and a multi-entry nested sequence still reads as null.
- **Task 1 · `Cell.tsx`'s file block was adapted here, not in Task 5.** The type gate named it, and the new shape carries no path for `window.nexus.openFile` to take — so the label moved to the parsed wikilink title, the key moved to the index, the `:186` comment went, and the `openFile` call went with them. **Task 5 is now only** the routing through `resolveFileValue` and the unresolved look; **Task 6 still owns** the channel, its preload binding, its handler and the spy.
- **Task 1 · two test blocks were rewritten here.** `Cell.test.tsx`'s `file looks` describe and `cellGestures.test.tsx`'s file-chip-open test both held legacy-shaped fixtures, so Task 1's shape change is what falsified them. The first became one test on the new shape; the second was deleted with the behavior it covered.
- **Task 1 · the index key carries a `biome-ignore`.** `noArrayIndexKey` fires on F-8a's mandated key. Suppressed with the true reason — the entries are positional, carry no state, and keying on the value would collide on two identical wikilinks.
- **Plan header vs Phase 3's own estimate.** The header row reads `+20` for Phase 3 where the phase body reads `+10`; the body governs, so the expected net is ≈ **+46**, not +56.
- **Task 3 · the failing test is the parse, not the render.** With file out of the style system the cell no longer reads `style.look` at all (Task 1), so "a stored `look: 'path'` renders the filename" has no render path left to assert. It lands where the compatibility actually happens — `columnStyle.parse` catching both retired members to `undefined`, beside the two the link vocabulary already retired, plus `defaultStyleFor('file')` returning `{}`.
- **Task 3 · `cellMenu.test.ts`'s `style-edit` fixture was narrowed here.** It named `look: 'filename'`, which the enum no longer holds. Its expectation now reads the empty row set Task 3 leaves behind; Task 4 deletes the test with the kind.
- **Task 4 · a file cell's interim menu is the bare one.** With the `style-edit` dispatch gone, `baseCellMenu` falls to `null` for file — no menu in the table, `remove-only` on a card. That is exactly what the `remove-only` comment has always claimed ("an empty picker, a file"), so the deletion makes a stale comment true rather than needing one. Task 17 replaces it with the Add · Replace · Remove kind.
- **Task 5 · what was left of it is the asset-map seam.** Task 1 already swapped the label, the key and the comment, and the *unresolved look* belongs to FileLabel's own `unresolved` prop (spec C-2c — FileLabel owns the whole unit), so building an interim class for it would have landed CSS that Task 11 deletes. Task 5 therefore ships the seam the resolution needs: `AssetMap` joins `ResolveContext`, built once per view rather than subscribed per cell, and reaches the table, the cards and both panes together. **Task 11 consumes it** when the cell becomes a run of FileLabels.
- **Task 8 · the Tabler scale wrapper is now one definition.** `customGlyphs.tsx` had the `TABLER_SCALE` bump inlined in its single Tabler adoption; the 23 new glyphs would have been a second copy of it. It became `asTablerGlyph`, which `ProgressCheck` now rides too, and the roster lives in its own `symbols/fileTypes.ts` beside the registry that spreads it.
- **Tasks 7 and 9 shipped together.** The shape's only consumer is the component, and `Chip`'s `color` had to become optional for either to work; splitting them would have landed an orphan shape for one commit. Task 8 ran first so the component had its glyph map to default to.
- **Two visual decisions taken from what already exists, not designed.** `chipFile`'s `--chip-fill` defaults to `surface.primary` — the content-surface ground, the thing a chrome-less label sits on — and a host on a different ground overrides it the way `chipContext` already does. `unresolved` wears `opacity: var(--state-inactive)`, which is the dim the editor already gives a link that leads nowhere, so a reference naming nothing reads the one way across the app.
- **`ChipsField`'s `chipShape` restated the shape union.** It was typed `'pill' | 'label'` — a second definition of `ChipShape` that the new member broke. It now reads `ChipShape`.
- **Task 10 · the hoist is unconditional, not an opt-in entry kind.** Spec C-1a and C-2d both read that *every* run's segments become FileLabels, so `SegmentRun` composes one per entry rather than growing a chip-shaped variant beside the hand-assembled one — a variant would have left the two compositions alive side by side, which is the drift the hoist exists to end. `trailing` became `onRemove`, and `segmentLabel` went with the composition FileLabel now owns.
- **Task 10 · the no-glyph case belongs to the caller, not to the glyph map.** The hoist put path segments through FileLabel, and a folder name has no extension — so the first attempt made `fileTypeIcon` return undefined for a name with none, which showed no glyph. **Nathan's ruling: the fallback fires for every name.** C-4 says so, and a map that sometimes answers nothing is not a fallback. `fileTypeIcon` always returns a glyph id; a caller that wants none passes `icon={false}`, and `SegmentRun` passes it for a `nested` run — a path's segments are folders carrying one lead icon on the run, which is the run's own fact rather than the map's.
- **Task 10 · `--chip-max` is lifted on the run, not raised on Location.** A chip's 80px cap would ellipsize each title separately, stacking a second truncation on the run's one honest signal — its trailing edge fade. `none` on `segmentRun` is the whole fix, and it serves the asset row's path segments for the same reason.
- **Task 12 · the banner baseline was already written.** `mutate.test.ts`'s `setBanner` block already pins all five guards — adoption under its own name, reference-in-place, the AMBIGUOUS refusal, the collision step-aside and the byte-identical dedup. It passes unchanged across the export, which is the baseline the task asked for; writing a second one would have pinned the same code twice.
- **Task 12 · the subfolder joins through `assetSubRoot`.** `writeAssetFile` already takes the asset root as a nexus-relative string and `rootSegs` drops empty segments, so a root-plus-subfolder is one composition rather than a branch — and an absent or slash-padded subfolder resolves to the root itself with nothing downstream special-casing it. Task 15's validator reads the same function.
- **Task 13 · the picker channel is renamed, not just widened.** B-3 settled that it takes an options argument rather than growing a twin; the name `pickImage` then reads wrong at every call site that picks a PDF. `nexus:pickFile` / `window.nexus.pickFile` — the type gate named all five call sites, none of which pass options, so the rename is mechanical and the behavior for banners is unchanged.
- **Task 13 · the pick is bounded by TWO sets, not one.** `pickedPaths` records every file the dialog hands out and is what `assets:adopt` checks — the renderer never names a path main did not choose. `pickedImagePaths` stays the narrower set, added to only by an image pick, because B-3a's point is that widening the FILTER must not widen what `nexus:imageData` will read back.
- **Task 16 · the two panes' `revealAndEdit` became the ordinary click, one frame later.** Deleting their `file` early-returns alone would have dropped the click into a rAF block with no branch for it. Both now reveal and then call `editRow`, so the duplicated router dies in each and its catch-all — which already disagreed with `editRow`'s explicit list — goes with it. `PreviewInspector` keeps one branch of its own: a Context row carries no def and opens its own picker.
- **Task 16 · which label was clicked is read off the DOM, not passed down.** `SegmentRun` stamps each entry with its position, so the table, the cards and both panes hit-test identically and the run grows no callback per gesture. `SegmentEntry.onClick` came back here, with the caller that needs it, exactly as the Phase 2 fold recorded.
- **Task 17 · only the file kind relabels the hide.** The plan asked for both Removes renamed; renaming the generic one everywhere would change copy on every type to fix a collision that exists on one. A file cell's hide reads **Remove from View**; every other type keeps **Remove**.
- **Naming.** The spec settled on **FileLabel** (C-2c); several plan headings still read FileChip. FileLabel is the name that ships — component, chip shape and prose alike. The Dead Vocabulary entry for `fileLabel` is scoped to `formatValue.ts` for the same reason: the retired formatter and the shipped component share a token.
- **The Preview Inspector gained the hover-× it never had.** It called `Cell` without a `remove` handler, so no chip in that pane carried one — multi-select options and Context Spaces as much as files. The closing verifier is what surfaced it, since reading the shared click router cannot: the arm was shared correctly and one consumer simply never wired the removal half. It now passes the same handler `PagePropertiesPane` does, which gives every chip type in that pane its × rather than files alone. Nathan's call, taken once the gap was named.
- **C-2 / C-2a · one shape became two, and the cell composes its own run.** The spec settled FileLabel as *the* rendering for a named file or folder and a multi-file value as a flat `SegmentRun` of them. Shipped as two: **FileChip** wears `chipFile` — chip-label's box at the quaternary label tone over no fill — and is what a file property's VALUE renders as; **FileLabel** wears `chipPlain` and carries no chrome, which is what a name inside a FIELD wants, since a box around a field's own content is a box in a box. Nathan's call, taken on sight of the two side by side. The cell composes its chips directly rather than through `SegmentRun`: the run exists to divide a list with hairlines and lift the per-chip cap, and a boxed chip needs neither — it already has an edge, and it caps itself. Both are still chip shapes, so C-2a's structural point stands.
- **F-1 · the narrower could not be sync.** The spec read that every predicate the Directory needs is pure string work. `validPropertyDir` is — but it takes the **asset root** as an argument, and that comes from `readWatchScope(root)`, which is a read. So `defEditOp` grew an optional async `check` that runs before `editProperty` and refuses without writing, rather than the sync narrower doing the work. F-1's substance — no new channel for the set path — holds.
- **F-1c · the browse half took a parameter, not a sibling channel.** The spec called for one sibling channel mirroring `assets:chooseDir`'s shape. The two scopes differ by a starting folder, a message and a validator, which is an argument's worth of difference against a twin's bridge entry, preload binding and dialog — so `assets:chooseDir` takes a `scope` instead, and later an `at` so the dialog opens where the property already points. Fewer channels, which is what F-1's own principle asks for.
- **Task 18 · the pane's own allow-list had to open too.** The task named `sort.ts` alone, and the engine's `case 'file'` was the whole of what it described — but `SortingPane`'s `SORTABLE_PANE` set is the only door to a sort criterion (no column-header menu offers one), and it did not carry `file`. The arm would have shipped correct and unreachable. `file` joins the set and the text direction pair, so its Order reads **A → Z / Z → A** rather than Ascending/Descending. The pane's test asserted the exclusion in as many words; the behavior changed, so the assertion is inverted rather than removed.
- **Task 18 · the extraction is `fileName`, and it is the only one.** `pipeline/value.ts` is where the plan puts it, so `filePick.ts`'s `fileLabelText` — the same parse, written a phase earlier for the label — is deleted rather than left standing beside it. Sort, the cell label and the deferred `Contains` filter read one function.
### Lessons

Routed to `.claude/Guidelines/`:

- **`Data-Layer.md`** — a path normalizer that drops empty segments does not drop `..`, and containment belongs at the write seam so every caller inherits it.
- **`Adversarial-Review-Log.md`** — the three defects that survived every green gate, all one class: a mechanism built correctly and the thing that reaches it not. The unreachable sort, the hit test handed its anchor instead of its target, and a prop held for a consumer that arrived by another route.
- **`Cohesion-Rulings.md`** — `startsUnder` / `assetSubfolder` stay apart (proposed twice), and `FileLabel` / `FileChip` are two components on purpose.
### Sequenced After
- **Filename `Contains` filter** — `evaluateText` already exists; `FILE_OPS` just stops being `slot: 'none'`.
- **Naming an existing nexus file by completion** — adoption and reference-writing stay separate steps in Task 14 so this can write a reference without adopting.
- **OS drag-and-drop onto a cell** — a different event path from PommoraDND.
- **The asset-migration gap (spec F-9)** — covers already orphan on a custom→custom directory change. Belongs to the asset layer.

### Closeout

#### Delivery Claim

The `file` property type is complete — the last of the ten. Twenty-six commits, code-only **+758 −426, net +332** against an expected ≈+46, comments and tests excluded. Every phase's overrun is itemized in this Log and every one is the same shape: a seam the plan's own body called for and its estimate never priced. Nothing was re-authored, and the per-phase figures sum to the whole.

What is claimed, requirement by requirement:

| # | Claim | Where it is true |
| --- | --- | --- |
| 1 | A file value is a bare array of `[[Name.ext]]` strings; the legacy `[{ path }]` object reads null | `propertyValue.ts` · both YAML spellings of a hand-edit coerce back |
| 2 | `strict` refuses emptiness and non-strings only, never option membership | `propertyValue.ts` · the `file` case is deliberately not merged with `multi_select` |
| 3 | Values resolve in the **basename** domain; an unparseable value renders unresolved, never as a path | `assetUrl.ts` `resolveFileValue` |
| 4 · 4a | One adoption mechanism, exported and reachable as its own channel, carrying all five guards | `mutate.ts` `adoptFile` · `assets:adopt` |
| 4b | Replace never deletes bytes | proven by test against the filesystem, not by a parameter |
| 5 | A def-level Directory, validated for containment **and** indexability at both the set and the write | `assetRoots.ts` `validPropertyDir` · `defEditOp`'s async `check` |
| 6 | Both file components are chip **shapes** inheriting the removable chrome structurally; `SegmentRun` consumes one | `chip.css.ts` `chipPlain` / `chipFile` · `FileLabel.tsx` / `FileChip.tsx` · FilterPane's Location field moved |
| 7 | 23 `file-type-*` glyphs with six aliases, falling back to `file-chart-column` — always a glyph | `fileTypes.ts` |
| 8 | The value's area adds; a label replaces at that file's folder; the hover-× removes — one arm, four surfaces | `valueClick.ts` · `filePick.ts` · `usePropertyRows.ts` |
| 9 | Add File · Replace File · — · Remove File, with the clicked label riding the context | `cellMenu.ts` · `runFileMenuAction` |
| 10 | File leaves the column-style system; sort ranks by filename; presence filters stand | `columnStyles.ts` · `sort.ts` + `value.ts` `fileName` · `filter.ts` |
| 11 | Nothing opens the file in-app; `file:open` is retired at all three layers | zero hits, against a control of 868 |
| 12 | Every falsified document is reconciled | `8be13cc8` · `950c2894` (DesignSystemPM) · `3f08e6cb` (ConnectionsPM) |
| 13 | TableView's raw-path text editor is removed, not adapted | the dialog is the only authoring surface |
| 14 | The rename-cascade immunity is recorded as an invariant | `ConnectionsPM.md` §The Rename Cascade |

**What is not claimed.** The end-to-end acceptance criterion has not been observed running — it needs a Collection with a file property whose Directory names a subfolder and real files on disk, and Nathan verifies that himself. Every claim above is grounded in code read or a test watched pass; none rests on the feature having been used.

**What the gates say.** `npm run typecheck`, `npm run test` (3570) and `npm run lint` all exit 0, read directly. Every red seen during execution was attributed to the parallel session's in-flight work before it was dismissed.

**Deliberately out of scope**, as specified: thumbnails, byte deletion, editor-body embeds, OS drag-and-drop, the filename `Contains` filter, and `migrateAssets`. The `Contains` filter is one flag away — `fileName` is already the extraction it needs.

**One thing is open and it is Nathan's**, recorded rather than absorbed: the settings pane's `minHeight={245}` floors both slider slots, so the File editor's short body leaves dead space beneath it. It is a shared knob, not this feature's.
