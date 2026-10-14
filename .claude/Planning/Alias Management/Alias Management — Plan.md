## Alias Management — Implementation Plan

**DATE:** 10-14-2026
**STATUS:** Ratified 10-14-2026
**SOURCE:** The 10-14-2026 conversation with Nathan — the request, his answers (Manage-pane style, the side pane, list-only edits, Link-property aliases feed the memory, an optional count that the Aliases row shows, the row below Properties under a divider, a pane add landing at the bottom, the draft using the add-row primitives with its caret seated), and the write path left to this plan.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `56a15ac88` | 7764 passed · 2 skipped · 534 files | {MM-DD-YYYY h:mm AM/PM} | {MM-DD-YYYY h:mm AM/PM} |

### Context

A page remembers the aliases it has been given — `PageMeta.aliases`, a most-recent-first list in its `.nexus/metadata/MM-YYYY.json` entry. The only surface is the connection autocomplete's after-pipe list (`Core/MarkdownPM/Autocomplete/AutocompletePane.tsx`), which picks an alias into the text or forgets one through a hover ×; an alias is remembered when an authored alias slot is left (`aliasOnLeave` in `Core/MarkdownPM/Links/linkEdit.ts`). The list logic is two pure functions in `Core/Connections/aliasMemory.ts`, wired inside `buildEditorHost` (`Core/Pages/editorHost.tsx`) as `worn`/`wear`: the renderer computes the next whole list from the store's cached `tree.config.pageMetadata` and sends it through `setPageMeta`. Two edits issued before the host's push both read the same cached list, so the second resurrects what the first forgot. Link-property values naming a page (`[[Page|alias]]` in frontmatter) never reach the memory.

The settings window's `ManageRow` (`Core/Settings/ManageRow.tsx`) is a count, a filled Manage button, and a `PickerMenu` pane; Excluded Directories fills it with an editable list (`ExclusionPane` — `PathField` rows, a × each, a draft row, `FootingCreate`, `useEntrance` + `Reveal` arrival), and Open In Preview with the filter editor. The page's settings panel is `Core/Properties/PropertyPanel.tsx`, the body of the page dropdown (`Core/Pages/PageMenu.tsx`), a Space's dropdown, and the PageWindow's side pane (`Core/Interface/Windows/WindowTabBody.tsx`).

### Overview

A page gains an **Aliases** row — the alias glyph, "Aliases", its count, and Manage — below the Properties group under a divider, in the page dropdown and the PageWindow side pane alike. Manage opens a pane listing each alias in its own field: click one to rename it in place, × to forget it, and + to draft a new one, which discloses in with its caret seated and joins the end of the list. A name that repeats the page's title dims as it's typed, since it won't be kept. Edits change the remembered list only; link text already written is never touched.

Every alias write becomes an instruction — remember, add, rename, or forget — sent as the `editAliases` mutate op and applied by the host to the stored list inside the metadata shard's locked read-modify-write, after `property:editOption`'s precedent, so no surface can overwrite a newer list; `setPageMeta` stops carrying aliases. One pure function, `applyAliasEdit`, owns the rules: one alias per name whatever its case, the newest spelling standing, and the page's own title never an alias. The editor host, the new pane, and `assignValue` — which now remembers the alias a landed Link value shows — each send the op. `ManageRow` moves into `UIX/Menus` with an optional icon and count, Excluded Directories' list becomes the shared `ManageList` both panes render through, and `useOptionEdit`'s rename-key map becomes the shared `useRenameKeys` so a renamed row keeps its place in both.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `op` • Function | One variant of an `op`-tagged zod union, shared by the mutate request, option edits, and alias edits. | `Core/Files/decoders.ts` |
| `aliasEdit` / `AliasEdit` • Schema, Type | The four alias instructions: `remember`, `add`, `rename`, `forget`. | `Core/Connections/aliasMemory.ts` |
| `applyAliasEdit` • Function | A page's list after one instruction under the one rule set. | `Core/Connections/aliasMemory.ts` |
| `ALIAS_ICON` • Constant | `'square-split-horizontal'`, the alias glyph, typed `IconName` beside `DEFAULT_NEXUS_ICON`. | `Core/Assets/entityIconPolicy.ts` |
| `editAliases` • Mutate Op | `{ path, edit: AliasEdit }`, applied by the host. | `Core/Nexus/mutateRequest.ts` |
| `editPageAliases` • Function | The op's handler: resolves the page and applies the edit inside the shard's read-modify-write. | `Core/Nexus/pageMetadata.ts` |
| `useRenameKeys` • Hook | The key a row renamed in place keeps, hoisted from `useOptionEdit`. | `UIX/Animations/useRenameKeys.ts` |
| `trailingCluster` / `trailingFigure` • Styles | A trailing slot's control cluster and its secondary tabular figure, shared by `ManageRow` and the Nexus rows. | `UIX/Menus/menu-row.css.ts` |
| `ManageRow.tsx` • File | `ManageRow` (moved, with `icon`, an optional `count`, and `solid`), `ManageList`, and `ManageFieldProps`. | `UIX/Menus/ManageRow.tsx` |
| `manage-row.css.ts` • File | The pane inset and the list's column, row, and field. | `UIX/Menus/manage-row.css.ts` |
| `AliasesRow.tsx` • File | `AliasesRow` and its `AliasField`. | `Core/Pages/AliasesRow.tsx` |
| `AliasesRow.test.tsx` • File | The row and pane against a stubbed store. | `Core/Pages/AliasesRow.test.tsx` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `rememberAlias` / `forgetAlias` | Folded into `applyAliasEdit`. | `Core/Connections/aliasMemory.ts` |
| The local `op` and `edit` variant helpers | Replaced by the shared `op`. | `Core/Nexus/mutateRequest.ts`, `Core/Properties/optionModel.ts` |
| `aliases` in `setPageMeta`'s patch | Aliases travel only as `editAliases`. | `Core/Nexus/mutateRequest.ts` |
| `worn` / `wear` | The renderer-side list computation. | `Core/Pages/editorHost.tsx` |
| `ManageRow.tsx` | Moved to `UIX/Menus`. | `Core/Settings/ManageRow.tsx` |
| `settings-rows.css.ts` | Its styles moved to `menu-row.css.ts` and `manage-row.css.ts`. | `Core/Settings/settings-rows.css.ts` |
| `EXCLUDED_MIN_W` / `EXCLUDED_MAX_W` | The list's own bounds in `manage-row.css.ts`. | `Core/Settings/ExcludedDirectoriesRow.tsx` |
| The `alias` key map | Hoisted into `useRenameKeys`. | `Core/Properties/Schema/useOptionEdit.tsx` |

#### Constraints

