import { useRef } from 'react'
import { useSession } from '../../store'
import { DEFAULT_NEXUS_ICON, Icon } from '../../design-system/symbols'
import { InteractionField } from '../../design-system/components/InteractionField'
import { MenuBottomRow, MenuScrollFrame } from '../../design-system/components/menu'
import { footerLockAction, lockIcon } from '@renderer/design-system/components/menu/menu.css'
import { IconPicker } from '../IconPicker'
import { PhotoCropModal } from '../PhotoCropModal'
import { useNexusIcon } from '../useNexusIcon'
import { blockHostKey, type BlockHostRef } from '@shared/blocks'
import { assetUrl } from '../../assetUrl'
import * as s from './settingsPane.css'

const HOMEPAGE_HOST: BlockHostRef = { kind: 'homepage' }

/** Every other selection renders nothing here; Spaces edit their identity from the Contexts
 *  toolbar pane. */
export function SettingsScaffold(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const locked = useSession((st) => st.hostLocks[blockHostKey(HOMEPAGE_HOST)] ?? false)
  const setHostLocked = useSession((st) => st.setHostLocked)
  const setLocked = (v: boolean): Promise<void> => setHostLocked(HOMEPAGE_HOST, v)
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
              <Icon name={profileIcon ?? DEFAULT_NEXUS_ICON} />
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
