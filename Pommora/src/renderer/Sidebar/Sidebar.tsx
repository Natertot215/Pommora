import {
  Children,
  createContext,
  isValidElement,
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
} from '@renderer/DesignSystem/Interactions/ghostAnchor'
import { Icon, type IconName, entityIcon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { contextDirRel } from '@shared/nexusPaths'
import { MenuItem, titleInput } from '@renderer/DesignSystem/Menus'
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
import { pageMoveContext } from '@renderer/Actions/pageMenuActions'
import { contextTargetToSelect, isOpenInTabs } from '../Tabs/tabsModel'
import { RenamableTitle } from '@renderer/Actions/RenamableTitle'
import { IconPicker } from '@renderer/Settings/IconPicker'
import {
  dropOutline,
  dropOutlineOpen,
  dropOutlineSpacer,
} from '@renderer/DesignSystem/Menus/listed-outline.css'

function showContextFor(node: {
  kind: MutableKind
  id: string
  path: string
  title: string
  disclosureLocked?: boolean
}): Promise<void> {
  const { tabs, pinned, tree } = useSession.getState()
  const alreadyOpen = isOpenInTabs(tabs, pinned, contextTargetToSelect(node))
  return window.nexus.contextMenu({
    kind: node.kind,
    id: node.id,
    path: node.path,
    title: node.title,
    alreadyOpen,
    disclosureLocked: node.disclosureLocked,
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
  chevronSpace?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onContextMenu?: () => void
  rename?: RenameTarget
}): React.JSX.Element {
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
      <Icon name={icon} size="headline" className="row-icon" />
      {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
    </MenuItem>
  )
}

function DragRow({
  id,
  springOpen,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  id: string
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
  locked = false,
  onSetLock,
  selfPath,
  directChildren,
  children,
}: {
  icon: string
  openIcon?: IconName
  title: string
  depth: number
  defaultOpen?: boolean
  persistKey?: string
  selected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  rename?: RenameTarget
  dragId?: string
  onBodyContextMenu?: () => void
  locked?: boolean
  onSetLock?: (locked: boolean) => void
  selfPath?: string
  directChildren?: { id: string; path: string }[]
  children: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(() =>
    persistKey ? loadOpen(window.localStorage, persistKey, defaultOpen) : defaultOpen,
  )
  const setAndSave = (next: boolean): void => {
    setOpen(next)
    if (persistKey) saveOpen(window.localStorage, persistKey, next)
  }
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
    // Locked + open still folds normally — the lock only engages on the next fold, not this one.
    if (locked && !open) {
      onSelect?.()
      return
    }
    setAndSave(!open)
  }
  // Lingers the open-lock glyph after an unlock so a mistaken toggle can be undone before the pointer leaves.
  const [justUnlocked, setJustUnlocked] = useState(false)
  const hovered = useRef(false)
  const prevLocked = useRef(locked)
  useEffect(() => {
    if (prevLocked.current && !locked && hovered.current) setJustUnlocked(true)
    if (locked) setJustUnlocked(false)
    prevLocked.current = locked
  }, [locked])
  const renamingChild = useSession((s) =>
    rename ? s.renamingPath?.startsWith(`${rename.path}/`) === true : false,
  )
  useEffect(() => {
    if (renamingChild && !open && !locked) setAndSave(true)
  }, [renamingChild, open, locked])

  // Peek reveals a locked folder's newcomer without unlocking it; naming holds it open, a drop lingers.
  const [peekId, setPeekId] = useState<string | null>(null)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clearPeekTimer = (): void => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = undefined
  }
  const stopPeek = (): void => {
    clearPeekTimer()
    setPeekId(null)
  }
  const lingerPeek = (id: string): void => {
    clearPeekTimer()
    setPeekId(id)
    peekTimer.current = setTimeout(stopPeek, PEEK_LINGER_MS)
  }
  const renamingPath = useSession((s) => s.renamingPath)
  const namingChildId =
    locked && renamingPath
      ? (directChildren?.find((c) => c.path === renamingPath)?.id ?? null)
      : null
  const prevNaming = useRef<string | null>(null)
  useEffect(() => {
    if (namingChildId) {
      clearPeekTimer()
      setPeekId(namingChildId)
    } else if (prevNaming.current) lingerPeek(prevNaming.current)
    prevNaming.current = namingChildId
  }, [namingChildId])
  const peekNonce = useSession((s) => s.peekSignal?.nonce)
  useEffect(() => {
    const sig = useSession.getState().peekSignal
    if (locked && sig && sig.parentPath === selfPath) lingerPeek(sig.childId)
  }, [peekNonce])
  useEffect(() => {
    if (!locked) stopPeek()
  }, [locked])
  useEffect(() => clearPeekTimer, [])
  const peekOnly = locked && !open && peekId !== null
  const headerEl = useRef<HTMLDivElement | null>(null)
  const childrenEl = useRef<HTMLDivElement | null>(null)
  // A move into the peeked child isn't a dismiss — only leaving both header and children collapses it.
  const dismissOnLeave = (e: React.MouseEvent): void => {
    if (!peekTimer.current) return
    const to = e.relatedTarget as Node | null
    if (headerEl.current?.contains(to) || childrenEl.current?.contains(to)) return
    stopPeek()
  }
  const openView = onSelect
    ? (e: React.MouseEvent): void => {
        e.stopPropagation()
        onSelect()
      }
    : undefined
  const lockToggle =
    locked || justUnlocked ? (
      <button
        type="button"
        className={cx('row-lock', justUnlocked && 'row-lock-persist')}
        aria-label={locked ? 'Unlock folder' : 'Lock folder'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSetLock?.(!locked)
        }}
      >
        <Icon name={locked ? 'locked' : 'lock-open'} size="control" />
      </button>
    ) : undefined
  const header = (
    <MenuItem
      ref={headerEl}
      className="row"
      selected={selected}
      indent={depth}
      onClick={toggle}
      onPointerDown={onHeaderPointerDown}
      onContextMenu={ctxHandler(onContextMenu)}
      onMouseEnter={() => {
        hovered.current = true
      }}
      onMouseLeave={(e) => {
        hovered.current = false
        setJustUnlocked(false)
        dismissOnLeave(e)
      }}
      trailing={lockToggle}
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
        <Icon name={open && openIcon ? openIcon : icon} size="headline" className="row-icon" />
        {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
      </span>
    </MenuItem>
  )
  return (
    <>
      {dragId ? (
        <DragRow
          id={dragId}
          springOpen={locked ? undefined : { collapsed: !open, onExpand: () => setAndSave(true) }}
        >
          {header}
        </DragRow>
      ) : (
        header
      )}
      <Reveal open={open || peekOnly} fill>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div
          ref={childrenEl}
          className={cx('children', peekOnly && 'children-peek')}
          onMouseLeave={dismissOnLeave}
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
          {peekOnly && peekId !== null
            ? Children.toArray(children).filter(
                (c) => isValidElement(c) && String(c.key).endsWith(peekId),
              )
            : children}
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

const SIDEBAR_GHOST_DWELL_MS = 2500 // KNOB
const SIDEBAR_GHOST_GRACE_MS = 0 // KNOB
const PEEK_LINGER_MS = 2500 // KNOB

const NO_GHOST: { anchorId: string | null; closing: boolean } = { anchorId: null, closing: false }

const SidebarGhost = createContext(NO_GHOST)
const SidebarGhostApi = createContext<{
  onHover: (id: string, entering: boolean) => void
  onGhostEnter: () => void
  onGhostLeave: () => void
  create: () => void
  closed: () => void
} | null>(null)

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
            size="headline"
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
  directChildren,
  children,
}: {
  node: {
    id: string
    icon?: string
    title: string
    path: string
    kind: MutableKind
    disclosureLocked?: boolean
  }
  depth: number
  selected?: boolean
  onSelect?: () => void
  directChildren: { id: string; path: string }[]
  children: React.ReactNode
}): React.JSX.Element {
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const mutate = useSession((s) => s.mutate)
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
      selfPath={node.path}
      directChildren={directChildren}
      locked={node.disclosureLocked === true}
      onSetLock={(locked) =>
        void mutate({
          op: 'setDisclosureLock',
          path: node.path,
          kind: node.kind as 'collection' | 'set',
          locked,
        })
      }
    >
      {children}
    </Disclosure>
  )
}

