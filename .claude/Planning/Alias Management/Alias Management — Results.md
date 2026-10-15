### Alias Management — Results

| Actionable | All-Inclusive | Comments | Documentation | Tests | Files |
|------------|---------------|----------|---------------|-------|-------|
| +502(+838/-336) | +1770(+2249/-479) | +28(+38/-10) | ±0(+0/-0) | +1240(+1373/-133) | +7(+9/-2) |

- **FILES:** +530(+876/-346)
- **TESTS:** +1240(+1373/-133)

---

##### Core/Actions/aliasRowMenu.ts

```/Core/Actions/aliasRowMenu.ts diff
@@ -0 +1 @@
+import { popMenu } from './menuActions'
+import type { ActionItem } from './menuModel'
+
+export type AliasRowAction = 'rename' | 'delete'
+
+const ALIAS_ROW_MENU: ActionItem<AliasRowAction>[] = [
+  { label: 'Rename', action: 'rename' },
+  { label: 'Delete', action: 'delete', separatorBefore: true },
+]
+
+export const popAliasRowMenu = (): Promise<AliasRowAction | null> => popMenu(ALIAS_ROW_MENU)
```

##### Core/Assets/entityIconPolicy.ts

```/Core/Assets/entityIconPolicy.ts diff
@@ -5 +5 @@ import type { Personalization } from '../Settings/personalization'
 
 export const DEFAULT_NEXUS_ICON: IconName = 'pommora'
 
+export const ALIAS_ICON: IconName = 'square-split-horizontal'
+
 export const DEFAULT_ENTITY_ICONS: Record<HeldKind, IconName> = {
   collection: 'gallery-vertical-end',
   set: 'folder-closed',
```

##### Core/Connections/aliasMemory.ts

```/Core/Connections/aliasMemory.ts diff
@@ -1 +1 @@
-export function rememberAlias(worn: string[], alias: string): string[] | null {
-  const words = alias.trim()
-  if (!words || worn[0] === words) return null
-  return [words, ...worn.filter((a) => a !== words)]
+import { z } from 'zod'
+import { index, op } from '../Files/decoders'
+import { normalizeTitle } from '../Paths/caseFold'
+import { keepsAlias } from './connections'
+
+const alias = z.string()
+
+export const aliasEdit = z.discriminatedUnion('op', [
+  op('add', { alias }),
+  op('rename', { from: alias, to: alias }),
+  op('move', { alias, toIndex: index }),
+  op('forget', { alias }),
+])
+export type AliasEdit = z.infer<typeof aliasEdit>
+
+/** One alias is one name whatever its case, and a name `keepsAlias` refuses is never one; a list breaking either rule reads tidied, and its next edit stores it so. */
+export function heldAliases(worn: readonly string[], title: string): string[] {
+  const seen = new Set<string>()
+  return worn.filter((a) => {
+    const key = normalizeTitle(a)
+    if (seen.has(key) || !keepsAlias(a, title)) return false
+    seen.add(key)
+    return true
+  })
 }
 
-export function forgetAlias(worn: string[], alias: string): string[] | null {
-  return worn.includes(alias) ? worn.filter((a) => a !== alias) : null
+/** The order is the user's: an add respells a held alias in place or puts a new one at the end, a rename keeps its place, and a move sets it among the others, the newest spelling standing. */
+export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
+  const held = heldAliases(worn, title)
+  const named = (e.op === 'rename' ? e.to : e.alias).trim()
+  const key = normalizeTitle(named)
+  const others = held.filter((a) => normalizeTitle(a) !== key)
+  if (e.op === 'forget') return others
+  if (!keepsAlias(named, title)) return held
+  switch (e.op) {
+    case 'add':
+      return others.length < held.length
+        ? held.map((a) => (normalizeTitle(a) === key ? named : a))
+        : [...held, named]
+    case 'move': {
+      const moved = held.find((a) => normalizeTitle(a) === key)
+      return moved === undefined
+        ? held
+        : [...others.slice(0, e.toIndex), moved, ...others.slice(e.toIndex)]
+    }
+    case 'rename': {
+      const from = normalizeTitle(e.from)
+      if (!held.some((a) => normalizeTitle(a) === from)) return held
+      return held.flatMap((a) =>
+        normalizeTitle(a) === from ? [named] : normalizeTitle(a) === key ? [] : [a],
+      )
+    }
+  }
 }
```

##### Core/Connections/connections.ts

```/Core/Connections/connections.ts diff
@@ -98 +98 @@ export function parseConnectionText(raw: string): ConnectionParts | null {
   return { title, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
 }
 
+/** A name a page can hold as an alias: one a link's alias slot carries — not blank, within the slot's 255 characters, without `]` or a line break — and never `target` itself. */
+export const keepsAlias = (name: string, target: string): boolean =>
+  name.trim() !== '' &&
+  name.length <= 255 &&
+  !/[\]\r\n]/.test(name) &&
+  normalizeTitle(name) !== normalizeTitle(target)
+
 export function connectionText(title: string, alias?: string, heading?: string): string {
   const target = heading ? `${title}#${heading}` : title
-  const named =
-    alias && !/[\]\r\n]/.test(alias) && normalizeTitle(alias) !== normalizeTitle(target)
-      ? alias
-      : undefined
+  const named = alias && keepsAlias(alias, target) ? alias : undefined
   return named ? `[[${target}|${named}]]` : `[[${target}]]`
 }
 
```

##### Core/Files/decoders.ts

```/Core/Files/decoders.ts diff
@@ -30 +30 @@ export const entriesOf = <T extends z.ZodType>(item: T) =>
 export const looseDecoder = <S extends z.ZodRawShape>(
   object: z.ZodObject<S>,
 ): z.ZodType<z.output<z.ZodObject<S>>> => object.loose()
+
+/** A position in a list. */
+export const index = z.number().int().nonnegative()
+
+/** One variant of an `op`-tagged union: its tag and the fields it carries. */
+export const op = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
+  z.object({ op: z.literal(literal), ...fields })
```

##### Core/Interface/Glance/GlancePane.tsx

```/Core/Interface/Glance/GlancePane.tsx diff
@@ -15 +15 @@ import { HEADING_LINE, toggleFoldAt } from '../../MarkdownPM/folding'
 import type { WarmSeam } from '../../MarkdownPM/warmSeam'
 import type { Size } from '@pommora/uix/Interactions/useResizable'
 import { useEscape } from '@pommora/uix/Interactions/dismissalStack'
+import { keepFocus } from '@pommora/uix/Interactions/shared'
 import { WebGuest, type WebGuestHandle } from '../../Web/WebGuest'
 import type { PinnedGlance } from '../../Session/glanceSlice'
 import { useConnections } from '../../Session/pageConnections'
@@ -320 +321 @@ export function GlancePane(): React.JSX.Element {
     })
     dismiss()
   }
