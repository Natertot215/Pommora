### Pommora History Index

| Date               | ID     | Entry                                       |
| ------------------ | ------ | ------------------------------------------- |
| 08-08-2026         | PM-025 | Write-Path Docstrings Catch Up To The Code  |
| 08-08-2026         | PM-005 | The JSON Write Primitive Takes Its Lock     |
| 08-08-2026         | PM-026 | The Dead-Code Floor Under The Write Path    |
| 08-08-2026         | PM-004 | One Lock Per File, One Instance Per Nexus   |
| 08-08-2026         | PM-003 | Dropdown Shell & Menu Consolidation         |
| 08-07-2026 → 08-08 | PM-002 | One Shared Pass Over Fenced Code            |
| 08-08-2026         | PM-001 | The Page Outline                            |
| 08-06-2026 → 08-07 | PM-027 | The PageMenu And The In-App Picker          |
| 08-06-2026         | PM-006 | Pointer Handler Logic Unification           |
| 08-06-2026         | PM-007 | Table Geometry And The Marker Rules         |
| 08-05-2026         | PM-008 | The Connection Hover Card                   |
| 08-04-2026 → 08-05 | PM-028 | Four Consolidations Off The Debt Ledger     |
| 08-04-2026         | PM-009 | Table Border Append Strips                  |
| 08-04-2026         | PM-010 | Type-Specific Codeblocks                    |
| 08-03-2026 → 08-04 | PM-011 | Embedded Pages                              |
| 08-03-2026         | PM-018 | Display Math And List Wrapping              |
| 08-02-2026         | PM-012 | Hidden Groups                               |
| 08-01-2026         | PM-013 | The NexusRecord                             |
| 07-31-2026         | PM-014 | Identity Goes Kind-First                    |
| 07-30-2026         | PM-029 | The Band-Seam Law                           |
| 07-30-2026         | PM-015 | ActionBand And The Per-View Color           |
| 07-30-2026         | PM-016 | The Tree Index                              |
| 07-30-2026         | PM-017 | The Bridge Map                              |
| 07-30-2026         | PM-030 | One Fence Scan For The Editor Chrome        |
| 07-29-2026 → 07-30 | PM-031 | The Erasure Campaigns                       |
| 07-29-2026         | PM-024 | Six Hand-Rolled Borders Take One Token      |
| 07-29-2026         | PM-032 | Sidecar Writes Take One Strict Primitive    |
| 07-28-2026 → 07-29 | PM-033 | Property Values Take Name-Keyed Frontmatter |
| 07-29-2026         | PM-023 | One Source For The Spectrum                 |
| 07-28-2026         | PM-034 | Operational State Leaves The Filesystem     |
| 07-27-2026 → 07-28 | PM-022 | One Owner Per IPC Shape                     |
| 07-27-2026         | PM-021 | The Feature Docs Audited Against The Code   |
| 07-27-2026         | PM-020 | The tierN Compatibility Surface Comes Out   |
| 07-26-2026 → 07-27 | PM-035 | The FilterPane Returns                      |
| 07-25-2026         | PM-019 | Lint And Accessibility Reach Clean          |
| 07-25-2026         | PM-036 | The Settings Window And The Dangle Sweep    |
| 07-25-2026         | PM-037 | PreviewPane Absorbs Both Floating Windows   |
| 07-24-2026         | PM-038 | The Docs Stop Describing The Tier Era       |
| 07-22-2026 → 07-23 | PM-039 | Contexts And Spaces Replace The Three Tiers |
| 07-20-2026 → 07-21 | PM-040 | One Vault Walk Per Structural Mutation      |
| 07-18-2026 → 07-20 | PM-041 | Cards — The First v0.6.0 Renderer           |

#### PM-025 || Write-Path Docstrings Catch Up To The Code
**DATE:** 08-08-2026

Docstrings in `main/io/propertiesRegistry.ts`, `main/appConfig.ts`, and the re-entrancy tests described what the code had stopped doing, and `updateAppConfig`'s was wrong about the mechanism besides — unmodeled keys survive through the overlay rather than through the mutator seeing a raw object. `main/io/fileLock.ts`'s header lost its consumer inventory and its import restatement while keeping the key-spelling rule, the deadlock explanation, and the fact that the refusal precedes the chain read. The contexts-registry concurrency test moved into the module it exercises, dropping an aliased import and a setup line its destination already performs, and `main/menu.ts` collapsed a ternary the read expresses directly along with an optional chain that could no longer be undefined. The per-acquisition Set allocation and `updateAppConfig`'s cast stayed, with reasons recorded. → [[ArchitecturePM]]

- **Commits:** `416f3d55`
- **Diff:** Net −7 | +21 / −28

#### PM-005 || The JSON Write Primitive Takes Its Lock
**DATE:** 08-08-2026

`rmwJsonStrict` in `main/io/atomicWrite.ts` now wraps its read-merge-write in the per-file chain, keyed on the path it writes; the seven callers that had been supplying that lock by hand came out in the same commit, and the two writers of `.nexus/state.json` that never supplied it became covered. `rewritePageSerialized` moved out of `io/fileLock.ts` to sit beside the writers it composes, which left the lock module importing nothing. The property registry's private promise chain retired onto the shared per-path mechanism its sibling registry already used, and `updateAppConfig` replaced two read-then-overwrite pairs with a single owner that merges onto the raw record, so a key the current version does not model survives a write. `serializeOnFile` gained a refusal for a re-entrant take of a held key, which had been able to wedge a file for the life of the process. The change was made for cohesion; no defect prompted it. → [[ArchitecturePM]] · [[ConfigurationPM]]

- **Commits:** `c421b686^..119278e1`
- **Diff:** Net +1 | +174 / −173

#### PM-026 || The Dead-Code Floor Under The Write Path
**DATE:** 08-08-2026

`shared/record.ts` lost `BaselineDiff`, `diffBaselines`, `isEmptyDiff`, and the `readDrift`/`writeDrift` pair with their tests, and `main/record.ts` shed the matching `diffable` helper. `main/connections/scan.ts` dropped `scanConnections` and its `ScannedConnection` type along with the `codeMask` and pattern imports only it used, and `shared/schemas.ts` dropped the unread `spaceSidecar` extension. Type imports and refusal paths across `crud/contextWrite.ts`, `crud/page.ts`, `crud/views.ts`, `crud/folderEntity.ts`, `contextsRegistry.ts`, `paths.ts`, and `shared/result.ts` narrowed to what remained. `main/provenance.ts`'s restore surface is marked parked rather than dead, since it is reachable over IPC and waiting on a browsing surface. → [[ArchitecturePM]]

- **Commits:** `8f9267e2^..1f034d1a`
- **Diff:** Net −107 | +66 / −173

#### PM-004 || One Lock Per File, One Instance Per Nexus
**DATE:** 08-08-2026

Every writer of a container sidecar was brought onto one lock key, built in `main/paths.ts` and applied through `withSidecarLock`, replacing three different keys and several call sites that held none — a read-merge-write that had read before a sibling's write landed could revert a view save or a page move with no error on either side. `relocatePage` was placed under the source path's key and `updatePageBody`'s existence check moved inside its own lock, closing a rename race that left a ghost file at the vacated path holding newer content than the renamed one. A move followed by a failed order write now reports success, since the relocation has already committed and order falls back to title. `main/index.ts` gained a single-instance lock: a losing launch exits, and a relaunch raises the window that already exists. → [[ArchitecturePM]] · [[PagesPM]]

- **Commits:** `fea330d2^..277655c8`
- **Diff:** Net +78 | +229 / −151

#### PM-003 || Dropdown Shell & Menu Consolidation
**DATE:** 08-08-2026

`MenuDropdown` was added to the design system to hold the open state, outside-dismiss, retract beat, and mounted-pane branch that `ViewDropdown`, `SpaceDropdown`, and `OutlineDropdown` had each carried separately, and `viewDropdown.css.ts` was renamed `toolbarDropdown.css.ts` after serving all three under the name of one. `MenuSurface` stayed state-free, because the toolbar trio shares one dismiss region across two panes and owns that state itself. `containerCreators` in `shared/mutate.ts` became the single rule for what a Collection or a Set offers on creation, correcting a sidebar context menu that gave a Set only New Page and two creator labels written as literals where every other one resolves the per-nexus label. Two constants in the menu layer described a reach they never had and were corrected rather than made true; no values moved. → [[DesignPM]] · [[CollectionsPM]]

- **Commits:** `99559630^..b43d3a45`
- **Diff:** Net +37 | +216 / −179

#### PM-002 || One Shared Pass Over Fenced Code
**DATE:** 08-07-2026 → 08-08

A fenced block's marker-run length became part of its identity, so a closer requires a run at least as long as its opener and carries no info word of its own, which lets a longer fence hold shorter ones as literal content. The fence grammar and its pairing pass moved into `shared/markdownCode.ts`, replacing four independent implementations across the detector, the folding scan, the subfield statistics, and the write-side mask — the mask's disagreement had left a `[[Title]]` inside a code sample reachable by a rename cascade. `isInsideCode` stopped delegating to `codeMask` and now scans only the offset's own line for inline spans, while `tokenize` and `tableRegions` moved to the build-once form the module's contract already documented. On a 941-line body a keystroke costs 0.043ms where it had cost 0.158ms, the saving scaling with document length rather than sitting fixed. → [[MarkdownPM]] · [[ConnectionsPM]]

- **Commits:** `352ba5c5` · `dab1c2b5`
- **Diff:** Net +84 | +194 / −110

#### PM-001 || The Page Outline
**DATE:** 08-08-2026

A toolbar dropdown was added that lists a Page's headings as a nested tree and travels to a chosen heading, opening any collapsed section on the way and seating the heading where the page's own inline title reads. The heading derivation was extracted from `MarkdownPM/editor/folding.ts` as a shared `scanHeadings`, so the outline and the fold chevrons resolve one fence-aware scan while keeping their different rules about headings with no body. `scrollGlide` joined `design-system/interactions/autoscroll.ts` as the application's first animated scroll, re-reading its destination each frame so CodeMirror's estimated block heights resolve into the motion rather than into a correction at the end. Three shared mechanisms were corrected underneath it: nested disclosure rows gained truncation, the disclosure primitive gained a default-open seam, and the viewport tokenizer now opens its slice at a block boundary rather than inside a fence. → [[PagesPM]] · [[MarkdownPM]]

