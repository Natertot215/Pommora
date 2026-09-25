import { type ActionItem, joinGroups } from './menuModel'
import type { HeadingLevel } from '../MarkdownPM/Input/format'
import { scaleRows } from '../Tiles/tileZoom'

export type ListKind = 'ordered' | 'alphabetical' | 'bullet' | 'checkbox' | 'arrow'

export interface PickNode {
  label: string
  title?: string
  children?: PickNode[]
}

export type GripMenuContext =
  | { kind: 'embed'; tree: PickNode[]; zoom: number | null }
  | { kind: 'webpage'; zoom: number | null }
  | { kind: 'list'; current: ListKind | null }
  | { kind: 'heading'; level: number; linkable: boolean }
  | { kind: 'plain' }

export type GripMenuAction =
  | `source:${string}`
  | 'editLink'
  | `zoom:${number}`
  | `listKind:${ListKind}`
  | 'rename'
  | 'copyLink'
  | `size:${number}`
  | 'delete'

export const HEADING_LEVELS: readonly { level: HeadingLevel; label: string }[] = [
  { level: 0, label: 'Paragraph' },
  { level: 1, label: 'Heading 1' },
  { level: 2, label: 'Heading 2' },
  { level: 3, label: 'Heading 3' },
  { level: 4, label: 'Heading 4' },
  { level: 5, label: 'Heading 5' },
  { level: 6, label: 'Heading 6' },
]

export const LIST_KINDS: readonly {
  kind: ListKind
  label: string
  short: string
  icon: string
}[] = [
  { kind: 'bullet', label: 'Bullet List', short: 'Bulleted', icon: 'list' },
  { kind: 'ordered', label: 'Numbered List', short: 'Numbered', icon: 'list-ordered' },
  {
    kind: 'alphabetical',
    label: 'Alphabetical List',
    short: 'Alphabetical',
    icon: 'arrow-down-az',
  },
  { kind: 'checkbox', label: 'Task List', short: 'Checklist', icon: 'list-todo' },
  { kind: 'arrow', label: 'Arrowed List', short: 'Arrowed', icon: 'arrow-right' },
]

const source = (n: PickNode): ActionItem<GripMenuAction> =>
  n.children
    ? { label: n.label, submenu: n.children.map(source) }
    : { label: n.label, action: `source:${n.title ?? n.label}` }

const scaleRow = (zoom: number | null): ActionItem<GripMenuAction> => ({
  label: 'Scale',
  submenu: zoom === null ? [] : scaleRows('zoom:', zoom),
})

function ownRows(ctx: GripMenuContext): ActionItem<GripMenuAction>[] {
  switch (ctx.kind) {
    case 'embed':
      return [{ label: 'Source', submenu: ctx.tree.map(source) }, scaleRow(ctx.zoom)]
    case 'webpage':
      return [{ label: 'Edit Link', action: 'editLink' }, scaleRow(ctx.zoom)]
    case 'list':
      return [
        {
          label: 'Type',
          submenu: LIST_KINDS.map(({ kind, short }) => ({
            label: short,
            action: `listKind:${kind}`,
            checked: ctx.current === kind,
          })),
        },
      ]
    case 'heading':
      return [
        { label: 'Rename', action: 'rename' },
        ...(ctx.linkable ? [{ label: 'Copy Link', action: 'copyLink' as const }] : []),
        {
          label: 'Size',
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
  return joinGroups([ownRows(ctx), [{ label: 'Delete', action: 'delete' }]])
}