function placeChildren(
  folders: React.JSX.Element[],
  pages: React.JSX.Element[],
  placement: FolderPlacement,
): React.JSX.Element[] {
  return placement === 'bottom' ? [...pages, ...folders] : [...folders, ...pages]
}

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
      directChildren={[...(set.sets ?? []), ...set.pages].map((c) => ({ id: c.id, path: c.path }))}
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
      directChildren={[...col.sets, ...col.pages].map((c) => ({ id: c.id, path: c.path }))}
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
    const owner = tree.collections.find((c) => page.path.startsWith(`${c.path}/`))
    if (owner?.openIn === 'page-preview') {
      if (e?.metaKey) void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true })
      else useSession.getState().openPreview({ id: page.id, path: page.path })
      return
    }
    void select({ kind: 'page', id: page.id, path: page.path })
  }

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

  const dndIndex = useMemo(() => buildIndex(tree), [tree])

  const ghostApi = useGhostAnchor({
    dwellMs: SIDEBAR_GHOST_DWELL_MS,
    graceMs: SIDEBAR_GHOST_GRACE_MS,
    suppressed: () => useSession.getState().renamingPath !== null,
  })
  const dndIndexRef = useRef(dndIndex)
  dndIndexRef.current = dndIndex

  const signalPeek = useSession((s) => s.signalPeek)
  const onCommit = (req: MutateRequest): void => {
    // Pulses the landing container so a locked one can peek the newcomer; id resolves via the pre-move path.
    if (req.op === 'movePage' || req.op === 'moveSet') {
      for (const [cid, e] of dndIndexRef.current.byId)
        if (e.path === req.path) {
          signalPeek(req.newParentPath, cid)
          break
        }
    }
    void mutate(req)
  }
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