- **Commits:** `7c87eb28`
- **Diff:** Net +454 | +516 / −62

#### PM-027 || The PageMenu And The In-App Picker
**DATE:** 08-06-2026 → 08-07

`Components/Detail/PageMenu.tsx` gained the Page scope that `viewSettingsScope` had always resolved to an empty spacer, opening on the Page's identity — the shared inline header, its glyph over the icon picker beside a click-to-edit title. A new `Components/Detail/PagePropertiesPane.tsx` renders the Contexts and property values a Page holds through the same primitives the table, cards, and preview inspector compose, so no second way to write frontmatter exists; a row's menu carries Clear beside Remove, where Clear empties the value and leaves the row and Remove takes the row away, and neither touches the schema. Three native row menus — the Space header's Change Color, the ViewSettings ⋮, and the per-view row menu — converted to the in-app picker, deleting `main/viewItemMenu.ts`, `main/viewRowMenu.ts`, their bridge channels, and `shared/viewMenus.ts`; the in-app form costs no round-trip through the file-owning process and cannot collide with the editor menu that process pops over any editable target, which is why the Space header's menu had been carving a dead zone over its own title. `design-system/components/PickerMenu/PickerMenu.tsx` gained a point anchor, and `ViewEmbedBlock`, `SpaceSettings`, `PreviewInspector`, and `ViewPane` route through that one entry point, retiring two hand-rolled marker spans that had been positioned inside a transformed track and were never in viewport space at all. `nativeCaret.ts`'s out-of-view guard changed from containment to intersection, closing a missing caret on the page's inline title, and `Components/Detail/PaneSlider.tsx` stopped painting a settled off-screen slot, closing a hairline on every drilled pane. → [[PagesPM]] · [[ViewsPM]] · [[InteractionPM]]

- **Commits:** `798aa86b^..487236c7`
- **Diff:** Net +655 | +906 / −251

#### PM-006 || Pointer Handler Logic Unification
**DATE:** 08-06-2026

`blockHandles.ts`'s grip hover read a rect and ran a hit-test on every pointer move; it now leads with one cached content-column edge that answers the common case in a single comparison. `ConnectionHoverCard.tsx`, `DetailPane.tsx`, `useOptionReorder`, and `useStatusReorder` stopped re-measuring geometry that holds still between scrolls and resizes, and both reorder hooks gained the unmount cleanup they never had, closing a listener leak that outlived every drag started in a pane that then closed. `listDrag.ts` took the Escape abort its sibling already had, and the scroller resolution both editor drags had copied verbatim moved into `autoscroll.ts`. The drag family was otherwise left as it stood: seven surfaces already ride the shared pointer skeleton, three stay hand-rolled by design, and MarkdownPM's list and block drags are close enough to pure CodeMirror logic that the skeleton would absorb about a tenth of each. → [[InteractionPM]] · [[PommoraDND]]

- **Commits:** `e3b001d1`
- **Diff:** Net +52 | +102 / −50

#### PM-007 || Table Geometry And The Marker Rules
**DATE:** 08-06-2026

`TableView.tsx`'s geometry effect keyed on the table model's identity, so a cell keystroke rebuilt that model and re-read a rect for every column and every row; it keys on the table's shape now and leaves reflow to the observer, with `StaticCell` memoized on its text so one cell's typing stops re-rendering the rest. `LIST_MARKER_RE` narrowed to `-` and `+`, the two characters carrying render branches, which took `*` and `•` out of the drag-and-renumber layers. `blockquotePrefilter` gained the line's end as a valid terminator, so a bare `>` reads as the quote's own blank line rather than a paragraph splitting the box into three. `sidebarDnd`'s drop indicator stopped drawing over slots flagged as no-ops, and `subfieldStats`, `tableDnd`, and both reorder hooks took the same marker set and drop guard their siblings had. → [[MarkdownPM]]

- **Commits:** `c2f40989^..7445c4e7`
- **Diff:** Net +52 | +90 / −38

#### PM-008 || The Connection Hover Card
**DATE:** 08-05-2026

Resting on a resolved `[[Connection]]` opens a compact read-only preview of the target page through the shared embed framework, without its banner or inline title. The card anchors to the live link with the pane's beak sliding to keep pointing at it, and holds glance-only interaction — content scrolls, headings fold on click, and the caret never enters. It resizes from its right edge, bottom edge, and corner to a single per-machine-remembered size, and the Settings ▸ Pages slider sets how long it lingers after hover-off. Resting table cells raise the same card through the intent delay the editor's own links use. `ConnectionHoverCard` became one app-level mount rather than one per link, a click consumes a pending intent, and navigation closes an open card. → [[MarkdownPM]] · [[ConnectionsPM]]

- **Commits:** `71b423c1^..d6aba1d0`
- **Diff:** Net +510 | +594 / −84

#### PM-028 || Four Consolidations Off The Debt Ledger
**DATE:** 08-04-2026 → 08-05

`Components/RenamableLabel.tsx` took the editing swap, the shared commit guard, and the caret policy that seven call sites had each rolled by hand — titles open caret-at-end, tree and pane rows open selected whole — with `RenamableTitle` thinning to the store-driven path wrapper. `PagePreview/PreviewInspector.tsx` began reading the warm path-keyed detail slot `PageEmbed` already fills, so a preview window fetches its page once and a warm hit skips the blank frame. `design-system/useExitPresence.ts` derived its exit window from the motion tokens rather than a decoupled constant. The table's Format row, its footer branch, the unwired Compact density comments, and the orphaned layers-2 glyph came out of `Components/Detail/ViewSettings.tsx`, `Table.css`, `table-tokens.css`, and `design-system/symbols/index.tsx`, leaving `format` as the cards density field alone. → [[DesignPM]] · [[TableViewPM]]

- **Commits:** `f898d3db^..fe0a7fa6`
- **Diff:** Net +37 | +134 / −97

#### PM-009 || Table Border Append Strips
**DATE:** 08-04-2026

Hovering a table reveals two rounded append strips — one at table height on the right edge adding a column, one at table width below adding a row — both appending at the end through the structural-edit path, so a mounted cell editor and the caret never move. The same change settled a rendering seam: a static cell now draws the line box for its trailing line break, where it had rendered one line shorter than its own editor and jumped taller on click-to-edit. → [[MarkdownPM]] · [[TableViewPM]]

- **Commits:** `8b493f10`
- **Diff:** Net +98 | +103 / −5

#### PM-010 || Type-Specific Codeblocks
**DATE:** 08-04-2026

Fenced code gained a curated typed-language set — JSON, YAML, JS/TS, CSS, HTML, and Swift — receiving a real parse whose tokens color as spectrum pastels, each mixed toward system white through one stylesheet formula, while a bare fence keeps the plain mono look by design. The backticks always show; a typed block hides only its info word and wears its language top-right as a `<TYPE>` glyph in the code color, and seating the caret on the fence line trades that chrome back for the raw info word. A per-nexus Show Line Count In Code Blocks setting numbers a block's content lines as non-editable chrome at the first-character position. Code wraps as an editor does, with rows filling to the block's edge and continuations returning to the code column, the row numbers carrying the distinction. → [[MarkdownPM]]

- **Commits:** `179a3867^..9fc6c6f9`
- **Diff:** Net +299 | +380 / −81

#### PM-011 || Embedded Pages
**DATE:** 08-03-2026 → 08-04

Typing `![[Title]]` on its own line turns it into a live tile of that page — Obsidian's own syntax, so a Nexus keeps reading outside Pommora — making the shared Embed Framework's second consumer. The claim has exactly one owner that every layer reads: an atomic absorb hops the caret over the tile, interior damage refuses whole, boundary insertions repair onto their own line, and the lone-line guard makes every reachable caret seat harmless. Chrome is the shared tile chassis, with the banner parking on the tile's own scroll exactly as a full page header does and the preview's crumbs serving as the hover breadcrumb; creation runs through the `![[` autocomplete, and the rename cascade sweeps embeds without an embed ever becoming a link-graph edge.

**Height and Warm State:** Tiles took a bottom-edge resize through SurfacePM's south-edge gesture, persisted per host page and target in `nexus.db` as a per-machine viewing preference rather than page content. A tile's own scroll, caret, and undo survive host interaction through a session-scoped cache keyed by the full host chain, and a re-slotted editor restores the scroll position the browser zeroes during the host's measure phase. → [[MarkdownPM]] · [[PagesPM]]

- **Commits:** `3cdaf70a^..c44c0537`
- **Diff:** Net +1540 | +1729 / −189

#### PM-018 || Display Math And List Wrapping
**DATE:** 08-03-2026

Multi-line `$$…$$` spans holding a blank line had split into two paragraph blocks in `editor/blockModel.ts`. A new `editor/mathRanges.ts` pairs lone `$$` lines the way fences pair and is read by the block resolver, `editor/listDragModel.ts`, and the decoration pass, so a formula drags whole, indented math rides its bullet, and a marker-lookalike line inside math renders as formula source rather than a live drag glyph. `MarkdownPM/Styles.css` and `decorations/intent.ts` inverted the list-wrap frame — the list line suppresses every wrap opportunity and the item's content span carries the one wrapping region — so a long unbroken word fills beside its glyph instead of dropping below it. Duplicate definitions across five stylesheets resolved to `tokens/size.css.ts` and `theme-vars.css.ts`, `Tables/TableView.tsx`'s grip drags moved onto the shared gesture skeleton, and the per-version callout cache folded into `editor/docCache.ts`'s single doc scan. `decorations/intent.ts` re-derives only the lines a caret move affects now, and `editor/decorations.ts` assembles intents by loop rather than by spread, which had put a large outline within reach of the argument limit. → [[MarkdownPM]]

- **Commits:** `1816c81f^..8df9ea6f`
- **Diff:** Net +292 | +516 / −224

#### PM-012 || Hidden Groups
**DATE:** 08-02-2026

