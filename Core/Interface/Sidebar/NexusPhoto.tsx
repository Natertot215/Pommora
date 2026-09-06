import { useRef } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_NEXUS_ICON } from '../../Assets/entityIconPolicy'
import { ICON_PX, type IconSize } from '@pommora/uix/Theme/theme-vars.css'
import { NexusIconEditors } from '../../Assets/NexusIconEditors'
import { useNexusIcon } from '../../Assets/useNexusIcon'
import { useAssetUrl } from '../../Assets/useAssetUrl'
import { AssetImage } from '../../Assets/AssetImage'
import * as s from './nexus-header.css'

export function NexusPhoto({ size }: { size: IconSize }): React.JSX.Element {
  const icon = useNexusIcon()
  const ref = useRef<HTMLSpanElement>(null)
  const photoUrl = useAssetUrl(icon.profileImage)
  const px = ICON_PX[size]
  const dim = { width: px, height: px }
  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
      <span
        ref={ref}
        className={photoUrl ? s.photo : `${s.photo} ${s.photoEmpty}`}
        style={dim}
        onContextMenu={(e) => {
          e.preventDefault()
          void icon.openMenu()
        }}
        title="Right-click to set an icon or photo"
      >
        {photoUrl ? (
          <AssetImage value={icon.profileImage} />
        ) : (
          <Icon name={icon.profileIcon ?? DEFAULT_NEXUS_ICON} size={Math.round(px * 0.6)} />
        )}
      </span>
      <NexusIconEditors icon={icon} triggerRef={ref} />
    </>
  )
}
