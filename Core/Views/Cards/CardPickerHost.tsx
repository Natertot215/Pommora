import { useEffect, useRef } from 'react'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { isCompact, type SavedView } from '@pommora/core/Views/views'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import type { ContextOption } from '../../Properties/contextOptions'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { useStyleFor } from '../Host/columnStyles'
import { linkEditText, urlValueFromEdit } from '@pommora/core/Connections/linkValue'
import { resolveTitle } from '../../Properties/Cells/linkResolve'
import { solidColorCss } from '@pommora/uix/Theme/solidColor'
import type { ValueContext } from '../../Properties/valueContext'
import { PropertyPicker, syntheticContextDef } from '../../Properties/Pickers/PropertyPicker'
import { useSession } from '../../Session/store'
import { DatetimeValuePicker } from '../../Properties/Pickers/DatetimeValuePicker'
import { CardAddPicker } from './CardAddPicker'
import { addColumn, addEntriesFor, type AddEntry } from './cardValueInput'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { adoptPathInto, pickFileInto } from '../../Properties/Pickers/filePick'
import { numberFormatGlyph } from '../../Properties/Cells/PropertyTypes'
import { PathField } from '@pommora/uix/Fields'

export type ValuePickerRequest = {
  rowId: string
  column: ResolvedColumn
  kind: 'picker' | 'datetime' | 'link' | 'number' | 'file'
  anchor: HTMLElement
  clickX?: number
  revealOnCommit?: boolean
}

export type AddPickerRequest = {
  rowId: string
  anchor: HTMLElement
  initialEntry: AddEntry | null
}

