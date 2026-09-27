import { useSession } from '../Session/store'
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
  const nav = useNavBase({
    gallery,
    search,
    pins: resolvedPins,
    recents: resolvedRecents,
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
      <div className="nav-view-scroll interface-inset scroll-fade">{nav.body}</div>
    </div>
  )
}
