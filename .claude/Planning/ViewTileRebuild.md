## ViewTile Rebuild — Draft (Bundle 9)

> **Status:** draft — pending review. The plan is the single **After** codeblock in §3; the review runs against it. Nothing here is ratified.

Bundle 9 of the Codebase-Cleanup Checklist: rebuild `renderer/SurfacePM/ViewTile.tsx` (605 lines) into a set of cohesive files that mount shared primitives, with its behavior and appearance held identical. The merge parked the file at its permanent home; this is the slim-down it was sequenced before.

### 1. Rationale

`ViewTile` today is one file carrying four jobs: the tile shell, an editable/reorderable **view switcher** (add · rename · re-icon · recolor · reorder · delete a list of saved views), an inline editable **title**, and the **persistence** wiring. Two of its internals re-implement logic that already has a shared owner; the rest is legitimately its own and only wants separating for cohesion.

- **The genuine borrows (two).** `coerceConfig` (a hand-rolled shape check) is a thin subset of the `savedView` Zod coercer in `@shared/views`. That coercer catches *missing* fields but not every *present-but-wrong-typed* one (several fields are `.optional()` without `.catch`), so the wrapper uses `savedView.safeParse` and falls back on failure — the same safeParse-and-drop the read path (`parseViews`) already uses, and the reason `coerceConfig` never crashed the render. And the schema resolution ViewTile does by hand (`findCollectionForSet(...).properties`) is what `resolveContainerSchema` already provides (recursing nested sets — a genuine improvement). Both are replaced by their shared equivalents. The sentinel swap stays a thin wrapper, and it carries a fix: `savedView.parse({})` yields `id:''` (not `DEFAULT_VIEW_ID`), so the swap fires on a falsy id too, reseeding from `mintDefaultView(schema)` so a corrupt payload still gets a real id and `property_order` rather than an empty id that would break the drag key. (`pickView` does **not** apply — it resolves an active id against a Collection's own `source.views`, a different data source than the tile's numerically-indexed `entry.views`.)
- **What is already idiomatic and stays.** Drag-reorder already runs on the shared `SortableZone` / `useDragItem` / `reorder` seam — no change. Persistence already routes through `resolveViewWrite` and the `ViewTileScopeProvider` context that `TableView`/`CardsView` reach through — no change. The per-item pill enter/exit uses manual ghost tracking (`exitingId` / `enteringIds`) because no shared per-item presence primitive exists — `useExitPresence` models a single node's open/close, not add/remove within a stable list, and `WindowTabStrip` hand-rolls the same ghosts. This stays as-is.
- **The internal reshape.** Everything stays in one file — `ViewTile.tsx`. `EmbedTitle` and `ViewPill` stay local components; the switcher stays an inline closure (not a props component — its `renaming` / `iconFor` / `colorFor` state must sit in the same scope as the `rowMenu` that sets them). The one genuine extraction is `usePillPresence`, which folds the `exitingId` / `enteringIds` bookkeeping into a hook and lets `viewsRef` go. `ViewTile` reads as a thin orchestrator — resolve the entry, wire the persist closures, provide the scope, compose title + switcher + body. No new files, no new exports; the win is the two shared borrows plus internal cohesion, not a large line drop.

The appearance does not change: the switcher stays a horizontal **pill** run, not a vertical menu list. Aligning it to the `MenuItem` row vocabulary would be a redesign, out of scope here (see §5).

### 2. Grounding (verified facts the After is built on)

- **Props contract (must survive):** `ViewTile({ entry: ViewBlockEntry, mutateEntry, onActivate? })`. `mutateEntry(entryId, raw => next)` is the sole write channel.
- **Sole mount:** `SurfacePM/TileSurface.tsx` renderTile's `entry.type === 'view'` arm — `<ViewTile entry={entry} mutateEntry={mutateViewEntry} onActivate={() => setEditingId(id)} />`. No other consumer (embedWidget does not mount it).
- **The scope seam:** `ViewTile` renders `<ViewTileScopeProvider value={{ source, view, persistConfig, persistState, locked, setLocked }}>`; `TableView`/`CardsView` reach `persistState`/`persistConfig` through `useSaveView` off that context. This provider and its value shape are load-bearing and unchanged.
- **The body:** the saved view's table/cards is rendered by `<ViewRenderer source={source} />` (keyed on `source.id`); `ViewTile` wraps it, never renders a table itself.
- **The lock gate:** `resolveViewWrite(locked, view, opts?) → { kind: 'config' | 'state' | 'refused' }` (in `ViewTileScope`), pinned by a three-way negative-control test. Unchanged; every write still routes through it.
- **Shared primitives to mount:** `savedView` (`@shared/views`), `resolveContainerSchema` (`Views/Pipeline`), `SortableZone`/`useDragItem`/`reorder` (`DesignSystem/Interactions/drag`), `RenamableLabel` (`Fields`), `IconPicker`/`ColorPicker` (`Pickers`), `Icon`/`iconNameOr` (`Symbols`), `cellRing`/`labelColorFor` (`Tokens`), `mintDefaultView`/`mintNewView`/`pickViewState` (`@shared/views`).
- **Boundaries the rebuild honors:** Settled #12 (`EmbedTitle` and `PageHeader` stay apart — the extracted title is not merged toward `PageHeader`); Settled #19 (the block-doc data model keeps `block` names — `ViewBlockEntry`, `EmbeddedView`, `mutateEntry` payload stay as they are).

