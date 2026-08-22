## File Properties — Decision Log

### Frame

- **Purpose:** Make the `file` property type a real, usable property — a page holds one or more uploaded files, named the way every other reference in the nexus is named, shown as a formalized FileLabel, and reachable from the table, the cards, and the two inspector surfaces.
- **Core Value:** A file attached to a page is legible on disk, resolvable without a database, and reachable in the operating system's own browser from the value that names it.
- **Success Criteria:** A file property can be filled, read, removed, and reached from every value surface; its on-disk value is a wikilink an outside tool can follow; nothing about it depends on a stored absolute path.

### Sources

- [[PropertiesPM]] — the type catalog, value shapes, the no-empties rule, and the per-view `column_styles` seam. Its **File / Attachment** row documents `{path, original_name, added_at, mime_type}`, a shape the code has never held — it is false today and must be replaced.
- [[ConnectionsPM]] — `[[Title]]` is body-only for the link graph; frontmatter connections are swept by the rename cascade.
- [[DesignSystemPM]] · [[SymbolsPM]] — the token atlas and the curated glyph registry FileLabel draws from.
- `Pommora/src/shared/properties.ts` — `propertyType` enum already carries `'file'`; `propertyDefinition` has no file-specific config.
- `Pommora/src/shared/propertyValue.ts` — `FileRef { path }`, `decodeValue`'s `file` branch, `isBlankValue`, `encodeValue`.
- `Pommora/src/shared/cellMenu.ts` — `baseCellMenu` returns `style-edit` for `file` unconditionally (`:87`), so a file cell is never `remove-only` — the comment at `:74` saying otherwise is stale and goes with the kind.
- `Pommora/src/shared/columnMenu.ts` · `columnStyles.ts` — the file column's `Filename` / `Full Path` looks and its `filename` default.
- `Pommora/src/renderer/src/Detail/Views/Table/Cell.tsx` — the file cell's chip run (`:187`); each chip calls `window.nexus.openFile(f.path)` (`:197`) and keys on `f.path` (`:190`). Its coverage is `Table/cellGestures.test.tsx:524`.
- `Pommora/src/renderer/src/Detail/Views/PropertyEditing/formatValue.ts` — `fileLabel` (`:184`), the filename/path formatter the retired look lives in.
- `Pommora/src/main/mutate.ts` — `adoptImageAsset` (`:120`) and its five guards; `dropReplacedAsset` (`:108`), which deletes with no reference census.
- `Pommora/src/main/assetRoots.ts` — `assetFileToDelete` (`:49`) scopes byte-deletion to `.nexus/assets/` only, so `dropReplacedAsset` is inert on a custom root and live on a default one.
- `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` — `editorInitial` / `commitEditorText` edit the FIRST ref's raw path as text.
- `Pommora/src/renderer/src/Detail/Views/Cards/CardValue.tsx` — `canFillBlank` excludes file; the click dispatch has no file branch.
- `Pommora/src/renderer/src/Detail/Views/pipeline/sort.ts` · `filter.ts` · `group.ts` — file sorts as text, filters on presence (`Has File` / `No File`), and is not groupable.
- `Pommora/src/renderer/src/Components/Detail/PagePropertiesPane.tsx` · `PagePreview/PreviewInspector.tsx` — both `revealAndEdit` paths return early on `file`.
- `Pommora/src/renderer/src/Components/Detail/PropertiesPane.tsx` — the per-type editor host; file has no editor branch.
- `Pommora/src/renderer/src/Components/Detail/PropertyTypes.tsx` — file is `creatable`, glyph `file-chart-column`.
- `Pommora/src/renderer/src/assetUrl.ts` — `resolveAssetValue` parses a whole-string `[[…]]` through `parseConnectionText` and resolves it against the asset map's basename domain.
- `Pommora/src/main/assetMap.ts` — the basename→paths map, built from a listing of the asset root and patched per watch event. Indexes **every** file under the root, not only images.
- `Pommora/src/main/assetWrite.ts` — `writeAssetFile` lands bytes under a disambiguated name and returns `[[Name.ext]]`. Extension-agnostic.
- `Pommora/src/shared/assetMime.ts` — `ASSET_MIME` / `IMAGE_EXTS`: the image-only gate, used by the `nexus-asset://` protocol and the picker's dialog filter.
- `Pommora/src/main/index.ts` — `pickImagePath` (filters to `IMAGE_EXTS`), and `file:open`'s `resolveUnderRoot` → `shell.openPath`.
- `Pommora/src/main/connections/scan.ts` — `frontmatterMentions` reads **string** values only; arrays are skipped entirely.
- `Pommora/src/main/connections/rewrite.ts` — `rewriteFrontmatterConnections` likewise patches string values only.
- `Pommora/src/renderer/src/Components/Chip.tsx` — `Chip`, `ChipLabel`, `ChipRemoveButton` and the melt/blur reveal machinery.
- `Pommora/src/renderer/src/design-system/components/SegmentRun/SegmentRun.tsx` · `segmentRun.css.ts` — the icon + label segment FileLabel is being drawn from.
- `Pommora/src/renderer/src/Settings/AssetDirectoryRow.tsx` · `pathRow.css.ts` — the folder-path field whose glyph tone and type FileLabel adopts.
- `Pommora/src/main/assetDirValidate.ts` — any in-nexus folder holding no content may be the asset directory.

