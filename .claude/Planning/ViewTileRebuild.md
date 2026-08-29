## ViewTile Rebuild — Draft (Bundle 9)

> **Status:** draft — pending review. The plan is the single **After** codeblock in §3; the review runs against it. Nothing here is ratified.

Bundle 9 of the Codebase-Cleanup Checklist: rebuild `renderer/SurfacePM/ViewTile.tsx` (605 lines) into a set of cohesive files that mount shared primitives, with its behavior and appearance held identical. The merge parked the file at its permanent home; this is the slim-down it was sequenced before.

### 1. Rationale

`ViewTile` today is one file carrying four jobs: the tile shell, an editable/reorderable **view switcher** (add · rename · re-icon · recolor · reorder · delete a list of saved views), an inline editable **title**, and the **persistence** wiring. Two of its internals re-implement logic that already has a shared owner; the rest is legitimately its own and only wants separating for cohesion.

- **The genuine borrows (two).** `coerceConfig` (a hand-rolled shape check) is a thin subset of the `savedView` Zod coercer in `@shared/views`, which never throws because every field carries `.catch`. And the schema/active-view resolution ViewTile does by hand (`findCollectionForSet(...).properties`, active-index picking) is what `resolveContainerSchema` / `pickView` already provide. Both are replaced by their shared equivalents; only the embed-slot sentinel swap (`DEFAULT_VIEW_ID` → `embed:${entry.id}:${i}`) is ViewTile-specific and stays as a thin wrapper.
- **What is already idiomatic and stays.** Drag-reorder already runs on the shared `SortableZone` / `useDragItem` / `reorder` seam — no change. Persistence already routes through `resolveViewWrite` and the `ViewTileScopeProvider` context that `TableView`/`CardsView` reach through — no change. The per-item pill enter/exit uses manual ghost tracking (`exitingId` / `enteringIds`) because no shared per-item presence primitive exists — `useExitPresence` models a single node's open/close, not add/remove within a stable list, and `WindowTabStrip` hand-rolls the same ghosts. This stays as-is.
- **The internal reshape.** Everything stays in one file — `ViewTile.tsx`. The pill switcher is pulled out into a local `ViewSwitcher` component beside the existing `EmbedTitle` and `ViewPill`, so `ViewTile` reads as a thin orchestrator (resolve the entry, wire the persist callbacks, provide the scope, compose title + switcher + body) sitting above its parts. No new files, no new exports — the win is the two shared borrows plus internal cohesion, not a large line drop.

The appearance does not change: the switcher stays a horizontal **pill** run, not a vertical menu list. Aligning it to the `MenuItem` row vocabulary would be a redesign, out of scope here (see §5).

### 2. Grounding (verified facts the After is built on)

- **Props contract (must survive):** `ViewTile({ entry: ViewBlockEntry, mutateEntry, onActivate? })`. `mutateEntry(entryId, raw => next)` is the sole write channel.
- **Sole mount:** `SurfacePM/TileSurface.tsx` renderTile's `entry.type === 'view'` arm — `<ViewTile entry={entry} mutateEntry={mutateViewEntry} onActivate={() => setEditingId(id)} />`. No other consumer (embedWidget does not mount it).
- **The scope seam:** `ViewTile` renders `<ViewTileScopeProvider value={{ source, view, persistConfig, persistState, locked, setLocked }}>`; `TableView`/`CardsView` reach `persistState`/`persistConfig` through `useSaveView` off that context. This provider and its value shape are load-bearing and unchanged.
- **The body:** the saved view's table/cards is rendered by `<ViewRenderer source={source} />` (keyed on `source.id`); `ViewTile` wraps it, never renders a table itself.
- **The lock gate:** `resolveViewWrite(locked, view, opts?) → { kind: 'config' | 'state' | 'refused' }` (in `ViewTileScope`), pinned by a three-way negative-control test. Unchanged; every write still routes through it.
- **Shared primitives to mount:** `savedView` (`@shared/views`), `resolveContainerSchema` + `pickView` (`Views/Pipeline`), `SortableZone`/`useDragItem`/`reorder` (`DesignSystem/Interactions/drag`), `RenamableLabel` (`Fields`), `IconPicker`/`ColorPicker` (`Pickers`), `Icon`/`iconNameOr` (`Symbols`), `cellRing`/`labelColorFor` (`Tokens`), `mintDefaultView`/`mintNewView`/`pickViewState` (`@shared/views`).
- **Boundaries the rebuild honors:** Settled #12 (`EmbedTitle` and `PageHeader` stay apart — the extracted title is not merged toward `PageHeader`); Settled #19 (the block-doc data model keeps `block` names — `ViewBlockEntry`, `EmbeddedView`, `mutateEntry` payload stay as they are).

