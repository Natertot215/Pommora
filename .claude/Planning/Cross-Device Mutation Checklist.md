## Cross-Device Mutation Checklist

The enumeration of every mutation whose on-disk effect is expected to reach a second instance holding the same Nexus id. Derived from the write path as it stands on 09-11-2026, it is the test plan the sync arc's content phase executes; the Sync Groundwork arc ships identity alone, so nothing here is measured yet.

### Frame

**What Travels:** decision B-1 of [[Sync Groundwork — Decision Log]] — every entry the watcher would watch, plus `.trash` at the top level, minus any name matching `.db`, `-wal`, or `-shm`. `Core/Paths/exclusion.ts` `neverWatched` is the watcher's half: `.trash`, `node_modules`, database files, and every dot-entry except `.nexus` are dropped. Everything under `.nexus/` therefore travels, thumbnails and journals included.

**Two Instances:** the second-instance recipe is in `.claude/Guidelines/Development-Environment.md` — `POMMORA_USERDATA` at a scratch directory with its own `pommora.json`, `POMMORA_DEBUG_PORT` to arm CDP, and one instance per userData because the single-instance lock lives there. Instance A holds the Nexus; instance B holds a copy carrying the same `.nexus/nexus.json` id.

**Taking A Measurement:** perform the mutation on A and record the wall-clock moment the reply returns. On B, record the moment the file lands on disk, then the moment the tree row or the rendered surface reflects it; the two are separate readings, because a file can arrive before the watcher's patch reaches the interface. The delta is the second reading minus the first. For a fan-out mutation the first reading is taken at the last file landing, not the first.

**Reading The Tables:** **Writer** names the file and the function that performs the write. **On-Disk Effect** names the file that changes and the key inside it. **Expected On B** describes the settled state after propagation, not the mechanism that gets it there.

### Content Tables

#### Page Body

| Mutation                           | Writer                                                                                     | On-Disk Effect                                                          | Expected On B                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type in a page's editor            | `Core/Pages/handlers.ts` `page:updateBody` → `Core/Pages/fileHistory.ts` `writeBody`       | `<Collection>/<Page>.md`, the bytes after the closing frontmatter fence | The file carries the new body; a closed tab opens on it                                                                                          |
| Restore a File History snapshot    | `Core/Pages/handlers.ts` `history:restore` → `Core/Pages/fileHistory.ts` `restoreSnapshot` | The same file, body replaced from A's local snapshot store              | The restored body lands; the snapshot it came from does not                                                                                      |
| Edit a page open on both instances | as above                                                                                   | The same file, last writer's bytes                                      | Most recent wins at the byte level; an editor already holding the old text is the open concurrency item (Topic 2 of [[Codebase Audit — Report]]) |

#### Page Frontmatter Values

Every typed value is written by `Core/Properties/setProperty.ts` `setPropertyOp` → `Core/Nexus/page.ts` `updatePageProperty`, which merges through `Core/Files/pageFile.ts` `mergeFrontmatter` and lands a bare `<Property Name>:` key in the page's YAML. Each row below exercises one entry of the `propertyType` union in `Core/Properties/properties.ts`.

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Set a `number` value | `setPropertyOp` | The page's frontmatter, a numeric scalar under the property's name | The value renders in every view column bound to that property |
| Set a `checkbox` value | `setPropertyOp` | The page's frontmatter, a boolean scalar | The checkbox reads checked |
| Set a `datetime` value | `setPropertyOp` | The page's frontmatter, an ISO date string | The date renders in B's own date format setting |
| Set a `select` value | `setPropertyOp`, then `Core/Properties/optionOps.ts` `applyAdoptions` for a value the definition did not hold | The page's frontmatter, plus `.nexus/properties.json` when the option is newly adopted | Both the value and the adopted option are present |
| Set a `multi_select` value | `setPropertyOp` | The page's frontmatter, a YAML sequence | Every selected option renders |
| Set a `status` value | `setPropertyOp` | The page's frontmatter, the option's value string | The status renders in its group's color |
| Set a `url` value | `setPropertyOp` | The page's frontmatter, the address string | The link renders under the definition's `link_display` |
| Set a `file` value | `setPropertyOp` with `Core/Assets/adoptFile.ts` `adoptFile` for a file from outside | The page's frontmatter holds the connection text; the adopted bytes land under the property's `file_directory` beneath the asset root | The reference resolves against B's copy of the asset file |
| Set a `context` value | `Core/Nexus/mutate.ts` `setContext` → `Core/Contexts/contextWrite.ts` `setContextOnPath` | The page's frontmatter, a bare `<Context Title>:` key holding Space titles | The page appears under those Spaces on B |
| Set a page icon | `Core/Pages/setIcon.ts` `setIconOp` | The page's frontmatter, `icon` | The icon renders in the tree and the page heading |
| Set a page banner | `Core/Pages/setBanner.ts` `setBannerOp` | The page's frontmatter, `banner`; the adopted image lands under the asset root | The banner renders from B's copy of the image |
| Read a `created_time` or `last_edited_time` value | No writer; derived at read time | None | Each instance derives its own; a divergence here is a filesystem-timestamp difference, not a sync gap |

