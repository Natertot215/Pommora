import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { EntityIcon } from '../../Assets/EntityIcon'
import { ProgressBar } from '@pommora/uix/Elements/ProgressBar'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { resolveFileValue } from '../../Assets/assetUrl'
import { FILE_CHIP_INDEX_ATTR, fileValueWithout } from '../Pickers/filePick'
import { declaredType, fileName, resolveFieldValue } from '../value'
import { formatDate, formatNumber, numberDivisor } from '../formatValue'
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
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ValueContext
  hideIcon: boolean
  style: ColumnStyle
  showFullLink?: boolean
  remove?: (next: PropertyValue | null) => void
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
  // A status value is a bare label on disk, indistinguishable from a select — the schema is the only thing that knows the declared type.
  const dt = declaredType(column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === column.id)

  // Keyed off the schema TYPE rather than value presence, so a checkbox toggles in place without first assigning the property.
  if (dt === 'checkbox')
    return (
      <CheckboxGlyph
        checked={v.kind === 'checkbox' && v.value}
        color={def?.checkbox_color}
        look={style.look}
      />
    )

  switch (v.kind) {
    case 'select': {
      const opt = findOption(column.id, v.value, ctx.schema)
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
            const o = findOption(column.id, val, ctx.schema)
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
                color={labelColorFor(c?.color)}
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
    case 'url':
      return (
        <LinkCell
          raw={v.value}
          def={ctx.schema.find((d) => d.id === column.id)}
          look={style.look}
          showFullLink={showFullLink}
        />
      )

    case 'datetime':
      return (
        <OverScroll className="cell-text-scroll cell-control">
          {formatDate(v.value, style.date_format, style.time_format, style.weekday)}
        </OverScroll>
      )
    case 'number': {
      const def = ctx.schema.find((d) => d.id === column.id)
      const divisor = numberDivisor(def)
      if (style.look === 'bar' && divisor !== undefined) {
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
    default:
      return null
  }
}
