import { useMemo, useState } from 'react'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import { crumbSegments, useBundleBrowser } from '../Bundles/browser'
import { BundleRows, BundleTable, DateHeading } from '../Bundles/BundleTable'
import { countPhrase } from '../Nexus/entities'
import type { BundleRow } from '../Bundles/rows'
import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { useContentHost, useHostShown } from '../Interface/contentHost'
import { type ActionBar, useDeclareActions } from '../Interface/Notifications/notifications'
import { usePublishCount } from '../Interface/Subfield/publish'
import type { CollectionNode, SetNode } from '../Nexus/tree'
import { containerOwner } from '../Nexus/treeIndex'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { personalizationOf } from '../Session/configSlice'
import { useSession } from '../Session/store'
import '../Views/Table/table-view.css'
import { ARCHIVE_TITLE } from './archivePlace'
import './archive-view.css'

/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete. A Set discloses what it holds, and a page opens in the reader on a double-click. */
export function ArchiveView({
  owner,
  archiveId,
}: {
  owner: CollectionNode | SetNode
  archiveId: string
}): React.JSX.Element {
  const host = useContentHost()
  const shown = useHostShown()
  const query = useSession((s) => (host ? s.viewSearch[host.tabId]?.query : undefined)) ?? ''
  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
  const openReader = useSession((s) => s.openReader)
  const open = (row: BundleRow): void => {
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
  }
  const browser = useBundleBrowser(
    { kind: 'archive', id: archiveId },
    { query, shown, within: owner.kind === 'set' ? owner.id : undefined, open },
  )
  const { listing, visible } = browser
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const api = useStableApi({
    restore: () => void browser.restore(browser.picked),
    remove: () => void browser.remove(browser.picked),
  })
  const count = browser.picked.length > 0 ? countPhrase(browser.picked) : null
  const bar = useMemo<ActionBar | null>(
    () => (count === null ? null : { count, restore: api.restore, remove: api.remove }),
    [count, api],
  )
  useDeclareActions(bar)
  usePublishCount(listing.status === 'ready' ? browser.found : null)

  const footing = (): React.JSX.Element | null => {
    switch (listing.status) {
      case 'loading':
        return null
      case 'failed':
        return <div className="archive-empty">The archive couldn't be read.</div>
      case 'ready':
        if (visible.length > 0) return null
        return (
          <div className="archive-empty">
            {listing.rows.length === 0
              ? `This ${owner.kind === 'set' ? 'Set' : 'Collection'}'s archive is empty.`
              : 'Nothing matches.'}
          </div>
        )
    }
  }

  return (
    <InterfaceScaffold
      owner={containerOwner(owner)}
      trailing={ARCHIVE_TITLE}
      plain
      ready={listing.status !== 'loading'}
      scrollRef={setScrollEl}
    >
      <div className="table table-view">
        <BundleTable date={browser.date}>
          <div className="table-head">
            <div className="col-header">
              <span className="col-header-icon">
                <Icon name={propertyTypeIconName('title')} size="body" />
              </span>
              Title
            </div>
            <DateHeading
              date={browser.date}
              className="archive-date"
              label={
                <span>
                  <span className="col-header-icon">
                    <Icon name={propertyTypeIconName('dateTime')} size="body" />
                  </span>
                  Archived
                </span>
              }
            />
          </div>
          {visible.length > 0 && <BundleRows browser={browser} scrollEl={scrollEl} />}
        </BundleTable>
        {footing()}
      </div>
    </InterfaceScaffold>
  )
}
