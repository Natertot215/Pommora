## Feature-Doc Audit — Findings

The record of a full audit of all 26 feature docs against the code: one agent per doc, each finding re-verified by an adversarial pass that reopened every cited file:line. 440 findings survived; 78 were rejected as the doc being right, taste rather than error, or load-bearing detail wrongly called over-exposition.

Findings are claims to act on, not settled truth — ground each against the code before folding it.

# Pommora Documentation Audit — Merged Report

## 1. Docs With False Claims

Ordered by severity of the error, worst first.

---

### Cross-Cutting (one fact wrong in multiple docs)

#### A. The Contexts registry never seeds — a fresh Nexus has no Contexts and can't create one
**Docs:** Structure.md, Configuration.md, Contexts.md, project CLAUDE.md
**Claim:** "the registry seeds Areas, Topics, and Projects as ordinary entries" / "the entity labels seed the Context registry's titles at migration"
**Code:** `seededRegistry` (`Pommora/src/shared/contexts.ts:71`) is called only from `readRegistry` (`Pommora/src/main/contextsRegistry.ts:24-35`), whose sole importer is `contextsRegistry.test.ts:5`. `prepareOpenedNexus` (`Pommora/src/main/index.ts:555-566`) runs only ensureIdentity + ensureSettings + stampAdopted. `walkNexus` returns `contexts: []` (`readNexus.ts:476-481`). Worse: `createContextGroup` (`crud/contextWrite.ts:240`) opens with `readRegistryStrict`, which returns `not-found` on a missing file (`io/atomicWrite.ts:63-70`) — so "New Context" also fails.
**This is a live bug, not a doc fix.** → needsNathan #1.

#### B. Seeded and user-minted Contexts both carry ordinary ULIDs — no reserved `_tier1/2/3` ids exist
**Docs:** Contexts.md, Properties.md
**Claim:** "The seeded three keep reserved ids that anchor legacy resolution" / "the seeded three keep the reserved `_tier1` / `_tier2` / `_tier3` ids"
**Code:** `seededRegistry(labels, mintId)` maps to `{ id: mintId(), … }` (`shared/contexts.ts:71-83`); its production caller passes `newId` (`main/contextsRegistry.ts:32`), the same minter `createContextGroup` uses (`crud/contextWrite.ts:251`). `RESERVED_PROPERTY_ID` (`shared/properties.ts:135-145`) has seven entries and none is a tier — it does carry `_location`, which Properties.md omits.
**Rewrite:** "Every entry carries an ordinary minted ULID, seeded and user-created alike, and nothing resolves a Context by a reserved id." Properties.md's reserved list becomes `_id, _title, _created_at, _modified_at, _status, _type, _location`.

#### C. The SQLite index has no query consumer — nothing round-trips, filters, sorts, or groups through it
**Docs:** Properties.md (×2), Pages.md, Collections.md, PageSets.md, Connections.md, Architecture.md
**Claims:** "values round-trip on disk and through the index" · "keeping filter, sort, and group queries off the file read path" · "the SQLite index mirrors it for fast queries" · "search, connections, and relations include them inherently"
**Code:** the only production SELECTs in `Pommora/src/main` are the schema-version handshake (`main/index/schema.ts:130-132`). `sessionDb()` (`main/sessionIndex.ts:18`) has no caller outside its own test. The live pipeline is renderer-side over frontmatter (`renderer/src/Detail/Views/pipeline/value.ts:79-127`). `Architecture.md:91` already states it correctly.
**Rewrite:** everywhere, "mirrors into the index, staging the shape a query facade would read. The index has no query consumer yet."

#### D. `page:updateBody` never refreshes the index — the one link-bearing channel is outside the refresh contract
**Docs:** Architecture.md, Connections.md
**Claim:** "Writes are atomic and update the index" / "refreshed on every in-app create, edit, delete, and rename"
**Code:** `main/index.ts:690-711` writes under `serializeOnFile` and returns. `refreshSessionIndex` has exactly one call site nexus-wide: `main/mutate.ts:160`.
**Rewrite:** "The index refreshes on `mutate` ops only — a body autosave lands on disk without touching it."

#### E. `isGovernedContextKey`'s `tierN` branch + the stale readNexus comments
**Docs:** Architecture.md, Contexts.md, Collections.md, Pages.md, PageSets.md, Properties.md, Sidebar.md
**Code:** `shared/contexts.ts:33-35` matches `/^tier[123]$/`. `readNexus.ts:204` ("bracketed root keys plus the legacy tierN arrays") and `:526` ("bracketed keys override a legacy tierN") describe retention/precedence `retainContextKeys` (`:209-218`, keeps only `parseContextKey(k) !== null`) doesn't implement. `readNexus.ts:474` ("the open path migrates + seeds") describes machinery that doesn't exist — no migration anywhere in `src`, and the seeder is orphaned (see A).
**Note — two audits disagreed on impact.** Architecture's and Properties' auditors traced silent data loss via `mergeFrontmatter` (`io/pageFile.ts:61-64`); Pages' and Contexts' auditors traced the rewriters and found `tierN` always survives (`contextResolve.ts:64-67` copies non-bracketed keys through; `contextCascade.ts:47-51,146,164` spread `{...raw}`). **Pages'/Contexts' tracing is more specific and is the one to trust** — the real cost is unnecessary YAML re-serialization, not deletion. Structure's auditor separately argues the branch is load-bearing legacy *sweeping*. Drop it only after confirming no legacy nexus needs the sweep.

---

### Architecture.md — 16 false claims, the highest count and the most structural

| Claim | Code | Rewrite |
|---|---|---|
| `.trash/<Type>/<Page>.md` "preserves original relative path" | `io/atomicWrite.ts:153-163` — `join(trash, \`${stamp}__${base}\`)`, flat; its own comment says "The original's relative layout is not preserved." | `.trash/<stamp>__<Page>.md` — flat + timestamped. → needsNathan #3 (PRD:97 makes the same promise) |
| "deleting a Collection or Set does **not** delete its child Pages — they move up a level" | `index/schema.ts:45-46` — `page_collection_id … ON DELETE CASCADE`. And no cascade ever runs: only two `DELETE FROM` in the repo (`index/upsert.ts:169,201`). | "There is no per-entity index delete. A mutation drops the whole index and rebuilds it." |
| Schema transaction = "validates the full set, then applies in dependency order with rollback" | `io/schemaTransaction.ts:41-86` is a two-phase temp-then-rename commit, no validation phase, no ordering. Its cited example (`crud/deleteProperty.ts`) doesn't use it at all — `:5-7` "Per-file, not cross-file atomic." | Describe the two-phase commit; note the nexus-wide delete deliberately opts out. |
| Settings carry "`defaultsVersion` + step-function migrate scaffold" | `main/settings.ts:21-24` — key is `defaults_version`, mirrors Swift's value so Swift's migration no-ops. `ensureSettings` (`:57-75`) backfills missing keys only; no step table anywhere. | Pommora runs no settings migration of its own. |
| "each Pommora-written Type sidecar carries a `schema_version` (missing = 0)" | `crud/folderEntity.ts:37` writes `{ id, ...extra }`; neither caller passes it. `index/upsert.ts:28,52` defaults missing to **1**. | `nexus.json` carries the nexus schema version; sidecars accept an optional one Pommora doesn't write. |
| "Internal `.nexus/` Context reads never consult [the exclusion list]" | `readNexus.ts:361-377` calls `shouldSkipDir` for every Space folder. The matcher is root-anchored (`exclusion.ts:25-34`), which is what limits it — not an exemption. | The filter applies; root-anchoring is the limit. |
| "body connections in a page-only `connections` table" | `index/upsert.ts:192-228` — `replaceConnectionsFor` serves both `replaceConnections` ('page'/'page_body') and `replaceBlockConnections` ('block'/'block_body'). | `connections` carries both page-body and markdown-block sources. |
| `state.json` = "security-scoped bookmark + recent-nexuses" | `main/appConfig.ts:18-32` — file is `pommora.json`, `{ lastNexusPath?, recents?, trashMode? }`. Case-insensitive grep for "bookmark" across `src` → **zero hits**. (Same error again at doc line 19.) | `pommora.json` — last-opened path + recents + trash mode. Drop "(security-scoped bookmark)". |
| `state.json` = "open tabs, sidebar UI, Recents" | `crud/reorder.ts:32-69` — only writers are `setStateOrder` (`collection_order`) and `setSpaceOrder` (`space_orders`). Tabs/Recents/folds are separate files (`paths.ts:63-87`). | top-level ordering only. |
| "the retired `_pagetype.json` is converted … by a one-shot migration on first open" | Grep for `pagetype`/`pageType`/`PageType` across `src` → **zero hits**. The only open-time write pass is `stampAdopted` (`adopt.ts:85-117`). | A root folder holding content but no `_pagecollection.json` gets one written at open. |
| "Preview-before-commit shows per-Collection counts + warnings" | `index.ts:555-567` runs adoption unconditionally in try/catch and discards the result. No adoption surface in the renderer. | Adoption runs silently, best-effort. |
| "every sidecar-bearing sub-folder is a Set" | `readNexus.ts:265-281` — no sidecar probe below the root; the gate is at `:497-500` only. | Below the root, position alone decides. |
| `_pageset.json` "views[] (depth-1 Set)" | `readNexus.ts:283-308` — one `readSet` reads `views`/`banner` at every depth; consumers take the node without a depth test (`viewMint.ts:47-52`, `TableView.tsx:112-125`, `ViewPane.tsx:88`). Same wrong claim in the code at `shared/schemas.ts:61-63`. | Set sidecar at any depth, with its own saved views. |
| "DDL is canonical in PRD § SQLite Schema" (stated 3×: lines 3, 85, 146) | The PRD has no SQLite section. DDL lives at `main/index/schema.ts:17-119`. | DDL is canonical in `src//main//index//schema.ts`. |
| "`// rules//MarkdownPM.md`" | No `rules` directory; file is at `.claude/Features/MarkdownPM.md`. | `// Features//MarkdownPM.md` |
| exclusion filter "`..`-escape rejected" | `main/exclusion.ts:5-34` — no `..` handling exists. | Whole-segment, case-insensitive, NFC, root-anchored. |

---

### Properties.md — 11 false claims, several user-visible

| Claim | Code | Rewrite |
|---|---|---|
| Remove/restore "commit atomically across every affected file … rolling back the whole set" (stated twice: prose + the Schema Mutations table) | `crud/removeProperty.ts:41-77` — snapshot, sidecar write, then a plain per-file loop. No SchemaTransaction. `deleteProperty.ts:5-6` says the same of the global delete. | Recoverable, not transactional: values cached before any page is touched. |
| "a Select / Multi-select / **Status** carries at least one option" | `main/properties/schema.ts:57-83` — the option check is gated to select/multi_select; Status is never validated. `schema.test.ts:85` — "allows a zero-option select (no floor)." | No minimum count; Status isn't option-validated. |
| Select/multi chips "always render as pills" (stated 4× — here, Type Catalog, §Select, option-editor) | `Components/Chip.tsx:18-27` — `chipShapeForType` returns `pill` for status, `label` (squared) otherwise. | The squared label shape; the pill is Status's alone. |
| Status seed `in_progress` = "cobalt" | `shared/properties.ts:169-190` seeds `color: 'blue'`; "Cobalt" is the label for `lightBlue` (`tokens/colorMap.ts:31`). | `blue` |
| `modified_at` "falls back to the file's mtime when absent" | `pipeline/value.ts:115-127` returns the stamp or null — no stat. The `created_at` fallback is sort-only (`:129-141`). | Column shows the stored stamp; sorting falls back to `created_at`. |
| "Creating (the header's top-right `+`)" | `PropertiesPane.tsx:483-497` — the `+` is `MenuBottomRow`'s **leading** slot (`Menu.tsx:248-255`), i.e. the pinned bottom row's left. | the `+` in the pane's pinned bottom row |
| Per-type editors pending = "the relation (context) pickers" | `PropertyTypes.tsx:18-28` — `context` isn't creatable, so no user property can be typed it. The one creatable type with a blank editor is **File** (`PropertiesPane.tsx:420-477` falls to `<div style={{minHeight:8}}/>`). | The one type without an editor body is File. |
| Status "built-in and non-deletable on Tasks and Events" (also Agenda.md) | Nothing seeds it (`crud/folderEntity.ts:22-39`), nothing guards it (`crud/schema.ts:191-209`). `isReservedPropertyId` gates adds only (`properties/schema.ts:64`) — which means `addAgendaProperty` would *reject* `_status`. | → needsNathan #2 |
| Number editor "1–10 places", option colors "all ten `colors.css` solids", ColorPicker "2×5 grid" | `colors.css` **doesn't exist** (`find` returns nothing) — the solids live in `tokens/color.css.ts` + `chip.css.ts`. `CHIP_SOLID_COLORS` (`shared/types.ts:43-54`) is ten today with nothing pinning it. | Name the palette, drop the counts and the stale filename. |

---

### Connections.md — 10 false claims, mostly user-visible behavior

| Claim | Code | Rewrite |
|---|---|---|
| A partly-applied rename cascade "leaves the remaining bodies pointing at the old title … rather than rolling back" | `main/mutate.ts:210-233` — on cascade failure it *does* `renamePage(…, oldTitle)`. The un-rewritten bodies are the correct ones; the **already-rewritten** ones become phantoms. | Names the healthy side as damaged — invert it. |
| "scanning every markdown file in the nexus" | `crud/cascade.ts:18` skips `.nexus`/`.trash`; `:36` skips id-less files. Block bodies are healed by a separate best-effort pass (`blocks.ts:350-353`, `mutate.ts:228-232`) whose failure is swallowed. | Two passes with different guarantees. |
| A resolved connection "a single click navigates" | `Detail/PageView.tsx:26,37-44` — a plain click branches on `connectionsOpenInPreview`; plus ⌘-click, hover (450ms), and right-click menu (`editor/connections.ts:39-83`). Same in `BlockSurface.tsx:154-167`. | Four gestures; the plain click is knob-routed. |
| "Ambiguous and phantom connections render as inert literal text with brackets visible" | `editor/decorations.ts:240-253` — only `phantom` returns early. Ambiguous gets `md-connection-ambiguous` (`Styles.css:333-335`, muted) with brackets hidden at rest; it's inert on click, not raw. | Only phantom renders literal. |
| "Typing `[[` opens a search-filter panel **above** the caret" | `autocomplete.ts:36-44` anchors **below**, flipping above only near the viewport bottom. `connections/index.ts:67-68` returns `[]` on an empty query. `:71` is `.startsWith(q)` — prefix, not search. | Three errors in one sentence. |
| "goes live the moment a single matching Page appears" (also **MarkdownPM.md** § Non-Obvious) | `editor/decorations.ts:271-276` — rebuild fires only on docChanged/selectionSet/focusChanged/viewportChanged. The connections value arrives via a ref (`index.tsx:102-103`) with no dispatch on change. | Goes live on the editor's next doc/caret/focus/scroll update. |
| "a Page can't link itself" | `connections/index.ts:59-65` — `resolve(rawTitle)` takes no source page, so a self-title resolves normally. Only autocomplete (`index.tsx:118-122`) and the index (`build.ts:361-364`) drop it. | Nothing *offers* it, but a hand-typed self-link resolves and navigates. |
| "no piped form, embedded id, or alias" | `shared/connections.ts:32` matches and discards `(?:\|[^\]\r\n]{0,255})?`; `Tables/cellStatic.tsx:38-40` renders the tail as plain text. | → needsNathan #4 |
| "`![[ ]]` and `{{ }}` are unsupported — both render as plain text" | `{{ }}` is right. `![[ ]]` is a first-class `imageEmbed` token (`detect/index.ts:4`, `tokens/index.ts:147-152`, `decorations/intent.ts:168-176`, `Styles.css:339-342`) — styled, markers hidden at rest. | `![[ ]]` takes the image treatment. |

---

### TableView.md

| Claim | Code | Rewrite |
|---|---|---|
| "Structural-group members lose their nesting indent once a row precedes them" (a Known Issue) | `TableView.tsx:1288-1299` — `memberIndent(itemDepth)` never reads the map's `i`. The `i === 0` gate at `:1584` is the **column** index. **The described bug has no code path.** | Remove the entry; re-diagnose if a real misalignment was seen. |
| "every type is uncapped; only the legibility mins clamp" | `columnWidths.ts:20-36` — only `title` and `FALLBACK` are UNCAPPED; eleven types carry finite maxes, enforced by `clampWidth:80-88`. The code comment at `:17-19` asserts the doc's version *with attribution to Nathan*, three lines above the table that contradicts it. | → needsNathan #5 |
| "`Table.css` carries no raw values" (stated 3×, incl. `table-tokens.css:3`) | Sixteen raw declarations: `Table.css:87,88,350,430,431,435,439-441,445,446,449-451`, incl. literal `#00000073`. | Every table *dimension* routes through a knob; a few one-off chrome values stay inline. |
| "The built renderer of the five view types" | `shared/views.ts:22` — six types. `ViewRenderer.tsx:17-21` — Cards draws too. Views.md:5,60 says so. | One of two built renderers behind six modeled types. |
| "link/file add Edit" to their column Style radios | `shared/cellMenu.ts:74,126-138` — url routes to kind `link`, which returns **no** Style at all; a filled link is Edit·Rename·Clear. Only file matches. | |
| "the title gets Rename · Change Icon · Delete" | `shared/pageMenu.ts:10-15` leads with Open / Open in New Tab. | |

---

### Views.md