### Decisions

#### A — On-Disk Shape

- **A-1a:** [confirmed] **An unquoted hand-edited wikilink is coerced back, not dropped.** YAML reads `- [[Report.pdf]]` as a nested flow sequence rather than a string, so whole-array validation would null every attachment on the page — silently, and the next in-app add would overwrite the references on disk. A single-element array holding a single string is YAML's reading of the intended spelling and is restored to it.
- **A-1:** [confirmed] A file property's value is a **bare array of wikilink strings** — `<Attachments>:` over a block sequence of `[[Name.ext]]`. Multi-select's shape, so YAML stays natively typed and legible.
- **A-2:** [confirmed] Resolution runs in the **asset map's basename domain** (`resolveAssetValue`), not the page-title domain a URL property's wikilink uses. The declared type picks the domain — the same "declared type decides" rule the value decoder already runs on.
- **A-3:** [confirmed] The legacy `[{ path }]` object shape is a **clean break** — an object-shaped value decodes to null and stops rendering, like any type-mismatched value. Only the raw-path table editor ever wrote it.
- **A-4:** [confirmed] Multiple files per value stay. The decoded kind is already a list, so the change is what the list holds — `FileRef[]` becomes `string[]`.
- **A-4a:** [confirmed] **`file` and `multi_select` must stay separate `decodeValue` cases**, even though the change makes them shape-identical and the merge looks free. `multi_select` is **option-gated under `strict`**, and `optionValues` on a file def returns `[]` — so a merged case drops every file value under strict. `strict` is the restore gate (`propertyValue.ts:9`), feeding `removeProperty`, `restoreProperty` and `restoreScrub`: the merge would mean **removing a file property and re-assigning it silently discards every page's attachments**, cache entries kept but never spendable. For `file`, `strict` refuses emptiness and non-strings and nothing else.
- **A-5:** [confirmed] `PropertiesPM.md`'s File row (`{path, original_name, added_at, mime_type}`) is replaced outright with the shipped shape. It describes fields the code never held.
- **A-6:** [confirmed] File wikilinks are **immune to the page-rename cascade** by construction: `frontmatterMentions` and `rewriteFrontmatterConnections` both read string values and skip arrays. This is correct — file names live in the basename domain — and is written down so nobody "fixes" it into a bug.
- **A-7:** [confirmed] File values create **no link-graph edges and no phantoms**. The connections scanner is body-only for the graph; frontmatter is swept for the rename cascade alone.

#### B — Storage & Adoption

