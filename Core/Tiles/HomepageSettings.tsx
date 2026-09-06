import { useRef } from 'react'
import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import { useSession } from '../Session/store'
import { useAssetUrl } from '../Assets/useAssetUrl'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_NEXUS_ICON } from '../Assets/entityIconPolicy'
import { Button } from '@pommora/uix/Buttons'
import { AssetImage } from '../Assets/AssetImage'
import { ImagePicker } from '../Assets/ImagePicker'
import { InputField } from '@pommora/uix/Fields'
import { MenuFooting, MenuScrollFrame } from '@pommora/uix/Menus'
import { FooterLockButton } from '@pommora/uix/Menus'
import { IconPicker } from '../Assets/IconPicker'
import { useNexusIcon } from '../Assets/useNexusIcon'
import { tileHostKey, type TileHostRef } from '@pommora/core/Tiles/tiles'

import * as s from '@pommora/uix/Menus/frames.css'

const HOMEPAGE_HOST: TileHostRef = { kind: 'homepage' }

export function SettingsScaffold(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const locked = useSession((st) => st.hostLocks[tileHostKey(HOMEPAGE_HOST)] ?? false)
  const setHostLock = useSession((st) => st.setHostLock)
  const setLocked = (v: boolean): void => setHostLock(HOMEPAGE_HOST, v)
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
  const iconRef = useRef<HTMLButtonElement>(null)
  const photoUrl = useAssetUrl(profileImage)
  if (!tree || selection.kind !== 'homepage') return null

  return (
    <>
      <MenuScrollFrame
        footer={
          <MenuFooting
            leading={
              <FooterLockButton
                verb={lockLabel(locked)}
                noun="board"
                locked={locked}
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
