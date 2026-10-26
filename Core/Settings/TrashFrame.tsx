import { useState } from 'react'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { cx } from '@pommora/uix/Utilities/cx'
import { Icon } from '@pommora/uix/Symbols'
import { text } from '@pommora/uix/Theme'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { useSession } from '../Session/store'
import { useBundleBrowser } from '../Bundles/browser'
import { BundleRows, BundleTable, DateHeading } from '../Bundles/BundleTable'
import '../Navigation/nav-list.css'
import './trash-frame.css'

// Keyed on the nexus so a switch with Settings open mounts a body with its own list.
export function TrashFrame(): React.JSX.Element {
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  return <TrashBody key={nexusId} />
}

function TrashBody(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const browser = useBundleBrowser({ kind: 'trash' }, { query, shown: true })
  const { listing, visible, date } = browser
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  const footing = (): React.JSX.Element | null => {
    switch (listing.status) {
      case 'loading':
        return null
      case 'failed':
        return (
          <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
        )
      case 'ready':
        if (visible.length > 0) return null
        return (
          <div className={cx('trash-empty', text.body.standard)}>
            {listing.rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
          </div>
        )
    }
  }

  return (
    <div className="trash-frame table">
      <div className="nav-search-row">
        <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
      </div>
      <div className="trash-table">
        <BundleTable date={date}>
          <div className="trash-head table-head">
            <span className="trash-head-name col-header">
              <span className="trash-head-glyph">
                <Icon name={propertyTypeIconName('title')} size="body" />
              </span>
              File Name
            </span>
            <DateHeading
              date={date}
              className="trash-head-date"
              label={
                <span className="trash-head-label">
                  <Icon name="clock-fading" size="body" />
                  Time Deleted
                </span>
              }
            />
          </div>
          {visible.length > 0 && (
            <div ref={setScrollEl} className="trash-scroll scroll-fade">
              <BundleRows browser={browser} scrollEl={scrollEl} />
            </div>
          )}
        </BundleTable>
      </div>
      {footing()}
      <Scrollbar of={scrollEl} />
    </div>
  )
}
