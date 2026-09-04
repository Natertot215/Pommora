import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@renderer/Interactions/HoverRemove'
import { duration, ms } from '@renderer/Animation'
import { text } from '@renderer/DesignSystem/Tokens'
import { segment } from '@renderer/DesignSystem/Elements/Segment/segment.css'
import { SortableZone, useDragItem, type DragItem } from '@renderer/Interactions/drag'
import { onActivateKey } from '@renderer/Interactions/activate'
import { suppressNextClick } from '@renderer/Interactions/shared'
import type { Tab, TabTarget } from '@shared/types'
import { useSession } from '../store'
import { pageMoveContext, runPageSendAction } from '@renderer/Actions/pageMenuActions'
import { resolveWith, type ResolvedNav } from '../Navigation/navResolve'
import { resolveIndexOf } from '../treeIndex'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { cycle } from './tabsModel'
import './tab-base.css'

const BASE_MS = ms(duration.base)
/** One fast beat added for the segment's delayed exit — the ghost stays rendered until the whole
 *  sequence lands. */
const EXIT_MS = BASE_MS + ms(duration.fast)

interface TabEntry {
  tab: Tab
  /** null for the NavView tab. A pinned tab that no longer resolves render-hides upstream —
   *  never reaches here. */
  res: ResolvedNav | null
}

// Gate/body split: every interaction hook (the Ctrl+Tab listener included) mounts only when the
// bar actually shows.
export function TabBar(): React.JSX.Element | null {
  const tabs = useSession((s) => s.tabs)
  const pinnedTabs = useSession((s) => s.pinnedTabs)
  const tree = useSession((s) => s.tree)

  // Titles + icons resolve live off the nav index — a rename is current on the next push, never cached stale.
  const index = tree ? resolveIndexOf(tree) : null
  const pinnedEntries = useMemo<TabEntry[]>(() => {
    if (!index) return []
    // A pinned entity that no longer resolves render-hides (render-prune, never storage-prune).
    return pinnedTabs.flatMap((tab) => {
      if (tab.target.kind === 'newtab') return []
      const res = resolveWith(index, tab.target)
      return res ? [{ tab, res }] : []
    })
  }, [index, pinnedTabs])
  const unpinnedEntries = useMemo<TabEntry[]>(
    () =>
      tabs.map((tab) => ({
        tab,
        res: tab.target.kind === 'newtab' || !index ? null : resolveWith(index, tab.target),
      })),
    [index, tabs],
  )

  // Blank ONLY for the pure empty state (a lone NavView, no pins); otherwise the bar shows so the +
  // stays reachable — even at a single real tab (deliberate).
  if (pinnedEntries.length === 0 && unpinnedEntries.every((e) => e.tab.target.kind === 'newtab'))
    return null
  return <TabBarBody pinnedEntries={pinnedEntries} unpinnedEntries={unpinnedEntries} />
}

