import { useRef } from 'react'
import { DEFAULT_NEXUS_ICON, Icon } from '@renderer/design-system/symbols'
import { IconPicker } from '../Components/IconPicker'
import { PhotoCropModal } from '../Components/PhotoCropModal'
import { useNexusIcon } from '../Components/useNexusIcon'
import { assetUrl } from '../assetUrl'
import * as s from './nexusHeader.css'

/** Click (homepage select) is owned by the wrapping ribbon button, not here. Rename-nexus lives
 *  on the homepage banner title, not here either. */
export function NexusPhoto({ size }: { size: number }): React.JSX.Element {
  const {
    profileImage,
    profileIcon,
    openMenu,
    cropImage,
    setCropImage,
    pickerOpen,
    setPickerOpen,
    confirmCrop,
    selectGlyph,
  } = useNexusIcon()
  const ref = useRef<HTMLSpanElement>(null)
  const photoUrl = profileImage ? assetUrl(profileImage) : null
  const dim = { width: size, height: size }
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
          <img className={s.photoImg} src={photoUrl} alt="" />
        ) : (
          <Icon name={profileIcon ?? DEFAULT_NEXUS_ICON} size={Math.round(size * 0.6)} />
        )}
      </span>
      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={ref}
        value={profileIcon}
        onSelect={selectGlyph}
      />
      {cropImage && (
        <PhotoCropModal
          image={cropImage}
          onCancel={() => setCropImage(null)}
          onConfirm={confirmCrop}
        />
      )}
    </>
  )
}
