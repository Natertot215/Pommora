import { useCallback } from 'react'
import { useSession } from '../Session/store'
import type { IconFavorites } from '@pommora/uix/Pickers/IconPicker/IconPicker'

const NONE: string[] = []

/** The nexus's favorite icons, bound for the IconPicker — personalization state plus the native menu. */
export function useIconFavorites(): IconFavorites {
  const ids = useSession((st) => st.personalization.favoriteIcons) ?? NONE
  const setPersonalization = useSession((st) => st.setPersonalization)
  const onChange = useCallback(
    (next: string[]) => setPersonalization('favoriteIcons', next.length ? next : undefined),
    [setPersonalization],
  )
  return { ids, onChange, onMenu: (isFavorite) => window.nexus.iconFavoriteMenu(isFavorite) }
}
