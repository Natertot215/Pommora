import { Fragment, useMemo } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import {
  SortableZone,
  useDragFamily,
  useDragItem,
  type DragItem,
} from '@pommora/uix/Interactions/drag'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme'
import { EntityIcon } from '../../Assets/EntityIcon'
import { resolveWith, type ResolveIndex, type ResolvedNav } from '../../Navigation/navResolve'
import { useActiveTabInView, useTabClose, useTabExchange } from '../../Navigation/tabRows'
import { popMenu } from '../../Actions/menuActions'
import { tabMenuItems } from '@pommora/core/Actions/tabMenu'
import { bannerMenuItems } from '@pommora/core/Actions/identityMenus'
import { runWindowBanner, windowBannerAdd, windowBannerShown } from './windowTabBanner'
import { pageMoveContext, runPageSendAction } from '../Menus/pageMenuActions'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { isWindowTarget, TAB_FAMILY } from '@pommora/core/Navigation/navRef'
import { useSession } from '../../Session/store'
import type { WindowTab } from './windowTabs'
import '../../Navigation/tab-base.css'

const TAB_ICON = 'control'

interface Entry {
  tab: WindowTab
  res: ResolvedNav | null
}

export function WindowTabStrip({
  index,
  title,
}: {
  index: ResolveIndex | null
  title: React.ReactNode
}): React.JSX.Element {
  const pageWindow = useSession((s) => s.pageWindow)
  const activateWindowTab = useSession((s) => s.activateWindowTab)
  const closeWindowTab = useSession((s) => s.closeWindowTab)
  const reorderWindowTabs = useSession((s) => s.reorderWindowTabs)
  const openWindowTab = useSession((s) => s.openWindowTab)
  const promoteWindowTab = useSession((s) => s.promoteWindowTab)
  const tabs = pageWindow?.tabs
  const activeTabId = pageWindow?.activeTabId
  const navKind = pageWindow?.kind === 'nav'

  const entries = useMemo<Entry[]>(
    () =>
      (tabs ?? []).map((tab) => ({
        tab,
        res: isWindowTarget(tab.target) && index ? resolveWith(index, tab.target) : null,
      })),
    [tabs, index],
  )

  const { renderEntries, ghostCount, requestClose } = useTabClose(entries, closeWindowTab)
  const sentinel = renderEntries.find((e) => e.entry.tab.target.kind === 'navwindow')
  const contentEntries = renderEntries.filter((e) => isWindowTarget(e.entry.tab.target))
  const firstLiveContent = contentEntries.findIndex((e) => !e.ghost)

  const forced = useDragFamily() === TAB_FAMILY
  const showStrip = (tabs?.length ?? 0) > 1 || ghostCount > 0 || forced
  const titlePresence = useExitPresence(!showStrip)
  // The exiting title fades out as WHAT IT WAS — crumbs re-derive from the new active tab, so the live node would swap text mid-collapse without this hold.
  const heldTitle = useHeld(title, !showStrip)

  const scrollRef = useActiveTabInView(activeTabId)

  const entryOf = (id: string): Entry | undefined =>
    contentEntries.find((e) => !e.ghost && e.entry.tab.id === id)?.entry
  const labelOf = (id: string): string => entryOf(id)?.res?.title ?? ''
  const { still, carry, receive } = useTabExchange((id) => entryOf(id)?.tab.target, openWindowTab)
  const runTabMenu =
    (tab: WindowTab) =>
    async (e: React.MouseEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()
      const target = tab.target
      if (target.kind === 'navwindow') return
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
      else if (isPage && action) runPageSendAction(action, target)
    }
  const renderOverlay = (id: string): React.ReactNode => {
    const entry = entryOf(id)
    return entry ? (
      <div className="tab-overlay tabs-compact">
        <WindowTabItem
          entry={entry}
          navKind={navKind}
          active={entry.tab.id === activeTabId}
          closing={false}
          onActivate={() => {}}
          onClose={() => {}}
        />
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
          <WindowTabItem
            entry={sentinel.entry}
            navKind={navKind}
            active={sentinel.entry.tab.id === activeTabId}
            closing={false}
            onActivate={() => activateWindowTab(sentinel.entry.tab.id)}
            onClose={() => {}}
          />
        )}
        {showStrip && (
          <div
            className="tab-scroll over-scroll-x"
            role="tablist"
            aria-label="Preview tabs"
            ref={scrollRef}
          >
            <SortableZone
              id="tabs-window"
              className={cx('tab-strip', (still || forced) && 'is-still')}
              family={TAB_FAMILY}
              items={contentEntries.filter((e) => !e.ghost).map((e) => e.entry.tab.id)}
              axis="x"
              onReorder={reorderWindowTabs}
              getItemLabel={labelOf}
              carry={carry}
              receive={receive}
              release={closeWindowTab}
              renderOverlay={renderOverlay}
            >
              {contentEntries.map(({ entry, ghost }, i) => (
                <Fragment key={entry.tab.id}>
                  {(i > 0 || sentinel) && (
                    <span
                      className={cx(
                        'tab-seg',
                        (ghost || (i > 0 && i === firstLiveContent)) && 'is-closing',
                      )}
                      aria-hidden
                    />
                  )}
                  <DraggableWindowTab
                    entry={entry}
                    navKind={navKind}
                    active={!ghost && entry.tab.id === activeTabId}
                    closing={ghost}
                    onActivate={() => activateWindowTab(entry.tab.id)}
                    onClose={() => requestClose(entry.tab.id)}
                    onMenu={runTabMenu(entry.tab)}
                  />
                </Fragment>
              ))}
            </SortableZone>
          </div>
        )}
      </div>
    </>
  )
}

