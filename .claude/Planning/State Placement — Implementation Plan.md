## State Placement — Implementation Plan

> **Status:** in execution — every task landed; Gates 1–4 carry unticked boxes and the closeout is owed · Spec: the D-1 ruling, 09-07-2026, restated under **The Rule** below · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Two `local_state` scopes, two browser-storage holdouts, and the floating-window size move to the home their content belongs to. At the end, a view a person chose and a manual order they dragged travel with the Nexus to every device, `localStorage` holds nothing, and a floating window reopens at the size it was left at — none of which is true today.

The shape follows one rule, stated below, applied item by item. The alternative weighed was placement by convenience — leaving each value wherever it was cheapest to write, which is how the current split arose — and it was rejected because the split is invisible to the person it costs: a manual order lost on a second device looks like a bug, not a storage decision. Three mechanisms already in the codebase settle how each half lands: `setDisclosureLock` is the precedent for a container-sidecar field written through `mutate` with an optimistic tree patch; `setDevicePref` is the precedent for a machine-local preference read once at open and written whole; and `replaySchemaCascade` in `openNexusSequence` is the precedent for a one-time write during an open, followed by a re-walk. None is invented here.

Bounded to the five items in the placement table. The six page-level scopes the ruling holds in `nexus.db` — `headingIcon`, `aliases`, `citations`, `headingCols`, `embedHeights`, `embedZooms` — are outside this plan, as is the window panel width, whose session map in `UIX/Windows/window-panel.tsx:14` stands unchanged.

#### The Rule

State is placed by what it belongs to, not by what is convenient to write. Anything a person decided about a piece of content or about how a container presents itself is part of that content: it goes into the entity's own Markdown frontmatter, or into its container's JSON sidecar, both of which live under `.nexus/` and travel with the Nexus to every device. Anything true only of the machine in front of the user — window and pane geometry, the operating system's menu style, which tabs a device happens to have open — goes to `nexus.db` through `Core/Platform`, the device-local store, which never syncs and may be discarded on a schema change without losing anything a person authored. Browser `localStorage` holds none of it. Interface Scale and Webpage Zoom are the deliberate exception in the other direction: they stay in `.nexus/settings.json` because the Nexus, not the device, defines how it is meant to be read.

#### The Placement Table

| Item | Current Home | Ruled Home | On-Disk Key | Second Device Before → After |
| --- | --- | --- | --- | --- |
| `activeView` | `nexus.db` | Container sidecar | `active_view: <viewId>` | Opens on the first view → opens on the chosen one |
| `viewOrder` | `nexus.db` | View record in the container sidecar | `manual_order: [<pageId>…]` | Manual order lost under sort or group → held |
| Pane widths | `localStorage` | `nexus.db` | `devicePrefs` → `panes` | Per machine → per machine, per Nexus |
| Sidebar disclosure | `localStorage` | `nexus.db` | `devicePrefs` → `disclosure` | Per machine → per machine, per Nexus |
| Floating-window size | UIX module map | `nexus.db` | `devicePrefs` → `windows`, keyed by window id | Lost on restart → held per machine, per Nexus |

**Requirements**

1. `active_view` is a container-sidecar field, reaching the container node through one hoisted mapper, and written through `mutate` with an optimistic tree patch. A sentinel id is never written.
2. `manual_order` is a field of the view record, resolved and folded through the one `structuralOrder` predicate, written by every drop site through `persistView`, and dropped from a reminted copy whose page ids changed.
3. Pane widths, sidebar disclosure, and window size all live in the `devicePrefs` singleton, seeded into the store before the tree paints and written through `setDevicePref`.
4. UIX holds no window-size module map and takes no `id`; it receives a size and reports a change, keeping the centering and the on-screen clamp it performs today.
5. Every retiring home is imported in the same phase as the reader that consumes it, so nothing a person set is lost and no gesture writes to a home nothing reads.
6. Once the imports are confirmed against the real Nexus, they and the two scopes they read are deleted; `localStorage` holds no Pommora key.

**Acceptance — the whole thing working:** On the real Nexus, choose a non-first view in a collection and drag a row under a sort; quit; reopen — both hold. Inspect that collection's sidecar and read `active_view` and the view's `manual_order` as plain JSON. Resize the sidebar and a Page window, collapse a sidebar group, quit, reopen — all three hold. `localStorage` is empty of `pommora.*`, and `local_state` holds no `activeView` or `viewOrder` row.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `serializeOnFile` rejects a re-taken key rather than queuing (`Desktop/Platform/fileLock.ts:11-19`), and `rmwJsonStrict` takes `machine().lock(absPath)` itself (`Core/Files/atomicWrite.ts:82`) on the same key `withSidecarLock` uses (`Core/Files/sidecar.ts:12`) → a sidecar write uses `rmwJsonStrict` alone, or `withSidecarLock` with `readJsonStrict`/`writeJson` inside — never both. → Tasks 1, 2, 4.
- `liveView`'s `useMemo` is at `useViewHost.ts:109`; `sortKeys`, `groupPropId`, and `structuralOrder` are derived from it at `:120-136` → folding `manual_order` into `liveView` under `structuralOrder` requires that predicate to be hoisted above the memo, which is sound because `bandPatch` (`Bands/useBandOrdering.ts:9-35`) touches only `group.order` and `group_order`, moving neither `resolvedSortCount` nor `group.kind`. → Task 3.
- `resolveOrder(sets, asStringArray(meta.set_order))` needs the freshly-read children, and `readNexus` and `watchPatch` pass different ones (`readNexus.ts:201,241` vs `watchPatch.ts:318-319`) → a hoisted mapper takes the children as arguments; a `meta`-only signature cannot cover the two order keys. → Task 1.
- `treeIndex.ts` resolves icons through `@pommora/uix/Symbols` and `NavTrail`, both `.tsx`, so `nodesOf` is renderer-side: an engine-side import of it fails `tsc -p Desktop/tsconfig.node.json` → the container-id lookup and the view-id map both come from the live tree's own container nodes, visited as `collectionFolders` visits them (`Core/Properties/assignment.ts:101-111`). → Tasks 2, 4.
- `container:configure` is a plain `host().ask` with no optimistic tree patch; `setDisclosureLock` is a `mutate` op with one at `nexusSlice.ts:217` → `active_view` rides the mutate rail, so a view switch stays instant. → Task 1.
- `pickView` (`Core/Views/Pipeline/pickView.ts:25`) resolves `active ?? views[0]`, and after a sentinel adoption the adopted view *is* `views[0]` — while before the confirming push `source.views` is still `[]`, so the old slice write helped nobody either → the adoption writes nothing. → Task 1.
- `ViewFrame`'s `rows` falls back to `[mintDefaultView(schema)]` when a container has no views (`Settings/ViewFrame.tsx:77`), and `switchTo` writes whatever row is clicked → the sentinel `view_default` would land in a user-legible sidecar; the write is refused at that call site. → Task 1.
- `nexus:state` (`Core/Nexus/handlers.ts:102-111`) is a pure read, and the hard rule is that the read path is read-only by construction → the imports belong in `openNexusSequence`, beside `if (await replaySchemaCascade(root)) await refreshAfterWrite(root)` (`handlers.ts:70`), which swallows every error internally and returns a boolean (`Properties/replaySchemaCascade.ts:17-27`) — a throw there reaches `Desktop/main.ts:303-308` as "Restore skipped" or aborts `ctx.adopted` so the watcher never arms. → Tasks 2, 4.
- The watcher is armed *after* `openNexusSequence` on both paths (`Desktop/main.ts:319`, `handlers.ts:251`), and `runOpenLedger` calls `seedLiveTree` before returning → an import inside the sequence races nothing and always has a live tree. → Tasks 2, 4.
- `useResizeFrame`'s `onChange` is `(next, phase)` and fires per pointer move, and `onDrop` fires whenever any rect key moved — which a `move` grip always does (`ResizeFrame.tsx:119-133`) → a drop is not proof the size changed; the write compares against what is stored. → Task 7.
- `opening` (`window-base.tsx:29-37`) performs the map lookup, the centering, *and* the `onScreen` viewport clamp → only the lookup goes; a stored size from a larger display must still land on screen. → Task 7.
- `packDevicePrefs` (`devicePrefs.ts:10`) drops a top-level `false` but never a truthy object, and `devicePrefs:load`/`save` already carry an arbitrary object → panes, disclosure, and window sizes are nested keys on the existing rail, not a new scope or channel. → Tasks 5, 6, 7.
- `devicePrefs:load` returns `NO_NEXUS` without a session root, and `local_state` is a table in the Nexus's own `nexus.db` → every device-local item here is per machine *per Nexus*, so `resetLayout` must return the pane widths to their defaults on a Nexus switch, which it does not do today (`layoutSlice.ts:47-51,103`). → Tasks 5, 6.
- `resetNexusSession` clears `devicePrefsLoaded` (`nexusSlice.ts:44`) and runs at `applyTree:144`, ahead of the flag check → the foreign-tree re-fetch already works; only the block's position relative to `set({ status: 'ready' })` needs to change. → Task 5.
- `ddl.ts:1` — a `nexus.db` version mismatch drops the file rather than migrating → the imports need no version flag; an empty scope is what "already imported" means. → Tasks 2, 4.
- `remintSidecar` (`remint.ts:102-115`) rewrites `views[].id` inside the sidecar lock while the pages inside the copy are separately reminted to new ids → `active_view` is re-pointed there, and `manual_order` is *dropped* there: its page ids are known to be changing in the same pass. → Tasks 2, 4.

**Inherited Reasoning**

- Pane widths were placed in `localStorage` to avoid an IPC round trip per drag frame (`layoutSlice.ts:31`). The reason no longer holds: `App.tsx:59,66` gates the persist on `phase === 'drop'`, so it is one write per drag either way.
- `page_order` and `manual_order` stay two fields on purpose. `page_order` is the container's canonical child order, shared with the sidebar and every other view; `manual_order` is one view's tiebreaker under a sort or a group, where a drag expresses a preference about that view alone and must not reorder the container for everyone. What retires is the fork in *placement*, not the fork in meaning.
- One remembered size per window kind, not per entity: the `id` values are already per-kind constants, so the change is where the value lives rather than what it covers. The iteration window is a development scratchpad and keeps no size.
- A cold start now paints the sidebar at its default width during `status === 'loading'` and settles when the tree lands. Ratified over holding the first paint blank.
- Pane widths and the sidebar's folds are imported across like everything else. `disclosureState.ts:1` calls them "regeneratable," which is a statement about where they may live, not a licence to discard them: a fold map is a shape the user built over every group in the Nexus, and rebuilding it by hand is not a cost the move gets to impose.
- One accepted loss, small and named: `useViewOrders`' local echo is keyed on `containerPath` and survives a tree push; its replacement, `manualOverride`, is cleared on every `source` identity change (`useViewHost.ts:99-101`). So a rename or move inside the same container, landing between a drag and the view save's confirming push, shows the stale order for one push. The echo is not worth a second holder of the same array.
- The two imports are not bundled into one pass. Bundling saves one sidecar write per container, but the watcher is not armed during the open (`Desktop/main.ts:319`), so the saved event was never real — and it would land `manual_order` a whole phase before anything reads it.

