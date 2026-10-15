## Alias Management — Implementation Plan

**DATE:** 10-14-2026
**STATUS:** Ratified 10-14-2026
**SOURCE:** The 10-14-2026 conversation with Nathan — the request, his answers (Manage-pane style, the side pane, list-only edits, Link-property aliases feed the memory, an optional count that the Aliases row shows, the row below Properties under a divider, a pane add landing at the bottom, the draft using the add-row primitives with its caret seated), his redirect once the pane was built (the Aliases pane and the body picker share one alias list of menu rows — an always-visible ×, a double-click or right-click Rename, a right-click Delete, and + in both — with the body picker's single-click insert held for the double-click window and Excluded Directories keeping its path fields), and the write path left to this plan.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `56a15ac88` | 7764 passed · 2 skipped · 534 files | 10-14-2026 6:13 PM | {MM-DD-YYYY h:mm AM/PM} |

### Context

A page remembers the aliases it has been given — `PageMeta.aliases`, a most-recent-first list in its `.nexus/metadata/MM-YYYY.json` entry. The only surface is the connection autocomplete's after-pipe list (`Core/MarkdownPM/Autocomplete/AutocompletePane.tsx`), which picks an alias into the text or forgets one through a hover ×; an alias is remembered when an authored alias slot is left (`aliasOnLeave` in `Core/MarkdownPM/Links/linkEdit.ts`). The list logic is two pure functions in `Core/Connections/aliasMemory.ts`, wired inside `buildEditorHost` (`Core/Pages/editorHost.tsx`) as `worn`/`wear`: the renderer computes the next whole list from the store's cached `tree.config.pageMetadata` and sends it through `setPageMeta`. Two edits issued before the host's push both read the same cached list, so the second resurrects what the first forgot. Link-property values naming a page (`[[Page|alias]]` in frontmatter) never reach the memory.

The settings window's `ManageRow` (`Core/Settings/ManageRow.tsx`) is a count, a filled Manage button, and a `PickerMenu` pane; Excluded Directories fills it with an editable list (`ExclusionPane` — `PathField` rows, a × each, a draft row, `FootingCreate`, `useEntrance` + `Reveal` arrival), and Open In Preview with the filter editor. The page's settings panel is `Core/Properties/PropertyPanel.tsx`, the body of the page dropdown (`Core/Pages/PageMenu.tsx`), a Space's dropdown, and the PageWindow's side pane (`Core/Interface/Windows/WindowTabBody.tsx`).

### Overview

A page gains an **Aliases** row — the alias glyph, "Aliases", its count, and Manage — below the Properties group under a divider, in the page dropdown and the PageWindow side pane alike. Manage opens a pane listing the aliases as the body picker does — the same rows, from one component: × deletes an alias, a double-click or the row menu's Rename renames it in place, the row menu's Delete deletes it, + drafts a new one, which discloses in with its caret seated and joins the end of the list, and a drag reorders the list. The body picker gains the same edits; there a single click still inserts the alias, once the double-click window passes, and an edit in the picker returns the caret to the alias slot. A name that repeats the page's title dims as it's typed, since it won't be kept. Edits change the remembered list only; link text already written is never touched.

Every alias write becomes an instruction — add, rename, move, or forget — sent as the `editAliases` mutate op and applied by the host to the stored list inside the metadata shard's locked read-modify-write, after `property:editOption`'s precedent, so no surface can overwrite a newer list; `setPageMeta` stops carrying aliases. One pure function, `applyAliasEdit`, owns the rules: one alias per name whatever its case, the newest spelling standing, the page's own title and any name a link can't carry never an alias, and the order the user's — a used alias keeps its place and a new one joins the end. The editor host's one `edit`, the shared list, and `assignValue` — which now remembers the alias a landed Link value newly shows — each send the op, and every surface reads the list through `heldAliases`, so it shows what the rules keep. `ManageRow` moves into `UIX/Menus` with an optional icon and count and a menu pane, the list-edit mechanics — a draft at the end that keeps its row once written, a rename that keeps its row — become `useListEdit`, which `AliasList` and Excluded Directories' list share, and `useOptionEdit`'s rename-key map becomes the shared `useRenameKeys` beneath it.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `op` • Function | One variant of an `op`-tagged zod union, shared by the mutate request, option edits, and alias edits. | `Core/Files/decoders.ts` |
| `aliasEdit` / `AliasEdit` • Schema, Type | The four alias instructions: `add`, `rename`, `move`, `forget`. | `Core/Connections/aliasMemory.ts` |
| `heldAliases` • Function | A page's list as the rules hold it — one spelling per name, never its title — read by every surface and by `applyAliasEdit`. | `Core/Connections/aliasMemory.ts` |
| `applyAliasEdit` • Function | A page's list after one instruction under the one rule set. | `Core/Connections/aliasMemory.ts` |
| `ALIAS_ICON` • Constant | `'square-split-horizontal'`, the alias glyph, typed `IconName` beside `DEFAULT_NEXUS_ICON`. | `Core/Assets/entityIconPolicy.ts` |
| `editAliases` • Mutate Op | `{ path, edit: AliasEdit }`, applied by the host. | `Core/Nexus/mutateRequest.ts` |
| `editPageAliases` • Function | The op's handler: resolves the page and applies the edit inside the shard's read-modify-write. | `Core/Nexus/pageMetadata.ts` |
| `useRenameKeys` • Hook | The key a row renamed in place keeps, hoisted from `useOptionEdit`. | `UIX/Animations/useRenameKeys.ts` |
| `trailingCluster` / `trailingFigure` • Styles | A trailing slot's control cluster and its secondary tabular figure, shared by `ManageRow` and the Nexus rows. | `UIX/Menus/menu-row.css.ts` |
| `ManageRow.tsx` • File | `ManageRow` (moved, with `icon`, an optional `count`, `solid`, and `menu`). | `UIX/Menus/ManageRow.tsx` |
| `useListEdit` / `ListRow` • Hook, Type | A list edited in place: rows keyed through `useRenameKeys`, a draft at the end, await-before-close, and revert on refusal. | `UIX/Menus/useListEdit.ts` |
| `manage-row.css.ts` • File | The Manage pane's bounds, and the inset of a pane that isn't menu rows. | `UIX/Menus/manage-row.css.ts` |
| `excluded-directories.css.ts` • File | Excluded Directories' field list: its column, row, and field. | `Core/Settings/excluded-directories.css.ts` |
| `keepFocus` • Function | A press that leaves the focus where it is unless it lands in a field, shared by every control that mustn't commit a field it sits beside. | `UIX/Interactions/shared.ts` |
| `AliasList.tsx` • File | `AliasList`, the one alias list the body picker and the Aliases pane render, and `AliasHost`, what it edits through. | `Core/MarkdownPM/Autocomplete/AliasList.tsx` |
| `ALIAS_ROW_MENU` / `AliasRowAction` • Constant, Type | An alias row's menu: Rename, then Delete. | `Core/Actions/aliasRowMenu.ts` |
| `menus.alias` • Host Member | The editor's way to open an alias row's menu. | `Core/MarkdownPM/api.ts` |
| `inCaretPane` / `paneHeld` / `holdPane` • Function, State | Whether focus sits in an editor's own caret pane, and the editor holding its place while an edit runs there. | `Core/MarkdownPM/Menus/caretPane.tsx` |
| `AliasesRow.tsx` • File | `AliasesRow`, the page panel's row over `AliasList`. | `Core/Pages/AliasesRow.tsx` |
| `AliasesRow.test.tsx` • File | The row and pane against a stubbed store. | `Core/Pages/AliasesRow.test.tsx` |
| `Alias Drive/live-drive.mjs` • File | The live drive of the alias lists, the body picker, Excluded Directories, the option editor, and Filter, asserting each gesture's writes and recording its cost. | `.claude/scripts/Alias Drive/` |
| `aliasFits` • Function | Whether a link's alias slot can carry a name, read by `connectionText` and `keepsAlias`. | `Core/Connections/connections.ts` |
| `keepsAlias` • Function | Whether a page can hold a name as an alias: one a link carries, never its title — the host's rule and the list's dim. | `Core/Connections/aliasMemory.ts` |
| `index` • Schema | A position in a list, shared by the alias move, option edits, views, and trash records. | `Core/Files/decoders.ts` |
| `ruleFrame` • Style | A pane of rule rows draws compact wherever it's hosted. | `UIX/Menus/frames.css.ts` |
| `watch` / `measure` • Functions | A gesture's distinct file writes, its input-to-paint and input-to-disk latency, and its render cost, shared by every drive. | `.claude/scripts/drive-harness.mjs` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `rememberAlias` / `forgetAlias` | Folded into `applyAliasEdit`. | `Core/Connections/aliasMemory.ts` |
| The local `op` and `edit` variant helpers | Replaced by the shared `op`. | `Core/Nexus/mutateRequest.ts`, `Core/Properties/optionModel.ts` |
| `aliases` in `setPageMeta`'s patch | Aliases travel only as `editAliases`. | `Core/Nexus/mutateRequest.ts` |
| `worn` / `wear` | The renderer-side list computation. | `Core/Pages/editorHost.tsx` |
| `ManageRow.tsx` | Moved to `UIX/Menus`. | `Core/Settings/ManageRow.tsx` |
| `settings-rows.css.ts` | Its styles moved to `menu-row.css.ts`, `manage-row.css.ts`, and `excluded-directories.css.ts`. | `Core/Settings/settings-rows.css.ts` |
| `EXCLUDED_MIN_W` / `EXCLUDED_MAX_W` | The Manage pane's bounds in `manage-row.css.ts`. | `Core/Settings/ExcludedDirectoriesRow.tsx` |
| `ManageRow`'s `style` and Open In Preview's `minWidth` | The one set of Manage pane bounds. | `UIX/Menus/ManageRow.tsx`, `Core/Settings/PreviewRulesRow.tsx` |
| The private `keepFocus` and its inline twins | The shared `keepFocus`. | `UIX/Pickers/PickerMenu.tsx`, `UIX/Pickers/PickerControl.tsx`, `UIX/Menus/MenuRows.tsx` |
| The `navTrailSegment` tone rule | `PathField`'s `option` trail already sets the tone. | `Core/Settings/settings-rows.css.ts` |
| The `alias` key map | Hoisted into `useRenameKeys`. | `Core/Properties/Schema/useOptionEdit.tsx` |
| `remember` / `forget` on `EditorHost['aliases']` | Replaced by `edit(id, AliasEdit)`. | `Core/MarkdownPM/api.ts` |
| An alias row's `forget` closure and hover `HoverRemove` | `AliasList`'s always-visible ×. | `Core/MarkdownPM/Autocomplete/autocomplete.ts`, `AutocompletePane.tsx` |

#### Constraints

- **Gates:** From the repo root, `npm run typecheck && npm run test && npm run lint && npm run build` — chained with `&&`, never piped; read `✓ built in` on every build and `Found N warnings` on lint, which runs clean (zero errors, warnings, infos, unformatted files). Biome formats every TS/CSS/JSON write; an Edit failing on whitespace means it reformatted — re-read and retry.
- **Frozen:** the on-disk shape (`aliases: string[]` in a shard entry, `pageMetaEntry`); the TS `PageMetaPatch` type and `copyPageMetadata`; the sync merge (`Core/Sync/Arrival/mergePolicy.ts`); link-text rewriting (`Core/Connections/rewrite.ts`, `connectionText`); `SettingsFieldRow`, `PathField`; removal is instant everywhere (ruled in `827d0e6cf`) — no collapse-on-remove.
- **Conventions:**
  - No comments unless they establish a constraint the code can't show; docstrings follow the files they sit beside.
  - Relative imports inside `Core`; `@pommora/uix/…` paths for UIX; UIX imports nothing outside itself; a `*.css.ts` exports only serializable values.
  - Commit per task as soon as its gates pass, with `git commit --only -m "…" -- <paths>` (`git add` new files first), past-tense and one-to-four sentences. Tasks 1-1 through 1-3 share one commit, as do Tasks 3-1 through 3-3: the contract each group changes spans its tasks, and none typechecks alone. The phases run in order in one tree.
  - User-facing copy this plan adds: the row label **Aliases**; the row menu's **Rename** and **Delete**; aria-labels **Alias**, **Add alias**, **Delete alias**. The alias field shows no placeholder.
  - Out of scope everywhere: rewriting existing alias text; opening the body picker's alias stage for a page with no aliases yet; `PageHeader.tsx`'s `title_icon` toggle (a scalar `setPageMeta` from the cache); Excluded Directories' write path; Excluded Directories' draft, which keeps resting until clicked, typed, or browsed (ruled 10-14-2026).
- **Shape:**
  - **Fix:** The race lives wherever a renderer composes the alias list; `editorHost.tsx` is the only whole-list alias writer (`setPageMeta` senders: `editorHost.tsx:56`, and `PageHeader.tsx:43` for `title_icon`), and after Phase 1 no renderer code computes an alias list.
  - **Refactor:** `ManageRow`, `useListEdit`, and `useRenameKeys` are proven by `ExclusionRows.test.tsx`, `PreviewRulesRow.test.tsx`, and `OptionEditor.test.tsx` passing with no change beyond import repoints, the stale removal comment, and the cases this plan adds.
  - **Accepted:** a mouse click on a body-picker alias row inserts once the double-click window (`PICK_DELAY_MS`, 300ms) passes; keyboard picks stay immediate (ruled 10-14-2026). The body picker's list stays filtered by what's typed after the pipe, so an alias added or renamed there that doesn't match it lands on the page without showing in that list.

#### Process Overview

- [x] **Phase 1** — Alias Edits
  - [x] Task 1-1
  - [x] Task 1-2
  - [x] Task 1-3
  - [x] Task 1-4
  - [x] Review Checkpoint
- [x] **Phase 2** — The Shared Manage Row
  - [x] Task 2-1
  - [x] Task 2-2
  - [x] Review Checkpoint
- [ ] **Phase 3** — The Shared Alias Picker
  - [x] Task 3-1
  - [x] Task 3-2
  - [x] Task 3-3
  - [x] Task 3-4
  - [x] Task 3-5
  - [x] Task 3-6
  - [x] Task 3-7
  - [ ] Task 3-8
  - [ ] Review Checkpoint
- [ ] `[Visual Pass: the drive's screenshots of the Aliases pane and the body picker go to Nathan, whose eyes are the one check awaiting]`
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
  - tidying: `heldAliases(['Plan', 'plan', 'Alpha', 'x'], 'alpha')` → `['Plan', 'x']`; any edit returns one spelling per name and no title (`['Plan', 'plan', 'Alpha']`, forget `'zzz'` → `['Plan']`).
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
+/** One alias is one name whatever its case, and a page's own title is never one; a list breaking either rule reads tidied, and its next edit stores it so. */
+export function heldAliases(worn: readonly string[], title: string): string[] {
+  const seen = new Set([normalizeTitle(title)])
+  return worn.filter((a) => {
+    const key = normalizeTitle(a)
+    if (seen.has(key)) return false
+    seen.add(key)
+    return true
+  })
+}
+
+/** Authoring moves an alias to the front, an add puts it at the end, and a rename keeps its place, the newest spelling standing. */
+export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
+  const own = normalizeTitle(title)
+  const held = heldAliases(worn, title)
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
+  return done(
+    await updatePageMetadata(root, page.id, (had) => {
+      const next = applyAliasEdit(had.aliases ?? [], e, page.title)
+      return { aliases: next.length ? next : null }
+    }),
+  )
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

- [ ] Rewrite `describe('the alias memory')` in `Core/Pages/editorHost.test.ts` and watch it fail: a forget sends `{ op: 'editAliases', path: 'Notes/Alpha.md', edit: { op: 'forget', alias: 'the notes' } }`, and a remember `{ op: 'remember', alias: 'the plan' }`; `list` over `['the notes', 'The Notes', 'alpha']` reads `['the notes']`; the subscribe assertions stay. "An unchanged gesture writes nothing" goes — the host decides that, and Task 1-2 proves it.
- [ ] Apply the diffs below.

**AFTER**

```Core/Pages/editorHost.tsx diff
-import { persist, reportRefusal } from '../Interface/Notifications/notifications'
+import { persist } from '../Interface/Notifications/notifications'
 …
-import { forgetAlias, rememberAlias } from '../Connections/aliasMemory'
+import { type AliasEdit, heldAliases } from '../Connections/aliasMemory'
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
+  const pageOf = (id: string) => {
+    const tree = state().tree
+    return tree ? pagesByIdOf(tree).get(id) : undefined
+  }
+  const editAliases = (id: string, edit: AliasEdit): void => {
+    const path = pageOf(id)?.path
+    if (path) void state().mutate({ op: 'editAliases', path, edit })
+  }
   return {
 …
     aliases: {
-      list: worn,
-      remember: (id, alias) => wear(id, rememberAlias(worn(id), alias)),
-      forget: (id, alias) => wear(id, forgetAlias(worn(id), alias)),
+      list: (id) => heldAliases(pageMetaOf(id)(state())?.aliases ?? [], pageOf(id)?.title ?? ''),
+      remember: (id, alias) => editAliases(id, { op: 'remember', alias }),
+      forget: (id, alias) => editAliases(id, { op: 'forget', alias }),
       subscribe: (cb) =>
 …
-    pageTitle: () => {
-      const tree = state().tree
-      return (pageId && tree && pagesByIdOf(tree).get(pageId)?.title) ?? null
-    },
+    pageTitle: () => (pageId && pageOf(pageId)?.title) ?? null,
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
- [ ] `editorHost.tsx` still imports `dialer` for its prefs, clipboard, and menu calls, and holds nothing alias-related beyond `editAliases` and `list`.
- [ ] Run the gates, then commit Tasks 1-1 through 1-3 together.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-4

**TASK:** Remember the alias a landed Link value newly shows, from `assignValue`.

**NOW:** `assignValue` (`Core/Properties/assignValue.ts`) is the one renderer constructor of `setProperty` — PropertyPanel, Table and Cards through `useViewHost`, and `entityMenuActions`, each writer's `mutate` being the store's — and undo's `revert` calls `write()` directly. `readLinkText` reads a markdown link's label as its alias, so `[Alpha](Alpha.md)` shows `Alpha` for `Alpha`. No Link-property path reaches the memory.

**CHANGE**

- [ ] In `Core/Properties/assignValue.test.ts`, add a describe and watch it fail, with a `link` definition in the schema and `useSession.setState({ tree: makeTree() })` (page `p1`, `Alpha`, at `Notes/Alpha.md`), asserting on the writer's `mutate` mock:
  - over a prior `[[Alpha|old]]`, committing `[[Alpha|the notes]]` sends `setProperty`, then `{ op: 'editAliases', path: 'Notes/Alpha.md', edit: { op: 'remember', alias: 'the notes' } }` once the write lands, and `[[Alpha|Old]]` remembers `'Old'`;
  - a refused write (`mutate` resolving `null` for the `setProperty`), an undo of the commit, a phantom title (`[[Missing|x]]`), an unaliased `[[Alpha]]`, and the alias the prior already showed (`[[Alpha#Intro|old]]`, as a retarget carries it) send no `editAliases`.
- [ ] Apply the diff below.

**AFTER**

```Core/Properties/assignValue.ts diff
+import { readLinkText } from '../Connections/linkValue'
+import { pageIndexOf } from '../Nexus/treeIndex'
 import { pushUndo } from '../Session/undo'
+import { useSession } from '../Session/store'
 …
+// A landed Link value newly showing an alias for a page gives that page the alias, as authoring one in a body does.
+function rememberedAlias(
+  value: PropertyValue | null,
+  prior: PropertyValue | null,
+): MutateRequest | null {
+  const target = value?.kind === 'link' ? readLinkText(value.value) : null
+  if (target?.kind !== 'page' || !target.alias) return null
+  if (prior?.kind === 'link' && readLinkText(prior.value)?.alias === target.alias) return null
+  const tree = useSession.getState().tree
+  const page = tree && pageIndexOf(tree).resolve(target.title).page
+  return page
+    ? { op: 'editAliases', path: page.path, edit: { op: 'remember', alias: target.alias } }
+    : null
+}
 …
 @@ assignValue @@
   let landed: boolean | null = null
   void pending.then((ok) => {
     landed = ok
+    const remember = ok && rememberedAlias(value, prior)
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
- [ ] The remember-on-commit rule fires only on a landed commit newly showing its alias — never on undo, a refusal, or an alias the prior value already showed — and leaves the title rule to the host.
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

**TASK:** Move `ManageRow` into `UIX/Menus/ManageRow.tsx` beside the extracted `ManageList`, give `AccessoryButton` an `onMouseDown`, share `keepFocus`, and repoint every consumer. A draft is keyed through `useRenameKeys` for the value it writes, so it keeps its row wherever the value lands before the reply, as a `mutate` push does; a reply landing first, as Excluded Directories' `exclusions:set` does, closes it as before.

**NOW:** `ManageRow` wraps `SettingsFieldRow` with `settings-rows.css`'s `manageCluster`, `count`, and `managePane`; `ExclusionPane` hand-builds its list from `paneList`, `paneRow`, and `field`, with the `navTrailSegment` tone rule, and sizes its pane through `EXCLUDED_MIN_W`/`EXCLUDED_MAX_W`; `NexusRows.tsx` borrows `count` (the Nexus ID) and `manageCluster` (the Server row). A × pressed while its row's field is editing takes the focus first, so the field commits before the removal lands. A written draft unmounts and its value arrives as a fresh row, so the bottom row drops out and re-expands. `PickerMenu` holds a private `keepFocus`, and `PickerControl` and `MenuRows`' back row write the same `preventDefault` inline.

**CHANGE**

- [ ] In `Core/Settings/ExclusionRows.test.tsx`, add and watch fail: "renaming a folder keeps its row's node" (the `[data-reveal]` holding `Archive` is the same element after the tree pushes `['Renamed', 'Vault A']`) and "a × press keeps the field's focus" (its `mousedown` is `defaultPrevented`). In "the remove control writes the list without that entry", drop the stale "Removal collapses first" comment and its `transitionend` dispatch.
- [ ] Apply the diffs below; delete `Core/Settings/ManageRow.tsx` and `Core/Settings/settings-rows.css.ts`.

**AFTER**

```UIX/Menus/menu-row.css.ts diff
+export const trailingCluster = style({ display: 'inline-flex', alignItems: 'center', gap: '8px' })
+
+export const trailingFigure = style([text.control.standard, { fontVariantNumeric: 'tabular-nums' }])
```

```UIX/Menus/manage-row.css.ts diff
+import { style } from '@vanilla-extract/css'
+
+export const pane = style({ padding: 'var(--surface-inset)', minWidth: '250px', maxWidth: '500px' })
+
+export const list = style({ display: 'flex', flexDirection: 'column', gap: '6px' })
+
+export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })
+
+export const field = style({ flex: '1 1 auto', minWidth: 0 })
```

```UIX/Interactions/shared.ts diff
+/** A press that leaves the focus where it is, so a field it sits beside neither blurs nor commits. */
+export const keepFocus = (e: { preventDefault: () => void }): void => e.preventDefault()
```

```UIX/Pickers/PickerMenu.tsx diff
+import { keepFocus } from '../Interactions/shared'
 …
-const keepFocus = (e: { preventDefault: () => void }): void => e.preventDefault()
```

```UIX/Pickers/PickerControl.tsx diff
+import { keepFocus } from '../Interactions/shared'
 …
-              <span aria-hidden onMouseDown={(e) => e.preventDefault()}>
+              <span aria-hidden onMouseDown={keepFocus}>
```

```UIX/Menus/MenuRows.tsx diff
+import { keepFocus } from '../Interactions/shared'
 …
 @@ the pane's back row @@
-        onPointerDown={(e) => e.preventDefault()}
+        onPointerDown={keepFocus}
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
+import { keepFocus } from '../Interactions/shared'
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
+/** A Manage pane's list: a field per value with a × beside it, and + drafting one more at the end, whose row the value keeps once written. × keeps the focus, so it discards an edit in progress, and an empty value is never written. */
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
+  const drafts = useRef(0)
+  const [draft, setDraft] = useState<string | null>(null)
+  const keys = useRenameKeys(values)
+  const entering = useEntrance(values, keys.keyOf)
+  const close = (): void => setDraft(null)
+  const add = async (key: string, value: string): Promise<void> => {
+    if (!value) return
+    keys.rename(key, value)
+    if (await onAdd(value)) close()
+    else keys.revert(value)
+  }
+  const rename = (from: string, to: string): void => {
+    if (!to) return
+    keys.rename(from, to)
+    void onRename(from, to).then((ok) => ok || keys.revert(to))
+  }
+  const row = (key: string, props: ManageFieldProps, remove: () => void): React.JSX.Element => (
+    <Reveal key={key} open enterOnMount={entering(key)} fill>
+      <div className={s.row}>
+        <span className={s.field}>{field(props)}</span>
+        <AccessoryButton
+          icon="x"
+          size="control"
+          ariaLabel={`Remove ${noun}`}
+          onMouseDown={keepFocus}
+          onClick={remove}
+        />
+      </div>
+    </Reveal>
+  )
+  const rows = values.map((value) =>
+    row(keys.keyOf(value), { value, onCommit: (next) => rename(value, next) }, () =>
+      onRemove(value),
+    ),
+  )
+  if (draft !== null && !rows.some((r) => r.key === draft))
+    rows.push(row(draft, { value: '', onCommit: (next) => void add(draft, next), onCancel: close }, close))
+  return (
+    <div className={s.list}>
+      {rows}
+      <FootingCreate
+        ariaLabel={`Add ${noun}`}
+        disabled={draft !== null}
+        onClick={() => setDraft(`\u0000${++drafts.current}`)}
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

- [ ] `ExclusionRows.test.tsx` (with its two new cases), `PreviewRulesRow.test.tsx`, `NexusRows.test.tsx`, and the `PickerMenu`/`PickerControl` tests are green.
- [ ] `grep -rn "settings-rows.css\|Settings/ManageRow" Core` finds nothing.
- [ ] Run the gates; `npm run build` confirms the moved `*.css.ts` builds.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Excluded Directories and Open In Preview behave as before in every test; Excluded Directories' only changes are the kept row on rename, a × that discards an edit in progress, and a + that stays enabled while a write is in flight — an add the busy gate refuses leaves its draft open.
- [ ] `ManageList` holds no Excluded-Directories behavior (browse, `emptyCommits`, the busy gate stay in `ExclusionPane`), and `ManageRow.tsx` imports nothing outside UIX.
- [ ] `useRenameKeys` is the one rename-key map (`grep -rn "seen: boolean" Core UIX`), and `op` the one variant helper.

### Phase 3 — The Shared Alias Picker

**GOAL:** One alias list serves the body picker's alias stage and the page panel's Aliases pane: menu rows with the alias glyph, the name, and an always-visible ×; a double-click or the row menu's Rename renames in place, the row menu's Delete or × deletes, and + drafts a new alias at the end. The body picker keeps its single-click insert, held for the double-click window, and hosts an edit as if the editor never left its slot. The option editor's draft and Filter's × come into line with the same standards. The panel mounts the row below Properties under a divider. This is the surface Nathan checks by hand. Tasks 3-1 through 3-3 share one commit: the host contract, the list, and the picker change together, and the tree typechecks only once all three land.

#### Task 3-1

**TASK:** Give the editor host one `edit` and an alias row menu, let `useRenameKeys` leave a held name to its row and mint draft keys, hoist the list-edit mechanics into `useListEdit` and fold Excluded Directories' list back into its pane, let `keepFocus` yield to a field, give `ManageRow` a menu pane and its panes one width owner, and return `InputField` to its baseline.

**NOW:** `EditorHost['aliases']` offers `remember` and `forget`, each void (`api.ts:167-172`); `editorHost.tsx` and `editorHarness.ts` implement them, `linkEdit.ts:151` remembers, `aliasRows` (`autocomplete.ts:181-198`) hands each alias row a `forget` closure, and `aliasPicker.test.tsx` and `connectionCommit.test.tsx` stub or spy on both. `EditorHost['menus']` (`api.ts:179-184`) carries the editor's native menus, `popMenu` behind each in `editorHost.tsx`. `ManageList` (`UIX/Menus/ManageRow.tsx`) holds the draft id, draft state, the `useRenameKeys` handoff, await-before-close, and revert inline; `ExclusionPane` and `AliasesRow` render it. A draft written as a name the list already holds — the most common refusal, a duplicate — makes `useRenameKeys` hand that name the draft's key: the held row remounts, the draft reads as landed and drops its typed text, and the refusal's `revert` brings back an empty draft. `keepFocus` refuses every press, a press inside a text field included. `ManageRow` always opens a bare, inset, focus-trapping pane; `dcf1ab5e2` gave every Manage pane the 250–500 bounds, and its `style` prop survives only for Open In Preview's inline `minWidth: PANE_MIN_W`, which undercuts them. `InputField`'s `invalid` and `onCancel` (`048b2d7d7`) serve only `AliasesRow`'s `AliasField`.

**CHANGE**

- [x] In `Core/Pages/editorHost.test.ts`, rewrite the alias cases and watch them fail: `edit('p1', { op: 'forget', alias: 'the notes' })` sends `{ op: 'editAliases', path: 'Notes/Alpha.md', edit: { op: 'forget', alias: 'the notes' } }` and resolves `true`; `edit` on an id the tree doesn't hold resolves `false` and sends nothing; the list and subscribe cases stay.
- [x] In `Core/Settings/ExclusionRows.test.tsx`, add and watch fail: drafting `Archive` over a list holding `Archive`, with the write refused, leaves the draft row open and the held `Archive` row the same node.
- [x] In `UIX/Pickers/PickerMenu`'s tests, add and watch fail: in a `focus="keep"` pane, a mousedown on a field inside isn't `defaultPrevented`, and one on a row is.
- [x] Repoint the host's alias callers in tests: `aliasPicker.test.tsx`'s host stub carries `edit` in place of `remember`/`forget`, its "a row forgets itself" case goes (Task 3-3 replaces the row), and its candidates drop `forget`; `connectionCommit.test.tsx:95` calls `edit('p1', { op: 'forget', alias: 'two' })` and `:100-111` spies on `edit` for `{ op: 'remember', … }`; `linkEdit.test.tsx`'s `remember` spies spy on `edit` the same way.
- [x] Apply the diffs below.

**AFTER**

```Core/Actions/aliasRowMenu.ts diff
+import type { ActionItem } from './menuModel'
+
+export type AliasRowAction = 'rename' | 'delete'
+
+export const ALIAS_ROW_MENU: ActionItem<AliasRowAction>[] = [
+  { label: 'Rename', action: 'rename' },
+  { label: 'Delete', action: 'delete', separatorBefore: true },
+]
```

```Core/MarkdownPM/api.ts diff
+import type { AliasRowAction } from '../Actions/aliasRowMenu'
+import type { AliasEdit } from '../Connections/aliasMemory'
 …
   aliases: {
     list(id: string): string[]
-    remember(id: string, alias: string): void
-    forget(id: string, alias: string): void
+    /** Resolves whether the host took the edit. */
+    edit(id: string, edit: AliasEdit): Promise<boolean>
     subscribe(cb: () => void): () => void
   }
 …
   menus: {
     grip(ctx: GripMenuContext): Promise<GripMenuAction | null>
     table(ctx: TableMenuContext): Promise<TableMenuAction | null>
     citation(ctx: CitationMenuContext): Promise<CitationMenuAction | null>
+    alias(): Promise<AliasRowAction | null>
     format?: (req: EditorMenuRequest) => Promise<string | null>
   }
```

```Core/Pages/editorHost.tsx diff
+import { ALIAS_ROW_MENU } from '../Actions/aliasRowMenu'
 …
-  const editAliases = (id: string, edit: AliasEdit): void => {
+  const editAliases = async (id: string, edit: AliasEdit): Promise<boolean> => {
     const path = pageOf(id)?.path
-    if (path) void state().mutate({ op: 'editAliases', path, edit })
+    return !!path && (await state().mutate({ op: 'editAliases', path, edit })) !== null
   }
 …
       list: (id) => heldAliases(pageMetaOf(id)(state())?.aliases ?? [], pageOf(id)?.title ?? ''),
-      remember: (id, alias) => editAliases(id, { op: 'remember', alias }),
-      forget: (id, alias) => editAliases(id, { op: 'forget', alias }),
+      edit: editAliases,
 …
       citation: (ctx) => popMenu(citationMenuModel(ctx)),
+      alias: () => popMenu(ALIAS_ROW_MENU),
```

```Core/Testing/editorHarness.ts diff
-      remember: (id, alias) => wear(id, { op: 'remember', alias }),
-      forget: (id, alias) => wear(id, { op: 'forget', alias }),
+      edit: async (id, edit) => {
+        wear(id, edit)
+        return true
+      },
 …
       citation: async () => null,
+      alias: async () => null,
```

```Core/MarkdownPM/Links/linkEdit.ts diff
 @@ rememberAlias @@
-  if (target.kind === 'page') view.state.facet(editorHost).aliases.remember(target.page.id, alias)
+  if (target.kind === 'page')
+    void view.state.facet(editorHost).aliases.edit(target.page.id, { op: 'remember', alias })
```

```UIX/Animations/useRenameKeys.ts diff
-/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. */
+/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. A name another row already holds stays that row's, and `mint` gives a draft a key no value holds, which its value takes when it lands. */
 …
   revert: (to: string) => void
+  mint: () => string
 } {
   const renamed = useRef(new Map<string, { key: string; seen: boolean }>())
+  const minted = useRef(0)
 …
   return {
     keyOf,
-    rename: (from, to) => void renamed.current.set(to, { key: keyOf(from), seen: false }),
-    revert: (to) => void renamed.current.delete(to),
+    rename: (from, to) => {
+      if (!present.has(to)) renamed.current.set(to, { key: keyOf(from), seen: false })
+    },
+    revert: (to) => {
+      if (!renamed.current.get(to)?.seen) renamed.current.delete(to)
+    },
+    mint: () => `\u0000${++minted.current}`,
   }
```

```UIX/Menus/useListEdit.ts diff
+import { useState } from 'react'
+import { useRenameKeys } from '../Animations/useRenameKeys'
+
+export interface ListRow {
+  key: string
+  value: string
+  draft: boolean
+}
+
+/** A list edited in place: a rename keeps its row's key, and a draft at the end is keyed for the value it writes, so it keeps its row wherever the value lands before the reply. A refusal leaves the draft open, and a commit hands back its write, so a label holds the committed text until it lands. */
+export function useListEdit(
+  values: readonly string[],
+  {
+    onAdd,
+    onRename,
+  }: {
+    onAdd: (value: string) => Promise<boolean>
+    onRename: (from: string, to: string) => Promise<boolean>
+  },
+): {
+  rows: ListRow[]
+  drafting: boolean
+  begin: () => void
+  cancel: () => void
+  commit: (row: ListRow, next: string) => Promise<boolean> | undefined
+} {
+  const [draft, setDraft] = useState<string | null>(null)
+  const keys = useRenameKeys(values)
+  const rows = values.map((value) => ({ key: keys.keyOf(value), value, draft: false }))
+  const drafting = draft !== null && !rows.some((r) => r.key === draft)
+  if (drafting) rows.push({ key: draft, value: '', draft: true })
+  return {
+    rows,
+    drafting,
+    begin: () => setDraft(keys.mint()),
+    cancel: () => setDraft(null),
+    commit: (row, next) => {
+      if (!next || next === row.value) return
+      keys.rename(row.draft ? row.key : row.value, next)
+      const landed = row.draft ? onAdd(next) : onRename(row.value, next)
+      void landed.then((ok) => {
+        if (!ok) keys.revert(next)
+        else if (row.draft) setDraft((d) => (d === row.key ? null : d))
+      })
+      return landed
+    },
+  }
+}
```

```UIX/Menus/ManageRow.tsx diff
-import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
+import { type ReactNode, useRef, useState } from 'react'
-import { Reveal } from '../Animations/Reveal'
-import { useEntrance } from '../Animations/useEntrance'
-import { useRenameKeys } from '../Animations/useRenameKeys'
 import { Button } from '../Buttons/Button'
-import { keepFocus } from '../Interactions/shared'
 import { PickerMenu } from '../Pickers/PickerMenu'
 import { Icon, type IconName } from '../Symbols'
 import { MenuRowView } from './MenuIndex'
-import { AccessoryButton, FootingCreate } from './MenuRows'
 …
 @@ ManageRow @@
   solid,
+  menu,
-  style,
 …
   solid?: boolean
+  /** A pane of menu rows on the picker's own surface, taking no focus on open, rather than an inset one. */
+  menu?: boolean
-  style?: CSSProperties
 …
                 solid={solid}
-                bareSurface
-                contentClassName={s.pane}
+                bareSurface={!menu}
+                focus={menu ? 'leave' : undefined}
+                contentClassName={menu ? s.bounds : s.pane}
-                style={style}
 …
-export interface ManageFieldProps { … }
-
-/** A Manage pane's list: … */
-export function ManageList({ … }) { … }
```

```UIX/Menus/manage-row.css.ts diff
-export const pane = style({ padding: 'var(--surface-inset)', minWidth: '250px', maxWidth: '500px' })
-
-export const list = style({ display: 'flex', flexDirection: 'column', gap: '6px' })
-
-export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })
-
-export const field = style({ flex: '1 1 auto', minWidth: 0 })
+export const bounds = style({ minWidth: '250px', maxWidth: '500px' })
+
+export const pane = style([bounds, { padding: 'var(--surface-inset)' }])
```

```Core/Settings/PreviewRulesRow.tsx diff
-import { PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
 …
-      style={{ minWidth: PANE_MIN_W }}
```

```Core/Settings/excluded-directories.css.ts diff
+import { style } from '@vanilla-extract/css'
+
+export const list = style({ display: 'flex', flexDirection: 'column', gap: '6px' })
+
+export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })
+
+export const field = style({ flex: '1 1 auto', minWidth: 0 })
```

```Core/Settings/ExcludedDirectoriesRow.tsx diff
-import { ManageList, ManageRow } from '@pommora/uix/Menus/ManageRow'
+import { Reveal } from '@pommora/uix/Animations/Reveal'
+import { useEntrance } from '@pommora/uix/Animations/useEntrance'
+import { keepFocus } from '@pommora/uix/Interactions/shared'
+import { ManageRow } from '@pommora/uix/Menus/ManageRow'
+import { AccessoryButton, FootingCreate } from '@pommora/uix/Menus/MenuRows'
+import { useListEdit } from '@pommora/uix/Menus/useListEdit'
+import * as s from './excluded-directories.css'
 …
 @@ ExclusionPane @@
+  const list = useListEdit(stored, {
+    onAdd: (folder) => commit([...stored, folder]),
+    onRename: (from, to) => commit(stored.map((f) => (f === from ? to : f))),
+  })
+  const entering = useEntrance(list.rows, (r) => r.key)
 …
-  return (
-    <ManageList
-      values={stored}
-      noun="exclusion"
-      onAdd={(folder) => commit([...stored, folder])}
-      onRename={(from, to) => commit(stored.map((f) => (f === from ? to : f)))}
-      onRemove={(folder) => void commit(stored.filter((f) => f !== folder))}
-      field={({ value, onCommit }) => (
-        <PathField … />
-      )}
-    />
-  )
+  return (
+    <div className={s.list}>
+      {list.rows.map((row) => {
+        const onCommit = (next: string): void => void list.commit(row, next)
+        return (
+          <Reveal key={row.key} open enterOnMount={entering(row.key)} fill>
+            <div className={s.row}>
+              <span className={s.field}>
+                <PathField
+                  label="Excluded folder"
+                  value={row.value}
+                  empty="No folder"
+                  onCommit={onCommit}
+                  onBrowse={() => browse(onCommit)}
+                />
+              </span>
+              <AccessoryButton
+                icon="x"
+                size="control"
+                ariaLabel="Remove exclusion"
+                onMouseDown={keepFocus}
+                onClick={() =>
+                  row.draft ? list.cancel() : void commit(stored.filter((f) => f !== row.value))
+                }
+              />
+            </div>
+          </Reveal>
+        )
+      })}
+      <FootingCreate ariaLabel="Add exclusion" disabled={list.drafting} onClick={list.begin} />
+    </div>
+  )
```

```UIX/Interactions/shared.ts diff
-/** A press that leaves the focus where it is, so a field it sits beside neither blurs nor commits. */
-export const keepFocus = (e: { preventDefault: () => void }): void => e.preventDefault()
+/** A press that leaves the focus where it is, so a field it sits beside neither blurs nor commits; a press inside a field still reaches it. */
+export const keepFocus = (e: { target: EventTarget | null; preventDefault: () => void }): void => {
+  if (!(e.target instanceof Element && e.target.closest(EDITABLE_TARGETS))) e.preventDefault()
+}
```

```UIX/Pickers/PickerMenu.tsx diff
 @@ focus @@
-  /** `trap` takes focus and holds Tab inside; `leave` takes none on open, though a field inside takes it when pressed; `keep` never takes it, so a press anywhere in the pane leaves focus with its owner. …
+  /** `trap` takes focus and holds Tab inside; `leave` takes none on open, though a field inside takes it when pressed; `keep` takes none, so a press anywhere in the pane but inside a field leaves focus with its owner. …
```

```UIX/Fields/InputField.tsx diff
   emptyCommits?: boolean
-  /** Dims text that won't be kept as it's typed. */
-  invalid?: (text: string) => boolean
 …
-  /** An edit left without a commit, apart from the close every exit reports. */
-  onCancel?: () => void
 …
-          invalid={edit.invalid}
 …
-          onCancel={() => {
-            setEditing(false)
-            edit.onCancel?.()
-          }}
+          onCancel={() => setEditing(false)}
```

**VERIFY**

- [x] `editorHost.test.ts`, the `PickerMenu` tests, `ExclusionRows.test.tsx`, `PreviewRulesRow.test.tsx`, and `InputField.test.tsx` are green; `git diff 56a15ac88 -- UIX/Fields/InputField.tsx` is empty. The gates run after Task 3-3.
- [x] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Build `AliasList`, the one alias list, and render the Aliases row's pane through it.

**NOW:** `AliasesRow` renders `ManageList` with a bordered `AliasField` per alias. The body picker's alias rows are `slot` rows in `AutocompletePane.tsx`, which picks on mousedown. No alias row has a context menu.

**CHANGE**

- [x] Rewrite `Core/Pages/AliasesRow.test.tsx` and watch it fail, mounting `AliasesRow` for `{ id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }` over `['the plan', 'Q3 doc']` with `window.nexus` stubbed to record `mutate` and answer the native menu; query the editing input by `input[aria-label="Alias"]`:
  - the row reads "Aliases" and `2`; over `['the plan', 'The Plan', 'alpha']` it reads `1`;
  - Manage opens a pane with one menu row per alias, each with a "Delete alias" ×, and focuses nothing;
  - + adds a row whose input is `document.activeElement`; typing `roadmap` and Enter sends `{ op: 'add', alias: 'roadmap' }`; with the stub pushing `['the plan', 'Q3 doc', 'roadmap']` before it replies, the `[data-reveal]` that held the draft is the one holding `roadmap`, and no input remains;
  - a refused add leaves the draft open with `roadmap` in it; Escape on an empty draft closes it and sends nothing; × on a draft closes it; typing `alpha` marks the input `aria-invalid="true"`;
  - a single click on `the plan` opens no input and sends nothing; a double-click on its name opens it, and `The Plan` with Enter sends `{ op: 'rename', from: 'the plan', to: 'The Plan' }`, the row reading `The Plan` before the stub replies and `the plan` again after a refusal;
  - renaming `the plan` and then double-clicking `Q3 doc`'s name commits the first rename and leaves `Q3 doc`'s input open;
  - "Delete alias" on `Q3 doc` sends `{ op: 'forget', alias: 'Q3 doc' }`, and on the row being renamed closes its input as well;
  - with the menu answering `rename`, a right-click on `Q3 doc` opens its input; answering `delete`, it sends the forget.
- [x] Apply the diffs below.

**AFTER**

```Core/MarkdownPM/Autocomplete/AliasList.tsx diff
+import { useEffect, useRef, useState } from 'react'
+import { Reveal } from '@pommora/uix/Animations/Reveal'
+import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
+import { useKeepInView } from '@pommora/uix/Interactions/paneCtl'
+import { keepFocus } from '@pommora/uix/Interactions/shared'
+import {
+  AccessoryButton,
+  emphasizeMatch,
+  FootingCreate,
+  MenuFooting,
+  MenuItem,
+  MenuScrollFrame,
+} from '@pommora/uix/Menus'
+import { titleInput } from '@pommora/uix/Menus/menu-row.css'
+import { type ListRow, useListEdit } from '@pommora/uix/Menus/useListEdit'
+import { Icon } from '@pommora/uix/Symbols'
+import { useLatest } from '@pommora/uix/Utilities/stableApi'
+import type { AliasRowAction } from '../../Actions/aliasRowMenu'
+import { ALIAS_ICON } from '../../Assets/entityIconPolicy'
+import type { AliasEdit } from '../../Connections/aliasMemory'
+import { normalizeTitle } from '../../Paths/caseFold'
+
+// KNOB — how long a click on a picker row waits for a second click that makes it a rename.
+const PICK_DELAY_MS = 300
+
+/** What an alias list edits through: the page's title, its edits, its row menu, and, for a host that lends the list its focus, every edit's end — `stay` when it ended inside the list, by Enter, Escape, or a removal. */
+export interface AliasHost {
+  title: string
+  edit: (e: AliasEdit) => Promise<boolean>
+  menu: () => Promise<AliasRowAction | null>
+  onEditEnd?: (stay: boolean) => void
+}
+
+/** A page's aliases as menu rows: × or the row menu's Delete deletes one, a double-click on its name or the row menu's Rename renames it in place, and + drafts one more at the end. A picker passes `onPick`, which a single click calls once the double-click window passes, and its keyboard highlight. */
+export function AliasList({
+  aliases,
+  host,
+  active,
+  match = 0,
+  maxHeight,
+  onPick,
+}: {
+  aliases: readonly string[]
+  host: AliasHost
+  active?: number
+  match?: number
+  maxHeight?: number
+  onPick?: (alias: string) => void
+}): React.JSX.Element {
+  const list = useListEdit(aliases, {
+    onAdd: (alias) => host.edit({ op: 'add', alias }),
+    onRename: (from, to) => host.edit({ op: 'rename', from, to }),
+  })
+  const [renaming, setRenaming] = useState<string | null>(null)
+  const rows = useRef<HTMLDivElement>(null)
+  const keyed = useRef(false)
+  const pick = useRef<number | undefined>(undefined)
+  const picked = useLatest(onPick)
+  const keepInView = useKeepInView(active ?? -1)
+  useEffect(() => () => window.clearTimeout(pick.current), [])
+  const editing = (row: ListRow): boolean => row.draft || renaming === row.key
+  const byKey = (): boolean => {
+    const was = keyed.current
+    keyed.current = false
+    return was
+  }
+  const end = (key: string, stay: boolean): void => {
+    setRenaming((k) => (k === key ? null : k))
+    host.onEditEnd?.(stay)
+  }
+  // A row the tree dropped mid-rename took its focused field with it, which fires no blur.
+  const dropped = renaming !== null && !list.rows.some((r) => r.key === renaming)
+  useEffect(() => {
+    if (dropped && renaming !== null) end(renaming, true)
+  }, [dropped])
+  // A field already open commits by blur, as leaving it any other way would, before the next opens.
+  const rename = (row: ListRow): void => {
+    window.clearTimeout(pick.current)
+    const open = document.activeElement
+    if (open instanceof HTMLElement && rows.current?.contains(open)) open.blur()
+    setRenaming(row.key)
+  }
+  const remove = (row: ListRow): void => {
+    if (row.draft) list.cancel()
+    else void host.edit({ op: 'forget', alias: row.value })
+    if (editing(row)) end(row.key, true)
+  }
+  const rowMenu = async (row: ListRow, e: React.MouseEvent): Promise<void> => {
+    e.preventDefault()
+    switch (await host.menu()) {
+      case 'rename':
+        return rename(row)
+      case 'delete':
+        return remove(row)
+    }
+  }
+  return (
+    <MenuScrollFrame
+      maxHeight={maxHeight}
+      footer={
+        <MenuFooting
+          leading={
+            <FootingCreate ariaLabel="Add alias" disabled={list.drafting} onClick={list.begin} />
+          }
+        />
+      }
+    >
+      <div
+        ref={rows}
+        onKeyDownCapture={(e) => {
+          keyed.current = e.key === 'Enter' || e.key === 'Escape'
+        }}
+      >
+        {list.rows.map((row, i) => (
+          <Reveal key={row.key} open enterOnMount={row.draft} fill>
+            <MenuItem
+              ref={i === active ? keepInView : undefined}
+              active={i === active}
+              tabIndex={-1}
+              leading={<Icon name={ALIAS_ICON} size="body" />}
+              trailing={
+                <AccessoryButton
+                  icon="x"
+                  size="control"
+                  ariaLabel="Delete alias"
+                  onMouseDown={keepFocus}
+                  onClick={() => remove(row)}
+                />
+              }
+              onClick={
+                onPick && !row.draft
+                  ? (e) => {
+                      window.clearTimeout(pick.current)
+                      if (e.detail === 1)
+                        pick.current = window.setTimeout(
+                          () => picked.current?.(row.value),
+                          PICK_DELAY_MS,
+                        )
+                    }
+                  : undefined
+              }
+              onContextMenu={row.draft ? undefined : (e) => void rowMenu(row, e)}
+            >
+              <RenamableLabel
+                renames="title"
+                className={titleInput}
+                ariaLabel="Alias"
+                editing={editing(row)}
+                value={row.value}
+                invalid={(text) => normalizeTitle(text) === normalizeTitle(host.title)}
+                onBegin={row.draft ? undefined : () => rename(row)}
+                onCommit={(next) => {
+                  const landed = list.commit(row, next)
+                  end(row.key, byKey())
+                  return landed
+                }}
+                onCancel={() => {
+                  if (row.draft) list.cancel()
+                  end(row.key, byKey())
+                }}
+              >
+                {(shown) => emphasizeMatch(shown, 0, match)}
+              </RenamableLabel>
+            </MenuItem>
+          </Reveal>
+        ))}
+      </div>
+    </MenuScrollFrame>
+  )
+}
```

A double-click on a name begins its rename through `RenamableLabel`'s `onBegin`, as every other rename-in-place list does; the row's click clears the pending pick on every press, so a double-click anywhere on a row never inserts. The keydown capture records whether the edit that ends next ended by key; a removal or a dropped row ends inside the list as well. A commit hands its write back to `RenamableLabel`, which holds the committed name until it lands, as the Table's titles and the window's tabs do.

```Core/Pages/AliasesRow.tsx diff
-import { useMemo, useState } from 'react'
-import { InputField } from '@pommora/uix/Fields/InputField'
-import { type ManageFieldProps, ManageList, ManageRow } from '@pommora/uix/Menus/ManageRow'
-import { Icon } from '@pommora/uix/Symbols'
+import { useMemo } from 'react'
+import { ManageRow } from '@pommora/uix/Menus/ManageRow'
+import { ALIAS_ROW_MENU } from '../Actions/aliasRowMenu'
+import { popMenu } from '../Actions/menuActions'
 import { ALIAS_ICON } from '../Assets/entityIconPolicy'
 import { type AliasEdit, heldAliases } from '../Connections/aliasMemory'
-import { normalizeTitle } from '../Paths/caseFold'
+import { AliasList } from '../MarkdownPM/Autocomplete/AliasList'
 import { pageMetaOf, useSession } from '../Session/store'
 …
-    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid>
-      <ManageList … />
-    </ManageRow>
+    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid menu>
+      <AliasList
+        aliases={aliases}
+        host={{ title: page.title, edit, menu: () => popMenu(ALIAS_ROW_MENU) }}
+      />
+    </ManageRow>
 …
-// A draft opens editing with its caret seated.
-function AliasField(…) { … }
```

**VERIFY**

- [x] `AliasesRow.test.tsx` is green, and each case goes red with its handler removed.
- [x] Check for unnecessary code or mistakes. The gates run after Task 3-3.

#### Task 3-3

**TASK:** Render the body picker's alias stage through `AliasList`, and let the editor host an edit in its own caret pane as if it never left its slot.

**NOW:** `AutocompletePane`'s `slot` renders alias rows with a hover `HoverRemove` and picks on mousedown (`AutocompletePane.tsx:86-137`); a heading row in `slot(v.behind)` takes the alias glyph. Focus moving into the pane blurs the editor: `useConnectionAutocomplete`'s blur handler closes the picker (`useConnectionAutocomplete.ts:53-58`), `aliasOnLeave`'s collapses an empty alias slot or remembers a typed one (`linkEdit.ts:208-213`), and the link decorations draw the slot as a resting link (`decorations.ts:453`). `CaretPane` keeps focus with its owner (`caretPane.tsx:48`).

**CHANGE**

- [x] In `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx`, replace the "forget × is inert until it is revealed" suite and watch the new cases fail:
  - each alias row shows its × at rest, and pressing it deletes without inserting;
  - a single click (`detail: 1`) inserts once `PICK_DELAY_MS` passes (fake timers), and a double-click on the name instead opens the row's input and inserts nothing;
  - + drafts an input inside the pane, the pane stays open, `[[Alpha|]]` keeps its pipe, and Enter sends the add and returns focus to the editor with the slot intact;
  - Escape in a rename returns focus with the slot intact;
  - focus leaving a pane field for an element outside the pane and the editor closes the picker and collapses the empty slot, as the editor's own blur does;
  - with the harness's `menus.alias` answering `rename`, a right-click opens the row's input.
- [x] Repoint `connectionCommit.test.tsx:90`'s `.mdpm-ac-forget` count to the "Delete alias" buttons.
- [x] In `Core/MarkdownPM/Links/linkEdit.test.tsx`, add "focus moving into the caret pane neither collapses nor remembers" — an empty and a typed alias slot, blurred toward an element inside a `CaretPane`, keep their text and send no `edit` — and watch it fail.
- [x] In `aliasPicker.test.tsx`, add and watch fail: a heading committed into the alias stage leaves the sliding root drawing its heading rows as heading rows, with no page glyph.
- [x] In the decoration tests, add and watch fail: with focus moved into a pane field, the alias slot keeps its editing decoration while `paneHeld` holds, and rests once it clears.
- [x] Apply the diffs below.

**AFTER**

```Core/MarkdownPM/Menus/caretPane.tsx diff
+import { StateEffect, StateField } from '@codemirror/state'
+import { cx } from '@pommora/uix/Utilities/cx'
 …
+const CARET_PANE = 'mdpm-caret-pane'
+
+/** Whether focus sits, or is moving, inside an editor's own caret pane. */
+export const inCaretPane = (el: EventTarget | null): boolean =>
+  el instanceof Element && el.closest(`.${CARET_PANE}`) !== null
+
+export const holdPane = StateEffect.define<boolean>()
+
+/** Set while an edit runs in the editor's caret pane, which holds the editor's place as its own focus would. */
+export const paneHeld = StateField.define<boolean>({
+  create: () => false,
+  update: (held, tr) => tr.effects.reduce((h, e) => (e.is(holdPane) ? e.value : h), held),
+})
+
-// No `onDismiss`, and focus kept by contract: the editor's keymap owns arrows, Return and Escape, and no press in the pane moves the caret out of its query.
+// No `onDismiss`, and focus kept by contract: the editor's keymap owns arrows, Return and Escape, and only a field inside the pane takes focus, which the editor holds its place through.
 …
-      contentClassName={className}
+      contentClassName={cx(CARET_PANE, className)}
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
   const [extension] = useState<Extension>(() => [
     field,
+    paneHeld,
 …
     EditorView.domEventHandlers({
-      blur: (_, view) => {
-        closePicker(view, 'blur')
+      blur: (e, view) => {
+        if (inCaretPane(e.relatedTarget)) view.dispatch({ effects: holdPane.of(true) })
+        else closePicker(view, 'blur')
         return false
       },
     }),
 …
+  // An edit in the pane ends with the caret back in its slot when it ended there; one that ended by focus going elsewhere leaves as the editor's own blur would. Read a tick later, once focus has landed.
+  const endEdit = (stay: boolean): void =>
+    void window.setTimeout(() => {
+      const view = viewRef.current
+      const at = document.activeElement
+      if (!view || (inCaretPane(at) && at?.closest(EDITABLE_TARGETS))) return
+      view.dispatch({ effects: holdPane.of(false) })
+      if (stay || inCaretPane(at)) view.focus()
+      else if (!view.dom.contains(at)) view.contentDOM.dispatchEvent(new FocusEvent('blur'))
+    }, 0)
 …
 @@ the pane props @@
+    aliasHost:
+      form === 'alias' && page
+        ? {
+            title: page.title,
+            edit: (e: AliasEdit) => host.aliases.edit(page.id, e),
+            menu: host.menus.alias,
+            onEditEnd: endEdit,
+          }
+        : null,
```

```Core/MarkdownPM/Links/linkEdit.ts diff
 @@ aliasOnLeave @@
-      blur(_event, view) {
+      blur(event, view) {
+        if (inCaretPane(event.relatedTarget)) return false
         const at = view.state.selection.main.head
```

```Core/MarkdownPM/decorations.ts diff
 @@ build @@
-  const focused = view.hasFocus
+  const focused = view.hasFocus || view.state.field(paneHeld, false) === true
 …
 @@ the plugin's update @@
           u.focusChanged ||
+          u.startState.field(paneHeld, false) !== u.state.field(paneHeld, false) ||
```

```Core/MarkdownPM/Autocomplete/autocomplete.ts diff
-  | { kind: 'alias'; forget: () => void }
+  | { kind: 'alias' }
 …
 @@ aliasRows @@
-    .map(
-      (a): AcRow => ({
-        kind: 'alias',
-        value: a,
-        forget: () => aliases.forget(pageId, a),
-      }),
-    )
+    .map((a): AcRow => ({ kind: 'alias', value: a }))
```

```Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
-import { ALIAS_ICON } from '../../Assets/entityIconPolicy'
-import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
+import { overScrollHost } from '@pommora/uix/Interactions/OverScroll'
+import { AliasList, type AliasHost } from './AliasList'
 …
 export interface AutocompletePaneProps {
 …
+  aliasHost: AliasHost | null
 …
 @@ slot @@ — page rows only, once alias rows render through AliasList:
-          className={hoverRemoveHost}
+          className={overScrollHost}
-          leading={ row.kind === 'page' ? <EntityIcon … /> : <Icon name={ALIAS_ICON} size="body" /> }
+          leading={<EntityIcon kind="page" size="body" />}
-          trailing={ row.kind === 'alias' ? <HoverRemove … /> : row.kind === 'page' && linksPages ? … : undefined }
+          trailing={linksPages ? … : undefined}
-            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget, .mdpm-ac-aside')) return
+            if ((e.target as HTMLElement).closest?.('.mdpm-ac-aside')) return
 …
-  const shown = headingForm ? headingSlot() : slot(v.candidates, true)
+  const shown = headingForm
+    ? headingSlot()
+    : v.aliasHost
+      ? (
+          <AliasList
+            aliases={v.candidates.map((r) => r.value)}
+            host={v.aliasHost}
+            active={v.index}
+            match={matchLen}
+            maxHeight={h}
+            onPick={(alias) => onPick({ kind: 'alias', value: alias })}
+          />
+        )
+      : slot(v.candidates, true)
+  const behindSlot = (rows: AcRow[]): React.JSX.Element =>
+    rows[0]?.kind === 'heading' ? (
+      <MenuScrollFrame maxHeight={h}>{rows.map((r) => headingRow(r, -1))}</MenuScrollFrame>
+    ) : (
+      slot(rows, false)
+    )
 …
-        root={v.behind ? slot(v.behind, false) : shown}
+        root={v.behind ? behindSlot(v.behind) : shown}
```

`useHeld`'s snapshot gains `aliasHost`, so a closing pane keeps its alias list. `slot` now only ever receives page rows — an alias stage without an `aliasHost` has no candidates, and a `behind` left by a heading that opened the alias stage slides out through `headingRow` — so `row.kind === 'page'` stays only where TypeScript needs `pageId` and `location` (the key and the sub-label), and the row takes `overScrollHost`, the half of `hoverRemoveHost` it used. The heading row's mousedown comment ("commits on mousedown, the way every autocomplete row does") reads that a heading row commits on mousedown as a page row does, an alias row's click waiting out the double-click window. The new imports are `inCaretPane`, `holdPane`, `paneHeld`, `EDITABLE_TARGETS`, and `AliasEdit` in the hook, `inCaretPane` in `linkEdit.ts`, and `paneHeld` in `decorations.ts`.

**VERIFY**

- [x] `aliasPicker.test.tsx`, `linkEdit.test.tsx`, `connectionCommit.test.tsx`, `AliasesRow.test.tsx`, the table cell's autocomplete tests, and the decoration tests are green.
- [x] `grep -rn "mdpm-ac-forget\|\.aliases\.remember\|\.aliases\.forget\|ManageList\|ManageFieldProps" Core UIX` and `grep -rn HoverRemove Core/MarkdownPM` find nothing.
- [x] Run the gates, then commit Tasks 3-1 through 3-3 together.
- [x] Check for unnecessary code or mistakes.

#### Task 3-4

**TASK:** Bring the two lists that edit the same way but behave otherwise into line: the option editor's draft closes once its add lands and stays open on refusal, and Filter's rule × discards an edit in progress, its rows keyed by identity rather than index. The property picker's + waits on its draft, and `TokenField`'s chip × keeps focus through `keepFocus`.

**NOW:**
- **Option draft:** `useOptionEdit`'s `commitDraft` (`Core/Properties/Schema/useOptionEdit.tsx:141-145`) clears the draft before `editOption` writes, so a refused add loses its title and a landed option grows in as the draft drops out; `write` (`Core/Properties/propertyWrite.ts`) reports a refusal and answers nothing. The property picker's `FootingCreate` (`PropertyPicker.tsx:334`) stays enabled while drafting and resets the draft. The host updates the window before it replies to `property:editOption` (`Core/Contract/handlers.ts:98-111`, `Core/Nexus/settle.ts:36-48`).
- **Filter rows:** `FilterFrame`'s rows are `Reveal key={index}` with the value cell an `EditableInput key={operand}`; its rule × (`FilterFrame.tsx:468-473`) commits the value cell's edit on blur and then removes the rule, and the draft row's × (`:494-499`) repeats the same `AccessoryButton`. A `keepFocus` alone would carry a focused field across rows: a removed rule's input survives under a neighbour sharing its operand, and a neighbour's input unmounts without a blur. `FilterFrame` hosts Open In Preview (`PreviewRulesRow.tsx:29`), a view's filter (`ViewLeaf.tsx:39`), and the Matrix's (`MatrixMenu.tsx:121`).
- **Chips:** `TokenField` (`UIX/Fields/TokenField.tsx:46`) writes `e.preventDefault()` by hand for a chip × press.

**CHANGE**

- [x] In `Core/Properties/Schema/OptionEditor.test.tsx`, add and watch fail: a refused add leaves the draft reading `Fresh`; with `editOption` deferred, the draft stays open after its commit, and the groups re-rendering with `Fresh` before the reply removes it; drafting `Urgent` over a list holding `Urgent`, refused, leaves the draft reading `Urgent` and the held `Urgent` row the same node.
- [x] In `Core/Properties/Pickers/PropertyPicker.pane.test.tsx`, move the close-before-write assertion (`:290`, `expect(draft()).toBeNull()`) after the reply, add that a refused add keeps `Fresh` in the draft, and that + is disabled while drafting.
- [x] In `FilterFrame`'s tests, add and watch fail: a mousedown on either × is `defaultPrevented`; with two `''` text rules, typing `foo` into rule 2 and pressing rule 1's × leaves rule 2's input the same node, focused, reading `foo`, with only the removal saved; typing `foo` into rule 1 and pressing its × leaves the remaining input reading `''`; the `[data-reveal]` that held the draft row holds the rule it picked.
- [x] Apply the diffs below.

**AFTER**

```Core/Properties/propertyWrite.ts diff
-export const write = async (res: Promise<Result<null>>): Promise<void> => {
-  reportRefusal(await res)
-}
+export const write = async (res: Promise<Result<null>>): Promise<boolean> =>
+  reportRefusal(await res)
```

```Core/Properties/Schema/PropertyFrame.tsx diff
 @@ :252, :257 @@
-… : Promise<void> …
+… : Promise<boolean> …
```

```Core/Properties/Schema/useOptionEdit.tsx diff
-type Draft = { groupId: string; index?: number }
+type Draft = { key: string; groupId: string; index?: number }
 …
-  editOption: (edit: OptionEdit) => Promise<void>
+  editOption: (edit: OptionEdit) => Promise<boolean>
 …
-  const editOption = (edit: OptionEdit): Promise<void> =>
+  const editOption = (edit: OptionEdit): Promise<boolean> =>
 …
-  const entering = (value: string): boolean => enteringKey(keyOf(value))
+  const entering = (value: string): boolean =>
+    keyOf(value) !== draft?.key && enteringKey(keyOf(value))
 …
   const commitDraft = (title: string): void => {
     if (!draft) return
-    setDraft(null)
-    void editOption({ op: 'add', groupId: draft.groupId, title, atIndex: draft.index })
+    keys.rename(draft.key, title)
+    void editOption({ op: 'add', groupId: draft.groupId, title, atIndex: draft.index }).then((ok) =>
+      ok ? setDraft((d) => (d === draft ? null : d)) : keys.revert(title),
+    )
   }
+  const drafted = draft && !options.some((o) => keyOf(o.value) === draft.key) ? draft : null
 …
-    draft,
-    beginDraft: (groupId, index) => setDraft({ groupId, index }),
+    draft: drafted,
+    beginDraft: (groupId, index) => setDraft({ key: keys.mint(), groupId, index }),
```

`busy` keeps reading the raw `draft`, so the editor stays busy until the reply. A landed option whose key is the draft's mounts open in the render that hides the draft, so the draft gives way to its option without the option growing in.

```Core/Properties/Pickers/PropertyPicker.tsx diff
                   <FootingCreate
                     ariaLabel="New Option"
+                    disabled={!!edit.draft}
                     onClick={() => edit.beginDraft(SELECT_GROUP)}
                   />
```

```Core/Views/Settings/FilterFrame.tsx diff
+import { keepFocus } from '@pommora/uix/Interactions/shared'
 …
-  const [drafting, setDrafting] = useState(false)
+  const [draft, setDraft] = useState<string | null>(null)
+  const minted = useRef(0)
+  const mint = (): string => String(++minted.current)
+  const ids = useRef<string[]>([])
   const rules: FilterRule[] = decoded.kind === 'rows' ? decoded.rules : []
+  // A rule's row is its identity, not its place, so removing one leaves every other row and its field where they stand.
+  if (ids.current.length !== rules.length) ids.current = rules.map(mint)
-  const entering = useEntrance(rules, (_, i) => String(i))
+  const entering = useEntrance(ids.current, (id) => id)
-  const removeRow = (index: number): void =>
-    save(
-      mode,
-      liveRules().filter((_, i) => i !== index),
-    )
+  const removeRow = (index: number): void => {
+    ids.current.splice(index, 1)
+    save(mode, liveRules().filter((_, i) => i !== index))
+  }
   const completeDraft = (targetId: string): void => {
-    setDrafting(false)
+    ids.current.push(draft ?? 'lead')
+    setDraft(null)
     setPendingMode(null)
     save(mode, [...liveRules(), mintRule(targetId, schema, contextIds)])
   }
+
+  const removeButton = (onClick: () => void): React.JSX.Element => (
+    <AccessoryButton
+      icon="x"
+      size="control"
+      ariaLabel="Remove filter"
+      onMouseDown={keepFocus}
+      onClick={onClick}
+    />
+  )
 @@ ruleRow @@
+    const id = ids.current[index]
-      <Reveal key={index} open enterOnMount={entering(String(index))} fill>
+      <Reveal key={id} open enterOnMount={entering(id)} fill>
 …
-          <AccessoryButton icon="x" size="control" ariaLabel="Remove filter" onClick={() => removeRow(index)} />
+          {removeButton(() => removeRow(index))}
 @@ draftRow @@
-  const draftRow = (drafting || lead) && (
-    <Reveal open enterOnMount={!lead} fill>
+  const draftRow = (draft !== null || lead) && (
+    <Reveal key={draft ?? 'lead'} open enterOnMount={!lead} fill>
 …
-        {!lead && ( <AccessoryButton … onClick={() => setDrafting(false)} /> )}
+        {!lead && removeButton(() => setDraft(null))}
 @@ the list @@
-          {rules.map(ruleRow)}
-          {draftRow}
-          <FootingCreate ariaLabel="Add filter rule" onClick={() => setDrafting(true)} />
+          {[...rules.map(ruleRow), draftRow]}
+          <FootingCreate ariaLabel="Add filter rule" onClick={() => setDraft((d) => d ?? mint())} />
```

The draft row hands its `Reveal` to the rule it picks, and removing the last rule hands its row back to the "Where" lead. A rule count changed from elsewhere — another window, a refused save unstaged — re-mints every id, so the rows remount once; only a field mid-edit in that same moment loses its text.

```UIX/Fields/TokenField.tsx diff
-        if (target.closest('button')) return e.preventDefault()
+        if (target.closest('button')) return keepFocus(e)
```

**VERIFY**

- [x] `OptionEditor.test.tsx`, `PropertyPicker.pane.test.tsx`, `PropertyFrame.test.tsx`, `FilterFrame`'s tests, `PreviewRulesRow.test.tsx`, the view and Matrix filter tests, and `TokenField`'s tests are green.
- [x] Run the gates, then commit.
- [x] Check for unnecessary code or mistakes.

#### Task 3-5

**TASK:** Mount the row in `PropertyPanel` for page subjects, below the Properties group under a divider, and check both surfaces live.

**NOW:** `PropertyPanel`'s rows column (`s.pageRows` in the dropdown, `s.panelRows`, the scroll region, in the side pane) holds the Contexts and Properties groups; a Space subject shares it. The panel's `title` is `subject.title ?? fetchedTitle`, loaded with the frontmatter before `body()` renders. The mount and its test sit uncommitted in the tree.

**CHANGE**

- [x] In `Core/Properties/PropertyPanel.test.tsx`, "a page shows its Aliases row after the Properties group, and a Space shows none" — both page hosts, the row's text following the last group's in document order — fails without the mount.
- [x] Apply the diff below.

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

- [x] `PropertyPanel.test.tsx` is green, the new case included.
- [x] `node live-drive.mjs 1 2 3 4 5 6` from `.claude/scripts/Alias Drive/` passes every check — the harness builds the app, backs up and restores `~/Test`, and drives its own instance on port 9373 — asserting each gesture's writes to disk and recording its latency and render cost:
  - **Panel:** the row shows in the page dropdown and the PageWindow side pane, scrolls with the groups in the side pane, and is absent from a Space's dropdown; add, rename, and delete each update the count.
  - **Manage pane:** its rows sit edge to edge on the picker's surface like the body picker's; opening it focuses nothing; × shows at rest; + drafts at the end with the caret seated, without nudging the pane's scroll (else `EditableInput` focuses with `{ preventScroll: true }`, recorded); Enter keeps the draft's row; a single click does nothing; a double-click on a name and the row menu's Rename rename in place; the row menu's Delete and × delete; typing the title dims.
  - **Body picker:** after `[[Page A|`, the same rows; a single click inserts after the double-click window, and a double-click on a name renames instead; + adds without inserting, the pane staying open, the link under it staying raw, and the caret returning to the slot; Escape in a field returns the caret; a press on another field or on blank chrome mid-edit closes the picker and leaves the slot as a blur would; the row menu opens during a rename without closing the picker; the same in a table cell's editor and a Text property's TextPane.
  - **Excluded Directories and Open In Preview:** Excluded Directories' pane keeps its width, folder-trail tone, and look, and × on a field mid-edit sends one `exclusions:set` without the typed text; Open In Preview's pane opens at the shared 250 minimum (it was 225), screenshotted for Nathan.
  - **Option editor and filters:** a new option stays open until it lands and keeps its typed title on a refused duplicate; Filter's × discards a value cell's edit in progress, in Open In Preview and a view's filter pane.
  - **Perf:** the alias stage's open, filter keystroke, and keyboard pick hold against a baseline build of the pre-Phase-3 head (`POMMORA_DRIVE_REPO`, `--against`), with the page stage as the in-run control.
  - The drive's screenshots of the Manage pane, the body picker, Excluded Directories, and Open In Preview go to Nathan.
- [x] Run the gates, then commit.
- [x] Check for unnecessary code or mistakes.

#### Task 3-6

**TASK:** Close the alias edges the interaction review reproduced: a name the list can't keep never commits, a name a link can't carry is no alias, a pending click insert dies with the list it was clicked in, an own-page link never opens an alias slot, a stored list survives one bad element, Link values remember only wiki aliases as bodies do, and the renderer's alias write is written once.

**NOW:**
- `EditableInput` dims `invalid` text but commits it on blur (`UIX/Fields/EditableInput.tsx`), so `AliasList` sends a rename or add onto the title, which the host answers ok without a change: a rename flashes the title and reverts, and an add drops the typed draft. `PropertyValueInput` re-checks its own `invalid` in `commit` and drops the text instead.
- The link grammar refuses `]`, CR, and LF in an alias (`pageLinkPattern`, `connectionText`'s inline `/[\]\r\n]/`), but `AliasList`'s `invalid` and `applyAliasEdit` both let such a name through, so picking `a]b` writes `[[Alpha|a]b]]`, which no longer reads as a link.
- `AliasList`'s pick timer captures only the alias and clears only on unmount, a second click, or a rename. A click followed within 300ms by typing in the slot, or by moving the caret into another link's slot, lands the alias there; one timer order threw a `RangeError` at `useConnectionAutocomplete.ts:163`.
- In a TextPane, a heading picked from `[[#` opens an empty alias slot: `commit` takes `pageId` from the held own page (`useConnectionAutocomplete.ts:147`), while bodies offer no own-page aliases.
- `pageMetaEntry.aliases` decodes as `z.array(z.string()).optional().catch(undefined)` (`Core/Nexus/schemas.ts:27`), so one non-string element drops the whole list, and the next write stores only the new alias. `eachOf` (`Core/Files/decoders.ts`) is the codebase's element-by-element list decode.
- `rememberedAlias` (`Core/Properties/assignValue.ts`) remembers a markdown-form Link value's label, while a body's markdown link remembers nothing (`connectionAt` reads wikilinks only).
- `mutate({ op: 'editAliases', path, edit }) !== null` is written twice, in `editorHost.tsx`'s `editAliases` and `AliasesRow.tsx`'s `edit`.

**CHANGE**

- [x] In `UIX/Fields/EditableInput`'s tests, add and watch fail: with `invalid` marking the text, Enter restores the field and calls `onCancel`, not `onCommit`.
- [x] In `Core/Connections/aliasMemory.test.ts`, add and watch fail: `remember`, `add`, and `rename` onto `a]b` or a name carrying a line break leave the list unchanged; `heldAliases` drops such a stored name.
- [x] In `aliasPicker.test.tsx`, add and watch fail: a single click followed within `PICK_DELAY_MS` by a typed character inserts nothing once the window passes; the same click followed by the slot moving to another link inserts nothing; in a TextPane holding a page with aliases, a heading picked from `[[#` writes `[[#Setup]]` with no slot.
- [x] In `AliasesRow.test.tsx`, add and watch fail: renaming `the plan` onto the title closes the field and sends nothing, the row reading `the plan` throughout; typing `a]b` marks the field `aria-invalid`.
- [x] In `Core/Nexus/schemas`' or `pageMetadata`'s tests, add and watch fail: a shard entry holding `['keep me', 3, 'and me']` reads `['keep me', 'and me']`, and a `remember` on it keeps both.
- [x] In `Core/Properties/assignValue`'s tests, add and watch fail: a Link value `[my label](Alpha)` remembers nothing.
- [x] Apply the diffs below, then add the Alias Drive steps that prove the click-insert drop, the own-page heading, and the TextPane's Enter close with the caret in an authored slot, and run the drive's groups 1–3.

**AFTER**

```UIX/Fields/EditableInput.tsx diff
-  /** Dims text that won't commit, marked on the node so a keystroke never renders. */
+  /** Dims text that won't commit, marked on the node so a keystroke never renders; leaving with it restores the field and cancels, as a blank name does. */
 …
-        if (required && !next) {
+        if ((required && !next) || invalid?.(next)) {
```

```Core/Connections/connections.ts diff
+/** Whether a link's alias slot can carry `alias`: the grammar ends the slot at `]` and the line. */
+export const aliasFits = (alias: string): boolean => !/[\]\r\n]/.test(alias)
 …
   const named =
-    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(target)
+    alias && aliasFits(alias) && normalizeTitle(alias) !== normalizeTitle(target)
```

```Core/Connections/aliasMemory.ts diff
+import { aliasFits } from './connections'
 …
+/** A name a page can hold as an alias: one a link's alias slot carries, and never the page's own title. */
+export const keepsAlias = (name: string, title: string): boolean =>
+  aliasFits(name) && normalizeTitle(name) !== normalizeTitle(title)
+
-/** One alias is one name whatever its case, and a page's own title is never one; a list breaking either rule reads tidied, and its next edit stores it so. */
+/** One alias is one name whatever its case, and a name `keepsAlias` refuses is never one; a list breaking either rule reads tidied, and its next edit stores it so. */
 export function heldAliases(worn: readonly string[], title: string): string[] {
-  const seen = new Set([normalizeTitle(title)])
+  const seen = new Set<string>()
   return worn.filter((a) => {
     const key = normalizeTitle(a)
-    if (seen.has(key)) return false
+    if (seen.has(key) || !keepsAlias(a, title)) return false
 …
 export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
-  const own = normalizeTitle(title)
   const held = heldAliases(worn, title)
 …
-  if (!named || key === own) return held
+  if (!named || !keepsAlias(named, title)) return held
```

```Core/MarkdownPM/Autocomplete/AliasList.tsx diff
-import type { AliasEdit } from '../../Connections/aliasMemory'
-import { normalizeTitle } from '../../Paths/caseFold'
+import { type AliasEdit, keepsAlias } from '../../Connections/aliasMemory'
 …
-  useEffect(() => () => window.clearTimeout(pick.current), [])
+  // A pending pick belongs to the list it was clicked in: typing in the slot or moving to another changes the list and drops it.
+  const listed = aliases.join('\u0000')
+  useEffect(() => () => window.clearTimeout(pick.current), [listed, match])
 …
-                invalid={(text) => normalizeTitle(text) === normalizeTitle(host.title)}
+                invalid={(text) => !keepsAlias(text, host.title)}
```

```Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
     <AliasList
+      key={v.ac.from}
       aliases={v.candidates.map((r) => r.value)}
```

```Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
-    const pageId = row.kind === 'page' ? row.pageId : page?.id
+    const pageId = row.kind === 'page' ? row.pageId : ac.title ? page?.id : undefined
```

```Core/Nexus/schemas.ts diff
-import { entriesOf, numberCheck } from '../Files/decoders'
+import { eachOf, entriesOf, numberCheck } from '../Files/decoders'
 …
-  aliases: z.array(z.string()).optional().catch(undefined),
+  aliases: eachOf(z.string()).optional().catch(undefined),
```

```Core/Properties/assignValue.ts diff
-  if (target?.kind !== 'page' || !target.alias) return null
+  if (target?.kind !== 'page' || target.syntax !== 'wiki' || !target.alias) return null
```

The renderer's one alias write lives where the codebase keeps its renderer-side `mutate` wrappers — find the precedent, else beside `editorHost.tsx`'s builder as an exported `editPageAliases(path, edit): Promise<boolean>` — and `editorHost.tsx` and `AliasesRow.tsx` both call it. The harness's `wear` folds against the harness page's title when the spec gives one, so a picker suite can exercise the title rule. Keying `AliasList` on the slot's start means a different link's slot is a different list: an open field there already committed by blur when the caret left for the editor.

**VERIFY**

- [x] The new cases are green and each goes red without its change; `PropertyValueInput`'s and `TextPicker`'s tests stay green with their own `invalid` handling untouched.
- [x] The Alias Drive's groups 1–3, its new steps included, pass.
- [x] Run the gates, then commit.
- [x] Check for unnecessary code or mistakes.

#### Task 3-7

**TASK:** Draw every filter-like pane's rows compact through one source in `UIX/Menus`, so the collection Settings dropdown's Filter pane and the Matrix's filter match Open In Preview's.

**NOW:** `menuCompact` (`UIX/Menus/menu-row.css.ts`) reaches a pane only through `picker-base.css.ts`'s `pane`, so `FilterFrame` drew compact inside a `PickerMenu` (Open In Preview, the View tile's settings) and standard inside the toolbar's `MenuSurface` (the collection Settings dropdown, the Matrix menu): 40px rule rows against 36px.

**CHANGE**

- [x] In `FilterFrame.test.tsx`, the pane root carries `menuCompact` around its rule rows.
- [x] `UIX/Menus/frames.css.ts` exports `ruleFrame = style([menuCompact])`, documented as the rule that a pane of rule rows draws compact wherever it's hosted; `filter-frame.css.ts`'s `frame` composes it.
- [x] Live: the collection Filter pane, the Matrix filter, and Open In Preview each draw 36px rule rows at `--row-pad-y` 4px (`753c82398`).

#### Task 3-8

**TASK:** Let both alias lists reorder by drag through the shared line engine, written as a `move` instruction, and make the stored order the user's: an alias keeps its place when used, a new one joins the end, and `remember` folds into `add`.

**NOW:**
- No alias list reorders. The line engine (`LineZone` + `lineList` + `LineRow` + `menuDropLine`, `UIX/Interactions/drag`) reorders every other list; the option value picker (`PropertyPicker.tsx:345-373`, `useOptionEdit.moves`) is the closest precedent — a picker pane of `MenuItem` rows with a click pick, a row menu, React keys from `useRenameKeys`, engine ids from the values, and a `move` op carrying `toIndex` among the other rows.
- `remember` moves an alias to the front on every authoring (`linkEdit.ts`'s `rememberAlias`, `assignValue.ts`'s `rememberedAlias`), and `add` moves a held alias to the end: either would undo a dragged order on the next use.
- `z.number().int().nonnegative()` is hand-written in `optionModel.ts:66`, `views.ts:393`, and `Trash/record.ts:66`.

**CHANGE**

- [ ] In `aliasMemory.test.ts`, rewrite the `remember` cases as `add` and add, watching each fail: `add` of a held alias in another case respells it in place; a new alias joins the end; `move` sets an alias at an index among the others (front, middle, end, past the end appends), keeps its stored spelling, matches whatever its case, and leaves the list unchanged for an unknown, blank, or title name; the schema refuses a negative or fractional `toIndex`.
- [ ] Repoint `linkEdit.test.tsx`'s and `connectionCommit.test.tsx`'s `remember` spies to `add`, and `aliasPicker.test.tsx`'s "most recent first" case to the stored order.
- [ ] In `aliasPicker.test.tsx` (`stubRect` + `firePointer`, as `OptionOrderList.test.tsx:52-82`), add and watch fail: a drag sends `{ op: 'move', alias, toIndex }`, leaves the doc unchanged and the editor focused, and inserts nothing once `PICK_DELAY_MS` passes; a press under the activation distance still inserts; with a typed query or a rename open, a press lifts nothing.
- [ ] In `AliasesRow.test.tsx`, add and watch fail: a pointer drag sends the move; a release on the row's own slot sends nothing; Space, ArrowUp, Space announces and sends the move; a draft open lifts nothing; × still deletes after a wobble under the button's slop.
- [ ] Rename `useConnectionAutocomplete.ts`'s local `keepsAlias` (the commit keeping a link's written alias) to `keepsWritten`, so the exported `keepsAlias` holds one meaning; let the harness's `list` read through `heldAliases` as the host's does; and bound the Alias Drive's two `together` steps to one or two shard writes, since two locked writes can land inside one poll — their final list and `stays` checks prove both edits.
- [ ] Apply the diffs below, then hoist the Option Picker Drive's `sweep`/`drag` into `drive-harness.mjs` (repointing that drive) and add the Alias Drive's reorder steps: a drag in the Manage pane writes the order once with the drop line and ghost drawn mid-drag; a release on its own slot writes nothing; the keyboard path; a drag while renaming writes nothing; a drag in the body picker writes the order with the editor still focused and the body unchanged; a filtered picker draws no drop line; a used alias keeps its place. Update the drive's group 1–3 expectations the fold changes, and run its groups 1–3.