A grouped view could collapse a band but never make it leave, so hiding a group meant authoring a filter that only approximated it. Every group row in the Grouping pane now carries the Visibility pane's eye, and hiding resolves as one view-level key list filtered once — a hidden Set leaves the tree with its whole subtree, and a sub-group bucket hides globally by value — so every renderer present and future inherits it with no per-view code. Date grouping's empty middle region became the real bucket list, which is what made date bands hideable at all. Hide Empty Groups finished its half-implementation at view level, with the resolve-level drop as its one adjudicator. → [[ViewsPM]]

- **Commits:** `47aabb06`
- **Diff:** Net +235 | +337 / −102

#### PM-013 || The NexusRecord
**DATE:** 08-01-2026

Pommora gained a record of what it deletes. Every nexus-trash delete writes a provenance record holding ids rather than name-based locations — the parent as a discriminated union by id, per-kind payloads, gathered in the delete arm's real order with the registry read taken before the erase closes the title-to-id window — and the record is all-or-nothing, since a silently incomplete one would be trusted by restore. Restore is a headless op, IPC-reachable with no surface, spending records through a pure resolver that returns either a placement with final names or a typed refusal.

**The Open Baseline:** A single explicit walk, after the database opens and before the watcher starts, latches what the closed window left, and the diff runs with absence first-class and three-state existence, so a corrupt sidecar reads as an unreadable transition rather than a deletion. The same baseline adjudicates the duplicate-id re-mint: a file-copied page or container stops sharing its twin's identity at the next open, with the claimant at the prior session's recorded path keeping the original id.

**The Deletion Bundle:** One deletion is one folder holding the artifact under its original basename beside its record. The record is written before any destructive step and the artifact moves in last, so the artifact's presence is the settle marker and a bundle holding none is a deletion that never finished — skipped by the listing and left as evidence.

**Property Restore:** The global property delete's recovery snapshot became spendable. The registry judges whether a definition may return at all, since a name another property has since taken refuses the whole restore, and each value decodes strictly against the definition, so a vanished option or a dead page simply doesn't return. → [[NexusRecordPM]] · [[PropertiesPM]]

- **Commits:** `55b5fbc2^..7419a08b`
- **Diff:** Net +1855 | +2159 / −304

#### PM-014 || Identity Goes Kind-First
**DATE:** 07-31-2026

The identifying question inverted: an entity's kind now comes from its folder's sidecar and its id from the key naming that kind — `PageID:`, `TaskID:`, `EventID:`, each holding a bare ULID — so identification became an agreement between a file and the folder that declares it. Admission became one predicate shared by the walk and the adoption pass, answering member, missing, or Unknown; an Unknown file is invisible to the tree, skipped by every nexus-wide write, and left byte-identical on disk. Classification consolidated onto one depth-aware resolver, and registration replaced presence as the agenda authority. The frontmatter key migration renamed 171 files with the app closed and verified a real open at zero dual-key and zero malformed files, with no transition machinery written for it.

**Agenda De-Scaffolding:** The Agenda suffix grammar, the item schemas, the CRUD layer, and the read-only channel came out ahead of the identity cutover, so the new model landed on an empty slate rather than adapting the old shape. What they carried was EventKit's, imported wholesale by the Swift build and never re-chosen; Tasks and Events are `.md` under their kind keys now, with a field vocabulary left open. The removal outweighs the identity work by roughly two lines to one, which is why the totals come out negative. → [[ArchitecturePM]] · [[AgendaPM]] · [[PagesPM]]

- **Commits:** `9b005cb8^..662f8cc5`
- **Diff:** Net −394 | +763 / −1157

#### PM-029 || The Band-Seam Law
**DATE:** 07-30-2026

Vertical clearance around disclosure bands had been written per state and per view across `CardsView.css` and `Table.css`. It moved into the shared `GroupBand.css` chrome with each view binding only its own `--band-clearance` and `table-tokens.css` supplying the table's value, so a seam derives from the view's content rhythm rather than from band state. A collapsed band folds to the row or card rhythm instead of holding clearance for content it no longer shows, a leading band clears the view's top edge, the last card row clears the tile's bottom edge through `Blocks/viewEmbed.css.ts`, and a head facing a nested band cedes its clearance to that band's lead. The closing pass restated the nested-band yield positively, which deleted the `:has()` walk and the sub-band special case with it, painted the cards seam lead-side only, and put the seam transition on the chevron's beat channel so a host that re-times its disclosure carries the seam along. `design-system/components/Reveal.tsx` gained a note marking its inner wrapper as the addressing contract, and `Detail/ActionBand.css.ts`'s dropdown chevron moved onto the house inline gap. → [[ViewsPM]] · [[DesignPM]]

- **Commits:** `68ad2e63^..7ffe0511`
- **Diff:** Net +20 | +47 / −27

#### PM-015 || ActionBand And The Per-View Color
**DATE:** 07-30-2026

Pill styling hoisted out of the view embed into `ActionBand`, the shared toolbar-affordance home, and the collapsible title morph consolidated onto Segmented-Controls' single `labelSlot`, so the toolbar view button and both embed switcher modes ride one written-once animation. Views gained a per-view color, worn only as the segment stroke at a tint and picked through the existing ColorPicker from the segment's own right-click menu. The rename field auto-sizes to its typed text, pickers anchor to the right-clicked chip, and every `EditableInput` consumer became a spellcheck-free title field. → [[ViewsPM]] · [[DesignPM]]

- **Commits:** `eea34354^..f68d3ba9`
- **Diff:** Net +189 | +418 / −229

#### PM-016 || The Tree Index
**DATE:** 07-30-2026

Five hand-rolled walks over the same tree — the reconcile index, the nav resolve index, the search entries, the connections title map, and the thumbnail keys — each ran per gesture and per surface. `treeIndex.ts` now walks once per identity, producing a record per entity plus the Context-group id set and caching against the tree object, with every table a lazily cached projection holding its exact prior shape, so consumers swapped builder calls for accessors and nothing else. Two latent defects came out with the siblings: the reserved `context` selection kind had reconciled against the wrong universe and now refuses by declaration, and the never-imported `LinkIndex` contract was deleted rather than adopted. The record list keeps duplicated ids listed and only the keyed projections collapse last-wins, so an ordinary file copy cannot erase a page from search and wikilink resolution. → [[ArchitecturePM]] · [[NavigationPM]]

- **Commits:** `3ee09a5f`
- **Diff:** Net +98 | +331 / −233

#### PM-017 || The Bridge Map
**DATE:** 07-30-2026

Every IPC channel had been hand-written at both ends with its types kept in a third place, and the drift that invited was the defect class: five spellings of one refusal, three coexisting failure encodings, and rich errors flattened to sentences. One map in `shared/bridge.ts` now declares each channel's name, direction, argument tuple, and reply; the preload derives its dialers from that map and main answers through a single exhaustive handler object, so a missing, extra, duplicate, or mismatched channel fails the typecheck. The envelope unified on the shared `Result`, which carries the structured error across the wire whole, and the two session refusals became shared constants with their own codes. → [[ArchitecturePM]]

- **Commits:** `39aeb20f^..063e44fb`
- **Diff:** Net +195 | +1874 / −1679

#### PM-030 || One Fence Scan For The Editor Chrome
**DATE:** 07-30-2026

`decorations/intent.ts` stopped stripping a literal `>` inside a closed unquoted fence, so a quote marker beyond the fence's own depth reads as code rather than chrome. Its fence recognition then folded into the single scan owned by `MarkdownPM/detect/index.ts`, which makes blockquote chrome extend exactly to the fence's depth and leaves one source answering where code begins. → [[MarkdownPM]]

- **Commits:** `cfdb307e` · `fcd3621b`
- **Diff:** Net +93 | +193 / −100

#### PM-031 || The Erasure Campaigns
**DATE:** 07-29-2026 → 07-30

The Swift-compatibility layer came out wholesale: the settings seed and its backfills, the decoder date shim, the accent and colour exchange maps, the legacy view vocabulary, every Swift-citing comment, and the on-disk residue across both real nexuses — forty-seven sidecar version stamps, forty view-icon aliases, and nine legacy colour words. Navigation persistence then collapsed onto one contract, where `navigation.json` holds pinned and favorites as ordered arrays of bare `{kind, id}` refs beside the NavView banner pointer, recents stay a device-local row in the same shape, and `isNavRef` with the shared `toNavRef` strip gates every ref crossing either store. Seven IPC channels became a read and a write; stored tabs and previews dropped their paths and are hydrated at restore by the one owner that prunes dead refs, mints paths, and recomputes the history pointer. The pins folder, `navFavorites.json`, and `navview.json` left both disks by hand, with no migration code shipped. A closing attack caught an ungated banner pointer feeding a file delete and a patch-writer reading through the lenient reader, both closed the same night. → [[NavigationPM]] · [[ArchitecturePM]]

- **Commits:** `fb52b501^..8ad70f03`
- **Diff:** Net −198 | +904 / −1102

#### PM-024 || Six Hand-Rolled Borders Take One Token
**DATE:** 07-29-2026

Two HOIST markers in the icon picker became a design-system pass. The outlined-box border six surfaces had hand-rolled is `--border-cell` now, beside `--border-heading`, and the accent-tint active stroke four surfaces restated is `--accent-stroke` — colour only, since the weights genuinely differ per surface. The picker's hand-rolled focus ring moved onto the house `fieldRing` channel, and the virtualizer's cell size single-sourced out of the silent-drift pair it had been spelling twice. → [[DesignPM]]

- **Commits:** `b6270097`
- **Diff:** Net −3 | +55 / −58

#### PM-032 || Sidecar Writes Take One Strict Primitive
**DATE:** 07-29-2026

Every read-modify-write on a JSON sidecar came onto one strict primitive that separates an absent file from an unreadable one and refuses the write on the second, which closed the class where a transiently unreadable file was silently replaced by a default. Glyph resolution collapsed to one rule, and the nexus walk went parallel behind a stat-gated per-page cache, so an untouched file incurs no reads. The inverse pass then removed roughly thirty-four lines of guards defending states that cannot occur, and tracing those call sites surfaced a real defect: a property-restore spend signal was counting a failed write as spent. → [[ArchitecturePM]]