- **Gates:** From the repo root, `npm run typecheck && npm run test && npm run lint && npm run build` — chained with `&&`, never piped; read `✓ built in` on every build and `Found N warnings` on lint, which runs clean (zero errors, warnings, infos, unformatted files). Biome formats every TS/CSS/JSON write; an Edit failing on whitespace means it reformatted — re-read and retry.
- **Frozen:** `EditorHost['aliases']` (`list` · `remember` · `forget` · `subscribe`, `Core/MarkdownPM/api.ts`); the on-disk shape (`aliases: string[]` in a shard entry, `pageMetaEntry`); the TS `PageMetaPatch` type and `copyPageMetadata`; the sync merge (`Core/Sync/Arrival/mergePolicy.ts`); link-text rewriting (`Core/Connections/rewrite.ts`, `connectionText`); `SettingsFieldRow`, `PathField`, `FilterFrame`; removal is instant everywhere (ruled in `827d0e6cf`) — no collapse-on-remove.
- **Conventions:**
  - No comments unless they establish a constraint the code can't show; docstrings follow the files they sit beside.
  - Relative imports inside `Core`; `@pommora/uix/…` paths for UIX; UIX imports nothing outside itself; a `*.css.ts` exports only serializable values.
  - Commit per task as soon as its gates pass, with `git commit --only -m "…" -- <paths>` (`git add` new files first), past-tense and one-to-four sentences. Tasks 1-1 through 1-3 share one commit: the contract they change spans all three, and none typechecks alone. The phases run in order in one tree.
  - User-facing copy this plan adds: the row label **Aliases**; aria-labels **Alias**, **Add alias**, **Remove alias**. The alias field shows no placeholder.
  - Out of scope everywhere: rewriting existing alias text; an add row in the body picker; `PageHeader.tsx`'s `title_icon` toggle (a scalar `setPageMeta` from the cache); Excluded Directories' write path; Excluded Directories' draft, which keeps resting until clicked, typed, or browsed (ruled 10-14-2026).
- **Shape:**
  - **Fix:** The race lives wherever a renderer composes the alias list; `editorHost.tsx` is the only whole-list alias writer (`setPageMeta` senders: `editorHost.tsx:56`, and `PageHeader.tsx:43` for `title_icon`), and after Phase 1 no renderer code computes an alias list.
  - **Refactor:** `ManageRow`/`ManageList` and `useRenameKeys` are proven by `ExclusionRows.test.tsx`, `PreviewRulesRow.test.tsx`, and `OptionEditor.test.tsx` passing with no change beyond import repoints, the stale removal comment, and the cases this plan adds.

#### Process Overview

- [ ] **Phase 1** — Alias Edits
  - [ ] Task 1-1
  - [ ] Task 1-2
  - [ ] Task 1-3
  - [ ] Task 1-4
  - [ ] Review Checkpoint
- [ ] **Phase 2** — The Shared Manage Row
  - [ ] Task 2-1
  - [ ] Task 2-2
  - [ ] Review Checkpoint
- [ ] **Phase 3** — The Aliases Row
  - [ ] Task 3-1
  - [ ] Task 3-2
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan's Visual Pass and Live Feel on the Aliases row and pane]`
- [ ] **Phase 4** — Documentation
  - [ ] Task 4-1

---

### Phase 1 — Alias Edits

**GOAL:** Aliases change only by instruction — applied by the host to the list the file holds, under one rule set — and every renderer that writes one sends the instruction: the editor host's remember and forget, and Link-property commits. This is the data contract the pane builds on, so it lands and is reviewed before Phase 3.

#### Task 1-1

**TASK:** Hoist the `op` variant helper into `Core/Files/decoders.ts`, and replace `rememberAlias`/`forgetAlias` with `aliasEdit` and `applyAliasEdit`.

**NOW:** `z.object({ op: z.literal(literal), ...fields })` is written twice — `op` in `mutateRequest.ts:47-48` and `edit` in `optionModel.ts:63-64`. `rememberAlias` trims and moves an alias to the front, deduplicating by exact string; `forgetAlias` removes an exact match; each returns `null` for no change. Case variants coexist, and nothing refuses an alias equal to the page's title.

**CHANGE**

- [ ] Rewrite `Core/Connections/aliasMemory.test.ts` for `applyAliasEdit` and watch it fail (title `'Alpha'` unless named):
  - remember: trims; a blank alias leaves the list; a new alias goes first; an existing one moves first; `'The Notes'` over `['my draft', 'the notes']` → `['The Notes', 'my draft']`; `'alpha'` leaves the list.
  - add: appends; `'Draft'` over `['draft', 'x']` → `['x', 'Draft']`; blank or `'ALPHA'` leaves the list.
  - rename: in place (`['a', 'b', 'c']`, `b → B2` → `['a', 'B2', 'c']`); into an existing alias, the renamed position stands (`c → A` → `['b', 'A']`); a case-only respell; an unknown `from`, a blank `to`, or a `to` folding to the title leaves the list.
  - forget: any spelling (`'THE NOTES'` forgets `'the notes'`); an unknown alias leaves the list.
  - tidying: any edit returns one spelling per name and no title (`['Plan', 'plan', 'Alpha']`, forget `'zzz'` → `['Plan']`).
- [ ] Add `op` to `decoders.ts`; delete the local helpers in `mutateRequest.ts` and `optionModel.ts`, importing `op` (in `optionModel.ts`, its six `edit(` calls become `op(`).
- [ ] Write `aliasMemory.ts` as below.

**AFTER**

```Core/Files/decoders.ts diff
+/** One variant of an `op`-tagged union: its tag and the fields it carries. */
+export const op = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
+  z.object({ op: z.literal(literal), ...fields })
```

```Core/Nexus/mutateRequest.ts diff
+import { op } from '../Files/decoders'
 …
-const op = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
-  z.object({ op: z.literal(literal), ...fields })
```

```Core/Properties/optionModel.ts diff
+import { op } from '../Files/decoders'
 …
-const edit = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
-  z.object({ op: z.literal(literal), ...fields })
 …
 export const optionEdit = z.discriminatedUnion('op', [
-  edit('add', { groupId, title: z.string(), atIndex: index.optional() }),
+  op('add', { groupId, title: z.string(), atIndex: index.optional() }),
   … the other five the same …
```

```Core/Connections/aliasMemory.ts diff
-export function rememberAlias(worn: string[], alias: string): string[] | null {
-  const words = alias.trim()
-  if (!words || worn[0] === words) return null
-  return [words, ...worn.filter((a) => a !== words)]
-}
-
-export function forgetAlias(worn: string[], alias: string): string[] | null {
-  return worn.includes(alias) ? worn.filter((a) => a !== alias) : null
-}
+import { z } from 'zod'
+import { op } from '../Files/decoders'
+import { normalizeTitle } from '../Paths/caseFold'
+
+const alias = z.string()
+
+export const aliasEdit = z.discriminatedUnion('op', [
+  op('remember', { alias }),
+  op('add', { alias }),
+  op('rename', { from: alias, to: alias }),
+  op('forget', { alias }),
+])
+export type AliasEdit = z.infer<typeof aliasEdit>
+
+/** Authoring moves an alias to the front, an add puts it at the end, and a rename keeps its place. One alias is one name whatever its case, the newest spelling standing, and a page's own title is never one; a list breaking either rule is tidied by its next edit. */
+export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
+  const own = normalizeTitle(title)
+  const held = worn.filter((a, i) => {
+    const key = normalizeTitle(a)
+    return key !== own && worn.findIndex((b) => normalizeTitle(b) === key) === i
+  })
+  const named = (e.op === 'rename' ? e.to : e.alias).trim()
+  const key = normalizeTitle(named)
+  const others = held.filter((a) => normalizeTitle(a) !== key)
+  if (e.op === 'forget') return others
+  if (!named || key === own) return held
+  switch (e.op) {
+    case 'remember':
+      return [named, ...others]
+    case 'add':
+      return [...others, named]
+    case 'rename': {
+      const from = normalizeTitle(e.from)
+      if (!held.some((a) => normalizeTitle(a) === from)) return held
+      return held.flatMap((a) =>
+        normalizeTitle(a) === from ? [named] : normalizeTitle(a) === key ? [] : [a],
+      )
+    }
+  }
+}
```

