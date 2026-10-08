## Foreign Key Adoption — Implementation Plan

### Context

A key the registry doesn't name is foreign: kept as written, read by nothing, and live the moment a definition names it. The values already behave that way; a Multi-Select's held members don't. They're registered as options only when a Collection gains a property in its sidecar or a Space's own sidecar changes, so a property renamed onto a held key, and a Space holding the key of a property just created or renamed, show their values while the picker learns them on the next reopen. The mandate is this session's conversation of 10-08-2026 with Nathan; its decisions sit under *§Constraints › Settled Decisions*.

The work touches the event arm and the settle (`Core/Nexus/fileEvents.ts`, `Core/Nexus/settle.ts`, `Core/Nexus/settle.test.ts`), the Properties frame and its row menu (`Core/Properties/Schema/PropertyFrame.tsx`, `Core/Actions/propertyMenu.ts`, their tests), the drive harness and a new watch script (`.claude/scripts/drive-harness.mjs`, `.claude/scripts/nexus-watch.mjs`, `.claude/scripts/README.md`), and two documents (`.claude/Features/PropertiesPM.md`, `.claude/Planning/Text Properties — Decision Log.md`). It leaves alone `registerHeldOptions` and every registry operation, the content index (links inside foreign values are already indexed), `UIX/Fields/*`, `Core/Properties/Cells/TextCell.tsx`, and `UIX/Table/table.css`.

### Overview

Typing a property's name over a key your pages already hold shows the values today, but a Multi-Select only offers them in its picker after a reopen, and a Space holding that key is skipped. After this, the moment the registry comes to name a key — you create the property, rename one onto it, assign it to a Collection, or another device syncs the registry — every member held under that key is an option at once, on pages and on Spaces, with nothing on disk rewritten. Creating a property also lands you back on the list with the new row already renaming, the way a right-click Rename does, so adopting a key is one gesture; Rename is offered on assigned rows only.

Verification runs on NexusOS itself through a small watch script that attaches to the running app and prints what the registry and a Collection's values hold before and after each gesture, so the change is read from data rather than seen.

#### Constraints

- Gates: `npm run typecheck` · `npm run test` · `npm run lint`, from the repo root, each exiting 0; lint prints no `Found N warnings` line.
- Commit with `git add <new files>` then `git commit --only -m "…" -- <paths>`; the pre-commit hook adds `Dashboard/Ledger/loc-history.json` to code commits.
- Never touched: `UIX/Fields/*`, `Core/Properties/Cells/TextCell.tsx`, `UIX/Table/table.css`. The dev instance on port 9333 is Nathan's NexusOS and may be stopped and relaunched (his ruling of 10-08-2026): walk `ps -o pid,ppid,command -A` for the Electron PID, kill it first and then its `electron-vite` and shell wrappers, never `pkill -f`, then `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev` from the repo root in the background.
- `registerHeldOptions` (`Core/Properties/optionOps.ts`) is the one registrar and doesn't change; it's reached from `settle` and the open. `renameProperty` and `createProperty` don't call it: the schema lock is non-reentrant and the app's own registry write is applied as an event inline under it.
- The detector runs on a registry event and on a walk, over the tree in memory, and owes the Collections assigning the property and every Space; a Space's members are read from the tree, never disk.
- Adoption rewrites no file.
- Every test added fails without its change.

**Settled Decisions** — ratified with Nathan on 10-08-2026:

- A key already on disk becomes fully live the moment any definition names it, however the definition got that name: create, rename, Collection assignment, or a synced or hand-edited registry.
- Spaces are included. Matching is case-insensitive, as it already is for values.
- No picker of found keys and no automatic creation from a key; Recognize Foreign Frontmatter stays a Prospect.
- Creating a property returns to the list with the new row in the inline rename every row already uses; the Rename menu item is offered only on rows assigned to the Collection, and the All Properties rows open no menu. Nothing changes in any header.
- Text needs no code: the index scans every string value for links regardless of registry. The decision log's G-6 and G-7 are corrected to say so.
- Verification is on NexusOS with the new Description property kept, and Claude restarts the instance as needed; both rulings are Nathan's of 10-08-2026.

#### Baseline

Recorded 10-08-2026 at `26437f229` on `active`.

- Gates: green at `26437f229` — `npm run typecheck` exit 0 · `npm run lint` "Checked 1425 files in 456ms. No fixes applied." exit 0 · `npm run test` 521 files, 7451 passed, 2 skipped, exit 0.
- `grep -c "owed.options.add" Core/Nexus/fileEvents.ts` → 2 — rises to 4
- `npm run test` → 7451 passed — rises by 6 (five settle tests, one frame test, and one FrameSlide test added, one menu test retired)

**START:** 2026-10-08T19:52:27Z
**END:** 2026-10-08T20:57:14Z

#### Implementation Process

- [x] **Phase 1** — The Registry Names A Key `[Parallel with Phase 2]` — `56ffd8aa9`
  - [x] Task 1.1
  - [x] Task 1.2
