import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { useContext, useRef, useState } from 'react'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { cellMenuContextFor, cellMenuModel } from '@pommora/core/Actions/cellMenu'
import { parseStyleAction } from '@pommora/core/Actions/columnMenu'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme/typography.css'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { isOptionsKind } from '../../Properties/properties'
import { GhostSuppress } from '@pommora/uix/Interactions/ghostCreate'
import { Cell } from '../../Properties/Cells/Cell'
import { linkAlias, linkEditText, urlValueFromRename } from '@pommora/core/Connections/linkValue'
import { validateLink } from '../../Properties/Cells/linkResolve'
import { linkValueMenuTarget, showConnectionMenu } from '../../Interface/Menus/connectionMenu'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import type { ValueContext } from '../../Properties/valueContext'
import { PropertyEditor } from '../../Properties/Pickers/PropertyEditor'
import { numberDivisor } from '../../Properties/formatValue'
import { sharedValueClickAction } from '../../Properties/Pickers/valueClick'
import { fileChipIndex, pickFileInto, runFileMenuAction } from '../../Properties/Pickers/filePick'
import { popMenu } from '../../Actions/menuActions'

export function CardValue({
  row,
  column,
  ctx,
  style,
  onCommit,
  onStyle,
  onHide,
  onOpenPicker,
  allowInlineRemove,
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ValueContext
  style: ColumnStyle
  onCommit: (column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  onHide: (colId: string) => void
  onOpenPicker: (
    column: ResolvedColumn,
    kind: 'picker' | 'datetime' | 'link',
    anchor: HTMLElement,
    clickX?: number,
  ) => void
  /** Gates ONLY the multi-select hover-×; select and context keep their × always (clearing the whole value vs. removing just that one context). */
  allowInlineRemove: boolean
}): React.JSX.Element {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [mode, setMode] = useState<null | 'editor' | 'rename'>(null)
  const dismiss = (): void => setMode(null)
  const commit = (v: PropertyValue | null): void => onCommit(column, v)

  const dt = declaredType(column.id, ctx.schema)
  // The resolved kind is the only reliable Context test here — declaredType can't tell without the registry ids, which this context doesn't carry.
  const t = column.kind === 'context' ? 'context' : dt
  const v = resolveFieldValue(row, column.id, ctx.schema)
  const schemaDef = ctx.schema.find((d) => d.id === column.id)
  // Kinds a click on a blank value fills in place. A checkbox draws its own box; last-edited has no fill path, so it gets no "Empty" affordance.
  const canFillBlank =
    isOptionsKind(t) || t === 'datetime' || t === 'number' || t === 'url' || t === 'file'

  const onClick = (e: React.MouseEvent): void => {
    if (e.ctrlKey) return // macOS secondary-click — let the context menu win
    e.stopPropagation()
    // React events cross portals along the component tree: a click inside the picker bubbles back through this span and would re-open what the pick just dismissed.
    if (!e.currentTarget.contains(e.target as Node)) return
    const openPicker = (kind: 'picker' | 'datetime' | 'link'): void => {
      if (anchorRef.current) onOpenPicker(column, kind, anchorRef.current, e.clientX)
    }
    const shared = sharedValueClickAction(t, v)
    if (shared) {
      if (shared.kind === 'commit') commit(shared.value)
      else if (shared.kind === 'file') {
        if (schemaDef) pickFileInto(schemaDef, v, fileChipIndex(e.target), commit)
      } else openPicker(shared.kind)
    } else if (t === 'number') {
      setMode('editor')
    } else if (t === 'url') {
      openPicker('link')
    }
  }

  // The view's ghost stands down while this value's native menu owns the pointer.
  const holdGhost = useContext(GhostSuppress)
  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Portal events bubble the component tree: a right-click inside an open picker arrives here too — swallow it, never pop a mis-targeted menu.
    if (!e.currentTarget.contains(e.target as Node)) return
    if (t === 'url') {
      const target = linkValueMenuTarget(
        v.kind === 'url' ? v.value : '',
        (action) => {
          if (action === 'link:clear') return commit(null)
          if (action === 'link:hide') return onHide(column.id)
          if (action === 'rename') return setMode('rename')
          if (anchorRef.current) onOpenPicker(column, 'link', anchorRef.current)
        },
        true,
      )
      if (target) {
        await holdGhost(async () => showConnectionMenu(target))
        return
      }
    }
    const barCapable = dt === 'number' && numberDivisor(schemaDef) !== undefined
    const chip = fileChipIndex(e.target)
    const menuCtx = cellMenuContextFor(column, dt, style, !isBlankValue(v), {
      hideable: true,
      barCapable,
      onChip: chip !== null,
    })
    if (!menuCtx) return
    const action = await holdGhost(() => popMenu(cellMenuModel(menuCtx)))
    if (!action) return
    if (runFileMenuAction(action, schemaDef, v, chip, commit)) return
    if (action === 'cell:clear') commit(null)
    else if (action === 'cell:hide') onHide(column.id)
    else if (action === 'cell:edit') {
      if (t === 'url' && anchorRef.current) onOpenPicker(column, 'link', anchorRef.current)
      else setMode('editor')
    } else if (action === 'cell:rename') setMode('rename')
    else if (action.startsWith('style:')) {
      const parsed = parseStyleAction(action)
      if (parsed) onStyle(column.id, parsed.key, parsed.value)
    }
  }

  const editorInitial = (): string => {
    if (mode === 'rename') return v.kind === 'url' ? (linkAlias(v.value) ?? '') : ''
    if (v.kind === 'number') return String(v.value)
    if (v.kind === 'url') return linkEditText(v.value)
    return ''
  }
  const commitEditor = (raw: string): void => {
    setMode(null)
    // A url Edit rewrites the URL but rides the existing alias along; `undefined` = invalid, so don't commit.
    const parsed =
      mode === 'rename'
        ? urlValueFromRename(raw, v.kind === 'url' ? v.value : '')
        : parseEditorValue(t, raw, v)
    if (parsed !== undefined) commit(parsed)
  }

  const editing = mode === 'editor' || mode === 'rename'
  return (
    // data-drag-slop: the whole card is a drag handle, so a press beginning on a value gets a larger activation threshold — a tap-wobble opens the picker instead of lifting the card.
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <span
      ref={anchorRef}
      className="card-value"
      data-drag-slop=""
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {editing ? (
        <PropertyEditor
          initial={editorInitial()}
          numeric={mode === 'editor' && t === 'number'}
          validate={mode === 'editor' && t === 'url' ? validateLink : undefined}
          onCommit={commitEditor}
          onCancel={dismiss}
        />
      ) : isBlankValue(v) && canFillBlank ? (
        <EmptyValue className={cx('card-value-empty', text.caption.emphasized)} />
      ) : (
        <Cell
          row={row}
          column={column}
          ctx={ctx}
          hideIcon={false}
          style={style}
          {...(t !== 'multi_select' || allowInlineRemove
            ? { remove: (next: PropertyValue | null) => commit(next) }
            : {})}
        />
      )}
    </span>
  )
}
