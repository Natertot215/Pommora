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
} from '@pommora/uix/Interactions/ghostCreate'
import { isCmd } from '@pommora/uix/Interactions/chords'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { cx } from '@pommora/uix/Utilities/cx'
import { contextDirRel } from '@pommora/core/Paths/nexusPaths'
import { MenuItem } from '@pommora/uix/Menus'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import type {
  CollectionNode,
  ContextGroup,
  NexusTree,
  PageNode,
  SetNode,
  SpaceNode,
} from '@pommora/core/Nexus/tree'
import type { FolderPlacement, SidebarMode } from '@pommora/core/Settings/personalization'
import type { SelectionState } from '@pommora/core/Navigation/navRef'
import {
  DEFAULT_NEW_NAME,
  type MutableKind,
  type MutateRequest,
} from '@pommora/core/Nexus/mutateRequest'
import { createSpaceLabel } from '@pommora/core/Contexts/contexts'
import { SidebarDnd } from './sidebarDnd'
import { buildIndex } from './sidebarDndModel'
import { AgendaMode } from './AgendaMode'
import { useSession } from '../../Session/store'
import { hoverGlance, leaveGlance } from '../Glance/glanceLink'
import { glanceShown } from '../Glance/glanceAction'
import { pageMoveContext } from '../Menus/pageMenuActions'
import { contextTargetToSelect, isOpenInTabs } from '../../Navigation/tabsModel'
import { IconChoice } from '../../Assets/IconChoice'
import { dropOutlineSpacer } from '@pommora/uix/Menus/listed-outline.css'
import { showEntityMenu } from '../Menus/entityMenuActions'
import { DragRow, Leaf } from './sidebarRows'
import { Disclosure } from './Disclosure'

function showContextFor(node: {
  kind: MutableKind
  id: string
  path: string
  title: string
  disclosureLocked?: boolean
}): Promise<void> {
  const { tabs, pinned, tree } = useSession.getState()
  const alreadyOpen = isOpenInTabs(tabs, pinned, contextTargetToSelect(node))
  return showEntityMenu({
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

function isCollectionSelected(sel: SelectionState, id: string): boolean {
  return sel.kind === 'collection' && sel.id === id
}

function isSetSelected(sel: SelectionState, id: string): boolean {
  return sel.kind === 'set' && sel.id === id
}

function isPageSelected(sel: SelectionState, id: string): boolean {
  return sel.kind === 'page' && sel.id === id
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
        onPointerEnter={(e) => {
          api?.onHover(page.id, true)
          hoverGlance(
            { kind: 'page', id: page.id, path: page.path },
            e.currentTarget,
            'location',
            e.shiftKey,
          )
        }}
        onPointerLeave={() => {
          api?.onHover(page.id, false)
          leaveGlance()
        }}
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
      <IconChoice
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
        void showEntityMenu({ kind: 'context', path, title: group.def.title, host: 'sidebar' })
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
      if (e && isCmd(e))
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true })
      else useSession.getState().openWindow({ id: page.id, path: page.path })
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
    suppressed: () => useSession.getState().renamingPath !== null || glanceShown(),
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
    tree.contexts.map((g) => <ContextGroupDisclosure key={g.def.id} group={g} />),
  )

  const collectionsLayer = dndLayer(
    tree.collections.map((c) => (
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
  // useLayoutEffect: landing after the switch's first paint flashes one frame of the new mode at the old scroll position.
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
