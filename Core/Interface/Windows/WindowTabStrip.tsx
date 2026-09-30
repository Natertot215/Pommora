import { Fragment, useMemo } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { useLooseItem } from '@pommora/uix/Interactions/drag'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'
import { resolveWith, type ResolveIndex, type ResolvedNav } from '../../Navigation/navResolve'
import { TabStripZone, useActiveTabInView, useTabClose, TAB_FAMILY } from '../../Navigation/tabRows'
import { popMenu } from '../../Actions/menuActions'
import { tabMenuItems } from '../../Actions/tabMenu'
import { bannerMenuItems } from '../../Actions/identityMenus'
import { runWindowBanner, windowBannerAdd, windowBannerShown } from './windowTabBanner'
import { pageMoveContext, runPageAction } from '../Menus/pageMenuActions'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { isWindowTarget } from '../../Navigation/navRef'
import { useSession } from '../../Session/store'
import type { WindowTab } from './windowTabs'
import {
  DraggableTabItem,
  TabItem,
  type TabItemProps,
  TabSeparator,
} from '../../Navigation/TabItem'
import '../../Navigation/tab-base.css'

interface Entry {
  tab: WindowTab
  res: ResolvedNav | null
}

const windowTabProps = (
  { tab, res }: Entry,
  navKind: boolean,
): Omit<TabItemProps, 'active' | 'closing' | 'drag' | 'onActivate' | 'onClose' | 'onMenu'> => {
  const target = tab.target
  if (target.kind === 'map')
    return { id: tab.id, label: 'Navigation', icon: 'map', variant: 'compact', iconOnly: true }
  // A tab whose own icon is ALSO the map glyph renders its type icon instead — nothing masquerades as the perma-pinned NavWindow tab.
  const shown =
    navKind && res?.icon === 'map' ? { ...res, icon: DEFAULT_ENTITY_ICONS[target.kind] } : res
  return {
    id: tab.id,
    label: res?.title ?? '',
    icon: shown ?? DEFAULT_ENTITY_ICONS[target.kind],
    variant: 'compact',
    glance: target,
  }
}

export function WindowTabStrip({
  index,
  title,
}: {
  index: ResolveIndex | null
  title: React.ReactNode
}): React.JSX.Element {
  const windowSlot = useSession((s) => s.windowSlot)
  const activateWindowTab = useSession((s) => s.activateWindowTab)
  const closeWindowTab = useSession((s) => s.closeWindowTab)
  const reorderWindowTabs = useSession((s) => s.reorderWindowTabs)
  const openWindowTab = useSession((s) => s.openWindowTab)
  const promoteWindowTab = useSession((s) => s.promoteWindowTab)
  const tabs = windowSlot?.tabs
  const activeTabId = windowSlot?.activeTabId
  const navKind = windowSlot?.kind === 'nav'

  const entries = useMemo<Entry[]>(
    () =>
      (tabs ?? []).map((tab) => ({
        tab,
        res: isWindowTarget(tab.target) && index ? resolveWith(index, tab.target) : null,
      })),
    [tabs, index],
  )

  const { liveEntries, renderEntries, ghostCount, requestClose } = useTabClose(
    entries,
    closeWindowTab,
  )
  const sentinel = renderEntries.find((e) => e.entry.tab.target.kind === 'map')
  const contentEntries = renderEntries.filter((e) => isWindowTarget(e.entry.tab.target))

  const loose = useLooseItem(TAB_FAMILY)
  const forced = loose !== null && isWindowTarget(loose)
  const showStrip = (tabs?.length ?? 0) > 1 || ghostCount > 0 || forced
  const titlePresence = useExitPresence(!showStrip, 'base')
  // The exiting title fades out as WHAT IT WAS — crumbs re-derive from the new active tab, so the live node would swap text mid-collapse without this hold.
  const heldTitle = useHeld(title, !showStrip)

  const scrollRef = useActiveTabInView(activeTabId)

  const entryOf = (id: string): Entry | undefined => liveEntries.find((e) => e.tab.id === id)
  const runTabMenu =
    (tab: WindowTab) =>
    async (e: React.MouseEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()
      const target = tab.target
      if (target.kind === 'map') return
      const isPage = target.kind === 'page'
      const banner = windowBannerShown(useSession.getState().personalization, target.kind)
        ? bannerMenuItems({ add: await windowBannerAdd(target) })
        : undefined
      const action = await popMenu(
        tabMenuItems({
          row: 'window',
          kind: target.kind,
          banner,
          ...(isPage ? pageMoveContext(useSession.getState().tree, target.path) : {}),
        }),
      )
      if (action === 'promote') promoteWindowTab(tab.id, true)
      else if (action === 'close') requestClose(tab.id)
      else if (action === 'change' || action === 'edit' || action === 'remove')
        runWindowBanner(tab.id, action)
      else if (isPage && action) runPageAction(action, target)
    }
  const renderOverlay = (id: string): React.ReactNode => {
    const entry = entryOf(id)
    return entry ? (
      <div className="tab-overlay tabs-compact">
        <TabItem {...windowTabProps(entry, navKind)} active={entry.tab.id === activeTabId} />
      </div>
    ) : null
  }

  return (
    <>
      {titlePresence.mounted && (
        <div
          className={cx(
            'window-toolbar-title',
            'page-window-title',
            titlePresence.closing && 'is-collapsing',
          )}
        >
          {heldTitle}
        </div>
      )}
      <div className="window-tabwrap tabs-compact">
        {showStrip && sentinel && (
          <TabItem
            {...windowTabProps(sentinel.entry, navKind)}
            active={sentinel.entry.tab.id === activeTabId}
            onActivate={() => activateWindowTab(sentinel.entry.tab.id)}
          />
        )}
        {showStrip && (
          <div
            className="tab-scroll scroll-fade-x"
            role="tablist"
            aria-label="Preview tabs"
            ref={scrollRef}
          >
            <TabStripZone
              items={contentEntries.filter((e) => !e.ghost).map((e) => e.entry.tab.id)}
              forced={forced}
              label={(id) => entryOf(id)?.res?.title ?? ''}
              targetOf={(id) => entryOf(id)?.tab.target}
              accepts={isWindowTarget}
              open={(target, at) => isWindowTarget(target) && openWindowTab(target, { at })}
              onMove={reorderWindowTabs}
              release={closeWindowTab}
              renderOverlay={renderOverlay}
            >
              {contentEntries.map(({ entry, ghost, seam }) => (
                <Fragment key={entry.tab.id}>
                  {seam !== null && <TabSeparator closing={seam} />}
                  <DraggableTabItem
                    {...windowTabProps(entry, navKind)}
                    active={!ghost && entry.tab.id === activeTabId}
                    closing={ghost}
                    onActivate={() => activateWindowTab(entry.tab.id)}
                    onClose={() => requestClose(entry.tab.id)}
                    onMenu={runTabMenu(entry.tab)}
                  />
                </Fragment>
              ))}
            </TabStripZone>
          </div>
        )}
      </div>
    </>
  )
}