**Grounding** *(re-open these; don't cite them)*

- `Core/Platform/localState.ts` — the `Scope` union, and `writeKey(scope, key, null)` as the delete.
- `Desktop/Platform/fileLock.ts` · `Core/Files/atomicWrite.ts:74-95` · `Core/Files/sidecar.ts:7-13` — what may and may not nest.
- `Core/Nexus/schemas.ts:36-55` · `Core/Nexus/readNexus.ts:186-250` · `Core/Nexus/watchPatch.ts:310-340` · `Core/Nexus/treePatch.ts:52-110,477-485` · `Core/Nexus/tree.ts:45-62` — every place a container sidecar field is named today.
- `Core/Pages/setDisclosureLock.ts` · `Core/Nexus/mutatePatch.ts:128` · `Core/Session/nexusSlice.ts:217` — the mutate rail Task 1 rides.
- `Core/Views/Pipeline/pickView.ts:17-26` · `Core/Views/Host/useActiveView.ts` · `Core/Views/Host/viewMint.ts` · `Core/Views/Settings/ViewFrame.tsx:60-85` · `Core/Session/store.ts:46-47` — the active-view readers, the sentinel adoption, and the one `setActiveView` call site.
- `Core/Views/views.ts:80-114,139-144,200-239` · `Core/Views/Host/useViewHost.ts:99-144,226-239` · `Core/Views/Bands/useBandOrdering.ts:9-35` · `Core/Views/Pipeline/sort.ts:180-188` — the view record, the fold, the resolver.
- `Core/Views/Host/useViewOrders.ts` · `Core/Views/Host/useViewCreation.ts:37-38,47,114-126` · `Core/Views/Table/TableView.tsx:1038-1069` · `Core/Views/Cards/CardsView.tsx:490-532` — the write sites and their existing conditions.
- `Core/Session/layoutSlice.ts` · `Core/Interface/Sidebar/disclosureState.ts` · `Core/Interface/Sidebar/Sidebar.tsx:234-240` · `Core/Interface/App.tsx:36-67` — the browser-storage holdouts.
- `Core/Session/configSlice.ts:54-58` · `Core/Settings/devicePrefs.ts` · `Core/Session/nexusSlice.ts:38-52,141-171` — the device-preference rail.
- `UIX/Windows/window-base.tsx:24-37,98-111` · `UIX/Interactions/ResizeFrame.tsx:24-34,119-133` — the module map, the centering, and the phase-carrying callback.
- `Core/Nexus/handlers.ts:43-111` · `Desktop/main.ts:249-264,303-320` · `Core/Properties/replaySchemaCascade.ts:17-27` · `Core/Nexus/treeIndex.ts:100-145` · `Core/Nexus/remint.ts:50-164` — the open sequence, its two callers, the failure contract, the lookup, and remint.
- `.claude/Guidelines/` — read before planning in this domain.

**Environment**

- Plan directory `.claude/Planning`. Spec input: the D-1 ruling, restated above; no separate decision log exists.
- Explorer, research, code-review, attack, verifier, and simplification slots all resolve to background Opus agents dispatched with a named return format — this project designates no per-role agent, and the fallback is taken deliberately. Gate commands read from `package.json`.
- Rules directory `.claude/Guidelines`.

**Shapes:** refactor · migration · removal · user-visible

**Declared Stops**

- **Phase 5** — the residue deletions destroy the only path that recovers a pre-move value. They cannot run until the user has opened the real Nexus and confirmed all four came across: a chosen view, a dragged order, the pane widths, and the sidebar's folds.

**Global Constraints (every task inherits these):**

- Gates from the repo root, exit codes read directly, never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`.
- **Every count in this plan is a line count from `rg -n`, re-derived at execution.** `-F` is a fixed-string flag: a pattern containing `|` under `-F` matches the literal pipe and silently returns nothing. Never pair them.
- Formatting is Biome's — single-quote, no semicolons, a PostToolUse hook formats every TS/CSS/JSON write. Never hand-align; an Edit failing on whitespace means Biome reformatted, so re-read and retry.
- Comments are `//` line comments and reserved for a why the code can't carry. A comment that goes false is rewritten in the commit that falsifies it, never amended.
- Never nest two takes of one file lock. `rmwJsonStrict` and `withSidecarLock` both take `machine().lock` on the sidecar path; use one.
- Search before writing. A second resolver, cache, or validator means the plan is wrong — log it before proceeding.
- **No code survives that exists only to satisfy a test.** A guard, hook, export, parameter, or branch added to make a criterion checkable, and which nothing in the shipped product reaches, is removed in the final reviews. A test proves what the code does; it does not earn the code a reason to exist.
- Out of scope everywhere: `Showcase/`; the six page-level `nexus.db` scopes the ruling holds; `UIX/Windows/window-panel.tsx`'s width map; `Mobile/` and `Sync/`.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Core/Session/layoutSlice.ts:31` | "Pane widths live in localStorage rather than nexus.db: an IPC round trip per drag frame is what storing them main-side would cost (Nathan's call)." | The widths move to `nexus.db`, and the persist was already once per drop. | 6 |
| `Core/Interface/Sidebar/disclosureState.ts:1` | "Transient UI chrome — regeneratable, not portable content — so it lives in app-level localStorage, not `.nexus/`." | The file is deleted. | 6 |
| `Core/Views/handlers.ts:12` | "View SELECTION is the per-machine activeViews pointer; this is the view DEFINITION." | Selection is a sidecar field, not per-machine. | 1 |
| `Core/Views/Pipeline/pickView.ts:17` | "The per-machine active view if still present…" | The active view is sidecar-borne. | 1 |
| `Core/Views/Pipeline/sort.ts:180` | "the persisted per-machine order applies only when the view is sorted or grouped" | The order is no longer per-machine. | 3 |
| `Core/Views/Host/viewMint.ts:11` | "a sentinel adoption must land in the activeViews slice, and this module stays store-free" | The slice and the adoption's write are both deleted. | 1 |
| `Core/Views/Host/useViewOrders.ts:1` | "`viewOrders` is the per-machine tiebreaker…" | The file is deleted. | 3 |
| `UIX/Windows/window-base.tsx:28` | "A window's size outlives its exit-presence unmount, per window id; it reopens centered." | The map is deleted; the size comes in as a prop, and the centering stays. | 7 |
| `.claude/Features/*` | Every sentence describing `activeView`, `viewOrder`, or a `localStorage` home for pane width or disclosure. | The homes change. Enumerated by Task 8's sweep across `.claude/Features/`. | 8 |

**Dead Vocabulary** *(the closing sweep, run at Task 8 — all `rg -n` line counts)*

- `rg -nF activeViews Core` → expect 0. Today: 28. Legitimate hits: none.
- `rg -nF viewOrders Core` → expect 0. Today: 26. Legitimate hits: none.
- `rg -nF localStorage Core UIX` → expect 0. Today: 8. Legitimate hits: none.
- `rg -n "pommora\." Core` → expect 0.
- Control: `rg -nF devicePrefs Core` → 25 today, and higher after Phase 3. Zero here means the sweep never ran.

**Hazard Window:** Task 2 opens it — from the moment the first import lands until Task 8 deletes them all, the `'activeView'` and `'viewOrder'` names must stay in the `Scope` union, their `local_state` rows must not be cleared by hand, and the three `pommora.*` `localStorage` keys must not be cleared either. An import that has nothing to read is an import that silently succeeds at losing the value. Task 8 closes it.

---

### Phase 1 — Active View on the container sidecar

#### Task 1: One container-node mapper, and `active_view` on the mutate rail

**Requirement:** 1

**Why:** A chosen view is a decision about how a container presents itself, so it belongs in that container's sidecar. Adding another copy of a field that is already spelled out across two mappers and two factories would make the next container field cost the same again; hoisting the mappers first means this one is added once, and the two paths can no longer disagree. With the field on the node, the `activeViews` store slice is a second definition of the same fact and goes.

**Now** — `rg -n 'disclosure_locked|disclosureLocked' Core --glob '!*test*'` → 23. Two mappers building near-identical objects, two factories naming each field twice, and a patch union:

```ts
// Core/Nexus/readNexus.ts:186-206 (set) · :220-249 (collection) · Core/Nexus/watchPatch.ts:310-340
// — the same eight meta keys read three times. Two of them need the freshly-read children,
// and the two paths pass DIFFERENT children, so a meta-only mapper cannot cover them:
sets: resolveOrder(sets, asStringArray(meta.set_order)),      // watchPatch passes node.sets ?? []
pages: resolveOrder(pages, asStringArray(meta.page_order)),   // watchPatch passes node.pages
viewButton: coerceViewButton(meta.view_button),
disclosureLocked: meta.disclosure_locked === true,
// Core/Nexus/treePatch.ts:52-77 makeSetNode · :81-107 makeCollectionNode — arg type and body
// Core/Nexus/treePatch.ts:477-485 patchNodeInTree — the patch union and its body

// The active view, per-machine today: rg -nF activeViews Core --glob '!*test*' → 18
// Core/Contract/bridge.ts:63-64 · Core/Interface/handlers.ts:94-95 — the channel pair
// Core/Session/cacheSlice.ts:54-58 — the slice and its writer · :91 resetCaches · store.ts:47
// Core/Session/nexusSlice.ts:110-112 — seeded in the startup Promise.all
// Readers: Views/Host/useActiveView.ts:14 · Views/Settings/ViewFrame.tsx:67 ·
//   Views/Settings/SettingsFrame.tsx:91 · Views/Host/viewMint.ts:48
```

**Becomes** — one mapper taking its children, one new field, one mutate op, no slice:

