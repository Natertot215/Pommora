**Ruling:** D-1, 09-07-2026 · **Scope:** two `local_state` scopes, two browser-storage holdouts, and the UIX window size.

#### The Rule

State is placed by what it belongs to, not by what is convenient to write. Anything a person decided about a piece of content or about how a container presents itself is part of that content: it goes into the entity's own Markdown frontmatter, or into its container's JSON sidecar, both of which live under `.nexus/` and travel with the Nexus to every device. Anything true only of the machine in front of the user — window and pane geometry, the operating system's menu style, which tabs a device happens to have open — goes to `nexus.db` through `Core/Platform`, the device-local store, which never syncs and may be discarded on a schema change without losing anything a person authored. Browser `localStorage` holds none of it. Interface Scale and Webpage Zoom are the deliberate exception in the other direction: they stay in `.nexus/settings.json` because the Nexus, not the device, defines how it is meant to be read.

Six page-level scopes stay in `nexus.db` exactly as they are today by ruling, and are outside this plan: `headingIcon`, `aliases`, `citations`, `headingCols`, `embedHeights`, and `embedZooms`.

#### The Placement Table

| Item | Current Home | Ruled Home | On-Disk Key | Reads / Writes Today | Second Device Before → After |
| --- | --- | --- | --- | --- | --- |
| `activeView` | `nexus.db` | Container sidecar | `active_view: <viewId>` | R `Core/Session/nexusSlice.ts:110-112` · W `Core/Session/cacheSlice.ts:55-58` | Opens on the first view → opens on the chosen one |
| `viewOrder` | `nexus.db` | View record in the container sidecar | `manual_order: [<pageId>…]` | R `Core/Views/Host/useViewHost.ts:137` · W `Core/Views/Host/useViewOrders.ts:26-29` | Manual order lost under sort or group → held |
| Pane widths | `localStorage` | `nexus.db` | `devicePrefs` → `panes: { sidebar, inspector }` | R `Core/Session/layoutSlice.ts:37-43` · W `layoutSlice.ts:74-78` | Unchanged (per machine, correctly) |
| Sidebar disclosure | `localStorage` | `nexus.db` | `devicePrefs` → `disclosure: { <key>: bool }` | R+W `Core/Interface/Sidebar/Sidebar.tsx:235-239` | Unchanged (per machine, correctly) |
| Floating-window size | UIX module map | `nexus.db` | `windowGeometry` → key = window kind | R+W `UIX/Windows/window-base.tsx:31,108` | Lost on restart → held per machine |

##### Destination Notes

- **`activeView`:** `active_view` on the container sidecar, beside `views`.
- **`viewOrder`:** `manual_order` inside the view record, not `order`, since `sort[].order` and `group.order` already exist on `SavedView`. It joins `collapsed_groups` in `VIEW_STATE_KEYS` (`Core/Views/views.ts:139-143`), which also means a locked tile can still hold a manual order — the same allowance collapse already has.
- **Floating-window size:** one remembered size per window kind, not per entity — `WindowKind` is `'settings' | 'page' | 'nav' | 'history'`, so every Page window opens at the size the last Page window was left at. The UIX map is keyed by the `id` prop today, whose values are already per-kind constants (`settings`, `page-window`, `navwindow`, `page-history`), so the change is where the value lives rather than what it covers.
- **Window panel width:** not persisted. The session map in `UIX/Windows/window-panel.tsx:14` stands as it is; a panel width lives for the run of the app and no step here stores it.

#### Phases And Steps

**Migration, common to Phase One:** on the first open after the change, once `getLiveTree()` has installed a tree (ids resolve to paths only from there), the retiring scope's rows are read, written into their new file home, and deleted with `writeKey(scope, key, null)` — `Desktop/Store/stores.ts:22-24` deletes on a null value. An empty scope is what "already migrated" means, so no flag is stored. Under most-recent-wins, a second device importing later overwrites the first device's import for any key both machines held. The import writes each affected container sidecar once, which costs one watcher event per container on that first open.

##### Phase One: Container And View Decisions Into The Sidecar

**Step 1, Active View:** `active_view` on `pageCollectionSidecar` and `pageSetSidecar` (`Core/Nexus/schemas.ts:35-55`), written by a mutate op and read by `readNexus` onto the container node. `Core/Session/cacheSlice.ts:55-58` sets it through `mutate`; the startup load at `nexusSlice.ts:109-112` goes. **Migration:** import the `activeView` scope. **Added, not removed:** `remint` must re-point a copied container's `active_view` at the minted view id, alongside the id rewrite it already performs on the copied `views`. **Test:** a sidecar round-trip case in `Core/Views` covering an unknown id falling back to the first view. **Deleted:** the `activeView` re-point in `Core/Nexus/remint.ts:151-153`, the `activeView` name in the `Scope` union (`Core/Platform/localState.ts:4-21`) with its handlers, and the two channels.