- **Commits:** `c1b488c7^..0887f11f`
- **Diff:** Net +117 | +610 / −493

#### PM-033 || Property Values Take Name-Keyed Frontmatter
**DATE:** 07-28-2026 → 07-29

Page and agenda property values left the ULID-keyed `properties:` map and became wrapped, name-keyed entries at the frontmatter root — the shape Contexts already used, which moved from square brackets to parentheses so one module owns both. Values stay bare, so a number reads as a number and a date as a timestamp to any tool reading the vault. Because the key names the property, nothing is inferred from a value's shape, which collapsed four decoders into one: a shape guesser, the re-tagger that corrected its guesses, a hand-rolled decoder written to avoid it, and a per-type switch in the page-value writers. Property titles became unique nexus-wide, since the title is the key values write under, and a rename commits the registry and then sweeps once. A wrapped key is Pommora's without being a property, so resolution runs definition-first — walk the schema, build each key from its name, read that key. → [[PropertiesPM]] · [[PagesPM]]

- **Commits:** `229dd31c^..e9a3da1e^` · `6a1209a6..2f62e67e`
- **Diff:** Net +149 | +830 / −681

#### PM-023 || One Source For The Spectrum
**DATE:** 07-29-2026

The solid palette had been written three times: eleven hexes in the colour tokens, and the same ten key names as two byte-identical arrays in the cross-process contract, one named for accents and one for chips. An accent, an option colour, and a Space colour are one vocabulary, so they read one list now — a plain shared constant beside the window background, since the main process cannot read a vanilla-extract token. The `:root` vars build from that constant and the key list derives its members from it, so adding a colour to one and missing it in the other is unexpressible rather than merely unlikely, and error text was the last hardcoded value to take a token. The three-tier entity kinds also left the type system, where three unions still listed them and three sidecar filenames still had names on disk with no reader; `NexusLabels.area`, `.topic`, and `.project` stayed, since those are the label pairs seeding three ordinary registry rows. → [[DesignPM]]

- **Commits:** `e9a3da1e^..6a1209a6`
- **Diff:** Net −24 | +62 / −86

#### PM-034 || Operational State Leaves The Filesystem
**DATE:** 07-28-2026

The database had never run: `better-sqlite3` compiles against Node's ABI while Electron requires its own, so the open failed on every launch, the degradation path swallowed it, and Vitest running under plain Node returned null silently. `node:sqlite` ships inside Electron's runtime and removed the native dependency, the rebuild scripts, and that failure class with it. Eight `.nexus/` files holding per-machine chrome, plus the block layout buried inside two more, became rows — each had been JSON because everything beside it was JSON, and each paid a whole-file read-merge-write to change one key, which retired the coalescing engine, the drain contract, the per-file locks, and a quit gate that could defer the app's exit. Pinned and favorites stayed files, carrying cross-machine intent rather than per-machine chrome. The nine-table content mirror went too, having no query consumer anywhere, and search was rewritten to one tree walk, one lowercase, and one scan per query. → [[ArchitecturePM]] · [[ConfigurationPM]]

- **Commits:** `ef70bf33^..e78e7b57`
- **Diff:** Net −1875 | +675 / −2550

#### PM-022 || One Owner Per IPC Shape
**DATE:** 07-27-2026 → 07-28

Four repeated shapes across the IPC layer collapsed from eighty-one sources to four owners, with all 102 channels verified byte-identical across the change. The trash began mirroring the nexus folder chain so a delete records where it came from, and two index-rebuild races closed — one where tearing a nexus down did not wait for the rebuild still writing into it, another where a rebuild could delete the file another was writing. `NavWindow`'s search then began switching what is listed rather than how it is drawn, and its field drew one caret at its own text's height. The renderer, the main process, the shared contract, and the stylesheets lost their plan-task tags, their retired Context vocabulary, and every comment that only restated the code beneath it, keeping what a reader could not reconstruct. → [[ArchitecturePM]]

- **Commits:** `5158c124^..83e21c6e`
- **Diff:** Net −2323 | +2650 / −4973

#### PM-021 || The Feature Docs Audited Against The Code
**DATE:** 07-27-2026

One agent per feature document opened every claim at the code before it survived, returning 440 confirmed corrections and about a dozen live defects that predated the audit and had been reported by nobody. Filtering looked inert because folder headings kept drawing after their rows were filtered away; comparisons passed rows holding no value; a move and a table property edit did not count as modifying a page; a rename rewrote `[[links]]` inside fenced code samples; a sidebar painted its empty state over the list it was animating away; and two rapid edits could race the index rebuild. The recurring shape was one fact with two sources — a key read by two sites with opposite defaults, a column named differently across layers, a rule the editor applied and the write side did not — so the repairs were subtractive, removing the second source rather than reconciling the two. → [[ArchitecturePM]]

- **Commits:** `daff434d^..e887a242`
- **Diff:** Net −572 | +1106 / −1678

#### PM-020 || The tierN Compatibility Surface Comes Out
**DATE:** 07-27-2026

Both nexuses were confirmed on the registry shape — the real one through daily use, the test one migrated and diffed against a pre-migration copy to prove no assignment was dropped — and the backward-compatibility surface came out rather than remaining as dormant weight. The migration and its resumable version handshake, the read-healing inside every context write, the legacy key modeling in the page and agenda schemas, the walk's recognition of the old arrays, and the tier-level helpers all went with it. A nexus left at the old shape can no longer be opened, since the conversion is gone rather than dormant; that cost was taken deliberately over keeping a path that could never again be exercised against real input. New nexuses mint at the current schema version instead of being stamped at the old one and relying on a migration to catch up, and a wrapper whose only outside consumer was the migration collapsed into the shared reconcile it had been forwarding to. A one-time converter rewrote the seeded Contexts' reserved ids to ordinary ULIDs across the registry, every saved view's column and filter references, and the space orders. → [[ContextsPM]]

- **Commits:** `2707533d^..a0315e2b`
- **Diff:** Net −252 | +112 / −364

#### PM-035 || The FilterPane Returns
**DATE:** 07-26-2026 → 07-27

The authoring pane came back rebuilt around the sizing failure that had killed it: every cell sizes to its own row's content with no cross-row column geometry, and the pane fills its host before stretching toward its width knob. `none` became a real NOR mode evaluated at every depth, which forced disabling onto its own `filter_enabled` field and demanded a third verdict in the evaluator, so a rule that cannot be applied abstains rather than passing. Filter targets come off the Contexts registry instead of a hardcoded tier list, so a user-defined Context filters like a seeded one; Location's four operators are any-of over a chip set of Sets, and Date collapsed to Is, Before, and After. Three review rounds produced three durable traps — two writes in one gesture, Back suppressing pointerdown, and an index-keyed exit animation handing a departing row's collapse to its successor. The branch closed on design-system hoists: one anchor, one measurement owner, one disclosure row, and a z-index scale derived from what the layers already were. → [[ViewsPM]] · [[DesignPM]]

- **Commits:** `adfcb828^..05a98344`
- **Diff:** Net +2037 | +2727 / −690

#### PM-019 || Lint And Accessibility Reach Clean
**DATE:** 07-25-2026

`npm run lint` had never passed — 215 errors and 332 warnings against a gate nothing in the workflow invoked — and it runs clean across every file now, with a change that adds a diagnostic counting as unfinished. Three rules came off with stated reasons: Biome's dependency-array rule is stricter than React's, and the omissions here are deliberate; the non-null assertion is an accepted idiom, and the descending-specificity rule fired only where specificity governs anyway. Three findings were the linter reading wrongly, and one of its own auto-fixes broke assignability by rewriting a callback's `void` return to `undefined`. Both tab strips became tablists with roving tabindex, so a strip is one tab stop rather than one per tab, and gallery cards, menu rows, disclosure rows, and click-to-edit fields became real controls over `interactions/activate.ts`, which re-dispatches Enter and Space as a genuine click so no surface carries a second path that can drift from its `onClick`. Grids still carry no keyboard navigation and every drag handle is pointer-only; both sites are suppressed and say so rather than being papered over. → [[Lint-And-Accessibility]]

- **Commits:** `78383686^..c0b40cd2`
- **Diff:** Net +135 | +445 / −310

#### PM-036 || The Settings Window And The Dangle Sweep
**DATE:** 07-25-2026

`PreviewPane`'s first non-content consumer arrived as a Settings window off the ribbon's settings glyph, which had been a documented no-op since the ribbon shipped — a full-height category rail, rows writing through the same generic personalization setter, and a default-ON knob storing only its OFF state. It retroactively justified two surface props a simplification pass had wanted to delete for having no caller. The preview's tab strip stopped hard-cutting labels mid-word and began compacting off an open side pane, stopping at the pane's leading edge rather than merely clearing the trailing button pair. The sweep then found `connectionsOpenInPreview` consumed in three places but never parsed on read, ten inert `eslint-disable` directives for a linter absent from the toolchain, seven stale `biome-ignore` comments, and the tier migration's residue across fourteen files. → [[ConfigurationPM]] · [[PagePreviewPM]]

- **Commits:** `8689045f^..3d8e38aa`
- **Diff:** Net +247 | +374 / −127

#### PM-037 || PreviewPane Absorbs Both Floating Windows
**DATE:** 07-25-2026

The Page Preview and the NavWindow had duplicated an entire chassis — the glass shell and its scale in and out, the close ×, the Escape contract, the side-pane geometry and resize strip, the `--io` openness driver, and the trailing-button swallow — with a third copy in `FloatingPane`. The tell was cross-namespace CSS, where the NavWindow declared the preview's vars because the values had to match and nothing shared owned them. `PreviewPane` now owns the shell, geometry, dismissal, a toolbar in band or floating form, left and right side slots each overlay or in-flow, an optional collapsing footer, and the glass tint as a property — previously impossible to expose, since the frost material hard-sets a transparent background. A window supplies its interior and padding while the surface owns every position, transition, and driver var; a FLIP measures from the surface's own root ref rather than by walking up from an inner node, where the old `parentElement` walks would have animated the wrong element. Verification ran against a captured pre-refactor baseline at 15 of 15 states pixel-identical, plus fifteen behavioural checks for what a settled frame cannot show. → [[PagePreviewPM]] · [[NavigationPM]]

