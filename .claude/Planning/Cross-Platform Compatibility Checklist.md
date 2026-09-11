## Cross-Platform Compatibility Checklist

> **Standing (09-10-2026):** evidence gathered for a later session that will make Pommora run on Windows while macOS keeps working against one Nexus folder. This is a findings record and a checklist, not a plan: it states what the code does today and what would have to hold instead, and it proposes no implementation.

### Sources

- [[Sync Groundwork — Decision Log]] — the arc this sweep serves; its Sources list the path, echo, watcher, and settings-placement observations re-verified here.
- `Core/Paths/` — `posix.ts`, `pathSafety.ts`, `paths.ts`, `nexusPaths.ts`, `names.ts`, `exclusion.ts`, `caseFold.ts`, `urlPath.ts`.
- `Core/Nexus/` — `session.ts`, `identity.ts`, `ids.ts`, `page.ts`, `folderEntity.ts`, `rename.ts`, `mutate.ts`, `readNexus.ts`, `watchSettle.ts`, `handlers.ts`.
- `Core/Files/` — `writeEcho.ts`, `atomicWrite.ts`. `Core/Index/indexSeed.ts`. `Core/Trash/` — `bundle.ts`, `delete.ts`, `spend.ts`. `Core/Contexts/` — `contexts.ts`, `contextCascade.ts`.
- `Core/Platform/` — `machine.ts`, `assetScheme.ts`, `localState.ts`. `Core/Contract/handlers.ts`.
- `Core/Assets/` — `assetRoots.ts`, `assetUrl.ts`. `Core/Actions/commands.ts`. `Core/Settings/` — `settings.ts`, `personalization.ts`.
- `Core/Interface/Toolbar/toolbar.css`, `Core/Interface/Sidebar/sidebar.css`, `Core/Navigation/navRef.ts`.
- `UIX/Interactions/chords.ts`, `UIX/Theme/typography.css.ts`, `UIX/package.json`.
- `Desktop/` — `main.ts`, `Bridge/preload.ts`, `Platform/nodeMachine.ts`, `Platform/fileLock.ts`, `FileWatch/watcher.ts`, `Config/appConfig.ts`, `Config/interfaceScale.ts`, `Actions/appMenu.ts`, `Actions/editorMenu.ts`, `Actions/menu.ts`, `Capture/thumbnails.ts`, `Store/open.ts`, `Store/driver.ts`, `Store/ddl.ts`, `Store/versionsDb.ts`, `Renderer/drag-region.css`, `electron-builder.yml`, `package.json`.
- `node_modules/chokidar/index.js` (version 5.0.0) — the watcher's own path composition.
- `package.json` (workspace root).

### Findings

#### Paths