**VERIFY**

- [ ] `npx vitest run Core/Connections/aliasMemory.test.ts Core/Properties/optionModel.test.ts` is green, and each new alias case fails against the old functions.
- [ ] Check for unnecessary code or mistakes. (The gates run after Task 1-3, which removes the last imports of the old functions.)

#### Task 1-2

**TASK:** Add the `editAliases` mutate op, applied in the shard's read-modify-write, and drop `aliases` from `setPageMeta`'s patch.

**NOW:** `setPageMeta` accepts `aliases` as a whole list (`mutateRequest.ts:41-45`); `writePageMeta` resolves the page and calls `updatePageMetadata(root, id, patch)`, which applies a static patch inside `updateNexusFile` and writes nothing when the stabilized entry is unchanged (`pageMetadata.ts:107`).

**CHANGE**

- [ ] In `Core/Nexus/mutate.test.ts`, import `updatePageMetadata` and add `describe('handleMutate — editAliases')`; watch it fail:
  - seeded with `updatePageMetadata(root, A_ID, { aliases: ['A', 'B', 'C'] })`, two forgets (`A`, `B`) sent as two `handleMutate` calls before one `settleNow` — the race-free form at `mutate.test.ts:2317` — both land: the month reads `{ pages: { [A_ID]: { aliases: ['C'] } } }`;
  - an add lands at the end, and a rename in place;
  - remembering `'alpha'` on `Alpha.md` leaves the month's bytes as they were;
  - forgetting the last alias leaves no entry for the page.
- [ ] In the same file: the routine row `'a page meta write'` sends `patch: { title_icon: true }`; add `['an alias edit', { op: 'editAliases', path: 'Notes/Daily/Alpha.md', edit: { op: 'remember', alias: 'a' } }]`; add `{ op: 'editAliases', path: '.trash/Alpha.md', edit: { op: 'forget', alias: 'a' } }` to "targets the tree doesn't hold".
- [ ] Apply the diffs below.

**AFTER**

```Core/Nexus/mutateRequest.ts diff
+import { aliasEdit } from '../Connections/aliasMemory'
 …
-const pageMetaPatch: z.ZodType<Omit<PageMetaPatch, 'icon'>> = z.object({
-  aliases: z.array(z.string()).nullable().optional(),
+const pageMetaPatch: z.ZodType<Omit<PageMetaPatch, 'icon' | 'aliases'>> = z.object({
   title_icon: z.boolean().nullable().optional(),
   locked: z.literal(true).nullable().optional(),
-} satisfies { [K in Exclude<keyof PageMetaPatch, 'icon'>]: z.ZodType })
+} satisfies { [K in Exclude<keyof PageMetaPatch, 'icon' | 'aliases'>]: z.ZodType })
 …
   op('setPageMeta', { path: z.string(), patch: pageMetaPatch }),
+  op('editAliases', { path: z.string(), edit: aliasEdit }),
```

```Core/Nexus/pageMetadata.ts diff
+import { type AliasEdit, applyAliasEdit } from '../Connections/aliasMemory'
-import { metadataShardFile, type PageMeta, type PageMetaPatch } from './schemas'
+import { metadataShardFile, type PageMeta, type PageMetaPatch, pageMetaEntry } from './schemas'
 …
 @@ updatePageMetadata @@
 export async function updatePageMetadata(
   root: string,
   id: string,
-  patch: PageMetaPatch,
+  update: PageMetaPatch | ((had: PageMeta) => PageMetaPatch),
 ): Promise<Result<null>> {
   …
     (cur) => {
       const pages = { ...rawPages(cur) }
       const raw = pages[id]
       const had = isPlainObject(raw) ? raw : undefined
+      const patch = typeof update === 'function' ? update(pageMetaEntry.parse(had ?? {})) : update
       const entry = patchedEntry(had, patch)
 …
 @@ after writePageMeta @@
+
+export async function editPageAliases(
+  root: string,
+  relPath: string,
+  e: AliasEdit,
+): Promise<MutateReply> {
+  const page = pageAt(await liveTreeOf(root), relPath)
+  if (!page) return NOT_HELD
+  const written = await updatePageMetadata(root, page.id, (had) => {
+    const next = applyAliasEdit(had.aliases ?? [], e, page.title)
+    return { aliases: next.length ? next : null }
+  })
+  return done(written)
+}
```

```Core/Nexus/mutate.ts diff
-import { writePageMeta } from './pageMetadata'
+import { editPageAliases, writePageMeta } from './pageMetadata'
 …
     case 'setPageMeta':
       return writePageMeta(root, req.path, req.patch)
 
+    case 'editAliases':
+      return editPageAliases(root, req.path, req.edit)
+
```

**VERIFY**

- [ ] `npx vitest run Core/Nexus/mutate.test.ts Core/Nexus/pageMetadata.test.ts Core/Sync/Arrival/mergePolicy.test.ts Core/Contract/engineGraph.test.ts` is green, the last three unchanged; the concurrent-forget case goes red with `editPageAliases` rewritten to apply its edit to a list read before the lock.
- [ ] Check for unnecessary code or mistakes. (The gates run after Task 1-3.)

#### Task 1-3

**TASK:** Send the editor host's remember and forget as `editAliases`, move the harness onto `applyAliasEdit`, and draw the picker's alias glyph from `ALIAS_ICON`.

**NOW:** `editorHost.tsx:50-58` computes the list from the cache and dials `setPageMeta` directly with `reportRefusal`; `editorHarness.ts:80-92` runs the old pure pair; `AutocompletePane.tsx:105` inlines `square-split-horizontal`.

**CHANGE**

- [ ] Rewrite `describe('the alias memory')` in `Core/Pages/editorHost.test.ts` and watch it fail: a forget sends `{ op: 'editAliases', path: 'Notes/Alpha.md', edit: { op: 'forget', alias: 'the notes' } }`, and a remember `{ op: 'remember', alias: 'the plan' }`; the subscribe assertions stay. "An unchanged gesture writes nothing" goes — the host decides that, and Task 1-2 proves it.
- [ ] Apply the diffs below.

**AFTER**

