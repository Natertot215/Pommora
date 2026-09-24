import type { ReactNode } from 'react'
import { useSession } from '../Session/store'
import { Banner } from '../Interface/Header/Banner'
import './nav-view.css'

/** NavView's banner, with the search field as its title; `empty` draws the head when there is no banner to show. */
export function NavBanner({
  search,
  empty,
  chrome = 'detail',
}: {
  search: ReactNode
  empty: (add: () => void) => ReactNode
  chrome?: 'detail' | 'window'
}): ReactNode {
  const ownBanner = useSession((s) => s.navBanner)
  const homeBanner = useSession((s) => s.tree?.homepage.banner)
  // Remove clears only NavView's own override — `noRemove` when the shown banner is inherited.
  return (
    <Banner
      path=""
      kind="navview"
      value={ownBanner ?? homeBanner}
      noRemove={!ownBanner}
      chrome={chrome}
      className="nav-view-banner"
      title={search}
      empty={empty}
    />
  )
}