| Claim | Code | Rewrite |
|---|---|---|
| "the live watcher's stabilized push is the canonical confirm (a view save never walks the tree)" | `watcher.ts:92` — `if (isRecentWrite(path)) return`; `io/writeEcho.ts` records every atomic write. `saveViewAdopting` (`viewMint.ts:52-72`) awaits `refetch()` → `store.load()` → `window.nexus.state()`, a full walk. **Exactly inverted.** Same stale claim at `TableView.tsx:158`. | The explicit refetch is the confirm; self-writes are echo-suppressed. |
| Grouping pane is "table views only" | `SettingsPane.tsx:290` / `ViewSettings.tsx:233` both mount it for Cards with `subGrouping={view.type !== 'cards'}`; `GroupingPane.tsx:250` adds a cards-only **None** row. Views.md:56 contradicts Views.md:37. | Shared by Table and Cards. |
| View editor holds "the view's icon + name" and three Table leaves | `ViewSettings.tsx:258` passes no `icon` → dashed-square on a dead button. `LEAF_ROWS` (`:74-79`) is four: layout·group·**filter**·sort. | |
| "The pane always shows one blank lead row … cannot be removed" | `FilterPane.tsx:824` — `lead = rows.length === 0`, empty state only. What's permanent is the last *authored* row (`:806`, `rows.length > 1`). | |

---

### CardView.md

| Claim | Code | Rewrite |
|---|---|---|
| "Cross-band drops are a follow-up" (also listed under Prospects) | `CardsView.tsx:413-432` — ships: `movePage` under `canRelocate`, `setProperty(row, groupPropId, …)` under `canReassign`; `:479` arms `crossZone`; `CardsView.css:92` keeps a 44px floor so empty bands receive. | Describe the shipped write. |
| "each interactive value stops the drag's pointer capture" | `group.tsx:562-565` — window listeners, **not** capture, deliberately ("capture would retarget a no-move tap's click"). A value marks `data-drag-slop` (`CardValue.tsx:162`) raising activation to 12px. The handle spreads onto the card root (`:1044`), so it drags from everywhere; thumb/title gate the *open* click (`:1052-1058`). | |
| Card menu = "Open · Rename · Change Icon · Delete + Add Property ▸" | `main/cardMenu.ts:50-52` also inserts **Move To ▸** (`CardsView.tsx:980-993`, `buildMoveTargets:609-613`). | |
| Chassis "is shared with the Navigation gallery card" | Only `hover-pop` is shared (`styles.css:72`). `.nav-gallery-card-body` and `.page-card-body` are independent rules; the gallery holds `aspect-ratio: 125/90` (`navGallery.css:37`), `.page-card` holds none. | Starts from the gallery's values. |
| Add-picker opens "from a **Compact** card's empty flow space" | `CardsView.tsx:750-777` passes the same guarded `zoneClick` to both Compact and Standard branches. | Any empty space in the text area. |
| "Sort By: Location … disables [the drag]" | `CardsView.tsx:390-393` — `cardDragEnabled = canReorderWithin \|\| canReassign \|\| canRelocate`; only the within-band reorder retires. | → needsNathan #6 |

---

### Sidebar.md

| Claim | Code | Rewrite |
|---|---|---|
| "named groups **above** the ungrouped Collections" | `Sidebar.tsx:665-693` emits `tree.collections` first, `userSections` after. | below |
| "Pages reparent across the tree" (Sets omitted) | `sidebarDnd.tsx:220-262` is a dedicated Set-reparent branch committing `moveSet`. PommoraDND.md:40 already says so. | Both Pages and Sets reparent. |
| Selection "reads as a … **quaternary-fill** pill" | `Menu.tsx:47` → `menu.css.ts:82-85` → `c.state.selected` = greyA 5% (`color.css.ts:76`); `fill.quaternary` is 6% (`:69`) — different group, different value. | the shared selected-state fill |
| "The mode icons reuse each kind's own entity icon" | `Ribbon.tsx:44-49` — only Collections/Contexts route through `defaultEntityIcon`; agenda/nav/settings are `STATIC_ICON` literals (`:18-22`). | |
| user-minted Contexts "read flat 'New Space'" | `crud/contextWrite.ts:252` seeds `singular: title`; schema requires `min(1)` (`shared/contexts.ts:18`) — the fallback is unreachable. Also Contexts.md. | → needsNathan #7 |

---

### Collections.md

| Claim | Code | Rewrite |
|---|---|---|
| "Removing a property unassigns it non-destructively — values stay in page frontmatter" | `crud/removeProperty.ts:48-76` — caches values on the sidecar, then `stripPageMember` **deletes the frontmatter key** on every member (`crud/schema.ts:55-67`). A page with no frontmatter `id` is stripped but never cached (`:59-61`) — unrecoverable. | Values lift into a restore cache; re-assigning replays what still validates. |
| Global delete "atomic across every assigner" | `crud/deleteProperty.ts:5-7,59-96` — per-file loop, `.trash` snapshot as the net. | |
| "Creating a Collection seeds a name and a fresh ULID **only**" / "an empty sidecar" | `mutate.ts:192-194` always seeds `extra.views = [mintDefaultView…]`; a Set also gets `parent_id`. | id + default view (+ parent_id for a Set). |
| "Validation rejects an invalid or colliding folder name" | `mutate.ts:133-147` — `createDisambiguated` retries `base 2`… up to 50. Strict on rename only (`crud/folderEntity.ts:49`). | |
| "reached from the view-settings dropdown's Properties pane" | Properties is a `SettingsPane` leaf (`SettingsPane.tsx:56,258`) behind the toolbar's Settings trio (`Toolbar.tsx:104-110`). `ViewDropdown` carries no Properties pane. Collections.md:28 already names the right surface. | the toolbar's Settings dropdown |

---

### PageSets.md

| Claim | Code | Rewrite |
|---|---|---|
| "`parent_id` (its immediate parent)" | Written only at create (`mutate.ts:188-191`) and at mint-time adoption (`adopt.ts:51`, guarded by the early return at `:47`). `moveFolderEntity` (`crud/folderEntity.ts:61-73`) is a bare `rename` — **a move never updates it**. Nothing reads it. `mutate.ts:71` claims "both builds heal parent_id from it" — false for React. | → needsNathan #8 |
| "Sub-Sets (depth-2+) are expand-only … no detail view" | True of the sidebar only (`Sidebar.tsx:414-423`). `navSearch.ts:33` indexes every depth; `DetailPane.tsx:49-58` mounts a full `ContainerView` for any `set`. `Scope.ts:73-75` shows this is knowing tolerance. | → needsNathan #9 |
| a Sub-Set's "`views` go dormant — no longer rendered" | The gate covers the switcher (`ViewDropdown.tsx:26-32`) and the mint (`store.ts:1546-1548`), not the render — `pickView` has no depth parameter. | Stop being *offered*, not rendered. |
| "the same generic folder-entity CRUD as Collections and **Contexts**" | `createContextGroup` (`crud/contextWrite.ts:235-259`) writes the registry + a bare `mkdir`; `createSpace` (`:275`) is the one calling `createFolderEntity`. `MutableContainerKind` is `'collection' \| 'set'`. | …and **Spaces**. |
| delete "to `.trash`" | `mutate.ts:619-626` branches on `trashMode` (`appConfig.ts:13-16`); Configuration.md:57 owns the setting. | the configured delete target. |

---

### Pages.md

| Claim | Code | Rewrite |
|---|---|---|
| "The loader never writes back … opening an Obsidian vault leaves notes byte-identical until touched" | `prepareOpenedNexus` (`index.ts:555-567`) runs `stampAdopted` on **both** open paths (`:595`, `:2138`); `adopt.ts:29-35` writes a fresh ULID into every id-less `.md`. Preservation is real, byte-identity isn't. | → needsNathan #10 |
| "A missing `id` is synthesized … stable across launches" | `ids.ts:32` is deterministic, but adoption stamps before the walk, so the placeholder survives only for files adoption skips (`adopt.ts:69,90-105`). | |
| "one Page is open at a time" | `Tabs/tabsModel.ts` — multi-tab with pins; `pageFlush.ts:1` is one debounced writer per path shared by PageView and PageEmbed. | |
| body is "standard Markdown plus **Pommora's** callout directive" | `detect/index.ts:23-26` — the portable Obsidian `> [!type]` blockquote. MarkdownPM.md:33: "On disk it's a plain, portable blockquote." | |

---

### MarkdownPM.md

| Claim | Code | Rewrite |
|---|---|---|
| "every cell is a nested CodeMirror editor … no read↔edit switch" | `Tables/TableView.tsx:233-256` — only `active` mounts `CellEditor`; `cellStatic.tsx:6-8` explains why ("no longer builds R×C editors in one frame"), and `:78-84` is the switch. | |
| "fenced gets a copy button" | Case-insensitive grep for "copy" across MarkdownPM → **zero hits**. | → needsNathan #11 |
| Code: "inline + fenced share one `code` identity" | `Styles.css:304-310` (`.md-code`, code color + code fill) vs `:805-816` (`.md-cb`, `--fill-secondary`, no color). Only the mono family is shared. | |
| "`frame`-wired so system items — Look Up, Services, spelling, Writing Tools — surface" | `main/editorMenu.ts:192` — `.popup({ window: win })`, no `frame`. Grep for `frame\|services\|Look Up` → nothing. Spelling/roles/Speech/Share are hand-pushed (`:35-68`). | |
| submenus "(Format / Heading / Lists / **Block**)"; "the Block menu's Insert Table" | `editorMenu.ts:168-179` — `label: 'Insert'`; `block:` is only the action prefix. | Insert |
| "H1–H4 in the menu" | `editorMenu.ts:134-142` — Paragraph + H1–H5. | |
| "`Styles.css` is the single appearance file … the lone exception is link/connection coloring, which lives in the global layer" | `Tables/TableView.tsx:3` imports `Tables/widget.css`. Link/connection CSS lives **only** in `Styles.css:311-338`. What left for the global layer is the caret (`Carets.css`). | |
| behavior layer is "everything but `widgets/`, `editor/`, `Styles.css`" | No `widgets/` folder. `Tables/TableView.tsx:4` imports React; `Tables/guard.ts`, `sync.ts`, `useConnectionAutocomplete.ts`, `AutocompletePanel.tsx`, `PageHeader.tsx` all import React or CM6. | Name the genuinely framework-free set. |
| "the token/fence scan is computed once per version and cached" | `docCache.ts:36-45` caches lines/fences/callouts. `decorations.ts:168-174` re-runs `visibleInlineTokens` on **every** rebuild — viewport-scoping, not caching, keeps it cheap. | |
| "the format toolbar re-renders only when a field changes" | No format toolbar exists. `index.tsx:213-222` guards an **IPC push** to main (`PageView.tsx:98`). | |
| "always-show overlay (bullet, checkbox, blockquote)" | `intent.ts:352-357,378-393` — bullets and checkboxes are caret-aware (marker-local). Only blockquote is always-show (`:245-256`). | |
| caret "knobs in `Styles.css`" | Moved to `renderer/src/Carets.css:1-18`; `Styles.css:78` is a pointer. | |

---

### PagePreview.md

| Claim | Code | Rewrite |
|---|---|---|
| "Tab switches slide the content on the preview's own slide stamp" | `previewSlide` is read only by `PreviewWindow.tsx:136` (mounts on `flavor === 'page'`); `NavWindow.tsx:238-248` hard-swaps. The stamp is *written* on both flavors (`store.ts:1405-1414`). | Floating-window only. |
| Multi-preview "the geometry store and slice shapes are ready" | Only geometry (`FloatingWindow.tsx:30`). `store.ts:319-327` is one slot each; `previewWarm.ts:17` is a module cache cleared wholesale; `WindowMorph.ts:5-9` stashes one `.pgpreview` by class. Three reshapes. | |
| "**Two** group fields … sit in rounded quaternary fills" | `PreviewInspector.tsx:204-205` — each is `group.length === 0 ? null : …`; an empty page shows the Add affordance alone. | Up to two. |
| "right-click offers Remove Property" | `:314-321` — label and op both branch: Remove Context / `commitContext(id, [])` on a context row. | |

---

### Configuration.md

| Claim | Code | Rewrite |
|---|---|---|
| "a new knob is a schema field plus an apply-map row, nothing more" | `readNexus.ts:84-127` is an explicit literal (a key absent there is dropped); `personalization.ts:22-37` has apply cases for only three knobs. Same overclaim in `shared/types.ts:126-129` and `personalization.ts:4-8`. | + a read-side coercion row; apply-map only when it has a DOM effect. |
| "⌘-click takes the other route either way" | All four hosts wire `bypass` to `select(…, {newTab:true})` (`PageView.tsx:41`, `BlockSurface.tsx:163`, `NavWindow.tsx:164`, `PreviewWindow.tsx:117`). ⌘-click never opens the preview. | ⌘-click always takes the full-page route. |
| "the Area / Topic / Project slots the ribbon's mode glyphs still read" | `Ribbon.tsx:44-49` reads `'collection'` and `'area'` only; no call anywhere passes 'topic'/'project'. | The Area slot; Topic/Project have no reader. |

---

### Contexts.md

| Claim | Code | Rewrite |
|---|---|---|
| "**The migration** … is idempotent and resumable … records each view's visible context columns into `property_order`" | No migration exists (`find -iname '*migrat*'` → nothing). `ensureIdentity` (`identity.ts:33-50`) backfills a missing field only. And `shared/views.ts:345`: "Context columns need no entry: absence from property_order IS hidden." | Delete the bullet. |
| normalizer resolves "case/**width** drift" | `shared/contexts.ts:65-67` — NFC, not NFKC; full-width doesn't fold (`n('Ｐｏｍｍｏｒａ') !== n('Pommora')`). `contextResolve.ts:52-53` lists the classes correctly. | case / whitespace / composition / scalar. |

---

### Agenda.md

| Claim | Code | Rewrite |
|---|---|---|
| "an Event's `end_at` can't precede its `start_at`" | Every `end_at` hit in `src` is declaration or copy — no ordering comparison anywhere. `crud/agendaEntity.ts:53-54` is a presence check; `updateAgendaItem:94-101` is an unguarded read-merge-write. | An Event needs both to be written at all. |
| `agenda:list` "costs nothing until that mode is active" (same false comment at `main/index.ts:349`) | `store.ts:1320-1321` — `openNav` warms the snapshot; `useNavData.ts:57-59` re-warms on any nav surface; `navSearch.ts:35-36` indexes the entries. Plus `mutate.ts:160` → `refreshSessionIndex` → cold rebuild re-reads every agenda file. | Off the tree walk; shared with nav search. |
| "The seed is one built-in, non-deletable Status property" | See cross-cutting; → needsNathan #2. | |

---

### Structure.md

| Claim | Code | Rewrite |
|---|---|---|
| "Connections and the index are ID-keyed; Context links are the deliberate exception" | `shared/connections.ts:1-4` — "the id never touches disk." `index/schema.ts:84-96` — `target_title NOT NULL`, `target_id` nullable. Both link kinds are title-stored, id-resolved. Structure.md:70 contradicts itself. | |
| "Body connections … rename-safe by resolution" | `crud/cascade.ts:25-43` rewrites every body; resolution alone would phantom them all. | rename-safe by a nexus-wide rewrite. |
| "Kind authority is the parent folder's sidecar filename, **never** the extension" (also CLAUDE.md) | `readNexus.ts:265-281` — a Set's kind is *position*. `shared/agenda.ts:49` calls `AGENDA_SUFFIX` "the item's kind authority," while the read paths take it from the folder sidecar — internally inconsistent, and `adopt.ts:93-98` says the choice is open. | → needsNathan #12 |
| Homepage "Seeded on first launch" | Open-time prep writes only nexus.json + settings.json; `.nexus/homepage.json` first appears on a block or banner edit (`blocks.ts:50,291`). | Always present; written on first edit. |

---

### Remaining single-doc false claims

**Interaction.md**
- "z-index scales are still ad-hoc literals pending a Figma lift" — `tokens/stack.ts:1-36` is three complete ladders published as 14 `--z-*` vars (`theme-vars.css.ts:111-124`), consumed by 10 stylesheets. Landed as commit 1ed1cbbc.
- "`--io` drives the **entire** inspector open/close in lockstep … the content-inset reflow" — `--content-inset-right` is *not* a registered `@property` (`styles.css:87-108`); each surface runs its own padding transition (`Detail.css:31-33`, `MarkdownPM/Styles.css:50-52`, `subfield.css:20-22`) and each re-declares `is-resizing { transition: none }`. → needsNathan #13
- "`MenuSurface` (`--dropdown-origin: top right`)" — `NotchedPane.tsx:212-229` writes a beak-tip pixel origin inline on a descendant, shadowing the keyword. Roster also misses ViewDropdown and SpaceDropdown.
- Easings "two" — `motion.ts:16` has a third (`inOut`), published and consumed by `navList.css:14-16`.
- "`slow` (the menu Bloom)" — `slow` is also `.hover-pop` (`styles.css:66-81`), the app-wide hover primitive.
- "Sidebar row hovers run a step faster" — rows are `MenuItem`, whose hover has **no** transition (`menu.css.ts:14-38`).
- "fold chevron rotate + fade … on `--duration-fast`" — `Styles.css:180-196` uses `--disclosure`, per the doc's own Reveal rule.
- "`PaneSlider` is the View Settings detail-pane navigator" — six production consumers (ViewPane, SettingsPane, ViewSettings, PropertiesPane, BlockHandleMenu, CardAddPicker).
- "slide and width+height resize run on one shared duration" — height eases only during a nav flip (`paneSlider.css.ts:7-19`, `PaneSlider.tsx:89-111`); between flips it tracks content untransitioned by design.
- "footer actions pin to the bottom (`margin-top: auto`)" — PaneSlider owns no footer; the owner is `menu.css.ts:274` (`bottomBar`).