- [x] **Phase 2** — Create Lands In The List, Renaming `[Parallel with Phase 1]` — `af1fd00cd`
  - [x] Task 2.1
- [x] **Phase 3** — Documentation — `e95f2d230`
  - [x] Task 3.1
- [x] **Phase 4** — The Watch Harness And NexusOS — `dbee30cd0`
  - [x] Task 4.1
  - [x] Task 4.2
  - [x] Review Checkpoint

### Phase 1 — The Registry Names A Key

**GOAL:** A Multi-Select the registry comes to name owes the Collections assigning it and every Space to the settle — from the registry's event when it patches in place, and from the walk when an outside arrival replaces the tree. Red first.

#### Task 1.1

**TASK:** Add three failing settle tests: a rename over pages holding the new key, a create over a Space holding it, and a watched registry arrival that walks.

**FILES:** `Core/Nexus/settle.test.ts`

**DEPENDENCIES:** Task 1.2 turns them green; one commit.

**NOW**

The describe `held options — the Multi-Select members a changed file holds are registered` seeds a registry with `tags` (Multi-Select, option `alpha`) and `kind`, a Collection `Notes` assigning both, and a Space at `SPACE`. Its helpers `page`, `stored`, `options`, `walked`, and `ev` exist; `stored` and `options` are typed to `'tags' | 'kind'`. Its last test is `a page a rename's sweep skipped registers its new member alone…`.

**CHANGE**

- [ ] Import `createProperty` and `renameProperty` from `../Properties/registryProperty`; widen `stored` and `options` to `string`.
- [ ] Add the three tests at the end of the describe.

**AFTER**

```diff

@@ Core/Nexus/settle.test.ts — imports @@

 import { assignProperty } from '../Properties/assignment'
+import { createProperty, renameProperty } from '../Properties/registryProperty'

@@ Core/Nexus/settle.test.ts — held options helpers @@

-  const stored = async (id: 'tags' | 'kind') =>
+  const stored = async (id: string) =>
 …
-  const options = async (id: 'tags' | 'kind' = 'tags'): Promise<string[]> =>
+  const options = async (id = 'tags'): Promise<string[]> =>

@@ Core/Nexus/settle.test.ts — end of the held options describe @@

+  it('renaming the property onto a key its Collection’s pages already hold, in any casing, registers their members', async () => {
+    await writeFile(abs('Notes', 'A.md'), page(ULID_A, 'labels:\n  - Ideas\n'))
+    await walked()
+    expect((await renameProperty(root, 'tags', 'Labels')).ok).toBe(true)
+    await settleNow(pusher, root)
+    expect(await options()).toEqual(['alpha', 'Ideas'])
+  })
+
+  it('creating a property under a key a Space holds registers the Space’s members', async () => {
+    await writeFile(abs(...SPACE), JSON.stringify({ id: ULID_D, labels: ['Ideas'] }))
+    await walked()
+    const created = await createProperty(root, { id: 'labels', name: 'Labels', type: 'multiSelect' })
+    expect(created.ok).toBe(true)
+    await settleNow(pusher, root)
+    expect(await options('labels')).toEqual(['Option 1', 'Ideas'])
+  })
+
+  it('a registry arriving from outside with a property a Collection already assigns registers the members its pages hold', async () => {
+    await writeFile(
+      abs('Notes', '_pagecollection.json'),
+      JSON.stringify({ id: 'c1', properties: ['tags', 'kind', 'labels'] }),
+    )
+    await writeFile(abs('Notes', 'A.md'), page(ULID_A, 'Labels:\n  - Ideas\n'))
+    await walked()
+    const held = JSON.parse(await readFile(abs('.nexus', 'properties.json'), 'utf8'))
+    held.order.push('labels')
+    held.defs.labels = { id: 'labels', name: 'Labels', type: 'multiSelect', select_options: [] }
+    await writeFile(abs('.nexus', 'properties.json'), JSON.stringify(held))
+    await settleBatch(pusher, root, [ev('change', '.nexus', 'properties.json')])
+    expect(await options('labels')).toEqual(['Ideas'])
+  })

```

**VERIFY**

- [ ] `npx vitest run Core/Nexus/settle.test.ts` → 3 failed (on `['alpha']`, `['Option 1']`, `[]`), the rest passing.

#### Task 1.2

**TASK:** Add `oweNamedKeys` beside `oweRescope`, call it from the registry event's in-place branch and from the walk, and correct the two comments it narrows.

**FILES:** `Core/Nexus/fileEvents.ts`, `Core/Nexus/settle.ts`

**NOW**

`applyRegistry` repoints the registry in the tree, or returns `null` for a walk when a definition arrives from a watched write, and owes nothing. `walkWhileOwed` compares the prior config with the walked one for `oweRescope` alone. `Owed.options` reads "Spaces, and Collections that gained a property, whose held options are yet to be registered." and the `settle.ts` header says "the options the changed files hold registered".

**CHANGE**

