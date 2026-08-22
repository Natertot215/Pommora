## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 8febb642-49c6-4227-8a0b-60e3419392a7
**Date:** 08-21-2026 → 08-22
**Model:** Opus 5

**Part 1 of the file-based arc shipped whole, across five phases, and the migration ran against the live nexus.** `asset_directory` is a top-level settings key the user picks from Settings › Files & Links, validated rather than restricted — any folder inside the nexus that holds no page and no sidecar anywhere in its subtree. It is `excluded_folders`' twin, so the two travel as one `WatchScope` through the walk, the corpus, chokidar's ignore and the classifier, and the asset test runs ahead of every other skip; without that ordering a folder already named in `excluded_folders` — which Nathan's `file-assets` was — delivers no events at all. A dedicated `asset` classifier arm is what keeps 50 images landing in a synced folder from forcing 50 whole-nexus walks.

A stored image is now named the way Obsidian names one. `assetMap.ts` holds a filename→paths listing main builds once, patches from watch events and pushes; `resolveAssetValue` reads the three spellings a value can wear — an `[[Name.png]]` wikilink, a raw path, a web address — and the picker hands back a path so `adoptImageAsset` copies a chosen file in under its own basename, or references it where it already sits. The profile photo is the one exception and stays bytes: it is a crop, not a chosen file, so it writes the singleton `nexus-icon.png` and rewrites that same file on every later crop.

**The migration is done and verified.** `assetMigrate.ts` walked the six stores rather than the directory — nothing cleans up `.nexus/assets/<id>/` when an entity is deleted, so a directory-driven copy would have carried long-dead entities' leftovers into a folder shared with Obsidian. 10 files moved into `file-assets`, 15 references rewritten, 22 originals swept to `.trash`. All 45 page covers resolve where 44 of them rendered nothing before this arc: 35 wikilinks that had always 404'd and 10 web addresses that had 403'd against the protocol's containment check. `.nexus/assets` holds nothing but regenerated thumbnails.

**The codebase-cleanup arc is where it was.** Bundles 1, 2 and 3 landed 08-21; 6a → 6b are the high-priority pair next, and nothing this session touched them.

#### Completion Criteria

- [x] **Phase 4** — the picker returns a path, the writer keeps the name; verified against the real filesystem through the running app, screenshotted.
- [x] **Phase 5** — migrate, collapse, empty; backed up first, run live, and confirmed after a full renderer reload on the homepage, a Collection, the pinned Fitness page, and a banner added afterward.
- [x] **Every phase simplified before it was reviewed**, then reviewed: 7 findings in Phase 4, 6 in Phase 5, 4 in a final whole-arc pass — each verified against the code before folding, none deferred.
- [x] **Two live checks the plan could only get by hand** — 12 files dropped into the newly configured root produced exactly one `assets:changed` and zero `nexus:changed`, and a file already inside the root was referenced without a copy.
- [x] **Dead Vocabulary sweep returns zero** against non-zero controls; the plan's Made False table is fully rewritten.
- [x] **Gates green** — typecheck 0, 278 files / 3480 tests, `biome check` clean over 904 files.
- [x] **Nothing left in the live nexus** — the scratch pages and their adopted files were removed; the backup at `~/NexusOS-backup-20260821-231448` remains.

#### Next Session — Two Parallel Tracks

1. **The continuous codebase cleanup** — [[Codebase-Cleanup-Checklist]], 6a → 6b next (the rehome, then Table hoisting); Bundle 4 and the store split follow. Any session starts it with "Run the next bundle from Codebase-Cleanup-Checklist."
2. **Parts 2 and 3 of the file-based arc.** Part 2 is `PhotoCropModal` widened past the nexus icon so banners, cards and other media crop through it — today it is the profile photo's alone, and it is why `setProfileImage` still carries bytes while every banner carries a path. Part 3 is the `file` property type: its `FileRef` is a user-typed path anywhere in the nexus rather than a basename under the asset root, so it needs a path arm the name arm does not supply, and `pickImagePath` was deliberately left without a baked-in extension contract so the any-file picker widens it rather than replacing it.