- **B-1:** [confirmed] **One root.** Adopted files land under the configured asset directory alongside images — the map, the watcher patch, the disambiguator and the migration already cover every file type, and a second root would not buy a second namespace, since basename resolution is nexus-wide by design.
- **B-1a:** [confirmed] Each file property carries its own **Directory** field in its editor pane: the asset directory itself by default, or a **subfolder** under it. Property-wide def-level config, alongside `link_color` / `checkbox_color` / `number_family`.
- **B-1aa:** [confirmed] The Directory is **Core, not tidiness.** It is the destination an externally-uploaded file takes — the property's answer to "where does this land," which every adoption needs before it can write. A file property without one has no defined destination but the shared root, which is the behavior, not the feature.
- **B-1b:** [assumed] The subfolder is stored **relative to the asset directory**, not to the nexus root — so a property's folder is expressed as a position under whatever root is configured, and re-pointing the root re-points every property's folder with it. What that means for files already on disk is F-9's problem, not the storage shape's.
- **B-1c:** [assumed] The folder is created on demand at the first write (`writeAssetFile` already `mkdir`s recursively). Naming a folder that doesn't exist yet is a declaration, not an error.
- **B-1d:** [confirmed] Subfolders partition **where files sit**, never **how names resolve** — one basename namespace nexus-wide. `createDisambiguated` already refuses a name held anywhere under the root, so a second `Report.pdf` becomes `Report 2.pdf` regardless of which subfolder it is headed for.
- **B-2:** [confirmed] Adoption reuses **`adoptImageAsset`** (`src/main/mutate.ts:120`), not `writeAssetFile`. `writeAssetFile` is the inner byte-lander; every guard that makes an adoption safe lives in its caller, and routing around it loses all of them:
    - `underAssetRoot` — a file already under the root is **referenced in place**, never copied. D-1 opens the dialog *inside* the asset root, so this is the single most likely pick.
    - `bytes.equals` — a re-pick of the same file returns the existing reference instead of minting a duplicate.
    - `embeddableTitle` — a filename holding `|` or `]` is refused. Both are legal on macOS and both corrupt the reference: `Q3|draft.pdf` silently parses as title `Q3` with alias `draft.pdf`, and `Summary]].pdf` parses as nothing at all.
    - `neverWatched` — a dot-prefixed name is refused, because the map would never index it.
    - `AMBIGUOUS` — a name several files answer to is refused rather than authored.
- **B-2b:** [confirmed] **Adoption becomes a shared seam, and every existing adopter is hoisted onto it.** `adoptImageAsset` is module-private and reachable only from the `setBanner` arm's closure, so banners, the nexus icon, the profile image and the homepage/navview banners each sit on a mechanism nothing else can reach. It is extracted, exported, and consumed by all of them — the highest-level interface that consolidates the purpose, rather than a second copy beside the first.
- **B-2c:** [confirmed] **Byte-deletion on replace is the caller's policy, not the seam's.** A banner is one-per-entity and deleting its replaced file is correct; a file property is multi-value and multi-page, and the seam's own dedup means two pages can share one file. The seam takes the policy and defaults to keeping.
- **B-2d:** [confirmed] Adoption reaches main through **its own channel**, not by riding a field write. Fusing them would foreclose both named successors — a completion field and an OS drop each write a reference with no picked source to adopt. Its handler drains `pushAssetWrites()` itself, which riding `mutate` would have given it for free.
- **B-2a:** [confirmed] Exactly **one line** moves inside it: the `ASSET_MIME` extension gate becomes a per-property-type gate (images for banners, anything for a file property). The subfolder threads through as one argument to the `writeAssetFile` call at its tail. This is what B-3 was reaching for one function too low.
- **B-3:** [confirmed] `nexus:pickImage` takes an **options argument** rather than growing a twin — both gestures need `defaultPath` anyway (D-1 at the property's directory, D-2 at the picked file's folder), so the signature moves regardless. The `nexus-asset://` MIME table stays image-business: a file chip never goes through the protocol.
- **B-3a:** [confirmed] `defaultPath` is joined **in main** — the renderer only ever holds nexus-relative paths. And `pickedImagePaths.add` (`main/index.ts:730`) stays image-gated, or `nexus:imageData` opens to arbitrary picked files.
- **B-4:** [confirmed] Removing a chip clears the **reference only**; the bytes stay.
- **B-4a:** [confirmed] **Replace clears and rewrites the reference only — it never calls `dropReplacedAsset`.** That path (`src/main/mutate.ts:108`) `rm`s the replaced file with no reference census and no trash, which is safe for banners because they are one-per-entity singletons. A file property is the first **multi-value, multi-page** consumer, and B-1d plus `adoptImageAsset`'s dedup mean two pages picking the same source file share **one** file on disk. A byte-deleting Replace on page A would destroy what page B's `[[Report.pdf]]` names, unrecoverably. Reference-counting across every page's frontmatter is the only alternative, and it is a subsystem this feature has no reason to build.
- **B-5:** [assumed] An ambiguous basename (several files answering to one name) displays and opens the **first path by sort** — the display precedent. Opening the wrong file is recoverable; the delete-side refusal doesn't apply because nothing is deleted.
- **B-6:** [confirmed] A name nothing answers to renders as an **unresolved** chip rather than vanishing — the value is still in frontmatter and the user must be able to see and remove it.
- **B-6a:** [confirmed] A value that is **not a parseable wikilink also renders unresolved.** `resolveAssetValue` has a third branch the file path must not inherit: a bare, unschemed string returns `{ kind: 'asset', rel: raw }` — a **nexus-relative path**, resolved against the root rather than the basename index. Pommora is agentic-legible and NexusOS is a live Obsidian vault, so a hand-edit or an agent writing `- Report.pdf` under the key is an ordinary producer; without this, such a value renders as *resolved* while naming a file that isn't there, and Replace's `defaultPath` aims at a folder that doesn't exist. The shape is a small `resolveFileValue` running the wikilink branch alone — a variant, not an option parameter threaded through every image caller.

