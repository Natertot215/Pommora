import { type ActionItem, joinGroups, type PickItem, pickRows } from './menuModel'
import { scaleRows } from '../Tiles/tileZoom'
import { COPY_LINK_ROW } from './pageMenu'

export type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type ListKind = 'ordered' | 'alphabetical' | 'bullet' | 'checkbox' | 'arrow'

export type GripMenuContext =
  | { kind: 'embed'; tree: readonly PickItem<string>[]; zoom: number | null }
  | { kind: 'webpage'; zoom: number | null }
  | { kind: 'list'; current: ListKind | null }
  | { kind: 'heading'; level: number; linkable: boolean; editable: boolean }
  | { kind: 'plain' }

export type GripMenuAction =
  | `source:${string}`
  | 'editLink'
  | `zoom:${number}`
  | `listKind:${ListKind}`
  | 'rename'
  | typeof COPY_LINK_ROW.action
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

const scaleRow = (zoom: number | null): ActionItem<GripMenuAction> => ({
  label: 'Scale',
  submenu: zoom === null ? [] : scaleRows('zoom:', zoom),
})

function ownRows(ctx: GripMenuContext): ActionItem<GripMenuAction>[] {
  switch (ctx.kind) {
    case 'embed':
      return [
        { label: 'Source', submenu: pickRows(ctx.tree, (title) => `source:${title}` as const) },
        scaleRow(ctx.zoom),
      ]
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
    case 'heading': {
      const size = {
        label: 'Size',
        submenu: HEADING_LEVELS.map(({ level, label }) => ({
          label,
          action: `size:${level}` as const,
          checked: ctx.level === level,
        })),
      }
      return [
        ...(ctx.editable ? [{ label: 'Rename', action: 'rename' as const }] : []),
        ...(ctx.linkable ? [COPY_LINK_ROW] : []),
        ...(ctx.editable ? [size] : []),
      ]
    }
    case 'plain':
      return []
  }
}

export function gripMenuItems(ctx: GripMenuContext): ActionItem<GripMenuAction>[] {
  const editable = ctx.kind !== 'heading' || ctx.editable
  return joinGroups([ownRows(ctx), editable ? [{ label: 'Delete', action: 'delete' }] : []])
}