#### Page Lifecycle

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Create a page | `Core/Nexus/create.ts` `createPageOp` → `Core/Nexus/page.ts` `createPage` | A new `<Name>.md` carrying one `ID` key, the ULID marked `page`; the parent's `page_order` in `_pagecollection.json` or `_pageset.json` when an order was supplied | The page appears in the tree at its ordered position |
| Rename a page | `Core/Nexus/rename.ts` `renameOp` → `Core/Nexus/page.ts` `renamePage`, `Core/Nexus/cascade.ts` `renameCascade`, `Core/Tiles/tilesFile.ts` `rewriteTileConnections` | The file is renamed; every page whose body holds a `[[Title]]` connection is rewritten, and every tile Markdown body with it | The new filename and every rewritten connection land; the delta is taken at the last rewritten file |
| Move a page to another Collection or Set | `Core/Nexus/move.ts` `movePageOp` → `Core/Nexus/page.ts` `movePage` | The file moves; the destination's `page_order` is rewritten | The page sits under its new parent, ordered |
| Delete a page | `Core/Trash/delete.ts` `deleteOp` | The file moves into `.trash/<chain>/<stamp>.deleted/` beside a `_record.json` | See the Trash table |
| Restore a page | `Core/Nexus/mutate.ts` `restore` → `Core/Trash/spend.ts` `restoreArtifact` | The artifact moves back to the directory the record names | The page is back in the tree at its recorded parent |

#### Collections And Sets

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Create a Collection or Set | `Core/Nexus/create.ts` `createContainerOp` → `Core/Nexus/folderEntity.ts` `createFolderEntity` | A new folder holding `_pagecollection.json` or `_pageset.json` with `id` and one default `views` entry | The container appears in the tree with its default view |
| Rename a Collection or Set | `Core/Nexus/rename.ts` `renameOp` → `Core/Nexus/folderEntity.ts` `renameFolderEntity` | The folder is renamed; the sidecar's `id` is unchanged | The new name renders; every reference by id still resolves |
| Move a Set | `Core/Nexus/move.ts` `moveSetOp` → `Core/Nexus/folderEntity.ts` `moveFolderEntity` | The folder moves; the destination's `set_order` is rewritten | The Set sits under its new parent, ordered |
| Delete a Collection or Set | `Core/Trash/delete.ts` `deleteOp` | The folder moves into a `.deleted` bundle beside its `_record.json` | See the Trash table |
| Reorder children | `Core/Nexus/reorder.ts` `setChildOrder` | `page_order` or `set_order` on the parent's sidecar | The order matches |
| Reorder top-level Collections | `Core/Nexus/reorder.ts` `setStateOrder` | `.nexus/state.json`, `collection_order` | The sidebar order matches |
| Lock a container's disclosure | `Core/Pages/setDisclosureLock.ts` `setDisclosureLockOp` | The sidecar's `disclosure_locked` | The container reads locked |
| Set a container's icon or banner | `Core/Pages/setIcon.ts` `setIconOp`, `Core/Pages/setBanner.ts` `setBannerOp` | The sidecar's `icon`, `banner` | Both render |
| Set Open In or the view button | `Core/Views/handlers.ts` `container:configure` → `Core/Views/containerConfig.ts` `setContainerConfig` | The sidecar's `open_in`, `view_button` | The container opens the same way |

#### Schema