#### Feedback

- "The input field goes to the right of the setting label, not below" — and the hairline that separates multi-value inputs stays with FilterPane; a sub-directory path shows with the `›` glyph at `--label-tertiary`. `SegmentRun` carries both under a `nested` flag.
- "I can confirm visuals myself, you confirm behavior."
- "Don't update any feature docs, those you did before were too bloated of entries" — the Made False reconciliation had already landed at `6425544d` and nothing was added on top.
- "Commit any doc edits that have been made in the working tree alongside your work" — `ArchitecturePM.md` and the audit report rode the commits they belonged beside.

#### Touched Files

- **Created:** `main/assetMap.ts`, `main/assetRoots.ts`, `main/assetWrite.ts`, `main/assetMigrate.ts`, `main/assetDirValidate.ts`, `main/disambiguate.ts`, `shared/assetMime.ts`, `renderer/Settings/AssetDirectoryRow.tsx` + `pathRow.css.ts`, `renderer/design-system/components/SegmentRun/`.
- **The seam:** `shared/bridge.ts`, `shared/types.ts`, `shared/mutate.ts`, `preload/index.ts` — `assets:map`, `assets:changed`, `assets:chooseDir`, `assets:setDir`, `nexus:imageData`; `setBanner` takes `source` where it took `dataUrl`.
- **Main:** `readNexus.ts`, `exclusion.ts`, `watcher.ts`, `watchPatch.ts`, `settings.ts`, `mutate.ts`, `index.ts`, `paths.ts`, `io/walk.ts`, `io/navigationFile.ts`, `crud/loadValues.ts`.
- **Renderer:** `assetUrl.ts`, `store.ts`, `App.tsx`, `Settings/NexusSettings.tsx`, `Detail/Banner/`, `Tabs/NavView.tsx`, `Detail/Views/Cards/CardsView.tsx`, `Components/useNexusIcon.ts`, `design-system/components/interactionField.css.ts`.

#### Session Pointers

- `main/assetMap.ts` — `buildAssetMap` / `patchAssetMap` / `resolveAssetName`; `AMBIGUOUS` is a `unique symbol`, because `string | 'ambiguous'` collapses to `string` and a caller testing `typeof === 'string'` would delete by the refusal.
- `main/assetRoots.ts` — `underAssetRoot` is the one containment test the protocol and the delete guard cross; `assetFilePath` names the file a value means, `assetFileToDelete` narrows it to what Pommora minted.
- `main/assetWrite.ts` — `writeAssetFile` is the one landing site; a name held anywhere under the root steps aside, since a basename answers nexus-wide.
- `main/assetMigrate.ts` — `collectRefs` models each store as read/write plumbing so the pass is uniform; the singletons lead so a shared file takes the nexus's own name.
- `main/exclusion.ts` — `WatchScope` / `sameScope` / `assetMatcher` / `neverWatched` / `rootSegs`.
- `renderer/assetUrl.ts` — `assetUrl(rel)` stays the raw scheme builder the two thumbnail sites use; `resolveAssetUrl(value, map)` is the resolving entry, and `useAssetUrl()` binds the map once per component.

#### Working Notes

- **No write Pommora makes is visible to its own watcher.** `atomicWriteBinary` calls `recordWrite` and `isRecentWrite` drops the echo before `settle` runs, so every asset write patches the held map and pushes on its own channel, and `assets:setDir` re-walks, reseeds, re-lists and re-arms itself. A feature that builds only the external-change machinery ships green with three silent defects.
- **A basename is a nexus-wide key.** Deduplicating against the destination folder alone lands a second file that makes both permanently ambiguous — the map answers, not the folder.
- **`thumbsRel` stays pinned to `.nexus/assets`** deliberately: thumbnails are Pommora's own derived files and do not follow the setting into a shared folder. That is why `.nexus/assets` is not empty for long after the migration, and why it is not a regression.
- **A replaced banner deletes nothing in the user's folder.** After the migration that means replacing a banner deletes nothing at all — which is how Obsidian treats attachments, and is deliberate.
