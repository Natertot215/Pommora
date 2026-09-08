import { useState } from 'react'
import { valueOr } from '@pommora/core/Contract/result'
import type { Crop } from '@pommora/core/Nexus/schemas'
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { nexusIconMenuItems } from '@pommora/core/Actions/identityMenus'

export function useNexusIcon() {
  const profileImage = useSession((st) => st.tree?.nexus.profileImage ?? null)
  const profileIcon = useSession((st) => st.tree?.nexus.profileIcon)
  const mutate = useSession((st) => st.mutate)
  const [editing, setEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const openEditor = (): void => setEditing(true)
  const closeEditor = (): void => setEditing(false)

  const openMenu = async (): Promise<void> => {
    const action = await popMenu(
      nexusIconMenuItems({ hasPhoto: !!profileImage, hasGlyph: !!profileIcon }),
    )
    if (action === 'changeIcon') setPickerOpen(true)
    else if (action === 'addPhoto') {
      const source = valueOr(await host().ask('nexus:pickFile'), null)
      if (source && (await mutate({ op: 'setProfileImage', source }))) openEditor()
    } else if (action === 'editPhoto') openEditor()
    else if (action === 'removePhoto') await mutate({ op: 'setProfileImage', source: null })
    else if (action === 'removeIcon') await mutate({ op: 'setProfileIcon', icon: null })
  }

  const onSave = async (crop: Crop): Promise<void> => {
    closeEditor()
    if (profileImage) await mutate({ op: 'setCrop', image: profileImage, crop })
  }

  const onRepick = async (source: string): Promise<string | undefined> => {
    let adopted: string | undefined
    await mutate({ op: 'setProfileImage', source }, undefined, (a) => {
      adopted = a
    })
    return adopted
  }

  // Clears the photo — otherwise it would still outrank the newly picked glyph in display.
  const selectGlyph = (id: string): void => {
    setPickerOpen(false)
    void (async () => {
      await mutate({ op: 'setProfileIcon', icon: id })
      if (profileImage) await mutate({ op: 'setProfileImage', source: null })
    })()
  }

  return {
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
  }
}
