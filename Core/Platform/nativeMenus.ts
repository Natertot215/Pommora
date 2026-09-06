import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { useSession } from '../Session/store'
import { host } from './dialer'

export function useNativeMenus(): boolean {
  return useSession((st) => st.devicePrefs.nativeMenus ?? false)
}

/** Without a trigger the menu opens at the cursor, which is what a right-click wants. */
export function popRowMenu(
  items: ActionItem<string>[],
  trigger: HTMLElement | null | undefined,
): Promise<string | null> {
  const box = trigger?.getBoundingClientRect()
  return host().ask('row-menu', {
    items,
    anchor: box && { left: box.left, top: box.top, width: box.width, height: box.height },
  })
}