A property definition is nexus-wide and lives in `.nexus/properties.json`; a Collection's `properties` array is the assignment list of the ids it validates.

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Add a property to a Collection | `Core/Properties/handlers.ts` `schema:add` → `Core/Properties/registryProperty.ts` `createProperty` and `Core/Properties/assignment.ts` `assignProperty` | A new def in `.nexus/properties.json`; its id appended to the sidecar's `properties` | The column appears in the Collection's views |
| Rename a property | `Core/Properties/handlers.ts` `schema:rename` → `Core/Properties/registryProperty.ts` `editProperty` → `renameSweep` | The def's `name`; every holding page's frontmatter key rewritten; `.nexus/property-cascade.json` written before the commit and cleared after | Every page carries the new key and the journal file is gone; the delta is taken at the last rewritten page |
| Remove a property from a Collection | `Core/Properties/handlers.ts` `schema:delete` → `Core/Properties/removeProperty.ts` `removeProperty` | The id leaves the sidecar's `properties`; the def stays in the registry | The column leaves that Collection's views and no other |
| Delete a property nexus-wide | `Core/Properties/handlers.ts` `property:delete` → `Core/Properties/deleteProperty.ts` `deleteProperty` → `unassignAndPurge` | The def leaves `.nexus/properties.json`; the key is stripped from every holding page; a `property` bundle lands in `.trash` | The property is gone everywhere and its bundle is restorable |
| Retype a property | `Core/Properties/handlers.ts` `property:setOptions`, `property:setStatusGroups`, `property:setNumberFormat`, `property:setLinkConfig`, `property:setFileDirectory`, `property:setCheckboxColor`, `property:setIcon` → `Core/Properties/registryProperty.ts` `editProperty` | The def's type-shaped keys in `.nexus/properties.json`; page values are unchanged | Values render under the new configuration |
| Rename or remove a select or status option | `Core/Properties/optionOps.ts` `renameOption`, `removeOption`, `renameStatusOption`, `removeStatusOption` | The def's `select_options` or `status_groups`, and every holding page's value | Both the definition and every page value agree |
| Reorder the registry or a Collection's assignment | `Core/Properties/registryProperty.ts` `reorderRegistry`, `Core/Properties/assignment.ts` `reorderAssignment` | `.nexus/properties.json` order, or the sidecar's `properties` order | The column order matches |

#### Saved Views

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Add or edit a saved view | `Core/Views/handlers.ts` `views:save` → `Core/Views/viewsFile.ts` `saveView` | The container sidecar's `views` array, one `SavedView` record | The view appears with its columns, sort, filter, and grouping |
| Rename a saved view | `views:save` with a changed `name` | The record's `name` | The tab label matches |
| Reorder saved views | `Core/Views/handlers.ts` `views:reorder` → `Core/Views/viewsFile.ts` `reorderViews` | The `views` array order | The tab order matches |
| Remove a saved view | `Core/Views/handlers.ts` `views:delete` → `Core/Views/viewsFile.ts` `deleteView` | The record leaves `views`; `active_view` is dropped when it named the removed view | The view is gone and the container opens on a surviving one |
| Select a view | `Core/Pages/setActiveView.ts` `setActiveViewOp` | The container sidecar's `active_view` | The container opens on the same view |
| Drag a row into a manual order | `views:save` → `Core/Views/viewsFile.ts` `saveView` | `manual_order` on the view record inside the sidecar | The row order matches |
| Collapse a group | `views:save` → `saveView` | `collapsed_groups` on the view record | The same groups read collapsed |

