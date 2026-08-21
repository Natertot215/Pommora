## Asset Directory — Decision Log

*Part 1 of redoing Pommora's file-type property.*

### Frame

- **Purpose:** Give the nexus asset directory a user-configurable home so a Pommora nexus and an
  Obsidian vault can share one attachments folder, keyed identically by both applications.
- **Core Value:** An asset is an ordinary file on disk under whatever name the user gave it, named
  from Pommora by `[[That File.png]]` and resolved by filename.
- **Success Criteria:** `asset_directory` points at the existing NexusOS file-assets folder;
  banners and the profile image render from it; that folder never enters the content corpus, never
  triggers a whole-nexus re-walk, and its existing `excluded_folders` entry stays harmless.

### Sources

- `src/shared/nexusPaths.ts` — `ASSETS_DIR_REL`, `thumbsRel`/`thumbRel`; the one spelling main, the
  watcher and the renderer all speak.
- `src/main/exclusion.ts` — `hiddenName`, `shouldSkipDir`, `excludedMatcher`, `sameExclusions`; the
  single predicate behind the walk, the corpus, the watcher's ignore and the classifier.
- `src/main/io/walk.ts` — `corpusFiles`/`corpusFilesUnder`; THE corpus definition.
- `src/main/watcher.ts` — `ignoredUnder` builds chokidar's ignore from the exclusion matcher;
  `settle` re-arms on an exclusion change via `sameExclusions`.
- `src/main/watchPatch.ts` — `classifyEvent`; excluded paths classify `ignored`, and the terminal
  arm for any unrecognized file is `full-refresh`.
- `src/main/indexSeed.ts`, `src/main/db/contentIndex.ts` — the stat-gated seed and the
  `mentions` / `page_values` / `indexed_files` tables, all keyed on nexus-relative POSIX paths.
- `src/main/connections/scan.ts`, `rewrite.ts` — the cascade's prefilter and its pure rewrite;
  body syntaxes plus GOVERNED frontmatter values only.
- `src/shared/governedKeys.ts` — governance is by `<…>` / `(…)` shape; `cover` is a bare key.
- `src/main/mutate.ts` — `writeImageAsset`, `assetKeyOk`, `setBanner`, `setProfileImage`.
- `src/main/io/navigationFile.ts` — `isAssetPath`, the banner delete-guard.
- `src/main/index.ts` — the `nexus-asset://` handler and its prefix check; `nexus:pickImage`
  (native picker → data URL); `nexus:choose` (the nexus adopter, not a generic folder picker).
- `src/main/pathSafety.ts` — `resolveUnderRoot`, realpath containment.
- `src/renderer/src/Settings/NexusSettings.tsx` — the `Row` union and `RowControl`; every row kind
  but `device` writes a `personalization` key.
- `src/renderer/src/design-system/components/InteractionField.tsx` — the field chrome.
- `src/shared/propertyValue.ts` — `FileRef { path: string }`, already live for the `file` type.
- `.claude/Features/ConfigurationPM.md` — settings scopes and write discipline.

### Decisions

#### A — Setting & Control

- **A-1:** [confirmed] `asset_directory` is a TOP-LEVEL key in `.nexus/settings.json`, not a
  `personalization` key — it sits with `excluded_folders` and `profile_image`, which are also
  top-level paths. Consequence: the new Settings row cannot use `writePersonalization`; it needs
  its own read/write path, the way `device` rows go to nexus.db instead.
- **A-2:** [confirmed] Surfaced at Settings > Files & Links > Default Asset Directory. No
  field-with-trailing-affordance component exists. The one working precedent is welded inside
  `TextPicker` (`TextPicker.tsx:52` + `textPicker.css.ts:16`): field chrome on a flex wrapper,
  `focusRing('within')`, a bare `EditableInput` with `boxed={false}`, and a `flex:0 0 auto`
  trailing node. `--input-field` is a token and `field` an exported style, so composing it is
  consumption rather than duplication — no design-system extraction is owed.
- **A-6:** [confirmed] The row's write template is `writeSubfield` / `writeNavViewModes`
  (`settings.ts:84`, `:99`) — top-level keys through `updateSettings`. NOT the `device` row, which
  persists to `nexus.db`. `device` is the precedent for the ROW SHAPE alone (the one arm not keyed
  through `KeyOf<Personalization>`).
