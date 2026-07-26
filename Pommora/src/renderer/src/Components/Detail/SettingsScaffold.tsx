import { useRef } from 'react'
import { useSession } from '../../store'
import { Icon } from '../../design-system/symbols'
import { InteractionField } from '../../design-system/components/InteractionField'
import { MenuBottomRow, MenuScrollFrame } from '../../design-system/components/menu'
import { footerLockAction, lockIcon } from '../../Blocks/handleMenu.css'
import { IconPicker } from '../IconPicker'
import { PhotoCropModal } from '../PhotoCropModal'
import { useNexusIcon } from '../useNexusIcon'
import { assetUrl } from '../../assetUrl'
import * as s from './settingsPane.css'

/**
 * The stripped settings pane for the homepage — an icon+title header with none of SettingsPane's
 * view-config leaves (Layout/Group/Filter/Sort are view concepts). The homepage identity is the
 * nexus itself: a photo-or-glyph icon opening the native icon menu, plus the board-lock footer.
 * Every other selection renders nothing; Spaces edit their identity from the Contexts toolbar pane.
 */
export function SettingsScaffold(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const locked = useSession((st) => st.homepageLocked)
  const setLocked = useSession((st) => st.setHomepageLocked)
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
  const iconRef = useRef<HTMLButtonElement>(null)
  if (!tree || selection.kind !== 'homepage') return null

  const photoUrl = profileImage ? assetUrl(profileImage) : null
  return (
    <>
      <MenuScrollFrame
        footer={
          <MenuBottomRow
            leading={
              <button
                type="button"
                aria-label={locked ? 'Unlock board' : 'Lock board'}
                className={footerLockAction}
                onClick={() => void setLocked(!locked)}
              >
                <Icon name="lock" size={12} className={lockIcon} />
                {locked ? 'Unlock' : 'Lock'}
              </button>
            }
          />
        }
      >
        <div className={s.header}>
          <button
            ref={iconRef}
            type="button"
            className={s.iconButton}
            onClick={() => void openMenu()}
            aria-label="Change the nexus icon or photo"
          >
            {photoUrl ? (
              <img className={s.headerPhotoImg} src={photoUrl} alt="" />
            ) : (
              <Icon name={profileIcon ?? 'square-dashed'} />
            )}
          </button>
          <InteractionField className={s.titleField}>{tree.nexus.name}</InteractionField>
        </div>
      </MenuScrollFrame>
      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={iconRef}
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
