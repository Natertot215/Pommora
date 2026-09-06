import type { ActionItem } from './menuModel'

export type ListKind = 'ordered' | 'bullet' | 'checkbox' | 'arrow'

/** A `title`-bearing node is a page leaf; a `children`-bearing one drills. */
export interface PickNode {
  label: string
  title?: string
  children?: PickNode[]
}

interface ZoomOption {
  label: string
  factor: number
}

/** A heading chevron's Delete drops the heading line but keeps its body. */
export type GripMenuContext =
  | { kind: 'embed'; tree: PickNode[]; zoomSteps: readonly ZoomOption[]; zoom: number | null }
  | { kind: 'webpage'; zoomSteps: readonly ZoomOption[]; zoom: number | null }
  | { kind: 'list'; current: ListKind | null }
  | { kind: 'heading'; level: number }
  | { kind: 'plain' }

export type GripMenuAction =
  | `source:${string}`
  | 'editLink'
  | `zoom:${number}`
  | `listKind:${ListKind}`
  | 'rename'
  | `size:${number}`
  | 'delete'

/** Named once for both the editor's Format ▸ Heading submenu and the heading grip's Size submenu. */
export const HEADING_LEVELS: readonly { level: number; label: string }[] = [
  { level: 0, label: 'Paragraph' },
  { level: 1, label: 'Heading 1' },
  { level: 2, label: 'Heading 2' },
  { level: 3, label: 'Heading 3' },
  { level: 4, label: 'Heading 4' },
  { level: 5, label: 'Heading 5' },
]

const LIST_KIND_LABELS: readonly { kind: ListKind; label: string }[] = [
  { kind: 'ordered', label: 'Numbered' },
  { kind: 'bullet', label: 'Bulleted' },
  { kind: 'checkbox', label: 'Checklist' },
  { kind: 'arrow', label: 'Arrowed' },
]

const source = (n: PickNode): ActionItem<GripMenuAction> =>
  n.children
    ? { label: n.label, action: `source:${n.label}`, submenu: n.children.map(source) }
    : { label: n.label, action: `source:${n.title ?? n.label}` }

/** An unresolved token has no tile to scale — the arm waits for the claim. */
const scaleRow = (ctx: {
  zoomSteps: readonly ZoomOption[]
  zoom: number | null
}): ActionItem<GripMenuAction> =>
  ctx.zoom === null
    ? { label: 'Scale', action: 'zoom:1', disabled: true }
    : {
        label: 'Scale',
        action: 'zoom:1',
        submenu: ctx.zoomSteps.map(({ label, factor }) => ({
          label,
          action: `zoom:${factor}`,
          checked: factor === ctx.zoom,
        })),
      }

function ownRows(ctx: GripMenuContext): ActionItem<GripMenuAction>[] {
  switch (ctx.kind) {
    case 'embed':
      return [
        ctx.tree.length > 0
          ? { label: 'Source', action: 'source:', submenu: ctx.tree.map(source) }
          : { label: 'Source', action: 'source:', disabled: true },
        scaleRow(ctx),
      ]
    case 'webpage':
      return [{ label: 'Edit Link', action: 'editLink' }, scaleRow(ctx)]
    case 'list':
      return [
        {
          label: 'Type',
          action: 'listKind:ordered',
          submenu: LIST_KIND_LABELS.map(({ kind, label }) => ({
            label,
            action: `listKind:${kind}`,
            checked: ctx.current === kind,
          })),
        },
      ]
    case 'heading':
      return [
        { label: 'Rename', action: 'rename' },
        {
          label: 'Size',
          action: 'size:0',
          submenu: HEADING_LEVELS.map(({ level, label }) => ({
            label,
            action: `size:${level}`,
            checked: ctx.level === level,
          })),
        },
      ]
    case 'plain':
      return []
  }
}

export function gripMenuItems(ctx: GripMenuContext): ActionItem<GripMenuAction>[] {
  const own = ownRows(ctx)
  return [...own, { label: 'Delete', action: 'delete', separatorBefore: own.length > 0 }]
}