- **A-7:** [confirmed] `asset_directory` is `excluded_folders`' twin — top-level snake_case,
  walk-affecting, captured at watcher-arm time — so it is a tree leaf like `excluded`, threaded
  through the three places `readNexus.ts:203` says must never disagree: `readSettingsLeaves`, the
  walk's tree literal, and `watchPatch.ts`'s `applySettingsLeaves`. A write calls
  `confirmSettingsWrite()`, as `personalization:set` does and `subfield:set` does not.
- **A-8:** [confirmed] A pushed asset map runs through `stabilize` (`treeStabilize.ts`) on apply.
  IPC strips object identity, so an unstabilized push re-renders every banner consumer on every
  file the sync delivers.
- **A-3:** [confirmed] Selection is validated, not restricted: any folder inside the nexus root,
  refused if it holds `.md` files or a sidecar. "New Folder" lives in the dialog.
- **A-5:** [confirmed] The picker hands back a PATH, not a data URL. If the chosen file already
  sits under an asset root it is referenced in place; otherwise it is copied in under its own
  basename, disambiguating on collision the way entity creation does. `nexus:pickImage`'s data-URL
  round-trip and `writeImageAsset`'s invented `banner-<token>` name both retire.
- **A-4:** [confirmed] `nexus:choose` is the NEXUS adopter — it calls `adoptNexus` on its result.
  A pattern to copy, not a channel to reuse. The asset-directory chooser is a new `kind: 'window'`
  channel: `showOpenDialog` with `openDirectory` + `createDirectory`, defaulted to the nexus root,
  then validated — inside the root via `resolveUnderRoot`, holding no `.md` and no sidecar — and
  answering the nexus-relative path or a typed refusal.

#### B — Corpus & Watcher

- **B-1:** [confirmed] The asset root OUTRANKS every other skip. `ignoredUnder` compiles chokidar's
  ignore from `excludedMatcher`, and `classifyEvent` returns `ignored` for anything it matches — so
  an assets folder named in `excluded_folders` delivers no events at all. The asset test runs FIRST
  in both, ahead of the exclusion match and ahead of `ignoredUnder`'s dot-prefix rule (which would
  otherwise blind a root like `.attachments`). `excluded_folders` then governs the content corpus
  alone, which is what it was always meant to mean.
- **B-2:** [confirmed] `classifyEvent`'s terminal arm is `full-refresh` for any file that is neither
  Markdown nor a sidecar, and its `.nexus` branch refuses everything but settings, homepage and
  space-meta. `.nexus/assets` does not storm today only because every write there is Pommora's own
  and `isRecentWrite` suppresses the echo. A SHARED directory's writes are external, so every image
  a sync delivers would force a whole-nexus walk. A new `asset` class ahead of both arms patches the
  asset map and nothing else.
- **B-3:** [confirmed] The walk must skip the asset root or it enters the tree as a folder entity.
  Two predicates need it, not one: `shouldSkipDir` (`readNexus.ts` ×3, `adopt.ts` ×3) and
  `corpusFilesUnder`'s own `NON_CORPUS_TOP`-plus-exclusion test.
- **B-4:** [confirmed] `excluded: string[]` threads through `startWatcher → settle →
  applyWatchEvents → classifyEvent → touchesCorpus → ignoredUnder` as arm-time captured state, and
  `sameExclusions` is the re-arm check. The asset root is captured identically, so it widens that
  ONE parameter into a scope object compared as a unit — rather than a second value threaded beside
  the first and a second comparison to keep in agreement.
- **B-6:** [confirmed] `thumbsRel` (`nexusPaths.ts:36`) stays hard-pinned to `ASSETS_DIR_REL`,
  while the `nexus-asset://` containment check (`index.ts:239`) must learn the configured directory
  IN ADDITION to `.nexus/assets` — the two hard-code the same constant today for opposite reasons,
  and only one of them may keep doing so.
- **B-5:** [confirmed] `assetMatcher` is `excludedMatcher`'s twin: the same WeakMap-compiled,
  root-anchored, whole-segment prefix match over normalized segments.

#### C — Resolution

- **C-0:** [confirmed] The asset index is `buildPageIndex`'s sibling, NOT a `contentIndex.ts`
  table. An in-memory `Map<normalizedFilename, paths[]>` built from a listing of the asset roots,
  resolving `resolved | phantom | ambiguous` — the same trichotomy the picker rule already
  assumes. Nothing derived from an asset needs to survive a restart, so `nexus.db` holds none of
  it and the stat gate, the seed and the prune are all moot.