function DraggableWindowTab(props: {
  entry: Entry
  navKind: boolean
  active: boolean
  closing: boolean
  onActivate: () => void
  onClose: () => void
  onMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const drag = useDragItem(props.entry.tab.id)
  return <WindowTabItem {...props} drag={drag} />
}

function WindowTabItem({
  entry,
  navKind,
  active,
  closing,
  drag,
  onActivate,
  onClose,
  onMenu,
}: {
  entry: Entry
  navKind: boolean
  active: boolean
  closing: boolean
  drag?: DragItem
  onActivate: () => void
  onClose: () => void
  onMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const isMap = entry.tab.target.kind === 'navwindow'
  const kind = entry.tab.target.kind === 'navwindow' ? 'page' : entry.tab.target.kind
  const label = isMap ? 'Navigation' : (entry.res?.title ?? '')
  // A tab whose own icon is ALSO the map glyph renders its type icon instead — nothing masquerades as the perma-pinned NavWindow tab.
  const res =
    navKind && entry.res?.icon === 'map'
      ? { ...entry.res, icon: DEFAULT_ENTITY_ICONS[kind] }
      : entry.res
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
        text.caption.standard,
        active && 'is-active',
        closing && 'is-closing',
        isMap && 'tab-map',
        drag?.isDragging && 'is-dragging',
      )}
      title={label}
      role="tab"
      aria-selected={active}
      // Roving tabindex: the strip is ONE tab stop, the active tab holds it.
      tabIndex={active ? 0 : -1}
      onClick={() => {
        if (!drag?.isDragging) onActivate()
      }}
      onContextMenu={onMenu}
    >
      {res ? (
        <EntityIcon item={res} size={TAB_ICON} className="tab-icon" />
      ) : (
        <Icon
          name={isMap ? 'map' : DEFAULT_ENTITY_ICONS[kind]}
          size={TAB_ICON}
          className="tab-icon"
        />
      )}
      {!isMap && <span className={cx(overScrollEllipsis, 'tab-label')}>{label}</span>}
      {!isMap && (
        <HoverRemove reveal="host" className="tab-x" label="Close Tab" onRemove={onClose} />
      )}
    </div>
  )
}