```Core/Pages/editorHost.tsx diff
-import { persist, reportRefusal } from '../Interface/Notifications/notifications'
+import { persist } from '../Interface/Notifications/notifications'
 …
-import { forgetAlias, rememberAlias } from '../Connections/aliasMemory'
+import type { AliasEdit } from '../Connections/aliasMemory'
 …
 @@ buildEditorHost @@
   const state = useSession.getState
-  const worn = (id: string): string[] => pageMetaOf(id)(state())?.aliases ?? []
-  const wear = (id: string, next: string[] | null): void => {
-    const tree = state().tree
-    const path = tree && pagesByIdOf(tree).get(id)?.path
-    if (next && path)
-      void dialer()
-        .ask('mutate', { op: 'setPageMeta', path, patch: { aliases: next.length ? next : null } })
-        .then(reportRefusal)
-  }
+  const editAliases = (id: string, edit: AliasEdit): void => {
+    const s = state()
+    const path = s.tree && pagesByIdOf(s.tree).get(id)?.path
+    if (path) void s.mutate({ op: 'editAliases', path, edit })
+  }
   return {
 …
     aliases: {
-      list: worn,
-      remember: (id, alias) => wear(id, rememberAlias(worn(id), alias)),
-      forget: (id, alias) => wear(id, forgetAlias(worn(id), alias)),
+      list: (id) => pageMetaOf(id)(state())?.aliases ?? [],
+      remember: (id, alias) => editAliases(id, { op: 'remember', alias }),
+      forget: (id, alias) => editAliases(id, { op: 'forget', alias }),
       subscribe: (cb) =>
```

```Core/Testing/editorHarness.ts diff
-import { forgetAlias, rememberAlias } from '../Connections/aliasMemory'
+import { type AliasEdit, applyAliasEdit } from '../Connections/aliasMemory'
 …
   const worn = (id: string): string[] => state.aliases[id] ?? []
-  const wear = (id: string, next: string[] | null): void => {
-    if (!next) return
-    state.aliases[id] = next
+  // A harness page has no title for an alias to fold to.
+  const wear = (id: string, edit: AliasEdit): void => {
+    state.aliases[id] = applyAliasEdit(worn(id), edit, '')
     for (const cb of watchers) cb()
   }
 …
-      remember: (id, alias) => wear(id, rememberAlias(worn(id), alias)),
-      forget: (id, alias) => wear(id, forgetAlias(worn(id), alias)),
+      remember: (id, alias) => wear(id, { op: 'remember', alias }),
+      forget: (id, alias) => wear(id, { op: 'forget', alias }),
```

```Core/Assets/entityIconPolicy.ts diff
 export const DEFAULT_NEXUS_ICON: IconName = 'pommora'
+
+export const ALIAS_ICON: IconName = 'square-split-horizontal'
```

```Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
+import { ALIAS_ICON } from '../../Assets/entityIconPolicy'
 …
-              <Icon name="square-split-horizontal" size="body" />
+              <Icon name={ALIAS_ICON} size="body" />
```

```Core/MarkdownPM/Links/linkEdit.ts diff
-/** Authoring is the only moment the memory is written: a body scan can't honor a real forget. */
+/** A body reaches the memory only where an alias is authored: a scan of bodies can't honor a real forget. */
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
-  // A forgotten alias bumps the epoch, which is what shrinks the list under an unchanged query.
+  // An edit to the remembered aliases bumps the epoch, which is what reshapes the list under an unchanged query.
```

**VERIFY**

- [ ] `editorHost.test.ts` is green; `connectionCommit.test.tsx`, `linkEdit.test.tsx`, and `aliasPicker.test.tsx` are green unchanged.
- [ ] `editorHost.tsx` still imports `dialer` for its prefs, clipboard, and menu calls and `pagesByIdOf` for `pageTitle`, and holds nothing else alias-related.
- [ ] Run the gates, then commit Tasks 1-1 through 1-3 together.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-4

**TASK:** Remember the alias a landed Link value shows, from `assignValue`.

**NOW:** `assignValue` (`Core/Properties/assignValue.ts`) is the one renderer constructor of `setProperty` — PropertyPanel, Table and Cards through `useViewHost`, and `entityMenuActions`, each writer's `mutate` being the store's — and undo's `revert` calls `write()` directly. `readLinkText` reads a markdown link's label as its alias, so `[Alpha](Alpha.md)` shows `Alpha` for `Alpha`. No Link-property path reaches the memory.

**CHANGE**

- [ ] In `Core/Properties/assignValue.test.ts`, add a describe and watch it fail, with a `link` definition in the schema and `useSession.setState({ tree: makeTree() })` (page `p1`, `Alpha`, at `Notes/Alpha.md`), asserting on the writer's `mutate` mock:
  - committing `[[Alpha|the notes]]` sends `setProperty`, then `{ op: 'editAliases', path: 'Notes/Alpha.md', edit: { op: 'remember', alias: 'the notes' } }` once the write lands;
  - a refused write (`mutate` resolving `null` for the `setProperty`), an undo of the commit, a phantom title (`[[Missing|x]]`), an unaliased `[[Alpha]]`, and a markdown `[Alpha](Alpha.md)` send no `editAliases`.
- [ ] Apply the diff below.

**AFTER**

```Core/Properties/assignValue.ts diff
+import { readLinkText } from '../Connections/linkValue'
+import { pageIndexOf } from '../Nexus/treeIndex'
+import { normalizeTitle } from '../Paths/caseFold'
 import { pushUndo } from '../Session/undo'
+import { useSession } from '../Session/store'
 …
+// A landed Link value showing an alias for a page gives that page the alias, as authoring one in a body does; a markdown label that repeats the title shows none.
+function rememberedAlias(value: PropertyValue | null): MutateRequest | null {
+  const target = value?.kind === 'link' ? readLinkText(value.value) : null
+  if (target?.kind !== 'page' || !target.alias) return null
+  if (normalizeTitle(target.alias) === normalizeTitle(target.title)) return null
+  const tree = useSession.getState().tree
+  const named = tree ? pageIndexOf(tree).resolve(target.title) : null
+  const page = named?.status === 'resolved' ? named.page : undefined
+  return page
+    ? { op: 'editAliases', path: page.path, edit: { op: 'remember', alias: target.alias } }
+    : null
+}
 …
 @@ assignValue @@
   let landed: boolean | null = null
   void pending.then((ok) => {
     landed = ok
+    const remember = ok && rememberedAlias(value)
+    if (remember) void w.mutate(remember)
   })
```

**VERIFY**

- [ ] The new describe is green, and every pre-existing `assignValue.test.ts` case is green unchanged.
- [ ] `Core/Session/sliceGraph.test.ts` is green.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] `applyAliasEdit` is the only place the alias rules live, its branches read as one rule set (front / end / in place / every spelling), and no case refuses or tidies in a way the tests don't name.
- [ ] Concurrent edits on one page both land, proven by the test rather than by argument.
- [ ] No renderer file computes an alias list or sends `aliases`: `setPageMeta` accepts none, and `grep -rn "applyAliasEdit" Core` finds only `aliasMemory.ts`, `pageMetadata.ts`, `editorHarness.ts`, and tests.
- [ ] The remember-on-commit rule fires only on a landed commit — never on undo or a refusal — and skips a markdown label repeating the title.
- [ ] `EditorHost['aliases']` is unchanged, and the picker refreshes on any alias edit through `subscribe`.