- **Root Re-Nativization:** `Core/Nexus/session.ts:10-14` stores `machine().realpath(root)`, and `Desktop/Platform/nodeMachine.ts:53` binds that to Node's `realpath`, which answers `C:\Users\…` on win32. The forward-slash root handed in at `Desktop/main.ts:151,312` becomes backslash one line later, and `Core/Paths/posix.ts:45-56` then reads a whole native path as a single segment: `relative(realRoot, realTarget)` in `Core/Paths/pathSafety.ts:29-31` returns a `..`-leading string, `escapes` reads true, and `resolveUnderRoot` refuses every path — page reads, mutations, and the asset protocol at `Desktop/main.ts:126` alike. The same arithmetic reaches `isReserved` (`pathSafety.ts:38`), `relCorpusPath` (`Core/Index/indexSeed.ts:78-79`, which would index nothing), and `trashChainDir` (`Core/Trash/bundle.ts:12-13`). What would need to hold: the session root reads the same way on both platforms, and canonicalization does not reintroduce a native separator.
- **Absolute-Path Refusal:** `Core/Paths/posix.ts:1` defines `isAbsolute` as `startsWith('/')`, and `Core/Paths/pathSafety.ts:14` uses it as the lexical guard against an absolute `relPath`. On Windows `C:\anything` and `\\server\share` read as relative and pass it, though neither escapes on its own: `join(root, relPath)` yields a path that does not exist, and the realpath comparison at `:24-31` answers `not-found`. Containment therefore rests on that comparison alone, which the root spelling above already unseats. What would need to hold: the lexical guard recognizes each host's absolute forms, so it holds independently of the realpath step.
- **Segment Arithmetic:** `Core/Paths/posix.ts:3-17` splits and rejoins on `/` alone, so `normalize`, `dirname`, `basename`, `relative`, and `extname` treat a backslash as an ordinary character and a drive letter as an ordinary segment. Everything keyed by these results — index rows, exclusion prefixes, trash chains — derives from that. What would need to hold: one spelling reaches Core, and Core's arithmetic agrees with the host's on what a segment is.
- **Conversion Coverage:** `Desktop/main.ts:142` defines `posixPath`, applied at four places: adoption from the app menu (`:151`), the open/save dialog reply (`:220`), the pasted-image temp file (`:228`), and launch restore (`:312`). Paths that reach Core by other routes carry native separators — `Desktop/Bridge/preload.ts:25` (`webUtils.getPathForFile` into `nexus:openPath`), `Desktop/Platform/nodeMachine.ts:53` (`realpath` replies), and every path chokidar emits. What would need to hold: each way a host path enters Core converges on one spelling.
- **Mixed Composition:** `Desktop/Store/open.ts:26-27`, `Desktop/Store/versionsDb.ts:52-54`, `Desktop/Capture/thumbnails.ts:48,82-83`, and `Desktop/Config/appConfig.ts:20` compose Core's POSIX-built directories with Node's native `join`. The filesystem accepts the result on both platforms; a string comparison against a Core-built path would not match it. What would need to hold: a path used as a key and a path handed to `fs` are built the same way.

#### Write Echo & Locks

- **Echo Suppression:** `Core/Files/writeEcho.ts:6-30` records the absolute path a Core writer used and matches the watcher's path against it exactly, walking ancestors by `lastIndexOf('/')`. Given Core-built keys and chokidar-emitted native paths, no in-app write matches its own echo, so each one classifies as external and buys a settle pass — including the descendant suppression a folder rename depends on (`Core/Nexus/folderEntity.ts:38-40`, `Core/Trash/bundle.ts:37-38`). What would need to hold: the key a writer records and the path the watcher reports are the same string.
- **Write Serialization:** `Desktop/Platform/fileLock.ts:5,10` keys `serializeOnFile` on the exact path string, and its own header records that two spellings of one path are two locks. Any caller reaching it through a differently spelled path takes a second chain over the same file. What would need to hold: one file resolves to one lock key regardless of the caller's route.

#### Watcher

- **Emitted Separators:** `node_modules/chokidar/index.js:713,202` composes emitted paths with `node:path`'s `join`, and its `normalizePathToUnix` (`:104`) is reached only by `normalizeIgnored` (`:106-113`), which handles string ignore patterns rather than event paths. On win32 the emitted path is native throughout, even when the watched root was passed forward-slash. What would need to hold: the path the watcher reports and the path Core reasons about agree.
- **Ignore Predicate:** `Core/Nexus/watchSettle.ts:25-49` builds `ignoredUnder` as a predicate chokidar calls per path; `:30-31` returns `false` whenever `relative(root, path)` comes back empty or escaping. A native-separator path relativizes to nothing recognizable, so `.trash`, `node_modules`, dotfiles, `.db`/`-wal`/`-shm`, excluded folders, and tile bodies stop being filtered, and the WAL churn `Core/Paths/exclusion.ts:5` exists to drop reaches the settle path. What would need to hold: the ignore filter recognizes the paths chokidar hands it, and an unrecognizable path is not treated as watchable.
- **Nav Classification:** `Desktop/FileWatch/watcher.ts:49` routes an event through `isNavPath` (`Core/Nexus/watchSettle.ts:19-22`), which also splits a relative path on `/`. A misclassified navigation write follows the tree branch instead of the nav push. What would need to hold: the classifier reads the same path shape the watcher emits.

#### Host Config