- [ ] `oweNamedKeys(owed, was, tree)` below `oweRescope`: the Multi-Selects in `tree.config.registry` whose prior entry by id isn't a Multi-Select or has another name under `normalizeTitle`; owe every Collection assigning one, and every Space.
- [ ] `applyRegistry` takes `owed`, owes on its in-place branch against the repointed tree, and is passed `owed` at the `'registry-leaf'` case.
- [ ] `walkWhileOwed` calls it inside the existing `if (was)`.
- [ ] The two comments.

**AFTER**

```diff

@@ Core/Nexus/fileEvents.ts — interface Owed @@

-  // Spaces, and Collections that gained a property, whose held options are yet to be registered.
+  // Spaces and Collections whose held options are yet to be registered.
   options: Set<string>

@@ Core/Nexus/fileEvents.ts — applyRegistry @@

-async function applyRegistry(root: string, ev: Changed): Promise<Applied> {
+async function applyRegistry(root: string, ev: Changed, owed: Owed): Promise<Applied> {
   const registry = registryFrom((await jsonOf(ev, readKept)) ?? {})
   return applyPatch(root, (t) => {
     // A definition arriving from outside may be one a sidecar already assigns, which only a read of the sidecars finds.
     const arrived = Object.keys(registry.defs).some(
       (id) => !t.config.registry.some((d) => d.id === id),
     )
-    return arrived && ev.origin === 'watched'
-      ? null
-      : repointRegistryInTree(t, orderedDefs(registry))
+    if (arrived && ev.origin === 'watched') return null
+    const next = repointRegistryInTree(t, orderedDefs(registry))
+    oweNamedKeys(owed, t.config, next)
+    return next
   })
 }

@@ Core/Nexus/fileEvents.ts — below oweRescope @@

+// A Multi-Select the registry came to name, seen by the registry's own event or by the walk an outside arrival takes, owes the Collections assigning it and every Space.
+export function oweNamedKeys(owed: Owed, was: NexusConfig, tree: NexusTree): void {
+  const prior = new Map(was.registry.map((d) => [d.id, d]))
+  const named = new Set(
+    tree.config.registry
+      .filter((d) => {
+        const p = prior.get(d.id)
+        return (
+          d.type === 'multiSelect' &&
+          (p?.type !== 'multiSelect' || normalizeTitle(p.name) !== normalizeTitle(d.name))
+        )
+      })
+      .map((d) => d.id),
+  )
+  if (!named.size) return
+  for (const c of tree.collections)
+    if (c.properties?.some((d) => named.has(d.id))) owed.options.add(c.path)
+  for (const s of tree.contexts.flatMap((g) => g.spaces)) owed.options.add(s.path)
+}

@@ Core/Nexus/fileEvents.ts — the leaf switch @@

     case 'registry-leaf':
-      return applyRegistry(root, ev)
+      return applyRegistry(root, ev, owed)

@@ Core/Nexus/settle.ts — header @@

-… the options the changed files hold registered, and one push of what moved.
+… the options the owed files hold registered, and one push of what moved.

@@ Core/Nexus/settle.ts — imports @@

 import {
   …
+  oweNamedKeys,
   oweRenames,
   …
 } from './fileEvents'

@@ Core/Nexus/settle.ts — walkWhileOwed @@

-      if (was) oweRescope(owed, scopeOf(was), scopeOf(walked.config))
+      if (was) {
+        oweRescope(owed, scopeOf(was), scopeOf(walked.config))
+        oweNamedKeys(owed, was, walked)
+      }

```

`NexusConfig` and `normalizeTitle` are already imported in `fileEvents.ts`. Every Space is owed because `registerHeldOptions` reads a Space's values from the tree, so filtering by held key here would only repeat its read.

**VERIFY**

- [ ] `npx vitest run Core/Nexus Core/Properties` → green; `npm run typecheck` · `npm run lint` exit 0.
- [ ] `grep -c "owed.options.add" Core/Nexus/fileEvents.ts` → 4.
- [ ] Commit: `git commit --only -m "…" -- Core/Nexus/fileEvents.ts Core/Nexus/settle.ts Core/Nexus/settle.test.ts`.

### Phase 2 — Create Lands In The List, Renaming

**GOAL:** Creating a property from the type picker returns to the list with the new row in the inline rename the row menu already drives, and the Rename item is offered on assigned rows alone.

#### Task 2.1

**TASK:** `create` goes back to the list and begins the row rename; the All Properties rows lose their menu and `registry-row` leaves the menu model; tests follow.

**FILES:** `Core/Properties/Schema/PropertyFrame.tsx`, `Core/Actions/propertyMenu.ts`, `Core/Actions/propertyMenu.test.ts`, `Core/Properties/Schema/PropertyFrame.test.tsx`

**NOW**

`create` asks `schema:add` and opens the editor sub-view. The assigned rows' `RenamableLabel` already renames inline under `renamingId`, driven by `beginPropertyRename` from the right-click menu, committing through `onRenameCommit`. `ListGroups` attaches `onRowMenu(d, 'all')` to the All Properties rows, and `rowMenu` maps the group to `'assigned-row'` or `'registry-row'`; `propertyMenuModel` offers Rename for `registry-row`. `popMenu` returns `null` for an empty list.