#### C — FileLabel

- **C-1:** [confirmed] FileLabel carries **no field chrome** — a leading glyph and a title, at the size and color the Asset Directory row's folder-path segments already wear. `SegmentRun` **is** that standard for directories and files alike.
- **C-1a:** [confirmed] The Asset Directory row needs **no rework**: it already consumes `SegmentRun` directly (`AssetDirectoryRow.tsx:62`), and its two distinguishing choices — one lead icon rather than per-segment glyphs, `nested` rather than flat — are documented as deliberate (`pathRow.css.ts:27`, `segmentRun.css.ts:62`). Its segments become FileLabels under C-2d like every other run's, but the row's own structure is untouched.
- **C-2:** [confirmed] A multi-file value is a **flat `SegmentRun`** of FileLabels — the established hairline divider between files, the same run the FilterPane's Location field already wears.
- **C-2a:** [confirmed] **FileLabel is a chip *shape*, not a borrower of chip parts.** It joins the shape map beside `chipPill` and `chipLabel` (`design-system/tokens/chip.css.ts`), so it inherits `chipRemovable`, `chipRemove` and the melt/blur reveal machinery structurally rather than importing `ChipRemoveButton` and re-deriving the reveal. That machinery carries deliberate guards against a Chromium repaint defect and is never authored in parallel.
- **C-2aa:** [confirmed] The shape is **chrome-less by design** — it wears `chipBase` (gap, `--chip-zoom`, control type) and the removable apparatus, but paints no fill and no border, so it reads as C-1's bare icon + title while still being a chip everywhere it matters.
- **C-2b:** [confirmed] `segmentRemoveSlot` and `segmentRemove` are **deleted, not hoisted.** They have exactly one consumer — the inline composition FileLabel replaces — and FileLabel inherits `chipRemove` structurally, so moving them would land dead code.
- **C-2f:** [confirmed] **The Location migration ships with this feature — twice adjudicated, not to be re-proposed.** A reduction pass flagged it as the plan's only Core over-scope, since no requirement needs FilterPane touched and deferring forecloses nothing. Nathan's ruling: the codebase is deliberately hard on stylistic cascading and tightening, so leaving FilterPane on the slot mechanism while FileLabel wears `chipRemove` means **two reveal recipes side by side** — the drift the hoist exists to end. A second mechanism kept for scope tidiness is the more expensive of the two costs.
- **C-2e:** [confirmed] Moving the FilterPane's Location chips onto FileLabel **changes their reveal geometry** (an elongating slot becomes an overlay on the chip's right third) and would truncate at `--chip-max: 80px`. The geometry change is accepted; **the cap is raised** on the Location run so no current Set title ellipsizes.
- **C-2c:** [confirmed] **FileLabel is a component**, in `design-system/components/`, so any surface can render one without going through a run. It owns the whole unit — extension glyph, label, and the optional hover-× — and is the app's standard rendering for a named file or folder.
- **C-2d:** [confirmed] **`SegmentRun` hoists to consume it.** Today every caller hand-assembles a segment's icon + label + trailing (`FilterPane.tsx:325` inlines exactly that). The run gains a chip-shaped entry option so it renders FileLabels itself, and FilterPane's Location field moves onto it. One composition, hoisted into the run, instead of each caller restating it — and FileLabel stays independently usable off a run entirely.
- **C-3:** [assumed] The glyph is chosen from the **extension**, through the Tabler `file-type-*` set, adopted the way `customGlyphs.tsx` already adopts Tabler at `TABLER_SCALE` — Tabler glyphs read smaller than Lucide at the same box, and that scale is what sits them evenly beside the curated registry.
- **C-4:** [confirmed] **Every** Tabler `file-type-*` glyph is mapped — the full 23: bmp, css, csv, doc, docx, html, jpg, js, jsx, pdf, php, png, ppt, rs, sql, svg, ts, tsx, txt, vue, xls, xml, zip. An extension Tabler has no glyph for falls back to **`file-chart-column`** — today's File property glyph (`PropertyTypes.tsx:30`), unchanged.
- **C-5:** [assumed] Common aliases route to their glyph rather than the fallback: `jpeg → jpg`, `htm → html`, `xlsx → xls`, `pptx → ppt`, `mjs`/`cjs` → `js`. An unmapped extension (`md`, `yaml`, `mp4`) takes the fallback.
- **C-6a:** [confirmed] The Directory field **reuses the Default Asset Directory row's styling verbatim** — `pathRow.css.ts`'s `pathField` / `leadIcon` / `input` / `browse` recipe, the `folder-closed` lead and the **`folder-open` browse glyph**. It is the same control aimed at a subfolder, not a lookalike.
- **C-6b:** [confirmed] The folder picker **creates as well as selects** — `createDirectory` alongside `openDirectory`, which `assets:chooseDir` already passes (`main/index.ts:972`). Naming a folder that doesn't exist is a first-class gesture, and B-1c's create-on-demand is its fallback, not its substitute.
- **C-6:** [confirmed] The Directory field in the File editor pane is a **FileLabel surface** — the same icon + title treatment the Asset Directory row wears, which is what C-1 means by "the standard for directories and files."