- **C-1:** [open] Resolution is RENDERER-side, against a map main owns and pushes — not baked into
  the tree. Main-side resolution makes the tree a derived join with no reverse index behind it, so
  an asset appearing or vanishing could only be reflected by a full re-walk, which is the same storm
  B-2 exists to prevent. Renderer-side, the map is React state: a phantom that becomes real repaints
  itself. The tree carries `[[Banner.png]]` verbatim, `assetUrl()` gains the resolve step, and the
  raw-path spelling stays a tolerated second input to that same one function. Renderer-side URL
  construction is already the established pattern — `NavGallery` and `CardsView` build thumbnail URLs
  from `thumbRel` themselves.
- **C-2:** [confirmed] `.nexus/assets` is NOT a second wikilink root. After the migration it holds
  thumbnails and nothing else. Where `asset_directory` is left at its `.nexus/assets` default the
  two coincide, so the map skips any `thumbnails` segment regardless.
- **C-5:** [confirmed] Raw-path tolerance in the readers is a MIGRATION WINDOW, not a permanent
  second spelling — it exists so a half-migrated nexus renders, and so a nexus written by an older
  build still opens.

#### F — Migration *(scope added after the recap)*

- **F-1:** [confirmed] Every existing stored image path migrates into the configured directory:
  the file is copied out of `.nexus/assets/<id>/` under a real name, and its reference is rewritten
  to `[[Name.ext]]`. Thumbnails are not MIGRATED — they are pinned to `.nexus/assets` and belong to no
  store — but they are swept with everything else when the folder is emptied, and regenerate on use.
- **F-2:** [confirmed] The current filenames are `banner-<token>.png` and `profile-<token>.png`, which
  are not names anyone would choose. The migration has to decide what each file is CALLED once it
  lands in a folder the user reads.
- **F-4:** [confirmed] SIX stores, not five. The census adds `file`-type property values —
  `FileRef { path }` arrays in a page's governed frontmatter, resolved through `resolveUnderRoot`
  and opened with `shell.openPath` (`index.ts:1749`). The migration does NOT touch them: they are
  user-typed paths that Pommora never minted, and the type is Part 2's subject.
- **F-5:** [confirmed] `.nexus/assets` holds ORPHANS. Nothing in `src/main/crud`, `record.ts` or
  `remint.ts` references the assets folder at all (0 hits against a 243-hit control), so deleting
  an entity strands its `.nexus/assets/<id>/` folder. The migration therefore walks the STORES,
  not the directory — a directory walk would carry orphans into the user's folder as garbage.
- **F-6:** [confirmed] Every stored value is a bare nexus-relative string, and all six are minted
  by one function, `writeImageAsset` (`mutate.ts:105`), from exactly four call sites
  (`mutate.ts:394, 445, 468, 505`). One writer to convert, not six.
- **F-7:** [confirmed] `navigation.json` is the only fully-gated store — `isAssetPath` runs on BOTH
  read (`navigationFile.ts:71`) and write (`:114`). The other four are gated only where a delete
  is about to happen. Any spelling change has to clear that read gate or the NavView banner
  silently vanishes on the next read.
- **F-3:** [open] Migration shape obligations, per the planning discipline: a backup before the
  first in-place write, a census with counts predicted in advance, an idempotent transform, and
  invariants verified after.

#### G — The Live Census *(measured against `~/NexusOS`, 08-21-2026)*

- **G-1:** [confirmed] Target folder is `file-assets/` at the nexus root — Obsidian's own
  attachments folder, holding `Pasted image <timestamp>.png` files.
- **G-2:** [confirmed] 46 pages carry a `cover:` key. **34 are ALREADY Obsidian wikilinks**
  (`cover: "[[Pasted image 20260820224513.png]]"`), 10 are web URLs, 1 points into
  `.nexus/assets`, 1 is other. Only ONE page cover migrates.
- **G-3:** [confirmed] Those 44 non-`.nexus` covers are BROKEN TODAY. `assetUrl` branches on
  nothing (`assetUrl.ts:3`) — it prefixes and encodes whatever it is handed, so a wikilink becomes
  `nexus-asset://nexus/%5B%5B…` (404) and a web URL becomes `nexus-asset://nexus/https://…` (403,
  the containment check). No consumer special-cases either. The feature's largest single effect is
  therefore REPAIR, not migration.
- **G-4:** [confirmed] A cover may hold a WEB URL, which must pass through the resolver untouched.
  Not previously logged, and broken today.
- **G-5:** [confirmed] 13 references migrate: 10 container/Space sidecar banners, the homepage
  banner, the NavView banner, the profile image. Plus G-2's single page cover = 14 total.