export function CardPickerHost({
  value,
  add,
  rowById,
  view,
  ctx,
  columns,
  commitValue,
  contextOptionsFor,
  onReveal,
  onOpenValue,
  onDismissValue,
  onDismissAdd,
}: {
  value: ValuePickerRequest | null
  add: AddPickerRequest | null
  rowById: Map<string, ViewRow>
  view: SavedView
  ctx: ValueContext
  columns: ResolvedColumn[]
  commitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  contextOptionsFor: (column: ResolvedColumn) => ContextOption[] | null
  onReveal: (id: string) => void
  onOpenValue: (req: ValuePickerRequest) => void
  onDismissValue: () => void
  onDismissAdd: () => void
}): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const styleFor = useStyleFor()
  const tree = useSession((s) => s.tree)
  // The last non-null requests render through the closing frames (exit presence keeps the pane mounted after dismiss); the anchor rides a plain ref object PickerMenu can track.
  const lastValue = useRef(value)
  if (value) lastValue.current = value
  const lastAdd = useRef(add)
  if (add) lastAdd.current = add
  const valueAnchorRef = useRef<HTMLElement | null>(null)
  valueAnchorRef.current = (value ?? lastValue.current)?.anchor ?? null
  const addAnchorRef = useRef<HTMLElement | null>(null)
  addAnchorRef.current = (add ?? lastAdd.current)?.anchor ?? null

  const vReq = value ?? lastValue.current
  const vRow = vReq ? rowById.get(vReq.rowId) : undefined
  const vColumn = vReq?.column
  const vCurrent =
    vRow && vColumn ? resolveFieldValue(vRow, vColumn.id, ctx.schema) : { kind: 'null' as const }
  const vDef = vColumn
    ? (ctx.schema.find((d) => d.id === vColumn.id) ?? syntheticContextDef(vColumn.id))
    : syntheticContextDef('_none')
  const vStyle = vColumn ? styleFor(vColumn.id, ctx.schema, view) : {}
  // The resolved kind is the only reliable Context test here — declaredType can't tell without the registry ids, which this context doesn't carry.
  const vType =
    vColumn?.kind === 'context' ? 'context' : declaredType(vColumn?.id ?? '', ctx.schema)
  const vContextOptions = vColumn ? contextOptionsFor(vColumn) : null

  // A row that vanished, or a value Compact just dropped, dismisses the picker ANIMATED, through the same exit as a click-out.
  const compactLayout = isCompact(view)
  useEffect(() => {
    if (!value) return
    const row = rowById.get(value.rowId)
    if (!row) return onDismissValue()
    if (value.revealOnCommit) return
    const cur = resolveFieldValue(row, value.column.id, ctx.schema)
    const isCheckbox = ctx.schema.find((d) => d.id === value.column.id)?.type === 'checkbox'
    if (compactLayout && isBlankValue(cur) && !isCheckbox) onDismissValue()
  }, [value, rowById, ctx, compactLayout, onDismissValue])
  useEffect(() => {
    if (add && !rowById.get(add.rowId)) onDismissAdd()
  }, [add, rowById, onDismissAdd])

  const aReq = add ?? lastAdd.current
  const aRow = aReq ? rowById.get(aReq.rowId) : undefined
  const aEntries = aRow
    ? addEntriesFor(aRow, view, ctx, columns, tree, capitalize)
    : ([] as AddEntry[])

  // An add-originated open reveals on the first real commit (revealProperty is idempotent + in-flight-deduped, so repeat commits no-op).
  const commitPicked = (nv: PropertyValue | null): void => {
    if (!vRow || !vColumn) return
    if (vReq?.revealOnCommit) onReveal(vColumn.id)
    commitValue(vRow, vColumn, nv)
  }
  const pickDependent = (entry: AddEntry): void => {
    if (!aReq) return
    onDismissAdd()
    onOpenValue({
      rowId: aReq.rowId,
      column: addColumn(entry.id, tree),
      kind:
        entry.type === 'datetime' || entry.type === 'number' || entry.type === 'file'
          ? entry.type
          : 'link',
      anchor: aReq.anchor,
      revealOnCommit: true,
    })
  }
  const vRaw = vCurrent.kind === 'url' ? vCurrent.value : undefined

  return (
    <>
      <PickerMenu
        solid
        open={value?.kind === 'datetime'}
        onDismiss={onDismissValue}
        triggerRef={valueAnchorRef}
      >
        <DatetimeValuePicker
          value={vCurrent}
          dateFormat={vStyle.date_format}
          onCommit={commitPicked}
        />
      </PickerMenu>
      <TextPicker
        open={value?.kind === 'link'}
        onDismiss={onDismissValue}
        triggerRef={valueAnchorRef}
        value={vRaw ? linkEditText(vRaw) : ''}
        accent={solidColorCss(vDef.link_color)}
        onCommit={(raw) => {
          // undefined = invalid (no write), null = cleared — and a clear only applies to an EXISTING value.
          const nv = urlValueFromEdit(raw, vRaw, resolveTitle)
          if (nv !== undefined && (nv !== null || (!vReq?.revealOnCommit && vRaw))) commitPicked(nv)
          onDismissValue()
        }}
      />
      <TextPicker
        open={value?.kind === 'number'}
        onDismiss={onDismissValue}
        triggerRef={valueAnchorRef}
        value={vCurrent.kind === 'number' ? String(vCurrent.value) : ''}
        leading={numberFormatGlyph(vDef)}
        onCommit={(raw) => {
          const nv = parseEditorValue('number', raw)
          if (nv != null) commitPicked(nv)
          onDismissValue()
        }}
      />
      <PickerMenu
        solid
        open={value?.kind === 'file'}
        onDismiss={onDismissValue}
        triggerRef={valueAnchorRef}
      >
        <PathField
          label={vDef.name}
          value=""
          empty="Choose a file"
          browseLabel="Choose File"
          onBrowse={() =>
            pickFileInto(vDef, vCurrent, null, (nv) => {
              commitPicked(nv)
              onDismissValue()
            })
          }
          onCommit={(raw) => {
            if (raw.trim()) adoptPathInto(vDef, vCurrent, raw.trim(), commitPicked)
            onDismissValue()
          }}
        />
      </PickerMenu>
      <PropertyPicker
        def={vDef}
        current={vCurrent}
        open={value?.kind === 'picker'}
        triggerRef={valueAnchorRef}
        anchorX={vReq?.clickX}
        look={vStyle.look}
        {...(vContextOptions ? { contextOptions: vContextOptions } : {})}
        onCommit={(nv) => {
          commitPicked(nv)
          if (vType !== 'multi_select' && vType !== 'context') onDismissValue()
        }}
        onDismiss={onDismissValue}
      />
      <CardAddPicker
        entries={aEntries}
        currentOf={(e) => (aRow ? resolveFieldValue(aRow, e.id, ctx.schema) : null)}
        contextOptionsOf={(e) => contextOptionsFor(addColumn(e.id, tree))}
        open={add !== null}
        anchorRef={addAnchorRef}
        initialEntry={aReq?.initialEntry ?? null}
        onCommit={(e, v) => {
          onReveal(e.id)
          if (aRow) commitValue(aRow, addColumn(e.id, tree), v)
        }}
        onReveal={(e) => onReveal(e.id)}
        onPickDependent={pickDependent}
        onDismiss={onDismissAdd}
      />
    </>
  )
}
