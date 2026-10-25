import { Fragment } from 'react'
import type { ColumnStyle } from '../columnStyles'
import { findOption, optionLabel, isBlankValue, type PropertyValue } from '../propertyValue'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { ProgressBar } from '@pommora/uix/Elements/ProgressBar'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { valueGlyph } from '@pommora/uix/Fields/fields.css'
import { resolveFileValue } from '../../Assets/assetUrl'
import { FILE_CHIP_INDEX_ATTR, fileValueWithout } from '../Pickers/filePick'
import { resolveFieldValue } from '../fieldValue'
import { fileName } from '../../Connections/linkValue'
import { barDivisor, formatDate, formatNumber } from '../formatValue'
import { OptionChip } from './OptionChip'
import { LinkCell } from './LinkCell'
import { TextCell } from './TextCell'
import { CheckboxGlyph } from './CheckboxGlyph'
import { holderOf, type ValueContext } from '../valueContext'
import { FileChip, NeutralChip } from '@pommora/uix/Labels/recipes'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'

export function Cell({
  row,
  column,
  ctx,
  style,
  showFullLink,
  commit,
  hideRemove,
  empty,
  onPane,
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ValueContext
  style: ColumnStyle
  showFullLink?: boolean
  commit?: (next: PropertyValue | null) => void
  hideRemove?: boolean
  empty?: React.JSX.Element
  /** Opens the value's pane from its pen, anchored at the pen's host; absent, no pen is drawn. */
  onPane?: (anchor: HTMLElement) => void
}): React.JSX.Element | null {
  const v = resolveFieldValue(row, column)
  const { def } = column
  const dt = def?.type
  const holder = holderOf(row, ctx)

  // Keyed off the schema TYPE rather than value presence, so a checkbox toggles in place without first assigning the property.
  if (dt === 'checkbox')
    return (
      <CheckboxGlyph
        checked={v.kind === 'checkbox' && v.value}
        color={def?.checkbox_color}
        look={style.look}
      />
    )
  if (empty !== undefined && isBlankValue(v)) return empty
  const remove = hideRemove ? undefined : commit
  const removesOption = remove && style.look !== 'compact'

  switch (v.kind) {
    case 'select': {
      const opt = findOption(def, v.value)
      return (
        <OverScroll className="cell-chips">
          <OptionChip
            type={dt}
            look={style.look}
            option={opt ?? { label: v.value }}
            def={def}
            {...(removesOption ? { onRemove: () => remove(null) } : {})}
          />
        </OverScroll>
      )
    }
    case 'multiSelect':
      return (
        <Chips value={v} label={(val) => optionLabel(def, val)} commit={commit}>
          {(val) => (
            <OptionChip
              type={dt}
              look={style.look}
              option={findOption(def, val) ?? { label: val }}
              {...(removesOption
                ? {
                    onRemove: () =>
                      remove({ kind: 'multiSelect', value: v.value.filter((x) => x !== val) }),
                  }
                : {})}
            />
          )}
        </Chips>
      )
    case 'context':
      return (
        <Chips value={v} label={(id) => ctx.contextsById.get(id)?.title ?? id} commit={commit}>
          {(id) => {
            const c = ctx.contextsById.get(id)
            return (
              <NeutralChip
                color={colorNameFor(c?.color)}
                title={c?.title ?? id}
                icon={c?.icon}
                {...(remove
                  ? {
                      onRemove: () =>
                        remove({ kind: 'context', value: v.value.filter((x) => x !== id) }),
                    }
                  : {})}
              />
            )
          }}
        </Chips>
      )
    case 'link':
      return (
        <LinkCell
          raw={v.value}
          def={def}
          look={style.look}
          showFullLink={showFullLink}
          holder={holder}
          connections={ctx.connections}
        />
      )
    case 'text':
      return (
        <TextCell text={v.value} connections={ctx.connections} holder={holder} onPane={onPane} />
      )
    case 'dateTime':
      return (
        <OverScroll className="cell-text-scroll cell-control">
          {formatDate(v.value, style.date_format, style.time_format, style.weekday)}
        </OverScroll>
      )
    case 'number': {
      const divisor = barDivisor(style.look, def)
      if (divisor !== undefined) {
        return (
          <span className="cell-bar">
            <ProgressBar fill={v.value / divisor} />
          </span>
        )
      }
      return (
        <OverScroll className="cell-text-scroll">
          {formatNumber(v.value, def).map((p, i) =>
            p.glyph ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: the parts are rebuilt whole from the value, never reordered
              <span key={i} className={valueGlyph}>
                {p.text}
              </span>
            ) : (
              p.text
            ),
          )}
        </OverScroll>
      )
    }
    case 'file':
      return (
        <Chips value={v} label={fileName} commit={commit}>
          {(f, i) => (
            <span {...{ [FILE_CHIP_INDEX_ATTR]: i }}>
              <FileChip
                name={fileName(f)}
                // Renders even unresolved, so the user can still see and remove it.
                unresolved={resolveFileValue(f, ctx.assets).kind === 'unresolved'}
                {...(remove ? { onRemove: () => remove(fileValueWithout(v, i)) } : {})}
              />
            </span>
          )}
        </Chips>
      )
    case 'checkbox':
    case 'null':
      return null
  }
}

function Chips({
  value,
  label,
  commit,
  children,
}: {
  value: Extract<PropertyValue, { kind: 'multiSelect' | 'context' | 'file' }>
  label: (item: string) => string
  commit?: (next: PropertyValue | null) => void
  children: (item: string, i: number) => React.JSX.Element
}): React.JSX.Element {
  const items = value.value
  if (!commit || items.length < 2)
    return (
      <OverScroll className="cell-chips">
        {items.map((item, i) => (
          <Fragment key={item}>{children(item, i)}</Fragment>
        ))}
      </OverScroll>
    )
  const onMove = (id: string, beforeId: string | null): false | undefined => {
    const next = moveBefore(items, (item) => item, id, beforeId)
    if (!next) return false
    commit({ ...value, value: next })
  }
  return (
    <SortableZone items={items} axis="x" label={label} onMove={onMove}>
      <OverScroll className="cell-chips">
        {items.map((item, i) => (
          <SortableChip key={item} id={item}>
            {children(item, i)}
          </SortableChip>
        ))}
      </OverScroll>
    </SortableZone>
  )
}

function SortableChip({
  id,
  children,
}: {
  id: string
  children: React.JSX.Element
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id, { tabStop: false })
  return (
    <span ref={setNodeRef} style={style} data-drag-slop="" {...handle}>
      {children}
    </span>
  )
}