```ts
// Core/Nexus/containerFields.ts (new) — the one reader of a container sidecar's meta.
// treePatch.ts:273-291 constructs from a CREATE REQUEST, not from meta, and is left alone.
export function containerFieldsFrom(
  meta: Record<string, unknown>, sets: SetNode[], pages: PageNode[],
): ContainerFields
// Spread into makeSetNode / makeCollectionNode at all three call sites. The factories and the
// patch union still name activeView in their own types — the mapper is where the READ lives.

// Core/Nexus/schemas.ts — on BOTH pageCollectionSidecar and pageSetSidecar
active_view: z.string().optional(),
// Core/Nexus/tree.ts — on BOTH CollectionNode and SetNode
activeView?: string
// An id naming no view in `views` is carried verbatim; pickView already falls back.

// Core/Pages/mutateRequest.ts — beside setDisclosureLock
| { op: 'setActiveView'; path: string; kind: MutableContainerKind; viewId: string }
// Core/Pages/setActiveView.ts (new) — setDisclosureLock.ts's shape EXACTLY: rmwJsonStrict takes
// machine().lock itself, so there is NO withSidecarLock around it.
rmwJsonStrict(sidecarPath(resolved.value, req.kind), (cur) => setOrDrop(cur, 'active_view', req.viewId))
// Core/Nexus/mutatePatch.ts and Core/Session/nexusSlice.ts — beside case 'setDisclosureLock'
case 'setActiveView':
  patched = patchNodeInTree(cur, req.path, { activeView: req.viewId })

// Core/Views/Host/useActiveView.ts — passes source.activeView to pickView; the slice goes.
// Core/Views/Settings/ViewFrame.tsx:82 — switchTo refuses DEFAULT_VIEW_ID: the sentinel is a
// placeholder row for a container with no views, and it must not reach a legible sidecar.
// Core/Views/Host/viewMint.ts — the sentinel adoption writes NOTHING: after the mint the adopted
// view IS views[0], which pickView returns, and before the push source.views is [] so the old
// write reached no reader either. wireViewAdopted, onViewAdopted, the wasSentinel branch, and
// Core/Session/store.ts:46-47 all go with it.
```

**Assumed by:** Task 2 (the import writes `active_view`; remint re-points it).

**Verify — Automated**

- [x] Red first: a `Core/Nexus` round-trip case that a sidecar carrying `active_view` decodes onto the node identically through `readNexus` and through `watchPatch`. Expect 2 failures on an undefined property.
- [x] **The crossing test:** the two mappers agree — the same case asserts all nine container fields match between the paths, `set_order` and `page_order` included, so a future field added to one alone goes red.
- [x] A `useActiveView` case that an unknown `active_view` falls back to `views[0]`, an absent one does the same, and a container with no views yields the sentinel.
- [x] A `ViewFrame` case that clicking the placeholder row on a container with no views issues no mutate. Red with the `DEFAULT_VIEW_ID` refusal removed.
- [x] A `nexusSlice` case that `setActiveView` patches the node before the confirming push. Red with the `patchNodeInTree` case removed.
- [x] A `setActiveView` op case that the write lands and does not reject — the negative control for the lock: wrapping it in `withSidecarLock` makes it throw `Re-entrant file lock`.
- [x] A `viewMint` case that a sentinel adoption issues exactly one channel call, `views:save`.
- [x] Every test mocking `activeViews:get`/`activeViews:set` is updated, not deleted: `rg -lF 'activeViews' Core` → 0.
- [x] `rg -nF activeViews Core` → 0. Control: `rg -nF setDisclosureLock Core` → 10.
- [x] Full gate green. `Scope`'s `'activeView'` name still stands — Task 2 needs it.

#### Task 2: Import the `activeView` scope during the open

**Requirements:** 1, 5

**Why:** The rows already in `local_state` are choices a person made; the move is only complete if they arrive in the new home. It lands in this phase, beside the reader Task 1 just built, so no window exists in which a chosen view is written to a home nothing reads. Remint's device-row copy for the same fact becomes redundant with the sidecar write it already performs.

**Now** — the union name, remint's copy block, and the open sequence's existing one-time-write idiom:

```ts
// Core/Platform/localState.ts:6 — the Scope name, held open by the Hazard Window
// Core/Nexus/remint.ts:151-153 — inside copyDeviceRows
const active = readKey<string>('activeView', target.id)
const moved = active === null ? undefined : viewIds.get(active)
if (moved) writeKey('activeView', fresh, moved)
// Core/Nexus/handlers.ts:70 — the idiom, inside openNexusSequence's root-changed branch.
// replaySchemaCascade swallows every error and returns a boolean; a throw here reaches
// Desktop/main.ts:303-308 as "Restore skipped" on launch, or aborts ctx.adopted on an adopt
// so the watcher never arms.
if (await replaySchemaCascade(root)) await refreshAfterWrite(root)
```

**Becomes** — one import beside that idiom, and remint re-pointing inside the write it already makes:

```ts
// Core/Nexus/importPlacedState.ts (new). Container id → path off the live tree's own
// container nodes, never its own walk. Per container:
//   withSidecarLock(folder, kind, async () => { readJsonStrict; writeJson })
// — remint's shape, NOT rmwJsonStrict, which would re-take the same key.
// Each imported row is then deleted with writeKey('activeView', id, null). An id no container
// claims keeps its row: the container may be excluded, not gone. A container whose write refuses
// keeps its row and is logged; the pass continues. Idempotent — an empty scope is a no-op.
// Returns whether anything landed. It never throws, exactly as replaySchemaCascade does not.
export async function importPlacedState(root: string): Promise<boolean>
// Core/Nexus/handlers.ts — beside the cascade, inside the same root-changed branch:
if (await importPlacedState(root)) await refreshAfterWrite(root)

// Core/Nexus/remint.ts — inside remintSidecar's locked write, after the views[].id rewrite:
if (typeof next.active_view === 'string')
  next.active_view = viewIds.get(next.active_view) ?? undefined
// The copyDeviceRows activeView block goes.
```

**Assumed by:** Task 4 (extends the same import), Task 8 (deletes it and the `Scope` name).

**Verify — Automated**

- [x] Red first: an import case over a two-container tree, each holding an `activeView` row — both values land, both rows are gone after, and a second run writes nothing and returns false. The suite fails to load, module not found.
- [x] **Both halves of the failure contract:** a container whose sidecar write refuses keeps its row and the pass still returns true for the others; and the import resolves rather than throwing when every container refuses. Red with the per-container catch removed.
- [x] The degenerate cases: an empty scope writes nothing and triggers no `refreshAfterWrite`; a container id absent from the tree keeps its row; a nexus opened for the first time, with no `local_state` rows at all, is a no-op.
- [x] The lock key is the canonicalized one: the test root reaches the import through a symlink, and holding the resolved folder's sidecar lock across the pass makes the write refuse. Red without `resolveUnderRoot` — the write lands straight through the held lock.
- [x] The `remint.test.ts` `activeView` cases rewritten to assert `active_view` on the copy's sidecar, naming the minted view id. Red with the re-point line removed.
- [x] `rg -nF "readKey<string>('activeView'" Core` → 0. Control: `rg -nF 'readKey(' Core` → 16.
- [x] Full gate green.

**Verify — User**

- [ ] Open the real Nexus. A collection whose non-first view was selected before this change still opens on it, and its `.collection.json` carries `active_view`.

#### Gate 1 — the chosen view is sidecar-borne

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan. No count command pairs `-F` with `|`.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] The hazard window opened by Task 2 stays open by design; it is not closed here.
- [ ] One smoke launch: `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 2 opens automatically and Task 2's user box carries to Completion Criteria.

---

### Phase 2 — Manual order in the view record

#### Task 3: `manual_order` on the view, written by every drop site

**Requirement:** 2

**Why:** A drag under a sort is a preference about that view, so it belongs in that view's record. The field, the fold, and the write sites land in one task because a repointed resolver with the old writers still in place would persist an order nothing reads.

**Now** — the field set, the state list, the resolver, and `rg -nF persistViewOrder Core --glob '!*test*'` → 13 across five files:

```ts
// Core/Views/views.ts:139-144 — collapsed_groups is the only view-state key today
const VIEW_STATE_KEYS = ['collapsed_groups'] as const
// Core/Views/Host/useViewHost.ts:109-118 — liveView's memo, and its early return
if (!orderOverride && !hiddenOverride && !stylePatch && !bandPatch) return view
// :120-136 — everything the fold's guard needs is derived BELOW the memo
const sortKeys = useMemo(() => resolvedSortCount(liveView.sort, schema), …)   // :120
const structuralOrder = groupPropId === undefined && sortKeys === 0           // :136
// :138-144 — the resolver's third argument
? undefined : resolveManualOrder(sortedOrGrouped, manualOverride, structuralOrder ? undefined : viewOrders[view.id])
// Core/Views/Host/useViewOrders.ts — the whole file, plus bridge.ts:65-66 / handlers.ts:96-97
// THREE write sites carry a condition — update an existing order, never mint one:
//   TableView.tsx:1048  if (viewOrders[view.id]) persistViewOrder(spliceLive(…))
//   CardsView.tsx:529   if (viewOrders[view.id]) persistViewOrder(spliceLive(…))
//   useViewCreation.ts:124  if (!latest.structuralOrder || latest.viewOrders[latest.view.id])
// TWO are unconditional: TableView.tsx:1067 (reorderTo, past its structural branch) and
//   CardsView.tsx:504 (reorderInBandByIndex, past its parent branch).
// And settleOrders no-ops on a null override: setManualOverride((m) => (m ? splice(m) : m))
```

**Becomes** — a fourth field, a hoisted predicate, a fourth override, and one writer:

```ts
// Core/Views/views.ts — beside collapsed_groups, with element-filtering in the codec
manual_order?: string[]
const VIEW_STATE_KEYS = ['collapsed_groups', 'manual_order'] as const
// pickViewState carries both — a locked tile still holds a manual order, as collapse already does.

// Core/Views/Host/useViewHost.ts — sortKeys, groupPropId and structuralOrder are computed from
// `view` and HOISTED above the liveView memo. Sound because bandPatch touches only group.order
// and group_order, moving neither resolvedSortCount nor group.kind — a `view`-derived predicate
// and a `liveView`-derived one cannot disagree. Reading them below the memo is a TDZ crash the
// type gate does not catch.
// The memo's early return gains manualOverride, or a lone drag never folds:
if (!orderOverride && !hiddenOverride && !stylePatch && !bandPatch && !manualOverride) return view
...(!structuralOrder && manualOverride ? { manual_order: manualOverride } : {}),
// the catch-up effect gains its fourth clause:
if (manualOverride && sameIds(manualOverride, view.manual_order ?? [])) setManualOverride(null)
// the resolver's third argument becomes structuralOrder ? undefined : view.manual_order

