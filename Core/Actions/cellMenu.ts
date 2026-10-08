import { styleBranch, type StyleAction } from './columnMenu'
import type { ColumnStyle } from '../Properties/columnStyles'
import {
  type PageMetaAction,
  type PageMoveAction,
  type PageMenuContext,
  pageMetaMenuItems,
} from './pageMenu'
import type { PropertyAction } from './propertyRows'
import { PROPERTY_TYPES, type PropertyType } from '../Properties/properties'
import { type ActionItem, joinGroups } from './menuModel'
import type { ConnEditAction } from './connectionMenu'

type CellMenuKind =
  | ({ kind: 'title'; alreadyOpen?: boolean } & PageMenuContext)
  | {
      kind: 'style-only'
      type: PropertyType
      current: ColumnStyle
      clearable?: boolean
      barCapable?: boolean
    }
  | { kind: 'link'; filled: boolean }
  | { kind: 'file'; onChip: boolean }
  | { kind: 'clear-only' }
  | { kind: 'remove-only' }
export type CellMenuContext = CellMenuKind & { hideable?: boolean }

export type CellMenuAction =
  | PageMetaAction
  | PageMoveAction
  | PropertyAction
  | ConnEditAction
  | 'cell:clear'
  | 'cell:hide'
  | 'file:add'
  | 'file:replace'
  | 'file:remove'
  | StyleAction

type CellMenuFlags = { hideable?: boolean; barCapable?: boolean; onChip?: boolean }

export function cellMenuContextFor(
  type: PropertyType | 'title' | undefined,
  style: ColumnStyle,
  filled: boolean,
  { hideable = false, barCapable = false, onChip = false }: CellMenuFlags = {},
): CellMenuContext | null {
  const base = baseCellMenu(type, style, filled, barCapable, onChip)
  // remove-only must CARRY the flag, since the model appends Remove only on it.
  if (base === null) return hideable ? { kind: 'remove-only', hideable: true } : null
  return hideable ? { ...base, hideable: true } : base
}

function baseCellMenu(
  type: PropertyType | 'title' | undefined,
  style: ColumnStyle,
  filled: boolean,
  barCapable: boolean,
  onChip: boolean,
): CellMenuKind | null {
  if (type === 'title') return { kind: 'title' }
  if (type === undefined) return null
  const { kind, origin } = PROPERTY_TYPES[type]
  switch (kind) {
    case 'link':
      return { kind: 'link', filled }
    case 'file':
      return { kind: 'file', onChip }
    case 'context':
    case 'text':
      return filled ? { kind: 'clear-only' } : null
    case 'select':
    case 'multiSelect':
    case 'dateTime':
      return { kind: 'style-only', type, current: style, clearable: filled && origin === 'user' }
    case 'number':
    case 'checkbox':
      return {
        kind: 'style-only',
        type,
        current: style,
        ...(barCapable ? { barCapable: true } : {}),
      }
  }
}

export function cellMenuModel(ctx: CellMenuContext): ActionItem<CellMenuAction>[] {
  return joinGroups([
    ...baseCellMenuModel(ctx),
    ctx.hideable && ctx.kind !== 'title'
      ? [{ label: ctx.kind === 'file' ? 'Remove from View' : 'Remove', action: 'cell:hide' }]
      : [],
  ])
}

function baseCellMenuModel(ctx: CellMenuContext): ActionItem<CellMenuAction>[][] {
  switch (ctx.kind) {
    case 'title':
      return [
        pageMetaMenuItems(ctx.alreadyOpen, {
          window: true,
          newPages: 'pair',
          move: ctx,
          spaces: ctx.spaces,
          properties: ctx.properties,
        }),
      ]
    case 'style-only':
      return [
        styleBranch({ type: ctx.type, current: ctx.current, barCapable: ctx.barCapable }),
        ctx.clearable ? [{ label: 'Clear', action: 'cell:clear' }] : [],
      ]
    case 'link':
      return [
        ctx.filled
          ? [
              { label: 'Edit', action: 'editLink' },
              { label: 'Rename', action: 'rename' },
              { label: 'Clear', action: 'cell:clear' },
            ]
          : [{ label: 'Edit', action: 'editLink' }],
      ]
    case 'file':
      return ctx.onChip
        ? [
            [
              { label: 'Add File', action: 'file:add' },
              { label: 'Replace File', action: 'file:replace' },
            ],
            [{ label: 'Remove File', action: 'file:remove' }],
          ]
        : [[{ label: 'Add File', action: 'file:add' }]]
    case 'clear-only':
      return [[{ label: 'Clear', action: 'cell:clear' }]]
    case 'remove-only':
      return []
  }
}
