import type { ActionItem } from './menuModel'

export interface PropertyMenuOption {
  value: string
  label: string
  checked: boolean
}

export interface PropertyMenuRow {
  id: string
  name: string
  options?: readonly PropertyMenuOption[]
  separatorBefore?: boolean
}

export type PropertyAction = `prop:${string}`

export function propertiesRow(rows: readonly PropertyMenuRow[]): ActionItem<PropertyAction> {
  return {
    label: 'Properties',
    action: `prop:${rows[0].id}`,
    submenu: rows.map((r) => ({
      label: r.name,
      action: `prop:${r.id}`,
      ...(r.separatorBefore ? { separatorBefore: true } : {}),
      ...(r.options?.length === 0 ? { disabled: true } : {}),
      ...(r.options?.length
        ? {
            submenu: r.options.map((o) => ({
              label: o.label,
              action: `prop:${r.id}:${o.value}` as PropertyAction,
              checked: o.checked,
            })),
          }
        : {}),
    })),
  }
}

export function parsePropertyAction(action: string): { id: string; value: string | null } | null {
  if (!action.startsWith('prop:')) return null
  const rest = action.slice(5)
  const cut = rest.indexOf(':')
  return cut < 0
    ? { id: rest, value: null }
    : { id: rest.slice(0, cut), value: rest.slice(cut + 1) }
}
