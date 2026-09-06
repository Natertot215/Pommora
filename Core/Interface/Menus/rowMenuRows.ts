import type { ActionItem } from '@pommora/core/Actions/menuModel'
import type { MenuRow } from '@pommora/uix/Menus'

export function rowMenuRows<A extends string>(
  items: readonly ActionItem<A>[],
  onPick: (action: A) => void,
  onDrill: (item: ActionItem<A>) => void,
): MenuRow[] {
  return items.flatMap((item, i): MenuRow[] => [
    ...(item.separatorBefore && i > 0 ? [{ kind: 'separator' as const }] : []),
    {
      kind: 'item',
      label: item.label,
      selected: item.checked,
      disabled: item.disabled,
      ...(item.submenu
        ? { trailing: { kind: 'chevron' as const }, onSelect: () => onDrill(item) }
        : { onSelect: () => onPick(item.action) }),
    },
  ])
}