- **Single-Instance Coordination:** `Desktop/main.ts:295` takes the lock per userData directory, and `:74` lets `POMMORA_USERDATA` open a second one. Its own comment records that every write lock is module state, so two hosts on one folder coordinate nothing. Windows adds no new mechanism, and a second machine on a shared folder is outside the lock's reach entirely. What would need to hold: concurrent writers against one Nexus have a coordination story that does not depend on being one process.
- **Reveal and External Open:** `Desktop/main.ts:233-234` pass Core's forward-slash paths to `shell.showItemInFolder` and `shell.openExternal`, and `:267` to `app.addRecentDocument`. Whether Win32 shell APIs accept a forward-slash absolute path in each of those positions is unverified from here. What would need to hold: a reveal opens the containing folder with the item selected on both hosts.
- **System Trash:** `Desktop/main.ts:67` binds `trashToSystem` to `shell.trashItem`, reached through `Core/Nexus/handlers.ts:95-96` and spent by `Core/Trash/delete.ts:60` and `Core/Trash/spend.ts:151`. Windows routes that to the Recycle Bin, which network and removable volumes may not provide; the rejection path is a thrown error rather than a fallback. What would need to hold: a delete on a volume without a system trash resolves to a stated outcome.
- **Trashed-Recents Names:** `Desktop/Config/appConfig.ts:69-74` treats a recents entry as trashed when a segment folds to `.trash` or `.trashes`. `.trashes` is a macOS volume convention; the Windows equivalent (`$Recycle.Bin`) is unrepresented, so a Nexus deleted on Windows could resurface in Open Recent. What would need to hold: the deleted-nexus test names each host's convention.

#### Menus & Shortcuts

- **Two Meanings for `cmd`:** `Core/Actions/commands.ts:48-49` spells menu accelerators with `CmdOrCtrl`, so the native menu fires on Ctrl under Windows, while `UIX/Interactions/chords.ts:44-53` matches `e.metaKey === chord.cmd`, so the same chord string requires the Windows key in the renderer. Fourteen renderer sites read `metaKey` directly for the new-tab and follow modifier (among them `Core/Interface/Sidebar/Sidebar.tsx:428`, `Core/Views/Table/TableView.tsx:446`, `Core/Views/Cards/CardsView.tsx:857,1295`, `Core/MarkdownPM/Links/linkClicks.ts:88`), and `Core/MarkdownPM/Tables/MarkdownTable.tsx:235` is the one that already accepts either. `toKeyBinding` (`commands.ts:51`) emits CodeMirror's `Mod-`, which resolves per platform on its own. What would need to hold: one modifier predicate answers for menu, renderer, and editor alike.
- **macOS-Only Roles:** `Desktop/Actions/appMenu.ts:53` (`appMenu`), `:114` (Speech), and `Desktop/Actions/editorMenu.ts:78-79` (Speech, `shareMenu`) are roles Electron defines for macOS. On Windows the application menu's first group and those submenus have no counterpart. What would need to hold: each menu group either has a Windows counterpart or is absent there.
- **About Panel:** `Desktop/main.ts:318` calls `setAboutPanelOptions` and `Desktop/Actions/appMenu.ts:161` calls `showAboutPanel`; Electron documents both outside the Windows surface in some versions. What would need to hold: Help ▸ About resolves to something on both hosts; whether it does under Electron 42 is unverified from macOS.
- **Finder-Named Command:** `Desktop/Actions/appMenu.ts:74` labels the reveal command "Reveal in Finder". The Windows equivalent names File Explorer. What would need to hold: the label names the host's own file manager.
- **Radio Rendering:** `Desktop/Actions/editorMenu.ts:150` is the repository's only `type: 'radio'` menu group (the editor's Heading levels); every other exclusive group is already `checkbox` (`Desktop/Actions/menu.ts:26-27`). Windows draws a radio item as a check rather than a bullet, so that one group loses its exclusive appearance. What would need to hold: an exclusive group reads as exclusive on both hosts.
- **Travelling Chord Defaults:** `Core/Actions/commands.ts:4-28` seeds every command with a `cmd+` spelling and stores overrides in `.nexus/settings.json`. A chord edited on one host travels to the other with the folder. What would need to hold: a stored chord means the same gesture on whichever host reads it.

