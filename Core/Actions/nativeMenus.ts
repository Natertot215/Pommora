import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'

export function useNativeMenus(): boolean {
  return useSession((st) => st.devicePrefs.nativeMenus ?? false)
}

/** Without a trigger the menu opens at the cursor, which is what a right-click wants. */
export async function popRowMenu<A extends string>(
  items: readonly ActionItem<A>[],
  trigger?: HTMLElement | null,
): Promise<A | null> {
  const box = trigger?.getBoundingClientRect()
  const res = await host().ask('row-menu', {
    items,
    anchor: box && { left: box.left, top: box.top, height: box.height },
  })
  return valueOr(res, null) as A | null
}