#### Contexts

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Add a Context group | `Core/Contexts/contextWrite.ts` `createContextGroup` | A new entry in `.nexus/contexts/contexts.json` and a folder `.nexus/contexts/<Title>/` | The group appears in the Contexts sidebar |
| Rename a Context group | `Core/Contexts/contextCascade.ts` `renameContextOp` | The registry entry's `title`, the folder rename, every holding page's frontmatter key, and `.nexus/context-rename.json` held across the sweep | The new title is everywhere and the journal file is gone |
| Add a Space | `Core/Contexts/contextWrite.ts` `createSpace` | A folder `.nexus/contexts/<Context>/<Space>/` holding `_space.json` with its `id` | The Space appears under its group |
| Rename a Space | `Core/Contexts/contextCascade.ts` `renameSpaceOp` | The folder rename and every holding page's value under the Context key, journaled the same way | Every page's membership follows the new title |
| Remove a Space | `Core/Trash/delete.ts` `deleteOp` with `kind: 'space'` → `Core/Contexts/contextCascade.ts` `unlinkSpaceValue` | The folder moves to `.trash`; the value is stripped from every holding page | The Space is gone and no page names it |
| Assign a page to a Space | `Core/Contexts/contextWrite.ts` `setContextOnPath` | The page's frontmatter, the bare `<Context Title>:` key | The page is listed under that Space |
| Set a Space color | `Core/Contexts/contextWrite.ts` `setSpaceColor` | `_space.json`, `color` | The Space renders in that color |
| Reorder Context groups | `Core/Contexts/reorderContexts.ts` `reorderContextsOp` → `Core/Contexts/contextsRegistry.ts` `mutateRegistryFile` | `.nexus/contexts/contexts.json`, the order of the `contexts` array | The sidebar order matches |
| Reorder Spaces within a group | `Core/Nexus/reorder.ts` `setSpaceOrder` | `.nexus/state.json`, `space_orders.<contextId>` | The sidebar order matches |

#### Tasks And Events

Agenda entities are Markdown files whose kind is marked inside the ULID and validated against the folder's `_taskconfig.json` or `_eventconfig.json`. Agenda's surface is unbuilt, so no in-app creator mints a `task` or `event` id: `Core/Nexus/page.ts` `createPage` mints `page` for every page it writes, and `Core/Nexus/adopt.ts` is the only writer that stamps either agenda kind, resolved from the folder the file already sits in.

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Place a Task or Event file into its folder by hand | `Core/Nexus/adopt.ts` on the next open | A Markdown file whose `ID` carries the `task` or `event` mark, stamped from the file's birth time | The file and its stamped id land; B reads the same kind from the same folder |
| Edit a Task or Event value | `Core/Properties/setProperty.ts` `setPropertyOp` | The file's frontmatter | The value renders |
| Rename, move, or delete either | The Page Lifecycle writers | As the Page Lifecycle table | As the Page Lifecycle table |
| Read the Agenda folder registration | `Core/Nexus/identity.ts` `ensureIdentity` seeds it once | `.nexus/nexus.json`, `agenda_folders` | Both instances resolve the same two folders by id |

#### Tiles And The Homepage

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Add, resize, or rearrange a tile | `Core/Tiles/handlers.ts` `tiles:save` → `Core/Tiles/tileDoc.ts` `writeTileDocAt` | `_tiles.json` in the host directory — `.nexus/homepage/` for the homepage, the Space folder for a Space | The layout matches |
| Create a Markdown tile | `Core/Tiles/tilesFile.ts` `createMarkdownTile` | A `<tileId>.md` in the host directory and its entry in `_tiles.json` | The tile renders with its body |
| Edit a Markdown tile's body | `Core/Tiles/tilesFile.ts` `writeMarkdownTile` | The tile's `.md` | The body matches |
| Remove or duplicate a tile | `Core/Tiles/tilesFile.ts` `removeTile`, `duplicateTile` | `_tiles.json` and the tile's `.md` | The tile set matches |
| Convert a tile to a page or a view | `Core/Tiles/tilesFile.ts` `convertTileToPage`, `convertTileToView` | The tile's entry in `_tiles.json` is rewritten; the source `.md` is dropped on a page conversion | The converted tile renders its target |
| Set the homepage banner or heading icon | `Core/Pages/setBanner.ts` `setBannerOp`, `Core/Pages/setHeadingIconHidden.ts` `setHeadingIconHiddenOp` | `.nexus/homepage/homepage.json`, `banner` and `heading_icon_hidden` | Both render |

