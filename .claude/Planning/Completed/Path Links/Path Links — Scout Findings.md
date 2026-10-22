### Path Links — Scout Findings

**DATE:** 10-16-2026

The verbatim briefs and reports of every scout dispatched while *Path Links — Decisions* was drafted (Rounds 1 to 3) and while *Path Links — Plan* was scouted at HEAD (Rounds 4 and 4B, two planning windows that scouted the same lanes in parallel), kept so a later session's own scouts can return to the sources and insights these rounds turned up. Each report reflects the decisions standing when it was briefed; the note under each heading names what a later decision superseded. *Path Links — Decisions* is authoritative wherever the two differ, and the notes cite its decisions by letter; every citation in a report is a lead to re-verify at the planning session's HEAD rather than a settled fact.

#### Mechanism Forks

Three choices of mechanism the scouts left contradicting each other, with the lean the decisions imply; each is the planner's call, re-verified at HEAD.

1. **The index's link key.** Round 1's cascade scout kept `relations.target` a title key beside a written-folder column; round 2's read and cascade scouts stored the key as written (a bare title, a partial path, or a full path) with no schema change. With partial paths (A-4), the files linking a page are found by every tail of its path as a key (its title, each partial tail, its full path), each an exact indexed query, which the written key serves with no new column. Lean: the written key.
2. **The occurrence's shape.** Round 1 added a `folder` span beside `title`; round 2's read scout counted the touch sites and kept `title` as the whole page half, splitting at its last `/` only where the basename is read, since the picker's query and every slot reader need the whole half. Lean: the whole half.
3. **Candidate files for a folder rename or move.** Round 2's cascade scout proposed one prefix-range query over `relations.target`; a partial-path link (`pommora/claudemd`) is invisible to a prefix range, so queries over each moved page's path tails are what partial paths need. Lean: per-page tail queries through the existing query, unless measurement argues otherwise.

#### Index

| Round | Scout | Model | Status |
|---|---|---|---|
| 1 | Read, Resolve, and Draw | `opus-high` | Saved |
| 1 | Writers and the Picker | `opus-high` | Saved |
| 1 | Cascades | `opus-high` | Saved |
| 1 | Obsidian Path Semantics | `sonnet-medium` | Saved |
| 2 | Triggers and External Moves | `opus-high` | Saved |
| 2 | Cascade and Rewrite Reuse | `opus-high` | Saved |
| 2 | Read, Draw, and Pick Reuse | `opus-high` | Saved |
| 3 | Every Search Matcher | `opus-high` | Saved |
| 3 | Unresolved Link Clicks | `opus-high` | Saved |
| 4 | Grammar, Reader, Index Key, and Resolver | `opus-high` | Saved |
| 4 | Writers, the Picker, and Drawing | `opus-high` | Saved |
| 4 | One Search Matcher | `opus-high` | Saved |
| 4 | The Unresolved-Link Click Rule | `opus-high` | Saved |
| 4 | In-App Re-Spell, Collisions, and the Gate | `opus-high` | Saved |
| 4 | The Outside-Move Lane | `opus-high` | Saved |
| 4 | The Trash Record and Repair | `opus-high` | Saved |
| 4B | Grammar, Reader, Resolver, and Every Drawing Surface | `opus` | Saved |
| 4B | The Content Index Link Key, Its Queries, Self-Links, and the Matrix | `opus` | Saved |
| 4B | Every Writer of a Page Link, and the Picker | `opus` | Saved |
| 4B | The In-App Re-Spell Cascade, Collisions, and the Heading Twin | `opus` | Saved |
| 4B | The Outside-Move Lane, Pairing by ID, Closed-App Catch-Up, and the Gate | `opus` | Saved |
| 4B | The Trash Record and Repair | `opus` | Saved |
| 4B | The One Search Matcher | `opus` | Saved |
| 4B | The One Click Rule for Unresolved Links | `opus` | Saved |

---

### Round 1 — Read, Resolve, and Draw

**MODEL:** `opus-high`
**SUPERSEDED:** Briefed before partial paths were ruled in: its exact-path resolution and second path map are superseded by A-4 (a path names its full-path page first, otherwise the one page whose path ends with it). Its option to fold Ambiguous into Phantom was ruled against (B-2).

#### Brief

You are a read-only scout for a planning session in Pommora (repo root: `~/The Studio/Projects/Project Pommora`). Don't edit any file. Your job is to map one domain of the codebase completely and report evidence, with your own assessments and proposed approaches.

##### The Mandate (the owner's words, condensed)

Pommora should "resolve" duplicated page titles: when the user picks a page whose title another page also holds, the link is written in path form using the same syntax Obsidian uses for path/file disambiguation (e.g. `[[Folder/Sub/Title]]`, `[Label](Folder/Sub/Title)`). If a link still can't resolve to exactly one page, it renders as a phantom. Renaming and moving any page, and any folder a path link passes through, must cascade coherently. The system must work identically through shared logic, with no second definition, across every format: wikilinks, markdown links, embeds, links inside Link and Text property values, table cells, markdown tiles, "and more". It must reuse the existing architecture and read as always-intended.

##### Background You Need

- A Nexus is a user folder; pages are Markdown files inside Collections (folders with `_pagecollection.json`) and Sets (subfolders). A page's **title is its file basename** without `.md` (`titleFromPath`, `Core/Paths/posix.ts:80`), and its `path` is the Nexus-relative POSIX path (`Core/Nexus/tree.ts`). Two pages in different folders can share a title; today such a link reads **Ambiguous** (muted, inert).
- A large restructure just landed (`abfbf0798..0d686c2e9`): one grammar (`Core/Connections/connections.ts`, `links.ts`), one occurrence shape (`LinkOccurrence`), one reader (`readOccurrence`/`readLinkText` → `LinkTarget`), one resolver (`resolveLink` in `linkValue.ts`), one title index (`buildPageIndex` in `pageIndex.ts`, built from the one tree walk in `Core/Nexus/record.ts`), one index scan (`scan.ts` `linksIn` → `LinkHit`). Read `.claude/Features/ConnectionsPM.md` first; it describes the current behavior.
- Today `namesPage` (`links.ts`) refuses any markdown destination whose page half holds `/` or a scheme ("a URL can't reach a page by its last segment"). A wikilink title slot already admits `/`, but `[[A/Notes]]` resolves as the title `A/Notes`, which nothing holds.

##### Your Domain: The Read and Resolve Path, and Every Surface That Draws a Link

Map, with file:line citations:

1. **Every consumer of resolution**: every caller of `PageIndex.resolve`, `PageIndex.holders`, `resolveLink`, `namedPage`, `readOccurrence`, `readLinkText`, `targetTitle`, `targetNamesFile`, `namesPage`, `wikiTitle`, `pageLabel`, and any place that compares link title keys by `normalizeTitle` equality instead of resolving. Note which run in the renderer, which on the host, and which on a keystroke/caret/decoration hot path.
2. **The content index**: how `LinkHit.target`/`qualifier` become relation rows (`Core/Index/`, `indexSeed.ts`, `Desktop/Store/ddl.ts`, `stores.ts`), what `queryMentions`/`queryHeadingMentions` key on, and how the Matrix graph (`Core/Matrix/`) turns relation rows into page-to-page edges (does it resolve the title through the index, and what does it do with ambiguous titles?). What would a path-qualified link need to be stored as so title queries still find it, and so the graph resolves it?
3. **Every drawing surface**: the editor's tokens and decorations (hidden markers, `LabelWidget`, `LinkLook`, Heading Link Style `Page § Heading`, phantom/ambiguous classes, Display Unresolved Links As Plain Syntax), resting table cells (`cellStatic.tsx`), property value cells and Link value looks, the glance pane, link clicks, the link menu (`Core/Actions/connectionMenu.ts`: Copy Link, Copy Path, Edit Title), `linkDisplayText`/`shownProse` (sort and filter), embeds (`![[Title]]` page embeds, `loneEmbedTitle` in `Engine/detect.ts`). For each: what would a path link `[[A/B/Notes]]` draw today, and what would it need to draw?
4. **Adjacent references**: asset references and File property values (`[[Basename.ext]]`, `![[image.png]]`, `AssetMap` keyed by normalized basename, "display takes the first"). Do they share the page path at all? Would extending path disambiguation to them be one rule or a second one?
5. **The `/` rule**: what changes if a markdown destination's page half may hold `/` — which addresses (`example.com/x`, `docs/file.pdf`, `./x`, `../x`, `/abs`) would then read differently, and does the existing url arm's `page?` plus page-first resolution already cover them?

##### How to Assess

- **Simplest thing that works wins.** A simple solution and a robust architecture that reach the same result aren't equivalent; the simple one is correct.
- **Reuse before invention.** What already exists that does this or nearly does? Hand-rolled parallels to existing mechanisms are the most common avoidable defect in this codebase.
- **YAGNI.** Leave room; don't build the future.
- The owner wants the codebase to end with fewer ways of doing each thing, one owner per responsibility, nothing duplicated, zero added cost on keystrokes/caret moves/decoration builds (`Core/` CLAUDE rule: no O(N) or allocating work on a high-frequency trigger).

Review what's actually there rather than confirming the framing above; if any background claim here is wrong, say so with evidence.

##### Report

Return, concisely and with citations:
- **Chain of logic:** the read → resolve → draw chain as it stands, per surface.
- **Where path-aware resolution belongs:** your proposed single owner, its signature, and what every consumer would then call; alternatives you weighed and why you'd reject them.
- **Index and graph:** the storage shape you'd propose for a path link and why.
- **Rendering:** what each surface should draw for a path link, with the options (path prefix shown vs hidden with the markers) and your recommendation.
- **Risks and errors to avoid:** named sequences that would reach a bad state.
- **Simplification opportunities** you noticed in this domain.
- **What becomes false:** every document line (`.claude/Features/*.md`), comment, and test assertion this change would make false, with file:line.
- **Opinions and concerns** beyond the brief, if any.

#### Report

##### Read/Resolve/Draw Scout: Path-Disambiguated Links

Everything below was read, not run; I edited no files.

###### What Makes This Cheap

No page title can contain `/`. `holdsName` (`Core/Paths/names.ts:16`) refuses `/`, `\` and NUL in every name, and `titleFromPath` returns a basename (`Core/Paths/posix.ts:80`). So any `/` inside a title slot is a folder separator, never part of a title. Folder names also refuse `|#§` and `.` (`names.ts:28,32`), so a path Pommora creates can always be written inside a link. One caveat: an external folder like `II. Planning` contains a period; that only matters to `isValidLink`, which the page-first resolution already handles.

**Corrections to the brief:**
- The wiki slot already stores `[[A/Notes]]` as the key `a/notes`: `writtenPage` keeps the raw slot (`linkValue.ts:71`) and `titleKey` normalizes it (`scan.ts:23,95`). Wiki path rows already exist in the index; only resolution ignores them. Markdown path links are what's new.
- "Display takes the first" asset (`Core/Nexus/tree.ts:69`) is stale. `resolveAssetName` returns `AMBIGUOUS` (`Assets/assetMap.ts:67`), `namedAsset` maps that to `unresolved` (`assetUrl.ts:25`), and `resolveAssetUrl` returns null. A shared asset name displays nothing.

###### Chain of Logic Today

The pipeline runs grammar, then the reader, then the resolver, then the drawing surface:
- **Grammar:** `linkOccurrences` (`connections.ts:104`).
- **Reader:** `readOccurrence` / `readLinkText` produce a `LinkTarget` (`linkValue.ts:67,90`).
- **Resolver:** `namedPage` → `resolveLink` → `PageIndex.resolve` (`linkValue.ts:102,106,120`; `pageIndex.ts:48`).
- **Index:** a single title map built once per tree by `pageIndexOf` (`Nexus/record.ts:85`), in both processes.

**Consumers, renderer side:**

| Surface or consumer | Where | Notes |
| --- | --- | --- |
| Editor links | `linkLook` (`MarkdownPM/Links/connectionsApi.ts:45-68`), called twice per link per decoration build (`decorations.ts:551,595`) | Hot path. Passes no `own`, so a bare heading reads `self` |
| Resting table cell | `cellStatic.tsx:148` (`linkLook`) and `:644` (`resolveLink` with `held`) | |
| Link value cell | `LinkCell.tsx:37` | Also `showFullLink` re-spells by bare title at `:46` |
| Value menu | `valueMenuTarget.ts:13` | |
| Clicks, glance | `linkClicks.ts:58`, `dwellTarget` / `followTarget` | Take the `ResolvedLink`; never read titles again |
| Citations | `citationPointer.ts:44` | |
| Alias memory | `linkSettle.ts:123,146`; `shownAlias` (`linkValue.ts:138`); `assignValue.ts:57` | |
| Paste / Paste As | `pasteLink.ts:25,54`, `pasteAsMenu.ts:57-59,100` (via `resolvedTarget`) | |
| Autocomplete heading list | `autocomplete.ts:99` → `useConnectionAutocomplete.ts:82` (`index.resolve(title)`) | |
| Embeds | `embedWidget.tsx:397` | Resolves the raw `loneEmbedTitle` text directly, bypassing the reader (a second reader) |
| Matrix | `matrixInput.ts:64-76` | Resolves the stored `link.target` key; ambiguous or phantom means no edge |
| Sort / filter | `linkDisplayText` / `shownProse` (`Views/Pipeline/sort.ts:59-61`, `filter.ts:142-144`) | Read-only, no index |

**Consumers, host side** (none resolve links; they compare normalized title keys):

| Consumer | Where |
| --- | --- |
| Title still held elsewhere | `titleHeldOutside`, `frozenWorld.holds` (`heldPages.ts:38-52`) |
| Rewriters | `rewriteConnections` `hit.target === oldKey` (`rewrite.ts:26`); `rewriteHeadingConnections` (`:92`) |
| Space heading check | `spacesLinkHeading` (`cascade.ts:69`) |
| Tile heading links | `readTileHeadingLinks` (`tilesFile.ts:278`) |
| Trash parking | `parkLinks` (`Trash/holdings.ts:89`) |
| Delete cascade | `queryMentions` (`cascade.ts:96`); `gonePageEntry` (`propertyValue.ts:141`) |
| Rename cascade | `queryMentions` / `queryHeadingMentions` (`cascade.ts:173-174`; `fileEvents.ts:299`) |

**Relations storage:** `relations.target` is `LinkHit.target` (`indexSeed.ts:49-58`). It's indexed by `relations_by_target (target, qualifier, kind)` (`Desktop/Store/ddl.ts:26`). The query is `target = ?` (`stores.ts:100-113`).

###### Where Path Resolution Belongs

**The owner is `PageIndex`.** `buildPageIndex` gains a second map keyed by `normalizeTitle(stripMarkdownExt(p.path))`. `resolve` and `holders` keep their string signature; a key containing `/` looks up the path map, exactly: one page or none, never ambiguous. Title keys and path keys can't collide, by the name rule.
- No relative paths (`./`, `../`) and no suffix matching (`[[B/Notes]]` for `A/B/Notes`). Exact Nexus-relative paths only. That's what Obsidian's default "shortest path" format writes, since the vault root is the Nexus root.
- In NexusOS the only path-shaped wikilinks are examples inside plan prose (`[[A/Note]]`, `[[Projects/Sapphire|…]]`). No real link depends on partial paths.
- Because `resolve` still takes a string, `embedWidget.tsx:397` and `matrixInput.ts:74` work unchanged.

**The reader splits the path once.** `PageName` becomes `{ folder?: string; title: string /* basename */; heading?: string }`. `LinkOccurrence` gains a `folder: Span | null` slot, split at the last raw `/` of the page half, the same kind of split the `#` already gets. Markdown splits only when the half names a page. `title` stays the basename everywhere, so these stay correct untouched:
- `defaultLabel`, `repeatsTarget` / `namesTarget` / `carry`, `keepsAlias`
- `linkDisplayText` / `shownProse`, `pageLabel`

**One key function** composes the lookup key: `pageKey(n) = n.folder ? \`${n.folder}/${n.title}\` : n.title`. Every consumer that uses the name as a key calls it, and the compiler won't catch one that forgets:
- `resolveLink` (`linkValue.ts:120`)
- `scan.ts:95`
- `autocomplete.ts:99` → `useConnectionAutocomplete.ts:82`
- `gonePageEntry` → `frozenWorld.holds`
- `parkLinks`

**Whole-slot consumers** switch to `nameSpan(o)`, the folder start through the title end:
- `targetSpan` (`connections.ts:46`)
- `partOf` and `headingHash` (`edits.ts:400,469`)
- Edit Title (`linkEdit.ts:40`)
- The autocomplete slot query

**One writer-side owner** ("how a link names this page") belongs next to it: `pageNameOf(page, index, heading?)` adds `folder` only when `index.holders(page.title).length > 1`. Every re-spell routes through it:
- `resolvedTarget` (`linkValue.ts:170`), which covers `linkValueFromEdit`, paste and Paste As
- Copy Link (`pageMenuActions.ts:54`; heading grip `gripMenu.ts:93`)
- `LinkCell.tsx:46`
- Autocomplete pick (`autocomplete.ts:161`)
- Embed writers (`gripMenu.ts:146`, `pasteAsMenu.ts:100`)

**Rejected alternatives:**
- **`title` holds the whole path:** `defaultLabel` would show `A/B/Notes`, and `repeatsTarget('Notes', 'A/B/Notes')` would be false, which breaks alias memory and rename carry.
- **Path logic inside `resolveLink` only:** the embed and Matrix callers bypass it.
- **Suffix and relative resolution:** you asked for neither (YAGNI). Relative paths would also require `own` on every resolve, and the editor's `linkLook` passes none.

**Hot-path cost:** one `lastIndexOf('/')` per occurrence at tokenize and read time, the same order as the existing `.trim()` and slice calls. One extra `Map.set` per page at index build, which is memoized per tree. Nothing new happens per keystroke beyond what's already there.

###### Index and Graph

**Proposal: no schema change.** `relations.target` is the normalized key the link names:
- `[[Notes]]` → `notes`
- `[[A/B/Notes]]` or `[x](A/B/Notes)` → `a/b/notes`
- A bare self-link (`[[#H]]`, a `§H` run) → the own page's **path** key, where today it's the own title key (`scan.ts:23,91`; `indexSeed.ts:42`).

That last change fixes an existing bug. `renameHeading` has no holders check (`mutate.ts:94`), so a heading rename on one of two same-titled pages rewrites the other page's own `[[#H]]` links through the shared title key.

**Queries, all exact or range and all on the existing index:**
- **"Files linking page P":** P's title key (only when the title is unique) plus P's path key. One host function composes that pair; page rename, heading rename, delete, and `frozenWorld` use it.
- **Folder rename and page move:** one new store method, `target >= dir||'/' AND target < dir||'0'`, the idiom `removePathPrefixIndex` already uses (`stores.ts`). It goes in SQL and `Testing/memoryStores.ts`, with a `storesContract.ts` case. Space targets can't land inside the range.
- **Matrix:** `resolve(link.target)` works as-is.
- Bump `INDEX_GENERATION` (`ddl.ts:3`) for the self-link and markdown rows.

**Why I rejected a separate scope column:** it costs a column, a primary-key change, an extra index, and a field on `PageRelationRow` / `MatrixLink`. Its failure mode is also worse: a caller who forgets to filter by scope rewrites the other twin's links. The key-only shape's failure is a miss, not a wrong write.

###### Rendering

**Recommendation: hide the folder prefix with the markers, show the basename, reveal the path with the caret.** The folder is disambiguating syntax, like the brackets. The alternative is a muted visible prefix: honest, but noisy, and it would make sort and filter text differ from what's drawn. Downside of hiding: two twin links both read "Notes"; the glance pane and the picker trail tell them apart.

Touch points:
- `linkToken` (`tokens.ts:245`): unaliased content starts at `o.title[0]`, now the basename, so `markerRanges` (`:252`) already fold the prefix into the hidden leading marker. Both the editor (`decorations.ts:653`) and the resting cell then follow.
- Revealed, the prefix draws as `md-bracket` (wiki) or `md-control` (markdown). Aliased reveal: `pipe = targetSpan(...)` (`decorations.ts:605`) needs `nameSpan` so the whole path wears `md-connection-target`.
- `Page § Heading` join: `decorations.ts:594/620` and `cellStatic.tsx:178` slice `tk.link.title`, which becomes the basename. Correct without other change.
- Markdown empty label (`look.label` via `pageLabel`) and `linkDisplayText` / `shownProse` show the basename automatically.
- Phantom path links follow the existing phantom branch. Under Display Unresolved Links As Plain Syntax, the syntax stays visible in prose color (`markdown-pm.css:258`).
- Clicks, glance, and the link menu need nothing; they consume `ConnPage`. Copy Path copies `page.path` and is unaffected. Copy Link needs `pageNameOf`.
- Embeds: `![[A/B/Notes]]` becomes a tile once `resolve` is path-aware. `loneEmbedTitle` plus `expressibleInLink` (`detect.ts:414`; `embedWidget.tsx:397`) is still a second reader.
- `encodeURI` keeps `/` (verified), so `[L](A%20B/Notes)` round-trips without `%2F`.

###### Assets

Assets don't share the page path. `wikiTitle` (`linkValue.ts:132`) reads the wikilink form only, and `AssetMap` is keyed by normalized basename with ambiguity meaning refusal (`assetMap.ts:25,64-67`; `adoptFile.ts:42`). Path support there would be the same rule (`/` means an exact Nexus-relative path) applied to a different namespace, by filtering `files[basename]` by the full rel. That's cheap, but it's a second application of the rule, not a shared one. I'd leave it out (YAGNI) unless "and more" means File values; if it does, share only the key helper, not the data structure.

###### The `/` Rule

`namesPage` (`links.ts:38`) reduces to the scheme check, and `edits.ts:470` keeps calling it. Each address:
- **`example.com/x`:** reads as `url` with `page?` set; page-first resolution finds nothing and falls back to the url. The url keeps the whole destination (`linkValue.ts:76`). Unchanged.
- **`v1.2/Notes`:** today a website. Afterwards it resolves to the page if one exists there, otherwise the url.
- **`docs/file.pdf`, `./x`, `../x`, `/abs`:** today `readOccurrence` returns null and they draw phantom. Afterwards they're page-kind phantom links: they draw the same but now produce index rows, and a folder-rename range would rewrite `docs/…` prefixes. That's arguably correct, but say so.
- **`example.com/page#sec`:** the occurrence now splits at `#`. The url arm still keeps the whole, and the heading picker would list against a nonexistent page (an empty list).

###### Risks: Sequences That Reach a Bad State

1. **Renaming one of two twins skips its path links.** `rename.ts:38-41` skips the cascade when the title is held elsewhere, which is exactly when path links exist. The gate has to stop skipping and drop only the title key.
2. **Folder rename and page move have no cascade at all** (`renameFolderEntity`, `movePage`), so every path through the folder goes phantom.
3. **Re-spelling drops the folder.** `resolvedTarget` writes `target.page.title`, so typing `[[A/Notes]]` into a Link value saves `[[Notes]]` (ambiguous). Same for paste, Copy Link, and `LinkCell` full link.
4. **A new twin breaks existing links.** Creating, moving, renaming, restoring, or externally adding a second `Notes` flips every existing bare `[[Notes]]` from resolved to unresolved. Writing path form at pick time doesn't fix links that already exist. **Your call:** pin existing bare links to path form at the operation that introduces the twin, or accept the break. External adds can't be pinned before the fact.
5. **Case-only folder renames on macOS** leave the normalized keys equal, so don't build a rewrite that keys on key changes alone.
6. **Hand-written partial paths** (`[[B/Notes]]`) read phantom by design. Document it.

###### Simplification Opportunities

- `namesPage` becomes a scheme check, and the "last segment" comment goes.
- **Your call:** fold Ambiguous into Phantom. The mandate's "can't resolve to exactly one → phantom" reads that way. It removes `'ambiguous'` (`connections.ts:32`, `pageIndex.ts:51`, `linkValue.ts:122`), the `.md-connection-ambiguous` CSS (`markdown-pm.css:227,275`), and the selector at `linkClicks.ts:64`. It costs ConnectionsPM.md:19 and the Ambiguous sentence at :36. Path links never produce Ambiguous; bare twins still would.
- Embeds read through the one reader instead of the raw `loneEmbedTitle` + `expressibleInLink` + `resolve` path. `embedExclusions` (`embedWidget.tsx:649`) and `embedPickTree` (`gripMenu.ts:29`) key by normalized written title; key them by page path instead (`TileRange` already carries `path`).
- The `.md` rule disagrees between syntaxes: markdown strips it (`links.ts:68`), wiki `[[Notes.md]]` doesn't (`linkValue.ts:71`). `pageKey` could strip it for both.

###### What Becomes False

**Docs:**
- `ConnectionsPM.md`: :10 ("resolves by its title"), :11 (the path-separator clause), :16 and :18 ("holds the title"), :19 and :36 (Ambiguous, if folded), :22 (main's title index), :26 ("resolves by title"; folder cascade missing), :30 ("one of two same-titled pages rewrites and strips nothing"), :51 ("ambiguous"), :57 (the picker writes a path when the title is shared), :78 (the Prospect is done).
- `PagesPM.md:14`; `CorePM.md:83` and `:108` ("relate to which titles").

**Comments:**
- `links.ts:37`; `connections.ts:34`, `:88`, `:128`; `scan.ts:63`
- `heldPages.ts:37`; `rewrite.ts:20`; `tree.ts:69` (already stale)

**Tests:**
- `links.test.ts:97`
- `edits.test.ts:813` (`[a](dir/Page)` now turns `§` into `#`)
- `scan.test.ts:157-158` and `indexSeed.test.ts:164` (self-link key becomes `notes/a`)
- Only if Ambiguous folds: `pageIndex.test.ts:24-25,37-39`, `linkValue.test.ts:125-127`, `treeIndex.test.ts:176-181`, `matrixInput.test.ts:62-67`, `mdLinkTarget.test.tsx:136-172`, `LinkCell.test.tsx:80-84`, `TextCell.test.tsx:131`, `linkEdges.test.tsx:154-185`, `cellRestingMenu.test.tsx:348`.
- `rewrite.test.ts:145` stays true (it has a scheme).

###### Opinions

- Risk 4 is the real product question, and it's older than path links. The mandate fixes links written from now on, not links that already exist.
- Draw and click resolve `own` inconsistently: `linkLook` passes none, while `linkUnder` and `cellLinkTarget` pass `heldOf`. It's harmless today, but a single `own` source would remove it.

---

### Round 1 — Writers and the Picker

**MODEL:** `opus-high`
**SUPERSEDED:** Its canonical shortening of re-spelled links is superseded by A-7 (a link keeps its written form wherever it resolves); its whole-path prefix matching in the picker by D-1 and D-4 (one matcher for every search).

#### Brief

You are a read-only scout for a planning session in Pommora (repo root: `~/The Studio/Projects/Project Pommora`). Don't edit any file. Your job is to map one domain of the codebase completely and report evidence, with your own assessments and proposed approaches.

##### The Mandate (the owner's words, condensed)

Pommora should "resolve" duplicated page titles: when the user picks a page whose title another page also holds, the link is written in path form using the same syntax Obsidian uses for path/file disambiguation (e.g. `[[Folder/Sub/Title]]`, `[Label](Folder/Sub/Title)`). If a link still can't resolve to exactly one page, it renders as a phantom. Renaming and moving any page, and any folder a path link passes through, must cascade coherently. The system must work identically through shared logic, with no second definition, across every format: wikilinks, markdown links, embeds, links inside Link and Text property values, table cells, markdown tiles, "and more". It must reuse the existing architecture and read as always-intended.

##### Background You Need

- A Nexus is a user folder; pages are Markdown files inside Collections (folders with `_pagecollection.json`) and Sets (subfolders). A page's **title is its file basename** without `.md` (`titleFromPath`, `Core/Paths/posix.ts:80`), and its `path` is the Nexus-relative POSIX path. Two pages in different folders can share a title; today such a link reads **Ambiguous** (muted, inert).
- A large restructure just landed (`abfbf0798..0d686c2e9`): one grammar (`Core/Connections/connections.ts`, `links.ts`), one page-link writer (`pageLinkText(PageName & {shown}, prefer)` in `connections.ts`), one reader (`readOccurrence`/`readLinkText` → `LinkTarget`), one resolver (`resolveLink`), `resolvedTarget` (a written link as the page it resolves to), `retarget`, `keepsShown` (Remove Title On Link Change), one picker model (`Core/MarkdownPM/Autocomplete/`, query `{ syntax, part }`, `commitEdit`), one link settle (`Core/MarkdownPM/Links/linkSettle.ts`), one value editor (`Core/Properties/Pickers/ValueEditor.tsx`), alias memory keyed by page id (`Core/Connections/aliasMemory.ts`, `shownAlias`). Read `.claude/Features/ConnectionsPM.md` first; it describes the current behavior.

##### Your Domain: Every Writer of a Page Link, and the Picker

Map, with file:line citations:

1. **Every producer of page link text**: every caller of `pageLinkText`, `pageEmbedText`, `fileLinkText`, `retarget`, `resolvedTarget`, `markdownLink`, `encodeLinkTarget`, and any hand-spelled `[[${...}]]` template anywhere in `Core/`, `Desktop/`, `UIX/`. Include: the picker's commit (page, heading, alias picks, in both syntaxes, in the page editor, table cells, markdown tiles, Text pane, one-line Link/Text fields), paste and Paste As (`Links/pasteLink.ts`), the Link field (`linkValueFromEdit`, `parseEditorValue.ts`), drag-and-drop of a page into an editor or a property (see `.claude/Features/PommoraDND.md`), the link menu's Copy Link / Edit Title / Rename (`Core/Actions/connectionMenu.ts`), the tile handle's pick tree, the settle's label fill (`pageLabel`), `assignValue`, page creation from a phantom link (if it exists), the Matrix, and anything else you find. For each: what page identity it holds when it writes (a `ConnPage` with id and path? a title string only?), and whether it could ask a single "how to name this page" rule.
2. **The picker**: `PageIndex.candidates`, how duplicate-titled pages appear as rows (the location trail beneath, `EditorHost.location`), what a pick writes today, the heading list (`headingsOf` — is it keyed by title or by page? what does `[[A/Notes#` list?), the alias list for the picked page, the `§`→`#` transform, the open-link/slot readers (`openLinkAt`, `slotAt`, `partOf` in `Core/MarkdownPM/Input/edits.ts`) with a `/` inside the title slot, and the query's filtering when the typed title holds `/` (should typing `[[Proj/No` match `Projects/Notes`?).
3. **Remove Title, alias memory, and the settle** with a path link: does `keepsShown`, `shownAlias`, `namesTarget`/`repeatsTarget`/`carry` (a shown text that only repeats the target) behave correctly when the written title is `A/Notes` and the page's title is `Notes`? Would `[[A/Notes|Notes]]` drop its alias as repeating the target?
4. **Where one naming rule belongs**: a function answering "the shortest written name that resolves to exactly this page" (its title where it's the only holder, else its Nexus-relative path without `.md`). Propose its owner, signature, and every call site; weigh whether `pageLinkText`'s `PageName.title` should carry the path, or whether `PageName` gains a separate field.

##### How to Assess

- **Simplest thing that works wins.** A simple solution and a robust architecture that reach the same result aren't equivalent; the simple one is correct.
- **Reuse before invention.** What already exists that does this or nearly does? Hand-rolled parallels to existing mechanisms are the most common avoidable defect in this codebase.
- **YAGNI.** Leave room; don't build the future.
- The owner wants the codebase to end with fewer ways of doing each thing, one owner per responsibility, nothing duplicated, zero added cost on keystrokes/caret moves/decoration builds (no O(N) or allocating work on a high-frequency trigger; the picker's `candidates` runs per keystroke).

Review what's actually there rather than confirming the framing above; if any background claim here is wrong, say so with evidence.

##### Report

Return, concisely and with citations:
- **Writer inventory:** each writer, its file:line, what identity it holds, and what it would call.
- **Picker behavior:** today and proposed, per part (title, heading, shown), per syntax.
- **The naming rule:** proposed owner and signature, alternatives weighed, and why.
- **Rule interactions:** Remove Title, alias memory, carry/drop, settle fill, with path links — what breaks and what the fix is.
- **Risks and errors to avoid:** named sequences that would reach a bad state.
- **Simplification opportunities** you noticed in this domain (writers that bypass the one writer, near-duplicates).
- **What becomes false:** every document line (`.claude/Features/*.md`), comment, and test assertion this change would make false, with file:line.
- **Opinions and concerns** beyond the brief, if any.

#### Report

##### Scout Report: Page-Link Writers and the Picker (Path-Form Disambiguation)

Read-only; nothing edited. Paths are repo-relative to `~/The Studio/Projects/Project Pommora`. `Desktop/out/**` is build output and is excluded.

###### Background Corrections

- **Markdown path links don't exist today.** `namesPage` (`Core/Connections/links.ts:38-39`) refuses any `/` in the page half. So `[L](A/Notes)` reads as neither a page nor an address: `readOccurrence` returns null (`linkValue.ts:78-80`). It also never splits at `#`, because `markdownSpans` only splits when `namesPage` passes (`connections.ts:93`). `headingHash` (`Core/MarkdownPM/Input/edits.ts:470`) won't turn `§` into `#` there either. Doc line 11 states this rule outright. Unless this changes, every markdown writer below writes a link that can't be read back.
- **Wikilinks already parse paths.** `pageLinkPattern` admits `/` in the page half. `[[A/Notes]]` reads as title `"A/Notes"` and resolves phantom, because `index.resolve` keys by normalized title only (`pageIndex.ts:44-53`).
- **Some brief items have no writer:**
  - **Page drag-and-drop:** no page drop into an editor or property writes link text. The only editor drop is `pasteLink.ts:161-171`, which takes `text/uri-list` (external URLs). `App.tsx:120-124` takes files. A loose page row only reaches tabs, per PommoraDND.md:38.
  - **Phantom page creation:** no create-from-phantom-link path exists. Every `createPage` caller uses `DEFAULT_NEW_NAME`.
  - **Matrix:** writes nothing. `matrixInput.ts:64` resolves index targets through `pageIndexOf(tree).resolve`, so it's a reader only and follows whatever `resolve` becomes.
  - **Tile handle pick tree:** writes no link text. It picks by page id (`tileHandleMenu.ts:44`, `pagePickTree(..., p => p.id)`).

###### Writer Inventory

| # | Writer | Site | Identity Held When Writing | Should Call |
|---|---|---|---|---|
| 1 | Picker page pick (title part), both syntaxes, every surface (page editor, `CellEditor`, tiles, Text pane, one-line field all share `useConnectionAutocomplete`) | `autocomplete.ts:173-179` → `whole()` → `pageLinkText` at :161 | **Title string only** (`row.value = p.title`, `pageRow` :104-109), but the row carries `pageId` | Row carries the page's written name from the index |
| 2 | Picker chevron (open heading) | same path, `openHeading` | same | same |
| 3 | Picker heading pick | `autocomplete.ts:181-203` | `ac.title`, the **written** title (`autocompleteQuery` :99) | Keeps the written name, so it's already correct for path links |
| 4 | Picker alias pick | `autocomplete.ts:204-205` | slot only | unaffected |
| 5 | Picker shown-text check | `useConnectionAutocomplete.ts:134-149` (`title: row.value` at :144) | title string | written name. Otherwise `keepsShown` reads the next target as ambiguous, `sameTarget` fails, and **re-picking the same duplicate page drops its alias** |
| 6 | Paste and Paste As | `pasteLink.ts:54` and `pasteAsMenu.ts:59` → `resolvedTarget` → `retarget` (:98) / `pageEmbedText(target.title)` (:100); Paste As rows run in main too (`Desktop/Actions/editorMenu.ts:117-122`) | `ResolvedLink.page` (a `ConnPage`), then **collapsed to `target.page.title`** at `linkValue.ts:170` | `resolvedTarget` writes the index's name for the page |
| 7 | Link field commit | `linkValueFromEdit` `linkValue.ts:191` (via `parseEditorValue.ts:41`) | same, via `resolvedTarget` | fixed by #6 |
| 8 | Copy Link (sidebar, tabs, nav list, window strips, link menu) | `pageMenuActions.ts:54` `runPageAction` | `{id, path, title?}` | `pageIndexOf(s.tree)` naming |
| 9 | Heading grip Copy Link | `MarkdownPM/Menus/gripMenu.ts:78,93` | **`host.pageTitle()` string only** (`editorHost.tsx:145`) | Host must expose the page itself, not only its title |
| 10 | Embed Source pick tree | `editorHost.tsx:136-139` picks `p.title`, then `gripMenu.ts:140-146` `pageEmbedText(title)` | **title string only** | Pick tree yields the written name |
| 11 | Embed pick exclusions | `embedWidget.tsx:645-652`, `embedPickTree` `gripMenu.ts:23-30` | normalized written titles, plus `titleFromPath(ancestor)` | Key by resolved page id or path. Today a duplicate over-excludes its twin, and a path embed fails to exclude itself |
| 12 | LinkCell "Show Full Link" | `LinkCell.tsx:46` | `target.page`, **collapsed to `.title`** | Index naming, or just `raw`. Canonicalizing to a bare title would draw a resolved path link as an ambiguous phantom |
| 13 | Settle label fill (an emptied markdown label gets its default) | `linkSettle.ts:121-126` → `pageLabel` `linkValue.ts:126-129` → `defaultLabel(named.title)` | written title | Must show the page title (`Notes`), not `A/Notes`. See the naming design |
| 14 | Rename cascade (main) | `rewrite.ts:21` (title-keyed), `follower` :45-75, wiki→markdown fallback :58; called from `Nexus/cascade.ts:180`; Trash restore `Trash/spend.ts:265` | old and new **title strings** | Needs path, move, and folder arms. That belongs to the cascade scout; listed here because it's a writer |
| 15 | Own-page heading rename | `headingRenameSettle.ts:51-57` passes `host.pageTitle()` as `own` | title string | A link to its own heading written in path form (e.g. `[[A/Notes#H]]` on page `A/Notes`) won't match `own` |
| 16 | `assignValue` alias memory | `assignValue.ts:57` `shownAlias` | resolves through the index | correct once `resolve` handles paths |
| — | Not page writers | `fileLinkText` (assets, `[[Name.ext]]`; adoption keeps basenames unique), `linkEntry` `linkValue.ts:53` (a YAML unwrap; reads `[[A/Notes]]` fine), `format.ts:179` and `ValueEditor.tsx:148` (URL only), `embedInsert.ts:57,62` (empty tokens), `embedGuard.ts:65` (compares a written text to itself) | | none |

No hand-spelled `[[${…}]]` page template exists outside `connections.ts:174,178,182` and `linkValue.ts:53`. The single writer really is single. The defect is that six callers feed it `page.title` when they already hold a `ConnPage`, or only have a title in hand (#9, #10).

###### Picker Behavior

###### Title Part

- **Today:** `candidates` (`pageIndex.ts:54-67`) prefix-matches the normalized **title**. Duplicates show as sibling rows, kept in tree order by the stable sort and told apart only by the `host.location` trail (`AutocompletePane.tsx:100-106`). A pick writes `[[Notes]]`, which is ambiguous.
- **Typing a path:** `[[Proj/No` matches nothing, because no title holds `/`. Edit Title selects a path link's title slot (`linkEdit.ts:39-40`), so retyping `A/No` offers nothing and the link can't be re-picked.
- **Exact-close:** `useConnectionAutocomplete.ts:118` compares `found[0].value` (the title) to the query. A resting `[[Notes]]` with two holders keeps the picker open with both rows. Arguably that's a good fix-it surface, and a pick from it keeps the alias, because `keepsShown` keeps shown text when the baseline is unresolved (`linkValue.ts:263`).
- **Proposed:**
  - Page rows carry `name: PageName` from the index (O(1) each, ≤20 rows).
  - Commit writes `name`, and #5 uses it too.
  - Exact-close compares the query to the written name.
  - `candidates` also matches the normalized path without `.md` when the query contains `/`. Precompute that string lazily with `alphabetical`, so there's zero extra work for queries without `/`.
  - Match the whole Nexus-relative path from the root, never a suffix.
  - `emphasizeMatch(row.value, 0, matchLen)` (`AutocompletePane.tsx:126`) mis-highlights a path query. Highlight the title only when the query has no `/`.

###### Heading Part

`headingsOf` is keyed by `page.path` (`connectionsApi.ts:21`, `pageConnections.ts:31`). The page itself comes from `index.resolve(ac.title)` (`useConnectionAutocomplete.ts:81-84`), so:

- `[[A/Notes#` lists nothing today (phantom).
- `[[Notes#` with duplicates lists nothing (ambiguous). That's correct.

Once `resolve` reads the path form, `[[A/Notes#` lists that page's headings with no picker change. Heading commit writes in place, or rewrites the whole link from `ac.title`, the written name, so the path survives. Markdown needs `namesPage` relaxed first. Until then, `[L](A/Notes#…)` keeps the caret in the title part and lists nothing.

###### Shown Part

`aliasRows(host.aliases, page?.id, q)` follows the same resolved `page`, so it's correct once `resolve` is path-aware. `aliasHost.title = page.title` is the right comparison base.

###### `§`→`#` Transform and the Slot Readers

- **Slot readers:** `openLinkAt`, `slotAt` and `partOf` (`edits.ts:375-418`) are syntax-agnostic about `/` in wikilinks, so nothing changes there.
- **The transform:** `headingHash` refuses markdown through `namesPage` (:470). That's the same fix as the grammar correction above.

###### The Naming Rule

###### Owner

Put it on `PageIndex` (`Core/Connections/pageIndex.ts`). It's the only structure that knows holder counts, both processes build it from the one entity list (`record.ts:85` `pageIndexOf`), and it's memoized per tree.

- **Signature:** `named(page: ConnPage): PageName`. It returns `{ title }` when the page is the sole holder of its title, and `{ title, folder }` otherwise.
- **Cost:** one `byTitle` lookup, O(1), with no per-keystroke cost. A `byPath` map for `resolve` is built once at build.

###### Recommended Shape: a Separate `folder` Field

Give `PageName` a separate `folder?: string`: `PageName = { title: string; folder?: string; heading?: string }`. `title` stays the page's basename everywhere, and the written name is `folder ? \`${folder}/${title}\` : title`.

The reason is that `title` currently serves two purposes: it's what resolves, and it's what shown text is compared against in `repeatsTarget` (`connections.ts:145`), `namesTarget` (:153), `keepsAlias` (:149), `defaultLabel` (`links.ts:35`), `pageLabel`, `linkDisplayText` (`linkValue.ts:195-212`) and `carry` (`rewrite.ts:31-42`). Putting the path in `title` breaks every comparison site:

- `[[A/Notes|Notes]]` keeps a redundant pipe, because `repeatsTarget('Notes','A/Notes')` is false.
- A markdown pick labels itself `A/Notes`.
- `carry` treats `Notes` as a given name, so renaming the page to Memo leaves a stale `[A/Memo|Notes]`-style label.
- The settle fill writes `A/Notes`.

With a separate field, those sites need **zero edits**. Only these change:

- **The writer:** `pageLinkText` and `spellsAsWiki` (:139) spell `folder/title`. `expressibleInLink` covers folder segments, and an unspellable folder (one holding `]]`) falls back to the markdown form as today.
- **The reader:** `readOccurrence` splits at the last `/`.
- **The resolver:** `resolve`.
- **The naming rule.**

It also maps the cascade cleanly: a rename edits `title`, while a move or folder rename edits `folder`.

###### Alternative

Keep the path in `title` and add a `lastSegment()` helper applied at every comparison site. It's equivalent in outcome but touches more sites and is easier to forget. Rejected.

###### Call Sites

Each writer builds `pageLinkText({ ...index.named(page), heading, shown }, syntax)`:

- **#1-2 picker:** via `pageRow`, which already has `host.connections().index`.
- **#5:** the picker's shown-text check.
- **#6-7:** `resolvedTarget`, at `linkValue.ts:170`. It needs the index, which it already has.
- **#8:** `runPageAction`, via `pageIndexOf(useSession.getState().tree)`.
- **#9 and #15:** replace `EditorHost.pageTitle(): string | null` with `page(): ConnPage | null`. The grip's `linkable` check and the harness at `editorHarness.ts:135` follow.
- **#10:** the pick tree picks the page, and the grip writes `pageEmbedText` of its name. `pageEmbedText` should take a `PageName`.
- **#12:** LinkCell.
- **#14:** the cascade.

###### Root-Level Pages

A page at the Nexus root has `folder: ''` and stays ambiguous against a same-titled page elsewhere. Pages live in Collections, so verify that root `.md` files aren't pages. If that holds, it can't happen.

###### Rule Interactions with Path Links (Under the `folder` Design)

- **Remove Title (`keepsShown`, `linkValue.ts:255-264`):** compares resolved page ids, so it's correct once `resolve` reads paths. The live failure today is #5: the shown-text check builds the next target from `row.value`.
- **Alias memory (`shownAlias`, :138-156):** already compares against `target.page.title`, so `[[A/Notes|Notes]]` never records `Notes`. `namesTarget(alias, named)` compares against the basename, which is correct. A mid-edit retarget from `[[Notes|x]]` to `[[A/Notes|x]]` is caught by the `was` check at :153 once both resolve to the same id.
- **Carry and drop (`rewrite.ts`):** with `title` as the basename, `carry`'s `'title'` case returns the new basename and wikilinks drop the pipe when it repeats. The cascade's `to = {...from, [part]: value}` (:52) gains a `'folder'` part for moves.
- **Settle fill (`pageLabel` → `defaultLabel(title)`):** gives `Notes`, which is correct.
- **Draw:** the decision belongs to the rendering scout. Wikilinks draw their written title span directly (`decorations.ts:563-570`), so `[[A/Notes]]` draws "A/Notes" today. The `folder` design assumes the draw hides the `folder/` prefix with `hideMarker` at rest (cheap: one range at the last `/`) and shows the title. If the owner wants the path drawn, `[[A/Notes|Notes]]` becomes a real alias, and `repeatsTarget` and `pageLinkText` must keep it. **This has to be decided before the writer is built.**
- **Display and sort text:** `linkDisplayText` should follow the same rule, and so should Remove Link's kept prose (`linkEdit.ts:43`).

###### Risks and Errors to Avoid

1. **Creating a duplicate:** a new `B/Notes`, a rename or move onto the same title, an external file, a Sync arrival or a Trash restore all make every existing `[[Notes]]` link to `A/Notes` go phantom. My recommendation: don't rewrite other files on creation, render them phantom, and have the owner rule on it explicitly. A pre-emptive rewrite can't cover external or Sync arrivals anyway.
2. **Move `A/Notes.md` → `C/` while `B/Notes` exists:** `[[A/Notes]]` must become `[[C/Notes]]`. A move changes no title and cascades nothing today, so this is a new trigger.
3. **Folder rename `A`→`A2`:** every `[[A/…]]` must rewrite. That needs a prefix query over the index's link targets. It's also a new trigger.
4. **Rename shortening asymmetry:** renaming `A/Notes` to Memo, which leaves Memo unique, should write `[[Memo]]` per the naming rule. It must **not** shorten links to the untouched `B/Notes` into `[[Notes]]`. Accept that asymmetry: a rename edits only links to the page it moved.
5. **Canonicalizing re-reads:** `resolvedTarget` must never re-spell a resolved path link as `page.title` (the current behavior). That turns paste, Paste As, Link field commits and Show Full Link into ambiguity generators. The same holds for any future "re-spell through the index" code.
6. **Partial-suffix resolution:** don't match Obsidian-style suffixes (`Sub/Notes` matching `A/Sub/Notes`). With whole-path matching from the root, a URL can't reach a page by its tail. Directories can't contain a `.` (`names.ts:33`), so `example.com/x` can never be a Pommora-created page path. For relaxing `namesPage`, I'd pick "no scheme, and no `.` in the segment before the first `/`" over dropping the `/` test entirely. It keeps `links.test.ts:97` and the address/page split structural.
7. **Pick-tree exclusions keyed by title (#11):** with paths, a page embeds itself, or one twin hides the other.
8. **`.md` spellings:** `[[A/Notes.md]]` (wiki) isn't stripped by the reader, while markdown's `targetTitle` strips it. Obsidian writes `[x](A/Notes.md)`, so reading that is interop-critical for NexusOS. Write without `.md`, but read both forms in both syntaxes.

###### Simplification Opportunities

- **Six writers bypass page identity:** #1, #5, #6/7 (at the single collapse in `linkValue.ts:170`), #8, #12 and #10 hold a `ConnPage` or page node and throw it away for `.title`. One `index.named(page)` spread replaces all of them. Nothing new is invented; the index and `pageLinkText` already exist.
- **`EditorHost.pageTitle()` → `page()`:** this removes the only title-string-only identity in the editor (#9, #15).
- **`pageEmbedText(title: string)`:** should take a `PageName` so embeds spell through the same rule. Today it's a second, unchecked spelling, with no `spellsAsWiki` guard. Its callers gate it with `expressibleInLink` separately (`pasteAsMenu.ts:46`, `gripMenu.ts:29`).
- **Two exclusion keyings:** `embedExclusions` and `embedPickTree` key exclusions in two ways (written title vs basename). After this change they should key by page path in one place.

###### What Becomes False

###### `.claude/Features/ConnectionsPM.md`

- **:10:** "`[[Title]]` resolves by its title". This gains the path form.
- **:11:** "a path separator addresses something outside the Nexus".
- **:16-20:** the three states. Ambiguous folds into Phantom per the mandate. If the `LinkStatus` union keeps `'ambiguous'` (`connections.ts:32`), that has to be a deliberate choice.
- **:22:** main "resolves no link … a title-shaped target … names a page".
- **:26:** "A connection resolves by title, so renaming … rewrites every body that names the old title". Moves and folder renames now cascade.
- **:30:** "renaming or deleting one of two same-titled pages rewrites and strips nothing".
- **:35:** "Ambiguous links keep the bracket treatment in a muted tone".
- **:51:** "A phantom, ambiguous, or invalid link offers no link menu".
- **:57:** "matched by title prefix".
- **:58:** "the headings of the page that title names".
- **:78:** the "Duplicate disambiguation — id-scoping" prospect, which the path form replaces.

###### Other Feature Docs

- **`PagesPM.md:14`:** "a connection to a shared title resolves as ambiguous".
- **`CorePM.md:83`:** "so title resolution can answer 'ambiguous.'"

###### Comments

- `links.ts:37` (`namesPage`) and the "never read as a page title" rationale.
- `connections.ts:128`: `PageName` is "a page named by title".
- `linkValue.ts:158`: `resolvedTarget` writes "by that page's own title".
- `linkValue.ts:180`: `linkValueFromEdit` names "the page it resolves to, by title".
- `api.ts:205`: the `pageTitle()` comment, if it's replaced.

###### Tests

- **`links.test.ts:97`:** `targetTitle('example.com/Notes')` returning null. It stays true under the dotted-first-segment option and becomes false if the `/` test is dropped.
- **`linkValue.test.ts:414-428`:** "writes a resolved page by its own title". This needs a path sibling, e.g. `[[A/Dup]]` → `{title:'Dup', folder:'A'}`.
- **`linkValue.test.ts:125-127`, `pageIndex.test.ts:24-25` and :37-40, `treeIndex.test.ts:176-181`:** these assert `'ambiguous'` and become false if the status folds into phantom.
- **Rendering assertions** on `md-connection-ambiguous` (`mdLinkTarget.test.tsx:136-176`, `LinkCell.test.tsx:80-84`, `TextCell.test.tsx:131`, `linkEdges.test.tsx:154-185`, `cellRestingMenu.test.tsx:348`) and **`matrixInput.test.ts:62-67`:** these change with the status decision. They're the rendering and resolution scouts' domain.
- **Still true:** `linkValue.test.ts:369` (`[[Dup]]` refused), though it needs an `[[A/Dup]]` accept case.
- **Picker tests (`connectionCommit.test.tsx`, `autocomplete.test.ts`):** none use duplicates, so they need new cases rather than corrections.

###### Opinions and Concerns

- **Draw first:** decide whether a path link draws its title or its path before building anything. It decides whether `[[A/Notes|Notes]]` is redundant, and with it the whole Remove Title, alias and carry story. I recommend drawing the title, with the folder prefix hidden like the other markers.
- **Bare links breaking on duplication:** a path link resolves no matter which titles are shared, while a bare link breaks the moment a duplicate appears (risk 1). That's the actual user-visible regression surface of "phantom on ambiguity". The owner should explicitly accept that creating a duplicate silently breaks existing bare links, or ask for a cascade that only covers app-originated creations.
- **Shortening on paste and commit:** `resolvedTarget` shortens a user-typed `[[A/Notes]]` to `[[Notes]]` when Notes is unique. The rule says so, but it's a write the user didn't ask for. It's worth a one-line ruling.
- **File references:** `[[Name.ext]]` has its own nexus-wide uniqueness rule (adoption steps aside to keep basenames unique). If "and more" was meant to include File values, it doesn't need path form.

---

### Round 1 — Cascades

**MODEL:** `opus-high`
**SUPERSEDED:** Its in-app-only collision handling is superseded by E-3 (one rule in and out of the app), its exact-path resolution by A-4, and its cascade-free external events by E-4.

#### Brief

You are a read-only scout for a planning session in Pommora (repo root: `~/The Studio/Projects/Project Pommora`). Don't edit any file. Your job is to map one domain of the codebase completely and report evidence, with your own assessments and proposed approaches.

##### The Mandate (the owner's words, condensed)

Pommora should "resolve" duplicated page titles: when the user picks a page whose title another page also holds, the link is written in path form using the same syntax Obsidian uses for path/file disambiguation (e.g. `[[Folder/Sub/Title]]`, `[Label](Folder/Sub/Title)`). If a link still can't resolve to exactly one page, it renders as a phantom. **Renaming and moving any page, and renaming or moving any folder a path link passes through, must cascade in the most coherent, cohesive, and equally applicable way.** The system must work identically through shared logic, with no second definition, across every format: wikilinks, markdown links, embeds, links inside Link and Text property values, table cells, markdown tiles, Space sidecars, property caches, "and more". It must reuse the existing architecture and read as always-intended.

##### Background You Need

- A Nexus is a user folder; pages are Markdown files inside Collections (folders with `_pagecollection.json`) and Sets (subfolders). A page's **title is its file basename** without `.md` (`titleFromPath`), and its `path` is the Nexus-relative POSIX path. Pages carry a stable ULID `ID` key. Two pages in different folders can share a title; today such a link reads **Ambiguous**, and "renaming or deleting one of two same-titled pages rewrites and strips nothing" (`titleHeldOutside`, `Core/Nexus/heldPages.ts`).
- Today links resolve by title alone, so moving a page or renaming a folder touches no link. With path links, both must.
- Read `.claude/Features/ConnectionsPM.md` (§The Rename Cascade) first.

##### Your Domain: Every Cascade and Every Event That Changes a Page's Name or Path

Map, with file:line citations:

1. **Every event that changes a page's title or path, or a folder's name or location**: page rename (`Core/Nexus/rename.ts` → `renameCascade` in `cascade.ts`), page move (`move.ts` `movePageOp`), set move (`moveSet`), collection/set rename (`renameFolderEntity` in `folderEntity.ts`), page create (incl. `createDisambiguated`), delete and Trash restore (`Core/Trash/`, `deleteCascade`, `frozenWorld`), adoption, remint, and **external** file-system renames/moves/adds/deletes (`Core/Nexus/fileEvents.ts`, the watcher, identity matching by ID, the catch-up on open). For each: where it runs (host), what tree/index state exists before and after the change at the moment the cascade could run (is a pre-change index available? `heldTreeOf`, `liveTreeOf`), and what link maintenance it does today.
2. **The rewrite primitive and its sweep**: `Core/Connections/rewrite.ts` (`rewriteConnections`, `rewriteHeadingConnections`, `follower`, `carry`), `renameCascade`'s file set (`queryMentions`/`nexusCorpus`), frontmatter value patches under `linkKeysOf`, tiles (`rewriteTileConnections`), property caches (`editCaches`), the Space sidecar arm, `sweepGovernedRoots`, the heading-rename settle (`Core/MarkdownPM/Links/headingRenameSettle.ts`) and the external heading rename in `fileEvents.ts`, `Core/Trash/spend.ts`. How does each decide which links name the changed page — by title key equality, or by resolving? What does a heading rename do today when the page's title is duplicated (does it rewrite links to the other same-titled page's heading)?
3. **The delete cascade** (strips Link values naming a deleted page) and restore: how they'd need to read a path link.
4. **One cascade for rename and move**: weigh making the cascade's unit "this page's written name changed from X to Y" (one page for a page rename/move; every page under a folder for a folder rename/move), where each link that resolved to the page before the change is re-spelled so it resolves to the same page after. What would that reuse, what would it cost (index queries for a folder holding many pages, files read), and where would the pre-change resolution come from? Also weigh the **collision case**: a rename, create, restore, move, or external add that gives a title a second holder turns existing bare `[[Notes]]` links that resolved to the original into ambiguous ones — today nothing re-spells them. Report what re-spelling them would take (which events, which code paths) so the planner can put the choice to the owner.

##### How to Assess

- **Simplest thing that works wins.** A simple solution and a robust architecture that reach the same result aren't equivalent; the simple one is correct.
- **Reuse before invention.** What already exists that does this or nearly does? Hand-rolled parallels to existing mechanisms are the most common avoidable defect in this codebase.
- **YAGNI.** Leave room; don't build the future.
- The owner wants the codebase to end with fewer ways of doing each thing, one owner per responsibility, nothing duplicated; no full-Nexus rebuild or re-walk when an incremental or cached update works (a Pommora hard rule).
- The host owns the machine; Core reaches it through `Core/Platform`; read-write separation holds.

Review what's actually there rather than confirming the framing above; if any background claim here is wrong, say so with evidence.

##### Report

Return, concisely and with citations:
- **Event inventory:** each event, where it runs, the before/after state available, and today's link maintenance.
- **How each cascade decides "names this page"** today, and where that diverges between cascades.
- **Proposed cascade shape:** one unit for rename and move (or why not), its owner, its inputs, how it finds candidate files, how it decides which links to re-spell and how to spell them, and how the delete/restore and heading cascades align with it. Alternatives weighed.
- **The collision case:** what handling it would take, per event, with your recommendation.
- **Risks and errors to avoid:** named sequences that would reach a bad state (races with the watcher, a page renamed and moved at once, a folder rename while an editor holds a body, the editor's own `skipRel` rewrite, files outside the index).
- **Simplification opportunities** you noticed.
- **What becomes false:** every document line (`.claude/Features/*.md`), comment, and test assertion this change would make false, with file:line.
- **Opinions and concerns** beyond the brief, if any.

#### Report

##### Scout Report: Name/Path-Changing Events and Their Cascades

Read-only. No files edited. Paths are relative to the repo root `~/The Studio/Projects/Project Pommora`.

###### Background Check
- **Confirmed:** links resolve by title alone today. A move or a folder rename touches no link: `movePageOp` (move.ts:26-40), `moveSetOp` (move.ts:42-67, only `reachConfig`), and `renameFolderEntity` (folderEntity.ts:52-64) never call a cascade, and mutate.test.ts:398 asserts "(no cascade)".
- **Confirmed:** "renaming or deleting one of two same-titled pages rewrites and strips nothing". Rename is gated by `titleHeldOutside`, read **before** `renamePage` (rename.ts:38-41). Delete filters its `gone` titles through `titleHeldOutside` (cascade.ts:89-91).
- **Wrong:** "identity matching by ID" for external renames doesn't exist. The watcher (Desktop/FileWatch/watcher.ts:127-131) emits only add, change, unlink, addDir and unlinkDir. Only `relocate` (Core/Files/atomicWrite.ts:72) emits `event: 'move'`, and only for the app's own writes. `applyPage` compares ids at **one path** only (fileEvents.ts:397-398). An external rename or move reaches Core as an unrelated unlink and add.
- **Path-form links today:**
  - A wikilink `[[A/B]]` passes `pageLinkPattern` (connections.ts:20 allows `/`). It indexes under target key `a/b`, which no page holds, so it reads phantom.
  - A markdown link `[x](A/B)` is rejected by `namesPage` as an address (links.ts:37-39).
  - Two readers, two behaviors, and both are wrong for the mandate.

###### Event Inventory
In every own op, `relocate` → `noteOwn(move)` → `applyOwn` → `applyEvents` → `moveIndexPaths` + `moveNodeInTree` (settle.ts:36-48, fileEvents.ts:571-591). By the line after the relocate, **both the tree and the index are already post-change**. The pre-change tree survives only as a captured object; trees are immutable patches and `pageIndexOf` is memoized per tree (record.ts:85). If `moveNodeInTree` can't place the change, it owes a walk and the held tree stays stale until settle. A post-change tree read in the op is therefore unreliable.

| Event | Where | Pre-change state captured today | Link maintenance today |
|---|---|---|---|
| Page rename | rename.ts:37-42 | `titleHeldOutside` only, on the held tree before `renamePage` | `renameCascade(old,{title})`, skipped entirely when the title is held twice. `renameCascade` reads `liveTreeOf` post-change (cascade.ts:191) |
| Page rename `fromCreate` | rename.ts:29-36 | none | none (mutateRequest.ts:64 "linkless page") |
| Page move | move.ts:26-40 | captures only the id (:34) | none |
| Set move | move.ts:42-67 | held tree for `goneEdit` and the id | `reachConfig` (schema/views); no links |
| Collection/Set rename | rename.ts:21-28 → folderEntity.ts:52 | none | none |
| Page create | create.ts:22-52 | `liveTreeOf` for contexts (:29) | none. `createDisambiguated` checks **siblings only** (:42-46), so it can mint a Nexus-wide twin |
| Delete | Trash/delete.ts:27-111 | `liveTreeOf` at :36 (used for `goneEdit`) | after the relocate: `deleteCascade(root, abs, titles)` (:97) reads `heldTreeOf` **post-delete** and strips Link values only |
| Empty Trash | spend.ts:59-91 | n/a (pages aren't live) | `deleteCascade` over the bundle's titles, then `parkLinks` |
| Restore | spend.ts:131-282 | `liveTreeOf` (:152), plus `frozenWorld(tree, landing titles)` | `scrubReturning` drops Link values naming absent titles. Recorded links are refilled through `rewriteConnections(value, was, landed)` (:265, title-only). The landing is placed by **parent id** (resolve.ts:76-90) under `freeName` among siblings only, so it can rename, move and create a twin at once |
| Heading rename (editor) | headingRenameSettle.ts:48-62 → editorHost.tsx:152 → mutate.ts:93-94 | n/a | editor rewrites its own body, then `renameCascade(title,{heading},skipRel)` |
| Heading rename (external or catch-up) | indexSeed.ts:123-142 → fileEvents.ts:297-309 → settle.ts:128-132 | prior index rows at the same path | same cascade |
| External rename/move/add/delete | watcher → `settleBatch` (settle.ts:193-210) | the held tree at batch start is pre-batch, but nothing captures it | none for titles or paths |
| Catch-up on open | `missedEvents` (settle.ts:173-178) | prior index rows; old paths are pruned, new paths read fresh | heading renames only |
| Adoption `reHomeRegistered`, remint | adopt.ts:41-60, remint.ts | — | Agenda folders and ids only; no page addresses change. **Not events** for this work. Neither is `nexus:rename`, since paths are Nexus-relative |

###### How Each Cascade Decides "Names This Page"
Every cascade compares **normalized title keys**. None resolves a link. They agree today only because there is one key.
- **Title rename:** `rewriteConnections`, rewrite.ts:26 `hit.target === oldKey`. Files come from `queryMentions(titleKey)` or `nexusCorpus` (cascade.ts:171-174). Index rows store `target` as a title key (indexSeed.ts:50-55, scan.ts:23/95). The SQL is `WHERE target = ?` (Desktop/Store/stores.ts:103).
- **Heading rename:** rewrite.ts:92 `hit.target === titleKey && qualifier === oldKey`, through `queryHeadingMentions` (cascade.ts:174, stores.ts:110). **There's no twin guard here or in `cascadeSeen`.** So, to answer the brief: renaming a heading on A/Notes rewrites `[[Notes#H]]` links that were (ambiguously) aimed at B/Notes, including when B/Notes also has `H`.
- **Delete:** a `gone` title set from `titleHeldOutside` (cascade.ts:89-91), then `gonePageEntry` → `readLinkText` title (propertyValue.ts:141-150).
- **Restore scrub:** `frozenWorld.holds(title)` (heldPages.ts:47-53).
- **Parking stripped values in the Trash:** `parkLinks` picks the newest bundle holding that **title** (holdings.ts:69-94). This is already ambiguous today when two trashed pages share a title.
- **Restore refill:** rewrite.ts title rewrite (spend.ts:265).
- **Tiles, the Space arm, caches:** all take the same rewrite closure (cascade.ts:214, 233-245). The heading gate `tilesLinkHeading` is a title\0heading cache (tilesFile.ts:267-289). A title rename reads every tile unconditionally.
- **Where the cascades diverge:**
  - Delete sweeps only tree-held or withheld files (cascade.ts:113-118). Rename sweeps every indexed file, loose root files included.
  - The heading arm skips the cascade when the index isn't ready (`?? []`). The title arm falls back to the corpus.

###### Proposed Cascade Shape
**The unit:** one host function, e.g. `relinkCascade(root, before: PageIndex, after: PageIndex, scope)`, owned by `Core/Nexus/cascade.ts`. It replaces the title arm of `renameCascade` and the decision inside `deleteCascade`.
- **Inputs:**
  - `before` is `pageIndexOf(tree)` on the tree captured **before** the relocate. It's free, since it's memoized.
  - `after` is derived purely from `before`'s page list plus the change list `{id, from, to}[]`. Rebuilding it with `buildPageIndex` is O(N), but it only runs per user op, never on a high-frequency trigger. Deriving it avoids depending on `moveNodeInTree` having patched the tree.
  - `scope` is `{ titles: titleKey[], dirs: oldPrefix[] }`.
- **Candidate files:**
  - `queryMentions` for each title in `scope.titles`.
  - **One new index query** for path-form relations whose written folder lies at or under each old prefix.
  - Fallback: one `nexusCorpus` walk when the index isn't ready.
  - Then the existing tiles, Space and cache arms.
- **The index must keep `target` = title key**, meaning the last segment, and gain a written-folder column (`''` for bare links). If the resolver work keys `target` by the full address, `queryMentions(title)` silently misses every path link and the rename and delete cascades break. Without the folder column, a Collection rename would have to fan out `queryMentions` over every title it holds and read most of the Nexus to re-spell a handful of links. The hard rule forbids that.
- **Decision per link hit:** this replaces the title-equality filter in `rewriteConnections`. `follower` and `carry` stay as the primitive.
  1. `P = before.resolve(written)`. If it isn't resolved, or P isn't in the affected set, skip the link.
  2. The affected set is the changed ids plus the holders of the titles in `scope.titles`.
  3. Build the in-place candidate: replace the title segment if P's title changed, and replace the folder part if the link is path-form.
  4. If `after.resolve(candidate)` is P, write the candidate. Otherwise write the **canonical spelling** of P in `after`: bare when its title is unique, path otherwise, through the same writer the picker uses (`pageLinkText`).
  - This keeps the author's form and today's case-following on case-only renames.
  - Renaming one of two twins now moves the path links that pointed at it, which fixes the "rewrites nothing" rule. Bare links that were ambiguous stay put, so mutate.test.ts:383 stays true.
- **Per event:**
  - **Page rename:** titles = {old, new}, dirs = none.
  - **Page move:** titles = {title}. A single page's path links all carry its title key, so `queryMentions` alone suffices.
  - **Set move, Collection/Set rename:** dirs = {old prefix}. Titles don't change and their holder counts don't either, so bare links can never be affected.
  - **Restore with destination plus `freeName`:** rename and move at once, handled naturally because the unit is keyed by id.
- **Delete:** the same unit with P gone from `after`. Strip a Link value when `before` resolves it to something (resolved **or ambiguous**) and `after` reads it phantom.
  - This keeps cascade.test.ts:568 and :578 true. A rule of "resolved to a deleted page" would make :578 false, because ambiguous twins both deleted would no longer be stripped.
  - Pass `before` in. Today's post-delete `heldTreeOf` read is a latent ordering trap.
  - Bodies stay phantoms, as now.
- **Restore:**
  - `frozenWorld` becomes the `after` index (tree pages plus landing pages at their landing paths, with ids from `pageIdsOf`, holdings.ts:64). `gonePageEntry` then asks whether the written link resolves, instead of whether a title is held. One construction serves both the scrub and the cascade.
  - Recorded values: add a `target` id to `StrippedLink` (record.ts:22-26) at strip time, since the delete knows it from `before`. Restore then re-spells by id instead of `rewriteConnections(was, landed)`, and `parkLinks` parks by id instead of by title.
  - Values the scrub drops still have to be matched by title, unless the record also stores the original path.
- **Heading rename:** keep its own arm, but decide by resolution: the hit resolves to page X and its qualifier is the old heading. The editor's own-body rewrite (headingRenameSettle.ts:57) runs the same pure decision against the renderer's `PageIndex`, so there's one definition. This fixes the twin bug.
- **Tiles:** generalize the `tilesLinkHeading` cache into one tile-relations cache of title keys, folder keys and heading pairs. It then gates title renames, moves and headings alike. Without it, every sidebar drag would read every tile.
- **Alternatives weighed:**
  - Canonical-always re-spelling (simpler, matching Obsidian's regenerate-on-rename) loses the author's form and needs a separate case-only rule.
  - Title fan-out for folder ops costs too much.
  - Owing the cascade inside `relocate` itself was rejected. `relocate` doesn't know the before/after semantics, and it also serves sidecar migration, Contexts and the Trash.

###### The Collision Case
- **It falls out of the same unit at almost no extra cost:** add the arriving title to `scope.titles`. Bare `[[T]]` links that resolved to the old sole holder Y are ambiguous in `after`, so they get Y's canonical path spelling.
- **Gate:** `before.holders(T).length === 1`. With 0 holders nothing resolved, and with 2 or more holders the links were already ambiguous. Either way, skip with no query.
- **Events that can collide:**
  - Page rename onto a held title (rename.ts).
  - `fromCreate` rename. It must stop skipping the cascade, which makes mutateRequest.ts:64 false.
  - `createPageOp` (create.ts:42).
  - Restore (spend.ts:171-177; `freeName` checks siblings only).
  - Bringing excluded or unreadable folders into reach: a rescope or Try Again (fileEvents.ts:139-143, 514-519).
  - External add.
  - Moves and folder renames **can't** collide under full-path resolution.
- **Recommendation:** handle collisions for in-app events only.
  - External events would need the pre-batch tree captured in `settleBatch`.
  - With `awaitWriteFinish`, an add can arrive in a later batch than its unlink, or out of order. An external *move* can then read as a transient collision, re-spell bare links to the old path, and then phantom them once the unlink lands.
  - Obsidian and Sync have usually already done their own rewrite.
  - Put to the owner: creating "Notes" rewrites other files. Sync churn is the trade.

###### Risks and Errors to Avoid
- **No global mutation serialization** (`withWriteRoot`, Contract/handlers.ts:99-111). Two address-changing ops can interleave: their captured before-trees go stale, and a sweep reads paths the other op just moved (counted as skipped). Serialize rename, move, delete, restore and create under one host lock, as `underContexts` does (mutate.ts:73).
- **Don't model rename-then-move as two cascades.** The second one's `before` must be the first one's `after`. The id-keyed unit handles restore's combined case.
- **Capture before the relocate.** `renameCascade` reading `liveTreeOf` (cascade.ts:191) is post-change by construction.
- **Requiring full Nexus-relative paths in the resolver** keeps path links collision-free. Partial-suffix resolution (Obsidian reads it) makes moves able to collide and in-place folder replacement ambiguous.
- **`carry`/`namesTarget` (rewrite.ts:31-42, connections.ts:153)** compare shown text against `from.title`. If `PageName.title` becomes the full address, a shown "Notes" stops following a rename. Compare against the title segment.
- **`skipRel`:** the editor's heading rename sends its path as known in the renderer (editorHost.tsx:152). After a move that path is stale, so the cascade also rewrites that page's body on disk, racing the editor's unsaved body. Unverified: whether the editor's save is repointed by id (`livePagePath`, record.ts:80, is used in the history window).
- **A folder rename while an editor holds a body:** the cascade writes moved files under lock, and the renderer absorbs them via `pages:changed` (useBridgeSubscriptions.ts:84). That's existing for title renames, but folder ops widen it to many open pages.
- **The 800ms descendant echo window** (writeEcho.ts:10): a large folder's child echoes landing late arrive as watched unlink and add. That's harmless for the tree, but they must never trigger a cascade, which is another reason to keep external events cascade-free.
- **Files outside the tree** (loose root pages, withheld folders) are link sources but never targets. Keep `before` and `after` built from `pagesOf(tree)` only. Decide whether the rename sweep keeps reaching loose files while delete excludes them (cascade.ts:113).
- **A cold index:** the dirs query must fall back to one `nexusCorpus` walk, not a walk per page.

###### Simplification Opportunities
- One resolution-based decision replaces `titleHeldOutside` (heldPages.ts:38), the `gone` title set, `frozenWorld.holds`, `parkLinks`' title keying, and the restore's `rewriteConnections(was, landed)`.
- One tile-link cache replaces `tilesLinkHeading` and the unconditional all-tiles read on title renames.
- An id on `StrippedLink` makes the Trash's "names this page" id-based throughout, matching `trashedHolders` (holdings.ts:97-125), which is already id-based.

###### What Becomes False
- **ConnectionsPM.md:**
  - :11 (path separator means an address).
  - :19 ("until one side is renamed").
  - :26 ("resolves by title… names the old title").
  - :30 (strips "naming it", and the last sentence).
  - :78 (the Duplicate disambiguation prospect).
- **PagesPM.md:14:** the last clause.
- **PropertiesPM.md:82:** "a title two pages share is refused".
- **CollectionsPM.md:45:** "rename is a folder rename".
- **CorePM.md:83:** "the page index both processes resolve titles through".
- **Comments:**
  - links.ts:37.
  - heldPages.ts:37 and :46.
  - cascade.ts:81 and :161.
  - mutateRequest.ts:64 (`fromCreate`).
  - rename.ts:38-41 (logic).
- **Tests:**
  - mutate.test.ts:398 (the "no cascade" title).
  - Any `namesPage` or `targetTitle` slash case in links.test.ts and connections.test.ts. I didn't find an explicit slash assertion; the grammar scout should confirm.
- **Stay true under the proposed rules:** mutate.test.ts:383 and cascade.test.ts:568/:578. :578 becomes false under a "resolved-to-deleted" delete rule.

###### Opinions
- The single best lever is the index shape: title-key `target` plus a written-folder column. Settle that before the resolver work changes `LinkHit.target`.
- Keeping external rename and move cascade-free is consistent with today's behavior for titles. The precedent against it is that external heading renames already cascade.
- Pairing unlink and add by id within one batch is feasible later; the pre-batch tree exists at settle.ts:200. It's YAGNI for now.

---

### Round 1 — Obsidian Path Semantics

**MODEL:** `sonnet-medium`
**SUPERSEDED:** Stands. Partial-path reading was ruled in as intended behavior (A-4), though whether Obsidian itself matches partial paths by suffix remains unconfirmed.

#### Brief

You are a research scout. Don't edit any file. Establish, with cited sources, exactly how Obsidian handles path-based link disambiguation, so another app (Pommora, which reads and writes the same Markdown vaults) can match Obsidian's syntax and semantics. Prefer primary sources: help.obsidian.md, the Obsidian API typings (`obsidian.d.ts`: `MetadataCache.getFirstLinkpathDest`, `MetadataCache.fileToLinktext`, `FileManager.generateMarkdownLink`, `getLinkpath`, `parseLinktext`), the official forum, and well-known plugin source that documents the behavior. Mark anything you couldn't confirm from a source as unconfirmed rather than guessing.

Answer each:

1. **Link format setting** ("New link format": Shortest path when possible / Relative path to file / Absolute path in vault). Under "Shortest path when possible", what is written when the file name is not unique: the full vault-relative path (`Folder/Sub/Note`), or the shortest unique path suffix (`Sub/Note`)? Is there a leading `/`? Is the `.md` extension omitted in wikilinks?
2. **Markdown links** (with "Use [[Wikilinks]]" off): the exact form written — `.md` extension kept? spaces as `%20` or angle brackets `<...>`? Does Obsidian resolve a markdown link destination written without `.md` (`[x](Folder/Note)`)?
3. **Resolution of a linkpath**: for `[[Note]]` when several files share the basename, which one wins (same folder as the source? shortest path? first indexed?), and is it ever shown as unresolved? For `[[Sub/Note]]` (a partial path), does Obsidian match by path suffix, by path relative to the source file, or only exact vault-relative path? Order of precedence between exact vault path, relative-to-source path, and suffix match. Case sensitivity.
4. **Display**: in Live Preview and Reading view, what does an unaliased path link `[[Folder/Note]]` display — the full path or just `Note`? Does the link autocomplete insert an alias automatically for path links?
5. **Autocomplete**: when two notes share a name, how does the `[[` suggester show them and what does picking one write?
6. **"Automatically update internal links"** on rename and on move (file and folder): what exactly is rewritten? Does a path link get its folder part updated on a move? Does a bare link get rewritten to a path link when a rename creates a name collision? Does a path link ever collapse back to a bare name when the collision goes away? What happens to existing bare links when a new file with a duplicate name is created?
7. **Headings and embeds**: `[[Folder/Note#Heading]]`, `![[Folder/Note]]`, `[[Folder/Note|Alias]]` — any differences in path handling? Attachments (`![[Folder/image.png]]`) — same path rules?

Report each answer in two or three sentences with its source URL, then a short summary table of the rules, then anything surprising or relevant to an app wanting to match this behavior.

#### Report

Scope note: no files edited. The official docs are thin on resolution and rename, so several answers are unconfirmed and would need a scratch-vault test. Each answer below is labelled CONFIRMED (primary source), FORUM (community or staff post), or UNCONFIRMED.

**1. Link format, "Shortest path when possible"**
- CONFIRMED: the API typing for `MetadataCache.fileToLinktext` says "If file name is unique, use the filename. If not unique, use full path." Its example returns `'bar'` or `'foo/bar'`. So a non-unique name gets the full vault-relative path, not the shortest unique suffix. https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts
- FORUM: a developer answer relayed by ryanjamurphy agrees: "If it's not unique, then it's the absolute path from the vault root." https://forum.obsidian.md/t/settings-new-link-format-what-is-shortest-path-when-possible/6748
- FORUM, contradicting: one user in the disambiguation thread says it adds "the shortest path that makes it unique". This is a user claim, and the typings and developer answer outrank it. https://forum.obsidian.md/t/disambiguiting-mutiple-files-with-the-same-name/32110
- No leading `/` is written in absolute mode (a forum feature request notes this). https://forum.obsidian.md/t/absolute-link-path-has-higher-precedence-than-relative-path/69542
- `fileToLinktext` takes `omitMdExtension`, and Obsidian's wikilinks normally omit `.md`. The help page says `.md` is optional in both link styles. https://obsidian.md/help/links
- Relative mode ("Relative path to file"): UNCONFIRMED in detail. `generateMarkdownLink(file, sourcePath, subpath, alias)` computes it from `sourcePath`, and the forum thread above shows `../A.md` style output.
- `generateMarkdownLink` example from the typings: `[[bar#heading|Display text]]`, "depending on the user's link settings".

**2. Markdown links (wikilinks off)**
- CONFIRMED: the help page's form is `[Three laws of motion](Three%20laws%20of%20motion)`, with "blank spaces become `%20`". It says `.md` is optional, and its alias example is `[Custom name](Example.md)`. https://obsidian.md/help/links
- FORUM: Obsidian itself writes `%20` and does not generate `<...>`. It reads `<...>` when typed, but rename and link updating of `<...>` links was buggy. https://forum.obsidian.md/t/support-internal-links-with-markdown-angle-bracket-syntax-especially-rename/36007
- Backslash-escaped spaces do not work (FORUM, same search results).
- Whether Obsidian writes `.md` in markdown links is UNCONFIRMED. The usual output is `[A](A.md)` (shown in the precedence thread), and an old bug (0.9.2 to 0.9.15, reportedly fixed by 0.9.20) stripped it on move. https://forum.obsidian.md/t/updating-internal-links-removes-file-extension-when-using-markdown-links/6934
- Resolving an extensionless `[x](Folder/Note)`: the help page says `.md` is optional in both formats, so it resolves. This is CONFIRMED by the doc wording only, and I did not test it.

**3. Resolution of a linkpath**
- CONFIRMED: `getFirstLinkpathDest(linkpath, sourcePath)` is documented as "best match". The typing example: `('foo/bar', 'baz/qux.md')` returns `baz/foo/bar.md` or `some/other/path/foo/bar.md`. That implies a relative-to-source candidate and a vault-wide partial-path (suffix) candidate both exist, with the relative one listed first. This is an inference from the example, not a stated rule.
- FORUM (staff-ish reply, called intentional): with `A.md` at the root and `Folder/A.md`, a `[[A]]` in `Folder/B.md` resolves to the root `A.md`, even from inside `Folder/A.md`. The stated reason is that `[[A]]` should point to the same note everywhere, so there is no same-folder preference for bare names. The forum request thread lists the current default as "Absolute path first, fallback to relative path". https://forum.obsidian.md/t/absolute-link-path-has-higher-precedence-than-relative-path/69542 and https://forum.obsidian.md/t/add-settings-to-control-link-resolution-mode/69560
- FORUM: a leading `/` (`[[/A]]`) forces vault-absolute. A leading `./` (`[[./A]]`) forces relative to the source file.
- UNCONFIRMED: which duplicate wins when the basename is ambiguous and none is at root. A forum user recalls "first found". A third-party doc calls it non-deterministic. A plugin author says that if `sourcePath` is "fully specified, then that version of the file is picked". https://forum.obsidian.md/t/how-to-get-full-paths-from-link-text/75146
- UNCONFIRMED: whether `[[Sub/Note]]` is a true suffix match, and the exact precedence among exact vault path, relative-to-source and suffix. One third-party skill doc claims a path-qualified link is an exact match with no basename fallback, which is not primary. I found no source on case sensitivity, and no source saying an ambiguous name shows as unresolved.
- Aliases: one 1.12.7 report says the resolver does not consult frontmatter aliases. Treat it as a single unverified report.

**4. Display**
- FORUM: the rendered link shows the full path text. The "[[Link]] is showing file path" thread confirms it for Reading view, when the target name is non-unique. Frontmatter aliases do not change Live Preview display (UNCONFIRMED, thread silent), but in Reading view they replace the path. The explicit fix is a link alias, `[[Folder/Note|Note]]`. https://forum.obsidian.md/t/link-is-showing-file-path-compatibility-with-logseq/18521 and https://forum.obsidian.md/t/how-can-i-stop-displaying-paths-in-internal-links/50618
- Whether Live Preview displays the full path or only the basename is UNCONFIRMED.
- Does the suggester insert an alias automatically for path links? UNCONFIRMED. One thread says it does not insert one, and autocomplete shows the full path.

**5. Autocomplete**
- FORUM: joethei says "obsidian will automatically add the path to the link when you select it in the suggestion." The suggester lists the full path for duplicates. Picking one writes the path form that `fileToLinktext` produces, which is the full vault-relative path. https://forum.obsidian.md/t/disambiguiting-mutiple-files-with-the-same-name/32110
- The exact suggester row layout is UNCONFIRMED.

**6. Auto-update on rename and move**
- CONFIRMED (help): Obsidian updates internal links in the vault on rename, and with the setting off it prompts instead. https://obsidian.md/help/links
- FORUM: the setting does not apply to edits made outside Obsidian. A NameGuard plugin description says that when a name stops being unique, `fileToLinktext` falls back to a full path and `FileManager` rewrites the affected links right after the create or rename (secondhand plugin claim). https://github.com/toadfans/nameguard
- FORUM: creating a new note whose name matches existing link targets does NOT prompt or rewrite the existing links. https://forum.obsidian.md/t/user-isnt-asked-to-update-internal-links-when-creating-new-notes-in-case-of-name-conflict-untitled/109026
- UNCONFIRMED by any source: whether a move rewrites the folder part of path links, whether a rename that creates a collision rewrites bare links to path links, whether a path link collapses back to a bare name once the collision goes away, and the folder-move details.
- Single-file moves with markdown links: an old bug (0.9.x) stripped `.md`, and was reportedly fixed.

**7. Headings, embeds and aliases**
- CONFIRMED: the help page shows `[[Note#Heading]]`, extra `#` for subheadings, and `[[Example|Custom name]]`. `parseLinktext('foo#bar')` returns `{path:'foo', subpath:'#bar'}`, and `getLinkpath` strips the subpath. So the path is parsed before `#` and the alias comes after `|`, with the same path rules for all of them. https://obsidian.md/help/links and the typings.
- Embeds `![[...]]` and attachments: UNCONFIRMED. No source found stating that they differ, so assume the same path rules.

**Summary table**
| Rule | Status |
|---|---|
| Unique name: bare name, no `.md` in wikilinks | CONFIRMED (typings) |
| Non-unique name: full vault-relative path, no leading `/` | CONFIRMED (typings and dev answer); one user says shortest suffix |
| Bare `[[A]]` with root and nested duplicates: root wins, no same-folder preference | FORUM |
| `/` prefix forces vault-absolute, `./` forces relative-to-source | FORUM |
| Markdown links: `%20` encoding, `.md` optional | CONFIRMED (help); `<...>` read but not written (FORUM) |
| Suffix match, exact-path precedence, case sensitivity, unresolved on ambiguity | UNCONFIRMED |
| Display shows the full path unless aliased | FORUM |
| Suggester adds the path for duplicates | FORUM |
| Rename and move rewrite links when the setting is on | CONFIRMED |
| Collision rewrites, collapse back, new-duplicate behavior | UNCONFIRMED (creating a duplicate does not rewrite existing links, FORUM) |

**Relevant to an app matching this**
- The most important finding is that "shortest path" means filename-or-full-path. It never means a shortest unique suffix, so Pommora should write `Folder/Sub/Note` (not `Sub/Note`) for non-unique names to match Obsidian.
- Reading is more lenient than writing. Obsidian resolves partial paths per the typing example, so a Pommora reader should accept suffix and relative forms, and a writer should emit only the bare or full-path forms.
- Duplicate bare names are a real ambiguity. Root wins by design, and otherwise the result is unconfirmed.
- Because several rename and move behaviors and case sensitivity are unconfirmed, a short scratch-vault test (duplicates at several depths, then a rename and a move) is the quickest way to settle them. The Obsidian API docs (https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/getFirstLinkpathDest) give only the signature.

---

### Round 2 — Triggers and External Moves

**MODEL:** `opus-high`
**SUPERSEDED:** Briefed before partial paths were ruled in: its split between a path-only relink and a title-only rename cascade is superseded by E-2 (one re-spell rule for every form). Its in-operation versus settle trade-off is settled by E-5 and left open by E-6.

#### Brief

You are a read-only scout in Pommora (repo root `~/The Studio/Projects/Project Pommora`). Edit nothing. This is the second scouting round of a planning session; the owner asked for it explicitly: "name everything you think you need to add or include and look for what already exists first." Your job is to find what already exists for each proposed addition below, so the plan reuses it instead of building beside it.

##### The Feature

Pages are Markdown files in Collections (folders) and Sets (subfolders); a page's title is its file basename, and two pages in different folders can share one. Links today resolve by title only (`Core/Connections/pageIndex.ts`), and a shared title reads Ambiguous. The plan adds Obsidian-style **path links**: a link to a page whose title another page shares is written `[[Folder/Sub/Title]]` / `[Label](Folder/Sub/Title)` (the full path from the Nexus root, no `.md`), and resolves by exact Nexus-relative path. Every link that pointed at a page must keep pointing at it when the page, or any folder above it, is renamed or moved, whether inside Pommora **or outside it** (Finder, Obsidian). The owner's rulings: links keep their written form and are re-spelled only where they would otherwise break; a collision made in-app (a create, rename, or restore giving a title a second holder) re-spells existing bare links to the original page into its path; the design must be cheap, since path links are rare, and the owner says: "Folder cascades ALREADY exist within how filtering and groupings resolve, so this shouldn't be as much of new machinery as you initially think."

##### What Round One Found (Don't Redo; Verify Where You Rely On It)

- In-app ops (`Core/Nexus/rename.ts`, `move.ts` `movePageOp`/`moveSetOp`, `folderEntity.ts` `renameFolderEntity`, `Core/Trash/delete.ts`, `Core/Trash/spend.ts` restore) all go through `relocate` (`Core/Files/atomicWrite.ts:72`) → `noteOwn(move)` → `applyOwn` → `applyEvents` → `moveIndexPaths` + `moveNodeInTree` (`Core/Nexus/settle.ts:36-48`, `fileEvents.ts:571-591`). By the line after the relocate, the held tree and the index are post-change.
- Only page renames cascade links today (`renameCascade`, `Core/Nexus/cascade.ts:162`); moves, set moves, and folder renames cascade nothing.
- The watcher (`Desktop/FileWatch/watcher.ts:127-131`) emits add/change/unlink/addDir/unlinkDir; an external rename or move reaches Core as an unrelated unlink and add; `applyPage` compares ids at one path only (`fileEvents.ts:397-398`). `settleBatch` (`settle.ts:193-210`) holds the pre-batch tree at its start. External heading renames already cascade (`fileEvents.ts:297-309`) by comparing prior index rows at the same path.
- No global lock serializes address-changing ops (`withWriteRoot`, `Core/Contract/handlers.ts:99-111`); `underContexts` (`Core/Nexus/mutate.ts:73`) serializes Context writes.

##### Your Slice: Triggers, External Moves, and What Already Follows Folders

For each proposed addition, find what exists that already does it or nearly does, with file:line, and say whether it can be reused as is, adjusted, or must be added:

1. **One trigger point for every address change.** Proposed: run the link re-spell ("relink") from the one place every move flows through, with the tree before and after in hand, instead of hooking each op. Does such a point exist (the `move` event stream through `applyEvents`/settle)? Does it see renames, page moves, set moves, folder renames, Trash deletes (a move out of the tree), and restores (a move back in)? Are the before and after trees both available there, or can they be? What else rides `relocate` (sidecar migration, Contexts, Trash) that the trigger must ignore?
2. **External move/rename detection.** Proposed: recognize an external unlink + add of the same page ID as a move. What already pairs or tracks IDs across paths: the remint ledger (`Core/Nexus/remintLedger.ts`, its persisted `{ id, kind, title, path }` baseline), identity (`identity.ts`, `identityMark.ts`), the duplicate-ID judge, `treeStabilize.ts`, `treeDelta.ts`, the catch-up on open (`missedEvents`), adoption? Does any of them already turn an external rename into "same entity, new path" in the tree or the index? What happens when the unlink and add land in different watcher batches (`awaitWriteFinish`, the 200 ms settle)? What does the external **heading** rename cascade do that a path relink could mirror? A move made while the app was closed: does the catch-up see it?
3. **"Folder cascades already exist within how filtering and groupings resolve."** Find what the owner means: anything that follows a folder rename or move today — saved views' filters and groupings by location/collection/set, `reachConfig`/`goneEdit` (`configReach.ts`), `moveIndexPaths` and `removePathPrefixIndex` in the stores, property caches keyed by path, recents, tabs, `livePagePath`, nav state, path-prefix helpers in `Core/Paths/`. For each, how does it learn the old → new mapping, and could the relink take its old → new mapping from the same place?
4. **Serialization.** Is there an existing lock or queue that already serializes renames, moves, deletes, and restores together with their follow-on work (`machine().lock`, the sweep's per-file locks, `settleNow`)? Would a relink run from the trigger point be naturally serialized, or race a second op?

##### How to Assess

- **Simplest thing that works wins**; **reuse before invention** — hand-rolled parallels to existing mechanisms are this codebase's most common avoidable defect; **YAGNI**.
- Pommora hard rules: the host owns the machine (Core reaches it through `Core/Platform`); read-write separation; never a full-Nexus rebuild or re-walk when an incremental or cached update works; no expensive work on a high-frequency trigger.
- Review what's there rather than confirming the framing; if a round-one claim above is wrong, say so with evidence.

##### Report

Concisely, with citations: for each of the four items, **what exists**, **what it would take to reuse it**, and **what genuinely must be added** (the smallest form). Then your **proposed trigger design** end to end (in-app and external), with alternatives weighed; **risks** as named sequences that reach a bad state; and anything this would make false in `.claude/Features/*.md`, comments, or tests.

#### Report

##### Path Links Scout, Round Two: Triggers, External Moves, What Already Follows Folders

Read-only; nothing was edited. All paths are relative to `~/The Studio/Projects/Project Pommora`.

###### The Blocker: External Renames Often Arrive Split Across Two Batches

- **The timing:** the watcher's debounce and chokidar's `awaitWriteFinish.stabilityThreshold` are both `SETTLE_MS = 200` (`Desktop/FileWatch/watcher.ts:38,106,124`), and chokidar is 5.0.0 (fs.watch). An outside rename emits `unlink` right away, which starts the 200 ms debounce. The `add` comes only after the new file has held still for 200 ms, polled every 50 ms, so it lands at about 200–250 ms. That's right on the debounce edge, so whether the two share a batch is luck.
- **Same batch doesn't fix it either:** the unlink applies first, so by the time `applyPage` runs (`Core/Nexus/fileEvents.ts:397-398`) the old path is already gone from the tree.
- **Consequence:** any design that pairs only inside one batch, or diffs one settle's before and after, will miss some fraction of external renames without saying so. Pairing has to remember vanished IDs across settles.

###### Round-One Corrections

- **"settleBatch holds the pre-batch tree":** false. `settleBatch` (`Core/Nexus/settle.ts:193-210`) captures no tree. The only before-tree in the settle is `pushed` (`settle.ts:59`), set at `:154` and also by `recordHanded` (`:77`) whenever the window calls `nexus:state`.
- **"Every in-app op goes through relocate":** not quite. System-trash deletes go through `discardFile` (`Core/Trash/bundle.ts:65-76`), which emits its own `unlink` without a relocate. Everything else holds: `relocate` awaits `noteOwn` → `applyOwn` → `applyEvents`, so the tree and index are post-change on the next line.
- **Echo suppression covers in-app moves:** `relocate` calls `recordWrite(from)` and `recordWrite(to)`, so the watcher drops the echoes (2 s for the exact path, 800 ms for descendants; `Core/Files/writeEcho.ts:8-10,79-92`). An in-app move doesn't fire twice.

###### 1. One Trigger Point for Every Address Change

**What exists:**
- `settle()` (`settle.ts:124-163`) is the one place every change reaches the window. It already pays `owed.renames`, the outside heading-rename cascade, through `cascadeSeen` (`settle.ts:128-132`, `fileEvents.ts:297-309`).
- It runs one at a time (`inTurn`, `settle.ts:57`). `withWriteRoot` settles in its `finally` before the reply leaves (`Core/Contract/handlers.ts:99-111`).
- The cascade's own writes re-enter `applyEvents` from inside the settle turn without deadlock, so `cascadeSeen` is a working precedent for this.

**What each op looks like at the event level:**
- **In-app:** every `Moved` event is own-origin, since only `relocate` builds one (`writeEcho.ts:45-51`). `applyMove` (`fileEvents.ts:571-591`) has `from`, `to` and the pre-move tree.
  - Page rename, page move, set move and folder rename succeed through `moveNodeInTree` (`Core/Nexus/treePatch.ts:238-264`).
  - A Trash delete to `.trash/` (`Core/Trash/delete.ts:94`) or a restore from it (`Core/Trash/spend.ts:205`) falls through to an `unlink` plus an `add` (`:586-590`).
- **External:** unrelated `unlink`/`add` and `unlinkDir`/`addDir` events. Moves that fall back to a walk are only visible by comparing the old and new trees inside `walkWhileOwed` (`settle.ts:98-122`), which holds `was` before `refreshTree`.

**What the trigger must ignore:**
- The sidecar migration in `Core/Nexus/adopt.ts:123`, which moves a sidecar inside its own folder.
- Context folder relocates in `Core/Contexts/contextCascade.ts:233,248,292,327,361`. `applyMove` already sends those to a walk (`:585`).
- Spaces, which `recordsOf` lists with IDs and paths. Pair pages and containers only.
- Any `to` under `.trash/`.

**Deletes and restores need no path relink:**
- **Delete:** links keep their written form and read as phantoms, the same as bare links today (`.claude/Features/ConnectionsPM.md:30`).
- **Restore:** it lands at the original path, or at `Name (2)` only when that path is taken. In the taken case the old path now belongs to another page, so links to it don't break.
- Restore matters only for the collision re-spell.

**What must be added:** an `owed.relinks` queue paid in `settle()` the way `owed.renames` is. It runs *after* `walkWhileOwed`, so walk-placed arrivals are visible, then `walkWhileOwed` runs again if the relink's own writes owed a walk.

###### 2. Recognizing External Moves and Renames

**What exists:**
- **Nothing pairs IDs across paths live.** The remint ledger's `{ id, kind, title, path }` baseline is written only at open (`Core/Nexus/remintLedger.ts:96`, called only from `Core/Nexus/handlers.ts:98`).
- **The baseline is unsafe as a before-state.** It reflects the previous open, not the last close. Here's the bad sequence: A moves X→Y in-session and is relinked; B is created at X with links to X; the next open pairs A as X→Y and rewrites B's links.
- **The other candidates don't pair either:**
  - `identity.ts` handles the Nexus's own ID.
  - `identityMark.ts` handles ID admission.
  - `treeStabilize.ts` reuses unchanged subobjects by position.
  - `treeDelta.ts` diffs trees by path key.
  - Adoption stamps missing IDs.
  - The duplicate-ID judge (`remint.ts` `adjudicate`) runs only at open.
- **The tree and index follow outside renames by re-reading, not by pairing:**
  - The tree re-reads disk (tests at `Core/Nexus/fileEvents.test.ts:417-433`).
  - The index deindexes the old path and reindexes the new one.
- **The heading cascade is the shape to copy.** It compares the index rows it's about to replace with the new ones at the same path (`Core/Index/indexSeed.ts:124-142`, `reindex`), reports `HeadingRenameSeen`, owes it, and the settle pays it. The same `reindex` runs in the open-time seed, which is how renames made while the app was closed are caught.
- **The index already stores every page's `ID`.** `page_values` holds the full frontmatter (`indexSeed.ts:40-60`, `Desktop/Store/ddl.ts:34-40`, `Desktop/Store/stores.ts:59`). A values-by-paths-and-key read exists (`stores.ts:147`).
- **Catch-up:** `missedEvents` → `seedContentIndex` re-reads changed files and prunes vanished paths (`indexSeed.ts:224`) but doesn't pair them. A move while the app was closed is seen today only as a removal plus a new page.

**Smallest addition (index-sourced, so live and catch-up share one source):**
- **Vanished:** read `ID` before rows are removed, in `deindexPath` (a live `unlink`; the `unlinkDir` prefix case reads the IDs under the prefix) and in the seed's prune at `indexSeed.ts:224`.
  - Keep a session-scoped `vanished: Map<id, oldRel>` on `Owed`, carried across settles like `stamp` and `renames` (`settle.ts:139`).
  - Keep the *first* `was` for an ID so chained moves (A→B→C) pair A→C.
- **Arrived:**
  - Live: in `indexEvent`, but only for a watched `add` whose path had no prior row, so editor saves pay nothing extra.
  - Catch-up: the seed's re-read paths that weren't in `indexed`.
  - The seed returns `moves` beside `renames` in `SeedReread`. Both places that owe `renames` (`handlers.ts:102-103`, `settle.ts:173-178`) owe `moves` too.
- **In-app:** `applyMove` owes `{from, to}` directly. `moveIndexPaths` renames the rows instead of removing them (`indexSeed.ts:151-166`), so nothing gets recorded as vanished. Late child echoes find rows already renamed and record nothing.
- **Pairing:** at settle, `arrived ∩ vanished`, done only when something arrived. Re-checking pending entries on every settle would rebuild `pagesByIdOf` at O(N) per frontmatter save.
- **Occupancy guard instead of a time limit:** drop a vanished entry whose `was` is now held by a different ID.
- **Cost:** one SELECT per unlink and per external add. No tree hooks; walk-placed arrivals are covered because `indexEvent` runs on every event before `applyOne` (`fileEvents.ts:656`).
- **Alternative source:** record vanished IDs from the tree in the `gone` arm (`fileEvents.ts:608-612`) and arrivals in the place branch of `applyPage` (`:398`), the placed subtree of `applyFolder`, and a walk diff of `was` against `walked`. It's equivalent live, but needs four hooks and still needs the index for catch-up.
- **Index granularity:** the index has page rows only. An outside folder rename yields N page pairs. The plan can collapse pairs that share one prefix mapping, or accept N queries.

###### 3. "Folder Cascades Already Exist": What That Really Is

Nothing rewrites a mapping from old paths to new ones. These all follow by **ID**, resolved through the live tree, so they need no cascade:
- **Location filters and groupings** store container IDs (`Core/Views/Pipeline/filter.ts:88-114`, `Core/Views/Pipeline/group.ts` setTree). The by-name operand (`foldKey(n.title)`, `:98`) doesn't follow renames, which makes it the analog of a path link.
- **`goneEdit`/`reachConfig`** (`Core/Nexus/configReach.ts:282-306,339-403`; `Core/Nexus/move.ts:54-66`) strips the IDs of a Set that left its Collection. That's ID scope.
- **Tabs, selection, recents and pinned** are `NavRef {kind, id}` (`Core/Navigation/navRef.ts`) re-pathed by `reconcileIndexOf` (`Core/Nexus/treeIndex.ts:91-121`).
- **Also ID-keyed:** `livePagePath` (`Core/Nexus/record.ts:80-83`), file history, and the property cache (keyed by page ID, `Core/Properties/propertyCache.ts:1`).
- **Already pairs by ID:** `movedHeadings` (`Core/Session/nexusSlice.ts:28-42`) diffs before and after trees by ID, renderer-side, for in-app moves only. It could share a hoisted `movedPages(before, after)` with the walk diff if the tree-sourced alternative is chosen.

The one real path-text prefix cascade:
- **`followExcludedFolders`** (`Core/Settings/settings.ts:98-106`) maps `entryWithin(entry, from)` to `[to, ...rest]` (fold-aware, `Core/Paths/exclusion.ts:98`).
- **Hook point:** `relocateFolder`'s `landed` callback (`Core/Nexus/folderEntity.ts:31-32`); restore uses `reseatExcludedFolders`.
- **It's in-app only.** An outside folder rename leaves `excluded_folders` stale today (an adjacent gap).
- Index rows follow by prefix through `renamePathPrefixIndex`, using the range trick in `stores.ts:47`, for own moves only.

**What the relink can reuse:** the old→new mapping comes from identity (container or page ID across before and after), the principle the views already use. The text rewrite reuses the `entryWithin` prefix primitive. File text can't hold IDs (the legibility rule, and Obsidian), so the text rewrite is genuinely new.

###### 4. Serialization

- **What's already serialized:** settles (`inTurn`) and watcher batches (`batchQueue`, `watcher.ts:42`).
- **What isn't:**
  - A batch's `applyEvents` runs outside `inTurn` (`settle.ts:201`).
  - Ops have no shared lock. `withWriteRoot` wraps `fn` with none, and `underContexts` (`Core/Nexus/mutate.ts:73-81`) covers Context ops and restore only.
  - The renderer flushes saves before a move (`nexusSlice.ts:237-238`) but doesn't queue mutate calls.
  - `relocate` locks only the source path, and sweeps lock per file.
- **A relink paid in `settle()`** is serialized with every other settle and cascade, and the op's reply waits for it.
- **The tradeoff to pick:** in-app title cascades run inside the op and return `cascade.warning`, which the renderer shows (`Core/Nexus/rename.ts:42`, `nexusSlice.ts:246-247`). Owed cascades only log (`fileEvents.ts:307`), and no push channel carries warnings (`Core/Contract/bridge.ts:282-299`).
  - Paying the relink in the settle for both cases unifies them but loses the user-facing "N links weren't updated" notice for in-app moves.
  - Keeping in-app relinks inside the op (the heading precedent: the `renameHeading` op runs the cascade itself, and outside renames are owed) keeps the notice but adds a call per op.

###### Proposed Trigger Design

1. **In-app:** `applyMove` success, outside `.trash` and Contexts, owes `{from, to}` for a page or a container (one prefix pair for a folder).
2. **External live:** vanished IDs are recorded at `deindexPath`, arrivals at a watched `add` with no prior row; they pair in `settle()` when something arrived, with the occupancy guard.
3. **Catch-up** (open and watcher restart): the seed pairs pruned IDs against new paths and owes them through the existing `renames` lines.
4. **Pay:** `relinkSeen` in `settle()` after `walkWhileOwed`. It queries the linkers of the old path (or prefix), rewrites only path-form links, calls `oweCascade` for the touched pages, then runs `walkWhileOwed` again.
   - Bare title links stay with `renameCascade`.
   - Outside *page* renames don't cascade bare title links today. The owner's "outside too" ruling suggests the pay step also runs `renameCascade` when the title changed and isn't held outside; that's a scope call for the planner.
5. **Collision re-spell is a separate trigger:** inside the create, rename and restore ops, reusing `titleHeldOutside`/`pageIndexOf().holders` (`Core/Nexus/heldPages.ts:38-44`) and `frozenWorld`. Moves never change titles.

**Alternatives weighed:**
- *Deriving moves in the settle from `deltaOf(pushed, held)`:* one hook and O(changed), but it still needs cross-settle memory. A `nexus:state` call between a move and its settle resets `pushed` and silently swallows the move.
- *A hook in each op:* misses outside moves and future ops.

**Precondition (another slice):** `relations.target` holds normalized titles today (`indexSeed.ts:49-56`). The relink needs path-form targets indexed by path (ideally prefix-queryable with the `stores.ts:47` range) to stay cheap. It must **not** inherit `renameCascade`'s fallback to a full-corpus scan when `queryMentions` is null (`Core/Nexus/cascade.ts:173`); refuse and warn, or stay owed.

###### Risks (Sequences That Reach a Bad State)

- **Split batch:** unlink in batch 1, add in batch 2. If pairing is per-batch, links break. In the meantime the selected page also blanks between batches (`reconcileWith` → `none`), which already happens today.
- **Path reused before payment:** A renamed X→Y, then B created at X by a concurrent op before the settle. Without the guard, B's links get re-pointed. With it, A's links to X now resolve to B.
- **Linker moved mid-sweep:** the write to the old path fails as not-found, so that file keeps the old link and is counted as skipped.
- **Sync double relink:** `landRename` uses `machine().rename` directly (`Core/Sync/Arrival/land.ts:122-141`), so the receiving device sees an outside move and relinks too. The rewritten linker files travel back as same-bytes conflicts. Idempotent, but noisy.
- **Obsidian rewrites its own links on rename:** both apps rewrite. The same outcome, plus a lost-update window for Obsidian's other edits (the heading cascade has the same precedent).
- **Cold index:** the seed returns `NO_REREAD`, so moves made while closed are missed. Heading renames have the same accepted hole.
- **Pending vanished entries grow** with outside deletes during a session. The occupancy guard prunes them. A same-ID file reappearing elsewhere pairs, which is correct.
- **`excluded_folders` goes stale** after an outside folder rename. This is an existing, adjacent gap.

###### What This Would Make False

- **`.claude/Features/ConnectionsPM.md`:**
  - `:19`: Ambiguous links are "inert until one side is renamed."
  - `:26`: "A connection resolves by title."
  - `:30`: Renaming or deleting one of two same-titled pages "rewrites and strips nothing."
  - `:77`: the prospect for disambiguating duplicates by ID scope, superseded by path links.
- **`.claude/Features/DesktopPM.md:22`:** the watcher paragraph needs the move relink and catch-up pairing.
- **`.claude/Features/CorePM.md:96`:** "one rewriter applies a rename."
- **Code comments:** the header comments at `settle.ts:1` and `fileEvents.ts:1`, the `cascadeSeen` comment at `fileEvents.ts:296`, and the `missedEvents` comment at `settle.ts:172`.
- **Tests:**
  - `Core/Nexus/mutate.test.ts:383` (the rename-shared-title test) holds for bare links only.
  - `fileEvents.test.ts:417-433` asserts no walk, and the relink must keep that true.
  - `Core/Session/store.test.tsx:1218` changes only if `movedHeadings` gets hoisted.

###### Line Count

Rough estimate: about 40–60 lines of trigger and pairing code (the seed's `moves`, the `vanished` map, the arrival check, the `applyMove` owe, `relinkSeen`). That excludes the rewrite primitive and the path-target indexing, which belong to other slices.

---

### Round 2 — Cascade and Rewrite Reuse

**MODEL:** `opus-high`
**SUPERSEDED:** Briefed before partial paths were ruled in: its rule that a path link only re-spells to the full new path is superseded by E-2 (a link keeps the depth it was written at), and its prefix-range query alone misses partial-path links (Mechanism Fork 3). Its Trash options are settled by F-3, F-4, and F-6.

#### Brief

You are a read-only scout in Pommora (repo root `~/The Studio/Projects/Project Pommora`). Edit nothing. This is the second scouting round of a planning session; the owner asked for it explicitly: "name everything you think you need to add or include and look for what already exists first." Your job is to find what already exists for each proposed addition below, so the plan reuses it instead of building beside it, and to find what the change lets the codebase remove.

##### The Feature

Pages are Markdown files in Collections (folders) and Sets (subfolders); a page's title is its file basename, and two pages in different folders can share one. Links today resolve by title only (`Core/Connections/pageIndex.ts`), and a shared title reads Ambiguous. The plan adds Obsidian-style **path links**: a link to a page whose title another page shares is written `[[Folder/Sub/Title]]` / `[Label](Folder/Sub/Title)` (the full path from the Nexus root, no `.md`), resolving by exact Nexus-relative path. Every link that pointed at a page must keep pointing at it when the page, or any folder above it, is renamed or moved, in-app or externally. The owner's rulings: a link keeps its written form and is re-spelled only where it would otherwise break (`[[A/Notes]]` renamed reads `[[A/Plan]]`; a bare link gains a path only where its new name would be shared; nothing ever shortens back); a collision made in-app (a create, rename, or restore giving a title a second holder) re-spells existing bare links to the original page into its path; Ambiguous stays its own state; the design must be cheap, since path links are rare, and should end net-negative overall. Read `.claude/Features/ConnectionsPM.md` §The Rename Cascade for today's behavior.

##### What Round One Found (Don't Redo; Verify Where You Rely On It)

- Every cascade decides "this link names the page" by normalized **title key** equality, never by resolving: `rewriteConnections` (`Core/Connections/rewrite.ts:26`), `rewriteHeadingConnections` (`:92`, with no twin guard, so a heading rename on one of two same-titled pages rewrites links aimed at the other), `deleteCascade`'s `gone` titles via `titleHeldOutside` (`Core/Nexus/cascade.ts:89-91`, `heldPages.ts:38`), `gonePageEntry` (`Core/Properties/propertyValue.ts:141`), `frozenWorld.holds` (`heldPages.ts:47`), `parkLinks` (`Core/Trash/holdings.ts:69-94`, by title), the restore refill `rewriteConnections(value, was, landed)` (`Core/Trash/spend.ts:265`), `spacesLinkHeading` (`cascade.ts:61`), `tilesLinkHeading`/`readTileHeadingLinks` (`Core/Tiles/tilesFile.ts:267-289`).
- The index stores `relations.target` = `LinkHit.target`, a normalized title key (`Core/Index/indexSeed.ts:49-58`, `Core/Connections/scan.ts`); queried `target = ?` (`Desktop/Store/stores.ts:100-113`) through `queryMentions`/`queryHeadingMentions`. A bare self-link (`[[#H]]`) is keyed by the own page's title.
- `renameCascade` sweeps index-named files through `sweepGovernedRoots`, patches frontmatter values under `linkKeysOf`, rewrites tiles, edits property caches (`editCaches`), and runs a Space sidecar arm.

##### Proposed Additions — Find What Exists for Each

1. **One relink decision.** A pure function: given the tree's page index before and after an event and the set of affected page IDs, each link hit that resolved (before) to an affected page is re-spelled in place (the changed folder or title edited, the written form kept); if that in-place spelling no longer resolves to the same page after, the page's path form is written instead. Proposed to replace the title arm of `renameCascade`, the delete strip's `gone` titles, `frozenWorld.holds`, `titleHeldOutside`, the restore refill, and `parkLinks`' title keying. Which of these can collapse onto it, and what does each need that the others don't?
2. **`follower` taking a whole new name.** `follower(body)(hit, part, value)` (`rewrite.ts:45-75`) edits one part; proposed: `(hit, to: { folder?, title, heading? })`, so the page relink and the heading rename share one rewrite. What else calls it, and does `carry`/`namesTarget` stay correct?
3. **Which keys name a page.** Proposed: a page is named by its path key always and by its title key only while it's the sole holder; a "files linking this page" query asks both. Does anything already compose such a pair? Should a bare self-link be keyed by the own page's path instead of its title (fixing the heading-rename twin bug at the index)?
4. **Finding candidate files for a folder rename or move.** Proposed: exact-key queries per moved page's path key, or one prefix-range query over `relations.target` (the `removePathPrefixIndex` idiom in `stores.ts`). What exists, what's cheaper, and is either needed if path keys are stored in a way an existing path-prefix move (`moveIndexPaths`) already rewrites?
5. **The tiles and Spaces gates.** Proposed: key `tilesLinkHeading`'s cache and `spacesLinkHeading` by link key instead of title. Do they generalize, or can they go?
6. **Trash.** Proposed: `StrippedLink` records the stripped page's ID so restore and parking go by ID (`trashedHolders`, `holdings.ts:97-125`, is already ID-based). What exists, and what's the smallest change that keeps a path link's strip and refill correct when a page restores to a different path (`freeName`)?
7. **Removals.** Inventory everything this design would make dead: helpers, parameters, title-keyed paths, comments.

##### How to Assess

- **Simplest thing that works wins**; **reuse before invention** — hand-rolled parallels to existing mechanisms are this codebase's most common avoidable defect; **YAGNI**.
- The codebase must end with fewer ways of doing each thing, one owner per responsibility, nothing stated twice; never a full-Nexus rebuild or re-walk when an incremental update works.
- Review what's there rather than confirming the framing; if a claim above is wrong, say so with evidence.

##### Report

Concisely, with citations: for each of the seven items, **what exists**, **what reuse looks like**, and **what genuinely must be added** (its smallest form, with a signature); a **removal inventory**; your **proposed cascade shape** end to end with alternatives weighed; **risks** as named sequences reaching a bad state; and what this makes false in `.claude/Features/*.md`, comments, or tests.

#### Report

##### Path Links Scout, Round Two: What Already Exists for Each Addition

I edited nothing. Paths are relative to the repo root.

###### One Correction to Make First (Blocking for Decision 13)

**Today, nothing in the app pairs an external rename or move.**
- The watcher emits only `add` / `change` / `unlink` / `addDir` / `unlinkDir` (`Desktop/FileWatch/watcher.ts:127-131`, `ChangeEvent` in `Core/Files/writeEcho.ts:37`).
- A `Moved` event comes only from `relocate` → `noteOwn` (`Core/Files/atomicWrite.ts:64-74`). That makes `applyMove` (`Core/Nexus/fileEvents.ts:572`) and `moveIndexPaths` in-app seams only.
- An outside rename reaches the tree as remove + place, and the index as `deindexPath` + `indexWrittenPage`.

So "the simplest mechanism the established design offers" doesn't exist yet. Pairing external renames by ID has to be added:
- **Same batch, add before unlink:** `applyPage` can see the ID still held at another path through `pagesByIdOf` (`Core/Nexus/record.ts:65`).
- **Same batch, unlink first:** the gone ID has to wait on `owed` until the settle.
- **Precedent:** it would follow the `HeadingRenameSeen` → `owed.renames` → `cascadeSeen` pattern (`fileEvents.ts:292-309`, `settle.ts` settle loop).
- **App closed:** the seed could pair a vanished path with a reappearing `ID` through the `page_values` rows, the way `reindex` pairs headings (`Core/Index/indexSeed.ts:124-142`). This is optional.
- **Two batches:** a rename split across two batches falls back to delete + create, and its path links go phantom.

The owner needs to re-rule or scope decision 13 with this cost in view. It shouldn't sit in the risks list.

###### 1. One Relink Decision

**What Exists**
- `pageIndexOf(tree)` and `pagesByIdOf(tree)` are memoized per tree (`record.ts:65,85`).
- Getting before and after trees costs nothing in-app. Every page and folder rename, move, restore and delete goes through `relocate`, which awaits `noteOwn` → `applyOwn` → `applyEvents`. So `heldTreeOf(root)` read before the op is the before-tree, and read after it is the after-tree.
- `renameOp` already has this shape: it calls `titleHeldOutside` before the rename and the cascade after (`Core/Nexus/rename.ts:37-42`).
- `renameCascade` (`Core/Nexus/cascade.ts:162-255`) already owns every arm the relink needs:
  - the index query with corpus fallback
  - `sweepGovernedRoots` with `text` and `patchOf` under `linkKeysOf`
  - `spaceArm`
  - `rewriteTileConnections`
  - `editCaches`
  - `skipRel`
  - warnings

**What Reuse Looks Like:** the relink becomes `renameCascade`'s title arm. It's a new `change` variant, not a new cascade function. `RenameChange`'s `{ title }` arm becomes `{ before, after, affected }`, and the heading arm stays.

**What Must Be Added:** one pure rule (about 15 lines in `Core/Connections/rewrite.ts`), replacing `rewriteConnections`' title-equality loop:

```ts
// null = leave the hit alone
relinkName(written: string, before: PageIndex, after: ReadonlyMap<string, ConnPage>, affected: ReadonlySet<string>, afterIndex: PageIndex): string | null
// p = before.resolve(written).page; skip unless p && affected.has(p.id)
// q = after.get(p.id); next = (isPath(written) || afterIndex.holders(q.title).length > 1) ? stripMarkdownExt(q.path) : q.title
// return next === written ? null : next
relinkConnections(body, decide: (written) => string | null): string   // follower(body)(hit, 'title', next)
```

- No "resolve the in-place spelling after" step is needed. A path link only ever re-spells to the full new path (exact paths only, decision 11). A bare link gains a path only when its new title is shared.
- The rule honors decision 14's never-shorten.
- This one rule is also the restore refill (see §6).

**Who Collapses Onto It**

| Site | Collapses? | What It Needs That Others Don't |
| --- | --- | --- |
| `renameCascade` title arm and `rename.ts:38-41` (`heldOutside` skip) | Yes, fully. A bare link to a shared title resolves to nobody before, so the rule skips it. That keeps `mutate.test.ts:383` true. | `affected` = {P} ∪ the prior sole holder of the new title (the collision). |
| Collision sites. `createPageOp`, the `fromCreate` arm of `renameOp` (`rename.ts:29-36`, which skips any cascade today) and a restore landing are missing from your list; decision 4 implies them. | Yes | `affected` = the prior sole holder; candidates = `queryMentions(titleKey)` |
| `movePageOp`, `moveSetOp`, `renameFolderEntity` (no cascade today) | Yes | Passing every page under the folder as `affected` is safe: titles don't change, so bare hits come back `null`. Candidates are path keys only (§4). |
| Restore refill `rewriteConnections(l.value, was, landed)` (`spend.ts:265`) | Yes, if each strip records its target page ID (§6) | `before` = "the recorded value named page `to`" |
| `deleteCascade`'s `gone` / `titleHeldOutside` (`cascade.ts:89-91`) | Partly | A delete strips, it doesn't re-spell. It shares the key derivation (§3), not the rule. |
| `frozenWorld.holds` (`heldPages.ts:47-53`) | No, it's a different question ("does anything answer this name?") | Once `holders` reads path keys it works unchanged. `arriving` needs path keys: build `buildPageIndex([...pagesOf(tree), ...arriving])`, where `arriving` is a list of `ConnPage`, instead of the hand-rolled set. `landing` can't be removed: `scrubReturning` runs before `relocate` (`spend.ts:185` vs `:205`), so no after-tree exists yet. |
| `parkLinks` title keying | No, by ID or by name (§6) | |

###### 2. `follower` Taking a Whole New Name

**What Exists:** `follower` is module-private. Its only callers are `rewriteConnections` (`rewrite.ts:26`) and `rewriteHeadingConnections` (`:93`).
- `(hit, 'title', value)` already replaces the whole title span. A path link's folder lives inside that span.
- `encodeLinkTarget` uses `encodeURI`, which leaves `/` alone (`links.ts:43-52`).
- No event changes a title and a heading at once.

**Verdict:** the signature change is invention (YAGNI). Every relink case (bare→title, bare→path, path→path, folder) is `rewrite(hit, 'title', next)`.

**What Genuinely Changes Is Carry and Drop, Not the Editor:** `carry`/`namesTarget`/`repeatsTarget` (`connections.ts:145-158`) compare shown text against the whole slot. Two examples:
- `[[A/Notes|Notes]]` renamed to Plan keeps "Notes", because "Notes" ≠ "A/Notes". That's wrong.
- `[[A/Plan|Plan]]` keeps a redundant alias, against decision 5 (a path link draws its title only).

The fix is one helper, `shownTitle(name) = last segment`, used by `repeatsTarget`, `defaultLabel` (`links.ts:33`) and `carry`'s `'title'` / `'both'` writes. It's about 3-5 lines, shared with the draw and writer work.

###### 3. Which Keys Name a Page

**What Exists:** the index already stores path-shaped keys for wikilinks.
- `linksIn` keys `[[A/Notes]]` as `normalizeTitle('A/Notes')` = `a/notes` (`scan.ts:24,85`), and `relations.target` stores it as is (`indexSeed.ts:52-58`).
- A title is a basename and can't contain `/`, so any key containing `/` is a path. No discriminator is needed.

Nothing composes a title-key/path-key pair today. The only path formatter is Copy Path (`Core/Paths/pathFormat.ts:16`).

**Smallest Addition**
- **`buildPageIndex`:** also files each page under `normalizeTitle(stripMarkdownExt(p.path))` in the same `byTitle` map (`pageIndex.ts:36-42`). `holders` and `resolve` then work unchanged for both forms. Matrix (`matrixInput.ts:74`), `resolveLink` and `frozenWorld` get path links for free.
- **Key helper (about 3 lines):** `linkKeys(p: ConnPage, index: PageIndex): string[]` = `[pathKey, ...(index.holders(p.title).length === 1 ? [titleKey] : [])]`. Callers union `queryMentions` over it.
- **Markdown links:** `namesPage`'s `/` refusal (`links.ts:36-39`) has to go for the markdown side to index at all. It's shared by `markdownSpans` (`connections.ts:93`) and `targetTitle`.

**Bare self-link:** yes, key it by the own page's path. `linksIn`'s `ownTitle` becomes an own key; `extractPageIndex` (`indexSeed.ts:42`) and `renameCascade.text` (`cascade.ts:217`) already hold the path. Then `queryHeadingMentions(pathKey, h)` finds self-links too.
- This needs an `INDEX_GENERATION` bump (`Desktop/Store/ddl.ts:3`).
- The editor's own pass, `headingRenameSettle.ts:57`, only has `host.pageTitle()` and still rewrites by title. It needs the renderer's index or the own page's path to stop the twin rewrite in the editor's own doc.

###### 4. Finding Candidate Files for a Folder Rename or Move

**What Exists**
- `relations_by_target (target, qualifier, kind)` index (`ddl.ts:26`).
- The range idiom `>= dir||'/' AND < dir||'0'` (`Desktop/Store/stores.ts:49,88`).
- `queryMentions` exact match (`stores.ts:100-106`).

**The framing's premise is false.** `moveIndexPaths` / `renamePathPrefixIndex` (`stores.ts:81-97`) rewrite the `path` column (where the linking file lives), never `target`. Nothing should rewrite `target` in SQL: it must mirror the file's bytes, or a failed sweep leaves rows claiming links that the files don't hold. The sweep rewrites the files and `indexWrittenPage` re-keys them.

**Options Weighed**

| Option | Cost | Contract Surface |
| --- | --- | --- |
| Per moved page `queryMentions(pathKey)` | N queries for N pages (5k for a big collection) | None |
| One prefix query (recommended) | One indexed range scan. A folder rename changes no title, so only path links need finding. | One method in four places: `Core/Platform/stores.ts:60`, `Desktop/Store/stores.ts`, `Core/Testing/memoryStores.ts`, `Core/Testing/storesContract.ts`, plus a `contentIndex.ts` wrapper |

One way to avoid adding a method is to make `queryMentions(key)` match "exact OR under `key/`". A title key could then over-match path links into a top-level collection with the same name; the rule filters those out, at the cost of extra file reads. The signature stays `queryMentionsUnder(normalizedKey: string): string[]` either way.

**Gap:** after an external folder rename, `unlinkDir` prefix-deindexes the folder's pages. A page inside the folder that path-links a sibling is invisible to the query until its own `add` is re-indexed. Add `folderCorpus(movedFolder)` to the candidate set, or relink only after the batch has re-indexed.

###### 5. The Tiles and Spaces Gates

**Tiles:** `readTileHeadingLinks` keys `${hit.target}\0${hit.qualifier}` (`tilesFile.ts:273-289`); `target` is already the written key. Tiles aren't indexed, which is why the gate exists, so it stays.
- Generalize it to cache every tile link key (target, and target + qualifier): `tilesLink(root, keys: readonly string[], heading?: string)`.
- Today a title rename reads every tile unconditionally (`cascade.ts:233-236`), and so would each relink. With the generalized gate, a relink reads tiles only when one links an affected key. A folder prefix is a scan over the small cached set.

**Spaces:** `spacesLinkHeading` (`cascade.ts:61-73`) only serves `cascadeSeen`'s early exit; the sweep's own gate is `spaceArm`'s in-memory `rewrite(s.values) !== null`. Change it to take a key set. Neither gate goes away.

**`cascadeSeen` / `HeadingRenameSeen`** (`indexSeed.ts:94-98,140`) carry `titleFromPath(path)`; they must carry the path.

###### 6. Trash

**What Exists**
- `StrippedLink.page` is the holder's ID, not the target's (`cascade.ts:43-47`, `record.ts:24-28`).
- `trashedHolders` maps ID → file (`holdings.ts:97-125`).
- `parkLinks` keys bundles by the target's basename title through `trashedTitles` (`holdings.ts:69-94`). A path value `[[A/Notes]]` never matches, so it's silently not parked.
- `deleteCascade` runs after `relocate` (`delete.ts:94-97`), so it sees the after-tree. Target identity has to be captured in `delete.ts`, which already has `pageIds`.

**Named failure today:** a page restores through `freeName` as `Notes 2` while another page now sits at `A/Notes`. Its recorded `[[A/Notes]]` value isn't touched by `rewriteConnections(was, landed)` (title equality), so it refills pointing at the other page. That's a silent misdirection. The same happens for a Set or Collection restored under a new name or destination (`landed === was` for folders, `spend.ts:172`), and when a parent is renamed while the page sits in the Trash.

**Smallest Change**
- **`deleteCascade`:** takes `pages: ConnPage[]` instead of `titles: string[]` (both callers have them, `delete.ts:97` and `spend.ts:84`). It derives the gone keys (each path key, plus each title key with no holder left) and maps each gone key to a page ID.
- **`StrippedLink`:** gains `to?: string`, the target page's ID (+3 lines including the zod schema).
- **Restore refill:** maps each value by `to` to its landed page and spells it through §1's rule. That replaces `spend.ts:265`.
- **Parking:** drops from `scrubReturning`, `restoreProperty` and `assignment.ts:91-101` name pages absent from the world, so they have no ID. Two choices:
  - (a) Keep name-keyed parking and build the Trash's lookup with `buildPageIndex` over trashed pages at their delete-time paths. That needs a `path` on the content record, since the record has only `parent` (`record.ts:30-40`).
  - (b) Accept dropping path-link values there.
- **`emptyBundle` re-park** (`spend.ts:82-89`) is deliberately by title ("unless another bundle holds that title"). Moving it to ID changes that behavior, so the owner should rule on it.

###### 7. Removal Inventory

**Code**
- `titleHeldOutside` (`heldPages.ts:37-44`), its import and `heldOutside` early return (`rename.ts:12,38,41`), and its use at `cascade.ts:33,90`.
- `rewriteConnections`' title-equality body (`rewrite.ts:21-28`), replaced by `relinkConnections`, and its call at `spend.ts:23,265`.
- `RenameChange`'s `{ title }` arm (`rewrite.ts:18`).
- The `arriving` set in `frozenWorld` (`heldPages.ts:49-51`), replaced by the one index.
- `trashedTitles` (`holdings.ts:69-81`), if parking goes by ID.
- `namesPage`'s `/` clause (`links.ts:36-39`).
- The ownTitle-keyed self-link in `scan.ts:24,79`.
- `normalizeTitle(own) === titleKey` (`cascade.ts:187`), which becomes a key check.

**Comments and Docs That Become False**
- `heldPages.ts:1` ("titles answer from the one index")
- `holdings.ts:1,69,83`
- `record.ts:37`
- `cascade.ts:81` docstring
- `Frozen.holds?(title)` doc (`propertyValue.ts:137-139`)
- `ConnectionsPM.md` §Resolution (lines 14-22): "looked up … the title", "exactly one Page holds the title", and the whole "Main holds the title index … held outside a delete, a rename, or a restore" paragraph.
- `ConnectionsPM.md` §The Rename Cascade: "A connection resolves by title", and the closing "renaming or deleting one of two same-titled pages rewrites and strips nothing" (true for bare links, false for path links).

**Tests**
- `heldPages.test.ts:83` (`titleHeldOutside`) goes.
- `heldPages.test.ts:90` changes shape.
- `mutate.test.ts:398`, "container rename renames the folder (no cascade)", becomes false.
- `mutate.test.ts:383` and `cascade.test.ts:568/578` stay true.

###### Proposed Cascade Shape, End to End

1. **The op captures before:** `before = heldTreeOf(root)`. Then it runs the op (`relocate`). Then `after = heldTreeOf(root)`.
2. **It computes affected:**
   - moved or renamed page IDs
   - prior sole holders of any title that gained a holder (rename, create, `fromCreate`, restore)
   - for folders, the pages under the folder
3. **It finds candidates:**
   - per affected page: `queryMentions(pathKey)`, plus `queryMentions(titleKey)` when the page was the sole holder before
   - for folders: one prefix query, plus `folderCorpus` for external moves
   - `nexusCorpus` when there's no index
4. **It runs `renameCascade`'s existing sweep** with the relink `rewrite`: bodies, `linkKeysOf` frontmatter, `spaceArm`, gated tiles and `editCaches`, reporting a `CascadeReport`.
5. **Delete** stays `deleteCascade` with the same key derivation. **Restore** refills by `to`.
6. **External moves** pair by ID and call the same cascade at settle, mirroring `cascadeSeen`.

**Alternative weighed:** relink only at the settle, diffing the `pushed` baseline against the current tree. That would be one site for in-app and external moves and naturally handles batches (a rename and its undo cancel out). Its costs:
- It loses the synchronous `cascade` reply that notices and Try Again use.
- It loses `skipRel`.
- An all-pages ID diff on every settle breaks the no-O(N)-per-event rule.

Mirroring the heading precedent (op-level call, plus settle for outside events, one function) is the established shape.

**Line Count:** on the cascade side alone this doesn't look net-negative, roughly +40 to +80.
- **Adds:** rule plus wrapper (about 20), call sites in move, folder rename, create and restore (about 25), prefix query (about 12), ID pairing (about 25-40).
- **Removes:** about 35-45 lines.

Net-negative overall depends on the resolver and writer side folding things away. That needs checking, not assuming.

###### Risks

1. **External rename across two watcher batches:** no pairing happens, path links go phantom, and since an external unlink runs no `deleteCascade`, nothing is recorded to recover them.
2. **External folder rename:** a page inside the folder that path-links a sibling is deindexed when the folder is removed, so the prefix query misses it (§4).
3. **Twin in the editor's own doc:** a heading rename on one of two same-titled pages still rewrites the editor's own bare `[[Twin#H]]` at `headingRenameSettle.ts:57` unless that pass resolves.
4. **Path value restored under a new name:** a page restores via `freeName` into a world where the old path is now held. A title-keyed refill points the value at the new holder (§6). Recording `to` closes this.
5. **Relative markdown links:** dropping `namesPage`'s `/` clause turns `[img](assets/x.png)` and `[d](../x.md)` into page names. They'd index and draw as phantoms instead of addresses.
6. **Same-name files differing only in case** (decision 7, e.g. `Notes.md` / `notes.md`): the rule writes a path key with two holders, and without an after-check the link reads Ambiguous. Rare enough to accept and document.
7. **Sync pull of a remote rename:** the local relink can rewrite files the remote already rewrote. Both produce the same text, so recency-first resolution is harmless, but it costs extra writes.
8. **Self-link key change without a reseed:** stale rows keyed by title make `queryHeadingMentions` miss self-links until reseeded, so the `INDEX_GENERATION` bump is required.

---

### Round 2 — Read, Draw, and Pick Reuse

**MODEL:** `opus-high`
**SUPERSEDED:** Briefed before partial paths were ruled in: its separate path map is superseded by A-4 (a title's holders filtered by path). Its finding that only the Trash search matches location stands and widened D-1.

#### Brief

You are a read-only scout in Pommora (repo root `~/The Studio/Projects/Project Pommora`). Edit nothing. This is the second scouting round of a planning session; the owner asked for it explicitly: "name everything you think you need to add or include and look for what already exists first." Your job is to find what already exists for each proposed addition below, so the plan reuses it instead of building beside it.

##### The Feature

Pages are Markdown files in Collections (folders) and Sets (subfolders); a page's title is its file basename (`titleFromPath`), names refuse `/` (`Core/Paths/names.ts`), and two pages in different folders can share a title. Links today resolve by title only (`Core/Connections/pageIndex.ts`); a shared title reads Ambiguous. The plan adds Obsidian-style **path links**: a link to a page whose title another page shares is written `[[Folder/Sub/Title]]` / `[Label](Folder/Sub/Title)` (the full path from the Nexus root, no `.md`), resolving by exact Nexus-relative path. The owner's rulings: a path link draws its **title only**, the folder path hiding with the brackets and revealing with the caret; a written link keeps its form wherever it resolves (no canonical shortening on paste or the Link field); picking a shared title in the picker writes the path form; **an ambiguous link's resolution is the picker** — "Ambiguous should just pop up the picker; since the options would show up there and a selection would pick with the resolving path format. There's no 'Machinery' around that"; and typing a folder narrows the picker by location — "I'm pretty sure search already does this, so it would be a fold, not a fix. This should unify behavior and be net-negative behavior overall." Read `.claude/Features/ConnectionsPM.md` first.

##### What Round One Found (Don't Redo; Verify Where You Rely On It)

- Grammar: `LinkOccurrence { syntax, full, title, heading, shown }` (`Core/Connections/connections.ts`); a wikilink's page half already admits `/`; `namesPage` (`links.ts:38`) refuses `/` in a markdown destination.
- Proposed reader shape: `PageName = { folder?, title, heading? }` with `title` the basename, so `repeatsTarget`, `namesTarget`, `keepsAlias`, `defaultLabel`, `pageLabel`, `linkDisplayText`, `carry` stay untouched; the occurrence gains a `folder: Span | null` split at the page half's last `/`; a key function composes `folder/title` for lookup.
- Proposed index: `buildPageIndex` gains a path map (`normalizeTitle(stripMarkdownExt(path))`); `holders`/`resolve` take a key and use the path map when it holds `/`; a `nameOf(page)` writes the path form only when the title has another holder.
- Writers that collapse a held `ConnPage` to `.title`: picker rows (`autocomplete.ts:104-109`, `pageRow`), the shown-text check (`useConnectionAutocomplete.ts:134-149`), `resolvedTarget` (`linkValue.ts:170`), Copy Link (`pageMenuActions.ts:54`), the heading grip's Copy Link (`gripMenu.ts:78,93`, via `EditorHost.pageTitle()`), the embed source pick tree (`editorHost.tsx:136-139`, `gripMenu.ts:140-146`), embed exclusions keyed by title (`embedWidget.tsx:645-652`, `gripMenu.ts:23-30`), `LinkCell` Show Full Link (`LinkCell.tsx:46`).
- Rendering: `linkToken` (`Core/MarkdownPM/Engine/tokens.ts:245-252`) folds text before the content start into the hidden leading marker; the `Page § Heading` join slices `tk.link.title` (`decorations.ts:594`, `cellStatic.tsx:178`); `targetSpan` drives the aliased reveal (`decorations.ts:605`).

##### Proposed Additions — Find What Exists for Each

1. **The folder split.** Before adding a `folder` span to the occurrence and a key function, check `Core/Paths/` (`posix.ts` `dirname`/`basename`/`isAtOrUnder`/`stripMarkdownExt`/`relative`, `caseFold.ts`, `nexusPaths.ts`, `names.ts`) and any existing "path key" normalization. Is there already a normalized path-key function or map (e.g. `pagesByPathOf` in `Core/Nexus/record.ts`, the content index's path keys, `foldKey`)? Weigh the `folder` span against keeping `title` as the whole page half and splitting where it's read, by counting the consumers each would touch (every reader of an occurrence's `title` span: `tokens.ts`, `decorations.ts`, `cellStatic.tsx`, `edits.ts` `partOf`/`slotAt`/`openLinkAt`/`headingHash`, `linkEdit.ts`, `linkSettle.ts`, the autocomplete query, `rewrite.ts`).
2. **The path map in the title index.** Is a second map needed, or can `resolve` use an existing path map (`pagesByPathOf`, `pagesByIdOf`)? What does each process already hold?
3. **The picker's location matching — the owner's "fold."** Find the app's search and how it matches location: `searchEntriesOf` (`Core/Nexus/treeIndex.ts`), `matchScore`/`foldKey` (`Core/Paths/caseFold.ts`), the nav search, the command palette, `TrashFrame.tsx:56`'s crumb matching, the destination tree's filtering, and anything else matching a page by title plus its containers. Compare with `PageIndex.candidates` (`pageIndex.ts:54-67`, title-prefix only, run per keystroke) and the picker's trail (`EditorHost.location`). Propose how `candidates` folds onto the existing search matching so the picker matches as search does (title and location), what's removed, the cost per keystroke, and what changes for the user (ranking, highlighting in `AutocompletePane.tsx:126`).
4. **"Ambiguous pops up the picker."** Verify, by reading the picker's open triggers (`useConnectionAutocomplete.ts`, `autocomplete.ts`, `acQuery.ts`, the exact-match close at `useConnectionAutocomplete.ts:118`), what happens today when the caret enters, or a click lands in, an ambiguous `[[Notes]]` in a page body, a table cell (live and resting, `cellStatic.tsx`), a Text value's pane, and a Link property value (`LinkCell.tsx`, the one-line field `ValueEditor`). Does the picker open with both holders listed and their trails? What would make it do so everywhere with no machinery of its own, and does a pick there write in place through the existing commit?
5. **Rendering the title only.** Verify whether hiding the folder prefix falls out of `linkToken`'s content start once `title` is the basename, in the editor and the resting cell, revealed and at rest, aliased and not, in both syntaxes; and what `Display Unresolved Links As Plain Syntax` does with a phantom path link.
6. **Writers keeping form.** For each writer above, the smallest change: which hold a page and need a name for it (picker, Copy Link, grip, embed pick tree), which re-spell a written link and should now keep its written folder (`resolvedTarget`, `LinkCell`), and whether `EditorHost.pageTitle()` should become the page itself.

##### How to Assess

- **Simplest thing that works wins**; **reuse before invention** — hand-rolled parallels to existing mechanisms are this codebase's most common avoidable defect; **YAGNI**.
- Zero added cost on keystrokes, caret moves, or decoration builds (no O(N) or allocating work on a high-frequency trigger; `candidates` runs per keystroke).
- Review what's there rather than confirming the framing; if a claim above is wrong, say so with evidence.

##### Report

Concisely, with citations: for each of the six items, **what exists**, **what reuse looks like**, and **what genuinely must be added** (its smallest form, with a signature); what the fold **removes**; **risks** as named sequences reaching a bad state; and what this makes false in `.claude/Features/*.md`, comments, or tests.

#### Report

##### Path Links: Round Two Scout Report (Read-Only, No Edits)

Short version: a lot of this is reuse. Three of the brief's assumptions are wrong, though, and the rename/delete cascade has to grow. That growth is the biggest addition nobody has listed yet.

###### Corrections to the Brief

- **"Search already does this" is true only of the Trash.** The main search (`searchEntriesOf`, `Core/Nexus/treeIndex.ts:146-170`) folds `r.title` and nothing else, and `filterNav` (`Core/Navigation/navSearch.ts:12-15`) scores that title. The only thing that matches by location is the Trash's `filterRows` (`Core/Settings/TrashFrame.tsx:51-58`), which scores the title and the crumbs joined with spaces and keeps the higher score. `LocationField.narrowed` and `Views/Pipeline/search.ts` also match titles only. There's no command palette. So item 3 is a fold onto `matchScore` + `rankMatches` (`Core/Paths/caseFold.ts:28-74`) plus the Trash's max rule. The location string has to be created, and item 2's path key can be that string.
- **"Ambiguous pops up the picker" already works in the body and in cells.** The gap is what a pick writes, not the picker (details under item 4).
- **Markdown path links don't read at all today.** `namesPage` refuses `/` (`links.ts:38`), so `targetTitle` is null, and `isValidLink("A/Notes")` is false because the host has no dot (`urlPath.ts:28-39`). `readOccurrence` therefore returns null. Admitting `/` is safe: directory names refuse `.` (`names.ts:29`) and `isValidLink` needs a dotted host, so an app-made folder segment never reads as an address. A Finder-made folder named `example.com` is the only edge.

###### 1. The Folder Split

**What exists:** `posix.ts` already has `relDirname`, `titleFromPath`, `stripMarkdownExt`, `isAtOrUnder` and `basename`. `normalizeTitle`/`foldKey` (`caseFold.ts`) is the one normalization. Nothing composes a folded, extension-free path key; `pagesByPathOf` is exact and case-sensitive (item 2).

**Who reads the occurrence's `title` span:**

| Needs only the basename | Needs the whole page half |
| --- | --- |
| `tokens.ts:245`: where the drawn text starts | Lookup key (`resolveLink`, the `scan.ts` target) |
| `decorations.ts:594`: the `Page § Heading` join | `autocompleteQuery`'s slot and query (`autocomplete.ts:85-90`) |
| `cellStatic.tsx:178`: the same join at rest | `partOf`, `slotAt`, `openLinkAt`'s slot finder (`edits.ts:386,398-404`) |
| `rewrite.ts:59`: the span a rename rewrites | `headingHash` bounds (`edits.ts:469-470`) |
| `defaultLabel`, `linkDisplayText`, `pageLabel` (through `PageName.title`) | `linkEdit.ts:40`: what Edit Title selects |
| | `targetSpan`, which feeds the aliased reveal (`decorations.ts:605`), `readOccurrence`'s url and `detect.ts:421,426,436` |

**Recommendation: keep `title` as the whole page half and add no new span.** Split at the last `/` only where the basename is read.
- **Whole-half span:** touches 6 sites: `linkToken` (gets `text`), `decorations.ts:594`, `cellStatic.tsx:178`, `readOccurrence`, the `rewrite.ts` follower, and `namesPage`.
- **A `folder` span:** touches about 11: `LinkOccurrence`, `wikiSpans`, `markdownSpans`, `mapSpans`, `targetSpan`, `readOccurrence`, `partOf`, `openLinkAt`, `headingHash`, `linkEdit`, `autocompleteQuery`, and probably `detect.ts`.
- **What settles it:** the picker query is `line.slice(o[part])`. With a basename `title`, a caret in `[[Folder/` sits in an empty slot and the picker browses everything, which kills the "typing a folder narrows" ruling. The slot has to be the whole half either way.
- **The one visible difference:** with the whole half, `targetSpan` covers the folder, so an aliased link revealed by the caret styles `Folder/Title` as the target. Without an alias, the folder sits in the leading marker in both shapes and shows in bracket styling when revealed. Worth a ruling from the owner.

**Must add (smallest form):**
- `PageName = { folder?: string; title: string; heading?: string }`. `readOccurrence` splits there, and `title` stays the basename, so `repeatsTarget`, `namesTarget`, `keepsAlias`, `defaultLabel`, `carry` and `linkDisplayText` don't change.
- `pageKey(n: PageName): string`, which returns `folder/title` or `title`. `pageLinkText` writes it, and `spellsAsWiki` checks the key.
- `titleName(text: string, title: Span): Span`, which finds the last `/` inside the span with `lastIndexOf` and allocates nothing. Used by the three draw sites and the rewrite follower.

###### 2. The Path Map

**What exists:**
- `pagesByPathOf` (`record.ts:75-78`) maps exact paths, case-sensitive with `.md`, to ids. The host's `liveIdIndex` and the renderer's `reconcileIndexOf` both hold it. It can't serve `resolve`: wrong fold, it returns ids rather than `ConnPage`s, and `buildPageIndex` only receives `ConnPage[]`, which the tests build from arrays.
- Both processes build the same `PageIndex` from `pageIndexOf(tree)`: the renderer through `pageConnections.ts:30`, the host through `heldPages.ts:41,48`.

**Reuse:** `buildPageIndex`'s `entries` already fold once per page. Add `place = normalizeTitle(stripMarkdownExt(p.path))` there. That one string is both the path-map key and item 3's search text.

**Must add:**
- `byPlace: Map<string, ConnPage[]>`, holding arrays so that case-variant files read as Ambiguous.
- `holders(key)` and `resolve(key)` keep their signatures and look in `byPlace` when the key holds `/`.
- `nameOf(page: ConnPage): string`, which returns `stripMarkdownExt(page.path)` when `byTitle` has more than one holder, else `page.title`.
- Embeds then resolve with no change: `embedWidget.tsx:397` already passes the raw bracket text to `resolve`.

**The unlisted part (rows, cascade, Matrix):**
- `LinkHit.target` should be `normalizeTitle(pageKey(named))`, the full key. For wiki links that's the same value as today, because the page half already admits `/`, so existing index rows don't need regenerating. Markdown path links are new rows.
- With the full key, the Matrix (`matrixInput.ts:64`, `resolve(link.target)`) gets its edges for free. With a basename key it would read them as Ambiguous and drop them.
- The cascade then has to query both keys: `queryMentions(titleKey)` plus `queryMentions(pathKey)` at `cascade.ts:173`, a second equality query with no schema change.
- `rewriteConnections` has to match by key. Round one's "`rewrite.ts` untouched" is wrong; see the cascade risks below.

###### 3. The Picker Fold

**Today:** `candidates` (`pageIndex.ts:54-67`) prefix-filters the folded title over a lazily sorted list, then sorts exact first and shortest next. It runs inside a `useMemo` keyed on the query, so on every keystroke and every time the caret moves into a link (`useConnectionAutocomplete.ts:104-121`).

**Fold:** keep the empty-query alphabetical branch. Otherwise use `rankMatches(entries, e => score, limit)`:
- Score `matchScore(e.place, q)`. Because the title is the path's suffix, any query that matches the title also matches the path, so nothing is lost.
- Prefer `matchScore(e.norm, q)` when it isn't null. That's the Trash's max rule, hoisted into one helper like `placedScore(title, place, q)` that `TrashFrame.filterRows` also uses.
- `Projects/No` narrows by location as a subsequence of `projects/sub/notes`.

**Removed:** the `startsWith` filter and the custom sort chain, plus the Trash's inline max rule. Roughly neutral to slightly fewer lines.

**Cost per keystroke:** still O(N), with up to two `matchScore` calls per entry, over precomputed strings, inserting into a list capped at `AC_MAX` (20). That's the same class as `filterNav` (cap 50). Nothing new runs on caret moves or decoration builds.

**What changes for the user:**
- Matching becomes fuzzy subsequence: `nts` finds "Notes".
- Results are ranked by score; shorter titles still win ties, and exact titles come first.
- The prefix highlight (`AutocompletePane.tsx:126`, `emphasizeMatch(row.value, 0, matchLen)`) would mark the wrong letters. Either drop it, as the nav search has none, or pass `at` as `0` when the folded title starts with the query and `null` otherwise; `emphasizeMatch` already accepts `null`.

**Must change with the fold:** the close on an exact match (`useConnectionAutocomplete.ts:118`) counts rows (`found.length === 1`). Under fuzzy matching, `[[Notes]]` also matches "Footnotes", so the picker would open over every finished link the caret enters. For the title part, ask `index.resolve(query).status === 'resolved'` instead. That's O(1), and an Ambiguous query then stays open by rule rather than by accident. Today a resolved `[[Notes]]` beside a "Notes Archive" already opens the picker; no test pins either behavior.

**Optional:** to really unify, the nav search would need a place string too, from the `nodesOf` parents. That's the owner's call.

###### 4. "Ambiguous Pops Up the Picker"

**Verified by reading, not live-driven.**
- `acQuery` recomputes on any selection change (`acQuery.ts:55-66`). `autocompleteQuery` sees the closed link, part `title`, query "Notes".
- `candidates` returns both holders because both are exact, so `found.length >= 2` and the close at line 118 doesn't fire. The pane opens with both rows, each showing its trail (`pageRow` → `host.location`).
- A click on an Ambiguous link falls through to placing the caret, because `resolveFollow` returns null for unresolved (`linkClicks.ts:110`).
- A resting table cell activates and then dispatches a selection (`CellEditor.tsx:271`), so the query arms there as well.
- A pick writes in place through the existing commit: `commitEdit` `title` → `whole(...)` replaces `ac.start..ac.end`. `keepsShown` keeps the alias, because the baseline was unresolved (`linkValue.ts:261-263`).
- **The only gap is that `pageRow.value = p.title` writes `[[Notes]]` back.** Item 6's `nameOf` fixes it. No picker machinery is needed.

**Where it doesn't hold (no machinery covers these):**
- **Aliased wikilinks and markdown links:** a click on the visible alias or label puts the caret in the `shown` slot. That slot lists aliases for `resolve(title).page`, which is null for an Ambiguous link, so nothing opens.
- **Link field and Text value pane:** they open with the caret at `doc.length` (`ValueEditor.tsx` ~line 150). `linkAt` counts the link's end as inside (`edits.ts:353`), but `partOf` finds no slot past `]]`, so the picker waits until the caret enters the title.

###### 5. Rendering the Title Only

**With a whole-half span** (rendering only, applies to all four surfaces):
- **Wikilinks:** `linkToken` starts `shown` at `titleName(...)[0]`, so the leading marker swallows `[[Folder/Sub/`. The folder hides at rest and reveals with the caret, in the editor and in resting cells.
- **Markdown links:** they always show the label. An empty label draws `look.label` → `pageLabel` → `defaultLabel(named.title)`, which is the basename.
- **Joins:** the two join sites need `titleName`, otherwise `Page § Heading` shows the folder.
- **Aliased reveal:** `targetSpan` covers the whole path, which is correct.
- **Value text:** `linkDisplayText` and `shownProse` give the basename through `PageName`.

**Display Unresolved Links As Plain Syntax:** a phantom keeps its syntax visible. The markers get `md-phantom-syntax`, never hidden (`decorations.ts`, phantom branch; `cellStatic.tsx` phantom branch; `markdown-pm.css:254-263`). So a phantom `[[Folder/Notes]]` shows in full, muted or plain. No change needed.

###### 6. Writers Keeping Form

**Hold a page and need a name, so use `nameOf`:**
- **Picker rows:** add `name` to the `AcRow` page arm and keep `value` as the title, so the drawn label doesn't repeat the trail. `commit` passes `row.name` to `commitEdit` and to the shown-text check (`useConnectionAutocomplete.ts:144`).
- **Picker query (missed by round one):** `AutocompleteQuery.title` (`autocomplete.ts:95`) must become `pageKey(named)`. Otherwise `[[A/Notes#` resolves Ambiguous and the heading list comes up empty (`useConnectionAutocomplete.ts:82`), and `commitEdit`'s `heading` case rewrites the title without its folder.
- **Copy Link** (`Core/Interface/Menus/pageMenuActions.ts:54`): `nameOf` via `pageIndexOf(s.tree)`.
- **Heading grip's Copy Link** (`gripMenu.ts:78,93`): `EditorHost.pageTitle()` should become `page(): ConnPage | null`. Its other consumer, `headingRenameSettle.ts:51`, needs the page anyway (see the risks).
- **Embed source pick tree** (`editorHost.tsx:138`): pick `nameOf(p)`. The exclusions (`embedWidget.tsx:645-652`, `gripMenu.ts:23-30`) are keyed by title, while ancestors arrive as paths. Key them by page path instead (resolve each embed title, use ancestors as they are, resolve each pick). Otherwise a duplicate-titled ancestor written in path form escapes exclusion and the page can embed itself.

**Re-spell a written link, so keep the written folder:**
- `resolvedTarget` (`linkValue.ts:159-174`): add `folder` when the written link had one, taken from `relDirname(target.page.path)` so its case is corrected the way the title's is. Its three callers then keep the form with no change of their own: `linkValueFromEdit` (Link field), `pasteLink.ts:54` and `pasteAsMenu.ts:59`.
- `LinkCell.tsx:46`: build from `resolvedTarget` minus `shown`.
- `pasteAsMenu.ts:100` (missed by round one): `pageEmbedText(target.title)` would drop the folder, so use `pageEmbedText(pageKey(target))`.

###### Risks

1. **Fuzzy fold with a row-count close:** the caret enters a resolved `[[Notes]]`, fuzzy matching returns several rows, the close fails, and the picker opens over a finished link. Fix: close on `resolve`.
2. **Rename one of two same-titled pages:** `rename.ts:38` (`titleHeldOutside`) skips the cascade, so `[[A/Notes]]` goes phantom. The gate has to invert for path links.
3. **Delete one of two:** `cascade.ts:90` filters by `titleHeldOutside`, so Link values in path form that name the deleted page are never stripped or restored.
4. **Rename a now-unique page:** `rewriteConnections` matches `hit.target === titleKey`. A path link's full key `a/notes` doesn't match, so it isn't rewritten and goes phantom. Matching must cover both the title key and the path key. The follower's `next` also drops `folder` on its markdown fallback (`rewrite.ts:56`).
5. **In-page heading rename:** `headingRenameSettle.ts:51` and `rewriteHeadingConnections` match on the own-title key, so a self-link written `[[A/Notes#H]]` doesn't follow. Same for `cascade.ts:69` and `spacesLinkHeading`.
6. **Move a page, or rename a Collection or Set:** every path link under it reads phantom. No cascade exists for moves (`movePage`, `pageMenuActions.ts:42`) or container renames. Out of scope, but this feature creates the bad state.
7. **Case-variant duplicates** (`A/notes.md` and `A/Notes.md` from sync or a case-sensitive disk): the path key collides. `nameOf` writes the path form and it's still Ambiguous, so the picker can't settle it.
8. **Finder-made folders holding `]]` or `|`:** `nameError` only runs at creation. `pageLinkText` must check spelling against the full key and fall back to the markdown form.
9. **Scheme-less addresses:** `[x](example.com/Notes)` now reads as a page named `Notes` in folder `example.com`. It resolves only if such a folder exists (only possible if made outside the app, since the app refuses dotted folder names); otherwise it stays an address, so in practice there's no visible change. `[x](docs/readme)` is phantom both before and after.

###### What This Makes False

**`.claude/Features/ConnectionsPM.md`:**
- *§Syntax + Scope*: "a path separator there addresses something outside the Nexus… a URL can't reach a page by its last segment" (the URL half stays true by exact match).
- *§Resolution*: "Ambiguous… muted and inert until one side is renamed"; resolution "by title"; main's title index being "held outside a delete, a rename, or a restore".
- *§The Rename Cascade*: "A connection resolves by title"; "A title another page still holds is left to that page: renaming or deleting one of two same-titled pages rewrites and strips nothing".
- *§Autocomplete*: "matched by title prefix" and "matched by the target's page half", if the fold lands.
- *§Prospects*: "Duplicate disambiguation — id-scoping", which this feature supersedes.

**Comments:**
- `links.ts:37` (`namesPage`).
- `PageName` "A page named by title" (`connections.ts`).
- `resolvedTarget` and `linkValueFromEdit` "by title" (`linkValue.ts:158,180`).
- `LinkHit.target` (`scan.ts:63`).
- `useConnectionAutocomplete.ts:110` "names its one match exactly".
- `pageIndex.ts:34,39`, if `place` joins the build.

**Tests:**
- `links.test.ts:97`: `targetTitle('example.com/Notes')` stops being null.
- `pageIndex.test.ts:44-60`: the prefix ranking, if the fold lands.
- `linkValue.test.ts:409-433` (`resolvedTarget`) and `:120-128` (Ambiguous `Dup`) gain path cases.
- `rewrite.test.ts`: needs same-title and path cases; `:145-148` (URL last segment) still holds.
- `TrashFrame.test.tsx:43-51`: holds, if the shared helper keeps its semantics.
- `storesContract.ts`: unchanged, since the query keys are the same.

---

### Round 3 — Every Search Matcher

**MODEL:** `opus-high`
**SUPERSEDED:** D-1 keeps the merge to searches that exist, adding no search box; D-3 keeps icon search out; D-6 settles highlighting.

#### Brief

You are a read-only scout in Pommora (repo root `~/The Studio/Projects/Project Pommora`). Edit nothing. Your findings feed a decisions document the owner will hand to a planning session.

##### The Mandate

The owner ruled that every search in the app should match one way, merging pre-existing duplication: "this is pre-existing duplication that should be merged; ensure that other searches get this too, such as any picker fields within filtering cells, view searches, heading searches, etc." The trigger: the connection picker (`PageIndex.candidates`, `Core/Connections/pageIndex.ts:54-67`) matches titles by prefix; the sidebar search (`filterNav`, `Core/Navigation/navSearch.ts`, over `searchEntriesOf`, `Core/Nexus/treeIndex.ts:146-170`) matches titles fuzzily through `matchScore`/`rankMatches` (`Core/Paths/caseFold.ts:28-74`); only the Trash (`filterRows`, `Core/Settings/TrashFrame.tsx:51-58`) also matches an item's location (title score or crumbs score, the higher wins). A coming change adds page paths to links, and the picker must let typing a folder narrow by location; the owner wants that to be one shared behavior every search uses, not a picker-only addition. The work should leave fewer ways of doing the same thing.

##### Your Job

1. **Inventory every text search or filter-as-you-type in `Core/` and `UIX/`**: the sidebar search, the Trash, the connection picker (title rows, the heading list, the alias list), option pickers in filter cells and property cells (Select, Status, Multi-select options), property and column pickers, `LocationField.narrowed`, view search (`Core/Views/Pipeline/search.ts`), the destination/move tree, the embed and tile pick trees, icon pickers, context/space pickers, settings search, menus with type-to-filter, and anything else. For each, with file:line: what it matches against (title, location, aliases, other text), how (prefix, substring, fuzzy subsequence via `matchScore`, something else), how it ranks, how it highlights, its cap, and when it runs (per keystroke, per caret move).
2. **Separate the two concepts if they're genuinely two**: ranking candidates against a query (a picker) versus filtering rows by whether they contain a query (a view's search over cell contents). Say whether the owner's "one way" honestly covers both, or whether they're different jobs that only look alike, with evidence.
3. **Propose the one shared matcher**: its owner file, signature (for example a scorer taking an item's name and optional location, hoisting the Trash's best-of-both rule), and how each site folds onto it. List exactly what's removed per site and what each site keeps that's genuinely its own (and why).
4. **User-visible changes per site**: prefix to fuzzy, ranking, highlighting (`emphasizeMatch` in `AutocompletePane.tsx:126` assumes a prefix), anything that would get worse. One known trap: the picker closes on a finished link when exactly one row matches (`useConnectionAutocomplete.ts:118`); under fuzzy matching `[[Notes]]` also matches "Footnotes", so that close must ask `index.resolve(query)` instead.
5. **Cost**: nothing new may run per keystroke beyond what each search already does in class, and nothing may run on a caret move or a decoration build. Note precomputation needs (a folded location string per item).

##### How to Assess

- Simplest thing that works wins; reuse before invention (hand-rolled parallels to existing mechanisms are this codebase's most common avoidable defect); YAGNI.
- The owner's principles: less to carry, less to understand, one owner per responsibility, better rather than moved (relocated complexity of similar weight is no improvement), nothing left over, one implementation per thing with exceptions carrying their reason.
- Review what's there rather than confirming the framing; if a claim above is wrong, say so with evidence.

##### Report

Concisely, with citations: the inventory table; the one-concept-or-two verdict; the proposed matcher and per-site fold with removals; user-visible changes; cost; risks as named sequences reaching a bad state; and what this makes false in `.claude/Features/*.md`, comments, or tests. Close with a rough line-count estimate (removed versus added).

#### Report

##### Unified Search Matcher: Scout Report

Read-only. I edited nothing. The only file I wrote was a throwaway `m.mjs` in the scratchpad, used to hand-check `matchScore` on combined keys.

###### Corrections to the Brief

- **Some listed searches don't exist.** Option pickers (`PropertyOptionRows`, `Core/Properties/Pickers/PropertyPicker.tsx`), the Spaces/Properties `PickEntry` chooser, the column and visibility pickers, the destination/move tree (`Core/Actions/destinationTree.ts`), the embed and tile pick trees (`Core/Actions/pickTree.ts` rendered as menu submenus through `pickRows`, `Core/Tiles/tileHandleMenu.ts:71`), context and space pickers, and Settings have **no type-to-filter today**. "Picker fields within filtering cells" names a search that isn't there. Adding one is new scope, not a merge.
- **View search doesn't search cell contents.** It matches **titles only**: `useViewHost.ts:89-92` builds the map from `r.title`, and `search.ts:10` runs `matchScore`. It already uses the same matcher as the sidebar.
- **The Trash's rule can't meet Decision 9 as written.** Scoring title and place separately and taking the higher (`TrashFrame.tsx:55-57`) can't satisfy `[[Pommora/Cl` (Path Links Decision 9). The query "pommora cl" fails against the title "claudemd" and fails against the place "studio pommora". See the proposal below.

###### Inventory

| Site | Matches against | How | Ranking | Highlight | Cap | Runs |
|---|---|---|---|---|---|---|
| Sidebar `filterNav` `navSearch.ts:12-15` over `searchEntriesOf` `treeIndex.ts:146-170` | title (folded once at build, `folded`) | fuzzy `matchScore` | `rankMatches`: score, then `compareTitles`; kind-grouped for stable ties | none | 50 | per keystroke (`NavBase.tsx:36`); empty query returns `[]` (recents show) |
| Trash `filterRows` `TrashFrame.tsx:51-58` | title, or crumbs joined by `' '` | fuzzy, the higher of the two | `rankMatches` | none | none | per keystroke (memo at `:99`). **Folds every row's title and crumbs on every keystroke** (`:55-56`) |
| Connection picker, title rows: `PageIndex.candidates` `pageIndex.ts:54-67` | title | **prefix** `startsWith` | exact first, then shortest, then A–Z (lazy alphabetical sort at `:43,55`) | `emphasizeMatch(value, 0, query.length)` `AutocompletePane.tsx:126` | 20 (`AC_MAX`, `autocomplete.ts:210`) | per query change; empty query browses alphabetically |
| Picker heading list `headingRows` `autocomplete.ts:111-122` | heading text | **prefix**, deduped by key | outline order | prefix emphasis `AutocompletePane.tsx:135` | none | per query change (memo `useConnectionAutocomplete.ts:100-103`) |
| Picker alias list `aliasRows` `autocomplete.ts:139-150` | the page's remembered aliases | **prefix** | remembered order | `AliasList.tsx:176` (`match` also gates drag and entrance, `:56,127`) | none | per query change |
| Block menu `filterBlockMenu` `blockMenu.ts:85-106` | row label, or its section title (a matching section keeps every row) | **substring** `indexOf`, `toLowerCase` only (no NFC) | section order | `emphasizeMatch(label, at, len)` `BlockMenuPane.tsx:47` | none | in `blockQuery` field update on doc change only (`blockQuery.ts:36,42`); tiny fixed N |
| `LocationField.narrowed` `LocationField.tsx:22-32` | folder title | fuzzy `!== null` | tree order; a match keeps its subtree, ancestors open | none | none | per keystroke; folds each title on every keystroke (small N) |
| View search `searchGroups` `search.ts:4-14` | row title (map folded on entry, `useViewHost.ts:89-92`) | fuzzy `!== null` | **the view's own order** (filter, grouping, sort) | none | none | per keystroke |
| Icon search `searchIcons` `UIX/Symbols/allSymbols.ts:28-56` | icon id, plus Lucide tags and tag words | tiers: exact, then prefix, substring, exact tag, tag-word prefix | tier, then id | none | none | per keystroke |
| View filter rules `evaluateText` `filter.ts:243-266`, Location `isInside` `filter.ts:89-105` | cell value, folder names | explicit `contains` / `startsWith` / `is` operators | n/a | n/a | n/a | view resolve |

###### One Concept or Two

- **Five sites share one predicate.** Sidebar, Trash, view search, `LocationField` and the title picker (once folded) all use `matchScore(...) !== null`. The prefix and substring sites are the hand-rolled parallels.
- **Ordering genuinely differs, and should stay each site's own.**
  - Pickers rank: `rankMatches` in `navSearch.ts:14` and `TrashFrame.tsx:54`.
  - Structural surfaces keep their native order: view groups (`search.ts:10`), the heading outline (`autocomplete.ts:114`), the `LocationField` tree (`:24-30`), block-menu sections (`blockMenu.ts:96-104`) and the alias list.
  - "One way" honestly covers the **match test, the query fold and the location key**. It doesn't cover order; ranking a user's sorted view or a document outline by score would be wrong.
- **Two things are out of scope, with reasons:**
  - **View filter rules** are persisted predicates whose operators name exact semantics ("contains", "starts with"). They aren't a search, and making them fuzzy would change saved filters' meaning.
  - **Icon search** is recommended for exclusion. Its corpus is a synonym vocabulary (`iconTags.ts` is 10,475 lines of tags), and fuzzy subsequence over tag lists would flood three-letter queries. UIX also can't import `Core/Paths`. Moving `matchScore` to `UIX/Utilities` is possible (the host graph allows pure UIX leaves) but needs `engineGraph.test.ts:24-36` updated, and that's relocation for no gain. This is the owner's call, since the literal mandate includes it.

###### Proposed Matcher

**Owner:** `Core/Paths/caseFold.ts`, which already owns `matchScore`, `rankMatches` and `foldKey`. No new file.

```ts
export interface SearchKey { name: string; path?: string }           // both folded; path = place words + name, joined by ' '
export const searchKey = (name: string, place: readonly string[] = []): SearchKey
export const searchQuery = (raw: string): string                     // foldKey(raw.trim()) with '/' folded to ' '
export function searchScore(key: SearchKey, q: string): number | null // the higher of name and path, either may miss
```

`matchScore` becomes module-private. `rankMatches` stays as it is.

**Why two scores, name and path, rather than one joined key.** `matchScore` is greedy, so scoring a title query against the joined path drags title ranking down. I hand-checked this:

| Query | Item | Title score | Path score |
|---|---|---|---|
| "notes" | "Journal/Notes" | 27.95 | 13.87 |
| "bet" | "Journals/Beta" | 14.96 | 10.87 |
| "pommora cl" | "Studio/Pommora/ClaudeMD" | miss | 69.77 |

Taking the higher of the two keeps today's title ranking and adds the cross-folder queries. It still passes every current Trash test:

- 'journ' scores 27.87 by path.
- 'bet' scores 14.96 by title.
- 'gamma' matches with no place.

**Folding `/` to a space in the query** lets the path form (`Pommora/Cl`) and Trash's space form ("studio pommora") both match one space-joined key. It reuses `matchScore`'s `' '` word-start bonus (`caseFold.ts:42`) without adding `/` to it. Titles can't hold `/`, since they're file basenames, so title matching is unchanged.

**Per-site fold:**

| Site | Removed | Kept, and why |
|---|---|---|
| `pageIndex.candidates` | the `startsWith` filter and the exact/length sort (`:59-66`) | Empty-query alphabetical browse and limit 20. Keys built **lazily**, like `alphabetical` (`:42-43`), with place = folder segments of `p.path`, because the build runs in both processes on every tree change (`record.ts:85`). |
| `filterNav` / `searchEntriesOf` | the `folded` field and its own fold | Empty query returns `[]`; cap 50. Key built in the existing memo, with place = `r.parents` titles. |
| Trash `filterRows` | the three-way ternary and per-keystroke folds | Ranking. Keys built once when `rows` lands (memo), which removes a pre-existing per-keystroke cost. |
| `headingRows` | `startsWith` | Outline order and dedupe. |
| `aliasRows` | `startsWith` | Remembered order. |
| `LocationField.narrowed` | per-node `foldKey` and `matchScore` | Tree shape and `leads`. Place = the walk's ancestor titles, so "parent/child" narrows. |
| View search | the title-only `Map<string,string>` | View order and the band hiding. Map becomes id to `SearchKey`, with place = set chain from `setTree` in the same memo (`useViewHost.ts:89`). |
| Block menu | `matchAt` and `toLowerCase` | Section grouping. Key = `searchKey(label, [section.title])`, which reproduces "a matching section keeps its rows". |

**Query folding collapses into `searchQuery`.** Today seven sites fold the query themselves: `navSearch.ts:13`, `TrashFrame.tsx:52`, `LocationField.tsx:106`, `useViewHost.ts:54`, `pageIndex.ts:56`, `autocomplete.ts:112,145` and `blockMenu.ts:94`.

###### User-Visible Changes

- **Picker, headings, aliases, block menu go from prefix or substring to fuzzy.** More rows appear. The block menu gains fuzzy hits, and section matching is preserved.
- **Location narrowing everywhere.** Typing a folder lists what's inside it in the sidebar, picker, Trash, view and `LocationField`. "folder/title" works everywhere, which meets Path Links Decision 9.
- **Picker ranking.** Ranked by score, then A–Z. An exact title still lands first (it's the maximal raw score with the least length penalty), and ambiguous holders sit together.
- **Highlighting (a decision for the owner).** `emphasizeMatch` assumes one contiguous run at a known start. Under fuzzy matching the matched characters scatter, and a location match lands in the subline trail rather than the label, so prefix emphasis would be wrong.
  - **Option A, recommended:** drop highlighting. Remove `emphasizeMatch` (`MenuRows.tsx:30-40`), `matchText` (`menu-row.css.ts:156`), its export (`Menus/index.ts:15`), `BlockMenuRow.at` and `matchAt` (`blockMenu.ts:21,85-88`), and `matchLen` (`AutocompletePane.tsx:87,126,135`, `BlockMenuPane.tsx`). This matches sidebar, Trash and views, which never highlight.
  - **Option B:** `matchScore` also returns positions and rows emphasize each character, about 15 added lines.
  - Under either option, `AliasList`'s `match` must survive as a boolean that disables drag while filtering.
- **Gets worse: noise from long locations.** Fuzzy over a deep path is permissive. "plan" matches an item under `pommora/lantern/alpha` at 16.77, against 20.84 for a real "planning" folder hit. Ranked sites bury this under the cap. Order-preserving sites (view search, `LocationField`, block menu) show it in place. One plan option is to give the view search no place, but the mandate argues for supplying it.

###### Cost

- **Per keystroke:** at most two `matchScore` calls per item where today there's one. That's the same O(N·L) class. The second call runs only for items that have a place and exits early on the first missing character.
  - The picker moves from filter plus full sort to `rankMatches` with a cap of 20 (binary insert), which is no worse.
  - The Trash gets cheaper: no per-keystroke folds.
- **Precompute:** one folded path string per item.
  - Sidebar: in the per-tree memo.
  - Picker: lazily on the first `candidates` call per index.
  - Trash: per `rows`.
  - View search: in the search-start memo.
  - Headings and aliases are small N and can fold per call, as they do today.
- **Nothing runs on a caret move.** `sameQuery` (`acQuery.ts:19-30,69`) keeps the query object's identity, and `useConnectionAutocomplete.ts:60` bails when it's unchanged. The `candidates` memo also keys on the query *string* (`:121`). The plan must keep both.
- **Nothing runs in a decoration build.** The block field matches only on doc change (`blockQuery.ts:36`), and `provide` only maps it.

###### Risks

1. **Finished link reopens the picker.** Caret rests in `[[Notes]]` while "Footnotes" exists: under fuzzy matching two rows match, the `found.length === 1` close (`useConnectionAutocomplete.ts:118`) fails, and the picker opens on every rest in a finished link whose title is a subsequence of another title.
   - The fix is per kind, not a one-liner:
     - **Title part:** close when `index.resolve(query).status === 'resolved'`. This must be path-aware, so it depends on the Path Links resolver (Decision 4). `ambiguous` stays open, as Decision 8 wants.
     - **Heading part:** close when the query exactly matches a key in the outline.
     - **Alias part:** close when the query exactly matches one of the page's aliases.
   - Keep the `backedTo` exception (`:119`).
   - The heading part already has a smaller version of this today under prefix matching ("Setup" vs "Setup 2").
2. **Alias drag during a filter.** If `match` is removed with highlighting, a user types in the alias slot, drags a row in the filtered list, and the reorder lands on filtered indices, corrupting the remembered order. Keep the gate.
3. **Heading ranking.** If the plan ranks headings instead of filtering, rows reorder by score as the user types while the empty-query nested view keeps outline order: two orders in one list. Recommend filter-only.
4. **Eager picker keys.** Building path keys eagerly in `buildPageIndex` adds an O(N) fold to every tree change in both processes, including the host, which never opens a picker. Keep them lazy.
5. **Key mismatch between picker and sidebar.** Picker place comes from path folders and sidebar place from `parents` titles. These are equal for pages, since collection and set titles are folder names. Context titles come from `def.title` (`record.ts:34`) and only reach sidebar Space entries, so there's no cross-site conflict.

###### What Becomes False

- **Docs:**
  - `Features/ConnectionsPM.md:57` "matched by title prefix", plus the alias and heading bullets at `:58-59`, which imply prefix through "filtered by what's written".
  - `Features/NavigationPM.md:12` "title-based subsequence scan".
  - `Features/ViewTypesPM.md:75` "whose titles hold its letters in order".
  - `Features/ViewTypesPM.md:66` `LocationField` narrowing gains location.
  - `Features/MarkdownPM.md:142` `/hea` example (still true, but the matching changes).
  - `Features/PommoraUIX.md:364` the Match row, if highlighting is dropped.
  - `Features/NexusRecordPM.md` doesn't describe Trash search, so nothing to fix there.
- **Comments:**
  - `pageIndex.ts:33` ("Titles normalize ONCE at build") and `:57`.
  - `navSearch.ts:8` (`folded`).
  - `MenuRows.tsx:30`.
- **Tests:**
  - `pageIndex.test.ts:44-60` (prefix; exact, then shortest, then A–Z).
  - `autocomplete.test.ts:536-545` (headingRows prefix).
  - `aliasPicker.test.tsx` (prefix and emphasis).
  - `blockMenu.test.ts:55-90` (substring and `at`).
  - `TrashFrame.test.tsx:27-53` (still passes; add a combined-query case).
  - `navSearch.test.ts`, `search.test.ts`, `treeIndex.test.ts` (`folded`).
  - `caseFold.test.ts` (`matchScore` goes private).

###### Line Estimate

Rough: about −45 removed, +30 added (helpers about 12, place threading about 15, close rule about 3), so roughly **−15 net** with highlighting dropped. Keeping highlighting with per-character positions puts it at roughly **+5 net**.

---

### Round 3 — Unresolved Link Clicks

**MODEL:** `opus-high`
**SUPERSEDED:** Settled by C-1 through C-6: the editing exception kept (C-1), the Text value two-click path (C-3), Edit Link selecting everywhere (C-4), and the heading kept where the picked page holds it (C-5).

#### Brief

You are a read-only scout in Pommora (repo root `~/The Studio/Projects/Project Pommora`). Edit nothing. Your findings feed a decisions document the owner will hand to a planning session.

##### The Mandate

A coming change lets links name pages by path (`[[Folder/Sub/Title]]`), drawn as the title only, the path hiding with the brackets. A link whose title two pages share reads **Ambiguous**; one naming nothing reads **Phantom**. The owner ruled that an unresolved link is fixed through the connection picker, which lists every page holding the title and writes the path form on a pick, and set one rule for how you get there: "whenever an unresolved link (no matter how or where) gets clicked on, the caret goes into the title, not the alias if it has one." The picker then opens on its own, because a caret in a link's title slot arms the picker's query (`acQuery`, `Core/MarkdownPM/Autocomplete/acQuery.ts:55-66`; `autocompleteQuery`, `autocomplete.ts`; `useConnectionAutocomplete.ts`). The owner said the work is "merging … alias-to-title click mechanisms", so look for every existing mechanism that seats a caret in or around a link's slots and could be one rule.

Known from earlier scouting (verify where you rely on it): a click on an unresolved link in a body falls through to ordinary caret placement because `resolveFollow` returns null for unresolved (`Core/MarkdownPM/Links/linkClicks.ts:110`); a click on a visible alias or label lands the caret in the `shown` slot, where the picker lists aliases for a resolved page only, so nothing opens; a resting table cell activates and dispatches a selection (`CellEditor.tsx:271`); the Link field and the Text pane open with the caret at the end (`Core/Properties/Pickers/ValueEditor.tsx` ~150), where `partOf` finds no slot; the Link value's Rename seats the caret in the alias slot (`ValueEditor`'s `alias` option); Edit Title selects the destination (`Core/MarkdownPM/Links/linkEdit.ts:36-40`).

##### Your Job

1. **Every surface where an unresolved link can be clicked**, in both syntaxes, aliased or not, phantom or ambiguous: the page body editor, a live table cell, a resting table cell (`Core/MarkdownPM/Tables/cellStatic.tsx`), markdown tiles, a Text value's pane and its resting cell, a Link property value at rest (`Core/Properties/Cells/LinkCell.tsx`, cards, the Panel) and in its one-line field, an unresolved embed line (`![[Title]]`), and anything else. For each, with file:line: what a click does today and where the caret lands, and whether the picker opens.
2. **Every existing caret-seating mechanism around links**: click handlers, `posAtCoords` mapping, the resting cell's click-to-offset mapping, the label widget's click, the Rename alias seat, Edit Title's selection, the Return/`]` rest rules (`shownEnd`, `linkRest`), and any "click lands at the link's edge" rule. Which are the same idea stated more than once?
3. **The one rule's owner**: where "a click on an unresolved link seats the caret at the end of its title slot" belongs so every surface gets it without its own copy (the editor's click plugin, a shared seat helper that cells and fields call, the value editor's open), what it replaces, and how a resting surface (cell, Link value) hands the seat to the editor it opens. Say exactly where in the title slot the caret should land so the picker's query lists every holder, and confirm by reading that the picker then opens with the holders and their trails and that a pick writes in place through the existing commit (`commitEdit`'s `title` arm), keeping the alias (`keepsShown` keeps it for an unresolved baseline, `Core/Connections/linkValue.ts:255-264`).
4. **What a resolved link's click keeps**: following the link (and ⌘-click), the glance, the menu. The rule must change nothing for resolved links.

##### How to Assess

- Simplest thing that works wins; reuse before invention (hand-rolled parallels to existing mechanisms are this codebase's most common avoidable defect); YAGNI.
- The owner's principles: less to carry, less to understand, one owner per responsibility, better rather than moved, nothing left over, one implementation per thing with exceptions carrying their reason.
- No added cost on keystrokes, caret moves, or decoration builds.
- Review what's there rather than confirming the framing; if a claim above is wrong, say so with evidence.

##### Report

Concisely, with citations: the per-surface table (today's behavior, where the caret lands, whether the picker opens); the caret-seating mechanisms and which are duplicates; the proposed owner and its signature, with what it replaces and how resting surfaces hand off; what a resolved click keeps; risks as named sequences reaching a bad state; what this makes false in `.claude/Features/*.md`, comments, or tests; and a rough line-count estimate (removed versus added).

#### Report

##### Unresolved Link Click: Scout Report

All paths are relative to `~/The Studio/Projects/Project Pommora`. I edited nothing.

###### Corrections to the Brief

- **Some clicks already open the picker:** a click on the text of an unaliased ambiguous wikilink (`[[Beta]]`) already opens it today, in the body, a live cell and a resting cell. The caret lands in the title slot, `autocompleteQuery` reads the whole slot (`Core/MarkdownPM/Autocomplete/autocomplete.ts:86-88`), and two or more holders get past the exact-match gate (`useConnectionAutocomplete.ts:118-119`). What's broken is the pick: `pageRow` sets `value: p.title` (`autocomplete.ts:104-109`), so the pick writes `[[Beta]]` again and the link stays ambiguous. **The click rule fixes nothing until Path Links Decision 3 (a pick writes the path) lands, so that has to come first.**
- **Phantoms aren't "on the link":** the `onText` selector (`Core/MarkdownPM/Links/linkClicks.ts:63-65`) leaves out `.md-connection-phantom` and `.md-phantom-syntax`, and `hidesSyntax` is false for a phantom (`:71`). A press on a phantom goes straight to CodeMirror's own caret placement.
- **Resting phantoms aren't link hits either:** they're drawn without `data-link` (`Core/MarkdownPM/Tables/cellStatic.tsx:149-165`), so `cellLinkTarget` (`:638`) never sees them, in table cells or in Text and Link values.
- **Edit Title can't open the picker:** it selects a range (`linkEdit.ts:39-40`), and `acQuery` only runs on an empty selection (`acQuery.ts:65`). Rename with an alias already written also selects, so it opens nothing either; only an empty alias slot opens the alias list.
- **The other claims check out:** `resolveFollow` returns null at `:110`, `CellEditor.tsx:271` seats the handed-off selection, `ValueEditor.tsx:151` opens with the caret at the end, and `:145` is the Rename seat.

###### Per-Surface Table (Today)

| Surface | What a click does and where the caret lands | Picker opens? |
|---|---|---|
| Body, ambiguous wikilink, no alias | `onText` is true and follow is null, so CodeMirror puts the caret at the press, in the title | Yes, holders with trails; the pick writes the bare title |
| Body, ambiguous wikilink with alias / markdown label | Caret lands in the `shown` slot. `aliasRows` needs a resolved page (`autocomplete.ts:144`) | No |
| Body, markdown `[](Shared)` with empty label | `posAtDOM(label)` gives the start of the content (`linkClicks.ts:49-50`); caret lands in the empty label | No |
| Body, ambiguous, press clamped in from beside the link | `seatAtNearerEdge` puts the caret just outside (`Gestures/pointerPath.ts:50-51`) | No |
| Body, phantom (`[[X]]`, `[[X\|A]]`, `[L](X)`) | Not `onText`; syntax is visible (`decorations.ts` phantom branches); caret lands wherever pressed: brackets, title or label | Only if the press hits the title and some longer title starts with it |
| Live table cell | Same as the body (`surface.ts:51`, every editor gets `linkPointer`) | Same as body |
| Resting table cell | `claimLink` gets null, then `onActivate({kind:'point'})` (`cellStatic.tsx:555-557`), then `posAtCoords` in the new editor (`CellEditor.tsx:262-271`) | Same as body, by whichever slot it lands in; phantom isn't a hit |
| Markdown / Page tile at rest | Same view, read-only; caret lands at the press. Tile `onClick` begins editing (`MarkdownTile.tsx:52-58`, `PageTile.tsx:161-168`) | No: read-only blocks the query, and the read-only switch is neither a doc nor a selection change, so `acQuery.ts:55` never recomputes |
| Text pane, or a one-line field already open | Same as body | Same as body |
| Text value at rest (`TextCell`) | Follow is null, so the click bubbles (`TextCell.tsx:46-55`) to an `edit` intent; field opens with the caret at the end of the first line (`ValueEditor.tsx:151`) | No (`partOf` finds no slot) |
| Link value at rest (`LinkCell.tsx:41-53`, which renders `TextCell`) in Table, Cards and the Panel | Same; caret lands past `]]` | No |
| Link value menu: Edit / Rename | Edit runs `editLink` as an `edit` intent (`valueClick.ts:51`), caret at end. Rename opens the popover alias seat (`ValueEditor.tsx:145`) | No / no |
| Unresolved `![[Title]]` | No tile forms (`embedWidget.tsx` `buildTiles`). The wiki pattern starts at `[[` (`Connections/connections.ts:22`), so the `!` is plain text and it acts as an ordinary wikilink | Same as body rows |
| Glance pane, page history | Read-only. Follow is refused in a glance (`linkClicks.ts:88`); the query never arms | No |
| Footnote marker whose citation is one unresolved link | Travels to the citation (`citationPointer.ts:44-46`) | No |

###### Existing Caret-Seating Mechanisms

1. **Link-slot seats:** `linkEdit` returns `select` for `rename` and `editLink` (`linkEdit.ts:32-40`), and three appliers already exist:
   - `applyLinkAction` uses `focusRange` in an editor (`:73-90`).
   - `applyAtRest` calls `onActivate({kind:'select'})` from a resting cell (`cellStatic.tsx:444-452`), which `CellEditor`'s `seatSelection` lands (`CellEditor.tsx:101-119`).
   - `ValueEditor` applies `applyLinkAction(view,'rename',…)` when it opens (`ValueEditor.tsx:145`).

   This is already the single "seat in a link slot" channel. The new rule should be one more arm here, not a parallel path.
2. **Where a press lands:** `pointerPath` mousedown, via `seatAtNearerEdge` (`caretPlacement.ts:18-26`). The new seat is a sibling of this clause.
3. **Nearer edge of an embed tile:** `embedClickSeat` (`embedWidget.tsx:656-680`). Same idea as 2 but by vertical band, not a horizontal clamp. Leave it.
4. **Pointer-seat filter:** `select.pointer` runs through `seatPastMarker` (`decorations.ts` `caretSeat` filter), replayed after a programmatic seat by `seatPastMarkerNow` (`CellEditor.tsx:69-80,273`).
5. **Resting click to offset:** `restingRange` / `cellOffsetAt` (`cellStatic.tsx:337-407`), used only for menu ranges. The seat handoff uses `posAtCoords` in the live editor instead; two mappings, by necessity.
6. **Hit position:** label `posAtDOM` versus `posAtCoords` in `linkUnder` (`linkClicks.ts:48-51`).
7. **Exit seats:** `commitEdit`'s `whole(…, open)` anchor (`autocomplete.ts:160-167`) and `commitAliasOnEnter` / `shownEnd` / `linkRest` (`linkEdit.ts:96-120`, `linkReveal.ts`). These decide where the caret goes when leaving or opening a slot, not entering one, so they aren't the same idea.
8. **Near-duplicate:** `focusAt` versus `focusRange(view,pos)` (`caretPlacement.ts:4-15`). `focusAt` lacks `assoc 1`; its callers are `seatAtNearerEdge` and `Tables/widget.tsx:249-253`. Fold only if the `assoc` difference proves harmless at hidden-marker edges.

**Inconsistency worth a ruling:** "Edit Link" selects the title in the body and cells, but opens the Link value field with the caret at the end.

###### Proposed Owner

**The position:**
- One new arm in `linkEdit`, e.g. `'seatTitle'` returning `{kind:'select', range:[tk.link.title[1], tk.link.title[1]]}`. `action` widens to `LinkAction | 'seatTitle'`.
- **Where in the title:** any spot in the title gives the same query, since the query reads the whole slot (`autocomplete.ts:86-88`). The end is a typing convenience: backspace narrows.
- `partOf` checks the title first with inclusive ends (`Input/edits.ts:398-407`), so the title's end wins over an adjacent `|`, `#` or `)` in both syntaxes and in path form.
- Merging this into `editLink` doesn't work as-is. Edit Title's range can't open the picker, and on a resolved exact title a collapsed caret opens nothing (exact-match gate), so the select-all keeps its purpose. Collapsing Edit Title would be a separate ruling.

**Three callers, each on an existing applier:**
1. **`pointerPath` mousedown, left button only, when `!editingOnPress`:** if `hit.onText` and the spec's new `seat` succeeds (linkClicks: `hit.tk && hit.target.kind === 'unresolved'`, then `applyLinkAction(view,'seatTitle',hit.range)`), call `preventDefault` and return true. This sits before the nearer-edge clause.
   - Widen the `onText` selector (`linkClicks.ts:64`) to include `.md-connection-phantom, .md-phantom-syntax`. Leave `hoverGate` as it is.
   - Keep it out of `follow`. Otherwise the right-press branch (`pointerPath.ts:47`) claims right-presses, and `followCitation` would seat into a footnote instead of traveling.
   - This one place covers the body, live cells, the Text pane, one-line fields, tiles and unresolved embeds.
2. **`cellStatic` `claimLink`:** `followTarget(…) ?? (found.tk && unresolved && !readOnly() ? () => void applyAtRest(found.tk,'seatTitle') : null)`. Offsets are whole-cell, the same convention `applyAtRest` already uses.
   - Wrap the phantom fragment in a `linkSpan(s,e)` span with `data-link` and no `data-at`. The inner verbatim spans keep exact offsets for `cellOffsetAt`.
3. **`ValueEditor` open, beside the `alias` branch:** if `oneLine` and `drawnLinkAt(view,0)` covers the whole doc and resolves unresolved (via `host.connections()?.index` and `holder`), call `applyLinkAction(view,'seatTitle',[0,len])`.
   - This gives Link values the rule from any click, and from menu Edit, in Table, Cards and the Panel, without threading anything through the three surfaces.
   - Rename (`alias`) keeps priority.

**What it replaces:** nothing is deleted. Unresolved presses stop falling through to CodeMirror, and an unresolved Link value stops opening at the end.

**Text values with prose around the link: needs your ruling.** The field edits the first line, trimmed (`parseEditorValue.ts:15`), and the click target never reaches it. Closing this means a seat on the `edit` intent, computed by a shared resting reader (the same shape as `fileChipIndex(target)` in all three surfaces), plus editing-state fields, plus `PropertyValueInput` and `ValueEditor` props: about +20 to 25 lines. A link on line 2 or later still can't be seated in a one-line field. The alternative is two clicks: the first opens the field at the end, the second hits the link and gets rule 1.

**After the seat (confirmed by reading):**
- The selection transaction recomputes `acQuery` (`:55-66`) to a closed title query, the hook sets `ac` with caret geometry (`useConnectionAutocomplete.ts:56-62`), and rows show holders with trails (`AutocompletePane.tsx:102`).
- A pick goes through `commit`. `kept = keptShown(…)` sees the unresolved baseline, so `keepsShown` returns true (`Connections/linkValue.ts:255-264`).
- The `title` arm then rewrites the whole link with the alias kept (`autocomplete.ts:173-179`). Without an alias, the alias stage can open (`useConnectionAutocomplete.ts:154-160`). The caret rests past the link (`:171`).

###### What a Resolved Click Keeps

The seat runs only when `target.kind === 'unresolved'`, never on a null follow, because a glance also returns null.

- Follow and ⌘-click (`resolveFollow`), travel to a heading, and opening a URL are unchanged.
- The glance stays unchanged (`hoverGate` and `dwellTarget` only arm on resolved links).
- The menu stays unchanged (`linkMenuTarget` refuses unresolved, `connectionMenu.ts:25`).
- The clamped-press nearer-edge seat stays as it is.

###### Risks

1. **Heading dropped:** click `[[Shared#Intro|A]]`, pick a holder, and the `title` arm writes `heading: undefined`, so `#Intro` is lost. This is the same today for typed retitles, but the rule makes it common. Needs a ruling: carry the written heading on a title re-aim.
2. **Pick re-writes the bare title:** see the corrections above; the rule is a no-op until Decision 3.
3. **Phantoms and path forms:** a phantom whose title nothing extends gets the caret but no pane (`open` needs candidates, `useConnectionAutocomplete.ts:180`). Path-form queries match nothing until Decision 9's location matching lands.
4. **Editing trap:** if the `editingOnPress` exemption is dropped, every click inside an unresolved link you're already editing snaps back to the title end, so the alias can't be placed into with the mouse. Keep the exemption. That's a deliberate exception to "no matter where" and needs your confirmation.
5. **Clamping:** if the seat ignores `onText`, a press clamped in beside an ambiguous link jumps into its title (breaking `linkEdges.test.tsx:184`). And because `linkTokenAt` is end-inclusive (`tokens.ts:323-324`), a press just past a link at line end would get hijacked.
6. **Tiles:** a click on a tile at rest seats the caret, the read-only switch doesn't recompute `acQuery`, and the pane stays shut. Fix: recompute when `startState.readOnly !== state.readOnly` (one cheap check), or have `MarkdownEditor` re-dispatch the selection.
7. **Handoff geometry is untested:** no test asserts the pane opens after a seat at mount (`cellAlias.test`, `PropertyValueInput.test:191-206` check only the caret). A null `coordsAtPos` at mount sets `ac` null, and nothing retries for that query. Test this live.
8. **Sticky dismiss:** press Escape, then click the same link while the caret is still in it. `editingOnPress` hands the press to CodeMirror and `dismissed` keeps the pane shut (`acQuery.ts:68-69`). Acceptable.
9. **Double-click:** the first click reveals the syntax and shifts layout, so the second press may select a bracket or path word.
10. **Glance and history:** a press there seats a caret in a read-only render. It's harmless (no pane), but you could apply `followTarget`'s glance check for symmetry.
11. **Embed tiles:** after a pick, `![[Folder/Shared]]` forms a tile only once `buildTiles`'s `index.resolve(e.title)` reads paths.

###### What This Makes False

- **`.claude/Features/ConnectionsPM.md:19`:** "muted and inert until one side is renamed".
- **`.claude/Features/ConnectionsPM.md:36`:** "a phantom is inert".
- **The Path Links decisions doc:** its Context section says an ambiguous link is "muted and inert".
- **`PropertyValueInput.tsx:17` doc comment:** "opens on the whole written value …" no longer covers an unresolved value.
- **Tests:** the `linkEdges.test.tsx:163-191` describe "a link that leads nowhere still takes the caret where it was pressed". Tests :165 and :174 would pass vacuously (title end 8 isn't in `[2,10]`); rewrite them to pin 8. The :165 phantom test dispatches on `contentDOM`, so it never exercises the phantom selector.
- **Still true:** `TextCell.test.tsx:119` (the click still bubbles) and `ValueEditor.test:87` / `PropertyValueInput.test:191` (resolved `Alpha`).

###### Line-Count Estimate

| Piece | Lines |
|---|---|
| `linkEdit` arm | +2 |
| `pointerPath` seat clause and spec member | +4 |
| `linkClicks` seat and selector | +2 |
| `cellStatic` phantom wrapper and `claimLink` | +4 |
| `ValueEditor` open | +4 |
| `acQuery` read-only recompute | +1 |

Total is about **+17 / -0**, excluding test rewrites. The optional Text-value seat plumbing adds another +20 to 25. This rule is a small net addition; the net-negative target belongs to the wider Path Links change.

---

### Round 4 — Grammar, Reader, Index Key, and Resolver

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; a "Nexus" is a user folder of Markdown pages). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152` (a parallel session just reverted `§` as a link heading opener; `#` is the only opener again and `INDEX_GENERATION` is 15).

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **A-2, A-4, A-5, A-6, A-8, A-9, B-2, B-3, Open Item 1**, plus how E-2's re-spell will consume what you design.
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: earlier scouts' reports. Read *§Mechanism Forks* (top of file), *Round 1 — Read, Resolve, and Draw* (lines 31-254), *Round 1 — Obsidian Path Semantics* (700-790), *Round 2 — Read, Draw, and Pick Reuse* (1240-1437). Each carries a SUPERSEDED note; the Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: The Grammar, the Reader, the Index Key, and the Resolver
Map the chain from link text to a resolved page at HEAD: `Core/Connections/{connections,links,linkValue,pageIndex,scan}.ts`, `Core/Paths/{posix,names,caseFold}.ts`, `Core/Nexus/record.ts` (`pageIndexOf`), `Desktop/Store/ddl.ts` and whatever writes and queries `relations.target` (`queryMentions`, `queryHeadingMentions`, and their callers), and `wikiTitle` with every file-reference reader (File values, banners, covers, asset URLs).

Settle with evidence:
1. **Fork 1 (index key):** should `relations.target` hold the written key (bare, partial, or full path, normalized) with no schema change, so "files linking page P" is an exact query per tail of P's path? Verify every reader of that column and every query shape; name what breaks or must change.
2. **Fork 2 (occurrence shape):** should `LinkOccurrence.title` stay the whole page half (folders included), split at its last `/` only where the basename is read? Count the touch sites either way.
3. **The resolver (A-4, B-2, B-3):** full path first, else the one page whose path ends with the written tail, several = Ambiguous, none = Phantom, through the existing title holders filtered by path rather than a second map. Where does a normalized path comparison live today (case/Unicode fold)? How does B-3 (two files in one folder differing only by case/Unicode) fall out?
4. **Where `/` is refused today** in each syntax (`namesPage`, the wikilink reader, names.ts) and the minimal change that lets a page-naming target carry folders while URLs, schemes, `./`, `../`, and file references read exactly as today (A-8).
5. **Open Item 1 (`.md`):** how cheaply both syntaxes can read a `.md` on the page half (before `#`) through one rule, without reaching `wikiTitle`, so a File value `[[Report.md]]` still reads `Report.md`. Name the exact function where it belongs.
6. **A-6:** the existing fallback an unspellable title takes to markdown form; can a folder segment ride it unchanged?

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition; the merges count.

###### Report (dense, file:line at HEAD throughout)
1. The verified chain, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item above, with the alternatives you weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

Other scouts cover writers and drawing, search, clicks, in-app re-spell, outside moves, and the Trash; stay in your lane but name the interfaces they'll need from you (especially what the re-spell needs from the resolver and the index query).

#### Report

##### Path Links Scout: Grammar, Reader, Index Key, Resolver (HEAD 14da3f152)

Read-only. I edited nothing and ran nothing. `INDEX_GENERATION` is 15 at `Desktop/Store/ddl.ts:3`.

###### 1. The Chain at HEAD

**Grammar.** `pageLinkPattern` (`Core/Connections/connections.ts:19-21`): the wiki page half `[^\]\r\n|#]` already admits `/`. `wikiSpans` (`:69-86`); `markdownSpans` (`:89-101`) splits at the first raw `#` only when `namesPage(half)` (`:93`). `linkOccurrences` (`:104-118`). `LinkOccurrence.title` is the whole page half (`:34-37`).

**Where `/` is refused today:**
- Only `namesPage` refuses it: `Core/Connections/links.ts:37-39`, `!pageHalf.includes('/') && !HAS_SCHEME…`. Its callers are `markdownSpans:93`, `targetTitle` (`links.ts:65`), `targetNamesFile` (`:71-72`) and `headingHash` (`Core/MarkdownPM/Input/edits.ts:471`).
- The wiki reader never refuses it. `readOccurrence` keeps the raw trimmed slot (`Core/Connections/linkValue.ts:71`).
- `holdsName` (`Core/Paths/names.ts:13-17`) refuses `/`, `\` and NUL in every title and folder name. That's why a `/` inside a link is always a folder separator. It stays as it is.

**Reader.** `readOccurrence` (`linkValue.ts:67-88`) → `writtenPage` (`:56-64`), the one constructor of the page arm for both syntaxes. Markdown strips `.md` in `targetTitle` (`links.ts:68`); the wiki arm doesn't (`linkValue.ts:71`). Then `readLinkText` (`:90-95`), `namedPage` (`:102-103`), `resolveLink` (`:106-123`, `index.resolve(title)` at `:120`).

**Index.** `buildPageIndex` (`Core/Connections/pageIndex.ts:32-69`): `byTitle` holds `ConnPage[]`; `holdersOf` at `:44-45`; `resolve` at `:48-53` gives phantom, ambiguous or resolved. It's built from `pageIndexOf` (`Core/Nexus/record.ts:85`) in both processes. Pages only come from Collections and Sets (`record.ts:40-44`), so every page path has at least one folder segment.

**Scan.** `titleKey` (`Core/Connections/scan.ts:24`). `linksIn` (`:84-115`) sets `target = normalizeTitle(named.title)` (`:97`), or `own` for a bare self-link (`:93`, `:108`). That's already the written key: `[[A/Notes]]` stores `a/notes` today.

**Rows.** Written in `Core/Index/indexSeed.ts:49-59`, with `own = titleFromPath(rel)` (`:42`). Table and index at `ddl.ts:18-26` (`relations_by_target (target, qualifier, kind)`).

**Readers of `relations.target`:**
- `queryMentions` / `queryHeadingMentions`: interface at `Core/Platform/stores.ts:60-61`, SQL at `Desktop/Store/stores.ts:99-114`, memory store at `Core/Testing/memoryStores.ts:130-147`, wrappers at `Core/Index/contentIndex.ts:65-74`. Callers:
  - `cascade.ts:96` (delete, mapped over the gone titles then unioned)
  - `cascade.ts:173-174` (page and heading rename)
  - `fileEvents.ts:299` (the outside heading-rename gate)
- `readPageRelations` → `matrixGraph.ts:32-37` → `matrixInput.ts:74` `resolve(link.target)`.
- `queryMembers` reads `space` rows only and is unaffected.
- In-memory twins of the same key compare: `rewrite.ts:26,92`, `cascade.ts:69` (`spacesLinkHeading`), `tilesFile.ts:278`.

**`wikiTitle` and file references.** `wikiTitle` is at `linkValue.ts:132-135` (it goes through `readLinkText`). Its callers:
- `assetUrl.ts:22`
- `assetRoots.ts:22,28`
- `assetMigrate.ts:57,178`
- `Properties/value.ts:66` (`fileName`)

`resolveAssetName` (`assetMap.ts:64-68`) is keyed by normalized basename, so `[[sub/x.png]]` is unresolved today and stays unresolved.

**Drifted citations** (everything else I re-read holds):
- Round 1's `scan.ts:23,95` is now `:24,97`.
- Round 1's `scan.test.ts:157-158` is now `sectionRunsIn` and extractor tests and doesn't pin the self-link key; `indexSeed.test.ts:164` does.
- `decorations.ts:605` (`targetSpan`) is now `:606`.
- Round 2's `names.ts:29` (the period rule) is now `:32`.
- Round 2's `urlPath.ts:28-39` (`isValidLink`) is now `:33-44`.
- `matrixInput.ts:64-76`: `resolve` is bound at `:64` and called at `:74`.
- Round 2's embed-exclusion worry: `embedWidget.tsx:398` already keys by `page.path` and ancestors.

###### 2. Recommendations

**Fork 1, the index key: store the written key, with no schema change.** The key is already the written key for wiki links (`scan.ts:97`). Markdown path rows appear once `namesPage` admits `/`, and wiki `[[Notes.md]]` rows move from `notes.md` to `notes` under the `.md` rule. Both change rows, so `INDEX_GENERATION` must go to 17, per the Decisions constraint.
- **Queries:** "files linking P" is the union over every tail of P's path. Change only the Core wrappers in `contentIndex.ts:65-74` to take a list of names, fold each with `normalizeTitle`, call the store's existing single-key query per name, and return a sorted union.
  - The store contract, its SQL and `memoryStores` stay untouched.
  - `cascade.ts:96-99`'s own map-and-union idiom is removed.
  - Rejected: an SQL `IN ${PATHS_OF}` signature on the store. That's one round trip instead of about three, but it doubles the test churn.
- **What must change:** every caller that passes a bare title misses path links. That's `cascade.ts:96,173,174` and `fileEvents.ts:299`, plus the in-memory key compares at `rewrite.ts:26,92`, `cascade.ts:69` and `tilesFile.ts:278`. Those belong to the re-spell and Trash scouts. The Matrix gets path edges for free once `resolve` reads paths.
- **`own`:** pass the page's own extensionless path instead of its title. That means `indexSeed.ts:42` becomes `stripMarkdownExt(rel)`, which feeds `:52` and `:57`. Twins' `[[#H]]` rows then stop sharing one key, and the self-link row becomes one of the page's own tails, so the per-tail query finds it exactly.
  - In `scan.ts` only the parameter name and doc change.
  - The rewriter's own decision (`cascade.ts:187,217,221` → `rewrite.ts:91-92`) moves to resolution under E-7. The two can coexist until then.
- **Rejected alternatives:**
  - A folder column (Round 1): it changes the primary key and the Matrix input, and a forgotten filter writes into the wrong twin.
  - A resolved page id as the key: every collision would re-index other files' links.

**Fork 2, the occurrence shape: keep `title` as the whole page half, and extend that to `PageName.title`.** This diverges from Rounds 1 and 2, which both proposed `PageName = { folder?, title }`.
- **Span:** only three draw sites read a basename: `tokens.ts:245` (`linkToken` gains `text`, from its caller at `:278`), `decorations.ts:594` and `cellStatic.tsx:178`. They share one bounded loop helper in `connections.ts` beside `targetSpan`, walking back from the span's end to the last `/` with no allocation. A folder span would touch about 11 sites.
- **`PageName`:** only four display rules need the basename: `defaultLabel` (`links.ts:35`, which covers its three callers), `repeatsTarget` (`connections.ts:145-146`), `linkDisplayText`'s wiki arm (`linkValue.ts:201-202`) and `carry` (`rewrite.ts:34,38`).
  - A split shape needs a `pageKey` composer at about ten key sites: `scan.ts:97`, `linkValue.ts:120`, `autocomplete.ts:99` → `useConnectionAutocomplete.ts:82`, `gonePageEntry` (`propertyValue.ts:146-148`), `pasteAsMenu.ts:46,100`, `LinkCell.tsx:46`, plus `pageLinkText`, `spellsAsWiki` and `encodeLinkTarget`.
  - The failure modes decide it. A forgotten `basename` shows the folder on screen; a forgotten `pageKey` silently drops the folder when the link is written.
  - Alias memory is safe under either shape: `shownAlias` gates on `keepsAlias(alias, target.page.title)` (`linkValue.ts:146`), and `aliasMemory.ts:21,34` uses the page's own title.
  - `parkLinks` (`Trash/holdings.ts:89`) is wrong under both shapes and gets re-keyed under F-4.
- **Worked carry example for E-2:** `[[A/Notes|Notes]]` renamed to Plan. `namesTarget` returns `'title'` because `repeatsTarget` compares against the basename `Notes`. `carry` returns `basename(to.title)`, which is `Plan`. Then `rewrite.ts:64` asks `repeatsTarget('Plan', 'A/Plan')`, gets true, drops the pipe, and writes `[[A/Plan]]`.
- **Basename helper:** reuse `posix.basename` for strings. Edge case: it strips a trailing `/`, so `defaultLabel('A/')` reads `A` while the span helper reads empty. It only affects a phantom; the drawing scout can match it or ignore it.
- **Naming:** keep the field name `title` (`LinkOccurrence.title` is the precedent) and update the `PageName` doc (`connections.ts:128`).

**3. The resolver (A-4, B-2, B-3): `pageIndex.ts` only, no second map.**
- `entries` gains `place: normalizeTitle(stripMarkdownExt(p.path))`, folded once at build, so nothing folds paths on the decoration hot path. That's the same string as D-4's location key; the search scout should share it rather than define another.
- `byTitle` holds entries. An internal `entriesOf(raw)` works like this:
  - Bare key: `byTitle.get(key)`, exactly as today.
  - Key with `/`: take the holders of its last segment. Keep those whose `place === key`; if there are none, keep those whose `place` ends with `'/' + key`.
- `resolve` reads entries directly, with no allocation for bare keys. `holders` maps entries to pages, and its callers are host-side and writer-side, not hot.
- The result is one page → resolved, several → ambiguous (B-2 unchanged), none → phantom.
- The established fold is `foldKey` / `normalizeTitle` (`caseFold.ts:7-14`), the same one used for paths at `names.ts:47` and `Desktop/Store/stores.ts:221-257` (`sync_base.fold`).
- **B-3 needs no code.** `A/Notes.md` and `A/notes.md` share one `place`, so they read ambiguous. The written full path is still ambiguous, which the Decisions accept.
- **Relative and absolute forms:** `./x`, `../x` and `a//b` never match, because walk paths hold no such segments. A leading `/` (`[[/Notes]]`) reads phantom. Obsidian reads it as vault-absolute, and A-2 and A-4 are silent on it: **a question for Nathan**.
- **What the re-spell needs:** no new resolver function. "Does tail T name exactly P" is `resolve(T).page?.id === P.id` against the before or after index (`pageIndexOf(tree)`, memoized per tree). Membership is `resolveLink(written, beforeIndex, ownPage)`, which already takes `own`.
- About 6 lines added.

**4. The minimal change to admit `/` (A-8): reduce `namesPage` to the scheme check.** It becomes `!HAS_SCHEME.test(pageHalf.trim())`, a removal.
- **Unchanged:**
  - URLs with a scheme.
  - `example.com/x`: still the url arm. Its page half resolves only if a folder named `example.com` exists, since the tail must match whole segments, so a URL can't reach a page by its last segment.
  - File values and assets.
- **Behavior changes to name, not guard:**
  - Markdown `./x`, `../x`, `docs/file.pdf` and `localhost/x` go from unread to page-kind phantoms. They draw the same, but they gain index rows and take C-1's click seating. That matches how wiki `[[./x]]` already reads (one rule across syntaxes).
  - `![](img/a.png)` likewise; `![](a.png)` already reads as a url with a page today.
  - `[a](dir/Page)` and `[a](example.com/x)` now turn a typed `§` into `#` (`edits.ts:471`), which A-9 asks for.
  - `[x](a/b#c)` now splits at the `#`.
- **Alternative** if Nathan reads A-4's "aren't meant to be read" as "not a link at all": `namesPage` also requires every `/` segment to pass `holdsName`. That's 1 line, but it creates an import cycle (names → connections → links → names). Which reading he means is **a question for Nathan**.
- **A-6 fallout:** under the whole-key `title`, `spellsAsWiki` → `expressibleInLink(whole path)` sends `#`, `|`, `]]`, a trailing `]` or more than 255 characters to the markdown fallback. `encodeLinkTarget` keeps `/` and escapes the rest, the reader decodes it back, and the label is the basename through `defaultLabel`. This needs no code.

**5. Open Item 1 (`.md`): move the strip into `writtenPage` (`linkValue.ts:56-64`).** The title becomes `stripMarkdownExt(title)`, applied before its empty check.
- Remove the strip from `targetTitle` (`links.ts:68`) and drop that import.
- The url arm's page (`:86`) can never end in `.md`: `targetNamesFile` routes that case to the page arm. `targetNamesFile` stays, since it forces page-kind on a dotted `Notes.md` that `isValidLink` accepts.
- `names.ts:31` keeps page titles from ending in `.md`.
- The page half ends at `#`, so `[[File#Text.md]]` keeps heading `Text.md`.
- **`wikiTitle` keeps the extension:** it reads the slot directly, `const s = raw.trim(); const o = wholeLink(s); return o?.syntax === 'wiki' ? s.slice(...o.title).trim() || null : null`, so `[[Report.md]]` stays `Report.md` for all of its callers. Its doc names the reason: a file reference names a file. The only change is that `[[#H]]` returns null instead of `''`, which has no file meaning.
- Hot-path cost is one regex per wiki read.

**6. A-6: yes, a folder segment rides the existing fallback unchanged**, provided writers pass the whole path as `title` to `pageLinkText` (`connections.ts:161-175`). Its inputs are `spellsAsWiki` (`:139-142`), `encodeLinkTarget` (`links.ts:42-52`) and the default label (`:169`, made a basename through `defaultLabel`).

###### 3. Additions and Removals (Production, Rough)

**Additions:**

| What | Where | Lines | Buys |
| --- | --- | --- | --- |
| `place` field + path branch of `entriesOf` | `pageIndex.ts` | +6 | A-4, B-3 |
| `pathTails(path): string[]` (title first, full path last) | `Core/Paths/posix.ts` beside `titleFromPath` | +4 | Query keys; E-2's tail at written depth; `resolvedTarget` keep-form; the Written Name (`[0]` or the full path) |
| Wrappers take a name list and union | `contentIndex.ts` | +3 | Per-tail queries |
| `wikiTitle` slot read | `linkValue.ts` | +2 | A-8 under the `.md` rule |
| Span title-start helper + 3 draw sites | `connections.ts` | +5 | B-1 |
| `linkDisplayText` basename | `linkValue.ts` | +1 | Sort and filter by title |
| `basename` imports | — | about +2 | — |

**Removals:**
- `namesPage`'s `/` clause (−1)
- `targetTitle`'s strip and its import (−1)
- `cascade.ts:96-99`'s union (−3)

**Changed in place, no net lines:**
- `writtenPage` strip
- `defaultLabel`, `repeatsTarget` and `carry` basename
- `indexSeed.ts:42` `own`
- `INDEX_GENERATION` 15 → 17

**Net:** about +23 / −5.

###### 4. What Becomes False

**Docs:**
- `ConnectionsPM.md`: `:8` ("every title"), `:10` ("resolves by its title"), `:11` (the path-separator / last-segment sentence), `:16`, `:18`, `:20` ("holds the title"), `:78` (Duplicate disambiguation is done; remove it).
- `CorePM.md:108` ("which pages relate to which titles").
- `PagesPM.md:14` ("a connection to a shared title resolves as ambiguous" now needs the path form).
- `PropertiesPM.md:82` ("a title two pages share is refused"; writers' lane).

**Comments:**
- `links.ts:37` (`namesPage`) and `:63`.
- `connections.ts:128` (`PageName`), `:144` (`repeatsTarget`, "draws the same", now against the basename).
- `linkValue.ts:131` (`wikiTitle`); `:158` and `:180` ("by title"; writers' lane).
- `pageIndex.ts:27-28` (parameter names `rawTitle`).
- `Core/Platform/stores.ts:60-61` (`normalizedTitle` → key).
- `contentIndex.ts:65-74`.

**Tests:**
- `links.test.ts:85,92` (`targetTitle` no longer strips `.md`; move the assertions to `readLinkText`) and `:97` (`example.com/Notes` is no longer null).
- `edits.test.ts:813` (`[a](dir/Page)` now turns `§` into `#`, correctly).
- `indexSeed.test.ts:164` (`'a'` becomes `'notes/a'`).
- About 36 mechanical wrapper calls → lists: `contentIndex.test.ts` (12), `indexSeed.test.ts` (12), `indexMaintenance.test.ts` (9), `cascade.test.ts` (3). `storesContract.ts` and the `Desktop/Store` tests are untouched.
- No test pins wiki path links or wiki `.md`.

**New test cases:** exact-path precedence over a tail, a unique tail, an ambiguous tail, case twins (B-3), `./x` and `/x` as phantom, wiki `.md` read, `wikiTitle('[[Report.md]]')`, and a markdown path row in the scan.

###### 5. STOP

None. The Decisions' Context ("markdown reads `.md`, wikilinks don't"; `namesPage` refusing `/`; the wiki slot admitting `/` but resolving as a title) and its Sources all match HEAD. There are two questions for Nathan, neither a contradiction: the reading of a leading `/` (§3), and whether "relative paths aren't read" means phantom or not a link at all (§4).

###### 6. Beyond the Lane

- **The re-spell and outside lanes need `HeadingRenameSeen.path`.** `indexSeed.ts:94-98` carries only `title`, so `cascadeSeen` (`fileEvents.ts:297-306`) can't form per-tail queries. `indexWrittenPage` has the rel in hand.
- **Trash:** `deleteCascade(root, abs, titles)` (`cascade.ts:82-90`) and `frozenWorld`'s `arriving` set of titles (`heldPages.ts:47-52`) are keyed by title. `frozen.holds(link.title)` becomes path-aware for free through `holders`.
- **Embeds bypass the reader.** `embedWidget.tsx:397` resolves the raw `loneEmbedTitle` text (`detect.ts:414-416`), so `![[A/Notes]]` tiles once `resolve` reads paths, but `![[A/Notes.md]]` won't. Routing `e.title` through `readOccurrence` would make it one rule.
- **Writers:** `resolvedTarget` (`linkValue.ts:170`) and `LinkCell.tsx:46` write `target.page.title` and drop the folder. Keep-form there is `pathTails(page.path)[depth − 1]`.
- **Drawing:** `[[Notes.md]]` draws `Notes.md` from its span while sort and filter read `Notes`. Whether B-1 also hides `.md` is the drawing scout's call.
- **Re-spell and Trash:** `rename.ts:37-42`'s skip when another page holds the title, and the gone filter at `cascade.ts:90`, both remain.

---

### Round 4 — Writers, the Picker, and Drawing

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; a "Nexus" is a user folder of Markdown pages; MarkdownPM is its CodeMirror 6 editor). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152` (a parallel session just reverted `§` as a link heading opener; `#` is the only opener again).

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **A-2, A-3, A-6, A-7, B-1, B-4, C-5, C-6**, with A-9's display rule (`Page § Heading`).
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: earlier scouts' reports. Read *§Mechanism Forks* (top), *Round 1 — Writers and the Picker* (lines 255-499), *Round 2 — Read, Draw, and Pick Reuse* (1240-1437). Each carries a SUPERSEDED note; the Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: Every Writer, the Picker, and Drawing
Map at HEAD every place Pommora writes a page link's target: `pageLinkText`, `resolvedTarget`, `retarget`, `keepsShown` (in `Core/Connections/`), the connection picker and its model (`Core/MarkdownPM/Autocomplete/`), Copy Link, Paste As, Show Full Link, a Link property field's commit, table cells, markdown tiles, and any other writer you find. Then map how a link draws: brackets and alias hiding, the Ambiguous and Phantom states, in the page body (`Core/MarkdownPM/Links/`), resting table cells (`Core/MarkdownPM/Tables/cellStatic.tsx`), and Link/Text property values (`Core/Properties/`).

Settle with evidence:
1. **The Written Name (A-2, A-3):** the title while a page is its title's sole holder, otherwise the full Nexus-root path without `.md`. Where should that one rule live so every writer above reaches it, and what does each writer need to call? Is there one function today that every writer already funnels through?
2. **A-7 (nothing shortens):** which writers today re-derive or normalize a link's form (paste, Paste As, Link field commit, Show Full Link, cascades)? Each must keep a written path link as written.
3. **B-4 (ambiguous via the picker):** the picker lists every holder of a shared title today; what must change so a pick writes the full path, and so rows tell the holders apart (location shown)? Name what exists for showing a page's location in a row.
4. **C-5:** today a title pick drops the written heading; find that drop and the cheapest way to keep `#Heading` where the picked page holds it (what heading data is already at hand in the picker).
5. **B-1:** a path link draws its title only, the folder path hiding with the brackets and revealing with the caret. Find the existing hide/reveal machinery for brackets in each surface and say whether the folder span can join it with no new mechanism, and where the basename split must be read.
6. **A-6:** a written name whose folder holds a character wikilinks can't spell falls back to markdown form whole; find today's fallback for an unspellable title and confirm it can carry the folder.

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition; the merges count.

###### Report (dense, file:line at HEAD throughout)
1. The verified chain, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item, with the alternatives weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

Other scouts cover the grammar/resolver/index key (they'll decide whether `LinkOccurrence.title` keeps the whole page half including folders; assume it does unless you find a reason it shouldn't), search, the click rule, re-spelling, and the Trash. Stay in your lane but name the interfaces you need from them.

#### Report

##### Path Links Scout: Writers, the Picker, and Drawing (Read-Only, HEAD `14da3f152`)

I edited nothing. I ran no app, so every claim below comes from reading the code. All paths are relative to the repo root.

###### 1. The Chain as It Stands at HEAD (and Drifted Citations)

**Every page-link writer.** All of them reach `pageLinkText` (`Core/Connections/connections.ts:161-175`) or `pageEmbedText` (`:177`). No hand-spelled `[[${…}]]` page template exists anywhere else; `linkValue.ts:53` is only a YAML unwrap.

| # | Writer | Site | What it holds when writing | What it writes today |
|---|---|---|---|---|
| W1 | Picker title pick (page body, cell, tiles, Text pane, one-line field) | `autocomplete.ts:172-180` → `whole()` :160-167 | `row.value = p.title` (`pageRow` :104-109); the row also carries `pageId` | Bare title; the written heading is dropped |
| W2 | Picker chevron (opens the heading slot) | same path, with `openHeading` | same | Bare title with `#` |
| W3 | Picker's Remove Title check for the next target | `useConnectionAutocomplete.ts:134-149` (`title: row.value` at :144) | title | Bare title, so a shared title reads Ambiguous and `sameTarget` fails |
| W4 | Picker heading pick | `autocomplete.ts:181-203` | `ac.title`, the written page half (:99) | Keeps the written path. Already correct |
| W5 | Paste over a link, Paste As Connection/Markdown | `pasteLink.ts:54,72`, `pasteAsMenu.ts:59,98` → `resolvedTarget` | `ResolvedLink.page` | Collapses to `target.page.title` at `linkValue.ts:170` |
| W6 | Paste As Embedded Page | `pasteAsMenu.ts:100` `pageEmbedText(target.title)` | via W5 | Fixed by W5 |
| W7 | Link field commit | `parseEditorValue.ts:41` → `linkValueFromEdit` `linkValue.ts:191` → `resolvedTarget` + `retarget('wiki')` | via W5 | Fixed by W5. The `retarget('wiki')` syntax normalization is a documented rule, not an A-7 violation |
| W8 | Copy Link (sidebar, tabs, nav list, window strip, views, link menu) | `Core/Interface/Menus/pageMenuActions.ts:53-54` | `{id, path, title?}` | Bare title |
| W9 | Heading grip's Copy Link | `Core/MarkdownPM/Menus/gripMenu.ts:78,91-94` | `host.pageTitle()`, a string only (`api.ts:204-205`, `Core/Pages/editorHost.tsx:145`) | Bare title |
| W10 | Embed Source pick | `editorHost.tsx:136-139` picks `p.title`, then `gripMenu.ts:140-146` `pageEmbedText(title)` | title only | Bare title |
| W11 | Show Full Link (display only, no write) | `Core/Properties/Cells/LinkCell.tsx:44-47` | `target.page` | `pageLinkText({title: target.page.title})`, so a path link re-draws Ambiguous |
| W12 | Settle label fill | `linkSettle.ts:118-123` → `pageLabel` → `defaultLabel` | written name | Full name once the name holds a path |
| W13 | Rename cascade follower (the re-spell scout's lane) | `rewrite.ts:45-75`; in-place title edit :59-61, fallback :57-58 | old and new title strings | Replaces the whole page half with a bare title |

**The picker.**
- Rows already show where each page lives. `pageRow` → `host.location(p.id)` (`editorHost.tsx:140-143`, `nodesByIdOf(tree).get(id)?.parents`) feeds `<NavTrail>` as the row's subLabel (`AutocompletePane.tsx:100-106`).
- The heading list resolves its page with `index.resolve(ac.title)` (`useConnectionAutocomplete.ts:81-91`), reading `headingsOf(path)` from `pageConnections.ts:31`.
- `candidates` (`pageIndex.ts:54-67`) matches title prefixes only.
- A query closes on an exact match at `useConnectionAutocomplete.ts:118`.
- Every surface shares this one hook: `MarkdownEditor.tsx:124` (body and tiles via `PageTile`/`MarkdownTile`), `CellEditor.tsx:155`, `ValueEditor.tsx:59`.
- `pendingTitle.ts` only rewrites address labels, so it's not a page writer.

**Drawing.**
- **Body, live cell, value field, tiles:** `Core/MarkdownPM/decorations.ts` (it is not under `Engine/`).
  - Markdown branch :547-590. The destination sits in the trailing marker, hidden at rest and shown as `md-connection-target` when revealed. An empty label draws `LabelWidget(look.label)` at :555-559.
  - Wikilink branch :591-656. Markers come from `linkToken` (`Engine/tokens.ts:229-258`, content start at :245). At rest they hide through `hideMarker` (:653-654); revealed they wear `md-bracket`. A phantom's markers wear `md-phantom-syntax` (:634-646). Ambiguous takes the last branch, brackets hidden. The join (`Page § Heading`) reads `tk.link.title` at :594/:620.
- **Resting cells, TextCell, LinkCell's page arm:** `cellStatic.tsx:131-193`. Tokens are shared (`cellTokens = perText(tokenize)` :59). A resolved link draws `[cs,ce]` only. A phantom draws its markers verbatim. The join slices `tk.link.title` at :178.
- **Sort, filter, Remove Link prose:** `linkDisplayText` (`linkValue.ts:195-212`) and `shownProse`. Remove Link goes through `linkEdit.ts:43`.

**Drifted citations in *Scout Findings*.**
- `decorations.ts` lives at `Core/MarkdownPM/decorations.ts`.
- Round 1's ":563-570 wikilinks draw their title span" is actually the markdown branch's label mark.
- `targetSpan` reveal is at :606, not :605.
- `linkSettle.ts:121-126` is now :118-123, and `:123,146` are now :120,143.
- Round 2's `AutocompleteQuery.title` at `autocomplete.ts:95` is wrong; the field is at :38.
- Everything else I re-checked holds at HEAD. That covers the `pageIndex`, `linkValue`, `connections`, `links`, `gripMenu`, `editorHost`, `embedWidget:397,645-652`, `LinkCell:46`, `pasteLink:54`, `pasteAsMenu:59,100`, `Desktop/Actions/editorMenu.ts:117-122`, `headingRenameSettle:51` and `editorHarness:135` citations.
- Pages live only inside Collections (`record.ts:40-44`), so a full path always holds at least one `/`.

###### 2. Recommendations

###### Q1: Where the Written Name Rule Lives (A-2, A-3)

**No single function holds the page today.** `pageLinkText` is the one funnel for link text, but it takes a name, not a page, and it has to keep taking names: the A-7 writers (W5, W7, W11, W13) must write the name as it was written. Pushing the rule into `pageLinkText` would mean passing a page and the index, which breaks those writers.

The one structure that knows how many pages hold a title is `PageIndex`. It's memoized per tree in both processes: the renderer gets it through `pageConnections.ts:30` and the host through `heldPages.ts:41,48` and `pageIndexOf`.

**Recommended:** add one method to `PageIndex`, `writtenName(page: ConnPage): string`, which returns the title while the page is the title's only holder, else `stripMarkdownExt(page.path)`. It's about 2 lines in `pageIndex.ts:26-30,46`.

Only writers that name a page themselves call it:
- **Picker (W1, W2, W3):** `conn.index.writtenName(row.page)`.
- **Copy Link (W8):** `pageIndexOf(s.tree).writtenName(...)`.
- **Grip Copy Link (W9):** through the host's page and `host.connections()?.index`.
- **Embed pick tree (W10):** `pagePickTree(tree, icons, p => pageIndexOf(tree).writtenName(p))` at `editorHost.tsx:138`.
- **The collision re-spell (E-3):** the re-spell scout's, on the host.

**Rejected alternatives:**
- A `folder` field on `PageName`. It needs about 8 places that join folder and title back together, and `wikiTitle` (File values, A-8) would then read `[[A/x.png]]` as `x.png`.
- A `linkTo(page, heading)` wrapper. Only two sites would use it.

###### Q2: A-7, Nothing Shortens

The writers that re-derive a link's name today:
- **`resolvedTarget` (`linkValue.ts:170`):** covers W5, W6 and W7.
- **LinkCell Show Full Link (W11).**
- **The cascade follower (W13):** this is the re-spell scout's to fix. Under whole-half title spans, `rewrite.ts:59-61` replaces the whole page half with `value`.

**Fix:** `resolvedTarget` writes the page's own path tail at the depth it was written: `title: named.title === '' ? '' : pathTail(target.page, named.title.split('/').length)`.
- At depth 1 this is exactly today's case correction, so `linkValue.test.ts:409-435` stays true.
- It is the same rule as E-2. One helper should serve both `resolvedTarget` and the re-spell, owned once.
- `writtenName` can be written on top of it: `pathTail(p, sole ? 1 : Infinity)`.

**LinkCell:** build Show Full Link from `resolvedTarget(written, api?.index, holder)` with `shown` dropped, rather than re-deriving the name by hand. That keeps the written depth and fixes today's bug where a shared holder draws Ambiguous.

Writers I checked that already keep the written form:
- A plain paste of a page link: `pasteAsWrite` returns null for `auto`, so it lands as typed.
- The heading pick (W4).
- The link settle.
- `rewriteHeadingConnections`.

###### Q3: B-4, Ambiguous Links Resolve Through the Picker

**Telling holders apart needs nothing new.** Every page row already carries its location (`pageRow` → `host.location` → `NavTrail`, `AutocompletePane.tsx:100-106`).

**What must change is what a pick writes:**
- In the page arm of `AcRow` (`autocomplete.ts:43`), replace `pageId: string` with `page: ConnPage`. The row's `value` stays the title for drawing.
  - `pageRow` (:104-109) passes `p`.
  - The Pane key becomes `row.page.id` (`AutocompletePane.tsx:96`).
  - `commit` reads `row.page.id` (`useConnectionAutocomplete.ts:152`).
- `commit` passes `conn.index.writtenName(row.page)` to `commitEdit` (:162) and to the Remove Title check's next target (:144).

The second half fixes a live bug: re-picking the same twin drops its alias under Remove Title, because `sameTarget` can't match an Ambiguous next target.

###### Q4: C-5, Keeping the Heading on a Title Pick

**The drop:** `autocomplete.ts:179` rewrites the whole link (`ac.start..ac.end`) with `heading: open === 'heading' ? '' : undefined`. A title-part query doesn't carry the written heading (:99 only adds `title` for the other parts).

**Cheapest fix:**
- At `autocomplete.ts:99`, read `namedPage(readOccurrence(line, o))` once. A title-part query then also carries `heading` (a new `heading?: string` on `AutocompleteQuery`, :38).
- `commitEdit` takes the heading decision as an option, `opts.heading`, and writes `heading: open === 'heading' ? '' : opts.heading`. Its `asMarkdown` check (:176) should include that heading.
- `commit` decides with the existing test `headingMissing(conn, { kind: 'page', page: row.page, heading: ac.heading }, undefined)` from `connectionsApi.ts:25-33`. Export it; don't add another check.
- Pass the kept heading into the Remove Title check's next target too, so `sameTarget` (`linkValue.ts:244-252`) compares headings correctly.

**One small deviation to accept knowingly:** `headingMissing` treats a page whose headings aren't indexed as holding every heading. So a pick keeps `#H` when that page's headings are unknown, where C-5 says to drop a heading the page doesn't hold. That matches how the draw already decides a heading is missing.

No test pins today's drop.

###### Q5: B-1, Drawing the Title Only

**The folder can join the existing bracket hiding with no new mechanism.**
- `linkToken` (`tokens.ts:229`) starts a wikilink's content at the title's offset (:245). Move that start to just past the last `/` in `o.title`, and the folder becomes part of the leading marker.
  - It then hides at rest (`decorations.ts:653-654`), reveals with the caret, and shows as phantom syntax.
  - Resting cells take it for free through the shared tokens, and `linkSpan`'s click mapping from `cs` stays correct.
  - `linkToken` needs `text`. The call at :278 becomes `.map((o) => linkToken(text, o))`, and the split is a bounded `lastIndexOf` with no allocation.
- Markdown links already hide the folder inside the destination.

**The split applies to the page-title argument only, never to shown text or a heading** (headings can hold `/`). It lives in one helper in `connections.ts`, `titleStart(name, from = 0, to = name.length): number` (the offset just past the last `/`, clamped to `from`). String callers slice with it. It's read in:
1. `linkToken` (offset).
2. `defaultLabel` (`links.ts:35`, the title only, never the heading). This covers `pageLabel`, the settle fill, `LabelWidget`, `pageLinkText`'s default label, and the markdown fallback.
3. `linkDisplayText`'s wiki arm (`linkValue.ts:201-202`). This covers sort, filter, Remove Link prose, and A-9's `Title § Heading`.
4. `repeatsTarget`'s `title` argument (`connections.ts:145`). This covers `pageLinkText`'s pipe drop, `keepsAlias`, `namesTarget`, and the follower's drop at `rewrite.ts:64`.
   - To be safe, `namesTarget:156` must stop passing a heading in the title slot (`repeatsTarget(shown, t.heading)` becomes a direct normalized compare). That's the one site that enforces "never a heading".
5. `carry` 'title' and 'both' (`rewrite.ts:34,38`), owned by the re-spell scout.

**The joins don't need the split.** A join only happens on unaliased links, so both sites use the content start: `decorations.ts:594` becomes `[tk.contentRange[0], tk.link.title[1]]`, and `cellStatic.tsx:178` becomes `text.slice(cs, tk.link.title[1])`.

**Display Unresolved Links As Plain Syntax:** a phantom's markers, now including the folder, already get `md-phantom-syntax`, styled by `markdown-pm.css:251-263`. No change.

###### Q6: A-6, Unspellable Folders Fall Back to Markdown

**Today's fallback:** `pageLinkText:166` takes the markdown form when `!spellsAsWiki(t)`. `expressibleInLink(title)` already tests the whole written name (`|`, `#`, `]]`, trailing `]`), and `encodeLinkTarget` (`links.ts:42-52`, `encodeURI`) leaves `/` alone and escapes `#`→`%23`, `|`, `]`. So the folder rides into the fallback with no writer change. The picker's `asMarkdown` (`autocomplete.ts:176`) and the follower's fallback (`rewrite.ts:57-58`) behave the same.
- In-app folder names refuse `|#§.` but allow `]]` (`names.ts:28,32`), so an in-app folder can trigger this too.
- The label needs the basename, which `defaultLabel` provides (item 2 above).

**Dependency:** that fallback can't be read back until `namesPage` (`links.ts:38`) admits `/`, so the writers can't land before the grammar scout's reader.

**Embeds have no fallback:** an unspellable path embed is filtered out (`embedPickTree` `gripMenu.ts:29`, `embeddableTarget` `pasteAsMenu.ts:46`), not re-spelled.

###### Also Needed: Embed Exclusions

Today they're keyed by title (`embedExclusions` `embedWidget.tsx:645-652`, `embedPickTree` `gripMenu.ts:23-30`), so a twin hides its twin. Once picks write paths, a page could also offer itself to embed.
- Key them by page path instead. `embedExclusions` returns `t.path` and `host.ancestors`, both already paths, which drops `titleFromPath`/`normalizeTitle`.
- `embedPickTree` takes the index and excludes `index.resolve(n.pick).page?.path`. That's an O(1) lookup per leaf, only when the menu opens.

###### Also Needed: `EditorHost.pageTitle()` Becomes `page(): ConnPage | null`

- Change it in `api.ts:204-205`, `editorHost.tsx:145` (`pageOf(pageId)`) and `editorHarness.ts:27,135`.
- The grip uses the page for `writtenName`. `headingRenameSettle.ts:51` uses `.title`, and E-7 needs the page's identity anyway.
- The two Copy Links (W8, W9) stay two one-line call sites. `MarkdownPM` can't import `Interface`, so they can't merge.

###### 3. What's Added and Removed

**Added (about +22 production lines):**
- `PageIndex.writtenName` (+2): one Written Name rule for both processes.
- `pathTail` (+2): A-7 depth in `resolvedTarget`. Shared with E-2, so count it once.
- `titleStart` (+2): one basename split for six readers.
- `linkToken` text parameter and split (+2): B-1.
- `AutocompleteQuery.heading`, query read, `opts.heading`, keep decision (+6): C-5.
- `writtenName` at picker commit (+2): A-3, B-4.
- Copy Link (+1), grip (+2), embed pick tree (+1), `embedPickTree` index parameter (+1).
- Export `headingMissing` (0).

**Changed in place, about net 0:** `defaultLabel`, `repeatsTarget`, `namesTarget:156`, `linkDisplayText`, the two joins, `resolvedTarget`, the `AcRow` page arm, `pageTitle`→`page`.

**Removed (about −4):**
- LinkCell's hand re-derivation of the link.
- The title keying in `embedExclusions` (`titleFromPath`, `normalizeTitle` imports).
- `pageTitle` as a separate kind of identity.

**Net: about +18**, not counting the re-spell scout's `carry`.

###### 4. What the Change Makes False

**Feature docs:**
- `ConnectionsPM.md:10`: titles hide with the markers. Add the folder, and `[[Title]]` "resolves by its title".
- `ConnectionsPM.md:19`: "muted and inert until one side is renamed". The picker now resolves it (B-4).
- `ConnectionsPM.md:34`: rendering needs the path link drawing its title only.
- `ConnectionsPM.md:51`: Copy Link copies the page's written name.
- `ConnectionsPM.md:60`: a title pick now keeps the heading.
- `ConnectionsPM.md:78`: the "Duplicate disambiguation" prospect has landed; remove it.
- `InterfacePM.md:42`: "Copy Link (`[[Title]]`)".
- `PagesPM.md:14`: "a connection to a shared title resolves as ambiguous".
- `MarkdownPM.md:118`: Source ▸ writes the written name.

**Comments:**
- `connections.ts:128` (`PageName` "named by title") and `:144` (`repeatsTarget`).
- `linkValue.ts:158` and `:180` ("by that page's own title" / "by title") and `:194` ("a wikilink's title").
- `tokens.ts:242` (the leading marker also swallows the folder).
- `api.ts:204`.
- `embedWidget.tsx:648` (the "page ranges only" reason no longer applies under path keying).
- `useConnectionAutocomplete.ts:110` if the close rule changes.

**Tests:**
- `gripMenu.test.ts:45-56` (`embedPickTree` signature and keys).
- `embedWidget.test.ts:117,132,136` (keys become paths).
- `gripMenuFlow.test.tsx:241`, `bodyMount.test.tsx:52`, `editorHarness.ts` (`pageTitle` spec).
- `linkValue.test.ts:409-435` stays true but needs path cases.
- Picker tests (`connectionCommit.test.tsx`, `autocomplete.test.ts`) have no duplicates, partial paths, or title picks with a heading; these need new cases rather than corrections.

###### 5. STOP

Nothing in my lane contradicts the Decisions doc. Three tensions to put to Nathan as questions:
- **Show Full Link:** under B-1 a path link's "full link" draws its title with the folder hidden, which may not be what "full" means for a page.
- **Bare heading in Show Full Link:** switching to `resolvedTarget` shows `[[#H]]` rather than today's `[[Holder#H]]`. That's more correct (today a shared holder draws Ambiguous), but it's a visible change.
- **C-5 with unindexed headings:** as above, a heading is kept when the picked page's headings aren't indexed yet.

###### 6. Beyond My Lane

**Interfaces I need from other scouts:**
- **Resolver:**
  - `holders(page.title)` must still return every page holding a bare title (`writtenName` relies on it).
  - `resolve(stripMarkdownExt(page.path))` must return that page (A-4's full path wins).
  - `index.resolve` must read a path at `useConnectionAutocomplete.ts:82` and `embedWidget.tsx:397`.
  - `namesPage` must admit `/`.
- **Re-spell:** one owner for `pathTail`/E-2. `carry` must split the title. The follower's in-place edit at `rewrite.ts:59-61` must write the re-spelled name. E-7 uses `EditorHost.page()`.
- **Search:**
  - Once `candidates` matches location, the exact-close at `useConnectionAutocomplete.ts:118` (row title vs query) fails on every finished path link, and the picker opens over it. Close the title part on `index.resolve(query).status === 'resolved'` instead (O(1)). An Ambiguous link then stays open by rule, which is what B-4 needs.
  - B-4 also needs every holder of a title to survive the fold's ranking and the 20-row cap.
- **Click rule:** the title slot is the whole page half (Edit Title at `linkEdit.ts:39-40` selects it, and the picker queries it).

**Concerns:**
- **Typing a path:** in `[[Studio/Pom`, the folder sits in the marker and shows in the bracket color, not the typing color. A just-typed `[[Studio/`, with nothing after the slash yet, has empty content, so it falls into the `[[#]]` dim branch (`decorations.ts:598-602`). The cheap fix is to split only when a title follows the slash, or to mark from the title's start while typing. This should be a ruled visual call.
- **Revealed folder style:** an unaliased link reveals its folder in bracket style, while an aliased one reveals the whole target as `md-connection-target`.
- **Obsidian interop:** a basename-aware `repeatsTarget` means Pommora's writers drop `|Notes` from `[[A/Notes|Notes]]`. Obsidian would then show `A/Notes`, which is what Obsidian's own writer produces anyway, but it's worth ratifying.

---

### Round 4 — One Search Matcher

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; a "Nexus" is a user folder of Markdown pages). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152`.

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **D-1 through D-6**, and C-6 (location matching lands before the click rule).
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: *Round 3 — Every Search Matcher* (lines 1438-1618) is your predecessor's full map; also skim *Round 2 — Read, Draw, and Pick Reuse* (1240-1437) for the picker's prefix search. The Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: One Matcher for Every Search
Re-verify at HEAD every search the app has and how each matches, orders, and highlights: `Core/Paths/caseFold.ts` (`matchScore`, `rankMatches`, the fold), `Core/Navigation/navSearch.ts` (`filterNav`), the Trash's `filterRows` (`Core/Settings/TrashFrame.tsx`), `LocationField` (`narrowed`), a view's search (`Core/Views/Pipeline/search.ts`), the block menu (`blockMenu.ts`), the picker's pages/headings/aliases (`PageIndex.candidates` prefix match in `Core/Connections/pageIndex.ts`, and the Autocomplete model), the alias list's filter, and every highlight renderer. Confirm icon search's matcher and that it stays out (D-3), and that a view's filter rules (contains/starts with/is) aren't searches (D-5).

Design, with evidence:
1. **The one matcher (D-4):** it owns the match test, the query fold, and the location key, nothing else. It scores an item by its name or its full location including its name, the better of the two, with a typed `/` read as a word break, so `Pommora/Cl` finds `Studio/Pommora/ClaudeMD` and a plain title query ranks exactly as today. Propose its exact signature, where it lives (likely `caseFold.ts`, which already owns `matchScore`), and what each surface passes.
2. **Each surface keeps its own order:** ranked lists rank by score; a view, a heading outline, a folder tree, the block menu, and the alias list keep native order. For each surface, the exact call it makes after the fold, and what of its own code it deletes.
3. **The picker:** replacing `PageIndex.candidates`' prefix match with the matcher. What does the picker's scale demand (a Nexus may hold 50k pages; the matcher runs per keystroke)? The project forbids O(N) allocating work on a high-frequency trigger where an incremental or cached path works; say honestly whether a per-keystroke fuzzy scan over all titles is acceptable here, what the sidebar search does today at the same scale, and what the cheapest honest answer is.
4. **D-6 (highlighting dropped everywhere):** inventory every highlight path to delete (functions, CSS, props, tests), and confirm the alias list's filtering state still disables drag after the highlight goes. Keep it separable so a reversal leaves the matcher untouched.
5. **D-2:** the block menu joins while keeping its sections.

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition; the merges count, and this fold is expected to be net-negative.

###### Report (dense, file:line at HEAD throughout)
1. The verified map, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item, with alternatives weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines, removals and additions apart.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

#### Report

##### Path Links Search Lane (D-1 to D-6, C-6): Scout Report

I made no edits. HEAD is `14da3f152`.

###### 1. The Verified Map

| Surface | Matches against | How (HEAD) | Order | Highlight | Cap / Trigger |
|---|---|---|---|---|---|
| Sidebar `filterNav` `Core/Navigation/navSearch.ts:12-15`, entries `Core/Nexus/treeIndex.ts:146-170` | title, folded once into `folded` (`:162`) | `matchScore` fuzzy | `rankMatches` | none | 50, per keystroke (`useNavData.ts:37-46`); empty query returns `[]` |
| Trash `filterRows` `Core/Settings/TrashFrame.tsx:51-58` | title, or crumbs joined by `' '` | fuzzy, better of the two (`:55-57`) | `rankMatches` | none | no cap; memo on `[rows, query]` at `:99`; folds every row on every keystroke |
| Picker titles `PageIndex.candidates` `Core/Connections/pageIndex.ts:54-67` | title | `startsWith` prefix (`:60`) | exact, then shortest, then A–Z (`:61-64`) over a lazy alphabetical copy (`:43,55`) | `emphasizeMatch(row.value, 0, matchLen)` `AutocompletePane.tsx:126` | `AC_MAX` 20 (`autocomplete.ts:210`); memo `useConnectionAutocomplete.ts:111-121` |
| Picker headings `headingRows` `autocomplete.ts:111-122` | heading text | prefix (`:117`), deduped | outline order | `AutocompletePane.tsx:135` | none |
| Picker aliases `aliasRows` `autocomplete.ts:139-150` | the page's aliases | prefix (`:148`) | remembered order | `AliasList.tsx:176` | none |
| Block menu `filterBlockMenu` `Core/Actions/blockMenu.ts:85-106` | label, or section title (a matching section keeps every row) | `toLowerCase().indexOf`, no NFC | section order | `BlockMenuPane.tsx:47` via `row.at` | fixed N of 22; runs on doc change only (`blockQuery.ts:36,42`) |
| `LocationField` `narrowed` `Core/Views/Settings/LocationField.tsx:22-32` | folder title | `matchScore(foldKey(n.title))` (`:28`) | tree order; a match keeps its subtree | none | per keystroke (`:106-110`) |
| View search `searchGroups` `Core/Views/Pipeline/search.ts:4-14` | row title, map built at `useViewHost.ts:90-92` | `matchScore !== null` | the view's own order | none | per keystroke; `needle` at `useViewHost.ts:54` |
| Icon search `searchIcons` `UIX/Symbols/allSymbols.ts:40-56`, `tier` `:30-37` | id, tags, tag words | five tiers: exact, prefix, substring, exact tag, tag-word prefix | tier, then id | none | out of scope (D-3); UIX can't import `Core/Paths` anyway |
| View filter rules `Core/Views/Pipeline/filter.ts:258-279` | cell values | named `contains` / `startsWith` / `is` operators | n/a | n/a | not a search (D-5); stays exact |

Nothing else searches. The only other `SearchField` mounts are Trash, NavBase, DetailTitleHeader (the view search) and IconPicker.

**Verified, not just carried over:** caret moves don't rerun the picker. `sameQuery` (`acQuery.ts:17-28`, applied at `:64-65`) keeps the query object's identity, and the listener bails at `useConnectionAutocomplete.ts:60`. Index builds are keyed on `tree.collections` (`entityMemo`, `Core/Nexus/tree.ts:131-147`), so the host builds a `PageIndex` on every content change (`heldPages.ts:41,48`) and never opens a picker.

**Where the Scout Findings drifted:**
- **Round 2:** it puts `pageConnections.ts:30` in `Core/Connections`; the file is `Core/Session/pageConnections.ts:30`.
- **Round 3, view search memo:** cited as `useViewHost.ts:89-92`; it's `:90-92`.
- **Round 3, query-fold count:** it says seven sites fold the query; it's eight lines (`navSearch.ts:13`, `TrashFrame.tsx:52`, `LocationField.tsx:106`, `useViewHost.ts:54`, `pageIndex.ts:56`, `autocomplete.ts:112,145`, `blockMenu.ts:94`).
- **Round 3, `AliasList`'s `match`:** it lists two uses (`:56,127`). There's a third, the pending-pick timer's effect deps at `:64`.
- **Round 3's proposed name `searchKey`** collides with a private `searchKey` in `UIX/Symbols/allSymbols.ts:20`, which strips spaces and hyphens. Two different `searchKey`s would break One Way.
- **Round 3 says `MarkdownPM.md:142` stays true.** The `/hea` behavior does, but the doc says "the five headings" and HEAD has six (`blockMenu.test.ts:57`). The doc was already wrong before this work.

###### 2. Recommended Approach

###### 2.1 The One Matcher (D-4)
It lives in `Core/Paths/caseFold.ts`, which already owns `matchScore` and `rankMatches`. Rather than adding a third name, I'd change `matchScore` in place to take a key; its current string body (`:28-46`) becomes the private `scoreIn(t, q)`.

```ts
export interface MatchKey { name: string; location: string }
const searchFold = (text: string): string => foldKey(text).replaceAll('/', ' ')
export const matchKey = (name: string, place = ''): MatchKey  // location = fold(place) + ' ' + fold(name), or name when no place
export const matchQuery = (raw: string): string                // searchFold(raw.trim())
export function matchScore(key: MatchKey, q: string): number | null {
  const location = scoreIn(key.location, q)
  if (location === null || key.location === key.name) return location
  return Math.max(location, scoreIn(key.name, q) ?? location)
}
```

- **One rule for location misses:** the location ends in the name, so anything the location misses, the name misses too.
- **How `/` is handled:** `/` folds to a space in both the key and the query. That reuses the existing word-start bonus at `:42`, so `Pommora/Cl` and `pommora cl` both find `Studio/Pommora/ClaudeMD`. Titles can't hold `/`, so title matching doesn't change.
- **Empty query:** `scoreIn(t, '')` is not null, so filter-only surfaces need no empty-query branch.

**Alternatives I rejected:**
- **One joined key:** `matchScore` is greedy, so a title query against the joined path scores low ("notes" vs "Journal/Notes" is 27.95 by name, 13.87 by path).
- **A scorer closure `searchFor(q)`:** it breaks string memo deps like `needle` and reshapes every call site.
- **Round 3's `{name, path}` with `matchScore` made private:** that's a third name beside a near-duplicate.

**What each surface passes as `place`:**
- **Sidebar:** the parent titles joined by `/`.
- **Trash:** the crumb titles.
- **Picker:** `relDirname(p.path)`.
- **`LocationField`:** the walk's ancestors.
- **View:** the Set chain below the view's source (see the ratification note in §5).
- **Block menu:** the section title.
- **Headings and aliases:** nothing.

###### 2.2 Each Surface After the Fold

| Surface | Call after the fold | What it deletes |
|---|---|---|
| Sidebar | `SearchEntry.folded` becomes `match: MatchKey`; `treeIndex.ts:162` becomes `match: matchKey(r.title, r.parents.map((p) => p.title).join('/'))`; `filterNav`: `const q = matchQuery(query); return q ? rankMatches(index, (e) => matchScore(e.match, q), 50) : []` | the `folded` field and its comment (`navSearch.ts:8-9`); the `foldKey` import (`treeIndex.ts:15`) |
| Trash | `const q = matchQuery(query); if (!q) return rows; return rankMatches(rows, (r) => matchScore(matchKey(r.title, r.crumbs.map((c) => c.title).join('/')), q))` | the three-way ternary and two folds (`:55-57`). Keys still build per keystroke, as today at small N. A `rows` memo would cost about +3 lines; I'd leave it out. |
| Picker | One lazy array replaces `alphabetical`: `searchable ??= pages.map((page) => ({ title: page.title, page, match: matchKey(page.title, relDirname(page.path)) })).sort(byTitle)`. Then `q ? rankMatches(searchable, (e) => matchScore(e.match, q), limit) : searchable.slice(0, limit)`, mapped to `.page`. It carries `title` because `rankMatches` needs one. | the `startsWith` filter and the sort chain (`:59-66`); the eager `entries` (`:34`) folds into the `byTitle` loop; the comment at `:33` |
| Headings | `matchScore(matchKey(h.text), q) === null` in place of `!key.startsWith(q)` (`:117`) | `startsWith`; outline order and dedupe stay |
| Aliases | `.filter((a) => matchScore(matchKey(a), q) !== null)` (`:148`) | `startsWith` |
| Block menu (D-2) | `sections.flatMap((s) => { const rows = s.rows.filter((r) => matchScore(matchKey(r.label, s.title), q) !== null); return rows.length ? [{ title: s.title, rows }] : [] })` | `matchAt` (`:85-88`) and the loop (`:90-106`). With D-6, also `BlockMenuRow` (`:21`) and `BlockMenuMatch` (`:23-26`); `BlockMenuSection` gets exported and `blockQuery.ts:3,24` retypes. Sections are kept: a query matching a section title matches every row's location. |
| `LocationField` | `walk(ns, place)` threads `place ? `${place}/${n.title}` : n.title`; the test becomes `matchScore(matchKey(n.title, place), query) !== null`; `:106` becomes `matchQuery(draft)` | per-node `foldKey`. `foldKey` stays for the Enter dedupe at `:126-127`. |
| View | `needle = matchQuery(query ?? '')`; the memo maps `r.id` to `matchKey(r.title, relDirname(r.path).slice(source.path.length + 1))`, with `source.path` added to the deps; `search.ts` takes `Map<string, MatchKey>` and calls `matchScore` | the title-only fold |

**The picker's close on a finished link (`useConnectionAutocomplete.ts:118`) has to change with the fold.** Today it closes when exactly one row matches. Under fuzzy matching `[[Notes]]` also lists "Footnotes" and every page whose location holds n-o-t-e-s, so the picker would open on every finished link.
- **Title part:** close when `conn.index.resolve(query).status === 'resolved'`. This needs A-4's path-aware resolver, which the dependency order already lands first.
- **Heading and alias parts:** close when exactly one row's folded value equals the folded query.
- `backedTo` (`:119`) stays.
- **Side effects:** this also fixes today's `Setup`/`Setup 2` heading case and the resolved `[[Notes]]` beside "Notes Archive", both of which open the picker today. Cost is about +3 lines, and the comment at `:110` gets rewritten.

###### 2.3 The Picker at Scale
- **Today's picker:** every keystroke filters all N titles (allocating the match array), sorts the matches (O(M log M); M approaches N on a one-letter query), then slices.
- **Today's sidebar:** already runs `matchScore` over every node, pages plus containers, on every keystroke at 50k.
- **After the fold:** the picker runs at most two `indexOf` passes per page. The name pass runs only on a location hit, and misses exit on the first absent letter. Ranking inserts into a list capped at 20. That's the sidebar's class, and cheaper than today's picker on broad queries.
- **Keys:** built lazily, once per index build, the way `alphabetical` is today. The host never pays for them.

Honest answer: a per-keystroke fuzzy scan over 50k pages is what the sidebar already does and what D-1 ratifies. Subsequence matching has no cheap incremental path. A survivor cache would have to hold every survivor (an O(N) array) and goes stale on backspace or a mid-query edit; path links don't earn that.

**The cheapest real win:** `rankMatches` allocates `{ item, score }` for every scored item before it checks the cap (`caseFold.ts:61-62`). That's up to 50k allocations per keystroke, and the sidebar pays it today. Comparing the score and title against `kept[cap - 1]` before allocating removes this at about zero line cost.

The plan should measure on `make-benchmark-nexus.mjs xlarge`.

###### 2.4 Dropping Highlighting (D-6)
This is its own task, and it should land before the matcher. Otherwise there's an interim where fuzzy rows bold the first N letters, and a location-only hit bolds nothing.

What it deletes:
- **`UIX/Menus/MenuRows.tsx:30-40`:** `emphasizeMatch`.
- **`UIX/Menus/index.ts:15`:** its export.
- **`UIX/Menus/menu-row.css.ts:156`:** `matchText`.
- **`AutocompletePane.tsx`:** the import at `:12`; `matchLen` at `:87`; `:126` becomes `{row.value}`; `:135` becomes `title={row.value}`; `:192` becomes `filtering={v.ac.query !== ''}`.
- **`BlockMenuPane.tsx`:** the import at `:7`; `:29`; `:47` becomes `{row.label}`.
- **`blockMenu.ts:21`:** `BlockMenuRow.at`, with its computation at `:100-101`.
- **`AliasList.tsx`:** the import at `:8`. The render prop at `:176` goes and `RenamableLabel` self-closes; its function-children form stays, since `DetailTitleHeader`, `TableView` and others use it.

**The alias drag gate:** `AliasList`'s `match: number` (`:41,48`) becomes `filtering: boolean`, keeping its three jobs:
- **Entrance gate:** `:56`.
- **Pending-pick timer deps:** `:64`.
- **Drag disable:** `:127`, `disabled: filtering || …`.

`AliasesRow.tsx:19` passes nothing, so the default `false` holds. One nuance: with a boolean, a keystroke that leaves the list unchanged no longer cancels a pending pick. That's harmless, since the clicked row still exists; passing the query string instead would keep today's behavior exactly.

**Reversibility:** the matcher returns only a score, so reversing D-6 means emphasizing in the renderer (prefix-only, where the folded label starts with the query) and leaves the matcher untouched.

###### 2.5 The Block Menu Joining (D-2)
Covered in the table above. One visible change: `/bl` now keeps Lists (Bullet, Numbered, Alphabetical), Insert (Blockquote, Code Block, Table) and Embed (both rows, through "emBed"), where today it keeps Insert alone. That's the fuzzy noise at a fixed N in native order. `/hea` still leaves only the headings, and `/link` and `/embed` match as today.

###### 3. Additions, Removals, Lines

**Additions, each with what it buys:**
- **`MatchKey`, `matchKey`, `matchQuery` (about +13):** the one location key and query fold.
- **The `matchScore` wrapper:** the one better-of-two rule, hoisted from the Trash. Its old body is renamed to `scoreIn`, so no new function.
- **The close rule (+3):** stops the picker reopening on finished links.
- **`place` threading in `LocationField` (+1).**
- **The `relDirname` import in `pageIndex.ts` (+1).**

Nothing else is new. Each surface's `title` and memo is reused.

**Removals:**
- `pageIndex.ts` filter, sort and eager `entries` (about −7).
- Trash ternary (−2).
- `navSearch.ts` field and comment (−1).
- `blockMenu.ts` `matchAt`, both row types and the loop (about −21).
- D-6: `emphasizeMatch` (−12), its export (−1), `matchText` (−2), `AutocompletePane` (−2), `AliasList` (−3), `BlockMenuPane` (−1).

**Rough count:**

| Part | Added | Removed |
|---|---|---|
| Matcher fold | about +19 | about −31 |
| D-6 | 0 | about −21 |
| **Total** | **about +19** | **about −52** |

Net is about **−33**.

###### 4. What the Change Makes False

**Docs:**
- `Features/ConnectionsPM.md:57`: "matched by title prefix".
- `Features/NavigationPM.md:12`: "title-based subsequence scan".
- `Features/ViewTypesPM.md:75`: "whose titles hold its letters in order".
- `Features/ViewTypesPM.md:66`: narrowing now reads location too.
- `Features/PommoraUIX.md:364`: the Match row goes.
- `Features/MarkdownPM.md:142`: "five headings" should read six; this one is already wrong today.

**Comments:**
- `pageIndex.ts:33,42`
- `navSearch.ts:8`
- `useConnectionAutocomplete.ts:110`
- `MenuRows.tsx:30` (deleted along with the function)

**Tests:**

*These break:*
- `treeIndex.test.ts:101`: `folded`.
- `treeIndex.test.ts:145`: `candidates('nes')` becomes `['p2','p1']`, because Alpha's location `notes alpha` holds n-e-s.
- `navSearch.test.ts:4,37`: `folded`.
- `caseFold.test.ts:2,5`: `scoreBy` calls `matchScore` on a raw string.
- `search.test.ts:9`: the titles map.
- `blockMenu.test.ts`: every `r.at` assertion (`:58,64-72,82-93,99-106,113`), and the `bl` set changes.
- `blockMenuFlow.test.tsx:6,55-56,225-239`: the emphasis tests are deleted.
- `connectionCommit.test.tsx:5,185`: it finds the held row by `matchText`, so it needs another selector.

*These pass, but their names now lie:*
- `pageIndex.test.ts:44,51`. The assertions still hold: Pro 14.97, Projects 14.92, Project Atlas 14.87, and none of those paths has a folder.
- `autocomplete.test.ts:536`: "by prefix".

*These pass as written:* `TrashFrame.test.tsx:27-53` and `aliasPicker.test.tsx:42-60`.

*Tests to add:*
- `Pommora/Cl` finds `Studio/Pommora/ClaudeMD`, and `/` matches the same as a space.
- The picker's close: a resolved partial path, and `[[Notes]]` beside "Footnotes".
- The alias list's filter disables drag. Nothing pins this today.

###### 5. STOP

Nothing in the recommended approach contradicts the Decisions doc outright. Two items need Nathan's ratification:

**A. The view search's location deviates from D-4's literal wording (STOP-lite).** D-4 says "its full location including its name". In a view, every row's full location starts with the collection's name. A view filters in native order with no ranking or cap, so any query that's a subsequence of that name matches every row: in "Projects", typing `pro` to find "Proposal" shows everything; in "Journal", `jo` does the same. I recommend the location below the view's source instead (the Set chain), which costs nothing extra.

**B. D-4's two clauses pull against each other at the picker's cap.** "Better of the two" and "a plain title query ranks as it does today" can't both hold exactly. For the query `pro`:

| Item | Matched by | Score |
|---|---|---|
| "Proposal" | name | 14.92 |
| "Alpha", inside a "Projects" folder | location only | 14.86 |
| "Prometheus Plan Document" | name | 14.76 |

So a "Projects" folder holding 20 or more short-named pages pushes long `Pro…` titles off the 20-row picker. "Ranks as today" holds only when no folder shares the query's prefix.

I recommend keeping better-of-two as written: it's the Trash's existing rule, and D-1 wants folder contents to show up. The alternative is name-first, where location-only hits always rank below name hits; that needs a tier in `rankMatches`' comparison, about +4 lines.

**Doc inconsistency:** BRIEF calls D-6 inferred, while Decisions tags it CONFIRMED.

###### 6. Beyond My Lane
- **Picker writes:** a pick writes `row.value`, which is the title (`pageRow`, `autocomplete.ts:104-109`; `commitEdit` at `:162`). The writer lane's written name has to reach `AcRow`, or a pick on a shared title writes it bare.
- **The close rule** depends on `resolve` reading partial paths (A-4), which fits C-6's ordering.
- **The `rankMatches` allocation fix** helps the sidebar today, whatever else lands.
- **The Trash** still folds every row's key on every keystroke. That's equal to today's cost and fine at its size.

---

### Round 4 — The Unresolved-Link Click Rule

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; MarkdownPM is its CodeMirror 6 editor, used for page bodies and live table cells and Text property values). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152`.

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **C-1 through C-6**.
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: *Round 3 — Unresolved Link Clicks* (lines 1619-1775) is your predecessor's full map. The Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: One Click Rule for Unresolved Links
Re-verify at HEAD every path a click on a link takes, on every surface: the page body and live editors (`Core/MarkdownPM/Links/linkClicks.ts` `onText`/`resolveFollow`, the pointer path), the link-slot seats (`Core/MarkdownPM/Links/linkEdit.ts`: the Rename and Edit Title/Edit Link actions) and their appliers (`applyLinkAction`, `applyAtRest` in `Core/MarkdownPM/Tables/cellStatic.tsx`), resting table cells, Text property values (`TextCell`) and their two-click path, Link property values (`Core/Properties/Pickers/ValueEditor.tsx`, its alias seat, its field opening caret-at-end), and the menus that offer Edit Link.

Design, with evidence:
1. **C-1/C-2:** a click on an unresolved link (phantom or ambiguous), in any syntax on any surface, seats the caret in its title, not its alias, so the picker opens on the title; one rule merging today's separate click-and-seat mechanisms, riding the existing link-slot seating channel as one more arm. The exception, with its reason where a reader meets it: once the caret is already inside an unresolved link being edited, a click lands where it lands. Name the exact arm, where the "unresolved" test comes from (the resolver's state), and every mechanism today's separate paths duplicate that the merge deletes.
2. **C-3:** a resting Text value keeps today's two clicks (open with caret at end, then the rule); find whether the field's opening can fold into the same seat with no new machinery, and say plainly if it can't.
3. **C-4:** Edit Link selects the target everywhere, including the Link value field, which opens caret-at-end today. Find the cheapest change.
4. **What happens today** on each surface when an unresolved link is clicked (picker opens? on what text? follows nowhere?), stated as a table, so the plan's VERIFY lines can name the before/after.
5. **C-6:** confirm the rule's dependencies on the picker writing paths and on location matching; is there anything in the click rule that can land independently?

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition; the merges count.

###### Report (dense, file:line at HEAD throughout)
1. The verified map, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item, with alternatives weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

#### Report

###### C-1 to C-6 Scout Report: One Click Rule for Unresolved Links

**Scope:** I read the files only. Nothing was edited or committed, and the app wasn't run. All paths are relative to the Pommora root at HEAD `14da3f152`.

###### 1. Verified Map

**Drift From Round 3:** Almost every citation holds, give or take a line or two.
- `acQuery.ts`: the empty-selection and read-only gate is `:61` (Round 3 said :65). The dismissed check is `:64`. The early return is `:51`.
- `autocomplete.ts`: `pageRow` is `:104-109`, with `value: p.title` at `:106`. `aliasRows` is `:139`, with its page gate at `:144`. `whole` is `:160`.
- `useConnectionAutocomplete.ts`: `openAlias` is `:154`.
- `embedClickSeat` is `embedWidget.tsx:655`.
- `linkEdges.test.tsx`: the describe is `:153-192`, with tests at `:165`, `:174` and `:184` (Round 3 said 163-191).
- `PropertyValueInput.test.tsx`: the Link field tests are `:187-207`.
- **New Since Round 3:** the `onText` selector (`linkClicks.ts:63-65`) now also lists `.md-heading-symbol`. Phantoms are still left out.

**Every Click Path Today:**
- **Body and Live Editors:** `linkPointer` (`linkClicks.ts:132-150`) is installed for every editor (`surface.ts:51`) and runs through the shared pointer path (`pointerPath.ts:41-55, 73-84`).
  - `linkUnder` (`:43-74`) resolves the link with `resolveLink(readOccurrence(...), api?.index, heldOf(view))` (`:58-62`).
  - `onText` needs a class match and a press inside `contentRange` (`:63-70`). `hidesSyntax` is false only for a phantom (`:71`).
  - `follow` runs through `followTarget` → `resolveFollow`, and its `case 'unresolved': return null` (`:110-111`) is where "a click on an unresolved link does nothing of its own" is decided today.
  - **Mousedown:** a right-press is claimed only when there's a follow (`pointerPath.ts:47`). A press that clamped in from beside the link seats at the nearer edge (`:50-51`). A press with no follow, or with `editingOnPress` set, falls through to CodeMirror (`:52`).
  - **Click:** it acts only on an empty selection and only when `!editingOnPress` (`:76-77`).
- **Link-Slot Seats:** `linkEdit` (`linkEdit.ts:23-54`) has two seats:
  - `rename` (`:32-38`) selects the alias, seats an empty alias slot, or writes `|`.
  - `editLink` (`:39-40`) selects `targetSpan` for markdown but only `tk.link.title` for a wikilink.
- **The Three Appliers:**
  - `applyLinkAction` (`:73-90`), through `focusRange`.
  - `applyAtRest` (`cellStatic.tsx:444-452`), through `onActivate({kind:'select'})`, which lands via `seatSelection` (`CellEditor.tsx:101-119`, applied at `:271`).
  - `ValueEditor`'s open (`ValueEditor.tsx:144-153`): `alias` goes to `rename` (`:145`), a bare address gets a markdown label (`:146-149`), and anything else gets the caret at the end (`:151`).
- **Resting Table Cell:**
  - `claimLink` (`cellStatic.tsx:462-469`) is `followTarget` or nothing. Falling through gives `onActivate({kind:'point'})` (`:557`), then `posAtCoords` in the new editor.
  - An ambiguous link carries `data-link` (`:171-174`). A phantom is drawn without it (`:149-164`), so `cellLinkTarget` (`:632-645`) never sees it.
- **Resting Text Value:** `TextCell` `follow` (`TextCell.tsx:46-55`) calls `resolveFollow` with no seat. An unresolved link bubbles to `valueClickIntent` → `{kind:'edit'}` (`valueClick.ts:44-46`), which opens the inline field with the caret at the end.
- **Resting Link Value:** an unresolved one renders through `TextCell` (`LinkCell.tsx:41-53`), so it takes the same bubble.
- **The Menus That Offer Edit Link:**
  - The connection menu, as **Edit Title** or **Edit Link** (`connectionMenu.ts:93`). It's never offered on an unresolved link (`:25`).
  - The cell menu's link kind, as **Edit** with `editLink` (`cellMenu.ts:127-133`). This is what an unresolved or malformed Link value gets.
  - The webpage tile's grip, as **Edit Link** (`Menus/gripMenu.ts:153-158`). It already selects the address, on a separate block path, and complies with C-4.
  - On a value, `editLink` maps to `{kind:'edit'}` (`valueClick.ts:51`), the same intent a click makes, which opens the inline field with the caret at the end (Table `:150,206-221`, `CardValue.tsx:91,143-151`, Panel `:302,409-417`). Rename maps to `{kind:'rename'}`, the popover with `alias={def.type==='link'}` (Table `:258`, Cards `:494`, Panel `:542`).
- **Tiles at Rest:** a tile is a read-only `MarkdownEditor` (`MarkdownTile.tsx:52-66`, `PageTile.tsx:161-181`). `acQuery` returns early on a transaction with no doc or selection change (`:51`), so flipping read-only off (`MarkdownEditor.tsx:267-276`) never recomputes the query.

###### 4. Today, Per Surface (Unresolved Click)

| Surface | Today | After |
|---|---|---|
| Body or live cell, ambiguous, no alias | The caret lands at the press, in the title. The picker opens on both holders, and a pick writes the bare title again (`autocomplete.ts:106`) | The caret goes to the title's end. The picker writes the path once A-3 lands |
| Body or live cell, ambiguous with an alias or label | The caret lands in the alias. Nothing opens (`aliasRows` needs a resolved page, `:144`) | Title end; the picker opens |
| Body, phantom (`[[X]]`, `[[X\|A]]`, `[L](X)`) | Not `onText`, so the caret lands wherever pressed. The picker opens only when the press hits the title and some title starts with it | Title end; rows wherever the title prefix-matches (with D-4, location matches too) |
| Body, a press clamped in from beside the link | Nearer edge (`pointerPath.ts:50-51`) | Unchanged |
| Resting table cell, ambiguous | Activates at the point; behaves like the body by whichever slot it hits | Activates seated at the title's end |
| Resting table cell, phantom | Not a hit; activates at the point | Activates seated at the title's end |
| Tile at rest | The caret lands at the press; the read-only flip leaves the picker closed | Title end; the picker opens with the read-only recompute (below) |
| Resting Text value | The field opens with the caret at the end of line 1; no picker | A value that is exactly one unresolved link gets a title seat in one click; prose around a link stays at two clicks (C-3) |
| Resting Link value (unresolved) | The field opens with the caret past `]]`; no picker | Title end; the picker opens |
| Link value, Edit menu | Caret at the end | Target selected (see the STOP) |
| Glance, page history | The caret lands at the press; no picker | Glance excluded by `followTarget`'s check (`linkClicks.ts:88`); history unchanged |
| A footnote marker citing an unresolved link | Travels to the footnote | Unchanged (`followCitation` passes no seat) |

###### 2. Recommended Approach

**The Arm (C-1, C-2):**
- One new arm in `linkEdit`: `case 'title': return { kind: 'select', range: [tk.link.title[1], tk.link.title[1]] }`.
- **Why the title's end:** the query reads the whole slot (`autocomplete.ts:86`), so any spot gives the same rows, and the end leaves Backspace narrowing the query. `partOf` checks the title first with inclusive ends (`Input/edits.ts:399-408`), so the title's end wins over an adjacent `#`, `|` or `)`.
- `action` widens to `LinkAction | 'title'` in `linkEdit`, `applyLinkAction` and `applyAtRest`. One exported name in `linkEdit.ts` would cover all three.
- The unresolved test is `ResolvedLink.kind === 'unresolved'`. Each caller already holds that value: `linkUnder` (`linkClicks.ts:58`), `cellLinkTarget` (`cellStatic.tsx:644`), and `readLinkText` + `resolveLink` in `ValueEditor`, the same pair `LinkCell` reads (`LinkCell.tsx:36-37`).
- **Rejected, Folding Into `editLink`:** an unresolved Edit Link would collapse to the title seat. It needs the resolver inside the otherwise text-only `linkEdit`, and a resolve on every Edit Link, all for one case.

**The Pointer Path (Recommended Route A):** the seat lives in the existing click-outcome switch.
- `resolveFollow` gains `seat?: () => void`, and its arm becomes `case 'unresolved': return seat ?? null`. The rule and its exception get their reason in a comment there: "a caret already inside the link is open for editing, so a press lands where pressed and the alias stays clickable."
- `followTarget` passes `seat` through.
- `linkPointer.follow` passes `() => applyLinkAction(view, 'title', hit.range)` when `hit.tk && event.button === 0`. The button gate is needed: otherwise `pointerPath.ts:47` claims the right-press, the caret never moves, and the editor's own menu reads a stale caret.
- **What Route A gets for free:** the C-1 exception is already code (`editingOnPress`, `:43, :52, :77`). So are the glance exclusion (`:88`) and footnotes staying untouched. `pointerPath.ts` needs no change.
- **Route A's cost:** the seat runs at `click`, so it shares the resolved-link quirk at `:76`. A click while text is selected elsewhere in the same editor does nothing, every time.
- **Route B, the Alternative:** add a `seat` member to `PointerSpec` and run it in `mousedown` after `:48` when `onText && !editingOnPress`. It seats at mousedown, which avoids the quirk. But it adds a hook that one of the three pointer specs uses (the other two are `citationPointer.ts:61` and `:100`), and it needs its own glance check. I picked A because it folds into the one place that decides what a click does, rather than adding a parallel hook.
- **The Selector:** add `.md-connection-phantom` to `linkClicks.ts:64` and leave out `.md-phantom-syntax`. A press on a phantom's visible brackets is editing syntax and lands where pressed. That's my call against C-1's "no matter where", so it needs your confirmation. Covering the brackets too would also mean widening the `contentRange` test to `tk.range` for phantoms. An empty-label phantom `[](X)` already matches, since `LabelWidget` adds `md-link-label` (`decorations.ts:114`).
- **Read-Only:** I recommend no read-only gate on the seat. With a gate, a tile's first click falls through, CodeMirror puts the caret inside the link, the tile becomes editable, and the second click hits `editingOnPress` and lands where pressed. The rule never fires on tiles. Instead, the early return in `acQuery.ts:51` gains `&& tr.startState.readOnly === tr.state.readOnly`, which is one cheap comparison. That fixes a latent gap: today an ambiguous link clicked in a tile at rest never opens the picker. Page history then seats a caret harmlessly; CodeMirror places one there today anyway.

**The Resting Cell:**
- Add `'data-link': ''` to the existing `md-connection-phantom` span (`cellStatic.tsx:155-159`), not a wrapper. Its `data-src` is `cs,ce`, `linkTokenAt` is range-inclusive (`tokens.ts:323-324`), and the span keeps `data-at`, so `cellOffsetAt` is untouched. Hover and right-click are unaffected, since `dwellTarget` and `linkMenuTarget` already refuse unresolved links.
- `claimLink` passes the seat as `!readOnly() && found.tk ? () => void applyAtRest(found.tk, 'title') : undefined` into `followTarget`. It's already left-button only (`:579`).

**C-3, the Text Value:**
- Two clicks stay for a link inside prose. Seating it on the first click would need the click's position carried through `valueClickIntent`, which has none (`valueClick.ts:21`). It would then have to pass through three surfaces' editing state and survive the first-line trim (`parseEditorValue.ts:15`). That's about +20 to 25 lines, and it can't be done without new machinery.
- A value that is exactly one unresolved link folds in for free. It goes through the same open check as the Link value (next item).

**C-4, and the Link Value's Open (with the C-2 Value Arm):**
- `ValueEditor`'s `alias?: boolean` becomes `seat?: ConnEditAction` (already exported at `connectionMenu.ts:29`). `TextPane` (`TextPane.tsx:42`) doesn't pass it, so only `PropertyValueInput` changes.
- **The Open:**
  - `const action = oneLine && seat !== 'rename' && written && resolveLink(written, host.connections()?.index, holder).kind === 'unresolved' ? 'title' : seat`, where `written = readLinkText(doc)`.
  - If `action` and `drawnLinkAt(view, 0)` → `applyLinkAction(view, action, [0, len])`.
  - Else if `rename`, wrap the bare address as today.
  - Else if `editLink` → `focusRange(view, 0, len)`, so a bare address is selected whole, C-4 read literally.
  - Else the caret goes at the end.
- **Option 2, Recommended:** `PropertyValueInput` passes `seat={alias ? 'rename' : def.type === 'link' ? 'editLink' : undefined}` at `:95`, with no surface changes. The Link field then always opens as Edit Link, since click and menu Edit are already one intent.
- **Option 1, the Fallback:** carry `seat: 'editLink'` on the `edit` intent (`valueClick.ts:51`) through Table, Cards and the Panel's editing state into their inline mounts. That's about +10 lines and changes no ratified behavior.

###### 3. Additions and Removals

**Additions:**
- The `'title'` arm (+2) and the action type (+1).
- The `resolveFollow` and `followTarget` parameter with the rule comment (+3).
- The `linkPointer` seat (+3).
- The phantom `data-link` (+0 to 1) and the `claimLink` seat (+2).
- The `ValueEditor` open: action, `editLink` branch and imports (+4).
- The `PropertyValueInput` mapping (+0 to 1) and the `acQuery` flip (+0 to 1).

**Removals:** `alias: boolean` becomes the existing union. Nothing else deletes, which matches Round 3. The merge is three separate landings collapsing onto one arm and its existing appliers.

**Net:** about **+15 / −1**, before tests. Option 1 adds about +10. It's net-positive, and I'm not promising otherwise.

###### 4. What the Change Makes False

**Docs:**
- `ConnectionsPM.md:19` ("muted and inert until one side is renamed").
- `ConnectionsPM.md:36` ("a phantom is inert").
- `ViewTypesPM.md:91` (the field "when empty or malformed"; under Option 2, add that Edit Link selects).
- The Autocomplete section (`ConnectionsPM.md:56`) gains a sentence saying a click on an unresolved link opens the picker.
- Still true: `ConnectionsPM.md:51`, `MarkdownPM.md:104`, `PropertiesPM.md:117`.

**Comments:**
- `linkClicks.ts:78` and `:93`: the docs for `followTarget` and `resolveFollow`.
- `ValueEditor.tsx:45`.
- `PropertyValueInput.tsx:17`.
- Still true: `TextCell.tsx:16`, `valueClick.ts:20`, `cellStatic.tsx:461`.

**Tests:**
- `linkEdges.test.tsx:153` (the describe title), `:165` and `:174` need rewriting to pin the title's end (8) after a mousedown plus click. `:165` must dispatch on `.md-connection-phantom`, not on `contentDOM`. `:184` stays.
- `ValueEditor.test.tsx:245-285`: `alias: true` becomes `seat: 'rename'`.
- `PropertyValueInput.test.tsx:187-191` (head 14) becomes "selects `Alpha`" under Option 2.
- Still true: `ValueEditor.test.tsx:84-87`, `TextCell.test.tsx:112-137`, and the phantom draw tests in `cellStatic.test.tsx:202-219` and `:279-281`.
- **Live-Verify:** no test shows the picker opening after a seat at mount (`caretGeometry` null → `setAc(null)`, `useConnectionAutocomplete.ts:60-62`). The working precedent is Rename's empty-alias seat (`ValueEditor.tsx:145`).

###### 5. STOP

- **STOP, Option 2 and C-4:** under Option 2, menu Edit on an *unresolved* Link value seats the title as a bare caret instead of selecting the target, which departs from C-4's "everywhere". Separately, a click on a *resolved* Link value's padding would select the target instead of putting the caret at the end, which nobody ratified. Both need your ruling. Option 1 keeps both behaviors as ratified, for about +10 lines.
- **Confirm, Not a STOP:** brackets on a phantom land where pressed (C-1's "no matter where").

###### C-6 Dependencies

The rule's code depends on nothing else in the plan; only its usefulness does:
- **Ambiguous links:** the rule does nothing useful until A-3, because a pick writes the bare title (`autocomplete.ts:106`) and a Link value refuses a shared title at commit (`linkValue.ts:190`).
- **Path-form phantoms:** nothing matches until D-4, because the picker matches title prefixes only (`useConnectionAutocomplete.ts:108`).
- **Headings:** a pick drops `#Intro` until C-5 (`autocomplete.ts:179`).

**Can Land on Its Own:**
- Phantoms that prefix-match, including the alias-to-title fix for aliased phantoms.
- All of C-4.
- The tile read-only recompute.

###### 6. Beyond the Lane

- **Click Quirk:** the click handler's gates at `pointerPath.ts:76-77` (empty selection, `!editingOnPress`) could become one "this mousedown claimed the press" flag. That fixes the stale-selection dead click for resolved links and for Route A seats.
- **Edit Title Mismatch:** Edit Title selects `title` on `[[P#H]]` but `title+heading` on `[L](P#H)` (`linkEdit.ts:40`). Using `targetSpan` for both drops the ternary; you'd need to say which one you want.
- **Live and Resting Draws Differ:** a phantom markdown link hides `(X)` at rest when live (`decorations.ts:583-586`) but shows it at rest in a cell (`cellStatic.tsx:161`).
- **Mislabeled Test:** `linkEdges.test.tsx:145` is titled "Edit Title" but exercises Rename.
- **Near-Duplicate:** `focusAt` and `focusRange` (`caretPlacement.ts:4-15`). Fold them if `assoc 1` proves harmless.
- **Hand-Rolled Follow:** `TextCell.tsx:46-55` and `LinkCell.tsx:63-71` both hand-roll `resolveFollow` with preventDefault and stopPropagation. That's a near-duplicate by necessity, since `followTarget` needs a page editor to find.

---

### Round 4 — In-App Re-Spell, Collisions, and the Gate

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; a "Nexus" is a user folder of Markdown pages in Collections and Sets, which are folders; pages carry an `ID`, containers carry IDs in sidecar JSON). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152`.

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **E-1, E-2, E-3 (in-app collisions), E-5, E-6, E-7, F-2**, and Mechanism Fork 3.
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: *§Mechanism Forks* (top), *Round 1 — Cascades* (lines 500-699), *Round 2 — Cascade and Rewrite Reuse* (986-1239), *Round 2 — Triggers and External Moves* (791-985, for the trigger side). The Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: The In-App Re-Spell, Collisions, and the Gate
Re-verify at HEAD: `Core/Nexus/{rename,move,folderEntity,cascade,heldPages,mutate}.ts`, `Core/Connections/rewrite.ts` (`rewriteConnections`, `rewriteHeadingConnections`, `follower`, `carry`), `renameCascade`, `deleteCascade`, `titleHeldOutside`, `frozenWorld`, the in-app event path (`relocate` → `noteOwn` → `applyOwn` → `applyEvents`), whatever host lock serializes operations, and every format a link lives in (body links, embeds, table cells, markdown tiles, Link and Text property values, Space sidecars, property caches).

Design, with evidence:
1. **E-1 mapping by identity:** for a page rename/move and a folder rename/move (Collection or Set, which moves every page under it), how the old→new path per page comes from IDs with what the operation already knows. Name where today's page rename cascade gets its mapping.
2. **E-2, one depth-keeping re-spell rule:** a link that resolved to page P before the event becomes the tail of P's new path at the depth it was written (bare = depth 1, full path = whole depth), or the full path where that tail wouldn't name P alone; a tail unchanged byte for byte is left alone; a case-only rename still follows. Propose the one function (signature, home) and how it replaces today's title-key equality (`rewrite.ts`) as the test of which links name P: by resolving against the before-world rather than comparing keys. What does "the before-world" cost to have at hand (a PageIndex built before the change)?
3. **Fork 3, candidate files:** which files might hold a link to P: per-page tail queries through the existing index query (P's title, each partial tail, its full path), versus a prefix range. For a folder move of N pages, what's the query count and is it acceptable?
4. **E-3 in-app collisions:** a create, rename, or restore that gives a title a second holder re-spells existing bare links to the original holder into its full path, by the same rule (it's E-2 applied to the original holder with the after-world). Find where an in-app create/rename/restore would detect "this title just gained a second holder" with what's already computed.
5. **E-5/E-6:** the in-app re-spell runs inside the operation and keeps today's warning when a file can't be updated. What serializes address-changing operations today, and would it cover a settle's payment (the outside-move lane another scout maps)? Give your recommendation for E-6.
6. **E-7:** today a heading rename on one of two same-titled pages rewrites links aimed at the other's heading; confirm and show how resolving against the before-world ends it with the same rule.
7. **What the re-spell retires:** `titleHeldOutside`, `frozenWorld`, the skip when another page holds the old title, title-key equality: say what each becomes.

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition; the merges count. No O(N) or full-Nexus rewalk where an incremental path works.

###### Report (dense, file:line at HEAD throughout)
1. The verified chain, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item, with alternatives weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

Other scouts cover the grammar/resolver/index key (leaning toward `relations.target` storing the written key, normalized, and a resolver reading full path → unique suffix → Ambiguous/Phantom through title holders filtered by path), outside moves (the settle lane), and the Trash. The re-spell function you propose must be the one those lanes call; name exactly what it takes and returns.

#### Report

##### Path Links Scout: In-App Re-Spell, Collisions, and the Gate (HEAD `14da3f152`)

Everything was read only; I edited nothing. `INDEX_GENERATION` is 15 at HEAD (`Desktop/Store/ddl.ts:3`), so the Heading Opener revert has landed.

###### 1. The Verified Chain

**Where a change becomes visible.** Every in-app op moves files through `relocate` (`Core/Files/atomicWrite.ts:62-75`). It takes the source-path lock, renames, then `noteOwn(move)` (`:72`) → `applyOwn` (`Core/Nexus/settle.ts:36-48`) → `applyEvents` (`Core/Nexus/fileEvents.ts:648`) → `applyMove` (`:571-591`).
- `applyMove` patches the tree with `moveNodeInTree` (`Core/Nexus/treePatch.ts:238-264`). Index rows follow through `moveIndexPaths`. Only `path` is rewritten, never `target`.
- So by the line after the relocate, the held tree and the index are post-change. The exception is when `applyMove` answers `'walk'`: an excluded entry under the destination (`fileEvents.ts:576-579`), a crossing, or a node missing from the tree. Then `heldTreeOf` stays stale until a walk is paid.
- Trash crossings fall through to unlink+add arms (`:585-590`).

**Page rename** (`Core/Nexus/rename.ts:37-42`).
- `titleHeldOutside` is read before `renamePage`. If true, the rename returns with no cascade (`:41`).
- Otherwise it calls `renameCascade(root, oldTitle, {title})` (`cascade.ts:162-255`).
- **Today's mapping is just the two title strings** (`rewrite.ts:21-28`, `hit.target === oldKey`). There's no identity anywhere.
- The `fromCreate` branch (`rename.ts:29-36`) never cascades. Its reason is the comment at `mutateRequest.ts:64`.

**Moves and folder renames cascade nothing.**
- `movePageOp` (`move.ts:26-40`) already reads the before tree for the id (`:34`).
- `moveSetOp` (`:42-67`) reads it at `:58`. Its only cascade is `reachConfig`.
- Folder rename (`rename.ts:21-28` → `folderEntity.ts:52-64`) reads no tree.

**Create.** `createPageOp` (`create.ts:22-52`) disambiguates among siblings only. It runs no link work.

**Restore** (`Core/Trash/spend.ts`):
- the tree is read at `:152`
- `frozenWorld` at `:173` (title set, `heldPages.ts:47-53`)
- `scrubReturning` at `:185`, before the move
- `relocate` at `:205`
- the refill does a title rewrite at `:265`
- **Finding:** the pre-delete path doesn't need to be recorded. The bundle sits at `.trash/<old parent dir>/<stamp>__<base>.bundle/<base>` (`trashChainDir`, `Core/Trash/bundle.ts:14-20`), so the old path can be derived.

**Heading rename.**
- The in-op path is `mutate.ts:94` → `renameCascade(..., {heading,to}, req.path)`.
- The outside path is `reindex` (`indexSeed.ts:124-142`, emitting `{title: titleFromPath(path)}` at `:140`), then `cascadeSeen` (`fileEvents.ts:297-309`), gated by `spacesLinkHeading` (`cascade.ts:61-73`) and `tilesLinkHeading` (`tilesFile.ts:282-289`).
- The renderer's own pass is `headingRenameSettle.ts:57`, which goes by `host.pageTitle()`.

**Formats, all inside `renameCascade`:**
- bodies, embeds and table cells: `follower`, `rewrite.ts:45-75`
- frontmatter Link/Text values: `patchOf` under `linkKeysOf`, `cascade.ts:194-209`
- Space sidecars: `spaceArm`, `:55-58`
- markdown tiles: `rewriteTileConnections`; every tile is read on any title rename (`:233-236`)
- property caches: `editCaches`, only for Collections caching a link property (`propertyCache.ts:52-68`)

**Locks** (none serializes address ops):
- `withWriteRoot` (`Core/Contract/handlers.ts:97-111`) takes no lock. It settles in its `finally`.
- `underContexts` (`mutate.ts:73-80`) locks `contextsDir` and pays `payOwedWalk` in its `finally`. It covers createPage-with-seeds, Space/Context delete and restore only.
- Settles run one at a time on `inTurn` (`settle.ts:57`, `inTurns.ts:2-9`, a bare promise chain that isn't re-entrant).
- `machine().lock` rejects taking the same key twice (`Desktop/Platform/fileLock.ts:7-30`).
- Watcher batches run `applyEvents` outside the turn (`settle.ts:201`).

**Drift in Scout Findings** (everything else re-verified):
- **Round 2 Triggers:** the claim "`settleBatch` holds the pre-batch tree" is wrong, as that round itself said; it holds none.
- **Fork 3:** its premise is wrong. "A partial-path link is invisible to a prefix range" is true of one range over the folder's full path. One range per ancestor suffix of the folder (`pommora/`, `studio/pommora/`) does see partials, and the tails a folder rename doesn't touch never need re-spelling anyway. That doesn't change the lean (§2.3), but the reason given for it is the wrong one.
- **Round 1:** `cascade.ts:69`/`:214` and the other cascade lines hold.
- **The E-7 bug is confirmed and has a second half.**
  - `rewrite.ts:92` (`hit.target === titleKey && qualifier === oldKey`), queried through `queryHeadingMentions(titleKey)` (`cascade.ts:174`). Renaming a heading on A/Notes also rewrites `[[Notes#H]]` aimed at B/Notes.
  - It also rewrites B's own `§H` runs and `[[#H]]` self-links, which are keyed by B's own title `notes` (`scan.ts:24`, `cascade.ts:187`).
  - And it misses `[[A/Notes#H]]`, whose key is `a/notes`.

###### 2. Recommendations

###### 2.1 E-1: Mapping by Identity

- Capture the before tree before the op, and read the after tree after it, **with any owed walk paid first** (see §2.5, which makes that safe).
- The moved set is an id-diff of the two trees: `movedPages(before, after)`. It yields `{was?: ConnPage, now: ConnPage}` for every id whose path changed or which newly arrived.
- That one function covers page rename and move, Set and Collection rename and move (every page under the folder is diffed), create, and `fromCreate`.
- It already exists in near-duplicate form, renderer-side: `movedHeadings` (`Core/Session/nexusSlice.ts:28-42`, called at `:254`) is exactly this diff over `pagesByIdOf`. I'd hoist `movedPages` into `Core/Nexus/record.ts` and rebuild `movedHeadings` on it.
- The diff is O(N) per user op, never per keystroke. It's the views and tabs principle (`reconcileIndexOf`, `treeIndex.ts:112`).
- **Alternative weighed:** per-op knowledge, i.e. prefix arithmetic on `from`/`to` as `reparentPaths` does. Each op would need its own code, which is less uniform and isn't identity. I reject it.

###### 2.2 E-2: The One Rule

The rule lives in `Core/Connections/rewrite.ts`, beside `follower`, which both processes already import:

```ts
/** The name a link written `written` carries once the change between the worlds lands; null leaves it as written. */
export function respell(written: string, before: Pick<PageIndex, 'resolve'>, after: PageIndex): string | null
//   x = before.resolve(written).page ?? return null     // "resolved to P before", by resolving
//   y = after.byId.get(x.id) ?? return null            // gone: delete's business
//   was = linkPath(x.path), now = linkPath(y.path)      // stripMarkdownExt
//   d = sameKey(written, was) ? whole : segments(written)   // full path = whole depth
//   next = tail(was,d) === tail(now,d) ? written : tail(now,d)   // P's tails compared byte for byte
//   spelled = after.resolve(next).page?.id === x.id ? next : now
//   return spelled === written ? null : spelled
export function respellConnections(body: string, before: Pick<PageIndex,'resolve'>, after: PageIndex): string  // replaces rewriteConnections
```

**Two definitional choices:**
- **P's old tail against P's new tail:** the unchanged-tail check compares those two, not the written text against the new tail. Otherwise a folder move would re-case every `[[notes]]` a user typed in lowercase. A case-only rename changes P's tail bytes, so it still follows, as E-2 requires.
- **"Names P alone" means resolution:** it's `after.resolve(..).page?.id === P.id`, never a holders count. That keeps the rule agnostic to whatever the resolver lane lands (full path, then unique suffix).

**The rule does what E-2 describes:**
- `[[A/Notes]]` → `[[A/Plan]]`.
- A bare link gains a path only where its new name is shared.
- `.md` is kept when the tail doesn't change and dropped when it's re-spelled (A-5, A-7).
- The heading and alias ride through `follower`'s title-span edit.
- Empty-title self-links are skipped.

**It replaces title-key equality:** each hit is tested by `before.resolve(hit.named.title)`, not by `hit.target === oldKey`. No "affected set" is needed. Any hit whose resolution or tail changed between the two worlds re-spells, and every other hit returns null after two map lookups.

**What `before` costs.** `pageIndexOf(beforeTree)` is memoized per `tree.collections` (`record.ts:85`, `tree.ts:131`).
- On the host only `titleHeldOutside`, `frozenWorld`, `assignValue` and Matrix build it today. A rename already pays the build, but moves and folder ops would newly pay one O(N) build per user op: a normalize and a Map entry per page, low tens of ms at 50k pages.
- The after index is a second build, memoized for the next op. Never on a keystroke.

**One addition to `PageIndex` (`pageIndex.ts:26-30`):** `byId: ReadonlyMap<string, ConnPage>`, with `pagesByIdOf` (`record.ts:65-73`) becoming `(tree) => pageIndexOf(tree).byId`.
- That's a merge: the order is first-listed in both, it's one map per tree, and its 9 callers are unchanged.
- **Alternative:** pass `afterById` separately. That's a second parameter, and it keeps two byId maps.

###### 2.3 Fork 3: Candidate Files

**Recommendation:** per-page tail keys, but only the tails that change, bound into **one** query.
- I'd widen `queryMentions(keys: readonly string[])` and `queryHeadingMentions(keys, heading)` to `target IN (SELECT value FROM json_each(?))`. That reuses the `PATHS_OF` idiom (`Desktop/Store/stores.ts:16`), and `relations_by_target` (`ddl.ts:26`) serves it.
- It touches `Core/Platform/stores.ts:60-61`, `Desktop/Store/stores.ts:100-113`, `Core/Testing/memoryStores.ts:130-145` and `contentIndex.ts:65-74`.
- `deleteCascade`'s per-key loop with a union (`cascade.ts:96-99`) then collapses to one call.

**The key function** (pure, in `rewrite.ts`):

```ts
export function respellKeys(moved: readonly {was?: ConnPage; now: ConnPage}[], before: Pick<PageIndex,'resolve'>, after: PageIndex): string[]
// old tails of `was` at depths where tail(was,d) !== tail(now,d), kept only if before.resolve(t) is `was`     (links naming P)
// new tails of `now` at those depths (all depths for an arrival), kept only if before.resolve(t) is some OTHER page   (E-3 collisions)
```

- **Folder moves:** an unchanged tail keeps the same holders, since the pages under a folder move together. So bare-link files are never opened for a folder move.
- **Collection rename:** one key per page, the full path.
- **Rename at depth k:** k keys per page.
- **Page move:** the tails that span the moved prefix.
- **Page rename:** all its tails, plus the collision key, which is only queried when another page actually held it.
- **Query count:** 1 per op whatever N is. The JSON argument for 50k keys is about 2 MB, which is fine.
- **Cold index:** the existing `nexusCorpus` fallback, once per op.

**Alternative weighed:** k prefix ranges through a new `queryMentionsUnder`. It's correct for partials, but it adds a new method in four places plus a contract test, and it over-matches. The widened exact query adds no method and absorbs `deleteCascade`'s duplication.

**Cross-lane requirement:** keys are `normalizeTitle(tail)` without `.md`. The index lane must store the written page half normalized, with `.md` dropped.

###### 2.4 E-3: In-App Collisions

The second branch of `respellKeys` is the detection. `before.resolve(newTail).page` exists and isn't the arriving page: that's "this name just gained a second holder", using only the before index, which is already in hand.
- Create, rename and `fromCreate` produce `now` entries through the diff (§2.1), so no op-specific detection is needed. `createPageOp` gains nothing.
- The rule then sends the original holder's bare links to its full path (tails equal, `after.resolve` ambiguous → `now`).
- **Extension to put to Nathan (INFERRED):** the same branch catches partial-tail collisions, where a moved or arriving page steals a bystander's `[[x/T]]`. It costs zero queries unless a bystander held that tail. E-3 only says "bare links", so this needs a ruling. I recommend including it, since the rule's own clause covers it.

**Restore** (F-2 together with E-3) needs a composed before-world:
- R is the live tree. A is R plus the returning pages at their bundle-chain paths.
- Before = `{ resolve: w => R.resolve(w).page ? R.resolve(w) : A.resolve(w) }`.
- A naive `buildPageIndex([...tree, returning])` would make a namesake Q's bare links (Q being a page that took the title while P sat in the Trash) read ambiguous before the restore. Those links would be skipped and the collision missed.
- With the composition, old-path links follow P (F-2, through the move rule), and links R resolves to another page are never hijacked.
- This is why `before` is typed `Pick<PageIndex,'resolve'>`.
- I'm handing this construction to the Trash scout explicitly. It's also what `frozenWorld`'s `landing`/`arriving` set becomes.

###### 2.5 E-5 and E-6

**Recommendation: address ops run in the settle's own turn.**
- Add one export to `settle.ts`: `inSettleTurn<T>(root, fn: (current: () => Promise<NexusTree>) => Promise<T>): Promise<T>`. Here `current` pays `walkWhileOwed(root)` directly, which is safe because the turn is held, and returns the held tree, or a walk if none is held.
- The outside lane's payment already runs inside `settle()` (`:128-132` precedent), so it's covered with no extra code.
- The op reads an accurate after tree even when `applyMove` answered `'walk'`.
- **Ordering rule:** the Contexts lock is taken outside the turn, as `underContexts(() => inSettleTurn(...))`. Its `finally` `payOwedWalk` then queues after the op's turn has ended, with no self-wait. Nothing inside an op body may call `payOwedWalk` or `settleNow`; I grepped, and none does (`mutate.ts:78` and `handlers.ts:105` are outside op bodies).

**The in-app trigger** is one wrapper in `mutate.ts`, `addressed(fn)`:
- `before = current()`
- run the op
- `after = current()`
- `renameCascade(root, {before: pageIndexOf(b), after: pageIndexOf(a), moved: movedPages(b, a)})`
- join the result into the reply with the existing `joinCascades` (`cascade.ts:75`)
- That keeps today's warning in the reply (E-5; the renderer warns at `nexusSlice.ts:246-247`).
- **Wrap:** rename, movePage, moveSet, createPage, createContainer and delete, where the diff yields no moves for delete.
- **Restore** is wrapped by the turn only. It calls `renameCascade` itself with the composed before, because only it knows where the returning pages were. That reason should be stated where a reader meets it.
- I'd also run `renameHeading` and `emptyBundle` in the turn, so every cascade shares one gate.

**Rejected:**
- **A new `machine().lock` gate key taken by ops and by the settle's payment:** sound only if the gate is always taken inside `underContexts` and released before its `finally` `payOwedWalk`. Otherwise an op holding the gate waits on the turn while the turn waits on the gate, which is a deadlock. Even done carefully, the op can't pay an owed walk while holding the gate, so it can't trust its after tree.
- **Moving in-app re-spells to the settle:** this loses the reply's warning (E-5) unless new plumbing is added.

**Accepted side effect:** watcher `applyEvents` still runs outside the turn, so an outside move landing mid-op can show up in the op's diff. Re-spelling it is correct, and the settle lane's later pass is idempotent: the already re-spelled names don't resolve to P in its before-world.

###### 2.6 E-7

`rewriteHeadingConnections(body, page: ConnPage, index: PageIndex, oldHeading, newHeading, ownPath = '', outline?)`:
- A hit counts when `hit.named.title === '' ? ownPath === page.path : index.resolve(hit.named.title).page?.id === page.id`, and its qualifier is the old heading.
- The outline is given when `ownPath === page.path`, replacing `normalizeTitle(own) === titleKey` at `cascade.ts:187`.
- The ambiguous `[[Notes#H]]` resolves to nobody, so it's skipped. `[[A/Notes#H]]` resolves to A and follows. B's own runs and self-links fail the path test.
- Candidates are `queryHeadingMentions(P's naming tails, heading)` plus **always P's own file**. With the gate, the title key `notes` isn't queried when P has a twin, so the own file has to be added by path. That needs no index change.
  - **Alternative for the index scout:** key self-links by the own page's full path. That needs an index generation bump (to 17).
- `HeadingRenameSeen.title` should become `path` (`indexSeed.ts:94-98,140`, `fileEvents.ts:297-309`).
- In the renderer, `EditorHost.pageTitle()` (`api.ts:205`) becomes `page(): ConnPage | null`. That's 2 callers (`gripMenu.ts:78`, `headingRenameSettle.ts:51`), plus `editorHost.tsx:145`. The settle passes `host.connections()?.index`.

###### 2.7 What the Re-Spell Retires

- **`titleHeldOutside`** (`heldPages.ts:37-44`):
  - Its call in `rename.ts:12,37-41` goes, because the rule subsumes the skip. The bare `[[Beta]]` aimed at a twin doesn't resolve before, so it's left alone, and `mutate.test.ts:383` stays true.
  - Its only other caller is `deleteCascade` (`cascade.ts:90`). Once the Trash lane strips by worlds (strip where `before.resolve(v).status !== 'phantom' && after.resolve(v).status === 'phantom'`, which keeps `cascade.test.ts:568/578` true), the function and its test (`heldPages.test.ts:83-88`) are deleted.
- **`frozenWorld`** (`heldPages.ts:46-53`, used by `spend.ts:173`, `assignment.ts:91`, `restoreProperty.ts:59`): `landing` becomes the composed restore world (§2.4). `holds` becomes `resolve(name).status !== 'phantom'`. If F-5 moves the scrub after the relocate, `landing` disappears. That's the Trash lane's call.
- **The held-elsewhere skip:** gone, as above.
- **Title-key equality:**
  - `rewrite.ts:21-28` → `respellConnections`; `:92` → the resolves-to-page test
  - `RenameChange` (`rewrite.ts:18`) → `CascadeChange = {before, after, moved} | {page, index, heading, to}`
  - `renameCascade`'s `title` parameter goes
  - `spaceMoved` and `movedCache` take the new rewrite
  - `'title' in change` → `'moved' in change`
  - `spend.ts:265` → the Trash lane's id-keyed refill through `respell`
- **`spacesLinkHeading`** (`cascade.ts:60-73`) and **`cascadeSeen`'s pre-gate** (`fileEvents.ts:299-305`) are removable. `renameCascade` already gates internally: an empty query, `spaceArm`'s in-memory check, the tiles cache. That's optional, at about −20 lines.
- **`tilesLinkHeading`** (`tilesFile.ts:267-289`) generalizes to `tilesLink(root, keys, heading?)`, caching every tile's link keys. Without it, every sidebar drag reads every markdown tile (`cascade.ts:233-236`).

###### 3. Additions, Removals, Lines

**Additions:**

| Item | Lines | What it buys |
| --- | --- | --- |
| `respell` | +12 | the one rule; the other lanes call it |
| `respellKeys` | +14 | keys and collision detection |
| `tail`/`linkPath` in `Core/Paths/posix.ts` | +2 | shared with the resolver's suffix match |
| `PageIndex.byId` | +3 | `pagesByIdOf` folds into it |
| `movedPages` | +8 | `movedHeadings` folds into it |
| `inSettleTurn` | +5 | E-6 with no new lock |
| `addressed` wrapper plus wraps | +18 | one trigger and one gate |
| `CascadeChange` and key-driven candidates | +7 | |
| `tilesLink` generalization | +3 | |
| `EditorHost.page()` | +1 | |
| `carry`/`repeatsTarget` on the last segment | +4 | |

The `carry` fix (`connections.ts:145-158`, `links.ts:33`) belongs here: `[[A/Notes|Notes]]` renamed keeps "Notes" and `[[A/Plan|Plan]]` keeps a redundant alias. The draw lane needs the same helper.

**Removals:**
- `rewriteConnections`'s body: −8, replaced
- `rename.ts:10,12,37-42`: −8
- `pagesByIdOf`'s body: −6
- `movedHeadings`' loop: −4
- `deleteCascade`'s query loop: −3
- `RenameChange` title arm: −1
- optional `spacesLinkHeading` plus the `cascadeSeen` gate: −20
- `titleHeldOutside`: −8, once the Trash lane lands

**Honest net:** about +80 to +95 added and −35 to −58 removed, so **this arm lands net positive by roughly +30 to +50**. The merges elsewhere (search, the click rule) have to carry the overall number.

###### 4. What Becomes False

**Docs:**
- `ConnectionsPM.md`:
  - `:22` (Main "resolves no link"; the "held outside" checks)
  - `:24-26` (the cascade "resolves by title", rename only)
  - `:28` (heading rename reaching "every file the index names"; it becomes only links resolving to that page)
  - `:30` (last sentence)
  - `:78` (the Duplicate disambiguation prospect)
- `CorePM.md`: `:87` (the cascade policy names only page rename), `:96` ("one rewriter applies a rename")
- `CollectionsPM.md:24` (Move Semantics: links now follow), `:45`
- `PagesPM.md:16`: the Untitled create collision; see §6
- `NexusRecordPM.md`: `:12` and `:16` ("unless a page outside it still holds that title"; Trash lane), `:34` (the crash-safe prospect names "the move cascade")

**Comments:**
- `rewrite.ts:20`, `:77`
- `cascade.ts:60`, `:81`, `:161` ("a title rename reads every [tile]")
- `heldPages.ts:1`, `:37`, `:46`
- `mutateRequest.ts:64` (`fromCreate` "skips the link cascade")
- `fileEvents.ts:296`
- `settle.ts:1`, which should name address ops running in the turn
- `api.ts:204`

**Tests:**
- Re-shaped to worlds:
  - `rewrite.test.ts` (both suites: `rewriteConnections` throughout, `rewriteHeadingConnections` from `:184`)
  - `linkValue.test.ts:293-315`
  - `tilesFile.test.ts:509`
  - every `renameCascade` call in `cascade.test.ts` (`:70-405`, `:758-815`)
  - `admission.test.ts:117,132`
  - `aliasAcceptance.test.ts:51-112`
  - `indexSeed.test.ts:175`
- `mutate.test.ts:365-381`: the `fromCreate` skip is now false.
- `mutate.test.ts:398`: the "(no cascade)" title is now false.
- `heldPages.test.ts:83-91`.
- `storesContract.ts:97-265`: `queryMentions` takes an array.
- The `spacesLinkHeading` tests in `cascade.test.ts`, if removed.
- `store.test.tsx`, if `movedHeadings` is rebuilt on `movedPages`.
- **Stay true:** `mutate.test.ts:383` and `cascade.test.ts:568/578`, provided delete uses the status rule.

###### 5. STOP

No contradiction with the Decisions. Two INFERRED points to raise at ratification:
- Partial-tail bystander collisions extend E-3 beyond "bare links" (§2.4).
- Restore runs its own `renameCascade` call inside the shared turn, the one exception to the wrapper, with its reason carried (§2.5).

###### 6. Beyond the Lane

- **Create collisions with Untitled:** `DEFAULT_NEW_NAME = 'Untitled'` (`mutateRequest.ts:25`). Under E-3, creating any page re-spells an existing sole Untitled page's bare `[[Untitled]]` links to its full path, and they never shorten back (A-7). That's literal E-3 and rare, but Nathan should know.
- **Restore can't tell old bare links apart:** bare `[[T]]` links written to P before its delete, and now resolving to a namesake Q, re-spell to Q on restore. The rule can't distinguish them; only the Trash's recorded values carry intent.
- **The settle lane** should build its before-world as the current pages, minus unpaired arrivals, plus paired vanished ids at their old paths (`Pick<PageIndex,'resolve'>`). It then calls `renameCascade(root, {before, after: pageIndexOf(tree), moved}, null)` and logs the warning, which keeps E-5's two triggers and one function.
- **Duplicate ids:** where two files claim one id, `byId` holds the first listed, so the diff can misreport. Writers already refuse such ids (`livePathOf` null).

###### Key Files

- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/rewrite.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/cascade.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/rename.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/move.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/mutate.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/settle.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/heldPages.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/record.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/pageIndex.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/spend.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/bundle.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Desktop/Store/stores.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Tiles/tilesFile.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Links/headingRenameSettle.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Session/nexusSlice.ts`

---

### Round 4 — The Outside-Move Lane

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; a "Nexus" is a user folder of Markdown pages that carry an `ID` frontmatter key; a SQLite content index is regenerative). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152` (`INDEX_GENERATION` is 15; this work will bump it to 17).

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **E-3 (external collisions and move pairing before collision detection), E-4, E-5, E-6**.
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: *Round 2 — Triggers and External Moves* (lines 791-985) is your predecessor's map; also *Round 1 — Cascades* (500-699). The Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: Outside and Closed-App Moves Riding the Heading-Rename Lane
Re-verify at HEAD: `Desktop/FileWatch/watcher.ts` (batches, `SETTLE_MS`, unlink/add only), `Core/Nexus/fileEvents.ts` (event application, `owed`), `Core/Nexus/settle.ts` (`settle()`, `owed.renames`), `Core/Index/indexSeed.ts` (open-time seed, `reindex`, `HeadingRenameSeen`, `cascadeSeen`), the `INDEX_GENERATION` staleness check (`Desktop/Store/ddl.ts`), and the in-app path that skips its own events (`noteOwn`, `applyOwn`).

Design, with evidence:
1. **Pairing an outside move (E-4):** a page whose ID vanished from one path and arrived at another is a move. The unlink and add often land in separate watcher batches, so the vanished ID must be remembered across settles. Where does the index already know a vanished page's ID and old path (it holds rows keyed by path and/or ID)? Propose the smallest state that remembers it and where it lives, and when it's forgotten.
2. **Owing and paying:** how today's heading-rename lane notices, owes, and pays; how a page move owed the same way would be paid at settle by the same re-spell function the in-app operation calls (another scout designs that function: it takes the before-world and the old→new page mapping). Folder renames outside the app arrive as many unlinks and adds; show they pair page by page with no folder logic.
3. **Closed-app moves:** the open-time seed compares the index to the tree; show how a page whose ID sits at a new path is detected and owed, and the one-time limit after a generation bump (the reseed starts from nothing, so it can't pair).
4. **E-3 external collisions:** a file arriving from outside that gives a title a second holder re-spells bare links to the original holder, by the same rule; pairing must run before collision detection so a move isn't read as a collision. Where would that check sit in the event path?
5. **E-5/E-6:** outside payments are only logged (no notice). What lock or gate serializes in-app address-changing operations today, and can it span the settle's payment so an in-app operation can't start mid-sweep? Weigh "host lock spans the settle payment" against "in-app re-spells move to the settle"; recommend one with reasoning.
6. **Cost:** the project forbids O(N) or allocating work on high-frequency triggers and full-Nexus re-walks where incremental works. Confirm the pairing and payment stay incremental.

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition.

###### Report (dense, file:line at HEAD throughout)
1. The verified chain, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item, with alternatives weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

#### Report

##### Path Links Scout: Outside and Closed-App Moves (E-3 External, E-4, E-5, E-6)

Read-only, at `14da3f152`. I edited and ran nothing. All paths are relative to the repo root. A copy of this report is at `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/439cb304-24a6-4f16-aa59-0b3f5d191f35/scratchpad/outside-moves-report.md`.

**Bottom line:**
- **Pairing:** an outside move pairs page by page, with no folder logic.
  - **Vanished side:** the old path's `ID` is read from the content index before a watched unlink deletes it, and remembered on `Owed` across settles.
  - **Arrived side:** a watched add at a path the index had no row for.
  - **Where:** paired once per settle, after the walk. The same step serves the closed-app seed.
- **Move before collision:** in that one loop, the vanished-ID lookup runs before the collision test, which satisfies E-3.
- **E-6 recommendation:** option (a), a new host lock keyed on the Nexus root. It spans the in-app address ops and the settle's payment. A lock-order proof is in §2.5. Option (b) still needs the gate and loses E-5's in-op notice.
- **Size:** about +52 to +60 production lines added and −3 removed, excluding `worldOf` and the re-spell itself.
- **STOP:** none.

###### 1. The Verified Chain

**Watcher**
- `SETTLE_MS = 200` (`watcher.ts:38`) is both the debounce (`:120-124`) and the `awaitWriteFinish.stabilityThreshold` (`:106`).
- Only add, change, unlink, addDir, and unlinkDir are emitted (`:127-131`).
- Batches run in order on `batchQueue` (`:42`, `:123`). A watcher restart's `ready` drains with `missed=true` (`:133`).
- Own echoes are dropped at `:118` and through `dropOwnEchoes` (`writeEcho.ts:98-107`). The windows are 2 s exact and 800 ms for descendants (`writeEcho.ts:8-10,79-92`).

**chokidar 5.0.0 order (this is the folder-rename evidence)**
- `_remove` recurses into the children (`node_modules/chokidar/index.js:729-730`) before emitting the parent's `unlinkDir` (`:756-758`). So every page gets its own `unlink`, landing before the prefix event.
- A new folder emits `addDir` (`handler.js:534`), then reads its children (`:545` → `:488`). Each child emits `add` (`:395`); `ignoreInitial` only covers the initial scan.
- `_remove` drops the unlink of a path whose ADD is still pending (`index.js:744-748`).

**Events**
- `applyEvents` runs `indexEvent` before `applyOne` (`fileEvents.ts:648-666`).
- In `indexEvent`:
  - unlink and unlinkDir go to `deindexPath` (`:272-275`).
  - add and change go to `indexWrittenPage`; only watched events owe renames (`:278-282`).
  - move goes to `moveIndexPaths` (`:269-271`).
- An own move goes through `applyMove` (`:571-591`). Where the tree can't place it (Trash at either end), it falls back to an own unlink plus add through `applyOne` (`:586-590`). That fallback has origin `'own'` and bypasses `indexEvent`.
- `applyPage` compares IDs at one path only (`:397-398`). A page whose folder awaits a stamp returns `'later'` (`:374-377`) and is replayed after the stamp (`settle.ts:201-205`).

**Index**
- Rows are keyed by path. `page_values` (`ddl.ts:34-40`) holds the full frontmatter, `ID` included, as JSON (`stores.ts:72-73`).
- `deindexPath` deletes rows (`indexSeed.ts:144-149`). `moveIndexPaths` renames them instead (`:151-166`).

**The seed** (`indexSeed.ts:179-231`)
- Paths with no row or a changed stat are reread and reindexed (`:200-222`). `reindex` produces `HeadingRenameSeen` (`:123-142`).
- Vanished paths are pruned at `:224`.
- A cold index returns `NO_REREAD` (`:226`).

**Generation check**
- `INDEX_GENERATION = 15` (`ddl.ts:3`).
- When the stored generation is stale (`!==`), every index table is dropped (`:83-91`). The next seed then finds `indexed` empty and returns `NO_REREAD`.

**The heading-rename lane today**
- **Notice:** `reindex`.
- **Owe:**
  - Live: `oweRenames`, gated on `origin === 'watched'` (`fileEvents.ts:281,292-294`).
  - At open: `handlers.ts:102-103`.
  - At watcher restart: `missedEvents` (`settle.ts:173-178`).
- **Pay:** a loop ahead of the walk (`settle.ts:127-132`) calls `cascadeSeen` (`fileEvents.ts:297-309`), which runs `renameCascade` and `oweCascade` and only logs a failure (`:307`).
- **In-app:** the `renameHeading` op runs the cascade itself (`mutate.ts:93-94`).
- `away()` leaves debts owed while an open is in progress (`settle.ts:126,134`).
- The drain carries `stamp`, `walk`, `whole`, and `renames` forward (`:137-139`).

**Own-event skip**
- `relocate` locks the source path, records both ends as echoes, then calls `noteOwn('move')` (`atomicWrite.ts:62-75`). That reaches `applyOwn`, then `applyEvents` (`settle.ts:36-51`).

**Serialization today**
- Settles are serialized by `inTurn` (`settle.ts:57`), but a batch's `applyEvents` runs outside it (`:199-205`).
- `withWriteRoot` holds no lock and settles in its `finally` (`Contract/handlers.ts:99-111`).
- `underContexts` is `lock(contextsDir)`, and its `finally` awaits `payOwedWalk` (`mutate.ts:73-80`).
- `serializeSchemaOp` is `lock(nexusDir)` (`propertiesRegistry.ts:128-130`). The settle already takes it inside its turn (`settle.ts:145` → `optionOps.ts:94-96`).
- Locks reject re-entry (`Desktop/Platform/fileLock.ts:7-16`).
- No gate covers rename, move, delete, or create.

**Remint baseline**
- It's written only at open (`remintLedger.ts:90-96`), so it isn't usable as a before-state. The predecessor was right.

**Drift from Scout Findings**
- `stores.ts:47` is now `:49` (with uses at `:88` and `:95`).
- `stores.ts:147` now sits inside `readPageRelations` at `:133-157`.
- `nexusSlice.ts:237-238` is now `:238-239`.
- `land.ts:122-141` is now `:123-143`.
- `mutate.ts:73-81` is now `:73-80`.
- Every other cited line I re-checked holds. `settleBatch` still captures no pre-batch tree.

###### 2. Recommendations

###### 2.1 Pairing an Outside Move (E-4)

**Where the old ID comes from:** the index's `page_values` row (path, `'ID'`), read by primary key. Reuse the existing `readPageRelations([rel], ID_KEY)` (`stores.ts:133-157`), which `matrixGraph.ts:19` already uses. A narrower read would be a third reader of `page_values`. The held tree can't serve the closed-app case, so the index serves both lanes.

**State:** two fields on `Owed` (`fileEvents.ts:93-109`).

- **`vanished: Map<id, oldRel>`**
  - Written by a watched page `unlink`: `deindexPath` reads and returns the ID before `removePathIndex`. `indexEvent` records it only when `origin === 'watched'`, mirroring `:281`.
  - Also written by the seed's prune.
  - **Keep-first:** in one batch *unlink A, add B, unlink B, add C*, B isn't in the tree at settle, so C pairs A→C. Without keep-first, C would pair B→C against a before-world that never held B.
  - It joins the drain's survivors at `settle.ts:139`.
- **`arrived: string[]`**
  - Pushed in `applyEvents` for a watched `add` whose path had no index row before the event. That's one primary-key `readIndexedStat`, taken before `indexEvent`; the push happens after `applyOne`.
  - The test must be index-based. `addDir` → `applyFolder` places every child before the children's `add` events arrive (`:334-360`), so a "the tree didn't hold it" test misses every page of a renamed folder.
  - The push shares a synchronous segment with `owed.walk` being set (`:658-664`). So a concurrent reply settle never sees an arrival ahead of its placement or its owed walk.
  - **The `'later'` case:** the fresh test is taken on the first pass only (the replay skips indexing), so the push happens whatever `applyOne` answers. The batch's replay places the page before the batch's own settle; only a reply settle landing in between can miss it. That's narrow, so disclose it rather than guard it.
- **What records nothing:**
  - A late echo of an own folder move finds its rows already renamed.
  - `applyMove`'s own fallback is excluded by the origin gate, so an in-app delete or restore never reads as an outside move.

**When an entry is forgotten**
- Consumed on pairing.
- Consumed when `from === to`, the temp-file save (*unlink X, add X*). That's never a move and never a collision, which is E-3's ordering at work.
- Dropped on a root switch (`fileEvents.ts:129-132`).
- Otherwise it lives for the session. A deleted ID that reappears later (Finder Put Back, git checkout) is correctly a move.

**No time limit or occupancy guard, if** the re-spell's world can hold two pages at one normalized path, which B-3 already needs. Take A leaving X, B being created at X, then A arriving at Y: the before-world puts A beside B, so links to X read Ambiguous and are left alone. Otherwise the fallback is one line: drop a pair whose `from` the tree now holds.

**Rejected alternatives**
- Pairing inside `indexEvent`: an extra read per add, and it races a concurrent settle.
- Tree-only sourcing: four hooks, no catch-up, and an O(N·k) cost from `pagesByPathOf` being rebuilt per unlink.
- The remint baseline: stale.

###### 2.2 Owing and Paying

One settle step, run after the walk:

```
for each arrived rel:
  id = liveIdIndex(root).get(rel)            // pagesByPathOf memo (heldPages.ts:18-21, record.ts:75), already built per settle by valueChangesOf (settle.ts:82)
  if no id → skip                            // root-level loose file, unreadable, not placed
  from = vanished.get(id); vanished.delete(id)
  if from === rel → skip
  if from → change {id, from, to: rel}                          // MOVE first (E-3)
  else if pageIndexOf(tree).holders(titleFromPath(rel)).some(p => p.id !== id)
       → change {id, from: null, to: rel}                       // COLLISION candidate
```

- **The call:** run the re-spell under the gate with `before` = the tree's pages, each moved ID put back at `from` and each arrival removed. Then `oweCascade` and `console.error` the warning, mirroring `fileEvents.ts:306-308`.
- **Cost when nothing arrived:** a length check.
- **Placement:**
  - Pay both outside debts (heading renames, then arrivals) after the first `walkWhileOwed`, then walk once more.
  - The trailing walk still serves the reason given in the `settle.ts:127` comment.
  - `away()` still returns before the drain, so both debts stay owed.

**What the re-spell function must accept (to coordinate with that scout)**
- **Input:** a before-world plus a mapping, where an arrival is `from: null`.
- **Collisions from moves:** collisions also come from moves (an outside rename onto a held title, or Obsidian's Untitled→Notes flow). So its candidate set must include the destination title's bare mentions (`queryMentions`), not only the old path tails.
- **No settle waits:** it must never await `settleNow` or `payOwedWalk`, or it deadlocks under the gate.
- **Idempotence:** it's idempotent by its own rule. A link already spelled to the new path doesn't resolve to the page in the before-world, so it's left alone.

**One before-world builder, not a third**
- `frozenWorld` (`heldPages.ts:47-53`) is already "tree pages plus changes".
- One `worldOf(pages, relocations: Map<id, path|null>) → PageIndex` should serve:
  - the settle (before from after),
  - the in-app ops (after from before),
  - the restore (F-4/F-6).
- It's O(N) in memory, once per payment, and never per event.

**No folder logic, anywhere**
- Live, chokidar's order (§1) means each page records and pairs on its own.
- Closed-app, each path is pruned and freshly read.
- Per-page pairs feed Mechanism Fork 3's per-page tail queries.

###### 2.3 Closed-App Moves

**The seed already holds both halves.**
- **Vanished:** `indexed` keys not in `seen`. Read their IDs before the prune at `:224`, via `db0.readPageRelations(gone, ID_KEY)`. It has to be the store handle (`:183`), because the `readyDb` gate (`contentIndex.ts:91-93`) blocks the wrapper before `markIndexReady`.
- **Arrived:** reread paths not in `indexed`.
- `SeedReread` (`:168-175`) gains `vanished` and `arrived`; `NO_REREAD` gets empty ones.
- **Owing:** both owe sites (`handlers.ts:102-103`, `settle.ts:175-176`) call one new `oweReread(root, reread)` in place of `oweRenames(…renames)`.
- **Pairing:** the settle's one step serves live and catch-up alike, and the index layer stays free of move semantics.
- **Timing at open:** `away()` defers payment to the first settle after adoption, as it does for renames. The watcher-restart seed then finds nothing new.

**The one-time limit is confirmed.**
- A generation bump drops the tables (`ddl.ts:83-89`), so `indexed` is empty and the seed returns `NO_REREAD` (`indexSeed.ts:226`).
- Disclose: it also hides closed-app collisions at that open, and it applies to the first-ever open.

**The reseed after an index failure** (`settle.ts:166-170`) keeps owing nothing, for the renames' own reason (`:165`).
- An own move or create whose indexing failed would read as outside.
- An arrival re-spell isn't idempotent against bare links written since.
- Result: an unpaired window where links go phantom, as they do today, but never a false collision, because the reseed indexes the new path so its add isn't fresh.
- `readyDb` changes only at `markIndexReady` (`contentIndex.ts:44-48`), so the gate doesn't bite during a reseed.

###### 2.4 E-3: External Collisions

- **Where it sits:** the same loop. The vanished lookup runs before the title test.
- **Why the pipeline order holds:**
  - The unlink is emitted at once; the add waits for `awaitWriteFinish`.
  - Batches apply in emission order.
  - `drainBatch` awaits its own settle before the next batch (`watcher.ts:173-191`, `settle.ts:209`).
- **Copy-then-delete:** this reads as a collision, then a delete. That's consistent with E-3 ("an ID that just vanished"), but say it in the plan.
- **Rescope and Try Again:** pages they bring into reach arrive through the catch-up seed as `arrived`, so they're covered for free.
- **In-app collisions** stay inside their ops under E-5, using the same function with `from: null`.

###### 2.5 E-5/E-6: The Gate

**Recommendation: (a).**
- **The lock:** `serializeAddressOp(root, fn) = machine().lock(root, fn)`, the twin of `serializeSchemaOp`, living in `settle.ts`. `mutate.ts` already imports from it.
- **The key:** the Nexus root. Nothing locks it today; `nexus:rename` renames it unlocked (`handlers.ts:151-161`).
- **Gated `dispatch` arms:**
  - createPage
  - rename (page including `fromCreate`, and folder)
  - movePage and moveSet
  - delete (all kinds)
  - restore
- **`nexus:rename` stays out:** it re-targets the session and changes no root-relative address.

**Lock order**
- Ops take contexts, then the gate, then file locks.
- The gate goes **inside** `underContexts`'s `fn`. Its `finally` awaits `payOwedWalk`, an `inTurn` step (`mutate.ts:78`), and holding the gate across it while a settle ahead waits on the gate would deadlock.
- The payment takes the gate, then per-file locks only (`governedSweep.ts:40`), and never the contexts lock.

**Why neither existing lock works**
- `contextsDir`: the same deadlock.
- `nexusDir`: `restoreOp` takes `serializeSchemaOp` internally (`spend.ts:140` → `restoreProperty.ts:29`), and the lock rejects re-entry.

**Precedent and constraint**
- Precedent for the settle taking a host lock inside its turn: `settle.ts:145`.
- The constraint the plan must state: nothing inside a gated op awaits the settle turn.

**Against (b)**
- `settle()` returns only `{rescope}` (`:162`). The in-op warning would need new plumbing, and E-5 keeps that notice in the op.
- Decisive: an op's `relocate` can still start mid-sweep, since ops run outside `inTurn`, and a skipped linker loses its links. So (b) needs the gate anyway.
- Running ops inside `inTurn` deadlocks on `payOwedWalk`.

###### 2.6 Cost

- **Own body saves and outside changes:** nothing new.
- **Watched add:** one primary-key stat read.
- **Watched page unlink:** one path-bounded `readPageRelations`.
- **Seed:** one read over the pruned paths.
- **Payment:** one in-memory world build. The sweep stays index-queried.
- **k-page folder rename:** O(k) queries, with no walk. `fileEvents.test.ts:417-433` stays true.

###### 3. Additions and Removals

**Additions**

| Addition | Lines | What it buys |
|---|---|---|
| `Owed.vanished` / `.arrived` and their `nothingOwed` entries | ~+4 | The state |
| `deindexPath` returns `[id, rel]` | ~+3 | The live vanished ID |
| Local `idsAt` helper over `readPageRelations` | ~+4 | One ID read, shared by unlink and prune |
| `indexEvent` unlink records, keep-first | ~+2 | Records watched unlinks, keep-first |
| `applyEvents` fresh test and push | ~+3 | The live arrived half |
| `SeedReread` fields filled before prune | ~+5 | Closed-app half |
| `oweReread` | ~+5 | One owe for every seed result |
| `payArrivals` beside `cascadeSeen` | ~+18 | Pair, order, pay, log |
| `settle()` pay phase, trailing walk, drain survivors | ~+3 | Placement |
| `serializeAddressOp` and `dispatch` wrapping | ~+6 | E-6 |
| `worldOf`, shared and counted in the re-spell/Trash lanes | ~+0–6 here | The before-world |

**Removals**
- The two `oweRenames(root, x.renames)` call sites (−2/−3).
- The heading loop moves; that's not net.
- Nothing else is removable in this lane.

**Rough total:** +52 to +60 added, −3 removed.

###### 4. What the Change Makes False

**Docs**
- `.claude/Features/DesktopPM.md:22`: "Identity survives an external rename…" and the catch-up sentence.
- `.claude/Features/ConnectionsPM.md:28`: describes the outside lane for heading renames only.
- `.claude/Features/ConnectionsPM.md:30`: the last sentence.
- `.claude/Features/CorePM.md:87`: the cascade policy gains the gate.

**Comments**
- `settle.ts:1` (header)
- `settle.ts:127` (if the loop moves)
- `settle.ts:136`
- `settle.ts:165` (reseed)
- `settle.ts:172` (`missedEvents`)
- `fileEvents.ts:92` (`Owed`)
- `fileEvents.ts:296`
- `indexSeed.ts:168` (`SeedReread`)
- `mutate.ts:72`

**Tests**
- `indexSeed.test.ts:216` and `settle.test.ts:643` assert the literal `{ db, rels, renames }` shape.
- New siblings needed:
  - `handlers.test.ts:443` → a closed-app move.
  - `settle.test.ts:1108` → a catch-up move.
  - `fileEvents.test.ts:417-433` → keep no-walk and add a link assertion.
  - A split-batch pair.
  - Keep-first chaining.
  - A temp-file save that isn't a collision.
  - An own-folder-move echo that records nothing.
  - Copy-then-delete.
  - Two ops serialized under the gate.

###### 5. STOP Scan

Nothing contradicts the Decisions doc. Three notes:
- **E-4 ("the content index notices"):** the index notices both halves, the vanished row and a fresh path. The tree only supplies the arrival's identity and the after-world at payment.
- **E-5 vs E-6:** option (b) would undercut E-5; (a) satisfies both.
- **E-4's one-time limit** also covers closed-app collisions at that open, and the reseed window is extra. Both are disclosures, not decisions.

###### 6. Beyond My Lane

- **Sync double re-spell:** `landRename` (`Core/Sync/Arrival/land.ts:123-143`) uses `machine().rename` with no `relocate` and no echo. The receiving device pairs it as an outside move and re-spells too: idempotent, but doubled writes that can conflict. Making Sync's landed renames own moves fixes it.
- **Obsidian's own link rewrite on rename** races the payment on linker files. That's a lost-update window with a heading-cascade precedent.
- **Heading cascades** (`renameHeading`, `cascadeSeen`) stay outside the gate. That's existing behavior; gate them only if wanted.
- **Optional:** group `renames`, `vanished`, and `arrived` as one `Owed.seen` so the drain carries a single survivor.
- **Stale `excluded_folders`:** they still go stale after an outside folder rename (`followExcludedFolders` is in-app only). Fixing it needs folder logic; leave it.

---

### Round 4 — The Trash Record and Repair

**MODEL:** `opus-high`

#### Brief

You're a read-only planning scout for Pommora (an Electron + React + TypeScript note app; a "Nexus" is a user folder of Markdown pages that carry an `ID`; deleted pages go to a hidden Trash folder inside the Nexus). Edit nothing, commit nothing, run no app. You may run `git`, `grep`, and read files.

**Project root:** `~/The Studio/Projects/Project Pommora` · **HEAD:** `14da3f152`.

###### Read First
- `.claude/Planning/Path Links/BRIEF.md`: the owner's principles. They govern your recommendations.
- `.claude/Planning/Path Links/Path Links — Decisions.md`: ratified intent, authoritative. Your lane: **F-1 through F-6**, and E-3's restore collisions.
- `.claude/Planning/Path Links/Path Links — Scout Findings.md`: *Round 2 — Cascade and Rewrite Reuse* (lines 986-1239) covers the Trash options; *Round 1 — Cascades* (500-699) for context. The Decisions doc wins where they differ. Treat every citation as a lead to re-verify at HEAD.

###### Your Lane: The Trash's Record and Repair
Re-verify at HEAD: `Core/Trash/{spend,holdings,restoreScrub}.ts` and the rest of `Core/Trash/`, `Core/Nexus/cascade.ts` (`deleteCascade`, `parkLinks`), `StrippedLink`, `scrubReturning`, the restore refill, the Restore Links On Deletion setting, parking into a trashed page's bundle, and the empty's hand-off. Read commits `031952078`, `e605d9b15`, `3f0b84bf1`, `3e0907013` for the intent behind each piece.

Design, with evidence:
1. **F-4 re-keying:** today's machinery keys on a page's title. Re-key it to the page each value named (by ID), through the same resolution the re-spell uses (another scout is designing the depth-keeping re-spell function that takes the before-world and an old→new page mapping). What exactly changes in `StrippedLink` and every reader of it?
2. **F-6, scrub and refill as one rule:** the delete records what each outbound link named (it already reads every page it moves, so recording costs no extra read); at restore, a recorded link re-spells to the current name of the page it named, by that page's identity, and only a link whose page is truly gone is dropped or parked. Show how today's two paths (the returning page's own Link values scrubbed; other pages' values refilled) collapse into one, and what's deleted.
3. **F-5, the returning page's stale links:** a link in the returning page's body and frontmatter whose target moved or was renamed while it sat in the Trash should follow its target. The page leaves the Trash first and is rewritten after, so its body is never touched while trashed (F-3). Where do the outbound targets get recorded (by ID) at delete time, and is that record durable (the database is a regenerative index and can't hold anything that must survive sync; the bundle in the Trash folder can)?
4. **F-2:** a page restored somewhere new because its old folder is gone counts as a move under the move rule; find where the restore picks its landing place and how it hands the old→new mapping to the re-spell.
5. **E-3 restore collisions:** a restore that gives a title a second holder re-spells bare links to the original holder into its full path, same rule as an in-app create or rename.
6. **F-1:** confirm a folder delete trashes its pages and links to them read as phantoms until restore.

###### Principles for Your Recommendations
- Simplest thing that works wins; a simple design and a robust one reaching the same result aren't equivalent.
- Reuse before invention: name every function, field, type, or file you'd add, and say what already exists that does it or nearly does. A near-duplicate gets changed to allow reuse, not joined by a third.
- YAGNI. Removal before addition; the merges count.

###### Report (dense, file:line at HEAD throughout)
1. The verified chain, flagging any Scout Findings citation that drifted.
2. Your recommended approach for each numbered item, with alternatives weighed and why you chose.
3. Every addition named with what it buys, every removal named; rough added/removed production lines.
4. Every doc (`.claude/Features/*.md`), comment, and test the change makes false.
5. Anything contradicting the Decisions doc, marked **STOP**.
6. Insights, concerns, or opportunities beyond your lane, briefly.

#### Report

##### Trash Lane Report: Record and Repair (HEAD `14da3f152`, read-only, nothing edited)

###### 1. Verified Chain and Citation Drift

The lane's citations hold at HEAD. Drift is minor, and one earlier claim turned out wrong.

**Where each piece lives:**
- **Delete:** `delete.ts:36` reads the before-tree (`liveTreeOf`). `:87` `gatherContentRecord` reads the page for its ID (`gather.ts:31`), page kind only. `:89-92` gets titles: `titleFromPath`, or `folderCorpus` for folders, which only lists files and reads none. `:94` relocates into `.trash`. `:97` runs `deleteCascade(root, abs, titles)`. `:98-103` rewrites the record with `links`.
- **Strip:** `cascade.ts:82-159`. The `gone` titles come from `titleHeldOutside` (`:89-91`), which reads `heldTreeOf` after the relocate, and `goneEntry` uses `gonePageEntry` with a title `holds` (`:100-101`). `StrippedLink {page = holder ID, property, value}` is at `cascade.ts:43-47`, and its zod schema at `record.ts:24-28`.
- **Restore:** `spend.ts:131-282`.
  - Placement is `resolveRecord` (`resolve.ts:31-93`): the parent is found by container ID against the current tree, and `freeName` only checks siblings (`:82-90`). When the parent is gone it refuses, and the Trash frame then offers destinations (`TrashFrame.tsx:168-183`) that `withDestination` applies (`spend.ts:95-116`).
  - The title-keyed pieces: `was`/`landed` (`:171-172`, with `landed === was` for folders), `frozenWorld(tree, landing titles)` (`:173-178`), and the scrub (`:185`), which runs **before** the relocate (`:205`).
  - The refill is `rewriteConnections(l.value, was, landed)` (`:265`), gated by Restore Links On Deletion (`:255`).
- **Parking:** `parkLinks` keys by title through `trashedTitles`, newest bundle wins (`holdings.ts:69-94`). `trashedHolders` is already keyed by ID (`:96-126`).
- **Empty:** `spend.ts:82-89` strips by title, then re-parks the record's own rows plus the stripped ones to a namesake.
- **`Frozen.holds` readers:** `propertyValue.ts:137-160`, `contextResolve.ts:111-130`, `assignment.ts:49-57,91-101`, `restoreProperty.ts:57-71`, `restoreScrub.ts:41,55`, `cascade.ts:101`.

**Drift:**
- Round 1 cites `record.ts:22-26`; it's actually `:24-28`.
- **Round 2 was wrong** that parking by name "needs a `path` on the content record". The delete-time path is already durable: `mintBundle` files the bundle under the entity's own folder chain (`bundle.ts:13-20`, documented at `NexusRecordPM.md:8`), and `frozenCrumbs` already decodes it (`trashRows.ts:20-28`). No new field is needed for "where was this then".
- **F-1 is confirmed.** A container delete moves the whole folder into `.trash` (`delete.ts:94`). `.trash` is hidden (`nexusPaths.ts:5`, `exclusion.ts:17-24,77-82`), and a move into the Trash reaches the tree as an unlink (`fileEvents.ts:586-591`). Its pages leave the page index, so body links read as phantoms until a restore, and Link values are stripped.

###### 2. Recommended Approach

**The shape:** every Trash arm becomes "re-spell against a before-world rebuilt from what's durable", using the existing `buildPageIndex` over plain page lists. I assume the re-spell scout's function looks like `(text, before: PageIndex, moved: ReadonlyMap<id, ConnPage>, after: PageIndex)`. If their shape differs, only that seam adapts.

The before-world needs real paths, not just IDs. E-2's rule ("leave the link alone when the page's tail is unchanged byte for byte") compares the page's old tail with its new one. Without the old path, `[[alpha#Intro]]` would be rewritten to `Alpha` on every restore, breaking `trashRecovery.test.ts:405`.

**F-4, re-keying — `StrippedLink` doesn't change:**
- I recommend **against** adding `to`. Every value a bundle holds names one of that bundle's pages by construction: the delete strips values that named its pages, and parking puts values where a page resolves them.
- At restore, each value resolves against `left = buildPageIndex(returning pages at their delete-time paths)`, which gives the page's ID. The delete-time path is the bundle's folder chain plus the artifact name and its inner path. The IDs come from the returning files, which the restore needs anyway.
- This gives the same exactness as `to`, with no schema change and nothing to handle for old bundles. (`~/NexusOS/.trash` and `~/Test/.trash` hold 0 bundles with `links`, but the point stands.)
- What `to` would buy: one rare case. A target that was renamed and then trashed while the linking page also sat in the Trash would park correctly instead of being dropped, which is today's outcome too. It would cost an optional field, filling it in `deleteCascade`, and a preference branch in `parkLinks`. Not worth it.

**`deleteCascade` changes signature** to `(root, abs, world: ConnPage[], gone: ConnPage[])`:
- `before = buildPageIndex([...world, ...gone])` and `after = buildPageIndex(world)`.
- A value is stripped when `before` holds its name and `after` doesn't, expressed through `gonePageEntry` with a `holds` closure.
- Candidate files come from `queryMentions` over each path tail of each gone page that `after` doesn't hold.
- **Delete** passes the pre-delete tree split into what's outside and what's under the deleted path (from `delete.ts:36`). That fixes the trap of reading the tree after the delete (`cascade.ts:92`), and `folderCorpus` leaves `delete.ts`.
- **Empty** passes the live pages plus the emptied pages at their delete-time paths, built from the bundle chain and `contentPages` with no read.
- `cascade.test.ts:568` and `:578` stay true.

**Parking:** `trashedTitles` becomes one Trash index, `buildPageIndex` over every trashed page at its delete-time path. The page's "ID" is its bundle path, so no file is read. `parkLinks` takes `holders(name)` and keeps the existing newest-bundle tie-break, so `:563` stays true. Property restore, cache re-assign, and the empty strip have no delete-time ID, so name resolution is the one parking rule everywhere. That keeps `:628` true.

**F-6, scrub and refill as one rule:**
- **The rule:** a link resolves through its recorded before-world to a page ID. If the after-world has that ID, the link re-spells to the page's current name. If not, it's gone: a Link value is dropped or parked, and a body link stays a phantom.
- **The returning page's own Link values (scrub):** the scrub's `Frozen.holds` becomes identity-aware. If the recorded snapshot (below) resolves a name to a page, the value is held exactly when that page's ID is still in the after-world. Otherwise it falls back to today's name check. This decision uses the written name, before any re-spell. The scrub stays **before** the move with its refusal semantics (`restoreScrub.test.ts:162`). Only the drop happens there, and F-3 explicitly keeps that strip.
- **Other pages' values (refill):** `rewriteConnections(value, was, landed)` becomes `respell(value, left, moved, after)`. `refillValues` then checks them against `frozenWorld`'s after-world.
- The two sites still write different files, so they can't share one sweep. They collapse onto one decision and one after-world instead.
- **Deleted:** `was`/`landed`, the title arrival set, and the restore's `rewriteConnections` call.

**F-5, the returning page's stale links:**
- **What the delete records:** an optional `targets: {id, path}[]` field on content records. It's the union of `before.holders(k)` for every link key the deleted pages use. Keys are scanned with the index's own scanners, `linksIn(body)` and `valueLinks(frontmatter)`, with no own title, so a bare `[[#H]]` records nothing.
- **Why every holder, not just the resolved target:** recording every holder reproduces the delete-time status exactly for those keys. Recording only resolved targets would let an ambiguous bare `[[ClaudeMD]]` resolve to whichever twin happened to be recorded for some other link.
- **Where it's recorded:** in `gatherContentRecord`, before the relocate, against the before-tree's `pageIndexOf`.
- **Is it durable:** yes. It lives in `_record.json` inside the bundle. Nothing goes in the database.
- **At restore:** after the relocate, a `respell(returning files, before = buildPageIndex(targets), moved = the after-world's pages by ID, after)` call updates body and frontmatter links. It reports through warnings like other cascades. Old bundles without `targets` re-spell nothing and use the name-only scrub, which is the same rule applied to an empty snapshot.
- **Alternative rejected:** `readPageRelations` (`contentIndex.ts:91`) would need no file reads, but it excludes `embed` rows (`Desktop/Store/stores.ts:137`) and needs a second path for when the index isn't ready.

**F-2, a restore landing somewhere new:**
- The landing comes from `resolveRecord`: a renamed parent is followed, `freeName` can step a name aside, and a user-chosen destination comes through `withDestination`. All three count as moves.
- The mapping per returning page is `{id, from: bundle chain/artifact/inner path, to: dir/finalName/inner path}`.
- After the relocate, one move-lane call: `before = buildPageIndex([...pagesOf(tree), ...left pages])`, `moved` = the returning pages whose path changed, `after`, and candidates from each moved page's delete-time path tails. It's skipped when nothing moved.
- A combined before-world here is only correct alongside a **separate** collision call (E-3). If they were merged, a name held by both a live page and the returning page reads ambiguous and the collision is missed.

**E-3, restore collisions:**
- Hand the collision lane its arrivals: the landing titles that `pageIndexOf(tree)` at `:152` (before landing) shows held by exactly one page.
- The restore reply gains `cascade` (`MutateOutcome.cascade` already exists) to carry the warnings.

**What isn't gated:** Restore Links On Deletion keeps gating only the refill, per commit `3e0907013`. The F-5, F-2, and E-3 repairs always run.

###### 3. Additions and Removals (rough production lines: about +68 / −43, net about +25)

**Removed:**
- `titleHeldOutside`, 8 lines, once the rename lane drops `rename.ts:38`.
- `trashedTitles` (13), replaced by a 9-line Trash index.
- The gone-title set and `goneEntry` (`cascade.ts:89-91,100-101`).
- `was`/`landed` and the `rewriteConnections` import (`spend.ts:23,171-172,265`).
- The title arrival block (`:173-178`).
- The empty's `recorded` hand-off and its comment (`:82,88-89`).
- `folderCorpus` titles and their import (`delete.ts:7,89-92`).
- Three lines of `frozenCrumbs`.

**Added:**
- `targets` on the record schema (+2).
- The outbound snapshot in `gather.ts` (+10).
- `liveDirOf(bundlePath)`, shared with `frozenCrumbs` (+3).
- `pageIdsOf` → path/ID pairs, two callers updated (+1).
- The new `deleteCascade` before/after (+6).
- `frozenWorld(tree, landing: ConnPage[], recorded: ConnPage[])` with identity-aware `holds` (+4). Its after-world should be the same one handed to the re-spell; whether it's returned or built once in the caller is the planner's call.
- The restore's returning read and indexes (+10), three calls (+7), and the reply's cascade (+2).
- The empty's synthetic page list (+2).

###### 4. Made False

**Docs:**
- `ConnectionsPM.md:22`: main's title-index checks.
- `ConnectionsPM.md:30`: the last sentence, and the restore sentence, which should gain the re-spell.
- `NexusRecordPM.md:12`: "unless a page outside it still holds that title… relates to those titles".
- `NexusRecordPM.md:14`: "rebuilt under the landed title", and "foreign frontmatter and the body never move". The body's links now follow after landing, by design.
- `NexusRecordPM.md:16`: "unless another page holds that title, and hands the values its record kept to a namesake".
- `NexusRecordPM.md:10`: the Bundle should name `targets`.

**Comments:**
- `spend.ts:82`
- `holdings.ts:1,69`
- `heldPages.ts:1,37`
- `cascade.ts:81`
- `propertyValue.ts:136`: `holds` now answers names.

**Tests:**
- `heldPages.test.ts:83` goes.
- `heldPages.test.ts:90` changes shape.
- Every `deleteCascade(root, abs, ['Target'])` call in `cascade.test.ts:~540-600` changes signature; the meanings stay.
- `trashRecovery.test.ts:580` (hand-off to a namesake) becomes false.
- These stay true: `:405`, the `[[Alpha (2)]]` cases, `:436`, `:458`, `:470`, `:563`, `:628`, `restoreScrub.test.ts:162`.

###### 5. Conflicts With the Decisions

- **STOP (confirm with Nathan):** F-4 names "the empty's hand-off" as machinery to reuse. Re-keyed to the page each value named, it has nothing to do. The recorded rows named the pages being emptied, so they're permanently gone, and F-6 says to drop them. I recommend deleting the hand-off. Values stripped at empty time still park by name.
- **Correction (Working Rule 2):** F-6's "the delete already reads every page it moves" is true for page deletes only (`gather.ts:31`). Set and Collection deletes read none (`delete.ts:89-92`), so recording costs one read per page inside a deleted folder.
- **In-flight judgment:** gone Link values still drop before the move, keeping the refusal-retry semantics. Only rewriting happens after the move, which honors F-5's "rewritten after". Moving the drop after the move would split `scrubReturning` and its stamping of ID-less pages across two passes.

###### 6. Beyond the Lane

- **E-3 gap:** an arrival can also make a *partial-path* link ambiguous. `[[B/T]]` is ambiguous once `A/B/T` lands beside `X/B/T`, but E-3 only names bare links. Tell the collision lane.
- **Space and Context bundles:** their sidecar Link values go stale the same way. Putting `targets` on every artifact record would make the scrub one rule rather than pages-only.
- **Possible merge:** `trashedHolders` and the new Trash index walk the same `listBundles` × `contentPages` listing.
- **Renderer:** the restore notice and the Undo path must show the new `cascade` warning.

---

### Round 4B — Grammar, Reader, Resolver, and Every Drawing Surface

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions are cited by letter (A-1 … G-1). Read all of it.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 1 — Read, Resolve, and Draw", "Round 1 — Writers and the Picker" (its §The Naming Rule), "Round 2 — Read, Draw, and Pick Reuse" (§1, §2, §5), and §Mechanism Forks (Fork 2). Every citation there is a lead to re-verify at HEAD, not a fact: several were written before partial paths (A-4) were ruled in and before the Heading Opener revert landed.
4. `.claude/Features/ConnectionsPM.md` — today's behavior.

HEAD `14da3f152` reverted `§` as a link opener: `#` is the only heading opener inside a link (A-9). `INDEX_GENERATION` is 15; Path Links will bump to 17.

##### Your Slice: Grammar, Reader, Resolver, and Every Drawing Surface (Decisions A-2, A-4, A-5, A-6, A-8, A-9, B-1, B-2, B-3; Open Item 1; Fork 2)

Files: `Core/Connections/connections.ts`, `links.ts`, `linkValue.ts`, `pageIndex.ts`; `Core/Paths/posix.ts`, `caseFold.ts`, `names.ts`, `urlPath.ts`; draw: `Core/MarkdownPM/Engine/tokens.ts` (`linkToken`, `markerRanges`), `Core/MarkdownPM/Engine/decorations.ts` (link branches, the `Page § Heading` join, the aliased reveal via `targetSpan`), `Core/MarkdownPM/Tables/cellStatic.tsx` (its join), `Core/MarkdownPM/Engine/detect.ts` (`loneEmbedTitle`), `Core/MarkdownPM/Embeds/embedWidget.tsx` (the resolve at ~397), `Core/Matrix/matrixInput.ts`; `Core/MarkdownPM/Input/edits.ts` (`headingHash`, `partOf`, `slotAt`, `openLinkAt`), `Core/MarkdownPM/Autocomplete/acQuery.ts` (`armedBy`).

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **A-4 partial-path reading inside `PageIndex`.** Design `holders(key)`/`resolve(key)` for a key holding `/`: a page whose full normalized extension-free path equals the key wins first; otherwise the pages whose path ends with `/` + key; several = Ambiguous, none = Phantom. Titles can't hold `/` (verify `holdsName`, `titleFromPath`), so the key's last segment is a title: is "holders of the last segment, filtered by path tail" enough, with one normalized path string per page computed at build? Cost per resolve and per build (both processes build the index on every tree change; the host never opens a picker). Where does `.md` stripping belong in that key?
2. **B-3 case variants:** two files in one folder differing only by case or Unicode form both answer one normalized path. Does the design above already read them Ambiguous? Show why.
3. **A-5 and Open Item 1, `.md` reading.** Today `targetTitle` (markdown) strips `.md`; the wiki slot doesn't. A-5 wants both syntaxes to read `.md` on the page half (before the `#`) through one rule, never write it, and `wikiTitle` (File values, banners, covers: `[[Report.md]]`) must keep reading `Report.md`. Weigh: (a) strip at resolution time, when the lookup key is built (so `LinkTarget.title` stays as written in both syntaxes and `wikiTitle` is untouched) versus (b) strip in the reader with a `wikiTitle` carve-out versus anything else you find. For (a), list every consumer of a markdown `LinkTarget.title` that relies on the stripped title today (`defaultLabel` for `[](Notes.md)`, `linkDisplayText`, `repeatsTarget`, `carry`, the picker's shown-text check, `pageLabel`) and what each would show. Recommend the cheapest one-rule shape.
4. **Fork 2, the occurrence's shape and `PageName`.** The lean is that the occurrence's `title` span stays the whole page half (`A/Notes`), split at its last `/` only where the basename is drawn or compared. Two ways to carry that into `PageName`: (i) `PageName` keeps `{ title, heading? }` with `title` the whole written page half, plus one basename helper (name it) used at the compare-and-draw sites (`defaultLabel`, `repeatsTarget`, `namesTarget`/`carry`, `keepsAlias`, `linkDisplayText`, `pageLabel`, the two `§` join sites, `tokens.ts` content start, `shownAlias`), so `pageLinkText`, `spellsAsWiki`, `resolve`, `readOccurrence`, and the picker's slot query change nothing; or (ii) `PageName` gains `folder?` with `title` the basename, as round 1 proposed. Count the touch sites of each at HEAD and recommend. Check `expressibleInLink` against a whole page half holding `/` (A-6: an unspellable folder segment falls back to markdown form through the same fallback a title takes).
5. **B-1 drawing title only.** With the whole-half span, does `linkToken`'s content start plus `markerRanges` already fold `[[Folder/Sub/` into the hidden leading marker in the editor and resting cells, at rest and revealed, aliased and not, both syntaxes? What do the `Page § Heading` join sites need? What does a phantom path link draw under Display Unresolved Links As Plain Syntax? What does the aliased reveal style for the folder?
6. **Embeds and the Matrix.** `embedWidget.tsx` resolves the raw `loneEmbedTitle` through `resolve`; `matrixInput.ts` resolves `link.target`. Do both read path links with no change once `resolve` is path-aware? Any second reader to fold?
7. **A-9 state at HEAD.** Confirm `#` is the only opener in the grammar, `§` is ordinary text in a link slot, `names.ts` refuses `|#§`, `headingHash` turns a typed `§` into `#` in a title slot (does it now cover a markdown destination holding `/`, since `namesPage` will admit `/`?), `armedBy` gates the prose `§` arm, and which standalone fixes the revert kept (`UNSPELLABLE`, `literalOrBracketAt`, `inUrlRun` in `markdownCode.ts`, the linkSettle emptied-heading tidy).
8. **`namesPage` relaxing** (`links.ts:38`): what each address shape reads as afterward (`example.com/x`, `v1.2/Notes`, `docs/file.pdf`, `./x`, `../x`, `/abs`, `example.com/page#sec`), given page-first resolution and `isValidLink`. A-4 says `./` and `../` aren't read. Smallest form.
9. **What becomes false:** every `.claude/Features/*.md` line, comment, and test assertion in your slice, with file:line.

##### How to Assess
Simplest thing that works wins; reuse before invention (hand-rolled parallels are this codebase's most common avoidable defect); YAGNI; no O(N) or allocating work on a keystroke, caret move, or decoration build; one owner per rule; look for what can be removed. Review what's there rather than confirming the framing; if a prior scout's claim or a decision's stated "today" is wrong at HEAD, say so with evidence. Where you'd make a different call than the decisions imply, say so and why; settled decisions aren't re-litigated, but their mechanism is yours to propose.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, with signatures), and removals; then your recommended shape for the reader/resolver/draw end to end; risks as named sequences reaching a bad state; what becomes false; a rough line estimate (removed vs added, production code only).

#### Report

##### Path Links Scout: Grammar, Reader, Resolver, and Drawing (HEAD `14da3f152`)

I read the code and ran nothing. No files were edited.

###### Corrections to the Framing and to Earlier Scouts

- **The `§` stand-down isn't `armedBy`'s job.** `armedBy` (`acQuery.ts:30-43`) only arms on a single typed `§` under Automatic. The prose arm stands down inside links, addresses, and heading lines through `literalOrBracketAt` plus `headingParts` in `autocompleteQuery` (`autocomplete.ts:62-67`).
- **Round 2's `titleName(text, span)` helper and Round 1's `pageKey(n)` composer aren't needed.** `linkToken` already computes the content start once. The join sites can read `tk.contentRange[0]`, and `titleFromPath` (`posix.ts:80`) already exists as the basename helper. It also strips `.md`.
- **Round 1's "path links never produce Ambiguous" is false** under A-4 (several tails can match) and B-3 (case variants).
- **Round 1's claim that the joins need no change is false under the whole-half span.** Both join sites slice `tk.link.title`, which includes the folder (`decorations.ts:594`, `cellStatic.tsx:178`).
- **ConnectionsPM.md:36 already reads false at HEAD.** It says "Ambiguous links keep the bracket treatment in a muted tone", but an ambiguous link hides its brackets at rest: `decorations.ts:653-654` uses `hideMarker` unless open, and the resting cell draws only the content (`cellStatic.tsx:164ff`).
- **The Decisions' statements about today hold.**
  - Wikilinks admit `/` (`connections.ts:20`), and `writtenPage` keeps the raw slot (`linkValue.ts:71`).
  - `namesPage` refuses `/` (`links.ts:38-39`).
  - Markdown strips `.md` (`links.ts:68`); the wiki reader doesn't.

###### 1. Partial-Path Reading Inside `PageIndex` (A-4)

**What exists:**
- `holdsName` refuses `/`, `\` and NUL (`names.ts:14-17`), and `titleFromPath` returns a basename (`posix.ts:80`). So a key's last segment is always a title.
- `ConnPage.path` is Nexus-relative and keeps `.md` (`record.ts:58-61`; `pageIndex.test.ts:5-8`).
- `holdersOf` is the one lookup; `resolve` derives from it (`pageIndex.ts:44-53`).

**Yes: the title's holders, filtered by path tail, are enough. I'd compute the path lazily per holder rather than at build.**

```ts
/** A written page half, or a page's path, as the key both compare by: folded, its `.md` dropped. */
export const pageKey = (raw: string): string => stripMarkdownExt(normalizeTitle(raw))

const holdersOf = (raw: string): readonly ConnPage[] => {
  const key = pageKey(raw)
  const cut = key.lastIndexOf('/')
  const titled = byTitle.get(key.slice(cut + 1)) ?? []
  if (cut < 0) return titled
  const exact = titled.filter((p) => pageKey(p.path) === key)
  return exact.length ? exact : titled.filter((p) => pageKey(p.path).endsWith(`/${key}`))
}
```

**Cost:**
- **Per build:** zero added. Both processes rebuild the index on every tree change, and a per-page path map would add O(N) normalizing for a picker the host never opens.
- **Per resolve:** `stripMarkdownExt` adds one regex test to every resolve. A key holding `/` also costs one `lastIndexOf` and one `pageKey(path)` per holder of that title, which is usually one to three short strings.
- If the search fold (D-4) adds a per-entry location key to `candidates`' lazily sorted list, it should be this same `pageKey(p.path)` string, stated once.

**What falls out with no special code:**
- `./x`, `../x` and `/abs` read Phantom, because no stored path contains `.` or `..` segments or a leading `/`.
- `a/` reads Phantom, because `byTitle` skips `''` (`pageIndex.ts:37`).

**Where the `.md` strip belongs:** inside `pageKey`, so it applies to the page half alone. Headings never pass through it, which satisfies A-5's `[[File#Text.md]]` rule. `scan.ts:24` `titleKey` must use the same `pageKey`, so the relation rows and the cascade's queries agree with resolution.

###### 2. Case Variants (B-3)

They already read Ambiguous by construction. Take `A/Notes.md` and `A/notes.md`:
- Both titles fold to `notes`, so `byTitle` holds both.
- Both places fold to `a/notes`, because `normalizeTitle` lowercases and NFC-normalizes (`caseFold.ts:7-13`).
- `exact.length === 2`, so `resolve` returns `ambiguous` (`pageIndex.ts:51`).
- A bare `[[Notes]]` is ambiguous too, as today. NFD and NFC spellings collapse the same way.

No code is added for this.

###### 3. Reading `.md` (A-5, Open Item 1)

**Recommendation: (a), strip at resolution through `pageKey`, with the compare and draw sites going through `titleFromPath`.**
- `titleFromPath` already strips `.md` and takes the basename, so the `.md` rule costs no site beyond the ones Fork 2 (question 4) needs anyway.
- `targetTitle` drops its strip at `links.ts:68` (`return decoded`).
- `wikiTitle` (`linkValue.ts:132-135`) is untouched, and that matters: the asset map indexes every file under the asset directory, `.md` included (`assetMap.ts:13,27-30`), so a File value `[[Report.md]]` is real.
- A written `.md` survives a keep-form re-spell (A-7). Pommora's own writers never add one, since picks write `page.title` or the path without `.md`.

**Consumers of a markdown `LinkTarget.title` that rely on today's strip, and what each shows under (a):**

| Consumer | Under (a) unfixed | With the fix |
|---|---|---|
| `pageLabel` → `defaultLabel` (`linkValue.ts:128`): empty-label draw (`connectionsApi.ts:66`) and settle fill (`linkSettle.ts:120`) | `Notes.md` | `defaultLabel` uses `titleFromPath` → `Notes` |
| `linkDisplayText` markdown arm (`linkValue.ts:200`): sort, filter, Remove Link prose (`linkEdit.ts:42`) | `Notes.md` | same `defaultLabel` fix |
| `carry` / `namesTarget` (`rewrite.ts:32`): `[Notes](Notes.md)` renamed | the label goes stale (breaks `rewrite.test.ts:136`) | `repeatsTarget` reads the title through `titleFromPath` |
| `shownAlias` (`linkValue.ts:146,151`) | no change, since `keepsAlias(alias, page.title)` refuses first | — |
| `scan.ts:97` relation key | `notes.md`; a rename's `queryMentions('notes')` misses it | `pageKey` |
| `resolveLink` (`:120`), picker heading list (`useConnectionAutocomplete.ts:82`), `gonePageEntry` (`propertyValue.ts:146`), embeds, Matrix | — | all go through `holders`/`resolve`, so `pageKey` covers them |
| `parkLinks` (`holdings.ts:89`), `frozenWorld.arriving` (`heldPages.ts:49`) | `normalizeTitle(page.title)` misses | Trash scope (F-4 re-keys these) |

**Option (b), stripping in the reader, is worse.** `wikiTitle` would need to read the raw slot itself, a second reader. Re-spells would silently drop a written `.md`. And the draw still needs a basename helper.

###### 4. The Occurrence's Shape and `PageName` (Fork 2)

**Recommendation: (i).** `PageName` stays `{ title, heading? }`, with `title` the whole written page half. The one basename helper is the existing `titleFromPath`.

**Touch sites at HEAD under (i):**
1. **`repeatsTarget`** (`connections.ts:145-146`): read `titleFromPath(title)` on the title argument only. This covers `namesTarget`, `keepsAlias`, `carry`'s detection, `pageLinkText`'s pipe drop (`:173`) and `rewrite.ts:64`.
2. **`namesTarget:156`**: it passes a heading through `repeatsTarget`'s title parameter. It has to compare the heading directly, or the headings `A/B` (`linkValue.test.ts:123`) and `Text.md` get mangled.
3. **`defaultLabel`** (`links.ts:35`): `heading || titleFromPath(title)`. This covers `pageLabel`, the markdown arm of `linkDisplayText`, `pageLinkText`'s label at `:169`, and picks through `commitEdit`.
4. **`linkDisplayText`** wiki arm (`linkValue.ts:201-202`): use `titleFromPath(target.title)`.
5. **`carry`** (`rewrite.ts:34,38`): write `titleFromPath(to.title)`. The cascade scout may own this line.
6. **`tokens.ts:229-260` `linkToken`**: becomes `linkToken(text, o)`, called from `:278`. The wiki content start becomes the position after the last `/` inside `o.title`.
7. **`decorations.ts:594`**: the join's start becomes `tk.contentRange[0]`.
8. **`cellStatic.tsx:178`**: becomes `text.slice(tk.contentRange[0], tk.link.title[1])`.

These change nothing:
- `pageLinkText` and `spellsAsWiki`
- `resolve` (path-aware inside)
- `readOccurrence`, apart from `targetTitle` and `namesPage`
- the picker's slot query, including `autocomplete.ts:99` and `commitEdit`'s heading case, which writes `ac.title` whole
- `partOf`, `slotAt`, `openLinkAt`, `headingHash`
- `targetSpan`, and Edit Title (`linkEdit.ts:40`)
- the embed resolve and the Matrix

**(ii), adding `folder?`, touches about 16 to 18 sites:**
- `PageName` and the `LinkTarget` page arm
- `writtenPage`, and `readOccurrence`'s split for both syntaxes plus the url arm's `page`
- composing the key in `resolveLink`, `scan`, `autocomplete.ts:99` and `commitEdit`
- `pageLinkText` and `spellsAsWiki`
- `resolvedTarget`
- the `rewrite.ts:56` follower's `next`, plus its span edit, since writing a basename over the whole span drops the folder
- `keptShown`'s target
- a `wikiTitle` carve-out, because `[[sub/x.png]]` would start resolving to `x.png`, which breaks A-8
- `pasteAsMenu.ts:100`, `LinkCell.tsx:46`, `gonePageEntry`
- the same draw split as (i), since the spans stay whole-half either way

(ii) also leaves a spread that the compiler won't catch when it forgets `folder`.

**`expressibleInLink` against a whole half holding `/`** (`connections.ts:132-133`): `/` passes, and `Foo]/Notes` reads back, since the grammar's `\](?!\])` admits it. A folder holding `#`, `|` or `]]`, or a path over 255 characters, fails `spellsAsWiki` and falls to the markdown form in `pageLinkText` (`:166-170`). `encodeURI` keeps `/` and encodes `%`, `(`, `)` and `#`. That's A-6 exactly, with no change.

###### 5. Drawing the Title Only (B-1)

With the content start moved:
- **Wikilinks:** `markerRanges` (`tokens.ts:252-255`) fold `[[Folder/Sub/` into the leading marker. It hides at rest through `hideMarker` (`decorations.ts:653-654`) and in resting cells (`cellStatic.tsx:164-189`). It reveals as `md-bracket` when open.
- **Markdown links:** they always show the label, and the destination sits in the trailing marker. An empty label shows the basename once `defaultLabel` is fixed.
- **The joins:** the two edits in question 4 (sites 7 and 8).
- **Aliased reveal:** `targetSpan` covers the whole half (`decorations.ts:605-612`), so `Folder/Title` wears `md-connection-target`. Revealed without an alias, the folder wears the bracket color instead. That inconsistency is small; matching it costs one range, and I'd leave it and disclose it.
- **Phantom path links:** the markers get `md-phantom-syntax` (`decorations.ts:634-646`; `cellStatic.tsx:149-162`). Under Display Unresolved Links As Plain Syntax, `[[Folder/Notes]]` reads as plain text, syntax and folder included (`markdown-pm.css:254-262`).
- **Ambiguous path links:** the muted basename, with the folder hidden with the brackets.
- **One guard to add:** keep the content start at `o.title[0]` when the basename is empty. Otherwise a typed `[[A/]]` drops into the "`[[#]]` being written" branch (`decorations.ts:599-603`) and dims the whole link on every slash.

###### 6. Embeds and the Matrix

- **Embeds:** `embedWidget.tsx:397` resolves the raw `loneEmbedTitle` (`detect.ts:414-416`), which is the whole bracket content. Since `expressibleInLink` refuses `#` and `|`, only pure page halves tile. `![[A/Notes]]` and `![[Notes.md]]` tile with no change, because the path and `.md` reading live inside `PageIndex`. Placing them in `resolveLink` instead would miss embeds.
- **Matrix:** `matrixInput.ts:64-74` resolves `link.target`, a normalized key that `resolve` re-folds idempotently. It works once the scan key uses `pageKey`.
- **The second reader:** `loneEmbedTitle` + `expressibleInLink` is a pre-existing duplicate of the reader. Folding it buys nothing for path links.
- **A key that breaks:** `embedExclusions` (`embedWidget.tsx:648-650`) compares `normalizeTitle(t.title)` (`a/notes`) against the pick tree's `normalizeTitle(n.pick)` (`gripMenu.ts:29`). It should key by `t.path` and the ancestors' paths. That belongs to the writers' pick-tree change; render-time self-exclusion is already by path (`:398`).

###### 7. A-9 State at HEAD

- `#` is the only opener: `pageLinkPattern` (`connections.ts:20`) and `markdownSpans` (`:91-93`). A `§` in a slot is ordinary text.
- `nameError` refuses `|#§` at creation for both roles (`names.ts:28`). `holdsName` doesn't.
- `headingHash` (`edits.ts:460-474`) turns a typed `§` into `#` in a title slot. For a markdown link it is gated on `namesPage`. Relaxing `namesPage` makes `[a](dir/Page§` turn into `#` with no change to `headingHash`, as A-9 wants. That flips `edits.test.ts:813`.
- The fixes the revert kept:
  - `UNSPELLABLE`: `assetWrite.ts:10,18` and `adoptFile.ts:24`
  - `literalOrBracketAt`: `edits.ts:699`, used at `:740` and `:756`, and `autocomplete.ts:66`
  - `inUrlRun`: `markdownCode.ts:187-190`, used at `scan.ts:51` and `edits.ts:690`
  - the emptied-heading tidy: `linkSettle.ts:110-113`
- `INDEX_GENERATION` is 15 (`ddl.ts:3`).

###### 8. Relaxing `namesPage`

Smallest form: `namesPage = (pageHalf) => !HAS_SCHEME.test(pageHalf.trim())`. Round 1's "no `.` in the first segment" would refuse Finder folders like `II. Planning`. Page-first resolution (`linkValue.ts:105-122`) already settles address versus page.

| Destination | After |
|---|---|
| `example.com/x` | url arm with `page`; resolves Phantom unless a folder `example.com` exists, then falls to the url. Draw unchanged. |
| `v1.2/Notes` | the page if one's path ends `v1.2/notes`, else the url as today |
| `docs/file.pdf` | a page-kind phantom (today `readOccurrence` returns null, which also draws phantom); it now produces an index row |
| `./x`, `../x`, `/abs` | page-kind phantom by tail mismatch, as A-4 says (not read) |
| `example.com/page#sec` | now splits at `#`; the url arm still keeps the whole (`:76`), so the draw is unchanged. The heading picker lists an empty outline, which closes. |

A side effect: a `§` typed in a scheme-less address's page half becomes `#`. That's minor; gate it with `isValidLink` only if it's unwanted.

###### Recommended Shape End to End

**Grammar:** unchanged, apart from `namesPage`.

**Reader:** `targetTitle` stops stripping `.md`, and `LinkTarget.title` is the page half as written in both syntaxes.

**Resolver:** `pageKey` is the one key, used by `holdersOf` and `scan.titleKey`. `holdersOf` tries the exact path first, then tails of the title's holders. The `ambiguous` state stays, per B-2.

**Draw and compare:** go through `titleFromPath` in `repeatsTarget` (title argument), `defaultLabel`, `linkDisplayText` and `carry`. `linkToken` computes the content start once, and the joins read `contentRange[0]`.

**Index:** bump `INDEX_GENERATION` to 17, because wiki `.md` rows change key and markdown path rows appear.

###### Risks

1. **A page whose title ends in `.md`** (an outside-made `X.md.md`; `names.ts:31` refuses it in-app): the writer writes `[[X.md]]`, and `pageKey` reads `x`, so Pommora writes a link that doesn't resolve. Fix if wanted: key titles through `pageKey` at build, one extra regex per page. Otherwise accept it and disclose.
2. **The picker reopens over finished path links:** the exact-match close compares `row.value` (the basename) with the whole-half query (`useConnectionAutocomplete.ts:117`), so it never matches. Closing on `index.resolve(query).status === 'resolved'` instead is shared with the search fold, and both forks need it.
3. **A heading routed through the title argument:** if `titleFromPath` lands in `repeatsTarget` without fixing `namesTarget:156`, `[[P#A/B|B]]` reads as naming the heading.
4. **The scan key and the index key diverge:** `.md` stripped only in the index means the cascade misses `[[Notes.md]]` and every markdown `.md` link, which is a regression from today.
5. **Typing a path:** the folder flips from the typing color to the bracket color when the title's first character lands. That's inherent to B-1; disclose it.
6. **The Trash keys:** `parkLinks` and `frozenWorld.arriving` normalize the raw title, so path-form values aren't parked. F-4 covers this.

###### What Becomes False

**Docs:**
- `ConnectionsPM.md`:
  - `:10` ("resolves by its title"; the hidden markers now include the folder)
  - `:11` (the path separator addresses the outside)
  - `:16`, `:18`, `:20` ("holds the title")
  - `:19` ("inert until one side is renamed"; the picker and path resolve it now, and B-3 adds case variants)
  - `:22` ("title-shaped target")
  - `:34` (the folder hides with the brackets)
  - `:36` (Ambiguous "bracket treatment", already off)
  - `:58` ("the page that title names")
  - `:78` (the Prospect is done)
- `PagesPM.md:14` (the shared title resolves ambiguous; add path links)
- `CorePM.md:83` ("resolve titles through")

**Comments:**
- `links.ts:37` (`namesPage`) and `:63` (`targetTitle` strips `.md`)
- `connections.ts:88` ("an address keeps one undivided title"), `:128` (`PageName` "named by title"), `:144` (`repeatsTarget`)
- `pageIndex.ts:27-28` (`rawTitle` parameters)
- `tokens.ts:240` ("swallows `[[Title|`")
- `linkValue.ts:158,180` (writers' scope)

**Tests:**
- `links.test.ts:85,92` (`targetTitle('Notes.md')` returns `Notes`) and `:97` (`example.com/Notes` returns null)
- `linkValue.test.ts:42-50` (`[x](Notes.md)` title `Notes`)
- `edits.test.ts:813` (`[a](dir/Page)` keeps `§`)
- `rewrite.test.ts:136` stays true with the `repeatsTarget` fix
- No existing test uses path-shaped wikilinks, so `pageIndex`, `tokens`, the join and the reader need new cases.

###### Line Estimate (Production, This Slice)

About +14 to +18 added and −2 removed:
- `pageKey`: +2
- the `holdersOf` path branch: +5
- `linkToken`'s content start and empty-basename guard: +3
- the `linkDisplayText` local: +1
- `titleFromPath` imports: about +3
- in-place edits: `repeatsTarget`, `namesTarget`, `defaultLabel`, `carry`, the two joins, `scan.titleKey`, `namesPage`
- removals: the `targetTitle` strip and the `stripMarkdownExt` import in `links.ts`

Fork 2's option (ii) would cost roughly +30 or more for the same behavior.

---

### Round 4B — The Content Index Link Key, Its Queries, Self-Links, and the Matrix

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: §Mechanism Forks (Forks 1 and 3), "Round 1 — Read, Resolve, and Draw" §Index and Graph, "Round 1 — Cascades" (its index-shape opinion), "Round 2 — Cascade and Rewrite Reuse" §3 and §4. Every citation is a lead to re-verify at HEAD; several were written before partial paths (A-4) were ruled in.
4. `.claude/Features/ConnectionsPM.md`, and `Guidelines/`-level notes on the content index if any (`.claude/Features/CorePM.md`, `DesktopPM.md` index paragraphs).

HEAD `14da3f152` reverted `§` as a link opener; `INDEX_GENERATION` is 15 and Path Links bumps it to 17 (never 16: an index the interim build stamped 16 would otherwise read as current; the staleness check is `!==`).

##### Your Slice: The Content Index's Link Key, Its Queries, Self-Links, and the Matrix (Forks 1 and 3; Decisions A-4, A-5, E-1, E-2, E-7)

Files: `Core/Connections/scan.ts` (`linksIn`, `titleKey`, `LinkHit`), `Core/Index/indexSeed.ts`, `Core/Index/contentIndex.ts`, `Core/Platform/stores.ts`, `Desktop/Store/stores.ts`, `Desktop/Store/ddl.ts`, `Core/Testing/memoryStores.ts`, `Core/Testing/storesContract.ts`, `Core/Matrix/matrixInput.ts`, `Core/Nexus/record.ts` (`pageIndexOf`, `pagesOf`, `pagesByIdOf`, `pagesByPathOf`), `Core/Nexus/cascade.ts` (how `queryMentions`/`queryHeadingMentions` are consumed), `Core/MarkdownPM/Links/headingRenameSettle.ts` (the editor's own-title pass).

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **Fork 1, the index's link key.** The lean: `relations.target` stores the written key as normalized (`notes`, `pommora/claudemd`, `studio/pommora/claudemd`), `.md` stripped (A-5), no schema change. Confirm wiki rows already store `a/notes` for `[[A/Notes]]` today and markdown path links are new rows (since `namesPage` refuses `/`). Confirm `queryMentions(key)` is an exact indexed lookup and whether it's synchronous. Is a schema change needed for anything? Does the generation bump alone re-key existing rows?
2. **"Files linking page P" under partial paths.** With A-4, a page at `Studio/Pommora/ClaudeMD` is named by any tail of its path: `claudemd`, `pommora/claudemd`, `studio/pommora/claudemd` (depth d → d keys). Candidates for a change to P are the union of `queryMentions` over its tails; each hit is then decided by resolution (the planner's re-spell rule resolves the written key against the before-index and skips hits that didn't resolve to P). Confirm d exact queries per page is the right primitive; propose where the "tails of a path" helper lives (does `Core/Paths/posix.ts` have anything near it?).
3. **Fork 3, candidates for a folder rename or move.** Test this analysis against the code and the decisions: under E-2 (a link keeps its written depth; a tail unchanged byte for byte is left alone), a folder rename at `Root/Studio` → `Root/Lab` affects only written keys that include the renamed segment, i.e. tails starting with `studio/` or `root/studio/` (k prefix ranges, k = the folder's depth), while `pommora/claudemd` and `claudemd` are untouched since the set of pages ending in them is unchanged. A folder move `Root/Studio` → `Other/Studio` affects tails starting with `root/studio/`; tails starting with `studio/` keep resolving unless the move creates a tail collision (another page already ends in `studio/pommora/claudemd`), which an in-memory check of the after-index's holders per tail finds without SQL, and only colliding tails need a query. So the SQL work is: k prefix-range queries over `relations.target` (the `>= dir||'/' AND < dir||'0'` idiom at `Desktop/Store/stores.ts`) OR N×k exact queries per moved page through the existing `queryMentions`, plus exact queries for colliding tails only. Weigh both: what a prefix-range method costs in contract surface (`Core/Platform/stores.ts`, `Desktop/Store/stores.ts`, `memoryStores.ts`, `storesContract.ts`, a `contentIndex.ts` wrapper) versus N×k exact queries' runtime for a 5k-page collection (estimate from better-sqlite3's per-statement cost; find the actual statement shape and whether it's prepared). Recommend. Also: the round-2 cascade scout's gap — after an external folder rename, `unlinkDir` prefix-deindexes the folder's pages, so a page inside that path-links a sibling is invisible until its own `add` re-indexes. Is that real at HEAD, and does paying the re-spell at settle after the batch's re-index close it?
4. **E-7 and the self-link key.** `linksIn(body, ownTitle)` keys a bare `[[#H]]` by the own page's normalized title, so a heading rename on one of two same-titled pages rewrites the twin's own self-links through the shared key. Proposal: the own key becomes the own page's path key (every tail would then match? no: pick one canonical own key, the full path key, and have the heading cascade query `queryHeadingMentions` over every tail key of the page plus the qualifier, deciding each hit by resolution). Map every caller of `linksIn`/`valueLinks` with `ownTitle` (`extractPageIndex`, `renameCascade.text`, `spacesLinkHeading`, `readTileHeadingLinks`, `headingRenameSettle.ts`, `rewriteHeadingConnections`) and what each holds (path? title only?). Smallest change; this needs the generation bump (confirm).
5. **`queryHeadingMentions(target, qualifier)`:** its shape and index; under E-7 the heading cascade's candidates become the union over the page's tails. Confirm.
6. **Matrix:** `matrixInput.ts` resolves `link.target` through `pageIndexOf(tree).resolve` — with a path-aware `resolve`, do edges for path links come for free? Any dedupe or ambiguity handling to re-verify?
7. **Index generation:** confirm the `!==` staleness check at `ddl.ts` and what a bump costs at open (full reseed); E-4's one-time limit (moves made while closed before the first open after a bump can't be paired) — confirm the seed reseeds from nothing.
8. **What becomes false:** every `.claude/Features/*.md` line, comment, and test in your slice (`scan.test.ts`, `indexSeed.test.ts`, `storesContract.ts`, `matrixInput.test.ts`), with file:line.

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; never a full-Nexus rebuild or re-walk when an incremental update works; nothing in SQL should rewrite `target` (it mirrors the file's bytes). Review what's there rather than confirming the framing; if a prior scout's claim is wrong at HEAD, say so with evidence. Where you'd make a different call than the lean, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the settled recommendation for Forks 1 and 3 with the evidence; risks as named sequences reaching a bad state; what becomes false; a rough line estimate (removed vs added, production code only).

#### Report

###### Path Links Scout: Index Link Key, Queries, Self-Links, Matrix (HEAD `14da3f152`, Read-Only)

I edited nothing in the repo. The only files I wrote are two throwaway benchmark scripts in the scratchpad, at `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/439cb304-24a6-4f16-aa59-0b3f5d191f35/scratchpad/bench/`.

**Corrections to the brief and the prior scouts:**
- The store doesn't use better-sqlite3. It uses `node:sqlite` `DatabaseSync` (`Desktop/Store/driver.ts:1,7`), which is synchronous.
- `paths()` re-prepares its statement on every call (`Desktop/Store/stores.ts:192-193`). Nothing is cached.
- The brief's E-7 proposal is to key the own page by its full path. That breaks on folder ops; see Q4.

###### 1. Fork 1: The Link Key

**What exists today:**
- **Wikilinks already store paths:** the wiki page slot admits `/` (`connections.ts:20`, `[^\]\r\n|#]`). `[[A/Notes]]` reads title `A/Notes` (`linkValue.ts:71-72`), its key is `normalizeTitle` → `a/notes` (`scan.ts:24,97`), and that's what lands in `relations.target` (`indexSeed.ts:49-53`). `normalizeTitle` only trims, lowercases and applies NFC (`caseFold.ts:7-14`), so it leaves `/` alone.
- **Markdown path links are new rows:** `namesPage` refuses `/` (`links.ts:38-39`), so `targetTitle` returns null (`links.ts:65`) and `readOccurrence` returns null for a non-address (`linkValue.ts:78-80`). Today they produce no row at all.
- **`.md` handling differs by syntax:** markdown links already strip `.md` (`links.ts:68`). Wikilinks don't, so `[[Notes.md]]` is stored as `notes.md`, and A-5 re-keys those rows.
- **`queryMentions` is one exact indexed lookup:** the SQL is `SELECT DISTINCT path … WHERE target = ? AND kind <> 'space'` (`stores.ts:100-106`), served by `relations_by_target (target, qualifier, kind)` (`ddl.ts:26`). It's synchronous end to end. The wrapper returns null until the seed marks the store ready (`contentIndex.ts:60-67`).

**Schema change:** none. `target TEXT` already holds any key.

**Does the bump alone re-key the rows?** Yes. A stale generation drops every index table (`ddl.ts:83-89`). After that, `readIndexedStats` returns an empty Map, so the seed re-reads every corpus file (`indexSeed.ts:180,202,210`). That one reseed re-keys three things:
- markdown path links (new rows),
- wiki `.md` keys (A-5),
- self-link keys (Q4).

The bump is mandatory, and it goes to 17.

**Why Round 1's shape loses:** Round 1 proposed a last-segment `target` plus a folder column. It has one real advantage: "files linking P" becomes one query, since every form ends in P's title. What kills it is the Matrix. `matrixConnections` resolves `link.target` as-is (`matrixInput.ts:74`), so a path link needs its full written key in the row anyway, which means a second column the Matrix also has to read. The written key wins for three reasons:
- `target` keeps mirroring the file's bytes.
- The Matrix resolves it unchanged.
- The tails helper is already required by `buildPageIndex` for A-4, so the query side reuses it for free.

**Recommendation:** go with the lean. Store the written key, normalized, with `.md` stripped, and make no schema change.

###### 2. Files Linking Page P

**Primitive:** run exact queries over P's tails, but only the tails that resolved to P before the change. I'd add a resolution filter to the brief's union over all d tails. A shared bare title like `claudemd` is ambiguous before the change, so it resolves to nothing; querying it only reads files that resolution would then skip anyway.

**Where the helper lives:** `Core/Paths/posix.ts` has nothing near this. It has `stripMarkdownExt`, `relDirname` and `titleFromPath` (`posix.ts:37-80`), and it never normalizes. I'd put it in `Core/Connections/pageIndex.ts` beside `headingKeys` (`:22`), since `buildPageIndex` needs the same tails to file pages for A-4. That makes one owner.
- `pathKeys(path: string): string[]`: the normalized tails of `stripMarkdownExt(path)`, shortest first, so `Studio/Pommora/ClaudeMD.md` gives `claudemd`, `pommora/claudemd`, `studio/pommora/claudemd`. About 4 lines.
- `keysNaming(index: PageIndex, page: ConnPage): string[]` = `pathKeys(page.path).filter(k => index.resolve(k).page?.id === page.id)`. About 2 lines. It's either a free function or a `PageIndex` method; the planner can pick.

**Cost to flag:** `pageIndexOf` (`record.ts:85`) would hold one map entry per tail, roughly 3-4× N. It's still O(N) per tree change and memoized, so the cost class doesn't change.

###### 3. Fork 3: Candidates for a Folder Rename or Move

**The brief's analysis holds:**
- Query keys are tails of the page's old path, each decided against the before-index.
- A rename of `Root/Studio` affects the keys that start with `studio/` or `root/studio/`. Lower tails keep their set of holders.

**What it misses (A-4 collisions apply to renames too):**
- **Renames can collide:** `Root/Studio` → `Root/Lab` gives P the new tail `lab/pommora/claudemd`. If Q = `Archive/Lab/Pommora/ClaudeMD` was the only page ending in that key, its links turn ambiguous. E-3's "bare links" generalizes to "any written key whose tail gains a holder."
- **Full-path precedence can steal a key:** a move can make P's new full path equal Q's unique partial key. Two pages then hold the key, but it resolves to P by precedence. A check that counts holders would read that as ambiguous rather than stolen.

**One rule covers every event:** the candidate keys are `{t ∈ pathKeys(old) ∪ pathKeys(new) of every moved page : before.resolve(t) is a page X, and after.resolve(t) isn't X}`. Only those keys get queried. The check is an in-memory diff over two `PageIndex`es, O(1) per key, and it handles all of these:
- page rename and page move,
- folder rename and folder move,
- collision from a create or a restore,
- delete (where `after` resolves nothing).

**Benchmark** (`node:sqlite`, 400k relation rows, using the store's exact statement shape):

| Query | 1k keys | 5k keys |
| --- | --- | --- |
| Exact, re-prepared per call (as HEAD does) | 5.8 ms | about 30-86 ms |
| One `target IN (SELECT value FROM json_each(?))` | 2.1 ms | 17 ms |
| One prefix range | 1.4 ms | — |

- The IN form's query plan is `SEARCH relations USING INDEX relations_by_target (target=?)`.
- I re-ran the prefix range on a selective key for a fair comparison; my first run returned every row.
- Every option costs nothing next to the file sweep.

**Recommendation:** add no prefix-range method. A prefix range misses partial keys, over-matches every other folder with the same name (`Other/Studio/…`), and still needs exact queries for collisions. That makes it a second way to ask a question exact keys already answer. Instead, widen the two existing queries to take key lists through the existing `PATHS_OF` `json_each` idiom (`stores.ts:16`):
- `queryMentions(...normalizedKeys: string[])`: variadic, so every existing single-key call stays valid, including `storesContract.ts:97-265`.
- `queryHeadingMentions(normalizedHeading: string, ...normalizedKeys: string[])`: this churns 3 contract call sites (`:166,169,244`) and 2 production ones.

The change lands in four places plus the wrapper: `Core/Platform/stores.ts:60-61`, `Desktop/Store/stores.ts:100-114`, `Core/Testing/memoryStores.ts:130-145` (`keys.includes(r.target)`), and `contentIndex.ts:65-74`. It's a signature change, with no new method. It also folds the hand-rolled "any null → corpus, else union and dedupe" at `cascade.ts:96-99` into one call, `queryMentions(...keys) ?? await nexusCorpus(root)`. That union would otherwise be restated in the relink unit and the heading cascade.

**The Round 2 gap is real at HEAD, and settle-time payment closes it:**
- `unlinkDir` → `deindexPath` → `removePathPrefixIndex` (`fileEvents.ts:273-274`, `indexSeed.ts:144-148`) deletes the folder's rows.
- An outside move can't pair until its `add` arrives, and `applyEvents` runs `indexEvent` for that add (`fileEvents.ts:656`) before `settleNow` (`settle.ts:224-232`).
- So once the relink is paid at the settle where the pair completes, the inside page's rows already exist under their new path, and the old-key query finds them.

**In-app ordering:** `relocate` → `noteOwn('move')` → `applyOwn` → `applyEvents` → `moveIndexPaths` → `renamePathPrefixIndex` (`atomicWrite.ts:72`, `settle.ts:42`, `fileEvents.ts:270`, `stores.ts:91-97`). The index's paths and the tree are re-prefixed before `relocate` returns. The before-index has to be captured before the relocate, and the query has to run after it (see R2).

###### 4. E-7 and the Self-Link Key

**The decisive fact:**
- `moveIndexPaths` re-extracts a moved page (`indexSeed.ts:163,165`).
- It doesn't re-extract the pages under a moved or renamed folder: `indexWrittenPage(root, folderAbs)` returns at `isMarkdownFile` (`:106`).
- So any own key synthesized from a page's path goes stale on every folder op, and no SQL may rewrite `target`.

That rules out the brief's full-path own key.

**My call:** key a self-link by `''` and drop the own-title parameter entirely. `scan.ts:26` already describes `''` as the self key "when no title is given." Tiles (`tilesFile.ts:277`) and Spaces (`cascade.ts:68`) already produce `''` today. A self-link always sits in the renamed page's own file, so the cascade can include that file directly and needs no key for it.

**Callers that pass an own title, and what each holds:**

| Caller | What it holds | Change |
| --- | --- | --- |
| `extractPageIndex` (`indexSeed.ts:42,52,57`) | path `rel` | drop `own` |
| `renameCascade.text` / `patchOf` (`cascade.ts:178-221`) | abs `file` | `own = relative(root,file) === page.path` |
| `cascade.ts:187` (§-run gate `normalizeTitle(own) === titleKey`) | title | same twin bug; becomes that `own` boolean |
| `rewriteHeadingConnections` (`rewrite.ts:78-94`) | title + `ownTitle` | becomes `(body, keys: ReadonlySet<string>, old, new, own: boolean, outline?)`; a hit counts if `hit.named.title === '' ? own : keys.has(hit.target)` |
| `headingRenameSettle.ts:51-57` | title only (`host.pageTitle()`) | needs P's identity; the renderer index is already at `host.connections()?.index` (`connectionsApi.ts:18`). Change `pageTitle(): string \| null` (`api.ts:205`, `editorHost.tsx:145`) to `page(): ConnPage \| null`. That also serves `gripMenu.ts:78`'s Copy Link, which the writer's naming rule needs. |
| `HeadingRenameSeen` (`indexSeed.ts:95-98,140`) | title only | carry `path` (it's in scope at `:140`) |
| `cascadeSeen` (`fileEvents.ts:297-308`), `mutate.ts:94` | title, and `req.path` | pass the page path |
| `spacesLinkHeading` (`cascade.ts:61-73`), `tilesLinkHeading` (`tilesFile.ts:282-289`) | title | keys |

**The gate:** once self-links stop keying by title, the `cascadeSeen` gate (`fileEvents.ts:299-304`) misses the page's own `[[#old]]`, and `indexSeed.test.ts:167-181` asserts that link follows. I'd always put the own page in the heading cascade's files and delete the gate. In-app renames already add it through `skipRel` (`cascade.ts:226`). The gate's three checks duplicate what `renameCascade` already does inside:
- `spaceArm` (`cascade.ts:55-58`) is the same Space test, which makes `spacesLinkHeading` dead (−14 lines).
- `tilesLinkHeading` already runs at `cascade.ts:234`.

The cost per outside heading rename is one read of a file that was just written.

**The generation bump is required here too:** self-link and §-run rows change key from the own title to `''`.

###### 5. `queryHeadingMentions`

**Shape:** `target = ? AND qualifier = ? AND kind <> 'space'` (`stores.ts:107-113`), an exact seek on the composite index (`ddl.ts:26`).

**Under E-7:** the candidates are the union of `keysNaming(index, P)` with one qualifier, plus P's own file (see Q4). With the array form, that's `queryHeadingMentions(h, ...keysNaming(index, P))`.

###### 6. The Matrix

**Edges for path links come free** once `resolve` is path-aware (`matrixInput.ts:64,74`). Self rows keyed `''` resolve to phantom and draw no edge, which is the same result as today, where `graph.ts:80` drops self-edges.

**One fix is needed:**
- `matrixGraph.ts:32-37` dedupes per written key, so two spellings of one page, like `[[ClaudeMD]]` and `[[Pommora/ClaudeMD]]` in one body, arrive as two links.
- `matrixConnections` dedupes on the target string (`:71`).
- `graph.ts:77-82` doesn't dedupe edges at all, so the edge, its pull and its weight would all double.

Move the `seen` check after `resolve`, keyed on `${pageId}\0${kind}\0${hit.page.id}`. Because the keys rule still runs first, the `:65` comment stays true. Net 0 lines.

###### 7. Index Generation

**Staleness check:** `readMeta(...) !== String(INDEX_GENERATION)` (`ddl.ts:83`), with `INDEX_GENERATION = 15` (`:3`). Bump it to 17.

**What a bump costs at open:**
- Every index table plus the retired ones is dropped (`:84-89`), followed by a full reseed from nothing.
- The seed returns `NO_REREAD` (`indexSeed.ts:226`), so no heading renames are owed and no repair sweep re-reads anything.
- Until it finishes, queries return null:
  - Page sweeps walk the whole corpus (`cascade.ts:173`).
  - The heading cascade returns `[]` (`:174`).
  - The Matrix waits.

**E-4's one-time limit is confirmed.** `page_values`, which holds each path's `ID`, is among the dropped tables (`ddl.ts:69`), so the seed has no old ID for a path.

**A lead for the triggers slice, not resolved here:** the record baseline survives a bump. It lives in `local_state` (`remintLedger.ts:102-107`) and is read before the seed at open (`handlers.ts:98,102`). But its only writer is the open pass (`remintLedger.ts:96`), so it reflects the last open, not the last close. Re-spelling from it isn't a harmless no-op:
1. P moves from `A/x` to `B/x` during a session.
2. A new page N is created at `A/x` in the same session, and links to it are written as `[[A/x]]`.
3. At the next open, the baseline still says P is at `A/x`, so it reads as the move `A/x` → `B/x`.
4. The re-spell rewrites N's `[[A/x]]` links to point at P.

###### 8. What Becomes False

**Production comments:**
- `Core/Platform/stores.ts:11`: "`target` is a normalized title, never a path."
- `stores.ts:60-61` and `contentIndex.ts:65,69`: the `normalizedTitle` parameter names.
- `scan.ts:24,26,86,93,108,120,126`: the own-title parameter and its key.
- `rewrite.ts:77`: "a bare fragment counts only when `ownTitle` is that page."
- `cascade.ts:60`: the `spacesLinkHeading` doc (the function is deleted).
- `fileEvents.ts:296`, if the gate goes.

**Feature docs:**
- `CorePM.md:108`: "records which pages relate to which titles… the titles normalized as resolution matches them."
- `CorePM.md:83`: "the page index both processes resolve titles through" (shared with the resolver slice).
- Nothing in `MatrixPM.md`.

**Tests:**
- `scan.test.ts`: the own-title keys at `165-166`, `174-175`, `201-203`, `214-216`, `263`, and `279-290` ("keyed to the own title"), plus the call shapes at `8-10`, `22-27`, `192`, `197-198`, `228-229`, `300`.
- `indexSeed.test.ts`: `161-165` (self-link stored as `'a'`), `173-174` (`seen.title`), `340-342`, `350-360`.
- `rewrite.test.ts`: 26 call sites of `rewriteHeadingConnections` change shape.
- `cascade.test.ts:6,796-806` (`spacesLinkHeading`) and `tilesFile.test.ts:325-327` (key shape).
- `gripMenuFlow.test.tsx:241` and `bodyMount.test.tsx:52`: `pageTitle` in the test host.
- `storesContract.ts` and `matrixInput.test.ts`: nothing becomes false.

**Tests to add:**
- a markdown path-link row,
- a wiki `.md` key,
- a self-link keyed `''` with no cross-twin candidate,
- two spellings of one page drawing one Matrix edge,
- the array-form query in `storesContract.ts`.

###### Risks: Sequences That Reach a Bad State

- **R1, a path-based own key:** a folder is renamed, its pages' self-link rows keep the old key, then an outside heading rename in one of those pages misses the gate, and its own `[[#Old]]` is never rewritten. Keying by `''` avoids this.
- **R2, querying before the relocate:** the relink queries before `relocate` returns, gets linking paths under the old prefix, and the sweep counts those files as skipped. The rename then stands with a warning and no links moved.
- **R3, a collision check that counts holders:** a move steals a key by precedence, the check reads it as ambiguous (or misses it), and Q's links silently retarget to P. The resolution diff catches it.
- **R4, the Matrix without the fix:** two spellings of one page produce doubled edges, which inflate weight and pull.
- **R5, bumping to 16:** the interim build's index stamped 16 reads as current, its rows lack the path, `.md` and self-link keys, and cascades miss candidates without any error.
- **R6, the first open after the bump:** while the reseed runs, an in-app heading rename reaches only its own page (`cascade.ts:174`, `?? []`). The behavior already exists, but the bump widens it to a whole-Nexus reseed.
- **R7, a written key with a leading `/` or spaces around a `/`:** it never equals a tail, so it reads phantom. A-4 doesn't say whether a leading `/` should be read; the planner should decide.
- **R8, inherent to A-4:** a rename removes P's old tail, and a key that was ambiguous between P and Q starts resolving to Q without any rewrite. Obsidian behaves the same way; I'm noting it, not fixing it.

###### Rough Line Estimate (Production Only, My Slice)

About **+18 / −28, net roughly −10**.

**Added:**
- `pathKeys` and `keysNaming`, about +6, shared with the resolver slice.
- The heading arm's keys, the `own` boolean and the always-included own file, about +3.
- `tilesLinkHeading` and `headingRenameSettle` keys, about +3.
- The array-form SQL and memory store, about +2.
- The candidate-key diff, about +6. It lives in the relink unit.

**Removed:**
- `spacesLinkHeading`, −14.
- The `cascadeSeen` gate, about −7.
- The own-title plumbing in `scan.ts` and `indexSeed.ts`, about −4.
- The `cascade.ts:96-99` union, −3.

**Changed with no net lines:** the generation bump, the Matrix dedupe move, and `pageTitle` → `page`.

---

### Round 4B — Every Writer of a Page Link, and the Picker

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 1 — Writers and the Picker" and "Round 2 — Read, Draw, and Pick Reuse" (§3 the picker fold, §4, §6). Every citation is a lead to re-verify at HEAD; both were written before partial paths (A-4) and before A-7 (nothing shortens a link) were ruled.
4. `.claude/Features/ConnectionsPM.md` §Autocomplete, §The Link Menu.

HEAD `14da3f152` reverted `§` as a link opener; `#` is the only heading opener inside a link.

##### Your Slice: Every Writer of a Page Link, and the Picker (Decisions A-2, A-3, A-6, A-7, B-4, C-5, C-6)

Files: `Core/Connections/connections.ts` (`pageLinkText`, `pageEmbedText`, `spellsAsWiki`), `Core/Connections/linkValue.ts` (`resolvedTarget`, `linkValueFromEdit`, `shownAlias`, `keepsShown`, `retarget`, `pageLabel`), `Core/Connections/pageIndex.ts`, `Core/MarkdownPM/Autocomplete/autocomplete.ts` (`pageRow`, `autocompleteQuery`, `commitEdit`, `headingRows`, `aliasRows`), `useConnectionAutocomplete.ts` (the shown-text check, the exact-match close at ~118, the heading list via `index.resolve`), `AutocompletePane.tsx`, `Core/Properties/Cells/LinkCell.tsx` (Show Full Link), `Core/Interface/Menus/pageMenuActions.ts` (Copy Link), `Core/MarkdownPM/Menus/gripMenu.ts` (heading grip Copy Link, embed source), `Core/MarkdownPM/editorHost.tsx` (`pageTitle()`, the pick tree), `Core/MarkdownPM/Embeds/embedWidget.tsx` (exclusions), `Core/MarkdownPM/Links/pasteLink.ts`, `pasteAsMenu.ts`, `Core/MarkdownPM/Links/linkSettle.ts` (label fill), `Core/Properties/assignValue.ts`, `Core/MarkdownPM/connectionsApi.ts` / `pageConnections.ts` (`headingsOf`).

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **The one naming rule and its unification with the re-spell.** The decisions imply one function answers "how does a link spell page P at a written depth": at depth 1 (a pick, Copy Link, a new link) it's P's title when P is the sole holder of that title, else P's full path without `.md` (A-2, A-3); at a written depth d (a re-spell of an existing link, decision E-2) it's the d-segment tail of P's path, or the full path where that tail wouldn't name P alone. Confirm `PageIndex` (which knows holder counts, built by both processes) is the owner, propose the signature (one function with a depth, or two?), and show that `resolvedTarget` (today: "written by that page's own title", which corrects case) becomes "written at its written depth" through that same function, so paste, Paste As, the Link field commit (`linkValueFromEdit`), and Show Full Link keep the written form (A-7) and correct case as they do today. Where would the cascade's re-spell call the same function (just name the site; the cascade scout owns it)?
2. **Writer inventory at HEAD.** Re-verify round 1's table: every producer of page link text, what identity it holds when it writes (a `ConnPage`? a title string?), and the smallest change for each to write through the naming rule: picker page pick and chevron (`pageRow`, the row's `value` vs a `name`), the shown-text check, `resolvedTarget`'s three callers, Copy Link (`runPageAction`), the heading grip's Copy Link and `EditorHost.pageTitle()` (should it become `page(): ConnPage | null`? who else consumes `pageTitle()`, e.g. `headingRenameSettle.ts`?), the embed source pick tree and `pageEmbedText`, embed exclusions keyed by title (`embedWidget.tsx`, `gripMenu.ts` `embedPickTree`) → keyed by page path, LinkCell Show Full Link, `pasteAsMenu.ts` `pageEmbedText(target.title)`.
3. **The picker's title query and heading list.** `AutocompleteQuery.title` must be the whole written page half so `[[A/Notes#` resolves and lists headings; `commitEdit`'s `heading` arm must keep the folder; the exact-match close at `useConnectionAutocomplete.ts:~118` compares `found[0].value` to the query and must become `index.resolve(query).status === 'resolved'` (path-aware; an Ambiguous query stays open by rule, B-4). Verify each at HEAD and the smallest change. (The search scout owns the matcher fold; you own what the picker writes and when it closes.)
4. **C-5, a title pick keeps the heading where the picked page holds it.** `commitEdit`'s `title` arm writes `heading: undefined` today. The picked page's headings are reachable (`headingsOf(page.path)` through `host.connections()`?). Smallest change that keeps `#Intro` when the picked page holds `Intro` (normalized) and drops it otherwise; what `keepsShown`/the alias stage do after.
5. **B-4, ambiguous resolves through the picker alone.** Confirm by reading: the caret in a closed `[[Notes]]` with two holders arms the query, both rows show with trails, and a pick writes in place via `commitEdit` keeping the alias (`keepsShown` with an unresolved baseline). The only gap is what the pick writes. Confirm.
6. **Rule interactions with a path link** when `PageName.title` is the whole written page half (`A/Notes`) and a basename helper is applied at the compare sites (the reader scout owns that choice; assume it): `keepsShown` (compares resolved ids), `shownAlias` (`keepsAlias(alias, target.page.title)`), `namesTarget`/`repeatsTarget`, the settle's label fill (`pageLabel` → `defaultLabel`), `linkDisplayText`. What breaks and the fix for each.
7. **A-6:** an unspellable folder segment (a Finder-made folder holding `]]` or `|`) makes `spellsAsWiki` fail on the whole written name and the writer falls to markdown form. Confirm this falls out when `title` is the whole half.
8. **Alias memory and Remove Title with duplicates:** re-picking the same duplicate page, retargeting `[[Notes|x]]` to `[[A/Notes|x]]`, and the `was` check in `shownAlias`.
9. **What becomes false:** docs (`ConnectionsPM.md` §Autocomplete lines), comments (`PageName` "named by title", `resolvedTarget`/`linkValueFromEdit` "by title", `api.ts` `pageTitle`), tests (`linkValue.test.ts` `resolvedTarget` cases, `connectionCommit.test.tsx`, `autocomplete.test.ts`, `LinkCell.test.tsx`), with file:line.

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; nothing new on a keystroke beyond what the picker already does (`candidates` runs per keystroke; row building is ≤20 rows); one owner per rule. Review what's there rather than confirming the framing; if a prior scout's claim is wrong at HEAD, say so with evidence. Where you'd make a different call, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the naming rule's final shape and every call site; risks as named sequences reaching a bad state; what becomes false; a rough line estimate (removed vs added, production code only).

#### Report

##### Path Links Scout: Every Writer of a Page Link, and the Picker (HEAD `14da3f152`)

Nothing was edited. Paths are relative to the repo root. I read everything in this slice at HEAD.

The design assumes the reader scout delivers five things:
- **R1:** `LinkOccurrence.title` / `PageName.title` is the whole page half (`A/Notes`).
- **R2:** a basename helper. `basename` in `Core/Paths/posix.ts:42` already does the job, so no new helper is needed.
- **R3:** a path-aware `PageIndex.resolve` (A-4: full path first, else a unique tail).
- **R4:** `namesPage` admits `/`.
- **R5:** the `.md` strip (A-5) sits where `index.resolve` sees it.

Below, each of these is cited where an answer depends on it.

###### 1. The Naming Rule

**What exists:**
- `PageIndex` (`Core/Connections/pageIndex.ts:26-69`) is the only structure that knows how many pages hold a title.
- Both processes build it from one entity list through `pageIndexOf` (`Core/Nexus/record.ts:85`):
  - **Renderer:** `Core/Session/pageConnections.ts:30`.
  - **Host:** `Core/Nexus/heldPages.ts:41,48` and `Desktop/Actions/editorMenu.ts:121`.
  - **Also:** `assignValue.ts:57` and `matrixInput.ts:64`.
- No test hand-builds a `PageIndex`, so adding a member costs nothing elsewhere.
- A page's title is always `titleFromPath(path)` (`readNexus.ts:128`, `pageFile.ts:254`).
- Root `.md` files aren't pages (`fileEvents.ts:261`, `dirRel !== ''`), so every full path has at least two segments.

**Proposal:** one function, owned by the index, that reads the depth itself so no caller computes it.

```ts
// PageIndex member, named after the Decisions' "Written Name"
writtenName: (path: string, like?: string) => string

writtenName(path, like = '') {
  const full = stripMarkdownExt(path)
  const tail = full.split('/').slice(-like.split('/').length).join('/')
  return resolve(tail).page?.path === path ? tail : full
}
```

- **At depth 1** (no `like`, a bare title, or `''`): the tail is the title, and `resolve(title)` names P exactly when P is the sole holder. So it returns the title, else the full path (A-2, A-3).
- **At depth d** (`like` is the written half): it returns the d-segment tail where that names P alone, else the full path (E-2).
- **Case:** the tail is cut from P's real path, so case comes out corrected, as `target.page.title` corrects it today.
- **B-3 twins** (case-variant files): `resolve(full)` stays ambiguous, so the full path is written. That's correct; nothing more can be spelled.
- **Dependency:** the d>1 arm and the full-path fallback depend on R3. Depth 1 works on today's `resolve`.
- **Why it takes a path rather than a `ConnPage`:** a path is all that's needed, and it lets the embed pick tree hand over a path (Q2).
- **Alternative:** a numeric `depth`. It would make `resolvedTarget`, `LinkCell` and the cascade each compute `title.split('/').length`, which states one rule three times. I don't recommend it.

**`resolvedTarget` becomes "written at its written depth"** (`linkValue.ts:170`):
```ts
title: named.title === '' ? '' : index!.writtenName(target.page.path, named.title),
```
- The `!` is safe: `target.kind === 'page'` implies `index` is defined, but the type says `| undefined`, so it needs narrowing.
- Its three callers then keep the written form and correct case with no change of their own (A-7): paste (`pasteLink.ts:54`), Paste As (`pasteAsMenu.ts:59`, running in main via `editorMenu.ts:117-122`), and the Link field commit (`linkValueFromEdit`, `linkValue.ts:191`, reached through `parseEditorValue.ts:41`).

**The cascade's re-spell** (the cascade scout owns this):
- It calls the same function in `Core/Connections/rewrite.ts` `follower`, at `:52` (`to = { ...from, [part]: value }`), with `value = postIndex.writtenName(newPath, hit.named.title)`.
- `follower` is reached through `rewriteConnections` from `Core/Nexus/cascade.ts:180` and `Core/Trash/spend.ts:265`.
- The index must be the post-event one.

###### 2. Writer Inventory

Round 1's table holds at HEAD, with the corrections below. No hand-spelled `[[${…}]]` page template exists outside `connections.ts:174,178,182` and `linkValue.ts:53` (a YAML unwrap).

| Writer | Site | Identity Held | Smallest Change |
|---|---|---|---|
| Picker page pick + chevron | `autocomplete.ts:104-109` `pageRow` (`value: p.title`, `pageId`), then `commitEdit` `:173-179` | Title string; the row has only `pageId` | Swap `pageId: string` for `page: ConnPage` in `AcRow` (`:43`). `value` stays the drawn title. `commit` (`useConnectionAutocomplete.ts:162`) passes `conn.index.writtenName(row.page.path)` for page rows. This one field serves the name, the C-5 headings lookup (`row.page.path`), the alias stage (`row.page.id` at `:152`) and the pane key (`AutocompletePane.tsx:96`). |
| Shown-text check | `useConnectionAutocomplete.ts:142-146` (`title: row.value`) | Title | Use the same written name, plus the kept heading (Q4). |
| Picker heading pick | `commitEdit` `:181-203` from `ac.title` | Written half | None under R1. |
| `resolvedTarget` and its 3 callers | `linkValue.ts:159-174` | `ConnPage`, collapsed to `.title` | One line (Q1). |
| Copy Link (sidebar, tabs, nav, windows, views, link menu) | `pageMenuActions.ts:54`; callers `entityMenuActions.ts:106`, `connectionMenuActions.ts:43`, `NavList.tsx:40`, `TabBar.tsx:120`, `WindowTabStrip.tsx:125`, `useViewInteractions.tsx:404`, `popPageActions` | `{id, path, title?}` | `title: s.tree ? pageIndexOf(s.tree).writtenName(path) : title`. Depth 1 is right even from the link menu on a partial link: Copy Link writes a new link. |
| Heading grip Copy Link | `gripMenu.ts:78-79,91-94` via `host.pageTitle()` | Title string only | Replace `EditorHost.pageTitle(): string \| null` (`api.ts:204-205`) with `page(): ConnPage \| null`. The implementation is `editorHost.tsx:145` → `(pageId && pageOf(pageId)) \|\| null`, since `pageOf` already returns a `ConnPage` from `pagesByIdOf`. The grip writes `pageLinkText({ title: host.connections()!.index.writtenName(page.path), heading }, 'wiki')`. |
| `pageTitle()` consumers | `headingRenameSettle.ts:51` (`own`); `editorHarness.ts:27,83,90,135`; `gripMenuFlow.test.tsx:241`; `bodyMount.test.tsx:52` | Title | The settle becomes `host.page()?.title ?? ''` for now (E-7 and the cascade scout decide what it finally passes). The harness spec becomes `page?: ConnPage`, and its alias tidying reads `spec.page?.title`. `WebTile.tsx`'s `pageTitle` is an unrelated local name. |
| Embed source pick tree | `editorHost.tsx:136-139` (picks `p.title`); `gripMenu.ts:140-147` `pageEmbedText(title)` | Title | Pick `p.path` (`PageNode` has `path` through `PathNode`, `tree.ts:17`), so the pick holds identity as the tile handle's does. The grip writes `pageEmbedText(index.writtenName(path))`. |
| Embed exclusions | `embedWidget.tsx:645-652` (normalized written titles plus `titleFromPath(ancestor)`); `gripMenu.ts:23-30` `embedPickTree` | Mixed: written text vs basename | Key by path. `TileRange`'s page arm already carries `path` (`embedWidget.tsx:404`) and ancestors are already paths, so it becomes `out.add(t.path)` and `out.add(a)`, dropping the `titleFromPath` and `normalizeTitle` imports. `embedPickTree(nodes, exclude, name: (path) => string)` keeps `!exclude.has(n.pick) && expressibleInLink(name(n.pick))`. That's O(pages) at menu open, not per keystroke. `pickTree()` has no other consumer (`gripMenu.ts:56` only). |
| LinkCell Show Full Link | `LinkCell.tsx:46` | `ConnPage`, collapsed to `.title` | `pageLinkText({ title: api!.index.writtenName(target.page.path, namedPage(written)?.title), heading: target.heading }, 'wiki')`. A bare `[[#H]]` on a holder passes `''`, depth 1, so it still shows `[[Holder#H]]` as today. Going through `resolvedTarget` instead would show `[[#H]]`, a behavior change. |
| Paste As embed | `pasteAsMenu.ts:100` `pageEmbedText(target.title)` | Written half | **None.** Round 2 called this "missed". Under R1, `target.title` already comes out of `resolvedTarget` at its written depth, so the folder is kept. `pageEmbedText(title: string)` keeps its signature for the same reason; round 1's "take a `PageName`" isn't needed. |
| Settle label fill, `assignValue` | `linkSettle.ts:118-122`; `assignValue.ts:57` | Through the index | Fixed by Q6 and R3. |
| Not page writers | `fileLinkText`; `embedInsert.ts:57`; `embedGuard.ts:65` (compares a written text to itself); `format.ts`; `ValueEditor` URL | | None. |

###### 3. The Picker's Title Query and Heading List

- **No change needed for the query:** `autocompleteQuery:99` already sets `title: namedPage(readOccurrence(line, o))?.title`. A wikilink's `readOccurrence` keeps the whole half today (`linkValue.ts:71`), so `[[A/Notes#` gives `title: 'A/Notes'`. That needs R1 and R4 for markdown, and R3 for the heading list.
  - The heading list (`useConnectionAutocomplete.ts:81-91`, `resolve(title)` then `headingsOf(page.path)`) needs no change.
  - `commitEdit`'s `heading` arm writes in place, or `whole({ title: ac.title, … })`, so the folder is kept.
  - Round 2's "`AutocompleteQuery.title` must become `pageKey(named)`" was written for the separate `folder`-field design and is moot under R1.
- **The close must change.** At HEAD, `useConnectionAutocomplete.ts:118` is `found.length === 1 && normalizeTitle(found[0].value) === normalizeTitle(query)`. For a path link, `found[0].value` is the title `Notes`, not the query `A/Notes`, so the picker would open over every finished path link. That happens even before the matcher fold, which would make it worse.
- **Smallest fix:**
  - Have `autocompleteQuery` carry `title` (and, per Q4, `heading`) for every part, from one `named` read, instead of only for non-title parts. The existing `page` memo (`:81-84`) then resolves the title part too. That's O(1) and already keyed on `title`.
  - The close becomes `part === 'title' ? page !== null : <today's row compare>`. The row compare stays for headings and aliases.
  - An Ambiguous query then stays open by rule (B-4).
  - Because the close reads the parsed title, `.md` and decoding are already handled, provided the reader strips there (R5). Otherwise a finished `[[Notes.md]]` keeps the picker open. If the planner prefers not to widen `title`, `conn.index.resolve(query).status === 'resolved'` works, with the same R5 dependency.
  - `acQuery.ts:17-28` `sameQuery` compares every field, so any added field (`heading`) must join it or the pane won't refresh.
- **User-visible change:** a resolved `[[Notes]]` beside "Notes Archive" closes where today it opens. No test pins either behavior.

###### 4. C-5: A Title Pick Keeps the Heading Where the Page Holds It

- **Today:** a title pick writes `heading: open === 'heading' ? '' : undefined` (`autocomplete.ts:179`), so every heading drops. Pinned by `autocomplete.test.ts:294`.
- **The change:**
  - `AutocompleteQuery` gains `heading?: string`, the link's written heading, read alongside `title` (plus one `sameQuery` line).
  - `commit` decides whether to keep it. It reuses the one "does this page hold that heading" rule, `headingMissing` (`Core/MarkdownPM/Links/connectionsApi.ts:25-33`, exported):
    ```ts
    const keptHeading = row.kind === 'page' && ac.heading &&
      !headingMissing(conn, { kind: 'page', page: row.page, heading: ac.heading }, undefined)
      ? ac.heading : undefined
    ```
  - `commitEdit` takes `opts.heading` and writes `heading: open === 'heading' ? '' : opts.heading`.
  - The `asMarkdown` check (`:176`) and the hook's `keptShown` next target (`:142-146`) must both carry the kept heading.
- **Disclosed call: a page absent from the headings map reads as holding the heading.** That's `headingMissing`'s rule. It's safe: `loadHeadings()` asks for every page at open (`nexusSlice.ts:194`), and `readHeadings` gives every indexed file an entry, empty arrays included (`Desktop/Store/stores.ts:126`). So a page without headings is present with no keys and drops the heading. Absence only means the page isn't indexed yet.
- **The chevron:** it still opens an empty heading slot, as today.
- **After the pick:**
  - `keepsShown` with an unresolved baseline keeps the alias.
  - Re-picking the same page with Remove Title on now keeps the alias where it used to drop it, because `sameTarget` compares the heading too (`linkValue.ts:244-248`). That's correct.
  - `shownAlias` never remembers a link naming a heading. The alias stage still opens on a link showing nothing, as today.
- **`autocomplete.test.ts:294`:** stays true as a unit test (`commitEdit` without `opts.heading`), but its title "a retarget drops the old fragment" now describes only the case where the page lacks the heading.

###### 5. B-4: Confirmed by Reading

- `acQuery` recomputes on any selection change (`acQuery.ts:49-66`). For a closed `[[Notes]]`, `autocompleteQuery` gives part `title`, query `Notes`.
- `candidates` returns both holders, so the close at `:118` doesn't fire. Both rows show their trail (`pageRow` → `host.location`, `AutocompletePane.tsx:99-106`).
- A click on an unresolved link falls through to placing the caret (`linkClicks.ts:110-111`).
- A pick writes in place: `commitEdit` `title` → `whole()` over `ac.start..ac.end`. `keepsShown` keeps the alias because the baseline is unresolved (`linkValue.ts:261-263`).
- **The only gap is what the pick writes**, closed by Q2's first row.
- An aliased link whose click lands in the alias is C-1's to fix, not this slice's.

###### 6. Rule Interactions When `title` Is the Whole Half

| Site | What Breaks | Fix |
|---|---|---|
| `keepsShown` (`:255-264`) | Nothing; it compares resolved ids | Needs R3 only |
| `shownAlias` `keepsAlias(alias, target.page.title)` (`:146`) | Nothing; `page.title` is already the basename | None |
| `repeatsTarget` (`connections.ts:145-146`), used by `pageLinkText:173`, `namesTarget`, `keepsAlias`, `rewrite.ts:64` | `[[A/Notes\|Notes]]` keeps a redundant pipe, though B-1 draws it identically | Compare `basename(title)` inside `repeatsTarget`, the one "draws the same" rule. Every caller is fixed at once, and the basename of a basename is unchanged. |
| `namesTarget` in `shownAlias:151` and `rewrite.ts` `carry` | Covered by `repeatsTarget`. **But** `carry`'s `'title'` and `'both'` arms return `to.title`, the whole half, so a markdown label becomes `A/Plan`. | `carry` returns `basename(to.title)` (the cascade scout's file) |
| `defaultLabel` (`links.ts:35`), used by `pageLinkText:169`, `pageLabel`, the settle fill, `linkDisplayText:200` | **Writes damage into files:** a markdown pick writes `[A/Notes](A/Notes)`, and a settle fills an emptied label with `A/Notes` (`linkSettle.ts:120-122`) | `heading \|\| basename(title)`: one line, every caller |
| `linkDisplayText` wiki arm (`linkValue.ts:201-202`) | Returns the raw half, which feeds sort, filter, Remove Link's kept prose (`linkEdit.ts:42`) and `shownProse` | `const title = basename(target.title)` for the two reads |
| `aliasHost.title = page.title` (`:236`), `AliasList` `keepsAlias(text, host.title)` | Nothing | None |

**Disclosed call: `repeatsTarget` compares the basename only.** So a hand-typed `[[A/Notes|A/Notes]]` keeps its pipe (it does draw differently, under B-1), and alias memory records `A/Notes` as an alias. Matching the whole half as well would drop that pipe, and with it the only way to show a path. Basename-only reads as designed.

###### 7. A-6: Confirmed

`spellsAsWiki` → `expressibleInLink(t.title)` (`connections.ts:132-142`) runs over the whole half. It refuses `]]`, `|`, `#` and anything over 255 characters anywhere in the folder, so `pageLinkText` falls to `markdownLink(encodeLinkTarget(title), …)`. `encodeURI` keeps `/` and encodes `]`, `[` and `|` (checked: `A%5D%5Db%7Cc%5Bd/Notes`), and `#` becomes `%23`. With R2 in `defaultLabel`, the label is the basename. Reading it back needs R4. Nothing else is needed.

###### 8. Alias Memory and Remove Title With Duplicates

- **Re-picking the same duplicate** from `[[A/Notes|x]]`: today the check builds `{title: 'Notes'}`, which is Ambiguous, so `sameTarget` fails. With Remove Title on, the alias drops and `[[Notes]]` is written, which is ambiguous: a double failure. With the written name, the targets are the same, the alias is kept, and `shownAlias`'s `was` guard (`:153`) stops a re-record.
- **Retargeting `[[Notes|x]]` (ambiguous) to `[[A/Notes|x]]`** records `x` for A/Notes: `was` names no page, `before` is unresolved, so neither guard at `:151-154` fires. It matches today's phantom-to-resolved fix (`[[Notse|x]]` → `[[Notes|x]]` also remembers). Defensible, but it's a judgment the plan should state.
- **Picking B/Notes over `[[A/Notes|x]]`** with Remove Title on drops `x`. Correct.

###### Risks (Sequences That Reach a Bad State)

1. **Settle writes a path into a label:** `[](A/Notes)` with its label emptied, caret leaves → `emptied()` writes `A/Notes` into the file, unless `defaultLabel` takes the basename.
2. **Re-pick drops the alias and writes an ambiguous link**, if `:144` keeps `row.value` (Q8).
3. **Self-embed:** an embed written `![[A/Notes]]` inside `B/x`, with title-keyed exclusions, can pick its own ancestor `A/Notes`, or hide its twin `C/Notes`. Path keys fix it.
4. **The picker opens over finished links:** a row-count or row-value close plus path links (now) or the fuzzy matcher (D-1) opens the pane over every finished link the caret enters. Fix: close on resolve.
5. **`[[Notes.md]]` keeps the picker open**, if the `.md` strip lives somewhere `resolve` doesn't see it (R5).
6. **Partial-depth resolve at depth 1:** `writtenName` at depth 1 is correct on today's `resolve`, but `resolvedTarget` on a partial `[[Pommora/ClaudeMD]]` before R3 lands would return the full path (the tail doesn't resolve). Land R3 before the writers (C-6 order).
7. **`carry` writes `A/Plan` into a markdown label on rename** (cascade scout).

###### What Becomes False

- **`ConnectionsPM.md`:**
  - `:57`: "matched by title prefix" (the search scout's line).
  - `:55`/`:57`: no mention that a shared title writes its path. Add it.
  - `:58`: "the page that title names" should read "the page that page half names".
  - `:18`: "muted and inert until one side is renamed". It's now resolved through the picker.
  - `:60` ("writes an empty label as the page's title") stays true with R2 in `defaultLabel`.
- **`InterfacePM.md:42`:** "Copy Link (`[[Title]]`)".
- **Comments:**
  - `connections.ts:128`: `PageName`, "A page named by title".
  - `linkValue.ts:158`: `resolvedTarget`, "by that page's own title".
  - `linkValue.ts:180`: `linkValueFromEdit`, "by title".
  - `api.ts:204`: the `pageTitle()` comment, replaced with `page()`.
  - `autocomplete.ts:28`: query doc, once `title`/`heading` are carried for every part.
  - `useConnectionAutocomplete.ts:110`: "names its one match exactly".
  - `useConnectionAutocomplete.ts:74`: "an exact title" still holds as "a resolving title".
  - `autocomplete.ts:175`: the title arm, which now keeps a held heading.
- **Tests:**
  - `linkValue.test.ts:414-428` ("writes a resolved page by its own title") needs a depth case, e.g. `[[a/dup]]` → `A/Dup` with a twin. `:369` (`[[Dup]]` refused) stays true and needs an `[[A/Dup]]` accept.
  - `autocomplete.test.ts:294` (Q4).
  - `connectionCommit.test.tsx`: no duplicates are used, so it needs new cases: a duplicate pick writing the path, a re-pick keeping the alias, C-5 keep and drop, and the close.
  - Any `pageId` row assertions.
  - `gripMenu.test.ts:45-56` (title picks and the `'beta'` exclusion key).
  - `embedWidget.test.ts:117,132-136` (title-keyed exclusions; ancestors as `${title}.md`).
  - `gripMenuFlow.test.tsx:241` and `bodyMount.test.tsx:52` (`pageTitle` spec).
  - **Brief correction:** `LinkCell.test.tsx` has no Show Full Link case. `showFullLink` appears in no test file (only `LinkCell.tsx`, `Cell.tsx`, `TableView.tsx:679`), so it needs a new case rather than a correction.

###### Line Estimate (Production Only, This Slice)

About **+22 / −4, net about +18**. R2–R5 belong to the reader scout and aren't counted.
- `writtenName`: +6.
- Picker (`AcRow.page`, `heading` field, `sameQuery`, `commit`'s name, kept heading, close): about +10.
- Copy Link and the grip: +3.
- `linkDisplayText`: +1.
- Embed exclusions and the pick tree: about +2 / −3 (the `titleFromPath`/`normalizeTitle` imports go).
- Everything else is in-place line edits: `resolvedTarget`, `defaultLabel`, `repeatsTarget`, `LinkCell`, `pageTitle` → `page`, the `headingMissing` export, the pane key.

What the additions buy:
- **`writtenName`:** one rule for picks, Copy Link, re-reads and the cascade.
- **`heading` on the query:** C-5.
- **The close change:** a correctness fix that path links force anyway.

###### Notes

- **The prior scouts' `PageName` return shape is superseded.** Both rounds had the rule return a `PageName` with `folder` (`index.named(page): PageName`, `pageKey`). Under R1 the rule returns one string, the whole half.
- **Leftover files in the tree:** two untracked probe files, `Core/Connections/zz-probe-r97-spans.test.ts` and `Core/MarkdownPM/Autocomplete/zz-probe-arm.test.ts`, are in the working tree at HEAD, presumably left by another session. Whoever owns them should clear them before the gate.

---

### Round 4B — The In-App Re-Spell Cascade, Collisions, and the Heading Twin

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it, E especially.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 1 — Cascades" and "Round 2 — Cascade and Rewrite Reuse" (§1, §2, §5, §7, its proposed shape and alternatives). Every citation is a lead to re-verify at HEAD; both were written before partial paths (A-4) and the depth-keeping rule (E-2) were ruled, so their "a path link only re-spells to the full new path" is superseded.
4. `.claude/Features/ConnectionsPM.md` §The Rename Cascade.

HEAD `14da3f152` reverted `§` as a link opener. `INDEX_GENERATION` is 15; Path Links bumps to 17.

##### Your Slice: The In-App Re-Spell Cascade, Collisions, and the Heading Twin (Decisions E-1, E-2, E-3, E-5, E-7; the removals)

Files: `Core/Connections/rewrite.ts` (`rewriteConnections`, `follower`, `carry`, `rewriteHeadingConnections`, `RenameChange`), `Core/Nexus/cascade.ts` (`renameCascade`, `deleteCascade`'s key derivation, `spaceArm`, `spacesLinkHeading`), `Core/Nexus/rename.ts`, `move.ts`, `folderEntity.ts`, `create.ts`, `mutateRequest.ts` (`fromCreate`), `heldPages.ts` (`titleHeldOutside`, `frozenWorld`), `liveTree.ts` (`heldTreeOf`, `liveTreeOf`), `record.ts` (`pageIndexOf`, `pagesByIdOf`), `mutate.ts` (`renameHeading`, `underContexts`), `Core/MarkdownPM/Links/headingRenameSettle.ts`, `Core/Tiles/tilesFile.ts` (`rewriteTileConnections`, `tilesLinkHeading`), `Core/Properties/governedSweep.ts`, `Core/Properties/propertyCache.ts` (`editCaches`), `Core/Files/atomicWrite.ts` (`relocate`).

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **The one re-spell rule (E-2) as a pure function.** Given a hit's written page key, the index before the event, the index after, and the moved pages' ids: `p = before.resolve(written)`; skip unless it resolved; `q` = the same page after (by id); `next` = the tail of `q`'s path at the written depth, or the full path where that tail wouldn't name `q` alone in the after-index; leave the hit alone when `next` equals the written text byte for byte (a case-only rename still follows, since the tail differs by case); otherwise rewrite the title span to `next`. Confirm this one rule covers: a page rename (bare and path links), a page move, a folder rename or move (every page under it), a collision (E-3: a bare or partial link to Q that resolves to Q before and not after is re-spelled to Q's deeper tail or full path), and the restore refill (Trash scout owns the record; you own the rule). Where does it live (`pageIndex.ts` beside `holders`, since it needs holder counts; or `rewrite.ts`)? Signature. Does `follower(hit, 'title', next)` already do the whole title-span rewrite with carry/drop (verify `carry`'s `'title'` case returns the basename of the new name once a basename helper exists; the reader scout owns that helper)? Is `RenameChange`'s `{ title }` arm replaced by a decide-function, or by `{ before, after, moved }`? Fewest new types.
2. **Before and after indexes in every in-app op.** Confirm at HEAD: each of `renameOp`, `movePageOp`, `moveSetOp`, `renameFolderEntity`, `createPageOp`, the `fromCreate` rename, and the Trash restore reaches `relocate` → `noteOwn` → `applyOwn` → `applyEvents`, so `heldTreeOf(root)` read before the op is the before-tree and after it is the after-tree (both memoized through `pageIndexOf`). Where `moveNodeInTree` can't place a change and owes a walk, what's the after-tree, and is `liveTreeOf` (awaited) the right read? What does `renameCascade` read today (`liveTreeOf` post-change) and why that's a latent trap.
3. **Candidates per event.** Using the index scout's primitive ("files linking P" = `queryMentions` over every tail of P's old path; folder ops as prefix ranges or per-page tails; collisions as the tails of the arriving page's new path whose after-holders exceed one): write the candidate set for each event, and where `nexusCorpus` fallback is still right (index not ready).
4. **E-3 collisions, one rule in and out.** Events that can give a title (or a path tail) a second holder in-app: rename onto a held title, `createPageOp`, the `fromCreate` rename (today skips any cascade, `mutateRequest.ts`), a restore landing, a move whose new path is a tail another link was written to. Confirm each and that the rule in Q1 handles it with candidates from Q3. Move pairing before collision detection (E-3) belongs to the outside-lane scout; note the hand-off.
5. **E-5, in the op with a warning.** `renameCascade` returns `CascadeReport.warning` that the renderer shows; moves and folder renames today return no cascade. What each op's reply type carries (`mutateRequest.ts`, `Core/Contract/bridge.ts`), and the smallest change so a move or folder rename carries the same warning.
6. **E-7, the heading twin.** `rewriteHeadingConnections` matches `hit.target === titleKey && hit.qualifier === oldKey`. Under resolution: the hit resolves to page X and names the old heading. What `renameCascade`'s heading arm needs (the page, not the title), what `headingRenameSettle.ts` passes today (`host.pageTitle()`), and the smallest change in both so the editor's own-body pass and the cascade decide the same way. `spacesLinkHeading` and `tilesLinkHeading` keying.
7. **Removal inventory at HEAD:** `titleHeldOutside` and its uses, `rename.ts`'s `heldOutside` skip, `rewriteConnections`' title-equality body, `RenameChange.title`, `frozenWorld`'s `arriving` set (if the Trash scout's design makes it the after-index), `mutateRequest.ts` `fromCreate` skip, `namesPage`'s `/` clause (reader scout owns), comments and tests (`heldPages.test.ts`, `mutate.test.ts:383/398`, `cascade.test.ts:568/578`, `rewrite.test.ts`).
8. **Risks:** the editor's `skipRel` after a move (is the editor's path repointed by id? `livePagePath`); a folder rename while editors hold bodies; `carry`/`namesTarget` comparing shown text against a whole page half; rename-then-move as two cascades; the 800 ms descendant echo window.
9. **What becomes false** in docs, comments, tests, with file:line; and a rough line estimate (removed vs added, production code only).

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; never a full-Nexus re-walk when an incremental update works; the host owns the machine; read-write separation. Review what's there rather than confirming the framing; if a prior scout's claim is wrong at HEAD, say so with evidence. Where you'd make a different call, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the cascade's final shape end to end with the alternatives weighed; risks as named sequences; what becomes false; the line estimate.

#### Report

##### Path Links Scout: In-App Re-Spell, Collisions, Heading Twin (E-1, E-2, E-3, E-5, E-7)

I edited nothing. Everything below was read at HEAD `14da3f152`, with paths relative to the repo root.

###### Corrections to the Brief and Prior Scouts

- **`createPageOp` never reaches `relocate`.** The path is `createPage` → `atomicWriteFile` → `noteOwn({event:'change'})` (`Core/Nexus/page.ts:39-43`, `Core/Files/atomicWrite.ts:19-26`). `applyPage` then places the newborn with `placeNode` and returns `'ok'` (`Core/Nexus/fileEvents.ts:391-399`). The conclusion still holds: `heldTreeOf` read after the create holds the new page.
- **The re-spell must not compare `next` against `written` alone (E-2 as the brief words it).** Candidate files also hold links to pages nothing touched. A link written `notes` or `[[ Notes ]]`, or in NFD from Obsidian, would be "fixed" to the path's bytes, which breaks A-7. The decision needs the page's old path:
  - Leave a key alone when the tail of the old path at the written depth equals the tail of the new path byte for byte **and** the key still resolves to the page afterwards.
  - A case-only rename changes the tail, so it still follows (`mutate.test.ts:329` stays true).
- **"A deeper tail or the full path" (in the brief) contradicts E-2 and E-3, which both say full path.** Use the full path: one rule, nothing extra.
- **Moves and folder renames can collide now.** Round 1 said they couldn't under full-path resolution; A-4's partial paths make that false.
- **`renameCascade` reading `liveTreeOf` after the change (`Core/Nexus/cascade.ts:191`) isn't a trap for what it reads today.** It reads the registry, `contexts` for `spaceArm`, and `collections` for `editCaches`, and `editCaches` must see paths after the change, or a Collection rename patches the old sidecar path. The real trap is a different one:
  - If `moveNodeInTree` can't place the change, `applyEvents` sets `owed.walk` (`fileEvents.ts:664`) but `patchLiveTree` keeps the old tree (`Core/Nexus/liveTree.ts:38-44`).
  - `liveTreeOf` = `heldTreeOf ?? refreshTree` (`liveTree.ts:74`) then hands back the tree from **before** the change; it doesn't walk.
  - Resolution must never read the tree after the change, and nothing should read it while a walk is owed.
- **`skipRel` after a move is low risk, not "unverified".**
  - `mutate` flushes saves before moves (`Core/Session/nexusSlice.ts` mutate).
  - `reconcileNavigation` drops a slot whose path changed and re-selects it (`Core/Session/navigationSlice.ts:648-652`).
  - `PageView` keys the editor on the path (`Core/Pages/PageView.tsx:74`), so `renameHeadingIn(pageDetail.path)` gets the fresh path.

###### Q1. The One Re-Spell Rule

**What exists**
- `PageIndex.resolve` and `holders` (`Core/Connections/pageIndex.ts:26-53`).
- `pageIndexOf` and `pagesByIdOf` are memoized per tree on the `collections` array (`Core/Nexus/record.ts:65,85`, `Core/Nexus/tree.ts:131-146`), so a tree captured before the op keeps its own index.
- `follower(hit, 'title', value)` already rewrites the whole title span (`Core/Connections/rewrite.ts:45-75`). It percent-encodes markdown through `encodeURI` (which keeps `/`), escapes table cells, and falls back to the markdown form when the wikilink can't spell the target (`spellsAsWiki`/`expressibleInLink`, `Core/Connections/connections.ts:132-143`). That fallback is A-6, for free.
- `Core/Connections` imports nothing from `Core/Nexus`, so anything that takes trees has to live in `cascade.ts`.

**Additions, smallest form**

1. **`nameOf` and `namesOf` in `pageIndex.ts`, beside `resolve`.** Both are pure and both processes use them.
   ```ts
   nameOf(page: ConnPage, index: PageIndex, depth = 1): string
   // the tail of page.path (no .md) at `depth` where index.resolve(tail) is `page`, else the full path
   namesOf(page: ConnPage, index: PageIndex): string[]
   // the normalized tails of page.path that resolve to `page`
   ```
   - At depth 1, `nameOf` *is* the Written Name (A-2), so the writer scout's naming rule and the re-spell share one function.
   - `namesOf` is the "keys that name this page" every cascade needs: candidates, the heading arm, the editor's own pass.
   - It relies on the index scout's tail-aware `resolve`, and on the reader scout's path-tail and basename helper.
2. **`respellings` in `cascade.ts`, about 15 lines.** It turns the rule into a map from key to spelling.
   ```ts
   respellings(before: PageIndex, after: PageIndex, now: ReadonlyMap<string, ConnPage>,
               moved: Iterable<ConnPage>, arriving: Iterable<ConnPage>): Map<string, string>
   ```
   - The pages it examines are the `moved` pages (as they stood before), plus every Y where some tail of an arriving page's new path had Y as its sole resolution before (the E-3 collision arm).
   - For each examined p, look up q = `now.get(p.id)`, then for each k in `namesOf(p, before)`:
     - Skip k if `tail(p.path, depth k) === tail(q.path, depth k)` and `after.resolve(k).page?.id === q.id`.
     - Otherwise map k to `nameOf(q, after, depth k)`.
3. **`rewriteConnections(body, names: ReadonlyMap<string, string>)`.** It replaces the title-equality body (`rewrite.ts:21-28`) with the same shape:
   ```ts
   const next = names.get(hit.target)
   if (next !== undefined && next !== hit.named.title) edits.push(...rewrite(hit, 'title', next))
   ```
   - Compare against the **decoded** `named.title`, not raw body bytes, since markdown targets are percent-encoded.
   - Self-fragments (`target` is `''` when no own title is passed) never match.
4. **`RenameChange`'s `{ title }` arm becomes `{ names: ReadonlyMap<string, string> }`.** There are no new types.
   - The map keys are the candidate queries (Q3), the tiles gate keys, and the rewrite closure for bodies, Link and Text values, Space sidecars, tiles and caches (`cascade.ts:178-245`).
   - I prefer this over a `decide(written)` closure: the map serves the queries and the gate too, and tests stay `new Map([['target', 'New Target']])`.

**Cases the rule covers**

| Event | What happens |
|---|---|
| Page rename, bare link | Old tail ≠ new tail, so it re-spells to the new title, or the full path when the new title is shared |
| Page rename, path link | Re-spells to the new tail at the same depth (`[[A/Notes]]` → `[[A/Plan]]`) |
| Page move | The bare key's tail is unchanged and still resolves, so it stays; full or partial keys through the old folder re-spell |
| Folder rename or move | The same, for every page under the folder |
| Collision | Y's tail is unchanged but no longer resolves after, so it re-spells to Y's full path |
| A bare key ambiguous before | Not in `namesOf`, so it stays (`mutate.test.ts:383` stays true) |

- **Restore refill (Trash scout's record):** it uses the same per-key step with p taken from the recorded target id. If the record keeps no delete-time path, pass `q.path` as the old path; that loses only a case-only rename made while the page sat in the Trash.

**`carry` and the drop need the basename helper (reader scout owns it) at four call sites:**
- `namesTarget(shown, from)` (`connections.ts:153`): `[[A/Notes|Notes]]` currently returns null, so a stale alias is kept.
- `carry`'s `'title'` and `'both'` writes of `to.title` (`rewrite.ts:34,38`): they would write `A/Plan` as the alias.
- `repeatsTarget(carried, to.title, …)` (`rewrite.ts:64`): `[[A/Plan|Plan]]` would keep a redundant pipe.
- `defaultLabel` in the markdown fallback (`links.ts:33`).

**Open for the planner:** `[[Notes.md]]` renamed to Plan. The markdown title span covers `.md` while `named.title` drops it (`rewrite.test.ts:135`), so an unchanged link keeps `.md` (A-7) and a re-spelled one loses it (A-5 says never write it). The wikilink side follows whatever the reader scout lands; the decisions don't rule this case explicitly.

###### Q2. Indexes Before and After Each In-App Op

- **Through `relocate` → `noteOwn` → `applyOwn` → `applyEvents` (`Core/Nexus/settle.ts:36-48`):**
  - `renameOp` → `renamePage` (`page.ts:55`)
  - `movePageOp` → `movePage` (`page.ts:91`)
  - `moveSetOp` → `moveFolderEntity`
  - the folder branch of `renameOp` → `renameFolderEntity` → `relocateFolder` (`Core/Nexus/folderEntity.ts:31,62,74`)
  - the restore (`Core/Trash/spend.ts:205`)
- **`fromCreate`** goes through `renamePage`, so it reaches `relocate` too.
- **`createPageOp`** lands through the `atomicWriteFile` change event instead (see the corrections).
- **The restore's `applyMove`** can't place a move out of the Trash, so it applies as an unlink plus an add or `addDir` (`fileEvents.ts:586-590`). `applyFolder` reads the folder in place (`:334-359`), so a walk is rare even there.
- **The before-read:** the tree each op already holds.
  - `movePageOp:34`, `moveSetOp:58` and `createPageOp:29` already call `liveTreeOf`.
  - `renameOp` adds `const before = await liveTreeOf(root)`; it's free, since `mutableTarget` just made it held.
- **The after-read:** `await payOwedWalk(root); heldTreeOf(root)`.
  - This is the precedent `underContexts` set (`Core/Nexus/mutate.ts:73-80`, `settle.ts:212`).
  - When nothing is owed it costs a place in the settle turn and nothing else.
  - The awaited `liveTreeOf` is the wrong read, for the reason in the corrections.
- **Query after the relocate:** `moveIndexPaths` has already moved the linkers' `path` column by then (`fileEvents.ts:270`). A query before it returns old paths for pages inside a renamed folder, and those count as skipped.

###### Q3. Candidates per Event

There's one helper: `linkersOf(root, keys) = union of queryMentions(k)`, or `nexusCorpus(root)` if any query answers null. It also folds the duplicated fallback at `cascade.ts:96-99` and `:171-174`.

| Event | `moved` | `arriving` | Keys queried |
|---|---|---|---|
| Page rename | P | P | Every old tail of P that resolved to P (all of them change), plus collision keys |
| Page move | P | P | Only old tails at a depth that reaches the changed folder, e.g. `a/x/notes` for `A/X/Notes → B/X/Notes`; bare `notes` drops out |
| Folder rename or move | Pages under the old folder | The same pages under the new folder | Per page, only tails passing through the renamed segment: one key for a top-level Collection, `depth(F)` keys at most |
| `createPageOp` | none | the new page | Collision keys only |
| `fromCreate` rename | **none** | the page | Collision keys only. Old `[[Untitled]]` links must not follow the first commit, which is the reason today's skip exists |
| Restore | Trash scout: the trashed page at its delete-time path, which needs a `before` that includes it | Landed pages | as in the rows above |

- **The key set is `names.keys()`.** The filter that decides what to query is the rule itself, so a folder op queries path-link holders and never bare linkers.
- **Cost:** 5k pages under a Collection is about 5k prepared exact lookups (`Desktop/Store/stores.ts:192`), roughly 100 ms per user op. If measurement argues against that, the escape hatch is `depth(F)` prefix ranges over the folder's own tails (`f/`, `b/f/`, `a/b/f/`), which do catch partial keys. That's one new store method in four places.
- **The `nexusCorpus` fallback is still right while the index isn't ready.** It's the established behavior for title renames, and a drag during the first seed reads the corpus once.
- **Tiles:** today a title rename reads every tile (`cascade.ts:233-236`), and every sidebar drag would too.
  - Generalize the `tilesLinkHeading` cache (`Core/Tiles/tilesFile.ts:267-289`) to store each `target` alongside `target\0qualifier`, as one `tilesLink(root, keys)`.
  - That's about 3 changed lines, and one gate serves both arms.
- **Spaces:** `spaceArm` already gates in memory (`cascade.ts:55-58`).
- **`editCaches` cost:** it opens every Collection sidecar that caches a Link property on every move whose `names` isn't empty, which is every page move, since the full-path key always changes. It's a user op, not high-frequency; worth naming.

###### Q4. E-3 Collisions

- **Every in-app source is confirmed:**
  - A rename onto a title held elsewhere: `renamePage` refuses only same-folder names (`page.ts:54`).
  - `createPageOp`: `createDisambiguated` checks siblings only (`Core/Nexus/create.ts:42-46`).
  - The `fromCreate` rename (`Core/Nexus/rename.ts:29-36`, `Core/Nexus/mutateRequest.ts:64`), which today skips any cascade.
  - A restore landing (`freeName` among siblings).
  - A move or folder move whose new path's partial tail another page answered alone.
- **All of them are the `arriving` arm of `respellings`.** The renamed or moved page's own links to a now-shared title also go to its full path through the `moved` arm.
- **Hand-off:**
  - Pairing moves before collision detection, the external add, and a rescope or Try Again that brings folders into reach (`fileEvents.ts:139-143,514-519`) belong to the outside-lane scout.
  - The 800 ms prefix echo (`Core/Files/writeEcho.ts:10`) can surface an in-app folder move's children as a watched unlink plus add. That lane must pair only ids the held tree doesn't already hold at the new path.

###### Q5. E-5, Run Inside the Op With a Warning

The plumbing already exists; this needs no contract change.
- `MutateOutcome.cascade?: CascadeReport` is on every reply (`mutateRequest.ts:12-21`), and `bridge.ts:256` carries `MutateReply`.
- `handlers.ts:197-201` owes `cascade.pages` and `hosts` for every non-delete op.
- The renderer calls `warnCascade` for every non-delete reply (`nexusSlice.ts` mutate; `Core/Interface/Notifications/notifications.ts:56`).

The whole of E-5 is one helper that every op calls:
```ts
relink(root, before: NexusTree, label: string, from: string | null, to: string): Promise<CascadeReport | undefined>
// payOwedWalk → after = heldTreeOf → respellings → names.size ? renameCascade(root, label, { names }) : undefined
```

| Op | Change |
|---|---|
| `movePageOp`, folder branch of `renameOp` | return `ok({ cascade })` |
| `moveSetOp` | `joinCascades` (`cascade.ts:75`) with its `reachReport` |
| `createPageOp` | `ok({ created, cascade })` |
| `renameOp` page arm | returns `relink`'s report in place of `renameCascade` |

The cascade belongs at the op level, as `renameOp` and `moveSetOp` already do, not inside `folderEntity.ts`.

###### Q6. E-7, the Heading Twin

- **Today:** `rewriteHeadingConnections` matches `hit.target === titleKey` (`rewrite.ts:92`). The cascade queries by title (`cascade.ts:174`). `own = titleFromPath(file)` (`:217`) gives every twin's `[[#H]]` the same key. The editor passes `host.pageTitle()` as both title and own (`Core/MarkdownPM/Links/headingRenameSettle.ts:51,57`). So both sides rewrite links aimed at a twin and miss `[[A/Notes#H]]` on the page itself.
- **The smallest change on both sides:**
  - The signature becomes `rewriteHeadingConnections(body, keys: ReadonlySet<string>, old, next, own: string, outline?)`. It matches `keys.has(hit.target)`, and `own` is **the swept file's own full-path key**, so a bare fragment's target is that page's path key.
  - X's `[[#H]]` then matches, a twin's doesn't, and `ownTitle` needs no boolean or id.
  - The § run gate (`cascade.ts:187`) becomes `own === pathKey(X)`.
- **Host:**
  - `renameCascade`'s heading arm takes the page's path and finds `X = pageAt(tree, path)`, with `keys = namesOf(X, pageIndexOf(tree))`.
  - Candidates are the union of `queryHeadingMentions(k, h)`; X's own self-links come through when the index keys self-links by own path (index scout).
  - `mutate.ts:94` already sends `req.path`.
  - `HeadingRenameSeen.title` becomes `path` (`Core/Index/indexSeed.ts:94-98,140`, `fileEvents.ts:298,306`).
- **Editor:**
  - The facet's `pageTitle(): string | null` becomes `page(): ConnPage | null` (`Core/MarkdownPM/api.ts:205`, `Core/Pages/editorHost.tsx:145`, which already has `pageOf`).
  - `headingRenameSettle` computes `namesOf(page, host.connections()?.index)`, and the renderer's index is built from the same `pagesOf`, so both sides decide the same way.
  - `gripMenu.ts:78` needs only `.title`, or, better, the writer scout's `nameOf` for Copy Link (`gripMenu.ts:92`).
- **The gates:**
  - `tilesLinkHeading` is asked over `keys` through the generalized `tilesLink`.
  - `spacesLinkHeading` (`cascade.ts:61-73`) can go, along with `cascadeSeen`'s pre-check (`fileEvents.ts:299-305`). It repeats `renameCascade`'s own gates (an empty `rels`, `spaceArm`'s in-memory test, the tile gate), and `readLiveSetting` is in memory (`Core/Settings/settings.ts:36-40`), so `cascadeSeen` becomes `renameCascade` plus a log plus `oweCascade`.

###### Q7. Removal Inventory at HEAD

- **Production code:**
  - `titleHeldOutside` (`Core/Nexus/heldPages.ts:37-44`), with its uses at `rename.ts:12,37-38,41` and `cascade.ts:33,89-91`.
  - `rewriteConnections`' title-equality body (`rewrite.ts:21-28`); its signature changes at `spend.ts:265` (Trash scout).
  - `RenameChange.title` (`rewrite.ts:18`).
  - `spacesLinkHeading`, and the pre-check in `cascadeSeen`.
  - The duplicated corpus fallback (`cascade.ts:96-99` / `:171-174`).
  - The `fromCreate` skip, with its comment at `mutateRequest.ts:64` and `rename.ts:29-36`, which now runs `relink(…, null, to)`.
  - `deleteCascade`'s `gone` derivation becomes the tails of the deleted pages' paths that no page holds afterwards. `delete.ts:94-97` passes paths captured before the delete, and `cascade.test.ts:568` and `:578` stay true.
- **Trash scout's:** `frozenWorld`'s `arriving` set (`heldPages.ts:47-53`) goes only if their design makes it the after-index, and `namesPage`'s `/` clause is the reader scout's.
- **Tests:**
  - `heldPages.test.ts:83` goes.
  - `mutate.test.ts:365` ("a fromCreate rename skips the link cascade") becomes false. It stays true only if `fromCreate` examines no moved page, which this design gives.
  - `mutate.test.ts:398` becomes false.
  - Signature changes: `rewrite.test.ts` (36 hits), `cascade.test.ts` title-arm calls (13) and heading-arm calls, `cascade.test.ts:796-806` (`spacesLinkHeading`), `aliasAcceptance.test.ts` (10), `admission.test.ts:117,132`, `linkValue.test.ts:293,315`, `tilesFile.test.ts:325-327,509`, `indexSeed.test.ts:175`.

###### Q8. Risks as Named Sequences

1. **An op interleaving with another op or a settle (E-6).** `withWriteRoot` doesn't serialize ops (`Core/Contract/handlers.ts:99-111`). Op B's `before` goes stale mid-sweep of op A. A rename then a move run one after the other is safe, since each captures its own `before` after the previous op's settle. Whether that becomes one host lock or a settle-paid cascade is the planner's call.
2. **The after-read while a walk is owed** returns the tree from before the change. Fixed by `payOwedWalk` first.
3. **A folder rename while editors hold bodies.** Saves are flushed first, the sweep writes under per-file locks, `pages:changed` lists paths after the change, and moved slots re-select. That machinery exists for title renames, but this widens it to many files.
4. **Twin `Untitled` noise.** Creating a page in a second folder while an `Untitled` exists elsewhere re-spells `[[Untitled]]` links to the first one. That's correct under E-3, but frequent; worth showing Nathan.
5. **A heading rename settling as its page moves.** Unlikely, since focus leaves on the drag, but the request would name the old path. The heading arm should answer "nothing to cascade" when `pageAt` misses, rather than counting a skipped file.
6. **The 800 ms prefix echo:** see Q4's hand-off.
7. **A cold index:** one corpus sweep per rename or move during the first seed.

###### Q9. What Becomes False

- **`ConnectionsPM.md`:**
  - `:22`: main checks whether a title is still held outside a delete, a rename, or a restore.
  - `:26`: "A connection resolves by title, so renaming a page rewrites every body that names the old title".
  - `:28`: a heading rename should read "links that resolve to that page".
  - `:30`: the last sentence.
  - `:74`: the known issue should read "the rename's or move's warning".
  - `:78`: the Duplicate Disambiguation prospect is done.
- **`CorePM.md`:**
  - `:87`: "a page rename stands when its link rewrite can't reach every file" now covers moves and folder renames.
  - `:176`: "a link-rewriting rename" now includes moves.
- **Comments:**
  - `heldPages.ts:1` and `:37`.
  - `cascade.ts:60`, `:81` and `:161`: the docstrings say a title, and "a title rename reads every tile".
  - `mutateRequest.ts:64`.
  - `rewrite.ts:20` and `:77`.
  - `fileEvents.ts:296`.
  - `api.ts:204`, the `pageTitle` comment.

###### Line Estimate (Production Code, My Slice)

**Removed: about 45**

| What | Lines |
|---|---|
| `titleHeldOutside` and its uses | about 12 |
| `spacesLinkHeading` and the `cascadeSeen` pre-check | about 20 |
| The duplicated corpus fallback | about 4 |
| The `gone` derivation | about 3 |
| The old `rewriteConnections` body | about 6 |

**Added: about 65 to 75**

| What | Lines |
|---|---|
| `nameOf` and `namesOf` (`nameOf` shared with the writer scout) | about 8 |
| `respellings` | about 15 |
| `relink` | about 10 |
| `linkersOf` | about 5 |
| New `rewriteConnections` | about 6 |
| Heading arm by keys | about 5 |
| Op call sites (6) | about 12 |
| Tile gate | about 2 |
| Editor `page()` and keys | about 3 |

**Net: about +20 to +30.** The net is only honest once the reader scout's basename helper and tail-aware resolve land; they're counted there, not here.

###### The Cascade End to End

1. The op holds `before`, calls `relocate` or writes the page, then calls `relink(root, before, label, from, to)`.
2. `relink` pays any owed walk and reads `after = heldTreeOf`.
3. `respellings` turns the moved and arriving pages into a map from key to spelling.
4. `renameCascade(root, label, { names })` runs the existing sweep over:
   - files from `linkersOf(keys)`
   - `linkKeysOf` frontmatter
   - `spaceArm`
   - tiles gated by `tilesLink`
   - `editCaches`
5. The op returns `ok({ cascade })`, so the warning appears and pages are pushed with no new plumbing.
6. **Heading renames** use the same function by keys from `namesOf(X)`. **Delete** keeps `deleteCascade` with path-tail keys. **Restore** uses the same rule and the same `respellings` with the Trash scout's record.

**Alternatives weighed**
- **Owing every in-app re-spell to the settle:** it loses the synchronous warning and `skipRel`, and needs an all-pages id diff per settle, which the hard rule forbids.
- **A `decide` closure in place of the map:** equivalent, but it can't serve the queries or the gates.
- **A prefix query per folder tail:** fewer queries, but a new store method. Hold it in reserve.

---

### Round 4B — The Outside-Move Lane, Pairing by ID, Closed-App Catch-Up, and the Gate

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it, E-4, E-5, E-6 especially.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 2 — Triggers and External Moves" (all of it) and "Round 2 — Cascade and Rewrite Reuse" §"One Correction to Make First". Every citation is a lead to re-verify at HEAD.
4. `.claude/Features/ConnectionsPM.md` §The Rename Cascade (the outside heading-rename paragraph), `.claude/Features/DesktopPM.md` (the watcher), `.claude/Features/CorePM.md` (index paragraphs).

HEAD `14da3f152` reverted `§` as a link opener. `INDEX_GENERATION` is 15; Path Links bumps to 17.

##### Your Slice: The Outside-Move Lane, Pairing by ID, Closed-App Catch-Up, and the Gate (Decisions E-1, E-3's pairing-first, E-4, E-5, E-6)

Files: `Core/Index/indexSeed.ts` (`reindex`, `HeadingRenameSeen`, `seedContentIndex`, `SeedReread`, the prune at ~224, `deindexPath`, `indexWrittenPage`, `moveIndexPaths`), `Core/Nexus/fileEvents.ts` (`indexEvent`, `cascadeSeen`, `applyMove`, `applyPage`, `applyFolder`, the `gone` arm, `applyEvents`), `Core/Nexus/settle.ts` (`Owed`, `settle`, `walkWhileOwed`, `missedEvents`, `settleBatch`, `inTurn`, `pushed`), `Core/Nexus/handlers.ts` (the open-time seed, ~98-103), `Core/Contract/handlers.ts` (`withWriteRoot`), `Core/Nexus/mutate.ts` (`underContexts`), `Desktop/FileWatch/watcher.ts` (`SETTLE_MS`, `awaitWriteFinish`, batches), `Core/Files/writeEcho.ts`, `Core/Files/atomicWrite.ts` (`relocate`, `noteOwn`), `Desktop/Store/stores.ts` (`page_values`, values-by-paths read), `Core/Nexus/remintLedger.ts`, `Core/Sync/Arrival/land.ts` (`landRename`), `Core/Nexus/folderEntity.ts`, the container sidecars (`_pagecollection.json`, Set sidecars: do they carry an ID that travels with an outside folder rename?).

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **The lane to reuse (E-4).** Re-verify the heading-rename lane end to end: `reindex` compares prior rows at a path with the new ones, reports `HeadingRenameSeen`, `applyEvents` owes it, `settle()` pays it through `cascadeSeen`, and the open-time seed (`handlers.ts`) owes what changed while the app was closed. Then the smallest design that rides it for moves: vanished page IDs recorded where rows are removed (`deindexPath` for a live `unlink`; the `unlinkDir` prefix case; the seed's prune), arrivals recorded at a watched `add` whose path had no prior row and at the seed's new paths, paired at settle (`arrived ∩ vanished`, only when something arrived), the pair owed as `moves` beside `renames` in `SeedReread` and `Owed`, and paid in `settle()` after `walkWhileOwed` through the same shape as `cascadeSeen`. Signatures, and exactly what changes in `Owed`, `SeedReread`, `HeadingRenameSeen`/its sibling, `indexEvent`, `applyEvents`, `settle`, and the open-time seed. In-app moves (`applyMove` → `moveIndexPaths` renames rows) record nothing as vanished: confirm.
2. **Remembering a vanished ID across settles (E-4).** An outside rename lands as an `unlink` and an `add` often in separate watcher batches (`SETTLE_MS` 200 ms both for the debounce and `awaitWriteFinish`): confirm the timing at HEAD. Where does state persist across settles today (`Owed.stamp`, `renames`)? Propose the session-scoped `vanished: Map<id, oldPath>` (keep the first `was` for chained moves), the occupancy guard (drop an entry whose `was` is now held by a different ID) instead of a time limit, and the cost per unlink/add (one SELECT of `ID` from `page_values`?).
3. **Closed-app catch-up and the generation bump (E-4).** The seed on open: does it hold prior rows for pruned paths and the IDs under them, so a page that vanished at X and appeared at Y pairs by ID? Confirm `seedContentIndex`'s prune and re-read. Confirm the one-time limit: the first open after a generation bump reseeds from nothing, so moves made while closed before that open can't be paired (heading renames have the same hole).
4. **Folder identity (E-1).** An outside folder rename yields N page pairs. Do container sidecars (`_pagecollection.json`, Set sidecars) carry an ID that moves with the folder, so the pair can be one container mapping (old prefix → new prefix) rather than N page pairs? How does the tree re-read an outside folder rename today (`applyFolder`, `unlinkDir`/`addDir`)? What does `excluded_folders` do (`followExcludedFolders` is in-app only; an adjacent gap — note it, don't design for it).
5. **Outside page rename and bare links.** Today an outside page rename cascades nothing for title links (confirm). E-4 says an outside move or rename adjusts links as an in-app one does, and E-2 is one rule for every form, so the paid re-spell covers bare links too. Confirm this is new behavior; note the Obsidian double-rewrite (both apps rewrite; same text) and the Sync case (`landRename` via `machine().rename` is seen as an outside move on the receiving device → relinks there too; same bytes → idempotent, extra writes).
6. **Payment and the deindexed-sibling gap.** Paying after `walkWhileOwed` and after the batch has re-indexed: does a page inside an externally renamed folder that path-links a sibling get re-indexed before the pay step runs? Order the steps at HEAD and confirm, or name the gap.
7. **E-5, logging.** Owed cascades only log today (`fileEvents.ts` ~307); no push channel carries warnings (`Core/Contract/bridge.ts`). Confirm; the paid re-spell logs the same way.
8. **E-6, the gate.** What's serialized today (`inTurn` settles, `batchQueue`, `withWriteRoot` settling in `finally`) and what isn't (address-changing ops share no lock; a batch's `applyEvents` runs outside `inTurn`; `relocate` locks the source path only). Two shapes: (a) one host lock around rename, move, delete, restore, and create that also spans the settle's payment of owed re-spells; (b) in-app re-spells move to the settle (loses the synchronous `cascade.warning`, which E-5 keeps). Recommend the smallest form that satisfies E-5 and E-6 with evidence, naming what it reuses (`underContexts`'s lock shape?).
9. **Risks:** split batch; a path reused before payment (A renamed X→Y, B created at X before the settle); a linker moved mid-sweep; the cold index (`NO_REREAD`); pending vanished entries growing; echo suppression of the cascade's own writes inside the settle (`recordWrite`); `fileEvents.test.ts:417-433` asserting no walk.
10. **What becomes false** (`DesktopPM.md` watcher paragraph, `CorePM.md` "one rewriter", `settle.ts`/`fileEvents.ts` header comments, the `cascadeSeen` and `missedEvents` comments, tests), with file:line; and a rough line estimate (removed vs added, production code only).

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; no O(N) work per settle or per frontmatter save (re-checking pending entries on every settle would rebuild `pagesByIdOf`); the host owns the machine; read-write separation. Review what's there rather than confirming the framing; if a prior scout's claim is wrong at HEAD, say so with evidence. Where you'd make a different call, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the lane's final shape end to end (live, catch-up, in-app hand-off, payment, gate); risks as named sequences; what becomes false; the line estimate.

#### Report

###### Outside-Move Lane Scout: Report (HEAD `14da3f152`, Read-Only, Nothing Edited)

Paths are relative to the repo root.

###### Corrections to Prior Scouts

- **Batch timing ("unlink emits right away") is wrong at HEAD.** chokidar 5.0.0 turns `atomic` on by default when it isn't polling (`node_modules/chokidar/index.js:278-280`), and that holds every file `unlink` for 100 ms (`:486-496`). An `add` waits for `awaitWriteFinish`: a first poll at 50 ms, then 200 ms without a size change (`:502-521`, `:608-655`; `watcher.ts:106`).
  - **Single-file rename:** the unlink emits at about 100 ms and the add at about 200–250 ms, both inside the 200 ms debounce (`watcher.ts:38,120-124`). It usually lands in one batch, unlink first. Splits still happen (slow polls, event-loop stalls, big folder moves).
  - **Same batch doesn't help:** the unlink applies first, so pairing still needs memory across events.
- **Folder renames arrive in a different order than assumed.** `_remove` recurses through the children (`index.js:730`), but only `UNLINK` is held, so `unlinkDir` emits at once (`:756`) and the children's `unlink`s follow 100 ms later. `deindexPath` on the `unlinkDir` runs `removePathPrefixIndex` (`indexSeed.ts:147-148`), which wipes the child rows before their unlinks arrive. The vanished IDs must therefore be read under the prefix at the `unlinkDir`; the later child unlinks find nothing.
  - The test helper `renamed` (`fileEvents.test.ts:384-397`) emits file unlinks, then adds, then unlinkDirs. That isn't chokidar's order, so tests for this lane need the real order.
- **New gap the brief doesn't name: a reply's settle can run in the middle of a batch.** `settleBatch` runs `applyEvents` outside `inTurn` (`settle.ts:199-201`), and `withWriteRoot`'s `settleNow` (`Contract/handlers.ts:101-106`) is gated by nothing but `inTurn`. So a reply settle can pair and pay while the watcher batch is half applied. Fix: pay moves only `!batching` (`settle.ts:61`). The batch always ends in its own `settleNow` (`:209`), so nothing is stranded.

###### 1. The Lane to Reuse

**What exists:**
- `reindex` (`indexSeed.ts:123-142`) reads the prior `readHeadings` rows, upserts, and returns `HeadingRenameSeen[]`.
- `indexWrittenPage` returns that list (`:100-121`). `indexEvent` owes it only for `ev.origin === 'watched'` (`fileEvents.ts:278-282`) through `oweRenames` (`:291-294`) into `Owed.renames` (`:108`), which is carried across settles (`settle.ts:139`).
- `settle()` pays the list one at a time, ahead of `walkWhileOwed`, through `cascadeSeen` (`settle.ts:128-133`, `fileEvents.ts:296-309`).
- **Catch-up:** the open-time seed (`Nexus/handlers.ts:102-103`) and `missedEvents` (`settle.ts:172-178`). The open's own `settleNow` (`handlers.ts:105`) returns early because `adopting()` is true (`settle.ts:126`), so what the open owes is paid by the settle that follows (`handlers.ts:108`, or the first batch). Moves would ride the same way.

**In-app moves record nothing as vanished (confirmed):**
- Index side: `indexEvent` `move` calls `moveIndexPaths`, which renames rows (`indexSeed.ts:163-165`). A move into the Trash goes through `deindexPath` (`:154-156`), whose result `moveIndexPaths` ignores.
- Tree side: `applyMove`'s fallback `unlink`/`add` go through `applyOne`, not `indexEvent` (`fileEvents.ts:587-589`).
- System-trash `discardFile` emits an own-origin `unlink`, so the origin gate drops it.
- `relocate` records both ends (`atomicWrite.ts:67-70`), so the watcher drops the echoes (`watcher.ts:118`). A late child echo finds rows already renamed and records nothing.

**Smallest design that rides the lane (one index source for live and catch-up):**

`indexSeed.ts` changes:
- Add `export interface PageAt { id: string; path: string }` and `export interface IndexSeen { renames: HeadingRenameSeen[]; vanished: PageAt[]; landed: string[] }`.
- `reindex(rows)` returns `{ renames, landed }`. `landed` is every written row's `entry.values[ID_KEY]`, read from the parse already in hand, so it costs **zero queries**.
- `indexWrittenPage(...)` returns `Promise<Omit<IndexSeen, 'vanished'>>`.
- `deindexPath(root, abs): Promise<PageAt[]>` reads the IDs at the path, or under the prefix, before removing.
- `SeedReread extends IndexSeen { db; rels }`:
  - `vanished` is the pruned paths' IDs, read before the prune at `:224`.
  - `landed` is the flushed rows, taken after the fresher-row filter at `:188-193`.

`fileEvents.ts` changes:
- `Owed` gains `vanished: Map<string, string>` (ID → the first path it left) and `landed: Set<string>`. `nothingOwed` seeds both.
- `oweRenames` is replaced by `oweSeen(root, seen: Partial<IndexSeen>)`. It pushes renames, sets a vanished ID only if absent (so the first `was` wins), and adds landed IDs.
- `indexEvent`: the `unlink`/`unlinkDir` arm owes `deindexPath`'s result for watched events, and the `add`/`change` arm owes `{renames, landed}` for watched events, the same gate as `:281`.
- New `pairedMoves(root, owed): PageMove[]` (`PageMove = {id, from, to}`):
  - For each landed ID in `vanished`, `to = livePathOf(root, id)`.
  - Pair only if `to` is non-null and differs from `from`, and the occupancy guard passes: the page at `from` (`pageAt`, O(depth)) is absent or carries the same ID.
  - Delete the entry once paired or once guarded out; clear `landed`.
- `cascadeMoved(root, moves)` mirrors `cascadeSeen`: it calls the in-app re-spell (another slice; it should take `readonly PageMove[]` so a folder's N pages share one sweep), `console.error`s a warning, and calls `oweCascade`.
  - Better: fold both into one `cascadeSeen(root, seen: HeadingRenameSeen | readonly PageMove[])` with a switch, since they share the log-and-owe tail. That reads as "one function, two triggers".

`settle.ts` changes:
- Carry `vanished` at `:139` beside `renames`.
- After `walkWhileOwed`, behind the gate: pay renames, then (if `!batching`) `pairedMoves` followed by `cascadeMoved`; then `walkWhileOwed` again.
  - I'd move the heading loop here too, so all paid re-spells sit in one place. The second walk covers "a cascade's own writes may owe" (`:127`).
  - Moves must come after the walk: `missedEvents` replays only re-read paths (`:177`), so the tree still holds pruned pages until the walk.
- `missedEvents` calls `oweSeen(root, seed)`.

Elsewhere:
- `Nexus/handlers.ts:103` becomes `oweSeen(root, reread)`.
- `reseed` (`settle.ts:166-170`) stays unowed. Its existing reason, an own write whose indexing failed reading as an outside change, applies equally to a move whose in-op re-spell already ran.

**Pairing at the settle, not at owe time:** this handles an add arriving before its unlink inside one batch. The cost is O(landed) map lookups per settle. Tree work (the `writablePathsOf` memo) happens only on a real match, so a frontmatter save never pays for it.

**The ID read:** two forms, both needing `Core/Testing/memoryStores.ts` and `storesContract.ts`.
- **I'd fold it into the existing read:** `IndexedStat` gains `id?: string`, and `readIndexedStat(s)` gains a `LEFT JOIN page_values ... key = 'ID'` plus an optional `under` (the `stores.ts:49` range).
  - The seed's snapshot at `:180` then carries the pruned IDs at no extra cost.
  - `deindexPath` uses `readIndexedStat(rel)?.id` or `readIndexedStats(rel)`.
- **Alternative:** a new `readIds(paths | {under})`.
- **Not usable:** `readPageRelations(paths, 'ID')` (`stores.ts:133-157`). It's gated on `readyDb` (`contentIndex.ts:91-92`), so it returns null during the seed's prune, it drags the relations query along, and it has no prefix form.

###### 2. Remembering a Vanished ID Across Settles

- **What persists today:** `Owed` is module state reset only when the root changes (`fileEvents.ts:126-132`). `stamp`, `walk`, `whole` and `renames` survive the settle's reset (`settle.ts:136-139`). `vanished` joins that list and is session-scoped for free.
- **Chained moves:** keep the first `was`. `landed` is a set of IDs and the destination comes from the tree, so A→B→C pairs A→C.
- **Occupancy guard instead of a time limit:** checked at pairing against the tree after the walk, not by scanning on every settle.
- **Growth:** one entry per page deleted outside during the session, a few bytes each. Pruning happens only at pairing, or when the same ID returns to its own path (a delete-and-recreate pairs `was === to` and drops).
- **Cost:**
  - one PK SELECT per watched `unlink`
  - one range SELECT per watched `unlinkDir`
  - zero per `add`/`change`
  - zero per own save, because of the origin gate

###### 3. Closed-App Catch-Up and the Generation Bump

- **The seed holds what pairing needs:** the `indexed` snapshot (`indexSeed.ts:180`) lists every prior path. Pruned rows still exist until `:224`, so their IDs are readable there, or come free with the folded read. New paths arrive as flushed rows carrying their IDs. A page that vanished at X and appeared at Y pairs by ID.
- **The one-time limit is confirmed.** A generation bump drops the index tables (`ddl.ts:3,80+`), so `indexed.size === 0` returns `NO_REREAD` (`indexSeed.ts:226`); a missing store also returns it (`:181`). Heading renames have the same hole.
- **Other one-time misses:**
  - A move split across a close (the unlink seen live, the app closed before the add): the row was already deindexed, so nothing is pruned and nothing pairs.
  - A swap while closed (A X→Y, B W→X): X isn't pruned, so A's vanish isn't seen.
  - Accept and name both.

###### 4. Folder Identity

- **Sidecars carry an ID that travels with the folder:** `_pagecollection.json` and `_pageset.json` hold `id` (`containerFields.ts:50-51`; `~/Test/Collection B/Set Beta/_pageset.json`), and tabs and nav follow containers by ID through the tree.
- **But I recommend N page pairs, not one container mapping:**
  - The content index has no container rows (`indexWrittenPage` handles markdown only, `:106`).
  - A container pair would need tree hooks (the `gone` arm's `containerAt(...).id`, `applyFolder`'s placed node) and has nothing to offer catch-up. That's a second source.
  - The re-spell is per page anyway (E-2's per-page depth; fork 3's per-page tail queries). A container mapping would just be expanded back into page pairs.
  - What actually saves work is the payment taking all of a settle's pairs at once, so they share one sweep.
- **How the tree re-reads an outside folder rename today:** `unlinkDir` hits the `gone` arm, which calls `removeNodeInTree` (`fileEvents.ts:608-612`). `addDir` hits `applyFolder`, which runs `readFolder` and `placeNode` (`:334-360`). Each child `add` then hits `applyPage` with matching IDs and stabilizes (`:397-400`). No walk, which is what `fileEvents.test.ts:417-433` asserts.
- **Adjacent gap (noted, not designed for):** `followExcludedFolders` runs only in `relocateFolder`'s `landed` callback (`folderEntity.ts:31-32`), so an outside rename of a folder holding excluded entries leaves `excluded_folders` stale.

###### 5. Outside Page Rename and Bare Links

- **Confirmed new behavior.** `renameCascade` is called only by `rename.ts` and `cascadeSeen`. An outside page rename reaches the index as `deindexPath` plus `indexWrittenPage` and rewrites no title links today. With the lane and E-2, the paid re-spell covers bare links too: `[[Old]]` becomes `[[New]]` at depth 1.
- **Obsidian double rewrite:** Obsidian's link rewrites usually land in the same batch as the rename's `add`. The index then already shows the new targets, so the pay step finds no candidates and writes nothing.
  - If they land later, both apps write. Obsidian's spelling follows its "new link format" setting, so its text **may differ** from E-2's depth-preserving spelling. Both resolve to the same page, A-7 leaves a resolving link alone, and the last writer wins.
  - The lost-update window for Obsidian's other edits is the same one the heading cascade already has.
- **Sync:** `landRename` uses a bare `machine().rename` with no echo record (`Sync/Arrival/land.ts:122-141`; `atomicWrite.ts:40`). The receiving device sees an outside move and re-spells. The bytes are the same as the sender's rewritten linkers, so it's idempotent, but it costs extra writes and possibly conflict churn.

###### 6. Payment and the Deindexed-Sibling Gap

**Order at HEAD:** `settleBatch` runs `applyEvents` over the batch (every event indexed, then patched into the tree), then `missedEvents` and its replay, then the stamps, then `settleNow`. Inside the turn, `settle()` pays renames, then walks, then pushes (`settle.ts:193-210, 124-163`). Paying after the walk in the batch's own settle means every event in the batch is indexed first.

**The gap remains in two cases:**
- **A split batch.** p2's pair pays in batch 1 while sibling B/p1 is deindexed (by the prefix removal) and not yet re-added, so p1's `[[A/p2]]` isn't a candidate. When p1 lands in batch 2, only p1's own move is in hand.
- **A reply settle mid-batch** (see Corrections). The `!batching` guard closes this one.

The split case stays as a named risk. It's narrow: path-form links between pages of the same outside-moved folder. Bare links between siblings with unchanged unique titles need no rewrite.

###### 7. E-5, Logging (Confirmed)

- Owed cascades only log (`fileEvents.ts:307`).
- `Pushes` has no warning channel (`Contract/bridge.ts:282-300`).
- The paid re-spell logs the same way. In-app ops keep `cascade.warning` in the reply.

###### 8. E-6, the Gate

**Serialized today:**
- settles (`inTurn`, `settle.ts:57`)
- batches (`batchQueue`, `watcher.ts:42`)
- `withWriteRoot` settling in `finally`, after `fn` (`Contract/handlers.ts:101-106`)
- Context ops (`underContexts`, `mutate.ts:73-81`)

**Not serialized:**
- Address ops share no lock: rename, `movePage`, `moveSet`, non-Context delete, and non-seeding create run bare (`mutate.ts:82-101,153-157`).
- A batch's `applyEvents` runs outside `inTurn`.
- `relocate` locks only the source path (`atomicWrite.ts:67`).

**Recommendation: shape (a).** One host lock, `machine().lock(<root-scoped key>, fn)`, taken by `dispatch` around createPage, rename, delete, restore, movePage and moveSet, and by the settle around its paid re-spells. Shape (b) contradicts E-5.
- **It reuses** `underContexts`'s lock shape: a keyed `machine().lock` on a root-scoped path, which rejects rather than deadlocks on re-entry (`Desktop/Platform/fileLock.ts:7-16`).
- **It can't reuse `underContexts` itself, or its key.** `underContexts` awaits `payOwedWalk`, which is `inTurn`, while holding its lock (`settle.ts:212`). A settle holding `inTurn` and waiting on the same lock would deadlock.
- **Nesting rule:** the gate sits innermost. `underContexts` holds `contextsDir`, inside it the gate runs the op, the gate releases, and then `payOwedWalk` runs. No op may await `inTurn` while it holds the gate; at HEAD only `payOwedWalk` and the reply's `settleNow` do, and both fall outside the gate.
- **Key choice:** pick a distinct key. `nexusDir(root)` is already the schema lock (`Properties/propertiesRegistry.ts:130`).
- **Cost:** while an op holds the gate, a settle with re-spells to pay waits, and so does every reply queued behind it. That only happens when something is owed.

###### Final Shape, End to End

1. **Live:** a watched unlink or unlinkDir records vanished IDs. A watched add or change records landed IDs (from the parse, free).
2. **Catch-up:** the seed reports its pruned IDs as vanished and its new rows as landed. The open and `missedEvents` owe them; `reseed` doesn't.
3. **In-app hand-off:** the op runs its re-spell under the gate and returns the warning; nothing is recorded by the lane.
4. **Settle:** walk, then, behind the gate, pay heading renames and, if `!batching`, pair landed IDs against vanished with the tree guard and pay them all through one re-spell call. Log, owe the cascade, walk again, push.
5. **Gate:** innermost around address ops, and around the settle's paid block.

**E-3 tie-in:** the unpaired landed IDs are the natural input for outside-collision detection, run after pairing.

###### Risks as Named Sequences

- **Split batch:** unlink in batch 1, add in batch 2 pairs correctly. The sibling path links inside a moved folder can be missed (§6).
- **Add before unlink across batches** (sync clients that copy then delete): the arrival goes unpaired. If E-3 runs collision detection on it, bare links to the still-present original become paths that break when the unlink lands. The collision slice should skip landed IDs still held at another path.
- **Path reused before payment:** A goes X→Y, then B is created at X before the settle. The guard drops the pair, so links to X now resolve to B.
- **Linker moved mid-sweep:** an outside move of a linker during the pay hits not-found and is counted as skipped. The gate doesn't cover outside moves.
- **Cold index:** `NO_REREAD` means no pairing after a bump or with no store.
- **Pending vanished entries grow:** they're small, session-scoped and pruned on pairing; acceptable.
- **Echo of the cascade's own writes:** `atomicWrite` calls `recordWrite`, so they apply as `own`, are never owed, and their echoes drop.
- **No-walk test:** `fileEvents.test.ts:417-433` stays true (no linkers means no writes and no walk). Its event order should match chokidar's.
- **Duplicate IDs:** if a Finder copy keeps the ID and the original is deleted outside, an edit to the copy pairs the move to the copy. That's defensible, since the copy is the ID's only holder.
- **Git checkout (NexusOS):** a mass outside move. Candidates come from the post-batch index, so mostly no-ops, but a branch whose links are inconsistent can come out dirty.

###### What Becomes False

- **`.claude/Features/DesktopPM.md:22`:** "Identity survives an external rename because the id rides in the file itself". Links now follow too, and the catch-up pairs.
- **`.claude/Features/ConnectionsPM.md:28`:** the outside heading-rename paragraph should generalize to moves.
- **`.claude/Features/CorePM.md`:**
  - `:95` (the locks sentence) gains the address gate.
  - `:96` "one rewriter applies a rename".
  - `:108`, the index's roles, if the ID read folds into `IndexedStat`.
- **Comments:**
  - `settle.ts:1` (order of steps), `:127` (ahead of the walk), `:136` (what survives), `:165` (reseed's renames unowed → also moves), `:172` (`missedEvents`).
  - `fileEvents.ts:291` and `:296` (`oweRenames`, `cascadeSeen`).
  - `indexSeed.ts:100,123,168`.
  - `mutate.ts:72` (lock narrative).
- **Tests:**
  - `indexSeed.test.ts:173-216` (return shapes, `toEqual({db:null, rels:[], renames:[]})`)
  - `settle.test.ts:643` (the `SeedReread` mock)
  - `storesContract.ts:102-155` (`IndexedStat` equality, if folded)
  - the `fileEvents.test.ts:384` helper's order

###### Line Estimate (Production Only, Excluding the Re-Spell Function Itself)

| Area | Added | Removed |
|---|---|---|
| `indexSeed.ts` (types, `deindexPath` read, seed vanished/landed) | ~15 | ~3 |
| Store read fold (`Desktop/Store/stores.ts`, `Platform/stores.ts`, `contentIndex.ts`) | ~9 | ~2 |
| `fileEvents.ts` (`Owed`, `oweSeen` replacing `oweRenames`, `pairedMoves`, `cascadeMoved` or the union) | ~26 | ~4 |
| `settle.ts` (paid block, carry, `!batching`) | ~6 | ~4 |
| `mutate.ts` gate (helper plus six cases) | ~8 | 0 |
| **Total** | **~64** | **~13** |

That's **net ~+50 (+64 / −13)**. The prior scout's 40–60 covered trigger and pairing only; this adds the gate and the store read.

---

### Round 4B — The Trash Record and Repair

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it, F especially.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles, §Philosophies, and §Working Rules (rule 2: Nathan believed the restore already repaired a returning page's stale links; it doesn't).
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 1 — Cascades" (the Delete and Restore rows and §Proposed Cascade Shape's Delete/Restore), "Round 2 — Cascade and Rewrite Reuse" §6 Trash. Every citation is a lead to re-verify at HEAD.
4. `.claude/Features/ConnectionsPM.md` §The Rename Cascade (the delete and restore paragraph), `.claude/Features/TrashPM.md` or whatever feature document describes the Trash (find it under `.claude/Features/`), and the commits `031952078`, `e605d9b15`, `3f0b84bf1`, `3e0907013` (`git show --stat` and their messages) for what the restore refill, parking, and Restore Links On Deletion govern.

HEAD `14da3f152` reverted `§` as a link opener. `INDEX_GENERATION` is 15; Path Links bumps to 17.

##### Your Slice: The Trash's Record and Repair (Decisions F-1 to F-6, with E-2's one re-spell rule and E-3's collision rule applied at the restore)

Files: `Core/Trash/delete.ts`, `spend.ts` (empty, restore, the refill at ~265, `scrubReturning`'s call), `holdings.ts` (`parkLinks`, `trashedTitles`, `trashedHolders`), `restoreScrub.ts`, `bundle.ts`, `resolve.ts` (the landing by parent id, `freeName`), `record.ts` (`StrippedLink`, the content record and its zod schema), `Core/Nexus/cascade.ts` (`deleteCascade`), `Core/Nexus/heldPages.ts` (`frozenWorld`), `Core/Properties/propertyValue.ts` (`gonePageEntry`, `Frozen`), `Core/Properties/assignment.ts` (~91-101), `Core/Settings` (Restore Links On Deletion), `Core/Nexus/folderEntity.ts` / wherever a folder delete is handled.

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **Today, exactly.** Walk a delete and a restore at HEAD: what the delete reads and records per page (does it already read every page it moves, as F-6 assumes?), what `deleteCascade` receives (titles) and strips, how `StrippedLink` is recorded, what `parkLinks` parks and by what key, what the restore does in order (landing by parent id and `freeName`; `scrubReturning`; `relocate`; the refill through `rewriteConnections(value, was, landed)`), and what Restore Links On Deletion governs. Confirm by reading that a returning page's own body and frontmatter links are NOT repaired today when their target was renamed or moved while the page sat in the Trash (F-5's "it doesn't").
2. **F-1, a deleted folder.** Does a folder delete trash its pages in one bundle? What does `deleteCascade` get for a folder (every title under it)?
3. **F-4 and F-6, one record and one rule.** The design the decisions imply: at delete time, for each outbound link the delete strips from other pages' Link values (`StrippedLink`) record the target page's id (`to`), since the delete has the before-index; at restore, re-spell each recorded value to the current spelling of the page it named, by id, through the planner's one re-spell rule (`spellAt(page, depth)` from `PageIndex`: the tail of the page's path at the written depth, or the full path where that tail isn't unique), dropping or parking only a value whose page is truly gone. This replaces the title-keyed refill and `scrubReturning`'s title test. Map the exact changes to `deleteCascade` (take pages with ids and paths instead of titles; derive gone keys as the tails of each deleted page's path), `StrippedLink`, the record's zod schema, the refill, `parkLinks` (by id; `trashedTitles` goes?), `frozenWorld` (becomes an after-index built from tree pages plus the landing pages as `ConnPage`s?). Smallest form, with signatures.
4. **F-5, the returning page's own stale links.** F-3 forbids touching a trashed page's body, so repair needs a record made at delete time: for each page going to the Trash, its outbound links (body and frontmatter, via `linksIn`/`valueLinks`) resolved against the before-index to target ids, stored in the bundle record keyed by the written page key. At restore, after the page lands (`relocate`), read its content once, and for each hit whose recorded target id now spells differently at the written depth, rewrite through `follower`/the one rule. Verify: the delete reads each page's content already (where?); where the bundle record is written and its schema; the restore's order (lands first, then repair, so the body is never touched in the Trash); whether the repair can ride the same sweep primitive the cascade uses (`sweepGovernedRoots` with `text`) over the landed files only. Also the reverse direction: links in OTHER pages that named the returning page read phantom while it's away and resolve again when it lands at its old path; when it lands elsewhere (F-2: `freeName`, or its Set was deleted), treat it as a move from its delete-time path to the landing path through the move rule (candidates = tails of the delete-time path), so the record needs the delete-time path per page (does the content record hold `path` or only `parent`?).
5. **F-2 and collisions at restore.** A restore can land a page under a title another page now holds (E-3 collision at restore): the arriving page's tails whose after-holders exceed one → re-spell the other holder's bare links. Confirm the restore has the before- and after-trees (`liveTreeOf` at ~152 and after `relocate`).
6. **The Empty's hand-off and re-park** (`spend.ts` ~82-89: "unless another bundle holds that title"): what it does and whether keying by id changes behavior Nathan would notice (if so, say so plainly for a ruling).
7. **Removal inventory:** `scrubReturning`/`restoreScrub.ts` (does it collapse into the one rule?), `trashedTitles`, `frozenWorld.arriving`, the title-keyed refill, `Frozen.holds(title)`'s doc, comments at `holdings.ts:1,69,83`, `record.ts:37`, tests (`cascade.test.ts:568/578`, `heldPages.test.ts`, `spend.test.ts`/`restoreScrub.test.ts`).
8. **Risks:** a page restored via `freeName` into a world where its old path is now held by another page (the recorded id closes it; confirm); two trashed pages sharing a title; a bundle written by an older build (no `to`, no link record) restored by the new one (what the zod schema does with a missing field; graceful?); the record's size for a page with many links.
9. **What becomes false** in docs, comments, tests, with file:line; and a rough line estimate (removed vs added, production code only).

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; a trashed page's body is never touched in the Trash; the host owns the machine. Review what's there rather than confirming the framing; if a prior scout's claim or a decision's stated "today" is wrong at HEAD, say so with evidence. Where you'd make a different call, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the Trash's final shape end to end (delete record → restore repair → refill → parking); risks as named sequences; what becomes false; the line estimate.

#### Report

###### Path Links Scout: The Trash's Record and Repair (F-1 to F-6)

I edited nothing. HEAD is `14da3f152` and the repo root is `/Users/nathantaichman/The Studio/Projects/Project Pommora`; every citation below is relative to it.

###### Corrections to the Brief and Prior Scouts (Working Rule 2)

1. **F-6's "the delete already reads every page it moves" is false for folders.**
   - A page delete reads its one file, but only for the ID (`gather.ts:31`), and throws the text away.
   - A Set or Collection delete reads only the folder's sidecar ID (`gather.ts:31`, `sidecarId`).
   - `folderCorpus` returns paths without reading them (`delete.ts:92`, `indexSeed.ts:83-86`).
   - `pageIdsOf` reads files only in system-trash mode (`delete.ts:46`).
   - So recording outbound links costs one read per page in a folder delete. A user action pays it, not a frequent trigger, and the restore's scrub already reads every one of those pages (`restoreScrub.ts:51,65`).
   - **Cheaper source:** `readPageRelations(paths)` (`contentIndex.ts:91`) needs no file reads. But it returns null on a cold index, and its SQL leaves out embeds (`Desktop/Store/stores.ts:138`: `kind IN ('body','citation','value')`), so it would need a file fallback, which makes two ways. **Lean:** read the files.
2. **Prior scouts' `to` field on `StrippedLink` isn't needed** (round 1 §Proposed Cascade Shape, round 2 §6).
   - The bundle's location already records each trashed page's path at delete time:
     - `trashChainDir` mirrors `dirname(rel)` under `.trash` (`bundle.ts:13-20`).
     - The artifact keeps its inner tree.
     - `frozenCrumbs` already reads that location as "the only surviving evidence" (`trashRows.ts:20-28`).
   - **Check:** `join(relative(<root>/.trash, dirname(bundleAbs)), relative(bundleAbs, file))` gives back the delete-time path for a page directly in a bundle, for one in nested Sets of a trashed Collection (`Coll/Set/Sub/X.md`), and for one in a trashed Set (`.trash/Coll/<stamp>__Set.deleted/Set/...`).
   - **Why `to` adds nothing:** a key that resolved to one deleted page in the before-index has that page as its only holder among the deleted pages. So resolving a recorded value against the bundle's own pages at their delete-time paths names the same page `to` would.
   - **What this gains:** no schema change, and old bundles are covered automatically.
   - **What it loses:**
     - A hand-moved bundle: path-form values stop matching, bare ones still match.
     - One sequence: a path-form value's target moves while its linker sits in the Trash, then the target is deleted, then the linker is restored first. The value fails to match by name at the park and again at the later refill, and it drops.
   - **Why I accept it:** it's rare, and ID-keyed parking would lose precision at the next step anyway unless `to` rode the whole chain (park → append → refill). A half-measure buys nothing.
3. **The restore doesn't just leave a returning page's stale links in place: it drops some of them.**
   - **Frontmatter:** a returning Link value whose target was renamed while the page sat in the Trash fails `frozen.holds(title)` (`heldPages.ts:51`), is stripped by `gonePageEntry` (`propertyValue.ts:141-150`, `restoreScrub.ts:41,62`), and is parked only if the Trash holds that title.
   - **Body:** passes through verbatim (`restoreScrub.ts:63`, `splitEnvelope(content).body`) and reads phantom.
   - Nothing else reads the landed page's links. Cascades never reach `.trash`: the index excludes it, and `nexusCorpus` skips hidden folders.
4. **`scrubReturning` doesn't collapse into the one rule.** It also reconciles Context keys, Select options, and Space sidecars. Only its Link-gone test is re-keyed, through `Frozen`.

###### 1. Today, Exactly

**Delete** (`Trash/delete.ts`):
- **Before the move:**
  - `liveTreeOf` at `:36` is the before-tree.
  - `mintBundle` at `:44`.
  - The `partial` record from `gatherContentRecord` at `:87-88` holds `{entity, id, parent}`; parent is by container ID (`gather.ts:17-22`).
  - `titles` at `:89-92`: `[titleFromPath(abs)]` for a page, or `folderCorpus(...).map(titleFromPath)` for a folder (duplicates allowed).
- **The move and the strip:**
  - `relocate` at `:94`.
  - `deleteCascade(root, abs, titles)` runs afterwards (`:97`), against the post-delete held tree.
- **What `deleteCascade` strips** (`cascade.ts:82-159`):
  - `gone` is the titles no page outside the deleted path holds (`titleHeldOutside`, `heldPages.ts:38-44`).
  - Candidates come from `queryMentions` per title, falling back to the corpus.
  - It sweeps only tree-held or withheld files outside the deletion (`:116-118`).
  - It strips Link-typed keys whose value `gonePageEntry` flags.
- **How `StrippedLink` is recorded:** as `{page: holder id, property: def id, value}` (`cascade.ts:43-47,136-143`). The final record write merges `links` in (`delete.ts:98-103`; zod schema at `record.ts:24-28,38`).

**Restore** (`Trash/spend.ts:131-282`), in order:
1. `tree = liveTreeOf` (`:152`), which is the pre-landing tree.
2. `resolveRecord` lands by parent ID (`resolve.ts:76-90`), with `freeName` checked among siblings only (`:82-90`).
3. `was`/`landed` titles (`:171-172`); `landed === was` for folders.
4. `frozenWorld(tree, landing titles)` (`:173-178`, `heldPages.ts:47-53`).
5. `scrubReturning`, which runs before the move and writes trashed frontmatter only (`:185-192`), then `parkLinks(dropped)` (`:193`).
6. The registry entry for a Context.
7. `relocate` (`:205`).
8. The refill, only when `restoreLinksOnDeletion` is on (`:252-275`): each recorded value goes through `rewriteConnections(value, was, landed)` (`:265`, title equality), then `refillValues(..., frozen)`, and a holder that is itself in the Trash goes through `refillTrashed`.

**Parking:** `parkLinks` (`holdings.ts:84-94`) resolves each value to its title (`readLinkText`) and picks the newest bundle holding that title through `trashedTitles` (`:70-81`). A path-form value never matches.

**What Restore Links On Deletion governs:** the refill arm only (`spend.ts:252-256`; hint at `Settings/frames.ts:602`). Commit `3e0907013` made that explicit: dropping and parking happen whatever the switch says.

###### 2. F-1, a Deleted Folder

**Today:**
- A folder delete is one bundle: `mintBundle(root, abs)` (`delete.ts:44`), then the whole folder is relocated into it (`:94`), with a record entity of `collection` or `set`.
- `deleteCascade` gets every corpus file title under the folder (`:92`), including duplicates (`cascade.test.ts:583` passes `['Target','Target']`).

**Change:** pass delete-time paths from `pagesOf(before)` filtered by `isAtOrUnder(p.path, rel)` instead of walking the corpus. The before-tree is already captured at `:36`, so the `folderCorpus` import goes (`delete.ts:7`).

###### 3. F-4 and F-6: One Record and One Rule

**Smallest form:**
- `deleteCascade(root: string, abs: string, paths: readonly string[])`.
  - The gone keys are every path tail (the planner's tail helper) that no tree page outside `abs` holds. This inlines `titleHeldOutside` as a key test over `pageIndexOf(tree).holders(key)`.
  - Its `goneEntry` (`cascade.ts:100-101`) works unchanged on keys.
  - **Callers:** the delete passes tree paths; the Empty passes `deletedPathOf(...)` for each artifact page (`spend.ts:84`).
- `StrippedLink` and its zod schema stay unchanged.
- **New record field:** `targets?: Record<string, string>`, the normalized written key mapped to a target page ID (see §4).
- **The refill** replaces `spend.ts:265`.
  - Each value is re-spelled through the planner's pure rule: `relinkConnections(value, owner, after)`, where `owner = (hit) => byId(returning.resolve(hit.target).page?.id)` and `spellAt(page, depth)` is evaluated in `after`.
  - When `returning` is ambiguous, the value goes back verbatim, which covers test `:578`'s twins.
- `frozenWorld(tree, landing: readonly ConnPage[] = [], targets: Readonly<Record<string,string>> = {}): Frozen & { after: PageIndex }`.
  - `after = buildPageIndex([...pagesOf(tree), ...landing])`.
  - `holds(key)` asks `targets[key] ? afterIds.has(id) : after.holders(key).length > 0`.
  - This replaces the hand-rolled `arriving` set. The O(N) build happens once per restore, never on a frequent trigger.
- **One Trash index** replaces `trashedTitles` and merges with `trashedHolders` (`holdings.ts:97-125`): one walk yielding each trashed page as a `ConnPage` at its delete-time path, plus its bundle and file.
  - `parkLinks` keeps its signature and resolves each value through `index.resolve(key)`.
  - That serves the scrub, `restoreProperty` (`restoreProperty.ts:65`), and re-assign (`assignment.ts:91-101`), which have no recorded identity, all through one resolution.
- **`deletedPathOf(root, bundleAbs, file)`**, about 3 lines, shared with `frozenCrumbs`.

###### 4. F-5, the Returning Page's Own Stale Links

**Record (at delete):**
- `gatherContentRecord` (`gather.ts:24-38`) already calls `liveTreeOf` (`:20`), so `pageIndexOf(tree)` is the before-index, free and memoized.
- For a page it reuses the text it already reads (`:31`). For a folder it reads each `contentPages` file.
- Over `linksIn(body)` and `valueLinks(frontmatter)` it maps every key that resolves to exactly one page to that page's ID, across the whole bundle. Resolution is global (A-4 reads no relative paths), so one map serves every page in a bundle and per-page keying is unnecessary.
- The write-ahead writes at `delete.ts:88` and `:99` carry it with no further changes.
- **Size:** bounded by the distinct resolved targets, at most the Nexus's page count. That's about 60 bytes per entry, roughly 3 MB worst case for a 50k-page bundle.

**Repair (at restore):**
- It runs after `relocate`, so the body is never touched in the Trash.
- It sweeps exactly the landed files through `sweepGovernedRoots(root, landed, { text })`, the cascade's primitive, rewriting the body and the link-typed frontmatter keys (`linkKeysOf`) with `owner = byId(targets[hit.target])` in `after`.
- A target that is truly gone leaves the body link phantom (F-3). Frontmatter values whose target is gone were already dropped and parked by the scrub, through the ID-aware `holds`.
- It should use the synthetic `after`, never `heldTreeOf` read after the move: when one end is the Trash, `applyMove` splits into an unlink and an add, or walks (`fileEvents.ts:586-590`), so the held tree can lag.

**The Reverse Direction (F-2):**
- **Owner rule:** a link elsewhere names a returning page when `current = pageIndexOf(tree)` holds no page for its key and `returning` (the bundle's pages at their delete-time paths) resolves it.
- **Rewrite:** `owner = current.holders(w).length ? collisionVictim(current.resolve(w)) : returning.resolve(w).page`, spelled in `after`, through the planner's move cascade (bodies, values, Spaces, tiles, caches).
- **Candidates:** `queryMentions` over the tails of the returning pages' delete-time paths.
- **When it does nothing:** a `freeName` landing in the same folder rewrites nothing, because the new sibling holds every tail of the old path. Only a different parent changes anything: a parent renamed while the page sat in the Trash, a chosen destination, or a folder bundle landing under `freeName`.
- **What the record needs:** no `path` field, since the bundle location already supplies it.

###### 5. F-2 and Collisions at Restore

- The restore has the before-tree (`spend.ts:152`) and can build `after` before the move. The landing paths come from `resolveRecord`; IDs are read from the artifact's files (`spend.ts:177` already lists them).
- **Collision (E-3):** applies to the arriving tails whose `current` holder count is exactly 1 and whose `after` count is above 1. The other holder's links re-spell to its path, in the same pass as the F-2 inbound re-spell.
- **Cost gate (hard rule):** if every returning page lands at its delete-time path, no arriving tail gains a holder, and `targets` is empty, there are zero queries and zero sweeps. That's the common restore.

###### 6. The Empty's Hand-Off and Re-Park: A Ruling for Nathan

- **Today** (`spend.ts:82-89`): emptying a bundle strips live Link values that still name its pages, then parks its own recorded values, plus that strip's, into a namesake's bundle still in the Trash.
- **Name-keyed resolution (my lean):**
  - **Bare values:** still hand off; `trashRecovery.test.ts:580` and `:628` stay true.
  - **Path-form values:** pass only to a page at that path.
  - **Two trashed holders:** a value whose two possible targets are both in the Trash now parks nowhere. Today the newest wins, so `:563` becomes false.
- **ID-keyed:** the hand-off disappears entirely, so `:580` and `:628` become false and `spend.ts:88-89` goes.
- **Plain-terms question:** "If two pages share a name and both sit in the Trash, should emptying one pass its links to the other? And when a link could mean either one, should it be dropped rather than given to the most recently deleted?"
- **Lean:** pass bare links on, since that's what the link text would resolve to, and drop the ambiguous ones.

###### 7. Removal Inventory (Production)

- `trashedTitles` (`holdings.ts:69-81`), merged with `trashedHolders` into the one Trash index.
- The `arriving` set (`heldPages.ts:49-51`), replaced by `after`.
- The title rewrite at `spend.ts:265` and its import (`:23`).
- `was`/`landed` titles at `:171-172`.
- `titleHeldOutside` (`heldPages.ts:37-44`), inlined into `deleteCascade`. This only works once the planner's relink removes the `rename.ts:38` caller.
- The `folderCorpus` titles at `delete.ts:89-92`.
- `scrubReturning` stays; only its `Frozen` changes.
- **Conditional:** all of this assumes the planner's `buildPageIndex` files each page under every tail, and that `relinkConnections`/`spellAt` exist.

###### 8. Risks (as Sequences)

1. **A `freeName` landing where the old path is now held by another page:**
   - The refill resolves against `returning` at the delete-time path, not the live tree, so it can't point the value at the new holder.
   - Inbound links stay with the holder, because `current` resolves them first.
   - Closed with no `to` field needed.
2. **Two trashed pages sharing a title:**
   - **Within one bundle:** the value is ambiguous and is written back verbatim (as today, test `:578`).
   - **Across bundles:** this is the parking ruling in §6.
3. **A bundle written by an older build:**
   - Zod 4 `z.object` strips unknown keys and accepts a missing optional one (`record.ts:30-40`; `Core/package.json` pins zod `^4.4.3`).
   - The new build reads an old record as `targets` undefined: the repair skips and `holds` falls back to `after.holders`, which is today's behavior, path-aware. The refill improves, because the bundle location replaces the title rewrite.
   - An older build reading a new record silently drops `targets`; `appendLinks` keeps it, being raw (`record.ts:90-95`).
   - `targets` must stay optional. A required field would make `readRecord` return null, and the bundle would become unrestorable.
4. **A returning page with no ID inside a folder bundle:**
   - It has an empty ID in `landing`, so `byId` can't find it, and links naming it fall back to name resolution.
   - Rare, since tree pages are adopted.
5. **A Link value `refillTrashed` writes into a trashed linker's copy** (`holdings.ts:129-148`):
   - It isn't in that bundle's `targets`, so at that linker's restore it's judged by `after.holders`.
   - If the page it names is renamed again in between, the value drops.
   - **Fix:** one more line in the same read-modify-write to add the key → ID. Lean: include it.
6. **Spaces and Contexts carry Link values too** (`restoreScrub.ts:69-80`). F-5 names pages; giving Space bundles `targets` and the repair a `sidecars` arm costs about 6 lines. Planner's call: include it, or document the exception.
7. **Restore Links On Deletion:** I read the F-5 repair and the F-2 re-spell as running whatever the switch says, since neither puts the page back into Link values. Nathan could reject that reading.
8. **A repair that can't write a file:** the reply widens `Restored` (`spend.ts:118`) to `Pick<MutateOutcome, 'unrestored' | 'cascade'>`. `MutateOutcome` already carries `cascade` (`mutateRequest.ts:14`), so no bridge entry changes.

###### 9. What Becomes False

**Docs:**
- `NexusRecordPM.md:14`, first: "foreign frontmatter and the body never move" (F-5 rewrites the body once the page has landed), along with "rebuilt under the landed title when the page stepped aside" and "naming a page the tree doesn't hold".
- `NexusRecordPM.md:12`: "unless a page outside it still holds that title… relates to those titles".
- `NexusRecordPM.md:16`: the hand-off wording, depending on the §6 ruling.
- `ConnectionsPM.md:22,30`: "held outside a delete… or a restore"; and the restore paragraph, which needs the re-spell and the returning page's own repair.

**Comments:**
- `holdings.ts:1` ("the page titles they hold"), `:69`, `:83`
- `heldPages.ts:1`, `:37`, `:46`
- `cascade.ts:81`
- `spend.ts:82`
- `restoreScrub.ts:24`, `:37`
- `record.ts:37` (add the bundle-wide targets beside it)
- `propertyValue.ts:136-138` (the `holds(title)` parameter becomes a key)

**Tests:**
- `cascade.test.ts:544,551,563,573,583,592`: `deleteCascade` call signatures change; `:568` and `:578` stay true.
- `heldPages.test.ts:74-95`: the describe title, the `titleHeldOutside` test, and the `frozenWorld` shape.
- `trashRecovery.test.ts:563` (and `:580`/`:628` under ID keying).
- `:377`, `:425`, and `:436` stay true; I traced each one.

###### Line Estimate (Production Only, Rough)

| Removed | About -45 |
|---|---|
| `trashedTitles` | -13 |
| `titleHeldOutside` | -8 |
| `arriving` | -7 |
| Title-keyed setup at `spend.ts:171-178` and `:265` | -10 |
| Corpus titles | -5 |

| Added | About +80 |
|---|---|
| Merged Trash index | +12 |
| `targets` gather and zod schema | +12 |
| `frozenWorld` with IDs and `after` | +9 |
| `deletedPathOf` | +3 |
| Landing `ConnPage`s | +8 |
| Own-content repair sweep | +10 |
| Inbound and collision relink call, with gates | +13 |
| Refill by `returning` | +3 |
| Key-test inline in `deleteCascade` | +3 |
| `Restored` widening and parking resolve | +4 |
| `refillTrashed` targets | +3 |

**Net:** about +35, with a range of +25 to +50. Most of that is behavior that's wrong or missing today (F-5, F-2, path-form values).

###### Key Files

- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/delete.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/spend.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/holdings.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/restoreScrub.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/record.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/gather.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/bundle.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/trashRows.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/resolve.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/cascade.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Nexus/heldPages.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Properties/propertyValue.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Properties/assignment.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Trash/restoreProperty.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Index/contentIndex.ts`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/.claude/Features/NexusRecordPM.md`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/.claude/Features/ConnectionsPM.md`

---

### Round 4B — The One Search Matcher

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it, D especially.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 3 — Every Search Matcher" (all of it) and "Round 2 — Read, Draw, and Pick Reuse" §3. Every citation is a lead to re-verify at HEAD.
4. `.claude/Features/ConnectionsPM.md` §Autocomplete; `.claude/Features/NavigationPM.md`, `ViewTypesPM.md`, `PommoraUIX.md` (the Match row), `MarkdownPM.md` (the block menu) where they describe searching.

HEAD `14da3f152` reverted `§` as a link opener.

##### Your Slice: The One Search Matcher (Decisions D-1 to D-6, and the picker's close that B-4 and D-1 need)

Files: `Core/Paths/caseFold.ts` (`matchScore`, `rankMatches`, `foldKey`, `normalizeTitle`, `compareTitles`), `Core/Navigation/navSearch.ts` (`filterNav`), `Core/Nexus/treeIndex.ts` (`searchEntriesOf`), `Core/Settings/TrashFrame.tsx` (`filterRows`), `Core/Views/Fields/LocationField.tsx` (`narrowed`), `Core/Views/Pipeline/search.ts` (`searchGroups`), `Core/Views/useViewHost.ts` (the title map), `Core/MarkdownPM/Blocks/blockMenu.ts` (`filterBlockMenu`, `matchAt`), `blockQuery.ts`, `BlockMenuPane.tsx`, `Core/MarkdownPM/Autocomplete/autocomplete.ts` (`headingRows`, `aliasRows`), `useConnectionAutocomplete.ts` (the exact-match close ~118, `sameQuery` identity), `acQuery.ts`, `Core/Connections/pageIndex.ts` (`candidates`), `AutocompletePane.tsx` (`emphasizeMatch`, `matchLen`), `UIX/Menus/MenuRows.tsx` (`emphasizeMatch`), `UIX/Menus/menu-row.css.ts` (`matchText`), `UIX/Menus/index.ts`, `Core/MarkdownPM/Autocomplete/AliasList.tsx` (`match` gating drag), `UIX/Symbols/allSymbols.ts` (`searchIcons`, excluded by D-3).

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **The matcher's owner and shape (D-1, D-4).** Re-verify round 3's proposal: in `caseFold.ts`, `searchKey(name, place: readonly string[])` → `{ name, path? }` both folded (`path` = place words + name joined by `' '`), `searchQuery(raw)` = `foldKey(raw.trim())` with `/` folded to `' '` (D-4's "a typed `/` read as a word break"), `searchScore(key, q)` = the better of the name score and the path score, either may miss; `matchScore` goes module-private; `rankMatches` stays. Re-run the hand-check that a single joined key drags title ranking down (greedy `matchScore`), with `matchScore`'s word-start bonus at `' '`. Is there anything simpler that meets D-4 (one key, one score) that the hand-check actually refutes? Show the numbers.
2. **Per-site fold.** For each site, at HEAD: what's removed, what's kept (its own order: ranked for the picker, sidebar, Trash; native order for views, the heading outline, the LocationField tree, block-menu sections, the alias list), and how it builds its key and where (lazily for `PageIndex.candidates`, since both processes build the index on every tree change and the host never opens a picker; in the per-tree memo for `searchEntriesOf` with place = `parents` titles; per `rows` for the Trash; in the search-start memo for views with place = the set chain; the walk's ancestors for `LocationField`; the section title for the block menu; per call for headings and aliases). Confirm that `/` can't appear in a title (basename), so title matching is unchanged. Confirm the seven sites that fold the query themselves today collapse into `searchQuery`.
3. **The picker's close (B-4, D-1).** With fuzzy matching, `[[Notes]]` also matches "Footnotes", so the row-count close at `useConnectionAutocomplete.ts:~118` fails and the picker opens over every finished link whose title is a subsequence of another. The fix per part: title → `index.resolve(query).status === 'resolved'` (path-aware; Ambiguous stays open by rule); heading → exact key in the outline; alias → exact alias. Keep the `backedTo` exception. Verify at HEAD and the smallest change. (The picker scout owns what a pick writes; you own matching and closing.)
4. **D-6, highlighting removed as its own task.** Inventory at HEAD: `emphasizeMatch` (`MenuRows.tsx`), `matchText` (`menu-row.css.ts`), its export (`Menus/index.ts`), `BlockMenuRow.at` and `matchAt` (`blockMenu.ts`), `matchLen` (`AutocompletePane.tsx`, `BlockMenuPane.tsx`), the alias list's `match` (keep as the boolean that disables drag while filtering; what else does it gate: entrance?). What a reversal (keeping highlighting) would need instead, so the task stays separable from the matcher.
5. **D-2, the block menu** keeps its sections: key = `searchKey(label, [section.title])` reproduces "a matching section keeps its rows"? Verify the current semantics (`toLowerCase` only, no NFC) and what changes for the user.
6. **D-3, icon search stays its own:** confirm UIX can't import `Core/Paths` and why relocating `matchScore` to UIX is relocation for no gain.
7. **Cost.** Nothing new per caret move or decoration build: `sameQuery` keeps the query object's identity and the `candidates` memo keys on the query string; confirm both at HEAD and that the plan must keep them. Per keystroke: at most two `matchScore` calls per item where today there's one; the Trash gets cheaper (no per-keystroke folds). The picker from filter-plus-sort to `rankMatches` capped at 20.
8. **Noise from long locations** in order-preserving sites (view search, `LocationField`, block menu): a permissive fuzzy match over a deep place. Quantify with one example and say whether any site should get no place (D-1 says the Contains-field folder search gets location; views too).
9. **What becomes false** (docs listed above; comments `pageIndex.ts:33,57`, `navSearch.ts:8`, `MenuRows.tsx:30`; tests `pageIndex.test.ts`, `autocomplete.test.ts` headingRows, `aliasPicker.test.tsx`, `blockMenu.test.ts`, `TrashFrame.test.tsx`, `navSearch.test.ts`, `search.test.ts`, `treeIndex.test.ts`, `caseFold.test.ts`), with file:line; and a rough line estimate (removed vs added, production code only), with and without the highlighting removal.

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; no O(N) or allocating work on a caret move or decoration build; each surface keeps its own order; no new search box where none exists. Review what's there rather than confirming the framing; if a prior scout's claim is wrong at HEAD, say so with evidence. Where you'd make a different call, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the matcher's final shape and the per-site fold table; risks as named sequences; what becomes false; the line estimate.

#### Report

###### Search Matcher Scout: Report (Read-Only, HEAD `14da3f152`)

I edited nothing. I wrote three throwaway scripts in the scratchpad (`/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/439cb304-24a6-4f16-aa59-0b3f5d191f35/scratchpad/m.mjs`, `b.mjs`, `n.mjs`/`v.mjs`). Each one copies `matchScore` exactly, and `n.mjs`/`v.mjs` ran it over NexusOS's 603 real page paths, reading file names only.

###### Corrections to the Brief

- **Paths:** `blockMenu.ts` is `Core/Actions/blockMenu.ts`, not `Core/MarkdownPM/Blocks/`. `blockQuery.ts` and `BlockMenuPane.tsx` are in `Core/MarkdownPM/Menus/`. `useViewHost.ts` is `Core/Views/Host/useViewHost.ts`, and `LocationField.tsx` is `Core/Views/Settings/LocationField.tsx`.
- **Query folds:** there are eight query folds in seven files, not "seven sites": `navSearch.ts:13`, `TrashFrame.tsx:52`, `LocationField.tsx:106`, `useViewHost.ts:54`, `pageIndex.ts:56`, `autocomplete.ts:112` and `:145`, and `blockMenu.ts:94` (which uses `toLowerCase` only). All eight collapse into `searchQuery`.
- **"Ranked sites bury location noise under the cap" is only partly true.** On NexusOS the strong title hits do stay on top. But location-only hits take 6 of the top 20 for "plan", 9 for "cla" (e.g. `Context/II. Lists/nate's takes`, 10.7) and 13 for "note". What they push out is scattered name hits, so it's noise replacing noise.
- **"The Trash gets cheaper" only holds if its keys move into a memo on `rows`.** That changes `filterRows`'s input, so `TrashFrame.test.tsx`'s fixtures change; it wouldn't "still pass".
- **The picker's row-count close is already wrong at HEAD.** `[[Notes]]` beside "Notes Archive" returns two prefix rows at `useConnectionAutocomplete.ts:118`, so the picker opens over a finished, resolved link today. `[[Page#Setup]]` beside "Setup 2" does the same. The fix in Q3 corrects a wrong behavior; it isn't only a guard against a fuzzy-matching regression.
- **Name collision:** `UIX/Symbols/allSymbols.ts:20` already has a private `searchKey`. A second `searchKey` exported from `caseFold.ts` gives one name two meanings. Rename one of them (the icon one is the cheaper rename).

###### Q1: The Matcher's Owner and Shape (D-1, D-4)

**Owner:** `Core/Paths/caseFold.ts`. It already owns `matchScore` (`:28-46`), `rankMatches` (`:50-74`) and `foldKey`. No new file, and it's already a pure module both processes import (`Desktop/Store/stores.ts:1`, `Desktop/Config/appConfig.ts:8`).

**Final shape.** This keeps round 3's shape with one refinement: `place` is a `/`-joined folder string, so the "`/` is a word break" rule is written once and serves both the key and the query.

```ts
export interface SearchKey { name: string; path?: string }
export const searchQuery = (raw: string): string => foldKey(raw.replaceAll('/', ' ').trim())
export const searchKey = (name: string, place = ''): SearchKey =>
  place ? { name: foldKey(name), path: searchQuery(`${place}/${name}`) } : { name: foldKey(name) }
export function searchScore(key: SearchKey, q: string): number | null  // the better of name and path; either may miss
```

- `matchScore` loses its `export`. `rankMatches` is unchanged; its only callers are `navSearch.ts:14`, `TrashFrame.tsx:54`, and the picker once it's folded.
- **The `place` string fits the callers:** the picker passes `relDirname(p.path)` as is, the sidebar and the Trash `.join('/')` their crumb titles, and a view passes a path slice (see Q2).
- **Fold order:** replace `/` first, then trim. Trimming first turns `/Studio/Pommora` into `" studio pommora"`, whose leading space misses every root-anchored path; trimming last also turns a trailing `[[Studio/Pommora/` into a plain folder query.
- **Doubled slashes:** `a//b` folds to two spaces, which misses. This is optional to fix: a `/[\s/]+/g` replace would cover it. YAGNI unless wanted.
- **Empty query:** `searchScore(key, '')` returns a score (never null), so every site's empty-query behavior is unchanged (all rows, or the site's own empty branch).

**Hand-check (`m.mjs`; the word-start bonus fires after `' '`):**

| Query | Item | Name | One joined key | Better of two |
|---|---|---|---|---|
| notes | `Journal/Notes` | 27.95 | **13.87** | 27.95 |
| notes | `Footnotes` (root) | 18.91 | 18.91 | 18.91 |
| notes | `Journal/Footnotes` | 18.91 | 6.83 | 18.91 |
| bet | `Journals/Beta` | 14.96 | 10.87 | 14.96 |
| claudemd | `Studio/Pommora/ClaudeMD` | 54.92 | 45.77 | 54.92 |
| pommora cl | `Studio/Pommora/ClaudeMD` | miss | 69.77 | 69.77 |
| pommora cl | `Studio/Sapphire/ClaudeMD` | miss | miss | miss |
| plan | `Projects/Plan` | 20.96 | 13.87 | 20.96 |

**Why one joined key fails:** `matchScore` is greedy. `indexOf('n', 0)` lands on the `n` in "jour**n**al", so the streak and word-start bonuses never fire on the title. With one key, an exact title inside a folder (13.87) ranks below a scattered title at the root (`Footnotes`, 18.91), which breaks D-4's "a plain title query ranks as it does today".

**Simpler alternatives, and why each fails:**
- **The name after the place in one key** (`"notes journal"`): it keeps title ranking, but `pommora cl` against `"claudemd studio pommora"` misses, so D-4's own example fails.
- **A non-greedy (dynamic-programming) `matchScore`:** one key would work, but it rewrites the scorer and changes title ranking everywhere.
- **Falling back to the path only when the name misses**, instead of taking the better score: it's equally small, but D-4 says "the better of the two".

Two calls per item is the smallest design that meets D-4.

**Titles can't hold `/`.** Page titles come from `titleFromPath(relFile)` (`readNexus.ts:128`). Containers and spaces take the folder `name` (`:191`, `:220`). A context's title is its folder name (`readNexus.ts:255`, `record.ts:35`). The Homepage is the Nexus folder's name. So title matching is unchanged.

###### Q2: Per-Site Fold

| Site (HEAD) | Removed | Key built where | Place | Order kept |
|---|---|---|---|---|
| `pageIndex.candidates` `:54-67` | the `startsWith` filter and the exact/length sort `:59-66`; the `entries` array `:34` (fold `byTitle` straight from `pages`) | lazily, in the one `alphabetical ??=` list, now `{ title, page, key }` sorted by `compareTitles`, serving both the empty browse and `rankMatches(…, limit)` | `relDirname(p.path)` | ranked, capped at 20; empty query browses A–Z |
| `filterNav` `navSearch.ts:8-14` + `searchEntriesOf` `treeIndex.ts:146-170` | `folded` and its comment | the existing per-tree memo: `search: searchKey(r.title, r.parents.map(p => p.title).join('/'))` | parent titles (the context for a Space) | ranked, cap 50; empty returns `[]` |
| Trash `filterRows` `TrashFrame.tsx:51-58` | the two folds and the three-way ternary `:55-57` | lean: inline per call (cost equal to today, signature and tests unchanged); alternative: a memo on `rows` (cheaper, changes fixtures) | crumb titles | ranked |
| `headingRows` `autocomplete.ts:111-122` | `startsWith` | per call | none | outline order, deduped by key |
| `aliasRows` `:139-150` | `startsWith` | per call | none | remembered order |
| `LocationField.narrowed` `:22-32` | `foldKey` + `matchScore` `:28` | per keystroke, as today (small N); `walk(ns, place)` threads ancestor titles | the walk's ancestors | tree order; a match keeps its subtree |
| View `searchGroups` `search.ts:4-14`, `useViewHost.ts:54,90-96` | the title-only `Map<string,string>` | the search-start memo: `Map<id, SearchKey>` | `relDirname(r.path).slice(source.path.length + 1)`, i.e. the sets below the source | the view's own order |
| Block menu `filterBlockMenu` `blockMenu.ts:85-106` | `matchAt` and the `toLowerCase` fold | per call (about 22 rows, and only on doc change) | `s.title` | section order |

**A view's place excludes the source itself.** Every row shares the source's own chain, so including it would make any subsequence of the source's name (e.g. "stu" in a Studio view) keep every row. `CardsView.tsx:309` already slices that chain off its trail.

`searchGroups`'s `?? ''` default (`search.ts:10`) guards a case that can't happen, since `groups` come from the same `rows`. Under a `SearchKey` map, drop it (a missing key means no match) rather than invent a default key.

###### Q3: The Picker's Close (B-4, D-1)

**Today:** `useConnectionAutocomplete.ts:118` reads `found.length === 1 && normalizeTitle(found[0].value) === normalizeTitle(query)`, and `:119` keeps the `backedTo` exception.

**Smallest change.** Replace `:118`, about +2 lines:

```ts
const q = normalizeTitle(query)
const exact = part === 'title'
  ? host.connections()?.index.resolve(query).status === 'resolved'
  : found.some((r) => normalizeTitle(r.value) === q)
```

- **Headings and aliases share one test:** an exact heading key or alias always matches fuzzily, so "some row equals the query" is the same as "an exact key in the outline" or "an exact alias". One expression, with no per-kind lookups.
- **Titles can't use row equality:** once picks write paths, a row's value can be a written path, so a resolved partial path (`[[Pommora/ClaudeMD]]`) would never equal a row. `resolve` is O(1), and Ambiguous stays open by rule (B-4).
- **Cheaper:** the title check could run before `lookup`, skipping the rank when the caret enters a finished link.
- **Comment:** `:110` ("names its one match exactly") becomes false and needs rewording.
- **Dependency:** at HEAD, `resolve('Studio/Pommora/ClaudeMD')` is phantom because the index is title-only. This close must land with or after the path-aware resolver, which matches the BRIEF's order (resolver before the search fold).
- **Phantom links:** a closed phantom link now opens the picker whenever its title fuzzily matches something. That's what C-1 intends.

###### Q4: D-6, Highlighting Removed as Its Own Task

**Inventory at HEAD:**
- `UIX/Menus/MenuRows.tsx:30-40`: `emphasizeMatch` and its doc comment.
- `UIX/Menus/menu-row.css.ts:156`: `matchText`. `font` stays in use elsewhere in that file.
- `UIX/Menus/index.ts:15`: the export.
- `Core/Actions/blockMenu.ts:21`: `BlockMenuRow`'s `at`, so `BlockMenuMatch.rows` becomes `LeafItem<BlockMenuAction>[]`; also `{ ...row, at }` at `:101`.
- `AutocompletePane.tsx`: the import `:12`, `matchLen` `:87`, `:126`, `:135` (both become the plain value), and `:192` `match={matchLen}`.
- `BlockMenuPane.tsx`: the import `:7`, `matchLen` `:29`, `:47` (becomes `row.label`).
- `AliasList.tsx`: the import `:8`, and the render-prop at `:176`. Drop it so the label self-closes.
- **The `RenamableLabel` function-children overload stays:** `DetailTitleHeader.tsx:127` still uses it.

**What `AliasList`'s `match` gates:** four things: entrance readiness (`:56`, `useEntrance(..., match === 0)`), the pending-pick reset (`:64`, deps `[listed, match]`), drag disable (`:127`), and emphasis (`:176`).
- **Keep the query string as the prop, not a boolean.** Replace `match` with `query = ''`: `query === ''` gates entrance, `query !== ''` disables drag, and the deps become `[listed, query]`.
- **Why not a boolean:** typing `th` then `the` over `['the plan']` leaves both `listed` and the flag unchanged. A click-pick still pending would then fire 300ms later and overwrite what was typed, against the comment at `:62`. `aliasPicker.test.tsx:156` only covers `''` to `t`, where the list changes, so it wouldn't catch this.
- `AliasesRow.tsx:19` passes neither prop, so it's unaffected.

**Order:** land the removal before the matcher. It's pure deletion; it lets the matcher task drop `at` with no wrong interim; and once the picker matches fuzzily, `emphasizeMatch(row.value, 0, query.length)` bolds the wrong letters.

**If Nathan reverses D-6:** add a `matchPositions(label, q)` that re-runs the greedy scan only on the visible rows (20 or fewer), and change `emphasizeMatch(label, positions)`. That's about +12 lines and leaves `searchScore` untouched, so the matcher stays separable.
- **Location-only hits:** a hit on the location alone would emphasize nothing in the label. Marking the trail would mean NavTrail work.
- **Index drift:** fold can change string length (`İ` lowercases to two code units; NFD becomes NFC), so positions can drift. HEAD's prefix emphasis already has this flaw.

###### Q5: D-2, the Block Menu

**Today:** a substring test with `toLowerCase` only, no NFC. A section whose title matches keeps every row; otherwise a row is kept when its label matches.

**What the proposed key does:** `searchKey(label, s.title)` reproduces "a matching section keeps its rows", since a subsequence of the title is a subsequence of `title + ' ' + label`. But it's a superset of today. NFC changes nothing for these ASCII labels. Counts from `b.mjs`:

| Query | Today | Path key | Section and label scored separately |
|---|---|---|---|
| bl | 3 | 8 (adds Bullet, Numbered, Alphabetical, plus both Embed rows via em**b**ed…interna**l**) | 6 |
| hea | 6 | 7 (adds Alphabetical List: alp**h**ab**e**tic**a**l) | 7 |
| etc | 0 | 4 | 1 |
| ta | 3 | 9 | 7 |
| hr | 0 | 1 (Horizontal Rule, a real win) | 1 |
| link / embed / list / quo | unchanged | unchanged | unchanged |

**Variants:**
- **Path key (D-4's location key):** conforms to D-4, but its only extra power is a typed `/embed/int`. The block query is `\S*` (`blockQuery.ts:17`), so no space can be typed anyway.
- **Separate-section variant (my alternative):** the section is matched as a whole name, then each label, using the same `searchScore` with no place. It's one line longer and reproduces today's semantics with less cross-boundary noise. It doesn't use the location key, though, so it's the planner's call whether that reads as off-pattern under D-4.

Either way, `blockMenu.test.ts`'s `hea` and `bl` cases change.

###### Q6: D-3, Icon Search Stays Its Own

- **UIX can't import Core:** `UIX/package.json` lists no `@pommora/core` dependency, and the hard rule says "UIX reaches nothing outside itself".
- **Moving `matchScore` into UIX buys nothing:** it would mean the engine importing a new UIX leaf, updating the pinned list in `Core/Contract/engineGraph.test.ts:23-35`, and gaining nothing. `searchIcons` (`allSymbols.ts:28-56`) is a five-tier synonym ranking over `ICON_TAGS`, a different job that D-3 keeps out, so nothing else would share the moved function.

###### Q7: Cost

**Nothing new runs on a caret move:**
- `sameQuery` (`acQuery.ts:17-28`, used at `:64-65`) keeps the query object's identity.
- The listener bails when the query is unchanged (`useConnectionAutocomplete.ts:59-60`).
- `candidates` is a memo keyed on the query string (`:111-121`); `allHeadingRows` likewise (`:100-103`).
- The block field filters only on a doc change (`blockQuery.ts:36`), and `provide` only maps it (`:45-53`).
- The plan must keep all of these.

**Per keystroke:**
- At most two `matchScore` calls per item where today there's one, and the second exits on the first missing character.
- **Picker:** filter plus sort becomes `rankMatches` with a cap of 20 (binary insert). Keys are folded once per index, on the first `candidates` call, in the same lazy step as today's sort (`pageIndex.ts:42-43`). The host never pays this.
- **Ties:** `compareTitles` runs only on tied scores, the same class as the sidebar's cap of 50.
- **Trash:** unchanged if inline; cheaper only with the `rows` memo.

###### Q8: Noise From Long Locations

Measured on NexusOS (603 pages, mean folder depth 2.61):

| Where | Query | Name hits | Name or location hits |
|---|---|---|---|
| Picker / sidebar | plan | 78 | 130 |
| Picker / sidebar | meet | 77 | 192 |
| Picker / sidebar | pom | 84 | 351 |
| View over the Studio collection (401 pages, place below the collection) | res | 98 | **354** |
| Same view | sess | 67 | 314 |
| Same view | cla | 80 | 85 |

Example: "plan" matches `Pommora/Lantern/Alpha` at 16.79, near a real `Planning/Roadmap` hit at 20.84.

- **Ranked sites** keep strong hits on top.
- **Order-preserving sites** show the noise in place: views, `LocationField`, the block menu.
- **Recommendation:** accept it as D-1 and D-4 ratify; every listed site keeps its place, and more letters cut it down. This is a visible degradation on short view queries, so it's for Nathan to ratify knowingly. I'd add no mitigation logic to the matcher.

###### Q9: What Becomes False

**Docs:**
- `ConnectionsPM.md:57` ("matched by title prefix").
- `:59` (aliases "filtered by what's written": true, but the matching becomes fuzzy).
- `NavigationPM.md:12` ("title-based subsequence scan"; location now counts).
- `ViewTypesPM.md:75` ("whose titles hold its letters in order").
- `ViewTypesPM.md:66` (the Location picker narrows by location too).
- `MarkdownPM.md:142` ("`/hea` leaves the five headings"). Already false: there are six heading rows. Fuzzy matching makes it false again, since Alphabetical List joins.
- `PommoraUIX.md:364` (the Match row, under D-6).
- **Not this slice's:** `ConnectionsPM.md:58`'s "`#` or a `§`" is already stale from the A-9 revert. It belongs to that session.

**Comments:**
- `pageIndex.ts:33` (the reason "candidates() runs per keystroke" moves to the lazy key list).
- `pageIndex.ts:42` (the lazy list now also carries keys).
- `pageIndex.ts:57` stays true.
- `navSearch.ts:8`.
- `MenuRows.tsx:30`.
- `useConnectionAutocomplete.ts:110`.

**Tests:**
- `caseFold.test.ts:2,5`: the `matchScore` import goes; the scorer helper becomes `searchScore(searchKey(title), q)`.
- `pageIndex.test.ts:44,51`: the names claim prefix ranking. The `pro` order still passes (14.97 / 14.92 / 14.87).
- `autocomplete.test.ts:536`: the name says "prefix"; the assertions pass.
- `aliasPicker.test.tsx:45-48`: passes. Add a typed-query pending-pick case for the `query` prop.
- `blockMenu.test.ts:53-115`: `hea` and `bl` fail; every `at` assertion goes under D-6.
- `blockMenuFlow.test.tsx:6,56,225+`: the emphasis tests go under D-6.
- `TrashFrame.test.tsx:27-53`: passes if inline. Add a `notes/alpha` case.
- `navSearch.test.ts:4,35-38`: the `folded` literal.
- `treeIndex.test.ts:101`: `folded`.
- `search.test.ts:9`: the title-string map.

###### Risks (Named Sequences)

1. **The close lands before the resolver.** The caret rests in `[[Studio/Pommora/ClaudeMD]]`, the title-only resolve says phantom, and the picker opens on every rest in a path link.
2. **Alias pending pick.** Click "the plan", then type `e` within 300ms with `match` turned into a boolean: the alias overwrites what was typed.
3. **A leading `/`.** If `searchQuery` trims before folding, `/Studio/Pommora` finds nothing anywhere.
4. **Block menu plus Enter.** A line `/etc` and Enter now writes a Code Block (path key) or an Alphabetical List (name only). Today the menu stays closed and Enter breaks the line. Fuzzy matching widens a risk substring matching already has for `/table`.
5. **A typed `.md`.** `[[Notes.md` lists no rows, since titles carry no extension, even once A-5 resolves it. That belongs to the picker or reader scout if it matters.
6. **Ranking headings.** The nested empty-query outline and a ranked filtered list would give two orders in one pane. Keep headings filter-only.

###### Line Estimate (Production Only, Counted From HEAD)

| Task | Removed | Added | Net |
|---|---|---|---|
| Matcher (caseFold +14; pageIndex −9/+5; sidebar −3/+3; Trash −4/+2 inline; heading/alias −3/+3; LocationField −2/+3; view −4/+6; block menu −15/+5; close −1/+3) | ~41 | ~44 | **~+3** |
| D-6 highlighting removal | ~22 | ~1 | **~−21** |
| **Both** | ~63 | ~45 | **~−18** |
| Matcher plus D-6 reversed (positions, about +12) | ~41 | ~56 | **~+15** |

Moving the Trash keys into a `rows` memo adds about +3. The separate-section block-menu variant adds about +1.

---

### Round 4B — The One Click Rule for Unresolved Links

**MODEL:** `opus`

#### Brief

You are a read-only planning scout in Pommora (repo root `/Users/nathantaichman/The Studio/Projects/Project Pommora`, HEAD `14da3f152`). Edit nothing. Your report feeds an implementation plan for "Path Links". Model: opus, effort: high.

##### Read First
1. `.claude/Planning/Path Links/Path Links — Decisions.md` — the ratified intent, authoritative; decisions cited by letter. Read all of it, C especially.
2. `.claude/Planning/Path Links/BRIEF.md` §Guiding Principles and §Philosophies.
3. `.claude/Planning/Path Links/Path Links — Scout Findings.md` — prior scouts' verbatim reports. Yours: "Round 3 — Unresolved Link Clicks" (all of it). Every citation is a lead to re-verify at HEAD.
4. `.claude/Features/ConnectionsPM.md` §Rendering, §The Link Menu, §Autocomplete.

HEAD `14da3f152` reverted `§` as a link opener; `#` is the only heading opener inside a link.

##### Your Slice: The One Click Rule for Unresolved Links (Decisions C-1, C-2, C-3, C-4, C-6)

Files: `Core/MarkdownPM/Links/linkEdit.ts` (`linkEdit`, `applyLinkAction`, `LinkAction`), `linkClicks.ts` (`onText`, `linkUnder`, `resolveFollow`, `followTarget`, `hoverGate`), `Core/MarkdownPM/Gestures/pointerPath.ts` (mousedown, `editingOnPress`, `seatAtNearerEdge`), `Core/MarkdownPM/Gestures/caretPlacement.ts` (`focusRange`, `focusAt`), `Core/MarkdownPM/Tables/cellStatic.tsx` (`claimLink`, `applyAtRest`, the phantom fragment, `linkSpan`, `cellLinkTarget`), `Core/MarkdownPM/Tables/CellEditor.tsx` (`seatSelection`, `onActivate` kinds, `seatPastMarkerNow`), `Core/Properties/Pickers/ValueEditor.tsx` (the open, the `alias` seat at ~145, caret at end ~151), `Core/Properties/Cells/TextCell.tsx`, `LinkCell.tsx`, `Core/Properties/valueClick.ts` (`edit` intent, `editLink`), `PropertyValueInput.tsx`, `Core/MarkdownPM/Autocomplete/acQuery.ts` (recompute conditions: selection change, read-only switch), `Core/MarkdownPM/Embeds/embedWidget.tsx` (`embedClickSeat`), `Core/Tiles/MarkdownTile.tsx`, `PageTile.tsx`, `Core/MarkdownPM/Links/citationPointer.ts`.

Answer each with file:line evidence at HEAD, naming every addition and what exists for it first:

1. **The one arm (C-1, C-2).** Re-verify round 3's design: one new `linkEdit` arm (e.g. `seatTitle` → `{ kind: 'select', range: [title end, title end] }`), riding the existing link-slot seat channel with three callers on existing appliers: `pointerPath` mousedown (left button, `hit.onText`, target unresolved, not already editing inside) via `applyLinkAction`; `cellStatic.claimLink` → `applyAtRest(tk, 'seatTitle')` for a resting cell; `ValueEditor`'s open beside its `alias` branch for a Link value (any click, and menu Edit). Widen `onText`'s selector to the phantom classes (`.md-connection-phantom`, `.md-phantom-syntax`); wrap a resting phantom fragment in `linkSpan` with `data-link`. Confirm each site at HEAD and the smallest change. Nothing changes for a resolved link (follow, ⌘-click, glance, menu): show the guards.
2. **The exception's exact predicate (C-1).** C-1's exception: "once the caret is already inside an unresolved link being edited, a click places the caret where it lands, so the alias can still be clicked into." Round 3 keyed it on `editingOnPress`. Pin what `editingOnPress` means at HEAD (editor focused? caret inside this link's range?). If it means "editor focused," then C-3's two-click path for a Text value fails: the first click opens the field (focused, caret at end past `]]`), and the second click on the unresolved link would be exempt and land where pressed rather than in the title. Decide the predicate that satisfies both C-1 and C-3 (e.g. "the selection head is inside this link's `full` range," which is false when the caret rests at the field's end past `]]`, and true while editing within it; check `linkAt`'s end-inclusive counting at `edits.ts:~353`) and show its cost.
3. **C-3, Text values.** The field opens with the caret at the end of the first line; the second click follows the rule. "Fold the field's opening into that seat wherever it does so without new machinery": is there a fold cheaper than the +20–25 lines round 3 estimated for a seat on the `edit` intent (e.g. the `ValueEditor` open branch for a one-line Link value already seats; could a Text value whose whole first line is one unresolved link take the same branch for free)? Otherwise confirm the two-click path works end to end with the predicate from Q2.
4. **C-4, Edit Link selects the target everywhere.** Body and cells select via `editLink` → `select`; the Link field opens with the caret at the end (`valueClick.ts` `edit` intent → `ValueEditor` ~151). Smallest change so the field's open applies the `editLink` select (does the intent carry which action opened it? the `alias` option is the precedent). Also Rename's priority.
5. **Where in the title the caret lands:** the end (backspace narrows); any spot gives the same query since the query reads the whole slot; `partOf` checks the title first with inclusive ends so the end wins over an adjacent `|`, `#`, or `)`. Confirm for both syntaxes and for a path form `[[A/B/Notes|x]]`.
6. **After the seat:** confirm the selection transaction recomputes `acQuery`, the hook sets `ac` with caret geometry, rows show holders with trails, a pick goes through `commitEdit` keeping the alias (`keepsShown` with an unresolved baseline), and C-5's heading keep (picker scout owns it). A phantom whose title nothing matches: caret seated, no pane (`open` needs candidates) — acceptable per the decisions? Note it.
7. **Tiles at rest and read-only:** a click on a Markdown/Page tile seats the caret but the read-only switch doesn't recompute `acQuery`; the one cheap check (`startState.readOnly !== state.readOnly`) or a re-dispatched selection. Confirm.
8. **C-6 ordering:** the rule does nothing useful until a pick writes the path (A-3) and location matching lands (D-1); confirm the dependency.
9. **Risks:** the clamped press beside an ambiguous link (`linkEdges.test.tsx:184`); `linkTokenAt` end-inclusive hijacking a press just past a link at line end; double-click after the reveal shifts layout; glance and history (read-only) presses; the right-press branch and `followCitation`; the sticky dismiss after Escape.
10. **What becomes false** (`ConnectionsPM.md:19,36` "inert"; `PropertyValueInput.tsx` doc comment; `linkEdges.test.tsx:163-191`), with file:line; and a rough line estimate (removed vs added, production code only).

##### How to Assess
Simplest thing that works wins; reuse before invention; YAGNI; no added cost on keystrokes, caret moves, or decoration builds; one owner per rule. Review what's there rather than confirming the framing; if a prior scout's claim is wrong at HEAD, say so with evidence. Where you'd make a different call, say so and why.

##### Report
Concisely, with citations: per question, what exists, what reuse looks like, what must be added (smallest form, signatures), removals; the rule's final shape (arm, predicate, three callers); risks as named sequences; what becomes false; the line estimate.

#### Report

##### Unresolved Link Click Scout: Report at HEAD 14da3f152

I edited nothing. All paths are relative to the repo root.

###### Corrections to the Brief and to Round 3
- **Paths:** `caretPlacement.ts` lives at `Core/MarkdownPM/caretPlacement.ts`, not under `Gestures/`. The tiles are in `Core/Tiles/Surfaces/`, and `valueClick.ts` is in `Core/Properties/Pickers/`. The `linkEdges` block now sits at `linkEdges.test.tsx:153-192`, with its tests at :165, :174 and :184.
- **`editingOnPress` doesn't mean "editor focused".** It is `caretInside` (`pointerPath.ts:7-10`, set at :43): `view.hasFocus && head >= range[0] && head <= range[1]`. So it means focused AND the caret within this link's full range, counting both ends.
  - C-3 still breaks, because of that inclusive end. The Text field opens on the first line, trimmed (`parseEditorValue.ts:15`), with the caret at `doc.length` (`ValueEditor.tsx:151`).
  - So for `see [[X|A]]`, where the link ends the line, the caret sits exactly at `range[1]`. The second click counts as "editing", is exempt, and lands where pressed. On the alias, that means no picker.
- **`.md-phantom-syntax` is redundant in the widened selector.** `onText` also requires `pos` to fall inside `contentRange` (`linkClicks.ts:70`), and phantom syntax only ever wraps markers.
  - `.md-connection-phantom` alone covers a phantom's content in both syntaxes: the markdown label through `linkClass` (`connectionsApi.ts:70-71`, `decorations.ts:584`), the wiki content (`decorations.ts:639`), and an empty label's `LabelWidget` (`decorations.ts:114`).
- **Not every press on a phantom seats.** For an aliased wikilink, `contentRange` is the alias alone (`tokens.ts:242-247`), so the visible title of `[[X|A]]` isn't `onText`.
  - A press on that title falls to CodeMirror and lands in the title where pressed. The query reads the whole slot either way.
  - Only a press on the alias or label gets seated at the title's end.
- **Round 3's risk 10 (glance) is a non-issue.** The glance's `PageTile` is `editing={false}` and `locked` (`GlancePane.tsx:289-299`), so it never flips out of read-only and no pane can open.
  - CodeMirror's own press already focuses the glance editor; `focusBefore` is captured at `GlancePane.tsx:370-373` for exactly that.
  - Page history is read-only and never flips either (`PageHistoryWindow.tsx:250`). No guard is needed.

###### Q1: The One Arm (C-1, C-2)
**What exists:** the link-slot seat channel. `linkEdit` returns `select` for `rename` and `editLink` (`linkEdit.ts:32-40`). It has three appliers:
- `applyLinkAction`, which uses `focusRange` (`linkEdit.ts:73-90`).
- `applyAtRest`, which calls `onActivate({kind:'select'})` (`cellStatic.tsx:444-452`). `CellEditor` lands that through `seatSelection` (`CellEditor.tsx:101-119`, :271-273).
- `ValueEditor`'s open, which runs the Rename seat (`ValueEditor.tsx:145`).

**Additions:**
- **`linkEdit.ts`:** `type SlotAction = LinkAction | 'seatTitle'` (+1), so the menu union `LinkAction` (`connectionMenu.ts:41-50`) gains no non-menu member. Then the arm:
  `case 'seatTitle': return { kind: 'select', range: [tk.link.title[1], tk.link.title[1]] }` (+2).
  `linkEdit`, `applyLinkAction` and `applyAtRest` widen to `SlotAction`.
- **`pointerPath.ts`:** an optional spec member `seat?: (hit: H, view: EditorView) => boolean`, which reports whether it acted, like `seatAtNearerEdge`. The clause sits after the `button === 2` return (:47) and the `detail > 1` refusal (:48), next to the nearer-edge clause (:50-51). Those two clauses can't both apply: one needs `onText`, the other `!onText`. Predicate and code are in Q2.
- **`linkClicks.ts`:**
  - Widen the selector at :63-65 to add `.md-connection-phantom`.
  - Add `seat: (hit, view) => { if (!hit.tk || hit.target.kind !== 'unresolved') return false; applyLinkAction(view, 'seatTitle', hit.range); return true }`.
  - Leave it out of `follow` and `followTarget`. That keeps the right-press branch (:47) and `followCitation` (`citationPointer.ts:32-48`) untouched, and leaves the citation `pointerHandlers` users (`citationPointer.ts:61`, :100) unaffected.
- **`cellStatic.tsx`:**
  - In `claimLink` (:462-469): `followTarget(...) ?? (tk && found.target.kind === 'unresolved' && !readOnly() ? () => void applyAtRest(tk, 'seatTitle') : null)`.
  - The seat thunk rides the same two calls follow does: mousedown, where the result is discarded but `preventDefault` still applies (:577-581), and click (:550-553).
  - The phantom fragment (:149-165) changes `<Fragment key>` to `<span key {...linkSpan(s, e)}>`, with no `data-at`, for 0 net lines.
  - Inner verbatim spans keep exact offsets for `cellOffsetAt` (:337-385). Its edge walk now reaches an outer span with no `data-at` and returns `s`/`e`, the same values as before.
  - No CSS keys on `data-link` or `data-src`.
  - `TextCell`'s `linkGestures` consumer still bubbles: `resolveFollow` returns null (`TextCell.tsx:46-55`). The context menu still falls through (`linkMenuTarget` refuses unresolved, `connectionMenu.ts:25`), and the dwell still returns null (`dwellTarget`, `linkClicks.ts:121-126`).
- **`ValueEditor.tsx:144-153`:** the seat on open; shape in Q3.

**Guards that keep a resolved link unchanged:**
- The seat runs only when `target.kind === 'unresolved'`.
- Follow and ⌘-click go through `resolveFollow` (`linkClicks.ts:101-112`), which `claimLink` asks first.
- `hoverGate` stays `.md-connection-resolved, .md-link` (:135), and `dwellTarget` arms only on page or url.
- `linkMenuTarget` refuses unresolved (`connectionMenu.ts:25`).
- The clamped nearer-edge seat needs `!onText`.

###### Q2: The Exception's Predicate
**Chosen:** a strict interior check, written inline in the seat clause alone:
```ts
// A caret resting at a link's edge is where a field opens, not editing inside it.
const head = view.state.selection.main.head
if (hit.onText && !(view.hasFocus && head > hit.range[0] && head < hit.range[1]) && spec.seat?.(hit, view)) {
  event.preventDefault()
  return true
}
```
- **Why not change `caretInside` itself:** it keeps its three inclusive callers: mousedown follow (:52) and click (:77), the dwell (:63), and the contextmenu stand-down (:90). Changing it would alter resolved links, which C-2 forbids.
- **Why not `linkAt`:** it counts the start as outside and the end as inside (`edits.ts:351-356`), so a caret just past `]]` would read as inside, which is exactly the C-3 failure.
- **Cost:** one inline comparison, no scan. The behavior cost is that a caret resting at an unresolved link's edge (after typing `]]`, or after a pick's `restedOnLink`) followed by a click on its alias seats the title first. Reaching the alias then takes a second click. The C-1 exception still holds once the caret is strictly inside.

###### Q3: C-3, Text Values
- **The free fold exists.** `ValueEditor` sees only the field's text, so its open seats any `oneLine` field whose whole text is one unresolved link: Link values and whole-link Text values alike, with no `def` and no plumbing. Keep the `oneLine` gate: the pane opens from the pen button, not from a click on the link.
- **Shape**, with `seat` being Q4's prop:
  ```ts
  const tk = drawnLinkAt(view, 0)
  const lone = oneLine && tk?.range[1] === doc.length &&
    resolveLink(readOccurrence(doc, tk.link), host.connections()?.index, holder).kind === 'unresolved'
  const action = seat === 'rename' || !lone ? seat : 'seatTitle'
  if (tk && action) applyLinkAction(view, action, [0, doc.length])
  else if (action === 'rename') { /* the bare-address branch, :146-149, as is */ }
  else { /* caret at end, :151-152 */ }
  ```
- **`drawnLinkAt` is populated at mount.** The existing Rename branch relies on it, and its test passes (`PropertyValueInput.test.tsx:198-208`).
- **Two-click path for prose around a link, end to end:**
  1. The resting click bubbles from `TextCell` (`TextCell.tsx:46-55`, now a `data-link` hit with a null follow).
  2. That becomes the `edit` intent (`valueClick.ts:44-46`), and the field opens at `doc.length`.
  3. The second click on the alias or label is `onText`. If the link ends the line, the caret sits at `range[1]`, which is not strictly inside, so it seats. If prose follows the link, the caret is outside it and it seats anyway.
- A link on line 2 or later is out of the field's reach, as before.
- **Prior-art note:** a fourth inline `resolveLink(readOccurrence(text, tk.link), index, held)` (after `linkUnder` at `linkClicks.ts:58-62` and `cellLinkTarget` at `cellStatic.tsx:647`) could fold into one helper. That's optional.

###### Q4: C-4, Edit Link Selects Everywhere
- **What exists:** `MENU_INTENTS.editLink` → a bare `{kind:'edit'}`, the same intent a click produces (`valueClick.ts:44-56`). The intent doesn't record which action opened it.
  - Edit opens the inline editor: Table at `TableView.tsx:152` and :208-221, Panel at `PropertyPanel.tsx:302`, Cards at `CardValue.tsx:91`.
  - Rename opens the popover with `alias={def.type === 'link'}`: `TableView.tsx:258`, `CardsView.tsx:494`, `PropertyPanel.tsx:542`.
- **This is a real fork; it needs Nathan's ruling.**
  - **(a) Thread the action:** `edit` gains `seat?: ConnEditAction` (already exported, `connectionMenu.ts:28`) through each surface's editing state into `PropertyValueInput` and `ValueEditor`. Here `alias?: boolean` becomes `seat?: ConnEditAction`, generalizing the precedent. About +9 lines across `valueClick` and the three surfaces, and a click still opens with the caret at the end.
  - **(b) No threading:** `PropertyValueInput` passes `seat={alias ? 'rename' : def.type === 'link' ? 'editLink' : undefined}`, about +0-1 lines. It matches the codebase's own equation of a click and Edit for a Link value (`valueClick.ts:20`, :51-52). But a click beside a resolved Link value would now select its target too, a change C-4 doesn't literally state.
  - I lean (b), since the code already declares the two the same. It makes `PropertyValueInput.test.tsx:187` false.
- **Rename's priority:** it keeps it (`action = seat === 'rename' ? ...`). An unresolved Link value never offers Rename anyway (`linkMenuTarget`), so the two can't collide.

###### Q5: Where the Caret Lands
- It lands at `tk.link.title[1]`.
- `partOf` checks the title first, inclusive at both ends (`edits.ts:399-409`). So the title's end wins over an adjacent `|`, `#` or `)` (markdown's title is the page half before `#`).
- `autocompleteQuery` reads the whole slot (`autocomplete.ts:86-88`), so any spot in the title gives the same query.
- For `[[A/B/Notes|x]]` the title slot is `A/B/Notes`, and the end lands before `|`.
- `[x](A/B/Notes)` isn't a connection at HEAD at all. `namesPage` refuses `/` (`links.ts:36-37`), and `resolveLink` returns `kind:'url'` (`linkValue.ts:112-117`), so a click follows it as an address today.

###### Q6: After the Seat
- **The query arms.** A selection transaction recomputes `acQuery` (`acQuery.ts:51-63`; `focusRange` and `seatSelection` both dispatch a selection). The hook then sets `ac` with caret geometry (`useConnectionAutocomplete.ts:56-63`).
- **Rows:** `candidates` (:111-121) list two or more holders past the exact-match gate (:118-119), with trails from `pageRow` (`autocomplete.ts:104-109`).
- **A pick:** `commit` computes `kept` through `keptShown` and `keepsShown`, which return true for an unresolved baseline (`linkValue.ts:261-263`). The `title` arm then writes the whole link with the alias kept (`autocomplete.ts:173-179`).
- **The two blockers on that path:**
  - `pageRow` writes `value: p.title` (:106), the C-6 blocker.
  - The arm writes `heading: undefined` (:179), C-5's drop; the picker scout owns that.
- **A phantom no title matches:** the caret seats, the syntax reveals, and no pane opens (`open` needs candidates, :180); typing narrows the list live. That's the expected shape under C-1, not a gap.

###### Q7: Tiles at Rest
- **Confirmed.** The seat runs while a tile is read-only, where `acQuery` yields null (:61). The click then flips read-only through an effects-only dispatch (`MarkdownEditor.tsx:272-274`), and `acQuery.ts:51` returns early.
- **Fix:** `if (!tr.docChanged && !tr.selection && tr.startState.readOnly === tr.state.readOnly) return value`. That's two facet reads on transactions that change neither the text nor the selection, nothing on keystrokes. `acQuery` already owns the read-only rule.
- **Rejected alternatives:**
  - Re-dispatching the selection would reset `linkRest` (`linkReveal.ts:11`) and every other selection consumer.
  - Gating the seat on `!readOnly` would kill tiles.
- `MarkdownEditor.tsx:276` skips `focus()` because the seat already focused the editor.

###### Q8: C-6 Ordering
Confirmed, and wider than A-3 and D-1:
- **A-3:** without it a pick rewrites the bare title (`autocomplete.ts:106`).
- **D-1:** without it a path-form query matches nothing, because `candidates` matches a title prefix only (`pageIndex.ts:54-62`).
- **A-2/A-4:** without them a markdown path link isn't even unresolved (`links.ts:36-37`).
- Before all of these land, the rule's only effect is seating, plus a pane of holders whose pick changes nothing.

###### Q9: Risks as Sequences
1. **Fast second click:** opening the field, then clicking again within the double-click window, hits `detail > 1` (`pointerPath.ts:48`), so the seat is refused and CodeMirror selects a word. Whether Chromium resets the click count on a freshly mounted node can't be read from the tree; it's the one live-test item.
2. **Double-click after the reveal:** the first press seats and reveals the syntax, so layout shifts. The second press (detail 2) falls to CodeMirror and may select a bracket or a path word. Accept it.
3. **Clamped press beside an ambiguous link** (`linkEdges.test.tsx:184-191`): `el` is null, so `onText` is false and the nearer edge seats 10. Unchanged.
4. **`linkTokenAt` counts the end as inside** (`tokens.ts:323-324`): a press just past a link at line end is double-gated by `el` (the line node) and `pos <= contentRange[1]`, so the seat never hijacks it. A pre-existing quirk with adjacent links `[[A]][[B]]` (`.at(-1)` picks B) is unchanged.
5. **Caret at the edge, then an alias click:** it seats the title first (Q2's cost).
6. **Right press:** the seat comes after the `button === 2` return. `contextmenu` with an unresolved hit gets a null `menu` and falls through as today, and `followCitation` is untouched.
7. **Sticky dismiss:**
   - Press Escape (`dismissed` = the title query), then click the same link with the caret still strictly inside. The press is exempt, lands in the same slot, `sameQuery` matches, and the pane stays shut.
   - Clicking away (q null) clears `dismissed` (`acQuery.ts:64`). Acceptable.
8. **Seat at mount:** `caretGeometry` returning null at the mount of `CellEditor` or `ValueEditor` sets `ac` null with no retry (`useConnectionAutocomplete.ts:61-62`). No test asserts the pane after a mount seat; test it live.
9. **Glance and history:** a seat lands in a read-only view that never flips, so no pane opens. The focus matches CodeMirror's own press. No guard needed.
10. **Pre-existing quirk:** a markdown phantom hides `(X)` at rest (`decorations.ts:589`) while `hidesSyntax` reads false for phantoms (`linkClicks.ts:71`). A press clamped into the hidden destination falls to CodeMirror. Worth noting; it's out of the rule's path.

###### Q10: What Becomes False
- **`ConnectionsPM.md:19`:** "muted and inert until one side is renamed".
- **`ConnectionsPM.md:36`:** "a phantom is inert". §Rendering should state the click rule instead. :51, "offers no link menu", stays true.
- **`PropertyValueInput.tsx:17` doc comment:** "opens on the whole written value…"
- **`ValueEditor.tsx:45-46`:** the `alias` doc comment, if it becomes `seat`.
- **`linkEdges.test.tsx:153-192`:**
  - The describe title goes.
  - :165 dispatches on `contentDOM`, so `el` is null and the test could never exercise the seat. Rewrite it to dispatch on `.md-connection-phantom` and pin 8.
  - :174 should pin 8 instead of `not [2,10]`.
  - :184 stays.
- **`cellStatic.test.tsx:201-220`:** it lists every `span`, and the wrapper adds one.
- **`PropertyValueInput.test.tsx:187`:** false under Q4 (b) only.
- **Still true:** `TextCell.test.tsx:112-135`, and `ValueEditor.test.tsx:84` (resolved `Alpha`, no seat).

###### Final Shape
- **One arm:** `seatTitle` in `linkEdit`.
- **One predicate:** a strict interior check, scoped to the seat clause.
- **Three callers on existing appliers:**
  - The `pointerPath` mousedown, through the optional `seat` member and `applyLinkAction`. It covers the body, live cells, the Text pane, one-line fields, tiles and unresolved embeds. An unresolved `![[X]]` forms no tile (`embedWidget.tsx:397`), so `embedClickSeat` is uninvolved.
  - `claimLink` → `applyAtRest`.
  - The `ValueEditor` open, with the `oneLine` whole-link fold.
- **Plus:** the read-only recompute in `acQuery`. Nothing is removed.

###### Line Estimate (Production Only)
| Piece | Lines |
|---|---|
| `linkEdit` type and arm | +3 |
| `pointerPath` member and clause | +6 |
| `linkClicks` selector and seat | +4 |
| `cellStatic` wrapper (0) and `claimLink` | +3 |
| `ValueEditor` open | +5 |
| `acQuery` | +1 (up to +3 if Biome wraps it) |
| C-4 option (b) | +1 |
| C-4 option (a), instead of (b) | +9 |

The total is about **+23 / −0 with (b)**, or about **+31 with (a)**. The optional `resolveLink` helper fold would net about −1. This rule is a small net addition.
