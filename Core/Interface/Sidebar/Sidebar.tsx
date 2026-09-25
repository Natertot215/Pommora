import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  memo,
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
import type { IconName } from '@pommora/uix/Symbols'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { cx } from '@pommora/uix/Utilities/cx'
import { contextDirRel } from '@pommora/core/Paths/nexusPaths'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import type {
  CollectionNode,
  ContextGroup,
  NexusTree,
  PageNode,
  SetNode,
  SpaceNode,
} from '@pommora/core/Nexus/tree'
import type { SidebarMode } from '@pommora/core/Settings/personalization'
import {
  type Creator,
  DEFAULT_NEW_NAME,
  type MutableKind,
  type MutateRequest,
} from '@pommora/core/Nexus/mutateRequest'
import { createSpaceLabel } from '@pommora/core/Contexts/contexts'
import { collectionOfPage } from '../../Properties/pageRow'
import { spaceNodeOf } from '../../Nexus/treeIndex'
import { SidebarDnd, useSidebarRowEl } from './sidebarDnd'
import { buildIndex, type Index } from './sidebarDndModel'
import { AgendaMode } from './AgendaMode'
import { sidebarModeOf } from '@pommora/core/Settings/experimental'
import { pageMetaOf, useSession } from '../../Session/store'
import { glanceShown, hoverGlance, leaveGlance } from '../Glance/glanceAction'
import { pageMoveContext } from '../Menus/pageMenuActions'
import { contextTargetToSelect, isOpenInTabs } from '../../Navigation/tabsModel'
import { IconChoice } from '../../Assets/IconChoice'
import { showEntityMenu } from '../Menus/entityMenuActions'
import { DragRow, Leaf } from './sidebarRows'
import { Disclosure } from './Disclosure'
import { popMenu } from '../../Actions/menuActions'
import { createMenuItems, createdRequest } from '../../Actions/createMenu'

async function createFromMenu(item: Creator): Promise<void> {
  const items = [item]
  const action = await popMenu(createMenuItems(items))
  const req = action && createdRequest(items, action)
  if (req) await useSession.getState().createNamed(req, 'sidebar')
}

function showContextFor(
  node: {
    kind: MutableKind
    id: string
    path: string
    title: string
    disclosureLocked?: boolean
  },
  trigger?: HTMLElement | null,
): Promise<void> {
  const { tabs, pinned, tree } = useSession.getState()
  const alreadyOpen = isOpenInTabs(tabs, pinned, contextTargetToSelect(node))
  return showEntityMenu(
    {
      kind: node.kind,
      id: node.id,
      path: node.path,
      title: node.title,
      alreadyOpen,
      disclosureLocked: node.disclosureLocked,
      host: 'sidebar',
      ...(node.kind === 'page' ? pageMoveContext(tree, node.path) : {}),
    },
    trigger ?? undefined,
  )
}

function selectRow(
  node: { kind: MutableKind; id: string; path: string },
  e?: React.MouseEvent,
): void {
  const s = useSession.getState()
  const target = contextTargetToSelect(node)
  if (target.kind === 'page' && collectionOfPage(s.tree, target.path)?.openIn === 'page-preview') {
    if (e && isCmd(e)) void s.select(target, { newTab: true })
    else s.openWindowTab(target)
    return
  }
  void s.select(target)
}

const LeafRow = memo(function LeafRow({
  node,
  depth,
  ghostLabel,
}: {
  node: PageNode | SpaceNode
  depth: number
  ghostLabel: string
}): React.JSX.Element {
  const selected = useSession((s) => s.selection.kind === node.kind && s.selection.id === node.id)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const pageIcon = useSession(pageMetaOf(node.kind === 'page' ? node.id : undefined))?.icon
  const ghost = useContext(SidebarGhost)
  const api = useContext(SidebarGhostApi)
  const holdGhost = useContext(GhostSuppress)
  const rowRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <DragRow
        id={node.id}
        onPointerEnter={(e) => {
          api?.onHover(node.id, true)
          if (node.kind === 'page')
            hoverGlance(
              { kind: 'page', id: node.id, path: node.path },
              e.currentTarget,
              'location',
              e.shiftKey,
            )
        }}
        onPointerLeave={() => {
          api?.onHover(node.id, false)
          if (node.kind === 'page') leaveGlance()
        }}
      >
        <div ref={rowRef}>
          <Leaf
            icon={entityIcon(node.kind, node.kind === 'page' ? pageIcon : node.icon, defaultIcons)}
            title={node.title}
            depth={depth}
            selected={selected}
            onSelect={(e) => selectRow(node, e)}
            onContextMenu={() => void holdGhost(() => showContextFor(node, rowRef.current))}
            rename={{ path: node.path, kind: node.kind }}
          />
        </div>
      </DragRow>
      {ghost.anchorId === node.id && (
        <GhostLeaf depth={depth} kind={node.kind} label={ghostLabel} />
      )}
    </>
  )
})

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