### Phase 2 — The Shared Manage Row

**GOAL:** `ManageRow` and the Manage pane's list live once in `UIX/Menus`, and a renamed row keeps its key everywhere a list renames in place. Phase 3 is their third consumer; Excluded Directories, Open In Preview, and the option editor prove the move changed nothing they don't name.

#### Task 2-1

**TASK:** Hoist `useOptionEdit`'s rename-key map into `UIX/Animations/useRenameKeys.ts` and adopt it there.

**NOW:** `useOptionEdit.tsx:67-79` holds an `alias` map from a renamed value to the key it had, pruned once the value has been seen and gone, held while the option editor still edits it; `rename` sets it before the write and deletes it on refusal.

**CHANGE**

- [ ] Create `useRenameKeys.ts` and replace the map in `useOptionEdit`.

**AFTER**

```UIX/Animations/useRenameKeys.ts diff
+import { useRef } from 'react'
+
+/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. */
+export function useRenameKeys(
+  values: readonly string[],
+  holding?: string,
+): {
+  keyOf: (value: string) => string
+  rename: (from: string, to: string) => void
+  revert: (to: string) => void
+} {
+  const renamed = useRef(new Map<string, { key: string; seen: boolean }>())
+  const present = new Set(values)
+  for (const [value, entry] of renamed.current) {
+    if (present.has(value)) entry.seen = true
+    else if (entry.seen && value !== holding) renamed.current.delete(value)
+  }
+  const keyOf = (value: string): string => {
+    const key = renamed.current.get(value)?.key
+    return key !== undefined && !present.has(key) ? key : value
+  }
+  return {
+    keyOf,
+    rename: (from, to) => void renamed.current.set(to, { key: keyOf(from), seen: false }),
+    revert: (to) => void renamed.current.delete(to),
+  }
+}
```

```Core/Properties/Schema/useOptionEdit.tsx diff
+import { useRenameKeys } from '@pommora/uix/Animations/useRenameKeys'
 …
-  const alias = useRef(new Map<string, { key: string; seen: boolean }>())
-  const values = new Set(options.map((o) => o.value))
-  for (const [title, entry] of alias.current) {
-    if (values.has(title)) entry.seen = true
-    else if (entry.seen && title !== editing?.value) alias.current.delete(title)
-  }
+  const keys = useRenameKeys(
+    options.map((o) => o.value),
+    editing?.value,
+  )
+  const { keyOf } = keys
 …
-  const keyOf = (value: string): string => {
-    const key = alias.current.get(value)?.key
-    return key !== undefined && !values.has(key) ? key : value
-  }
 …
 @@ rename @@
-    alias.current.set(title, { key: keyOf(row), seen: false })
+    keys.rename(row, title)
 …
-      alias.current.delete(title)
+      keys.revert(title)
```

**VERIFY**

- [ ] `OptionEditor.test.tsx`, `PropertyFrame.test.tsx`, and `PropertyPicker.pane.test.tsx` are green unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** Move `ManageRow` into `UIX/Menus/ManageRow.tsx` beside the extracted `ManageList`, give `AccessoryButton` an `onMouseDown`, and repoint every consumer.

**NOW:** `ManageRow` wraps `SettingsFieldRow` with `settings-rows.css`'s `manageCluster`, `count`, and `managePane`; `ExclusionPane` hand-builds its list from `paneList`, `paneRow`, and `field`, with the `navTrailSegment` tone rule, and sizes its pane through `EXCLUDED_MIN_W`/`EXCLUDED_MAX_W`; `NexusRows.tsx` borrows `count` (the Nexus ID) and `manageCluster` (the Server row). A × pressed while its row's field is editing takes the focus first, so the field commits before the removal lands.

**CHANGE**

- [ ] In `Core/Settings/ExclusionRows.test.tsx`, add and watch fail: "renaming a folder keeps its row's node" (the `[data-reveal]` holding `Archive` is the same element after the tree pushes `['Renamed', 'Vault A']`), and "a × press keeps the field's focus" (its `mousedown` is `defaultPrevented`). In "the remove control writes the list without that entry", drop the stale "Removal collapses first" comment and its `transitionend` dispatch.
- [ ] Apply the diffs below; delete `Core/Settings/ManageRow.tsx` and `Core/Settings/settings-rows.css.ts`.

**AFTER**

```UIX/Menus/menu-row.css.ts diff
+export const trailingCluster = style({ display: 'inline-flex', alignItems: 'center', gap: '8px' })
+
+export const trailingFigure = style([
+  text.control.standard,
+  { color: c.label.secondary, fontVariantNumeric: 'tabular-nums' },
+])
```

```UIX/Menus/manage-row.css.ts diff
+import { globalStyle, style } from '@vanilla-extract/css'
+import { segment as navTrailSegment } from '../Elements/nav-trail.css'
+import { vars as colorVars } from '../Theme/color.css'
+
+export const pane = style({ padding: 'var(--surface-inset)' })
+
+export const list = style({
+  display: 'flex',
+  flexDirection: 'column',
+  gap: '6px',
+  minWidth: 'calc(250px - 2 * var(--surface-inset))',
+  maxWidth: 'calc(500px - 2 * var(--surface-inset))',
+})
+
+export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })
+
+export const field = style({ flex: '1 1 auto', minWidth: 0 })
+
+globalStyle(`${row} ${navTrailSegment}`, { color: colorVars.color.label.control })
```

```UIX/Menus/MenuRows.tsx diff
 @@ AccessoryButton @@
   reveal,
+  onMouseDown,
   ref,
 }: {
 …
   reveal?: boolean
+  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void
   ref?: Ref<HTMLButtonElement>
 }): React.JSX.Element {
   return (
     <Button
 …
+      onMouseDown={onMouseDown}
```

