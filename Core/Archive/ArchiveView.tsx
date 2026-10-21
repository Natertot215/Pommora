import { memo, useMemo, useState } from 'react'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { historical } from '@pommora/uix/Elements/nav-trail.css'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { EntityIcon } from '../Assets/EntityIcon'
import { entityIcon } from '../Assets/entityIconPolicy'
import { archivedKind, countPhrase, crumbSegments, useBundleBrowser } from '../Bundles/browser'
import type { BundleRow } from '../Bundles/rows'
import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { useContentHost } from '../Interface/contentHost'
import { type ActionBar, useDeclareActions } from '../Interface/Notifications/notifications'
import { usePublishCount } from '../Interface/Subfield/publish'
import type { CollectionNode, SetNode } from '../Nexus/tree'
import { containerOwner } from '../Nexus/treeIndex'
import { owningCollection } from '../Nexus/treePatch'
import { personalizationOf } from '../Session/configSlice'
import type { Personalization } from '../Settings/personalization'
import { useSession } from '../Session/store'
import { WIDTHS } from '../Views/Table/useColumns'
import '../Views/Table/table-view.css'
import './archive-view.css'

const ROW_H = 48
const ARCHIVE_COLS = `minmax(${WIDTHS.title.default}px, 1fr) ${WIDTHS.dateTime.default}px`

type RowApi = {
  toggle: (row: BundleRow) => void
  menu: (row: BundleRow) => void
  open: (row: BundleRow) => void
}

/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete, a page opened in the reader. */
export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): React.JSX.Element {
  const host = useContentHost()
  const shown = host !== null && !host.parked
  const query = useSession((s) => (host ? s.viewSearch[host.tabId]?.query : undefined)) ?? ''
  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
  const openReader = useSession((s) => s.openReader)
  const tree = useSession((s) => s.tree)
  const archiveId = useMemo(() => owningCollection(tree, owner)?.id ?? owner.id, [tree, owner])
  const browser = useBundleBrowser(
    { kind: 'archive', id: archiveId },
    { query, shown, within: owner.kind === 'set' ? owner.id : undefined },
  )
  const { listing, visible } = browser

  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
  const scrollEl = useMemo(() => listEl?.closest<HTMLElement>('.detail-scroll') ?? null, [listEl])
  const { rows: slots, height } = useVirtualRows(
    { count: visible.length, rowHeight: ROW_H, listEl, scrollEl },
    [owner.banner],
  )

  const api = useStableApi({
    toggle: (row: BundleRow) => browser.toggle(row.bundlePath),
    menu: (row: BundleRow) => void browser.openMenu(row),
    open: (row: BundleRow) => {
      const stored = row.stored
      if (!stored) return
      openReader({
        kind: 'archive',
        page: { kind: 'page', ...stored },
        trail: [
          ...crumbSegments(row.crumbs, defaultIcons),
          { title: row.title, icon: entityIcon('page', row.icon, defaultIcons) },
        ],
      })
    },
    restore: () => void browser.restore(browser.picked),
    remove: () => void browser.remove(browser.picked),
  })
  const count = browser.picked.length > 0 ? countPhrase(browser.picked) : null
  const bar = useMemo<ActionBar | null>(
    () => (count === null ? null : { count, restore: api.restore, remove: api.remove }),
    [count, api],
  )
  useDeclareActions(bar)
  usePublishCount(listing.status === 'ready' ? visible.length : null)

  const footing = (): React.JSX.Element | null => {
    switch (listing.status) {
      case 'loading':
        return null
      case 'failed':
        return <div className="archive-empty">The archive couldn't be read.</div>
      case 'ready':
        return listing.rows.length === 0 ? (
          <div className="archive-empty">
            This {owner.kind === 'set' ? 'Set' : 'Collection'}'s archive is empty.
          </div>
        ) : null
    }
  }

  return (
    <InterfaceScaffold
      owner={containerOwner(owner)}
      trailing={<span className="archive-title-label">Archive</span>}
    >
      <div className="table table-view">
        <div
          className={cx('table-grid', text.body.standard)}
          style={{ '--cols': ARCHIVE_COLS } as React.CSSProperties}
        >
          <div className="table-head">
            <div className="col-header">Title</div>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are */}
            <div className="col-header archive-date" onContextMenu={browser.date.onContextMenu}>
              Archived
            </div>
          </div>
          <div ref={setListEl} className="archive-rows" style={{ height }}>
            {slots.map(({ index, start }) => {
              const row = visible[index]
              return (
                <ArchiveRow
                  key={row.bundlePath}
                  row={row}
                  start={start}
                  lead={index === 0}
                  checked={browser.checked.has(row.bundlePath)}
                  revealed={browser.checked.size > 0}
                  when={browser.date.when(row.storedAt)}
                  icons={defaultIcons}
                  api={api}
                />
              )
            })}
          </div>
        </div>
        {footing()}
      </div>
    </InterfaceScaffold>
  )
}

const ArchiveRow = memo(function ArchiveRow({
  row,
  start,
  lead,
  checked,
  revealed,
  when,
  icons,
  api,
}: {
  row: BundleRow
  start: number
  lead: boolean
  checked: boolean
  revealed: boolean
  when: string
  icons: Personalization['defaultIcons']
  api: RowApi
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click anywhere on a row checks it, as a Trash row does; the box in its gutter is the keyboard's door
    <div
      className={cx('data-row', lead && 'row-lead')}
      data-reveal-host={revealed ? 'on' : ''}
      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
      onClick={() => api.toggle(row)}
      onContextMenu={(e) => {
        e.preventDefault()
        api.menu(row)
      }}
    >
      <div className="data-cell cell-lead">
        <span className={cx('row-check', revealTarget)} data-reveal-held={checked || undefined}>
          <Checkbox
            size="compact"
            state={checked}
            onChange={() => api.toggle(row)}
            ariaLabel={`Select ${row.title}`}
          />
        </span>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a page's title is the pointer's door to the reader; a Set's opens nothing and its click checks the row */}
        <span
          className={cx(overScrollLabel, 'cell-title')}
          onClick={
            row.kind === 'page'
              ? (e) => {
                  e.stopPropagation()
                  api.open(row)
                }
              : undefined
          }
        >
          <EntityIcon kind={archivedKind(row)} icon={row.icon} size="body" />
          <span className="cell-title-text">{row.title}</span>
        </span>
        <NavTrail
          segments={crumbSegments(row.crumbs, icons)}
          iconSize="control"
          className={cx(row.historical && historical)}
        />
      </div>
      <div className="data-cell archive-date">{when}</div>
    </div>
  )
})
