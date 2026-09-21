import { Fragment, useEffect, useMemo, useRef } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { Icon } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import { text } from '@pommora/uix/Theme'
import { segment } from '@pommora/uix/Elements/segment.css'
import {
  SortableZone,
  useDragFamily,
  useDragItem,
  type DragItem,
} from '@pommora/uix/Interactions/drag'
import { onActivateKey } from '@pommora/uix/Interactions/activate'
import { matchesCommand } from '@pommora/uix/Interactions/chords'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { TAB_FAMILY, type Tab, type TabTarget } from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { hoverGlance, leaveGlance } from '../Interface/Glance/glanceLink'
import { pageMoveContext, runPageSendAction } from '../Interface/Menus/pageMenuActions'
import { resolveWith, type ResolvedNav } from './navResolve'
import { resolveIndexOf } from '../Nexus/treeIndex'
import { EntityIcon } from '../Assets/EntityIcon'
import { cycle } from './tabsModel'
import { useActiveTabInView, useTabClose, useTabExchange } from './tabRows'
import { host } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { tabMenuItems } from '@pommora/core/Actions/tabMenu'
import './tab-base.css'

interface TabEntry {
  tab: Tab
  res: ResolvedNav | null
}

// Gate/body split: every interaction hook (the Ctrl+Tab listener included) mounts only when the bar actually shows.
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

  const forced = useDragFamily() === TAB_FAMILY
  if (
    !forced &&
    pinnedEntries.length === 0 &&
    unpinnedEntries.every((e) => e.tab.target.kind === 'newtab')
  )
    return null
  return (
    <TabBarBody pinnedEntries={pinnedEntries} unpinnedEntries={unpinnedEntries} forced={forced} />
  )
}

