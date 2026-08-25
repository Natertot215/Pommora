import { useState } from 'react'
import type { Crop } from '@shared/schemas'
import { useSession } from '../store'

/** A photo outranks a glyph in display; a glyph outranks the default placeholder. */
export function useNexusIcon() {
  const profileImage = useSession((st) => st.tree?.nexus.profileImage ?? null)
  const profileIcon = useSession((st) => st.tree?.nexus.profileIcon)
  const mutate = useSession((st) => st.mutate)
  const [editing, setEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const openEditor = (): void => setEditing(true)
  const closeEditor = (): void => setEditing(false)

  const openMenu = async (): Promise<void> => {
    const action = await window.nexus.iconMenu({
      hasPhoto: !!profileImage,
      hasGlyph: !!profileIcon,
    })
    if (action === 'changeIcon') setPickerOpen(true)
    else if (action === 'addPhoto') {
      const source = await window.nexus.pickFile()
      if (source && (await mutate({ op: 'setProfileImage', source }))) openEditor()
    } else if (action === 'removePhoto') await mutate({ op: 'setProfileImage', source: null })
    else if (action === 'removeIcon') await mutate({ op: 'setProfileIcon', icon: null })
  }

  const onSave = async (crop: Crop): Promise<void> => {
    closeEditor()
    if (profileImage) await mutate({ op: 'setCrop', image: profileImage, crop })
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
    openEditor,
    closeEditor,
    onSave,
    pickerOpen,
    setPickerOpen,
    selectGlyph,
  }
}
