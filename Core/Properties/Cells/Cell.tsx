import { Fragment } from 'react'
import type { ColumnStyle } from '../columnStyles'
import { isBlankValue, type PropertyValue } from '../propertyValue'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import { EntityIcon } from '../../Assets/EntityIcon'
import { ProgressBar } from '@pommora/uix/Elements/ProgressBar'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { resolveFileValue } from '../../Assets/assetUrl'
import { FILE_CHIP_INDEX_ATTR, fileValueWithout } from '../Pickers/filePick'
import { fileName, resolveFieldValue } from '../value'
import { barDivisor, formatDate, formatNumber } from '../formatValue'
import { OptionChip } from './OptionChip'
import { findOption } from './cellResolve'
import { LinkCell } from './LinkCell'
import { renderCellBody } from '../../MarkdownPM/Tables/cellStatic'
import { CheckboxGlyph } from './CheckboxGlyph'
import type { ValueContext } from '../valueContext'
import { FileChip, NeutralChip } from '@pommora/uix/Labels/recipes'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'

export function Cell({
  row,
  column,
  ctx,
  hideIcon,
  style,
  showFullLink,
  commit,
  hideRemove,
  empty,
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ValueContext
  hideIcon: boolean
  style: ColumnStyle
  showFullLink?: boolean
  commit?: (next: PropertyValue | null) => void
  hideRemove?: boolean
  empty?: React.JSX.Element
}): React.JSX.Element | null {
  if (column.kind === 'title') {
    return (
      <OverScroll className="cell-title">
        {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size="body" />}
        <span className="cell-title-text">{row.title}</span>
      </OverScroll>
    )
  }

  const v = resolveFieldValue(row, column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === column.id)
  // A status value is a bare label on disk, indistinguishable from a select — the schema is the only thing that knows the declared type.
  const dt = def?.type

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
            type={dt ?? ''}
            look={style.look}
            option={opt ?? { value: v.value }}
            def={def}
            {...(removesOption ? { onRemove: () => remove(null) } : {})}
          />
        </OverScroll>
      )
    }
    case 'multiSelect':
      return (
        <Chips value={v} label={(val) => val} commit={commit}>
          {(val) => (
            <OptionChip
              type={dt ?? ''}
              look={style.look}
              option={findOption(def, val) ?? { value: val }}
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
      return <LinkCell raw={v.value} def={def} look={style.look} showFullLink={showFullLink} />
    case 'text':
      return (
        <OverScroll className="cell-text-scroll">
          <div className="cell-text">{renderCellBody(v.value)}</div>
        </OverScroll>
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
      return <OverScroll className="cell-text-scroll">{formatNumber(v.value, def)}</OverScroll>
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
  // A repeat written outside the app gets its own key, so it never shares a chip's identity.
  const seen = new Map<string, number>()
  const keys = items.map((item) => {
    const n = seen.get(item) ?? 0
    seen.set(item, n + 1)
    return n === 0 ? item : `${item}\u0000${n}`
  })
  const itemOf = (key: string): string => items[keys.indexOf(key)]
  if (!commit || items.length < 2)
    return (
      <OverScroll className="cell-chips">
        {items.map((item, i) => (
          <Fragment key={keys[i]}>{children(item, i)}</Fragment>
        ))}
      </OverScroll>
    )
  const onMove = (id: string, beforeId: string | null): false | undefined => {
    const next = moveBefore(keys, (key) => key, id, beforeId)
    if (!next) return false
    commit({ ...value, value: next.map(itemOf) })
  }
  return (
    <SortableZone items={keys} axis="x" label={(key) => label(itemOf(key))} onMove={onMove}>
      <OverScroll className="cell-chips">
        {items.map((item, i) => (
          <SortableChip key={keys[i]} id={keys[i]}>
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