// Every drop site: persistView({ manual_order: <ids> }, { viewState: true }), each KEEPING its
// existing condition against liveView.manual_order rather than viewOrders[view.id] — a relocate
// on an unsorted view must not mint an order that lies dormant until a sort is added later.
// settleOrders splices unconditionally from liveView.manual_order and SETS the override, so two
// creates in a row compose; the (m ? … : m) no-op goes.
// useViewCreation's config drops viewOrders and persistViewOrder for persistView itself — the
// config already carries toggleCollapse, the same closure by another name.
// Core/Views/Host/useViewOrders.ts, bridge.ts:65-66 and handlers.ts:96-97 — deleted.
```

**Assumed by:** Task 4 (imports into the field this defines).

**Verify — Automated**

- [ ] Red first: a `useViewHost` case that a reorder under a sort puts the ids in `manual_order` on the saved view, and that a structural reorder leaves `manual_order` at its stored value while writing `page_order`. Expect 2 failures.
- [ ] **The crossing test:** the fold and `resolveManualOrder` agree — a case that toggles a group collapse while a *structural* `manualOverride` is live, on a view that already has a stored `manual_order`, and asserts the saved `manual_order` is unchanged from the stored value. Red with the `!structuralOrder` guard removed from the fold.
- [ ] The third consumer agrees too: a `settleOrders` case on an unsorted, ungrouped view asserts no `manual_order` is minted where none existed.
- [ ] A `useViewHost` case that a drag with no other live override folds — the early-return guard's negative control: remove `!manualOverride` and it goes red.
- [ ] A `useViewCreation` case that two creates in succession, before any tree push, produce a `manual_order` containing both new ids in gesture order.
- [ ] A `CardsView` and a `TableView` case each: a cross-band drop under a sort writes `manual_order`; the same drop on a structural view does not.
- [ ] The degenerate cases: `manual_order` absent → the resolver returns undefined; present but empty → the same; a non-string element is dropped, not the whole array. A locked tile's state-only write carries `manual_order`.
- [ ] `rg -nF persistViewOrder Core` → 0, `rg -nF useViewOrders Core` → 0, `rg -nF viewOrders Core` → 0. Control: `rg -nF collapsed_groups Core` → 23.
- [ ] Full gate green. `Scope`'s `'viewOrder'` name still stands — Task 4 reads it.

#### Task 4: Import the `viewOrder` scope, and remint stops carrying it

**Requirements:** 2, 5

**Why:** With a reader in place from Task 3, the rows can land. Remint's per-view copy loop goes — and `manual_order` is dropped from a reminted copy outright, because the copy's pages are being given new ids in the same pass, so the array would name pages that do not exist there.

**Now** — the union name, the copy loop, and Task 2's import awaiting a second pass:

```ts
// Core/Platform/localState.ts:7 — the Scope name
// Core/Nexus/remint.ts:147-150 — inside copyDeviceRows, keyed by minted view id
for (const [old, minted] of viewIds) {
  const order = readKey<string[]>('viewOrder', old)
  if (order !== null) writeKey('viewOrder', minted, order)
}
// rg -nF COPY_SCOPES Core/Nexus/remint.ts → 2 (the declaration and its loop); it stays 2.
```

**Becomes** — a second pass in the same import, and remint dropping the field:

```ts
// Core/Nexus/importPlacedState.ts — a viewOrder pass beside the activeView one. The rows are
// keyed by VIEW id, and nodesOf carries no views, so this pass reads the live tree's own
// CollectionNode / SetNode for the view-id → container map; nodesOf answers only the
// container-id lookup activeView needs. Same per-container withSidecarLock write, same
// per-container swallow, same row delete. A view id no container claims keeps its row.

// Core/Nexus/remint.ts — inside remintSidecar's locked write, in the views[].id rewrite:
return { ...v, id: minted, manual_order: undefined }
// The copy's pages are reminted to new ids in the same pass, so a carried manual_order would
// name pages that are not in the copy — and on disk it would sync everywhere with no sweep.
// The copyDeviceRows viewOrder loop goes; it no longer needs viewIds, so writeFreshId's
// Map|null return collapses to boolean.
```

**Assumed by:** Task 8 (deletes the import and both `Scope` names).

**Verify — Automated**

- [x] Red first: an import case over a container with two views, each holding an order — both land on their own view record, both rows are gone after, the container's sidecar is written once for both passes, and a second run is a no-op. Expect 3 failures.
- [x] The degenerate cases: a view id matching no container keeps its row; a container holding an `activeView` row but no `viewOrder` row is written once, not twice.
- [x] A `remint` case that a copied container's minted view records carry **no** `manual_order`, while the original's is untouched. Red with the `manual_order: undefined` removed.
- [x] `rg -nF COPY_SCOPES Core/Nexus/remint.ts` → 2, and the array holds only the seven page-level scopes the ruling keeps.
- [x] `rg -nF "readKey<string[]>('viewOrder'" Core` → 0. Control: `rg -nF copyDeviceRows Core` → 2.
- [x] Full gate green.

**Verify — User**

- [ ] A view sorted and hand-ordered before this change still shows that order, and the order reads as `manual_order` inside the view record in the container's sidecar.

#### Gate 2 — the manual order travels

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] The hazard window stays open by design.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 3 opens automatically and Task 4's user box carries to Completion Criteria.

---

### Phase 3 — Browser storage into the device store

#### Task 5: `DevicePrefs` gains its three machine-local shapes, seeded before the paint

**Requirement:** 3

**Why:** All three values are true of the machine, and the store already has a rail for exactly that. Seeding must precede `status: 'ready'`, or the sidebar paints at its default and jumps a second time when the tree lands.

**Now** — one optional boolean, loaded behind a flag at the tail of `applyTree`, and read into nothing:

```ts
// Core/Settings/devicePrefs.ts:3-12 — packDevicePrefs drops top-level undefined, null and false
export interface DevicePrefs { nativeMenus?: boolean }
// Core/Session/nexusSlice.ts:141-171 — order today
if (prevRoot !== undefined && prevRoot !== incoming.nexus.rootPath) resetNexusSession()  // :144
const tree = stabilize(incoming, get().tree)                                             // :146
set({ status: 'ready', tree })                                                           // :147
// … 18 lines of reconcile and theme work …
if (!devicePrefsLoaded) { devicePrefsLoaded = true
  const prefs = await host().ask('devicePrefs:load')
  if (prefs.ok) set({ devicePrefs: prefs.value ?? {} }) }                                // :166-170
// Core/Session/layoutSlice.ts:36,47-51 — the clamp, and what a Nexus switch resets
const clampWidth = (pane: PaneWidth, w: number): number => clamp(Math.round(w), pane.min, pane.max)
const PER_NEXUS = { subfieldExpanded: true, navWindowMode: 'list', navViewMode: 'list' }
```

**Becomes** — three nested keys, the block five lines earlier, and the widths actually seeded:

```ts
// Core/Settings/devicePrefs.ts — nested BECAUSE packDevicePrefs drops a top-level false and a
// disclosure map is mostly false; a truthy object survives whole.
export interface DevicePrefs {
  nativeMenus?: boolean
  panes?: { sidebar?: number; inspector?: number }
  disclosure?: Record<string, boolean>
  windows?: Record<string, { w: number; h: number }>
}
// Core/Session/nexusSlice.ts — the devicePrefsLoaded block moves from :166 to between :146 and
// :147, and seeds each width in the same set(), clamped: nothing else copies them out. A width
// is seeded only when `panes` HOLDS it — an absent key leaves the slice as it stands, which is
// what keeps this task from resetting the still-live storedWidth value before Task 6 lands.
const panes = prefs.value?.panes
set({ devicePrefs: prefs.value ?? {},
      ...(panes?.sidebar !== undefined && { sidebarWidth: clampWidth(SIDEBAR_WIDTH, panes.sidebar) }),
      ...(panes?.inspector !== undefined && { inspectorWidth: clampWidth(INSPECTOR_WIDTH, panes.inspector) }) })
// The flag stays: it is what keeps a push-driven applyTree from round-tripping, and
// resetNexusSession:44 clears it on the foreign-tree branch at :144, which runs first.
// Core/Session/layoutSlice.ts — the widths join PER_NEXUS, so resetLayout returns them to def.
// Without that, Nexus A's widths stay in the slice across a switch and are written into B's
// devicePrefs on B's next pane drag.
```

**Assumed by:** Task 6 (`panes`, `disclosure`), Task 7 (`windows`).

**Verify — Automated**

- [ ] Red first: a `devicePrefs` case that a nested `false` survives `packDevicePrefs` and a top-level one does not. Expect 1 failure.
- [ ] A `nexusSlice` case that both widths carry their stored values, clamped, before `status` becomes `'ready'`. Red with the block moved back below the `set`.
- [ ] **Both halves of the absent-key rule:** a `panes` holding a width seeds it, and a `panes` missing one leaves the slice untouched rather than resetting it to `def` — the case that keeps this task from regressing the pane width before Task 6 lands.
- [ ] A `resetLayout` case that both widths return to `def`. Red with them removed from `PER_NEXUS`.
- [ ] **Both halves of the flag:** a foreign tree arriving by push re-fetches; a same-root push does not.
- [ ] The degenerate cases: `devicePrefs:load` returning `null`, a `NO_NEXUS` failure, and a `panes` value outside `min`/`max` — the first two leave the defaults standing, the third clamps.
- [ ] `rg -nF devicePrefsLoaded Core` → 3. Control: `rg -nF devicePrefs Core` → re-derive; 25 today.
- [ ] Full gate green.

#### Task 6: The panes and the sidebar read the store, and `localStorage` goes

**Requirements:** 3, 5, 6

**Why:** With the values in the store before first paint, the two browser-storage readers are the last thing holding Pommora state in the browser. Both come across: a pane width and a fold map are shapes the user built, and the move does not get to charge them for it.

**Now** — `rg -nF localStorage Core UIX` → 8 across three files:

```ts
// Core/Session/layoutSlice.ts:31-45,70-79 — storedWidth at construction, setItem on drop
export const SIDEBAR_WIDTH = { min: 180, max: 380, def: 240, key: 'pommora.sidebarWidth' }
export const INSPECTOR_WIDTH = { min: 240, max: 420, def: 300, key: 'pommora.inspectorWidth' }
// Core/Interface/Sidebar/disclosureState.ts — the whole file, plus its test
// Core/Interface/Sidebar/Sidebar.tsx:234-240 — loadOpen at mount, saveOpen on toggle
```

**Becomes** — the store on both sides, written through the existing `setDevicePref`:

```ts
// Core/Session/layoutSlice.ts — the bounds keep min/max/def and lose `key`; storedWidth goes,
// and the slice starts at def (Task 5 seeds it). persistPaneWidths writes one pref:
setDevicePref('panes', { sidebar: get().sidebarWidth, inspector: get().inspectorWidth })
// Core/Interface/Sidebar/Sidebar.tsx — open comes from the store, written the same way:
const stored = useSession((s) => (persistKey ? s.devicePrefs.disclosure?.[persistKey] : undefined))
// setAndSave merges one key into the disclosure map through setDevicePref.
// Core/Interface/Sidebar/disclosureState.ts and disclosureState.test.ts — deleted. The parse
// cache they held is replaced by a property read off a map the store already holds parsed.

