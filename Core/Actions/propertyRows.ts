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
}

export type PropertyAction = `prop:${string}`

const PREFIX = 'prop:'

function propertyRow(row: PropertyMenuRow): ActionItem<PropertyAction> {
  if (row.options === undefined) return { label: row.name, action: `${PREFIX}${row.id}` }
  return {
    label: row.name,
    submenu: row.options.map((o) => ({
      label: o.label,
      action: `${PREFIX}${row.id}:${o.value}` as PropertyAction,
      checked: o.checked,
    })),
  }
}

function propertiesRow(
  rows: readonly PropertyMenuRow[],
  label = 'Properties',
): ActionItem<PropertyAction> {
  return { label, submenu: rows.map(propertyRow) }
}

export function propertyBranchRows(t: {
  spaces?: readonly PropertyMenuRow[]
  properties?: readonly PropertyMenuRow[]
}): ActionItem<PropertyAction>[] {
  return [
    ...(t.spaces?.length ? [propertiesRow(t.spaces, 'Spaces')] : []),
    ...(t.properties?.length ? [propertiesRow(t.properties)] : []),
  ]
}

export function parsePropertyAction(action: string): { id: string; value: string | null } | null {
  if (!action.startsWith(PREFIX)) return null
  const rest = action.slice(PREFIX.length)
  const cut = rest.indexOf(':')
  return cut < 0
    ? { id: rest, value: null }
    : { id: rest.slice(0, cut), value: rest.slice(cut + 1) }
}