### 3. The Plan — the After

```tsx
// ── SurfacePM/ViewTile.tsx ────────────────────────────────────────────────
// The orchestrator: resolve the entry → wire persistence → provide scope →
// compose title + switcher + body. Renders no list and no table itself.

export function ViewTile({ entry, mutateEntry, onActivate }: {
  entry: ViewBlockEntry
  mutateEntry: (entryId: string, fn: (raw: Record<string, unknown>) => Record<string, unknown>) => void
  onActivate?: () => void
}): React.JSX.Element {
  const tree = useSession((s) => s.tree)

  const index = clampActive(entry)                          // clamp entry.active into range
  const embedded = entry.views[index]
  const source = embedded && resolveSource(tree, embedded.source_id)   // findCollection | findSet
  const schema = source && resolveContainerSchema(tree, source)         // borrowed: Views/Pipeline
  const views = entry.views.map((ev, i) => coerceEmbeddedView(ev.config, embedSlotId(entry.id, i)))
  const view = views[index]
  const locked = entry.locked ?? false

  if (!embedded || !source || !tree) return <div className="tile-inert" />

  // ── one write channel, lock-gated where the gate applies ──
  const patchEntry = (patch: Record<string, unknown>) =>
    mutateEntry(entry.id, (raw) => applyEntryPatch(raw, patch, locked))   // ignores all but locked/active while locked
  const writeConfig = (i: number, config: SavedView) =>
    mutateEntry(entry.id, (raw) => setViewConfig(raw, i, config))
  const persistConfig = (i: number, config: SavedView) => {
    if (resolveViewWrite(locked, config).kind === 'config') writeConfig(i, config)
  }
  const persistState = (i: number, state: ViewState) =>          // folds onto STORED view, never caller's
    writeConfig(i, { ...views[i], ...pickViewState({ ...views[i], ...state }) })
  const setLocked = (v: boolean) => patchEntry({ locked: v })

  const slideFrom = slideDirection(index)                        // '24px' | '-24px' | '0px' → --slide-from

  return (
    <ViewTileScopeProvider value={{ source, view, persistConfig: (c) => persistConfig(index, c),
                                    persistState: (st) => persistState(index, st), locked, setLocked }}>
      <div className={s.tile} onPointerDownCapture={onActivate}>
        <div className={s.titleSpace} /* titleSpaceInner / titleRow / titleSlide */>
          {titleShown && (
            <EmbedTitle
              title={entry.display_title ?? source.title}
              level={entry.title_level ?? 4}
              editable={!locked}
              onCommit={(next) => patchEntry({ display_title: emptyOrSame(next, source.title) })}
              onContextMenu={(e) => void titleMenu(e)}          // window.nexus.viewEmbedTitleMenu
            />
          )}
        </div>

        {dropdownOrPills(entry) && (
          <div className={s.switcherRow} onContextMenu={(e) => void areaMenu(e)}>
            <ViewSwitcher
              views={views}
              activeIndex={index}
              locked={locked}
              labeled={labeledFrom(entry)}
              onSwitch={(i) => patchEntry({ active: i })}
              onAdd={() => mutateEntry(entry.id, (raw) => addEmbeddedView(raw, schema))}
              onReorder={(activeId, overId) =>
                mutateEntry(entry.id, (raw) => reorderEmbeddedViews(raw, activeId, overId))}
              onRename={(i, name) => persistConfig(i, { ...views[i], name })}
              onDelete={(i) => mutateEntry(entry.id, (raw) => deleteEmbeddedView(raw, i))}
              onSetIcon={(i, icon) => persistConfig(i, { ...views[i], icon })}
              onSetColor={(i, color) => persistConfig(i, { ...views[i], color })}
              rowMenu={(v, i, e) => void rowMenu(entry, i, e)}   // window.nexus.viewRowMenu → dispatch
            />
          </div>
        )}

        <div className={s.body /* over-scroll */}>
          <div className={s.slideWrap} style={{ '--slide-from': slideFrom } as React.CSSProperties} key={index}>
            <ViewRenderer source={source} />                    {/* picks TableView | CardsView via useActiveView */}
          </div>
        </div>
      </div>
    </ViewTileScopeProvider>
  )
}

// Thin coerce wrapper — the shared Zod coercer plus the one embed-slot sentinel swap.
const coerceEmbeddedView = (raw: unknown, fallbackId: string): SavedView => {
  const v = savedView.parse(raw ?? {})                          // borrowed: @shared/views, never throws (.catch per field)
  return v.id === DEFAULT_VIEW_ID ? { ...v, id: fallbackId } : v
}
const embedSlotId = (entryId: string, i: number) => `embed:${entryId}:${i}`


// ViewSwitcher — a local component in SurfacePM/ViewTile.tsx.
// The horizontal pill run: drag-reorder + per-item enter/exit + inline rename,
// with icon/color/delete driven by the row context menu into shared pickers.
// Presentation unchanged — pills, not menu rows.

function ViewSwitcher({ views, activeIndex, locked, labeled,
                        onSwitch, onAdd, onReorder, onRename, onDelete, onSetIcon, onSetColor, rowMenu }: {
  views: SavedView[]; activeIndex: number; locked: boolean; labeled: boolean
  onSwitch: (i: number) => void; onAdd: () => void
  onReorder: (activeId: string, overId: string) => void
  onRename: (i: number, name: string) => void; onDelete: (i: number) => void
  onSetIcon: (i: number, icon: string) => void; onSetColor: (i: number, color: string) => void
  rowMenu: (v: SavedView, i: number, e: React.MouseEvent) => void
}): React.JSX.Element {
  const [renaming, setRenaming] = useState<number | null>(null)
  const [iconFor, setIconFor] = useState<number | null>(null)
  const [colorFor, setColorFor] = useState<number | null>(null)
  const anchorRef = useRef<Element | null>(null)
  const { entering, exiting, beginExit, onAnimEnd } = usePillPresence(views)   // manual ghost tracking (see below)

  return (
    <>
      <SortableZone items={views.map((v) => v.id)} layout="list" axis="x"
                    disabled={locked} onReorder={onReorder}>
        {views.map((v, i) => (
          <ViewPill key={v.id} id={v.id} view={v}
            active={i === activeIndex} entering={entering.has(v.id)} exiting={exiting === v.id}
            labeled={labeled}
            renameNode={renaming === i
              ? <RenamableLabel renames="title" editing value={v.name}
                  onCommit={(next) => { onRename(i, next); setRenaming(null) }}
                  onCancel={() => setRenaming(null)} />
              : null}
            onSwitch={() => onSwitch(i)}
            onMenu={(e) => { anchorRef.current = e.currentTarget; rowMenu(v, i, e) }}  // sets renaming/iconFor/colorFor/deletes
            onAnimEnd={() => onAnimEnd(v.id, () => onDelete(indexOf(views, v.id)))} />
        ))}
      </SortableZone>
      <AccessoryButton icon="plus" size="control" box={20} create ariaLabel="New View" onClick={onAdd} />
      {iconFor != null && <IconPicker anchor={anchorRef.current}
        onPick={(icon) => { onSetIcon(iconFor, icon); setIconFor(null) }} onClose={() => setIconFor(null)} />}
      {colorFor != null && <ColorPicker anchor={anchorRef.current}
        onPick={(color) => { onSetColor(colorFor, color); setColorFor(null) }} onClose={() => setColorFor(null)} />}
    </>
  )
}

// ViewPill stays a <button> on useDragItem — unchanged from today, moved beside the switcher.
function ViewPill({ id, view, active, entering, exiting, labeled, renameNode, onSwitch, onMenu, onAnimEnd }: {
  id: string; view: SavedView; active: boolean; entering: boolean; exiting: boolean
  labeled: boolean; renameNode: React.ReactNode | null
  onSwitch: () => void; onMenu: (e: React.MouseEvent) => void; onAnimEnd: () => void
}): React.JSX.Element {
  const { setNodeRef, style, handle, isDragging } = useDragItem(id)
  return (
    <button ref={setNodeRef} {...handle}
      style={{ ...style, ...strokeStyle(view) }}                 // strokeStyle uses cellRing(key) — the grey-cell fix
      className={cx(segment, active && segmentActive, entering && segmentEntering, exiting && segmentExiting)}
      onClick={onSwitch} onContextMenu={onMenu} onAnimationEnd={onAnimEnd}>
      <Icon name={iconNameOr(view.icon, 'table')} />
      {labeled && (renameNode ?? <span>{view.name}</span>)}
    </button>
  )
}

// Per-item presence — the manual ghost pattern (no shared primitive subsumes it; matches WindowTabStrip).
function usePillPresence(views: SavedView[]): {
  entering: Set<string>; exiting: string | null
  beginExit: (id: string) => void; onAnimEnd: (id: string, commitDelete: () => void) => void
} { /* diff prev/next id sets → entering; beginExit sets exiting; onAnimEnd commits the delete AFTER the exit anim */ }


// EmbedTitle — a local component in SurfacePM/ViewTile.tsx.
// The contentEditable title. Stays apart from PageHeader (Settled #12).

function EmbedTitle({ title, level, editable, onCommit, onContextMenu }: {
  title: string; level: number; editable: boolean
  onCommit: (next: string) => void; onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element { /* editing state + caret-placement effect + Enter/Escape/blur commit — unchanged */ }
```