**DesignPM.md**
- "Spacing · radius · z-index not yet formalized" — z-index is fully tokenized (`tokens/stack.ts`); radius is partly (`size.css.ts:30-56`, `chip.css.ts`). Only spacing has no scale.
- "one neutral base rendered at descending opacities" (surfaces) — `color.css.ts:4-7` says the opposite: surfaces are their own opaque values; only fills/states/separators derive.
- "All derived from the single neutral base" (states) — `state.muted` is `blackA('10%')` (`:74-78`), a live third state the doc omits (`theme-vars.css.ts:51`, `SidePane.tsx:91`, `navGallery.css:130`, `CardsView.css:168`).
- "Chips are pills" — `chip.css.ts` has five shapes; select/multi use squared `chipLabel`, Context uses `chipContext`.

**Typography.md**
- "Menu / dropdown item titles → Callout / Standard" — `menu.css.ts:14-15` composes `text.body.standard` with a stated macOS-content-size rationale. → needsNathan #14
- "Menu Headings → Headline / Standard" — `menu.css.ts:97-98` is `headline.emphasized`; Headline/Standard has zero consumers.
- "Headings → Title 3 … Large Title by level" — `MarkdownPM/Styles.css:523-546` is em-relative at Bold. Large Title/Title 1/Title 2 have **zero** consumers; Title 3 has one (`SettingsWindow.tsx:117`).
- "Page body → Body; quotes → Callout" — body is `calc(var(--editor-font-size,15px) * …)` (`:86`); `.md-bq` (`:566-577`) sets no type.
- Callout row = "in-text quotes; menu item titles" — the three real consumers are `TableView.tsx:1487`, `menu.css.ts:252`, `:279`.
- "Three label tones" — four (`color.css.ts:47-52`); `control` is bridged and widely used. DesignPM.md:54 already has it right.
- Subline "the smallest text in the app" — footnote and subline are both 10px (`typography.css.ts:33-34`); subline differs only by line-height.

**Icons.md**
- "The six settings rows (`ViewPane` → `ENTRIES`)" — `ENTRIES` is in `SettingsPane.tsx:54-62` with **seven** rows (Configuration leads); a view embed filters to five (`:111-113`).
- "Date & Time" — label is `'Date'` (`PropertyTypes.tsx:21`).
- "Content / leading icons render a touch larger" — true for `rootEntry: 16`, backwards for property-type rows (`doc: 12`, below the 13px label) (`settingsPane.css.ts:52-63`).
- "falls back to **`DashIcon`**" — unrecognized ids resolve to `square-dashed` (`symbols/index.tsx:214-215`); DashIcon is a CSS span for iconless callers (`InlineEditHeader.tsx:51`).

**Inspector.md** — "Properties … live with the content (→ `Properties.md`)" points at an unbuilt surface; `PageView.tsx:67-134` renders no property rows. The shipped surface is `PreviewInspector.tsx:201-294`. → needsNathan #15

**Subfield.md**
- "Subline scale (8/10 by 1.25)" — `typography.css.ts:34` is 10/12.
- "the shared title-divider hairline" — `subfield.css:17` hand-writes 1.25px; the shared seam is `--border-heading` at 1.75px (`theme-vars.css.ts:44`). → needsNathan #16
- "loads once on nexus open" — `store.ts:718-721` sits inside `load()`, re-fired on every structural mutation (`:1764`) and by ~12 surfaces.
- "Homepage + Contexts show no Subfield" — `DetailPane.tsx:119-124` mounts it for `space`; Contexts.md:41 already documents that.
- "`lines · words · characters` (Markdown-stripped)" — `subfieldStats.ts:26-33`: lines count raw source.

**SurfacePM.md**
- "Turn Into" — no such string in `src`. The one conversion is Link View / Link Page on a markdown tile (`BlockHandleMenu.tsx:269-297`, `main/blocks.ts:175-193`); nothing converts back.
- Menu rows "Type ▸ · Style ▸ · Scale ▸ · Remove" — actual: Link View/Link Page or Source · Style · Scale · **Duplicate** · **Delete**, over a pinned **Lock** footer (`BlockHandleMenu.tsx:215-341`).
- picker "wears the block surface's accent outline" — `accentOutline` is never passed (`grep` → declaration chain only). Only the page-embed title field has it (`handleMenu.css.ts:69`).
- "Scroll is caret-priority … wheel-transparent at rest" — `blocks.css:8-12` documents edge-release; at rest a block scrolls its own overflow.
- "one scale variable `--mdpm-scale` … set from `EMBED_SCALE` in `Embeds/PageEmbed.tsx`" — knob is `embedScale.ts:10-12`; font zoom is a separate log-curved `EMBED_ZOOM` prop (`PageEmbed.tsx:99`).
- "a locked host will pin [borderless] hidden" — `surfacepm.css:183-190` has no lock condition; `:281-290` says the opposite.
- lock "mutes the mutating rows to an inert 'Locked'" — rows take `rowDisabled` (`BlockHandleMenu.tsx:207-208`); "Locked" is the footer span (`:222-229`).

**PommoraDND.md**
- board "would need per-frame scroller resolution reintroduced" — `group.tsx:388-397` already calls `findScroller` once at activation, same as `engine.tsx:249-257`.
- "`reorderChildren` (`collection_order` / `set_order`)" as a sidebar commit — `sidebarDnd.tsx` emits only movePage/moveSet/reorderTop/reorderSpaces/reorderContexts. `reorderChildren` comes from `GroupingPane.tsx:607` / `TableView.tsx:438`.
- "**Every** structural commit lands optimistically" — `treeMove.ts:120-125` returns null when the parent is unchanged, so a within-container reorder (the commonest sidebar drag) waits for the re-walk (`store.ts:1745,1764`).
- "no document-level listener fallback — capture routes move/up/cancel" — true only of `engine.tsx`. `group.tsx:562-570` and `sidebarDnd.tsx:338-354` deliberately use window listeners, with reasons stated in code.
- "delay+tolerance activation, a non-passive `touchmove` hedge" — every gate is `Math.hypot(...) < threshold`; grep for `touchmove` → **zero hits**.
- "the code-fixed Saved pins are the only inert rows" — no Saved strip renders; the inert rows are `AgendaMode.tsx:25-30`.

**Navigation.md**
- "**Every** navigation records into [recents]" — `store.ts:1471,1489` gate on `opened`; `tabsModel.ts:112` dedups first, so a re-open records nothing. `store.ts:1457-1458` says so.
- "dismisses on … the ribbon" — `Ribbon.tsx:55` calls `openNav`, which unconditionally opens (`store.ts:1320-1326`).
- index covers "every … Context" — `navSearch.ts:30-31` pushes `kind:'space'`; a Context is only the path crumb (`navResolve.ts:55-65`).
- pinned tabs get "a pin accent" — `TabBar.tsx:305` renders the glyph alone; `:272-273` "The pin badge is pulled for now."
- NavView "on the Homepage-shared background" — `NavView.tsx:37-39` — own banner, Homepage as fallback.
- Agenda entries "route to a placeholder preview window" — `useNavData.ts:36,97` returns early; `NavList.tsx:251-259` renders an inert div.
- "the **gallery** reorders **pins** by displacement" — both zones (`NavGallery.tsx:59,74`).

**QuickCapture.md**
- "sole owner of Nexus access — the folder grant" — grep for `security-scoped|bookmark|entitlement` across `src` + `electron-builder.yml` → **zero hits**; unsandboxed, `mac.target: dir`, no entitlements. And the watcher exists precisely because external tools reach the Nexus. What's exclusive is the *write* side.
- "reuses the same create operations as the main app" for Pages, Tasks, Events — `MutableKind` has no task/event; `agenda:list` (`main/index.ts:351`) is the only agenda channel. → needsNathan #17

---

## 2. Prospective vs Shipped

### Shipped but documented as pending/future

| Doc | Entry | Evidence |
|---|---|---|
| **CardView.md** | Prospects: "Cross-band card drag — a real move / property write" | `CardsView.tsx:420-431`. Duplicated with the line-48 "follow-up" claim. |
| **CardView.md** | Pending: "Compact styling — a build-then-sign-off pass" | `CardsView.css:31-47,212-225,266-268` all render. → needsNathan #18 |
| **Connections.md** | Prospects: "Connections from Context and Homepage block surfaces" | `BlockSurface.tsx:148-167` (full API), `index/build.ts:379`, `upsert.ts:225-227`, `blocks.ts:354`. `SurfacePM.md:13` already documents it live. |
| **Connections.md** | "The source is any Page body" | Markdown block tiles are a second live source. |
| **Views.md** | Pending: "the Layout leaf's order + visibility section" | `ViewSettings.tsx:216` mounts `VisibilityList`; `HiddenPane.tsx:130-141` says it's shared. |
| **Views.md** | Deferred: cards flat grouping + Sort By: Location | `pipeline/group.ts:408-418`, `GroupingPane.tsx:250-258`, `SortingPane.tsx:230-239`, `resolveView.ts:33-37`. |
| **Interaction.md** | "Extending the drawn caret to table cells + inline-rename is outstanding" | `nativeCaret.ts:1-6,183-201` attaches one document-level focusin from `main.tsx:4`; `Carets.css:35-43` covers `input:not([type])`. |
| **SurfacePM.md** | "Navigation surfaces for hosts + the contexts resolution — parked by design" | `Sidebar.tsx:501-512`, `DetailPane.tsx:37` → SpaceView with a full BlockSurface; `BlockHostRef` has a `space` kind (`shared/blocks.ts:61`). |
| **SurfacePM.md** | "the page-embed per-tile lock (waits on the ⋮ menu)" ×2 | Ships on every tile type from the handle-menu footer (`BlockHandleMenu.tsx:231-240`, `BlockSurface.tsx:256-270`); enforced at `PageEmbed.tsx:84-86`, `MarkdownBlock.tsx:73`, `BlockSurface.tsx:433`. |
| **SurfacePM.md** | Homepage as "the removable dev host until the real hosts land" | Spaces are a second real host. → needsNathan #19 |
| **Properties.md** | Pending: "Display Formats" | Every clause ships (`shared/columnMenu.ts:53-108`, `DateTimeEditor.tsx:88-90`, `PropertiesPane.tsx:445-449`). Delete the entry. |
| **Properties.md** | Pending: "no UI to view or edit [values] on an entity" | `PreviewInspector.tsx:48-230`, mounted at `PreviewWindow.tsx:227` + `NavWindow.tsx:226`. → needsNathan #15 |
| **PagePreview.md** | Pending: "hover card's … full dismiss mechanics" | `ConnectionHoverCard.tsx:34-59` — grace-timed leave + Escape both ship. Only the body is a placeholder (`:77`). |
| **PageSets.md** | "deeper Sub-Sets may carry those fields but they're ignored" | `mutate.ts:194` seeds a default view on **every** createContainer, reachable at depth-2 from `subfieldItems.tsx:70-85` ("New Sub-Set"). Same false comment at `shared/schemas.ts:63`. |
| **Contexts.md** | "Space-to-Space links … a Space tags Spaces in other Contexts" (in Writes) | Write path + index are live (`contextWrite.ts:196-229`), no UI drives it; the Pending entry says so. Also drop "other" — no such restriction. |
| **Subfield.md** | Roadmap: "Bring the Subfield to Homepage + Contexts" | Spaces already have it; Contexts can't (`DetailPane.tsx:34-36` — a Context is a disclosure). |
| **PommoraDND.md** | "a green lab does not mean the app consumes the engine … a later integration" | Eight app importers: `TabBar.tsx:201`, `Ribbon.tsx:80`, `NavGallery.tsx:59`, `IconPicker.tsx:160`, `PreviewTabStrip.tsx:112`, `ViewEmbedBlock.tsx:452`, `CardsView.tsx:459,474`. → needsNathan #20 |
| **Icons.md** | Symbols.md-mirrored assignments | Registry roster stale: Status is `progress-check` not `circle-dashed`; `link-2`'s "Context/Relation type" doesn't exist; 13 curated keys unlisted. |
| **Structure.md** | Homepage as "the block system's removable dev host" | Spaces are first-class hosts with stricter persistence (`main/blocks.ts:67-81`). |
| **Typography.md** | Stub: "Truncation + line-clamp conventions" | `typography.css.ts:84-103` (`truncateHoverScroll`) is the shared source, used by chips, menus, handle menus, and `OverflowScroll.tsx:45`. Only line-clamp is open (grep → zero hits). |
| **Typography.md** | Stub: "Monospace / code font" | Already renders (`Styles.css:305,812`); what's missing is the *token*. |
| **Views.md** | ViewPane footer "(create · more)" | The `…` is `disabled` with an empty handler (`ViewPane.tsx:150-160`). |
| **TableView.md** | "the future page-preview/creation surfaces" | `page-preview` is a live `OpenIn` (`shared/types.ts:238`) routed at `TableView.tsx:657,664`. |
| **TableView.md** | "mounted by this table first and by the other container views later" | Cards imports the same `PropertyEditing/` modules today. |

### Documented as shipped but unbuilt or half-built

| Doc | Passage | Evidence |
|---|---|---|
| **Agenda.md** | § EventKit Sync in flat present tense under Architecture | Grep for "eventkit" → four hits, all field declarations/comments. The doc's own Pending says "the bridge isn't built." Move the section. |
| **Agenda.md** | § CRUD reads as wired | Every write export's only callers are `.test.ts`; `agenda:list` is the sole channel. `Framework.md:44` already states it. |
| **QuickCapture.md** | Whole body in present tense, unbuilt | Grep for `globalShortcut\|new Tray\|setAsDefaultProtocolClient\|quickCapture` → nothing. Add a front-loaded status marker like Subfield.md's. |
| **DesignPM.md** | "Light/dark theming is a future seam (the theme contract is the hook)" | `createThemeContract`, `prefers-color-scheme`, `data-theme` → **zero hits each**. All three token modules bake dark into `createGlobalTheme(':root', …)`. |
| **TableView.md** | "A single zoom knob (Standard / Compact)" | Grep `isCompact` under `Views/Table/` → **zero**. Only `--zoom: 1` and the SurfacePM embed override exist. `ViewSettings.tsx:275`: "inert visually this cycle. Table-only." |
| **TableView.md** | Group-band hover "+" | `GroupBand.tsx:251-260` has only `onPointerDown` stopPropagation — no `onClick`, no `onAdd` prop. |
| **Configuration.md** | **defaultViewScale** bullet, silent on being read-only | No writer anywhere; `shared/types.ts:154`: "Set by hand in settings.json for now." |
| **Configuration.md** | per-Nexus layer "travels with the Nexus and **syncs**" | *Rejected as a defect* — "synced" is this codebase's own term for nexus-scoped vs device-local (`watcher.ts:140-141`, `types.ts:126`). |
| **Icons.md** | ViewSettings 3×2 picker table with no shipped/parked line | `ViewSettings.tsx:48` — `IMPLEMENTED = {table, cards}`; **four** tiles inert (List too), gated at `:267`. |
| **Architecture.md** | `.trash` "(v1+ surface)" | Writer ships; grep for `.trash`/`trashedTo` in the renderer → zero. No browse/restore. |
| **Architecture.md** | "full-text search reads files directly" | `navSearch.ts:1-3` — title/kind only, FTS deferred. Architecture.md:91 contradicts it. |
| **Architecture.md** | "a Finder-dropped page enters via CRUD upserts" | `sessionIndex.ts:37-41` — no incremental updater; only full rebuild. Doc's next section says so. |
| **Architecture.md** | agenda "on-disk discriminator choice is open … not built now" | `shared/agenda.ts:48-58` + `index/build.ts:289-296` — chosen and load-bearing. Only *adoption* is deferred (`adopt.ts:94-105`). → needsNathan #12 |
| **Interaction.md** | Mobile-Readiness Invariants stated present-tense | Two of six unbuilt (see PommoraDND). → needsNathan #21 |
| **Connections.md** | "Backlinks Panel: edge data is captured; the panel isn't built" | Literally true but the real gate is the query facade (`Architecture.md:91`), not the UI. |
| **MarkdownPM.md** | Deferred: "**zoom slider** UI placement" | `ZoomSlider.tsx:8` is its own only reference; no page-level zoom state or persistence at all. |
| **MarkdownPM.md** | "syntax highlighting is a no-op seam" | `syntaxHighlighting`/`HighlightStyle`/`lezer/highlight` → zero hits. Doc's own Host Services says there's no seam. |
| **MarkdownPM.md** | "(open paradigm call)" parked inside a shipped-behavior bullet | → needsNathan #4 |
| **Contexts.md** | "the (Icon)(Title) heading over the **Lock/ellipsis** footer" | `SpaceSettings.tsx` — the ellipsis is `disabled` with no handler. |
| **Navigation.md** | Toolbar Nav dropdown described as compact nav data "sized to the Settings dropdown's footprint" | `NavPane.tsx:13-19` — `<MenuSurface><div style={{height:300}}/></MenuSurface>`. SettingsDropdown is content-sized. |
| **Inspector.md** | Reserved for the Claude chat | *Rejected* — "reserved" plus "renders nothing" in the same sentence is honest; PRD:167 states it independently. |

---

## 3. Over-Exposition

Cuts only; each is either a code exact restated in prose, a hard count that drifts, another doc's owned content, or narration of a change.