**AFTER**

```Core/Files/decoders.ts diff
+/** A position in a list. */
+export const index = z.number().int().nonnegative()
```

`optionModel.ts`, `views.ts`, and `Trash/record.ts` read it in place of their own.

```Core/Connections/aliasMemory.ts diff
-import { op } from '../Files/decoders'
+import { index, op } from '../Files/decoders'
 …
 export const aliasEdit = z.discriminatedUnion('op', [
-  op('remember', { alias }),
   op('add', { alias }),
   op('rename', { from: alias, to: alias }),
+  op('move', { alias, toIndex: index }),
   op('forget', { alias }),
 ])
 …
-/** Authoring moves an alias to the front, an add puts it at the end, and a rename keeps its place, the newest spelling standing. */
+/** The order is the user's: an add respells a held alias in place or puts a new one at the end, a rename keeps its place, and a move sets it among the others, the newest spelling standing. */
 export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
 …
   switch (e.op) {
-    case 'remember':
-      return [named, ...others]
     case 'add':
-      return [...others, named]
+      return others.length < held.length
+        ? held.map((a) => (normalizeTitle(a) === key ? named : a))
+        : [...held, named]
+    case 'move': {
+      const moved = held.find((a) => normalizeTitle(a) === key)
+      return moved === undefined
+        ? held
+        : [...others.slice(0, e.toIndex), moved, ...others.slice(e.toIndex)]
+    }
```