#### D — Interaction

Two click targets, two meanings. The **value's own area** grows the list; a **chip** addresses the one file it names. Every gesture routes through the native file dialog, which on macOS is a Finder browser — so "reveal its location" and "pick another" are the same window, and no separate reveal channel is needed.

- **D-1:** [confirmed] Clicking the **value's area** — an empty cell, the space around the chips, a card's value region — opens the file dialog at the property's configured Directory and **adds** the picked file to the value.
- **D-1a:** [confirmed] This is **one arm on `sharedValueClickAction`** (`PropertyEditing/valueClick.ts:18`), not four surface implementations. Its three consumers are exactly the surfaces in play — `TableView.tsx:705`, `CardValue.tsx:86`, and `usePropertyRows.ts:147`, the last serving **both** inspector panes. One new `ValueClickAction` arm plus one branch in the router covers the table, the cards and the two panes together.
- **D-2:** [confirmed] Clicking a **chip** opens the file dialog at **that file's own folder**, revealing where it lives. Picking something else **replaces** that chip; cancelling leaves the value untouched.
- **D-3:** [confirmed] `defaultPath` is what makes both gestures one mechanism — the dialog is the reveal. No `shell.showItemInFolder` channel is added, and `file:open` is no longer on any file-property path.
- **D-3a:** [confirmed] **Nothing opens the attached file in its default app.** Today a chip click calls `window.nexus.openFile`; under D-2 that gesture becomes the replace dialog, and the capability is dropped rather than relocated. A file property locates and swaps files; opening one is the operating system's job, from the browser the dialog already puts the user in. `window.nexus.openFile` has **exactly one** production caller — the file chip at `Table/Cell.tsx:197` — so D-2 orphans the whole channel: `'file:open'` in `bridge.ts`, `openFile` in `preload/index.ts`, and the handler in `main/index.ts`. **The channel is retired in the same pass**, along with its `cellGestures.test.tsx` coverage, rather than left as three dead files.
- **D-4:** [confirmed] The value's right-click menu is **Add · Replace · — · Remove**. No Rename and no alias: a file value is the name of a file, not a link with words of its own.
- **D-4a:** [assumed] Replace and Remove address the **chip that was right-clicked**, while Add addresses the value. A right-click landing on the value's area rather than a chip therefore offers **Add alone** — there is no file for the other two to act on.
- **D-4c:** [confirmed] `CellMenuAction` (`cellMenu.ts:39`) is a **payload-less string union**, so "which chip was right-clicked" cannot ride the action — it rides the **context**, threaded from the hit test through both Table and Cards. The file kind becomes `{ kind: 'file'; onChip: boolean }`, which is still a net deletion against the `style-edit` kind it replaces.
- **D-4b:** [assumed] The menu replaces the file cell's current `style-edit` kind outright (Style radios + Edit), which E-1 and E-2 leave with nothing to show anyway. On cards it still ends with the trailing **Remove** that drops the property from the view — a different Remove from the menu's own, and the two must not be spelled the same in the model.
- **D-5:** [confirmed] The Page Properties pane and the Preview Inspector get file rows this pass. Under D-1a this is a pair of **deletions**, not additions: `PagePropertiesPane.tsx:148` and `PreviewInspector.tsx:117` each drop their `if (def.type === 'file' …) return` and inherit the shared arm.
- **D-6:** [confirmed] TableView's raw-path text editor for file values (`editorInitial` / `commitEditorText`) is **removed**, not adapted. Typing a path is the wrong authoring gesture once the value is a wikilink, and the dialog is the only authoring surface now.
- **D-7:** [confirmed] There is **no `+` affordance**. Adding is the value area's own click, so the gesture needs no chrome of its own.
- **D-8:** [confirmed] The hover-× stays on each chip as the direct remove, alongside the menu's Remove. The Asset Directory row keeps its **nested** run (path segments, `›` chevrons); a file value takes the **flat** run (hairline dividers between separate files) — `nested` is exactly the fact that distinguishes them: a path descends, a file list stands beside itself.

