import type { ActionItem } from '@pommora/core/Actions/menuModel'

export type PresenterRow<A> =
  | { kind: 'separator' }
  | {
      kind: 'choice'
      label: string
      checked: boolean
      disabled?: boolean
      icon?: string
      action: A
    }
  | {
      kind: 'item'
      label: string
      disabled?: boolean
      icon?: string
      action: A
      submenu?: ActionItem<A>[]
    }

export function menuRows<A extends string>(items: readonly ActionItem<A>[]): PresenterRow<A>[] {
  return items.flatMap((item): PresenterRow<A>[] => {
    const base = {
      label: item.label,
      disabled: item.disabled,
      icon: item.icon,
      action: item.action,
    }
    return [
      ...(item.separatorBefore ? [{ kind: 'separator' as const }] : []),
      item.checked !== undefined && !item.submenu
        ? { kind: 'choice', ...base, checked: item.checked }
        : { kind: 'item', ...base, submenu: item.submenu },
    ]
  })
}