`move` reads `named` through the same `keepsAlias` gate as the others, so the title and an unlinkable name never move.

```Core/MarkdownPM/Links/linkEdit.ts diff
-    void view.state.facet(editorHost).aliases.edit(target.page.id, { op: 'remember', alias })
+    void view.state.facet(editorHost).aliases.edit(target.page.id, { op: 'add', alias })
```

```Core/Properties/assignValue.ts diff
-    ? { op: 'editAliases', path: page.path, edit: { op: 'remember', alias: target.alias } }
+    ? { op: 'editAliases', path: page.path, edit: { op: 'add', alias: target.alias } }
```

```Core/MarkdownPM/Autocomplete/AliasList.tsx diff
+import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
 …
   MenuScrollFrame,
+  menuDropLine,
 } from '@pommora/uix/Menus'
 …
-      <div ref={rows} onKeyDownCapture={…}>
-        {list.rows.map((row, i) => (
-          <Reveal key={row.key} open enterOnMount={row.draft} fill>
-            <MenuItem …>…</MenuItem>
-          </Reveal>
-        ))}
-      </div>
+      <LineZone
+        {...lineList({
+          disabled: match > 0 || renaming !== null || list.drafting,
+          commit: (alias, slot) => void host.edit({ op: 'move', alias, toIndex: slot.index }),
+          line: menuDropLine,
+          label: (alias) => alias,
+          glyph: () => <Icon name={ALIAS_ICON} />,
+          watch: [listed],
+        })}
+      >
+        <div ref={rows} onKeyDownCapture={…}>
+          {list.rows.map((row, i) => {
+            const item = <MenuItem …unchanged…>…</MenuItem>
+            return (
+              <Reveal key={row.key} open enterOnMount={row.draft} fill>
+                {row.draft ? item : <LineRow id={row.value}>{item}</LineRow>}
+              </Reveal>
+            )
+          })}
+        </div>
+      </LineZone>
```