**CHANGE**

- [ ] `create`: on a landed reply, `backToList()` then `beginPropertyRename({ collectionPath, propertyId: res.value.id })`.
- [ ] Drop the `group` argument from `onRowMenu` and `rowMenu`, the `onContextMenu` on the All Properties row, and the `registry-row` context and case.
- [ ] Tests: retire the two registry-row tests; add the create test; assert the All Properties row opens no menu.

**AFTER**

```diff

@@ Core/Actions/propertyMenu.ts @@

   | { kind: 'assigned-row'; name: string }
-  | { kind: 'registry-row'; name: string }
 …
-    case 'registry-row':
-      return [{ label: 'Rename', action: 'property:rename' }]

@@ Core/Properties/Schema/PropertyFrame.tsx — ListGroups props @@

-  onRowMenu: (d: PropertyDefinition, group: 'assigned' | 'all') => void
+  onRowMenu: (d: PropertyDefinition) => void

@@ Core/Properties/Schema/PropertyFrame.tsx — assigned row @@

                     onContextMenu={(e) => {
                       e.preventDefault()
-                      onRowMenu(d, 'assigned')
+                      onRowMenu(d)
                     }}

@@ Core/Properties/Schema/PropertyFrame.tsx — All Properties row @@

                     leading={<Icon name={propertyIcon(d)} size={s.ICON.doc} />}
-                    onContextMenu={(e) => {
-                      e.preventDefault()
-                      onRowMenu(d, 'all')
-                    }}
                     trailing={

@@ Core/Properties/Schema/PropertyFrame.tsx — create @@

-    if (reportRefusal(res)) setView({ kind: 'edit', id: res.value.id })
+    if (!reportRefusal(res)) return
+    backToList()
+    beginPropertyRename({ collectionPath, propertyId: res.value.id })

@@ Core/Properties/Schema/PropertyFrame.tsx — rowMenu @@

-  const rowMenu = async (d: PropertyDefinition, group: 'assigned' | 'all'): Promise<void> => {
-    const action = await popMenu(
-      propertyMenuModel({
-        kind: group === 'assigned' ? 'assigned-row' : 'registry-row',
-        name: d.name,
-      }),
-    )
+  const rowMenu = async (d: PropertyDefinition): Promise<void> => {
+    const action = await popMenu(propertyMenuModel({ kind: 'assigned-row', name: d.name }))
 …
-          onRowMenu={(d, group) => void rowMenu(d, group)}
+          onRowMenu={(d) => void rowMenu(d)}

@@ Core/Actions/propertyMenu.test.ts @@

-  it('a registry row yields Rename only', () => {
-    expect(
-      propertyMenuModel({ kind: 'registry-row', name: 'Effort' }).map((i) => i.action),
-    ).toEqual(['property:rename'])
-  })

@@ Core/Properties/Schema/PropertyFrame.test.tsx — replaces 'a registry row offers Rename only (registry-row context)' @@

-  it('a registry row offers Rename only (registry-row context)', async () => {
+  it('a registry row opens no menu', async () => {
     useSession.setState({ tree: { config: { registry: [effortDef] } } as never })
-    propertyMenuSpy.mockResolvedValueOnce(null)
     await mountPane()
     …
-    expect(propertyMenuSpy).toHaveBeenCalledWith({
-      items: propertyMenuModel({ kind: 'registry-row', name: 'Effort' }),
-      anchor: undefined,
-    })
+    expect(propertyMenuSpy).not.toHaveBeenCalled()
   })

@@ Core/Properties/Schema/PropertyFrame.test.tsx — beside 'header ⊕ opens the type picker…' @@

+  it('creating a property lands back on the list with its row renaming; Enter commits the name', async () => {
+    await mountPane([...defs, { id: 'prop_new', name: 'New Text', type: 'text' }])
+    await act(async () => {
+      host.querySelector<HTMLButtonElement>('[aria-label="New Property"]')!.click()
+    })
+    await act(async () => {
+      ;[...host.querySelectorAll<HTMLElement>('[role="button"]')]
+        .find((el) => el.textContent === 'Text')!
+        .click()
+    })
+    const input = host.querySelector<HTMLInputElement>('.row-title-input')
+    expect(input?.value).toBe('New Text')
+    expect(document.activeElement).toBe(input)
+    await act(async () => {
+      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
+        input,
+        'Tags',
+      )
+      input!.dispatchEvent(new Event('input', { bubbles: true }))
+      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
+    })
+    expect(renameSpy).toHaveBeenCalledWith('prop_new', 'Tags')
+    expect(host.querySelector('.row-title-input')).toBeNull()
+  })

```

The `Text` type-picker query matches exactly one element in the frame. If jsdom leaves `activeElement` on `body` because the list slot is still inert when the input mounts, that's a real defect in the app too, and the focus is moved to land after the slide, noted under *§Deviations*.

**VERIFY**