function TabBarBody({
  pinnedEntries,
  unpinnedEntries,
}: {
  pinnedEntries: TabEntry[]
  unpinnedEntries: TabEntry[]
}): React.JSX.Element {
  const activeTabId = useSession((s) => s.activeTabId)
  const revealOnHover = useSession((s) => s.personalization.revealTabBarOnHover ?? false)
  const activateTab = useSession((s) => s.activateTab)
  const openNewTab = useSession((s) => s.openNewTab)
  const closeTab = useSession((s) => s.closeTab)
  const openWindow = useSession((s) => s.openWindow)
  const pinTab = useSession((s) => s.pinTab)
  const unpinTab = useSession((s) => s.unpinTab)
  const reorderTabs = useSession((s) => s.reorderTabs)
  const reorderPin = useSession((s) => s.reorderPin)

  // Closing is store-first — the tab leaves the store immediately (a re-click spawns fresh instead of resurrecting a zombie) while a GHOST stays rendered for the width-collapse exit.
  const [ghosts, setGhosts] = useState<ReadonlyMap<string, { entry: TabEntry; index: number }>>(
    new Map(),
  )
  const requestClose = (id: string): void => {
    const index = unpinnedEntries.findIndex((e) => e.tab.id === id)
    const entry = unpinnedEntries[index]
    if (!entry) return
    setGhosts((m) => new Map(m).set(id, { entry, index }))
    closeTab(id)
    setTimeout(() => {
      setGhosts((m) => {
        const next = new Map(m)
        next.delete(id)
        return next
      })
    }, EXIT_MS)
  }
  const liveEntries = useMemo(
    () => unpinnedEntries.filter((e) => !ghosts.has(e.tab.id)),
    [unpinnedEntries, ghosts],
  )
  const renderEntries = useMemo<{ entry: TabEntry; ghost: boolean }[]>(() => {
    const live = liveEntries.map((entry) => ({ entry, ghost: false }))
    for (const [, g] of [...ghosts.entries()].sort((a, b) => a[1].index - b[1].index)) {
      live.splice(Math.min(g.index, live.length), 0, { entry: g.entry, ghost: true })
    }
    return live
  }, [liveEntries, ghosts])
  const firstLive = renderEntries.findIndex((e) => !e.ghost)

  // Ctrl+Tab / Ctrl+Shift+Tab cycles the full visual order (the one signed-off keybinding) —
  // intercepted only while the bar shows.
  const orderedIds = useMemo(
    () => [...pinnedEntries.map((e) => e.tab.id), ...unpinnedEntries.map((e) => e.tab.id)],
    [pinnedEntries, unpinnedEntries],
  )
  const cycleRef = useRef({ orderedIds, activeTabId })
  cycleRef.current = { orderedIds, activeTabId }
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab' || !e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      const { orderedIds: ids, activeTabId: active } = cycleRef.current
      activateTab(cycle(ids, active, e.shiftKey ? -1 : 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activateTab])

  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTabId])

  const runTabMenu =
    (tabId: string, pinned: boolean, target: TabTarget) =>
    async (e: React.MouseEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()
      const isPage = target.kind === 'page'
      const action = await window.nexus.tabMenu({
        pinned,
        isNewTab: target.kind === 'newtab',
        isPage,
        ...(isPage ? pageMoveContext(useSession.getState().tree, target.path) : {}),
      })
      if (action === 'pin') pinTab(tabId)
      else if (action === 'unpin') unpinTab(tabId)
      else if (action === 'close') requestClose(tabId)
      else if (!isPage) return
      else if (action === 'preview') openWindow({ id: target.id, path: target.path })
      else if (action) runPageSendAction(action, target)
    }

  // A native CSS app-region can't do this — it never delivers hover, killing the + button's
  // hover-reveal on the same pixels — so the bar drags the window itself via pointer deltas.
  const onBarDown = (e: React.PointerEvent<HTMLElement>): void => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.tab, .tab-pinned, button')) return
    const el = e.currentTarget
    const pid = e.pointerId
    el.setPointerCapture(pid)
    let last = { x: e.screenX, y: e.screenY }
    let travel = 0
    const move = (ev: PointerEvent): void => {
      travel += Math.abs(ev.screenX - last.x) + Math.abs(ev.screenY - last.y)
      window.nexus.winDragBy(ev.screenX - last.x, ev.screenY - last.y)
      last = { x: ev.screenX, y: ev.screenY }
    }
    const end = (): void => {
      if (el.hasPointerCapture(pid)) el.releasePointerCapture(pid)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      // A real drag releasing over a tab must not read as a click on it.
      if (travel > 3) suppressNextClick()
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
  }
  const onBarDoubleClick = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.tab, .tab-pinned, button')) return
    window.nexus.winZoom()
  }

  return (
    <div
      className={cx('tab-bar', 'tabs-standard', revealOnHover && 'reveal-on-hover')}
      role="tablist"
      aria-label="Open tabs"
      onPointerDown={onBarDown}
      onDoubleClick={onBarDoubleClick}
    >
      {pinnedEntries.length > 0 && (
        <SortableZone
          items={pinnedEntries.map((e) => e.res?.key ?? '')}
          layout="list"
          axis="x"
          onReorder={reorderPin}
        >
          <div className="tab-pinned-zone">
            {pinnedEntries.map((e, i) => (
              <Fragment key={e.tab.id}>
                {i > 0 && <span className={cx(segment, 'tab-seg')} aria-hidden />}
                <PinnedTab
                  entry={e}
                  active={e.tab.id === activeTabId}
                  onActivate={() => activateTab(e.tab.id)}
                  onMenu={runTabMenu(e.tab.id, true, e.tab.target)}
                />
              </Fragment>
            ))}
          </div>
        </SortableZone>
      )}
      {pinnedEntries.length > 0 && unpinnedEntries.length > 0 && (
        <span className={cx(segment, 'tab-divider')} />
      )}
      <div className="tab-scroll over-scroll-x" ref={stripRef}>
        <SortableZone
          items={liveEntries.map((e) => e.tab.id)}
          layout="list"
          axis="x"
          onReorder={reorderTabs}
        >
          <div className="tab-strip">
            {renderEntries.map(({ entry, ghost }, i) => (
              <Fragment key={entry.tab.id}>
                {/* When the leftmost tab is itself the ghost (no left segment), the segment before
                    the first LIVE tab closes in its place instead. */}
                {i > 0 && (
                  <span
                    className={cx(segment, 'tab-seg', (ghost || i === firstLive) && 'is-closing')}
                    aria-hidden
                  />
                )}
                {/* Same component type as a live tab — a type swap would remount the DOM node,
                    losing the exit slide. is-closing makes it pointer-inert. */}
                <DraggableUnpinnedTab
                  entry={entry}
                  active={!ghost && entry.tab.id === activeTabId}
                  closing={ghost}
                  onActivate={() => activateTab(entry.tab.id)}
                  onClose={() => requestClose(entry.tab.id)}
                  onMenu={runTabMenu(entry.tab.id, false, entry.tab.target)}
                />
              </Fragment>
            ))}
          </div>
        </SortableZone>
      </div>
      {/* Outside the masked scroller — inside it, the edge fade would dim the parked + itself. */}
      <Button
        size="button-large"
        paddingX="6px"
        icon="plus"
        iconSize="body"
        className="tab-plus"
        data-create
        aria-label="New Tab"
        title="New Tab"
        onClick={openNewTab}
      />
    </div>
  )
}

