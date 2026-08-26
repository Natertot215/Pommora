import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  GhostSuppress,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@renderer/Views/useGhostAnchor'
import { Icon, type IconName, entityIcon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { contextDirRel } from '@shared/nexusPaths'
import { MenuItem, titleInput } from '@renderer/DesignSystem/Components/Menu'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import type {
  CollectionNode,
  ContextGroup,
  FolderPlacement,
  NexusTree,
  PageNode,
  SelectionState,
  SetNode,
  SidebarMode,
  SpaceNode,
} from '@shared/types'
import { DEFAULT_NEW_NAME, type MutableKind, type MutateRequest } from '@shared/mutate'
import { createSpaceLabel } from '@shared/contexts'
import { SidebarDnd, useSidebarDrag } from './sidebarDnd'
import { buildIndex } from './sidebarDndModel'
import { registerDiscloseTarget } from '@renderer/DesignSystem/Interactions/dragDisclose'
import { AgendaMode } from './AgendaMode'
import { loadOpen, saveOpen } from './disclosureState'
import { useSession } from '../store'
import { pageMoveContext } from '../pageMenuActions'
import { contextTargetToSelect, isOpenInTabs } from '../Tabs/tabsModel'
import { RenamableTitle } from '../Components/RenamableTitle'
import { IconPicker } from '@renderer/Settings/IconPicker'
import {
  dropOutline,
  dropOutlineOpen,
  dropOutlineSpacer,
} from '@renderer/DesignSystem/Elements/DropOutline/dropOutline.css'

/** Every PathNode carries kind/id/path/title; code-keyed saved rows don't, so they never wire
 *  this. Tab membership rides along so the menu's open item reads stateful. */
function showContextFor(node: {
  kind: MutableKind
  id: string
  path: string
  title: string
}): Promise<void> {
  const { tabs, pinned, tree } = useSession.getState()
  const alreadyOpen = isOpenInTabs(tabs, pinned, contextTargetToSelect(node))
  // Resolves on the menu's dismissal — callers holding the ghost down ride the promise.
  return window.nexus.contextMenu({
    kind: node.kind,
    id: node.id,
    path: node.path,
    title: node.title,
    alreadyOpen,
    host: 'sidebar',
    ...(node.kind === 'page' ? pageMoveContext(tree, node.path) : {}),
  })
}

function ctxHandler(cb?: () => void): ((e: React.MouseEvent) => void) | undefined {
  return cb
    ? (e) => {
        e.preventDefault()
        cb()
      }
    : undefined
}

/** Addresses a row for inline rename — its path + kind, handed to the mutate op on commit. */
type RenameTarget = { path: string; kind: MutableKind }

function RowTitle({
  path,
  kind,
  title,
}: {
  path: string
  kind: MutableKind
  title: string
}): React.JSX.Element {
  return (
    <RenamableTitle
      path={path}
      kind={kind}
      title={title}
      className={cx(titleInput, 'row-title-input')}
      host="sidebar"
    />
  )
}

function isCollectionSelected(sel: SelectionState, id: string): boolean {
  return sel.kind === 'collection' && sel.id === id
}

function isSetSelected(sel: SelectionState, id: string): boolean {
  return sel.kind === 'set' && sel.id === id
}

function isPageSelected(sel: SelectionState, id: string): boolean {
  return sel.kind === 'page' && sel.id === id
}

function Leaf({
  icon,
  title,
  depth,
  selected = false,
  chevronSpace = true,
  onSelect,
  onContextMenu,
  rename,
}: {
  icon: string
  title: string
  depth: number
  selected?: boolean
  // Reserve the disclosure-chevron column so the icon lines up under expandable
  // rows. Top-level shortcuts (the Saved strip) opt out and sit flush.
  chevronSpace?: boolean
  /** Receives the click (MenuItem passes it through) — page rows read ⌘ for the bypass. */
  onSelect?: (e: React.MouseEvent) => void
  onContextMenu?: () => void
  rename?: RenameTarget
}): React.JSX.Element {
  // The row icon rides INSIDE the title's scroll box (not the fixed leading slot), so it scrolls
  // as one unit with the title.
  return (
    <MenuItem
      className="row"
      selected={selected}
      indent={depth}
      onClick={onSelect}
      onContextMenu={ctxHandler(onContextMenu)}
      leading={
        chevronSpace ? <span className={dropOutlineSpacer} data-drop-outline-spacer /> : null
      }
    >
      <Icon name={icon} size="title3" className="row-icon" />
      {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
    </MenuItem>
  )
}

// Its rect feeds the insertion-line hit-testing, so it must wrap ONLY the row itself — never a subtree.
function DragRow({
  id,
  springOpen,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  id: string
  /** A collapsed container registers as a spring-open target — a drag dwelling over it expands it. */
  springOpen?: { collapsed: boolean; onExpand: () => void }
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const drag = useSidebarDrag(id)
  const el = useRef<HTMLDivElement | null>(null)
  const expandRef = useRef(springOpen?.onExpand)
  expandRef.current = springOpen?.onExpand
  const collapsed = springOpen?.collapsed ?? false
  useEffect(() => {
    if (!collapsed || !el.current) return
    return registerDiscloseTarget(el.current, () => expandRef.current?.())
  }, [collapsed])
  return (
    <div
      ref={(node) => {
        el.current = node
        drag.ref(node)
      }}
      className={`tree-item${drag.isDragging ? ' dragging' : ''}`}
      data-disclose={collapsed ? '' : undefined}
      {...drag.handle}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  )
}

function Disclosure({
  icon,
  openIcon,
  title,
  depth,
  defaultOpen = true,
  persistKey,
  selected = false,
  onSelect,
  onContextMenu,
  rename,
  dragId,
  onBodyContextMenu,
  children,
}: {
  icon: string
  openIcon?: IconName
  title: string
  depth: number
  defaultOpen?: boolean
  // Stable identity for persisting open/collapse across sessions (entity id, or a `context:*` key
  // for the structural Context groups). Omitted → ephemeral (resets to `defaultOpen` each mount).
  persistKey?: string
  selected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  rename?: RenameTarget
  // Omitted for structural disclosures (the Context groups) — they aren't entities, so never
  // draggable or drop targets.
  dragId?: string
  /** Right-click on the body's empty space (a row's own menu wins — it preventDefaults first). */
  onBodyContextMenu?: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(() =>
    persistKey ? loadOpen(window.localStorage, persistKey, defaultOpen) : defaultOpen,
  )
  const setAndSave = (next: boolean): void => {
    setOpen(next)
    if (persistKey) saveOpen(window.localStorage, persistKey, next)
  }
  // A click that settles an inline rename (blur-commit) must not also toggle the disclosure —
  // renamingPath clears before the click lands, so state is captured at pointerdown instead.
  const settleClick = useRef(false)
  const onHeaderPointerDown = rename
    ? (): void => {
        settleClick.current = useSession.getState().renamingPath === rename.path
      }
    : undefined
  const toggle = (): void => {
    if (settleClick.current) {
      settleClick.current = false
      return
    }
    setAndSave(!open)
  }
  // A child entering rename forces this (possibly collapsed) ancestor open, so a fresh entity
  // never lands invisible.
  const renamingChild = useSession((s) =>
    rename ? s.renamingPath?.startsWith(`${rename.path}/`) === true : false,
  )
  useEffect(() => {
    if (renamingChild && !open) setAndSave(true)
  }, [renamingChild, open])
  // Clicking the icon/title opens the view; the rest of the row toggles. Rows with no onSelect
  // have no select zone, so a click anywhere toggles.
  const openView = onSelect
    ? (e: React.MouseEvent): void => {
        e.stopPropagation()
        onSelect()
      }
    : undefined
  const header = (
    <MenuItem
      className="row"
      selected={selected}
      indent={depth}
      onClick={toggle}
      onPointerDown={onHeaderPointerDown}
      onContextMenu={ctxHandler(onContextMenu)}
      leading={
        <Icon
          name="chevron-right"
          size="control"
          className={cx(dropOutline, open && dropOutlineOpen)}
          data-drop-outline
        />
      }
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the surrounding row is the control; this narrows its hit area */}
      <span onClick={openView}>
        <Icon name={open && openIcon ? openIcon : icon} size="title3" className="row-icon" />
        {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
      </span>
    </MenuItem>
  )
  return (
    <>
      {dragId ? (
        <DragRow id={dragId} springOpen={{ collapsed: !open, onExpand: () => setAndSave(true) }}>
          {header}
        </DragRow>
      ) : (
        header
      )}
      <Reveal open={open} fill>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div
          className="children"
          onContextMenu={
            onBodyContextMenu
              ? (e) => {
                  if (e.defaultPrevented) return
                  e.preventDefault()
                  onBodyContextMenu()
                }
              : undefined
          }
        >
          {children}
        </div>
      </Reveal>
    </>
  )
}

function PageRow({
  page,
  depth,
  selection,
  onSelectPage,
}: {
  page: PageNode
  depth: number
  selection: SelectionState
  onSelectPage: (page: PageNode, e?: React.MouseEvent) => void
}): React.JSX.Element {
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const ghost = useContext(SidebarGhost)
  const api = useContext(SidebarGhostApi)
  const holdGhost = useContext(GhostSuppress)
  // Edit Icon arrives from the native menu as a path; the row that owns it opens the picker
  // against its own glyph, so the surface the gesture happened on is the one that answers.
  const iconPath = useSession((s) => s.iconPath)
  const endIcon = useSession((s) => s.endIcon)
  const mutate = useSession((s) => s.mutate)
  const rowRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <DragRow
        id={page.id}
        onPointerEnter={api ? () => api.onHover(page.id, true) : undefined}
        onPointerLeave={api ? () => api.onHover(page.id, false) : undefined}
      >
        <div ref={rowRef}>
          <Leaf
            icon={entityIcon('page', page.icon, defaultIcons)}
            title={page.title}
            depth={depth}
            selected={isPageSelected(selection, page.id)}
            onSelect={(e) => onSelectPage(page, e)}
            onContextMenu={() => void holdGhost(() => showContextFor(page))}
            rename={{ path: page.path, kind: page.kind }}
          />
        </div>
      </DragRow>
      <IconPicker
        open={iconPath === page.path}
        onClose={endIcon}
        triggerRef={rowRef}
        value={page.icon}
        onSelect={(icon) => void mutate({ op: 'setIcon', path: page.path, kind: 'page', icon })}
      />
      {ghost.anchorId === page.id && <GhostLeaf depth={depth} />}
    </>
  )
}

// ── TUNABLE ── the sidebar ghost's pacing: the sidebar is a transit surface the pointer crosses
// constantly, so its dwell runs meaningfully longer than the views'; the ghost sits flush below
// its anchor row, so the leave can close immediately.
const SIDEBAR_GHOST_DWELL_MS = 2500 // KNOB
const SIDEBAR_GHOST_GRACE_MS = 0 // KNOB

const NO_GHOST: { anchorId: string | null; closing: boolean } = { anchorId: null, closing: false }

/** The shown ghost anchor + its exit state, by context — the rows sit levels down a recursive
 *  render, and each reads the value to know whether IT hosts the ghost (so ghost transitions
 *  re-render the rows; the API context just keeps the handlers out of that churn). */
const SidebarGhost = createContext(NO_GHOST)
const SidebarGhostApi = createContext<{
  onHover: (id: string, entering: boolean) => void
  onGhostEnter: () => void
  onGhostLeave: () => void
  create: () => void
  closed: () => void
} | null>(null)

/** The ghost "New Page" row — the anchor row's own chrome at the inactive dim, entering and
 *  leaving on its own Reveal (the sidebar has no per-row motion to conflict with). Never a drag
 *  member, never disclose-registered. */
function GhostLeaf({ depth }: { depth: number }): React.JSX.Element {
  const api = useContext(SidebarGhostApi)
  const closing = useContext(SidebarGhost).closing
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  return (
    <Reveal open={!closing} enterOnMount onCollapsed={api?.closed}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a hover-born affordance wearing the row's own chrome — keyboard creation lives in the menus */}
      <div
        data-ghost-root
        className="ghost-leaf ghost-worn"
        onPointerEnter={api?.onGhostEnter}
        onPointerLeave={api?.onGhostLeave}
        onClick={api?.create}
      >
        <MenuItem
          className="row"
          indent={depth}
          leading={<span className={dropOutlineSpacer} data-drop-outline-spacer />}
        >
          <Icon
            name={entityIcon('page', undefined, defaultIcons)}
            size="title3"
            className="row-icon"
          />
          New Page
        </MenuItem>
      </div>
    </Reveal>
  )
}

function ContainerRow({
  node,
  depth,
  selected,
  onSelect,
  children,
}: {
  node: { id: string; icon?: string; title: string; path: string; kind: MutableKind }
  depth: number
  selected?: boolean
  onSelect?: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const icon = entityIcon(
    node.kind === 'collection' ? 'collection' : 'set',
    node.icon,
    defaultIcons,
  )
  const openIcon: IconName | undefined = icon === 'folder-closed' ? 'folder-open' : undefined
  return (
    <Disclosure
      dragId={node.id}
      persistKey={node.id}
      icon={icon}
      openIcon={openIcon}
      title={node.title}
      depth={depth}
      defaultOpen={false}
      selected={selected}
      onSelect={onSelect}
      onContextMenu={() => showContextFor(node)}
      rename={{ path: node.path, kind: node.kind }}
    >
      {children}
    </Disclosure>
  )
}

// A full folder↔page interleave is the eventual model; this top/bottom flag is the interim —
// folders stay a block, just relocatable.
function placeChildren(
  folders: React.JSX.Element[],
  pages: React.JSX.Element[],
  placement: FolderPlacement,
): React.JSX.Element[] {
  return placement === 'bottom' ? [...pages, ...folders] : [...folders, ...pages]
}

// Only depth-1 Sets (selectable) open a view; deeper Sub-Sets are expand-only organizing folders.
function SetRow({
  set,
  depth,
  selectable,
  selection,
  onSelectSet,
  onSelectPage,
}: {
  set: SetNode
  depth: number
  selectable: boolean
  selection: SelectionState
  onSelectSet: (set: SetNode) => void
  onSelectPage: (page: PageNode) => void
}): React.JSX.Element {
  const subSetPlacement = useSession((s) => s.personalization.subSetPlacement ?? 'top')
  return (
    <ContainerRow
      node={set}
      depth={depth}
      selected={selectable && isSetSelected(selection, set.id)}
      onSelect={selectable ? () => onSelectSet(set) : undefined}
    >
      {placeChildren(
        (set.sets ?? []).map((s) => (
          <SetRow
            key={s.id}
            set={s}
            depth={depth + 1}
            selectable={false}
            selection={selection}
            onSelectSet={onSelectSet}
            onSelectPage={onSelectPage}
          />
        )),
        set.pages.map((p) => (
          <PageRow
            key={p.id}
            page={p}
            depth={depth + 1}
            selection={selection}
            onSelectPage={onSelectPage}
          />
        )),
        subSetPlacement,
      )}
    </ContainerRow>
  )
}

function CollectionRow({
  col,
  depth,
  selection,
  onSelectCollection,
  onSelectSet,
  onSelectPage,
}: {
  col: CollectionNode
  depth: number
  selection: SelectionState
  onSelectCollection: (col: CollectionNode) => void
  onSelectSet: (set: SetNode) => void
  onSelectPage: (page: PageNode) => void
}): React.JSX.Element {
  const setPlacement = useSession((s) => s.personalization.setPlacement ?? 'top')
  return (
    <ContainerRow
      node={col}
      depth={depth}
      selected={isCollectionSelected(selection, col.id)}
      onSelect={() => onSelectCollection(col)}
    >
      {placeChildren(
        col.sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            depth={depth + 1}
            selectable
            selection={selection}
            onSelectSet={onSelectSet}
            onSelectPage={onSelectPage}
          />
        )),
        col.pages.map((p) => (
          <PageRow
            key={p.id}
            page={p}
            depth={depth + 1}
            selection={selection}
            onSelectPage={onSelectPage}
          />
        )),
        setPlacement,
      )}
    </ContainerRow>
  )
}

function SpaceRow({ node }: { node: SpaceNode }): React.JSX.Element {
  const select = useSession((s) => s.select)
  const selected = useSession((s) => s.selection.kind === 'space' && s.selection.id === node.id)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  return (
    <DragRow id={node.id}>
      <Leaf
        icon={entityIcon('space', node.icon, defaultIcons)}
        title={node.title}
        depth={1}
        selected={selected}
        onSelect={() => void select({ kind: 'space', id: node.id })}
        onContextMenu={() => showContextFor({ ...node, kind: 'space' })}
        rename={{ path: node.path, kind: 'space' }}
      />
    </DragRow>
  )
}

function ContextGroupDisclosure({ group }: { group: ContextGroup }): React.JSX.Element {
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const path = contextDirRel(group.def.title)
  return (
    <Disclosure
      icon={entityIcon('context', group.def.icon, defaultIcons)}
      title={group.def.title}
      depth={0}
      defaultOpen
      persistKey={`context:${group.def.id}`}
      dragId={group.def.id}
      onContextMenu={() =>
        // No id → no Open item: a group has no destination view (Spaces do).
        void window.nexus.contextMenu({
          kind: 'context',
          path,
          title: group.def.title,
          host: 'sidebar',
        })
      }
      rename={{ path, kind: 'context' }}
      onBodyContextMenu={() => {
        const label = createSpaceLabel(group.def)
        void useSession
          .getState()
          .createFromMenu(
            [{ label, req: { op: 'createSpace', contextId: group.def.id, name: label } }],
            'sidebar',
          )
      }}
    >
      {group.spaces.map((s) => (
        <SpaceRow key={s.id} node={s} />
      ))}
    </Disclosure>
  )
}

export function Sidebar({ tree }: { tree: NexusTree }): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const select = useSession((s) => s.select)
  const mutate = useSession((s) => s.mutate)
  const setPlacement = useSession((s) => s.personalization.setPlacement ?? 'top')
  const subSetPlacement = useSession((s) => s.personalization.subSetPlacement ?? 'top')
  const mode: SidebarMode = useSession((s) => s.personalization.sidebarMode ?? 'collections')

  const onSelectCollection = (col: CollectionNode): void => {
    void select({ kind: 'collection', id: col.id })
  }
  const onSelectSet = (set: SetNode): void => {
    void select({ kind: 'set', id: set.id, path: set.path })
  }
  const onSelectPage = (page: PageNode, e?: React.MouseEvent): void => {
    // A page in a page-preview Collection opens the floating preview (resolved by path prefix —
    // the sidebar has no source prop); ⌘-click is the explicit full-page bypass.
    const owner = tree.collections.find((c) => page.path.startsWith(`${c.path}/`))
    if (owner?.openIn === 'page-preview') {
      if (e?.metaKey) void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true })
      else useSession.getState().openPreview({ id: page.id, path: page.path })
      return
    }
    void select({ kind: 'page', id: page.id, path: page.path })
  }

  // A drop resolves to a MutateRequest; the store's one write path applies it (refetch on ok).
  const onCommit = (req: MutateRequest): void => void mutate(req)

  const newContextMenu = (): void => {
    void useSession
      .getState()
      .createFromMenu(
        [{ label: 'New Context', req: { op: 'createContextGroup', name: 'New Context' } }],
        'sidebar',
      )
  }
  const newCollectionMenu = (): void => {
    const label = 'New Collection'
    void useSession.getState().createFromMenu(
      [
        {
          label,
          req: {
            op: 'createContainer',
            parentPath: '',
            kind: 'collection',
            name: DEFAULT_NEW_NAME,
          },
        },
      ],
      'sidebar',
    )
  }

  const navRef = useRef<HTMLElement>(null)

  // One index serves both layers — during the mode cross-fade both are mounted, and each building
  // its own full-tree index would double the work per tree change.
  const dndIndex = useMemo(() => buildIndex(tree), [tree])

  // The hover ghost on the shared mechanism — collections mode only (the other modes have no
  // page rows, and the cross-fade unmounts without a transition, which would strand a closing
  // ghost). A naming session suppresses the dwell, re-read at fire time.
  const ghostApi = useGhostAnchor({
    dwellMs: SIDEBAR_GHOST_DWELL_MS,
    graceMs: SIDEBAR_GHOST_GRACE_MS,
    suppressed: () => useSession.getState().renamingPath !== null,
  })
  const dndIndexRef = useRef(dndIndex)
  dndIndexRef.current = dndIndex
  // The hook's handlers are identity-stable, so they pass straight into deps and build the
  // context value once — only `create` needs a wrapper of its own, to read the live index at
  // click time.
  const { onHover, onGhostEnter, onGhostLeave, closed, take, clear: clearGhost } = ghostApi
  useEffect(() => {
    if (mode !== 'collections') clearGhost()
  }, [mode, clearGhost])
  useClearStrandedGhost(ghostApi, dndIndex.byId)
  const [sidebarGhostApi] = useState(() => ({
    onHover,
    onGhostEnter,
    onGhostLeave,
    closed,
    create: (): void => {
      const anchorId = take()
      const entry = anchorId ? dndIndexRef.current.byId.get(anchorId) : undefined
      if (entry) void useSession.getState().newPageAdjacent(entry.path, 'below', 'sidebar')
    },
  }))
  const ghostValue = ghostApi.ghost ?? NO_GHOST

  const dndLayer = (section: React.ReactNode): React.JSX.Element => (
    <SidebarDnd
      index={dndIndex}
      onCommit={onCommit}
      setPlacement={setPlacement}
      subSetPlacement={subSetPlacement}
    >
      <div className="section">{section}</div>
    </SidebarDnd>
  )

  const contextsLayer = dndLayer(
    (tree.contexts ?? []).map((g) => <ContextGroupDisclosure key={g.def.id} group={g} />),
  )

  const collectionsLayer = dndLayer(
    (tree.collections ?? []).map((c) => (
      <CollectionRow
        key={c.id}
        col={c}
        depth={0}
        selection={selection}
        onSelectCollection={onSelectCollection}
        onSelectSet={onSelectSet}
        onSelectPage={onSelectPage}
      />
    )),
  )

  // Fires only on the bare layer surface (e.target === e.currentTarget), so a row's own context
  // menu still wins.
  const modeCtx =
    (cb?: () => void) =>
    (e: React.MouseEvent): void => {
      if (!cb || e.target !== e.currentTarget) return
      e.preventDefault()
      cb()
    }

  const agendaLayer = <AgendaMode />

  const layerFor = (m: SidebarMode): React.ReactNode =>
    m === 'contexts' ? contextsLayer : m === 'agenda' ? agendaLayer : collectionsLayer
  const activeNode = layerFor(mode)
  const onCreate =
    mode === 'contexts' ? newContextMenu : mode === 'agenda' ? undefined : newCollectionMenu

  // Hold the outgoing mode as a clipped exit overlay while the incoming sweeps over it
  // (Sidebar.css). The exit layer counter-translates by the captured scroll so its visible window
  // holds still while overtaken. The epoch keys it so a mid-transition switch remounts (restarting
  // the sweep) instead of swapping content under a half-run animation.
  const [exit, setExit] = useState<{ mode: SidebarMode; scroll: number; epoch: number } | null>(
    null,
  )
  const prevMode = useRef(mode)
  // Must land BEFORE the switch's first paint (useLayoutEffect), or one frame of the new mode
  // flashes un-animated at the old scroll position.
  useLayoutEffect(() => {
    if (prevMode.current === mode) return
    const from = prevMode.current
    prevMode.current = mode
    const scroll = navRef.current?.scrollTop ?? 0
    setExit((prev) => ({ mode: from, scroll, epoch: (prev?.epoch ?? 0) + 1 }))
    if (navRef.current) navRef.current.scrollTop = 0
  }, [mode])

  return (
    <SidebarGhost.Provider value={ghostValue}>
      <SidebarGhostApi.Provider value={sidebarGhostApi}>
        <GhostSuppress.Provider value={ghostApi.suppressWrap}>
          <nav ref={navRef} className="sidebar over-scroll">
            <div className="sidebar-mode-stage">
              {exit && (
                <div
                  key={exit.epoch}
                  className="sidebar-mode mode-exit"
                  style={{ transform: `translateY(${-exit.scroll}px)` }}
                  onAnimationEnd={(e) => e.target === e.currentTarget && setExit(null)}
                >
                  {layerFor(exit.mode)}
                </div>
              )}
              <div key={mode} className={cx('sidebar-mode', exit !== null && 'mode-enter')}>
                {/* Permanent (class-only toggle) — swapping the element shape at animation end would
              remount the whole mode tree. */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
                <div
                  className={cx('mode-body', exit !== null && 'mode-enter-slide')}
                  onContextMenu={modeCtx(onCreate)}
                >
                  {activeNode}
                </div>
              </div>
            </div>
          </nav>
        </GhostSuppress.Provider>
      </SidebarGhostApi.Provider>
    </SidebarGhost.Provider>
  )
}