- [ ] With the tests alone, `npx vitest run Core/Properties/Schema/PropertyFrame.test.tsx Core/Actions/propertyMenu.test.ts` → the create test fails on `input?.value` and the no-menu test fails on the spy; after the change both files are green and `grep -rn "registry-row" Core` → none.
- [ ] `npm run typecheck` · `npm run lint` exit 0.
- [ ] Commit: `git commit --only -m "…" -- Core/Actions/propertyMenu.ts Core/Actions/propertyMenu.test.ts Core/Properties/Schema/PropertyFrame.tsx Core/Properties/Schema/PropertyFrame.test.tsx`.

### Phase 3 — Documentation

#### Task 3.1

**TASK:** Correct PropertiesPM's registration clause and create sentence, and the decision log's G-6, G-7, and Core line.

**FILES:** `.claude/Features/PropertiesPM.md`, `.claude/Planning/Text Properties — Decision Log.md`

**NOW**

PropertiesPM's option-types paragraph lists three registration moments and its Property Frame paragraph ends the create sentence at "assigns here". The decision log's G-6 says only Text-typed keys are scanned and G-7 says a registry change re-indexes a Text key's holders; `extractPageIndex` takes no registry and `valueLinks` scans every string value, so neither is so.

**CHANGE**

- [ ] The two PropertiesPM sentences and the three decision-log lines, exactly as below.

**AFTER**

```diff

@@ .claude/Features/PropertiesPM.md — option types @@

-…is registered as an option when the file changes or comes into reach, when the property is assigned to the page's Collection, and for every file once the Nexus opens.
+…is registered as an option when the file changes or comes into reach, when the property is assigned to the page's Collection or the registry comes to name its key, and for every file once the Nexus opens.

@@ .claude/Features/PropertiesPM.md — The Property Frame @@

-The frame's `+` creates: it mints into the registry, seeds per-type options, and assigns here.
+The frame's `+` creates: it mints into the registry, seeds per-type options, assigns here, and returns to the list with the new row renaming.

@@ .claude/Planning/Text Properties — Decision Log.md — G-6, G-7 @@

-- **G-6:** [INFERRED] `extractPageIndex` (`indexSeed.ts:46`) reads the registry … until the next write re-indexes the page.
-- **G-7:** [INFERRED] A registry change that adds, renames, retypes, or deletes a Text definition re-indexes … without the body.
+- **G-6:** [CONFIRMED] `extractPageIndex` (`Core/Index/indexSeed.ts`) runs `valueLinks` (`Core/Connections/scan.ts`) over every string frontmatter value, under the page's own title and outline, and records the hits as `body` relations — on the seed and on `indexWrittenPage`'s per-write call alike. A whole-value `[[Page]]` stays a `frontmatter` mention, as `banner:` and a File value do.
+- **G-7:** [CONFIRMED] A registry change leaves the index as it is: the links inside a value are indexed when the page is read, so registering `Description` over existing `description:` values finds them already there.

@@ .claude/Planning/Text Properties — Decision Log.md — Core @@

-- Inside-value connections as body links: the registry-aware index with `body` relations and the re-derivation on registry change, the type-aware cascade with the page's outline, phantom on delete (G-1, …, G-8).
+- Inside-value connections as body links: the index's scan of string values into `body` relations, the type-aware cascade with the page's outline, phantom on delete (G-1, …, G-8).

```

**VERIFY**

- [ ] `grep -n "registry-aware\|re-index\|Only Text-typed" ".claude/Planning/Text Properties — Decision Log.md"` → none.
- [ ] Commit: `git commit --only -m "…" -- .claude/Features/PropertiesPM.md ".claude/Planning/Text Properties — Decision Log.md"`.

### Phase 4 — The Watch Harness And NexusOS

**GOAL:** A script attaches to the running app and prints, from data, what the registry and a Collection's values hold before and after a gesture. Then the three NexusOS gestures run through it, with the Description property kept.

#### Task 4.1

**TASK:** Export `attach(port)` from the drive harness and add `nexus-watch.mjs`, which attaches to a port, snapshots a Nexus, runs a gesture, and prints the delta.

**FILES:** `.claude/scripts/drive-harness.mjs`, `.claude/scripts/nexus-watch.mjs`, `.claude/scripts/README.md`

**NOW**

`drive-harness.mjs` connects over CDP only inside `launch`, which builds the app, backs up `~/Test`, and spawns a throwaway instance; `connect` reads the module's `port`. Nothing attaches to an instance already running.

**CHANGE**

