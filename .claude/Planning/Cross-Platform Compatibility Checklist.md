## Cross-Platform Compatibility Checklist

> **Standing (09-10-2026):** evidence gathered for a later session that will make Pommora run on Windows while macOS keeps working against one Nexus folder. This is a findings record and a checklist, not a plan: it states what the code does today and what would have to hold instead, and it proposes no implementation.

### Sources

- `Core/Paths/` — `caseFold.ts`, `paths.ts`. `Core/Nexus/ids.ts`. `Core/Index/indexSeed.ts`. `Core/Trash/bundle.ts`. `Core/Navigation/navRef.ts`.
- `Core/Platform/` — `assetScheme.ts`, `localState.ts`. `Core/Contract/handlers.ts`.
- `Core/Assets/assetRoots.ts`. `Core/Actions/commands.ts`. `Core/Settings/settings.ts`.
- `Desktop/` — `main.ts`, `Platform/nodeMachine.ts`, `Config/appConfig.ts`, `Store/open.ts`, `Store/ddl.ts`.

### Already Cross-Platform

- **Case Folding:** `Core/Paths/caseFold.ts:1-13` pins its locale rather than reading the host's, so `foldKey` and `compareTitles` land the same on a Turkish Windows machine as on macOS.
- **ULID Case Sensitivity:** `Core/Nexus/ids.ts:33-36` keeps ULID validation case-sensitive on purpose, and `:11-13` floors the sub-millisecond float `stat` reports so `idAt` accepts a stamp from either filesystem.
- **Nexus-Relative Index Keys:** `Desktop/Store/ddl.ts:19-43` keys `mentions`, `page_values`, `memberships`, and `indexed_files` on a `path` column fed by `Core/Index/indexSeed.ts:77-83`, which relativizes against the root and rejoins on `/`. Nothing absolute and nothing host-shaped enters those rows.
- **Per-Machine Rows Stay Home:** `Core/Platform/localState.ts:4-19` keeps window geometry, tabs, folds, and embed heights in `<root>/.nexus/nexus.db`, and `Core/Paths/exclusion.ts:12` keeps every `.db` file and its journals out of what Pommora Sync carries, so each machine reads only its own rows.
- **Bare Navigation Ids:** `Core/Navigation/navRef.ts:16-22` carries a kind and an id, nothing path-shaped, so tabs, recents, and history hold nothing filesystem-shaped.
- **Nexus-Relative Settings:** `Core/Settings/settings.ts:135-152` stores `excluded_folders` as `/`-joined relative segments and `Core/Paths/paths.ts:48-49` resolves `asset_directory` the same way, so neither carries an absolute path into the folder.
- **Absolute Paths Stay Outside:** `Desktop/Config/appConfig.ts:1,9-15` puts `lastNexusPath` and `recents` — the only stored absolute paths — in the host's userData directory rather than in the Nexus. Because those values pass through `posixPath` on the way in (`Desktop/main.ts:150,221,320`), the `/`-split in `isTrashedPath` (`:81`) reads them correctly.
- **Trash Stamp:** `Core/Trash/bundle.ts:19` replaces colons and dots in the ISO stamp before it becomes a filename, so a bundle name is already NTFS-legal.
- **Asset Containment and URLs:** `Core/Assets/assetRoots.ts:16` rejects a backslash and a leading slash outright, and `Core/Platform/assetScheme.ts:3-4` builds `nexus-asset://nexus/<rel>` from nexus-relative segments, so no drive letter or host separator reaches the URL.
- **Renderer Protocol:** `Desktop/main.ts:99-116` composes the bundle path with Node's `join` and gates traversal on `startsWith(rendererRoot + sep)`, using the native separator on both sides.
- **Host Facts Stay Out of the Paths:** `Core/Contract/handlers.ts:15-42` declares that every path handed in is forward-slash and carries no platform name, machine name, or device id; the host facts the Contract does convey — `systemAccent` (`Desktop/main.ts:239-246`) and `platform` (`Desktop/Platform/nodeMachine.ts:76`) — are guarded channels rather than anything woven into a path, `getAccentColor` answering on Windows as it does on macOS and `platform` reporting the host it runs on.
- **Theme Source:** `Desktop/main.ts:325` pins `nativeTheme.themeSource`, and the design kit paints its own surfaces — no `backdrop-filter` and no window vibrancy option — so the glass recipes carry across hosts unchanged.
- **Editor Keymap:** `Core/Actions/commands.ts:51` emits CodeMirror's `Mod-` prefix, which resolves to Command on macOS and Control elsewhere without a per-host branch.
