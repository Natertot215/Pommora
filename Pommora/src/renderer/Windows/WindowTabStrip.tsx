import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@renderer/DesignSystem/Interactions/HoverRemove'
import { SortableZone, useDragItem } from '@renderer/DesignSystem/Interactions/drag'
import { DEFAULT_ENTITY_ICONS, Icon } from '@renderer/DesignSystem/Symbols'
import { duration, ms } from '@renderer/DesignSystem/Animation'
import { text } from '@renderer/DesignSystem/Tokens'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { resolveWith, type ResolveIndex, type ResolvedNav } from '../Navigation/navResolve'
import { useExitPresence } from '@renderer/DesignSystem/Animation/useExitPresence'
import { useSession } from '../store'
import type { PreviewTab } from './windowTabs'
import '../Tabs/tabStrip.css'
import './windowTabStrip.css'

const BASE_MS = ms(duration.base)
/** The toolbar strip's EXIT_MS twin. */
const EXIT_MS = BASE_MS + ms(duration.fast)
const TAB_ICON = 'control'

interface Entry {
  tab: PreviewTab
  res: ResolvedNav | null
}

// The morph owner between the centered breadcrumb title and the left-aligned strip on the shared
// tab-open motion. Ghost-closing keeps the strip mounted so the last collapse plays before the
// title returns.
export function WindowTabStrip({
  index,
  title,
}: {
  index: ResolveIndex | null
  title: React.ReactNode
}): React.JSX.Element {
  const preview = useSession((s) => s.preview)
  const activatePreviewTab = useSession((s) => s.activatePreviewTab)
  const closePreviewTab = useSession((s) => s.closePreviewTab)
  const reorderPreviewTabs = useSession((s) => s.reorderPreviewTabs)
  const tabs = preview?.tabs
  const activeTabId = preview?.activeTabId

  const entries = useMemo<Entry[]>(
    () =>
      (tabs ?? []).map((tab) => ({
        tab,
        res: tab.target.kind === 'page' && index ? resolveWith(index, tab.target) : null,
      })),
    [tabs, index],
  )

  // Store-first close with a rendered ghost for the width-collapse exit (the toolbar's pattern).
  const [ghosts, setGhosts] = useState<ReadonlyMap<string, { entry: Entry; index: number }>>(
    new Map(),
  )
  const requestClose = (id: string): void => {
    const i = entries.findIndex((e) => e.tab.id === id)
    const entry = entries[i]
    if (!entry) return
    setGhosts((m) => new Map(m).set(id, { entry, index: i }))
    closePreviewTab(id)
    setTimeout(() => {
      setGhosts((m) => {
        const next = new Map(m)
        next.delete(id)
        return next
      })
    }, EXIT_MS)
  }
  const renderEntries = useMemo<{ entry: Entry; ghost: boolean }[]>(() => {
    const live = entries
      .filter((e) => !ghosts.has(e.tab.id))
      .map((entry) => ({ entry, ghost: false }))
    for (const [, g] of [...ghosts.entries()].sort((a, b) => a[1].index - b[1].index)) {
      live.splice(Math.min(g.index, live.length), 0, { entry: g.entry, ghost: true })
    }
    return live
  }, [entries, ghosts])
  const firstLive = renderEntries.findIndex((e) => !e.ghost)

  const showStrip = (tabs?.length ?? 0) > 1 || ghosts.size > 0
  const titlePresence = useExitPresence(!showStrip)
  // The exiting title fades out as WHAT IT WAS — crumbs re-derive from the new active tab, so the
  // live node would swap text mid-collapse without this hold.
  const heldTitle = useRef(title)
  if (!showStrip) heldTitle.current = title

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
          {titlePresence.closing ? heldTitle.current : title}
        </div>
      )}
      <div className="page-window-tabwrap">
        {showStrip && (
          <div className="page-window-tabscroll over-scroll-x" ref={scrollRef}>
            {/* The map sentinel and ghosts stay out of the item set — drag-inert and un-landable. */}
            <SortableZone
              items={renderEntries
                .filter((e) => !e.ghost && e.entry.tab.target.kind === 'page')
                .map((e) => e.entry.tab.id)}
              layout="list"
              axis="x"
              onReorder={reorderPreviewTabs}
            >
              <div className="page-window-tabstrip" role="tablist" aria-label="Preview tabs">
                {renderEntries.map(({ entry, ghost }, i) => (
                  <Fragment key={entry.tab.id}>
                    {i > 0 && (
                      <span
                        className={cx('tab-seg', (ghost || i === firstLive) && 'is-closing')}
                        aria-hidden
                      />
                    )}
                    <PreviewTabItem
                      entry={entry}
                      navFlavor={preview?.flavor === 'nav'}
                      active={!ghost && entry.tab.id === activeTabId}
                      closing={ghost}
                      onActivate={() => activatePreviewTab(entry.tab.id)}
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

function PreviewTabItem({
  entry,
  navFlavor,
  active,
  closing,
  onActivate,
  onClose,
}: {
  entry: Entry
  navFlavor: boolean
  active: boolean
  closing: boolean
  onActivate: () => void
  onClose: () => void
}): React.JSX.Element {
  const isMap = entry.tab.target.kind === 'navwindow'
  const label = isMap ? 'Navigation' : (entry.res?.title ?? '')
  // A page tab whose own icon is ALSO the map glyph renders its type icon instead — nothing
  // masquerades as the perma-pinned NavWindow tab.
  const res =
    navFlavor && entry.res?.icon === 'map'
      ? { ...entry.res, icon: DEFAULT_ENTITY_ICONS.page }
      : entry.res
  // Inert unless this id is in the zone's item set (map + ghosts never are).
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
      {/* The map tab is icon-only — the label is its tooltip. */}
      {!isMap && <span className={cx(overScrollEllipsis, 'tab-label')}>{label}</span>}
      {/* The map tab is perma-pinned — no ×; the model refuses the close anyway. */}
      {!isMap && (
        <HoverRemove reveal="host" className="tab-x" label="Close Tab" onRemove={onClose} />
      )}
    </div>
  )
}
