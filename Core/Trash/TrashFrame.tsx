import { useState } from 'react'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { useSession } from '../Session/store'
import { useBundleBrowser } from '../Bundles/browser'
import { BundleFooting, BundleRows, BundleTable, useDateColumn } from '../Bundles/BundleTable'
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
  const date = useDateColumn('trash')
  const { visible } = browser
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  return (
    <div className="trash-frame table">
      <div className="nav-search-row">
        <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
      </div>
      <div className="trash-table">
        <BundleTable
          date={date}
          titleHead={{ icon: propertyTypeIconName('title'), label: 'File Name' }}
          dateHead={{ icon: 'clock-fading', label: 'Time Deleted' }}
        >
          {visible.length > 0 && (
            <div ref={setScrollEl} className="trash-scroll scroll-fade">
              <BundleRows browser={browser} date={date} scrollEl={scrollEl} />
            </div>
          )}
        </BundleTable>
      </div>
      <BundleFooting
        browser={browser}
        className={cx('trash-empty', text.body.standard)}
        failed="The trash couldn't be read."
        empty="Trash is empty."
      />
      <Scrollbar of={scrollEl} />
    </div>
  )
}
