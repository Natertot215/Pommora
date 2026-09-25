import type { ActionItem } from '@pommora/core/Actions/menuModel'

export type PresenterRow<A> = { kind: 'separator' } | ({ kind: 'item' } & ActionItem<A>)

export function menuRows<A extends string>(items: readonly ActionItem<A>[]): PresenterRow<A>[] {
  return items.flatMap((item): PresenterRow<A>[] => [
    ...(item.separatorBefore ? [{ kind: 'separator' as const }] : []),
    { kind: 'item', ...item, disabled: item.disabled || item.submenu?.length === 0 },
  ])
}