function TabBarBody({
  pinnedEntries,
  unpinnedEntries,
  forced,
}: {
  pinnedEntries: TabEntry[]
  unpinnedEntries: TabEntry[]
  forced: boolean
}): React.JSX.Element {
  const activeTabId = useSession((s) => s.activeTabId)
  const commands = useSession((s) => s.commands)
  const revealOnHover = useSession((s) => s.personalization.revealTabBarOnHover ?? false)
  const activateTab = useSession((s) => s.activateTab)
  const openNewTab = useSession((s) => s.openNewTab)
  const closeTab = useSession((s) => s.closeTab)
  const openWindow = useSession((s) => s.openWindow)
  const openMatrixWindow = useSession((s) => s.openMatrixWindow)
  const matrixWindowOpen = useSession((s) => s.pageWindow?.kind === 'matrix')
  const windowOpen = useSession((s) => s.pageWindow !== null)
  const pinTab = useSession((s) => s.pinTab)
  const unpinTab = useSession((s) => s.unpinTab)
  const reorderTabs = useSession((s) => s.reorderTabs)
  const reorderPin = useSession((s) => s.reorderPin)
  const openTabAt = useSession((s) => s.openTabAt)
  const beginGesture = usePointerGesture()

  const { liveEntries, renderEntries, firstLive, requestClose } = useTabClose(
    unpinnedEntries,
    closeTab,
  )

  const entryOf = (id: string): TabEntry | undefined => liveEntries.find((e) => e.tab.id === id)
  const pinKeyOf = (id: string): string =>
    pinnedEntries.find((e) => e.tab.id === id)?.res?.key ?? ''
  const labelOf = (id: string): string => entryOf(id)?.res?.title ?? 'New Tab'
  // No window means no row to land in, so the tab carries nothing and stays pinned to its axis.
  const { still, carry, receive } = useTabExchange(
    (id) => (windowOpen ? entryOf(id)?.tab.target : undefined),
    openTabAt,
  )
  const renderOverlay = (id: string): React.ReactNode => {
    const entry = entryOf(id)
    return entry ? (
      <div className="tab-overlay tabs-standard">
        <UnpinnedTab
          entry={entry}
          active={entry.tab.id === activeTabId}
          closing={false}
          onActivate={() => {}}
          onClose={() => {}}
          onMenu={() => {}}
        />
      </div>
    ) : null
  }

  // The cycle runs over the full visual order, intercepted only while the bar shows.
  const orderedIds = useMemo(
    () => [...pinnedEntries.map((e) => e.tab.id), ...unpinnedEntries.map((e) => e.tab.id)],
    [pinnedEntries, unpinnedEntries],
  )
  const cycleRef = useRef({ orderedIds, activeTabId, commands })
  cycleRef.current = { orderedIds, activeTabId, commands }
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const { orderedIds: ids, activeTabId: active, commands: cmds } = cycleRef.current
      const back = matchesCommand(cmds['previous-tab'], e)
      if (!back && !matchesCommand(cmds['next-tab'], e)) return
      e.preventDefault()
      activateTab(cycle(ids, active, back ? -1 : 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activateTab])

  const stripRef = useActiveTabInView(activeTabId)

  const runTabMenu =
    (tabId: string, pinned: boolean, target: TabTarget) =>
    async (e: React.MouseEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()
      const isPage = target.kind === 'page'
      const action = await popMenu(
        tabMenuItems({
          pinned,
          isNewTab: target.kind === 'newtab',
          isPage,
          isMatrix: target.kind === 'matrix',
          active: tabId === activeTabId,
          matrixWindowOpen,
          ...(isPage ? pageMoveContext(useSession.getState().tree, target.path) : {}),
        }),
      )
      if (action === 'open') activateTab(tabId)
      else if (action === 'pin') pinTab(tabId)
      else if (action === 'unpin') unpinTab(tabId)
      else if (action === 'close') requestClose(tabId)
      else if (action === 'window') {
        if (isPage) openWindow({ id: target.id, path: target.path })
        else openMatrixWindow()
      } else if (isPage && action) runPageSendAction(action, target)
    }

  // A native CSS app-region never delivers hover, killing the + button's hover-reveal on the same pixels, so the bar drags the window itself via pointer deltas.
  const onBarDown = (e: React.PointerEvent<HTMLElement>): void => {
    if ((e.target as HTMLElement).closest('.tab, .tab-pinned, button')) return
    let last = { x: e.screenX, y: e.screenY }
    beginGesture({
      el: e.currentTarget,
      event: e,
      onActivate: () => true,
      onDragMove: (ev) => {
        host().tell('win:dragBy', ev.screenX - last.x, ev.screenY - last.y)
        last = { x: ev.screenX, y: ev.screenY }
      },
      onDrop: () => {},
    })
  }
  const onBarDoubleClick = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.tab, .tab-pinned, button')) return
    host().tell('win:zoom')
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
          items={pinnedEntries.map((e) => e.tab.id)}
          axis="x"
          onReorder={(a, b) => reorderPin(pinKeyOf(a), pinKeyOf(b))}
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
          id="tabs-main"
          className={cx('tab-strip', (still || forced) && 'is-still')}
          family={TAB_FAMILY}
          items={liveEntries.map((e) => e.tab.id)}
          axis="x"
          onReorder={reorderTabs}
          getItemLabel={labelOf}
          carry={carry}
          receive={receive}
          release={closeTab}
          renderOverlay={renderOverlay}
        >
          {renderEntries.map(({ entry, ghost }, i) => (
            <Fragment key={entry.tab.id}>
              {i > 0 && (
                <span
                  className={cx(segment, 'tab-seg', (ghost || i === firstLive) && 'is-closing')}
                  aria-hidden
                />
              )}
              {/* Same component type as a live tab — a type swap would remount the DOM node, losing the exit slide. */}
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
        </SortableZone>
      </div>
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

// A page tab is a location: it raises its preview on Shift, never on plain hover. Non-page tabs carry no id/path, so they raise nothing.
const tabHoverProps = (entry: TabEntry) => ({
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
    const t = entry.tab.target
    if (t.kind === 'page')
      hoverGlance({ kind: 'page', id: t.id, path: t.path }, e.currentTarget, 'location', e.shiftKey)
  },
  onPointerLeave: () => leaveGlance(),
})

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
  const drag = useDragItem(entry.tab.id)
  if (!entry.res) return null
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space/Enter lift), which a spread hides from static analysis
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      {...drag.handle}
      data-tab-id={entry.tab.id}
      {...tabHoverProps(entry)}
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
  // A navigation that swaps this tab's CONTENT slides the icon+label in; a tab SWITCH (`source === 'tab'`) leaves it motionless.
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
      {...tabHoverProps(entry)}
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