- [ ] `export async function attach(debugPort)`: sets `port`, returns `{ cdp }` from `connect()`. `restore` stays a no-op when `launch` never ran (`backup` unset).
- [ ] `connect`'s target filter also accepts the Vite-served renderer (`http://localhost`), which the dev instance on 9333 shows instead of `app://`.
- [ ] `nexus-watch.mjs`: `node nexus-watch.mjs <port> <nexus> <collection> [gesture]`. It reads a snapshot — the registry file's defs as `name:type[options]`, each definition's holder count through `property:holders` (the count of files the definition resolves, which is the adoption signal: `view:loadValues` carries every raw key whether registered or not), the Collection sidecar's assigned names, and `view:loadValues` for the Collection reduced to `{pagePath: {key: value}}` — then, when a gesture is given, runs it and polls the snapshot every 500 ms until it stops changing (or 8 s), printing each key that moved as `± path.key: before → after`. Gestures: `ask <channel> <json args>` (one channel call), `write <rel> <frontmatterKey> <jsonValue>` (an outside edit through `fs`, as another editor would make), and none (print the snapshot and exit).
- [ ] README: one paragraph after the drive entry.

**AFTER**

```diff

@@ .claude/scripts/drive-harness.mjs — below launch @@

@@ .claude/scripts/drive-harness.mjs — connect @@

-    return list.find((t) => t.type === 'page' && t.url.startsWith('app://'))
+    return list.find(
+      (t) => t.type === 'page' && (t.url.startsWith('app://') || t.url.startsWith('http://localhost')),
+    )

+/** Attaches to an instance already listening on `debugPort` — the dev instance, whose renderer the Vite server serves — with no build, backup, or launch; `restore` then has nothing to put back. */
+export async function attach(debugPort) {
+  port = debugPort
+  return { cdp: await connect() }
+}

@@ .claude/scripts/nexus-watch.mjs — complete @@

+import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { parse, stringify } from 'yaml'
+import { ask, attach, FM, must, sleep } from './drive-harness.mjs'
+
+const [port, nexus, collection, gesture, ...rest] = process.argv.slice(2)
+if (!port || !nexus || !collection) {
+  console.error('usage: node nexus-watch.mjs <port> <nexus> <collection> [ask <channel> <json args> | write <rel> <key> <json value>]')
+  process.exit(2)
+}
+const { cdp } = await attach(Number(port))
+
+const json = (rel) => JSON.parse(readFileSync(join(nexus, rel), 'utf8'))
+// Page IDs read as their paths: the loaded values are keyed by ID, which no reader can recognize.
+const titles = new Map()
+for (const rel of readdirSync(join(nexus, collection), { recursive: true })) {
+  if (!rel.endsWith('.md')) continue
+  const id = /^ID:\s*(\S+)/m.exec(FM.exec(readFileSync(join(nexus, collection, rel), 'utf8'))?.[1] ?? '')?.[1]
+  if (id) titles.set(id, `${collection}/${rel}`)
+}
+async function snapshot() {
+  const { defs } = json('.nexus/properties.json')
+  const registry = Object.fromEntries(
+    Object.values(defs).map((d) => [d.name, `${d.type}[${(d.select_options ?? []).map((o) => o.value).join(', ')}]`]),
+  )
+  const assigned = (json(`${collection}/_pagecollection.json`).properties ?? []).map((id) => defs[id]?.name ?? id)
+  const holders = {}
+  for (const d of Object.values(defs))
+    holders[d.name] = (await ask(cdp, 'property:holders', d.id)).value ?? null
+  const values = await must('view:loadValues', ask(cdp, 'view:loadValues', collection))
+  const pages = Object.fromEntries(
+    Object.entries(values).map(([id, v]) => [titles.get(id) ?? id, v.frontmatter ?? {}]),
+  )
+  return { registry, holders, assigned: assigned.join(', '), pages }
+}
+const flat = (o, prefix = '', out = {}) => {
+  for (const [k, v] of Object.entries(o)) {
+    const key = prefix ? `${prefix}.${k}` : k
+    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out)
+    else out[key] = JSON.stringify(v)
+  }
+  return out
+}
+function printDelta(a, b) {
+  const before = flat(a), after = flat(b)
+  for (const k of new Set([...Object.keys(before), ...Object.keys(after)]))
+    if (before[k] !== after[k]) console.log(`± ${k}: ${before[k] ?? '∅'} → ${after[k] ?? '∅'}`)
+}
+
+const start = await snapshot()
+if (!gesture) {
+  console.log(JSON.stringify(start, null, 2))
+  cdp.close()
+  process.exit(0)
+}
+if (gesture === 'ask') console.log('reply', JSON.stringify(await ask(cdp, rest[0], ...JSON.parse(rest[1] ?? '[]'))))
+if (gesture === 'write') {
+  const file = join(nexus, rest[0])
+  const text = readFileSync(file, 'utf8')
+  const fm = parse(FM.exec(text)?.[1] ?? '') ?? {}
+  fm[rest[1]] = JSON.parse(rest[2])
+  writeFileSync(file, text.replace(FM, `---\n${stringify(fm)}---\n`))
+  console.log('wrote', rest[0])
+}
+let last = start
+for (let quiet = 0, i = 0; quiet < 3 && i < 16; i++) {
+  await sleep(500)
+  const next = await snapshot()
+  if (JSON.stringify(next) === JSON.stringify(last)) quiet++
+  else { quiet = 0; console.log(`— ${(i + 1) * 500} ms`); printDelta(last, next); last = next }
+}
+cdp.close()

@@ .claude/scripts/README.md — after the Option Picker Drive paragraph @@

+`nexus-watch.mjs` attaches to an app already running with a debug port and reads a Nexus as data: the registry's definitions with their options, how many files each definition resolves, a Collection's assigned properties, and the values its pages hold through `view:loadValues`. Given a gesture — one channel call, or an outside edit of a page's frontmatter key as another editor would make — it runs it and prints every value that moved, polling until the Nexus is still, so an adoption or a registration is read from the registry file and the loaded values rather than seen. It launches nothing and restores nothing; it reads the Nexus the app has open.

```

