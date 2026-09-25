import type { ActionItem, MenuOptions } from '@pommora/core/Actions/menuModel'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'

export async function popMenu<A extends string>(
  items: readonly ActionItem<A>[],
  trigger?: HTMLElement | null,
  options?: MenuOptions<A>,
): Promise<A | null> {
  if (items.length === 0) return null
  if (!trigger || useSession.getState().devicePrefs.nativeMenus) {
    const box = trigger?.getBoundingClientRect()
    const res = await host().ask('menu', {
      items,
      anchor: box && { left: box.left, top: box.top, height: box.height },
    })
    return valueOr(res, null) as A | null
  }
  return (await useSession.getState().presentMenu(items, trigger, {
    ...options,
    stay: options?.stay as MenuOptions['stay'],
  })) as A | null
}
