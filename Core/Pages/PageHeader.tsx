import { useRef, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { pageMetaOf, useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { IconChoice } from '../Assets/IconChoice'
import { entityIcon } from '../Assets/entityIconPolicy'
import { Banner } from '../Interface/Header/Banner'
import { AddBannerButton } from '../Interface/Header/AddBannerButton'
import { DetailTitleHeader } from '../Interface/Header/DetailTitleHeader'
import './page-header.css'
import { popMenu } from '../Actions/menuActions'
import { titleMenuItems } from '@pommora/core/Actions/identityMenus'

export interface HeaderPage {
  id: string
  path: string
  title: string
  cover?: string
}

export function PageHeader({
  page,
  onBannerDone,
  chrome = 'detail',
}: {
  page: HeaderPage
  onBannerDone: () => void
  chrome?: 'detail' | 'window'
}): React.ReactNode {
  const { id, path, title, cover } = page
  const meta = useSession(pageMetaOf(id))
  const setting = useSession((s) => s.personalization.titleIcon) === true
  const shown = meta?.title_icon ?? setting
  const coverSrc = useAssetUrl(cover)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const submitRename = useSession((s) => s.submitRename)
  const mutate = useSession((s) => s.mutate)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const toggleTitleIcon = (): void => {
    const next = !shown
    void mutate({ op: 'setPageMeta', path, patch: { title_icon: next === setting ? null : next } })
  }

  const iconRef = useRef<SVGSVGElement>(null)

  const glyph = entityIcon('page', meta?.icon, defaultIcons)
  const titleHeader = (
    <DetailTitleHeader
      title={title}
      icon={glyph}
      iconRef={iconRef}
      iconHidden={!shown}
      onRename={(newName) => submitRename(path, 'page', newName)}
      requestMenu={() => popMenu(titleMenuItems({ iconHidden: !shown }))}
      onEditIcon={() => setIconPickerOpen(true)}
      onToggleIcon={toggleTitleIcon}
    />
  )
  const banner = (
    <Banner
      path={path}
      kind="page"
      value={cover}
      onDone={onBannerDone}
      chrome={chrome}
      titleClassName="banner-overlay"
      title={titleHeader}
      empty={(add) =>
        chrome === 'window' ? null : (
          <>
            <AddBannerButton onClick={add} />
            {titleHeader}
            <div className="mdpm-divider" />
          </>
        )
      }
    />
  )
  // A windowed page without a banner draws no header at all; the band still holds the seat that takes the strip's Add Banner.
  if (chrome === 'window' && !coverSrc) return banner

  return (
    <div className={cx('mdpm-header header-park', coverSrc !== null && 'has-banner')}>
      {banner}
      <IconChoice
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        triggerRef={iconRef}
        value={meta?.icon}
        onSelect={(chosen) => void mutate({ op: 'setIcon', path, kind: 'page', icon: chosen })}
      />
    </div>
  )
}