// Core/Session/importBrowserState.ts (new) — renderer-side, since localStorage is the browser's.
// Called from load(), after nexus:state answers 'open' (a root must be bound: devicePrefs:save
// refuses without one) and BEFORE applyTree, so Task 5's seed reads the merged value.
// Returns immediately when none of the three keys is present, which is every open after the
// first. Otherwise: devicePrefs:load, merge the localStorage values under `panes` and
// `disclosure` WITHOUT overwriting a key the store already holds, devicePrefs:save, then
// removeItem all three. Self-erasing; a second run finds nothing.
export async function importBrowserState(): Promise<void>
```

**Verify — Automated**

- [ ] Red first: a `layoutSlice` case that a drop writes one `devicePrefs` pref carrying both widths, and a `Sidebar` case that a toggle merges one key without clobbering its siblings. Expect 2 failures.
- [ ] Red first: an import case that the three `localStorage` keys land as `panes` and `disclosure`, that all three are removed, and that a second run neither loads nor saves. Expect 3 failures, module not found.
- [ ] **Both halves of the precedence rule:** a `panes` value already in the store survives the import, and one absent from the store is filled from `localStorage`. Red with the merge inverted.
- [ ] The degenerate cases: absent keys write nothing and skip the round trip entirely; a corrupt `pommora.sidebar.disclosure` value is skipped rather than throwing; a `localStorage` that throws on read leaves the stored prefs standing; an absent `panes` or `disclosure` leaves the defaults standing; a `disclosure` entry for a key no group claims is ignored, not rendered; a group with no `persistKey` neither reads nor writes.
- [ ] `rg -nF localStorage Core UIX` → 4, all inside `importBrowserState.ts`. Control: `rg -nF useSession Core/Interface` → re-derive.
- [ ] Full gate green.

**Verify — User**

- [ ] Sidebar and inspector widths, and every sidebar fold, come across from before this change and survive a restart — with a single settle as the Nexus paints, not a jump afterward. Switching to a second Nexus opens it at *its* widths and folds, not the first one's.

#### Gate 3 — nothing of Pommora's is in the browser

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 4 opens automatically and Task 6's user box carries to Completion Criteria.

---

### Phase 4 — Window size into the device store

#### Task 7: UIX takes the size as a prop; Core remembers it

**Requirements:** 3, 4

**Why:** UIX reaches nothing outside itself, so it can hold a size but never persist one. Handing the value in and the change back leaves the decision to Core, where the store is. Both halves land together: the map's deletion without its replacement is a commit in which no window remembers anything.

**Now** — a module map, the `id` prop that exists only to key it, and two behaviors that must survive:

```ts
// UIX/Windows/window-base.tsx:28-37,74,98,108 — opening does THREE things
const sizes = new Map<string, Size>()
const opening = (id: string, bounds: WindowBounds): Rect => {
  const s = sizes.get(id) ?? bounds.def                    // the lookup — this is what goes
  return onScreen({ ...s,                                  // the viewport clamp — stays
    x: Math.round((window.innerWidth - s.w) / 2),           // the centering — stays
    y: Math.round((window.innerHeight - s.h) / 3) })
}
onChange: (next) => { sizes.set(id, { w: next.w, h: next.h }); setGeo(next) }
// UIX/Interactions/ResizeFrame.tsx:129-132 — onDrop fires when ANY rect key moved, which a
// 'move' grip always does; a drop is not proof the size changed.
// The six call sites, ids already per-kind constants:
// SettingsWindow.tsx:722 'settings' · WebWindow.tsx:86 'web-browser' ·
// PageWindow.tsx:143 'page-window' · NavWindow.tsx:128 'navwindow' ·
// PageHistoryWindow.tsx:214 'page-history' · IterationWindow.tsx:13 'iteration'
```

**Becomes** — two optional props, the persist gated on the drop, and one Core hook that dedupes:

```ts
// UIX/Windows/window-base.tsx — the map and the id go; opening keeps the centering and the clamp
const opening = (size: Size | undefined, bounds: WindowBounds): Rect => { … size ?? bounds.def … }
initialSize?: Size          // absent → bounds.def
onSizeChange?: (s: Size) => void
onChange: (next, phase) => {
  setGeo(next)
  if (phase === 'drop') onSizeChange?.({ w: next.w, h: next.h })
}