### 3. The Plan — the After

```tsx
export function ViewTile({ entry, mutateEntry, onActivate }: {
  entry: ViewBlockEntry
  mutateEntry: (entryId: string, fn: (raw: Record<string, unknown>) => Record<string, unknown>) => void
  onActivate?: () => void
}): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [iconFor, setIconFor] = useState<number | null>(null)
  const [colorFor, setColorFor] = useState<number | null>(null)
  const menuAnchorRef = useRef<Element | null>(null)
  const titleIconRef = useRef<SVGSVGElement>(null)
  const dropRef = useRef<HTMLButtonElement>(null)

  const index = clampActive(entry)
  const embedded = entry.views[index]
  const source = embedded && resolveSource(tree, embedded.source_id)
  const schema = source && resolveContainerSchema(tree, source)
  const views = entry.views.map((ev, i) => coerceEmbeddedView(ev.config, schema, embedSlotId(entry.id, i)))
  const view = views[index]
  const locked = entry.locked ?? false
  const dropdown = entry.view_style === 'dropdown'
  const presence = usePillPresence(views)

  if (!embedded || !source || !tree) return <div className="tile-inert" />

  const persistConfig = (i: number, config: SavedView) => {
    if (resolveViewWrite(locked, config).kind === 'config') writeConfig(i, config)
  }
  const persistState = (i: number, state: ViewState) =>
    writeConfig(i, { ...views[i], ...pickViewState({ ...views[i], ...state }) })

  return (
    <ViewTileScopeProvider value={{ source, view, persistConfig: (c) => persistConfig(index, c),
                                    persistState: (st) => persistState(index, st), locked, setLocked }}>
      <div className={s.tile} onPointerDownCapture={onActivate}>
        {titleShown && (
          <EmbedTitle title={entry.display_title ?? source.title} level={entry.title_level ?? 4}
                      editable={!locked} onCommit={commitTitle} onContextMenu={(e) => void titleMenu(e)} />
        )}

        {switcherShown && (dropdown ? renderDropdownList() : (
          <div className={s.switcherRow} onContextMenu={(e) => void areaMenu(e)}>
            <SortableZone items={views.map((v) => v.id)} layout="list" axis="x"
                          disabled={locked} onReorder={reorderViews}>
              {views.map((v, i) => (
                <ViewPill key={v.id} id={v.id} view={v} active={i === index}
                  entering={presence.entering.has(v.id)} exiting={presence.exiting === v.id}
                  labeled={labeledFrom(entry)}
                  renameNode={renaming === i ? (
                    <RenamableLabel renames="title" editing value={v.name}
                      onCommit={(next) => { persistConfig(i, { ...views[i], name: next }); setRenaming(null) }}
                      onCancel={() => setRenaming(null)} />
                  ) : null}
                  onSwitch={() => patchEntry({ active: i })}
                  onMenu={(e) => { menuAnchorRef.current = e.currentTarget; void rowMenu(entry, i, e) }}
                  onAnimEnd={() => presence.onAnimEnd(v.id, () => deleteViewAt(i))} />
              ))}
            </SortableZone>
            <AccessoryButton icon="plus" size="control" box={20} create ariaLabel="New View"
                             disabled={locked} onClick={() => addView()} />
            {iconFor != null && <IconPicker anchor={menuAnchorRef.current}
              onPick={(icon) => { persistConfig(iconFor, { ...views[iconFor], icon }); setIconFor(null) }}
              onClose={() => setIconFor(null)} />}
            {colorFor != null && <ColorPicker anchor={menuAnchorRef.current}
              onPick={(color) => { persistConfig(colorFor, { ...views[colorFor], color }); setColorFor(null) }}
              onClose={() => setColorFor(null)} />}
          </div>
        ))}

        <div className={s.body}>
          <div className={s.slideWrap} style={{ '--slide-from': slideDirection(index) } as React.CSSProperties} key={index}>
            <ViewRenderer source={source} />
          </div>
        </div>
      </div>
    </ViewTileScopeProvider>
  )
}

const coerceEmbeddedView = (raw: unknown, schema: PropertyDefinition[], fallbackId: string): SavedView => {
  const r = savedView.safeParse(raw ?? {})
  const v = r.success ? r.data : { ...mintDefaultView(schema), id: fallbackId }
  return v.id && v.id !== DEFAULT_VIEW_ID ? v : { ...mintDefaultView(schema), id: fallbackId }
}
const embedSlotId = (entryId: string, i: number) => `embed:${entryId}:${i}`


function ViewPill({ id, view, active, entering, exiting, labeled, renameNode, onSwitch, onMenu, onAnimEnd }: {
  id: string; view: SavedView; active: boolean; entering: boolean; exiting: boolean
  labeled: boolean; renameNode: React.ReactNode | null
  onSwitch: () => void; onMenu: (e: React.MouseEvent) => void; onAnimEnd: () => void
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return (
    <button ref={setNodeRef} {...handle}
      style={{ ...style, ...strokeStyle(view) }}
      className={cx(segment, active && segmentActive, entering && segmentEntering, exiting && segmentExiting)}
      onClick={onSwitch} onContextMenu={onMenu} onAnimationEnd={onAnimEnd}>
      <Icon name={iconNameOr(view.icon, 'table')} />
      {labeled && (renameNode ?? <span>{view.name}</span>)}
    </button>
  )
}

function usePillPresence(views: SavedView[]): {
  entering: Set<string>; exiting: string | null
  beginExit: (id: string) => void; onAnimEnd: (id: string, commitDelete: () => void) => void
} { … }

function EmbedTitle({ title, level, editable, onCommit, onContextMenu }: {
  title: string; level: number; editable: boolean
  onCommit: (next: string) => void; onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element { … }
```