**Architecture.md**
- Tree annotation field lists (`_pageset.json (id + parent_id + icon + page_order)`, `_space.json (… relations)`, `contexts.json (…)`) — hand-copied zod shapes, already drifted: the Set list omits six keys `readNexus.ts:292-307` reads, and `_space.json` has no `relations` key (`shared/schemas.ts:79-82`). Keep the tree shape + one clause of purpose; point at `shared/schemas.ts` once.
- The POSIX-rename lecture and the literal `---\n<yaml>\n---\n<body>` envelope — verbatim `io/pageFile.ts:38-41` + `atomicWrite.ts:1-4`. **Keep** the no-blank-separator rule (a real Obsidian decision).
- "It holds titles / properties / links / relations … rebuilds itself if missing or stale" — near-verbatim `PommoraPRD.md:97`, which already points back here. Also cut the table inventory (source of two of the false claims above).
- § Agent legibility — restates `PommoraPRD.md:87` + the PRD's Vision/Why. Keep only the id/path-lookup clause and the `.nexus` guide.

**Properties.md**
- The `(A separate palette icon … removed; clicking the chip is the one affordance.)` parenthetical — narrated reversal. Fold the surviving affordance into the Color bullet (`URLEditor.tsx:76-93`).
- "the assign surface itself shipped with the **7-2 pane**" — plan numbering.
- The Number editor's row-by-row transcription (Format · Currency · Separators · Fraction · Value · Style) — source-order restatement of `NumberEditor.tsx`, already missing the Decimals row. Plus "1–10 places" (`DECIMAL_OPTIONS`).
- "all ten `colors.css` solids" + "2×5 grid" — a stale filename beside two hard counts.

**Interaction.md**
- `cubic-bezier(0.22, 1, 0.36, 1)` and `cubic-bezier(0.32, 0.72, 0, 1)` — verbatim from `motion.ts:17` / `animations.css.ts:5`. The Bloom sentence even calls the curve "the lone literal in animations.css.ts" while copying it.
- The PickerMenu consumer roster ("the table's cell value picker, the AutocompletePanel, the IconPicker") — 25 call sites across 20 files, and `AutocompletePanel` isn't a PickerMenu at all (`GlassControls`, `MarkdownPM/AutocompletePanel.tsx:1-6`).
- § Measurement discipline's four-sentence postmortem — narrates the old sidebar behavior, the inverted reasoning, and "the deeper failure." Keep the last two sentences (the rule).

**TableView.md**
- The `07-02` History.md date stamps ×2 and the "built, live-verified, and torn out on Nathan's call" narration. **Keep** the bare `→ History.md` pointers (house convention: `Architecture.md:113`, `DesignPM.md:60`).
- § Tokens' second paragraph — near-verbatim `table-tokens.css:2-5` plus a restatement of the doc's own line 3, and a knob roll-call that drifts.
- Style-per-type transcription (`status Pill/Capsule/Checkbox · checkbox Checkbox/Switch · …`) — `shared/columnMenu.ts:68-99` label-for-label; already stale (Bar is conditional, `:78-80`). Plus `clock-plus` / `history`, the latter belonging to `PropertyTypes.tsx:28`.
- The three-render melt mechanics — `Guidelines/Build-Gotchas.md:28` owns it, and the same paragraph cites that section eleven lines later.

**DesignPM.md**
- The `design-system/` folder enumeration — restates a directory listing, already omits `interactions/` (20 files, 34 importers), `size.css.ts`, `motion.ts`, `stack.ts`, `personalization.ts`, `animations.css.ts`.
- The Icons paragraph — point-for-point `Icons.md` (which the paragraph names as owner).
- Per-material consumer rosters — drifted: `GlassSegment` also wraps the slider knob (`Slider.tsx:88`), `GlassWindow` also `SidePane.tsx:89`.

**Configuration.md**
- "Seven pairs, defaulting to:" + the three bullet groups — value-for-value `DEFAULT_LABELS` (`shared/types.ts:566-574`).
- "This is the one knob whose default is ON" — hard count (`SettingsWindow.tsx:46`), and the storage rule is already owned by the Settings Window section.

**Icons.md**
- The Tabler second-source sentence — a fourth restatement (`Symbols.md:5`, `symbols/index.tsx:77-80`, CLAUDE.md) in a sentence that says "see Symbols.md."
- "(the old rotated-Table custom caused sub-pixel aliasing)" — state-and-reversal, and the cited reasoning isn't preserved in code (`viewSettings.css.ts:22-27` is about alpha doubling). **Keep** the four call sites.
- Glyph drawings ("2×3 stretch-horizontal bar stack", "left-rail bar + four lines") — `customGlyphs.tsx:1,21,34` holds them; the doc omits the registry keys (`cards-grid`, `list-rounded`) it exists to name.

**Views.md**
- The duplicate Filter description (lines 37 and 40) — same surface, three bullets apart, already drifted into disagreement about which row is permanent. Reduce the SettingsPane bullet to naming its leaves.
- "Four of the non-Table view types remain … all six" — restates its own heading as a number.

**Navigation.md**
- "**View mode persists per surface** … `navWindowMode` / `navViewMode` … `navViewModes` key … This replaced NavWindow's old session-only module var" — code identifiers + a file path + change narration + a React rationale.
- "The engine internals live with the code; this doc is the durable spec." — meta-commentary, mid-section.
- The second NavWindow-flavor sentence (eclipse + inspector squeeze) — `PagePreview.md:11,17,35` owns all three.
- "(the `none`-kind `viewType` item)" — `Subfield.md:10` owns it; "and commit through `setRecentsOrder`" is a store-action name.

**Contexts.md**
- The seeded-Context table — identical entries and examples to CLAUDE.md's Contexts block, one line below a sentence that names all three.
- "(trim → lowercase → NFC)" — a method chain transcribed as arrows, and the direct cause of the "width drift" error.

**Collections.md**
- `_pagecollection.json` field list — six keys short (`shared/schemas.ts:48-59` adds `view_button`, `view_style`, `default_sort`, and `baseSidecar`'s two; plus `heading_icon_hidden` and `property_cache` read elsewhere).
- § Index (Model A) — whole identically-titled section duplicated from `PageSets.md:38-40`.

**Agenda.md**
- "(three EventKit-aligned groups — see `Properties.md`)" — a hard count duplicating the doc it defers to, and `shared/properties.ts:48` says the count *isn't* capped.
- § On-Disk Layout tree + discrimination rule — `Architecture.md:33-39,61,63` owns both in near-identical words. Keep the `config`-suffix rationale.

**PagePreview.md**
- The Subfield footer sentence — `Subfield.md` owns the local-body, non-navigable-crumbs, and session-collapse contracts in near-identical words. Keep the `onBody` debounce + `--mdpm-scale` alignment.
- "The breadcrumb no longer lives in the inspector — it moved to …" — change narration.

**PommoraDND.md**
- The autoscroll Consumers roster — already drifted twice (omits the board it calls a prospect; miscalls `paneDnd` "the settings-pane reorder" when it serves three panes). Replace with the invariant `autoscroll.ts:1-5` already states.

**MarkdownPM.md**
- "It's an easy, 30 minute session -- it's just one I don't want to handle right now." — a timeline **and** meta-commentary, first person, in a Known Issue whose substance line 30 already carries.
- Auto-pair worked examples (`5"`, `2 * 3`, snake_case) + the `PAIRS`-table enumeration — verbatim `input/index.ts:272-274`, and already wrong (`[` pairs only at line start or after whitespace, `:306-312`).
- Outliner-rail paint mechanics — `Styles.css:383-396` as prose, and the deferral appears three times in one doc.

**Subfield.md**
- "(8/10 by 1.25 — the app's smallest)" — three literals, drifted.
- The scoped-preview collapse sentence — `PagePreview.md:41` near-identical, and the behavior is `PreviewPane`'s (`PreviewPane.tsx:131-134`), not the Subfield's.

**SurfacePM.md**
- "five discrete steps" — `blockZoom.ts:7` list count. **Keep** the freeze-inset reasoning.
- `(H-4..H-7)`, `(G-5, …)` plan-task IDs. Same pattern runs through the code comments (G-2…G-16, B-5, C-1, D-2…D-12, E-1, E-5, H-10).

**CardView.md**
- Plan-decision tags `(B-3)`, `(C-3)`, `(F-1)`, `(I-5)`, `(C-2)`, `(G-1)`, `(I-4)`, `(E-3)` in `CardsView.css` and `(D-4/D-5)`, `(D-8)`, `(K-2)` in `ViewSettings.tsx` — but the same style appears in ~50 further files. → sweep, not a cards-local cut.

**Typography.md**
- The weight ladder **Standard 400 · Emphasized 500 · Semibold 600 · Bold 700** — printed four times (lines 3, 5, 9, 27), and line 3 says the literals live in the token file two clauses later.
- The `--weight-*` bridge sentence duplicated at lines 27 and 51.
- "Three label tones … Catalogued in `DesignPM.md`" — cross-doc duplication that already drifted, in a section naming its own owner.

**Inspector.md**
- Pending "Inspector Content" chrome inventory — three of four items already stated at doc lines 3 and 5, and "the body is empty" restates line 5. Worse, it files four *shipped* mechanisms under a Pending heading.

**Structure.md**
- The PARA mapping table — three rows carry the false "(seeded Context)" label, the Projects row is restated in prose immediately below, and `Archive | .trash/` is a category error (`io/atomicWrite.ts:153-164` is recoverable deletion; no archive feature exists).

**QuickCapture.md** — nothing to cut; the whole doc needs a status marker instead.

---

## 4. Code Findings

Deduplicated across all 27 audits, ranked by severity.

### Bugs

| # | Finding | Location | Impact |
|---|---|---|---|
| **1** | A fresh Nexus can neither seed nor create a Context | `main/contextsRegistry.ts:24` (orphaned `readRegistry`) + `crud/contextWrite.ts:240` (`readRegistryStrict` → `not-found`) + `io/atomicWrite.ts:63-70,86-95` | The Contexts layer is **unreachable** on any Nexus without `contexts.json`. Fix: call `readRegistry` from `prepareOpenedNexus` (`index.ts:556`), **or** let `createContextGroup`/`mutateRegistryFile` treat missing as empty. |
| **2** | Context/Space rename bypasses the cascade in main | `main/mutate.ts:235-237` | `MutableKind` includes `space` and `context`, but only `page` is special-cased — both fall to a bare `renameFolderEntity`, skipping `renameContextOp`/`renameSpaceOp` (`crud/contextCascade.ts:186,249`) and the journal. Membership is stored as **titles**, so every member file keeps the stale key. The renderer happens to reroute (`store.ts:1663-1673`); any other caller of `handleMutate` corrupts. The comment above it asserts id-keyed membership that doesn't exist. |
| **3** | `renameCascade` rewrites `[[links]]` inside code fences | `main/connections/scan.ts:11` + `main/connections/rewrite.ts` | Neither has fence/inline-code handling; the editor excludes code three ways (`tokens/index.ts:123,153`, `decorations.ts:173`). A page documenting `[[Old Title]]` in a fenced block has its code sample silently mutated on an unrelated rename. Fix: hoist the code mask into the shared layer. |
| **4** | `deleteProperty`'s `.trash` snapshot uses raw `writeFile` | `main/crud/deleteProperty.ts:49` | The **only** non-atomic durable write in `main` (the other raw `writeFile` is schemaTransaction's own staging temp). It is the sole recovery net for a fan-out that then strips the value from every page in the nexus (`:69-72`). A truncated write leaves unparseable JSON and the scrub proceeds. Also bypasses `recordWrite`. Route through `atomicWriteFile`. |
| **5** | Sidebar exit-overlay remounts `AgendaMode`, painting the empty state over the outgoing list | `Sidebar.tsx:736-745` (`layerFor(exit.mode)` under `key={exit.epoch}`) + `AgendaMode.tsx:11-23` | Leaving Agenda mode shows "No tasks or events" for the whole sweep, plus a redundant IPC. Collections/Contexts are immune (they render from the `tree` prop). |
| **6** | `cloneMap` is module-scoped and keyed only by document offset | `MarkdownPM/editor/folding.ts:115` (written `:262,:298`, deleted `:206,:228`) | Three surfaces mount MarkdownEditor concurrently (`PageView.tsx:72`, `PageEmbed.tsx:90`, `MarkdownBlock.tsx:80`). Two open docs whose folded headings share an offset overwrite each other's clones → a fold widget renders the wrong document's body. Also leaks: an editor unmounted while folded strands its DOM. Fix: `WeakMap<EditorView, Map<…>>` + clear on destroy. |
| **7** | The list drag has no Escape / window-blur abort | `MarkdownPM/editor/listDrag.ts:193,220-222` | Registers only pointermove/up/cancel with no re-entry guard. The block drag it was modeled on has all three (`blockDrag.ts:141-181`). A list drag survives a window blur with pointer captured and `setShade` applied; Escape does nothing. |
| **8** | `PreviewPane`'s mousemove rect cache is defeated by an unstable dep | `PreviewPane.tsx:141` (`[winStyle, …]`) + `FloatingWindow.tsx:120-124` | `winStyle` is a fresh object literal every call, so the effect re-runs every render and nulls `paneRect.current` — including on debounced typing renders that can't move the pane. Depend on the four numbers. |
| **9** | `DetailPane` reads `getBoundingClientRect()` on every mousemove | `DetailPane.tsx:138-142` | Forced layout per pointer sample on the app's largest surface. `PreviewPane.tsx:135-141` already solved it and names the cost in its comment. |
| **10** | Per-card whole-tree subscription defeats the memo it sits inside | `Cards/CardsView.tsx:946` (`useSession((s) => s.tree)` inside memoized `PageCard`) | `PageCard` is `memo(…)` at `:920` and `ctx` is memoized on tree slices at `:230-234` precisely to hold identity — then every card subscribes to whole `tree`, whose identity changes on each `load()` push, re-running `addEntriesFor` (a full schema + hidden-list walk, `cardValueInput.ts:47-76`) per card. `addable` is used lazily (`:957`, `:978`). |
| **11** | Locking a **view embed's configuration** also freezes its geometry | `SettingsPane.tsx:243-245` → `ViewEmbedBlock.tsx:284` writes `locked` → `BlockSurface.tsx:433` → `SurfaceView.tsx:339,423` | The label says "Lock view configuration"; `ViewEmbedScope.tsx:25-27` and SurfacePM.md both say config-only. The tile becomes un-draggable and un-resizable. → needsNathan #22 |
| **12** | `setProperty` and `setBanner` never bump `modified_at` | `main/mutate.ts:491-508`, `:310-339` | `updatePageBody` (`crud/page.ts:81`) and `renamePage` (`:55-63`) do; so does `setPageContext` (`crud/contextWrite.ts:161`). `pipeline/value.ts:118` reads the key for Last Edited Time, so a property or banner edit leaves a stale stamp forever. The dead `updatePageProperty` (`page.ts:109`) governs both keys correctly — pointing `setProperty` at it fixes this and #16 together. |
| **13** | Card drag ghost renders a stale thumbnail | `Cards/CardsView.tsx:494` (`thumbSrc(nexusId, r.id, 0)`) | The live card reads the live counter (`:945` → `:1029`); `renderOverlay` hardcodes 0. `bumpThumb` (`store.ts:1238-1241`) moves in-session from `useNavThumbnails.ts:97`, so under Banner: Preview a re-captured page shows two different images. |
| **14** | Dead `--separator-line` fallback always wins | `showcase/showcase.css:638` | The var is defined nowhere; `theme-vars.css.ts:39-40` bridges only `--separator-border` / `--separator-segment`. The hardcoded `#71717a40` paints, untrackable. Add `'--separator-line': colorVars.color.separator.line`. |
| **15** | The Format toggle is a dead control on tables | `ViewSettings.tsx:128,276-280` | Grep `isCompact` under `Views/Table/` → zero. The only `--zoom` writers are `table-tokens.css:11` (=1) and the SurfacePM embed seam. Toggling persists and moves nothing (`:275` admits it). Cards consumes it, which is why it's easy to miss. |

### Dead code

