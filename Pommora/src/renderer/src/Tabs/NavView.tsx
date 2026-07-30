import { useMemo, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import type { NavRef } from '@shared/types'
import { useSession } from '../store'
import { assetUrl } from '../assetUrl'
import { splitSearch, useNavData } from '../Navigation/useNavData'
import { NavGallery } from '../NavWindow/NavGallery'
import { NavList } from '../Navigation/NavList'
import { AddBannerButton } from '../Detail/Banner/AddBannerButton'
import '../Detail/Banner/Banner.css'
import './navView.css'

export function NavView(): React.JSX.Element {
  // resolvedRecents arrives already pin-deduped (useNavData filters against the pin set).
  const { resolvedRecents, resolvedPins, search, go } = useNavData()
  const viewMode = useSession((s) => s.navViewMode)
  // NavWindow's freeze-at-open is for its persistent pane — NavView opens fresh each time, so it
  // isn't needed here.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderRecent = (activeKey: string, overKey: string): void => {
    const from = resolvedRecents.findIndex((r) => r.key === activeKey)
    const to = resolvedRecents.findIndex((r) => r.key === overKey)
    if (from === -1 || to === -1 || from === to) return
    const next = [...resolvedRecents]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setRecentsOrder(next.map((r) => r.key))
  }
  const ownBanner = useSession((s) => s.tree?.navView.banner)
  const homeBanner = useSession((s) => s.tree?.homepage.banner)
  const banner = ownBanner ?? homeBanner
  const mutate = useSession((s) => s.mutate)
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? splitSearch(search(query)) : null), [query, search])
  const open = (target: NavRef): void => go(target)
  const openNew = (target: NavRef): void => go(target, undefined, { newTab: true })

  // Remove clears only NavView's own override (falls back to the homepage banner) — offered only
  // while an override exists.
  const changeBanner = async (): Promise<void> => {
    const dataUrl = await window.nexus.pickImage()
    if (dataUrl) await mutate({ op: 'setBanner', path: '', kind: 'navview', dataUrl })
  }
  const onBannerMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    const action = await window.nexus.bannerMenu({ noRemove: !ownBanner })
    if (action === 'change') await changeBanner()
    else if (action === 'remove')
      await mutate({ op: 'setBanner', path: '', kind: 'navview', dataUrl: null })
  }

  const searchInput = (
    <input
      className={cx('nav-view-search', text.body.standard)}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search…"
      spellCheck={false}
    />
  )

  return (
    <div className="nav-view">
      {banner ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <div className="banner nav-view-banner" onContextMenu={(e) => void onBannerMenu(e)}>
          <img className="banner-img" src={assetUrl(banner)} alt="" />
          <div className="banner-title">{searchInput}</div>
        </div>
      ) : (
        <div className="nav-view-head">
          <AddBannerButton onClick={() => void changeBanner()} />
          {searchInput}
        </div>
      )}
      <div className="nav-view-scroll edge-fade">
        {/* Search always renders Gallery cards (frozen layout) — the toggle governs only the
            recents/empty view. */}
        {results ? (
          <NavGallery
            pins={[]}
            items={results.items}
            frozenLayout
            onSelect={open}
            onOpenNewTab={openNew}
          />
        ) : viewMode === 'list' ? (
          <NavList
            pins={resolvedPins}
            items={resolvedRecents}
            reorderable
            onReorderRecent={reorderRecent}
            onSelect={open}
            onOpenNewTab={openNew}
          />
        ) : (
          <NavGallery
            pins={resolvedPins}
            items={resolvedRecents}
            onSelect={open}
            onOpenNewTab={openNew}
          />
        )}
      </div>
    </div>
  )
}