**VERIFY**

- [ ] `node .claude/scripts/nexus-watch.mjs 9333 ~/NexusOS Studio` prints the snapshot: Tags `multiSelect[Tasks, Ideas, Label]`, a holder count per definition, and the Athena skill pages' `description` under `pages`.
- [ ] Commit: `git add .claude/scripts/nexus-watch.mjs && git commit --only -m "…" -- .claude/scripts/drive-harness.mjs .claude/scripts/nexus-watch.mjs .claude/scripts/README.md`.

#### Task 4.2

**TASK:** Run the three NexusOS gestures through the watch script against an instance running Phase 1's main, and record the printed deltas in the Review Checkpoint.

**FILES:** none in the repo; `~/NexusOS` gains the Description property and the `.nexus/properties.json` entry for it.

**DEPENDENCIES:** Phase 1 committed, then the port-9333 instance stopped by its Electron PID and relaunched so main carries the detector.

**CHANGE**

- [ ] **Description, kept:** `ask schema:add '["Studio", {"id":"","name":"Description","type":"text"}]'`. Expected delta: `registry.Description: ∅ → text[]`, `holders.Description: ∅ → 4` (the four `Studio/Athena/II. Skills/*` pages the definition now resolves), and `assigned` gains Description, with no page written (mtimes unchanged). The `pages.*.description` lines don't move: the loaded values carried the raw key before the property existed.
- [ ] **Outside tags edit:** copy one Studio page holding `tags:` to the scratchpad, then `write "Studio/<that page>.md" tags '["Tasks","Harness"]'`. Expected: `registry.Tags: multiSelect[Tasks, Ideas, Label] → multiSelect[Tasks, Ideas, Label, Harness]` within the poll, and the page's `tags` value. Then revert: copy the page back byte-for-byte and `ask property:removeOption '["<tags id>", "Harness"]'`; the final snapshot equals the start except Description.
- [ ] **Color, kept, through the registry file:** write into `~/NexusOS/.nexus/properties.json` a definition `{ id: 'prop_<fresh ulid>', name: 'Color', type: 'multiSelect', icon: 'palette', select_options: [] }` with its id appended to `order`, and append the id to `Assets/_pagecollection.json`'s `properties`, as a sync or an editor would. Expected: `registry.Color: ∅ → multiSelect[]` then `→ multiSelect[Silver]` (the one value the 40 `Color:` keys on Assets pages hold), `holders.Color` the count of Assets pages holding the key, `assigned` for Assets gaining Color, no page written. Then color the one tag: edit the option in the registry file to `{ value: 'Silver', color: 'grey-3' }`. Priority stays foreign.

**VERIFY**

- [ ] Each delta printed by the script matches the expectation above, pasted into the checkpoint.
- [ ] `ls -l` mtimes of the four skill pages before and after are identical.

#### Review Checkpoint

- [x] Description adopted on NexusOS: the four descriptions in the loaded values, no page written. The script printed, at 500 ms, `± assigned: "…, Price" → "…, Price, Description"`, `± registry.Description: ∅ → "text[]"`, `± holders.Description: ∅ → 4`; the seven skill pages' mtimes compared identical before and after.
- [x] Outside `tags:` edit registered `Harness` and the picker's source (the registry) shows it; reverted cleanly. At 500 ms: `± registry.Tags: "multiSelect[Tasks, Ideas, Label]" → "multiSelect[Tasks, Ideas, Label, Harness]"` and the page's `tags: ["Ideas"] → ["Tasks","Harness"]`; at 2000 ms the page's loaded values gained `Priority: ""`, a key the page's backup doesn't hold, so a third writer added it about 1.5 s after the script's write; Obsidian was open on the vault and its Sapphire plugin defines Priority, which is the inferred writer. The page copied back byte-identical, then `property:removeOption` printed `± registry.Tags: … → "multiSelect[Tasks, Ideas, Label]"`; the final Studio snapshot differs from the start in Description alone.
- [x] Color arrived through the registry file, its members registered by the walk, every tag colored, the property kept with the palette icon. On the pre-plan instance the same sequence (sidecar first, then the registry) left `registry.Color: multiSelect[]` with `holders.Color: 40` and the Collection assigning it, and both files were restored byte-identical. On the new instance: the sidecar printed `± assigned: "Link, Price, Brand" → "…, prop_01M4EHWBQK170H1KPT2FR02RQH"`; the registry file printed, at 1000 ms, `± assigned: … → "Link, Price, Brand, Color"`, `± registry.Color: ∅ → "multiSelect[]"`, `± holders.Color: ∅ → 40`, and at 1500 ms `± registry.Color: "multiSelect[]" → "multiSelect[Black, Espresso, Navy, Silver, White, Stone, Mid-Grey, Taupe, Grey, Sage, Light Grey, Charcoal]"`. The 45 Assets pages' mtimes compared identical throughout. See *§Deviations* for the member count.
- [x] `~/Test` rename-adopt through the drive harness on port 9353: the drive's page held `tags: [alpha, beta]`, `labels: [gamma, delta]`, and a `description`; Tags read `Option 1, alpha, beta` after `property:rename` onto it, Labels `Option 1, gamma, delta` after `schema:add`, the Text value loaded, and the page file printed unchanged; `~/Test` restored.