// Core/Interface/Windows/useWindowGeometry.ts (new) — UIX cannot reach Core, and five sites need
// identical wiring. Reads s.devicePrefs.windows?.[id]; writes through setDevicePref, the same
// rail as panes and disclosure — no new scope, channel, or handler. It skips a write matching
// the stored size, which is what keeps a window MOVE from writing a pref on every drag.
export function useWindowGeometry(id: string): { initialSize?: Size; onSizeChange: (s: Size) => void }
// A stored entry whose w or h is not a finite number is ignored — isGlanceSize
// (Core/Contract/validators) already answers that shape; do not write a second one.
// Spread at the five ruled windows. IterationWindow passes neither prop: a development
// scratchpad opens at its default every time.
```

**Verify — Automated**

- [x] Red first: a UIX case that an absent `initialSize` opens at `bounds.def`, that a given one opens at that size, and that a drag calls `onSizeChange` exactly once — on drop, not per move. Expect 3 failures.
- [x] **The negative control:** with the `phase === 'drop'` guard removed, the once-per-drag case goes red.
- [x] A UIX case that a stored size wider or taller than the viewport is clamped by `onScreen`, and that the opening rect is centered. Red with `opening` reduced to a bare `initialSize ?? bounds.def`.
- [x] A hook case that a window *move* writes nothing, and that a resize writes one entry under that id leaving sibling ids intact.
- [x] The degenerate cases: a press that moves nothing calls back not at all; no stored entry → `initialSize` undefined; a malformed entry is ignored rather than passed through.
- [x] `rg -nF 'sizes.set' UIX` → 0 and `rg -n '\bid\b' UIX/Windows/window-base.tsx` → 0. Control: `rg -nF WindowBase Core` → 18.
- [x] Full gate green.

**Verify — User**

- [ ] Resize the Settings window and a Page window, quit, reopen — each returns at its size, centered and fully on screen. Two Page windows in a row open at the same remembered size. Dragging a window by its chrome changes nothing. The iteration window (⌘⇧T) opens at its default every time.

#### Gate 4 — windows hold their size

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Simplification, then code review, dispatched against `<base>..HEAD` scoped to this phase's paths.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] One smoke launch.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — Phase 5 is, and it opens only on the user's word.

---

### Phase 5 — Residue

#### Task 8: Delete the imports and the homes they emptied

**Requirement:** 6

**Why:** The imports exist to carry one machine's values across once. Once the user has confirmed they arrived, they and the two `Scope` names are code with nothing left to vary.

**Now** — the inventory, bucketed:

```ts
// DEAD REGARDLESS — nothing reads them once the rows and keys are gone:
//   Core/Nexus/importPlacedState.ts + test, and its call site in openNexusSequence
//   Core/Session/importBrowserState.ts + test, and its call site in load()
//   Core/Platform/localState.ts — the 'activeView' and 'viewOrder' names
//   Core/Platform/localState.test.ts — the cases keyed on those two names
// NEVER DELETE — outside this plan by the ruling:
//   folds · headingCols · headingIcon · citations · embedHeights · embedZooms · aliases ·
//   linkTitle · tabs · windows · recents · record · glancePane · devicePrefs
// ORDER — the import goes first: deleting a Scope name while the import still reads it is a
// compile error, and the compile error is the point.
```

**Becomes** — the import gone, the union two names shorter, every falsified document rewritten:

```ts
// Core/Nexus/handlers.ts — the importPlacedState call in openNexusSequence goes
// Core/Session/nexusSlice.ts — the importBrowserState call in load() goes
// .claude/Features/* — every sentence naming activeView, viewOrder, or a localStorage home for
// pane width or disclosure, rewritten to the placement that now holds. Enumerate with
// `rg -ln 'activeView|viewOrder|localStorage|per-machine' .claude/Features` before editing —
// eight files hit that pattern today. NOT `-F`: the alternation needs a regex.
```

**Verify — Automated**

- [x] The whole Dead Vocabulary sweep at zero against its control.
- [x] `rg -nF "'activeView'" Core` → 1, the live tree-node field name at `treePatch.ts:495`, and `rg -nF "'viewOrder'" Core` → 0. Control: `rg -nF "'folds'" Core` → 24.
- [x] Full gate green.
- [x] One smoke launch on a Nexus whose scopes are already empty: the open completed, the sidebar painted, the main log carried no "Restore skipped" and no import line, and the renderer reported `localStorage.length` 0.

**Verify — User**

- [ ] Everything Phases 1–4 asked for still holds after the deletions, on the real Nexus.

#### Gate 5 — nothing left with nothing to vary

- [x] **Declared stop.** This phase opens only once the user has confirmed, against the real Nexus, that a chosen view, a dragged order, the pane widths, and the sidebar's folds all came across.
- [x] Gate commands green, exit codes read directly.
- [x] The hazard window Task 2 opened is closed here.
- [x] Simplification, then code review, dispatched against `7096dcb2c..HEAD`.
- [x] Every concern fixed, or carrying an explicit user ruling recorded in the Log. Neither review raised a concern against this task; both reports are recorded above and their findings route to Gates 1–4.
- [x] Every document in Made False rewritten in the commit that falsified it.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — Active View on the container sidecar · base `7096dcb2c`
  - [x] Task 1 — One container-node mapper, and `active_view` on the mutate rail · `e88c2cc96`
  - [x] Task 2 — Import the `activeView` scope during the open · `2edcecdc9`
  - [ ] Gate 1 — owed. Both tasks landed; the gate's own boxes are unticked, so it has not run.
- [ ] **Phase 2** — Manual order in the view record
  - [x] Task 3 — `manual_order` on the view, written by every drop site
  - [x] Task 4 — Import the `viewOrder` scope, and remint stops carrying it
- [ ] **Phase 3** — Browser storage into the device store
  - [x] Task 5 — `DevicePrefs` gains its three machine-local shapes, seeded before the paint · `4d6f206a9`
  - [x] Task 6 — The panes and the sidebar read the store, and `localStorage` goes
- [ ] **Phase 4** — Window size into the device store
  - [x] Task 7 — UIX takes the size as a prop; Core remembers it
- [ ] **Phase 5** — Residue
  - [x] Task 8 — Delete the imports and the homes they emptied

### Rulings

- **09-07-2026, Nathan:** Per-Nexus granularity accepted for pane widths, sidebar disclosure, and window size. `local_state` and `devicePrefs` are both bound to a session root, so all three are per machine *per Nexus*, not per machine.
- **09-07-2026, Nathan:** The cold-start settle is accepted. `devicePrefs` is read before `status: 'ready'` so the ready paint carries the stored widths; the `loading` state still shows the default, and the pane settles once as the Nexus appears. Holding the first paint blank was rejected.
- **09-07-2026, Claude:** `active_view` rides the `mutate` rail (`setDisclosureLock`'s precedent) rather than `container:configure`, which has no optimistic tree patch and would make a view switch wait on disk. This retires the `activeViews` store slice outright rather than replacing it with a catch-up override layer.
- **09-07-2026, Claude:** `WindowKind` does not exist in the codebase; the D-1 ruling asserted it. No union is introduced — the five window ids are already literals at their call sites, and `useWindowGeometry` keys on them directly.
- **09-07-2026, Claude:** No new `windowGeometry` scope or channel pair. Window size is a nested key on `devicePrefs`, the rail panes and disclosure are already joining — one place to look for a machine-local preference rather than two.
- **09-07-2026, Nathan:** Pane widths and the sidebar's folds are imported from `localStorage`, overturning Claude's call that they were cheap enough to discard. A fold map is state the user built across the whole Nexus, and no placement change may charge them for rebuilding it. The simplification pass had proposed dropping the import on the strength of `disclosureState.ts:1`'s "regeneratable"; that word describes where the value may live, not whether it may be thrown away.
- **09-07-2026, Claude:** The two imports are split across Phase 1 and Phase 2 rather than bundled. Bundling would land `manual_order` a phase before any reader consumed it, and the write it saved was never real — the watcher is not armed during the open.
- **09-07-2026, Claude:** A reminted container's copied view records drop `manual_order` outright. Its page ids are reassigned in the same pass, and on disk a stale array would sync to every device with no owner and no sweep.
- **09-07-2026, Claude:** The `'activeView'` and `'viewOrder'` Scope names survive through Phase 4 and are deleted in Task 8, because the imports that read them are the only thing that recovers a pre-move value on a machine that has not opened yet.

### Open Against Later Tasks

- **Task 3 — `viewOrders:get` is being enveloped before this plan deletes it.** The Engine Boundary plan requires every bridge channel to answer `Result`, so `viewOrders:get` becomes `Result<Record<string, string[]>>` via the existing `scopeGet` conversion; `viewOrders:set` is untouched. Two consequences for Task 3, neither blocking: its Now fence for `Core/Contract/bridge.ts:63-64` will read the enveloped signature rather than the bare one — re-derive, do not correct the plan to match the old shape — and `Core/Views/Host/useViewOrders.ts:16-19` will unwrap a `Result` by then. Task 3 deletes the file and both channel entries outright, so the enveloped version deletes exactly as cleanly.

### Deviations

- **Phase 1 was executed by a different session**, concurrently with this one's review round, and its Progress rows were filled in by that session rather than by the planning session. Both tasks landed after `7096dcb2c`, so they carry the reviewed plan rather than an earlier draft. Spot-checked against the three review findings most likely to have been missed, all three clean: `Core/Pages/setActiveView.ts` uses `rmwJsonStrict` alone with no `withSidecarLock` around it (no re-entrant lock); `Core/Views/Settings/ViewFrame.tsx:86-87` refuses `DEFAULT_VIEW_ID`; `Core/Nexus/importPlacedState.ts` uses `withSidecarLock` with the reads inside and carries a per-container catch. `importPlacedState` is wired at `Core/Nexus/handlers.ts:72`, beside `replaySchemaCascade`, as specified.
- **Gate 1 is owed.** Its boxes are unticked and no gate commit exists, so the phase's simplification and code-review dispatches, the count re-derivations, and the smoke launch have not happened. Phase 2 does not open until they do. Run it against `7096dcb2c..HEAD`, scoped to `Core/Nexus`, `Core/Pages`, `Core/Views`, `Core/Session`.
- **Task 3 waits for the Engine Boundary refactor to commit.** That session holds ~37 uncommitted files in this same working tree, including all three surfaces Task 3 deletes (`Core/Contract/bridge.ts`, `Core/Interface/handlers.ts`, `Core/Views/Host/useViewOrders.ts`) and both of Phase 1's new files (`containerFields.ts`, `importPlacedState.ts`). Let it land, rebase, then delete — deleting into an uncommitted tree of that size is how work is lost. Gate 1 touches none of the collision surface, so it fills the wait. Citations carried from before that refactor are already stale: the channel entries are at `bridge.ts:63-64` and the handlers at `Core/Interface/handlers.ts:82-83`, not where Task 3's fence has them. Re-derive.
- **A concurrent plan is editing the same files.** The Engine Boundary session is collapsing `NexusState` to two arms, removing the `nexus:state` self-catch, and putting every bridge channel on the `Result` envelope. It was told: State Placement changes neither `NexusState` nor the `nexus:state` handler; `viewOrders:get` and `viewOrders:set` are deleted by Task 3, so its envelope migration should skip them; and the `'activeView'` / `'viewOrder'` names in `Core/Platform/localState.ts:6-7` are held alive by this plan's hazard window and must not be swept as dead code.

- **Base commit is `7096dcb2c`.** The tree carries unstaged Engine Boundary work (`Core/Platform/machine.ts`, `Desktop/Platform/nodeMachine.ts`, `Core/package.json`, `Desktop/tsconfig.node.json`, and four untracked test files) belonging to a different arc. It is left unstaged and untouched: every State Placement commit stages explicit paths, never `-A`. `machine().lock` is confirmed untouched by that diff, so the Forced By lock reasoning stands. Baseline gates green before any change: typecheck 0, 4152 tests passed, lint clean.
- **The Environment's "no per-role agent" line is false.** `.claude/agents/` holds `code-simplifier`, `build-breaking-agent`, and `comment-killer-agent` (untracked, authored 09-06/09-07). They are not registered as dispatchable types in this session, so each phase's simplification, comment, and attack passes are dispatched as background Opus agents briefed to load the same skills those agents load as their own first action — `code-simplification` and `build-breaking`.
- **The retiring homes are snapshotted before any import fires.** Task 2 and Task 6 delete each row and key as they land it, so on this machine the pre-move values are gone at the first smoke launch that restores the real Nexus. `~/NexusOS` is that Nexus and holds 4 `activeView` rows and 6 `viewOrder` rows. Copies of `nexus.db`, a JSON dump of both scopes, and Electron's `Local Storage` directory are held in the session scratchpad at `state-placement-snapshot/`.
- **`viewOrder` rows are keyed by more than container-held view ids.** The real Nexus holds three `view_…` ids, two bare ULIDs of a legacy shape, and one `embed:01KXC5QQ9YGM36H0SAH58MFPTE:1`. Embedded views are minted by `Tiles/Surfaces/ViewTile.tsx:261` into a tile entry's config rather than a container sidecar, so Task 4's container-keyed import claims none of these three and, by its own rule, keeps their rows — which Task 8 then orphans. Task 3 is unaffected: `manual_order` joins `VIEW_STATE_KEYS`, and view state already reaches a tile entry through `ViewTile`'s `persistState`, so embedded views keep manual ordering going forward. What is lost is only the pre-move value on those three rows. Task 4 carries the question of whether the import can also reach tile entries; the Acceptance clause "`local_state` holds no `activeView` or `viewOrder` row" is read against the rows the import claims, not the ones it is ruled to keep.

- **`useActiveView` returns the view itself.** Its `activeViewId` half had one writer and no reader once the slice was gone, so the hook returns `SavedView` and its four call sites read it directly. Task 1's shape is otherwise as written.
- **`nodesOf` does not cross the engine boundary.** `Core/Nexus/treeIndex.ts` imports `@pommora/uix/Symbols` and `NavTrail` to resolve icons, so importing it from `openNexusSequence` pulls `.tsx` into `Desktop/tsconfig.node.json`, which sets no `jsx` — five `TS6142` errors, the first red the Engine Boundary guard caught for this arc. The import visits the live tree's container nodes directly instead, in the shape `collectionFolders` already uses on this side (`Core/Properties/assignment.ts:101-111`). Task 4's view-id map was already specified to read those same nodes, so the two agree. A shared container visitor is now the fourth of its kind — `collectionFolders`, `remintLedger`, `watchPatch`, and this — and is named under Sequenced After.
- **A sidecar already naming a view keeps it, and the row is still consumed.** `.nexus/` syncs and `nexus.db` does not, so a second machine can meet a sidecar carrying a choice made after its own row was written. Most recent wins: nothing is overwritten, and the row is deleted because the value has a home. The pass still reports that something landed, which costs one re-walk on one open rather than a tri-state return.
- **Task 2's `readKey(` control moved, 13 → 16.** The task's own two mandated edits move it: the `remint.test.ts` rewrite drops five `readKey('activeView'…)` assertions and the new import suite adds eight. The written figure was a pre-edit count; it is corrected in place.
- **A sidecar lock key is the realpath.** `resolveUnderRoot` canonicalizes through `machine().realpath`, so a `withSidecarLock` taken on an unresolved folder is a *different* key from the one `rmwJsonStrict` takes inside the op — on macOS, where `/var` is a symlink, the nesting then serializes nothing and rejects nothing. Task 1's lock control locks the resolved folder. Tasks 2 and 4 build their per-container `withSidecarLock` on a resolved path for the same reason.

- **Gate 1's two reviews, and what they changed.** The code review found the wrong-nexus guard added mid-phase to be unreachable: `importPlacedState`'s only caller is `openNexusSequence`, inside the `root !== priorRoot` branch that opens with `dropLiveTree()` and seeds this root before every later step, so `getLiveTree()` is either null or this root's, and the comparison could only fail on null — where the fallback re-ran the walk that had just failed. It was reverted with its test under the standing rule, and its removal retires the `refreshTree` call that had made the never-throw wrap necessary in the first place. The wrap stays: `readScope` and the row deletes reach SQLite outside any container's own catch. Both reviews independently found the sentinel breach and it is fixed. The `readKey(` control read 18 at the gate against the plan's 13 — the figure predated the plan's own mandated edits, and two later test additions carried it further.
- **The sentinel row is spent, not kept.** The two reviews disagreed on whether a `view_default` row should keep its row or consume it. It is consumed: the value names no view, so nothing is carried across by keeping it, and Task 8 would orphan it. Reachable on a machine that has not opened yet — a set nested deep enough to be minted no view of its own shows the placeholder row, and clicking it wrote the sentinel with no guard. None of the four rows on the real Nexus carries it.
- **The crossing test now compares whole nodes.** Its nine-key projection could not see a tenth field, which is the guarantee Task 1's verify box claimed for it. Proven by injecting a divergence into the watch path alone and watching it go red across thirteen fields.
- **Remint's `activeView` copy was retired one phase before the sidecar could stand in for it.** `runOpenLedger` remints before `importPlacedState` runs, so until the first import a reminted copy's sidecar carries no `active_view` to re-point and the copy opens on its first view. Both reviews reached it; both rated it low and neither found a gesture that loses the incumbent's own choice. Accepted rather than restoring three lines Task 8 deletes — the plan's claim that the copy "becomes redundant with the sidecar write" is true only after the first import, and that is the correction, not the code.
- **Two-machine ordering is an assumption, not a fact.** The ruling that a sidecar already naming a view keeps it reads "chosen after this row was written." A second machine's row may in truth be newer. It stands under most-recent-wins; what is recorded here is that the reasoning is weaker than the wording.
- **Owed to the live pass:** whether the renderer paints the imported choice on first open or only after a reload. `importPlacedState`'s `refreshAfterWrite` may land after `nexus:state` was answered — the same shape as `replaySchemaCascade` directly above it, so not a regression introduced here, but untraced.

- **Every remaining task's counts re-derived at the Gate 1 hold, against a tree carrying another arc's uncommitted work.** Task 3: `persistViewOrder` 13 ✓, `collapsed_groups` control 23 ✓, `viewOrders` 26 ✓, `useViewOrders` 3. Task 4: `COPY_SCOPES` in `remint.ts` 2 ✓, `copyDeviceRows` control 2 ✓. Task 6: `localStorage` across Core and UIX 8 ✓, `pommora.` in Core 3. Task 7: `sizes.set` in UIX 1, `WindowBase` control 18 ✓. Task 8: eight `.claude/Features` files match the enumeration pattern ✓, `'folds'` control 15 ✓. Task 3's `bridge.ts` fence is deliberately not re-derived here — it is being enveloped as this is written, and the fence is read at execution against the landed signature.
- **Task 5's `devicePrefsLoaded` expectation is wrong and must not be satisfied.** The verify box expects 3; the count is 4 today — the declaration, the reset in `resetNexusSession`, the check, and the assignment — and none of the four is removed by moving the block. Nothing in the dirty arc accounts for it. The expectation is a miscount in the plan, not a target: an implementer who edits code to reach 3 is deleting something the task never asked to delete. Corrected to 4.

- **The commit-sweep mechanism is the ledger hook's amend, not the first commit.** `.claude/hooks/post-commit` scopes its `git add -- $LEDGER` but then runs `git commit --amend --no-edit --no-verify` with **no pathspec**, which re-commits the whole index and re-opens the hole `--only` had just closed. The earlier note below cleared the hook by reading only its `git add`; that reading was incomplete. `--only` is necessary and not sufficient — the index must also be empty of another session's work at the moment the hook fires, which is why `4d6f206a9` still picked up three of the Engine Boundary arc's one-line doc edits while `42e77202c` came out clean. The amend also rewrites the hash, so the one `git commit` prints is dead; read `git show --stat` after.
- **`e5bccd57e` carries five documents its message does not describe.** `.claude/CLAUDE.md`, `ContextPM.md`, `Features/CorePM.md`, `Features/DesktopPM.md`, and `Guidelines/Development-Environment.md` are the Engine Boundary arc's own envelope-doc corrections, and they are correct and wanted where they are. They arrived because two sessions share one git index: `git commit` commits the whole staged index, not the paths the committing session added, so explicit `git add` is necessary and not sufficient. `git commit --only -- <paths>` is, and every commit in this arc uses it from here. The post-commit ledger hook was cleared of suspicion by reading it — it stages named paths only.

- **The `[source]` reset defeated the new mechanism on every drop, and is now conditioned on `structuralOrder`.** `useViewHost`'s effect cleared `manualOverride` whenever `source`'s identity changed. That was invisible while the order lived in `useViewOrders`, whose echo was keyed on `containerPath` and survived a tree push — `view.manual_order` does not. A create or a relocate fires its own optimistic tree apply, which changes `source`, so the override was cleared a beat before `views:save` pushed the record back and the newborn jumped to the band end and back. Inherited Reasoning's accepted echo loss framed this as an external event landing mid-flight; the gesture's own mutate is that event, which makes it every drop rather than a race. The reset now runs only when `structuralOrder`, where `page_order` genuinely is the order — which is what that effect's own comment always claimed. On a sorted or grouped view the `sameIds` catch-up retires the override instead, which is exactly how `orderOverride` and `hiddenOverride` have always been retired; the unconditional reset was the odd one of the four. Ratified.
- **Task 3's red-first count is 7, not 2.** Two of the fold cases are green-first by construction: a case asserting a stored order is *preserved* cannot fail before the fold exists. Both are carried by negative control instead. A correction to the verify box, not a shortfall.
- **`manual_order` present-but-empty returns `[]`, not `undefined`.** `null ?? []` is `[]`, and no guard was added to make the verify box's literal wording pass — `makeSorter` gates on `manualOrder?.length`, so an empty array and an absent one paint identically. The degenerate case is tested at the sorter, where the equivalence actually lives. Adding a guard to satisfy the sentence would have been code existing only for a test.
- **CardsView's relocate site carries a negative control by inspection, not by test.** Its condition is textually identical to TableView's, which is tested with one; a two-zone `DragGroup` rig was judged disproportionate. Within-band card reorder is driven end to end under both a sorted and a structural view. Named rather than hidden.

- **Phase 3 runs ahead of Task 4.** Task 4's two test files are held under another session's test-standalone conversion, and Task 4 is red-first — implementing its source against frozen tests would mean verifying afterward. Phase 3 depends on nothing in Phase 2: Task 5's own **Assumed by** names only Tasks 6 and 7, and its whole surface (`devicePrefs.ts`, `nexusSlice.ts`, `layoutSlice.ts`, `Sidebar/`, `App.tsx`) is untouched by that arc. Phase 2 closes with Task 4 and Gate 2 once the conversion lands; the order between the two phases carries no dependency either way.
- **Gate 1's smoke launch confirmed the `activeView` import against the real Nexus.** All four rows crossed to the container they name — `Index`, `Ideas` and `Studio` collections and the `Assets/II. Arsenal` set, so both container kinds are covered — every value matching the pre-launch snapshot, and every row consumed. The second open wrote nothing and triggered no re-walk, which is idempotency on real data rather than a fixture. This also settles the attack review's open question about first-paint timing: it applied only to the single open in which the import ran, and every open after reads the sidecar through the ordinary walk. The six `viewOrder` rows stand, as Task 4 has not landed.
- **A `--only` commit silently omits an untracked file.** Task 3's own end-to-end drop test, 290 lines, was left out of `b5e571d95` for that reason and landed separately in `7fa38c2cf`. The commit form adopted to stop sweeping a parallel session's work is precise about tracked files and silent about new ones: `git add` the new paths first.

- **`PER_NEXUS` is spread at the head of the slice, not in the middle of it.** Placing the widths in `PER_NEXUS` while the spread sat below `sidebarWidth: storedWidth(…)` would have overwritten the still-live browser-storage value with `def` at construction — the exact regression the absent-key rule guards against, arriving by a route the rule does not cover. The spread moved to the top of the returned object, where the explicit width entries override it for the one commit they still exist. Nothing else in `PER_NEXUS` is written twice, so the move changes no other value.
- **A `device` settings row's key is the boolean half of `DevicePrefs`.** `keyof DevicePrefs` stopped implying a boolean the moment the interface gained three object keys, and `DeviceRow` feeds a switch. `KeyOf` was already the mapped-type filter for exactly this and took `Personalization` by hard-coding rather than by parameter; it now takes the record as a defaulted second parameter, so its five existing uses read unchanged and the device row reads `KeyOf<boolean, DevicePrefs>`.
- **Task 5's `packDevicePrefs` case is green-first by construction.** The filter has always been top-level only, so a nested `false` survives today; the interface change is types-only and Vitest does not typecheck. The case is kept because it records why the three shapes are nested, and it is named here rather than forced red.
- **Between the two Phase 3 commits a Nexus switch lands the panes at `def`.** The widths join `PER_NEXUS` in Task 5 while nothing writes `panes` until Task 6, so `resetLayout` has nothing to restore from. Both commits land in one session with no launch between them; no guard was added for a window that never opens.
- **`rg -nF devicePrefsLoaded Core` reads 5 after Task 5, not the corrected 4.** The four source hits are unchanged — the fifth is the new test file's own comment naming the module singleton it works around. Source count 4, as corrected.

- **A sidebar group's `persistKey` is required, and its keyless branch is gone.** Both call sites always passed one — a container's id and `context:<id>` — so the optional prop carried a branch nothing reached, and keeping it would have meant a second state holder beside the store read. The verify box's "a group with no `persistKey` neither reads nor writes" describes a group that does not exist; making the prop required is the honest reading, and the case is dropped rather than tested against a branch added to host it.
- **The fold is read reactively, not seeded once.** A `useState` initialized from the store would go stale for a group whose id exists in both Nexuses — `context:areas` is seeded in every registry and does not remount across a switch. The subscription is a scalar selector per group, so a toggle re-renders only the group whose value moved.
- **Task 6's `localStorage` count is 3 in source, not 4.** All three are in `importBrowserState.ts` — the header comment, the `getItem` map, and the `removeItem` loop — and nothing outside that file reaches browser storage. The plan's 4 counted a sketch; the raw `rg -nF localStorage Core UIX` reads 19 because the import's own suite drives the keys sixteen times. `rg -n 'pommora\.' Core` is 4 by the same split: one source line holding all three key names, three test constants. Controls: `devicePrefs` in Core 25 → 41, `useSession` in `Core/Interface` 396 → 400.
- **The import erases only after the write is confirmed.** `devicePrefs:save` returning a refusal leaves all three keys in place, so the next open retries rather than having spent its source on a write that never landed. Proven by a negative control that dropped the `saved.ok` guard and watched the refusal case go red.
- **One Sidebar case is green-first by construction.** A group whose key the map does not name falls back to its `defaultOpen` both before and after the change; the browser read had the same fallback. Carried by the two cases either side of it — a stored fold overriding the default, and a toggle merging one key — both of which were watched red.

- **`--only` does not survive the ledger hook's amend, and that is what carried the stray documents at `e5bccd57e`.** `.claude/hooks/post-commit` stages the ledger and runs `git commit --amend --no-edit`, which takes the whole staged index — so a path the parallel session staged between the `--only` commit and the amend lands in it regardless. Task 5's commit picked up three of that arc's one-line documentation edits this way. The hook was cleared of suspicion earlier by reading only its `git add`; the amend on the next line is the mechanism. Nothing is lost — the content is committed and correct — but a State Placement commit cannot be assumed to hold only its own paths while another session shares the index.

- **`manual_order` takes the same most-recent-wins condition `active_view` already carries.** A view record already holding an array keeps it and the row is still consumed: `.nexus/` syncs and `nexus.db` does not, so the sidecar's value is the later one. The existing comment covering `active_view` was rewritten to cover both rather than duplicated.
- **The two passes share one locked read-modify-write, not two.** `placeActiveView` became `placeState`, taking the chosen view and the container's orders together and writing only when the rebuilt object differs. Nothing forces the single write — two sequential lock takes would both be granted, and the watcher is unarmed during the open, so a second write costs no event; the shape is the task's mandate and the simpler one. Proven by a machine wrapper counting `writeText` against the sidecar: 1 as written, 2 when the `active_view` half is split into its own `writeJson`.
- **Two of Task 4's cases and one assertion are green-first by construction.** A view id no container claims kept its row before the pass existed, and a refusing container kept its `viewOrder` row for the same reason. The write count inside the both-rows case read 1 before a second write could exist — that case went red on its `manual_order` assertion instead, and the count is carried by its own negative control. The verify box's "expect 3 failures" for one case matched the three that went red across three cases by coincidence, not by its description.
- **Embedded views are still not reached, and the mechanism is now named.** A row keyed `embed:<entryId>:<slot>` parses to an entry id and a slot, and its home is `tiles[].views[<slot>].config.manual_order` in the holding space's tile document, written through the existing `writeTileDocAt`. Nothing maps an entry id to the space that holds it, so reaching one row costs a `readTileDocAt` per Space on the one open the import runs. Left unimplemented: outside Task 4's written scope.

- **The `viewOrder` import never ran, and the plan's own sequencing is what allowed it.** Task 4 built the importer; Task 8 deleted it. No launch happened in the window between them — Gate 1's smoke launch predated Task 4, and Task 8's came after the deletion — so the three container-held rows were never carried across, and the code that would have carried them was gone. The Hazard Window was written to stop exactly this and it did not, because it guards against a home being *emptied* early and says nothing about the importer being *removed* before it has run. What closes that gap is a precondition Task 8 never carried: an import may only be deleted after a launch has been observed to consume the rows it reads, not merely after the user confirms the values that a *different* import already moved. The four `activeView` values were confirmed and crossed; that confirmation was taken as covering `viewOrder`, which no run had touched.
  The values were recovered by hand from rows that were still present: `view_01KTS8ZYHBE5EGHDBHP84D8JPT` (8 ids) and `view_01KVC1DGEP65GGMMTRCR9CXVKK` (10) onto `Ideas/_pagecollection.json`, and `view_01KXVK93CTWPTANWWJ5RCXG8PH` (192) onto `Studio/_pagecollection.json`. The six `local_state` rows are left standing as a safety net — nothing reads that scope now — until the orders are seen to hold.
- **The two tile orders were carried across by hand, and no code was written to do it.** `01KXPEVF3CP9RAEKCJZZBDXXHC` (19 page ids) and `embed:01KXC5QQ9YGM36H0SAH58MFPTE:1` (31) name the two view configs of one homepage tile, so the value had a home and only the importer could not reach it. Both now sit as `manual_order` in `.nexus/homepage/_tiles.json`, where they travel with the Nexus like every other view's. Extending the import to tile documents would have added a per-Space read and about fifteen lines that Task 8 deletes in the same arc; a one-off data move leaves nothing behind. `01KX9GR0GZY1DSVAZN1VQT74JG` names nothing on disk and ends with the scope.
- **The finding that prompted it.** Checked against the real Nexus: `embed:01KXC5QQ9YGM36H0SAH58MFPTE:1` and the bare-ULID `01KXPEVF3CP9RAEKCJZZBDXXHC` both resolve to entries in `.nexus/homepage/_tiles.json`; `01KX9GR0GZY1DSVAZN1VQT74JG` matches nothing on disk and is dead. Task 4's import is container-keyed, so all three keep their rows, and Task 8 deletes the `Scope` name that makes them readable. The mechanism to reach them is known and small — a row keyed `embed:<entryId>:<slot>` parses to an entry and a slot whose home is `tiles[].views[<slot>].config.manual_order`, written through the existing `writeTileDocAt`; nothing maps an entry id to its holding document, so it costs one `readTileDocAt` per Space on the single open the import runs. It is outside Task 4's ratified scope and is not implemented. Since Task 8 is a declared stop, the choice — carry two tile orders across, or accept their loss — is put to the user there rather than settled here.

- **Task 7's red-first count is 4, not 3, and two of its cases are green-first by construction.** Against the pre-change shape — `initialSize` ignored and `onSizeChange` fired on every phase — the size-handed-in case, the viewport-clamp case, the once-per-drag case, and the move case all went red; the absent-`initialSize` case and the moved-nothing case could not, because a missing map key already resolved to `bounds.def` and `ResizeFrame`'s `onDrop` already refuses a press that moved nothing. Both are kept as the record of behavior that must survive and are carried by the `opening` negative control, which reddens the default case too.
- **A window move is told apart from a resize by the grip, in Core.** UIX reports on every drop, a move included, and carries `ResizeGrip` up with the size so the caller decides — the equality test against the stored entry could not, because a window opened clamped from a larger display reports the clamped size on a move and would have shrunk its own stored value. `useWindowGeometry` returns on a `move` grip and writes on every other, which retires the stored-size comparison entirely.
- **The `WindowBase` `id` prop had a seventh caller outside Core.** `Showcase/Leaves/PanesLeaf.tsx:47` passed `id="showcase-settings"`; the prop is dropped there and no size is handed in, which is what a static showcase pane wants. `npm run typecheck` does not cover `Showcase/`, so the count control `rg -nF WindowBase Core` → 18 would not have caught it.

- **`rg -nF "'activeView'" Core` lands at 1, not 0.** `activeView` is the live tree-node field the sidecar's `active_view` maps onto (`Core/Nexus/tree.ts:50,62`, `containerFields.ts:47`), so `treePatch.ts:495`'s `'activeView' in patch` is a quoted hit the sweep cannot clear and must not delete. `'viewOrder'` reaches 0 cleanly. The `'folds'` control reads 24 against the 15 recorded at the Gate 1 hold; eleven of those are the Engine Boundary arc's shared store-contract suite (`Core/Testing/storesContract.ts`, landed at `588b37bcf`), and nothing in this arc moved the scope. `devicePrefs` in Core reads 39.
- **Three of `localState.test.ts`'s cases were keyed on the retiring scopes, and two of them still earn their place.** `writeKey(scope, key, null)` and `readScope` both keep live non-test callers (`Core/Interface/handlers.ts:19,29`, `Core/Web/handlers.ts:15,37`), so the empty-scope read and the null-clear were re-keyed onto `embedZooms` and `headingIcon` rather than deleted. The third, "rewriting a key replaces it in place," is what the `aliases` case two lines above it already proves, and it went with the scope.
- **`devicePrefsSeed.test.ts` gave up its whole `beforeEach`.** The `localStorage.clear()` was its only statement and the `expect(localStorage.length).toBe(0)` its only other browser read; the case title claiming "and nothing to the browser" went with them, since there is no browser home left to be counted against.
- **Gate 5's two reviews found nothing against the deletion, and everything they did find belongs to Gates 1–4.** Both independently confirmed the residue complete: no scope reader survives either name, `COPY_SCOPES` holds its seven, removing `importBrowserState` sequences nothing (the `devicePrefs:load` seed sits inside `applyTree` above `set({ status: 'ready' })` and never read the browser values), and `openNexusSequence` keeps every symbol the deleted line shared. What they raised sat on Tasks 1–7 and is now fixed, in the final reduction pass over `7096dcb2c..HEAD`: a window *move* persists a viewport-clamped size because `useWindowGeometry`'s equality test cannot separate a clamp from a resize, where `ResizeFrame`'s own `grip` can (Task 7); `manual_order` accumulates ids of deleted pages, inert to the sorter but now visible in a synced sidecar, prunable at `useViewCreation.ts:119` where `allIds` is full container membership (Task 3); `pickView`'s resolution is open-coded three times — `useActiveView.ts:13`, `SettingsFrame.tsx:95`, `ViewFrame.tsx:82` — and `deleteView` leaves `active_view` naming a view it just removed (Task 1); `VIEW_STATE_KEYS` and `pickViewState` list the same keys twice (Task 3); `resetNexusSession` did not clear `devicePrefs`, and `devicePrefs.ts:1` explained the interface by its menus alone (Task 5). `manual_order`'s stale page ids are the one item left alone — `makeSorter` gates on membership, and Sequenced After already assigns the reconciliation to whichever of `Sync/` or the mobile companion lands first.
- **`.claude/Features` corrections reached beyond the enumeration pattern.** `CorePM.md`'s persistence tables placed the pane widths and sidebar folds in the app config outside every Nexus, and `DesktopPM.md:38` credited `pommora.json` with "the shell's pane widths, and Use Native Menus" — neither of which that file has ever held (`AppConfig` is `lastNexusPath`, `recents`, `trashMode`). `ViewTypesPM.md:67` also claimed the manual order "drops on any fresh tree"; the reset keys on `source.id` and `view.id`, and the catch-up at `useViewHost.ts:101` retires the override like the other three.

### Lessons

- Every count in the plan's first draft was wrong. Two causes: `rg -F` was paired with a `|` alternation, which matches the literal pipe and returns nothing; and file counts from an earlier grep were carried forward as if they were line counts. Both are recorded in the Global Constraints and route to `.claude/Guidelines` at closeout.

### Sequenced After

- `UIX/Windows/window-panel.tsx:14` keeps the module-map-keyed-by-window-id pattern Task 7 deletes from `window-base.tsx`. The ruling places panel width nowhere, so it stays session-only and out of scope here — but after Phase 4 it is the last one of its kind in UIX.
- `manual_order` on disk is an array of page ids with no validator and no sweep. Task 4 closes the one producer of stale entries that exists today (remint), but every future mechanism that copies, restores, or imports a container — `Sync/`, the mobile companion — inherits the same exposure. A reader-side reconciliation, or a sweep at open, belongs to whichever of those lands first.
- Three modules hold their own recursive visit of the tree's container nodes: `collectionFolders` (`Properties/assignment.ts:105-109`), `remintLedger`, and `watchPatch`. One engine-safe visitor would carry all three, and `treeIndex` cannot hold it — it is renderer-side.
- `setDevicePref` re-sends the whole singleton on every key, and `disclosure` now grows with the size of the Nexus. That is fine at present scale and worth revisiting if the blob gets large.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute .claude/Planning/State Placement — Implementation Plan.md.
Live-verify: the Phase 5 declared stop — a chosen view, a dragged order under a sort, the
  pane widths, and the sidebar's folds all carried across and surviving a restart on the real
  Nexus, plus a window size.
Screenshots: none — every surface here is one Nathan sees on his own.
Pings: at each phase gate, and at the Phase 5 stop.
Record: History arc "State Placement".
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to Nathan — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] One mapper reads a container sidecar's meta; the crossing test proves the two paths agree on all nine fields.
- [ ] The fold, `resolveManualOrder`, and `settleOrders` agree on one `structuralOrder` predicate, proven by its crossing test.
- [ ] No persist fires per pointer move, and no window *move* writes a size.
- [ ] No file lock is taken twice on one key.
- [ ] One rail for machine-local preferences — no second scope, channel, or handler was added.
- [ ] No sentinel id and no stale page-id array reached a sidecar.
- [ ] Nothing a person had set was lost: every retiring home was imported before it was emptied.
- [ ] Net line count reported, comments and tests excluded.

**The passes**

- [ ] One round: simplification, then attack review, over the whole range — in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the D-1 ruling as restated here.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] A collection whose non-first view was chosen opens on it, and its sidecar reads `active_view`.
- [ ] A hand-ordered view under a sort holds its order, and the view record reads `manual_order`.
- [ ] Pane widths and every sidebar fold carried across from before the change and survive a restart, settling once as the Nexus paints; a second Nexus opens at its own.
- [ ] Settings and Page windows reopen at their remembered size, centered and on screen; the iteration window does not.
- [ ] Everything above still holds after Phase 5's deletions.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed to `.claude/Guidelines`; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/− line count, comments and tests excluded. Honest about what didn't work.
