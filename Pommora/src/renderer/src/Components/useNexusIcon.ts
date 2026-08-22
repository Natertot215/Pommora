import { useState } from 'react'
import { useSession } from '../store'

/** A photo outranks a glyph in display; a glyph outranks the default placeholder. */
export function useNexusIcon() {
  const profileImage = useSession((st) => st.tree?.nexus.profileImage ?? null)
  const profileIcon = useSession((st) => st.tree?.nexus.profileIcon)
  const mutate = useSession((st) => st.mutate)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const openMenu = async (): Promise<void> => {
    const action = await window.nexus.iconMenu({
      hasPhoto: !!profileImage,
      hasGlyph: !!profileIcon,
    })
    if (action === 'changeIcon') setPickerOpen(true)
    else if (action === 'addPhoto') {
      const picked = await window.nexus.pickImage()
      const bytes = picked && (await window.nexus.imageData(picked))
      if (bytes) setCropImage(bytes)
    } else if (action === 'removePhoto') await mutate({ op: 'setProfileImage', dataUrl: null })
    else if (action === 'removeIcon') await mutate({ op: 'setProfileIcon', icon: null })
  }

  const confirmCrop = async (dataUrl: string): Promise<void> => {
    setCropImage(null)
    await mutate({ op: 'setProfileImage', dataUrl })
  }
  // Clears the photo — otherwise it would still outrank the newly picked glyph in display.
  const selectGlyph = (id: string): void => {
    setPickerOpen(false)
    void (async () => {
      await mutate({ op: 'setProfileIcon', icon: id })
      if (profileImage) await mutate({ op: 'setProfileImage', dataUrl: null })
    })()
  }

  return {
    profileImage,
    profileIcon,
    openMenu,
    cropImage,
    setCropImage,
    pickerOpen,
    setPickerOpen,
    confirmCrop,
    selectGlyph,
  }
}