```UIX/Menus/ManageRow.tsx diff
+import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
+import { Reveal } from '../Animations/Reveal'
+import { useEntrance } from '../Animations/useEntrance'
+import { useRenameKeys } from '../Animations/useRenameKeys'
+import { Button } from '../Buttons/Button'
+import { PickerMenu } from '../Pickers/PickerMenu'
+import { Icon, type IconName } from '../Symbols'
+import { MenuRowView } from './MenuIndex'
+import { AccessoryButton, FootingCreate } from './MenuRows'
+import { trailingCluster, trailingFigure } from './menu-row.css'
+import * as s from './manage-row.css'
+
+/** A row whose value is a list edited in its own pane: its count where it shows one, and Manage to open the pane. */
+export function ManageRow({
+  label,
+  hint,
+  icon,
+  count,
+  solid,
+  style,
+  children,
+}: {
+  label: string
+  hint?: string
+  icon?: IconName
+  count?: number
+  /** Stacked over another glass surface, as a picker opened from a menu is. */
+  solid?: boolean
+  style?: CSSProperties
+  children: ReactNode
+}): React.JSX.Element {
+  const [open, setOpen] = useState(false)
+  const triggerRef = useRef<HTMLButtonElement>(null)
+  return (
+    <MenuRowView
+      row={{
+        kind: 'item',
+        icon: icon ? <Icon name={icon} size="control" /> : undefined,
+        label,
+        caption: hint,
+        trailing: {
+          kind: 'field',
+          children: (
+            <span className={trailingCluster}>
+              {count !== undefined && <span className={trailingFigure}>{count}</span>}
+              <Button
+                ref={triggerRef}
+                type="filled"
+                label="Manage"
+                pressed={open}
+                onClick={() => setOpen((o) => !o)}
+              />
+              <PickerMenu
+                open={open}
+                onDismiss={() => setOpen(false)}
+                triggerRef={triggerRef}
+                solid={solid}
+                bareSurface
+                contentClassName={s.pane}
+                style={style}
+              >
+                {children}
+              </PickerMenu>
+            </span>
+          ),
+        },
+      }}
+    />
+  )
+}
+
+export interface ManageFieldProps {
+  value: string
+  onCommit: (next: string) => void
+  /** Present on the row being drafted, for a field that closes its draft when left unwritten. */
+  onCancel?: () => void
+}
+
+const keepFocus = (e: { preventDefault: () => void }): void => e.preventDefault()
+
+/** A Manage pane's list: each value in its own field beside a × that removes it, and + drafting one more at the end, which closes once its value is written. An empty value is never written, so × is the only removal, and × keeps the focus, so it discards an edit in progress rather than committing it; a rename keeps its row. */
+export function ManageList({
+  values,
+  noun,
+  field,
+  onAdd,
+  onRename,
+  onRemove,
+}: {
+  values: readonly string[]
+  noun: string
+  field: (props: ManageFieldProps) => ReactNode
+  onAdd: (value: string) => Promise<boolean>
+  onRename: (from: string, to: string) => Promise<boolean>
+  onRemove: (value: string) => void
+}): React.JSX.Element {
+  const [drafting, setDrafting] = useState(false)
+  const keys = useRenameKeys(values)
+  const entering = useEntrance(values, keys.keyOf)
+  const add = async (value: string): Promise<void> => {
+    if (value && (await onAdd(value))) setDrafting(false)
+  }
+  const rename = (from: string, to: string): void => {
+    if (!to) return
+    keys.rename(from, to)
+    void onRename(from, to).then((ok) => ok || keys.revert(to))
+  }
+  const row = (props: ManageFieldProps, remove: () => void): React.JSX.Element => (
+    <div className={s.row}>
+      <span className={s.field}>{field(props)}</span>
+      <AccessoryButton
+        icon="x"
+        size="control"
+        ariaLabel={`Remove ${noun}`}
+        onMouseDown={keepFocus}
+        onClick={remove}
+      />
+    </div>
+  )
+  return (
+    <div className={s.list}>
+      {values.map((value) => (
+        <Reveal key={keys.keyOf(value)} open enterOnMount={entering(keys.keyOf(value))} fill>
+          {row({ value, onCommit: (next) => rename(value, next) }, () => onRemove(value))}
+        </Reveal>
+      ))}
+      {drafting && (
+        <Reveal open enterOnMount fill>
+          {row(
+            { value: '', onCommit: (next) => void add(next), onCancel: () => setDrafting(false) },
+            () => setDrafting(false),
+          )}
+        </Reveal>
+      )}
+      <FootingCreate
+        ariaLabel={`Add ${noun}`}
+        disabled={drafting}
+        onClick={() => setDrafting(true)}
+      />
+    </div>
+  )
+}
```

```Core/Settings/ExcludedDirectoriesRow.tsx diff
 import { reportRefusal } from '../Interface/Notifications/notifications'
 import { useState } from 'react'
 import { PathField } from '@pommora/uix/Fields/PathField'
-import { AccessoryButton, FootingCreate } from '@pommora/uix/Menus/MenuRows'
-import { Reveal } from '@pommora/uix/Animations/Reveal'
-import { useEntrance } from '@pommora/uix/Animations/useEntrance'
+import { ManageList, ManageRow } from '@pommora/uix/Menus/ManageRow'
 import { useSession } from '../Session/store'
-import { ManageRow } from './ManageRow'
-import * as x from './settings-rows.css'
 import { dialer } from '../Platform/dialer'
-
-const EXCLUDED_MIN_W = 250
-const EXCLUDED_MAX_W = 500
 …
-    <ManageRow
-      label={label}
-      hint={hint}
-      count={count}
-      style={{ minWidth: EXCLUDED_MIN_W, maxWidth: EXCLUDED_MAX_W }}
-    >
+    <ManageRow label={label} hint={hint} count={count}>
       <ExclusionPane />
     </ManageRow>
 …
 @@ ExclusionPane @@
   const stored = useSession((s) => s.tree?.config.excluded ?? [])
-  const [drafting, setDrafting] = useState(false)
   const [busy, setBusy] = useState(false)
-  const entering = useEntrance(stored, (f) => f)
 
   // One write in flight at a time — the pane reads the list back through the tree, so a second edit on the stale list would undo the first.
   const commit = async (list: string[]): Promise<boolean> => { …unchanged… }
-  // Emptying a field is accepted, not a delete — the row stays; only the × removes.
-  const rename = (folder: string, next: string): void => { … }
-  const commitDraft = async (next: string): Promise<void> => { … }
   const browse = (apply: (picked: string) => void): void => { …unchanged… }
-
-  const fieldRow = ( … ) => ( … )
-
-  return (
-    <div className={x.paneList}>
-      … the mapped Reveal rows, the draft, and FootingCreate …
-    </div>
-  )
+  return (
+    <ManageList
+      values={stored}
+      noun="exclusion"
+      onAdd={(folder) => commit([...stored, folder])}
+      onRename={(from, to) => commit(stored.map((f) => (f === from ? to : f)))}
+      onRemove={(folder) => void commit(stored.filter((f) => f !== folder))}
+      field={({ value, onCommit }) => (
+        <PathField
+          label="Excluded folder"
+          value={value}
+          empty="No folder"
+          onCommit={onCommit}
+          onBrowse={() => browse(onCommit)}
+        />
+      )}
+    />
+  )
 }
```

```Core/Settings/PreviewRulesRow.tsx diff
-import { ManageRow } from './ManageRow'
+import { ManageRow } from '@pommora/uix/Menus/ManageRow'
```

```Core/Settings/NexusRows.tsx diff
-import * as x from './settings-rows.css'
+import { trailingCluster, trailingFigure } from '@pommora/uix/Menus/menu-row.css'
 …
-        <span className={x.count}>{nexusId}</span>
+        <span className={trailingFigure}>{nexusId}</span>
 …
-            <span className={x.manageCluster}>
+            <span className={trailingCluster}>
```