function GhostLeaf({
  depth,
  kind,
  label,
}: {
  depth: number
  kind: 'page' | 'space'
  label: string
}): React.JSX.Element {
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
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <Leaf icon={entityIcon(kind, undefined, defaultIcons)} title={label} depth={depth} />
      </div>
    </Reveal>
  )
}

// An arrow rather than a named function, so the recursion inside renders the memoized row.
const ContainerRow = memo(
  ({
    node,
    depth,
    selectable,
  }: {
    node: CollectionNode | SetNode
    depth: number
    selectable: boolean
  }): React.JSX.Element => {
    const defaultIcons = useSession((s) => s.personalization.defaultIcons)
    const mutate = useSession((s) => s.mutate)
    const placement = useSession(
      (s) =>
        s.personalization[node.kind === 'collection' ? 'setPlacement' : 'subSetPlacement'] ?? 'top',
    )
    const selected = useSession(
      (s) => selectable && s.selection.kind === node.kind && s.selection.id === node.id,
    )
    const sets = node.sets ?? []
    const icon = entityIcon(node.kind, node.icon, defaultIcons)
    const openIcon: IconName | undefined = icon === 'folder-closed' ? 'folder-open' : undefined
    const folders = sets.map((s) => (
      <ContainerRow key={s.id} node={s} depth={depth + 1} selectable={node.kind === 'collection'} />
    ))
    const pages = node.pages.map((p) => (
      <LeafRow key={p.id} node={p} depth={depth + 1} ghostLabel="New Page" />
    ))
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
        onSelect={selectable ? () => selectRow(node) : undefined}
        onContextMenu={() => showContextFor(node)}
        rename={{ path: node.path, kind: node.kind }}
        selfPath={node.path}
        directChildren={[...sets, ...node.pages]}
        locked={node.disclosureLocked === true}
        onSetLock={(locked) =>
          void mutate({ op: 'setDisclosureLock', path: node.path, kind: node.kind, locked })
        }
      >
        {placement === 'bottom' ? [...pages, ...folders] : [...folders, ...pages]}
      </Disclosure>
    )
  },
)

function ContextGroupDisclosure({ group }: { group: ContextGroup }): React.JSX.Element {
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const ghost = useContext(SidebarGhost)
  const api = useContext(SidebarGhostApi)
  const holdGhost = useContext(GhostSuppress)
  const path = contextDirRel(group.def.title)
  const newLabel = createSpaceLabel(group.def)
  return (
    <Disclosure
      icon={entityIcon('context', group.def.icon, defaultIcons)}
      title={group.def.title}
      depth={0}
      defaultOpen
      persistKey={`context:${group.def.id}`}
      dragId={group.def.id}
      onContextMenu={() =>
        void holdGhost(() =>
          showEntityMenu({ kind: 'context', path, title: group.def.title, host: 'sidebar' }),
        )
      }
      onHeaderHover={(entering) => api?.onHover(group.def.id, entering)}
      belowHeader={
        ghost.anchorId === group.def.id && <GhostLeaf depth={1} kind="space" label={newLabel} />
      }
      rename={{ path, kind: 'context' }}
      onBodyContextMenu={() => {
        void createFromMenu({
          label: newLabel,
          req: { op: 'createSpace', contextId: group.def.id, name: newLabel },
        })
      }}
    >
      {group.spaces.map((s) => (
        <LeafRow key={s.id} node={s} depth={1} ghostLabel={newLabel} />
      ))}
    </Disclosure>
  )
}

