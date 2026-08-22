## Asset Directory — Completion Checklist

*What must be true to call [[Asset Directory — Implementation Plan]] finished. Each line is a claim
with the command or observation that settles it.*

### Gates

- [x] `npm run typecheck` — 0, both tsconfig projects.
- [x] `npm run test` — 0, 278 files / 3479 tests.
- [x] `npm run lint` — `biome check` reports zero errors AND zero warnings across 904 files.
- [x] The working tree carries nothing of this arc's that is uncommitted.

### The requirements, each observed rather than argued

- [x] **R1** `asset_directory` reads as a tree leaf and writes from Settings › Files & Links.
- [x] **R2** The chosen folder is validated: refused for the nexus root, an app-owned folder, a
  non-directory, or any subtree holding Markdown or a sidecar.
- [x] **R3** The asset root is out of the corpus and the tree, and watched regardless of
  `excluded_folders`.
- [x] **R4** No asset filesystem event walks the tree.
- [x] **R5** A wikilink resolves by filename; a raw path and a web address pass through.
- [x] **R6** A duplicate filename resolves to the first by sorted path, and refuses a delete.
- [x] **R7** Adoption never authors an ambiguous reference — a colliding basename steps aside, and
  a name already held anywhere under the root is stepped aside from rather than doubled.
- [x] **R8** A picked banner keeps its own basename, or is referenced in place.
- [x] **R9** Every `.nexus/assets` reference migrated, identical files collapsed, the folder empty.
- [x] **R10** Every write Pommora makes updates what depends on it directly — the map is patched
  and pushed by the writer, never by the watcher its own echo suppression silences.

### Live evidence

- [x] 45 of 45 page covers resolve — 35 wikilinks, 10 web addresses, zero phantoms. Before this arc, 44 of them rendered nothing.
- [x] The homepage, a Collection and the pinned page render after a full renderer reload.
- [x] A banner added AFTER the migration lands in the configured directory under its own name.
- [x] `.nexus/assets` holds nothing but regenerated thumbnails.
- [x] The originals are recoverable from `.trash`.
- [x] A backup of `.nexus` and `file-assets` predates the first mutation.

### Residue — nothing a cleanup sweep would flag

- [x] Dead Vocabulary returns zero against non-zero controls: the `banner-` minting shape,
  `profile-` outside test fixtures of the legacy name, `sameExclusions`, `pickImageDataUrl`,
  `writeImageAsset`, `assetKeyOk`. Controls: `ASSETS_DIR_REL` 78, `nexus-asset` 7, `excluded` 138.
- [x] No second definition of anything this arc touched: one containment predicate
  (`underAssetRoot`), one file resolver (`assetFilePath`), one asset writer (`writeAssetFile`),
  one disambiguator (`createDisambiguated`), one nexus-relative POSIX spelling (`relPosix`), one
  sidecar-name set (`SIDECARS`), one image type list (`ASSET_MIME`).
- [x] No instrumentation left in `src/main/index.ts` — no `POMMORA_USERDATA`, no debug logging
  beyond the migration's own one-line report.
- [x] No scratch pages or scratch assets left in the live nexus.
- [x] No TODO, FIXME or status-claiming comment introduced by this arc.
- [x] Every review finding folded, each verified against the code first: Gate 1 four, Gate 2 seven,
  Gate 3 four, Phase 4 seven, Phase 5 six.

### Documentation

- [x] Every claim in the plan's Made False table rewritten in the commit that falsified it.
- [ ] `HistoryPM` carries PM-112. `ContextPM` and `HandoffPM` reflect where this leaves the project.
- [x] The plan's own Progress tree and Deviations record what actually happened, including where
  the plan was wrong.
