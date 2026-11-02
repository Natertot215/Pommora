### Scout 2 — Lists and Right-Click (C-5 to C-9, D-1 to D-7)

**Baseline:** `8824cce29` on `active`. Every `file:line` below was read at that commit. Nothing in the repo was edited.

**The Short Version:** The list becomes `itemColumns(tree, schema, itemId)` beside `resolveColumn`, returning plain `ResolvedColumn`s. Four row types leave and none arrive. The page menu becomes `showPageMenu(page, host)`, where a host supplies only what it alone can do, and a row exists exactly when its handler does. `cardMenu.ts` and `cellMenu`'s `'title'` arm leave, `propertyRows.ts` and `propertyMenuActions.ts` merge into one file, and D-7 holds at zero lines. Estimated net: about −140 to −170 production lines (§7).

---

#### 1. Contradictions

Nothing stops a decision from holding. These are the conflicts, leads that went stale, and wording to fix.

1. **M-11 Is Dead; Don't Inherit It:** *Scout Findings* M-11 and its Option 1 pairing route view title-menu picks through the view's own seat. The Decisions' *§Rejected* list kills exactly that, and D-2 and D-3 keep `MenuSeat` as the one route. This report follows the Decisions. `runMetadataAction` keeps `requestPick`, and M-11's `open(column)` callback isn't built.
2. **M-11's Three Divergences Reduce to One, and That One Is Intended:**
   - `setStyle` is moot, because an option kind is always a submenu, so no option pane opens from a leaf (`propertyMenuActions.ts:44-61`).
   - The reveal gap is D-2's intended behavior.
   - The ghost gap is D-3.
   - What's false is the comment at `CardsView.tsx:193` ("only one picked from the Add chooser isn't shown yet"), not the code.
3. **D-3 Names Cards; the Gap Is Wider:** Table (`TableView.tsx:90`) and Sidebar (`Sidebar.tsx:328`) have the same `suppressed` shape and the same gap. Matrix already reads `pendingPick` (`MatrixView.tsx:45-48`). **In-Flight Call:** the fix covers all three, by *Principles*' "reflected across the board".
4. **The Size of D-3's Ghost Gap:** Every pane on this route draws a full-viewport shield: `PropertyPicker`, `FieldPicker`, and `TextPane` all take `PickerMenu`'s default `focus` (`PickerMenu.tsx:90,131`; `picker-base.css.ts:22`). Hover can't reach cards while a pane stands. The exposure is narrow: a hover in the tick between `popMenu` resolving and `MenuSeat`'s pane mounting arms a dwell, and that dwell fires under the open pane, because `blocked()` re-reads `suppressed()` at fire time (`ghostCreate.ts:16,49,63-66`) and `suppressed()` never checks `pendingPick`. It's a race, not a steady state. The one-page-menu change narrows it further: `requestPick` now runs inside the hold on every surface, so `pendingPick` is set before `menusOpen` drops. What remains is `menusOpen--`, then the render, then the shield's mount, and a dwell armed there is still only stopped by `suppressed()` reading `pendingPick`. So the fix stays load-bearing and costs two lines.
5. **Two "Held"s:** See *§The Two Definitions of Held*. They diverge only on a key present with a blank or unreadable value, and C-9 keeps both.
6. **`cellMenuContextFor('title', …)` Is Dead in Production:** The Table routes a title to `openTitleMenu` (`TableView.tsx:232-233`), and cards filter title out (`cardColumns.ts:24`). The panel has no title row. `cellMenu.ts:64` runs only in tests. It's deleted with `:65`, and `cellMenuContextFor` and `baseCellMenu` take `type: ColumnType`: the seat is the only production caller, a title never reaches `seat.menu`, and `column.type` is never undefined, so neither term of a null return could be true (§5, Step 5).
7. **Decision C-5 Changes Nothing:** Only Created and Modified leave (C-6). C-5 as written already matches `addEntriesFor` (`cardColumns.ts:38-58`), so it's a guardrail, pinned below.
8. **Doc Claims That Differ From the Code:**
   - `PropertiesPM.md:119` says Spaces list "in registry order". C-7 picks the panel's order, so the doc goes false.
   - `InterfacePM.md:34` claims "the same rows in the same order" today, which is false for cards (no Preview, no Reveal) and the Table (no Reveal). D-4 makes it true apart from the carried exceptions, and the doc's list omits the Matrix.
9. **A Rejected Rationale Depends on D-7:** "*no option pane on that route*" holds only while an empty option list stays grey, which D-7 keeps.

---

#### 2. What's True

##### The Three Builders

| | Card's Add | Panel | System Menu |
| --- | --- | --- | --- |
| **Code** | `addEntriesFor` `cardColumns.ts:31-59`, `orderAddableEntries` `:67-69` | `PropertyPanel.tsx:164-186` | `propertyMenuBranches` `propertyMenuActions.ts:27-62` |
| **Contents** | Contexts + schema + unshown stamps (via `hiddenListIds`, `visibilityModel.ts:18`) minus shown | Contexts + schema | Contexts + schema |
| **Context Order** | Hidden first, then fill-first | `config.order.contexts`, then `spaceNode.rowOrder` (`:174-176`) | Registry (`:59`) |
| **Property Order** | Hidden first, then fill-first | Schema, then `rowOrder` (`:177`) | Option kinds first (`:60`) |
| **Row Shape** | `AddEntry` then `PickEntry` | `Field` then `PickEntry` | `PropertyMenuRow` |

`resolveRowOrder` deletes each listed key after its first hit (`moveItem.ts:60-66`), so nesting two calls equals one call over the concatenated lists. That lets the panel's double resolve become one.

##### What Each Surface Needs

| Surface | Needs from the Builder | Stays the Host's |
| --- | --- | --- |
| Card's Add | Both groups in order | Leave out `shownColumnsFor`; held rows last (C-7's exception) |
| Panel Rows | Both groups in order | `isShown` filter |
| Panel's Add | One group in order | `!isShown` filter; which group |
| System Menu | Both groups in order, unfiltered | Option mapping to `ActionItem`s |

No surface needs anything from the builder except order and membership. Label and icon already come from `columnLabel` and `columnIcon` (`columnDisplay.ts:6-18`), which agree with `PaneTarget` today. Value comes from `resolveFieldValue`, memoized per frontmatter and definition (`fieldValue.ts:41`).

##### The Two Definitions of Held

- **Panel (`PropertyPanel.tsx:166-172`):** a pending pick answers first. Otherwise a property is held when its key exists (`Object.hasOwn(fm, key)`), and a Context when it has ids. This asks, "does the file name this field?"
- **Card (`cardColumns.ts:50`):** `isBlankValue(resolveFieldValue(row, column))`. This asks, "is there a value to show?"
- **Where They Differ:** only a key present whose value reads blank.
  - `Done: false`, since `checkboxWord(false)` gives `NULL_VALUE` (`propertyValue.ts:172-173`).
  - `Stage: Gamma` with no such option (`:182-188`).
  - A bare `Stage:`.
