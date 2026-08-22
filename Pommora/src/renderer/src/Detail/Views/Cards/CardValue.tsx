import { useContext, useRef, useState } from 'react'
import type { ResolvedColumn, ViewRow } from '@shared/types'
import { isBlankValue, type PropertyValue } from '@shared/propertyValue'
import type { ColumnStyle } from '@shared/columnStyles'
import { cellMenuContextFor } from '@shared/cellMenu'
import { parseStyleAction } from '@shared/columnMenu'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens/typography.css'
import { declaredType, resolveFieldValue } from '../pipeline/value'
import { GhostSuppress } from '../useGhostAnchor'
import { Cell } from '../Table/Cell'
import { linkAlias, linkEditText, urlValueFromEdit, urlValueFromRename } from '@shared/linkValue'
import { resolveTitle, validateLink } from '@renderer/linkResolve'
import { linkValueMenuTarget, showConnectionMenu } from '@renderer/Embeds/connectionMenu'
import { parseEditorValue } from './cardValueInput'
import type { ResolveContext } from '../Table/resolveContext'
import { PropertyEditor } from '../PropertyEditing/PropertyEditor'
import { numberDivisor } from '../PropertyEditing/formatValue'
import { sharedValueClickAction } from '../PropertyEditing/valueClick'
import { fileChipIndex, runFilePick } from '../PropertyEditing/filePick'

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
  ctx: ResolveContext
  style: ColumnStyle
  onCommit: (column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  onHide: (colId: string) => void
  /** Opens this value's portal picker at the grid-level host — it outlives this card's remounts. */
  onOpenPicker: (
    column: ResolvedColumn,
    kind: 'picker' | 'datetime' | 'link',
    anchor: HTMLElement,
    clickX?: number,
  ) => void
  /** False only when the EMBED zoom shrinks chips (chips don't scale with card_size). Gates ONLY
   *  the multi-select hover-×; select and context keep their × always (clearing the whole value vs.
   *  removing just that one context). The × is inert until hover-revealed, so an un-hovered click
   *  opens the picker at every size. */
  allowInlineRemove: boolean
}): React.JSX.Element {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [mode, setMode] = useState<null | 'editor' | 'rename'>(null)
  const dismiss = (): void => setMode(null)
  const commit = (v: PropertyValue | null): void => onCommit(column, v)

  const dt = declaredType(column.id, ctx.schema)
  // The resolved kind is the only reliable Context test here — declaredType can't tell without
  // the registry ids, which this context doesn't carry.
  const t = column.kind === 'context' ? 'context' : dt
  const v = resolveFieldValue(row, column.id, ctx.schema)
  const schemaDef = ctx.schema.find((d) => d.id === column.id)
  // Kinds a click on a blank value fills in place (picker / calendar / editor / dialog). A checkbox
  // draws its own box; last-edited has no fill path — no "Empty" affordance for it (a dead click).
  const canFillBlank =
    t === 'status' ||
    t === 'select' ||
    t === 'multi_select' ||
    t === 'context' ||
    t === 'datetime' ||
    t === 'number' ||
    t === 'url' ||
    t === 'file'

  const onClick = (e: React.MouseEvent): void => {
    if (e.ctrlKey) return // macOS secondary-click — let the context menu win
    e.stopPropagation()
    // React events cross portals along the component tree: a click inside the picker (an option, the
    // backdrop) bubbles back through its trigger — this span — and would re-open what the pick/outside
    // click just dismissed. Swallow it here (the stopPropagation above still keeps it off the card).
    if (!e.currentTarget.contains(e.target as Node)) return
    const openPicker = (kind: 'picker' | 'datetime' | 'link'): void => {
      if (anchorRef.current) onOpenPicker(column, kind, anchorRef.current, e.clientX)
    }
    // The shared click semantics (cycle/toggle/picker/datetime) live in one router; only the
    // surface-specific tails (number/url placement) stay here.
    const shared = sharedValueClickAction(t, style.look, v, schemaDef)
    if (shared) {
      if (shared.kind === 'commit') commit(shared.value)
      // A file value is filled through the OS dialog, not a picker anchored to this card.
      else if (shared.kind === 'file') {
        if (schemaDef)
          void runFilePick(schemaDef, v, fileChipIndex(e.target)).then((next) => {
            if (next !== undefined) commit(next)
          })
      } else openPicker(shared.kind)
    } else if (t === 'number') {
      setMode('editor')
    } else if (t === 'url') {
      // The value click opens the LINK DROPDOWN (filled or empty); opening the URL itself belongs to
      // the rendered anchor inside LinkCell, which stops propagation before this handler.
      openPicker('link')
    }
  }

  // The view's ghost stands down while this value's native menu owns the pointer.
  const holdGhost = useContext(GhostSuppress)
  // Right-click a value → its native menu (always a menu, never an action), the shared per-kind matrix
  // (Clear · Style · Edit) plus a trailing Remove — cards pass hideable, so any property can be dropped
  // from the view here. stopPropagation keeps it off the card-level menu.
  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Portal events bubble the component tree: a right-click inside an open picker (backdrop/layer)
    // arrives here too — swallow it, never pop a mis-targeted menu (the onClick guard's twin).
    if (!e.currentTarget.contains(e.target as Node)) return
    // A value holding a live link pops the LINK menu — the same one the editor pops on the same
    // link, plus the Remove every card value ends with. Only a value with no link in it falls
    // through to the cell menu.
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
    const menuCtx = cellMenuContextFor(column, dt, style, !isBlankValue(v), true, barCapable)
    if (!menuCtx) return
    const action = await holdGhost(() => window.nexus.cellMenu(menuCtx))
    if (!action) return
    if (action === 'cell:clear') commit(null)
    else if (action === 'cell:hide') onHide(column.id)
    else if (action === 'cell:edit') {
      if (t === 'url' && anchorRef.current) onOpenPicker(column, 'link', anchorRef.current)
      else setMode('editor')
    } else if (action === 'cell:rename')
      setMode('rename') // url alias edit (keeps the URL)
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
    // Rename sets the url's alias (keeps the URL); a url Edit rewrites the URL but rides the existing
    // alias along; everything else parses normally. `undefined` = invalid, so don't commit.
    const parsed =
      mode === 'rename'
        ? urlValueFromRename(raw, v.kind === 'url' ? v.value : '')
        : t === 'url'
          ? urlValueFromEdit(raw, v.kind === 'url' ? v.value : undefined, resolveTitle)
          : parseEditorValue(t, raw)
    if (parsed !== undefined) commit(parsed)
  }

  const editing = mode === 'editor' || mode === 'rename'
  return (
    // data-drag-slop: the whole card is a drag handle, so a press that begins on a value gets a larger
    // drag-activation threshold — a tap-wobble opens the picker instead of lifting the card.
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
        // A visible-but-empty property (Standard shows every visible property, filled or not): a clickable
        // placeholder so the row fills in place — only for kinds a blank click actually fills.
        <span className={cx('card-value-empty', text.caption.emphasized)}>--</span>
      ) : (
        <Cell
          row={row}
          column={column}
          ctx={ctx}
          hideIcon={false}
          style={style}
          // Drop the hover-× only on a small multi-select chip (see allowInlineRemove).
          {...(t !== 'multi_select' || allowInlineRemove
            ? { remove: (next: PropertyValue | null) => commit(next) }
            : {})}
        />
      )}
    </span>
  )
}
