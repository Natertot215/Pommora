// Reaching the OS menu from the renderer: whether this machine asks for one, and where it opens.
// The rows are the caller's model — a surface states what it offers, never how it crosses.

import type { ActionItem } from '@shared/menuModel'
import { useSession } from '@renderer/store'

/** Whether this machine draws its list menus as the operating system's. */
export function useNativeMenus(): boolean {
  return useSession((st) => st.devicePrefs.nativeMenus ?? false)
}

/** Pops the rows as a system menu hanging from `trigger`'s box, measured here so no surface has to
 *  know the shape an anchor crosses in. Without a trigger the menu opens at the cursor, which is
 *  what a right-click wants. */
export function popRowMenu(
  items: ActionItem<string>[],
  trigger: HTMLElement | null | undefined,
): Promise<string | null> {
  const box = trigger?.getBoundingClientRect()
  return window.nexus.rowMenu({
    items,
    anchor: box && { left: box.left, top: box.top, width: box.width, height: box.height },
  })
}
