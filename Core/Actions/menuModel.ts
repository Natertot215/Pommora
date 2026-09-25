import { z } from 'zod'

interface RowBase {
  label: string
  separatorBefore?: boolean
  disabled?: boolean
  icon?: string
}

interface LeafFields<A> {
  action: A
  checked?: boolean
  stay?: boolean
  chord?: string
}

export interface LeafItem<A> extends RowBase, LeafFields<A> {
  submenu?: never
}

// A branch with nothing inside is unreachable, so both renderers grey it out with no way in.
interface BranchItem<A> extends RowBase, Partial<Record<keyof LeafFields<A>, never>> {
  submenu: readonly ActionItem<A>[]
}

export type ActionItem<A> = LeafItem<A> | BranchItem<A>

export function joinGroups<A>(groups: readonly (readonly ActionItem<A>[])[]): ActionItem<A>[] {
  return groups
    .filter((g) => g.length > 0)
    .flatMap((g, i) => (i === 0 ? g : [{ ...g[0], separatorBefore: true }, ...g.slice(1)]))
}

export function openOrder<A>(
  alreadyOpen: boolean | undefined,
  open: readonly ActionItem<A>[],
  preview: readonly ActionItem<A>[],
): ActionItem<A>[] {
  return alreadyOpen ? [...open, ...preview] : [...preview, ...open]
}

export interface MenuAnchor {
  left: number
  top: number
  height: number
}

export interface MenuRequest {
  items: readonly ActionItem<string>[]
  anchor?: MenuAnchor
}

const rowFields = {
  label: z.string(),
  separatorBefore: z.boolean().optional(),
  disabled: z.boolean().optional(),
  icon: z.string().optional(),
}
const leafItem = z.object({
  ...rowFields,
  action: z.string(),
  checked: z.boolean().optional(),
  stay: z.boolean().optional(),
  chord: z.string().optional(),
})
const branchItem = z.object({
  ...rowFields,
  submenu: z.array(z.lazy(() => actionItem)),
})
const actionItem: z.ZodType<ActionItem<string>> = z.union([leafItem, branchItem])

/** A native menu as the window sends it: the item model with string actions. */
export const menuRequest: z.ZodType<MenuRequest> = z.object({
  items: z.array(actionItem),
  anchor: z.object({ left: z.number(), top: z.number(), height: z.number() }).optional(),
})

export interface MenuOptions<A extends string = string> {
  solid?: boolean
  stay?: (action: A) => readonly ActionItem<A>[]
  compact?: boolean
}