### 4. Verification criteria

**Work shape:** refactor (behavior-preserving) + one carried fix already landed (`cellRing` in `strokeStyle`). The bar is *proof of preservation by unchanged counts*, not assertion.

**Acceptance (one falsifiable statement):** a dashboard holding a view tile with two-plus saved views behaves identically before and after — switch, add, rename, re-icon, recolor, reorder, delete; locked refuses config and accepts state; the slide and pill enter/exit animate the same; the title edits and commits; all three context menus fire — with `ViewTile.tsx` reshaped into a thin orchestrator over local `EmbedTitle` / `ViewSwitcher` / `ViewPill` components (no new files), and `TileSurface`'s mount site untouched.

**Carried baseline (this refactor may not move these):**
- `npm run typecheck` 0 · `npx biome check` clean · `npx vitest run` **3675** · `node ../.claude/scripts/check-atlas.mjs` 15/15. Read exit codes directly, never piped.
- The lock-gate three-way negative-control test (`ViewTileScope.test.tsx`) stays green unchanged — the gate is not touched.
- `TileSurface.tsx`'s `<ViewTile … />` mount compiles with no prop change (the contract `{ entry, mutateEntry, onActivate }` is identical).

**Removal/consolidation proof:**
- `grep -rn "coerceConfig" src/renderer/SurfacePM` → 0 after (control token: `coerceEmbeddedView` present) — the hand-rolled shape check is gone, replaced by `savedView.parse`.
- No second copy of schema resolution: `findCollectionForSet(...).properties` in ViewTile is replaced by `resolveContainerSchema`; grep confirms the inline resolve is gone.
- No new files or exports: `ViewTile` stays the only file `TileSurface` imports, and `EmbedTitle` / `ViewSwitcher` / `ViewPill` stay local to it.

**Live behavior checklist (run once against the built app):** the acceptance actions above, plus: a grey-cell view shows its `GREY_OUTLINES` stroke (the fix), and a view assigned a chroma color shows its solid tint.

**Must-not-violate (the reviewer attacks these):**
- **No presentation change** — the switcher stays a horizontal pill run. Any move to `MenuItem` rows is a redesign, out of scope (§5).
- Settled #12 (`EmbedTitle` apart from `PageHeader`) and Settled #19 (data model keeps `block` names — `ViewBlockEntry`, `EmbeddedView`, `mutateEntry` payload unchanged).
- The light drag stack (`Interactions/drag`) — do not drift toward `Frames/frameDnd`.

### 5. Settled (Nathan's calls)

- **Presentation stays** — the switcher is a horizontal pill run; no move to the `MenuItem` row vocabulary.
- **One file** — `EmbedTitle` and `ViewSwitcher` are local components inside `ViewTile.tsx`; no companion file, no new exports.
