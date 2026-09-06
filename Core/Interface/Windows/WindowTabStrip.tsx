import { Fragment, useEffect, useMemo, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Elements/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Labels/HoverRemove'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme'
import { EntityIcon } from '../../Assets/EntityIcon'
import { resolveWith, type ResolveIndex, type ResolvedNav } from '../../Navigation/navResolve'
import { useTabClose } from '../../Navigation/tabClose'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useHeld } from '@pommora/uix/Animations/useHeld'
import { useSession } from '../../Session/store'
import type { WindowTab } from './windowTabs'
import '../../Navigation/tab-base.css'

const TAB_ICON = 'control'

interface Entry {
  tab: WindowTab
  res: ResolvedNav | null
}

// Ghost-closing keeps the strip mounted so the last collapse plays before the title returns.
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
  const tabs = pageWindow?.tabs
  const activeTabId = pageWindow?.activeTabId

  const entries = useMemo<Entry[]>(
    () =>
      (tabs ?? []).map((tab) => ({
        tab,
        res: tab.target.kind === 'page' && index ? resolveWith(index, tab.target) : null,
      })),
    [tabs, index],
  )

  const { renderEntries, firstLive, ghostCount, requestClose } = useTabClose(
    entries,
    closeWindowTab,
  )

  const showStrip = (tabs?.length ?? 0) > 1 || ghostCount > 0
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
        {showStrip && (
          <div className="tab-scroll over-scroll-x" ref={scrollRef}>
            <SortableZone
              items={renderEntries
                .filter((e) => !e.ghost && e.entry.tab.target.kind === 'page')
                .map((e) => e.entry.tab.id)}
              layout="list"
              axis="x"
              onReorder={reorderWindowTabs}
            >
              <div className="tab-strip" role="tablist" aria-label="Preview tabs">
                {renderEntries.map(({ entry, ghost }, i) => (
                  <Fragment key={entry.tab.id}>
                    {i > 0 && (
                      <span
                        className={cx('tab-seg', (ghost || i === firstLive) && 'is-closing')}
                        aria-hidden
                      />
                    )}
                    <WindowTabItem
                      entry={entry}
                      navKind={pageWindow?.kind === 'nav'}
                      active={!ghost && entry.tab.id === activeTabId}
                      closing={ghost}
                      onActivate={() => activateWindowTab(entry.tab.id)}
                      onClose={() => requestClose(entry.tab.id)}
                    />
                  </Fragment>
                ))}
              </div>
            </SortableZone>
          </div>
        )}
      </div>
    </>
  )
}

function WindowTabItem({
  entry,
  navKind,
  active,
  closing,
  onActivate,
  onClose,
}: {
  entry: Entry
  navKind: boolean
  active: boolean
  closing: boolean
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
  const drag = useDragItem(entry.tab.id)
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space/Enter lift), which a spread hides from static analysis
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      {...drag.handle}
      data-tab-id={entry.tab.id}
      className={cx(
        'tab',
        hoverRemoveHost,
        text.caption.standard,
        active && 'is-active',
        closing && 'is-closing',
        isMap && 'tab-map',
        drag.isDragging && 'is-dragging',
      )}
      title={label}
      role="tab"
      aria-selected={active}
      // Roving tabindex: the strip is ONE tab stop, the active tab holds it.
      tabIndex={active ? 0 : -1}
      onClick={() => {
        if (!drag.isDragging) onActivate()
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
