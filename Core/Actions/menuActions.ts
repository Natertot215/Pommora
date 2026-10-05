import type { ActionItem, MenuOptions } from './menuModel'
import { valueOr } from '../Contract/result'
import { useSession } from '../Session/store'
import { dialer } from '../Platform/dialer'

export async function popMenu<A extends string>(
  items: readonly ActionItem<A>[],
  trigger?: HTMLElement | null,
  options?: MenuOptions<A>,
): Promise<A | null> {
  if (items.length === 0) return null
  if (!trigger || useSession.getState().devicePrefs.nativeMenus) {
    const box = trigger?.getBoundingClientRect()
    const at = options?.at
    const res = await dialer().ask('menu', {
      items,
      anchor: at
        ? { left: at.x, top: at.y, height: 0 }
        : box && { left: box.left, top: box.top, height: box.height },
    })
    return valueOr(res, null) as A | null
  }
  return (await useSession.getState().presentMenu(items, trigger, {
    ...options,
    stay: options?.stay as MenuOptions['stay'],
  })) as A | null
}