- **Commits:** `fb868095^..0d3246c2`
- **Diff:** Net −8 | +974 / −982

#### PM-038 || The Docs Stop Describing The Tier Era
**DATE:** 07-24-2026

The tier-era claims were swept out of the PRD and the feature documentation so the docs described what the code did, with per-session residue stripped from the durable specs and the roadmap trued to verified state. The PRD's vision paragraph was rewritten to describe Contexts holding Spaces. No source changed.

- **Commits:** `9ac3fcea^..14ae87e8`

#### PM-039 || Contexts And Spaces Replace The Three Tiers
**DATE:** 07-22-2026 → 07-23

The fixed three-tier model gave way to a user-defined registry: a Context is an entry holding Spaces, and Areas, Topics, and Projects became seeded rows rather than types. Every hard-coded consumer was rewritten against it — the walk, the index, the sidebar, selection, navigation, table resolution, column labels, and the DnD model — with membership carried as a parenthesized title key in frontmatter, resolved against the registry at assembly. Registry writes run under a lock with a journal, so an interrupted rename cascade resumes rather than half-applying, and the `tierN` migration keyed its re-entry on the schema version, since the tier folders could not be the signal when the step that moved them consumed them. Spaces became the second BlockHost through `SpaceView` and space block hosts. A rename to a leading-underscore name wrote a real file and dropped it from the tree permanently, indistinguishable from a delete with no error and no way back; that closed here. → [[ContextsPM]] · [[StructurePM]]

- **Commits:** `c7c210da^..ae139217`
- **Diff:** Net +2135 | +3391 / −1256

#### PM-040 || One Vault Walk Per Structural Mutation
**DATE:** 07-20-2026 → 07-21

Structural mutations came to cost exactly one vault walk: every create, move, rename, delete, and reorder patches the in-memory tree optimistically through pure `treeMove.ts` transforms while `writeEcho`'s self-write suppression keeps the watcher external-only, with the confirming reload following. Creation moved to pick-natively and execute-in-store, so the create menu returns the chosen request instead of running it and a new row lands instantly with its icon and a focused rename. Every bespoke drag surface consolidated onto `beginPointerGesture`, one raw-pointer primitive owning activation, listeners, Escape, capture, and per-gesture abort, while the cross-zone engine moved its pointer-follow to imperative transforms. The editor's hot path took a per-doc-version scan cache, value clicks routed through a shared `valueClick` router, page autosave became a path-keyed flush registry, and the dead `Popover` fell with its `useDismiss` extracted. Certification caught four defects along the way — grandchild path corruption on reparent, a root-path character eaten by `parentOf`, a refused begin clobbering a live gesture's handle, and an inspector writing stored-`false` checkboxes. → [[ArchitecturePM]] · [[PommoraDND]]

- **Commits:** `bac7ba93^..a66a0ec8`
- **Diff:** Net +1153 | +2248 / −1095

#### PM-041 || Cards — The First v0.6.0 Renderer
**DATE:** 07-18-2026 → 07-20

The Gallery view type was activated, renamed Cards, and built end-to-end on the `cards-view` branch: the card canvas, the Set Cards row, flattened disclosure bands, the location footing, per-value interaction routing through the ratified per-kind matrix, and the two-stage add picker. Group By None with Sort By Location superseded an earlier flatten switch. `CardPickerHost` sits at grid level as the single home for the value, calendar, and add pickers, so row churn cannot tear an open picker; every picker mounts persistently and Blooms in and out under a dev guard, and a chip's remove-× stays inert until hover-revealed so a stray click opens the picker rather than deleting a value. Three agent-fanned sweeps followed — an eight-agent per-type audit, the number Bar look gated by one `numberDivisor` predicate, and an eleven-agent verification pass whose catches included a calendar sub-menu z-burial, a dead empty-cell menu, a blur-committing pane Back row, and a StrictMode spurious calendar write.

**Riding the same branch:** the design system gained a `Slider` primitive that the Cards Scale control consumed; the thumbnail cache became persistent, with `existingNavKeys` supplying the tree's complete key set and an existence-prune at nexus-open replacing recents-window eviction so covers survive relaunch; and the main tab strip's labels took hover eclipse-scroll on the shared `OverflowScroll`. A view save stopped walking the tree twice, and MarkdownPM rebuilt an edited table's widget on cell commit. → [[CardViewPM]] · [[ViewsPM]]

- **Commits:** `dd6f6d1b^..3ab0bd51`
- **Diff:** Net +3147 | +3984 / −837

### 04-26-2026 → 07-17-2026

##### PRE-Version 0.5.0

#### Unified Subfield + Scan-Promote — Floating ↔ Full-Pane Parity (07-17-2026)

Collapsed the floating ↔ full-pane surface split so the Subfield footer and the scan-promote semantics are *shared*, not re-implemented per surface — four phases (A–C core + D prospect), each gated + CDP-verified on the real Nexus. A plan-review round caught two premises before code: the preview stats can't ride the shared `liveBody` slot, and the two view modes must stay separate. The Subfield takes one optional `scope` prop — unscoped it reads the global selection (the detail pane); scoped, the floating preview describes its own page off a local body it owns, never the single-owner `liveBody` slot, because a second writer would evict the main pane's live count. The preview footer replaces the inspector's location footing, aligns to the embed's text column, carries its own collapse, and its crumbs are non-navigable. NavView gained the List/Gallery toggle on its empty `none` kind, a reorderable list showing the pinned group, and its own persisted view-mode slice separate from the NavWindow's — flipping one never moves the other, both surviving relaunch. The list-row pin moved into a widened lead gutter so it no longer touches the row glyph, and NavView aligns its rows with its gallery. The map-flavor scan promotes the NavWindow into NavView (no engulf, one-time-copying the mode), while a page tab promotes its page.

#### Page Previews — The Floating Tabbed Mini-App (07-16-2026 → 07-17)

The Page Preview went from a parked `open_in` value to a full feature cycle: a spec certified across three adversarial rounds, a 9-phase plan certified across two, then executed overnight with a per-phase protocol (gates → build-breaker → simplifier → commit). The preview is a semi-multi-tabbed mini-app, not a peek: a floating, movable, fully-editable window whose connection-clicks open dedup-focused tabs beside the origin (in-window tabs, no Back-only history), tab-neutral to the app's tabs by construction, one window at a time. Two formats share everything: the page format (the summoned page is tab 1) and the NavWindow format (the window IS tab 1 — a perma-pinned map-sentinel tab holding the whole search + rail + gallery; page tabs swap it away and slide the rail closed, the map tab is the return). They run on one chrome, one tab-motion layer (extracted container-agnostic, the toolbar skin unchanged), one side-pane shell (extracted from the NavWindow rail — the rail and the preview's front-matter inspector are the same component), one warm seam, and one debounced-sidecar machine. Per-origin tab sets persist and sync: each origin page remembers its connection-opened tabs + order across sessions, re-keyed on re-parent, retired when emptied, reconciled against the live tree on restore; the NavWindow keeps its one set; warmth (editor state + scroll) stays session-only. Routing: container titles + sidebar rows honor the Collection's `open_in`, connections route by a nexus-wide preference key, ⌘-click always takes the other route, ⌘N promotes the active tab, and the NavWindow's override toggle routes its rows to tabs-in-window. The title↔tab morph collapses the centered breadcrumb into a caption strip once a second tab opens; the engulf FLIPs a promoted window onto the detail pane (close reasons thread through the store so a promote never replays as a dismiss).

#### Multi-Tab Nexus — Warm Toolbar Tabs (07-15-2026 → 07-16)

The navigation model's deferred fork (B-1: single-pane-replace vs top-bar tabs vs split panes) resolved to **warm, state-preserving Toolbar Tabs** — ratified across adversarial review, then built through six phases, each shipped green and review-folded. One view is mounted with a per-tab serialized cache: switching a tab restores its scroll + editor undo from a cached history field, rejecting N-live-views on the perf hard-rule (N un-virtualized tables) — the singular `selection` stays, always meaning the active tab, and a warm switch renders the cached detail instantly, no loading flash. The pinned refs ARE the pinned-tabs set: `isPinned` is derived from them, never separately stored; pinned tabs dock left as compact live-resolved icons (the Homepage tab wears the nexus photo). The full tab set persists per machine — closing never resets tabs, they reopen cold, warm view-state stays session-only — with per-tab Back/Forward (chosen over one shared history so Back never teleports across tabs; a pinned tab holds none, so its arrows disable) and one `openTab` predicate absorbing replace-vs-spawn behind every entry (clicks, the stateful "Open in New Tab" menu points, and the tab bar itself). Every tab reconciles against each tree push — renames refresh in place, deletes close unpinned tabs and render-hide pinned ones — and thumbnail capture gates on content change, so warm switching never re-shoots. The empty state becomes **NavView** (the full-window Recents gallery + search); the nav surfaces renamed for the model — **NavWindow** (the floating overlay), **NavPane** (the toolbar dropdown), **NavView** (the new-tab page). The merge window carried the last mile: pause-on-change cold switches (the outgoing view holds as a frozen last frame while selection + detail land in one commit, a ~200ms deadline dropping to the loading view — no flash on the common fast read), directional motion (the incoming view slides from the step's direction on every navigation, the tab label riding the same stamp), the NavWindow list reorder on the shared drop-line gesture, a per-NavView banner override, the consolidated edge-fade, and the tab bar's JS window mover (a native drag region never delivers hover, so the bar moves the window itself and the same pixels hover AND drag).

#### Navigation Surface — NavPane + Nav-State Layer (07-14-2026)

The Navigation surface landed across four phases plus a visual redesign. A per-Nexus **nav-state layer** — recents as an MRU stream, favorites as a curated list, all resolved live against the tree so a moved/renamed entry follows and a dead one drops on render, never on storage — feeds a renderer store + **client-side fuzzy search**, and two presentations render over ONE shared read side (`useNavData` → a `ResolveIndex` built once per tree push: entry icons + container-crumb chains that recents, favorites, and search all read). The NavPane is an always-centered `GlassPane` command surface: rows read (icon)(title … chevron-joined path) with title + path each eclipse-scrolling under the shared `OverflowScroll`; it resizes from four corners + a rail split, size persists but position re-centers on open, and both lists carry the shared `scroll-edge-fade`. Row actions defer to context-menu actions (pin / favorite / remove pulled off the row), and the NavMenu dropdown is a placeholder pending its content call.