### Completion Criteria

**Conformance**

- [x] `grep -rn "registerHeldOptions(" Core | grep -v test` → `optionOps.ts`, `handlers.ts`, `settle.ts` only.
- [x] `git diff --name-only 26437f229..HEAD` → the twelve files the plan names, `UIX/Menus/FrameSlide.tsx` and its test (the first Deviation), `Dashboard/Ledger/loc-history.json`, and this plan.

**Correctness**

- [x] Rename onto held pages, create over a holding Space, and a walked outside arrival each register in the same settle (the three settle tests).
- [x] Creating a property lands on the list with its row renaming, and All Properties rows open no menu (the frame tests).
- [x] NexusOS: Description's values live on creation with no page write; an outside `tags:` edit reaches the registry; Color arriving through the registry file registers Silver through the walk.

**Completeness**

- [x] Every task ticked; no scaffolding or debug output in `26437f229..HEAD`.

**Confirmation**

- [x] The five tests go red with their change reverted; every script delta read, not inferred.

**Continuity**

- [x] PropertiesPM and the decision log read true; the README lists the script.

**Confidence**

- [x] Gates green from clean on `26437f229..HEAD`; Baseline counts moved as planned.
- [x] Diff +44/−29 production lines, comments and tests excluded, plus the script.

### Final Verification

- [x] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4
- [x] All findings fixed or ruled on
- [x] Neutral verification passed on `26437f229..HEAD` (second pass, after the first failed on the create's focus)
- [x] Final pass: gates · baseline · diff · deviations · criteria
- [x] Reconciliation walked; living documents read
- [x] Report delivered

#### Reconciliation

- `Core/Nexus/fileEvents.ts` — `Owed.options`: "Spaces, and Collections that gained a property, …" — Task 1.2
- `Core/Nexus/settle.ts` — header: "the options the changed files hold registered" — Task 1.2
- `.claude/Features/PropertiesPM.md` — option types: "…when the property is assigned to the page's Collection, and for every file once the Nexus opens" — Task 3.1
- `.claude/Features/PropertiesPM.md` — The Property Frame: "The frame's `+` creates: … and assigns here." — Task 3.1
- `.claude/Planning/Text Properties — Decision Log.md` — G-6 "Only Text-typed keys are scanned", G-7 "re-indexes that key's holder files", Core "the registry-aware index … re-derivation on registry change" — Task 3.1
- `.claude/scripts/README.md` — no entry for the watch script — Task 4.1

#### Report & Closure

The skill's report shape, with the line-count delta (comments and tests excluded) and the run time.

### Open Items

- **A known gap, not closed:** a registry arriving from outside while an in-app registry write lands before the walk pays can leave an assigned Collection unowed until the next reopen. Closing it means holding an own create's definition out of the tree until the walk; left as is.

### Deviations

- **The list slot is live and shown in the render the create returns to it:** the plan's remedy was to begin the rename after the slide; what landed makes the slot live from that render instead, so nothing waits. `FrameSlide` lifted the root slot's `inert` and its `visibility: hidden` in effects after `open` flipped, so the rename input the create mounted called `focus()` while still inert and hidden, and Chromium left focus on `body` (the plan's foreseen case, read through a focus probe in a built instance on `~/Test`). The slot a flip is heading for is now live and shown from the render that chooses it (`UIX/Menus/FrameSlide.tsx`, `target`), for every FrameSlide consumer; a FrameSlide test probes what mounts in the destination slot on open and on close, the frame test records whether `focus()` ran inside an inert ancestor, and the same built-instance drive then read the input focused at every interval, `hue` committed by Enter, and `red, blue, teal` registered from the page and the Space with both files unchanged.
- **Color holds twelve members, not one:** the Assets pages write `Color:` as a list, so the `grep "^Color:"` count the plan read as 39 empty keys and one `Silver` was 40 list heads; the walk registered all twelve held members. Each was colored by its name (`Silver` → `grey-3` as ruled; the greys stepped from `White` → `grey-0` to `Black` → `grey-7`, `Navy` → `blue-7`, `Espresso` → `brown-7`, `Taupe` → `brown-3`, `Stone` → `brown-1`, `Sage` → `green-2`), applying the "color each tag" ruling to what the pages hold.