| # | Finding | Location | Note |
|---|---|---|---|
| **16** | `updatePageProperty` has no production caller | `crud/page.ts:109` | Imported as a fixture by **seven** suites. The live path reimplements it inline at `mutate.ts:491-511` with different `modified_at` behavior — the tested primitive isn't the shipped path. Fix by pointing `setProperty` at it. |
| **17** | `deleteFolderEntity`, `deletePage`, `deleteAgendaEntity` — test-only | `crud/folderEntity.ts:76`, `crud/page.ts:69`, `crud/agendaEntity.ts:87` | Every real delete goes through `removeViaMode` (`mutate.ts:618-625`), which branches on `trashMode`. The wrappers hardcode `trashWithTimestamp` — if anything picked them up, they'd silently ignore the user's system-Trash setting. Also drop the "crud's delete* uses" clause at `mutate.ts:616-618`. |
| **18** | The whole Agenda write layer is unreachable | `crud/agendaEntity.ts:23,61,82,94,105` + `crud/schema.ts:246-271` | Every caller is a test. **Not** dead — it's the settled on-disk shape behind an unbuilt surface. What it lacks is the parked marker this codebase uses elsewhere (`shared/mutate.ts:57-59`). Knock-on: `io/schemaTransaction.ts` (108 lines) is unreachable at runtime, which is *why* the live registry paths are per-file. |
| **19** | `schema.changeType` is exposed with no renderer caller | `preload/index.ts:182-188` → `main/index.ts:1069-1091` | The handler does `void opts` (discarding `dropConflictingValues`) then a plain `editProperty`. Only mocks reference it (`propertiesPane.test.tsx:49`). |
| **20** | `accentOutline` — declared, defaulted, threaded, never passed | `NotchedPane.tsx:110,137,243-253` + `PickerMenu.tsx:73,118,370` | Six hits, all declaration chain. Its JSDoc claims the block-surface pickers use it; `BlockHandleMenu.tsx:388,395` don't. |
| **21** | `resolveKind` + `kind.ts` are test-only, and with them the `area`/`topic`/`project` sidecar filenames | `main/kind.ts:16`, `paths.ts:8-10,18-27` | Every real kind decision is inline (`readNexus.ts:495-502`, `adopt.ts:100-103`). `kind.ts` is the only reader of `_area.json`/`_topic.json`/`_project.json`. Delete both; the union narrows to space \| collection \| set \| taskConfig \| eventConfig. |
| **22** | `resolveNavEntry` — test-only, and the tests exercise it instead of the shipped path | `Navigation/navResolve.ts:116` | Production builds the index once (`useNavData.ts:59`, `NavWindow.tsx:148`) and calls `resolveWith`/`resolveRecents`/… Re-point `navResolve.test.ts`. |
| **23** | `hasPendingRecents` / `flushRecents` test-only, with a false docstring | `main/io/navState.ts:98-104` | The real quit gate is `index.ts:2186-2189` (`hasPendingNavWrites` / `flushNavWrites`). |
| **24** | `tree.saved` built on every walk, read by nobody | `main/readNexus.ts:440-470`, `shared/types.ts:205-209,320`, `paths.ts:69` | Grep `.saved` across the renderer → one unrelated local. `PommoraDND.md:40`'s "the code-fixed Saved pins" goes with it. |
| **25** | `ADDABLE_TYPES` duplicated byte-identically | `Cards/CardAddPicker.tsx:21-32` vs `cardValueInput.ts:13-24` | Nothing imports the CardAddPicker export; CardAddPicker itself branches on `revealOnly`/type instead. |
| **26** | Unreachable branches: `LEAF_CURRENT` fallback · `blankLeaf` · `closeTabIn`'s page-flavor guard · `createSpaceLabel`'s `'New Space'` · `PropertyTypes` DashIcon arm · Disclosure's non-drag ternary · `chevronSpace` · `SectionHeader.onAdd` | `ViewSettings.tsx:255` (+`:81-85`) · `SettingsPane.tsx:139,306` · `previewTabs.ts:63` · `shared/contexts.ts:87` · `PropertyTypes.tsx:52` · `Sidebar.tsx:289` · `Sidebar.tsx:142` · `Sidebar.tsx:555` | Each narrows to an impossible case. `SectionHeader.onAdd` also strands `.section-add` CSS (`Sidebar.css:300,317,321`). |
| **27** | Dead CSS: `.data-cell.cell-anchored`, `.cell-muted` | `Table.css:146`, `:337` | One hit each repo-wide — their own definitions. |
| **28** | `EdgeLensGlass` — a third, hand-rolled liquid recipe with zero consumers | `materials/edge-lens.tsx:71` + `materials/index.ts:9-10` | Its barrel comment claims "used by the design-system glass lab" — `GlassLeaf.tsx` builds CSS frost and never imports it. → needsNathan #23 |
| **29** | `DEVICE_LOCAL_NEXUS_FILES` exported, never read | `main/paths.ts:87` | **Keep** — `MobileSpec.md:29` names it as the sync-exclusion source. But that doc hard-counts "four" while the set holds five. |
| **30** | Orphans: `'invalid-tier'` + trailing comment · `setContextSingular` doc comment · `show_banner` · `default_sort` · `frostStyle` · `agendaTitleOf` · `--text-subline-size` · `ZoomSlider` · `Row` in the drag seam | `shared/result.ts:12,17-18` · `crud/contextWrite.ts:319` · `shared/views.ts:139,290` · `shared/schemas.ts:53,91` · `glass-pane.tsx:50` · `shared/agenda.ts:63` · `theme-vars.css.ts:92-95` · `MarkdownPM/ZoomSlider.tsx:8` · `drag.tsx:13` | `default_sort` buys nothing (looseObject already round-trips it). `agendaTitleOf` is unused while `collectAgenda.ts:52` and `build.ts:289` duplicate its slice. `Row`'s only importers are the Lab. |
| **31** | Unread parameters | `paths.ts:59` (`_host`, with three call sites existing only to feed it, incl. a literal built at `blocks.ts:288`) · `sidebarDnd.tsx:517` (`_idx`) · `treeMove.ts:381` (`_key`) | |

### Duplication / DRY