#### E — View Pipeline

- **E-1:** [confirmed] File leaves the **column-style system entirely** — not "one look left," which would be dead config. Deleted outright: `columnMenu.ts`'s `case 'file'`, `defaultStyleFor`'s file case, `'filename'` and `'path'` from `COLUMN_LOOKS` (both file-only, no other consumer), and `fileLabel` in `formatValue.ts` with its test. Both menu builders already gate the Style submenu on `rows.length > 0`, so it hides itself with no further work. The label is now the wikilink's parsed title.
- **E-2:** [confirmed] With one look left, the file cell menu's Style submenu goes with it. What remains is D-4's Add · Replace · Remove.
- **E-3:** [assumed] Sort extracts the **parsed filename**, not the raw `[[…]]` text, so bracket characters never lead the sort key.
- **E-4:** [assumed] Filter stays presence-only (`Has File` / `No File`). A filename `Contains` operator is a Prospect.
- **E-5:** [confirmed] File stays **non-groupable** — nothing to do in `group.ts`.

#### F — Sweep Findings

Run against `references/dont-forget-sweep.md`; the design is both interactive and structural.

- **F-1:** [confirmed] **Validation rides `defEditOp`'s sync narrower — no new channel.** Every predicate the Directory needs is pure string work: `rootSegs` (`exclusion.ts:27`), `neverWatched` (`exclusion.ts:9`), and `indexable` (`assetMap.ts:25`) composing the two; the `..` refusal is lexical (`pathSafety.ts:35` runs it as a no-fs fast path). `validateAssetDir`'s one async check — `holdsContent` — cannot apply by construction: a subfolder of the asset root is already inside the pruned zone, so "does this hold pages" has no meaning for it, and B-1c's create-on-demand removes the `stat` too. The Directory therefore sets exactly like `link_color` and `number_family` (`main/index.ts:640`, `:653`).
- **F-1a:** [confirmed] Two predicates, not one. Containment alone is insufficient: a Directory of `.private` passes `resolveUnderRoot`, `mkdir`s, writes, and returns a valid-looking `[[Name.ext]]` — while `indexable` drops it from the map forever, leaving an unresolved chip and no error anywhere. The validator asks **both**.
- **F-1c:** [confirmed] The **set** path needs no channel (F-1); the **browse** half does. `assets:chooseDir` bakes in `defaultPath: root`, its own message, and `validateAssetDir` — none of which fit a subfolder-of-the-asset-root scope. One sibling channel, mirroring its shape.
- **F-1b:** [assumed] The one hole a lexical check leaves is a symlinked segment escaping the root. The backstop is a single `resolveUnderRoot` on the joined directory **at adoption time** in `mutate.ts`, where async is free and where the write actually happens — rather than an async validator at set time.
- **F-2:** [confirmed] **Compatibility is free.** `columnStyle.look` is `z.enum(COLUMN_LOOKS).optional().catch(undefined)` (`columnStyles.ts:47`), so dropping `'path'` from the array *is* the compatibility story — a stored value catches to `undefined` and falls to `defaultStyleFor`. This is the same mechanism the file's own comment documents for the retired `title`/`full` link looks. No formatter branch survives to provide it.
- **F-3:** [confirmed] **Idempotency is inherited, not designed.** Picking the same source file twice returns the **existing** reference — `adoptImageAsset` compares bytes against the file the name already resolves to (`src/main/mutate.ts:143`) and a file already under the root is referenced where it sits. Duplicate copies would only appear if adoption were built on `writeAssetFile` directly, which B-2 now forbids.
- **F-4:** [assumed] **Failure recovery.** A cancelled picker writes nothing; a failed adoption returns a `Result` failure and the value is unchanged. No partial state — the reference is written only after the bytes land.
- **F-5:** [assumed] **Interaction, nested click targets.** A file cell holds three: the value's area (add), each chip (replace), and each chip's × (remove). The × stops propagation inside the chip, and the chip inside the cell — so one click can only ever mean one of the three. `ChipRemoveButton` additionally gates its click on its own computed opacity, so an un-revealed × falls through to the chip's replace rather than silently deleting.
- **F-6:** [assumed] **Interaction, inverses.** Add ↔ Remove; Replace ↔ cancel the dialog. A hover-revealed × stays reachable because the reveal is keyed on the *segment's* hover, not the ×'s own — moving toward it never dismisses it.
- **F-7:** [assumed] **Persistence.** Removing the last file clears the key outright — `isBlankValue` already treats an empty array as blank, so the no-empties rule needs no file-specific handling.
- **F-8a:** [confirmed] **Chip identity.** `Cell.tsx:190` keys each chip on `f.path`; under `string[]` two identical entries — a hand-edit, a sync merge — collide as React keys and the hover-× addresses the wrong one. Keyed on index, or deduped at decode.
- **F-8:** [confirmed] **Changing a property's Directory governs new writes only.** Files already on disk stay where they are and keep resolving — a value names a basename, not a folder, so nothing breaks by standing still. A mover would need the migration's whole safety apparatus to buy tidiness.
- **F-9:** [confirmed] **A pre-existing gap this inherits, and does not widen in kind.** `migrateAssets` walks six single-value stores (navigation, settings, homepage, folder sidecars, page `cover`) and moves only what still sits under `.nexus/assets`. It has never followed a directory change from one custom folder to another — covers orphan today in exactly that case. File-property values will behave identically. The fix belongs to the asset layer, not to this feature.