#### App-Wide Auto-Scroll (07-14-2026)

Every drag's edge-scroll collapsed onto **one shared primitive** — `interactions/autoscroll.ts`, a singleton rAF loop each drag feeds — replacing two duplicated per-surface copies and retrofitting the three surfaces that never had it (sidebar, table rows, table bands). One fixed scroller resolved once at drag start, not per-frame: the ratified design rejected the general-library "scroller under the pointer each frame" (`elementsFromPoint`) because no core Pommora drag crosses scroll containers — each lives in exactly one — so a scroller resolved once (explicit for the drags that self-compensate the scroll delta or scroll the CM `scrollDOM`, else the **axis-aware `findScroller`**) is simpler and dodges a bug class (viewport-exit stall, token-cache incoherence); the lone crosser, the cross-list board, stays a prospect precisely because it'd need the rejected per-frame path back. The loop owns the scroll, the pointer only feeds a point: it scrolls every frame off the last point (holding still at an edge keeps scrolling), in px/sec × frame-delta with sub-pixel accumulation (frame-rate-independent, no ProMotion double-speed) and a dt clamp so an rAF stall can't teleport the scroll, plus two feel wins — **distance-based acceleration** (a scroll run eases in from a non-zero floor and climbs to a ceiling with the distance it covers, so a longer drag-scroll goes slightly faster; resets on leaving the band) and **direction-intent** (a direction won't scroll until the pointer leaves that band once, killing the grab-at-edge rocket). Token-driven off the drag element: the four tunables live in `interactions/autoscroll.css`, read off the drag element once at start and cached, so a surface overrides them on itself or an ancestor. The module owns a termination backstop (blur / visibilitychange / pointercancel) that stops the *loop only* (each surface keeps its own gesture abort), and `startAutoScroll` returns an **instance-scoped stopper** so a bystander surface's unmount can't halt a live drag. Prospects as of 7-14: MarkdownPM list drag, table column horizontal reorder, GFM-table drag, grouping pane, the cross-list board.

#### The Block Surface — SurfacePM (07-10-2026 → 07-13)

Pommora's composable dashboard layer landed: a **BlockHost** renders a mosaic of draggable, resizable tiles over the in-house **SurfacePM** tessellation engine ([[PommoraDND]]'s sibling), with the Homepage as the removable dev host. It's host-agnostic (D-2) — the surface works identically under every resolution of the contexts question, so it ships *before* any real host, its block document loaded per-host on open, never in the tree walk. Repair-not-reject at every level (E-1): unknown or foreign tile entries are preserved and rendered inert, a broken hand-edit repairs without wiping the survivors, and every write is a locked read-merge-write touching only its own keys — foreign keys survive by construction.

Three tile types — a markdown block (file-backed prose, a connection *source* only), a page embed (a reference to a real Page), and a view embed (a saved view or block-owned config, copied at pick time, never synced back). The embed IS the CM6 view; one seam renders a Page inside any foreign surface as a portal carrying every MarkdownPM affordance, editability flipped in place through a live-reconfigured compartment — an embed edit is a page edit through the page's own save. Two framework laws reach beyond blocks: popups escape the tile (a transformed ancestor re-anchors `position:fixed`, so a popup born in an embed portals to body) and scroll is caret-priority (blocks are wheel-transparent at rest; only the caret-holding block scrolls internally).

Surface interaction: right-click creates (wedge-fit under the click, or a full-width band on open background); a notched drag handle opens the block menu (Type · Style · Scale · Remove); window-style resize magnetizes to neighbors, interior holes impossible by construction; a geometry-only host lock freezes position + size while content stays live; and an embedded page signals itself with an accent border. Per-block Scale is a view-agnostic freeze-inset: five discrete steps ride one inherited zoom var, but the manipulation chrome (tile inset, drag handle, resize edges) always stays fixed — a markdown or page tile scales only its text, a view tile scales its table as a unit.

#### View Filtering — the Filter Engine (07-10-2026)

The view **filter engine** shipped to main. What landed is the engine — the pipeline applies any stored `filter` with the full type-aware matrix. Every new operator is three coordinated changes: the `FILTER_OPS` registry entry (the `FILTER_OP_SET` gate no-op-passes an unregistered op — a filter that looks applied but does nothing), the per-type evaluator branch, and the per-op operand semantics — `contains_any` guards its empty operand set explicitly (`[].some()` would blank the table), date `is` truncates both sides to the calendar day (never exact ms), `starts_with` is case-insensitive. New ops: `starts_with · contains_all · contains_any · is_before · is_after · greater_or_equal · less_or_equal · is_inside · is_not_inside`. Title, Location, and Context became filterable: Title routes to the text matrix (inverting its pinned no-op test), Context splits off the file presence arm into `evaluateList` membership, and **Location filters any-depth** via a descendant-id Set precomputed once per operand, and membership-tested per row . The operand model: `FilterRule` gained `values?: string[]` for multi-operand ops (any-of / none-of on single-valued options, Is Any / Is All on arrays), and `MATCH_MODES` widened to `all | any | none` — a root `none` skips filtering (the pipeline early-returns) while the rules persist, so "disabled" is a real on-disk state. The no-op-pass rule is pervasive (unknown op, dead property, dead set id, or missing operand all pass; never exclude), with one deliberate Swift-parity exception: an id-list membership test with a single missing* operand is false. Refactor kept: `contextOptionsFor` extracted to a shared `pipeline/contextOptions.ts` (TableView repointed).

#### Table Sorting Pane (07-09-2026)