```Core/Settings/PreviewRulesRow.test.tsx diff
-import { count } from './settings-rows.css'
+import { trailingFigure } from '@pommora/uix/Menus/menu-row.css'
 …
-    expect(host.getElementsByClassName(count)[0]?.textContent).toBe('2')
+    expect(host.getElementsByClassName(trailingFigure)[0]?.textContent).toBe('2')
```

**VERIFY**

- [ ] `ExclusionRows.test.tsx` (with its two new cases), `PreviewRulesRow.test.tsx`, and `NexusRows.test.tsx` are green.
- [ ] `grep -rn "settings-rows.css\|Settings/ManageRow" Core` finds nothing.
- [ ] Run the gates; `npm run build` confirms the moved `*.css.ts` builds.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Excluded Directories and Open In Preview behave as before in every test; Excluded Directories' only changes are the kept row on rename, a × that discards an edit in progress, and a + that stays enabled while a write is in flight — an add the busy gate refuses leaves its draft open.
- [ ] `ManageList` holds no Excluded-Directories behavior (browse, `emptyCommits`, the busy gate stay in `ExclusionPane`), and `ManageRow.tsx` imports nothing outside UIX.
- [ ] `useRenameKeys` is the one rename-key map (`grep -rn "seen: boolean" Core UIX`), and `op` the one variant helper.

### Phase 3 — The Aliases Row

**GOAL:** The page panel shows the Aliases row below Properties under a divider, in the dropdown and the window side pane, and its pane adds, renames, and forgets through `editAliases` on Phase 2's list. This is the surface Nathan checks by hand.

#### Task 3-1

**TASK:** Let `InputField` dim text that won't be kept, and build `Core/Pages/AliasesRow.tsx`.

**NOW:** `EditableInput` takes `invalid` — "Dims text that won't commit" — but `RenamableLabel` and `InputField`'s `FieldEdit` don't pass it through. Nothing outside the body picker reads or edits a page's aliases.

**CHANGE**

- [ ] Write `Core/Pages/AliasesRow.test.tsx` and watch it fail, mounting `AliasesRow` for `{ id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }` over `makeTree({ pageMetadata: { p1: { aliases: ['the plan', 'Q3 doc'] } } })`, with `window.nexus` stubbed to record `mutate`; query fields by `input[aria-label="Alias"]` while editing, since the wrapper and the input both carry the label then:
  - the row reads "Aliases" and the count `2`;
  - Manage opens a pane with one field per alias;
  - + adds a row whose input is `document.activeElement`; typing `roadmap` and Enter sends `{ op: 'editAliases', path: 'Notes/Alpha.md', edit: { op: 'add', alias: 'roadmap' } }` and closes the draft;
  - Escape on an empty draft closes it and sends nothing;
  - typing `alpha` into the draft marks the input `aria-invalid="true"`;
  - committing `the plan` → `The Plan` sends `{ op: 'rename', from: 'the plan', to: 'The Plan' }`;
  - "Remove alias" on `Q3 doc` sends `{ op: 'forget', alias: 'Q3 doc' }`.
- [ ] Apply the diffs below.

**AFTER**

```UIX/Fields/RenamableLabel.tsx diff
   emptyCommits,
+  invalid,
   onBegin,
 …
   emptyCommits?: boolean
+  invalid?: (text: string) => boolean
   onBegin?: () => void
 …
       required={!emptyCommits}
+      invalid={invalid}
       onCommit={(next) => (next !== value ? onCommit(next) : onCancel())}
```

```UIX/Fields/InputField.tsx diff
 @@ FieldEdit @@
   emptyCommits?: boolean
+  /** Dims text that won't be kept as it's typed. */
+  invalid?: (text: string) => boolean
 …
           emptyCommits={edit.emptyCommits}
+          invalid={edit.invalid}
```

```Core/Pages/AliasesRow.tsx diff
+import { useState } from 'react'
+import { InputField } from '@pommora/uix/Fields/InputField'
+import { type ManageFieldProps, ManageList, ManageRow } from '@pommora/uix/Menus/ManageRow'
+import { Icon } from '@pommora/uix/Symbols'
+import { ALIAS_ICON } from '../Assets/entityIconPolicy'
+import type { AliasEdit } from '../Connections/aliasMemory'
+import { normalizeTitle } from '../Paths/caseFold'
+import { pageMetaOf, useSession } from '../Session/store'
+
+export function AliasesRow({
+  page,
+}: {
+  page: { id: string; path: string; title: string }
+}): React.JSX.Element {
+  const aliases = useSession(pageMetaOf(page.id))?.aliases ?? []
+  const mutate = useSession((s) => s.mutate)
+  const edit = async (e: AliasEdit): Promise<boolean> =>
+    (await mutate({ op: 'editAliases', path: page.path, edit: e })) !== null
+  return (
+    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid>
+      <ManageList
+        values={aliases}
+        noun="alias"
+        field={(props) => <AliasField {...props} title={page.title} />}
+        onAdd={(alias) => edit({ op: 'add', alias })}
+        onRename={(from, to) => edit({ op: 'rename', from, to })}
+        onRemove={(alias) => void edit({ op: 'forget', alias })}
+      />
+    </ManageRow>
+  )
+}
+
+// A draft opens editing with its caret seated, and leaving it unwritten cancels it.
+function AliasField({
+  value,
+  onCommit,
+  onCancel,
+  title,
+}: ManageFieldProps & { title: string }): React.JSX.Element {
+  const [editing, setEditing] = useState(onCancel !== undefined)
+  return (
+    <InputField
+      chrome="bordered"
+      label="Alias"
+      leading={<Icon name={ALIAS_ICON} size="body" />}
+      edit={{
+        value,
+        onCommit,
+        renames: 'row',
+        invalid: (text) => normalizeTitle(text) === normalizeTitle(title),
+        editing,
+        onEditingChange: (next) => {
+          setEditing(next)
+          if (!next) onCancel?.()
+        },
+      }}
+    >
+      {value}
+    </InputField>
+  )
+}
```

**VERIFY**

- [ ] `AliasesRow.test.tsx` is green, and each case goes red with its handler removed; `InputField.test.tsx` and `EditableInput.test.tsx` are green unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Mount the row in `PropertyPanel` for page subjects, below the Properties group under a divider.

**NOW:** `PropertyPanel`'s rows column (`s.pageRows` in the dropdown, `s.panelRows`, the scroll region, in the side pane) holds the Contexts and Properties groups; a Space subject shares it. The panel's `title` is `subject.title ?? fetchedTitle`, loaded with the frontmatter before `body()` renders.

**CHANGE**

- [ ] In `Core/Properties/PropertyPanel.test.tsx`, add "a page shows its Aliases row after the Properties group, and a Space shows none" — both page hosts, the row's text following the last group's in document order — and watch it fail.
- [ ] Apply the diff below.

**AFTER**

