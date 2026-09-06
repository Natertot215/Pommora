import { styleMenuItems, styleMenuLabel, type StyleMenuItem } from './columnMenu'
import type { ColumnStyle } from '../Properties/columnStyles'
import {
  type PageMetaAction,
  type PageMoveAction,
  type PageMoveContext,
  offersMove,
  pageMetaMenuItems,
} from './pageMenu'
import type { PropertyType } from '../Properties/properties'
import type { ResolvedColumn } from '../Views/viewRow'
import type { ActionItem } from './menuModel'

/** Right-click always opens a menu, never acts. Style-bearing cells get their COLUMN's radios; a
 *  `link` cell's look is per-property, so it gets none. `hideable` (cards only) appends a Remove
 *  that drops the property from the view — a `file` cell names it "Remove from View" so it isn't
 *  read as its own Remove File, and carries its own Add · Replace · Remove triad. */
type CellMenuKind =
  | ({ kind: 'title'; alreadyOpen?: boolean } & PageMoveContext)
  | {
      kind: 'style-only'
      type: PropertyType
      current: ColumnStyle
      clearable?: boolean
      barCapable?: boolean
    }
  | { kind: 'link'; filled: boolean }
  /** A hit-test fact: only a right-click on a LABEL names a file to replace or remove. */
  | { kind: 'file'; onChip: boolean }
  | { kind: 'clear-only' }
  | { kind: 'remove-only' }
export type CellMenuContext = CellMenuKind & { hideable?: boolean }

export type CellMenuAction =
  | PageMetaAction
  | PageMoveAction
  | 'cell:edit'
  | 'cell:rename'
  | 'cell:clear'
  | 'cell:hide'
  | 'file:add'
  | 'file:replace'
  | 'file:remove'
  | `style:${string}:${string}`

export interface CellMenuModel {
  items: ActionItem<CellMenuAction>[]
  /** Rows and the name they sit under travel together, so radios can't land under the wrong word. */
  style?: { label: string; rows: StyleMenuItem[] }
}

/** Named rather than positional: four bare booleans in a row read as nothing at a call site. */
type CellMenuFlags = { hideable?: boolean; barCapable?: boolean; onChip?: boolean }

export function cellMenuContextFor(
  col: ResolvedColumn,
  type: PropertyType | 'title' | undefined,
  style: ColumnStyle,
  filled: boolean,
  { hideable = false, barCapable = false, onChip = false }: CellMenuFlags = {},
): CellMenuContext | null {
  const base = baseCellMenu(col, type, style, filled, barCapable, onChip)
  // Cards let any non-title cell drop its property, so an otherwise-menu-less cell still gets a
  // bare Remove; remove-only must CARRY the flag, since the model appends Remove only on it.
  if (base === null) return hideable ? { kind: 'remove-only', hideable: true } : null
  return hideable ? { ...base, hideable: true } : base
}

function baseCellMenu(
  col: ResolvedColumn,
  type: PropertyType | 'title' | undefined,
  style: ColumnStyle,
  filled: boolean,
  barCapable: boolean,
  onChip: boolean,
): CellMenuKind | null {
  if (col.kind === 'title') return { kind: 'title' }
  if (col.kind === 'context') return filled ? { kind: 'clear-only' } : null
  if (type === 'url') return { kind: 'link', filled }
  if (type === 'file') return { kind: 'file', onChip }
  if (type === 'status' || type === 'datetime')
    return { kind: 'style-only', type, current: style, clearable: filled }
  if (
    type === 'checkbox' ||
    type === 'number' ||
    type === 'created_time' ||
    type === 'last_edited_time'
  ) {
    return {
      kind: 'style-only',
      type,
      current: style,
      ...(type === 'number' && barCapable ? { barCapable: true } : {}),
    }
  }
  if (type === 'select' || type === 'multi_select' || type === 'context') {
    return filled ? { kind: 'clear-only' } : null
  }
  return null
}

/** The pure per-kind item model; the host maps it to native menu items. */
export function cellMenuModel(ctx: CellMenuContext): CellMenuModel {
  const model = baseCellMenuModel(ctx)
  if (ctx.hideable && ctx.kind !== 'title') {
    model.items = [
      ...model.items,
      {
        // Self-separate from SIBLING items only: keying on `model.style` too would double the
        // separator for a style-only cell. A file cell's own Remove is told apart by position.
        label: ctx.kind === 'file' ? 'Remove from View' : 'Remove',
        action: 'cell:hide',
        separatorBefore: model.items.length > 0,
      },
    ]
  }
  return model
}

function baseCellMenuModel(ctx: CellMenuContext): CellMenuModel {
  switch (ctx.kind) {
    case 'title':
      return {
        items: pageMetaMenuItems(ctx.alreadyOpen, {
          window: true,
          newPages: 'pair',
          move: offersMove(ctx),
          clipboard: true,
          history: true,
        }),
      }
    case 'style-only':
      return {
        items: ctx.clearable ? [{ label: 'Clear', action: 'cell:clear' }] : [],
        style: {
          label: styleMenuLabel(ctx.type),
          rows: styleMenuItems({
            type: ctx.type,
            current: ctx.current,
            barCapable: ctx.barCapable,
          }),
        },
      }
    case 'link':
      // Rename and Clear are no-ops on an empty cell, so only Edit shows there.
      return {
        items: ctx.filled
          ? [
              { label: 'Edit', action: 'cell:edit' },
              { label: 'Rename', action: 'cell:rename' },
              { label: 'Clear', action: 'cell:clear' },
            ]
          : [{ label: 'Edit', action: 'cell:edit' }],
      }
    case 'file':
      // Replace and Remove address the label that was right-clicked; Add addresses the value.
      return {
        items: ctx.onChip
          ? [
              { label: 'Add File', action: 'file:add' },
              { label: 'Replace File', action: 'file:replace' },
              { label: 'Remove File', action: 'file:remove', separatorBefore: true },
            ]
          : [{ label: 'Add File', action: 'file:add' }],
      }
    case 'clear-only':
      return { items: [{ label: 'Clear', action: 'cell:clear' }] }
    case 'remove-only':
      return { items: [] }
  }
}