#### Assets

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Adopt an image from outside the Nexus | `Core/Assets/handlers.ts` `assets:adopt` → `Core/Assets/adoptFile.ts` `adoptFile` → `Core/Assets/assetWrite.ts` `writeAssetFile` | The bytes land under the asset root, `.nexus/assets/` by default or the `asset_directory` setting's folder | The file is present and every reference to it resolves |
| Adopt an image already inside the asset root | `adoptFile` | No new file; the existing name is reused | Unchanged |
| Delete an asset a banner replaced | `Core/Assets/adoptFile.ts` `dropReplacedAsset` | The superseded file leaves the asset root by the session's trash mode | The file is gone on B once the deletion propagates |
| Set a profile image | `Core/Assets/setProfileImage.ts` `setProfileImageOp` | `.nexus/settings.json`, `profile_image`, and the adopted bytes | The image renders |
| Crop an image | `Core/Assets/setCrop.ts` `setCropOp` → `Core/Settings/settings.ts` `updateCrops` | `.nexus/assets/crops.json`, `byImage.<key>` | The same crop renders |
| Change the asset directory | `Core/Assets/handlers.ts` `assets:setDir` | `.nexus/settings.json`, `asset_directory` | New adoptions land in the same folder; files already on disk keep resolving where they sit |
| Capture a navigation thumbnail | `Core/Navigation/handlers.ts` `capture:thumbnail` → the host's `thumbnails.capture` | `.nexus/assets/<nexusId>/thumbnails/<key>.jpg` | The file lands and is overwritten by B's own capture; the folder is pinned to `.nexus/assets/` regardless of `asset_directory` |

#### Trash

`.trash` travels under B-1 but sits outside the watcher, so the Trash surface re-asks after every action it takes rather than updating live.

| Mutation                          | Writer                                                                                  | On-Disk Effect                                                                                                  | Expected On B                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Delete with the Nexus trash mode  | `Core/Trash/delete.ts` `deleteOp` → `Core/Trash/bundle.ts` `mintBundle`, `settleBundle` | `.trash/<chain>/<stamp>.deleted/` holding `_record.json` and the artifact under its own name                    | The bundle lands; the listing shows it on the next `trash:list`, not live |
| Delete with the system trash mode | `deleteOp` → the host's `trashToSystem`                                                 | The artifact leaves the Nexus; no bundle is written                                                             | The artifact's absence propagates; nothing lands in `.trash`              |
| Delete a Context or a Space       | `deleteOp` with the cascade writers                                                     | The bundle carries the membership evidence the restore replays                                                  | The bundle lands with its evidence intact                                 |
| Restore an artifact               | `Core/Trash/spend.ts` `restoreArtifact`                                                 | The artifact moves to the recorded parent; the bundle directory is removed                                      | The entity is back in the tree and the bundle is gone                     |
| Restore a deleted property        | `Core/Trash/restoreProperty.ts` `restoreProperty`                                       | The def returns to `.nexus/properties.json`, values return to their pages, assignments return to their sidecars | The property and every value are back                                     |
| Empty one bundle                  | `Core/Trash/spend.ts` `emptyBundle`                                                     | The artifact is removed or handed to the system trash; the bundle directory follows                             | Both are gone                                                             |
| Empty the whole Trash             | `emptyBundle` per bundle                                                                | As above, per bundle                                                                                            | `.trash` holds no bundles                                                 |

#### Settings, Navigation, And State

`.nexus/settings.json`, `.nexus/navigation.json`, and `.nexus/state.json` are nexus data and travel.

| Mutation | Writer | On-Disk Effect | Expected On B |
| --- | --- | --- | --- |
| Change any personalization setting | `Core/Settings/handlers.ts` `personalization:set` → `Core/Settings/settings.ts` `writePersonalization` | `.nexus/settings.json`, `personalization.<key>` | The setting reads the same, Interface Scale and Webpage Zoom included, by standing decision |
| Set excluded folders | `Core/Settings/handlers.ts` `exclusions:set` → `Core/Settings/settings.ts` `writeExcludedFolders` | `.nexus/settings.json`, `excluded_folders` | The same folders leave B's tree |
| Rebind a command chord | No writer today; `Core/Settings/codec.ts` `readCommands` reads the key a hand edit supplies | `.nexus/settings.json`, `commands.<id>` | The same chord fires |
| Set the profile icon | `Core/Nexus/mutate.ts` `setProfileIcon` → `Core/Settings/settings.ts` `updateSettings` | `.nexus/settings.json`, `profile_icon` | The icon renders |
| Set the profile subtitle | No writer today; `Core/Settings/codec.ts` reads `profile_subtitle` from a hand edit | `.nexus/settings.json`, `profile_subtitle` | The subtitle renders |
| Set the subfield or nav view modes | `Core/Settings/settings.ts` `writeSubfield`, `writeNavViewModes` | `.nexus/settings.json`, `subfield`, `navViewModes` | Both match |
| Pin or favorite an item | `Core/Navigation/handlers.ts` `nav:write` → `Core/Navigation/navigationFile.ts` `writeNavigationState` | `.nexus/navigation.json`, `pinned`, `favorites`, `banner` | The same items are pinned and favorited; `recents` is per-device and stays behind |
| Rename the Nexus | `Core/Nexus/handlers.ts` `nexus:rename` | The Nexus folder's own name | B's folder name is its own; the `nexus.json` id is what makes the two one Nexus |

