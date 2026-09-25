import type { ActionItem } from '@pommora/core/Actions/menuModel'

export type PresenterRow<A> =
  | { kind: 'separator' }
  | ({ kind: 'item' } & Omit<ActionItem<A>, 'separatorBefore'>)

export function menuRows<A extends string>(items: readonly ActionItem<A>[]): PresenterRow<A>[] {
  return items.flatMap(({ separatorBefore, ...item }): PresenterRow<A>[] => [
    ...(separatorBefore ? [{ kind: 'separator' as const }] : []),
    { kind: 'item', ...item, checked: item.submenu ? undefined : item.checked },
  ])
}
