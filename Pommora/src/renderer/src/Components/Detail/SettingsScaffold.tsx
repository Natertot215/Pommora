import { useRef } from 'react'
import { lockLabel } from '@shared/toggleLabels'
import { useAssetUrl, useSession } from '../../store'
import { DEFAULT_NEXUS_ICON, Icon } from '@renderer/DesignSystem/Symbols'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { AssetImage } from '@renderer/DesignSystem/Components/AssetImage/AssetImage'
import { InputField } from '@renderer/DesignSystem/Components/Fields'
import { MenuBottomRow, MenuScrollFrame } from '@renderer/DesignSystem/Components/Menu'
import { FooterLockButton } from '@renderer/DesignSystem/Components/Menu'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { PhotoCropModal } from '@renderer/DesignSystem/Components/PhotoCropModal/PhotoCropModal'
import { useNexusIcon } from '../useNexusIcon'
import { blockHostKey, type BlockHostRef } from '@shared/blocks'

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
  const photoUrl = useAssetUrl(profileImage)
  if (!tree || selection.kind !== 'homepage') return null

  return (
    <>
      <MenuScrollFrame
        footer={
          <MenuBottomRow
            leading={
              <FooterLockButton
                verb={lockLabel(locked)}
                noun="board"
                onToggle={() => void setLocked(!locked)}
              />
            }
          />
        }
      >
        <div className={s.header}>
          <Button
            ref={iconRef}
            type="filled"
            size="button-medium"
            paddingX="0"
            className={s.iconButton}
            onClick={() => void openMenu()}
            aria-label="Change the nexus icon or photo"
          >
            {photoUrl ? (
              <AssetImage value={profileImage} className={s.headerPhotoImg} />
            ) : (
              <Icon name={profileIcon ?? DEFAULT_NEXUS_ICON} />
            )}
          </Button>
          <InputField className={s.titleField}>{tree.nexus.name}</InputField>
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