A drop swallows its release click, so a drag never arms the click insert; a double-click has no travel and still renames; a press inside a field never lifts. The engine's id is the value and React's key the rename key, as the option picker's. A typed query shows a scattered subset whose slot index means nothing in the stored order, and an open field would rename the row a move names, so both disable the zone rather than lock it — a locked zone still activates and swallows a click that wandered. The draft isn't stored, so it isn't a line row. Under `focus="keep"` the pane's `keepFocus` still refuses the press's focus move while pointer events run the drag; keyboard reorder lives in the Manage pane, as the caret pane's keys belong to the editor.

**VERIFY**

- [ ] The new cases are green, each red without its change; `OptionEditor`, `PropertyPicker`, `PropertyPanel`, and the Trash and view decode tests stay green.
- [ ] The Option Picker Drive's syntax check and the Alias Drive's groups 1–3, its reorder steps included, pass.
- [ ] Run the gates, then commit.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] `AliasList` is the one alias list: the body picker and the Aliases pane render nothing alias-specific of their own, its row menu reaches the host through `EditorHost['menus']`, and `useListEdit` is the one home of the draft and rename mechanics, shared with Excluded Directories.
- [ ] The editor holds its slot for an edit in its own caret pane — no close, no collapse, no remember, the link still raw — and every edit there ends with the caret back in the slot or with the editor's own leave; a single click inserts only once the double-click window passes, against the picker's state at that moment.
- [ ] `InputField` matches the baseline, `ManageList` is gone, and nothing in the tree serves only the bordered-field design.
- [ ] Every list that drafts a named value — aliases, exclusions, options — closes its draft once the value lands and keeps it open on refusal, and every × beside a field that commits on blur discards an edit in progress, Filter's included; no list keeps its own variant.
- [ ] `PropertyPanel` gained only the mount; no alias logic lives in Properties beyond `assignValue`'s remember.
- [ ] `keepsAlias` is the one rule for what a page holds, read by the host's `applyAliasEdit` and the list's dim alike, and a name the list dims never reaches the host.
- [ ] Compact rows reach a filter-like pane only through `ruleFrame` and a picker pane only through `picker-base`, both composing the one `menuCompact`; no pane sets row padding or type for compactness on its own.

