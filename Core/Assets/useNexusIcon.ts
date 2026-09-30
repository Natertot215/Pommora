import { useState } from 'react'
import { valueOr } from '../Contract/result'
import type { Crop } from '../Nexus/schemas'
import { useSession } from '../Session/store'
import { dialer } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { type NexusIconAction, nexusIconMenuItems } from '../Actions/identityMenus'
import { asRenderableIcon } from '@pommora/uix/Symbols'

export function useNexusIcon() {
  const profileImage = useSession((st) => st.tree?.nexus.profileImage ?? null)
  const profileIcon = useSession((st) => st.tree?.nexus.profileIcon)
  const mutate = useSession((st) => st.mutate)
  const [editor, setEditor] = useState<'glyph' | 'file' | 'crop' | null>(null)
  const holds = {
    hasPhoto: !!profileImage,
    hasGlyph: !!asRenderableIcon(profileIcon),
  }

  const closeEditor = (): void => setEditor(null)

  const run = async (action: NexusIconAction | null): Promise<void> => {
    if (action === 'editIcon') setEditor('glyph')
    else if (action === 'addPhoto') {
      setEditor('file')
      const source = valueOr(await dialer().ask('nexus:pickFile'), null)
      if (source && (await mutate({ op: 'setProfileImage', source }))) {
        if (profileIcon) await mutate({ op: 'setProfileIcon', icon: null })
        setEditor('crop')
      } else closeEditor()
    } else if (action === 'editPhoto') setEditor('crop')
    else if (action === 'resetIcon') {
      if (profileImage) await mutate({ op: 'setProfileImage', source: null })
      if (profileIcon) await mutate({ op: 'setProfileIcon', icon: null })
    }
  }

  const openMenu = async (): Promise<void> => run(await popMenu(nexusIconMenuItems(holds)))

  const onSave = async (crop: Crop): Promise<void> => {
    closeEditor()
    if (profileImage) await mutate({ op: 'setCrop', image: profileImage, crop })
  }

  const onRepick = async (source: string): Promise<string | undefined> =>
    (await mutate({ op: 'setProfileImage', source }))?.adopted

  // Clears the photo — otherwise it would still outrank the newly picked glyph in display.
  const selectGlyph = (id: string): void => {
    closeEditor()
    void (async () => {
      await mutate({ op: 'setProfileIcon', icon: id })
      if (profileImage) await mutate({ op: 'setProfileImage', source: null })
    })()
  }

  return {
    profileImage,
    profileIcon,
    holds,
    editor,
    run,
    openMenu,
    closeEditor,
    onSave,
    onRepick,
    selectGlyph,
  }
}
