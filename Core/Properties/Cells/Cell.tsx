import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
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
import { CheckboxGlyph } from './CheckboxGlyph'
import type { ValueContext } from '../valueContext'
import { FileChip, NeutralChip } from '@pommora/uix/Labels/recipes'

export function Cell({
  row,
  column,
  ctx,
  hideIcon,
  style,
  showFullLink,
  remove,
  empty,
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ValueContext
  hideIcon: boolean
  style: ColumnStyle
  showFullLink?: boolean
  remove?: (next: PropertyValue | null) => void
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
            {...(remove && style.look !== 'compact' ? { onRemove: () => remove(null) } : {})}
          />
        </OverScroll>
      )
    }
    case 'multiSelect':
      return (
        <OverScroll className="cell-chips">
          {v.value.map((val) => {
            const o = findOption(def, val)
            return (
              <OptionChip
                key={val}
                type={dt ?? ''}
                look={style.look}
                option={o ?? { value: val }}
                {...(remove && style.look !== 'compact'
                  ? {
                      onRemove: () =>
                        remove({ kind: 'multiSelect', value: v.value.filter((x) => x !== val) }),
                    }
                  : {})}
              />
            )
          })}
        </OverScroll>
      )
    case 'context':
      return (
        <OverScroll className="cell-chips">
          {v.value.map((id) => {
            const c = ctx.contextsById.get(id)
            return (
              <NeutralChip
                key={id}
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
          })}
        </OverScroll>
      )
    case 'link':
      return <LinkCell raw={v.value} def={def} look={style.look} showFullLink={showFullLink} />

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
        <OverScroll className="cell-chips">
          {v.value.map((f, i) => (
            <span
              // Positional, never the value: two identical wikilinks would collide as keys and send the hover-× to the wrong one.
              key={String(i)}
              {...{ [FILE_CHIP_INDEX_ATTR]: i }}
            >
              <FileChip
                name={fileName(f)}
                // Renders even unresolved, so the user can still see and remove it.
                unresolved={resolveFileValue(f, ctx.assets).kind === 'unresolved'}
                {...(remove ? { onRemove: () => remove(fileValueWithout(v, i)) } : {})}
              />
            </span>
          ))}
        </OverScroll>
      )
    case 'checkbox':
    case 'null':
      return null
  }
}