### Phase 4 — Documentation

**GOAL:** The living documents describe the shipped behavior; nothing describes alias management as future work or the old write path.

#### Task 4-1

**TASK:** Reconcile every document *§Reconciliation* names, then recount `ContextPM.md:50`'s fire-and-forget sites.

**NOW:** See *§Reconciliation*.

**CHANGE**

- [ ] `ConnectionsPM.md` — rewrite the **Alias memory** paragraph to cover: the list written where an alias is authored (a body's alias slot, or a Link value that comes to show one) and managed from one alias list — the body picker's alias stage and the page's Aliases row show the same rows: × or the row menu's Delete deletes, a double-click or the row menu's Rename renames in place, + adds to the end, and in the body picker a single click inserts once the double-click window passes; link text is never rewritten; authoring moves an alias to the front; one alias per name whatever its case, the newest spelling standing; the page's own title never one; every edit applied by the host to the stored list. Rewrite the after-pipe paragraph's hover-× sentence (`:59`) to match, and remove the **Alias management** prospect.
- [ ] `PropertiesPM.md` — **The Properties Panel:** a page's panel ends, past a divider, with the Aliases row (pointing to ConnectionsPM); a Space's has none. The Link-value paragraph gains that a landed value showing an alias for a page gives the page that alias.
- [ ] `InterfacePM.md` — the Page Window's SidePane sentence gains the Aliases row below the two groups.
- [ ] `PommoraUIX.md` — Menus: the file list names `ManageRow.tsx`, `manage-row.css.ts`, and `useListEdit.ts`; a **Manage** row lists `ManageRow`, and a **List editing** row lists `useListEdit` · `ListRow`; the Row classes row gains `trailingCluster` · `trailingFigure`. Animations: an **Arrival** row lists `useEntrance` · `useRenameKeys`.
- [ ] `Guidelines/Editor-Internals.md:41` — **A caret pane never takes focus** becomes: a press in a caret pane leaves focus with the editor unless it lands in a field, and the editor holds its slot while that field is focused; the `mousedown`, never `pointerdown`, clause stays.
- [ ] `InteractionPM.md:89` — Hover Remove answers to its row "inside a tab", its only remaining row host.
- [ ] `InteractionPM.md` — beside **Entrance** (`:40`), a **Drafts** note: a list's draft is keyed for the value it writes (`useRenameKeys`' `mint`), closes once that value lands, and stays open on refusal — aliases, exclusions, options, and filter rules alike; a × beside a field that commits on blur keeps the focus (`keepFocus`), so it discards an edit in progress.
- [ ] `ContextPM.md:50` — drop "the alias memory's `setPageMeta`" and set the count to the `void dialer().ask(` sites the tree holds.
- [ ] `Planning/Cross-Device Mutation Checklist.md:41` — the route reads `Core/Nexus/mutate.ts` `editAliases` → `Core/Nexus/pageMetadata.ts` `editPageAliases`, and the row covers adding and renaming.