**Step 2, Manual Order:** Add `manual_order` to `SavedView` and to `VIEW_STATE_KEYS` / `pickViewState` (`Core/Views/views.ts:91,139-143`). **Write:** every drop site — `Core/Views/Table/TableView.tsx:1048,1067`, `Core/Views/Cards/CardsView.tsx:504,529`, `Core/Views/Host/useViewCreation.ts:125` — calls `persistView({ manual_order }, { viewState: true })`. The two fields stay two fields on purpose: `page_order` is the container's canonical child order, shared with the sidebar and with every other view, while `manual_order` is one view's tiebreaker under a sort or a group, where a drag expresses a preference about that view alone and must not reorder the container for everyone. What retires is the fork in placement — both now travel with the Nexus, and `useViewHost.ts:137` reads one source. **Read:** `resolveManualOrder` takes `liveView.manual_order`. **Migration:** import the `viewOrder` scope into each view record. **Test:** a `useViewHost` case that a reorder under a sort writes the view record and that the unsorted path still writes `page_order`. **Deleted:** `Core/Views/Host/useViewOrders.ts` entirely, the `viewOrders` and `persistViewOrder` props threaded through `useViewHost`, `useViewCreation`, `TableView`, and `CardsView`, the `viewOrder` copy loop in `remint.ts:147-150`, the `viewOrder` name in the `Scope` union with its handlers, and the two channels.

##### Phase Two: Browser Storage Into The Device Store

**Step 3, Pane Widths And Sidebar Disclosure:** Both move into the `devicePrefs` scope under nested `panes` and `disclosure` objects — nested because `packDevicePrefs` (`Core/Settings/devicePrefs.ts:9-12`) drops top-level `false`, and a disclosure map is mostly `false`. **Read:** both are read synchronously at mount today (`layoutSlice.ts:37-43`, `Sidebar.tsx:235`), so the values are pulled in the existing startup `Promise.all` at `nexusSlice.ts:95-116` and seeded into the store before first paint; the components read the store. **Write:** `persistPaneWidths` already fires once on drop (`Core/Interface/App.tsx:59,66`), so it is one IPC per drag, not one per frame; `saveOpen` becomes a `devicePrefs:save` merge. **Behavior change to note:** `pommora.sidebarWidth` is app-global today and becomes per-Nexus. **Test:** a `devicePrefs` case that a nested `false` survives `packDevicePrefs`. **Deleted:** `Core/Interface/Sidebar/disclosureState.ts` entirely and the `localStorage` helpers in `layoutSlice.ts`.

##### Phase Three: Window Size Into The Device Store

**Step 4, UIX Callback Props:** `UIX/Windows/window-base.tsx` loses the `sizes` module map, the `opening` helper, and the `id` prop, whose only reader is that map. It takes `initialSize?: Size` and `onSizeChange?: (s: Size) => void` instead: an absent `initialSize` opens at `bounds.def`, and `onSizeChange` fires from the existing `useResizeFrame` `onChange`. Core supplies both for the four ruled kinds — `Core/Settings/SettingsWindow.tsx:721`, `Core/Interface/Windows/NavWindow.tsx:127`, `PageWindow.tsx:142`, `PageHistoryWindow.tsx:213` — storing them in a new `windowGeometry` scope (`Core/Platform/localState.ts`) keyed by `WindowKind`, behind `windowGeometry:get` / `windowGeometry:set` in `Core/Contract/bridge.ts` and `Core/Interface/handlers.ts`, seeded in the same startup load as Step 3. `WebWindow` and `IterationWindow` pass neither prop and open at their default size every time. **Test:** a UIX case that an absent `initialSize` uses `bounds.def` and that a resize calls back once on drop.

#### What Is Removed

Estimates exclude comments and tests; a step's addition is netted against it.

- **Step 1:** −30 / +18 · **Step 2:** −80 / +15 · **Step 3:** −70 / +30 · **Step 4:** −10 / +30
- **Total:** roughly −190 removed against +93 added, a net reduction near **100 lines**, plus one deleted file each in Steps 2 and 3.

#### Open Question For Nathan

- **File History locality.** `Core/Pages/fileHistory.ts` and `Desktop/Store/versionsDb.ts` keep page snapshots device-local, so a page edited on the laptop has no history on the desktop. Nothing here plans it; it needs a ruling of its own, and the answer is not obvious — versions are content, but they are also bulk that would multiply what syncs.

#### Gates

Run from the repo root, after every phase: `npm run typecheck`, `npm run test`, `npm run lint`. All three phases touch runtime surfaces, so each closes with one smoke launch: `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`.
