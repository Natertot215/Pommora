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

export interface MenuOptions<A extends string = string> {
  solid?: boolean
  stay?: (action: A) => readonly ActionItem<A>[]
  compact?: boolean
}