// The ref keeps the row through the picker's close, after the entry has gone.
function SidebarIconChoice({ tree, index }: { tree: NexusTree; index: Index }): React.JSX.Element {
  const iconPath = useSession((s) => (s.iconHost === 'sidebar' ? s.iconPath : null))
  const endIcon = useSession((s) => s.endIcon)
  const mutate = useSession((s) => s.mutate)
  const rowEl = useSidebarRowEl()
  const trigger = useRef<HTMLElement | null>(null)
  const entry =
    iconPath === null ? undefined : [...index.byId.values()].find((e) => e.path === iconPath)
  if (entry) trigger.current = rowEl(entry.id) ?? null
  const ownIcon = (): string | undefined => {
    switch (entry?.kind) {
      case 'contextGroup':
        return tree.contexts.find((g) => g.def.id === entry.id)?.def.icon
      case 'space':
        return spaceNodeOf(tree, entry.id)?.icon
      case 'page':
        return tree.pageMetadata[entry.id]?.icon
    }
  }
  return (
    <IconChoice
      open={entry !== undefined && trigger.current !== null}
      onClose={endIcon}
      triggerRef={trigger}
      value={ownIcon()}
      onSelect={(icon) => {
        if (entry)
          void mutate({
            op: 'setIcon',
            path: entry.path,
            kind: entry.kind === 'contextGroup' ? 'context' : entry.kind,
            icon,
          })
      }}
    />
  )
}

export function Sidebar({ tree }: { tree: NexusTree }): React.JSX.Element {
  const mutate = useSession((s) => s.mutate)
  const setPlacement = useSession((s) => s.personalization.setPlacement ?? 'top')
  const subSetPlacement = useSession((s) => s.personalization.subSetPlacement ?? 'top')
  const mode: SidebarMode = useSession((s) => sidebarModeOf(s.personalization))

  const newContextMenu = (): void => {
    void createFromMenu({
      label: 'New Context',
      req: { op: 'createContextGroup', name: 'New Context' },
    })
  }
  const newCollectionMenu = (): void => {
    const label = 'New Collection'
    void createFromMenu({
      label,
      req: { op: 'createContainer', parentPath: '', kind: 'collection', name: DEFAULT_NEW_NAME },
    })
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
  const onCommit = (req: MutateRequest, id: string): void => {
    void mutate(req).then((moved) => {
      // Pulses the landing container so a locked one can peek the newcomer.
      if (moved && (req.op === 'movePage' || req.op === 'moveSet'))
        signalPeek(req.newParentPath, id)
    })
  }
  const { onHover, onGhostEnter, onGhostLeave, closed, take, clear: clearGhost } = ghostApi
  useEffect(() => clearGhost(), [mode, clearGhost])
  useClearStrandedGhost(ghostApi, dndIndex.byId)
  const [sidebarGhostApi] = useState(() => ({
    onHover,
    onGhostEnter,
    onGhostLeave,
    closed,
    create: (): void => {
      const anchorId = take()
      const entry = anchorId ? dndIndexRef.current.byId.get(anchorId) : undefined
      const s = useSession.getState()
      switch (entry?.kind) {
        case 'contextGroup': {
          const def = s.tree?.contexts.find((g) => g.def.id === entry.id)?.def
          if (def)
            void s.createNamed(
              { op: 'createSpace', contextId: def.id, name: createSpaceLabel(def) },
              'sidebar',
            )
          return
        }
        case 'space':
          void s.newSpaceAdjacent(entry.id, 'below', 'sidebar')
          return
        case 'page':
          void s.newPageAdjacent(entry.path, 'below', 'sidebar')
      }
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
      <SidebarIconChoice tree={tree} index={dndIndex} />
    </SidebarDnd>
  )

  const contextsLayer = dndLayer(
    tree.contexts.map((g) => <ContextGroupDisclosure key={g.def.id} group={g} />),
  )

  const collectionsLayer = dndLayer(
    tree.collections.map((c) => <ContainerRow key={c.id} node={c} depth={0} selectable />),
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
