import { useCallback } from 'react'
import { useSession } from '../Session/store'
import type { IconFavorites } from '@pommora/uix/Pickers/IconPicker/IconPicker'
import { host } from '../Platform/dialer'

const NONE: string[] = []

export function useIconFavorites(): IconFavorites {
  const ids = useSession((st) => st.personalization.favoriteIcons) ?? NONE
  const setPersonalization = useSession((st) => st.setPersonalization)
  const onChange = useCallback(
    (next: string[]) => setPersonalization('favoriteIcons', next.length ? next : undefined),
    [setPersonalization],
  )
  return { ids, onChange, onMenu: (isFavorite) => host().ask('icon-favorite-menu', isFavorite) }
}