#### Windowing & Theme

- **Window Controls:** `Desktop/main.ts:170-171` opens the window with `titleBarStyle: 'hidden'` and a `trafficLightPosition`, and declares no `titleBarOverlay`. The position option is macOS-only; on Windows the hidden title bar leaves no close, minimize, or maximize control, and `Desktop/Renderer/drag-region.css:2-5` plus `Core/Interface/Sidebar/sidebar.css:10` supply only the drag regions. What would need to hold: the window can be closed, minimized, and maximized by pointer on both hosts.
- **Reserved Control Room:** `Core/Interface/Toolbar/toolbar.css:27` reserves `padding-left: 135px` for the traffic lights when the sidebar is hidden. Windows places its controls at the trailing edge, so that reservation is empty space on the wrong side. What would need to hold: the toolbar reserves room where the host's controls actually sit.
- **Mono Font Stack:** `UIX/Theme/typography.css.ts:6` lists `ui-monospace, SFMono-Regular, Menlo, monospace`, naming no Windows face, so code spans and code blocks fall to the generic default. The body stack (`:5`) is fine, since Inter ships with the app (`UIX/package.json:20`) and names `Segoe UI` behind it. What would need to hold: the monospace stack names a face each host ships.

#### Filenames & Filesystem

- **Name Refusal Coverage:** `Core/Contexts/contexts.ts:33-43` refuses `/`, `\`, NUL, `.`, and `..`, and `Core/Paths/names.ts` adds `|`, hidden-name prefixes, and — for a page — a trailing `.md`. Behind a `machine().platform === 'windows'` gate it also refuses `<`, `>`, `:`, `"`, `?`, `*`, the device names `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, and a trailing dot or space. A Windows host refuses each of these at creation; a macOS host accepts them, so a name typed on macOS can still travel to a Windows peer that cannot write it. What would need to hold: a name accepted on one host is writable on the other, which the host-gated refusal covers only for names created on Windows.
- **Untrimmed Leaf:** `Core/Paths/names.ts` refuses a name that does not equal its trimmed form, so a leading or trailing space is rejected on both hosts before `Core/Nexus/page.ts:35-36` and `Core/Nexus/folderEntity.ts:18-19` build the target, and the Windows gate adds the trailing dot that Windows would otherwise strip. The leaf that lands matches the recorded name.
- **Titles as Folder Names:** `Core/Paths/nexusPaths.ts:39-42` derives a Context folder and a Space folder from their titles, and `Core/Contexts/contextCascade.ts` gates a retitle on `nameError(title, 'directory')`, which refuses any period alongside the shared rules. Every filename constraint above therefore applies to user-visible titles as well. What would need to hold: a title that is legal to type is legal to store as a folder on both hosts.
- **Thumbnail Key:** `Core/Paths/nexusPaths.ts:24` replaces the first colon in a nav key, and its own note calls a colon hostile in a filename. A second colon would survive into `thumbRel` (`:30`) and fail on NTFS. What would need to hold: a derived filename carries no character the target filesystem refuses.
- **Held-File Writes:** `Desktop/Platform/nodeMachine.ts:30-31` writes through `write-file-atomic` (temp plus rename), `:50` renames, and `:51` removes recursively. Windows fails each with `EPERM`/`EBUSY` while another process holds the file open — Obsidian on the same folder, a search indexer, or antivirus — where the same call succeeds on macOS. "Most recent wins" against an external editor therefore behaves differently. What would need to hold: a write contending with an external holder resolves to a stated outcome rather than a raw errno.
- **Path Length:** `Core/Trash/bundle.ts:19-31` prefixes a deleted item with a 24-character stamp inside `.trash/<mirrored chain>/`, roughly doubling the leaf and adding the chain depth again. Windows applies a 260-character limit unless long paths are enabled and the call is prefixed. What would need to hold: a delete that succeeds on the corpus also succeeds into the trash mirror; how Node handles a long path under Electron 42 is unverified from macOS.
- **Canonicalization Targets:** `Desktop/Platform/nodeMachine.ts:53` binds `realpath`, consumed by `Core/Nexus/session.ts:10-14` and `Core/Paths/pathSafety.ts:24-25`. On Windows a junction, a mapped drive, a UNC share, and a OneDrive placeholder each resolve differently from the path the user picked, and `Desktop/main.ts:262-266` already records the same concern for iCloud-relocated `~/Documents`. What would need to hold: containment resolves consistently, and the path shown in Open Recent stays the one the user chose.
- **mtime Round-Trip:** `Desktop/Platform/nodeMachine.ts:52` calls `utimes` with a float seconds value, `Core/Files/atomicWrite.ts:14-23` uses it to restore a page's stamp, `Desktop/Store/ddl.ts:41` stores `mtime_ms` as `REAL`, and `Core/Index/indexSeed.ts:145` gates a re-read on strict equality of that value and the size. APFS and NTFS keep different resolutions, so whether the restored stamp reads back identically differs by volume; a mismatch re-indexes the page rather than losing data. What would need to hold: a stamp written and read on the same volume compares equal.
- **Case-Only Rename:** `Core/Nexus/page.ts:69` and `Core/Nexus/folderEntity.ts:36` refuse a rename whose target already exists, so a case-only rename is refused on any case-insensitive volume, NTFS and default APFS alike. The parity is real; the residual is a case-sensitive-formatted volume, where the refusal has nothing behind it. What would need to hold: a case-only retitle either lands or is refused for a stated reason on every volume.