- **Contexts Don't Diverge:** `fieldValue.ts:20-23` and `PropertyPanel.tsx:171` agree.
- **Pending Picks Don't Diverge:** `resolveFieldValue` reads `picked` first.
- **Where That State Comes From:** the app never writes it, since a blank value deletes the key (`rootValues.ts:14`) and unchecking removes it (`propertyValue.ts:111-113`). So it's external edits, and NexusOS is an Obsidian vault, whose checkbox writes `false`.
- **Pins:** `PropertyPanel.test.tsx:192-203` pins the panel's side, but no test pins the divergent case.

##### Every Difference in the Page Menu

**Building, Today:**

| | `titleMenuContext` `useViewInteractions.tsx:395-402` | `showEntityMenu` `entityMenuActions.ts:45-64` |
| --- | --- | --- |
| Row | Pipeline row, overrides included | `fetchPageRow`, an IPC read before the menu opens |
| Schema | The view's | `holderSchema` |
| `alreadyOpen` | Read here | Each caller reads it (`Sidebar.tsx:81`, `MatrixView.tsx:76`) |
| Move Context | `pageMoveContext` here | Each caller (`Sidebar.tsx:91`, `MatrixView.tsx:78`) |
| Branches | Always | Only with a `trigger` and an `id` |
| Rows | `cardMenuModel` or `cellMenuModel` | `entityMenuItems` |

**Running, Today:**