/** The pin badge is pulled for now — position + compactness carry the pinned reading. Not
 *  closable — unpin first. */
function PinnedTab({
  entry,
  active,
  onActivate,
  onMenu,
}: {
  entry: TabEntry
  active: boolean
  onActivate: () => void
  onMenu: (e: React.MouseEvent) => void
}): React.JSX.Element | null {
  const drag = useDragItem(entry.res?.key ?? '')
  if (!entry.res) return null
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space/Enter lift), which a spread hides from static analysis
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      {...drag.handle}
      data-tab-id={entry.tab.id}
      className={cx('tab-pinned', active && 'is-active', drag.isDragging && 'is-dragging')}
      title={entry.res.title}
      role="tab"
      aria-selected={active}
      // Roving tabindex: the strip is ONE tab stop, arrowing/clicking moves the selection.
      tabIndex={active ? 0 : -1}
      onClick={() => {
        if (!drag.isDragging) onActivate()
      }}
      onContextMenu={onMenu}
    >
      <EntityIcon item={entry.res} size="body" className="tab-icon" />
    </div>
  )
}

/** A ghost keeps this same wrapper — its id has left the zone's items, so the drag hook is
 *  naturally inert on it. */
function DraggableUnpinnedTab(props: {
  entry: TabEntry
  active: boolean
  closing: boolean
  onActivate: () => void
  onClose: () => void
  onMenu: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const drag = useDragItem(props.entry.tab.id)
  return <UnpinnedTab {...props} drag={drag} />
}

function UnpinnedTab({
  entry,
  active,
  closing,
  drag,
  onActivate,
  onClose,
  onMenu,
}: {
  entry: TabEntry
  active: boolean
  closing: boolean
  drag?: DragItem
  onActivate: () => void
  onClose: () => void
  onMenu: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const isNewTab = entry.tab.target.kind === 'newtab'
  const title = isNewTab ? 'New Tab' : (entry.res?.title ?? '')
  // A navigation that swaps this tab's CONTENT slides the icon+label in; a tab SWITCH
  // (`source === 'tab'`) leaves it motionless.
  const slide = useSession((s) =>
    s.navSlide && s.navSlide.source !== 'tab' && s.navSlide.tabId === entry.tab.id
      ? s.navSlide
      : null,
  )
  const slideClass = slide ? (slide.dir === 'back' ? 'nav-slide-back' : 'nav-slide-fwd') : undefined
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space/Enter lift), which a spread hides from static analysis
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...drag?.handle}
      data-tab-id={entry.tab.id}
      className={cx(
        'tab',
        hoverRemoveHost,
        text.control.standard,
        active && 'is-active',
        closing && 'is-closing',
        drag?.isDragging && 'is-dragging',
      )}
      title={title}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => {
        if (!drag?.isDragging) onActivate()
      }}
      {...(drag ? {} : { onKeyDown: onActivateKey(onActivate) })}
      onContextMenu={onMenu}
    >
      <Fragment key={slide?.seq ?? 0}>
        {isNewTab || !entry.res ? (
          <Icon
            name={isNewTab ? 'copy' : 'file'}
            size="body"
            className={cx('tab-icon', slideClass)}
          />
        ) : (
          <EntityIcon item={entry.res} size="body" className={cx('tab-icon', slideClass)} />
        )}
        <span className={cx(overScrollEllipsis, 'tab-label', slideClass)}>{title}</span>
      </Fragment>
      <HoverRemove reveal="host" className="tab-x" label="Close Tab" onRemove={onClose} />
    </div>
  )
}