-  // The preventDefault holds the pane's never-take-focus contract — a focusable button would else steal focus the close path can't restore.
+  // `keepFocus` holds the pane's never-take-focus contract — a focusable button would else steal focus the close path can't restore.
   const lockBtn = page && (
     <button
       type="button"
       className={cx('glance-lock', iconToggle, revealTarget)}
       aria-label={lockLabel(false, 'Preview')}
-      onMouseDown={(e) => e.preventDefault()}
+      onMouseDown={keepFocus}
       onClick={onLock}
     >
       <Icon name="lock-outline" size="control" />
@@ -339 +340 @@ export function GlancePane(): React.JSX.Element {
       className={cx('glance-lock', iconToggle, revealTarget)}
       data-reveal-held={p.locked || undefined}
       aria-label={lockLabel(p.locked, 'Preview')}
-      onMouseDown={(e) => e.preventDefault()}
+      onMouseDown={keepFocus}
       onClick={() => setPinLocked(p.pinId, !p.locked)}
     >
       <LockGlyph locked={p.locked} />
```

##### Core/MarkdownPM/api.ts

```/Core/MarkdownPM/api.ts diff
@@ -21 +21 @@ import type { Commands } from '../Actions/commands'
 import type { EditorMenuRequest } from '../Actions/editorMenu'
 import type { GripMenuAction, GripMenuContext } from '../Actions/gripMenu'
 import type { PickItem } from '../Actions/menuModel'
+import type { AliasRowAction } from '../Actions/aliasRowMenu'
+import type { AliasEdit } from '../Connections/aliasMemory'
 import type { TableMenuAction, TableMenuContext } from './Tables/tableMenu'
 import type { CitationMenuAction, CitationMenuContext } from './Citations/citationMenu'
 import type { ConnectionsApi } from './Links/connectionsApi'
@@ -166 +168 @@ export interface EditorHost {
   connections: () => ConnectionsApi | undefined
   aliases: {
     list(id: string): string[]
-    remember(id: string, alias: string): void
-    forget(id: string, alias: string): void
+    /** Resolves whether the host took the edit. */
+    edit(id: string, edit: AliasEdit): Promise<boolean>
     subscribe(cb: () => void): () => void
   }
   linkTitles: {
@@ -180 +182 @@ export interface EditorHost {
     grip(ctx: GripMenuContext): Promise<GripMenuAction | null>
     table(ctx: TableMenuContext): Promise<TableMenuAction | null>
     citation(ctx: CitationMenuContext): Promise<CitationMenuAction | null>
+    alias(): Promise<AliasRowAction | null>
     format?: (req: EditorMenuRequest) => Promise<string | null>
   }
   /** Absent on a surface that never glances (a read-only snapshot); `contains` answers whether an element sits inside an open glance. */
```

##### Core/MarkdownPM/decorations.ts

```/Core/MarkdownPM/decorations.ts diff
@@ -63 +63 @@ import {
   spanAt,
 } from './Engine/docScan'
 import { lineEndOf, lineIndexAt } from './Engine/markdownCode'
+import { paneHeld } from './Menus/caretPane'
 import { linkClass, linkLook, type ConnectionsApi } from './Links/connectionsApi'
 import type { LinkStatus } from '../Connections/connections'
 import type { PageHeadings } from '../Connections/pageIndex'
@@ -450 +451 @@ function build(view: EditorView, scope: MarkdownScope): Built {
   // One derivation per doc VERSION (docCache) — a caret move re-derives only its own lines, never an O(doc) walk.
   const scan = docScan(view.state.doc)
   const { text } = scan
-  const focused = view.hasFocus
+  const focused = view.hasFocus || view.state.field(paneHeld, false) === true
   const sel = view.state.selection.main
   const settings = host.settings()
   const { headingLinkStyle } = settings
@@ -800 +801 @@ function decorationPlugin(scope: MarkdownScope): Extension {
           u.docChanged ||
           u.selectionSet ||
           u.focusChanged ||
+          u.startState.field(paneHeld, false) !== u.state.field(paneHeld, false) ||
           u.viewportChanged ||
           u.transactions.some((tr) => tr.effects.some((e) => e.is(redrawNudge)))
         )
```

##### Core/MarkdownPM/Autocomplete/AliasList.tsx

```/Core/MarkdownPM/Autocomplete/AliasList.tsx diff
@@ -0 +1 @@
+import { useEffect, useRef, useState } from 'react'
+import { Reveal } from '@pommora/uix/Animations/Reveal'
+import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
+import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
+import { useKeepInView } from '@pommora/uix/Interactions/paneCtl'
+import {
+  emphasizeMatch,
+  FootingCreate,
+  MenuFooting,
+  MenuItem,
+  MenuScrollFrame,
+  menuDropLine,
+  RowRemove,
+} from '@pommora/uix/Menus'
+import { titleInput } from '@pommora/uix/Menus/menu-row.css'
+import { type ListRow, useListEdit } from '@pommora/uix/Menus/useListEdit'
+import { Icon } from '@pommora/uix/Symbols'
+import { useLatest } from '@pommora/uix/Utilities/stableApi'
+import type { AliasRowAction } from '../../Actions/aliasRowMenu'
+import { ALIAS_ICON } from '../../Assets/entityIconPolicy'
+import type { AliasEdit } from '../../Connections/aliasMemory'
+import { keepsAlias } from '../../Connections/connections'
+
+// KNOB — how long a click on a picker row waits for a second click that makes it a rename.
+const PICK_DELAY_MS = 300
+
+/** What an alias list edits through: the page's title, its edits, its row menu, and, for a host that lends the list its focus, every edit's end — `stay` when it ended inside the list, by Enter, Escape, a removal, or its row or the whole list being taken away. */
+export interface AliasHost {
+  title: string
+  edit: (e: AliasEdit) => Promise<boolean>
+  menu: () => Promise<AliasRowAction | null>
+  onEditEnd?: (stay: boolean) => void
+}
+
+/** A page's aliases as menu rows: × or the row menu's Delete deletes one, a double-click on its name or the row menu's Rename renames it in place, + drafts one more at the end, and a drag reorders them. A picker passes `onPick`, which a single click calls once the double-click window passes, and its keyboard highlight. */
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
+  // A pending pick belongs to the list it was clicked in: typing in the slot or moving to another changes the list and drops it.
+  const listed = aliases.join('\u0000')
+  useEffect(() => () => window.clearTimeout(pick.current), [listed, match])
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
+  // A field taken away with its row or with the whole list fires no blur, so its edit ends here.
+  const dropped = renaming !== null && !list.rows.some((r) => r.key === renaming) ? renaming : null
+  useEffect(() => {
+    if (dropped !== null) end(dropped, true)
+  }, [dropped])
+  const editOpen = useLatest(renaming !== null || list.drafting)
+  const ends = useLatest(host.onEditEnd)
+  useEffect(
+    () => () => {
+      if (editOpen.current) ends.current?.(true)
+    },
+    [],
+  )
+  const unpick = (): void => window.clearTimeout(pick.current)
+  // A field already open commits by blur, as leaving it any other way would, before the next opens.
+  const rename = (row: ListRow): void => {
+    unpick()
+    const open = document.activeElement
+    if (open instanceof HTMLElement && rows.current?.contains(open)) open.blur()
+    setRenaming(row.key)
+  }
+  const remove = (row: ListRow): void => {
+    unpick()
+    if (row.draft) list.cancel()
+    else void host.edit({ op: 'forget', alias: row.value })
+    if (editing(row)) end(row.key, true)
+  }
+  const rowMenu = async (row: ListRow, e: React.MouseEvent): Promise<void> => {
+    e.preventDefault()
+    unpick()
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
+            <FootingCreate
+              ariaLabel="Add alias"
+              disabled={list.drafting}
+              onClick={() => {
+                unpick()
+                list.begin()
+              }}
+            />
+          }
+        />
+      }
+    >
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
+        <div
+          ref={rows}
+          onKeyDownCapture={(e) => {
+            keyed.current =
+              (e.key === 'Enter' || e.key === 'Escape') && e.target instanceof HTMLInputElement
+          }}
+        >
+          {list.rows.map((row, i) => {
+            const item = (
+              <MenuItem
+                ref={i === active ? keepInView : undefined}
+                active={i === active}
+                tabIndex={-1}
+                leading={<Icon name={ALIAS_ICON} size="body" />}
+                trailing={<RowRemove ariaLabel="Delete alias" onClick={() => remove(row)} />}
+                onClick={
+                  onPick && !row.draft
+                    ? (e) => {
+                        unpick()
+                        if (e.detail === 1)
+                          pick.current = window.setTimeout(
+                            () => picked.current?.(row.value),
+                            PICK_DELAY_MS,
+                          )
+                      }
+                    : undefined
+                }
+                onContextMenu={row.draft ? undefined : (e) => void rowMenu(row, e)}
+              >
+                <RenamableLabel
+                  renames="title"
+                  className={titleInput}
+                  ariaLabel="Alias"
+                  editing={editing(row)}
+                  value={row.value}
+                  invalid={(text) => !keepsAlias(text, host.title)}
+                  onBegin={row.draft ? undefined : () => rename(row)}
+                  onCommit={(next) => {
+                    const landed = list.commit(row, next)
+                    end(row.key, byKey())
+                    return landed
+                  }}
+                  onCancel={() => {
+                    if (row.draft) list.cancel()
+                    end(row.key, byKey())
+                  }}
+                >
+                  {(shown) => emphasizeMatch(shown, 0, match)}
+                </RenamableLabel>
+              </MenuItem>
+            )
+            return (
+              <Reveal key={row.key} open enterOnMount={row.draft} fill>
+                {row.draft ? item : <LineRow id={row.value}>{item}</LineRow>}
+              </Reveal>
+            )
+          })}
+        </div>
+      </LineZone>
+    </MenuScrollFrame>
+  )
+}
```

##### Core/MarkdownPM/Autocomplete/AutocompletePane.tsx

```/Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
@@ -14 +14 @@ import {
 } from '@pommora/uix/Menus'
 import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
 import { useHeld } from '@pommora/uix/Animations/useExitPresence'
-import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
+import { overScrollHost } from '@pommora/uix/Interactions/OverScroll'
 import { removeButton } from '@pommora/uix/Interactions/hover-remove.css'
 import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
 import { side } from '@pommora/uix/Menus/menu-row.css'
@@ -25 +25 @@ import { text } from '@pommora/uix/Theme/typography.css'
 import { outlineTree, type OutlineNode } from '../Engine/outlineTree'
 import { type AcRow, type HeadingRow, listsHeadings } from './autocomplete'
 import type { AcState } from './useConnectionAutocomplete'
+import { AliasList, type AliasHost } from './AliasList'
 
 export interface AutocompletePaneProps {
   open: boolean
@@ -39 +40 @@ export interface AutocompletePaneProps {
   onAside: (row: AcRow) => void
   onBack: () => void
   geometry?: RememberedSize
+  aliasHost: AliasHost | null
 }
 
 // KNOB — the pane fits its titles between the width floor and AC_FIT_MAX until it's first resized.
@@ -71 +73 @@ export function AutocompletePane({
   onAside,
   onBack,
   geometry,
+  aliasHost,
 }: AutocompletePaneProps): React.JSX.Element {
   const resize = usePaneResize(open, AC_BOUNDS, geometry)
   const { w, h } = resize.size
-  const v = useHeld({ ac: ac ?? CLOSED, candidates, index, behind, headingRows, collapsed }, open)
+  const v = useHeld(
+    { ac: ac ?? CLOSED, candidates, index, behind, headingRows, collapsed, aliasHost },
+    open,
+  )
   const matchLen = v.ac.query.length
   const keepInView = useKeepInView(v.index)
 
@@ -88 +94 @@ export function AutocompletePane({
         <MenuItem
           key={row.kind === 'page' ? row.pageId : row.value}
           ref={active && i === v.index ? keepInView : undefined}
-          className={hoverRemoveHost}
+          className={overScrollHost}
           active={active && i === v.index}
           subLabel={
             <NavTrail
@@ -98 +104 @@ export function AutocompletePane({
               className={text.subline.standard}
             />
           }
-          leading={
-            row.kind === 'page' ? (
-              <EntityIcon kind="page" size="body" />
-            ) : (
-              <Icon name="square-split-horizontal" size="body" />
-            )
-          }
+          leading={<EntityIcon kind="page" size="body" />}
           trailing={
-            row.kind === 'alias' ? (
-              <HoverRemove
-                reveal="host"
-                className="mdpm-ac-forget"
-                label={`Forget ${row.value}`}
-                onRemove={row.forget}
-              />
-            ) : row.kind === 'page' && linksPages ? (
+            linksPages ? (
               <button
                 type="button"
                 className={cx(removeButton, revealTarget, side, 'mdpm-ac-aside')}
@@ -125 +118 @@ export function AutocompletePane({
             ) : undefined
           }
           onMouseDown={(e) => {
-            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget, .mdpm-ac-aside')) return
+            if ((e.target as HTMLElement).closest?.('.mdpm-ac-aside')) return
             onPick(row)
           }}
         >
@@ -146 +139 @@ export function AutocompletePane({
       onToggle={() => onToggleHeading(row.value)}
       active={i === v.index}
       wrap={(node) => (
-        // biome-ignore lint/a11y/noStaticElementInteractions: commits on mousedown, the way every autocomplete row does
+        // biome-ignore lint/a11y/noStaticElementInteractions: commits on mousedown as a page row does
         <div
           ref={i === v.index ? keepInView : undefined}
           onMouseDown={(e) => {
@@ -186 +179 @@ export function AutocompletePane({
     </MenuScrollFrame>
   )
 
-  const shown = headingForm ? headingSlot() : slot(v.candidates, true)
+  const shown = headingForm ? (
+    headingSlot()
+  ) : v.aliasHost ? (
+    <AliasList
+      key={v.ac.from}
+      aliases={v.candidates.map((r) => r.value)}
+      host={v.aliasHost}
+      active={v.index}
+      match={matchLen}
+      maxHeight={h}
+      onPick={(alias) => onPick({ kind: 'alias', value: alias })}
+    />
+  ) : (
+    slot(v.candidates, true)
+  )
+  const behindSlot = (rows: AcRow[]): React.JSX.Element =>
+    rows[0]?.kind === 'heading' ? (
+      <MenuScrollFrame maxHeight={h}>{rows.map((r) => headingRow(r, -1))}</MenuScrollFrame>
+    ) : (
+      slot(rows, false)
+    )
 
   return (
     <CaretPane open={open} at={v.ac} className="mdpm-ac" resize={resize}>
@@ -194 +207 @@ export function AutocompletePane({
         open={sliding}
         minWidth={w ?? AC_BOUNDS.min.w}
         maxWidth={w ?? AC_FIT_MAX}
-        root={v.behind ? slot(v.behind, false) : shown}
+        root={v.behind ? behindSlot(v.behind) : shown}
         detail={sliding ? shown : null}
       />
     </CaretPane>
```

##### Core/MarkdownPM/Autocomplete/autocomplete.ts

```/Core/MarkdownPM/Autocomplete/autocomplete.ts diff
@@ -32 +32 @@ export interface AutocompleteQuery {
 export type AcRow = { value: string } & (
   | { kind: 'page'; pageId: string; location: TrailSegment[] }
   | { kind: 'heading'; level: number }
-  | { kind: 'alias'; forget: () => void }
+  | { kind: 'alias' }
 )
 
 export type HeadingRow = Extract<AcRow, { kind: 'heading' }>
@@ -189 +189 @@ export function aliasRows(
     .list(pageId)
     .filter((a) => normalizeTitle(a).startsWith(q))
     .slice(0, AC_MAX)
-    .map(
-      (a): AcRow => ({
-        kind: 'alias',
-        value: a,
-        forget: () => aliases.forget(pageId, a),
-      }),
-    )
+    .map((a): AcRow => ({ kind: 'alias', value: a }))
 }
 
 export const closerOf = (form: ConnectionForm): string =>
```

##### Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts

```/Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts diff
@@ -24 +24 @@ import { acQuery, closeAcQuery } from './acQuery'
 import type { PageHeading } from '../../Platform/stores'
 import { type EditorHost, ownPage } from '../api'
 import { usePaneCtl } from '@pommora/uix/Interactions/paneCtl'
-import { caretGeometry, type CaretGeometry, type EditorPane } from '../Menus/caretPane'
+import {
+  caretGeometry,
+  type CaretGeometry,
+  type EditorPane,
+  holdPane,
+  inCaretPane,
+  paneHeld,
+} from '../Menus/caretPane'
+import { EDITABLE_TARGETS } from '@pommora/uix/Interactions/shared'
+import type { AliasEdit } from '../../Connections/aliasMemory'
 
 export interface AcState extends AutocompleteQuery, CaretGeometry {}
 
@@ -38 +47 @@ export function useConnectionAutocomplete(
   scope: MarkdownScope,
 ): ConnectionAutocomplete {
   const [ac, setAc] = useState<AcState | null>(null)
+  const [held, setHeld] = useState(false)
   const [field] = useState(() => acQuery(scope))
   const closePicker = (view: EditorView | null, why: 'dismiss' | 'blur'): void => {
     if (view?.state.field(field).query) view.dispatch({ effects: closeAcQuery.of(why) })
   }
   const [extension] = useState<Extension>(() => [
     field,
+    paneHeld,
     EditorView.updateListener.of((u) => {
+      const holds = u.state.field(paneHeld)
+      if (holds !== u.startState.field(paneHeld)) setHeld(holds)
       const q = u.state.field(field).query
       if (q === u.startState.field(field).query) return
       const g = q && caretGeometry(u.view, u.state.selection.main.head)
       setAc(q && g ? { ...q, ...g } : null)
     }),
     EditorView.domEventHandlers({
-      blur: (_, view) => {
-        closePicker(view, 'blur')
+      blur: (e, view) => {
+        if (inCaretPane(e.relatedTarget)) view.dispatch({ effects: holdPane.of(true) })
+        else closePicker(view, 'blur')
         return false
       },
     }),
@@ -87 +101 @@ export function useConnectionAutocomplete(
     if (!heading) setCollapsed(new Set())
   }, [heading])
 
-  // A forgotten alias bumps the epoch, which is what shrinks the list under an unchanged query.
+  // An edit to the remembered aliases bumps the epoch, which is what reshapes the list under an unchanged query.
   const [aliasEpoch, bumpAliases] = useReducer((n: number) => n + 1, 0)
   useEffect(() => host.aliases.subscribe(bumpAliases), [host])
   const allHeadingRows = useMemo(
@@ -129 +143 @@ export function useConnectionAutocomplete(
       container?.kind === 'url' ||
       (container?.kind === 'page' && conn?.resolve(container.title).status === 'resolved')
     const keepTitle = !settings.removeTitleOnLinkChange || !pointed
-    const keepsAlias =
+    const keepsWritten =
       ac.form === 'link' &&
       !!container?.alias &&
       keepsShown(container, { kind: 'page', syntax: 'wiki', title: row.value }, keepTitle)
-    const pageId = row.kind === 'page' ? row.pageId : page?.id
+    const pageId = row.kind === 'page' ? row.pageId : ac.title ? page?.id : undefined
     // Only a page the picker offered can open an alias slot — an empty pipe with nothing behind it is a slot the user has to close.
     const openAlias =
       (ac.form === 'link' || ac.form === 'heading') &&
       !opts.openHeading &&
-      !keepsAlias &&
+      !keepsWritten &&
       settings.aliasPickerOnCommit &&
       host.aliases.list(pageId ?? '').length > 0
     const opensSlot = openAlias || opts.openHeading
@@ -161 +175 @@ export function useConnectionAutocomplete(
 
   // A collapse reshapes the list, so the highlight starts over rather than landing on whatever the old index now names.
   const resetKey = heading ? `${query}\u0000${[...collapsed].join('\u0000')}` : query
-  const open = ac !== null && candidates.length > 0
+  const open = ac !== null && (candidates.length > 0 || held)
   const { index, row, ctl } = usePaneCtl(candidates, resetKey, {
     open,
     pick: commit,
@@ -187 +201 @@ export function useConnectionAutocomplete(
     },
   })
 
+  // An edit in the pane ends with the caret back in its slot when it ended there; one that ended by focus going elsewhere leaves as the editor's own blur would. Read a tick later, once focus has landed.
+  const endEdit = (stay: boolean): void =>
+    void window.setTimeout(() => {
+      const view = viewRef.current
+      const at = document.activeElement
+      if (!view?.state.field(paneHeld) || (inCaretPane(at) && at?.closest(EDITABLE_TARGETS))) return
+      view.dispatch({ effects: holdPane.of(false) })
+      if (stay || inCaretPane(at)) view.focus()
+      else if (!view.dom.contains(at)) view.contentDOM.dispatchEvent(new FocusEvent('blur'))
+    }, 0)
+
   return {
     extension,
     ctl,
@@ -203 +228 @@ export function useConnectionAutocomplete(
       onAside: (row) => commit(row, { openHeading: true }),
       onBack: () => ctl.current.aside?.(-1),
       geometry: host.paneGeometry('autocomplete'),
+      aliasHost:
+        form === 'alias' && page
+          ? {
+              title: page.title,
+              edit: (e: AliasEdit) => host.aliases.edit(page.id, e),
+              menu: host.menus.alias,
+              onEditEnd: endEdit,
+            }
+          : null,
     },
   }
 }
```

##### Core/MarkdownPM/Links/linkEdit.ts

```/Core/MarkdownPM/Links/linkEdit.ts diff
@@ -22 +22 @@ import { restedOnLink } from './linkReveal'
 import { type EditorHost, editorHost } from '../api'
 import { drawnLinkAt, inRawHtml } from '../decorations'
 import { writeLinkAt } from './pendingTitle'
+import { inCaretPane } from '../Menus/caretPane'
 import { clamp } from '@pommora/uix/Utilities/clamp'
 
 type LinkEdit =
@@ -137 +138 @@ function lineNear(state: EditorState, at: number): { line: Line; rel: number } {
   return { line, rel: pos - line.from }
 }
 
-/** Authoring is the only moment the memory is written: a body scan can't honor a real forget. */
+/** A body reaches the memory only where an alias is authored: a scan of bodies can't honor a real forget. */
 function rememberAlias(
   view: EditorView,
   api: ConnectionsApi | undefined,
@@ -148 +149 @@ function rememberAlias(
   if (!api || !alias?.trim()) return
   const target = titleTarget(api, line.text.slice(s.title[0], s.title[1]))
   // A phantom or ambiguous title names no single page, and the memory is keyed by page id.
-  if (target.kind === 'page') view.state.facet(editorHost).aliases.remember(target.page.id, alias)
+  if (target.kind === 'page')
+    void view.state.facet(editorHost).aliases.edit(target.page.id, { op: 'add', alias })
 }
 
 function collapseAt(view: EditorView, at: number): void {
@@ -206 +208 @@ export function aliasOnLeave(scope: MarkdownScope): Extension {
   }
   return [
     EditorView.domEventHandlers({
-      blur(_event, view) {
+      blur(event, view) {
+        if (inCaretPane(event.relatedTarget)) return false
         const at = view.state.selection.main.head
         const slot = slotNear(view.state, at, scope)
         if (slot) leave(view, at, slot, false)
```

##### Core/MarkdownPM/Menus/caretPane.tsx

```/Core/MarkdownPM/Menus/caretPane.tsx diff
@@ -1 +1 @@
 import type { ReactNode, RefObject } from 'react'
-import type { Extension } from '@codemirror/state'
+import { type Extension, StateEffect, StateField } from '@codemirror/state'
 import type { EditorView, KeyBinding } from '@codemirror/view'
 import { scrollContainer } from '@pommora/uix/Interactions/autoscroll'
 import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
 import type { PaneResize } from '@pommora/uix/Pickers/usePaneResize'
 import type { PaneCtl } from '@pommora/uix/Interactions/paneCtl'
+import { cx } from '@pommora/uix/Utilities/cx'
 
 export interface CaretGeometry {
   caretX: number
@@ -45 +46 @@ export function caretGeometry(view: EditorView, pos: number): CaretGeometry | nu
   }
 }
 
-// No `onDismiss`, and focus kept by contract: the editor's keymap owns arrows, Return and Escape, and no press in the pane moves the caret out of its query.
+const CARET_PANE = 'mdpm-caret-pane'
+
+/** Whether focus sits, or is moving, inside a caret pane. */
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
+// No `onDismiss`, and focus kept by contract: the editor's keymap owns arrows, Return and Escape, and only a field inside the pane takes focus, which the editor holds its place through.
 export function CaretPane({
   open,
   at,
@@ -69 +84 @@ export function CaretPane({
       bounds={at.bounds}
       origin="center"
       focus="keep"
-      contentClassName={className}
+      contentClassName={cx(CARET_PANE, className)}
       resize={resize}
     >
       {children}
```

##### Core/Nexus/mutate.ts

```/Core/Nexus/mutate.ts diff
@@ -30 +30 @@ import { setActiveView } from '../Views/viewsFile'
 import type { TrashDeps } from '../Trash/bundle'
 import { createContainerOp, createPageOp, createSpaceOp } from './create'
 import { movePageOp, moveSetOp } from './move'
-import { writePageMeta } from './pageMetadata'
+import { editPageAliases, writePageMeta } from './pageMetadata'
 import { renameOp } from './rename'
 import { renameCascade } from './cascade'
 import { setChildOrder, setCollectionOrder, setPanelContextOrder, setSpaceOrder } from './reorder'
@@ -150 +150 @@ async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateR
     case 'setPageMeta':
       return writePageMeta(root, req.path, req.patch)
 
+    case 'editAliases':
+      return editPageAliases(root, req.path, req.edit)
+
     case 'movePage':
       return movePageOp(ctx, req)
 
```

##### Core/Nexus/mutateRequest.ts

```/Core/Nexus/mutateRequest.ts diff
@@ -1 +1 @@
 import { z } from 'zod'
+import { aliasEdit } from '../Connections/aliasMemory'
+import { op } from '../Files/decoders'
 import { ok, type Result } from '../Contract/result'
 import { propertyValue } from '../Properties/propertyValue'
 import { crop, type PageMetaPatch } from './schemas'
@@ -38 +40 @@ const childOrderKey = z.literal('set_order')
 export type ChildOrderKey = z.infer<typeof childOrderKey>
 const ids = z.array(z.string())
 const mintedId = z.string().refine(isUlidShaped)
-const pageMetaPatch: z.ZodType<Omit<PageMetaPatch, 'icon'>> = z.object({
-  aliases: z.array(z.string()).nullable().optional(),
+const pageMetaPatch: z.ZodType<Omit<PageMetaPatch, 'icon' | 'aliases'>> = z.object({
   title_icon: z.boolean().nullable().optional(),
   locked: z.literal(true).nullable().optional(),
-} satisfies { [K in Exclude<keyof PageMetaPatch, 'icon'>]: z.ZodType })
-
-const op = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
-  z.object({ op: z.literal(literal), ...fields })
+} satisfies { [K in Exclude<keyof PageMetaPatch, 'icon' | 'aliases'>]: z.ZodType })
 
 // Every structural write enters through this one shape: a key it doesn't name is dropped, and a value off its type is refused before anything is written.
 export const mutateRequest = z.discriminatedUnion('op', [
@@ -84 +82 @@ export const mutateRequest = z.discriminatedUnion('op', [
   op('setActiveView', { path: z.string(), kind: containerKind, viewId: z.string() }),
   op('setProperty', { path: z.string(), propertyId: z.string(), value: propertyValue.nullable() }),
   op('setPageMeta', { path: z.string(), patch: pageMetaPatch }),
+  op('editAliases', { path: z.string(), edit: aliasEdit }),
   // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
   op('movePage', { path: z.string(), newParentPath: z.string(), order: ids.optional() }),
   op('moveSet', { path: z.string(), newParentPath: z.string(), order: ids }),
```

##### Core/Nexus/pageMetadata.ts

```/Core/Nexus/pageMetadata.ts diff
@@ -7 +7 @@ import { liveTreeOf, NOT_HELD } from './liveTree'
 import { metadataShardPath } from '../Paths/paths'
 import { METADATA_DIR_REL, SHARD_FILE_RE } from '../Paths/nexusPaths'
 import { basename, join } from '../Paths/posix'
-import { metadataShardFile, type PageMeta, type PageMetaPatch } from './schemas'
+import { type AliasEdit, applyAliasEdit } from '../Connections/aliasMemory'
+import { metadataShardFile, type PageMeta, type PageMetaPatch, pageMetaEntry } from './schemas'
 import { shardOf } from './ids'
 import { done, type MutateReply } from './mutateRequest'
 import { stabilize } from './treeStabilize'
@@ -93 +94 @@ function byShard(ids: readonly string[]): Map<string, string[]> {
 export async function updatePageMetadata(
   root: string,
   id: string,
-  patch: PageMetaPatch,
+  update: PageMetaPatch | ((had: PageMeta) => PageMetaPatch),
 ): Promise<Result<null>> {
   const shard = shardOf(id)
   if (shard === null) return NO_FILEABLE_ID
@@ -103 +104 @@ export async function updatePageMetadata(
       const pages = { ...rawPages(cur) }
       const raw = pages[id]
       const had = isPlainObject(raw) ? raw : undefined
+      const patch = typeof update === 'function' ? update(pageMetaEntry.parse(had ?? {})) : update
       const entry = patchedEntry(had, patch)
       if (stabilize(entry, had) === had) return null
       if (entry) pages[id] = entry
@@ -160 +162 @@ export async function writePageMeta(
   const id = pageAt(await liveTreeOf(root), relPath)?.id
   return id ? done(await updatePageMetadata(root, id, patch)) : NOT_HELD
 }
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

##### Core/Nexus/schemas.ts

```/Core/Nexus/schemas.ts diff
@@ -1 +1 @@
 // `z.looseObject` ⇒ FOREIGN keys survive a rewrite — outside tools and agents can add keys to a `.nexus` file or a page’s frontmatter without Pommora erasing them.
 
 import { z } from 'zod'
-import { entriesOf, numberCheck } from '../Files/decoders'
+import { eachOf, entriesOf, numberCheck } from '../Files/decoders'
 import { CROP_POINT, CROP_ZOOM } from '../Assets/cropGeometry'
 import { VIEW_BUTTONS, type ViewButton } from '../Views/viewRow'
 import { ID_KEY } from './identityMark'
@@ -24 +24 @@ export const cropsFile = z.looseObject({
 
 export const pageMetaEntry = z.object({
   icon: z.string().optional().catch(undefined),
-  aliases: z.array(z.string()).optional().catch(undefined),
+  aliases: eachOf(z.string()).optional().catch(undefined),
   title_icon: z.boolean().optional().catch(undefined),
   locked: z.literal(true).optional().catch(undefined),
 })
```

##### Core/Pages/AliasesRow.tsx

```/Core/Pages/AliasesRow.tsx diff
@@ -0 +1 @@
+import { useMemo } from 'react'
+import { ManageRow } from '@pommora/uix/Menus/ManageRow'
+import { popAliasRowMenu } from '../Actions/aliasRowMenu'
+import { ALIAS_ICON } from '../Assets/entityIconPolicy'
+import { heldAliases } from '../Connections/aliasMemory'
+import { AliasList } from '../MarkdownPM/Autocomplete/AliasList'
+import { pageMetaOf, useSession } from '../Session/store'
+import { editAliasesIn } from './editorHost'
+
+export function AliasesRow({
+  page,
+}: {
+  page: { id: string; path: string; title: string }
+}): React.JSX.Element {
+  const worn = useSession(pageMetaOf(page.id))?.aliases
+  const aliases = useMemo(() => heldAliases(worn ?? [], page.title), [worn, page.title])
+  return (
+    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid menu>
+      <AliasList
+        aliases={aliases}
+        host={{
+          title: page.title,
+          edit: editAliasesIn(page.path),
+          menu: popAliasRowMenu,
+        }}
+      />
+    </ManageRow>
+  )
+}
```

##### Core/Pages/editorHost.tsx

```/Core/Pages/editorHost.tsx diff
@@ -1 +1 @@
-import { persist, reportRefusal } from '../Interface/Notifications/notifications'
+import { persist } from '../Interface/Notifications/notifications'
 import { useMemo } from 'react'
+import { popAliasRowMenu } from '../Actions/aliasRowMenu'
 import { gripMenuItems } from '../Actions/gripMenu'
 import { pagePickTree } from '../Actions/pickTree'
 import { valueOr } from '../Contract/result'
@@ -20 +21 @@ import { PageTile } from '../Tiles/Surfaces/PageTile'
 import { WebTile } from '../Tiles/Surfaces/WebTile'
 import { windowGeometry } from '../Interface/Windows/useWindowGeometry'
 import { openWebLink } from '../Web/openWebLink'
-import { forgetAlias, rememberAlias } from '../Connections/aliasMemory'
+import { type AliasEdit, heldAliases } from '../Connections/aliasMemory'
 import { useLatest } from '@pommora/uix/Utilities/stableApi'
 
 interface EditorHostOptions {
@@ -47 +48 @@ function buildEditorHost(
   connRef: { readonly current: ConnectionsApi | undefined },
 ): EditorHost {
   const state = useSession.getState
-  const worn = (id: string): string[] => pageMetaOf(id)(state())?.aliases ?? []
-  const wear = (id: string, next: string[] | null): void => {
+  const pageOf = (id: string) => {
     const tree = state().tree
-    const path = tree && pagesByIdOf(tree).get(id)?.path
-    if (next && path)
-      void dialer()
-        .ask('mutate', { op: 'setPageMeta', path, patch: { aliases: next.length ? next : null } })
-        .then(reportRefusal)
+    return tree ? pagesByIdOf(tree).get(id) : undefined
   }
   return {
     settings: () => {
@@ -63 +59 @@ function buildEditorHost(
     },
     connections: () => connRef.current,
     aliases: {
-      list: worn,
-      remember: (id, alias) => wear(id, rememberAlias(worn(id), alias)),
-      forget: (id, alias) => wear(id, forgetAlias(worn(id), alias)),
+      list: (id) => heldAliases(pageMetaOf(id)(state())?.aliases ?? [], pageOf(id)?.title ?? ''),
+      edit: async (id, edit) => {
+        const path = pageOf(id)?.path
+        return !!path && (await editAliasesIn(path)(edit))
+      },
       subscribe: (cb) =>
         useSession.subscribe((s, prev) => {
           if (s.tree?.config.pageMetadata !== prev.tree?.config.pageMetadata) cb()
@@ -102 +100 @@ function buildEditorHost(
       grip: (ctx) => popMenu(gripMenuItems(ctx)),
       table: (ctx) => popMenu(tableMenuItems(ctx)),
       citation: (ctx) => popMenu(citationMenuModel(ctx)),
+      alias: popAliasRowMenu,
       format: inert
         ? undefined
         : (req) =>
@@ -137 +136 @@ function buildEditorHost(
       return s.tree ? pagePickTree(s.tree, personalizationOf(s).defaultIcons, (p) => p.title) : []
     },
     openLink: openWebLink,
-    pageTitle: () => {
-      const tree = state().tree
-      return (pageId && tree && pagesByIdOf(tree).get(pageId)?.title) ?? null
-    },
+    pageTitle: () => (pageId && pageOf(pageId)?.title) ?? null,
   }
 }
 
@@ -149 +145 @@ export const renameHeadingIn =
   (heading: string, to: string): void =>
     void useSession.getState().mutate({ op: 'renameHeading', path, heading, to })
 
+export const editAliasesIn =
+  (path: string) =>
+  async (edit: AliasEdit): Promise<boolean> =>
+    (await useSession.getState().mutate({ op: 'editAliases', path, edit })) !== null
+
 /** Re-identified on the store facts the editor renders from, so its effects follow a toggle made anywhere. */
 export function useEditorHost({
   pageId,
```

##### Core/Properties/PropertyPanel.tsx

```/Core/Properties/PropertyPanel.tsx diff
@@ -2 +2 @@ import { reportRefusal } from '../Interface/Notifications/notifications'
 import { useEffect, useMemo, useRef, useState } from 'react'
 import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
 import { Icon } from '@pommora/uix/Symbols'
-import { AccessoryButton, MenuItem, heading, menuDropLine } from '@pommora/uix/Menus'
+import { AccessoryButton, MenuItem, MenuSeparator, heading, menuDropLine } from '@pommora/uix/Menus'
 import { ICON } from '@pommora/uix/Menus/frames.css'
 import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
 import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
@@ -64 +64 @@ import type { LinkAction } from '../Actions/connectionMenu'
 import * as s from './property-panel.css'
 import { heldKey } from '../Files/heldKeys'
 import { normalizeTitle } from '../Paths/caseFold'
+import { AliasesRow } from '../Pages/AliasesRow'
 
 type Editing = { id: string; mode: 'picker' | 'editor' | 'popover' } | null
 type Field = PaneTarget & { def: PropertyDefinition | null }
@@ -419 +420 @@ export function PropertyPanel({
                   row={row}
                   column={column}
                   ctx={ctx}
-                  hideIcon={false}
                   style={{ look: 'standard', ...dateDefaults(dateFormat) }}
                   commit={(next) => commit(id, next)}
                   empty={<EmptyValue className={cx('cell-empty', text.caption.standard)} />}
@@ -530 +530 @@ export function PropertyPanel({
               </div>
             )
           })}
+          {subject.kind === 'page' && (
+            <>
+              <MenuSeparator />
+              <AliasesRow page={{ id: subject.id, path: subject.path, title }} />
+            </>
+          )}
         </div>
         {editing?.mode === 'popover' && editingDef && row && ctx && (
           <PropertyValueInput
```

##### Core/Properties/assignValue.ts

```/Core/Properties/assignValue.ts diff
@@ -5 +5 @@ import type { PropertyDefinition } from './properties'
 import { applyValueAtRoot, isBlankValue, type PropertyValue } from './propertyValue'
 import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
 import { resolveFieldValue } from './value'
+import { readLinkText } from '../Connections/linkValue'
+import { pageIndexOf } from '../Nexus/treeIndex'
 import { pushUndo } from '../Session/undo'
+import { useSession } from '../Session/store'
 
 export interface ValueWriter {
   schema: PropertyDefinition[]
@@ -43 +46 @@ function write(
   return pending
 }
 
+// A landed Link value newly showing an alias for a page gives that page the alias, as authoring one in a body does.
+function rememberedAlias(
+  value: PropertyValue | null,
+  prior: PropertyValue | null,
+): MutateRequest | null {
+  const target = value?.kind === 'link' ? readLinkText(value.value) : null
+  if (target?.kind !== 'page' || target.syntax !== 'wiki' || !target.alias) return null
+  const tree = useSession.getState().tree
+  const index = tree && pageIndexOf(tree)
+  const page = index?.resolve(target.title).page
+  if (!index || !page) return null
+  const shown = prior?.kind === 'link' ? readLinkText(prior.value) : null
+  if (
+    shown?.kind === 'page' &&
+    shown.alias === target.alias &&
+    index.resolve(shown.title).page === page
+  )
+    return null
+  return { op: 'editAliases', path: page.path, edit: { op: 'add', alias: target.alias } }
+}
+
 export function assignValue(
   writer: RefObject<ValueWriter | null>,
   row: ViewRow,
@@ -60 +84 @@ export function assignValue(
   let landed: boolean | null = null
   void pending.then((ok) => {
     landed = ok
+    const remember = ok && rememberedAlias(value, prior)
+    if (remember) void w.mutate(remember)
   })
   const revert = (): boolean => {
     const live = writer.current
```

##### Core/Properties/optionModel.ts

```/Core/Properties/optionModel.ts diff
@@ -1 +1 @@
 import { z } from 'zod'
+import { index, op } from '../Files/decoders'
 import { optionAppearance, type StatusGroup, type StatusOption } from './properties'
 
 function mapOption(
@@ -60 +61 @@ export function moveOption(
   })
 }
 
-const edit = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
-  z.object({ op: z.literal(literal), ...fields })
 const value = z.string()
 const groupId = z.string()
-const index = z.number().int().nonnegative()
 
 export const optionEdit = z.discriminatedUnion('op', [
-  edit('add', { groupId, title: z.string(), atIndex: index.optional() }),
-  edit('recolor', { value, color: z.string().optional() }),
-  edit('icon', { value, icon: z.string().optional() }),
-  edit('appearance', { value, appearance: optionAppearance }),
-  edit('move', { value, groupId, toIndex: index }),
-  edit('relabelGroup', { groupId, label: z.string() }),
+  op('add', { groupId, title: z.string(), atIndex: index.optional() }),
+  op('recolor', { value, color: z.string().optional() }),
+  op('icon', { value, icon: z.string().optional() }),
+  op('appearance', { value, appearance: optionAppearance }),
+  op('move', { value, groupId, toIndex: index }),
+  op('relabelGroup', { groupId, label: z.string() }),
 ])
 export type OptionEdit = z.infer<typeof optionEdit>
 
```

##### Core/Properties/propertyWrite.ts

```/Core/Properties/propertyWrite.ts diff
@@ -4 +4 @@ import { dialer } from '../Platform/dialer'
 import type { SchemaCascade, SchemaJournal } from './propertyJournal'
 
 // Every property write is the same round trip; only the channel and its arguments differ.
-export const write = async (res: Promise<Result<null>>): Promise<void> => {
+export const write = async (res: Promise<Result<null>>): Promise<boolean> =>
   reportRefusal(await res)
-}
 
 export const replay = (record: SchemaJournal) => (): void =>
   void dialer()
```

##### Core/Properties/Pickers/PropertyPicker.tsx

```/Core/Properties/Pickers/PropertyPicker.tsx diff
@@ -333 +333 @@ function EditableOptionRows({
                 leading={
                   <FootingCreate
                     ariaLabel="New Option"
+                    disabled={!!edit.draft}
                     onClick={() => edit.beginDraft(SELECT_GROUP)}
                   />
                 }
```

##### Core/Properties/Schema/PropertyFrame.tsx

```/Core/Properties/Schema/PropertyFrame.tsx diff
@@ -249 +249 @@ export function PropertyFrame({
   const remove = async (id: string): Promise<void> => {
     if (reportRefusal(await dialer().ask('schema:unassign', collectionPath, id))) backToList()
   }
-  const saveFileDirectory = (id: string, dir: string): Promise<void> =>
+  const saveFileDirectory = (id: string, dir: string): Promise<boolean> =>
     write(dialer().ask('property:setFileDirectory', id, { file_directory: dir }))
   const saveColumnStyle = async (propId: string, patch: Partial<ColumnStyle>): Promise<void> => {
     await saveView(activeView, columnStylePatch(activeView, schema, nexus, propId, patch))
   }
-  const handleDrop = (drop: PaneDrop): Promise<void> =>
+  const handleDrop = (drop: PaneDrop): Promise<boolean> =>
     write(
       drop.kind === 'reorder-assigned'
         ? dialer().ask('schema:reorder', collectionPath, drop.propId, drop.toIndex)
```

##### Core/Properties/Schema/useOptionEdit.tsx

```/Core/Properties/Schema/useOptionEdit.tsx diff
@@ -2 +2 @@ import { useEffect, useRef, useState } from 'react'
 import { useHeld } from '@pommora/uix/Animations/useExitPresence'
 import { Reveal } from '@pommora/uix/Animations/Reveal'
 import { useEntrance } from '@pommora/uix/Animations/useEntrance'
+import { useRenameKeys } from '@pommora/uix/Animations/useRenameKeys'
 import type { LaneSlot } from '@pommora/uix/Interactions/reorderModel'
 import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
 import { base } from '@pommora/uix/Fields/fields.css'
@@ -28 +29 @@ export type OptionStyleControl = {
 export type OptionDef = Pick<PropertyDefinition, 'id' | 'type' | 'status_groups'>
 
 type Editing = { row: string; value: string }
-type Draft = { groupId: string; index?: number }
+type Draft = { key: string; groupId: string; index?: number }
 
 export type OptionEditApi = {
   keyOf: (value: string) => string
@@ -36 +37 @@ export type OptionEditApi = {
   isOpen: (row: string) => boolean
   toggle: (value: string, anchor: HTMLElement | undefined) => void
   openMenu: (value: string, row: HTMLElement) => Promise<void>
-  editOption: (edit: OptionEdit) => Promise<void>
+  editOption: (edit: OptionEdit) => Promise<boolean>
   moves: (groups: readonly { id: string; options: readonly { value: string }[] }[]) => {
     laneOf: () => (value: string) => string | undefined
     commit: (value: string, slot: LaneSlot) => void
@@ -64 +65 @@ export function useOptionEdit({
   const [editing, setEditing] = useState<Editing | null>(null)
   const [draft, setDraft] = useState<Draft | null>(null)
   const anchor = useRef<HTMLElement | null>(null)
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
 
-  const editOption = (edit: OptionEdit): Promise<void> =>
+  const editOption = (edit: OptionEdit): Promise<boolean> =>
     write(dialer().ask('property:editOption', def.id, edit))
-  const keyOf = (value: string): string => {
-    const key = alias.current.get(value)?.key
-    return key !== undefined && !values.has(key) ? key : value
-  }
   const enteringKey = useEntrance(options, (o) => keyOf(o.value))
-  const entering = (value: string): boolean => enteringKey(keyOf(value))
+  const entering = (value: string): boolean =>
+    keyOf(value) !== draft?.key && enteringKey(keyOf(value))
   const isOpen = (row: string): boolean => editing !== null && keyOf(row) === keyOf(editing.row)
   const open = (value: string, el: HTMLElement | undefined): void => {
     anchor.current = el ?? null
@@ -90 +87 @@ export function useOptionEdit({
   const rename = async (title: string): Promise<void> => {
     if (!editing || title === editing.value) return
     const { row, value: from } = editing
-    alias.current.set(title, { key: keyOf(row), seen: false })
     setEditing((e) => (e && e.value === from ? { row: e.row, value: title } : e))
-    if (!(await warnOwed(dialer().ask('property:renameOption', def.id, from, title)))) {
-      alias.current.delete(title)
+    const renamed = (): Promise<boolean> =>
+      warnOwed(dialer().ask('property:renameOption', def.id, from, title))
+    if (!(await keys.land(row, title, renamed)))
       setEditing((e) => (e && e.value === title ? { row: e.row, value: from } : e))
-    }
   }
 
   const openMenu = async (value: string, row: HTMLElement): Promise<void> => {
@@ -144 +140 @@ export function useOptionEdit({
 
   const commitDraft = (title: string): void => {
     if (!draft) return
-    setDraft(null)
-    void editOption({ op: 'add', groupId: draft.groupId, title, atIndex: draft.index })
+    const add = (): Promise<boolean> =>
+      editOption({ op: 'add', groupId: draft.groupId, title, atIndex: draft.index })
+    void keys.land(draft.key, title, add).then((ok) => {
+      if (ok) setDraft((d) => (d === draft ? null : d))
+    })
   }
+  const drafted = draft && !options.some((o) => keyOf(o.value) === draft.key) ? draft : null
 
   const option = editing && options.find((o) => keyOf(o.value) === keyOf(editing.row))
   useEffect(() => {
@@ -179 +179 @@ export function useOptionEdit({
     openMenu,
     editOption,
     moves,
-    draft,
-    beginDraft: (groupId, index) => setDraft({ groupId, index }),
+    draft: drafted,
+    beginDraft: (groupId, index) => setDraft({ key: keys.mint(), groupId, index }),
     commitDraft,
     cancelDraft: () => setDraft(null),
     busy: editing !== null || draft !== null,
```

##### Core/Settings/ExcludedDirectoriesRow.tsx

```/Core/Settings/ExcludedDirectoriesRow.tsx diff
@@ -1 +1 @@
 import { reportRefusal } from '../Interface/Notifications/notifications'
 import { useState } from 'react'
 import { PathField } from '@pommora/uix/Fields/PathField'
-import { AccessoryButton, FootingCreate } from '@pommora/uix/Menus/MenuRows'
 import { Reveal } from '@pommora/uix/Animations/Reveal'
 import { useEntrance } from '@pommora/uix/Animations/useEntrance'
+import { ManageRow } from '@pommora/uix/Menus/ManageRow'
+import { FootingCreate, RowRemove } from '@pommora/uix/Menus/MenuRows'
+import { useListEdit } from '@pommora/uix/Menus/useListEdit'
+import * as s from './excluded-directories.css'
 import { useSession } from '../Session/store'
-import { ManageRow } from './ManageRow'
-import * as x from './settings-rows.css'
 import { dialer } from '../Platform/dialer'
 
-const EXCLUDED_MIN_W = 250
-const EXCLUDED_MAX_W = 500
-
 export function ExcludedDirectoriesRow({
   label,
   hint,
@@ -21 +19 @@ export function ExcludedDirectoriesRow({
 }): React.JSX.Element {
   const count = useSession((s) => s.tree?.config.excluded.length ?? 0)
   return (
-    <ManageRow
-      label={label}
-      hint={hint}
-      count={count}
-      style={{ minWidth: EXCLUDED_MIN_W, maxWidth: EXCLUDED_MAX_W }}
-    >
+    <ManageRow label={label} hint={hint} count={count}>
       <ExclusionPane />
     </ManageRow>
   )
@@ -34 +27 @@ export function ExcludedDirectoriesRow({
 
 function ExclusionPane(): React.JSX.Element {
   const stored = useSession((s) => s.tree?.config.excluded ?? [])
-  const [drafting, setDrafting] = useState(false)
   const [busy, setBusy] = useState(false)
-  const entering = useEntrance(stored, (f) => f)
 
   // One write in flight at a time — the pane reads the list back through the tree, so a second edit on the stale list would undo the first.
   const commit = async (list: string[]): Promise<boolean> => {
@@ -48 +39 @@ function ExclusionPane(): React.JSX.Element {
       setBusy(false)
     }
   }
-  // Emptying a field is accepted, not a delete — the row stays; only the × removes.
-  const rename = (folder: string, next: string): void => {
-    if (next) void commit(stored.map((f) => (f === folder ? next : f)))
-  }
-  const commitDraft = async (next: string): Promise<void> => {
-    if (next && (await commit([...stored, next]))) setDrafting(false)
-  }
   const browse = (apply: (picked: string) => void): void => {
     void dialer()
       .ask('exclusions:choose')
@@ -62 +46 @@ function ExclusionPane(): React.JSX.Element {
         if (reportRefusal(r) && r.value !== null) apply(r.value)
       })
   }
-
-  const fieldRow = (
-    value: string,
-    onCommit: (n: string) => void,
-    onRemove: () => void,
-    key: string,
-  ) => (
-    <div className={x.paneRow} key={key}>
-      <span className={x.field}>
-        <PathField
-          label="Excluded folder"
-          value={value}
-          empty="No folder"
-          onCommit={onCommit}
-          onBrowse={() => browse(onCommit)}
-        />
-      </span>
-      <AccessoryButton icon="x" size="control" ariaLabel="Remove exclusion" onClick={onRemove} />
-    </div>
-  )
+  const list = useListEdit(stored, {
+    onAdd: (folder) => commit([...stored, folder]),
+    onRename: (from, to) => commit(stored.map((f) => (f === from ? to : f))),
+  })
+  const entering = useEntrance(list.rows, (r) => r.key)
 
   return (
-    <div className={x.paneList}>
-      {stored.map((folder) => (
-        <Reveal key={folder} open enterOnMount={entering(folder)} fill>
-          {fieldRow(
-            folder,
-            (next) => rename(folder, next),
-            () => void commit(stored.filter((f) => f !== folder)),
-            folder,
-          )}
-        </Reveal>
-      ))}
-      {drafting ? (
-        <Reveal open enterOnMount fill key="draft">
-          {fieldRow(
-            '',
-            (n) => void commitDraft(n),
-            () => setDrafting(false),
-            'draft',
-          )}
-        </Reveal>
-      ) : null}
-      <FootingCreate
-        ariaLabel="Add exclusion"
-        disabled={drafting || busy}
-        onClick={() => setDrafting(true)}
-      />
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
+              <RowRemove
+                ariaLabel="Remove exclusion"
+                onClick={() =>
+                  row.draft ? list.cancel() : void commit(stored.filter((f) => f !== row.value))
+                }
+              />
+            </div>
+          </Reveal>
+        )
+      })}
+      <FootingCreate ariaLabel="Add exclusion" disabled={list.drafting} onClick={list.begin} />
     </div>
   )
 }
```

##### Core/Settings/ManageRow.tsx

```/Core/Settings/ManageRow.tsx diff
@@ -1 +0 @@
-import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
-import { Button } from '@pommora/uix/Buttons/Button'
-import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
-import { SettingsFieldRow } from './SettingsFieldRow'
-import * as x from './settings-rows.css'
-
-/** A settings row whose value is a list edited in its own pane: the count, and Manage to open it. */
-export function ManageRow({
-  label,
-  hint,
-  count,
-  style,
-  children,
-}: {
-  label: string
-  hint?: string
-  count: number
-  style?: CSSProperties
-  children: ReactNode
-}): React.JSX.Element {
-  const [open, setOpen] = useState(false)
-  const triggerRef = useRef<HTMLButtonElement>(null)
-  return (
-    <SettingsFieldRow label={label} hint={hint}>
-      <span className={x.manageCluster}>
-        <span className={x.count}>{count}</span>
-        <Button
-          ref={triggerRef}
-          type="filled"
-          label="Manage"
-          pressed={open}
-          onClick={() => setOpen((o) => !o)}
-        />
-        <PickerMenu
-          open={open}
-          onDismiss={() => setOpen(false)}
-          triggerRef={triggerRef}
-          bareSurface
-          contentClassName={x.managePane}
-          style={style}
-        >
-          {children}
-        </PickerMenu>
-      </span>
-    </SettingsFieldRow>
-  )
-}
```

##### Core/Settings/NexusRows.tsx

```/Core/Settings/NexusRows.tsx diff
@@ -12 +12 @@ import { SettingsFieldRow } from './SettingsFieldRow'
 import { useTimedLabel } from './useTimedLabel'
 import { useSession, useSetting } from '../Session/store'
 import { useExperimental } from './experimental'
-import * as x from './settings-rows.css'
+import { trailingCluster, trailingFigure } from '@pommora/uix/Menus/menu-row.css'
 import { dialer } from '../Platform/dialer'
 
 const fingerprint = (id: string): string => id.slice(0, 12)
@@ -139 +139 @@ function NexusBody({ nexusId }: { nexusId: string }): React.JSX.Element | null {
         </SettingsFieldRow>
       )}
       <SettingsFieldRow label="Nexus ID">
-        <span className={x.count}>{nexusId}</span>
+        <span className={trailingFigure}>{nexusId}</span>
       </SettingsFieldRow>
       {needsPassword ? (
         <SettingsFieldRow label="Nexus Password">
@@ -169 +169 @@ function NexusBody({ nexusId }: { nexusId: string }): React.JSX.Element | null {
       {experimental && state && (
         <>
           <SettingsFieldRow label="Server" hint={binding ? captionFor(binding) : undefined}>
-            <span className={x.manageCluster}>
+            <span className={trailingCluster}>
               <InputField
                 label="Server address"
                 edit={{ value: address, onCommit: setDraft, renames: 'row', emptyCommits: true }}
```

##### Core/Settings/PreviewRulesRow.tsx

```/Core/Settings/PreviewRulesRow.tsx diff
@@ -1 +1 @@
-import { PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
 import { personalizationOf } from '../Session/configSlice'
 import { useSession, useSetting } from '../Session/store'
 import { previewTargets } from '../Navigation/previewRules'
 import { FilterFrame, filterViewOf, standalonePatch } from '../Views/Settings/FilterFrame'
-import { ManageRow } from './ManageRow'
+import { ManageRow } from '@pommora/uix/Menus/ManageRow'
 import { settingOf } from './personalization'
 
 const live = () => settingOf(personalizationOf(useSession.getState()), 'openInPreview')
@@ -20 +19 @@ export function PreviewRulesRow({
   const setPersonalization = useSession((s) => s.setPersonalization)
   if (!tree) return null
   return (
-    <ManageRow
-      label={label}
-      hint={hint}
-      count={value.rules?.rules.length ?? 0}
-      style={{ minWidth: PANE_MIN_W }}
-    >
+    <ManageRow label={label} hint={hint} count={value.rules?.rules.length ?? 0}>
       <FilterFrame
         locations={tree.collections}
         view={filterViewOf(value)}
```

##### Core/Settings/excluded-directories.css.ts

```/Core/Settings/excluded-directories.css.ts diff
@@ -0 +1 @@
+import { style } from '@vanilla-extract/css'
+
+export const list = style({ display: 'flex', flexDirection: 'column', gap: '6px' })
+
+export const row = style({ display: 'flex', alignItems: 'center', gap: '4px' })
+
+export const field = style({ flex: '1 1 auto', minWidth: 0 })
```

##### Core/Settings/settings-rows.css.ts

```/Core/Settings/settings-rows.css.ts diff
@@ -1 +0 @@
-import { globalStyle, style } from '@vanilla-extract/css'
-import { segment as navTrailSegment } from '@pommora/uix/Elements/nav-trail.css'
-import { vars as colorVars } from '@pommora/uix/Theme/color.css'
-import { text } from '@pommora/uix/Theme/typography.css'
-
-const c = colorVars.color
-
-export const manageCluster = style({
-  display: 'inline-flex',
-  alignItems: 'center',
-  gap: '8px',
-})
-
-export const count = style([
-  text.control.standard,
-  { color: c.label.secondary, fontVariantNumeric: 'tabular-nums' },
-])
-
-export const managePane = style({ padding: 'var(--surface-inset)' })
-
-export const paneList = style({
-  display: 'flex',
-  flexDirection: 'column',
-  gap: '6px',
-})
-
-export const paneRow = style({
-  display: 'flex',
-  alignItems: 'center',
-  gap: '4px',
-})
-
-export const field = style({
-  flex: '1 1 auto',
-  minWidth: 0,
-})
-
-globalStyle(`${paneRow} ${navTrailSegment}`, { color: c.label.control })
```

##### Core/Testing/editorHarness.ts

```/Core/Testing/editorHarness.ts diff
@@ -7 +7 @@ import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
 import type { MarkdownTable } from '../MarkdownPM/Tables/MarkdownTable'
 import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
 import { DEFAULT_COMMANDS } from '../Actions/commands'
-import { forgetAlias, rememberAlias } from '../Connections/aliasMemory'
+import { type AliasEdit, applyAliasEdit, heldAliases } from '../Connections/aliasMemory'
 import { type EditorHost, type EditorSettings, editorSettingsOf } from '../MarkdownPM/api'
 import type { EditorPrefs } from '../Contract/bridge'
 import { stubDialer } from '../vitest.setup'
@@ -78 +78 @@ function harnessHost(spec: HarnessHost, rerender: () => void = () => {}): Harnes
   } as HarnessState
   const watchers = new Set<() => void>()
   const worn = (id: string): string[] => state.aliases[id] ?? []
-  const wear = (id: string, next: string[] | null): void => {
-    if (!next) return
-    state.aliases[id] = next
+  const wear = (id: string, edit: AliasEdit): void => {
+    state.aliases[id] = applyAliasEdit(worn(id), edit, spec.pageTitle ?? '')
     for (const cb of watchers) cb()
   }
   state.host = {
     settings: () => state.settings,
     connections: () => state.connections,
     aliases: {
-      list: worn,
-      remember: (id, alias) => wear(id, rememberAlias(worn(id), alias)),
-      forget: (id, alias) => wear(id, forgetAlias(worn(id), alias)),
+      list: (id) => heldAliases(worn(id), spec.pageTitle ?? ''),
+      edit: async (id, edit) => {
+        wear(id, edit)
+        return true
+      },
       subscribe: (cb) => {
         watchers.add(cb)
         return () => watchers.delete(cb)
@@ -122 +123 @@ function harnessHost(spec: HarnessHost, rerender: () => void = () => {}): Harnes
       grip: async () => null,
       table: async () => null,
       citation: async () => null,
+      alias: async () => null,
       ...spec.menus,
     },
     glance: spec.glance === false ? undefined : (spec.glance ?? NO_GLANCE),
```

##### Core/Tiles/tiles.ts

```/Core/Tiles/tiles.ts diff
@@ -3 +3 @@
 import { z } from 'zod'
 import { type Result, fault, ok } from '../Contract/result'
 import { isKeyOf, isPlainObject } from '../Contract/validators'
-import { looseDecoder } from '../Files/decoders'
+import { index, looseDecoder } from '../Files/decoders'
 import { isUlidShaped } from '../Nexus/identityMark'
 import { VIEW_BUTTONS, VIEW_STYLES } from '../Views/viewRow'
 import { mapViews, mintViewId } from '../Views/views'
@@ -64 +64 @@ const viewEntry = z.object({
   ...chassisFields,
   type: z.literal('view'),
   views: z.array(embeddedView).min(1),
-  active: z.number().int().nonnegative().optional().catch(undefined),
+  active: index.optional().catch(undefined),
   display_title: z.string().optional().catch(undefined),
   display_icon: z.string().optional().catch(undefined),
   title: boolField,
```

##### Core/Trash/record.ts

```/Core/Trash/record.ts diff
@@ -3 +3 @@ import { z } from 'zod'
 import { hiddenName, rootSegs } from '../Paths/exclusion'
 import { mintBundle } from './bundle'
 import { readJsonObject, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
+import { index } from '../Files/decoders'
 import { listEntries } from '../Files/walk'
 import { contextEntry } from '../Contexts/contexts'
 import type { StrippedLink } from '../Nexus/cascade'
@@ -63 +64 @@ const recordFile = z.discriminatedUnion('entity', [
   z.object({
     entity: z.literal('context'),
     registry: contextEntry,
-    at: z.number().int().nonnegative().optional(),
+    at: index.optional(),
     membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
     partial: z.literal(true).optional(),
   }),
```

##### Core/Views/views.ts

```/Core/Views/views.ts diff
@@ -4 +4 @@ import { z } from 'zod'
 import { isPlainObject } from '../Contract/validators'
 import { newId } from '../Nexus/ids'
 import { columnStyle, holdsStyle } from '../Properties/columnStyles'
-import { eachOf, entriesOf, idArray, looseDecoder, numberCheck } from '../Files/decoders'
+import { eachOf, entriesOf, idArray, index, looseDecoder, numberCheck } from '../Files/decoders'
 import { TENTHS_SCALE, ZOOM } from '../Settings/personalization'
 import { filterGroup } from './filterRules'
 import { mergeKeys } from '../Files/jsonMerge'
@@ -390 +390 @@ const VIEW_ID_PREFIX = 'view_'
 
 export const removedView = z.object({
   view: z.record(z.string(), z.unknown()),
-  index: z.number().int().nonnegative(),
+  index,
   active: z.boolean(),
 })
 export type RemovedView = z.infer<typeof removedView>
```

##### Core/Views/Settings/FilterFrame.tsx

```/Core/Views/Settings/FilterFrame.tsx diff
@@ -13 +13 @@ import { Icon } from '@pommora/uix/Symbols'
 import { leading } from '@pommora/uix/Fields/fields.css'
 import { colorNameFor } from '@pommora/uix/Theme/ramp'
 import {
-  AccessoryButton,
   MenuFooting,
   MenuCaption,
   MenuItem,
@@ -21 +20 @@ import {
   FootingItem,
   MenuScrollFrame,
   MenuTopRow,
+  RowRemove,
 } from '@pommora/uix/Menus'
 import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
 import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
@@ -218 +218 @@ export function FilterFrame({
   tree,
   back,
   targets: supplied,
+  maxHeight,
   onCommit,
 }: {
   locations: (CollectionNode | SetNode)[]
@@ -227 +228 @@ export function FilterFrame({
   tree: NexusTree | null
   back?: { label: string; onBack: () => void }
   targets?: PaneTarget[]
+  maxHeight?: number
   onCommit: (patch: FilterPatch) => void
 }): React.JSX.Element {
   const styleFor = useStyleFor()
   const nexusClock = useSetting('timeFormat')
-  const [drafting, setDrafting] = useState(false)
+  const [draft, setDraft] = useState<string | null>(null)
+  const minted = useRef(0)
+  const mint = (): string => String(++minted.current)
+  const ids = useRef<string[]>([])
 
   const [pendingMode, setPendingMode] = useState<MatchMode | null>(null)
 
   const decoded: DecodedFilter = decodeFilter(view.filter)
   const rules: FilterRule[] = decoded.kind === 'rows' ? decoded.rules : []
+  // A rule's row is its identity, not its place: removing one leaves the others and their fields standing, and a count changed elsewhere keeps the rows already held.
+  if (ids.current.length !== rules.length)
+    ids.current = rules.map((_, i) => ids.current[i] ?? mint())
   const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'any'
   const mode: MatchMode = rules.length === 0 ? (pendingMode ?? decodedMode) : decodedMode
 
@@ -250 +258 @@ export function FilterFrame({
 
   const setEnabled = (next: boolean): void => onCommit({ filter_enabled: next })
 
-  const entering = useEntrance(rules, (_, i) => String(i))
+  const entering = useEntrance(ids.current, (id) => id)
 
   const contextIds = contextIdsOf(tree)
   const targets = supplied ?? filterTargets(schema, tree, locations.length > 0)
@@ -274 +282 @@ export function FilterFrame({
       liveRules().map((r, i) => (i === index ? rule : r)),
     )
 
-  const removeRow = (index: number): void =>
+  const removeRow = (index: number): void => {
+    ids.current.splice(index, 1)
     save(
       mode,
       liveRules().filter((_, i) => i !== index),
     )
+  }
 
   const completeDraft = (targetId: string): void => {
-    setDrafting(false)
+    ids.current.push(draft ?? 'lead')
+    setDraft(null)
     setPendingMode(null)
     save(mode, [...liveRules(), mintRule(targetId, schema, contextIds)])
   }
@@ -404 +415 @@ export function FilterFrame({
         look={checkboxLook}
       />
     )
+    const id = ids.current[index]
     return (
-      <Reveal key={index} open enterOnMount={entering(String(index))} fill>
+      <Reveal key={id} open enterOnMount={entering(id)} fill>
         <div className={fp.ruleRow}>
           <FieldPicker
             ariaLabel="Filter property"
@@ -465 +477 @@ export function FilterFrame({
             }
           </FieldPicker>
           {valueCell(rule, index, current)}
-          <AccessoryButton
-            icon="x"
-            size="control"
-            ariaLabel="Remove filter"
-            onClick={() => removeRow(index)}
-          />
+          <RowRemove ariaLabel="Remove filter" onClick={() => removeRow(index)} />
         </div>
       </Reveal>
     )
   }
 
   const lead = rules.length === 0
-  const draftRow = (drafting || lead) && (
-    <Reveal open enterOnMount={!lead} fill>
+  const draftRow = (draft !== null || lead) && (
+    <Reveal key={draft ?? 'lead'} open enterOnMount={!lead} fill>
       <div className={fp.ruleRow}>
         <FieldPicker
           ariaLabel="Filter property"
@@ -490 +497 @@ export function FilterFrame({
         </FieldPicker>
         <span className={cx(fp.controlField, fp.blankNarrow)} />
         <span className={fp.valueField} />
-        {!lead && (
-          <AccessoryButton
-            icon="x"
-            size="control"
-            ariaLabel="Remove filter"
-            onClick={() => setDrafting(false)}
-          />
-        )}
+        {!lead && <RowRemove ariaLabel="Remove filter" onClick={() => setDraft(null)} />}
       </div>
     </Reveal>
   )
@@ -505 +505 @@ export function FilterFrame({
   return (
     <MenuScrollFrame
       className={fp.frame}
+      maxHeight={maxHeight}
       header={back && <MenuTopRow label={back.label} current="Filtering" onBack={back.onBack} />}
       footer={
         <MenuFooting
@@ -536 +537 @@ export function FilterFrame({
         </>
       ) : (
         <div className={fp.ruleList}>
-          {rules.map(ruleRow)}
-          {draftRow}
-          <FootingCreate ariaLabel="Add filter rule" onClick={() => setDrafting(true)} />
+          {[...rules.map(ruleRow), draftRow]}
+          <FootingCreate ariaLabel="Add filter rule" onClick={() => setDraft((d) => d ?? mint())} />
         </div>
       )}
     </MenuScrollFrame>
```

##### Core/Views/Settings/filter-frame.css.ts

```/Core/Views/Settings/filter-frame.css.ts diff
@@ -5 +5 @@ import { focusRing } from '@pommora/uix/Fields/fieldRing'
 import { growToContent } from '@pommora/uix/Menus/frameGrowth'
 import { rowBox } from '@pommora/uix/Menus/menu-row.css'
 import { PANE_MIN_H } from '@pommora/uix/Menus/frame-slide.css'
+import { ruleFrame } from '@pommora/uix/Menus/frames.css'
 
 const c = colorVars.color
 
@@ -14 +15 @@ const FILTER_MAX_WIDTH = '420px'
 /** KNOB — the trailing chevron's distance from its label. Tighter than the lead on purpose: the Operator cell is the row's compactness priority. */
 const TRAILING_GAP = '2px'
 
-export const frame = style({
-  ...growToContent(FILTER_MAX_WIDTH),
-  minHeight: `${PANE_MIN_H}px`,
-})
+export const frame = style([
+  ruleFrame,
+  { ...growToContent(FILTER_MAX_WIDTH), minHeight: `${PANE_MIN_H}px` },
+])
 
 export const ruleList = style({
   display: 'flex',
```

##### UIX/Animations/useRenameKeys.ts

```/UIX/Animations/useRenameKeys.ts diff
@@ -0 +1 @@
+import { useRef } from 'react'
+
+/** A value renamed in place keeps the key it had, so its row neither remounts nor arrives again; `holding` keeps a rename alive while the value is still being edited. `land` gives `to` the key of `from` for the length of `write`, keeping it once the write lands and dropping it on a refusal; a name another row already holds stays that row's, and `mint` gives a draft a key no value holds, which its value takes when it lands. */
+export function useRenameKeys(
+  values: readonly string[],
+  holding?: string,
+): {
+  keyOf: (value: string) => string
+  land: (from: string, to: string, write: () => Promise<boolean>) => Promise<boolean>
+  mint: () => string
+} {
+  const renamed = useRef(new Map<string, { key: string; seen: boolean }>())
+  const minted = useRef(0)
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
+    land: (from, to, write) => {
+      if (!present.has(to)) renamed.current.set(to, { key: keyOf(from), seen: false })
+      const landed = write()
+      void landed.then((ok) => {
+        if (!ok && !renamed.current.get(to)?.seen) renamed.current.delete(to)
+      })
+      return landed
+    },
+    mint: () => `\u0000${++minted.current}`,
+  }
+}
```

##### UIX/Fields/EditableInput.tsx

```/UIX/Fields/EditableInput.tsx diff
@@ -32 +32 @@ export function EditableInput({
   ariaLabel?: string
   /** Off for a field that merely SITS in a pane: mounting must not steal the selection. */
   autoFocus?: boolean
-  /** Dims text that won't commit, marked on the node so a keystroke never renders. */
+  /** Dims text that won't commit, marked on the node so a keystroke never renders; leaving with it restores the field and cancels, as a blank name does. */
   invalid?: (text: string) => boolean
   /** A blank commit restores the field and cancels: a name, not a value. */
   required?: boolean
@@ -95 +95 @@ export function EditableInput({
         if (settled.current) return
         settled.current = true
         const next = e.currentTarget.value.trim()
-        if (required && !next) {
+        if ((required && !next) || invalid?.(next)) {
           e.currentTarget.value = initial
           return onCancel()
         }
```

##### UIX/Fields/RenamableLabel.tsx

```/UIX/Fields/RenamableLabel.tsx diff
@@ -1 +1 @@
+import { useState } from 'react'
 import { EditableInput } from './EditableInput'
 import { resting } from './fields.css'
 
@@ -13 +14 @@ export function RenamableLabel({
   boxed,
   ariaLabel,
   emptyCommits,
+  invalid,
   onBegin,
   onCommit,
   onCancel,
@@ -29 +31 @@ export function RenamableLabel({
   ariaLabel?: string
   /** A value field rather than a name: clearing it is a commit — the caller's unset — not a cancel. */
   emptyCommits?: boolean
+  invalid?: (text: string) => boolean
   onBegin?: () => void
-  onCommit: (next: string) => void
+  /** A commit that returns its landing keeps the committed text shown until that settles. */
+  // biome-ignore lint/suspicious/noConfusingVoidType: a synchronous commit hands back nothing, and `undefined` in place of `void` breaks assignability for those handlers.
+  onCommit: (next: string) => void | Promise<unknown>
   onCancel: () => void
-  children?: React.ReactNode
+  children?: React.ReactNode | ((shown: string) => React.ReactNode)
 }): React.JSX.Element {
+  const [landing, setLanding] = useState<string | null>(null)
+  const commit = (next: string): void => {
+    const landed = onCommit(next)
+    if (!landed) return
+    setLanding(next)
+    void landed.finally(() => setLanding(null))
+  }
   if (!editing) {
-    if (!onBegin) return <>{children ?? value}</>
+    const shown = landing ?? value
+    const rest = typeof children === 'function' ? children(shown) : (children ?? shown)
+    if (!onBegin) return <>{rest}</>
     return (
       // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut; every title's menu carries Rename for the keyboard
       <span className={resting} onDoubleClick={onBegin}>
-        {children ?? value}
+        {rest}
       </span>
     )
   }
@@ -53 +67 @@ export function RenamableLabel({
       ariaLabel={ariaLabel}
       caretAtEnd={renames === 'title'}
       required={!emptyCommits}
-      onCommit={(next) => (next !== value ? onCommit(next) : onCancel())}
+      invalid={invalid}
+      onCommit={(next) => (next !== value ? commit(next) : onCancel())}
       onCancel={onCancel}
     />
   )
```

##### UIX/Fields/TokenField.tsx

```/UIX/Fields/TokenField.tsx diff
@@ -1 +1 @@
 import { type KeyboardEvent, type Ref, useRef } from 'react'
+import { keepFocus } from '../Interactions/shared'
 import { cx } from '../Utilities/cx'
 import { FieldRun, type RunEntry } from './FieldRun'
 import { type FieldChrome, InputField } from './InputField'
@@ -43 +44 @@ export function TokenField({
       className={cx(s.editable, className)}
       onMouseDown={(e) => {
         const target = e.target as Element
-        if (target.closest('button')) return e.preventDefault()
+        if (target.closest('button')) return keepFocus(e)
         if (target !== caret.current) {
           e.preventDefault()
           caret.current?.focus()
```

##### UIX/Interactions/shared.ts

```/UIX/Interactions/shared.ts diff
@@ -13 +13 @@ export const ACTIVATION = 5 // px the pointer must travel before a drag starts
 // The CSS side reads this same token as `--drop-line-inset`.
 export { DROP_LINE_INSET } from '../Theme/theme-vars.css'
 export const EDITABLE_TARGETS = 'input, textarea, [contenteditable="true"]'
+/** A press that leaves the focus where it is, so a field it sits beside neither blurs nor commits; a press inside a field still reaches it. */
+export const keepFocus = (e: { target: EventTarget | null; preventDefault: () => void }): void => {
+  if (!(e.target instanceof Element && e.target.closest(EDITABLE_TARGETS))) e.preventDefault()
+}
 
 export function suppressNextClick(): void {
   const swallow = (e: MouseEvent): void => {
```

##### UIX/Menus/ManageRow.tsx

```/UIX/Menus/ManageRow.tsx diff
@@ -0 +1 @@
+import { type ReactNode, useRef, useState } from 'react'
+import { Button } from '../Buttons/Button'
+import { PickerMenu } from '../Pickers/PickerMenu'
+import { Icon, type IconName } from '../Symbols'
+import { MenuRowView } from './MenuIndex'
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
+  menu,
+  children,
+}: {
+  label: string
+  hint?: string
+  icon?: IconName
+  count?: number
+  /** Stacked over another glass surface, as a picker opened from a menu is. */
+  solid?: boolean
+  /** A pane of menu rows on the picker's own surface, taking no focus on open, rather than an inset one. */
+  menu?: boolean
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
+                bareSurface={!menu}
+                focus={menu ? 'leave' : undefined}
+                contentClassName={menu ? s.bounds : s.pane}
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
```

##### UIX/Menus/MenuRows.tsx

```/UIX/Menus/MenuRows.tsx diff
@@ -6 +6 @@ import * as s from './menu-row.css'
 import { cx } from '../Utilities/cx'
 import { overScrollEllipsis } from '../Interactions/OverScroll'
 import { onActivateClick } from '../Interactions/activate'
+import { keepFocus } from '../Interactions/shared'
 import type { PickRun } from './pickRuns'
 
 const BAR_GLYPH = 12 // KNOB
@@ -68 +69 @@ export function MenuTopRow({
         trailing={right}
         onClick={onBack}
         // The value panes commit-on-blur, so an unguarded mousedown commits before Back lands.
-        onPointerDown={(e) => e.preventDefault()}
+        onPointerDown={keepFocus}
       >
         <span className={s.topBarLeadingLabel}>{label}</span>
       </MenuItem>
@@ -265 +266 @@ export function FootingCreate({
   )
 }
 
+/** A row's ×: it keeps the focus where it is, so a field beside it that commits on blur drops its edit instead. */
+export function RowRemove({
+  ariaLabel,
+  onClick,
+}: {
+  ariaLabel: string
+  onClick: () => void
+}): React.JSX.Element {
+  return (
+    <AccessoryButton
+      icon="x"
+      size="control"
+      ariaLabel={ariaLabel}
+      onMouseDown={keepFocus}
+      onClick={onClick}
+    />
+  )
+}
+
 export function AccessoryButton({
   icon,
   size,
@@ -275 +295 @@ export function AccessoryButton({
   disabled = false,
   pressed,
   reveal,
+  onMouseDown,
   ref,
 }: {
   icon: IconName
@@ -286 +307 @@ export function AccessoryButton({
   disabled?: boolean
   pressed?: boolean
   reveal?: boolean
+  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void
   ref?: Ref<HTMLButtonElement>
 }): React.JSX.Element {
   return (
@@ -301 +323 @@ export function AccessoryButton({
       className={cx(s.accessoryButton, className)}
       data-create={create || undefined}
       aria-label={ariaLabel}
+      onMouseDown={onMouseDown}
       onClick={(e) => {
         e.stopPropagation()
         onClick()
```

##### UIX/Menus/frames.css.ts

```/UIX/Menus/frames.css.ts diff
@@ -5 +5 @@ import { duration, easing } from '../Animations/motion'
 import {
   accessoryButton,
   flushAffordance,
+  menuCompact,
   ROW_RADIUS,
   rowBox,
   scrollFrameBody,
@@ -15 +16 @@ import { stack } from '../Theme/stack'
 import { fieldRing } from '../Fields/fieldRing'
 import { revealDim } from '../Interactions/hover-reveal.css'
 import { tintAt } from '../Theme/colors'
+import { SIZE as LABEL } from '../Labels/label-base.css'
 const c = colorVars.color
 
 // KNOBS — the ViewFrame tunables.
@@ -120 +122 @@ export const optionRow = style([
   { justifyContent: 'space-between', borderRadius: `${ROW_RADIUS}px` },
 ])
 
-/** KNOB — a pane's middle list region's scroll ceiling. */
-const MIDDLE_MAX_HEIGHT = '280px'
+/** A pane of filter-like rows — rules whose trailing side holds field, token, and operator controls — reads compact on every host. */
+export const ruleFrame = style([menuCompact])
+
+/** KNOB — a View settings pane's height ceiling; above MENU_MAX_HEIGHT so the middle region's rows sit beneath the tallest stack of controls. */
+export const VIEW_SETTINGS_MAX_HEIGHT = 440
+
+/** KNOB — a pane's middle list region shows this many rows before it scrolls; it never yields that room to the pane's controls. */
+const MIDDLE_ROWS = 8
+
+const LINE_ZONE_PAD = {
+  top: 'var(--drop-dot-overhang)',
+  bottom: 'calc(var(--drop-line-thickness) + var(--drop-dot-overhang))',
+}
 
 export const middleRegion = style({
   position: 'relative',
-  maxHeight: MIDDLE_MAX_HEIGHT,
+  flexShrink: 0,
+  maxHeight: `calc(${MIDDLE_ROWS} * (var(--middle-row-line, var(--row-line)) + 2 * var(--row-pad-y)) + ${LINE_ZONE_PAD.top} + ${LINE_ZONE_PAD.bottom})`,
   overflowY: 'auto',
   vars: { '--scroll-fade': 'var(--fade-base)' },
 })
 
+/** A middle region of option chips counts its rows by the chip's height, which is taller than the row's line. */
+export const chipRegion = style({ vars: { '--middle-row-line': LABEL.height } })
+
 globalStyle(`${scrollFrameBody} > .line-zone, ${middleRegion} > .line-zone`, {
-  paddingTop: 'var(--drop-dot-overhang)',
-  paddingBottom: 'calc(var(--drop-line-thickness) + var(--drop-dot-overhang))',
+  paddingTop: LINE_ZONE_PAD.top,
+  paddingBottom: LINE_ZONE_PAD.bottom,
 })
 
 export const optionLead = style({
```

##### UIX/Menus/index.ts

```/UIX/Menus/index.ts diff
@@ -6 +6 @@ export {
   Menu,
   AccessoryButton,
   FootingCreate,
+  RowRemove,
   FooterLockButton,
   FooterIconButton,
   MenuFooting,
```

##### UIX/Menus/manage-row.css.ts

```/UIX/Menus/manage-row.css.ts diff
@@ -0 +1 @@
+import { style } from '@vanilla-extract/css'
+
+export const bounds = style({ minWidth: '250px', maxWidth: '500px' })
+
+export const pane = style([bounds, { padding: 'var(--surface-inset)' }])
```

##### UIX/Menus/menu-row.css.ts

```/UIX/Menus/menu-row.css.ts diff
@@ -257 +257 @@ export const footingLabel = style([
 export const footingSymbol = style({ display: 'inline-flex', color: c.label.secondary })
 export const footingQuiet = style({ selectors: { '&&&': { color: c.label.tertiary } } })
 
+/** A row's accessory overhangs into the row's padding, so an eye or × row stands as tall as a plain one. */
 export const accessoryButton = style({
   width: '20px',
   color: c.label.tertiary,
-  selectors: { '&&:disabled': { opacity: STATE_OPACITY.ghost } },
+  selectors: {
+    '&&:disabled': { opacity: STATE_OPACITY.ghost },
+    [`${rowBox} &`]: {
+      marginBlock: 'max(calc(-1 * var(--row-pad-y)), calc((var(--row-line) - var(--btn-h)) / 2))',
+    },
+  },
 })
 
 export const detail = style([text.footnote.emphasized, { flex: '0 1 auto', minWidth: 0 }])
 
+export const trailingCluster = style({ display: 'inline-flex', alignItems: 'center', gap: '8px' })
+
+export const trailingFigure = style([text.control.standard, { fontVariantNumeric: 'tabular-nums' }])
+
 /* A trailing value reaches no further than the row's mark and the label keeps the rest: past it, a field gives way and clips its text inside its own chrome, as a cell value clips inside its cap. */
 globalStyle(`${titleWrap} + ${side}`, { maxWidth: 'var(--row-value-reach)' })
 globalStyle(`${titleWrap} + ${side} > :has(${field})`, { minWidth: 0 })
```

##### UIX/Menus/useListEdit.ts

```/UIX/Menus/useListEdit.ts diff
@@ -0 +1 @@
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
+      const landed = keys.land(row.draft ? row.key : row.value, next, () =>
+        row.draft ? onAdd(next) : onRename(row.value, next),
+      )
+      if (row.draft)
+        void landed.then((ok) => {
+          if (ok) setDraft((d) => (d === row.key ? null : d))
+        })
+      return landed
+    },
+  }
+}
```

##### UIX/Pickers/PickerControl.tsx

```/UIX/Pickers/PickerControl.tsx diff
@@ -1 +1 @@
 import { useRef, useState } from 'react'
 import { EditableInput } from '../Fields/EditableInput'
+import { keepFocus } from '../Interactions/shared'
 import { clamp, type SteppedRange } from '../Utilities/clamp'
 import { cx } from '../Utilities/cx'
 import { Icon } from '../Symbols'
@@ -133 +134 @@ export function PickerControl<T extends string>({
             />
             {typeable.suffix && (
               // A press on the mark would otherwise pull focus out of the field and commit the edit.
-              <span aria-hidden onMouseDown={(e) => e.preventDefault()}>
+              <span aria-hidden onMouseDown={keepFocus}>
                 {typeable.suffix}
               </span>
             )}
```

##### UIX/Pickers/PickerMenu.tsx

```/UIX/Pickers/PickerMenu.tsx diff
@@ -15 +15 @@ import { GlassSurface } from '../Glass/GlassSurface'
 import { GlassWindow } from '../Glass/GlassWindow'
 import { SHIELD_ATTR, useDismissal } from '../Interactions/dismissalStack'
 import { useFocusScope } from '../Interactions/focusScope'
+import { keepFocus } from '../Interactions/shared'
 
 /** The portal layer a floating pane occupies. Containment reads against this rather than the pane's body, so the pane's own rim and resize edges are inside it. */
 export const PICKER_PORTAL_ATTR = 'data-picker-portal'
@@ -35 +36 @@ const stopContextBubble = (e: {
   e.stopPropagation()
   e.preventDefault()
 }
-const keepFocus = (e: { preventDefault: () => void }): void => e.preventDefault()
 
 export type PickerDirection = 'down' | 'up'
 
@@ -103 +103 @@ export function PickerMenu({
   anchorHeight?: number
   bounds?: { left: number; right: number }
   bareSurface?: boolean
-  /** `trap` takes focus and holds Tab inside; `leave` takes none on open, though a field inside takes it when pressed; `keep` never takes it, so a press anywhere in the pane leaves focus with its owner. Under `keep` the trigger belongs to the pane, so pressing it never closes the pane, and the pane stays modal, Escape and outside presses closing it, but draws no shield, so an outside press that closes it also lands. */
+  /** `trap` takes focus and holds Tab inside; `leave` takes none on open, though a field inside takes it when pressed; `keep` takes none, so a press anywhere in the pane but inside a field leaves focus with its owner. Under `keep` the trigger belongs to the pane, so pressing it never closes the pane, and the pane stays modal, Escape and outside presses closing it, but draws no shield, so an outside press that closes it also lands. */
   focus?: 'trap' | 'leave' | 'keep'
   /** A glance surface passes false and lets the app's own dismissals through. */
   modal?: boolean
```

---

##### Core/Connections/aliasMemory.test.ts

```/Core/Connections/aliasMemory.test.ts diff
@@ -1 +1 @@
 import { describe, expect, it } from 'vitest'
-import { forgetAlias, rememberAlias } from './aliasMemory'
+import { type AliasEdit, aliasEdit, applyAliasEdit, heldAliases } from './aliasMemory'
 
-describe('the aliases a page has been given', () => {
-  it('remembers the trimmed words', () => {
-    expect(rememberAlias([], '  the notes  ')).toEqual(['the notes'])
+const edit = (worn: string[], e: AliasEdit, title = 'Alpha') => applyAliasEdit(worn, e, title)
+
+describe('adding an alias', () => {
+  it('adds the trimmed words', () => {
+    expect(edit([], { op: 'add', alias: '  the notes  ' })).toEqual(['the notes'])
+  })
+
+  it('a new alias joins the end', () => {
+    expect(edit(['the notes', 'a'], { op: 'add', alias: 'my draft' })).toEqual([
+      'the notes',
+      'a',
+      'my draft',
+    ])
+  })
+
+  it('a held alias keeps its place', () => {
+    expect(edit(['my draft', 'the notes', 'x'], { op: 'add', alias: 'the notes' })).toEqual([
+      'my draft',
+      'the notes',
+      'x',
+    ])
+  })
+
+  it('a held alias in another case is respelled in place', () => {
+    expect(edit(['draft', 'x'], { op: 'add', alias: 'Draft' })).toEqual(['Draft', 'x'])
+  })
+
+  it("a blank alias or the page's own title leaves the list", () => {
+    expect(edit(['a'], { op: 'add', alias: '  ' })).toEqual(['a'])
+    expect(edit(['a'], { op: 'add', alias: 'ALPHA' })).toEqual(['a'])
   })
+})
+
+describe('moving an alias', () => {
+  const list = ['a', 'b', 'c', 'd']
 
-  it('a blank alias changes nothing', () => {
-    expect(rememberAlias(['the notes'], '   ')).toBeNull()
+  it.each([
+    [0, ['c', 'a', 'b', 'd']],
+    [1, ['a', 'c', 'b', 'd']],
+    [3, ['a', 'b', 'd', 'c']],
+    [9, ['a', 'b', 'd', 'c']],
+  ])('sets it at index %i among the others', (toIndex, after) => {
+    expect(edit(list, { op: 'move', alias: 'c', toIndex })).toEqual(after)
   })
 
-  it('the most recently given comes first', () => {
-    expect(rememberAlias(['the notes'], 'my draft')).toEqual(['my draft', 'the notes'])
+  it('keeps its stored spelling, matched whatever its case', () => {
+    expect(edit(['Plan', 'x'], { op: 'move', alias: 'PLAN', toIndex: 1 })).toEqual(['x', 'Plan'])
+  })
+
+  it("an unknown alias, a blank name, or the page's own title leaves the list", () => {
+    expect(edit(list, { op: 'move', alias: 'z', toIndex: 0 })).toEqual(list)
+    expect(edit(list, { op: 'move', alias: '  ', toIndex: 0 })).toEqual(list)
+    expect(edit([...list, 'Alpha'], { op: 'move', alias: 'alpha', toIndex: 0 })).toEqual(list)
+  })
+
+  it.each([-1, 1.5])('the schema refuses toIndex %d', (toIndex) => {
+    expect(aliasEdit.safeParse({ op: 'move', alias: 'a', toIndex }).success).toBe(false)
+  })
+})
+
+describe('renaming an alias', () => {
+  it('renames in place', () => {
+    expect(edit(['a', 'b', 'c'], { op: 'rename', from: 'b', to: 'B2' })).toEqual(['a', 'B2', 'c'])
   })
 
-  it('re-giving an alias promotes it rather than storing it twice', () => {
-    expect(rememberAlias(['my draft', 'the notes'], 'the notes')).toEqual(['the notes', 'my draft'])
+  it('renaming into an existing alias keeps the renamed position', () => {
+    expect(edit(['a', 'b', 'c'], { op: 'rename', from: 'c', to: 'A' })).toEqual(['b', 'A'])
   })
 
-  it('an alias already first changes nothing', () => {
-    expect(rememberAlias(['the notes', 'my draft'], 'the notes')).toBeNull()
+  it('respells by case alone', () => {
+    expect(edit(['a', 'notes'], { op: 'rename', from: 'notes', to: 'Notes' })).toEqual([
+      'a',
+      'Notes',
+    ])
   })
 
-  it('forgets only an alias the page holds', () => {
-    expect(forgetAlias(['my draft', 'the notes'], 'the notes')).toEqual(['my draft'])
-    expect(forgetAlias(['my draft'], 'never given')).toBeNull()
+  it("an unknown alias, a blank name, or the page's own title leaves the list", () => {
+    expect(edit(['a', 'b'], { op: 'rename', from: 'z', to: 'y' })).toEqual(['a', 'b'])
+    expect(edit(['a', 'b'], { op: 'rename', from: 'a', to: '  ' })).toEqual(['a', 'b'])
+    expect(edit(['a', 'b'], { op: 'rename', from: 'a', to: 'alpha' })).toEqual(['a', 'b'])
+  })
+})
+
+describe('forgetting an alias', () => {
+  it('forgets any spelling', () => {
+    expect(edit(['my draft', 'the notes'], { op: 'forget', alias: 'THE NOTES' })).toEqual([
+      'my draft',
+    ])
+  })
+
+  it('an unknown alias leaves the list', () => {
+    expect(edit(['my draft'], { op: 'forget', alias: 'never given' })).toEqual(['my draft'])
+  })
+})
+
+describe('tidying', () => {
+  it('a page holds one spelling per name, the first standing, and none of its title', () => {
+    expect(heldAliases(['Plan', 'plan', 'Alpha', 'x'], 'alpha')).toEqual(['Plan', 'x'])
+  })
+
+  it("any edit returns one spelling per name and none of the page's title", () => {
+    expect(edit(['Plan', 'plan', 'Alpha'], { op: 'forget', alias: 'zzz' })).toEqual(['Plan'])
+  })
+
+  it('a page holds no name a link can’t carry', () => {
+    expect(heldAliases(['a]b', 'x', 'two\nlines'], 'Alpha')).toEqual(['x'])
+  })
+
+  it('a page holds no blank name', () => {
+    expect(heldAliases(['', '  ', 'x'], 'Alpha')).toEqual(['x'])
+  })
+})
+
+describe('a name a link can’t carry', () => {
+  it.each(['a]b', 'two\nlines', 'cr\rhere'])('%j is never added or renamed to', (n) => {
+    expect(edit(['x'], { op: 'add', alias: n })).toEqual(['x'])
+    expect(edit(['x'], { op: 'rename', from: 'x', to: n })).toEqual(['x'])
   })
 })
```

##### Core/Connections/connections.test.ts

```/Core/Connections/connections.test.ts diff
@@ -2 +2 @@ import { describe, it, expect } from 'vitest'
 import {
   connectionText,
   expressibleInLink,
+  keepsAlias,
   linkOccurrences,
   parseConnectionText,
 } from './connections'
@@ -94 +95 @@ describe('connectionText and expressibleInLink', () => {
     expect(expressibleInLink('A]B')).toBe(true)
   })
 })
+
+describe('keepsAlias', () => {
+  it('refuses a blank name, one past the slot’s 255 characters, and the target', () => {
+    expect(keepsAlias('', 'Alpha')).toBe(false)
+    expect(keepsAlias('  ', 'Alpha')).toBe(false)
+    expect(keepsAlias('x'.repeat(256), 'Alpha')).toBe(false)
+    expect(keepsAlias('x'.repeat(255), 'Alpha')).toBe(true)
+    expect(keepsAlias('alpha', 'Alpha')).toBe(false)
+  })
+
+  it('connectionText drops an alias it refuses', () => {
+    expect(connectionText('Alpha', '   ')).toBe('[[Alpha]]')
+    expect(connectionText('Alpha', 'x'.repeat(256))).toBe('[[Alpha]]')
+  })
+})
```

##### Core/MarkdownPM/decorations.test.tsx

```/Core/MarkdownPM/decorations.test.tsx diff
@@ -1 +1 @@
 // @vitest-environment jsdom
-import { afterEach, describe, expect, it } from 'vitest'
+import { afterEach, describe, expect, it, vi } from 'vitest'
 import { act } from 'react'
+import { buildPageIndex } from '../Connections/pageIndex'
 import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'
+import { holdPane } from './Menus/caretPane'
 
 stubEditorBridge()
 
@@ -20 +22 @@ describe('the visible drawing', () => {
     expect(arrows.map((el) => view.posAtDOM(el))).toEqual([6])
   })
 })
+
+describe('an edit in the caret pane', () => {
+  it('keeps the alias slot drawn as editing while the pane holds it, and rests it once it clears', async () => {
+    const view = await mountEditor({
+      initialBody: '[[Alpha|]]',
+      connections: {
+        ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
+        headingsOf: () => undefined,
+        location: () => [],
+        open: () => {},
+      },
+      host: { aliases: { p1: ['one'] } },
+    })
+    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
+    await act(async () => {
+      view.focus()
+      view.dispatch({ selection: { anchor: 8 } })
+    })
+    const revealed = (): string[] =>
+      [...view.dom.querySelectorAll('.md-bracket')].map((e) => e.textContent ?? '')
+    expect(revealed()).toEqual(['[[', '|]]'])
+    await act(async () =>
+      (document.querySelector('[aria-label="Add alias"]') as HTMLElement).click(),
+    )
+    expect(view.hasFocus).toBe(false)
+    expect(revealed()).toEqual(['[[', '|]]'])
+    await act(async () => {
+      view.dispatch({ effects: holdPane.of(false) })
+    })
+    expect(revealed()).toEqual([])
+  })
+})
```

##### Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx

```/Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx diff
@@ -6 +6 @@ import { connectionAt, inAliasAt } from '../Input/edits'
 import { scanDoc } from '../Engine/docScan'
 import { aliasRows, type HeadingRow } from './autocomplete'
 import { AutocompletePane } from './AutocompletePane'
-import type { EditorHost } from '../api'
+import { StateEffect } from '@codemirror/state'
+import type { EditorView } from '@codemirror/view'
+import { resting } from '@pommora/uix/Fields/fields.css'
+import { firePointer, stubRect } from '@pommora/uix/Utilities/pointerHarness'
+import { type EditorHost, heldPage } from '../api'
+import { paneHeld } from '../Menus/caretPane'
+import type { ConnectionsApi } from '../Links/connectionsApi'
+import { buildPageIndex } from '../../Connections/pageIndex'
+import {
+  cleanupEditor,
+  harnessState,
+  mountEditor,
+  stubEditorBridge,
+} from '../../Testing/editorHarness'
 
 ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
 
+// The double-click window an alias row's single click waits out before it inserts.
+const PICK_WAIT = 300
+
 let remembered: Record<string, string[]> = {}
 const aliases: EditorHost['aliases'] = {
   list: (id) => remembered[id] ?? [],
-  remember: () => {},
-  forget: (id, alias) => {
-    remembered[id] = (remembered[id] ?? []).filter((a) => a !== alias)
-  },
+  edit: async () => true,
   subscribe: () => () => {},
 }
 
@@ -25 +38 @@ beforeEach(() => {
 })
 
 describe('the picker offers what a page has been called before', () => {
-  it('offers every remembered alias on an empty query, most recent first', () => {
+  it('offers every remembered alias on an empty query, in the stored order', () => {
     expect(aliasRows(aliases, 'p1', '').map((r) => r.value)).toEqual(['the plan', 'Q3 doc'])
   })
 
@@ -41 +54 @@ describe('the picker offers what a page has been called before', () => {
   it('no page offers nothing', () => {
     expect(aliasRows(aliases, undefined, '')).toEqual([])
   })
-
-  it('a row forgets itself, and the rest survive', () => {
-    const [row] = aliasRows(aliases, 'p1', '')
-    if (row.kind === 'alias') row.forget()
-    expect(remembered.p1).toEqual(['Q3 doc'])
-  })
 })
 
-describe('the forget × is inert until it is revealed', () => {
-  let host: HTMLDivElement | null = null
-  let root: Root | null = null
+describe('the body picker’s alias list', () => {
+  const conn: ConnectionsApi = {
+    ...buildPageIndex([{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }]),
+    headingsOf: () => undefined,
+    location: () => [],
+    open: () => {},
+  }
 
   afterEach(async () => {
-    await act(async () => root?.unmount())
-    host?.remove()
-    root = null
-    host = null
+    vi.useRealTimers()
+    await cleanupEditor()
   })
 
-  const onPick = vi.fn()
-
-  const mountRow = async (forget: () => void): Promise<HTMLButtonElement> => {
-    onPick.mockReset()
-    host = document.createElement('div')
-    document.body.appendChild(host)
-    root = createRoot(host)
+  const openPicker = async (menus: Partial<EditorHost['menus']> = {}): Promise<EditorView> => {
+    stubEditorBridge()
+    const view = await mountEditor({
+      initialBody: '[[Alpha|]]',
+      connections: conn,
+      host: { aliases: { p1: ['the plan', 'Q3 doc'] }, menus },
+    })
+    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
     await act(async () => {
-      root?.render(
-        <AutocompletePane
-          open
-          ac={{
-            query: '',
-            from: 0,
-            to: 0,
-            form: 'alias',
-            closed: true,
-            caretX: 0,
-            caretTop: 0,
-            caretBottom: 16,
-            bounds: { left: 0, right: 1024 },
-          }}
-          candidates={[{ kind: 'alias', value: 'the plan', forget }]}
-          index={0}
-          onPick={onPick}
-          behind={null}
-          headingRows={[]}
-          collapsed={new Set()}
-          onToggleHeading={() => {}}
-          onAside={() => {}}
-          onBack={() => {}}
-        />,
-      )
+      view.focus()
+      view.dispatch({ selection: { anchor: 8 } })
     })
-    return document.querySelector('.mdpm-ac-forget') as HTMLButtonElement
+    return view
   }
-
-  const press = async (el: HTMLElement): Promise<void> => {
+  const rowOf = (text: string): HTMLElement =>
+    [...document.querySelectorAll<HTMLElement>('.mdpm-ac [data-reveal]')].find(
+      (r) => r.textContent === text,
+    ) as HTMLElement
+  const nameOf = (text: string): HTMLElement =>
+    rowOf(text).querySelector(`.${resting}`) as HTMLElement
+  const itemOf = (text: string): HTMLElement =>
+    rowOf(text).querySelector('[role="button"]') as HTMLElement
+  const input = (): HTMLInputElement | null =>
+    document.querySelector<HTMLInputElement>('.mdpm-ac input[aria-label="Alias"]')
+  const click = async (el: HTMLElement, detail: number): Promise<void> => {
     await act(async () => {
-      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
-      el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1 }))
+      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
     })
   }
+  const key = async (el: HTMLElement, k: string): Promise<void> => {
+    await act(async () => {
+      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
+    })
+  }
+  const settle = async (): Promise<void> => {
+    await act(async () => new Promise((r) => setTimeout(r, 0)))
+  }
 
-  it('an alias row is drawn with its own glyph rather than a page’s', async () => {
-    const btn = await mountRow(vi.fn())
-    const row = btn.closest('[class*="item"]') as HTMLElement
+  it('draws each row with the alias glyph and its × at rest, and × deletes without inserting', async () => {
+    const view = await openPicker()
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
     expect(
-      row
+      itemOf('the plan')
         .querySelector('[class*="side"] svg')
         ?.classList.contains('lucide-square-split-horizontal'),
     ).toBe(true)
+    const x = rowOf('Q3 doc').querySelector('[aria-label="Delete alias"]') as HTMLElement
+    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
+    x.dispatchEvent(down)
+    expect(down.defaultPrevented).toBe(true)
+    await act(async () => x.click())
+    expect(edit).toHaveBeenCalledWith('p1', { op: 'forget', alias: 'Q3 doc' })
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+  })
+
+  it('a single click inserts once the double-click window passes, and a double-click renames instead', async () => {
+    const view = await openPicker()
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await click(itemOf('Q3 doc'), 1)
+    await click(nameOf('Q3 doc'), 1)
+    await click(nameOf('Q3 doc'), 2)
+    await act(async () => {
+      nameOf('Q3 doc').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
+    })
+    expect(input()?.value).toBe('Q3 doc')
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    await key(input() as HTMLInputElement, 'Escape')
+    await act(async () => vi.advanceTimersByTime(0))
+    await click(itemOf('the plan'), 1)
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT - 1))
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    await act(async () => vi.advanceTimersByTime(1))
+    expect(view.state.doc.toString()).toBe('[[Alpha|the plan]]')
+  })
+
+  it('a click insert pending while a character is typed into the slot inserts nothing', async () => {
+    const view = await openPicker()
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await click(itemOf('the plan'), 1)
+    await act(async () => {
+      view.dispatch({
+        changes: { from: 8, insert: 't' },
+        selection: { anchor: 9 },
+        userEvent: 'input.type',
+      })
+    })
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
+    expect(view.state.doc.toString()).toBe('[[Alpha|t]]')
+  })
+
+  it('a click insert pending when the caret moves to another link’s slot inserts nothing there', async () => {
+    stubEditorBridge()
+    const view = await mountEditor({
+      initialBody: '[[Alpha|]] [[Alpha|]]',
+      connections: conn,
+      host: { aliases: { p1: ['the plan', 'Q3 doc'] } },
+    })
+    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
+    await act(async () => {
+      view.focus()
+      view.dispatch({ selection: { anchor: 8 } })
+    })
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await click(itemOf('the plan'), 1)
+    await act(async () => {
+      view.dispatch({ selection: { anchor: 19 } })
+    })
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
+    expect(view.state.doc.toString()).not.toContain('the plan')
   })
 
-  it('a press on a hidden × forgets nothing', async () => {
-    const forget = vi.fn()
-    const btn = await mountRow(forget)
-    btn.style.opacity = '0'
-    await press(btn)
-    expect(forget).not.toHaveBeenCalled()
+  it('in a Text value held by a page with aliases, a heading picked from [[# opens no slot', async () => {
+    stubEditorBridge()
+    const view = await mountEditor({
+      initialBody: '[[#]]',
+      connections: {
+        ...conn,
+        headingsOf: () => ({
+          keys: ['setup'],
+          texts: ['Setup'],
+          outline: [{ text: 'Setup', level: 2 }],
+        }),
+      },
+      host: { aliases: { p1: ['the plan'] } },
+    })
+    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
+    await act(async () => {
+      view.dispatch({
+        effects: StateEffect.appendConfig.of(
+          heldPage.of({ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }),
+        ),
+      })
+      view.focus()
+      view.dispatch({ selection: { anchor: 3 } })
+    })
+    expect((document.querySelector('.mdpm-ac') as HTMLElement).textContent).toContain('Setup')
+    await key(view.contentDOM, 'Enter')
+    expect(view.state.doc.toString()).toBe('[[#Setup]]')
+  })
+
+  it('+ drafts inside the open pane, keeping the pipe, and Enter adds and returns to the slot', async () => {
+    const view = await openPicker()
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
+    await act(async () =>
+      (document.querySelector('[aria-label="Add alias"]') as HTMLElement).click(),
+    )
+    const draft = input() as HTMLInputElement
+    expect(document.activeElement).toBe(draft)
+    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    draft.value = 'roadmap'
+    await key(draft, 'Enter')
+    await settle()
+    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'roadmap' })
+    expect(view.hasFocus).toBe(true)
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    expect(view.state.selection.main.head).toBe(8)
   })
 
-  it('pressing the × never accepts the row it sits in', async () => {
-    const forget = vi.fn()
-    const btn = await mountRow(forget)
-    btn.style.opacity = '1'
-    await press(btn)
-    expect(onPick).not.toHaveBeenCalled()
-    expect(forget).toHaveBeenCalled()
+  it('Escape in a rename returns to the slot', async () => {
+    const view = await openPicker()
+    await act(async () => {
+      nameOf('the plan').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
+    })
+    expect(document.activeElement).toBe(input())
+    await key(input() as HTMLInputElement, 'Escape')
+    await settle()
+    expect(view.hasFocus).toBe(true)
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    expect(view.state.selection.main.head).toBe(8)
   })
 
-  it('but pressing the row itself still accepts it', async () => {
-    const btn = await mountRow(vi.fn())
-    await press(btn.closest('[class*="item"]') as HTMLElement)
-    expect(onPick).toHaveBeenCalled()
+  it('focus leaving a pane field for elsewhere closes the picker and collapses the empty slot', async () => {
+    const view = await openPicker()
+    const elsewhere = document.createElement('button')
+    document.body.appendChild(elsewhere)
+    await act(async () =>
+      (document.querySelector('[aria-label="Add alias"]') as HTMLElement).click(),
+    )
+    expect(document.activeElement).toBe(input())
+    await act(async () => elsewhere.focus())
+    await settle()
+    expect(view.state.doc.toString()).toBe('[[Alpha]]')
+    expect(view.hasFocus).toBe(false)
+    expect(input()).toBeNull()
+    elsewhere.remove()
+  })
+
+  it('a heading committed into the alias stage leaves its heading rows behind as heading rows', async () => {
+    stubEditorBridge()
+    const view = await mountEditor({
+      initialBody: '[[Alpha#]]',
+      connections: {
+        ...conn,
+        headingsOf: () => ({
+          keys: ['setup'],
+          texts: ['Setup'],
+          outline: [{ text: 'Setup', level: 2 }],
+        }),
+      },
+      host: { aliases: { p1: ['the plan'] } },
+    })
+    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
+    await act(async () => {
+      view.focus()
+      view.dispatch({ selection: { anchor: 8 } })
+    })
+    await key(view.contentDOM, 'Enter')
+    expect(view.state.doc.toString()).toBe('[[Alpha#Setup|]]')
+    const pane = document.querySelector('.mdpm-ac') as HTMLElement
+    expect(pane.textContent).toContain('Setup')
+    expect(pane.querySelector('.lucide-file-text')).toBeNull()
+  })
+
+  it('the row menu’s Rename opens the row’s input', async () => {
+    await openPicker({ alias: async () => 'rename' })
+    await act(async () => {
+      itemOf('Q3 doc').dispatchEvent(
+        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
+      )
+    })
+    expect(input()?.value).toBe('Q3 doc')
+  })
+
+  const openOne = async (body = '[[Alpha|]]'): Promise<EditorView> => {
+    stubEditorBridge()
+    const view = await mountEditor({
+      initialBody: body,
+      connections: conn,
+      host: { aliases: { p1: ['the plan'] } },
+    })
+    vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
+    await act(async () => {
+      view.focus()
+      view.dispatch({ selection: { anchor: 8 } })
+    })
+    return view
+  }
+  const plus = (): HTMLElement => document.querySelector('[aria-label="Add alias"]') as HTMLElement
+  const xOf = (text: string): HTMLElement =>
+    rowOf(text).querySelector('[aria-label="Delete alias"]') as HTMLElement
+
+  it('with a draft open, × on the only alias keeps the pane and the draft, and Enter adds it back in the slot', async () => {
+    const view = await openOne()
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
+    await act(async () => plus().click())
+    const draft = input() as HTMLInputElement
+    draft.value = 'roadmap'
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await act(async () => xOf('the plan').click())
+    await act(async () => vi.advanceTimersByTime(1000))
+    expect(edit).toHaveBeenCalledWith('p1', { op: 'forget', alias: 'the plan' })
+    expect(document.querySelector('.mdpm-ac')).toBeTruthy()
+    expect(input()).toBe(draft)
+    expect(draft.value).toBe('roadmap')
+    await key(draft, 'Enter')
+    await act(async () => vi.advanceTimersByTime(0))
+    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'roadmap' })
+    expect(view.hasFocus).toBe(true)
+    expect(view.state.field(paneHeld)).toBe(false)
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    expect(view.state.selection.main.head).toBe(8)
+  })
+
+  it('with a rename open, an outside forget emptying the list ends the edit back in the slot', async () => {
+    const view = await openOne()
+    await act(async () => {
+      nameOf('the plan').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
+    })
+    expect(view.state.field(paneHeld)).toBe(true)
+    await act(async () => {
+      await harnessState().host.aliases.edit('p1', { op: 'forget', alias: 'the plan' })
+    })
+    await settle()
+    expect(input()).toBeNull()
+    expect(view.state.field(paneHeld)).toBe(false)
+    expect(view.hasFocus).toBe(true)
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    expect(view.state.selection.main.head).toBe(8)
+  })
+
+  it('a remount of the list under an open field releases the hold', async () => {
+    const view = await openOne()
+    await act(async () => plus().click())
+    expect(view.state.field(paneHeld)).toBe(true)
+    await act(async () => {
+      view.dispatch({ changes: { from: 0, insert: 'x ' } })
+    })
+    await settle()
+    expect(view.state.field(paneHeld)).toBe(false)
+  })
+
+  it.each([
+    ['+', () => plus().click()],
+    [
+      'the row menu',
+      () =>
+        itemOf('Q3 doc').dispatchEvent(
+          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
+        ),
+    ],
+    ['× on another row', () => xOf('Q3 doc').click()],
+  ])('a click insert pending when %s is pressed inserts nothing', async (_, press) => {
+    const view = await openPicker({ alias: async () => null })
+    vi.spyOn(harnessState().host.aliases, 'edit').mockResolvedValue(true)
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await click(itemOf('the plan'), 1)
+    await act(async () => press())
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+  })
+
+  const lineRows = (): HTMLElement[] => [
+    ...document.querySelectorAll<HTMLElement>('.mdpm-ac [data-line-row]'),
+  ]
+  const lift = async (from: number, toY: number): Promise<void> => {
+    const zone = document.querySelector('.mdpm-ac .line-zone')
+    if (zone) stubRect(zone, { top: 0, bottom: lineRows().length * 30 })
+    for (const [i, el] of lineRows().entries()) stubRect(el, { top: i * 30, bottom: i * 30 + 30 })
+    await act(async () => {
+      firePointer(lineRows()[from], 'pointerdown', { x: 10, y: from * 30 + 15 })
+    })
+    await act(async () => {
+      firePointer(window, 'pointermove', { x: 10, y: toY })
+    })
+  }
+  const drop = async (row: HTMLElement): Promise<void> => {
+    await act(async () => {
+      firePointer(window, 'pointerup')
+      row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
+    })
+  }
+
+  it('a drag sends the move, leaving the body unchanged, the editor focused, and nothing inserted', async () => {
+    const view = await openPicker()
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await lift(1, 5)
+    await drop(itemOf('Q3 doc'))
+    expect(edit).toHaveBeenCalledExactlyOnceWith('p1', { op: 'move', alias: 'Q3 doc', toIndex: 0 })
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
+    expect(view.state.doc.toString()).toBe('[[Alpha|]]')
+    expect(view.hasFocus).toBe(true)
+  })
+
+  it('a press under the activation distance still inserts', async () => {
+    const view = await openPicker()
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
+    await lift(0, 17)
+    await drop(itemOf('the plan'))
+    await act(async () => vi.advanceTimersByTime(PICK_WAIT))
+    expect(view.state.doc.toString()).toBe('[[Alpha|the plan]]')
+  })
+
+  it('with a typed query, a press lifts nothing', async () => {
+    const view = await openPicker()
+    await act(async () => {
+      view.dispatch({ changes: { from: 8, insert: 'Q' }, selection: { anchor: 9 } })
+    })
+    await lift(0, 100)
+    expect(document.querySelector('.mdpm-ac .drop-line')).toBeNull()
+    expect(lineRows()[0].hasAttribute('data-drag-source')).toBe(false)
+    await act(async () => firePointer(window, 'pointerup'))
+  })
+
+  it('with a rename open, a press lifts nothing', async () => {
+    await openPicker()
+    await act(async () => {
+      nameOf('the plan').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
+    })
+    await lift(1, 5)
+    expect(document.querySelector('.mdpm-ac .drop-line')).toBeNull()
+    expect(lineRows()[1].hasAttribute('data-drag-source')).toBe(false)
+    await act(async () => firePointer(window, 'pointerup'))
   })
 })
 
@@ -181 +490 @@ describe('the heading slide’s top row marks how it arrived', () => {
           onToggleHeading={() => {}}
           onAside={() => {}}
           onBack={() => {}}
+          aliasHost={null}
         />,
       )
     })
```

##### Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx

```/Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx diff
@@ -87 +87 @@ describe('the alias picker', () => {
     return view
   }
 
-  const rows = (): number => document.querySelectorAll('.mdpm-ac .mdpm-ac-forget').length
+  const rows = (): number =>
+    document.querySelectorAll('.mdpm-ac [aria-label="Delete alias"]').length
 
   it('drops a row the host stops remembering, under the same query', async () => {
     await openPicker()
     expect(rows()).toBe(2)
-    await act(async () => harnessState().host.aliases.forget('p1', 'two'))
+    await act(async () => harnessState().host.aliases.edit('p1', { op: 'forget', alias: 'two' }))
     expect(rows()).toBe(1)
   })
 
   it('remembers the alias a pick writes', async () => {
     const view = await openPicker()
-    const remember = vi.spyOn(harnessState().host.aliases, 'remember')
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
     await act(async () => {
       view.contentDOM.dispatchEvent(
         new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
@@ -106 +107 @@ describe('the alias picker', () => {
       await new Promise((r) => setTimeout(r, 0))
     })
     expect(view.state.doc.toString()).toBe('[[Alpha|one]]')
-    expect(remember).toHaveBeenCalledTimes(1)
-    expect(remember).toHaveBeenCalledWith('p1', 'one')
+    expect(edit).toHaveBeenCalledTimes(1)
+    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'one' })
   })
 })
 
```

##### Core/MarkdownPM/Links/linkEdit.test.tsx

````/Core/MarkdownPM/Links/linkEdit.test.tsx diff
@@ -164 +164 @@ describe('the alias memory hears only what was authored', () => {
       initialBody: 'a [[Alpha|one]] [[Alpha|two]] b',
       connections: conn,
     })
-    const remember = vi.spyOn(harnessState().host.aliases, 'remember')
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
     await act(async () => view.focus())
     await caretTo(view, 12)
     await caretTo(view, 26)
     await caretTo(view, 0)
     await caretTo(view, 12)
     view.contentDOM.dispatchEvent(new FocusEvent('blur'))
-    expect(remember).not.toHaveBeenCalled()
+    expect(edit).not.toHaveBeenCalled()
   })
 
   it('typing an alias and leaving remembers it once', async () => {
     const view = await mountEditor({ initialBody: 'a [[Alpha|]] b', connections: conn })
-    const remember = vi.spyOn(harnessState().host.aliases, 'remember')
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
     await act(async () => view.focus())
     await caretTo(view, 10)
     await act(async () => {
@@ -189 +189 @@ describe('the alias memory hears only what was authored', () => {
     await caretTo(view, 0)
     await caretTo(view, 12)
     await caretTo(view, 0)
-    expect(remember).toHaveBeenCalledTimes(1)
-    expect(remember).toHaveBeenCalledWith('p1', 'new')
+    expect(edit).toHaveBeenCalledTimes(1)
+    expect(edit).toHaveBeenCalledWith('p1', { op: 'add', alias: 'new' })
+  })
+
+  it('focus moving into the caret pane neither collapses nor remembers', async () => {
+    for (const [initialBody, typed] of [
+      ['a [[Alpha|]] b', ''],
+      ['a [[Alpha|]] b', 'on'],
+    ] as const) {
+      const view = await mountEditor({
+        initialBody,
+        connections: conn,
+        host: { aliases: { p1: ['one'] } },
+      })
+      vi.spyOn(view, 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
+      const edit = vi.spyOn(harnessState().host.aliases, 'edit')
+      await act(async () => view.focus())
+      await caretTo(view, 10)
+      if (typed)
+        await act(async () => {
+          view.dispatch({
+            changes: { from: 10, insert: typed },
+            selection: { anchor: 10 + typed.length },
+            userEvent: 'input.type',
+          })
+        })
+      const pane = document.querySelector('.mdpm-ac') as HTMLElement
+      await act(async () => {
+        view.contentDOM.dispatchEvent(new FocusEvent('blur', { relatedTarget: pane }))
+      })
+      expect(view.state.doc.toString()).toBe(`a [[Alpha|${typed}]] b`)
+      expect(edit).not.toHaveBeenCalled()
+      await cleanupEditor()
+    }
   })
 })
 
@@ -222 +254 @@ describe('an alias left in code stays as written', () => {
 
   it('remembers no alias typed there', async () => {
     const view = await mountEditor({ initialBody: '```\na [[Alpha|]] b\n```', connections: conn })
-    const remember = vi.spyOn(harnessState().host.aliases, 'remember')
+    const edit = vi.spyOn(harnessState().host.aliases, 'edit')
     await act(async () => view.focus())
     await caretTo(view, 14)
     await act(async () => {
@@ -233 +265 @@ describe('an alias left in code stays as written', () => {
       })
     })
     await caretTo(view, 0)
-    expect(remember).not.toHaveBeenCalled()
+    expect(edit).not.toHaveBeenCalled()
   })
 })
 
````

##### Core/Nexus/mutate.test.ts

```/Core/Nexus/mutate.test.ts diff
@@ -64 +64 @@ import { lockContention } from '../Testing/machines'
 import { listBundles } from '../Trash/holdings'
 import { fault, ok } from '../Contract/result'
 import { nexusHandlers } from './handlers'
+import { updatePageMetadata } from './pageMetadata'
 
 let root: string
 const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: (p) => rm(p, { force: true }) }
@@ -811 +812 @@ describe('handleMutate — targets the tree doesn’t hold', () => {
     { op: 'setDisclosureLock', path: '.nexus/assets', kind: 'collection', locked: true },
     { op: 'setActiveView', path: 'Notes', kind: 'set', viewId: 'v' },
     { op: 'setPageMeta', path: '.trash/Alpha.md', patch: {} },
+    { op: 'editAliases', path: '.trash/Alpha.md', edit: { op: 'forget', alias: 'a' } },
     { op: 'setProperty', path: '', propertyId: 'p', value: null },
     { op: 'createPage', id: newContentId('page'), parentPath: '.nexus', name: 'X' },
     { op: 'createContainer', id: newId(), parentPath: '', kind: 'set', name: 'X' },
@@ -2903 +2905 @@ describe('handleMutate — setPageMeta', () => {
   })
 })
 
+describe('handleMutate — editAliases', () => {
+  const month = async (): Promise<unknown> => readJson(`.nexus/metadata/${shardOf(A_ID)}.json`)
+  const path = 'Notes/Daily/Alpha.md'
+
+  beforeEach(async () => {
+    await updatePageMetadata(root, A_ID, { aliases: ['A', 'B', 'C'] })
+  })
+
+  it('two forgets issued together both land', async () => {
+    const [first, second] = await Promise.all([
+      handleMutate(
+        root,
+        { op: 'editAliases', path, edit: { op: 'forget', alias: 'A' } },
+        nexusDeps,
+      ),
+      handleMutate(
+        root,
+        { op: 'editAliases', path, edit: { op: 'forget', alias: 'B' } },
+        nexusDeps,
+      ),
+    ])
+    await settleNow({ push: () => {}, watch: async () => {} }, root)
+    expect(first.ok && second.ok).toBe(true)
+    expect(await month()).toEqual({ pages: { [A_ID]: { aliases: ['C'] } } })
+  })
+
+  it('an add lands at the end, and a rename in place', async () => {
+    await settledMutate(
+      root,
+      { op: 'editAliases', path, edit: { op: 'add', alias: 'D' } },
+      nexusDeps,
+    )
+    await settledMutate(
+      root,
+      { op: 'editAliases', path, edit: { op: 'rename', from: 'B', to: 'B2' } },
+      nexusDeps,
+    )
+    expect(await month()).toEqual({ pages: { [A_ID]: { aliases: ['A', 'B2', 'C', 'D'] } } })
+  })
+
+  it('adding the page’s own title leaves the month’s bytes as they were', async () => {
+    const before = await read(`.nexus/metadata/${shardOf(A_ID)}.json`)
+    const r = await settledMutate(
+      root,
+      { op: 'editAliases', path, edit: { op: 'add', alias: 'alpha' } },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await read(`.nexus/metadata/${shardOf(A_ID)}.json`)).toBe(before)
+  })
+
+  it('forgetting the last alias leaves no entry for the page', async () => {
+    await updatePageMetadata(root, A_ID, { aliases: ['A'] })
+    await settledMutate(
+      root,
+      { op: 'editAliases', path, edit: { op: 'forget', alias: 'A' } },
+      nexusDeps,
+    )
+    expect(await month()).toEqual({ pages: {} })
+  })
+
+  it('an add on a list holding one element that isn’t a name keeps the rest', async () => {
+    await writeFile(
+      join(root, `.nexus/metadata/${shardOf(A_ID)}.json`),
+      JSON.stringify({ pages: { [A_ID]: { aliases: ['keep me', 3, 'and me'] } } }),
+    )
+    await settledMutate(
+      root,
+      { op: 'editAliases', path, edit: { op: 'add', alias: 'new' } },
+      nexusDeps,
+    )
+    expect(await month()).toEqual({ pages: { [A_ID]: { aliases: ['keep me', 'and me', 'new'] } } })
+  })
+})
+
 describe('handleMutate — landings Settings keeps out', () => {
   beforeEach(async () => {
     await writeFile(
@@ -3212 +3289 @@ describe('each routine operation lands from its own events, with no walk', () =>
     ],
     [
       'a page meta write',
-      { op: 'setPageMeta', path: 'Notes/Daily/Alpha.md', patch: { aliases: ['a'] } },
+      { op: 'setPageMeta', path: 'Notes/Daily/Alpha.md', patch: { title_icon: true } },
+    ],
+    [
+      'an alias edit',
+      { op: 'editAliases', path: 'Notes/Daily/Alpha.md', edit: { op: 'add', alias: 'a' } },
     ],
     ['a Set icon', { op: 'setIcon', path: 'Notes/Daily', kind: 'set', icon: 'star' }],
     ['a page icon', { op: 'setIcon', path: 'Notes/Daily/Alpha.md', kind: 'page', icon: 'star' }],
```

##### Core/Nexus/pageMetadata.test.ts

```/Core/Nexus/pageMetadata.test.ts diff
@@ -59 +59 @@ describe('readShard', () => {
     })
   })
 
+  it('keeps every alias but the one element that isn’t a name', async () => {
+    await writeFile(
+      metadataShardPath(root, '09-2026'),
+      JSON.stringify({ pages: { [SEP_A]: { aliases: ['keep me', 3, 'and me'] } } }),
+    )
+    expect(await readShard(root, '09-2026')).toEqual({
+      kind: 'ok',
+      pages: { [SEP_A]: { aliases: ['keep me', 'and me'] } },
+    })
+  })
+
   it('reports a missing month absent and a corrupt one unreadable', async () => {
     expect(await readShard(root, '09-2026')).toEqual({ kind: 'absent' })
     await writeFile(metadataShardPath(root, '09-2026'), '{ bad json')
```

##### Core/Pages/AliasesRow.test.tsx

```/Core/Pages/AliasesRow.test.tsx diff
@@ -0 +1 @@
+// @vitest-environment jsdom
+import { afterEach, describe, expect, it, vi } from 'vitest'
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { resting } from '@pommora/uix/Fields/fields.css'
+import { firePointer, stubRect } from '@pommora/uix/Utilities/pointerHarness'
+import { AliasesRow } from './AliasesRow'
+import { useSession } from '../Session/store'
+import { stubDialer } from '../vitest.setup'
+import { makeTree } from '../Testing/testTree'
+
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+const PAGE = { id: 'p1', path: 'Notes/Alpha.md', title: 'Alpha' }
+const TAKEN = { ok: true, value: {} }
+const REFUSED = { ok: false, error: { code: 'io', message: 'refused' } }
+
+let host: HTMLDivElement
+let root: Root
+let mutate: ReturnType<typeof vi.fn>
+let menuAnswer: string | null = null
+
+const treeWith = (aliases: string[]) => makeTree({ pageMetadata: { p1: { aliases } } })
+
+const render = async (
+  aliases: string[] = ['the plan', 'Q3 doc'],
+  reply: () => unknown = () => TAKEN,
+): Promise<void> => {
+  mutate = vi.fn(async () => reply())
+  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+    mutate,
+    menu: async () => ({ ok: true, value: menuAnswer }),
+  })
+  useSession.setState({ tree: treeWith(aliases) })
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await act(async () => root.render(<AliasesRow page={PAGE} />))
+}
+
+afterEach(async () => {
+  await act(async () => root.unmount())
+  document.body.replaceChildren(...document.body.querySelectorAll(':scope > [aria-live]'))
+  menuAnswer = null
+})
+
+const byLabel = (label: string): HTMLElement[] =>
+  Array.from(document.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`))
+const inputs = (): HTMLInputElement[] =>
+  Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-label="Alias"]'))
+const reveals = (): HTMLElement[] =>
+  Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
+const revealHolding = (text: string): HTMLElement | undefined =>
+  reveals().find((r) => r.textContent === text)
+const nameOf = (text: string): HTMLElement =>
+  revealHolding(text)?.querySelector(`.${resting}`) as HTMLElement
+const manage = async (): Promise<void> => {
+  const button = Array.from(document.querySelectorAll('button')).find(
+    (b) => b.textContent === 'Manage',
+  ) as HTMLButtonElement
+  await act(async () => button.click())
+}
+const add = async (): Promise<void> => {
+  await act(async () => byLabel('Add alias')[0].click())
+}
+const press = async (input: HTMLInputElement, key: string): Promise<void> => {
+  await act(async () => {
+    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
+  })
+}
+const type = (input: HTMLInputElement, text: string): void => {
+  input.value = text
+  input.dispatchEvent(new Event('input', { bubbles: true }))
+}
+const doubleClick = async (el: HTMLElement): Promise<void> => {
+  await act(async () => {
+    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
+  })
+}
+const rightClick = async (el: HTMLElement): Promise<void> => {
+  await act(async () => {
+    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
+  })
+}
+const deleteOf = (text: string): HTMLElement =>
+  revealHolding(text)?.querySelector('[aria-label="Delete alias"]') as HTMLElement
+const sent = (edit: unknown): unknown => ({ op: 'editAliases', path: PAGE.path, edit })
+const lineRows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-line-row]')]
+const stubRows = (): void => {
+  const zone = document.querySelector('.line-zone')
+  if (zone) stubRect(zone, { top: 0, bottom: lineRows().length * 30 })
+  for (const [i, el] of lineRows().entries()) stubRect(el, { top: i * 30, bottom: i * 30 + 30 })
+}
+const lift = async (from: number, toY: number, target = lineRows()[from]): Promise<void> => {
+  stubRows()
+  await act(async () => {
+    firePointer(target, 'pointerdown', { x: 10, y: from * 30 + 15 })
+  })
+  await act(async () => {
+    firePointer(window, 'pointermove', { x: 10, y: toY })
+  })
+}
+const release = async (): Promise<void> => {
+  await act(async () => {
+    firePointer(window, 'pointerup')
+  })
+}
+const moves = (): unknown[] =>
+  mutate.mock.calls.filter(([req]) => (req as { edit: { op: string } }).edit.op === 'move')
+
+describe('AliasesRow', () => {
+  it('reads Aliases with the count of held aliases', async () => {
+    await render()
+    expect(host.textContent).toContain('Aliases')
+    expect(host.textContent).toContain('2')
+  })
+
+  it('counts one spelling per name and never the title', async () => {
+    await render(['the plan', 'The Plan', 'alpha'])
+    expect(host.textContent).toContain('1')
+    expect(host.textContent).not.toContain('2')
+  })
+
+  it('Manage opens a pane of menu rows, each with its ×, and focuses nothing', async () => {
+    await render()
+    const before = document.activeElement
+    await manage()
+    expect(reveals().map((r) => r.textContent)).toEqual(['the plan', 'Q3 doc'])
+    expect(byLabel('Delete alias').length).toBe(2)
+    expect(document.activeElement).toBe(before)
+  })
+
+  it('+ drafts a focused input, and Enter adds what was typed into the draft’s row', async () => {
+    await render(['the plan', 'Q3 doc'], () => {
+      useSession.setState({ tree: treeWith(['the plan', 'Q3 doc', 'roadmap']) })
+      return TAKEN
+    })
+    await manage()
+    await add()
+    const draft = inputs()[0]
+    expect(document.activeElement).toBe(draft)
+    const held = draft.closest('[data-reveal]')
+    type(draft, 'roadmap')
+    await press(draft, 'Enter')
+    expect(mutate).toHaveBeenCalledWith(sent({ op: 'add', alias: 'roadmap' }))
+    expect(revealHolding('roadmap')).toBe(held)
+    expect(inputs().length).toBe(0)
+  })
+
+  it('a refused add leaves the draft open with what was typed', async () => {
+    await render(['the plan', 'Q3 doc'], () => REFUSED)
+    await manage()
+    await add()
+    const draft = inputs()[0]
+    type(draft, 'roadmap')
+    await press(draft, 'Enter')
+    expect(mutate).toHaveBeenCalled()
+    expect(inputs().map((i) => i.value)).toEqual(['roadmap'])
+  })
+
+  it('Escape on an empty draft closes it and sends nothing', async () => {
+    await render()
+    await manage()
+    await add()
+    await press(inputs()[0], 'Escape')
+    expect(inputs().length).toBe(0)
+    expect(reveals().length).toBe(2)
+    expect(mutate).not.toHaveBeenCalled()
+  })
+
+  it('× on a draft closes it', async () => {
+    await render()
+    await manage()
+    await add()
+    const x = inputs()[0].closest('[data-reveal]')?.querySelector('[aria-label="Delete alias"]')
+    await act(async () => (x as HTMLElement).click())
+    expect(inputs().length).toBe(0)
+    expect(mutate).not.toHaveBeenCalled()
+  })
+
+  it('typing the title marks the draft invalid', async () => {
+    await render()
+    await manage()
+    await add()
+    const draft = inputs()[0]
+    type(draft, 'alpha')
+    expect(draft.getAttribute('aria-invalid')).toBe('true')
+  })
+
+  it('typing a name a link can’t carry marks the draft invalid', async () => {
+    await render()
+    await manage()
+    await add()
+    const draft = inputs()[0]
+    type(draft, 'a]b')
+    expect(draft.getAttribute('aria-invalid')).toBe('true')
+  })
+
+  it('a rename onto the title closes the field and sends nothing, the row reading its name throughout', async () => {
+    await render()
+    await manage()
+    await doubleClick(nameOf('the plan'))
+    const row = inputs()[0].closest('[data-reveal]') as HTMLElement
+    const seen: string[] = []
+    const watch = new MutationObserver(() => {
+      if (!row.querySelector('input')) seen.push(row.textContent ?? '')
+    })
+    watch.observe(row, { subtree: true, childList: true, characterData: true })
+    type(inputs()[0], 'ALPHA')
+    await press(inputs()[0], 'Enter')
+    watch.disconnect()
+    expect(mutate).not.toHaveBeenCalled()
+    expect(inputs().length).toBe(0)
+    expect(seen.every((t) => t === 'the plan')).toBe(true)
+    expect(reveals()[0].textContent).toBe('the plan')
+  })
+
+  it('a single click opens nothing; a double-click renames in place, holding the new name until it lands', async () => {
+    let answer!: (r: unknown) => void
+    await render(['the plan', 'Q3 doc'], () => new Promise((r) => (answer = r)))
+    await manage()
+    await act(async () => nameOf('the plan').click())
+    expect(inputs().length).toBe(0)
+    expect(mutate).not.toHaveBeenCalled()
+    await doubleClick(nameOf('the plan'))
+    const input = inputs()[0]
+    expect(input.value).toBe('the plan')
+    type(input, 'The Plan')
+    await press(input, 'Enter')
+    expect(mutate).toHaveBeenCalledWith(sent({ op: 'rename', from: 'the plan', to: 'The Plan' }))
+    expect(reveals()[0].textContent).toBe('The Plan')
+    await act(async () => answer(REFUSED))
+    expect(reveals()[0].textContent).toBe('the plan')
+  })
+
+  it('opening a second rename commits the first and leaves the second open', async () => {
+    await render()
+    await manage()
+    await doubleClick(nameOf('the plan'))
+    type(inputs()[0], 'The Plan')
+    await doubleClick(nameOf('Q3 doc'))
+    expect(mutate).toHaveBeenCalledWith(sent({ op: 'rename', from: 'the plan', to: 'The Plan' }))
+    expect(inputs().map((i) => i.value)).toEqual(['Q3 doc'])
+  })
+
+  it('Delete alias forgets it, and on the row being renamed closes its input', async () => {
+    await render()
+    await manage()
+    await act(async () => deleteOf('Q3 doc').click())
+    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'Q3 doc' }))
+    await doubleClick(nameOf('the plan'))
+    const x = inputs()[0].closest('[data-reveal]')?.querySelector('[aria-label="Delete alias"]')
+    await act(async () => (x as HTMLElement).click())
+    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'the plan' }))
+    expect(inputs().length).toBe(0)
+  })
+
+  it('a pointer drag sends the move', async () => {
+    await render(['the plan', 'Q3 doc', 'launch'])
+    await manage()
+    await lift(2, 32)
+    await release()
+    expect(mutate).toHaveBeenCalledExactlyOnceWith(
+      sent({ op: 'move', alias: 'launch', toIndex: 1 }),
+    )
+  })
+
+  it('a release on the row’s own slot sends nothing', async () => {
+    await render(['the plan', 'Q3 doc', 'launch'])
+    await manage()
+    await lift(1, 40)
+    await release()
+    expect(mutate).not.toHaveBeenCalled()
+  })
+
+  it('Space, ArrowUp, Space announces and sends the move', async () => {
+    await render(['the plan', 'Q3 doc', 'launch'])
+    await manage()
+    stubRows()
+    const row = lineRows()[1]
+    await act(async () => row.focus())
+    for (const [el, k] of [
+      [row, ' '],
+      [document, 'ArrowUp'],
+      [document, ' '],
+    ] as const)
+      await act(async () => {
+        el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
+      })
+    expect(document.querySelector('[role="status"]')?.textContent).toBe('Moved Q3 doc.')
+    expect(mutate).toHaveBeenCalledExactlyOnceWith(
+      sent({ op: 'move', alias: 'Q3 doc', toIndex: 0 }),
+    )
+  })
+
+  it('with a draft open, a press lifts nothing', async () => {
+    await render(['the plan', 'Q3 doc', 'launch'])
+    await manage()
+    await add()
+    await lift(2, 5)
+    await release()
+    expect(moves()).toEqual([])
+  })
+
+  it('× still deletes after a wobble under the button’s slop', async () => {
+    await render(['the plan', 'Q3 doc', 'launch'])
+    await manage()
+    await lift(1, 55, deleteOf('Q3 doc'))
+    await release()
+    await act(async () => deleteOf('Q3 doc').click())
+    expect(mutate).toHaveBeenCalledExactlyOnceWith(sent({ op: 'forget', alias: 'Q3 doc' }))
+  })
+
+  it('the row menu’s Rename opens the input, and its Delete forgets', async () => {
+    await render()
+    await manage()
+    menuAnswer = 'rename'
+    await rightClick(nameOf('Q3 doc'))
+    expect(inputs().map((i) => i.value)).toEqual(['Q3 doc'])
+    await press(inputs()[0], 'Escape')
+    menuAnswer = 'delete'
+    await rightClick(nameOf('Q3 doc'))
+    expect(mutate).toHaveBeenCalledWith(sent({ op: 'forget', alias: 'Q3 doc' }))
+  })
+})
```

##### Core/Pages/editorHost.test.ts

```/Core/Pages/editorHost.test.ts diff
@@ -170 +170 @@ describe('the alias memory', () => {
     return { mutate, hosts, root }
   }
 
-  it('a forget writes the page’s metadata, and the host rebuilds on the metadata push and hears no other', async () => {
+  it('an edit sends its instruction and resolves taken, and the host rebuilds on the metadata push and hears no other', async () => {
     const { mutate, hosts, root } = await mountHosts(['the notes', 'my draft'])
     const host = hosts[hosts.length - 1]
     expect(host.aliases.list('p1')).toEqual(['the notes', 'my draft'])
-    await act(async () => host.aliases.forget('p1', 'the notes'))
+    let took: boolean | undefined
+    await act(async () => {
+      took = await host.aliases.edit('p1', { op: 'forget', alias: 'the notes' })
+    })
+    expect(took).toBe(true)
     expect(mutate).toHaveBeenCalledWith({
-      op: 'setPageMeta',
+      op: 'editAliases',
       path: 'Notes/Alpha.md',
-      patch: { aliases: ['my draft'] },
+      edit: { op: 'forget', alias: 'the notes' },
     })
     const heard = vi.fn()
     const off = host.aliases.subscribe(heard)
@@ -191 +195 @@ describe('the alias memory', () => {
     act(() => root.unmount())
   })
 
-  it('forgetting the last alias clears the field, and an unchanged gesture writes nothing', async () => {
+  it('lists what the page holds under the rules', async () => {
+    const { hosts, root } = await mountHosts(['the notes', 'The Notes', 'alpha'])
+    expect(hosts[hosts.length - 1].aliases.list('p1')).toEqual(['the notes'])
+    act(() => root.unmount())
+  })
+
+  it('an edit on a page the tree doesn’t hold resolves refused and sends nothing', async () => {
     const { mutate, hosts, root } = await mountHosts(['the notes'])
-    const host = hosts[hosts.length - 1]
-    await act(async () => host.aliases.remember('p1', 'the notes'))
-    await act(async () => host.aliases.forget('p1', 'never given'))
-    expect(mutate).not.toHaveBeenCalled()
-    await act(async () => host.aliases.forget('p1', 'the notes'))
-    expect(mutate).toHaveBeenCalledWith({
-      op: 'setPageMeta',
-      path: 'Notes/Alpha.md',
-      patch: { aliases: null },
+    let took: boolean | undefined
+    await act(async () => {
+      took = await hosts[hosts.length - 1].aliases.edit('gone', { op: 'add', alias: 'x' })
     })
+    expect(took).toBe(false)
+    expect(mutate).not.toHaveBeenCalled()
     act(() => root.unmount())
   })
 })
```

##### Core/Properties/PropertyPanel.test.tsx

```/Core/Properties/PropertyPanel.test.tsx diff
@@ -276 +276 @@ describe('PropertyPanel', () => {
     expect(text()).toContain('Alpha')
   })
 
+  it('a page shows its Aliases row after the Properties group, and a Space shows none', async () => {
+    const aliasesLabel = (): Element | undefined =>
+      Array.from(host.querySelectorAll('*')).find(
+        (el) => el.children.length === 0 && el.textContent === 'Aliases',
+      )
+    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
+    for (const panelHost of ['dropdown', 'side-pane'] as const) {
+      await renderPanel(<PropertyPanel key={panelHost} subject={PAGE} host={panelHost} />)
+      const lastGroup = Array.from(host.querySelectorAll('[data-reveal-host]')).find(
+        (g) => g.firstElementChild?.textContent === 'Properties',
+      ) as Element
+      expect(lastGroup.textContent).toContain('Stage')
+      const label = aliasesLabel()
+      expect(label).toBeDefined()
+      expect(
+        lastGroup.compareDocumentPosition(label as Element) & Node.DOCUMENT_POSITION_FOLLOWING,
+      ).toBeTruthy()
+      expect(lastGroup.contains(label as Element)).toBe(false)
+    }
+    setTree({ Stage: 'Alpha' })
+    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
+    expect(text()).toContain('Stage')
+    expect(aliasesLabel()).toBeUndefined()
+  })
+
   it('a Space subject reads the registry and its node’s own values', async () => {
     setTree({ Stage: 'Alpha' })
     await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
```

##### Core/Properties/assignValue.test.ts

```/Core/Properties/assignValue.test.ts diff
@@ -7 +7 @@ import type { PropertyDefinition } from './properties'
 import { assignValue, type ValueWriter } from './assignValue'
 import { groupUndo, resetUndo, undoValue } from '../Session/undo'
 import { useSession } from '../Session/store'
+import { makeTree } from '../Testing/testTree'
 
 const schema: PropertyDefinition[] = [
   {
@@ -219 +220 @@ describe('assignValue', () => {
     expect(undoValue(null)).toBe(false)
   })
 })
+
+describe('a landed Link value remembers the alias it shows', () => {
+  const column = { id: 'prop_link', kind: 'property' } as const
+  const link = (value: string) => ({ kind: 'link', value }) as const
+  const remembered = () => mutate.mock.calls.filter(([req]) => req.op === 'editAliases')
+  const settled = () => new Promise((r) => setTimeout(r))
+
+  beforeEach(() => {
+    live.schema = [...schema, { id: 'prop_link', name: 'Link', type: 'link' }]
+    row = rowOf({ id: 'page1', Link: '[[Alpha|old]]' })
+    useSession.setState({ tree: makeTree() })
+  })
+
+  it('remembers the alias once the write lands', async () => {
+    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
+    expect(mutate.mock.calls.map(([req]) => req.op)).toEqual(['setProperty', 'editAliases'])
+    expect(mutate).toHaveBeenLastCalledWith({
+      op: 'editAliases',
+      path: 'Notes/Alpha.md',
+      edit: { op: 'add', alias: 'the notes' },
+    })
+  })
+
+  it('a refused write remembers nothing', async () => {
+    mutate.mockResolvedValueOnce(null)
+    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
+    await settled()
+    expect(remembered()).toEqual([])
+  })
+
+  it('an undo of the commit remembers nothing', async () => {
+    await assignValue(writer, row, column, link('[[Alpha|the notes]]'))
+    mutate.mockClear()
+    expect(undoValue(null)).toBe(true)
+    await settled()
+    expect(mutate).toHaveBeenCalledTimes(1)
+    expect(remembered()).toEqual([])
+  })
+
+  it('a new spelling of the alias it showed is remembered', async () => {
+    await assignValue(writer, row, column, link('[[Alpha|Old]]'))
+    expect(mutate).toHaveBeenLastCalledWith({
+      op: 'editAliases',
+      path: 'Notes/Alpha.md',
+      edit: { op: 'add', alias: 'Old' },
+    })
+  })
+
+  it('the alias it showed, retargeted to another page, is remembered by that page', async () => {
+    await assignValue(writer, row, column, link('[[Nested Beta|old]]'))
+    expect(mutate).toHaveBeenLastCalledWith({
+      op: 'editAliases',
+      path: 'Notes/Ideas/Beta.md',
+      edit: { op: 'add', alias: 'old' },
+    })
+  })
+
+  it.each([
+    ['a phantom title', '[[Missing|x]]'],
+    ['an unaliased link', '[[Alpha]]'],
+    ['the alias it already showed', '[[Alpha#Intro|old]]'],
+    ['a markdown label', '[my label](Alpha)'],
+  ])('%s remembers nothing', async (_, value) => {
+    await assignValue(writer, row, column, link(value))
+    await settled()
+    expect(mutate).toHaveBeenCalledTimes(1)
+    expect(remembered()).toEqual([])
+  })
+})
```

##### Core/Properties/Pickers/PropertyPicker.pane.test.tsx

```/Core/Properties/Pickers/PropertyPicker.pane.test.tsx diff
@@ -2 +2 @@
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { act, useRef } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
-import { ok } from '../../Contract/result'
+import { fail, ok, type Result } from '../../Contract/result'
 import { stubDialer } from '../../vitest.setup'
 import { dateDefaults } from '../columnStyles'
 import { defaultStatusSeed, type PropertyDefinition } from '../properties'
@@ -69 +69 @@ const rowButton = (name: string): HTMLElement | undefined =>
 let host: HTMLDivElement
 let root: Root
 const menu = vi.fn(async (_req: unknown) => ok(null))
-const editOption = vi.fn(async () => ok(null))
+const editOption = vi.fn(async (): Promise<Result<null>> => ok(null))
 beforeEach(() => {
   menu.mockClear()
   editOption.mockClear()
@@ -287 +287 @@ describe('editing options from the picker', () => {
       title: 'Fresh',
     })
     expect(onCommit).not.toHaveBeenCalled()
+    await act(async () => {})
     expect(draft()).toBeNull()
   })
 
+  it('a refused add keeps its name in the draft', async () => {
+    editOption.mockResolvedValueOnce(fail('invalid-property', 'taken'))
+    await render({ target: optionsTarget() })
+    const input = await beginDraft()
+    input.value = 'Fresh'
+    key(input, 'Enter')
+    await act(async () => {})
+    expect(draft()?.value).toBe('Fresh')
+  })
+
+  it('New Option waits while a draft is open', async () => {
+    await render({ target: optionsTarget() })
+    await beginDraft()
+    expect(newOption()?.disabled).toBe(true)
+  })
+
   it('a blank Enter and an Escape on the draft add nothing', async () => {
     await render({ target: optionsTarget() })
     key(await beginDraft(), 'Enter')
```

##### Core/Properties/Schema/OptionEditor.test.tsx

```/Core/Properties/Schema/OptionEditor.test.tsx diff
@@ -39 +39 @@ const select = [
 let host: HTMLDivElement
 let root: Root
 const menu = vi.fn(async () => ok<string | null>(null))
-const editOption = vi.fn(async () => ok(null))
+const editOption = vi.fn(async (): Promise<Result<null>> => ok(null))
 const renameOption = vi.fn(async (): Promise<Result<{ cascade: object }>> => ok({ cascade: {} }))
 const removeOption = vi.fn(async () => ok({ cascade: {} }))
 const clearOption = vi.fn(async () => ok(null))
@@ -182 +182 @@ describe('creating an option', () => {
     })
   })
 
+  it('a refused add leaves the draft reading its name', async () => {
+    editOption.mockResolvedValueOnce(refuse)
+    render('select', select)
+    plus()
+    await commit(host.querySelector('input'), 'Fresh')
+    await act(async () => {})
+    expect(host.querySelector('input')?.value).toBe('Fresh')
+  })
+
+  it('the draft stays open until its option lands, and gives way to it', async () => {
+    let reply: (r: Result<null>) => void = () => {}
+    editOption.mockImplementationOnce(() => new Promise((r) => (reply = r)))
+    render('select', select)
+    plus()
+    await commit(host.querySelector('input'), 'Fresh')
+    expect(host.querySelector('input')?.value).toBe('Fresh')
+    render('select', [
+      { ...select[0], options: [...select[0].options, { value: 'Fresh', group_id: 'select' }] },
+    ])
+    expect(host.querySelector('input')).toBeNull()
+    await act(async () => reply(ok(null)))
+  })
+
+  it('a refused draft repeating a held name keeps its name, and the held row stays put', async () => {
+    editOption.mockResolvedValueOnce(refuse)
+    render('select', select)
+    const urgent = span('Urgent')
+    plus()
+    await commit(host.querySelector('input'), 'Urgent')
+    await act(async () => {})
+    expect(host.querySelector('input')?.value).toBe('Urgent')
+    expect(span('Urgent')).toBe(urgent)
+    expect(urgent?.isConnected).toBe(true)
+  })
+
   it('a blank name adds nothing', async () => {
     render('select', select)
     plus()
```

##### Core/Settings/ExclusionRows.test.tsx

```/Core/Settings/ExclusionRows.test.tsx diff
@@ -104 +104 @@ describe('ExcludedDirectoriesRow', () => {
     const removes = byLabel('Remove exclusion')
     expect(removes.length).toBe(2)
     await act(async () => removes[0].click())
-    // Removal collapses first; the write fires when the fold's transition ends.
-    const reveal = document.querySelector<HTMLElement>('[data-reveal]')
+    expect(exclusionsSet).toHaveBeenCalledWith(['Vault A'])
+  })
+
+  it("a × press keeps the field's focus", async () => {
+    await render(['Archive'])
+    await act(async () => manageButton().click())
+    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
+    byLabel('Remove exclusion')[0].dispatchEvent(press)
+    expect(press.defaultPrevented).toBe(true)
+  })
+
+  it("renaming a folder keeps its row's node", async () => {
+    await render(['Archive', 'Vault A'])
+    await act(async () => manageButton().click())
+    const revealHolding = (text: string): HTMLElement | undefined =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).find((r) =>
+        r.textContent?.includes(text),
+      )
+    const before = revealHolding('Archive')
+    expect(before).toBeDefined()
+    await act(async () => fieldButtons()[0].click())
+    const input = document.querySelector('input') as HTMLInputElement
+    input.value = 'Renamed'
     await act(async () => {
-      reveal?.dispatchEvent(
-        Object.assign(new Event('transitionend', { bubbles: true }), {
-          propertyName: 'grid-template-rows',
-        }),
+      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
+    })
+    await act(async () => {
+      useSession.setState({ tree: { config: { excluded: ['Renamed', 'Vault A'] } } as never })
+    })
+    expect(revealHolding('Renamed')).toBe(before)
+  })
+
+  it('a refused draft naming a held folder keeps its row and leaves the held row alone', async () => {
+    await render(['Archive'])
+    exclusionsSet.mockResolvedValue({ ok: false, error: { kind: 'invalid', message: 'refused' } })
+    await act(async () => manageButton().click())
+    const revealHolding = (text: string): HTMLElement | undefined =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).find((r) =>
+        r.textContent?.includes(text),
       )
+    const held = revealHolding('Archive')
+    await act(async () => addButton()?.click())
+    await act(async () => fieldButtons()[1].click())
+    const input = document.querySelector('input') as HTMLInputElement
+    input.value = 'Archive'
+    await act(async () => {
+      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
     })
-    expect(exclusionsSet).toHaveBeenCalledWith(['Vault A'])
+    expect(exclusionsSet).toHaveBeenCalledWith(['Archive', 'Archive'])
+    expect(revealHolding('Archive')).toBe(held)
+    expect(fieldButtons().length).toBe(2)
   })
 
   it('committing a field writes the whole list with that entry replaced', async () => {
```

##### Core/Settings/PreviewRulesRow.test.tsx

```/Core/Settings/PreviewRulesRow.test.tsx diff
@@ -9 +9 @@ import { makeTree } from '../Testing/testTree'
 import type { FilterGroup, FilterRule, StandaloneFilter } from '../Views/filterRules'
 import { RESERVED_PROPERTY_ID } from '../Properties/properties'
 import { RESERVED_LABEL } from '../Properties/Cells/columnLabel'
-import { count } from './settings-rows.css'
+import { trailingFigure } from '@pommora/uix/Menus/menu-row.css'
 
 ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
 
@@ -71 +71 @@ const option = (text: string): Element | undefined =>
 describe('PreviewRulesRow', () => {
   it('the count reads the rule count', async () => {
     await render({ rules: { match: 'any', rules: [titleRule, createdRule] }, enabled: true })
-    expect(host.getElementsByClassName(count)[0]?.textContent).toBe('2')
+    expect(host.getElementsByClassName(trailingFigure)[0]?.textContent).toBe('2')
   })
 
   it('adding a rule through the pane writes the key', async () => {
```

##### Core/Views/Settings/FilterFrame.test.tsx

```/Core/Views/Settings/FilterFrame.test.tsx diff
@@ -8 +8 @@ import type { SavedView } from '../views'
 import { FilterFrame, type FilterView } from './FilterFrame'
 import { mountEachTest } from '../../Testing/viewHarness'
 import { linkedSpacesTree } from '../../Testing/testTree'
-import { itemPicked } from '@pommora/uix/Menus/menu-row.css'
+import { itemPicked, menuCompact } from '@pommora/uix/Menus/menu-row.css'
 import { TITLE_TARGET } from '../../Properties/Cells/PropertyTypes'
 
 const statusDef: PropertyDefinition = {
@@ -136 +136 @@ describe('FilterFrame', () => {
     expect(texts()).toContain('Is Checked')
   })
 
+  it('the pane carries the compact row rule itself, whatever hosts it', async () => {
+    await mount(twoRules())
+    const pane = host.firstElementChild
+    expect(pane?.classList.contains(menuCompact)).toBe(true)
+    expect(pane?.contains(byLabel('Filter property') ?? null)).toBe(true)
+  })
+
   it('the footer switch parks the filter without touching its rules or mode', async () => {
     await mount(twoRules())
     await click(byLabel('Filter active'))
@@ -395 +402 @@ describe('FilterFrame', () => {
     })
   })
 
+  describe('a rule’s ×', () => {
+    const textRules = (): SavedView =>
+      view({
+        filter: {
+          match: 'all',
+          rules: [
+            { property_id: '_title', op: 'is' },
+            { property_id: '_title', op: 'contains' },
+          ],
+        },
+      })
+    const removes = (): HTMLElement[] => [
+      ...host.querySelectorAll<HTMLElement>('[aria-label="Remove filter"]'),
+    ]
+    const typeInto = async (input: HTMLInputElement, text: string): Promise<void> => {
+      await act(async () => {
+        input.focus()
+        input.value = text
+      })
+    }
+    // A press the × doesn't prevent moves focus off the field, as a browser does before the click.
+    const press = async (el: HTMLElement): Promise<void> => {
+      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
+      await act(async () => {
+        el.dispatchEvent(down)
+        if (!down.defaultPrevented) (document.activeElement as HTMLElement | null)?.blur()
+      })
+      await click(el)
+    }
+
+    it('keeps focus where it is on a press, on a rule and on the draft', async () => {
+      await mount(textRules())
+      await click(byLabel('Add filter rule'))
+      await settle()
+      expect(removes()).toHaveLength(3)
+      for (const x of removes()) {
+        const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
+        x.dispatchEvent(down)
+        expect(down.defaultPrevented).toBe(true)
+      }
+    })
+
+    it('removing one rule leaves a neighbour’s field mid-edit where it stands', async () => {
+      await mount(textRules())
+      const second = host.querySelectorAll('input')[1]
+      await typeInto(second, 'foo')
+      await press(removes()[0])
+      expect(host.querySelectorAll('input')[0]).toBe(second)
+      expect(document.activeElement).toBe(second)
+      expect(second.value).toBe('foo')
+      expect(saveSpy).toHaveBeenCalledTimes(1)
+      expect(lastSaved().filter?.rules).toEqual([{ property_id: '_title', op: 'contains' }])
+    })
+
+    it('removing a rule mid-edit discards its edit', async () => {
+      await mount(textRules())
+      await typeInto(host.querySelectorAll('input')[0], 'foo')
+      await press(removes()[0])
+      expect(host.querySelectorAll('input')).toHaveLength(1)
+      expect(host.querySelector('input')?.value).toBe('')
+      expect(saveSpy).toHaveBeenCalledTimes(1)
+    })
+
+    it('a rule added from elsewhere leaves the rows already there and a field mid-edit standing', async () => {
+      await mount(textRules())
+      const second = host.querySelectorAll('input')[1]
+      await typeInto(second, 'foo')
+      const rules = textRules().filter?.rules ?? []
+      await mount(
+        view({
+          filter: { match: 'all', rules: [...rules, { property_id: '_title', op: 'is' }] },
+        }),
+      )
+      expect(host.querySelectorAll('input')).toHaveLength(3)
+      expect(host.querySelectorAll('input')[1]).toBe(second)
+      expect(second.value).toBe('foo')
+    })
+
+    it('the draft row’s reveal holds the rule it picks', async () => {
+      await mount(textRules())
+      await click(byLabel('Add filter rule'))
+      await settle()
+      const drafted = [...host.querySelectorAll('[data-reveal]')].at(-1)
+      await click(
+        [...host.querySelectorAll('button')]
+          .filter((b) => b.getAttribute('aria-label') === 'Filter property')
+          .at(-1),
+      )
+      await click(
+        optionWithText('Archived') ??
+          [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Archived').at(-1),
+      )
+      expect(lastSaved().filter?.rules).toHaveLength(3)
+      expect([...host.querySelectorAll('[data-reveal]')].at(-1)).toBe(drafted)
+      expect(drafted?.textContent).toContain('Archived')
+    })
+  })
+
   it('removing the first of two rows writes the remaining rule at once', async () => {
     await mount(twoRules())
     await click(
```

##### UIX/Fields/EditableInput.test.tsx

```/UIX/Fields/EditableInput.test.tsx diff
@@ -133 +133 @@ describe('EditableInput marking text that will not commit', () => {
     })
     expect(input.getAttribute('aria-invalid')).toBe('false')
   })
+
+  it('Enter on marked text restores the field and cancels', () => {
+    const onCommit = vi.fn()
+    const onCancel = vi.fn()
+    act(() =>
+      root.render(
+        <EditableInput
+          initial="12"
+          className="field"
+          invalid={notANumber}
+          onCommit={onCommit}
+          onCancel={onCancel}
+        />,
+      ),
+    )
+    const input = host.querySelector('input') as HTMLInputElement
+    input.value = 'x'
+    press(input, 'Enter')
+    expect(onCancel).toHaveBeenCalledTimes(1)
+    expect(onCommit).not.toHaveBeenCalled()
+    expect(input.value).toBe('12')
+  })
 })
```

##### UIX/Pickers/PickerMenu.test.tsx

```/UIX/Pickers/PickerMenu.test.tsx diff
@@ -425 +425 @@ describe('PickerMenu focus contract', () => {
     await render(<Host open focus="keep" />)
     expect(press()).toBe(true)
   })
+
+  it('lets a press on a field inside a kept-focus pane through', async () => {
+    await render(
+      <PickerMenu open focus="keep">
+        <input data-id="field" aria-label="Field" />
+        <div data-id="row">Row</div>
+      </PickerMenu>,
+    )
+    const press = (id: string): boolean => {
+      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
+      find(id).dispatchEvent(e)
+      return e.defaultPrevented
+    }
+    expect(press('field')).toBe(false)
+    expect(press('row')).toBe(true)
+  })
 })
 
 // Whether a pane CENTERS is a decision, not a look — the pixels stay visual truth, but which of the two placements it takes has to hold.
```
