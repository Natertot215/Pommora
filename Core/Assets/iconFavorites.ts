import { useCallback } from 'react'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import type { IconFavorites } from '@pommora/uix/Pickers/IconPicker'
import { popMenu } from '../Actions/menuActions'
import { iconFavoriteMenuItems } from '../Actions/identityMenus'

const NONE: string[] = []

export function useIconFavorites(): IconFavorites {
  const ids = useSession((st) => personalizationOf(st).iconFavorites) ?? NONE
  const setPersonalization = useSession((st) => st.setPersonalization)
  const onChange = useCallback(
    (next: string[]) => setPersonalization('iconFavorites', next.length ? next : undefined),
    [setPersonalization],
  )
  return {
    ids,
    onChange,
    onMenu: (isIconFavorite) => popMenu(iconFavoriteMenuItems(isIconFavorite)),
  }
}
