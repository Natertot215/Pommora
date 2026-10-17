## Path Links — Implementation Plan

**DATE:** 10-16-2026
**STATUS:** Ratified 10-17-2026
**SOURCE:** *Path Links — Decisions* (ratified 10-16-2026; thirty-nine decisions A-1 to G-1), *BRIEF.md* (the owner's principles, working rules, and planning process), *Path Links — Scout Findings* (rounds 1 to 3 from the decision rounds; rounds 4 and 4B from the two planning windows that scouted the same lanes at HEAD `14da3f152`), the advisor checkpoint on the reconciled approach (10-16-2026), and the owner's rulings during planning: the advisor reads the approach before any fork reaches him; two `opus-xhigh` reviews (simplification, break-it) and the planner's self-review are folded in; the finished plan's last read is one `opus-high` scout for what should change (the owner, 10-16-2026, in place of the `fable-high` neutral read the BRIEF named).

**BASELINE** (filled after ratification; the end logged in the final report)

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `d059eb9d4` | 8059 passed, 2 skipped (535 files) | 10-17-2026 12:18 AM | |

### Context

Connections resolve by title through one title index (`Core/Connections/pageIndex.ts`) that both processes build from the one tree walk (`Core/Nexus/record.ts`). A page's title is its file basename, so two pages in different folders can share one; a bare link to a shared title reads Ambiguous, and while clicking an unaliased one opens the picker on both holders, a pick writes the same bare title back. A wikilink's page half admits `/` and already indexes `[[A/Notes]]` under the key `a/notes`, which nothing holds; a markdown destination holding `/` is refused as an address (`namesPage`, `Core/Connections/links.ts`). `#` is the only heading opener inside a link (the Heading Opener's `§` opener was reverted in `14da3f152`, its standalone fixes kept, and its closing commit `5f2d429d8` moved `INDEX_GENERATION` to 17). The app's searches match three ways (the sidebar, a view, and a Contains field fuzzily on titles; the Trash on a title or a location; the picker on a title prefix), and the picker already reopens over a finished `[[Notes]]` whenever another title starts with it.

Every cascade decides which links name a page by comparing normalized title keys rather than by resolving them. A page rename rewrites by title and skips entirely when another page holds the old title; a page move, a Set move, and a Collection or Set rename rewrite nothing; a heading rename on one of two same-titled pages rewrites links aimed at the other page's heading too. A delete strips other pages' Link values by title and a restore refills them, while a page in the Trash is reached by no cascade, so its own links go stale and its restore drops a returning Link value whose title nothing holds. A move or rename made outside the app reaches Pommora as an unrelated unlink and add, and cascades nothing; only an outside heading rename rides a lane of its own (the index notices it, the settle owes it, and the next settle pays it through `cascadeSeen`). Nathan's own Nexus holds real duplicates of the shape this targets (`Studio/Sapphire/ClaudeMD.md` and `Studio/Pommora/ClaudeMD.md`).

### Overview

Two pages sharing a title stop being a dead end. Pommora writes a link to such a page in Obsidian's path form, the full path from the Nexus root without `.md` or a leading `/`, in both syntaxes, and keeps writing a bare title wherever the title is unique; it reads partial paths as Obsidian does, so a shortened path that still names one page resolves. One naming rule (`writtenName`) serves every writer; one resolver reads every form in every syntax and surface; one resolution-based re-spell keeps every link pointing at its page through a rename, a move, a folder rename or move, a collision, or a restore, made inside or outside the app; every search matches one way; and a click on an unresolved link lands in its title so the picker can resolve it.

The work lands in nine phases in dependency order, each the largest run one agent can carry: the read path (grammar, reader, resolver, draw), the index's link key (generation 18), the writers and the picker, the one search, the click rule, the in-app re-spell, the outside-move lane, the Trash's record and repair, and the reconciliation of the documents. Each phase's approach is relayed in chat before it's written, and the plan ends behind the neutral gate the Connections & Aliases Restructure established.

**The System, Layer by Layer:**

- **Grammar and Reader** (`Core/Connections/connections.ts`, `links.ts`, `linkValue.ts`): `namesPage` keeps only its scheme test, so a destination's `/` names a folder; the reader keeps a link's page half as written in both syntaxes (`.md` included), and the occurrence's `title` span and `PageName.title` stay that whole half.
- **Resolver** (`Core/Connections/pageIndex.ts`): one `pageKey` (fold, drop `.md`) keys titles and written halves alike; `holders` and `resolve` read a key holding `/` as a full path first, else as a tail of the title's holders, several reading Ambiguous; `writtenName(path, like?)` is the one naming rule (the title when it names the page alone, else the full path, at the depth a link was written); `namesOf(path)` is the one keys rule (the tails of a page's path that resolve to it). Nothing is precomputed at build.
- **Index** (`Core/Connections/scan.ts`, `Core/Index/`, `Desktop/Store/`): `relations.target` holds the written key through `pageKey`; a self-link keys `''` and the scanner takes no own title; the two mention queries take key lists through the store's `json_each` idiom; the generation moves to 18.
- **Writers and Picker** (`Core/MarkdownPM/Autocomplete/`, `linkValue.ts`, the Copy Link sites, `LinkCell.tsx`, the embed pick tree): every writer that holds a page spells it through `writtenName`; `resolvedTarget` spells at the written depth, so paste, Paste As, the Link field, and Show Full Link keep a written form (A-7); a title pick keeps a heading the picked page holds (C-5); the picker closes on a title that resolves (B-4).
- **Search** (`Core/Paths/caseFold.ts` and eight sites): one `matchScore(key, q)` over a `matchKey(name, place)` and a `matchQuery(raw)`, the better of a name score and a location score with `/` read as a word break; each surface keeps its own order; highlighting goes first, as its own task (D-6).
- **Click** (`Core/MarkdownPM/Links/linkEdit.ts`, `Gestures/pointerPath.ts`, `Tables/cellStatic.tsx`, `Core/Properties/Pickers/ValueEditor.tsx`): one `seatTitle` arm on the existing link-slot seat channel, reached from the editor's press, a resting cell's hand-off, and a value field's open; Edit Link selects the target in the Link field too (C-4).
- **Re-Spell** (`Core/Connections/rewrite.ts`, `Core/Nexus/cascade.ts`, `mutate.ts`): one per-key decision (`PageIndex.respell`) builds a map from key to spelling (`respellings`) by comparing the indexes before and after over the moved and arriving pages; the map is the query list, the tile gate, and the rewrite in one; every operation that can move, add, sweep, or remove a page runs inside the settle's turn (E-6), and one wrapper in the dispatcher, `addressed`, around those that can move or add, reads the index before and after, diffs the two by id, and hands `relink` what moved and what arrived, returning the warning the renderer already shows (E-5), so no operation carries a cascade line of its own; the heading cascade decides by keys and always sweeps the page's own file (E-7).
- **Outside Lane** (`Core/Index/indexSeed.ts`, `Core/Nexus/fileEvents.ts`, `settle.ts`): the index reports the pages whose rows it removes and the pages it indexes for the first time, and the seed reports what it pruned and found; the settle pairs a vanished ID with its live path across any number of batches, reads every other landed id the tree holds as an arrival (a paired move's late row excepted), builds the before-world with each paired page back at its old path and each arrival absent, and pays one re-spell for them all, logging what it couldn't write (E-3, E-4, E-5).
- **Trash** (`Core/Trash/`): the delete records what each outbound link named (`targets`) and keeps each page's delete-time path in the bundle chain it already has; one Trash index resolves parked values; the restore relocates, repairs the returning page's own links (F-5), re-spells links that named its old path and the collisions its landing causes (F-2, E-3), and refills by identity (F-6), all through the one rule.

**The Number:** counted from this plan's AFTER blocks (code lines, comments excluded), the work adds about 770 lines and removes about 380, roughly +390 net, against the BRIEF's +80 to +140 and the scouts' +120 to +150; the blocks elide unchanged code, so the landed count may run higher. Per phase: 1 (+62/−31), 2 (+50/−69), 3 (+79/−32), 4 (+71/−77), 5 (+44/−15), 6 (+181/−78), 7 (+140/−46), 8 (+142/−37). The scouts costed the read path, the index key, and the search fold; they didn't cost the three phases that carry most of the additions, each a mandate the BRIEF names: the re-spell over moves, folder renames, and collisions (E-1 to E-3, E-6), the outside lane paired across batches and at the open-time seed (E-4), and a restored page's own links repaired by identity (F-5, F-6). Every addition is listed with what it buys in its task, the removals it earns stand beside it, and no phase is padded; the planner's call (10-16-2026) is that the design is already at its minimal form for the mandate and that deferring Phase 7 or 8 would leave E-4 or F-5 half-done, which the BRIEF forbids. The owner weighs the number at ratification.

**Net Ledger** (the Actionable column of `view-delta`, per phase, cumulative from the BASELINE head):

| Phase | Estimate | Measured | Cumulative |
| ----- | -------- | -------- | ---------- |
| 1 | +62 / −31 | +79 / −40 (+39) | +39 at `7c66acda5` |
| 2 | +50 / −69 | +116 / −131 (−15) | +24 at `f87be5c14` |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `pageKey` • function | The one key for a title or a written name: folded, with a trailing `.md` dropped. | `Core/Connections/pageIndex.ts` |
| `pathKeys` • function | Every tail of a page's path, shortest first; the keys that can name it. | `Core/Connections/pageIndex.ts` |
| `carriesTitleAlias` • function | The one statement of the path alias: a path with no heading and no shown text carries its title. | `Core/Connections/connections.ts` |
| `PageIndex.writtenName` • method | The one naming rule: the title where it names the page alone, else the full path, or the depth a link was written at. | `Core/Connections/pageIndex.ts` |
| `PageIndex.namesOf` • method | The one keys rule: the tails of a page's path that resolve to it. | `Core/Connections/pageIndex.ts` |
| `PageIndex.respell` • method | The one per-key decision: leave a link as written, or spell the page's written name at the key's depth. | `Core/Connections/pageIndex.ts` |
| `PageIndex.byId` • getter | The page each id names, first listed where two files claim one, built on first use; the tree's one by-id rule. | `Core/Connections/pageIndex.ts` |
| `pageMoves` • function | Two by-id maps compared: the ids whose path changed and the ids new to the second. | `Core/Nexus/record.ts` |
| `respellings` • function | The map from key to new spelling, by comparing two indexes over the moved and arriving pages. | `Core/Connections/rewrite.ts` |
| `CascadeChange` • type | What a cascade rewrites: a names map under a label, or a heading on the page at a path. | `Core/Connections/rewrite.ts` |
| `HeadingRenameSeen.path` • field | The page a seen heading rename belongs to, in place of its title. | `Core/Index/indexSeed.ts` |
| `MatchKey` • type · `matchKey` · `matchQuery` • functions | What a searched row offers (name and place) and how a query is folded for it. | `Core/Paths/caseFold.ts` |
| `SlotAction` • type · `'seatTitle'` • arm | The link-slot seat channel's arm that selects an unresolved link's name. | `Core/MarkdownPM/Links/linkEdit.ts` |
| `PointerSpec.seat` • field | The editor press's seat for a link the resolver muted. | `Core/MarkdownPM/Gestures/pointerPath.ts` |
| `ValueIntent.seat` • field | The seat a resting cell or value field hands its editor. | `Core/Properties/` |
| `EditorHost.page` • method | The page an editor edits, in place of its title. | `Core/MarkdownPM/` |
| `AutocompleteQuery.heading` • field | The heading a title pick keeps when the picked page holds it. | `Core/MarkdownPM/Autocomplete/autocomplete.ts` |
| `embedPickTree(name)` • parameter | The embed pick tree's writer, so a pick spells through `writtenName`. | `Core/MarkdownPM/` |
| `tilesLink` · `readTileLinks` · `dropTileLinks` • functions | The tile gate over every key a markdown tile links, with its headings. | `Core/Tiles/tilesFile.ts` |
| `inSettleTurn` · `settledIndex` · `relink` • functions | The address turn, the index once the owed walk is paid, and the one re-spell against it. | `Core/Nexus/settle.ts` |
| `addressed` • local | The dispatcher's wrapper: before, operation, after, `pageMoves`, `relink`, the reply's cascade joined. | `Core/Nexus/mutate.ts` |
| `payOutsideMoves` • function | The settle's pairing of vanished IDs with live paths and its one re-spell for them. | `Core/Nexus/settle.ts` |
| `IndexSeen` • type · `oweSeen` • function | What one index step saw (renames, vanished pages, landed ids) and how the record owes it. | `Core/Index/indexSeed.ts` · `Core/Nexus/fileEvents.ts` |
| `Owed.vanished` · `Owed.landed` · `Owed.paired` • fields | The pages whose rows left, the ids indexed or stamped for the first time, and the paired ids whose own row is yet to land, since the last settle. | `Core/Nexus/fileEvents.ts` |
| `NOTHING_SEEN` • const · `paid` • function | The empty `IndexSeen`; the one tail of an outside payment (log the warning, owe the writes). | `Core/Index/indexSeed.ts` · `Core/Nexus/settle.ts` |
| `IndexedStat.id` • field · `readIndexedStats(under)` • parameter | The ID an indexed page carries, and a prefix-narrowed read. | `Core/Platform/stores.ts` |
| `deletedPathOf` • function | A bundled file's path before its delete, from the bundle chain. | `Core/Trash/bundle.ts` |
| `targets` • record field · `gatherLinkTargets` • function | What each outbound link under a deleted artifact named, by key, from the index's rows. | `Core/Trash/record.ts` · `Core/Trash/gather.ts` |
| `trashedPages` · `trashedPagesOf` • functions | Every trashed page at its delete-time path keyed to its bundle, for parking without a read; one bundle's pages with their written ids, for the restore. | `Core/Trash/holdings.ts` |
| `fileRewrites` • function | The cascade's per-file arm, hoisted for the restore's repair. | `Core/Nexus/cascade.ts` |
| `artifactFiles` · `repairLanded` • functions | An artifact's pages and sidecars listed once for the scrub and the repair; a returning artifact's own links repaired by identity where it landed. | `Core/Trash/restoreScrub.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `titleKey` • function | Keyed a bare `[[#H]]` to its page's title; a self-link keys `''` now. | `Core/Connections/scan.ts` |
| `RenameChange` • type | The title-equality change; `CascadeChange` takes a names map. | `Core/Connections/rewrite.ts` |
| `spacesLinkHeading` • function | Read every Space sidecar to gate a heading cascade; the cascade's index query covers it. | `Core/Nexus/cascade.ts` |
| `titleHeldOutside` • function | The title-equality test behind the rename skip and the delete strip. | `Core/Nexus/heldPages.ts` |
| `tilesLinkHeading` · `readTileHeadingLinks` · `dropTileHeadingLinks` • functions | The heading-only tile gate. | `Core/Tiles/tilesFile.ts` |
| `oweRenames` • function | Owed heading renames alone; `oweSeen` owes the whole `IndexSeen`. | `Core/Nexus/fileEvents.ts` |
| `emphasizeMatch` · `matchText` • function · style | The typed-match emphasis in searched rows (D-6). | `UIX/Menus/` |
| `BlockMenuRow` • type · `matchLen` · `matchAt` • members | The block menu's match offsets and its own matcher. | `Core/Actions/blockMenu.ts` · `Core/MarkdownPM/Menus/` |
| `EditorHost.pageTitle` • method | The editor's title read; `page()` hands the page. | `Core/MarkdownPM/` |
| `trashedTitles` • function | The newest-bundle-by-title walk; parking resolves by delete-time path. | `Core/Trash/holdings.ts` |
| `ValueEditor.alias` · `PropertyValueInput.alias` • props | The alias-seat flag; `seat` carries the action. | `Core/Properties/Pickers/` |

#### Constraints

- **Mandate (the owner's six principles, verbatim from *BRIEF.md*):**
  - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
  - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
  - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
  - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains.
  - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
  - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
- **Principles:** the owner's standing principles and this work's own words, verbatim in *BRIEF.md* §Standing Principles and §In His Words, decide every judgment the plan makes and every call its execution meets; chief among them: "One rule is the core discipline we've instilled." "Less machinery for stuff that we shouldn't include is a valuable perspective here." "Name everything you think you need to add or include and look for what already exists first." "Treat this with the goal of making the outcome read as the architecture surrounding it always intended it, even if it means changing root-level things."
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint`, from the repo root; each prints its own failures, and lint runs clean. Biome formats every TS write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means these three.
- **Frozen:** `wikiTitle` and every File value, banner, cover, and asset reference it reads (A-8); `Core/Connections/aliasMemory.ts` and the metadata shard; `Core/Contract/bridge.ts` (no channel changes; `MutateOutcome.cascade` already exists and the store contract widens through `Core/Platform/stores.ts`); the `relations` table's columns (no schema change); `Core/MarkdownPM/Engine/detect.ts`'s `loneEmbedTitle`; `UIX/Symbols/allSymbols.ts`'s `searchIcons` (D-3); a view's filter operators (D-5); **Display Unresolved Links As Plain Syntax**; a trashed page's body while it sits in the Trash (F-3); `Core/Sync/`; every behavior of a resolved link's click (C-2).
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD` and records the **Actionable** column (code minus comments; tests and docs excluded) in the Net Ledger beside the phase's estimate, with removals and additions apart. A phase that lands above its band is reported in chat before the next phase opens, with what the increase buys. There is no floor (the owner's bar: every addition earns its place and the outcome reads as intended, with the merges counting toward a codebase left with less); the final report states the measured total against the count under *§Overview · The Number*.
- **Shape:** a feature with a refactor, removals, and fixes inside it. The behavioral baseline is today's behavior as the Decisions' *§Context* states it, kept except where a decision names a change and proven by the tests each task rewrites or adds. Every removal task lists its consumers (the sibling sweep), and the Frozen list holds throughout. Every fix task names what else consumed the old behavior. The index generation bump is the one migration: it drops and reseeds the content index on the first open, which is how the rows re-key.
- **Conventions:** finite states are unions plus exhaustive switches; no O(N), allocating, or layout-reading work lands on a keystroke, a caret move, a decoration build, or a settle that nothing owes, and every task that touches one of those paths states its cost; the index resolves nothing eagerly at build (both processes rebuild it on every tree change, and the host never opens a picker); nothing in SQL rewrites `relations.target` (it mirrors the file's bytes; the sweep rewrites files and re-indexing re-keys them); host-run code imports no React or UIX, and `Desktop/hostGraph.test.ts` and `Core/Contract/engineGraph.test.ts` stay green; nothing inside an address operation awaits `inTurn` (`payOwedWalk`, `settleNow`), since `inTurns` has no re-entry detection and would hang silently (Task 6-3's audit lists every transitive caller); a comment is written only where the code would be genuinely ambiguous or misread without it (the owner, 10-17-2026): the comment lines in an AFTER block state intent for the executor and are not written unless they meet that bar, a comment that restates its code or claims a cost is dropped, and the comments the scouts list as false are rewritten or removed by the task that falsifies them; commit messages are past tense and one to four sentences; nothing temporary, transitional, or compatibility-kept remains at a phase's end.
- **Execution:** the plan runs end to end autonomously, the owner reachable only at check-ins. Every review checkpoint dispatches two agents to the `closeout-review` skill's standards (correctness, simplification, cohesiveness, and consequences; its closing procedures, write-guards, and output format don't apply), reading outward (whether the phase reads correct from the rest of the codebase's point of view) rather than in isolation, and the orchestrator's own post-phase look weighs the landed work against the **Mandate** above before the next phase opens. An in-flight call is weighed against those and the plan's objectives, disclosed in chat, and recorded under *§Deviations* only where it changes an outcome. The two compaction checkpoints in *§Process Overview* sit before Phases 4 and 7 (placed by the planner; the owner adjusts them at ratification); each runs `c/pre-compaction`, re-instills the Mandate in the handoff exactly as the owner gave it, and stops until the owner re-prompts.
- **Rulings (Not Re-Raised):** every decision in *Path Links — Decisions* and its *§Rejected* list: titles are never forced unique; a shared title writes the full path, never a shortest unique tail; nothing shortens a link for its own sake, and a path link never shortens back when a collision goes away; Ambiguous stays its own state; ambiguity is resolved through the picker alone; a path link draws its title only; `#` is the only heading opener inside a link and a `§` there is ordinary text (A-9); no new search box, no per-letter highlighting, no ambiguous-link menu, no reserved extension list, no whole-target file reading; the one click rule's exception is a caret already inside the unresolved link being edited; Text values keep their two-click path where prose surrounds the link; outside and closed-app moves repair through the heading-rename lane; a trashed page's body is never touched in the Trash; File and asset references aren't connections. The owner's rulings during planning are recorded as they land (*§Deviations* records any that change an outcome).
- **Neutral Gate:** the work ends with a `fable-high` neutral reviewer given only the BASELINE head, HEAD, and this intention, with no plan, log, or document: *"Pommora's page links named pages by title alone, so two pages sharing a title couldn't be told apart, and its link cascades, searches, and clicks on unresolved links each worked their own way. This work lets a link name a page by its path from the Nexus root, written and read as Obsidian does, keeps every link pointing at its page through renames, moves, folder changes, collisions, and restores made inside or outside the app, makes every search match one way, and seats a click on an unresolved link in its title, with each rule stated once, built from what the architecture already had, and nothing left over."* Every phase is written so that review passes.
- **Other Workstreams:** the Heading Opener plan closed at `c65469e3d`, and HEAD at this plan's writing is `d059eb9d4` (a docs-only issues renumbering): `#` is the only opener again; `UNSPELLABLE` is shared by adoption and the asset writer (refusing as an invalid name, `§` allowed in file names), `literalOrBracketAt` is shared by the `§` transforms and the prose picker arm, `inUrlRun` lives in `markdownCode.ts`, the link settle drops an emptied heading's `#`, and `INDEX_GENERATION` is 17, so this plan's bump is 18. The Desktop window's parallel planning (Scout Findings round 4) stopped at the owner's ruling; its approach and advisor list are folded here, and nothing of its is committed. Sync's `landRename` performs a bare `machine().rename` with no echo, so a receiving device reads a synced rename as an outside move once pairing lands and re-spells its linkers to the bytes the sender wrote; where the sender's own rewrite of a linker lands after that, what Sync's conflict capture does is unverified (*§Open Items*), and a Sync-side echo is a prospect, not this plan's work.
- **Out of Scope Everywhere:** File values and asset references; the Matrix's drawing; Project Sapphire; `Core/Sync/`; any new setting; an Obsidian-side change.

#### Process Overview

- [x] **Phase 1** — The Read Path
  - [x] Task 1-1 · The grammar admits a path, and the reader keeps `.md`
  - [x] Task 1-2 · The resolver reads paths, and the index names pages
  - [x] Task 1-3 · The compare sites read the title, and a path link carries its alias
  - [x] Task 1-4 · A path link draws its title only (the live check is the owner's, pending)
  - [x] Review Checkpoint
- [x] **Phase 2** — The Index Key
  - [x] Task 2-1 · The scanner keys by `pageKey`, and a self-link keys `''`
  - [x] Task 2-2 · The mention queries take key lists
  - [x] Task 2-3 · The Matrix dedupes by page, and the generation moves to 18
  - [x] Review Checkpoint
- [x] **Phase 3** — The Writers and the Picker
  - [x] Task 3-1 · One written name at every writer, and `EditorHost.page()`
  - [x] Task 3-2 · The picker writes the written name, keeps a held heading, and closes on resolution
  - [x] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction]`
- [ ] **Phase 4** — One Search
  - [ ] Task 4-1 · Highlighting goes
  - [ ] Task 4-2 · The one matcher, and every search on it
  - [ ] Review Checkpoint
- [ ] **Phase 5** — The Click Rule
  - [ ] Task 5-1 · The `seatTitle` arm and the editor's press
  - [ ] Task 5-2 · Resting cells and the value field
  - [ ] Review Checkpoint
- [ ] **Phase 6** — The In-App Re-Spell
  - [ ] Task 6-1 · The one re-spell rule
  - [ ] Task 6-2 · The heading cascade decides by keys, and the dead gates go
  - [ ] Task 6-3 · `addressed`: every address operation re-spells by its before-and-after diff, inside the settle's turn
  - [ ] Task 6-4 · The delete strips by worlds, and `titleHeldOutside` goes
  - [ ] Review Checkpoint
- [ ] `[Compaction checkpoint: c/pre-compaction]`
- [ ] **Phase 7** — The Outside-Move Lane
  - [ ] Task 7-1 · The index names what vanished and what landed
  - [ ] Task 7-2 · The settle pairs and pays
  - [ ] Review Checkpoint
- [ ] **Phase 8** — The Trash
  - [ ] Task 8-1 · The delete records what each link named, and one Trash index resolves by delete-time path
  - [ ] Task 8-2 · The restore repairs, re-spells, and refills by the one rule
  - [ ] Review Checkpoint
- [ ] **Phase 9** — Reconciliation
  - [ ] Task 9-1 · The feature documents, the project overview, the issues index, and the comments
- [ ] `[Stop: the final verification's report, per §Final Verification]`

---

### Phase 1 — The Read Path

**GOAL:** A link names a page by its title or by any tail of its path, in both syntaxes, with `.md` read on the page half and never written; the resolver answers a full path first and a unique tail second; the index offers the one naming rule and the one keys rule every later phase leans on; and a path link draws its title alone. Pure functions over the existing grammar, resolver, and token shapes, with nothing written, indexed, or re-spelled yet, so the rest of the plan builds on a read path that is already proven.

#### Task 1-1

**TASK:** Let a markdown destination's page half hold `/`, and stop the markdown reader from stripping `.md`, so both syntaxes hand the resolver the page half as written.

**NOW:** `namesPage` (`Core/Connections/links.ts:38-39`) refuses a page half holding `/` or a scheme, so `[Label](A/Notes)` is read as neither a page nor an address (`readOccurrence` returns null) and `headingHash` won't turn a typed `§` into `#` there (`Core/MarkdownPM/Input/edits.ts:470`). `targetTitle` (`links.ts:64-69`) strips `.md` from a markdown page half, while the wiki reader keeps it (`linkValue.ts:71`), so the two syntaxes read `Notes.md` differently and a File value `[[Report.md]]` depends on the wiki side not stripping.

**CHANGE**

- [ ] In `links.test.ts`, rewrite `:85` and `:92` so `targetTitle('Notes.md', false)` is `'Notes.md'`, and `:97` so `targetTitle('example.com/Notes', false)` is `'example.com/Notes'` (`:96`'s scheme case stays null); add `targetTitle('A/Notes', false)` → `'A/Notes'`. Watch them fail.
- [ ] In `edits.test.ts:813`, invert the `[a](dir/Page)` case: a typed `§` in that destination becomes `#`.
- [ ] `namesPage` keeps only the scheme test; its comment says why a `/` now names a folder. `targetTitle` returns `decoded`; its comment loses the strip. Drop the unused `stripMarkdownExt` import.
- [ ] `connections.ts:88`'s comment ("an address keeps one undivided title") and `:128`'s `PageName` doc ("A page named by title") are rewritten: a page is named by its written page half, a title or a path ending in one.

**AFTER**

```Core/Connections/links.ts diff
@@ namesPage @@
-// Only the half before the first `#` decides: a scheme or a path separator there addresses something outside the Nexus, while a fragment is a heading's own text.
-export const namesPage = (pageHalf: string): boolean =>
-  !pageHalf.includes('/') && !HAS_SCHEME.test(pageHalf.trim())
+// Only the half before the first `#` decides: a scheme there addresses something outside the Nexus, a `/` names a folder on the way to a page, and a fragment is a heading's own text.
+export const namesPage = (pageHalf: string): boolean => !HAS_SCHEME.test(pageHalf.trim())
@@ targetTitle @@
-// The halves arrive already split by the occurrence, so an encoded `%23` decodes inside the title. An address names no page; a title that decodes to nothing is the page itself when a heading follows, and no page at all otherwise.
+// The halves arrive already split by the occurrence, so an encoded `%23` decodes inside the title. An address names no page; a title that decodes to nothing is the page itself when a heading follows, and no page at all otherwise. A written `.md` stays: the resolver's key drops it (`pageKey`), so a File value keeps its name.
 export const targetTitle = (titleHalf: string, hasHeading: boolean): string | null => {
   if (!namesPage(titleHalf)) return null
   const decoded = decodeLinkTarget(titleHalf).trim()
   if (!decoded) return hasHeading ? '' : null
-  return stripMarkdownExt(decoded)
+  return decoded
 }
@@ imports @@
-import { isMarkdownFile, stripMarkdownExt } from '../Paths/posix'
+import { isMarkdownFile } from '../Paths/posix'
```

```Core/Connections/connections.ts diff
@@ markdownSpans @@
-// The destination splits at its first raw `#` only when the half before names a page, so an address keeps one undivided title; it splits before decoding, so `%23` stays inside the title.
+// The destination splits at its first raw `#` only when the half before names a page, so an address keeps one undivided destination; it splits before decoding, so `%23` stays inside the title.
@@ PageName @@
-/** A page named by title, and by heading where the link names one: the shape every rule and writer below takes. */
+/** A page named by its written page half (a title, or a path from the Nexus root or any tail of one ending in the title), and by heading where the link names one: the shape every rule and writer below takes. */
 export type PageName = { title: string; heading?: string }
```

**VERIFY**

- [ ] `links.test.ts` and `edits.test.ts:813` pass; `linkValue.test.ts:41-50` ("reads a destination written as a markdown file") still reads `[x](Notes.md)` as a page once Task 1-2 lands (its `title` assertion becomes `'Notes.md'` there).
- [ ] `readOccurrence` on `[x](example.com/page#sec)` still yields the url arm with the whole destination (the url is `slice(targetSpan(o))`), and on `[x](docs/file.pdf)` yields a page-kind phantom where it yielded null; both draw as today.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Give the index one key (`pageKey`), let `holders` and `resolve` read a key holding `/` as a full path first and a unique tail second, Ambiguous staying its own state (A-4, B-2), and add the one naming rule (`writtenName`) and the one keys rule (`namesOf`) beside them.

**NOW:** `buildPageIndex` (`pageIndex.ts:32-69`) keys `byTitle` by `normalizeTitle(p.title)` and `holdersOf` looks a raw title up by the same fold, so `[[A/Notes]]` resolves as the title `A/Notes`, which nothing holds, and `[[Notes.md]]` as `notes.md`. Nothing names a page: every writer collapses a `ConnPage` to `.title`. No code computes a path's tails; `posix.ts` has `stripMarkdownExt`, `relDirname`, and `titleFromPath` only.

**CHANGE**

- [ ] Write the `pageIndex.test.ts` cases and watch them fail: `resolve('A/Notes')` names the page at `A/Notes.md`; `resolve('Notes')` with holders at `A/Notes.md` and `B/Notes.md` is ambiguous while `resolve('B/Notes')` names B's; `resolve('X/Notes')` for a page at `Q/X/Notes.md` names it by its tail, and is ambiguous when `R/X/Notes.md` also exists; a full path wins over a tail (`resolve('B/Notes')` names `B/Notes.md` when `A/B/Notes.md` also exists); `A/Notes.md` beside `A/notes.md` is ambiguous at `A/Notes` (B-3); `resolve('Notes.md')` and `resolve('A/Notes.md')` read the extension on the page half (A-5); `./x`, `../x`, `/A/Notes`, and `A/` are phantom; `writtenName` returns the title for a sole holder, the full path for a shared title, the written tail at depth two where it names the page alone (`'B/Notes'` for `like: 'x/notes'`), the full path where that tail is shared, and the full path for a case-variant twin; `namesOf('Q/X/Notes.md')` is `['notes', 'x/notes', 'q/x/notes']` while `notes` is unique and drops `notes` once `B/Notes.md` exists; `A/X.md.md` resolves at `X`, `X.md`, `X.md.md`, `A/X`, and `A/X.md`, its `namesOf` is `['x', 'a/x']`, and beside `A/X.md` both read ambiguous at `A/X`.
- [ ] In `pageIndex.ts`, add `pageKey` (every trailing `.md` dropped, so an outside-made `A/X.md.md`, titled `X.md`, keys `x` by title and by path alike and resolves at `X`, `X.md`, `X.md.md`, `A/X`, and `A/X.md`), a private `tailOf`, and `pathKeys`; key `entries` by `pageKey(p.title)`; rewrite `holdersOf` with the tail branch; add `writtenName` and `namesOf` to `PageIndex` and the built object; rename the `rawTitle` parameters `raw`. `candidates` is untouched here (Phase 4 folds it).
- [ ] `scan.ts:24`'s `titleKey`, `rewriteConnections`' `oldKey`, and `rewriteHeadingConnections`' `titleKey` (`rewrite.ts:22,87`) key through `pageKey`, so a `.md` link still indexes and renames as `notes`; Phase 2 removes `titleKey`.

**AFTER**

```Core/Connections/scan.ts diff
@@ titleKey @@
-const titleKey = (raw: string, own: string): string => (raw === '' ? own : normalizeTitle(raw))
+const titleKey = (raw: string, own: string): string => (raw === '' ? own : pageKey(raw))
```

```Core/Connections/rewrite.ts diff
@@ rewriteConnections @@
-  const oldKey = normalizeTitle(oldTitle)
+  const oldKey = pageKey(oldTitle)
@@ rewriteHeadingConnections @@
-  const titleKey = normalizeTitle(title)
+  const titleKey = pageKey(title)
```

```Core/Connections/pageIndex.ts diff
@@ imports @@
 import { compareTitles, normalizeTitle } from '../Paths/caseFold'
+import { isMarkdownFile, stripMarkdownExt } from '../Paths/posix'
@@ after headingKeys @@
+/** A written page half, or a page's path, as the one key both compare by: folded, every trailing `.md` dropped. A heading never passes through it. */
+export const pageKey = (raw: string): string => {
+  const key = normalizeTitle(raw)
+  return isMarkdownFile(key) ? pageKey(stripMarkdownExt(key)) : key
+}
+
+/** The last `depth` segments of a page's path, `.md` dropped: what a link written at that depth spells. */
+const tailOf = (path: string, depth: number): string =>
+  stripMarkdownExt(path).split('/').slice(-depth).join('/')
+
+/** Every tail of a page's path as a key, shortest first: the keys a link may name the page by. */
+export const pathKeys = (path: string): string[] =>
+  path.split('/').map((_, i) => pageKey(tailOf(path, i + 1)))
+
 export interface PageIndex {
-  holders: (rawTitle: string) => readonly ConnPage[]
-  resolve: (rawTitle: string) => ConnResolution
+  holders: (raw: string) => readonly ConnPage[]
+  resolve: (raw: string) => ConnResolution
+  /** How a new link spells the page at `path`: at the depth `like` was written (one when none), the tail of its path where that names the page alone, else its full path from the Nexus root. */
+  writtenName: (path: string, like?: string) => string
+  /** The keys that name the page at `path` and resolve to it: the tails of its path, shortest first. */
+  namesOf: (path: string) => string[]
   candidates: (query: string, limit?: number) => ConnPage[]
 }
@@ buildPageIndex @@
-  // Titles normalize ONCE at build — candidates() runs per autocomplete keystroke.
-  const entries = pages.map((p) => ({ p, norm: normalizeTitle(p.title) }))
+  // Titles key ONCE at build — candidates() runs per autocomplete keystroke.
+  const entries = pages.map((p) => ({ p, norm: pageKey(p.title) }))
   …
-  const holdersOf = (rawTitle: string): readonly ConnPage[] =>
-    byTitle.get(normalizeTitle(rawTitle)) ?? []
+  // A key holding `/` names a page by a tail of its path: the full path first, otherwise the title's holders whose path ends with it; several, or two paths folding to one, read Ambiguous.
+  const holdersOf = (raw: string): readonly ConnPage[] => {
+    const key = pageKey(raw)
+    const cut = key.lastIndexOf('/')
+    const titled = byTitle.get(key.slice(cut + 1)) ?? []
+    if (cut < 0) return titled
+    const exact = titled.filter((p) => pageKey(p.path) === key)
+    return exact.length ? exact : titled.filter((p) => pageKey(p.path).endsWith(`/${key}`))
+  }
+  const resolve = (raw: string): ConnResolution => {
+    const holders = holdersOf(raw)
+    if (holders.length === 0) return { status: 'phantom' }
+    if (holders.length > 1) return { status: 'ambiguous' }
+    return { status: 'resolved', page: holders[0] }
+  }
   return {
     holders: holdersOf,
-    resolve(rawTitle) {
-      const holders = holdersOf(rawTitle)
-      if (holders.length === 0) return { status: 'phantom' }
-      if (holders.length > 1) return { status: 'ambiguous' }
-      return { status: 'resolved', page: holders[0] }
-    },
+    resolve,
+    writtenName(path, like = '') {
+      const tail = tailOf(path, like.split('/').length)
+      return resolve(tail).page?.path === path ? tail : stripMarkdownExt(path)
+    },
+    namesOf: (path) => pathKeys(path).filter((k) => resolve(k).page?.path === path),
     candidates(query, limit = 20) {
```

**VERIFY**

- [ ] `pageIndex.test.ts` passes, the existing `resolve` and `holders` cases included (`:11-42`).
- [ ] `rewrite.test.ts:136`, `:257`, and `scan.test.ts:243` (`.md` links keyed and renamed) are green again.
- [ ] `linkValue.test.ts:125-127` (ambiguous `Dup`) still holds and gains `[[A/Dup]]` resolving; `:155` (a dotted title in a markdown link) still holds.
- [ ] Both processes build the index exactly as before: no new work in `buildPageIndex`'s loop (read the diff).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-3

**TASK:** Make every place that compares shown text to a link's title, or draws a title from a `PageName`, read the basename through `titleFromPath`; let the one writer give a path link the alias Obsidian's writer gives it; compare a heading directly in `namesTarget`; and let `resolvedTarget` spell at the written depth, since a path that resolves would otherwise collapse to its bare title.

**NOW:** `defaultLabel` (`links.ts:35`) returns the whole title, so `[](A/Notes)` would label itself `A/Notes` and the settle's label fill (`linkSettle.ts:118-122` via `pageLabel`) would write `A/Notes` into a file. `repeatsTarget` (`connections.ts:145-146`) compares the whole target, `namesTarget` (`:153-158`) passes a heading through its title parameter, and `carry` (`rewrite.ts:31-42`) writes `to.title` whole, so `[[A/Notes|Notes]]` renamed would keep a stale alias and a markdown label would become `A/Plan`. `linkDisplayText`'s wiki arm (`linkValue.ts:201-202`) returns the raw half to sort, filter, and Remove Link. `pageLinkText` (`connections.ts:161-175`) writes no alias unless given one.

**The alias ruling (the planner's, open to the owner; *§Open Items*).** Obsidian's writer has produced `[[Folder/Note|Note]]` for a non-unique name since 1.3, because an unaliased path link displays its whole path in Obsidian; Pommora draws the title either way (B-1). With the default, `carriesTitleAlias` names the case (a path, no heading, no shown text) once for the writer and the rename follower, `pageLinkText` gives such a link its basename as alias, `repeatsTarget` keeps comparing the whole target (so that alias is never dropped), and `namesTarget`'s title arm compares the basename (so a rename carries it). **If the owner rules no:** `carriesTitleAlias` returns false, and `repeatsTarget` compares `titleFromPath(title)` instead, which `namesTarget` then inherits; nothing else in this task changes.

**CHANGE**

- [ ] Write and watch fail: `connections.test.ts`: `defaultLabel('A/Notes')` → `'Notes'`, `defaultLabel('Notes.md')` → `'Notes'`; `pageLinkText({ title: 'A/Notes' }, 'wiki')` → `[[A/Notes|Notes]]`, `pageLinkText({ title: 'Ideas#1/Notes' }, 'wiki')` falls to the markdown form (A-6: a folder named with `#` can't be spelled in a wikilink), `carriesTitleAlias` is true for a bare path and false for one with a heading or shown text, `pageLinkText({ title: 'A/Notes', heading: 'H' }, 'wiki')` → `[[A/Notes#H]]`, `pageLinkText({ title: 'A/Notes', shown: 'x' }, 'wiki')` → `[[A/Notes|x]]`, `pageLinkText({ title: 'A/Notes', shown: 'A/Notes' }, 'wiki')` → `[[A/Notes|Notes]]` (a shown text that repeats the target drops before the alias is decided), `pageLinkText({ title: 'A/Notes', embed: true }, 'wiki')` → `[[A/Notes]]`, `pageLinkText({ title: 'A/Notes' }, 'markdown')` → `[Notes](A/Notes)`; `namesTarget('Notes', { title: 'A/Notes' })` and `namesTarget('A/Notes', { title: 'A/Notes' })` → `'title'`, `namesTarget('A/Notes#H', { title: 'A/Notes', heading: 'H' })` → `'both'` (shown text naming the title or the whole written half follows a rename), `namesTarget('A/B', { title: 'P', heading: 'A/B' })` → `'heading'` and `namesTarget('B', …)` → `null` (the heading compared directly). `rewrite.test.ts`: renaming the page behind `[[A/Notes|Notes]]` to `Plan` (through the existing title arm until Phase 6 replaces it) writes `[[A/Plan|Plan]]`, and `[Notes](A/Notes)` writes `[Plan](A/Plan)`. `linkValue.test.ts`: `linkDisplayText('[[A/Notes]]')` → `'Notes'`, `linkDisplayText('[[A/Notes#H]]')` → `'Notes § H'`; `resolvedTarget` on `[[a/dup]]` with twins `A/Dup.md` and `B/Dup.md` writes `A/Dup`, on `[[notes]]` with one holder `Notes`, on `[[x/notes]]` for `Q/X/Notes.md` the tail `X/Notes`; `linkValueFromEdit('[[A/Dup]]', twins)` is `[[A/Dup|Dup]]` where `[[Dup]]` stays refused; `shownAlias` records nothing for `[[A/Notes|Notes]]` or `[[A/Notes|A/Notes]]` and `x` for `[[A/Notes|x]]`.
- [ ] `defaultLabel` → `heading || titleFromPath(title)`. `linkDisplayText`'s wiki arm reads `titleFromPath(target.title)`. `carry`'s `'title'` and `'both'` arms write `titleFromPath(to.title)`.
- [ ] `namesTarget`: the title and both arms ask whether shown text repeats the title's basename or the whole written half (`names(heading?)`), so `[[A/Notes|A/Notes]]` follows a rename rather than keeping a stale alias; the heading arm asks `normalizeTitle(shown) === normalizeTitle(t.heading)`.
- [ ] `pageLinkText`: the wiki branch drops a shown text that repeats the target, then asks `carriesTitleAlias` and gives such a link `titleFromPath(title)` as its alias (the default ruling); the predicate takes `embed` and is exported beside it.
- [ ] `connections.ts:144`'s `repeatsTarget` doc gains the reason the whole target is compared: a path link's title alias isn't redundant, since another reader shows the path.
- [ ] `resolvedTarget`: return `written` when there's no index; otherwise `title: named.title === '' ? '' : index.writtenName(target.page.path, named.title)`; its doc and `linkValueFromEdit`'s say "at the depth it was written". `shownAlias` refuses an alias `namesTarget` says names the target, so memory never keeps `[[A/Notes|A/Notes]]`.

**AFTER**

```Core/Connections/links.ts diff
@@ imports @@
-import { isMarkdownFile } from '../Paths/posix'
+import { isMarkdownFile, titleFromPath } from '../Paths/posix'
@@ defaultLabel @@
-/** What a markdown link shows when its label is empty, and what a picked link's label defaults to. */
-export const defaultLabel = (title: string, heading?: string): string => heading || title
+/** What a markdown link shows when its label is empty, and what a picked link's label defaults to: the heading, else the page's title alone, whatever path the link spells it by. */
+export const defaultLabel = (title: string, heading?: string): string =>
+  heading || titleFromPath(title)
```

```Core/Connections/connections.ts diff
@@ imports @@
+import { titleFromPath } from '../Paths/posix'
@@ repeatsTarget @@
-/** Whether shown text only repeats a target, `title` or `title#heading`, so the link draws the same without it: the one drop rule. */
+/** Whether shown text only repeats a target, `title` or `title#heading`, so the link draws the same without it: the one drop rule. The whole written half is compared, so a path link's title alias (`[[A/Notes|Notes]]`, which Obsidian writes, since it shows the path otherwise) is kept rather than dropped. */
 export const repeatsTarget = (shown: string, title: string, heading?: string): boolean =>
@@ namesTarget @@
-/** Which part of its target shown text names, the title, the heading, or both, rather than giving it a name: what a rename carries along and what memory never keeps. `H` names the heading of `A#H` without repeating `A#H`, which is `repeatsTarget`'s question. */
+/** Which part of its target shown text names, the title (its basename, whatever path spells it), the heading, or both, rather than giving it a name: what a rename carries along and what memory never keeps. `H` names the heading of `A#H` without repeating `A#H`, which is `repeatsTarget`'s question. */
 export function namesTarget(shown: string, t: PageName): 'title' | 'heading' | 'both' | null {
-  if (repeatsTarget(shown, t.title)) return 'title'
+  const names = (heading?: string): boolean =>
+    repeatsTarget(shown, titleFromPath(t.title), heading) || repeatsTarget(shown, t.title, heading)
+  if (names()) return 'title'
   if (t.heading === undefined) return null
-  if (repeatsTarget(shown, t.heading)) return 'heading'
-  return repeatsTarget(shown, t.title, t.heading) ? 'both' : null
+  if (normalizeTitle(shown) === normalizeTitle(t.heading)) return 'heading'
+  return names(t.heading) ? 'both' : null
 }
@@ pageLinkText @@
-/** The one writer of a page link: a wikilink where every slot spells, the markdown form otherwise, its label emptied where the grammar's label can't spell it so the draw gives it the default, so no writer leaves a slot unwritten or writes a link the grammar can't read back. A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. */
+/** The one writer of a page link: a wikilink where every slot spells, the markdown form otherwise, its label emptied where the grammar's label can't spell it so the draw gives it the default, so no writer leaves a slot unwritten or writes a link the grammar can't read back. A present-but-empty heading or alias spells its slot (`[[A#]]`, `[[A|]]`): the picker opens a slot by writing it. A wikilink spelling a path with no heading and no shown text carries its title as its alias, as Obsidian's writer does, so the link shows the title in every reader. */
 export function pageLinkText(
   t: PageName & { shown?: string },
   prefer: 'wiki' | 'markdown',
 ): string {
   const { title, heading, shown } = t
   if (prefer !== 'wiki' || !spellsAsWiki(t)) {
     …
   }
   const target = heading === undefined ? title : `${title}#${heading}`
-  const named = shown !== undefined && (shown === '' || !repeatsTarget(shown, title, heading))
-  return named ? `[[${target}|${shown}]]` : `[[${target}]]`
+  const given = shown !== undefined && (shown === '' || !repeatsTarget(shown, title, heading)) ? shown : undefined
+  const alias = given ?? (carriesTitleAlias({ ...t, shown: given }) ? titleFromPath(title) : undefined)
+  return alias === undefined ? `[[${target}]]` : `[[${target}|${alias}]]`
 }
+
+/** Whether a wikilink to `t` carries the page's title as its alias: a path with no heading and no shown text, so a reader that doesn't understand paths still reads the title, as Obsidian's writer does since 1.3. The one statement of the rule; the writer and the rename follower ask it, and an embed never carries one. */
+export const carriesTitleAlias = (t: PageName & { shown?: string; embed?: boolean }): boolean =>
+  !t.embed && t.shown === undefined && t.heading === undefined && t.title.includes('/')
```

```Core/Connections/rewrite.ts diff
@@ imports @@
+import { titleFromPath } from '../Paths/posix'
@@ carry @@
     case 'title':
-      return to.title
+      return titleFromPath(to.title)
     case 'heading':
       return to.heading!
     case 'both':
-      return `${to.title}#${to.heading}`
+      return `${titleFromPath(to.title)}#${to.heading}`
```

```Core/Connections/linkValue.ts diff
@@ shownAlias @@
   const written = readLinkText(text)
   const target = resolveLink(written, index)
+  const named = namedPage(written)
   const alias = written?.shown
-  if (target.kind !== 'page' || target.heading || !alias || !keepsAlias(alias, target.page.title))
-    return null
+  if (!named || target.kind !== 'page' || target.heading || !alias) return null
+  if (namesTarget(alias, named) || !keepsAlias(alias, target.page.title)) return null
   const { page } = target
   const wasWritten = was === undefined ? null : readLinkText(was)
-  const named = namedPage(wasWritten)
-  if (named && namesTarget(alias, named)) return null
+  const wasNamed = namedPage(wasWritten)
+  if (wasNamed && namesTarget(alias, wasNamed)) return null
@@ resolvedTarget @@
-/** A written link as the page it resolves to, written by that page's own title in the syntax it came in (a value's bare heading keeps its empty title); anything else as written. */
+/** A written link as the page it resolves to, spelled at the depth it was written (its title, or the same tail of the page's path, case corrected, or the full path where that tail no longer names the page alone) in the syntax it came in (a value's bare heading keeps its empty title); anything else as written. */
   const target = resolveLink(written, index, own)
   const named = namedPage(written)
-  if (target.kind !== 'page' || !named) return written
+  if (target.kind !== 'page' || !named || !index) return written
   return {
     kind: 'page',
     syntax: written.syntax === 'wiki' ? 'wiki' : 'markdown',
-    title: named.title === '' ? '' : target.page.title,
+    title: named.title === '' ? '' : index.writtenName(target.page.path, named.title),
@@ linkDisplayText @@
   if (target.kind === 'page') {
     if (target.syntax === 'markdown') return defaultLabel(target.title, target.heading)
-    if (!target.heading) return target.title
-    return target.title ? `${target.title} § ${target.heading}` : target.heading
+    const title = titleFromPath(target.title)
+    if (!target.heading) return title
+    return title ? `${title} § ${target.heading}` : target.heading
   }
```

**VERIFY**

- [ ] The new cases pass; `rewrite.test.ts:136` (a label that named the old title follows it) and `:145-148` (a URL's last segment is never a page) still pass; `linkValue.test.ts:259-263` (an alias that merely repeats the title drops) still passes, since the page's title is a basename.
- [ ] `shownAlias` on `[[A/Notes|Notes]]` and `[[A/Notes|A/Notes]]` records nothing: shown text that names the target, by `namesTarget`, is never memory.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-4

**TASK:** Hide a wikilink's folder with its brackets, so a path link draws its title only and reveals the path with the caret, and let the two `Page § Heading` joins draw the title alone.

**NOW:** `linkToken` (`Core/MarkdownPM/Engine/tokens.ts:229-257`) starts a wikilink's content at `o.title[0]`, so `[[Studio/Pommora/ClaudeMD]]` draws the whole path; the leading marker swallows `[[` and `[[Title|` only. The editor's join (`Core/MarkdownPM/decorations.ts:594`) and the resting cell's (`Core/MarkdownPM/Tables/cellStatic.tsx:178`) slice `tk.link.title`, folder included. The `[[#]]`-being-written branch (`decorations.ts:599-603`) dims a token whose content is empty.

**CHANGE**

- [ ] Write and watch fail: `tokens.test.ts`: `[[A/B/Notes]]` tokenizes with `contentRange` over `Notes` and a leading marker over `[[A/B/`; `[[A/B/Notes#H]]` over `Notes#H`; `[[A/B/Notes|x]]` over `x`; `[[A/]]`, `[[A/B/]]`, and `[[A/B/ ]]` keep their whole content (still being written); a markdown token is unchanged. `format.test.ts`: unwrapping `[[A/B/Notes]]` leaves `Notes`, the word the reader saw. A `decorations` test and a `cellStatic` test draw `[[A/Notes#H]]` as `Notes § H` with the folder hidden.
- [ ] `linkToken(text, o)`: the wiki content starts past the title's last `/`, unless the title ends in `/` (trailing space aside), in which case the whole slot stays; the search is bounded to the title; `tokenizeChunk` passes `text`.
- [ ] The editor's join ranges over `tk.contentRange[0]` to `tk.link.title[1]` in place of `tk.link.title`; the resting cell slices `cs` to `tk.link.title[1]`.
- [ ] `tokens.ts:242`'s comment ("swallows `[[Title|`") says the leading marker swallows the folder too, and that a half ending in `/` keeps the slot.

**AFTER**

```Core/MarkdownPM/Engine/tokens.ts diff
@@ linkToken @@
-function linkToken(o: LinkOccurrence): Token {
+function linkToken(text: string, o: LinkOccurrence): Token {
   const [fs, fe] = o.full
   if (o.syntax === 'markdown')
     …
-  // The leading marker swallows `[[Title|`. An opened-but-empty alias shows nothing, so it stays a plain link.
+  // The leading marker swallows the folder and `[[Title|`; a half still being written (ending in `/`) keeps the whole slot. An opened-but-empty alias shows nothing, so it stays a plain link.
   const alias = filled(o.shown) ? o.shown : null
   const heading = filled(o.heading) ? o.heading : null
-  const shown = alias ?? [o.title[0], heading ? heading[1] : o.title[1]]
+  const half = text.slice(o.title[0], o.title[1])
+  const start = o.title[0] + (half.trimEnd().endsWith('/') ? 0 : half.lastIndexOf('/') + 1)
+  const shown = alias ?? [start, heading ? heading[1] : o.title[1]]
@@ tokenizeChunk @@
-  const links = linkOccurrences(text, inCode).map(linkToken)
+  const links = linkOccurrences(text, inCode).map((o) => linkToken(text, o))
```

```Core/MarkdownPM/decorations.ts diff
@@ the wikiLink join @@
-    const [rs, re] = tk.link.title
@@ the join's range @@
           (join.showPage ? Decoration.mark({ class: 'md-connection-resolved' }) : hideMarker).range(
-            rs,
-            re,
+            tk.contentRange[0],
+            tk.link.title[1],
           ),
```

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ the resting join @@
-                {join.showPage && text.slice(...tk.link.title)}
+                {join.showPage && text.slice(cs, tk.link.title[1])}
```

**VERIFY**

- [ ] The new cases pass; the existing `tokens`, `decorations`, and `cellStatic` link tests pass unchanged (an unaliased title without `/` keeps its content start). Turning the Connection format off on a path link leaves the title the reader saw, as it leaves an alias.
- [ ] Live (the owner's, by hand): in `~/Test`, type `[[` and a page's path; the folder hides when the caret leaves and reveals when it returns, in a body and in a resting cell; a phantom path link under **Display Unresolved Links As Plain Syntax** shows its whole syntax; an aliased path link revealed styles `Folder/Title` as the target while an unaliased one shows the folder in the bracket color (disclosed; one range would equalize it, left as is).
- [ ] Run the gates, then `view-delta` for Phase 1.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: every reader of `LinkTarget.title` or `PageName.title` is accounted for under the whole-half shape (the picker's slot query, the settle, `shownAlias`, `keepsShown`, `pageLabel`, the Paste As rows in main); no site still assumes a title is a basename; `wikiTitle` and the asset map read `[[Report.md]]` as they did; `buildPageIndex` does no new work per page; the draw hides the folder on every surface a wikilink draws in; the `.md` strip lives in `pageKey` alone.

### Phase 2 — The Index Key

**GOAL:** The content index records what a link writes, through the one `pageKey`, and records a page's own-heading links under no key at all, so the heading cascade stops rewriting a twin's own fragments through a shared title (its path-spelled linkers follow in Task 6-2) and the outside heading-rename lane stops guessing from a title; the two mention queries take key lists so a folder operation asks once; the Matrix draws one edge per page pair; and the generation moves to 18 so every index re-keys on its next open.

#### Task 2-1

**TASK:** Key the scanner's hits by `pageKey`, key a page's own-heading links and `§` runs as `''`, drop the scanner's own-title parameter, and let the heading cascade take the page's path, sweep the page's own file always, and decide "own" by path; delete `cascadeSeen`'s pre-check and `spacesLinkHeading`.

**NOW:** `linksIn(body, ownTitle, outline, inCode)` (`scan.ts:84-115`) keys a hit by `titleKey(raw, own)` (`:24`), which returns the normalized own title for a bare `[[#H]]` and `normalizeTitle(raw)` otherwise; `valueLinks(values, ownTitle, outline)` and `extractPageIndex` (`indexSeed.ts:42,52,57`) pass `titleFromPath(rel)`. `rewriteHeadingConnections(body, title, old, next, ownTitle, outline)` (`rewrite.ts:78-95`) matches `hit.target === titleKey && hit.qualifier === oldKey`, so twins share hits. `HeadingRenameSeen` carries `title` (`indexSeed.ts:94-98,140`); `cascadeSeen` (`fileEvents.ts:297-309`) gates on `queryHeadingMentions`, `spacesLinkHeading` (`cascade.ts:61-73`, reading every Space sidecar), and `tilesLinkHeading` before calling `renameCascade(root, seen.title, …)`, and `renameCascade`'s heading arm (`cascade.ts:162-255`) sweeps the index's hits plus `skipRel`, deciding `own` by `titleFromPath(file)` (`:217`) and gating the `§` outline on `normalizeTitle(own) === titleKey` (`:187`). The editor's own pass (`headingRenameSettle.ts:51-57`) passes `host.pageTitle()` as both title and own.

**CHANGE**

- [ ] Write and watch fail: `scan.test.ts`: `extractMentions('[[#H]]')` is `new Set([''])`, `extractHeadingMentions('[[#H]]')` is `[{ title: '', heading: 'h' }]`, `extractHeadingMentions('§Setup', ['Setup'])` likewise with `''`, `extractMentions('[[A/Notes.md]]')` is `new Set(['a/notes'])`, `[x](A/Notes)` keys `a/notes`; every `linksIn`/`valueLinks` call drops its own argument. `indexSeed.test.ts:161-165`: a bare `[[#Setup]]` answers `queryHeadingMentions('setup', '')`; `:167-181`: `seen` equals `{ path: 'Notes/A.md', old: 'setup', next: 'Intro' }` and `renameCascade(root, { path: seen.path, heading: seen.old, to: seen.next })` still rewrites both B's `[[A#Setup]]` and A's own `[[#Setup]]`. `rewrite.test.ts`: every `rewriteHeadingConnections` call takes `(body, new Set([key]), old, next, own: boolean, outline?)`; a body on page B holding `[[#Setup]]` with `own: false` is untouched while `own: true` rewrites it. `cascade.test.ts`: the title arm's calls become `renameCascade(root, { title, to })`, the heading arm's `renameCascade(root, { path, heading, to })`; `:796-806` (`spacesLinkHeading`) goes; a new case: an outside heading rename on a page nothing else links still rewrites that page's own bare link.
- [ ] `scan.ts`: delete `titleKey`; `target = pageKey(named.title)` (an empty title keys `''`); `linksIn(body, outline = [], inCode?)` and `valueLinks(values, outline = [])`; the `section` arm's `target: ''`; header and `LinkHit` docs say a page's own heading keys `''`.
- [ ] `indexSeed.ts`: `extractPageIndex` drops `own`; `HeadingRenameSeen { path, old, next }` and `reindex` fills `path`.
- [ ] `rewrite.ts`: `rewriteHeadingConnections(body, keys: ReadonlySet<string>, oldHeading, newHeading, own: boolean, outline?)` matches `(hit.target === '' ? own : keys.has(hit.target)) && hit.qualifier === oldKey && hit.heading`.
- [ ] `rewrite.ts:18`: `RenameChange` becomes `CascadeChange = { title: string; to: string } | { path: string; heading: string; to: string }` (Task 6-2 replaces its title arm); `cascade.ts`: `renameCascade(root, change, settled = false)`, `settled` saying the caller's editor already rewrote the page's own body (the one caller, `mutate.ts:94`, passes `true` where it passed `req.path`); the heading arm is narrowed once (`heading = 'heading' in change ? change : null`), its `title = titleFromPath(change.path)`, its files are the index's hits plus `change.path` always (a self-link is never queried for), its `rewrite(text, own: boolean, outlineOf)` and `patchOf(raw, holds, own = false, outlineOf = '')` take `own` as a boolean, `text(content, file)` computes `own = relative(root, file) === change.path`, and the `§` gate becomes `runs && own`; delete `spacesLinkHeading` and its `valueLinks` import if unused.
- [ ] `fileEvents.ts`: `cascadeSeen` becomes `renameCascade(root, { path: seen.path, heading: seen.old, to: seen.next })`, the log, and `oweCascade`; its comment says every outside heading rename sweeps its own page (the file was just written), and the gate's three questions are the cascade's own.
- [ ] `rename.ts:42`: `renameCascade(root, { title: oldTitle, to: req.newName })`. `mutate.ts:94`: `renameCascade(root, req, true)` (the request is `{ path, heading, to }`).
- [ ] `queryHeadingMentions` takes the heading first, `(normalizedHeading, normalizedTitle)`, in `Platform/stores.ts:61`, `Desktop/Store/stores.ts`, `memoryStores.ts`, and `contentIndex.ts`, with `storesContract.ts:166,169,244` flipped to match: the order Task 2-2's list form needs, flipped here where the cascade first writes it.
- [ ] `headingRenameSettle.ts:51-57`: `keys = new Set([pageKey(host.pageTitle() ?? '')])`, `own: true` (a one-phase interim: Task 3-1 hands it the page and `namesOf`).

**AFTER**

```Core/Connections/scan.ts diff
@@ header @@
-// One walker answers for every link syntax; `embed` marks a link of either syntax alone on its line behind a `!`, a tile's relation that renames as a link and relates as nothing.
+// One walker answers for every link syntax; `embed` marks a link of either syntax alone on its line behind a `!`, a tile's relation that renames as a link and relates as nothing. A link names its page by the written half's key; a page's own heading (`[[#H]]`, a `§` run) keys '' and is reached by sweeping the page itself.
@@ imports @@
-import { normalizeTitle } from '../Paths/caseFold'
+import { normalizeTitle } from '../Paths/caseFold'
+import { pageKey } from './pageIndex'
@@ titleKey @@
-const titleKey = (raw: string, own: string): string => (raw === '' ? own : normalizeTitle(raw))
-
-// A blank title names nothing; a bare fragment names this page, whose key is '' when no title is given, and `[[#]]` names nothing at all.
+// A blank title names nothing; a bare fragment names this page, whose key is '', and `[[#]]` names nothing at all.
 const names = (target: string, written: string, qualifier: string): boolean =>
@@ LinkHit doc @@
-/** One occurrence the index and the rename rewriter share: … `target` and `qualifier` as normalized keys (`qualifier` is '' when the link names no heading), `title` empty where the link names its own page by leaving it out, and `embed` for a link alone on its line behind a `!`. */
+/** One occurrence the index and the rename rewriter share: … `target` (the written half through `pageKey`, '' for the page's own heading) and `qualifier` (the heading's key, '' when the link names none) as normalized keys, `title` empty where the link names its own page by leaving it out, and `embed` for a link alone on its line behind a `!`. */
@@ linksIn @@
 export function* linksIn(
   body: string,
-  ownTitle = '',
   outline: readonly string[] = [],
   inCode?: CodeMask,
 ): Generator<LinkHit> {
   const runs = outline.length > 0 && body.includes('§')
   if (!mayHoldLink(body) && !runs) return
   const mask = inCode ?? codeMask(body)
-  const own = normalizeTitle(ownTitle)
   for (const o of linkOccurrences(body, mask)) {
     const named = namedPage(readOccurrence(body, o))
     if (!named) continue
-    const target = titleKey(named.title, own)
+    const target = pageKey(named.title)
@@ section arm @@
       named: { title: '', heading },
-      target: own,
+      target: '',
@@ valueLinks @@
 export function* valueLinks(
   values: Record<string, unknown>,
-  ownTitle = '',
   outline: readonly string[] = [],
 ): Generator<LinkHit & { key: string }> {
   …
-    for (const hit of linksIn(text, ownTitle, outline)) yield { ...hit, key }
+    for (const hit of linksIn(text, outline)) yield { ...hit, key }
```

```Core/Index/indexSeed.ts diff
@@ extractPageIndex @@
-  const own = titleFromPath(rel)
   const { body } = splitEnvelope(content)
   …
-  for (const hit of linksIn(body, own, outline, (p) => inCodeAt(scan, p))) {
+  for (const hit of linksIn(body, outline, (p) => inCodeAt(scan, p))) {
   …
-  for (const hit of valueLinks(values, own, outline))
+  for (const hit of valueLinks(values, outline))
@@ HeadingRenameSeen @@
 export interface HeadingRenameSeen {
-  title: string
+  path: string
   old: string
   next: string
 }
@@ reindex @@
-    return next ? [{ title: titleFromPath(path), old: gone[0], next: next.text }] : []
+    return next ? [{ path, old: gone[0], next: next.text }] : []
```

```Core/Connections/rewrite.ts diff
@@ RenameChange @@
-export type RenameChange = { title: string } | { heading: string; to: string }
+export type CascadeChange = { title: string; to: string } | { path: string; heading: string; to: string }
@@ rewriteHeadingConnections @@
-/** Rewrites every link and bare run that names `oldHeading` on the page titled `title`; a bare fragment counts only when `ownTitle` is that page, and a `§` run only when `outline` (the page's headings around the rename) is given, so a longer heading the run names keeps it. */
+/** Rewrites every link and bare run that names `oldHeading` on the page `keys` name; a bare fragment counts only in that page's own body (`own`), and a `§` run only when `outline` (the page's headings around the rename) is given, so a longer heading the run names keeps it. */
 export function rewriteHeadingConnections(
   body: string,
-  title: string,
+  keys: ReadonlySet<string>,
   oldHeading: string,
   newHeading: string,
-  ownTitle = '',
+  own: boolean,
   outline?: readonly string[],
 ): string {
   if (!mayNameHeading(body)) return body
-  const titleKey = normalizeTitle(title)
   const oldKey = normalizeTitle(oldHeading)
   const rewrite = follower(body)
   const edits: TextEdit[] = []
-  for (const hit of linksIn(body, ownTitle, outline && [...outline, oldHeading]))
-    if (hit.target === titleKey && hit.qualifier === oldKey && hit.heading)
+  for (const hit of linksIn(body, outline && [...outline, oldHeading]))
+    if ((hit.target === '' ? own : keys.has(hit.target)) && hit.qualifier === oldKey && hit.heading)
       edits.push(...rewrite(hit, 'heading', newHeading))
```

```Core/Nexus/cascade.ts diff
@@ spacesLinkHeading @@
-/** Whether a Space the tree holds links `title#heading` under a key that holds links, which no index names. */
-export function spacesLinkHeading(root: string, title: string, heading: string): boolean {
-  …
-}
@@ renameCascade @@
-/** A page rename sweeps the files the index names, or the whole corpus before there is one; a heading rename sweeps what a ready index names and the caller's own page, whose body is already rewritten and whose frontmatter takes the patch, since a corpus scan per heading edit is an on-every-edit cost. … `skipRel` is a page whose editor has already rewritten its own links. */
+/** A page rename sweeps the files the index names, or the whole corpus before there is one; a heading rename sweeps what a ready index names and the page itself always, since its own bare fragments are keyed to no page, and a corpus scan per heading edit is an on-every-edit cost. … `skipRel` is a page whose editor has already rewritten its own body; its frontmatter still takes the patch. */
 export async function renameCascade(
   root: string,
-  title: string,
   change: CascadeChange,
   skipRel: string | null = null,
 ): Promise<CascadeReport> {
+  const title = 'title' in change ? change.title : titleFromPath(change.path)
   const named = 'title' in change ? title : `${title}#${change.heading}`
   try {
-    const titleKey = normalizeTitle(title)
+    const titleKey = pageKey(title)
     const rels =
       'title' in change
         ? (queryMentions(titleKey) ?? (await nexusCorpus(root)))
-        : (queryHeadingMentions(titleKey, normalizeTitle(change.heading)) ?? [])
+        : [...(queryHeadingMentions(normalizeTitle(change.heading), titleKey) ?? []), change.path]
     …
-    const rewrite = (text: string, own = '', outlineOf = text): string =>
+    const rewrite = (text: string, own = false, outlineOf = text): string =>
       'title' in change
-        ? rewriteConnections(text, title, change.title)
+        ? rewriteConnections(text, title, change.to)
         : rewriteHeadingConnections(
             text,
-            title,
+            new Set([titleKey]),
             change.heading,
             change.to,
             own,
-            runs && normalizeTitle(own) === titleKey
-              ? headingOutline(outlineOf).map((h) => h.text)
-              : undefined,
+            runs && own ? headingOutline(outlineOf).map((h) => h.text) : undefined,
           )
     …
     const text = (content: string, file: string): string | null => {
       const { body } = splitEnvelope(content)
-      const own = titleFromPath(file)
+      const rel = relative(root, file)
+      const own = 'path' in change && rel === change.path
       const patch = patchOf(splitFrontmatter(content), holds, own, body)
       const keys = Object.keys(patch)
       // The caller's editor already rewrote its own body; its frontmatter still takes the patch.
-      const next = relative(root, file) === skipRel ? body : rewrite(body, own)
+      const next = rel === skipRel ? body : rewrite(body, own)
```

```Core/Nexus/fileEvents.ts diff
@@ cascadeSeen @@
-// A rename an outside edit shows (Obsidian or sync, landed live or found by the index seed) takes the same cascade the editor's settle takes; the editor's own save owes none, its settle having spoken.
+// A rename an outside edit shows (Obsidian or sync, landed live or found by the index seed) takes the same cascade the editor's settle takes, the page itself swept with the files the index names; the editor's own save owes none, its settle having spoken.
 export async function cascadeSeen(root: string, seen: HeadingRenameSeen): Promise<void> {
-  const title = normalizeTitle(seen.title)
-  const linked = queryHeadingMentions(title, seen.old)?.length
-  if (
-    !linked &&
-    !spacesLinkHeading(root, title, seen.old) &&
-    !(await tilesLinkHeading(root, title, seen.old))
-  )
-    return
-  const c = await renameCascade(root, seen.title, { heading: seen.old, to: seen.next })
+  const c = await renameCascade(root, { path: seen.path, heading: seen.old, to: seen.next })
   if (c.warning) console.error('heading rename:', c.warning)
   oweCascade(root, c.pages, c.hosts)
 }
```

```Core/MarkdownPM/Links/headingRenameSettle.ts diff
@@ rewrite @@
-        const own = host.pageTitle() ?? ''
+        const keys = new Set([pageKey(host.pageTitle() ?? '')])
         …
-        const body = rewriteHeadingConnections(doc, own, held.old, final, own, outline)
+        const body = rewriteHeadingConnections(doc, keys, held.old, final, true, outline)
```

**VERIFY**

- [ ] The listed tests pass, `indexSeed.test.ts:167-181` included (A's own `[[#Setup]]` follows through the swept own file, B's `[[A#Setup]]` through the query).
- [ ] `aliasAcceptance.test.ts`, `admission.test.ts:117,132`, `linkValue.test.ts:298`, and `tilesFile.test.ts` take the new signatures and pass; `fileEvents.test.ts`'s `cascadeSeen` cases pass without the gate.
- [ ] `git grep -n "ownTitle\|spacesLinkHeading" -- Core Desktop` finds nothing outside tests being rewritten.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** Let the two mention queries take a list of keys through the store's `json_each` idiom, so "files linking a page" is one query over every key that names it, and fold the delete cascade's hand-rolled union into that call.

**NOW:** `queryMentions(normalizedTitle)` and `queryHeadingMentions(normalizedTitle, normalizedHeading)` take one key (`Core/Platform/stores.ts:60-61`; `Desktop/Store/stores.ts:100-114` as `target = ?`; `Core/Testing/memoryStores.ts:130-145`; `contentIndex.ts:65-74`). `deleteCascade` maps `queryMentions` over its gone titles and unions by hand, falling back to the corpus if any answer is null (`cascade.ts:96-99`). The store binds a list of paths as one JSON argument (`PATHS_OF`, `stores.ts:16`), since a placeholder per value fails past SQLite's variable limit.

**CHANGE**

- [ ] `storesContract.ts`: add a case where `queryMentions('beta', 'gamma')` returns the union in path order and `queryHeadingMentions('setup', 'beta', 'b/beta')` likewise. Watch them fail.
- [ ] `Core/Platform/stores.ts`: `queryMentions(keys: readonly string[]): string[]`, `queryHeadingMentions(normalizedHeading: string, keys: readonly string[]): string[]`, arrays like their neighbors `readHeadings` and `readPageRelations`; the `Relation` doc at `:11` says `target` is the written key as `pageKey` reads it, `''` for a page's own heading.
- [ ] `Desktop/Store/stores.ts`: `PATHS_OF` becomes `LISTED` (it binds any list, not paths alone); both read `target IN ${LISTED}` bound to `JSON.stringify(keys)`. `memoryStores.ts`: `keys.includes(r.target)`. `contentIndex.ts`: the wrappers take and pass the same shapes.
- [ ] `cascade.ts:96-99` → `const rels = queryMentions([...gone]) ?? (await nexusCorpus(root))`, behind an early return on an empty `gone` beside the one on no link definitions (an empty list before the index is ready would read the corpus for nothing).

**AFTER**

```Core/Platform/stores.ts diff
@@ Relation doc @@
-/** `target` is a normalized title, never a path — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a folded Context key for a `space` row, and '' otherwise. */
+/** `target` is the written page half as `pageKey` reads it, a title or a path from the Nexus root or any tail of one, and '' for a page's own heading — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a folded Context key for a `space` row, and '' otherwise. */
@@ ContentIndexStore @@
-  queryMentions(normalizedTitle: string): string[]
-  queryHeadingMentions(normalizedTitle: string, normalizedHeading: string): string[]
+  /** Every page linking any of `keys`; one query, since a folder's pages are named by thousands of keys at once. */
+  queryMentions(keys: readonly string[]): string[]
+  queryHeadingMentions(normalizedHeading: string, keys: readonly string[]): string[]
```

```Desktop/Store/stores.ts diff
@@ queryMentions @@
-  queryMentions(normalizedTitle) {
+  queryMentions(keys) {
     return paths(
       db,
-      "SELECT DISTINCT path FROM relations WHERE target = ? AND kind <> 'space' ORDER BY path",
-      normalizedTitle,
+      `SELECT DISTINCT path FROM relations WHERE target IN ${LISTED} AND kind <> 'space' ORDER BY path`,
+      JSON.stringify(keys),
     )
   },
-  queryHeadingMentions(normalizedTitle, normalizedHeading) {
+  queryHeadingMentions(normalizedHeading, keys) {
     return paths(
       db,
-      "SELECT DISTINCT path FROM relations WHERE target = ? AND qualifier = ? AND kind <> 'space' ORDER BY path",
-      normalizedTitle,
+      `SELECT DISTINCT path FROM relations WHERE target IN ${LISTED} AND qualifier = ? AND kind <> 'space' ORDER BY path`,
+      JSON.stringify(keys),
       normalizedHeading,
     )
   },
```

```Core/Testing/memoryStores.ts diff
@@ queryMentions @@
-    queryMentions(normalizedTitle) {
+    queryMentions(keys) {
       return sortedPaths(
         relationRows()
-          .filter((r) => r.target === normalizedTitle && r.kind !== 'space')
+          .filter((r) => keys.includes(r.target) && r.kind !== 'space')
@@ queryHeadingMentions @@
-    queryHeadingMentions(normalizedTitle, normalizedHeading) {
+    queryHeadingMentions(normalizedHeading, keys) {
       …
-              r.target === normalizedTitle &&
+              keys.includes(r.target) &&
               r.qualifier === normalizedHeading &&
```

```Core/Index/contentIndex.ts diff
-export function queryMentions(normalizedTitle: string): string[] | null {
-  return queryPaths((db) => db.queryMentions(normalizedTitle))
+export function queryMentions(keys: readonly string[]): string[] | null {
+  return queryPaths((db) => db.queryMentions(keys))
 }
 
 export function queryHeadingMentions(
-  normalizedTitle: string,
   normalizedHeading: string,
+  keys: readonly string[],
 ): string[] | null {
-  return queryPaths((db) => db.queryHeadingMentions(normalizedTitle, normalizedHeading))
+  return queryPaths((db) => db.queryHeadingMentions(normalizedHeading, keys))
 }
```

```Core/Nexus/cascade.ts diff
@@ deleteCascade @@
-    const hits = [...gone].map(queryMentions)
-    const rels = hits.includes(null)
-      ? await nexusCorpus(root)
-      : [...new Set(hits.flatMap((h) => h ?? []))]
+    const rels = queryMentions([...gone]) ?? (await nexusCorpus(root))
```

**VERIFY**

- [ ] `storesContract.ts` passes against both stores (the memory store and the SQLite store); `cascade.test.ts`'s delete cases pass.
- [ ] The query plan for the `IN (SELECT value FROM json_each(?))` form still searches `relations_by_target` (`EXPLAIN QUERY PLAN` once, by hand, in the drive harness).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-3

**TASK:** Dedupe the Matrix's connections after resolving, so one body spelling a page two ways draws one edge, and move the index generation to 18.

**NOW:** `matrixConnections` (`Core/Matrix/matrixInput.ts:60-78`) dedupes on `${pageId}\0${kind}\0${link.target}` before resolving, so `[[ClaudeMD]]` and `[[Pommora/ClaudeMD]]` in one body become two connections to one page, and `graph.ts`'s `link` (`Core/Matrix/Engine/graph.ts:77-82`) pushes every connection it's given. `INDEX_GENERATION` is 17 (`Desktop/Store/ddl.ts:3`); the staleness check is `!==` (`:83`), so a stale index drops its tables and the seed rebuilds from nothing (`indexSeed.ts:226`).

**CHANGE**

- [ ] `matrixInput.test.ts`: a body linking one page as a title and as a path yields one connection; a path link to a page yields its edge. Watch them fail.
- [ ] `matrixConnections` resolves first and dedupes on `${pageId}\0${kind}\0${hit.page.id}`; its comment keeps "the rule runs before the dedupe".
- [ ] `ddl.ts`: `INDEX_GENERATION = 18`.

**AFTER**

```Core/Matrix/matrixInput.ts diff
@@ matrixConnections @@
-  // A value row relates only under a key that holds links; asked here, with the registry in hand, so a property created, renamed, or synced over a held key changes the graph without a re-index. The rule runs before the dedupe, so a Number key never shadows a Link key naming the same page.
+  // A value row relates only under a key that holds links; asked here, with the registry in hand, so a property created, renamed, or synced over a held key changes the graph without a re-index. The rule runs before the dedupe, so a Number key never shadows a Link key naming the same page; the dedupe runs after resolution, so two spellings of one page draw one edge.
   const holds = linkKeysOf(tree.config.registry)
   const seen = new Set<string>()
   const connections: GraphInput['connections'] = []
   for (const link of links) {
     if (link.kind === 'value' && !holds(link.key)) continue
-    const id = `${link.pageId}\0${link.kind}\0${link.target}`
-    if (seen.has(id)) continue
-    seen.add(id)
     const hit = resolve(link.target)
-    if (hit.status === 'resolved' && hit.page)
-      connections.push({ from: link.pageId, to: hit.page.id, kind: link.kind })
+    if (hit.status !== 'resolved' || !hit.page) continue
+    const id = `${link.pageId}\0${link.kind}\0${hit.page.id}`
+    if (seen.has(id)) continue
+    seen.add(id)
+    connections.push({ from: link.pageId, to: hit.page.id, kind: link.kind })
   }
```

```Desktop/Store/ddl.ts diff
-export const INDEX_GENERATION = 17
+export const INDEX_GENERATION = 18
```

**VERIFY**

- [ ] `matrixInput.test.ts` passes; an index stamped 17 rebuilds on open (the drive harness: open `~/Test`, confirm `index_generation` reads 18 and `queryHeadingMentions('setup', '')` lists a page holding `[[#Setup]]`).
- [ ] Run the gates, then `view-delta` for Phase 2.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: no reader of `relations.target` still assumes a title (`Core/Platform/stores.ts`'s doc, the Matrix, the cascade, `readTileHeadingLinks`'s keys); no caller still passes an own title; the heading cascade reaches a page's own bare links through the swept own file and nothing else, in-app (`skipRel`) and outside (`cascadeSeen`) alike; the variadic queries keep every single-key call valid and the contract tests cover both stores; the generation bump is the only migration and the only `INDEX_GENERATION` change in the plan.

### Phase 3 — The Writers and the Picker

**GOAL:** Every writer that holds a page spells it through `writtenName`, so a pick of a shared title writes the full path (A-3), a written link keeps its depth through paste, Paste As, the Link field, and Show Full Link (A-7), Copy Link and the embed pick name a page as a new link should (A-2), and the picker closes on a title that resolves, keeps a heading the picked page holds (C-5), and leaves an ambiguous title open for the one pick that settles it (B-4). The editor host hands out the page rather than its title, so the editor's own heading-rename pass decides by the page's keys.

#### Task 3-1

**TASK:** Spell the page at every writer through `writtenName`, replace `EditorHost.pageTitle()` with `page()`, key the embed pick tree and its exclusions by path, and let the editor's own heading-rename pass take the page's keys.

**NOW:** `resolvedTarget` spells at the written depth since Task 1-3. Copy Link writes `pageLinkText({ title, heading }, 'wiki')` from the title (`Core/Interface/Menus/pageMenuActions.ts:54`); the heading grip reads `host.pageTitle()` (`Core/MarkdownPM/Menus/gripMenu.ts:78,93`), as does `headingRenameSettle.ts:51` (Phase 2's interim) and the harness (`Core/Testing/editorHarness.ts:27,83,90,135`); `EditorHost.pageTitle()` is declared at `api.ts:205` and built at `Core/Pages/editorHost.tsx:145` from `pageOf`, which already returns a `ConnPage`. The embed source pick tree picks `p.title` (`editorHost.tsx:136-139`) and the grip writes `pageEmbedText(title)` (`gripMenu.ts:140-147`); `embedPickTree` excludes by `normalizeTitle(n.pick)` (`gripMenu.ts:23-30`) against `embedExclusions`' normalized titles (`embedWidget.tsx:645-652`), while ancestors arrive as paths. `LinkCell`'s Show Full Link writes `target.page.title` (`LinkCell.tsx:46`). `pasteAsMenu.ts:100` writes `pageEmbedText(target.title)` from `resolvedTarget`, which keeps its depth once this task lands, so it changes nothing.

**CHANGE**

- [ ] Write and watch fail: `gripMenu.test.ts:45-56` picks paths and excludes by path; `embedWidget.test.ts:117,132-136` excludes by path. `LinkCell.test.tsx` gains a Show Full Link case writing a shared holder's path. `gripMenuFlow.test.tsx:241` and `bodyMount.test.tsx:52` pass `page: { id, title, path }`.
- [ ] `api.ts`: `page(): ConnPage | null` replaces `pageTitle()` with its comment; `editorHost.tsx:145`: `page: () => (pageId && pageOf(pageId)) ?? null`; the harness's `spec.pageTitle` becomes `spec.page?: ConnPage` and its alias lines read `spec.page?.title ?? ''`.
- [ ] `gripMenu.ts:78-94`: `const page = host.page()`, `linkable = page !== null`, Copy Link writes `pageLinkText({ title: host.connections()?.index.writtenName(page.path) ?? page.title, heading }, 'wiki')`.
- [ ] `headingRenameSettle.ts:51-57`: `const page = host.page()`, `const index = host.connections()?.index`, `keys = new Set(page && index ? index.namesOf(page.path) : [])`, `own: true`; `pageKey` import goes.
- [ ] `pageMenuActions.ts:54`: `pageLinkText({ title: s.tree ? pageIndexOf(s.tree).writtenName(path) : title, heading: page.heading }, 'wiki')`.
- [ ] `editorHost.tsx:138`: the pick tree picks `p.path`; `embedPickTree(nodes, exclude, name)` keeps `expressibleInLink(name(n.pick)) && !exclude.has(n.pick)`, called at `gripMenu.ts:56` with `(path) => index?.writtenName(path) ?? titleFromPath(path)`; `gripMenu.ts:140-147` writes `pageEmbedText(name(path))` the same way. `embedExclusions` adds `t.path` and each ancestor as is; its `titleFromPath` and `normalizeTitle` imports go.
- [ ] `LinkCell.tsx:46`: `pageLinkText({ title: api?.index.writtenName(target.page.path, namedPage(written)?.title) ?? target.page.title, heading: target.heading }, 'wiki')`, so a bare `[[#H]]` on a holder still shows `[[Holder#H]]` and a shared holder shows its path.

**AFTER**

```Core/MarkdownPM/api.ts diff
-  // The live tree's title for the surface's own page, read fresh rather than from a capped cache; null off a page identity.
-  pageTitle(): string | null
+  // The live tree's record of the surface's own page, read fresh rather than from a capped cache; null off a page identity.
+  page(): ConnPage | null
```

```Core/Pages/editorHost.tsx diff
@@ pickTree @@
-      return s.tree ? pagePickTree(s.tree, personalizationOf(s).defaultIcons, (p) => p.title) : []
+      return s.tree ? pagePickTree(s.tree, personalizationOf(s).defaultIcons, (p) => p.path) : []
@@ pageTitle @@
-    pageTitle: () => (pageId && pageOf(pageId)?.title) ?? null,
+    page: () => (pageId && pageOf(pageId)) ?? null,
```

```Core/MarkdownPM/Menus/gripMenu.ts diff
@@ embedPickTree @@
 export function embedPickTree(
   nodes: readonly PickItem<string>[],
   exclude: ReadonlySet<string>,
+  name: (path: string) => string,
 ): PickItem<string>[] {
   return nodes.flatMap((n) => {
-    if (n.pick === undefined) return [{ ...n, submenu: embedPickTree(n.submenu ?? [], exclude) }]
-    return expressibleInLink(n.pick) && !exclude.has(normalizeTitle(n.pick)) ? [n] : []
+    if (n.pick === undefined)
+      return [{ ...n, submenu: embedPickTree(n.submenu ?? [], exclude, name) }]
+    return expressibleInLink(name(n.pick)) && !exclude.has(n.pick) ? [n] : []
   })
 }
@@ contextFor embed @@
+      const index = host.connections()?.index
+      const name = (path: string): string => index?.writtenName(path) ?? titleFromPath(path)
       return {
         kind: 'embed',
-        tree: embedPickTree(host.pickTree(), embedExclusions(view.state)),
+        tree: embedPickTree(host.pickTree(), embedExclusions(view.state), name),
@@ heading grip @@
-  const title = host.pageTitle()
-  const linkable = title !== null
+  const page = host.page()
+  const linkable = page !== null
   …
-      else if (action === COPY_LINK_ROW.action && title !== null)
+      else if (action === COPY_LINK_ROW.action && page !== null)
         void host.clipboard.write(
-          pageLinkText({ title, heading: parts.content.trim() || undefined }, 'wiki'),
+          pageLinkText(
+            {
+              title: host.connections()?.index.writtenName(page.path) ?? page.title,
+              heading: parts.content.trim() || undefined,
+            },
+            'wiki',
+          ),
         )
@@ embed source pick @@
-      const title = arg('source:')
+      const path = arg('source:')
       …
-      if (title !== undefined) {
+      if (path !== undefined) {
+        const index = host.connections()?.index
         view.dispatch({
-          changes: { from: block.from, to: block.to, insert: pageEmbedText(title) },
+          changes: {
+            from: block.from,
+            to: block.to,
+            insert: pageEmbedText(index?.writtenName(path) ?? titleFromPath(path)),
+          },
```

```Core/MarkdownPM/Embeds/embedWidget.tsx diff
@@ embedExclusions @@
-  for (const t of embedTileRanges(state)) if (t.kind === 'page') out.add(normalizeTitle(t.title))
-  for (const a of host.ancestors) out.add(normalizeTitle(titleFromPath(a)))
+  for (const t of embedTileRanges(state)) if (t.kind === 'page') out.add(t.path)
+  for (const a of host.ancestors) out.add(a)
```

```Core/MarkdownPM/Links/headingRenameSettle.ts diff
@@ rewrite @@
-        const keys = new Set([pageKey(host.pageTitle() ?? '')])
+        const page = host.page()
+        const index = host.connections()?.index
+        const keys = new Set(page && index ? index.namesOf(page.path) : [])
```

```Core/Interface/Menus/pageMenuActions.ts diff
@@ title:copylink @@
-      void dialer().ask('clipboard:write', pageLinkText({ title, heading: page.heading }, 'wiki'))
+      void dialer().ask(
+        'clipboard:write',
+        pageLinkText(
+          { title: s.tree ? pageIndexOf(s.tree).writtenName(path) : title, heading: page.heading },
+          'wiki',
+        ),
+      )
```

```Core/Properties/Cells/LinkCell.tsx diff
@@ showFullLink @@
           showFullLink && target.kind === 'page'
-            ? pageLinkText({ title: target.page.title, heading: target.heading }, 'wiki')
+            ? pageLinkText(
+                {
+                  title:
+                    api?.index.writtenName(target.page.path, namedPage(written)?.title) ??
+                    target.page.title,
+                  heading: target.heading,
+                },
+                'wiki',
+              )
             : raw
```

**VERIFY**

- [ ] The listed tests pass; `git grep -n "pageTitle" -- Core Desktop` finds only `WebTile`'s unrelated local.
- [ ] `pasteAsMenu.ts:100` and `pasteLink.ts:54` are unchanged and a pasted `[[Pommora/ClaudeMD]]` stays at depth two (a `pasteAsMenu` test).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Let the picker's page rows carry the page, write the written name on a pick, keep a heading the picked page holds, and close on a title that resolves.

**NOW:** `AcRow`'s page arm carries `pageId` and `value: p.title` (`autocomplete.ts:42-46,104-109`); `commitEdit`'s title arm writes `heading: undefined` (`:179`), so a re-aim drops every heading (`autocomplete.test.ts:294`); `autocompleteQuery` carries `title` for non-title parts only and no heading (`:99`), and `sameQuery` compares those fields (`acQuery.ts:17-28`). The close (`useConnectionAutocomplete.ts:118-119`) asks `found.length === 1 && normalizeTitle(found[0].value) === normalizeTitle(query)`, so `[[Notes]]` beside "Notes Archive" opens over a finished link today, and a path link's row value (its title) never equals its query. `headingMissing` is private to `connectionsApi.ts:25-33`. The pane keys rows by `pageId` (`AutocompletePane.tsx:96`).

**CHANGE**

- [ ] Write and watch fail: `connectionCommit.test.tsx`: a pick of one of two `Notes` writes `[[A/Notes|Notes]]` (or `[[A/Notes]]` under the no-alias ruling) and the caret rests past it; re-picking the same holder over `[[A/Notes|x]]` with Remove Title on keeps `x`; a pick over `[[Shared#Intro|A]]` keeps `#Intro` when the picked page holds `Intro` and drops it otherwise; the caret resting in a finished `[[Notes]]` beside "Notes Archive" opens nothing, in a finished `[[Pommora/ClaudeMD]]` opens nothing, and in an ambiguous `[[Notes]]` opens both holders with their trails; a heading `[[Page#Setup]]` beside `Setup 2` opens nothing. `autocomplete.test.ts:294` keeps its assertion and renames to "drops a heading the picked page lacks"; row assertions take `page` for `pageId`. `linkSettle.test.ts`: leaving `[[A/Notes|]]` writes `[[A/Notes]]`, the pipe dropped as for any wikilink, since Obsidian refills no emptied alias either.
- [ ] `autocomplete.ts`: `AcRow`'s page arm is `{ kind: 'page'; page: ConnPage; location }`; `pageRow` fills `page: p`; `AutocompleteQuery` gains `heading?: string` (the title part alone, its only reader) and `embed: boolean` (a `!` before the link), both from one `namedPage(readOccurrence(line, o))` read (the `title` stays for non-title parts); `commitEdit` takes `opts.heading` and the title arm writes `heading: open === 'heading' ? '' : opts.heading` and passes `embed` to `pageLinkText`, so a pick inside `![[` writes no alias, with `asMarkdown` checking the same heading.
- [ ] `acQuery.ts`: `sameQuery` compares `heading`.
- [ ] `connectionsApi.ts`: export `headingMissing`.
- [ ] `useConnectionAutocomplete.ts`: `lookup`'s title arm lists an ambiguous title's holders first (`conn.index.holders(q)`, B-4 stated directly, so `[[Notes.md]]` with twins lists both) and the prefix candidates after them; `commit` computes `name` (`conn.index.writtenName(row.page.path)` for a page row, else `row.value`) and `keptHeading` (the query's heading when the picked page holds it and the pick isn't sliding into headings, through `headingMissing`), passes both to `commitEdit` and the kept-shown check so the check describes the link as written, and reads `row.page.id`; the close asks, for the title part, `conn.index.resolve(query).status === 'resolved'` before any lookup, and for the other parts whether some row equals the query; the comment at `:110` says a finished link opens nothing and an ambiguous title stays open by rule.
- [ ] `AutocompletePane.tsx:96`: `row.page.id`.

**AFTER**

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
@@ AcRow @@
 export type AcRow = { value: string } & (
-  | { kind: 'page'; pageId: string; location: TrailSegment[] }
+  | { kind: 'page'; page: ConnPage; location: TrailSegment[] }
@@ AutocompleteQuery @@
   title?: string
+  /** The link's written heading, where it names one, for a title pick to keep when the picked page holds it. */
+  heading?: string
   shown?: string
@@ autocompleteQuery @@
   const shown = o.shown ? line.slice(o.shown[0], o.shown[1]).trim() : ''
+  const named = namedPage(readOccurrence(line, o))
   return {
     …
-    ...(part === 'title' ? {} : { title: namedPage(readOccurrence(line, o))?.title ?? '' }),
+    ...(part === 'title' ? {} : { title: named?.title ?? '' }),
+    ...(named?.heading ? { heading: named.heading } : {}),
@@ pageRow @@
 export const pageRow = (p: ConnPage, host: EditorHost): AcRow => ({
   kind: 'page',
   value: p.title,
-  pageId: p.id,
+  page: p,
   location: host.location(p.id),
 })
@@ commitEdit @@
 export function commitEdit(
   ac: AutocompleteQuery,
   value: string,
-  opts: { kept?: string; openAlias?: boolean; openHeading?: boolean },
+  opts: { kept?: string; heading?: string; openAlias?: boolean; openHeading?: boolean },
 ): { changes: TextEdit[]; anchor: number } {
   …
     case 'title': {
       const open = opts.openHeading ? 'heading' : opts.openAlias ? 'shown' : undefined
-      // Opening a slot writes it empty; a link written in markdown keeps an empty label when opening its heading, for the heading pick to fill, since the label's default is drawn, not written.
-      const asMarkdown = !(syntax === 'wiki' && spellsAsWiki({ title: value, shown: opts.kept }))
+      // Opening a slot writes it empty; a link written in markdown keeps an empty label when opening its heading, for the heading pick to fill, since the label's default is drawn, not written. A heading the picked page holds rides along; one it lacks is dropped.
+      const heading = open === 'heading' ? '' : opts.heading
+      const asMarkdown = !(syntax === 'wiki' && spellsAsWiki({ title: value, heading, shown: opts.kept }))
       const shown =
         open === 'shown' ? '' : (opts.kept ?? (open === 'heading' && asMarkdown ? '' : undefined))
-      return whole({ title: value, heading: open === 'heading' ? '' : undefined, shown }, open)
+      return whole({ title: value, heading, shown }, open)
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
@@ candidates @@
-  // A query that names its one match exactly is a finished link, so the caret resting in one opens nothing; Back is the exception.
+  // A finished link opens nothing: a title that resolves (an ambiguous one stays open, for the pick that settles it), a heading its outline holds, or an alias the page remembers; Back is the exception.
   const candidates = useMemo(() => {
     if (query === null) return []
+    const q = normalizeTitle(query)
+    const finished = closed && q !== normalizeTitle(backedTo ?? '')
+    if (finished && part === 'title' && host.connections()?.index.resolve(query).status === 'resolved')
+      return []
     const found = heading
       ? query === ''
         ? openHeadingRows(allHeadingRows, collapsed)
         : allHeadingRows
       : lookup(query)
-    const exact = found.length === 1 && normalizeTitle(found[0].value) === normalizeTitle(query)
-    if (exact && closed && normalizeTitle(query) !== normalizeTitle(backedTo ?? '')) return []
+    if (finished && part !== 'title' && found.some((r) => normalizeTitle(r.value) === q)) return []
     return found
   }, [query, closed, part, page, host, aliasEpoch, heading, allHeadingRows, collapsed, backedTo])
@@ commit @@
     const settings = host.settings()
     const conn = host.connections()
+    // A page row writes the page's written name, and keeps the link's heading where that page holds it.
+    const name = row.kind === 'page' ? (conn?.index.writtenName(row.page.path) ?? row.value) : row.value
+    const heading =
+      row.kind === 'page' &&
+      ac.heading &&
+      !headingMissing(conn, { kind: 'page', page: row.page, heading: ac.heading }, undefined)
+        ? ac.heading
+        : undefined
     // How the link read before this edit began decides whether its shown text survives a re-aim, of its title or its heading.
     const kept =
       …
           {
             kind: 'page',
             syntax: ac.syntax === 'markdown' ? 'markdown' : 'wiki',
-            title: ac.part === 'heading' ? (ac.title ?? '') : row.value,
-            heading: ac.part === 'heading' ? row.value : undefined,
+            title: ac.part === 'heading' ? (ac.title ?? '') : name,
+            heading: ac.part === 'heading' ? row.value : heading,
           },
       …
-    const pageId = row.kind === 'page' ? row.pageId : ac.title ? page?.id : undefined
+    const pageId = row.kind === 'page' ? row.page.id : ac.title ? page?.id : undefined
     …
-    const { changes, anchor } = commitEdit(ac, row.value, {
+    const { changes, anchor } = commitEdit(ac, name, {
       kept,
+      heading,
       openAlias,
       openHeading: opts.openHeading,
     })
```

```Core/MarkdownPM/Autocomplete/acQuery.ts diff
@@ sameQuery @@
   a.title === b.title &&
+  a.heading === b.heading &&
   a.shown === b.shown
```

**VERIFY**

- [ ] The listed tests pass; `connectionCommit.test.tsx:163-172` ("a sole suggestion identical to what is written opens no panel") still passes through the resolve close.
- [ ] Live, in `~/Test` with two same-titled pages: a pick writes the path form and the link draws its title; the caret in a finished path link opens nothing; a click into an ambiguous `[[Notes]]`'s title lists both holders with trails and a pick resolves it; `[[A/Notes#Intro|A]]` re-aimed at a holder with `Intro` keeps it.
- [ ] Run the gates, then `view-delta` for Phase 3.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: every producer of page link text in `Core/` and `Desktop/` goes through `writtenName` or keeps a written form (`git grep -n "pageLinkText\|pageEmbedText\|resolvedTarget" -- Core Desktop`); no site collapses a `ConnPage` to `.title` to write a link; the picker's close, the kept heading, and the written name agree with Remove Title's `keepsShown` (one target shape in the check and the write); `EditorHost` has one page accessor; the embed exclusions and the pick tree key by one thing (path).

---

### Phase 4 — One Search

**GOAL:** Every search the app has matches one way, by an item's name or its location, through one matcher in `Core/Paths/caseFold.ts`, with each surface keeping its own order (D-1, D-2, D-4); match highlighting leaves first as its own task, so a reversal at ratification leaves the matcher untouched (D-6); icon search and filter rules stay their own (D-3, D-5). Typing a folder narrows the picker as it narrows every other search, which the click rule needs (C-6).

#### Task 4-1

**TASK:** Remove match highlighting everywhere, and turn the alias list's `match` count into the typed query it gates on.

**NOW:** `emphasizeMatch(label, at, len)` (`UIX/Menus/MenuRows.tsx:30-40`, styled by `matchText` at `menu-row.css.ts:156`, exported at `UIX/Menus/index.ts:15`) bolds a prefix run in the picker's page and heading rows (`AutocompletePane.tsx:12,87,126,135,192`), the block menu's rows (`BlockMenuPane.tsx:7,29,47`, fed by `BlockMenuRow.at` from `matchAt`, `Core/Actions/blockMenu.ts:21,85-88,101`), and the alias list (`AliasList.tsx:176`), whose `match` number also gates its entrance (`:56`), its pending-pick reset (`:64`), and its drag (`:127`). The sidebar, the Trash, and views never highlighted.

**CHANGE**

- [ ] `aliasPicker.test.tsx`: add: typing `e` after clicking "the plan" within the pick window drops the pending pick (the list's query changed, its rows didn't). `blockMenu.test.ts`: every `at` assertion goes. `blockMenuFlow.test.tsx:6,56,225+`: the emphasis assertions go. Watch the alias case fail.
- [ ] Delete `emphasizeMatch`, its export, and `matchText`.
- [ ] `blockMenu.ts`: `BlockMenuMatch.rows` is `readonly LeafItem<BlockMenuAction>[]`; `filterBlockMenu` pushes `row` as is; `BlockMenuRow` goes (`matchAt` stays for Task 4-2 to replace).
- [ ] `AutocompletePane.tsx`: the rows draw `row.value`; `matchLen` goes; the alias list takes `query={v.ac.query}`.
- [ ] `BlockMenuPane.tsx`: the row draws `row.label`; `matchLen` goes.
- [ ] `AliasList.tsx`: `match = 0` becomes `query = ''`; entrance is ready when `query === ''`, the pending-pick effect depends on `[listed, query]`, drag is disabled while `query !== ''`, and the `RenamableLabel` self-closes (its function-children overload stays for `DetailTitleHeader.tsx:127`).

**AFTER**

```UIX/Menus/MenuRows.tsx diff
@@ emphasizeMatch @@
-/** A searched row's label with the typed match drawn emphasized; `at` is where the matcher found it. */
-export function emphasizeMatch(label: string, at: number | null, len: number): ReactNode {
-  if (at === null || len === 0) return label
-  return (
-    <>
-      {label.slice(0, at)}
-      <span className={s.matchText}>{label.slice(at, at + len)}</span>
-      {label.slice(at + len)}
-    </>
-  )
-}
```

```Core/Actions/blockMenu.ts diff
-type BlockMenuRow = LeafItem<BlockMenuAction> & { at: number | null }
-
 export interface BlockMenuMatch {
   title: string
-  rows: readonly BlockMenuRow[]
+  rows: readonly LeafItem<BlockMenuAction>[]
 }
@@ filterBlockMenu @@
-    const rows: BlockMenuRow[] = []
-    for (const row of s.rows) {
-      const at = matchAt(row.label, q)
-      if (titleAt !== null || at !== null) rows.push({ ...row, at })
-    }
+    const rows = s.rows.filter((row) => titleAt !== null || matchAt(row.label, q) !== null)
```

```Core/MarkdownPM/Autocomplete/AliasList.tsx diff
-  match = 0,
+  query = '',
   …
-  match?: number
+  /** What the slot's caret has typed; a filtered list neither enters nor drags. */
+  query?: string
   …
-  const entering = useEntrance(list.rows, (r) => r.key, match === 0)
+  const entering = useEntrance(list.rows, (r) => r.key, query === '')
   …
-  useEffect(() => () => window.clearTimeout(pick.current), [listed, match])
+  useEffect(() => () => window.clearTimeout(pick.current), [listed, query])
   …
-          disabled: match > 0 || renaming !== null || list.drafting,
+          disabled: query !== '' || renaming !== null || list.drafting,
   …
-                >
-                  {(shown) => emphasizeMatch(shown, 0, match)}
-                </RenamableLabel>
+                />
```

**VERIFY**

- [ ] `git grep -n "emphasizeMatch\|matchText\|matchLen" -- Core UIX` finds nothing; the listed tests pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** Give `caseFold.ts` the one matcher (a `MatchKey` of a folded name and an optional folded place, a `matchQuery` that folds a typed `/` to a word break, and a `matchScore(key, q)` that takes the better of the two scores) and fold every search onto it in the same task, since the matcher's new shape and its eight callers can't pass the gates apart: each site builds its key where it already builds its rows and keeps its own order.

**NOW:** `matchScore(t, q)` (`caseFold.ts:28-46`) scores one folded string, greedy, with a bonus at a word start after `' '`; `rankMatches` (`:50-74`) ranks items by a score with `compareTitles` on ties. Every site folds its own query (`foldKey(query.trim())`, eight times) and most score a title alone. Scoring one joined "place name" string drags title ranking down (an exact `Journal/Notes` scores 13.87 against a scattered root `Footnotes` at 18.91), so two scores are needed to keep today's title ranking while reaching through a location.

**CHANGE**

- [ ] `caseFold.test.ts`: `matchScore(matchKey('Notes', 'Journal'), 'notes')` equals `matchScore(matchKey('Notes'), 'notes')`; `matchScore(matchKey('ClaudeMD', 'Studio/Pommora'), matchQuery('Pommora/Cl'))` is non-null while `matchKey('ClaudeMD', 'Studio/Sapphire')` misses; `matchQuery('/Studio/Pommora')` has no leading space; an empty query scores every key. Watch them fail.
- [ ] Rename today's scorer to a private `foldedScore` (`scoreOf` is already `rankMatches`'s parameter); add `MatchKey`, `matchQuery`, `matchKey`, and the new `matchScore`.

**AFTER**

```Core/Paths/caseFold.ts diff
-export function matchScore(t: string, q: string): number | null {
+function foldedScore(t: string, q: string): number | null {
   let ti = 0
   …
   return score - t.length * 0.01
 }
+
+/** What a search matches an item by: its folded name, and its folded location where it has one (its place and its name, every `/` and space a word break). */
+export interface MatchKey {
+  name: string
+  place?: string
+}
+
+/** A typed query folded as a key is, a `/` read as a word break, so `Pommora/Cl` and `pommora cl` ask the same; the fold runs before the trim, so a leading `/` leaves no leading space. */
+export const matchQuery = (raw: string): string => foldKey(raw.replaceAll('/', ' ').trim())
+
+export const matchKey = (name: string, place = ''): MatchKey =>
+  place ? { name: foldKey(name), place: matchQuery(`${place}/${name}`) } : { name: foldKey(name) }
+
+/** The better of the name's score and the location's: a plain title query ranks as the name alone does (the greedy scan would land its first letter in the place otherwise), and a folder query reaches through the location. Null where neither matches; an empty query matches every key. */
+export function matchScore(key: MatchKey, q: string): number | null {
+  const name = foldedScore(key.name, q)
+  const place = key.place === undefined ? null : foldedScore(key.place, q)
+  return name === null ? place : place === null ? name : Math.max(name, place)
+}
```

**THE SITES**

**NOW:** `PageIndex.candidates` (`pageIndex.ts:54-67`) prefix-filters a lazily sorted title list and sorts exact-first then shortest. `filterNav` (`navSearch.ts:12-15`) ranks `searchEntriesOf`'s `folded` titles (`treeIndex.ts:146-170`). The Trash's `filterRows` (`TrashFrame.tsx:51-58`) scores title and crumbs separately and takes the higher, folding both per keystroke. `headingRows` and `aliasRows` (`autocomplete.ts:111-122,139-150`) prefix-match. `LocationField.narrowed` (`LocationField.tsx:22-32,106`) folds each folder title per keystroke. A view's `searchGroups` (`Pipeline/search.ts`) reads a title map built at search start (`useViewHost.ts:54,89-92`). The block menu's `filterBlockMenu` (`blockMenu.ts:85-106`) substring-matches with `toLowerCase` and no NFC, a matching section keeping every row.

**CHANGE**

- [ ] Write and watch fail: `pageIndex.test.ts:44-60` renamed (ranked, not prefix) and gaining "`Pommora/Cl` finds `Studio/Pommora/ClaudeMD` and not `Studio/Sapphire/ClaudeMD`", "an exact title ranks first", "two holders of one title both appear under a plain query"; `navSearch.test.ts:35-38` and `treeIndex.test.ts:101` take `match` for `folded` and gain a parent-folder query; `TrashFrame.test.tsx` gains `notes/alpha`; `search.test.ts:9` takes a `MatchKey` map and gains a set-chain query; `autocomplete.test.ts:536-545` renamed (fuzzy) with `nts` finding `Notes`; `blockMenu.test.ts:53-115` `hea` and `bl` counts updated (`hr` now finds Horizontal Rule); a `LocationField` case where `parent/child` narrows.
- [ ] `pageIndex.ts`: the lazy list carries `{ p, title: p.title, key: matchKey(p.title, relDirname(p.path)) }`; `candidates` ranks it with `rankMatches(…, limit)` under `matchQuery(query)` and keeps the empty-query alphabetical browse; the `:33` comment says the keys are built on the first `candidates` call.
- [ ] `navSearch.ts`: `SearchEntry.folded` becomes `match: MatchKey`; `filterNav` ranks on `matchScore(e.match, matchQuery(query))`. `treeIndex.ts` builds `match: matchKey(r.title, r.parents.map((p) => p.title).join('/'))`.
- [ ] `TrashFrame.tsx` `filterRows`: `rankMatches(rows, (row) => matchScore(matchKey(row.title, row.crumbs.map((c) => c.title).join('/')), q))` under `matchQuery`.
- [ ] `autocomplete.ts`: `headingRows` and `aliasRows` filter on `matchScore(matchKey(text), matchQuery(query)) !== null`, keeping the outline's order and dedupe and the remembered order.
- [ ] `LocationField.tsx`: `narrowed`'s walk threads `place` (the ancestors' titles joined by `/`) and matches `matchScore(matchKey(n.title, place), q) !== null`; the draft folds through `matchQuery`.
- [ ] `useViewHost.ts`: `needle = matchQuery(query ?? '')`; the map becomes `Map<string, MatchKey>` with `matchKey(r.title, relDirname(r.path).slice(source.path.length + 1))`, the Set chain below the source (every row shares the source's own name, which would otherwise keep every row). `search.ts`: `searchGroups(groups, needle, keys)` keeps a row when its key exists and scores.
- [ ] `blockMenu.ts`: `filterBlockMenu` keeps a row when `matchScore(matchKey(row.label, s.title), matchQuery(query)) !== null` (a matching section title still keeps its rows, since a subsequence of the title is one of the key); `matchAt` goes.
- [ ] Every `foldKey(query.trim())` at these sites goes; unused `foldKey`/`normalizeTitle` imports go.

**AFTER**

```Core/Connections/pageIndex.ts diff
@@ imports @@
-import { compareTitles, normalizeTitle } from '../Paths/caseFold'
-import { stripMarkdownExt } from '../Paths/posix'
+import { compareTitles, type MatchKey, matchKey, matchQuery, matchScore, normalizeTitle, rankMatches } from '../Paths/caseFold'
+import { relDirname, stripMarkdownExt } from '../Paths/posix'
@@ buildPageIndex @@
-  // Titles key ONCE at build — candidates() runs per autocomplete keystroke. Paths key per resolve instead, over a title's few holders, so a build costs nothing more.
+  // Titles key ONCE at build — candidates() runs per autocomplete keystroke, over match keys built on its first call. Paths key per resolve, over a title's few holders, so a build costs nothing more.
   …
-  // Sorted on the first autocomplete, not at build: the index rebuilds whenever the pages change, and most builds (the host's always) never reach a picker.
-  let alphabetical: typeof entries | null = null
+  // Sorted and keyed on the first autocomplete, not at build: the index rebuilds whenever the pages change, and most builds (the host's always) never reach a picker.
+  let alphabetical: { p: ConnPage; title: string; key: MatchKey }[] | null = null
   …
     candidates(query, limit = 20) {
-      alphabetical ??= [...entries].sort((a, b) => compareTitles(a.p.title, b.p.title))
-      const q = normalizeTitle(query)
+      alphabetical ??= pages
+        .map((p) => ({ p, title: p.title, key: matchKey(p.title, relDirname(p.path)) }))
+        .sort((a, b) => compareTitles(a.title, b.title))
+      const q = matchQuery(query)
       // An empty query browses the whole index alphabetically, as an empty `[[` or `[label](` lists.
       if (!q) return alphabetical.slice(0, limit).map((x) => x.p)
-      return alphabetical
-        .filter((x) => x.norm.startsWith(q))
-        .sort(
-          (a, b) =>
-            (a.norm === q ? 0 : 1) - (b.norm === q ? 0 : 1) || a.p.title.length - b.p.title.length,
-        )
-        .slice(0, limit)
-        .map((x) => x.p)
+      return rankMatches(alphabetical, (x) => matchScore(x.key, q), limit).map((x) => x.p)
     },
```

```Core/Navigation/navSearch.ts diff
-import { foldKey, matchScore, rankMatches } from '../Paths/caseFold'
+import { type MatchKey, matchQuery, matchScore, rankMatches } from '../Paths/caseFold'
 …
-  /** Folded once at build — filterNav scores EVERY entry on every keystroke. */
-  folded: string
+  /** Keyed once at build — filterNav scores EVERY entry on every keystroke. */
+  match: MatchKey
 }
 
 export function filterNav(index: SearchEntry[], query: string): SearchEntry[] {
-  const q = foldKey(query.trim())
-  return q ? rankMatches(index, (e) => matchScore(e.folded, q), 50) : []
+  const q = matchQuery(query)
+  return q ? rankMatches(index, (e) => matchScore(e.match, q), 50) : []
 }
```

```Core/Nexus/treeIndex.ts diff
@@ searchEntriesOf @@
-        folded: foldKey(r.title),
+        match: matchKey(r.title, r.parents.map((p) => p.title).join('/')),
```

```Core/Settings/TrashFrame.tsx diff
 export function filterRows(rows: TrashRow[], query: string): TrashRow[] {
-  const q = foldKey(query.trim())
+  const q = matchQuery(query)
   if (!q) return rows
-  return rankMatches(rows, (row) => {
-    const title = matchScore(foldKey(row.title), q)
-    const place = matchScore(foldKey(row.crumbs.map((c) => c.title).join(' ')), q)
-    return title === null ? place : place === null ? title : Math.max(title, place)
-  })
+  return rankMatches(rows, (row) =>
+    matchScore(matchKey(row.title, row.crumbs.map((c) => c.title).join('/')), q),
+  )
 }
```

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
@@ headingRows @@
-  const q = normalizeTitle(query)
+  const q = matchQuery(query)
   const seen = new Set<string>()
   return outline
     .filter((h) => {
       const key = normalizeTitle(h.text)
-      if (!key.startsWith(q) || seen.has(key)) return false
+      if (matchScore(matchKey(h.text), q) === null || seen.has(key)) return false
@@ aliasRows @@
-  const q = normalizeTitle(query)
+  const q = matchQuery(query)
   return aliases
     .list(pageId)
-    .filter((a) => normalizeTitle(a).startsWith(q))
+    .filter((a) => matchScore(matchKey(a), q) !== null)
```

```Core/Views/Settings/LocationField.tsx diff
 function narrowed(nodes: Folder[], query: string): { nodes: Folder[]; leads: Set<string> } {
   const leads = new Set<string>()
-  const walk = <N extends Folder>(ns: N[]): N[] =>
+  const walk = <N extends Folder>(ns: N[], place: string): N[] =>
     ns.flatMap((n) => {
-      const sets = walk(n.sets ?? [])
+      const sets = walk(n.sets ?? [], place ? `${place}/${n.title}` : n.title)
       if (sets.length > 0) leads.add(n.id)
-      if (matchScore(foldKey(n.title), query) !== null) return [n]
+      if (matchScore(matchKey(n.title, place), query) !== null) return [n]
       return sets.length > 0 ? [{ ...n, sets }] : []
     })
-  return { nodes: walk(nodes), leads }
+  return { nodes: walk(nodes, ''), leads }
 }
 …
-  const q = foldKey(draft.trim())
+  const q = matchQuery(draft)
```

```Core/Views/Host/useViewHost.ts diff
-  const needle = foldKey(query?.trim() ?? '')
+  const needle = matchQuery(query ?? '')
 …
-  const titles = useMemo(
-    () => (searching ? new Map(rows.map((r) => [r.id, foldKey(r.title)])) : null),
-    [rows, searching],
-  )
+  // A row's place is the Set chain below the view's own source: every row shares the source's name, which would otherwise keep them all.
+  const keys = useMemo(
+    () =>
+      searching
+        ? new Map(
+            rows.map((r) => [
+              r.id,
+              matchKey(r.title, relDirname(r.path).slice(source.path.length + 1)),
+            ]),
+          )
+        : null,
+    [rows, searching, source.path],
+  )
   const groups = useMemo(
-    () => (titles ? searchGroups(resolvedGroups, needle, titles) : resolvedGroups),
-    [resolvedGroups, needle, titles],
+    () => (keys ? searchGroups(resolvedGroups, needle, keys) : resolvedGroups),
+    [resolvedGroups, needle, keys],
   )
```

```Core/Views/Pipeline/search.ts diff
-import { matchScore } from '../../Paths/caseFold'
+import { type MatchKey, matchScore } from '../../Paths/caseFold'
 …
 export function searchGroups(
   groups: ResolvedGroup[],
   needle: string,
-  titles: Map<string, string>,
+  keys: Map<string, MatchKey>,
 ): ResolvedGroup[] {
   return groups.flatMap((group) => {
-    const items = group.items.filter((row) => matchScore(titles.get(row.id) ?? '', needle) !== null)
-    const children = group.children && searchGroups(group.children, needle, titles)
+    const items = group.items.filter((row) => {
+      const key = keys.get(row.id)
+      return key !== undefined && matchScore(key, needle) !== null
+    })
+    const children = group.children && searchGroups(group.children, needle, keys)
```

```Core/Actions/blockMenu.ts diff
-function matchAt(label: string, query: string): number | null {
-  const at = label.toLowerCase().indexOf(query)
-  return at === -1 ? null : at
-}
-
 export function filterBlockMenu(
   sections: readonly BlockMenuSection[],
   query: string,
 ): BlockMenuMatch[] {
-  const q = query.toLowerCase()
+  const q = matchQuery(query)
   const out: BlockMenuMatch[] = []
   for (const s of sections) {
-    const titleAt = matchAt(s.title, q)
-    const rows = s.rows.filter((row) => titleAt !== null || matchAt(row.label, q) !== null)
+    // The section is the row's place, so a query naming the section keeps every row in it.
+    const rows = s.rows.filter((row) => matchScore(matchKey(row.label, s.title), q) !== null)
     if (rows.length > 0) out.push({ title: s.title, rows })
   }
```

**VERIFY**

- [ ] The listed tests pass; `git grep -n "foldKey(query\|foldKey(draft\|startsWith(q)" -- Core` finds no search site.
- [ ] Nothing new runs on a caret move: `sameQuery` keeps the query's identity (`acQuery.ts:17-28`), the hook bails on an unchanged query (`useConnectionAutocomplete.ts:59-60`), `candidates` memos on the query string, and the block field filters only on a doc change (`blockQuery.ts:36`); read each and confirm.
- [ ] Live, in `~/Test`: `[[Pommora/Cl` lists `Studio/Pommora/ClaudeMD` and not Sapphire's; the sidebar, Trash, and a view narrow by folder; an ambiguous `[[ClaudeMD]]`'s two holders both show inside the picker's 20 rows; after picking one of two `Notes` and sliding into its headings, Back relists its holder (`[[A/Notes]]` matched by location, a Phase 3 gap this matcher closes); `/hr` in a body lists Horizontal Rule.
- [ ] Run the gates, then `view-delta` for Phase 4.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: every type-to-filter in `Core/` and `UIX/` goes through `matchScore(key, q)` except `searchIcons` (D-3) and a view's filter rules (D-5); no site folds its own query; every ranked surface ranks and every structural surface keeps its order; keys are built where the rows are built, never per keystroke where a memo exists, and the picker's are lazy; the alias list's drag gate survives without highlighting.

---

### Phase 5 — The Click Rule

**GOAL:** A click on an unresolved link, phantom or ambiguous, in either syntax and on every surface, seats the caret in the link's title so the picker opens on it (C-1), as one more arm of the link-slot seat channel Rename and Edit Title already ride (C-2); a resting Text value keeps its two clicks, the second following the rule (C-3); Edit Link selects the target in a Link value's field as it does in a body (C-4). Nothing changes for a resolved link. This phase lands after picks write paths and the search fold (C-6), since the seat is useless before them.

#### Task 5-1

**TASK:** Add the `seatTitle` arm to `linkEdit`, give the pointer path an optional `seat` with a strict-interior exception, and let `linkClicks` seat every unresolved link the press lands on text or anywhere on a phantom's visible syntax.

**NOW:** `linkEdit` (`Core/MarkdownPM/Links/linkEdit.ts:23-54`) returns `select` for `rename` and `editLink`, applied by `applyLinkAction` (`:73-90`) through `focusRange`. `pointerHandlers`' mousedown (`Gestures/pointerPath.ts:41-55`) reads `editingOnPress = caretInside(view, hit.range)`, an end-inclusive test (`:7-10`), seats a clamped press at the nearer edge, and lets a follow run on click; an unresolved hit has no follow (`linkClicks.ts:110-111`), so the press falls to CodeMirror. `linkUnder`'s `onText` selector (`:63-65`) names resolved, ambiguous, heading-symbol, and web classes, not `.md-connection-phantom`, and `hidesSyntax` is false for a phantom (`:71`). `linkEdges.test.tsx:153-192` pins "a link that leads nowhere still takes the caret where it was pressed".

**CHANGE**

- [ ] Rewrite `linkEdges.test.tsx:153-192` and watch it fail: a press on a phantom `[[Zeta]]`'s text (dispatched on `.md-connection-phantom`) seats 8, the title's end; a press on its bracket seats 8; a press on an ambiguous `[[Beta]]`'s text seats 8; a press clamped in beside it still seats the nearer edge, 10 (`:184` unchanged); with the caret already at 6 inside `[[Beta]]` and the editor focused, a press on its text lands where pressed; a press on a resolved link follows as before.
- [ ] `linkEdit.ts`: `export type SlotAction = LinkAction | 'seatTitle'`; `linkEdit` and `applyLinkAction` take `SlotAction`; the arm `case 'seatTitle': return { kind: 'select', range: [tk.link.title[1], tk.link.title[1]] }` (the end: any spot gives the same query, since the query reads the whole slot, and backspace narrows).
- [ ] `pointerPath.ts`: `PointerSpec` gains `seat?: (hit: H, view: EditorView) => boolean`; mousedown runs it after the right-press return and the double-click refusal, unless the caret is strictly inside the link (`view.hasFocus && head > range[0] && head < range[1]`), and claims the press when it acts. `caretInside` keeps its inclusive ends for follow, dwell, and the menu.
- [ ] `linkClicks.ts`: the selector gains `.md-connection-phantom`; `seat` applies `seatTitle` when the hit has a token, its target is unresolved, and the press is on text or on a phantom (whose syntax is visible); follow, dwell, and menu are untouched.

**AFTER**

```Core/MarkdownPM/Links/linkEdit.ts diff
+/** The seats a link's slots take: the menu's actions, and the title seat a press on an unresolved link lands. */
+export type SlotAction = LinkAction | 'seatTitle'
+
 export function linkEdit(
   text: string,
   tk: TokenOf<LinkKind>,
-  action: LinkAction,
+  action: SlotAction,
   titles: Pick<EditorHost['linkTitles'], 'get'>,
 ): LinkEdit | null {
   const [s, e] = tk.range
   const [cs, ce] = tk.contentRange
   switch (action) {
+    // The title's end: the picker reads the whole slot wherever the caret sits, and backspace narrows from the end.
+    case 'seatTitle':
+      return { kind: 'select', range: [tk.link.title[1], tk.link.title[1]] }
     case 'rename': {
@@ applyLinkAction @@
-export function applyLinkAction(view: EditorView, action: LinkAction, range: Span): void {
+export function applyLinkAction(view: EditorView, action: SlotAction, range: Span): void {
```

```Core/MarkdownPM/Gestures/pointerPath.ts diff
 interface PointerSpec<H extends PointerTarget> {
   hoverGate: string
   hitAt: (view: EditorView, event: MouseEvent) => H | null
   follow: (hit: H, view: EditorView, event: MouseEvent) => (() => void) | null
+  /** Where a press lands before anything else: a seat the hit itself asks for, reporting whether it acted. */
+  seat?: (hit: H, view: EditorView) => boolean
@@ mousedown @@
       if (event.button === 2) return go != null
       if (event.button !== 0 || event.shiftKey || event.detail > 1) return false
+      // A link the caret is already strictly inside is being edited, and a press lands where it lands; a caret resting at the link's edge, where a field opens, isn't inside it.
+      const head = view.state.selection.main.head
+      const inside = view.hasFocus && head > hit.range[0] && head < hit.range[1]
+      if (!inside && spec.seat?.(hit, view)) {
+        event.preventDefault()
+        return true
+      }
       // A press that missed the drawn text but clamped inside belongs outside — the zero-width marker that made the coordinate land here would drop the caret inside a label the pointer never touched.
```

```Core/MarkdownPM/Links/linkClicks.ts diff
@@ linkUnder @@
   const el = (event.target as HTMLElement).closest?.(
-    '.md-connection-resolved, .md-connection-ambiguous, .md-heading-symbol, .md-link',
+    '.md-connection-resolved, .md-connection-ambiguous, .md-connection-phantom, .md-heading-symbol, .md-link',
   )
@@ linkPointer @@
     hitAt: (view, event) => linkUnder(view, apiOf(view), event),
+    // An unresolved link seats its title, so the picker opens on it: on its text, or anywhere on a phantom, whose syntax is visible; an ambiguous link hides its brackets, so a press beside its text stays a press beside it.
+    seat: (hit, view) => {
+      if (!hit.tk || hit.target.kind !== 'unresolved' || (!hit.onText && hit.hidesSyntax)) return false
+      applyLinkAction(view, 'seatTitle', hit.range)
+      return true
+    },
     follow: (hit, view, event) =>
```

**VERIFY**

- [ ] `linkEdges.test.tsx` passes, `:184` included; the resolved-link tests in the same file pass unchanged.
- [ ] After the seat, the picker opens with both holders of an ambiguous title (the selection transaction recomputes `acQuery`; `connectionCommit.test.tsx`'s ambiguous case from Task 3-2 covers the pane).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-2

**TASK:** Let a resting cell hand the title seat to the editor it opens, let a value field open in its title when its whole value is one unresolved link and with its target selected when Edit Link opened it, and let the picker's query recompute when a tile flips out of read-only.

**NOW:** A resting cell draws a phantom as three bare spans with no `data-link` (`cellStatic.tsx:149-165`), so `cellLinkTarget` never sees it; `claimLink` (`:462-469`) returns `followTarget`'s thunk only, and `applyAtRest` (`:444-452`) already lands a `select` through `onActivate({ kind: 'select' })`. `ValueEditor` (`Core/Properties/Pickers/ValueEditor.tsx:45,144-153`) seats Rename through `alias?: boolean` and otherwise opens with the caret at `doc.length`; `PropertyValueInput` passes `alias` (`:95`) from the three surfaces' popovers (`TableView.tsx:258`, `CardsView.tsx:494`, `PropertyPanel.tsx:542`), while the inline editor they open on the `edit` intent (`valueClick.ts:15,51`; `TableView.tsx:150,213`, `PropertyPanel.tsx:302,410`, `CardValue.tsx:91,144`) carries nothing about which action opened it. `acQuery`'s update returns early when neither the doc nor the selection changed (`acQuery.ts:51`), so a tile's read-only flip (an effects-only dispatch, `MarkdownEditor.tsx:272-274`) leaves a seated caret with no query.

**CHANGE**

- [ ] Write and watch fail: `cellStatic.test.tsx:201-220` lists the phantom's wrapper span; a resting-cell test: a click on a phantom activates with a `select` seat at its title's end. `PropertyValueInput.test.tsx`: an unresolved Link value opens with the caret at its title's end and the picker's query armed; Edit Link opens a resolved value with its target selected; a plain click still opens at the end (`:187` stays). A tile test: a seated caret in a tile flipping out of read-only arms the query.
- [ ] `cellStatic.tsx`: the phantom `Fragment` becomes a `span` with `linkSpan(s, e)` (no `data-at`; the inner `verbatim` spans keep their offsets); `applyAtRest` takes `SlotAction`; `claimLink` falls back to `() => void applyAtRest(tk, 'seatTitle')` when the hit has a token, its target is unresolved, and the cell isn't read-only.
- [ ] `valueClick.ts`: the `edit` intent gains `seat?: ConnEditAction`; `MENU_INTENTS.editLink` is `{ kind: 'edit', seat: 'editLink' }`.
- [ ] The three surfaces carry `intent.seat` into their editing state and pass `seat` to `PropertyValueInput`; their popovers pass `seat={def.type === 'link' ? 'rename' : undefined}` for `alias={def.type === 'link'}`. `PropertyValueInput`'s `alias?: boolean` becomes `seat?: ConnEditAction`, passed through; its doc comment says the field opens in the title of a value that is one unresolved link.
- [ ] `ValueEditor`: `alias?: boolean` becomes `seat?: ConnEditAction`; on mount, a `oneLine` value whose drawn link spans the whole text and resolves unresolved seats `seatTitle`; otherwise `seat` applies as Rename does today (a bare address under Rename still gains its label); otherwise the caret rests at the end.
- [ ] `acQuery.ts`: the early return also requires `tr.startState.readOnly === tr.state.readOnly`.

**AFTER**

```Core/MarkdownPM/Tables/cellStatic.tsx diff
@@ phantom @@
         if (look.status === 'phantom')
           return (
-            <Fragment key={key++}>
+            <span key={key++} {...linkSpan(s, e)}>
               <span className="md-phantom-syntax" {...verbatim(s, cs)}>
               …
-            </Fragment>
+            </span>
           )
@@ applyAtRest @@
-  const applyAtRest = async (tk: TokenOf<LinkKind>, action: LinkAction): Promise<void> => {
+  const applyAtRest = async (tk: TokenOf<LinkKind>, action: SlotAction): Promise<void> => {
@@ claimLink @@
-  // Following waits for the click so a drag that starts on a link selects instead.
+  // Following waits for the click so a drag that starts on a link selects instead; an unresolved link hands its title seat to the editor the activation opens, the one rule a live editor's press follows.
   const claimLink = (e: React.MouseEvent): (() => void) | null => {
     const found = linkAt(e)
-    const go = found && followTarget(found.target, host.connections(), e)
+    if (!found) return null
+    const { tk } = found
+    const go =
+      followTarget(found.target, host.connections(), e) ??
+      (tk && found.target.kind === 'unresolved' && !readOnly()
+        ? () => void applyAtRest(tk, 'seatTitle')
+        : null)
     if (!go) return null
```

```Core/Properties/Pickers/valueClick.ts diff
-  | { kind: 'edit' }
+  /** `seat` is the link slot the field opens in, carried from the action that opened it. */
+  | { kind: 'edit'; seat?: ConnEditAction }
 …
 const MENU_INTENTS: Partial<Record<CellMenuAction | LinkAction, ValueIntent>> = {
-  editLink: { kind: 'edit' },
+  editLink: { kind: 'edit', seat: 'editLink' },
```

```Core/Properties/Pickers/ValueEditor.tsx diff
-  /** Once mounted, seat the caret in the value's alias slot: the Link value's Rename. */
-  alias?: boolean
+  /** Once mounted, the link slot to seat the caret in: Rename's alias, Edit Link's target; a value that is one unresolved link seats its title whatever opened it. */
+  seat?: ConnEditAction
@@ mount @@
     const doc = view.state.doc.toString()
-    if (alias && drawnLinkAt(view, 0)) applyLinkAction(view, 'rename', [0, doc.length])
-    else if (alias) {
+    const tk = drawnLinkAt(view, 0)
+    const lone =
+      oneLine &&
+      tk?.range[0] === 0 &&
+      tk.range[1] === doc.length &&
+      resolveLink(readOccurrence(doc, tk.link), host.connections()?.index, holder).kind === 'unresolved'
+    const action: SlotAction | undefined = seat === 'rename' || !lone ? seat : 'seatTitle'
+    if (tk && action) applyLinkAction(view, action, [0, doc.length])
+    else if (seat === 'rename') {
       // A bare address draws no link token, so Rename gives it the label a markdown link has.
```

```Core/MarkdownPM/Autocomplete/acQuery.ts diff
-      if (!tr.docChanged && !tr.selection) return value
+      // A tile flipping out of read-only is the one change that arms a query with neither a doc nor a selection change: its press already seated the caret.
+      if (!tr.docChanged && !tr.selection && tr.startState.readOnly === tr.state.readOnly) return value
```

```Core/Views/Table/TableView.tsx diff
@@ editing state @@
-      edit: editAs('editor'),
+      edit: (intent) => setEditing({ rowId: row.id, colId: col.id, mode: 'editor', seat: intent.seat, nonce: ++editNonce.current }),
@@ inline editor @@
       <PropertyValueInput
+        seat={editing.seat}
@@ popover @@
-        alias={def.type === 'link'}
+        seat={def.type === 'link' ? 'rename' : undefined}
```

(`PropertyPanel.tsx` and `CardValue.tsx`/`CardsView.tsx` take the same two edits each; `PropertyValueInput` renames its prop and passes it on.)

**VERIFY**

- [ ] The listed tests pass; `ValueEditor.test.tsx:84` and `TextCell.test.tsx:112-135` still pass.
- [ ] Live, in `~/Test`: a click on a phantom in a resting table cell opens the cell with the caret in the title and the picker open; a Text value `see [[Nowhere|x]]` takes two clicks, the second landing in `Nowhere`; a Link value naming a shared title opens in its title with both holders listed; Edit Link on a resolved Link value opens with the target selected; a click on a markdown tile's phantom opens the picker.
- [ ] Run the gates, then `view-delta` for Phase 5.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: the seat rides `linkEdit` and its three appliers and nothing else; a resolved link's press, click, dwell, and menu are byte-for-byte unchanged in behavior; the strict-interior test lives in the seat clause alone; the `edit` intent's `seat` is the one way a slot reaches the field and `alias` is gone from every surface; the resting phantom's wrapper changes no CSS and `cellOffsetAt` still maps presses.

---

### Phase 6 — The In-App Re-Spell

**GOAL:** Every link that resolved to a page before a rename, a move, a folder rename or move, or a collision made inside the app resolves to the same page after, through one per-key decision the index owns and one map the cascade builds by comparing the index before and after (E-1, E-2, E-3); every such operation runs the re-spell inside the settle's own turn and returns the warning the renderer already shows (E-5, E-6); the heading cascade decides by a page's keys and the delete strips by what resolves to nothing after (E-7), which retires every title-equality test the host still has.

#### Task 6-1

**TASK:** Give the index `respell`, the one per-key decision, and a lazy first-wins `byId`; give the rewriter `respellings`, which builds a map from key to spelling by comparing the before and after indexes over the moved and arriving pages; and make `rewriteConnections` apply that map, with the follower writing a path wikilink whole so it gains its title alias, embeds excepted.

**NOW:** `rewriteConnections(body, oldTitle, newTitle)` (`rewrite.ts:21-28`) rewrites every hit whose `target` equals the old title's key, through `follower` (`:45-75`), which edits the title span in place and falls to the markdown form when a wikilink can't spell the result. Nothing compares a page's state before and after an event, so a move or a folder rename rewrites nothing, and a collision re-spells nothing. The tree's by-id map is `pagesByIdOf` (`record.ts:64-73`), first listed wins, beside the index that reads the same pages.

**CHANGE**

- [ ] Write and watch fail: `pageIndex.test.ts`: `respell('notes', q)` is null when `notes` still names `q` and its path's tail is unchanged; `'Notes'` when the page was renamed from `notes` (a case-only rename follows); `'A/Notes'` when a twin arrived and `notes` no longer names `q` alone; `'A/Plan'` for the key `a/notes` after a rename to `Plan`; null for a key whose depth reaches above a renamed folder when the tail is unchanged; with no `oldPath`, null exactly when the key still names the page; `byId` holds the first of two pages claiming one id. `rewrite.test.ts`: `respellings` over a page rename maps its bare and path keys; over a move maps only the keys through the changed folder; over a folder rename maps the keys through the renamed segment for every page under it and nothing shallower; over an arrival that shares a sole holder's title maps that holder's bare key to its full path (and maps nothing when the arrival's keys named nobody); `rewriteConnections(body, names)` rewrites `[[notes]]`, `[Notes](notes)`, and `[[Notes.md]]` to the mapped spelling, leaves `[[Notes]]` alone when the map holds `notes → 'Notes'`, writes `[[A/Notes|Notes]]` for a bare `[[Notes]]` gaining a path and `![[A/Notes]]` for the embed `![[Notes]]` (alias default), and carries `[[A/Notes|Notes]]` to `[[A/Plan|Plan]]`.
- [ ] `pageIndex.ts`: `writtenName` hoisted to a `const` beside `resolve`; `respell(key, page, oldPath = page.path)`; `byId`, built on first use as `alphabetical` is, first listed wins. `record.ts`: `pagesByIdOf` reads `pageIndexOf(tree).byId`, so the tree has one by-id rule.
- [ ] `rewrite.ts`: `respellings(before, after, moved, arriving)` over two indexes; `rewriteConnections(body, names: ReadonlyMap<string, string>)`; `follower` writes a wikilink whole where `carriesTitleAlias({ ...next, embed: hit.embed })` (Task 1-3's predicate; an embed never carries one, since `expressibleInLink` refuses a `|` there); not written under the no-alias ruling.
- [ ] The three callers keep the gates green until their own tasks: `cascade.ts`'s rewrite call takes `new Map([[pageKey(title), change.to]])` (Task 6-2 replaces it), `spend.ts:265` takes `new Map([[pageKey(was), landed]])` (Task 8-2 replaces it), and `tilesFile.test.ts:509`'s `rename` helper takes `new Map([['target', 'Renamed']])`.

**AFTER**

```Core/Connections/pageIndex.ts diff
@@ PageIndex @@
   namesOf: (path: string) => string[]
+  /** How `key`, which named `page` before, spells it now: null to leave the link as written, when the key still names the page and the page's path at the key's depth is unchanged from `oldPath` byte for byte (a case-only rename changes it; an Obsidian-folded link whose page didn't move doesn't); else the written name at the key's depth. Without `oldPath`, resolution alone decides. */
+  respell: (key: string, page: ConnPage, oldPath?: string) => string | null
+  /** The page each id names, first listed where two files claim one, built on first use. */
+  readonly byId: ReadonlyMap<string, ConnPage>
@@ buildPageIndex @@
+  let byId: Map<string, ConnPage> | undefined
+  const writtenName = (path: string, like = ''): string => { … (Task 1-2's body, as a const) }
+  const respell = (key: string, page: ConnPage, oldPath = page.path): string | null => {
+    const depth = key.split('/').length
+    const keeps =
+      resolve(key).page?.id === page.id && tailOf(oldPath, depth) === tailOf(page.path, depth)
+    return keeps ? null : writtenName(page.path, key)
+  }
   return {
     …
     writtenName,
     namesOf: (path) => pathKeys(path).filter((k) => resolve(k).page?.path === path),
+    respell,
+    get byId() {
+      if (!byId) {
+        byId = new Map()
+        for (const p of pages) if (!byId.has(p.id)) byId.set(p.id, p)
+      }
+      return byId
+    },
   }
```

```Core/Nexus/record.ts diff
-/** Where two files claim one id, the first listed shows and refills a cache; the host's file writers refuse it (`heldPages.ts`). */
-export const pagesByIdOf = entityMemo(
-  [],
-  (tree): ReadonlyMap<string, ConnPage> =>
-    new Map(
-      Object.values(recordById(tree)).flatMap(({ id, kind, title, path }): [string, ConnPage][] =>
-        kind === 'page' ? [[id, { id, title, path }]] : [],
-      ),
-    ),
-)
+/** Where two files claim one id, the first listed shows and refills a cache; the host's file writers refuse it (`heldPages.ts`). */
+export const pagesByIdOf = (tree: NexusTree): ReadonlyMap<string, ConnPage> => pageIndexOf(tree).byId
```

```Core/Connections/rewrite.ts diff
@@ imports @@
+import { type ConnPage, type PageIndex, pathKeys } from './pageIndex'
+import { carriesTitleAlias } from './connections'
@@ rewriteConnections @@
-/** Code stays untouched: a page documenting `[[Old Title]]` in a fenced block is showing a sample. Only the written name changes; shown text that only named it follows it, and shown text that comes to repeat the new target goes, as the writer drops one. */
-export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
-  const oldKey = normalizeTitle(oldTitle)
+/** The one re-spell's map: every key that named a moved page in the index before, and every key a tail of an arriving page's new path spells that named one other page alone before (a collision), mapped to how it spells that page in the index after; a key the page still answers at an unchanged tail is left out. The map's keys are the files to sweep, the tile gate, and the rewrite in one. */
+export function respellings(
+  before: PageIndex,
+  after: PageIndex,
+  moved: readonly string[],
+  arriving: readonly string[],
+): Map<string, string> {
+  const examined = new Map<string, ConnPage>()
+  for (const id of moved) {
+    const p = before.byId.get(id)
+    if (p) examined.set(id, p)
+  }
+  for (const id of arriving)
+    for (const k of pathKeys(after.byId.get(id)?.path ?? '')) {
+      const y = before.resolve(k).page
+      if (y && y.id !== id) examined.set(y.id, y)
+    }
+  const names = new Map<string, string>()
+  for (const p of examined.values()) {
+    const q = after.byId.get(p.id)
+    if (!q) continue
+    for (const k of before.namesOf(p.path)) {
+      const next = after.respell(k, q, p.path)
+      if (next !== null) names.set(k, next)
+    }
+  }
+  return names
+}
+
+/** Code stays untouched: a page documenting `[[Old Title]]` in a fenced block is showing a sample. Only the written name changes, to what `names` maps its key to; shown text that only named it follows it, and shown text that comes to repeat the new target goes, as the writer drops one. */
+export function rewriteConnections(body: string, names: ReadonlyMap<string, string>): string {
   const rewrite = follower(body)
   const edits: TextEdit[] = []
-  for (const hit of linksIn(body))
-    if (hit.target === oldKey) edits.push(...rewrite(hit, 'title', newTitle))
+  for (const hit of linksIn(body)) {
+    const next = names.get(hit.target)
+    if (next !== undefined && next !== hit.named.title) edits.push(...rewrite(hit, 'title', next))
+  }
   return applyEdits(body, edits)
 }
@@ follower @@
     const next = { title: to.title, heading: to.heading, shown: carried }
-    if (hit.syntax === 'wiki' && !spellsAsWiki(next))
-      return [{ from: hit.full[0], to: hit.full[1], insert: esc(pageLinkText(next, 'markdown')) }]
+    // A wikilink the grammar can't spell falls to the markdown form, and one gaining a path gains the title alias the writer gives it, so both are written whole; an embed carries no alias, as `pageEmbedText` writes none.
+    const wholly = !spellsAsWiki(next) || carriesTitleAlias({ ...next, embed: hit.embed })
+    if (hit.syntax === 'wiki' && wholly)
+      return [{ from: hit.full[0], to: hit.full[1], insert: esc(pageLinkText(next, 'wiki')) }]
```

**VERIFY**

- [ ] The new cases pass; `rewrite.test.ts`'s title-arm cases take a one-entry map (`new Map([['old', 'New']])`) and pass; `rewrite.test.ts:136` and `:145-148` pass; `tilesFile.test.ts`'s `rewriteTileConnections` cases pass through the map form.
- [ ] `respellings` over 5,000 pages under one folder completes in the test harness in well under a second (one timing assertion, generous bound), since it resolves each page's tails against both indexes in memory.
- [ ] `git grep -n "this\." -- Core/Connections/pageIndex.ts` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-2

**TASK:** Let the cascade's title arm take the map, its heading arm decide by the page's keys, and its tile gate ask for every key, so a title rename no longer reads every tile and a heading rename on one twin leaves the other's links alone.

**NOW:** `renameCascade`'s title arm (`cascade.ts:162-255`, after Phase 2) queries one title key and calls `rewriteConnections` with a one-entry map (Task 6-1's interim); its heading arm passes `new Set([titleKey])`; tiles are read unconditionally for a title (`:233-236`) and through `tilesLinkHeading(root, titleKey, headingKey)` for a heading, whose cache holds `target\0qualifier` keys only (`tilesFile.ts:267-289`); `editCaches` runs for a title.

**CHANGE**

- [ ] Write and watch fail: `cascade.test.ts`: `renameCascade(root, { names, label })` rewrites a body's `[[Old]]`, a Link value, a Space sidecar's value, a tile's link, and a cached value through the map; a heading rename on `A/Notes` with a twin `B/Notes` rewrites `[[A/Notes#H]]` and the page's own `[[#H]]` and leaves `[[Notes#H]]` (ambiguous) and `[[B/Notes#H]]` alone; a title rename reads no tile when none links a mapped key (spy on the tile read). `tilesFile.test.ts:325-327`: `tilesLink(root, ['notes'])` is true for a tile linking `[[Notes]]` and `tilesLink(root, ['notes'], 'setup')` for `[[Notes#Setup]]`.
- [ ] `rewrite.ts`: `CascadeChange`'s title arm becomes `{ names: ReadonlyMap<string, string>; label: string }`. `cascade.ts`: the title arm's files are `queryMentions([...names.keys()]) ?? await nexusCorpus(root)`; `rewrite` calls `rewriteConnections(text, change.names)`; the heading arm's `keys = pageIndexOf(tree).namesOf(change.path)` and its files `queryHeadingMentions(headingKey, keys)` plus the page itself; tiles are read when `tilesLink(root, keys, heading?)` says one links a key; the warning names `change.label` or `${title}#${heading}`.
- [ ] `tilesFile.ts`: `readTileHeadingLinks` becomes `readTileLinks`, caching each hit's `target` and, where it names a heading, `target\0qualifier`; `tilesLinkHeading` becomes `tilesLink(root, keys: Iterable<string>, heading?: string)`; `dropTileHeadingLinks` becomes `dropTileLinks` (`settle.ts:103`, `fileEvents.ts`'s tiles leaf, `tilesFile.ts`'s own call).
- [ ] `rename.ts:42` takes the names arm as a one-entry map, `{ names: new Map([[pageKey(oldTitle), req.newName]]), label: oldTitle }`, until Task 6-3 removes the call; `mutate.ts:94` and `cascadeSeen` are unchanged in shape.

**AFTER**

```Core/Connections/rewrite.ts diff
-export type CascadeChange = { title: string; to: string } | { path: string; heading: string; to: string }
+/** What a cascade rewrites: every link whose key `names` maps, under `label` in its warning; or every link naming `heading` on the page at `path`. */
+export type CascadeChange =
+  | { names: ReadonlyMap<string, string>; label: string }
+  | { path: string; heading: string; to: string }
```

```Core/Nexus/cascade.ts diff
@@ renameCascade @@
-/** A page rename sweeps the files the index names, or the whole corpus before there is one; a heading rename sweeps what a ready index names and the page itself always … Markdown tiles sit outside the index: a title rename reads every one, and a heading rename reads them when one links the heading. `skipRel` is a page whose editor has already rewritten its own body; its frontmatter still takes the patch. */
+/** A re-spell sweeps the files the index names under the map's keys, or the whole corpus before there is one; a heading rename sweeps what a ready index names under the page's keys and the page itself always, since its own bare fragments are keyed to no page, and a corpus scan per heading edit is an on-every-edit cost. Markdown tiles sit outside the index, so a cached list of what they link gates their read. `skipRel` is a page whose editor has already rewritten its own body; its frontmatter still takes the patch. */
 export async function renameCascade(
   root: string,
   change: CascadeChange,
   settled = false,
 ): Promise<CascadeReport> {
-  const title = 'title' in change ? change.title : titleFromPath(change.path)
-  const named = 'title' in change ? title : `${title}#${change.heading}`
-  const heading = 'heading' in change ? change : null
+  const named = 'names' in change ? change.label : `${titleFromPath(change.path)}#${change.heading}`
   try {
-    const titleKey = pageKey(title)
+    const tree = await liveTreeOf(root)
+    const keys = 'names' in change ? [...change.names.keys()] : pageIndexOf(tree).namesOf(change.path)
+    const heading = 'heading' in change ? normalizeTitle(change.heading) : undefined
     const rels =
-      'title' in change
-        ? (queryMentions([titleKey]) ?? (await nexusCorpus(root)))
-        : [...(queryHeadingMentions(headingKey, [titleKey]) ?? []), heading.path]
+      heading === undefined
+        ? (queryMentions(keys) ?? (await nexusCorpus(root)))
+        : [...(queryHeadingMentions(heading, keys) ?? []), change.path]
     …
     const rewrite = (text: string, own = false, outlineOf = text): string =>
-      'title' in change
-        ? rewriteConnections(text, new Map([[titleKey, change.to]]))
+      'names' in change
+        ? rewriteConnections(text, change.names)
         : rewriteHeadingConnections(
             text,
-            new Set([titleKey]),
+            new Set(keys),
             change.heading,
             change.to,
             own,
             runs && own ? headingOutline(outlineOf).map((h) => h.text) : undefined,
           )
-    const tree = await liveTreeOf(root)
     …
-    const tiles =
-      'title' in change || (await tilesLinkHeading(root, titleKey, normalizeTitle(change.heading)))
-        ? await rewriteTileConnections(root, rewrite)
-        : { hosts: [], failed: 0 }
+    const tiles = (await tilesLink(root, keys, heading))
+      ? await rewriteTileConnections(root, rewrite)
+      : { hosts: [], failed: 0 }
     …
-    const uncached =
-      'title' in change ? await editCaches(root, tree.collections, cachedIds, movedCache) : 0
+    const uncached =
+      'names' in change ? await editCaches(root, tree.collections, cachedIds, movedCache) : 0
```

```Core/Tiles/tilesFile.ts diff
-let tileHeadingLinks: { root: string; keys: Promise<Set<string>> } | null = null
+let tileLinks: { root: string; keys: Promise<Set<string>> } | null = null
 
-export const dropTileHeadingLinks = (): void => {
-  tileHeadingLinks = null
+export const dropTileLinks = (): void => {
+  tileLinks = null
 }
 
-async function readTileHeadingLinks(root: string): Promise<Set<string>> {
+/** Every key a markdown tile links, and every `key\0heading` where it names a heading: what no index names, read once per tree. */
+async function readTileLinks(root: string): Promise<Set<string>> {
   const keys = new Set<string>()
   for (const { dir } of tileHostsOf(root, await liveTreeOf(root)).hosts)
     for (const id of (await markdownTileIds(dir)) ?? [])
-      for (const hit of linksIn(valueOr(await readMarkdownTile(dir, id), '')))
-        if (hit.qualifier) keys.add(`${hit.target}\0${hit.qualifier}`)
+      for (const hit of linksIn(valueOr(await readMarkdownTile(dir, id), ''))) {
+        keys.add(hit.target)
+        if (hit.qualifier) keys.add(`${hit.target}\0${hit.qualifier}`)
+      }
   return keys
 }
 
-export function tilesLinkHeading(
-  root: string,
-  normalizedTitle: string,
-  normalizedHeading: string,
-): Promise<boolean> {
-  if (tileHeadingLinks?.root !== root) tileHeadingLinks = { root, keys: readTileHeadingLinks(root) }
-  return tileHeadingLinks.keys.then((keys) => keys.has(`${normalizedTitle}\0${normalizedHeading}`))
+export function tilesLink(
+  root: string,
+  normalizedKeys: Iterable<string>,
+  normalizedHeading?: string,
+): Promise<boolean> {
+  if (tileLinks?.root !== root) tileLinks = { root, keys: readTileLinks(root) }
+  return tileLinks.keys.then((keys) => {
+    for (const k of normalizedKeys)
+      if (keys.has(normalizedHeading === undefined ? k : `${k}\0${normalizedHeading}`)) return true
+    return false
+  })
 }
```

**VERIFY**

- [ ] The listed tests pass; `indexSeed.test.ts:167-181` (the outside heading rename) still passes through `namesOf`.
- [ ] `git grep -n "tilesLinkHeading\|dropTileHeadingLinks\|'title' in change" -- Core` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-3

**TASK:** Run every address-changing operation inside the settle's own turn through one wrapper, `addressed`, which reads the index before and after the operation, diffs the two by id, and re-spells what moved or arrived, so rename, folder rename, page move, Set move, and create each gain the cascade without a line of their own; the first commit's rename and a new `Untitled` arrive without moving.

**NOW:** `withWriteRoot` (`Core/Contract/handlers.ts:99-111`) runs an operation bare and settles after it; the settle's `inTurn` (`settle.ts:57`) is private and `payOwedWalk` (`:212`) takes a turn of its own; `underContexts` (`mutate.ts:73-81`) holds the Contexts folder's lock and pays the walk in its `finally`. `renameOp` (`rename.ts:37-42`) skips the cascade when `titleHeldOutside`, and its `fromCreate` arm (`:29-36`) skips every cascade; `movePageOp`, `moveSetOp` (`move.ts`), the folder arm of `renameOp`, and `createPageOp` (`create.ts`) cascade nothing. `renameCascade` reads `liveTreeOf` after the change (`cascade.ts:191`), which hands back the tree from before it when a walk is owed (`liveTree.ts:74`). The renderer already diffs two by-id maps for its heading cache (`movedHeadings`, `nexusSlice.ts:28-42`) and flushes pending saves before an op that moves or rewrites files (`:236-239`), a list that misses `createPage`.

**CHANGE**

- [ ] **Audit first:** list every function the gated operations reach that awaits `inTurn` (`payOwedWalk`, `settleNow`) or takes a `machine().lock` key the settle's own turn also takes; at HEAD the awaiters are `mutate.ts:78` (`underContexts`'s `finally`, which stays outside the turn), `Contract/handlers.ts:105` and `Nexus/handlers.ts:105,108` (after the operation), and `Testing/settledMutate.ts:20`; the settle's turn takes `nexusDir` through `registerHeldOptions` and per-file locks, and no operation holds `nexusDir` across the turn boundary (`restoreProperty` takes and releases it inside its own turn). Record the list in this task and in the Constraint.
- [ ] Write and watch fail: `mutate.test.ts`: `:398` becomes "a container rename re-spells the path links through it" (`[[A/Notes]]` → `[[B/Notes]]`, a bare `[[Notes]]` untouched); a page move from `A/` to `B/` re-spells `[[A/Notes]]` and leaves `[[Notes]]`; a move that makes `[[Notes]]` ambiguous re-spells the other holder's bare links to its path; a create named `Plan` beside a sole `Plan` re-spells the first's bare links, and a create named `Untitled` beside a sole `Untitled` re-spells nothing; a first commit from `Untitled` to `Notes` beside a sole `Notes` re-spells that page's bare links and leaves a stale `[[Untitled]]` elsewhere as written; `:365` stays true; `:383` stays true; renaming one of two twins re-spells `[[A/Notes]]` to `[[A/Plan]]` (today it skips); each reply carries `cascade` with the files it reached and the moved page's title in its warning; two address operations issued at once run one after the other (spy on `relink`'s order). `nexusSlice.test`: `createPage` flushes pending saves as `rename` does. `record.test.ts`: `pageMoves` lists an id whose path changed and an id new to the after map, and neither an unchanged nor a departed one.
- [ ] `record.ts`: `pageMoves(before, after)` over two by-id maps; `nexusSlice.ts`'s `movedHeadings` relocates the headings of `pageMoves(before, after).moved` instead of walking `before` itself.
- [ ] `settle.ts`: export `inSettleTurn`, `settledIndex`, and `relink`.
- [ ] `mutate.ts`: `addressed` wraps what can move or add a page (`createPage`, `rename`, `movePage`, `moveSet`), inside `underContexts` where that applies; what sweeps or removes alone (`renameHeading`, `delete`, `emptyBundle`) runs under `inSettleTurn`, since a diff there finds nothing and a heading rename settles often; `restore` runs under `inSettleTurn` too, since its pages come from the Trash and Task 8-2 composes its own world before.
- [ ] `rename.ts`: the page arm drops `titleHeldOutside` and its cascade call and returns `ok({})` like its siblings; `mutateRequest.ts:64`'s `fromCreate` comment reads "disambiguates like a create, and arrives without moving, so a stale link to the name it was born with never follows". `move.ts` and `create.ts` are untouched.
- [ ] `nexusSlice.ts:236-239`: `createPage` joins the ops that flush pending saves (its collision arm rewrites other pages' bodies).
- [ ] `heldPages.ts`: `titleHeldOutside` goes; `heldPages.test.ts:83` goes.

**AFTER**

```Core/Nexus/record.ts diff
+/** Two by-id maps compared: the ids whose path changed, and the ids the second holds that the first didn't. */
+export function pageMoves(
+  before: ReadonlyMap<string, { path: string }>,
+  after: ReadonlyMap<string, { path: string }>,
+): { moved: string[]; arrived: string[] } {
+  const moved: string[] = []
+  const arrived: string[] = []
+  for (const [id, { path }] of after) {
+    const was = before.get(id)?.path
+    if (was === undefined) arrived.push(id)
+    else if (was !== path) moved.push(id)
+  }
+  return { moved, arrived }
+}
```

```Core/Session/nexusSlice.ts diff
@@ movedHeadings @@
   let next = headings
-  for (const [id, { path: was }] of before) {
-    const now = after.get(id)?.path
-    if (now === undefined || now === was || !(was in headings)) continue
+  for (const id of pageMoves(before, after).moved) {
+    const was = before.get(id)?.path ?? ''
+    const now = after.get(id)?.path ?? ''
+    if (!(was in headings)) continue
     if (next === headings) next = { ...headings }
     next[now] = headings[was]
     delete next[was]
   }
@@ mutate @@
-      const moves = req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet'
+      const moves =
+        req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet' || req.op === 'createPage'
       // A save queued for a file this op moves or rewrites would land on the old path or go stale.
```

```Core/Nexus/settle.ts diff
@@ imports @@
+import { pageIndexOf } from './record'
+import { type CascadeReport, renameCascade } from './cascade'
+import { respellings } from '../Connections/rewrite'
+import type { PageIndex } from '../Connections/pageIndex'
@@ after walkWhileOwed @@
+/** Runs an address-changing operation in the settle's own turn, so no payment of an owed re-spell interleaves with it; nothing inside may await another turn (`payOwedWalk`, `settleNow`), since a turn queued behind this one starts only when it ends. */
+export const inSettleTurn = <T>(op: () => Promise<T>): Promise<T> => inTurn(op)
+
+/** The index once the walk the latest writes may have owed is paid; null when the tree isn't this root's. */
+export async function settledIndex(root: string): Promise<PageIndex | null> {
+  await walkWhileOwed(root)
+  const tree = heldTreeOf(root)
+  return tree && pageIndexOf(tree)
+}
+
+/** The one re-spell, run inside the settle's turn against the index as it stands now: the map `respellings` builds from `before` to the settled index, swept by the cascade under `label`; undefined when nothing needs re-spelling. */
+export async function relink(
+  root: string,
+  before: PageIndex,
+  label: string,
+  moved: readonly string[],
+  arriving: readonly string[],
+): Promise<CascadeReport | undefined> {
+  const after = await settledIndex(root)
+  if (!after) return { pages: [], hosts: [], warning: `Links to “${label}” weren't updated.` }
+  const names = respellings(before, after, moved, arriving)
+  return names.size ? renameCascade(root, { names, label }) : undefined
+}
```

```Core/Nexus/mutate.ts diff
@@ imports @@
+import { joinCascades } from './cascade'
+import { pageMoves } from './record'
+import { inSettleTurn, relink, settledIndex } from './settle'
+import { DEFAULT_NEW_NAME } from './mutateRequest'
@@ dispatch @@
   const underContexts = …
+  // A write that changes a page's address, or sweeps links, runs in the settle's turn, so an owed re-spell is never paid mid-operation and two such writes never interleave; it holds the Contexts lock outside the turn, since that lock's `finally` takes a turn of its own. A write that can move or add a page also reads the index before and after and re-spells by the difference (one that only sweeps or removes runs in the turn alone): a page whose path changed moved, a page new to the index arrived, and both can collide. A first commit's rename arrives without moving, so a stale link to the name it was born with never follows it, and a page created under the default name is no arrival, since it's uncommitted and its first commit is where it arrives.
+  const addressed = (fn: () => Promise<MutateReply>): Promise<MutateReply> =>
+    inSettleTurn(async () => {
+      const before = await settledIndex(root)
+      const reply = await fn()
+      if (!reply.ok || !before) return reply
+      const after = await settledIndex(root)
+      if (!after) return reply
+      const { moved, arrived } = pageMoves(before.byId, after.byId)
+      const firstCommit = req.op === 'rename' && req.fromCreate === true
+      const stayed = firstCommit ? [] : moved
+      const arriving = [
+        ...(firstCommit ? moved : []),
+        ...arrived.filter((id) => after.byId.get(id)?.title !== DEFAULT_NEW_NAME),
+      ]
+      const first = after.byId.get(stayed[0] ?? arriving[0] ?? '')
+      const cascade = first
+        ? await relink(root, before, first.title, stayed, [...stayed, ...arriving])
+        : undefined
+      if (!cascade) return reply
+      const joined = reply.value.cascade ? joinCascades(reply.value.cascade, cascade) : cascade
+      return ok({ ...reply.value, cascade: joined })
+    })
   switch (req.op) {
     case 'createPage':
       return seedsContext(req)
-        ? underContexts(() => createPageOp(ctx, req))
-        : createPageOp(ctx, req)
+        ? underContexts(() => addressed(() => createPageOp(ctx, req)))
+        : addressed(() => createPageOp(ctx, req))
     …
     case 'rename':
-      return renameOp(ctx, req)
+      return addressed(() => renameOp(ctx, req))
     case 'renameHeading':
-      return ok({ cascade: await renameCascade(root, req, true) })
+      return inSettleTurn(async () => ok({ cascade: await renameCascade(root, req, true) }))
     case 'delete':
       return req.kind === 'space' || req.kind === 'context'
-        ? underContexts(() => deleteOp(ctx, req))
-        : deleteOp(ctx, req)
+        ? underContexts(() => inSettleTurn(() => deleteOp(ctx, req)))
+        : inSettleTurn(() => deleteOp(ctx, req))
     case 'restore':
-      return underContexts(() => restoreOp(ctx, req))
+      // The restore composes its own world before, since its pages come from the Trash.
+      return underContexts(() => inSettleTurn(() => restoreOp(ctx, req)))
     case 'emptyBundle': {
       const resolved = await resolveUnderRoot(root, req.bundlePath)
-      return resolved.ok ? emptyBundle(root, resolved.value, deps) : resolved
+      return resolved.ok ? inSettleTurn(() => emptyBundle(root, resolved.value, deps)) : resolved
     }
     …
     case 'movePage':
-      return movePageOp(ctx, req)
+      return addressed(() => movePageOp(ctx, req))
     case 'moveSet':
-      return moveSetOp(ctx, req)
+      return addressed(() => moveSetOp(ctx, req))
```

```Core/Nexus/rename.ts diff
@@ imports @@
-import { renameCascade } from './cascade'
-import { titleHeldOutside } from './heldPages'
@@ renameOp @@
-  const oldTitle = titleFromPath(abs)
-  const heldOutside = titleHeldOutside(root, oldTitle, req.path)
   const r = await renamePage(abs, req.newName)
-  if (!r.ok) return r
-  if (heldOutside) return ok({})
-  return ok({ cascade: await renameCascade(root, { names: new Map([[pageKey(oldTitle), req.newName]]), label: oldTitle }) })
+  return r.ok ? ok({}) : r
```

```Core/Nexus/heldPages.ts diff
-/** Whether a page outside `rel` still answers `title`, so a link naming it resolves once `rel` is gone. */
-export function titleHeldOutside(root: string, title: string, rel: string): boolean {
-  …
-}
```

**VERIFY**

- [ ] The listed tests pass; `git grep -n "titleHeldOutside" -- Core` finds nothing; `git grep -n "payOwedWalk\|settleNow" -- Core Desktop` matches only the audit's list; `git grep -n "renameCascade(" -- Core` finds `mutate.ts`, `settle.ts`, `fileEvents.ts` (until Task 7-2 moves its arm), `cascade.ts`, and their tests alone.
- [ ] Live, in `~/Test`: rename a Set holding a page another page links by path, and the link follows with a notice naming the moved page; move a page between Collections and a path link follows while a bare one stays; create a page and name it as an existing page is named, and the first's bare links become path links at the commit, not at the create; rename one twin and only its path links move.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 6-4

**TASK:** Let the delete strip by what resolves to nothing after, over the deleted pages' delete-time paths (a folder's pages leave with it and their links read as phantoms until a restore, F-1), and give the Trash the one function that reads a bundled page's delete-time path from the bundle chain.

**NOW:** `deleteCascade(root, abs, titles)` (`cascade.ts:82-159`) derives `gone` from titles no page outside the deletion holds (`titleHeldOutside`) and strips Link values whose title is gone; `deleteOp` gathers titles from `folderCorpus` (`delete.ts:89-92`) and `emptyBundle` from the artifact's files (`spend.ts:84`). The bundle chain mirrors a deleted entry's folder (`bundle.ts:13-20`), which `frozenCrumbs` (`trashRows.ts:20-28`) already reads as "the only surviving evidence of where something lived".

**CHANGE**

- [ ] Write and watch fail: `cascade.test.ts:544-592`: the delete calls take paths; `:568` (a twin outside keeps the value) and `:578` (both twins gone strip it) stay true; a path-form value `[[A/Notes]]` naming a deleted page is stripped while `[[B/Notes]]` isn't; a value whose tail now resolves to a live namesake by precedence is kept. `trashRows.test` or a new `bundle` case: `deletedPathOf` returns `Studio/Pommora/ClaudeMD.md` for a page bundle under `.trash/Studio/Pommora/`, and `Coll/Set/X.md` for a page inside a trashed Set's bundle.
- [ ] `cascade.ts`: `deleteCascade(root, abs, paths)`; `gone` is every tail of every deleted path that resolves to nothing in an index built over the held tree's pages outside the deletion (the tree's own patch may have fallen to a walk, and no tree strips everything, as today); `goneEntry`'s `holds` asks `!gone.has(pageKey(t))`.
- [ ] `bundle.ts`: `deletedPathOf(root, bundleAbs, file)` joins the bundle's chain (relative to `.trash`) with the file's path inside the bundle, the same reading of the chain `frozenCrumbs` (`trashRows.ts:20-28`) makes for its crumbs.
- [ ] `delete.ts`: `paths` are the tree's pages at or under the deletion, from the before-tree it already reads at `:36`; the `folderCorpus` import goes. `spend.ts:84`: `deleteCascade(root, artifactAbs, pages.map((file) => deletedPathOf(root, bundleAbs, file)))`.

**AFTER**

```Core/Nexus/cascade.ts diff
@@ deleteCascade @@
-/** A delete strips every Link property value naming a page it took from the pages and Spaces the tree holds outside it, unless a page outside it still answers that title; bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
+/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the pages and Spaces the tree holds outside it; a key a page outside still answers is left to that page, and bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
 export async function deleteCascade(
   root: string,
   abs: string,
-  titles: string[],
+  paths: readonly string[],
 ): Promise<DeleteCascade> {
   const deleted = relative(root, abs)
   const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
-  const gone = new Set(
-    titles.filter((t) => !titleHeldOutside(root, t, deleted)).map(normalizeTitle),
-  )
   const tree = heldTreeOf(root)
+  // The world after, built here: the held tree may still hold the deleted pages (its own patch can fall to a walk), so they are excluded by path, and no tree at all leaves nothing to answer, so everything strips, as today.
+  const after = buildPageIndex(tree ? pagesOf(tree).filter((p) => !inside(p.path)) : [])
+  const gone = new Set(
+    paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'),
+  )
   try {
     …
     const goneEntry = (value: unknown): string | null =>
-      gonePageEntry(value, { holds: (t) => !gone.has(normalizeTitle(t)) })
+      gonePageEntry(value, { holds: (t) => !gone.has(pageKey(t)) })
```

```Core/Trash/bundle.ts diff
+/** Where a bundled file lived before its delete: the bundle's chain under `.trash` mirrors the folder it left, and the artifact keeps its own tree. */
+export const deletedPathOf = (root: string, bundleAbs: string, file: string): string =>
+  join(relative(join(root, TRASH_DIR), dirname(bundleAbs)), relative(bundleAbs, file))
```

```Core/Trash/delete.ts diff
-    titles =
-      req.kind === 'page'
-        ? [titleFromPath(abs)]
-        : (await folderCorpus(root, abs)).map(titleFromPath)
+    paths = pagesOf(before).filter((p) => isAtOrUnder(p.path, rel)).map((p) => p.path)
   …
-  const gone = titles ? await deleteCascade(root, abs, titles) : null
+  const gone = paths ? await deleteCascade(root, abs, paths) : null
```

(`before` is the `liveTreeOf(root)` the delete already reads for `goneEdit` at `:36`, held in a local.)

**VERIFY**

- [ ] The listed tests pass; `git grep -n "folderCorpus" -- Core` finds only `indexSeed.ts`'s own export and `moveIndexPaths`.
- [ ] Run the gates, then `view-delta` for Phase 6.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: every operation that can move or add a page runs under `addressed`, and every one that sweeps or removes under `inSettleTurn` and nothing inside one awaits `inTurn` (the audit's list, re-run); no address operation calls `renameCascade` or `relink` itself, since the wrapper's diff is the one trigger for a names arm (the heading arm under `renameHeading` and Task 8-2's restore are the stated exceptions); `respell` is the only per-key decision, `respellings` the only map builder, and `byId` the only by-id rule; no title-equality test remains in the host (`titleHeldOutside`, `normalizeTitle(own) === titleKey`, `hit.target === titleKey`); the heading arm decides by `namesOf` on both sides (host and editor); `deleteCascade`'s gone keys resolve to nothing in the after-tree; a first commit's rename and a default-named create never pass a moved page.

---

### Phase 7 — The Outside-Move Lane

**GOAL:** A rename or move made outside Pommora (Finder, Obsidian, Sync landing another device's change), live or while the app was closed, adjusts links as an in-app one does: the index reports the pages whose rows it removes and the pages it finds new, the settle pairs a vanished ID with where the tree now holds it, whichever order and however many batches apart the two events arrived, and pays one `relink` for every pair and every outright arrival at once, logging what it couldn't write (E-3, E-4, E-5).

#### Task 7-1

**TASK:** Give the indexed-files rows the page's ID, so removing a file's or a folder's rows and pruning at the seed can report whose they were; let every index step return one `IndexSeen` of renames, vanished pages, and landed ids; owe it for watched events and for the IDs the settle's own stamp writes into files that arrived without one.

**NOW:** `indexed_files` holds path, mtime, and size (`ddl.ts:42-46`; `IndexedStat`, `Platform/stores.ts:30-33`); `deindexPath` (`indexSeed.ts:144-149`) removes rows and returns nothing; `indexWrittenPage` (`:101-121`) returns `HeadingRenameSeen[]` and has the page's `ID` in hand in `entry.values`; `seedContentIndex` prunes what the corpus no longer yields (`:224`) and returns `SeedReread { db, rels, renames }`; `indexEvent` (`fileEvents.ts:266-290`) owes renames through `oweRenames` for watched writes and owes nothing for an unlink; `Owed` (`:93-109`) has no memory of a page that left. A page Obsidian or Finder creates carries no ID: its watched `add` indexes a row without one, the tree lists it missing its ID, and `stampMissing` (`adopt.ts:128-`) writes the ID as the app's own write, which `indexEvent` doesn't owe; `stampMissing` answers a boolean its open-time caller reads (`Nexus/handlers.ts:89-99`).

**CHANGE**

- [ ] Write and watch fail: `storesContract.ts`: `readIndexedStat` carries the `ID` the row's values hold under the exact `ID` key and omits it where none is written or it isn't a string; `readIndexedStats('Notes')` returns the rows under `Notes/` alone, excluding `Notes` itself and `Notes2/…`. `indexSeed.test.ts`: `deindexPath` of a page returns that page (id, title, path) and of a folder returns every page under it, and removes the rows; `indexWrittenPage` of a path the index didn't hold reports its id landed, of one it held reports nothing landed, and of a new path without an ID reports nothing landed; `seedContentIndex` reports a pruned page as vanished and a page absent from the pre-seed snapshot as landed, and a cold seed reports neither (`:216`'s `NO_REREAD` gains the two empty lists). `adopt.test`: `stampMissing` answers the ids it wrote.
- [ ] `Platform/stores.ts`: `IndexedStat.id?: string`; `readIndexedStats(under?: string)`. `contentIndex.ts:99`: the wrapper takes and passes `under`.
- [ ] `Desktop/Store/stores.ts`: both reads LEFT JOIN `page_values` on the path and `key = ID_KEY` (the exact key the app writes and `stampedId` reads, so a file holding both `ID` and `id` yields one row), unwrapping the stored JSON with `json_extract(value, '$')` and keeping a string alone; `under` adds the prefix range the sibling queries use. `memoryStores.ts`: the same through `index.values`.
- [ ] `indexSeed.ts`: `IndexSeen { renames; vanished: ConnPage[]; landed: string[] }` and `NOTHING_SEEN`; `deindexPath` returns the pages it removed (one stat read per unlink, one range read per `unlinkDir`, before the removal); `indexWrittenPage` returns `IndexSeen`, its page landed when no row held the path before the upsert and `entry.values[ID_KEY]` is a string; `SeedReread extends IndexSeen`, pruned rows vanished and rows absent from `indexed` landed, both read from what the seed already holds; `moveIndexPaths` ignores `deindexPath`'s answer (an own move).
- [ ] `adopt.ts`: `stampMissing` answers the ids it wrote into pages (`string[]`); `Nexus/handlers.ts:89-99` reads `.length`. `settle.ts`'s `stampListed` owes them as landed, since a page that arrived without an ID arrives, for the index, when its ID lands.
- [ ] `fileEvents.ts`: `Owed.vanished: Map<string, ConnPage>` (by id, the first path kept, so a page that left twice between settles pairs from where links last named it), `Owed.landed: Set<string>`, and `Owed.paired: Set<string>` (Task 7-2's); `oweSeen(root, seen: IndexSeen)` replaces `oweRenames`; `indexEvent` owes every watched event's `IndexSeen`. `Nexus/handlers.ts:103` and `settle.ts:176` call `oweSeen(root, reread)`; `settle.test.ts:643`'s mock gains the two lists.

**AFTER**

```Core/Platform/stores.ts diff
 export interface IndexedStat {
   mtimeMs: number
   size: number
+  /** The ID the page's frontmatter carries, when one is written: what pairs its rows' removal with where the tree holds it next. */
+  id?: string
 }
@@ ContentIndexStore @@
   readIndexedStat(path: string): IndexedStat | null
-  readIndexedStats(): Map<string, IndexedStat>
+  /** Every indexed page, or those under `under` alone. */
+  readIndexedStats(under?: string): Map<string, IndexedStat>
```

```Desktop/Store/stores.ts diff
+const STAT_COLUMNS = `f.path, f.mtime_ms, f.size, json_extract(v.value, '$') AS id FROM indexed_files f LEFT JOIN page_values v ON v.path = f.path AND v.key = ?`
+type StatRow = { path: string; mtime_ms: number; size: number; id: unknown }
+const statOf = (r: StatRow): IndexedStat => ({
+  mtimeMs: r.mtime_ms,
+  size: r.size,
+  ...(typeof r.id === 'string' ? { id: r.id } : {}),
+})
@@ readIndexedStat @@
   readIndexedStat(path) {
-    const row = db.prepare('SELECT mtime_ms, size FROM indexed_files WHERE path = ?').get(path) as
-      | { mtime_ms: number; size: number }
-      | undefined
-    return row ? { mtimeMs: row.mtime_ms, size: row.size } : null
+    const row = db.prepare(`SELECT ${STAT_COLUMNS} WHERE f.path = ?`).get(ID_KEY, path) as
+      | StatRow
+      | undefined
+    return row ? statOf(row) : null
   },
-  readIndexedStats() {
-    const rows = db.prepare('SELECT path, mtime_ms, size FROM indexed_files').all() as {
-      path: string
-      mtime_ms: number
-      size: number
-    }[]
-    return new Map<string, IndexedStat>(
-      rows.map((r) => [r.path, { mtimeMs: r.mtime_ms, size: r.size }]),
-    )
+  readIndexedStats(under) {
+    const rows = (
+      under === undefined
+        ? db.prepare(`SELECT ${STAT_COLUMNS}`).all(ID_KEY)
+        : db
+            .prepare(`SELECT ${STAT_COLUMNS} WHERE f.path >= ? || '/' AND f.path < ? || '0'`)
+            .all(ID_KEY, under, under)
+    ) as StatRow[]
+    return new Map(rows.map((r) => [r.path, statOf(r)]))
   },
```

```Core/Index/indexSeed.ts diff
@@ HeadingRenameSeen @@
+/** What one index step saw: the heading renames the rows show, the pages whose rows it removed, and the ids of pages indexed for the first time. Watched events owe it, and the settle owes the ids its stamp writes; the app's own writes don't, their operation having spoken. */
+export interface IndexSeen {
+  renames: HeadingRenameSeen[]
+  vanished: ConnPage[]
+  landed: string[]
+}
+
+export const NOTHING_SEEN: IndexSeen = { renames: [], vanished: [], landed: [] }
+const pageOf = (path: string, stat: IndexedStat | null): ConnPage[] =>
+  stat?.id === undefined ? [] : [{ id: stat.id, title: titleFromPath(path), path }]
+const idOf = (entry: PageIndexEntry): string[] => {
+  const id = entry.values[ID_KEY]
+  return typeof id === 'string' ? [id] : []
+}
@@ indexWrittenPage @@
-): Promise<HeadingRenameSeen[]> {
-  if (!isMarkdownFile(abs)) return []
+): Promise<IndexSeen> {
+  if (!isMarkdownFile(abs)) return NOTHING_SEEN
   const rel = await relCorpusPath(root, abs)
-  if (!rel) return []
+  if (!rel) return NOTHING_SEEN
   …
   if (!st) {
+    const vanished = pageOf(rel, readIndexedStat(rel))
     removePathIndex(rel)
-    return []
+    return { ...NOTHING_SEEN, vanished }
   }
   const content = text ?? (await readTextOrNull(abs))
-  if (content === null) return []
+  if (content === null) return NOTHING_SEEN
+  const fresh = readIndexedStat(rel) === null
   const stat = { mtimeMs: st.mtimeMs, size: st.size }
-  return reindex([{ path: rel, entry: extractPageIndex(rel, content), stat }])
+  const entry = extractPageIndex(rel, content)
+  const renames = reindex([{ path: rel, entry, stat }])
+  return { renames, vanished: [], landed: fresh ? idOf(entry) : [] }
 }
@@ deindexPath @@
-export async function deindexPath(root: string, abs: string): Promise<void> {
+/** Removes a path's rows, or a folder's, answering the pages they were, read before the removal. */
+export async function deindexPath(root: string, abs: string): Promise<IndexSeen> {
   const rel = await relCorpusPath(root, abs)
-  if (!rel) return
-  if (isMarkdownFile(rel)) removePathIndex(rel)
-  else removePathPrefixIndex(rel)
+  if (!rel) return NOTHING_SEEN
+  if (isMarkdownFile(rel)) {
+    const vanished = pageOf(rel, readIndexedStat(rel))
+    removePathIndex(rel)
+    return { ...NOTHING_SEEN, vanished }
+  }
+  const vanished = [...(readIndexedStats(rel) ?? [])].flatMap(([path, stat]) => pageOf(path, stat))
+  removePathPrefixIndex(rel)
+  return { ...NOTHING_SEEN, vanished }
 }
@@ SeedReread @@
-export interface SeedReread {
+export interface SeedReread extends IndexSeen {
   db: ContentIndexStore | null
   rels: readonly string[]
-  renames: readonly HeadingRenameSeen[]
 }
-const NO_REREAD: SeedReread = { db: null, rels: [], renames: [] }
+const NO_REREAD: SeedReread = { ...NOTHING_SEEN, db: null, rels: [] }
@@ seedContentIndex @@
+  const landed: string[] = []
   const flush = (): void => {
     …
     renames.push(...reindex(rows))
-    for (const { path } of rows) reread.push(path)
+    for (const { path, entry } of rows) {
+      reread.push(path)
+      if (!indexed.has(path)) landed.push(...idOf(entry))
+    }
   }
   …
-    for (const rel of indexed.keys()) if (!seen.has(rel)) removePathIndex(rel)
+    const vanished: ConnPage[] = []
+    for (const [rel, stat] of indexed)
+      if (!seen.has(rel)) {
+        vanished.push(...pageOf(rel, stat))
+        removePathIndex(rel)
+      }
     markIndexReady()
-    return indexed.size === 0 ? NO_REREAD : { db: db0, rels: reread, renames }
+    return indexed.size === 0 ? NO_REREAD : { db: db0, rels: reread, renames, vanished, landed }
```

```Core/Nexus/adopt.ts diff
-export async function stampMissing(root: string, listed: readonly Stamp[] = []): Promise<boolean> {
-  let landed = false
+/** Answers the ids it wrote into pages: for the index, a page that arrived without one arrives when its ID lands. */
+export async function stampMissing(root: string, listed: readonly Stamp[] = []): Promise<string[]> {
+  const landed: string[] = []
   …
-      landed = true
+      landed.push(id)
   …
   return landed
```

```Core/Nexus/fileEvents.ts diff
@@ Owed @@
   tiles: Map<string, { host: TileHostRef; ids: Set<string> }>
   renames: HeadingRenameSeen[]
+  // Pages whose rows left a path and whose id the tree is yet to hold again, by id at the first path they left; the ids of pages indexed or stamped for the first time since the last settle; and the ids the settle paired whose own row is yet to land, so that row reads as the move's and not as an arrival.
+  vanished: Map<string, ConnPage>
+  landed: Set<string>
+  paired: Set<string>
 }
@@ nothingOwed @@
   renames: [],
+  vanished: new Map(),
+  landed: new Set(),
+  paired: new Set(),
 })
@@ indexEvent @@
       case 'unlink':
-      case 'unlinkDir':
-        await deindexPath(root, ev.absPath)
+      case 'unlinkDir': {
+        const seen = await deindexPath(root, ev.absPath)
+        if (ev.origin === 'watched') oweSeen(root, seen)
         return
+      }
       case 'addDir':
         return
       case 'add':
       case 'change': {
-        const renames = await indexWrittenPage(root, ev.absPath, ev.text)
-        if (ev.origin === 'watched') oweRenames(root, renames)
+        const seen = await indexWrittenPage(root, ev.absPath, ev.text)
+        if (ev.origin === 'watched') oweSeen(root, seen)
         return
       }
@@ oweRenames @@
-// A seed that bailed reads none, so a root a switch left behind never takes the record.
-export function oweRenames(root: string, renames: readonly HeadingRenameSeen[]): void {
-  if (renames.length) owedFor(root).renames.push(...renames)
+// A seed that bailed reads none, so a root a switch left behind never takes the record.
+export function oweSeen(root: string, seen: IndexSeen): void {
+  const owed = owedFor(root)
+  owed.renames.push(...seen.renames)
+  for (const p of seen.vanished) if (!owed.vanished.has(p.id)) owed.vanished.set(p.id, p)
+  for (const id of seen.landed) owed.landed.add(id)
 }
```

```Core/Nexus/settle.ts diff
@@ stampListed @@
-    while (owed.stamp.length && !(gate && batching)) await stampMissing(root, owed.stamp.splice(0))
+    while (owed.stamp.length && !(gate && batching))
+      oweSeen(root, { ...NOTHING_SEEN, landed: await stampMissing(root, owed.stamp.splice(0)) })
```

**VERIFY**

- [ ] The listed tests pass; `indexSeed.test.ts:173-211` read `.renames`; `keyHolders.test.ts:91,111` and `replaySchemaCascade.test.ts:479,488` discard the answer as before.
- [ ] `git grep -n "oweRenames" -- Core Desktop` finds nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 7-2

**TASK:** Let the settle pair every vanished ID with the path the tree now holds it at, read every other landed id the tree holds as an arrival (a paired move's own row, landing a batch late, is no arrival), and pay one `relink` for them all after the walk and outside a batch, carrying an unpaired vanish until its ID returns; move the heading arm's payment beside it so the two outside payments share one tail.

**NOW:** `settle` (`settle.ts:124-162`) pays the owed heading renames one by one through `cascadeSeen` (`fileEvents.ts:297-309`, its only caller), then the walk, then drains the record, keeping `renames`; nothing pairs a page that left with the page that arrived, so an outside move leaves every link to the page unresolved (`fileEvents.test.ts:417,426` prove only that the tree lands with no walk). `livePathOf(root, id)` (`heldPages.ts:27-30`) answers a page's path, or null when the id is absent or two files claim it. A folder renamed, moved, or copied in from outside lands its folder at once (`applyFolder`, `fileEvents.ts:348-358`) while each child's `add` waits on `awaitWriteFinish` (`Desktop/FileWatch/watcher.ts:106`), so the children's rows are often first seen a batch after the tree already holds them: for a rename or move those rows are the pairing's own, for a copy they are arrivals.

**CHANGE**

- [ ] Write and watch fail: `fileEvents.test.ts`, the parity cases: a page moved outside the app from `Notes/Daily/D.md` to `Notes/Weekly/D.md` re-spells `[[Daily/D]]` in a linker to `[[Weekly/D]]` and leaves `[[D]]` as written, with the unlink before the add and with the add before the unlink; the same move with its unlink and add settled apart (two `settled` calls) re-spells at the second settle and not the first; a Set renamed outside (`:426`) re-spells the path links through it, leaves a page linking its pages by bare title byte-identical, still costs no walk, and re-spells nothing more when its children's `add` events settle a batch later beside a namesake elsewhere; a folder of pages copied in with their IDs, whose rows settle a batch after its folder, re-spells the collisions its pages cause; a page created outside beside a sole holder re-spells the holder's bare links to its path, with an ID in the file and without one (the settle's stamp supplies it); a page created while the app was closed is an arrival at the open (`settle.test.ts`, through the seed's `landed`); a page deleted outside leaves its links as written, runs no cascade, and a later settle with nothing new still runs none; a copy landing under an id the tree already holds re-spells nothing. `indexSeed.test.ts`: the seed's vanished and landed pages reach the record (`oweSeen` with a reread holding both).
- [ ] `settle.ts`: `cascadeSeen` moves here from `fileEvents.ts` (its one caller is here) as the heading arm beside `payOutsideMoves`, both ending in one `paid(root, c)`; `payOutsideMoves(root)` pairs and pays, an arrival being any landed id the tree holds that no pairing consumed; `settle` calls it after `walkWhileOwed` when not `batching`; the drain keeps `vanished`, `landed`, and `paired` with `renames`; `missedEvents` owes the whole reread. `fileEvents.ts` drops `cascadeSeen` and the imports only it used.
- [ ] `fileEvents.ts`'s module comment (`:1`) names the pairing beside the renames.

**AFTER**

```Core/Nexus/settle.ts diff
@@ imports @@
+import { livePathOf } from './heldPages'
+import { pageIndexOf, pagesOf } from './record'
+import { buildPageIndex, type ConnPage } from '../Connections/pageIndex'
+import { oweCascade, oweSeen, … } from './fileEvents'
+import { type HeadingRenameSeen, NOTHING_SEEN } from '../Index/indexSeed'
+import { readIndexedStat } from '../Index/contentIndex'
@@ after relink @@
+// What an outside payment leaves: a warning logged, since no one is there to read a notice, and the files it wrote owed to the push.
+function paid(root: string, c: CascadeReport | undefined, what: string): void {
+  if (!c) return
+  if (c.warning) console.error(`${what}:`, c.warning)
+  oweCascade(root, c.pages, c.hosts)
+}
+
+// A heading rename an outside edit shows (Obsidian or sync, landed live or found by the index seed) takes the same cascade the editor's settle takes; the editor's own save owes none, its settle having spoken.
+async function cascadeSeen(root: string, seen: HeadingRenameSeen): Promise<void> {
+  paid(root, await renameCascade(root, { path: seen.path, heading: seen.old, to: seen.next }), 'heading rename')
+}
+
+// An outside move: a page whose rows left one path and whose id the tree now holds at another, paired after the walk whichever order its two events came in and however many settles apart; a vanish nothing holds yet waits for its id (a copy across volumes lands after it leaves). Every other landed id the tree holds arrived outright, so only its collisions re-spell; a paired move's own row, landing a batch after its folder, is remembered as the move's and is no arrival. The world before is the tree's pages with each paired page back where it left and each arrival absent.
+async function payOutsideMoves(root: string): Promise<void> {
+  const owed = owedFor(root)
+  const tree = heldTreeOf(root)
+  if (!tree || (!owed.vanished.size && !owed.landed.size)) return
+  const moved = new Map<string, ConnPage>()
+  let label = ''
+  for (const [id, from] of owed.vanished) {
+    const to = livePathOf(root, id)
+    if (to === null) continue
+    owed.vanished.delete(id)
+    if (!owed.landed.delete(id) && readIndexedStat(to)?.id !== id) owed.paired.add(id)
+    if (to === from.path) continue
+    moved.set(id, from)
+    label ||= titleFromPath(to)
+  }
+  const arriving = [...owed.landed].filter((id) => {
+    if (owed.paired.delete(id)) return false
+    const to = livePathOf(root, id)
+    if (to === null) return false
+    label ||= titleFromPath(to)
+    return true
+  })
+  owed.landed.clear()
+  if (!moved.size && !arriving.length) return
+  const absent = new Set(arriving)
+  const before = buildPageIndex(
+    pagesOf(tree).flatMap((p) => (absent.has(p.id) ? [] : [moved.get(p.id) ?? p])),
+  )
+  paid(root, await relink(root, before, label, [...moved.keys()], [...moved.keys(), ...arriving]), 'outside move')
+}
@@ settle @@
   await walkWhileOwed(root)
   if (away()) return null
+  // Not mid-batch: a reply's settle while the watcher's batch is still applying would read a half-landed folder.
+  if (!batching) await payOutsideMoves(root)
   const owed = owedFor(root)
   …
-  Object.assign(owed, nothingOwed(root), { stamp, walk, whole, renames: drained.renames })
+  const { renames, vanished, landed, paired } = drained
+  Object.assign(owed, nothingOwed(root), { stamp, walk, whole, renames, vanished, landed, paired })
@@ missedEvents @@
-  const { rels, renames } = await seedContentIndex(root)
-  oweRenames(root, renames)
-  return rels.map((rel) => ({ event: 'change', absPath: join(root, rel), origin: 'watched' }))
+  const reread = await seedContentIndex(root)
+  oweSeen(root, reread)
+  return reread.rels.map((rel) => ({ event: 'change', absPath: join(root, rel), origin: 'watched' }))
```

```Core/Nexus/fileEvents.ts diff
-// A rename an outside edit shows (Obsidian or sync, landed live or found by the index seed) takes the same cascade the editor's settle takes; the editor's own save owes none, its settle having spoken.
-export async function cascadeSeen(root: string, seen: HeadingRenameSeen): Promise<void> {
-  …
-}
```

**VERIFY**

- [ ] The listed tests pass; `fileEvents.test.ts:417,426,401,409` still assert no walk; `fileEvents.test.ts:885-958`'s outside heading rename cases pass against `settle.ts`'s arm; `settle.test.ts` passes with the widened mock.
- [ ] Live, in `~/Test` with the app open: in Finder, rename a Set holding a page another page links by path, and the link follows within a second with a console line only on failure; move a page between Sets, and `[[Set/Page]]` follows while `[[Page]]` stays; in Obsidian, create a page sharing a title, and the first page's bare links become path links once the settle stamps it; quit the app, rename a page in Finder, reopen, and the links follow on open.
- [ ] Run the gates, then `view-delta` for Phase 7.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: the index owes only watched events, the seed, and the settle's own stamp, never an operation's writes (`moveIndexPaths` discards; `origin` gates); `payOutsideMoves` runs after the walk, outside a batch, and inside the settle's turn, so it can't interleave an in-app `addressed` write; an unpaired vanish and a paired id whose row is yet to land survive the drain, and a paired or arrived page doesn't; a paired move's late row re-spells nothing; a landed page under an id two files claim re-spells nothing; the before-world puts every paired page back at the first path it left; `IndexSeen` is the only shape an index step returns; both outside payments end in `paid`.

---

### Phase 8 — The Trash

**GOAL:** The Trash's link machinery is re-keyed from a page's title to the page each value named, through the resolution the re-spell uses (F-4, F-6): the delete records what each outbound link under it named by identity, parking and refilling resolve a value's key against the trashed pages at their delete-time paths, and a restore repairs the links of what it lands by identity, re-spells the live world for the arrival and for keys that named only a trashed page (E-3, F-2), and refills the stripped values by the same per-key decision (F-5). Bodies in the Trash are never touched (F-3); the user-facing copy and the Restore Links On Deletion setting are unchanged.

#### Task 8-1

**TASK:** Let the delete record, by key, the page each outbound link under it named; let parking resolve a value's key against the trashed pages at their delete-time paths, reading no file; and let the frozen world take an index, answering by identity where the record knows it.

**NOW:** `gatherContentRecord` (`gather.ts:24-38`) records identity and parent; `gatherSpaceRecord` (`:43-`) records members. `trashedTitles` (`holdings.ts:70-81`) maps a normalized title to the newest bundle holding it and `parkLinks` (`:84-94`) parks by it, so `[[A/Notes]]` parks nowhere and two trashed twins send a value to the newer one; `trashedHolders` (`:97-126`) walks the bundles by id for `refillTrashed`, reading each Set or Collection bundle's pages, and stays. `frozenWorld(tree, landing: string[])` (`heldPages.ts:47-53`) holds a title when a live page or a landing title matches it, so a path link to a landing page is dropped by the scrub. `readPageRelations` answers `body`, `citation`, and `value` rows (`Desktop/Store/stores.ts:137`; `memoryStores.ts:164`), leaving embeds to the Matrix's exclusion by omission.

**CHANGE**

- [ ] Write and watch fail: `spend.test.ts` (the bundle): a page delete records `targets` mapping each outbound key, embeds included, to the id it resolved to alone, omitting an ambiguous and a phantom key, with `[[B/Notes]]` and `[[Notes]]` recorded apart; a Set delete records them bundle-wide from the index with no page read (spy on `readTextOrNull` after the mint); a Space delete records its values' targets; a record without `targets` round-trips. `holdings` cases: `parkLinks` parks `[[A/Notes]]` into the bundle holding `A/Notes.md` and `[[Notes]]` into the bundle holding the only trashed `Notes`, parks `[[Notes]]` nowhere while two trashed twins hold it, and reads no page file (spy). `heldPages.test.ts:90`: `frozenWorld(buildPageIndex([...pagesOf(tree), landing]), targets)` holds the landing page's full path and bare title, holds a recorded key whose page lives under another name, drops a recorded key whose page is gone, and answers an unrecorded key by title. `matrixGraph.test`: an embed row reaches no edge.
- [ ] `record.ts`: `targets: z.record(z.string(), z.string()).optional()` on `contentRecord` and the Space record, documented as what each outbound link named at the delete.
- [ ] `Desktop/Store/stores.ts:137` and `memoryStores.ts:164`: `readPageRelations` answers `embed` rows too (every page → page kind); `matrixGraph.ts:32` skips `kind === 'embed'`, stating the decision there (a tile's relation relates as nothing).
- [ ] `gather.ts`: `gatherLinkTargets(tree, rel)`: the rows `readPageRelations` answers for the tree's pages at or under `rel`, plus `valueLinks` over the tree's Space values at or under it, each key mapped to the id `pageIndexOf(tree).resolve(key)` answers alone; `{}` when the index isn't ready. `gatherContentRecord` and `gatherSpaceRecord` take and spread it.
- [ ] `delete.ts`: passes `gatherLinkTargets(before, rel)` to both gatherers, `before` the tree it already reads.
- [ ] `holdings.ts`: `trashedPages(root)` lists every trashed page at the path it left, its `id` the bundle it sits in, since parking needs the bundle alone and reads no file; `parkLinks` resolves each value's key through `buildPageIndex(await trashedPages(root))` and parks a resolved one into the bundle its `id` names; `trashedTitles` goes; `trashedPagesOf(root, bundleAbs, files)` reads one bundle's pages with their written ids, for the restore (Task 8-2).
- [ ] `heldPages.ts`: `frozenWorld(index: PageIndex, targets = {})`: `holds(title)` answers by id when `targets` records the key, else by the index's holders; `restoreProperty.ts:59` and `assignment.ts:91` pass `pageIndexOf(tree)`.

**AFTER**

```Core/Trash/record.ts diff
@@ contentRecord @@
     links: z.array(strippedLink).optional(),
+    /** The page each outbound link under the artifact named at the delete, by the key it was written with, so a restore follows it by identity. */
+    targets: z.record(z.string(), z.string()).optional(),
     partial: z.literal(true).optional(),
@@ space record @@
     members: z.array(memberRoot),
+    targets: z.record(z.string(), z.string()).optional(),
     partial: z.literal(true).optional(),
```

```Core/Matrix/matrixGraph.ts diff
   for (const { path, kind, target, key } of rows.relations) {
+    // An embed is a tile's relation: it renames as a link and relates as nothing.
+    if (kind === 'embed') continue
```

```Core/Trash/gather.ts diff
+/** What each outbound link at or under `rel` named at the delete: the page a key resolved to alone, from the rows the index holds for its pages and the values the tree holds for its Spaces; nothing before the index is ready. */
+export function gatherLinkTargets(tree: NexusTree, rel: string): Record<string, string> {
+  const index = pageIndexOf(tree)
+  const out: Record<string, string> = {}
+  const note = (key: string): void => {
+    if (key === '' || key in out) return
+    const r = index.resolve(key)
+    if (r.status === 'resolved' && r.page) out[key] = r.page.id
+  }
+  const paths = pagesOf(tree).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
+  for (const row of readPageRelations(paths)?.relations ?? []) note(row.target)
+  for (const g of tree.contexts)
+    for (const s of g.spaces)
+      if (isAtOrUnder(s.path, rel)) for (const hit of valueLinks(s.values ?? {})) note(hit.target)
+  return out
+}
+
 export async function gatherContentRecord(
   root: string,
   kind: 'page' | ContainerKind,
   abs: string,
+  targets: Record<string, string>,
 ): Promise<RecordFile> {
   …
   return {
     entity: kind,
     ...(id ? { id } : {}),
     parent,
+    ...(Object.keys(targets).length ? { targets } : {}),
     ...(kind === 'page' ? {} : { excluded: await excludedWithin(root, relative(root, abs)) }),
   }
```

```Core/Trash/holdings.ts diff
-/** The newest bundle holding each page title in the Trash. */
-async function trashedTitles(root: string): Promise<Map<string, string>> { … }
+/** Every trashed page at the path it left, for resolving a name against the Trash: `id` is the bundle the page sits in, since parking needs the bundle alone and reads no file; a page's written id is `trashedHolders`' business. */
+async function trashedPages(root: string): Promise<ConnPage[]> {
+  const out: ConnPage[] = []
+  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
+    if (!artifactName) continue
+    const bundle = join(root, bundlePath)
+    for (const file of await contentPages(record.entity, join(bundle, artifactName))) {
+      const path = deletedPathOf(root, bundle, file)
+      out.push({ id: bundle, title: titleFromPath(path), path })
+    }
+  }
+  return out
+}
+
+/** One bundle's pages as they were, with the ids their files carry, at the paths they left. */
+export async function trashedPagesOf(
+  root: string,
+  bundleAbs: string,
+  files: readonly string[],
+): Promise<ConnPage[]> {
+  const out: ConnPage[] = []
+  for (const file of files) {
+    const id = stampedId((await readTextOrNull(file)) ?? '')
+    const path = deletedPathOf(root, bundleAbs, file)
+    if (id) out.push({ id, title: titleFromPath(path), path })
+  }
+  return out
+}
 
-/** A Link value dropped for naming a page the Trash holds joins that page's newest bundle, so the page's restore writes it back. */
+/** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */
 export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
   if (!links.length) return
-  const newest = await trashedTitles(root)
+  const index = buildPageIndex(await trashedPages(root))
   const parked = new Map<string, StrippedLink[]>()
   for (const link of links) {
     const page = readLinkText(link.value)
-    const bundle = page?.kind === 'page' && newest.get(normalizeTitle(page.title))
+    const bundle = page?.kind === 'page' ? index.resolve(page.title).page?.id : undefined
     if (bundle) parked.set(bundle, [...(parked.get(bundle) ?? []), link])
   }
   for (const [bundle, rows] of parked) await appendLinks(bundle, rows)
 }
```

```Core/Nexus/heldPages.ts diff
-/** A restore's world: the pages the tree holds, and those landing with it. */
-export function frozenWorld(tree: NexusTree, landing: readonly string[] = []): Frozen {
-  const index = pageIndexOf(tree)
-  const arriving = new Set(landing.map(normalizeTitle))
-  return {
-    holds: (title) => index.holders(title).length > 0 || arriving.has(normalizeTitle(title)),
-  }
-}
+/** A world a value is read against, answering by identity where `targets` recorded what a key named at the delete, and by the name otherwise. */
+export function frozenWorld(index: PageIndex, targets: Record<string, string> = {}): Frozen {
+  return {
+    holds: (title) => {
+      const id = targets[pageKey(title)]
+      return id === undefined ? index.holders(title).length > 0 : index.byId.has(id)
+    },
+  }
+}
```

**VERIFY**

- [ ] The listed tests pass; `spend.test.ts:1031` passes; `git grep -n "trashedTitles" -- Core` finds nothing; the Matrix's graph tests pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 8-2

**TASK:** Let the restore repair the links of what it lands by identity, run one cascade over the live world for its arrival and for the keys that named only a trashed page, refill the stripped values through the same per-key decision against the world after the landing, and carry the cascade in its reply; extract the cascade's per-file rewrite and the scrub's artifact listing so the repair reuses both.

**NOW:** `restoreArtifact` (`spend.ts:131-`) builds `frozen` from landing titles (`:170-176`), scrubs the artifact in the Trash (`scrubReturning`, frontmatter only, listing the artifact's pages at `restoreScrub.ts:51` and sidecars at `:69-71`), relocates it, and refills `record.links` with `landed === was ? l.value : rewriteConnections(l.value, was, landed)` (`:264-265`), a title swap for a page landed under a disambiguated name, checked against the delete-time world; nothing repairs the returning page's own links to pages renamed or moved while it sat in the Trash, and nothing re-spells live links for its arrival or for its old path. `renameCascade`'s per-file rewrite (`cascade.ts:197-230`, the `patchOf`, `withPatch`, `spaceMoved`, and `text` closures) is reachable only through a cascade. `Restored` (`spend.ts:118`) picks `unrestored` alone. The renderer flushes pending saves before rename, move, heading rename, and delete (`nexusSlice.ts:236-239`), not before a restore.

**CHANGE**

- [ ] Write and watch fail: `spend.test.ts` (restore): a page whose body links `[[Beta]]`, embeds `![[Beta]]`, and holds `Related: [[Beta]]` returns after Beta was renamed `Gamma` with all three reading `Gamma`, after Beta moved to another Set with all three as written, and after Beta was deleted with the body as written and the value dropped and parked into Beta's bundle; a page restored with a destination after its Set was deleted lands under the Collection and a live linker's `[[Daily/Alpha]]` reads `[[Notes/Alpha]]` while its `[[Alpha]]` stays; a page returning while a twin created meanwhile holds its title in another folder leaves the twin's bare linkers reading `[[Other/Alpha|Alpha]]`, and a stripped `[[Alpha]]` refills as `[[Notes/Alpha|Alpha]]`; a page returning as `Alpha 2` beside a new `Alpha` in its own folder refills a stripped `[[Alpha]]` as `[[Alpha 2]]` and reports nothing unrestored; the reply's `cascade.pages` names the live linker; `:1031` passes; a bundle without `targets` restores as today. `restoreScrub.test.ts:320` passes; a Link naming a page renamed meanwhile is kept by the scrub (`targets`) and repaired after the landing. `cascade.test.ts` passes through the extraction unchanged. `nexusSlice.test`: `restore` flushes pending saves.
- [ ] `cascade.ts`: `fileRewrites(root, tree, rewrite, { ownRel?, settled? }): { text: RewriteText; spaceMoved: Rewrite }` hoists the closures, `ownRel` the heading arm's own page (Task 2-1's `own`) and `settled` whether its editor already rewrote its body; `renameCascade` calls it.
- [ ] `restoreScrub.ts`: `artifactFiles(root, abs): Promise<{ pages: string[]; sidecars: string[] }>` hoists the scrub's two listings; `scrubReturning` reads it; `repairLanded(root, tree, targetAbs, repair)` sweeps the landed pages through `sweepGovernedRoots(root, pages, { text })` and the landed sidecars through `rmwJsonStrict(file, (raw) => spaceMoved(raw, file))`, both from `fileRewrites(tree, (t) => rewriteConnections(t, repair))`, and answers the files it couldn't write.
- [ ] `spend.ts`: `back = await trashedPagesOf(root, bundleAbs, await contentPages(record.entity, artifactAbs))` before the scrub; the scrub's `frozen = frozenWorld(buildPageIndex([...pagesOf(tree), ...back]), targets)`; after the relocate, `after = await settledIndex(root)`; `repair` maps each recorded key to `after.respell(key, q)` for the page `q` its id names now; `named = respellings(buildPageIndex(back), after, ids, [])` and `names = respellings(pageIndexOf(tree), after, [], ids)` plus every `named` entry whose key resolved to nothing in the live world before; the repair runs, then `renameCascade(root, { names, label: title })`, then the refill through `rewriteConnections(l.value, named)` against `frozenWorld(after)`; `was` and `landed` go; `Restored` picks `cascade` too, the repair's unwritten files joined in through `joinCascades`.
- [ ] `nexusSlice.ts:236-239`: `restore` joins the ops that flush pending saves.
- [ ] `mutate.ts`'s `restore` case runs under `inSettleTurn` alone (Task 6-3), so `settledIndex` here reads inside the turn and nothing awaits another.

**AFTER**

```Core/Nexus/cascade.ts diff
+/** The per-file arm every cascade shares: a page's body and each Link or Text value through `rewrite`, a Space sidecar's values alone. `settled` says `ownRel`'s editor already rewrote its body; its frontmatter still takes the patch. */
+export function fileRewrites(
+  root: string,
+  tree: NexusTree,
+  rewrite: (text: string, own?: boolean, outlineOf?: string) => string,
+  arms: { ownRel?: string | null; settled?: boolean } = {},
+): { text: RewriteText; spaceMoved: Rewrite } {
+  const holds = linkKeysOf(tree.config.registry)
+  const patchOf = … (as today)
+  const withPatch = … (as today)
+  const spaceMoved: Rewrite = (raw) => withPatch(raw, patchOf(raw, holds))
+  const text: RewriteText = (content, file) => {
+    … (as today, with `rel = relative(root, file)`, `own = rel === arms.ownRel`, and `own && arms.settled` keeping the body)
+  }
+  return { text, spaceMoved }
+}
@@ renameCascade @@
-    const patchOf = …
-    const withPatch = …
-    const spaceMoved: Rewrite = …
-    const text = …
+    const { text, spaceMoved } = fileRewrites(root, tree, rewrite, { ownRel: heading?.path, settled })
```

```Core/Trash/restoreScrub.ts diff
+/** A returning or landed artifact's governed files: its pages, and the Space sidecars under it. */
+export async function artifactFiles(
+  root: string,
+  abs: string,
+): Promise<{ pages: string[]; sidecars: string[] }> {
+  const pages = isMarkdownFile(abs) ? [abs] : await listMarkdownFiles(abs)
+  const sidecars = (
+    await listPathsUnder(root, abs, (rel, kind) =>
+      kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
+    )
+  ).map((rel) => join(root, rel))
+  return { pages, sidecars }
+}
@@ scrubReturning @@
-  const pages = isMarkdownFile(absArtifact) ? [absArtifact] : await listMarkdownFiles(absArtifact)
+  const { pages, sidecars } = await artifactFiles(root, absArtifact)
   …
-  const sidecars = await listPathsUnder(root, absArtifact, (rel, kind) =>
-    kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
-  )
-  for (const rel of sidecars)
-    await rmwJsonStrict(join(root, rel), (raw) => {
+  for (const file of sidecars)
+    await rmwJsonStrict(file, (raw) => {
@@ end @@
+/** A returning artifact's own links, repaired where it landed (F-5): each key the delete recorded re-spells to the current name of the page it named, through the cascade's per-file arm, and a key whose page is gone stays as written. Answers the files it couldn't write. */
+export async function repairLanded(
+  root: string,
+  tree: NexusTree,
+  targetAbs: string,
+  repair: ReadonlyMap<string, string>,
+): Promise<string[]> {
+  if (!repair.size) return []
+  const { text, spaceMoved } = fileRewrites(root, tree, (t) => rewriteConnections(t, repair))
+  const { pages, sidecars } = await artifactFiles(root, targetAbs)
+  const { skipped } = await sweepGovernedRoots(root, pages, { text })
+  for (const file of sidecars) await rmwJsonStrict(file, (raw) => spaceMoved(raw, file))
+  return skipped
+}
```

```Core/Trash/spend.ts diff
@@ imports @@
-import { rewriteConnections } from '../Connections/rewrite'
+import { respellings, rewriteConnections } from '../Connections/rewrite'
+import { buildPageIndex } from '../Connections/pageIndex'
+import { pageIndexOf, pagesOf } from '../Nexus/record'
+import { settledIndex } from '../Nexus/settle'
+import { repairLanded, scrubReturning } from './restoreScrub'
+import { contentPages, pageIdsOf, parkLinks, refillTrashed, trashedPagesOf } from './holdings'
+import { deleteCascade, joinCascades, type StrippedLink } from '../Nexus/cascade'
@@ Restored @@
-type Restored = Pick<MutateOutcome, 'unrestored'>
+type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade'>
@@ restoreArtifact @@
-  const was = titleFromPath(artifactAbs)
-  const landed = record.entity === 'page' ? titleFromPath(finalName) : was
-  const frozen = frozenWorld(
-    tree,
-    record.entity === 'page'
-      ? [landed]
-      : (await contentPages(record.entity, artifactAbs)).map(titleFromPath),
-  )
+  // The pages coming back, at the paths they left: the world a link written before the delete named them in.
+  const back = await trashedPagesOf(root, bundleAbs, await contentPages(record.entity, artifactAbs))
+  const targets = 'targets' in record ? (record.targets ?? {}) : {}
+  const frozen = frozenWorld(buildPageIndex([...pagesOf(tree), ...back]), targets)
   …
   (relocate as today)
   …
+  // The page is out of the Trash: its own links repair by identity first, then the live world re-spells once for its arrival (E-3) and for every key that named only a trashed page (F-2), then the values the delete stripped come back through the same decision, read against the world as it stands now.
+  const after = await settledIndex(root)
+  const ids = back.map((p) => p.id)
+  const named = after ? respellings(buildPageIndex(back), after, ids, []) : new Map<string, string>()
+  let cascade: CascadeReport | undefined
+  if (after) {
+    const repair = new Map<string, string>()
+    for (const [key, id] of Object.entries(targets)) {
+      const q = after.byId.get(id)
+      const next = q && after.respell(key, q)
+      if (next) repair.set(key, next)
+    }
+    const unrepaired = await repairLanded(root, tree, targetAbs, repair)
+    const live = pageIndexOf(tree)
+    const names = respellings(live, after, [], ids)
+    for (const [k, v] of named) if (live.resolve(k).status === 'phantom') names.set(k, v)
+    cascade = names.size ? await renameCascade(root, { names, label: title }) : undefined
+    if (unrepaired.length) {
+      const left = { pages: [], hosts: [], warning: unsweptLine(unrepaired.length, `links in “${title}” across `) }
+      cascade = cascade ? joinCascades(cascade, left) : left
+    }
+  }
   const roots = recordById(tree)
   …
+    const refilled = frozenWorld(after ?? pageIndexOf(tree))
     for (const def of defs) {
       const all = Object.fromEntries(
         record.links
           .filter((l) => l.property === def.id)
-          .map((l) => [
-            l.page,
-            landed === was ? l.value : rewriteConnections(l.value, was, landed),
-          ]),
+          .map((l) => [l.page, rewriteConnections(l.value, named)]),
       )
-      const taken = await refillValues(root, def, roots, all, frozen)
+      const taken = await refillValues(root, def, roots, all, refilled)
   …
-  return ok(restored([...unspent, ...unlinked].map((id) => roots[id].title)))
+  return ok({
+    ...restored([...unspent, ...unlinked].map((id) => roots[id].title)),
+    ...(cascade ? { cascade } : {}),
+  })
```

```Core/Session/nexusSlice.ts diff
-      if (moves || req.op === 'renameHeading' || req.op === 'delete') await flushAllSaves()
+      if (moves || req.op === 'renameHeading' || req.op === 'delete' || req.op === 'restore')
+        await flushAllSaves()
```

(`roots`, read from the tree before the relocate, is unchanged in meaning: the refill's targets are the live roots the delete stripped from. `title` is the resolver's final title, already in scope.)

**VERIFY**

- [ ] The listed tests pass; `spend.test.ts:800-1005` pass unchanged; `restoreScrub.test.ts` passes.
- [ ] Live, in `~/Test`: delete a page another page links by `[[Set/Page]]`, delete its Set, restore the page to the Collection, and the linker reads `[[Collection/Page]]` with the notice; delete a page that links and embeds a second page, rename the second, restore the first, and both follow; delete a page, create a twin elsewhere, link the twin bare from a third page, restore the first, and the third page's link gains the twin's path.
- [ ] Run the gates, then `view-delta` for Phase 8.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Two `closeout-review` agents, reading outward: no title-keyed Trash lookup remains (`normalizeTitle` in `holdings.ts`, `was`/`landed` in `spend.ts`); parking reads no page file; the repair runs before the cascade and only over the landed files; the cascade's `names` never carries a key the live world resolved before (the phantom filter), so a live `[[Notes]]` meaning a live page is never rewritten by a restore; the refill is checked against the world after the landing; `fileRewrites` is the only per-file arm and `artifactFiles` the only artifact listing; a bundle without `targets` restores through `frozenWorld`'s name arm with no second code path; a Space restore's `targets` reach `frozenWorld` through the scrub and `repairLanded` through its sidecar, with `back` empty.

---

### Phase 9 — Reconciliation

**GOAL:** Every living document and comment reads true of the code Phases 1 through 8 leave, by surgical rewrite of the sentences they falsify, with nothing amended, superseded, or narrated; the one issue the Trash change resolves is closed and the one it re-words is re-worded; the Decisions document's A-2 clause reads per the alias ruling. No production code changes here.

#### Task 9-1

**TASK:** Rewrite each listed sentence, close F-038 and re-word F-039 through the `batch-issues` skill, correct the two source comments, and settle A-2's Obsidian clause.

An `opus-low` agent makes the document edits, each surgical and no longer than the sentence it replaces (the owner, 10-17-2026); a source comment changes only where the landed code falsifies it.

**NOW:** `ConnectionsPM.md` says a connection "resolves by its title", that a path separator in a markdown target "addresses something outside the Nexus", that main holds "the title index for its own checks — whether a title is still held outside a delete", that the cascade rewrites "every body that names the old title", and that "renaming or deleting one of two same-titled pages rewrites and strips nothing"; its picker line says "matched by title prefix" and its *Prospects* still propose "Duplicate disambiguation — id-scoping". `PagesPM.md:14` says a connection to a shared title "resolves as ambiguous" with no way out; `NavigationPM.md:12` and `ViewTypesPM.md:75` describe two title-only searches; `PommoraUIX.md:364` lists `emphasizeMatch`; `InterfacePM.md:42` writes Copy Link as `[[Title]]`; `NexusRecordPM.md:10,14` describe the bundle and the restore without the recorded targets or the repair; `CorePM.md:83,87,155` and `DesktopPM.md:14,22` describe the index, the dispatcher, and the watcher without the ID column, the address turn, or the pairing; the project's `CLAUDE.md:19` says links "resolve against an in-memory title map". `IssuesPM.md`'s F-038 describes a Trash refill that identity resolves, and F-039's description names "a same-titled page still in the Trash". `connections.ts:128` and `linkValue.ts:180` say "by title".

**CHANGE**

- [ ] `Features/ConnectionsPM.md`:
  - `:4` — "the wikilink `[[Title]]` and the Markdown link `[Alias](Title)` whose target names a page" reads "the wikilink `[[Name]]` and the Markdown link `[Alias](Name)`, where a name is a page's title or any tail of its Nexus path, `Folder/Title`".
  - `:8` — after the normalization sentence: "A written name also drops a trailing `.md`, and the one key every side reads is that folded, extension-less name."
  - `:10` — "`[[Title]]` resolves by its title" reads "`[[Title]]` resolves by its title and `[[Folder/Title]]` by the tail of its path; Pommora writes the path form only where a title is shared, with the title as its alias, as Obsidian does" (the alias clause per the ruling under *§Open Items*).
  - `:11` — "A target whose page half carries a scheme or a path separator addresses something outside the Nexus and is never read as a page title, so a URL can't reach a page by its last segment." reads "A target whose page half carries a scheme addresses something outside the Nexus and is never read as a page name; one holding `/` and no scheme is a path to a page."
  - `:18–22` — "Every title the scanner finds" reads "Every name the scanner finds"; **Resolved** reads "the name is a page's full path, or exactly one Page's path ends with it"; **Ambiguous** reads "more than one Page's path ends with it, so no target can be chosen. The link is muted and inert until one side is renamed or the link gains a longer path"; **Phantom** gains "A click on a link that doesn't resolve seats the caret in its name, in the editor, a resting cell, and a Link value's field alike, so the one gesture that can fix it is the one offered"; `:22` reads "Main holds the same index for its own decisions, what each written name resolves to before and after a change, and resolves no link for display."
  - `:26` — the first sentence reads "A connection resolves by its written name, so renaming or moving a page, or renaming or moving a folder its path runs through, rewrites every link that resolved to the page before so it resolves to it after, by one rule: a link whose tail is unchanged is left as written, one whose tail changed takes the page's new name at the depth it was written, and a bare link whose title comes to be shared gains the full path. A page created, renamed, or restored onto a title another page holds re-spells that page's bare links the same way." The rest of the paragraph stands. A new closing sentence: "A rename or move made outside Pommora is paired by the page's ID at the next settle, whichever order its two file events arrived and however many batches apart, or at the next open for one made while the app was closed, and takes the same rewrite, logged rather than noticed."
  - `:28` — "on its own page, in every file the index names, and in every markdown tile" reads "on its own page, in every file the index names under the page's own names, and in every markdown tile that links one"; a closing sentence: "A heading rename on one of two same-titled pages moves only the links that resolve to that page."
  - `:30` — "A title another page still holds is left to that page: renaming or deleting one of two same-titled pages rewrites and strips nothing." reads "A delete strips a value only where its name resolves to nothing afterwards, so a name another page still answers is left to that page. A restore repairs the returning page's own links to pages renamed or moved while it sat in the Trash, re-spells the live links that named its old path or that its arrival makes shared, and refills the stripped values to the page each named, by identity; **Restore Links On Deletion** governs the refill alone."
  - `:57` — "Pages nexus-wide, matched by title prefix" reads "Pages nexus-wide, matched by the one search rule over their titles and their folders, a pick written as the page's name; the list closes once the typed name resolves".
  - `:78` — the **Duplicate disambiguation** prospect goes.
- [ ] `Features/PagesPM.md:14` — "and a connection to a shared title resolves as ambiguous." reads "and a connection names one of them by its path, a bare link to a shared title reading as ambiguous until it gains one."
- [ ] `Features/NavigationPM.md:12` — "a title-based subsequence scan over the in-memory tree, memoized per tree" reads "the one search rule (`matchScore`) over each entity's title and the folders above it, memoized per tree".
- [ ] `Features/ViewTypesPM.md:75` — "those whose titles hold its letters in order" reads "those the one search rule matches by title or by the path below the container".
- [ ] `Features/PommoraUIX.md:364` — the **Match** row goes.
- [ ] `Features/InterfacePM.md:42` — "Copy Link (`[[Title]]`)" reads "Copy Link (`[[Title]]`, or the page's path where its title is shared)".
- [ ] `Features/NexusRecordPM.md`: `:10` — after "plus each Link value their delete stripped from a page or Space outside them, keyed by that holder's id and the property's": ", and the page each outbound link under them named at the delete, by the name it was written with"; `:14` — after the reconciliation sentence: "Once it lands, its own links are repaired to the current names of the pages they named, the live world is re-spelled for its arrival and for the names that named only it, and the stripped values come back to the page each named, through the one rule the rename cascade uses."
- [ ] `Features/CorePM.md`: `:83` — "the page index both processes resolve titles through" reads "the page index both processes resolve names through"; `:87` — after the dispatcher sentence: "An operation that changes a page's address runs inside the settle's own turn, so no payment of an outside move interleaves with it, and returns the links it re-spelled."; `:155` — the Content index row's "and the mtime and size it was read at" reads "the ID it carries, and the mtime and size it was read at".
- [ ] `Features/DesktopPM.md`: `:14` — after "the write's gate settles what moved and pushes it before the reply leaves": ", an address-changing write holding the settle's turn through its own re-spell"; `:22` — a closing sentence: "A page whose rows leave one path and whose ID the tree then holds at another is paired at the settle as a move, and its links follow it."
- [ ] `.claude/CLAUDE.md:19` — "inline `[[Title]]` colored-text links inside MarkdownPM surfaces and resolve against an in-memory title map built from the page tree" reads "inline `[[Title]]` and `[[Folder/Title]]` colored-text links inside MarkdownPM surfaces that resolve against an in-memory index built from the page tree".
- [ ] `IssuesPM.md`, through `batch-issues`: F-038 closes as resolved by this plan (the refill names the page each value named, by identity, so the first restore brings back the values that named it); F-039's description reads "to the page each value named, still in the Trash, through `parkLinks`, which lists every bundle and each Set or Collection bundle's pages once per call", its measurement and solution unchanged.
- [ ] Comments: `connections.ts:128` reads "A page named by title or by a tail of its path, and by heading where the link names one"; `linkValue.ts:180` reads "the page it resolves to, by its written name". Then `git grep -n "by title\|title map\|newest bundle\|same-titled" -- Core --include='*.ts' --include='*.tsx' | grep -v test` and rewrite any remaining comment the change falsifies.
- [ ] *Path Links — Decisions* A-2: under the alias default, "matching what Obsidian's own writer produces" stands; under the no-alias ruling it reads "in Obsidian's path form without its alias".

**VERIFY**

- [ ] Each listed sentence reads as written here; no document holds "resolves by title", "title index", "title prefix", or "same-titled" in a sentence the plan made false (`grep -rn -i` over `.claude/Features` and `.claude/CLAUDE.md`).
- [ ] `IssuesPM.md`'s totals row reflects the closure.
- [ ] Run the gates (lint reads the comments).

---

### Completion Criteria

- **Conformance:** every change sits under *§Constraints*; no mechanism landed that an existing one already provided (one key, one naming rule, one keys rule, one per-key decision, one map, one matcher, one click arm, one Trash index, one per-file rewrite); nothing changed outside the files the tasks name, and `Core/Sync/`, the Matrix's drawing, Project Sapphire, and the settings set are untouched.
- **Correctness:** each of the owner's six principles is observably true in `~/Test` as the VERIFY lines exercise them: a shared title writes a path and a unique one a bare title; `[[Folder/Title]]`, `[[Title.md]]`, and `[Alias](Folder/Title)` resolve as Obsidian reads them; a rename, a move, a folder rename, a create onto a held title, a Finder move, and a restore each leave every link that named the page resolving to it; one search rule answers every surface; an unresolved link's click seats the caret in its name everywhere a link rests; the Trash resolves by identity.
- **Completeness:** every task and checkpoint in *§Process Overview* is ticked; every removal the tasks name is gone (`titleKey`, `spacesLinkHeading`, `titleHeldOutside`, `emphasizeMatch`, `matchText`, `BlockMenuRow`, `matchAt`, `tilesLinkHeading`, `oweRenames`, `trashedTitles`, `EditorHost.pageTitle`, `RenameChange`); no scaffolding, debug output, or unauthorized TODO remains.
- **Confirmation:** every "write and watch fail" test went red before its change and green after; every VERIFY ran and its output was read; the live checks the owner takes carry the owner's word in the task that names them.
- **Continuity:** *§Reconciliation* is walked; the documents Task 9-1 names read true; every deviation is fixed or ruled on under *§Deviations*.
- **Confidence:** the three gates are green from a clean checkout at HEAD; `view-delta <BASELINE>..HEAD` is reported with additions and removals apart, per phase and in total, against the count under *§Overview · The Number*, and growth past it states what it bought.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried over as a known gap.

- [ ] **Simplification lens** — one `opus-xhigh` agent reads `<BASELINE>..HEAD` whole for what can be removed, folded, or hoisted now that every phase has landed: duplicated decisions, a helper used once, a guard whose cause the plan removed, a type arm no caller reaches. Its findings are applied before any adversarial read.
- [ ] **Adversarial lens** — two `opus-xhigh` agents, each over `<BASELINE>..HEAD` and the six principles, one reading inward (correctness of each rule against its tests and the Decisions) and one outward (cohesion with the rest of Core, Desktop, and UIX; anything that reads as an odd-one-out). Findings are verified by the orchestrator against the code before any is applied.
- [ ] **Neutral verification** — one `fable-high` agent, given only the BASELINE head, HEAD, and the intention under *§Constraints · Neutral Gate*, with no plan, log, or document, answers whether the mandate holds and what it would correct.
- [ ] **The orchestrator's own pass** — the live checks in `~/Test` run once more end to end as the owner would use them; the gates from a clean state; `view-delta` totals.
- [ ] **Reconciliation** — *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [ ] **Report** — the owner receives the final delta per phase and in total, every deviation, the neutral reviewer's answer verbatim, and the open items that remain the owner's, through `c/save-delta`.

#### Reconciliation

- [ ] `Features/ConnectionsPM.md`, `PagesPM.md`, `NavigationPM.md`, `ViewTypesPM.md`, `PommoraUIX.md`, `InterfacePM.md`, `NexusRecordPM.md`, `CorePM.md`, `DesktopPM.md` read true (Task 9-1).
- [ ] `.claude/CLAUDE.md:19` reads true (Task 9-1).
- [ ] `IssuesPM.md`: F-038 closed, F-039 re-worded, totals current (Task 9-1).
- [ ] *Path Links — Decisions* A-2 reads per the alias ruling; *Other Workstreams* in the Decisions and this plan name the generation as 18 and the HEAD the plan was ratified at.
- [ ] `ContextPM.md` and `HandoffPM.md` carry the plan's completion in their own voice (where-things-stand and the next session's focus); `HistoryPM.md` only if the owner asks.
- [ ] The Dashboard's line ledger reflects the final delta through its own hooks (no manual edit).
- [ ] This plan's STATUS reads `Complete MM-DD-YYYY — <BASELINE>..<HEAD>` and BASELINE's End is filled.

#### Open Items

Each ruling below was the planner's (10-16-2026), taken against the BRIEF's principles with the owner away; any can be overturned at ratification, and the task it names says what changes.

- **The alias on a path link: written.** The plan writes `[[Folder/Title|Title]]` wherever it spells a path with no heading and no shown text (Tasks 1-3, 3-2, 6-1, through `carriesTitleAlias`), as Obsidian's writer does since 1.3, so a reader that doesn't understand paths still reads the title; A-2's "matching what Obsidian's own writer produces" stands. Overturning: the predicate returns false, `repeatsTarget` compares the basename, and A-2's clause is corrected (Task 9-1).
- **Trash namesakes: nowhere.** A parked value whose name two trashed pages answer parks nowhere (Task 8-1); it was ambiguous before the delete and is dropped as ambiguous, the one rule the live resolver applies.
- **Search noise: accepted.** The one matcher admits a page whose folder matches into surfaces that keep their own order, so a view search for `Daily` lists every page under a `Daily` Set among the title matches. One rule everywhere outweighs a per-surface exception (D-1).
- **The default name is no arrival.** A page created under `Untitled` runs no collision arm, since it's uncommitted; its first commit arrives, without moving, so a stale `[[Untitled]]` elsewhere never follows (Task 6-3). A create under any other name arrives at once.
- **Restore Links On Deletion** governs the refill alone (Task 8-2); the returning page's own repair and the live re-spell run regardless, since they correct links rather than restore values.
- **An ID-less returning page** (one never stamped before its delete) is scrubbed and repaired but runs no collision or follow arm until the walk stamps it (Task 8-2's `back` holds stamped pages); the settle's stamp then owes it as an arrival (Task 7-1).
- **The outside lane's before-index** is built once per settle that pairs a move or reads an arrival, over every page the tree holds (Task 7-2); a sync landing many renames one batch at a time builds it once per batch. Measured in the Phase 7 live check; an incremental index is a follow-up if it shows.
- **Unpaired vanishes** stay in the record until the Nexus closes (Task 7-1), one map entry per outside delete, each settle an O(1) lookup per entry; an id that returns later at another path is read as a move, which is the right reading.
- **A paired id before the index is ready** (`readIndexedStat` answers null, so the pairing remembers the id as pending) lingers like an unpaired vanish, one set entry, until a landed row names it or the Nexus closes.
- **An index row lost** (a page the index somehow holds no row for, re-saved outside) is read as an arrival at its next watched write (Task 7-2), so a title it shares with one live page path-spells that page's bare links once; those links were ambiguous already, and the index losing a row is itself a defect to find.
- **Sync:** a receiving device may re-spell a linker locally before the sender's own rewrite of that linker arrives; the plan leaves what Sync's conflict capture then does unverified and out of scope (*§Constraints · Out of Scope*), to be read when the Sync lane is next worked.
- **The picker closes on a typed title that resolves.** `[[` auto-pairs `]]`, so a link being typed reads as finished; typing `[[Notes]]` beside a `Notes Archive` closes the pane when `Notes` resolves, and one more character reopens it. The heading and alias arms have always closed on an exact match the same way, so the title arm joins them (Task 3-2) rather than carrying a rule of its own; the owner can overturn (about five lines, closing only a query the caret arrived at).
- **An emptied `#` on a path link** collapses to `[[A/Notes]]` without the title alias, since the settle drops the slot as text rather than rewriting the link; Pommora reads it the same, and the next re-spell writes it through the writer.
- **The Number:** the count exceeds the BRIEF's band (*§Overview · The Number*); the planner's call is to keep Phases 7 and 8, since E-4 and F-5 are mandates and a deferral would leave them half-done. The owner rules at ratification.

#### Deviations

| # | Phase | Deviation | Ruling |
| - | ----- | --------- | ------ |