### Core (must-have)

- The wikilink value shape, decoded and encoded by declared type.
- Adoption from a native picker into the configured directory.
- FileLabel, extension glyphs, and the hover-× remove.
- The File editor pane, carrying the Directory field.
- Table cells and Cards values: the value's area adds, a chip replaces, the × removes.
- The two inspector surfaces rendering and editing file rows.
- Sort on filename; presence filters; the retired Full Path look and Style submenu.
- The Add · Replace · Remove value menu.
- `PropertiesPM.md` reconciled.

#### Prospects (allowed later, not now)

- **Filename `Contains` filter** — deferred; the text matrix already exists (`evaluateText`), so the value cell just needs to stop being `slot: 'none'`.
- **Naming an existing nexus file by completion** instead of picking one from the OS — the asset map is already a basename index, so the completion source exists. Don't-foreclose: keep adoption and reference-writing as separate steps, so a completion field can write a reference without adopting anything.
- **Drag-and-drop onto a cell** — PommoraDND is in-house and file drops from the OS are a different event path.
- **Inline file embeds in the editor body** — a separate surface with its own syntax question.

#### Out of Scope (won't do)

- A thumbnail or preview of the attached file — the chip names a file; it does not render one.
- Deleting the bytes when a reference is removed.
- **Teaching `migrateAssets` to follow a directory change between two custom folders** (F-9) — a pre-existing characteristic of the asset layer that covers already share. Fixing it here would mean rebuilding the migration under a feature that didn't cause the gap.

