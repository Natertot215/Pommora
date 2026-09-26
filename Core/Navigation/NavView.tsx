import { useSession } from '../Session/store'
import { moveByKey } from '@pommora/uix/Utilities/moveItem'
import { useNavData } from './useNavData'
import { usePublishCount } from '../Interface/Subfield/publish'
import { useNavBase } from './NavBase'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import { NavBanner } from './NavBanner'
import './nav-view.css'

export function NavView(): React.JSX.Element {
  const { resolvedRecents, resolvedPins, search, go } = useNavData()
  const gallery = useSession((s) => s.devicePrefs.navViewGallery === true)
  // NavWindow's freeze-at-open is for its persistent pane — NavView opens fresh each time.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(resolvedRecents, (r) => r.key, activeKey, overKey)
    if (next) setRecentsOrder(next.map((r) => r.key))
  }
  const nav = useNavBase({
    gallery,
    search,
    pins: resolvedPins,
    recents: resolvedRecents,
    onReorderRecent: reorderRecent,
    onSelect: (target) => go(target),
    onOpenNewTab: (target) => go(target, undefined, { newTab: true }),
  })
  usePublishCount(nav.count)

  return (
    <div className="nav-view">
      <NavBanner
        search={nav.search}
        empty={(add) => (
          <div className="nav-view-head">
            <AddBannerButton onClick={add} />
            {nav.search}
          </div>
        )}
      />
      <div className="nav-view-scroll interface-inset over-scroll">{nav.body}</div>
    </div>
  )
}