#### Settings Placement

- **Display-Bound Scale:** `Core/Settings/personalization.ts:99,115` model `interfaceScale` and `webZoomFactor` inside `.nexus/settings.json`, and `Desktop/main.ts:158-161` applies both to the host window at launch. A scale chosen for one machine's display follows the folder to another. What would need to hold: a value that describes a display sits where a display's own machine reads it.
- **Per-Machine Rows in the Nexus:** `Core/Platform/localState.ts:4-19` names fourteen `local_state` scopes — window geometry, tabs, folds, embed heights among them — and `Desktop/Store/open.ts:25-27` opens their database at `<root>/.nexus/nexus.db`. Nothing excludes that file from a folder transport, and window geometry read on a different display size is not meaningful. What would need to hold: per-machine state is reachable only by the machine it describes.

#### Build & Packaging

- **No Windows Target:** `Desktop/electron-builder.yml:23-26` declares a `mac` block alone, with no `win` target, icon set, or installer configuration; `:22` sets `resetAdHocDarwinSignature`, which names a macOS concern. `npm run package` therefore produces nothing for Windows. What would need to hold: the package script yields a runnable artifact on both hosts.
- **POSIX-Only Test Assumptions:** thirteen test files call `chmod` or `symlink` to stage failure cases — among them `Core/Nexus/mutate.test.ts:4,644`, `Core/Files/pageFile.test.ts:203`, `Core/Trash/spend.test.ts:737-751`, `Desktop/Store/sessionDb.test.ts:33`. Windows ignores POSIX mode bits and gates symlink creation on a privilege, so those cases behave differently under a gate `npm run test` is expected to keep green. What would need to hold: the test gate reports the same result on both hosts.
- **Launch Recipe:** `Desktop/main.ts:69-71` reads `POMMORA_DEBUG_PORT`, and the documented launch line prefixes `env -u ELECTRON_RUN_AS_NODE`, which PowerShell and `cmd` do not provide. What would need to hold: a developer can start the app with debugging armed on either host.

### Checklist