**AFTER**

Each paragraph reads whole, in the document's existing voice, with no amendment notes.

**VERIFY**

- [ ] `grep -rn "Alias management\|alias memory's \`setPageMeta\`" .claude` finds nothing.
- [ ] Each edited paragraph re-read in full.

---

### Completion Criteria

- **Conformance:** The implementation follows *§Constraints*, CLAUDE.md's hard rules, and Nathan's rulings; `ManageRow`, `AliasList`, `useListEdit`, `useRenameKeys`, `op`, and `applyAliasEdit` are each the one definition of their concept; nothing outside the named files changed.
- **Correctness:** In the running app, the Aliases row appears below Properties under a divider in the page dropdown and the PageWindow side pane and not for a Space; its pane and the body picker render the same rows, and each adds (to the end, caret seated), renames in place by double-click or the row menu, and deletes by × or the row menu; the body picker still inserts on a single click and keeps its slot through an edit; a Link value committed with an alias adds it; two quick forgets both land.
- **Completeness:** Every task is ticked; no TODOs, scaffolding, or debug output.
- **Confirmation:** Every new test goes red without its change; Nathan's Visual Pass and Live Feel carry his word.
- **Continuity:** *§Reconciliation* is walked and the documents read true.
- **Confidence:** Gates green from a clean state over `{baseline}..HEAD`; the diff is near the plan's size (code roughly +650 / −340, net near +310, most of it the shared alias list and the editor holding its slot through a picker edit), growth past it reported.

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
- `UIX/Pickers/PickerMenu.tsx:106` — "`keep` never takes it, so a press anywhere in the pane leaves focus with its owner" — Task 3-1
- `Core/MarkdownPM/Menus/caretPane.tsx:48` — "no press in the pane moves the caret out of its query" — Task 3-3
- `Core/MarkdownPM/Autocomplete/AutocompletePane.tsx:150` — "commits on mousedown, the way every autocomplete row does" — Task 3-3
- `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx` — the "forget × is inert until it is revealed" suite — Task 3-3
- `Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx:90` — rows counted by `.mdpm-ac-forget` — Task 3-3
- `Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx:95,100-111` and `aliasPicker.test.tsx:13-21,45-49,85` — the host's `remember`/`forget` and a row's `forget` closure — Task 3-1
- `Core/Pages/editorHost.test.ts` and `Core/MarkdownPM/Links/linkEdit.test.tsx` — `remember`/`forget` on the host — Task 3-1
- `.claude/Features/ConnectionsPM.md:59` — "Each row carries a hover-revealed × that forgets that alias" — Task 4-1
- `.claude/Guidelines/Editor-Internals.md:41` — "A caret pane never takes focus … refuses the focus move on every press inside the pane" — Task 4-1
- `.claude/Features/InteractionPM.md:89` — Hover Remove "inside a tab or a menu row" — Task 4-1
- `Core/Properties/Pickers/PropertyPicker.pane.test.tsx:290` — the option draft closing before its write — Task 3-4

#### Open Items

- Nathan's calls on two parity questions, each taken at its recommendation meanwhile: a markdown-form Link value's label stops being remembered rather than bodies starting to remember labels (Task 3-6); a Text value's plain inline field stays raw text without alias memory, as it carries no link picker, while its TextPane remembers.

#### Deviations

- Phase 2 extracted `ManageList` into `UIX/Menus` for Excluded Directories and the Aliases pane. Nathan's redirect gave the Aliases pane the body picker's rows (`AliasList`), leaving `ManageList` one consumer, so Task 3-1 folds it back into `ExclusionPane` and the shared mechanics live in `useListEdit`; Task 3-1 also returns `InputField` to its baseline, undoing `048b2d7d7`'s passthroughs for the bordered `AliasField` that Nathan's redirect replaced.
- Task 3-6 changes two frozen surfaces without changing what they keep: `pageMetaEntry`'s aliases decode element by element through `eachOf`, the on-disk shape unchanged, and `connectionText` reads the extracted `aliasFits`, its output unchanged.
- Tasks 3-7 and 3-8 (compact filter rows, alias reorder) came from Nathan during the run.