### Must Not Travel

Every row here is per-machine state. A value crossing to B is a failure of the what-travels predicate, not a success.

| Store | Reason |
| --- | --- |
| `nexus.db` | The per-machine key-value store; excluded by name through `Core/Paths/exclusion.ts` `STORE_FILE`, and discardable on a schema bump without losing anything authored |
| `nexus.db-wal`, `nexus.db-shm` | SQLite journals of a database that does not travel |
| `versions.db` and its journals | File History snapshots, the only record of an overwritten external edit, per machine by the same rule |
| `local_state` scope `folds` | Which headings a reader collapsed, per machine |
| `local_state` scope `headingCols` | Which table heading columns a reader hid, per machine |
| `local_state` scope `headingIcon` | Whether a page's heading icon is hidden, per machine |
| `local_state` scope `citations` | Whether citations are shown, per machine |
| `local_state` scope `embedHeights` | Per-embed heights a reader dragged, per machine |
| `local_state` scope `embedZooms` | Per-embed zoom a reader set, per machine |
| `local_state` scope `aliases` | Per-page aliases; authored content sitting in the database by decision B-2, a known issue with no action in this arc |
| `local_state` scope `linkTitle` | Fetched web titles, a cache |
| `local_state` scope `tabs` | The open tab set, true of this window on this machine |
| `local_state` scope `windows` | Window bounds, true of this display |
| `local_state` scope `recents` | The recently visited list, true of this machine's reading |
| `local_state` scope `record` | The identity re-minting baseline read and written by `Core/Nexus/remintLedger.ts`, adjudicated from this machine's own history |
| `local_state` scope `glancePane` | The glance pane's size, true of this display |
| `local_state` scope `devicePrefs` | Menu style, pane widths, sidebar folds, and window sizes — `Core/Settings/devicePrefs.ts` states the rule |
| `local_state` scope `sync` | The server address this machine's Nexus is bound to, per device by design |
| `pommora.json` | The app config beside the application, never inside a Nexus; it holds `lastNexusPath`, `recents`, `trashMode`, and the `device` entry |
| `secrets.json` | The device's private key, encrypted by the OS keychain, beside `pommora.json` and never inside a Nexus |

### Identity Checks

What the Sync Groundwork arc proves today, ahead of any content moving. The first row is Task 6.1 of [[Sync Groundwork — Implementation Plan]], driven over CDP against two built instances; the rest are covered by `Desktop/Config/device.test.ts`.

| Check | Evidence |
| --- | --- |
| Two userData directories give two device fingerprints against one Nexus id: connect, pending, approve, revoke, each state surviving a server restart and an app relaunch | Task 6.1, observed; `sync.db` holds two `device` rows and, before the revoke, two `membership` rows for one `nexus_id` |
| A device name set on one instance reaches the bound server | `Core/Sync/handlers.ts` `sync:renameDevice` re-sends `connect` with the new name; `device.test.ts` "persists a rename" covers the config half |
| A deleted secret store re-mints the identity and reports once | `device.test.ts` "re-mints and reports once when the secret store lost the key" |
| A crash between the key write and the config write re-mints rather than stranding a half-identity | `device.test.ts` "re-mints after a crash between the key write and the config write" |
| A keychain that refuses leaves the launch identity-less and the stored identity intact | `Desktop/main.ts` leaves `device` null and `Core/Sync/handlers.ts` answers every channel with the no-device refusal; `device.test.ts` "keeps the identity across a launch the keychain refused" |
| A secret that cannot be decrypted leaves the launch identity-less without destroying the key | `device.test.ts` "keeps the key and the identity across a launch that could not decrypt it" — `secrets.json` is byte-identical afterward and the next launch recovers the same id |
