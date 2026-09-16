import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import {
  SortableZone,
  useDragFamily,
  useDragItem,
  type Carried,
  type DragItem,
} from '@pommora/uix/Interactions/drag'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme'
import { EntityIcon } from '../../Assets/EntityIcon'
import { resolveWith, type ResolveIndex, type ResolvedNav } from '../../Navigation/navResolve'
import { useTabClose } from '../../Navigation/tabClose'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import type { PageTarget } from '@pommora/core/Navigation/navRef'
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
  const tabs = pageWindow?.tabs
  const activeTabId = pageWindow?.activeTabId
  const navKind = pageWindow?.kind === 'nav'

  const entries = useMemo<Entry[]>(
    () =>
      (tabs ?? []).map((tab) => ({
        tab,
        res: tab.target.kind === 'page' && index ? resolveWith(index, tab.target) : null,
      })),
    [tabs, index],
  )

  const { renderEntries, ghostCount, requestClose } = useTabClose(entries, closeWindowTab)
  const sentinel = renderEntries.find((e) => e.entry.tab.target.kind === 'navwindow')
  const pageEntries = renderEntries.filter((e) => e.entry.tab.target.kind === 'page')
  const firstLivePage = pageEntries.findIndex((e) => !e.ghost)

  const forced = useDragFamily() === 'tabs'
  const showStrip = (tabs?.length ?? 0) > 1 || ghostCount > 0 || forced
  const titlePresence = useExitPresence(!showStrip)
  // The exiting title fades out as WHAT IT WAS — crumbs re-derive from the new active tab, so the live node would swap text mid-collapse without this hold.
  const heldTitle = useHeld(title, !showStrip)

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activeTabId) return
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTabId])

  const entryOf = (id: string): Entry | undefined =>
    pageEntries.find((e) => !e.ghost && e.entry.tab.id === id)?.entry
  const labelOf = (id: string): string => entryOf(id)?.res?.title ?? ''
  const carry = (id: string): PageTarget | null => {
    const tab = entryOf(id)?.tab
    return tab?.target.kind === 'page' ? tab.target : null
  }
  const placing = useRef(false)
  useLayoutEffect(() => {
    placing.current = false
  })
  const receive = (item: Carried, at: number): void => {
    placing.current = true
    openWindowTab(item as PageTarget, at)
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
              className={cx('tab-strip', (placing.current || forced) && 'is-still')}
              family="tabs"
              items={pageEntries.filter((e) => !e.ghost).map((e) => e.entry.tab.id)}
              axis="x"
              onReorder={reorderWindowTabs}
              getItemLabel={labelOf}
              carry={carry}
              receive={receive}
              release={closeWindowTab}
              renderOverlay={renderOverlay}
            >
              {pageEntries.map(({ entry, ghost }, i) => (
                <Fragment key={entry.tab.id}>
                  {(i > 0 || sentinel) && (
                    <span
                      className={cx(
                        'tab-seg',
                        (ghost || (i > 0 && i === firstLivePage)) && 'is-closing',
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
}: {
  entry: Entry
  navKind: boolean
  active: boolean
  closing: boolean
  drag?: DragItem
  onActivate: () => void
  onClose: () => void
}): React.JSX.Element {
  const isMap = entry.tab.target.kind === 'navwindow'
  const label = isMap ? 'Navigation' : (entry.res?.title ?? '')
  // A page tab whose own icon is ALSO the map glyph renders its type icon instead — nothing masquerades as the perma-pinned NavWindow tab.
  const res =
    navKind && entry.res?.icon === 'map'
      ? { ...entry.res, icon: DEFAULT_ENTITY_ICONS.page }
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
    >
      {res ? (
        <EntityIcon item={res} size={TAB_ICON} className="tab-icon" />
      ) : (
        <Icon name={isMap ? 'map' : 'file'} size={TAB_ICON} className="tab-icon" />
      )}
      {!isMap && <span className={cx(overScrollEllipsis, 'tab-label')}>{label}</span>}
      {!isMap && (
        <HoverRemove reveal="host" className="tab-x" label="Close Tab" onRemove={onClose} />
      )}
    </div>
  )
}