- **G-6:** [confirmed] 21 non-thumbnail files hold only ~12 UNIQUE images. `IMG_0073.jpeg` exists
  as 7 byte-identical copies under 7 entity folders, another image as 4, and two further pairs.
  Content-hash dedup is mandatory, not an optimization: without it the folder gains
  `IMG_0073 2.jpeg` … `IMG_0073 7.jpeg`.
- **G-7:** [confirmed] 133 of the 154 files under `.nexus/assets` are thumbnails.
- **C-3:** [open] Duplicate filenames across asset sub-folders — the precedent is the connection
  model's `ambiguous` status: a name two files answer to resolves to nothing.
- **C-4:** [confirmed] `isAssetPath` (the delete-guard) and the `nexus-asset://` prefix check both
  answer through one shared main-side predicate: under the configured root, or under `.nexus/assets`.
  The wikilink spelling never reaches either — it is resolved to a path before it gets there.

#### D — Cascade

- **D-1:** [confirmed] The existing cascade cannot reach three of the four banner stores. It is
  page-body + GOVERNED-frontmatter only; `cover` is a bare key, so it is in neither the content
  index's `page_values` nor `rewriteFrontmatterConnections`. Container sidecars, `navigation.json`
  and `settings.json` are not in the corpus at all.
- **D-2:** [confirmed] The page cascade is APP-INITIATED ONLY. `mutate 'rename'` calls
  `renamePage` then `renameCascade`; nothing in the watcher pairs an unlink with an add, so a page
  renamed in Finder leaves every inbound `[[link]]` phantom. Assets inherit this rule unchanged:
  a rename Pommora performs cascades, a rename Obsidian performs does not.
- **D-3:** [confirmed] An asset cascade is `renameCascade`'s own shape, not a new mechanism —
  candidate set, then a per-file locked rewrite. Its reach differs only in the pens it uses: the
  corpus (a page's bare `cover` key), every container sidecar (`listFilesRecursive` already
  enumerates them), and the two singletons `navigation.json` and `settings.json`.
- **D-4:** [confirmed] Nothing in Part 1 triggers that cascade — Pommora offers no way to rename
  an asset, only to select one. The cascade is Part 2's, arriving with the surface that needs it.
- **D-5:** [confirmed] NexusRecord cannot resolve an external rename. `Baseline` is
  `Record<id, EntityRecord>` built from the walked tree (`record.ts`); an asset has no id and no
  tree node. The record is also silent by design — it writes a drift row and actuates nothing, and
  its own doc lists rename cascades under Pending.
- **D-6:** [confirmed] An in-Obsidian rename repairs a page's `cover` and any body reference on
  its own, because those live in `.md` files Obsidian manages. It never reaches the container
  sidecars, `navigation.json` or `settings.json`. An in-explorer rename repairs nothing.
- **D-7:** [confirmed] An external rename phantoms the reference, and that is the accepted
  behavior — identical to what an externally-renamed page does to its inbound `[[links]]` today.
  It is self-healing: restoring the name restores the reference, with no repair state to reconcile.
- **D-8:** [confirmed] NOTHING about an asset is persisted but its filename. No inode, no birth
  time, no size, no hash. This is what makes a sync eviction and re-download a non-event — the
  filename is unchanged, so resolution is unchanged. A birth-time latch was weighed and dropped:
  it was the only component re-materialization could break.

#### E — Ambiguity

- **E-1:** [confirmed] No picker offers an asset whose filename is duplicated elsewhere under the
  asset roots, so an ambiguous reference can never be authored from inside Pommora.
- **E-3:** [confirmed] Resolve-to-display takes the first by sorted path, so a file appearing
  elsewhere never blanks a working banner. Resolve-to-DELETE refuses on ambiguity: `setBanner`'s
  replace leaves the old file on disk rather than risking the wrong `rm`.
- **E-2:** [confirmed] A duplicate can still APPEAR after the fact (Obsidian adds a second `Banner.png`
  in another sub-folder), so the read side still needs a tiebreak — and `setBanner` deletes the
  previously-referenced file on replace, so an ambiguous resolve can reach an `rm`.

### Core (must-have)

*Pending — settles once §B–§D close.*

#### Prospects (allowed later, not now)

- Web-paste image landing (timestamp/hash names) — no clipboard-image handler exists in
  MarkdownPM today, so this is new surface rather than a redirect of an existing one.
- The `file` property's `FileRef` (Part 2).

#### Out of Scope (won't do — distinct from Prospects)

- Asset roots outside the nexus root.

#### Considered & Rejected

*Pending.*

#### Lessons

*Pending.*