#### Considered & Rejected

- **A name-completion field over the asset map, in place of the OS picker** — attaching would read as writing a connection rather than uploading, which is closer to what the app is. Genuinely tempting and grounded (the map is already the autocomplete source), but it makes the common case — a file that isn't in the nexus yet — the awkward one. Parked as a Prospect rather than dropped: the picker and a completion field can coexist, and the field is the better *second* gesture.
- **Keeping `[{ path }]` objects** — rejected: a stored path breaks the moment the asset directory setting moves, and it is illegible next to every other reference in the nexus, which is a wikilink.
- **Resolving file wikilinks in the page-title domain** — rejected: it would put `Report.pdf` in the same namespace as page titles and drag file values into the rename cascade.
- **Lucide family glyphs (`file-code`, `file-image`, `file-spreadsheet`, `file-archive`) in place of the 23 Tabler per-extension ones** — ~16 lines against ~50, and it would delete the alias map, since `jpg`/`jpeg`/`png`/`svg` all land on `file-image` by family. Rejected by Nathan: a `.ts` and a `.tsx` reading as one glyph loses the distinction the chip exists to make. Per-extension is the point.
- **Deferring the Directory field to Prospects** — the reduction pass argued eight decisions and ~+120 lines for on-disk tidiness. Rejected: it is the destination an externally-uploaded file takes, so adoption has nothing to answer with until it exists (B-1aa).
- **A hairline-field FileLabel** — rejected by Nathan: extra chrome inside a table cell, and it would read as a field rather than a value.
- **A `+` affordance for adding a second file** — rejected once the value's own area became the add gesture. An affordance for something the surrounding click already does is chrome earning nothing.
- **A per-value alias (`[[Report.pdf|Q3 Numbers]]`)** — rejected by Nathan, though the wikilink grammar carries it and URL properties use it. A file value is the name of a file; giving it separate display words would make the chip stop naming what it opens.
- **`shell.showItemInFolder` as a reveal channel** — rejected: the file dialog opened at `defaultPath` reveals the location *and* returns a pick, so a reveal-only channel would be a second mechanism doing less.

### Lessons

- **One gesture beat three surfaces.** The reveal, the add and the replace looked like three features needing three affordances; the native dialog's `defaultPath` collapsed them into two clicks and killed a channel, a `+`, and a menu verb. Reach for what a platform control already does before designing chrome around it.
- A half-scaffolded type reads as an empty one. `file` already carried a menu kind, two column looks, filter operators and a sort branch — the work is reconciling what exists, not building from nothing.