The blank Sort leaf became the **Sorting pane** (both doors), built verbatim on the grouping chassis Nathan sketched: Sort By (the pane-flip disclosure) · a per-type Order picker · Sub-Sort with its own Order · the read-only example order. The pane owns the `sort` slot wholesale: every write is `[primary]`, `[primary, sub]`, or key-dropped `undefined` (the Group By wholesale-replacement precedent) — no splice-and-promote algebra; a deeper hand-authored array renders by its first two slots until the first pane write replaces the slot. The offering is the honest set: None + Title + Modified + the schema's `select · status · number · datetime · checkbox · url · multi_select` — Context and File are excluded because the sorter's text extractor returns nothing for them (a no-op sort is never offered). Direction vocabulary per type: Select/Status = Default/Reversed/Custom (the grouping labels; Custom snapshots the effective sequence onto the criterion's `order` and the middle becomes the shared draggable CustomList), dates/numbers/checkbox = Ascending/Descending, text = A → Z / Z → A; the Sub-Sort's Order shares the primary's per-type vocabulary. The example order reuses GroupingPane's `PropertyPreview` (prop loosened to the ordering pair; `ascending → configured`, `descending → reversed` — verified to agree with the sorter's ranking in both directions). Fixed en route, the drag gates now count EFFECTIVE sorts (`resolvedSortCount`) — a dead criterion (deleted property) sorts by nothing and no longer retires row drag-reorder or flips the manual-order gate.

#### Ribbon Toggle + Commands Registry (07-09-2026)

⌘E now slides the sidebar's ribbon away and back (the sidebar's own collapse motion — ribbon `translateX` off the panel's left edge while the content column's margin animates over the reclaimed 44px, both on the shared motion tokens). Shortcuts are data in a `commands` registry: the binding lives in `.nexus/settings.json` as `commands.toggle-ribbon`, the map every future rebindable shortcut joins; `DEFAULT_COMMANDS` (shared types) is overlaid with the on-disk block on read (`readCommands`, lenient per-entry) so every id always resolves, and the tree carries the resolved map to the renderer like `personalization` — no new IPC. The renderer matches specs (`cmd+e`-style modifier chains) exactly via `matchesCommand`, so overlapping bindings can't double-fire. Ribbon visibility is transient window state, matching the sidebar's own collapse.

#### Table Grouping Pane (07-09-2026)

The blank Group leaf became the **Grouping pane** (both doors — SettingsPane + ViewSettings), and the pipeline grew its three companion mechanisms. The structural-only settings live VIEW-level (`structural_order_mode` · `sub_group` · `ungrouped_placement` · `date_separator`, beside `group_order`): the view has ONE `group` slot that a Group By switch replaces wholesale, so anything that must survive the round trip can't live on the config object — the `group_order` precedent, honored after the simplifier caught the extend-the-config shape's preservation as unimplementable (a hole three adversarial rounds missed). Order = Location mirrors the filesystem: the pipeline skips `orderGroups` (preserving `group_order` for the flip back), and a same-parent band/pane reorder writes `reorderChildren`; the cross-tree reparent writes `group_order` in every mode (slot preservation). Sub-Group is a second resolver stage: sets stay top bands, sub-sets flatten, descendant pages re-bucket by the property with one GLOBAL bucket order and per-set composite collapse keys; a row dropped into another set's bucket writes property-then-move. Order labels: Select/Status = Default/Reversed/Custom, Date = Ascending/Descending + a Date By granularity row (default Month), Location = Custom/Location. Date group headings follow the column's applied date format (`formatBucketLabel`), with a Separation Dash/Slash footing under numeric formats; the Ungrouped Top/Bottom footing is one global knob for every ungrouped region (`empty_placement`'s semantics finally read, view-level). **Design:** Group By as an in-pane vertical disclosure, PickerControl rows (which gained icon options), the hierarchy disclosing each set's sub-group behind the sidebar's Reveal motion (hidden by default, hideChevrons-aware, chips draggable for the global sub-order), and ViewSettings-recipe footings whose pickers are the same shared PickerControl as the Order rows. **The list-outline rail went design-system-global** (`--list-outline-*` in theme-vars, shared by MarkdownPM's outliner + the pane); sub-bucket table headers sit at data-row rhythm (`--subband-gap-top`). Fixed en route: tableDnd's context froze the gesture's commit closures at mount (the `[drag.id]` memo) — the mutable config now rides a per-render ref.

#### Sidebar Ribbon (07-08-2026)

The single-tree sidebar became a **ribbon + mode-switched content column** (experimental branch). The ribbon is an icon strip pinned to the panel's left edge as a sibling *outside* the scrolling content, so scroll neither moves it nor crosses its divider — which also demanded its own `-webkit-app-region: no-drag` and traffic-light offset (the `.surface-glass` parent is a window-drag region). The ribbon is a surface launcher: each icon points at a surface living in a different pane. Homepage (the Nexus profile photo, pinned top) is a *selection* — it routes the main pane and leaves the sidebar mode untouched; **Collections · Contexts · Agenda** switch a new `sidebarMode`; **Navigation · Settings** are inert placeholders for future glass windows. `sidebarMode` + the drag-orderable ribbon order both persist synced in `personalization` (the generic setter; read-coerced with partial-order repair). Mode content is a plain swap, no animation: the design's cross-fade was built and cut ("terrible"); only the active mode renders. Agenda surfaces read-only via a lazy IPC, never the tree walk: a new `agenda:list` reuses the index builder's collect logic in a lean sibling, read only when Agenda mode is active — honoring "never expensive on every X" (folding it into `readNexus` was the tempting-but-wrong move). Rows are display-only (no agenda `SelectionState` kind yet). NexusHeader dissolved: its photo became the Homepage ribbon icon (`NexusPhoto`, right-click to change), and rename-nexus relocated to the homepage banner title (double-click → `renameNexus`, previously inert) — the consistent app pattern and where the name now lives; the subtitle is parked with an intent comment.

#### Icon Picker (07-08-2026)

The wired-but-stubbed `IconPicker` ("coming from Figma" placeholder) became the real picker: a left-aligned, non-autofocus search over the **entire Lucide set** (`design-system/symbols/AllSymbols` — all ~1,715 icons kebab-keyed via a converter validated against Lucide's own dist filenames, virtualized with TanStack Virtual), with a right-click **Favorite** and a drag-reorderable favorites strip. The picker is the full set, the curated registry stays the semantic vocabulary: `symbols/index` remains the app's named glyphs; the picker is a parallel wider surface, a pick stored as its bare Lucide kebab id (the same on-disk convention). Favorites persist def-level in `personalization.favoriteIcons` (the generic key-value setter; read-coerced in `readNexus`), the favorites strip a rounded divider-outlined box scrolling *with* the grid under one vertical `overflow-eclipse`. The right-click Favorite is the native Electron menu (`iconFavoriteMenu.ts`, mirroring `popOptionMenu`; resolves `'toggle'`, the renderer owns the write) — not a hand-rolled popover. The container moved from a centered-scrim `GlassPane` to the shared **`PickerMenu`**, which grew a horizontal (`left`/`right`) beak (a new axis-swapped `NotchedPane` path), a `center` straddle mode, `bareSurface`, and **auto-flip** — down is the preferred resting direction, yielding (to up, or a blocked side → down) only when the viewport forces it. One shared `setIcon` write: all six edit-icon sites are wired — page/container/context icons through a single `setIcon` mutate op (dispatched by kind: `.md` frontmatter for pages, JSON sidecar for the rest, mirroring `setBanner`), the property icon via its own registry `property:setIcon`, the view icon via the existing `views.save`. The `Icon` render path resolves any id (curated → full Lucide set → dashed-square), and `iconNameOr`/`folderAwareIcons` keep an arbitrary pick instead of dropping it to the default — so a picked icon shows on the sidebar, banner, and table title.

#### Number Property Editor (07-07-2026)

The `number` branch of the property editor became a **NumberEditor** pane, and — the load-bearing call — number **format** moved **def-level (property-wide)**: six fields on `PropertyDefinition` (`number_family` plain/percent/currency · `number_currency` · `number_separators` · `number_decimals` hidden-or-1–10 · `number_fraction` · `number_denominator`), written through one batched `property:setNumberFormat` IPC mirroring `setLinkConfig`. Format is def-level, look is per-view: the clean checkbox mirror (colour def-level, look per-view). The old per-view `number_format` enum was removed and its column-menu radios **repurposed** to the per-view **Number/Bar** look (`column_styles.look`, `'number'`/`'bar'` added to `COLUMN_LOOKS`), so a number cell's right-click menu stays populated. Percent stores the literal (`30` → "30%", never Intl's ×100) for file legibility. `formatNumber` was rewritten to read the def config (family · separators · Hidden/fixed decimals · "N out of Value" fractions); its sole caller is `Cell.tsx`. A new **ProgressBar** design-system component renders the Bar look — a rounded accent fill over a label-control track, `value ÷ Value` (fraction) or `value ÷ 100` (percent), no stroke pending a visual pass. The editor's Currency/Separators/Fraction/Value/Style rows reveal conditionally on the disclosure, and its Value row reads like the picker rows (secondary value + double-chevron, an in-place caret only on edit). A Bar-look cell edits its value through the link's **TextPicker** dropdown (reused, gaining an optional trailing adornment) with a right-pinned "/ N" out-of hint over the shared `overflow-eclipse` fade. Ring + the tile-grid Show-as are parked for view types with vertical room.

#### Checkbox Follow-Ups — Cell Sizing, Per-Style Column Min + Slide (07-07-2026)

The Switch cell scaled down (the Link pane's `zoom: 0.8`) and pinned to a stable height (`vertical-align: middle`, so a toggle never shifts the row). Column min-widths went **per-style**: a `STYLE_MIN` table widens a look that needs the room (a Switch checkbox; a status's Pill over its Capsule/Checkbox), resolved from the look with the type's default look as the no-look fallback. A style change that grows the min **slides** the track to it rather than snapping — One slide path for both writers: the Hide track transition reused, fired by a single render-phase look-change detection, so the column-header Style menu and the property pane both animate through it (no per-call-site trigger). The lead cell's Title indent is gated to left-aligned first columns: a centered checkbox/switch/chip moved before the Title clipped left because the loose-inset + group-nesting `padLeft` shrank its cell.

#### Icon Pass — Column Icons, View Glyphs, Aliasing (07-06-2026)

Column headers gained their type glyphs: `ColumnHeader` grew an icon slot fed by the property type (tier → context, Created → `clock-plus`, Modified → `history`), gated by the per-view `hide_column_icons`, which also became a **checkbox in the column right-click menu** (above the Hide divider) beside the Layout-pane toggle. The view-type grid glyphs were reworked: the Table glyph dropped the custom `rotate(90deg)` Table — **the sub-pixel-transform aliasing source** — for a plain Lucide `Grid3x2`; Cards became a custom stretch-horizontal bar stack; List a custom left-rail bar + four lines (sized to sit level with the Lucide glyphs); Status adopted Tabler's `IconProgressCheck` (the first `@tabler/icons-react` opt-in, through the same registry seam, scaled up ~10% since Tabler reads smaller). The type-grid aliasing was the alpha color, not the glass: a white-alpha label tone doubles where a glyph's own strokes overlap, and its soft edges read as fuzz, so the tile glyph switched to the opaque `solid.grey` primitive over the (kept) glass.

#### Date & Time Property Editor (07-06-2026)

The blank `datetime` branch of the property editor became a **Format** section — Date · a conditional weekday **Day** · Time picker rows — a second, discoverable surface writing the same per-view `column_styles` the column-header Style menu already did. The weekday split out of the `full` format into its own decoupled dimension (`long`/`short`/`none`, default off; `full` reshaped weekday-free to "July 6th, 2026"), its Day row disclosure-animated in only for the worded formats. A new **Relative** format renders "Today"/"3 Days Ago"/"2 Weeks from now", Time-gated to append the clock within a week then drop it; the CalendarPicker entry boundary coerces `relative → short` so a date being entered never reads relative. The per-view write threads the node, not the schema path: for a depth-1 Set, `PropertiesPane` gets the schema-owning ancestor's `collectionPath` but must write the *selected* container's active view, so the editor threads `source = node` + `useActiveView` and writes through the one `saveViewAdopting`. datetime columns default-center; date cells read `label-control`. Same session's UIX pass: PickerMenu options set their own `control`-tone type (they portal past label context — was rendering UA-black), the exit animation stays owned by PickerMenu (a call-site `open &&` guard had been unmounting it), property editors gained a title divider, the Properties-pane tone hierarchy settled (assigned primary › unassigned secondary › section headings tertiary), the `MenuScrollFrame` consolidation's dropped flex-column got restored so the All-Properties spacer bottom-pins again, and PaneSlider stopped lag-chasing an in-place resize (height eases only across a nav flip). The **Checkbox editor** then followed the same pattern — a property-wide colour (def-level `checkbox_color`, ON-state only, defaulting to the configured accent via `var(--accent)` so the box matches the switch) over a per-view Checkbox ⇄ Switch style, sharing the extracted `PickerControl`; Column Icons flipped to default-off.

#### Multi-View Scaffolding (07-06-2026)

The saved-view data layer got its face: the ViewPane→**SettingsPane** rename, a per-container **ViewDropdown** switcher left of the toolbar trio, the **ViewPane** navigation dropdown (view rows · switch · create), and the shared two-door **ViewSettings** editor (a row's chevron = the full door with ⋮ Duplicate/Delete; SettingsPane→Layout = the flat door) with a 3×2 type grid and a Table Format control (Standard / Compact — removed 08-05-2026, never having driven the table; `format` lives on as the cards density). Configuration gained the collection's **Open In**. The type roster went **five→six** (Table · Cards · List · Gallery · Calendar · Timeline; Board dissolved into a Cards format). Views are never empty where views can be seen: two enforcement sites — creation-seed (an app-created container is born with its default view on disk) and entry-mint (the store's `select`, the SOLE mint site, mints on first entry of an empty view-bearing container), every other writer *adopt-only* through one `saveViewAdopting`. The file lock guards every view write: `views:save/reorder/delete` and the per-machine `activeViews`/`viewOrders` pointer writes joined `serializeOnFile`. One menu source: the icon-button recipe, row tones, and the TopRow/BottomRow schemes consolidated into `menu.css` (the `AccessoryButton` primitive + `MenuPaneTopRow`/`MenuBottomRow`), and the returning-native-menu plumbing into one `popReturningMenu`. New synced sidecar keys: `view_button`, `view_style`, `format`; `open_in` renamed `full-page | page-preview` with legacy coercion.

#### The Watcher Walk Goes mtime-Gated (07-06-2026)

The live-refresh read path stopped re-parsing the world per fs event. The watcher walk now runs through a parse cache in main (`walkCache.ts`): every directory is still enumerated and every file statted — each walk stays a full verification pass, so tree-vs-disk drift is unrepresentable — but file reads + YAML/JSON parses run only for entries whose `(mtime, size)` moved. Entries a walk doesn't touch are pruned (deleted files can't linger); a racy-window rule re-parses hot files so coarse-mtime volumes can't serve stale hits; a root switch drops the cache. Verification-walk over event-application: the call weighed three architectures through outside research (Obsidian, VS Code/Zed, Syncthing/git/Maestral) plus paired for/against adversarial reviews. Pure event-application was rejected outright — Pommora's tree is fully materialized, so a missed event never self-heals, and the event applier would re-implement the reader in reverse. Container-surgical reconcile is **held, not rejected** — the designed escalation if measured scale outgrows the stat sweep, with this walk as its fallback + verify pass. Same session: the watcher learned the user's `excluded_folders` at intake, and the sidebar drag gesture moved its listeners to the window so a mid-drag tree push can't orphan the drag (the freeze / no-drop / wedged-gesture family).

#### Page-Write Lock Unification (07-04-2026)

Every write to a page `.md` now serializes on ONE per-file lock. The schema-op page cascades (Select/Status option rename·remove·clear, the `[[link]]`-rename + tier-unlink cascades, property Delete and Remove/restore) had ridden `SchemaTransaction` on a *separate* lock from the cell-write path's `serializeOnFile`, so a cascade racing a table-cell edit on one page could silently clobber a value (the F1 race). One lock for all page writes: `serializeOnFile` (hoisted to `io/fileLock`, reading fresh INSIDE the lock so no stale snapshot lands) now guards the cascades, `setProperty`/`setTier`, the editor-body autosave, and the banner write alike; `SchemaTransaction` stays only for Agenda (pure JSON, never on the cell path). Cross-page atomicity traded for per-file recoverability — Delete keeps its `.trash` snapshot, Remove keeps cache-before-strip. The lock key is the canonical path: `openSession` realpaths the root so the cascade and cell-write keys match on symlinked-root ancestries (an adversarial round caught them silently diverging on `/var`→`/private/var`); canonical stays on the in-process locks, while persistence + display keep the RAW user path (iCloud-`~/Documents` robustness).

#### Views + View Settings (06-27-2026 → 07-03)

Callouts, then the portable **SavedView** engine — a filter → group → sort pipeline with multi-key sort and recursive filters which fed the Table renderer. The view-settings dropdown then grew its panes over that pipeline: the **Properties** assign surface (the UI for the nexus-wide registry below — assign-existing, inline Rename, Remove vs global Delete, every pane push sliding on a nested `PaneSlider`) and the **Visibility** pane (`HiddenPane`). The Visibility shape: contexts on top (grid icon, ghost-in-place) over one heading-less shown/hidden list; hiding flags-only so `property_order` remembers the slot; a drag between zones carries the language — a drop-line into the shown zone, an area-highlight into the hidden.

#### Tables Interactive (06-30-2026 → 07-02)

The table's full interaction layer. First the per-type cell gesture matrix — the title navigates, every value cell owns its click through the shared picker/editor surfaces — with per-view column styles and the overflow model (fixed tracks, the whole view h-scrolls past the pane rather than compressing). Then **band drag**: group bands reorder per-view by their glyph and Set bands reparent across the tree as real folder moves, with Esc aborting every drag surface. The chip **hover-× melt** rode along — an opacity-only reveal forced by a Chromium repaint family (laws + re-verify matrix → [[Build-Gotchas]]). Band order is manual-only, view-owned: structural order lives in the view's `group_order`, property order in `group.order` + `order_mode: 'manual'`; the filesystem moves only on a cross-tree reparent; there is no "None" band.

#### PropertiesV2 — Definitions Go Nexus-Wide (07-01-2026)

The property data layer's paradigm shift. Property **definitions** moved from per-Collection sidecars into one nexus-wide registry at `.nexus/properties.json`, and a Collection's sidecar now holds a flat **assignment array** of prop-ids — joined ids→defs on read, so the renderer and view pipeline never changed. That release left values `prop_<ulid>`-keyed in frontmatter, so it needed no page migration, and cross-Collection moves become adopt-don't-strip by construction, unlocking cross-Collection queries. One fully-shared definition + options per property — divergent needs make a *new* property, never forked options; **Assign is an unvalidated, idempotent reference** while Create validates names registry-wide; global **Delete** is the one fan-out op — a timestamped `.trash` snapshot, then a single atomic transaction strips every assigner; registry mutations serialize through one chain (a review-caught lost-update race). **Remove strips each member page's value and caches it restorably** on the Collection sidecar, re-assign reconciling against the def's *current* type + options — no dormant foreign values on pages.

#### Chrome, Footer, and Inspector (06-25-2026 → 06-26)

The Subfield footer — a depth-aware breadcrumb plus per-view stats. The glass split into **two materials**: Apple "Liquid Glass" for controls, the CSS frost for everything else. And the Inspector pane with the toolbar trio's "swallow" animation on one frame-synced progress. Plus the drawn caret, list drag-to-reorder by the glyph, and the arrow/plus list flavors.

#### The MarkdownPM Editor (06-20-2026 → 06-25)

The dynamic-syntax editor on a CodeMirror 6 substrate — Markdown markers show as raw source on the caret line and render styled when the caret leaves, the behavior layer framework-free and unit-tested. Joined by the page banner (`cover` frontmatter) plus a shared icon/title header, heading folding, and a native context menu — then full interactive GFM table editing (a widget over canonical pipe-table source, every cell a live nested editor, reorder and resize through hover grips).

#### Glass, Drag, and the Design System (06-17-2026 → 06-19)

The shipped glass material — a CSS frost that adds its own light, chosen over refractive libraries in a comparison lab — plus native window chrome. The in-house PommoraDND drag engine, built and proven in a standalone Interaction Lab with `@dnd-kit` retired. A hash-routed design-system showcase over opacity-derived color and tint primitives. And the first real surfaces: the sidebar insertion-line drag adopted app-wide, and container views (Collection tables, Context + Homepage) behind banners.

#### Headless Data Layer + Desktop Write Path (06-15-2026 → 06-16)

The entire write/mutation side built tests-first, no UI: CRUD for every entity, the property schema engine, the `[[connection]]` + tier-relation engine, a SQLite mirror, and Agenda — plus the navigation + view-pipeline spine (filter → group → sort) behind placeholder renderers. Roughly 72% less code than Swift's data layer, with comment-preserving writes and index-independent link resolution falling out for free. Then it became a real Mac app: native folder pickers + menu bar, the single path-guarded `mutate` IPC, New Page ⌘N end-to-end, and a live full-refresh index.

#### Genesis → Walking Skeleton (06-14-2026 → 06-16)

Spun up from the rebuild exploration with scope locked to the **core 7** (data · properties · connections · markdown · navigation · table · gallery) and the on-disk format modernized TS-native, built and tested against a throwaway nexus at `~/test`. The first slice was a read-only walking skeleton — one nexus walk (`readNexus`) over IPC into a Zustand store, rendering a recursive glass sidebar. Settled as one repo on one `main`, React living under what is now `Pommora/`, byte-compatible on disk with the Swift build so a nexus round-trips across both.

#### Swift Origins — The Paradigm's First Build (05-16-2026 → late June)

The whole domain paradigm was designed and versioned in a native SwiftUI build over roughly six weeks — paused, not deleted; source and docs are archived at `// The Studio // Archive // Pommora` (git history on the `swift` branch) and its on-disk decisions carry into React unchanged. **Why the line moved:** SwiftUI friction plus Claude's large capability gap between Swift and TypeScript; React was a contingency built to parity alongside late Swift, then became the primary build. Mined to milestones:

- **v0.0.0 → v0.1.0 — Foundation.** The shell (two-column split view + inspector, resizable panes), then the Nexus foundation: sandboxed folder picker, security-scoped bookmarks, `.nexus/` init. `.md` locked as the portability firewall after the editor-library exploration (Tiptap/WKWebView → Milkdown → native).
- **v0.2.x — Paradigm Scaffolding + Editor.** Every entity Codable + validator + `@Observable` manager, CRUD end-to-end under Swift-6 strict concurrency; the native **TextKit-2** editor with dynamic-syntax construct passes; Obsidian-parity folder adoption; Navigation. **ParadigmV2 + Flat-Layout:** Vault became Pages-only, AgendaItem split into Task + Event, per-kind sidecars moved to the nexus root.
- **v0.3.0 → v0.3.5 — Properties + Connections.** The property system feature-complete: 11 types, tagged `PropertyValue`, atomic `SchemaTransaction`, a GRDB index (rebuildable cache, files canonical). Then View-Settings chrome, a native IconPicker, **Contextv2** (user relations dropped — the three tiers are the only relation), and **Connections** — `[[Page Title]]` with a rename cascade and nexus-wide title uniqueness.
- **v0.4.0 → v0.4.2 — Contexts, Sets, Views.** PagePreview as a real `NSPanel`; the tiers **decoupled into free-standing Areas / Topics / Projects**; the **Set** tier (schema-less folders in a Collection); and **Views** — SavedView v2 feeding a filter → group → sort pipeline into Table + Gallery, plus the grouping redesign.
- **Late-Swift Hardening (06-18 → 27).** A live FSEvents **file watcher** (stamp-on-first-sight ULIDs for external `.md`s); the Nexus header + Homepage banner; a codebase-health refactor; **Collections / Sets / Sub-Sets** — the Pages model collapsed to a schema-bearing Collection + a recursive Set nesting to any depth; `modified_at` made frontmatter-canonical; and settings writes made symmetric so Swift and the nascent React build stop clobbering each other.