- [ ] `Core/Nexus/session.ts:10-14` with `Core/Paths/pathSafety.ts:29-31` — the session root stops re-nativizing through `realpath`, so `resolveUnderRoot` resolves rather than refusing every page, mutation, and asset request.
- [ ] `node_modules/chokidar/index.js:713,202` — the watcher's emitted path and the path Core reasons about agree, given chokidar composes with `node:path` and unix-normalizes only its string ignore patterns.
- [ ] `Core/Nexus/watchSettle.ts:25-49` — `ignoredUnder` recognizes the paths chokidar emits, so `.trash`, `.db` siblings, dotfiles, and excluded folders stay filtered.
- [ ] `Core/Files/writeEcho.ts:6-30` — a write's recorded key matches its own watcher echo, including the ancestor walk.
- [ ] `Desktop/main.ts:170-171` — the window carries close, minimize, and maximize controls on Windows.
- [ ] `UIX/Interactions/chords.ts:44-53` with `Core/Actions/commands.ts:48-49` — menu, renderer, and editor resolve `cmd` to the same physical key, across the fourteen `metaKey` reads.
- [ ] `Desktop/Platform/nodeMachine.ts:30-31,50-51` — a write, rename, or remove contending with an external file holder resolves to a stated outcome.
- [ ] `Core/Paths/pathSafety.ts:6-14` with `Core/Paths/posix.ts:1` — the lexical containment guard recognizes each host's absolute and UNC forms, holding independently of the realpath comparison.
- [ ] `Desktop/Bridge/preload.ts:25` and `Desktop/Platform/nodeMachine.ts:53` — every route a host path takes into Core converges on one spelling, alongside `Desktop/main.ts:142,151,220,228,312`.
- [ ] `Core/Paths/posix.ts:3-17` — segment arithmetic agrees with the host on separators and drive prefixes.
- [~] `Core/Contexts/contexts.ts:33-43` with `Core/Paths/names.ts` — name refusal covers the Windows-reserved characters and device names on a Windows host; a name created on macOS still travels unrefused.
- [x] `Core/Nexus/page.ts:35-36` and `Core/Nexus/folderEntity.ts:18-19` — the leaf written to disk matches the name recorded, trailing dots and spaces included.
- [~] `Core/Paths/nexusPaths.ts:39-42` — Context and Space titles carry the directory name-rules through `nameError`; the cross-host residual matches the name-refusal item above.
- [ ] `Desktop/main.ts:67` with `Core/Nexus/handlers.ts:95-96` — a delete on a volume without a system trash has a stated outcome.
- [ ] `Desktop/electron-builder.yml:23-26` — `npm run package` produces a runnable Windows artifact.
- [ ] `Desktop/Platform/nodeMachine.ts:53` with `Core/Paths/pathSafety.ts:24-25` — junctions, mapped drives, UNC shares, and OneDrive placeholders resolve consistently.
- [ ] `Core/Trash/bundle.ts:19-31` — a delete that succeeds on the corpus succeeds into the trash mirror at Windows path lengths.
- [ ] `Desktop/main.ts:233-234,267` — reveal, external open, and recent-document registration accept the path shape Core hands them.
- [ ] `Desktop/Platform/fileLock.ts:5,10` — one file resolves to one lock key from every caller.
- [ ] `Core/Nexus/watchSettle.ts:19-22` with `Desktop/FileWatch/watcher.ts:49` — `isNavPath` reads the same path shape the watcher emits.
- [ ] `Core/Settings/personalization.ts:99,115` with `Desktop/main.ts:158-161` — display-bound scale values are read by the machine they describe.
- [ ] `Core/Platform/localState.ts:4-19` with `Desktop/Store/open.ts:25-27` — per-machine rows are reachable only by their own machine.
- [ ] `Desktop/Store/ddl.ts:41`, `Core/Index/indexSeed.ts:145`, `Desktop/Platform/nodeMachine.ts:52` — a restored mtime reads back equal on NTFS as it does on APFS.
- [ ] Thirteen test files calling `chmod`/`symlink` — the `npm run test` gate reports the same result on both hosts.
- [ ] `Desktop/Actions/appMenu.ts:53,114` and `Desktop/Actions/editorMenu.ts:78-79` — every menu group has a Windows counterpart or is absent there.
- [ ] `Desktop/Store/open.ts:26-27`, `Desktop/Store/versionsDb.ts:52-54`, `Desktop/Capture/thumbnails.ts:48,82-83`, `Desktop/Config/appConfig.ts:20` — a path used as a key is built the way the path handed to `fs` is.
- [ ] `Core/Actions/commands.ts:4-28` — a chord stored in `settings.json` means the same gesture on whichever host reads it.
- [ ] `Desktop/Config/appConfig.ts:69-74` — the deleted-nexus test names each host's trash convention.
- [ ] `Core/Paths/nexusPaths.ts:24,30` — a derived thumbnail filename carries no character NTFS refuses.
- [ ] `Desktop/main.ts:295,74` — concurrent writers against one Nexus coordinate beyond the per-userData lock.
- [ ] `Desktop/Actions/editorMenu.ts:150` — the Heading group reads as exclusive on Windows.
- [ ] `Desktop/Actions/appMenu.ts:74` — the reveal command names the host's own file manager.
- [ ] `Core/Interface/Toolbar/toolbar.css:27` — reserved control room sits where the host's controls sit.
- [ ] `Desktop/main.ts:318` and `Desktop/Actions/appMenu.ts:161` — Help ▸ About resolves on Windows under Electron 42.
- [ ] `Core/Nexus/page.ts:69`, `Core/Nexus/folderEntity.ts:36` — a case-only retitle lands or is refused for a stated reason on every volume.
- [ ] `UIX/Theme/typography.css.ts:6` — the monospace stack names a face Windows ships.
- [ ] `Desktop/main.ts:69-71` — the debug-armed launch works from PowerShell and `cmd`.

