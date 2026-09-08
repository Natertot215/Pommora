import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'

export async function popMenu<A extends string>(
  items: readonly ActionItem<A>[],
  trigger?: HTMLElement | null,
): Promise<A | null> {
  const rows = items[0]?.separatorBefore
    ? [{ ...items[0], separatorBefore: false }, ...items.slice(1)]
    : items
  if (rows.length === 0) return null
  if (!trigger || useSession.getState().devicePrefs.nativeMenus) {
    const box = trigger?.getBoundingClientRect()
    const res = await host().ask('menu', {
      items: rows,
      anchor: box && { left: box.left, top: box.top, height: box.height },
    })
    return valueOr(res, null) as A | null
  }
  return (await useSession.getState().presentMenu(rows, trigger)) as A | null
}