```Core/Properties/PropertyPanel.tsx diff
-import { AccessoryButton, MenuItem, heading, menuDropLine } from '@pommora/uix/Menus'
+import { AccessoryButton, MenuItem, MenuSeparator, heading, menuDropLine } from '@pommora/uix/Menus'
 …
+import { AliasesRow } from '../Pages/AliasesRow'
 …
 @@ body @@
             )
           })}
+          {subject.kind === 'page' && (
+            <>
+              <MenuSeparator />
+              <AliasesRow page={{ id: subject.id, path: subject.path, title }} />
+            </>
+          )}
         </div>
```

**VERIFY**

- [ ] `PropertyPanel.test.tsx` is green, the new case included.
- [ ] Live over CDP on `~/Test` (`env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`): the row shows in the page dropdown and the PageWindow side pane, scrolls with the groups in the side pane, and is absent from a Space's dropdown; add, rename, and forget each update the count, and the body picker offers the same list after each; × on a typed draft discards it; the draft opens downward without nudging the pane's scroll — if Chromium scrolls the `Reveal`'s clip to the focused input, `EditableInput` focuses with `{ preventScroll: true }` and the case is recorded. Screenshot both hosts for Nathan, then stop the instance by exact PID.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] The row and its pane read as the panel's own: one icon size with the property rows, a solid pane like the panel's pickers, and the same Manage, count, and list vocabulary as the settings window.
- [ ] `PropertyPanel` gained only the mount; no alias logic lives in Properties beyond `assignValue`'s remember.
- [ ] The draft discloses on `Reveal`'s arrival, seats its caret, and closes on Enter, Escape, or ×.

### Phase 4 — Documentation

**GOAL:** The living documents describe the shipped behavior; nothing describes alias management as future work or the old write path.

#### Task 4-1

**TASK:** Reconcile every document *§Reconciliation* names, then recount `ContextPM.md:50`'s fire-and-forget sites.

**NOW:** See *§Reconciliation*.

**CHANGE**

- [ ] `ConnectionsPM.md` — rewrite the **Alias memory** paragraph to cover: the list written where an alias is authored (a body's alias slot, or a Link value that comes to show one) and managed from the page's Aliases row (an add joins the end, a rename keeps its place, × forgets, link text is never rewritten); authoring moves an alias to the front; one alias per name whatever its case, the newest spelling standing; the page's own title never one; every edit applied by the host to the stored list. Remove the **Alias management** prospect.
- [ ] `PropertiesPM.md` — **The Properties Panel:** a page's panel ends, past a divider, with the Aliases row (pointing to ConnectionsPM); a Space's has none. The Link-value paragraph gains that a landed value showing an alias for a page gives the page that alias.
- [ ] `InterfacePM.md` — the Page Window's SidePane sentence gains the Aliases row below the two groups.
- [ ] `PommoraUIX.md` — Menus: the file list names `ManageRow.tsx` and `manage-row.css.ts`; a **Manage** row lists `ManageRow` · `ManageList` · `ManageFieldProps`; the Row classes row gains `trailingCluster` · `trailingFigure`. Animations: an **Arrival** row lists `useEntrance` · `useRenameKeys`.
- [ ] `ContextPM.md:50` — drop "the alias memory's `setPageMeta`" and set the count to the `void dialer().ask(` sites the tree holds.
- [ ] `Planning/Cross-Device Mutation Checklist.md:41` — the route reads `Core/Nexus/mutate.ts` `editAliases` → `Core/Nexus/pageMetadata.ts` `editPageAliases`, and the row covers adding and renaming.

**AFTER**

Each paragraph reads whole, in the document's existing voice, with no amendment notes.

**VERIFY**

- [ ] `grep -rn "Alias management\|alias memory's \`setPageMeta\`" .claude` finds nothing.
- [ ] Each edited paragraph re-read in full.

---

### Completion Criteria

- **Conformance:** The implementation follows *§Constraints*, CLAUDE.md's hard rules, and Nathan's rulings; `ManageRow`/`ManageList`, `useRenameKeys`, `op`, and `applyAliasEdit` are each the one definition of their concept; nothing outside the named files changed.
- **Correctness:** In the running app, the Aliases row appears below Properties under a divider in the page dropdown and the PageWindow side pane and not for a Space; its pane adds (to the end, caret seated), renames in place, and forgets; the body picker offers the same list after each; a Link value committed with an alias adds it; two quick forgets both land.
- **Completeness:** Every task is ticked; no TODOs, scaffolding, or debug output.
- **Confirmation:** Every new test goes red without its change; Nathan's Visual Pass and Live Feel carry his word.
- **Continuity:** *§Reconciliation* is walked and the documents read true.
- **Confidence:** Gates green from a clean state over `{baseline}..HEAD`; the diff is near the plan's size (code roughly +220 / −120), growth past it reported.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3 · Phase 4
- [ ] Simplification lens → adversarial lens (opus-high) over `{baseline}..HEAD`
- [ ] Neutral verification (opus-high) over `{baseline}..HEAD`
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

- `Core/Connections/aliasMemory.test.ts` — exact-case `rememberAlias`/`forgetAlias` semantics — Task 1-1
- `Core/Nexus/mutate.test.ts:3213-3216` — the routine `setPageMeta` row carrying `aliases` — Task 1-2
- `Core/Pages/editorHost.test.ts:170-206` — the `setPageMeta` alias patches and "an unchanged gesture writes nothing" — Task 1-3
- `Core/MarkdownPM/Links/linkEdit.ts:140` — "Authoring is the only moment the memory is written" — Task 1-3
- `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:90` — "A forgotten alias bumps the epoch" — Task 1-3
- `Core/Settings/ManageRow.tsx:7` — "A settings row whose value is a list…" (moved and rewritten) — Task 2-2
- `Core/Settings/ExclusionRows.test.tsx` — "Removal collapses first; the write fires when the fold's transition ends" (stale since `827d0e6cf`) — Task 2-2
- `Core/Settings/PreviewRulesRow.test.tsx:12` — `count` from `./settings-rows.css` — Task 2-2
- `.claude/Features/ConnectionsPM.md:64` — "The list is written when an alias is authored…" — Task 4-1
- `.claude/Features/ConnectionsPM.md:80` — the **Alias management** prospect — Task 4-1
- `.claude/Features/PropertiesPM.md:119` — "It holds two groups, Contexts and Properties" — Task 4-1
- `.claude/Features/PropertiesPM.md:82` — a Link value's alias carried through, with no memory — Task 4-1
- `.claude/Features/InterfacePM.md:64` — the side pane as "contexts and properties in two groups" — Task 4-1
- `.claude/Features/PommoraUIX.md` Menus and Animations — no `ManageRow`, `ManageList`, trailing styles, `useEntrance`, or `useRenameKeys` — Task 4-1
- `.claude/ContextPM.md:50` — "the alias memory's `setPageMeta`" among `void dialer().ask(…)` sites, and its count — Task 4-1
- `.claude/Planning/Cross-Device Mutation Checklist.md:41` — the alias route through `setPageMeta` — Task 4-1

#### Open Items

- None.

#### Deviations