### Already Cross-Platform

- **Case Folding:** `Core/Paths/caseFold.ts:1-13` pins its locale rather than reading the host's, so `foldKey` and `compareTitles` land the same on a Turkish Windows machine as on macOS.
- **ULID Case Sensitivity:** `Core/Nexus/ids.ts:33-36` keeps ULID validation case-sensitive on purpose, and `:11-13` floors the sub-millisecond float `stat` reports so `idAt` accepts a stamp from either filesystem.
- **Nexus-Relative Index Keys:** `Desktop/Store/ddl.ts:19-43` keys `mentions`, `page_values`, `memberships`, and `indexed_files` on a `path` column fed by `Core/Index/indexSeed.ts:77-83`, which relativizes against the root and rejoins on `/`. Nothing absolute and nothing host-shaped enters those rows.
- **Bare Navigation Ids:** `Core/Navigation/navRef.ts:16-22` carries a kind and an id, nothing path-shaped, so tabs, recents, and history hold nothing filesystem-shaped.
- **Nexus-Relative Settings:** `Core/Settings/settings.ts:135-152` stores `excluded_folders` as `/`-joined relative segments and `Core/Paths/paths.ts:48-49` resolves `asset_directory` the same way, so neither carries an absolute path into the folder.
- **Absolute Paths Stay Outside:** `Desktop/Config/appConfig.ts:1,9-15` puts `lastNexusPath` and `recents` — the only stored absolute paths — in the host's userData directory rather than in the Nexus. Because those values pass through `posixPath` on the way in (`Desktop/main.ts:151,263-266,312`), the `/`-split in `isTrashedPath` (`:70`) reads them correctly.
- **Trash Stamp:** `Core/Trash/bundle.ts:19` replaces colons and dots in the ISO stamp before it becomes a filename, so a bundle name is already NTFS-legal.
- **Asset Containment and URLs:** `Core/Assets/assetRoots.ts:16` rejects a backslash and a leading slash outright, and `Core/Platform/assetScheme.ts:3-4` builds `nexus-asset://nexus/<rel>` from nexus-relative segments, so no drive letter or host separator reaches the URL.
- **Renderer Protocol:** `Desktop/main.ts:99-116` composes the bundle path with Node's `join` and gates traversal on `startsWith(rendererRoot + sep)`, using the native separator on both sides.
- **Host Facts Stay Out of the Contract:** `Core/Contract/handlers.ts:15-42` declares that every path handed in is forward-slash and carries no platform name, machine name, or device id; `systemAccent` (`Desktop/main.ts:238-245`) is the single host fact, guarded, and `getAccentColor` answers on Windows as it does on macOS.
- **Theme Source:** `Desktop/main.ts:317` pins `nativeTheme.themeSource`, and the design kit paints its own surfaces — no `backdrop-filter` and no window vibrancy option — so the glass recipes carry across hosts unchanged.
- **Editor Keymap:** `Core/Actions/commands.ts:51` emits CodeMirror's `Mod-` prefix, which resolves to Command on macOS and Control elsewhere without a per-host branch.
