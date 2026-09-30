import { Fragment, useMemo } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { cx } from '@pommora/uix/Utilities/cx'
import { segment } from '@pommora/uix/Elements/segment.css'
import { SortableZone, useLooseItem } from '@pommora/uix/Interactions/drag'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { isWindowTarget, type Tab, type TabTarget } from './navRef'
import { TAB_FAMILY, TabStripZone, useActiveTabInView, useTabClose } from './tabRows'
import { useSession, useSetting } from '../Session/store'
import { pageMoveContext, runPageAction } from '../Interface/Menus/pageMenuActions'
import { resolveWith, type ResolvedNav, type ResolveIndex } from './navResolve'
import { resolveIndexOf } from '../Nexus/treeIndex'
import { dialer } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { tabMenuItems } from '../Actions/tabMenu'
import { DraggableTabItem, TabItem, type TabItemProps, TabSeparator } from './TabItem'
import './tab-base.css'

interface TabEntry {
  tab: Tab
  res: ResolvedNav | null
}

const entriesOf = (tabs: Tab[], index: ResolveIndex | null): TabEntry[] =>
  tabs.map((tab) => ({
    tab,
    res: tab.target.kind === 'newtab' || !index ? null : resolveWith(index, tab.target),
  }))

// Gate/body split: every interaction hook mounts only when the bar actually shows.
export function TabBar(): React.JSX.Element | null {
  const tabs = useSession((s) => s.tabs)
  const pinnedTabs = useSession((s) => s.pinnedTabs)
  const tree = useSession((s) => s.tree)

  // Titles + icons resolve live off the nav index — a rename is current on the next push, never cached stale.
  const index = tree ? resolveIndexOf(tree) : null
  const pinnedEntries = useMemo(() => entriesOf(pinnedTabs, index), [index, pinnedTabs])
  const unpinnedEntries = useMemo(() => entriesOf(tabs, index), [index, tabs])

  const forced = useLooseItem(TAB_FAMILY) !== null
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
  const revealOnHover = useSetting('revealTabBarOnHover')
  const activateTab = useSession((s) => s.activateTab)
  const openNewTab = useSession((s) => s.openNewTab)
  const closeTab = useSession((s) => s.closeTab)
  const openWindowTab = useSession((s) => s.openWindowTab)
  const openMatrixWindow = useSession((s) => s.openMatrixWindow)
  const matrixWindowOpen = useSession((s) => s.windowSlot?.kind === 'matrix')
  const windowOpen = useSession((s) => s.windowSlot !== null)
  const pinTab = useSession((s) => s.pinTab)
  const unpinTab = useSession((s) => s.unpinTab)
  const reorderTabs = useSession((s) => s.reorderTabs)
  const reorderPin = useSession((s) => s.reorderPin)
  const openTabAt = useSession((s) => s.openTabAt)
  const beginGesture = usePointerGesture()

  const { liveEntries, renderEntries, requestClose } = useTabClose(unpinnedEntries, closeTab)

  const entryOf = (id: string): TabEntry | undefined => liveEntries.find((e) => e.tab.id === id)
  const pins = pinnedEntries.flatMap(({ tab, res }) => (res ? [{ tab, res }] : []))
  const pinOf = (id: string): ResolvedNav | undefined => pins.find((p) => p.tab.id === id)?.res
  const pinKeyOf = (id: string): string => pinOf(id)?.key ?? ''
  const renderOverlay = (id: string): React.ReactNode => {
    const entry = entryOf(id)
    return entry ? (
      <div className="tab-overlay tabs-standard">
        <UnpinnedTab entry={entry} active={entry.tab.id === activeTabId} />
      </div>
    ) : null
  }

  const stripRef = useActiveTabInView(activeTabId)

  const runTabMenu =
    (tabId: string, pinned: boolean, target: TabTarget) =>
    async (e: React.MouseEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()
      const isPage = target.kind === 'page'
      const action = await popMenu(
        tabMenuItems({
          row: 'main',
          kind: target.kind,
          pinned,
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
        if (isWindowTarget(target)) openWindowTab(target)
        else openMatrixWindow()
      } else if (isPage && action) runPageAction(action, target)
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
        dialer().tell('win:dragBy', ev.screenX - last.x, ev.screenY - last.y)
        last = { x: ev.screenX, y: ev.screenY }
      },
      onDrop: () => {},
    })
  }
  const onBarDoubleClick = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.tab, .tab-pinned, button')) return
    dialer().tell('win:zoom')
  }

  return (
    <div
      className={cx('tab-bar', 'tabs-standard', revealOnHover && !forced && 'reveal-on-hover')}
      data-reveal-host=""
      role="tablist"
      aria-label="Open tabs"
      onPointerDown={onBarDown}
      onDoubleClick={onBarDoubleClick}
    >
      {pins.length > 0 && (
        <SortableZone
          items={pins.map((e) => e.tab.id)}
          axis="x"
          label={(id) => pinOf(id)?.title ?? ''}
          onMove={(id, beforeId) => reorderPin(pinKeyOf(id), beforeId && pinKeyOf(beforeId))}
        >
          <div className="tab-pinned-zone">
            {pins.map((e, i) => (
              <Fragment key={e.tab.id}>
                {i > 0 && <TabSeparator />}
                <DraggableTabItem
                  id={e.tab.id}
                  label={e.res.title}
                  icon={e.res}
                  variant="pinned"
                  glance={e.tab.target}
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
      <div className="tab-scroll scroll-fade-x" ref={stripRef}>
        <TabStripZone
          items={liveEntries.map((e) => e.tab.id)}
          forced={forced}
          label={(id) => entryOf(id)?.res?.title ?? 'New Tab'}
          targetOf={(id) => (windowOpen ? entryOf(id)?.tab.target : undefined)}
          open={openTabAt}
          onMove={reorderTabs}
          release={closeTab}
          renderOverlay={renderOverlay}
        >
          {renderEntries.map(({ entry, ghost, seam }) => (
            <Fragment key={entry.tab.id}>
              {seam !== null && <TabSeparator closing={seam} />}
              {/* Same component type as a live tab — a type swap would remount the DOM node, losing the exit slide. */}
              <UnpinnedTab
                dragged
                entry={entry}
                active={!ghost && entry.tab.id === activeTabId}
                closing={ghost}
                onActivate={() => activateTab(entry.tab.id)}
                onClose={() => requestClose(entry.tab.id)}
                onMenu={runTabMenu(entry.tab.id, false, entry.tab.target)}
              />
            </Fragment>
          ))}
        </TabStripZone>
      </div>
      <Button
        size="button-large"
        paddingX="6px"
        icon="plus"
        iconSize="body"
        className="tab-plus"
        reveal
        data-create
        aria-label="New Tab"
        title="New Tab"
        onClick={() => openNewTab()}
      />
    </div>
  )
}

function UnpinnedTab({
  entry,
  dragged = false,
  ...handlers
}: {
  entry: TabEntry
  dragged?: boolean
} & Pick<
  TabItemProps,
  'active' | 'closing' | 'onActivate' | 'onClose' | 'onMenu'
>): React.JSX.Element {
  // A navigation that swaps this tab's CONTENT slides the icon+label in; a tab SWITCH (`source === 'tab'`) leaves it motionless.
  const slide = useSession((s) =>
    dragged && s.navSlide && s.navSlide.source !== 'tab' && s.navSlide.tabId === entry.tab.id
      ? s.navSlide
      : null,
  )
  const target = entry.tab.target
  const Item = dragged ? DraggableTabItem : TabItem
  return (
    <Item
      id={entry.tab.id}
      label={target.kind === 'newtab' ? 'New Tab' : (entry.res?.title ?? '')}
      icon={target.kind === 'newtab' ? 'copy' : (entry.res ?? 'file')}
      variant="standard"
      slide={
        slide
          ? { seq: slide.seq, className: slide.dir === 'back' ? 'nav-slide-back' : 'nav-slide-fwd' }
          : undefined
      }
      glance={target}
      {...handlers}
    />
  )
}
