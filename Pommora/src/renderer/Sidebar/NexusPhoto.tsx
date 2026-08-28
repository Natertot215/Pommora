import { useRef } from 'react'
import { DEFAULT_NEXUS_ICON, Icon } from '@renderer/DesignSystem/Symbols'
import { ICON_PX, type IconSize } from '@renderer/DesignSystem/Tokens/size.css'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { ImagePicker } from '@renderer/DesignSystem/Pickers/ImagePicker/ImagePicker'
import { useNexusIcon } from '@renderer/Utilities/useNexusIcon'
import { useAssetUrl } from '../store'
import { AssetImage } from '@renderer/Assets/AssetImage'
import * as s from './nexusHeader.css'

/** Click (homepage select) is owned by the wrapping ribbon button, not here. Rename-nexus lives
 *  on the homepage banner title, not here either. */
export function NexusPhoto({ size }: { size: IconSize }): React.JSX.Element {
  const {
    profileImage,
    profileIcon,
    openMenu,
    editing,
    closeEditor,
    onSave,
    onRepick,
    pickerOpen,
    setPickerOpen,
    selectGlyph,
  } = useNexusIcon()
  const ref = useRef<HTMLSpanElement>(null)
  const photoUrl = useAssetUrl(profileImage)
  // The photo is an element, not a glyph — it needs the step's pixel value, and the fallback
  // glyph is drawn inset within it.
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
          void openMenu()
        }}
        title="Right-click to set an icon or photo"
      >
        {photoUrl ? (
          <AssetImage value={profileImage} />
        ) : (
          <Icon name={profileIcon ?? DEFAULT_NEXUS_ICON} size={Math.round(px * 0.6)} />
        )}
      </span>
      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={ref}
        value={profileIcon}
        onSelect={selectGlyph}
      />
      <ImagePicker
        open={editing}
        value={profileImage ?? ''}
        shape="circle"
        boxAspect={1}
        onCancel={closeEditor}
        onSave={onSave}
        onRepick={onRepick}
      />
    </>
  )
}