| Action | `runTitleAction` `:405-435` | `runEntityAction` `:79-132` |
| --- | --- | --- |
| Open, Send, History, Archive, Delete | `runPageAction` | `runPageAction` |
| `prop:` | `commitValue`, `liveRows`, `styleOf` | `oneShotWriter`, `assignValue`, no style |
| Rename | `policy.rename` (Table inline state; Cards `beginRename(…, 'detail')`) | `beginRename(path, false, host)` |
| Icon | `openIconPicker` (the view's `IconChoice` on the glyph) | `beginIcon(path, host)` |
| New Page | `creation.createAdjacent` (seeds, order, ghost flow) | `newPageAdjacent(path, where, host)` |
| `image:edit` | Card's caller, `CardsView.tsx:937-938` | None |

**What a Host Genuinely Must Supply:** rename, new page, and the row with its writer. Each of those differences comes from where the state lives, so none folds without moving view state into the store. Icon differs only through today's two summon models: once both surfaces pick through `chooseIcon`, it's one closure on both, so the menu answers it itself and a host supplies only the trigger it anchors to. Everything else in the two columns is the same logic written twice.

##### Every Row Difference

| Row | Sidebar | Matrix | Table | Cards | Reason |
| --- | --- | --- | --- | --- | --- |
| Edit Image | — | — | — | When `banner === 'banner' && cover` | **Carried:** only a card has an image band to edit |
| Preview | ✓ | ✓ | ✓ | ✗ | None; cards gain it |
| Reveal Location | ✓ | ✓ | ✗ | ✗ | None; both gain it |
| New Page Rows | Pair | None | Pair | Single | **Carried:** a graph has no slot, a grid has no above (`pageMenu.ts:110`) |
| Everything else | ✓ | ✓ | ✓ | ✓ | Same |

Branches are also absent from the sidebar or Matrix path without a trigger. That's a real gate but not a surface difference, since a leaf needs an anchor. Sidebar always passes one. Matrix may lack one only if its label failed to seat (`MatrixView.tsx:69`).

##### The Route

`runPropertyAction` calls `requestPick` (`propertyMenuActions.ts:89-97`), and `MenuSeat` runs it (`ValueSeat.tsx:338-351`). Its `columnOf` branches on `held.column.kind` and runs `registry.find` (`:323-327`), where every other host calls `resolveColumn` (`useViewHost.ts:207`, `PropertyPanel.tsx:81`). A held Context column never re-resolves, so a deleted Context's pane stays open, though that's unreachable today since Contexts are never leaves.

`holder` is a second parallel: `pagesByIdOf(tree).get(row.id)` at `propertyMenuActions.ts:93`, versus `holderOf(row, ctx)` at the other hosts.

All right-click menus go to the system menu: `popMenu` with no trigger always asks the host (`menuActions.ts:12`), and `showPageMenu` keeps calling it with none (D-1).

##### D-7 — An Empty Option List

`pickGroups` drops empty groups (`pickModel.ts:14`), so `options: []`, then `submenu: joinGroups([]) = []`. Both renderers **grey the row with no way in**: `Desktop/Actions/menu.ts:25-28` and `menuRows.ts:8`, with the rule stated at `menuModel.ts:21` and pinned at `Desktop/Actions/menu.test.ts:73`. It's a designed, tested state, not an empty flyout. A Context with no Spaces lands in the same place: `[[]]`, then `joinGroups` gives `[]`.

##### Plain Action Menus (D-6)

Nothing here touches `MenuPresenter`. The one mechanic it shares with the right-click route is the greyed empty branch (`menuRows.ts:8` beside `Desktop/Actions/menu.ts:25-28`), which §5, Step 9 leaves unchanged.

##### Smaller Menus (D-5) — Confirmed Separate

None calls `pageMetaMenuItems`, so its signature change doesn't reach them. They use the shared pieces:

- `tabMenu.ts:7` and `navRowMenu.ts:6` use `pageSendGroups`.
- `connectionMenu.ts:7` uses `pageOpenRows`.
- `PAGE_ACTION_ROWS` (`pageMenu.ts:104`) feeds `popPageActions` (`pageMenuActions.ts:77-84`), called at `PageMenu.tsx:53` and `WindowTabBody.tsx:235`.

All four finish through `runPageAction`, so they stay consistent with the one menu's verbs. One real inconsistency exists: `tabMenu.ts:13,21` and `navRowMenu.ts:11` extend `PageMenuContext` and inherit `spaces` and `properties` they can never take. §5, Step 5 splits the type. `pageSendGroups`' `reveal = false` for tabs and nav rows stays, since those surfaces point at a page rather than manage it (`pageMenu.test.ts:40`).

---

#### 3. Removal Inventory

**Leaves Outright:**

| Item | Where |
| --- | --- |
| `addEntriesFor`, `AddEntry`, `orderAddableEntries` | `Core/Views/Cards/cardColumns.ts:31-59,61-65,67-69` |
| Imports: `isBlankValue`, `NexusTree`, `SavedView`, `isCompact`, `hiddenListIds`, `contextIdsOf`, `contextsByIdOf`, `resolveFieldValue`, `resolveColumn`, `columnLabel`, `ValueContext` | `cardColumns.ts:2,3,5,6,7,8,9,10,11` |
| `Field`, `contextFields`, `schemaFields`, `nexusWide`, `hidden()`, `fieldOf`, `contextValues` | `PropertyPanel.tsx:42,164,165,174,183-186,242-243,154` |
| Panel imports: `resolveRowOrder`, `PropertyDefinition`, `isBlankValue`, `PickEntry`, `paneTargets`, `contextColumn`, `propertyColumn` | `PropertyPanel.tsx:8,15,16,21,27,31` |
| `renderRow`'s column derivation | `PropertyPanel.tsx:274` |
| Option-first partition | `propertyMenuActions.ts:60` |
| `PropertyMenuOption`, `PropertyMenuRow`, `propertyRow`, `propertiesRow`, `propertyBranchRows` | `Core/Actions/propertyRows.ts:3-13,19-40,42-50` |
| `PropertyMenuTarget`, `propertyMenuBranches` as an intermediate | `propertyMenuActions.ts:21-25,27-62` |
| `Core/Actions/cardMenu.ts` and `cardMenu.test.ts`, with `CardMenuAction` and the cast at `:22` | whole files |
| `{ kind: 'title' }`, its arms, its imports, and `PageMetaAction \| PageMoveAction \| PropertyAction` in `CellMenuAction` | `Core/Actions/cellMenu.ts:3-9,15,32-34,109,117-126`; `ctx.kind !== 'title'` at `:95`; `:64-65` |
| `titleMenuContext`, `runTitleAction`, `TitleMenuContext` | `useViewInteractions.tsx:50,395-402,404-435,475-476` |
| View imports: `PageMenuContext`, `pageMoveContext`, `runPageAction`, `propertyMenuBranches`, `runPropertyAction`, `isOpenInTabs`, and F-2's `chooseIcon`; `tree` in the destructure | `useViewInteractions.tsx:7,26,27,28,91` |
| Page branch of `entityMenuItems`, with its duplicate args | `Core/Actions/entityMenu.ts:44-52` |
| `showEntityMenu`'s inline row, schema, and writer assembly | `entityMenuActions.ts:49-75` (folds into `readTarget`) |
| `runEntityAction`'s page line and arms; `ownIconOf`'s page arm and the `nodesByIdOf` import | `entityMenuActions.ts:86,102,109-112` |
| `pageMetaMenuItems`' `window`, `reveal`, `spaces`, `properties`, positional `alreadyOpen` | `pageMenu.ts:120-127` |
| `alreadyOpen` and move context at callers | `Sidebar.tsx:44,45,80-81,88,91`; `MatrixView.tsx:9,12,63,76,78` |
| Card's `titleMenuContext`, `titleAction`, `popMenu`, `cardMenuModel`, `holdGhost`, and `GhostSuppress.Provider` (its only reader was `:919`) | `CardsView.tsx:1,44,49,69,70,99,100,280,281,381,509,919,927-936` |
| `GhostSuppress` itself, and the sidebar's and banner menu's reads of it | `UIX/Interactions/ghostCreate.ts:10-11`; `Sidebar.tsx:12,115,250,413,441`; `useBannerMenu.tsx:6,33` |
| Table's `cellMenuModel`, `popMenu`, and two-step title menu | `TableView.tsx:4,40,147-159` |
| `ValuePickRequest.holder` | `chromeSlice.ts:2,20`; `propertyMenuActions.ts:3,93` |
| `MenuSeat`'s kind branch and registry selector | `ValueSeat.tsx:6,316,322-327,333` |

**Merges:**

| Item | Into |
| --- | --- |
| `Core/Actions/propertyRows.ts` + `Core/Interface/Menus/propertyMenuActions.ts`, 160 lines | `Core/Actions/metadataMenu.ts`, about 100 lines |
| `propertyRows.test.ts` + `propertyMenuActions.test.ts` | `Core/Actions/metadataMenu.test.ts` |
| `parsePropertyAction` | Private to `metadataMenu.ts`; its cases run through `runMetadataAction` |
| `cardMenu.test.ts` and `cellMenu.test.ts`' title cases | `pageMenu.test.ts` |
| `PageMenuContext` (`pageMenu.ts:29-34`) | `PageMoveContext`, moves only |

**Stays, Deliberately:**

- `hiddenListIds` for `VisibilityFrame.tsx:101`; its tests are untouched, so C-6 doesn't reach Visibility.
- `fillsBlank`, for `CardsView.tsx:684`, which keeps a shown stamp's blank cell drawing no dash. Its one remaining use is real, and its test stays.
- `paneTargets.ts`, for `previewRules`, `filterModel`, `GroupFrame`, and `SortFrame`.
- `propertyMenu.ts`. It's the Property Frame's ⋮ model (`PropertyFrame.tsx:242,251`), and the name is accurate once its false twin is gone.
- `oneShotWriter`, `requestPick`, and `pendingPick`.

**Retires With Scout 1's Work, Not Here:** `PickEntry`, `AddPickerRequest`, `addableFor`.

---

#### 4. Approaches

##### The Row Model

| | A: Plain `ResolvedColumn` (Recommended) | B: `{ column, label, icon, held }`, Keeping `PropertyMenuRow` (M-7, M-8) |
| --- | --- | --- |
| **New Types** | None; one `Record` alias | One |
| **Row Types After** | One | Two |
| **Label and Icon** | `columnLabel`/`columnIcon` where drawn | Computed for rows nobody draws |
| **`held`** | `holdsValue(row, column)` | A field carrying the card's meaning, which the panel can't use |

B's case for keeping `PropertyMenuRow` is that it carries checked option runs. But `checked` is already a field of `ActionItem` (`menuModel.ts:12`), and `propertyRow` maps it across 1:1 (`propertyRows.ts:19-33`). The type exists only to cross a file boundary, because `Core/Actions` once held no tree-aware code. It has no independent purpose. Under *Less to Carry*, it goes. Removing it also resolves E-6 outright: `pageMenuItems` takes one `metadata` list, so "the branches twice" can't recur.

##### Where the Builder Lives

| | Where | For | Against |
| --- | --- | --- | --- |
| **1 (Recommended)** | `Core/Views/Pipeline/columns.ts` | No new file; beside `resolveColumn`, `contextColumn`, `propertyColumn`, the classifiers all three surfaces already import; it yields `ResolvedColumn`s as `resolveColumns` does | A Space's menu reading "Views/Pipeline", though the panel already does (`PropertyPanel.tsx:31`) |
| **2** | `Core/Views/paneTargets.ts` | Reuses a list module | It's `{id, label, icon}` for settings pickers, with no columns; five unrelated consumers |
| **3** | New `Core/Properties/itemColumns.ts` | Clearest name | A new file for one function; goes against *The Measure* |

Option 1 trips neither graph guard. A scratch import walker over the roots of `engineGraph.test.ts` (`serve.ts`) and `Desktop/hostGraph.test.ts` (the Desktop host's Core imports, renderer excluded) reaches none of `columns.ts`, `fieldValue.ts`, `columnDisplay.ts`, `contextIdentity.ts`, or `treeIndex.ts`. The walker approximates those tests, so `npm run test` is the final word. `columns.ts` does gain a `treeIndex` import, which pulls `@pommora/uix/Symbols` into anything reaching it. Every such file is renderer-side today, and the app has no workers.

##### The Runner

| | R1: `showPageMenu(page, host)` Owns Build, Pop, and Run (Recommended) | R2: `runPageMenuAction(action, target, host, anchor)` Runs Only |
| --- | --- | --- |
| **Removes** | `titleMenuContext`, `runTitleAction`, both `popMenu` sites, the caller context in Sidebar and Matrix | `runTitleAction`'s switch only |
| **Row and Handler** | One field: `newPage` absent means no rows and no handler | Rows decided in the builder, handlers in the host, so "no New Page on the Matrix" lives in two places |
| **Build** | One | Two: `titleMenuContext` and `showEntityMenu` |

R3, views calling `showEntityMenu`, is rejected: it would pull view closures into a sidebar-shaped function. A surface enum with one switch can't reach view closures at all.

##### The Three `property*Menu*` Files

| | F1: One File, `Core/Actions/metadataMenu.ts` (Recommended) | F2: `metadataMenu.ts` + `Interface/Menus/metadataMenuActions.ts` |
| --- | --- | --- |
| **Encode and Decode** | Side by side; `parse` goes private | Across two folders |
| **Pattern** | Departs from the `xMenu` + `xMenuActions` pair | Follows it |

The pair exists because those runners reach `Interface/Confirm` (`pageMenuActions.ts:9`, `entityMenuActions.ts:27`). This runner reaches only `useSession`, as `Core/Actions/menuActions.ts:3` and `createActions.ts:8` already do, so nothing earns a second file. The `prop:` parse stays private to the one file. Its action type, `MetadataAction`, sits in `pageMenu.ts`, which `metadataMenu.ts` imports as a type: `Core/Testing/engineGraph.ts` counts `import type`, and `pageMenu.ts` is on the engine path through `Actions/handlers.ts`, `editorMenu.ts`, and `gripMenu.ts`, while `metadataMenu.ts` reaches the store, so the type declared there would fail `engineGraph.test.ts`. The name `metadata` matches `MetadataPicker`, and it stops `propertyMenu.ts` reading as its twin.

##### Does `cardMenu.ts` Earn a File?

No. It's one conditional row around one call. `{ editImage }` on `pageMenuItems` replaces it and removes the cast. `cellMenu`'s `'title'` arm goes the same way, since the Table was only borrowing `cellMenuModel` to reach `pageMetaMenuItems`.

---

#### 5. The Proposed Change

Removal ordering is by step. Names are final unless Nathan changes them. Hunks are written against HEAD, on the names K-9 and F-2 land first (`o.id`, `chooseIcon`).

##### Step 1 — Pins Before Anything Moves

Add these while the code is still the old code:

- `cardGestures.test.tsx`: a value set from a card's right-click leaves a hidden property hidden, with `views:save` not called (D-2).
- `PropertyPanel.test.tsx` and `cardGestures.test.tsx`, at behavior level: `Done: false` shows a row and isn't in the panel's Add list, and a card's Add lists it and fills it (C-9).

C-5's two cases, a hidden held property listed and a Compact blank listed, land as `cardAddColumns` cases with the builder, since `addEntriesFor` leaves there.

##### Step 2 — The Builder

`Core/Views/Pipeline/columns.ts`, after `resolveColumn` (`:34`):

```ts
export type ItemColumns = Record<'contexts' | 'properties', ResolvedColumn[]>

/** Every Context and property an item can hold, in the order its panel lists them: the Nexus's Context order and its schema's, with a Space's own row order over both. */
export function itemColumns(
  tree: NexusTree | null,
  schema: PropertyDefinition[],
  itemId: string,
): ItemColumns {
  const rowOrder = spaceNodeOf(tree, itemId)?.rowOrder ?? []
  const idOf = (c: ResolvedColumn): string => c.id
  return {
    contexts: resolveRowOrder(contextIdsOf(tree).map(contextColumn), idOf, [
      ...rowOrder,
      ...(tree?.config.order.contexts ?? []),
    ]),
    properties: resolveRowOrder(schema.map(propertyColumn), idOf, rowOrder),
  }
}
```

Stamps can't enter, so C-6 needs no filter and `hiddenListIds` stays untouched. `contextPaneTargets` follows `contextsByIdOf`'s key order, which is `contextIds`' order (`contextIdentity.ts:41-58`), so the panel's input is unchanged.

`Core/Properties/fieldValue.ts`:

```ts
export const holdsValue = (row: ViewRow, column: ResolvedColumn): boolean =>
  !isBlankValue(resolveFieldValue(row, column))
```

`Core/Properties/columnDisplay.ts`:

```ts
export const GROUP_LABELS = { contexts: 'Spaces', properties: 'Properties' } as const
```

##### Step 3 — The Card's List

`cardColumns.ts`: `:26` becomes `holdsValue(row, c) ||`, and `:31-69` becomes:

```ts
export function cardAddColumns(
  item: ItemColumns,
  row: ViewRow,
  shown: ResolvedColumn[],
): ItemColumns {
  const drawn = new Set(shown.map((c) => c.id))
  const listed = (columns: ResolvedColumn[]): ResolvedColumn[] => {
    const unshown = columns.filter((c) => !drawn.has(c.id))
    return [
      ...unshown.filter((c) => !holdsValue(row, c)),
      ...unshown.filter((c) => holdsValue(row, c)),
    ]
  }
  return { contexts: listed(item.contexts), properties: listed(item.properties) }
}
```

`CardsView`'s one call:

```ts
cardAddColumns(itemColumns(tree, ctx.schema, row.id), row, shownColumnsFor(row, columns, isCompact(view)))
```

The old partition ran over the whole list and the picker then split by group, so per-group partitioning gives the same result. C-7's exception reason goes in `ViewTypesPM.md:122`, adding no comment.

##### Step 4 — The Panel

`PropertyPanel.tsx:164-186` becomes:

```ts
const fields = itemColumns(tree, schema, subjectId)
const held = (c: ResolvedColumn): boolean =>
  row !== null &&
  (holdsValue(row, c) ||
    (c.def !== undefined && !row.picked?.[c.id] && Object.hasOwn(row.frontmatter, c.def.key)))
const isShown = (c: ResolvedColumn): boolean => held(c) || revealed.has(c.id)
const shown: ItemColumns = {
  contexts: fields.contexts.filter(isShown),
  properties: fields.properties.filter(isShown),
}
```

This is equivalent to `:166-172` in every case: a pending pick answers through `holdsValue`, a non-blank value implies the key exists, and Contexts have no `def`. `shown[group].map((f) => f.id)` in `commitOrder` needs no change, since `ResolvedColumn` has `id`.

`renderRow` (`:273-274`) becomes:

```ts
const renderRow = (column: ResolvedColumn): React.ReactNode => {
  const { id } = column
```

It draws `columnIcon(column, ctx.contexts)` and `columnLabel(column, ctx.contexts)`. `fieldOf` leaves, and `glyphOf` (`:242-247`) and the line zone's `label` (`:366`) read `seat.host.columnOf`, so no `columnById` lands. Add's list is `fields[key].filter((c) => !isShown(c))`, keyed by `keyof ItemColumns` in place of `GroupKey`. Built on top of the patch, this step is −12 (+25 / −37).

##### Step 5 — The Metadata Menu

New `Core/Actions/metadataMenu.ts`, replacing both files:

```ts
const PREFIX = 'prop:'

const CHECKBOX_OPTIONS = [
  { id: 'true', label: 'Check' },
  { id: '', label: 'Uncheck' },
] as const

export interface MetadataTarget {
  row: ViewRow
  schema: PropertyDefinition[]
  rowOf: () => ViewRow | undefined
  commit: (column: ResolvedColumn, value: PropertyValue | null) => void
  trigger: HTMLElement
  styleOf?: (column: ResolvedColumn) => ColumnStyle
}

export function metadataBranches(
  { row, schema }: MetadataTarget,
  tree: NexusTree | null,
): ActionItem<MetadataAction>[] {
  const contexts = contextsByIdOf(tree)
  const branchRow = (column: ResolvedColumn): ActionItem<MetadataAction> => {
    const label = columnLabel(column, contexts)
    const leaf = `${PREFIX}${column.id}` as const
    const option = (
      o: { id: string; label: string },
      checked: boolean,
    ): ActionItem<MetadataAction> => ({ label: o.label, action: `${leaf}:${o.id}`, checked })
    const current = resolveFieldValue(row, column)
    if (column.type === 'checkbox') {
      const checked = current.kind === 'checkbox' && current.value
      return {
        label,
        submenu: CHECKBOX_OPTIONS.map((o) => option(o, (o.id === 'true') === checked)),
      }
    }
    if (pickKindOf(column.type) === null) return { label, action: leaf }
    const selected = selectedValues(current)
    return {
      label,
      submenu: joinGroups(
        pickGroups(column, contextOptionsFor(column, tree, row.id)).map((g) =>
          g.options.map((o) => option(o, selected.includes(o.id))),
        ),
      ),
    }
  }
  const item = itemColumns(tree, schema, row.id)
  return (['contexts', 'properties'] as const).flatMap((key) =>
    item[key].length > 0 ? [{ label: GROUP_LABELS[key], submenu: item[key].map(branchRow) }] : [],
  )
}

export function runMetadataAction(
  action: string,
  { row, schema, rowOf, commit, trigger, styleOf }: MetadataTarget,
): boolean {
  const parsed = parseAction(action)
  if (!parsed) return false
  const { id, value } = parsed
  const s = useSession.getState()
  const column = resolveColumn(id, schema, contextIdsOf(s.tree))
  // The property can leave between the menu opening and the pick; the pick then writes nothing.
  if (!column) return true
  const pick = pickKindOf(column.type)
  if (value === null) s.requestPick({ rowOf, column, trigger, commit, style: styleOf?.(column) })
  else if (column.type === 'checkbox') commit(column, checkboxValue(value === 'true'))
  else if (pick) commit(column, pickedValue(pick, resolveFieldValue(row, column), value))
  return true
}
```

`metadataMenu.ts` takes `MetadataAction` from `./pageMenu` as a type (§4). `parseAction` is `parsePropertyAction` (`propertyRows.ts:52-59`) unchanged and private. The option-first line is gone, so C-7 holds on the menu. `runMetadataAction`'s request carries no `holder`, and `MenuSeat` takes it from `holderOf` (Step 7).

`Core/Actions/pageMenu.ts`:

```ts
export interface PageMoveContext {
  moveTargets?: MoveTarget[]
  currentParentPath?: string
}

export type MetadataAction = `prop:${string}`
export type NewPageRows = keyof typeof NEW_PAGE_ROWS
type PageMenuAction = PageMetaAction | PageMoveAction | MetadataAction | 'image:edit'

export function pageMenuItems(
  ctx: PageMoveContext & {
    alreadyOpen?: boolean
    newPages?: NewPageRows
    editImage?: boolean
    metadata?: readonly ActionItem<MetadataAction>[]
  },
): ActionItem<PageMenuAction>[] {
  return joinGroups<PageMenuAction>([
    [
      ...(ctx.editImage ? [{ label: 'Edit Image', action: 'image:edit' as const }] : []),
      ...pageOpenRows({ alreadyOpen: ctx.alreadyOpen, window: true }),
    ],
    [RENAME_ROW, { label: 'Edit Icon', action: 'title:icon' }, ...(ctx.metadata ?? [])],
    ctx.newPages ? NEW_PAGE_ROWS[ctx.newPages] : [],
    ...pageSendGroups(ctx, true),
    REMOVAL_ROWS,
  ])
}
```

**In-Flight Call:** `pageMetaMenuItems` renames to `pageMenuItems`, joining `tabMenuItems`, `navRowMenuItems`, and `entityMenuItems`.

`tabMenu.ts:6,13,21`, `navRowMenu.ts:4,11`, and `pageMenuActions.ts:2,13` take `PageMoveContext`. `pageSendGroups` takes it too (`pageMenu.ts:83`). `pageMenu.ts:2`'s import from `./propertyRows` leaves with that file.

`Core/Actions/entityMenu.ts`:

- `EntityMenuTarget` drops `PageMenuContext` and gains `metadata?`.
- Its union splits `page` so an `id` is required there.
- `entityMenuItems` loses `:44-52`.
- `:88` reads `...(target.metadata ?? [])`.
- `EntityMenuAction` takes `Extract<PageMetaAction, 'title:rename' | 'title:copypath' | 'title:reveal' | 'title:archive' | 'title:delete'>` in place of the whole union and drops `PageMoveAction`.

`Core/Actions/cellMenu.ts` loses the `'title'` lines listed in §3, and `:64-65` are deleted. `cellMenuContextFor` and `baseCellMenu` take `type: ColumnType` (`:46,58`): the seat is the only production caller, a title never reaches `seat.menu` (the Table routes it away at `TableView.tsx:233`, cards drop it at `cardColumns.ts:24`, and the panel lists only properties and Contexts), and `column.type` is never undefined, so neither term of a null return could be true.

`cardMenu.ts` is deleted.

##### Step 6 — One Page Menu

`Core/Interface/Menus/pageMenuActions.ts`:

```ts
interface PageMenuHost {
  trigger: HTMLElement | null
  rename: () => void
  newPage?: { rows: NewPageRows; create: (where: 'above' | 'below') => void }
  editImage?: () => void
  values?: MetadataTarget | null
}

export async function showPageMenu(
  page: { id: string; path: string; title: string },
  { trigger, rename, newPage, editImage, values }: PageMenuHost,
): Promise<void> {
  const { tree, tabs, pinned, mutate } = useSession.getState()
  const action = await popMenu(
    pageMenuItems({
      ...pageMoveContext(tree, page.path),
      alreadyOpen: isOpenInTabs(tabs, pinned, { kind: 'page', id: page.id, path: page.path }),
      newPages: newPage?.rows,
      editImage: editImage !== undefined,
      metadata: values ? metadataBranches(values, tree) : undefined,
    }),
  )
  if (!action || (values && runMetadataAction(action, values)) || runPageAction(action, page))
    return
  switch (action) {
    case 'title:rename':
      return rename()
    case 'title:icon':
      return chooseIcon(trigger, tree?.config.pageMetadata[page.id]?.icon, (icon) =>
        void mutate({ op: 'setIcon', path: page.path, kind: 'page', icon }),
      )
    case 'title:newabove':
      return newPage?.create('above')
    case 'title:newbelow':
      return newPage?.create('below')
    case 'image:edit':
      return editImage?.()
  }
}
```

`Core/Interface/Menus/entityMenuActions.ts`:

```ts
async function readTarget(
  target: EntityMenuTarget,
  trigger: HTMLElement,
): Promise<MetadataTarget | null> {
  const { tree } = useSession.getState()
  const node = target.kind === 'space' && target.id ? spaceNodeOf(tree, target.id) : null
  const row =
    node && tree
      ? spaceRowOf(tree, node)
      : target.kind === 'page'
        ? await fetchPageRow(tree, target)
        : null
  if (!row) return null
  const writer = oneShotWriter(row)
  return {
    row,
    schema: holderSchema(tree, node ?? target.path),
    rowOf: () => writer.current.rowOf(row.id),
    commit: (column, value) => void assignValue(writer, row, column, value),
    trigger,
  }
}

/** Resolves on close, before the pick runs: a surface holding a hover affordance down needs the close to release it. */
export async function showEntityMenu(
  target: EntityMenuTarget,
  trigger: HTMLElement | null = null,
): Promise<void> {
  const values = trigger && target.id ? await readTarget(target, trigger) : null
  const s = useSession.getState()
  const { path, host } = target
  if (target.kind === 'page')
    return showPageMenu(target, {
      trigger,
      rename: () => s.beginRename(path, false, host),
      // A graph holds no slot for a sibling to land in.
      newPage:
        host === 'matrix'
          ? undefined
          : { rows: 'pair', create: (where) => void newPageAdjacent(path, where, host) },
      values,
    })
  const creators = creatorsFor(target)
  const shown = {
    ...target,
    alreadyOpen:
      target.kind !== 'context' &&
      target.id !== undefined &&
      isOpenInTabs(s.tabs, s.pinned, selectTargetOf({ ...target, id: target.id })),
    metadata: values ? metadataBranches(values, s.tree) : undefined,
  }
  const action = await popMenu(entityMenuItems(shown, creators))
  if (action === null || (values && runMetadataAction(action, values))) return
  runEntityAction(shown, creators, action, trigger)
}
```

The `kind !== 'context'` guard is the one that narrows reliably, since `selectTargetOf` takes `NodeKind` and an `id !== undefined` check past an optional-`never` member depends on the compiler.

A page's Edit Icon has one closure on every surface, so `showPageMenu` answers `title:icon` itself, reading the page's own icon from `pageMetadata` and anchoring at the host's `trigger`. `showEntityMenu` takes `trigger` as `HTMLElement | null`, so `chooseIcon` and `chooseColor` take it with no bridge.

`runEntityAction` loses `:86`, `case 'title:icon'` (`:102`), and `:109-112`. It keeps `title:rename` and `title:delete` for containers, `title:archive` for a Set, and `rename` and `editIcon` for Spaces and Contexts. `ownIconOf` stops serving pages, so its second arm reads `target.id ? spaceNodeOf(tree, target.id)?.icon : undefined`, as `changeColor` reads beside it, and `nodesByIdOf` leaves the imports.

`Sidebar.tsx:70-95` passes only `{ kind, id, path, title, disclosureLocked, host: 'sidebar' }`, its `:93` bridge having left with F-2. `MatrixView.tsx:63,70-81` passes `{ kind, id, path, title, host: 'matrix' }`, and F-2 ends `:69` in `null` and has `:82` read `pickOpen`.

`useViewInteractions.tsx` replaces `:395-435`:

```ts
const liveRows = useLatest(rowById)
const pageMenu = (row: ViewRow, anchor: HTMLElement, editImage?: () => void): Promise<void> =>
  ghost.suppressWrap(() =>
    showPageMenu(row, {
      trigger: anchor,
      rename: () => policy.rename(row, false),
      newPage: {
        rows: policy.newPages,
        create: (where) => void creation.createAdjacent(row, where),
      },
      editImage,
      values: {
        row,
        schema,
        rowOf: () => liveRows.current.get(row.id) ?? row,
        commit: (column, value) => void commitValue(row, column, value),
        trigger: anchor,
        styleOf,
      },
    }),
  )
```

`ViewInteractionPolicy` gains `newPages: NewPageRows`. `TableView.tsx:87` passes `'pair'`, and `CardsView.tsx:172` passes `'single'`. The return swaps `titleMenuContext, runTitleAction` for `pageMenu`, `chooseIcon`'s import leaves, `tree` leaves the destructure at `:91`, which lint would otherwise flag, and the head comment (`:1`) reads "the page menu" in place of "the title menu's page actions".

`TableView.tsx:147-159`:

```ts
const openTitleMenu = (row: ViewRow, e: React.MouseEvent): void => {
  e.preventDefault()
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  const cell = el.closest<HTMLElement>('.data-cell') ?? el
  void interactions.pageMenu(
    row,
    cell.querySelector<HTMLElement>('.cell-title > :first-child') ?? cell,
  )
}
```

The glyph lookup moves before the await. `.cell-title > :first-child` is stable through a menu, and `cell` was already held across it.

`CardsView.tsx:922-939`:

```ts
const onCardContextMenu = (e: React.MouseEvent): void => {
  e.preventDefault()
  e.stopPropagation()
  if (drag.isDragging) return
  const anchor = textRef.current ?? (e.currentTarget as HTMLElement)
  void api.pageMenu(
    row,
    anchor,
    banner === 'banner' && cover
      ? () => api.banner({ id: row.id, kind: 'page', frame: thumbRef.current ?? anchor, mode: 'edit' })
      : undefined,
  )
}
```

`CardApi` swaps `titleMenuContext` and `titleAction` for `pageMenu: (row: ViewRow, anchor: HTMLElement, editImage?: () => void) => Promise<void>`. `holdGhost` and `GhostSuppress.Provider` leave with their one reader at `CardsView.tsx:919`. `interactions.holdGhost` stays for the banner menu at `:262`, and `:261`'s comment leaves.

`GhostSuppress` leaves the kit with this, since the change leaves it one dead read, one false comment, and one private user. `useBannerMenu`'s read only ever returns the default passthrough, since its callers sit above that Provider or under none, and the sidebar's two readers already hold `SidebarGhostApi`. `sidebarGhostApi` gains `suppressWrap` (`Sidebar.tsx:163-169,342`); `:115,250` leave and `:145,262` read `void api?.suppressWrap(…)`. `GhostSuppress` leaves `UIX/Interactions/ghostCreate.ts:10-11` and `Sidebar.tsx:12,413,441`. `useBannerMenu.tsx:6,33` leave, and `:66` calls `popMenu` directly.

D-2 holds because `commitValue`, not `commitOnCard`, sits in `values`. Cards and the Table gain Preview and Reveal Location with no runner work, since `runPageAction` already answers both (`pageMenuActions.ts:26-27,48-49`).

##### Step 7 — The Route

`ValueSeat.tsx:316,322-327,333`:

```ts
const tree = useSession((s) => s.tree)
…
columnOf: (id) => resolveColumn(id, tree?.config.registry ?? NO_SCHEMA, contextIdsOf(tree)),
…
holder: (row) => holderOf(row, identityOf(tree)),
```

`useValueSeat` already subscribes to `tree` (`:77`), so this adds no render. `propertyColumn`'s import leaves `ValueSeat.tsx:6`, and `resolveColumn`, `contextIdsOf`, `identityOf`, `holderOf`, and `NO_SCHEMA` (`Core/Nexus/treePatch`) join its imports. `holderOf` narrows to `(row, { spaces }: Pick<ValueContext, 'spaces'>)` at `valueContext.ts:25`. `ValuePickRequest` becomes `Pick<MetadataTarget, 'rowOf' | 'commit' | 'trigger'> & { column: ResolvedColumn; style?: ColumnStyle }`, a type-only import, so three fields are stated once and `holder` leaves `chromeSlice.ts:20`. The comment at `ValueSeat.tsx:322` leaves, and `MenuSeat`'s comment at `:312` keeps stating the open-away rule. This step lands in the same commit as Steps 5 and 6, so `ValuePickRequest.holder` never stands unwritten for a commit. Scout 1's `openAway` owns `:342-348`, and the seat's move to `Core/Properties/Pickers/` follows this step.

##### Step 8 — The Ghost

This lands with F-2, whose `pendingChoice` joins the same test. `Core/Session/chromeSlice.ts` exports `pickOpen = (s: Pick<ChromeSlice, 'pendingPick' | 'pendingChoice'>): boolean => s.pendingPick !== null || s.pendingChoice !== null` with F-2's request. `useViewInteractions.tsx:442` and the Matrix's two reads move with F-2's row sites: `MatrixView.tsx:45` reads `useSession(pickOpen)` and `:82` reads `if (!pickOpen(useSession.getState())) setMenuId(null)`, since the Matrix's `:120` needs `menuId` to hold through a choice, and without them the label's anchor unmounts and the trigger rule closes the picker. The sidebar's read and the pin land after them.

`useViewInteractions.tsx:442`, covering Cards and Table in one place:

```ts
suppressed: () => pickOpen(useSession.getState()) || policy.ghost.suppressed(),
```

`Sidebar.tsx:328`:

```ts
suppressed: () => {
  const s = useSession.getState()
  return s.renamingPath !== null || pickOpen(s) || glanceShown()
},
```

The pin goes in `cardGestures.test.tsx`: answer a leaf, hover a second card past the dwell, and no `.ghost-card` appears until the pane closes. That file's `beforeEach` adds `pendingPick: null, pendingChoice: null`, since a slot left by an earlier test keeps `pickOpen` true.

##### Step 9 — D-7: Zero Lines

An option property with no options stays a greyed row with no way in, for Select, Multi-Select, Status, and Context alike. That's one rule on every type and both renderers, already pinned, at zero lines of code.

Add one pin: `metadataBranches` gives `{ label: 'Stage', submenu: [] }` for an empty Select.

**A Finding for the Picker Scout:** the same empty state misrenders on the click route. `pickGroups` filters only its property arm (`pickModel.ts:9-15`), so a Context with no Spaces yields one empty group, `OptionGroups`' `groups.length === 0` (`PropertyPicker.tsx:245`) misses it, and the pane opens as a zero-row frame instead of `emptyPane`. Moving the `.filter` over both arms fixes it in one line and leaves the menu unchanged. I traced this in code and didn't run it live.

##### Handoff to Scout 1

- **The Row:** `ResolvedColumn`, grouped by `ItemColumns`. `PickEntry` has no successor type.
- **The Picker's Input:** `{ contexts, properties }`. It draws `columnLabel`, `columnIcon`, and `GROUP_LABELS[key]`. Its `spaces`/`rest` filters (`PropertyPicker.tsx:140-141`) leave.
- **Group Labels:** `GROUP_LABELS` is what puts "Spaces" in the back bar on both surfaces (B-4).
- **B-5's Outcome Is Derived, Not Stored:** `entryOutcome(type, value)` in `valueClick.ts` answers `'show'`, `'slide'`, or `'click'`. It assumes E-6's `'dateTime'` merge. A panel entry is never `'show'`, because `!isShown` implies blank.
- **The Card's Gate:** "anything to add" is `cardAddColumns(…)`, non-empty in either group, replacing `addableFor`.

---

#### 6. Goes False

**Docs:**

| Where | Claim | Becomes |
| --- | --- | --- |
| `PropertiesPM.md:119` | "The first lists the nexus Contexts in registry order; the second lists the Collection's assigned properties." | "Both list in the order the item's Properties panel uses." |
| `PropertiesPM.md:117` | "A row shows once it holds a value or was added in the session" | "A row shows once its file names it or it was added in the session" |
| `InterfacePM.md:34` | Surface list | Adds a Matrix node |
| `InterfacePM.md:38,41` | Open and Create rows | `:38` adds that a banner card leads with Edit Image; `:41` reads "… in the manual order; one New Page on a card, none on a Matrix node)" |
| `ViewTypesPM.md:122` | "A two-stage **add-picker** … lists the Contexts not shown on the card, then the properties, and reveals a property on its first committed value." | "An **Add** list — from empty space in the text area or the location footing — lists the Contexts and properties not shown on the card, with rows that only show a held value last, since picking one shows it rather than sets it, and reveals a property on its first committed value." |

**Comments:**

- `CardsView.tsx:193` is rewritten, in Scout 1's commit.
- `useViewInteractions.tsx:1` ("the title menu's page actions") and `:404` change.
- `TableView.tsx:147,151` leave.
- `ValueSeat.tsx:322` leaves, since `columnOf` now reads like every other host's.
- `CardsView.tsx:261` ("The seat sits above the ghost's Provider") and `ghostCreate.ts:10` ("For native menus popped inside memoized children") leave with `GhostSuppress`.
- **Count:** adds 2 (`itemColumns`, the Matrix reason) and removes 6. `itemColumns`' doc lands in Scout 1's commit, which removes two, and the Matrix reason lands in the commit of Steps 5 to 7, which removes six, so no task adds more than it removes.

**Tests:**

| Where | What Happens |
| --- | --- |
| `propertyMenuActions.test.ts:90-99` | Pins option-first; now `stage, Tags, Count, Done` in schema order |
| `propertyMenuActions.test.ts:50-87,171,270` | Harness and `tree` param rewrite for `MetadataTarget`; the file merges |
| `propertyRows.test.ts` | All merges; `:30,53,63` assert on `metadataBranches` output |
| `cardMenu.test.ts` | Deleted; `:5-22`, `:39-44` reborn in `pageMenu.test.ts` with Preview and Reveal |
| `cellMenu.test.ts:8-28` | False (no Reveal; `some(submenu)`); moves to `pageMenu.test.ts` |
| `cellMenu.test.ts:30-43,159-162,166-170,259` | Leave with the arm and `:64-65` |
| `cellMenu.test.ts:272` | Moves its `hideable` case onto an empty Context |
| `useBannerMenu.test.tsx:8,42-53`, `:78-88`'s ghost assertion | Leave with `GhostSuppress` |
| `pageMenu.test.ts:17,37,60,79` | Signature; `:37` ("Reveal only where asked for") is false and goes |
| `entityMenu.test.ts:20-40,126-140,143-149` | Move to `pageMenu.test.ts`, the Matrix case pinned through `showEntityMenu` |
| `entityMenu.test.ts:91-92` | `spaces`/`properties` become `metadata` |
| `cardColumns.test.ts:6-12,62-81,109-121` | Replaced by `cardAddColumns` cases, including no stamps |
| `ValueSeat.test.tsx:302-309` | Stays green under `resolveColumn(id, registry, contextIds)`, since it grows the store's registry. It drives a Select through a route that can't open one, so it could be re-aimed at the reachable half (a property deleted under its open pane closes it). That's for whoever owns the seat's tests, and this plan doesn't require it |

**Stay Green Untouched:** `PropertyPanel.test.tsx:423-444` (both orders, the panel's regression guard), `visibilityModel.test.ts`, `entityMenuActions.test.ts`, `MatrixView.test.tsx:185-189` (the mock's second argument is unchanged), `cardGestures.test.tsx:173-193`, `cellGestures.test.tsx:500-519`, `Desktop/Actions/menu.test.ts:73`.

**New Tests:**

- `columns.test.ts`: page order, Space `rowOrder` over both groups, no stamps.
- `metadataMenu.test.ts`: `order.contexts` honored; empty Select grey.
- `pageMenu.test.ts`: `pageMenuItems`' three knobs.
- `pageMenuActions.test.ts` (new): each host handler runs on its action, and an absent `newPage` draws no row.
- `ValueSeat.test.tsx`: the menu seat resolves a Context and a stamp through the shared route.

**Drives:** these cases land in Scout 6's groups 16 and 17, in `Properties Drive/live-drive.mjs` and its `MATRIX.md`:

- The card and Table menus hold Preview and Reveal Location.
- Menu order equals panel order on a page and a Space.
- A card's Add lists no Created or Modified.
- Visibility still lists them.
- A right-click pick leaves a hidden property hidden.
- An empty Select reads grey.

---

#### 7. Risks and Order

**Order:** Step 1's pins land before any code. Steps 2 to 4 land in Scout 1's commit, since Step 3's `CardsView` call and Step 4's Add list replace the mapping that commit deletes. Step 8 lands with F-2. Steps 5, 6, and 7 land after F-2, so the runner's Edit Icon lands on `chooseIcon`, and as one commit, since the rows, the runner, and the hosts only typecheck as a set and `ValuePickRequest.holder` never stands unwritten for a commit. Docs land last.

**What Can Break:**

- **Stale Closures:** `pageMenu` must go through `useStableApi` on cards (`CardsView.tsx:268`) and Table (`TableView.tsx:231`), as `runTitleAction` did. It reads `schema` and `policy` at call time, so it's unchanged there.
- **Hold Timing:** `suppressWrap` now spans the action's synchronous run, where before it ended first, so `menusOpen` drops after `requestPick`. That narrows the gap in §1.4 and removes neither half of it. `createAdjacent` and `policy.rename` don't read the hold.
- **Icon Anchor on the Table:** computed before the menu, not after (§5). If a row re-mounts during the menu, the icon picker's trigger is detached, and the trigger rule closes it.
- **Panel Render Cost:** `itemColumns` runs per render, as `:164-177` did, with one fewer `resolveRowOrder`. `spaceNodeOf` is a memoized map read (`treeIndex.ts:259`, `contextResolve.ts`). *Hard Rules* are unaffected.
- **`Core/Actions` Reaching Session:** `metadataMenu.ts` imports `useSession` as `menuActions.ts` does; no cycle, since `chromeSlice.ts` imports only types from `Actions`.
- **`metadataMenu.ts` → `pageMenu.ts`:** a type-only import of `MetadataAction`. The engine graph counts `import type`, and `pageMenu.ts` is on the engine path, so the import runs this way, and the engine path never reaches the store through `metadataMenu.ts`.
- **Menu Visibly Reorders:** Option-kind properties no longer lead, which C-7 intends but anyone's muscle memory will notice.

**Line Estimate (Production):**

| Change | Net |
| --- | --- |
| `cardColumns.ts` | −30 |
| `propertyRows.ts` + `propertyMenuActions.ts` → `metadataMenu.ts` | −60 |
| `cardMenu.ts` | −24 |
| `cellMenu.ts` | −15 |
| `entityMenu.ts` | −10 |
| `entityMenuActions.ts` | −12 |
| `pageMenu.ts` | −4 |
| `pageMenuActions.ts` | +38 |
| `useViewInteractions.tsx` | −22 |
| `PropertyPanel.tsx` | −12 |
| `CardsView.tsx` | −24 |
| `TableView.tsx` | −6 |
| `Sidebar.tsx` + `MatrixView.tsx` | −9 |
| `columns.ts` + `fieldValue.ts` + `columnDisplay.ts` | +28 |
| `ValueSeat.tsx` + `chromeSlice.ts` + `valueContext.ts` | −4 |
| **Total** | **About −165, realistically −140 to −170** |

Of that, `cardColumns.ts`, `PropertyPanel.tsx`, and the `columns.ts` row (−14) are built with Scout 1's patch, and the rest lands in the right-click work: −152 by this table, about −140 once the hunks meet the formatter, as Step 4 did, within −125 to −155.

*Scout Findings* guessed −20 to −30 for the builder and −8 for M-9. The difference is the row types and the two whole files.

---

#### 8. For Nathan

**Placement (Needs Approval Under *Constraints*):**

- The list builder goes in the existing `Core/Views/Pipeline/columns.ts`, so no new file.
- `Core/Actions/propertyRows.ts` and `Core/Interface/Menus/propertyMenuActions.ts` become one `Core/Actions/metadataMenu.ts`.
- `Core/Actions/cardMenu.ts` is deleted.
- `propertyMenu.ts` stays.

**In-Flight Calls, for the Record:**

- The ghost fix covers the Table and sidebar too, not only cards.
- `showEntityMenu` takes over `alreadyOpen` and the move list from its callers.
- `pageMetaMenuItems` renames to `pageMenuItems`.
- The row model goes further than *Scout Findings* proposed, dropping `PropertyMenuRow`.