| # | Finding | Location |
|---|---|---|
| **32** | `collectAgendaEntries` duplicates the index builder's `collectAgenda` — ~35 identical lines | `main/agenda/collectAgenda.ts:15` vs `main/index/build.ts:269-324`. Same readdir, same sidecar probe, same suffix filter, same safeParse, same title slice. Only the projection differs. Extract one scanner taking a projector. |
| **33** | `ColorPicker`'s `SWATCHES` hand-copies `CHIP_SOLID_COLORS` | `ColorPicker.tsx:8-19` vs `shared/types.ts:43-54`. `colorMap.ts:21` imports the shared one precisely to avoid this. |
| **34** | Three files bypass the memoized doc string | `Tables/widget.tsx:265` (`doc.toString()` — in a file that already imports `docString` and uses it eight times) · `editor/blockDrag.ts:34,165,209`. `docCache.ts:10-18` exists to memoize this. |
| **35** | `fenceBlocks` scanned twice per document version | `decorations/intent.ts:132` (via `scanFencedCode`) and `:134`, on identical input. The function's own comment at `:63-64` says it's shared "so the two never drift." |
| **36** | `STATS_DEBOUNCE_MS = 120` declared twice; near-zone `260`/`120` declared twice | `PageView.tsx:13` + `PreviewWindow.tsx:35`; `PreviewPane.tsx:86-87` (named) + `DetailPane.tsx:141` (bare). `pageFlush.ts:8` is the shared-constant pattern to follow. |
| **37** | The resize path back-solves the density factor the reorder path is documented never to back-solve | `TableView.tsx:1466` (`cell.getBoundingClientRect().width / width`) vs `:1102` + its comment at `:1099-1101` naming that exact ratio as the anti-pattern. Hoist one `resolvedZoom(gridEl)`. |
| **38** | `GlassLeaf` re-authors the shipped frost recipe as literals, and its shadow has diverged | `GlassLeaf.tsx:24-36` emits `0 8px 26px #00000047`; `--shadow-standard` is `0 8px 25px #00000040` (`color.css.ts:102`). A parameterized version already exists (`glass-pane.tsx:31-64`). Its presets also mislabel `GlassControls` as frost when it's liquid (`glass-controls.tsx:2,43-48`). |
| **39** | `segmented.css.ts` hardcodes `fontWeight: 500` over `text.control.standard` | `segmented.css.ts:68-71`. 500 **is** `font.weight.emphasized` — `text.control.emphasized` is the same style with no literal. |
| **40** | The monospace stack written out three times | `MarkdownPM/Styles.css:305`, `:812`, `showcase.css:15`. Every other family routes through `--font-family`. Adding a `mono` token closes Typography.md's stub too. |
| **41** | `SIDECAR_FILENAME` includes area/topic/project (see #21); `NodeKind` and `sidebarDndModel.Kind` carry the same three dead members | `shared/types.ts:9`, `Sidebar/sidebarDndModel.ts:7-15` (`buildIndex:39-130` emits only five). **Keep** `ENTITY_ICON_KINDS` — `Ribbon.tsx:48` reads `'area'`. |

### Comment cleanup

Grouped by theme; every one is a comment that would mislead the next reader.

- **`watcher.ts:1-5` states the opposite of its own module** — "No pause flag — an in-app write that echoes back is a harmless redundant re-read," while `:92` is `if (isRecentWrite(path)) return` and `:89-91` explains why the echo is *not* harmless. `io/writeEcho.ts` is a whole module for it. Load-bearing: the one-walk-per-mutation property depends on it.
- **`sessionIndex.ts:4`** promises an incremental upsert 30 lines above `refreshSessionIndex`'s own doc saying there is none.
- **`main/index.ts:349`** repeats Agenda.md's false "called only when that mode is active."
- **tierN residue:** `readNexus.ts:204`, `:474`, `:526` · `shared/types.ts:321-322` · `shared/result.ts:17-19` · `crud/page.ts:78,105` ("tiers" in preserved lists) · `shared/mutate.ts:31-33,82` + `crud/reorder.ts:22,33` (`StateOrderKey` documented as "top Collections + the three context tiers" over a **single-member** union) · `contextMenu.ts:17,43` (`// page, space, area, topic, project` — unreachable per `MutableKind`) · `main/mutate.ts:114` (`.nexus/<tier>/` — real path is `.nexus/contexts/<Title>/<Space>/`) · `store.ts:1759` ("a tier pick" — the op is `setContext`) · `main/agenda/collectAgenda.ts:2` ("properties/tiers/modifiedAt" — the field is `links`) · `index/build.test.ts:160-161,171` (fixture comments describing bare tierN when `tagPage:106-113` writes bracketed keys) · `crud/folderEntity.ts:1-2` ("Areas, Topics, Projects, Page Types, Page Collections, Page Sets" — three retired, one never existed, Space missing) · `crud/cascade.ts:1-7` (describes a Context id-stripping cascade this module doesn't hold; it lives in `contextCascade.ts` and rewrites bracketed *titles*).
- **Sidebar tier vocabulary:** `Sidebar.tsx:207-208` (`tier:*` persistKey — real keys are `node.id` and `context:${id}`) · `:216-218` (dragId "omitted for structural disclosures … never draggable" — both call sites pass it, both are draggable) · `:254-255` · `:517-520` ("non-draggable" + a "Settings" menu item that doesn't exist in `contextMenu.ts:70-137`) · `disclosureState.ts:3` · `sidebarDndModel.ts:36-38` (claims Contexts are depth-1 under a tier disclosure; `buildIndex:102,113` puts the group at 0 and Spaces at 1) · `sidebarDnd.tsx:499,515` ("all top-level groups held in `.nexus/state.json`" — contextGroup writes the registry, per `mutate.ts:593-603`).
- **`contextMenu.ts:4`** — "Rename is intentionally absent here" while `:101-107` pushes a Rename item unconditionally.
- **`shared/schemas.ts:61-63`** — "`views`/`banner` apply only at depth-1 (ignored deeper — read leniently, never seeded)": all three clauses false (`readNexus.ts:292-307`; `mutate.ts:194` seeds unconditionally). Source of Architecture.md's and PageSets.md's matching errors.
- **`shared/blocks.ts:132`** + **`BlockHandleMenu.tsx:168`** — "view tiles don't surface Scale yet (`type !== 'view'` gated)"; no gate exists and `:306-308` says the opposite.
- **`surfacepm.css:185`** — "A locked host will pin it hidden (lands with G-3)"; the lock landed, the pin didn't, and `:283-284` contradicts it. **`:283`** also claims content stays editable "for a locked tile OR a locked host" — true only of the host lock.
- **`shared/mutate.ts:31`** — see tierN above; also "Single source for the union" over one literal.
- **`main/adopt.ts:96-99`** — cites `React/.claude/Features/Architecture.md § "Agenda discrimination"`: wrong folder (`Pommora/`), wrong nesting (`.claude` is at the project root), wrong section name (`Architecture.md:65` is "Deferred — per-file kind discrimination").
- **`main/io/walk.ts:3`** — claims readNexus does "depth caps, and adoption": recursion is unbounded (`readNexus.ts:267-307`) and adoption is a separate write pass (`adopt.ts:1-4`).
- **`main/mutate.ts:71`** — "both builds heal parent_id from it"; React never heals (see false claim, PageSets).
- **`shared/properties.ts:155-161`** — two JSDoc blocks stacked above `statusOptions`; `defaultStatusSeed` (`:169`) gets none, and the block cites a Properties.md subsection that doesn't exist.
- **`main/blocks.ts:280`** — the `{ id, file }` JSDoc sits on `listBlockHosts`; its real subject `markdownBlockFiles` (`:306`) is undocumented.
- **`components/README.md:13`** — "`index.ts` barrel-exports the set: `import { Button, Menu } from '@/design'`": neither the barrel nor the alias exists (`electron.vite.config.ts:17-20` defines `@shared`/`@renderer` only). `design-system/README.md:26` still calls the alias "a setup step taken when the first token file lands."
- **`electron.vite.config.ts:23-26`** — "Preview worktree only (uncommitted) … Not for the committed config" sits in HEAD alongside the `server.fs.strict: false` it disclaims. `git status` clean.
- **`menu.css.ts:199`** — "dropdown surfaces opt in via `dropdownRowTitle`"; the identifier exists nowhere else.
- **Type-value restatements that have drifted:** `symbols/index.tsx:153` + `AllSymbols.ts:4` ("one of the 61" — the registry holds 66) · `menu.css.ts:95,157` + `Menu.tsx:71` (each names Semibold over an `emphasized` style) · `settingsPane.css.ts:50-51` ("12" — `Menu.tsx:133` is 14) · `subfield.css:70-71` ("the 8px Subline text" — 10px) + `:16` ("matches the title divider: 1.25px" — the title divider is 1.75px) · `MarkdownPM/Tables/cellStatic` vocabulary.
- **`Cards/CardValue.tsx:81`** — "(future) context menu" while `onContextMenu` is defined at `:110-132` in the same file.
- **`Cards/CardsView.tsx:606`** — the indentation sentence sits on `buildMoveTargets`.
- **`crud/deleteProperty` / `removeProperty` headers** are correct; the *docs* were wrong (see §1).
- **Pane headers scoped to tables:** `GroupingPane.tsx:1`, `SortingPane.tsx:1`, `FilterPane.tsx:1` all say "a table view's" while Cards mounts all three.
- **`views.ts:141-144`** ("Render wiring is a follow-up" — landed: `TableView.tsx:541,604,609`, `LayoutToggles.tsx:39-40`) · **`views.ts:151-153`** ("drives a class on the table root" — no such class) · **`views.ts:336,352`** (tier-era mint comments; `:352` calls contexts default-ON while `columns.ts:50-53` says default-OFF).
- **`TableView.tsx:158`** — "persist async (watcher confirms)"; the confirm is the awaited refetch.
- **`InspectorPanel.tsx:4-9`** — documents a "frontmatter → properties → page info" content plan directly contradicting `PommoraPRD.md:167`, and restates `inspector-panel.css:2-3` less accurately.
- **`main/paths.ts` / `shared/types.ts:534`** — `ColumnKind` still names a Context column `'tier'` (`cellMenu.ts:73`, `columns.ts:20`, `value.ts:31`, `filter.ts:191`, `PreviewInspector.tsx:208`, plus prose at `:34,336`). Rename to `'context'` — but scope honestly: `tier` also survives in disclosure keys, `hiddenPaneModel`, `navResolve`, `ContextChip`, `treeMove`, **and** as an unrelated row-subordination prop (`GroupingPane.tsx:86-124`) and glass/type ramp tier — those must not be swept.
- **Plan/decision-log tags in code comments** — a codebase-wide CLAUDE.md violation, not a folder-local one: `bandDnd.tsx:20-21`, `bandDndModel.ts:180`, `tableDnd.tsx:18-22`, `paneDnd.tsx:22,84`, `Surfaces.tsx:202,259`, `GroupingPane.tsx:144,152,500,563,581`, `ViewSettings.tsx:37,88,151,175,275`, `SortingPane.tsx:60,148`, `viewMint.ts:1`, `value.ts:2`, `BlockHandleMenu.tsx:203`, `ViewEmbedBlock.tsx:269`, `TabBar.tsx:31`, `NavList.tsx:111,219`, `NavWindow.tsx:108,135`, `PaneSlider.tsx:19`, `sort.ts:171,199`, `reassign.ts:1`, `store.ts` (×9), `App.tsx:291`, plus SurfacePM's G-series and CardsView.css's B/C/E/F/I-series — ~50 files. Sweep as one pass.
- **Off-token durations in permanent surfaces:** `Sidebar.css:311-314` (`0.12s ease` — both duration *and* easing raw, twelve lines from the correct `.sidebar-toggle` pattern at `:221-225`) · `MarkdownPM/Styles.css:791` · `Tables/widget.css:50`. Their sibling grips use `--duration-fast`. → needsNathan #24
- **Dead `--dropdown-origin` keyword:** `settingsPane.css.ts:69-74` sets `top right`, shadowed by NotchedPane's inline write on a descendant.
- **`ViewSettings.tsx:258`** renders a permanently-disabled dashed square instead of the view's glyph; `ViewPane.tsx:167` already resolves `iconNameOr(v.icon, 'table')` and `:129` owns the picker.

---

## 5. Clean Docs

None. All 27 audited docs came back with at least one confirmed finding.

---

## Decisions For Nathan

Consolidated from all 27 audits; the doc fix depends on the answer.

1. **Context registry seeding** — wire `readRegistry` into `prepareOpenedNexus`, retire the seeder and rewrite Structure/Configuration/Contexts/CLAUDE.md, or seed only on an explicit new-Nexus action. Either way `createContextGroup`'s strict-read failure needs fixing. *(Structure, Configuration, Contexts)*
2. **Built-in non-deletable Status on Tasks/Events** — build the seed + a `deleteProp` reserved guard, or restate Properties.md and Agenda.md as pending. *(Properties, Agenda)*
3. **`.trash` layout** — flat timestamped is the design (fix Architecture.md + PRD:97), or path preservation is unbuilt work. *(Architecture)*
4. **`[[Title|alias]]`** — legacy id to discard, display alias to honor, or undefined. Four sources disagree: `shared/connections.ts:32` drops it, `cellStatic.tsx:38-40` renders it, `subfieldStats.ts:16` prefers it, Connections.md promises it as future. *(Connections, MarkdownPM)*
5. **Column width caps** — restore UNCAPPED, keep the ceilings and fix `columnWidths.ts:17-19` + TableView.md, or uncap only the text-shaped types. *(TableView)*
6. **Card drag under Group By: Location + Sort By: Location** — keep the cross-band move armed, or gate the whole drag on `!locationFsOrder`. *(CardView)*
7. **User-minted Context singular** — "New \<Title\>" (fix the docs, delete the unreachable fallback) or "New Space" (loosen the schema). *(Sidebar, Contexts)*
8. **`_pageset.json` `parent_id`** — heal on move, drop the field, or document it as a create-time breadcrumb and fix `mutate.ts:71`. *(PageSets)*
9. **Sub-Set openability** — amend the doc, close the hole in nav/resolve indexes, or resolve a Sub-Set hit to its depth-1 ancestor. *(PageSets)*
10. **Adoption-on-open vs. "leave a foreign vault alone"** — eager is the contract, make stamping lazy, or gate a never-opened folder behind an explicit Adopt action. *(Pages)*
11. **Fenced-code copy button** — delete the claim, move it to Deferred, or treat it as a regression. *(MarkdownPM)*
12. **Agenda item kind discriminator** — ratify the `.task.json`/`.event.json` extension (amend Structure.md + CLAUDE.md's "never the extension" rule), move to a JSON `kind` field, or mark provisional. *(Structure, Architecture)*
13. **`--io` content-inset reflow** — register the inset so it rides the progress, or narrow the doc's claim to what `--io` genuinely carries. *(Interaction)*
14. **Menu type authority** — Figma or code? Correcting the code shrinks every menu and sidebar row app-wide and discards the macOS-content-size rationale. *(Typography)*
15. **Page Property Panel** — does the shipped `PreviewInspector` close the Pending item, rescope it to the main pane + Agenda, or does PagePreview.md own it outright? Interacts with the trailing inspector's Claude-chat reservation. *(Properties, Inspector, Pages)*
16. **Subfield top divider** — lighter footer seam is deliberate (fix doc + `subfield.css:16` comment), consume `--border-heading`, or add a footer-seam token. *(Subfield)*
17. **Quick Capture scope** — Page-only, or the agenda write path as a named prerequisite. *(QuickCapture)*
18. **Compact card styling sign-off** — close it, or name the exact unsigned surface. *(CardView)*
19. **Homepage as BlockHost** — permanent first-class host, still removable (and what replaces it as the landing surface), or demoted to a dev surface. *(SurfacePM, Structure)*
20. **Insertion-line drag family** — a permanent peer treatment alongside the sort engines, or transitional pending an engine insertion-line mode. *(PommoraDND)*
21. **Mobile-Readiness Invariants** — a record (strip the two unbuilt items), a spec (retitle as prospective), or build the delay activation + `touchmove` hedge. *(PommoraDND, Interaction)*
22. **View-embed config lock ↔ geometry** — one key with the coupling documented and the button relabeled, a separate config-only key, or document the freeze as intentional. *(SurfacePM)*
23. **`EdgeLensGlass`** — delete, wire into GlassLeaf and document as a third recipe, or strip from the barrel as archived. *(DesignPM)*
24. **The ~120ms reveal beat** — add a `quick` token below `fast`, or normalize all three literals onto `fast`. *(Interaction)*
25. **`structural_order_mode` shared by two Order pickers with opposite defaults** — document the sharing, give the cards Location sort its own key, or hide one control when the other applies. `GroupingPane.tsx:311` defaults 'custom', `SortingPane.tsx:266` defaults 'location', both write one key read at `resolveView.ts:35,52`. *(Views)*
26. **`table`/`lock` curated keys shadow real Lucide ids** — the picker shows one glyph and the app renders another. Rename the curated keys with a read alias, filter shadowed ids from the picker, or accept and document. *(Icons)*
27. **NavWindow vs preview tint** — `NavWindow.tsx:187` passes 90, `PreviewWindow.tsx:203` passes 85, and the morph is supposed to read as one window. Pick one, or rewrite the comment + doc. *(PagePreview)*
28. **Contexts glyph kind** — `Ribbon.tsx:48` reads `'area'`, `Sidebar.tsx:526` reads `'space'`; identical until an override splits them. Point both at one kind, add a real `'context'` kind, or document the split. *(Sidebar)*
29. **`components/` folder rule** — fix the loose files to match the doc, or narrow the doc to what the code practises. *(DesignPM)*
30. **Space-to-Space tagging** — cross-Context only (add the guard) or any Space (drop "other"). *(Contexts)*
31. **"No roll-up"** — no rollup *property type* (keep, disambiguate in PageSets.md, cut the three echoes) or no *parent aggregation* (false as written — `flattenContainer` walks the whole subtree, `pipeline/group.ts:82-87`). *(Collections, PageSets, Architecture, PRD)*
32. **`link-2` for Connections** — keep the reservation and fix `Symbols.md:44`, drop it, or wire it. *(Icons)*

### Open Questions

Each needs a ruling before the affected doc can be rewritten.

#### Q1 — Agenda

**Question:** Is the built-in, non-deletable Status property on Tasks and Events still the design — and if so, should the seed and the delete guard be built now, or should all three doc lines be restated as pending until the agenda write surface lands?

**Conflict:** Agenda.md:28 ("The seed is one built-in, non-deletable Status property") and Properties.md:59 + :124 ("Status is built-in and non-deletable on Tasks and Events"; "`_status` on the Task and Event schemas is non-deletable") all assert it as a live rule. The code implements neither half: no production path writes `property_definitions`, so an agenda config is created empty (Pommora/src/main/crud/folderEntity.ts:37), and `deleteProp` removes any id handed to it with no built-in check (Pommora/src/main/crud/schema.ts:191-209) — `isReservedPropertyId` gates adds only (Pommora/src/main/properties/schema.ts:64).

- Build it: seed `_status` when an agenda config folder is created, and reject a reserved id in `deleteProp`. Docs stay as written.
- Restate: mark the seed and the non-deletable rule as pending in Agenda.md and Properties.md, landing with the agenda write surface. No code changes.
- Drop it: Status becomes an ordinary user-added property on agenda configs like any other, and all three doc assertions come out.

#### Q2 — Architecture

**Question:** Should the in-nexus trash preserve a deleted item's original path, or is the flat timestamped layout the intended design — i.e. do I fix the docs or file the layout-preserving trash as pending work?

**Conflict:** Two docs promise path preservation and the code does the opposite. Architecture.md's layout diagram says `.trash/<Type>/<Page>.md ← preserves original relative path under the source Type`, and PommoraPRD.md:97 independently says "Deletions move to an in-Nexus trash that preserves each item's original location." The implementation (Pommora/src/main/io/atomicWrite.ts:153-163) moves everything to a single flat `.trash/<ISO-stamp>__<basename>`, de-colliding with a numeric infix, and its own comment states "The original's relative layout is not preserved." Because two independent docs assert the same intent, this reads like a real feature that was never built rather than a doc slip — but I can't tell from the code which side is wrong.

- Docs are wrong — rewrite both Architecture.md and the PRD to describe the flat timestamped trash, and treat path preservation as never-intended.
- Code is behind — keep the docs' promise, mark it explicitly as pending in both, and file the work (store the nexus-relative source path, either as a mirrored directory tree under `.trash/` or as a sidecar manifest, so a restore can put the item back where it came from).
- Split the difference — flat storage stays, but the stamp filename gains the encoded source path so a future restore surface can reconstruct it; docs describe that shape.

#### Q3 — Architecture

**Question:** Is the `.task.json` / `.event.json` extension the settled on-disk kind discriminator for agenda items, or still a placeholder pending a different choice (filename prefix / frontmatter key)?

**Conflict:** Architecture.md's Deferred block says "the on-disk discriminator choice is open" and "Not built now" — but the code has already shipped one and treats it as authoritative. Pommora/src/shared/agenda.ts:49-53 defines AGENDA_SUFFIX and documents it as "the item's kind authority + title boundary," with agendaKindOf and agendaTitleOf deriving both kind and title from it; Pommora/src/main/index/build.ts:289-296 walks agenda folders by that suffix. Meanwhile the deferral is genuine in one narrower sense: Pommora/src/main/adopt.ts:96-105 still classifies only at the folder level and skips agenda folders wholesale, so no individual file is ever scoped to a kind at adoption. I can't tell whether the shipped suffix is the decision or an interim convention.

- The extension is the decision — rewrite the block to say so, and narrow the deferral to "adoption must apply the existing extension discriminator per file," which is a small, well-defined task rather than an open design question.
- The extension is interim — keep "the choice is open," but say plainly that a suffix convention already ships and is load-bearing in the read and index paths, so changing it later is a data-format migration, not a greenfield pick.
- Decide now against the alternatives (frontmatter `kind:` key, filename prefix) and record the reasoning in History.md, so the block collapses to a single settled sentence.

#### Q4 — CardView

**Question:** Under location grouping with Sort By: Location (Order: Location), should a card still be draggable for a cross-band move, or should the computed filesystem order retire the card drag entirely?

**Conflict:** CardView.md line 48 states the intent — "Sort By: Location on its filesystem Order disables it (the order is computed)" — while Pommora/src/renderer/src/Detail/Views/Cards/CardsView.tsx:392-393 retires only the within-band reorder and leaves the drag armed whenever `canRelocate` (structural grouping) holds, so a card can still be lifted and dropped into another Set's band as a real move.

- Doc is wrong, code is right: the computed order only kills the reorder — a cross-band move is a filesystem write, so it stays available. Rewrite line 48 accordingly.
- Code is wrong, doc is right: gate `cardDragEnabled` on `!locationFsOrder` so the whole drag goes inert under a computed order, and drop the cross-band path there too.
- Split it explicitly: keep the drag armed but make the same-band drop visibly refused (no landing preview) so the two behaviours read as intentional rather than as a half-disabled drag.

#### Q5 — CardView

**Question:** Is the Compact card styling signed off, or is there a specific Compact surface still awaiting your review?

**Conflict:** CardView.md's Pending list parks "Compact styling" as a build-then-sign-off pass, but the build has landed — the tightened band rhythm and imageless two-row reserve (Pommora/src/renderer/src/Detail/Views/Cards/CardsView.css:31-47) and the flow packing rules (:212-225) all render today; a separate Compact card behaviour is already recorded as signed off.

- Signed off: delete the Pending entry and let the Card Anatomy / Layouts sections carry Compact as current.
- Not signed off: keep the entry but name the exact unsigned surface (flow density? imageless reserve height? footing clearance?) so it's actionable rather than a standing placeholder.
- Partially: move the reviewed parts into the Features body and leave only the unreviewed knob in Pending.

#### Q6 — Collections

**Question:** What does "no roll-up" mean in the Collections/Sets model — no rollup PROPERTY type, or no aggregation of a Set's pages into its parent's view? The code does the second thing, so if the phrase means the latter it's false in four docs at once.

**Conflict:** Collections.md:12 (and PommoraPRD.md:116, PageSets.md:8, Architecture.md:59) all assert "Nesting is unbounded, with no roll-up." But a Collection's container view flattens its ENTIRE descendant subtree into rows — `flattenContainer` walks `container.sets` recursively and emits every nested page as a ViewRow stamped with its immediate parent Set id (Pommora/src/renderer/src/Detail/Views/pipeline/group.ts:82-87), which the pipeline then renders as structural Set / Sub-Set bands. Separately, the property type catalog has no `rollup` entry (Pommora/src/shared/properties.ts:17-28), which would make the phrase true under the other reading.

- It means "no rollup property type" — keep the phrase but disambiguate it once in PageSets.md (the owner) as "no rollup property" and delete it from the other three docs.
- It means "a parent doesn't aggregate its children" — then it's false as written; replace it everywhere with the real behavior: "a container's view shows its whole subtree as structural Set / Sub-Set bands; no computed aggregation exists."
- It means something narrower (e.g. no schema roll-up from Sets upward) — give me the intended sense and I'll restate it in one owning doc and cut the echoes.

#### Q7 — Configuration

**Question:** Should opening a Nexus that has no `.nexus/contexts.json` still auto-seed Areas / Topics / Projects from the labels — and if so, should the seeding read be re-wired into the open path, or has a fresh Nexus deliberately become Context-empty?

**Conflict:** Three docs state seeding as current behaviour: Configuration.md ("the entity labels seed the Context registry's titles"), Features/Contexts.md line 3 ("the registry seeds three (Areas, Topics, Projects) as ordinary, fully manageable entries"), and the project CLAUDE.md ("a registry seeds Areas, Topics, and Projects as ordinary entries"). The code disagrees: the only seeding path is `readRegistry` at src/main/contextsRegistry.ts:24, which writes a `seededRegistry` when the file is missing, and it is imported by nothing but src/main/contextsRegistry.test.ts. `prepareOpenedNexus` (src/main/index.ts:555) ensures identity and settings only, so nothing seeds, and readNexus leaves `contexts` undefined for such a Nexus (src/main/readNexus.ts:476).

- Restore the call — invoke the seeding read in `prepareOpenedNexus` alongside ensureIdentity/ensureSettings; all three docs then become true as written and only the "at migration" phrasing needs correcting.
- Declare a fresh Nexus starts with zero Contexts (the user mints their own) — delete `readRegistry` + `seededRegistry` as dead, and rewrite the seeding sentence in Configuration.md, Contexts.md and CLAUDE.md.
- Keep seeding but scope it narrowly (e.g. only when adopting a raw folder), and state that scope explicitly in Contexts.md so Configuration.md can just point at it.

#### Q8 — Connections

**Question:** What does the `|` segment in `[[Title|x]]` mean in Pommora — a legacy id to discard, a display alias to honor, or neither until the alias work lands?

**Conflict:** Four sources disagree. (1) src/shared/connections.ts:32 and src/main/connections/rewrite.test.ts:12-16 treat it as a legacy id: the pattern drops it, and a rename rewrites `[[Old Page|01H]]` to `[[New]]`, destroying the tail. (2) src/renderer/src/MarkdownPM/Tables/cellStatic.tsx:38-40 calls it an alias and renders the tail as visible plain text beside the styled title. (3) src/renderer/src/Detail/Subfield/subfieldStats.ts:16 prefers the tail as the display text when counting words and characters. (4) Connections.md's Prospects promises `[[Title|alias]]` as future work — on a delimiter the parser has already reserved for something else.

- Legacy id only — the doc states the tail is discarded on read, cellStatic stops rendering it, subfieldStats reads the title, and the alias prospect moves to a different delimiter.
- Alias — the doc states the tail is a display alias already honored on read, the rename cascade preserves it instead of dropping it, and the prospect narrows to authoring plus autocomplete insertion.
- Undefined for now — the doc states Pommora writes neither form, tolerates a tail on read, and leaves its display meaning unspecified until the alias work lands; the three render sites get aligned to one behavior in the meantime.

#### Q9 — Contexts

**Question:** When a user mints their own Context, should its Space-create entry read "New <the Context's own title>" (today's behavior, e.g. "New Classes"), or fall back to a flat "New Space" until per-Context Singular Editing ships?

**Conflict:** The doc (Contexts.md, Creates bullet) says user-minted Contexts "read flat 'New Space'", and its Pending entry frames singulars as something only the seeded three have. The code disagrees: `createContextGroup` seeds `singular: title` on every user-minted entry (src/main/crud/contextWrite.ts:252), so `createSpaceLabel`'s `'New Space'` fallback (src/shared/contexts.ts:87) is unreachable and the menu reads "New <Title>".

- Keep the code, correct the doc — a user-minted Context's singular starts as its own title, so the create entry reads "New Classes" and Singular Editing becomes purely about changing it later.
- Keep the doc, change the code — leave `singular` unset on user-minted Contexts so the create entry reads "New Space" until the user sets one (requires making `singular` optional in the registry schema).
- Split the difference — seed the singular from the title but naively de-pluralize it on create, so "Classes" yields "New Class".

#### Q10 — Contexts

**Question:** Is a Space allowed to tag Spaces inside its own Context (including itself), or is Space-to-Space strictly cross-Context?

**Conflict:** The doc says a Space "tags Spaces in *other* Contexts via its own sidecar keys." The code enforces no such restriction: `setSpaceContext` accepts any `contextId` and `targetTitles` resolves any Space id in the world, including the writing Space's own Context and the Space itself (src/main/crud/contextWrite.ts:196-215, 102-110).

- Doc is right, add the guard — reject a target in the source Space's own Context (or at minimum reject self-tagging) in `setSpaceContext`.
- Code is right, drop the word "other" — a Space tags whichever Spaces fit, same as any entity, and self-tagging is a user's problem.
- Allow same-Context tagging but reject self-reference only, which is the one case that can never mean anything.

#### Q11 — DesignPM

**Question:** Is "one folder per component, each consuming semantic tokens only, never raw values" a rule the loose files in `components/` are violating and should be fixed to, or a description that was never true of shared primitives and should be narrowed?

**Conflict:** DesignPM.md states it twice as settled fact ("Rule: components reference **semantic tokens only**, never raw values; one folder per component" and again under Components), and `design-system/components/README.md:3-13` repeats it. But `design-system/components/` holds seven files loose at its root — `NotchedPane.tsx` + `notchedPane.css.ts`, `InteractionField.tsx` + `interactionField.css.ts`, `OverflowScroll.tsx`, `Reveal.tsx`, plus the `dropdownAnchor.ts` / `fieldRing.ts` / `useDismiss.ts` helpers — and raw values are authored directly in `notchedPane.css.ts:13` (`drop-shadow(0 4px 14px #00000059)`) and `NotchedPane.tsx:250` (`stroke="#FFFFFF"`). NotchedPane in particular is exactly the folder shape, flattened.

- Keep the rule as written and treat the loose files as debt — move NotchedPane and InteractionField into folders, and fold their raw hex into tokens (a shadow variant, an on-glass white).
- Narrow the doc to what the code actually practises: a component with its own styles gets a folder; shared cross-component primitives and hooks live flat at the `components/` root. Keep "semantic tokens only" scoped to color and type, since spacing / radius / glass literals are explicitly not tokenized yet.
- Split the difference — the folder rule stays absolute, the token rule gets a stated exception for glass optics and geometry until those scales exist.

#### Q12 — DesignPM

**Question:** Is `EdgeLensGlass` parked prospective work worth keeping, or dead code to delete?

**Conflict:** DesignPM.md says "Two recipes in `materials/`" — frost and liquid — and describes the liquid one as `@samasante/liquid-glass`. But `materials/edge-lens.tsx` is a third, hand-rolled liquid implementation (SDF bevel map → `feDisplacementMap` with chromatic aberration), exported from `materials/index.ts:9-10` under the comment "used by the design-system glass lab." Nothing imports it. The glass lab it names — `showcase/leaves/GlassLeaf.tsx` — renders a CSS-frost tuner instead and never touches it. So either the doc's count is right and this file shouldn't exist, or the file is intentional and the doc is hiding a third recipe.

- Delete `edge-lens.tsx` and its barrel export — `@samasante/liquid-glass` is the liquid recipe, and the doc's "two recipes" becomes true as written.
- Keep it as the in-house fallback for a future non-Chromium target, wire it into GlassLeaf so the lab comment stops lying, and add it to the doc as a named third recipe with its status stated.
- Keep the file but strip it from the barrel and mark it explicitly parked, so it reads as an archived experiment rather than part of the material vocabulary.

#### Q13 — Icons

**Question:** Two curated keys (`table` and `lock`) are also real Lucide ids for completely different glyphs, and the curated registry wins — so picking Lucide's Table or Lock in the Icon Picker renders Pommora's grid / solid-lock instead of the glyph the picker cell showed. Do we rename the curated keys off the collision, hide shadowed ids from the picker, or accept it and say so in the doc?

**Conflict:** Icons.md:70 asserts "A picked id is stored as its bare Lucide kebab id, the same convention as the curated names, so the two sources render through one path." The code contradicts the "one path" premise: symbols/index.tsx:143 maps `table` → Grid3x2 and :148 maps `lock` → LockSolid (a custom glyph), while lucide-react ships its own `table.mjs` and `lock.mjs` — both of which appear as pickable cells because AllSymbols.ts:28-38 enumerates the full Lucide set. Icon (symbols/index.tsx:215) resolves the curated registry FIRST, so the stored id renders the curated glyph, not the picked one. IconPicker.tsx:222 draws the cell from the full-set component, so the grid and the result disagree.

- Rename the curated keys to non-colliding ids (`grid-3x2`, `lock-solid`) and alias the old ids on read — view sidecars persist icon ids, and viewIcon.ts already carries a legacy `'tablecells'` read path, so the alias pattern exists.
- Filter ids that the curated registry shadows out of ALL_ICONS so the picker never offers a cell it can't honor — smallest change, but it silently removes two real Lucide glyphs from the user's reach.
- Accept the shadowing as intentional (Pommora's vocabulary outranks the library) and correct Icons.md to state that a curated key wins over a full-set id of the same name.

#### Q14 — Icons

**Question:** Does Connections actually get `link-2` as its glyph, or should the reservation be dropped? Nothing in the app renders it, and the two docs that assign it disagree about what it's for.

**Conflict:** Icons.md:64-66 assigns `link-2` to Connections and reserves it for the `[[Title]]` surface. The registry's own mirror, symbols/Symbols.md:44, assigns `link-2` to the "Context/Relation property type · Connections" — but there is no relation property type (the project CLAUDE.md states content ↔ content relational properties don't exist), and the Context type is `layout-grid` per PropertyTypes.tsx:27. The code settles neither reading: `link-2` appears exactly once in the whole renderer, at symbols/index.tsx:130, with no consumer.

- Keep the reservation, mark it plainly unwired in Icons.md, and fix Symbols.md:44 to read "Registered, held for the Connections surface" — the same phrasing its other unassigned keys use.
- Drop `link-2` from the registry and from both docs until a connections surface actually needs a glyph; re-add it then.
- Wire it now — give the connections surface (autocomplete rows / hover card) the `link-2` lead so the assignment stops being a claim about nothing.

#### Q15 — Inspector

**Question:** When the Page Property Panel ships for the main pane, does it reuse the existing front-matter inspector component in a side pane — which means the trailing inspector either gives up its Claude-chat reservation or the shell grows a second side slot — or does it mount inline with the page content, leaving the trailing inspector Claude-only and rendering properties two different ways in the main pane versus the preview?

**Conflict:** `Features/Inspector.md:5` says the trailing pane is reserved for the Claude chat and that properties "live with the content." `Features/Properties.md:132` files the Page Property Panel as Pending — "a panel attached to the content… there's no UI to view or edit them on an entity." But `Features/PagePreview.md:39` documents a fully built front-matter inspector ("properties only"), and the code confirms it: `PreviewInspector.tsx:201` renders the context and property groups with Add/Remove, while `PageView.tsx:69` renders no property surface at all. So the shipped component that does this job is an inspector-shaped side pane, and the main shell's inspector-shaped side pane is reserved for something else. Correcting the doc's properties sentence requires knowing which way this resolves.

- Trailing inspector stays Claude-only; the Page Property Panel mounts inline in the page (a collapsible front-matter strip beneath the title/banner). Costs: the main pane and the preview render the same data through two different surfaces.
- Trailing inspector becomes a two-mode pane (Properties | Claude chat) hosting the existing PreviewInspector component. Costs: one property surface everywhere and no new chrome, but the Claude chat no longer owns the slot outright.
- Keep properties preview-only for now and say exactly that in both docs — no page-attached panel in the main pane, and the Inspector doc drops the "they live with the content" claim entirely rather than pointing at an unbuilt surface.

#### Q16 — Interaction

**Question:** Should the inspector's content-inset reflow actually be derived from `--io`, or should the doc be corrected to describe the independent per-surface padding transitions the code has today?

**Conflict:** The doc's Principles bullet states the law — "One progress variable drives a coordinated multi-element move (the `--io` shell) rather than N independent transitions that can desync" (Interaction.md) — and the `--io` section lists the content-inset reflow as one of its passengers. The code does the opposite: `styles.css:151` flips `--content-inset-right` as a plain unregistered custom property (it snaps), and `Detail/Detail.css:31`, `MarkdownPM/Styles.css:50` and `Detail/Subfield/subfield.css:19` each run their own `padding` transition. They share the base token, so they look synced, but they are exactly the N independent transitions the principle forbids.

- Treat it as a code defect: register `--content-inset-right` (or express the insets as `calc()` off `--io`) so the reflow genuinely rides the one progress, then leave the doc as written.
- Treat it as intended: the insets are layout, not the inspector's motion, so document them as siblings on the same token and narrow the `--io` claim to the slide, the trio ride and the glass void.
- Split the principle: `--io` owns everything that must be frame-exact against the pane's own edge; anything merely landing on the same beat is allowed its own transition, and the doc says so explicitly.

#### Q17 — Interaction

**Question:** Is the ~120ms reveal beat (sidebar section "+", callout grip, table grip) an intentional step that deserves its own motion token, or drift that should be normalized onto `fast`?

**Conflict:** The doc asserts both halves of a contradiction: the Sidebar catalog says "Row and section hovers run a step faster than the rest of the sidebar's chrome" (reads as a deliberate faster beat), while Timing Sources says "A hardcoded duration in a permanent surface is a bug." The code has the literal in three permanent surfaces — `Sidebar/Sidebar.css:313`, `MarkdownPM/Styles.css:791`, `MarkdownPM/Tables/widget.css:50` — and the sibling grips in that same shared recipe (`MarkdownPM/Styles.css:236`, `:248`) already use `--duration-fast`.

- Add a `quick` step to `motion.ts` below `fast`, point all three at it, and keep the doc's "a step faster" language as a real token relationship.
- Normalize all three onto `--duration-fast`, delete the "a step faster" claim, and keep the duration scale at five steps.
- Keep the literals but document them as deliberate exceptions in Timing Sources alongside the drag-feel presets — weakest option, since it dilutes the rule the section exists to state.

#### Q18 — MarkdownPM

**Question:** Is the fenced-code copy button still wanted? The doc says it ships; nothing in the codebase implements it. Should I delete the claim outright, or move it to Deferred as work you still want?

**Conflict:** The doc (Constructs → Code) states "fenced gets a copy button." The code has no copy affordance anywhere in MarkdownPM — the fenced-code branch in `Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts:259` emits only a line class and marker hides, and a case-insensitive grep for "copy" across the whole module returns nothing.

- Delete the claim — a copy button was never part of the design, and the Code bullet reads correctly without it.
- Move it to Deferred ("**fenced-code copy button** — not built") because you still want it, and leave the Constructs bullet describing only what renders today.
- Treat it as a regression: the doc is right, the button was lost, and it should be rebuilt rather than documented away.

#### Q19 — MarkdownPM

**Question:** Are aliased connections `[[Title|alias]]` a closed question or a live one? The doc calls it an "open paradigm call"; the shared model treats the pipe form as legacy and drops it.

**Conflict:** MarkdownPM.md (Tables → Connections in cells) frames aliases as undecided: "An aliased `[[Title|alias]]` collides with cell-pipe escaping, so autocomplete only inserts alias-free `[[Title]]` (open paradigm call)." `Pommora/src/shared/connections.ts:1-5` states connections carry "no id / pipe / alias", and :25 calls `|` "the legacy-alias delimiter" whose segment the pattern drops — matching the project ClaudeMD's title-only definition. Meanwhile `Tables/cellStatic.tsx:38-40` deliberately renders a `|alias` tail as plain visible text, so an aliased link today renders half-styled rather than being rejected.

- Close it as out of paradigm: state that `[[Title|alias]]` is legacy syntax the resolver ignores and the renderer leaves as literal text, and drop the "open paradigm call".
- Keep it open but move it out of the Tables bullet into Deferred as "**aliased connections** — undecided; the pipe form is parsed-and-dropped today."
- Decide aliases are wanted, in which case the shared model's "no alias" comment and the cell-pipe escaping both need to change and this becomes a spec, not a parenthetical.

#### Q20 — Navigation

**Question:** Is the NavWindow rail as built — the Favorites list with the List / Gallery toggle beneath it — the intended rail, or a stand-in still pending your design call? And does the shipped hover pin marker count as settled, leaving only the current-item marker open?

**Conflict:** Navigation.md line 23 describes the rail as a built surface ("A glass rail (a Favorites sidebar) beside a main frame") and the code matches it exactly — NavWindow.tsx:202-216 renders the favorites NavList plus the Style toggle. But Navigation.md line 59's Pending section lists "the pin/current-item row marker, and the rail content" as open design work. Rows likewise already carry the pin marker (NavList.tsx:176 with navList.css:21-41), while list rows carry no current-item treatment even though gallery cards do (NavGallery.tsx:131).

- Rail is done — strike "the rail content" from Pending and keep only the Figma gallery form + the current-item row marker as open.
- Rail is a placeholder — keep it in Pending, and change line 23 to present the Favorites list as the current stand-in rather than the spec.
- Split it — rail composition is settled (favorites) but the toggle's placement inside the rail is still open; say exactly that in Pending.

#### Q21 — PagePreview

**Question:** Should the NavWindow adopt the floating preview's tint so the flavor morph really does carry one background, or should the doc (and the code comment) stop claiming the two match and accept a small opacity step through the morph?

**Conflict:** PagePreview.md §The NavWindow Flavor says "The window paints the floating preview's tint," and NavWindow.tsx:186's comment says "The preview window's tint verbatim — the flavor swap keeps ONE background, no opacity jump." But NavWindow.tsx:187 passes tintOpacity 90 while PreviewWindow.tsx:203 passes 85 (SettingsWindow.tsx:83 also sits at 90, and the PreviewPane default is 85). Neither window restyles `--ppane-bg`, so the fills differ only in opacity and the morph does step. I can't tell from the code which value is the intended one — the doc and comment agree on parity, the code disagrees with both, and picking a side is a visual decision.

- Bring the NavWindow down to the preview's tint — honors the stated "one background" intent; the nav window becomes slightly more transparent than it is today.
- Bring the preview up to the value the NavWindow and Settings window share — parity holds from the other side, and the floating preview becomes slightly more opaque.
- Keep both values and rewrite the doc plus the NavWindow comment to say the nav window sits a step more opaque than the preview, accepting the opacity step through the morph.

#### Q22 — PageSets

**Question:** Should a Sub-Set (depth-2+) be openable at all outside the sidebar, or is the expand-only rule meant to hold everywhere — and should I fix the doc or fix the code?

**Conflict:** PageSets.md § Selection + Navigation says Sub-Sets "are expand-only … and they have no detail view." The code says otherwise on every non-sidebar path: `navSearch.ts:33` indexes every Set at any depth as a selectable target, `useNavData.ts:95-108` selects whatever it's handed, and `DetailPane.tsx:49-58` renders a full `ContainerView` for any `set` selection. `Scope.ts:73-79` shows this is knowing tolerance, not an oversight — "a reparent + Back-nav replay can surface one as a `set` selection, so the view paths test this rather than trusting 'depth-1 by construction'."

- Keep the code, amend the doc — Sub-Sets are sidebar-expand-only but openable from search / pins / Back-nav, where they render the container view without the view switcher.
- Close the hole so the doc stands as written — exclude depth-2+ Sets from `buildNavIndex` and `buildResolveIndex`, and have `DetailPane` route a non-depth-1 `set` selection to its owning depth-1 ancestor.
- Middle path — keep Sub-Sets findable in search (they're real folders a user will type the name of) but have the click resolve to the nearest depth-1 ancestor rather than opening the Sub-Set itself.

#### Q23 — PageSets

**Question:** Is `_pageset.json`'s `parent_id` meant to be a durable pointer that survives a move, or a create-time breadcrumb that folder position supersedes?

**Conflict:** PageSets.md § Sidecar states `parent_id` IS "its immediate parent." `mutate.ts:70-72` asserts "Position is authoritative (both builds heal parent_id from it)" — but React never heals: `moveFolderEntity` (folderEntity.ts:61-73) is a bare `fs.rename`, and `adopt.ts:38` stamps `parent_id` only at mint. Nothing on the read path reads the field, so today it's inert data that silently goes wrong on the first move. Which of the two the doc should describe depends on whether cross-build (Swift Model A) compatibility still wants the field.

- Heal it — have `moveSet` rewrite the moved Set's `parent_id` from its new parent's sidecar, making the doc's sentence true and the field trustworthy.
- Drop it — remove `parent_id` from `pageSetSidecar` and the create path; position is already the only authority, and a field nothing reads is a data-loss surface for anyone who does trust it.
- Keep as-is and document honestly — "a `parent_id` breadcrumb stamped at create; position is authoritative and a move doesn't rewrite it" — and fix the false comment at `mutate.ts:71`.

#### Q24 — Pages

**Question:** Is eager adoption-on-open the intended contract, or is stamping a ULID into every un-adopted `.md` the moment a folder is opened a violation of the "leave a foreign vault alone" promise this doc states?

**Conflict:** The doc (Features/Pages.md § Adoption) asserts a design goal: "The loader never writes back … opening a folder that's also an Obsidian vault leaves notes byte-identical until touched." The code does the opposite by construction: src/main/index.ts:555-567 runs `stampAdopted` on every open path, and src/main/adopt.ts:29-35 rewrites each `.md` lacking an `id`. The main-process comment at index.ts:552-553 states the eager stamp as deliberate — "so the index + every later write capture a stable id, not a transient `adopted-` placeholder" — so this is two intents disagreeing, not an oversight. It also collides with the project's Obsidian-compatibility framing in CLAUDE.md.

- Code is right, doc is wrong: rewrite § Adoption to describe eager adoption-on-open as the intended contract — a foreign vault gets `id:` stamped into every page on first open, with foreign keys/comments/body preserved.
- Doc is right, code is wrong: make stamping lazy — keep the `adopted-<hash>` read id and mint a real ULID only on the first write to a given page. Costs the index a stable key for never-edited pages.
- Split the difference: keep eager stamping for a nexus Pommora created or has already adopted, and gate a never-before-opened foreign folder behind an explicit "Adopt this folder" action, so pointing Pommora at an Obsidian vault to look around genuinely changes nothing.

#### Q25 — PommoraDND

**Question:** Is the bespoke insertion-line family (sidebar tree, table rows, table bands, the property panes — all on `gesture.ts`) a permanent second treatment that sits alongside the sort engines as a peer, or a transitional state that should eventually fold into the engine seam?

**Conflict:** The doc says two different things. "Sidebar Tree (The App's Chosen Behavior)" presents the insertion-line treatment as a deliberate, chosen design ("because its drop feel is an Apple-style insertion line, not displacement"), which reads permanent. "Verification Harness" then frames engine adoption as the trajectory — "The sidebar tree is adopted; the main list / view rows remain a later, deliberate integration" — which reads transitional. The code supports neither reading cleanly: the engine seam is consumed by seven app surfaces (`TabBar.tsx:201`, `Ribbon.tsx:80`, `NavGallery.tsx:59`, `IconPicker.tsx:160`, `PreviewTabStrip.tsx:112`, `ViewEmbedBlock.tsx:452`, `CardsView.tsx:459` + `:474`) while four more run entirely on `gesture.ts` with their own models, snapshots, and drop chrome. Which one the doc should describe as the system's shape is a design call, not a code fact.

- Declare two permanent, named treatments — "displacement" (engine-backed: pills, tabs, cards, galleries) and "insertion line" (bespoke: trees, table rows, bands, panes) — and rewrite the doc around that split, with `gesture.ts` documented as the second family's shared skeleton rather than a helper.
- Declare the insertion-line family transitional and name the target: the sort engines grow an insertion-line drop mode, and the bespoke surfaces migrate onto it. The doc then keeps an explicit, dated-free Pending section for that migration.
- Keep the current framing but scope it honestly: state that engine adoption is complete for the surfaces that displace, and that the insertion-line surfaces are out of scope for adoption by design.

#### Q26 — PommoraDND

**Question:** Are the "Mobile-Readiness Invariants" a record of what's built, or a spec of what a future touch pass must hold to?

**Conflict:** The section reads present-tense and factual ("the sensor and collision layers keep a future touch UX viable: … delay+tolerance activation, a non-passive `touchmove` hedge …"), but two of its six items don't exist: activation is a pure travel-distance threshold with no timer (`gesture.ts:92`, `engine.tsx:221`), and there is no `touchmove` listener anywhere in the renderer. The other four (`touch-action: none`, `pointercancel` handling, a separable keyboard sensor, size-agnostic collision math) do hold. Correcting the doc and correcting the code are different jobs, and which one is wanted depends on whether touch is a real near-term target.

- Treat it as a record: strip the two unbuilt items so the section states only what holds today (my suggested rewrite in falseClaims).
- Treat it as a spec: retitle to make it prospective — an explicit "what a touch pass must add" list — and keep the delay activation and `touchmove` hedge in it as unbuilt requirements, clearly marked.
- Build the two: add an optional press-delay to `PointerGestureSpec` alongside the travel threshold, and a non-passive `touchmove` preventDefault hedge on active drags — then the section becomes true as written.

#### Q27 — Properties

**Question:** Is the built-in, non-deletable Status property on Tasks and Events a shipped guarantee that regressed, or a design decision that was never built? Should I build the seed + the delete guard, or restate both docs as prospective?

**Conflict:** Properties.md §Status ("Status is built-in and non-deletable on Tasks and Events") and §Validation ("`_status` on the Task and Event schemas is non-deletable") both assert it, and Agenda.md §Schema + Status repeats it ("The seed is one built-in, non-deletable **Status** property"). The code does neither: `createFolderEntity` writes only `{ id, ...extra }` to a `_taskconfig.json` / `_eventconfig.json`, so no Status def is ever seeded (main/crud/folderEntity.ts:23-38); `deleteProp` carries no reserved-id guard, so a `_status` def would delete like any other (main/crud/schema.ts:191-209); and `RESERVED_PROPERTY_ID.status` has no reference anywhere outside its own declaration (shared/properties.ts:140).

- Build it — seed `defaultStatusSeed()` into a new agenda config's `property_definitions` and add a reserved-id guard to the Agenda delete/changeType paths; leave both docs as written.
- Restate — move the built-in Status to Pending in both Properties.md and Agenda.md, and drop the non-deletable line from §Validation until the guard exists.
- Split — keep the seed as the intended design in Agenda.md (it's an EventKit contract), and mark only the non-deletable enforcement as unbuilt in Properties.md §Validation.

#### Q28 — Properties

**Question:** Does the shipped Page Preview front-matter inspector close the "Page Property Panel" Pending item, or is a second panel still planned for the main window's page surface (and for Tasks / Events)?

**Conflict:** Properties.md Pending says "there's no UI to view or edit them on an entity," and §Where Properties Live closes with "the Page Property Panel is Pending." But PreviewInspector ships exactly that surface — it lists a page's Context rows and assigned properties, edits them through the table's own Cell / PropertyPicker / CalendarPicker / PropertyEditor primitives, reveals empties via "+ Add Property," and offers Remove on right-click (renderer/src/PagePreview/PreviewInspector.tsx:48-230), mounted in both PreviewWindow.tsx:227 and NavWindow.tsx:226. PagePreview.md §The Inspector documents it as shipped. Separately, Inspector.md states the main window's inspector body renders nothing and that properties deliberately live with the content.

- Close it — delete the Pending entry, and change §Where Properties Live to point at the Page Preview inspector (→ PagePreview.md) as the entity-level value surface alongside table cells.
- Rescope it — keep the Pending entry but narrow it to what's genuinely missing: the same panel on the main detail pane's page surface, and any property panel for Tasks / Events.
- Relocate it — treat the inspector as PagePreview.md's to own, and have Properties.md carry only a cross-reference plus the Agenda gap.

#### Q29 — QuickCapture

**Question:** Does Quick Capture ship Page-only, or does the agenda write path get built as a prerequisite so Tasks and Events can capture on day one?

**Conflict:** QuickCapture.md says capture covers 'Pages, Tasks, and Events' and 'reuses the same create operations … as the main app' — but the code has no Task/Event write path reachable from the app at all: `MutableKind` (Pommora/src/shared/mutate.ts:14) has no task or event member, `agenda:list` (Pommora/src/main/index.ts:351) is the only agenda IPC channel and is read-only, and the agenda CRUD in Pommora/src/main/crud/agendaEntity.ts is imported only by tests. Correcting the doc means choosing what Quick Capture's scope actually is, which the code can't answer.

- Scope the doc to Page capture and move Task/Event capture down into Pending alongside the agenda write path
- Keep all three kinds in scope and name the agenda write path (mutate ops + IPC + container creation) as an explicit prerequisite in Pending
- Treat wiring the agenda write path as its own piece of work that lands first, and leave the doc's three-kind claim standing as the post-prerequisite design

#### Q30 — Sidebar

**Question:** Which entity kind should own the Contexts glyph now that the tier era is gone — and should `area`/`topic`/`project` come out of the icon-kind list entirely?

**Conflict:** The ribbon's Contexts tab resolves its icon through `defaultEntityIcon('area', …)` (Pommora/src/renderer/src/Sidebar/Ribbon.tsx:48), while the Context group headers in the content column resolve through `defaultEntityIcon('space', …)` (Pommora/src/renderer/src/Sidebar/Sidebar.tsx:526). Both seed to the same glyph today (Pommora/src/renderer/src/design-system/symbols/index.tsx:174-182), so they look identical — but a personalization override on either kind splits them. Meanwhile `ENTITY_ICON_KINDS` still ships `area`, `topic`, and `project` (Pommora/src/shared/types.ts:95-97) even though Contexts are now ordinary user-defined registry entries with no fixed three. Sidebar.md asserts the mode icons "reuse each kind's own entity icon," which can't be made true while two surfaces of the same feature read two different kinds.

- Point both at 'space' and drop area/topic/project from ENTITY_ICON_KINDS (smallest change; the Contexts tab then tracks the same override as the group rows)
- Add a real 'context' icon kind, point the ribbon tab and the group-header fallback at it, and retire area/topic/project
- Leave the split and document it: the ribbon tab and the group rows are independently overridable glyphs

#### Q31 — Sidebar

**Question:** Should a user-minted Context's Space-create item ever read "New Space," or is "New <Context title>" the intended label?

**Conflict:** Sidebar.md says user-minted Contexts "read flat 'New Space'." `createSpaceLabel` does carry that fallback (Pommora/src/shared/contexts.ts:87), but `createContextGroup` seeds `singular: title` on every app-created Context (Pommora/src/main/crud/contextWrite.ts:252) and the registry schema forbids an empty singular (Pommora/src/shared/contexts.ts:18) — so the fallback can never fire. The doc and the seeding code encode opposite intents, and the fallback branch is currently unreachable code.

- Doc follows code: a Context's singular defaults to its title, so the item reads "New <Title>" until Settings edits the singular — and delete the unreachable fallback
- Code follows doc: leave singular unset for user-minted Contexts (loosening the schema to allow it) so the item reads "New Space" until the user names a singular
- Keep singular = title on disk but have the create label fall back to "New Space" while singular still equals title

#### Q32 — Structure

**Question:** Should the Contexts registry seed Areas/Topics/Projects on open, or is a Context-less fresh Nexus the intended start?

**Conflict:** Structure.md L5/L10-12/L17 and CLAUDE.md both state the registry seeds Areas, Topics, and Projects as ordinary entries. The code has the seeder (`seededRegistry` in src/shared/contexts.ts:71, `readRegistry` in src/main/contextsRegistry.ts:24, both covered by tests) but nothing in production calls it — `prepareOpenedNexus` (src/main/index.ts:555) never touches `.nexus/contexts.json`, and `walkNexus` returns `contexts: []` when the file is absent (src/main/readNexus.ts:483). I can't tell from the code whether the wiring was dropped with the tierN removal or whether an empty start is now deliberate.

- Wire `readRegistry(root, labels)` into `prepareOpenedNexus` so a fresh Nexus seeds the three Contexts from its labels — both docs then become true as written, and the fix is one call.
- Retire the seeder (`seededRegistry`, `readRegistry`, and their tests) and rewrite Structure.md + CLAUDE.md so Contexts start empty, with Areas/Topics/Projects named as the conventional first three a user creates rather than seeded entries.
- Keep the seeder but fire it only from an explicit first-run/"new Nexus" action, so adopting an existing folder never writes Contexts into it — then scope the docs' seeding language to new Nexuses only.

#### Q33 — Structure

**Question:** Is an Agenda item's kind allowed to come from its filename extension, or does the "kind is the folder's sidecar, never the extension" rule apply to items too?

**Conflict:** Structure.md L81 and CLAUDE.md both state kind authority is the folder's sidecar, never the extension. But src/shared/agenda.ts:49 comments `AGENDA_SUFFIX` as "the item's kind authority" and `agendaKindOf` (:56) decides task-vs-event purely from the `.task.json` / `.event.json` suffix. src/main/adopt.ts:95 explicitly flags this as unresolved: the folder-level guard is a placeholder and "the on-disk discriminator choice is open," pointing at Architecture.md § "Agenda discrimination." Which side is the rule and which is the temporary shape is a product decision.

- Ratify the extension as the item-level kind authority: amend the rule in Structure.md and CLAUDE.md to "folder sidecar for containers, filename suffix for Agenda items," and close the adopt.ts DEFERRED note.
- Hold the sidecar-only rule and move Agenda items to a discriminator inside the JSON (a `kind` field), making the suffix cosmetic — a larger change that touches collectAgenda, agendaEntity, contextWrite, and the index builder.
- Leave the code as-is but mark the extension rule as provisional in Structure.md, deferring to Architecture.md § "Agenda discrimination" until the Agenda surfaces are built.

#### Q34 — Subfield

**Question:** The Subfield's top divider is a hand-rolled hairline, lighter than the app's shared heading seam token. Is the lighter footer seam the intended design (doc gets corrected), or is this drift that should consume the shared token (code gets corrected)?

**Conflict:** Subfield.md line 18 says "The top divider is the shared title-divider hairline." The code hand-writes `border-top: 1.25px solid var(--separator-border)` at Pommora/src/renderer/src/Detail/Subfield/subfield.css:17, while the app-wide heading/title seam is the `--border-heading` token defined at Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts:44 (a heavier rule) and consumed by the banner title header at Pommora/src/renderer/src/Detail/Banner/Banner.css:131. CLAUDE.md's design rule says tokens must be pulled from their sources, never hand-rolled.

- Deliberate: keep the code, rewrite the doc as "a hairline on the shared separator colour, set lighter than the app's heading seam."
- Drift: change subfield.css to `border-top: var(--border-heading)` and keep the doc's "shared" wording — the seam under the footer becomes visibly heavier.
- Third weight: add a footer-seam token at the current weight in the token file, have subfield.css read it, and let the doc name that token.

#### Q35 — SurfacePM

**Question:** Should locking a view embed's *configuration* also freeze the tile's position and size — and if so, should the SettingsPane's footer button still read "Lock view configuration"?

**Conflict:** The doc and the scope contract both define this lock as config-only: SurfacePM.md says "The lock freezes **configuration**, not reading," and src/renderer/src/Embeds/ViewEmbedScope.tsx:25-27 says "Frozen: view config + view CRUD. Live: data drags, value edits, and view state." But the SettingsPane footer writes the same `locked` key that src/renderer/src/Blocks/BlockSurface.tsx:433 feeds into `isTileStatic`, so pressing "Lock view configuration" also makes the tile un-draggable and un-resizable — geometry neither source claims it touches.

- Keep one key and accept the coupling — the doc then states plainly that any per-tile lock is a geometry lock too, and the SettingsPane footer is relabeled ("Lock Tile") so the button matches what it does.
- Split the concerns — the view embed gets a config-only key that leaves drag/resize live, and only the handle menu's footer lock freezes geometry; the doc keeps its current "configuration, not reading" wording.
- Keep both the key and the label, and document the geometry freeze as an intentional part of the config lock ('a locked tile is settled — nothing about it moves').

#### Q36 — SurfacePM

**Question:** Is the Homepage now a permanent first-class BlockHost, or is it still slated for removal once Spaces are the only hosts?

**Conflict:** SurfacePM.md calls it "the removable dev host until the real hosts land," and src/renderer/src/Detail/HomepageView.tsx:8-12 still calls homepage.json "the G-12 dev host; removable behind the BlockHost seam." Against that, Spaces have landed as real hosts (BlockHostRef's `space` kind, `_space.json` docs, seeded starter boards, a routed detail view with its own board lock) while the Homepage is simultaneously the app's home route with its own banner, heading-icon toggle, and board lock in the settings scaffold. The code can't say which of those two futures is intended.

- Permanent — rewrite both the doc and the HomepageView comment to describe two first-class hosts (the Homepage singleton and any Space), and drop 'dev host' entirely.
- Still removable — keep the framing but say in the doc what replaces the Homepage as the landing surface, so the removal isn't an unexplained loose end.
- Demote — keep the Homepage reachable but state it as a developer surface, and make a Space (or a chosen default Space) the real landing host.

#### Q37 — TableView

**Question:** Should every column type resize without a ceiling, or do the per-type maxes stay and both the doc and the width-table comment get corrected to say so?

**Conflict:** TableView.md's Overflow & Scroll section says "every type is uncapped; only the legibility mins clamp," and columnWidths.ts:17-19 carries the same statement attributed to you — "Max is UNCAPPED for every type (Nathan): a resize past the pane pushes the table into rightward h-scroll instead of hitting an immovable per-type wall." The width table three lines below contradicts both: only `title` and the unknown-type fallback use `UNCAPPED`; context, status, select, multi-select, checkbox, link, file, number, date and both timestamp columns all carry finite maxes, and clampWidth enforces them (columnWidths.ts:21-36, :80-89). I can't tell from the code whether the caps are a regression against a decision you made, or whether the decision was narrowed and the prose never caught up.

- Treat the caps as the regression: set every type's max to UNCAPPED so a resize only ever meets its legibility min, and leave both the doc and the comment as written.
- Treat the caps as intended: keep the width table, and rewrite the doc sentence and the code comment to say the Title column (and unknown types) resize freely while every other type also clamps to its own max.
- Split it: uncap the wide text-shaped types (link, file, select, multi-select, number) and keep hard ceilings on the narrow control-shaped ones (checkbox, status, the timestamps), then state that rule in the doc.

#### Q38 — Typography

**Question:** For menu and dropdown rows, which is authoritative — the Figma text styles this doc mirrors, or the code's deliberate choice? The doc says row titles are Callout/Standard and headings are Headline/Standard; the code ships Body/Standard and Headline/Emphasized, with a rationale baked in ("Composes Body/Standard so the title is 13px, the macOS standard content size"). Do I correct the doc to match the code, or is the code the thing that drifted from Figma?

**Conflict:** Typography.md "Where Each Style Goes" says menu/dropdown item titles → Callout/Standard and Menu Headings → Headline/Standard, and the doc names the Figma "Pommora - React" library as the source of truth for sizes. The code disagrees on both: src/renderer/src/design-system/components/menu/menu.css.ts:15 composes text.body.standard for the row, and :98 composes text.headline.emphasized for the heading — and menu.css.ts:11-12 carries an explicit macOS-standard-content-size justification for the Body choice.

- Correct the doc: menu rows are Body/Standard, menu headings are Headline/Emphasized. Nothing in the app changes; the doc stops disagreeing with the one row primitive every menu and the sidebar share.
- Correct the code to the doc: drop the row to Callout/Standard and the heading to Headline/Standard. This shrinks every menu row and sidebar row in the app by one ramp step and lightens every menu heading — a visible, app-wide change, and it discards the macOS-content-size rationale currently in the code.
- Re-pull the Figma menu component's text styles first and let that settle it, then fix whichever side is wrong.

#### Q39 — Views

**Question:** The Grouping pane's structural **Order** picker and the cards Sorting pane's **Location Order** picker are documented as two independent controls, but they read and write the same `structural_order_mode` key — with opposite defaults. Should the doc state that they're one stored field (and that the two Orders shadow each other on a cards view that groups structurally), or should the cards Location sort get its own order key so the two stay genuinely independent?

**Conflict:** Views.md describes them separately — "per-kind **Order** pickers (Location: Custom / Location …)" in the Grouping pane bullet, and "whose Order picker is Location / Custom" in the Sorting pane bullet — with no note that they share storage. The code has both writing `structural_order_mode` (GroupingPane.tsx:311-313 reads it defaulting to 'custom'; SortingPane.tsx:262-272 reads it defaulting to 'location'), and the pipeline reads it under two different defaults in one function (resolveView.ts:35 defaults 'location' for the cards sort; resolveView.ts:52 treats absent as 'custom' for band order). On a cards view that groups structurally AND sorts by Location, setting one Order silently retargets the other.

- Document the sharing: state that structural band order and the cards Location sort are one per-view order mode, and that the pairing the doc already prescribes (Sort By: Location with Group By: None) is what keeps them from colliding.
- Give the cards Location sort its own order key so the two controls are independent, and correct the doc to describe two fields.
- Gate the Sorting pane's Location Order row out whenever the view groups structurally, so only one surface can write the key at a time, and say so in the doc.
