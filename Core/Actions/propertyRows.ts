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

const PREFIX = 'prop:'

function optionBranch(row: PropertyMenuRow): Partial<ActionItem<PropertyAction>> {
  if (row.options === undefined) return {}
  if (row.options.length === 0) return { disabled: true }
  return {
    submenu: row.options.map((o) => ({
      label: o.label,
      action: `${PREFIX}${row.id}:${o.value}` as PropertyAction,
      checked: o.checked,
    })),
  }
}

export function propertiesRow(rows: readonly PropertyMenuRow[]): ActionItem<PropertyAction> {
  return {
    label: 'Properties',
    action: `${PREFIX}${rows[0].id}`,
    submenu: rows.map((r) => ({
      label: r.name,
      action: `${PREFIX}${r.id}` as PropertyAction,
      ...(r.separatorBefore ? { separatorBefore: true } : {}),
      ...optionBranch(r),
    })),
  }
}

export function parsePropertyAction(action: string): { id: string; value: string | null } | null {
  if (!action.startsWith(PREFIX)) return null
  const rest = action.slice(PREFIX.length)
  const cut = rest.indexOf(':')
  return cut < 0
    ? { id: rest, value: null }
    : { id: rest.slice(0, cut), value: rest.slice(cut + 1) }
}