### 4. Verification criteria

**Work shape:** refactor (behavior-preserving) + one carried fix already landed (`cellRing` in `strokeStyle`). The bar is *proof of preservation by unchanged counts*, not assertion.

**Acceptance (one falsifiable statement):** a dashboard holding a view tile with two-plus saved views behaves identically before and after — switch, add, rename, re-icon, recolor, reorder, delete; locked refuses config and accepts state; the slide and pill enter/exit animate the same; the title edits and commits; all three context menus fire — with `ViewTile.tsx` reshaped into a thin orchestrator over local `EmbedTitle` / `ViewPill` components and an inline switcher closure (no new files), and `TileSurface`'s mount site untouched.

**Preserved as-is (elided from §3, not dropped — the sketch draws only what changes):** the dropdown switcher arm (`view_style === 'dropdown'` → `dropRef` button → `PickerMenu`/`MenuScrollFrame`/`MenuItem` list, gated on `listOpen`); the config button + `SettingsFrame` picker (`cfgOpen`); the title `<Icon ref={titleIconRef}>` and its change-icon path; the three IPC menu handlers `titleMenu` / `areaMenu` / `rowMenu`; and the mutation closures `patchEntry` / `writeConfig` / `addView` / `deleteViewAt` / `reorderViews` / `setLocked` / `toggleTitles` / `commitTitle`. Each keeps its current body; the reviewer verifies they survive, not that they're redrawn.

**Carried baseline (this refactor may not move these):**
- `npm run typecheck` 0 · `npx biome check` clean · `npx vitest run` **3675** · `node ../.claude/scripts/check-atlas.mjs` 15/15. Read exit codes directly, never piped.
- The lock-gate three-way negative-control test (`ViewTileScope.test.tsx`) stays green unchanged — the gate is not touched.
- `TileSurface.tsx`'s `<ViewTile … />` mount compiles with no prop change (the contract `{ entry, mutateEntry, onActivate }` is identical).

**Removal/consolidation proof:**
- `grep -rn "coerceConfig" src/renderer/SurfacePM` → 0 after (control token: `coerceEmbeddedView` present) — the hand-rolled shape check is gone, replaced by `savedView.parse`.
- No second copy of schema resolution: `findCollectionForSet(...).properties` in ViewTile is replaced by `resolveContainerSchema`; grep confirms the inline resolve is gone.
- No new files or exports: `ViewTile` stays the only file `TileSurface` imports, and `EmbedTitle` / `ViewPill` / `usePillPresence` stay local to it.
- `usePillPresence` preserves the current `pillAnimEnd` double duty: an exit-animation end commits the deferred delete, an enter-animation end clears the id from `entering` (else entered pills keep the `segmentEntering` class).

**Live behavior checklist (run once against the built app):** the acceptance actions above, plus: a grey-cell view shows its `GREY_OUTLINES` stroke (the fix), and a view assigned a chroma color shows its solid tint.

**Must-not-violate (the reviewer attacks these):**
- **No presentation change** — the switcher stays a horizontal pill run. Any move to `MenuItem` rows is a redesign, out of scope (§5).
- Settled #12 (`EmbedTitle` apart from `PageHeader`) and Settled #19 (data model keeps `block` names — `ViewBlockEntry`, `EmbeddedView`, `mutateEntry` payload unchanged).
- The light drag stack (`Interactions/drag`) — do not drift toward `Frames/frameDnd`.

### 5. Settled (Nathan's calls)

- **Presentation stays** — the switcher is a horizontal pill run; no move to the `MenuItem` row vocabulary.
- **One file** — everything lives in `ViewTile.tsx`; no companion file, no new exports.
